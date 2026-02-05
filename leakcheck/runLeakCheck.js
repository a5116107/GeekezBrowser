const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const { createBaseLeakReport, validateLeakReport, getLeakReportPath } = require('./schema');
const { applyConsistencyRules } = require('./consistencyRules');

const DEFAULT_TIMEOUTS = {
  perUrlNavigationMs: 15_000,
  perUrlCollectMs: 8_000,
  totalMs: 90_000,
};

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input || ''), 'utf8').digest('hex');
}

function nowTimestampId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function normalizeErrorCode(code) {
  const allowed = new Set([
    'LEAKCHECK_TIMEOUT',
    'LEAKCHECK_NAVIGATION_FAILED',
    'LEAKCHECK_PROXY_DOWN',
    'LEAKCHECK_PROFILE_NOT_RUNNING',
    'LEAKCHECK_UNSUPPORTED_ENGINE',
    'LEAKCHECK_INTERNAL_ERROR',
  ]);
  return allowed.has(code) ? code : 'LEAKCHECK_INTERNAL_ERROR';
}

function toIssue(code, severity, message, suggestion) {
  return {
    code,
    severity: severity === 'error' ? 'error' : 'warn',
    message: String(message || code),
    suggestion: suggestion ? String(suggestion) : undefined,
  };
}

function aggregateConsistencyStatus(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return 'green';
  if (issues.some((i) => i && i.severity === 'error')) return 'red';
  return 'yellow';
}

function enforceCriticalSignals(report) {
  if (!report || typeof report !== 'object') return;

  const issues = report.consistency && Array.isArray(report.consistency.issues) ? report.consistency.issues : null;
  if (!issues) return;

  // 竞品口径：只要确认泄漏，就必须直接红（不允许被其他信息稀释）。
  if (report.webrtc && report.webrtc.status === 'leak') {
    issues.push({
      code: 'WEBRTC_LEAK',
      severity: 'error',
      message: 'WebRTC leak detected',
      suggestion: 'Disable non-proxied UDP / enforce WebRTC policy',
    });
  }
  if (report.dns && report.dns.status === 'leak') {
    issues.push({
      code: 'DNS_LEAK',
      severity: 'error',
      message: 'DNS leak detected',
      suggestion: 'Force DNS via proxy or use a controlled DNS probe',
    });
  }
  if (report.ipv6 && report.ipv6.status === 'leak') {
    issues.push({
      code: 'IPV6_LEAK',
      severity: 'error',
      message: 'IPv6 leak detected',
      suggestion: 'Disable IPv6 or ensure IPv6 goes through proxy',
    });
  }
}

async function persistReport({ report, logsDir, profileId }) {
  const reportPath = getLeakReportPath(logsDir, profileId, nowTimestampId());
  await fs.ensureDir(path.dirname(reportPath));
  await fs.writeJson(reportPath, report, { spaces: 2 });
  return reportPath;
}

async function runLeakCheck(profile, options = {}) {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...(options.timeouts || {}) };
  const logsDir = options.logsDir;
  if (!logsDir) {
    throw new Error('runLeakCheck requires options.logsDir');
  }

  const urls = Array.isArray(options.urls) ? options.urls : [];
  const report = createBaseLeakReport(profile, { urls, proxyMode: options.proxyMode });

  const startMs = Date.now();
  const profileId = report.profile.id || 'unknown';

  try {
    if (Array.isArray(options.launchArgs)) {
      report.browser.launchArgsHash = `sha256:${sha256Hex(options.launchArgs.join('\n')).slice(0, 12)}`;
    }

    const probes = Array.isArray(options.probes) ? options.probes : [];
    for (const probe of probes) {
      const elapsed = Date.now() - startMs;
      if (elapsed > timeouts.totalMs) {
        throw Object.assign(new Error('Leak check total timeout'), { code: 'LEAKCHECK_TIMEOUT' });
      }

      if (!probe || typeof probe.run !== 'function') continue;

      try {
        // eslint-disable-next-line no-await-in-loop
        await probe.run({ report, profile, timeouts, pageProvider: options.pageProvider });
      } catch (e) {
        const code = normalizeErrorCode(e && e.code);
        report.consistency.issues.push(
          toIssue(code, 'warn', e && e.message ? e.message : 'probe failed', 'Check proxy status and retry')
        );
      }
    }

    report.consistency.status = aggregateConsistencyStatus(report.consistency.issues);

    try {
      const ruleIssues = applyConsistencyRules({ profile, report });
      if (Array.isArray(ruleIssues) && ruleIssues.length > 0) {
        report.consistency.issues.push(...ruleIssues);
        report.consistency.status = aggregateConsistencyStatus(report.consistency.issues);
      }
    } catch (e) {}

    enforceCriticalSignals(report);
    report.consistency.status = aggregateConsistencyStatus(report.consistency.issues);

    const validation = validateLeakReport(report);
    if (!validation.ok) {
      report.consistency.issues.push(
        toIssue('LEAKCHECK_INTERNAL_ERROR', 'warn', `report validation failed: ${validation.errors.join('; ')}`)
      );
      report.consistency.status = aggregateConsistencyStatus(report.consistency.issues);
    }

    const reportPath = await persistReport({ report, logsDir, profileId });

    return {
      status: report.consistency.status,
      reportPath,
      summary: {
        ip: report.ip.publicIp,
        country: report.ip.country,
        dns: report.dns.status,
        webrtc: report.webrtc.status,
        ipv6: report.ipv6.status,
      },
      issues: report.consistency.issues,
    };
  } catch (e) {
    const code = normalizeErrorCode(e && e.code);
    report.consistency.issues.push(
      toIssue(code, 'error', e && e.message ? e.message : 'leak check failed', 'Retry after verifying proxy/network')
    );
    report.consistency.status = aggregateConsistencyStatus(report.consistency.issues);

    const reportPath = await persistReport({ report, logsDir, profileId });

    return {
      status: report.consistency.status,
      reportPath,
      summary: { errorCode: code },
      issues: report.consistency.issues,
    };
  }
}

module.exports = { runLeakCheck, DEFAULT_TIMEOUTS };

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PROTOCOL_CAPABILITY_MATRIX, getProtocolCapability } = require('../proxy/protocolMatrix');
const { PROXY_TEST_ERROR_CODES } = require('../proxy/testErrorCodes');
const { buildProxyTestReport } = require('../proxy/testReport');
const {
  DEFAULT_AUDIT_REGISTRY_FILE,
  verifyThresholdAudit,
} = require('./lib/proxy_gate_threshold_audit');

const DEFAULT_THRESHOLDS_FILE = path.join(process.cwd(), 'scripts', 'config', 'proxy_quality_gate.thresholds.json');
const DEFAULT_GATE_THRESHOLDS = Object.freeze({
  version: '2026-02-06.v1',
  minProtocolCoverage: 1,
  minErrorCodeCoverage: 1,
  requireSlo: true,
  requireThresholdAudit: true,
  history: Object.freeze({
    enabled: true,
    maxEntries: 120,
  }),
});

function clampNumber(input, min, max, fallback) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function parseBoolean(input, fallback) {
  if (typeof input === 'boolean') return input;
  const value = String(input == null ? '' : input).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

function toPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${(num * 100).toFixed(1)}%`;
}

function toNumberText(value, suffix = '') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${num}${suffix}`;
}

function runNodeScript(scriptPath, args = []) {
  const display = `${scriptPath}${args.length ? ` ${args.join(' ')}` : ''}`;
  console.log(`[gate] run ${display}`);
  const out = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    shell: false,
  });
  if (out.status !== 0) {
    throw new Error(`script failed: ${display} (exit=${out.status})`);
  }
}

function safeReadJson(filePath, fallback = null) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

function resolveOutDir(env = process.env) {
  const raw = String((env && env.PROXY_GATE_OUT_DIR) || '').trim();
  if (!raw) return path.join(process.cwd(), '.context-snapshots', 'proxy-quality-gate');
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function resolveThresholdsFile(env = process.env) {
  const raw = String((env && env.PROXY_GATE_THRESHOLDS_FILE) || '').trim();
  if (!raw) return DEFAULT_THRESHOLDS_FILE;
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function resolveHistoryPath(outDir, env = process.env) {
  const raw = String((env && env.PROXY_GATE_HISTORY_FILE) || '').trim();
  if (!raw) return path.join(outDir, 'history.jsonl');
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function resolveAuditRegistryFile(env = process.env) {
  const raw = String((env && env.PROXY_GATE_AUDIT_REGISTRY_FILE) || '').trim();
  if (!raw) return DEFAULT_AUDIT_REGISTRY_FILE;
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function loadGateThresholds(options = {}) {
  const env = options.env && typeof options.env === 'object' ? options.env : process.env;
  const thresholdsFile = resolveThresholdsFile(env);
  const fromFile = safeReadJson(thresholdsFile, {});
  const fileHistory = fromFile && typeof fromFile.history === 'object' ? fromFile.history : {};

  const thresholdVersion = String(
    (env && env.PROXY_GATE_THRESHOLD_VERSION)
    || (fromFile && fromFile.version)
    || DEFAULT_GATE_THRESHOLDS.version
  ).trim() || DEFAULT_GATE_THRESHOLDS.version;

  const minProtocolCoverage = clampNumber(
    env && env.PROXY_GATE_MIN_PROTOCOL_COVERAGE,
    0,
    1,
    clampNumber(
      fromFile && fromFile.minProtocolCoverage,
      0,
      1,
      DEFAULT_GATE_THRESHOLDS.minProtocolCoverage
    )
  );

  const minErrorCodeCoverage = clampNumber(
    env && env.PROXY_GATE_MIN_ERROR_CODE_COVERAGE,
    0,
    1,
    clampNumber(
      fromFile && fromFile.minErrorCodeCoverage,
      0,
      1,
      DEFAULT_GATE_THRESHOLDS.minErrorCodeCoverage
    )
  );

  const requireSlo = parseBoolean(
    env && env.PROXY_GATE_REQUIRE_SLO,
    parseBoolean(fromFile && fromFile.requireSlo, DEFAULT_GATE_THRESHOLDS.requireSlo)
  );

  const requireThresholdAudit = parseBoolean(
    env && env.PROXY_GATE_REQUIRE_THRESHOLD_AUDIT,
    parseBoolean(fromFile && fromFile.requireThresholdAudit, DEFAULT_GATE_THRESHOLDS.requireThresholdAudit)
  );

  const historyEnabled = parseBoolean(
    env && env.PROXY_GATE_HISTORY_ENABLED,
    parseBoolean(fileHistory.enabled, DEFAULT_GATE_THRESHOLDS.history.enabled)
  );

  const historyMaxEntries = clampNumber(
    env && env.PROXY_GATE_HISTORY_MAX_ENTRIES,
    1,
    5000,
    clampNumber(fileHistory.maxEntries, 1, 5000, DEFAULT_GATE_THRESHOLDS.history.maxEntries)
  );

  return {
    version: thresholdVersion,
    minProtocolCoverage,
    minErrorCodeCoverage,
    requireSlo,
    requireThresholdAudit,
    history: {
      enabled: historyEnabled,
      maxEntries: historyMaxEntries,
    },
    sourceFile: fs.existsSync(thresholdsFile) ? path.relative(process.cwd(), thresholdsFile) : null,
  };
}

function evaluateProtocolCoverage() {
  const unsupportedByDesign = new Set(['unknown', 'wireguard', 'shadowtls', 'anytls', 'naive']);
  const allProtocols = Object.keys(PROTOCOL_CAPABILITY_MATRIX);
  const targetProtocols = allProtocols.filter((protocol) => !unsupportedByDesign.has(protocol));
  const rows = targetProtocols.map((protocol) => {
    const capability = getProtocolCapability(protocol, { rawProtocol: true });
    const parser = Boolean(capability && capability.parserSupport && (capability.parserSupport.xray || capability.parserSupport.singBox));
    const engine = Boolean(capability && capability.engineSupport && (capability.engineSupport.xray || capability.engineSupport.singBox));
    const probe = Boolean(capability && capability.probeSupport && (capability.probeSupport.xray || capability.probeSupport.singBox));
    const covered = parser && engine && probe;
    return { protocol, covered, parser, engine, probe };
  });

  const coveredCount = rows.filter((item) => item.covered).length;
  const coverage = rows.length > 0 ? Number((coveredCount / rows.length).toFixed(4)) : 1;
  return {
    targetProtocols: rows.length,
    coveredProtocols: coveredCount,
    coverage,
    rows,
  };
}

function createSyntheticFailNode(code) {
  return {
    id: `gate-${String(code || 'unknown').toLowerCase()}`,
    remark: `gate-${code}`,
    groupId: 'manual',
    url: 'vless://gate.local:443',
    latency: 180,
    lastTestAt: Date.now(),
    lastTestOk: false,
    lastTestCode: code,
    lastTestFinalCode: code,
    lastTestMsg: `gate ${code}`,
    lastTestResult: {
      ok: false,
      protocol: 'vless',
      engine: 'xray',
      finalCode: code,
      finalMessage: `gate ${code}`,
      durationMs: 1200,
      steps: [{ name: 'parse', ok: true, code: 'OK', message: 'ok' }],
      attempts: [{ engine: 'xray', ok: false, code, message: `gate ${code}` }],
    },
  };
}

function evaluateErrorCodeCoverage() {
  const codes = Array.from(new Set(Object.values(PROXY_TEST_ERROR_CODES)))
    .filter((code) => code && code !== 'OK');

  const rows = codes.map((code) => {
    const report = buildProxyTestReport({ nodes: [createSyntheticFailNode(code)] });
    const inDistribution = Array.isArray(report.failureDistribution) && report.failureDistribution.some((item) => item.code === code);
    const suggestionEntry = Array.isArray(report.suggestions) ? report.suggestions.find((item) => item.code === code) : null;
    const hasSuggestion = Boolean(suggestionEntry && String(suggestionEntry.suggestion || '').trim().length > 0);
    return {
      code,
      covered: inDistribution && hasSuggestion,
      inDistribution,
      hasSuggestion,
    };
  });

  const coveredCount = rows.filter((item) => item.covered).length;
  const coverage = rows.length > 0 ? Number((coveredCount / rows.length).toFixed(4)) : 1;
  return {
    targetCodes: rows.length,
    coveredCodes: coveredCount,
    coverage,
    rows,
  };
}

function runBenchmarkGate(outDir) {
  const benchmarkOut = path.join(outDir, 'benchmark.json');
  runNodeScript('scripts/benchmark_proxy_scheduler.js', [`--out=${benchmarkOut}`]);
  if (!fs.existsSync(benchmarkOut)) {
    throw new Error(`benchmark output missing: ${benchmarkOut}`);
  }
  const benchmark = JSON.parse(fs.readFileSync(benchmarkOut, 'utf8'));
  const singleSlo = benchmark && benchmark.singleSlo ? benchmark.singleSlo : {};
  const singlePass = Object.values(singleSlo).every((item) => item && item.pass === true);
  const batchPass = Boolean(benchmark && benchmark.batchSlo && benchmark.batchSlo.pass);
  return {
    benchmarkOut,
    singlePass,
    batchPass,
    benchmark,
  };
}

function readHistoryEntries(historyPath) {
  if (!historyPath || !fs.existsSync(historyPath)) return [];
  const raw = fs.readFileSync(historyPath, 'utf8');
  if (!raw.trim()) return [];
  return raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return null;
      }
    })
    .filter((item) => item && typeof item === 'object');
}

function writeHistoryEntries(historyPath, entries) {
  ensureDir(path.dirname(historyPath));
  const lines = (Array.isArray(entries) ? entries : []).map((item) => JSON.stringify(item));
  const text = lines.length > 0 ? `${lines.join('\n')}\n` : '';
  fs.writeFileSync(historyPath, text, 'utf8');
}

function toHistoryEntry(report) {
  const checks = report && report.checks ? report.checks : {};
  const protocol = checks.protocolCoverage || {};
  const errorCode = checks.errorCodeCoverage || {};
  const slo = checks.slo || {};
  const thresholdAudit = checks.thresholdAudit || {};
  const benchmark = slo.benchmark || {};
  const batchSlo = benchmark.batchSlo || {};
  return {
    generatedAt: report && report.generatedAt ? report.generatedAt : new Date().toISOString(),
    ok: Boolean(report && report.ok),
    thresholdVersion: report && report.thresholds ? String(report.thresholds.version || '') : '',
    thresholdDigest: report && report.thresholds ? String(report.thresholds.digest || '') : '',
    protocolCoverage: Number(protocol.coverage || 0),
    errorCodeCoverage: Number(errorCode.coverage || 0),
    singleSloPass: Boolean(slo.singlePass),
    batchSloPass: Boolean(slo.batchPass),
    thresholdAuditPass: Boolean(thresholdAudit.pass),
    batchLogicalDurationMs: Number.isFinite(batchSlo.logicalDurationMs) ? batchSlo.logicalDurationMs : null,
  };
}

function averageNumber(list) {
  const numbers = (Array.isArray(list) ? list : []).filter((value) => Number.isFinite(Number(value))).map((value) => Number(value));
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((total, value) => total + value, 0);
  return Number((sum / numbers.length).toFixed(2));
}

function passRate(list) {
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) return null;
  const passCount = rows.filter((item) => item && item.ok).length;
  return Number((passCount / rows.length).toFixed(4));
}

function computeHistoryTrend(entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const last = rows.length > 0 ? rows[rows.length - 1] : null;
  const last7 = rows.slice(-7);
  const last20 = rows.slice(-20);
  const batchDurations = rows
    .map((item) => (item && Number.isFinite(item.batchLogicalDurationMs) ? Number(item.batchLogicalDurationMs) : null))
    .filter((value) => Number.isFinite(value));
  const protocolCoverages = rows
    .map((item) => (item && Number.isFinite(item.protocolCoverage) ? Number(item.protocolCoverage) : null))
    .filter((value) => Number.isFinite(value));
  const errorCodeCoverages = rows
    .map((item) => (item && Number.isFinite(item.errorCodeCoverage) ? Number(item.errorCodeCoverage) : null))
    .filter((value) => Number.isFinite(value));

  return {
    totalRuns: rows.length,
    lastRunAt: last && last.generatedAt ? last.generatedAt : null,
    passRate: passRate(rows),
    passRate7: passRate(last7),
    passRate20: passRate(last20),
    avgBatchLogicalDurationMs: averageNumber(batchDurations),
    minBatchLogicalDurationMs: batchDurations.length > 0 ? Math.min(...batchDurations) : null,
    maxBatchLogicalDurationMs: batchDurations.length > 0 ? Math.max(...batchDurations) : null,
    avgProtocolCoverage: averageNumber(protocolCoverages),
    avgErrorCodeCoverage: averageNumber(errorCodeCoverages),
  };
}

function updateHistory(historyPath, entry, maxEntries) {
  const limit = clampNumber(maxEntries, 1, 5000, 120);
  const current = readHistoryEntries(historyPath);
  const next = current.concat(entry ? [entry] : []);
  const trimmed = next.length > limit ? next.slice(next.length - limit) : next;
  writeHistoryEntries(historyPath, trimmed);
  return trimmed;
}

function buildGateMarkdown(report) {
  const r = report && typeof report === 'object' ? report : {};
  const checks = r.checks || {};
  const protocol = checks.protocolCoverage || {};
  const errorCode = checks.errorCodeCoverage || {};
  const slo = checks.slo || {};
  const thresholdAudit = checks.thresholdAudit || {};
  const benchmark = slo.benchmark || {};
  const batch = benchmark.batchSlo || {};
  const thresholds = r.thresholds || {};
  const history = r.history || {};
  const trend = history.trend || {};

  const protocolRows = Array.isArray(protocol.rows)
    ? protocol.rows.filter((item) => !item.covered).slice(0, 20)
    : [];
  const errorRows = Array.isArray(errorCode.rows)
    ? errorCode.rows.filter((item) => !item.covered).slice(0, 20)
    : [];
  const recentRows = Array.isArray(history.recentRuns)
    ? history.recentRuns.slice(-8).reverse()
    : [];

  const lines = [];
  lines.push('# Proxy Quality Gate Summary');
  lines.push('');
  lines.push(`- GeneratedAt: ${r.generatedAt || new Date().toISOString()}`);
  lines.push(`- Overall: ${r.ok ? 'PASS' : 'FAIL'}`);
  lines.push(`- Duration: ${toNumberText(r.durationMs, 'ms')}`);
  lines.push('');

  lines.push('## Thresholds');
  lines.push('');
  lines.push('| Key | Value |');
  lines.push('|---|---|');
  lines.push(`| threshold.version | ${thresholds.version || '-'} |`);
  lines.push(`| minProtocolCoverage | ${toPercent(thresholds.minProtocolCoverage)} |`);
  lines.push(`| minErrorCodeCoverage | ${toPercent(thresholds.minErrorCodeCoverage)} |`);
  lines.push(`| requireSlo | ${Boolean(thresholds.requireSlo)} |`);
  lines.push(`| requireThresholdAudit | ${Boolean(thresholds.requireThresholdAudit)} |`);
  lines.push(`| threshold.digest | ${thresholds.digest || '-'} |`);
  lines.push(`| threshold.auditRegistry | ${thresholds.auditRegistryFile || '-'} |`);
  lines.push(`| thresholds.sourceFile | ${thresholds.sourceFile || '-'} |`);
  lines.push('');

  lines.push('## Checks');
  lines.push('');
  lines.push('| Check | Result | Detail |');
  lines.push('|---|---|---|');
  lines.push(`| Protocol coverage | ${protocol.pass ? 'PASS' : 'FAIL'} | ${protocol.coveredProtocols || 0}/${protocol.targetProtocols || 0} (${toPercent(protocol.coverage)}) |`);
  lines.push(`| Error-code coverage | ${errorCode.pass ? 'PASS' : 'FAIL'} | ${errorCode.coveredCodes || 0}/${errorCode.targetCodes || 0} (${toPercent(errorCode.coverage)}) |`);
  lines.push(`| SLO gate | ${slo.pass ? 'PASS' : 'FAIL'} | single=${Boolean(slo.singlePass)}, batch=${Boolean(slo.batchPass)}, logical=${toNumberText(batch.logicalDurationMs, 'ms')} |`);
  lines.push(`| Threshold audit | ${thresholdAudit.pass ? 'PASS' : 'FAIL'} | version=${thresholdAudit.version || '-'}, releasedAt=${thresholdAudit.releasedAt || '-'} |`);
  lines.push('');

  if (Array.isArray(thresholdAudit.errors) && thresholdAudit.errors.length > 0) {
    lines.push('## Threshold Audit Errors');
    lines.push('');
    thresholdAudit.errors.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  if (Array.isArray(thresholdAudit.warnings) && thresholdAudit.warnings.length > 0) {
    lines.push('## Threshold Audit Warnings');
    lines.push('');
    thresholdAudit.warnings.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  lines.push('## History Trend');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| history.enabled | ${Boolean(history.enabled)} |`);
  lines.push(`| history.path | ${history.path || '-'} |`);
  lines.push(`| totalRuns | ${toNumberText(trend.totalRuns)} |`);
  lines.push(`| passRate | ${toPercent(trend.passRate)} |`);
  lines.push(`| passRate7 | ${toPercent(trend.passRate7)} |`);
  lines.push(`| passRate20 | ${toPercent(trend.passRate20)} |`);
  lines.push(`| avgBatchLogicalDurationMs | ${toNumberText(trend.avgBatchLogicalDurationMs, 'ms')} |`);
  lines.push(`| minBatchLogicalDurationMs | ${toNumberText(trend.minBatchLogicalDurationMs, 'ms')} |`);
  lines.push(`| maxBatchLogicalDurationMs | ${toNumberText(trend.maxBatchLogicalDurationMs, 'ms')} |`);
  lines.push(`| avgProtocolCoverage | ${toPercent(trend.avgProtocolCoverage)} |`);
  lines.push(`| avgErrorCodeCoverage | ${toPercent(trend.avgErrorCodeCoverage)} |`);
  lines.push('');

  if (recentRows.length > 0) {
    lines.push('## Recent Runs');
    lines.push('');
    lines.push('| generatedAt | ok | protocolCoverage | errorCodeCoverage | batchLogicalDurationMs | version |');
    lines.push('|---|---|---:|---:|---:|---|');
    recentRows.forEach((item) => {
      lines.push(`| ${item.generatedAt || '-'} | ${item.ok ? 'PASS' : 'FAIL'} | ${toPercent(item.protocolCoverage)} | ${toPercent(item.errorCodeCoverage)} | ${toNumberText(item.batchLogicalDurationMs, 'ms')} | ${item.thresholdVersion || '-'} |`);
    });
    lines.push('');
  }

  if (protocolRows.length > 0) {
    lines.push('## Missing Protocol Coverage (Top 20)');
    lines.push('');
    lines.push('| Protocol | parser | engine | probe |');
    lines.push('|---|---|---|---|');
    protocolRows.forEach((item) => {
      lines.push(`| ${item.protocol} | ${Boolean(item.parser)} | ${Boolean(item.engine)} | ${Boolean(item.probe)} |`);
    });
    lines.push('');
  }

  if (errorRows.length > 0) {
    lines.push('## Missing Error-Code Diagnostics (Top 20)');
    lines.push('');
    lines.push('| Code | inDistribution | hasSuggestion |');
    lines.push('|---|---|---|');
    errorRows.forEach((item) => {
      lines.push(`| ${item.code} | ${Boolean(item.inDistribution)} | ${Boolean(item.hasSuggestion)} |`);
    });
    lines.push('');
  }

  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- report.json: ${r.artifacts && r.artifacts.reportJson ? r.artifacts.reportJson : '-'}`);
  lines.push(`- report.md: ${r.artifacts && r.artifacts.reportMarkdown ? r.artifacts.reportMarkdown : '-'}`);
  lines.push(`- benchmark.json: ${slo.benchmarkOut || '-'}`);
  lines.push('');
  return lines.join('\n');
}

function executeGate(options = {}) {
  const env = options.env && typeof options.env === 'object' ? options.env : process.env;
  const thresholds = loadGateThresholds({ env });
  const outDir = ensureDir(resolveOutDir(env));
  const historyPath = resolveHistoryPath(outDir, env);
  const thresholdFile = resolveThresholdsFile(env);
  const auditRegistryFile = resolveAuditRegistryFile(env);
  const startedAt = Date.now();

  runNodeScript('scripts/regression_protocol_matrix.js');
  runNodeScript('scripts/regression_proxy_test_schema.js');
  runNodeScript('scripts/regression_proxy_scheduler.js');

  const protocolCoverage = evaluateProtocolCoverage();
  const errorCodeCoverage = evaluateErrorCodeCoverage();
  const sloGate = runBenchmarkGate(outDir);
  const thresholdAudit = verifyThresholdAudit({
    thresholdFile,
    auditRegistryFile,
  });

  const protocolPass = protocolCoverage.coverage >= thresholds.minProtocolCoverage;
  const errorCodePass = errorCodeCoverage.coverage >= thresholds.minErrorCodeCoverage;
  const sloPass = !thresholds.requireSlo || (sloGate.singlePass && sloGate.batchPass);
  const thresholdAuditPass = !thresholds.requireThresholdAudit || thresholdAudit.ok;
  const ok = protocolPass && errorCodePass && sloPass && thresholdAuditPass;

  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    thresholds: {
      version: thresholds.version,
      sourceFile: thresholds.sourceFile,
      digest: thresholdAudit.thresholdDigest,
      auditRegistryFile: path.relative(process.cwd(), auditRegistryFile),
      minProtocolCoverage: thresholds.minProtocolCoverage,
      minErrorCodeCoverage: thresholds.minErrorCodeCoverage,
      requireSlo: thresholds.requireSlo,
      requireThresholdAudit: thresholds.requireThresholdAudit,
      historyEnabled: thresholds.history.enabled,
      historyMaxEntries: thresholds.history.maxEntries,
    },
    checks: {
      protocolCoverage: {
        pass: protocolPass,
        ...protocolCoverage,
      },
      errorCodeCoverage: {
        pass: errorCodePass,
        ...errorCodeCoverage,
      },
      slo: {
        pass: sloPass,
        singlePass: sloGate.singlePass,
        batchPass: sloGate.batchPass,
        benchmarkOut: path.relative(process.cwd(), sloGate.benchmarkOut),
        benchmark: sloGate.benchmark,
      },
      thresholdAudit: {
        pass: thresholdAuditPass,
        strict: thresholds.requireThresholdAudit,
        version: thresholdAudit.thresholdVersion,
        digest: thresholdAudit.thresholdDigest,
        releasedAt: thresholdAudit.matchedEntry && thresholdAudit.matchedEntry.releasedAt ? thresholdAudit.matchedEntry.releasedAt : null,
        registryPath: path.relative(process.cwd(), thresholdAudit.auditRegistryFile),
        errors: thresholdAudit.errors,
        warnings: thresholdAudit.warnings,
      },
    },
    ok,
  };

  let historyEntries = [];
  if (thresholds.history.enabled) {
    historyEntries = updateHistory(historyPath, toHistoryEntry(report), thresholds.history.maxEntries);
  }

  report.history = {
    enabled: thresholds.history.enabled,
    path: thresholds.history.enabled ? path.relative(process.cwd(), historyPath) : null,
    totalRuns: historyEntries.length,
    trend: computeHistoryTrend(historyEntries),
    recentRuns: historyEntries.slice(-20),
  };

  const reportPath = path.join(outDir, 'report.json');
  const markdownPath = path.join(outDir, 'report.md');
  report.artifacts = {
    reportJson: path.relative(process.cwd(), reportPath),
    reportMarkdown: path.relative(process.cwd(), markdownPath),
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${buildGateMarkdown(report)}\n`, 'utf8');
  return { report, reportPath, markdownPath };
}

function main() {
  const { report, reportPath, markdownPath } = executeGate();
  const protocolCoverage = report && report.checks && report.checks.protocolCoverage ? report.checks.protocolCoverage : {};
  const errorCodeCoverage = report && report.checks && report.checks.errorCodeCoverage ? report.checks.errorCodeCoverage : {};
  const slo = report && report.checks && report.checks.slo ? report.checks.slo : {};
  const thresholdAudit = report && report.checks && report.checks.thresholdAudit ? report.checks.thresholdAudit : {};

  console.log('[gate] threshold version:', report.thresholds && report.thresholds.version ? report.thresholds.version : '-');
  console.log('[gate] threshold audit:', `${Boolean(thresholdAudit.pass)} (strict=${Boolean(thresholdAudit.strict)})`);
  console.log('[gate] protocol coverage:', `${protocolCoverage.coveredProtocols || 0}/${protocolCoverage.targetProtocols || 0}`, `(${protocolCoverage.coverage || 0})`);
  console.log('[gate] error code coverage:', `${errorCodeCoverage.coveredCodes || 0}/${errorCodeCoverage.targetCodes || 0}`, `(${errorCodeCoverage.coverage || 0})`);
  console.log('[gate] slo pass:', `${Boolean(slo.pass)} (single=${Boolean(slo.singlePass)}, batch=${Boolean(slo.batchPass)})`);
  console.log('[gate] report:', reportPath);
  console.log('[gate] summary:', markdownPath);

  if (!report.ok) {
    console.error('[gate] FAILED');
    process.exit(2);
  }
  console.log('[gate] PASSED');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('[gate] ERROR:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_GATE_THRESHOLDS,
  loadGateThresholds,
  computeHistoryTrend,
  buildGateMarkdown,
  executeGate,
  resolveOutDir,
  resolveHistoryPath,
};

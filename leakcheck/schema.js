const path = require('path');

const LEAK_REPORT_SCHEMA_VERSION = 1;

function toIsoString(date) {
  try {
    return date.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}

function ensureString(value, fallback = undefined) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function safeProfileInfo(profile) {
  if (!profile || typeof profile !== 'object') {
    return { id: 'unknown' };
  }
  return {
    id: ensureString(profile.id, 'unknown'),
    name: ensureString(profile.name),
  };
}

function safeBrowserInfo(profile) {
  const kernel = profile && profile.fingerprint && profile.fingerprint.browserKernel;
  const family = kernel && typeof kernel.family === 'string' ? kernel.family : 'chromium';
  return {
    family: family === 'firefox' || family === 'webkit' ? family : 'chromium',
    version: kernel && typeof kernel.version === 'string' ? kernel.version : undefined,
    executablePath: kernel && typeof kernel.executablePath === 'string' ? kernel.executablePath : undefined,
    launchArgsHash: undefined,
  };
}

function safeProxyInfo(profile, detectedMode = 'app_proxy') {
  const engine = profile && (profile.proxyEngine || (profile.fingerprint && profile.fingerprint.proxyEngine));
  const normalizedEngine = engine === 'sing-box' ? 'sing-box' : engine === 'none' ? 'none' : 'xray';
  return {
    engine: normalizedEngine,
    mode: detectedMode === 'tun' || detectedMode === 'system_proxy' ? detectedMode : 'app_proxy',
    localEndpoint: undefined,
    remoteSummary: undefined,
  };
}

function createBaseLeakReport(profile, options = {}) {
  const createdAt = toIsoString(new Date());
  const report = {
    schemaVersion: LEAK_REPORT_SCHEMA_VERSION,
    createdAt,
    profile: safeProfileInfo(profile),
    browser: safeBrowserInfo(profile),
    proxy: safeProxyInfo(profile, options.proxyMode),
    ip: {
      publicIp: undefined,
      country: undefined,
      region: undefined,
      city: undefined,
      asn: undefined,
      isp: undefined,
      source: 'custom',
    },
    dns: {
      status: 'unknown',
      resolver: undefined,
      viaProxy: undefined,
      evidence: [],
    },
    ipv6: {
      status: 'unknown',
      hasIpv6: undefined,
      publicIpv6: undefined,
      evidence: [],
    },
    capabilities: {
      // Best-effort observations about the current runtime. Not a promise.
      udp: undefined,
      ipv6: undefined,
      tun: options.proxyMode === 'tun' ? true : undefined,
      systemProxy: options.proxyMode === 'system_proxy' ? true : undefined,
    },
    webrtc: {
      status: 'unknown',
      localIps: [],
      publicIps: [],
      policy: undefined,
      evidence: [],
    },
    headers: {
      userAgent: undefined,
      acceptLanguage: undefined,
      secChUa: undefined,
      secChUaPlatform: undefined,
      secChUaMobile: undefined,
    },
    consistency: {
      status: 'yellow',
      issues: [],
    },
    raw: {
      urls: Array.isArray(options.urls) ? options.urls : [],
      samples: undefined,
    },
  };

  return report;
}

function validateLeakReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object') errors.push('report must be an object');
  if (typeof report.schemaVersion !== 'number') errors.push('schemaVersion must be a number');
  if (!ensureString(report.createdAt)) errors.push('createdAt must be an ISO string');
  if (!report.profile || !ensureString(report.profile.id)) errors.push('profile.id is required');
  if (!report.proxy || !ensureString(report.proxy.engine)) errors.push('proxy.engine is required');
  if (!report.consistency || !ensureString(report.consistency.status)) errors.push('consistency.status is required');
  if (!Array.isArray(report.consistency.issues)) errors.push('consistency.issues must be an array');
  return { ok: errors.length === 0, errors };
}

function getLeakReportPath(baseDir, profileId, timestampId) {
  const safeProfileId = ensureString(profileId, 'unknown').replace(/[^\w.-]+/g, '_');
  const safeTs = ensureString(timestampId, new Date().toISOString().replace(/[:.]/g, '-'));
  return path.join(baseDir, 'fingerprint-regression', safeProfileId, safeTs, 'leak-report.json');
}

module.exports = {
  LEAK_REPORT_SCHEMA_VERSION,
  createBaseLeakReport,
  validateLeakReport,
  getLeakReportPath,
};

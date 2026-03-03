const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_THRESHOLD_FILE = path.join(process.cwd(), 'scripts', 'config', 'proxy_quality_gate.thresholds.json');
const DEFAULT_AUDIT_REGISTRY_FILE = path.join(process.cwd(), 'docs', 'proxy_quality_gate_threshold_audit.json');
const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}\.v\d+$/;

function readJsonFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

function normalizeForDigest(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeForDigest(item));
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        out[key] = normalizeForDigest(value[key]);
      });
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(normalizeForDigest(value));
}

function computeThresholdDigest(thresholdObject) {
  const stable = stableStringify(thresholdObject);
  return crypto.createHash('sha256').update(stable, 'utf8').digest('hex');
}

function loadThresholdConfig(filePath = DEFAULT_THRESHOLD_FILE) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`threshold file not found: ${resolved}`);
  }
  const json = readJsonFile(resolved);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(`threshold file invalid object: ${resolved}`);
  }
  return {
    path: resolved,
    data: json,
  };
}

function loadAuditRegistry(filePath = DEFAULT_AUDIT_REGISTRY_FILE) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return {
      path: resolved,
      data: null,
    };
  }
  const json = readJsonFile(resolved);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(`audit registry invalid object: ${resolved}`);
  }
  return {
    path: resolved,
    data: json,
  };
}

function verifyThresholdAudit(options = {}) {
  const thresholdFile = options.thresholdFile || DEFAULT_THRESHOLD_FILE;
  const auditRegistryFile = options.auditRegistryFile || DEFAULT_AUDIT_REGISTRY_FILE;
  const threshold = loadThresholdConfig(thresholdFile);
  const registry = loadAuditRegistry(auditRegistryFile);

  const errors = [];
  const warnings = [];
  const thresholdData = threshold.data;
  const thresholdVersion = String(thresholdData.version || '').trim();

  if (!thresholdVersion) {
    errors.push('threshold.version is required');
  } else if (!VERSION_PATTERN.test(thresholdVersion)) {
    errors.push(`threshold.version format invalid: ${thresholdVersion}`);
  }

  const digest = computeThresholdDigest(thresholdData);

  let entries = [];
  if (!registry.data) {
    errors.push(`audit registry missing: ${registry.path}`);
  } else {
    const rawEntries = Array.isArray(registry.data.entries) ? registry.data.entries : null;
    if (!rawEntries) {
      errors.push('audit registry entries must be an array');
    } else {
      entries = rawEntries.filter((entry) => entry && typeof entry === 'object');
      if (entries.length !== rawEntries.length) {
        warnings.push('audit registry contains non-object entries');
      }
    }
  }

  const matchedEntry = entries.find((entry) => (
    String(entry.version || '').trim() === thresholdVersion
    && String(entry.sha256 || '').trim() === digest
  )) || null;

  const sameVersionEntries = entries.filter((entry) => String(entry.version || '').trim() === thresholdVersion);
  if (sameVersionEntries.length > 1) {
    warnings.push(`multiple entries found for version: ${thresholdVersion}`);
  }
  if (thresholdVersion && sameVersionEntries.length === 0) {
    errors.push(`threshold version not found in audit registry: ${thresholdVersion}`);
  } else if (thresholdVersion && !matchedEntry) {
    errors.push(`threshold digest mismatch for version ${thresholdVersion}`);
  }

  return {
    ok: errors.length === 0,
    thresholdFile: threshold.path,
    auditRegistryFile: registry.path,
    thresholdVersion,
    thresholdDigest: digest,
    matchedEntry,
    sameVersionEntries,
    errors,
    warnings,
  };
}

module.exports = {
  DEFAULT_THRESHOLD_FILE,
  DEFAULT_AUDIT_REGISTRY_FILE,
  VERSION_PATTERN,
  stableStringify,
  computeThresholdDigest,
  loadThresholdConfig,
  loadAuditRegistry,
  verifyThresholdAudit,
};

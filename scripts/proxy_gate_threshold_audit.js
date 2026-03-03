/* eslint-disable no-console */
const path = require('path');
const {
  DEFAULT_THRESHOLD_FILE,
  DEFAULT_AUDIT_REGISTRY_FILE,
  verifyThresholdAudit,
} = require('./lib/proxy_gate_threshold_audit');

function parseArgs(argv) {
  const out = {};
  (Array.isArray(argv) ? argv : []).forEach((arg) => {
    const text = String(arg || '');
    if (!text.startsWith('--')) return;
    const eq = text.indexOf('=');
    if (eq < 0) {
      out[text.slice(2)] = 'true';
      return;
    }
    out[text.slice(2, eq)] = text.slice(eq + 1);
  });
  return out;
}

function parseBoolean(input, fallback) {
  if (typeof input === 'boolean') return input;
  const value = String(input == null ? '' : input).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

function toRelative(filePath) {
  return path.relative(process.cwd(), filePath);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const strict = parseBoolean(process.env.PROXY_GATE_AUDIT_STRICT, true);
  const thresholdFile = args.threshold || process.env.PROXY_GATE_THRESHOLDS_FILE || DEFAULT_THRESHOLD_FILE;
  const registryFile = args.registry || process.env.PROXY_GATE_AUDIT_REGISTRY_FILE || DEFAULT_AUDIT_REGISTRY_FILE;

  const result = verifyThresholdAudit({
    thresholdFile,
    auditRegistryFile: registryFile,
  });

  console.log('[audit] threshold:', toRelative(result.thresholdFile));
  console.log('[audit] registry:', toRelative(result.auditRegistryFile));
  console.log('[audit] version:', result.thresholdVersion || '-');
  console.log('[audit] sha256:', result.thresholdDigest);

  if (result.warnings.length > 0) {
    result.warnings.forEach((warning) => {
      console.warn(`[audit] warning: ${warning}`);
    });
  }

  if (result.ok) {
    const releasedAt = result.matchedEntry && result.matchedEntry.releasedAt ? result.matchedEntry.releasedAt : '-';
    console.log(`[audit] PASS (releasedAt=${releasedAt})`);
    return;
  }

  result.errors.forEach((error) => {
    console.error(`[audit] error: ${error}`);
  });
  if (strict) {
    console.error('[audit] FAILED');
    process.exit(2);
  }
  console.warn('[audit] WARN-ONLY (strict disabled)');
}

try {
  main();
} catch (err) {
  console.error('[audit] ERROR:', err && err.message ? err.message : err);
  process.exit(1);
}

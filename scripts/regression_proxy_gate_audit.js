/* eslint-disable no-console */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  computeThresholdDigest,
  verifyThresholdAudit,
} = require('./lib/proxy_gate_threshold_audit');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-gate-audit-'));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function baseThreshold(version = '2026-02-06.v1') {
  return {
    version,
    minProtocolCoverage: 1,
    minErrorCodeCoverage: 1,
    requireSlo: true,
    requireThresholdAudit: true,
    history: {
      enabled: true,
      maxEntries: 120,
    },
  };
}

function testAuditPass() {
  const dir = mkTmpDir();
  const thresholdPath = path.join(dir, 'thresholds.json');
  const registryPath = path.join(dir, 'audit.json');
  const threshold = baseThreshold('2026-02-06.v1');
  const digest = computeThresholdDigest(threshold);

  writeJson(thresholdPath, threshold);
  writeJson(registryPath, {
    schemaVersion: 1,
    entries: [
      {
        version: threshold.version,
        sha256: digest,
        releasedAt: '2026-02-06',
      },
    ],
  });

  const result = verifyThresholdAudit({
    thresholdFile: thresholdPath,
    auditRegistryFile: registryPath,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.thresholdVersion, threshold.version);
  assert.strictEqual(result.thresholdDigest, digest);
  assert(result.matchedEntry && result.matchedEntry.releasedAt === '2026-02-06');
}

function testAuditDigestMismatch() {
  const dir = mkTmpDir();
  const thresholdPath = path.join(dir, 'thresholds.json');
  const registryPath = path.join(dir, 'audit.json');
  const threshold = baseThreshold('2026-02-06.v2');

  writeJson(thresholdPath, threshold);
  writeJson(registryPath, {
    schemaVersion: 1,
    entries: [
      {
        version: threshold.version,
        sha256: 'deadbeef',
        releasedAt: '2026-02-06',
      },
    ],
  });

  const result = verifyThresholdAudit({
    thresholdFile: thresholdPath,
    auditRegistryFile: registryPath,
  });
  assert.strictEqual(result.ok, false);
  assert(result.errors.some((item) => item.includes('digest mismatch')));
}

function testAuditVersionFormat() {
  const dir = mkTmpDir();
  const thresholdPath = path.join(dir, 'thresholds.json');
  const registryPath = path.join(dir, 'audit.json');
  const threshold = baseThreshold('v-bad');
  const digest = computeThresholdDigest(threshold);

  writeJson(thresholdPath, threshold);
  writeJson(registryPath, {
    schemaVersion: 1,
    entries: [
      {
        version: threshold.version,
        sha256: digest,
        releasedAt: '2026-02-06',
      },
    ],
  });

  const result = verifyThresholdAudit({
    thresholdFile: thresholdPath,
    auditRegistryFile: registryPath,
  });
  assert.strictEqual(result.ok, false);
  assert(result.errors.some((item) => item.includes('format invalid')));
}

function main() {
  testAuditPass();
  testAuditDigestMismatch();
  testAuditVersionFormat();
  console.log('[ok] proxy gate audit regression passed');
}

main();

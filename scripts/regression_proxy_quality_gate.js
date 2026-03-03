/* eslint-disable no-console */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadGateThresholds,
  computeHistoryTrend,
  buildGateMarkdown,
} = require('./proxy_quality_gate');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-quality-gate-'));
}

function testThresholdLoadingAndOverrides() {
  const tempDir = mkTmpDir();
  const thresholdPath = path.join(tempDir, 'thresholds.json');
  fs.writeFileSync(thresholdPath, JSON.stringify({
    version: 'config-v1',
    minProtocolCoverage: 0.95,
    minErrorCodeCoverage: 0.96,
    requireSlo: true,
    history: { enabled: true, maxEntries: 12 },
  }, null, 2), 'utf8');

  const fromConfig = loadGateThresholds({
    env: {
      PROXY_GATE_THRESHOLDS_FILE: thresholdPath,
    },
  });
  assert.strictEqual(fromConfig.version, 'config-v1');
  assert.strictEqual(fromConfig.minProtocolCoverage, 0.95);
  assert.strictEqual(fromConfig.minErrorCodeCoverage, 0.96);
  assert.strictEqual(fromConfig.requireSlo, true);
  assert.strictEqual(fromConfig.history.enabled, true);
  assert.strictEqual(fromConfig.history.maxEntries, 12);

  const fromEnv = loadGateThresholds({
    env: {
      PROXY_GATE_THRESHOLDS_FILE: thresholdPath,
      PROXY_GATE_THRESHOLD_VERSION: 'env-v2',
      PROXY_GATE_MIN_PROTOCOL_COVERAGE: '0.88',
      PROXY_GATE_MIN_ERROR_CODE_COVERAGE: '0.89',
      PROXY_GATE_REQUIRE_SLO: '0',
      PROXY_GATE_HISTORY_ENABLED: '0',
      PROXY_GATE_HISTORY_MAX_ENTRIES: '5',
    },
  });
  assert.strictEqual(fromEnv.version, 'env-v2');
  assert.strictEqual(fromEnv.minProtocolCoverage, 0.88);
  assert.strictEqual(fromEnv.minErrorCodeCoverage, 0.89);
  assert.strictEqual(fromEnv.requireSlo, false);
  assert.strictEqual(fromEnv.history.enabled, false);
  assert.strictEqual(fromEnv.history.maxEntries, 5);
}

function testTrendAndMarkdown() {
  const entries = [
    {
      generatedAt: '2026-02-06T00:00:00.000Z',
      ok: true,
      thresholdVersion: 'v1',
      protocolCoverage: 1,
      errorCodeCoverage: 1,
      batchLogicalDurationMs: 260000,
    },
    {
      generatedAt: '2026-02-06T00:10:00.000Z',
      ok: false,
      thresholdVersion: 'v1',
      protocolCoverage: 0.9,
      errorCodeCoverage: 1,
      batchLogicalDurationMs: 500000,
    },
    {
      generatedAt: '2026-02-06T00:20:00.000Z',
      ok: true,
      thresholdVersion: 'v1',
      protocolCoverage: 1,
      errorCodeCoverage: 0.95,
      batchLogicalDurationMs: 255000,
    },
  ];

  const trend = computeHistoryTrend(entries);
  assert.strictEqual(trend.totalRuns, 3);
  assert.strictEqual(trend.lastRunAt, '2026-02-06T00:20:00.000Z');
  assert.strictEqual(trend.passRate, 0.6667);
  assert.strictEqual(trend.passRate7, 0.6667);
  assert.strictEqual(trend.maxBatchLogicalDurationMs, 500000);
  assert.strictEqual(trend.minBatchLogicalDurationMs, 255000);

  const markdown = buildGateMarkdown({
    generatedAt: '2026-02-06T00:30:00.000Z',
    ok: true,
    durationMs: 9999,
    thresholds: {
      version: 'v1',
      sourceFile: 'scripts/config/proxy_quality_gate.thresholds.json',
      minProtocolCoverage: 1,
      minErrorCodeCoverage: 1,
      requireSlo: true,
    },
    checks: {
      protocolCoverage: { pass: true, coveredProtocols: 14, targetProtocols: 14, coverage: 1, rows: [] },
      errorCodeCoverage: { pass: true, coveredCodes: 14, targetCodes: 14, coverage: 1, rows: [] },
      slo: { pass: true, singlePass: true, batchPass: true, benchmarkOut: 'x.json', benchmark: { batchSlo: { logicalDurationMs: 250000 } } },
    },
    history: {
      enabled: true,
      path: '.context-snapshots/proxy-quality-gate/history.jsonl',
      trend,
      recentRuns: entries,
    },
    artifacts: {
      reportJson: '.context-snapshots/proxy-quality-gate/report.json',
      reportMarkdown: '.context-snapshots/proxy-quality-gate/report.md',
    },
  });

  assert(markdown.includes('## Thresholds'));
  assert(markdown.includes('## History Trend'));
  assert(markdown.includes('## Recent Runs'));
}

function main() {
  testThresholdLoadingAndOverrides();
  testTrendAndMarkdown();
  console.log('[ok] proxy quality gate regression passed');
}

main();

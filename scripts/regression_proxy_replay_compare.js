/* eslint-disable no-console */
const assert = require('assert');
const {
  normalizeReplayDataset,
  buildReplayComparisonReport,
  toReplayComparisonMarkdown,
} = require('../proxy/replayComparator');

function createBaseline() {
  return {
    label: 'baseline',
    nodes: [
      {
        id: 'n-pass',
        protocol: 'vless',
        engine: 'xray',
        status: 'PASS',
        finalCode: 'OK',
        latencyMs: 180,
        durationMs: 4300,
        attempts: [{}, {}],
        probeProfile: { profile: 'standard' },
        steps: [
          { name: 'parse' },
          { name: 'capability' },
          { name: 'engine_start' },
          { name: 'connectivity_probe' },
          { name: 'finalize' },
        ],
      },
      {
        id: 'n-regress',
        protocol: 'hysteria2',
        engine: 'sing-box',
        status: 'PASS',
        finalCode: 'OK',
        latencyMs: 260,
        durationMs: 5200,
        attempts: [{}, {}],
        probeProfile: { profile: 'standard' },
        steps: [
          { name: 'parse' },
          { name: 'capability' },
          { name: 'engine_start' },
          { name: 'connectivity_probe' },
          { name: 'finalize' },
        ],
      },
      {
        id: 'n-fail',
        protocol: 'ss',
        engine: 'xray',
        status: 'FAIL',
        finalCode: 'PROBE_TIMEOUT',
        durationMs: 6800,
        attempts: [{}, {}],
        probeProfile: { profile: 'standard' },
        steps: [
          { name: 'parse' },
          { name: 'capability' },
          { name: 'engine_start' },
          { name: 'connectivity_probe' },
          { name: 'finalize' },
        ],
      },
    ],
  };
}

function createCandidate() {
  return {
    meta: { name: 'candidate' },
    results: [
      {
        id: 'n-pass',
        protocol: 'vless',
        engine: 'xray',
        status: 'PASS',
        finalCode: 'OK',
        latencyMs: 160,
        durationMs: 3900,
        attempts: [{}, {}, {}],
        probeProfile: { profile: 'deep' },
        steps: [
          { name: 'parse' },
          { name: 'capability' },
          { name: 'engine_start' },
          { name: 'connectivity_probe' },
          { name: 'finalize' },
        ],
      },
      {
        id: 'n-regress',
        protocol: 'hysteria2',
        engine: 'sing-box',
        status: 'FAIL',
        finalCode: 'HANDSHAKE_HTTP_403',
        durationMs: 8100,
        attempts: [{}, {}, {}],
        probeProfile: { profile: 'deep' },
        steps: [
          { name: 'parse' },
          { name: 'capability' },
          { name: 'engine_start' },
          { name: 'connectivity_probe' },
          { name: 'finalize' },
        ],
      },
      {
        id: 'n-fail',
        protocol: 'ss',
        engine: 'xray',
        status: 'PASS',
        finalCode: 'OK',
        latencyMs: 210,
        durationMs: 5100,
        attempts: [{}, {}],
        probeProfile: { profile: 'deep' },
        steps: [
          { name: 'parse' },
          { name: 'capability' },
          { name: 'engine_start' },
          { name: 'connectivity_probe' },
          { name: 'finalize' },
        ],
      },
    ],
  };
}

function testNormalizeDataset() {
  const normalized = normalizeReplayDataset(createBaseline(), { label: 'baseline-check' });
  assert.strictEqual(normalized.total, 3);
  assert.strictEqual(normalized.tested, 3);
  assert.strictEqual(normalized.ok, 2);
  assert.strictEqual(normalized.failed, 1);
  assert(normalized.fieldCoverage.required.some((item) => item.field === 'status' && item.coverage === 1));
  assert(normalized.flowCoverage.requiredSteps.some((item) => item.step === 'parse' && item.coverage === 1));
}

function testComparisonReport() {
  const report = buildReplayComparisonReport({
    baseline: createBaseline(),
    candidate: createCandidate(),
    baselineLabel: 'geekez-baseline',
    candidateLabel: 'geekez-candidate',
  });

  assert.strictEqual(report.baseline.label, 'geekez-baseline');
  assert.strictEqual(report.candidate.label, 'geekez-candidate');
  assert.strictEqual(report.matched.count, 3);
  assert.strictEqual(report.matched.regressions, 1);
  assert.strictEqual(report.matched.improvements, 1);
  assert(report.protocolComparison.some((item) => item.protocol === 'hysteria2' && item.passRateDelta < 0));
  assert(report.protocolComparison.some((item) => item.protocol === 'ss' && item.passRateDelta > 0));
  assert(report.paritySummary && typeof report.paritySummary === 'object');
  assert(Number.isFinite(report.paritySummary.overallScore));
  assert(report.paritySummary.dimensions && report.paritySummary.dimensions.format);
  assert.strictEqual(report.paritySummary.gatePass, false, 'candidate has known regression and should not pass gate');

  const md = toReplayComparisonMarkdown(report);
  assert(md.includes('对标门禁'));
  assert(md.includes('展示格式对标'));
  assert(md.includes('速度对标'));
  assert(md.includes('流程对标'));
  assert(md.includes('Top 回归'));
}

function main() {
  testNormalizeDataset();
  testComparisonReport();
  console.log('[ok] proxy replay compare regression passed');
}

main();

/* eslint-disable no-console */
const assert = require('assert');
const {
  normalizeProxyBatchTestStrategy,
  runProxyBatchTestSchedule,
  recommendProxyBatchTestStrategy,
} = require('../proxy/testScheduler');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function testNormalizeStrategy() {
  const normalized = normalizeProxyBatchTestStrategy({
    maxConcurrency: 99,
    batchSize: 1,
    budgetMs: 2000,
    backoffBaseMs: -10,
    highFailureRatio: 2,
    minSamplesForBackoff: 0,
    testProfile: 'quick',
    probeTimeoutMs: 99999,
    probeCount: 99,
    probeParallelism: 99,
    includeGeo: true,
  }, { nodeCount: 3, hardwareConcurrency: 16 });

  assert.strictEqual(normalized.maxConcurrency, 16, 'maxConcurrency should clamp to upper bound');
  assert.strictEqual(normalized.batchSize, 10, 'batchSize should clamp to minimum');
  assert.strictEqual(normalized.budgetMs, 5000, 'budgetMs should clamp to minimum');
  assert.strictEqual(normalized.backoffBaseMs, 0, 'backoffBaseMs should clamp to minimum');
  assert.strictEqual(normalized.highFailureRatio, 1, 'highFailureRatio should clamp to upper bound');
  assert.strictEqual(normalized.minSamplesForBackoff, 1, 'minSamplesForBackoff should clamp to minimum');
  assert.strictEqual(normalized.testProfile, 'quick', 'testProfile should persist normalized value');
  assert.strictEqual(normalized.probeTimeoutMs, 30000, 'probeTimeoutMs should clamp to upper bound');
  assert.strictEqual(normalized.probeCount, 4, 'probeCount should clamp to available probe count');
  assert.strictEqual(normalized.probeParallelism, 4, 'probeParallelism should clamp to available probe count');
  assert.strictEqual(normalized.includeGeo, true, 'includeGeo should honor explicit override');
}

function testProfilePresetDefaults() {
  const normalized = normalizeProxyBatchTestStrategy({
    testProfile: 'quick',
  }, { nodeCount: 1, hardwareConcurrency: 4 });

  assert.strictEqual(normalized.testProfile, 'quick', 'profile should normalize');
  assert.strictEqual(normalized.probeTimeoutMs, 4500, 'quick preset probe timeout should apply');
  assert.strictEqual(normalized.probeCount, 2, 'quick preset probe count should apply');
  assert.strictEqual(normalized.probeParallelism, 2, 'quick preset probe parallelism should apply');
  assert.strictEqual(normalized.includeGeo, false, 'quick preset should skip geo');
}

async function testRunBasic() {
  const nodes = new Array(8).fill(0).map((_, index) => ({
    id: `n-${index + 1}`,
    url: index % 2 === 0 ? 'vless://example.com:443' : 'hy2://example.com:443',
  }));

  let inFlight = 0;
  let maxInFlight = 0;
  const strategy = normalizeProxyBatchTestStrategy({
    maxConcurrency: 2,
    batchSize: 4,
    budgetMs: 60000,
    backoffBaseMs: 5,
    backoffMaxMs: 20,
    minSamplesForBackoff: 2,
    highFailureRatio: 0.5,
  }, { nodeCount: nodes.length, hardwareConcurrency: 8 });

  const summary = await runProxyBatchTestSchedule(
    nodes,
    async (node, index) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(8);
      inFlight -= 1;
      return { ok: index % 3 !== 0, node };
    },
    strategy,
    { hardwareConcurrency: 8 }
  );

  assert.strictEqual(summary.total, 8, 'total should match input');
  assert.strictEqual(summary.completed, 8, 'all nodes should be completed');
  assert.strictEqual(summary.success + summary.failed, 8, 'success + failed should equal completed');
  assert.strictEqual(summary.skipped, 0, 'no skipped nodes expected');
  assert(maxInFlight <= 2, `concurrency limit should hold (got ${maxInFlight})`);
}

async function testBudgetStop() {
  const nodes = new Array(6).fill(0).map((_, index) => ({
    id: `b-${index + 1}`,
    url: 'ss://example.com:8388',
  }));

  const summary = await runProxyBatchTestSchedule(
    nodes,
    async () => {
      await sleep(1100);
      return { ok: true };
    },
    {
      maxConcurrency: 1,
      batchSize: 6,
      budgetMs: 5000,
      backoffBaseMs: 0,
      backoffMaxMs: 0,
    },
    { hardwareConcurrency: 4 }
  );

  assert(summary.completed < nodes.length, 'budget should stop early');
  assert(summary.budgetExceeded, 'budgetExceeded should be true');
  assert(summary.skipped > 0, 'skipped should be greater than 0 when budget exceeded');
}

async function testProtocolBackoffStats() {
  const nodes = new Array(5).fill(0).map((_, index) => ({
    id: `f-${index + 1}`,
    url: 'hy2://example.com:443',
  }));

  const summary = await runProxyBatchTestSchedule(
    nodes,
    async () => ({ ok: false }),
    {
      maxConcurrency: 1,
      batchSize: 5,
      budgetMs: 60000,
      backoffBaseMs: 10,
      backoffMaxMs: 30,
      minSamplesForBackoff: 1,
      highFailureRatio: 0.5,
      perProtocolBackoff: true,
    },
    { hardwareConcurrency: 4 }
  );

  assert.strictEqual(summary.failed, summary.completed, 'all runs should fail');
  assert(summary.protocolStats.hy2, 'hy2 protocol stats should exist');
  assert(summary.protocolStats.hy2.backoffLevel >= 1, 'backoff level should rise when failures dominate');
}

async function testAdaptiveRuntimeOptions() {
  const nodes = new Array(10).fill(0).map((_, index) => ({
    id: `a-${index + 1}`,
    url: 'vmess://example.com:443',
  }));
  const seenProfiles = [];
  const seenParallelism = [];

  await runProxyBatchTestSchedule(
    nodes,
    async (_node, _index, ctx) => {
      if (ctx && ctx.runtimeOptions) {
        seenProfiles.push(ctx.runtimeOptions.profile);
        seenParallelism.push(ctx.runtimeOptions.probeParallelism);
      }
      await sleep(120);
      return { ok: true };
    },
    {
      testProfile: 'deep',
      maxConcurrency: 1,
      batchSize: 10,
      budgetMs: 5000,
      adaptiveBudget: true,
      adaptivePressureThreshold: 1.01,
    },
    { hardwareConcurrency: 8 }
  );

  assert(seenProfiles.length > 0, 'runtime options should be passed to runOne context');
  assert(seenProfiles.includes('quick'), 'adaptive mode should downgrade some tasks to quick profile under budget pressure');
  assert(seenParallelism.every((value) => Number.isFinite(value) && value >= 1), 'probeParallelism should always be valid');
}

function testRecommendation() {
  const recommendation = recommendProxyBatchTestStrategy({
    nodeCount: 100,
    expectedFailureRatio: 0.2,
  }, { hardwareConcurrency: 12 });

  assert.strictEqual(recommendation.enabled, true, 'recommended strategy should be enabled');
  assert(recommendation.maxConcurrency >= 1 && recommendation.maxConcurrency <= 8, 'recommended concurrency should be bounded');
  assert(recommendation.batchSize >= 10 && recommendation.batchSize <= 200, 'recommended batch size should be bounded');
  assert(['quick', 'standard', 'deep'].includes(recommendation.testProfile), 'recommended profile should be valid');
}

async function main() {
  testNormalizeStrategy();
  testProfilePresetDefaults();
  await testRunBasic();
  await testBudgetStop();
  await testProtocolBackoffStats();
  await testAdaptiveRuntimeOptions();
  testRecommendation();
  console.log('[ok] proxy scheduler regression passed');
}

main().catch((err) => {
  console.error('[fail] proxy scheduler regression failed:', err && err.message ? err.message : err);
  process.exit(1);
});

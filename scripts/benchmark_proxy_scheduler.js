/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const {
  normalizeProxyBatchTestStrategy,
  recommendProxyBatchTestStrategy,
  runProxyBatchTestSchedule,
} = require('../proxy/testScheduler');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSeededRandom(seed = 104) {
  let state = Math.max(1, Number(seed) | 0);
  return function next() {
    state = (state * 48271) % 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function percentile(list, q) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const sorted = list.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[idx];
}

function createNodes(nodeCount, rng) {
  const protocols = ['vless', 'vmess', 'ss', 'hy2', 'tuic', 'trojan'];
  const groups = ['manual', 'sub-a', 'sub-b'];
  return new Array(nodeCount).fill(0).map((_, index) => {
    const proto = protocols[Math.floor(rng() * protocols.length)];
    const group = groups[Math.floor(rng() * groups.length)];
    return {
      id: `bench-${index + 1}`,
      groupId: group,
      url: `${proto}://example-${index + 1}.com:443`,
    };
  });
}

function profileFactor(profile) {
  if (profile === 'quick') return 1;
  if (profile === 'deep') return 1.68;
  return 1.22;
}

function parallelismGain(parallelism) {
  const p = Math.max(1, Number(parallelism) || 1);
  return Math.max(0.7, 1 - ((p - 1) * 0.12));
}

function estimateSingleLogicalDurationMs(runtimeOptions, rng) {
  const profile = runtimeOptions.profile || 'standard';
  const base = (
    runtimeOptions.engineBootWaitMs +
    (runtimeOptions.probeTimeoutMs * 0.45) +
    (runtimeOptions.ipTimeoutMs * 0.25) +
    (runtimeOptions.includeGeo ? runtimeOptions.geoTimeoutMs * 0.2 : 0) +
    (runtimeOptions.probeCount * 120)
  );
  const jitter = 0.9 + (rng() * 0.24);
  return Math.round(base * parallelismGain(runtimeOptions.probeParallelism) * profileFactor(profile) * jitter);
}

function estimateBatchLogicalDurationMs(runtimeOptions, protocol, rng) {
  const profile = runtimeOptions.profile || 'standard';
  const protocolFactor = (protocol === 'hy2' || protocol === 'tuic') ? 1.12 : 1;
  const base = (
    runtimeOptions.engineBootWaitMs +
    (runtimeOptions.probeTimeoutMs * 0.8) +
    (runtimeOptions.ipTimeoutMs * 0.65) +
    (runtimeOptions.includeGeo ? runtimeOptions.geoTimeoutMs * 0.55 : 0) +
    (runtimeOptions.probeCount * 300)
  );
  const jitter = 0.86 + (rng() * 0.32);
  return Math.round(base * parallelismGain(runtimeOptions.probeParallelism) * profileFactor(profile) * protocolFactor * jitter);
}

function shouldPass(runtimeOptions, protocol, expectedFailureRatio, rng) {
  let fail = expectedFailureRatio;
  if (runtimeOptions.profile === 'quick') fail += 0.04;
  if (!runtimeOptions.includeGeo) fail += 0.01;
  if (protocol === 'hy2' || protocol === 'tuic') fail += 0.05;
  if (runtimeOptions.probeCount <= 1) fail += 0.04;
  fail = Math.max(0.02, Math.min(0.95, fail));
  return rng() > fail;
}

function scaleDurationForSimulation(ms, timeScale, fallback = 0, min = 0) {
  const raw = Number(ms);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.max(min, Math.round(raw * timeScale));
}

async function simulateBatch({ nodeCount, strategyInput, hardwareConcurrency = 8, expectedFailureRatio = 0.3, seed = 104, timeScale = 0.01 }) {
  const rng = createSeededRandom(seed);
  const nodes = createNodes(nodeCount, rng);
  const strategy = normalizeProxyBatchTestStrategy(strategyInput, { nodeCount, hardwareConcurrency });
  const scaledBackoffBaseMs = scaleDurationForSimulation(strategy.backoffBaseMs, timeScale, 0, 0);
  const scaledBackoffMaxMs = Math.max(
    scaledBackoffBaseMs,
    scaleDurationForSimulation(strategy.backoffMaxMs, timeScale, scaledBackoffBaseMs, 0)
  );
  const simulationStrategy = {
    ...strategy,
    backoffBaseMs: scaledBackoffBaseMs,
    backoffMaxMs: scaledBackoffMaxMs,
    budgetMs: scaleDurationForSimulation(strategy.budgetMs, timeScale, 1000, 1000),
  };

  const summary = await runProxyBatchTestSchedule(
    nodes,
    async (node, _index, ctx) => {
      const runtimeOptions = ctx && ctx.runtimeOptions ? ctx.runtimeOptions : strategy;
      const protocol = String(node.url || '').split('://')[0] || 'unknown';
      const logicalMs = estimateBatchLogicalDurationMs(runtimeOptions, protocol, rng);
      const wallMs = Math.max(4, Math.round(logicalMs * timeScale));
      await sleep(wallMs);
      return { ok: shouldPass(runtimeOptions, protocol, expectedFailureRatio, rng) };
    },
    simulationStrategy,
    { hardwareConcurrency }
  );

  return {
    ...summary,
    logicalDurationMs: Math.round(summary.durationMs / timeScale),
    strategy,
    simulationStrategy,
  };
}

function evaluateSingleNodeSlo(seed = 104) {
  const rng = createSeededRandom(seed);
  const targets = {
    quick: [3000, 5000],
    standard: [8000, 12000],
    deep: [15000, 20000],
  };
  const out = {};

  ['quick', 'standard', 'deep'].forEach((profile) => {
    const strategy = normalizeProxyBatchTestStrategy({ testProfile: profile }, { nodeCount: 1, hardwareConcurrency: 8 });
    const samples = new Array(31).fill(0).map(() => estimateSingleLogicalDurationMs({
      profile,
      probeTimeoutMs: strategy.probeTimeoutMs,
      ipTimeoutMs: strategy.ipTimeoutMs,
      geoTimeoutMs: strategy.geoTimeoutMs,
      probeCount: strategy.probeCount,
      probeParallelism: strategy.probeParallelism,
      includeGeo: strategy.includeGeo,
      engineBootWaitMs: strategy.engineBootWaitMs,
    }, rng));

    const p50 = percentile(samples, 0.5);
    const p90 = percentile(samples, 0.9);
    const [minMs, maxMs] = targets[profile];
    out[profile] = {
      targetMs: { min: minMs, max: maxMs },
      p50,
      p90,
      pass: Number.isFinite(p50) && p50 >= minMs && p50 <= maxMs,
    };
  });

  return out;
}

function evaluateBatchSlo(logicalDurationMs) {
  const minMs = 180000;
  const maxMs = 480000;
  return {
    targetMs: { min: minMs, max: maxMs },
    logicalDurationMs,
    pass: logicalDurationMs >= minMs && logicalDurationMs <= maxMs,
  };
}

async function main() {
  const hardwareConcurrency = 8;
  const baseline = recommendProxyBatchTestStrategy({
    nodeCount: 100,
    expectedFailureRatio: 0.32,
  }, { hardwareConcurrency });

  const batchRun = await simulateBatch({
    nodeCount: 100,
    strategyInput: baseline,
    hardwareConcurrency,
    expectedFailureRatio: 0.32,
    seed: 104,
    timeScale: 0.01,
  });

  const singleSlo = evaluateSingleNodeSlo(104);
  const batchSlo = evaluateBatchSlo(batchRun.logicalDurationMs);

  const recommendationMatrix = [20, 50, 100, 200].map((count) => ({
    nodeCount: count,
    recommendation: recommendProxyBatchTestStrategy(
      { nodeCount: count, expectedFailureRatio: count >= 120 ? 0.4 : 0.25 },
      { hardwareConcurrency }
    ),
  }));

  const result = {
    generatedAt: new Date().toISOString(),
    hardwareConcurrency,
    singleSlo,
    batchSlo,
    batchSummary: {
      total: batchRun.total,
      completed: batchRun.completed,
      success: batchRun.success,
      failed: batchRun.failed,
      budgetExceeded: batchRun.budgetExceeded,
      logicalDurationMs: batchRun.logicalDurationMs,
      recommendedProfile: batchRun.recommended && batchRun.recommended.testProfile,
    },
    recommendationMatrix: recommendationMatrix.map((item) => ({
      nodeCount: item.nodeCount,
      testProfile: item.recommendation.testProfile,
      maxConcurrency: item.recommendation.maxConcurrency,
      batchSize: item.recommendation.batchSize,
      budgetMs: item.recommendation.budgetMs,
      probeCount: item.recommendation.probeCount,
      probeParallelism: item.recommendation.probeParallelism,
      includeGeo: item.recommendation.includeGeo,
    })),
  };

  const outputPathArg = process.argv.find((x) => x.startsWith('--out='));
  if (outputPathArg) {
    const raw = outputPathArg.slice('--out='.length);
    const target = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    fs.writeFileSync(target, JSON.stringify(result, null, 2), 'utf8');
    console.log(`[ok] benchmark result written: ${target}`);
  }

  console.log(JSON.stringify(result, null, 2));

  const singlePass = Object.values(singleSlo).every((item) => item.pass);
  const batchPass = batchSlo.pass;
  if (!singlePass || !batchPass) {
    console.error('[warn] benchmark did not fully meet SLO targets');
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('[fail] benchmark proxy scheduler failed:', err && err.message ? err.message : err);
  process.exit(1);
});

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProxyTestScheduler = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  var DEFAULT_PROXY_BATCH_TEST_STRATEGY = Object.freeze({
    enabled: true,
    maxConcurrency: 4,
    batchSize: 50,
    budgetMs: 180000,
    backoffBaseMs: 600,
    backoffMaxMs: 5000,
    highFailureRatio: 0.8,
    minSamplesForBackoff: 5,
    perProtocolBackoff: true,
    protocolBucketed: true,
    yieldEvery: 20,
    testProfile: 'standard',
    probeTimeoutMs: 7000,
    ipTimeoutMs: 8000,
    geoTimeoutMs: 8000,
    probeCount: 4,
    probeParallelism: 2,
    includeGeo: true,
    engineBootWaitMs: 800,
    adaptiveBudget: true,
    adaptivePressureThreshold: 1.2,
  });

  var TEST_PROFILE_PRESETS = Object.freeze({
    quick: Object.freeze({
      probeTimeoutMs: 4500,
      ipTimeoutMs: 3500,
      geoTimeoutMs: 3500,
      probeCount: 2,
      probeParallelism: 2,
      includeGeo: false,
      engineBootWaitMs: 500,
    }),
    standard: Object.freeze({
      probeTimeoutMs: 7000,
      ipTimeoutMs: 8000,
      geoTimeoutMs: 8000,
      probeCount: 4,
      probeParallelism: 2,
      includeGeo: true,
      engineBootWaitMs: 800,
    }),
    deep: Object.freeze({
      probeTimeoutMs: 12000,
      ipTimeoutMs: 12000,
      geoTimeoutMs: 12000,
      probeCount: 4,
      probeParallelism: 3,
      includeGeo: true,
      engineBootWaitMs: 1200,
    }),
  });

  function clampInt(input, min, max, fallback) {
    var num = Number(input);
    if (!Number.isFinite(num)) return fallback;
    var value = Math.round(num);
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function clampRatio(input, min, max, fallback) {
    var num = Number(input);
    if (!Number.isFinite(num)) return fallback;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  }

  function normalizeProfileName(input) {
    var raw = String(input || '').trim().toLowerCase();
    if (raw === 'quick' || raw === 'standard' || raw === 'deep') return raw;
    return 'standard';
  }

  function detectHardwareConcurrency(runtime) {
    var fromRuntime = runtime && Number(runtime.hardwareConcurrency);
    if (Number.isFinite(fromRuntime) && fromRuntime > 0) return Math.max(1, Math.floor(fromRuntime));
    if (typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)) {
      return Math.max(1, Math.floor(navigator.hardwareConcurrency));
    }
    return 4;
  }

  function normalizeProxyBatchTestStrategy(input, runtime) {
    var source = input && typeof input === 'object' ? input : {};
    var rt = runtime && typeof runtime === 'object' ? runtime : {};
    var hardware = detectHardwareConcurrency(rt);
    var nodeCount = Number(rt.nodeCount);
    var baseDefaultConcurrency = Math.max(1, Math.min(8, hardware));
    var defaultConcurrency = (Number.isFinite(nodeCount) && nodeCount > 0)
      ? Math.max(1, Math.min(baseDefaultConcurrency, Math.floor(nodeCount)))
      : baseDefaultConcurrency;

    var profile = normalizeProfileName(source.testProfile || source.profile);
    var preset = TEST_PROFILE_PRESETS[profile] || TEST_PROFILE_PRESETS.standard;

    var normalized = {
      enabled: source.enabled !== false,
      maxConcurrency: clampInt(source.maxConcurrency, 1, 16, defaultConcurrency),
      batchSize: clampInt(source.batchSize, 10, 200, DEFAULT_PROXY_BATCH_TEST_STRATEGY.batchSize),
      budgetMs: clampInt(source.budgetMs, 5000, 600000, DEFAULT_PROXY_BATCH_TEST_STRATEGY.budgetMs),
      backoffBaseMs: clampInt(source.backoffBaseMs, 0, 20000, DEFAULT_PROXY_BATCH_TEST_STRATEGY.backoffBaseMs),
      backoffMaxMs: clampInt(source.backoffMaxMs, 0, 60000, DEFAULT_PROXY_BATCH_TEST_STRATEGY.backoffMaxMs),
      highFailureRatio: clampRatio(source.highFailureRatio, 0.3, 1, DEFAULT_PROXY_BATCH_TEST_STRATEGY.highFailureRatio),
      minSamplesForBackoff: clampInt(source.minSamplesForBackoff, 1, 20, DEFAULT_PROXY_BATCH_TEST_STRATEGY.minSamplesForBackoff),
      perProtocolBackoff: source.perProtocolBackoff !== false,
      protocolBucketed: source.protocolBucketed !== false,
      yieldEvery: clampInt(source.yieldEvery, 1, 200, DEFAULT_PROXY_BATCH_TEST_STRATEGY.yieldEvery),
      testProfile: profile,
      probeTimeoutMs: clampInt(source.probeTimeoutMs, 2000, 30000, preset.probeTimeoutMs),
      ipTimeoutMs: clampInt(source.ipTimeoutMs, 2000, 30000, preset.ipTimeoutMs),
      geoTimeoutMs: clampInt(source.geoTimeoutMs, 2000, 30000, preset.geoTimeoutMs),
      probeCount: clampInt(source.probeCount, 1, 4, preset.probeCount),
      probeParallelism: clampInt(source.probeParallelism, 1, 4, preset.probeParallelism),
      includeGeo: typeof source.includeGeo === 'boolean' ? source.includeGeo : preset.includeGeo,
      engineBootWaitMs: clampInt(source.engineBootWaitMs, 200, 4000, preset.engineBootWaitMs),
      adaptiveBudget: source.adaptiveBudget !== false,
      adaptivePressureThreshold: clampRatio(source.adaptivePressureThreshold, 1, 4, DEFAULT_PROXY_BATCH_TEST_STRATEGY.adaptivePressureThreshold),
    };

    if (!normalized.enabled) normalized.maxConcurrency = 1;
    if (normalized.backoffMaxMs < normalized.backoffBaseMs) normalized.backoffMaxMs = normalized.backoffBaseMs;
    if (normalized.probeParallelism > normalized.probeCount) normalized.probeParallelism = normalized.probeCount;
    return normalized;
  }

  function inferProtocolFromNode(node) {
    if (!node || typeof node !== 'object') return 'unknown';
    var url = typeof node.url === 'string' ? node.url : '';
    var match = url.match(/^([a-z][a-z0-9+.-]*):\/\//i);
    if (match && match[1]) return String(match[1]).toLowerCase();
    return 'unknown';
  }

  function sleep(ms) {
    var delayMs = Math.max(0, Number(ms) || 0);
    if (delayMs === 0) return Promise.resolve();
    return new Promise(function (resolve) {
      setTimeout(resolve, delayMs);
    });
  }

  function reorderItemsByProtocol(items, enabled) {
    if (!enabled) {
      return items.map(function (node, idx) {
        return { node: node, originalIndex: idx, protocol: inferProtocolFromNode(node) };
      });
    }

    var buckets = new Map();
    items.forEach(function (node, idx) {
      var protocol = inferProtocolFromNode(node);
      if (!buckets.has(protocol)) buckets.set(protocol, []);
      buckets.get(protocol).push({ node: node, originalIndex: idx, protocol: protocol });
    });

    var orderedProtocols = Array.from(buckets.keys()).sort();
    var out = [];
    orderedProtocols.forEach(function (protocol) {
      var list = buckets.get(protocol) || [];
      list.forEach(function (entry) { out.push(entry); });
    });
    return out;
  }

  function getProtocolState(map, key) {
    var protocolKey = key || 'unknown';
    if (!map.has(protocolKey)) {
      map.set(protocolKey, {
        total: 0,
        failed: 0,
        backoffLevel: 0,
        blockedUntil: 0,
        lastBackoffMs: 0,
      });
    }
    return map.get(protocolKey);
  }

  function updateProtocolState(state, failed, strategy, nowMs) {
    state.total += 1;
    if (failed) state.failed += 1;

    var shouldCheckRatio = state.total >= strategy.minSamplesForBackoff;
    var ratio = shouldCheckRatio ? (state.failed / Math.max(1, state.total)) : 0;
    var canBackoff = strategy.backoffBaseMs > 0 && strategy.backoffMaxMs > 0;

    if (failed && shouldCheckRatio && ratio >= strategy.highFailureRatio && canBackoff) {
      state.backoffLevel = Math.min(8, state.backoffLevel + 1);
      var delay = Math.min(
        strategy.backoffMaxMs,
        strategy.backoffBaseMs * Math.pow(2, Math.max(0, state.backoffLevel - 1))
      );
      state.lastBackoffMs = delay;
      state.blockedUntil = nowMs + delay;
      return;
    }

    if (!failed && state.backoffLevel > 0) {
      state.backoffLevel = Math.max(0, state.backoffLevel - 1);
      if (state.backoffLevel === 0) {
        state.lastBackoffMs = 0;
        state.blockedUntil = 0;
      }
    }
  }

  async function applyProtocolBackoff(state, strategy, nowFn) {
    if (!strategy.perProtocolBackoff) return;
    if (!state || !state.blockedUntil) return;
    var now = nowFn();
    var waitMs = state.blockedUntil - now;
    if (waitMs <= 0) return;
    await sleep(Math.min(waitMs, strategy.backoffMaxMs));
  }

  function toProtocolStatsObject(map) {
    var out = {};
    map.forEach(function (state, key) {
      out[key] = {
        total: state.total,
        failed: state.failed,
        failureRatio: state.total > 0 ? (state.failed / state.total) : 0,
        backoffLevel: state.backoffLevel,
        lastBackoffMs: state.lastBackoffMs,
      };
    });
    return out;
  }

  function estimateSingleItemMs(strategy) {
    var probeCost = strategy.probeTimeoutMs * Math.max(0.35, 0.2 + (strategy.probeCount * 0.18));
    var ipCost = strategy.ipTimeoutMs * 0.45;
    var geoCost = strategy.includeGeo ? strategy.geoTimeoutMs * 0.35 : 0;
    return Math.max(500, strategy.engineBootWaitMs + probeCost + ipCost + geoCost);
  }

  function buildRuntimeOptionsForTask(strategy, summary, protocolState, nowMs) {
    var runtime = {
      profile: strategy.testProfile,
      probeTimeoutMs: strategy.probeTimeoutMs,
      ipTimeoutMs: strategy.ipTimeoutMs,
      geoTimeoutMs: strategy.geoTimeoutMs,
      probeCount: strategy.probeCount,
      probeParallelism: Math.min(strategy.probeParallelism || 1, strategy.probeCount),
      includeGeo: strategy.includeGeo,
      engineBootWaitMs: strategy.engineBootWaitMs,
    };

    var elapsed = Math.max(0, nowMs - summary.startedAt);
    var remaining = Math.max(0, summary.total - summary.completed);
    var budgetLeft = Math.max(0, strategy.budgetMs - elapsed);
    var avgMs = summary.completed > 0 ? (elapsed / summary.completed) : estimateSingleItemMs(strategy);
    var expectedRemainingMs = avgMs * remaining;
    var pressure = budgetLeft > 0 ? (expectedRemainingMs / Math.max(1, budgetLeft)) : (remaining > 0 ? Infinity : 0);

    var heavyFailures = false;
    if (protocolState && protocolState.total >= strategy.minSamplesForBackoff) {
      heavyFailures = (protocolState.failed / Math.max(1, protocolState.total)) >= strategy.highFailureRatio;
    }

    if (strategy.adaptiveBudget && (pressure > strategy.adaptivePressureThreshold || heavyFailures)) {
      var quickPreset = TEST_PROFILE_PRESETS.quick;
      runtime.profile = 'quick';
      runtime.probeTimeoutMs = Math.min(runtime.probeTimeoutMs, quickPreset.probeTimeoutMs);
      runtime.ipTimeoutMs = Math.min(runtime.ipTimeoutMs, quickPreset.ipTimeoutMs);
      runtime.geoTimeoutMs = Math.min(runtime.geoTimeoutMs, quickPreset.geoTimeoutMs);
      runtime.probeCount = Math.min(runtime.probeCount, quickPreset.probeCount);
      runtime.probeParallelism = Math.min(runtime.probeCount, quickPreset.probeParallelism);
      runtime.includeGeo = false;
      runtime.engineBootWaitMs = Math.min(runtime.engineBootWaitMs, quickPreset.engineBootWaitMs);
    }

    if (pressure >= 2) {
      runtime.probeCount = 1;
      runtime.probeParallelism = 1;
      runtime.includeGeo = false;
      runtime.probeTimeoutMs = Math.min(runtime.probeTimeoutMs, 3500);
      runtime.ipTimeoutMs = Math.min(runtime.ipTimeoutMs, 3000);
      runtime.geoTimeoutMs = Math.min(runtime.geoTimeoutMs, 3000);
    }

    runtime.pressure = pressure;
    runtime.budgetLeftMs = budgetLeft;
    runtime.remaining = remaining;
    return runtime;
  }

  function recommendProxyBatchTestStrategy(input, runtime) {
    var source = input && typeof input === 'object' ? input : {};
    var rt = runtime && typeof runtime === 'object' ? runtime : {};
    var nodeCount = clampInt(source.nodeCount, 1, 5000, clampInt(rt.nodeCount, 1, 5000, 100));
    var hardware = detectHardwareConcurrency({ hardwareConcurrency: source.hardwareConcurrency || rt.hardwareConcurrency });
    var expectedFailureRatio = clampRatio(source.expectedFailureRatio, 0, 0.95, 0.3);

    var profile = 'standard';
    if (nodeCount <= 24) profile = 'deep';
    if (nodeCount >= 180) profile = 'quick';
    if (expectedFailureRatio >= 0.6) profile = 'quick';

    var maxConcurrency = Math.max(1, Math.min(8, hardware));
    if (nodeCount <= 24) maxConcurrency = Math.max(1, Math.min(4, maxConcurrency));
    if (expectedFailureRatio >= 0.6) maxConcurrency = Math.max(1, Math.min(maxConcurrency, 6));

    var batchSize = nodeCount <= 40 ? 20 : (nodeCount <= 120 ? 50 : 80);
    var budgetMs = profile === 'quick' ? 180000 : 300000;

    return normalizeProxyBatchTestStrategy({
      testProfile: profile,
      maxConcurrency: maxConcurrency,
      batchSize: batchSize,
      budgetMs: budgetMs,
      backoffBaseMs: expectedFailureRatio >= 0.6 ? 800 : 500,
      backoffMaxMs: expectedFailureRatio >= 0.6 ? 6000 : 4000,
      adaptiveBudget: true,
      adaptivePressureThreshold: expectedFailureRatio >= 0.6 ? 1.05 : 1.2,
      protocolBucketed: true,
    }, {
      hardwareConcurrency: hardware,
      nodeCount: nodeCount,
    });
  }

  async function runProxyBatchTestSchedule(nodes, runOne, strategyInput, runtime) {
    if (typeof runOne !== 'function') throw new Error('runOne must be a function');
    var sourceItems = Array.isArray(nodes) ? nodes.slice() : [];
    var rt = runtime && typeof runtime === 'object' ? runtime : {};
    var nowFn = typeof rt.now === 'function' ? rt.now : function () { return Date.now(); };

    var strategy = normalizeProxyBatchTestStrategy(strategyInput, {
      hardwareConcurrency: rt.hardwareConcurrency,
      nodeCount: sourceItems.length,
    });
    var items = reorderItemsByProtocol(sourceItems, strategy.protocolBucketed);

    var summary = {
      total: items.length,
      completed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      budgetExceeded: false,
      startedAt: nowFn(),
      durationMs: 0,
      strategy: strategy,
      protocolStats: {},
      maxInFlight: 0,
    };
    if (items.length === 0) return summary;

    var protocolState = new Map();
    var batchSize = Math.max(1, strategy.batchSize);
    var totalBatches = Math.ceil(items.length / batchSize);
    var stopByBudget = false;
    var inFlight = 0;

    function shouldStopByBudget() {
      return (nowFn() - summary.startedAt) >= strategy.budgetMs;
    }

    for (var batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
      if (shouldStopByBudget()) {
        stopByBudget = true;
        break;
      }

      var start = batchIndex * batchSize;
      var batch = items.slice(start, start + batchSize);
      var cursor = 0;
      var workerCount = Math.max(1, Math.min(strategy.maxConcurrency, batch.length));

      var worker = async function () {
        while (cursor < batch.length) {
          if (shouldStopByBudget()) {
            stopByBudget = true;
            return;
          }

          var itemIndex = cursor;
          cursor += 1;

          var globalIndex = start + itemIndex;
          var entry = batch[itemIndex];
          var protocol = strategy.perProtocolBackoff ? entry.protocol : '__all__';
          var state = getProtocolState(protocolState, protocol);

          await applyProtocolBackoff(state, strategy, nowFn);
          if (shouldStopByBudget()) {
            stopByBudget = true;
            return;
          }

          var failed = false;
          var result = null;
          var runtimeOptions = buildRuntimeOptionsForTask(strategy, summary, state, nowFn());
          inFlight += 1;
          summary.maxInFlight = Math.max(summary.maxInFlight, inFlight);
          try {
            result = await runOne(entry.node, entry.originalIndex, {
              batchIndex: batchIndex,
              indexInBatch: itemIndex,
              strategy: strategy,
              protocol: protocol,
              runtimeOptions: runtimeOptions,
            });
            failed = !(result && result.ok);
          } catch (err) {
            failed = true;
            result = { ok: false, error: err && err.message ? String(err.message) : String(err || 'error') };
          } finally {
            inFlight = Math.max(0, inFlight - 1);
          }

          summary.completed += 1;
          if (failed) summary.failed += 1;
          else summary.success += 1;

          updateProtocolState(state, failed, strategy, nowFn());

          if (typeof rt.onProgress === 'function') {
            await rt.onProgress({
              completed: summary.completed,
              total: summary.total,
              failed: summary.failed,
              success: summary.success,
              result: result,
              item: entry.node,
              index: entry.originalIndex,
              runtimeOptions: runtimeOptions,
            });
          }

          if (strategy.yieldEvery > 0 && (summary.completed % strategy.yieldEvery) === 0) {
            await sleep(0);
          }
        }
      };

      var workers = [];
      for (var workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
        workers.push(worker());
      }
      await Promise.all(workers);
      if (stopByBudget) break;
    }

    summary.durationMs = Math.max(0, nowFn() - summary.startedAt);
    summary.skipped = Math.max(0, summary.total - summary.completed);
    summary.budgetExceeded = stopByBudget || (summary.skipped > 0 && summary.durationMs >= strategy.budgetMs);
    summary.protocolStats = toProtocolStatsObject(protocolState);
    summary.recommended = recommendProxyBatchTestStrategy({
      nodeCount: summary.total,
      expectedFailureRatio: summary.completed > 0 ? (summary.failed / summary.completed) : 0,
      hardwareConcurrency: rt.hardwareConcurrency,
    }, {
      nodeCount: summary.total,
      hardwareConcurrency: rt.hardwareConcurrency,
    });
    return summary;
  }

  return {
    DEFAULT_PROXY_BATCH_TEST_STRATEGY: DEFAULT_PROXY_BATCH_TEST_STRATEGY,
    TEST_PROFILE_PRESETS: TEST_PROFILE_PRESETS,
    normalizeProxyBatchTestStrategy: normalizeProxyBatchTestStrategy,
    runProxyBatchTestSchedule: runProxyBatchTestSchedule,
    inferProtocolFromNode: inferProtocolFromNode,
    recommendProxyBatchTestStrategy: recommendProxyBatchTestStrategy,
  };
}));

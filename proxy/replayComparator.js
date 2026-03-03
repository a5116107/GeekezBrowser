const REPLAY_REPORT_VERSION = 1;

const REQUIRED_FLOW_STEPS = Object.freeze([
  'parse',
  'capability',
  'engine_start',
  'connectivity_probe',
  'finalize',
]);

const REQUIRED_FORMAT_FIELDS = Object.freeze([
  'id',
  'protocol',
  'engine',
  'status',
  'finalCode',
]);

const ENHANCED_FORMAT_FIELDS = Object.freeze([
  'durationMs',
  'latencyMs',
  'attemptCount',
  'stepCount',
  'probeProfile',
]);

const STEP_ALIASES = Object.freeze({
  http_probe: 'connectivity_probe',
  connectivity: 'connectivity_probe',
  engine_boot: 'engine_start',
});

const PARITY_THRESHOLDS = Object.freeze({
  formatRequiredMin: 0.95,
  flowTimelineMin: 0.9,
  statusParityMin: 0.8,
  speedP95RatioMax: 1.2,
  maxRegressionRate: 0.2,
});

function safeText(input) {
  return String(input == null ? '' : input).trim();
}

function normalizeLabel(label, fallback) {
  const value = safeText(label);
  return value || fallback;
}

function normalizeProtocol(protocol, record) {
  const direct = safeText(protocol).toLowerCase();
  if (direct) return direct;
  const fromUrl = safeText(record && (record.url || record.raw || record.nodeUrl)).toLowerCase();
  const match = fromUrl.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (match && match[1]) return String(match[1]).toLowerCase();
  return 'unknown';
}

function normalizeEngine(engine) {
  const value = safeText(engine).toLowerCase();
  if (!value) return 'unknown';
  if (value === 'singbox') return 'sing-box';
  return value;
}

function normalizeStatus(record) {
  const rawStatus = safeText(record && record.status).toUpperCase();
  if (rawStatus === 'PASS' || rawStatus === 'WARN' || rawStatus === 'FAIL' || rawStatus === 'UNSUPPORTED' || rawStatus === 'NOT_TESTED') {
    return rawStatus;
  }

  if (typeof (record && record.ok) === 'boolean') return record.ok ? 'PASS' : 'FAIL';
  if (typeof (record && record.success) === 'boolean') return record.success ? 'PASS' : 'FAIL';
  if (typeof (record && record.lastTestOk) === 'boolean') return record.lastTestOk ? 'PASS' : 'FAIL';

  if (safeText(record && (record.finalCode || record.code || record.lastTestCode))) return 'FAIL';
  return 'NOT_TESTED';
}

function normalizeFinalCode(record, status) {
  const value = safeText(record && (record.finalCode || record.code || record.lastTestCode));
  if (value) return value;
  if (status === 'PASS' || status === 'WARN') return 'OK';
  if (status === 'NOT_TESTED') return 'NOT_TESTED';
  return 'UNKNOWN';
}

function toNumberOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function normalizeStepName(name) {
  const raw = safeText(name).toLowerCase();
  if (!raw) return '';
  return STEP_ALIASES[raw] || raw;
}

function extractStepNames(record) {
  const steps = Array.isArray(record && record.steps) ? record.steps : [];
  const names = [];
  for (let i = 0; i < steps.length; i += 1) {
    const normalized = normalizeStepName(steps[i] && steps[i].name);
    if (!normalized || names.includes(normalized)) continue;
    names.push(normalized);
  }
  return names;
}

function detectProbeProfile(record) {
  if (record && record.probeProfile && typeof record.probeProfile === 'object') {
    const profile = safeText(record.probeProfile.profile);
    if (profile) return profile;
  }
  const testProfile = safeText(record && (record.testProfile || (record.testOptions && record.testOptions.profile)));
  if (testProfile) return testProfile;
  const steps = Array.isArray(record && record.steps) ? record.steps : [];
  const connectivity = steps.find((step) => normalizeStepName(step && step.name) === 'connectivity_probe');
  const fromMeta = safeText(connectivity && connectivity.meta && connectivity.meta.probeProfile);
  return fromMeta || '';
}

function extractAttemptCount(record) {
  if (Array.isArray(record && record.attempts)) return record.attempts.length;
  const direct = Number(record && (record.attempts || record.attemptCount || record.lastTestAttempts));
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct);
  return 0;
}

function buildKey(record, index) {
  const keyCandidates = [
    safeText(record && (record.key || record.id || record.nodeId)),
    safeText(record && record.remark),
  ].filter(Boolean);
  if (keyCandidates.length > 0) return keyCandidates[0];
  const protocol = normalizeProtocol(record && record.protocol, record);
  return `${protocol}#${index + 1}`;
}

function normalizeReplayRecord(record, index = 0) {
  const status = normalizeStatus(record);
  const stepNames = extractStepNames(record);
  const durationMs = toNumberOrNull(record && (record.durationMs || record.elapsedMs));
  const latencyMs = toNumberOrNull(record && (record.latencyMs || record.latency));
  const protocol = normalizeProtocol(record && (record.protocol || record.urlScheme), record);
  const engine = normalizeEngine(record && (record.engine || record.engineUsed || record.lastTestCore));
  const finalCode = normalizeFinalCode(record, status);
  const probeProfile = detectProbeProfile(record);
  const id = safeText(record && (record.id || record.nodeId));

  return {
    key: buildKey(record, index),
    id,
    protocol,
    engine,
    status,
    finalCode,
    finalMessage: safeText(record && (record.finalMessage || record.error || record.lastTestMsg)),
    durationMs,
    latencyMs,
    attemptCount: extractAttemptCount(record),
    stepNames,
    stepCount: stepNames.length,
    probeProfile,
    tested: status !== 'NOT_TESTED',
    ok: status === 'PASS' || status === 'WARN',
  };
}

function extractReplayRows(dataset) {
  if (Array.isArray(dataset)) return dataset;
  if (!dataset || typeof dataset !== 'object') return [];
  if (Array.isArray(dataset.nodes)) return dataset.nodes;
  if (Array.isArray(dataset.results)) return dataset.results;
  if (Array.isArray(dataset.items)) return dataset.items;
  if (dataset.report && Array.isArray(dataset.report.nodes)) return dataset.report.nodes;
  return [];
}

function percentile(list, q) {
  const values = Array.isArray(list)
    ? list.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
    : [];
  if (values.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, Number(q)));
  const index = Math.floor((values.length - 1) * clamped);
  return values[index];
}

function average(list) {
  const values = Array.isArray(list) ? list.filter((n) => Number.isFinite(n)) : [];
  if (values.length === 0) return null;
  const total = values.reduce((sum, n) => sum + n, 0);
  return Math.round(total / values.length);
}

function ratio(count, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Number((count / total).toFixed(4));
}

function coverageRate(records, predicate) {
  const rows = Array.isArray(records) ? records : [];
  if (rows.length === 0) return 0;
  let hit = 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (predicate(rows[i])) hit += 1;
  }
  return ratio(hit, rows.length);
}

function buildFieldCoverage(records) {
  const rows = Array.isArray(records) ? records : [];
  const required = REQUIRED_FORMAT_FIELDS.map((field) => ({
    field,
    coverage: coverageRate(rows, (row) => {
      if (field === 'id') return Boolean(row.key);
      if (field === 'finalCode') return Boolean(safeText(row.finalCode));
      return Boolean(safeText(row[field]));
    }),
  }));

  const enhanced = ENHANCED_FORMAT_FIELDS.map((field) => ({
    field,
    coverage: coverageRate(rows, (row) => {
      if (field === 'probeProfile') return Boolean(safeText(row.probeProfile));
      if (field === 'stepCount' || field === 'attemptCount') return Number.isFinite(row[field]) && row[field] >= 0;
      return Number.isFinite(row[field]);
    }),
  }));

  return {
    required,
    enhanced,
    requiredAverage: average(required.map((item) => item.coverage)) || 0,
    enhancedAverage: average(enhanced.map((item) => item.coverage)) || 0,
  };
}

function buildFlowCoverage(records) {
  const testedRecords = (Array.isArray(records) ? records : []).filter((record) => record && record.tested);
  const perStep = REQUIRED_FLOW_STEPS.map((step) => ({
    step,
    coverage: coverageRate(testedRecords, (record) => record.stepNames.includes(step)),
  }));

  return {
    testedCount: testedRecords.length,
    requiredSteps: perStep,
    timelineCoverage: coverageRate(
      testedRecords,
      (record) => REQUIRED_FLOW_STEPS.every((step) => record.stepNames.includes(step))
    ),
  };
}

function buildSpeedStats(records) {
  const testedRecords = (Array.isArray(records) ? records : []).filter((record) => record && record.tested);
  const okRecords = testedRecords.filter((record) => record.ok);

  const durationList = testedRecords.map((record) => record.durationMs).filter((n) => Number.isFinite(n));
  const latencyList = okRecords.map((record) => record.latencyMs).filter((n) => Number.isFinite(n));

  return {
    duration: {
      count: durationList.length,
      avgMs: average(durationList),
      p50Ms: percentile(durationList, 0.5),
      p90Ms: percentile(durationList, 0.9),
      p95Ms: percentile(durationList, 0.95),
    },
    latency: {
      count: latencyList.length,
      bestMs: latencyList.length ? Math.min(...latencyList) : null,
      p50Ms: percentile(latencyList, 0.5),
      p90Ms: percentile(latencyList, 0.9),
      p95Ms: percentile(latencyList, 0.95),
    },
  };
}

function buildProtocolBreakdown(records) {
  const rows = Array.isArray(records) ? records : [];
  const map = new Map();
  rows.forEach((row) => {
    const key = safeText(row && row.protocol) || 'unknown';
    if (!map.has(key)) {
      map.set(key, { protocol: key, total: 0, tested: 0, ok: 0, fail: 0 });
    }
    const bucket = map.get(key);
    bucket.total += 1;
    if (row.tested) bucket.tested += 1;
    if (row.ok) bucket.ok += 1;
    if (row.tested && !row.ok) bucket.fail += 1;
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      passRate: item.tested > 0 ? Number((item.ok / item.tested).toFixed(4)) : 0,
    }))
    .sort((a, b) => {
      if (b.tested !== a.tested) return b.tested - a.tested;
      return a.protocol.localeCompare(b.protocol);
    });
}

function normalizeReplayDataset(dataset, options = {}) {
  const rows = extractReplayRows(dataset);
  const normalizedRows = rows.map((record, index) => normalizeReplayRecord(record, index));
  const tested = normalizedRows.filter((row) => row.tested).length;
  const ok = normalizedRows.filter((row) => row.ok).length;
  const failed = normalizedRows.filter((row) => row.tested && !row.ok).length;
  const passRate = tested > 0 ? Number((ok / tested).toFixed(4)) : 0;

  const label =
    normalizeLabel(options.label, '') ||
    normalizeLabel(dataset && dataset.meta && dataset.meta.name, '') ||
    normalizeLabel(dataset && dataset.label, '') ||
    'dataset';

  return {
    label,
    total: normalizedRows.length,
    tested,
    ok,
    failed,
    passRate,
    records: normalizedRows,
    fieldCoverage: buildFieldCoverage(normalizedRows),
    flowCoverage: buildFlowCoverage(normalizedRows),
    speed: buildSpeedStats(normalizedRows),
    protocolBreakdown: buildProtocolBreakdown(normalizedRows),
  };
}

function diffCoverage(baseCoverage, candidateCoverage) {
  const allFields = new Set([
    ...(Array.isArray(baseCoverage) ? baseCoverage.map((item) => item.field) : []),
    ...(Array.isArray(candidateCoverage) ? candidateCoverage.map((item) => item.field) : []),
  ]);
  const baseMap = new Map((baseCoverage || []).map((item) => [item.field, item.coverage]));
  const candMap = new Map((candidateCoverage || []).map((item) => [item.field, item.coverage]));
  return Array.from(allFields)
    .map((field) => {
      const baseline = Number(baseMap.get(field) || 0);
      const candidate = Number(candMap.get(field) || 0);
      return {
        field,
        baseline,
        candidate,
        delta: Number((candidate - baseline).toFixed(4)),
      };
    })
    .sort((a, b) => a.field.localeCompare(b.field));
}

function diffFlowCoverage(baseFlow, candidateFlow) {
  const allSteps = new Set([
    ...((baseFlow && baseFlow.requiredSteps) || []).map((item) => item.step),
    ...((candidateFlow && candidateFlow.requiredSteps) || []).map((item) => item.step),
  ]);
  const baseMap = new Map(((baseFlow && baseFlow.requiredSteps) || []).map((item) => [item.step, item.coverage]));
  const candMap = new Map(((candidateFlow && candidateFlow.requiredSteps) || []).map((item) => [item.step, item.coverage]));
  return Array.from(allSteps)
    .map((step) => {
      const baseline = Number(baseMap.get(step) || 0);
      const candidate = Number(candMap.get(step) || 0);
      return {
        step,
        baseline,
        candidate,
        delta: Number((candidate - baseline).toFixed(4)),
      };
    })
    .sort((a, b) => a.step.localeCompare(b.step));
}

function buildProtocolComparison(baseBreakdown, candidateBreakdown) {
  const all = new Set([
    ...(Array.isArray(baseBreakdown) ? baseBreakdown.map((item) => item.protocol) : []),
    ...(Array.isArray(candidateBreakdown) ? candidateBreakdown.map((item) => item.protocol) : []),
  ]);
  const baseMap = new Map((baseBreakdown || []).map((item) => [item.protocol, item]));
  const candMap = new Map((candidateBreakdown || []).map((item) => [item.protocol, item]));

  return Array.from(all)
    .map((protocol) => {
      const base = baseMap.get(protocol) || { total: 0, tested: 0, ok: 0, fail: 0, passRate: 0 };
      const cand = candMap.get(protocol) || { total: 0, tested: 0, ok: 0, fail: 0, passRate: 0 };
      return {
        protocol,
        baseline: {
          total: base.total,
          tested: base.tested,
          ok: base.ok,
          fail: base.fail,
          passRate: base.passRate,
        },
        candidate: {
          total: cand.total,
          tested: cand.tested,
          ok: cand.ok,
          fail: cand.fail,
          passRate: cand.passRate,
        },
        passRateDelta: Number((Number(cand.passRate || 0) - Number(base.passRate || 0)).toFixed(4)),
      };
    })
    .sort((a, b) => {
      const testedDiff = (b.baseline.tested + b.candidate.tested) - (a.baseline.tested + a.candidate.tested);
      if (testedDiff !== 0) return testedDiff;
      return a.protocol.localeCompare(b.protocol);
    });
}

function describeStatusDelta(fromStatus, toStatus) {
  if (fromStatus === toStatus) return 'UNCHANGED';
  if ((fromStatus === 'PASS' || fromStatus === 'WARN') && !(toStatus === 'PASS' || toStatus === 'WARN')) return 'REGRESSION';
  if (!(fromStatus === 'PASS' || fromStatus === 'WARN') && (toStatus === 'PASS' || toStatus === 'WARN')) return 'IMPROVEMENT';
  return 'CHANGED';
}

function buildMatchedComparison(baseRecords, candidateRecords) {
  const baselineMap = new Map((baseRecords || []).map((record) => [record.key, record]));
  const candidateMap = new Map((candidateRecords || []).map((record) => [record.key, record]));
  const keys = Array.from(new Set([...baselineMap.keys(), ...candidateMap.keys()])).sort();

  const entries = [];
  keys.forEach((key) => {
    const baseline = baselineMap.get(key);
    const candidate = candidateMap.get(key);
    if (!baseline || !candidate) return;
    const statusDelta = describeStatusDelta(baseline.status, candidate.status);
    const durationDeltaMs =
      Number.isFinite(candidate.durationMs) && Number.isFinite(baseline.durationMs)
        ? candidate.durationMs - baseline.durationMs
        : null;
    const latencyDeltaMs =
      Number.isFinite(candidate.latencyMs) && Number.isFinite(baseline.latencyMs)
        ? candidate.latencyMs - baseline.latencyMs
        : null;

    entries.push({
      key,
      id: candidate.id || baseline.id || key,
      protocol: candidate.protocol || baseline.protocol || 'unknown',
      baselineStatus: baseline.status,
      candidateStatus: candidate.status,
      baselineCode: baseline.finalCode,
      candidateCode: candidate.finalCode,
      baselineDurationMs: baseline.durationMs,
      candidateDurationMs: candidate.durationMs,
      durationDeltaMs,
      baselineLatencyMs: baseline.latencyMs,
      candidateLatencyMs: candidate.latencyMs,
      latencyDeltaMs,
      statusDelta,
    });
  });

  const statusUnchanged = entries.filter((entry) => entry.baselineStatus === entry.candidateStatus).length;
  const codeUnchanged = entries.filter((entry) => entry.baselineCode === entry.candidateCode).length;
  const regressions = entries.filter((entry) => entry.statusDelta === 'REGRESSION');
  const improvements = entries.filter((entry) => entry.statusDelta === 'IMPROVEMENT');

  const durationDeltas = entries.map((entry) => entry.durationDeltaMs).filter((n) => Number.isFinite(n));
  const latencyDeltas = entries.map((entry) => entry.latencyDeltaMs).filter((n) => Number.isFinite(n));

  return {
    count: entries.length,
    statusParityRate: entries.length > 0 ? Number((statusUnchanged / entries.length).toFixed(4)) : 0,
    codeParityRate: entries.length > 0 ? Number((codeUnchanged / entries.length).toFixed(4)) : 0,
    regressions: regressions.length,
    improvements: improvements.length,
    entries,
    topRegressions: regressions
      .slice()
      .sort((a, b) => {
        const durA = Number.isFinite(a.durationDeltaMs) ? a.durationDeltaMs : Number.POSITIVE_INFINITY;
        const durB = Number.isFinite(b.durationDeltaMs) ? b.durationDeltaMs : Number.POSITIVE_INFINITY;
        if (durB !== durA) return durB - durA;
        return a.key.localeCompare(b.key);
      })
      .slice(0, 20),
    topImprovements: improvements
      .slice()
      .sort((a, b) => {
        const durA = Number.isFinite(a.durationDeltaMs) ? a.durationDeltaMs : Number.NEGATIVE_INFINITY;
        const durB = Number.isFinite(b.durationDeltaMs) ? b.durationDeltaMs : Number.NEGATIVE_INFINITY;
        if (durA !== durB) return durA - durB;
        return a.key.localeCompare(b.key);
      })
      .slice(0, 20),
    durationDelta: {
      count: durationDeltas.length,
      avgMs: average(durationDeltas),
      p50Ms: percentile(durationDeltas, 0.5),
      p90Ms: percentile(durationDeltas, 0.9),
      p95Ms: percentile(durationDeltas, 0.95),
      fasterCount: durationDeltas.filter((n) => n < 0).length,
      slowerCount: durationDeltas.filter((n) => n > 0).length,
    },
    latencyDelta: {
      count: latencyDeltas.length,
      avgMs: average(latencyDeltas),
      p50Ms: percentile(latencyDeltas, 0.5),
      p90Ms: percentile(latencyDeltas, 0.9),
      p95Ms: percentile(latencyDeltas, 0.95),
      fasterCount: latencyDeltas.filter((n) => n < 0).length,
      slowerCount: latencyDeltas.filter((n) => n > 0).length,
    },
  };
}

function clampScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return Math.round(num);
}

function safeRatio(numerator, denominator) {
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  if (!Number.isFinite(numerator) || numerator < 0) return null;
  return Number((numerator / denominator).toFixed(4));
}

function buildParitySummary({ baseline, candidate, matched }) {
  const baseRequired = Number(baseline && baseline.fieldCoverage && baseline.fieldCoverage.requiredAverage) || 0;
  const candRequired = Number(candidate && candidate.fieldCoverage && candidate.fieldCoverage.requiredAverage) || 0;
  const formatTarget = Math.max(PARITY_THRESHOLDS.formatRequiredMin, baseRequired);
  const formatPass = candRequired >= formatTarget;
  const formatScore = clampScore(candRequired * 100);

  const baseFlow = Number(baseline && baseline.flowCoverage && baseline.flowCoverage.timelineCoverage) || 0;
  const candFlow = Number(candidate && candidate.flowCoverage && candidate.flowCoverage.timelineCoverage) || 0;
  const flowTarget = Math.max(PARITY_THRESHOLDS.flowTimelineMin, baseFlow);
  const flowPass = candFlow >= flowTarget;
  const flowScore = clampScore(candFlow * 100);

  const statusParityRate = Number(matched && matched.statusParityRate) || 0;
  const stabilityTarget = PARITY_THRESHOLDS.statusParityMin;
  const regressionRate = safeRatio(Number(matched && matched.regressions) || 0, Number(matched && matched.count) || 0) || 0;
  const stabilityPass = statusParityRate >= stabilityTarget && regressionRate <= PARITY_THRESHOLDS.maxRegressionRate;
  const stabilityScore = clampScore((statusParityRate * 0.8 + (1 - regressionRate) * 0.2) * 100);

  const baseP95 = Number(baseline && baseline.speed && baseline.speed.duration && baseline.speed.duration.p95Ms);
  const candP95 = Number(candidate && candidate.speed && candidate.speed.duration && candidate.speed.duration.p95Ms);
  const speedRatio = safeRatio(candP95, baseP95);
  const speedPass = speedRatio == null ? true : speedRatio <= PARITY_THRESHOLDS.speedP95RatioMax;
  let speedScore = 100;
  if (speedRatio != null) {
    const normalized = Math.max(0, 1 - Math.max(0, speedRatio - 1));
    speedScore = clampScore(normalized * 100);
  }

  const overallScore = clampScore((formatScore + flowScore + stabilityScore + speedScore) / 4);
  const gatePass = formatPass && flowPass && stabilityPass && speedPass;

  return {
    gatePass,
    overallScore,
    thresholds: PARITY_THRESHOLDS,
    dimensions: {
      format: {
        pass: formatPass,
        score: formatScore,
        baseline: baseRequired,
        candidate: candRequired,
        target: formatTarget,
      },
      flow: {
        pass: flowPass,
        score: flowScore,
        baseline: baseFlow,
        candidate: candFlow,
        target: flowTarget,
      },
      stability: {
        pass: stabilityPass,
        score: stabilityScore,
        statusParityRate,
        regressionRate,
        target: stabilityTarget,
      },
      speed: {
        pass: speedPass,
        score: speedScore,
        baselineP95Ms: Number.isFinite(baseP95) ? baseP95 : null,
        candidateP95Ms: Number.isFinite(candP95) ? candP95 : null,
        p95Ratio: speedRatio,
        targetRatio: PARITY_THRESHOLDS.speedP95RatioMax,
      },
    },
  };
}

function buildReplayComparisonReport({
  baseline,
  candidate,
  baselineLabel = 'baseline',
  candidateLabel = 'candidate',
} = {}) {
  const left = normalizeReplayDataset(baseline, { label: baselineLabel });
  const right = normalizeReplayDataset(candidate, { label: candidateLabel });
  const matched = buildMatchedComparison(left.records, right.records);
  const paritySummary = buildParitySummary({ baseline: left, candidate: right, matched });

  return {
    version: REPLAY_REPORT_VERSION,
    generatedAt: Date.now(),
    baseline: left,
    candidate: right,
    matched,
    paritySummary,
    protocolComparison: buildProtocolComparison(left.protocolBreakdown, right.protocolBreakdown),
    formatCoverageDiff: {
      required: diffCoverage(left.fieldCoverage.required, right.fieldCoverage.required),
      enhanced: diffCoverage(left.fieldCoverage.enhanced, right.fieldCoverage.enhanced),
      requiredAverageDelta: Number((right.fieldCoverage.requiredAverage - left.fieldCoverage.requiredAverage).toFixed(4)),
      enhancedAverageDelta: Number((right.fieldCoverage.enhancedAverage - left.fieldCoverage.enhancedAverage).toFixed(4)),
    },
    flowCoverageDiff: {
      requiredSteps: diffFlowCoverage(left.flowCoverage, right.flowCoverage),
      timelineCoverageDelta: Number((right.flowCoverage.timelineCoverage - left.flowCoverage.timelineCoverage).toFixed(4)),
    },
  };
}

function fmtPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${(n * 100).toFixed(1)}%`;
}

function fmtMs(value) {
  if (!Number.isFinite(value)) return '-';
  return `${Math.round(value)}ms`;
}

function toReplayComparisonMarkdown(report) {
  const r = report && typeof report === 'object' ? report : {};
  const baseline = r.baseline || { label: 'baseline' };
  const candidate = r.candidate || { label: 'candidate' };
  const matched = r.matched || {};
  const formatDiff = r.formatCoverageDiff || {};
  const flowDiff = r.flowCoverageDiff || {};
  const protocolComparison = Array.isArray(r.protocolComparison) ? r.protocolComparison : [];
  const paritySummary = r.paritySummary || {};
  const parityDimensions = paritySummary.dimensions || {};

  const lines = [];
  lines.push('# Proxy Replay Compare Report');
  lines.push('');
  lines.push(`- GeneratedAt: ${new Date(r.generatedAt || Date.now()).toISOString()}`);
  lines.push(`- Baseline: ${baseline.label || 'baseline'}`);
  lines.push(`- Candidate: ${candidate.label || 'candidate'}`);
  lines.push('');

  lines.push('## 总览');
  lines.push('');
  lines.push(`- 匹配样本: ${matched.count || 0}`);
  lines.push(`- 状态一致率: ${fmtPercent(matched.statusParityRate)}`);
  lines.push(`- 失败回归数: ${matched.regressions || 0}`);
  lines.push(`- 改善数: ${matched.improvements || 0}`);
  lines.push('');

  lines.push('## 对标门禁');
  lines.push('');
  lines.push(`- Gate: ${paritySummary.gatePass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Overall Score: ${Number.isFinite(paritySummary.overallScore) ? paritySummary.overallScore : '-'}`);
  lines.push('| Dimension | Pass | Score | Baseline | Candidate | Target |');
  lines.push('|---|---|---:|---:|---:|---:|');
  lines.push(
    `| format | ${parityDimensions.format && parityDimensions.format.pass ? 'Y' : 'N'} | ${parityDimensions.format && Number.isFinite(parityDimensions.format.score) ? parityDimensions.format.score : '-'} | ${fmtPercent(parityDimensions.format && parityDimensions.format.baseline)} | ${fmtPercent(parityDimensions.format && parityDimensions.format.candidate)} | ${fmtPercent(parityDimensions.format && parityDimensions.format.target)} |`
  );
  lines.push(
    `| flow | ${parityDimensions.flow && parityDimensions.flow.pass ? 'Y' : 'N'} | ${parityDimensions.flow && Number.isFinite(parityDimensions.flow.score) ? parityDimensions.flow.score : '-'} | ${fmtPercent(parityDimensions.flow && parityDimensions.flow.baseline)} | ${fmtPercent(parityDimensions.flow && parityDimensions.flow.candidate)} | ${fmtPercent(parityDimensions.flow && parityDimensions.flow.target)} |`
  );
  lines.push(
    `| stability | ${parityDimensions.stability && parityDimensions.stability.pass ? 'Y' : 'N'} | ${parityDimensions.stability && Number.isFinite(parityDimensions.stability.score) ? parityDimensions.stability.score : '-'} | ${fmtPercent(parityDimensions.stability && parityDimensions.stability.target)} | ${fmtPercent(parityDimensions.stability && parityDimensions.stability.statusParityRate)} | ${fmtPercent(parityDimensions.stability && parityDimensions.stability.regressionRate)} |`
  );
  lines.push(
    `| speed(p95 ratio) | ${parityDimensions.speed && parityDimensions.speed.pass ? 'Y' : 'N'} | ${parityDimensions.speed && Number.isFinite(parityDimensions.speed.score) ? parityDimensions.speed.score : '-'} | ${fmtMs(parityDimensions.speed && parityDimensions.speed.baselineP95Ms)} | ${fmtMs(parityDimensions.speed && parityDimensions.speed.candidateP95Ms)} | ${parityDimensions.speed && Number.isFinite(parityDimensions.speed.targetRatio) ? parityDimensions.speed.targetRatio.toFixed(2) : '-'} |`
  );
  lines.push('');

  lines.push('## 展示格式对标');
  lines.push('');
  lines.push(`- 必填字段覆盖均值变化: ${fmtPercent(formatDiff.requiredAverageDelta)}`);
  lines.push(`- 增强字段覆盖均值变化: ${fmtPercent(formatDiff.enhancedAverageDelta)}`);
  lines.push('');
  lines.push('| Field | Baseline | Candidate | Delta |');
  lines.push('|---|---:|---:|---:|');
  (formatDiff.required || []).forEach((item) => {
    lines.push(`| ${item.field} | ${fmtPercent(item.baseline)} | ${fmtPercent(item.candidate)} | ${fmtPercent(item.delta)} |`);
  });
  (formatDiff.enhanced || []).forEach((item) => {
    lines.push(`| ${item.field}* | ${fmtPercent(item.baseline)} | ${fmtPercent(item.candidate)} | ${fmtPercent(item.delta)} |`);
  });
  lines.push('');

  lines.push('## 速度对标');
  lines.push('');
  lines.push(`- Duration 中位变化: ${fmtMs(matched.durationDelta && matched.durationDelta.p50Ms)}`);
  lines.push(`- Duration p95 变化: ${fmtMs(matched.durationDelta && matched.durationDelta.p95Ms)}`);
  lines.push(`- Latency 中位变化: ${fmtMs(matched.latencyDelta && matched.latencyDelta.p50Ms)}`);
  lines.push(`- Latency p95 变化: ${fmtMs(matched.latencyDelta && matched.latencyDelta.p95Ms)}`);
  lines.push(`- 更快样本数(Duration): ${(matched.durationDelta && matched.durationDelta.fasterCount) || 0}`);
  lines.push(`- 更慢样本数(Duration): ${(matched.durationDelta && matched.durationDelta.slowerCount) || 0}`);
  lines.push('');

  lines.push('## 流程对标');
  lines.push('');
  lines.push(`- 全流程覆盖变化: ${fmtPercent(flowDiff.timelineCoverageDelta)}`);
  lines.push('| Step | Baseline | Candidate | Delta |');
  lines.push('|---|---:|---:|---:|');
  (flowDiff.requiredSteps || []).forEach((item) => {
    lines.push(`| ${item.step} | ${fmtPercent(item.baseline)} | ${fmtPercent(item.candidate)} | ${fmtPercent(item.delta)} |`);
  });
  lines.push('');

  lines.push('## 协议维度对照');
  lines.push('');
  lines.push('| Protocol | Baseline PassRate | Candidate PassRate | Delta |');
  lines.push('|---|---:|---:|---:|');
  protocolComparison.forEach((item) => {
    lines.push(
      `| ${item.protocol} | ${fmtPercent(item.baseline && item.baseline.passRate)} | ${fmtPercent(item.candidate && item.candidate.passRate)} | ${fmtPercent(item.passRateDelta)} |`
    );
  });
  lines.push('');

  lines.push('## Top 回归');
  lines.push('');
  if (Array.isArray(matched.topRegressions) && matched.topRegressions.length > 0) {
    lines.push('| Key | Protocol | Baseline | Candidate | Code(B->C) | DurationΔ | LatencyΔ |');
    lines.push('|---|---|---|---|---|---:|---:|');
    matched.topRegressions.forEach((item) => {
      lines.push(
        `| ${item.key} | ${item.protocol} | ${item.baselineStatus} | ${item.candidateStatus} | ${item.baselineCode} -> ${item.candidateCode} | ${fmtMs(item.durationDeltaMs)} | ${fmtMs(item.latencyDeltaMs)} |`
      );
    });
  } else {
    lines.push('- 无');
  }
  lines.push('');

  lines.push('## Top 改善');
  lines.push('');
  if (Array.isArray(matched.topImprovements) && matched.topImprovements.length > 0) {
    lines.push('| Key | Protocol | Baseline | Candidate | Code(B->C) | DurationΔ | LatencyΔ |');
    lines.push('|---|---|---|---|---|---:|---:|');
    matched.topImprovements.forEach((item) => {
      lines.push(
        `| ${item.key} | ${item.protocol} | ${item.baselineStatus} | ${item.candidateStatus} | ${item.baselineCode} -> ${item.candidateCode} | ${fmtMs(item.durationDeltaMs)} | ${fmtMs(item.latencyDeltaMs)} |`
      );
    });
  } else {
    lines.push('- 无');
  }
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  REPLAY_REPORT_VERSION,
  PARITY_THRESHOLDS,
  REQUIRED_FLOW_STEPS,
  REQUIRED_FORMAT_FIELDS,
  ENHANCED_FORMAT_FIELDS,
  normalizeReplayDataset,
  buildReplayComparisonReport,
  toReplayComparisonMarkdown,
};

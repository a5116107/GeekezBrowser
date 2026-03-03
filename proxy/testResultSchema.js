const SCHEMA_VERSION = 1;

const STEP_NAMES = Object.freeze([
  'parse',
  'capability',
  'engine_start',
  'connectivity_probe',
  'ip_probe',
  'geo_probe',
  'finalize',
]);

function nowMs() {
  return Date.now();
}

function createStep(name, meta = undefined) {
  return {
    name: String(name || '').trim() || 'unknown',
    ok: false,
    code: '',
    message: '',
    startAt: nowMs(),
    endAt: 0,
    durationMs: 0,
    meta: meta && typeof meta === 'object' ? meta : undefined,
  };
}

function finishStep(step, { ok, code, message, meta } = {}) {
  const target = step && typeof step === 'object' ? step : createStep('unknown');
  const endAt = nowMs();
  target.endAt = endAt;
  target.durationMs = Math.max(0, endAt - (target.startAt || endAt));
  target.ok = Boolean(ok);
  target.code = code ? String(code) : (target.ok ? 'OK' : 'UNKNOWN');
  target.message = message ? String(message) : '';
  if (meta && typeof meta === 'object') {
    target.meta = { ...(target.meta || {}), ...meta };
  }
  return target;
}

function createProxyTestResultBase({
  startedAt = nowMs(),
  protocol = 'unknown',
  primaryEngine = '',
  enginePlan = [],
  capability = {},
  traceId = '',
} = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    traceId: traceId ? String(traceId) : '',
    protocol: protocol ? String(protocol) : 'unknown',
    primaryEngine: primaryEngine ? String(primaryEngine) : '',
    enginePlan: Array.isArray(enginePlan) ? enginePlan : [],
    capability: capability && typeof capability === 'object' ? capability : {},
    testProfile: 'standard',
    testOptions: {},

    success: false,
    ok: false,
    startedAt: Number.isFinite(startedAt) ? startedAt : nowMs(),
    durationMs: 0,

    engine: '',
    connectivity: null,
    latencyMs: null,
    ip: null,
    geo: null,

    finalCode: '',
    finalMessage: '',
    code: '',
    error: '',

    attempts: [],
    steps: [],
  };
}

function appendStep(result, step) {
  if (!result || typeof result !== 'object') return result;
  if (!Array.isArray(result.steps)) result.steps = [];
  if (step && typeof step === 'object') result.steps.push(step);
  return result;
}

function appendAttempt(result, attempt) {
  if (!result || typeof result !== 'object') return result;
  if (!Array.isArray(result.attempts)) result.attempts = [];
  if (attempt && typeof attempt === 'object') result.attempts.push(attempt);
  return result;
}

function finalizeProxyTestResult(result, patch = {}) {
  const r = result && typeof result === 'object' ? result : createProxyTestResultBase();
  Object.assign(r, patch || {});
  const endAt = nowMs();
  r.durationMs = Math.max(0, endAt - (r.startedAt || endAt));
  r.success = Boolean(r.ok);
  if (!r.finalCode) r.finalCode = r.code || (r.ok ? 'OK' : 'UNKNOWN');
  if (!r.code) r.code = r.finalCode;
  if (!r.finalMessage) r.finalMessage = r.error || '';
  return r;
}

function normalizeProxyTestResult(result) {
  const r = createProxyTestResultBase(result || {});
  Object.assign(r, result || {});
  if (!Array.isArray(r.steps)) r.steps = [];
  if (!Array.isArray(r.attempts)) r.attempts = [];
  if (!r.testProfile) r.testProfile = 'standard';
  if (!r.testOptions || typeof r.testOptions !== 'object') r.testOptions = {};
  if (!r.finalCode) r.finalCode = r.code || (r.ok ? 'OK' : 'UNKNOWN');
  if (!r.code) r.code = r.finalCode;
  return r;
}

function validateProxyTestResult(result) {
  const errors = [];
  if (!result || typeof result !== 'object') return { ok: false, errors: ['result must be object'] };
  if (typeof result.schemaVersion !== 'number') errors.push('schemaVersion must be number');
  if (typeof result.protocol !== 'string' || !result.protocol) errors.push('protocol must be non-empty string');
  if (!Array.isArray(result.steps)) errors.push('steps must be array');
  if (!Array.isArray(result.attempts)) errors.push('attempts must be array');
  if (typeof result.ok !== 'boolean') errors.push('ok must be boolean');
  if (typeof result.code !== 'string' || !result.code) errors.push('code must be non-empty string');
  return { ok: errors.length === 0, errors };
}

module.exports = {
  SCHEMA_VERSION,
  STEP_NAMES,
  createStep,
  finishStep,
  createProxyTestResultBase,
  appendStep,
  appendAttempt,
  finalizeProxyTestResult,
  normalizeProxyTestResult,
  validateProxyTestResult,
};

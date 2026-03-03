/* eslint-disable no-console */
const assert = require('assert');
const {
  createStep,
  finishStep,
  createProxyTestResultBase,
  appendStep,
  appendAttempt,
  finalizeProxyTestResult,
  normalizeProxyTestResult,
  validateProxyTestResult,
} = require('../proxy/testResultSchema');
const { PROXY_TEST_ERROR_CODES, codeFromConnectivity, codeFromException } = require('../proxy/testErrorCodes');

function testSchemaBasics() {
  const base = createProxyTestResultBase({
    protocol: 'vless',
    primaryEngine: 'xray',
    enginePlan: ['xray', 'sing-box'],
    capability: { xray: true, singbox: true },
    traceId: 'abc12345',
  });

  const parseStep = createStep('parse');
  appendStep(base, finishStep(parseStep, { ok: true, code: PROXY_TEST_ERROR_CODES.OK, message: 'ok' }));
  appendAttempt(base, { engine: 'xray', ok: false, code: PROXY_TEST_ERROR_CODES.PROBE_TIMEOUT, message: 'timeout' });

  const finalized = finalizeProxyTestResult(base, {
    ok: false,
    code: PROXY_TEST_ERROR_CODES.PROBE_TIMEOUT,
    finalCode: PROXY_TEST_ERROR_CODES.PROBE_TIMEOUT,
    finalMessage: 'timeout',
    error: 'timeout',
    testProfile: 'quick',
    testOptions: { profile: 'quick', probeTimeoutMs: 4500 },
  });

  const normalized = normalizeProxyTestResult(finalized);
  const check = validateProxyTestResult(normalized);
  assert.strictEqual(check.ok, true, `schema should be valid: ${JSON.stringify(check.errors)}`);
  assert.strictEqual(normalized.protocol, 'vless');
  assert.strictEqual(normalized.testProfile, 'quick');
  assert.strictEqual(normalized.steps.length, 1);
  assert.strictEqual(normalized.attempts.length, 1);
}

function testErrorCodeMapping() {
  assert.strictEqual(codeFromConnectivity({ ok: true }), PROXY_TEST_ERROR_CODES.OK);
  assert.strictEqual(codeFromConnectivity({ ok: false, error: 'Timeout' }), PROXY_TEST_ERROR_CODES.PROBE_TIMEOUT);
  assert.strictEqual(codeFromConnectivity({ ok: false, error: 'HTTP 403' }), PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_403);
  assert.strictEqual(codeFromConnectivity({ ok: false, error: 'EOF' }), PROXY_TEST_ERROR_CODES.HANDSHAKE_EOF);

  assert.strictEqual(
    codeFromException({ code: 'PROXY_ENGINE_EXITED_EARLY', message: 'exited' }),
    PROXY_TEST_ERROR_CODES.ENGINE_EXITED_EARLY
  );
  assert.strictEqual(
    codeFromException({ code: 'PROXY_TEST_UNSUPPORTED_PROTOCOL', message: 'unsupported protocol' }),
    PROXY_TEST_ERROR_CODES.CAPABILITY_UNSUPPORTED_PROTOCOL
  );
}

function main() {
  testSchemaBasics();
  testErrorCodeMapping();
  console.log('[ok] proxy test schema/error-code regression passed');
}

main();

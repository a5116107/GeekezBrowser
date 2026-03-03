const PROXY_TEST_ERROR_CODES = Object.freeze({
  OK: 'OK',

  PARSE_EMPTY: 'PARSE_EMPTY',
  PARSE_INVALID: 'PARSE_INVALID',

  CAPABILITY_UNSUPPORTED_PROTOCOL: 'CAPABILITY_UNSUPPORTED_PROTOCOL',

  ENGINE_START_FAILED: 'ENGINE_START_FAILED',
  ENGINE_EXITED_EARLY: 'ENGINE_EXITED_EARLY',

  HANDSHAKE_EOF: 'HANDSHAKE_EOF',
  HANDSHAKE_HTTP_400: 'HANDSHAKE_HTTP_400',
  HANDSHAKE_HTTP_403: 'HANDSHAKE_HTTP_403',
  HANDSHAKE_HTTP_502: 'HANDSHAKE_HTTP_502',

  PROBE_TIMEOUT: 'PROBE_TIMEOUT',
  PROBE_HTTP_STATUS: 'PROBE_HTTP_STATUS',
  PROBE_CONNECTIVITY_FAILED: 'PROBE_CONNECTIVITY_FAILED',

  IP_GEO_UNAVAILABLE: 'IP_GEO_UNAVAILABLE',

  UNKNOWN: 'UNKNOWN',
});

function textIncludes(text, token) {
  return String(text || '').toLowerCase().includes(String(token || '').toLowerCase());
}

function normalizeConnectivityError(connectivity) {
  if (!connectivity || typeof connectivity !== 'object') return '';
  return String(connectivity.error || '').trim();
}

function codeFromConnectivity(connectivity) {
  if (connectivity && connectivity.ok) return PROXY_TEST_ERROR_CODES.OK;
  const err = normalizeConnectivityError(connectivity);
  if (!err) return PROXY_TEST_ERROR_CODES.PROBE_CONNECTIVITY_FAILED;
  if (textIncludes(err, 'timeout')) return PROXY_TEST_ERROR_CODES.PROBE_TIMEOUT;
  if (textIncludes(err, 'http 400')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_400;
  if (textIncludes(err, 'http 403')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_403;
  if (textIncludes(err, 'http 502')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_502;
  if (textIncludes(err, 'eof')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_EOF;
  if (textIncludes(err, 'http ')) return PROXY_TEST_ERROR_CODES.PROBE_HTTP_STATUS;
  return PROXY_TEST_ERROR_CODES.PROBE_CONNECTIVITY_FAILED;
}

function codeFromException(err, fallback = PROXY_TEST_ERROR_CODES.UNKNOWN) {
  const rawCode = err && err.code ? String(err.code) : '';
  if (rawCode === 'PROXY_LINK_EMPTY' || rawCode === 'PROXY_TEST_EMPTY') return PROXY_TEST_ERROR_CODES.PARSE_EMPTY;
  if (rawCode === 'PROXY_SOCKS_URL_INVALID' || rawCode === 'PROXY_TEST_FORMAT_ERR') return PROXY_TEST_ERROR_CODES.PARSE_INVALID;
  if (rawCode === 'PROXY_TEST_UNSUPPORTED_PROTOCOL') return PROXY_TEST_ERROR_CODES.CAPABILITY_UNSUPPORTED_PROTOCOL;
  if (rawCode === 'PROXY_ENGINE_EXITED_EARLY') return PROXY_TEST_ERROR_CODES.ENGINE_EXITED_EARLY;

  const msg = String((err && err.message) || '').trim();
  if (!msg) return fallback;
  if (textIncludes(msg, 'unsupported protocol')) return PROXY_TEST_ERROR_CODES.CAPABILITY_UNSUPPORTED_PROTOCOL;
  if (textIncludes(msg, 'timeout')) return PROXY_TEST_ERROR_CODES.PROBE_TIMEOUT;
  if (textIncludes(msg, 'http 400')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_400;
  if (textIncludes(msg, 'http 403')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_403;
  if (textIncludes(msg, 'http 502')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_HTTP_502;
  if (textIncludes(msg, 'eof')) return PROXY_TEST_ERROR_CODES.HANDSHAKE_EOF;
  if (textIncludes(msg, 'format err') || textIncludes(msg, 'invalid')) return PROXY_TEST_ERROR_CODES.PARSE_INVALID;
  return fallback;
}

module.exports = {
  PROXY_TEST_ERROR_CODES,
  codeFromConnectivity,
  codeFromException,
};


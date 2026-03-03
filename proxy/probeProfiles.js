function okStatus204(statusCode) {
  return statusCode === 204;
}

function okStatus2xx3xx(statusCode) {
  return Number.isFinite(statusCode) && statusCode >= 200 && statusCode < 400;
}

const PROBE_CATALOG = Object.freeze({
  cf_http_204: Object.freeze({
    id: 'cf_http_204',
    url: 'http://cp.cloudflare.com/generate_204',
    expected: '204',
    okStatus: okStatus204,
  }),
  gstatic_http_204: Object.freeze({
    id: 'gstatic_http_204',
    url: 'http://www.gstatic.com/generate_204',
    expected: '204',
    okStatus: okStatus204,
  }),
  gstatic_connectivity_http_204: Object.freeze({
    id: 'gstatic_connectivity_http_204',
    url: 'http://connectivitycheck.gstatic.com/generate_204',
    expected: '204',
    okStatus: okStatus204,
  }),
  msft_http_txt: Object.freeze({
    id: 'msft_http_txt',
    url: 'http://www.msftconnecttest.com/connecttest.txt',
    expected: '200-399',
    okStatus: okStatus2xx3xx,
  }),
  cf_https_204: Object.freeze({
    id: 'cf_https_204',
    url: 'https://cp.cloudflare.com/generate_204',
    expected: '204',
    okStatus: okStatus204,
  }),
  gstatic_https_204: Object.freeze({
    id: 'gstatic_https_204',
    url: 'https://www.gstatic.com/generate_204',
    expected: '204',
    okStatus: okStatus204,
  }),
});

const PROTOCOL_ALIASES = Object.freeze({
  hy: 'hysteria',
  hy2: 'hysteria2',
  shadowsocks: 'ss',
});

const PROFILE_IDS_BY_PROTOCOL = Object.freeze({
  default: Object.freeze(['cf_http_204', 'gstatic_http_204', 'gstatic_connectivity_http_204', 'msft_http_txt']),
  vmess: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  vless: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  trojan: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  ss: Object.freeze(['cf_http_204', 'gstatic_http_204', 'gstatic_connectivity_http_204', 'msft_http_txt']),
  sb: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  hysteria: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  hysteria2: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  tuic: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'gstatic_http_204']),
  socks: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'msft_http_txt']),
  socks5: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'msft_http_txt']),
  socks5h: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'msft_http_txt']),
  http: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'msft_http_txt']),
  https: Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'msft_http_txt']),
  'legacy-hostport': Object.freeze(['cf_https_204', 'gstatic_https_204', 'cf_http_204', 'msft_http_txt']),
});

function normalizeProtocol(input) {
  const value = String(input || '').trim().toLowerCase();
  if (!value) return 'unknown';
  return PROTOCOL_ALIASES[value] || value;
}

function normalizeTestProfile(input) {
  const value = String(input || '').trim().toLowerCase();
  if (value === 'quick' || value === 'standard' || value === 'deep') return value;
  return 'standard';
}

function uniquePush(target, value) {
  if (!target.includes(value)) target.push(value);
}

function resolveProbeIdsForProtocol(protocol, testProfile = 'standard') {
  const normalizedProtocol = normalizeProtocol(protocol);
  const normalizedProfile = normalizeTestProfile(testProfile);
  const base = PROFILE_IDS_BY_PROTOCOL[normalizedProtocol] || PROFILE_IDS_BY_PROTOCOL.default;
  const probeIds = [];

  base.forEach((id) => uniquePush(probeIds, id));

  if (normalizedProfile === 'deep') {
    PROFILE_IDS_BY_PROTOCOL.default.forEach((id) => uniquePush(probeIds, id));
  }

  if (normalizedProfile === 'quick') {
    return probeIds.slice(0, 2);
  }

  return probeIds;
}

function resolveProbeProfile(protocol, options = {}) {
  const normalizedProtocol = normalizeProtocol(protocol);
  const profile = normalizeTestProfile(options.profile || options.testProfile);
  const ids = resolveProbeIdsForProtocol(normalizedProtocol, profile);
  const probes = ids
    .map((id) => PROBE_CATALOG[id])
    .filter(Boolean)
    .map((probe) => ({
      id: probe.id,
      url: probe.url,
      expected: probe.expected,
      okStatus: probe.okStatus,
    }));

  return {
    protocol: normalizedProtocol,
    profile,
    ids,
    probes,
  };
}

function clampInt(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const rounded = Math.round(num);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function limitProbeCount(probes, count) {
  const list = Array.isArray(probes) ? probes : [];
  if (list.length === 0) return [];
  const safeCount = clampInt(count, 1, list.length, list.length);
  return list.slice(0, safeCount);
}

function getDefaultConnectivityProbes() {
  return resolveProbeProfile('default', { profile: 'standard' }).probes;
}

function getMaxConnectivityProbeCount() {
  return getDefaultConnectivityProbes().length;
}

module.exports = {
  PROBE_CATALOG,
  resolveProbeProfile,
  limitProbeCount,
  getDefaultConnectivityProbes,
  getMaxConnectivityProbeCount,
  normalizeProtocol,
  normalizeTestProfile,
};

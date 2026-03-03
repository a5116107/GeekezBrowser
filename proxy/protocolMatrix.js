const { normalizeProxyInputRaw } = require('./proxySpec');

const ENGINE_XRAY = 'xray';
const ENGINE_SINGBOX = 'sing-box';

const PROTOCOL_ALIASES = Object.freeze({
  hy: 'hysteria',
  hy2: 'hysteria2',
  shadowsocks: 'ss',
  'shadow-tls': 'shadowtls',
  wg: 'wireguard',
  'naive+https': 'naive',
});

const PROTOCOL_CAPABILITY_MATRIX = Object.freeze({
  unknown: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: false }),
    engineSupport: Object.freeze({ xray: false, singBox: false }),
    probeSupport: Object.freeze({ xray: false, singBox: false }),
    preferredEngine: Object.freeze({ test: '', runtime: '' }),
    reason: 'Unsupported protocol',
  }),
  'legacy-hostport': Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: false }),
    engineSupport: Object.freeze({ xray: true, singBox: false }),
    probeSupport: Object.freeze({ xray: true, singBox: false }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  vmess: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  vless: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  trojan: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  ss: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  socks: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  socks5: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  socks5h: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  http: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  https: Object.freeze({
    parserSupport: Object.freeze({ xray: true, singBox: true }),
    engineSupport: Object.freeze({ xray: true, singBox: true }),
    probeSupport: Object.freeze({ xray: true, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_XRAY, runtime: ENGINE_XRAY }),
    reason: '',
  }),
  sb: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: true }),
    engineSupport: Object.freeze({ xray: false, singBox: true }),
    probeSupport: Object.freeze({ xray: false, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_SINGBOX, runtime: ENGINE_SINGBOX }),
    reason: '',
  }),
  hysteria: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: true }),
    engineSupport: Object.freeze({ xray: false, singBox: true }),
    probeSupport: Object.freeze({ xray: false, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_SINGBOX, runtime: ENGINE_SINGBOX }),
    reason: '',
  }),
  hysteria2: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: true }),
    engineSupport: Object.freeze({ xray: false, singBox: true }),
    probeSupport: Object.freeze({ xray: false, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_SINGBOX, runtime: ENGINE_SINGBOX }),
    reason: '',
  }),
  tuic: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: true }),
    engineSupport: Object.freeze({ xray: false, singBox: true }),
    probeSupport: Object.freeze({ xray: false, singBox: true }),
    preferredEngine: Object.freeze({ test: ENGINE_SINGBOX, runtime: ENGINE_SINGBOX }),
    reason: '',
  }),
  wireguard: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: false }),
    engineSupport: Object.freeze({ xray: false, singBox: false }),
    probeSupport: Object.freeze({ xray: false, singBox: false }),
    preferredEngine: Object.freeze({ test: '', runtime: '' }),
    reason: 'Protocol is known but not implemented in parser/runner',
  }),
  shadowtls: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: false }),
    engineSupport: Object.freeze({ xray: false, singBox: false }),
    probeSupport: Object.freeze({ xray: false, singBox: false }),
    preferredEngine: Object.freeze({ test: '', runtime: '' }),
    reason: 'Protocol is known but not implemented in parser/runner',
  }),
  anytls: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: false }),
    engineSupport: Object.freeze({ xray: false, singBox: false }),
    probeSupport: Object.freeze({ xray: false, singBox: false }),
    preferredEngine: Object.freeze({ test: '', runtime: '' }),
    reason: 'Protocol is known but not implemented in parser/runner',
  }),
  naive: Object.freeze({
    parserSupport: Object.freeze({ xray: false, singBox: false }),
    engineSupport: Object.freeze({ xray: false, singBox: false }),
    probeSupport: Object.freeze({ xray: false, singBox: false }),
    preferredEngine: Object.freeze({ test: '', runtime: '' }),
    reason: 'Protocol is known but not implemented in parser/runner',
  }),
});

function normalizeEngineName(input) {
  const value = String(input || '').trim().toLowerCase();
  if (value === ENGINE_XRAY) return ENGINE_XRAY;
  if (value === ENGINE_SINGBOX || value === 'singbox') return ENGINE_SINGBOX;
  return 'auto';
}

function normalizeProtocolName(input) {
  const value = String(input || '').trim().toLowerCase();
  if (!value) return '';
  return PROTOCOL_ALIASES[value] || value;
}

function inferProtocolFromInput(input) {
  const raw = normalizeProxyInputRaw(input);
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return '';

  const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemeMatch) return normalizeProtocolName(schemeMatch[1]);

  if (!value.includes('://') && value.includes(':')) return 'legacy-hostport';
  return '';
}

function cloneSupport(source) {
  return {
    xray: Boolean(source && source.xray),
    singBox: Boolean(source && source.singBox),
  };
}

function buildCapabilityFromEntry(protocol, entry) {
  const parserSupport = cloneSupport(entry.parserSupport);
  const engineSupport = cloneSupport(entry.engineSupport);
  const probeSupport = cloneSupport(entry.probeSupport);
  const preferredEngine = {
    test: entry.preferredEngine && entry.preferredEngine.test ? entry.preferredEngine.test : '',
    runtime: entry.preferredEngine && entry.preferredEngine.runtime ? entry.preferredEngine.runtime : '',
  };
  return {
    protocol,
    parserSupport,
    engineSupport,
    probeSupport,
    preferredEngine,
    reason: entry.reason ? String(entry.reason) : '',
    notes: [],
  };
}

function applyDynamicCapabilityRules(capability, input) {
  const raw = String(normalizeProxyInputRaw(input) || '').trim().toLowerCase();
  if (!raw) return capability;

  if (capability.protocol === 'ss' && /[?&]plugin=/i.test(raw)) {
    capability.parserSupport.xray = false;
    capability.engineSupport.xray = false;
    capability.probeSupport.xray = false;
    capability.preferredEngine.test = ENGINE_SINGBOX;
    capability.preferredEngine.runtime = ENGINE_SINGBOX;
    capability.notes.push('ss plugin detected, route to sing-box only');
  }

  return capability;
}

function finalizeCapabilityReason(capability) {
  if (!capability.parserSupport.xray && !capability.parserSupport.singBox) {
    return capability.reason || `No parser supports protocol "${capability.protocol || 'unknown'}"`;
  }
  if (!capability.engineSupport.xray && !capability.engineSupport.singBox) {
    return capability.reason || `No engine supports protocol "${capability.protocol || 'unknown'}"`;
  }
  return capability.reason || '';
}

function getProtocolCapability(inputOrProtocol, options = {}) {
  const rawMode = Boolean(options && options.rawProtocol);
  const protocol = normalizeProtocolName(
    rawMode ? String(inputOrProtocol || '') : inferProtocolFromInput(inputOrProtocol)
  ) || 'unknown';
  const matrixEntry = PROTOCOL_CAPABILITY_MATRIX[protocol] || PROTOCOL_CAPABILITY_MATRIX.unknown;
  const capability = buildCapabilityFromEntry(protocol, matrixEntry);
  if (!rawMode) applyDynamicCapabilityRules(capability, inputOrProtocol);
  capability.reason = finalizeCapabilityReason(capability);
  return capability;
}

function resolveEnginePlan(inputOrProtocol, engineHint = 'auto', options = {}) {
  const phase = options && options.phase === 'runtime' ? 'runtime' : 'test';
  const rawProtocolMode = Boolean(options && options.rawProtocol);
  const capability = getProtocolCapability(inputOrProtocol, { rawProtocol: rawProtocolMode });
  const hint = normalizeEngineName(engineHint);

  const supported = [];
  if (capability.engineSupport.xray) supported.push(ENGINE_XRAY);
  if (capability.engineSupport.singBox) supported.push(ENGINE_SINGBOX);

  const preferred = capability.preferredEngine[phase] || capability.preferredEngine.test || '';
  const order = [];

  if (hint !== 'auto' && supported.includes(hint)) {
    order.push(hint);
  } else if (preferred && supported.includes(preferred)) {
    order.push(preferred);
  }

  if (hint !== 'auto' && !order.includes(hint) && supported.includes(hint)) {
    order.push(hint);
  }

  supported.forEach((engine) => {
    if (!order.includes(engine)) order.push(engine);
  });

  return {
    protocol: capability.protocol,
    parserSupport: capability.parserSupport,
    engineSupport: capability.engineSupport,
    probeSupport: capability.probeSupport,
    preferredEngine: capability.preferredEngine,
    reason: capability.reason,
    notes: capability.notes,
    engines: order,
    primary: order.length > 0 ? order[0] : '',
    phase,
  };
}

module.exports = {
  ENGINE_XRAY,
  ENGINE_SINGBOX,
  PROTOCOL_CAPABILITY_MATRIX,
  normalizeEngineName,
  normalizeProtocolName,
  inferProtocolFromInput,
  getProtocolCapability,
  resolveEnginePlan,
};


const { URL } = require('url');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function err(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

function normalizeProxySpec(input) {
  const raw = isNonEmptyString(input) ? input.trim() : '';
  if (!raw) throw err('PROXY_SPEC_EMPTY', 'Proxy input is empty');

  // We intentionally reuse the existing parsing logic shape:
  // - If it parses as a URL scheme, keep it as canonical.
  // - Otherwise keep the raw string for legacy parsers (vmess, ss, etc.).
  const spec = {
    schemaVersion: 1,
    type: 'node',
    raw,
    protocol: null,
    remark: null,
    server: null,
    port: null,
    auth: null,
    transport: null,
    tls: null,
    extras: {},
  };

  // Extract remark (#...) for non-vmess links
  if (!raw.startsWith('vmess://') && raw.includes('#')) {
    try {
      spec.remark = decodeURIComponent(raw.split('#')[1]).trim() || null;
    } catch (e) {}
  }

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('socks5://')) {
    const u = new URL(raw);
    spec.protocol = u.protocol.replace(':', '');
    spec.server = u.hostname;
    spec.port = u.port ? Number(u.port) : (spec.protocol === 'https' ? 443 : spec.protocol === 'http' ? 80 : 1080);
    if (u.username) spec.auth = { user: u.username, pass: u.password || '' };
    return spec;
  }

  if (raw.startsWith('vless://') || raw.startsWith('trojan://')) {
    const u = new URL(raw);
    spec.protocol = u.protocol.replace(':', '');
    spec.server = u.hostname;
    spec.port = u.port ? Number(u.port) : 443;
    spec.auth = { id: u.username || null, pass: u.password || null };
    spec.transport = u.searchParams.get('type') || 'tcp';
    spec.tls = u.searchParams.get('security') || 'none';
    return spec;
  }

  // Legacy formats (vmess://, ss://, socks ip:port:user:pass, etc.)
  // Keep as raw with protocol inferred.
  if (raw.startsWith('vmess://')) spec.protocol = 'vmess';
  else if (raw.startsWith('ss://')) spec.protocol = 'shadowsocks';
  else if (raw.startsWith('socks://')) spec.protocol = 'socks';
  else if (raw.includes(':') && !raw.includes('://')) spec.protocol = 'socks';
  else spec.protocol = 'unknown';

  return spec;
}

function validateProxySpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') errors.push('spec must be object');
  if (typeof spec.schemaVersion !== 'number') errors.push('schemaVersion must be number');
  if (!isNonEmptyString(spec.raw)) errors.push('raw is required');
  if (!isNonEmptyString(spec.protocol)) errors.push('protocol is required');
  return { ok: errors.length === 0, errors };
}

module.exports = { normalizeProxySpec, validateProxySpec };


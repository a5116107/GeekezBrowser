const { URL } = require('url');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stripSurroundingQuotes(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function formatHostForUri(host) {
  const h = String(host || '').trim();
  if (!h) return '';
  if (h.includes(':') && !(h.startsWith('[') && h.endsWith(']'))) return `[${h}]`;
  return h;
}

function parseHostPortToken(token) {
  const t = stripSurroundingQuotes(token);
  if (!t) return null;

  let clean = t;
  clean = clean.replace(/^(socks5h?|socks5|socks|http|https):\/\//i, '');
  if (clean.includes('/')) clean = clean.split('/')[0];
  if (!clean) return null;

  const ipv6 = clean.match(/^\[([^\]]+)\]:(\d{1,5})$/);
  if (ipv6) {
    const host = ipv6[1];
    const port = Number(ipv6[2]);
    if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) return null;
    return { host, port };
  }

  const idx = clean.lastIndexOf(':');
  if (idx <= 0) return null;
  const host = clean.slice(0, idx);
  const port = Number(clean.slice(idx + 1));
  if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) return null;
  return { host, port };
}

function tryNormalizeCurlLikeProxyInput(input) {
  const s = String(input || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!s) return null;

  const findUser = () => {
    const m = s.match(/(?:^|\s)(?:-U|--proxy-user)\s+("[^"]+"|'[^']+'|[^\s]+)/i);
    if (!m) return { user: '', pass: '' };
    const up = stripSurroundingQuotes(m[1]);
    const idx = up.indexOf(':');
    if (idx < 0) return { user: up, pass: '' };
    return { user: up.slice(0, idx), pass: up.slice(idx + 1) };
  };

  const findProxy = () => {
    // curl: -x socks5 host:port OR -x socks5://host:port
    let m = s.match(/(?:^|\s)(?:-x|--proxy)\s+(socks5h?|socks5|socks|http|https)\s+("[^"]+"|'[^']+'|[^\s]+)/i);
    if (m) return { scheme: String(m[1] || '').toLowerCase(), hostPort: m[2] };

    m = s.match(/(?:^|\s)(?:-x|--proxy)\s+("[^"]+"|'[^']+'|[^\s]+)/i);
    if (m) {
      const token = stripSurroundingQuotes(m[1]);
      const mm = token.match(/^(socks5h?|socks5|socks|http|https):\/\/(.+)$/i);
      if (mm) return { scheme: String(mm[1] || '').toLowerCase(), hostPort: mm[2] };
      // No explicit scheme: assume HTTP proxy when using -x host:port
      if (token && /\S+:\d{1,5}/.test(token)) return { scheme: 'http', hostPort: token };
    }

    // Shorthand: socks5 host:port -U user:pass <url>
    m = s.match(/^(socks5h?|socks5|socks|http|https)\s+("[^"]+"|'[^']+'|[^\s]+)/i);
    if (m) return { scheme: String(m[1] || '').toLowerCase(), hostPort: m[2] };

    return null;
  };

  const proxy = findProxy();
  if (!proxy || !proxy.scheme || !proxy.hostPort) return null;

  const hp = parseHostPortToken(proxy.hostPort);
  if (!hp) return null;

  const { user, pass } = findUser();
  const scheme = proxy.scheme.startsWith('socks') ? 'socks5' : proxy.scheme;
  const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass || '')}@` : '';
  const host = formatHostForUri(hp.host);
  return `${scheme}://${auth}${host}:${hp.port}`;
}

function normalizeProxyInputRaw(input) {
  const raw = typeof input === 'string' ? input : (input == null ? '' : String(input));
  let s = raw.trim();
  if (!s) return '';

  // Some users paste "http://socks5 host:port -U user:pass ..." (curl snippet with accidental scheme prefix).
  s = s.replace(/^https?:\/\/(socks5h?|socks5|socks)\b/i, '$1');

  // Attempt to normalize common curl-like snippets into canonical URL form.
  const normalized = tryNormalizeCurlLikeProxyInput(s);
  return normalized || s;
}

function err(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

function normalizeProxySpec(input) {
  const raw = normalizeProxyInputRaw(input);
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

module.exports = { normalizeProxySpec, validateProxySpec, normalizeProxyInputRaw };

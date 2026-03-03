const dns = require('dns');
const net = require('net');

function normalizeHost(input) {
  if (typeof input !== 'string') return '';
  let host = input.trim().toLowerCase();
  host = host.replace(/^\[|\]$/g, '');
  const zoneIdx = host.indexOf('%');
  if (zoneIdx >= 0) host = host.slice(0, zoneIdx);
  return host;
}

function parseHttpUrlOrThrow(url) {
  if (typeof url !== 'string' || !url.trim()) throw new Error('Invalid URL');
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http/https URLs are allowed');
  }
  return u;
}

function isPrivateIpv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(ipv6) {
  const ip = normalizeHost(ipv6);
  if (!ip) return false;

  if (ip === '::1' || ip === '::') return true;

  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice('::ffff:'.length);
    if (net.isIP(mapped) === 4) return isPrivateIpv4(mapped);

    const asHex = mapped.split(':').filter(Boolean);
    if (asHex.length === 1 && /^[0-9a-f]{8}$/i.test(asHex[0])) {
      const n = Number.parseInt(asHex[0], 16);
      if (Number.isInteger(n)) {
        const mappedV4 = `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
        return isPrivateIpv4(mappedV4);
      }
    }
    if (asHex.length === 2 && asHex.every((x) => /^[0-9a-f]{1,4}$/i.test(x))) {
      const hi = Number.parseInt(asHex[0], 16);
      const lo = Number.parseInt(asHex[1], 16);
      if (Number.isInteger(hi) && Number.isInteger(lo)) {
        const mappedV4 = `${(hi >>> 8) & 255}.${hi & 255}.${(lo >>> 8) & 255}.${lo & 255}`;
        return isPrivateIpv4(mappedV4);
      }
    }
  }

  const compact = ip.replace(/:/g, '');
  if (compact.startsWith('fc') || compact.startsWith('fd')) return true; // ULA fc00::/7
  if (compact.startsWith('fe8') || compact.startsWith('fe9') || compact.startsWith('fea') || compact.startsWith('feb')) return true; // Link-local fe80::/10

  return false;
}

function isPrivateIpLiteral(hostOrIp) {
  const host = normalizeHost(hostOrIp);
  const family = net.isIP(host);
  if (family === 4) return isPrivateIpv4(host);
  if (family === 6) return isPrivateIpv6(host);
  return false;
}

function isLocalhostName(hostname) {
  const host = normalizeHost(hostname);
  return host === 'localhost' || host.endsWith('.localhost');
}

function hasPrivateHostLiteral(hostname) {
  const host = normalizeHost(hostname);
  return isLocalhostName(host) || isPrivateIpLiteral(host);
}

function isDomainName(hostname) {
  const host = normalizeHost(hostname);
  if (!host || host.length > 253) return false;
  if (host.startsWith('.') || host.endsWith('.')) return false;
  const labels = host.split('.');
  if (labels.length === 0) return false;
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function normalizeAllowedPrivateHostEntry(input) {
  if (typeof input !== 'string') return null;
  let value = input.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).hostname;
    } catch (e) {
      return null;
    }
  }

  const host = normalizeHost(value);
  if (!host) return null;

  if (host.startsWith('*.')) {
    const suffix = host.slice(2);
    if (!isDomainName(suffix)) return null;
    return `*.${suffix}`;
  }

  if (net.isIP(host)) return host;
  if (isLocalhostName(host)) return host;
  if (isDomainName(host)) return host;
  return null;
}

function normalizeAllowedPrivateHostList(rawList, maxItems = 64) {
  if (!Array.isArray(rawList)) return [];
  const out = [];
  const seen = new Set();
  for (const item of rawList) {
    const normalized = normalizeAllowedPrivateHostEntry(item);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= maxItems) break;
  }
  return out;
}

function buildAllowedPrivateHostMatchers(rawList) {
  return normalizeAllowedPrivateHostList(rawList);
}

function isHostInAllowedPrivateMatchers(hostname, matchers) {
  const host = normalizeHost(hostname);
  if (!host || !Array.isArray(matchers) || matchers.length === 0) return false;

  for (const m of matchers) {
    if (!m) continue;
    if (m.startsWith('*.')) {
      const suffix = m.slice(2);
      if (!suffix) continue;
      if (host === suffix || host.endsWith(`.${suffix}`)) return true;
      continue;
    }
    if (host === m) return true;
  }
  return false;
}

async function lookupHostAddrs(hostname, timeoutMs) {
  return await Promise.race([
    new Promise((resolve, reject) => {
      dns.lookup(hostname, { all: true, verbatim: true }, (err, records) => {
        if (err) return reject(err);
        resolve(Array.isArray(records) ? records : []);
      });
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DNS lookup timeout')), timeoutMs);
    }),
  ]);
}

async function assertNoPrivateNetworkTarget(urlOrObj, options = {}) {
  const u = (urlOrObj && typeof urlOrObj === 'object') ? urlOrObj : parseHttpUrlOrThrow(urlOrObj);
  const host = normalizeHost(u.hostname);
  if (!host) throw new Error('Invalid URL host');
  const allowMatchers = buildAllowedPrivateHostMatchers(options.allowedPrivateHosts);

  if (hasPrivateHostLiteral(host)) {
    if (isHostInAllowedPrivateMatchers(host, allowMatchers)) return u;
    throw new Error('Localhost/private network URLs are not allowed');
  }

  const dnsLookup = options.dnsLookup !== false;
  if (!dnsLookup || net.isIP(host)) return u;

  const timeoutMs = Number.isInteger(options.dnsTimeoutMs) ? options.dnsTimeoutMs : 2500;
  try {
    const records = await lookupHostAddrs(host, timeoutMs);
    for (const rec of records) {
      if (!rec || typeof rec.address !== 'string') continue;
      if (isPrivateIpLiteral(rec.address)) {
        if (isHostInAllowedPrivateMatchers(host, allowMatchers)) return u;
        throw new Error(`Resolved private network address is not allowed: ${rec.address}`);
      }
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('private network')) throw err;
    // Non-security DNS failures should not block normal external subscriptions.
  }

  return u;
}

async function parseHttpFetchUrlOrThrow(url, options = {}) {
  const u = parseHttpUrlOrThrow(url);
  const enforceNoPrivate = options.blockPrivateNetwork !== false;
  if (!enforceNoPrivate) return u;
  return assertNoPrivateNetworkTarget(u, options);
}

module.exports = {
  parseHttpUrlOrThrow,
  parseHttpFetchUrlOrThrow,
  assertNoPrivateNetworkTarget,
  normalizeAllowedPrivateHostEntry,
  normalizeAllowedPrivateHostList,
  isPrivateIpLiteral,
  isLocalhostName,
};

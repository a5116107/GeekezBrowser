const crypto = require('crypto');
const yaml = require('js-yaml');

function sha1Hex(input) {
  return crypto.createHash('sha1').update(String(input || ''), 'utf8').digest('hex');
}

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeBase64(text) {
  const s = safeTrim(text);
  if (!s || s.length < 32) return false;
  if (s.includes('://')) return false;
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(s)) return false;
  return true;
}

function decodeBase64Maybe(text) {
  const s = safeTrim(text);
  if (!looksLikeBase64(s)) return null;
  try {
    const buf = Buffer.from(s.replace(/\s+/g, ''), 'base64');
    const decoded = buf.toString('utf8');
    return decoded && decoded.includes('://') ? decoded : null;
  } catch {
    return null;
  }
}

function detectSubscriptionType(content, hintType = 'auto') {
  const hint = hintType || 'auto';
  if (hint !== 'auto') return hint;

  const text = safeTrim(content);
  if (!text) return 'raw';
  if (/^\s*proxies\s*:/m.test(text) || /^\s*proxy-groups\s*:/m.test(text)) return 'clash';

  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object' && Array.isArray(obj.outbounds)) return 'singbox';
  } catch { }

  if (looksLikeBase64(text)) return 'base64';
  return 'raw';
}

function extractLinksFromText(text) {
  const lines = String(text || '').split(/[\r\n]+/);
  const nodes = [];
  let skipped = 0;
  for (const rawLine of lines) {
    const line = safeTrim(rawLine);
    if (!line) continue;
    if (!line.includes('://')) {
      skipped++;
      continue;
    }
    nodes.push(line);
  }
  return { nodes, skipped, totalLines: lines.length };
}

function parseClashYaml(content) {
  const nodes = [];
  const errors = [];

  try {
    const doc = yaml.load(String(content || '')) || {};
    const proxies = Array.isArray(doc.proxies) ? doc.proxies : [];
    let idx = 0;
    for (const p of proxies) {
      if (!p || typeof p !== 'object') continue;
      const type = String(p.type || '').toLowerCase();
      const name = safeTrim(p.name) || `clash-${idx + 1}`;

      // Minimal mapping: only handle types we can render to existing link formats.
      // socks5: socks5://user:pass@host:port (or without auth)
      if (type === 'socks5' || type === 'socks') {
        const host = safeTrim(p.server || p.host);
        const port = p.port;
        if (!host || !port) continue;
        const user = safeTrim(p.username);
        const pass = safeTrim(p.password);
        const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
        const raw = `socks5://${auth}${host}:${port}`;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // http: http://user:pass@host:port
      if (type === 'http' || type === 'https') {
        const host = safeTrim(p.server || p.host);
        const port = p.port;
        if (!host || !port) continue;
        const user = safeTrim(p.username);
        const pass = safeTrim(p.password);
        const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
        const scheme = type === 'https' ? 'https' : 'http';
        const raw = `${scheme}://${auth}${host}:${port}`;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // trojan: trojan://password@host:port?sni=...#name
      if (type === 'trojan') {
        const host = safeTrim(p.server);
        const port = p.port;
        const password = safeTrim(p.password);
        if (!host || !port || !password) continue;
        const sni = safeTrim(p.sni);
        const params = [];
        if (sni) params.push(`sni=${encodeURIComponent(sni)}`);
        const raw = `trojan://${encodeURIComponent(password)}@${host}:${port}${params.length ? `?${params.join('&')}` : ''}#${encodeURIComponent(name)}`;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // vmess/vless/etc require more complex encoding; mark unsupported for now.
    }
  } catch (e) {
    errors.push(`Clash YAML parse failed: ${e && e.message ? e.message : String(e)}`);
  }

  return { nodes, errors };
}

function parseSingboxJson(content) {
  const nodes = [];
  const errors = [];
  try {
    const obj = JSON.parse(String(content || ''));
    const outbounds = obj && Array.isArray(obj.outbounds) ? obj.outbounds : [];
    let idx = 0;
    for (const o of outbounds) {
      if (!o || typeof o !== 'object') continue;
      const type = String(o.type || '').toLowerCase();
      const tag = safeTrim(o.tag) || `sb-${idx + 1}`;

      // socks: socks5://user:pass@host:port
      if (type === 'socks' || type === 'socks5') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        if (!host || !port) continue;
        const user = safeTrim(o.username);
        const pass = safeTrim(o.password);
        const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
        const raw = `socks5://${auth}${host}:${port}`;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // http: http://user:pass@host:port
      if (type === 'http') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        if (!host || !port) continue;
        const user = safeTrim(o.username);
        const pass = safeTrim(o.password);
        const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
        const raw = `http://${auth}${host}:${port}`;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // trojan: trojan://password@host:port?sni=...#tag
      if (type === 'trojan') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        const password = safeTrim(o.password);
        if (!host || !port || !password) continue;
        const sni = safeTrim(o.tls && o.tls.server_name);
        const params = [];
        if (sni) params.push(`sni=${encodeURIComponent(sni)}`);
        const raw = `trojan://${encodeURIComponent(password)}@${host}:${port}${params.length ? `?${params.join('&')}` : ''}#${encodeURIComponent(tag)}`;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }
    }
  } catch (e) {
    errors.push(`sing-box JSON parse failed: ${e && e.message ? e.message : String(e)}`);
  }
  return { nodes, errors };
}

function parseSubscriptionContent(content, hintType = 'auto') {
  let detectedType = detectSubscriptionType(content, hintType);
  let decoded = String(content || '');
  let decodeAttempted = false;

  if (detectedType === 'base64') {
    decodeAttempted = true;
    const maybe = decodeBase64Maybe(decoded);
    if (maybe) decoded = maybe;
    else detectedType = 'raw';
  }

  if (detectedType === 'raw' || detectedType === 'v2rayN' || detectedType === 'base64') {
    const { nodes, skipped, totalLines } = extractLinksFromText(decoded);
    return {
      detectedType,
      decoded,
      nodes: nodes.map((raw) => ({
        id: `node-${sha1Hex(raw).slice(0, 12)}`,
        raw,
      })),
      stats: {
        totalLines,
        totalNodes: nodes.length,
        skippedLines: skipped,
        decodeAttempted,
      },
      errors: [],
    };
  }

  if (detectedType === 'clash') {
    const parsed = parseClashYaml(decoded);
    return {
      detectedType,
      decoded,
      nodes: parsed.nodes.map((n) => ({ id: n.id, raw: n.raw, name: n.name })),
      stats: { totalLines: 0, totalNodes: parsed.nodes.length, skippedLines: 0, decodeAttempted },
      errors: parsed.errors,
    };
  }

  if (detectedType === 'singbox') {
    const parsed = parseSingboxJson(decoded);
    return {
      detectedType,
      decoded,
      nodes: parsed.nodes.map((n) => ({ id: n.id, raw: n.raw, name: n.name })),
      stats: { totalLines: 0, totalNodes: parsed.nodes.length, skippedLines: 0, decodeAttempted },
      errors: parsed.errors,
    };
  }

  return {
    detectedType,
    decoded,
    nodes: [],
    stats: { totalLines: 0, totalNodes: 0, skippedLines: 0, decodeAttempted },
    errors: [`Unsupported subscription type: ${detectedType}`],
  };
}

module.exports = { parseSubscriptionContent, detectSubscriptionType };

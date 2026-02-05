const crypto = require('crypto');
const yaml = require('js-yaml');
const { URL } = require('url');

function sha1Hex(input) {
  return crypto.createHash('sha1').update(String(input || ''), 'utf8').digest('hex');
}

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatHostForUri(host) {
  const h = safeTrim(host);
  if (!h) return '';
  if (h.startsWith('[') && h.endsWith(']')) return h;
  // IPv6 literal needs brackets to avoid ambiguity with :port.
  if (h.includes(':')) return `[${h}]`;
  return h;
}

function buildUrlWithUserInfo({ scheme, username, password, host, port, params = {}, name = '' }) {
  const h = formatHostForUri(host);
  if (!h || !port) return null;

  const u = new URL(`${scheme}://${h}:${port}`);
  if (username) u.username = String(username);
  if (password) u.password = String(password);

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    u.searchParams.set(String(k), String(v));
  });

  if (name) u.hash = String(name);
  return u.toString();
}

function buildSsUri({ method, password, host, port, name }) {
  const h = formatHostForUri(host);
  if (!method || !password || !h || !port) return null;
  const userInfo = Buffer.from(`${method}:${password}`, 'utf8').toString('base64');
  const base = `ss://${userInfo}@${h}:${port}`;
  return name ? `${base}#${encodeURIComponent(name)}` : base;
}

function buildVmessUri({ name, server, port, uuid, alterId = 0, cipher = 'auto', tlsEnabled = false, network = 'tcp', host = '', path = '', sni = '', alpn = '' }) {
  if (!server || !port || !uuid) return null;
  const vmess = {
    v: '2',
    ps: name || '',
    add: server,
    port: String(port),
    id: uuid,
    aid: String(Number(alterId) || 0),
    scy: cipher || 'auto',
    net: network || 'tcp',
    type: 'none',
    host: host || '',
    path: path || '',
    tls: tlsEnabled ? 'tls' : 'none',
    sni: sni || '',
    alpn: alpn || ''
  };
  return `vmess://${Buffer.from(JSON.stringify(vmess), 'utf8').toString('base64')}`;
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
        const raw = `socks5://${auth}${formatHostForUri(host)}:${port}`;
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
        const raw = `${scheme}://${auth}${formatHostForUri(host)}:${port}`;
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
        const sni = safeTrim(p.sni || p.servername);
        const network = safeTrim(p.network) || 'tcp';
        const wsOpts = p['ws-opts'] || p.wsOpts || null;
        const grpcOpts = p['grpc-opts'] || p.grpcOpts || null;

        const params = {
          security: 'tls',
          sni: sni || undefined,
          type: network || undefined,
        };
        if (network === 'ws' && wsOpts) {
          params.path = wsOpts.path || '/';
          const h = wsOpts.headers && (wsOpts.headers.Host || wsOpts.headers.host);
          if (h) params.host = h;
        } else if (network === 'grpc' && grpcOpts) {
          const svc = grpcOpts['grpc-service-name'] || grpcOpts.serviceName || '';
          if (svc) params.serviceName = svc;
        }

        const raw = buildUrlWithUserInfo({
          scheme: 'trojan',
          username: password,
          host,
          port,
          params,
          name
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // shadowsocks: ss://BASE64(method:password)@host:port#name
      if (type === 'ss' || type === 'shadowsocks') {
        const host = safeTrim(p.server);
        const port = p.port;
        const method = safeTrim(p.cipher);
        const password = safeTrim(p.password);
        if (!host || !port || !method || !password) continue;
        // Skip plugin variants for now (requires additional mapping support).
        if (p.plugin || p['plugin-opts']) continue;
        const raw = buildSsUri({ method, password, host, port, name });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // vmess://BASE64(JSON)
      if (type === 'vmess') {
        const server = safeTrim(p.server);
        const port = p.port;
        const uuid = safeTrim(p.uuid);
        if (!server || !port || !uuid) continue;

        const alterId = p.alterId || p.aid || 0;
        const cipher = safeTrim(p.cipher) || 'auto';
        const tlsEnabled = Boolean(p.tls);
        const sni = safeTrim(p.servername || p.sni);
        const alpn = Array.isArray(p.alpn) ? p.alpn.join(',') : safeTrim(p.alpn);

        const network = safeTrim(p.network) || 'tcp';
        const wsOpts = p['ws-opts'] || p.wsOpts || null;
        const grpcOpts = p['grpc-opts'] || p.grpcOpts || null;
        const h2Opts = p['h2-opts'] || p.h2Opts || null;

        let hostHeader = '';
        let path = '';
        if (network === 'ws' && wsOpts) {
          path = wsOpts.path || '/';
          hostHeader = (wsOpts.headers && (wsOpts.headers.Host || wsOpts.headers.host)) || '';
        } else if (network === 'grpc' && grpcOpts) {
          path = grpcOpts['grpc-service-name'] || grpcOpts.serviceName || '';
        } else if ((network === 'h2' || network === 'http') && h2Opts) {
          path = h2Opts.path || '/';
          hostHeader = Array.isArray(h2Opts.host) ? h2Opts.host.join(',') : safeTrim(h2Opts.host);
        }

        const raw = buildVmessUri({
          name,
          server,
          port,
          uuid,
          alterId,
          cipher,
          tlsEnabled,
          network: network === 'http' ? 'h2' : network,
          host: hostHeader,
          path,
          sni,
          alpn
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // vless://uuid@host:port?...#name
      if (type === 'vless') {
        const host = safeTrim(p.server);
        const port = p.port;
        const uuid = safeTrim(p.uuid);
        if (!host || !port || !uuid) continue;

        const network = safeTrim(p.network) || 'tcp';
        const wsOpts = p['ws-opts'] || p.wsOpts || null;
        const grpcOpts = p['grpc-opts'] || p.grpcOpts || null;
        const h2Opts = p['h2-opts'] || p.h2Opts || null;

        const realityOpts = p['reality-opts'] || p.realityOpts || null;
        const tlsEnabled = Boolean(p.tls);

        const security = realityOpts ? 'reality' : (tlsEnabled ? 'tls' : 'none');
        const sni = safeTrim(p.servername || p.sni);
        const fp = safeTrim(p['client-fingerprint'] || p.clientFingerprint);

        const params = {
          encryption: safeTrim(p.encryption) || 'none',
          flow: safeTrim(p.flow) || undefined,
          security,
          type: network || 'tcp',
          sni: sni || undefined,
          fp: fp || undefined,
        };

        if (security === 'reality' && realityOpts) {
          const pbk = safeTrim(realityOpts['public-key'] || realityOpts.publicKey);
          const sid = safeTrim(realityOpts['short-id'] || realityOpts.shortId);
          const spx = safeTrim(realityOpts['spider-x'] || realityOpts.spiderX);
          if (pbk) params.pbk = pbk;
          if (sid) params.sid = sid;
          if (spx) params.spx = spx;
        }

        if (network === 'ws' && wsOpts) {
          params.path = wsOpts.path || '/';
          const h = wsOpts.headers && (wsOpts.headers.Host || wsOpts.headers.host);
          if (h) params.host = h;
        } else if (network === 'grpc' && grpcOpts) {
          const svc = grpcOpts['grpc-service-name'] || grpcOpts.serviceName || '';
          if (svc) params.serviceName = svc;
        } else if ((network === 'h2' || network === 'http') && h2Opts) {
          params.type = 'h2';
          params.path = h2Opts.path || '/';
          const hh = Array.isArray(h2Opts.host) ? h2Opts.host.join(',') : safeTrim(h2Opts.host);
          if (hh) params.host = hh;
        }

        const raw = buildUrlWithUserInfo({
          scheme: 'vless',
          username: uuid,
          host,
          port,
          params,
          name
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // hysteria2://password@host:port?...#name (sing-box preferred)
      if (type === 'hysteria2' || type === 'hy2') {
        const host = safeTrim(p.server);
        const port = p.port;
        const password = safeTrim(p.password || p.auth || p['auth-str']);
        if (!host || !port || !password) continue;
        const sni = safeTrim(p.sni || p.servername);
        const params = {
          sni: sni || undefined,
          insecure: (p['skip-cert-verify'] === true) ? '1' : undefined,
          alpn: Array.isArray(p.alpn) ? p.alpn.join(',') : (safeTrim(p.alpn) || undefined),
          obfs: safeTrim(p.obfs) || undefined,
          'obfs-password': safeTrim(p['obfs-password'] || p.obfsPassword) || undefined,
          upmbps: (Number.isFinite(Number(p.up)) ? String(Number(p.up)) : undefined),
          downmbps: (Number.isFinite(Number(p.down)) ? String(Number(p.down)) : undefined),
        };
        const raw = buildUrlWithUserInfo({
          scheme: 'hysteria2',
          username: password,
          host,
          port,
          params,
          name
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }

      // tuic://uuid:password@host:port?...#name (sing-box preferred)
      if (type === 'tuic') {
        const host = safeTrim(p.server);
        const port = p.port;
        const uuid = safeTrim(p.uuid);
        const password = safeTrim(p.password);
        if (!host || !port || !uuid || !password) continue;
        const sni = safeTrim(p.sni || p.servername);
        const params = {
          sni: sni || undefined,
          insecure: (p['skip-cert-verify'] === true) ? '1' : undefined,
          alpn: Array.isArray(p.alpn) ? p.alpn.join(',') : (safeTrim(p.alpn) || undefined),
          congestion_control: safeTrim(p['congestion-control'] || p['congestion-controller'] || p.congestionControl) || undefined,
          udp_relay_mode: safeTrim(p['udp-relay-mode'] || p.udpRelayMode) || undefined,
        };
        const raw = buildUrlWithUserInfo({
          scheme: 'tuic',
          username: uuid,
          password,
          host,
          port,
          params,
          name
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name });
        idx++;
        continue;
      }
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
        const raw = `socks5://${auth}${formatHostForUri(host)}:${port}`;
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
        const raw = `http://${auth}${formatHostForUri(host)}:${port}`;
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
        const tls = o.tls && typeof o.tls === 'object' ? o.tls : null;
        const transport = o.transport && typeof o.transport === 'object' ? o.transport : null;

        const params = {
          security: tls && tls.enabled ? 'tls' : 'none',
          sni: safeTrim(tls && tls.server_name) || undefined,
        };
        if (transport && transport.type) {
          const t = String(transport.type);
          params.type = t === 'http' ? 'h2' : t;
          if (t === 'ws') {
            params.path = transport.path || '/';
            const h = transport.headers && (transport.headers.Host || transport.headers.host);
            if (h) params.host = h;
          } else if (t === 'grpc') {
            if (transport.service_name) params.serviceName = transport.service_name;
          } else if (t === 'http') {
            params.path = transport.path || '/';
            const hh = Array.isArray(transport.host) ? transport.host.join(',') : safeTrim(transport.host);
            if (hh) params.host = hh;
          }
        }

        const raw = buildUrlWithUserInfo({
          scheme: 'trojan',
          username: password,
          host,
          port,
          params,
          name: tag
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // shadowsocks
      if (type === 'shadowsocks' || type === 'ss') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        const method = safeTrim(o.method);
        const password = safeTrim(o.password);
        if (!host || !port || !method || !password) continue;
        if (o.plugin) continue;
        const raw = buildSsUri({ method, password, host, port, name: tag });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // vless
      if (type === 'vless') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        const uuid = safeTrim(o.uuid);
        if (!host || !port || !uuid) continue;

        const tls = o.tls && typeof o.tls === 'object' ? o.tls : null;
        const transport = o.transport && typeof o.transport === 'object' ? o.transport : null;

        const reality = tls && tls.reality && typeof tls.reality === 'object' && tls.reality.enabled ? tls.reality : null;
        const security = reality ? 'reality' : (tls && tls.enabled ? 'tls' : 'none');

        const transportType = transport && transport.type ? String(transport.type) : 'tcp';

        const params = {
          encryption: 'none',
          flow: safeTrim(o.flow) || undefined,
          security,
          type: transportType === 'http' ? 'h2' : transportType,
          sni: safeTrim(tls && tls.server_name) || undefined,
        };

        if (tls && tls.utls && typeof tls.utls === 'object' && tls.utls.enabled && tls.utls.fingerprint) {
          params.fp = String(tls.utls.fingerprint);
        }

        if (security === 'reality' && reality) {
          const pbk = safeTrim(reality.public_key);
          const sid = safeTrim(reality.short_id);
          if (pbk) params.pbk = pbk;
          if (sid) params.sid = sid;
        }

        if (transportType === 'ws') {
          params.path = transport.path || '/';
          const h = transport.headers && (transport.headers.Host || transport.headers.host);
          if (h) params.host = h;
        } else if (transportType === 'grpc') {
          if (transport.service_name) params.serviceName = transport.service_name;
        } else if (transportType === 'http') {
          params.path = transport.path || '/';
          const hh = Array.isArray(transport.host) ? transport.host.join(',') : safeTrim(transport.host);
          if (hh) params.host = hh;
        }

        const raw = buildUrlWithUserInfo({
          scheme: 'vless',
          username: uuid,
          host,
          port,
          params,
          name: tag
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // vmess
      if (type === 'vmess') {
        const server = safeTrim(o.server);
        const port = o.server_port;
        const uuid = safeTrim(o.uuid);
        if (!server || !port || !uuid) continue;

        const tls = o.tls && typeof o.tls === 'object' ? o.tls : null;
        const transport = o.transport && typeof o.transport === 'object' ? o.transport : null;
        const transportType = transport && transport.type ? String(transport.type) : 'tcp';
        const network = transportType === 'http' ? 'h2' : transportType;

        let hostHeader = '';
        let path = '';
        if (transportType === 'ws') {
          path = transport.path || '/';
          hostHeader = (transport.headers && (transport.headers.Host || transport.headers.host)) || '';
        } else if (transportType === 'grpc') {
          path = transport.service_name || '';
        } else if (transportType === 'http') {
          path = transport.path || '/';
          hostHeader = Array.isArray(transport.host) ? transport.host.join(',') : safeTrim(transport.host);
        }

        const raw = buildVmessUri({
          name: tag,
          server,
          port,
          uuid,
          alterId: Number(o.alter_id || 0),
          cipher: safeTrim(o.security) || 'auto',
          tlsEnabled: Boolean(tls && tls.enabled),
          network,
          host: hostHeader,
          path,
          sni: safeTrim(tls && tls.server_name) || '',
          alpn: Array.isArray(tls && tls.alpn) ? tls.alpn.join(',') : safeTrim(tls && tls.alpn)
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // hysteria2
      if (type === 'hysteria2' || type === 'hy2') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        const password = safeTrim(o.password);
        if (!host || !port || !password) continue;
        const tls = o.tls && typeof o.tls === 'object' ? o.tls : null;
        const obfs = o.obfs && typeof o.obfs === 'object' ? o.obfs : null;
        const params = {
          sni: safeTrim(tls && tls.server_name) || undefined,
          insecure: (tls && tls.insecure) ? '1' : undefined,
          alpn: Array.isArray(tls && tls.alpn) ? tls.alpn.join(',') : (safeTrim(tls && tls.alpn) || undefined),
          obfs: safeTrim(obfs && obfs.type) || undefined,
          'obfs-password': safeTrim(obfs && obfs.password) || undefined,
          upmbps: Number.isFinite(Number(o.up_mbps)) ? String(Number(o.up_mbps)) : undefined,
          downmbps: Number.isFinite(Number(o.down_mbps)) ? String(Number(o.down_mbps)) : undefined,
        };
        const raw = buildUrlWithUserInfo({
          scheme: 'hysteria2',
          username: password,
          host,
          port,
          params,
          name: tag
        });
        if (!raw) continue;
        nodes.push({ id: `node-${sha1Hex(raw).slice(0, 12)}`, raw, name: tag });
        idx++;
        continue;
      }

      // tuic
      if (type === 'tuic') {
        const host = safeTrim(o.server);
        const port = o.server_port;
        const uuid = safeTrim(o.uuid);
        const password = safeTrim(o.password);
        if (!host || !port || !uuid || !password) continue;
        const tls = o.tls && typeof o.tls === 'object' ? o.tls : null;
        const params = {
          sni: safeTrim(tls && tls.server_name) || undefined,
          insecure: (tls && tls.insecure) ? '1' : undefined,
          alpn: Array.isArray(tls && tls.alpn) ? tls.alpn.join(',') : (safeTrim(tls && tls.alpn) || undefined),
          congestion_control: safeTrim(o.congestion_control) || undefined,
          udp_relay_mode: safeTrim(o.udp_relay_mode) || undefined,
        };
        const raw = buildUrlWithUserInfo({
          scheme: 'tuic',
          username: uuid,
          password,
          host,
          port,
          params,
          name: tag
        });
        if (!raw) continue;
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

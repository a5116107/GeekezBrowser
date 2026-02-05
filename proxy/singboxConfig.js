const { URL } = require('url');
const { Base64 } = require('js-base64');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeDecodeUrlComponent(value) {
  if (!isNonEmptyString(value)) return '';
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

function parseBooleanLoose(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'n' || v === 'off') return false;
  return null;
}

function parseHttpOrSocksUrl(raw) {
  const u = new URL(raw);
  const username = safeDecodeUrlComponent(u.username || '');
  const password = safeDecodeUrlComponent(u.password || '');
  return {
    server: u.hostname,
    server_port: u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : u.protocol === 'http:' ? 80 : 1080),
    username: username || undefined,
    password: password || undefined,
  };
}

function stripIpv6Brackets(host) {
  const h = String(host || '').trim();
  if (!h) return '';
  if (h.startsWith('[') && h.endsWith(']')) return h.slice(1, -1);
  return h;
}

function decodeBase64UrlToUtf8(b64url) {
  const s = String(b64url || '').trim();
  if (!s) return '';
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = base64 + (pad ? '='.repeat(4 - pad) : '');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function decodeSbPayload(raw) {
  const input = String(raw || '').trim();
  if (!input.startsWith('sb://')) return null;
  let clean = input.slice('sb://'.length);
  if (clean.includes('#')) clean = clean.split('#')[0];
  // We intentionally ignore querystrings to keep the payload canonical.
  if (clean.includes('?')) clean = clean.split('?')[0];
  if (!clean) return null;
  try {
    const jsonStr = decodeBase64UrlToUtf8(clean);
    const obj = JSON.parse(jsonStr);
    return obj && typeof obj === 'object' ? obj : null;
  } catch (e) {
    return null;
  }
}

function applyPreProxyDetourToTail({ outbounds, mainTag, preTag }) {
  if (!Array.isArray(outbounds) || outbounds.length === 0) return;
  const start = String(mainTag || '').trim() || 'proxy';
  const pre = String(preTag || '').trim() || 'pre';
  const byTag = new Map();
  outbounds.forEach((o) => {
    if (o && typeof o === 'object' && isNonEmptyString(o.tag)) byTag.set(String(o.tag), o);
  });

  let current = byTag.get(start);
  if (!current) return;

  const visited = new Set();
  for (let i = 0; i < 16; i++) {
    if (!current || typeof current !== 'object') return;
    const tag = String(current.tag || '');
    if (visited.has(tag)) return;
    visited.add(tag);

    const detour = current.detour ? String(current.detour) : '';
    if (!detour) break;
    const next = byTag.get(detour);
    if (!next) break;
    current = next;
  }

  if (current && typeof current === 'object') {
    current.detour = pre;
  }
}

function buildSingboxOutboundFromProxySpec(spec, tag = 'proxy') {
  if (!spec || typeof spec !== 'object') throw new Error('Invalid ProxySpec');
  const raw = String(spec.raw || '').trim();
  if (!raw) throw Object.assign(new Error('Proxy input is empty'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });

  const protocol = spec.protocol || 'unknown';
  const outTag = isNonEmptyString(tag) ? tag : 'proxy';

  if (raw.startsWith('sb://')) {
    const decoded = decodeSbPayload(raw);
    if (!decoded) throw Object.assign(new Error('Invalid sb:// payload'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
    // Bundles are handled in buildSingboxConfigFromProxySpec (need route wiring).
    if (decoded.kind && Array.isArray(decoded.outbounds)) {
      throw Object.assign(new Error('sb:// bundle payload must be handled at config level'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
    }
    if (!decoded.type) throw Object.assign(new Error('Invalid sb:// outbound (missing type)'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
    if (typeof decoded !== 'object') throw Object.assign(new Error('Invalid sb:// outbound'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
    return { ...decoded, tag: outTag };
  }

  if (raw.startsWith('socks5://') || raw.startsWith('socks://')) {
    const o = parseHttpOrSocksUrl(raw);
    return {
      type: 'socks',
      tag: outTag,
      server: o.server,
      server_port: o.server_port,
      username: o.username,
      password: o.password,
    };
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const o = parseHttpOrSocksUrl(raw);
    return {
      type: 'http',
      tag: outTag,
      server: o.server,
      server_port: o.server_port,
      username: o.username,
      password: o.password,
      tls: raw.startsWith('https://') ? { enabled: true } : undefined,
    };
  }

  if (raw.startsWith('vless://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const transport = params.get('type') || 'tcp';
    const security = params.get('security') || 'none';

    const outbound = {
      type: 'vless',
      tag: outTag,
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      uuid: safeDecodeUrlComponent(u.username),
      flow: params.get('flow') || undefined,
      packet_encoding: undefined,
      tls: undefined,
      transport: undefined,
    };

    if (security === 'tls') {
      outbound.tls = {
        enabled: true,
        server_name: params.get('sni') || params.get('host') || u.hostname,
        insecure: true,
      };
    } else if (security === 'reality') {
      const publicKey = params.get('pbk') || '';
      if (!publicKey) throw Object.assign(new Error('Invalid vless reality public key (pbk)'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
      outbound.tls = {
        enabled: true,
        server_name: params.get('sni') || params.get('host') || u.hostname,
        insecure: true,
        reality: {
          enabled: true,
          public_key: publicKey,
          short_id: params.get('sid') || '',
        },
        utls: {
          enabled: true,
          fingerprint: params.get('fp') || 'chrome',
        },
      };
    }

    if (transport === 'ws') {
      outbound.transport = {
        type: 'ws',
        path: params.get('path') || '/',
        headers: params.get('host') ? { Host: params.get('host') } : undefined,
      };
    } else if (transport === 'grpc') {
      outbound.transport = {
        type: 'grpc',
        service_name: params.get('serviceName') || params.get('serviceName'.toLowerCase()) || '',
      };
    } else if (transport === 'xhttp' || transport === 'splithttp') {
      // sing-box uses "http" transport variants; keep minimal mapping
      outbound.transport = {
        type: 'http',
        path: params.get('path') || '/',
        host: params.get('host') ? [params.get('host')] : undefined,
      };
    } else if (transport === 'h2' || transport === 'http') {
      outbound.transport = {
        type: 'http',
        path: params.get('path') || '/',
        host: params.get('host') ? String(params.get('host')).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };
    }

    return outbound;
  }

  if (raw.startsWith('trojan://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const transport = params.get('type') || 'tcp';
    const security = params.get('security') || 'tls';

    const outbound = {
      type: 'trojan',
      tag: outTag,
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      password: safeDecodeUrlComponent(u.username),
      tls: {
        enabled: security !== 'none',
        server_name: params.get('sni') || params.get('host') || u.hostname,
        insecure: true,
      },
      transport: undefined,
    };

    if (transport === 'ws') {
      outbound.transport = {
        type: 'ws',
        path: params.get('path') || '/',
        headers: params.get('host') ? { Host: params.get('host') } : undefined,
      };
    } else if (transport === 'grpc') {
      outbound.transport = {
        type: 'grpc',
        service_name: params.get('serviceName') || '',
      };
    } else if (transport === 'h2' || transport === 'http') {
      outbound.transport = {
        type: 'http',
        path: params.get('path') || '/',
        host: params.get('host') ? String(params.get('host')).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };
    }

    return outbound;
  }

  if (raw.startsWith('hysteria://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const auth = safeDecodeUrlComponent(u.username) ||
      safeDecodeUrlComponent(params.get('auth') || '') ||
      safeDecodeUrlComponent(params.get('auth-str') || '') ||
      safeDecodeUrlComponent(params.get('auth_str') || '') ||
      safeDecodeUrlComponent(params.get('password') || '') ||
      '';
    if (!auth) throw Object.assign(new Error('Invalid hysteria auth'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });

    const sni = params.get('sni') || params.get('peer') || u.hostname;
    const insecureParam = parseBooleanLoose(params.get('insecure'));
    const insecure = insecureParam === null ? true : insecureParam;

    const outbound = {
      type: 'hysteria',
      tag: outTag,
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      auth_str: auth,
      up_mbps: undefined,
      down_mbps: undefined,
      obfs: undefined,
      server_ports: undefined,
      hop_interval: undefined,
      tls: {
        enabled: true,
        server_name: sni,
        insecure,
      },
    };

    const up = Number(params.get('upmbps'));
    const down = Number(params.get('downmbps'));
    if (Number.isFinite(up) && up > 0) outbound.up_mbps = up;
    if (Number.isFinite(down) && down > 0) outbound.down_mbps = down;

    const alpnRaw = params.get('alpn');
    if (alpnRaw) {
      const alpn = String(alpnRaw).split(',').map(s => s.trim()).filter(Boolean);
      if (alpn.length > 0) outbound.tls.alpn = alpn;
    }

    const obfs = params.get('obfs');
    if (obfs) outbound.obfs = String(obfs);

    const portsRaw = params.get('ports');
    if (portsRaw) {
      const portsStr = String(portsRaw).trim();
      if (portsStr) {
        let normalized = '';
        if (portsStr.includes(':')) {
          normalized = portsStr;
        } else if (portsStr.includes('-')) {
          const [a, b] = portsStr.split('-', 2).map(s => s.trim());
          if (a && b) normalized = `${a}:${b}`;
        } else if (portsStr.includes(',')) {
          const nums = portsStr
            .split(',')
            .map(s => Number(String(s).trim()))
            .filter(n => Number.isFinite(n) && n >= 1 && n <= 65535);
          if (nums.length >= 2) normalized = `${nums[0]}:${nums[nums.length - 1]}`;
          else if (nums.length === 1) normalized = `${nums[0]}:${nums[0]}`;
        } else {
          const n = Number(portsStr);
          if (Number.isFinite(n) && n >= 1 && n <= 65535) normalized = `${n}:${n}`;
        }
        if (normalized) outbound.server_ports = normalized;
      }
    }

    const hopRaw = params.get('hop');
    if (hopRaw) {
      const hopStr = String(hopRaw).trim();
      const hop = Number(hopStr);
      if (Number.isFinite(hop) && hop > 0) outbound.hop_interval = `${hop}s`;
      else outbound.hop_interval = hopStr;
    }

    return outbound;
  }

  if (raw.startsWith('hysteria2://') || raw.startsWith('hy2://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const password = safeDecodeUrlComponent(u.username) || String(params.get('password') || '').trim();
    if (!password) throw Object.assign(new Error('Invalid hysteria2 password'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });

    const sni = params.get('sni') || u.hostname;
    const insecureParam = parseBooleanLoose(params.get('insecure'));
    const insecure = insecureParam === null ? true : insecureParam;

    const outbound = {
      type: 'hysteria2',
      tag: outTag,
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      password,
      up_mbps: undefined,
      down_mbps: undefined,
      obfs: undefined,
      tls: {
        enabled: true,
        server_name: sni,
        insecure,
      },
    };

    const up = Number(params.get('upmbps'));
    const down = Number(params.get('downmbps'));
    if (Number.isFinite(up) && up > 0) outbound.up_mbps = up;
    if (Number.isFinite(down) && down > 0) outbound.down_mbps = down;

    const alpnRaw = params.get('alpn');
    if (alpnRaw) {
      const alpn = String(alpnRaw).split(',').map(s => s.trim()).filter(Boolean);
      if (alpn.length > 0) outbound.tls.alpn = alpn;
    }

    const obfsType = params.get('obfs');
    if (obfsType) {
      outbound.obfs = {
        type: String(obfsType),
        password: params.get('obfs-password') || params.get('obfsPassword') || '',
      };
    }

    return outbound;
  }

  if (raw.startsWith('tuic://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const uuid = safeDecodeUrlComponent(u.username);
    const password = safeDecodeUrlComponent(u.password) || String(params.get('password') || '').trim();
    if (!uuid || !password) throw Object.assign(new Error('Invalid tuic credentials'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });

    const sni = params.get('sni') || u.hostname;
    const insecureParam = parseBooleanLoose(params.get('insecure'));
    const insecure = insecureParam === null ? true : insecureParam;

    const outbound = {
      type: 'tuic',
      tag: outTag,
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      uuid,
      password,
      congestion_control: params.get('congestion_control') || params.get('congestion-control') || undefined,
      udp_relay_mode: params.get('udp_relay_mode') || params.get('udp-relay-mode') || undefined,
      tls: {
        enabled: true,
        server_name: sni,
        insecure,
      },
    };

    const alpnRaw = params.get('alpn');
    if (alpnRaw) {
      const alpn = String(alpnRaw).split(',').map(s => s.trim()).filter(Boolean);
      if (alpn.length > 0) outbound.tls.alpn = alpn;
    }

    return outbound;
  }

  if (raw.startsWith('ss://')) {
    // Support both:
    // 1) ss://method:password@host:port
    // 2) ss://BASE64(method:password)@host:port
    // 3) ss://BASE64(method:password@host:port)
    let clean = raw.replace('ss://', '');
    if (clean.includes('#')) clean = clean.split('#')[0];

    // Optional SIP003 plugin parameter (?plugin=...)
    let pluginParam = '';
    const qIndex = clean.indexOf('?');
    if (qIndex >= 0) {
      const beforeQ = clean.slice(0, qIndex);
      const query = clean.slice(qIndex + 1);
      clean = beforeQ;
      try {
        const sp = new URLSearchParams(query);
        const got = sp.get('plugin');
        pluginParam = typeof got === 'string' ? got.trim() : '';
      } catch (e) { }
    }

    const parseUserInfo = (userInfo) => {
      if (!userInfo) return null;
      if (userInfo.includes(':')) return userInfo;
      try {
        const decoded = Base64.decode(userInfo.replace(/-/g, '+').replace(/_/g, '/'));
        if (decoded.includes(':')) return decoded;
      } catch (e) { }
      return null;
    };

    let method = null;
    let password = null;
    let host = null;
    let port = null;

    if (clean.includes('@')) {
      const [userPart, hostPart] = clean.split('@');
      const userInfo = parseUserInfo(userPart);
      if (!userInfo) throw Object.assign(new Error('Invalid ss user info'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
      const idx = userInfo.indexOf(':');
      method = userInfo.slice(0, idx);
      password = userInfo.slice(idx + 1);
      const lastColonIndex = hostPart.lastIndexOf(':');
      if (lastColonIndex < 0) throw Object.assign(new Error('Invalid ss host:port'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
      host = stripIpv6Brackets(hostPart.substring(0, lastColonIndex));
      port = Number(hostPart.substring(lastColonIndex + 1));
    } else {
      // Entire string may be base64 of method:pass@host:port
      let decoded = null;
      try {
        decoded = Base64.decode(clean.replace(/-/g, '+').replace(/_/g, '/'));
      } catch (e) { }
      if (!decoded || !decoded.includes('@') || !decoded.includes(':')) {
        throw Object.assign(new Error('Invalid ss format'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
      }
      const [userInfo, hostPart] = decoded.split('@');
      const idx = userInfo.indexOf(':');
      method = userInfo.slice(0, idx);
      password = userInfo.slice(idx + 1);
      const lastColonIndex = hostPart.lastIndexOf(':');
      if (lastColonIndex < 0) throw Object.assign(new Error('Invalid ss host:port'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
      host = stripIpv6Brackets(hostPart.substring(0, lastColonIndex));
      port = Number(hostPart.substring(lastColonIndex + 1));
    }

    const outbound = {
      type: 'shadowsocks',
      tag: outTag,
      server: host,
      server_port: port,
      method,
      password,
    };

    if (pluginParam) {
      const parts = String(pluginParam).split(';').map(s => s.trim()).filter(Boolean);
      const plugin = parts.length > 0 ? parts.shift() : '';
      const plugin_opts = parts.length > 0 ? parts.join(';') : '';
      if (plugin) outbound.plugin = plugin;
      if (plugin_opts) outbound.plugin_opts = plugin_opts;
    }

    return outbound;
  }

  if (raw.startsWith('vmess://')) {
    // vmess://BASE64(JSON)
    let jsonStr = '';
    try {
      const b64 = raw.replace('vmess://', '').trim();
      jsonStr = Base64.decode(b64.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) {
      throw Object.assign(new Error('Invalid vmess base64'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
    }

    let vmess;
    try {
      vmess = JSON.parse(jsonStr);
    } catch (e) {
      throw Object.assign(new Error('Invalid vmess json'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
    }

    const server = vmess.add;
    const port = Number(vmess.port);
    const uuid = vmess.id;
    const security = vmess.scy || 'auto';
    const network = vmess.net || 'tcp';

    const outbound = {
      type: 'vmess',
      tag: outTag,
      server,
      server_port: port,
      uuid,
      security,
      alter_id: Number(vmess.aid || 0),
      tls: undefined,
      transport: undefined,
    };

    const tls = vmess.tls === 'tls' ? 'tls' : 'none';
    if (tls === 'tls') {
      outbound.tls = {
        enabled: true,
        server_name: vmess.sni || vmess.host || server,
        insecure: true,
      };
    }

    if (network === 'ws') {
      outbound.transport = {
        type: 'ws',
        path: vmess.path || '/',
        headers: vmess.host ? { Host: vmess.host } : undefined,
      };
    } else if (network === 'grpc') {
      outbound.transport = {
        type: 'grpc',
        service_name: vmess.path || vmess.serviceName || '',
      };
    } else if (network === 'h2') {
      outbound.transport = {
        type: 'http',
        path: vmess.path || '/',
        host: vmess.host ? vmess.host.split(',') : undefined,
      };
    }

    return outbound;
  }

  throw Object.assign(new Error(`sing-box mapping not implemented for protocol: ${protocol}`), {
    code: 'SINGBOX_UNSUPPORTED_PROTOCOL',
  });
}

function buildSingboxConfigFromProxySpec(spec, localSocksPort, options = {}) {
  if (!spec || typeof spec !== 'object') throw new Error('Invalid ProxySpec');
  if (typeof localSocksPort !== 'number') throw new Error('Invalid localSocksPort');

  // Backward-compatible: allow passing preProxySpec directly as the 3rd argument.
  const opts = options && typeof options === 'object' && options.raw && options.schemaVersion
    ? { preProxySpec: options }
    : (options || {});

  // Minimal config: socks inbound + outbound(s)
  const config = {
    log: { level: 'warn' },
    inbounds: [
      {
        type: 'socks',
        tag: 'in-socks',
        listen: '127.0.0.1',
        listen_port: localSocksPort,
        sniff: true,
      },
    ],
    outbounds: [],
    route: {
      rules: [{ inbound: ['in-socks'], outbound: 'proxy' }],
      final: 'proxy',
    },
  };

  const preSpec = opts && opts.preProxySpec && typeof opts.preProxySpec === 'object' ? opts.preProxySpec : null;
  const raw = String(spec.raw || '').trim();

  // sb:// can embed one outbound OR a small bundle of outbounds (e.g. shadowsocks+shadowtls).
  if (raw.startsWith('sb://')) {
    const bundle = decodeSbPayload(raw);
    if (bundle && bundle.kind && Array.isArray(bundle.outbounds)) {
      const mainTag = isNonEmptyString(bundle.main) ? String(bundle.main) : 'proxy';
      const outbounds = bundle.outbounds
        .filter((o) => o && typeof o === 'object')
        .map((o, idx) => {
          const tag = isNonEmptyString(o.tag) ? String(o.tag) : (idx === 0 ? mainTag : `sb-${idx + 1}`);
          return { ...o, tag };
        });

      config.outbounds = outbounds;
      config.route.rules = [{ inbound: ['in-socks'], outbound: mainTag }];
      config.route.final = mainTag;

      if (preSpec) {
        const preOutbound = buildSingboxOutboundFromProxySpec(preSpec, 'pre');
        config.outbounds.unshift(preOutbound);
        applyPreProxyDetourToTail({ outbounds: config.outbounds, mainTag, preTag: 'pre' });
      }

      return config;
    }
    // Single-outbound payload is handled below by buildSingboxOutboundFromProxySpec.
  }

  const mainOutbound = buildSingboxOutboundFromProxySpec(spec, 'proxy');

  if (preSpec) {
    const preOutbound = buildSingboxOutboundFromProxySpec(preSpec, 'pre');
    // sing-box outbound chaining uses "detour"
    applyPreProxyDetourToTail({ outbounds: [mainOutbound], mainTag: 'proxy', preTag: 'pre' });
    config.outbounds.push(preOutbound, mainOutbound);
    return config;
  }

  config.outbounds.push(mainOutbound);
  return config;
}

module.exports = { buildSingboxConfigFromProxySpec };

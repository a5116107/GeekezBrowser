const { URL } = require('url');
const { Base64 } = require('js-base64');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseHttpOrSocksUrl(raw) {
  const u = new URL(raw);
  const username = u.username || '';
  const password = u.password || '';
  return {
    server: u.hostname,
    server_port: u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : u.protocol === 'http:' ? 80 : 1080),
    username: username || undefined,
    password: password || undefined,
  };
}

function buildSingboxConfigFromProxySpec(spec, localSocksPort) {
  if (!spec || typeof spec !== 'object') throw new Error('Invalid ProxySpec');
  if (typeof localSocksPort !== 'number') throw new Error('Invalid localSocksPort');

  // Minimal config: socks inbound + single outbound
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

  const raw = spec.raw || '';
  const protocol = spec.protocol || 'unknown';
  if (raw.startsWith('socks5://')) {
    const o = parseHttpOrSocksUrl(raw);
    config.outbounds.push({
      type: 'socks',
      tag: 'proxy',
      server: o.server,
      server_port: o.server_port,
      username: o.username,
      password: o.password,
    });
    return config;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const o = parseHttpOrSocksUrl(raw);
    config.outbounds.push({
      type: 'http',
      tag: 'proxy',
      server: o.server,
      server_port: o.server_port,
      username: o.username,
      password: o.password,
      tls: raw.startsWith('https://') ? { enabled: true } : undefined,
    });
    return config;
  }

  if (raw.startsWith('vless://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const transport = params.get('type') || 'tcp';
    const security = params.get('security') || 'none';

    const outbound = {
      type: 'vless',
      tag: 'proxy',
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      uuid: u.username,
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
      outbound.tls = {
        enabled: true,
        server_name: params.get('sni') || params.get('host') || u.hostname,
        insecure: true,
        reality: {
          enabled: true,
          public_key: params.get('pbk') || '',
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
    }

    config.outbounds.push(outbound);
    return config;
  }

  if (raw.startsWith('trojan://')) {
    const u = new URL(raw);
    const params = u.searchParams;
    const transport = params.get('type') || 'tcp';
    const security = params.get('security') || 'tls';

    const outbound = {
      type: 'trojan',
      tag: 'proxy',
      server: u.hostname,
      server_port: u.port ? Number(u.port) : 443,
      password: u.username,
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
    }

    config.outbounds.push(outbound);
    return config;
  }

  if (raw.startsWith('ss://')) {
    // Support both:
    // 1) ss://method:password@host:port
    // 2) ss://BASE64(method:password)@host:port
    // 3) ss://BASE64(method:password@host:port)
    let clean = raw.replace('ss://', '');
    if (clean.includes('#')) clean = clean.split('#')[0];

    // Remove optional plugin parameters after ?
    if (clean.includes('?')) clean = clean.split('?')[0];

    const parseUserInfo = (userInfo) => {
      if (!userInfo) return null;
      if (userInfo.includes(':')) return userInfo;
      try {
        const decoded = Base64.decode(userInfo.replace(/-/g, '+').replace(/_/g, '/'));
        if (decoded.includes(':')) return decoded;
      } catch (e) {}
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
      host = hostPart.substring(0, lastColonIndex);
      port = Number(hostPart.substring(lastColonIndex + 1));
    } else {
      // Entire string may be base64 of method:pass@host:port
      let decoded = null;
      try {
        decoded = Base64.decode(clean.replace(/-/g, '+').replace(/_/g, '/'));
      } catch (e) {}
      if (!decoded || !decoded.includes('@') || !decoded.includes(':')) {
        throw Object.assign(new Error('Invalid ss format'), { code: 'SINGBOX_UNSUPPORTED_PROTOCOL' });
      }
      const [userInfo, hostPart] = decoded.split('@');
      const idx = userInfo.indexOf(':');
      method = userInfo.slice(0, idx);
      password = userInfo.slice(idx + 1);
      const lastColonIndex = hostPart.lastIndexOf(':');
      host = hostPart.substring(0, lastColonIndex);
      port = Number(hostPart.substring(lastColonIndex + 1));
    }

    config.outbounds.push({
      type: 'shadowsocks',
      tag: 'proxy',
      server: host,
      server_port: port,
      method,
      password,
    });
    return config;
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
      tag: 'proxy',
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

    config.outbounds.push(outbound);
    return config;
  }

  throw Object.assign(new Error(`sing-box mapping not implemented for protocol: ${protocol}`), {
    code: 'SINGBOX_UNSUPPORTED_PROTOCOL',
  });
}

module.exports = { buildSingboxConfigFromProxySpec };

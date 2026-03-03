const { Base64 } = require('js-base64');
const { URL } = require('url');
const { normalizeProxySpec, normalizeProxyInputRaw } = require('./proxy/proxySpec');

function decodeBase64Content(str) {
    try {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(str, 'base64').toString('utf8');
    } catch (e) { return str; }
}

function safeDecodeUrlComponent(value) {
    try { return decodeURIComponent(String(value || '')); } catch (e) { return String(value || ''); }
}

function tryParseSocksProxyLoose(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    const m = raw.match(/^(socks5h?|socks5|socks):\/\/(.+)$/i);
    if (!m) return null;

    // Drop any path/query/fragment; we only care about authority.
    const authority = String(m[2] || '').split(/[/?#]/)[0];
    if (!authority) return null;

    const parseHostPortWithDefault = (token, defaultPort = 1080) => {
        const t = String(token || '').trim();
        if (!t) return null;

        if (t.startsWith('[')) {
            const close = t.indexOf(']');
            if (close < 0) return null;
            const host = t.slice(1, close).trim();
            const after = t.slice(close + 1);
            if (!after) return { host, port: defaultPort };
            if (!after.startsWith(':')) return null;
            const portStr = after.slice(1).trim();
            const port = Number(portStr);
            if (!Number.isFinite(port) || port <= 0 || port > 65535) return null;
            return { host, port };
        }

        const colonCount = (t.match(/:/g) || []).length;
        if (colonCount === 0) return { host: t, port: defaultPort };

        // If it looks like an unbracketed IPv6 with a trailing port, split on the last colon.
        const idx = colonCount > 1 ? t.lastIndexOf(':') : t.indexOf(':');
        const host = t.slice(0, idx).trim();
        const portStr = t.slice(idx + 1).trim();
        if (!portStr) return { host, port: defaultPort };
        const port = Number(portStr);
        if (!Number.isFinite(port) || port <= 0 || port > 65535) return null;
        return { host, port };
    };

    const parseUserPass = (userinfo) => {
        const u = String(userinfo || '').trim();
        if (!u) return { user: '', pass: '' };
        const idx = u.indexOf(':');
        const userRaw = idx >= 0 ? u.slice(0, idx) : u;
        const passRaw = idx >= 0 ? u.slice(idx + 1) : '';
        return { user: safeDecodeUrlComponent(userRaw), pass: safeDecodeUrlComponent(passRaw) };
    };

    // Standard URL form: userinfo@host:port
    const at = authority.lastIndexOf('@');
    if (at >= 0) {
        const userinfo = authority.slice(0, at);
        const hostToken = authority.slice(at + 1);
        const hp = parseHostPortWithDefault(hostToken, 1080);
        if (!hp || !hp.host) return null;

        let { user, pass } = parseUserPass(userinfo);

        // v2rayN style: socks://BASE64(user:pass)@host:port
        if (user && !pass) {
            const decoded = decodeBase64Content(user);
            const idx = decoded.indexOf(':');
            if (idx !== -1) {
                user = decoded.substring(0, idx);
                pass = decoded.substring(idx + 1);
            }
        }

        return { address: hp.host, port: hp.port, user, pass };
    }

    // Provider style: socks5://host:port:user:pass (username may contain spaces)
    let host = '';
    let port = null;
    let remainder = '';
    const t = authority.trim();

    if (t.startsWith('[')) {
        const close = t.indexOf(']');
        if (close < 0) return null;
        host = t.slice(1, close).trim();
        let after = t.slice(close + 1);
        if (after.startsWith(':')) after = after.slice(1);
        if (!after) return { address: host, port: 1080, user: '', pass: '' };
        const mm = after.match(/^(\d{1,5})(?::(.*))?$/);
        if (!mm) return null;
        port = Number(mm[1]);
        remainder = mm[2] || '';
    } else {
        const firstColon = t.indexOf(':');
        if (firstColon < 0) return { address: t, port: 1080, user: '', pass: '' };
        host = t.slice(0, firstColon).trim();
        const after = t.slice(firstColon + 1);
        const mm = after.match(/^(\d{1,5})(?::(.*))?$/);
        if (!mm) return null;
        port = Number(mm[1]);
        remainder = mm[2] || '';
    }

    if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) return null;

    if (!remainder) return { address: host, port, user: '', pass: '' };
    const lastColon = remainder.lastIndexOf(':');
    const userRaw = lastColon >= 0 ? remainder.slice(0, lastColon).trim() : remainder.trim();
    let passRaw = lastColon >= 0 ? remainder.slice(lastColon + 1).trim() : '';
    if (passRaw) passRaw = passRaw.split(/\s+/)[0];
    return { address: host, port, user: safeDecodeUrlComponent(userRaw), pass: safeDecodeUrlComponent(passRaw) };
}

function getProxyRemark(link) {
    if (!link) return '';
    link = link.trim();
    try {
        if (link.startsWith('vmess://')) {
            const base64Str = link.replace('vmess://', '');
            const configStr = decodeBase64Content(base64Str);
            const vmess = JSON.parse(configStr);
            return vmess.ps || '';
        } else if (link.includes('#')) {
            return decodeURIComponent(link.split('#')[1]).trim();
        }
    } catch (e) { return ''; }
    return '';
}

function parseProxyLink(link, tag) {
    let outbound = {
        tag: tag,
        sniffing: {
            enabled: true,
            destOverride: ["http", "tls", "quic"],
            routeOnly: true
        }
    };
    link = normalizeProxyInputRaw(link);
    if (!link) {
        const e = new Error('Proxy input is empty');
        e.code = 'PROXY_LINK_EMPTY';
        throw e;
    }
    const lower = link.toLowerCase();

    try {
        if (lower.startsWith('vmess://')) {
            const base64Str = link.replace(/^vmess:\/\//i, '');
            const configStr = decodeBase64Content(base64Str);
            const vmess = JSON.parse(configStr);

            outbound.protocol = "vmess";
            outbound.settings = {
                vnext: [{
                    address: vmess.add, port: parseInt(vmess.port),
                    users: [{ id: vmess.id, alterId: parseInt(vmess.aid || 0), security: vmess.scy || "auto" }]
                }]
            };

            const net = vmess.net || "tcp";
            outbound.streamSettings = {
                network: net,
                security: vmess.tls || "none",
                wsSettings: net === "ws" ? { path: vmess.path, headers: { Host: vmess.host } } : undefined,
                grpcSettings: net === "grpc" ? { serviceName: vmess.path || vmess.serviceName } : undefined,
                httpSettings: net === "h2" ? { path: vmess.path, host: vmess.host ? vmess.host.split(',') : [] } : undefined,
                kcpSettings: net === "kcp" ? { header: { type: vmess.type || "none" }, seed: vmess.path } : undefined,
                quicSettings: net === "quic" ? { security: vmess.host, key: vmess.path, header: { type: vmess.type } } : undefined
            };

            if (vmess.tls === 'tls') {
                outbound.streamSettings.tlsSettings = {
                    serverName: vmess.sni || vmess.host,
                    fingerprint: "chrome",
                    alpn: vmess.alpn ? vmess.alpn.split(',') : undefined
                };
            }
        }
        else if (lower.startsWith('vless://')) {
            const urlObj = new URL(link);
            const params = urlObj.searchParams;
            const security = params.get("security") || "none";
            let type = params.get("type") || "tcp";
            const port = (urlObj.port && Number.isFinite(parseInt(urlObj.port))) ? parseInt(urlObj.port) : 443;

            outbound.protocol = "vless";
            outbound.settings = {
                vnext: [{
                    address: urlObj.hostname,
                    port: port,
                    users: [{
                        id: safeDecodeUrlComponent(urlObj.username),
                        encryption: params.get("encryption") || "none",
                        flow: params.get("flow") || ""
                    }]
                }]
            };

            outbound.streamSettings = { network: type, security: security };

            if (type === 'ws') {
                outbound.streamSettings.wsSettings = { path: params.get("path"), headers: { Host: params.get("host") } };
            } else if (type === 'grpc') {
                outbound.streamSettings.grpcSettings = { serviceName: params.get("serviceName") };
            } else if (type === 'xhttp' || type === 'splithttp') {
                outbound.streamSettings.network = "xhttp";
                outbound.streamSettings.xhttpSettings = {
                    path: params.get("path") || "/",
                    host: params.get("host") || "",
                    mode: params.get("mode") || "stream-up"
                };
            } else if (type === 'kcp') {
                outbound.streamSettings.kcpSettings = { header: { type: params.get("headerType") || "none" }, seed: params.get("seed") };
            } else if (type === 'h2') {
                outbound.streamSettings.httpSettings = { path: params.get("path") || "/", host: params.get("host") ? params.get("host").split(',') : [] };
            }

            if (security === 'tls') {
                outbound.streamSettings.tlsSettings = {
                    serverName: params.get("sni") || params.get("host") || urlObj.hostname,
                    fingerprint: params.get("fp") || "chrome",
                    alpn: params.get("alpn") ? params.get("alpn").split(',') : undefined
                };
            } else if (security === 'reality') {
                outbound.streamSettings.realitySettings = {
                    show: false,
                    fingerprint: params.get("fp") || "chrome",
                    serverName: params.get("sni") || params.get("host") || "",
                    publicKey: params.get("pbk") || "",
                    shortId: params.get("sid") || "",
                    spiderX: params.get("spx") || ""
                };
            }
        }
        else if (lower.startsWith('trojan://')) {
            const urlObj = new URL(link);
            const params = urlObj.searchParams;
            const type = params.get("type") || "tcp";
            const port = (urlObj.port && Number.isFinite(parseInt(urlObj.port))) ? parseInt(urlObj.port) : 443;

            outbound.protocol = "trojan";
            outbound.settings = { servers: [{ address: urlObj.hostname, port: port, password: safeDecodeUrlComponent(urlObj.username) }] };
            outbound.streamSettings = {
                network: type,
                security: params.get("security") || "tls",
                tlsSettings: { serverName: params.get("sni") || urlObj.hostname, fingerprint: "chrome" },
                wsSettings: type === 'ws' ? { path: params.get("path"), headers: { Host: params.get("host") } } : undefined,
                grpcSettings: type === 'grpc' ? { serviceName: params.get("serviceName") } : undefined
            };
        }
        else if (lower.startsWith('ss://')) {
            let raw = link.replace(/^ss:\/\//i, '');
            if (raw.includes('#')) raw = raw.split('#')[0];
            let method, password, host, port;

            // Handle new ss format (user:pass@host:port) and legacy format (base64)
            if (raw.includes('@')) {
                const parts = raw.split('@');
                const userPart = parts[0];
                const hostPart = parts[1];

                // Check if userPart is base64 encoded (legacy with @) or plain text
                // Shadowsocks-2022 often uses long keys which might look like base64 but are just strings
                // A simple heuristic: if it contains ':', it's likely method:password. 
                // If it doesn't, it might be base64 encoded method:password
                if (!userPart.includes(':')) {
                    try {
                        const decoded = decodeBase64Content(userPart);
                        if (decoded.includes(':')) {
                            [method, password] = decoded.split(':');
                        } else {
                            // Fallback or error
                            throw new Error("Invalid SS User Part");
                        }
                    } catch (e) {
                        // Maybe it's not base64, but just a password? Unlikely for standard SS links
                        throw e;
                    }
                } else {
                    [method, password] = userPart.split(':');
                }

                // Host part might be ipv6 [::1]:port or ipv4:port
                const lastColonIndex = hostPart.lastIndexOf(':');
                host = hostPart.substring(0, lastColonIndex);
                port = hostPart.substring(lastColonIndex + 1);

                // Remove brackets from IPv6
                if (host.startsWith('[') && host.endsWith(']')) {
                    host = host.slice(1, -1);
                }
            } else {
                // Legacy base64 encoded link
                const decoded = decodeBase64Content(raw);
                const match = decoded.match(/^(.*?):(.*?)@(.*?):(\d+)$/);
                if (match) {
                    [, method, password, host, port] = match;
                } else {
                    const parts = decoded.split(':');
                    if (parts.length >= 3) {
                        method = parts[0];
                        password = parts[1];
                        host = parts[2];
                        port = parts[3];
                    }
                }
            }

            outbound.protocol = "shadowsocks";
            outbound.settings = {
                servers: [{
                    address: host,
                    port: parseInt(port),
                    method: method,
                    password: password,
                    ota: false,
                    level: 1
                }]
            };
            // Shadowsocks streamSettings
            outbound.streamSettings = {
                network: "tcp"
            };
            // Mux 配置
            outbound.mux = {
                enabled: false,
                concurrency: -1
            };
        } else if (lower.startsWith('socks')) {
            outbound.protocol = "socks";

            // Support:
            // 1) Standard: socks5://user:pass@host:port
            // 2) v2rayN:  socks://BASE64(user:pass)@host:port#remark
            // 3) Provider: socks5://host:port:user(with space):pass
            // 4) No auth: socks5://host:port
            const parsed = tryParseSocksProxyLoose(link);
            if (!parsed) {
                const err = new Error('Invalid socks proxy URL');
                err.code = 'PROXY_SOCKS_URL_INVALID';
                throw err;
            }

            const address = parsed.address;
            const port = Number.isFinite(parsed.port) ? parsed.port : 1080;
            const username = parsed.user || '';
            const password = parsed.pass || '';

            outbound.settings = {
                servers: [{
                    address,
                    port,
                    users: username ? [{ user: username, pass: password || '' }] : []
                }]
            };
        } else if (link.includes(':') && !link.includes('://')) {
            // Handle IP:Port:User:Pass format (e.g., 107.150.98.193:1536:user:pass)
            const parts = link.split(':');
            if (parts.length === 4) {
                outbound.protocol = "socks";
                outbound.settings = {
                    servers: [{
                        address: parts[0],
                        port: parseInt(parts[1]),
                        users: [{ user: parts[2], pass: parts[3] }]
                    }]
                };
            } else if (parts.length === 2) {
                // IP:Port without auth
                outbound.protocol = "socks";
                outbound.settings = {
                    servers: [{
                        address: parts[0],
                        port: parseInt(parts[1]),
                        users: []
                    }]
                };
            } else {
                throw new Error("Invalid IP:Port:User:Pass format");
            }
        } else if (lower.startsWith('http://') || lower.startsWith('https://')) {
            const urlObj = new URL(link);
            const port = (urlObj.port && Number.isFinite(parseInt(urlObj.port))) ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
            outbound.protocol = "http";
            outbound.settings = {
                servers: [{
                    address: urlObj.hostname,
                    port,
                    users: urlObj.username ? [{ user: safeDecodeUrlComponent(urlObj.username), pass: safeDecodeUrlComponent(urlObj.password) }] : []
                }]
            };
            if (urlObj.protocol === 'https:') {
                outbound.streamSettings = {
                    network: 'tcp',
                    security: 'tls',
                    tlsSettings: { serverName: urlObj.hostname, fingerprint: "chrome" },
                };
            }
        } else { throw new Error("Unsupported protocol"); }
    } catch (e) { console.error("Parse Proxy Error:", link, e); throw e; }
    return outbound;
}

function parseProxySpec(spec, tag) {
    if (!spec || typeof spec !== 'object') throw new Error('Invalid ProxySpec');
    if (spec.protocol && spec.protocol !== 'unknown' && spec.protocol !== 'shadowsocks') {
        // For URL-based and vless/trojan styles, reuse existing parseProxyLink by feeding raw
        return parseProxyLink(spec.raw, tag);
    }
    return parseProxyLink(spec.raw, tag);
}

function generateXrayConfig(mainProxyStr, localPort, preProxyConfig = null) {
    const outbounds = [];
    let mainOutbound;
    try {
        const spec = normalizeProxySpec(mainProxyStr);
        mainOutbound = parseProxySpec(spec, "proxy_main");
    }
    catch (e) { mainOutbound = { protocol: "freedom", tag: "proxy_main" }; }

    if (preProxyConfig && preProxyConfig.preProxies && preProxyConfig.preProxies.length > 0) {
        try {
            const target = preProxyConfig.preProxies[0];
            const preOutbound = parseProxyLink(target.url, "proxy_pre");
            outbounds.push(preOutbound);
            mainOutbound.proxySettings = { tag: "proxy_pre" };
        } catch (e) { }
    }

    outbounds.push(mainOutbound);
    outbounds.push({ protocol: "freedom", tag: "direct" });

    return {
        log: { loglevel: "warning" },
        inbounds: [{ port: localPort, listen: "127.0.0.1", protocol: "socks", settings: { udp: true } }],
        outbounds: outbounds,
        routing: {
            domainStrategy: "IPIfNonMatch",
            rules: [{ type: "field", outboundTag: "proxy_main", port: "0-65535" }]
        }
    };
}

module.exports = { generateXrayConfig, parseProxyLink, parseProxySpec, getProxyRemark };

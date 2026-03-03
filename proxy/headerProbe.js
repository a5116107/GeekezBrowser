const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { normalizeProxyInputRaw } = require('./proxySpec');

function fetchJson(url, timeoutMs, agent) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'GeekEZ-Browser-HeaderProbe' }, agent },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, json: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Timeout'));
    });
  });
}

function agentFromProxyStr(proxyStr) {
  if (!proxyStr) return null;
  const s = normalizeProxyInputRaw(proxyStr);
  if (!s) return null;
  if (s.startsWith('socks5://') || s.startsWith('socks://')) {
    const u = s
      .replace(/^socks:\/\//i, 'socks5h://')
      .replace(/^socks5:\/\//i, 'socks5h://');
    return new SocksProxyAgent(u);
  }
  if (s.startsWith('http://') || s.startsWith('https://')) return undefined; // not supported here
  return null;
}

async function probeOutboundHeaders({ timeoutMs = 8000, agent = undefined, proxyStr = null } = {}) {
  const proxyAgent = agent || agentFromProxyStr(proxyStr);
  const res = await fetchJson('https://httpbin.org/headers', timeoutMs, proxyAgent);
  const headers = res && res.json && res.json.headers ? res.json.headers : {};
  return {
    userAgent: headers['User-Agent'] || headers['User-agent'] || null,
    acceptLanguage: headers['Accept-Language'] || headers['Accept-language'] || null,
    secChUa: headers['Sec-Ch-Ua'] || headers['sec-ch-ua'] || null,
    secChUaPlatform: headers['Sec-Ch-Ua-Platform'] || headers['sec-ch-ua-platform'] || null,
    secChUaMobile: headers['Sec-Ch-Ua-Mobile'] || headers['sec-ch-ua-mobile'] || null
  };
}

module.exports = { probeOutboundHeaders };

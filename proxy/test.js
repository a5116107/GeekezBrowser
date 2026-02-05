const http = require('http');
const https = require('https');

function fetchJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'GeekEZBrowser-ProxyTest', 'Accept': 'application/json,*/*' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout')));
  });
}

async function probePublicIp(timeoutMs) {
  const ipify = await fetchJson('https://api.ipify.org?format=json', timeoutMs);
  return ipify && typeof ipify.ip === 'string' ? ipify.ip : null;
}

async function probeGeo(timeoutMs) {
  const ipapi = await fetchJson('https://ipapi.co/json/', timeoutMs);
  return {
    ip: typeof ipapi.ip === 'string' ? ipapi.ip : null,
    country: typeof ipapi.country === 'string' ? ipapi.country : null,
    region: typeof ipapi.region === 'string' ? ipapi.region : null,
    city: typeof ipapi.city === 'string' ? ipapi.city : null,
    asn: typeof ipapi.asn === 'string' ? ipapi.asn : null,
    isp: typeof ipapi.org === 'string' ? ipapi.org : null,
    timezone: typeof ipapi.timezone === 'string' ? ipapi.timezone : null,
    latitude: typeof ipapi.latitude === 'number' ? ipapi.latitude : null,
    longitude: typeof ipapi.longitude === 'number' ? ipapi.longitude : null,
  };
}

module.exports = { probePublicIp, probeGeo };


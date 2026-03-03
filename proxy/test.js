const http = require('http');
const https = require('https');

function fetchJson(url, timeoutMs, agent) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'GeekEZBrowser-ProxyTest', 'Accept': 'application/json,*/*' }, agent },
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

async function probePublicIp(timeoutMs, agent) {
  const ipify = await fetchJson('https://api.ipify.org?format=json', timeoutMs, agent);
  return ipify && typeof ipify.ip === 'string' ? ipify.ip : null;
}

async function probeGeo(timeoutMs, agent) {
  const ipapi = await fetchJson('https://ipapi.co/json/', timeoutMs, agent);
  const countryCode = typeof ipapi.country === 'string'
    ? ipapi.country
    : (typeof ipapi.country_code === 'string' ? ipapi.country_code : null);
  const countryName = typeof ipapi.country_name === 'string' ? ipapi.country_name : null;
  return {
    ip: typeof ipapi.ip === 'string' ? ipapi.ip : null,
    // Keep "country" as the ISO-3166 alpha-2 code for compatibility.
    country: countryCode,
    countryCode,
    countryName,
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

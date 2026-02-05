const https = require('https');

function fetchJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'GeekEZ-Browser-LeakCheck' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(Object.assign(new Error(`Invalid JSON from ${url}`), { code: 'LEAKCHECK_NAVIGATION_FAILED' }));
          }
        });
      }
    );
    req.on('error', (e) => reject(Object.assign(e, { code: 'LEAKCHECK_NAVIGATION_FAILED' })));
    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error(`Timeout fetching ${url}`), { code: 'LEAKCHECK_TIMEOUT' }));
    });
  });
}

async function runIpProbe({ report, timeouts }) {
  const timeoutMs = Math.min(timeouts.perUrlNavigationMs || 15000, timeouts.totalMs || 90000);

  // 1) ipify for public IP
  try {
    const ipify = await fetchJson('https://api.ipify.org?format=json', timeoutMs);
    if (ipify && typeof ipify.ip === 'string') report.ip.publicIp = ipify.ip;
    report.ip.source = 'httpbin';
  } catch (e) {
    // keep going; ipapi might still work
    report.raw.samples = report.raw.samples || {};
    report.raw.samples.ipifyError = e && e.message ? e.message : String(e);
  }

  // 2) ipapi for geo/asn (rate limits possible)
  try {
    const ipapi = await fetchJson('https://ipapi.co/json/', timeoutMs);
    if (ipapi && typeof ipapi.ip === 'string') report.ip.publicIp = report.ip.publicIp || ipapi.ip;
    report.ip.country = typeof ipapi.country === 'string' ? ipapi.country : report.ip.country;
    report.ip.region = typeof ipapi.region === 'string' ? ipapi.region : report.ip.region;
    report.ip.city = typeof ipapi.city === 'string' ? ipapi.city : report.ip.city;
    report.ip.asn = typeof ipapi.asn === 'string' ? ipapi.asn : report.ip.asn;
    report.ip.isp = typeof ipapi.org === 'string' ? ipapi.org : report.ip.isp;
    report.ip.source = 'ipapi';
  } catch (e) {
    report.raw.samples = report.raw.samples || {};
    report.raw.samples.ipapiError = e && e.message ? e.message : String(e);
  }
}

module.exports = {
  name: 'ip',
  run: runIpProbe,
};


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

async function runHeadersProbe({ report, timeouts }) {
  const timeoutMs = Math.min(timeouts.perUrlNavigationMs || 15000, timeouts.totalMs || 90000);

  const data = await fetchJson('https://httpbin.org/headers', timeoutMs);
  const headers = data && data.headers ? data.headers : {};

  const ua = headers['User-Agent'] || headers['User-agent'];
  const al = headers['Accept-Language'] || headers['Accept-language'];
  const secChUa = headers['Sec-Ch-Ua'] || headers['sec-ch-ua'];
  const secChUaPlatform = headers['Sec-Ch-Ua-Platform'] || headers['sec-ch-ua-platform'];
  const secChUaMobile = headers['Sec-Ch-Ua-Mobile'] || headers['sec-ch-ua-mobile'];

  report.headers.userAgent = typeof ua === 'string' ? ua : report.headers.userAgent;
  report.headers.acceptLanguage = typeof al === 'string' ? al : report.headers.acceptLanguage;
  report.headers.secChUa = typeof secChUa === 'string' ? secChUa : report.headers.secChUa;
  report.headers.secChUaPlatform = typeof secChUaPlatform === 'string' ? secChUaPlatform : report.headers.secChUaPlatform;
  report.headers.secChUaMobile = typeof secChUaMobile === 'string' ? secChUaMobile : report.headers.secChUaMobile;

  report.raw.urls = Array.isArray(report.raw.urls) ? report.raw.urls : [];
  if (!report.raw.urls.includes('https://httpbin.org/headers')) report.raw.urls.push('https://httpbin.org/headers');

  // DNS leak signal (conservative):
  // We avoid declaring ok/leak without a controlled probe, but record a hint so operators
  // understand why dns.status may stay "unknown" even when proxy is healthy.
  try {
    report.dns.evidence = Array.isArray(report.dns.evidence) ? report.dns.evidence : [];
    if (report.proxy && (report.proxy.mode === 'app_proxy' || report.proxy.mode === 'system_proxy')) {
      report.dns.evidence.push('dns status is conservative: requires controlled DNS probe to confirm ok/leak');
    }
  } catch (e) { }
}

module.exports = {
  name: 'headers',
  run: runHeadersProbe,
};

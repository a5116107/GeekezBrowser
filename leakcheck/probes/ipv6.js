const https = require('https');

function fetchText(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 8000, () => {
      req.destroy(Object.assign(new Error('timeout'), { code: 'LEAKCHECK_TIMEOUT' }));
    });
  });
}

async function run({ report, timeouts }) {
  if (!report || !report.ipv6) return;
  const urls = [
    'https://api64.ipify.org',
    'https://ipv6.icanhazip.com',
  ];

  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { status, text } = await fetchText(url, timeouts?.perUrlCollectMs || 8000);
      if (status >= 200 && status < 300) {
        const ip = String(text || '').trim();
        if (ip) {
          report.ipv6.hasIpv6 = true;
          report.ipv6.publicIpv6 = ip;
          report.ipv6.evidence = report.ipv6.evidence || [];
          report.ipv6.evidence.push(`public ipv6 observed via ${url}`);
          // Without policy input we cannot classify leak vs ok deterministically.
          report.ipv6.status = 'unknown';
          return;
        }
      }
    } catch (e) {
      report.ipv6.evidence = report.ipv6.evidence || [];
      report.ipv6.evidence.push(`ipv6 probe failed via ${url}: ${e.message}`);
    }
  }

  report.ipv6.hasIpv6 = false;
  report.ipv6.status = 'unknown';
}

module.exports = { name: 'ipv6', run };


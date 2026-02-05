const { normalizeFingerprintSpec } = require('../fingerprint');

function main() {
  const profile = {
    fingerprint: normalizeFingerprintSpec({
      platform: 'Win32',
      cdp: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Safari/537.36'
      }
    })
  };

  const meta = profile.fingerprint.cdp.userAgentMetadata;
  const brandsOk = Array.isArray(meta.brands) && meta.brands.length >= 2 && meta.brands.some(b => String(b.brand).includes('Chromium'));
  const fullOk = Array.isArray(meta.fullVersionList) ? meta.fullVersionList.some(b => String(b.version).includes('121.0.6167.85')) : true;
  const ok = brandsOk && fullOk;
  console.log(JSON.stringify({ ok, meta }, null, 2));
}

main();


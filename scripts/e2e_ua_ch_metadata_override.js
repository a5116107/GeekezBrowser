const { normalizeFingerprintSpec } = require('../fingerprint');
const { evaluateUaChConsistency } = require('../proxy/uaConsistency');

function main() {
  const profile = {
    fingerprint: normalizeFingerprintSpec({
      platform: 'MacIntel',
      cdp: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Safari/537.36',
        userAgentMetadata: { platform: 'macOS', platformVersion: '13.6', architecture: 'x86', bitness: '64' }
      }
    })
  };

  const meta = profile.fingerprint.cdp.userAgentMetadata;
  const issues = evaluateUaChConsistency({ profile, headers: { userAgent: profile.fingerprint.cdp.userAgent, secChUaPlatform: '"macOS"' } });

  const ok = meta.platformVersion === '13.6' && Array.isArray(issues) && !issues.some(i => i.code === 'UA_CH_PLATFORMVERSION_INVALID');
  console.log(JSON.stringify({ ok, meta, issues }, null, 2));
}

main();


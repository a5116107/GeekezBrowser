const { evaluateUaChConsistency } = require('../proxy/uaConsistency');
const { normalizeFingerprintSpec } = require('../fingerprint');

function main() {
  const profile = {
    fingerprint: normalizeFingerprintSpec({
      platform: 'Win32',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      cdp: {
        locale: 'en-US',
        timezoneId: 'America/Los_Angeles',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        userAgentMetadata: { platform: 'Windows', architecture: 'x86', bitness: '64' }
      }
    })
  };

  const okHeaders = { userAgent: profile.fingerprint.cdp.userAgent, secChUaPlatform: '"Windows"' };
  const badHeaders = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', secChUaPlatform: '"macOS"' };

  const okIssues = evaluateUaChConsistency({ profile, headers: okHeaders });
  const badIssues = evaluateUaChConsistency({ profile, headers: badHeaders });

  const defaultsProfile = { fingerprint: normalizeFingerprintSpec({ platform: 'Win32' }) };
  const meta = defaultsProfile.fingerprint && defaultsProfile.fingerprint.cdp ? defaultsProfile.fingerprint.cdp.userAgentMetadata : null;
  const defaultsOk = meta &&
    meta.platform === 'Windows' &&
    (meta.architecture === 'x86' || meta.architecture === 'arm') &&
    (meta.bitness === '64' || meta.bitness === '32') &&
    typeof meta.platformVersion === 'string' &&
    meta.platformVersion.length > 0 &&
    (meta.brands === undefined || Array.isArray(meta.brands));

  const macDefaults = { fingerprint: normalizeFingerprintSpec({ platform: 'MacIntel' }) };
  const macMeta = macDefaults.fingerprint && macDefaults.fingerprint.cdp ? macDefaults.fingerprint.cdp.userAgentMetadata : null;
  const macOk = macMeta && macMeta.platform === 'macOS' && macMeta.platformVersion === '';

  const ok = Array.isArray(okIssues) && okIssues.length === 0 && Array.isArray(badIssues) && badIssues.some(i => i.code === 'UA_PLATFORM_MISMATCH' || i.code === 'UA_CH_PLATFORM_MISMATCH') && defaultsOk && macOk;
  console.log(JSON.stringify({ ok, defaultsOk, macOk, defaultsMeta: meta, macMeta, okIssues, badIssues }, null, 2));
}

main();

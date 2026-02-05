const { normalizeFingerprintSpec } = require('../fingerprint');
const { applyConsistencyPolicy } = require('../proxy/consistency');

function main() {
  const profile = {
    id: 'p-e2e',
    fingerprint: normalizeFingerprintSpec({
      timezone: 'America/Los_Angeles',
      cdp: { timezoneId: 'America/Los_Angeles', locale: 'en-US' }
    }),
    proxyPolicy: { consistencyPolicy: { enforce: true, onMismatch: 'block' } }
  };

  const proxyTestResult = {
    ok: true,
    geo: { timezone: 'Europe/London', country: 'United Kingdom' }
  };

  const block = applyConsistencyPolicy({
    profile,
    proxyTestResult,
    policy: profile.proxyPolicy.consistencyPolicy
  });

  const autofix = applyConsistencyPolicy({
    profile,
    proxyTestResult,
    policy: { enforce: true, onMismatch: 'autofix' }
  });

  console.log(JSON.stringify({ block, autofix }, null, 2));
}

main();


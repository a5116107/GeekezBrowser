const { applyProxyGeoToFingerprint } = require('../proxy/linkFingerprint');
const { applyConsistencyPolicy } = require('../proxy/consistency');
const { normalizeFingerprintSpec } = require('../fingerprint');

function assert(cond, message) {
  if (!cond) {
    const err = new Error(message || 'assert failed');
    err.code = 'ASSERT_FAIL';
    throw err;
  }
}

function main() {
  const baseProfile = {
    id: 'p-test',
    fingerprint: normalizeFingerprintSpec({
      timezone: 'Auto (IP Based)',
      geo: 'auto',
      language: 'auto',
      cdp: { timezoneId: '', geoCountry: '', locale: '' }
    }),
    proxyPolicy: { autoLink: true, consistencyPolicy: { enforce: true, onMismatch: 'autofix' }, allowAutofix: { geo: true, language: true } }
  };

  const proxyTestResult = {
    ok: true,
    geo: { timezone: 'Europe/London', country: 'United Kingdom' }
  };

  const linked = applyProxyGeoToFingerprint(baseProfile, proxyTestResult, baseProfile.proxyPolicy.consistencyPolicy);
  assert(linked.updatedProfile.fingerprint.timezone === 'Europe/London', 'timezone should be autofixed from proxy geo');
  assert(linked.updatedProfile.fingerprint.geo === 'United Kingdom', 'geo should be autofixed from proxy geo country');
  assert(linked.updatedProfile.fingerprint.cdp.geoCountry === 'United Kingdom', 'cdp.geoCountry should be set');
  assert(linked.updatedProfile.fingerprint.cdp.locale === 'en-GB', 'locale should be autofilled for UK');

  const gated = applyConsistencyPolicy({ profile: linked.updatedProfile, proxyTestResult, policy: baseProfile.proxyPolicy.consistencyPolicy });
  assert(gated.ok === true, 'consistency gate should pass after autofix');

  // block mode should fail when mismatch remains
  const mismatchProfile = {
    id: 'p-mismatch',
    fingerprint: normalizeFingerprintSpec({
      timezone: 'America/Los_Angeles',
      geo: 'United States',
      cdp: { timezoneId: 'America/Los_Angeles', geoCountry: 'United States', locale: 'en-US' }
    }),
    proxyPolicy: { autoLink: false, consistencyPolicy: { enforce: true, onMismatch: 'block' } }
  };

  const blockGate = applyConsistencyPolicy({ profile: mismatchProfile, proxyTestResult, policy: mismatchProfile.proxyPolicy.consistencyPolicy });
  assert(blockGate.ok === false, 'block policy should fail on mismatch');

  // allowAutofix can disable geo/language updates in link phase (even if onMismatch=autofix)
  const restrictedProfile = {
    id: 'p-restrict',
    fingerprint: normalizeFingerprintSpec({
      timezone: 'Auto (IP Based)',
      geo: 'auto',
      language: 'auto',
      cdp: { timezoneId: '', geoCountry: '', locale: '' }
    }),
    proxyPolicy: { autoLink: true, consistencyPolicy: { enforce: true, onMismatch: 'autofix' }, allowAutofix: { geo: false, language: false } }
  };
  const restricted = applyProxyGeoToFingerprint(restrictedProfile, proxyTestResult, { ...restrictedProfile.proxyPolicy.consistencyPolicy, allowAutofix: restrictedProfile.proxyPolicy.allowAutofix });
  assert(restricted.updatedProfile.fingerprint.timezone === 'Europe/London', 'timezone should still be autofixed');
  assert(restricted.updatedProfile.fingerprint.geo === 'United Kingdom', 'geo should still be autofixed because fingerprint geo is auto');
  assert(restricted.updatedProfile.fingerprint.language === 'en-US', 'language autofix can be disabled via allowAutofix.language=false');

  console.log('[ok] proxy autolink + consistency policy regression passed');
}

main();

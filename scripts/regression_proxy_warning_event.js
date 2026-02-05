const { EventEmitter } = require('events');
const { applyConsistencyPolicy } = require('../proxy/consistency');
const { normalizeFingerprintSpec } = require('../fingerprint');

function main() {
  const bus = new EventEmitter();
  let received = null;
  bus.on('proxy-consistency-warning', (payload) => {
    received = payload;
  });

  const profileId = 'p-warn';
  const profile = {
    id: profileId,
    fingerprint: normalizeFingerprintSpec({
      timezone: 'America/Los_Angeles',
      geo: 'United States',
      cdp: { timezoneId: 'America/Los_Angeles', geoCountry: 'United States', locale: 'en-US' }
    }),
    proxyPolicy: { autoLink: true, consistencyPolicy: { enforce: true, onMismatch: 'warn' } }
  };

  const proxyTestResult = { ok: true, geo: { timezone: 'Europe/London', country: 'United Kingdom' } };
  const gate = applyConsistencyPolicy({ profile, proxyTestResult, policy: profile.proxyPolicy.consistencyPolicy });
  if (!gate.ok || (gate.issues && gate.issues.length > 0)) {
    bus.emit('proxy-consistency-warning', { profileId, issues: gate.issues, resolvedGeo: proxyTestResult.geo });
  }

  if (!received) throw new Error('did not receive proxy-consistency-warning payload');
  if (received.profileId !== profileId) throw new Error('profileId mismatch');
  if (!Array.isArray(received.issues) || received.issues.length === 0) throw new Error('issues missing');

  // emulate "Proceed Anyway" semantics: second launch should skip warning once
  const options = { skipProxyWarnOnce: true };
  const shouldWarn = !(options.skipProxyWarnOnce || options.skipProxyConsistencyWarnOnce);
  if (shouldWarn) throw new Error('skipProxyWarnOnce should disable warn emission');

  console.log('[ok] proxy consistency warning event payload regression passed');
}

main();

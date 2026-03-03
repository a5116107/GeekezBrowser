/* eslint-disable no-console */
const assert = require('assert');
const {
  resolveProbeProfile,
  limitProbeCount,
  getDefaultConnectivityProbes,
  getMaxConnectivityProbeCount,
} = require('../proxy/probeProfiles');

function testDefaultProfile() {
  const profile = resolveProbeProfile('unknown', { profile: 'standard' });
  assert.strictEqual(profile.profile, 'standard');
  assert.strictEqual(profile.probes.length >= 4, true, 'default profile should expose baseline probes');
  assert(profile.probes.some((probe) => probe.url.includes('cp.cloudflare.com')), 'default probes should include cloudflare');
}

function testProtocolAwareSelection() {
  const vless = resolveProbeProfile('vless', { profile: 'standard' });
  assert(vless.probes.length >= 4, 'vless profile should have probe ladder');
  assert(String(vless.probes[0].url).startsWith('https://'), 'vless should prefer https probe first');

  const hy2Quick = resolveProbeProfile('hy2', { profile: 'quick' });
  assert.strictEqual(hy2Quick.probes.length, 2, 'quick profile should narrow probe count to 2');
  assert(hy2Quick.probes.every((probe) => probe.url.startsWith('https://')), 'hy2 quick should use https probes');

  const socksQuick = resolveProbeProfile('socks5', { profile: 'quick' });
  assert.strictEqual(socksQuick.probes.length, 2, 'socks quick profile should expose two probes');
  assert(socksQuick.probes.every((probe) => probe.url.startsWith('https://')), 'socks quick should prefer https probes');
}

function testLimitAndMaxCount() {
  const deep = resolveProbeProfile('vless', { profile: 'deep' });
  const limited = limitProbeCount(deep.probes, 3);
  assert.strictEqual(limited.length, 3, 'limitProbeCount should cap results');
  assert(getMaxConnectivityProbeCount() >= getDefaultConnectivityProbes().length, 'max probe count should cover default set');
}

function main() {
  testDefaultProfile();
  testProtocolAwareSelection();
  testLimitAndMaxCount();
  console.log('[ok] probe profiles regression passed');
}

main();

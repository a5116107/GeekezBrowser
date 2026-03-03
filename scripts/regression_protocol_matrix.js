/* eslint-disable no-console */
const assert = require('assert');
const {
  inferProtocolFromInput,
  getProtocolCapability,
  resolveEnginePlan,
} = require('../proxy/protocolMatrix');

function testProtocolInference() {
  assert.strictEqual(inferProtocolFromInput('socks5://127.0.0.1:1080'), 'socks5');
  assert.strictEqual(inferProtocolFromInput('hy2://example.com:443'), 'hysteria2');
  assert.strictEqual(inferProtocolFromInput('1.2.3.4:1080:user:pass'), 'legacy-hostport');
}

function testCapabilityRules() {
  const ssPlugin = getProtocolCapability('ss://YWVzLTI1Ni1nY206cGFzczFAZXhhbXBsZS5jb206ODM4OA==?plugin=v2ray-plugin');
  assert.strictEqual(ssPlugin.engineSupport.xray, false, 'ss + plugin should disable xray');
  assert.strictEqual(ssPlugin.engineSupport.singBox, true, 'ss + plugin should keep sing-box');
  assert(ssPlugin.notes.some((line) => line.includes('sing-box')), 'dynamic notes should explain ss plugin routing');

  const unknown = getProtocolCapability('wireguard://example.com:51820');
  assert.strictEqual(unknown.engineSupport.xray, false);
  assert.strictEqual(unknown.engineSupport.singBox, false);
  assert(unknown.reason.length > 0, 'unsupported protocol should produce reason');
}

function testEnginePlanResolution() {
  const plan1 = resolveEnginePlan('hysteria2://uuid@example.com:443', 'auto', { phase: 'test' });
  assert.deepStrictEqual(plan1.engines, ['sing-box'], 'hy2 should resolve to sing-box only');
  assert.strictEqual(plan1.primary, 'sing-box');

  const plan2 = resolveEnginePlan('vmess://dummy', 'sing-box', { phase: 'test' });
  assert.strictEqual(plan2.primary, 'sing-box', 'explicit hint should be honored when supported');
  assert(plan2.engines.includes('xray'), 'secondary engine should remain for fallback');

  const plan3 = resolveEnginePlan('wireguard://example.com:51820', 'auto', { phase: 'test' });
  assert.strictEqual(plan3.engines.length, 0, 'unsupported protocol should not schedule engines');
}

function main() {
  testProtocolInference();
  testCapabilityRules();
  testEnginePlanResolution();
  console.log('[ok] protocol matrix regression passed');
}

main();


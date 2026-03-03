/* eslint-disable no-console */
const os = require('os');
const path = require('path');
const fs = require('fs-extra');

const { buildSingboxTunConfigFromProxySpec } = require('../proxy/singboxConfig');
const { normalizeProxySpec } = require('../proxy/proxySpec');
const { runLeakCheck } = require('../leakcheck/runLeakCheck');

function assertMainTunGuardrails(mainText) {
  const requiredSnippets = [
    "function assertTunReadyOrThrow(requestingProfileId)",
    "err.code = 'TUN_UNSUPPORTED_PLATFORM';",
    "err.code = 'TUN_RESOURCES_MISSING';",
    "err.code = 'TUN_ADMIN_REQUIRED';",
    "err.code = 'TUN_REQUIRES_SINGLE_PROFILE';",
    "assertTunReadyOrThrow(profile && profile.id ? profile.id : null);",
    "const runningTun = Object.entries(activeProcesses || {}).find(([, p]) => p && p.proxyMode === 'tun');",
    "err.code = 'TUN_ALREADY_RUNNING';",
    "const proxyMode = profile && profile.proxyMode === 'tun' ? 'tun' : 'app_proxy';",
    "if (proxyMode === 'tun' && proxyEngine !== 'sing-box') {",
    "await autoClearSystemProxyIfEnabled();",
    "...(proxyMode === 'tun' ? [] : [`--proxy-server=socks5://127.0.0.1:${localPort}`]),",
  ];

  for (const snippet of requiredSnippets) {
    if (!mainText.includes(snippet)) {
      throw new Error(`missing main-process tun guardrail snippet: ${snippet}`);
    }
  }
}

function assertTunConfigShape() {
  const spec = normalizeProxySpec('socks5://127.0.0.1:1080');
  const tunConfigStrictOff = buildSingboxTunConfigFromProxySpec(spec, 22000, {
    tun: {
      interfaceName: 'geekez-tun-reg',
      mtu: 1400,
      auto_route: false,
      strict_route: false,
      dns_hijack: false,
    },
  });

  const inbounds = Array.isArray(tunConfigStrictOff.inbounds) ? tunConfigStrictOff.inbounds : [];
  const tunInbound = inbounds.find((item) => item && item.type === 'tun' && item.tag === 'in-tun');
  if (!tunInbound) throw new Error('tun config missing tun inbound');
  if (tunInbound.interface_name !== 'geekez-tun-reg') throw new Error('tun config interface_name mismatch');
  if (tunInbound.mtu !== 1400) throw new Error('tun config mtu mismatch');
  if (tunInbound.auto_route !== false) throw new Error('tun config auto_route mismatch');
  if (tunInbound.strict_route !== false) throw new Error('tun config strict_route mismatch');

  const rulesStrictOff = (tunConfigStrictOff.route && Array.isArray(tunConfigStrictOff.route.rules))
    ? tunConfigStrictOff.route.rules
    : [];
  const hasDnsHijackRuleWhenDisabled = rulesStrictOff.some((rule) => rule && rule.action === 'hijack-dns');
  if (hasDnsHijackRuleWhenDisabled) throw new Error('tun config dns hijack rule should be absent when disabled');

  const tunConfigDnsOn = buildSingboxTunConfigFromProxySpec(spec, 22001, {
    tun: {
      auto_route: true,
      strict_route: true,
      dns_hijack: true,
    },
  });
  const rulesDnsOn = (tunConfigDnsOn.route && Array.isArray(tunConfigDnsOn.route.rules))
    ? tunConfigDnsOn.route.rules
    : [];
  const dnsHijackRule = rulesDnsOn.find((rule) => rule && rule.action === 'hijack-dns');
  if (!dnsHijackRule) throw new Error('tun config missing dns hijack rule when enabled');
  if (!Array.isArray(dnsHijackRule.inbound) || !dnsHijackRule.inbound.includes('in-tun')) {
    throw new Error('tun config dns hijack rule missing in-tun binding');
  }
}

async function assertLeakCheckTunMode() {
  const logsDir = path.join(os.tmpdir(), `geekez_reg_tun_guard_${Date.now()}`);
  await fs.ensureDir(logsDir);

  const profile = {
    id: 'reg_tun_guard',
    name: 'Regression TUN Guard',
    proxyEngine: 'sing-box',
    fingerprint: {
      platform: 'Win32',
    },
  };

  const probes = [
    {
      name: 'dns-ok',
      run: async ({ report }) => {
        report.dns.status = 'ok';
        report.dns.viaProxy = true;
        report.dns.resolver = 'doh://1.1.1.1';
        report.dns.evidence.push('dns resolved via proxy path');
      },
    },
    {
      name: 'ipv6-ok',
      run: async ({ report }) => {
        report.ipv6.status = 'ok';
        report.ipv6.hasIpv6 = true;
        report.ipv6.publicIpv6 = '2001:4860:4860::8888';
        report.ipv6.evidence.push('ipv6 probe observed proxied ipv6 endpoint');
      },
    },
    {
      name: 'webrtc-ok',
      run: async ({ report }) => {
        report.webrtc.status = 'ok';
        report.webrtc.localIps = [];
        report.webrtc.publicIps = [];
        report.webrtc.evidence.push('no private candidates observed');
      },
    },
  ];

  let result;
  try {
    result = await runLeakCheck(profile, {
      logsDir,
      proxyMode: 'tun',
      probes,
      urls: ['https://example.com'],
    });

    if (!result || typeof result !== 'object') throw new Error('runLeakCheck returned invalid result');
    if (result.status === 'red') throw new Error('leakcheck unexpectedly returned red status for clean tun probes');
    if (!result.reportPath || !await fs.pathExists(result.reportPath)) throw new Error('leakcheck reportPath missing');

    const report = await fs.readJson(result.reportPath);
    if (!report || typeof report !== 'object') throw new Error('leakcheck report unreadable');
    if (!report.proxy || report.proxy.mode !== 'tun') throw new Error('leakcheck report proxy.mode should be tun');
    if (!report.capabilities || report.capabilities.tun !== true) throw new Error('leakcheck report capabilities.tun should be true');
    if (!report.dns || report.dns.status !== 'ok') throw new Error('leakcheck report dns.status should be ok');
    if (!report.ipv6 || report.ipv6.status !== 'ok') throw new Error('leakcheck report ipv6.status should be ok');
    if (!report.webrtc || report.webrtc.status !== 'ok') throw new Error('leakcheck report webrtc.status should be ok');

    const issues = report.consistency && Array.isArray(report.consistency.issues)
      ? report.consistency.issues
      : [];
    const leakCodes = new Set(['DNS_LEAK', 'IPV6_LEAK', 'WEBRTC_LEAK']);
    const hasLeakIssue = issues.some((issue) => issue && leakCodes.has(String(issue.code || '').trim()));
    if (hasLeakIssue) throw new Error('leakcheck report should not contain leak issue codes for clean tun probes');
  } finally {
    await fs.remove(logsDir);
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const mainText = await fs.readFile(path.join(repoRoot, 'main.js'), 'utf8');

  assertMainTunGuardrails(mainText);
  assertTunConfigShape();
  await assertLeakCheckTunMode();

  console.log('[ok] tun guardrail regression passed');
}

main().catch((e) => {
  console.error('[fail]', e && e.stack ? e.stack : e);
  process.exit(1);
});

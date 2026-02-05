/* eslint-disable no-console */
const path = require('path');
const fs = require('fs-extra');

// This script is a lightweight regression harness for "pure" modules and config generators.
// It does NOT start Electron or require GUI.

async function main() {
  const root = process.cwd();
  const logsDir = path.join(root, 'logs');
  await fs.ensureDir(logsDir);

  console.log('[regression] leakcheck schema + runLeakCheck (no pageProvider)');
  const { runLeakCheck } = require('../leakcheck/runLeakCheck');
  const ipProbe = require('../leakcheck/probes/ip');
  const headersProbe = require('../leakcheck/probes/headers');

  const res = await runLeakCheck(
    { id: 'reg-p1', name: 'Regression', proxyStr: 'http://1.2.3.4:8080', proxyEngine: 'xray', fingerprint: { timezone: 'Auto' } },
    { logsDir, probes: [ipProbe, headersProbe], urls: [] }
  );
  if (!res || !res.reportPath) throw new Error('LeakCheck regression did not return reportPath');
  if (!await fs.pathExists(res.reportPath)) throw new Error('LeakCheck regression reportPath does not exist');
  console.log('[ok] leakcheck report:', res.reportPath);

  console.log('[regression] sing-box config generation + sing-box check');
  const { normalizeProxySpec } = require('../proxy/proxySpec');
  const { buildSingboxConfigFromProxySpec } = require('../proxy/singboxConfig');

  const encodeBase64Url = (input) =>
    Buffer.from(String(input || ''), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

  const buildSbUri = (payloadObj, name = '') => {
    const json = JSON.stringify(payloadObj || {});
    const base = `sb://${encodeBase64Url(json)}`;
    return name ? `${base}#${encodeURIComponent(name)}` : base;
  };

  const sbShadowTls = buildSbUri(
    {
      kind: 'singbox-outbounds',
      main: 'proxy',
      outbounds: [
        {
          type: 'shadowsocks',
          tag: 'proxy',
          server: '1.2.3.4',
          server_port: 8388,
          method: 'aes-256-gcm',
          password: 'pass',
          detour: 'shadowtls',
        },
        {
          type: 'shadowtls',
          tag: 'shadowtls',
          server: '1.2.3.4',
          server_port: 8388,
          version: 3,
          password: 'shadowpass',
          tls: { enabled: true, server_name: 'www.bing.com', insecure: true },
        },
      ],
    },
    'ss-shadowtls'
  );

  const sbWireguard = buildSbUri(
    {
      type: 'wireguard',
      server: '1.2.3.4',
      server_port: 51820,
      local_address: ['10.0.0.2/32'],
      private_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      peer_public_key: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
      mtu: 1420,
    },
    'wg'
  );

  const samples = [
    // vless reality grpc
    'vless://11111111-1111-1111-1111-111111111111@example.com:443?security=reality&type=grpc&serviceName=svc&pbk=' +
      encodeURIComponent('8hxC6B5A1dM9d3wH0mE8GmO7xgk1rE1kN8uYQ4f0o3k') +
      '&sid=00&sni=example.com&fp=chrome',
    // trojan ws
    'trojan://pass@example.com:443?type=ws&host=example.com&path=%2F',
    // ss base64 (method:pass@host:port)
    'ss://' + Buffer.from('aes-256-gcm:pass@1.2.3.4:8388').toString('base64'),
    // vmess base64 json
    'vmess://' + Buffer.from(JSON.stringify({ v: '2', ps: 'x', add: 'example.com', port: '443', id: '11111111-1111-1111-1111-111111111111', aid: '0', scy: 'auto', net: 'ws', host: 'example.com', path: '/', tls: 'tls', sni: 'example.com' })).toString('base64'),
    // ss + v2ray-plugin (SIP003)
    'ss://' +
      Buffer.from('aes-256-gcm:pass').toString('base64') +
      '@1.2.3.4:8388?plugin=' +
      encodeURIComponent('v2ray-plugin;mode=websocket;host=example.com;path=/;tls') +
      '#ss-plugin',
    // shadowtls (as sb:// bundle)
    sbShadowTls,
    // hysteria2 minimal (with optional params)
    'hysteria2://pass@example.com:443?sni=example.com&insecure=1&alpn=h3&obfs=salamander&obfs-password=obf&upmbps=50&downmbps=100#hy2',
    // hysteria v1
    'hysteria://auth@example.com:443?sni=example.com&insecure=1&alpn=h3&protocol=udp&obfs=obfs&ports=443,444&hop=10&upmbps=50&downmbps=100#hy1',
    // tuic minimal
    'tuic://11111111-1111-1111-1111-111111111111:pass@example.com:443?sni=example.com&insecure=1&alpn=h3#tuic',
    // wireguard (as sb:// payload)
    sbWireguard,
  ];

  const BIN_DIR = path.join(root, 'resources', 'bin', 'win32-x64');
  const SING = path.join(BIN_DIR, 'sing-box.exe');
  const { spawn } = require('child_process');

  const checkConfig = (cfgPath) =>
    new Promise((resolve, reject) => {
      const p = spawn(SING, ['check', '-c', cfgPath], { cwd: BIN_DIR, windowsHide: true, env: { ...process.env, ENABLE_DEPRECATED_WIREGUARD_OUTBOUND: 'true' } });
      let stderr = '';
      p.stderr.on('data', (d) => (stderr += d.toString()));
      p.on('error', reject);
      p.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`sing-box check failed: ${stderr.trim()}`));
      });
    });

  if (await fs.pathExists(SING)) {
    for (let i = 0; i < samples.length; i++) {
      const spec = normalizeProxySpec(samples[i]);
      const cfg = buildSingboxConfigFromProxySpec(spec, 20000 + i);
      const cfgPath = path.join(logsDir, `sb_reg_${i}.json`);
      await fs.writeJson(cfgPath, cfg, { spaces: 2 });
      await checkConfig(cfgPath);
    }

    // pre-proxy chaining (detour) should be accepted by `sing-box check`
    const preProxySpec = normalizeProxySpec('socks5://user:pass@1.2.3.4:1080');
    const chained = buildSingboxConfigFromProxySpec(normalizeProxySpec(samples[0]), 21000, { preProxySpec });
    const chainedPath = path.join(logsDir, 'sb_reg_preproxy.json');
    await fs.writeJson(chainedPath, chained, { spaces: 2 });
    await checkConfig(chainedPath);
    console.log('[ok] sing-box configs validated via `sing-box check`');
  } else {
    console.log('[skip] sing-box.exe not present; skipped config check');
  }

  console.log('[done] regression scripts completed');
}

main().catch((e) => {
  console.error('[fail]', e && e.stack ? e.stack : e);
  process.exit(1);
});

const { parseSubscriptionContent } = require('../proxy/subscription');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const clash = `proxies:
  - name: test1
    type: socks5
    server: 1.2.3.4
    port: 1080
    username: u
    password: p
  - name: t2
    type: trojan
    server: ex.com
    port: 443
    password: pass
    sni: sni.ex.com
  - name: ss1
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: pass
  - name: ss2-plugin
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: pass
    plugin: v2ray-plugin
    plugin-opts:
      mode: websocket
      host: example.com
      path: /ws
      tls: true
  - name: ss3-shadowtls
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: pass
    plugin: shadow-tls
    plugin-opts:
      host: www.bing.com
      password: shadowpass
      version: 3
    client-fingerprint: chrome
  - name: vm1
    type: vmess
    server: ex.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    alterId: 0
    cipher: auto
    tls: true
    network: ws
    ws-opts:
      path: /
      headers:
        Host: ex.com
  - name: vl1
    type: vless
    server: ex.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    tls: true
    network: grpc
    grpc-opts:
      grpc-service-name: svc
  - name: hy2
    type: hysteria2
    server: ex.com
    port: 443
    password: pass
    sni: ex.com
  - name: hy1
    type: hysteria
    server: ex.com
    port: 443
    auth-str: auth
    sni: ex.com
    alpn: [h3]
    up: 50
    down: 100
    obfs: obfs
    protocol: udp
    skip-cert-verify: true
  - name: tuic1
    type: tuic
    server: ex.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    password: pass
    sni: ex.com
  - name: wg1
    type: wireguard
    server: 1.2.3.4
    port: 51820
    ip: 10.0.0.2/32
    private-key: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
    public-key: BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
`;
  const r1 = parseSubscriptionContent(clash, 'auto');
  assert(r1.detectedType === 'clash', 'detect clash');
  assert(r1.nodes.length === 11, 'clash nodes count');
  assert(r1.nodes[0].id && r1.nodes[0].raw.includes('://'), 'clash node id/raw');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('vmess://')), 'clash vmess mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('vless://')), 'clash vless mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('ss://')), 'clash ss mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('ss://') && n.raw.includes('?plugin=')), 'clash ss+plugin mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('sb://')), 'clash sb:// mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('hysteria://')), 'clash hysteria v1 mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('hysteria2://')), 'clash hy2 mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('tuic://')), 'clash tuic mapped');

  const sb = JSON.stringify({
    outbounds: [
      { type: 'socks', tag: 'sb1', server: '1.1.1.1', server_port: 1080, username: 'u', password: 'p' },
      { type: 'shadowsocks', tag: 'ss', server: '1.2.3.4', server_port: 8388, method: 'aes-256-gcm', password: 'pass' },
      { type: 'shadowsocks', tag: 'ss-plugin', server: '1.2.3.4', server_port: 8388, method: 'aes-256-gcm', password: 'pass', plugin: 'v2ray-plugin', plugin_opts: 'mode=websocket;host=example.com;path=/;tls' },
      { type: 'shadowsocks', tag: 'ss-st', server: '1.2.3.4', server_port: 8388, method: 'aes-256-gcm', password: 'pass', detour: 'st' },
      { type: 'shadowtls', tag: 'st', server: '1.2.3.4', server_port: 8388, version: 3, password: 'shadowpass', tls: { enabled: true, server_name: 'www.bing.com', insecure: true } },
      { type: 'vmess', tag: 'vm', server: 'example.com', server_port: 443, uuid: '11111111-1111-1111-1111-111111111111', security: 'auto', alter_id: 0, transport: { type: 'ws', path: '/', headers: { Host: 'example.com' } }, tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'vless', tag: 'vl', server: 'example.com', server_port: 443, uuid: '11111111-1111-1111-1111-111111111111', transport: { type: 'grpc', service_name: 'svc' }, tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'hysteria2', tag: 'hy2', server: 'example.com', server_port: 443, password: 'pass', tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'hysteria', tag: 'hy1', server: 'example.com', server_port: 443, auth_str: 'auth', up_mbps: 50, down_mbps: 100, obfs: 'obfs', protocol: 'udp', server_ports: '443,444', hop_interval: 10, tls: { enabled: true, server_name: 'example.com', insecure: true, alpn: ['h3'] } },
      { type: 'tuic', tag: 'tuic', server: 'example.com', server_port: 443, uuid: '11111111-1111-1111-1111-111111111111', password: 'pass', tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'wireguard', tag: 'wg', server: '1.2.3.4', server_port: 51820, local_address: ['10.0.0.2/32'], private_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', peer_public_key: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', mtu: 1420 },
    ]
  });
  const r2 = parseSubscriptionContent(sb, 'auto');
  assert(r2.detectedType === 'singbox', 'detect singbox');
  assert(r2.nodes.length === 10, 'singbox nodes count');
  assert(r2.nodes[0].id && r2.nodes[0].raw.startsWith('socks5://'), 'singbox node raw');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('vmess://')), 'singbox vmess mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('vless://')), 'singbox vless mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('ss://')), 'singbox ss mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('ss://') && n.raw.includes('?plugin=')), 'singbox ss+plugin mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('sb://')), 'singbox sb:// mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('hysteria://')), 'singbox hysteria v1 mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('hysteria2://')), 'singbox hy2 mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('tuic://')), 'singbox tuic mapped');

  console.log(JSON.stringify({ ok: true, samples: { clash: r1.stats, singbox: r2.stats } }));
}

main();

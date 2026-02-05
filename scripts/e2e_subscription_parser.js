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
  - name: tuic1
    type: tuic
    server: ex.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    password: pass
    sni: ex.com
`;
  const r1 = parseSubscriptionContent(clash, 'auto');
  assert(r1.detectedType === 'clash', 'detect clash');
  assert(r1.nodes.length === 7, 'clash nodes count');
  assert(r1.nodes[0].id && r1.nodes[0].raw.includes('://'), 'clash node id/raw');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('vmess://')), 'clash vmess mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('vless://')), 'clash vless mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('ss://')), 'clash ss mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('hysteria2://')), 'clash hy2 mapped');
  assert(r1.nodes.some(n => n.raw && n.raw.startsWith('tuic://')), 'clash tuic mapped');

  const sb = JSON.stringify({
    outbounds: [
      { type: 'socks', tag: 'sb1', server: '1.1.1.1', server_port: 1080, username: 'u', password: 'p' },
      { type: 'shadowsocks', tag: 'ss', server: '1.2.3.4', server_port: 8388, method: 'aes-256-gcm', password: 'pass' },
      { type: 'vmess', tag: 'vm', server: 'example.com', server_port: 443, uuid: '11111111-1111-1111-1111-111111111111', security: 'auto', alter_id: 0, transport: { type: 'ws', path: '/', headers: { Host: 'example.com' } }, tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'vless', tag: 'vl', server: 'example.com', server_port: 443, uuid: '11111111-1111-1111-1111-111111111111', transport: { type: 'grpc', service_name: 'svc' }, tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'hysteria2', tag: 'hy2', server: 'example.com', server_port: 443, password: 'pass', tls: { enabled: true, server_name: 'example.com', insecure: true } },
      { type: 'tuic', tag: 'tuic', server: 'example.com', server_port: 443, uuid: '11111111-1111-1111-1111-111111111111', password: 'pass', tls: { enabled: true, server_name: 'example.com', insecure: true } },
    ]
  });
  const r2 = parseSubscriptionContent(sb, 'auto');
  assert(r2.detectedType === 'singbox', 'detect singbox');
  assert(r2.nodes.length === 6, 'singbox nodes count');
  assert(r2.nodes[0].id && r2.nodes[0].raw.startsWith('socks5://'), 'singbox node raw');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('vmess://')), 'singbox vmess mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('vless://')), 'singbox vless mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('ss://')), 'singbox ss mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('hysteria2://')), 'singbox hy2 mapped');
  assert(r2.nodes.some(n => n.raw && n.raw.startsWith('tuic://')), 'singbox tuic mapped');

  console.log(JSON.stringify({ ok: true, samples: { clash: r1.stats, singbox: r2.stats } }));
}

main();

const { parseSubscriptionContent } = require('../proxy/subscription');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const clash = `proxies:\n  - {name: test1, type: socks5, server: 1.2.3.4, port: 1080, username: u, password: p}\n  - {name: t2, type: trojan, server: ex.com, port: 443, password: pass, sni: sni.ex.com}\n`;
  const r1 = parseSubscriptionContent(clash, 'auto');
  assert(r1.detectedType === 'clash', 'detect clash');
  assert(r1.nodes.length === 2, 'clash nodes count');
  assert(r1.nodes[0].id && r1.nodes[0].raw.includes('://'), 'clash node id/raw');

  const sb = JSON.stringify({ outbounds: [{ type: 'socks', tag: 'sb1', server: '1.1.1.1', server_port: 1080, username: 'u', password: 'p' }] });
  const r2 = parseSubscriptionContent(sb, 'auto');
  assert(r2.detectedType === 'singbox', 'detect singbox');
  assert(r2.nodes.length === 1, 'singbox nodes count');
  assert(r2.nodes[0].id && r2.nodes[0].raw.startsWith('socks5://'), 'singbox node raw');

  console.log(JSON.stringify({ ok: true, samples: { clash: r1.stats, singbox: r2.stats } }));
}

main();


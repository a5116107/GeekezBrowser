const { probeOutboundHeaders } = require('../proxy/headerProbe');

async function main() {
  const proxyStr = process.env.PROXY_STR || '';
  if (!proxyStr) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'PROXY_STR not set' }, null, 2));
    return;
  }
  try {
    const headers = await probeOutboundHeaders({ timeoutMs: 8000, proxyStr });
    const ok = !!headers && typeof headers.userAgent === 'string' && headers.userAgent.length > 0;
    console.log(JSON.stringify({ ok, headers }, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }, null, 2));
    process.exit(1);
  }
}

main();


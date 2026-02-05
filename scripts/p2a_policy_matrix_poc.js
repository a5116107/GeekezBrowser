const fs = require('fs');
const path = require('path');

function nowId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeId(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getRepoRoot() {
  return path.join(__dirname, '..');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

async function runLeakcheckLikeProbes({ proxyMode }) {
  const startedAt = Date.now();
  const result = {
    ok: false,
    startedAt,
    endedAt: null,
    durationMs: null,
    proxyMode: proxyMode || 'unknown',
    ipv6: null,
    headers: null,
    error: null,
    code: null,
  };

  try {
    const { createBaseLeakReport } = require('../leakcheck/schema');
    const report = createBaseLeakReport({ id: 'p2a-poc', fingerprint: {} }, { proxyMode });

    const ipv6Probe = require('../leakcheck/probes/ipv6');
    const headersProbe = require('../leakcheck/probes/headers');

    await headersProbe.run({ report, timeouts: { totalMs: 20000, perUrlNavigationMs: 12000 } });
    await ipv6Probe.run({ report, timeouts: { perUrlCollectMs: 8000 } });

    result.ok = true;
    result.headers = report.headers;
    result.ipv6 = report.ipv6;
    return result;
  } catch (e) {
    result.ok = false;
    result.code = e && e.code ? String(e.code) : 'P2A_PROBE_ERROR';
    result.error = e && e.message ? e.message : String(e);
    return result;
  } finally {
    result.endedAt = Date.now();
    result.durationMs = result.endedAt - startedAt;
  }
}

async function runAppProxyProbe({ profileId, proxyStr }) {
  const startedAt = Date.now();
  const result = {
    mode: 'app_proxy',
    ok: false,
    startedAt,
    endedAt: null,
    durationMs: null,
    proxyStrPresent: Boolean(proxyStr),
    ip: null,
    geo: null,
    connectivity: null,
    error: null,
    code: null,
  };

  try {
    if (!proxyStr) {
      result.code = 'APP_PROXY_NO_PROXY_STR';
      result.error = 'proxyStr is empty; cannot probe app_proxy mode';
      return result;
    }

    const { spawnSync } = require('child_process');
    const child = spawnSync(process.execPath, [path.join(__dirname, 'e2e_header_probe_via_proxy.js')], {
      encoding: 'utf-8',
      env: { ...process.env, PROXY_STR: proxyStr },
    });
    const stdout = (child.stdout || '').trim();
    let parsed = null;
    try {
      parsed = stdout ? JSON.parse(stdout) : null;
    } catch (e) {
      parsed = { ok: false, error: 'NON_JSON_OUTPUT', stdout, stderr: (child.stderr || '').trim() };
    }
    result.connectivity = parsed;

    // Best-effort geo probing via proxy test helper (may be blocked by network)
    try {
      const { probeGeo } = require('../proxy/test');
      const geo = await probeGeo(8000);
      if (geo) {
        result.ip = geo.ip || null;
        result.geo = {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          asn: geo.asn,
          isp: geo.isp,
          timezone: geo.timezone,
          latitude: geo.latitude,
          longitude: geo.longitude,
        };
      }
    } catch (e) {
      // keep as null; this PoC is observational and should not hard-fail on geo lookups
    }

    result.ok = Boolean(parsed && parsed.ok);
    return result;
  } catch (e) {
    result.ok = false;
    result.code = e && e.code ? String(e.code) : 'APP_PROXY_PROBE_ERROR';
    result.error = e && e.message ? e.message : String(e);
    return result;
  } finally {
    result.endedAt = Date.now();
    result.durationMs = result.endedAt - startedAt;
  }
}

async function runSystemProxyProbe({ endpoint, bypassList }) {
  const startedAt = Date.now();
  const result = {
    mode: 'system_proxy',
    ok: false,
    startedAt,
    endedAt: null,
    durationMs: null,
    platform: process.platform,
    endpoint: endpoint || null,
    bypassList: Array.isArray(bypassList) ? bypassList : null,
    apply: null,
    rollback: null,
    error: null,
    code: null,
  };

  if (process.platform !== 'win32') {
    result.code = 'SYSTEM_PROXY_UNSUPPORTED_PLATFORM';
    result.error = 'system_proxy probe only implemented for Windows in this repo';
    result.endedAt = Date.now();
    result.durationMs = result.endedAt - startedAt;
    return result;
  }

  try {
    const { setSystemProxySocks, clearSystemProxy } = require('../proxy/systemProxyWin');
    result.apply = await setSystemProxySocks({ endpoint, bypassList });
    // Keep it minimal: this PoC focuses on safe apply/rollback observability.
    // Network-level verification is intentionally not performed here to avoid interfering with user traffic.
    result.ok = true;
    result.rollback = await clearSystemProxy();
    return result;
  } catch (e) {
    result.ok = false;
    result.code = e && e.code ? String(e.code) : 'SYSTEM_PROXY_PROBE_ERROR';
    result.error = e && e.message ? e.message : String(e);
    try {
      const { clearSystemProxy } = require('../proxy/systemProxyWin');
      result.rollback = await clearSystemProxy();
    } catch (rollbackErr) {
      result.rollback = { ok: false, error: rollbackErr && rollbackErr.message ? rollbackErr.message : String(rollbackErr) };
    }
    return result;
  } finally {
    result.endedAt = Date.now();
    result.durationMs = result.endedAt - startedAt;
  }
}

function detectTunCapabilities() {
  const repoRoot = getRepoRoot();
  const out = {
    ok: false,
    platform: process.platform,
    reason: null,
    expected: [],
    found: {},
  };

  // This is detection-only (no driver/service start). Concrete tun support is a follow-up slice.
  if (process.platform !== 'win32') {
    out.reason = 'TUN capability detection currently only checks Windows resources';
    return out;
  }

  const candidates = [
    path.join(repoRoot, 'resources', 'bin', 'win32-x64', 'sing-box.exe'),
    path.join(repoRoot, 'resources', 'bin', 'win32-x64', 'wintun.dll'),
  ];
  out.expected = candidates;
  candidates.forEach((p) => {
    out.found[p] = fs.existsSync(p);
  });
  out.ok = Object.values(out.found).every(Boolean);
  if (!out.ok) out.reason = 'Missing required Windows tun resources (sing-box.exe and/or wintun.dll)';
  return out;
}

function getTunReadiness() {
  const detection = detectTunCapabilities();
  if (detection.platform !== 'win32') {
    return { ok: false, code: 'TUN_UNSUPPORTED_PLATFORM', message: detection.reason, detection };
  }
  if (!detection.ok) {
    return { ok: false, code: 'TUN_RESOURCES_MISSING', message: detection.reason, detection };
  }
  return { ok: true, code: 'TUN_READY', message: 'tun resources present (detection only)', detection };
}

async function main() {
  const profileId = process.env.PROFILE_ID || 'local';
  const proxyStr = process.env.PROXY_STR || '';
  const systemProxyEndpoint = process.env.SYSTEM_PROXY_ENDPOINT || '127.0.0.1:1080';
  const bypassList = (process.env.SYSTEM_PROXY_BYPASS || '<local>;localhost;127.0.0.1;::1')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const outBase = path.join(getRepoRoot(), 'logs', 'p2a-policy-matrix', safeId(profileId), nowId());
  ensureDir(outBase);

  const report = {
    version: 1,
    createdAt: Date.now(),
    profileId,
    notes: 'P2-A-1 minimal PoC: observational runner for system_proxy/app_proxy with safe rollback. No Electron UI required.',
    inputs: {
      proxyStrPresent: Boolean(proxyStr),
      systemProxyEndpoint,
      bypassList,
    },
    results: {
      app_proxy: null,
      system_proxy: null,
    },
    tun: {
      readiness: getTunReadiness(),
    },
  };

  report.results.app_proxy = await runAppProxyProbe({ profileId, proxyStr });
  writeJson(path.join(outBase, 'app_proxy.json'), report.results.app_proxy);

  report.results.system_proxy = await runSystemProxyProbe({ endpoint: systemProxyEndpoint, bypassList });
  writeJson(path.join(outBase, 'system_proxy.json'), report.results.system_proxy);

  // Minimal DNS/IPv6 observations (no UI, no browser). Note: system_proxy may affect process-global traffic.
  report.results.observations = {
    app_proxy: await runLeakcheckLikeProbes({ proxyMode: 'app_proxy' }),
    system_proxy: await runLeakcheckLikeProbes({ proxyMode: 'system_proxy' }),
  };
  writeJson(path.join(outBase, 'observations.json'), report.results.observations);

  writeJson(path.join(outBase, 'report.json'), report);

  // Single JSON line for CI-style consumption
  process.stdout.write(JSON.stringify({ ok: true, outBase, reportPath: path.join(outBase, 'report.json') }));
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ ok: false, error: e && e.message ? e.message : String(e) }));
  process.exitCode = 1;
});

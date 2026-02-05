const fs = require('fs');
const path = require('path');

function nowId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeId(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function runNodeScript(scriptPath, env = {}) {
  // Run in-process to avoid spawning extra shells and to capture JSON output deterministically.
  // Each script prints a single JSON object to stdout.
  const abs = path.resolve(scriptPath);
  const oldEnv = { ...process.env };
  Object.assign(process.env, env);
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync(process.execPath, [abs], { encoding: 'utf-8' });
    const stdout = (res.stdout || '').trim();
    const stderr = (res.stderr || '').trim();
    let json = null;
    try {
      json = stdout ? JSON.parse(stdout) : null;
    } catch (e) {
      json = { ok: false, error: 'NON_JSON_OUTPUT', stdout, stderr };
    }
    if (res.status !== 0 && json && json.ok !== true) {
      json = { ok: false, error: 'SCRIPT_FAILED', exitCode: res.status, stdout, stderr, parsed: json };
    }
    return { ok: true, result: json, stderr };
  } finally {
    process.env = oldEnv;
  }
}

async function main() {
  const profileId = process.env.PROFILE_ID || 'local';
  const outBase = path.join(__dirname, '..', 'logs', 'fingerprint-regression', safeId(profileId), nowId());
  fs.mkdirSync(outBase, { recursive: true });

  const results = {};
  const profileForLeakcheck = {
    id: profileId,
    name: process.env.PROFILE_NAME || 'local',
    proxyStr: process.env.PROXY_STR || '',
    fingerprint: {}
  };

  // 1) e2e locale consistency
  results.locale = (await runNodeScript(path.join(__dirname, 'e2e_locale_consistency.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_locale_consistency.json'), JSON.stringify(results.locale, null, 2));

  // 2) e2e webgl
  results.webgl = (await runNodeScript(path.join(__dirname, 'e2e_webgl_consistency.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_webgl_consistency.json'), JSON.stringify(results.webgl, null, 2));

  // 3) e2e media/perms
  results.media = (await runNodeScript(path.join(__dirname, 'e2e_media_permissions.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_media_permissions.json'), JSON.stringify(results.media, null, 2));

  // 3.1) e2e media template
  results.mediaTemplate = (await runNodeScript(path.join(__dirname, 'e2e_media_devices_template.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_media_devices_template.json'), JSON.stringify(results.mediaTemplate, null, 2));

  // 3.2) e2e fonts template
  results.fontsTemplate = (await runNodeScript(path.join(__dirname, 'e2e_fonts_template.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_fonts_template.json'), JSON.stringify(results.fontsTemplate, null, 2));

  // 3.3) e2e fonts multi-probe
  results.fontsMulti = (await runNodeScript(path.join(__dirname, 'e2e_fonts_multi_probe.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_fonts_multi_probe.json'), JSON.stringify(results.fontsMulti, null, 2));

  // 3.4) e2e fonts canvas probe
  results.fontsCanvas = (await runNodeScript(path.join(__dirname, 'e2e_fonts_canvas_probe.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_fonts_canvas_probe.json'), JSON.stringify(results.fontsCanvas, null, 2));

  // 4) proxy policy gate (pure node)
  results.proxyGate = (await runNodeScript(path.join(__dirname, 'e2e_proxy_policy_gate.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_proxy_policy_gate.json'), JSON.stringify(results.proxyGate, null, 2));

  // 4.1) client rects stability
  results.clientRects = (await runNodeScript(path.join(__dirname, 'e2e_clientrects_stability.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_clientrects_stability.json'), JSON.stringify(results.clientRects, null, 2));

  // 4.2) permissions/media linkage
  results.permMedia = (await runNodeScript(path.join(__dirname, 'e2e_permissions_media_link.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_permissions_media_link.json'), JSON.stringify(results.permMedia, null, 2));

  // 4.3) plugins/mimeTypes
  results.plugins = (await runNodeScript(path.join(__dirname, 'e2e_plugins_mimetypes.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_plugins_mimetypes.json'), JSON.stringify(results.plugins, null, 2));

  // 4.4) ua-ch/platform/hardware rules
  results.uaRules = (await runNodeScript(path.join(__dirname, 'e2e_ua_ch_consistency_rules.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_ua_ch_consistency_rules.json'), JSON.stringify(results.uaRules, null, 2));

  // 4.5) ua-ch platformVersion override + brands generation
  results.uaMetaOverride = (await runNodeScript(path.join(__dirname, 'e2e_ua_ch_metadata_override.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_ua_ch_metadata_override.json'), JSON.stringify(results.uaMetaOverride, null, 2));
  results.uaBrands = (await runNodeScript(path.join(__dirname, 'e2e_ua_ch_brands_generation.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_ua_ch_brands_generation.json'), JSON.stringify(results.uaBrands, null, 2));
  results.uaHeaders = (await runNodeScript(path.join(__dirname, 'e2e_ua_ch_header_alignment.js'))).result;
  fs.writeFileSync(path.join(outBase, 'e2e_ua_ch_header_alignment.json'), JSON.stringify(results.uaHeaders, null, 2));

  // 5) leakcheck (optional, requires PROXY_STR and may take longer)
  try {
    const { runLeakCheck } = require('../leakcheck/runLeakCheck');
    // Minimal probes: ip + headers + webrtc (same as repo defaults usage)
    const ipProbe = require('../leakcheck/probes/ip');
    const headersProbe = require('../leakcheck/probes/headers');
    const webrtcProbe = require('../leakcheck/probes/webrtc');

    const leak = await runLeakCheck(profileForLeakcheck, {
      logsDir: path.join(__dirname, '..', 'logs'),
      proxyMode: profileForLeakcheck.proxyStr ? 'proxy' : 'direct',
      urls: ['https://example.com/'],
      probes: [ipProbe, headersProbe, webrtcProbe],
      timeouts: { totalMs: 45_000 }
    });
    results.leakcheck = leak;
    fs.writeFileSync(path.join(outBase, 'leakcheck_result.json'), JSON.stringify(leak, null, 2));
  } catch (e) {
    results.leakcheck = { ok: false, error: String(e && e.message ? e.message : e) };
    fs.writeFileSync(path.join(outBase, 'leakcheck_result.json'), JSON.stringify(results.leakcheck, null, 2));
  }

  // 6) header probe via proxy (optional)
  results.headerProbeProxy = (await runNodeScript(path.join(__dirname, 'e2e_header_probe_via_proxy.js'), { PROXY_STR: process.env.PROXY_STR || '' })).result;
  fs.writeFileSync(path.join(outBase, 'e2e_header_probe_via_proxy.json'), JSON.stringify(results.headerProbeProxy, null, 2));

  // Summary
  const ok =
    Boolean(results.locale && results.locale.ok) &&
    Boolean(results.webgl && results.webgl.ok) &&
    Boolean(results.media && results.media.ok) &&
    Boolean(results.mediaTemplate && results.mediaTemplate.ok) &&
    Boolean(results.fontsTemplate && results.fontsTemplate.ok) &&
    Boolean(results.fontsMulti && results.fontsMulti.ok) &&
    Boolean(results.fontsCanvas && results.fontsCanvas.ok) &&
    Boolean(results.clientRects && results.clientRects.ok) &&
    Boolean(results.permMedia && results.permMedia.ok) &&
    Boolean(results.plugins && results.plugins.ok) &&
    Boolean(results.uaRules && results.uaRules.ok) &&
    Boolean(results.uaMetaOverride && results.uaMetaOverride.ok) &&
    Boolean(results.uaBrands && results.uaBrands.ok) &&
    Boolean(results.uaHeaders && results.uaHeaders.ok);

  const summary = {
    ok,
    outDir: outBase,
    checks: {
      locale: results.locale && results.locale.ok === true,
      webgl: results.webgl && results.webgl.ok === true,
      media: results.media && results.media.ok === true,
      mediaTemplate: results.mediaTemplate && results.mediaTemplate.ok === true,
      fontsTemplate: results.fontsTemplate && results.fontsTemplate.ok === true,
      fontsMulti: results.fontsMulti && results.fontsMulti.ok === true,
      fontsCanvas: results.fontsCanvas && results.fontsCanvas.ok === true,
      clientRects: results.clientRects && results.clientRects.ok === true,
      permMedia: results.permMedia && results.permMedia.ok === true,
      plugins: results.plugins && results.plugins.ok === true,
      uaRules: results.uaRules && results.uaRules.ok === true,
      uaMetaOverride: results.uaMetaOverride && results.uaMetaOverride.ok === true,
      uaBrands: results.uaBrands && results.uaBrands.ok === true,
      uaHeaders: results.uaHeaders && results.uaHeaders.ok === true,
      headerProbeProxy: results.headerProbeProxy && results.headerProbeProxy.ok === true,
      leakcheckStatus: results.leakcheck && results.leakcheck.status ? results.leakcheck.status : undefined
    }
  };

  fs.writeFileSync(path.join(outBase, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

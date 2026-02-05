const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { getInjectScript, normalizeFingerprintSpec } = require('../fingerprint');

function getBundledChromePath() {
  const candidate = path.join(
    __dirname,
    '..',
    'resources',
    'puppeteer',
    'chrome',
    'win64-143.0.7499.169',
    'chrome-win64',
    'chrome.exe'
  );
  return fs.existsSync(candidate) ? candidate : null;
}

function writeTempExtension(fp) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-webgl-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (webgl e2e)',
    version: '0.0.0',
    description: 'E2E webgl validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-WebGL', 'enhanced'));
  return { tmpDir, extDir };
}

async function main() {
  const fp = normalizeFingerprintSpec({
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      webgl: {
        enabled: true,
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) Iris(TM) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
        unmaskedVendor: 'Intel Inc.',
        unmaskedRenderer: 'Intel(R) Iris(TM) Xe Graphics'
      }
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-webgl-'));

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath || undefined,
    userDataDir,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://example.com/', { waitUntil: 'domcontentloaded' });

    const observed = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) return { ok: false, error: 'no webgl' };

      const VENDOR = 0x1f00;
      const RENDERER = 0x1f01;
      const vendor = gl.getParameter(VENDOR);
      const renderer = gl.getParameter(RENDERER);

      let unmaskedVendor = null;
      let unmaskedRenderer = null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
        unmaskedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }

      return { ok: true, vendor, renderer, unmaskedVendor, unmaskedRenderer, hasDebugExt: Boolean(ext) };
    });

    const expected = fp.cdp.webgl;
    const ok =
      observed.ok === true &&
      observed.vendor === expected.vendor &&
      observed.renderer === expected.renderer &&
      (!observed.hasDebugExt || (observed.unmaskedVendor === expected.unmaskedVendor && observed.unmaskedRenderer === expected.unmaskedRenderer));

    console.log(JSON.stringify({ ok, expected: { vendor: expected.vendor, renderer: expected.renderer, unmaskedVendor: expected.unmaskedVendor, unmaskedRenderer: expected.unmaskedRenderer }, observed }, null, 2));
  } finally {
    await browser.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


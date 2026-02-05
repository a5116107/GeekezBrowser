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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-media-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (media e2e)',
    version: '0.0.0',
    description: 'E2E media/permissions validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-Media', 'enhanced'));
  return { tmpDir, extDir };
}

async function main() {
  const fp = normalizeFingerprintSpec({
    cdp: { locale: 'en-US', timezoneId: 'America/Los_Angeles' }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-media-'));

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

    const observed = await page.evaluate(async () => {
      const out = { perms: {}, devices: null, errors: [] };
      try {
        if (navigator.permissions && navigator.permissions.query) {
          out.perms.geolocation = await navigator.permissions.query({ name: 'geolocation' });
          out.perms.camera = await navigator.permissions.query({ name: 'camera' });
          out.perms.microphone = await navigator.permissions.query({ name: 'microphone' });
        }
      } catch (e) {
        out.errors.push('permissions:' + String(e && e.message ? e.message : e));
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          out.devices = Array.isArray(devices)
            ? devices.map((d) => ({ kind: d.kind, label: d.label, deviceId: d.deviceId, groupId: d.groupId }))
            : devices;
        }
      } catch (e) {
        out.errors.push('devices:' + String(e && e.message ? e.message : e));
      }

      // Reduce permission objects to state fields
      const simplify = (p) => (p && typeof p.state === 'string' ? p.state : null);
      out.perms = {
        geolocation: simplify(out.perms.geolocation),
        camera: simplify(out.perms.camera),
        microphone: simplify(out.perms.microphone)
      };

      return out;
    });

    const ok =
      observed.errors.length === 0 &&
      observed.perms.geolocation === 'prompt' &&
      observed.perms.camera === 'prompt' &&
      observed.perms.microphone === 'prompt' &&
      Array.isArray(observed.devices) &&
      observed.devices.every((d) => typeof d.kind === 'string' && typeof d.deviceId === 'string');

    console.log(JSON.stringify({ ok, observed }, null, 2));
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


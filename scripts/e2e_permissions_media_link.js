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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-perm-media-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (perm-media e2e)',
    version: '0.0.0',
    description: 'E2E permissions-media linkage validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-PermMedia', 'enhanced'));
  return { tmpDir, extDir };
}

async function runCase(caseName, fpOverrides) {
  const fp = normalizeFingerprintSpec({
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      mediaDevices: { enabled: true, audioinput: 1, audiooutput: 1, videoinput: 2, labels: false },
      permissions: { camera: 'prompt', microphone: 'prompt', geolocation: 'prompt' },
      ...fpOverrides
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-perm-media-'));

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
      const perms = {};
      perms.camera = (await navigator.permissions.query({ name: 'camera' })).state;
      perms.microphone = (await navigator.permissions.query({ name: 'microphone' })).state;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const counts = { audioinput: 0, audiooutput: 0, videoinput: 0 };
      for (const d of devices) {
        if (counts[d.kind] !== undefined) counts[d.kind] += 1;
      }
      return { perms, counts, total: devices.length };
    });

    return { caseName, expected: fp.cdp, observed };
  } finally {
    await browser.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

async function main() {
  const a = await runCase('baseline', {});
  const b = await runCase('deny_camera', { permissions: { camera: 'denied', microphone: 'prompt', geolocation: 'prompt' } });
  const c = await runCase('deny_mic', { permissions: { camera: 'prompt', microphone: 'denied', geolocation: 'prompt' } });

  const ok =
    a.observed.perms.camera === 'prompt' &&
    a.observed.counts.videoinput === 2 &&
    b.observed.perms.camera === 'denied' &&
    b.observed.counts.videoinput === 0 &&
    c.observed.perms.microphone === 'denied' &&
    c.observed.counts.audioinput === 0;

  console.log(JSON.stringify({ ok, cases: [a, b, c] }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


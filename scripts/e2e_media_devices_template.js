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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-media-tmpl-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (media tmpl e2e)',
    version: '0.0.0',
    description: 'E2E media template validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-MediaTmpl', 'enhanced'));
  return { tmpDir, extDir };
}

async function main() {
  const fp = normalizeFingerprintSpec({
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      mediaDevices: { enabled: true, audioinput: 1, audiooutput: 1, videoinput: 2, labels: false }
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-media-tmpl-'));

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
      const devices = await navigator.mediaDevices.enumerateDevices();
      const counts = { audioinput: 0, audiooutput: 0, videoinput: 0 };
      for (const d of devices) {
        if (counts[d.kind] !== undefined) counts[d.kind] += 1;
      }
      return { total: devices.length, counts, sample: devices.slice(0, 5).map(d => ({ kind: d.kind, deviceId: d.deviceId, label: d.label })) };
    });

    const ok =
      observed.counts.audioinput === 1 &&
      observed.counts.audiooutput === 1 &&
      observed.counts.videoinput === 2 &&
      observed.sample.every(d => d.label === '');

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


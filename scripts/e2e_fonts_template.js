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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-fonts-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (fonts e2e)',
    version: '0.0.0',
    description: 'E2E fonts template validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-Fonts', 'enhanced'));
  return { tmpDir, extDir };
}

async function main() {
  const fp = normalizeFingerprintSpec({
    noiseSeed: 777777,
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      fonts: { enabled: true, fonts: ['Arial', 'Times New Roman'] }
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-fonts-'));

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
      const canCheck = Boolean(document.fonts && document.fonts.check);
      const checks = {};
      if (canCheck) {
        checks.arial = document.fonts.check('16px "Arial"', 'test');
        checks.tnr = document.fonts.check('16px "Times New Roman"', 'test');
        checks.comic = document.fonts.check('16px "Comic Sans MS"', 'test');
      }
      return { canCheck, checks };
    });

    const ok = observed.canCheck && observed.checks.arial === true && observed.checks.tnr === true && observed.checks.comic === false;
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

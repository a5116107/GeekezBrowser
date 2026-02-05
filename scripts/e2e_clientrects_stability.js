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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-rects-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (rects e2e)',
    version: '0.0.0',
    description: 'E2E rects stability validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-Rects', 'enhanced'));
  return { tmpDir, extDir };
}

async function sample(page) {
  return await page.evaluate(() => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute; left:10px; top:20px; width:123.45px; height:67.89px; font-size:16px; font-family: Arial;';
    el.textContent = 'hello';
    document.body.appendChild(el);

    const r = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const rr = range.getBoundingClientRect();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '16px Arial';
    const mt = ctx.measureText('hello');

    el.remove();
    return {
      el: { left: r.left, top: r.top, width: r.width, height: r.height },
      range: { left: rr.left, top: rr.top, width: rr.width, height: rr.height },
      mtWidth: mt.width
    };
  });
}

async function main() {
  const fp = normalizeFingerprintSpec({
    noiseSeed: 123456,
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      fonts: { enabled: true }
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-rects-'));

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

    const a = await sample(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const b = await sample(page);

    const ok = JSON.stringify(a) === JSON.stringify(b);
    console.log(JSON.stringify({ ok, a, b }, null, 2));
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


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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-fonts-multi-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (fonts multi e2e)',
    version: '0.0.0',
    description: 'E2E fonts multi-probe validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-FontsMulti', 'enhanced'));
  return { tmpDir, extDir };
}

async function main() {
  const allowed = ['Arial', 'Times New Roman'];
  const disallowed = 'Comic Sans MS';

  const fp = normalizeFingerprintSpec({
    noiseSeed: 888888,
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      fonts: { enabled: true, fonts: allowed }
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-fonts-multi-'));

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

    const observed = await page.evaluate((allowedFonts, disallowedFont) => {
      const out = { fontsCheck: {}, widths: {}, notes: [] };

      if (document.fonts && document.fonts.check) {
        for (const f of allowedFonts) out.fontsCheck[f] = document.fonts.check(`16px "${f}"`, 'test');
        out.fontsCheck[disallowedFont] = document.fonts.check(`16px "${disallowedFont}"`, 'test');
      }

      const span = document.createElement('span');
      span.textContent = 'mmmmmmmmmmlli'; // width-sensitive
      span.style.cssText = 'position:absolute; left:-9999px; top:-9999px; font-size:32px;';
      document.body.appendChild(span);

      function widthFor(fontFamily) {
        span.style.fontFamily = `"${fontFamily}", sans-serif`;
        return span.offsetWidth;
      }

      const wFallback = widthFor('sans-serif');
      out.widths.fallback = wFallback;
      for (const f of allowedFonts) out.widths[f] = widthFor(f);
      out.widths[disallowedFont] = widthFor(disallowedFont);

      span.remove();
      return out;
    }, allowed, disallowed);

    const okFontsCheck = observed.fontsCheck['Arial'] === true && observed.fontsCheck['Times New Roman'] === true && observed.fontsCheck[disallowed] === false;
    const okDisallowedWidthMatchesFallback = typeof observed.widths[disallowed] === 'number' && observed.widths[disallowed] === observed.widths.fallback;
    const ok = okFontsCheck && okDisallowedWidthMatchesFallback;

    console.log(JSON.stringify({ ok, okFontsCheck, okDisallowedWidthMatchesFallback, observed }, null, 2));
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


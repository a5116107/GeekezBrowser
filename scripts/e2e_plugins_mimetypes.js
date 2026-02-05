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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-plugins-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (plugins e2e)',
    version: '0.0.0',
    description: 'E2E plugins/mimeTypes validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), getInjectScript(fp, 'E2E-Plugins', 'enhanced'));
  return { tmpDir, extDir };
}

async function main() {
  const fp = normalizeFingerprintSpec({
    cdp: {
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      plugins: {
        enabled: true,
        list: [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        mimes: [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ]
      }
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-plugins-'));

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
      const p = navigator.plugins;
      const m = navigator.mimeTypes;
      return {
        pluginsLen: p ? p.length : null,
        plugin0: p && p[0] ? { name: p[0].name, filename: p[0].filename, description: p[0].description } : null,
        pluginsNamed: p && p.namedItem ? Boolean(p.namedItem('Chrome PDF Plugin')) : null,
        mimesLen: m ? m.length : null,
        mime0: m && m[0] ? { type: m[0].type, suffixes: m[0].suffixes, description: m[0].description } : null,
        mimesNamed: m && m.namedItem ? Boolean(m.namedItem('application/pdf')) : null
      };
    });

    const ok =
      observed.pluginsLen === 1 &&
      observed.plugin0 &&
      observed.plugin0.name === 'Chrome PDF Plugin' &&
      observed.mimesLen === 1 &&
      observed.mime0 &&
      observed.mime0.type === 'application/pdf' &&
      observed.pluginsNamed === true &&
      observed.mimesNamed === true;

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


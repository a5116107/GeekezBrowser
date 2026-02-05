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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ext-'));
  const extDir = path.join(tmpDir, 'extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'GeekEZ Guard (e2e)',
    version: '0.0.0',
    description: 'E2E injection validation',
    content_scripts: [
      { matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_start', all_frames: true, world: 'MAIN' }
    ]
  };

  const scriptContent = getInjectScript(fp, 'E2E', 'enhanced');
  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'content.js'), scriptContent);

  return { tmpDir, extDir };
}

async function applyCdpOverrides(page, fp) {
  const cdp = fp.cdp || {};
  const session = await page.target().createCDPSession();
  await session.send('Network.enable');

  if (cdp.timezoneId && cdp.timezoneId !== 'Auto') {
    try { await session.send('Emulation.setTimezoneOverride', { timezoneId: cdp.timezoneId }); } catch (e) {}
  }
  if (cdp.locale && cdp.locale !== 'auto') {
    try { await session.send('Emulation.setLocaleOverride', { locale: cdp.locale }); } catch (e) {}
  }
  if (cdp.geolocation && typeof cdp.geolocation === 'object') {
    const { latitude, longitude, accuracy } = cdp.geolocation;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      try {
        await session.send('Emulation.setGeolocationOverride', {
          latitude,
          longitude,
          accuracy: typeof accuracy === 'number' ? accuracy : 100
        });
      } catch (e) {}
    }
  }
  if (cdp.userAgent || cdp.userAgentMetadata || cdp.locale) {
    const payload = {};
    if (cdp.userAgent) payload.userAgent = cdp.userAgent;
    if (cdp.userAgentMetadata) payload.userAgentMetadata = cdp.userAgentMetadata;
    if (cdp.locale) payload.acceptLanguage = cdp.locale;
    try { await session.send('Network.setUserAgentOverride', payload); } catch (e) {}
  }

  return session;
}

async function main() {
  const fp = normalizeFingerprintSpec({
    timezone: process.env.E2E_TZ || 'Europe/London',
    cdp: {
      timezoneId: process.env.E2E_TZ || 'Europe/London',
      locale: process.env.E2E_LOCALE || 'en-GB',
      geolocation: {
        latitude: Number(process.env.E2E_LAT || '51.5074'),
        longitude: Number(process.env.E2E_LNG || '-0.1278'),
        accuracy: Number(process.env.E2E_ACC || '100')
      },
      userAgent: process.env.E2E_UA || null,
      userAgentMetadata: null
    }
  });

  const { tmpDir, extDir } = writeTempExtension(fp);
  const chromePath = getBundledChromePath();

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geekez-ud-'));
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath || undefined,
    userDataDir,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      `--lang=${fp.cdp.locale}`,
      `--accept-lang=${fp.cdp.locale}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  try {
    const page = await browser.newPage();
    await browser.defaultBrowserContext().overridePermissions('https://example.com', ['geolocation']);

    const session = await applyCdpOverrides(page, fp);

    await page.goto('https://example.com/', { waitUntil: 'domcontentloaded' });

    const observed = await page.evaluate(async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
      const navLang = navigator.language;
      const navLangs = navigator.languages;
      const ua = navigator.userAgent;

      let geo = null;
      try {
        geo = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
            (err) => resolve({ ok: false, error: String(err && err.message ? err.message : err) }),
            { timeout: 5000 }
          );
        });
      } catch (e) {
        geo = { ok: false, error: String(e && e.message ? e.message : e) };
      }

      return { tz, intlLocale, navLang, navLangs, ua, geo };
    });

    const expected = {
      tz: fp.cdp.timezoneId,
      locale: fp.cdp.locale
    };

    const ok =
      observed.tz === expected.tz &&
      observed.intlLocale === expected.locale &&
      observed.navLang === expected.locale &&
      Array.isArray(observed.navLangs) &&
      observed.navLangs[0] === expected.locale;

    console.log(JSON.stringify({ ok, expected, observed }, null, 2));

    try { await session.detach(); } catch (e) {}
    await page.close();
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


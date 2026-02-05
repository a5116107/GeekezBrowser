const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function main() {
  const timezoneId = process.env.SMOKE_TZ || 'Europe/London';
  const locale = process.env.SMOKE_LOCALE || 'en-GB';
  const latitude = Number(process.env.SMOKE_LAT || '51.5074');
  const longitude = Number(process.env.SMOKE_LNG || '-0.1278');
  const accuracy = Number(process.env.SMOKE_ACC || '100');
  const userAgent = process.env.SMOKE_UA || null;

  const bundledChrome = path.join(
    __dirname,
    '..',
    'resources',
    'puppeteer',
    'chrome',
    'win64-143.0.7499.169',
    'chrome-win64',
    'chrome.exe'
  );

  const executablePath = fs.existsSync(bundledChrome) ? bundledChrome : undefined;

  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: { width: 1200, height: 800 },
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  try {
    const page = await browser.newPage();
    const session = await page.target().createCDPSession();

    await session.send('Network.enable');

    try {
      await session.send('Emulation.setTimezoneOverride', { timezoneId });
    } catch (e) {
      console.error('[CDP] setTimezoneOverride failed:', e.message);
    }

    try {
      await session.send('Emulation.setLocaleOverride', { locale });
    } catch (e) {
      console.error('[CDP] setLocaleOverride failed:', e.message);
    }

    try {
      await session.send('Emulation.setGeolocationOverride', {
        latitude,
        longitude,
        accuracy
      });
    } catch (e) {
      console.error('[CDP] setGeolocationOverride failed:', e.message);
    }

    if (userAgent) {
      try {
        await session.send('Network.setUserAgentOverride', { userAgent });
      } catch (e) {
        console.error('[CDP] setUserAgentOverride failed:', e.message);
      }
    }

    // Use a secure origin so geolocation API is allowed.
    await page.goto('https://example.com/', { waitUntil: 'domcontentloaded' });

    try {
      await page.setBypassCSP(true);
    } catch (e) {}

    try {
      await browser.defaultBrowserContext().overridePermissions('https://example.com', ['geolocation']);
    } catch (e) {
      console.error('[perm] overridePermissions failed:', e.message);
    }

    const result = await page.evaluate(async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
      const lang = navigator.language;
      const langs = navigator.languages;
      const ua = navigator.userAgent;
      const dt = new Date().toString();

      let geo = null;
      try {
        geo = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve({ ok: false, error: 'no geolocation' });
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ ok: true, coords: pos.coords }),
            (err) => resolve({ ok: false, error: String(err && err.message ? err.message : err) }),
            { timeout: 5000 }
          );
        });
      } catch (e) {
        geo = { ok: false, error: String(e && e.message ? e.message : e) };
      }

      return { tz, intlLocale, lang, langs, ua, dt, geo };
    });

    console.log(JSON.stringify({ expected: { timezoneId, locale, latitude, longitude, accuracy }, observed: result }, null, 2));

    await session.detach();
    await page.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

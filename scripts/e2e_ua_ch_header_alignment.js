const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const { normalizeFingerprintSpec } = require('../fingerprint');

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

async function main() {
  const fp = normalizeFingerprintSpec({
    platform: 'Win32',
    cdp: {
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Safari/537.36'
    }
  });

  const chromePath = getBundledChromePath();
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath || undefined,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--no-first-run', '--no-default-browser-check']
  });

  try {
    const page = await browser.newPage();
    const session = await page.target().createCDPSession();
    await session.send('Network.enable');
    await session.send('Network.setUserAgentOverride', {
      userAgent: fp.cdp.userAgent,
      userAgentMetadata: fp.cdp.userAgentMetadata,
      acceptLanguage: fp.cdp.locale
    });

    // Fetch echoed request headers from httpbin (inside browser context)
    const res = await page.goto('https://httpbin.org/headers', { waitUntil: 'domcontentloaded' });
    const body = await res.text();
    const json = JSON.parse(body);
    const h = json && json.headers ? json.headers : {};

    const secChPlatform = h['Sec-Ch-Ua-Platform'] || h['sec-ch-ua-platform'] || null;
    const secChUa = h['Sec-Ch-Ua'] || h['sec-ch-ua'] || null;
    const ua = h['User-Agent'] || h['User-agent'] || null;

    const expectedPlatform = `"${fp.cdp.userAgentMetadata.platform}"`;
    const ok =
      typeof ua === 'string' &&
      ua.includes('Chrome/') &&
      typeof secChPlatform === 'string' &&
      secChPlatform === expectedPlatform &&
      typeof secChUa === 'string';

    console.log(JSON.stringify({ ok, expected: { secChPlatform: expectedPlatform }, observed: { ua, secChPlatform, secChUa } }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


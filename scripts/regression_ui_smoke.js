/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getBundledChromeExecutable() {
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
  return fs.existsSync(bundledChrome) ? bundledChrome : undefined;
}

function toFileUrl(filePath) {
  const abs = path.resolve(filePath);
  return `file://${abs.replace(/\\/g, '/')}`;
}

async function main() {
  const executablePath = getBundledChromeExecutable();
  const indexUrl = toFileUrl(path.join(__dirname, '..', 'index.html'));

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: { width: 1400, height: 900 },
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => {
      console.error('[ui regression] pageerror:', err && err.message ? err.message : err);
    });
    page.on('console', (msg) => {
      try {
        const type = msg.type();
        if (type === 'error') console.error('[ui regression] console.error:', msg.text());
      } catch (e) {}
    });

    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('geekez_lang', 'en');
        localStorage.setItem('geekez_theme', 'geek');
      } catch (e) {}

      const noop = () => {};
      window.electronAPI = {
        on: noop,
        onProfileStatus: noop,
        onLeakCheckFinished: noop,
        onRefreshProfiles: noop,
        onApiLaunchProfile: noop,
        onProxyConsistencyWarning: noop,
        invoke: async (channel) => {
          if (channel === 'get-app-info') return { version: '0.0.0-test' };
          if (channel === 'check-app-update') return { update: false };
          if (channel === 'check-xray-update') return { update: false };
          if (channel === 'get-user-extensions') return [];
          if (channel === 'get-data-path-info') return { currentPath: 'C:/GeekEZ/data', defaultPath: 'C:/GeekEZ/data', isCustom: false };
          if (channel === 'get-api-status') return { running: false, port: 12138 };
          if (channel === 'start-api-server') return { success: true, token: 'stub-token' };
          if (channel === 'stop-api-server') return { success: true };
          return { success: true };
        },
        getSettings: async () => ({
          mode: 'single',
          enablePreProxy: false,
          enableSystemProxy: false,
          enableRemoteDebugging: false,
          enableCustomArgs: false,
          enableApiServer: false,
          apiPort: 12138,
          apiToken: 'stub-token',
          defaultProxyConsistency: 'warn',
          subscriptionPrivateAllowlist: [],
          preProxies: [
            {
              id: 'px-1',
              remark: 'Stub Node',
              url: 'socks://127.0.0.1:1080',
              enable: true,
              groupId: 'manual',
              latency: -1,
              lastTestOk: false,
              lastTestAt: 0,
              lastTestCode: '',
              lastTestMsg: ''
            }
          ],
          subscriptions: [],
          proxyBatchTestStrategy: {
            profile: 'quick',
            maxConcurrency: 1,
            batchSize: 20,
            budgetSec: 8,
            backoffBaseMs: 250,
            probeTimeoutMs: 3500,
            ipTimeoutMs: 3000,
            geoTimeoutMs: 3000,
            probeCount: 1,
            probeParallelism: 1,
            includeGeo: false,
            engineBootWaitMs: 500
          }
        }),
        saveSettings: async () => ({ success: true }),
        getProfiles: async () => ([
          { id: 'p1', name: 'Demo Profile 1', proxyStr: '', tags: ['demo'], diagnostics: {} },
          { id: 'p2', name: 'Demo Profile 2', proxyStr: '', tags: [], diagnostics: {} }
        ]),
        getRunningIds: async () => [],
        updateProfile: async () => ({ success: true }),
        clearProfileLogs: async () => ({ success: true }),
        getProfileLogSizes: async () => ({ success: true, xray: 0, singbox: 0 }),
        readTextFile: async () => ({ success: false, error: 'stub' }),
        openPath: async () => ({ success: false, error: 'stub' }),
        showItemInFolder: async () => ({ success: false, error: 'stub' }),
        openExternal: async () => ({ success: false, error: 'stub' }),
        getRunningProfiles: async () => [],
        launchProfile: async () => ({ success: true }),
        stopProfile: async () => ({ success: true }),
        restartProfile: async () => ({ success: true })
      };
    });

    await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });
    try {
      await page.setBypassCSP(true);
    } catch (e) {}

    await page.waitForFunction(
      () => document.querySelectorAll('#profileTableBody .profile-row').length >= 1 || document.querySelectorAll('#profileList .profile-item').length >= 1,
      { timeout: 15000 }
    );
    try {
      await page.waitForFunction(() => !document.getElementById('splash'), { timeout: 6000 });
    } catch (e) {
      // Don't hard-fail on splash timing; the UI should still be interactive.
    }

    const getText = (selector) => page.$eval(selector, (el) => (el && el.innerText ? el.innerText : ''));

    const newProfileEn = await getText('[data-i18n="newProfile"]');
    assert(/new/i.test(newProfileEn), `expected EN 'newProfile' after init, got: ${newProfileEn}`);

    await page.click('#langToggleBtn');
    const langStateAfterToggle = await page.evaluate(() => {
      try {
        return { storage: localStorage.getItem('geekez_lang'), curLang: window.curLang };
      } catch (e) {
        return { storage: null, curLang: window.curLang };
      }
    });
    await page.waitForFunction(
      () => (document.querySelector('[data-i18n="newProfile"]') || {}).innerText !== undefined,
      { timeout: 2000 }
    );
    const newProfileCn = await getText('[data-i18n="newProfile"]');
    assert(
      /cn/.test(String(langStateAfterToggle && (langStateAfterToggle.storage || langStateAfterToggle.curLang) || '')),
      `expected language state to become cn, got: ${JSON.stringify(langStateAfterToggle)}`
    );
    assert(/[新建创建环境]/.test(newProfileCn), `expected CN 'newProfile' after toggle, got: ${newProfileCn}`);

    const settingsModalDisplay = await page.evaluate(() => {
      const labelTextNode = document.querySelector('[data-action="open-settings"] .nav-label')?.firstChild;
      if (!labelTextNode) return 'missing-text-node';
      labelTextNode.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const modal = document.getElementById('settingsModal');
      return modal ? getComputedStyle(modal).display : 'missing-modal';
    });
    assert(settingsModalDisplay === 'flex', `expected settings modal to open from text-node click, got: ${settingsModalDisplay}`);
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#settingsModal [data-action="close-settings"]');
      if (closeBtn) closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(
      () => {
        const modal = document.getElementById('settingsModal');
        return !!modal && getComputedStyle(modal).display === 'none';
      },
      { timeout: 3000 }
    );

    await page.click('#profileTableBody .profile-row .more-btn, #profileList .profile-item .profile-more-trigger');
    await page.waitForFunction(
      () => {
        const menu = document.querySelector('#profileTableBody .profile-more-menu, #profileList .profile-item .profile-more-menu');
        return !!(menu && menu.open === true);
      },
      { timeout: 3000 }
    );
    const menuBtnCount = await page.$$eval(
      '.profile-more-menu[open] .profile-more-list button',
      (els) => els.length
    );
    assert(menuBtnCount >= 3, `expected >=3 buttons in profile more menu, got: ${menuBtnCount}`);

    await page.click('[data-action="navigate"][data-action-arg="proxies"], [data-action="open-proxy-manager"]');
    await page.waitForFunction(
      () => {
        const pageEl = document.getElementById('page-proxies');
        if (pageEl && !pageEl.classList.contains('hidden')) return true;
        const overlay = document.getElementById('proxyModal');
        if (!overlay) return false;
        const style = window.getComputedStyle(overlay);
        return style && style.display !== 'none';
      },
      { timeout: 3000 }
    );
    const proxyPageOrModalExists = await page.evaluate(() => {
      const pageEl = document.getElementById('page-proxies');
      if (pageEl && !pageEl.classList.contains('hidden')) return true;
      const modal = document.querySelector('#proxyModal .proxy-main');
      return !!modal;
    });
    assert(proxyPageOrModalExists, 'expected proxy page or modal to exist');

    const subEditDisplay = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[data-action="open-sub-edit-modal"][data-action-arg="true"]'));
      if (buttons.length === 0) return 'missing-button';
      const visibleBtn = buttons.find((btn) => {
        const style = getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }) || buttons[0];
      const textNode = Array.from(visibleBtn.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && String(node.textContent || '').trim())
        || visibleBtn.firstChild;
      if (!textNode) return 'missing-text-node';
      textNode.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const modal = document.getElementById('subEditModal');
      return modal ? getComputedStyle(modal).display : 'missing-modal';
    });
    assert(subEditDisplay === 'flex', `expected sub edit modal to open from text-node click, got: ${subEditDisplay}`);
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#subEditModal [data-action="close-sub-edit-modal"]');
      if (closeBtn) closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(
      () => {
        const modal = document.getElementById('subEditModal');
        return !!modal && getComputedStyle(modal).display === 'none';
      },
      { timeout: 3000 }
    );

    const confirmDisplay = await page.evaluate(() => {
      const delBtn = document.querySelector('#proxyPageTableBody button[data-role="proxy-page-del"][data-proxy-id="px-1"]');
      if (!delBtn) return 'missing-del';
      const textNode = Array.from(delBtn.childNodes).find((node) => node.nodeType === Node.TEXT_NODE) || delBtn.firstChild;
      if (!textNode) return 'missing-del-text';
      textNode.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const modal = document.getElementById('confirmModal');
      return modal ? getComputedStyle(modal).display : 'missing-confirm';
    });
    assert(confirmDisplay === 'flex', `expected confirm modal to open from del text-node click, got: ${confirmDisplay}`);
    await page.evaluate(() => {
      const cancelBtn = document.querySelector('#confirmModal [data-action="close-confirm"][data-action-arg="false"]');
      if (cancelBtn) cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(
      () => {
        const modal = document.getElementById('confirmModal');
        return !!modal && getComputedStyle(modal).display === 'none';
      },
      { timeout: 3000 }
    );

    console.log('[ok] ui smoke regression checks passed');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error('[ui regression] failed:', e && e.message ? e.message : e);
  process.exit(1);
});

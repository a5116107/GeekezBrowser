/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message + ` (missing: ${needle})`);
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message);
}

function collectRequestRaws(items, out = []) {
  if (!Array.isArray(items)) return out;
  items.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    if (item.request && item.request.url && typeof item.request.url.raw === 'string') {
      out.push(item.request.url.raw);
    }
    if (Array.isArray(item.item)) collectRequestRaws(item.item, out);
  });
  return out;
}

function main() {
  const root = process.cwd();
  const mainJs = readText(path.join(root, 'main.js'));
  const preloadJs = readText(path.join(root, 'preload.js'));
  const rendererJs = readText(path.join(root, 'renderer.js'));
  const indexHtml = readText(path.join(root, 'index.html'));
  const i18nJs = readText(path.join(root, 'i18n.js'));
  const zhCnJs = readText(path.join(root, 'locales', 'zh-CN.js'));
  const apiDoc = readText(path.join(root, 'docs', 'API_COOKIE_EXAMPLES.md'));
  const packageJsonText = readText(path.join(root, 'package.json'));
  const postmanCollectionText = readText(path.join(root, 'docs', 'postman', 'GeekEZ_Cookie_API.postman_collection.json'));
  const postmanEnvText = readText(path.join(root, 'docs', 'postman', 'GeekEZ_Local.postman_environment.json'));
  const postmanGuideText = readText(path.join(root, 'docs', 'postman', 'README.md'));
  const workflowText = readText(path.join(root, '.github', 'workflows', 'cookie-api-smoke.yml'));

  const requiredMainIpc = [
    "ipcMain.handle('get-profile-cookie-sites'",
    "ipcMain.handle('get-profile-cookies'",
    "ipcMain.handle('set-profile-cookie'",
    "ipcMain.handle('delete-profile-cookie'",
    "ipcMain.handle('clear-profile-cookies-site'",
    "ipcMain.handle('export-profile-cookies'",
    "ipcMain.handle('import-profile-cookies'",
  ];
  requiredMainIpc.forEach((needle) => {
    assertContains(mainJs, needle, 'main.js Cookie IPC missing');
  });

  const requiredMainApiRoutes = [
    '/cookies/sites',
    '/cookies/delete',
    '/cookies/clear',
    '/cookies/export',
    '/cookies/import',
  ];
  requiredMainApiRoutes.forEach((needle) => {
    assertContains(mainJs, needle, 'main.js Cookie REST route missing');
  });

  const requiredApiDocSnippets = [
    '/cookies/sites',
    '/cookies/delete',
    '/cookies/clear',
    '/cookies/export',
    '/cookies/import',
    'mode": "replace"',
  ];
  requiredApiDocSnippets.forEach((needle) => {
    assertContains(apiDoc, needle, 'API_COOKIE_EXAMPLES.md missing snippet');
  });
  ['smoke:cookie-api', 'smoke:cookie-api:newman'].forEach((needle) => {
    assertContains(apiDoc, needle, 'API_COOKIE_EXAMPLES.md missing smoke command');
  });
  assertContains(apiDoc, 'docs/postman/README.md', 'API_COOKIE_EXAMPLES.md missing Postman guide link');
  ['cookie-api-smoke.yml', 'GEEKEZ_API_TOKEN', 'profile_id_or_name'].forEach((needle) => {
    assertContains(apiDoc, needle, 'API_COOKIE_EXAMPLES.md missing workflow usage note');
  });

  let postmanCollection;
  let postmanEnv;
  let pkg;
  try {
    postmanCollection = JSON.parse(postmanCollectionText);
  } catch (err) {
    throw new Error('Postman collection JSON is invalid');
  }
  try {
    postmanEnv = JSON.parse(postmanEnvText);
  } catch (err) {
    throw new Error('Postman environment JSON is invalid');
  }
  try {
    pkg = JSON.parse(packageJsonText);
  } catch (err) {
    throw new Error('package.json is invalid');
  }

  assertTrue(
    postmanCollection && postmanCollection.info && postmanCollection.info.name,
    'Postman collection missing info.name'
  );
  const requestRaws = collectRequestRaws(postmanCollection.item);
  const requiredPostmanRoutes = [
    '/cookies/sites',
    '/cookies?site=',
    '/cookies/delete',
    '/cookies/clear',
    '/cookies/export',
    '/cookies/import',
  ];
  requiredPostmanRoutes.forEach((segment) => {
    const has = requestRaws.some((raw) => String(raw).includes(segment));
    assertTrue(has, `Postman collection missing route: ${segment}`);
  });

  const envVars = Array.isArray(postmanEnv.values) ? postmanEnv.values.map(v => v && v.key).filter(Boolean) : [];
  ['baseUrl', 'apiToken', 'profileIdOrName', 'site'].forEach((key) => {
    assertTrue(envVars.includes(key), `Postman environment missing variable: ${key}`);
  });

  ['GeekEZ_Cookie_API.postman_collection.json', 'GeekEZ_Local.postman_environment.json', '401 Unauthorized', '404 Profile not found', 'ECONNREFUSED'].forEach((needle) => {
    assertContains(postmanGuideText, needle, 'docs/postman/README.md missing troubleshooting/usage section');
  });

  const smokeScriptText = readText(path.join(root, 'scripts', 'smoke_cookie_api_live.js'));
  const newmanScriptText = readText(path.join(root, 'scripts', 'run_cookie_api_newman.js'));
  assertContains(smokeScriptText, '/cookies/sites', 'smoke_cookie_api_live.js missing core endpoint');
  assertContains(smokeScriptText, '/cookies/delete', 'smoke_cookie_api_live.js missing delete endpoint');
  assertContains(newmanScriptText, 'npx', 'run_cookie_api_newman.js missing npx invocation');
  assertContains(newmanScriptText, 'newman', 'run_cookie_api_newman.js missing newman invocation');

  const scripts = pkg && pkg.scripts ? pkg.scripts : {};
  assertTrue(!!scripts['smoke:cookie-api'], 'package.json missing script smoke:cookie-api');
  assertTrue(!!scripts['smoke:cookie-api:newman'], 'package.json missing script smoke:cookie-api:newman');

  ['workflow_dispatch', 'smoke:cookie-api', 'smoke:cookie-api:newman', 'GEEKEZ_API_TOKEN', 'profile_id_or_name'].forEach((needle) => {
    assertContains(workflowText, needle, 'cookie-api-smoke workflow missing required config');
  });

  const requiredPreload = [
    'getProfileCookieSites:',
    'getProfileCookies:',
    'setProfileCookie:',
    'deleteProfileCookie:',
    'clearProfileCookiesSite:',
    'exportProfileCookies:',
    'importProfileCookies:',
  ];
  requiredPreload.forEach((needle) => {
    assertContains(preloadJs, needle, 'preload.js Cookie bridge missing');
  });

  const requiredRenderer = [
    "case 'cookie-manager':",
    "case 'save-cookie-edit':",
    "case 'import-profile-cookies':",
    'function openCookieManager(',
    'function saveCookieEdit(',
    'function importCurrentCookieScope(',
  ];
  requiredRenderer.forEach((needle) => {
    assertContains(rendererJs, needle, 'renderer.js Cookie UI workflow missing');
  });

  const requiredHtml = [
    'id="cookieManagerModal"',
    'id="cookieSiteSelect"',
    'id="cookieTableBody"',
    'id="cookieEditName"',
    'data-action="save-cookie-edit"',
    'data-action="import-profile-cookies"',
  ];
  requiredHtml.forEach((needle) => {
    assertContains(indexHtml, needle, 'index.html Cookie modal missing');
  });

  const requiredI18nKeys = [
    'cookieManagerBtn',
    'cookieManagerTitleFmt',
    'cookieSummaryFmt',
    'cookieImportModePrompt',
    'cookieCleared',
  ];
  requiredI18nKeys.forEach((key) => {
    assertContains(i18nJs, `${key}:`, 'i18n.js Cookie key missing');
    assertContains(zhCnJs, `${key}:`, 'zh-CN.js Cookie key missing');
  });

  console.log('[ok] cookie manager regression checks passed');
}

main();

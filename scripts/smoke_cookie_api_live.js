/* eslint-disable no-console */
const crypto = require('crypto');

function getEnv(name, fallback = '') {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function randomSuffix() {
  return crypto.randomBytes(4).toString('hex');
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message);
}

async function apiCall(baseUrl, token, method, path, body = null) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'X-GeekEZ-API-Token': token,
  };
  if (body !== null) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const baseUrl = getEnv('GEEKEZ_API_BASE', 'http://localhost:12138').replace(/\/+$/, '');
  const token = getEnv('GEEKEZ_API_TOKEN', '');
  const profile = encodeURIComponent(getEnv('GEEKEZ_PROFILE', ''));
  const site = getEnv('GEEKEZ_COOKIE_SITE', 'example.com');

  if (!token || !profile) {
    console.log('[skip] smoke:cookie-api requires env GEEKEZ_API_TOKEN + GEEKEZ_PROFILE');
    console.log('[hint] optional env: GEEKEZ_API_BASE (default http://localhost:12138), GEEKEZ_COOKIE_SITE (default example.com)');
    process.exit(0);
  }

  const cookieName = `geekez_smoke_${randomSuffix()}`;
  const cookieValue = `v_${Date.now()}`;
  const cookieDomain = `.${site.replace(/^\./, '')}`;

  console.log('[smoke] GET /api/status');
  const status = await apiCall(baseUrl, token, 'GET', '/api/status');
  assertTrue(status && status.success === true, 'status.success !== true');

  console.log('[smoke] GET /cookies/sites');
  const siteSummary = await apiCall(baseUrl, token, 'GET', `/api/profiles/${profile}/cookies/sites`);
  assertTrue(siteSummary && siteSummary.success === true, 'cookies/sites success !== true');

  console.log('[smoke] POST /cookies (set)');
  const setRes = await apiCall(baseUrl, token, 'POST', `/api/profiles/${profile}/cookies`, {
    site,
    cookie: {
      name: cookieName,
      value: cookieValue,
      domain: cookieDomain,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
      session: true,
    },
  });
  assertTrue(setRes && setRes.success === true, 'set cookie success !== true');

  console.log('[smoke] GET /cookies?site=' + site);
  const listAfterSet = await apiCall(baseUrl, token, 'GET', `/api/profiles/${profile}/cookies?site=${encodeURIComponent(site)}`);
  assertTrue(listAfterSet && listAfterSet.success === true, 'list cookies success !== true');
  const found = Array.isArray(listAfterSet.cookies)
    && listAfterSet.cookies.some((c) => c && c.name === cookieName && String(c.domain || '').replace(/^\./, '') === site.replace(/^\./, ''));
  assertTrue(found, `set cookie not found (${cookieName})`);

  console.log('[smoke] POST /cookies/delete');
  const delRes = await apiCall(baseUrl, token, 'POST', `/api/profiles/${profile}/cookies/delete`, {
    site,
    cookie: {
      name: cookieName,
      domain: cookieDomain,
      path: '/',
    },
  });
  assertTrue(delRes && delRes.success === true, 'delete cookie success !== true');

  console.log('[smoke] verify deleted');
  const listAfterDelete = await apiCall(baseUrl, token, 'GET', `/api/profiles/${profile}/cookies?site=${encodeURIComponent(site)}`);
  assertTrue(listAfterDelete && listAfterDelete.success === true, 'list after delete success !== true');
  const stillExists = Array.isArray(listAfterDelete.cookies)
    && listAfterDelete.cookies.some((c) => c && c.name === cookieName && String(c.domain || '').replace(/^\./, '') === site.replace(/^\./, ''));
  assertTrue(!stillExists, `cookie still exists after delete (${cookieName})`);

  console.log('[ok] cookie api smoke passed');
}

main().catch((err) => {
  console.error('[fail] cookie api smoke failed:', err && err.message ? err.message : err);
  process.exit(1);
});

/* eslint-disable no-console */
const assert = require('assert');
const { fetchWithUrlPolicy } = require('../security/fetchPolicy');

function makeResponse(status, location) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (key) => {
        if (String(key).toLowerCase() === 'location') return location || null;
        return null;
      },
    },
    text: async () => '',
  };
}

async function expectReject(promiseFactory, expectedMessagePart) {
  let thrown = null;
  try {
    await promiseFactory();
  } catch (e) {
    thrown = e;
  }
  if (!thrown) throw new Error(`Expected rejection: ${expectedMessagePart}`);
  const msg = thrown && thrown.message ? thrown.message : String(thrown);
  if (!msg.toLowerCase().includes(String(expectedMessagePart).toLowerCase())) {
    throw new Error(`Unexpected error: ${msg}`);
  }
}

async function main() {
  {
    const calls = [];
    const seenValidated = [];
    const res = await fetchWithUrlPolicy('https://example.com/sub', {
      validateUrl: async (u) => {
        seenValidated.push(String(u));
        return new URL(u);
      },
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        if (url === 'https://example.com/sub') {
          return makeResponse(302, '/sub-final');
        }
        if (url === 'https://example.com/sub-final') {
          return makeResponse(200, null);
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
      headers: { 'If-None-Match': 'abc' },
      maxRedirects: 5,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0].init.redirect, 'manual');
    assert.strictEqual(calls[0].init.headers['If-None-Match'], 'abc');
    assert.deepStrictEqual(
      seenValidated,
      ['https://example.com/sub', 'https://example.com/sub-final'],
    );
  }

  {
    await expectReject(
      () => fetchWithUrlPolicy('https://safe.example/start', {
        validateUrl: async (u) => {
          const s = String(u);
          if (s.includes('127.0.0.1')) throw new Error('private network blocked');
          return new URL(s);
        },
        fetchImpl: async (url) => {
          if (url === 'https://safe.example/start') {
            return makeResponse(302, 'http://127.0.0.1:8080/internal');
          }
          return makeResponse(200, null);
        },
      }),
      'private network blocked',
    );
  }

  {
    const seenOptions = [];
    const res = await fetchWithUrlPolicy('https://safe.example/start', {
      allowedPrivateHosts: ['127.0.0.1'],
      validateUrl: async (u, opts) => {
        seenOptions.push(opts && opts.allowedPrivateHosts ? opts.allowedPrivateHosts.join(',') : '');
        const s = String(u);
        if (s.includes('127.0.0.1') && !(opts && Array.isArray(opts.allowedPrivateHosts) && opts.allowedPrivateHosts.includes('127.0.0.1'))) {
          throw new Error('private network blocked');
        }
        return new URL(s);
      },
      fetchImpl: async (url) => {
        if (url === 'https://safe.example/start') {
          return makeResponse(302, 'http://127.0.0.1:8080/internal');
        }
        return makeResponse(200, null);
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(seenOptions.some((x) => x.includes('127.0.0.1')), true);
  }

  {
    await expectReject(
      () => fetchWithUrlPolicy('https://loop.example/a', {
        validateUrl: async (u) => new URL(u),
        maxRedirects: 2,
        fetchImpl: async (url) => {
          if (url.startsWith('https://loop.example/')) {
            return makeResponse(302, '/a');
          }
          return makeResponse(200, null);
        },
      }),
      'Too many redirects',
    );
  }

  console.log('[ok] fetch policy regression passed');
}

main().catch((e) => {
  console.error('[fail]', e && e.stack ? e.stack : e);
  process.exit(1);
});

/* eslint-disable no-console */
const assert = require('assert');
const {
  parseHttpUrlOrThrow,
  parseHttpFetchUrlOrThrow,
  isPrivateIpLiteral,
  isLocalhostName,
  normalizeAllowedPrivateHostEntry,
  normalizeAllowedPrivateHostList,
} = require('../security/urlPolicy');

async function expectReject(promiseFactory, expectedMessagePart) {
  let thrown = null;
  try {
    await promiseFactory();
  } catch (e) {
    thrown = e;
  }
  if (!thrown) {
    throw new Error(`Expected rejection: ${expectedMessagePart}`);
  }
  const msg = thrown && thrown.message ? thrown.message : String(thrown);
  if (!msg.toLowerCase().includes(String(expectedMessagePart).toLowerCase())) {
    throw new Error(`Unexpected error message: ${msg}`);
  }
}

async function main() {
  assert.strictEqual(parseHttpUrlOrThrow('https://example.com/a').protocol, 'https:');
  assert.strictEqual(parseHttpUrlOrThrow('http://example.com/a').protocol, 'http:');
  assert.throws(() => parseHttpUrlOrThrow('file:///tmp/x'), /Only http\/https URLs are allowed/);

  assert.strictEqual(isPrivateIpLiteral('127.0.0.1'), true);
  assert.strictEqual(isPrivateIpLiteral('10.1.2.3'), true);
  assert.strictEqual(isPrivateIpLiteral('192.168.1.22'), true);
  assert.strictEqual(isPrivateIpLiteral('8.8.8.8'), false);
  assert.strictEqual(isPrivateIpLiteral('::1'), true);
  assert.strictEqual(isPrivateIpLiteral('fd00::1'), true);
  assert.strictEqual(isPrivateIpLiteral('2606:4700:4700::1111'), false);
  assert.strictEqual(isLocalhostName('localhost'), true);
  assert.strictEqual(isLocalhostName('api.localhost'), true);
  assert.strictEqual(normalizeAllowedPrivateHostEntry('*.LOCALHOST'), '*.localhost');
  assert.strictEqual(normalizeAllowedPrivateHostEntry(' https://Intranet.Example.com/path '), 'intranet.example.com');
  assert.strictEqual(normalizeAllowedPrivateHostEntry('bad value ??'), null);
  assert.deepStrictEqual(
    normalizeAllowedPrivateHostList(['*.localhost', '127.0.0.1', 'bad @@ host', '*.localhost']),
    ['*.localhost', '127.0.0.1'],
  );

  await expectReject(() => parseHttpFetchUrlOrThrow('http://localhost:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://api.localhost/path'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://127.0.0.1:12138/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://10.0.0.4:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://172.16.9.9:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://192.168.8.8:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://169.254.1.2:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://[::1]:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://[fd00::1]:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://[fe80::1]:8080/a'), 'private network');
  await expectReject(() => parseHttpFetchUrlOrThrow('http://[::ffff:127.0.0.1]:8080/a'), 'private network');

  const allowLocalhost = await parseHttpFetchUrlOrThrow('http://api.localhost/path', {
    allowedPrivateHosts: ['*.localhost'],
  });
  assert.strictEqual(allowLocalhost.hostname, 'api.localhost');

  const allowPrivateIp = await parseHttpFetchUrlOrThrow('http://127.0.0.1:8080/a', {
    allowedPrivateHosts: ['127.0.0.1'],
  });
  assert.strictEqual(allowPrivateIp.hostname, '127.0.0.1');

  await expectReject(
    () => parseHttpFetchUrlOrThrow('http://127.0.0.1:8080/a', { allowedPrivateHosts: ['10.0.0.1'] }),
    'private network',
  );

  const publicRes = await parseHttpFetchUrlOrThrow('https://example.com/subscription');
  assert.strictEqual(publicRes.hostname, 'example.com');

  const allowPrivate = await parseHttpFetchUrlOrThrow('http://127.0.0.1:8080/a', { blockPrivateNetwork: false });
  assert.strictEqual(allowPrivate.hostname, '127.0.0.1');

  console.log('[ok] url policy regression passed');
}

main().catch((e) => {
  console.error('[fail]', e && e.stack ? e.stack : e);
  process.exit(1);
});

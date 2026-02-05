/* eslint-disable no-console */
const { normalizeProxyInputRaw } = require('../proxy/proxySpec');
const { parseProxyLink } = require('../utils');

function assert(cond, message) {
  if (!cond) {
    const err = new Error(message || 'assert failed');
    err.code = 'ASSERT_FAIL';
    throw err;
  }
}

function expectNormalize(input, expectedPrefix) {
  const out = normalizeProxyInputRaw(input);
  assert(typeof out === 'string', 'normalizeProxyInputRaw must return string');
  assert(out.startsWith(expectedPrefix), `expected normalized to start with ${expectedPrefix}, got: ${out}`);
  return out;
}

function expectProtocol(raw, protocol) {
  const outbound = parseProxyLink(raw, 't');
  assert(outbound && outbound.protocol === protocol, `expected protocol=${protocol}, got: ${outbound && outbound.protocol}`);
  return outbound;
}

function expectSocksAuth(raw, expectedUser, expectedPass) {
  const outbound = expectProtocol(raw, 'socks');
  const server = outbound && outbound.settings && outbound.settings.servers && outbound.settings.servers[0];
  const user = server && Array.isArray(server.users) && server.users.length > 0 ? server.users[0] : null;
  assert(user, `expected socks users, got: ${JSON.stringify(server && server.users)}`);
  assert(user.user === expectedUser, `expected socks user=${expectedUser}, got: ${user.user}`);
  assert(user.pass === expectedPass, `expected socks pass=${expectedPass}, got: ${user.pass}`);
  return outbound;
}

function main() {
  // curl-like snippet with accidental scheme prefix
  const curlLike = 'http://socks5 us2.cliproxy.io:3010 -U "user:pass" https://example.com';
  const curlNorm = expectNormalize(curlLike, 'socks5://');
  expectSocksAuth(curlNorm, 'user', 'pass');

  // curl-like snippet where proxy is already a URL token and -U is provided separately
  const curlUrlHttp = 'http://proxy.example.com:8080 -U "user:pass" https://example.com';
  const curlUrlHttpNorm = expectNormalize(curlUrlHttp, 'http://');
  const curlUrlHttpOut = expectProtocol(curlUrlHttpNorm, 'http');
  const curlUrlHttpUser = curlUrlHttpOut && curlUrlHttpOut.settings && curlUrlHttpOut.settings.servers && curlUrlHttpOut.settings.servers[0] && curlUrlHttpOut.settings.servers[0].users && curlUrlHttpOut.settings.servers[0].users[0];
  assert(curlUrlHttpUser && curlUrlHttpUser.user === 'user' && curlUrlHttpUser.pass === 'pass', `expected http auth user/pass, got: ${JSON.stringify(curlUrlHttpUser)}`);

  const curlUrlSocks = 'socks5://proxy.example.com:1080 --proxy-user user:pass https://example.com';
  const curlUrlSocksNorm = expectNormalize(curlUrlSocks, 'socks5://');
  expectSocksAuth(curlUrlSocksNorm, 'user', 'pass');

  // socks5h:// should be canonicalized to socks5://
  const socks5h = 'socks5h://user:pass@127.0.0.1:1080';
  const socks5hNorm = expectNormalize(socks5h, 'socks5://');
  expectSocksAuth(socks5hNorm, 'user', 'pass');

  // Weird auth order: scheme://host:port@user:pass
  const weirdOrder = 'socks5://proxy.example.com:1080@user:pass';
  const weirdNorm = expectNormalize(weirdOrder, 'socks5://');
  assert(weirdNorm.includes('@proxy.example.com:1080'), 'expected host:port in normalized url');
  expectSocksAuth(weirdNorm, 'user', 'pass');

  // No scheme: user:pass@host:port
  const noSchemeUserHost = 'user:pass@proxy.example.com:1080';
  const noSchemeNorm = expectNormalize(noSchemeUserHost, 'socks5://');
  expectSocksAuth(noSchemeNorm, 'user', 'pass');

  // No scheme: host:port@user:pass
  const hostFirst = 'proxy.example.com:1080@user:pass';
  const hostFirstNorm = expectNormalize(hostFirst, 'socks5://');
  expectSocksAuth(hostFirstNorm, 'user', 'pass');

  // v2rayN socks base64 auth: socks://BASE64(user:pass)@host:port
  const v2raynSocks = 'socks://dXNlcjpwYXNz@proxy.example.com:1080';
  expectSocksAuth(v2raynSocks, 'user', 'pass');

  // Percent-encoded auth in URL userinfo should be decoded
  const encodedAuth = 'socks5://us%3Aer:pa%3Ass@proxy.example.com:1080';
  expectSocksAuth(encodedAuth, 'us:er', 'pa:ss');

  // Scheme: host:port:user:pass
  const httpWeird = 'http://proxy.example.com:8080:user:pass';
  const httpNorm = expectNormalize(httpWeird, 'http://');
  expectProtocol(httpNorm, 'http');

  // Scheme: host:port:user(with space):pass (provider-style, invalid URL without normalization)
  const socksHostPortUserSpace = 'socks5://proxy.example.com:1080:user name:pass';
  const socksHostPortUserSpaceNorm = expectNormalize(socksHostPortUserSpace, 'socks5://');
  expectSocksAuth(socksHostPortUserSpaceNorm, 'user name', 'pass');

  // Percent-encoded auth in URL userinfo should be decoded (http)
  const httpEncoded = 'http://us%3Aer:pa%3Ass@proxy.example.com:8080';
  const httpOut = expectProtocol(httpEncoded, 'http');
  const httpUser = httpOut && httpOut.settings && httpOut.settings.servers && httpOut.settings.servers[0] && httpOut.settings.servers[0].users && httpOut.settings.servers[0].users[0];
  assert(httpUser && httpUser.user === 'us:er' && httpUser.pass === 'pa:ss', `expected http auth decoded, got: ${JSON.stringify(httpUser)}`);

  console.log('[ok] proxy parser regression passed');
}

main();

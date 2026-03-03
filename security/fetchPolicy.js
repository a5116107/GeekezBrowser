const { parseHttpFetchUrlOrThrow } = require('./urlPolicy');

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

async function fetchWithUrlPolicy(url, options = {}) {
  const headers = options.headers || {};
  const signal = options.signal;
  const maxRedirects = Number.isInteger(options.maxRedirects) ? options.maxRedirects : 5;
  const validateUrl = typeof options.validateUrl === 'function' ? options.validateUrl : parseHttpFetchUrlOrThrow;
  const validateOptions = {
    blockPrivateNetwork: options.blockPrivateNetwork,
    allowedPrivateHosts: options.allowedPrivateHosts,
    dnsLookup: options.dnsLookup,
    dnsTimeoutMs: options.dnsTimeoutMs,
  };
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetch;
  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation available');

  let current = await validateUrl(url, validateOptions);
  let redirectCount = 0;

  while (true) {
    const res = await fetchImpl(current.toString(), {
      headers,
      signal,
      redirect: 'manual',
    });

    const status = Number(res && res.status);
    if (!REDIRECT_STATUS.has(status)) return res;

    const location = res && res.headers && typeof res.headers.get === 'function'
      ? res.headers.get('location')
      : null;
    if (!location) throw new Error(`Redirect response missing location (HTTP ${status})`);
    if (redirectCount >= maxRedirects) throw new Error('Too many redirects');

    const nextUrl = new URL(location, current).toString();
    current = await validateUrl(nextUrl, validateOptions);
    redirectCount += 1;
  }
}

module.exports = {
  fetchWithUrlPolicy,
  REDIRECT_STATUS,
};

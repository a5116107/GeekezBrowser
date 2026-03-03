function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function issue(code, severity, message, suggestion) {
  return {
    code,
    severity: severity === 'error' ? 'error' : 'warn',
    message: String(message || code),
    suggestion: suggestion ? String(suggestion) : undefined,
  };
}

function normalizeLocale(value) {
  if (!isNonEmptyString(value)) return null;
  return value.trim();
}

function normalizeCountryCode(value) {
  if (!isNonEmptyString(value)) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();

  const name = raw.toLowerCase();
  const map = {
    'united states': 'US',
    'united kingdom': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'japan': 'JP',
  };
  return map[name] || null;
}

function shouldAutofix(onMismatch) {
  return onMismatch === 'autofix' || onMismatch === 'autoFix';
}

function evaluateProxyFingerprintConsistency(profile, proxyTestResult) {
  const fp = profile && profile.fingerprint ? profile.fingerprint : {};
  const cdp = fp && fp.cdp ? fp.cdp : {};
  const geo = proxyTestResult && proxyTestResult.geo ? proxyTestResult.geo : null;

  const issues = [];
  if (!geo) return { ok: true, issues };

  const proxyTz = isNonEmptyString(geo.timezone) ? geo.timezone : null;
  const fpTz = isNonEmptyString(cdp.timezoneId) ? cdp.timezoneId : (isNonEmptyString(fp.timezone) ? fp.timezone : null);
  if (proxyTz && fpTz && proxyTz !== fpTz) {
    issues.push(issue('PROXY_TZ_MISMATCH', 'error', `proxy timezone ${proxyTz} != fingerprint timezone ${fpTz}`, 'Set fingerprint timezone to match proxy geo'));
  }

  // Optional coarse locale/country check if both exist
  const proxyCountry = isNonEmptyString(geo.country) ? geo.country : null;
  const fpLocale = normalizeLocale(cdp.locale) || normalizeLocale(fp.language);
  if (proxyCountry && fpLocale) {
    // Very coarse heuristic: US/GB/DE/FR/JP common locales.
    const loc = fpLocale.toLowerCase();
    const cc = normalizeCountryCode(proxyCountry)
      || normalizeCountryCode(geo && geo.countryCode ? geo.countryCode : null)
      || normalizeCountryCode(geo && geo.countryName ? geo.countryName : null);
    if (cc === 'US' && !(loc.startsWith('en-us'))) {
      issues.push(issue('PROXY_LOCALE_MISMATCH', 'warn', `proxy country ${proxyCountry} but locale is ${fpLocale}`, 'Use a locale matching proxy country'));
    }
    if (cc === 'GB' && !(loc.startsWith('en-gb'))) {
      issues.push(issue('PROXY_LOCALE_MISMATCH', 'warn', `proxy country ${proxyCountry} but locale is ${fpLocale}`, 'Use a locale matching proxy country'));
    }
    if (cc === 'DE' && !(loc.startsWith('de-de'))) {
      issues.push(issue('PROXY_LOCALE_MISMATCH', 'warn', `proxy country ${proxyCountry} but locale is ${fpLocale}`, 'Use a locale matching proxy country'));
    }
    if (cc === 'FR' && !(loc.startsWith('fr-fr'))) {
      issues.push(issue('PROXY_LOCALE_MISMATCH', 'warn', `proxy country ${proxyCountry} but locale is ${fpLocale}`, 'Use a locale matching proxy country'));
    }
    if (cc === 'JP' && !(loc.startsWith('ja-jp'))) {
      issues.push(issue('PROXY_LOCALE_MISMATCH', 'warn', `proxy country ${proxyCountry} but locale is ${fpLocale}`, 'Use a locale matching proxy country'));
    }
  }

  return { ok: issues.length === 0, issues };
}

function applyConsistencyPolicy({ profile, proxyTestResult, policy }) {
  const onMismatch = policy && policy.onMismatch ? policy.onMismatch : 'warn'; // block|warn|autofix
  const enforce = policy && policy.enforce === true;

  const evaluation = evaluateProxyFingerprintConsistency(profile, proxyTestResult);
  if (evaluation.ok) return { ok: true, issues: [], updatedProfile: profile };

  const updated = JSON.parse(JSON.stringify(profile || {}));
  updated.fingerprint = updated.fingerprint || {};
  updated.fingerprint.cdp = updated.fingerprint.cdp || {};

  if (shouldAutofix(onMismatch)) {
    const geo = proxyTestResult && proxyTestResult.geo ? proxyTestResult.geo : null;
    if (geo && isNonEmptyString(geo.timezone)) {
      updated.fingerprint.timezone = geo.timezone;
      updated.fingerprint.cdp.timezoneId = geo.timezone;
    }
    if (geo && (isNonEmptyString(geo.countryCode) || isNonEmptyString(geo.country) || isNonEmptyString(geo.countryName))) {
      const cc = normalizeCountryCode(geo.countryCode) || normalizeCountryCode(geo.country) || normalizeCountryCode(geo.countryName);
      if (cc) {
        updated.fingerprint.geo = cc;
        if (!isNonEmptyString(updated.fingerprint.cdp.geoCountry)) updated.fingerprint.cdp.geoCountry = cc;
        if (cc === 'US') updated.fingerprint.cdp.locale = 'en-US';
        if (cc === 'GB') updated.fingerprint.cdp.locale = 'en-GB';
        if (cc === 'DE') updated.fingerprint.cdp.locale = 'de-DE';
        if (cc === 'FR') updated.fingerprint.cdp.locale = 'fr-FR';
        if (cc === 'JP') updated.fingerprint.cdp.locale = 'ja-JP';
      }
    }
  }

  if (enforce && onMismatch === 'block') return { ok: false, issues: evaluation.issues, updatedProfile: updated };
  return { ok: onMismatch !== 'block', issues: evaluation.issues, updatedProfile: updated };
}

module.exports = { evaluateProxyFingerprintConsistency, applyConsistencyPolicy };

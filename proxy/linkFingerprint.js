function normalizeCountry(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

function isAutoTimezone(fp) {
  const tz = fp && fp.timezone;
  return !tz || tz === 'Auto' || tz === 'Auto (No Change)' || tz === 'Auto (IP Based)';
}

function isAutoLanguage(fp) {
  const lang = fp && fp.language;
  return !lang || lang === 'auto' || lang === 'Auto' || lang === 'Auto (System Default)';
}

function isAutoGeo(fp) {
  const geo = fp && fp.geo;
  return !geo || geo === 'auto' || geo === 'Auto' || geo === 'Auto (IP Based)';
}

function setCdpIfEmpty(obj, key, value) {
  if (!obj || typeof obj !== 'object') return;
  if (obj[key] === undefined || obj[key] === null || obj[key] === '') obj[key] = value;
}

function applyProxyGeoToFingerprint(profile, testResult, options = {}) {
  const updated = JSON.parse(JSON.stringify(profile || {}));
  updated.fingerprint = updated.fingerprint || {};
  updated.fingerprint.cdp = updated.fingerprint.cdp || {};

  const enforce = options.enforce === true;
  const onMismatch = options.onMismatch || 'warn'; // block|warn|autofix
  const allowAutofix = options.allowAutofix || {};
  const allowLanguage = allowAutofix.language !== false;
  const allowGeo = allowAutofix.geo !== false;

  const geo = testResult && testResult.geo ? testResult.geo : null;
  const tz = geo && geo.timezone ? geo.timezone : null;
  const country = geo && geo.country ? geo.country : null;

  const issues = [];

  if (tz) {
    if (isAutoTimezone(updated.fingerprint) || onMismatch === 'autofix') {
      updated.fingerprint.timezone = tz;
      updated.fingerprint.cdp.timezoneId = tz;
    } else if (updated.fingerprint.timezone !== tz) {
      issues.push({ code: 'TZ_MISMATCH', message: `Fingerprint timezone ${updated.fingerprint.timezone} != proxy timezone ${tz}` });
    }
  }

  if (country) {
    if (isAutoGeo(updated.fingerprint) || (onMismatch === 'autofix' && allowGeo)) {
      updated.fingerprint.geo = country;
      setCdpIfEmpty(updated.fingerprint.cdp, 'geoCountry', country);
    } else if (updated.fingerprint.geo && normalizeCountry(updated.fingerprint.geo) !== normalizeCountry(country)) {
      issues.push({ code: 'GEO_MISMATCH', message: `Fingerprint geo ${updated.fingerprint.geo} != proxy country ${country}` });
    }
  }

  if (country) {
    if (isAutoLanguage(updated.fingerprint) || (onMismatch === 'autofix' && allowLanguage)) {
      const cc = normalizeCountry(country);
      const map = {
        'UNITED STATES': 'en-US',
        'UNITED KINGDOM': 'en-GB',
        'GERMANY': 'de-DE',
        'FRANCE': 'fr-FR',
        'JAPAN': 'ja-JP',
      };
      const locale = map[cc] || null;
      if (locale) {
        updated.fingerprint.language = locale;
        updated.fingerprint.cdp.locale = locale;
      }
    }
  }

  if (enforce && issues.length > 0 && onMismatch === 'block') {
    return { ok: false, updatedProfile: updated, issues };
  }

  return { ok: issues.length === 0 || onMismatch !== 'block', updatedProfile: updated, issues };
}

module.exports = { applyProxyGeoToFingerprint, normalizeCountry };

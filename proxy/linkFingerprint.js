function normalizeCountryCode(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  // ISO-3166 alpha-2
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();

  // Best-effort fallback for providers that return English country names.
  const name = raw.toLowerCase();
  const nameToCode = {
    'united states': 'US',
    'united kingdom': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'japan': 'JP',
  };
  return nameToCode[name] || raw.toUpperCase();
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
  const countryCode = normalizeCountryCode(geo && (geo.countryCode || geo.country) ? String(geo.countryCode || geo.country) : '');

  const issues = [];

  if (tz) {
    if (isAutoTimezone(updated.fingerprint) || onMismatch === 'autofix') {
      updated.fingerprint.timezone = tz;
      updated.fingerprint.cdp.timezoneId = tz;
    } else if (updated.fingerprint.timezone !== tz) {
      issues.push({ code: 'TZ_MISMATCH', message: `Fingerprint timezone ${updated.fingerprint.timezone} != proxy timezone ${tz}` });
    }
  }

  if (countryCode) {
    if (isAutoGeo(updated.fingerprint) || (onMismatch === 'autofix' && allowGeo)) {
      // Use country code for fingerprint geo and CDP geoCountry.
      updated.fingerprint.geo = countryCode;
      setCdpIfEmpty(updated.fingerprint.cdp, 'geoCountry', countryCode);
    } else if (updated.fingerprint.geo && normalizeCountryCode(updated.fingerprint.geo) !== countryCode) {
      issues.push({ code: 'GEO_MISMATCH', message: `Fingerprint geo ${updated.fingerprint.geo} != proxy country ${countryCode}` });
    }
  }

  if (countryCode) {
    if (isAutoLanguage(updated.fingerprint) || (onMismatch === 'autofix' && allowLanguage)) {
      const map = {
        US: 'en-US',
        GB: 'en-GB',
        DE: 'de-DE',
        FR: 'fr-FR',
        JP: 'ja-JP',
      };
      const locale = map[countryCode] || null;
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

module.exports = { applyProxyGeoToFingerprint, normalizeCountryCode };

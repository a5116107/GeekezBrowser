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

function normalizeLang(acceptLanguage) {
  if (!isNonEmptyString(acceptLanguage)) return null;
  const first = acceptLanguage.split(',')[0].trim();
  return first || null;
}

function applyConsistencyRules({ profile, report }) {
  const issues = [];

  const fp = (profile && profile.fingerprint) ? profile.fingerprint : {};
  const timezone = fp.timezone;
  const geo = fp.geolocation;
  const city = fp.city;

  const acceptLanguage = report && report.headers ? report.headers.acceptLanguage : undefined;
  const ua = report && report.headers ? report.headers.userAgent : undefined;

  if (isNonEmptyString(timezone) && geo && typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
    // Heuristic fallback (兜底规则):
    // This is intentionally coarse; it reduces obvious cross-continent mismatches without requiring IP->TZ databases.
    // Prefer stricter matching (IP geo / city mapping) when available, but keep this as a safety net.
    if (timezone.startsWith('America/') && geo.longitude > 30) {
      issues.push(issue('TZ_GEO_MISMATCH', 'error', `timezone ${timezone} mismatches geolocation (${geo.latitude},${geo.longitude})`, 'Switch to template default timezone/city'));
    }
    if ((timezone.startsWith('Asia/') || timezone.startsWith('Europe/')) && geo.longitude < -30) {
      issues.push(issue('TZ_GEO_MISMATCH', 'error', `timezone ${timezone} mismatches geolocation (${geo.latitude},${geo.longitude})`, 'Switch to template default timezone/city'));
    }
  }

  const lang = normalizeLang(acceptLanguage);
  if (lang && isNonEmptyString(city)) {
    if ((lang.startsWith('de-') || lang.startsWith('fr-')) && /los angeles|new york|miami|seattle/i.test(city)) {
      issues.push(issue('LANG_GEO_MISMATCH', 'warn', `acceptLanguage ${lang} may mismatch city ${city}`, 'Use template default language for the selected city'));
    }
  }

  if (report && report.dns && report.dns.status === 'leak') {
    issues.push(issue('DNS_LEAK', 'error', 'DNS leak detected', 'Force DNS via proxy or enable DoH over proxy'));
  }
  if (report && report.ipv6 && report.ipv6.status === 'leak') {
    issues.push(issue('IPV6_LEAK', 'error', 'IPv6 leak detected', 'Disable IPv6 or ensure IPv6 goes through proxy'));
  }
  if (report && report.webrtc && report.webrtc.status === 'leak') {
    issues.push(issue('WEBRTC_LEAK', 'error', 'WebRTC leak detected', 'Disable non-proxied UDP / enforce WebRTC policy'));
  }

  // UA/platform mismatch is hard without reading navigator.platform; keep as optional warning.
  if (isNonEmptyString(ua) && fp && isNonEmptyString(fp.platform)) {
    // Only very coarse check
    const p = fp.platform.toLowerCase();
    const u = ua.toLowerCase();
    if (p.includes('win') && u.includes('mac os')) {
      issues.push(issue('UA_PLATFORM_MISMATCH', 'error', 'UA indicates macOS but fingerprint platform is Windows', 'Use a consistent template (UA/UA-CH/platform)'));
    }
    if (p.includes('mac') && u.includes('windows')) {
      issues.push(issue('UA_PLATFORM_MISMATCH', 'error', 'UA indicates Windows but fingerprint platform is macOS', 'Use a consistent template (UA/UA-CH/platform)'));
    }
  }

  // UA-CH/platform/hardware consistency (reuse shared evaluator)
  try {
    const { evaluateUaChConsistency } = require('../proxy/uaConsistency');
    const more = evaluateUaChConsistency({ profile, headers: report && report.headers ? report.headers : {} });
    if (Array.isArray(more) && more.length > 0) issues.push(...more);
  } catch (e) { }

  return issues;
}

module.exports = { applyConsistencyRules };

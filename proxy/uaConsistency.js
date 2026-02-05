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

function normalizePlatform(value) {
  if (!isNonEmptyString(value)) return null;
  const s = value.replace(/["']/g, '').trim().toLowerCase();
  if (s.includes('windows') || s.includes('win')) return 'windows';
  if (s.includes('mac')) return 'macos';
  if (s.includes('linux')) return 'linux';
  if (s.includes('android')) return 'android';
  if (s.includes('ios') || s.includes('iphone') || s.includes('ipad')) return 'ios';
  return s;
}

function expectedUaPlatformFromFingerprint(fpPlatform) {
  const p = String(fpPlatform || '').toLowerCase();
  if (p.includes('win')) return 'windows';
  if (p.includes('mac')) return 'macos';
  if (p.includes('linux')) return 'linux';
  return null;
}

function expectedArchFromUa(ua) {
  const u = String(ua || '').toLowerCase();
  if (u.includes('arm') || u.includes('aarch64')) return 'arm';
  if (u.includes('x86_64') || u.includes('win64') || u.includes('x64') || u.includes('amd64')) return 'x86';
  return null;
}

function parseSecChUaPlatform(secChUaPlatform) {
  if (!isNonEmptyString(secChUaPlatform)) return null;
  // Usually formatted as: "Windows"
  const s = secChUaPlatform.replace(/"/g, '').trim();
  return normalizePlatform(s);
}

function evaluateUaChConsistency({ profile, headers }) {
  const issues = [];
  const fp = profile && profile.fingerprint ? profile.fingerprint : {};
  const cdp = fp && fp.cdp ? fp.cdp : {};

  const ua = isNonEmptyString(headers && headers.userAgent) ? headers.userAgent : (isNonEmptyString(cdp.userAgent) ? cdp.userAgent : null);
  const secChPlatform = parseSecChUaPlatform(headers && headers.secChUaPlatform);

  const fpPlatform = expectedUaPlatformFromFingerprint(fp.platform);
  if (fpPlatform && secChPlatform && fpPlatform !== secChPlatform) {
    issues.push(issue('UA_CH_PLATFORM_MISMATCH', 'error', `Sec-CH-UA-Platform=${secChPlatform} != fingerprint.platform=${fpPlatform}`, 'Align platform template (UA/UA-CH/platform)'));
  }

  if (ua && fpPlatform) {
    const u = ua.toLowerCase();
    if (fpPlatform === 'windows' && u.includes('mac os')) {
      issues.push(issue('UA_PLATFORM_MISMATCH', 'error', 'UA indicates macOS but fingerprint platform is Windows', 'Use a consistent template'));
    }
    if (fpPlatform === 'macos' && u.includes('windows')) {
      issues.push(issue('UA_PLATFORM_MISMATCH', 'error', 'UA indicates Windows but fingerprint platform is macOS', 'Use a consistent template'));
    }
    if (fpPlatform === 'linux' && (u.includes('windows') || u.includes('mac os'))) {
      issues.push(issue('UA_PLATFORM_MISMATCH', 'warn', 'UA indicates non-Linux but fingerprint platform is Linux', 'Use a consistent template'));
    }
  }

  // Hardware hints from UA-CH metadata (if present) should not contradict UA and platform.
  const meta = cdp.userAgentMetadata && typeof cdp.userAgentMetadata === 'object' ? cdp.userAgentMetadata : null;
  if (meta) {
    const metaPlatform = normalizePlatform(meta.platform);
    if (fpPlatform && metaPlatform && fpPlatform !== metaPlatform) {
      issues.push(issue('UA_CH_META_PLATFORM_MISMATCH', 'error', `UA-CH metadata platform=${metaPlatform} != fingerprint.platform=${fpPlatform}`, 'Align userAgentMetadata.platform with platform template'));
    }
    const uaArch = expectedArchFromUa(ua);
    const metaArch = isNonEmptyString(meta.architecture) ? String(meta.architecture).toLowerCase() : null;
    if (uaArch && metaArch && uaArch !== metaArch) {
      issues.push(issue('UA_CH_ARCH_MISMATCH', 'warn', `UA arch=${uaArch} != UA-CH architecture=${metaArch}`, 'Align UA-CH architecture or UA string'));
    }
    const metaBitness = isNonEmptyString(meta.bitness) ? String(meta.bitness).toLowerCase() : null;
    if (metaBitness && metaBitness !== '64' && metaBitness !== '32') {
      issues.push(issue('UA_CH_BITNESS_INVALID', 'warn', `UA-CH bitness=${meta.bitness} is unusual`, 'Use 64 or 32'));
    }

    // platformVersion sanity (optional)
    if (meta.platformVersion !== undefined && meta.platformVersion !== null) {
      const pv = String(meta.platformVersion);
      const p = normalizePlatform(meta.platform);
      if (p === 'windows' && pv && !/^\d+\.\d+\.\d+$/.test(pv)) {
        issues.push(issue('UA_CH_PLATFORMVERSION_INVALID', 'warn', `Windows platformVersion=${pv} not in x.y.z`, 'Use format like 10.0.0'));
      }
      if (p === 'macos' && pv && !/^\d+\.\d+(\.\d+)?$/.test(pv)) {
        issues.push(issue('UA_CH_PLATFORMVERSION_INVALID', 'warn', `macOS platformVersion=${pv} unusual`, 'Use format like 10.15.7 or 13.6'));
      }
      if (p === 'linux' && pv && pv !== '0.0.0') {
        issues.push(issue('UA_CH_PLATFORMVERSION_LINUX', 'warn', `Linux platformVersion=${pv} should usually be 0.0.0`, 'Use 0.0.0 or omit'));
      }
    }

    // Brands sanity (optional)
    if (meta.brands && !Array.isArray(meta.brands)) {
      issues.push(issue('UA_CH_BRANDS_INVALID', 'warn', 'UA-CH brands must be an array', 'Provide brands array or omit it'));
    }
    if (Array.isArray(meta.brands) && meta.brands.length > 0) {
      const hasChromium = meta.brands.some((b) => b && String(b.brand || '').toLowerCase().includes('chromium'));
      if (!hasChromium) {
        issues.push(issue('UA_CH_BRANDS_MISSING_CHROMIUM', 'warn', 'UA-CH brands missing Chromium', 'Include Chromium brand in brands list'));
      }
    }
  }

  // Hardware fields sanity
  if (fp.hardwareConcurrency && (fp.hardwareConcurrency < 1 || fp.hardwareConcurrency > 64)) {
    issues.push(issue('HW_CORES_OUT_OF_RANGE', 'warn', `hardwareConcurrency=${fp.hardwareConcurrency} out of typical range`, 'Use a value between 2 and 32'));
  }
  if (fp.deviceMemory && (fp.deviceMemory < 1 || fp.deviceMemory > 64)) {
    issues.push(issue('HW_MEM_OUT_OF_RANGE', 'warn', `deviceMemory=${fp.deviceMemory} out of typical range`, 'Use a value between 2 and 16'));
  }

  return issues;
}

module.exports = { evaluateUaChConsistency };

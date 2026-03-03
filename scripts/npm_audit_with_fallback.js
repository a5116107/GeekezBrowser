/* eslint-disable no-console */
const { spawnSync } = require('child_process');

const DEFAULT_FALLBACK_REGISTRY = 'https://registry.npmjs.org';

function parseJsonFromText(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const raw = text.trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    // continue with best-effort slice
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const sliced = raw.slice(start, end + 1);
  try {
    return JSON.parse(sliced);
  } catch (e) {
    return null;
  }
}

function toVulnerabilitySummary(report) {
  const metadata = report && report.metadata ? report.metadata : null;
  const vulnerabilities = metadata && metadata.vulnerabilities ? metadata.vulnerabilities : null;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    return { total: null, details: {} };
  }
  const details = {};
  let computedTotal = 0;
  for (const [key, value] of Object.entries(vulnerabilities)) {
    if (!Number.isFinite(value)) continue;
    details[key] = Number(value);
    if (key !== 'total') computedTotal += Number(value);
  }
  const total = Number.isFinite(vulnerabilities.total) ? Number(vulnerabilities.total) : computedTotal;
  return { total, details };
}

function isAdvisoryEndpointUnavailable(text) {
  if (typeof text !== 'string') return false;
  return (
    /security\/advisories\/bulk/i.test(text) &&
    /(not_implemented|not implemented|404|audit endpoint returned an error)/i.test(text)
  );
}

function runAudit(registry) {
  const npmCommand = 'npm';
  const args = ['audit', '--omit=dev', '--json'];
  if (registry) args.push(`--registry=${registry}`);

  const result = spawnSync(npmCommand, args, {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const merged = `${stdout}\n${stderr}`;
  const report = parseJsonFromText(stdout) || parseJsonFromText(stderr) || parseJsonFromText(merged);

  return {
    command: npmCommand,
    args,
    exitCode: Number.isInteger(result.status) ? result.status : 1,
    stdout,
    stderr,
    report,
    advisoryEndpointUnavailable: isAdvisoryEndpointUnavailable(merged),
    spawnError: result.error || null,
  };
}

function main() {
  const strict = process.argv.includes('--strict') || process.env.NPM_AUDIT_FAIL_ON_VULN === '1';
  const fallbackRegistry = (process.env.NPM_AUDIT_FALLBACK_REGISTRY || DEFAULT_FALLBACK_REGISTRY).trim();
  const primaryRegistry = (process.env.npm_config_registry || 'default').trim();

  let attempt = runAudit('');
  let usedFallback = false;

  if (attempt.spawnError) {
    console.error(`[audit] failed to run ${attempt.command}: ${attempt.spawnError.message || attempt.spawnError}`);
    process.exit(1);
  }

  if (attempt.exitCode !== 0 && attempt.advisoryEndpointUnavailable) {
    console.log(`[audit] primary advisory endpoint unavailable on registry: ${primaryRegistry}`);
    console.log(`[audit] retrying with fallback registry: ${fallbackRegistry}`);
    attempt = runAudit(fallbackRegistry);
    usedFallback = true;
    if (attempt.spawnError) {
      console.error(`[audit] failed to run ${attempt.command}: ${attempt.spawnError.message || attempt.spawnError}`);
      process.exit(1);
    }
  }

  if (!attempt.report) {
    console.error('[audit] failed to parse npm audit JSON output');
    if (attempt.stderr) console.error(attempt.stderr.trim());
    process.exit(1);
  }

  const summary = toVulnerabilitySummary(attempt.report);
  const routeLabel = usedFallback ? `fallback:${fallbackRegistry}` : `primary:${primaryRegistry}`;
  console.log(`[audit] route: ${routeLabel}`);
  console.log(`[audit] fallbackUsed: ${usedFallback}`);
  console.log(`[audit] vulnerabilityTotal: ${summary.total === null ? 'unknown' : summary.total}`);
  if (Object.keys(summary.details).length > 0) {
    console.log(`[audit] severityBreakdown: ${JSON.stringify(summary.details)}`);
  }

  const hasFindings = Number.isFinite(summary.total) ? summary.total > 0 : attempt.exitCode !== 0;
  if (strict && hasFindings) {
    console.error('[audit] strict mode enabled; vulnerabilities detected');
    process.exit(1);
  }

  if (attempt.exitCode !== 0 && !strict) {
    console.log('[audit] completed with findings (non-strict mode), exiting 0');
    process.exit(0);
  }

  console.log('[audit] completed');
  process.exit(0);
}

main();

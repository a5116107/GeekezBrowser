/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const {
  buildReplayComparisonReport,
  toReplayComparisonMarkdown,
} = require('../proxy/replayComparator');

function parseArgMap(argv) {
  const map = {};
  argv.forEach((arg) => {
    if (!arg || !arg.startsWith('--')) return;
    const eq = arg.indexOf('=');
    if (eq <= 2) {
      map[arg.slice(2)] = 'true';
      return;
    }
    map[arg.slice(2, eq)] = arg.slice(eq + 1);
  });
  return map;
}

function mustResolveFile(filePath, flagName) {
  const raw = String(filePath || '').trim();
  if (!raw) throw new Error(`Missing --${flagName}=<path>`);
  const resolved = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
  return resolved;
}

function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function buildOutputDir(rawDir) {
  const defaultDir = path.join(process.cwd(), 'logs', 'proxy-replay', nowStamp());
  if (!rawDir) return ensureDir(defaultDir);
  const resolved = path.isAbsolute(rawDir) ? rawDir : path.join(process.cwd(), rawDir);
  return ensureDir(resolved);
}

function main() {
  const args = parseArgMap(process.argv.slice(2));
  const baselinePath = mustResolveFile(args.baseline, 'baseline');
  const candidatePath = mustResolveFile(args.candidate, 'candidate');
  const baselineLabel = String(args['baseline-name'] || path.basename(baselinePath));
  const candidateLabel = String(args['candidate-name'] || path.basename(candidatePath));
  const outputDir = buildOutputDir(args['out-dir']);

  const baseline = readJson(baselinePath);
  const candidate = readJson(candidatePath);

  const report = buildReplayComparisonReport({
    baseline,
    candidate,
    baselineLabel,
    candidateLabel,
  });
  const markdown = toReplayComparisonMarkdown(report);

  const reportJsonPath = path.join(outputDir, 'replay_compare_report.json');
  const reportMdPath = path.join(outputDir, 'replay_compare_report.md');
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMdPath, markdown, 'utf8');

  console.log('[ok] replay compare report generated');
  console.log(`- baseline: ${baselinePath}`);
  console.log(`- candidate: ${candidatePath}`);
  console.log(`- out json: ${reportJsonPath}`);
  console.log(`- out md:   ${reportMdPath}`);
  console.log(`- matched: ${report.matched.count}`);
  console.log(`- regressions: ${report.matched.regressions}`);
  console.log(`- improvements: ${report.matched.improvements}`);
  console.log(`- gate: ${report.paritySummary && report.paritySummary.gatePass ? 'PASS' : 'FAIL'}`);
  console.log(`- score: ${report.paritySummary && Number.isFinite(report.paritySummary.overallScore) ? report.paritySummary.overallScore : '-'}`);
}

try {
  main();
} catch (error) {
  console.error('[fail] replay compare failed:', error && error.message ? error.message : error);
  process.exit(1);
}

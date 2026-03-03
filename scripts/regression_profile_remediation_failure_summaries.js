/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const root = process.cwd();
  const mainText = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const rendererText = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');

  assert(
    mainText.includes('const failureCodeSummaries = rankedCodes.map((code) => ({')
    || mainText.includes('const failureCodeSummaries = rankedCodes.map((code) => {'),
    'missing main failureCodeSummaries builder'
  );
  assert(mainText.includes('const STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE = 3;'), 'missing detail sample-per-code bound constant');
  assert(mainText.includes('const STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH = 72;'), 'missing failure-detail message max-length constant');
  assert(mainText.includes('const codeDetailSamples = {};'), 'missing main failure detail sample bucket');
  assert(mainText.includes('const codeDetailTotal = {};'), 'missing main detail total bucket');
  assert(mainText.includes('const codeDetailKeys = {};'), 'missing main detail dedupe key bucket');
  assert(mainText.includes('const trimmedMessage = rawMessage.length > STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH'), 'missing main failure detail message trim guard');
  assert(mainText.includes('const detailLine = trimmedMessage'), 'missing main failure detail trimmed message binding');
  assert(mainText.includes('if (codeDetailSamples[code].length < STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE) {'), 'missing main detail sample bound guard');
  assert(
    mainText.includes('details: Array.isArray(codeDetailSamples[code]) ? codeDetailSamples[code].slice() : [],')
    || mainText.includes('details: detailSamples.slice(),'),
    'missing main failureCodeSummaries detail samples'
  );
  assert(
    mainText.includes('detailTotal: Number(codeDetailTotal[code] || 0),')
    || mainText.includes('detailTotal,'),
    'missing main failureCodeSummaries detailTotal field'
  );
  assert(
    mainText.includes('detailTruncated: Number(codeDetailTotal[code] || 0) > (Array.isArray(codeDetailSamples[code]) ? codeDetailSamples[code].length : 0),')
    || mainText.includes('detailTruncated,'),
    'missing main failureCodeSummaries detailTruncated field'
  );
  assert(mainText.includes('failureCodeSummaries,'), 'missing main failureCodeSummaries aggregation output');
  assert(mainText.includes('failureCodeSummaries: [],'), 'missing stop-other failureCodeSummaries default metadata');
  assert(mainText.includes('result.failureCodeSummaries = failureAggregation.failureCodeSummaries;'), 'missing stop-other failureCodeSummaries aggregation binding');

  assert(rendererText.includes('const summaryList = result && Array.isArray(result.failureCodeSummaries)'), 'missing renderer failureCodeSummaries contract read');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing renderer stop-other contract version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing renderer strict contract mode resolver');
  assert(rendererText.includes('const contractLimitRaw = Number(result && result.failureDetailSampleLimitPerCode);'), 'missing renderer detail sample limit contract read');
  assert(rendererText.includes('const maxItems = contractLimit > 0 ? contractLimit : fallbackLimit;'), 'missing renderer detail sample limit contract resolver');
  assert(rendererText.includes('const detailTotalRaw = Number(item && item.detailTotal);'), 'missing renderer detailTotal metadata read');
  assert(rendererText.includes('detailTruncated: Boolean(item && item.detailTruncated),'), 'missing renderer detailTruncated metadata read');
  assert(rendererText.includes('const hasContractDetailMeta = summaryList.some((item) => item.hasDetailTotal || item.detailTruncated);'), 'missing renderer contract-detail metadata branch');
  assert(rendererText.includes('Math.max(contractTotal, details.length) - shownCount'), 'missing renderer contract-detail extra count calculation');
  assert(rendererText.includes('for (const item of summaryList) {'), 'missing renderer failureCodeSummaries iteration');
  assert(rendererText.includes('for (const detail of item.details) {'), 'missing renderer failure detail contract iteration');
  assert(rendererText.includes('const topFromSummary = summaryList.slice(0, topLimit).map((item) => `${item.code}x${item.count}`).join(\', \');'), 'missing renderer code-summary contract usage');
  assert(rendererText.includes('if (summaryList.length > 0) {'), 'missing renderer failureCodeSummaries fast-path');
  assert(rendererText.includes('if (Object.keys(counts).length === 0 && !strictContractMode && result && Array.isArray(result.failed)) {'), 'missing renderer strict contract fallback gate for failed list');

  console.log('[ok] profile remediation failure-summaries regression checks passed');
}

main();

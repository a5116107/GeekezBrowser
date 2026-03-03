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
  const i18nText = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
  const zhText = fs.readFileSync(path.join(root, 'locales', 'zh-CN.js'), 'utf8');

  assert(mainText.includes('function getStopErrorCodePriority(code)'), 'missing stop error-code priority helper');
  assert(mainText.includes('function aggregateStopOtherFailureCodes(failedItems = [])'), 'missing stop-other failure aggregation helper');
  assert(mainText.includes('const failureAggregation = aggregateStopOtherFailureCodes(result.failed);'), 'missing stop-other aggregation binding');
  assert(mainText.includes('result.dominantErrorCode = failureAggregation.dominantErrorCode;'), 'missing stop-other dominantErrorCode result field');
  assert(mainText.includes('result.errorCodeCounts = failureAggregation.errorCodeCounts;'), 'missing stop-other errorCodeCounts result field');
  assert(mainText.includes('result.errorCodeProfiles = failureAggregation.errorCodeProfiles;'), 'missing stop-other errorCodeProfiles result field');
  assert(mainText.includes('result.errorCodeProfileTotals = failureAggregation.errorCodeProfileTotals;'), 'missing stop-other errorCodeProfileTotals result field');
  assert(mainText.includes('result.errorCodeProfilesTruncated = failureAggregation.errorCodeProfilesTruncated;'), 'missing stop-other errorCodeProfilesTruncated result field');
  assert(mainText.includes('result.errorCodeDetailSamples = failureAggregation.errorCodeDetailSamples;'), 'missing stop-other errorCodeDetailSamples result field');
  assert(mainText.includes('result.errorCodeDetailTotals = failureAggregation.errorCodeDetailTotals;'), 'missing stop-other errorCodeDetailTotals result field');
  assert(mainText.includes('result.errorCodeDetailsTruncated = failureAggregation.errorCodeDetailsTruncated;'), 'missing stop-other errorCodeDetailsTruncated result field');
  assert(mainText.includes('result.rankedErrorCodes = failureAggregation.rankedErrorCodes;'), 'missing stop-other rankedErrorCodes result field');
  assert(mainText.includes('result.failureCodeSummaries = failureAggregation.failureCodeSummaries;'), 'missing stop-other failureCodeSummaries result field');
  assert(mainText.includes('stopOtherContractVersion: STOP_OTHER_CONTRACT_VERSION,'), 'missing stop-other contract-version default metadata');
  assert(mainText.includes('result.stopOtherContractVersion = STOP_OTHER_CONTRACT_VERSION;'), 'missing stop-other contract-version result field');
  assert(mainText.includes('result.errorCodeSummaryTopLimit = STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT;'), 'missing stop-other code summary top limit result field');

  assert(rendererText.includes('function formatStopOthersErrorCodeSummary(result)'), 'missing renderer remediation code-summary formatter');
  assert(rendererText.includes('const rankedCodesForSummary = result && Array.isArray(result.rankedErrorCodes)'), 'missing renderer code-summary rankedErrorCodes contract read');
  assert(rendererText.includes('const rankIndexByCodeForSummary = new Map(rankedCodesForSummary.map((code, index) => [code, index]));'), 'missing renderer code-summary rankedErrorCodes index map');
  assert(rendererText.includes('const leftRank = rankIndexByCodeForSummary.has(left[0]) ? rankIndexByCodeForSummary.get(left[0]) : Number.POSITIVE_INFINITY;'), 'missing renderer code-summary ranked fallback ordering');
  assert(rendererText.includes('if (leftRank === Number.POSITIVE_INFINITY) return 1;'), 'missing renderer code-summary ranked infinity fallback');
  assert(rendererText.includes('const contractTopRaw = Number(result && result.errorCodeSummaryTopLimit);'), 'missing renderer code-summary top limit contract read');
  assert(rendererText.includes('const topLimit = Number.isFinite(contractTopRaw) && contractTopRaw > 0 ? Math.floor(contractTopRaw) : 3;'), 'missing renderer code-summary top limit resolver');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing renderer code-summary contract version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing renderer code-summary strict mode resolver');
  assert(rendererText.includes('summaryList.slice(0, topLimit)'), 'missing renderer code-summary contract top-limit usage');
  assert(rendererText.includes('if (Object.keys(counts).length === 0 && !strictContractMode && result && Array.isArray(result.failed)) {'), 'missing renderer code-summary strict fallback gate');
  assert(rendererText.includes('const dominantCode = String(result && result.dominantErrorCode ? result.dominantErrorCode : \'\').trim().toUpperCase();'), 'missing renderer strict code-summary dominant-code read');
  assert(rendererText.includes('if (strictContractMode && dominantCode) {'), 'missing renderer strict code-summary dominant fallback gate');
  assert(rendererText.includes('const failedCountRaw = Number(result && result.failedCount);'), 'missing renderer strict code-summary failed-count read');
  assert(rendererText.includes('const dominantText = failedCount > 0 ? `${dominantCode}x${failedCount}` : dominantCode;'), 'missing renderer strict code-summary dominant text resolver');
  assert(rendererText.includes('return tFormat(\'profileErrActionStopOthersCodeSummary\', \'Failure code distribution: {codes}\', { codes: dominantText });'), 'missing renderer strict code-summary dominant formatter');
  assert(rendererText.includes('const dominantCode = String('), 'missing renderer dominant-code resolution');
  assert(rendererText.includes('const codeSummary = formatStopOthersErrorCodeSummary(result);'), 'missing renderer code-summary binding');
  assert(rendererText.includes('const blockedMessageWithProfiles = profileSummary ? `${blockedMessage}\\n${profileSummary}` : blockedMessage;'), 'missing renderer blocked-message profile-summary merge');
  assert(rendererText.includes('const blockedMessageWithSummary = codeSummary ? `${blockedMessageWithProfiles}\\n${codeSummary}` : blockedMessageWithProfiles;'), 'missing renderer blocked-message summary merge');

  const keys = [
    'profileErrActionStopOthersCodeSummary',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile remediation aggregation regression checks passed');
}

main();

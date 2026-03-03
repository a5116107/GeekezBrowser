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

  assert(mainText.includes('const STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH = 72;'), 'missing main failure-detail message max-length constant');
  assert(mainText.includes('failureDetailMessageMaxLength: STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH,'), 'missing main failure-detail message max-length contract metadata');
  assert(rendererText.includes('function formatStopOthersFailedDetailSummary(result, limit = 3)'), 'missing renderer failed-detail summary helper');
  assert(rendererText.includes('const contractLimitRaw = Number(result && result.failureDetailSampleLimitPerCode);'), 'missing renderer failed-detail summary contract detail limit read');
  assert(rendererText.includes('const contractMessageMaxRaw = Number(result && result.failureDetailMessageMaxLength);'), 'missing renderer failed-detail summary contract message-max read');
  assert(rendererText.includes('const messageMaxLength = Number.isFinite(contractMessageMaxRaw) && contractMessageMaxRaw > 0 ? Math.floor(contractMessageMaxRaw) : 72;'), 'missing renderer failed-detail summary message-max resolver');
  assert(rendererText.includes('const maxItems = contractLimit > 0 ? contractLimit : fallbackLimit;'), 'missing renderer failed-detail summary contract limit resolver');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing renderer failed-detail summary contract-version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing renderer failed-detail summary strict mode resolver');
  assert(rendererText.includes('const summaryList = result && Array.isArray(result.failureCodeSummaries)'), 'missing renderer failed-detail summary contract read');
  assert(rendererText.includes('const detailTotalRaw = Number(item && item.detailTotal);'), 'missing renderer failed-detail summary detailTotal metadata read');
  assert(rendererText.includes('detailTruncated: Boolean(item && item.detailTruncated),'), 'missing renderer failed-detail summary detailTruncated metadata read');
  assert(rendererText.includes('const hasSummaryDetailTruncated = summaryList.some((item) => item.detailTruncated);'), 'missing renderer failed-detail summary truncation marker');
  assert(rendererText.includes('const contractTotal = summaryList.reduce((total, item) => {'), 'missing renderer failed-detail contract total calculation');
  assert(rendererText.includes('if (!strictContractMode) return total + (Array.isArray(item.details) ? item.details.length : 0);'), 'missing renderer failed-detail strict-mode total guard');
  assert(rendererText.includes('if (extraCount === 0 && hasSummaryDetailTruncated) {'), 'missing renderer failed-detail truncation fallback');
  assert(rendererText.includes('for (const detail of item.details) {'), 'missing renderer failed-detail summary contract detail iteration');
  assert(rendererText.includes('const detailSampleMap = result && result.errorCodeDetailSamples && typeof result.errorCodeDetailSamples === \'object\''), 'missing renderer failed-detail fallback detail-sample map contract read');
  assert(rendererText.includes('const detailTotalMap = result && result.errorCodeDetailTotals && typeof result.errorCodeDetailTotals === \'object\''), 'missing renderer failed-detail fallback detail-total map contract read');
  assert(rendererText.includes('const detailTruncatedMap = result && result.errorCodeDetailsTruncated && typeof result.errorCodeDetailsTruncated === \'object\''), 'missing renderer failed-detail fallback detail-truncated map contract read');
  assert(rendererText.includes('const detailTotalEntries = Object.entries(detailTotalMap);'), 'missing renderer failed-detail fallback detail-total entries');
  assert(rendererText.includes('const detailTruncatedEntries = Object.entries(detailTruncatedMap);'), 'missing renderer failed-detail fallback detail-truncated entries');
  assert(rendererText.includes('const hasDetailContractEntries = detailSampleEntries.length > 0 || detailTotalEntries.length > 0 || detailTruncatedEntries.length > 0;'), 'missing renderer failed-detail fallback contract-entry gate');
  assert(rendererText.includes('if (hasDetailContractEntries) {'), 'missing renderer failed-detail fallback contract-entry branch');
  assert(rendererText.includes('const orderedCodes = Array.from(new Set([...rankedCodes, ...contractCodes]));'), 'missing renderer failed-detail fallback ranked+contract code ordering');
  assert(rendererText.includes('...detailTotalEntries.map(([rawCode]) => String(rawCode || \'\').trim().toUpperCase())'), 'missing renderer failed-detail fallback detail-total code merge');
  assert(rendererText.includes('...detailTruncatedEntries.map(([rawCode]) => String(rawCode || \'\').trim().toUpperCase())'), 'missing renderer failed-detail fallback detail-truncated code merge');
  assert(rendererText.includes('const shownCount = Math.min(details.length, maxItems);'), 'missing renderer failed-detail shown-count resolver');
  assert(rendererText.includes('if (!strictContractMode && !hasTotal && !truncated) {'), 'missing renderer failed-detail fallback strict-mode sample-length gate');
  assert(rendererText.includes('const shown = details.slice(0, maxItems).join(\'; \');'), 'missing renderer failed-detail fallback shown-details formatter');
  assert(rendererText.includes('if (strictContractMode && hasContractDetailMeta && extraCount > 0) {'), 'missing renderer failed-detail strict-mode no-sample fallback gate');
  assert(rendererText.includes('details: `+${extraCount}`,'), 'missing renderer failed-detail strict-mode no-sample detail text');
  assert(rendererText.includes('extra: \'\','), 'missing renderer failed-detail strict-mode no-sample empty-extra binding');
  assert(rendererText.includes('if (strictContractMode) return \'\';'), 'missing renderer failed-detail strict-mode failed-list fallback gate');
  assert(rendererText.includes('const message = messageRaw.length > messageMaxLength ? `${messageRaw.slice(0, messageMaxLength)}…` : messageRaw;'), 'missing renderer failed-detail summary message trim by contract max');
  assert(rendererText.includes('const failedDetailSummary = formatStopOthersFailedDetailSummary(result);'), 'missing renderer failed-detail summary binding');
  assert(rendererText.includes('lines.push(failedDetailSummary);'), 'missing renderer failed-detail summary merge');
  assert(rendererText.includes("tFormat('profileErrActionStopOthersFailedDetail', 'Failure details: {details}{extra}', { details: shown, extra });"), 'missing renderer failed-detail i18n formatter');

  const keys = [
    'profileErrActionStopOthersFailedDetail',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile remediation failure-detail regression checks passed');
}

main();

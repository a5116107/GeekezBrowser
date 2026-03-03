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

  assert(mainText.includes('errorCodeProfiles: codeProfiles,'), 'missing main failure aggregation code-profiles map');
  assert(mainText.includes('rankedErrorCodes: rankedCodes,'), 'missing main failure aggregation ranked code list');
  assert(mainText.includes('failureCodeSummaries,'), 'missing main failure aggregation summary list');
  assert(mainText.includes('const STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT = 2;'), 'missing main code-profile-map code limit constant');
  assert(mainText.includes('const STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT = 2;'), 'missing main code-profile-map profile limit constant');
  assert(mainText.includes('const STOP_OTHER_MAX_PROFILE_SAMPLES_PER_CODE = 5;'), 'missing main stop-other max profile samples constant');
  assert(mainText.includes('const codeProfileTotal = {};'), 'missing main stop-other profile total bucket');
  assert(mainText.includes('const codeProfileTruncated = {};'), 'missing main stop-other profile truncation bucket');
  assert(mainText.includes('const codeProfileKeys = {};'), 'missing main stop-other profile dedupe key bucket');
  assert(mainText.includes('if (codeProfiles[code].length < STOP_OTHER_MAX_PROFILE_SAMPLES_PER_CODE) {'), 'missing main stop-other profile sample bound guard');
  assert(mainText.includes('const profileTotal = Number(codeProfileTotal[code] || 0);'), 'missing main failureCodeSummaries profileTotal precompute');
  assert(mainText.includes('const profileSamples = Array.isArray(codeProfiles[code]) ? codeProfiles[code] : [];'), 'missing main failureCodeSummaries profile sample resolver');
  assert(mainText.includes('const profileTruncated = profileTotal > profileSamples.length;'), 'missing main failureCodeSummaries profileTruncated precompute');
  assert(mainText.includes('codeProfileTruncated[code] = profileTruncated;'), 'missing main profile truncation map binding');
  assert(mainText.includes('profiles: profileSamples.slice(),'), 'missing main failureCodeSummaries profile sample field');
  assert(mainText.includes('profileTotal,'), 'missing main failureCodeSummaries profileTotal field');
  assert(mainText.includes('profileTruncated,'), 'missing main failureCodeSummaries profileTruncated field');
  assert(mainText.includes('errorCodeProfileTotals: codeProfileTotal,'), 'missing main failure aggregation profile total contract');
  assert(mainText.includes('errorCodeProfilesTruncated: codeProfileTruncated,'), 'missing main failure aggregation profile truncation contract');
  assert(mainText.includes('errorCodeProfiles: {},'), 'missing main stop-other code-profiles default contract');
  assert(mainText.includes('errorCodeProfileTotals: {},'), 'missing main stop-other code-profile-totals default contract');
  assert(mainText.includes('errorCodeProfilesTruncated: {},'), 'missing main stop-other code-profile-truncation default contract');
  assert(mainText.includes('rankedErrorCodes: [],'), 'missing main stop-other ranked code default contract');
  assert(mainText.includes('failureCodeSummaries: [],'), 'missing main stop-other summary default contract');
  assert(mainText.includes('codeProfileMapCodeLimit: STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT,'), 'missing main stop-other code-profile-map code limit default contract');
  assert(mainText.includes('codeProfileMapProfileLimit: STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT,'), 'missing main stop-other code-profile-map profile limit default contract');
  assert(mainText.includes('result.errorCodeProfiles = failureAggregation.errorCodeProfiles;'), 'missing main stop-other code-profiles binding');
  assert(mainText.includes('result.errorCodeProfileTotals = failureAggregation.errorCodeProfileTotals;'), 'missing main stop-other code-profile-totals binding');
  assert(mainText.includes('result.errorCodeProfilesTruncated = failureAggregation.errorCodeProfilesTruncated;'), 'missing main stop-other code-profile-truncation binding');
  assert(mainText.includes('result.rankedErrorCodes = failureAggregation.rankedErrorCodes;'), 'missing main stop-other ranked code binding');
  assert(mainText.includes('result.failureCodeSummaries = failureAggregation.failureCodeSummaries;'), 'missing main stop-other summary binding');
  assert(mainText.includes('stopOtherContractVersion: STOP_OTHER_CONTRACT_VERSION,'), 'missing main stop-other contract-version default metadata');
  assert(mainText.includes('result.stopOtherContractVersion = STOP_OTHER_CONTRACT_VERSION;'), 'missing main stop-other contract-version binding');
  assert(mainText.includes('result.codeProfileMapCodeLimit = STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT;'), 'missing main stop-other code-profile-map code limit binding');
  assert(mainText.includes('result.codeProfileMapProfileLimit = STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT;'), 'missing main stop-other code-profile-map profile limit binding');

  assert(rendererText.includes('function getStopOtherCodePriority(code)'), 'missing renderer stop-other code priority helper');
  assert(rendererText.includes('function formatStopOthersCodeProfileMapSummary(result, codeLimit = 2, nameLimit = 2)'), 'missing renderer code-profile-map summary helper');
  assert(rendererText.includes('const contractCodeLimitRaw = Number(result && result.codeProfileMapCodeLimit);'), 'missing renderer code-profile-map code limit contract read');
  assert(rendererText.includes('const contractNameLimitRaw = Number(result && result.codeProfileMapProfileLimit);'), 'missing renderer code-profile-map profile limit contract read');
  assert(rendererText.includes('const resolvedCodeLimit = Number.isFinite(contractCodeLimitRaw) && contractCodeLimitRaw > 0'), 'missing renderer code-profile-map code limit resolver');
  assert(rendererText.includes('const resolvedNameLimit = Number.isFinite(contractNameLimitRaw) && contractNameLimitRaw > 0'), 'missing renderer code-profile-map profile limit resolver');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing renderer code-profile-map contract version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing renderer code-profile-map strict-mode resolver');
  assert(rendererText.includes('const summaryList = result && Array.isArray(result.failureCodeSummaries)'), 'missing renderer failureCodeSummaries contract usage');
  assert(rendererText.includes('const profileTotalRaw = Number(item && item.profileTotal);'), 'missing renderer code-profile-map profileTotal metadata read');
  assert(rendererText.includes('profileTruncated: Boolean(item && item.profileTruncated),'), 'missing renderer code-profile-map profileTruncated metadata read');
  assert(rendererText.includes('const effectiveTotal = item.hasProfileTotal'), 'missing renderer code-profile-map total resolver');
  assert(rendererText.includes('const shownNameCount = Math.min(normalizedNames.length, nameTop);'), 'missing renderer code-profile-map summary shown-name count');
  assert(rendererText.includes('let hiddenCount = Math.max(0, effectiveTotal - shownNameCount);'), 'missing renderer code-profile-map summary hidden-count computation');
  assert(rendererText.includes('if (hiddenCount === 0 && item.profileTruncated) {'), 'missing renderer code-profile-map truncation fallback');
  assert(rendererText.includes('const countBase = item.hasProfileTotal'), 'missing renderer code-profile-map summary count-base resolver');
  assert(rendererText.includes('if (countText) return `${item.code}${countText}`;'), 'missing renderer code-profile-map summary count-text branch');
  assert(rendererText.includes('if (hidden) return `${item.code}${hidden}`;'), 'missing renderer code-profile-map summary hidden-text branch');
  assert(rendererText.includes('const rankedCodes = result && Array.isArray(result.rankedErrorCodes)'), 'missing renderer ranked-code contract usage');
  assert(rendererText.includes('const rankIndexByCode = new Map(rankedCodes.map((code, index) => [code, index]));'), 'missing renderer ranked-code index map');
  assert(rendererText.includes('const profileTotalMap = result && result.errorCodeProfileTotals && typeof result.errorCodeProfileTotals === \'object\''), 'missing renderer fallback profile-total contract read');
  assert(rendererText.includes('const profileTruncatedMap = result && result.errorCodeProfilesTruncated && typeof result.errorCodeProfilesTruncated === \'object\''), 'missing renderer fallback profile-truncation contract read');
  assert(rendererText.includes('const contractOnlyCodes = Array.from(new Set(['), 'missing renderer contract-only code union for profile-map fallback');
  assert(rendererText.includes('...Object.keys(profileTotalMap || {}).map((code) => String(code || \'\').trim().toUpperCase())'), 'missing renderer contract-only profile-total code merge');
  assert(rendererText.includes('...Object.keys(profileTruncatedMap || {}).map((code) => String(code || \'\').trim().toUpperCase())'), 'missing renderer contract-only profile-truncated code merge');
  assert(rendererText.includes("if (result && result.errorCodeProfiles && typeof result.errorCodeProfiles === 'object') {"), 'missing renderer code-profile-map contract usage');
  assert(rendererText.includes('const totalFromContract = Number(profileTotalMap[code]);'), 'missing renderer fallback profile-total extraction');
  assert(rendererText.includes('const hasTotalFromContract = Number.isFinite(totalFromContract) && totalFromContract >= 0;'), 'missing renderer fallback profile-total guard');
  assert(rendererText.includes('const total = hasTotalFromContract'), 'missing renderer fallback total resolver');
  assert(rendererText.includes('truncated: Boolean(profileTruncatedMap[code]),'), 'missing renderer fallback truncation binding');
  assert(rendererText.includes('for (const code of contractOnlyCodes) {'), 'missing renderer contract-only code backfill loop');
  assert(rendererText.includes('if (codeMap.has(code)) continue;'), 'missing renderer contract-only code skip-existing guard');
  assert(rendererText.includes('if (total <= 0 && !truncated) continue;'), 'missing renderer contract-only code empty guard');
  assert(rendererText.includes('names: [],'), 'missing renderer contract-only code empty-names bucket');
  assert(rendererText.includes('if (codeMap.size === 0) {'), 'missing renderer code-profile-map fallback path');
  assert(rendererText.includes('if (strictContractMode) return \'\';'), 'missing renderer code-profile-map strict-mode fallback gate');
  assert(rendererText.includes('if (leftRank !== rightRank) {'), 'missing renderer ranked-code ordering branch');
  assert(rendererText.includes('const byPriority = getStopOtherCodePriority(left[0]) - getStopOtherCodePriority(right[0]);'), 'missing renderer code-profile-map priority fallback ordering');
  assert(rendererText.includes('const codeTop = resolvedCodeLimit;'), 'missing renderer code-profile-map code top limit usage');
  assert(rendererText.includes('const nameTop = resolvedNameLimit;'), 'missing renderer code-profile-map name top limit usage');
  assert(rendererText.includes('const totalRaw = Number(bucket && bucket.total);'), 'missing renderer fallback total raw read');
  assert(rendererText.includes('const shownNameCount = Math.min(names.length, nameTop);'), 'missing renderer fallback shown-name count');
  assert(rendererText.includes('let hiddenCount = Math.max(0, effectiveTotal - shownNameCount);'), 'missing renderer fallback hidden-count computation');
  assert(rendererText.includes('if (hiddenCount === 0 && bucket && bucket.truncated) {'), 'missing renderer fallback truncation hidden-count guard');
  assert(rendererText.includes('const countBase = Number.isFinite(totalRaw) && totalRaw > 0 ? Number(totalRaw) : 0;'), 'missing renderer fallback count-base resolver');
  assert(rendererText.includes('if (countText) return `${code}${countText}`;'), 'missing renderer fallback count-text branch');
  assert(rendererText.includes('if (hidden) return `${code}${hidden}`;'), 'missing renderer fallback hidden-text branch');
  assert(rendererText.includes("const codeProfileMapSummary = formatStopOthersCodeProfileMapSummary(result);"), 'missing renderer code-profile-map summary binding');
  assert(rendererText.includes('lines.push(codeProfileMapSummary);'), 'missing renderer code-profile-map summary merge');
  assert(rendererText.includes("tFormat('profileErrActionStopOthersCodeProfileMap', 'Failure code -> profiles: {items}', { items: items.join('; ') });"), 'missing renderer code-profile-map i18n formatter');

  const keys = [
    'profileErrActionStopOthersCodeProfileMap',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile remediation code-profile-map regression checks passed');
}

main();

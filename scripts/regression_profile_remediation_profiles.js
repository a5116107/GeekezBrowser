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

  assert(mainText.includes('const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map((profile) => [profile.id, profile]));'), 'missing stop-other profile map resolver');
  assert(mainText.includes('const resolveProfileName = (id) => {'), 'missing stop-other profile name resolver');
  assert(mainText.includes('const STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT = 3;'), 'missing stop-other remaining profile summary limit constant');
  assert(mainText.includes('const STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT = 3;'), 'missing stop-other failed profile summary limit constant');
  assert(mainText.includes('remainingProfiles: [],'), 'missing stop-other remainingProfiles contract');
  assert(mainText.includes('failedProfiles: [],'), 'missing stop-other failedProfiles contract');
  assert(mainText.includes('remainingProfileSummaryLimit: STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT,'), 'missing stop-other remaining profile summary limit contract');
  assert(mainText.includes('failedProfileSummaryLimit: STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT,'), 'missing stop-other failed profile summary limit contract');
  assert(mainText.includes('name: resolveProfileName(targetId),'), 'missing stop-other invalid-id name binding');
  assert(mainText.includes('name: resolveProfileName(resolved.id),'), 'missing stop-other failed-id name binding');
  assert(mainText.includes('result.remainingProfiles = result.remainingIds.map((id) => ({ id, name: resolveProfileName(id) }));'), 'missing stop-other remaining profile summary binding');
  assert(mainText.includes('result.failedProfiles = result.failed'), 'missing stop-other failed profile summary binding');
  assert(mainText.includes('result.remainingProfileSummaryLimit = STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT;'), 'missing stop-other remaining profile summary limit binding');
  assert(mainText.includes('result.failedProfileSummaryLimit = STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT;'), 'missing stop-other failed profile summary limit binding');

  assert(rendererText.includes('function buildStopOtherProfileNameSummary(items, limit = 3)'), 'missing renderer profile-name summary helper');
  assert(rendererText.includes('function formatStopOthersProfileSummary(result)'), 'missing renderer remediation profile-summary formatter');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing renderer profile-summary contract-version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing renderer profile-summary strict-mode resolver');
  assert(rendererText.includes('const remainingLimitRaw = Number(result && result.remainingProfileSummaryLimit);'), 'missing renderer remaining profile summary limit contract read');
  assert(rendererText.includes('const failedLimitRaw = Number(result && result.failedProfileSummaryLimit);'), 'missing renderer failed profile summary limit contract read');
  assert(rendererText.includes('const remainingCountRaw = Number(result && result.remainingCount);'), 'missing renderer remaining-count contract read');
  assert(rendererText.includes('const failedCountRaw = Number(result && result.failedCount);'), 'missing renderer failed-count contract read');
  assert(rendererText.includes('const remainingLimit = Number.isFinite(remainingLimitRaw) && remainingLimitRaw > 0 ? Math.floor(remainingLimitRaw) : 3;'), 'missing renderer remaining profile summary limit resolver');
  assert(rendererText.includes('const failedLimit = Number.isFinite(failedLimitRaw) && failedLimitRaw > 0 ? Math.floor(failedLimitRaw) : 3;'), 'missing renderer failed profile summary limit resolver');
  assert(rendererText.includes(': (!strictContractMode && result && Array.isArray(result.remainingIds) ? result.remainingIds : []),'), 'missing renderer strict gate for remainingIds fallback');
  assert(rendererText.includes('remainingLimit\n    );'), 'missing renderer remaining profile summary limit usage');
  assert(rendererText.includes('} else if (strictContractMode && remainingCount > 0) {'), 'missing renderer strict profile-summary remaining-count fallback');
  assert(rendererText.includes('names: `+${remainingCount}`,'), 'missing renderer strict profile-summary remaining-count label');
  assert(rendererText.includes('result && Array.isArray(result.failedProfiles) && result.failedProfiles.length > 0'), 'missing renderer strict failedProfiles contract usage');
  assert(rendererText.includes(': (!strictContractMode && result && Array.isArray(result.failed) ? result.failed : []),'), 'missing renderer strict gate for failed fallback list');
  assert(rendererText.includes('failedLimit\n    );'), 'missing renderer failed profile summary limit usage');
  assert(rendererText.includes('} else if (strictContractMode && failedCount > 0) {'), 'missing renderer strict profile-summary failed-count fallback');
  assert(rendererText.includes('names: `+${failedCount}`,'), 'missing renderer strict profile-summary failed-count label');
  assert(rendererText.includes("const profileSummary = formatStopOthersProfileSummary(result);"), 'missing renderer blocked profile-summary binding');
  assert(rendererText.includes('const blockedMessageWithProfiles = profileSummary ? `${blockedMessage}\\n${profileSummary}` : blockedMessage;'), 'missing renderer blocked profile-summary merge');
  assert(rendererText.includes('const blockedMessageWithSummary = codeSummary ? `${blockedMessageWithProfiles}\\n${codeSummary}` : blockedMessageWithProfiles;'), 'missing renderer blocked code-summary merge order');

  const keys = [
    'profileErrActionStopOthersRemainingList',
    'profileErrActionStopOthersFailedList',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile remediation profile-summary regression checks passed');
}

main();

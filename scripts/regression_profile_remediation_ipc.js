/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const root = process.cwd();
  const mainText = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preloadText = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const rendererText = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const i18nText = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
  const zhText = fs.readFileSync(path.join(root, 'locales', 'zh-CN.js'), 'utf8');

  assert(mainText.includes('function resolveProfileStatusTarget(preferredTarget = null)'), 'missing profile status target resolver');
  assert(mainText.includes('async function stopProfileRuntimeByResolvedId(id, profileDir, preferredStatusTarget = null)'), 'missing shared stop-profile runtime helper');
  assert(mainText.includes("ipcMain.handle('list-running-profile-summaries', async () => {"), 'missing running profile summaries IPC');
  assert(mainText.includes("ipcMain.handle('stop-other-running-profiles', async (event, keepId) => {"), 'missing stop-other-running-profiles IPC');
  assert(mainText.includes("return stopProfileRuntimeByResolvedId(id, profileDir, event && event.sender ? event.sender : null);"), 'missing stop-profile shared helper binding');
  assert(mainText.includes('requestedCount: targetIds.length,'), 'missing stop-other requestedCount metadata');
  assert(mainText.includes('result.remainingIds = Object.keys(activeProcesses || {}).filter((id) => !keepNormalized || id !== keepNormalized);'), 'missing stop-other remainingIds metadata');
  assert(mainText.includes('failedProfiles: [],'), 'missing stop-other failedProfiles default metadata');
  assert(mainText.includes('result.failedProfiles = result.failed'), 'missing stop-other failedProfiles aggregation binding');
  assert(mainText.includes('errorCodeProfiles: {},'), 'missing stop-other errorCodeProfiles default metadata');
  assert(mainText.includes('result.errorCodeProfiles = failureAggregation.errorCodeProfiles;'), 'missing stop-other errorCodeProfiles aggregation binding');
  assert(mainText.includes('errorCodeProfileTotals: {},'), 'missing stop-other errorCodeProfileTotals default metadata');
  assert(mainText.includes('result.errorCodeProfileTotals = failureAggregation.errorCodeProfileTotals;'), 'missing stop-other errorCodeProfileTotals aggregation binding');
  assert(mainText.includes('errorCodeProfilesTruncated: {},'), 'missing stop-other errorCodeProfilesTruncated default metadata');
  assert(mainText.includes('result.errorCodeProfilesTruncated = failureAggregation.errorCodeProfilesTruncated;'), 'missing stop-other errorCodeProfilesTruncated aggregation binding');
  assert(mainText.includes('errorCodeDetailSamples: {},'), 'missing stop-other errorCodeDetailSamples default metadata');
  assert(mainText.includes('result.errorCodeDetailSamples = failureAggregation.errorCodeDetailSamples;'), 'missing stop-other errorCodeDetailSamples aggregation binding');
  assert(mainText.includes('errorCodeDetailTotals: {},'), 'missing stop-other errorCodeDetailTotals default metadata');
  assert(mainText.includes('result.errorCodeDetailTotals = failureAggregation.errorCodeDetailTotals;'), 'missing stop-other errorCodeDetailTotals aggregation binding');
  assert(mainText.includes('errorCodeDetailsTruncated: {},'), 'missing stop-other errorCodeDetailsTruncated default metadata');
  assert(mainText.includes('result.errorCodeDetailsTruncated = failureAggregation.errorCodeDetailsTruncated;'), 'missing stop-other errorCodeDetailsTruncated aggregation binding');
  assert(mainText.includes('rankedErrorCodes: [],'), 'missing stop-other rankedErrorCodes default metadata');
  assert(mainText.includes('result.rankedErrorCodes = failureAggregation.rankedErrorCodes;'), 'missing stop-other rankedErrorCodes aggregation binding');
  assert(mainText.includes('failureCodeSummaries: [],'), 'missing stop-other failureCodeSummaries default metadata');
  assert(mainText.includes('result.failureCodeSummaries = failureAggregation.failureCodeSummaries;'), 'missing stop-other failureCodeSummaries aggregation binding');
  assert(mainText.includes('const STOP_OTHER_CONTRACT_VERSION = 2;'), 'missing stop-other contract version constant');
  assert(mainText.includes('stopOtherContractVersion: STOP_OTHER_CONTRACT_VERSION,'), 'missing stop-other contract version default metadata');
  assert(mainText.includes('result.stopOtherContractVersion = STOP_OTHER_CONTRACT_VERSION;'), 'missing stop-other contract version aggregation binding');
  assert(mainText.includes('failureDetailSampleLimitPerCode: STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE,'), 'missing stop-other failure detail sample limit default metadata');
  assert(mainText.includes('result.failureDetailSampleLimitPerCode = STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE;'), 'missing stop-other failure detail sample limit aggregation binding');
  assert(mainText.includes('failureDetailMessageMaxLength: STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH,'), 'missing stop-other failure detail message max-length default metadata');
  assert(mainText.includes('result.failureDetailMessageMaxLength = STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH;'), 'missing stop-other failure detail message max-length aggregation binding');
  assert(mainText.includes('errorCodeSummaryTopLimit: STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT,'), 'missing stop-other error code summary top limit default metadata');
  assert(mainText.includes('result.errorCodeSummaryTopLimit = STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT;'), 'missing stop-other error code summary top limit aggregation binding');
  assert(mainText.includes('codeProfileMapCodeLimit: STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT,'), 'missing stop-other code-profile-map code limit default metadata');
  assert(mainText.includes('codeProfileMapProfileLimit: STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT,'), 'missing stop-other code-profile-map profile limit default metadata');
  assert(mainText.includes('result.codeProfileMapCodeLimit = STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT;'), 'missing stop-other code-profile-map code limit aggregation binding');
  assert(mainText.includes('result.codeProfileMapProfileLimit = STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT;'), 'missing stop-other code-profile-map profile limit aggregation binding');
  assert(mainText.includes('remainingProfileSummaryLimit: STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT,'), 'missing stop-other remaining profile summary limit default metadata');
  assert(mainText.includes('failedProfileSummaryLimit: STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT,'), 'missing stop-other failed profile summary limit default metadata');
  assert(mainText.includes('result.remainingProfileSummaryLimit = STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT;'), 'missing stop-other remaining profile summary limit aggregation binding');
  assert(mainText.includes('result.failedProfileSummaryLimit = STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT;'), 'missing stop-other failed profile summary limit aggregation binding');
  assert(mainText.includes('result.retryReady = result.remainingCount === 0 && result.requestedCount > 0;'), 'missing stop-other retryReady flag');
  assert(mainText.includes("result.status = 'STOP_OTHER_PARTIAL_BLOCKED';"), 'missing stop-other partial blocked status');

  assert(preloadText.includes("listRunningProfileSummaries: () => invokeTrusted('list-running-profile-summaries'),"), 'missing preload running summaries bridge');
  assert(preloadText.includes("stopOtherRunningProfiles: (keepId) => invokeTrusted('stop-other-running-profiles', keepId),"), 'missing preload stop-other bridge');

  assert(rendererText.includes('function resolveStopOthersOutcome(result)'), 'missing renderer stop-other outcome resolver');
  assert(rendererText.includes('function getStopOtherContractVersion(result)'), 'missing renderer stop-other contract version resolver');
  assert(rendererText.includes('const STOP_OTHER_STRICT_CONTRACT_VERSION = 2;'), 'missing renderer stop-other strict contract version constant');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing renderer stop-other outcome contract-version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing renderer stop-other outcome strict-mode resolver');
  assert(rendererText.includes(': (!strictContractMode && result && Array.isArray(result.requestedIds) ? result.requestedIds.length : 0);'), 'missing renderer requestedCount strict fallback gate');
  assert(rendererText.includes(': (!strictContractMode && result && Array.isArray(result.stoppedIds) ? result.stoppedIds.length : 0);'), 'missing renderer stoppedCount strict fallback gate');
  assert(rendererText.includes(': (!strictContractMode && result && Array.isArray(result.failed) ? result.failed.length : 0);'), 'missing renderer failedCount strict fallback gate');
  assert(rendererText.includes(': (!strictContractMode && result && Array.isArray(result.remainingIds) ? result.remainingIds.length : 0);'), 'missing renderer remainingCount strict fallback gate');
  assert(rendererText.includes("kind = 'invalid_keep_id';"), 'missing invalid-keep outcome mapping');
  assert(rendererText.includes("kind = 'ready_partial';"), 'missing ready_partial outcome mapping');
  assert(rendererText.includes('const result = await window.electronAPI.stopOtherRunningProfiles(profileId);'), 'missing renderer stop-other-running-profiles usage');
  assert(rendererText.includes('const outcome = resolveStopOthersOutcome(result);'), 'missing renderer outcome-resolution usage');
  assert(rendererText.includes("if (outcome.kind === 'ready_partial') {"), 'missing renderer ready_partial branch');
  assert(rendererText.includes("if (outcome.kind === 'partial_blocked' || outcome.kind === 'blocked') {"), 'missing renderer blocked outcome branch');
  assert(rendererText.includes("profileErrActionStopOthersPartial"), 'missing renderer partial-stop feedback binding');
  assert(rendererText.includes("profileErrActionStopOthersFailed"), 'missing renderer failed-stop feedback binding');
  assert(rendererText.includes("profileErrActionNoConflict"), 'missing renderer no-conflict feedback binding');
  assert(rendererText.includes("profileErrActionInvalidKeep"), 'missing renderer invalid-keep feedback binding');
  assert(rendererText.includes("profileErrActionStopOthersReadyPartial"), 'missing renderer ready-partial feedback binding');
  assert(rendererText.includes('async function buildTunConflictSummary(profileId, code)'), 'missing renderer tun conflict summary helper');
  assert(rendererText.includes('const tunConflictSummary = await buildTunConflictSummary(profileId, code);'), 'missing error dialog tun conflict summary binding');
  assert(rendererText.includes('const lastErrConflictSummary = await buildTunConflictSummary(id, lastErr && lastErr.errorCode);'), 'missing restart preconfirm tun conflict summary binding');

  const keys = [
    'profileErrActionStopOthersDone',
    'profileErrActionStopOthersPartial',
    'profileErrActionStopOthersFailed',
    'profileErrActionStopOthersReadyPartial',
    'profileErrActionNoConflict',
    'profileErrActionInvalidKeep',
    'profileErrActionTunConflictList',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile remediation ipc regression checks passed');
}

main();

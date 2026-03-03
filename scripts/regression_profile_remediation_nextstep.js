/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const root = process.cwd();
  const rendererText = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const i18nText = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
  const zhText = fs.readFileSync(path.join(root, 'locales', 'zh-CN.js'), 'utf8');

  assert(rendererText.includes('function getStopOtherDominantActionSuggestion(code)'), 'missing dominant stop-other action-suggestion mapper');
  assert(rendererText.includes("case 'STOP_PROFILE_PERMISSION_DENIED':"), 'missing permission-denied next-step mapping');
  assert(rendererText.includes("case 'STOP_PROFILE_PROCESS_NOT_FOUND':"), 'missing process-not-found next-step mapping');
  assert(rendererText.includes('const contractVersion = getStopOtherContractVersion(result);'), 'missing stop-other dominant-code contract-version read');
  assert(rendererText.includes('const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;'), 'missing stop-other dominant-code strict-mode resolver');
  assert(rendererText.includes('const firstFailed = !strictContractMode && result && Array.isArray(result.failed) && result.failed.length > 0'), 'missing strict-mode gate for first-failed fallback');
  assert(rendererText.includes(': (!strictContractMode && firstFailed && (firstFailed.errorCode || firstFailed.code))'), 'missing strict-mode gate for dominant-code fallback');
  assert(rendererText.includes("const dominantSuggestion = getStopOtherDominantActionSuggestion(dominantCode);"), 'missing dominant suggestion binding');
  assert(rendererText.includes("const blockedMessageWithSuggestion = dominantSuggestion ? `${blockedMessageWithSummary}\\n${dominantSuggestion}` : blockedMessageWithSummary;"), 'missing blocked message suggestion merge');
  assert(rendererText.includes("message: blockedMessageWithSuggestion,"), 'missing blocked suggestion message propagation');

  const keys = [
    'profileErrActionStopOthersNextStepPermissionDenied',
    'profileErrActionStopOthersNextStepProfileInvalid',
    'profileErrActionStopOthersNextStepProcessMissing',
    'profileErrActionStopOthersNextStepGeneric',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile remediation next-step regression checks passed');
}

main();

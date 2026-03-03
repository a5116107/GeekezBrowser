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

  assert(rendererText.includes('function getProfileErrorActionPlan(code, stage = \'\', profileId = null)'), 'missing profile error action plan mapper');
  assert(rendererText.includes('function showProfileErrorWithActions(prefix, errorLike, stage = \'\', profileId = null, retryFn = null)'), 'missing profile error action confirm helper');
  assert(rendererText.includes("normalized === 'TUN_ALREADY_RUNNING' || normalized === 'TUN_REQUIRES_SINGLE_PROFILE'"), 'missing TUN single-profile remediation mapping');
  assert(rendererText.includes("const ready = await stopOtherRunningProfilesForTun(profileId);"), 'missing stop-others remediation action');
  assert(rendererText.includes("const lastErrPlan = getProfileErrorActionPlan(lastErr && lastErr.errorCode, lastErr && lastErr.stage, id);"), 'missing restart preconfirm action plan binding');
  assert(rendererText.includes("await showProfileErrorWithActions('Error', launchErr, 'launch', id, async () => { await launch(id); });"), 'missing launch retry action dialog');
  assert(rendererText.includes("await showProfileErrorWithActions('Restart Error', stopErr, 'stop', id, async () => { await restart(id); });"), 'missing restart stop-failure action dialog');
  assert(rendererText.includes("await showProfileErrorWithActions('Stop Error', stopErr, 'stop', id, async () => { await stopProfile(id); });"), 'missing stop failure action dialog');

  const keys = [
    'profileErrActionRefreshList',
    'profileErrActionStopOthersRetry',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile error action regression checks passed');
}

main();

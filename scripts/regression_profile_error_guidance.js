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

  assert(rendererText.includes('function getProfileErrorActionHint(code, stage = \'\')'), 'missing profile error action hint mapper');
  assert(rendererText.includes('function composeProfileErrorMessage(prefix, errorLike, stage = \'\')'), 'missing profile error message composer');
  assert(rendererText.includes("await showProfileErrorWithActions('Error', launchErr, 'launch', id, async () => { await launch(id); });"), 'missing launch guidance binding');
  assert(rendererText.includes("const lastErrHint = getProfileErrorActionHint(lastErr && lastErr.errorCode, lastErr && lastErr.stage);"), 'missing restart confirm hint binding');
  assert(rendererText.includes("await showProfileErrorWithActions('Restart Error', stopErr, 'stop', id, async () => { await restart(id); });"), 'missing restart-stop guidance binding');
  assert(rendererText.includes("await showProfileErrorWithActions('Stop Error', stopErr, 'stop', id, async () => { await stopProfile(id); });"), 'missing stop guidance binding');

  const keys = [
    'profileErrHintTunAdmin',
    'profileErrHintTunResources',
    'profileErrHintTunUnsupported',
    'profileErrHintTunSingle',
    'profileErrHintSingboxMissing',
    'profileErrHintChromeMissing',
    'profileErrHintPortInUse',
    'profileErrHintStopPermission',
    'profileErrHintStopProcessMissing',
    'profileErrHintProfileInvalid',
    'profileErrHintLaunchGeneric',
    'profileErrHintStopGeneric',
    'profileErrHintGeneric',
  ];
  for (const key of keys) {
    assert(i18nText.includes(`${key}:`), `missing i18n key: ${key}`);
    assert(zhText.includes(`${key}:`), `missing zh-CN key: ${key}`);
  }

  console.log('[ok] profile error guidance regression checks passed');
}

main();

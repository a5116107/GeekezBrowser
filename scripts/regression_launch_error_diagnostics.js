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

  assert(mainText.includes('function mapProfileLaunchErrorCode(err)'), 'missing profile launch error-code mapper');
  assert(mainText.includes("if (/chrome binary not found/i.test(message)) return 'CHROME_BINARY_NOT_FOUND';"), 'missing chrome binary launch error mapping');
  assert(mainText.includes("if (/proxy\\/fingerprint consistency block/i.test(message)) return 'PROXY_FINGERPRINT_CONSISTENCY_BLOCK';"), 'missing proxy/fingerprint consistency-block mapping');
  assert(mainText.includes("if (/proxy\\/fingerprint mismatch/i.test(message)) return 'PROXY_FINGERPRINT_LINK_MISMATCH';"), 'missing proxy/fingerprint link-mismatch mapping');
  assert(mainText.includes("if (/ua consistency block/i.test(message)) return 'UA_CONSISTENCY_BLOCK';"), 'missing ua consistency-block mapping');
  assert(mainText.includes("if (/address already in use|eaddrinuse/i.test(message)) return 'PROFILE_PROXY_PORT_IN_USE';"), 'missing proxy port in-use mapping');
  assert(mainText.includes("return 'PROFILE_LAUNCH_FAILED';"), 'missing profile launch fallback error code');

  assert(mainText.includes('const launchErrorCode = mapProfileLaunchErrorCode(err);'), 'missing launch error-code binding in launch-profile catch');
  assert(mainText.includes('if (err && typeof err === \'object\' && !err.code) {'), 'missing launch error-code bridge guard');
  assert(mainText.includes('err.errorCode = launchErrorCode;'), 'missing launch error-code bridge assignment');
  assert(mainText.includes('function emitProfileStatusEvent(target, id, status, meta = {})'), 'missing profile-status structured emitter helper');
  assert(mainText.includes("emitProfileStatusEvent(sender, profileId, 'launch_failed', {"), 'missing launch-failed status event emission');
  assert(mainText.includes("errorStage: 'launch',"), 'missing launch-failed errorStage propagation');
  assert(mainText.includes('errorCode: launchErrorCode,'), 'missing diagnostics.lastError errorCode persistence');

  assert(rendererText.includes('const launchErr = formatIpcError(e);'), 'missing launch ipc-error formatter usage');
  assert(rendererText.includes("await showProfileErrorWithActions('Error', launchErr, 'launch', id, async () => { await launch(id); });"), 'missing launch alert guidance binding');
  assert(rendererText.includes('const lastErrCodeSuffix = lastErr && lastErr.errorCode ? ` [${lastErr.errorCode}]` : \'\';'), 'missing restart confirm lastError code suffix');

  console.log('[ok] launch error diagnostics regression checks passed');
}

main();

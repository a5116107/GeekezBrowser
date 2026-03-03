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

  assert(mainText.includes('function emitProfileStatusEvent(target, id, status, meta = {})'), 'missing profile-status event emitter helper');
  assert(mainText.includes("target.send('profile-status', {"), 'missing profile-status event emitter payload');
  assert(mainText.includes('errorCode: normalize(meta.errorCode),'), 'missing profile-status errorCode normalization');
  assert(mainText.includes('errorStage: normalize(meta.errorStage),'), 'missing profile-status errorStage normalization');
  assert(mainText.includes('errorMessage: normalize(meta.errorMessage),'), 'missing profile-status errorMessage normalization');
  assert(mainText.includes("emitProfileStatusEvent(statusTarget, id, 'stop_failed', {"), 'missing stop_failed structured status emission');
  assert(mainText.includes("emitProfileStatusEvent(sender, profileId, 'launch_failed', {"), 'missing launch_failed structured status emission');

  assert(rendererText.includes('window.electronAPI.onProfileStatus(({ id, status, errorCode, errorStage, errorMessage }) => {'), 'missing renderer structured profile-status handler');
  assert(rendererText.includes("if (status === 'stop_failed' || status === 'launch_failed') {"), 'missing renderer failure-status branch');
  assert(rendererText.includes("badge.innerText = t('launchFailedStatus') || 'Launch Failed';"), 'missing renderer launch-failed badge text');
  assert(rendererText.includes("const statusLabel = status === 'launch_failed'"), 'missing renderer launch/stop failure toast label switch');
  assert(rendererText.includes("const hasError = lastStatus === 'stop_failed' || lastStatus === 'launch_failed' || !!lastErr;"), 'missing renderer health-state launch_failed handling');

  console.log('[ok] profile status error-context regression checks passed');
}

main();

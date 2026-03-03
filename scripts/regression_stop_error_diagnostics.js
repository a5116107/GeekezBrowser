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

  assert(mainText.includes('function mapProfileStopErrorCode(err)'), 'missing profile stop error-code mapper');
  assert(mainText.includes("'STOP_PROFILE_MISSING_ID'"), 'missing stop missing-id error code');
  assert(mainText.includes("'STOP_PROFILE_INVALID_ID'"), 'missing stop invalid-id error code');
  assert(mainText.includes("'STOP_PROFILE_PERMISSION_DENIED'"), 'missing stop permission-denied error code');
  assert(mainText.includes("'STOP_PROFILE_PROCESS_NOT_FOUND'"), 'missing stop process-not-found error code');
  assert(mainText.includes("'STOP_PROFILE_FAILED'"), 'missing stop fallback error code');

  assert(mainText.includes("if (!id) return { success: false, error: 'Missing id', errorCode: 'STOP_PROFILE_MISSING_ID', code: 'STOP_PROFILE_MISSING_ID' };"), 'missing stop-profile missing-id return contract');
  assert(mainText.includes("return { success: false, error: 'Invalid id', errorCode: 'STOP_PROFILE_INVALID_ID', code: 'STOP_PROFILE_INVALID_ID' };"), 'missing stop-profile invalid-id return contract');
  assert(mainText.includes('const stopErrorCode = mapProfileStopErrorCode(e);'), 'missing stop-profile stopErrorCode binding');
  assert(mainText.includes("emitProfileStatusEvent(statusTarget, id, 'stop_failed', {"), 'missing stop-failed status structured propagation');
  assert(mainText.includes("errorStage: 'stop',"), 'missing stop-failed errorStage propagation');
  assert(mainText.includes('errorCode: stopErrorCode,'), 'missing diagnostics.lastError stop errorCode persistence');
  assert(mainText.includes("return { success: false, error: e && e.message ? e.message : String(e || 'stop failed'), errorCode: stopErrorCode, code: stopErrorCode };"), 'missing stop-profile error return code contract');

  assert(rendererText.includes('const __lastStatusErrorCode = new Map();'), 'missing renderer last status error-code cache');
  assert(rendererText.includes('const __lastStatusErrorStage = new Map();'), 'missing renderer last status error-stage cache');
  assert(rendererText.includes('const __lastStatusErrorMessage = new Map();'), 'missing renderer last status error-message cache');
  assert(rendererText.includes('window.electronAPI.onProfileStatus(({ id, status, errorCode, errorStage, errorMessage }) => {'), 'missing renderer profile-status structured error handler');
  assert(rendererText.includes('__lastStatusErrorCode.set(id, errorCode || null);'), 'missing renderer stop-failed errorCode cache write');
  assert(rendererText.includes('__lastStatusErrorStage.set(id, errorStage || null);'), 'missing renderer stop-failed errorStage cache write');
  assert(rendererText.includes('__lastStatusErrorMessage.set(id, errorMessage || null);'), 'missing renderer stop-failed errorMessage cache write');
  assert(rendererText.includes('__lastStatusErrorCode.delete(id);'), 'missing renderer status errorCode cache cleanup');
  assert(rendererText.includes('__lastStatusErrorStage.delete(id);'), 'missing renderer status errorStage cache cleanup');
  assert(rendererText.includes('__lastStatusErrorMessage.delete(id);'), 'missing renderer status errorMessage cache cleanup');
  assert(rendererText.includes("const statusLabel = status === 'launch_failed'"), 'missing renderer failure status label mapper');
  assert(rendererText.includes('const statusErrCode = __lastStatusErrorCode.get(p.id);'), 'missing renderer profile-card status errorCode fallback');
  assert(rendererText.includes('const statusErrStage = __lastStatusErrorStage.get(p.id);'), 'missing renderer profile-card status errorStage fallback');
  assert(rendererText.includes('const statusErrMessage = __lastStatusErrorMessage.get(p.id);'), 'missing renderer profile-card status errorMessage fallback');
  assert(rendererText.includes('const stopResult = await window.electronAPI.stopProfile(id);'), 'missing restart stop result binding');
  assert(rendererText.includes("const stopErr = formatResultError(stopResult, 'Stop failed');"), 'missing restart stop result formatter');
  assert(rendererText.includes("const stopErr = formatResultError(result, 'Stop failed');"), 'missing stop action result formatter');

  console.log('[ok] stop error diagnostics regression checks passed');
}

main();

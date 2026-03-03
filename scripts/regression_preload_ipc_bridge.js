/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const preloadPath = path.join(__dirname, '..', 'preload.js');
  const preloadCode = fs.readFileSync(preloadPath, 'utf8');

  const invokeCalls = [];
  const onCalls = [];
  let exposedApi = null;

  const mockElectron = {
    contextBridge: {
      exposeInMainWorld: (name, api) => {
        if (name === 'electronAPI') exposedApi = api;
      },
    },
    ipcRenderer: {
      invoke: (...args) => {
        invokeCalls.push(args);
        return Promise.resolve({ success: true });
      },
      on: (...args) => {
        onCalls.push(args);
        return () => {};
      },
    },
  };

  const sandbox = {
    require: (id) => {
      if (id === 'electron') return mockElectron;
      throw new Error(`Unexpected require in preload sandbox: ${id}`);
    },
    globalThis: {
      location: { protocol: 'file:' },
    },
    console,
    Set,
    Promise,
    Error,
  };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(preloadCode, sandbox, { filename: 'preload.js' });

  assert(exposedApi && typeof exposedApi === 'object', 'electronAPI bridge not exposed');

  invokeCalls.length = 0;
  await exposedApi.launchProfile('profile-1', 'enhanced', { skipProxyWarnOnce: true });
  assert(invokeCalls.length === 1, 'launchProfile should invoke exactly once');
  assert(invokeCalls[0][0] === 'launch-profile', 'launchProfile channel mismatch');
  assert(invokeCalls[0].length === 4, 'launchProfile should forward 3 args');
  assert(invokeCalls[0][1] === 'profile-1', 'launchProfile arg[0] mismatch');
  assert(invokeCalls[0][2] === 'enhanced', 'launchProfile arg[1] mismatch');
  assert(invokeCalls[0][3] && invokeCalls[0][3].skipProxyWarnOnce === true, 'launchProfile arg[2] mismatch');

  invokeCalls.length = 0;
  await exposedApi.clearProfileLogs('profile-2', true);
  assert(invokeCalls.length === 1, 'clearProfileLogs should invoke exactly once');
  assert(invokeCalls[0][0] === 'clear-profile-logs', 'clearProfileLogs channel mismatch');
  assert(invokeCalls[0].length === 3, 'clearProfileLogs should forward 2 args');
  assert(invokeCalls[0][1] === 'profile-2', 'clearProfileLogs arg[0] mismatch');
  assert(invokeCalls[0][2] === true, 'clearProfileLogs arg[1] mismatch');

  invokeCalls.length = 0;
  await exposedApi.deleteProfileRotatedLog('profile-3', 'xray_run.2026.log');
  assert(invokeCalls.length === 1, 'deleteProfileRotatedLog should invoke exactly once');
  assert(invokeCalls[0][0] === 'delete-profile-rotated-log', 'deleteProfileRotatedLog channel mismatch');
  assert(invokeCalls[0].length === 3, 'deleteProfileRotatedLog should forward 2 args');
  assert(invokeCalls[0][1] === 'profile-3', 'deleteProfileRotatedLog arg[0] mismatch');
  assert(invokeCalls[0][2] === 'xray_run.2026.log', 'deleteProfileRotatedLog arg[1] mismatch');

  invokeCalls.length = 0;
  await exposedApi.invoke('test-proxy-node', { proxyStr: 'http://1.2.3.4:8080' });
  assert(invokeCalls.length === 1, 'generic invoke should call ipcRenderer.invoke');
  assert(invokeCalls[0][0] === 'test-proxy-node', 'generic invoke channel mismatch');

  let blocked = false;
  try {
    await exposedApi.invoke('launch-profile', { id: 'profile-x' });
  } catch (e) {
    blocked = /IPC channel not allowed/.test((e && e.message) || String(e));
  }
  assert(blocked, 'generic invoke should reject channels outside allowlist');

  sandbox.globalThis.location.protocol = 'https:';
  let untrustedBlocked = false;
  try {
    await exposedApi.getProfiles();
  } catch (e) {
    untrustedBlocked = /Untrusted renderer origin/.test((e && e.message) || String(e));
  }
  assert(untrustedBlocked, 'trusted-origin guard should reject non-file protocol');

  sandbox.globalThis.location.protocol = 'file:';
  await exposedApi.onLeakCheckFinished(() => {});
  assert(onCalls.some((args) => args[0] === 'leak-check-finished'), 'onLeakCheckFinished should subscribe leak-check-finished');

  console.log('[ok] preload IPC bridge regression passed');
}

main().catch((e) => {
  console.error('[fail] preload IPC bridge regression failed:', e && e.message ? e.message : e);
  process.exit(1);
});

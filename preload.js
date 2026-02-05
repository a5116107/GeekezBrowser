// preload.js
const { contextBridge, ipcRenderer } = require('electron');

function assertTrustedUiOrigin() {
    try {
        const p = globalThis.location && globalThis.location.protocol;
        if (p === 'file:') return;
    } catch (e) { }
    throw new Error('Untrusted renderer origin');
}

function invokeTrusted(channel, data) {
    assertTrustedUiOrigin();
    return ipcRenderer.invoke(channel, data);
}

const ALLOWED_INVOKE_CHANNELS = new Set([
    // window theming / app info
    'set-title-bar-color',
    'get-app-info',

    // updates
    'check-app-update',
    'check-xray-update',
    'download-xray-update',

    // external links
    'open-url',

    // subscriptions / proxy tools
    'fetch-url',
    'fetch-url-conditional',
    'parse-subscription',
    'test-proxy-node',
    'export-selected-data',

    // export/import
    'get-export-profiles',
    'import-full-backup',
    'export-full-backup',
    'import-data',

    // data directory
    'get-data-path-info',
    'select-data-directory',
    'set-data-directory',
    'reset-data-directory',

    // api server
    'start-api-server',
    'stop-api-server',
    'get-api-status',

    // user extensions
    'select-extension-folder',
    'add-user-extension',
    'get-user-extensions',
    'remove-user-extension',
]);

contextBridge.exposeInMainWorld('electronAPI', {
    getProfiles: () => invokeTrusted('get-profiles'),
    saveProfile: (data) => invokeTrusted('save-profile', data),
    updateProfile: (data) => invokeTrusted('update-profile', data),
    deleteProfile: (id) => invokeTrusted('delete-profile', id),
    launchProfile: (id, watermarkStyle, options = {}) => invokeTrusted('launch-profile', id, watermarkStyle, options),
    getSettings: () => invokeTrusted('get-settings'),
    saveSettings: (data) => invokeTrusted('save-settings', data),
    exportProfile: (id) => invokeTrusted('export-profile', id),
    importProfile: () => invokeTrusted('import-profile'),
    // 通用 invoke，用于 open-url 等
    invoke: (channel, data) => {
        assertTrustedUiOrigin();
        if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
        return ipcRenderer.invoke(channel, data);
    },
    getRunningIds: () => invokeTrusted('get-running-ids'),
    runLeakCheck: (id) => invokeTrusted('run-leak-check', id),
    openPath: (p) => invokeTrusted('open-path', p),
    stopProfile: (id) => invokeTrusted('stop-profile', id),
    getProfileLogPath: (id) => invokeTrusted('get-profile-log-path', id),
    clearProfileLogs: (id, clearHistory = false) => invokeTrusted('clear-profile-logs', id, clearHistory),
    getProfileLogSizes: (id) => invokeTrusted('get-profile-log-sizes', id),
    listProfileRotatedLogs: (id) => invokeTrusted('list-profile-rotated-logs', id),
    deleteProfileRotatedLog: (id, filename) => invokeTrusted('delete-profile-rotated-log', id, filename),
    onProfileStatus: (callback) => { assertTrustedUiOrigin(); return ipcRenderer.on('profile-status', (event, data) => callback(data)); },
    onProxyConsistencyWarning: (callback) => { assertTrustedUiOrigin(); return ipcRenderer.on('proxy-consistency-warning', (event, data) => callback(data)); },
    // API events
    onRefreshProfiles: (callback) => { assertTrustedUiOrigin(); return ipcRenderer.on('refresh-profiles', () => callback()); },
    onApiLaunchProfile: (callback) => { assertTrustedUiOrigin(); return ipcRenderer.on('api-launch-profile', (event, id) => callback(id)); },
    setSystemProxyMode: (enable, endpoint) => invokeTrusted('set-system-proxy-mode', { enable, endpoint }),
    getSystemProxyStatus: () => invokeTrusted('get-system-proxy-status'),
});

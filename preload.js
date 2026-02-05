// preload.js
const { contextBridge, ipcRenderer } = require('electron');

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
    getProfiles: () => ipcRenderer.invoke('get-profiles'),
    saveProfile: (data) => ipcRenderer.invoke('save-profile', data),
    updateProfile: (data) => ipcRenderer.invoke('update-profile', data),
    deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),
    launchProfile: (id, watermarkStyle, options = {}) => ipcRenderer.invoke('launch-profile', id, watermarkStyle, options),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
    exportProfile: (id) => ipcRenderer.invoke('export-profile', id),
    importProfile: () => ipcRenderer.invoke('import-profile'),
    // 通用 invoke，用于 open-url 等
    invoke: (channel, data) => {
        if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
        return ipcRenderer.invoke(channel, data);
    },
    getRunningIds: () => ipcRenderer.invoke('get-running-ids'),
    runLeakCheck: (id) => ipcRenderer.invoke('run-leak-check', id),
    openPath: (p) => ipcRenderer.invoke('open-path', p),
    stopProfile: (id) => ipcRenderer.invoke('stop-profile', id),
    getProfileLogPath: (id) => ipcRenderer.invoke('get-profile-log-path', id),
    clearProfileLogs: (id, clearHistory = false) => ipcRenderer.invoke('clear-profile-logs', id, clearHistory),
    getProfileLogSizes: (id) => ipcRenderer.invoke('get-profile-log-sizes', id),
    listProfileRotatedLogs: (id) => ipcRenderer.invoke('list-profile-rotated-logs', id),
    deleteProfileRotatedLog: (id, filename) => ipcRenderer.invoke('delete-profile-rotated-log', id, filename),
    onProfileStatus: (callback) => ipcRenderer.on('profile-status', (event, data) => callback(data)),
    onProxyConsistencyWarning: (callback) => ipcRenderer.on('proxy-consistency-warning', (event, data) => callback(data)),
    // API events
    onRefreshProfiles: (callback) => ipcRenderer.on('refresh-profiles', () => callback()),
    onApiLaunchProfile: (callback) => ipcRenderer.on('api-launch-profile', (event, id) => callback(id)),
    setSystemProxyMode: (enable, endpoint) => ipcRenderer.invoke('set-system-proxy-mode', { enable, endpoint }),
    getSystemProxyStatus: () => ipcRenderer.invoke('get-system-proxy-status'),
});

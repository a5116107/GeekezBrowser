const { app, BrowserWindow, ipcMain, dialog, screen, shell } = require('electron');
const path = require('path');
const { session } = require('electron');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const getPort = require('get-port');
const puppeteer = require('puppeteer'); // 使用原生 puppeteer，不带 extra
const { v4: uuidv4 } = require('uuid');
const yaml = require('js-yaml');
const { SocksProxyAgent } = require('socks-proxy-agent');
const http = require('http');
const https = require('https');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);


// Hardware acceleration enabled for better UI performance
// Only disable if GPU compatibility issues occur

const { generateXrayConfig } = require('./utils');
const { generateFingerprint, normalizeFingerprintSpec, getInjectScript } = require('./fingerprint');
const { normalizeProxySpec, normalizeProxyInputRaw } = require('./proxy/proxySpec');
const { buildSingboxConfigFromProxySpec, buildSingboxTunConfigFromProxySpec } = require('./proxy/singboxConfig');
const { downloadFile, extractZip, isZipFileHeader, sha256FileHex } = require('./updateUtils');

const isDev = !app.isPackaged;
const RESOURCES_BIN = isDev ? path.join(__dirname, 'resources', 'bin') : path.join(process.resourcesPath, 'bin');
// Use platform+arch specific directory for xray binary
const PLATFORM_ARCH = `${process.platform}-${process.arch}`; // e.g., darwin-arm64, darwin-x64, win32-x64
const BIN_DIR = path.join(RESOURCES_BIN, PLATFORM_ARCH);
const BIN_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'xray.exe' : 'xray');
// Fallback to old location for backward compatibility
const BIN_DIR_LEGACY = RESOURCES_BIN;
const BIN_PATH_LEGACY = path.join(BIN_DIR_LEGACY, process.platform === 'win32' ? 'xray.exe' : 'xray');

const SINGBOX_PATH = path.join(BIN_DIR, process.platform === 'win32' ? 'sing-box.exe' : 'sing-box');

// 自定义数据目录支持
const APP_CONFIG_FILE = path.join(app.getPath('userData'), 'app-config.json');
const DEFAULT_DATA_PATH = path.join(app.getPath('userData'), 'BrowserProfiles');

// 读取自定义数据目录
function getCustomDataPath() {
    try {
        if (fs.existsSync(APP_CONFIG_FILE)) {
            const config = fs.readJsonSync(APP_CONFIG_FILE);
            if (config.customDataPath && fs.existsSync(config.customDataPath)) {
                return config.customDataPath;
            }
        }
    } catch (e) {
        console.error('Failed to read custom data path:', e);
    }
    return DEFAULT_DATA_PATH;
}

const DATA_PATH = getCustomDataPath();
const TRASH_PATH = path.join(app.getPath('userData'), '_Trash_Bin');
const PROFILES_FILE = path.join(DATA_PATH, 'profiles.json');
const SETTINGS_FILE = path.join(DATA_PATH, 'settings.json');

fs.ensureDirSync(DATA_PATH);
fs.ensureDirSync(TRASH_PATH);

const PROFILE_ID_SAFE_RE = /^[a-zA-Z0-9_-]{1,80}$/;

function normalizeProfileId(input) {
    if (typeof input !== 'string') return null;
    const id = input.trim();
    if (!id) return null;
    if (!PROFILE_ID_SAFE_RE.test(id)) return null;
    return id;
}

function resolveProfileDirOrThrow(profileId) {
    const id = normalizeProfileId(profileId);
    if (!id) throw new Error('Invalid profile id');
    const dataRoot = path.resolve(DATA_PATH);
    const dir = path.resolve(DATA_PATH, id);
    const prefix = dataRoot.endsWith(path.sep) ? dataRoot : dataRoot + path.sep;
    if (!dir.startsWith(prefix)) throw new Error('Invalid profile path');
    return { id, profileDir: dir };
}

let activeProcesses = {};
let apiServer = null;
let apiServerRunning = false;
let apiServerToken = null;
let mainWindow = null; // Global reference for API-to-UI communication

function getProxyEngineFromProfile(profile) {
    return profile.proxyEngine || (profile.fingerprint && profile.fingerprint.proxyEngine) || 'xray';
}

function singboxEnvForConfig(sbConfig) {
    const env = { ...process.env };
    try {
        const outbounds = sbConfig && Array.isArray(sbConfig.outbounds) ? sbConfig.outbounds : [];
        const hasWireguard = outbounds.some((o) => o && typeof o === 'object' && String(o.type || '').toLowerCase() === 'wireguard');
        if (hasWireguard) {
            // sing-box 1.11+ deprecates legacy wireguard outbound behind an env flag (still present in 1.12.x).
            env.ENABLE_DEPRECATED_WIREGUARD_OUTBOUND = 'true';
        }
    } catch (e) { }
    return env;
}

function isWindowsAdmin() {
    if (process.platform !== 'win32') return false;
    try {
        const { spawnSync } = require('child_process');
        const res = spawnSync('net', ['session'], { windowsHide: true, stdio: 'ignore' });
        return res && res.status === 0;
    } catch (e) {
        return false;
    }
}

function assertTunReadyOrThrow(requestingProfileId) {
    if (process.platform !== 'win32') {
        const err = new Error('TUN mode is currently supported on Windows only');
        err.code = 'TUN_UNSUPPORTED_PLATFORM';
        throw err;
    }
    const wintunPath = path.join(BIN_DIR, 'wintun.dll');
    if (!fs.existsSync(SINGBOX_PATH) || !fs.existsSync(wintunPath)) {
        const err = new Error('TUN resources missing (sing-box.exe and/or wintun.dll)');
        err.code = 'TUN_RESOURCES_MISSING';
        throw err;
    }
    if (!isWindowsAdmin()) {
        const err = new Error('TUN mode requires running GeekEZ Browser as Administrator');
        err.code = 'TUN_ADMIN_REQUIRED';
        throw err;
    }
    const runningIds = Object.keys(activeProcesses || {});
    if (runningIds.length > 0) {
        const other = runningIds.find((id) => id !== requestingProfileId);
        if (other) {
            const err = new Error('Stop other running profiles before enabling TUN mode');
            err.code = 'TUN_REQUIRES_SINGLE_PROFILE';
            throw err;
        }
    }
}

async function startProxyEngine(profile, localPort, configPath, logFd, options = {}) {
    const proxyMode = profile && profile.proxyMode === 'tun' ? 'tun' : 'app_proxy';
    let engine = getProxyEngineFromProfile(profile);
    const proxyStr = profile.proxyStr || '';
    const preProxyConfig = (options && typeof options === 'object' && options.preProxyConfig)
        ? options.preProxyConfig
        : ((profile && profile.preProxyConfig) ? profile.preProxyConfig : null);

    if (proxyMode === 'tun') {
        engine = 'sing-box';
        assertTunReadyOrThrow(profile && profile.id ? profile.id : null);
    }

    if (engine === 'xray') {
        const config = generateXrayConfig(proxyStr, localPort, preProxyConfig);
        fs.writeJsonSync(configPath, config);
        const xrayProcess = spawn(BIN_PATH, ['-c', configPath], { cwd: BIN_DIR, env: { ...process.env, 'XRAY_LOCATION_ASSET': RESOURCES_BIN }, stdio: ['ignore', logFd, logFd], windowsHide: true });
        return { engine: 'xray', pid: xrayProcess.pid, process: xrayProcess };
    }

    if (engine === 'sing-box') {
        if (!fs.existsSync(SINGBOX_PATH)) {
            const err = new Error('sing-box binary not found');
            err.code = 'SINGBOX_BINARY_MISSING';
            throw err;
        }
        const spec = normalizeProxySpec(proxyStr);
        let preProxySpec = null;
        try {
            const target = preProxyConfig && Array.isArray(preProxyConfig.preProxies) && preProxyConfig.preProxies.length > 0 ? preProxyConfig.preProxies[0] : null;
            if (target && target.url) preProxySpec = normalizeProxySpec(target.url);
        } catch (e) { }
        const tunOpts = profile && profile.tun && typeof profile.tun === 'object' ? profile.tun : null;
        const sbConfig = proxyMode === 'tun'
            ? (preProxySpec ? buildSingboxTunConfigFromProxySpec(spec, localPort, { preProxySpec, tun: tunOpts || {} }) : buildSingboxTunConfigFromProxySpec(spec, localPort, { tun: tunOpts || {} }))
            : (preProxySpec ? buildSingboxConfigFromProxySpec(spec, localPort, { preProxySpec }) : buildSingboxConfigFromProxySpec(spec, localPort));
        fs.writeJsonSync(configPath, sbConfig);
        const sbProcess = spawn(SINGBOX_PATH, ['run', '-c', configPath], { cwd: BIN_DIR, env: singboxEnvForConfig(sbConfig), stdio: ['ignore', logFd, logFd], windowsHide: true });
        return { engine: 'sing-box', pid: sbProcess.pid, process: sbProcess };
    }

    throw new Error(`Proxy engine not supported: ${engine}`);
}

// ============================================================================
// REST API Server
// ============================================================================
const API_TOKEN_HEADER = 'x-geekez-api-token';
const API_BODY_MAX_BYTES = 1024 * 1024; // 1MB

function isAllowedApiCorsOrigin(origin) {
    // Renderer is loaded via file:// so Origin is "null".
    return origin === 'null';
}

function getApiTokenFromRequest(req) {
    const direct = req && req.headers ? req.headers[API_TOKEN_HEADER] : null;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const auth = req && req.headers ? req.headers['authorization'] : null;
    if (typeof auth === 'string') {
        const m = auth.match(/^Bearer\s+(.+)$/i);
        if (m && m[1]) return m[1].trim();
    }
    return null;
}

async function ensureApiTokenInSettings() {
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
    const existing = typeof settings.apiToken === 'string' ? settings.apiToken.trim() : '';
    if (existing) return existing;

    const token = crypto.randomBytes(24).toString('base64url');
    settings.apiToken = token;
    await fs.writeJson(SETTINGS_FILE, settings, { spaces: 2 });
    return token;
}

function readBodyWithLimit(req, maxBytes) {
    return new Promise((resolve, reject) => {
        let data = '';
        let bytes = 0;

        req.on('data', (chunk) => {
            bytes += chunk.length;
            if (bytes > maxBytes) {
                const err = new Error('Request body too large');
                err.code = 'API_BODY_TOO_LARGE';
                try { req.destroy(err); } catch (e) { }
                reject(err);
                return;
            }
            data += chunk.toString();
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function createApiServer(port) {
    const server = http.createServer(async (req, res) => {
        const origin = req.headers.origin;

        // CORS: only allow file:// (Origin: null). Non-browser clients typically have no Origin.
        if (origin && isAllowedApiCorsOrigin(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-GeekEZ-API-Token');
        } else {
            // Do not set ACAO for other origins.
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-GeekEZ-API-Token');
        }
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
            if (origin && !isAllowedApiCorsOrigin(origin)) {
                res.writeHead(403);
                res.end(JSON.stringify({ success: false, error: 'CORS origin not allowed' }));
                return;
            }
            res.writeHead(200);
            res.end();
            return;
        }

        const url = new URL(req.url, `http://localhost:${port}`);
        const pathname = url.pathname;
        const method = req.method;

        // Auth: require token for all /api/* endpoints.
        if (pathname.startsWith('/api/')) {
            if (!apiServerToken) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: 'API token not initialized' }));
                return;
            }
            const token = getApiTokenFromRequest(req);
            if (!token || token !== apiServerToken) {
                res.writeHead(401);
                res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
                return;
            }
        }

        // Parse body for POST/PUT
        let body = '';
        if (method === 'POST' || method === 'PUT') {
            try {
                body = await readBodyWithLimit(req, API_BODY_MAX_BYTES);
            } catch (err) {
                const status = err && err.code === 'API_BODY_TOO_LARGE' ? 413 : 400;
                res.writeHead(status);
                res.end(JSON.stringify({ success: false, error: err && err.message ? err.message : 'Bad Request' }));
                return;
            }
        }

        try {
            const result = await handleApiRequest(method, pathname, body, url.searchParams);
            res.writeHead(result.status || 200);
            res.end(JSON.stringify(result.data || result));
        } catch (err) {
            console.error('API Error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });

    return server;
}

async function handleApiRequest(method, pathname, body, params) {
    let profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};

    // Helper: Find profile by ID or Name
    const findProfile = (idOrName) => {
        return profiles.find(p => p.id === idOrName || p.name === idOrName);
    };

    // Helper: Generate unique name
    const generateUniqueName = (baseName) => {
        if (!profiles.find(p => p.name === baseName)) return baseName;
        let suffix = 2;
        while (profiles.find(p => p.name === `${baseName}-${String(suffix).padStart(2, '0')}`)) {
            suffix++;
        }
        return `${baseName}-${String(suffix).padStart(2, '0')}`;
    };

    // GET /api/status
    if (method === 'GET' && pathname === '/api/status') {
        return { success: true, running: Object.keys(activeProcesses), count: Object.keys(activeProcesses).length };
    }

    // GET /api/profiles
    if (method === 'GET' && pathname === '/api/profiles') {
        return { success: true, profiles: profiles.map(p => ({ id: p.id, name: p.name, tags: p.tags, running: !!activeProcesses[p.id] })) };
    }

    // GET /api/profiles/:idOrName
    const profileMatch = pathname.match(/^\/api\/profiles\/([^\/]+)$/);
    if (method === 'GET' && profileMatch) {
        const profile = findProfile(decodeURIComponent(profileMatch[1]));
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        return { success: true, profile: { ...profile, running: !!activeProcesses[profile.id] } };
    }

    // POST /api/profiles - Create with unique name
    if (method === 'POST' && pathname === '/api/profiles') {
        let data = {};
        try { data = body ? JSON.parse(body) : {}; } catch (e) { return { status: 400, data: { success: false, error: 'Invalid JSON body' } }; }
        const id = uuidv4();
        const fingerprint = await generateFingerprint({});
        const baseName = data.name || `Profile-${Date.now()}`;
        const uniqueName = generateUniqueName(baseName);
        const newProfile = {
            id,
            name: uniqueName,
            proxyStr: data.proxyStr || '',
            tags: data.tags || [],
            fingerprint,
            createdAt: Date.now()
        };
        profiles.push(newProfile);
        await fs.writeJson(PROFILES_FILE, profiles);
        notifyUIRefresh(); // Notify UI to refresh
        return { success: true, profile: newProfile };
    }

    // PUT /api/profiles/:idOrName - Edit
    if (method === 'PUT' && profileMatch) {
        const profile = findProfile(decodeURIComponent(profileMatch[1]));
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        const idx = profiles.findIndex(p => p.id === profile.id);
        let data = {};
        try { data = body ? JSON.parse(body) : {}; } catch (e) { return { status: 400, data: { success: false, error: 'Invalid JSON body' } }; }
        // If name changed, ensure uniqueness
        if (data.name && data.name !== profile.name) {
            data.name = generateUniqueName(data.name);
        }
        profiles[idx] = { ...profiles[idx], ...data };
        await fs.writeJson(PROFILES_FILE, profiles);
        return { success: true, profile: profiles[idx] };
    }

    // DELETE /api/profiles/:idOrName
    if (method === 'DELETE' && profileMatch) {
        const profile = findProfile(decodeURIComponent(profileMatch[1]));
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        profiles = profiles.filter(p => p.id !== profile.id);
        await fs.writeJson(PROFILES_FILE, profiles);
        notifyUIRefresh(); // Notify UI to refresh
        return { success: true, message: 'Profile deleted' };
    }

    // GET /api/open/:idOrName - Launch profile
    const openMatch = pathname.match(/^\/api\/open\/([^\/]+)$/);
    if (method === 'GET' && openMatch) {
        const profile = findProfile(decodeURIComponent(openMatch[1]));
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        if (activeProcesses[profile.id]) return { success: true, message: 'Already running', profileId: profile.id };
        // Trigger launch via IPC to main window
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('api-launch-profile', profile.id);
        }
        return { success: true, message: 'Launch requested', profileId: profile.id, name: profile.name };
    }

    // POST /api/profiles/:idOrName/stop - Stop profile
    const stopMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/stop$/);
    if (method === 'POST' && stopMatch) {
        const profile = findProfile(decodeURIComponent(stopMatch[1]));
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        const proc = activeProcesses[profile.id];
        if (!proc) return { status: 404, data: { success: false, error: 'Profile not running' } };
        try { await forceKill(getProxyPid(proc)); } catch (e) { }
        try { if (proc.browser) await proc.browser.close(); } catch (e) { }
        if (proc.logFd !== undefined) {
            try { fs.closeSync(proc.logFd); } catch (e) { }
        }
        delete activeProcesses[profile.id];
        try { await autoClearSystemProxyIfEnabled(); } catch (e) { }
        return { success: true, message: 'Profile stopped' };
    }

    // GET /api/export/all?password=xxx - Export full backup
    if (method === 'GET' && pathname === '/api/export/all') {
        const password = params.get('password');
        if (!password) return { status: 400, data: { success: false, error: 'Password required. Use ?password=yourpassword' } };

        // Build backup data
        const backupData = {
            version: 1,
            createdAt: Date.now(),
            profiles: profiles.map(p => ({ ...p, fingerprint: cleanFingerprint ? cleanFingerprint(p.fingerprint) : p.fingerprint })),
            preProxies: settings.preProxies || [],
            subscriptions: settings.subscriptions || [],
            browserData: {}
        };

        // Collect browser data
        for (const profile of profiles) {
            const safeProfileId = normalizeProfileId(profile && profile.id);
            if (!safeProfileId) continue;
            const profileDataDir = path.join(DATA_PATH, safeProfileId, 'browser_data');
            if (fs.existsSync(profileDataDir)) {
                const defaultDir = path.join(profileDataDir, 'Default');
                if (fs.existsSync(defaultDir)) {
                    const browserFiles = {};
                    const filesToBackup = ['Bookmarks', 'Cookies', 'Login Data', 'Web Data', 'Preferences'];
                    for (const fileName of filesToBackup) {
                        const filePath = path.join(defaultDir, fileName);
                        if (fs.existsSync(filePath)) {
                            try {
                                const content = await fs.readFile(filePath);
                                browserFiles[fileName] = content.toString('base64');
                            } catch (err) { }
                        }
                    }
                    if (Object.keys(browserFiles).length > 0) {
                        backupData.browserData[safeProfileId] = browserFiles;
                    }
                }
            }
        }

        // Compress and encrypt
        const jsonStr = JSON.stringify(backupData);
        const compressed = await gzip(Buffer.from(jsonStr, 'utf8'));
        const encrypted = encryptData(compressed, password);

        return {
            success: true,
            data: encrypted.toString('base64'),
            filename: `GeekEZ_FullBackup_${Date.now()}.geekez`,
            profileCount: profiles.length
        };
    }

    // GET /api/export/fingerprint - Export YAML fingerprints
    if (method === 'GET' && pathname === '/api/export/fingerprint') {
        const exportData = profiles.map(p => ({
            id: p.id,
            name: p.name,
            proxyStr: p.proxyStr,
            tags: p.tags,
            fingerprint: cleanFingerprint ? cleanFingerprint(p.fingerprint) : p.fingerprint
        }));
        const yamlStr = yaml.dump(exportData, { lineWidth: -1, noRefs: true });
        return {
            success: true,
            data: yamlStr,
            filename: `GeekEZ_Profiles_${Date.now()}.yaml`,
            profileCount: profiles.length
        };
    }

    // POST /api/import - Import backup (YAML or encrypted)
    if (method === 'POST' && pathname === '/api/import') {
        try {
            const data = JSON.parse(body);
            const content = data.content;
            const password = data.password;

            if (!content) return { status: 400, data: { success: false, error: 'Content required' } };

            // Try YAML first
            try {
                const yamlData = yaml.load(content);
                if (Array.isArray(yamlData)) {
                    let imported = 0;
                    for (const item of yamlData) {
                        const name = generateUniqueName(item.name || `Imported-${Date.now()}`);
                        const newProfile = {
                            id: uuidv4(),
                            name,
                            proxyStr: item.proxyStr || '',
                            tags: item.tags || [],
                            fingerprint: item.fingerprint || await generateFingerprint({}),
                            createdAt: Date.now()
                        };
                        profiles.push(newProfile);
                        imported++;
                    }
                    await fs.writeJson(PROFILES_FILE, profiles);
                    notifyUIRefresh(); // Notify UI to refresh
                    return { success: true, message: `Imported ${imported} profiles from YAML`, count: imported };
                }
            } catch (yamlErr) { }

            // Try encrypted backup
            if (!password) return { status: 400, data: { success: false, error: 'Password required for encrypted backup' } };

            try {
                const encrypted = Buffer.from(content, 'base64');
                const decrypted = decryptData(encrypted, password);
                const decompressed = await gunzip(decrypted);
                const backupData = JSON.parse(decompressed.toString('utf8'));

                let imported = 0;
                for (const profile of backupData.profiles || []) {
                    const name = generateUniqueName(profile.name);
                    const newProfile = { ...profile, id: uuidv4(), name };
                    profiles.push(newProfile);
                    imported++;
                }
                await fs.writeJson(PROFILES_FILE, profiles);
                notifyUIRefresh(); // Notify UI to refresh
                return { success: true, message: `Imported ${imported} profiles from backup`, count: imported };
            } catch (decryptErr) {
                return { status: 400, data: { success: false, error: 'Invalid password or corrupted backup' } };
            }
        } catch (err) {
            return { status: 400, data: { success: false, error: err.message } };
        }
    }

    return { status: 404, data: { success: false, error: 'Endpoint not found' } };
}

// API Server IPC handlers
ipcMain.handle('start-api-server', async (e, { port }) => {
    if (apiServerRunning) {
        return { success: false, error: 'API server already running' };
    }
    try {
        const resolvedPort = Number(port);
        if (!Number.isInteger(resolvedPort) || resolvedPort < 1024 || resolvedPort > 65535) {
            return { success: false, error: 'Invalid port' };
        }
        apiServerToken = await ensureApiTokenInSettings();
        apiServer = createApiServer(resolvedPort);
        await new Promise((resolve, reject) => {
            apiServer.listen(resolvedPort, '127.0.0.1', () => resolve());
            apiServer.on('error', reject);
        });
        apiServerRunning = true;
        console.log(`🔌 API Server started on http://localhost:${resolvedPort}`);
        return { success: true, port: resolvedPort, token: apiServerToken };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('stop-api-server', async () => {
    if (!apiServer) return { success: true };
    return new Promise(resolve => {
        apiServer.close(() => {
            apiServer = null;
            apiServerRunning = false;
            apiServerToken = null;
            console.log('🔌 API Server stopped');
            resolve({ success: true });
        });
    });
});

ipcMain.handle('get-api-status', () => {
    return { running: apiServerRunning, tokenSet: !!apiServerToken };
});


function forceKill(pid) {
    return new Promise((resolve) => {
        if (pid === null || pid === undefined) return resolve();
        try {
            const pidNum = Number(pid);
            if (!Number.isInteger(pidNum) || pidNum <= 0) return resolve();

            if (process.platform === 'win32') {
                const p = spawn('taskkill', ['/pid', String(pidNum), '/T', '/F'], { windowsHide: true });
                p.on('error', () => resolve());
                p.on('close', () => resolve());
                return;
            }

            process.kill(pidNum, 'SIGKILL');
            resolve();
        } catch (e) { resolve(); }
    });
}

function getChromiumPath() {
    const basePath = isDev ? path.join(__dirname, 'resources', 'puppeteer') : path.join(process.resourcesPath, 'puppeteer');
    if (!fs.existsSync(basePath)) return null;
    function findFile(dir, filename) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) { const res = findFile(fullPath, filename); if (res) return res; }
                else if (file === filename) return fullPath;
            }
        } catch (e) { return null; } return null;
    }

    // macOS: Chrome binary is inside .app/Contents/MacOS/
    if (process.platform === 'darwin') {
        return findFile(basePath, 'Google Chrome for Testing');
    }
    // Windows
    return findFile(basePath, 'chrome.exe');
}

// Settings management
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return { enableRemoteDebugging: false };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        return true;
    } catch (e) {
        console.error('Failed to save settings:', e);
        return false;
    }
}

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const { pathToFileURL } = require('url');
    const indexFileUrl = pathToFileURL(path.join(__dirname, 'index.html')).toString();
    const isAllowedAppUrl = (u) => {
        if (typeof u !== 'string') return false;
        if (u === indexFileUrl) return true;
        return u.startsWith(indexFileUrl + '#') || u.startsWith(indexFileUrl + '?');
    };

    const win = new BrowserWindow({
        width: Math.round(width * 0.5), height: Math.round(height * 0.601), minWidth: 900, minHeight: 600,
        title: "GeekEZ Browser", backgroundColor: '#1e1e2d',
        icon: path.join(__dirname, 'icon.png'),
        titleBarOverlay: { color: '#1e1e2d', symbolColor: '#ffffff', height: 35 },
        titleBarStyle: 'hidden',
        webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false, webviewTag: false }
    });
    win.setMenuBarVisibility(false);

    // Prevent navigation/popup to untrusted origins (remote content would inherit our preload APIs).
    win.webContents.on('will-navigate', (event, url) => {
        if (isAllowedAppUrl(url)) return;
        event.preventDefault();
        try {
            const u = parseHttpUrlOrThrow(url);
            shell.openExternal(u.toString());
        } catch (e) { }
    });
    win.webContents.on('will-redirect', (event, url) => {
        if (isAllowedAppUrl(url)) return;
        event.preventDefault();
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
        try {
            const u = parseHttpUrlOrThrow(url);
            shell.openExternal(u.toString());
        } catch (e) { }
        return { action: 'deny' };
    });
    win.webContents.on('will-attach-webview', (event) => {
        event.preventDefault();
    });

    win.loadFile('index.html');
    mainWindow = win; // Store global reference for API
    return win;
}

// Helper to notify UI to refresh profiles
function notifyUIRefresh() {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('refresh-profiles');
    }
}

function getDefaultSystemProxyBypassList() {
    return ['<local>', 'localhost', '127.0.0.1', '::1'];
}

async function applySystemProxyMode({ enable, endpoint }) {
    if (process.platform !== 'win32') {
        const err = new Error('System proxy mode currently supported on Windows only');
        err.code = 'SYSTEM_PROXY_UNSUPPORTED_PLATFORM';
        throw err;
    }
    const { setSystemProxySocks, clearSystemProxy } = require('./proxy/systemProxyWin');
    if (!enable) return clearSystemProxy();
    return setSystemProxySocks({ endpoint, bypassList: getDefaultSystemProxyBypassList() });
}

async function autoApplySystemProxyForRunningProfile({ profileId, localPort }) {
    try {
        const settings = await fs.readJson(SETTINGS_FILE).catch(() => ({}));
        if (!settings.enableSystemProxy) return;
        if (!localPort) return;
        await applySystemProxyMode({ enable: true, endpoint: `127.0.0.1:${localPort}` });
    } catch (e) { }
}

async function autoClearSystemProxyIfEnabled() {
    try {
        const settings = await fs.readJson(SETTINGS_FILE).catch(() => ({}));
        if (!settings.enableSystemProxy) return;
        await applySystemProxyMode({ enable: false });
    } catch (e) { }
}

async function generateExtension(profilePath, fingerprint, profileName, watermarkStyle) {
    const extDir = path.join(profilePath, 'extension');
    await fs.ensureDir(extDir);
    const manifest = {
        manifest_version: 3,
        name: "GeekEZ Guard",
        version: "1.0.0",
        description: "Privacy Protection",
        content_scripts: [{ matches: ["<all_urls>"], js: ["content.js"], run_at: "document_start", all_frames: true, world: "MAIN" }]
    };
    const style = watermarkStyle || 'enhanced'; // 默认使用增强水印
    const scriptContent = getInjectScript(fingerprint, profileName, style);
    await fs.writeJson(path.join(extDir, 'manifest.json'), manifest);
    await fs.writeFile(path.join(extDir, 'content.js'), scriptContent);
    return extDir;
}

app.whenReady().then(async () => {
    try {
        // UI window should not need any runtime permissions; deny by default.
        session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(false));
    } catch (e) { }
    createWindow();
    setTimeout(() => { fs.emptyDir(TRASH_PATH).catch(() => { }); }, 10000);
});

// IPC Handles
ipcMain.handle('get-app-info', () => { return { name: app.getName(), version: app.getVersion() }; });
function parseHttpUrlOrThrow(url) {
    if (typeof url !== 'string' || !url.trim()) throw new Error('Invalid URL');
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('Only http/https URLs are allowed');
    }
    return u;
}

const FETCH_MAX_TEXT_BYTES = 10 * 1024 * 1024; // 10MB

async function readResponseTextWithLimit(res, maxBytes) {
    const len = res && res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-length') : null;
    if (len && Number(len) > maxBytes) {
        throw new Error(`Response too large (>${maxBytes} bytes)`);
    }

    if (!res || !res.body) return '';

    // undici/web streams
    if (typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let received = 0;
        let text = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            if (received > maxBytes) {
                try { await reader.cancel(); } catch (e) { }
                throw new Error(`Response too large (>${maxBytes} bytes)`);
            }
            text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
        return text;
    }

    // node streams (fallback)
    if (typeof res.body[Symbol.asyncIterator] === 'function') {
        const decoder = new TextDecoder('utf-8');
        let received = 0;
        let text = '';
        for await (const chunk of res.body) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            received += buf.length;
            if (received > maxBytes) throw new Error(`Response too large (>${maxBytes} bytes)`);
            text += decoder.decode(buf, { stream: true });
        }
        text += decoder.decode();
        return text;
    }

    const text = await res.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
        throw new Error(`Response too large (>${maxBytes} bytes)`);
    }
    return text;
}

ipcMain.handle('fetch-url', async (e, url) => {
    try {
        const u = parseHttpUrlOrThrow(url);
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 20_000);
        try {
            const res = await fetch(u.toString(), { signal: ac.signal });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await readResponseTextWithLimit(res, FETCH_MAX_TEXT_BYTES);
        } finally {
            clearTimeout(timer);
        }
    } catch (e) {
        throw (e && e.message) ? e.message : String(e);
    }
});
ipcMain.handle('fetch-url-conditional', async (e, { url, etag, lastModified }) => {
    try {
        const u = parseHttpUrlOrThrow(url);
        const headers = {};
        if (etag) headers['If-None-Match'] = String(etag);
        if (lastModified) headers['If-Modified-Since'] = String(lastModified);
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 20_000);
        try {
            const res = await fetch(u.toString(), { headers, signal: ac.signal });
            if (res.status === 304) {
                return { notModified: true };
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const text = await readResponseTextWithLimit(res, FETCH_MAX_TEXT_BYTES);
            const newEtag = res.headers.get('etag');
            const newLastModified = res.headers.get('last-modified');
            return { notModified: false, content: text, etag: newEtag, lastModified: newLastModified };
        } finally {
            clearTimeout(timer);
        }
    } catch (err) {
        return { notModified: false, error: err && err.message ? err.message : String(err) };
    }
});
ipcMain.handle('parse-subscription', async (e, { content, hintType }) => {
    try {
        const { parseSubscriptionContent } = require('./proxy/subscription');
        return parseSubscriptionContent(content, hintType || 'auto');
    } catch (err) {
        return { detectedType: 'unknown', decoded: String(content || ''), nodes: [], stats: { totalLines: 0, totalNodes: 0, skippedLines: 0, decodeAttempted: false }, errors: [err && err.message ? err.message : String(err)] };
    }
});
ipcMain.handle('test-proxy-latency', async (e, proxyStr) => {
    const tempPort = await getPort(); const tempConfigPath = path.join(app.getPath('userData'), `test_config_${tempPort}.json`);
    try {
        let outbound; try { const { parseProxyLink } = require('./utils'); outbound = parseProxyLink(proxyStr, "proxy_test"); } catch (err) { return { success: false, msg: "Format Err" }; }
        const config = { log: { loglevel: "none" }, inbounds: [{ port: tempPort, listen: "127.0.0.1", protocol: "socks", settings: { udp: true } }], outbounds: [outbound, { protocol: "freedom", tag: "direct" }], routing: { rules: [{ type: "field", outboundTag: "proxy_test", port: "0-65535" }] } };
        await fs.writeJson(tempConfigPath, config);
        const xrayProcess = spawn(BIN_PATH, ['-c', tempConfigPath], { cwd: BIN_DIR, env: { ...process.env, 'XRAY_LOCATION_ASSET': RESOURCES_BIN }, stdio: 'ignore', windowsHide: true });
        await new Promise(r => setTimeout(r, 800));
        const start = Date.now(); const agent = new SocksProxyAgent(`socks5://127.0.0.1:${tempPort}`);
        const result = await new Promise((resolve) => {
            const req = http.get('http://cp.cloudflare.com/generate_204', { agent, timeout: 5000 }, (res) => {
                const latency = Date.now() - start; if (res.statusCode === 204) resolve({ success: true, latency }); else resolve({ success: false, msg: `HTTP ${res.statusCode}` });
            });
            req.on('error', () => resolve({ success: false, msg: "Err" })); req.on('timeout', () => { req.destroy(); resolve({ success: false, msg: "Timeout" }); });
        });
        await forceKill(xrayProcess.pid); try { fs.unlinkSync(tempConfigPath); } catch (e) { } return result;
    } catch (err) { return { success: false, msg: err.message }; }
});

ipcMain.handle('test-proxy-node', async (e, proxyStr) => {
    return await testProxyNodeInternal(proxyStr, 'auto');
});

const DEBUG_PROXY_TEST = (process.env.GEEKEZ_DEBUG_PROXY_TEST === '1') || (isDev && process.env.GEEKEZ_DEBUG_PROXY_TEST !== '0');
const DEBUG_PROXY_TEST_KEEP_CONFIG = (process.env.GEEKEZ_DEBUG_PROXY_TEST_KEEP_CONFIG === '1');

function redactProxyForLog(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    if (s.startsWith('sb://')) return `sb://<payload len=${Math.max(0, s.length - 5)}>`;
    if (s.startsWith('vmess://')) return `vmess://<payload len=${Math.max(0, s.length - 8)}>`;

    // Mask URL userinfo passwords (scheme://user:pass@host:port)
    try {
        const u = new URL(s);
        if (u.username || u.password) {
            const user = u.username ? (u.username.length > 28 ? `${u.username.slice(0, 6)}…` : u.username) : '';
            const auth = user ? `${user}:${u.password ? '***' : ''}@` : '***@';
            return `${u.protocol}//${auth}${u.host}${u.pathname || ''}${u.search || ''}${u.hash || ''}`;
        }
    } catch (e) { }

    // Mask non-URL forms like scheme://host:port:user:pass
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s) && !s.includes('@') && s.includes(':')) {
        const schemeEnd = s.indexOf('://') + 3;
        const rest = s.slice(schemeEnd);
        const parts = rest.split(':');
        if (parts.length >= 4) {
            const host = parts[0];
            const port = parts[1];
            return `${s.slice(0, schemeEnd)}${host}:${port}:***:***`;
        }
    }

    return s;
}

function proxyTestLog(traceId, message, data) {
    if (!DEBUG_PROXY_TEST) return;
    const prefix = traceId ? `[proxy-test ${traceId}]` : '[proxy-test]';
    if (data === undefined) return console.log(prefix, message);
    try {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        console.log(prefix, message, payload);
    } catch (e) {
        console.log(prefix, message, data);
    }
}

function inferProxyTestEngine(proxyStr) {
    const s = String(proxyStr || '').trim().toLowerCase();
    if (s.startsWith('sb://')) return 'sing-box';
    if (
        s.startsWith('hysteria://') ||
        s.startsWith('hy://') ||
        s.startsWith('hysteria2://') ||
        s.startsWith('hy2://') ||
        s.startsWith('tuic://') ||
        s.startsWith('shadowtls://') ||
        s.startsWith('shadow-tls://') ||
        s.startsWith('wireguard://') ||
        s.startsWith('wg://')
    ) return 'sing-box';
    if (s.startsWith('ss://') && /[?&]plugin=/i.test(s)) return 'sing-box';
    return 'xray';
}

function wireProcessIoToConsole(proc, { traceId, engine }) {
    if (!DEBUG_PROXY_TEST) return;
    if (!proc) return;
    const tag = engine ? String(engine) : 'proc';
    const pump = (stream, kind) => {
        if (!stream || typeof stream.on !== 'function') return;
        let buf = '';
        stream.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            buf += text;
            const lines = buf.split(/\r?\n/);
            buf = lines.pop() || '';
            lines.filter(Boolean).forEach((line) => console.log(`[proxy-test ${traceId} ${tag} ${kind}]`, line));
        });
    };
    pump(proc.stdout, 'stdout');
    pump(proc.stderr, 'stderr');
    proc.on('exit', (code, signal) => {
        console.log(`[proxy-test ${traceId} ${tag}]`, `exit code=${code} signal=${signal || '-'}`);
    });
}

async function startProxyProcessForTest({ engine, proxyStr, localPort, configPath, traceId }) {
    if (engine === 'xray') {
        const { parseProxyLink } = require('./utils');
        const outbound = parseProxyLink(proxyStr, "proxy_test");
        const config = {
            log: { loglevel: DEBUG_PROXY_TEST ? "warning" : "none" },
            inbounds: [{ port: localPort, listen: "127.0.0.1", protocol: "socks", settings: { udp: true } }],
            outbounds: [outbound, { protocol: "freedom", tag: "direct" }],
            routing: { rules: [{ type: "field", outboundTag: "proxy_test", port: "0-65535" }] }
        };
        await fs.writeJson(configPath, config);
        const stdio = DEBUG_PROXY_TEST ? ['ignore', 'pipe', 'pipe'] : 'ignore';
        const xrayProcess = spawn(BIN_PATH, ['-c', configPath], { cwd: BIN_DIR, env: { ...process.env, 'XRAY_LOCATION_ASSET': RESOURCES_BIN }, stdio, windowsHide: true });
        wireProcessIoToConsole(xrayProcess, { traceId, engine: 'xray' });
        return { engine: 'xray', process: xrayProcess };
    }

    if (engine === 'sing-box') {
        if (!fs.existsSync(SINGBOX_PATH)) {
            const err = new Error('sing-box binary not found');
            err.code = 'SINGBOX_BINARY_MISSING';
            throw err;
        }
        const spec = normalizeProxySpec(proxyStr);
        const sbConfig = buildSingboxConfigFromProxySpec(spec, localPort);
        try {
            if (DEBUG_PROXY_TEST) {
                sbConfig.log = sbConfig.log && typeof sbConfig.log === 'object' ? sbConfig.log : {};
                sbConfig.log.level = 'info';
            }
        } catch (e) { }
        await fs.writeJson(configPath, sbConfig);
        const stdio = DEBUG_PROXY_TEST ? ['ignore', 'pipe', 'pipe'] : 'ignore';
        const sbProcess = spawn(SINGBOX_PATH, ['run', '-c', configPath], { cwd: BIN_DIR, env: singboxEnvForConfig(sbConfig), stdio, windowsHide: true });
        wireProcessIoToConsole(sbProcess, { traceId, engine: 'sing-box' });
        return { engine: 'sing-box', process: sbProcess };
    }

    throw new Error(`Unsupported test engine: ${engine}`);
}

async function testProxyNodeInternal(proxyStr, engineHint = 'auto') {
    const tempPort = await getPort();
    const tempConfigPath = path.join(app.getPath('userData'), `test_config_${tempPort}.json`);
    const startedAt = Date.now();
    let proxyProcess = null;
    let lastErr = null;
    const normalizedProxyStr = normalizeProxyInputRaw(proxyStr);
    const traceId = crypto.createHash('sha1').update(String(normalizedProxyStr || '')).digest('hex').slice(0, 8);
    if (!normalizedProxyStr) {
        return { success: false, ok: false, startedAt, durationMs: Date.now() - startedAt, error: 'Proxy input is empty', code: 'PROXY_TEST_EMPTY' };
    }
    const primary = engineHint && engineHint !== 'auto' ? engineHint : inferProxyTestEngine(normalizedProxyStr);
    const engines = primary === 'sing-box' ? ['sing-box', 'xray'] : ['xray', 'sing-box'];

    proxyTestLog(traceId, 'start', {
        hint: engineHint,
        primary,
        engines,
        localPort: tempPort,
        proxy: redactProxyForLog(normalizedProxyStr),
    });

    try {
        for (const engine of engines) {
            try {
                proxyTestLog(traceId, `engine=${engine} start`, { configPath: tempConfigPath });
                const started = await startProxyProcessForTest({ engine, proxyStr: normalizedProxyStr, localPort: tempPort, configPath: tempConfigPath, traceId });
                proxyProcess = started && started.process ? started.process : null;
                const resolvedEngine = started && started.engine ? started.engine : engine;
                proxyTestLog(traceId, `engine=${resolvedEngine} spawned`, { pid: proxyProcess && proxyProcess.pid ? proxyProcess.pid : null });

                await new Promise(r => setTimeout(r, 800));
                if (proxyProcess && proxyProcess.exitCode !== null) {
                    const err = new Error(`Proxy engine exited early (engine=${resolvedEngine}, exitCode=${proxyProcess.exitCode})`);
                    err.code = 'PROXY_ENGINE_EXITED_EARLY';
                    throw err;
                }

                const agent = new SocksProxyAgent(`socks5://127.0.0.1:${tempPort}`);

                const latencyStart = Date.now();
                const connectivity = await new Promise((resolve) => {
                    const req = http.get('http://cp.cloudflare.com/generate_204', { agent, timeout: 7000 }, (res) => {
                        const latencyMs = Date.now() - latencyStart;
                        if (res.statusCode === 204) resolve({ ok: true, latencyMs });
                        else resolve({ ok: false, latencyMs, error: `HTTP ${res.statusCode}` });
                    });
                    req.on('error', (err) => resolve({ ok: false, latencyMs: Date.now() - latencyStart, error: err.message }));
                    req.on('timeout', () => { req.destroy(); resolve({ ok: false, latencyMs: Date.now() - latencyStart, error: "Timeout" }); });
                });
                proxyTestLog(traceId, `engine=${resolvedEngine} connectivity`, connectivity);

                const { probePublicIp, probeGeo } = require('./proxy/test');
                let publicIp = null;
                let geo = null;
                try { publicIp = await probePublicIp(8000, agent); } catch (e) { }
                try { geo = await probeGeo(8000, agent); } catch (e) { }

                const ip = (geo && geo.ip) ? geo.ip : publicIp;
                const geoOut = geo ? {
                    country: geo.country, region: geo.region, city: geo.city,
                    asn: geo.asn, isp: geo.isp, timezone: geo.timezone,
                    latitude: geo.latitude, longitude: geo.longitude,
                } : null;

                const ok = Boolean(connectivity.ok);
                proxyTestLog(traceId, `engine=${resolvedEngine} done`, { ok, ip, geo: geoOut || null });
                return { success: ok, ok, engine: resolvedEngine, startedAt, durationMs: Date.now() - startedAt, connectivity, ip, geo: geoOut };
            } catch (err) {
                lastErr = err;
                proxyTestLog(traceId, `engine=${engine} failed`, {
                    code: err && err.code ? String(err.code) : '',
                    message: err && err.message ? err.message : String(err),
                    input: err && err.input ? redactProxyForLog(err.input) : undefined,
                });
            } finally {
                try { if (proxyProcess && proxyProcess.pid) await forceKill(proxyProcess.pid); } catch (e) { }
                proxyProcess = null;
                try {
                    if (!DEBUG_PROXY_TEST_KEEP_CONFIG && fs.existsSync(tempConfigPath)) fs.unlinkSync(tempConfigPath);
                    else if (DEBUG_PROXY_TEST_KEEP_CONFIG) proxyTestLog(traceId, 'keep config', { path: tempConfigPath });
                } catch (e) { }
            }
        }

        const msg = lastErr && lastErr.message ? lastErr.message : "Format Err";
        const code = lastErr && lastErr.code ? String(lastErr.code) : "PROXY_TEST_FORMAT_ERR";
        return { success: false, ok: false, startedAt, durationMs: Date.now() - startedAt, error: msg, code };
    } finally {
        try { if (fs.existsSync(tempConfigPath)) fs.unlinkSync(tempConfigPath); } catch (e) { }
    }
}

async function applyCdpOverridesToPage(page, fingerprint) {
    const fp = normalizeFingerprintSpec(fingerprint);
    const cdp = fp.cdp || {};
    const session = await page.target().createCDPSession();

    // Enable relevant domains (safe no-ops if already enabled)
    try { await session.send('Network.enable'); } catch (e) { }
    try { await session.send('Emulation.clearGeolocationOverride'); } catch (e) { }

    // Timezone
    if (cdp.timezoneId && cdp.timezoneId !== 'Auto') {
        try { await session.send('Emulation.setTimezoneOverride', { timezoneId: cdp.timezoneId }); } catch (e) { }
    }

    // Locale / Accept-Language exposure via CDP
    if (cdp.locale && cdp.locale !== 'auto') {
        try { await session.send('Emulation.setLocaleOverride', { locale: cdp.locale }); } catch (e) { }
    }

    // Geolocation
    if (cdp.geolocation && typeof cdp.geolocation === 'object') {
        const { latitude, longitude, accuracy } = cdp.geolocation;
        if (typeof latitude === 'number' && typeof longitude === 'number') {
            try {
                await session.send('Emulation.setGeolocationOverride', {
                    latitude,
                    longitude,
                    accuracy: typeof accuracy === 'number' ? accuracy : 100
                });
            } catch (e) { }
        }
    }

    // UA + UA-CH metadata (+ Accept-Language header)
    if (cdp.userAgent || cdp.userAgentMetadata || cdp.locale) {
        const payload = {};
        if (cdp.userAgent) payload.userAgent = cdp.userAgent;
        if (cdp.userAgentMetadata) payload.userAgentMetadata = cdp.userAgentMetadata;
        if (cdp.locale) payload.acceptLanguage = cdp.locale;
        try { await session.send('Network.setUserAgentOverride', payload); } catch (e) { }
    }

    return session;
}

function getXrayReleaseAssetName() {
    const arch = os.arch();
    const platform = os.platform();
    const isArm64 = arch === 'arm64';

    if (platform === 'win32') {
        if (isArm64) return 'Xray-windows-arm64-v8a.zip';
        return `Xray-windows-${arch === 'x64' ? '64' : '32'}.zip`;
    }

    if (platform === 'darwin') {
        return `Xray-macos-${isArm64 ? 'arm64-v8a' : '64'}.zip`;
    }

    if (platform === 'linux') {
        if (isArm64) return 'Xray-linux-arm64-v8a.zip';
        return `Xray-linux-${arch === 'x64' ? '64' : '32'}.zip`;
    }

    // Fallback: keep previous behavior for unknown platforms
    if (isArm64) return `Xray-${platform}-arm64-v8a.zip`;
    return `Xray-${platform}-${arch === 'x64' ? '64' : '32'}.zip`;
}

function buildXrayReleaseDownloadUrls(remoteVer, assetName) {
    const direct = `https://github.com/XTLS/Xray-core/releases/download/${remoteVer}/${assetName}`;
    const proxy = `https://gh-proxy.com/${direct}`;
    return { direct, proxy };
}

function parseXrayReleaseTagFromUrl(inputUrl, assetName) {
    if (typeof inputUrl !== 'string' || !inputUrl.trim() || typeof assetName !== 'string' || !assetName) return null;
    try {
        const original = new URL(inputUrl.trim());
        let target = original;
        if (original.hostname === 'gh-proxy.com') {
            const raw = String(original.pathname || '').replace(/^\/+/, '');
            const decoded = decodeURIComponent(raw);
            if (!decoded.startsWith('https://')) return null;
            target = new URL(decoded);
        }
        if (target.protocol !== 'https:' || target.hostname !== 'github.com') return null;
        const m = String(target.pathname || '').match(/^\/XTLS\/Xray-core\/releases\/download\/(v\d+\.\d+\.\d+)\/([^/]+)$/);
        if (!m) return null;
        const tag = m[1];
        const file = m[2];
        if (file !== assetName) return null;
        return tag;
    } catch (e) {
        return null;
    }
}

function parseSha256FromDgstText(text) {
    if (typeof text !== 'string') return null;
    const m = text.match(/SHA2-256=\s*([a-f0-9]{64})/i);
    return m ? m[1].toLowerCase() : null;
}

function getXrayVersionFromBinary(binaryPath) {
    return new Promise((resolve) => {
        if (!binaryPath) return resolve('v0.0.0');
        try {
            const proc = spawn(binaryPath, ['-version'], { windowsHide: true });
            let output = '';
            proc.stdout.on('data', d => output += d.toString());
            proc.stderr.on('data', d => output += d.toString());
            const timer = setTimeout(() => {
                try { proc.kill(); } catch (e) { }
                resolve('v0.0.0');
            }, 8000);
            proc.on('close', () => {
                try { clearTimeout(timer); } catch (e) { }
                const match = output.match(/Xray\s+v?(\d+\.\d+\.\d+)/i);
                resolve(match ? `v${match[1]}` : 'v0.0.0');
            });
            proc.on('error', () => {
                try { clearTimeout(timer); } catch (e) { }
                resolve('v0.0.0');
            });
        } catch (e) {
            resolve('v0.0.0');
        }
    });
}
ipcMain.handle('set-title-bar-color', (e, colors) => { const win = BrowserWindow.fromWebContents(e.sender); if (win) { if (process.platform === 'win32') try { win.setTitleBarOverlay({ color: colors.bg, symbolColor: colors.symbol }); } catch (e) { } win.setBackgroundColor(colors.bg); } });
ipcMain.handle('check-app-update', async () => { try { const data = await fetchJson('https://api.github.com/repos/EchoHS/GeekezBrowser/releases/latest'); if (!data || !data.tag_name) return { update: false }; const remote = data.tag_name.replace('v', ''); if (compareVersions(remote, app.getVersion()) > 0) { return { update: true, remote, url: 'https://browser.geekez.net/#downloads' }; } return { update: false }; } catch (e) { return { update: false, error: e.message }; } });
ipcMain.handle('check-xray-update', async () => {
    try {
        const data = await fetchJson('https://api.github.com/repos/XTLS/Xray-core/releases/latest');
        if (!data || !data.tag_name) return { update: false };

        const remoteVer = data.tag_name;
        const currentVer = await getLocalXrayVersion();
        if (remoteVer === currentVer) return { update: false };

        const assetName = getXrayReleaseAssetName();
        const { proxy } = buildXrayReleaseDownloadUrls(remoteVer, assetName);
        return { update: true, remote: remoteVer.replace(/^v/, ''), downloadUrl: proxy };
    } catch (e) {
        return { update: false };
    }
});
ipcMain.handle('download-xray-update', async (e, url) => {
    const exeName = process.platform === 'win32' ? 'xray.exe' : 'xray';
    const tempBase = os.tmpdir();
    const updateId = `xray_update_${Date.now()}`;
    const tempDir = path.join(tempBase, updateId);
    const zipPath = path.join(tempDir, 'xray.zip');
    try {
        // Do not trust renderer-provided URLs. Only allow the latest official XTLS/Xray-core asset for this platform.
        const assetName = getXrayReleaseAssetName();
        let remoteVer = null;
        let useDirect = false;
        try {
            const data = await fetchJson('https://api.github.com/repos/XTLS/Xray-core/releases/latest');
            if (data && data.tag_name) remoteVer = data.tag_name;
        } catch (e) { }

        const inputUrl = (typeof url === 'string') ? url.trim() : '';
        if (remoteVer) {
            const { direct, proxy } = buildXrayReleaseDownloadUrls(remoteVer, assetName);
            // Ignore untrusted renderer URLs. Optionally honor "direct" when it exactly matches.
            useDirect = inputUrl === direct;
            url = useDirect ? direct : proxy;
        } else {
            // Fallback: derive release tag from the URL so we can still verify sha256 even when GitHub API is unavailable.
            if (!inputUrl) throw new Error('Missing Xray download URL');
            const derived = parseXrayReleaseTagFromUrl(inputUrl, assetName);
            if (!derived) throw new Error('Invalid Xray download URL');
            remoteVer = derived;
            try {
                const u = new URL(inputUrl);
                useDirect = u.hostname === 'github.com';
            } catch (e) {
                useDirect = false;
            }
            url = inputUrl;
        }

        fs.mkdirSync(tempDir, { recursive: true });
        await downloadFile(url, zipPath);
        if (!fs.existsSync(zipPath)) throw new Error('Download failed: file not found');
        const zipStat = fs.statSync(zipPath);
        if (zipStat.size <= 0) throw new Error('Download failed: empty file');
        if (!isZipFileHeader(zipPath)) throw new Error('Downloaded file is not a zip');
        const zipSha = sha256FileHex(zipPath);
        if (!zipSha || zipSha.length !== 64) throw new Error('Failed to compute zip sha256');

        // Download and verify upstream sha256 digest (required).
        if (!remoteVer) throw new Error('Failed to determine Xray version for verification');
        const dgstPath = path.join(tempDir, 'xray.zip.dgst');
        const { direct: dgstDirect, proxy: dgstProxy } = buildXrayReleaseDownloadUrls(remoteVer, `${assetName}.dgst`);
        await downloadFile(useDirect ? dgstDirect : dgstProxy, dgstPath, { maxBytes: 1024 * 1024 });
        const dgstText = fs.readFileSync(dgstPath, 'utf8');
        const expectedSha = parseSha256FromDgstText(dgstText);
        if (!expectedSha) throw new Error('Failed to parse upstream zip sha256 digest');
        if (zipSha.toLowerCase() !== expectedSha) throw new Error('Downloaded zip sha256 mismatch');

        console.log('[Update] Downloaded zip sha256:', zipSha.slice(0, 16) + '…');
        if (process.platform === 'win32') await new Promise((resolve) => {
            try {
                const p = spawn('taskkill', ['/F', '/IM', 'xray.exe'], { windowsHide: true });
                p.on('error', () => resolve());
                p.on('close', () => resolve());
            } catch (e) { resolve(); }
        });
        activeProcesses = {};
        await new Promise(r => setTimeout(r, 3000));
        const extractDir = path.join(tempDir, 'extracted');
        fs.mkdirSync(extractDir, { recursive: true });
        await extractZip(zipPath, extractDir);
        function findXrayBinary(dir) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    const found = findXrayBinary(fullPath);
                    if (found) return found;
                } else if (file === exeName) {
                    return fullPath;
                }
            }
            return null;
        }
        const xrayBinary = findXrayBinary(extractDir);
        console.log('[Update Debug] Searched in:', extractDir);
        console.log('[Update Debug] Found binary:', xrayBinary);
        if (!xrayBinary) {
            // 列出所有文件帮助调试
            const allFiles = [];
            function listAllFiles(dir, prefix = '') {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        allFiles.push(prefix + file + '/');
                        listAllFiles(fullPath, prefix + file + '/');
                    } else {
                        allFiles.push(prefix + file);
                    }
                });
            }
            listAllFiles(extractDir);
            console.log('[Update Debug] All extracted files:', allFiles);
            throw new Error('Xray binary not found in package');
        }

        // Basic sanity check for extracted binary (size + magic header)
        try {
            const st = fs.statSync(xrayBinary);
            if (!st.isFile()) throw new Error('Xray binary is not a file');
            if (st.size < 512 * 1024) throw new Error(`Xray binary too small: ${st.size}`);
            if (st.size > 120 * 1024 * 1024) throw new Error(`Xray binary too large: ${st.size}`);

            const fd = fs.openSync(xrayBinary, 'r');
            const head = Buffer.alloc(4);
            fs.readSync(fd, head, 0, 4, 0);
            fs.closeSync(fd);
            if (process.platform === 'win32') {
                if (!(head[0] === 0x4d && head[1] === 0x5a)) throw new Error('Xray binary magic mismatch (expected MZ)');
            } else if (process.platform === 'linux') {
                if (!(head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46)) throw new Error('Xray binary magic mismatch (expected ELF)');
            } else if (process.platform === 'darwin') {
                // Mach-O / Fat magic values
                const m = head.readUInt32BE(0);
                const ok = new Set([0xfeedface, 0xfeedfacf, 0xcafebabe, 0xbebafeca, 0xcefaedfe, 0xcffaedfe]);
                if (!ok.has(m)) throw new Error('Xray binary magic mismatch (expected Mach-O)');
            }
        } catch (e) {
            throw e;
        }

        // Extra validation: ensure the extracted binary reports the expected version (prevents downgrade/hijack).
        if (process.platform !== 'win32') {
            try { fs.chmodSync(xrayBinary, '755'); } catch (e) { }
        }
        if (remoteVer) {
            const extractedVer = await getXrayVersionFromBinary(xrayBinary);
            if (extractedVer !== remoteVer) {
                throw new Error(`Xray version mismatch: expected ${remoteVer}, got ${extractedVer}`);
            }
        }

        // Windows文件锁规避：先重命名旧文件，再复制新文件
        const oldPath = BIN_PATH + '.old';
        if (fs.existsSync(BIN_PATH)) {
            try {
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) { }
            fs.renameSync(BIN_PATH, oldPath);
        }
        fs.copyFileSync(xrayBinary, BIN_PATH);
        // 删除旧文件
        try {
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) { }
        if (process.platform !== 'win32') fs.chmodSync(BIN_PATH, '755');
        // 清理临时目录（即使失败也不影响更新）
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            console.warn('[Cleanup Warning] Failed to remove temp dir:', cleanupErr.message);
        }
        return true;
    } catch (e) {
        console.error('Xray update failed:', e);
        try {
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) { }
        return false;
    }
});
ipcMain.handle('get-running-ids', () => Object.keys(activeProcesses));

ipcMain.handle('open-path', async (event, targetPath) => {
    try {
        if (typeof targetPath !== 'string' || !targetPath.trim()) return { success: false, error: 'No path provided' };
        const p = targetPath.trim();
        if (!path.isAbsolute(p)) return { success: false, error: 'Path must be absolute' };
        const result = await shell.openPath(p);
        if (result) return { success: false, error: result };
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-profile-log-path', async (event, id) => {
    try {
        if (!id) return null;
        const resolved = resolveProfileDirOrThrow(id);
        id = resolved.id;
        const profileDir = resolved.profileDir;
        const engine = activeProcesses[id] ? activeProcesses[id].proxyEngine : (await (async () => {
            try {
                const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
                const p = profiles.find(x => x.id === id);
                return p ? (p.proxyEngine || (p.fingerprint && p.fingerprint.proxyEngine) || 'xray') : 'xray';
            } catch (e) { return 'xray'; }
        })());
        if (engine === 'sing-box') return path.join(profileDir, 'singbox_run.log');
        return path.join(profileDir, 'xray_run.log');
    } catch (e) {
        return null;
    }
});

ipcMain.handle('clear-profile-logs', async (event, id, clearHistory = false) => {
    try {
        if (!id) return { success: false, error: 'Missing id' };
        const resolved = resolveProfileDirOrThrow(id);
        id = resolved.id;
        const profileDir = resolved.profileDir;
        const xrayLog = path.join(profileDir, 'xray_run.log');
        const sbLog = path.join(profileDir, 'singbox_run.log');
        // Remove current logs
        try { if (fs.existsSync(xrayLog)) await fs.remove(xrayLog); } catch (e) { }
        try { if (fs.existsSync(sbLog)) await fs.remove(sbLog); } catch (e) { }

        if (clearHistory) {
            // Remove rotated logs too: xray_run.<timestamp>.log / singbox_run.<timestamp>.log
            try {
                const files = fs.existsSync(profileDir) ? await fs.readdir(profileDir) : [];
                for (const f of files) {
                    if (/^(xray_run|singbox_run)\..+\.log$/i.test(f)) {
                        try { await fs.remove(path.join(profileDir, f)); } catch (e) { }
                    }
                }
            } catch (e) { }
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-profile-log-sizes', async (event, id) => {
    try {
        if (!id) return { success: false, error: 'Missing id' };
        const resolved = resolveProfileDirOrThrow(id);
        id = resolved.id;
        const profileDir = resolved.profileDir;
        const xrayLog = path.join(profileDir, 'xray_run.log');
        const sbLog = path.join(profileDir, 'singbox_run.log');
        const statIf = async (p) => {
            try { return fs.existsSync(p) ? (await fs.stat(p)).size : 0; } catch (e) { return 0; }
        };
        return { success: true, xray: await statIf(xrayLog), singbox: await statIf(sbLog) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('list-profile-rotated-logs', async (event, id) => {
    try {
        if (!id) return { success: false, error: 'Missing id', files: [] };
        const resolved = resolveProfileDirOrThrow(id);
        id = resolved.id;
        const profileDir = resolved.profileDir;
        if (!fs.existsSync(profileDir)) return { success: true, files: [] };
        const files = await fs.readdir(profileDir);
        const rotated = [];
        for (const f of files) {
            if (/^(xray_run|singbox_run)\..+\.log$/i.test(f)) {
                try {
                    const full = path.join(profileDir, f);
                    const st = await fs.stat(full);
                    rotated.push({ name: f, path: full, size: st.size, mtimeMs: st.mtimeMs });
                } catch (e) { }
            }
        }
        rotated.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
        return { success: true, files: rotated };
    } catch (e) {
        return { success: false, error: e.message, files: [] };
    }
});

ipcMain.handle('delete-profile-rotated-log', async (event, id, filename) => {
    try {
        if (!id) return { success: false, error: 'Missing id' };
        if (!filename) return { success: false, error: 'Missing filename' };
        const resolved = resolveProfileDirOrThrow(id);
        id = resolved.id;
        const profileDir = resolved.profileDir;
        if (!fs.existsSync(profileDir)) return { success: false, error: 'Profile dir not found' };
        // Only allow deleting rotated logs matching our pattern within the profile dir.
        if (!/^(xray_run|singbox_run)\..+\.log$/i.test(filename)) return { success: false, error: 'Invalid filename' };
        if (path.basename(filename) !== filename) return { success: false, error: 'Invalid filename' };
        const full = path.join(profileDir, filename);
        // Prevent path traversal
        if (path.dirname(full) !== profileDir) return { success: false, error: 'Invalid path' };
        if (fs.existsSync(full)) await fs.remove(full);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('run-leak-check', async (event, profileId) => {
    const safeId = normalizeProfileId(profileId);
    if (!safeId) return { success: false, error: 'Invalid profile id' };
    profileId = safeId;
    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return { success: false, error: 'Profile not found' };

    const proc = activeProcesses[profileId];
    if (!proc || !proc.browser) {
        return { success: false, error: 'Profile not running', code: 'LEAKCHECK_PROFILE_NOT_RUNNING' };
    }

    try {
        const { runLeakCheck } = require('./leakcheck/runLeakCheck');
        const pageProvider = {
            getPage: async () => {
                const pages = await proc.browser.pages();
                if (pages && pages.length > 0) return pages[0];
                return await proc.browser.newPage();
            }
        };

        const leakLogsDir = isDev ? path.join(process.cwd(), 'logs') : path.join(DATA_PATH, 'logs');
        const result = await runLeakCheck(profile, {
            logsDir: leakLogsDir,
            proxyMode: (proc && proc.proxyMode === 'tun') || (profile && profile.proxyMode === 'tun') ? 'tun' : 'app_proxy',
            probes: [
                require('./leakcheck/probes/ip'),
                require('./leakcheck/probes/headers'),
                require('./leakcheck/probes/ipv6'),
                require('./leakcheck/probes/webrtc')
            ],
            pageProvider
        });

        try {
            profile.diagnostics = profile.diagnostics || {};
            profile.diagnostics.lastLeakReport = {
                path: result.reportPath,
                createdAt: new Date().toISOString(),
                summary: result.summary
            };
            await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
        } catch (e) { }

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('leak-check-finished', { id: profileId, ...result });
        }

        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message, code: e.code || 'LEAKCHECK_INTERNAL_ERROR' };
    }
});
ipcMain.handle('get-profiles', async () => { if (!fs.existsSync(PROFILES_FILE)) return []; return fs.readJson(PROFILES_FILE); });
ipcMain.handle('update-profile', async (event, updatedProfile) => {
    try {
        if (!updatedProfile || typeof updatedProfile !== 'object') return false;
        const safeId = normalizeProfileId(updatedProfile.id);
        if (!safeId) return false;
        const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
        const index = profiles.findIndex(p => p.id === safeId);
        if (index > -1) {
            profiles[index] = { ...updatedProfile, id: safeId };
            await fs.writeJson(PROFILES_FILE, profiles);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
});
ipcMain.handle('save-profile', async (event, data) => {
    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const fingerprint = data.fingerprint || generateFingerprint();

    // Apply timezone
    if (data.timezone) fingerprint.timezone = data.timezone;
    else fingerprint.timezone = "America/Los_Angeles";

    // Apply city and geolocation
    if (data.city) fingerprint.city = data.city;
    if (data.geolocation) fingerprint.geolocation = data.geolocation;

    // Apply language
    if (data.language && data.language !== 'auto') fingerprint.language = data.language;

    const proxyMode = (data && data.proxyMode === 'tun') ? 'tun' : 'app_proxy';
    const proxyEngine = proxyMode === 'tun' ? 'sing-box' : (data.proxyEngine || 'xray');
    const tun = (proxyMode === 'tun' && data && data.tun && typeof data.tun === 'object') ? data.tun : undefined;

    const newProfile = {
        id: uuidv4(),
        name: data.name,
        proxyStr: data.proxyStr,
        proxyEngine,
        proxyMode,
        tun,
        tags: data.tags || [],
        fingerprint: fingerprint,
        preProxyOverride: 'default',
        isSetup: false,
        createdAt: Date.now()
    };
    profiles.push(newProfile);
    await fs.writeJson(PROFILES_FILE, profiles);
    return newProfile;
});
ipcMain.handle('delete-profile', async (event, id) => {
    const resolved = (() => {
        try { return resolveProfileDirOrThrow(id); } catch (e) { return null; }
    })();
    if (!resolved) return false;
    id = resolved.id;
    const profileDir = resolved.profileDir;

    // 关闭正在运行的进程
    if (activeProcesses[id]) {
        await forceKill(getProxyPid(activeProcesses[id]));
        try {
            await activeProcesses[id].browser.close();
        } catch (e) { }

        // 关闭日志文件描述符（Windows 必须）
        if (activeProcesses[id].logFd !== undefined) {
            try {
                fs.closeSync(activeProcesses[id].logFd);
                console.log('Closed log file descriptor');
            } catch (e) {
                console.error('Failed to close log fd:', e.message);
            }
        }

        delete activeProcesses[id];
        // Windows 需要更长的等待时间让文件释放
        await new Promise(r => setTimeout(r, 1000));
    }

    // 从 profiles.json 中删除
    let profiles = await fs.readJson(PROFILES_FILE);
    profiles = profiles.filter(p => p.id !== id);
    await fs.writeJson(PROFILES_FILE, profiles);

    // 永久删除 profile 文件夹（带重试机制）
    let deleted = false;

    // 尝试删除 3 次
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            if (fs.existsSync(profileDir)) {
                // 使用 fs-extra 的 remove，它会递归删除
                await fs.remove(profileDir);
                console.log(`Deleted profile folder: ${profileDir}`);
                deleted = true;
                break;
            } else {
                deleted = true;
                break;
            }
        } catch (err) {
            console.error(`Delete attempt ${attempt} failed:`, err.message);
            if (attempt < 3) {
                // 等待后重试
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
    }

    // 如果删除失败，移到回收站作为后备方案
    if (!deleted && fs.existsSync(profileDir)) {
        console.warn(`Failed to delete, moving to trash: ${profileDir}`);
        const trashDest = path.join(TRASH_PATH, `${id}_${Date.now()}`);
        try {
            await fs.move(profileDir, trashDest);
            console.log(`Moved to trash: ${trashDest}`);
        } catch (err) {
            console.error(`Failed to move to trash:`, err);
        }
    }

    return true;
});

ipcMain.handle('stop-profile', async (event, id) => {
    if (!id) return { success: false, error: 'Missing id' };
    let resolved;
    try {
        resolved = resolveProfileDirOrThrow(id);
    } catch (e) {
        return { success: false, error: 'Invalid id' };
    }
    id = resolved.id;
    const profileDir = resolved.profileDir;
    if (!activeProcesses[id]) return { success: true, stopped: false };
    try {
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('profile-status', { id, status: 'stopping' });
            }
        } catch (e) { }
        await forceKill(getProxyPid(activeProcesses[id]));
        try { await activeProcesses[id].browser.close(); } catch (e) { }

        if (activeProcesses[id].logFd !== undefined) {
            try { fs.closeSync(activeProcesses[id].logFd); } catch (e) { }
        }
        delete activeProcesses[id];
        await autoClearSystemProxyIfEnabled();
        await new Promise(r => setTimeout(r, 500));
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('profile-status', { id, status: 'stopped' });
            }
        } catch (e) { }
        return { success: true, stopped: true };
    } catch (e) {
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('profile-status', { id, status: 'stop_failed' });
            }
        } catch (err) { }
        try {
            const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
            const p = profiles.find(x => x.id === id);
            if (p) {
                p.diagnostics = p.diagnostics || {};
                p.diagnostics.lastError = {
                    at: new Date().toISOString(),
                    stage: 'stop',
                    message: e.message,
                    engine: activeProcesses[id] ? activeProcesses[id].proxyEngine : (p.proxyEngine || 'xray'),
                    logPath: path.join(profileDir, (activeProcesses[id] && activeProcesses[id].proxyEngine === 'sing-box') ? 'singbox_run.log' : 'xray_run.log')
                };
                await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
            }
        } catch (writeErr) { }
        return { success: false, error: e.message };
    }
});

ipcMain.handle('set-system-proxy-mode', async (event, { enable, endpoint }) => {
    try {
        const result = await applySystemProxyMode({ enable: Boolean(enable), endpoint });
        return { success: true, result };
    } catch (e) {
        return { success: false, error: e.message, code: e.code || 'SYSTEM_PROXY_ERROR' };
    }
});

ipcMain.handle('get-system-proxy-status', async () => {
    if (process.platform !== 'win32') return { supported: false };
    const { execFile } = require('child_process');
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
    function q(name) {
        return new Promise((resolve) => {
            execFile('reg.exe', ['QUERY', key, '/v', name], { windowsHide: true }, (err, stdout) => {
                if (err) return resolve(null);
                resolve((stdout || '').toString());
            });
        });
    }
    const proxyEnable = await q('ProxyEnable');
    const proxyServer = await q('ProxyServer');
    return { supported: true, raw: { proxyEnable, proxyServer } };
});

ipcMain.handle('get-settings', async () => { if (fs.existsSync(SETTINGS_FILE)) return fs.readJson(SETTINGS_FILE); return { preProxies: [], mode: 'single', enablePreProxy: false, enableRemoteDebugging: false }; });
ipcMain.handle('save-settings', async (e, settings) => { await fs.writeJson(SETTINGS_FILE, settings); return true; });
ipcMain.handle('select-extension-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Extension Folder'
    });
    return filePaths && filePaths.length > 0 ? filePaths[0] : null;
});
ipcMain.handle('add-user-extension', async (e, extPath) => {
    const raw = typeof extPath === 'string' ? extPath.trim() : '';
    if (!raw) return false;
    if (!path.isAbsolute(raw)) return false;

    const resolved = path.resolve(raw);
    try {
        const st = await fs.stat(resolved);
        if (!st.isDirectory()) return false;
    } catch (e) {
        return false;
    }

    const manifestPath = path.join(resolved, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return false;

    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
    if (!settings.userExtensions) settings.userExtensions = [];

    const canonical = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    const existing = (settings.userExtensions || []).some((p) => {
        if (typeof p !== 'string') return false;
        try {
            const r = path.resolve(p);
            const c = process.platform === 'win32' ? r.toLowerCase() : r;
            return c === canonical;
        } catch (e) {
            return false;
        }
    });
    if (!existing) {
        settings.userExtensions.push(resolved);
        await fs.writeJson(SETTINGS_FILE, settings);
    }
    return true;
});
ipcMain.handle('remove-user-extension', async (e, extPath) => {
    if (!fs.existsSync(SETTINGS_FILE)) return true;
    const raw = typeof extPath === 'string' ? extPath.trim() : '';
    const target = (raw && path.isAbsolute(raw)) ? path.resolve(raw) : null;
    const canonicalTarget = target ? (process.platform === 'win32' ? target.toLowerCase() : target) : null;

    const settings = await fs.readJson(SETTINGS_FILE);
    if (settings.userExtensions) {
        settings.userExtensions = settings.userExtensions.filter((p) => {
            if (typeof p !== 'string') return false;
            if (!canonicalTarget) return p !== extPath;
            try {
                const r = path.resolve(p);
                const c = process.platform === 'win32' ? r.toLowerCase() : r;
                return c !== canonicalTarget;
            } catch (e) {
                return p !== extPath;
            }
        });
        await fs.writeJson(SETTINGS_FILE, settings);
    }
    return true;
});
ipcMain.handle('get-user-extensions', async () => {
    if (!fs.existsSync(SETTINGS_FILE)) return [];
    const settings = await fs.readJson(SETTINGS_FILE);
    return (settings.userExtensions || []).filter((p) => typeof p === 'string' && p.trim());
});
ipcMain.handle('open-url', async (e, url) => {
    const u = parseHttpUrlOrThrow(url);
    await shell.openExternal(u.toString());
});

// --- 自定义数据目录 ---
ipcMain.handle('get-data-path-info', async () => {
    return {
        currentPath: DATA_PATH,
        defaultPath: DEFAULT_DATA_PATH,
        isCustom: DATA_PATH !== DEFAULT_DATA_PATH
    };
});

ipcMain.handle('select-data-directory', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Data Directory'
    });
    return filePaths && filePaths.length > 0 ? filePaths[0] : null;
});

ipcMain.handle('set-data-directory', async (e, { newPath, migrate }) => {
    try {
        // 验证路径
        if (typeof newPath !== 'string' || !newPath.trim()) {
            return { success: false, error: 'Invalid path' };
        }
        newPath = newPath.trim();
        if (!path.isAbsolute(newPath)) {
            return { success: false, error: 'Invalid path' };
        }
        newPath = path.resolve(newPath);

        // 确保目录存在
        await fs.ensureDir(newPath);

        // 检查是否有写入权限
        const testFile = path.join(newPath, '.geekez-test');
        try {
            await fs.writeFile(testFile, 'test');
            await fs.remove(testFile);
        } catch (e) {
            return { success: false, error: 'No write permission to selected directory' };
        }

        // 如果需要迁移数据
        if (migrate && DATA_PATH !== newPath) {
            const oldProfiles = path.join(DATA_PATH, 'profiles.json');
            const oldSettings = path.join(DATA_PATH, 'settings.json');

            // 迁移 profiles.json
            if (fs.existsSync(oldProfiles)) {
                await fs.copy(oldProfiles, path.join(newPath, 'profiles.json'));
            }
            // 迁移 settings.json
            if (fs.existsSync(oldSettings)) {
                await fs.copy(oldSettings, path.join(newPath, 'settings.json'));
            }

            // 迁移所有环境数据目录
            const profiles = fs.existsSync(oldProfiles) ? await fs.readJson(oldProfiles) : [];
            for (const profile of profiles) {
                const safeProfileId = normalizeProfileId(profile && profile.id);
                if (!safeProfileId) continue;
                const oldDir = path.join(DATA_PATH, safeProfileId);
                const newDir = path.join(newPath, safeProfileId);
                if (fs.existsSync(oldDir)) {
                    console.log(`Migrating profile ${safeProfileId}...`);
                    await fs.copy(oldDir, newDir);
                }
            }
        }

        // 保存新路径到配置
        await fs.writeJson(APP_CONFIG_FILE, { customDataPath: newPath });

        return { success: true, requiresRestart: true };
    } catch (err) {
        console.error('Failed to set data directory:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('reset-data-directory', async () => {
    try {
        // 删除自定义配置
        if (fs.existsSync(APP_CONFIG_FILE)) {
            const config = await fs.readJson(APP_CONFIG_FILE);
            delete config.customDataPath;
            await fs.writeJson(APP_CONFIG_FILE, config);
        }
        return { success: true, requiresRestart: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- 导出/导入功能 (重构版) ---

// 辅助函数：清理 fingerprint 中的无用字段
function cleanFingerprint(fp) {
    if (!fp) return fp;
    const cleaned = { ...fp };
    delete cleaned.userAgent;
    delete cleaned.userAgentMetadata;
    return cleaned;
}

// 加密辅助函数
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const MAGIC_HEADER = Buffer.from('GKEZ'); // GeekEZ magic bytes

function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

function encryptData(data, password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 格式: MAGIC(4) + VERSION(4) + SALT(16) + IV(12) + AUTH_TAG(16) + ENCRYPTED_DATA
    const version = Buffer.alloc(4);
    version.writeUInt32LE(1, 0); // Version 1

    return Buffer.concat([MAGIC_HEADER, version, salt, iv, authTag, encrypted]);
}

function decryptData(encryptedBuffer, password) {
    // 验证 magic header
    const magic = encryptedBuffer.slice(0, 4);
    if (!magic.equals(MAGIC_HEADER)) {
        throw new Error('Invalid backup file format');
    }

    let offset = 4;
    const version = encryptedBuffer.readUInt32LE(offset);
    offset += 4;

    if (version !== 1) {
        throw new Error(`Unsupported backup version: ${version}`);
    }

    const salt = encryptedBuffer.slice(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;

    const iv = encryptedBuffer.slice(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;

    const authTag = encryptedBuffer.slice(offset, offset + AUTH_TAG_LENGTH);
    offset += AUTH_TAG_LENGTH;

    const encrypted = encryptedBuffer.slice(offset);

    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// 获取用于选择器的环境列表
ipcMain.handle('get-export-profiles', async () => {
    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    return profiles.map(p => ({ id: p.id, name: p.name, tags: p.tags || [] }));
});

// 导出选定环境 (精简版，不含浏览器数据)
ipcMain.handle('export-selected-data', async (e, { type, profileIds }) => {
    const allProfiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
    const requestedIds = Array.isArray(profileIds) ? profileIds : [];

    // 过滤选中的环境
    const selectedProfiles = allProfiles
        .filter(p => requestedIds.includes(p.id))
        .map(p => ({
            ...p,
            fingerprint: cleanFingerprint(p.fingerprint)
        }));

    let exportObj = {};

    if (type === 'all' || type === 'profiles') {
        exportObj.profiles = selectedProfiles;
    }
    if (type === 'all' || type === 'proxies') {
        exportObj.preProxies = settings.preProxies || [];
        exportObj.subscriptions = settings.subscriptions || [];
    }
    if (type === 'all' || type === 'proxies') {
        // Export a lightweight health report derived from stored settings (no network calls).
        const now = Date.now();
        const nodes = (settings.preProxies || []).map(p => ({
            id: p.id || null,
            remark: p.remark || '',
            groupId: p.groupId || 'manual',
            urlScheme: (p.url && typeof p.url === 'string' && p.url.includes('://')) ? p.url.split('://')[0] : null,
            enable: p.enable !== false,
            latency: typeof p.latency === 'number' ? p.latency : null,
            lastTestAt: p.lastTestAt || null,
            lastTestOk: typeof p.lastTestOk === 'boolean' ? p.lastTestOk : null,
            lastTestCode: p.lastTestCode || null,
            lastTestMsg: p.lastTestMsg || null,
            ipInfo: p.ipInfo || null,
            lastIpAt: p.lastIpAt || null,
            ageMs: (p.lastTestAt && typeof p.lastTestAt === 'number') ? (now - p.lastTestAt) : null
        }));
        exportObj.proxyHealth = {
            version: 1,
            createdAt: now,
            totalNodes: nodes.length,
            nodes
        };
    }

    if (Object.keys(exportObj).length === 0) return { success: false, error: 'No data to export' };

    const typeNames = { all: 'profiles', profiles: 'profiles', proxies: 'proxies' };
    const { filePath } = await dialog.showSaveDialog({
        title: 'Export Data',
        defaultPath: `GeekEZ_Backup_${typeNames[type] || type}_${Date.now()}.yaml`,
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }]
    });

    if (filePath) {
        await fs.writeFile(filePath, yaml.dump(exportObj));
        return { success: true, count: selectedProfiles.length };
    }
    return { success: false, cancelled: true };
});

// 完整备份 (含浏览器数据，加密)
ipcMain.handle('export-full-backup', async (e, { profileIds, password }) => {
    try {
        const allProfiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
        const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
        const requestedIds = Array.isArray(profileIds) ? profileIds : [];

        // 过滤选中的环境
        const selectedProfiles = allProfiles
            .filter(p => requestedIds.includes(p.id))
            .map(p => ({
                ...p,
                fingerprint: cleanFingerprint(p.fingerprint)
            }));

        // 准备备份数据
        const backupData = {
            version: 1,
            createdAt: Date.now(),
            profiles: selectedProfiles,
            preProxies: settings.preProxies || [],
            subscriptions: settings.subscriptions || [],
            browserData: {}
        };

        // 收集浏览器数据
        // 浏览器数据存储在 DATA_PATH/<profileId>/browser_data/Default/
        for (const profile of selectedProfiles) {
            const safeProfileId = normalizeProfileId(profile && profile.id);
            if (!safeProfileId) continue;
            const profileDataDir = path.join(DATA_PATH, safeProfileId, 'browser_data');
            if (fs.existsSync(profileDataDir)) {
                const defaultDir = path.join(profileDataDir, 'Default');
                if (fs.existsSync(defaultDir)) {
                    const browserFiles = {};

                    // 收集关键浏览器数据文件
                    const filesToBackup = ['Bookmarks', 'Cookies', 'Login Data', 'Web Data', 'Preferences'];
                    for (const fileName of filesToBackup) {
                        const filePath = path.join(defaultDir, fileName);
                        if (fs.existsSync(filePath)) {
                            try {
                                const content = await fs.readFile(filePath);
                                browserFiles[fileName] = content.toString('base64');
                            } catch (err) {
                                console.error(`Failed to read ${fileName} for ${safeProfileId}:`, err.message);
                            }
                        }
                    }

                    // 收集 Local Storage
                    const localStorageDir = path.join(defaultDir, 'Local Storage', 'leveldb');
                    if (fs.existsSync(localStorageDir)) {
                        try {
                            const lsFiles = await fs.readdir(localStorageDir);
                            const localStorageData = {};
                            for (const lsFile of lsFiles) {
                                if (lsFile.endsWith('.ldb') || lsFile.endsWith('.log')) {
                                    const lsFilePath = path.join(localStorageDir, lsFile);
                                    const content = await fs.readFile(lsFilePath);
                                    localStorageData[lsFile] = content.toString('base64');
                                }
                            }
                            if (Object.keys(localStorageData).length > 0) {
                                browserFiles['LocalStorage'] = localStorageData;
                            }
                        } catch (err) {
                            console.error(`Failed to read LocalStorage for ${profile.id}:`, err.message);
                        }
                    }

                    if (Object.keys(browserFiles).length > 0) {
                        backupData.browserData[safeProfileId] = browserFiles;
                    }
                }
            }
        }

        // 压缩并加密
        const jsonData = JSON.stringify(backupData);
        const compressed = await gzip(Buffer.from(jsonData, 'utf8'));
        const encrypted = encryptData(compressed, password);

        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Full Backup',
            defaultPath: `GeekEZ_FullBackup_${Date.now()}.geekez`,
            filters: [{ name: 'GeekEZ Backup', extensions: ['geekez'] }]
        });

        if (filePath) {
            await fs.writeFile(filePath, encrypted);
            return { success: true, count: selectedProfiles.length };
        }
        return { success: false, cancelled: true };
    } catch (err) {
        console.error('Full backup failed:', err);
        return { success: false, error: err.message };
    }
});

// 导入完整备份
ipcMain.handle('import-full-backup', async (e, { password }) => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'GeekEZ Backup', extensions: ['geekez'] }]
        });

        if (!filePaths || filePaths.length === 0) {
            return { success: false, cancelled: true };
        }

        const encrypted = await fs.readFile(filePaths[0]);
        const decrypted = decryptData(encrypted, password);
        const decompressed = await gunzip(decrypted);
        const backupData = JSON.parse(decompressed.toString('utf8'));

        if (backupData.version !== 1) {
            throw new Error(`Unsupported backup version: ${backupData.version}`);
        }

        // 还原 profiles
        const currentProfiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
        let importedCount = 0;
        const idMap = {};

        const incomingProfiles = Array.isArray(backupData.profiles) ? backupData.profiles : [];
        for (const rawProfile of incomingProfiles) {
            if (!rawProfile || typeof rawProfile !== 'object') continue;
            const originalId = typeof rawProfile.id === 'string' ? rawProfile.id : null;
            const safeId = normalizeProfileId(originalId) || uuidv4();
            if (originalId) idMap[originalId] = safeId;

            const profile = { ...rawProfile, id: safeId };
            const idx = currentProfiles.findIndex(cp => cp.id === safeId);
            if (idx > -1) currentProfiles[idx] = profile;
            else currentProfiles.push(profile);
            importedCount++;
        }
        await fs.writeJson(PROFILES_FILE, currentProfiles);

        // 还原代理和订阅
        const currentSettings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
        if (backupData.preProxies) {
            if (!currentSettings.preProxies) currentSettings.preProxies = [];
            for (const p of backupData.preProxies) {
                if (!currentSettings.preProxies.find(cp => cp.id === p.id)) {
                    currentSettings.preProxies.push(p);
                }
            }
        }
        if (backupData.subscriptions) {
            if (!currentSettings.subscriptions) currentSettings.subscriptions = [];
            for (const s of backupData.subscriptions) {
                if (!currentSettings.subscriptions.find(cs => cs.id === s.id)) {
                    currentSettings.subscriptions.push(s);
                }
            }
        }
        await fs.writeJson(SETTINGS_FILE, currentSettings);

        // 还原浏览器数据
        // 浏览器数据存储在 DATA_PATH/<profileId>/browser_data/Default/
        const allowedBrowserFiles = new Set(['Bookmarks', 'Cookies', 'Login Data', 'Web Data', 'Preferences']);
        const localStorageFileRe = /^[0-9A-Za-z._-]{1,200}\.(ldb|log)$/;

        for (const [backupProfileId, rawBrowserFiles] of Object.entries(backupData.browserData || {})) {
            const mappedId = (typeof backupProfileId === 'string' && idMap[backupProfileId]) ? idMap[backupProfileId] : backupProfileId;
            const safeProfileId = normalizeProfileId(mappedId);
            if (!safeProfileId) continue;

            let resolved;
            try {
                resolved = resolveProfileDirOrThrow(safeProfileId);
            } catch (e) {
                continue;
            }

            if (!rawBrowserFiles || typeof rawBrowserFiles !== 'object' || Array.isArray(rawBrowserFiles)) continue;

            const profileDataDir = path.join(resolved.profileDir, 'browser_data');
            const defaultDir = path.join(profileDataDir, 'Default');
            await fs.ensureDir(defaultDir);

            for (const [fileName, content] of Object.entries(rawBrowserFiles)) {
                if (fileName === 'LocalStorage') {
                    const lsObj = content;
                    if (!lsObj || typeof lsObj !== 'object' || Array.isArray(lsObj)) continue;

                    const localStorageDir = path.join(defaultDir, 'Local Storage', 'leveldb');
                    await fs.ensureDir(localStorageDir);

                    for (const [lsFileName, lsContent] of Object.entries(lsObj)) {
                        if (typeof lsFileName !== 'string') continue;
                        if (path.basename(lsFileName) !== lsFileName) continue;
                        if (!localStorageFileRe.test(lsFileName)) continue;
                        if (typeof lsContent !== 'string') continue;

                        const lsFilePath = path.join(localStorageDir, lsFileName);
                        await fs.writeFile(lsFilePath, Buffer.from(lsContent, 'base64'));
                    }
                } else {
                    if (!allowedBrowserFiles.has(fileName)) continue;
                    if (typeof content !== 'string') continue;
                    const filePath = path.join(defaultDir, fileName);
                    await fs.writeFile(filePath, Buffer.from(content, 'base64'));
                }
            }
        }

        return { success: true, count: importedCount };
    } catch (err) {
        console.error('Import full backup failed:', err);
        if (err.message.includes('Unsupported state') || err.message.includes('bad decrypt')) {
            return { success: false, error: '密码错误或文件已损坏' };
        }
        return { success: false, error: err.message };
    }
});

// 导入普通备份 (YAML)
ipcMain.handle('import-data', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }]
    });

    if (filePaths && filePaths.length > 0) {
        try {
            const content = await fs.readFile(filePaths[0], 'utf8');
            const data = yaml.load(content);
            let updated = false;

            if (data.profiles || data.preProxies || data.subscriptions) {
                if (Array.isArray(data.profiles)) {
                    const currentProfiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
                    for (const rawProfile of data.profiles) {
                        if (!rawProfile || typeof rawProfile !== 'object') continue;
                        const safeId = normalizeProfileId(rawProfile.id) || uuidv4();
                        const p = { ...rawProfile, id: safeId };
                        const idx = currentProfiles.findIndex(cp => cp.id === safeId);
                        if (idx > -1) currentProfiles[idx] = p;
                        else currentProfiles.push(p);
                    }
                    await fs.writeJson(PROFILES_FILE, currentProfiles);
                    updated = true;
                }
                if (Array.isArray(data.preProxies) || Array.isArray(data.subscriptions)) {
                    const currentSettings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
                    if (data.preProxies) {
                        if (!currentSettings.preProxies) currentSettings.preProxies = [];
                        data.preProxies.forEach(p => {
                            if (!currentSettings.preProxies.find(cp => cp.id === p.id)) currentSettings.preProxies.push(p);
                        });
                    }
                    if (data.subscriptions) {
                        if (!currentSettings.subscriptions) currentSettings.subscriptions = [];
                        data.subscriptions.forEach(s => {
                            if (!currentSettings.subscriptions.find(cs => cs.id === s.id)) currentSettings.subscriptions.push(s);
                        });
                    }
                    await fs.writeJson(SETTINGS_FILE, currentSettings);
                    updated = true;
                }
            } else if (data.name && data.proxyStr && data.fingerprint) {
                // 单个环境导入
                const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
                const newProfile = { ...data, id: uuidv4(), isSetup: false, createdAt: Date.now() };
                profiles.push(newProfile);
                await fs.writeJson(PROFILES_FILE, profiles);
                updated = true;
            }
            return updated;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
    return false;
});

// 保留旧的 export-data 用于向后兼容 (deprecated)
ipcMain.handle('export-data', async (e, type) => {
    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };

    // 清理 fingerprint
    const cleanedProfiles = profiles.map(p => ({
        ...p,
        fingerprint: cleanFingerprint(p.fingerprint)
    }));

    let exportObj = {};
    if (type === 'all' || type === 'profiles') exportObj.profiles = cleanedProfiles;
    if (type === 'all' || type === 'proxies') {
        exportObj.preProxies = settings.preProxies || [];
        exportObj.subscriptions = settings.subscriptions || [];
    }
    if (Object.keys(exportObj).length === 0) return false;

    const { filePath } = await dialog.showSaveDialog({
        title: 'Export Data',
        defaultPath: `GeekEZ_Backup_${type}_${Date.now()}.yaml`,
        filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }]
    });
    if (filePath) {
        await fs.writeFile(filePath, yaml.dump(exportObj));
        return true;
    }
    return false;
});

// --- 核心启动逻辑 ---
ipcMain.handle('launch-profile', async (event, profileId, watermarkStyle, options = {}) => {
    const sender = event.sender;
    const skipProxyWarnOnce = Boolean(options && (options.skipProxyWarnOnce || options.skipProxyConsistencyWarnOnce));
    const resolvedProfile = resolveProfileDirOrThrow(profileId);
    profileId = resolvedProfile.id;

    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-status', { id: profileId, status: 'starting' });
        }
    } catch (e) { }

    if (activeProcesses[profileId]) {
        const proc = activeProcesses[profileId];
        if (proc.browser && proc.browser.isConnected()) {
            try {
                const targets = await proc.browser.targets();
                const pageTarget = targets.find(t => t.type() === 'page');
                if (pageTarget) {
                    const page = await pageTarget.page();
                    if (page) {
                        const session = await pageTarget.createCDPSession();
                        const { windowId } = await session.send('Browser.getWindowForTarget');
                        await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
                        setTimeout(async () => {
                            try { await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } }); } catch (e) { }
                        }, 100);
                        await page.bringToFront();
                    }
                }
                return "环境已唤醒";
            } catch (e) {
                await forceKill(getProxyPid(proc));
                delete activeProcesses[profileId];
            }
        } else {
            await forceKill(getProxyPid(proc));
            delete activeProcesses[profileId];
        }
        if (activeProcesses[profileId]) return "环境已唤醒";
    }

    // TUN mode changes system routes; do not allow launching other profiles while a TUN profile is running.
    try {
        const runningTun = Object.entries(activeProcesses || {}).find(([, p]) => p && p.proxyMode === 'tun');
        if (runningTun && runningTun[0] && runningTun[0] !== profileId) {
            const err = new Error('A TUN profile is currently running. Stop it before launching other profiles.');
            err.code = 'TUN_ALREADY_RUNNING';
            throw err;
        }
    } catch (e) {
        if (e && e.code === 'TUN_ALREADY_RUNNING') throw e;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Load settings early for userExtensions and remote debugging
    const settings = await fs.readJson(SETTINGS_FILE).catch(() => ({
        enableRemoteDebugging: false,
        userExtensions: [],
        preProxies: [],
        mode: 'single',
        enablePreProxy: false
    }));

    const profiles = await fs.readJson(PROFILES_FILE);
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) throw new Error('Profile not found');

    if (!profile.fingerprint) profile.fingerprint = generateFingerprint();
    profile.fingerprint = normalizeFingerprintSpec(profile.fingerprint);

    // Proxy -> Fingerprint linkage (local, self-use enterprise): test current proxy and apply timezone if needed
    // Policy can be configured per profile; fallback to global settings default when absent.
    try {
        const autoLinkEnabled = !(profile.proxyPolicy && profile.proxyPolicy.autoLink === false);
        if (autoLinkEnabled && profile.proxyStr) {
            const { applyProxyGeoToFingerprint } = require('./proxy/linkFingerprint');
            const { applyConsistencyPolicy } = require('./proxy/consistency');
            const globalSettings = await fs.readJson(SETTINGS_FILE).catch(() => ({}));
            const globalMode = globalSettings.defaultProxyConsistency || 'warn';
            const profileConsistency = (profile.proxyPolicy && profile.proxyPolicy.consistencyPolicy) ? profile.proxyPolicy.consistencyPolicy : null;
            const onMismatch = (profileConsistency && profileConsistency.onMismatch) ? profileConsistency.onMismatch : globalMode; // block|warn|autofix
            const enforce = profileConsistency ? Boolean(profileConsistency.enforce) : true;
            const allowAutofix = (profile.proxyPolicy && profile.proxyPolicy.allowAutofix) ? profile.proxyPolicy.allowAutofix : { language: false, geo: false };

            const resolved = await testProxyNodeInternal(profile.proxyStr);

            if (resolved && resolved.geo) {
                const link = applyProxyGeoToFingerprint(profile, resolved, { enforce, onMismatch, allowAutofix });
                if (!link.ok && onMismatch === 'block') {
                    throw new Error(`Proxy/Fingerprint mismatch: ${link.issues.map(i => i.code).join(',')}`);
                }
                if (link.updatedProfile && JSON.stringify(link.updatedProfile.fingerprint) !== JSON.stringify(profile.fingerprint)) {
                    profile.fingerprint = link.updatedProfile.fingerprint;
                    await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
                }

                const gate = applyConsistencyPolicy({
                    profile,
                    proxyTestResult: resolved,
                    policy: { enforce, onMismatch }
                });
                if (gate.updatedProfile && JSON.stringify(gate.updatedProfile.fingerprint) !== JSON.stringify(profile.fingerprint)) {
                    profile.fingerprint = gate.updatedProfile.fingerprint;
                    await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
                }
                if (!gate.ok && onMismatch === 'block') {
                    throw new Error(`Proxy/Fingerprint consistency block: ${gate.issues.map(i => i.code).join(',')}`);
                }

                // For warn mode: notify UI with details and allow user-triggered "autofix then relaunch"
                if (!skipProxyWarnOnce && !gate.ok && onMismatch === 'warn') {
                    try {
                        if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('proxy-consistency-warning', {
                                profileId,
                                issues: gate.issues || [],
                                resolvedGeo: resolved.geo,
                            });
                        }
                    } catch (e) { }
                }

                // UA-CH/platform/hardware consistency gate (best-effort; can block when configured)
                try {
                    const { evaluateUaChConsistency } = require('./proxy/uaConsistency');
                    // Prefer real outbound headers when available (httpbin echo) to reduce false confidence.
                    let headers = null;
                    try {
                        const { probeOutboundHeaders } = require('./proxy/headerProbe');
                        headers = await probeOutboundHeaders({ timeoutMs: 8000, proxyStr: profile.proxyStr });
                    } catch (e) { }
                    if (!headers) {
                        headers = {
                            userAgent: profile.fingerprint?.cdp?.userAgent || profile.fingerprint?.userAgent || null,
                            secChUaPlatform: (profile.fingerprint?.cdp?.userAgentMetadata && profile.fingerprint.cdp.userAgentMetadata.platform) ? profile.fingerprint.cdp.userAgentMetadata.platform : null,
                        };
                    }
                    const uaIssues = evaluateUaChConsistency({ profile, headers });
                    if (Array.isArray(uaIssues) && uaIssues.length > 0 && onMismatch === 'block') {
                        throw new Error(`UA consistency block: ${uaIssues.map(i => i.code).join(',')}`);
                    }
                } catch (e) {
                    if (onMismatch === 'block') throw e;
                }
            }
        }
    } catch (e) {
        if (profile.proxyPolicy && profile.proxyPolicy.consistencyPolicy && profile.proxyPolicy.consistencyPolicy.onMismatch === 'block') {
            throw e;
        }
    }

    profile.fingerprint = normalizeFingerprintSpec(profile.fingerprint);

    // Clear previous error once we're about to proceed with a new launch attempt (best effort)
    try {
        if (profile.diagnostics && profile.diagnostics.lastError) {
            delete profile.diagnostics.lastError;
            await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
        }
    } catch (e) { }

    // Pre-proxy settings (settings already loaded above)
    const override = profile.preProxyOverride || 'default';
    const shouldUsePreProxy = override === 'on' || (override === 'default' && settings.enablePreProxy);
    let finalPreProxyConfig = null;
    let switchMsg = null;
    if (shouldUsePreProxy && settings.preProxies && settings.preProxies.length > 0) {
        const active = settings.preProxies.filter(p => p.enable !== false);
        if (active.length > 0) {
            if (settings.mode === 'single') { const target = active.find(p => p.id === settings.selectedId) || active[0]; finalPreProxyConfig = { preProxies: [target] }; }
            else if (settings.mode === 'balance') { const target = active[Math.floor(Math.random() * active.length)]; finalPreProxyConfig = { preProxies: [target] }; if (settings.notify) switchMsg = `Balance: [${target.remark}]`; }
            else if (settings.mode === 'failover') { const target = active[0]; finalPreProxyConfig = { preProxies: [target] }; if (settings.notify) switchMsg = `Failover: [${target.remark}]`; }
        }
    }

    try {
        const localPort = await getPort();
        const profileDir = resolvedProfile.profileDir;
        const userDataDir = path.join(profileDir, 'browser_data');
        const xrayConfigPath = path.join(profileDir, 'config.json');
        const xrayLogPath = path.join(profileDir, 'xray_run.log');
        const singboxLogPath = path.join(profileDir, 'singbox_run.log');
        fs.ensureDirSync(userDataDir);

        try {
            const defaultProfileDir = path.join(userDataDir, 'Default');
            fs.ensureDirSync(defaultProfileDir);
            const preferencesPath = path.join(defaultProfileDir, 'Preferences');
            let preferences = {};
            if (fs.existsSync(preferencesPath)) preferences = await fs.readJson(preferencesPath);
            if (!preferences.bookmark_bar) preferences.bookmark_bar = {};
            preferences.bookmark_bar.show_on_all_tabs = true;
            if (preferences.protection) delete preferences.protection;
            if (!preferences.profile) preferences.profile = {};
            preferences.profile.name = profile.name;
            if (!preferences.webrtc) preferences.webrtc = {};
            preferences.webrtc.ip_handling_policy = 'disable_non_proxied_udp';
            await fs.writeJson(preferencesPath, preferences);
        } catch (e) { }

        const proxyMode = profile && profile.proxyMode === 'tun' ? 'tun' : 'app_proxy';
        let proxyEngine = getProxyEngineFromProfile(profile);
        // Auto-switch engine when the proxy node requires sing-box (sb://, hysteria, ss+plugin, wireguard/shadowtls bundles, etc.).
        // This keeps the "default xray" UX while supporting more node types out of the box.
        try {
            const inferred = inferProxyTestEngine(normalizeProxyInputRaw(profile.proxyStr));
            if (proxyMode === 'tun' && proxyEngine !== 'sing-box') {
                proxyEngine = 'sing-box';
                profile.proxyEngine = 'sing-box';
                try { await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 }); } catch (e) { }
            } else if (proxyEngine === 'xray' && inferred === 'sing-box') {
                proxyEngine = 'sing-box';
                profile.proxyEngine = 'sing-box';
                try { await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 }); } catch (e) { }
            }
        } catch (e) { }

        const logPath = proxyEngine === 'sing-box' ? singboxLogPath : xrayLogPath;
        try {
            const { rotateLogIfNeeded } = require('./proxy/logRotate');
            await rotateLogIfNeeded(logPath, { maxBytes: 5 * 1024 * 1024, keep: 5, tag: proxyEngine });
        } catch (e) { }
        const logFd = fs.openSync(logPath, 'a');
        const proxyResult = await startProxyEngine(profile, localPort, xrayConfigPath, logFd, { preProxyConfig: finalPreProxyConfig });
        const xrayProcess = proxyResult.process;

        // 优化：减少等待时间，Xray 通常 300ms 内就能启动
        await new Promise(resolve => setTimeout(resolve, 300));

        // 0. Resolve Language (Fix: Resolve 'auto' BEFORE generating extension so inject script gets explicit language)
        const targetLang = (profile.fingerprint?.cdp?.locale || (profile.fingerprint?.language && profile.fingerprint.language !== 'auto' ? profile.fingerprint.language : null) || 'en-US');

        // Update in-memory profile to ensure generateExtension writes the correct language to inject script
        profile.fingerprint.language = targetLang;
        profile.fingerprint.languages = [targetLang, targetLang.split('-')[0]];

        // 1. 生成 GeekEZ Guard 扩展（使用传递的水印样式）
        const style = watermarkStyle || 'enhanced'; // 默认使用增强水印
        const extPath = await generateExtension(profileDir, profile.fingerprint, profile.name, style);

        // 2. 获取用户自定义扩展
        const userExts = settings.userExtensions || [];

        // 3. 合并所有扩展路径
        let extPaths = extPath; // GeekEZ Guard
        if (userExts.length > 0) {
            extPaths += ',' + userExts.join(',');
        }

        // 4. 构建启动参数（性能优化）

        const launchArgs = [
            ...(proxyMode === 'tun' ? [] : [`--proxy-server=socks5://127.0.0.1:${localPort}`]),
            `--user-data-dir=${userDataDir}`,
            `--window-size=${profile.fingerprint?.window?.width || 1280},${profile.fingerprint?.window?.height || 800}`,
            '--restore-last-session',
            '--disable-blink-features=AutomationControlled',
            '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
            `--lang=${targetLang}`,
            `--accept-lang=${targetLang}`,
            `--disable-extensions-except=${extPaths}`,
            `--load-extension=${extPaths}`,
            // 性能优化参数
            '--no-first-run',                    // 跳过首次运行向导
            '--no-default-browser-check',        // 跳过默认浏览器检查
            '--disable-background-timer-throttling', // 防止后台标签页被限速
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-dev-shm-usage',           // 减少共享内存使用
            '--disk-cache-size=52428800',        // 限制磁盘缓存为 50MB
            '--media-cache-size=52428800'        // 限制媒体缓存为 50MB
        ];

        // Security: keep Chromium sandbox enabled by default.
        // Only disable sandbox for Linux root (common in some containerized environments).
        if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
            launchArgs.push('--no-sandbox', '--disable-setuid-sandbox');
        }

        // 5. Remote Debugging Port (if enabled)
        if (settings.enableRemoteDebugging && profile.debugPort) {
            launchArgs.push(`--remote-debugging-port=${profile.debugPort}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('⚠️  REMOTE DEBUGGING ENABLED');
            console.log(`📡 Port: ${profile.debugPort}`);
            console.log(`🔗 Connect: chrome://inspect or ws://localhost:${profile.debugPort}`);
            console.log('⚠️  WARNING: May increase automation detection risk!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        // 6. Custom Launch Arguments (if enabled)
        if (settings.enableCustomArgs && profile.customArgs) {
            const customArgsList = profile.customArgs
                .split(/[\n\s]+/)
                .map(arg => arg.trim())
                .filter(arg => arg && arg.startsWith('--'));

            if (customArgsList.length > 0) {
                launchArgs.push(...customArgsList);
                console.log('⚡ Custom Args:', customArgsList.join(' '));
            }
        }

        // 5. 启动浏览器
        const chromePath = getChromiumPath();
        if (!chromePath) {
            await forceKill(xrayProcess.pid);
            throw new Error("Chrome binary not found.");
        }

        // 时区设置
        const env = { ...process.env };
        if (profile.fingerprint?.timezone && profile.fingerprint.timezone !== 'Auto') {
            env.TZ = profile.fingerprint.timezone;
        }

        const browser = await puppeteer.launch({
            headless: false,
            executablePath: chromePath,
            userDataDir: userDataDir,
            args: launchArgs,
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            pipe: false,
            dumpio: false,
            env: env  // 注入环境变量
        });

        activeProcesses[profileId] = {
            proxyPid: xrayProcess.pid,
            proxyEngine: proxyResult.engine,
            proxyMode,
            browser,
            logFd: logFd  // 存储日志文件描述符，用于后续关闭
        };
        sender.send('profile-status', { id: profileId, status: 'running' });
        if (proxyMode !== 'tun') {
            await autoApplySystemProxyForRunningProfile({ profileId, localPort });
        }

        // Apply CDP overrides (timezone/locale/geo/UA-CH) prior to any user navigation.
        // Note: some detections can flag CDP usage; for enterprise self-use we prioritize determinism.
        try {
            const page = await browser.newPage();
            const session = await applyCdpOverridesToPage(page, profile.fingerprint);
            try { await session.detach(); } catch (e) { }
            try { await page.close(); } catch (e) { }
        } catch (e) { }

        browser.on('disconnected', async () => {
            if (activeProcesses[profileId]) {
                const pid = getProxyPid(activeProcesses[profileId]);
                const logFd = activeProcesses[profileId].logFd;

                // 关闭日志文件描述符
                if (logFd !== undefined) {
                    try {
                        fs.closeSync(logFd);
                    } catch (e) { }
                }

                delete activeProcesses[profileId];
                await forceKill(pid);
                await autoClearSystemProxyIfEnabled();

                // 性能优化：清理缓存文件，节省磁盘空间
                try {
                    const cacheDir = path.join(userDataDir, 'Default', 'Cache');
                    const codeCacheDir = path.join(userDataDir, 'Default', 'Code Cache');
                    if (fs.existsSync(cacheDir)) await fs.emptyDir(cacheDir);
                    if (fs.existsSync(codeCacheDir)) await fs.emptyDir(codeCacheDir);
                } catch (e) {
                    // 忽略清理错误
                }

                if (!sender.isDestroyed()) sender.send('profile-status', { id: profileId, status: 'stopped' });
            }
        });

        return switchMsg;
    } catch (err) {
        try {
            profile.diagnostics = profile.diagnostics || {};
            profile.diagnostics.lastError = {
                at: new Date().toISOString(),
                stage: 'launch',
                message: err.message,
                engine: getProxyEngineFromProfile(profile),
                logPath: path.join(resolvedProfile.profileDir, getProxyEngineFromProfile(profile) === 'sing-box' ? 'singbox_run.log' : 'xray_run.log')
            };
            await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
        } catch (e) { }
        console.error(err);
        throw err;
    }
});

app.on('window-all-closed', () => {
    Object.values(activeProcesses).forEach(p => forceKill(getProxyPid(p)));
    if (process.platform !== 'darwin') app.quit();
});
// Helpers (Same)
function fetchJson(url) { return new Promise((resolve, reject) => { const req = https.get(url, { headers: { 'User-Agent': 'GeekEZ-Browser' } }, (res) => { let data = ''; res.on('data', c => data += c); res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } }); }); req.on('error', reject); }); }
function getLocalXrayVersion() { return new Promise((resolve) => { if (!fs.existsSync(BIN_PATH)) return resolve('v0.0.0'); try { const proc = spawn(BIN_PATH, ['-version']); let output = ''; proc.stdout.on('data', d => output += d.toString()); proc.on('close', () => { const match = output.match(/Xray\s+v?(\d+\.\d+\.\d+)/i); resolve(match ? (match[1].startsWith('v') ? match[1] : 'v' + match[1]) : 'v0.0.0'); }); proc.on('error', () => resolve('v0.0.0')); } catch (e) { resolve('v0.0.0'); } }); }
function compareVersions(v1, v2) { const p1 = v1.split('.').map(Number); const p2 = v2.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((p1[i] || 0) > (p2[i] || 0)) return 1; if ((p1[i] || 0) < (p2[i] || 0)) return -1; } return 0; }
function getProxyPid(proc) {
    if (!proc) return null;
    return proc.proxyPid || proc.xrayPid || null;
}

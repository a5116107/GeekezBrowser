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
const { inferProtocolFromInput, resolveEnginePlan } = require('./proxy/protocolMatrix');
const { resolveProbeProfile, limitProbeCount, getDefaultConnectivityProbes, getMaxConnectivityProbeCount } = require('./proxy/probeProfiles');
const { PROXY_TEST_ERROR_CODES, codeFromConnectivity, codeFromException } = require('./proxy/testErrorCodes');
const { createStep, finishStep, createProxyTestResultBase, appendStep, appendAttempt, finalizeProxyTestResult, normalizeProxyTestResult, validateProxyTestResult } = require('./proxy/testResultSchema');
const { normalizeProxyBatchTestStrategy } = require('./proxy/testScheduler');
const { buildProxyTestReport, toProxyTestReportCsv } = require('./proxy/testReport');
const { downloadFile, extractZip, isZipFileHeader, parseSha256DigestForAsset, sha256FileHex, validateUpdateDownloadUrl } = require('./updateUtils');
const { parseHttpUrlOrThrow, parseHttpFetchUrlOrThrow, normalizeAllowedPrivateHostList } = require('./security/urlPolicy');
const { fetchWithUrlPolicy } = require('./security/fetchPolicy');

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

const XRAY_UPDATE_ZIP_MAX_BYTES = 100 * 1024 * 1024; // 100MB
const XRAY_UPDATE_EXTRACT_MAX_ENTRIES = 200;
const XRAY_UPDATE_EXTRACT_MAX_BYTES = 140 * 1024 * 1024; // 140MB (uncompressed)
const XRAY_UPDATE_DGST_MAX_BYTES = 1 * 1024 * 1024; // 1MB

const GITHUB_API_MAX_REDIRECTS = 5;
const GITHUB_API_MAX_BYTES = 1 * 1024 * 1024; // 1MB
const GITHUB_API_TIMEOUT_MS = 10_000;
const COOKIE_IMPORT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const COOKIE_IMPORT_MAX_ITEMS = 5000;

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

function normalizeProxyBindId(input) {
    if (input == null) return '';
    const raw = typeof input === 'string' ? input : String(input);
    const id = raw.trim();
    if (!id) return '';
    // Node ids are UUIDs or timestamp-based strings; keep permissive but bounded.
    if (id.length > 200) return '';
    if (/[\r\n\t]/.test(id)) return '';
    return id;
}

function normalizePreProxyOverrideToken(input) {
    const token = String(input || '').trim().toLowerCase();
    if (token === 'on' || token === 'off' || token === 'default') return token;
    return 'default';
}

function findProxyNodeById(settings, bindId) {
    const id = normalizeProxyBindId(bindId);
    if (!id) return null;
    const list = settings && Array.isArray(settings.preProxies) ? settings.preProxies : [];
    return list.find((n) => n && String(n.id) === id) || null;
}

function assertProxyBindUniqueOrThrow(profiles, bindId, { exceptProfileId = '' } = {}) {
    const id = normalizeProxyBindId(bindId);
    if (!id) return;
    const except = exceptProfileId ? String(exceptProfileId) : '';
    const conflict = (profiles || []).find((p) => {
        if (!p || typeof p !== 'object') return false;
        const pid = p.id ? String(p.id) : '';
        if (except && pid === except) return false;
        const other = normalizeProxyBindId(p.proxyBindId);
        return other && other === id;
    });
    if (conflict) {
        const err = new Error(`Proxy node is already bound: ${conflict.name || conflict.id || 'unknown'}`);
        err.code = 'PROXY_BIND_IN_USE';
        err.details = {
            bindId: id,
            conflictProfileId: conflict.id || null,
            conflictProfileName: conflict.name || null,
        };
        throw err;
    }
}

function assertProxyBindNodeExistsOrThrow(settings, bindId) {
    const id = normalizeProxyBindId(bindId);
    if (!id) return null;
    const node = findProxyNodeById(settings, id);
    if (!node || !node.url) {
        const err = new Error(`Bound proxy node not found: ${id}`);
        err.code = 'PROXY_BIND_NODE_NOT_FOUND';
        err.details = { bindId: id };
        throw err;
    }
    return node;
}

function validateProxyBindIntegrityOrThrow(profiles, settings, { contextLabel = '' } = {}) {
    const firstByBind = new Map();
    const conflicts = [];
    const missing = [];

    (profiles || []).forEach((p) => {
        if (!p || typeof p !== 'object') return;
        const profileId = p.id ? String(p.id) : '';
        const name = p.name ? String(p.name) : '';
        const bindId = normalizeProxyBindId(p.proxyBindId);
        if (!bindId) return;

        const existing = firstByBind.get(bindId);
        if (existing && existing.profileId && existing.profileId !== profileId) {
            conflicts.push({
                bindId,
                profiles: [
                    { id: existing.profileId, name: existing.name || '' },
                    { id: profileId, name },
                ],
            });
        } else if (!existing) {
            firstByBind.set(bindId, { profileId, name });
        }

        const node = findProxyNodeById(settings, bindId);
        if (!node || !node.url) {
            missing.push({ bindId, profileId, name });
        }
    });

    if (conflicts.length > 0) {
        const err = new Error(`Proxy binding conflict${contextLabel ? ` (${contextLabel})` : ''}: ${conflicts.length} duplicate bind(s)`);
        err.code = 'PROXY_BIND_IN_USE';
        err.details = { conflicts, missing };
        throw err;
    }
    if (missing.length > 0) {
        const err = new Error(`Bound proxy node missing${contextLabel ? ` (${contextLabel})` : ''}: ${missing.length} bind(s)`);
        err.code = 'PROXY_BIND_NODE_NOT_FOUND';
        err.details = { missing };
        throw err;
    }
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

const COOKIE_MULTI_LEVEL_SUFFIXES = new Set([
    'co.uk',
    'org.uk',
    'gov.uk',
    'ac.uk',
    'com.au',
    'net.au',
    'org.au',
    'co.jp',
    'co.kr',
    'com.cn',
    'com.tw',
    'com.hk',
    'com.sg',
    'co.nz',
    'com.br',
    'com.mx',
]);
const cookieProfileOpQueues = new Map();

function normalizeCookieHostLike(input) {
    if (typeof input !== 'string') return null;
    let host = input.trim().toLowerCase();
    if (!host) return null;
    if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(host)) {
        try {
            const parsed = new URL(host);
            host = String(parsed.hostname || '').trim().toLowerCase();
        } catch (e) {
            return null;
        }
    }
    host = host.replace(/^\.+/, '').replace(/\.+$/, '');
    if (host.startsWith('[') && host.endsWith(']')) {
        host = host.slice(1, -1).trim();
    }
    if (!host) return null;
    if (host.length > 253) return null;
    if (/[\\/\\s]/.test(host)) return null;
    return host;
}

function normalizeCookieSiteInput(input) {
    if (typeof input !== 'string' || !input.trim()) return null;
    return normalizeCookieHostLike(input);
}

function normalizeCookiePath(input) {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw) return '/';
    return raw.startsWith('/') ? raw : `/${raw}`;
}

function normalizeCookieSameSite(input) {
    if (typeof input !== 'string') return null;
    const token = input.trim().toLowerCase();
    if (!token || token === 'unspecified') return null;
    if (token === 'none' || token === 'no_restriction') return 'None';
    if (token === 'lax') return 'Lax';
    if (token === 'strict') return 'Strict';
    return null;
}

function toCookiePrimarySite(hostInput) {
    const host = normalizeCookieHostLike(hostInput);
    if (!host) return null;
    if (host === 'localhost') return host;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return host;
    if (host.includes(':')) return host;

    const labels = host.split('.').filter(Boolean);
    if (labels.length <= 2) return host;
    const suffix2 = labels.slice(-2).join('.');
    if (COOKIE_MULTI_LEVEL_SUFFIXES.has(suffix2) && labels.length >= 3) {
        return labels.slice(-3).join('.');
    }
    return suffix2;
}

function cookieRecordMatchesSite(record, siteInput) {
    const site = normalizeCookieSiteInput(siteInput);
    if (!site) return true;
    if (!record || typeof record !== 'object') return false;
    const host = normalizeCookieHostLike(record.host || record.domain || '');
    const primary = normalizeCookieHostLike(record.site || '');
    if (host === site || primary === site) return true;
    if (host && host.endsWith(`.${site}`)) return true;
    if (site && site.endsWith(`.${primary || ''}`) && primary) return true;
    return false;
}

function toCookieRecord(cookie) {
    if (!cookie || typeof cookie !== 'object') return null;
    const name = typeof cookie.name === 'string' ? cookie.name : '';
    if (!name) return null;
    const domainRaw = typeof cookie.domain === 'string' ? cookie.domain : '';
    const host = normalizeCookieHostLike(domainRaw);
    const site = toCookiePrimarySite(host);
    const pathValue = normalizeCookiePath(cookie.path);
    const expiresNum = Number(cookie.expires);
    const expires = Number.isFinite(expiresNum) && expiresNum > 0 ? Math.floor(expiresNum) : null;
    const session = cookie.session === true || !expires;
    const value = typeof cookie.value === 'string' ? cookie.value : '';
    const sizeNum = Number(cookie.size);
    return {
        id: `${name}|${host || ''}|${pathValue}`,
        name,
        value,
        domain: domainRaw || (host || ''),
        host: host || '',
        site: site || (host || ''),
        path: pathValue,
        secure: cookie.secure === true,
        httpOnly: cookie.httpOnly === true,
        session,
        sameSite: typeof cookie.sameSite === 'string' ? cookie.sameSite : '',
        expires,
        expiresAt: expires ? new Date(expires * 1000).toISOString() : null,
        size: Number.isFinite(sizeNum) && sizeNum >= 0 ? sizeNum : value.length,
        sourceScheme: cookie.sourceScheme || null,
    };
}

function summarizeCookieSites(records) {
    const map = new Map();
    for (const rec of records) {
        if (!rec || typeof rec !== 'object') continue;
        const key = rec.site || rec.host || 'unknown';
        if (!map.has(key)) {
            map.set(key, {
                site: key,
                count: 0,
                secureCount: 0,
                httpOnlyCount: 0,
                hosts: new Set(),
            });
        }
        const g = map.get(key);
        g.count += 1;
        if (rec.secure) g.secureCount += 1;
        if (rec.httpOnly) g.httpOnlyCount += 1;
        if (rec.host) g.hosts.add(rec.host);
    }
    return Array.from(map.values())
        .map((g) => ({
            site: g.site,
            count: g.count,
            secureCount: g.secureCount,
            httpOnlyCount: g.httpOnlyCount,
            hostCount: g.hosts.size,
            hosts: Array.from(g.hosts).sort(),
        }))
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return String(a.site).localeCompare(String(b.site));
        });
}

function parseCookieExpirySeconds(rawCookie) {
    if (!rawCookie || typeof rawCookie !== 'object') return null;
    if (rawCookie.session === true) return null;
    const raw = (rawCookie.expires !== undefined && rawCookie.expires !== null) ? rawCookie.expires
        : ((rawCookie.expirationDate !== undefined && rawCookie.expirationDate !== null) ? rawCookie.expirationDate : rawCookie.expiresAt);
    if (raw === undefined || raw === null || raw === '') return null;
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return null;
    if (num > 10_000_000_000) return Math.floor(num / 1000); // ms -> s
    return Math.floor(num);
}

function normalizeCookieMutationInput(rawCookie, options = {}) {
    if (!rawCookie || typeof rawCookie !== 'object') throw new Error('Invalid cookie payload');
    const name = typeof rawCookie.name === 'string' ? rawCookie.name.trim() : '';
    if (!name) throw new Error('Cookie name is required');
    const value = rawCookie.value === undefined || rawCookie.value === null ? '' : String(rawCookie.value);
    const pathValue = normalizeCookiePath(rawCookie.path);
    const secure = rawCookie.secure === true;
    const httpOnly = rawCookie.httpOnly === true;
    const sameSite = normalizeCookieSameSite(rawCookie.sameSite);
    const expires = parseCookieExpirySeconds(rawCookie);

    let host = normalizeCookieHostLike(rawCookie.domain || '');
    let urlValue = null;
    if (typeof rawCookie.url === 'string' && rawCookie.url.trim()) {
        try {
            const parsed = new URL(rawCookie.url.trim());
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                urlValue = parsed.toString();
                if (!host) host = normalizeCookieHostLike(parsed.hostname);
            }
        } catch (e) { }
    }
    if (!host && options && options.defaultSiteHost) {
        host = normalizeCookieHostLike(options.defaultSiteHost);
    }
    if (!host) throw new Error(`Cookie "${name}" missing domain/url`);

    let domainValue = host;
    if (typeof rawCookie.domain === 'string' && rawCookie.domain.trim().startsWith('.')) {
        domainValue = `.${host}`;
    }
    if (!urlValue) {
        urlValue = `${secure ? 'https' : 'http'}://${host}${pathValue}`;
    }

    return {
        name,
        value,
        domain: domainValue,
        path: pathValue,
        secure,
        httpOnly,
        sameSite,
        expires,
        url: urlValue,
    };
}

function normalizeCookieImportPayload(raw) {
    const source = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    let items = [];

    if (Array.isArray(source)) {
        items = source;
    } else if (source && typeof source === 'object') {
        if (Array.isArray(source.cookies)) items = source.cookies;
        else if (Array.isArray(source.items)) items = source.items;
        else if (source.sites && typeof source.sites === 'object') {
            for (const value of Object.values(source.sites)) {
                if (Array.isArray(value)) items.push(...value);
            }
        } else {
            throw new Error('Unsupported cookie import format');
        }
    } else {
        throw new Error('Cookie import payload must be JSON object/array');
    }

    if (items.length > COOKIE_IMPORT_MAX_ITEMS) {
        throw new Error(`Too many cookies in import file (max ${COOKIE_IMPORT_MAX_ITEMS})`);
    }
    return items.filter(item => item && typeof item === 'object');
}

function queueProfileCookieOperation(profileId, task) {
    const safeId = normalizeProfileId(profileId);
    if (!safeId) return Promise.reject(new Error('Invalid profile id'));
    const prev = cookieProfileOpQueues.get(safeId) || Promise.resolve();
    const next = prev
        .catch(() => { })
        .then(() => task());
    cookieProfileOpQueues.set(safeId, next);
    return next.finally(() => {
        if (cookieProfileOpQueues.get(safeId) === next) {
            cookieProfileOpQueues.delete(safeId);
        }
    });
}

async function withProfileCookieCdp(profileId, task) {
    const resolved = resolveProfileDirOrThrow(profileId);
    const running = activeProcesses[resolved.id];

    if (running && running.browser) {
        const page = await running.browser.newPage();
        let cdp = null;
        try {
            cdp = await page.target().createCDPSession();
            try { await cdp.send('Network.enable'); } catch (e) { }
            return await task({ page, cdp, isTemporary: false });
        } finally {
            if (cdp) {
                try { await cdp.detach(); } catch (e) { }
            }
            try { await page.close(); } catch (e) { }
        }
    }

    const chromePath = getChromiumPath();
    if (!chromePath) throw new Error('Chrome binary not found');
    const userDataDir = path.join(resolved.profileDir, 'browser_data');
    fs.ensureDirSync(userDataDir);
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromePath,
        userDataDir,
        args: [
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-component-update',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1280, height: 720 },
        pipe: false,
        dumpio: false,
    });

    const page = await browser.newPage();
    let cdp = null;
    try {
        cdp = await page.target().createCDPSession();
        try { await cdp.send('Network.enable'); } catch (e) { }
        return await task({ page, cdp, isTemporary: true });
    } finally {
        if (cdp) {
            try { await cdp.detach(); } catch (e) { }
        }
        try { await page.close(); } catch (e) { }
        try { await browser.close(); } catch (e) { }
    }
}

async function getAllCookiesFromCdp(cdp) {
    try {
        const res = await cdp.send('Storage.getCookies');
        if (res && Array.isArray(res.cookies)) return res.cookies;
    } catch (e) { }
    try {
        const res = await cdp.send('Network.getAllCookies');
        if (res && Array.isArray(res.cookies)) return res.cookies;
    } catch (e) { }
    return [];
}

async function setCookieViaCdp(cdp, rawCookie, options = {}) {
    const normalized = normalizeCookieMutationInput(rawCookie, options);
    const payload = {
        name: normalized.name,
        value: normalized.value,
        url: normalized.url,
        domain: normalized.domain,
        path: normalized.path,
        secure: normalized.secure,
        httpOnly: normalized.httpOnly,
    };
    if (normalized.sameSite) payload.sameSite = normalized.sameSite;
    if (normalized.expires) payload.expires = normalized.expires;
    const res = await cdp.send('Network.setCookie', payload);
    if (res && res.success === false) {
        throw new Error(`Failed to set cookie "${normalized.name}"`);
    }
    return normalized;
}

async function deleteCookieViaCdp(cdp, rawCookie, options = {}) {
    if (!rawCookie || typeof rawCookie !== 'object') throw new Error('Invalid cookie payload');
    const name = typeof rawCookie.name === 'string' ? rawCookie.name.trim() : '';
    if (!name) throw new Error('Cookie name is required');
    const pathValue = normalizeCookiePath(rawCookie.path);
    const domainInput = typeof rawCookie.domain === 'string' ? rawCookie.domain.trim().toLowerCase() : '';
    let host = normalizeCookieHostLike(domainInput || '');
    if (!host && typeof rawCookie.url === 'string') host = normalizeCookieHostLike(rawCookie.url);
    if (!host && options && options.defaultSiteHost) host = normalizeCookieHostLike(options.defaultSiteHost);
    if (!host) throw new Error(`Cookie "${name}" missing domain/url`);
    const domainValue = domainInput
        ? (domainInput.startsWith('.') ? `.${host}` : host)
        : host;
    await cdp.send('Network.deleteCookies', {
        name,
        domain: domainValue,
        path: pathValue,
    });
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

    // Cookie management REST API
    const profileCookieSitesMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/cookies\/sites$/);
    const profileCookiesMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/cookies$/);
    const profileCookieDeleteMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/cookies\/delete$/);
    const profileCookieClearMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/cookies\/clear$/);
    const profileCookieExportMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/cookies\/export$/);
    const profileCookieImportMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/cookies\/import$/);

    const parseJsonBody = () => {
        try {
            return body ? JSON.parse(body) : {};
        } catch (e) {
            throw new Error('Invalid JSON body');
        }
    };
    const getProfileFromApiMatch = (matchObj) => {
        if (!matchObj || !matchObj[1]) return null;
        const idOrName = decodeURIComponent(matchObj[1]);
        return findProfile(idOrName) || null;
    };

    // GET /api/profiles/:idOrName/cookies/sites
    if (method === 'GET' && profileCookieSitesMatch) {
        const profile = getProfileFromApiMatch(profileCookieSitesMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        const result = await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                const cookies = raw.map(toCookieRecord).filter(Boolean);
                const sites = summarizeCookieSites(cookies);
                return {
                    sites,
                    totalCookies: cookies.length,
                    totalSites: sites.length,
                };
            });
        });
        return { success: true, profileId: profile.id, profileName: profile.name, ...result };
    }

    // GET /api/profiles/:idOrName/cookies?site=example.com
    if (method === 'GET' && profileCookiesMatch) {
        const profile = getProfileFromApiMatch(profileCookiesMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        const site = normalizeCookieSiteInput(params.get('site') || '');
        const result = await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                let cookies = raw.map(toCookieRecord).filter(Boolean);
                if (site) cookies = cookies.filter(rec => cookieRecordMatchesSite(rec, site));
                cookies.sort((a, b) => {
                    const siteCmp = String(a.site || '').localeCompare(String(b.site || ''));
                    if (siteCmp !== 0) return siteCmp;
                    const hostCmp = String(a.host || '').localeCompare(String(b.host || ''));
                    if (hostCmp !== 0) return hostCmp;
                    const nameCmp = String(a.name || '').localeCompare(String(b.name || ''));
                    if (nameCmp !== 0) return nameCmp;
                    return String(a.path || '').localeCompare(String(b.path || ''));
                });
                return { cookies, total: cookies.length, site: site || null };
            });
        });
        return { success: true, profileId: profile.id, profileName: profile.name, ...result };
    }

    // POST /api/profiles/:idOrName/cookies
    // body: { site?: string, cookie: { name, value, domain?, path?, secure?, httpOnly?, sameSite?, expires?, session?, url? } }
    if (method === 'POST' && profileCookiesMatch) {
        const profile = getProfileFromApiMatch(profileCookiesMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        let payload = {};
        try {
            payload = parseJsonBody();
        } catch (e) {
            return { status: 400, data: { success: false, error: e.message } };
        }
        if (!payload.cookie || typeof payload.cookie !== 'object') {
            return { status: 400, data: { success: false, error: 'cookie object is required' } };
        }
        const site = normalizeCookieSiteInput(payload.site || params.get('site') || '');
        const result = await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                const normalized = await setCookieViaCdp(cdp, payload.cookie, { defaultSiteHost: site || null });
                const raw = await getAllCookiesFromCdp(cdp);
                const cookies = raw.map(toCookieRecord).filter(Boolean);
                const normDomain = normalizeCookieHostLike(normalized.domain || '');
                const saved = cookies.find(item => (
                    item.name === normalized.name
                    && normalizeCookieHostLike(item.domain || '') === normDomain
                    && normalizeCookiePath(item.path) === normalizeCookiePath(normalized.path)
                )) || null;
                return {
                    cookie: saved || {
                        name: normalized.name,
                        value: normalized.value,
                        domain: normalized.domain,
                        path: normalized.path,
                        secure: normalized.secure,
                        httpOnly: normalized.httpOnly,
                        sameSite: normalized.sameSite || '',
                        expires: normalized.expires || null,
                    },
                };
            });
        });
        return { success: true, profileId: profile.id, profileName: profile.name, ...result };
    }

    // POST /api/profiles/:idOrName/cookies/delete
    // body: { site?: string, cookie: { name, domain?, path?, url? } }
    if (method === 'POST' && profileCookieDeleteMatch) {
        const profile = getProfileFromApiMatch(profileCookieDeleteMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        let payload = {};
        try {
            payload = parseJsonBody();
        } catch (e) {
            return { status: 400, data: { success: false, error: e.message } };
        }
        if (!payload.cookie || typeof payload.cookie !== 'object') {
            return { status: 400, data: { success: false, error: 'cookie object is required' } };
        }
        const site = normalizeCookieSiteInput(payload.site || params.get('site') || '');
        await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                await deleteCookieViaCdp(cdp, payload.cookie, { defaultSiteHost: site || null });
                return true;
            });
        });
        return { success: true, profileId: profile.id, profileName: profile.name };
    }

    // POST /api/profiles/:idOrName/cookies/clear
    // body: { site?: string }
    if (method === 'POST' && profileCookieClearMatch) {
        const profile = getProfileFromApiMatch(profileCookieClearMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        let payload = {};
        try {
            payload = parseJsonBody();
        } catch (e) {
            return { status: 400, data: { success: false, error: e.message } };
        }
        const site = normalizeCookieSiteInput(payload.site || params.get('site') || '');
        const result = await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                const records = raw.map(toCookieRecord).filter(Boolean);
                if (!site) {
                    await cdp.send('Network.clearBrowserCookies');
                    return { removed: records.length, site: null };
                }
                const targets = records.filter(rec => cookieRecordMatchesSite(rec, site));
                const seen = new Set();
                let removed = 0;
                for (const rec of targets) {
                    const domainRaw = typeof rec.domain === 'string' ? rec.domain.trim().toLowerCase() : '';
                    const domainHost = normalizeCookieHostLike(domainRaw || '');
                    const domainValue = domainRaw
                        ? (domainRaw.startsWith('.') ? (domainHost ? `.${domainHost}` : domainRaw) : (domainHost || domainRaw))
                        : (domainHost || undefined);
                    const pathValue = normalizeCookiePath(rec.path);
                    const key = `${rec.name}|${domainValue || ''}|${pathValue}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    try {
                        await cdp.send('Network.deleteCookies', {
                            name: rec.name,
                            domain: domainValue || undefined,
                            path: pathValue,
                        });
                        removed += 1;
                    } catch (e) { }
                }
                return { removed, site };
            });
        });
        return { success: true, profileId: profile.id, profileName: profile.name, ...result };
    }

    // GET /api/profiles/:idOrName/cookies/export?site=example.com
    if (method === 'GET' && profileCookieExportMatch) {
        const profile = getProfileFromApiMatch(profileCookieExportMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        const site = normalizeCookieSiteInput(params.get('site') || '');
        const result = await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                let cookies = raw.map(toCookieRecord).filter(Boolean);
                if (site) cookies = cookies.filter(rec => cookieRecordMatchesSite(rec, site));
                return { cookies, site: site || null };
            });
        });
        return {
            success: true,
            version: 1,
            exportedAt: new Date().toISOString(),
            profileId: profile.id,
            profileName: profile.name,
            site: result.site || null,
            total: result.cookies.length,
            cookies: result.cookies.map((item) => ({
                name: item.name,
                value: item.value,
                domain: item.domain,
                path: item.path,
                secure: item.secure,
                httpOnly: item.httpOnly,
                sameSite: item.sameSite || undefined,
                expires: item.expires || undefined,
                session: item.session === true,
            })),
        };
    }

    // POST /api/profiles/:idOrName/cookies/import
    // body: { site?: string, mode?: "merge"|"replace", content: object|string|array }
    if (method === 'POST' && profileCookieImportMatch) {
        const profile = getProfileFromApiMatch(profileCookieImportMatch);
        if (!profile) return { status: 404, data: { success: false, error: 'Profile not found' } };
        let payload = {};
        try {
            payload = parseJsonBody();
        } catch (e) {
            return { status: 400, data: { success: false, error: e.message } };
        }
        if (!payload || typeof payload !== 'object') {
            return { status: 400, data: { success: false, error: 'Invalid JSON body' } };
        }
        const mode = String(payload.mode || 'merge').toLowerCase() === 'replace' ? 'replace' : 'merge';
        const site = normalizeCookieSiteInput(payload.site || params.get('site') || '');
        const content = (payload.content !== undefined) ? payload.content : payload;
        let importItems = [];
        try {
            importItems = normalizeCookieImportPayload(content);
        } catch (e) {
            return { status: 400, data: { success: false, error: e.message || String(e) } };
        }
        if (!importItems.length) {
            return { status: 400, data: { success: false, error: 'No cookies found in import payload' } };
        }

        const result = await queueProfileCookieOperation(profile.id, async () => {
            return withProfileCookieCdp(profile.id, async ({ cdp }) => {
                const errors = [];
                let sourceItems = importItems;
                if (site) {
                    sourceItems = sourceItems.filter((item) => {
                        try {
                            const normalized = normalizeCookieMutationInput(item, { defaultSiteHost: site });
                            const rec = toCookieRecord(normalized);
                            return cookieRecordMatchesSite(rec, site);
                        } catch (e) {
                            return false;
                        }
                    });
                }

                if (!sourceItems.length) {
                    return { imported: 0, failed: 0, total: 0, errors: [], site: site || null, mode };
                }

                if (mode === 'replace') {
                    if (site) {
                        const rawBefore = await getAllCookiesFromCdp(cdp);
                        const beforeRecords = rawBefore.map(toCookieRecord).filter(Boolean);
                        const toRemove = beforeRecords.filter(rec => cookieRecordMatchesSite(rec, site));
                        const seen = new Set();
                        for (const rec of toRemove) {
                            const domainRaw = typeof rec.domain === 'string' ? rec.domain.trim().toLowerCase() : '';
                            const domainHost = normalizeCookieHostLike(domainRaw || '');
                            const domainValue = domainRaw
                                ? (domainRaw.startsWith('.') ? (domainHost ? `.${domainHost}` : domainRaw) : (domainHost || domainRaw))
                                : (domainHost || undefined);
                            const pathValue = normalizeCookiePath(rec.path);
                            const key = `${rec.name}|${domainValue || ''}|${pathValue}`;
                            if (seen.has(key)) continue;
                            seen.add(key);
                            try {
                                await cdp.send('Network.deleteCookies', {
                                    name: rec.name,
                                    domain: domainValue || undefined,
                                    path: pathValue,
                                });
                            } catch (e) { }
                        }
                    } else {
                        await cdp.send('Network.clearBrowserCookies');
                    }
                }

                let imported = 0;
                for (const item of sourceItems) {
                    try {
                        await setCookieViaCdp(cdp, item, { defaultSiteHost: site || null });
                        imported += 1;
                    } catch (e) {
                        if (errors.length < 20) {
                            const name = item && item.name ? item.name : 'unknown';
                            errors.push(`${name}: ${e.message || String(e)}`);
                        }
                    }
                }
                return {
                    imported,
                    failed: sourceItems.length - imported,
                    total: sourceItems.length,
                    errors,
                    site: site || null,
                    mode,
                };
            });
        });

        return { success: true, profileId: profile.id, profileName: profile.name, ...result };
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

function emitProfileStatusEvent(target, id, status, meta = {}) {
    try {
        if (!target || typeof target.send !== 'function') return;
        if (typeof target.isDestroyed === 'function' && target.isDestroyed()) return;
        const normalize = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
        target.send('profile-status', {
            id,
            status,
            errorCode: normalize(meta.errorCode),
            errorStage: normalize(meta.errorStage),
            errorMessage: normalize(meta.errorMessage),
        });
    } catch (e) { }
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
        title: "GeekEZ Browser", backgroundColor: '#1a1f36',
        icon: path.join(__dirname, 'icon.png'),
        titleBarOverlay: { color: '#1a1f36', symbolColor: '#ffffff', height: 35 },
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

app.on('before-quit', () => {
    try { stopUpstreamPreProxyEngine('before-quit').catch(() => { }); } catch (e) { }
});

// IPC Handles
ipcMain.handle('get-app-info', () => { return { name: app.getName(), version: app.getVersion() }; });

const FETCH_MAX_TEXT_BYTES = 10 * 1024 * 1024; // 10MB
const FETCH_MAX_REDIRECTS = 5;
const SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY = 'subscriptionPrivateAllowlist';
const SETTINGS_PROXY_BATCH_TEST_STRATEGY_KEY = 'proxyBatchTestStrategy';

function normalizeProxyBatchTestStrategySafe(input) {
    try {
        return normalizeProxyBatchTestStrategy(input, {
            hardwareConcurrency: os.cpus && Array.isArray(os.cpus()) ? os.cpus().length : 4
        });
    } catch (e) {
        return normalizeProxyBatchTestStrategy(null, {
            hardwareConcurrency: os.cpus && Array.isArray(os.cpus()) ? os.cpus().length : 4
        });
    }
}

async function getFetchUrlPolicyOptions() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) return {};
        const settings = await fs.readJson(SETTINGS_FILE);
        const list = normalizeAllowedPrivateHostList(
            settings && Array.isArray(settings[SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY])
                ? settings[SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY]
                : []
        );
        return { allowedPrivateHosts: list };
    } catch (e) {
        return {};
    }
}

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

// ============================================================================
// Upstream (Pre-Proxy) for App Network Requests
// - Used for subscription updates, update checks/downloads, etc.
// - Must follow the same pre-proxy selection logic as profile chain proxy so
//   latency and reachability stay consistent with user expectation.
// ============================================================================
const HTTP_REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

let upstreamProxyState = {
    key: '',
    engine: '',
    localPort: 0,
    configPath: '',
    process: null,
    nodeId: '',
    nodeRemark: '',
    nodeUrl: '',
    lastProbeAt: 0,
    lastProbeOk: false,
    lastProbeError: '',
};
let upstreamProxyStartPromise = null;

function isChildProcessAlive(proc) {
    if (!proc) return false;
    if (proc.killed) return false;
    if (proc.exitCode !== null && proc.exitCode !== undefined) return false;
    return true;
}

function resolveUpstreamPreProxyTarget(settings) {
    if (!settings || settings.enablePreProxy !== true) return null;
    const list = settings && Array.isArray(settings.preProxies) ? settings.preProxies : [];
    const active = list.filter((p) => p && p.enable !== false && p.url);
    if (active.length === 0) return null;

    const mode = (settings && typeof settings.mode === 'string') ? settings.mode : 'single';
    if (mode === 'single') {
        const sel = settings && settings.selectedId ? String(settings.selectedId) : '';
        return active.find((p) => p && String(p.id) === sel) || active[0];
    }
    if (mode === 'balance') {
        return active[Math.floor(Math.random() * active.length)];
    }
    if (mode === 'failover') {
        return active[0];
    }
    return active[0];
}

function buildUpstreamPreProxyKey(node) {
    if (!node) return '';
    const id = node.id != null ? String(node.id) : '';
    const url = node.url != null ? normalizeProxyInputRaw(String(node.url)) : '';
    if (!id || !url) return '';
    return `${id}|${url}`;
}

async function stopUpstreamPreProxyEngine(reason = '') {
    const prev = upstreamProxyState;
    const hadState = !!(prev && (prev.key || prev.localPort || prev.process || prev.configPath));
    upstreamProxyState = {
        key: '',
        engine: '',
        localPort: 0,
        configPath: '',
        process: null,
        nodeId: '',
        nodeRemark: '',
        nodeUrl: '',
        lastProbeAt: 0,
        lastProbeOk: false,
        lastProbeError: '',
    };

    try {
        const pid = prev && prev.process && prev.process.pid ? prev.process.pid : null;
        if (pid) await forceKill(pid);
    } catch (e) { }

    try {
        if (prev && prev.configPath && fs.existsSync(prev.configPath)) fs.unlinkSync(prev.configPath);
    } catch (e) { }

    if (reason && hadState) {
        try { console.log('[upstream-proxy] stopped', reason); } catch (e) { }
    }
}

async function ensureUpstreamPreProxyEngine(settings, forcedTarget = null) {
    const target = forcedTarget || resolveUpstreamPreProxyTarget(settings);
    if (!target) {
        await stopUpstreamPreProxyEngine('disabled');
        return null;
    }

    const key = buildUpstreamPreProxyKey(target);
    if (!key) {
        await stopUpstreamPreProxyEngine('invalid_target');
        return null;
    }

    if (upstreamProxyState.key === key && isChildProcessAlive(upstreamProxyState.process) && upstreamProxyState.localPort) {
        return { endpoint: `127.0.0.1:${upstreamProxyState.localPort}`, target };
    }

    // If another caller is starting, wait then re-check.
    if (upstreamProxyStartPromise) {
        try { await upstreamProxyStartPromise; } catch (e) { }
        if (upstreamProxyState.key === key && isChildProcessAlive(upstreamProxyState.process) && upstreamProxyState.localPort) {
            return { endpoint: `127.0.0.1:${upstreamProxyState.localPort}`, target };
        }
    }

    upstreamProxyStartPromise = (async () => {
        await stopUpstreamPreProxyEngine('switch');

        const rawUrl = String(target.url || '');
        const normalizedUrl = normalizeProxyInputRaw(rawUrl);
        if (!normalizedUrl) {
            const err = new Error('Upstream proxy URL is empty');
            err.code = 'UPSTREAM_PROXY_EMPTY';
            throw err;
        }

        const localPort = await getPort();
        const configPath = path.join(app.getPath('userData'), `upstream_proxy_${localPort}.json`);
        const traceId = `upstream-${localPort}`;

        // Try a small engine plan to reduce "works in test but fails in app" drift.
        const candidates = [];
        try { candidates.push(inferProxyRuntimeEngine(normalizedUrl)); } catch (e) { }
        try {
            const plan = resolveProxyTestEngines(normalizedUrl, 'auto');
            (plan && Array.isArray(plan.engines) ? plan.engines : []).forEach((e) => candidates.push(e));
        } catch (e) { }
        candidates.push('sing-box', 'xray');
        const engines = Array.from(new Set(candidates.filter((e) => e === 'xray' || e === 'sing-box')));

        let started = null;
        let lastErr = null;
        for (const engine of engines) {
            try {
                started = await startProxyProcessForTest({
                    engine,
                    proxyStr: rawUrl,
                    localPort,
                    configPath,
                    traceId,
                    preProxyConfig: null,
                });
                if (started && started.process) {
                    upstreamProxyState = {
                        key,
                        engine,
                        localPort,
                        configPath,
                        process: started.process,
                        nodeId: target.id != null ? String(target.id) : '',
                        nodeRemark: target.remark != null ? String(target.remark) : '',
                        nodeUrl: normalizedUrl,
                        lastProbeAt: 0,
                        lastProbeOk: false,
                        lastProbeError: '',
                    };
                    break;
                }
            } catch (e) {
                lastErr = e;
                try { if (started && started.process && started.process.pid) await forceKill(started.process.pid); } catch (ee) { }
                started = null;
            }
        }

        if (!started || !upstreamProxyState.localPort) {
            const err = lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'Failed to start upstream proxy engine'));
            if (!err.code) err.code = 'UPSTREAM_PROXY_ENGINE_START_FAILED';
            throw err;
        }

        // Give the engine a moment to boot before first request.
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { endpoint: `127.0.0.1:${upstreamProxyState.localPort}`, target };
    })();

    try {
        return await upstreamProxyStartPromise;
    } finally {
        upstreamProxyStartPromise = null;
    }
}

function getHeaderFromIncomingMessage(res, name) {
    const key = String(name || '').toLowerCase();
    const headers = res && res.headers ? res.headers : null;
    if (!headers || !key) return null;
    const v = headers[key];
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return null;
}

async function httpGetOnce(urlObj, { headers = {}, agent = undefined, signal = null, timeoutMs = 20_000 } = {}) {
    const lib = urlObj && urlObj.protocol === 'http:' ? http : https;
    return await new Promise((resolve, reject) => {
        const req = lib.get(urlObj, { headers, agent }, (res) => resolve(res));
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
            try { req.destroy(new Error('Timeout')); } catch (e) { }
        });

        if (signal) {
            if (signal.aborted) {
                try { req.destroy(new Error('Aborted')); } catch (e) { }
                return;
            }
            const onAbort = () => {
                try { req.destroy(new Error('Aborted')); } catch (e) { }
            };
            try { signal.addEventListener('abort', onAbort, { once: true }); } catch (e) { }
            req.on('close', () => {
                try { signal.removeEventListener('abort', onAbort); } catch (e) { }
            });
        }
    });
}

async function httpGetWithUrlPolicy(url, { headers = {}, agent = undefined, signal = null, timeoutMs = 20_000, maxRedirects = 5, urlPolicyOptions = {} } = {}) {
    let current = await parseHttpFetchUrlOrThrow(url, urlPolicyOptions);
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
        const res = await httpGetOnce(current, { headers, agent, signal, timeoutMs });
        const status = Number(res && res.statusCode);
        if (!HTTP_REDIRECT_STATUS.has(status)) return { res, finalUrl: current };

        const location = res && res.headers && res.headers.location ? String(res.headers.location) : '';
        res.resume();
        if (!location) throw new Error(`Redirect response missing location (HTTP ${status})`);
        if (redirectCount >= maxRedirects) throw new Error('Too many redirects');

        const nextUrl = new URL(location, current).toString();
        current = await parseHttpFetchUrlOrThrow(nextUrl, urlPolicyOptions);
    }
    throw new Error('Too many redirects');
}

async function readIncomingMessageTextWithLimit(res, maxBytes) {
    const len = getHeaderFromIncomingMessage(res, 'content-length');
    if (len && Number(len) > maxBytes) {
        res.resume();
        throw new Error(`Response too large (>${maxBytes} bytes)`);
    }

    const decoder = new TextDecoder('utf-8');
    let received = 0;
    let text = '';
    for await (const chunk of res) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buf.length;
        if (received > maxBytes) {
            try { res.destroy(); } catch (e) { }
            throw new Error(`Response too large (>${maxBytes} bytes)`);
        }
        text += decoder.decode(buf, { stream: true });
    }
    text += decoder.decode();
    return text;
}

async function probeUpstreamConnectivityCached(endpoint, { maxAgeMs = 30_000, timeoutMs = 6000, parallelism = 2 } = {}) {
    const now = Date.now();
    if (
        upstreamProxyState
        && upstreamProxyState.localPort
        && upstreamProxyState.lastProbeAt
        && (now - upstreamProxyState.lastProbeAt) < maxAgeMs
    ) {
        return upstreamProxyState.lastProbeOk
            ? { ok: true, latencyMs: null, url: '', cached: true }
            : { ok: false, latencyMs: null, url: '', error: upstreamProxyState.lastProbeError || 'Upstream probe failed (cached)', cached: true };
    }

    const agent = new SocksProxyAgent(`socks5h://${endpoint}`);
    const result = await probeConnectivityThroughSocksAgent(agent, { timeoutMs, parallelism });
    upstreamProxyState.lastProbeAt = now;
    upstreamProxyState.lastProbeOk = !!(result && result.ok);
    upstreamProxyState.lastProbeError = (result && result.error) ? String(result.error) : '';
    return result;
}

ipcMain.handle('fetch-url', async (e, url) => {
    try {
        const urlPolicyOptions = await getFetchUrlPolicyOptions();
        const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 20_000);
        try {
            const upstream = await ensureUpstreamPreProxyEngine(settings);
            if (!upstream) {
                const res = await fetchWithUrlPolicy(url, {
                    signal: ac.signal,
                    maxRedirects: FETCH_MAX_REDIRECTS,
                    ...urlPolicyOptions,
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return await readResponseTextWithLimit(res, FETCH_MAX_TEXT_BYTES);
            }
            const agent = new SocksProxyAgent(`socks5h://${upstream.endpoint}`);
            const { res } = await httpGetWithUrlPolicy(url, {
                headers: {},
                agent,
                signal: ac.signal,
                timeoutMs: 20_000,
                maxRedirects: FETCH_MAX_REDIRECTS,
                urlPolicyOptions,
            });
            const status = Number(res && res.statusCode);
            if (!status || status >= 400) {
                res.resume();
                throw new Error('HTTP ' + (status || '0'));
            }
            return await readIncomingMessageTextWithLimit(res, FETCH_MAX_TEXT_BYTES);
        } finally {
            clearTimeout(timer);
        }
    } catch (e) {
        throw (e && e.message) ? e.message : String(e);
    }
});
ipcMain.handle('fetch-url-conditional', async (e, { url, etag, lastModified }) => {
    try {
        const urlPolicyOptions = await getFetchUrlPolicyOptions();
        const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
        const headers = {};
        if (etag) headers['If-None-Match'] = String(etag);
        if (lastModified) headers['If-Modified-Since'] = String(lastModified);
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 20_000);
        try {
            const upstream = await ensureUpstreamPreProxyEngine(settings);
            if (!upstream) {
                const res = await fetchWithUrlPolicy(url, {
                    headers,
                    signal: ac.signal,
                    maxRedirects: FETCH_MAX_REDIRECTS,
                    ...urlPolicyOptions,
                });
                if (res.status === 304) {
                    return { notModified: true };
                }
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const text = await readResponseTextWithLimit(res, FETCH_MAX_TEXT_BYTES);
                const newEtag = res.headers.get('etag');
                const newLastModified = res.headers.get('last-modified');
                return { notModified: false, content: text, etag: newEtag, lastModified: newLastModified };
            }

            const agent = new SocksProxyAgent(`socks5h://${upstream.endpoint}`);
            const { res } = await httpGetWithUrlPolicy(url, {
                headers,
                agent,
                signal: ac.signal,
                timeoutMs: 20_000,
                maxRedirects: FETCH_MAX_REDIRECTS,
                urlPolicyOptions,
            });
            const status = Number(res && res.statusCode);
            if (status === 304) {
                res.resume();
                return { notModified: true };
            }
            if (!status || status >= 400) {
                res.resume();
                throw new Error('HTTP ' + (status || '0'));
            }
            const text = await readIncomingMessageTextWithLimit(res, FETCH_MAX_TEXT_BYTES);
            const newEtag = getHeaderFromIncomingMessage(res, 'etag');
            const newLastModified = getHeaderFromIncomingMessage(res, 'last-modified');
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
        const agent = new SocksProxyAgent(`socks5h://127.0.0.1:${tempPort}`);
        const connectivity = await probeConnectivityThroughSocksAgent(agent, 5000, false);
        const result = connectivity && connectivity.ok
            ? { success: true, latency: connectivity.latencyMs }
            : { success: false, msg: (connectivity && connectivity.error) ? String(connectivity.error) : "Err" };
        await forceKill(xrayProcess.pid); try { fs.unlinkSync(tempConfigPath); } catch (e) { } return result;
    } catch (err) { return { success: false, msg: err.message }; }
});

ipcMain.handle('test-proxy-node', async (e, input, legacyOptions) => {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        const proxyStr = input.proxyStr || input.url || '';
        const engineHint = input.engineHint || 'auto';
        const options = input.options && typeof input.options === 'object'
            ? input.options
            : (legacyOptions && typeof legacyOptions === 'object' ? legacyOptions : {});
        return await testProxyNodeInternal(proxyStr, engineHint, options);
    }
    return await testProxyNodeInternal(input, 'auto', legacyOptions && typeof legacyOptions === 'object' ? legacyOptions : {});
});

// Test a profile's effective proxy (bindId resolved + pre-proxy override applied) and persist diagnostics.
ipcMain.handle('test-profile-proxy', async (e, input) => {
    const payload = (input && typeof input === 'object' && !Array.isArray(input)) ? input : { profileId: input };
    const profileId = payload.profileId || payload.id || '';
    const resolvedProfile = resolveProfileDirOrThrow(profileId);

    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
    const profile = profiles.find(p => p && p.id === resolvedProfile.id);
    if (!profile) {
        const err = new Error('Profile not found');
        err.code = 'PROFILE_NOT_FOUND';
        throw err;
    }

    const beforeProxyStr = profile.proxyStr || '';
    const bindId = normalizeProxyBindId(profile.proxyBindId);
    if (bindId) {
        const node = assertProxyBindNodeExistsOrThrow(settings, bindId);
        if (node && node.url) profile.proxyStr = String(node.url);
    }
    if (!profile.proxyStr || !String(profile.proxyStr).trim()) {
        const err = new Error('Profile proxy is empty');
        err.code = 'PROFILE_PROXY_EMPTY';
        throw err;
    }

    const engineHint = payload.engineHint || 'auto';
    const rawOptions = (payload.options && typeof payload.options === 'object') ? payload.options : {};
    const preProxyOverride = normalizePreProxyOverrideToken(profile.preProxyOverride || 'default');
    const options = { ...rawOptions, preProxyOverride };
    if (!options.profile) options.profile = 'standard';

    const result = await testProxyNodeInternal(profile.proxyStr, engineHint, options);

    try {
        profile.diagnostics = profile.diagnostics || {};
        profile.diagnostics.lastProxyCheck = {
            checkedAt: Date.now(),
            ok: Boolean(result && result.ok),
            engine: result && (result.engine || result.primaryEngine) ? String(result.engine || result.primaryEngine) : '',
            protocol: result && result.protocol ? String(result.protocol) : '',
            latencyMs: result && result.connectivity && typeof result.connectivity.latencyMs === 'number' ? result.connectivity.latencyMs : null,
            ip: result && result.ip ? String(result.ip) : (result && result.geo && result.geo.ip ? String(result.geo.ip) : ''),
            geo: result && result.geo ? result.geo : null,
            finalCode: result && (result.finalCode || result.code) ? String(result.finalCode || result.code) : '',
            finalMessage: result && (result.finalMessage || result.error) ? String(result.finalMessage || result.error) : '',
            preProxy: result && result.testOptions && result.testOptions.preProxy ? result.testOptions.preProxy : null,
            traceId: result && result.traceId ? String(result.traceId) : '',
        };

        // Persist any proxyStr refresh from binding + diagnostics.
        if (beforeProxyStr !== profile.proxyStr) {
            // keep updated proxyStr in storage so UI stays in sync
        }
        await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
    } catch (e) { }

    return result;
});

function normalizeAllocatorStrategy(input) {
    const token = String(input || '').trim().toLowerCase();
    if (token === 'latency' || token === 'latency_priority' || token === 'latency-priority') return 'latency_priority';
    return 'round_robin';
}

function normalizeRegionToken(input) {
    if (input == null) return '';
    const s = String(input).trim();
    if (!s) return '';
    if (s.length > 120) return s.slice(0, 120);
    return s;
}

function buildRegionKey(country, city) {
    const c = normalizeRegionToken(country);
    const ci = normalizeRegionToken(city);
    return ci ? `${c}::${ci}` : c;
}

function getNodeRegionInfo(node) {
    const info = node && node.ipInfo && typeof node.ipInfo === 'object' ? node.ipInfo : null;
    const country = info && info.country ? normalizeRegionToken(info.country) : '';
    const city = info && info.city ? normalizeRegionToken(info.city) : '';
    return { country, city };
}

function nodeMatchesRegion(node, country, city) {
    const wantCountry = normalizeRegionToken(country);
    const wantCity = normalizeRegionToken(city);
    const got = getNodeRegionInfo(node);
    if (!wantCountry) return false;
    if (!got.country) return false;
    if (got.country.toLowerCase() !== wantCountry.toLowerCase()) return false;
    if (wantCity) {
        if (!got.city) return false;
        if (got.city.toLowerCase() !== wantCity.toLowerCase()) return false;
    }
    return true;
}

function getBoundProxyBindIdSet(profiles) {
    const set = new Set();
    (profiles || []).forEach((p) => {
        const id = normalizeProxyBindId(p && p.proxyBindId);
        if (id) set.add(id);
    });
    return set;
}

function buildAllocatorPool(settings, { country, city, includeUntested = false } = {}) {
    const nodes = settings && Array.isArray(settings.preProxies) ? settings.preProxies : [];
    return nodes.filter((n) => {
        if (!n || !n.id || !n.url) return false;
        if (n.enable === false) return false;
        if (!nodeMatchesRegion(n, country, city)) return false;
        // Allocation should not pick known-bad nodes. Default: PASS only.
        if (n.lastTestOk !== true && !includeUntested) return false;
        if (n.lastTestOk === false) return false;
        return true;
    });
}

function sortAllocatorPool(pool, strategy) {
    const list = Array.isArray(pool) ? pool.slice() : [];
    const st = normalizeAllocatorStrategy(strategy);
    if (st === 'latency_priority') {
        list.sort((a, b) => {
            const la = (a && typeof a.latency === 'number' && a.latency >= 0) ? a.latency : Number.POSITIVE_INFINITY;
            const lb = (b && typeof b.latency === 'number' && b.latency >= 0) ? b.latency : Number.POSITIVE_INFINITY;
            if (la !== lb) return la - lb;
            return String(a && a.id || '').localeCompare(String(b && b.id || ''));
        });
        return list;
    }
    // round_robin: stable sort by id (keeps order consistent across restarts).
    list.sort((a, b) => String(a && a.id || '').localeCompare(String(b && b.id || '')));
    return list;
}

function selectNodesRoundRobin(poolSorted, boundSet, { regionKey, cursorMap, requestedCount }) {
    const picked = [];
    const len = Array.isArray(poolSorted) ? poolSorted.length : 0;
    if (len === 0) return { picked, cursorId: '' };

    const lastIdRaw = cursorMap && typeof cursorMap === 'object' ? cursorMap[regionKey] : '';
    const lastId = normalizeProxyBindId(lastIdRaw);
    let start = 0;
    if (lastId) {
        const idx = poolSorted.findIndex((n) => n && String(n.id) === lastId);
        if (idx >= 0) start = (idx + 1) % len;
    }

    for (let i = 0; i < len && picked.length < requestedCount; i++) {
        const node = poolSorted[(start + i) % len];
        const id = node && node.id ? String(node.id) : '';
        if (!id) continue;
        if (boundSet && boundSet.has(id)) continue;
        picked.push(node);
    }

    const cursorId = picked.length > 0 && picked[picked.length - 1] && picked[picked.length - 1].id
        ? String(picked[picked.length - 1].id)
        : lastId;
    return { picked, cursorId };
}

function selectNodesLatencyPriority(poolSorted, boundSet, requestedCount) {
    const picked = [];
    for (let i = 0; i < (poolSorted || []).length && picked.length < requestedCount; i++) {
        const node = poolSorted[i];
        const id = node && node.id ? String(node.id) : '';
        if (!id) continue;
        if (boundSet && boundSet.has(id)) continue;
        picked.push(node);
    }
    return picked;
}

ipcMain.handle('allocate-proxy-profiles', async (e, input) => {
    const payload = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
    const requestedCount = Math.max(1, Math.min(200, Math.round(Number(payload.count || payload.requestedCount || 1) || 1)));
    const country = normalizeRegionToken(payload.country);
    const city = normalizeRegionToken(payload.city);
    const strategy = normalizeAllocatorStrategy(payload.strategy || payload.allocateStrategy);
    const allowPartial = payload.allowPartial !== false;
    const includeUntested = Boolean(payload.includeUntested);
    if (!country) {
        const err = new Error('Country is required');
        err.code = 'ALLOC_COUNTRY_REQUIRED';
        throw err;
    }

    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
    const boundSet = getBoundProxyBindIdSet(profiles);

    const pool = buildAllocatorPool(settings, { country, city, includeUntested });
    const poolSorted = sortAllocatorPool(pool, strategy);
    const regionKey = buildRegionKey(country, city);

    const cursorMap = (settings && typeof settings === 'object' && settings.proxyAllocatorCursor && typeof settings.proxyAllocatorCursor === 'object')
        ? settings.proxyAllocatorCursor
        : {};

    let picked = [];
    let nextCursorId = normalizeProxyBindId(cursorMap[regionKey]);
    if (strategy === 'round_robin') {
        const out = selectNodesRoundRobin(poolSorted, boundSet, { regionKey, cursorMap, requestedCount });
        picked = out.picked;
        nextCursorId = out.cursorId;
    } else {
        picked = selectNodesLatencyPriority(poolSorted, boundSet, requestedCount);
        // latency_priority doesn't need cursor; keep last cursor id for consistency.
    }

    const shortage = Math.max(0, requestedCount - picked.length);
    if (picked.length === 0) {
        return {
            success: false,
            code: 'ALLOC_NO_AVAILABLE_NODES',
            error: 'No available nodes for this region (PASS-only).',
            details: {
                requestedCount,
                country,
                city,
                strategy,
                poolSize: poolSorted.length,
                boundCount: boundSet.size,
                includeUntested
            }
        };
    }
    if (!allowPartial && shortage > 0) {
        return {
            success: false,
            code: 'ALLOC_INSUFFICIENT_NODES',
            error: `Insufficient nodes: requested=${requestedCount} available=${picked.length}`,
            details: { requestedCount, available: picked.length, shortage, country, city, strategy, includeUntested }
        };
    }

    const namePrefixRaw = typeof payload.namePrefix === 'string' ? payload.namePrefix.trim() : '';
    const tags = Array.isArray(payload.tags)
        ? payload.tags.map(s => String(s || '').trim()).filter(Boolean)
        : (typeof payload.tags === 'string' ? payload.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []);

    const timezone = payload.timezone ? String(payload.timezone) : 'Auto';
    const language = payload.language ? String(payload.language) : (payload.lang ? String(payload.lang) : null);

    const proxyMode = (payload.proxyMode === 'tun') ? 'tun' : 'app_proxy';
    let proxyEngine = proxyMode === 'tun' ? 'sing-box' : (payload.proxyEngine || 'xray');
    const tun = (proxyMode === 'tun' && payload.tun && typeof payload.tun === 'object') ? payload.tun : undefined;

    const proxyConsistency = String(payload.proxyConsistency || payload.onMismatch || 'warn');
    const createdAt = Date.now();
    const created = [];
    const newlyBound = new Set();

    for (let i = 0; i < picked.length; i++) {
        const node = picked[i];
        const bindId = node && node.id ? String(node.id) : '';
        if (!bindId) continue;
        if (boundSet.has(bindId) || newlyBound.has(bindId)) continue;
        const proxyStr = node && node.url ? String(node.url) : '';
        if (!proxyStr) continue;

        let name = '';
        if (namePrefixRaw) {
            name = picked.length > 1
                ? `${namePrefixRaw}-${String(i + 1).padStart(2, '0')}`
                : namePrefixRaw;
        } else {
            const label = city ? `${country} ${city}` : country;
            name = picked.length > 1
                ? `${label}-${String(i + 1).padStart(2, '0')}`
                : label;
        }

        const fingerprint = generateFingerprint();
        if (timezone) fingerprint.timezone = timezone;
        if (language && language !== 'auto') fingerprint.language = language;

        const consistencyPolicy = { enforce: true, onMismatch: proxyConsistency };
        const allowAutofix = { language: proxyConsistency === 'autofix', geo: proxyConsistency === 'autofix' };

        const newProfile = {
            id: uuidv4(),
            name,
            proxyStr,
            proxyBindId: bindId,
            proxyEngine,
            proxyMode,
            tun,
            tags,
            fingerprint,
            proxyPolicy: { autoLink: true, consistencyPolicy, allowAutofix },
            preProxyOverride: 'default',
            isSetup: false,
            createdAt: createdAt + i
        };

        profiles.push(newProfile);
        newlyBound.add(bindId);
        created.push({ id: newProfile.id, name: newProfile.name, proxyBindId: bindId });
    }

    await fs.writeJson(PROFILES_FILE, profiles);

    // Persist cursor for round_robin.
    if (!settings.proxyAllocatorCursor || typeof settings.proxyAllocatorCursor !== 'object') {
        settings.proxyAllocatorCursor = {};
    }
    if (strategy === 'round_robin' && nextCursorId) {
        settings.proxyAllocatorCursor[regionKey] = nextCursorId;
    }
    await fs.writeJson(SETTINGS_FILE, settings);

    return {
        success: true,
        requestedCount,
        createdCount: created.length,
        shortage,
        strategy,
        region: { country, city },
        cursorId: strategy === 'round_robin' ? (settings.proxyAllocatorCursor[regionKey] || '') : '',
        createdProfiles: created,
    };
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

let proxyTestTraceSeq = 0;

function buildProxyTestTraceId(seed, localPort) {
    const stable = crypto.createHash('sha1').update(String(seed || '')).digest('hex').slice(0, 8);
    proxyTestTraceSeq = (proxyTestTraceSeq + 1) % 0xffff;
    const seq = proxyTestTraceSeq.toString(16).padStart(4, '0');
    const portPart = Number.isFinite(localPort) ? String(localPort) : '0';
    return `${stable}-${seq}-${portPart}`;
}

function inferProxyTestEngine(proxyStr) {
    const plan = resolveEnginePlan(proxyStr, 'auto', { phase: 'test' });
    return plan && plan.primary ? plan.primary : 'xray';
}

function inferProxyRuntimeEngine(proxyStr) {
    const plan = resolveEnginePlan(proxyStr, 'auto', { phase: 'runtime' });
    return plan && plan.primary ? plan.primary : 'xray';
}

function inferProxyProtocolHint(proxyStr) {
    return inferProtocolFromInput(proxyStr);
}

function supportsEngineForProxy(proxyStr, engine) {
    const plan = resolveEnginePlan(proxyStr, engine, { phase: 'test' });
    if (engine === 'xray') return Boolean(plan && plan.engineSupport && plan.engineSupport.xray);
    if (engine === 'sing-box') return Boolean(plan && plan.engineSupport && plan.engineSupport.singBox);
    return false;
}

function resolveProxyTestEngines(proxyStr, engineHint) {
    const hint = (engineHint && engineHint !== 'auto') ? String(engineHint) : 'auto';
    const plan = resolveEnginePlan(proxyStr, hint, { phase: 'test' });
    return {
        primary: plan && plan.primary ? plan.primary : inferProxyTestEngine(proxyStr),
        engines: plan && Array.isArray(plan.engines) ? plan.engines : [],
        xrayCapable: Boolean(plan && plan.engineSupport && plan.engineSupport.xray),
        singboxCapable: Boolean(plan && plan.engineSupport && plan.engineSupport.singBox),
        parserSupport: plan && plan.parserSupport ? plan.parserSupport : { xray: false, singBox: false },
        probeSupport: plan && plan.probeSupport ? plan.probeSupport : { xray: false, singBox: false },
        capabilityReason: plan && plan.reason ? String(plan.reason) : '',
        protocol: plan && plan.protocol ? String(plan.protocol) : inferProxyProtocolHint(proxyStr),
    };
}

const CONNECTIVITY_HTTP_PROBES = getDefaultConnectivityProbes();

const PROXY_TEST_PROFILE_PRESETS = Object.freeze({
    quick: Object.freeze({
        profile: 'quick',
        probeTimeoutMs: 4500,
        ipTimeoutMs: 3500,
        geoTimeoutMs: 3500,
        probeCount: 2,
        probeParallelism: 2,
        includeGeo: false,
        engineBootWaitMs: 500,
    }),
    standard: Object.freeze({
        profile: 'standard',
        probeTimeoutMs: 7000,
        ipTimeoutMs: 8000,
        geoTimeoutMs: 8000,
        probeCount: 4,
        probeParallelism: 2,
        includeGeo: true,
        engineBootWaitMs: 800,
    }),
    deep: Object.freeze({
        profile: 'deep',
        probeTimeoutMs: 12000,
        ipTimeoutMs: 12000,
        geoTimeoutMs: 12000,
        probeCount: 4,
        probeParallelism: 3,
        includeGeo: true,
        engineBootWaitMs: 1200,
    }),
});

function clampProxyTestInt(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    const rounded = Math.round(num);
    if (rounded < min) return min;
    if (rounded > max) return max;
    return rounded;
}

function normalizeProxyTestProfile(profile) {
    const normalized = String(profile || '').trim().toLowerCase();
    if (normalized === 'quick' || normalized === 'standard' || normalized === 'deep') return normalized;
    return 'standard';
}

function normalizeProxyTestRuntimeOptions(input) {
    const source = input && typeof input === 'object' ? input : {};
    const profile = normalizeProxyTestProfile(source.profile || source.testProfile);
    const preset = PROXY_TEST_PROFILE_PRESETS[profile] || PROXY_TEST_PROFILE_PRESETS.standard;
    const normalized = {
        profile,
        probeTimeoutMs: clampProxyTestInt(source.probeTimeoutMs, 2000, 30000, preset.probeTimeoutMs),
        ipTimeoutMs: clampProxyTestInt(source.ipTimeoutMs, 2000, 30000, preset.ipTimeoutMs),
        geoTimeoutMs: clampProxyTestInt(source.geoTimeoutMs, 2000, 30000, preset.geoTimeoutMs),
        probeCount: clampProxyTestInt(source.probeCount, 1, getMaxConnectivityProbeCount(), preset.probeCount),
        probeParallelism: clampProxyTestInt(
            source.probeParallelism,
            1,
            getMaxConnectivityProbeCount(),
            Math.min(preset.probeParallelism || 1, preset.probeCount || 1)
        ),
        includeGeo: typeof source.includeGeo === 'boolean' ? source.includeGeo : preset.includeGeo,
        engineBootWaitMs: clampProxyTestInt(source.engineBootWaitMs, 200, 4000, preset.engineBootWaitMs),
    };
    if (normalized.probeParallelism > normalized.probeCount) {
        normalized.probeParallelism = normalized.probeCount;
    }
    return normalized;
}

function resolveConnectivityProbeList(protocol, runtimeOptions) {
    const normalizedProtocol = String(protocol || '').trim().toLowerCase();
    const minProbeCountByProtocol = new Set(['socks', 'socks5', 'socks5h', 'http', 'https', 'legacy-hostport']);
    const resolved = resolveProbeProfile(protocol || 'default', {
        profile: runtimeOptions && runtimeOptions.profile ? runtimeOptions.profile : 'standard',
    });
    const requestedCount = runtimeOptions && Number.isFinite(runtimeOptions.probeCount)
        ? runtimeOptions.probeCount
        : CONNECTIVITY_HTTP_PROBES.length;
    const minCount = minProbeCountByProtocol.has(normalizedProtocol) ? 2 : 1;
    const effectiveCount = Math.max(minCount, requestedCount);
    const selected = limitProbeCount(
        resolved && Array.isArray(resolved.probes) ? resolved.probes : CONNECTIVITY_HTTP_PROBES,
        effectiveCount
    );
    return {
        protocol: resolved && resolved.protocol ? resolved.protocol : (protocol || 'unknown'),
        profile: resolved && resolved.profile ? resolved.profile : 'standard',
        ids: resolved && Array.isArray(resolved.ids) ? resolved.ids : [],
        probes: selected,
    };
}

function httpGetStatusThroughAgent(url, { agent, timeoutMs }) {
    return new Promise((resolve) => {
        const lib = String(url || '').startsWith('https:') ? https : http;
        const startedAt = Date.now();
        try {
            const req = lib.get(url, { agent, timeout: timeoutMs }, (res) => {
                const latencyMs = Date.now() - startedAt;
                try { res.resume(); } catch (e) { }
                resolve({ statusCode: res.statusCode || null, latencyMs });
            });
            req.on('error', (err) => resolve({ statusCode: null, latencyMs: Date.now() - startedAt, error: err && err.message ? err.message : String(err) }));
            req.on('timeout', () => { req.destroy(); resolve({ statusCode: null, latencyMs: Date.now() - startedAt, error: 'Timeout' }); });
        } catch (e) {
            resolve({ statusCode: null, latencyMs: Date.now() - startedAt, error: e && e.message ? e.message : String(e) });
        }
    });
}

function normalizeConnectivityProbeRunOptions(timeoutOrOptions, includeAttemptsLegacy = false) {
    if (timeoutOrOptions && typeof timeoutOrOptions === 'object' && !Array.isArray(timeoutOrOptions)) {
        const timeoutMs = clampProxyTestInt(timeoutOrOptions.timeoutMs, 1000, 60000, 7000);
        const includeAttempts = Boolean(timeoutOrOptions.includeAttempts);
        const probesRaw = Array.isArray(timeoutOrOptions.probes) ? timeoutOrOptions.probes : CONNECTIVITY_HTTP_PROBES;
        const maxParallel = Array.isArray(probesRaw) && probesRaw.length > 0 ? probesRaw.length : getMaxConnectivityProbeCount();
        const parallelism = clampProxyTestInt(timeoutOrOptions.parallelism, 1, Math.max(1, maxParallel), 1);
        const probes = probesRaw
            .filter((probe) => probe && typeof probe.url === 'string')
            .map((probe) => ({
                id: probe.id ? String(probe.id) : '',
                url: probe.url,
                expected: probe.expected ? String(probe.expected) : '',
                okStatus: typeof probe.okStatus === 'function' ? probe.okStatus : ((s) => s >= 200 && s < 400),
            }));
        return {
            timeoutMs,
            includeAttempts,
            parallelism,
            probes: probes.length > 0 ? probes : CONNECTIVITY_HTTP_PROBES,
        };
    }

    return {
        timeoutMs: clampProxyTestInt(timeoutOrOptions, 1000, 60000, 7000),
        includeAttempts: Boolean(includeAttemptsLegacy),
        parallelism: 1,
        probes: CONNECTIVITY_HTTP_PROBES,
    };
}

async function probeConnectivityThroughSocksAgent(agent, timeoutOrOptions = 7000, includeAttemptsLegacy = false) {
    const { timeoutMs, includeAttempts, probes, parallelism } = normalizeConnectivityProbeRunOptions(timeoutOrOptions, includeAttemptsLegacy);
    const attempts = new Array(probes.length);
    let cursor = 0;
    let winner = null;
    const workerCount = Math.max(1, Math.min(parallelism || 1, probes.length || 1));

    const worker = async () => {
        while (cursor < probes.length) {
            if (winner) return;
            const probeIndex = cursor;
            cursor += 1;
            const probe = probes[probeIndex];
            const res = await httpGetStatusThroughAgent(probe.url, { agent, timeoutMs });
            const ok = Boolean(res && typeof res.statusCode === 'number' && probe.okStatus(res.statusCode));
            const attempt = {
                id: probe.id || '',
                url: probe.url,
                expected: probe.expected || '',
                ok,
                latencyMs: res && typeof res.latencyMs === 'number' ? res.latencyMs : null,
                statusCode: res ? res.statusCode : null,
                error: res && res.error ? String(res.error) : (res && res.statusCode ? `HTTP ${res.statusCode}` : 'Unknown'),
            };
            attempts[probeIndex] = attempt;
            if (ok && !winner) {
                winner = attempt;
                return;
            }
        }
    };

    const workers = new Array(workerCount).fill(0).map(() => worker());
    await Promise.all(workers);
    const orderedAttempts = attempts.filter(Boolean);
    if (winner) {
        return includeAttempts
            ? { ok: true, latencyMs: winner.latencyMs, url: winner.url, attempts: orderedAttempts }
            : { ok: true, latencyMs: winner.latencyMs, url: winner.url };
    }

    const last = orderedAttempts[orderedAttempts.length - 1];
    const firstProbe = probes[0] || CONNECTIVITY_HTTP_PROBES[0];
    const fallback = last || { ok: false, latencyMs: null, url: firstProbe.url, error: 'No probes' };
    return includeAttempts
        ? { ok: false, latencyMs: fallback.latencyMs, url: fallback.url, error: fallback.error, attempts: orderedAttempts }
        : { ok: false, latencyMs: fallback.latencyMs, url: fallback.url, error: fallback.error };
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

function resolveStablePreProxyForTest(settings, { targetProxyStr } = {}) {
    const s = settings && typeof settings === 'object' ? settings : {};
    if (!s.enablePreProxy) return { config: null, meta: { enabled: false } };
    const list = Array.isArray(s.preProxies) ? s.preProxies : [];
    const active = list.filter(p => p && p.enable !== false && p.url);
    if (active.length === 0) return { config: null, meta: { enabled: false } };

    const mode = String(s.mode || 'single');
    const selectedId = s.selectedId ? String(s.selectedId) : '';
    let target = null;

    // Stable selection for tests: avoid Math.random in balance mode.
    if (mode === 'single' || mode === 'balance') {
        target = selectedId ? (active.find(p => String(p.id) === selectedId) || null) : null;
        if (!target) target = active[0];
    } else {
        // failover (or unknown): first active
        target = active[0];
    }

    if (!target || !target.url) return { config: null, meta: { enabled: false } };
    const rawUrl = String(target.url || '').trim();
    const normalizedUrl = normalizeProxyInputRaw(rawUrl);
    const normalizedTarget = normalizeProxyInputRaw(targetProxyStr || '');
    if (normalizedUrl && normalizedTarget && normalizedUrl === normalizedTarget) {
        return {
            config: null,
            meta: {
                enabled: false,
                skipped: true,
                skipReason: 'same_as_target',
                mode,
                selectedId,
                targetId: target.id ? String(target.id) : '',
                targetRemark: target.remark ? String(target.remark) : '',
            }
        };
    }

    return {
        config: { preProxies: [target] },
        meta: {
            enabled: true,
            mode,
            selectedId,
            targetId: target.id ? String(target.id) : '',
            targetRemark: target.remark ? String(target.remark) : '',
        }
    };
}

async function startProxyProcessForTest({ engine, proxyStr, localPort, configPath, traceId, preProxyConfig = null }) {
    if (engine === 'xray') {
        const { parseProxyLink } = require('./utils');
        const outbound = parseProxyLink(proxyStr, "proxy_test");
        const outbounds = [];
        if (preProxyConfig && Array.isArray(preProxyConfig.preProxies) && preProxyConfig.preProxies.length > 0) {
            try {
                const target = preProxyConfig.preProxies[0];
                const preUrl = target && target.url ? String(target.url) : '';
                if (preUrl && supportsEngineForProxy(normalizeProxyInputRaw(preUrl), 'xray')) {
                    const preOutbound = parseProxyLink(preUrl, "proxy_pre");
                    outbounds.push(preOutbound);
                    outbound.proxySettings = { tag: "proxy_pre" };
                }
            } catch (e) { }
        }
        const config = {
            log: { loglevel: DEBUG_PROXY_TEST ? "warning" : "none" },
            inbounds: [{ port: localPort, listen: "127.0.0.1", protocol: "socks", settings: { udp: true } }],
            outbounds: [...outbounds, outbound, { protocol: "freedom", tag: "direct" }],
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
        let preProxySpec = null;
        if (preProxyConfig && Array.isArray(preProxyConfig.preProxies) && preProxyConfig.preProxies.length > 0) {
            try {
                const target = preProxyConfig.preProxies[0];
                const preUrl = target && target.url ? String(target.url) : '';
                if (preUrl && supportsEngineForProxy(normalizeProxyInputRaw(preUrl), 'sing-box')) {
                    preProxySpec = normalizeProxySpec(preUrl);
                }
            } catch (e) { }
        }
        const sbConfig = preProxySpec
            ? buildSingboxConfigFromProxySpec(spec, localPort, { preProxySpec })
            : buildSingboxConfigFromProxySpec(spec, localPort);
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

async function testProxyNodeInternal(proxyStr, engineHint = 'auto', testOptions = {}) {
    const tempPort = await getPort();
    const tempConfigPath = path.join(app.getPath('userData'), `test_config_${tempPort}.json`);
    const startedAt = Date.now();
    const runtimeOptions = normalizeProxyTestRuntimeOptions(testOptions);
    const preProxyOverrideToken = normalizePreProxyOverrideToken(testOptions && testOptions.preProxyOverride);
    let proxyProcess = null;
    let lastErr = null;
    const normalizedProxyStr = normalizeProxyInputRaw(proxyStr);
    const traceSeed = normalizedProxyStr || String(proxyStr || '');
    const traceId = buildProxyTestTraceId(traceSeed, tempPort);
    const protocol = inferProxyProtocolHint(normalizedProxyStr) || 'unknown';
    const baseResult = createProxyTestResultBase({
        startedAt,
        protocol,
        primaryEngine: '',
        enginePlan: [],
        capability: {},
        traceId,
    });
    baseResult.testProfile = runtimeOptions.profile;
    baseResult.testOptions = { ...runtimeOptions, preProxyOverride: preProxyOverrideToken };
    let stablePreProxySelection = null;
    try {
        const settingsRaw = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
        const effectiveSettings = (settingsRaw && typeof settingsRaw === 'object') ? { ...settingsRaw } : {};
        if (preProxyOverrideToken === 'on') effectiveSettings.enablePreProxy = true;
        if (preProxyOverrideToken === 'off') effectiveSettings.enablePreProxy = false;
        stablePreProxySelection = resolveStablePreProxyForTest(effectiveSettings, { targetProxyStr: normalizedProxyStr });
        if (stablePreProxySelection && stablePreProxySelection.meta) {
            baseResult.testOptions = { ...runtimeOptions, preProxy: stablePreProxySelection.meta, preProxyOverride: preProxyOverrideToken };
        }
    } catch (e) {
        baseResult.testOptions = { ...runtimeOptions, preProxy: { enabled: false, error: e && e.message ? String(e.message) : String(e) }, preProxyOverride: preProxyOverrideToken };
    }

    const finalizeAndReturn = (patch = {}) => {
        const merged = finalizeProxyTestResult(baseResult, patch);
        const normalized = normalizeProxyTestResult(merged);
        const checked = validateProxyTestResult(normalized);
        if (!checked.ok) {
            proxyTestLog(traceId, 'result schema invalid', { errors: checked.errors });
        }
        return normalized;
    };

    const parseStep = createStep('parse', { raw: redactProxyForLog(proxyStr) });
    if (!normalizedProxyStr) {
        appendStep(baseResult, finishStep(parseStep, {
            ok: false,
            code: PROXY_TEST_ERROR_CODES.PARSE_EMPTY,
            message: 'Proxy input is empty',
        }));
        return finalizeAndReturn({
            ok: false,
            success: false,
            error: 'Proxy input is empty',
            code: PROXY_TEST_ERROR_CODES.PARSE_EMPTY,
            finalCode: PROXY_TEST_ERROR_CODES.PARSE_EMPTY,
            finalMessage: 'Proxy input is empty',
        });
    }
    appendStep(baseResult, finishStep(parseStep, {
        ok: true,
        code: PROXY_TEST_ERROR_CODES.OK,
        message: 'Proxy input parsed',
        meta: { normalized: redactProxyForLog(normalizedProxyStr), protocol },
    }));

    const {
        primary,
        engines,
        xrayCapable,
        singboxCapable,
        parserSupport,
        probeSupport,
        capabilityReason,
        protocol: matrixProtocol,
    } = resolveProxyTestEngines(normalizedProxyStr, engineHint);
    baseResult.primaryEngine = primary || '';
    baseResult.enginePlan = Array.isArray(engines) ? engines : [];
    baseResult.capability = {
        protocol: matrixProtocol || protocol,
        xray: xrayCapable,
        singbox: singboxCapable,
        parser: parserSupport || { xray: false, singBox: false },
        engine: { xray: xrayCapable, singBox: singboxCapable },
        probe: probeSupport || { xray: false, singBox: false },
        reason: capabilityReason || '',
    };

    const capabilityStep = createStep('capability', { hint: engineHint || 'auto' });
    appendStep(baseResult, finishStep(capabilityStep, {
        ok: Array.isArray(engines) && engines.length > 0,
        code: (Array.isArray(engines) && engines.length > 0) ? PROXY_TEST_ERROR_CODES.OK : PROXY_TEST_ERROR_CODES.CAPABILITY_UNSUPPORTED_PROTOCOL,
        message: (Array.isArray(engines) && engines.length > 0)
            ? `engines=${engines.join(',')}`
            : (capabilityReason || `unsupported protocol=${protocol}`),
        meta: {
            primary,
            engines,
            capability: {
                protocol: matrixProtocol || protocol,
                parser: parserSupport || { xray: false, singBox: false },
                engine: { xray: xrayCapable, singBox: singboxCapable },
                probe: probeSupport || { xray: false, singBox: false },
                reason: capabilityReason || '',
            },
        },
    }));

    proxyTestLog(traceId, 'start', {
        hint: engineHint,
        primary,
        engines,
        capability: {
            protocol: matrixProtocol || protocol,
            parser: parserSupport || { xray: false, singBox: false },
            engine: { xray: xrayCapable, singBox: singboxCapable },
            probe: probeSupport || { xray: false, singBox: false },
            reason: capabilityReason || '',
        },
        localPort: tempPort,
        profile: runtimeOptions.profile,
        runtimeOptions,
        proxy: redactProxyForLog(normalizedProxyStr),
    });

    const probeSelection = resolveConnectivityProbeList(matrixProtocol || protocol, runtimeOptions);
    baseResult.probeProfile = {
        protocol: probeSelection.protocol,
        profile: probeSelection.profile,
        ids: probeSelection.ids,
        urls: Array.isArray(probeSelection.probes) ? probeSelection.probes.map((probe) => probe.url) : [],
    };
    proxyTestLog(traceId, 'probe-profile', baseResult.probeProfile);

    if (!engines || engines.length === 0) {
        const protocol = inferProxyProtocolHint(normalizedProxyStr) || 'unknown';
        const error = capabilityReason
            ? `${capabilityReason} (protocol=${protocol})`
            : `Unsupported proxy protocol for current test engines: ${protocol}`;
        proxyTestLog(traceId, 'skip', { error, protocol });
        return finalizeAndReturn({
            ok: false,
            success: false,
            error,
            code: PROXY_TEST_ERROR_CODES.CAPABILITY_UNSUPPORTED_PROTOCOL,
            finalCode: PROXY_TEST_ERROR_CODES.CAPABILITY_UNSUPPORTED_PROTOCOL,
            finalMessage: error,
            protocol,
        });
    }

    try {
        for (const engine of engines) {
            let attempt = null;
            let attemptCommitted = false;
            try {
                proxyTestLog(traceId, `engine=${engine} start`, { configPath: tempConfigPath });
                attempt = {
                    engine,
                    ok: false,
                    code: '',
                    message: '',
                    startedAt: Date.now(),
                    durationMs: 0,
                    connectivity: null,
                    ip: null,
                    geo: null,
                    steps: [],
                };

                let effectivePreProxyConfig = null;
                let preProxyMeta = null;
                if (stablePreProxySelection && stablePreProxySelection.config && stablePreProxySelection.config.preProxies && stablePreProxySelection.config.preProxies[0]) {
                    const target = stablePreProxySelection.config.preProxies[0];
                    const preUrl = target && target.url ? normalizeProxyInputRaw(target.url) : '';
                    if (preUrl && supportsEngineForProxy(preUrl, engine)) {
                        effectivePreProxyConfig = stablePreProxySelection.config;
                        preProxyMeta = { enabled: true, id: target.id ? String(target.id) : '', remark: target.remark ? String(target.remark) : '' };
                    } else if (stablePreProxySelection.meta && stablePreProxySelection.meta.enabled) {
                        preProxyMeta = {
                            enabled: false,
                            skipped: true,
                            skipReason: preUrl ? 'engine_unsupported' : 'missing_url',
                            id: target && target.id ? String(target.id) : '',
                            remark: target && target.remark ? String(target.remark) : '',
                        };
                    }
                } else if (stablePreProxySelection && stablePreProxySelection.meta && stablePreProxySelection.meta.skipped) {
                    preProxyMeta = { ...stablePreProxySelection.meta };
                }

                const engineStartStep = createStep('engine_start', { engine, configPath: tempConfigPath, preProxy: preProxyMeta || undefined });
                attempt.preProxy = preProxyMeta || undefined;
                const started = await startProxyProcessForTest({ engine, proxyStr: normalizedProxyStr, localPort: tempPort, configPath: tempConfigPath, traceId, preProxyConfig: effectivePreProxyConfig });
                proxyProcess = started && started.process ? started.process : null;
                const resolvedEngine = started && started.engine ? started.engine : engine;
                attempt.engine = resolvedEngine;
                proxyTestLog(traceId, `engine=${resolvedEngine} spawned`, { pid: proxyProcess && proxyProcess.pid ? proxyProcess.pid : null });

                await new Promise(r => setTimeout(r, runtimeOptions.engineBootWaitMs));
                if (proxyProcess && proxyProcess.exitCode !== null) {
                    const err = new Error(`Proxy engine exited early (engine=${resolvedEngine}, exitCode=${proxyProcess.exitCode})`);
                    err.code = 'PROXY_ENGINE_EXITED_EARLY';
                    throw err;
                }
                attempt.steps.push(finishStep(engineStartStep, {
                    ok: true,
                    code: PROXY_TEST_ERROR_CODES.OK,
                    message: 'Engine started',
                    meta: { pid: proxyProcess && proxyProcess.pid ? proxyProcess.pid : null },
                }));

                // Use socks5h:// to force remote DNS resolution via the proxy (avoids fake-IP / local DNS poisoning).
                const agent = new SocksProxyAgent(`socks5h://127.0.0.1:${tempPort}`);
                const connectivityStep = createStep('connectivity_probe', { engine: resolvedEngine });
                const connectivity = await probeConnectivityThroughSocksAgent(agent, {
                    timeoutMs: runtimeOptions.probeTimeoutMs,
                    includeAttempts: DEBUG_PROXY_TEST,
                    parallelism: runtimeOptions.probeParallelism,
                    probes: probeSelection.probes,
                });
                const connectivityCode = codeFromConnectivity(connectivity);
                attempt.steps.push(finishStep(connectivityStep, {
                    ok: Boolean(connectivity && connectivity.ok),
                    code: connectivityCode,
                    message: connectivity && connectivity.error ? String(connectivity.error) : 'connectivity probe ok',
                    meta: connectivity && typeof connectivity === 'object'
                        ? {
                            ...connectivity,
                            probeProfile: probeSelection.profile,
                            probeIds: probeSelection.ids,
                        }
                        : undefined,
                }));
                proxyTestLog(traceId, `engine=${resolvedEngine} connectivity`, connectivity);

                const { probePublicIp, probeGeo } = require('./proxy/test');
                let publicIp = null;
                let geo = null;
                const ipStep = createStep('ip_probe', { engine: resolvedEngine });
                const ipTask = (async () => {
                    try { return await probePublicIp(runtimeOptions.ipTimeoutMs, agent); } catch (e) { return null; }
                })();
                const geoTask = runtimeOptions.includeGeo
                    ? (async () => {
                        try { return await probeGeo(runtimeOptions.geoTimeoutMs, agent); } catch (e) { return null; }
                    })()
                    : Promise.resolve(null);
                const [ipResult, geoResult] = await Promise.all([ipTask, geoTask]);
                publicIp = ipResult;
                geo = geoResult;
                attempt.steps.push(finishStep(ipStep, {
                    ok: Boolean(publicIp),
                    code: publicIp ? PROXY_TEST_ERROR_CODES.OK : PROXY_TEST_ERROR_CODES.IP_GEO_UNAVAILABLE,
                    message: publicIp ? `ip=${publicIp}` : 'public ip probe unavailable',
                }));
                const geoStep = createStep('geo_probe', { engine: resolvedEngine });
                if (runtimeOptions.includeGeo) {
                    attempt.steps.push(finishStep(geoStep, {
                        ok: Boolean(geo && geo.ip),
                        code: (geo && geo.ip) ? PROXY_TEST_ERROR_CODES.OK : PROXY_TEST_ERROR_CODES.IP_GEO_UNAVAILABLE,
                        message: (geo && geo.ip) ? `geo ip=${geo.ip}` : 'geo probe unavailable',
                    }));
                } else {
                    attempt.steps.push(finishStep(geoStep, {
                        ok: true,
                        code: PROXY_TEST_ERROR_CODES.OK,
                        message: 'geo probe skipped by profile',
                        meta: { skipped: true, profile: runtimeOptions.profile },
                    }));
                }

                const ip = (geo && geo.ip) ? geo.ip : publicIp;
                const geoOut = geo ? {
                    ip: ip || null,
                    // Keep "country" as country code, and provide optional countryName for UI/auto-link.
                    country: geo.country,
                    countryCode: geo.countryCode || geo.country || null,
                    countryName: geo.countryName || null,
                    region: geo.region,
                    city: geo.city,
                    asn: geo.asn,
                    isp: geo.isp,
                    timezone: geo.timezone,
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                } : null;

                const ok = Boolean((connectivity && connectivity.ok) || ip);
                proxyTestLog(traceId, `engine=${resolvedEngine} done`, { ok, ip, geo: geoOut || null });

                attempt.ok = ok;
                attempt.connectivity = connectivity || null;
                attempt.ip = ip || null;
                attempt.geo = geoOut;
                attempt.durationMs = Math.max(0, Date.now() - attempt.startedAt);
                attempt.code = ok ? PROXY_TEST_ERROR_CODES.OK : (connectivityCode || PROXY_TEST_ERROR_CODES.PROBE_CONNECTIVITY_FAILED);
                attempt.message = ok ? 'Proxy test passed' : (connectivity && connectivity.error ? String(connectivity.error) : 'Connectivity failed');
                appendAttempt(baseResult, attempt);
                attemptCommitted = true;

                if (ok) {
                    return finalizeAndReturn({
                        ok: true,
                        success: true,
                        engine: resolvedEngine,
                        connectivity,
                        latencyMs: connectivity && typeof connectivity.latencyMs === 'number' ? connectivity.latencyMs : null,
                        ip: ip || null,
                        geo: geoOut,
                        code: PROXY_TEST_ERROR_CODES.OK,
                        finalCode: PROXY_TEST_ERROR_CODES.OK,
                        finalMessage: 'Proxy test passed',
                        error: '',
                    });
                }

                lastErr = new Error(attempt.message || 'Connectivity failed');
                lastErr.code = attempt.code || PROXY_TEST_ERROR_CODES.PROBE_CONNECTIVITY_FAILED;
                continue;
            } catch (err) {
                const errCode = codeFromException(err, PROXY_TEST_ERROR_CODES.ENGINE_START_FAILED);
                if (attempt && !attemptCommitted) {
                    attempt.ok = false;
                    attempt.code = errCode;
                    attempt.message = err && err.message ? String(err.message) : 'Engine failed';
                    attempt.durationMs = Math.max(0, Date.now() - attempt.startedAt);
                    appendAttempt(baseResult, attempt);
                    attemptCommitted = true;
                }
                lastErr = err;
                lastErr.code = errCode;
                proxyTestLog(traceId, `engine=${engine} failed`, {
                    code: errCode,
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

        const msg = lastErr && lastErr.message ? String(lastErr.message) : "Format Err";
        const code = codeFromException(lastErr, PROXY_TEST_ERROR_CODES.UNKNOWN);
        const attempts = Array.isArray(baseResult.attempts) ? baseResult.attempts : [];
        const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
        return finalizeAndReturn({
            ok: false,
            success: false,
            engine: lastAttempt && lastAttempt.engine ? lastAttempt.engine : '',
            connectivity: lastAttempt ? lastAttempt.connectivity : null,
            latencyMs: (lastAttempt && lastAttempt.connectivity && typeof lastAttempt.connectivity.latencyMs === 'number')
                ? lastAttempt.connectivity.latencyMs
                : null,
            ip: lastAttempt ? (lastAttempt.ip || null) : null,
            geo: lastAttempt ? (lastAttempt.geo || null) : null,
            error: msg,
            code,
            finalCode: code,
            finalMessage: msg,
        });
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

function enforceValidatedXrayUpdateUrl(url) {
    validateUpdateDownloadUrl(url);
    return String(url);
}

function buildXrayReleaseDownloadUrls(remoteVer, assetName) {
    const direct = `https://github.com/XTLS/Xray-core/releases/download/${remoteVer}/${assetName}`;
    const proxy = `https://gh-proxy.com/${direct}`;
    return {
        direct: enforceValidatedXrayUpdateUrl(direct),
        proxy: enforceValidatedXrayUpdateUrl(proxy),
    };
}

function resolveXrayReleaseAssetUrl(releaseData, assetName, expectedTag) {
    if (!releaseData || typeof releaseData !== 'object') return null;
    const name = String(assetName || '').trim();
    if (!name) return null;
    const expected = normalizeXrayReleaseTag(expectedTag);
    if (!expected) return null;
    const assets = Array.isArray(releaseData.assets) ? releaseData.assets : [];
    const candidates = assets
        .filter((item) => item && item.name === name && typeof item.browser_download_url === 'string')
        .map((item) => String(item.browser_download_url || '').trim())
        .filter(Boolean);
    if (candidates.length !== 1) return null;
    const parsedTag = normalizeXrayReleaseTag(parseXrayReleaseTagFromUrl(candidates[0], name));
    if (!parsedTag || parsedTag !== expected) return null;
    return candidates[0];
}

function resolveXrayReleaseAssetManifest(releaseData, assetName) {
    const tag = normalizeXrayReleaseTag(releaseData && releaseData.tag_name);
    const name = String(assetName || '').trim();
    if (!tag || !name) return null;
    const dgstName = `${name}.dgst`;
    const assetDirectUrl = resolveXrayReleaseAssetUrl(releaseData, name, tag);
    const dgstDirectUrl = resolveXrayReleaseAssetUrl(releaseData, dgstName, tag);
    if (!assetDirectUrl || !dgstDirectUrl) return null;
    const assetDirectValidated = enforceValidatedXrayUpdateUrl(assetDirectUrl);
    const dgstDirectValidated = enforceValidatedXrayUpdateUrl(dgstDirectUrl);
    const assetProxyValidated = enforceValidatedXrayUpdateUrl(`https://gh-proxy.com/${assetDirectValidated}`);
    const dgstProxyValidated = enforceValidatedXrayUpdateUrl(`https://gh-proxy.com/${dgstDirectValidated}`);
    return {
        tag,
        assetName: name,
        dgstName,
        assetDirectUrl: assetDirectValidated,
        assetProxyUrl: assetProxyValidated,
        dgstDirectUrl: dgstDirectValidated,
        dgstProxyUrl: dgstProxyValidated,
    };
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

function normalizeXrayReleaseTag(tag) {
    const text = String(tag || '').trim();
    const match = text.match(/^v?(\d+\.\d+\.\d+)$/i);
    if (!match) return null;
    return `v${match[1]}`;
}

function compareXrayReleaseTags(tagA, tagB) {
    const a = normalizeXrayReleaseTag(tagA);
    const b = normalizeXrayReleaseTag(tagB);
    if (!a || !b) return 0;
    return compareVersions(a.slice(1), b.slice(1));
}

function parseSha256FromDgstText(text, assetName = '') {
    return parseSha256DigestForAsset(text, assetName);
}

function createSecureXrayUpdateTempDir() {
    const tempBase = fs.realpathSync(os.tmpdir());
    const tempDir = fs.mkdtempSync(path.join(tempBase, 'xray_update_'));
    const realTempDir = fs.realpathSync(tempDir);
    const tempPrefix = tempBase.endsWith(path.sep) ? tempBase : `${tempBase}${path.sep}`;
    if (!(realTempDir === tempBase || realTempDir.startsWith(tempPrefix))) {
        throw new Error('Resolved update temp directory escapes system temp root');
    }
    return realTempDir;
}

const XRAY_UPDATE_LOCK_TTL_MS = 30 * 60 * 1000;

function getXrayUpdateLockFilePath() {
    const tempBase = fs.realpathSync(os.tmpdir());
    return path.join(tempBase, `geekezbrowser_xray_update_${process.platform}_${process.arch}.lock`);
}

function acquireXrayUpdateFileLock() {
    const lockPath = getXrayUpdateLockFilePath();
    const now = Date.now();
    const tryCreate = () => {
        const fd = fs.openSync(lockPath, 'wx');
        try {
            try {
                fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: now }) + '\n', 'utf8');
            } catch (e) { }
        } finally {
            try { fs.closeSync(fd); } catch (e) { }
        }
    };
    try {
        tryCreate();
        return lockPath;
    } catch (e) {
        if (e && e.code === 'EEXIST') {
            let st = null;
            try { st = fs.statSync(lockPath); } catch (err) { st = null; }
            const ageMs = st && typeof st.mtimeMs === 'number' ? (now - st.mtimeMs) : 0;
            if (st && ageMs > XRAY_UPDATE_LOCK_TTL_MS) {
                try { fs.unlinkSync(lockPath); } catch (err) { }
                tryCreate();
                return lockPath;
            }
            throw new Error('Xray update already in progress');
        }
        throw e;
    }
}

function releaseXrayUpdateFileLock(lockPath) {
    const p = String(lockPath || '').trim();
    if (!p) return;
    try { fs.unlinkSync(p); } catch (e) { }
}

async function installXrayBinaryWithRollback(sourceBinaryPath, options = {}) {
    const backupPath = `${BIN_PATH}.old`;
    const stagePath = `${BIN_PATH}.new`;
    const sourcePath = String(sourceBinaryPath || '').trim();
    if (!sourcePath) throw new Error('Missing source binary path');
    const expectedVersion = normalizeXrayReleaseTag(options && options.expectedVersion);
    const sourceStat = fs.statSync(sourcePath);
    if (!sourceStat.isFile()) throw new Error('Source Xray binary is not a file');
    const sourceSha = sha256FileHex(sourcePath);
    if (!sourceSha || sourceSha.length !== 64) throw new Error('Failed to compute source Xray binary sha256');
    let hadOriginal = false;
    let didBackupRename = false;
    let didStageRename = false;
    try {
        fs.ensureDirSync(path.dirname(BIN_PATH));

        // Stage new binary first, then swap into place via atomic rename.
        try {
            if (fs.existsSync(stagePath)) fs.unlinkSync(stagePath);
        } catch (e) { }

        fs.copyFileSync(sourcePath, stagePath);
        if (process.platform !== 'win32') {
            try { fs.chmodSync(stagePath, '755'); } catch (e) { }
        }

        const stagedStat = fs.statSync(stagePath);
        if (!stagedStat.isFile()) throw new Error('Staged Xray binary is not a file');
        if (stagedStat.size !== sourceStat.size) {
            throw new Error(`Staged Xray binary size mismatch: source ${sourceStat.size}, staged ${stagedStat.size}`);
        }
        const stagedSha = sha256FileHex(stagePath);
        if (!stagedSha || stagedSha.length !== 64) throw new Error('Failed to compute staged Xray binary sha256');
        if (stagedSha.toLowerCase() !== sourceSha.toLowerCase()) {
            throw new Error('Staged Xray binary sha256 mismatch');
        }
        if (expectedVersion) {
            const stagedVersion = normalizeXrayReleaseTag(await getXrayVersionFromBinary(stagePath));
            if (!stagedVersion || compareXrayReleaseTags(stagedVersion, expectedVersion) !== 0) {
                throw new Error(`Staged Xray binary version mismatch: expected ${expectedVersion}, got ${stagedVersion || 'unknown'}`);
            }
        }

        hadOriginal = fs.existsSync(BIN_PATH);
        if (hadOriginal) {
            try {
                if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
            } catch (e) { }
            fs.renameSync(BIN_PATH, backupPath);
            didBackupRename = true;
        }
        fs.renameSync(stagePath, BIN_PATH);
        didStageRename = true;
        if (process.platform !== 'win32') {
            try { fs.chmodSync(BIN_PATH, '755'); } catch (e) { }
        }
        const installedStat = fs.statSync(BIN_PATH);
        if (!installedStat.isFile()) throw new Error('Installed Xray binary is not a file');
        if (installedStat.size !== sourceStat.size) {
            throw new Error(`Installed Xray binary size mismatch: source ${sourceStat.size}, target ${installedStat.size}`);
        }
        const installedSha = sha256FileHex(BIN_PATH);
        if (!installedSha || installedSha.length !== 64) throw new Error('Failed to compute installed Xray binary sha256');
        if (installedSha.toLowerCase() !== sourceSha.toLowerCase()) {
            throw new Error('Installed Xray binary sha256 mismatch');
        }
        if (expectedVersion) {
            const installedVersion = normalizeXrayReleaseTag(await getXrayVersionFromBinary(BIN_PATH));
            if (!installedVersion || compareXrayReleaseTags(installedVersion, expectedVersion) !== 0) {
                throw new Error(`Installed Xray binary version mismatch: expected ${expectedVersion}, got ${installedVersion || 'unknown'}`);
            }
        }
        try {
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        } catch (e) { }
    } catch (err) {
        try {
            if (fs.existsSync(stagePath)) fs.unlinkSync(stagePath);
        } catch (e) { }
        if (didStageRename) {
            try {
                if (fs.existsSync(BIN_PATH)) fs.unlinkSync(BIN_PATH);
            } catch (e) { }
        }
        if (didBackupRename && fs.existsSync(backupPath)) {
            try { fs.renameSync(backupPath, BIN_PATH); } catch (e) { }
        }
        throw err;
    }
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
let xrayUpdateInProgress = false;
function isRetryableXrayUpdateDownloadNetworkError(err) {
    const code = err && typeof err === 'object' ? err.code : '';
    const message = err && typeof err === 'object' && typeof err.message === 'string' ? err.message : '';
    if (/timeout/i.test(message)) return true;
    if (/socket hang up/i.test(message)) return true;
    return [
        'ECONNRESET',
        'ECONNREFUSED',
        'EAI_AGAIN',
        'ENOTFOUND',
        'ENETUNREACH',
        'EHOSTUNREACH',
        'ETIMEDOUT',
    ].includes(String(code || '').toUpperCase());
}

function parseHttpStatusFromError(err) {
    const message = err && typeof err === 'object' && typeof err.message === 'string'
        ? err.message
        : String(err || '');
    const patterns = [
        /\bHTTP\s+(\d{3})\b/i,
        /\breturned\s+(\d{3})\b/i,
    ];
    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (!match) continue;
        const parsed = Number(match[1]);
        if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
            return parsed;
        }
    }
    return null;
}

function mapXrayMetadataFetchErrorCode(err) {
    const code = err && typeof err === 'object' ? String(err.code || '').toUpperCase() : '';
    const message = err && typeof err === 'object' && typeof err.message === 'string'
        ? err.message
        : String(err || '');
    const httpStatus = parseHttpStatusFromError(err);
    if (/timeout/i.test(message) || code === 'ETIMEDOUT') return 'fetch_timeout';
    if ([
        'ECONNRESET',
        'ECONNREFUSED',
        'EAI_AGAIN',
        'ENOTFOUND',
        'ENETUNREACH',
        'EHOSTUNREACH',
    ].includes(code)) return 'fetch_network';
    if (Number.isInteger(httpStatus)) return 'fetch_http';
    return 'fetch_error';
}

function mapXrayMetadataFetchFailureRoute(err) {
    const route = err && typeof err === 'object' ? String(err.githubApiFailureRoute || '').toLowerCase() : '';
    if (route === 'direct' || route === 'proxy') return route;
    return 'unknown';
}

function mapXrayMetadataFetchFailureHost(err) {
    const host = err && typeof err === 'object' ? String(err.githubApiFailureHost || '').trim().toLowerCase() : '';
    return host || 'unknown';
}

function mapMetadataFetchRouteFromUrl(routeUrl) {
    if (typeof routeUrl !== 'string' || !routeUrl.trim()) return 'unknown';
    try {
        return new URL(routeUrl).hostname === 'api.github.com' ? 'direct' : 'proxy';
    } catch (e) {
        return 'unknown';
    }
}

function mapMetadataFetchRouteHostFromUrl(routeUrl) {
    if (typeof routeUrl !== 'string' || !routeUrl.trim()) return 'unknown';
    try {
        const host = new URL(routeUrl).hostname;
        return (host && String(host).trim().toLowerCase()) || 'unknown';
    } catch (e) {
        return 'unknown';
    }
}

function mapMetadataFetchFallbackResult(value, fallbackAttempted = false) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'not_attempted' || normalized === 'succeeded' || normalized === 'failed') {
        return normalized;
    }
    return fallbackAttempted ? 'failed' : 'not_attempted';
}

function mapMetadataFetchFallbackDecision(value, fallbackAttempted = false, retryable = null) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'not_needed' || normalized === 'retryable_error' || normalized === 'non_retryable_error') {
        return normalized;
    }
    if (fallbackAttempted) return 'retryable_error';
    if (retryable === false) return 'non_retryable_error';
    if (retryable === true) return 'retryable_error';
    return 'not_needed';
}

function mapMetadataFetchAttemptFlow(value, fallbackAttempted = false) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'direct_only' || normalized === 'direct_then_proxy') {
        return normalized;
    }
    return fallbackAttempted ? 'direct_then_proxy' : 'direct_only';
}

function mapMetadataFetchErrorRetryable(err) {
    if (err && typeof err === 'object' && typeof err.githubApiErrorRetryable === 'boolean') {
        return err.githubApiErrorRetryable;
    }
    return isRetryableGitHubApiNetworkError(err);
}

function mapMetadataFetchAttemptCount(value, fallbackAttempted = false) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 2) {
        return parsed;
    }
    return fallbackAttempted ? 2 : 1;
}

function mapXrayUpdateErrorCode(err) {
    const message = err && typeof err === 'object' && typeof err.message === 'string'
        ? err.message
        : String(err || '');
    if (/already in progress/i.test(message)) return 'XRAY_UPDATE_IN_PROGRESS';
    if (/downgrade blocked/i.test(message)) return 'XRAY_UPDATE_DOWNGRADE_BLOCKED';
    if (/sha256 mismatch/i.test(message)) return 'XRAY_UPDATE_DIGEST_MISMATCH';
    if (/zip-slip blocked/i.test(message)) return 'XRAY_UPDATE_ZIP_SLIP_BLOCKED';
    if (/only https urls are allowed/i.test(message)) return 'XRAY_UPDATE_PROTOCOL_NOT_ALLOWED';
    if (/download host not allowed/i.test(message)) return 'XRAY_UPDATE_HOST_NOT_ALLOWED';
    if (/download failed:\s*http\s*\d+/i.test(message)) return 'XRAY_UPDATE_HTTP_ERROR';
    if (/download timeout/i.test(message)) return 'XRAY_UPDATE_NETWORK_TIMEOUT';
    if (/too many redirects/i.test(message)) return 'XRAY_UPDATE_REDIRECT_LIMIT';
    if (/download too large|zip too large/i.test(message)) return 'XRAY_UPDATE_PAYLOAD_TOO_LARGE';
    if (/invalid xray download url|missing xray download url|invalid url|invalid gh-proxy url/i.test(message)) return 'XRAY_UPDATE_URL_INVALID';
    if (/not a zip/i.test(message)) return 'XRAY_UPDATE_INVALID_ZIP';
    if (/binary not found/i.test(message)) return 'XRAY_UPDATE_BINARY_NOT_FOUND';
    return 'XRAY_UPDATE_FAILED';
}

function mapXrayUpdateFailureStageFallbackCode(failureStage) {
    const stage = String(failureStage || '').trim().toLowerCase();
    switch (stage) {
        case 'resolve_release':
            return 'XRAY_UPDATE_RELEASE_RESOLVE_FAILED';
        case 'select_download_route':
            return 'XRAY_UPDATE_URL_INVALID';
        case 'version_guard':
            return 'XRAY_UPDATE_VERSION_GUARD_FAILED';
        case 'download_asset':
            return 'XRAY_UPDATE_DOWNLOAD_FAILED';
        case 'verify_digest':
            return 'XRAY_UPDATE_DIGEST_VERIFY_FAILED';
        case 'extract_zip':
            return 'XRAY_UPDATE_ZIP_EXTRACT_FAILED';
        case 'locate_binary':
            return 'XRAY_UPDATE_BINARY_NOT_FOUND';
        case 'verify_binary':
            return 'XRAY_UPDATE_BINARY_INVALID';
        case 'verify_version':
            return 'XRAY_UPDATE_VERSION_MISMATCH';
        case 'install_binary':
            return 'XRAY_UPDATE_INSTALL_FAILED';
        default:
            return 'XRAY_UPDATE_FAILED';
    }
}

function resolveXrayUpdateErrorCode(err, failureStage) {
    const directCode = mapXrayUpdateErrorCode(err);
    if (directCode && directCode !== 'XRAY_UPDATE_FAILED') return directCode;
    return mapXrayUpdateFailureStageFallbackCode(failureStage);
}

function mapProfileLaunchErrorCode(err) {
    const knownCodes = new Set([
        'TUN_UNSUPPORTED_PLATFORM',
        'TUN_RESOURCES_MISSING',
        'TUN_ADMIN_REQUIRED',
        'TUN_REQUIRES_SINGLE_PROFILE',
        'TUN_ALREADY_RUNNING',
        'SINGBOX_BINARY_MISSING',
        'PROFILE_NOT_FOUND',
    ]);
    const explicitCode = err && typeof err === 'object' && typeof err.code === 'string'
        ? String(err.code || '').trim().toUpperCase()
        : '';
    if (knownCodes.has(explicitCode)) return explicitCode;

    const message = err && typeof err === 'object' && typeof err.message === 'string'
        ? err.message
        : String(err || '');
    if (/chrome binary not found/i.test(message)) return 'CHROME_BINARY_NOT_FOUND';
    if (/proxy\/fingerprint consistency block/i.test(message)) return 'PROXY_FINGERPRINT_CONSISTENCY_BLOCK';
    if (/proxy\/fingerprint mismatch/i.test(message)) return 'PROXY_FINGERPRINT_LINK_MISMATCH';
    if (/ua consistency block/i.test(message)) return 'UA_CONSISTENCY_BLOCK';
    if (/profile not found/i.test(message)) return 'PROFILE_NOT_FOUND';
    if (/address already in use|eaddrinuse/i.test(message)) return 'PROFILE_PROXY_PORT_IN_USE';
    return 'PROFILE_LAUNCH_FAILED';
}

function mapProfileStopErrorCode(err) {
    const knownCodes = new Set([
        'STOP_PROFILE_MISSING_ID',
        'STOP_PROFILE_INVALID_ID',
        'STOP_PROFILE_PERMISSION_DENIED',
        'STOP_PROFILE_PROCESS_NOT_FOUND',
        'STOP_PROFILE_NOT_FOUND',
        'STOP_PROFILE_FAILED',
    ]);
    const explicitCode = err && typeof err === 'object' && typeof err.code === 'string'
        ? String(err.code || '').trim().toUpperCase()
        : '';
    if (knownCodes.has(explicitCode)) return explicitCode;

    const message = err && typeof err === 'object' && typeof err.message === 'string'
        ? err.message
        : String(err || '');
    if (/access is denied|permission denied|eacces|eperm/i.test(message)) return 'STOP_PROFILE_PERMISSION_DENIED';
    if (/no such process|esrch/i.test(message)) return 'STOP_PROFILE_PROCESS_NOT_FOUND';
    if (/invalid id|invalid profile path/i.test(message)) return 'STOP_PROFILE_INVALID_ID';
    if (/profile not found/i.test(message)) return 'STOP_PROFILE_NOT_FOUND';
    return 'STOP_PROFILE_FAILED';
}

function getStopErrorCodePriority(code) {
    const normalized = String(code || '').trim().toUpperCase();
    switch (normalized) {
        case 'STOP_PROFILE_PERMISSION_DENIED':
            return 1;
        case 'STOP_PROFILE_INVALID_ID':
        case 'STOP_PROFILE_MISSING_ID':
        case 'STOP_PROFILE_NOT_FOUND':
            return 2;
        case 'STOP_PROFILE_PROCESS_NOT_FOUND':
            return 3;
        case 'STOP_PROFILE_FAILED':
            return 4;
        default:
            return 5;
    }
}

const STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE = 3;
const STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH = 72;
const STOP_OTHER_MAX_PROFILE_SAMPLES_PER_CODE = 5;
const STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT = 3;
const STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT = 2;
const STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT = 2;
const STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT = 3;
const STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT = 3;
const STOP_OTHER_CONTRACT_VERSION = 2;

function aggregateStopOtherFailureCodes(failedItems = []) {
    const counts = {};
    const codeProfiles = {};
    const codeProfileTotal = {};
    const codeProfileTruncated = {};
    const codeProfileKeys = {};
    const codeDetailSamples = {};
    const codeDetailTotal = {};
    const codeDetailTruncated = {};
    const codeDetailKeys = {};
    for (const item of failedItems) {
        const code = String(
            item && (item.errorCode || item.code)
                ? (item.errorCode || item.code)
                : 'STOP_PROFILE_FAILED'
        ).trim().toUpperCase();
        if (!code) continue;
        counts[code] = (counts[code] || 0) + 1;
        const rawName = String(item && (item.name || item.id) ? (item.name || item.id) : '').trim();
        if (rawName) {
            const normalizedProfileKey = rawName.toLowerCase();
            if (!codeProfileKeys[code]) codeProfileKeys[code] = new Set();
            if (!codeProfileKeys[code].has(normalizedProfileKey)) {
                codeProfileKeys[code].add(normalizedProfileKey);
                codeProfileTotal[code] = (codeProfileTotal[code] || 0) + 1;
                if (!Array.isArray(codeProfiles[code])) codeProfiles[code] = [];
                if (codeProfiles[code].length < STOP_OTHER_MAX_PROFILE_SAMPLES_PER_CODE) {
                    codeProfiles[code].push(rawName);
                }
            }
        }
        const rawMessage = String(item && (item.error || item.message) ? (item.error || item.message) : '')
            .replace(/\s+/g, ' ')
            .trim();
        const trimmedMessage = rawMessage.length > STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH
            ? `${rawMessage.slice(0, STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH)}…`
            : rawMessage;
        const detailLine = trimmedMessage
            ? `${rawName || code}(${code}): ${trimmedMessage}`
            : `${rawName || code}(${code})`;
        const normalizedDetailKey = String(detailLine || '').trim().toLowerCase();
        if (!normalizedDetailKey) continue;
        if (!Array.isArray(codeDetailSamples[code])) codeDetailSamples[code] = [];
        if (!codeDetailKeys[code]) codeDetailKeys[code] = new Set();
        if (!codeDetailKeys[code].has(normalizedDetailKey)) {
            codeDetailKeys[code].add(normalizedDetailKey);
            codeDetailTotal[code] = (codeDetailTotal[code] || 0) + 1;
            if (codeDetailSamples[code].length < STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE) {
                codeDetailSamples[code].push(detailLine);
            }
        }
    }
    const rankedCodes = Object.keys(counts).sort((left, right) => {
        const p = getStopErrorCodePriority(left) - getStopErrorCodePriority(right);
        if (p !== 0) return p;
        const c = Number(counts[right] || 0) - Number(counts[left] || 0);
        if (c !== 0) return c;
        return String(left).localeCompare(String(right));
    });
    const failureCodeSummaries = rankedCodes.map((code) => {
        const profileTotal = Number(codeProfileTotal[code] || 0);
        const profileSamples = Array.isArray(codeProfiles[code]) ? codeProfiles[code] : [];
        const profileTruncated = profileTotal > profileSamples.length;
        codeProfileTruncated[code] = profileTruncated;
        const detailTotal = Number(codeDetailTotal[code] || 0);
        const detailSamples = Array.isArray(codeDetailSamples[code]) ? codeDetailSamples[code] : [];
        const detailTruncated = detailTotal > detailSamples.length;
        codeDetailTruncated[code] = detailTruncated;
        return {
            code,
            count: Number(counts[code] || 0),
            profiles: profileSamples.slice(),
            profileTotal,
            profileTruncated,
            details: detailSamples.slice(),
            detailTotal,
            detailTruncated,
        };
    });
    return {
        errorCodeCounts: counts,
        errorCodeProfiles: codeProfiles,
        errorCodeProfileTotals: codeProfileTotal,
        errorCodeProfilesTruncated: codeProfileTruncated,
        errorCodeDetailSamples: codeDetailSamples,
        errorCodeDetailTotals: codeDetailTotal,
        errorCodeDetailsTruncated: codeDetailTruncated,
        dominantErrorCode: rankedCodes.length > 0 ? rankedCodes[0] : null,
        rankedErrorCodes: rankedCodes,
        failureCodeSummaries,
    };
}

function resolveProfileStatusTarget(preferredTarget = null) {
    try {
        if (
            preferredTarget &&
            typeof preferredTarget.send === 'function' &&
            !(typeof preferredTarget.isDestroyed === 'function' && preferredTarget.isDestroyed())
        ) {
            return preferredTarget;
        }
    } catch (e) { }
    try {
        if (mainWindow && !mainWindow.isDestroyed()) return mainWindow.webContents;
    } catch (e) { }
    return null;
}

async function stopProfileRuntimeByResolvedId(id, profileDir, preferredStatusTarget = null) {
    if (!activeProcesses[id]) return { success: true, stopped: false };
    const statusTarget = resolveProfileStatusTarget(preferredStatusTarget);
    const processSnapshot = activeProcesses[id];
    try {
        try {
            if (statusTarget) emitProfileStatusEvent(statusTarget, id, 'stopping');
        } catch (e) { }
        await forceKill(getProxyPid(processSnapshot));
        try { await processSnapshot.browser.close(); } catch (e) { }

        if (processSnapshot && processSnapshot.logFd !== undefined) {
            try { fs.closeSync(processSnapshot.logFd); } catch (e) { }
        }
        delete activeProcesses[id];
        await autoClearSystemProxyIfEnabled();
        await new Promise(r => setTimeout(r, 500));
        try {
            if (statusTarget) emitProfileStatusEvent(statusTarget, id, 'stopped');
        } catch (e) { }
        return { success: true, stopped: true };
    } catch (e) {
        const stopErrorCode = mapProfileStopErrorCode(e);
        try {
            if (statusTarget) {
                emitProfileStatusEvent(statusTarget, id, 'stop_failed', {
                    errorCode: stopErrorCode,
                    errorStage: 'stop',
                    errorMessage: e && e.message ? e.message : String(e || 'stop failed'),
                });
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
                    errorCode: stopErrorCode,
                    message: e && e.message ? e.message : String(e || 'stop failed'),
                    engine: (processSnapshot && processSnapshot.proxyEngine) || p.proxyEngine || 'xray',
                    logPath: path.join(profileDir, (processSnapshot && processSnapshot.proxyEngine === 'sing-box') ? 'singbox_run.log' : 'xray_run.log')
                };
                await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 });
            }
        } catch (writeErr) { }
        return { success: false, error: e && e.message ? e.message : String(e || 'stop failed'), errorCode: stopErrorCode, code: stopErrorCode };
    }
}

async function downloadFileWithRouteFallback(primaryUrl, fallbackUrl, dest, options = {}) {
    const upstreamAgent = options && options.agent
        ? options.agent
        : await (async () => {
            const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
            const upstream = await ensureUpstreamPreProxyEngine(settings);
            return upstream ? new SocksProxyAgent(`socks5h://${upstream.endpoint}`) : undefined;
        })();
    const downloadOptions = upstreamAgent ? { ...options, agent: upstreamAgent } : options;
    const normalizedPrimaryUrl = enforceValidatedXrayUpdateUrl(primaryUrl);
    try {
        await downloadFile(normalizedPrimaryUrl, dest, downloadOptions);
        return normalizedPrimaryUrl;
    } catch (err) {
        if (!isRetryableXrayUpdateDownloadNetworkError(err)) throw err;
        const normalizedFallbackUrl = fallbackUrl ? enforceValidatedXrayUpdateUrl(fallbackUrl) : '';
        if (!normalizedFallbackUrl || normalizedFallbackUrl === normalizedPrimaryUrl) throw err;
        console.warn('[Update] Download retry via fallback route:', normalizedPrimaryUrl, '->', normalizedFallbackUrl);
        await downloadFile(normalizedFallbackUrl, dest, downloadOptions);
        return normalizedFallbackUrl;
    }
}

ipcMain.handle('set-title-bar-color', (e, colors) => { const win = BrowserWindow.fromWebContents(e.sender); if (win) { if (process.platform === 'win32') try { win.setTitleBarOverlay({ color: colors.bg, symbolColor: colors.symbol }); } catch (e) { } win.setBackgroundColor(colors.bg); } });
ipcMain.handle('check-app-update', async () => { try { const data = await fetchJson('https://api.github.com/repos/EchoHS/GeekezBrowser/releases/latest'); if (!data || !data.tag_name) return { update: false }; const remote = data.tag_name.replace('v', ''); if (compareVersions(remote, app.getVersion()) > 0) { return { update: true, remote, url: 'https://browser.geekez.net/#downloads' }; } return { update: false }; } catch (e) { return { update: false, error: e.message }; } });
ipcMain.handle('check-xray-update', async () => {
    try {
        const assetName = getXrayReleaseAssetName();
        const releaseFetch = await fetchLatestXrayReleaseWithRoute();
        const data = releaseFetch && releaseFetch.data ? releaseFetch.data : null;
        const releaseRouteUrl = (releaseFetch && releaseFetch.routeUrl) ? releaseFetch.routeUrl : '';
        const manifest = resolveXrayReleaseAssetManifest(data, assetName);
        if (!manifest) return { update: false };
        const remoteVer = manifest.tag;
        const currentVer = normalizeXrayReleaseTag(await getLocalXrayVersion()) || 'v0.0.0';
        if (compareXrayReleaseTags(remoteVer, currentVer) <= 0) return { update: false };
        const preferDirectDownloadRoute = (() => {
            try {
                return new URL(releaseRouteUrl).hostname === 'api.github.com';
            } catch (e) {
                return false;
            }
        })();
        const metadataRoute = (() => {
            try {
                return new URL(releaseRouteUrl).hostname === 'api.github.com' ? 'direct' : 'proxy';
            } catch (e) {
                return 'proxy';
            }
        })();
        const downloadRoute = preferDirectDownloadRoute ? 'direct' : 'proxy';
        const downloadUrl = preferDirectDownloadRoute ? manifest.assetDirectUrl : manifest.assetProxyUrl;
        return {
            update: true,
            remote: remoteVer.replace(/^v/, ''),
            downloadUrl,
            downloadUrlDirect: manifest.assetDirectUrl,
            downloadUrlProxy: manifest.assetProxyUrl,
            downloadRoute,
            metadataRouteUrl: releaseRouteUrl,
            metadataRoute,
        };
    } catch (e) {
        return { update: false };
    }
});
ipcMain.handle('download-xray-update', async (e, updateRequest) => {
    if (xrayUpdateInProgress) throw new Error('Xray update already in progress');
    xrayUpdateInProgress = true;
    let xrayUpdateLockPath = '';
    try {
        xrayUpdateLockPath = acquireXrayUpdateFileLock();
        const exeName = process.platform === 'win32' ? 'xray.exe' : 'xray';
        let tempDir = '';
        let zipPath = '';
        const updateRouteMeta = {
            remote: null,
            requestRouteHint: 'none',
            requestUrlHost: 'none',
            releaseSource: 'unknown',
            metadataRouteUrl: 'unknown',
            metadataFetchStatus: 'unknown',
            metadataFetchErrorCode: 'none',
            metadataFetchHttpStatus: null,
            metadataFetchErrorRetryable: null,
            metadataFetchAttemptCount: 0,
            metadataFetchFallbackUsed: false,
            metadataFetchFallbackAttempted: false,
            metadataFetchFallbackResult: 'unknown',
            metadataFetchFallbackDecision: 'unknown',
            metadataFetchAttemptFlow: 'unknown',
            metadataFetchFailureRoute: 'none',
            metadataFetchFailureHost: 'none',
            metadataFetchRoute: 'unknown',
            metadataFetchRouteHost: 'unknown',
            metadataRoute: 'unknown',
            selectedAssetRoute: 'unknown',
            routeDecisionSource: 'unknown',
            routeHintConflict: false,
            routeHintConflictType: 'none',
            selectedAssetHost: 'unknown',
            selectedDgstRoute: 'unknown',
            selectedDgstHost: 'unknown',
            dgstSource: 'unknown',
            effectiveAssetRoute: 'unknown',
            effectiveAssetHost: 'unknown',
            effectiveDgstRoute: 'unknown',
            effectiveDgstHost: 'unknown',
            usedAssetFallback: false,
            usedDgstFallback: false,
        };
        let updateFailureStage = 'resolve_release';
        try {
            // Do not trust renderer-provided URLs. Only allow the latest official XTLS/Xray-core asset for this platform.
            const assetName = getXrayReleaseAssetName();
            let remoteVer = null;
            let releaseManifest = null;
            let useDirect = false;
            let releaseMetadataRouteUrl = 'https://api.github.com/repos/XTLS/Xray-core/releases/latest';
            let primaryAssetUrl = '';
            let fallbackAssetUrl = '';
            try {
                const releaseFetch = await fetchLatestXrayReleaseWithRoute();
                const data = releaseFetch && releaseFetch.data ? releaseFetch.data : null;
                releaseMetadataRouteUrl = (releaseFetch && releaseFetch.routeUrl) ? releaseFetch.routeUrl : releaseMetadataRouteUrl;
                updateRouteMeta.metadataFetchFallbackUsed = !!(releaseFetch && releaseFetch.fallbackUsed);
                updateRouteMeta.metadataFetchFallbackAttempted = !!(releaseFetch && releaseFetch.fallbackAttempted);
                updateRouteMeta.metadataFetchAttemptCount = mapMetadataFetchAttemptCount(
                    releaseFetch && releaseFetch.attemptCount,
                    !!(releaseFetch && releaseFetch.fallbackAttempted),
                );
                updateRouteMeta.metadataFetchFallbackResult = mapMetadataFetchFallbackResult(
                    releaseFetch && releaseFetch.fallbackResult,
                    !!(releaseFetch && releaseFetch.fallbackAttempted),
                );
                updateRouteMeta.metadataFetchFallbackDecision = mapMetadataFetchFallbackDecision(
                    releaseFetch && releaseFetch.fallbackDecision,
                    !!(releaseFetch && releaseFetch.fallbackAttempted),
                    null,
                );
                updateRouteMeta.metadataFetchAttemptFlow = mapMetadataFetchAttemptFlow(
                    releaseFetch && releaseFetch.attemptFlow,
                    !!(releaseFetch && releaseFetch.fallbackAttempted),
                );
                updateRouteMeta.metadataFetchRoute = mapMetadataFetchRouteFromUrl(releaseMetadataRouteUrl);
                updateRouteMeta.metadataFetchRouteHost = mapMetadataFetchRouteHostFromUrl(releaseMetadataRouteUrl);
                if (data) {
                    releaseManifest = resolveXrayReleaseAssetManifest(data, assetName);
                    if (releaseManifest && releaseManifest.tag) {
                        remoteVer = releaseManifest.tag;
                        updateRouteMeta.metadataFetchStatus = 'ok';
                        updateRouteMeta.metadataFetchErrorCode = 'none';
                        updateRouteMeta.metadataFetchHttpStatus = null;
                        updateRouteMeta.metadataFetchErrorRetryable = null;
                        updateRouteMeta.metadataFetchFailureRoute = 'none';
                        updateRouteMeta.metadataFetchFailureHost = 'none';
                    } else {
                        updateRouteMeta.metadataFetchStatus = 'manifest_missing';
                        updateRouteMeta.metadataFetchErrorCode = 'none';
                        updateRouteMeta.metadataFetchHttpStatus = null;
                        updateRouteMeta.metadataFetchErrorRetryable = null;
                        updateRouteMeta.metadataFetchFailureRoute = 'none';
                        updateRouteMeta.metadataFetchFailureHost = 'none';
                    }
                } else {
                    updateRouteMeta.metadataFetchStatus = 'manifest_missing';
                    updateRouteMeta.metadataFetchErrorCode = 'none';
                    updateRouteMeta.metadataFetchHttpStatus = null;
                    updateRouteMeta.metadataFetchErrorRetryable = null;
                    updateRouteMeta.metadataFetchFailureRoute = 'none';
                    updateRouteMeta.metadataFetchFailureHost = 'none';
                }
            } catch (e) {
                updateRouteMeta.metadataFetchStatus = 'fetch_error';
                updateRouteMeta.metadataFetchErrorCode = mapXrayMetadataFetchErrorCode(e);
                updateRouteMeta.metadataFetchHttpStatus = parseHttpStatusFromError(e);
                const metadataFetchErrorRetryable = mapMetadataFetchErrorRetryable(e);
                updateRouteMeta.metadataFetchErrorRetryable = metadataFetchErrorRetryable;
                updateRouteMeta.metadataFetchAttemptCount = mapMetadataFetchAttemptCount(
                    e && e.githubApiAttemptCount,
                    !!(e && e.githubApiFallbackAttempted),
                );
                updateRouteMeta.metadataFetchFallbackUsed = !!(e && e.githubApiFallbackAttempted);
                updateRouteMeta.metadataFetchFallbackAttempted = !!(e && e.githubApiFallbackAttempted);
                updateRouteMeta.metadataFetchFallbackResult = mapMetadataFetchFallbackResult(
                    e && e.githubApiFallbackResult,
                    !!(e && e.githubApiFallbackAttempted),
                );
                updateRouteMeta.metadataFetchFallbackDecision = mapMetadataFetchFallbackDecision(
                    e && e.githubApiFallbackDecision,
                    !!(e && e.githubApiFallbackAttempted),
                    metadataFetchErrorRetryable,
                );
                updateRouteMeta.metadataFetchAttemptFlow = mapMetadataFetchAttemptFlow(
                    e && e.githubApiAttemptFlow,
                    !!(e && e.githubApiFallbackAttempted),
                );
                updateRouteMeta.metadataFetchFailureRoute = mapXrayMetadataFetchFailureRoute(e);
                updateRouteMeta.metadataFetchFailureHost = mapXrayMetadataFetchFailureHost(e);
                updateRouteMeta.metadataFetchRoute = mapXrayMetadataFetchFailureRoute(e);
                updateRouteMeta.metadataFetchRouteHost = mapXrayMetadataFetchFailureHost(e);
            }

            const inputUrl = (() => {
                if (typeof updateRequest === 'string') return updateRequest.trim();
                if (updateRequest && typeof updateRequest === 'object' && typeof updateRequest.url === 'string') {
                    return updateRequest.url.trim();
                }
                return '';
            })();
            const inputRouteHint = (() => {
                if (!updateRequest || typeof updateRequest !== 'object') return '';
                const route = typeof updateRequest.route === 'string' ? updateRequest.route.trim().toLowerCase() : '';
                if (route === 'direct' || route === 'proxy') return route;
                return '';
            })();
            updateRouteMeta.requestRouteHint = inputRouteHint || 'none';
            updateRouteMeta.requestUrlHost = (() => {
                if (!inputUrl) return 'none';
                try {
                    return new URL(inputUrl).hostname || 'none';
                } catch (e) {
                    return 'invalid';
                }
            })();
            updateFailureStage = 'select_download_route';
            if (remoteVer && releaseManifest) {
                updateRouteMeta.releaseSource = 'manifest';
                updateRouteMeta.metadataRouteUrl = releaseMetadataRouteUrl || 'unknown';
                // Ignore untrusted renderer URLs. Optionally honor "direct" when it exactly matches.
                const explicitDirectRequestedByHint = inputRouteHint === 'direct';
                const explicitProxyRequestedByHint = inputRouteHint === 'proxy';
                const explicitDirectRequestedByUrl = inputUrl === releaseManifest.assetDirectUrl;
                const explicitProxyRequestedByUrl = inputUrl === releaseManifest.assetProxyUrl;
                const hintRoute = explicitDirectRequestedByHint ? 'direct' : (explicitProxyRequestedByHint ? 'proxy' : 'none');
                const urlRoute = explicitDirectRequestedByUrl ? 'direct' : (explicitProxyRequestedByUrl ? 'proxy' : 'none');
                const routeHintConflict = hintRoute !== 'none' && urlRoute !== 'none' && hintRoute !== urlRoute;
                const explicitDirectRequested = explicitDirectRequestedByHint || explicitDirectRequestedByUrl;
                const explicitProxyRequested = explicitProxyRequestedByHint || explicitProxyRequestedByUrl;
                const preferDirectDownloadRoute = (() => {
                    if (explicitDirectRequested) return true;
                    if (explicitProxyRequested) return false;
                    try {
                        return new URL(releaseMetadataRouteUrl).hostname === 'api.github.com';
                    } catch (e) {
                        return false;
                    }
                })();
                useDirect = preferDirectDownloadRoute;
                updateRouteMeta.routeDecisionSource = (() => {
                    if (explicitDirectRequestedByHint || explicitProxyRequestedByHint) return 'request_hint';
                    if (explicitDirectRequestedByUrl || explicitProxyRequestedByUrl) return 'request_url';
                    return 'metadata_route';
                })();
                updateRouteMeta.routeHintConflict = routeHintConflict;
                updateRouteMeta.routeHintConflictType = routeHintConflict ? 'hint_vs_url' : 'none';
                updateRouteMeta.metadataRoute = (() => {
                    try {
                        return new URL(releaseMetadataRouteUrl).hostname === 'api.github.com' ? 'direct' : 'proxy';
                    } catch (e) {
                        return 'unknown';
                    }
                })();
                primaryAssetUrl = useDirect ? releaseManifest.assetDirectUrl : releaseManifest.assetProxyUrl;
                fallbackAssetUrl = useDirect ? releaseManifest.assetProxyUrl : releaseManifest.assetDirectUrl;
            } else {
                // Fallback: derive release tag from the URL so we can still verify sha256 even when GitHub API is unavailable.
                if (!inputUrl) throw new Error('Missing Xray download URL');
                const derived = parseXrayReleaseTagFromUrl(inputUrl, assetName);
                if (!derived) throw new Error('Invalid Xray download URL');
                remoteVer = normalizeXrayReleaseTag(derived);
                if (!remoteVer) throw new Error('Invalid Xray release tag');
                try {
                    const u = new URL(inputUrl);
                    useDirect = u.hostname === 'github.com';
                } catch (e) {
                    useDirect = false;
                }
                const { direct: fallbackDirect, proxy: fallbackProxy } = buildXrayReleaseDownloadUrls(remoteVer, assetName);
                primaryAssetUrl = useDirect ? fallbackDirect : fallbackProxy;
                fallbackAssetUrl = useDirect ? fallbackProxy : fallbackDirect;
                updateRouteMeta.releaseSource = 'derived';
                updateRouteMeta.metadataRouteUrl = 'unavailable';
                updateRouteMeta.metadataRoute = 'unavailable';
                updateRouteMeta.routeDecisionSource = 'derived_url';
            }
            updateRouteMeta.selectedAssetRoute = useDirect ? 'direct' : 'proxy';
            updateRouteMeta.selectedAssetHost = (() => {
                try {
                    return new URL(primaryAssetUrl).hostname || 'unknown';
                } catch (e) {
                    return 'invalid';
                }
            })();
            if (!primaryAssetUrl) throw new Error('Missing Xray asset download URL');

        updateFailureStage = 'version_guard';
        const currentVer = normalizeXrayReleaseTag(await getLocalXrayVersion()) || 'v0.0.0';
        if (compareXrayReleaseTags(remoteVer, currentVer) < 0) {
            throw new Error(`Xray downgrade blocked: current ${currentVer}, remote ${remoteVer}`);
        }
        updateRouteMeta.remote = remoteVer ? String(remoteVer).replace(/^v/, '') : null;

        updateFailureStage = 'download_asset';
        tempDir = createSecureXrayUpdateTempDir();
        zipPath = path.join(tempDir, 'xray.zip');
        const effectiveAssetUrl = await downloadFileWithRouteFallback(primaryAssetUrl, fallbackAssetUrl, zipPath, { maxBytes: XRAY_UPDATE_ZIP_MAX_BYTES });
        const usedDirectRoute = (() => {
            try {
                return new URL(effectiveAssetUrl).hostname === 'github.com';
            } catch (e) {
                return false;
            }
        })();
        updateRouteMeta.effectiveAssetRoute = usedDirectRoute ? 'direct' : 'proxy';
        updateRouteMeta.effectiveAssetHost = (() => {
            try {
                return new URL(effectiveAssetUrl).hostname || 'unknown';
            } catch (e) {
                return 'invalid';
            }
        })();
        updateRouteMeta.usedAssetFallback = String(effectiveAssetUrl) !== String(primaryAssetUrl);
        if (!fs.existsSync(zipPath)) throw new Error('Download failed: file not found');
        const zipStat = fs.statSync(zipPath);
        if (zipStat.size <= 0) throw new Error('Download failed: empty file');
        if (!isZipFileHeader(zipPath)) throw new Error('Downloaded file is not a zip');
            const zipSha = sha256FileHex(zipPath);
            if (!zipSha || zipSha.length !== 64) throw new Error('Failed to compute zip sha256');

            // Download and verify upstream sha256 digest (required).
            updateFailureStage = 'verify_digest';
            if (!remoteVer) throw new Error('Failed to determine Xray version for verification');
            const dgstPath = path.join(tempDir, 'xray.zip.dgst');
            let primaryDgstUrl = '';
            let fallbackDgstUrl = '';
            if (releaseManifest && remoteVer === releaseManifest.tag) {
                updateRouteMeta.dgstSource = 'manifest';
                primaryDgstUrl = usedDirectRoute ? releaseManifest.dgstDirectUrl : releaseManifest.dgstProxyUrl;
                fallbackDgstUrl = usedDirectRoute ? releaseManifest.dgstProxyUrl : releaseManifest.dgstDirectUrl;
            } else {
                updateRouteMeta.dgstSource = 'derived';
                const { direct: dgstDirect, proxy: dgstProxy } = buildXrayReleaseDownloadUrls(remoteVer, `${assetName}.dgst`);
                primaryDgstUrl = usedDirectRoute ? dgstDirect : dgstProxy;
                fallbackDgstUrl = usedDirectRoute ? dgstProxy : dgstDirect;
            }
            updateRouteMeta.selectedDgstHost = (() => {
                try {
                    return new URL(primaryDgstUrl).hostname || 'unknown';
                } catch (e) {
                    return 'invalid';
                }
            })();
            updateRouteMeta.selectedDgstRoute = (() => {
                try {
                    return new URL(primaryDgstUrl).hostname === 'github.com' ? 'direct' : 'proxy';
                } catch (e) {
                    return usedDirectRoute ? 'direct' : 'proxy';
                }
            })();
            const effectiveDgstUrl = await downloadFileWithRouteFallback(primaryDgstUrl, fallbackDgstUrl, dgstPath, { maxBytes: XRAY_UPDATE_DGST_MAX_BYTES });
            updateRouteMeta.effectiveDgstRoute = (() => {
                try {
                    return new URL(effectiveDgstUrl).hostname === 'github.com' ? 'direct' : 'proxy';
                } catch (e) {
                    return usedDirectRoute ? 'direct' : 'proxy';
                }
            })();
            updateRouteMeta.effectiveDgstHost = (() => {
                try {
                    return new URL(effectiveDgstUrl).hostname || 'unknown';
                } catch (e) {
                    return 'invalid';
                }
            })();
            updateRouteMeta.usedDgstFallback = String(effectiveDgstUrl) !== String(primaryDgstUrl);
            const dgstText = fs.readFileSync(dgstPath, 'utf8');
            const expectedSha = parseSha256FromDgstText(dgstText, assetName);
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
        updateFailureStage = 'extract_zip';
        const extractDir = path.join(tempDir, 'extracted');
        fs.mkdirSync(extractDir, { recursive: true });
        await extractZip(zipPath, extractDir, { maxEntries: XRAY_UPDATE_EXTRACT_MAX_ENTRIES, maxUncompressedBytes: XRAY_UPDATE_EXTRACT_MAX_BYTES });
        updateFailureStage = 'locate_binary';
        function collectXrayBinaryCandidates(dir, bucket = []) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        collectXrayBinaryCandidates(fullPath, bucket);
                    } else if (file === exeName) {
                        bucket.push(fullPath);
                    }
                }
                return bucket;
            }
            const xrayBinaryCandidates = collectXrayBinaryCandidates(extractDir, []);
            const xrayBinary = xrayBinaryCandidates.length === 1 ? xrayBinaryCandidates[0] : null;
            console.log('[Update Debug] Searched in:', extractDir);
            console.log('[Update Debug] Found binary candidates:', xrayBinaryCandidates);
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
                if (xrayBinaryCandidates.length > 1) {
                    throw new Error(`Multiple Xray binaries found in package (${xrayBinaryCandidates.length})`);
                }
                throw new Error('Xray binary not found in package');
            }
            const realExtractDir = fs.realpathSync(extractDir);
            const realExtractPrefix = realExtractDir.endsWith(path.sep) ? realExtractDir : `${realExtractDir}${path.sep}`;
            const realXrayBinary = fs.realpathSync(xrayBinary);
            if (!(realXrayBinary === realExtractDir || realXrayBinary.startsWith(realExtractPrefix))) {
                throw new Error('Resolved Xray binary escapes extracted directory');
            }

            // Basic sanity check for extracted binary (size + magic header)
            updateFailureStage = 'verify_binary';
            try {
                const st = fs.statSync(realXrayBinary);
                if (!st.isFile()) throw new Error('Xray binary is not a file');
                if (st.size < 512 * 1024) throw new Error(`Xray binary too small: ${st.size}`);
                if (st.size > 120 * 1024 * 1024) throw new Error(`Xray binary too large: ${st.size}`);

                const fd = fs.openSync(realXrayBinary, 'r');
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
                try { fs.chmodSync(realXrayBinary, '755'); } catch (e) { }
            }
            if (remoteVer) {
                updateFailureStage = 'verify_version';
                const extractedVer = await getXrayVersionFromBinary(realXrayBinary);
                if (extractedVer !== remoteVer) {
                    throw new Error(`Xray version mismatch: expected ${remoteVer}, got ${extractedVer}`);
                }
            }

            // Install with rollback protection: if copy fails, restore previous binary from backup.
            updateFailureStage = 'install_binary';
            await installXrayBinaryWithRollback(realXrayBinary, { expectedVersion: remoteVer });
            // 清理临时目录（即使失败也不影响更新）
            try {
                if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.warn('[Cleanup Warning] Failed to remove temp dir:', cleanupErr.message);
            }
            return {
                success: true,
                errorCode: null,
                failureStage: null,
                ...updateRouteMeta,
            };
        } catch (e) {
            console.error('Xray update failed:', e);
            try {
                if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (err) { }
            return {
                success: false,
                error: e && e.message ? e.message : String(e),
                errorCode: resolveXrayUpdateErrorCode(e, updateFailureStage),
                failureStage: updateFailureStage,
                ...updateRouteMeta,
            };
        }
    } finally {
        releaseXrayUpdateFileLock(xrayUpdateLockPath);
        xrayUpdateInProgress = false;
    }
});
ipcMain.handle('get-running-ids', () => Object.keys(activeProcesses));

ipcMain.handle('list-running-profile-summaries', async () => {
    try {
        const runningIds = Object.keys(activeProcesses || {});
        if (runningIds.length === 0) return { success: true, profiles: [], count: 0 };
        const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
        const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map((p) => [p.id, p]));
        const summaries = runningIds.map((id) => {
            const runtime = activeProcesses[id] || {};
            const profile = profileMap.get(id) || {};
            const fingerprint = (profile && typeof profile === 'object' && profile.fingerprint && typeof profile.fingerprint === 'object')
                ? profile.fingerprint
                : {};
            return {
                id,
                name: profile.name || id,
                proxyMode: runtime.proxyMode || profile.proxyMode || 'app_proxy',
                proxyEngine: runtime.proxyEngine || profile.proxyEngine || fingerprint.proxyEngine || 'xray',
            };
        });
        return { success: true, profiles: summaries, count: summaries.length };
    } catch (e) {
        return { success: false, profiles: [], count: 0, error: e && e.message ? e.message : String(e || 'list running profiles failed'), code: 'LIST_RUNNING_PROFILES_FAILED' };
    }
});

ipcMain.handle('stop-other-running-profiles', async (event, keepId) => {
    let keepNormalized = null;
    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map((profile) => [profile.id, profile]));
    const resolveProfileName = (id) => {
        if (!id) return '';
        const profile = profileMap.get(id);
        if (profile && typeof profile.name === 'string' && profile.name.trim()) return profile.name;
        return id;
    };
    if (keepId) {
        try {
            keepNormalized = resolveProfileDirOrThrow(keepId).id;
        } catch (e) {
            return {
                success: false,
                partial: false,
                requestedIds: [],
                requestedCount: 0,
                stoppedIds: [],
                stoppedCount: 0,
                alreadyStoppedIds: [],
                alreadyStoppedCount: 0,
                invalidIds: [],
                invalidCount: 0,
                failed: [],
                failedProfiles: [],
                failedCount: 0,
                stopOtherContractVersion: STOP_OTHER_CONTRACT_VERSION,
                dominantErrorCode: null,
                errorCodeCounts: {},
                errorCodeProfiles: {},
                errorCodeProfileTotals: {},
                errorCodeProfilesTruncated: {},
                errorCodeDetailSamples: {},
                errorCodeDetailTotals: {},
                errorCodeDetailsTruncated: {},
                rankedErrorCodes: [],
                failureCodeSummaries: [],
                failureDetailSampleLimitPerCode: STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE,
                failureDetailMessageMaxLength: STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH,
                errorCodeSummaryTopLimit: STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT,
                codeProfileMapCodeLimit: STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT,
                codeProfileMapProfileLimit: STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT,
                remainingProfileSummaryLimit: STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT,
                failedProfileSummaryLimit: STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT,
                remainingIds: [],
                remainingProfiles: [],
                remainingCount: 0,
                retryReady: false,
                retryReasonCode: 'invalid_keep_id',
                status: 'STOP_OTHER_INVALID_KEEP_ID',
                error: 'Invalid keep id',
                errorCode: 'STOP_OTHER_INVALID_KEEP_ID',
                code: 'STOP_OTHER_INVALID_KEEP_ID',
            };
        }
    }
    const runningIds = Object.keys(activeProcesses || {});
    const targetIds = runningIds.filter((id) => !keepNormalized || id !== keepNormalized);
    const result = {
        success: true,
        partial: false,
        requestedIds: targetIds.slice(),
        requestedCount: targetIds.length,
        stoppedIds: [],
        stoppedCount: 0,
        alreadyStoppedIds: [],
        alreadyStoppedCount: 0,
        invalidIds: [],
        invalidCount: 0,
        failed: [],
        failedProfiles: [],
        failedCount: 0,
        stopOtherContractVersion: STOP_OTHER_CONTRACT_VERSION,
        dominantErrorCode: null,
        errorCodeCounts: {},
        errorCodeProfiles: {},
        errorCodeProfileTotals: {},
        errorCodeProfilesTruncated: {},
        errorCodeDetailSamples: {},
        errorCodeDetailTotals: {},
        errorCodeDetailsTruncated: {},
        rankedErrorCodes: [],
        failureCodeSummaries: [],
        failureDetailSampleLimitPerCode: STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE,
        failureDetailMessageMaxLength: STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH,
        errorCodeSummaryTopLimit: STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT,
        codeProfileMapCodeLimit: STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT,
        codeProfileMapProfileLimit: STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT,
        remainingProfileSummaryLimit: STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT,
        failedProfileSummaryLimit: STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT,
        remainingIds: [],
        remainingProfiles: [],
        remainingCount: 0,
        retryReady: false,
        retryReasonCode: 'no_conflict',
        status: 'STOP_OTHER_NONE_RUNNING',
        errorCode: null,
        code: null,
    };
    if (targetIds.length === 0) return result;

    for (const targetId of targetIds) {
        let resolved;
        try {
            resolved = resolveProfileDirOrThrow(targetId);
        } catch (e) {
            result.invalidIds.push(targetId);
            result.failed.push({
                id: targetId,
                name: resolveProfileName(targetId),
                error: 'Invalid id',
                errorCode: 'STOP_PROFILE_INVALID_ID',
                code: 'STOP_PROFILE_INVALID_ID',
            });
            result.success = false;
            continue;
        }
        const stopResult = await stopProfileRuntimeByResolvedId(resolved.id, resolved.profileDir, event && event.sender ? event.sender : null);
        if (stopResult && stopResult.success) {
            if (stopResult.stopped) result.stoppedIds.push(resolved.id);
            else result.alreadyStoppedIds.push(resolved.id);
            continue;
        }
        result.failed.push({
            id: resolved.id,
            name: resolveProfileName(resolved.id),
            error: stopResult && stopResult.error ? stopResult.error : 'Stop failed',
            errorCode: (stopResult && (stopResult.errorCode || stopResult.code)) ? (stopResult.errorCode || stopResult.code) : 'STOP_PROFILE_FAILED',
            code: (stopResult && (stopResult.code || stopResult.errorCode)) ? (stopResult.code || stopResult.errorCode) : 'STOP_PROFILE_FAILED',
        });
        result.success = false;
    }

    result.stoppedCount = result.stoppedIds.length;
    result.alreadyStoppedCount = result.alreadyStoppedIds.length;
    result.invalidCount = result.invalidIds.length;
    result.failedCount = result.failed.length;
    result.failedProfiles = result.failed
        .map((item) => {
            const id = String(item && item.id ? item.id : '').trim();
            const name = String(item && (item.name || item.id) ? (item.name || item.id) : '').trim();
            if (!id && !name) return null;
            return { id, name: name || id };
        })
        .filter((item) => Boolean(item));
    const failureAggregation = aggregateStopOtherFailureCodes(result.failed);
    result.dominantErrorCode = failureAggregation.dominantErrorCode;
    result.errorCodeCounts = failureAggregation.errorCodeCounts;
    result.errorCodeProfiles = failureAggregation.errorCodeProfiles;
    result.errorCodeProfileTotals = failureAggregation.errorCodeProfileTotals;
    result.errorCodeProfilesTruncated = failureAggregation.errorCodeProfilesTruncated;
    result.errorCodeDetailSamples = failureAggregation.errorCodeDetailSamples;
    result.errorCodeDetailTotals = failureAggregation.errorCodeDetailTotals;
    result.errorCodeDetailsTruncated = failureAggregation.errorCodeDetailsTruncated;
    result.rankedErrorCodes = failureAggregation.rankedErrorCodes;
    result.failureCodeSummaries = failureAggregation.failureCodeSummaries;
    result.stopOtherContractVersion = STOP_OTHER_CONTRACT_VERSION;
    result.failureDetailSampleLimitPerCode = STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE;
    result.failureDetailMessageMaxLength = STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH;
    result.errorCodeSummaryTopLimit = STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT;
    result.codeProfileMapCodeLimit = STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT;
    result.codeProfileMapProfileLimit = STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT;
    result.remainingProfileSummaryLimit = STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT;
    result.failedProfileSummaryLimit = STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT;
    result.remainingIds = Object.keys(activeProcesses || {}).filter((id) => !keepNormalized || id !== keepNormalized);
    result.remainingProfiles = result.remainingIds.map((id) => ({ id, name: resolveProfileName(id) }));
    result.remainingCount = result.remainingIds.length;
    if (result.remainingCount > 0 && result.success) {
        result.success = false;
    }
    result.retryReady = result.remainingCount === 0 && result.requestedCount > 0;
    if (result.retryReady && result.success) {
        result.retryReasonCode = 'ready';
        result.status = 'STOP_OTHER_ALL_STOPPED';
    } else if (result.retryReady && !result.success) {
        result.retryReasonCode = 'ready_partial';
        result.status = 'STOP_OTHER_PARTIAL_READY';
    } else if (result.stoppedCount > 0) {
        result.retryReasonCode = 'still_running';
        result.status = 'STOP_OTHER_PARTIAL_BLOCKED';
    } else {
        result.retryReasonCode = 'still_running';
        result.status = 'STOP_OTHER_BLOCKED';
    }
    result.partial = result.failed.length > 0 || result.invalidIds.length > 0 || result.alreadyStoppedIds.length > 0;
    if (!result.success) {
        result.errorCode = 'STOP_OTHER_PROFILES_PARTIAL';
        result.code = 'STOP_OTHER_PROFILES_PARTIAL';
    }
    return result;
});

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

ipcMain.handle('get-profile-cookie-sites', async (event, profileId) => {
    try {
        const safeId = normalizeProfileId(profileId);
        if (!safeId) return { success: false, error: 'Invalid profile id', sites: [] };
        const result = await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                const cookies = raw.map(toCookieRecord).filter(Boolean);
                const sites = summarizeCookieSites(cookies);
                return {
                    sites,
                    totalCookies: cookies.length,
                    totalSites: sites.length,
                };
            });
        });
        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message || String(e), sites: [] };
    }
});

ipcMain.handle('get-profile-cookies', async (event, payload) => {
    try {
        const req = (payload && typeof payload === 'object') ? payload : { id: payload };
        const safeId = normalizeProfileId(req.id);
        if (!safeId) return { success: false, error: 'Invalid profile id', cookies: [] };
        const site = normalizeCookieSiteInput(req.site || '');
        const result = await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                let cookies = raw.map(toCookieRecord).filter(Boolean);
                if (site) cookies = cookies.filter(rec => cookieRecordMatchesSite(rec, site));
                cookies.sort((a, b) => {
                    const siteCmp = String(a.site || '').localeCompare(String(b.site || ''));
                    if (siteCmp !== 0) return siteCmp;
                    const hostCmp = String(a.host || '').localeCompare(String(b.host || ''));
                    if (hostCmp !== 0) return hostCmp;
                    const nameCmp = String(a.name || '').localeCompare(String(b.name || ''));
                    if (nameCmp !== 0) return nameCmp;
                    return String(a.path || '').localeCompare(String(b.path || ''));
                });
                return {
                    cookies,
                    total: cookies.length,
                    site: site || null,
                };
            });
        });
        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message || String(e), cookies: [] };
    }
});

ipcMain.handle('set-profile-cookie', async (event, payload) => {
    try {
        const req = payload && typeof payload === 'object' ? payload : {};
        const safeId = normalizeProfileId(req.id);
        if (!safeId) return { success: false, error: 'Invalid profile id' };
        if (!req.cookie || typeof req.cookie !== 'object') return { success: false, error: 'Invalid cookie payload' };
        const site = normalizeCookieSiteInput(req.site || '');
        const result = await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                const normalized = await setCookieViaCdp(cdp, req.cookie, { defaultSiteHost: site || null });
                const raw = await getAllCookiesFromCdp(cdp);
                const cookies = raw.map(toCookieRecord).filter(Boolean);
                const normDomain = normalizeCookieHostLike(normalized.domain || '');
                const saved = cookies.find(item => (
                    item.name === normalized.name
                    && normalizeCookieHostLike(item.domain || '') === normDomain
                    && normalizeCookiePath(item.path) === normalizeCookiePath(normalized.path)
                )) || null;
                return {
                    cookie: saved || {
                        name: normalized.name,
                        value: normalized.value,
                        domain: normalized.domain,
                        path: normalized.path,
                        secure: normalized.secure,
                        httpOnly: normalized.httpOnly,
                        sameSite: normalized.sameSite || '',
                        expires: normalized.expires || null,
                    },
                };
            });
        });
        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message || String(e) };
    }
});

ipcMain.handle('delete-profile-cookie', async (event, payload) => {
    try {
        const req = payload && typeof payload === 'object' ? payload : {};
        const safeId = normalizeProfileId(req.id);
        if (!safeId) return { success: false, error: 'Invalid profile id' };
        if (!req.cookie || typeof req.cookie !== 'object') return { success: false, error: 'Invalid cookie payload' };
        const site = normalizeCookieSiteInput(req.site || '');
        await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                await deleteCookieViaCdp(cdp, req.cookie, { defaultSiteHost: site || null });
                return true;
            });
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message || String(e) };
    }
});

ipcMain.handle('clear-profile-cookies-site', async (event, payload) => {
    try {
        const req = payload && typeof payload === 'object' ? payload : { id: payload };
        const safeId = normalizeProfileId(req.id);
        if (!safeId) return { success: false, error: 'Invalid profile id' };
        const site = normalizeCookieSiteInput(req.site || '');
        const result = await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                const records = raw.map(toCookieRecord).filter(Boolean);
                if (!site) {
                    await cdp.send('Network.clearBrowserCookies');
                    return { removed: records.length, site: null };
                }
                const targets = records.filter(rec => cookieRecordMatchesSite(rec, site));
                const seen = new Set();
                let removed = 0;
                for (const rec of targets) {
                    const domainRaw = typeof rec.domain === 'string' ? rec.domain.trim().toLowerCase() : '';
                    const domainHost = normalizeCookieHostLike(domainRaw || '');
                    const domainValue = domainRaw
                        ? (domainRaw.startsWith('.') ? (domainHost ? `.${domainHost}` : domainRaw) : (domainHost || domainRaw))
                        : (domainHost || undefined);
                    const pathValue = normalizeCookiePath(rec.path);
                    const key = `${rec.name}|${domainValue || ''}|${pathValue}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    try {
                        await cdp.send('Network.deleteCookies', {
                            name: rec.name,
                            domain: domainValue || undefined,
                            path: pathValue,
                        });
                        removed += 1;
                    } catch (e) { }
                }
                return { removed, site };
            });
        });
        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message || String(e) };
    }
});

ipcMain.handle('export-profile-cookies', async (event, payload) => {
    try {
        const req = payload && typeof payload === 'object' ? payload : { id: payload };
        const safeId = normalizeProfileId(req.id);
        if (!safeId) return { success: false, error: 'Invalid profile id' };
        const site = normalizeCookieSiteInput(req.site || '');
        const result = await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                const raw = await getAllCookiesFromCdp(cdp);
                let cookies = raw.map(toCookieRecord).filter(Boolean);
                if (site) cookies = cookies.filter(rec => cookieRecordMatchesSite(rec, site));
                return { cookies, site };
            });
        });
        if (!Array.isArray(result.cookies) || result.cookies.length === 0) {
            return { success: false, error: 'No cookies to export' };
        }

        const safeSite = (result.site || 'all').replace(/[^0-9a-z._-]+/gi, '_').slice(0, 64) || 'all';
        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Cookies',
            defaultPath: `GeekEZ_Cookies_${safeId}_${safeSite}_${Date.now()}.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!filePath) return { success: false, cancelled: true };

        const exportPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            profileId: safeId,
            site: result.site || null,
            total: result.cookies.length,
            cookies: result.cookies.map((item) => ({
                name: item.name,
                value: item.value,
                domain: item.domain,
                path: item.path,
                secure: item.secure,
                httpOnly: item.httpOnly,
                sameSite: item.sameSite || undefined,
                expires: item.expires || undefined,
                session: item.session === true,
            })),
        };

        await fs.writeJson(filePath, exportPayload, { spaces: 2 });
        return { success: true, filePath, total: result.cookies.length, site: result.site || null };
    } catch (e) {
        return { success: false, error: e.message || String(e) };
    }
});

ipcMain.handle('import-profile-cookies', async (event, payload) => {
    try {
        const req = payload && typeof payload === 'object' ? payload : { id: payload };
        const safeId = normalizeProfileId(req.id);
        if (!safeId) return { success: false, error: 'Invalid profile id' };
        const site = normalizeCookieSiteInput(req.site || '');
        const mode = String(req.mode || 'merge').toLowerCase() === 'replace' ? 'replace' : 'merge';

        const openRes = await dialog.showOpenDialog({
            title: 'Import Cookies',
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!openRes || !Array.isArray(openRes.filePaths) || openRes.filePaths.length === 0) {
            return { success: false, cancelled: true };
        }
        const filePath = openRes.filePaths[0];
        const st = await fs.stat(filePath);
        if (!st || st.size > COOKIE_IMPORT_MAX_BYTES) {
            return { success: false, error: `Import file too large (max ${Math.floor(COOKIE_IMPORT_MAX_BYTES / 1024 / 1024)}MB)` };
        }
        const content = await fs.readFile(filePath, 'utf8');
        const importItems = normalizeCookieImportPayload(content);
        if (!importItems.length) return { success: false, error: 'No cookies found in import file' };

        const result = await queueProfileCookieOperation(safeId, async () => {
            return withProfileCookieCdp(safeId, async ({ cdp }) => {
                const errors = [];
                let sourceItems = importItems;
                if (site) {
                    sourceItems = sourceItems.filter((item) => {
                        try {
                            const normalized = normalizeCookieMutationInput(item, { defaultSiteHost: site });
                            const rec = toCookieRecord(normalized);
                            return cookieRecordMatchesSite(rec, site);
                        } catch (e) {
                            return false;
                        }
                    });
                }

                if (!sourceItems.length) {
                    return { imported: 0, failed: 0, total: 0, errors: [], site: site || null, mode };
                }

                if (mode === 'replace') {
                    if (site) {
                        const rawBefore = await getAllCookiesFromCdp(cdp);
                        const beforeRecords = rawBefore.map(toCookieRecord).filter(Boolean);
                        const toRemove = beforeRecords.filter(rec => cookieRecordMatchesSite(rec, site));
                        const seen = new Set();
                        for (const rec of toRemove) {
                            const domainRaw = typeof rec.domain === 'string' ? rec.domain.trim().toLowerCase() : '';
                            const domainHost = normalizeCookieHostLike(domainRaw || '');
                            const domainValue = domainRaw
                                ? (domainRaw.startsWith('.') ? (domainHost ? `.${domainHost}` : domainRaw) : (domainHost || domainRaw))
                                : (domainHost || undefined);
                            const pathValue = normalizeCookiePath(rec.path);
                            const key = `${rec.name}|${domainValue || ''}|${pathValue}`;
                            if (seen.has(key)) continue;
                            seen.add(key);
                            try {
                                await cdp.send('Network.deleteCookies', {
                                    name: rec.name,
                                    domain: domainValue || undefined,
                                    path: pathValue,
                                });
                            } catch (e) { }
                        }
                    } else {
                        await cdp.send('Network.clearBrowserCookies');
                    }
                }

                let imported = 0;
                for (const item of sourceItems) {
                    try {
                        await setCookieViaCdp(cdp, item, { defaultSiteHost: site || null });
                        imported += 1;
                    } catch (e) {
                        if (errors.length < 20) {
                            const name = item && item.name ? item.name : 'unknown';
                            errors.push(`${name}: ${e.message || String(e)}`);
                        }
                    }
                }

                return {
                    imported,
                    failed: sourceItems.length - imported,
                    total: sourceItems.length,
                    errors,
                    site: site || null,
                    mode,
                };
            });
        });

        return {
            success: true,
            filePath,
            ...result,
        };
    } catch (e) {
        return { success: false, error: e.message || String(e) };
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
        const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
        const index = profiles.findIndex(p => p.id === safeId);
        if (index > -1) {
            const bindId = normalizeProxyBindId(updatedProfile.proxyBindId);
            let boundNode = null;
            if (bindId) {
                assertProxyBindUniqueOrThrow(profiles, bindId, { exceptProfileId: safeId });
                boundNode = assertProxyBindNodeExistsOrThrow(settings, bindId);
            }

            const next = { ...updatedProfile, id: safeId };
            if (bindId) {
                next.proxyBindId = bindId;
                if (boundNode && boundNode.url) next.proxyStr = String(boundNode.url);
            } else {
                if (next.proxyBindId) delete next.proxyBindId;
            }
            profiles[index] = next;
            await fs.writeJson(PROFILES_FILE, profiles);
            return true;
        }
        return false;
    } catch (e) {
        if (e && e.code && String(e.code).startsWith('PROXY_BIND_')) throw e;
        return false;
    }
});
ipcMain.handle('save-profile', async (event, data) => {
    const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
    const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
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

    const bindId = normalizeProxyBindId(data && data.proxyBindId);
    let boundNode = null;
    if (bindId) {
        assertProxyBindUniqueOrThrow(profiles, bindId);
        boundNode = assertProxyBindNodeExistsOrThrow(settings, bindId);
    }

    const newProfile = {
        id: uuidv4(),
        name: data.name,
        proxyStr: bindId && boundNode && boundNode.url ? String(boundNode.url) : data.proxyStr,
        proxyBindId: bindId || undefined,
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
    if (!id) return { success: false, error: 'Missing id', errorCode: 'STOP_PROFILE_MISSING_ID', code: 'STOP_PROFILE_MISSING_ID' };
    let resolved;
    try {
        resolved = resolveProfileDirOrThrow(id);
    } catch (e) {
        return { success: false, error: 'Invalid id', errorCode: 'STOP_PROFILE_INVALID_ID', code: 'STOP_PROFILE_INVALID_ID' };
    }
    id = resolved.id;
    const profileDir = resolved.profileDir;
    return stopProfileRuntimeByResolvedId(id, profileDir, event && event.sender ? event.sender : null);
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

ipcMain.handle('get-settings', async () => {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return {
            preProxies: [],
            mode: 'single',
            enablePreProxy: false,
            enableRemoteDebugging: false,
            [SETTINGS_PROXY_BATCH_TEST_STRATEGY_KEY]: normalizeProxyBatchTestStrategySafe(null),
        };
    }
    const settings = await fs.readJson(SETTINGS_FILE);
    settings[SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY] = normalizeAllowedPrivateHostList(settings[SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY]);
    settings[SETTINGS_PROXY_BATCH_TEST_STRATEGY_KEY] = normalizeProxyBatchTestStrategySafe(settings[SETTINGS_PROXY_BATCH_TEST_STRATEGY_KEY]);
    return settings;
});
ipcMain.handle('save-settings', async (e, settings) => {
    const next = (settings && typeof settings === 'object') ? { ...settings } : {};
    next[SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY] = normalizeAllowedPrivateHostList(next[SETTINGS_PRIVATE_FETCH_ALLOWLIST_KEY]);
    next[SETTINGS_PROXY_BATCH_TEST_STRATEGY_KEY] = normalizeProxyBatchTestStrategySafe(next[SETTINGS_PROXY_BATCH_TEST_STRATEGY_KEY]);
    await fs.writeJson(SETTINGS_FILE, next);
    return true;
});
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

ipcMain.handle('export-proxy-test-report', async (e, payload = {}) => {
    try {
        const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
        const groupIdRaw = payload && typeof payload.groupId === 'string' ? payload.groupId.trim() : '';
        const groupId = groupIdRaw || null;

        const report = buildProxyTestReport({
            nodes: settings.preProxies || [],
            subscriptions: settings.subscriptions || [],
            groupId,
        });

        if (!report || !report.summary || report.summary.totalNodes <= 0) {
            return { success: false, error: 'No proxy nodes available for report' };
        }

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const groupSuffix = groupId ? `_${groupId}` : '_all';
        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Proxy Test Report',
            defaultPath: `GeekEZ_ProxyTestReport${groupSuffix}_${stamp}.json`,
            filters: [
                { name: 'JSON', extensions: ['json'] },
                { name: 'CSV', extensions: ['csv'] },
            ],
        });
        if (!filePath) return { success: false, cancelled: true };

        const format = String(path.extname(filePath || '').toLowerCase()) === '.csv' ? 'csv' : 'json';
        if (format === 'csv') {
            await fs.writeFile(filePath, toProxyTestReportCsv(report), 'utf8');
        } else {
            await fs.writeJson(filePath, report, { spaces: 2 });
        }

        return {
            success: true,
            filePath,
            format,
            totalNodes: report.summary.totalNodes,
            failNodes: report.summary.failNodes,
        };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
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

        const currentProfiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
        const currentSettings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
        const nextSettings = (currentSettings && typeof currentSettings === 'object') ? { ...currentSettings } : { preProxies: [], subscriptions: [] };
        if (!Array.isArray(nextSettings.preProxies)) nextSettings.preProxies = [];
        if (!Array.isArray(nextSettings.subscriptions)) nextSettings.subscriptions = [];

        if (Array.isArray(backupData.preProxies)) {
            for (const p of backupData.preProxies) {
                if (!p || typeof p !== 'object') continue;
                if (!nextSettings.preProxies.find(cp => cp && cp.id === p.id)) {
                    nextSettings.preProxies.push(p);
                }
            }
        }
        if (Array.isArray(backupData.subscriptions)) {
            for (const s of backupData.subscriptions) {
                if (!s || typeof s !== 'object') continue;
                if (!nextSettings.subscriptions.find(cs => cs && cs.id === s.id)) {
                    nextSettings.subscriptions.push(s);
                }
            }
        }

        let importedCount = 0;
        const idMap = {};
        const importedSafeIds = new Set();
        const incoming = [];

        const incomingProfiles = Array.isArray(backupData.profiles) ? backupData.profiles : [];
        for (const rawProfile of incomingProfiles) {
            if (!rawProfile || typeof rawProfile !== 'object') continue;
            const originalId = typeof rawProfile.id === 'string' ? rawProfile.id : null;
            const safeId = normalizeProfileId(originalId) || uuidv4();
            if (originalId) idMap[originalId] = safeId;

            const profile = { ...rawProfile, id: safeId };
            const bindId = normalizeProxyBindId(profile.proxyBindId);
            if (bindId) profile.proxyBindId = bindId;
            else if (profile.proxyBindId) delete profile.proxyBindId;
            importedSafeIds.add(safeId);
            incoming.push(profile);
            importedCount++;
        }

        // Validate incoming bindings without blocking on pre-existing broken data.
        const existingBind = new Map();
        currentProfiles.forEach((cp) => {
            if (!cp || typeof cp !== 'object') return;
            const pid = cp.id ? String(cp.id) : '';
            if (!pid || importedSafeIds.has(pid)) return;
            const bid = normalizeProxyBindId(cp.proxyBindId);
            if (!bid) return;
            if (!existingBind.has(bid)) existingBind.set(bid, { profileId: pid, name: cp.name || '' });
        });

        const importedBind = new Map();
        const conflicts = [];
        const missing = [];
        incoming.forEach((p) => {
            const pid = p && p.id ? String(p.id) : '';
            const bid = normalizeProxyBindId(p && p.proxyBindId);
            if (!pid || !bid) return;

            const prev = importedBind.get(bid);
            if (prev && prev.profileId && prev.profileId !== pid) {
                conflicts.push({
                    bindId: bid,
                    profiles: [
                        { id: prev.profileId, name: prev.name || '' },
                        { id: pid, name: p.name || '' },
                    ],
                });
            } else if (!prev) {
                importedBind.set(bid, { profileId: pid, name: p.name || '' });
            }

            const ex = existingBind.get(bid);
            if (ex && ex.profileId && ex.profileId !== pid) {
                conflicts.push({
                    bindId: bid,
                    profiles: [
                        { id: ex.profileId, name: ex.name || '' },
                        { id: pid, name: p.name || '' },
                    ],
                });
            }

            const node = findProxyNodeById(nextSettings, bid);
            if (!node || !node.url) missing.push({ bindId: bid, profileId: pid, name: p.name || '' });
        });

        if (conflicts.length > 0) {
            const err = new Error(`Import failed: ${conflicts.length} proxy bind conflict(s). Unbind or delete conflicting profiles first.`);
            err.code = 'PROXY_BIND_IN_USE';
            err.details = { conflicts };
            throw err;
        }
        if (missing.length > 0) {
            const err = new Error(`Import failed: ${missing.length} bound node(s) missing in proxy pool. Import proxies/subscriptions first.`);
            err.code = 'PROXY_BIND_NODE_NOT_FOUND';
            err.details = { missing };
            throw err;
        }

        incoming.forEach((profile) => {
            const idx = currentProfiles.findIndex(cp => cp.id === profile.id);
            if (idx > -1) currentProfiles[idx] = profile;
            else currentProfiles.push(profile);
        });

        await fs.writeJson(PROFILES_FILE, currentProfiles);
        await fs.writeJson(SETTINGS_FILE, nextSettings);

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
            return { success: false, error: '密码错误或文件已损坏', code: err.code || null };
        }
        return { success: false, error: err.message, code: err.code || null, details: err.details || null };
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
                const currentProfiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
                const currentSettings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
                const nextSettings = (currentSettings && typeof currentSettings === 'object') ? { ...currentSettings } : { preProxies: [], subscriptions: [] };
                if (!Array.isArray(nextSettings.preProxies)) nextSettings.preProxies = [];
                if (!Array.isArray(nextSettings.subscriptions)) nextSettings.subscriptions = [];

                const willImportProfiles = Array.isArray(data.profiles);
                const willImportProxies = Array.isArray(data.preProxies) || Array.isArray(data.subscriptions);

                if (Array.isArray(data.preProxies)) {
                    data.preProxies.forEach(p => {
                        if (!p || typeof p !== 'object') return;
                        if (!nextSettings.preProxies.find(cp => cp && cp.id === p.id)) nextSettings.preProxies.push(p);
                    });
                }
                if (Array.isArray(data.subscriptions)) {
                    data.subscriptions.forEach(s => {
                        if (!s || typeof s !== 'object') return;
                        if (!nextSettings.subscriptions.find(cs => cs && cs.id === s.id)) nextSettings.subscriptions.push(s);
                    });
                }

                if (Array.isArray(data.profiles)) {
                    const importedSafeIds = new Set();
                    const incoming = [];
                    for (const rawProfile of data.profiles) {
                        if (!rawProfile || typeof rawProfile !== 'object') continue;
                        const safeId = normalizeProfileId(rawProfile.id) || uuidv4();
                        const p = { ...rawProfile, id: safeId };
                        const bindId = normalizeProxyBindId(p.proxyBindId);
                        if (bindId) p.proxyBindId = bindId;
                        else if (p.proxyBindId) delete p.proxyBindId;
                        importedSafeIds.add(safeId);
                        incoming.push(p);
                    }

                    // Validate imported bindings without blocking on pre-existing broken data.
                    const existingBind = new Map();
                    currentProfiles.forEach((cp) => {
                        if (!cp || typeof cp !== 'object') return;
                        const pid = cp.id ? String(cp.id) : '';
                        if (!pid || importedSafeIds.has(pid)) return; // overwritten by import
                        const bid = normalizeProxyBindId(cp.proxyBindId);
                        if (!bid) return;
                        if (!existingBind.has(bid)) existingBind.set(bid, { profileId: pid, name: cp.name || '' });
                    });

                    const importedBind = new Map();
                    const conflicts = [];
                    const missing = [];
                    incoming.forEach((p) => {
                        const pid = p && p.id ? String(p.id) : '';
                        const bid = normalizeProxyBindId(p && p.proxyBindId);
                        if (!pid || !bid) return;

                        const prev = importedBind.get(bid);
                        if (prev && prev.profileId && prev.profileId !== pid) {
                            conflicts.push({
                                bindId: bid,
                                profiles: [
                                    { id: prev.profileId, name: prev.name || '' },
                                    { id: pid, name: p.name || '' },
                                ],
                            });
                        } else if (!prev) {
                            importedBind.set(bid, { profileId: pid, name: p.name || '' });
                        }

                        const ex = existingBind.get(bid);
                        if (ex && ex.profileId && ex.profileId !== pid) {
                            conflicts.push({
                                bindId: bid,
                                profiles: [
                                    { id: ex.profileId, name: ex.name || '' },
                                    { id: pid, name: p.name || '' },
                                ],
                            });
                        }

                        const node = findProxyNodeById(nextSettings, bid);
                        if (!node || !node.url) missing.push({ bindId: bid, profileId: pid, name: p.name || '' });
                    });

                    if (conflicts.length > 0) {
                        const err = new Error(`Import failed: ${conflicts.length} proxy bind conflict(s). Unbind or delete conflicting profiles first.`);
                        err.code = 'PROXY_BIND_IN_USE';
                        err.details = { conflicts };
                        throw err;
                    }
                    if (missing.length > 0) {
                        const err = new Error(`Import failed: ${missing.length} bound node(s) missing in proxy pool. Import proxies/subscriptions first.`);
                        err.code = 'PROXY_BIND_NODE_NOT_FOUND';
                        err.details = { missing };
                        throw err;
                    }

                    incoming.forEach((p) => {
                        const idx = currentProfiles.findIndex(cp => cp.id === p.id);
                        if (idx > -1) currentProfiles[idx] = p;
                        else currentProfiles.push(p);
                    });
                }

                if (willImportProfiles) {
                    await fs.writeJson(PROFILES_FILE, currentProfiles);
                    updated = true;
                }
                if (willImportProxies) {
                    await fs.writeJson(SETTINGS_FILE, nextSettings);
                    updated = true;
                }
            } else if (data.name && data.proxyStr && data.fingerprint) {
                // 单个环境导入
                const profiles = fs.existsSync(PROFILES_FILE) ? await fs.readJson(PROFILES_FILE) : [];
                const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : { preProxies: [], subscriptions: [] };
                const bindId = normalizeProxyBindId(data && data.proxyBindId);
                let boundNode = null;
                if (bindId) {
                    assertProxyBindUniqueOrThrow(profiles, bindId);
                    boundNode = assertProxyBindNodeExistsOrThrow(settings, bindId);
                }
                const newProfile = {
                    ...data,
                    id: uuidv4(),
                    proxyStr: bindId && boundNode && boundNode.url ? String(boundNode.url) : data.proxyStr,
                    proxyBindId: bindId || undefined,
                    isSetup: false,
                    createdAt: Date.now()
                };
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
            emitProfileStatusEvent(mainWindow.webContents, profileId, 'starting');
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

    // Resolve bound proxy node (proxyBindId -> latest node url) before any proxy-related work.
    // This keeps subscription updates from desyncing profile.proxyStr.
    const resolvedBindId = normalizeProxyBindId(profile.proxyBindId);
    if (resolvedBindId) {
        const node = assertProxyBindNodeExistsOrThrow(settings, resolvedBindId);
        const resolvedUrl = node && node.url ? String(node.url) : '';
        if (resolvedUrl && profile.proxyStr !== resolvedUrl) {
            profile.proxyStr = resolvedUrl;
            try { await fs.writeJson(PROFILES_FILE, profiles, { spaces: 2 }); } catch (e) { }
        }
    }

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

            const resolved = await testProxyNodeInternal(profile.proxyStr, 'auto', { preProxyOverride: profile.preProxyOverride || 'default' });

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

    // Avoid chaining to itself (pre-proxy equals the main proxy).
    try {
        const target = finalPreProxyConfig && Array.isArray(finalPreProxyConfig.preProxies) && finalPreProxyConfig.preProxies[0]
            ? finalPreProxyConfig.preProxies[0]
            : null;
        const preUrl = target && target.url ? normalizeProxyInputRaw(target.url) : '';
        const mainUrl = profile && profile.proxyStr ? normalizeProxyInputRaw(profile.proxyStr) : '';
        if (preUrl && mainUrl && preUrl === mainUrl) {
            finalPreProxyConfig = null;
            switchMsg = null;
        }
    } catch (e) { }

    // Upstream proxy gate: when chain pre-proxy is enabled, ensure the upstream proxy is alive.
    // Rationale: subscription fetch/test latency should match real routed network, and a broken upstream
    // should block launching profiles (user expectation: everything is proxy-driven).
    if (shouldUsePreProxy) {
        const preNode = (() => {
            const fromConfig = finalPreProxyConfig && Array.isArray(finalPreProxyConfig.preProxies) ? finalPreProxyConfig.preProxies[0] : null;
            if (fromConfig && fromConfig.url) return fromConfig;

            const list = settings && Array.isArray(settings.preProxies) ? settings.preProxies : [];
            const active = list.filter((p) => p && p.enable !== false && p.url);
            if (active.length === 0) return null;

            // Stable fallback when finalPreProxyConfig is null (e.g., skipped because it's the same as main proxy).
            const mode = String(settings.mode || 'single');
            const selectedId = settings.selectedId ? String(settings.selectedId) : '';
            if (mode === 'single' || mode === 'balance') {
                return selectedId ? (active.find((p) => p && String(p.id) === selectedId) || active[0]) : active[0];
            }
            return active[0];
        })();
        if (!preNode || !preNode.url) {
            const err = new Error('Upstream proxy is enabled but no active upstream node is configured');
            err.code = 'UPSTREAM_PROXY_NOT_CONFIGURED';
            throw err;
        }
        const upstream = await ensureUpstreamPreProxyEngine(settings, preNode);
        if (!upstream || !upstream.endpoint) {
            const err = new Error('Failed to start upstream proxy engine');
            err.code = 'UPSTREAM_PROXY_ENGINE_START_FAILED';
            throw err;
        }
        const connectivity = await probeUpstreamConnectivityCached(upstream.endpoint, { timeoutMs: 6000, parallelism: 2, maxAgeMs: 30_000 });
        if (!connectivity || !connectivity.ok) {
            const err = new Error((connectivity && connectivity.error) ? String(connectivity.error) : 'Upstream proxy connectivity probe failed');
            err.code = 'UPSTREAM_PROXY_CONNECTIVITY_FAILED';
            throw err;
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
            const inferred = inferProxyRuntimeEngine(normalizeProxyInputRaw(profile.proxyStr));
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
        emitProfileStatusEvent(sender, profileId, 'running');
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

                emitProfileStatusEvent(sender, profileId, 'stopped');
            }
        });

        return switchMsg;
    } catch (err) {
        const launchErrorCode = mapProfileLaunchErrorCode(err);
        if (err && typeof err === 'object' && !err.code) {
            err.errorCode = launchErrorCode;
        }
        try {
            emitProfileStatusEvent(sender, profileId, 'launch_failed', {
                errorCode: launchErrorCode,
                errorStage: 'launch',
                errorMessage: err && err.message ? err.message : String(err || 'launch failed'),
            });
        } catch (e) { }
        try {
            profile.diagnostics = profile.diagnostics || {};
            profile.diagnostics.lastError = {
                at: new Date().toISOString(),
                stage: 'launch',
                errorCode: launchErrorCode,
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
function validateGitHubApiUrlOrThrow(inputUrl) {
    if (typeof inputUrl !== 'string' || !inputUrl.trim()) throw new Error('Invalid URL');
    const u = new URL(inputUrl.trim());
    if (u.protocol !== 'https:') throw new Error('Only https URLs are allowed');

    const normalizePath = (pathname) => String(pathname || '').replace(/\/+$/, '');
    const allowedApiPaths = new Set([
        '/repos/EchoHS/GeekezBrowser/releases/latest',
        '/repos/XTLS/Xray-core/releases/latest',
    ]);

    if (u.hostname === 'api.github.com') {
        const pathname = normalizePath(u.pathname);
        if (!allowedApiPaths.has(pathname)) throw new Error('GitHub API path not allowed');
        return u;
    }

    if (u.hostname === 'gh-proxy.com') {
        const raw = String(u.pathname || '').replace(/^\/+/, '');
        if (!raw) throw new Error('Invalid gh-proxy URL (missing target URL)');
        let decoded;
        try {
            decoded = decodeURIComponent(raw);
        } catch (e) {
            throw new Error('Invalid gh-proxy URL (bad encoding)');
        }
        if (!decoded.startsWith('https://')) throw new Error('Invalid gh-proxy URL (missing https target)');
        const target = new URL(decoded);
        if (target.protocol !== 'https:') throw new Error('Only https proxy targets are allowed');
        if (target.hostname === 'gh-proxy.com') throw new Error('Nested gh-proxy targets are not allowed');
        if (target.hostname !== 'api.github.com') throw new Error('GitHub API proxy target not allowed');
        const pathname = normalizePath(target.pathname);
        if (!allowedApiPaths.has(pathname)) throw new Error('GitHub API proxy path not allowed');
        return u;
    }

    throw new Error(`GitHub API host not allowed: ${u.hostname}`);
}

function isRetryableGitHubApiNetworkError(err) {
    const code = err && typeof err === 'object' ? err.code : '';
    const message = err && typeof err === 'object' && typeof err.message === 'string' ? err.message : '';
    if (message === 'Timeout') return true;
    return [
        'ECONNRESET',
        'ECONNREFUSED',
        'EAI_AGAIN',
        'ENOTFOUND',
        'ENETUNREACH',
        'EHOSTUNREACH',
        'ETIMEDOUT',
    ].includes(String(code || '').toUpperCase());
}

async function fetchGitHubApiJsonOnce(url) {
    let currentUrl = String(url || '').trim();
    if (!currentUrl) throw new Error('Invalid URL');
    const headers = { 'User-Agent': 'GeekEZ-Browser', Accept: 'application/vnd.github+json' };
    const redirectStatus = new Set([301, 302, 303, 307, 308]);
    const upstreamAgent = await (async () => {
        const settings = fs.existsSync(SETTINGS_FILE) ? await fs.readJson(SETTINGS_FILE) : {};
        const upstream = await ensureUpstreamPreProxyEngine(settings);
        return upstream ? new SocksProxyAgent(`socks5h://${upstream.endpoint}`) : undefined;
    })();

    for (let redirectCount = 0; redirectCount <= GITHUB_API_MAX_REDIRECTS; redirectCount++) {
        const urlObj = validateGitHubApiUrlOrThrow(currentUrl);
        const res = await new Promise((resolve, reject) => {
            const req = https.get(urlObj, { headers, agent: upstreamAgent }, resolve);
            req.on('error', reject);
            req.setTimeout(GITHUB_API_TIMEOUT_MS, () => {
                try { req.destroy(new Error('Timeout')); } catch (e) { }
            });
        });

        const status = Number(res && res.statusCode);
        const location = res && res.headers && res.headers.location ? String(res.headers.location) : '';

        if (redirectStatus.has(status)) {
            if (!location) {
                res.resume();
                throw new Error(`Redirect response missing location (HTTP ${status})`);
            }
            if (redirectCount >= GITHUB_API_MAX_REDIRECTS) {
                res.resume();
                throw new Error('Too many redirects');
            }
            const nextUrl = new URL(location, urlObj).toString();
            res.resume();
            currentUrl = nextUrl;
            continue;
        }

        if (status !== 200) {
            res.resume();
            throw new Error(`GitHub API returned ${status}`);
        }

        const contentLength = parseInt(res.headers['content-length'], 10) || 0;
        if (contentLength > 0 && contentLength > GITHUB_API_MAX_BYTES) {
            res.resume();
            throw new Error('GitHub API response too large');
        }

        const chunks = [];
        let receivedBytes = 0;
        await new Promise((resolve, reject) => {
            res.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (receivedBytes > GITHUB_API_MAX_BYTES) {
                    reject(new Error('GitHub API response too large'));
                    try { res.destroy(); } catch (e) { }
                    return;
                }
                chunks.push(chunk);
            });
            res.on('end', resolve);
            res.on('error', reject);
        });

        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }

    throw new Error('Too many redirects');
}

async function fetchGitHubApiJsonWithRoute(url) {
    const directUrl = String(url || '').trim();
    if (!directUrl) throw new Error('Invalid URL');

    let directHost = '';
    try {
        directHost = new URL(directUrl).hostname;
    } catch (e) {
        directHost = '';
    }

    const annotateGitHubApiRouteError = (
        err,
        route,
        fallbackAttempted = false,
        fallbackResult = 'unknown',
        fallbackDecision = 'unknown',
        failureHost = 'unknown',
        attemptFlow = 'unknown',
        attemptCount = 0,
    ) => {
        let wrapped = err;
        if (!wrapped || typeof wrapped !== 'object') {
            wrapped = new Error(String(err || 'Unknown GitHub API error'));
        }
        try {
            wrapped.githubApiFailureRoute = route || 'unknown';
            wrapped.githubApiFailureHost = String(failureHost || 'unknown').trim().toLowerCase() || 'unknown';
            wrapped.githubApiFallbackAttempted = !!fallbackAttempted;
            wrapped.githubApiFallbackResult = mapMetadataFetchFallbackResult(fallbackResult, !!fallbackAttempted);
            wrapped.githubApiAttemptFlow = mapMetadataFetchAttemptFlow(attemptFlow, !!fallbackAttempted);
            wrapped.githubApiAttemptCount = mapMetadataFetchAttemptCount(attemptCount, !!fallbackAttempted);
            const githubApiErrorRetryable = isRetryableGitHubApiNetworkError(wrapped);
            wrapped.githubApiErrorRetryable = githubApiErrorRetryable;
            wrapped.githubApiFallbackDecision = mapMetadataFetchFallbackDecision(
                fallbackDecision,
                !!fallbackAttempted,
                githubApiErrorRetryable,
            );
        } catch (e) { }
        return wrapped;
    };

    try {
        const data = await fetchGitHubApiJsonOnce(directUrl);
        return {
            data,
            routeUrl: directUrl,
            fallbackUsed: false,
            fallbackAttempted: false,
            attemptCount: 1,
            fallbackResult: 'not_attempted',
            fallbackDecision: 'not_needed',
            attemptFlow: 'direct_only',
        };
    } catch (err) {
        const directErr = annotateGitHubApiRouteError(
            err,
            'direct',
            false,
            'not_attempted',
            'unknown',
            directHost || 'unknown',
            'direct_only',
            1,
        );
        if (directHost !== 'api.github.com') throw directErr;
        if (!isRetryableGitHubApiNetworkError(directErr)) throw directErr;
        const proxyUrl = `https://gh-proxy.com/${directUrl}`;
        const proxyHost = (() => {
            try {
                return new URL(proxyUrl).hostname || 'unknown';
            } catch (e) {
                return 'unknown';
            }
        })();
        try {
            const data = await fetchGitHubApiJsonOnce(proxyUrl);
            return {
                data,
                routeUrl: proxyUrl,
                fallbackUsed: true,
                fallbackAttempted: true,
                attemptCount: 2,
                fallbackResult: 'succeeded',
                fallbackDecision: 'retryable_error',
                attemptFlow: 'direct_then_proxy',
            };
        } catch (proxyErr) {
            throw annotateGitHubApiRouteError(
                proxyErr,
                'proxy',
                true,
                'failed',
                'retryable_error',
                proxyHost,
                'direct_then_proxy',
                2,
            );
        }
    }
}

async function fetchLatestXrayReleaseWithRoute() {
    return await fetchGitHubApiJsonWithRoute('https://api.github.com/repos/XTLS/Xray-core/releases/latest');
}

async function fetchJson(url) {
    const result = await fetchGitHubApiJsonWithRoute(url);
    return result.data;
}
function getLocalXrayVersion() { return new Promise((resolve) => { if (!fs.existsSync(BIN_PATH)) return resolve('v0.0.0'); try { const proc = spawn(BIN_PATH, ['-version']); let output = ''; proc.stdout.on('data', d => output += d.toString()); proc.on('close', () => { const match = output.match(/Xray\s+v?(\d+\.\d+\.\d+)/i); resolve(match ? (match[1].startsWith('v') ? match[1] : 'v' + match[1]) : 'v0.0.0'); }); proc.on('error', () => resolve('v0.0.0')); } catch (e) { resolve('v0.0.0'); } }); }
function compareVersions(v1, v2) { const p1 = v1.split('.').map(Number); const p2 = v2.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((p1[i] || 0) > (p2[i] || 0)) return 1; if ((p1[i] || 0) < (p2[i] || 0)) return -1; } return 0; }
function getProxyPid(proc) {
    if (!proc) return null;
    return proc.proxyPid || proc.xrayPid || null;
}

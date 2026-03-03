const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const readline = require('readline'); // 引入 readline 用于控制光标
const {
    extractZip,
    isZipFileHeader,
    parseSha256DigestForAsset,
    sha256FileHex,
    validateUpdateDownloadUrl,
    UPDATE_MAX_DOWNLOAD_BYTES,
    UPDATE_DOWNLOAD_TIMEOUT_MS,
    UPDATE_MAX_REDIRECTS,
} = require('./updateUtils');

// 配置
const RESOURCES_BIN = path.join(__dirname, 'resources', 'bin');
const PLATFORM_ARCH = `${os.platform()}-${os.arch()}`; // e.g., darwin-arm64, win32-x64
const BIN_DIR = path.join(RESOURCES_BIN, PLATFORM_ARCH);
const GH_PROXY = 'https://gh-proxy.com/';
const XRAY_API_URL = 'https://api.github.com/repos/XTLS/Xray-core/releases/latest';

const XRAY_SETUP_ZIP_MAX_BYTES = 100 * 1024 * 1024; // 100MB
const XRAY_SETUP_EXTRACT_MAX_ENTRIES = 200;
const XRAY_SETUP_EXTRACT_MAX_BYTES = 140 * 1024 * 1024; // 140MB (uncompressed)
const XRAY_SETUP_DGST_MAX_BYTES = 1 * 1024 * 1024; // 1MB
const XRAY_SETUP_API_MAX_REDIRECTS = 5;
const XRAY_SETUP_API_MAX_BYTES = 1 * 1024 * 1024; // 1MB
const XRAY_SETUP_API_TIMEOUT_MS = 10_000;

// --- 辅助工具：格式化字节 ---
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- 核心：单行刷新进度条 ---
function showProgress(received, total, startTime, prefix = 'Downloading') {
    const percent = total > 0 ? ((received / total) * 100).toFixed(1) : 0;
    const elapsedTime = (Date.now() - startTime) / 1000; // seconds
    const speed = elapsedTime > 0 ? (received / elapsedTime) : 0; // bytes/sec

    // 进度条视觉效果 [==========----------]
    const barLength = 30; // 稍微加长一点
    const filledLength = total > 0 ? Math.round((barLength * received) / total) : 0;
    // 防止计算溢出
    const validFilledLength = filledLength > barLength ? barLength : filledLength;
    const bar = '█'.repeat(validFilledLength) + '░'.repeat(barLength - validFilledLength);

    const speedStr = formatBytes(speed) + '/s';
    const receivedStr = formatBytes(received);
    const totalStr = formatBytes(total);

    // 构造输出字符串，使用 \r 回到行首实现单行刷新
    const output = `\r${prefix} [${bar}] ${percent}% | ${receivedStr}/${totalStr} | ${speedStr}`;

    // 直接使用 \r 回车符，更兼容各种终端
    process.stdout.write(output);
}

// --- 核心逻辑 ---

function getPlatformInfo() {
    const platform = os.platform();
    const arch = os.arch();
    let xrayAsset = '';
    let exeName = 'xray';

    if (platform === 'win32') {
        if (arch === 'arm64') xrayAsset = 'Xray-windows-arm64-v8a.zip';
        else xrayAsset = `Xray-windows-${arch === 'x64' ? '64' : '32'}.zip`;
        exeName = 'xray.exe';
    } else if (platform === 'darwin') {
        xrayAsset = `Xray-macos-${arch === 'arm64' ? 'arm64-v8a' : '64'}.zip`;
    } else if (platform === 'linux') {
        if (arch === 'arm64') xrayAsset = 'Xray-linux-arm64-v8a.zip';
        else xrayAsset = `Xray-linux-${arch === 'x64' ? '64' : '32'}.zip`;
    } else {
        console.error('❌ Unsupported Platform:', platform);
        process.exit(1);
    }
    return { xrayAsset, exeName };
}

function checkNetwork() {
    return new Promise((resolve) => {
        console.log('🌐 Checking network connectivity...');
        const req = https.get('https://www.google.com', { timeout: 3000 }, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

function validateXrayApiUrlOrThrow(inputUrl) {
    if (typeof inputUrl !== 'string' || !inputUrl.trim()) throw new Error('Invalid URL');
    const u = new URL(inputUrl.trim());
    if (u.protocol !== 'https:') throw new Error('Only https URLs are allowed');

    const allowedPathPrefix = '/repos/XTLS/Xray-core/';

    if (u.hostname === 'api.github.com') {
        if (!u.pathname.startsWith(allowedPathPrefix)) throw new Error('Xray API path not allowed');
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
        if (target.hostname !== 'api.github.com') throw new Error('Xray API proxy target not allowed');
        if (!target.pathname.startsWith(allowedPathPrefix)) throw new Error('Xray API proxy path not allowed');
        return u;
    }

    throw new Error(`Xray API host not allowed: ${u.hostname}`);
}

function isRetryableXrayApiNetworkError(err) {
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

// Fetch latest Xray version from GitHub API
async function fetchLatestXrayVersionOnce(startUrl) {
    let currentUrl = String(startUrl || '').trim();
    if (!currentUrl) throw new Error('Invalid URL');
    const headers = { 'User-Agent': 'GeekEZ-Browser-Setup', Accept: 'application/vnd.github+json' };
    const redirectStatus = new Set([301, 302, 303, 307, 308]);

    for (let redirectCount = 0; redirectCount <= XRAY_SETUP_API_MAX_REDIRECTS; redirectCount++) {
        const urlObj = validateXrayApiUrlOrThrow(currentUrl);
        const res = await new Promise((resolve, reject) => {
            const req = https.get(
                {
                    hostname: urlObj.hostname,
                    path: urlObj.pathname + urlObj.search,
                    headers,
                },
                resolve
            );
            req.on('error', reject);
            req.setTimeout(XRAY_SETUP_API_TIMEOUT_MS, () => {
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
            if (redirectCount >= XRAY_SETUP_API_MAX_REDIRECTS) {
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
        if (contentLength > 0 && contentLength > XRAY_SETUP_API_MAX_BYTES) {
            res.resume();
            throw new Error('GitHub API response too large');
        }

        const chunks = [];
        let receivedBytes = 0;
        await new Promise((resolve, reject) => {
            res.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (receivedBytes > XRAY_SETUP_API_MAX_BYTES) {
                    reject(new Error('GitHub API response too large'));
                    try { res.destroy(); } catch (e) { }
                    return;
                }
                chunks.push(chunk);
            });
            res.on('end', resolve);
            res.on('error', reject);
        });

        const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const tag = json && typeof json.tag_name === 'string' ? json.tag_name.trim() : '';
        if (!tag) throw new Error('GitHub API response missing tag_name');
        return tag; // e.g., "v24.12.31"
    }

    throw new Error('Too many redirects');
}

async function getLatestXrayVersionWithRoute(useProxy = false) {
    const directUrl = XRAY_API_URL;
    const proxyUrl = GH_PROXY + XRAY_API_URL;
    const primary = useProxy ? proxyUrl : directUrl;
    const fallback = useProxy ? directUrl : proxyUrl;

    try {
        const tag = await fetchLatestXrayVersionOnce(primary);
        return { tag, routeUrl: primary };
    } catch (err) {
        if (!isRetryableXrayApiNetworkError(err)) throw err;
        const tag = await fetchLatestXrayVersionOnce(fallback);
        return { tag, routeUrl: fallback };
    }
}

async function getLatestXrayVersion(useProxy = false) {
    const result = await getLatestXrayVersionWithRoute(useProxy);
    return result.tag;
}

// 支持进度显示的下载函数
function isRetryableXrayDownloadNetworkError(err) {
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

async function downloadFileWithFallback(primaryUrl, fallbackUrl, dest, label = 'Downloading', options = {}) {
    try {
        await downloadFile(primaryUrl, dest, label, options);
        return String(primaryUrl);
    } catch (err) {
        if (!isRetryableXrayDownloadNetworkError(err)) throw err;
        if (!fallbackUrl || String(fallbackUrl) === String(primaryUrl)) throw err;
        try { console.log(`[Setup] Download retry via fallback route: ${label}`); } catch (e) { }
        await downloadFile(fallbackUrl, dest, label, options);
        return String(fallbackUrl);
    }
}

function downloadFile(url, dest, label = 'Downloading', options = {}) {
    const maxRedirects = Number.isInteger(options.maxRedirects) ? options.maxRedirects : UPDATE_MAX_REDIRECTS;
    const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : UPDATE_MAX_DOWNLOAD_BYTES;
    const timeoutMs = Number.isInteger(options.timeoutMs) ? options.timeoutMs : UPDATE_DOWNLOAD_TIMEOUT_MS;

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmpPath = `${dest}.${Date.now()}.tmp`;

    const doRequest = (currentUrl, redirectsLeft) =>
        new Promise((resolve, reject) => {
            let resolvedUrl;
            try {
                resolvedUrl = validateUpdateDownloadUrl(currentUrl);
            } catch (e) {
                reject(e);
                return;
            }

            const headers = { 'User-Agent': 'GeekEZ-Browser-Setup' };
            let file = null;
            let timer = null;
            let finished = false;

            const cleanup = (err) => {
                if (finished) return;
                finished = true;
                try { if (timer) clearTimeout(timer); } catch (e) { }
                try { if (file) file.close(() => { }); } catch (e) { }
                try { fs.unlinkSync(tmpPath); } catch (e) { }
                try { process.stdout.write('\n'); } catch (e) { }
                reject(err);
            };

            const req = https.get(resolvedUrl, { headers }, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    if (redirectsLeft <= 0) {
                        response.resume();
                        cleanup(new Error('Too many redirects'));
                        return;
                    }
                    const nextUrl = new URL(response.headers.location, resolvedUrl).toString();
                    finished = true; // chained request will settle the promise
                    response.resume();
                    doRequest(nextUrl, redirectsLeft - 1).then(resolve).catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    response.resume();
                    cleanup(new Error(`Failed to download: HTTP ${response.statusCode}`));
                    return;
                }

                const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
                if (totalBytes > 0 && totalBytes > maxBytes) {
                    response.resume();
                    cleanup(new Error(`Download too large (>${maxBytes} bytes)`));
                    return;
                }

                file = fs.createWriteStream(tmpPath);
                const startTime = Date.now();
                let receivedBytes = 0;

                timer = setTimeout(() => {
                    try { req.destroy(new Error('Download timeout')); } catch (e) { }
                }, timeoutMs);

                response.on('data', (chunk) => {
                    receivedBytes += chunk.length;
                    showProgress(receivedBytes, totalBytes, startTime, label);
                    if (receivedBytes > maxBytes) {
                        cleanup(new Error(`Download too large (>${maxBytes} bytes)`));
                        try { req.destroy(); } catch (e) { }
                        try { response.destroy(); } catch (e) { }
                    }
                });

                response.on('error', cleanup);
                file.on('error', cleanup);

                file.on('finish', () => {
                    try { if (timer) clearTimeout(timer); } catch (e) { }
                    try { file.close(() => { }); } catch (e) { }
                    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch (e) { }
                    try { fs.renameSync(tmpPath, dest); } catch (e) { cleanup(e); return; }
                    try { process.stdout.write('\n'); } catch (e) { }
                    finished = true;
                    resolve();
                });

                response.pipe(file);
            });

            req.on('error', cleanup);
        });

    return doRequest(url, maxRedirects);
}

function digestContainsNamedAssets(text) {
    if (typeof text !== 'string') return false;
    // OpenSSL style: SHA2-256 (file.zip) = <hash>
    if (/^SHA2?-?256\s*\([^)]+\)\s*=\s*[a-f0-9]{64}\s*$/im.test(text)) return true;
    // sha256sum style: <hash>  file.zip
    if (/^[a-f0-9]{64}\s+\*?.+\S/im.test(text)) return true;
    return false;
}

function parseSha256FromDgstText(text, assetName = '') {
    const scoped = parseSha256DigestForAsset(text, assetName);
    if (scoped) return scoped;
    // If digest contains named assets but does not match requested asset, reject (no fallback).
    if (digestContainsNamedAssets(text)) return null;
    // Fallback for bare-hash digests (asset-specific .dgst files sometimes omit filenames).
    return parseSha256DigestForAsset(text, '');
}

async function main() {
    try {
        // 1. 准备 Xray
        if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

        const { xrayAsset, exeName } = getPlatformInfo();
        const zipPath = path.join(BIN_DIR, 'xray.zip');
        const isGlobal = await checkNetwork();

        console.log(`🌍 Network: ${isGlobal ? 'Global' : 'CN (Mirror)'}`);

        // Get latest Xray version from GitHub
        let xrayVersion;
        let xrayVersionRouteUrl = isGlobal ? XRAY_API_URL : (GH_PROXY + XRAY_API_URL);
        try {
            console.log('🔍 Fetching latest Xray version...');
            const latestXray = await getLatestXrayVersionWithRoute(!isGlobal);
            xrayVersion = latestXray.tag;
            xrayVersionRouteUrl = latestXray.routeUrl || xrayVersionRouteUrl;
            console.log(`📦 Latest version: ${xrayVersion}`);
        } catch (e) {
            console.log('⚠️  Failed to get latest version, using fallback: v25.12.8');
            xrayVersion = 'v25.12.8';
        }

        const baseUrl = `https://github.com/XTLS/Xray-core/releases/download/${xrayVersion}/${xrayAsset}`;
        const directXrayZipUrl = baseUrl;
        const proxyXrayZipUrl = GH_PROXY + baseUrl;
        const preferDirectDownloadRoute = (() => {
            try {
                return new URL(xrayVersionRouteUrl).hostname === 'api.github.com';
            } catch (e) {
                return isGlobal;
            }
        })();
        const primaryXrayZipUrl = preferDirectDownloadRoute ? directXrayZipUrl : proxyXrayZipUrl;
        const fallbackXrayZipUrl = preferDirectDownloadRoute ? proxyXrayZipUrl : directXrayZipUrl;

        process.stdout.write(`⬇️  Downloading Xray (${xrayVersion})...\n`);

        // 这里的 Label 用于进度条前缀
        const effectiveXrayZipUrl = await downloadFileWithFallback(primaryXrayZipUrl, fallbackXrayZipUrl, zipPath, 'Xray Core', { maxBytes: XRAY_SETUP_ZIP_MAX_BYTES });
        const usedDirectRoute = (() => {
            try {
                return new URL(effectiveXrayZipUrl).hostname === 'github.com';
            } catch (e) {
                return false;
            }
        })();

        if (!fs.existsSync(zipPath)) throw new Error('Download failed: file not found');
        const zipStat = fs.statSync(zipPath);
        if (zipStat.size <= 0) throw new Error('Download failed: empty file');
        if (!isZipFileHeader(zipPath)) throw new Error('Downloaded file is not a zip');
        const zipSha = sha256FileHex(zipPath);
        if (!zipSha || zipSha.length !== 64) throw new Error('Failed to compute zip sha256');

        // Verify upstream sha256 digest (required)
        const dgstPath = path.join(BIN_DIR, 'xray.zip.dgst');
        const primaryXrayDgstUrl = `${usedDirectRoute ? directXrayZipUrl : proxyXrayZipUrl}.dgst`;
        const fallbackXrayDgstUrl = `${usedDirectRoute ? proxyXrayZipUrl : directXrayZipUrl}.dgst`;
        await downloadFileWithFallback(primaryXrayDgstUrl, fallbackXrayDgstUrl, dgstPath, 'Xray Digest', { maxBytes: XRAY_SETUP_DGST_MAX_BYTES });
        const dgstText = fs.readFileSync(dgstPath, 'utf8');
        const expectedSha = parseSha256FromDgstText(dgstText, xrayAsset);
        if (!expectedSha) throw new Error('Failed to parse upstream zip sha256 digest');
        if (zipSha.toLowerCase() !== expectedSha) throw new Error('Downloaded zip sha256 mismatch');

        console.log('📦 Extracting...');
        await extractZip(zipPath, BIN_DIR, {
            maxEntries: XRAY_SETUP_EXTRACT_MAX_ENTRIES,
            maxUncompressedBytes: XRAY_SETUP_EXTRACT_MAX_BYTES,
        });
        try { fs.unlinkSync(zipPath); } catch (e) { }
        try { fs.unlinkSync(dgstPath); } catch (e) { }

        // Move shared resources (geoip.dat, geosite.dat) to common bin directory for asset loading
        const sharedFiles = ['geoip.dat', 'geosite.dat', 'LICENSE', 'README.md'];
        sharedFiles.forEach(file => {
            const srcPath = path.join(BIN_DIR, file);
            const destPath = path.join(RESOURCES_BIN, file);
            if (fs.existsSync(srcPath)) {
                // Only copy if not exists or source is newer
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
                // Remove from platform dir to save space
                fs.unlinkSync(srcPath);
            }
        });

        if (os.platform() !== 'win32') fs.chmodSync(path.join(BIN_DIR, exeName), 0o755);
        console.log(`✅ Xray Updated Successfully! (Platform: ${PLATFORM_ARCH})`);

        // 2. 准备 Chrome
        process.stdout.write('⬇️  Downloading Chrome...\n');
        const { install } = require('@puppeteer/browsers');
        const BUILD_ID = '143.0.7499.169';
        const DOWNLOAD_ROOT = path.join(__dirname, 'resources', 'puppeteer');
        const MIRROR_URL = 'https://npmmirror.com/mirrors/chrome-for-testing';

        if (fs.existsSync(DOWNLOAD_ROOT)) {
            console.log(`🧹 Cleaning existing Chrome directory...`);
            fs.rmSync(DOWNLOAD_ROOT, { recursive: true, force: true });
        }

        const baseUrlChrome = isGlobal ? undefined : MIRROR_URL;

        const chromeStartTime = Date.now();

        const result = await install({
            cacheDir: DOWNLOAD_ROOT,
            browser: 'chrome',
            buildId: BUILD_ID,
            unpack: true,
            baseUrl: baseUrlChrome,
            downloadProgressCallback: (downloadedBytes, totalBytes) => {
                showProgress(downloadedBytes, totalBytes, chromeStartTime, 'Chrome   ');
            }
        });

        process.stdout.write('\n'); // 换行，避免最后一行被吞
        console.log('✅ Chrome downloaded successfully!');
        console.log(`📂 Install Path: ${result.path}`);

        console.log('✨ All Setup Completed! Exiting...');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Setup Failed:', error);
        process.exit(1);
    }
}

main();

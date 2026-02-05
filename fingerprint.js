const os = require('os');

const RESOLUTIONS = [{ w: 1920, h: 1080 }, { w: 2560, h: 1440 }, { w: 1366, h: 768 }, { w: 1536, h: 864 }, { w: 1440, h: 900 }];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateFingerprint() {
    // 1. 强制匹配宿主机系统和架构
    const platform = os.platform();
    const arch = os.arch(); // 'arm64' for Apple Silicon, 'x64' for Intel

    let osData = {};

    if (platform === 'win32') {
        osData = { platform: 'Win32' };
    } else if (platform === 'darwin') {
        // Apple Silicon (M1/M2/M3/M4) vs Intel Mac
        // Note: Chrome on ARM Mac still reports 'MacIntel' for compatibility
        // but we need to not fake other signals that would reveal ARM
        osData = { platform: 'MacIntel', isArm: arch === 'arm64' };
    } else {
        osData = { platform: 'Linux x86_64' };
    }

    const res = getRandom(RESOLUTIONS);
    const languages = ['en-US', 'en'];

    const canvasNoise = {
        r: Math.floor(Math.random() * 10) - 5,
        g: Math.floor(Math.random() * 10) - 5,
        b: Math.floor(Math.random() * 10) - 5,
        a: Math.floor(Math.random() * 10) - 5
    };

    return {
        platform: osData.platform,
        screen: { width: res.w, height: res.h },
        window: { width: res.w, height: res.h },
        languages: languages,
        hardwareConcurrency: [4, 8, 12, 16][Math.floor(Math.random() * 4)],
        deviceMemory: [2, 4, 8][Math.floor(Math.random() * 3)],
        canvasNoise: canvasNoise,
        audioNoise: Math.random() * 0.000001,
        noiseSeed: Math.floor(Math.random() * 9999999),
        timezone: "America/Los_Angeles", // 默认值
        cdp: {
            timezoneId: "America/Los_Angeles",
            locale: "en-US",
            geolocation: null,
            userAgent: null,
            userAgentMetadata: null
        }
    };
}

function normalizeFingerprintSpec(fp) {
    const input = fp && typeof fp === 'object' ? fp : {};
    const out = { ...input };

    const tz = out.timezone || out.cdp?.timezoneId || "America/Los_Angeles";
    out.timezone = tz;

    if (!out.languages || !Array.isArray(out.languages) || out.languages.length === 0) {
        const lang = out.language && out.language !== 'auto' ? out.language : 'en-US';
        out.languages = [lang, lang.split('-')[0]];
    }

    if (!out.cdp || typeof out.cdp !== 'object') out.cdp = {};
    if (!out.cdp.timezoneId) out.cdp.timezoneId = tz;
    if (!out.cdp.locale) {
        const primary = out.languages && out.languages[0] ? out.languages[0] : 'en-US';
        out.cdp.locale = primary;
    }

    // Use cdp.locale as SSOT for language
    if (!out.language || out.language === 'auto' || out.language === 'Auto') {
        out.language = out.cdp.locale;
    }
    if (!out.languages || !Array.isArray(out.languages) || out.languages.length === 0) {
        out.languages = [out.language, out.language.split('-')[0]];
    }
    if (out.geolocation && !out.cdp.geolocation) {
        const g = out.geolocation;
        if (typeof g.latitude === 'number' && typeof g.longitude === 'number') {
            out.cdp.geolocation = { latitude: g.latitude, longitude: g.longitude, accuracy: typeof g.accuracy === 'number' ? g.accuracy : 100 };
        }
    }
    if (out.userAgent && !out.cdp.userAgent) out.cdp.userAgent = out.userAgent;
    if (out.userAgentMetadata && !out.cdp.userAgentMetadata) out.cdp.userAgentMetadata = out.userAgentMetadata;

    // UA-CH defaulting (best-effort)
    if (!out.cdp.userAgentMetadata || typeof out.cdp.userAgentMetadata !== 'object') {
        out.cdp.userAgentMetadata = null;
    }
    if (!out.cdp.userAgentMetadata) {
        const plat = String(out.platform || '').toLowerCase();
        const metaPlatform = plat.includes('win') ? 'Windows' : (plat.includes('mac') ? 'macOS' : (plat.includes('linux') ? 'Linux' : 'Windows'));
        const arch = os.arch();
        const architecture = arch === 'arm64' ? 'arm' : 'x86';
        const bitness = arch === 'ia32' ? '32' : '64';

        let uaFullVersion = '';
        let chromeMajor = '';
        if (typeof out.cdp.userAgent === 'string' && out.cdp.userAgent) {
            const m = out.cdp.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (m && m[1]) uaFullVersion = m[1];
            const maj = out.cdp.userAgent.match(/Chrome\/(\d+)\./);
            if (maj && maj[1]) chromeMajor = maj[1];
        }

        const platformVersion =
            metaPlatform === 'Windows' ? '10.0.0' :
            metaPlatform === 'macOS' ? '' :
            metaPlatform === 'Linux' ? '0.0.0' : '';

        const brands = chromeMajor ? [
            { brand: 'Chromium', version: String(chromeMajor) },
            { brand: 'Google Chrome', version: String(chromeMajor) },
            { brand: 'Not=A?Brand', version: '24' }
        ] : undefined;

        out.cdp.userAgentMetadata = {
            brands,
            fullVersionList: brands && uaFullVersion ? [
                { brand: 'Chromium', version: uaFullVersion },
                { brand: 'Google Chrome', version: uaFullVersion },
                { brand: 'Not=A?Brand', version: '24.0.0.0' }
            ] : undefined,
            mobile: false,
            platform: metaPlatform,
            architecture,
            bitness,
            model: '',
            platformVersion,
            uaFullVersion
        };
    } else {
        // Fill missing fields best-effort
        if (!out.cdp.userAgentMetadata.architecture) {
            const arch = os.arch();
            out.cdp.userAgentMetadata.architecture = arch === 'arm64' ? 'arm' : 'x86';
        }
        if (!out.cdp.userAgentMetadata.bitness) {
            const arch = os.arch();
            out.cdp.userAgentMetadata.bitness = arch === 'ia32' ? '32' : '64';
        }
        if (!out.cdp.userAgentMetadata.uaFullVersion && typeof out.cdp.userAgent === 'string') {
            const m = out.cdp.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (m && m[1]) out.cdp.userAgentMetadata.uaFullVersion = m[1];
        }
        if (!out.cdp.userAgentMetadata.platformVersion) {
            const plat = String(out.cdp.userAgentMetadata.platform || '').toLowerCase();
            const sysRelease = typeof os.release === 'function' ? os.release() : '';
            // Best-effort system-derived platformVersion (avoid overfitting; keep coarse)
            if (plat.includes('windows')) {
                // os.release() on Windows is like 10.0.22631
                const m = String(sysRelease).match(/^(\\d+\\.\\d+)(?:\\.|$)/);
                out.cdp.userAgentMetadata.platformVersion = m && m[1] ? (m[1] + '.0') : '10.0.0';
            } else if (plat.includes('mac')) {
                // os.release() on macOS is Darwin kernel version; avoid inventing a macOS version.
                // Prefer template-provided value; otherwise keep empty to reduce false specificity.
                out.cdp.userAgentMetadata.platformVersion = '';
            } else if (plat.includes('linux')) {
                out.cdp.userAgentMetadata.platformVersion = '0.0.0';
            } else {
                out.cdp.userAgentMetadata.platformVersion = '';
            }
        }
        if (!out.cdp.userAgentMetadata.brands && typeof out.cdp.userAgent === 'string') {
            const maj = out.cdp.userAgent.match(/Chrome\/(\d+)\./);
            if (maj && maj[1]) {
                out.cdp.userAgentMetadata.brands = [
                    { brand: 'Chromium', version: String(maj[1]) },
                    { brand: 'Google Chrome', version: String(maj[1]) },
                    { brand: 'Not=A?Brand', version: '24' }
                ];
            }
        }
        if (!out.cdp.userAgentMetadata.fullVersionList && out.cdp.userAgentMetadata.brands && out.cdp.userAgentMetadata.uaFullVersion) {
            out.cdp.userAgentMetadata.fullVersionList = [
                { brand: 'Chromium', version: out.cdp.userAgentMetadata.uaFullVersion },
                { brand: 'Google Chrome', version: out.cdp.userAgentMetadata.uaFullVersion },
                { brand: 'Not=A?Brand', version: '24.0.0.0' }
            ];
        }
    }

    // WebGL template passthrough (optional)
    if (out.webgl && typeof out.webgl === 'object' && !out.cdp.webgl) {
        out.cdp.webgl = out.webgl;
    }

    // Fonts template passthrough (optional)
    if (out.fonts && typeof out.fonts === 'object' && !out.cdp.fonts) {
        out.cdp.fonts = out.fonts;
    }

    // Media template passthrough (optional)
    if (out.mediaDevices && typeof out.mediaDevices === 'object' && !out.cdp.mediaDevices) {
        out.cdp.mediaDevices = out.mediaDevices;
    }

    // Permissions template passthrough (optional)
    if (out.permissions && typeof out.permissions === 'object' && !out.cdp.permissions) {
        out.cdp.permissions = out.permissions;
    }

    // Plugins/MimeTypes template passthrough (optional)
    if (out.plugins && typeof out.plugins === 'object' && !out.cdp.plugins) {
        out.cdp.plugins = out.plugins;
    }

    return out;
}

// 注入脚本：包含复杂的时区伪装逻辑
function getInjectScript(fp, profileName, watermarkStyle) {
    const fpJson = JSON.stringify(fp);
    const safeProfileName = (profileName || 'Profile').replace(/[<>"'&]/g, ''); // 防止 XSS
    const style = watermarkStyle || 'enhanced'; // 默认使用增强水印
    return `
    (function() {
        try {
            const fp = ${fpJson};
            const targetTimezone = fp.timezone || "America/Los_Angeles";

            // --- Global Helper: makeNative ---
            // Makes hooked functions appear as native code to avoid detection
            const makeNative = (func, name) => {
                const nativeStr = 'function ' + name + '() { [native code] }';
                Object.defineProperty(func, 'toString', {
                    value: function() { return nativeStr; },
                    configurable: true,
                    writable: true
                });
                Object.defineProperty(func.toString, 'toString', {
                    value: function() { return 'function toString() { [native code] }'; },
                    configurable: true,
                    writable: true
                });
                if (func.prototype) {
                    Object.defineProperty(func.prototype.constructor, 'toString', {
                        value: function() { return nativeStr; },
                        configurable: true,
                        writable: true
                    });
                }
                return func;
            };

            // --- 0. Stealth Timezone Hook (Windows Only) ---
            // On Windows, TZ env var doesn't work, so we use JS hooks
            // On macOS/Linux, TZ env var works natively, no JS hook needed (avoids detection)
            const isWindows = navigator.platform && navigator.platform.toLowerCase().includes('win');
            if (isWindows && fp.timezone && fp.timezone !== 'Auto') {
                // Helper to make functions appear native
                const tzMakeNative = (func, name) => {
                    const nativeStr = 'function ' + name + '() { [native code] }';
                    func.toString = function() { return nativeStr; };
                    func.toString.toString = function() { return 'function toString() { [native code] }'; };
                    return func;
                };

                // Calculate timezone offset from timezone name
                // This creates a date in the target timezone and compares to UTC
                const getTimezoneOffsetForZone = (tz) => {
                    try {
                        const now = new Date();
                        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
                        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
                        return Math.round((utcDate - tzDate) / 60000);
                    } catch (e) {
                        return new Date().getTimezoneOffset(); // Fallback to system
                    }
                };

                const targetOffset = getTimezoneOffsetForZone(targetTimezone);

                // Hook 1: Date.prototype.getTimezoneOffset
                const origGetTimezoneOffset = Date.prototype.getTimezoneOffset;
                Date.prototype.getTimezoneOffset = tzMakeNative(function getTimezoneOffset() {
                    return targetOffset;
                }, 'getTimezoneOffset');

                // Hook 2: Intl.DateTimeFormat.prototype.resolvedOptions
                const OrigDTFProto = Intl.DateTimeFormat.prototype;
                const origResolvedOptions = OrigDTFProto.resolvedOptions;
                OrigDTFProto.resolvedOptions = tzMakeNative(function resolvedOptions() {
                    const result = origResolvedOptions.call(this);
                    result.timeZone = targetTimezone;
                    return result;
                }, 'resolvedOptions');

                // Hook 3: Date.prototype.toLocaleString family (with timeZone support)
                const dateMethodsToHook = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'];
                dateMethodsToHook.forEach(methodName => {
                    const origMethod = Date.prototype[methodName];
                    Date.prototype[methodName] = tzMakeNative(function(...args) {
                        // If options provided without timeZone, inject target timeZone
                        if (args.length === 0) {
                            return origMethod.call(this, undefined, { timeZone: targetTimezone });
                        } else if (args.length === 1) {
                            return origMethod.call(this, args[0], { timeZone: targetTimezone });
                        } else {
                            const opts = args[1] || {};
                            if (!opts.timeZone) {
                                opts.timeZone = targetTimezone;
                            }
                            return origMethod.call(this, args[0], opts);
                        }
                    }, methodName);
                });

                // Hook 4: new Intl.DateTimeFormat() constructor - inject default timeZone
                const OrigDateTimeFormat = Intl.DateTimeFormat;
                Intl.DateTimeFormat = function(locales, options) {
                    const opts = options ? { ...options } : {};
                    if (!opts.timeZone) {
                        opts.timeZone = targetTimezone;
                    }
                    return new OrigDateTimeFormat(locales, opts);
                };
                Intl.DateTimeFormat.prototype = OrigDateTimeFormat.prototype;
                Intl.DateTimeFormat.supportedLocalesOf = OrigDateTimeFormat.supportedLocalesOf.bind(OrigDateTimeFormat);
                tzMakeNative(Intl.DateTimeFormat, 'DateTimeFormat');
            }

            // --- 1. 移除 WebDriver 及 Puppeteer 特征 ---
            if (navigator.webdriver) {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            }
            // 移除 cdc_ 变量 (Puppeteer 特征)
            const cdcRegex = /cdc_[a-zA-Z0-9]+/;
            for (const key in window) {
                if (cdcRegex.test(key)) {
                    delete window[key];
                }
            }
            // 防御性移除常见自动化变量
            ['$cdc_asdjflasutopfhvcZLmcfl_', '$chrome_asyncScriptInfo', 'callPhantom', 'webdriver'].forEach(k => {
                 if (window[k]) delete window[k];
            });
            Object.defineProperty(window, 'chrome', {
                writable: true,
                enumerable: true,
                configurable: false,
                value: { app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } }, runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }, OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }, PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' } } }
            });

            // --- 1.5 Screen Resolution Hook ---
            // Override screen properties to match fingerprint values
            if (fp.screen && fp.screen.width && fp.screen.height) {
                const screenWidth = fp.screen.width;
                const screenHeight = fp.screen.height;
                
                Object.defineProperty(screen, 'width', {
                    get: makeNative(function width() { return screenWidth; }, 'width'),
                    configurable: true
                });
                Object.defineProperty(screen, 'height', {
                    get: makeNative(function height() { return screenHeight; }, 'height'),
                    configurable: true
                });
                Object.defineProperty(screen, 'availWidth', {
                    get: makeNative(function availWidth() { return screenWidth; }, 'availWidth'),
                    configurable: true
                });
                Object.defineProperty(screen, 'availHeight', {
                    get: makeNative(function availHeight() { return screenHeight - 40; }, 'availHeight'),
                    configurable: true
                });
                // Also override window.outerWidth/outerHeight for consistency
                Object.defineProperty(window, 'outerWidth', {
                    get: makeNative(function outerWidth() { return screenWidth; }, 'outerWidth'),
                    configurable: true
                });
                Object.defineProperty(window, 'outerHeight', {
                    get: makeNative(function outerHeight() { return screenHeight; }, 'outerHeight'),
                    configurable: true
                });
            }

            // --- 1.6 Stealthy Hardware Fingerprint Hook (CPU Cores & Memory) ---
            // Override navigator.hardwareConcurrency and navigator.deviceMemory on Navigator.prototype
            // Using the same stealth pattern as timezone hooks to avoid Pixelscan detection
            if (fp.hardwareConcurrency) {
                const targetCores = fp.hardwareConcurrency;
                // Create a getter that returns our value
                const coresGetter = function() { return targetCores; };
                // Apply makeNative to hide the hook
                Object.defineProperty(coresGetter, 'toString', {
                    value: function() { return 'function get hardwareConcurrency() { [native code] }'; },
                    configurable: true, writable: true
                });
                Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
                    get: coresGetter,
                    configurable: true
                });
            }
            
            if (fp.deviceMemory) {
                const targetMemory = fp.deviceMemory;
                const memoryGetter = function() { return targetMemory; };
                Object.defineProperty(memoryGetter, 'toString', {
                    value: function() { return 'function get deviceMemory() { [native code] }'; },
                    configurable: true, writable: true
                });
                Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                    get: memoryGetter,
                    configurable: true
                });
            }

            // --- 2. Stealth Geolocation Hook (Native Mock Pattern) ---
            // 避免使用 Proxy (会被 Pixelscan 识别为 Masking detected)
            // 直接修改 Geolocation.prototype 并确保存根函数通过 native code 检查
            if (fp.geolocation) {
                const { latitude, longitude } = fp.geolocation;
                // 精度提升到 500m - 1500m
                const accuracy = 500 + Math.floor(Math.random() * 1000);

                const makeNative = (func, name) => {
                    Object.defineProperty(func, 'toString', {
                        value: function() { return "function " + name + "() { [native code] }"; },
                        configurable: true,
                        writable: true
                    });
                    // 隐藏 toString 自身的 toString
                    Object.defineProperty(func.toString, 'toString', {
                        value: function() { return "function toString() { [native code] }"; },
                        configurable: true,
                        writable: true
                    });
                    return func;
                };

                // 保存原始引用 (虽然我们不打算用它，但为了保险)
                const originalGetCurrentPosition = Geolocation.prototype.getCurrentPosition;

                // 创建伪造函数
                const fakeGetCurrentPosition = function getCurrentPosition(success, error, options) {
                    const position = {
                        coords: {
                            latitude: latitude + (Math.random() - 0.5) * 0.005,
                            longitude: longitude + (Math.random() - 0.5) * 0.005,
                            accuracy: accuracy,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null
                        },
                        timestamp: Date.now()
                    };
                    // 异步回调
                    setTimeout(() => success(position), 10);
                };

                const fakeWatchPosition = function watchPosition(success, error, options) {
                    fakeGetCurrentPosition(success, error, options);
                    return Math.floor(Math.random() * 10000) + 1;
                };

                // 应用 Native Mock
                Object.defineProperty(Geolocation.prototype, 'getCurrentPosition', {
                    value: makeNative(fakeGetCurrentPosition, 'getCurrentPosition'),
                    configurable: true,
                    writable: true
                });

                Object.defineProperty(Geolocation.prototype, 'watchPosition', {
                    value: makeNative(fakeWatchPosition, 'watchPosition'),
                    configurable: true,
                    writable: true
                });
            }

            // --- 2. Intl API Language Override (CDP-aligned) ---
            // Hook Intl API to match SSOT locale. Optionally also align navigator.language/languages.
            const targetLang = (fp.cdp && fp.cdp.locale) ? fp.cdp.locale : fp.language;
            if (targetLang && targetLang !== 'auto' && targetLang !== 'Auto') {
                
                // Save originals
                const OrigDTF = Intl.DateTimeFormat;
                const OrigNF = Intl.NumberFormat;
                const OrigColl = Intl.Collator;
                
                // Minimal hook - only inject default locale when not specified
                const hookedDTF = function DateTimeFormat(locales, options) {
                    return new OrigDTF(locales || targetLang, options);
                };
                hookedDTF.prototype = OrigDTF.prototype;
                hookedDTF.supportedLocalesOf = OrigDTF.supportedLocalesOf.bind(OrigDTF);
                Intl.DateTimeFormat = makeNative(hookedDTF, 'DateTimeFormat');
                
                const hookedNF = function NumberFormat(locales, options) {
                    return new OrigNF(locales || targetLang, options);
                };
                hookedNF.prototype = OrigNF.prototype;
                hookedNF.supportedLocalesOf = OrigNF.supportedLocalesOf.bind(OrigNF);
                Intl.NumberFormat = makeNative(hookedNF, 'NumberFormat');
                
                const hookedColl = function Collator(locales, options) {
                    return new OrigColl(locales || targetLang, options);
                };
                hookedColl.prototype = OrigColl.prototype;
                hookedColl.supportedLocalesOf = OrigColl.supportedLocalesOf.bind(OrigColl);
                Intl.Collator = makeNative(hookedColl, 'Collator');

                // Align navigator.language / navigator.languages to avoid obvious mismatches with Intl locale.
                try {
                    const navProto = Object.getPrototypeOf(navigator);
                    const langPrimary = targetLang;
                    const langBase = String(targetLang).split('-')[0];
                    const langList = [langPrimary, langBase].filter(Boolean);

                    Object.defineProperty(navProto, 'language', {
                        get: makeNative(function language() { return langPrimary; }, 'language'),
                        configurable: true
                    });
                    Object.defineProperty(navProto, 'languages', {
                        get: makeNative(function languages() { return langList; }, 'languages'),
                        configurable: true
                    });
                } catch (e) { }
            }

            // --- 3. Canvas Noise ---
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            const hookedGetImageData = function getImageData(x, y, w, h) {
                const imageData = originalGetImageData.apply(this, arguments);
                if (fp.noiseSeed) {
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        if ((i + fp.noiseSeed) % 53 === 0) {
                            const noise = fp.canvasNoise ? (fp.canvasNoise.a || 0) : 0;
                            imageData.data[i+3] = Math.max(0, Math.min(255, imageData.data[i+3] + noise));
                        }
                    }
                }
                return imageData;
            };
            CanvasRenderingContext2D.prototype.getImageData = makeNative(hookedGetImageData, 'getImageData');

            // --- 2.5 WebGL (stable, template-driven) ---
            // Minimal getParameter override for vendor/renderer. Avoid excessive hooks.
            try {
                const w = (fp.cdp && fp.cdp.webgl) ? fp.cdp.webgl : fp.webgl;
                const enabled = w && (w.enabled === undefined || w.enabled === true);
                if (enabled && w && (w.vendor || w.renderer || w.unmaskedVendor || w.unmaskedRenderer)) {
                    const VENDOR = 0x1F00;
                    const RENDERER = 0x1F01;
                    const UNMASKED_VENDOR_WEBGL = 0x9245;
                    const UNMASKED_RENDERER_WEBGL = 0x9246;

                    const vendorStr = w.vendor || null;
                    const rendererStr = w.renderer || null;
                    const unmaskedVendorStr = w.unmaskedVendor || vendorStr || null;
                    const unmaskedRendererStr = w.unmaskedRenderer || rendererStr || null;

                    const origGLGetParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = makeNative(function getParameter(pname) {
                        if (pname === VENDOR && vendorStr) return vendorStr;
                        if (pname === RENDERER && rendererStr) return rendererStr;
                        if (pname === UNMASKED_VENDOR_WEBGL && unmaskedVendorStr) return unmaskedVendorStr;
                        if (pname === UNMASKED_RENDERER_WEBGL && unmaskedRendererStr) return unmaskedRendererStr;
                        return origGLGetParameter.apply(this, arguments);
                    }, 'getParameter');

                    if (typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext && WebGL2RenderingContext.prototype) {
                        const origGL2GetParameter = WebGL2RenderingContext.prototype.getParameter;
                        WebGL2RenderingContext.prototype.getParameter = makeNative(function getParameter(pname) {
                            if (pname === VENDOR && vendorStr) return vendorStr;
                            if (pname === RENDERER && rendererStr) return rendererStr;
                            if (pname === UNMASKED_VENDOR_WEBGL && unmaskedVendorStr) return unmaskedVendorStr;
                            if (pname === UNMASKED_RENDERER_WEBGL && unmaskedRendererStr) return unmaskedRendererStr;
                            return origGL2GetParameter.apply(this, arguments);
                        }, 'getParameter');
                    }
                }
            } catch (e) { }

            // --- 2.6 Fonts/ClientRects (stable, minimal) ---
            // Goal: keep measurements stable per profile without heavy spoofing.
            try {
                const fonts = (fp.cdp && fp.cdp.fonts) ? fp.cdp.fonts : fp.fonts;
                const enabled = fonts && (fonts.enabled === undefined || fonts.enabled === true);
                if (enabled) {
                    const fontList = Array.isArray(fonts.fonts) ? fonts.fonts : null;
                    const seed = (typeof fp.noiseSeed === 'number' ? fp.noiseSeed : 1337);
                    const jitter = (((seed % 7) - 3) * 0.01); // small +/-0.03 px deterministic

                    const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
                    Element.prototype.getBoundingClientRect = makeNative(function getBoundingClientRect() {
                        const r = origGetBoundingClientRect.apply(this, arguments);
                        if (!r) return r;
                        const left = r.left + jitter;
                        const top = r.top + jitter;
                        const width = r.width;
                        const height = r.height;
                        return {
                            x: left,
                            y: top,
                            left,
                            top,
                            right: left + width,
                            bottom: top + height,
                            width,
                            height,
                            toJSON: r.toJSON ? r.toJSON.bind(r) : undefined
                        };
                    }, 'getBoundingClientRect');

                    const origGetClientRects = Element.prototype.getClientRects;
                    Element.prototype.getClientRects = makeNative(function getClientRects() {
                        const list = origGetClientRects.apply(this, arguments);
                        // DOMRectList is array-like and usually read-only; return as-is to avoid breaking sites.
                        // Stability is primarily handled via getBoundingClientRect + measureText.
                        return list;
                    }, 'getClientRects');

                    // Range.getClientRects is used by many fingerprint scripts; keep stable by mapping through Element rect jitter.
                    if (typeof Range !== 'undefined' && Range.prototype && Range.prototype.getClientRects) {
                        const origRangeRects = Range.prototype.getClientRects;
                        Range.prototype.getClientRects = makeNative(function getClientRects() {
                            const list = origRangeRects.apply(this, arguments);
                            return list;
                        }, 'getClientRects');
                    }

                    const origMeasureText = CanvasRenderingContext2D.prototype.measureText;
                    CanvasRenderingContext2D.prototype.measureText = makeNative(function measureText(text) {
                        // If fonts whitelist is provided, force fallback font for disallowed families to prevent canvas-based font enumeration.
                        let restoreFont = null;
                        try {
                            if (fontList && typeof this.font === 'string') {
                                const fontDecl = String(this.font);
                                const q = fontDecl.match(/\"([^\"]+)\"|'([^']+)'/);
                                const family = q ? (q[1] || q[2]) : null;
                                if (family) {
                                    const fam = String(family).trim();
                                    const allowed = new Set(fontList.map((f) => String(f || '').trim()).filter(Boolean));
                                    if (allowed.size > 0 && !allowed.has(fam)) {
                                        restoreFont = this.font;
                                        // Keep size/style but replace family with generic fallback
                                        this.font = fontDecl.replace(/(\"[^\"]+\"|'[^']+')/, 'sans-serif');
                                    }
                                }
                            }
                        } catch (e) { }

                        const m = origMeasureText.apply(this, arguments);
                        if (!m) return m;
                        const w = (typeof m.width === 'number') ? (m.width + jitter) : m.width;
                        try { if (restoreFont) this.font = restoreFont; } catch (e) { }
                        return { ...m, width: w };
                    }, 'measureText');

                    // Optional font availability shaping:
                    // If a font list is provided, use CSS FontFaceSet.check to report availability consistently.
                    if (fontList && document && document.fonts && typeof document.fonts.check === 'function') {
                        const allowed = new Set(fontList.map((f) => String(f || '').trim()).filter(Boolean));
                        const origCheck = document.fonts.check.bind(document.fonts);
                        document.fonts.check = makeNative(function check(font, text) {
                            try {
                                const s = String(font || '');
                                const q = s.match(/\"([^\"]+)\"|'([^']+)'/);
                                const family = q ? (q[1] || q[2]) : null;
                                if (family && allowed.size > 0) {
                                    if (allowed.has(family)) return true;
                                    return false;
                                }
                            } catch (e) { }
                            return origCheck(font, text);
                        }, 'check');
                    }

                    // Additional minimal probe: stabilize offsetWidth measurements for disallowed fonts by forcing fallback.
                    // Many detectors compare widths between a target font and generic fallbacks.
                    if (fontList) {
                        try {
                            const allowed = new Set(fontList.map((f) => String(f || '').trim()).filter(Boolean));
                            const origDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
                            if (origDesc && typeof origDesc.get === 'function') {
                                Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                                    get: makeNative(function offsetWidth() {
                                        const style = window.getComputedStyle(this);
                                        const ff = style && style.fontFamily ? String(style.fontFamily) : '';
                                        // Extract first family name
                                        const m = ff.match(/\"([^\"]+)\"|'([^']+)'|([^,]+)/);
                                        const fam = m ? (m[1] || m[2] || m[3]) : null;
                                        if (fam && allowed.size > 0 && !allowed.has(String(fam).trim())) {
                                            // Temporarily force generic fallback to avoid revealing disallowed font widths.
                                            const prev = this.style.fontFamily;
                                            this.style.fontFamily = 'sans-serif';
                                            const w = origDesc.get.call(this);
                                            this.style.fontFamily = prev;
                                            return w;
                                        }
                                        return origDesc.get.call(this);
                                    }, 'offsetWidth'),
                                    configurable: true
                                });
                            }
                        } catch (e) { }
                    }
                }
            } catch (e) { }

            // --- 4. Audio Noise ---
            const originalGetChannelData = AudioBuffer.prototype.getChannelData;
            const hookedGetChannelData = function getChannelData(channel) {
                const results = originalGetChannelData.apply(this, arguments);
                const noise = fp.audioNoise || 0.0000001;
                for (let i = 0; i < 100 && i < results.length; i++) {
                    results[i] = results[i] + noise;
                }
                return results;
            };
            AudioBuffer.prototype.getChannelData = makeNative(hookedGetChannelData, 'getChannelData');

            // --- 5. WebRTC Protection ---
            const originalPC = window.RTCPeerConnection;
            const hookedPC = function RTCPeerConnection(config) {
                if(!config) config = {};
                config.iceTransportPolicy = 'relay'; 
                return new originalPC(config);
            };
            hookedPC.prototype = originalPC.prototype;
            window.RTCPeerConnection = makeNative(hookedPC, 'RTCPeerConnection');

            // --- 5.5 MediaDevices / Permissions (minimal consistency) ---
            try {
                const tmplMedia = (fp.cdp && fp.cdp.mediaDevices) ? fp.cdp.mediaDevices : fp.mediaDevices;
                const tmplPerms = (fp.cdp && fp.cdp.permissions) ? fp.cdp.permissions : fp.permissions;
                const permState = (name) => {
                    const v = tmplPerms && typeof tmplPerms[name] === 'string' ? tmplPerms[name] : null;
                    if (v === 'granted' || v === 'denied' || v === 'prompt') return v;
                    return 'prompt';
                };

                // Permissions: normalize common queries and avoid throwing.
                if (navigator.permissions && navigator.permissions.query) {
                    const origQuery = navigator.permissions.query.bind(navigator.permissions);
                    navigator.permissions.query = makeNative(function query(descriptor) {
                        try {
                            const name = descriptor && descriptor.name ? String(descriptor.name) : '';
                            if (name === 'camera' || name === 'microphone' || name === 'geolocation' || name === 'notifications') {
                                // Default to 'prompt' to match typical fresh profiles
                                return Promise.resolve({ state: permState(name), onchange: null });
                            }
                        } catch (e) { }
                        return origQuery(descriptor);
                    }, 'query');
                }

                // MediaDevices: keep enumerateDevices stable shape, avoid leaking host device names.
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    const origEnum = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
                    navigator.mediaDevices.enumerateDevices = makeNative(async function enumerateDevices() {
                        const tmpl = tmplMedia;
                        const enabled = tmpl && (tmpl.enabled === undefined || tmpl.enabled === true);
                        if (!enabled) return origEnum();

                        // If a template is provided, return a stable list matching it.
                        // Shape: { audioinput: n, audiooutput: n, videoinput: n, labels: boolean }
                        const counts = {
                            audioinput: (tmpl && typeof tmpl.audioinput === 'number') ? tmpl.audioinput : 1,
                            audiooutput: (tmpl && typeof tmpl.audiooutput === 'number') ? tmpl.audiooutput : 1,
                            videoinput: (tmpl && typeof tmpl.videoinput === 'number') ? tmpl.videoinput : 1
                        };
                        const showLabels = Boolean(tmpl && tmpl.labels === true);

                        // Link permissions: if camera/mic are denied, return zero devices for that kind.
                        if (permState('microphone') === 'denied') counts.audioinput = 0;
                        if (permState('camera') === 'denied') counts.videoinput = 0;

                        const out = [];
                        let idx = 0;
                        const pushKind = (kind, n) => {
                            for (let i = 0; i < n; i++) {
                                const deviceId = String(kind) + '-' + String(i + 1);
                                out.push({
                                    deviceId,
                                    groupId: '',
                                    kind,
                                    label: showLabels ? (String(kind) + ' ' + String(i + 1)) : '',
                                    toJSON: undefined
                                });
                                idx++;
                            }
                        };
                        pushKind('audioinput', counts.audioinput);
                        pushKind('audiooutput', counts.audiooutput);
                        pushKind('videoinput', counts.videoinput);
                        return out;
                    }, 'enumerateDevices');
                }
            } catch (e) { }

            // --- 5.6 Plugins / MimeTypes (minimal consistency) ---
            try {
                const pluginsCfg = (fp.cdp && fp.cdp.plugins) ? fp.cdp.plugins : fp.plugins;
                const enabled = pluginsCfg && (pluginsCfg.enabled === undefined || pluginsCfg.enabled === true);
                if (enabled) {
                    const list = Array.isArray(pluginsCfg.list) ? pluginsCfg.list : [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                    ];
                    const mimes = Array.isArray(pluginsCfg.mimes) ? pluginsCfg.mimes : [
                        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
                    ];

                    const makeArrayLike = (items, nameProp) => {
                        const arr = [];
                        items.forEach((it, idx) => {
                            const obj = { ...it };
                            obj.length = undefined;
                            obj.item = function item(i) { return arr[i] || null; };
                            if (nameProp && obj[nameProp]) {
                                arr[obj[nameProp]] = obj;
                            }
                            arr.push(obj);
                        });
                        Object.defineProperty(arr, 'length', { value: arr.length, writable: false });
                        arr.item = function item(i) { return arr[i] || null; };
                        arr.namedItem = function namedItem(n) { return arr[n] || null; };
                        return arr;
                    };

                    const pluginsArr = makeArrayLike(list, 'name');
                    const mimesArr = makeArrayLike(mimes, 'type');

                    const navProto = Object.getPrototypeOf(navigator);
                    Object.defineProperty(navProto, 'plugins', {
                        get: makeNative(function plugins() { return pluginsArr; }, 'plugins'),
                        configurable: true
                    });
                    Object.defineProperty(navProto, 'mimeTypes', {
                        get: makeNative(function mimeTypes() { return mimesArr; }, 'mimeTypes'),
                        configurable: true
                    });
                }
            } catch (e) { }

            // --- 6. 浮动水印（显示环境名称）---
            // 根据用户设置选择水印样式
            const watermarkStyle = '${style}';
            
            function createWatermark() {
                try {
                    // 检查是否已存在水印（避免重复创建）
                    if (document.getElementById('geekez-watermark')) return;
                    
                    // 确保 body 存在
                    if (!document.body) {
                        setTimeout(createWatermark, 50);
                        return;
                    }
                    
                    if (watermarkStyle === 'banner') {
                        // 方案1: 顶部横幅
                        const banner = document.createElement('div');
                        banner.id = 'geekez-watermark';
                        banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5)); backdrop-filter: blur(10px); color: white; padding: 5px 20px; text-align: center; font-size: 12px; font-weight: 500; z-index: 2147483647; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; gap: 8px; font-family: monospace;';
                        
                        const icon = document.createElement('span');
                        icon.textContent = '🔹';
                        icon.style.cssText = 'font-size: 14px;';
                        
                        const text = document.createElement('span');
                        text.textContent = '环境：${safeProfileName}';
                        
                        const closeBtn = document.createElement('button');
                        closeBtn.textContent = '×';
                        closeBtn.style.cssText = 'position: absolute; right: 10px; background: rgba(255,255,255,0.2); border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 16px; line-height: 1; transition: background 0.2s; font-family: monospace;';
                        closeBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.3)'; };
                        closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.2)'; };
                        closeBtn.onclick = function() { banner.style.display = 'none'; };
                        
                        banner.appendChild(icon);
                        banner.appendChild(text);
                        banner.appendChild(closeBtn);
                        document.body.appendChild(banner);
                        
                    } else {
                        // 方案5: 增强水印 (默认)
                        const watermark = document.createElement('div');
                        watermark.id = 'geekez-watermark';
                        watermark.style.cssText = 'position: fixed; bottom: 16px; right: 16px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5)); backdrop-filter: blur(10px); color: white; padding: 10px 16px; border-radius: 8px; font-size: 15px; font-weight: 600; z-index: 2147483647; pointer-events: none; user-select: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); display: flex; align-items: center; gap: 8px; font-family: monospace; animation: geekez-pulse 2s ease-in-out infinite;';
                        
                        const icon = document.createElement('span');
                        icon.textContent = '🎯';
                        icon.style.cssText = 'font-size: 18px; animation: geekez-rotate 3s linear infinite;';
                        
                        const text = document.createElement('span');
                        text.textContent = '${safeProfileName}';
                        
                        watermark.appendChild(icon);
                        watermark.appendChild(text);
                        document.body.appendChild(watermark);
                        
                        // 添加动画样式
                        if (!document.getElementById('geekez-watermark-styles')) {
                            const style = document.createElement('style');
                            style.id = 'geekez-watermark-styles';
                            style.textContent = '@keyframes geekez-pulse { 0%, 100% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6); } } @keyframes geekez-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
                            document.head.appendChild(style);
                        }
                        
                        // 自适应颜色函数（保留之前的功能）
                        function updateWatermarkColor() {
                            try {
                                const rect = watermark.getBoundingClientRect();
                                const x = rect.left + rect.width / 2;
                                const y = rect.top + rect.height / 2;
                                
                                watermark.style.display = 'none';
                                const elementBelow = document.elementFromPoint(x, y) || document.body;
                                watermark.style.display = '';
                                
                                const bgColor = window.getComputedStyle(elementBelow).backgroundColor;
                                const rgb = bgColor.match(/\\d+/g);
                                
                                if (rgb && rgb.length >= 3) {
                                    const r = parseInt(rgb[0]);
                                    const g = parseInt(rgb[1]);
                                    const b = parseInt(rgb[2]);
                                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                                    
                                    // 保持渐变背景，统一使用50%透明度
                                    watermark.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3)';
                                }
                            } catch(e) { /* 忽略错误 */ }
                        }
                        
                        setTimeout(updateWatermarkColor, 100);
                        
                        let colorUpdateTimer;
                        function scheduleColorUpdate() {
                            clearTimeout(colorUpdateTimer);
                            colorUpdateTimer = setTimeout(updateWatermarkColor, 200);
                        }
                        
                        window.addEventListener('scroll', scheduleColorUpdate, { passive: true });
                        window.addEventListener('resize', scheduleColorUpdate, { passive: true });
                        
                        const observer = new MutationObserver(scheduleColorUpdate);
                        observer.observe(document.body, { 
                            attributes: true, 
                            attributeFilter: ['style', 'class'],
                            subtree: true 
                        });
                    }
                    
                } catch(e) { /* 静默失败，不影响页面 */ }
            }
            
            // 立即尝试创建（针对已加载的页面）
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createWatermark);
            } else {
                createWatermark();
            }

        } catch(e) { console.error("FP Error", e); }
    })();
    `;
}

module.exports = { generateFingerprint, normalizeFingerprintSpec, getInjectScript };

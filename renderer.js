// i18n structure moved to i18n.js and locales/

let globalSettings = { preProxies: [], subscriptions: [], mode: 'single', enablePreProxy: false };
let currentEditId = null;
let confirmCallback = null;
let confirmAltCallback = null;
let confirmCancelCallback = null;
let currentProxyGroup = 'manual';
let inputCallback = null;
let searchText = '';
let viewMode = localStorage.getItem('geekez_view') || 'list';
const __restartState = new Set();
const __lastStatus = new Map();
const __logSizeCache = new Map(); // id -> { ts:number, total:number }
let __profileListEventsBound = false;
let __preProxyListEventsBound = false;
let __globalActionEventsBound = false;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return ch;
        }
    });
}

function escapeAttr(value) {
    // For HTML attribute values (double-quoted).
    return escapeHtml(value);
}

// Custom City Dropdown Initialization (Matches Timezone Logic)
function initCustomCityDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Build cached list
    let allOptions = [];
    // 1. Add English "Auto" option
    allOptions.push({ name: "Auto (IP Based)", isAuto: true });
    // 2. Add cities
    if (window.CITY_DATA) {
        allOptions = allOptions.concat(window.CITY_DATA);
    }

    let selectedIndex = -1;

    function populateDropdown(filter = '') {
        const lowerFilter = filter.toLowerCase();
        // 如果是 "Auto" 则显示全部，否则按关键词过滤
        const shouldShowAll = filter === 'Auto (IP Based)' || filter === '';

        const filtered = shouldShowAll ? allOptions : allOptions.filter(item =>
            item.name.toLowerCase().includes(lowerFilter)
        );

        dropdown.textContent = '';
        filtered.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'timezone-item';
            el.dataset.name = item.name;
            el.dataset.index = String(index);
            el.textContent = item.name;
            dropdown.appendChild(el);
        });

        selectedIndex = -1;
    }

    function showDropdown() {
        populateDropdown(''); // Always show full list on click
        dropdown.classList.add('active');
    }

    function hideDropdown() {
        dropdown.classList.remove('active');
        selectedIndex = -1;
    }

    function selectItem(name) {
        input.value = name;
        hideDropdown();
    }

    input.addEventListener('focus', showDropdown);

    // Prevent blur from closing immediately so click can register
    // Relaxed for click-outside logic instead

    input.addEventListener('input', () => {
        populateDropdown(input.value);
        if (!dropdown.classList.contains('active')) dropdown.classList.add('active');
    });

    // Keyboard nav
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.timezone-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(items[selectedIndex].dataset.name);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    function updateSelection(items) {
        items.forEach((item, index) => item.classList.toggle('selected', index === selectedIndex));
        if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.timezone-item');
        if (item) selectItem(item.dataset.name);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}

// --- Language Dropdown Helpers ---
function getLanguageName(code) {
    if (!code || code === 'auto') return "Auto (System Default)";
    if (!window.LANGUAGE_DATA) return code;
    const entry = window.LANGUAGE_DATA.find(x => x.code === code);
    return entry ? entry.name : "Auto (System Default)";
}

function getLanguageCode(name) {
    if (!name || name === "Auto (System Default)") return 'auto';
    if (!window.LANGUAGE_DATA) return 'auto';
    const entry = window.LANGUAGE_DATA.find(x => x.name === name);
    return entry ? entry.code : 'auto';
}

function initCustomLanguageDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    // Use window.LANGUAGE_DATA from languages.js
    const allOptions = window.LANGUAGE_DATA || [];
    let selectedIndex = -1;

    function populateDropdown(filter = '') {
        const lowerFilter = filter.toLowerCase();
        const shouldShowAll = filter === '' || filter === 'Auto (System Default)';
        const filtered = shouldShowAll ? allOptions : allOptions.filter(item =>
            item.name.toLowerCase().includes(lowerFilter)
        );

        dropdown.textContent = '';
        filtered.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'timezone-item';
            el.dataset.code = item.code;
            el.dataset.index = String(index);
            el.textContent = item.name;
            dropdown.appendChild(el);
        });
        selectedIndex = -1;
    }

    function showDropdown() {
        populateDropdown('');
        dropdown.classList.add('active');
    }

    function hideDropdown() {
        dropdown.classList.remove('active');
        selectedIndex = -1;
    }

    function selectItem(name) {
        input.value = name;
        hideDropdown();
    }

    input.addEventListener('focus', showDropdown);
    input.addEventListener('input', () => {
        populateDropdown(input.value);
        if (!dropdown.classList.contains('active')) dropdown.classList.add('active');
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.timezone-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(items[selectedIndex].innerText);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    function updateSelection(items) {
        items.forEach((item, index) => item.classList.toggle('selected', index === selectedIndex));
        if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.timezone-item');
        if (item) selectItem(item.innerText);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}


function decodeBase64Content(str) {
    try {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch (e) { return atob(str); }
}

function getProxyRemark(link) {
    if (!link) return '';
    link = link.trim();
    try {
        if (link.startsWith('vmess://')) {
            const base64Str = link.replace('vmess://', '');
            const configStr = decodeBase64Content(base64Str);
            try { return JSON.parse(configStr).ps || ''; } catch (e) { return ''; }
        } else if (link.includes('#')) {
            return decodeURIComponent(link.split('#')[1]).trim();
        }
    } catch (e) { }
    return '';
}

function renderHelpContent() {
    const manualHTML = curLang === 'en' ?
        `<div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">1. Create Environment</h4><p style="font-size:14px;">Enter a name and proxy link. The system auto-generates a unique fingerprint with randomized Hardware.</p></div>
         <div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">2. Launch</h4><p style="font-size:14px;">Click Launch. A green badge indicates active status. Each environment is fully isolated.</p></div>
         <div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">3. Pre-Proxy (Optional)</h4><p style="font-size:14px;">Chain proxy for IP hiding. Use TCP protocols for stability.</p></div>
         <div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">4. Best Practices</h4><p style="font-size:14px;">• Use high-quality residential IPs<br>• Keep one account per environment<br>• Avoid frequent switching<br>• Simulate real user behavior</p></div>` :
        `<div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">1. 新建环境</h4><p style="font-size:14px;">填写名称与代理链接。系统自动生成唯一指纹（硬件随机化）。</p></div>
         <div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">2. 启动环境</h4><p style="font-size:14px;">点击启动，列表中显示绿色运行标签。每个环境完全隔离。</p></div>
         <div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">3. 前置代理（可选）</h4><p style="font-size:14px;">用于隐藏本机IP或链路加速。建议使用TCP协议。</p></div>
         <div style="margin-bottom:25px;"><h4 style="color:var(--accent);margin-bottom:8px;">4. 最佳实践</h4><p style="font-size:14px;">• 使用高质量住宅IP<br>• 一个账号固定一个环境<br>• 避免频繁切换<br>• 模拟真实用户行为</p></div>`;

    const aboutHTML = curLang === 'en' ?
        `<div style="text-align:center;margin-bottom:24px;padding:20px 0;">
            <div style="font-size:28px;font-weight:700;color:var(--text-primary);letter-spacing:1px;">Geek<span style="color:var(--accent);">EZ</span></div>
            <div style="font-size:12px;opacity:0.5;margin-top:4px;">v1.3.4 · Anti-detect Browser</div>
         </div>
         
         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, var(--accent), #7c3aed);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">CORE TECHNOLOGY</h4>
         </div>
         <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;">
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">🧬 Real Chrome Kernel</div>
                <div style="font-size:11px;opacity:0.7;">Native Chrome + JS Injection</div>
            </div>
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">🔐 Hardware Fingerprint</div>
                <div style="font-size:11px;opacity:0.7;">CPU/Memory Randomization</div>
            </div>
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">🌍 60+ Languages</div>
                <div style="font-size:11px;opacity:0.7;">Timezone & Locale Spoofing</div>
            </div>
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">⚡ GPU Acceleration</div>
                <div style="font-size:11px;opacity:0.7;">Smooth UI Performance</div>
            </div>
         </div>

         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, #4CAF50, #2196F3);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">DETECTION STATUS</h4>
         </div>
         <div style="background:var(--input-bg);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:24px;">
            <div style="display:flex;flex-wrap:wrap;gap:16px;">
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> Browserscan Passed</div>
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> Pixelscan Clean</div>
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> Real TLS Fingerprint</div>
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> Minimal API Hook</div>
            </div>
         </div>

         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, #FF9800, #F44336);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">PLATFORM COMPATIBILITY</h4>
         </div>
         <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;">
            <span style="background:linear-gradient(135deg, rgba(243,156,18,0.2), rgba(243,156,18,0.1));color:#f39c12;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Amazon</span>
            <span style="background:linear-gradient(135deg, rgba(39,174,96,0.2), rgba(39,174,96,0.1));color:#27ae60;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">TikTok</span>
            <span style="background:linear-gradient(135deg, rgba(41,128,185,0.2), rgba(41,128,185,0.1));color:#2980b9;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Facebook</span>
            <span style="background:linear-gradient(135deg, rgba(230,126,34,0.2), rgba(230,126,34,0.1));color:#e67e22;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Shopee</span>
            <span style="background:linear-gradient(135deg, rgba(191,0,0,0.2), rgba(191,0,0,0.1));color:#bf0000;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Rakuten</span>
            <span style="background:linear-gradient(135deg, rgba(241,196,15,0.2), rgba(241,196,15,0.1));color:#f1c40f;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Mercado</span>
         </div>

         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, #9C27B0, #E91E63);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">COMMUNITY</h4>
         </div>
         <div style="background:linear-gradient(135deg, var(--input-bg), var(--card-bg));padding:16px;border-radius:8px;border:1px solid var(--border);text-align:center;">
            <div style="font-size:18px;margin-bottom:6px;">💬</div>
            <div style="font-size:12px;opacity:0.8;margin-bottom:8px;">Join our QQ Group for support</div>
            <a href="tencent://groupwpa/?subcmd=all&uin=1079216892" title="Click to join QQ Group" style="font-size:16px;font-weight:600;color:var(--accent);letter-spacing:1px;text-decoration:none;">Click to join: 1079216892</a>
         </div>` :
        `<div style="text-align:center;margin-bottom:24px;padding:20px 0;">
            <div style="font-size:28px;font-weight:700;color:var(--text-primary);letter-spacing:1px;">Geek<span style="color:var(--accent);">EZ</span></div>
            <div style="font-size:12px;opacity:0.5;margin-top:4px;">v1.3.4 · 指纹浏览器</div>
         </div>
         
         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, var(--accent), #7c3aed);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">核心技术</h4>
         </div>
         <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;">
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">🧬 真实 Chrome 内核</div>
                <div style="font-size:11px;opacity:0.7;">原生内核 + JS 注入</div>
            </div>
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">🔐 硬件指纹随机化</div>
                <div style="font-size:11px;opacity:0.7;">CPU/内存完全随机</div>
            </div>
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">🌍 60+ 语言适配</div>
                <div style="font-size:11px;opacity:0.7;">时区与语言完美伪装</div>
            </div>
            <div style="background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;">⚡ GPU 硬件加速</div>
                <div style="font-size:11px;opacity:0.7;">流畅 UI 渲染体验</div>
            </div>
         </div>

         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, #4CAF50, #2196F3);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">检测状态</h4>
         </div>
         <div style="background:var(--input-bg);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:24px;">
            <div style="display:flex;flex-wrap:wrap;gap:16px;">
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> Browserscan 全绿</div>
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> Pixelscan 无检测</div>
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> TLS 指纹真实</div>
                <div style="font-size:12px;"><span style="color:#4CAF50;">✓</span> 最小化 API Hook</div>
            </div>
         </div>

         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, #FF9800, #F44336);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">平台适配</h4>
         </div>
         <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;">
            <span style="background:linear-gradient(135deg, rgba(243,156,18,0.2), rgba(243,156,18,0.1));color:#f39c12;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Amazon</span>
            <span style="background:linear-gradient(135deg, rgba(39,174,96,0.2), rgba(39,174,96,0.1));color:#27ae60;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">TikTok</span>
            <span style="background:linear-gradient(135deg, rgba(41,128,185,0.2), rgba(41,128,185,0.1));color:#2980b9;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">Facebook</span>
            <span style="background:linear-gradient(135deg, rgba(230,126,34,0.2), rgba(230,126,34,0.1));color:#e67e22;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">虾皮</span>
            <span style="background:linear-gradient(135deg, rgba(191,0,0,0.2), rgba(191,0,0,0.1));color:#bf0000;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">乐天</span>
            <span style="background:linear-gradient(135deg, rgba(241,196,15,0.2), rgba(241,196,15,0.1));color:#f1c40f;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;">美客多</span>
         </div>

         <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:18px;background:linear-gradient(180deg, #9C27B0, #E91E63);border-radius:2px;"></div>
            <h4 style="margin:0;color:var(--text-primary);font-size:14px;font-weight:600;">交流社群</h4>
         </div>
         <div style="background:linear-gradient(135deg, var(--input-bg), var(--card-bg));padding:16px;border-radius:8px;border:1px solid var(--border);text-align:center;">
            <div style="font-size:18px;margin-bottom:6px;">💬</div>
            <div style="font-size:12px;opacity:0.8;margin-bottom:8px;">加入 QQ 群获取支持与交流</div>
            <a href="tencent://groupwpa/?subcmd=all&uin=1079216892" title="点击加入QQ群" style="font-size:16px;font-weight:600;color:var(--accent);letter-spacing:1px;text-decoration:none;">点击加入：1079216892</a>
         </div>`;

    const manualEl = document.getElementById('help-manual');
    const aboutEl = document.getElementById('help-about');
    if (manualEl) manualEl.innerHTML = manualHTML;
    if (aboutEl) aboutEl.innerHTML = aboutHTML;
}

function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerText = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    document.querySelectorAll('.running-badge').forEach(el => { el.innerText = t('runningStatus'); });
    const themeSel = document.getElementById('themeSelect');
    if (themeSel) { themeSel.options[0].text = t('themeGeek'); themeSel.options[1].text = t('themeLight'); themeSel.options[2].text = t('themeDark'); }
    renderHelpContent();
    updateToolbar(); loadProfiles(); renderGroupTabs();
}

function toggleLang() {
    curLang = curLang === 'cn' ? 'en' : 'cn';
    localStorage.setItem('geekez_lang', curLang);
    applyLang();
}

function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('geekez_theme', themeName);
    const themeColors = {
        'geek': { bg: '#1e1e2d', symbol: '#ffffff' },
        'light': { bg: '#f0f2f5', symbol: '#000000' },
        'dark': { bg: '#121212', symbol: '#ffffff' }
    };
    const colors = themeColors[themeName] || themeColors['geek'];
    window.electronAPI.invoke('set-title-bar-color', colors);
}

// Show Alert (supports loading state)
function showAlert(msg, showBtn = true) {
    document.getElementById('alertMsg').innerText = msg;
    const btn = document.getElementById('alertBtn');
    if (btn) btn.style.display = showBtn ? 'block' : 'none';
    document.getElementById('alertModal').style.display = 'flex';
}
function showConfirm(msg, callback) {
    const altBtn = document.getElementById('confirmAltBtn');
    if (altBtn) altBtn.style.display = 'none';
    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) okBtn.textContent = t('confirm') || 'Confirm';
    confirmAltCallback = null;
    confirmCancelCallback = null;
    document.getElementById('confirmMsg').innerText = msg;
    document.getElementById('confirmModal').style.display = 'flex';
    confirmCallback = callback;
}

let __toastTimer = null;
function showToast(msg, durationMs = 1800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerText = msg;
    el.style.display = 'block';
    clearTimeout(__toastTimer);
    __toastTimer = setTimeout(() => { el.style.display = 'none'; }, durationMs);
}

function formatIpcError(err) {
    if (!err) return { message: 'unknown', code: null };
    if (typeof err === 'string') return { message: err, code: null };
    const code = err.code || err.errorCode || null;
    const message = err.message || err.error || JSON.stringify(err);
    return { message, code };
}

function formatResultError(result, fallbackMessage) {
    if (!result) return { message: fallbackMessage || 'unknown', code: null };
    const code = result.code || result.errorCode || null;
    const message = result.error || result.message || (result.errors ? result.errors.join('; ') : null) || fallbackMessage || 'unknown';
    return { message, code };
}

function showConfirmChoice(msg, options) {
    const altBtn = document.getElementById('confirmAltBtn');
    if (altBtn) {
        altBtn.textContent = options && options.altText ? options.altText : 'Alt';
        altBtn.style.display = 'inline-block';
    }
    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) okBtn.textContent = (options && options.okText) ? options.okText : (t('confirm') || 'Confirm');
    confirmAltCallback = options && typeof options.onAlt === 'function' ? options.onAlt : null;
    confirmCancelCallback = options && typeof options.onCancel === 'function' ? options.onCancel : null;
    document.getElementById('confirmMsg').innerText = msg;
    document.getElementById('confirmModal').style.display = 'flex';
    confirmCallback = options && typeof options.onConfirm === 'function' ? options.onConfirm : null;
}

function closeConfirm(result) {
    document.getElementById('confirmModal').style.display = 'none';
    if (result === 'alt' && confirmAltCallback) confirmAltCallback();
    if (result === true && confirmCallback) confirmCallback();
    if (result === false && confirmCancelCallback) confirmCancelCallback();
    confirmCallback = null;
    confirmAltCallback = null;
    confirmCancelCallback = null;
    const altBtn = document.getElementById('confirmAltBtn');
    if (altBtn) altBtn.style.display = 'none';
}

function showInput(title, callback) {
    document.getElementById('inputModalTitle').innerText = title;
    document.getElementById('inputModalValue').value = '';
    document.getElementById('inputModal').style.display = 'flex';
    document.getElementById('inputModalValue').focus();
    inputCallback = callback;
}
function closeInputModal() { document.getElementById('inputModal').style.display = 'none'; inputCallback = null; }
function submitInputModal() {
    const val = document.getElementById('inputModalValue').value.trim();
    if (val && inputCallback) inputCallback(val);
    closeInputModal();
}

function ensureGlobalActionEventsBound() {
    if (__globalActionEventsBound) return;
    __globalActionEventsBound = true;

    document.addEventListener('click', (ev) => {
        try {
            const actionEl = ev.target && ev.target.closest ? ev.target.closest('[data-action]') : null;
            if (!actionEl) return;
            const action = actionEl.getAttribute('data-action');
            if (!action) return;
            const actionArg = actionEl.getAttribute('data-action-arg');
            if (actionEl.tagName === 'A') ev.preventDefault();

            const run = (p) => {
                try {
                    if (p && typeof p.then === 'function') {
                        p.catch((err) => console.error('data-action async failed:', err));
                    }
                } catch (e) {
                    console.error('data-action runner failed:', e);
                }
            };

            switch (action) {
                case 'open-github': run(openGithub()); break;
                case 'open-help': run(openHelp()); break;
                case 'open-settings': run(openSettings()); break;
                case 'check-updates': run(checkUpdates()); break;
                case 'toggle-lang': run(toggleLang()); break;
                case 'open-proxy-manager': run(openProxyManager()); break;
                case 'close-proxy-manager': run(closeProxyManager()); break;
                case 'open-export-modal': run(openExportModal()); break;
                case 'close-export-modal': run(closeExportModal()); break;
                case 'open-export-select-modal': run(openExportSelectModal(actionArg)); break;
                case 'close-export-select-modal': run(closeExportSelectModal()); break;
                case 'confirm-export': run(confirmExport()); break;
                case 'toggle-import-menu': run(toggleImportMenu()); break;
                case 'import-full-backup': run(importFullBackup()); closeImportMenu(); break;
                case 'import-data': run(importData()); closeImportMenu(); break;
                case 'open-add-modal': run(openAddModal()); break;
                case 'close-add-modal': run(closeAddModal()); break;
                case 'save-new-profile': run(saveNewProfile()); break;
                case 'close-edit-modal': run(closeEditModal()); break;
                case 'save-edit-profile': run(saveEditProfile()); break;
                case 'toggle-view-mode': run(toggleViewMode()); break;
                case 'test-current-group': run(testCurrentGroup()); break;
                case 'rollback-current-group': run(rollbackSubscriptionNodes(currentProxyGroup)); break;
                case 'edit-current-subscription': run(editCurrentSubscription()); break;
                case 'open-sub-edit-modal': run(openSubEditModal(actionArg === 'true')); break;
                case 'save-pre-proxy': run(savePreProxy()); break;
                case 'reset-proxy-input': run(resetProxyInput()); break;
                case 'save-proxy-settings': run(saveProxySettings()); break;
                case 'close-password-modal': run(closePasswordModal()); break;
                case 'submit-password': run(submitPassword()); break;
                case 'close-sub-edit-modal': run(closeSubEditModal()); break;
                case 'delete-subscription': run(deleteSubscription()); break;
                case 'save-subscription': run(saveSubscription()); break;
                case 'close-confirm': {
                    const res = actionArg === 'true' ? true : (actionArg === 'false' ? false : actionArg);
                    run(closeConfirm(res));
                    break;
                }
                case 'close-alert-modal': {
                    const m = document.getElementById('alertModal');
                    if (m) m.style.display = 'none';
                    break;
                }
                case 'close-rotated-logs-modal': run(closeRotatedLogsModal()); break;
                case 'close-settings': run(closeSettings()); break;
                case 'switch-settings-tab': run(switchSettingsTab(actionArg, actionEl)); break;
                case 'select-extension-folder': run(selectExtensionFolder()); break;
                case 'save-api-port': run(saveApiPort()); break;
                case 'open-api-docs': run(openApiDocs()); break;
                case 'copy-api-token': run(copyApiToken()); break;
                case 'select-data-directory': run(selectDataDirectory()); break;
                case 'reset-data-directory': run(resetDataDirectory()); break;
                case 'close-help': run(closeHelp()); break;
                case 'switch-help-tab': run(switchHelpTab(actionArg)); break;
                case 'close-input-modal': run(closeInputModal()); break;
                case 'submit-input-modal': run(submitInputModal()); break;
                default: return;
            }
        } catch (e) {
            console.error('data-action handler failed:', e);
        }
    });
}

function setViewModeIcon(mode) {
    const svg = document.getElementById('viewIcon');
    if (!svg) return;
    const ns = 'http://www.w3.org/2000/svg';
    svg.textContent = '';

    if (mode === 'grid') {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', 'M3 10h18M3 14h18M3 18h18M3 6h18');
        p.setAttribute('stroke-width', '2');
        svg.appendChild(p);
        return;
    }

    const rects = [
        { x: 3, y: 3 },
        { x: 14, y: 3 },
        { x: 14, y: 14 },
        { x: 3, y: 14 }
    ];
    rects.forEach(({ x, y }) => {
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', String(x));
        r.setAttribute('y', String(y));
        r.setAttribute('width', '7');
        r.setAttribute('height', '7');
        svg.appendChild(r);
    });
}

function renderProfileListEmptyState(listEl, msg) {
    if (!listEl) return;
    listEl.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'empty-state';

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');

    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '7');
    circle.setAttribute('r', '4');

    svg.appendChild(path);
    svg.appendChild(circle);

    const text = document.createElement('div');
    text.className = 'empty-state-text';
    text.textContent = String(msg ?? '');

    wrap.appendChild(svg);
    wrap.appendChild(text);
    listEl.appendChild(wrap);
}

async function init() {
    ensureGlobalActionEventsBound();
    const savedTheme = localStorage.getItem('geekez_theme') || 'geek';
    setTheme(savedTheme);
    const themeSel = document.getElementById('themeSelect');
    if (themeSel) {
        themeSel.value = savedTheme;
        themeSel.addEventListener('change', (ev) => setTheme(ev.target.value));
    }
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (ev) => filterProfiles(ev.target.value || ''));
    }
    const exportSelectAll = document.getElementById('exportSelectAll');
    if (exportSelectAll) {
        exportSelectAll.addEventListener('change', () => toggleExportSelectAll());
    }
    const rotatedLogsSearch = document.getElementById('rotatedLogsSearch');
    if (rotatedLogsSearch) {
        rotatedLogsSearch.addEventListener('input', () => filterRotatedLogs());
    }
    setTimeout(() => { const s = document.getElementById('splash'); if (s) { s.style.opacity = '0'; setTimeout(() => s.remove(), 500); } }, 1500);

    globalSettings = await window.electronAPI.getSettings();
    if (!globalSettings.preProxies) globalSettings.preProxies = [];
    if (!globalSettings.subscriptions) globalSettings.subscriptions = [];

    document.getElementById('enablePreProxy').checked = globalSettings.enablePreProxy || false;
    document.getElementById('enablePreProxy').addEventListener('change', updateToolbar);
    let __statusRefreshTimer = null;
    window.electronAPI.onProfileStatus(({ id, status }) => {
        __lastStatus.set(id, status);
        const badge = document.getElementById(`status-${id}`);
        if (status === 'running') __restartState.delete(id);
        if (status === 'stopped' || status === 'stop_failed') __restartState.delete(id);
        if (status === 'restarting' || status === 'starting' || status === 'stopping') __restartState.add(id);
        if (badge) status === 'running' ? badge.classList.add('active') : badge.classList.remove('active');
        clearTimeout(__statusRefreshTimer);
        __statusRefreshTimer = setTimeout(() => loadProfiles(), 250);
    });
    if (window.electronAPI.onLeakCheckFinished) {
        window.electronAPI.onLeakCheckFinished(() => loadProfiles());
    }

    // API event listeners for remote refresh and launch
    window.electronAPI.onRefreshProfiles(() => {
        console.log('API triggered profile refresh');
        loadProfiles();
    });

    window.electronAPI.onApiLaunchProfile((id) => {
        console.log('API triggered launch for:', id);
        launch(id);
    });

    if (window.electronAPI.onProxyConsistencyWarning) {
        window.electronAPI.onProxyConsistencyWarning((payload) => {
            try {
                const profileId = payload && payload.profileId ? payload.profileId : null;
                const issues = payload && payload.issues ? payload.issues : [];
                const details = formatConsistencyIssues(issues);
                const title = t('proxyMismatchTitle') || 'Proxy/Fingerprint mismatch detected';
                const desc = t('proxyMismatchDesc') || 'The current proxy geo does not match this profile fingerprint settings.';
                const msg = `${title}\n\n${desc}\n\n${details}`;

                showConfirmChoice(msg, {
                    okText: t('proxyMismatchActionProceed') || 'Proceed Anyway',
                    altText: t('proxyMismatchActionAutofix') || 'Auto-fix & Continue',
                    onAlt: async () => {
                        try {
                            const profiles = await window.electronAPI.getProfiles();
                            const p = profiles.find(x => x.id === profileId);
                            if (!p) return;
                            p.proxyPolicy = p.proxyPolicy || {};
                            p.proxyPolicy.autoLink = true;
                            p.proxyPolicy.consistencyPolicy = { enforce: true, onMismatch: 'autofix' };
                            p.proxyPolicy.allowAutofix = { geo: true, language: true };
                            await window.electronAPI.updateProfile(p);
                            await loadProfiles();
                            await launch(profileId);
                        } catch (e) {
                            showAlert('Error: ' + e.message);
                        }
                    },
                    onConfirm: async () => {
                        try {
                            const watermarkStyle = localStorage.getItem('geekez_watermark_style') || 'enhanced';
                            await window.electronAPI.launchProfile(profileId, watermarkStyle, { skipProxyWarnOnce: true });
                        } catch (e) {
                            showAlert('Error: ' + e.message);
                        }
                    },
                    onCancel: () => { }
                });
            } catch (e) {
                console.error('Failed to handle proxy-consistency-warning:', e);
            }
        });
    }

    // 核心修复：版本号注入
    const info = await window.electronAPI.invoke('get-app-info');
    const verSpan = document.getElementById('app-version');
    if (verSpan) verSpan.innerText = `v${info.version}`;

    checkSubscriptionUpdates();
    applyLang();

    // Load timezones after DOM is ready - Custom Dropdown
    if (typeof window.TIMEZONES !== 'undefined' && Array.isArray(window.TIMEZONES)) {
        initCustomTimezoneDropdown('addTimezone', 'addTimezoneDropdown');
        initCustomTimezoneDropdown('editTimezone', 'editTimezoneDropdown');
    }

    // Check for updates silently on startup
    checkUpdatesSilent();
}


async function checkSubscriptionUpdates() {
    const now = Date.now();
    let updated = false;
    for (const sub of globalSettings.subscriptions) {
        if (!sub.interval || sub.interval == '0') continue;
        const intervalMs = parseInt(sub.interval) * 3600 * 1000;
        if (now - (sub.lastUpdated || 0) > intervalMs) {
            await updateSubscriptionNodes(sub);
            updated = true;
        }
    }
    if (updated) await window.electronAPI.saveSettings(globalSettings);
}

async function checkUpdates() {
    const btn = document.getElementById('btnUpdate');
    btn.style.transition = 'transform 1s';
    btn.style.transform = 'rotate(360deg)';

    // Show "Checking..." without button
    showToast(t('checkingUpdate') || 'Checking update...', 1200);

    try {
        const appRes = await window.electronAPI.invoke('check-app-update');

        // Hide alert modal first to avoid conflict with showConfirm or to refresh state
        document.getElementById('alertModal').style.display = 'none';

        if (appRes.update) {
            // Found App Update -> Show Confirm with Skip option
            showUpdateConfirm(appRes.remote, appRes.url);
            return;
        }

        const xrayRes = await window.electronAPI.invoke('check-xray-update');
        if (xrayRes.update) {
            showToast(`${t('xrayUpdateFound') || 'Update found'} (v${xrayRes.remote})`, 1800);
            const success = await window.electronAPI.invoke('download-xray-update', xrayRes.downloadUrl);
            if (success) showToast(t('updateDownloaded') || 'Downloaded', 1800);
            else showAlert(t('updateError'));
            return;
        }

        // No Update -> Show Alert with OK button
        showToast(t('noUpdate') || 'No update', 1200);

        // Clear badge if no update found after manual check
        btn.classList.remove('has-update');
    } catch (e) {
        showAlert(t('updateError') + " " + e.message);
    } finally {
        setTimeout(() => { btn.style.transform = 'none'; }, 1000);
    }
}

async function checkUpdatesSilent() {
    try {
        const appRes = await window.electronAPI.invoke('check-app-update');
        if (appRes.update) {
            // Check if this version was skipped
            const skippedVersion = localStorage.getItem('geekez_skipped_version');
            if (skippedVersion === appRes.remote) {
                console.log(`Version ${appRes.remote} was skipped, not showing update notification`);
                return;
            }

            const btn = document.getElementById('btnUpdate');
            if (btn) btn.classList.add('has-update');

            // Auto popup for App update with Skip option
            showUpdateConfirm(appRes.remote, appRes.url);
            return;
        }
        const xrayRes = await window.electronAPI.invoke('check-xray-update');
        if (xrayRes.update) {
            const btn = document.getElementById('btnUpdate');
            if (btn) btn.classList.add('has-update');
        }
    } catch (e) {
        console.error('Silent update check failed:', e);
    }
}

// Show update confirm dialog with Skip option
function showUpdateConfirm(version, url) {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    msgEl.textContent = '';
    msgEl.appendChild(document.createTextNode(`${t('appUpdateFound') || 'Update found'} (v${version})`));
    msgEl.appendChild(document.createElement('br'));
    msgEl.appendChild(document.createElement('br'));
    msgEl.appendChild(document.createTextNode(`${t('askUpdate') || 'Update now'}?`));

    // Update button - go to download page
    yesBtn.textContent = t('goDownload') || '前往下载';
    yesBtn.onclick = () => {
        modal.style.display = 'none';
        window.electronAPI.invoke('open-url', url);
    };

    // Skip button - save skipped version
    noBtn.textContent = t('skipVersion') || '跳过此版本';
    noBtn.onclick = () => {
        localStorage.setItem('geekez_skipped_version', version);
        modal.style.display = 'none';
        showAlert(t('versionSkipped') || `已跳过 v${version} 版本更新`);
    };

    modal.style.display = 'flex';
}

function openGithub() { window.electronAPI.invoke('open-url', 'https://github.com/EchoHS/GeekezBrowser'); }

function filterProfiles(text) {
    searchText = text.toLowerCase();
    loadProfiles();
}

function toggleViewMode() {
    viewMode = viewMode === 'list' ? 'grid' : 'list';
    localStorage.setItem('geekez_view', viewMode);
    loadProfiles();
}

async function runLeakCheck(profileId) {
    try {
        const res = await window.electronAPI.runLeakCheck(profileId);
        if (!res || !res.success) {
            showAlert((res && res.error) ? res.error : 'Leak check failed');
            return;
        }
        showToast(`LeakCheck: ${res.status}`);
        if (res.reportPath) {
            // Best-effort: open folder containing report
            try { await window.electronAPI.openPath(res.reportPath); } catch (e) { }
        }
        loadProfiles();
    } catch (e) {
        showAlert(e.message || 'Leak check failed');
    }
}

async function openLastLeakReport(profile) {
    try {
        const last = profile && profile.diagnostics ? profile.diagnostics.lastLeakReport : null;
        if (!last || !last.path) return showAlert('No leak report yet');
        await window.electronAPI.openPath(last.path);
    } catch (e) {
        showAlert(e.message || 'Failed to open report');
    }
}

async function openLastLeakReportById(profileId) {
    try {
        const profiles = await window.electronAPI.getProfiles();
        const p = profiles.find(x => x.id === profileId);
        if (!p) return showAlert('Profile not found');
        await openLastLeakReport(p);
    } catch (e) {
        showAlert(e.message || 'Failed to open report');
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

function closeRotatedLogsModal() {
    const m = document.getElementById('rotatedLogsModal');
    if (m) m.style.display = 'none';
    __rotatedLogsCurrentProfileId = null;
}

function filterRotatedLogs() {
    const input = document.getElementById('rotatedLogsSearch');
    const q = input ? input.value.trim().toLowerCase() : '';
    const list = document.getElementById('rotatedLogsList');
    if (!list) return;
    Array.from(list.children).forEach((child) => {
        const name = (child.getAttribute('data-log-name') || '').toLowerCase();
        child.style.display = !q || name.includes(q) ? '' : 'none';
    });
}

let __rotatedLogsCurrentProfileId = null;

async function openRotatedLogsById(profileId) {
    try {
        __rotatedLogsCurrentProfileId = profileId;
        const res = await window.electronAPI.listProfileRotatedLogs(profileId);
        if (!res || !res.success) return showAlert((res && res.error) ? res.error : 'Failed to list logs');
        const list = document.getElementById('rotatedLogsList');
        if (!list) return;
        const search = document.getElementById('rotatedLogsSearch');
        if (search) search.value = '';
        list.textContent = '';
        if (!res.files || res.files.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.7; padding:10px;';
            empty.textContent = t('noRotatedLogs') || 'No rotated logs';
            list.appendChild(empty);
        } else {
            res.files.forEach(f => {
                const fileName = f.name || '';
                const item = document.createElement('div');
                item.className = 'no-drag';
                item.style.cssText = 'padding:10px; border:1px solid rgba(255,255,255,0.10); border-radius:10px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:10px;';
                item.setAttribute('data-log-name', fileName);

                const info = document.createElement('div');
                info.style.cssText = 'flex:1; cursor:pointer; min-width:0;';

                const title = document.createElement('div');
                title.style.cssText = 'font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
                title.textContent = fileName;

                const sizeEl = document.createElement('div');
                sizeEl.style.cssText = 'font-size:11px; opacity:0.7;';
                sizeEl.textContent = formatBytes(f.size || 0);

                info.appendChild(title);
                info.appendChild(sizeEl);

                info.onclick = async () => { await window.electronAPI.openPath(f.path); };

                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex; gap:8px;';

                const openBtn = document.createElement('button');
                openBtn.className = 'outline no-drag';
                openBtn.style.cssText = 'padding:6px 10px;';
                openBtn.textContent = t('openLog') || 'Open Log';
                openBtn.onclick = async (ev) => { ev.stopPropagation(); await window.electronAPI.openPath(f.path); };

                const delBtn = document.createElement('button');
                delBtn.className = 'outline no-drag';
                delBtn.style.cssText = 'padding:6px 10px; border-color:#ef4444; color:#ef4444;';
                delBtn.textContent = t('delete') || 'Delete';
                delBtn.onclick = async (ev) => { ev.stopPropagation(); await confirmDeleteRotatedLog(fileName); };

                actions.appendChild(openBtn);
                actions.appendChild(delBtn);

                item.appendChild(info);
                item.appendChild(actions);
                list.appendChild(item);
            });
            filterRotatedLogs();
        }
        const modal = document.getElementById('rotatedLogsModal');
        if (modal) modal.style.display = 'flex';
    } catch (e) {
        showAlert(e.message || 'Failed to list logs');
    }
}

async function confirmDeleteRotatedLog(filename) {
    if (!__rotatedLogsCurrentProfileId) return;
    showConfirm(`${t('confirmDelLog') || 'Delete this log file?'}\n${filename}`, async () => {
        const res = await window.electronAPI.deleteProfileRotatedLog(__rotatedLogsCurrentProfileId, filename);
        if (!res || !res.success) return showAlert((res && res.error) ? res.error : 'Delete failed');
        showToast(t('deleted') || 'Deleted');
        await openRotatedLogsById(__rotatedLogsCurrentProfileId);
    });
}

async function openProfileLogById(profileId) {
    try {
        const profiles = await window.electronAPI.getProfiles();
        const p = profiles.find(x => x.id === profileId);
        if (!p) return showAlert('Profile not found');
        const logPath = await window.electronAPI.getProfileLogPath(profileId);
        if (!logPath) return showAlert('Log path not available');
        await window.electronAPI.openPath(logPath);
    } catch (e) {
        showAlert(e.message || 'Failed to open log');
    }
}

async function clearProfileLogsById(profileId, clearHistory = false) {
    try {
        const runningIds = await window.electronAPI.getRunningIds();
        if (runningIds.includes(profileId)) {
            return showAlert(t('stopBeforeClearLogs') || 'Stop the profile before clearing logs.');
        }
        const prompt = clearHistory
            ? `${t('clearLogsConfirm') || 'Clear logs for this profile?'}\n${t('clearLogsHistoryHint') || 'This will also remove rotated history logs.'}`
            : (t('clearLogsConfirm') || 'Clear logs for this profile?');
        showConfirm(prompt, async () => {
            const res = await window.electronAPI.clearProfileLogs(profileId, clearHistory);
            if (!res || !res.success) return showAlert((res && res.error) ? res.error : 'Failed to clear logs');
            showToast(t('logsCleared') || 'Logs cleared');
        });
    } catch (e) {
        showAlert(e.message || 'Failed to clear logs');
    }
}

// 简单的颜色生成器
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

function ensureProfileListEventsBound() {
    if (__profileListEventsBound) return;
    const listEl = document.getElementById('profileList');
    if (!listEl) return;
    __profileListEventsBound = true;

    listEl.addEventListener('click', async (ev) => {
        try {
            const actionEl = ev.target && ev.target.closest ? ev.target.closest('[data-action]') : null;
            if (!actionEl || !listEl.contains(actionEl)) return;
            const action = actionEl.getAttribute('data-action');
            if (!action) return;

            // Buttons can be disabled; ignore.
            if (actionEl instanceof HTMLButtonElement && actionEl.disabled) return;

            const item = actionEl.closest('.profile-item');
            const profileId = item ? item.getAttribute('data-profile-id') : null;
            if (!profileId) return;

            switch (action) {
                case 'launch':
                    await launch(profileId);
                    break;
                case 'restart':
                    await restart(profileId);
                    break;
                case 'edit':
                    openEditModal(profileId);
                    break;
                case 'open-log':
                    await openProfileLogById(profileId);
                    break;
                case 'open-rotated-logs':
                    await openRotatedLogsById(profileId);
                    break;
                case 'clear-logs':
                    await clearProfileLogsById(profileId, false);
                    break;
                case 'clear-logs-history':
                    await clearProfileLogsById(profileId, true);
                    break;
                case 'leak-check':
                    await runLeakCheck(profileId);
                    break;
                case 'delete':
                    remove(profileId);
                    break;
                case 'open-leak':
                    await openLastLeakReportById(profileId);
                    break;
                default:
                    break;
            }
        } catch (e) {
            console.error('Profile list action failed:', e);
        }
    });

    listEl.addEventListener('change', async (ev) => {
        try {
            if (!(ev.target instanceof HTMLSelectElement)) return;
            const sel = ev.target;
            if (sel.getAttribute('data-action') !== 'quick-pre-proxy') return;
            const item = sel.closest('.profile-item');
            const profileId = item ? item.getAttribute('data-profile-id') : null;
            if (!profileId) return;
            await quickUpdatePreProxy(profileId, sel.value);
        } catch (e) {
            console.error('Profile list change handler failed:', e);
        }
    });
}

function ensurePreProxyListEventsBound() {
    if (__preProxyListEventsBound) return;
    const listEl = document.getElementById('preProxyList');
    if (!listEl) return;
    __preProxyListEventsBound = true;

    listEl.addEventListener('click', async (ev) => {
        try {
            const actionEl = ev.target && ev.target.closest ? ev.target.closest('[data-action]') : null;
            if (!actionEl || !listEl.contains(actionEl)) return;
            const action = actionEl.getAttribute('data-action');
            const proxyId = actionEl.getAttribute('data-proxy-id');
            if (!action || !proxyId) return;

            if (action === 'proxy-test') {
                await testSingleProxy(proxyId, actionEl);
            } else if (action === 'proxy-edit') {
                editPreProxy(proxyId);
            } else if (action === 'proxy-delete') {
                delP(proxyId);
            }
        } catch (e) {
            console.error('Pre-proxy list action failed:', e);
        }
    });

    listEl.addEventListener('change', (ev) => {
        try {
            if (!(ev.target instanceof HTMLInputElement)) return;
            const input = ev.target;
            if (input.getAttribute('data-action') !== 'proxy-select') return;
            const proxyId = input.getAttribute('data-proxy-id');
            if (!proxyId) return;

            if (globalSettings.mode === 'single') selP(proxyId);
            else togP(proxyId);
        } catch (e) {
            console.error('Pre-proxy list change handler failed:', e);
        }
    });
}

async function loadProfiles() {
    try {
        const profiles = await window.electronAPI.getProfiles();
        const runningIds = await window.electronAPI.getRunningIds();
        const listEl = document.getElementById('profileList');
        ensureProfileListEventsBound();

        if (viewMode === 'grid') {
            listEl.classList.add('grid-view');
            setViewModeIcon(viewMode);
        } else {
            listEl.classList.remove('grid-view');
            setViewModeIcon(viewMode);
        }

        listEl.textContent = '';
        const filtered = profiles.filter(p => {
            const text = searchText;
            // 搜索逻辑增强：支持搜标签
            return p.name.toLowerCase().includes(text) ||
                p.proxyStr.toLowerCase().includes(text) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(text)));
        });

        if (filtered.length === 0) {
            const isSearch = searchText.length > 0;
            const msg = isSearch ? "No Search Results" : t('emptyStateMsg');
            renderProfileListEmptyState(listEl, msg);
            return;
        }

        filtered.forEach(p => {
            const fp = p.fingerprint || {};
            const screen = fp.screen || { width: 0, height: 0 };
            const override = p.preProxyOverride || 'default';
            const isRunning = runningIds.includes(p.id);
            const isRestarting = __restartState.has(p.id);
            const lastStatus = __lastStatus.get(p.id);
            const engine = p.proxyEngine || (fp && fp.proxyEngine) || 'xray';
            const lastLeak = p.diagnostics && p.diagnostics.lastLeakReport ? p.diagnostics.lastLeakReport : null;
            const leakStatus = lastLeak && lastLeak.summary && lastLeak.summary.webrtc === 'leak' ? 'red' : null;
            const leakText = lastLeak ? (lastLeak.summary && lastLeak.summary.errorCode ? 'ERR' : 'OK') : 'N/A';
            const lastErr = p.diagnostics && p.diagnostics.lastError ? p.diagnostics.lastError : null;
            const errText = lastErr ? `${lastErr.stage || 'err'}: ${(lastErr.message || '').slice(0, 60)}` : '';

            const el = document.createElement('div');
            el.className = 'profile-item no-drag';
            el.setAttribute('data-profile-id', p.id);

            // Build DOM structure (no innerHTML for profile cards)
            const infoEl = document.createElement('div');
            infoEl.className = 'profile-info';

            const topRow = document.createElement('div');
            topRow.style.display = 'flex';
            topRow.style.alignItems = 'center';

            const nameEl = document.createElement('h4');
            nameEl.textContent = p.name || '';

            const statusEl = document.createElement('span');
            statusEl.id = `status-${p.id}`;
            statusEl.className = `running-badge ${isRunning ? 'active' : ''}`;
            statusEl.textContent = isRestarting
                ? (t('workingStatus') || 'Working...')
                : (lastStatus === 'stop_failed' ? (t('stopFailedStatus') || 'Stop Failed') : (t('runningStatus') || 'Running'));

            topRow.appendChild(nameEl);
            topRow.appendChild(statusEl);
            infoEl.appendChild(topRow);

            const metaEl = document.createElement('div');
            metaEl.className = 'profile-meta';

            // user tags
            if (p.tags && p.tags.length > 0) {
                p.tags.forEach((tag) => {
                    const color = stringToColor(tag);
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.style.background = `${color}33`;
                    span.style.color = color;
                    span.style.border = `1px solid ${color}44`;
                    span.textContent = tag;
                    metaEl.appendChild(span);
                });
            }

            // proxy protocol tag
            {
                const proto = ((p.proxyStr || '').split('://')[0] || 'N/A').toUpperCase();
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = proto;
                metaEl.appendChild(span);
            }

            // engine tag
            {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = `${t('engineLabel') || 'Engine'}:${engine}`;
                metaEl.appendChild(span);
            }

            // log size tag (async-filled)
            {
                const span = document.createElement('span');
                span.className = 'tag';
                span.id = `logsize-${p.id}`;
                span.textContent = 'Log:...';
                metaEl.appendChild(span);
            }

            // screen tag
            {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = `${screen.width}x${screen.height}`;
                metaEl.appendChild(span);
            }

            // leak tag
            {
                const span = document.createElement('span');
                span.className = 'tag';
                const borderColor = leakStatus === 'red' ? '#ef4444' : 'var(--accent)';
                span.style.border = `1px solid ${borderColor}`;
                if (lastLeak && lastLeak.path) {
                    span.style.cursor = 'pointer';
                    span.dataset.action = 'open-leak';
                }
                span.textContent = `${t('leakStatus') || 'Leak'}:${leakText}`;
                metaEl.appendChild(span);
            }

            // last error tag
            if (lastErr) {
                const span = document.createElement('span');
                span.className = 'tag';
                span.style.border = '1px solid #ef4444';
                span.style.color = '#ef4444';
                span.style.cursor = 'pointer';
                span.dataset.action = 'open-log';
                span.title = lastErr.message || '';
                span.textContent = errText;
                metaEl.appendChild(span);
            }

            // quick switch pre-proxy select
            {
                const wrapper = document.createElement('span');
                wrapper.className = 'tag';
                wrapper.style.border = '1px solid var(--accent)';

                const sel = document.createElement('select');
                sel.className = 'quick-switch-select no-drag';
                sel.dataset.action = 'quick-pre-proxy';

                const optDefault = document.createElement('option');
                optDefault.value = 'default';
                optDefault.textContent = t('qsDefault');
                sel.appendChild(optDefault);

                const optOn = document.createElement('option');
                optOn.value = 'on';
                optOn.textContent = t('qsOn');
                sel.appendChild(optOn);

                const optOff = document.createElement('option');
                optOff.value = 'off';
                optOff.textContent = t('qsOff');
                sel.appendChild(optOff);

                sel.value = override;
                wrapper.appendChild(sel);
                metaEl.appendChild(wrapper);
            }

            infoEl.appendChild(metaEl);
            el.appendChild(infoEl);

            const actionsEl = document.createElement('div');
            actionsEl.className = 'actions';

            const btnLaunch = document.createElement('button');
            btnLaunch.className = 'no-drag';
            btnLaunch.dataset.action = 'launch';
            btnLaunch.textContent = t('launch');
            btnLaunch.disabled = isRestarting;
            actionsEl.appendChild(btnLaunch);

            const btnRestart = document.createElement('button');
            btnRestart.className = 'outline no-drag';
            btnRestart.dataset.action = 'restart';
            btnRestart.textContent = isRestarting ? (t('restarting') || 'Restarting...') : (t('restart') || 'Restart');
            btnRestart.disabled = !(isRunning && !isRestarting);
            actionsEl.appendChild(btnRestart);

            if (lastStatus === 'stop_failed') {
                const btnOpenLogRed = document.createElement('button');
                btnOpenLogRed.className = 'outline no-drag';
                btnOpenLogRed.dataset.action = 'open-log';
                btnOpenLogRed.textContent = t('openLog') || 'Open Log';
                btnOpenLogRed.style.borderColor = '#ef4444';
                btnOpenLogRed.style.color = '#ef4444';
                actionsEl.appendChild(btnOpenLogRed);

                const btnRetry = document.createElement('button');
                btnRetry.className = 'outline no-drag';
                btnRetry.dataset.action = 'restart';
                btnRetry.textContent = t('retry') || 'Retry';
                btnRetry.title = t('openLog') || 'Open Log';
                actionsEl.appendChild(btnRetry);
            }

            const btnEdit = document.createElement('button');
            btnEdit.className = 'outline no-drag';
            btnEdit.dataset.action = 'edit';
            btnEdit.textContent = t('edit');
            btnEdit.disabled = isRestarting;
            actionsEl.appendChild(btnEdit);

            const btnOpenLog = document.createElement('button');
            btnOpenLog.className = 'outline no-drag';
            btnOpenLog.dataset.action = 'open-log';
            btnOpenLog.textContent = t('openLog') || 'Open Log';
            btnOpenLog.disabled = isRestarting;
            actionsEl.appendChild(btnOpenLog);

            const btnRotated = document.createElement('button');
            btnRotated.className = 'outline no-drag';
            btnRotated.dataset.action = 'open-rotated-logs';
            btnRotated.textContent = t('rotatedLogsBtn') || 'Rotated';
            btnRotated.disabled = isRestarting;
            actionsEl.appendChild(btnRotated);

            const btnClear = document.createElement('button');
            btnClear.className = 'outline no-drag';
            btnClear.dataset.action = 'clear-logs';
            btnClear.textContent = t('clearLogs') || 'Clear Logs';
            btnClear.disabled = isRunning || isRestarting;
            actionsEl.appendChild(btnClear);

            const btnClearHistory = document.createElement('button');
            btnClearHistory.className = 'outline no-drag';
            btnClearHistory.dataset.action = 'clear-logs-history';
            btnClearHistory.textContent = t('clearLogsHistory') || 'Clear+History';
            btnClearHistory.title = t('clearLogsHistoryHint') || 'Also removes rotated history logs';
            btnClearHistory.disabled = isRunning || isRestarting;
            actionsEl.appendChild(btnClearHistory);

            const btnLeakCheck = document.createElement('button');
            btnLeakCheck.className = 'outline no-drag';
            btnLeakCheck.dataset.action = 'leak-check';
            btnLeakCheck.textContent = t('leakCheck') || 'LeakCheck';
            btnLeakCheck.disabled = !(isRunning && !isRestarting);
            actionsEl.appendChild(btnLeakCheck);

            const btnDelete = document.createElement('button');
            btnDelete.className = 'danger no-drag';
            btnDelete.dataset.action = 'delete';
            btnDelete.textContent = t('delete');
            btnDelete.disabled = isRestarting;
            actionsEl.appendChild(btnDelete);

            el.appendChild(actionsEl);

            // Legacy innerHTML renderer (kept for reference; disabled)
            /*
            el.innerHTML = `
                <div class="profile-info">
                    <div style="display:flex; align-items:center;"><h4>${escapeHtml(p.name)}</h4><span id="status-${escapeAttr(p.id)}" class="running-badge ${isRunning ? 'active' : ''}">${isRestarting ? (t('workingStatus') || 'Working...') : (lastStatus === 'stop_failed' ? (t('stopFailedStatus') || 'Stop Failed') : t('runningStatus'))}</span></div>
                    <div class="profile-meta">
                        ${tagsHtml} <!-- 插入标签 -->
                        <span class="tag">${escapeHtml((p.proxyStr || '').split('://')[0].toUpperCase() || 'N/A')}</span>
                        <span class="tag">${t('engineLabel') || 'Engine'}:${escapeHtml(engine)}</span>
                        <span class="tag" id="logsize-${escapeAttr(p.id)}">Log:...</span>
                        <span class="tag">${screen.width}x${screen.height}</span>
                        <span class="tag" ${leakTagAttrs}>${t('leakStatus') || 'Leak'}:${leakText}</span>
                        ${lastErr ? `<span class="tag" style="border:1px solid #ef4444;color:#ef4444;cursor:pointer;" data-action="open-log" title="${escapeAttr(lastErr.message || '')}">${escapeHtml(errText)}</span>` : ''}
                        <span class="tag" style="border:1px solid var(--accent);">
                            <select class="quick-switch-select no-drag" data-action="quick-pre-proxy">
                                <option value="default" ${override === 'default' ? 'selected' : ''}>${t('qsDefault')}</option>
                                <option value="on" ${override === 'on' ? 'selected' : ''}>${t('qsOn')}</option>
                                <option value="off" ${override === 'off' ? 'selected' : ''}>${t('qsOff')}</option>
                            </select>
                        </span>
                    </div>
                </div>
                <div class="actions"><button data-action="launch" class="no-drag" ${isRestarting ? 'disabled' : ''}>${t('launch')}</button><button class="outline no-drag" data-action="restart" ${isRunning && !isRestarting ? '' : 'disabled'}>${isRestarting ? (t('restarting') || 'Restarting...') : (t('restart') || 'Restart')}</button>${lastStatus === 'stop_failed' ? `<button class="outline no-drag" data-action="open-log" style="border-color:#ef4444;color:#ef4444;">${t('openLog') || 'Open Log'}</button><button class="outline no-drag" data-action="restart" title=\"${t('openLog') || 'Open Log'}\">${t('retry') || 'Retry'}</button>` : ''}<button class="outline no-drag" data-action="edit" ${isRestarting ? 'disabled' : ''}>${t('edit')}</button><button class="outline no-drag" data-action="open-log" ${isRestarting ? 'disabled' : ''}>${t('openLog') || 'Open Log'}</button><button class="outline no-drag" data-action="open-rotated-logs" ${isRestarting ? 'disabled' : ''}>${t('rotatedLogsBtn') || 'Rotated'}</button><button class="outline no-drag" data-action="clear-logs" ${isRunning || isRestarting ? 'disabled' : ''}>${t('clearLogs') || 'Clear Logs'}</button><button class="outline no-drag" data-action="clear-logs-history" ${isRunning || isRestarting ? 'disabled' : ''} title="${t('clearLogsHistoryHint') || 'Also removes rotated history logs'}">${t('clearLogsHistory') || 'Clear+History'}</button><button class="outline no-drag" data-action="leak-check" ${isRunning && !isRestarting ? '' : 'disabled'}>${t('leakCheck') || 'LeakCheck'}</button><button class="danger no-drag" data-action="delete" ${isRestarting ? 'disabled' : ''}>${t('delete')}</button></div>
            `;
            */
            listEl.appendChild(el);
            // async log size fill (non-blocking)
            setTimeout(async () => {
                try {
                    const cached = __logSizeCache.get(p.id);
                    const now = Date.now();
                    if (cached && (now - cached.ts) < 10000) {
                        const elSize = document.getElementById(`logsize-${p.id}`);
                        if (elSize) elSize.innerText = `Log:${formatBytes(cached.total)}`;
                        return;
                    }

                    const sizes = await window.electronAPI.getProfileLogSizes(p.id);
                    const elSize = document.getElementById(`logsize-${p.id}`);
                    if (!elSize || !sizes || !sizes.success) return;
                    const total = (sizes.xray || 0) + (sizes.singbox || 0);
                    elSize.innerText = `Log:${formatBytes(total)}`;
                    __logSizeCache.set(p.id, { ts: now, total });
                } catch (e) { }
            }, 0);
        });
    } catch (e) { console.error(e); }
}


async function quickUpdatePreProxy(id, val) {
    const profiles = await window.electronAPI.getProfiles();
    const p = profiles.find(x => x.id === id);
    if (p) { p.preProxyOverride = val; await window.electronAPI.updateProfile(p); }
}

function openAddModal() {
    document.getElementById('addName').value = '';
    document.getElementById('addProxy').value = '';
    document.getElementById('addTags').value = ''; // Clear tags
    document.getElementById('addTimezone').value = 'Auto (No Change)';
    const engineEl = document.getElementById('addProxyEngine');
    if (engineEl) engineEl.value = 'xray';
    const consistencyEl = document.getElementById('addProxyConsistency');
    if (consistencyEl) consistencyEl.value = 'warn';

    // Initialize location dropdown
    initCustomCityDropdown('addCity', 'addCityDropdown');
    document.getElementById('addCity').value = 'Auto (IP Based)';

    // Initialize language dropdown
    initCustomLanguageDropdown('addLanguage', 'addLanguageDropdown');
    document.getElementById('addLanguage').value = 'Auto (System Default)';

    document.getElementById('addModal').style.display = 'flex';
}
function closeAddModal() { document.getElementById('addModal').style.display = 'none'; }

async function saveNewProfile() {
    const nameBase = document.getElementById('addName').value.trim();
    const proxyText = document.getElementById('addProxy').value.trim();
    const proxyEngine = document.getElementById('addProxyEngine') ? document.getElementById('addProxyEngine').value : 'xray';
    const settings = await window.electronAPI.getSettings().catch(() => ({}));
    const defaultConsistency = settings.defaultProxyConsistency || 'warn';
    const proxyConsistency = document.getElementById('addProxyConsistency') ? document.getElementById('addProxyConsistency').value : defaultConsistency;
    const tagsStr = document.getElementById('addTags').value;
    const timezoneInput = document.getElementById('addTimezone').value;
    // 将 "Auto (No Change)" 转换为 "Auto" 存储
    const timezone = timezoneInput === 'Auto (No Change)' ? 'Auto' : timezoneInput;

    // Get city/location value
    const cityInput = document.getElementById('addCity').value;
    let city = null;
    let geolocation = null;
    if (cityInput && cityInput !== 'Auto (IP Based)') {
        const cityData = window.CITY_DATA ? window.CITY_DATA.find(c => c.name === cityInput) : null;
        if (cityData) {
            city = cityData.name;
            geolocation = { latitude: cityData.lat, longitude: cityData.lng, accuracy: 100 };
        }
    }

    // Get language value
    const languageInput = document.getElementById('addLanguage').value;
    const language = getLanguageCode(languageInput);

    const tags = tagsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);

    // 分割多行代理链接
    const proxyLines = proxyText.split('\n').map(l => l.trim()).filter(l => l);

    if (proxyLines.length === 0) {
        return showAlert(t('inputReq'));
    }

    // 批量创建环境
    let createdCount = 0;
    for (let i = 0; i < proxyLines.length; i++) {
        const proxyStr = proxyLines[i];
        let name;

        if (!nameBase) {
            // 无名称输入，使用代理备注
            name = getProxyRemark(proxyStr) || `Profile-${String(i + 1).padStart(2, '0')}`;
        } else if (proxyLines.length === 1) {
            // 单个代理，使用输入名称
            name = nameBase;
        } else {
            // 多个代理，添加序号
            name = `${nameBase}-${String(i + 1).padStart(2, '0')}`;
        }

        try {
            const consistencyPolicy = { enforce: true, onMismatch: proxyConsistency };
            const allowAutofix = { language: proxyConsistency === 'autofix', geo: proxyConsistency === 'autofix' };
            await window.electronAPI.saveProfile({
                name,
                proxyStr,
                tags,
                timezone,
                city,
                geolocation,
                language,
                proxyEngine,
                proxyPolicy: { autoLink: true, consistencyPolicy, allowAutofix }
            });
            createdCount++;
        } catch (e) {
            console.error(`Failed to create profile ${name}:`, e);
        }
    }

    closeAddModal();
    await loadProfiles();

    if (proxyLines.length > 1) {
        showToast(`${t('msgBatchCreated') || '批量创建成功'}: ${createdCount} ${t('msgProfiles') || '个环境'}`, 2200);
    }
}

async function launch(id) {
    try {
        const watermarkStyle = localStorage.getItem('geekez_watermark_style') || 'enhanced';
        const msg = await window.electronAPI.launchProfile(id, watermarkStyle, {});
        if (msg && msg.includes(':')) showAlert(msg);
    } catch (e) { showAlert('Error: ' + e.message); }
}

function formatConsistencyIssues(issues) {
    if (!Array.isArray(issues) || issues.length === 0) return '-';
    return issues.map(i => {
        const code = i && i.code ? i.code : 'ISSUE';
        const msg = i && i.message ? i.message : '';
        return `- ${code}${msg ? `: ${msg}` : ''}`;
    }).join('\n');
}

async function restart(id) {
    try {
        if (__restartState.has(id)) return;
        __restartState.add(id);
        await loadProfiles();
        const profiles = await window.electronAPI.getProfiles();
        const p = profiles.find(x => x.id === id);
        const lastErr = p && p.diagnostics ? p.diagnostics.lastError : null;
        if (lastErr && lastErr.message && typeof showConfirmChoice === 'function') {
            // Pause restart flow until user chooses.
            const shouldContinue = await new Promise((resolve) => {
                showConfirmChoice(
                    `${t('lastError') || 'Last error'}: ${(lastErr.message || '').slice(0, 160)}\n${t('chooseAction') || 'Choose action:'}`,
                    {
                        altText: t('openLog') || 'Open Log',
                        okText: t('retryNow') || 'Retry Now',
                        onAlt: async () => { await openProfileLogById(id); resolve(false); },
                        onConfirm: async () => { resolve(true); },
                        onCancel: async () => { resolve(false); }
                    }
                );
            });
            if (!shouldContinue) return;
        }
        // Immediately reflect work state in UI
        __restartState.add(id);
        await loadProfiles();
        const watermarkStyle = localStorage.getItem('geekez_watermark_style') || 'enhanced';
        await window.electronAPI.stopProfile(id);
        await launch(id);
    } catch (e) {
        showAlert('Restart Error: ' + e.message);
    } finally {
        __restartState.delete(id);
        await loadProfiles();
    }
}

function remove(id) {
    showConfirm(t('confirmDel'), async () => { await window.electronAPI.deleteProfile(id); await loadProfiles(); });
}

async function stopProfile(id) {
    try {
        await window.electronAPI.stopProfile(id);
    } catch (e) { }
}

async function openEditModal(id) {
    const profiles = await window.electronAPI.getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    currentEditId = id;
    window.__geekez_edit_snapshot = {
        id,
        proxyStr: p.proxyStr,
        proxyEngine: p.proxyEngine || (p.fingerprint && p.fingerprint.proxyEngine) || 'xray'
    };
    const fp = p.fingerprint || {};
    document.getElementById('editName').value = p.name;
    document.getElementById('editProxy').value = p.proxyStr;
    const editProxyEngine = document.getElementById('editProxyEngine');
    if (editProxyEngine) editProxyEngine.value = p.proxyEngine || (fp && fp.proxyEngine) || 'xray';

    const editConsistency = document.getElementById('editProxyConsistency');
    if (editConsistency) {
        const onMismatch = (p.proxyPolicy && p.proxyPolicy.consistencyPolicy && p.proxyPolicy.consistencyPolicy.onMismatch) ? p.proxyPolicy.consistencyPolicy.onMismatch : 'warn';
        editConsistency.value = onMismatch;
    }
    const editAutofixLang = document.getElementById('editProxyAutofixLanguage');
    if (editAutofixLang) {
        const allow = (p.proxyPolicy && p.proxyPolicy.allowAutofix) ? p.proxyPolicy.allowAutofix : null;
        editAutofixLang.value = (allow && allow.language === true) ? 'on' : 'off';
    }
    const editAutofixGeo = document.getElementById('editProxyAutofixGeo');
    if (editAutofixGeo) {
        const allow = (p.proxyPolicy && p.proxyPolicy.allowAutofix) ? p.proxyPolicy.allowAutofix : null;
        editAutofixGeo.value = (allow && allow.geo === true) ? 'on' : 'off';
    }
    document.getElementById('editTags').value = (p.tags || []).join(', ');

    // 回填时区，将 "Auto" 转换为 "Auto (No Change)" 显示
    const savedTimezone = fp.timezone || 'Auto';
    const displayTimezone = savedTimezone === 'Auto' ? 'Auto (No Change)' : savedTimezone;
    document.getElementById('editTimezone').value = displayTimezone;

    initCustomCityDropdown('editCity', 'editCityDropdown');

    // Use stored value directly or Default English Auto
    const savedCity = fp.city || "Auto (IP Based)";
    document.getElementById('editCity').value = savedCity;

    const sel = document.getElementById('editPreProxyOverride');
    sel.options[0].text = t('optDefault'); sel.options[1].text = t('optOn'); sel.options[2].text = t('optOff');
    sel.value = p.preProxyOverride || 'default';
    document.getElementById('editResW').value = fp.screen?.width || 1920;
    document.getElementById('editResH').value = fp.screen?.height || 1080;

    // Init Language Dropdown
    initCustomLanguageDropdown('editLanguage', 'editLanguageDropdown');
    document.getElementById('editLanguage').value = getLanguageName(fp.language || 'auto');

    // Load debug port and show/hide based on global setting
    const settings = await window.electronAPI.getSettings();
    const debugPortSection = document.getElementById('debugPortSection');
    if (settings.enableRemoteDebugging) {
        debugPortSection.style.display = 'block';
        document.getElementById('editDebugPort').value = p.debugPort || '';
    } else {
        debugPortSection.style.display = 'none';
    }

    // Load custom args and show/hide based on global setting
    const customArgsSection = document.getElementById('customArgsSection');
    if (settings.enableCustomArgs) {
        customArgsSection.style.display = 'block';
        document.getElementById('editCustomArgs').value = p.customArgs || '';
    } else {
        customArgsSection.style.display = 'none';
    }

    document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; currentEditId = null; }
async function saveEditProfile() {
    console.log('[saveEditProfile] Called, currentEditId:', currentEditId);
    if (!currentEditId) return;
    const profiles = await window.electronAPI.getProfiles();
    let p = profiles.find(x => x.id === currentEditId);
    console.log('[saveEditProfile] Found profile:', p);
    if (p) {
        const runningIds = await window.electronAPI.getRunningIds();
        const wasRunning = runningIds.includes(p.id);
        const before = window.__geekez_edit_snapshot || { proxyStr: p.proxyStr, proxyEngine: p.proxyEngine || 'xray' };
        p.name = document.getElementById('editName').value;
        p.proxyStr = document.getElementById('editProxy').value;
        const editProxyEngine = document.getElementById('editProxyEngine');
        if (editProxyEngine) p.proxyEngine = editProxyEngine.value || 'xray';
        const editConsistency = document.getElementById('editProxyConsistency');
        const onMismatch = editConsistency ? (editConsistency.value || 'warn') : 'warn';
        p.proxyPolicy = p.proxyPolicy || {};
        p.proxyPolicy.autoLink = true;
        p.proxyPolicy.consistencyPolicy = { enforce: true, onMismatch };
        const editAutofixLang = document.getElementById('editProxyAutofixLanguage');
        const editAutofixGeo = document.getElementById('editProxyAutofixGeo');
        p.proxyPolicy.allowAutofix = {
            language: editAutofixLang ? (editAutofixLang.value === 'on') : false,
            geo: editAutofixGeo ? (editAutofixGeo.value === 'on') : false
        };
        const tagsStr = document.getElementById('editTags').value;
        p.tags = tagsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
        p.preProxyOverride = document.getElementById('editPreProxyOverride').value;

        if (!p.fingerprint) p.fingerprint = {};
        p.fingerprint.screen = { width: parseInt(document.getElementById('editResW').value), height: parseInt(document.getElementById('editResH').value) };
        p.fingerprint.window = p.fingerprint.screen;
        const timezoneValue = document.getElementById('editTimezone').value;
        console.log('[saveEditProfile] Timezone value:', timezoneValue);
        p.fingerprint.timezone = timezoneValue === 'Auto (No Change)' ? 'Auto' : timezoneValue;
        console.log('[saveEditProfile] Converted timezone:', p.fingerprint.timezone);


        // Save City & Geolocation
        const cityInput = document.getElementById('editCity').value;
        if (cityInput && cityInput !== 'Auto (IP Based)') {
            const cityData = window.CITY_DATA ? window.CITY_DATA.find(c => c.name === cityInput) : null;
            if (cityData) {
                p.fingerprint.city = cityData.name;
                p.fingerprint.geolocation = { latitude: cityData.lat, longitude: cityData.lng, accuracy: 100 };
            }
        } else {
            // Auto mode: remove geolocation to let system/IP decide
            delete p.fingerprint.city;
            delete p.fingerprint.geolocation;
        }
        p.fingerprint.language = getLanguageCode(document.getElementById('editLanguage').value);

        // Save debug port if enabled
        const debugPortInput = document.getElementById('editDebugPort');
        if (debugPortInput.parentElement.style.display !== 'none') {
            const portValue = debugPortInput.value.trim();
            p.debugPort = portValue ? parseInt(portValue) : null;
        }

        // Save custom args if enabled
        const customArgsInput = document.getElementById('editCustomArgs');
        if (customArgsInput.parentElement.style.display !== 'none') {
            p.customArgs = customArgsInput.value.trim();
        }

        console.log('[saveEditProfile] Calling updateProfile...');
        await window.electronAPI.updateProfile(p);
        console.log('[saveEditProfile] Profile updated successfully');
        closeEditModal(); await loadProfiles();

        const proxyChanged = (before.proxyStr !== p.proxyStr) || (before.proxyEngine !== p.proxyEngine);
        if (wasRunning && proxyChanged) {
            showConfirm('Proxy settings changed. Restart this profile now to apply?', async () => {
                await stopProfile(p.id);
                await launch(p.id);
            });
        }
    }
}

async function openProxyManager() {
    globalSettings = await window.electronAPI.getSettings();
    if (!globalSettings.subscriptions) globalSettings.subscriptions = [];
    renderGroupTabs();
    document.getElementById('proxyModal').style.display = 'flex';
}
function closeProxyManager() { document.getElementById('proxyModal').style.display = 'none'; }

function renderGroupTabs() {
    const container = document.getElementById('proxyGroupTabs');
    if (!container) return;
    container.textContent = '';
    const manualBtn = document.createElement('div');
    manualBtn.className = `tab-btn no-drag ${currentProxyGroup === 'manual' ? 'active' : ''}`;
    manualBtn.innerText = t('groupManual');
    manualBtn.onclick = () => switchProxyGroup('manual');
    container.appendChild(manualBtn);
    globalSettings.subscriptions.forEach(sub => {
        const btn = document.createElement('div');
        btn.className = `tab-btn no-drag ${currentProxyGroup === sub.id ? 'active' : ''}`;
        btn.innerText = sub.name || 'Sub';
        btn.onclick = () => switchProxyGroup(sub.id);
        container.appendChild(btn);
    });
    renderProxyNodes();
}

function switchProxyGroup(gid) { currentProxyGroup = gid; renderGroupTabs(); }

function renderProxyNodes() {
    ensurePreProxyListEventsBound();
    const modeSel = document.getElementById('proxyMode');
    if (modeSel.options.length === 0) {
        modeSel.textContent = '';
        const optSingle = document.createElement('option');
        optSingle.value = 'single';
        optSingle.textContent = t('modeSingle') || 'Single';
        const optBalance = document.createElement('option');
        optBalance.value = 'balance';
        optBalance.textContent = t('modeBalance') || 'Balance';
        const optFailover = document.createElement('option');
        optFailover.value = 'failover';
        optFailover.textContent = t('modeFailover') || 'Failover';
        modeSel.appendChild(optSingle);
        modeSel.appendChild(optBalance);
        modeSel.appendChild(optFailover);
    }
    modeSel.value = globalSettings.mode || 'single';
    document.getElementById('notifySwitch').checked = globalSettings.notify || false;

    const list = (globalSettings.preProxies || []).filter(p => {
        if (currentProxyGroup === 'manual') return !p.groupId || p.groupId === 'manual';
        return p.groupId === currentProxyGroup;
    });

    const listEl = document.getElementById('preProxyList');
    listEl.textContent = '';

    const groupName = currentProxyGroup === 'manual' ? t('groupManual') : (globalSettings.subscriptions.find(s => s.id === currentProxyGroup)?.name || 'Sub');
    document.getElementById('currentGroupTitle').innerText = `${groupName} (${list.length})`;

    const btnTest = document.querySelector('button[data-action="test-current-group"]');
    if (btnTest) btnTest.innerText = t('btnTestGroup');
    const btnNewSub = document.querySelector('button[data-action="open-sub-edit-modal"][data-action-arg="true"]');
    if (btnNewSub) btnNewSub.innerText = t('btnImportSub');
    const btnEditSub = document.getElementById('btnEditSub');
    if (btnEditSub) btnEditSub.innerText = t('btnEditSub');
    const btnRollbackSub = document.getElementById('btnRollbackSub');
    if (btnRollbackSub) btnRollbackSub.innerText = '↩ Rollback';

    const isManual = currentProxyGroup === 'manual';
    document.getElementById('manualAddArea').style.display = isManual ? 'block' : 'none';
    document.getElementById('btnEditSub').style.display = isManual ? 'none' : 'inline-block';
    const currentSub = globalSettings.subscriptions.find(s => s.id === currentProxyGroup);
    if (btnRollbackSub) btnRollbackSub.style.display = (!isManual && currentSub && currentSub.snapshots && currentSub.snapshots.length > 0) ? 'inline-block' : 'none';

    list.forEach(p => {
        const row = document.createElement('div');
        row.className = 'proxy-row no-drag';

        const isSel = globalSettings.mode === 'single' && globalSettings.selectedId === p.id;
        if (isSel) row.style.background = "rgba(0,224,255,0.08)";

        const inputType = globalSettings.mode === 'single' ? 'radio' : 'checkbox';
        const checked = globalSettings.mode === 'single' ? isSel : (p.enable !== false);

        const left = document.createElement('div');
        left.className = 'proxy-left';
        const input = document.createElement('input');
        input.type = inputType;
        input.name = 'ps';
        input.checked = checked;
        input.dataset.action = 'proxy-select';
        input.dataset.proxyId = p.id;
        input.style.cssText = 'cursor:pointer; margin:0;';
        input.className = 'no-drag';
        left.appendChild(input);

        const mid = document.createElement('div');
        mid.className = 'proxy-mid';

        const header = document.createElement('div');
        header.className = 'proxy-header';

        const proto = (p.url.split('://')[0] || 'UNK').toUpperCase();
        let displayRemark = p.remark;
        if (!displayRemark || displayRemark.trim() === '') displayRemark = 'Node';

        const protoSpan = document.createElement('span');
        protoSpan.className = 'proxy-proto';
        protoSpan.textContent = proto;

        const remarkSpan = document.createElement('span');
        remarkSpan.className = 'proxy-remark';
        remarkSpan.title = displayRemark;
        remarkSpan.textContent = displayRemark;

        const latencySpan = document.createElement('span');
        latencySpan.className = 'proxy-latency';
        if (p.latency !== undefined) {
            if (p.latency === -1 || p.latency === 9999) {
                latencySpan.style.border = '1px solid #e74c3c';
                latencySpan.style.color = '#e74c3c';
                latencySpan.textContent = 'Fail';
            } else {
                const color = p.latency < 500 ? '#27ae60' : (p.latency < 1000 ? '#f39c12' : '#e74c3c');
                latencySpan.style.border = `1px solid ${color}`;
                latencySpan.style.color = color;
                latencySpan.textContent = `${p.latency}ms`;
            }
        } else {
            latencySpan.style.border = '1px solid var(--text-secondary)';
            latencySpan.style.opacity = '0.3';
            latencySpan.textContent = '-';
        }

        header.appendChild(protoSpan);
        header.appendChild(remarkSpan);
        header.appendChild(latencySpan);

        if (p.lastTestAt) {
            const timeStr = new Date(p.lastTestAt).toLocaleString();
            const okStr = p.lastTestOk ? 'OK' : 'FAIL';
            const codeStr = p.lastTestCode ? ` [${p.lastTestCode}]` : '';
            const msgStr = p.lastTestMsg ? ` - ${p.lastTestMsg}` : '';
            const healthTitle = `${okStr}${codeStr} @ ${timeStr}${msgStr}`;

            const healthDot = document.createElement('span');
            healthDot.title = healthTitle;
            healthDot.style.cssText = `display:inline-block; width:7px; height:7px; border-radius:50%; background:${p.lastTestOk ? '#27ae60' : '#e74c3c'}; margin-left:8px; vertical-align:middle;`;
            header.appendChild(healthDot);
        }

        mid.appendChild(header);

        if (p.ipInfo && (p.ipInfo.country || p.ipInfo.timezone || p.ipInfo.ip)) {
            const parts = [];
            if (p.ipInfo.ip) parts.push(p.ipInfo.ip);
            if (p.ipInfo.country) parts.push(p.ipInfo.country);
            if (p.ipInfo.timezone) parts.push(p.ipInfo.timezone);
            const text = parts.join(' · ');

            const ipBadge = document.createElement('div');
            ipBadge.className = 'proxy-sub';
            ipBadge.style.cssText = 'margin-top:4px; font-size:11px; color: var(--text-secondary);';
            ipBadge.title = text;
            ipBadge.textContent = text;
            mid.appendChild(ipBadge);
        }

        const right = document.createElement('div');
        right.className = 'proxy-right';

        const btnTest = document.createElement('button');
        btnTest.className = 'outline no-drag';
        btnTest.dataset.action = 'proxy-test';
        btnTest.dataset.proxyId = p.id;
        btnTest.textContent = t('btnTest');
        right.appendChild(btnTest);

        if (isManual) {
            const btnEdit = document.createElement('button');
            btnEdit.className = 'outline no-drag';
            btnEdit.dataset.action = 'proxy-edit';
            btnEdit.dataset.proxyId = p.id;
            btnEdit.textContent = t('btnEdit');
            right.appendChild(btnEdit);
        }

        const btnDel = document.createElement('button');
        btnDel.className = 'danger no-drag';
        btnDel.dataset.action = 'proxy-delete';
        btnDel.dataset.proxyId = p.id;
        btnDel.textContent = '✕';
        right.appendChild(btnDel);

        row.appendChild(left);
        row.appendChild(mid);
        row.appendChild(right);
        listEl.appendChild(row);
    });

    const btnDone = document.querySelector('#proxyModal button[data-i18n="done"]');
    if (btnDone) btnDone.innerText = t('done');
}

function resetProxyInput() {
    document.getElementById('editProxyId').value = '';
    document.getElementById('newProxyRemark').value = '';
    document.getElementById('newProxyUrl').value = '';
    const btn = document.getElementById('btnSaveProxy');
    btn.innerText = t('add'); btn.className = '';
}

function editPreProxy(id) {
    const p = globalSettings.preProxies.find(x => x.id === id);
    if (!p) return;
    document.getElementById('editProxyId').value = p.id;
    document.getElementById('newProxyRemark').value = p.remark;
    document.getElementById('newProxyUrl').value = p.url;
    const btn = document.getElementById('btnSaveProxy');
    btn.innerText = t('save'); btn.className = 'outline';
    document.getElementById('newProxyUrl').focus();
}

async function savePreProxy() {
    const id = document.getElementById('editProxyId').value;
    let remark = document.getElementById('newProxyRemark').value;
    const url = document.getElementById('newProxyUrl').value.trim();
    if (!url) return;
    if (!remark) remark = getProxyRemark(url) || 'Manual Node';
    if (!globalSettings.preProxies) globalSettings.preProxies = [];
    if (id) {
        const idx = globalSettings.preProxies.findIndex(x => x.id === id);
        if (idx > -1) { globalSettings.preProxies[idx].remark = remark; globalSettings.preProxies[idx].url = url; }
    } else {
        globalSettings.preProxies.push({ id: Date.now().toString(), remark, url, enable: true, groupId: 'manual' });
    }
    resetProxyInput(); renderProxyNodes(); await window.electronAPI.saveSettings(globalSettings);
}

// --- Subscription Management ---
function openSubEditModal(isNew) {
    const modal = document.getElementById('subEditModal');
    const headerTitle = modal.querySelector('.modal-header span'); if (headerTitle) headerTitle.innerText = t('subTitle');
    const labels = modal.querySelectorAll('label'); if (labels[0]) labels[0].innerText = t('subName'); if (labels[1]) labels[1].innerText = t('subUrl'); if (labels[2]) labels[2].innerText = t('subInterval');
    const options = document.getElementById('subInterval').options; options[0].text = t('optDisabled'); options[1].text = t('opt24h'); options[2].text = t('opt72h'); options[3].text = t('optCustom');
    const btnDel = document.getElementById('btnDelSub'); btnDel.innerText = t('btnDelSub'); btnDel.style.display = isNew ? 'none' : 'inline-block';
    const btnSave = modal.querySelector('button[data-action="save-subscription"]'); if (btnSave) btnSave.innerText = t('btnSaveUpdate');

    if (isNew) {
        document.getElementById('subId').value = '';
        document.getElementById('subName').value = '';
        document.getElementById('subUrl').value = '';
        document.getElementById('subInterval').value = '24';
        document.getElementById('subCustomInterval').style.display = 'none';
    }
    modal.style.display = 'flex';
    document.getElementById('subInterval').onchange = function () { document.getElementById('subCustomInterval').style.display = this.value === 'custom' ? 'block' : 'none'; }
}

function closeSubEditModal() { document.getElementById('subEditModal').style.display = 'none'; }

function editCurrentSubscription() {
    const sub = globalSettings.subscriptions.find(s => s.id === currentProxyGroup);
    if (!sub) return;
    openSubEditModal(false);
    document.getElementById('subId').value = sub.id;
    document.getElementById('subName').value = sub.name;
    document.getElementById('subUrl').value = sub.url;
    const sel = document.getElementById('subInterval');
    const cust = document.getElementById('subCustomInterval');
    if (['0', '24', '72'].includes(sub.interval)) { sel.value = sub.interval; cust.style.display = 'none'; }
    else { sel.value = 'custom'; cust.style.display = 'block'; cust.value = sub.interval; }
}

async function saveSubscription() {
    const id = document.getElementById('subId').value;
    const name = document.getElementById('subName').value || 'Subscription';
    const url = document.getElementById('subUrl').value.trim();
    let interval = document.getElementById('subInterval').value;
    if (interval === 'custom') interval = document.getElementById('subCustomInterval').value;
    if (!url) return;

    let sub;
    if (id) {
        sub = globalSettings.subscriptions.find(s => s.id === id);
        if (sub) { sub.name = name; sub.url = url; sub.interval = interval; }
    } else {
        function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
        sub = { id: `sub-${Date.now()}`, name, url, interval, lastUpdated: 0 };
        globalSettings.subscriptions.push(sub);
    }
    closeSubEditModal();
    await updateSubscriptionNodes(sub);
    currentProxyGroup = sub.id;
    renderGroupTabs();
    await window.electronAPI.saveSettings(globalSettings);
}

async function deleteSubscription() {
    const id = document.getElementById('subId').value;
    if (!id) return;
    showConfirm(t('confirmDelSub'), async () => {
        globalSettings.subscriptions = globalSettings.subscriptions.filter(s => s.id !== id);
        globalSettings.preProxies = globalSettings.preProxies.filter(p => p.groupId !== id);
        currentProxyGroup = 'manual';
        closeSubEditModal(); renderGroupTabs(); await window.electronAPI.saveSettings(globalSettings);
    });
}

async function updateSubscriptionNodes(sub) {
    try {
        const fetched = await window.electronAPI.invoke('fetch-url-conditional', { url: sub.url, etag: sub.etag, lastModified: sub.lastModified });
        if (fetched && fetched.notModified) {
            sub.lastUpdated = Date.now();
            showToast(`${t('msgSubUpdated')} ${sub.name} (Not Modified)`, 2000);
            return;
        }
        if (!fetched || fetched.error) throw new Error((fetched && fetched.error) ? fetched.error : 'Fetch failed');
        sub.etag = fetched.etag || sub.etag;
        sub.lastModified = fetched.lastModified || sub.lastModified;

        // Snapshot previous node list for rollback (keep last N snapshots)
        try {
            if (!sub.snapshots) sub.snapshots = [];
            const prevNodes = (globalSettings.preProxies || []).filter(p => p && p.groupId === sub.id).map(p => ({
                id: p.id,
                remark: p.remark,
                url: p.url,
                enable: p.enable,
                groupId: p.groupId,
                latency: p.latency,
                lastTestMsg: p.lastTestMsg,
                lastTestCore: p.lastTestCore,
                lastTestCoreSwitched: p.lastTestCoreSwitched,
                ipInfo: p.ipInfo,
                lastIpAt: p.lastIpAt
            }));
            sub.snapshots.unshift({
                at: Date.now(),
                etag: sub.etag || null,
                lastModified: sub.lastModified || null,
                count: prevNodes.length,
                nodes: prevNodes
            });
            if (sub.snapshots.length > 5) sub.snapshots = sub.snapshots.slice(0, 5);
        } catch (e) { }

        const result = await window.electronAPI.invoke('parse-subscription', { content: fetched.content, hintType: sub.defaultScheme || 'auto' });
        if (!result || (result.errors && result.errors.length > 0 && (!result.nodes || result.nodes.length === 0))) {
            const e = formatResultError(result, 'Parse failed');
            const msg = (e.code ? `[${e.code}] ` : '') + e.message;
            throw new Error(msg);
        }

        // Replace nodes for this group using stable node.id (dedupe inside same subscription)
        const existing = new Map();
        (globalSettings.preProxies || []).forEach(p => {
            if (p && p.groupId === sub.id && p.id) existing.set(p.id, p);
        });
        globalSettings.preProxies = (globalSettings.preProxies || []).filter(p => p.groupId !== sub.id);

        const seen = new Set();
        let count = 0;
        (result.nodes || []).forEach((node, idx) => {
            const link = node.raw || node.url || '';
            if (!link || !link.includes('://')) return;
            const stableId = node.id || null;
            if (stableId && seen.has(stableId)) return;
            if (stableId) seen.add(stableId);

            const old = stableId ? existing.get(stableId) : null;
            const remark = node.name || getProxyRemark(link) || `Node ${idx + 1}`;
            const enable = old ? (old.enable !== false) : true;
            const latency = old && typeof old.latency === 'number' ? old.latency : -1;
            const lastTestMsg = old ? (old.lastTestMsg || '') : '';
            const lastTestCore = old ? (old.lastTestCore || '') : '';
            const lastTestCoreSwitched = old ? !!old.lastTestCoreSwitched : false;
            const ipInfo = old ? (old.ipInfo || null) : null;
            const lastIpAt = old ? (old.lastIpAt || 0) : 0;

            // Fall back to random uuid if parser didn't provide stable id
            function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
            const id = stableId || uuidv4();

            globalSettings.preProxies.push({
                id,
                remark,
                url: link,
                enable,
                groupId: sub.id,
                latency,
                lastTestMsg,
                lastTestCore,
                lastTestCoreSwitched,
                ipInfo,
                lastIpAt
            });
            count++;
        });

        sub.lastUpdated = Date.now();
        sub.lastImportAt = Date.now();
        sub.lastImportOk = true;
        sub.lastImportCount = count;
        showToast(`${t('msgSubUpdated')} ${sub.name} (${count} ${t('msgNodes')})`, 2200);
    } catch (e) {
        sub.lastImportAt = Date.now();
        sub.lastImportOk = false;
        const err = formatIpcError(e);
        showAlert(`${t('msgUpdateFailed')}${err.code ? ` [${err.code}]` : ''} ${err.message}`);
    }
}

async function rollbackSubscriptionNodes(subId) {
    const sub = (globalSettings.subscriptions || []).find(s => s.id === subId);
    if (!sub || !sub.snapshots || sub.snapshots.length === 0) {
        return showAlert('No snapshot to rollback');
    }
    const snap = sub.snapshots[0];
    showConfirm(`Rollback ${sub.name} to snapshot (${new Date(snap.at).toLocaleString()})?`, async () => {
        globalSettings.preProxies = (globalSettings.preProxies || []).filter(p => p.groupId !== sub.id);
        (snap.nodes || []).forEach(n => globalSettings.preProxies.push({ ...n }));
        sub.lastUpdated = Date.now();
        await window.electronAPI.saveSettings(globalSettings);
        renderProxyNodes();
        showAlert(`Rolled back: ${sub.name} (${snap.count || 0} nodes)`);
    });
}

async function testSingleProxy(id, btnEl = null) {
    const p = globalSettings.preProxies.find(x => x.id === id);
    if (!p) return;
    const btn = (btnEl instanceof HTMLButtonElement)
        ? btnEl
        : Array.from(document.querySelectorAll('#preProxyList button[data-action="proxy-test"]')).find(el => el.getAttribute('data-proxy-id') === id);
    if (btn) btn.innerText = "...";
    try {
        const res = await window.electronAPI.invoke('test-proxy-node', p.url);
        p.latency = res && res.ok ? (res.connectivity && typeof res.connectivity.latencyMs === 'number' ? res.connectivity.latencyMs : p.latency) : -1;
        p.lastTestAt = Date.now();
        p.lastTestOk = Boolean(res && res.ok);
        p.lastTestCode = res && res.code ? res.code : '';
        p.lastTestMsg = res && (res.error || (res.connectivity && res.connectivity.error)) ? String(res.error || res.connectivity.error) : '';
        p.ipInfo = res && res.geo ? res.geo : (res && res.ip ? { ip: res.ip } : null);
        p.lastIpAt = (res && (res.geo || res.ip)) ? Date.now() : (p.lastIpAt || 0);
        await window.electronAPI.saveSettings(globalSettings);
        renderProxyNodes();
    } catch (e) {
        p.lastTestAt = Date.now();
        p.lastTestOk = false;
        const err = formatIpcError(e);
        p.lastTestCode = err.code ? String(err.code) : '';
        p.lastTestMsg = err.message;
        await window.electronAPI.saveSettings(globalSettings);
        renderProxyNodes();
    }
}

async function testCurrentGroup() {
    const list = (globalSettings.preProxies || []).filter(p => {
        if (currentProxyGroup === 'manual') return !p.groupId || p.groupId === 'manual';
        return p.groupId === currentProxyGroup;
    });
    if (list.length === 0) return;

    // 先将所有测试按钮设置为加载状态
    list.forEach(p => {
        const btn = Array.from(document.querySelectorAll('#preProxyList button[data-action="proxy-test"]')).find(el => el.getAttribute('data-proxy-id') === p.id);
        if (btn) btn.innerText = "...";
    });

    const promises = list.map(async (p) => {
        try {
            const res = await window.electronAPI.invoke('test-proxy-node', p.url);
            p.latency = res && res.ok ? (res.connectivity && typeof res.connectivity.latencyMs === 'number' ? res.connectivity.latencyMs : p.latency) : -1;
            p.lastTestAt = Date.now();
            p.lastTestOk = Boolean(res && res.ok);
            p.lastTestCode = res && res.code ? res.code : '';
            p.lastTestMsg = res && (res.error || (res.connectivity && res.connectivity.error)) ? String(res.error || res.connectivity.error) : '';
            p.ipInfo = res && res.geo ? res.geo : (res && res.ip ? { ip: res.ip } : null);
            p.lastIpAt = (res && (res.geo || res.ip)) ? Date.now() : (p.lastIpAt || 0);
            return p;
        } catch (e) {
            p.latency = -1;
            p.lastTestAt = Date.now();
            p.lastTestOk = false;
            const err = formatIpcError(e);
            p.lastTestCode = err.code ? String(err.code) : '';
            p.lastTestMsg = err.message;
            return p;
        }
    });
    await Promise.all(promises);
    await window.electronAPI.saveSettings(globalSettings);
    if (globalSettings.mode === 'single') {
        let best = null, min = 99999;
        list.forEach(p => { if (p.latency > 0 && p.latency < min) { min = p.latency; best = p; } });
        if (best) {
            globalSettings.selectedId = best.id;
            if (document.getElementById('notifySwitch').checked) new Notification('GeekEZ', { body: `Auto-Switched: ${best.remark}` });
        }
    }
    renderProxyNodes();
}

function delP(id) { globalSettings.preProxies = globalSettings.preProxies.filter(p => p.id !== id); renderProxyNodes(); }
function selP(id) { globalSettings.selectedId = id; renderProxyNodes(); }
function togP(id) { const p = globalSettings.preProxies.find(x => x.id === id); if (p) p.enable = !p.enable; }

async function saveProxySettings() {
    globalSettings.mode = document.getElementById('proxyMode').value;
    globalSettings.notify = document.getElementById('notifySwitch').checked;
    await window.electronAPI.saveSettings(globalSettings);
    closeProxyManager(); updateToolbar();
}

function updateToolbar() {
    const enable = document.getElementById('enablePreProxy').checked;
    globalSettings.enablePreProxy = enable;
    window.electronAPI.saveSettings(globalSettings);
    const d = document.getElementById('currentProxyDisplay');
    if (!enable) { d.innerText = "OFF"; d.style.color = "var(--text-secondary)"; d.style.border = "1px solid var(--border)"; return; }
    d.style.color = "var(--accent)"; d.style.border = "1px solid var(--accent)";
    let count = 0;
    if (globalSettings.mode === 'single') count = globalSettings.selectedId ? 1 : 0;
    else count = (globalSettings.preProxies || []).filter(p => p.enable !== false).length;
    let modeText = "";
    if (globalSettings.mode === 'single') modeText = t('modeSingle');
    else if (globalSettings.mode === 'balance') modeText = t('modeBalance');
    else modeText = t('modeFailover');
    d.innerText = `${modeText} [${count}]`;
}

// Export Logic (重构版)
let exportType = '';
let selectedProfileIds = [];
let passwordCallback = null;
let isImportMode = false;

function openExportModal() { document.getElementById('exportModal').style.display = 'flex'; }
function closeExportModal() { document.getElementById('exportModal').style.display = 'none'; }

async function openExportSelectModal(type) {
    exportType = type;
    closeExportModal();

    // 如果是仅导出代理，不需要选择环境
    if (type === 'proxies') {
        try {
            const result = await window.electronAPI.invoke('export-selected-data', { type: 'proxies', profileIds: [] });
            if (result.success) showAlert(t('msgExportSuccess'));
            else if (!result.cancelled) showAlert(result.error || t('msgNoData'));
        } catch (e) {
            const err = formatIpcError(e);
            showAlert((t('msgExportFailed') || 'Export Failed') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
        }
        return;
    }

    // 获取环境列表
    const profiles = await window.electronAPI.invoke('get-export-profiles');

    if (profiles.length === 0) {
        showAlert(t('expNoProfiles'));
        return;
    }

    // 渲染选择器
    renderExportProfileList(profiles);

    // 默认全选
    selectedProfileIds = profiles.map(p => p.id);
    document.getElementById('exportSelectAll').checked = true;
    updateExportSelectedCount(profiles.length);

    // 更新标题（使用 i18n）
    const titleSpan = document.querySelector('#exportSelectTitle span[data-i18n]');
    const iconSpan = document.querySelector('#exportSelectTitle span:first-child');
    if (type === 'full-backup') {
        if (titleSpan) titleSpan.innerText = t('expSelectTitleFull');
        if (iconSpan) iconSpan.innerText = '🔐';
    } else {
        if (titleSpan) titleSpan.innerText = t('expSelectTitle');
        if (iconSpan) iconSpan.innerText = '📦';
    }

    document.getElementById('exportSelectModal').style.display = 'flex';
}

function closeExportSelectModal() {
    document.getElementById('exportSelectModal').style.display = 'none';
    selectedProfileIds = [];
}

function renderExportProfileList(profiles) {
    const container = document.getElementById('exportProfileList');
    if (!container) return;
    container.textContent = '';
    if (!profiles || profiles.length === 0) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'padding: 30px; text-align: center; color: var(--text-secondary);';

        const icon = document.createElement('div');
        icon.style.cssText = 'font-size: 24px; margin-bottom: 8px;';
        icon.textContent = '📭';

        const text = document.createElement('div');
        text.textContent = t('expNoProfiles');

        wrap.append(icon, text);
        container.append(wrap);
        return;
    }

    const frag = document.createDocumentFragment();
    for (const p of profiles) {
        const id = p && p.id ? String(p.id) : '';
        const name = p && p.name ? String(p.name) : '';
        const tags = Array.isArray(p && p.tags) ? p.tags : [];

        const label = document.createElement('label');
        label.style.cssText = "display: flex; align-items: center; padding: 10px 12px; margin: 4px 0; background: rgba(255,255,255,0.03); border: 1px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;";
        label.addEventListener('mouseenter', () => {
            label.style.background = 'rgba(0,255,255,0.05)';
            label.style.borderColor = 'var(--accent)';
        });
        label.addEventListener('mouseleave', () => {
            label.style.background = 'rgba(255,255,255,0.03)';
            label.style.borderColor = 'transparent';
        });

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `export-${id}`;
        input.checked = true;
        input.style.cssText = 'width: 18px; height: 18px; margin-right: 12px; cursor: pointer; accent-color: var(--accent); flex-shrink: 0;';
        input.addEventListener('change', () => {
            handleExportCheckboxChange(id, input.checked);
        });

        const nameWrap = document.createElement('div');
        nameWrap.style.cssText = 'flex: 1; min-width: 0;';

        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        nameEl.textContent = name || t('expNoProfiles');
        nameWrap.append(nameEl);

        const tagsWrap = document.createElement('div');
        tagsWrap.style.cssText = 'display: flex; align-items: center; flex-shrink: 0;';
        for (const tagRaw of tags) {
            const tag = String(tagRaw);
            const c = stringToColor(tag);
            const span = document.createElement('span');
            span.style.cssText = `font-size: 9px; padding: 2px 6px; background: ${c}22; color: ${c}; border-radius: 4px; margin-left: 6px; font-weight: 500;`;
            span.textContent = tag;
            tagsWrap.append(span);
        }

        label.append(input, nameWrap, tagsWrap);
        frag.append(label);
    }
    container.append(frag);
}

// 处理单个 checkbox 变化
function handleExportCheckboxChange(id, checked) {
    if (checked) {
        if (!selectedProfileIds.includes(id)) selectedProfileIds.push(id);
    } else {
        selectedProfileIds = selectedProfileIds.filter(pid => pid !== id);
    }

    // 更新全选状态
    const allCheckboxes = document.querySelectorAll('#exportProfileList input[type="checkbox"]');
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    document.getElementById('exportSelectAll').checked = allChecked;

    updateExportSelectedCount(allCheckboxes.length);
}

function toggleExportProfile(id) {
    const checkbox = document.getElementById(`export-${id}`);
    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
        if (!selectedProfileIds.includes(id)) selectedProfileIds.push(id);
    } else {
        selectedProfileIds = selectedProfileIds.filter(pid => pid !== id);
    }

    // 更新全选状态
    const allCheckboxes = document.querySelectorAll('#exportProfileList input[type="checkbox"]');
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    document.getElementById('exportSelectAll').checked = allChecked;

    updateExportSelectedCount(allCheckboxes.length);
}

function toggleExportSelectAll() {
    const selectAll = document.getElementById('exportSelectAll').checked;
    const checkboxes = document.querySelectorAll('#exportProfileList input[type="checkbox"]');

    checkboxes.forEach(cb => {
        cb.checked = selectAll;
        const id = cb.id.replace('export-', '');
        if (selectAll) {
            if (!selectedProfileIds.includes(id)) selectedProfileIds.push(id);
        }
    });

    if (!selectAll) selectedProfileIds = [];

    updateExportSelectedCount(checkboxes.length);
}

function updateExportSelectedCount(total) {
    document.getElementById('exportSelectedCount').innerText = `${selectedProfileIds.length}/${total}`;
}

async function confirmExport() {
    if (selectedProfileIds.length === 0) {
        showAlert('请至少选择一个环境');
        return;
    }

    // 保存选中的 ID（因为 closeExportSelectModal 会清空）
    const idsToExport = [...selectedProfileIds];
    const typeToExport = exportType;

    closeExportSelectModal();

    if (typeToExport === 'full-backup') {
        // 保存到全局变量供密码提交后使用
        selectedProfileIds = idsToExport;
        isImportMode = false;
        openPasswordModal('设置备份密码', true);
    } else {
        // 直接导出
        try {
            const result = await window.electronAPI.invoke('export-selected-data', {
                type: typeToExport,
                profileIds: idsToExport
            });
            if (result.success) {
                showAlert(`导出成功！共 ${result.count} 个环境`);
            } else if (!result.cancelled) {
                showAlert(result.error || t('msgNoData'));
            }
        } catch (e) {
            showAlert("Export Failed: " + e.message);
        }
    }
}

// 密码模态框
function openPasswordModal(title, showConfirm) {
    document.getElementById('passwordModalTitle').innerText = title;
    document.getElementById('backupPassword').value = '';
    document.getElementById('backupPasswordConfirm').value = '';

    // 导入时不需要确认密码
    const confirmLabel = document.getElementById('confirmPasswordLabel');
    const confirmInput = document.getElementById('backupPasswordConfirm');
    if (showConfirm) {
        confirmLabel.style.display = 'block';
        confirmInput.style.display = 'block';
    } else {
        confirmLabel.style.display = 'none';
        confirmInput.style.display = 'none';
    }

    document.getElementById('passwordModal').style.display = 'flex';
    document.getElementById('backupPassword').focus();
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    passwordCallback = null;
}

async function submitPassword() {
    const password = document.getElementById('backupPassword').value;
    const confirmPassword = document.getElementById('backupPasswordConfirm').value;

    if (!password) {
        showAlert('请输入密码');
        return;
    }

    if (!isImportMode && password !== confirmPassword) {
        showAlert('两次输入的密码不一致');
        return;
    }

    if (password.length < 4) {
        showAlert('密码长度至少 4 位');
        return;
    }

    closePasswordModal();

    if (isImportMode) {
        // 导入完整备份
        try {
            const result = await window.electronAPI.invoke('import-full-backup', { password });
            if (result.success) {
                showAlert(`导入成功！共 ${result.count} 个环境`);
                loadProfiles();
                globalSettings = await window.electronAPI.getSettings();
                renderGroupTabs();
                updateToolbar();
            } else if (!result.cancelled) {
                showAlert(result.error || '导入失败');
            }
        } catch (e) {
            showAlert("Import Failed: " + e.message);
        }
    } else {
        // 导出完整备份
        try {
            const result = await window.electronAPI.invoke('export-full-backup', {
                profileIds: selectedProfileIds,
                password
            });
            if (result.success) {
                showAlert(`完整备份成功！共 ${result.count} 个环境`);
            } else if (!result.cancelled) {
                showAlert(result.error || '备份失败');
            }
        } catch (e) {
            showAlert("Backup Failed: " + e.message);
        }
    }
}

// Import Logic
async function importData() {
    try {
        const result = await window.electronAPI.invoke('import-data');
        if (result) {
            globalSettings = await window.electronAPI.getSettings();
            if (!globalSettings.preProxies) globalSettings.preProxies = [];
            if (!globalSettings.subscriptions) globalSettings.subscriptions = [];
            loadProfiles(); renderGroupTabs(); updateToolbar();
            showAlert(t('msgImportSuccess'));
        }
    } catch (e) { showAlert("Import Failed: " + e.message); }
}

// 导入完整备份（.geekez 文件）
async function importFullBackup() {
    isImportMode = true;
    openPasswordModal('输入备份密码', false);
}

// Import Menu Toggle
function toggleImportMenu() {
    const menu = document.getElementById('importMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeImportMenu() {
    document.getElementById('importMenu').style.display = 'none';
}

// 点击其他地方关闭菜单
document.addEventListener('click', (e) => {
    const menu = document.getElementById('importMenu');
    const btn = document.getElementById('importBtn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function openImportSub() { showInput(t('importSubTitle'), importSubscription); }
async function importSubscription(url) {
    if (!url) return;
    try {
        const content = await window.electronAPI.invoke('fetch-url', url);
        if (!content) return showAlert(t('subErr'));

        // Use unified subscription parser (supports raw/base64/v2rayN + clash YAML + sing-box JSON)
        const result = await window.electronAPI.invoke('parse-subscription', { content });
        if (!result || (result.errors && result.errors.length > 0 && (!result.nodes || result.nodes.length === 0))) {
            const e = formatResultError(result, t('subErr') || '订阅解析失败');
            return showAlert((t('subErr') || '订阅解析失败') + (e.code ? ` [${e.code}]` : '') + ': ' + e.message);
        }

        let count = 0;
        if (!globalSettings.preProxies) globalSettings.preProxies = [];
        const groupId = `group-${Date.now()}`;
        const groupName = `Sub ${new Date().toLocaleTimeString()}`;
        (result.nodes || []).forEach((node, idx) => {
            const link = node.raw || node.url || '';
            if (!link || !link.includes('://')) return;
            const remark = node.name || getProxyRemark(link) || `Node ${idx + 1}`;
            function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
            globalSettings.preProxies.push({
                id: uuidv4(), remark, url: link, enable: true, groupId, groupName
            });
            count++;
        });
        renderProxyNodes(); await window.electronAPI.saveSettings(globalSettings);
        showAlert(`${t('msgImported')} ${count} ${t('msgNodes')}`);
    } catch (e) {
        const err = formatIpcError(e);
        showAlert((t('subErr') || '订阅解析失败') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
    }
}

function switchHelpTab(tabName) {
    document.querySelectorAll('#helpModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    const idx = tabName === 'manual' ? 0 : 1;
    const tabs = document.querySelectorAll('#helpModal .tab-btn');
    if (tabs[idx]) tabs[idx].classList.add('active');
    document.querySelectorAll('.help-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`help-${tabName}`).classList.add('active');
}
// ============================================================================
// Settings Modal Functions
// ============================================================================
function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
    loadUserExtensions();
    loadWatermarkStyle();
    loadSystemProxySetting();
    loadRemoteDebuggingSetting();
    loadCustomArgsSetting();
    loadApiServerSetting();
    loadDataPathSetting();
    loadDefaultProxyConsistency();
}
function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

async function loadDefaultProxyConsistency() {
    try {
        const settings = await window.electronAPI.getSettings();
        const mode = settings.defaultProxyConsistency || 'warn';
        const el = document.getElementById('defaultProxyConsistency');
        if (el) el.value = mode;
    } catch (e) {
        console.error('Failed to load default proxy consistency:', e);
    }
}

async function saveDefaultProxyConsistency(mode) {
    try {
        const settings = await window.electronAPI.getSettings();
        settings.defaultProxyConsistency = mode || 'warn';
        await window.electronAPI.saveSettings(settings);
        showToast((t('saved') || 'Saved') + `: ${mode}`, 1400);
    } catch (e) {
        showAlert('Error: ' + e.message);
    }
}

// Watermark Style Functions
function loadWatermarkStyle() {
    const style = localStorage.getItem('geekez_watermark_style') || 'enhanced';
    const radios = document.getElementsByName('watermarkStyle');
    radios.forEach(radio => {
        if (radio.value === style) {
            radio.checked = true;
            radio.parentElement.style.borderColor = 'var(--accent)';
        } else {
            radio.parentElement.style.borderColor = 'var(--border)';
        }
    });
}

function saveWatermarkStyle(style) {
    localStorage.setItem('geekez_watermark_style', style);
    const radios = document.getElementsByName('watermarkStyle');
    radios.forEach(radio => {
        if (radio.checked) {
            radio.parentElement.style.borderColor = 'var(--accent)';
        } else {
            radio.parentElement.style.borderColor = 'var(--border)';
        }
    });
    showAlert('水印样式已保存，重启环境后生效');
}

// --- 自定义数据目录 ---
async function loadDataPathSetting() {
    try {
        const info = await window.electronAPI.invoke('get-data-path-info');
        document.getElementById('currentDataPath').textContent = info.currentPath;
        document.getElementById('resetDataPathBtn').style.display = info.isCustom ? 'inline-block' : 'none';
    } catch (e) {
        console.error('Failed to load data path:', e);
    }
}

async function selectDataDirectory() {
    const newPath = await window.electronAPI.invoke('select-data-directory');
    if (!newPath) return;

    // 确认迁移
    const migrate = confirm(t('dataPathConfirmMigrate') || '是否将现有数据迁移到新目录？\n\n选择"确定"迁移数据\n选择"取消"仅更改路径（不迁移）');

    showAlert(t('dataPathMigrating') || '正在迁移数据，请稍候...');

    const result = await window.electronAPI.invoke('set-data-directory', { newPath, migrate });

    if (result.success) {
        document.getElementById('currentDataPath').textContent = newPath;
        document.getElementById('resetDataPathBtn').style.display = 'inline-block';
        document.getElementById('dataPathWarning').style.display = 'block';
        showAlert(t('dataPathSuccess') || '数据目录已更改，请重启应用');
    } else {
        showAlert((t('dataPathError') || '更改失败: ') + result.error);
    }
}

async function resetDataDirectory() {
    if (!confirm(t('dataPathConfirmReset') || '确定要恢复默认数据目录吗？\n\n注意：这不会迁移数据，您需要手动处理自定义目录中的数据。')) {
        return;
    }

    const result = await window.electronAPI.invoke('reset-data-directory');

    if (result.success) {
        const info = await window.electronAPI.invoke('get-data-path-info');
        document.getElementById('currentDataPath').textContent = info.defaultPath;
        document.getElementById('resetDataPathBtn').style.display = 'none';
        document.getElementById('dataPathWarning').style.display = 'block';
        showAlert(t('dataPathResetSuccess') || '已恢复默认目录，请重启应用');
    } else {
        showAlert((t('dataPathError') || '操作失败: ') + result.error);
    }
}

async function saveRemoteDebuggingSetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableRemoteDebugging = enabled;
    await window.electronAPI.saveSettings(settings);
    showAlert(enabled ? '远程调试已启用，编辑环境时可设置端口' : '远程调试已禁用');
}

// Unified toggle handler for developer features
function handleDevToggle(checkbox) {
    const toggleSwitch = checkbox.closest('.toggle-switch');
    const track = toggleSwitch?.querySelector('.toggle-track');
    const knob = toggleSwitch?.querySelector('.toggle-knob');

    // Animate toggle - update track color and knob position
    if (track) {
        track.style.background = checkbox.checked ? 'var(--accent)' : 'var(--border)';
    }
    if (knob) {
        knob.style.left = checkbox.checked ? '22px' : '2px';
    }

    // Call appropriate save function based on checkbox id
    if (checkbox.id === 'enableSystemProxy') {
        saveSystemProxySetting(checkbox.checked);
    } else if (checkbox.id === 'enableRemoteDebugging') {
        saveRemoteDebuggingSetting(checkbox.checked);
    } else if (checkbox.id === 'enableCustomArgs') {
        saveCustomArgsSetting(checkbox.checked);
    } else if (checkbox.id === 'enableApiServer') {
        saveApiServerSetting(checkbox.checked);
    }
}

// Update toggle visual state (for loading saved state)
function updateToggleVisual(checkbox) {
    const toggleSwitch = checkbox.closest('.toggle-switch');
    const track = toggleSwitch?.querySelector('.toggle-track');
    const knob = toggleSwitch?.querySelector('.toggle-knob');

    if (track) {
        track.style.background = checkbox.checked ? 'var(--accent)' : 'var(--border)';
    }
    if (knob) {
        knob.style.left = checkbox.checked ? '22px' : '2px';
    }
}

async function loadRemoteDebuggingSetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableRemoteDebugging');
    if (checkbox) {
        checkbox.checked = settings.enableRemoteDebugging || false;
        updateToggleVisual(checkbox);
    }
}

// System Proxy (Windows)
async function saveSystemProxySetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableSystemProxy = enabled;
    await window.electronAPI.saveSettings(settings);

    // Apply immediately when possible (needs a running profile with a local proxy port).
    try {
        if (!enabled) {
            const res = await window.electronAPI.setSystemProxyMode(false, null);
            if (res && res.success) showToast(t('systemProxyDisabled') || 'System proxy disabled');
            else showToast((t('systemProxyError') || 'System proxy error: ') + (res?.error || 'unknown'));
            return;
        }

        const profiles = await window.electronAPI.getProfiles();
        const running = await window.electronAPI.getRunningIds();
        const runningId = Array.isArray(running) && running.length > 0 ? running[0] : null;
        const p = runningId ? profiles.find(x => x.id === runningId) : null;
        const port = p && p.localPort ? p.localPort : null;
        if (!runningId || !port) {
            showToast(t('systemProxyNoRunning') || 'No running profile found (will apply on launch)');
            return;
        }

        const endpoint = `127.0.0.1:${port}`;
        const res = await window.electronAPI.setSystemProxyMode(true, endpoint);
        if (res && res.success) showToast(t('systemProxyEnabled') || 'System proxy enabled');
        else showToast((t('systemProxyError') || 'System proxy error: ') + (res?.error || 'unknown'));
    } catch (e) {
        showToast((t('systemProxyError') || 'System proxy error: ') + e.message);
    }
}

async function loadSystemProxySetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableSystemProxy');
    if (!checkbox) return;
    checkbox.checked = settings.enableSystemProxy || false;
    updateToggleVisual(checkbox);
}

// Custom Args Settings
async function saveCustomArgsSetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableCustomArgs = enabled;
    await window.electronAPI.saveSettings(settings);
    showAlert(enabled ? t('customArgsEnabled') || '自定义启动参数已启用' : t('customArgsDisabled') || '自定义启动参数已禁用');
}

async function loadCustomArgsSetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableCustomArgs');
    if (checkbox) {
        checkbox.checked = settings.enableCustomArgs || false;
        updateToggleVisual(checkbox);
    }
}

// API Server Settings
async function saveApiServerSetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableApiServer = enabled;
    await window.electronAPI.saveSettings(settings);

    // Show/hide port section
    document.getElementById('apiPortSection').style.display = enabled ? 'block' : 'none';

    if (enabled) {
        // Start API server
        const port = settings.apiPort || 12138;
        const result = await window.electronAPI.invoke('start-api-server', { port });
        if (result.success) {
            document.getElementById('apiStatus').style.display = 'inline-block';
            const tokenEl = document.getElementById('apiTokenInput');
            if (tokenEl) tokenEl.value = result.token || settings.apiToken || '';
            const tokenLine = result.token ? `\nX-GeekEZ-API-Token: ${result.token}` : '';
            showAlert(`${t('apiStarted') || 'API 服务已启动'}: http://localhost:${port}${tokenLine}`);
        } else {
            showAlert((t('apiError') || 'API 启动失败: ') + result.error);
        }
    } else {
        // Stop API server
        await window.electronAPI.invoke('stop-api-server');
        document.getElementById('apiStatus').style.display = 'none';
        const tokenEl = document.getElementById('apiTokenInput');
        if (tokenEl) tokenEl.value = '';
        showAlert(t('apiStopped') || 'API 服务已停止');
    }
}

async function saveApiPort() {
    const port = parseInt(document.getElementById('apiPortInput').value) || 12138;
    if (port < 1024 || port > 65535) {
        showAlert(t('apiPortInvalid') || '端口号必须在 1024-65535 之间');
        return;
    }

    const settings = await window.electronAPI.getSettings();
    settings.apiPort = port;
    await window.electronAPI.saveSettings(settings);
    document.getElementById('apiPortDisplay').textContent = port;

    // Restart API server if enabled
    if (settings.enableApiServer) {
        await window.electronAPI.invoke('stop-api-server');
        const result = await window.electronAPI.invoke('start-api-server', { port });
        if (result.success) {
            const tokenEl = document.getElementById('apiTokenInput');
            if (tokenEl) tokenEl.value = result.token || settings.apiToken || '';
            const tokenLine = result.token ? `\nX-GeekEZ-API-Token: ${result.token}` : '';
            showAlert(`${t('apiRestarted') || 'API 服务已重启'}: http://localhost:${port}${tokenLine}`);
        }
    } else {
        showAlert(t('apiPortSaved') || 'API 端口已保存');
    }
}

async function loadApiServerSetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableApiServer');
    const portInput = document.getElementById('apiPortInput');
    const portDisplay = document.getElementById('apiPortDisplay');
    const portSection = document.getElementById('apiPortSection');
    const apiStatus = document.getElementById('apiStatus');

    if (checkbox) {
        checkbox.checked = settings.enableApiServer || false;
        updateToggleVisual(checkbox);
    }
    if (portInput) {
        portInput.value = settings.apiPort || 12138;
    }
    if (portDisplay) {
        portDisplay.textContent = settings.apiPort || 12138;
    }
    if (portSection) {
        portSection.style.display = settings.enableApiServer ? 'block' : 'none';
    }
    const tokenEl = document.getElementById('apiTokenInput');
    if (tokenEl) tokenEl.value = settings.apiToken || '';

    // Check if API is running
    try {
        const status = await window.electronAPI.invoke('get-api-status');
        if (apiStatus) {
            apiStatus.style.display = status.running ? 'inline-block' : 'none';
        }
    } catch (e) { }
}

function openApiDocs() {
    window.electronAPI.invoke('open-url', 'https://browser.geekez.net/docs.html#doc-api');
}

async function copyApiToken() {
    const el = document.getElementById('apiTokenInput');
    const token = el ? String(el.value || '') : '';
    if (!token) return;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(token);
        } else {
            const ta = document.createElement('textarea');
            ta.value = token;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        showToast(t('apiTokenCopied') || 'Copied', 1400);
    } catch (e) {
        showAlert((e && e.message) ? e.message : String(e));
    }
}

function switchSettingsTab(tabName, clickedEl) {
    // Update tab buttons
    document.querySelectorAll('#settingsModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const target = clickedEl || (typeof event !== 'undefined' ? event.target : null);
    if (target && target.classList) target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.settings-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('settings-' + tabName).style.display = 'block';
}
// ============================================================================
// Extension Management Functions
// ============================================================================
async function selectExtensionFolder() {
    const path = await window.electronAPI.invoke('select-extension-folder');
    if (path) {
        await window.electronAPI.invoke('add-user-extension', path);
        await loadUserExtensions();
        showAlert(t('settingsExtAdded'));
    }
}
async function loadUserExtensions() {
    const exts = await window.electronAPI.invoke('get-user-extensions');
    const list = document.getElementById('userExtensionList');
    if (!list) return;

    if (exts.length === 0) {
        list.textContent = '';
        const empty = document.createElement('div');
        empty.style.cssText = 'opacity:0.5; text-align:center; padding:20px;';
        empty.textContent = t('settingsExtNoExt') || '';
        list.appendChild(empty);
        return;
    }

    list.textContent = '';
    exts.forEach((ext) => {
        const extPath = String(ext ?? '');
        const name = extPath.split(/[\\/]/).pop() || extPath;

        const item = document.createElement('div');
        item.className = 'ext-item';

        const left = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = 'bold';
        nameEl.textContent = name;
        const pathEl = document.createElement('div');
        pathEl.style.fontSize = '11px';
        pathEl.style.opacity = '0.6';
        pathEl.textContent = extPath;
        left.appendChild(nameEl);
        left.appendChild(pathEl);

        const btn = document.createElement('button');
        btn.className = 'danger outline';
        btn.style.padding = '4px 12px';
        btn.style.fontSize = '11px';
        btn.textContent = t('settingsExtRemove');
        btn.onclick = async () => { await removeUserExtension(extPath); };

        item.appendChild(left);
        item.appendChild(btn);
        list.appendChild(item);
    });
}
async function removeUserExtension(path) {
    await window.electronAPI.invoke('remove-user-extension', path);
    await loadUserExtensions();
    showAlert(t('settingsExtRemoved'));
}
function openHelp() { switchHelpTab('manual'); document.getElementById('helpModal').style.display = 'flex'; } // flex
function closeHelp() { document.getElementById('helpModal').style.display = 'none'; }


// Custom timezone dropdown initialization
function initCustomTimezoneDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown || !window.TIMEZONES) return;

    let selectedIndex = -1;

    // Populate dropdown with all timezones
    function populateDropdown(filter = '') {
        const filtered = window.TIMEZONES.filter(tz =>
            tz.toLowerCase().includes(filter.toLowerCase())
        );

        dropdown.textContent = '';
        filtered.forEach((tz, index) => {
            const el = document.createElement('div');
            el.className = 'timezone-item';
            el.dataset.value = tz;
            el.dataset.index = String(index);
            el.textContent = tz;
            dropdown.appendChild(el);
        });

        selectedIndex = -1;
    }



    // Hide dropdown
    function hideDropdown() {
        dropdown.classList.remove('active');
        selectedIndex = -1;
    }

    // Select item
    function selectItem(value) {
        input.value = value;
        hideDropdown();
    }

    // Input focus - show dropdown (Show ALL options, ignore current value filter)
    input.addEventListener('focus', () => {
        populateDropdown('');
        dropdown.classList.add('active');
    });

    // Input typing - filter
    input.addEventListener('input', () => {
        populateDropdown(input.value);
        if (!dropdown.classList.contains('active')) {
            dropdown.classList.add('active');
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.timezone-item:not(.hidden)');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(items[selectedIndex].dataset.value);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    // Update selection highlight
    function updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
        if (items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Click on item
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.timezone-item');
        if (item) {
            selectItem(item.dataset.value);
        }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}
init();

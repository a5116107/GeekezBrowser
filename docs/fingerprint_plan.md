# 指纹补齐规划方案（自用企业级 / 内核靠拢）

适用项目：GeekEZ Browser（Electron + Puppeteer + Xray-core）

目标：在不做团队/商业/云同步的前提下，把“指纹能力”补齐到 AdsPower / GoLogin / Multilogin 的常见基线，并尽量从 **CDP（Chromium 官方通道）** 与 **启动层** 靠拢，减少纯 JS hook 的可检测痕迹，提升稳定性与可复现性。

本文输出的是 **可执行的规划**：数据模型、模板体系、P0/P1 任务包、落点文件、验收与回归方法。

---

## 0. 现状快照（基于仓库可见实现）

### 0.1 指纹数据结构（当前）

`fingerprint.js#generateFingerprint()` 当前返回字段：

- `platform`（Win32/MacIntel/Linux x86_64）
- `screen`/`window`（宽高）
- `languages`（数组）
- `hardwareConcurrency`、`deviceMemory`
- `canvasNoise`、`audioNoise`、`noiseSeed`
- `timezone`（字符串）

`renderer.js` 对 profile 指纹的可编辑项：`timezone` / `language` / `geolocation(city->lat/lng)`。

### 0.2 生效路径（当前）

指纹生效主要靠：

1. 启动参数：`--lang`、窗口大小、`AutomationControlled` 等（`main.js`）
2. 注入扩展：`fingerprint.js#getInjectScript()` 生成脚本写入 profile 扩展（`main.js`）
3. 局部环境变量：`env.TZ = profile.fingerprint.timezone`（`main.js`）

---

## 1. 竞品指纹基线（AdsPower/GoLogin/Multilogin 常见面板）

为了“补齐”，先把基线拆成 4 层，每层都要求 **一致性**：

### L1：启动层（Launch / Args / 进程层）

- 语言/地区：`--lang`、Accept-Language、Locale
- 窗口/屏幕/DPR：window-size、devicePixelRatio、screen 与 viewport 一致性
- 自动化痕迹：最小化高风险 flag；对 `--disable-features` 类参数要谨慎
- 远程调试：默认关闭；开启时可控（白名单/提示/自动回滚）

### L2：CDP 层（建议优先）

通过 CDP（DevTools Protocol）设置更“接近内核”的值：

- `Emulation.setTimezoneOverride`
- `Emulation.setLocaleOverride`
- `Emulation.setGeolocationOverride`
- `Network.setUserAgentOverride`（含 UA-CH / `userAgentMetadata`）
- 其他 Emulation 相关（视需要）

优势：减少被检测的 JS hook 痕迹；行为更稳定；更可回放。

### L3：页面 API 层（尽量少 hook，但仍要补齐）

竞品常见覆盖：

- UA / UA-CH（`navigator.userAgentData`）
- WebGL（vendor/renderer/ANGLE）
- Fonts（枚举与度量）
- ClientRects（布局/字体度量链）
- MediaDevices（enumerateDevices）
- Permissions（permissions.query）
- Plugins/MimeTypes（结构与可枚举性）
- Battery/NetworkInformation/DoNotTrack 等边角

### L4：一致性与稳定性（企业自用核心）

- 代理国家/时区/语言/经纬度一致性校验
- 平台（Win/Mac/Linux）与 UA/UA-CH/WebGL/GPU/Fonts 一致性
- “锁定策略”：固定 / 半固定 / 会话随机
- 可复现：启动清单、差异对比、可回放

---

## 1.x 竞品“内核级”基线与缺口清单（浏览器内核 + 代理/网络内核）

> 本仓库可见现状：Electron + Puppeteer（Chromium 单家族）为主；代理引擎以 Xray-core 生成配置并启动进程（浏览器通过本地 Socks 入站代理出网）。`resources/bin/win32-x64` 目录中同时存在 `sing-box.exe` 与 `wintun.dll`，但主流程未见启用（目前更多是“具备素材”，未形成“可选内核/模式”）。

这部分用于回答一个现实问题：**竞品不只是“指纹面板更全”，更关键是底座“内核”更可控**。因此我们把缺口拆成两条主线：

1) 浏览器内核：多内核家族、版本池、以及更底层的内核补丁面（与模板/一致性联动）
2) 代理/网络内核：引擎可插拔、系统级接管（TUN/DNS/IPv6）、以及网络指纹的观测与联动

### A. 浏览器内核（Browser Engine Kernels）缺口

#### A1. 多内核家族（竞品常见差异化能力）

- 缺口：Gecko / Firefox 内核通道（用于提供 Firefox 指纹族与行为差异）
- 缺口：WebKit / Safari 内核通道（用于 macOS/Safari 指纹族与渲染差异）
- 缺口：Edge/Chromium 品牌分支与版本节奏管理（不仅 UA，还包含 UA-CH/特性开关/兼容策略）

影响/价值：
- 覆盖更多“指纹族谱”，降低单 Chromium 的同质化聚类风险
- 面向不同站点与地区策略更灵活（例如更贴近 Safari/Firefox 的真实生态）

验收建议（规划层）：
- profile 层具备内核族字段：`browserKernel.family = "chromium" | "firefox" | "webkit"`（先规划，后实现）
- 检测页输出能稳定区分不同内核族，并与模板联动（UA/UA-CH/平台/特性一致）

#### A2. Chromium 多版本内核池（Version Pool / Locking）

- 缺口：多版本 Chromium/Chrome 内核池（stable/old/new）可选
- 缺口：profile 级“锁版本”（创建时固定版本；升级可控；支持回滚）
- 缺口：版本差异兼容策略（UA-CH 字段差异、特性差异的降级路径）

影响/价值：
- 对齐目标站点的真实版本分布，降低“版本异常”带来的风控
- 便于回归与复现（同 profile + 同版本可复跑）

验收建议（规划层）：
- 每次启动写入 `launch-manifest.json`，包含：实际浏览器版本、可执行路径、关键 flags
- 版本升级必须可回滚，并保留最近 N 次 manifest 用于对比

#### A3. 内核补丁面（与 L2/CDP、L3/JS hook 对齐）

当前文档 L2/L3 已列出许多点，但竞品更强调“补齐 + 一致性联动 + 可观测回归”。在我们的缺口视角里，主要是：

- 缺口：Fonts（字体枚举与度量稳定化，并与平台模板联动）
- 缺口：WebGL/GPU/ANGLE 更完整一致性（vendor/renderer/shader 与平台/驱动档位联动）
- 缺口：MediaDevices（设备数量/标签策略/采样率等真实性与一致性）
- 缺口：Client Hints（Sec-CH-UA 全家桶）与 UA/平台/架构一致性（避免“UA对了但UA-CH穿帮”）
- 缺口：Automation surface 全链路收敛（不仅 `--enable-automation`，还要覆盖 webdriver/permissions/timing 等高频检测面）

验收建议（规划层）：
- “模板驱动 + 少量可调项”策略不变：尽量避免 UI 里暴露过多原子字段
- 为每个模板生成一份“一致性清单”（UA ⇄ UA-CH ⇄ platform ⇄ WebGL ⇄ fonts ⇄ permissions ⇄ mediaDevices）

---

### B. 代理与网络系统级内核（Proxy & Network Kernels）缺口

#### B1. 代理引擎可插拔（Xray / sing-box / native）

- 现状：Xray-core 为主（本地 Socks 入站 + outbounds），浏览器通过 `--proxy-server` 指向本地端口
- 缺口：代理引擎可插拔（profile 级选择 Xray 或 sing-box；统一配置模型；统一日志/错误提示）
- 缺口：同一节点在不同引擎下的能力对齐与兼容策略（协议/传输/REALITY/XHTTP 等）

验收建议（规划层）：
- profile 增加字段：`proxyEngine = "xray" | "sing-box"`（先规划）
- 抽象出统一模型：`ProxySpec -> EngineConfig` 映射，并提供一致的失败原因输出

#### B2. 系统级接管（TUN/透明代理）与防泄漏内核

竞品常见的“网络底座”优势不止浏览器代理，而是更强的系统一致性与泄漏防护：

- 缺口：TUN 模式（透明代理/全流量接管，至少规划 Windows wintun）
- 缺口：DNS 防泄漏（强制 DNS 走代理、DoH/DoT 策略、禁用系统 DNS 旁路）
- 缺口：IPv6 策略矩阵（禁用/代理/双栈一致性；并可验证）
- 缺口：WebRTC/STUN 泄漏的系统化验证与策略（不仅浏览器 policy，也要配合网络栈）

验收建议（规划层）：
- 内置“一键泄漏检测报告”：DNS/WebRTC/IPv6/Headers（输出 JSON + 截图）
- 启动前的网络一致性校验：代理国家/时区/语言/经纬度 + IPv6/DNS 策略

#### B3. 网络指纹联动（TLS/HTTP2/HTTP3/QUIC）（高阶）

- 缺口：TLS/JA3/HTTP2/H3 指纹的可观测与告警（优先），再逐步引入控制/拟真
- 缺口：浏览器声称能力（UA/特性）与网络行为（ALPN/H2/H3）的一致性策略

建议路线：
- 第一阶段只做“观测 + 报告 + 告警”，不要急于在短期承诺完全可控（投入大、回归难）

---

### C. 跨平台内核分发与版本管理（工程底座）

- 缺口：`resources/bin/<platform-arch>` 的资源齐全性（mac/linux 的 xray/sing-box/tun 组件、权限与签名策略）
- 缺口：浏览器内核与代理内核的版本管理与更新回滚（可复现、可诊断、可回退）

验收建议（规划层）：
- 构建产物检查：每个平台包里是否包含对应 `bin/<platform-arch>/...`
- 启动时自检：缺资源直接给出明确错误与修复路径

---

## 2. 目标数据模型（需要先做的“地基”）

把 `profile.fingerprint` 升级为可扩展且可校验的结构（不要求一次性全做完，但要预留字段与版本）。

建议新增字段（示例）：

- `schemaVersion: number`
- `templateId: string`（例如 `win10_chrome120_enUS`）
- `lockPolicy: "fixed" | "semi" | "session"`
- `browserKernel?: { family: "chromium" | "firefox" | "webkit", channel?: "stable" | "beta" | "dev" | "esr", version?: string, executablePath?: string }`
- `proxyEngine?: "xray" | "sing-box"`（默认 `xray`，与现状兼容）
- `locale: { lang: string, acceptLanguage: string }`
- `ua: { userAgent: string, uaCH: { brands, fullVersionList, platform, platformVersion, architecture, model, mobile } }`
- `screen: { width, height, devicePixelRatio }`
- `timezone: string`
- `geolocation?: { latitude, longitude, accuracy }`
- `webgl?: { vendor, renderer }`
- `fonts?: { profile: "win_default" | "mac_default" | "linux_default" | "custom", seed?: number }`
- `clientRects?: { mode: "native" | "noise", seed?: number }`
- `mediaDevices?: { audioInputs, videoInputs, audioOutputs, labels: "realistic" | "empty" }`
- `permissions?: { notifications, geolocation, camera, microphone }`
- `plugins?: { mode: "native" | "stable" }`
- `diagnostics?: { lastLeakReport?: { path: string, createdAt: string, summary?: { ip?: string, country?: string, dns?: "ok" | "leak" | "unknown", webrtc?: "ok" | "leak" | "unknown", ipv6?: "ok" | "leak" | "unknown" } } }`

注意：**不建议**在 UI 里暴露过多原子项给人工乱调；企业自用更应该以 “模板 + 少量可调项” 为主。

---

## 3. 模板体系（内核靠拢的关键）

### 3.1 模板原则

- **先少而真**：每个平台先做 2~3 套高可信模板，而不是做 50 套但不一致。
- **强约束一致性**：模板内部字段必须联动（UA ⇄ UA-CH ⇄ platform ⇄ WebGL ⇄ fonts）。
- **把随机限制在可控范围**：只对低风险维度做噪声；高风险维度保持稳定。

### 3.2 模板建议（第一批）

Windows：
- Win10 + Chrome Stable（英文）
- Win11 + Chrome Stable（英文）

macOS：
- macOS Intel + Chrome Stable（英文）
- macOS ARM（Chrome 仍可能报告 MacIntel，但要避免其他信号暴露 ARM）

Linux：
- Ubuntu + Chrome Stable（英文）

每个模板输出：`templateId`、默认 `timezone/locale`、默认 `ua/uaCH`、默认 `webgl` 档位、默认 fonts 档位、默认分辨率+DPR组合。

---

## 4. 实施任务包拆分（P0/P1）

下面每个任务包都给出：目标、改动落点、风险点、验收标准。

### P0-A：CDP 优先的 Locale / Timezone / Geo / UA-CH 靠拢

目标：
- 把现有“主要靠 JS hook”的 timezone/geo/locale/UA 改为 **CDP 覆盖为主**。

落点文件：
- `main.js`：在 puppeteer launch 后、打开页面前，为每个 profile 建立 CDP session 并应用 emulation/network 覆盖。
- `fingerprint.js`：保留最小兜底 hook（仅在 CDP 不生效时使用），并可通过开关禁用。

风险点：
- 不同 Chromium 版本对 UA-CH 字段支持差异；需要版本分支或降级策略。

验收：
- Browserscan/Pixelscan 看到的 timezone/locale/geo 与配置一致。
- `navigator.userAgentData` 结构稳定、与 UA 一致（brands/platformVersion 等不冲突）。

---

### P0-B：一致性校验与“启动拦截”

目标：
- 启动 profile 前自动校验关键一致性，避免“错配导致封号/风控”。

校验规则（最小集）：
- `timezone` 与 `geolocation` 必须同国家/同大区（至少不出现明显跨洲错配）
- `lang/acceptLanguage` 与地区不冲突（例如 de-DE 配美国城市要提示）
- `platform` 与 `ua/uaCH` 必须一致
- `window/screen/DPR` 合法组合（常见档位）

落点文件：
- `main.js`：launch 之前做 validate；失败直接返回错误并提示 UI/API。
- `renderer.js`：展示风险提示（红/黄/绿）与一键修复（改回模板默认）。
- `utils.js` 或新增 `fingerprint-validate.js`：集中管理规则。

验收：
- 构造明显错配配置时，启动被阻止并给出明确原因与修复建议。

---

### P0-C：WebGL（先稳定、再拟真）与最小“内核靠拢”

目标：
- 先做到 WebGL 指纹稳定、不出现明显假信号；逐步引入更拟真的 vendor/renderer 策略。

方案建议：
- 第一阶段：只做“稳定输出 + 不触发 WEBGL_debug_renderer_info 异常”，避免 SwiftShader/ANGLE 冲突。
- 第二阶段：按模板绑定一组可信 vendor/renderer，并与平台联动。

落点文件：
- `fingerprint.js`：新增 WebGL hook（谨慎实现，保持 native-like 行为与 toString）。
- `renderer.js`：不暴露 vendor/renderer 细调，只允许“模板驱动”。

验收：
- 主流检测页中 WebGL vendor/renderer 与模板一致且多次启动不漂移。

---

### P0-D：ClientRects / Fonts 的“可控稳定版本”

目标：
- 先实现“稳定可控”，避免布局/字体链条在检测页上出现异常。

建议路线：
- 第一阶段：不做强伪装，只做“最小噪声/可关闭”，确保与字体/分辨率联动。
- 第二阶段：模板化 fonts 档位（win/mac/linux 默认字体集合），确保与平台一致。

落点文件：
- `fingerprint.js`：补齐相关 hook，并提供开关与 seed。

验收：
- Pixelscan/Browserscan 的相关项稳定，不出现明显 hook 痕迹与大幅漂移。

---

### P1-A：MediaDevices / Permissions / Plugins 等补齐

目标：
- 补齐竞品常见项，覆盖高频检测点。

落点：
- `fingerprint.js`：实现稳定且可配置的返回结构（尤其是 permissions/query、enumerateDevices 的数量与标签策略）。

验收：
- 检测页中这些项与模板一致，且在不同站点不会破坏功能（摄像头/麦克风权限弹窗等）。

---

### P1-B：指纹回放与差异对比（企业级自用）

目标：
- 每次启动记录“启动清单”并可对比差异，保证可复现与回归。

落点：
- `main.js`：写入 `launch-manifest.json`（profile 目录或 logs 目录）
- `renderer.js`：提供“查看本次启动清单/与上次对比”

验收：
- 同一 profile 多次启动清单一致（除非 lockPolicy= session）。

---

### P0-E：泄漏检测与网络一致性报告（观测优先）

目标：
- 给每个 profile 增加“一键检测”能力：输出 DNS/WebRTC/IPv6/Headers 的检测报告（JSON）并可截图归档。
- 先把“可诊断”建立起来：当封号/风控发生时，能够快速定位是指纹错配还是网络泄漏。

方案建议：
- 第一步只做“观测 + 报告 + 告警”，不要急着做深度网络指纹控制（投入大且回归难）。
- 报告中至少包含：当前代理配置摘要、出口 IP/国家、DNS 解析路径是否走代理、IPv6 是否泄漏、WebRTC 是否泄漏、关键请求头（Accept-Language/UA/UA-CH 摘要）。

#### P0-E 输出物：`leak-report.json`（最小可执行 Schema）

落盘路径（约定）：
- `logs/fingerprint-regression/<profileId>/<timestamp>/leak-report.json`

字段结构（最小集，建议版本化，便于扩展）：
- `schemaVersion: number`（建议从 `1` 开始）
- `createdAt: string`（ISO 8601，例如 `2026-02-04T18:30:00.000Z`）
- `profile: { id: string, name?: string }`
- `browser: { family: "chromium" | "firefox" | "webkit", version?: string, executablePath?: string, launchArgsHash?: string }`
- `proxy: { engine: "xray" | "sing-box" | "none", mode: "app_proxy" | "tun" | "system_proxy", localEndpoint?: string, remoteSummary?: string }`
- `ip: { publicIp?: string, country?: string, region?: string, city?: string, asn?: string, isp?: string, source: "httpbin" | "ipapi" | "custom" }`
- `dns: { status: "ok" | "leak" | "unknown", resolver?: string, viaProxy?: boolean, evidence?: string[] }`
- `ipv6: { status: "ok" | "leak" | "unknown", hasIpv6?: boolean, publicIpv6?: string, evidence?: string[] }`
- `webrtc: { status: "ok" | "leak" | "unknown", localIps?: string[], publicIps?: string[], policy?: string, evidence?: string[] }`
- `headers: { userAgent?: string, acceptLanguage?: string, secChUa?: string, secChUaPlatform?: string, secChUaMobile?: string }`
- `consistency: { status: "green" | "yellow" | "red", issues: { code: string, severity: "warn" | "error", message: string, suggestion?: string }[] }`
- `raw: { urls: string[], samples?: Record<string, any> }`（可选：保存少量原始采样，避免把敏感数据全量写盘）

说明：
- `launchArgsHash` 用于“同一 profile 是否用了同一套启动参数”的快速对比（避免写入完整 args 泄露敏感路径）。
- `remoteSummary` 只存“节点备注/协议/传输/出口特征”的摘要，不存账号密码等敏感字段。

示例（最小可用样例）：
```json
{
  "schemaVersion": 1,
  "createdAt": "2026-02-04T18:30:00.000Z",
  "profile": { "id": "p-001", "name": "Profile-1" },
  "browser": {
    "family": "chromium",
    "version": "120.0.6099.130",
    "executablePath": "C:\\\\path\\\\to\\\\chrome.exe",
    "launchArgsHash": "sha256:8f5b...e2c1"
  },
  "proxy": {
    "engine": "xray",
    "mode": "app_proxy",
    "localEndpoint": "socks5://127.0.0.1:21341",
    "remoteSummary": "vless+reality / grpc / remark: US-01"
  },
  "ip": {
    "publicIp": "203.0.113.10",
    "country": "US",
    "region": "CA",
    "city": "Los Angeles",
    "asn": "AS64500",
    "isp": "Example ISP",
    "source": "ipapi"
  },
  "dns": { "status": "ok", "viaProxy": true, "evidence": ["dns query observed via proxy"] },
  "ipv6": { "status": "unknown", "hasIpv6": false },
  "webrtc": { "status": "ok", "policy": "disable_non_proxied_udp" },
  "headers": {
    "userAgent": "Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36",
    "acceptLanguage": "en-US,en;q=0.9",
    "secChUaPlatform": "\"Windows\"",
    "secChUaMobile": "?0"
  },
  "consistency": { "status": "green", "issues": [] },
  "raw": { "urls": ["https://example.com/leak-check"] }
}
```

落点文件：
- `main.js`：提供 `runLeakCheck(profile)` 入口（可复用现有 API server/IPC 结构）。
- `renderer.js`：提供按钮触发与结果展示（允许导出报告）。
- `logs/`：落盘路径建议 `logs/fingerprint-regression/<profileId>/<timestamp>/leak-report.json`。

验收：
- 任意 profile 可稳定生成 `leak-report.json` 且字段齐全。
- 当刻意构造错误场景（例如 IPv6 打开但代理不支持）时，报告能明确标红并给出建议。

#### P0-E 一致性规则（用于 `consistency.issues[]` 的最小规则集）

建议先实现“少而硬”的规则，避免过度复杂：

- `TZ_GEO_MISMATCH`（error）：`timezone` 与 `geolocation` 明显跨洲/跨国家（按城市映射或 IP 归属地判定）
- `LANG_GEO_MISMATCH`（warn）：`acceptLanguage` 与地理位置不一致（例如 `de-DE` + 美国城市）
- `UA_PLATFORM_MISMATCH`（error）：`ua/uaCH.platform` 与 `navigator.platform`/模板平台不一致
- `IP_GEO_MISMATCH`（warn/error）：出口 IP 国家与 `timezone`/`geolocation` 明显冲突（可配置阈值）
- `DNS_LEAK`（error）：`dns.status === "leak"` 或 `viaProxy === false` 且代理模式要求走代理
- `IPV6_LEAK`（error）：`ipv6.status === "leak"`（出现公共 IPv6 但策略不允许）
- `WEBRTC_LEAK`（error）：`webrtc.status === "leak"`（出现非代理公网 IP 或本机局域网 IP）

每条 issue 的 `suggestion` 建议统一指向“一键修复”动作：
- 例如：切换到模板默认 `timezone/city/lang`、或禁用 IPv6、或强制 DNS 走代理、或关闭 WebRTC UDP。

补充说明：
- `TZ_GEO_MISMATCH` 允许存在“启发式兜底判定”（例如基于经度做粗判），用于快速拦截明显错配；当后续具备更可靠的数据源（IP 地理/城市映射）时，再升级为严格判定，但兜底规则保留作为安全网。

#### P0-E 执行流程：`runLeakCheck(profile)`（建议实现规范）

目标：
- 把“检测”做成一个可复现、可回归、可定位问题的标准流程：**同一 profile 在相同网络条件下反复运行结果一致**。

执行步骤（建议）：
1. **预检（Preflight）**
   - 检查 profile 是否在运行；如在运行，优先复用现有 browser 进程与 profile 端口（避免“检测时启动参数变了”）。
   - 读取 profile 的 `fingerprint` 与 `proxyEngine`、代理配置摘要（但不要写入敏感信息）。
2. **启动检测页（Probe Pages）**
   - 使用专用“检测页窗口/Tab”（建议独立 Page），打开预设 URL 清单（见下文“检测 URL 建议”）。
   - 每个 URL 采集一组最小字段（见下文“采集字段与方法”）。
3. **信号融合（Aggregate）**
   - 以“更保守”的方式合并结果：只要某一项明确泄漏，整体就标红；冲突则标 `unknown` 并在 `evidence` 写明原因。
4. **一致性规则评估（Consistency）**
   - 将采集结果与 profile 的 timezone/geo/lang/ua/uaCH 等做规则校验，输出 `consistency.status` 与 `issues[]`。
5. **落盘与 UI 回传（Persist & Notify）**
   - 写入 `leak-report.json`；同时更新 profile 的 `diagnostics.lastLeakReport`（仅存 path + createdAt + summary）。
   - IPC/API 返回 summary（green/yellow/red + 关键原因 + 报告路径）。

建议的幂等性约束：
- 检测过程**不改动** profile 指纹字段，不写入“会影响日常使用”的设置（仅写 report）。
- 检测页不注入额外 hook（除非和日常完全一致），避免“检测通过但实际不一致”。

---

#### P0-E 错误码、超时与重试（建议约定）

统一错误码（便于 UI 与 API 使用）：
- `LEAKCHECK_TIMEOUT`：某个检测 URL 超时或整体超时
- `LEAKCHECK_NAVIGATION_FAILED`：页面无法打开（网络/证书/代理故障）
- `LEAKCHECK_PROXY_DOWN`：本地代理进程不可用/端口不可达
- `LEAKCHECK_PROFILE_NOT_RUNNING`：要求复用运行中 profile 但未运行（如你们选择“必须复用”策略）
- `LEAKCHECK_UNSUPPORTED_ENGINE`：选择了 `sing-box`/`tun` 但当前平台/资源未就绪
- `LEAKCHECK_INTERNAL_ERROR`：未分类异常

建议超时策略：
- 单 URL 导航超时：10–20s（可配置）
- 单 URL 采集超时：5–10s
- 总超时：60–120s（避免 UI 卡死）
- 重试：每个 URL 最多 1 次重试；重试前先做“代理端口可达性检查”

---

#### P0-E 检测 URL 建议（可替换/自建）

建议优先“可公开访问、稳定、低变动”的检测页，且每个 URL 负责一种信号，避免一个页面承担所有结论：

- **出口 IP/地理/ASN**
  - `https://api.ipify.org?format=json`（仅 IP）
  - `https://ipapi.co/json/`（地理/ASN，注意速率限制）
- **请求头回显（验证 Accept-Language/UA/UA-CH）**
  - `https://httpbin.org/headers`（简单稳定）
- **DNS 泄漏（建议自建优先）**
  - 公共站点经常变动，建议自建一个返回“解析路径/出口 resolver”的轻量 endpoint
  - 如暂不自建：先用“是否能通过代理访问 DoH endpoint + 解析一致性”作为弱证据，结果可能为 `unknown`
- **WebRTC 泄漏**
  - 建议自建一个最小 WebRTC 探测页（只采集候选地址，不做复杂 UI），避免依赖第三方页面布局变动

备注：
- 若你们已有内部检测站，文档里保留“替换点”，把 URL 列表作为配置，不硬编码在代码里。

---

#### P0-E 采集字段与方法（建议落地到代码的最小集合）

从每个页面采集的最小字段（对应 `leak-report.json`）：

- IP 类：
  - `ip.publicIp/country/region/city/asn/isp`（按 API 返回能力填充）
- Headers 类：
  - `headers.userAgent`
  - `headers.acceptLanguage`
  - `headers.secChUa/secChUaPlatform/secChUaMobile`（如果回显拿得到）
- WebRTC 类（在页面上下文执行）：
  - 采集 ICE candidates 中的 `srflx`/`host` 地址，提取公网 IP/内网 IP 列表
  - 若出现非代理公网 IP 或内网网段，`webrtc.status="leak"`
- DNS 类（分阶段）：
  - 阶段 1：做“弱证据”标记（例如 `viaProxy` 能否从页面端访问 DoH endpoint；无法确定则 `unknown`）
  - 阶段 2（自建后）：明确返回 `resolver` 与 `viaProxy`，给出 `evidence[]`

---

#### P0-E 任务拆分（SSOT / 可直接执行）

执行原则：
- 先固化 schema 与主流程，再逐步补 probe；最后接入一致性规则与 UI 展示。
- 每个任务必须有：明确 I/O、落点文件、验收场景；避免“做了但不可验证”。

##### Task P0-E-1：定义 `LeakReport` 数据结构 + 落盘约定

目标：
- 将本章节的 `leak-report.json` schema 固化为代码中的类型/校验器，保证字段不会随意漂移。

输入/输出：
- 输入：`profile`（含 `id/name/fingerprint/proxyEngine/browserKernel`）
- 输出：`LeakReport` 对象；写盘到 `logs/fingerprint-regression/<profileId>/<timestamp>/leak-report.json`

落点文件：
- 新增：`leakcheck/schema.js`（或同等位置，包含默认值与最小校验）
- 更新：`main.js`（仅引用 schema/写盘工具，不在此任务实现 probes）

验收：
- 任意 profile 都能生成“字段齐全”的最小报告（允许大量 `unknown`，但结构必须符合 schema）
- `schemaVersion/createdAt/profile/proxy/consistency` 必填且格式正确

##### Task P0-E-2：实现 `runLeakCheck(profile)` 主流程（骨架 + 错误码）

目标：
- 跑通执行管线：Preflight → Probe → Aggregate → Consistency → Persist/Notify，并统一错误码/超时。

接口约定（建议固定）：
- `runLeakCheck(profileId, options?) -> { status: "green"|"yellow"|"red", reportPath: string, summary: object, issues: array }`
- 错误码：`LEAKCHECK_TIMEOUT` / `LEAKCHECK_NAVIGATION_FAILED` / `LEAKCHECK_PROXY_DOWN` / `LEAKCHECK_PROFILE_NOT_RUNNING` / `LEAKCHECK_UNSUPPORTED_ENGINE` / `LEAKCHECK_INTERNAL_ERROR`

落点文件：
- 新增：`leakcheck/runLeakCheck.js`
- 更新：`main.js`：新增 IPC/API 入口（例如 `ipcMain.handle('run-leak-check', ...)`）并把结果回传 UI

验收：
- 无代理/代理正常 两种情况下都能跑完并返回结构化结果
- 触发超时后返回 `LEAKCHECK_TIMEOUT`，且仍能落盘一份带错误信息的报告（便于排障）

##### Task P0-E-3：Probe（IP/Headers）实现（先拿稳定信号）

目标：
- 先实现最稳定的两类信号：出口 IP（ipify/ipapi）+ headers 回显（httpbin）。

采集项（最小）：
- `ip.publicIp/country/region/city/asn/isp`
- `headers.userAgent/acceptLanguage/secChUaPlatform/secChUaMobile`（能拿多少拿多少）

落点文件：
- 新增：`leakcheck/probes/ip.js`、`leakcheck/probes/headers.js`

验收：
- 代理开关切换时，`ip.publicIp` 可变化或能证明请求走代理（至少 evidence 可解释）
- `headers.acceptLanguage` 与 profile 设置一致（作为一致性规则输入）

##### Task P0-E-4：WebRTC 泄漏探测（最小可用版本）

目标：
- 在页面上下文采集 ICE candidates，发现明显泄漏（内网 IP/非代理公网 IP）。

实现建议（最小）：
- 使用本地静态检测页资源（或 `data:` URL），避免依赖第三方页面布局变动。
- 采集 candidates 并输出到 `webrtc.localIps/publicIps/evidence`。

落点文件：
- 新增：`leakcheck/probes/webrtc.js`
- 新增（可选）：`resources/leakcheck/webrtc.html`（或同等方式承载页面脚本）

验收：
- 能稳定采集到 candidates（不因站点变化而失效）
- 若 candidates 出现 `10.* / 172.16-31.* / 192.168.*`，报告至少标 `webrtc.status="leak"` 或 `consistency.status="red"`

##### Task P0-E-5：Consistency 规则引擎（最小规则集 + 一键修复建议）

目标：
- 把本章节“一致性规则最小集”落地为可执行规则，引导 UI 给出“建议操作”。

落点文件：
- 新增：`leakcheck/consistencyRules.js`
- 更新：`renderer.js`：展示 `green/yellow/red`、issues 列表、报告路径与导出按钮

验收：
- 构造明显错配：`timezone=America/Los_Angeles` + 城市选东京 → `TZ_GEO_MISMATCH`
- 构造 `acceptLanguage=de-DE` + 美国城市 → `LANG_GEO_MISMATCH`（warn）
- WebRTC probe 标 leak → `consistency.status` 至少为 `red`

依赖关系（执行顺序）：
- P0-E-1 → P0-E-2 → P0-E-3 → P0-E-4 → P0-E-5

认领（Owner）与推进节奏（建议）：
- Owner：Codex（本次会话）负责推进 P0-E-1 ~ P0-E-5 的落地代码与最小 UI 接入；你负责确认“检测 URL 是否需要替换成自建站点”与“DNS 泄漏判定口径”。
- 节奏：先合并 P0-E-1/2（骨架可跑、可落盘、可回传 UI），再并行补 P0-E-3/4 的 probe，最后完成 P0-E-5 的规则与 UI。

### P1-C：代理引擎可插拔（Xray ↔ sing-box）与统一配置模型

目标：
- 在保持 UI 简洁的前提下，把代理底座从“只支持一种引擎”升级为“可选引擎”，并统一配置模型与错误提示。

方案建议：
- 规划一个统一模型 `ProxySpec`（协议/传输/认证/备注/链路等），再做 `ProxySpec -> EngineConfig` 的映射。
- profile 增加字段 `proxyEngine: "xray" | "sing-box"`，默认 `xray`（与现状兼容）。
- 引擎切换后：日志路径、启动/停止、连通性检测、错误提示保持一致，不让 UI/业务感知差异。

落点文件：
- `utils.js`：拆分/抽象配置生成层（规划），避免 UI/主流程依赖具体引擎字段。
- `main.js`：按 `proxyEngine` 启动对应二进制，并统一生命周期管理（规划）。
- `resources/bin/<platform-arch>/`：补齐各平台的引擎二进制与依赖（规划）。

验收：
- 同一节点在两种引擎下都能通过基础连通性检测（至少能打开检测页并拿到外网 IP）。
- 切换引擎不会破坏 P0-B 的一致性校验与 P1-B 的可复现回放。

---

#### P1-C 任务拆分（SSOT / 可直接执行）

##### Task P1-C-1：统一配置模型 `ProxySpec`（只定义，不改 UI）

目标：
- 定义一个与引擎无关的代理配置模型（协议/传输/认证/备注/链路），作为后续 Xray/sing-box 的共同输入。

范围：
- 仅定义数据结构、序列化与基础校验；不要求一次性覆盖全部协议细节（先覆盖你们 UI 已支持的链接类型）。

落点文件：
- 新增：`proxy/proxySpec.js`（模型 + normalize + validate）
- 更新：`utils.js`：以 `ProxySpec` 作为入口（保留旧 `parseProxyLink` 兼容，逐步迁移）

验收：
- 现有代理输入（vmess/vless/trojan/ss/socks/http）都能被 normalize 成 `ProxySpec`
- `ProxySpec` 通过 validate，错误能给出明确 code 与 message

##### Task P1-C-2：Xray config 生成改为 `ProxySpec -> XrayConfig`

目标：
- 将 `generateXrayConfig()` 的输入升级为 `ProxySpec`（并保留旧字符串输入兼容），让后续引擎切换不影响上层。

落点文件：
- 更新：`utils.js`：新增 `generateXrayConfigFromSpec(spec, ...)` 并让旧函数内部调用新函数

验收：
- 与当前行为一致（同一代理节点出网效果不变）
- 输出 config 中敏感字段不落盘到日志（仅在 temp config 内）

##### Task P1-C-3：引擎选择与生命周期抽象（只打通 Xray，sing-box 先 stub）

目标：
- 在 `main.js` 中抽象 `startProxyEngine(profile)`，按 `profile.proxyEngine` 选择启动路径。

范围：
- `proxyEngine="xray"`：完全可用
- `proxyEngine="sing-box"`：先提供 “可检测资源/可报错” 的 stub（避免 UI 选择后无响应）

落点文件：
- 更新：`main.js`：统一启动/停止/日志/错误提示结构
- 更新：`resources/bin/<platform-arch>`：检查资源齐全性（自检 + 明确报错）

验收：
- `proxyEngine=xray` 启动不回归
- `proxyEngine=sing-box` 会明确返回 `LEAKCHECK_UNSUPPORTED_ENGINE`（或 proxy 专用错误码）并提示缺资源/未启用

##### Task P1-C-4：sing-box 真接入（后续批次）

目标：
- 将 `ProxySpec -> sing-box config` 打通，并与 Xray 的 UI/日志/连通性检测对齐。

前置：
- 先完成 P1-C-1/2/3，确保切换引擎不牵扯 UI 大改。

### P2-A：TUN/透明代理 + DNS/IPv6 策略矩阵（未来增强）

目标：
- 从“浏览器走本地代理”扩展到“系统级接管（透明代理）”，提升一致性与防泄漏能力。

范围说明：
- 这部分工程量与风险更高，建议在完成 P0-E（可观测）与 P1-C（引擎抽象）后再推进。

规划点：
- Windows 以 wintun 为主；macOS/Linux 按平台选择实现方式与签名/权限策略。
- 明确三套策略矩阵并可验证：DNS（系统/代理/DoH）、IPv6（关/代理/双栈）、WebRTC（禁UDP/代理UDP/策略化）。

验收（规划层）：
- 具备清晰的模式开关、日志与回滚方案，且能通过 P0-E 的检测报告验证“无泄漏”。

#### P2-A（落地优先级建议）：先“System Proxy 模式”一步到位，再补 TUN
竞品常见做法是把“系统级接管”拆成两层：
1) **System Proxy（系统代理）**：最小可用、风险相对低，能覆盖大部分桌面应用的 HTTP/HTTPS 出网；并可用于“DNS/IPv6 观测 + 验证”。
2) **TUN（透明代理）**：更强覆盖（含 UDP/非 HTTP 流量），但工程量、驱动/权限、稳定性与杀软/签名风险显著更高。

本仓库建议：P2-A 先落地 **Windows System Proxy（WinINET 注册表）** 的可控开关与回滚，作为竞品基线；TUN 作为后续增强内核。

##### P2-A-0：System Proxy（Windows）最小可用（已落地）
- IPC：`set-system-proxy-mode({ enable, endpoint })` + `get-system-proxy-status()`
- 行为：写 `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings`（ProxyEnable/ProxyServer/ProxyOverride）
- Endpoint：使用本地入站 `socks=127.0.0.1:<port>`（与 Xray/sing-box app_proxy 一致）
- 回滚：关闭 ProxyEnable（不强删用户历史 ProxyServer/Override，降低误伤）

##### P2-A-1：TUN（骨架）建议接口（未落地）
- profile/setting 级别定义：`proxy.mode = "tun"`，并声明 `capabilities.udp/ipv6` 等
- 启动要求：Windows 依赖 `wintun.dll` + sing-box/xray 的 tun inbound/outbound 能力；mac/linux 另行实现
- 验收：P0-E LeakCheck 报告中 `proxy.mode="tun"` 且 DNS/IPv6/WebRTC 等项无红色泄漏

---

## 5. 验收与回归（不依赖商业/团队）

### 5.1 本地回归脚本（建议新增）

目标：
- 一键启动指定 profile，自动打开一组检测页并截图/保存关键字段，作为回归证据。

检测页建议（自用可替换）：
- browserscan / pixelscan / cloudflare bot test
- 你们常用电商平台的基础页面（验证不破坏功能）

输出物：
- `logs/fingerprint-regression/<profileId>/<timestamp>/report.json`
- `.../screenshots/*.png`

### 5.2 回归断言（最小集）

- timezone/locale/geo 与配置一致
- UA/UA-CH 一致且稳定
- WebGL vendor/renderer 稳定且不冲突
- canvas/audio 噪声策略符合 lockPolicy（fixed/semi/session）

---

## 8. 代理/节点/订阅补齐规划（与环境联动）

你们现状（基于仓库可见实现）：

- 节点协议解析：`utils.js#parseProxyLink()` 已支持 `vmess/vless/trojan/ss/socks/http` 及 `ws/grpc/h2/xhttp(reality)` 等 streamSettings 的解析，并可用于生成 Xray outbound。
- 订阅更新：`renderer.js#updateSubscriptionNodes()` 支持从订阅 URL 拉取文本，尝试 base64 解码，并按行提取 `://` 形式的节点链接写入 `globalSettings.preProxies`。
- 自动测试：已有 `test-proxy-latency`（通过临时 xray + 访问 `http://cp.cloudflare.com/generate_204` 计算延迟）（`main.js`/`renderer.js`）。
- 环境联动：Profile 支持 `preProxyOverride`（在不同组/订阅间选择前置代理组）（`renderer.js`）。

目前缺口：订阅类型覆盖不够、解析鲁棒性不足、节点生命周期管理缺失、自动测试维度单一、以及与“环境(Profile 指纹模板)”的强联动不足。

### 8.1 目标：把代理体系升级为“环境联动”的一等公民

新增概念：**Environment（环境）= Profile 的可复现运行单元**

- `Environment` = `FingerprintTemplate + ProxyPolicy + StoragePolicy + ExtensionPolicy`
- 其中 `ProxyPolicy` 负责：节点来源（手动/订阅/文件）、选择策略（固定/轮换/失败回退）、健康状态、以及与指纹（TZ/Geo/Locale）的一致性联动。

落地方式：不引入云端/账号，全部本地化存储在 `settings.json`/`profiles.json`，并可导出/备份。

### 8.2 数据模型（建议）

#### Subscription（订阅）

字段建议：

- `id: string`
- `name: string`
- `url: string`
- `type: "raw" | "base64" | "clash" | "singbox" | "v2rayN" | "auto"`
- `formatVersion?: string`
- `intervalHours: number`（替换当前字符串 interval）
- `lastUpdated: number`
- `etag?: string` / `lastModified?: string`（用于增量更新）
- `parseStats?: { totalLines, totalNodes, okNodes, skippedNodes, errors }`

#### Node（节点 / ProxyNode）

字段建议：

- `id: string`
- `source: { kind: "manual" | "subscription", subscriptionId?: string }`
- `raw: string`（原始链接/配置段）
- `remark: string`
- `protocol: "vmess" | "vless" | "trojan" | "ss" | "socks" | "http"`
- `tags?: string[]`（地区/用途）
- `meta?: { country?: string, city?: string, isp?: string, asn?: string }`（通过测试阶段填充）
- `health?: { lastTestAt, latencyMs, ok, failReason, ip?: string, geo?: { country, region, city, tz } }`
- `capabilities?: { udp?: boolean, ipv6?: boolean, tls?: boolean, reality?: boolean }`

#### ProxyPolicy（环境级别策略）

放到 `profile` 或 `fingerprint` 的扩展字段里：

- `proxyPolicy: { mode: "fixed" | "rotate" | "fallback", groupId: "manual" | subscriptionId, nodeId?: string, rotateOn: "time" | "failure", rotateIntervalMin?: number }`
- `consistencyPolicy: { enforce: boolean, onMismatch: "block" | "warn" | "autoFix" }`

### 8.3 订阅类型支持与自动解析（P0）

目标：支持常见订阅格式，并做到“自动识别 + 稳健解析 + 可观测”。

#### 支持范围（建议优先级）

P0：
- `raw`：纯链接行（你们已支持）
- `base64`：订阅整体 base64（你们已有弱判断：不含 `://` 则尝试解码）
- `v2rayN`：实际就是 raw/base64 的变体（通过更稳健的 auto 检测覆盖）

P1：
- `clash`（YAML：`proxies:`）
- `sing-box`（JSON：`outbounds`）

#### Auto 检测策略（建议）

- 若内容包含 `proxies:` 或 YAML 特征 → clash
- 若 `JSON.parse` 成功且存在 `outbounds` → sing-box
- 若 base64 解码后包含大量 `://` → base64
- 否则 raw

落点：
- 建议把订阅解析逻辑从 `renderer.js` 下沉到 `main.js`（或新模块 `proxy/`），以便 UI/API/自动测试复用；renderer 只做展示与触发。

### 8.4 自动测试升级（P0/P1）

现有测试只覆盖“连通 + 粗略延迟”。企业级自用建议补齐以下维度，并把结果写回 `Node.health`：

P0（必做）：
- `connectivity`：HTTP 204 / HEAD 连通性
- `ipEcho`：获取出口 IP（用于联动指纹）
- `geo`：基于出口 IP 查询国家/时区（用于一致性判断与展示）

P1（增强）：
- `dns`：解析成功率/耗时（可选）
- `ipv6`：是否可用
- `udp`：是否可用（与 WebRTC/UDP 泄漏相关）
- `tls`：握手成功、SNI/ALPN 基本行为

实现建议：
- 基础版仍用“临时 xray socks inbound + 指定 outbound”（你们已有），但测试应输出结构化结果，而不是只有 latency。

### 8.5 与指纹的“环境联动”（P0）

目标：做到“选了节点/订阅组 → 自动推导并锁定指纹关键项”，并在不一致时阻止启动或自动修复。

联动规则（建议最小集）：

- 出口 IP 的国家/时区 → `fingerprint.timezone`（Auto 模式下自动设置为匹配值）
- 出口 IP 的国家/语言偏好 → `fingerprint.language/acceptLanguage`（Auto 模式下自动设置）
- 出口 IP 的国家/经纬度 → `fingerprint.geolocation`（可选：只在用户选择城市=Auto 时填充）

工作流建议：

1. 订阅更新后可选自动批量测试（有并发与上限，避免把节点都跑死）
2. Profile 选择节点/组时，若 lockPolicy 允许且 fingerprint 处于 Auto，则自动写入联动字段
3. 启动前执行一致性校验：proxy geo ↔ fingerprint TZ/Geo/Locale，不通过则 `block/warn/autoFix`

落点：
- `main.js`：启动前校验 + 可选自动修复（写回 profiles.json）
- `renderer.js`：展示“联动状态”（已联动/待联动/不一致）与一键修复

### 8.6 任务包（建议拆分）

P0-Proxy-1：订阅解析下沉 + 类型 auto 检测（raw/base64/v2rayN）
- 产物：`parseSubscription(content, hintType) -> { nodes, stats, detectedType }`

P0-Proxy-2：自动测试增强（connectivity + ipEcho + geo）
- 产物：`testProxyNode(node) -> { ok, latencyMs, ip, geo, failReason }`

P0-Proxy-3：环境联动（proxy geo -> fingerprint timezone/language/geo）+ 启动拦截
- 产物：`applyProxyFingerprintLink(profile, testResult, policy) -> { updatedProfile, warnings }`

P1-Proxy-4：Clash/Sing-box 订阅支持

P1-Proxy-5：节点生命周期管理（去重、失效、回滚订阅快照、etag/last-modified）

---

## 9. 当前已落地的最小实现（协作推进记录）

为避免与其他 agent 产物冲突，本轮改动只新增最小模块与 IPC，并以“best effort 自动联动 timezone”为第一步：

- 新增订阅解析模块：`proxy/subscription.js`（raw/base64 auto 检测 + 解析出节点链接列表与统计）
- 新增代理测试探针：`proxy/test.js`（基于 ipify/ipapi 的 ip/geo 探测，用于联动与一致性）
- 新增联动逻辑：`proxy/linkFingerprint.js`（将 `test-proxy-node` 的 geo.timezone 应用到 fingerprint.timezone；支持 `consistencyPolicy.onMismatch=block/warn/autofix`）
- 新增 IPC：`test-proxy-node`（`main.js`），返回结构化结果：connectivity/latency/ip/geo
- 在 `ipcMain.handle('launch-profile'...)` 启动前增加 best-effort 联动：对当前 profile.proxyStr 跑一次 `testProxyNodeInternal`，若 fingerprint.timezone 为 Auto 则写入匹配时区（并写回 profiles.json）

下一步建议落地（P0 继续）：
- 把订阅更新逻辑从 `renderer.js` 下沉到 `main.js`，统一走 `parseSubscriptionContent()`，并把节点结构从 `{url, remark}` 升级为 `ProxyNode`（带 health/ip/geo）。
- 把联动扩展到 `language/acceptLanguage/geolocation`，并把一致性校验做成可视化红黄绿。

## 6. 推荐落地顺序（你们当前代码结构最省事）

1. P0-A（CDP 覆盖：Timezone/Locale/Geo/UA-CH）
2. P0-B（一致性校验 + 启动拦截 + 一键修复）
3. P0-C（WebGL 稳定化，模板绑定）
4. P0-D（ClientRects/Fonts 最小稳定版）
5. P1-A（MediaDevices/Permissions/Plugins）
6. P1-B（启动清单/差异对比 + 回归脚本）
7. P0-E（泄漏检测与网络一致性报告：先观测再控制，保证可诊断）
8. P1-C（代理引擎可插拔：Xray/sing-box 抽象统一，减少底座绑死）
9. P2-A（TUN/透明代理 + DNS/IPv6 策略矩阵：系统级防泄漏与一致性）

---

## 7. 与当前代码的接口约束（避免大改 UI）

- `renderer.js` 继续只提供少量字段编辑（timezone/language/city），其余通过 `templateId + lockPolicy` 控制。
- `main.js` 在 launch 前统一调用 `applyFingerprintTemplate(profile)` 与 `validateFingerprint(profile)`。
- `fingerprint.js` 只保留少量兜底 hook，尽可能把“可控覆盖”前移到 CDP。

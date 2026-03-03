# TASK_TRACKER（SSOT）

本文件用于记录本仓库的“可执行任务清单”，以任务 ID 的方式跟踪：目标、范围、验收、状态、负责人。

状态枚举：
- `TODO`：未开始
- `DOING`：进行中
- `BLOCKED`：阻塞
- `DONE`：完成

---

## P0-E：泄漏检测与网络一致性报告（观测优先）

### P0-E-1：LeakReport schema + 落盘约定
- id: `P0-E-1`
- status: `DONE`
- owner: `Codex`
- scope: 固化 `leak-report.json` schema（版本化），实现最小校验与默认值；定义落盘路径规范
- acceptance:
  - 任意 profile 生成字段齐全的最小报告（允许 `unknown`）
  - 写盘路径：`logs/fingerprint-regression/<profileId>/<timestamp>/leak-report.json`

### P0-E-2：runLeakCheck 主流程骨架 + 错误码/超时
- id: `P0-E-2`
- status: `DONE`
- owner: `Codex`
- scope: 实现 Preflight→Probe→Aggregate→Consistency→Persist/Notify；统一错误码与超时；提供 IPC/API 入口
- acceptance:
  - 无代理/代理正常都能返回结构化结果
  - 超时返回 `LEAKCHECK_TIMEOUT`，并仍能落盘包含错误信息的报告

### P0-E-3：Probe（IP/Headers）
- id: `P0-E-3`
- status: `DONE`
- owner: `Codex`
- scope: 采集出口 IP 与 headers 回显（UA/Accept-Language/UA-CH 摘要）
- acceptance:
  - 代理开关变化时，能证明请求走代理（IP 或 evidence）
  - acceptLanguage 与 profile 设置一致（作为一致性规则输入）

### P0-E-4：Probe（WebRTC）
- id: `P0-E-4`
- status: `DONE`
- owner: `Codex`
- scope: 采集 ICE candidates，判定内网 IP/非代理公网 IP 泄漏
- acceptance:
  - 稳定采集 candidates，不依赖第三方页面
  - 泄漏场景能标 `webrtc.status="leak"` 或整体 red

### P0-E-5：一致性规则引擎 + UI 展示
- id: `P0-E-5`
- status: `DONE`
- owner: `Codex`
- scope: 实现最小规则集（TZ/GEO、LANG/GEO、UA/平台、IP_GEO、DNS/IPv6/WebRTC）；UI 展示结果与导出报告
- acceptance:
  - 关键错配能触发对应 rule code
  - WebRTC leak 必然 red

---

## P1-C：代理引擎可插拔（Xray ↔ sing-box）与统一配置模型

### P1-C-1：定义统一模型 ProxySpec（normalize/validate）
- id: `P1-C-1`
- status: `DONE`
- owner: `Codex`
- scope: 定义 `ProxySpec`，覆盖当前 UI 已支持链接类型；输出可读错误码
- acceptance:
  - 现有代理输入可 normalize 成 ProxySpec
  - validate 失败时给出明确 code/message

### P1-C-2：Xray config 生成改为 ProxySpec 输入（兼容旧接口）
- id: `P1-C-2`
- status: `DONE`
- owner: `Codex`
- scope: 新增 `generateXrayConfigFromSpec`，旧 `generateXrayConfig` 内部调用新函数
- acceptance:
  - 行为不回归：同节点出网一致

### P1-C-3：引擎启动抽象（xray 可用，sing-box stub）
- id: `P1-C-3`
- status: `DONE`
- owner: `Codex`
- scope: `startProxyEngine(profile)` 统一生命周期；sing-box 未启用时明确报错
- acceptance:
  - xray 启动不回归
  - sing-box 选择后给出明确错误与修复提示

### P1-C-4：sing-box 真接入（后续批次）
- id: `P1-C-4`
- status: `DONE`
- owner: `Codex`
- scope: ProxySpec -> sing-box config + 启动/停止/日志/连通性检测对齐
- acceptance:
  - 与 xray 一样可用于日常 profile 出网

---

## P0-A：CDP 优先的 Locale / Timezone / Geo / UA-CH 靠拢

### P0-A-1：CDP 覆盖的 FingerprintSpec（模型与落盘）
- id: `P0-A-1`
- status: `DONE`
- owner: `Codex`
- scope: 在 profile 中引入 “CDP 可控项” 的结构化模型（如 locale/timezone/geo/userAgent/uaCH），并给出默认值与兼容旧字段的迁移策略
- acceptance:
  - 旧 profile（只有 timezone/language/geo）也能被 normalize 成新模型
  - UI 不改或最小改动也可使用（先用 templateId/auto）

### P0-A-2：Launch 时应用 CDP overrides（timezone/locale/geolocation）
- id: `P0-A-2`
- status: `DONE`
- owner: `Codex`
- scope: 在 puppeteer page 创建后、导航前应用 `Emulation.setTimezoneOverride` / `Emulation.setLocaleOverride` / `Emulation.setGeolocationOverride`
- acceptance:
  - 检测页能读到与配置一致的 timezone/locale/geo
  - 失败时可降级并在日志/报告中体现原因

### P0-A-3：Network UA override（含 UA-CH metadata）
- id: `P0-A-3`
- status: `DONE`
- owner: `Codex`
- scope: 使用 `Network.setUserAgentOverride` 统一设置 UA 与 `userAgentMetadata`（UA-CH）并设置 `acceptLanguage`；以 `fingerprint.cdp.locale` 为 SSOT 打通 `navigator.language/languages` 与 `Intl`/CDP/启动参数一致性
- acceptance:
  - `navigator.userAgent` 与 UA-CH（或其可见摘要）一致
  - 同一 profile 多次启动输出稳定（除非策略要求随机）

---

## P0-B：一致性校验与“启动拦截”

### P0-B-1：Fingerprint 一致性规则集（最小可用）
- id: `P0-B-1`
- status: `DONE`
- owner: `Codex`
- scope: 把“时区/语言/地理位置/平台/UA/代理国家”等纳入一致性规则，输出 ruleCode 与建议修复项
- acceptance:
  - 关键错配能稳定触发对应 ruleCode
  - 可在 UI 或报告中看到 red/yellow/green 结果

### P0-B-2：启动前校验 + block/warn/autofix 策略
- id: `P0-B-2`
- status: `DONE`
- owner: `Codex`
- scope: launch-profile 入口加入校验与策略执行（阻止启动/仅警告/自动修复写回 profiles）
- acceptance:
  - `block` 时明确错误提示且可追溯（日志/报告）
  - `autofix` 时写回成功，且启动后的检测页体现修复结果

---

## P0-C：WebGL（先稳定、再拟真）与最小“内核靠拢”

### P0-C-1：WebGL 模板与稳定输出（vendor/renderer/ANGLE）
- id: `P0-C-1`
- status: `DONE`
- owner: `Codex`
- scope: 引入 webgl 模板字段（`fingerprint.webgl`/`fingerprint.cdp.webgl`）并用最小注入实现稳定输出（覆盖 WebGL/WebGL2 getParameter 的 vendor/renderer + debug renderer info）
- acceptance:
  - 多次启动输出一致
  - 与 platform/UA 模板组合不明显冲突

---

## P0-D：ClientRects / Fonts 的“可控稳定版本”

### P0-D-1：字体/度量稳定化（最小方案）
- id: `P0-D-1`
- status: `DONE`
- owner: `Codex`
- scope: 提供“稳定字体度量/ClientRects”的最小实现（尽量少 hook），并与模板联动
- acceptance:
  - 检测页输出稳定（同 profile 重启一致）
  - 不引入明显性能退化/布局异常

---

## P1-A：MediaDevices / Permissions / Plugins 等补齐

### P1-A-1：MediaDevices 枚举与 permissions.query 一致性
- id: `P1-A-1`
- status: `DONE`
- owner: `Codex`
- scope: 补齐 enumerateDevices 输出与 permissions.query 的最小一致性，避免站点异常
- acceptance:
  - 常见检测脚本不报错
  - 输出与模板策略一致（可固定/半随机）

---

## P1-B：指纹回放与差异对比（企业级自用）

### P1-B-1：本地回归脚本 + 差异对比输出（SSOT）
- id: `P1-B-1`
- status: `DONE`
- owner: `Codex`
- scope: 增加最小回归 runner，批量执行 e2e 校验与 leakcheck 并落盘结果到 `logs/fingerprint-regression/<profileId>/<timestamp>/...`；提供 summary.json 作为机器可读汇总
- acceptance:
  - 同 profile 连续运行 diff 为 0（或在允许随机字段范围内）
  - 不同 profile 的差异可读（字段级）

#### 回归命令（当前已提供的最小验证）
- `node scripts/e2e_locale_consistency.js`：验证 `fingerprint.cdp.locale` 作为 SSOT 时，`Intl` 与 `navigator.language/languages` 以及 timezone/geo 的一致性（通过注入扩展 + CDP overrides）
- `node scripts/smoke_cdp_overrides.js`：只验证 CDP timezone/locale/geo 是否可设置（不走注入扩展管线）
- `node scripts/e2e_proxy_policy_gate.js`：验证 proxy↔fingerprint 一致性 gate（block/warn/autofix）与 issue schema（不依赖 Electron UI）
- `node scripts/e2e_webgl_consistency.js`：验证 WebGL vendor/renderer/unmasked vendor/renderer 能按模板稳定输出（通过注入扩展）
- `node scripts/e2e_media_permissions.js`：验证 permissions.query 与 enumerateDevices 在注入后不报错且返回稳定结构
- `node scripts/e2e_media_devices_template.js`：验证 mediaDevices 模板（audio/video 设备数量与 deviceId 形状）可控且稳定
- `node scripts/e2e_permissions_media_link.js`：验证 permissions（camera/mic）状态会联动 mediaDevices 枚举数量（denied -> 0）
- `node scripts/e2e_plugins_mimetypes.js`：验证 plugins/mimeTypes 的最小一致性（稳定 length/item/namedItem）
- `node scripts/e2e_ua_ch_consistency_rules.js`：验证 UA-CH/platform/hardware 一致性规则能识别关键错配
- `node scripts/e2e_ua_ch_metadata_override.js`：验证 UA-CH metadata 模板覆盖（platformVersion 等）不会被 normalize 覆盖且不误报
- `node scripts/e2e_ua_ch_brands_generation.js`：验证提供 UA 时 brands/fullVersionList 自动生成
- `node scripts/e2e_ua_ch_header_alignment.js`：验证通过 CDP userAgentMetadata 能使实际出网 Sec-CH-UA/Sec-CH-UA-Platform 与模板一致
- `node scripts/e2e_header_probe_via_proxy.js`：验证在提供 `PROXY_STR` 时可通过 socks 出网抓取回显 headers（用于代理链路一致性）
- `node scripts/e2e_fonts_template.js`：验证 fonts 模板（document.fonts.check）可控且稳定
- `node scripts/e2e_fonts_multi_probe.js`：验证 fonts 模板在多探测面（document.fonts.check + offsetWidth）一致可控
- `node scripts/e2e_fonts_canvas_probe.js`：验证 fonts 模板在 canvas measureText 探测面一致可控
- `node scripts/fingerprint_regression_run.js`：一键运行 locale/webgl/media/proxyGate + leakcheck，并落盘到 `logs/fingerprint-regression/local/<timestamp>/`
- UI 订阅导入：支持 raw/base64/v2rayN + Clash YAML + sing-box JSON（通过 IPC `parse-subscription` 统一解析）
- `node scripts/e2e_subscription_parser.js`：验证订阅解析器支持 clash/sing-box 并输出稳定 nodeId
- UI 订阅回滚：Proxy Manager 中 Sub 分组出现 `↩ Rollback`（有快照时可见），可一键回滚到上一次订阅节点快照
- `node scripts/e2e_clientrects_stability.js`：验证 ClientRects/measureText 输出在 reload 前后稳定（通过注入扩展）

---

## P2-A：TUN/透明代理 + DNS/IPv6 策略矩阵（未来增强）

### P2-A-1：策略矩阵与最小 PoC（不要求默认开启）
- id: `P2-A-1`
- status: `DONE`
- owner: `Codex`
- scope: 规划并实现最小 PoC：DNS/IPv6/WebRTC/UDP 与 TUN 模式的策略矩阵（可选项），并给出观测指标
- acceptance:
  - PoC 可运行且能产出观测数据（不是只写文档）
  - 默认不开启不影响现有用户
 - notes:
  - PoC 入口：`node scripts/p2a_policy_matrix_poc.js`
  - 输出：`logs/p2a-policy-matrix/<profileId>/<timestamp>/report.json`（以及 app_proxy.json/system_proxy.json）
  - TUN 探测：报告中 `tun.readiness` 提供 readiness code（仅检测资源，不启动驱动）
  - 最小观测：`observations.json` 包含 headers（httpbin）与 ipv6 探测结果（不依赖 Electron UI）

### P2-A-2：TUN 真接入（Windows / sing-box）
- id: `P2-A-2`
- status: `DONE`
- owner: `Codex`
- scope: 在 Windows 上打通 sing-box TUN（wintun）模式的“可选真接入”：
  - 生成/启动 tun inbound 配置，支持最小 auto_route/strict_route/dns_hijack 方案
  - 明确约束：同一时间仅允许一个 profile 进入 tun 模式（避免路由冲突）
  - 失败提示：权限/驱动/资源缺失时给出可操作的报错与回滚策略
- acceptance:
  - 可手动开启/关闭 tun 模式并能恢复网络
  - LeakCheck 报告中 `proxy.mode="tun"` 且 IPv6/DNS/WebRTC 观测不再出现系统级直连证据
  - `node scripts/regression_tun_guardrails.js` PASS
  - `npm run regression:all` PASS

---

## UI 体验增强（竞品式）

### UI-1：运行中重启/状态机与防抖
- id: `UI-1`
- status: `DONE`
- owner: `Codex`
- scope: Restart 按钮（运行中可用）、重启中禁用按钮、防止重复点击、状态事件驱动刷新
- acceptance:
  - 重启过程中按钮禁用且显示 Working/Restarting
  - stop/launch 的状态变化能驱动 UI 更新

### UI-2：LeakCheck 报告直达 + 失败重试
- id: `UI-2`
- status: `DONE`
- owner: `Codex`
- scope: Leak 标签可点击打开最近报告；stop_failed 显示 Retry
- acceptance:
  - 点击 Leak 标签可打开 reportPath
  - stop_failed 时出现 Retry 按钮可再次触发 restart

### UI-3：日志直达 + 引擎可见
- id: `UI-3`
- status: `DONE`
- owner: `Codex`
- scope: Profile 卡片显示 Engine；提供 Open Log 按钮打开该 profile 的运行日志文件
- acceptance:
  - 卡片上显示 `Engine:xray/sing-box`
  - 点击 Open Log 会按引擎打开 `<profileDir>/xray_run.log` 或 `<profileDir>/singbox_run.log`

### UI-4：失败引导（Stop Failed 强提示）
- id: `UI-4`
- status: `DONE`
- owner: `Codex`
- scope: stop_failed 时高亮日志入口，并提示“建议先查看日志再 Retry”
- acceptance:
  - stop_failed 时显示红色 Open Log，并带 Retry 提示

### UI-5：错误摘要（lastError）直观展示
- id: `UI-5`
- status: `DONE`
- owner: `Codex`
- scope: stop/launch 失败时写入 `profile.diagnostics.lastError`（含 engine/logPath），并在卡片上展示可点击的错误摘要（点开日志）
- acceptance:
  - 失败后卡片出现红色错误摘要标签
  - 点击错误摘要会打开对应日志文件

### UI-10：日志滚动与清理
- id: `UI-10`
- status: `DONE`
- owner: `Codex`
- scope: 启动前按大小滚动日志（保留最近 N 份）；卡片提供 Clear Logs（仅停止后可用）
- acceptance:
  - 单个日志超过阈值会被滚动到 `*.timestamp.log`
  - Clear Logs 会删除当前 `xray_run.log/singbox_run.log`

### UI-11：日志大小可视化 + 清理历史
- id: `UI-11`
- status: `DONE`
- owner: `Codex`
- scope: 卡片显示日志总大小；提供可选“清理历史滚动日志”
- acceptance:
  - 卡片显示 `Log:xxMB`
  - Clear+History 会删除 `xray_run.*.log`/`singbox_run.*.log`

### UI-12：滚动日志查看器
- id: `UI-12`
- status: `DONE`
- owner: `Codex`
- scope: 提供 Rotated Logs 弹窗，列出滚动历史日志并可点击打开
- acceptance:
  - 点击 Rotated 显示历史日志列表（按时间倒序）
  - 点击条目会打开对应日志文件

### UI-13：滚动日志筛选
- id: `UI-13`
- status: `DONE`
- owner: `Codex`
- scope: Rotated Logs 弹窗增加筛选输入框（按文件名过滤）
- acceptance:
  - 输入关键字后列表按文件名过滤

### UI-14：滚动日志删除
- id: `UI-14`
- status: `DONE`
- owner: `Codex`
- scope: Rotated Logs 列表支持删除单个历史日志文件（带二次确认）
- acceptance:
  - 点击 Delete 会弹出确认
  - 确认后该文件被删除且列表刷新

### UI-15：滚动日志列表交互优化
- id: `UI-15`
- status: `DONE`
- owner: `Codex`
- scope: 滚动日志条目提供独立 Open 按钮、Delete 按钮；长文件名省略；删除成功提示
- acceptance:
  - 条目不挤压，文件名可省略显示
  - 删除后提示 Deleted/已删除

### MAINT-2：日志滚动命名稳定化（带引擎 tag）
- id: `MAINT-2`
- status: `DONE`
- owner: `Codex`
- scope: rotated log 文件名包含引擎 tag（例如 `xray_run.xray.<ts>.log`），便于排障与筛选
- acceptance:
  - rotate 后文件名包含 `.xray.` 或 `.sing-box.`

### MAINT-3：代理进程 PID 命名泛化
- id: `MAINT-3`
- status: `DONE`
- owner: `Codex`
- scope: 将 `activeProcesses[*].xrayPid` 统一迁移为 `proxyPid`，并通过 helper 保持兼容读取
- acceptance:
  - stop/delete/disconnect 清理路径都使用 proxyPid（兼容旧字段）

### PERF-1：Log size 查询去抖与缓存
- id: `PERF-1`
- status: `DONE`
- owner: `Codex`
- scope: log size 异步查询增加 10s 缓存，避免频繁刷新列表导致 IPC 爆炸
- acceptance:
  - 连续调用 loadProfiles 时，10s 内同一 profile 不重复请求 get-profile-log-sizes

---

## 稳定性与回归（无 GUI）

### REG-1：IPC/配置生成回归脚本
- id: `REG-1`
- status: `DONE`
- owner: `Codex`
- scope: 添加 `scripts/regression_ipc.js`，验证 leakcheck 可落盘、sing-box 配置可通过 `sing-box check`
- acceptance:
  - `npm run regression:ipc` 通过

### REG-2：i18n key 覆盖回归
- id: `REG-2`
- status: `DONE`
- owner: `Codex`
- scope: 添加 `scripts/regression_i18n.js`，扫描 renderer `t('key')` 并验证 en+zh 都存在
- acceptance:
  - `npm run regression:i18n` 通过

### UX-1：Toast 与状态刷新节流
- id: `UX-1`
- status: `DONE`
- owner: `Codex`
- scope: 用非阻塞 toast 替代部分 alert；profile-status 事件触发的 loadProfiles 做节流
- acceptance:
  - 删除滚动日志成功后使用 toast 提示，不打断操作
  - 高频状态事件不会导致频繁刷新卡顿

### UX-2：成功提示尽量使用 Toast
- id: `UX-2`
- status: `DONE`
- owner: `Codex`
- scope: LeakCheck/清理日志等成功路径使用 toast；错误仍使用 alert
- acceptance:
  - LeakCheck 成功时 toast 提示
  - Clear Logs 成功时 toast 提示

### UX-3：低重要性提示改用 Toast
- id: `UX-3`
- status: `DONE`
- owner: `Codex`
- scope: 检查更新/无更新/下载成功等低重要性提示改用 toast，避免频繁弹窗
- acceptance:
  - update 检查与“无更新”不再弹 modal

### UX-4：批量创建/订阅更新提示改用 Toast
- id: `UX-4`
- status: `DONE`
- owner: `Codex`
- scope: 批量创建成功、订阅更新成功等提示改用 toast；错误仍用 alert
- acceptance:
  - 批量创建成功不再弹 modal
  - 订阅更新成功不再弹 modal

### UX-5：Toast 样式与主题一致性
- id: `UX-5`
- status: `DONE`
- owner: `Codex`
- scope: toast 在不同主题下保持可读性（背景/文字对比度稳定）
- acceptance:
  - 切换主题后 toast 仍清晰可读

### UX-6：Toast CSS 变量化
- id: `UX-6`
- status: `DONE`
- owner: `Codex`
- scope: toast 样式使用 CSS 变量（--toast-bg/--toast-text），由主题控制；移除 JS 硬编码颜色
- acceptance:
  - 三个主题下 toast 背景/文字由变量控制

### UI-6：Retry 前引导（先看日志再重试）
- id: `UI-6`
- status: `DONE`
- owner: `Codex`
- scope: 点击 Restart/Retry 时，如果存在 lastError，则优先弹出“是否先打开日志”的确认提示
- acceptance:
  - 有 lastError 时，restart 会提示 open log

### UI-7：双动作确认框（Open Log / Continue）
- id: `UI-7`
- status: `DONE`
- owner: `Codex`
- scope: confirmModal 支持可选的第三按钮（Alt），用于“打开日志/继续重试”二选一
- acceptance:
  - restart 检测到 lastError 时弹出双动作
  - Alt=Open Log 会打开日志且不会立即重启

### MAINT-1：移除未使用的 restart-profile IPC
- id: `MAINT-1`
- status: `DONE`
- owner: `Codex`
- scope: 移除主进程 `restart-profile` IPC 与 preload 暴露，统一用 renderer 的 `stopProfile + launch` 作为单一重启路径
- acceptance:
  - 仓库内无 `restart-profile` 的引用

### UI-8：Restart 流程可取消
- id: `UI-8`
- status: `DONE`
- owner: `Codex`
- scope: 当用户在双动作弹窗选择 Open Log 时，restart 应直接退出而不是继续 stop+launch
- acceptance:
  - 选择 Open Log 后不会触发 stop-profile/launch

### BUG-1：双动作弹窗 Cancel 不应卡死
- id: `BUG-1`
- status: `DONE`
- owner: `Codex`
- scope: Restart 的双动作弹窗如果用户点 Cancel，应 resolve 并退出，不应卡住 Promise
- acceptance:
  - Cancel 后 restart 直接返回，UI 不进入 Working 状态

### UI-9：Retry Now 文案与即时工作态
- id: `UI-9`
- status: `DONE`
- owner: `Codex`
- scope: 双动作弹窗 confirm 按钮显示为 Retry Now；用户选择 Retry Now 后立即把卡片置为 Working... 避免 UI 延迟
- acceptance:
  - 弹窗按钮文案为 Retry Now
  - 点击 Retry Now 后卡片按钮进入禁用/Working 状态

### I18N-1：新 UI 文案国际化
- id: `I18N-1`
- status: `DONE`
- owner: `Codex`
- scope: 将 Working/Stop Failed/Restart/Retry/Open Log/Retry Now/Choose action 等新文案加入中英翻译，并在 renderer 中通过 `t()` 使用
- acceptance:
  - 中英文切换后这些文案随语言变化

### I18N-2：LeakCheck/Engine 标签国际化
- id: `I18N-2`
- status: `DONE`
- owner: `Codex`
- scope: 将 LeakCheck 按钮、Engine/Leak 标签加入中英翻译，并在 renderer 中通过 `t()` 使用
- acceptance:
  - 中英文切换后 LeakCheck/Engine/Leak 文案随语言变化

---

## P0-Proxy：代理/订阅/环境联动（与指纹一致性）

### P0-Proxy-1：订阅解析下沉 + 类型 auto 检测（raw/base64/v2rayN）
- id: `P0-Proxy-1`
- status: `DONE`
- owner: `Codex`
- scope: 订阅解析从 renderer 下沉到 main（或 proxy 模块），支持 raw/base64/v2rayN 自动识别，输出结构化节点列表与统计
- acceptance:
  - 同一订阅内容重复解析结果稳定（node 去重策略明确）
  - 解析失败返回可读错误码/定位信息

### P0-Proxy-2：自动测试增强（connectivity + ipEcho + geo）
- id: `P0-Proxy-2`
- status: `DONE`
- owner: `Codex`
- scope: 节点测试除 latency 外，增加出口 IP 探测与 geo（国家/时区）结果，作为联动与一致性输入
- acceptance:
  - 返回结构化结果：ok/latency/ip/geo/failReason
  - 能把 ip/geo 落到 health 信息里供 UI 使用

### P0-Proxy-3：环境联动（proxy geo -> fingerprint timezone/language/geo）+ 启动拦截
- id: `P0-Proxy-3`
- status: `DONE`
- owner: `Codex`
- scope: 选择节点/组后，若 fingerprint 处于 Auto 且策略允许，自动写入 timezone/language/geo；启动前校验不一致则 block/warn/autofix
- acceptance:
  - Auto 模式下能自动对齐 timezone（最小要求）
  - mismatch 时能阻止启动或给出一键修复

### P1-Proxy-4：Clash/Sing-box 订阅支持
- id: `P1-Proxy-4`
- status: `DONE`
- owner: `Codex`
- scope: 增加 Clash YAML / sing-box JSON 订阅解析（最小可用：socks/http/trojan），并在 UI 订阅导入流程中复用统一解析器
- acceptance:
  - 至少支持常见节点类型与分组信息
  - 不破坏现有 v2rayN 导入流程

### P1-Proxy-5：节点生命周期管理（去重、失效、回滚订阅快照、etag/last-modified）
- id: `P1-Proxy-5`
- status: `DONE`
- owner: `Codex`
- scope: 引入订阅增量更新（etag/last-modified 条件请求）、节点去重与稳定 nodeId（基于订阅解析器输出），订阅更新时保留旧节点 enable/latency/ipInfo 等运行态字段
- acceptance:
  - 更新订阅后 nodeId 稳定，不会造成 profile 意外断连
  - 回滚可恢复到上一次可用快照

---

## P0-SEC：安全加固（API / XSS / IPC）

### SEC-2：API Server 加认证 + 收紧 CORS
- id: `SEC-2`
- status: `DONE`
- owner: `Codex`
- scope: 新增 `apiToken` 并要求请求 header 携带；CORS 仅允许 `Origin: null`（file://）或无 Origin；对非法 JSON 返回 400；限制 body 大小，避免内存 DoS
- acceptance:
  - `npm run regression:all` PASS
  - 浏览器页面无法跨站读取/调用 API（无 token 返回 401/403）
  - 外部客户端携带 token 可正常 CRUD profiles

### SEC-3：Renderer XSS 防护（escapeHtml）
- id: `SEC-3`
- status: `DONE`
- owner: `Codex`
- scope: 将 profile 名称/标签/路径/错误信息等插入 `innerHTML` 的位置做 HTML/属性转义，避免注入；不改变原有 UI 布局
- acceptance:
  - profile name 含 `<img onerror=...>` 只显示文本，不执行
  - `npm run regression:all` PASS

### SEC-4：Preload invoke 白名单
- id: `SEC-4`
- status: `DONE`
- owner: `Codex`
- scope: `electronAPI.invoke` 限制可调用的 channel 集合（与 renderer 实际使用对齐），拒绝未知 channel
- acceptance:
  - 现有 UI 功能不回归
  - 未在白名单的 channel 调用被拒绝

### BUG-2：API stop 正确关闭 browser
- id: `BUG-2`
- status: `DONE`
- owner: `Codex`
- scope: 修复 `/api/profiles/:id/stop`：关闭 Puppeteer browser + 停 proxy；移除无效 `chromePid`
- acceptance:
  - stop 后 Chrome 窗口关闭、进程不残留
  - `npm run regression:all` PASS

### MAINT-2：忽略 logs/ 运行产物
- id: `MAINT-2`
- status: `DONE`
- owner: `Codex`
- scope: 将运行期产物 `logs/` 加入 `.gitignore`，避免污染 `git status`
- acceptance:
  - 重新生成报告/日志后，`git status` 不出现 `logs/` untracked

### SEC-5：fetch-url 只允许 http/https + 超时
- id: `SEC-5`
- status: `DONE`
- owner: `Codex`
- scope: `fetch-url` / `fetch-url-conditional` 增加 URL 协议白名单（仅 http/https）与 20s 超时，降低 SSRF/卡死风险
- acceptance:
  - `npm run regression:all` PASS
  - 非 http/https URL 返回可读错误

### SEC-6：Puppeteer 默认开启 Sandbox + 不禁用 Site Isolation
- id: `SEC-6`
- status: `DONE`
- owner: `Codex`
- scope: 移除默认 `--no-sandbox` 与 `--disable-features=IsolateOrigins,site-per-process`；仅在 Linux root 场景下自动追加 no-sandbox（其余环境如需可用自定义启动参数开启）
- acceptance:
  - `npm run regression:all` PASS
  - 手动验证：`npm start` 启动并 launch profile 正常

### BUG-3：LeakCheck 写盘目录在打包后可写
- id: `BUG-3`
- status: `DONE`
- owner: `Codex`
- scope: `run-leak-check` 在 dev 写入 repo `logs/`，在打包后写入 `DATA_PATH/logs/`，避免 app.asar 目录不可写导致失败
- acceptance:
  - `npm run regression:all` PASS
  - 打包后 LeakCheck 可生成报告并可从 UI 打开

### SEC-7：API Token 在设置页可见 + 一键复制
- id: `SEC-7`
- status: `DONE`
- owner: `Codex`
- scope: 在 API 设置区展示 `X-GeekEZ-API-Token`，并提供复制按钮；补齐 i18n 文案
- acceptance:
  - 启用 API 后可在设置页看到 token
  - 点击复制提示 `apiTokenCopied`

### DOC-2：README 补充 API Token 使用说明
- id: `DOC-2`
- status: `DONE`
- owner: `Codex`
- scope: 更新 `README.md` 与 `docs/README_zh.md`，说明 API 需携带 `X-GeekEZ-API-Token` 并给出 curl 示例
- acceptance:
  - 文档包含 header 名称 `X-GeekEZ-API-Token`
  - 给出 curl 示例

### SEC-8：Updater 下载校验 + Zip-Slip 防护（Xray 更新）
- id: `SEC-8`
- status: `DONE`
- owner: `Codex`
- scope: `download-xray-update` 下载仅允许 `https` + host allowlist + 重定向/大小/超时限制；zip 文件头校验 + sha256；解压采用逐 entry 解包并做 Zip-Slip 防护（禁止绝对路径/盘符/`..` 穿越），限制 entry 数/解包总大小；解压后对 xray 二进制做 size + magic sanity check；增加回归脚本 `regression:updater`
- acceptance:
  - `npm run regression:all` PASS
  - `npm run regression:updater` PASS
  - Zip-Slip 构造（`../evil.txt`、`/abs.txt`）不会写出目标目录且会被拒绝
  - 非 zip 文件会被拒绝（header 校验失败）

### SEC-9：Export 选择器去 innerHTML 拼接 + 去 inline handlers
- id: `SEC-9`
- status: `DONE`
- owner: `Codex`
- scope: `renderExportProfileList` 改为 DOM `createElement` + `addEventListener`，移除 `onmouseover/onmouseout/onchange` 与拼接 HTML，使用 `textContent` 渲染 name/tags，降低 XSS/属性注入风险
- acceptance:
  - 手动验证：打开导出选择器，默认全选/单选/全选切换与计数正常
  - `npm run regression:all` PASS

### SEC-10：Profile 列表去 innerHTML 拼接 + 事件委托（loadProfiles）
- id: `SEC-10`
- status: `DONE`
- owner: `Codex`
- scope: `loadProfiles` 改为 DOM `createElement` 渲染（profile 卡片不再拼接 `innerHTML`）；移除 `onclick/onchange` inline handlers，改用 `data-action` + 列表容器事件委托；保证按钮（launch/restart/edit/open log/rotated/clear logs/leakcheck/delete）与 quick-switch 下拉行为不回归；Leak/Err tag 点击逻辑保持
- acceptance:
  - 手动验证：Profile 列表所有按钮可用，quick-switch 选择后会更新 preProxyOverride
  - 手动验证：Leak tag（有报告时）可打开报告；Err tag 可打开日志
  - `npm run regression:all` PASS

### SEC-11：Proxy Manager 列表去 innerHTML 拼接 + DOM 事件绑定（renderProxyNodes）
- id: `SEC-11`
- status: `DONE`
- owner: `Codex`
- scope: `renderProxyNodes` 的节点行改为 DOM `createElement` 渲染（不再拼接 `div.innerHTML` / inline `onclick/onchange`）；测试按钮用 `data-proxy-action/data-proxy-id` 标注并更新 `testSingleProxy/testCurrentGroup` 的按钮定位逻辑；保留 single/balance/failover 选择行为与样式
- acceptance:
  - 手动验证：Proxy Manager 列表的 radio/checkbox 切换、Test/Edit/Delete 按钮行为正常，Test 时按钮会显示 `...`
  - `npm run regression:all` PASS

### SEC-12：City/Language/Timezone 下拉去 innerHTML 拼接（populateDropdown）
- id: `SEC-12`
- status: `DONE`
- owner: `Codex`
- scope: `initCustomCityDropdown` / `initCustomLanguageDropdown` / `initCustomTimezoneDropdown` 的 `populateDropdown` 改为 DOM `createElement` 渲染（不再用 `dropdown.innerHTML = ...`），避免属性注入与潜在 XSS；保持键盘上下选择/回车选择/点击选择行为一致
- acceptance:
  - 手动验证：新增/编辑 Profile 的 City/Language/Timezone 下拉可正常筛选与选择（键盘/鼠标都可）
  - `npm run regression:all` PASS

---

## P0-Proxy：代理节点类型扩展（订阅/内核/测试）

### P0-Proxy-6：订阅解析支持更多节点类型（Clash YAML / sing-box JSON）
- id: `P0-Proxy-6`
- status: `DONE`
- owner: `Codex`
- scope: 扩展 `parse-subscription`：Clash YAML 与 sing-box JSON 支持 `ss/vmess/vless/hysteria2/tuic`（以及 trojan/ws/grpc 参数映射）；确保输出仍是可用的 share link（`raw`）并保持稳定 nodeId
- acceptance:
  - `node scripts/e2e_subscription_parser.js` PASS
  - `npm run regression:all` PASS

### P0-Proxy-7：sing-box 支持 hysteria2 / tuic share link
- id: `P0-Proxy-7`
- status: `DONE`
- owner: `Codex`
- scope: `ProxySpec -> sing-box config` 增加 `hysteria2://` / `tuic://` 的最小映射（含 sni/insecure/alpn/obfs/up/down 常用参数）
- acceptance:
  - `npm run regression:ipc` PASS（包含 `sing-box check`）
  - `npm run regression:all` PASS

### P0-Proxy-8：Proxy Test 自动回退到 sing-box + IP/Geo 走本地 Socks
- id: `P0-Proxy-8`
- status: `DONE`
- owner: `Codex`
- scope: `test-proxy-node` / `testProxyNodeInternal`：优先 xray，失败时回退 sing-box；并让 `ipify/ipapi` 探测通过本地 socks 代理，确保 geo/timezone 联动依据真实出口
- acceptance:
  - `npm run regression:all` PASS

### P0-Proxy-9：PreProxy 启动接通（xray/sing-box）+ h2 传输映射补齐
- id: `P0-Proxy-9`
- status: `DONE`
- owner: `Codex`
- scope: launch 时将选出的 `preProxyConfig` 实际传入代理引擎；sing-box 支持 preProxy 通过 detour 链接；补齐 vless/trojan `type=h2` 的 sing-box transport 映射；sing-box JSON 导入 http+tls 输出为 https share link
- acceptance:
  - `npm run regression:all` PASS

### P0-Proxy-10：sing-box 节点类型扩展（wireguard / shadowtls / hysteria(v1) / ss+plugin）
- id: `P0-Proxy-10`
- status: `DONE`
- owner: `Codex`
- scope: 扩展订阅解析与 sing-box 映射，补齐更多常见节点类型：
  - Clash YAML：`ss+plugin(v2ray-plugin)`、`shadowtls`、`hysteria(v1)`、`wireguard`
  - sing-box JSON：识别 `shadowsocks + detour shadowtls`、`shadowsocks plugin`、`hysteria(v1)`、`wireguard`
  - sing-box config：支持 `hysteria://`、`ss://?plugin=...`、以及 `sb://`（单 outbound 与 bundle）
  - Proxy Test：对 `sb://` / `hysteria://` / `ss?plugin=` 优先走 sing-box
  - 兼容性：wireguard outbound 在 sing-box 1.12.x 需要 `ENABLE_DEPRECATED_WIREGUARD_OUTBOUND=true`，启动时自动注入
- acceptance:
  - `node scripts/e2e_subscription_parser.js` PASS
  - `node scripts/regression_ipc.js` PASS（包含 `sing-box check`）

### P0-Proxy-11：SOCKS/HTTP 认证解析兼容（base64 / percent-encoding / curl 片段）
- id: `P0-Proxy-11`
- status: `DONE`
- owner: `Codex`
- scope:
  - 修复 xray socks outbound 的 user/pass 解析：优先标准 `user:pass@`，仅在无 password 时再尝试 base64(v2rayN)
  - 对 socks/http/vless/trojan 的 URL userinfo 做 percent-decode，避免凭证包含特殊字符时认证失败
  - 代理输入 normalize 支持 `scheme://host:port -U user:pass` 这种 URL + 参数混合形式
- acceptance:
  - `node scripts/regression_proxy_parser.js` PASS
  - `npm run regression:all` PASS

### SEC-13: Electron renderer isolation hardening (CSP + sandbox + navigation lock)
- id: `SEC-13`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add strict CSP meta and referrer policy in `index.html`
  - Enable `webPreferences.sandbox` and disable `webviewTag` in main window
  - Block renderer-driven navigation/redirect/new-window to non-app URLs
  - Deny runtime renderer permission requests by default
  - Add preload-side trusted-origin gate for IPC bridge usage
- acceptance:
  - `npm run regression:all` PASS
  - `node -e "new Function(require('fs').readFileSync('main.js','utf8'))"` PASS
  - `node -e "new Function(require('fs').readFileSync('preload.js','utf8'))"` PASS

### SEC-14: Subscription fetch SSRF guard for localhost/private network
- id: `SEC-14`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add URL policy module to validate protocol and block localhost/private-network targets for `fetch-url` and `fetch-url-conditional`
  - Include literal IP checks (IPv4/IPv6 + mapped IPv4) and localhost domain checks (`localhost`, `*.localhost`)
  - Optional DNS resolution check to reject domains resolving to private addresses (non-security DNS failures do not hard-fail)
  - Add dedicated regression script `scripts/regression_url_policy.js` and wire into `scripts/regression_all.js`
- acceptance:
  - `node scripts/regression_url_policy.js` PASS
  - `npm run regression:all` PASS

### SEC-15: Redirect-chain SSRF hardening for subscription fetch
- id: `SEC-15`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `security/fetchPolicy.js` to force manual redirect handling for subscription fetch requests
  - Re-validate every redirect hop with URL policy before follow (prevents external -> localhost/private redirect bypass)
  - Limit redirect chain length (max redirects) and reject malformed redirect responses without `Location`
  - Add `scripts/regression_fetch_policy.js` and include it in `scripts/regression_all.js`
- acceptance:
  - `node scripts/regression_fetch_policy.js` PASS
  - `npm run regression:all` PASS

### SEC-16: Controlled private-source allowlist for subscription fetch
- id: `SEC-16`
- status: `DONE`
- owner: `Codex`
- scope:
  - Keep private-network fetch blocked by default, but allow explicit exceptions via settings key `subscriptionPrivateAllowlist` (array)
  - Support exact host/IP and wildcard hostname entries like `*.localhost`
  - Apply allowlist across both direct URL checks and redirect-hop checks
  - Extend URL policy regression cases for allowlist behavior
- acceptance:
  - `node scripts/regression_url_policy.js` PASS
  - `npm run regression:all` PASS

### SEC-17: UI wiring for subscription private allowlist
- id: `SEC-17`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add Settings UI field to edit `subscriptionPrivateAllowlist` in a safe, explicit way
  - Validate/normalize allowlist entries client-side before save (exact host/IP and `*.domain`)
  - Normalize allowlist entries server-side in `save-settings`/`get-settings` before persistence/use
  - Add i18n strings for allowlist section and save/validation feedback
- acceptance:
  - Open Settings and save allowlist entries without manual file editing
  - `node scripts/regression_url_policy.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-004: Proxy test UI detail panel (steps/attempts)
- id: `PT-SSOT-004`
- status: `DONE`
- owner: `Codex`
- scope:
  - Persist structured `lastTestResult` onto proxy nodes after test runs
  - Upgrade proxy node list with a details toggle and expandable panel
  - Render per-step and per-attempt detail lines using DOM APIs (no `innerHTML`)
  - Preserve detail payload during subscription refresh (stable node id reuse)
- acceptance:
  - Click proxy `Detail` to view status/code/engine/duration + steps/attempts entries
  - `node -e "new Function(require('fs').readFileSync('renderer.js','utf8'))"` PASS
  - `npm run regression:all` PASS

### PT-SSOT-005: Proxy batch scheduler strategy v1
- id: `PT-SSOT-005`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `proxy/testScheduler.js` for normalized strategy + budget-aware scheduler
  - Support configurable `maxConcurrency/batchSize/budgetMs/backoffBaseMs`
  - Add proxy modal strategy controls and persist under `proxyBatchTestStrategy`
  - Normalize scheduler settings in main process `get-settings/save-settings`
  - Add regression script `scripts/regression_proxy_scheduler.js`
- acceptance:
  - `node scripts/regression_proxy_scheduler.js` PASS
  - `node -e "require('./proxy/testScheduler'); console.log('ok')"` PASS
  - `npm run regression:all` PASS

### PT-SSOT-103: Proxy test report export + diagnostics
- id: `PT-SSOT-103`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add report builder `proxy/testReport.js` for summary/failure distribution/protocol-engine breakdown
  - Support JSON/CSV serialization with diagnostic suggestions from `finalCode`
  - Add IPC `export-proxy-test-report` and renderer entry from proxy modal
  - Wire preload channel allowlist for secure invoke
  - Add regression script `scripts/regression_proxy_test_report.js`
- acceptance:
  - Proxy modal supports one-click export of current-group report (JSON/CSV)
  - `node scripts/regression_proxy_test_report.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-201: Competitor replay comparison framework
- id: `PT-SSOT-201`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `proxy/replayComparator.js` for normalized replay dataset parsing and diff scoring
  - Add `scripts/proxy_replay_compare.js` to generate JSON + Markdown compare artifacts
  - Include format/speed/flow parity metrics and protocol-level pass rate comparison
  - Add `scripts/regression_proxy_replay_compare.js` and wire into `scripts/regression_all.js`
- acceptance:
  - `node scripts/regression_proxy_replay_compare.js` PASS
  - `node scripts/proxy_replay_compare.js --baseline=<json> --candidate=<json>` produces report files
  - `npm run regression:all` PASS

### PT-SSOT-203: Replay parity gate scoring
- id: `PT-SSOT-203`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add parity gate scoring in `proxy/replayComparator.js` across format/flow/stability/speed
  - Extend replay Markdown with gate section and dimension-level pass/score table
  - Extend CLI output in `scripts/proxy_replay_compare.js` with `gate` and `score`
  - Extend regression assertions for parity gate fields and expected fail case
- acceptance:
  - `node scripts/regression_proxy_replay_compare.js` PASS
  - `node scripts/proxy_replay_compare.js --baseline=<json> --candidate=<json>` prints gate+score
  - `npm run regression:all` PASS

### PT-SSOT-104: Proxy batch speed optimization + SLO benchmark
- id: `PT-SSOT-104`
- status: `DONE`
- owner: `Other-Agent` (claimed externally)
- scope:
  - Upgrade `proxy/testScheduler.js` with adaptive runtime options (`ctx.runtimeOptions`) and protocol bucket ordering
  - Add runtime knob `probeParallelism` across UI (`index.html`/`renderer.js`) and main test runtime (`main.js`)
  - Support parallel connectivity probes and concurrent IP/GEO probing in proxy test flow
  - Add scheduler benchmark script `scripts/benchmark_proxy_scheduler.js` with recommendation matrix output
  - Add benchmark simulation-time scaling so backoff/budget behavior matches logical SLO evaluation
- acceptance:
  - `node scripts/regression_proxy_scheduler.js` PASS
  - `npm run regression:all` PASS
  - `npm run benchmark:proxy-scheduler` PASS (single-node + batch SLO pass)
  - `node scripts/benchmark_proxy_scheduler.js --out=.context-snapshots/proxy-benchmark.json` PASS

### PT-SSOT-202: Proxy automated quality gate (coverage + SLO)
- id: `PT-SSOT-202`
- status: `DONE`
- owner: `Other-Agent` (claimed externally)
- scope:
  - Add unified quality gate script `scripts/proxy_quality_gate.js` for protocol coverage, error-code coverage, and SLO checks
  - Enforce protocol coverage from `proxy/protocolMatrix.js` and error-code diagnostic coverage from `proxy/testReport.js`
  - Run benchmark gate via `scripts/benchmark_proxy_scheduler.js` and persist artifacts under `.context-snapshots/proxy-quality-gate/`
  - Add CI workflow `.github/workflows/proxy-quality-gate.yml` to block PRs when gate fails
  - Add npm entrypoint `quality-gate:proxy`
- acceptance:
  - `npm run quality-gate:proxy` PASS
  - Gate report generated: `.context-snapshots/proxy-quality-gate/report.json`
  - `npm run regression:all` PASS
  - PR workflow includes `Run proxy quality gate` step and fails on non-zero exit

### PT-SSOT-204: CI gate result linkage + visual summary
- id: `PT-SSOT-204`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `scripts/proxy_quality_gate.js` to generate Markdown summary (`report.md`) from gate JSON result
  - Add artifact metadata and benchmark linkage into gate report output
  - Update `.github/workflows/proxy-quality-gate.yml` to publish gate summary into `GITHUB_STEP_SUMMARY`
  - Update workflow to upload `.context-snapshots/proxy-quality-gate` artifacts with `actions/upload-artifact@v4`
  - Add collaborative decision packet for implementation traceability
- acceptance:
  - `npm run quality-gate:proxy` PASS and generates both `report.json` + `report.md`
  - Workflow has `Publish gate summary` and `Upload gate artifacts` steps (`if: always()`)
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-204-2026-02-06.md`

### PT-SSOT-205: Socks probe reliability + silent subscription update
- id: `PT-SSOT-205`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update `proxy/probeProfiles.js` to use HTTPS-first ladder for `socks/socks5/socks5h/http/https/legacy-hostport`
  - Ensure socks-like protocols keep at least 2 probes in `main.js` (`resolveConnectivityProbeList`) even under adaptive pressure
  - Change periodic subscription refresh to non-blocking UX in `renderer.js` (`updateSubscriptionNodes(sub, { silent: true })`)
  - Keep manual subscription update behavior explicit while avoiding startup modal interruption
- acceptance:
  - `node scripts/regression_probe_profiles.js` PASS
  - `node scripts/regression_all.js` PASS
  - Quick socks profile probes are HTTPS-first in regression assertions

### PT-SSOT-206: Quality gate trend history + threshold versioning
- id: `PT-SSOT-206`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add threshold config file `scripts/config/proxy_quality_gate.thresholds.json`
  - Refactor `scripts/proxy_quality_gate.js` to load thresholds from file with env override support
  - Persist quality gate history into `.context-snapshots/proxy-quality-gate/history.jsonl`
  - Compute trend metrics (pass rate / rolling window / batch logical duration) and expose in `report.json` + `report.md`
  - Add helper regression `scripts/regression_proxy_quality_gate.js` and wire it into `scripts/regression_all.js`
- acceptance:
  - `npm run quality-gate:proxy` PASS with threshold version shown in logs
  - Artifacts include `.context-snapshots/proxy-quality-gate/history.jsonl` and `report.md` history section
  - `node scripts/regression_proxy_quality_gate.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-206-2026-02-06.md`

### PT-SSOT-207: Threshold lifecycle governance + release audit flow
- id: `PT-SSOT-207`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add threshold-audit core module `scripts/lib/proxy_gate_threshold_audit.js` for version format checks and SHA-256 digest verification
  - Add standalone CLI `scripts/proxy_gate_threshold_audit.js` and npm command `audit:proxy-gate-thresholds`
  - Add audit registry `docs/proxy_quality_gate_threshold_audit.json` and enforce `version + digest` match before gate pass
  - Integrate threshold audit checks into `scripts/proxy_quality_gate.js` report output (`checks.thresholdAudit`, threshold digest metadata)
  - Add `scripts/regression_proxy_gate_audit.js` and wire it into `scripts/regression_all.js`
  - Update CI workflow `.github/workflows/proxy-quality-gate.yml` to run strict audit before `quality-gate:proxy`
- acceptance:
  - `npm run regression:proxy-gate-audit` PASS
  - `npm run audit:proxy-gate-thresholds` PASS
  - `npm run quality-gate:proxy` PASS with threshold audit summary
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-207-2026-02-06.md`

### PT-SSOT-208: Proxy Manager UX refresh + i18n toggle resiliency
- id: `PT-SSOT-208`
- status: `DONE`
- owner: `Codex`
- scope:
  - Re-layout Proxy Manager modal into benchmark-style operation zones in `index.html` (controls / group summary / strategy / list / footer)
  - Add group-level runtime stats in `renderer.js` (`PASS/FAIL/WAIT/AVG/P95`) for faster batch-test triage
  - Upgrade node-row visual hierarchy and latency state classes for better readability during large-node testing
  - Harden language switching in `renderer.js` using `window.curLang` + safe translator + fallback, and expose explicit CN/EN button feedback
  - Add regression script `scripts/regression_i18n_toggle_behavior.js` and wire into `scripts/regression_all.js`
- acceptance:
  - Proxy Manager reflects group statistics and clearer node result states without changing test backend interfaces
  - CN/EN toggle updates UI text immediately and no longer appears non-responsive
  - `node scripts/regression_i18n_toggle_behavior.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-209: Proxy Manager filter/sort pipeline + benchmark snapshot compare
- id: `PT-SSOT-209`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add list-level controls in Proxy Manager: keyword search, status filter, sort strategy, clear filters
  - Add deterministic renderer pipeline `applyProxyListFilterAndSort` to support competitor-style quick triage (fail-first / latency ranking / latest-test sorting)
  - Add benchmark snapshot compare line with delta metrics (`passRate`, `avgLatency`, `p95Latency`)
  - Persist per-user list view state and per-group snapshot data via localStorage keys (`proxyListViewState`, `proxyBenchmarkSnapshotByGroup`)
  - Add UI regression script `scripts/regression_proxy_manager_ui.js` and include in aggregate regression run
- acceptance:
  - Operators can isolate failed or pending nodes in one click and reorder by latency/test recency without mutating source node order
  - Snapshot button stores current group baseline and delta line updates after subsequent tests
  - Reopen app retains search/filter/sort preferences
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-210: Proxy Manager multi-keyword query presets + failure-code mini-chart
- id: `PT-SSOT-210`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add grouped keyword parsing (`space=AND`, `|=OR`) in `renderer.js` for multi-keyword triage queries
  - Add one-click query preset actions in `index.html` + `renderer.js` (`FAIL network`, `FAIL tls`, `FAIL auth`, `WAIT retry`, `SLOW latency`)
  - Persist and reflect preset-aware list state in `proxyListViewState` (`preset` + existing search/status/sort)
  - Add failure-code distribution mini-chart in Proxy Manager group header (`proxyFailCodeMiniChart`) with top-N + OTHER aggregation
  - Extend `scripts/regression_proxy_manager_ui.js` to guard preset actions, parser, and mini-chart renderer wiring
- acceptance:
  - Operators can apply common triage presets in one click and still refine with manual multi-keyword search
  - Failure-code mini-chart updates with current group test outcomes and empty-state fallback
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-210-2026-02-06.md`

### PT-SSOT-211: Proxy Manager failure trend timeline + preset-set portability
- id: `PT-SSOT-211`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add custom preset-set persistence in `renderer.js` (`proxyCustomQueryPresets`) with normalize/limit/unique-key safeguards
  - Add preset-set actions in Proxy Manager (`save current`, `export set`, `import set`) and render dynamic custom preset buttons
  - Add failure-code trend timeline store (`proxyFailCodeTrendByGroup`) with group-level deduped snapshots
  - Render compact timeline chips in Proxy Manager group header (`proxyFailTrendTimeline`) alongside failure mini-chart
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for preset portability actions, custom preset container, and trend timeline renderer wiring
- acceptance:
  - Operators can save current query as custom preset and re-apply it in one click
  - Operators can export/import preset sets between environments
  - Failure trend timeline shows recent per-group fail evolution with top-code hints
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-211-2026-02-06.md`

### PT-SSOT-212: Signed preset bundle + trend snapshot export
- id: `PT-SSOT-212`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add signed preset bundle lifecycle in `renderer.js` (`buildSignedProxyPresetBundle`, `verifySignedProxyPresetBundle`) based on stable JSON canonicalization + SHA-256 digest
  - Upgrade preset-set export/import flow to emit signature metadata and verify signature on import when present
  - Add trend snapshot export action in Proxy Manager (`export-proxy-trend-snapshot`) for current group metrics/distribution/timeline payloads
  - Add per-group node accessor reuse (`getCurrentProxyGroupNodeList`) and keep snapshot/trend export aligned to same source set
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for signature pipeline and trend export action wiring
- acceptance:
  - Exported preset set contains signature fields and import path validates hash integrity
  - Operators can export current group trend snapshot as structured payload for collaboration sharing
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-212-2026-02-06.md`

### PT-SSOT-214: Preset bundle trust policy + trend snapshot import/merge
- id: `PT-SSOT-214`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add explicit preset trust policy state (`signed_preferred` / `signed_only` / `permissive`) with Proxy Manager selector and local persistence
  - Enforce trust policy in preset import flow while retaining signature verification behavior
  - Add trend snapshot import action and parser (`JSON/base64`) in Proxy Manager
  - Add deduped bounded trend merge helper for cross-session/cross-user timeline consolidation
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for trust policy selector + trend import action + merge/import helper wiring
- acceptance:
  - Signed-only policy blocks unsigned preset bundles during import
  - Trend snapshot import merges points into current store without duplicate inflation
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-214-2026-02-06.md`

### PT-SSOT-215: Preset trust key pinning + trend diff visualization
- id: `PT-SSOT-215`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add signer key lifecycle in renderer (`proxyPresetSignerKeyId`) and include `signerKeyId` in exported preset signature metadata
  - Add pinned signer key set management (`proxyPresetPinnedKeys`) with validation and persistence
  - Enforce key pinning checks during preset import when pinned list is configured
  - Add trend diff pack computation/rendering based on latest trend points (`Δfail/Δpass/Δavg/Δp95` + top-code shift)
  - Add Proxy Manager actions for pin/signer management and trust summary panel
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for pinning controls, diff-pack UI, and related wiring
- acceptance:
  - Pinned signer key list can block unpinned bundle imports
  - Trend diff pack appears when at least two trend points exist
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-215-2026-02-06.md`

### PT-SSOT-217: Signed bundle issuer policy templates + trend anomaly badges
- id: `PT-SSOT-217`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add issuer policy template lifecycle (`strict_local` / `strict_current` / `bootstrap_permissive`) with local persistence and one-click apply actions in Proxy Manager
  - Include `issuerPolicyTemplate` metadata in signed preset bundle signature and surface template compatibility warnings during import
  - Keep manual trust/pin/signer edits as `custom` template state to prevent hidden policy drift
  - Add trend anomaly badge pack (`critical/warn/good/info`) derived from trend diff deltas (`fail/pass/avg/p95/topCode`)
  - Render anomaly badge UI block in Proxy Manager and include anomaly badges in trend snapshot export payload
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for issuer-template controls/action wiring and anomaly badge renderer hooks
- acceptance:
  - Operators can apply issuer policy templates to update trust policy/pins/signer settings in one action
  - Signed bundle import shows template metadata and warns on template mismatch without breaking backward compatibility
  - Trend anomaly badges render from latest trend diff and distinguish regression/improvement severity
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-217-2026-02-06.md`

### PT-SSOT-219: Policy drift audit export + anomaly history rollup
- id: `PT-SSOT-219`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add policy drift audit model for issuer template trust config (`template/trustPolicy/signer/pinnedKeys`) with mismatch breakdown
  - Add drift summary UI (`#proxyPresetPolicyDrift`) and one-click export action (`export-proxy-policy-drift-audit`)
  - Add per-group anomaly history store (`proxyTrendAnomalyHistoryByGroup`) with dedupe + bounded retention
  - Add anomaly history rollup builder (`severityTotals/latest/rows`) and export action (`export-proxy-anomaly-rollup`)
  - Render anomaly history chips (`#proxyTrendAnomalyHistory`) alongside current anomaly badges
  - Extend trend snapshot export payload with anomaly history for collaboration handoff
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for new controls/actions/helpers
- acceptance:
  - Policy drift export payload includes expected/current state and drift items
  - Anomaly history rollup export includes severity aggregation and latest history context
  - Proxy Manager shows live policy drift summary and anomaly history tags
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-219-2026-02-06.md`

### PT-SSOT-220: Trust preset provenance diff + anomaly replay export
- id: `PT-SSOT-220`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add preset provenance history store (`proxyPresetProvenanceHistory`) with import/export snapshots and bounded retention
  - Add provenance diff builder for latest two snapshots (`added/removed/changed preset keys + trust-field changes`)
  - Add provenance summary UI (`#proxyPresetProvenanceDiff`) and one-click export action (`export-proxy-preset-provenance`)
  - Auto-record preset provenance on preset-set export/import success paths
  - Add anomaly replay payload builder (`buildProxyTrendAnomalyReplayPayload`) from anomaly history + nearest trend points
  - Add replay export action (`export-proxy-anomaly-replay`) for collaboration replay handoff
  - Extend `scripts/regression_proxy_manager_ui.js` assertions for provenance/replay controls and action/helper wiring
- acceptance:
  - Preset provenance export includes history and latest diff payload
  - Proxy Manager shows live provenance delta summary after import/export events
  - Anomaly replay export includes replay frames bound to trend context
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-220-2026-02-06.md`

### PT-SSOT-221: Provenance trust gate automation + anomaly replay import/merge
- id: `PT-SSOT-221`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add automated trust-gate evaluator (`buildAutomatedProxyPresetTrustGateDecision`) for preset imports, combining policy/pin constraints with provenance-history heuristics
  - Persist trust-gate decision metadata (`allow/warn/block` + reasons) in provenance snapshots to keep audit trail aligned with import outcomes
  - Add trust-gate status summary UI (`#proxyPresetTrustGateStatus`) and include latest trust-gate snapshot in provenance export payload
  - Add anomaly replay import/merge pipeline (`parseProxyTrendAnomalyReplayPayload`, `importProxyTrendAnomalyReplay`)
  - Merge replay payload into both trend history (`proxyFailCodeTrendByGroup`) and anomaly history (`proxyTrendAnomalyHistoryByGroup`) with dedupe + retention limits
  - Add UI action wiring (`import-proxy-anomaly-replay`) and extend `scripts/regression_proxy_manager_ui.js` guards
- acceptance:
  - Preset import path is automatically gated with provenance-aware decisioning and blocks suspicious unsigned/signer-mismatch cases
  - Latest trust-gate decision is visible in Proxy Manager and exported with provenance payloads
  - Anomaly replay payload can be imported and merged back into trend/anomaly stores for async collaboration replay
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-221-2026-02-06.md`

### PT-SSOT-222: Cross-group replay routing + trust-gate exception audit trail
- id: `PT-SSOT-222`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add replay routing strategy selector (`payload` / `mapped` / `current`) with local persistence
  - Add replay route map management workflow (`manageProxyReplayRouteMap`) for source-group to target-group routing
  - Route anomaly replay imports through resolver (`resolveProxyReplayImportTargetGroup`) and include route decision in merge feedback
  - Add trust-gate exception audit trail store (`proxyTrustGateExceptionAuditTrail`) for warning/block decisions during preset import
  - Add trust exception summary UI (`#proxyTrustGateAuditSummary`) and one-click export action (`export-proxy-trust-gate-audit`)
  - Extend provenance export payload with trust exception audit context for async collaboration review
  - Extend `scripts/regression_proxy_manager_ui.js` for routing/audit controls, helpers, and action wiring
- acceptance:
  - Cross-group replay import can be routed by payload id, route map, or current group without manual JSON edits
  - Trust-gate warn/block outcomes are retained in a searchable/exportable audit trail
  - Proxy Manager surfaces both replay route summary and trust exception summary in advanced panel
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-222-2026-02-06.md`

### PT-SSOT-223: Issuer-template remediation suggestions + replay route drift detection
- id: `PT-SSOT-223`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add issuer remediation suggestion model (`buildProxyIssuerTemplateRemediationSuggestion`) driven by trust-gate decisions + issuer-template warnings
  - Persist and render remediation hint (`proxyIssuerRemediationHint`) with one-click apply action (`apply-proxy-issuer-remediation`)
  - Add replay route drift detection/recording (`detectProxyReplayRouteDrift`) and bounded drift store (`proxyReplayRouteDriftTrail`)
  - Add replay route drift summary UI (`#proxyReplayRouteDriftSummary`) and export action (`export-proxy-replay-route-drift`)
  - Extend trust-gate audit payload with replay drift + remediation context and keep provenance export linked to trust audit payload
  - Extend `scripts/regression_proxy_manager_ui.js` for remediation/drift controls, helpers, and action wiring
- acceptance:
  - When trust gate warns/blocks, operator receives actionable issuer-template remediation suggestion
  - Anomaly replay import detects and records cross-group route drift events for current target group
  - Proxy Manager advanced panel shows remediation hint and replay route drift summary with export support
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-223-2026-02-06.md`

### PT-SSOT-224: Template remediation confidence scoring + route drift auto-mitigation hints
- id: `PT-SSOT-224`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add remediation confidence scoring (`computeProxyIssuerRemediationConfidence`) and confidence-level rendering for issuer remediation hints
  - Extend remediation model persistence with confidence metadata and surface score in advanced panel remediation summary
  - Extend replay drift events with auto-mitigation hints (`mitigationHint`, `recommendedMode`, `suggestedMapEntry`)
  - Add replay mitigation summary UI (`#proxyReplayRouteMitigationHint`) and one-click apply action (`apply-proxy-replay-mitigation`)
  - Extend replay route drift export payload with aggregated mitigation hints and extend trust-gate audit payload linkage
  - Extend `scripts/regression_proxy_manager_ui.js` for mitigation/confidence controls, helpers, and action wiring
- acceptance:
  - Issuer remediation hints carry confidence score/level to guide operator trust decisions
  - Replay route drift entries include actionable mitigation hints and can be applied without manual map editing
  - Proxy Manager advanced panel shows drift mitigation summary and supports one-click mitigation apply
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-224-2026-02-06.md`

### PT-SSOT-225: Trust decision explainability pack + mitigation success telemetry
- id: `PT-SSOT-225`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add trust explainability pack model/persistence (`proxyTrustExplainabilityPack`) with normalized decision/reasons, policy snapshot, bundle snapshot, heuristic list, and remediation context
  - Generate explainability pack during preset import trust-gate flows (block, template-check block, warn, allow) with explicit heuristics and reason evidence
  - Add mitigation telemetry audit store (`proxyMitigationTelemetry`) plus per-group summary/export payload helpers
  - Wire remediation actions (`apply-proxy-issuer-remediation`, `apply-proxy-replay-mitigation`) to record success/noop/failed telemetry with before/after state
  - Add advanced-panel summaries + export actions for explainability and mitigation telemetry
  - Extend `scripts/regression_proxy_manager_ui.js` to verify new controls, helpers, and action wiring
- acceptance:
  - Preset-import trust decisions produce exportable explainability packs with heuristics/policy/bundle evidence
  - Remediation/mitigation actions emit success/noop/failed telemetry records and aggregate success-rate summary
  - Proxy Manager advanced panel exposes explainability + mitigation telemetry summaries with one-click export actions
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-225-2026-02-06.md`

### PT-SSOT-226: Explainability history trail + trust/mitigation correlation export
- id: `PT-SSOT-226`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add explainability history store (`proxyTrustExplainabilityHistory`) with bounded retention and dedupe guard
  - Extend `setProxyTrustExplainabilityPack` flow to persist latest pack and append history trail
  - Add explainability history summary UI (`#proxyTrustExplainabilityHistorySummary`) with decision distribution and latest reason context
  - Extend explainability export payload with per-group history rows
  - Add trust/mitigation correlation payload builder (`buildProxyTrustMitigationCorrelationPayload`) linking mitigation telemetry outcomes to nearest explainability decision
  - Add correlation export action (`export-proxy-trust-mitigation-correlation`) and advanced-panel button
  - Extend `scripts/regression_proxy_manager_ui.js` for history/correlation controls, helpers, and action wiring
- acceptance:
  - Explainability decisions are retained as history trail and rendered per-group with latest decision context
  - Correlation export contains explainability history + mitigation telemetry and decision-level success counts
  - Proxy Manager advanced panel provides one-click trust/mitigation correlation export
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-226-2026-02-06.md`

### PT-SSOT-227: Correlation observability summary + decision success-rate readout
- id: `PT-SSOT-227`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add trust/mitigation correlation summary UI (`#proxyTrustMitigationCorrelationSummary`) in Proxy Manager advanced panel
  - Add pending-state diagnostics when explainability history exists but mitigation telemetry is not yet available
  - Add decision-level success-rate detail (warn/block) and latest correlated reason to summary tooltip
  - Add correlation summary renderer (`renderProxyTrustMitigationCorrelationSummary`) and integrate into explainability/telemetry render pipeline
  - Extend i18n keys (EN/CN) for correlation summary states/messages
  - Extend `scripts/regression_proxy_manager_ui.js` for new summary DOM node + summary renderer assertion
- acceptance:
  - Correlation summary shows rows/linked/unknown/overall success in advanced panel
  - Correlation summary displays pending hint when only explainability data exists
  - Tooltip includes warn/block success-rate details and latest correlated reason
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-227-2026-02-06.md`

### PT-SSOT-228: Correlation alert history + severity diagnostics export
- id: `PT-SSOT-228`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add trust/mitigation correlation alert history store (`proxyTrustMitigationAlertHistory`) with bounded retention and per-group filtering
  - Add alert severity evaluator (`evaluateProxyTrustMitigationAlert`) covering low-success, unknown-linkage, and block-rate degradation thresholds
  - Add advanced-panel alert summary UI (`#proxyTrustMitigationAlertSummary`) with pending/init states, latest-alert tooltip context, and history count
  - Add correlation alert export helper/payload (`buildProxyTrustMitigationAlertPayload`, `exportProxyTrustMitigationAlerts`) and wire button action `export-proxy-trust-mitigation-alerts`
  - Integrate alert summary rendering into trust/mitigation correlation refresh pipeline and dedupe repeated warn/critical history entries
  - Extend i18n (EN/CN) and `scripts/regression_proxy_manager_ui.js` assertions for alert DOM nodes, helper functions, and action wiring
- acceptance:
  - Proxy Manager advanced panel shows correlation alert severity summary (severity/success/unknown) with latest-reason diagnostics tooltip
  - Warn/critical correlation alerts are persisted per group with bounded history and can be exported with current correlation context
  - One-click export action `Export Correlation Alerts` is visible and routed to clipboard payload export
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-228-2026-02-06.md`

### PT-SSOT-229: Correlation alert trend rollup + one-click history reset
- id: `PT-SSOT-229`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add alert trend rollup helper (`buildProxyTrustMitigationAlertRollup`) with critical/warn totals, latest snapshot, and consecutive severity streak metrics
  - Add advanced-panel alert trend summary UI (`#proxyTrustMitigationAlertTrendSummary`) with localized trend diagnostics and latest-reason tooltip
  - Extend alert export payload (`buildProxyTrustMitigationAlertPayload`) with trend rollup block for downstream evidence ingestion
  - Add one-click current-group alert history reset action (`clear-proxy-trust-mitigation-alerts`) with toast/error feedback and no immediate re-record side effect
  - Reuse severity localization helper (`getProxyTrustMitigationSeverityLabel`) across alert summary/trend rendering for copy consistency
  - Extend `scripts/regression_proxy_manager_ui.js` for trend DOM node, rollup/clear helper presence, and action switch wiring
- acceptance:
  - Proxy Manager advanced panel shows alert trend rollup (critical/warn totals + streak severity) for current group history
  - Operators can clear current-group correlation alert history without deleting other groups' alert records
  - Alert export payload includes both row history and aggregated rollup diagnostics
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-229-2026-02-06.md`

### PT-SSOT-230: Updater unzip symlink-traversal guard + extraction-path hardening
- id: `PT-SSOT-230`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden ZIP extraction flow (`extractZip`) with symlink entry type detection and hard-block behavior
  - Add pre-write path guard to reject extraction when any existing segment under destination path is a symlink/junction (prevents symlink pivot traversal)
  - Switch uncompressed size budget accounting to actual extracted byte length (`entry.getData().length`) to avoid forged header-size bypass
  - Keep existing Zip-Slip absolute/path-traversal checks and compose with new symlink-based checks for defense-in-depth
  - Extend updater security regression with symlink-entry and symlink-path attack cases
  - Relax brittle profile layout regression assertions to tolerate valid action-limit tuning in collaborative branch while preserving core UI contract checks
- acceptance:
  - ZIP extraction blocks symlink entry payloads and symlink/junction path pivots under destination root
  - Updater security regression covers traversal/absolute/symlink/allowlist cases and passes
  - Full regression aggregate remains green in collaborative branch
  - `node --check updateUtils.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_profile_layout_ui.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-230-2026-02-06.md`

### PT-SSOT-231: Xray release-tag normalization + anti-downgrade enforcement
- id: `PT-SSOT-231`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add release-tag normalizer (`normalizeXrayReleaseTag`) and comparator (`compareXrayReleaseTags`) for strict `vX.Y.Z` handling
  - Harden `check-xray-update` to ignore invalid tags and reject non-upgrade versions (`<= current`) before exposing update action
  - Harden `download-xray-update` to normalize API/fallback tag sources and block downgrade install attempts explicitly
  - Extend updater security regression to assert anti-downgrade guard coverage in main-process updater flow
  - Preserve existing allowlist/digest/zip-verification update chain while adding monotonic-version safety gate
- acceptance:
  - Invalid or non-upgrade Xray release tags no longer trigger update availability
  - Download flow refuses downgrade payloads even if renderer supplies fallback URL
  - Updater regression includes static guard checks for release-tag normalization and downgrade blocking
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-231-2026-02-06.md`

### PT-SSOT-232: Asset-scoped digest parsing hardening for updater verification
- id: `PT-SSOT-232`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add reusable digest parser (`parseSha256DigestForAsset`) in `updateUtils.js` supporting OpenSSL/sha256sum/bare-hash formats
  - Normalize digest filename tokens (`normalizeDigestFileToken`) and require unique hash resolution for the target asset
  - Reject ambiguous multi-hash digest content for the same asset to prevent weak digest-selection fallback
  - Update main-process verifier to pass `assetName` into digest parsing (`parseSha256FromDgstText(dgstText, assetName)`)
  - Extend updater security regression with parser behavior checks (asset match/mismatch/ambiguous/bare hash)
  - Preserve existing allowlist + zip-header + sha256 + Zip-Slip + anti-downgrade chain
- acceptance:
  - `.dgst` parsing becomes asset-scoped and deterministic, not first-match regex only
  - Digest ambiguity for same asset fails verification instead of silently selecting one hash
  - Updater security regression covers digest parser formats and guardrails
  - `node --check updateUtils.js` PASS
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-232-2026-02-06.md`

### PT-SSOT-233: Release manifest asset-presence gate for Xray updater
- id: `PT-SSOT-233`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add release manifest resolver helpers (`resolveXrayReleaseAssetUrl`, `resolveXrayReleaseAssetManifest`) in `main.js`
  - Require latest release API response to contain both platform asset and `${assetName}.dgst` entries before advertising updater availability
  - Validate that manifest asset URLs map back to expected release tag and asset filename
  - Route download/digest URL selection through resolved manifest assets when API is available (renderer URL remains untrusted)
  - Keep fallback URL path only for API-unavailable scenario while preserving anti-downgrade + digest verification chain
  - Extend updater security regression with static assertions for manifest resolver and check-update manifest gate
- acceptance:
  - `check-xray-update` no longer returns update when required release assets are missing/ambiguous
  - `download-xray-update` prefers manifest-bound asset/digest URLs and keeps downgrade/digest protections intact
  - Updater regression verifies presence and usage of manifest resolver guards
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-233-2026-02-06.md`

### PT-SSOT-234: Extracted Xray binary uniqueness + realpath escape guard
- id: `PT-SSOT-234`
- status: `DONE`
- owner: `Codex`
- scope:
  - Replace first-hit binary search with candidate collection (`collectXrayBinaryCandidates`) and enforce exactly one extracted `xray`/`xray.exe`
  - Block ambiguous update archives by failing when multiple binary candidates are found
  - Resolve `realpath` for extraction root + selected binary and block path escape (`Resolved Xray binary escapes extracted directory`)
  - Apply binary sanity/version/copy pipeline to resolved canonical binary path only
  - Extend updater security regression with static assertions for candidate collector, ambiguity guard, and realpath escape guard
  - Preserve existing digest/Zip-Slip/manifest/anti-downgrade protections
- acceptance:
  - Update package with duplicate `xray` binaries is rejected deterministically
  - Canonicalized extracted binary path cannot escape extraction root
  - Updater regression verifies presence of binary uniqueness and realpath guards
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-234-2026-02-06.md`

### PT-SSOT-235: Xray install atomic replacement + rollback restore guard
- id: `PT-SSOT-235`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add rollback-protected installer helper (`installXrayBinaryWithRollback`) for `BIN_PATH` replacement
  - Ensure backup rename (`BIN_PATH -> BIN_PATH.old`) happens before copy and restore on failure
  - Remove direct copy path in updater flow and use rollback helper for final install step
  - Keep install target directory creation and post-install permission behavior for non-Windows
  - Extend updater security regression with static assertions for rollback helper and restore invocation
  - Preserve all existing pre-install safeguards (manifest, digest, Zip-Slip, anti-downgrade, binary sanity checks)
- acceptance:
  - Failed copy/replace path restores previous `BIN_PATH` binary from backup when available
  - Updater flow now performs atomic-style backup and rollback instead of one-way rename/copy
  - Regression checks confirm rollback helper existence and updater invocation wiring
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-235-2026-02-06.md`

### PT-SSOT-236: Post-install Xray binary integrity hash verification
- id: `PT-SSOT-236`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend rollback installer helper to capture source binary metadata/hash before replacement
  - Verify installed `BIN_PATH` file type/size/hash after copy and fail on mismatch (`Installed Xray binary sha256 mismatch`)
  - Trigger rollback restore when post-install integrity validation fails
  - Keep helper invocation unchanged in updater flow (`installXrayBinaryWithRollback(realXrayBinary)`)
  - Extend updater security regression with static assertions for source/installed hash capture and mismatch guard
  - Preserve all previous updater defenses (manifest + digest + Zip-Slip + anti-downgrade + binary sanity/version checks)
- acceptance:
  - Install path validates source and installed binary hashes and rejects corrupted/partial replacement
  - Rollback logic restores prior binary when post-install hash verification fails
  - Updater regression confirms presence of hash-verification guardrails in install helper
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-236-2026-02-06.md`

### PT-SSOT-237: Post-install executable version probe + rollback coupling
- id: `PT-SSOT-237`
- status: `DONE`
- owner: `Codex`
- scope:
  - Upgrade installer helper to async mode and support expected-version validation input
  - After copy/hash checks, execute installed `BIN_PATH -version` probe via `getXrayVersionFromBinary`
  - Reject install when installed runtime version differs from expected release tag (`Installed Xray binary version mismatch`)
  - Keep rollback restore path active for version-probe mismatch failures
  - Update updater flow invocation to pass expected release tag (`await installXrayBinaryWithRollback(realXrayBinary, { expectedVersion: remoteVer })`)
  - Extend updater security regression with static assertions for version probe + mismatch guard + updated invocation
- acceptance:
  - Installer validates not only byte-level integrity but also post-install executable version
  - Version mismatch after install triggers failure and rollback restore behavior
  - Updater regression confirms expected-version probe and invocation wiring
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-237-2026-02-06.md`

### PT-SSOT-238: Updater secure temp workspace randomization + containment guard
- id: `PT-SSOT-238`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add secure temp workspace helper (`createSecureXrayUpdateTempDir`) in `main.js`
  - Replace predictable `xray_update_${Date.now()}` temp path strategy with `fs.mkdtempSync(path.join(tempBase, 'xray_update_'))`
  - Validate canonical temp directory stays inside system temp root and fail on escape (`Resolved update temp directory escapes system temp root`)
  - Update updater cleanup paths to remove temp workspace only when temp dir creation actually succeeded
  - Extend updater security regression with static assertions for temp-dir helper, mkdtemp usage, and updater flow binding
- acceptance:
  - Updater temp workspace is randomized and created via OS-backed unique temp dir creation
  - Canonicalized temp path is verified to remain under `os.tmpdir()` before download/extract/install proceeds
  - Regression checks confirm secure temp-dir helper and invocation wiring in updater flow
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-238-2026-02-06.md`

### PT-SSOT-239: Updater single-flight lock for download-xray-update
- id: `PT-SSOT-239`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main-process single-flight guard for `download-xray-update` to prevent concurrent installs
  - Reject concurrent update requests with explicit error (`Xray update already in progress`)
  - Ensure in-progress flag is released in a `finally` block regardless of success/failure
  - Extend updater security regression with static assertions for guard + acquire/release wiring
- acceptance:
  - Concurrent `download-xray-update` invocations are blocked deterministically (no concurrent install/rollback corruption)
  - Regression confirms presence of lock guard and `finally` release semantics
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-239-2026-02-07.md`

### PT-SSOT-240: Updater staged atomic install (verify-then-rename)
- id: `PT-SSOT-240`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update installer helper `installXrayBinaryWithRollback` to stage new binary to `${BIN_PATH}.new` before swapping into place
  - Verify staged file type/size/sha256 (and version when expected) before touching `BIN_PATH`
  - Swap staged binary into place via atomic rename (`fs.renameSync(stagePath, BIN_PATH)`) inside the same directory
  - Tighten rollback semantics to avoid deleting original `BIN_PATH` unless replacement already happened
  - Extend updater security regression with static assertions for staged copy + atomic rename wiring
- acceptance:
  - Installer performs verify-then-rename to minimize partial-write risk on `BIN_PATH`
  - Rollback restoration remains deterministic on failures after backup rename
  - Regression confirms staged atomic install wiring and guardrails
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-240-2026-02-07.md`

### PT-SSOT-241: Updater cross-process lock file (multi-instance safety)
- id: `PT-SSOT-241`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add cross-process updater lock file helper (`acquireXrayUpdateFileLock` / `releaseXrayUpdateFileLock`) using `fs.openSync(lockPath, 'wx')`
  - Store lock in canonical `os.tmpdir()` path with platform/arch suffix to avoid collisions
  - Implement TTL-based stale lock cleanup (`XRAY_UPDATE_LOCK_TTL_MS`) to recover after crashes
  - Acquire lock at the start of `download-xray-update` and release in `finally` regardless of success/failure
  - Extend updater security regression with static assertions for lock helper and acquire/release wiring
- acceptance:
  - Multiple app instances cannot run Xray updater install concurrently (lock file blocks races)
  - Lock releases deterministically in `finally`; stale lock files older than TTL are cleared and reacquired
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-241-2026-02-07.md`

### PT-SSOT-242: Updater unzip declared-size precheck (zip bomb resilience)
- id: `PT-SSOT-242`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `extractZip` to pre-check declared uncompressed size (`entry.header.size`) before calling `getData()`
  - Accumulate declared bytes and block when declared total exceeds `maxUncompressedBytes`
  - Keep existing post-decompress byte accumulation as defense-in-depth fallback
  - Extend updater security regression with a mutated `header.size` zip test to ensure the precheck blocks extraction
- acceptance:
  - Crafted zip entries with oversized declared uncompressed bytes are rejected deterministically
  - `node --check updateUtils.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-242-2026-02-07.md`

### PT-SSOT-243: Updater tighten xray zip/unzip budgets
- id: `PT-SSOT-243`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add per-flow updater budget constants in `main.js` (`XRAY_UPDATE_ZIP_MAX_BYTES`, `XRAY_UPDATE_EXTRACT_MAX_ENTRIES`, `XRAY_UPDATE_EXTRACT_MAX_BYTES`)
  - Pass `maxBytes` into zip download (`downloadFile(url, zipPath, { maxBytes: ... })`)
  - Pass tighter unzip limits into `extractZip(zipPath, extractDir, { maxEntries, maxUncompressedBytes })`
  - Extend updater security regression with static assertions for constants and usage wiring
- acceptance:
  - Xray updater uses smaller, explicit budgets instead of generic defaults
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-243-2026-02-07.md`

### PT-SSOT-244: Setup Xray installer digest + budget hardening
- id: `PT-SSOT-244`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `setup.js` Xray installer digest parsing by using `parseSha256DigestForAsset` and rejecting named digests that don't reference the requested asset
  - Add per-flow Xray zip download/unzip budgets in `setup.js` and pass into `downloadFile`/`extractZip`
  - Extend `scripts/regression_updater_security.js` with static assertions for setup installer verification and budgets wiring
- acceptance:
  - `node --check setup.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-244-2026-02-07.md`

### PT-SSOT-245: Setup Xray version fetch URL/redirect hardening
- id: `PT-SSOT-245`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `setup.js` `getLatestXrayVersion` to enforce an allowlist for API hosts (direct `api.github.com` and `gh-proxy.com` -> `api.github.com` target) and block unexpected redirects
  - Add explicit redirect limit and response size cap for the GitHub API version fetch
  - Extend `scripts/regression_updater_security.js` with static assertions for setup version fetch hardening wiring
- acceptance:
  - `node --check setup.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-245-2026-02-07.md`

### PT-SSOT-246: Main-process GitHub API fetchJson hardening
- id: `PT-SSOT-246`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `main.js` `fetchJson` helper to enforce `https` only and a strict host allowlist (GitHub API) for update checks
  - Add explicit redirect limit and response size cap to avoid unbounded buffering
  - Extend `scripts/regression_updater_security.js` with static assertions for `fetchJson` hardening wiring
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-246-2026-02-07.md`

### PT-SSOT-247: Main-process GitHub API gh-proxy fallback
- id: `PT-SSOT-247`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a safe `gh-proxy.com` fallback for GitHub API calls in `main.js` when direct `api.github.com` access fails due to network/timeout errors
  - Keep strict host/path allowlist and existing redirect/size/timeout budgets unchanged
  - Extend `scripts/regression_updater_security.js` with static assertions for fallback wiring
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-247-2026-02-07.md`

### PT-SSOT-248: Setup Xray version fetch gh-proxy fallback
- id: `PT-SSOT-248`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a safe direct<->`gh-proxy.com` fallback for `setup.js` `getLatestXrayVersion` when the primary route fails due to network/timeout errors
  - Keep strict API host/path allowlist and existing redirect/size/timeout budgets unchanged
  - Extend `scripts/regression_updater_security.js` with static assertions for setup fallback wiring
- acceptance:
  - `node --check setup.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-248-2026-02-07.md`

### PT-SSOT-249: Setup Xray zip/dgst download gh-proxy fallback
- id: `PT-SSOT-249`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a safe direct<->`gh-proxy.com` fallback for Xray zip and `.dgst` downloads in `setup.js` when the primary route fails due to network/timeout errors
  - Keep strict update download host allowlist, existing zip header check, and sha256 verification chain unchanged
  - Extend `scripts/regression_updater_security.js` with static assertions for setup download fallback wiring
- acceptance:
  - `node --check setup.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-249-2026-02-07.md`

### PT-SSOT-250: Main-process Xray zip/dgst download gh-proxy fallback
- id: `PT-SSOT-250`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a safe direct<->`gh-proxy.com` fallback for Xray zip and `.dgst` downloads in `main.js` updater flow (`download-xray-update`) when the primary route fails due to network/timeout errors
  - Keep strict update download host allowlist, existing zip header check, anti-downgrade logic, and sha256 verification chain unchanged
  - Extend `scripts/regression_updater_security.js` with static assertions for main-process download fallback wiring
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-250-2026-02-07.md`

### PT-SSOT-251: Main-process updater digest budget constantization + fallback guard assertion
- id: `PT-SSOT-251`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a dedicated digest download budget constant in `main.js` updater flow (replace inline `1024 * 1024` magic number)
  - Keep zip/digest fallback route logic and integrity verification behavior unchanged
  - Extend `scripts/regression_updater_security.js` to assert constant presence, usage, and fallback precondition guard
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-251-2026-02-07.md`

### PT-SSOT-252: Main-process updater route-affinity for digest download after zip fallback
- id: `PT-SSOT-252`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update `main.js` updater helper so route fallback returns the effective URL used for the successful zip download
  - Make digest download prefer the same route that actually succeeded for zip (direct vs `gh-proxy.com`), while keeping one-shot fallback behavior intact
  - Extend `scripts/regression_updater_security.js` with static assertions for route-affinity wiring
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-252-2026-02-07.md`

### PT-SSOT-253: Setup updater route-affinity for digest download after zip fallback
- id: `PT-SSOT-253`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update `setup.js` installer helper so route fallback returns the effective URL used for successful zip download
  - Make digest download prefer the same route that actually succeeded for zip (direct vs `gh-proxy.com`), while keeping one-shot fallback behavior intact
  - Extend `scripts/regression_updater_security.js` with static assertions for setup route-affinity wiring
- acceptance:
  - `node --check setup.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-253-2026-02-07.md`

### PT-SSOT-254: Setup version-fetch route-affinity for asset/digest primary route
- id: `PT-SSOT-254`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend setup version-fetch flow to return both latest tag and effective API route used after direct/proxy fallback
  - Make setup asset/digest primary route selection prefer the same route type (direct vs `gh-proxy.com`) that successfully fetched latest version metadata
  - Extend `scripts/regression_updater_security.js` with static assertions for setup API-route affinity wiring
- acceptance:
  - `node --check setup.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-254-2026-02-07.md`

### PT-SSOT-255: Main-process version-fetch route-affinity for asset/digest primary route
- id: `PT-SSOT-255`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main-process helper to fetch Xray latest release metadata with effective route (`direct`/`gh-proxy`) retained after fallback
  - In `download-xray-update`, prefer asset/digest primary route aligned with the route that successfully fetched metadata (while keeping explicit renderer direct/proxy hint precedence)
  - Extend `scripts/regression_updater_security.js` with static assertions for main-process API-route affinity wiring
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-255-2026-02-07.md`

### PT-SSOT-256: Main-process check-xray-update downloadUrl route-affinity
- id: `PT-SSOT-256`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update `check-xray-update` in `main.js` to fetch release metadata with route context and choose `downloadUrl` (`assetDirectUrl`/`assetProxyUrl`) based on effective metadata route
  - Keep existing anti-downgrade check and manifest gates unchanged
  - Extend `scripts/regression_updater_security.js` with static assertions for check-update route-affinity wiring
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-256-2026-02-07.md`

### PT-SSOT-257: Main-process check-xray-update route metadata exposure
- id: `PT-SSOT-257`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `check-xray-update` return payload in `main.js` to expose selected route metadata while preserving backward compatibility
  - Keep existing `downloadUrl` field unchanged in semantics, and add route-observable fields (`downloadUrlDirect`, `downloadUrlProxy`, `downloadRoute`)
  - Extend `scripts/regression_updater_security.js` with static assertions for new response fields
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-257-2026-02-07.md`

### PT-SSOT-258: Main-process check-xray-update metadata-route observability
- id: `PT-SSOT-258`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `check-xray-update` response in `main.js` with metadata-route observability fields while preserving existing fields
  - Add route descriptors for metadata fetch (`metadataRouteUrl`, `metadataRoute`) alongside existing download route metadata
  - Extend `scripts/regression_updater_security.js` with static assertions for metadata-route fields
- acceptance:
  - `node --check main.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-258-2026-02-07.md`

### PT-SSOT-259: Main-process download-xray-update structured route result + renderer compatibility
- id: `PT-SSOT-259`
- status: `DONE`
- owner: `Codex`
- scope:
  - Change `download-xray-update` in `main.js` to return structured result payload (`success`, `error`, route telemetry) instead of bare boolean
  - Keep backward compatibility by updating renderer update flow to accept both legacy boolean and new object payload
  - Extend `scripts/regression_updater_security.js` with static assertions for new return shape and renderer compatibility guard
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-259-2026-02-07.md`

### PT-SSOT-260: Renderer download-xray-update structured error + route diagnostics
- id: `PT-SSOT-260`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend manual update flow in `renderer.js` to consume structured `download-xray-update` result details
  - Surface structured updater error detail in alert fallback while preserving legacy boolean compatibility
  - Log updater route telemetry (`metadataRoute`, `selectedAssetRoute`, `effectiveAssetRoute`, `effectiveDgstRoute`, fallback flags) for diagnostics
  - Extend `scripts/regression_updater_security.js` with static assertions for renderer diagnostics wiring
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-260-2026-02-07.md`

### PT-SSOT-261: Renderer explicit route URL handoff for updater download
- id: `PT-SSOT-261`
- status: `DONE`
- owner: `Codex`
- scope:
  - In `renderer.js`, derive updater handoff URL from `check-xray-update` route metadata (`downloadRoute`, `downloadUrlDirect`, `downloadUrlProxy`) with fallback to legacy `downloadUrl`
  - Keep backward compatibility when route metadata fields are missing/empty
  - Add route-handoff diagnostic logging in renderer before invoking `download-xray-update`
  - Extend `scripts/regression_updater_security.js` static assertions for explicit route-handoff logic
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-261-2026-02-07.md`

### PT-SSOT-262: Main/renderer structured updater request route-hint contract
- id: `PT-SSOT-262`
- status: `DONE`
- owner: `Codex`
- scope:
  - Change `download-xray-update` request contract in `main.js` to accept structured payload `{ url, route }` while preserving legacy string compatibility
  - Bind route selection preference to trusted route hint (`direct|proxy`) when release manifest is available
  - Update `renderer.js` manual update flow to send structured request payload and keep legacy fallback
  - Extend `scripts/regression_updater_security.js` static assertions for new request contract and route-hint binding
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-262-2026-02-07.md`

### PT-SSOT-263: Updater request-route hint telemetry exposure
- id: `PT-SSOT-263`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` structured result metadata in `main.js` with normalized request route hint telemetry
  - Wire renderer diagnostics logging to include the request route hint returned by main updater flow
  - Extend `scripts/regression_updater_security.js` static assertions for new telemetry field and renderer log mapping
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-263-2026-02-07.md`

### PT-SSOT-264: Updater release-source telemetry exposure
- id: `PT-SSOT-264`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `releaseSource` to indicate manifest-derived or URL-derived update metadata origin
  - Include `releaseSource` in renderer updater diagnostic log output
  - Extend `scripts/regression_updater_security.js` static assertions for new telemetry field and bindings
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-264-2026-02-07.md`

### PT-SSOT-265: Updater structured error-code telemetry contract
- id: `PT-SSOT-265`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` structured result in `main.js` to include normalized `errorCode` for deterministic failure classification
  - Keep backward compatibility by preserving existing `success/error` fields while adding `errorCode` on failure and `null` on success
  - Surface `errorCode` in renderer updater diagnostics and failure alert suffix when available
  - Extend `scripts/regression_updater_security.js` static assertions for new `errorCode` contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-265-2026-02-07.md`

### PT-SSOT-266: Updater structured failure-stage telemetry contract
- id: `PT-SSOT-266`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` structured result in `main.js` with normalized `failureStage` telemetry for deterministic failure pipeline classification
  - Keep success payload compatibility (`failureStage: null` on success) and return stage marker on failures
  - Surface `failureStage` in renderer updater diagnostics and failure alert suffix when available
  - Extend `scripts/regression_updater_security.js` static assertions for `failureStage` contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-266-2026-02-07.md`

### PT-SSOT-267: Updater requested-url-host telemetry exposure
- id: `PT-SSOT-267`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with normalized `requestUrlHost` derived from renderer handoff URL
  - Preserve compatibility by emitting `none` when URL absent and `invalid` when non-empty URL parsing fails
  - Surface `requestUrlHost` in renderer updater diagnostic logging
  - Extend `scripts/regression_updater_security.js` static assertions for request host telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-267-2026-02-07.md`

### PT-SSOT-268: Updater metadata-route-url telemetry exposure
- id: `PT-SSOT-268`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` structured telemetry in `main.js` with `metadataRouteUrl` for release metadata fetch observability
  - Keep compatibility by normalizing field to `unavailable` when metadata fetch path was not used
  - Surface `metadataRouteUrl` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for `metadataRouteUrl` telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-268-2026-02-07.md`

### PT-SSOT-269: Updater selected-digest-route telemetry exposure
- id: `PT-SSOT-269`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `selectedDgstRoute` to indicate digest primary-route choice before fallback
  - Keep compatibility by normalizing `selectedDgstRoute` (`direct`/`proxy`/`unknown`) without changing updater behavior
  - Surface `selectedDgstRoute` in renderer updater diagnostic logging
  - Extend `scripts/regression_updater_security.js` static assertions for digest-route selection telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-269-2026-02-07.md`

### PT-SSOT-270: Updater digest-source telemetry exposure
- id: `PT-SSOT-270`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `dgstSource` to indicate whether digest URL selection is manifest-based or derived fallback
  - Keep compatibility by normalizing `dgstSource` values (`manifest`/`derived`/`unknown`) without altering digest verification behavior
  - Surface `dgstSource` in renderer updater diagnostics log output
  - Extend `scripts/regression_updater_security.js` static assertions for digest-source telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-270-2026-02-07.md`

### PT-SSOT-271: Updater effective-host telemetry exposure
- id: `PT-SSOT-271`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `effectiveAssetHost` and `effectiveDgstHost` derived from resolved effective download URLs
  - Keep compatibility by normalizing hosts with low-cardinality fallback values (`unknown`/`invalid`) without changing updater behavior
  - Surface `effectiveAssetHost`/`effectiveDgstHost` in renderer updater diagnostics log output
  - Extend `scripts/regression_updater_security.js` static assertions for effective-host telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-271-2026-02-07.md`

### PT-SSOT-272: Updater selected-host telemetry exposure
- id: `PT-SSOT-272`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `selectedAssetHost` and `selectedDgstHost` derived from primary selected URLs before fallback execution
  - Keep compatibility by normalizing host fields with deterministic fallback values (`unknown`/`invalid`)
  - Surface `selectedAssetHost`/`selectedDgstHost` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for selected-host telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-272-2026-02-07.md`

### PT-SSOT-273: Updater route-decision-source telemetry exposure
- id: `PT-SSOT-273`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `routeDecisionSource` (`request_hint`/`request_url`/`metadata_route`/`derived_url`)
  - Bind route decision source at the exact branch selecting `selectedAssetRoute`
  - Surface `routeDecisionSource` in renderer updater diagnostics log output
  - Extend `scripts/regression_updater_security.js` static assertions for route decision source telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-273-2026-02-07.md`

### PT-SSOT-274: Updater route-hint conflict telemetry exposure
- id: `PT-SSOT-274`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `routeHintConflict` and `routeHintConflictType` to indicate route-hint vs request-url disagreement
  - Keep updater behavior unchanged; conflict telemetry is observability-only
  - Surface conflict telemetry fields in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for conflict telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-274-2026-02-07.md`

### PT-SSOT-275: Updater metadata-fetch-status telemetry exposure
- id: `PT-SSOT-275`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchStatus` (`ok`/`manifest_missing`/`fetch_error`) for deterministic metadata path diagnostics
  - Keep updater behavior unchanged; status only reflects observed metadata fetch/manifest resolution state
  - Surface `metadataFetchStatus` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch status telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-275-2026-02-07.md`

### PT-SSOT-276: Updater metadata-fetch-error-code telemetry exposure
- id: `PT-SSOT-276`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchErrorCode` to classify metadata fetch failures when `metadataFetchStatus = fetch_error`
  - Keep compatibility by normalizing error code values and retaining `none` for non-error states
  - Surface `metadataFetchErrorCode` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch error-code telemetry
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-276-2026-02-07.md`

### PT-SSOT-277: Updater metadata-fetch-http-status telemetry exposure
- id: `PT-SSOT-277`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchHttpStatus` to expose normalized HTTP status when metadata fetch fails with HTTP-like errors
  - Keep compatibility by preserving `metadataFetchErrorCode` and using `null` for non-error/non-HTTP states
  - Surface `metadataFetchHttpStatus` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch HTTP-status telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-277-2026-02-07.md`

### PT-SSOT-278: Updater metadata-fetch-fallback-used telemetry exposure
- id: `PT-SSOT-278`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchFallbackUsed` to indicate whether metadata fetch used/attempted gh-proxy fallback route
  - Keep updater behavior unchanged; fallback telemetry is observability-only and backward compatible (`false` by default)
  - Surface `metadataFetchFallbackUsed` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch fallback telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-278-2026-02-07.md`

### PT-SSOT-279: Updater metadata-fetch-failure-route telemetry exposure
- id: `PT-SSOT-279`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchFailureRoute` (`direct`/`proxy`/`unknown`/`none`) to expose which metadata route failed when `metadataFetchStatus = fetch_error`
  - Keep updater behavior unchanged; telemetry-only addition with `none` for non-error states
  - Surface `metadataFetchFailureRoute` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch failure-route telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-279-2026-02-07.md`

### PT-SSOT-280: Updater metadata-fetch-fallback-attempted telemetry exposure
- id: `PT-SSOT-280`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchFallbackAttempted` to indicate whether metadata fetch entered fallback attempt flow regardless of final success/failure
  - Keep updater behavior unchanged; telemetry-only addition with deterministic boolean output
  - Surface `metadataFetchFallbackAttempted` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch fallback-attempted telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-280-2026-02-07.md`

### PT-SSOT-281: Updater metadata-fetch-route telemetry exposure
- id: `PT-SSOT-281`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchRoute` (`direct`/`proxy`/`unknown`) for deterministic metadata fetch route diagnostics across success/failure paths
  - Keep updater behavior unchanged; telemetry-only addition with backward-compatible defaults
  - Surface `metadataFetchRoute` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch route telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-281-2026-02-07.md`

### PT-SSOT-282: Updater metadata-fetch-fallback-result telemetry exposure
- id: `PT-SSOT-282`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchFallbackResult` (`not_attempted`/`succeeded`/`failed`) for deterministic fallback outcome diagnostics
  - Keep updater behavior unchanged; telemetry-only addition with normalized low-cardinality values
  - Surface `metadataFetchFallbackResult` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch fallback-result telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-282-2026-02-07.md`

### PT-SSOT-283: Updater metadata-fetch-failure-host telemetry exposure
- id: `PT-SSOT-283`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchFailureHost` to expose normalized host where metadata fetch failed
  - Keep updater behavior unchanged; telemetry-only addition with `none` for non-error states and `unknown` fallback for unmapped failures
  - Surface `metadataFetchFailureHost` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch failure-host telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-283-2026-02-07.md`

### PT-SSOT-284: Updater metadata-fetch-error-retryable telemetry exposure
- id: `PT-SSOT-284`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchErrorRetryable` to indicate whether metadata fetch failure is retryable from network policy perspective
  - Keep updater behavior unchanged; telemetry-only addition with `null` for non-error states
  - Surface `metadataFetchErrorRetryable` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch retryable telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-284-2026-02-07.md`

### PT-SSOT-285: Updater metadata-fetch-route-host telemetry exposure
- id: `PT-SSOT-285`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchRouteHost` to expose normalized metadata fetch route host for success/failure diagnostics
  - Keep updater behavior unchanged; telemetry-only addition with `unknown` default and deterministic normalization
  - Surface `metadataFetchRouteHost` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch route-host telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-285-2026-02-07.md`

### PT-SSOT-286: Updater metadata-fetch-attempt-flow telemetry exposure
- id: `PT-SSOT-286`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchAttemptFlow` (`direct_only`/`direct_then_proxy`) for deterministic metadata fetch path diagnostics
  - Keep updater behavior unchanged; telemetry-only addition with normalized low-cardinality values
  - Surface `metadataFetchAttemptFlow` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch attempt-flow telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-286-2026-02-07.md`

### PT-SSOT-287: Updater metadata-fetch-attempt-count telemetry exposure
- id: `PT-SSOT-287`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchAttemptCount` to expose normalized metadata fetch attempt count (`1` direct-only / `2` direct-then-proxy)
  - Keep updater behavior unchanged; telemetry-only addition with deterministic bounded numeric values
  - Surface `metadataFetchAttemptCount` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for metadata fetch attempt-count telemetry contract
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-287-2026-02-07.md`

### PT-SSOT-288: Updater metadata-fetch-fallback-decision telemetry exposure
- id: `PT-SSOT-288`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `download-xray-update` telemetry in `main.js` with `metadataFetchFallbackDecision` to expose normalized metadata fetch fallback-decision classification (`not_needed` / `retryable_error` / `non_retryable_error`)
  - Keep updater behavior unchanged; observability-only addition with deterministic low-cardinality normalization
  - Propagate fallback-decision metadata through GitHub API route helper return/error annotation paths and bind into updater fetch-error telemetry
  - Surface `metadataFetchFallbackDecision` in renderer updater diagnostics log
  - Extend `scripts/regression_updater_security.js` static assertions for fallback-decision telemetry contract and updated annotation wiring
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-288-2026-02-08.md`

### PT-SSOT-289: TUN guardrail regression coverage + leakcheck mode evidence
- id: `PT-SSOT-289`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add dedicated regression guard `scripts/regression_tun_guardrails.js` to validate TUN mode safety constraints and runtime contracts
  - Verify main-process TUN guardrails via static assertions in `main.js` (platform/resource/admin/single-profile checks, launch interlock, app-proxy auto-recovery path)
  - Verify sing-box TUN config generation contract (`in-tun` inbound + `auto_route/strict_route/dns_hijack` behavior) with deterministic assertions
  - Verify leakcheck report contract in TUN mode (`proxy.mode='tun'`, `capabilities.tun=true`, no forced leak issue codes under clean probe results)
  - Wire the new regression into `scripts/regression_all.js` and npm scripts (`regression:tun-guardrails`)
- acceptance:
  - `node --check scripts/regression_tun_guardrails.js` PASS
  - `node scripts/regression_tun_guardrails.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-289-2026-02-08.md`

### PT-SSOT-290: Launch diagnostics error-code normalization exposure
- id: `PT-SSOT-290`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `mapProfileLaunchErrorCode` in `main.js` to normalize launch failures into stable error codes (including TUN guardrail failures and common launch-path mismatches)
  - Persist normalized `errorCode` into `profile.diagnostics.lastError` for launch failures, while preserving existing behavior
  - Bridge normalized launch code back to thrown IPC errors via `errorCode` when `err.code` is absent, improving renderer-side diagnostics consistency
  - Expose `lastError.errorCode` in renderer profile list/restart prompt and launch failure alert formatting
  - Add dedicated regression script `scripts/regression_launch_error_diagnostics.js` and wire it into `scripts/regression_all.js` + npm scripts
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-290-2026-02-08.md`

### PT-SSOT-291: Stop-path diagnostics error-code normalization exposure
- id: `PT-SSOT-291`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `mapProfileStopErrorCode` in `main.js` to normalize stop-path failures into stable error codes
  - Return explicit stop failure codes for invalid/missing profile id paths in `stop-profile` IPC response contract
  - Persist normalized stop `errorCode` into `profile.diagnostics.lastError` and propagate it through `profile-status` (`stop_failed`) events
  - Improve renderer stop/restart flows to consume structured stop results (`success/error/errorCode`) and avoid blind restart after stop failure
  - Add dedicated regression script `scripts/regression_stop_error_diagnostics.js` and wire into `scripts/regression_all.js` + npm scripts
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-291-2026-02-08.md`

### PT-SSOT-292: Profile-status structured error context model
- id: `PT-SSOT-292`
- status: `DONE`
- owner: `Codex`
- scope:
  - Introduce a unified `profile-status` event emitter in `main.js` with normalized optional error fields (`errorCode/errorStage/errorMessage`)
  - Upgrade stop/launch failure event emission to use structured context (`stop_failed` + `launch_failed`) while preserving existing status semantics
  - Extend renderer status handling to consume structured error context and preserve latest status-level failure metadata
  - Improve profile card/status filter health model to treat `launch_failed` as attention state and display code/message fallback when diagnostics lag
  - Add dedicated regression coverage `scripts/regression_profile_status_error_context.js` and wire it into `scripts/regression_all.js` + npm scripts
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_status_error_context.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-292-2026-02-08.md`

### PT-SSOT-293: Launch/stop error-code actionable guidance mapping
- id: `PT-SSOT-293`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer-side error guidance mapper for launch/stop error codes and generic stage fallback hints
  - Introduce unified message composer for profile action errors and apply it to launch/restart/stop alert paths
  - Enhance restart pre-confirm context by appending actionable hint derived from the latest persisted `lastError.errorCode`
  - Add i18n/zh-CN keys for launch/stop guidance hints to keep bilingual UX stable
  - Add dedicated regression `scripts/regression_profile_error_guidance.js` and wire it into `scripts/regression_all.js` + npm scripts
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-293-2026-02-08.md`

### PT-SSOT-294: Error-code remediation action routing for profile operations
- id: `PT-SSOT-294`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer-level remediation action plan mapper (`getProfileErrorActionPlan`) for launch/restart/stop failures with deterministic alt-action routing
  - Introduce one-click TUN contention remediation path (`Stop Others & Retry`) by stopping other running profiles before retrying current launch/restart flow
  - Introduce profile-reference/stop-path recovery action (`Refresh List`) for invalid/missing profile stop failures instead of log-only fallback
  - Add unified retry-aware action dialog helper (`showProfileErrorWithActions`) and wire it into launch/restart/stop failure surfaces
  - Add bilingual i18n keys for remediation action labels and regression guard `scripts/regression_profile_error_actions.js`
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-294-2026-02-08.md`

### PT-SSOT-295: Main/preload remediation IPC contract + TUN conflict context
- id: `PT-SSOT-295`
- status: `DONE`
- owner: `Codex`
- scope:
  - Introduce shared main-process stop runtime helper (`stopProfileRuntimeByResolvedId`) and reuse it for `stop-profile` to preserve stop diagnostics/error-code contract while enabling orchestration reuse
  - Add structured remediation IPC endpoints: `list-running-profile-summaries` and `stop-other-running-profiles` for deterministic one-click conflict recovery
  - Expose the new remediation IPC bridge in `preload.js` (`listRunningProfileSummaries`, `stopOtherRunningProfiles`)
  - Update renderer TUN remediation flow to prefer main-side `stop-other-running-profiles`, keep fallback compatibility, and append running-conflict summary in action dialogs/restart pre-confirm
  - Add bilingual i18n keys for remediation telemetry text (`profileErrActionStopOthersDone`, `profileErrActionTunConflictList`) and dedicated regression `scripts/regression_profile_remediation_ipc.js`
- acceptance:
  - `node --check main.js` PASS
  - `node --check preload.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-295-2026-02-08.md`

### PT-SSOT-296: Remediation outcome normalization + retry-readiness feedback
- id: `PT-SSOT-296`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `stop-other-running-profiles` result contract with normalized outcome metadata (`requestedCount/stoppedCount/failedCount/remainingCount/retryReady/retryReasonCode/status`)
  - Add deterministic remaining-runtime assessment in main process to prevent false-positive retry decisions when conflicting profiles still run
  - Upgrade renderer `stopOtherRunningProfilesForTun` to honor `retryReady` (instead of raw `success`) for “Stop Others & Retry” continuation decisions
  - Add partial-vs-failed remediation UX feedback (toast/alert) so operators can distinguish “partially stopped but blocked” from “fully blocked”
  - Add bilingual i18n keys for partial/failed remediation feedback and extend regression coverage in `scripts/regression_profile_remediation_ipc.js`
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-296-2026-02-08.md`

### PT-SSOT-297: Remediation reason/status guidance mapping in renderer
- id: `PT-SSOT-297`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer-side stop-other outcome resolver (`resolveStopOthersOutcome`) to normalize `status/retryReasonCode` and derive deterministic guidance kind (`ready/ready_partial/partial_blocked/blocked/no_conflict/invalid_keep_id`)
  - Refactor TUN remediation flow to use normalized outcome kind instead of ad-hoc field checks, keeping retry continuation strictly aligned with reason/status semantics
  - Add explicit reason-aware user feedback paths: no-conflict toast, invalid-profile alert, ready-partial retry toast, and blocked partial/failure branch messaging
  - Extend bilingual i18n keys for reason-driven guidance (`profileErrActionStopOthersReadyPartial`, `profileErrActionNoConflict`, `profileErrActionInvalidKeep`)
  - Extend remediation IPC regression assertions to guard outcome resolver mapping + new guidance key wiring
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-297-2026-02-08.md`

### PT-SSOT-298: Stop-other failure-code aggregation + dominant-code guidance
- id: `PT-SSOT-298`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main-process stop-other failure aggregation helpers (`getStopErrorCodePriority` + `aggregateStopOtherFailureCodes`) to compute deterministic dominant error code and code-frequency map
  - Extend `stop-other-running-profiles` result contract with `dominantErrorCode` and `errorCodeCounts` while preserving backward-compatible fields
  - Add renderer-side aggregated failure code summary formatter and consume `dominantErrorCode` in blocked remediation alerts instead of relying on `firstFailed` only
  - Add i18n/zh-CN key for aggregated code distribution line (`profileErrActionStopOthersCodeSummary`) to keep bilingual guidance consistent
  - Add dedicated regression guard `scripts/regression_profile_remediation_aggregation.js` and wire into npm scripts + `regression:all`
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-298-2026-02-08.md`

### PT-SSOT-299: Dominant-code next-step suggestion mapping for stop-other remediation
- id: `PT-SSOT-299`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer helper `getStopOtherDominantActionSuggestion` to map stop-other dominant failure codes into actionable “next step” guidance text
  - Upgrade blocked remediation alert composition to append dominant-code suggestion after aggregated failure summary, reducing ambiguity in operator next actions
  - Add bilingual i18n keys for dominant-code next-step suggestions (`permission_denied/profile_invalid/process_missing/generic`)
  - Add dedicated regression guard `scripts/regression_profile_remediation_nextstep.js` for helper wiring + i18n key presence
  - Wire new regression into npm scripts and `scripts/regression_all.js`
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-299-2026-02-08.md`

### PT-SSOT-300: Unified remediation outcome explanation layer
- id: `PT-SSOT-300`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer helper to convert stop-other dominant error code into explicit next-step recommendation (`getStopOtherDominantActionSuggestion`)
  - Append dominant-code suggestion line after aggregated failure-code summary in blocked remediation alerts while keeping existing control flow intact
  - Add bilingual i18n keys for dominant-code recommendation variants (`permission_denied/profile_invalid/process_missing/generic`)
  - Add dedicated regression guard `scripts/regression_profile_remediation_nextstep.js` to lock helper wiring and key presence
  - Wire the new regression into npm scripts and aggregated regression runner
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-300-2026-02-08.md`

### PT-SSOT-301: Blocked remediation conflicting-profile detail layer
- id: `PT-SSOT-301`
- status: `DONE`
- owner: `Codex`
- scope:
  - Enrich `stop-other-running-profiles` result contract with profile-name context (`failed[].name`, `remainingProfiles[]`) so renderer can explain exactly which profiles remain blocked
  - Add renderer profile-summary explanation helpers and append remaining/failed profile lines in blocked remediation alert composition before failure-code summary
  - Add bilingual i18n keys for profile-list explanation lines (`profileErrActionStopOthersRemainingList`, `profileErrActionStopOthersFailedList`)
  - Add dedicated regression guard `scripts/regression_profile_remediation_profiles.js`
  - Wire new regression into npm scripts and `scripts/regression_all.js`
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-301-2026-02-08.md`

### PT-SSOT-302: Blocked remediation failure-detail explanation layer
- id: `PT-SSOT-302`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer helper to summarize per-profile stop failures with compact detail tuples (`name(code): message`) for blocked remediation outcomes
  - Keep blocked alert message layering deterministic: profile names + failure details + failure-code distribution + dominant next-step suggestion
  - Add bilingual i18n key for failure-detail explanation line (`profileErrActionStopOthersFailedDetail`)
  - Add dedicated regression guard `scripts/regression_profile_remediation_failure_details.js`
  - Wire new regression into npm scripts and `scripts/regression_all.js`
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-302-2026-02-08.md`

### PT-SSOT-303: Blocked remediation failure-code profile-map explanation layer
- id: `PT-SSOT-303`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer helper to summarize `failed[]` by failure code and emit compact `CODE: profileA, profileB (+N)` map lines
  - Append failure code -> profile map explanation into blocked remediation summary flow while preserving existing ordering and control flow
  - Add bilingual i18n key for failure code profile-map line (`profileErrActionStopOthersCodeProfileMap`)
  - Add dedicated regression guard `scripts/regression_profile_remediation_code_profile_map.js`
  - Wire new regression into npm scripts and `scripts/regression_all.js`
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-303-2026-02-08.md`

### PT-SSOT-304: Main-side failure-code profile-map contract + renderer contract-first consumption
- id: `PT-SSOT-304`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend main aggregation output with `errorCodeProfiles` (code -> unique profile-name list) as a structured remediation contract field
  - Include `errorCodeProfiles` in `stop-other-running-profiles` default payload and aggregated result payload for deterministic renderer consumption
  - Update renderer code-profile-map summary helper to prefer `errorCodeProfiles` contract and fallback to legacy `failed[]` derivation only when contract missing
  - Extend remediation regressions to assert contract exposure and contract-first renderer usage
  - Keep existing blocked remediation control flow unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `node scripts/regression_launch_error_diagnostics.js` PASS
  - `node scripts/regression_stop_error_diagnostics.js` PASS
  - `node scripts/regression_profile_status_error_context.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-304-2026-02-08.md`

### PT-SSOT-305: Dominant-priority-consistent code-profile map ordering
- id: `PT-SSOT-305`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer helper `getStopOtherCodePriority` mirroring main stop-error-code priority model
  - Align renderer code-profile-map sorting with main dominant selection logic (`priority -> count -> code`) to keep map ordering consistent with dominant next-step suggestion
  - Extend code-profile-map regression to assert priority helper and priority-based comparator wiring
  - Keep remediation message content and control-flow branches unchanged
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_error_actions.js` PASS
  - `node scripts/regression_profile_error_guidance.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-305-2026-02-08.md`

### PT-SSOT-306: Ranked error-code contract propagation for map ordering SSOT
- id: `PT-SSOT-306`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend main failure aggregation contract with `rankedErrorCodes` and `failureCodeSummaries`, and propagate both through stop-other IPC payload defaults and final result
  - Update renderer code-profile-map summarizer to prefer `failureCodeSummaries` + `rankedErrorCodes` contract ordering and fallback to local ordering when contract missing
  - Add dedicated regression guard `scripts/regression_profile_remediation_ranked_codes.js`
  - Add dedicated regression guard `scripts/regression_profile_remediation_failure_summaries.js`
  - Extend remediation IPC/aggregation/code-map regressions to assert `rankedErrorCodes`/`failureCodeSummaries` contract exposure and renderer consumption
  - Fix missing i18n key parity by adding `proxyNoRenderableNodes` to EN/zh locale maps so full regression remains stable
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-306-2026-02-08.md`

### PT-SSOT-307: Failure-detail contract propagation for renderer summary layer
- id: `PT-SSOT-307`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend main `failureCodeSummaries` entries with per-code detail samples (`details[]`) so failure detail text is emitted from a structured contract
  - Update renderer `formatStopOthersFailedDetailSummary` to consume `failureCodeSummaries.details` first, and fallback to legacy `failed[]` derivation when contract absent
  - Extend remediation regressions to assert main detail-sample contract fields and renderer contract-first detail iteration
  - Keep blocked remediation control flow and alert ordering unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-307-2026-02-09.md`

### PT-SSOT-308: Failure-detail truncation metadata contract + renderer extra-count correctness
- id: `PT-SSOT-308`
- status: `DONE`
- owner: `Codex`
- scope:
  - Bound main stop-other failure detail samples per error code with `STOP_OTHER_MAX_DETAIL_SAMPLES_PER_CODE` while preserving dedupe behavior
  - Enrich main `failureCodeSummaries` contract with `detailTotal` and `detailTruncated` metadata for deterministic detail-summary truncation reporting
  - Update renderer `formatStopOthersFailedDetailSummary` to consume `detailTotal`/`detailTruncated` metadata and compute `{extra}` from contract totals instead of shown-sample length heuristics
  - Extend remediation regressions to lock detail-bound constant usage and renderer contract-first truncation-metadata handling
  - Keep stop-other remediation control flow, action routing, and i18n keys unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-308-2026-02-09.md`

### PT-SSOT-309: Failure-detail display-limit contract propagation
- id: `PT-SSOT-309`
- status: `DONE`
- owner: `Codex`
- scope:
  - Propagate stop-other failure-detail display limit through IPC payload via `failureDetailSampleLimitPerCode` to avoid renderer-only hardcoded limits
  - Keep main contract consistent across invalid-keep-id early return and normal remediation result payloads
  - Update renderer `formatStopOthersFailedDetailSummary` to prefer contract display limit (`failureDetailSampleLimitPerCode`) with safe fallback when absent
  - Extend remediation regressions to assert new IPC/result metadata field and renderer contract-limit consumption
  - Keep remediation action routing/status/i18n behavior unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-309-2026-02-09.md`

### PT-SSOT-310: Failure code-summary top-limit contract propagation
- id: `PT-SSOT-310`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main contract constant `STOP_OTHER_ERROR_CODE_SUMMARY_TOP_LIMIT` and expose `errorCodeSummaryTopLimit` in stop-other remediation results
  - Keep `errorCodeSummaryTopLimit` consistent across invalid-keep-id early return and normal stop-other aggregation result
  - Update renderer `formatStopOthersErrorCodeSummary` to consume `errorCodeSummaryTopLimit` contract-first with safe fallback
  - Extend remediation regressions to lock main contract propagation and renderer top-limit usage in code-summary formatting
  - Keep remediation branch routing, actions, and i18n text unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-310-2026-02-09.md`

### PT-SSOT-311: Code-profile-map display-limit contract propagation
- id: `PT-SSOT-311`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main contract constants for code-profile-map summary limits (`STOP_OTHER_CODE_PROFILE_MAP_CODE_LIMIT`, `STOP_OTHER_CODE_PROFILE_MAP_PROFILE_LIMIT`)
  - Expose `codeProfileMapCodeLimit` and `codeProfileMapProfileLimit` in stop-other remediation result contract (invalid-keep early return + normal path)
  - Update renderer `formatStopOthersCodeProfileMapSummary` to consume both limit fields contract-first with compatibility fallback
  - Extend remediation regressions to lock new stop-other contract fields and renderer limit-resolution branches
  - Keep remediation flow/status/actions and i18n copy unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-311-2026-02-09.md`

### PT-SSOT-312: Remaining/failed profile-summary limit contract propagation
- id: `PT-SSOT-312`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main contract constants for profile-summary list limits (`STOP_OTHER_REMAINING_PROFILE_SUMMARY_LIMIT`, `STOP_OTHER_FAILED_PROFILE_SUMMARY_LIMIT`)
  - Expose `remainingProfileSummaryLimit` and `failedProfileSummaryLimit` in stop-other remediation result payloads (invalid-keep early return + normal path)
  - Update renderer `formatStopOthersProfileSummary` to consume profile-summary limits contract-first with safe fallback
  - Extend remediation regressions to lock the new stop-other summary-limit fields and renderer limit-resolution usage
  - Keep remediation flow/status/actions and i18n keys unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-312-2026-02-09.md`

### PT-SSOT-313: Ranked fallback ordering for error-code summary
- id: `PT-SSOT-313`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update renderer `formatStopOthersErrorCodeSummary` to consume `rankedErrorCodes` in fallback sorting path when `failureCodeSummaries` is unavailable
  - Keep ordering deterministic: ranked-code order first, then count fallback, then code lexical tie-break
  - Preserve existing `errorCodeSummaryTopLimit` contract-first top-N slicing behavior
  - Extend remediation regressions to lock ranked-code fallback ordering branch in code-summary formatter
  - Keep remediation status/action routing and i18n copy unchanged
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node --check scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-313-2026-02-09.md`

### PT-SSOT-314: Failure-detail message max-length contract propagation
- id: `PT-SSOT-314`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add main contract constant `STOP_OTHER_FAILURE_DETAIL_MESSAGE_MAX_LENGTH` and trim aggregated detail lines before contract emission
  - Expose `failureDetailMessageMaxLength` in stop-other remediation result payloads (invalid-keep early return + normal path)
  - Update renderer `formatStopOthersFailedDetailSummary` fallback detail formatting to consume `failureDetailMessageMaxLength` contract-first
  - Extend remediation regressions to lock new message-max contract fields and renderer contract-based truncation branch
  - Keep remediation status/action routing and i18n copy unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-314-2026-02-09.md`

### PT-SSOT-315: Code-profile-map profile sampling bound + totals/truncation metadata
- id: `PT-SSOT-315`
- status: `DONE`
- owner: `Codex`
- scope:
  - Bound main stop-other per-code profile samples with `STOP_OTHER_MAX_PROFILE_SAMPLES_PER_CODE` while preserving unique-profile total tracking
  - Enrich main `failureCodeSummaries` contract with `profileTotal` and `profileTruncated` so code-profile-map summary can report hidden profiles deterministically
  - Update renderer `formatStopOthersCodeProfileMapSummary` to compute `{hidden}` using `profileTotal/profileTruncated` contract metadata instead of sample-list length heuristics
  - Extend remediation regressions to lock profile sample bound + contract fields and renderer hidden-count logic
  - Keep remediation status/action routing and i18n copy unchanged
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ranked_codes.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-315-2026-02-09.md`

### PT-SSOT-316: Settings modal inline-handler removal + DOM event binding hardening
- id: `PT-SSOT-316`
- status: `DONE`
- owner: `Codex`
- scope:
  - Remove remaining settings modal inline handlers in `index.html` (`defaultProxyConsistency`, dev toggles, watermark style hover/change)
  - Bind settings change events in renderer via `ensureSettingsInputEventsBound()` (default consistency select + dev toggles + watermark radios)
  - Keep watermark option hover/focus border feedback through DOM listeners (`[data-watermark-option]`) instead of inline mouse events
  - Add regression guard `scripts/regression_no_inline_handlers.js` and wire it into `scripts/regression_all.js` + `package.json`
  - Fill missing i18n keys discovered by regression guard chain (`proxyGroupsLabel/proxyStatsLabel/proxyActionsLabel/proxyInspectorToggle`)
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_no_inline_handlers.js` PASS
  - `npm run regression:no-inline-handlers` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_i18n_toggle_behavior.js` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-316-2026-02-09.md`

### PT-SSOT-317: Proxy UI regression contract alignment + diagnostics anchor restoration
- id: `PT-SSOT-317`
- status: `DONE`
- owner: `Codex`
- scope:
  - Align `scripts/regression_proxy_manager_ui.js` compact-action checks with current layout by accepting compact-only menu wiring **or** primary action wiring for report/inspector
  - Make group-more selector assertions robust to class-composition variants (`A B` vs `A.B`)
  - Restore missing proxy diagnostics/trend anchor nodes in `index.html` (`proxyGroupDelta`, diagnostics summary/details block, fail/trend/anomaly containers) so renderer diagnostics pipeline has deterministic DOM targets
  - Reinstate explicit ultra-compact auto-collapse gate in `applyProxyModalLayoutMode()` and persist collapsed states for secondary filters/advanced/diagnostics
  - Recover full-suite green status (`regression:all`) after PT-SSOT-316 hardening integration
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_no_inline_handlers.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_i18n_toggle_behavior.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-317-2026-02-09.md`

### PT-SSOT-318: Stop-other legacy code-profile-map totals/truncation contract propagation
- id: `PT-SSOT-318`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend main stop-other aggregation contract with fallback-safe profile metadata: `errorCodeProfileTotals` + `errorCodeProfilesTruncated`
  - Propagate new metadata through stop-other IPC defaults and success payload binding paths
  - Make renderer `formatStopOthersCodeProfileMapSummary` fallback path consume totals/truncation contract first (before count/length heuristics) for deterministic hidden-count reporting
  - Keep primary `failureCodeSummaries` contract path unchanged while hardening legacy fallback compatibility
  - Update remediation regressions to guard new metadata exposure and fallback consumption logic
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-318-2026-02-09.md`

### PT-SSOT-319: Stop-other legacy failure-detail totals/truncation contract propagation
- id: `PT-SSOT-319`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend main stop-other aggregation contract with legacy detail metadata: `errorCodeDetailSamples`, `errorCodeDetailTotals`, `errorCodeDetailsTruncated`
  - Propagate new detail metadata through stop-other IPC default payload and success binding
  - Make renderer `formatStopOthersFailedDetailSummary` fallback path consume detail samples/totals/truncation contract first, with ranked-code ordering and deterministic hidden-count computation
  - Keep primary `failureCodeSummaries` detail path unchanged while hardening legacy fallback compatibility
  - Update remediation regressions (`ipc/aggregation/failure-details`) and compatibility assertions (`failure-summaries`) to accept current builder form
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-319-2026-02-09.md`

### PT-SSOT-320: Stop-other contract-version gate + strict fallback heuristic shutdown
- id: `PT-SSOT-320`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add stop-other contract version metadata (`stopOtherContractVersion`) in main-process stop-other IPC payload defaults and aggregation binding
  - Introduce renderer contract-version resolver and strict mode gate (`STOP_OTHER_STRICT_CONTRACT_VERSION = 2`) for stop-other remediation formatters
  - In strict mode, disable fallback hidden-count derivation from `failed[]`/sample lengths for code-summary, failure-details, and code-profile-map summaries
  - Keep legacy compatibility: when contract version is missing/older, existing heuristic fallback behavior remains available
  - Update remediation regression guards (`ipc/aggregation/failure-summaries/failure-details/code-profile-map`) for contract-version and strict-fallback gates
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_failure_summaries.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-320-2026-02-09.md`

### PT-SSOT-321: Stop-other dominant-code strict contract fallback gate
- id: `PT-SSOT-321`
- status: `DONE`
- owner: `Codex`
- scope:
  - Keep stop-other dominant-code recommendation contract-first by disabling `failed[0]` fallback when `stopOtherContractVersion >= 2`
  - Reuse existing contract-version resolver/strict-mode gate in blocked remediation path to keep behavior consistent with PT-SSOT-320 strict policy
  - Preserve legacy compatibility: when contract version is absent/old, retain historical dominant-code fallback from first failed item
  - Update remediation next-step regression guard to assert strict-mode fallback shutdown for dominant-code derivation
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_nextstep.js` PASS
  - `node scripts/regression_profile_remediation_nextstep.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-321-2026-02-09.md`

### PT-SSOT-322: Stop-other strict fallback totals/truncation-only code coverage
- id: `PT-SSOT-322`
- status: `DONE`
- owner: `Codex`
- scope:
  - Fix `formatStopOthersFailedDetailSummary` strict fallback code ordering to merge codes from `errorCodeDetailSamples` + `errorCodeDetailTotals` + `errorCodeDetailsTruncated`
  - Ensure strict fallback hidden-count computation includes totals/truncation-only codes even when sample map omits those codes
  - Fix `formatStopOthersCodeProfileMapSummary` strict fallback to backfill contract-only codes from `errorCodeProfileTotals/errorCodeProfilesTruncated` (and ranked/count context) when `errorCodeProfiles` misses them
  - Preserve strict policy: no fallback to `failed[]` in strict mode; only contract-derived buckets are used
  - Update remediation regressions (`failure-details/code-profile-map`) to assert contract-only code merge/backfill logic
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-322-2026-02-09.md`

### PT-SSOT-323: Stop-other code-profile hidden-count correctness for no-name buckets
- id: `PT-SSOT-323`
- status: `DONE`
- owner: `Codex`
- scope:
  - Fix `formatStopOthersCodeProfileMapSummary` hidden-count math to subtract the real shown-name count instead of static `nameTop`
  - Ensure strict contract buckets with no sampled names still expose visibility (`CODE +N`) when total is unknown but truncation metadata exists
  - Keep contract-first behavior for strict mode while preserving legacy count fallback for non-strict paths
  - Extend code-profile-map remediation regression guard to assert shown-name-based hidden-count and no-name `+N` branch behavior
  - Restore missing i18n keys (`proxyEmptyHint`, `proxyFilterHint`) in `i18n.js` and `locales/zh-CN.js` to keep full regression deterministic
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_profile_remediation_code_profile_map.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-323-2026-02-09.md`

### PT-SSOT-324: Stop-other failure-detail strict no-sample visibility fallback
- id: `PT-SSOT-324`
- status: `DONE`
- owner: `Codex`
- scope:
  - Fix `formatStopOthersFailedDetailSummary` strict contract path so totals/truncation-only buckets (no detail samples) still produce deterministic visibility feedback
  - Compute strict fallback extra-count once and reuse for both sample-present and sample-absent branches
  - Add strict no-sample output path (`Failure details: +N`) instead of returning empty summary when contract metadata indicates hidden detail items
  - Preserve strict policy (no `failed[]` fallback) and keep existing sampled-detail rendering unchanged
  - Extend failure-detail remediation regression to assert strict no-sample fallback gate and `+N` formatting branch
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-324-2026-02-09.md`

### PT-SSOT-325: Stop-other summary-list strict no-sample failure-detail fallback
- id: `PT-SSOT-325`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `formatStopOthersFailedDetailSummary` summary-list branch so strict contract mode remains visible when `failureCodeSummaries` provides totals/truncation but empty `details`
  - Hoist summary-branch `shownCount/extraCount` computation outside sample-present condition to support both sample and no-sample paths
  - Add strict summary-list no-sample output path (`Failure details: +N`) using existing i18n formatter without re-enabling `failed[]` fallback
  - Replace inline truncation check with explicit summary-level marker (`hasSummaryDetailTruncated`) for deterministic contract semantics
  - Extend failure-detail remediation regression guard to assert summary-list truncation marker and strict no-sample summary behavior
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_failure_details.js` PASS
  - `node scripts/regression_profile_remediation_failure_details.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-325-2026-02-09.md`

### PT-SSOT-326: Stop-other outcome counters strict contract-first gating
- id: `PT-SSOT-326`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `resolveStopOthersOutcome` with strict contract mode gating based on `stopOtherContractVersion`
  - In strict mode (`>=2`), resolve `requestedCount/stoppedCount/failedCount/remainingCount` from explicit contract numeric fields only
  - Preserve backward compatibility for legacy payloads by keeping array-length fallback (`requestedIds/stoppedIds/failed/remainingIds`) only in non-strict mode
  - Keep existing outcome kind/status mapping unchanged while reducing heuristic coupling in strict mode
  - Extend IPC remediation regression guard to assert strict-mode counter fallback gates
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-326-2026-02-09.md`

### PT-SSOT-327: Stop-other profile-summary strict no-name count fallback
- id: `PT-SSOT-327`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `formatStopOthersProfileSummary` for strict contract mode when profile-name arrays are missing but `remainingCount/failedCount` are present
  - Add strict contract count fallback lines for remaining/failed profile summaries using deterministic `+N` placeholders
  - Preserve existing named-summary behavior and legacy fallback paths for non-strict payloads
  - Keep existing i18n keys/templates (`profileErrActionStopOthersRemainingList`, `profileErrActionStopOthersFailedList`) and inject `+N` via `names` slot
  - Extend profile-summary remediation regression guard to assert contract-version read, strict-mode resolver, and strict count fallback branches
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-327-2026-02-09.md`

### PT-SSOT-328: Stop-other code-summary strict dominant-code visibility fallback
- id: `PT-SSOT-328`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `formatStopOthersErrorCodeSummary` strict contract path for payloads where `errorCodeCounts/failureCodeSummaries` are absent but `dominantErrorCode` is available
  - Add strict dominant-code fallback summary (`Failure code distribution`) using `dominantErrorCode` and optional `failedCount`
  - Preserve existing strict rule (no `failed[]` counting fallback) and legacy non-strict fallback behavior
  - Keep code-summary ordering and top-limit behavior unchanged for normal count/map paths
  - Extend aggregation remediation regression guard to assert strict dominant-code fallback gate and formatter branch
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_aggregation.js` PASS
  - `node scripts/regression_profile_remediation_aggregation.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-328-2026-02-09.md`

### PT-SSOT-329: Stop-other profile-summary strict remaining-id fallback shutdown
- id: `PT-SSOT-329`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `formatStopOthersProfileSummary` strict mode by disabling `remainingIds`-as-name fallback
  - In strict contract mode, profile summary name source now prefers only `remainingProfiles`; when absent, falls back to count-based `+N` line
  - Preserve legacy behavior for non-strict payloads (still allow `remainingIds` fallback for compatibility)
  - Keep existing i18n templates and strict count fallback introduced in PT-SSOT-327 unchanged
  - Extend profile-summary remediation regression guard to assert strict gate around `remainingIds` fallback
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-329-2026-02-09.md`

### PT-SSOT-330: Stop-other failed-profile strict contract list field
- id: `PT-SSOT-330`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `failedProfiles` contract field to stop-other IPC payload defaults and result binding in main process
  - Build `failedProfiles` as normalized `{id, name}` list from stop-other failure set for deterministic renderer consumption
  - In `formatStopOthersProfileSummary`, make failed-list summary prefer `failedProfiles` and gate legacy `failed[]` fallback behind non-strict mode
  - Keep strict count fallback (`+N`) for failed summary unchanged when name list is absent
  - Extend remediation regressions (`ipc/profiles`) to assert new contract field and strict fallback gating
- acceptance:
  - `node --check main.js` PASS
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_profile_remediation_ipc.js` PASS
  - `node --check scripts/regression_profile_remediation_profiles.js` PASS
  - `node scripts/regression_profile_remediation_ipc.js` PASS
  - `node scripts/regression_profile_remediation_profiles.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-330-2026-02-09.md`

### PT-SSOT-331: Updater unzip duplicate-path collision hardening
- id: `PT-SSOT-331`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `extractZip` with per-entry target-path collision detection so duplicate archive entries cannot overwrite the same extracted target path within one extraction run
  - Apply case-folded collision keys on case-insensitive platforms (`win32`/`darwin`) to block `A.txt` vs `a.txt` ambiguity
  - Keep existing Zip-Slip protections (absolute path / traversal / symlink / size budgets) unchanged
  - Extend updater security regression with case-fold duplicate zip entry coverage
- acceptance:
  - `node --check updateUtils.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-331-2026-02-09.md`

### PT-SSOT-332: Main updater URL validation contract unification
- id: `PT-SSOT-332`
- status: `DONE`
- owner: `Codex`
- scope:
  - Import `validateUpdateDownloadUrl` in `main.js` updater path and centralize URL validation through `enforceValidatedXrayUpdateUrl`
  - Apply URL validation to both manifest-derived and derived fallback download URLs (`asset` + `dgst`, direct + proxy)
  - Keep existing route-affinity / anti-downgrade / digest verification / Zip-Slip protections unchanged
  - Extend updater regression assertions to lock helper presence and validation wiring in main updater flow
- acceptance:
  - `node --check main.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-332-2026-02-09.md`

### PT-SSOT-333: Main updater fallback URL pre-validation + protocol error mapping
- id: `PT-SSOT-333`
- status: `DONE`
- owner: `Codex`
- scope:
  - Harden `downloadFileWithRouteFallback` by validating primary URL through updater URL contract before download attempt
  - Validate fallback URL before retry handoff so retry path cannot proceed with non-allowlisted/non-HTTPS URLs
  - Keep existing retryability gate and route-affinity behavior unchanged
  - Extend updater error-code mapping with explicit non-HTTPS rejection code (`XRAY_UPDATE_PROTOCOL_NOT_ALLOWED`)
  - Extend updater security regression to assert normalized fallback helper wiring and protocol-error mapping
- acceptance:
  - `node --check main.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-333-2026-02-09.md`

### PT-SSOT-334: Main updater error-code taxonomy stratification
- id: `PT-SSOT-334`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend `mapXrayUpdateErrorCode` with explicit classes for updater download/validation failures:
    - HTTP response failure (`XRAY_UPDATE_HTTP_ERROR`)
    - network timeout (`XRAY_UPDATE_NETWORK_TIMEOUT`)
    - redirect overflow (`XRAY_UPDATE_REDIRECT_LIMIT`)
    - payload/uncompressed-size overflow (`XRAY_UPDATE_PAYLOAD_TOO_LARGE`)
    - URL validation failures (`XRAY_UPDATE_URL_INVALID`)
  - Keep existing updater security mappings (protocol/host/zip/digest/downgrade/binary guards) unchanged
  - Extend updater security regression to lock new error mapping branches
- acceptance:
  - `node --check main.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-334-2026-02-09.md`

### PT-SSOT-335: Main updater failureStage-aware error-code resolver
- id: `PT-SSOT-335`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add `mapXrayUpdateFailureStageFallbackCode` to map updater `failureStage` values to deterministic fallback error codes
  - Add `resolveXrayUpdateErrorCode(err, failureStage)` so generic mapper misses (`XRAY_UPDATE_FAILED`) are resolved by stage fallback
  - Wire updater failure return payload to use the stage-aware resolver (instead of direct message-only mapper)
  - Extend updater regression assertions for stage-fallback mapper/resolver presence and failure return binding
- acceptance:
  - `node --check main.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-335-2026-02-09.md`

### PT-SSOT-336: Renderer updater error-message stratified mapping
- id: `PT-SSOT-336`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer-side updater error-message resolver that maps updater error codes to user-facing remediation text
  - Add composed updater error alert builder that preserves structured metadata (`errorCode` + `failureStage`) and raw error text on detail line
  - Replace legacy suffix-concatenation alert flow in `checkUpdates` with composed stratified message
  - Add i18n keys (EN/CN) for new updater remediation messages and update updater security regression assertions for renderer mapping
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-336-2026-02-09.md`

### PT-SSOT-337: Renderer updater next-step guidance mapping
- id: `PT-SSOT-337`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer-side updater next-step resolver (`resolveXrayUpdateNextStepMessage`) mapping error code/stage to actionable guidance lines
  - Extend composed updater error alert output to include explicit next-step line before diagnostic metadata
  - Add i18n keys (EN/CN) for updater next-step guidance text
  - Extend updater security regression assertions to lock next-step resolver and multiline composition contract
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-337-2026-02-09.md`

### PT-SSOT-338: Renderer updater metadata-hint enrichment
- id: `PT-SSOT-338`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer-side metadata hint resolver (`resolveXrayUpdateMetadataHint`) keyed by updater metadata fetch status and diagnostics fields
  - Extend composed updater error alert to include metadata hint line before code/stage/raw diagnostic detail line
  - Add i18n keys (EN/CN) for metadata hint messages (`manifest_missing` / `fetch_error`)
  - Extend updater security regression assertions to lock metadata-hint resolver and composition binding
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-338-2026-02-09.md`

### PT-SSOT-339: Renderer updater metadata route-switch guidance
- id: `PT-SSOT-339`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend renderer metadata hint logic with route-switch suggestion mapping in metadata fetch-error scenarios
  - Add direct/proxy suggestion branches keyed by `metadataFetchRoute`, `metadataFetchErrorRetryable`, and fallback attempt/result
  - Keep existing metadata hint base payload (`route/code/retryable/fallback`) unchanged and append route suggestion sentence when applicable
  - Add i18n keys (EN/CN) for route-switch suggestions and extend updater security regression assertions to lock the new branches
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-339-2026-02-09.md`

### PT-SSOT-340: Renderer metadata route-hint signal precedence hardening
- id: `PT-SSOT-340`
- status: `DONE`
- owner: `Codex`
- scope:
  - Refine renderer metadata route-hint decision logic by introducing route-source precedence (`metadataFetchRoute` first, then `metadataFetchFailureRoute`)
  - Add explicit route-hint branches for `fallback succeeded` and `non-retryable metadata errors` to avoid misleading switch suggestions
  - Keep existing fetch-error base hint payload (`route/code/retryable/fallback`) unchanged and append route hints deterministically
  - Add i18n keys (EN/CN) for new route-hint outcomes and extend updater security regression assertions for precedence/branch coverage
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-340-2026-02-09.md`

### PT-SSOT-341: Renderer metadata attempt-flow route fallback
- id: `PT-SSOT-341`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend renderer metadata route-hint fallback logic to use `metadataFetchAttemptFlow` when direct route signals are unavailable
  - Add deterministic fallback branches:
    - `retryable + unknown route + direct_only -> try proxy`
    - `retryable + unknown route + direct_then_proxy -> flow-ambiguous hint`
  - Keep existing precedence chain (`both failed` / `fallback succeeded` / `non-retryable`) unchanged
  - Add i18n keys (EN/CN) for flow-ambiguous hint and extend updater security regression assertions for attempt-flow branches
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-341-2026-02-09.md`

### PT-SSOT-342: Renderer metadata hint severity layering
- id: `PT-SSOT-342`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer metadata-hint severity resolver (`resolveXrayUpdateMetadataSeverity`) to classify updater metadata states into `info` / `warn` / `block`
  - Add renderer metadata-hint formatter (`formatXrayUpdateMetadataHint`) to prepend severity labels while preserving existing route/code diagnostics payload
  - Route updater error alert composition through formatted metadata hint line instead of plain hint line (`composeXrayUpdateErrorMessage`)
  - Add i18n keys (EN/CN) for metadata severity labels and extend updater security regression assertions for severity resolver/formatter wiring
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-342-2026-02-09.md`

### PT-SSOT-343: Renderer metadata fetch diagnostics enrichment
- id: `PT-SSOT-343`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend renderer metadata fetch-error hint payload to include host/http-status/attempt-count diagnostics in a deterministic template
  - Normalize metadata host signals (`metadataFetchRouteHost`, `metadataFetchFailureHost`) and derive a stable host token for hint composition
  - Keep severity and route-hint precedence logic unchanged while enriching fetch-error context fields only
  - Update EN/CN i18n template text and extend updater security regression assertions for the new diagnostics bindings
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run -s regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-343-2026-02-09.md`

### PT-SSOT-344: Renderer metadata unknown-status fallback hint
- id: `PT-SSOT-344`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add renderer fallback branch for non-empty updater metadata status values outside `manifest_missing`/`fetch_error`, so metadata hints are not silently dropped
  - Emit deterministic fallback hint payload with `status/route/host/http/attempts` fields using existing normalized telemetry values
  - Keep metadata severity and existing route-switch guidance branches unchanged
  - Add i18n keys (EN/CN) and extend updater security regression assertions for unknown-status fallback branch + template bindings
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check i18n.js` PASS
  - `node --check locales/zh-CN.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run -s regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-344-2026-02-09.md`

### PT-SSOT-345: Renderer metadata severity precedence alignment
- id: `PT-SSOT-345`
- status: `DONE`
- owner: `Codex`
- scope:
  - Align renderer metadata severity precedence with route-hint semantics by evaluating `fallback succeeded` before non-retryable block
  - Keep existing severity classes (`info`/`warn`/`block`) and metadata hint payload fields unchanged
  - Add regression guard to lock severity ordering (`fallback succeeded` branch must appear before non-retryable branch)
  - Preserve all existing updater error-message composition and i18n bindings
- acceptance:
  - `node --check renderer.js` PASS
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run -s regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-345-2026-02-09.md`

### PT-SSOT-346: Updater metadata runtime scenario regression harness
- id: `PT-SSOT-346`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add runtime behavior assertions in `scripts/regression_updater_security.js` for renderer metadata helpers (`resolveXrayUpdateMetadataHint` / `resolveXrayUpdateMetadataSeverity` / `formatXrayUpdateMetadataHint`)
  - Extract target function blocks from `renderer.js` and execute them in a vm sandbox with deterministic `tText`/`tFormat` stubs (without loading full renderer runtime)
  - Cover critical semantic scenarios: fallback-succeeded precedence, non-retryable block path, unknown-status non-silent hint, and fetch-error diagnostics tokens (`host/http/attempts`)
  - Keep existing string-level contract checks unchanged while adding runtime-level guardrails against semantic regressions
- acceptance:
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run -s regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-346-2026-02-09.md`

### PT-SSOT-347: Updater compose-error runtime assembly regression harness
- id: `PT-SSOT-347`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend updater security regression with vm-based runtime assertions for `composeXrayUpdateErrorMessage` and its dependencies (`resolveXrayUpdateErrorMessage` / `resolveXrayUpdateNextStepMessage` / metadata formatter chain)
  - Validate compose output line assembly in key scenarios: full-detail 3-line output, empty payload 2-line fallback output, and metadata-only detail output
  - Validate detail-line ordering contract for full-detail scenario (`metadata hint -> [errorCode]/[stage] -> raw error`)
  - Keep existing static string contract checks unchanged; runtime compose checks are additive hardening only
- acceptance:
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run -s regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-347-2026-02-09.md`

### PT-SSOT-348: Updater compose unknown-status coexisting-token runtime guard
- id: `PT-SSOT-348`
- status: `DONE`
- owner: `Codex`
- scope:
  - Extend compose runtime assertions with unknown-status scenario where metadata hint coexists with updater `errorCode`/`failureStage` and raw error text
  - Validate detail-line token coexistence (`[warn] metadata hint` + `[XRAY_UPDATE_*]` + `[stage:*]` + raw error) in a single composed detail line
  - Validate unknown-status compose detail ordering contract remains `metadata -> code/stage -> raw`
  - Keep existing compose runtime scenarios and static contract assertions unchanged
- acceptance:
  - `node --check scripts/regression_updater_security.js` PASS
  - `node scripts/regression_updater_security.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `npm run -s regression:all` PASS
  - Decision packet exists: `.context-snapshots/decision-packet-PT-SSOT-348-2026-02-09.md`

### PT-SSOT-208-HF1: zh locale encoding/syntax recovery
- id: `PT-SSOT-208-HF1`
- status: `DONE`
- owner: `Codex`
- scope:
  - Repair `locales/zh-CN.js` corruption introduced by wrong encoding, restoring valid JavaScript object syntax
  - Ensure Chinese locale script can load and participate in runtime `t()` translation switching
  - Add missing keys: `subFetchAllowlistSaved`, `subFetchAllowlistInvalid`
- acceptance:
  - `node --check locales/zh-CN.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_i18n_toggle_behavior.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF2: Proxy Manager scroll containment + inspector collapse toggle
- id: `PT-SSOT-208-HF2`
- status: `DONE`
- owner: `Codex`
- scope:
  - Fix Proxy Manager list visibility by making `#preProxyList` scrollable within the left column (`index.html`)
  - Add persistent inspector collapse/expand toggle (`proxyInspectorCollapsed`) so operators can focus on list triage when needed (`index.html`/`renderer.js`)
  - Harden language hot-switch (`applyLang`) to avoid partial/no-op updates when optional panels throw (`renderer.js`)
  - Upgrade i18n regression to include `tText/tFormat` and `index.html` `data-i18n` keys (`scripts/regression_i18n.js`)
  - Extend UI regression to assert inspector toggle wiring (`scripts/regression_proxy_manager_ui.js`)
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF3: UI polish + i18n placeholder sweep + profile “More” reliability
- id: `PT-SSOT-208-HF3`
- status: `DONE`
- owner: `Codex`
- scope:
  - Fix mixed CN/EN UX by moving add/edit modal search placeholders (timezone/city/language) to `data-i18n-placeholder` keys
  - Localize proxy engine label + engine restart hint, and reuse existing debug-port i18n keys for edit modal debug port section
  - Remove mixed-language copy in core CN labels (`languageLabel`, `locationLabel`) for a fully-Chinese UI
  - Calmer visuals: simplify profile card backgrounds and tune Proxy Manager surface borders/shadows for less “box-in-box” noise
  - Fix profile card overflow menu (“More”) reliability by relying on native `<details>` toggle and closing other open menus on open
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF4: Proxy manager phase-2 readability/layout uplift
- id: `PT-SSOT-208-HF4`
- status: `DONE`
- owner: `Codex`
- scope:
  - Rebalance proxy manager shell layout with calmer surfaces, improved spacing, and larger typography for key controls/actions
  - Add list column headers (Select / Node / Actions) to improve scanability and reduce row-level ambiguity
  - Expand inspector default width and improve step/attempt line wrapping so long diagnostics remain visible
  - Normalize legacy `Manual Node` fallback into the active locale to reduce CN/EN mixed display after language switching
  - Add i18n keys: `proxyColumnSelect`, `proxyColumnNode`, `proxyColumnActions`
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF5: Proxy manager visual hierarchy + inspector readability pass
- id: `PT-SSOT-208-HF5`
- status: `DONE`
- owner: `Codex`
- scope:
  - Increase advanced-panel typography/button sizing and reduce dense micro-text for better first-read clarity
  - Add explicit per-node status pill (PASS/FAIL/WAIT) in list rows to improve triage speed without opening details
  - Improve row readability (remark clamp/expand behavior, selected-row marker) for faster scanning in large lists
  - Upgrade inspector default width policy (default/reset/min/max) and section layout to show long steps/attempts with full-height scrolling panes
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF6: Proxy manager advanced-density reflow + action grid optimization
- id: `PT-SSOT-208-HF6`
- status: `DONE`
- owner: `Codex`
- scope:
  - Reflow advanced panel to a lower-cognitive 2-column layout and widen trust/audit section to full row for readability
  - Increase strategy form control sizing and reduce per-cell compression for faster configuration under stress
  - Add action-grid adaptation by node source (`manual` vs subscription) to remove empty button slots and improve hit-target clarity
  - Increase advanced panel viewport budget and keep scrolling behavior predictable in long trust/route exports
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF7: Proxy manager triage-clarity pass (status accents + low-noise actions)
- id: `PT-SSOT-208-HF7`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add status-driven row accents (`pass`/`fail`/`wait`) for faster visual triage in long node lists
  - Reduce row action clutter by context-revealing low-priority actions (`edit`/`delete`) only on hover/select/focus
  - Introduce an advanced-shell container to visually group advanced controls and reduce layout fragmentation
  - Preserve existing action wiring/IDs and keep all advanced exports/tests discoverable
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF8: Proxy manager common/expert advanced workflow split
- id: `PT-SSOT-208-HF8`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add persistent advanced workflow mode (`common` / `expert`) with explicit segmented control in proxy advanced shell
  - Default to `common` view to reduce first-screen complexity and hide expert-only route/trust sections
  - Keep full capability in `expert` view, preserving all existing replay/trust/audit actions and IDs
  - Add localized labels/hints for advanced view switching (`proxyAdvancedViewLabel`, `proxyAdvancedViewCommon`, `proxyAdvancedViewExpert`, `proxyAdvancedCommonHint`)
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF9: Proxy manager common strategy compression + one-click profile presets
- id: `PT-SSOT-208-HF9`
- status: `DONE`
- owner: `Codex`
- scope:
  - Compress strategy controls in `common` advanced view to high-frequency knobs only (enabled/profile/concurrency/batch/budget)
  - Keep probe/backoff timeout knobs expert-only and preserve full capability in `expert` view
  - Add one-click profile preset chips (`quick`/`standard`/`deep`) with immediate persistence to reduce operator steps
  - Add localized strategy subtitle/common hint/profile-apply feedback to avoid mixed CN/EN messaging in the new flow
  - Extend proxy manager regression checks for new profile-preset action/chip wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF10: Proxy manager action hierarchy simplification + compact group-more menu
- id: `PT-SSOT-208-HF10`
- status: `DONE`
- owner: `Codex`
- scope:
  - Re-layout group action bar to keep high-frequency actions (Test All / Report / Details) always visible in a compact single command row
  - Move lower-frequency subscription actions (Rollback / Edit Sub / New Sub) into a compact `more` menu to reduce visual noise
  - Add close-on-click behavior for group-more menu action items to keep interaction flow snappy and deterministic
  - Polish top hint visual hierarchy so guidance is readable without crowding primary controls
  - Extend proxy manager UI regression assertions for group-more structure and close guard wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF11: Proxy manager two-tier filters (primary focus + secondary fold)
- id: `PT-SSOT-208-HF11`
- status: `DONE`
- owner: `Codex`
- scope:
  - Split filter controls into two tiers: primary row (search/sort) and secondary fold (status dropdown, clear/snapshot, query presets)
  - Add persistent secondary-filter toggle (`More Filters` / `Hide Filters`) to reduce first-screen clutter while preserving full power
  - Keep quick status chips always visible for high-frequency triage, with advanced preset controls folded by default
  - Add renderer-side persisted UI state for filter fold (`proxySecondaryFiltersExpanded`) with language-safe label updates
  - Extend proxy manager UI regression coverage for secondary-filter container/toggle and action wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF12: Diagnostics summary-first cards + collapsible detail stream
- id: `PT-SSOT-208-HF12`
- status: `DONE`
- owner: `Codex`
- scope:
  - Refactor diagnostics area into summary-first layout with three compact cards (Fail Focus / Trend Δ / Anomaly) for at-a-glance triage
  - Add dedicated diagnostics-detail fold toggle to keep heavy trend/history streams hidden by default
  - Persist diagnostics-detail fold state across sessions (`proxyDiagnosticsDetailsExpanded`)
  - Add renderer summary synthesis logic that computes fail/trend/anomaly severity from existing telemetry stores
  - Extend proxy manager UI regression checks for new diagnostics summary/detail structure and action wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF13: Inspector summary-first + collapsible sections + adaptive width
- id: `PT-SSOT-208-HF13`
- status: `DONE`
- owner: `Codex`
- scope:
  - Refactor proxy inspector to summary-first cards (status / latency / code / engine) so key health signals are visible without scrolling
  - Convert `Steps` and `Attempts` into independent collapsible sections with per-section counts and persisted fold state
  - Persist inspector detail fold states (`proxyInspectorStepsExpanded`, `proxyInspectorAttemptsExpanded`) and keep language-safe tooltips when toggling
  - Tighten inspector width policy (lower default + viewport-aware clamp + resize recalibration) to keep the node list readable in manage view
  - Extend proxy manager UI regression assertions for new inspector controls and action wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF14: Node-row action hierarchy + persistent row-more menu ergonomics
- id: `PT-SSOT-208-HF14`
- status: `DONE`
- owner: `Codex`
- scope:
  - Re-layout proxy node rows to reduce action-column footprint so node info remains readable at common window widths
  - Shift low-frequency row actions into per-row `more` menu (`Edit`/`Delete`) while keeping high-frequency actions (`Test`/`Details`) visible
  - Add row-more interaction safety (outside-click close, Esc close, scroll direction recalculation, sibling menu auto-close)
  - Remove hover-only hidden destructive controls to improve deterministic behavior on non-hover/touch workflows
  - Extend proxy manager UI regression coverage for row-more menu helpers and renderer wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF15: Node-row visual hierarchy polish + meta pill strip
- id: `PT-SSOT-208-HF15`
- status: `DONE`
- owner: `Codex`
- scope:
  - Replace noisy row textual summaries with a compact meta-pill strip for quick scan (status/code, engine, duration, attempts, profile, tested-at)
  - Keep node identity line focused (protocol + name + latency + status) and move rich telemetry into low-visual-noise pills
  - Add dedicated IP/location single-line style to reduce vertical clutter while preserving context
  - Preserve high-frequency row actions (Test/Details) and row-more hierarchy introduced in HF14
  - Extend proxy manager UI regression checks for new row meta strip + pill DOM contracts
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF16: Compact layout mode for narrow/zoomed proxy manager view
- id: `PT-SSOT-208-HF16`
- status: `DONE`
- owner: `Codex`
- scope:
  - Introduce adaptive compact-layout mode for Proxy Manager based on available viewport/modal size
  - Auto-switch panel arrangement to stacked mode in cramped space so node list and inspector remain readable without horizontal squeeze
  - Reduce dense chrome in compact mode (top hint hide, tighter paddings, compact control rows) to maximize visible operational content
  - Reuse existing inspector sizing logic with compact-mode recalculation on open/resize/language refresh
  - Extend proxy manager UI regression checks for compact layout CSS hooks and renderer toggle logic
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF17: Touch hit-area pass + low-friction row focus/scroll rhythm
- id: `PT-SSOT-208-HF17`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add touch-optimized modal mode (`is-touch-optimized`) with larger tap targets for row actions, diagnostics toggles, status chips, and filter controls
  - Promote proxy selector input to dedicated style hook (`proxy-select-input`) and enlarge it in touch mode for reliable tap behavior
  - Improve row interaction flow by syncing row click/change/space selection to inspector focus (`currentProxyInspectorId`) to reduce extra clicks
  - Add near-edge keyboard/click scroll assist (`scrollIntoView`) and smooth list scroll behavior for steadier navigation rhythm
  - Extend proxy manager UI regression checks for touch-layout detector/toggle, select-input class wiring, and scroll/focus helpers
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF18: Ultra-compact action hierarchy + one-click test priority
- id: `PT-SSOT-208-HF18`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add ultra-compact layout mode (`is-ultra-compact-layout`) for very narrow/zoomed proxy manager windows
  - Prioritize one-click test flow by hiding row primary details button in ultra-compact mode and moving details into row more-menu
  - Keep group-level secondary actions reachable by exposing compact-only report/details toggles in group more-menu when primary bar is collapsed
  - Extend inspector toggle label sync to all toggle controls (primary + compact menu variant) to avoid stale mixed-state labels
  - Extend proxy manager UI regression checks for ultra-compact detector/class wiring and compact-only action hooks
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF19: Full-content visibility pass + clearer group-more affordance
- id: `PT-SSOT-208-HF19`
- status: `DONE`
- owner: `Codex`
- scope:
  - Expand proxy modal usable workspace (near-full viewport) and enable shell-level vertical scrolling to prevent hidden controls/content in dense layouts
  - Make group-level `More` action discoverable in standard layout (icon + text) and keep compact/ultra-compact interaction consistent
  - Add advanced-shell collapsed density mode (`data-advanced-expanded`) so collapsed state minimizes non-critical chrome and preserves list/inspector focus
  - Rebalance group header action-column sizing for better left-panel readability while retaining inspector alignment behavior
  - Extend proxy manager UI regression checks for group-more label structure and advanced-expanded state contracts
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF20: Top quick-action lane + reduced-filter-click workflow
- id: `PT-SSOT-208-HF20`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add top-right quick action lane in proxy manager (`+ New Sub` + `Done`) so high-frequency management actions remain reachable without scrolling to footer
  - Keep quick-action lane responsive across compact/ultra-compact/mobile breakpoints (auto-wrap, narrow-screen fallback)
  - Improve filter efficiency by making status-chip re-click toggle back to `All` (one-click clear behavior)
  - Add proxy-modal `Ctrl/Cmd + S` shortcut to persist settings directly from keyboard
  - Extend proxy manager UI regression coverage for new quick-action lane and shortcut/toggle contracts
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF21: Visual rhythm polish + action noise reduction
- id: `PT-SSOT-208-HF21`
- status: `DONE`
- owner: `Codex`
- scope:
  - Improve proxy-group tab usability under large group counts (horizontal overflow support + non-shrinking tab chips)
  - Reduce node-row action noise by demoting inline `Detail` action and keeping row actions focused on high-frequency `Test + More`
  - Increase row visual rhythm with subtle card background, smoother hover lift, and consistent motion timing
  - Improve quick status bar readability with card-like container chrome for clearer scan and click targeting
  - Extend proxy manager UI regression assertions for tab overflow support and detail-action demotion contract
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF22: Sticky top command bar + localization consistency hardening
- id: `PT-SSOT-208-HF22`
- status: `DONE`
- owner: `Codex`
- scope:
  - Upgrade proxy top-control bar to sticky behavior so mode/switch/quick actions remain visible during long-list scrolling
  - Add proxy-modal `Ctrl/Cmd + N` shortcut for one-step new-subscription modal entry
  - Harden language consistency for duplicated footer/top controls by syncing all `done/close` buttons on every proxy-list render
  - Keep compatibility with compact/ultra-compact modes while preserving existing quick-action flow
  - Extend proxy manager UI regression checks for sticky-bar presence, `Ctrl/Cmd+N`, and multi-button i18n sync contract
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF23: Visibility recovery + more-menu reachability hardening
- id: `PT-SSOT-208-HF23`
- status: `DONE`
- owner: `Codex`
- scope:
  - Reduce header vertical pressure by hiding always-on hint banner and tightening group-action button width contracts
  - Make group `More` menu consistently meaningful in normal mode by exposing compact-only fallback actions (`Report` / `Details`) at all sizes
  - Increase menu stacking/scroll safety (group and row more-menu z-index + bounded menu max-height/overflow) so menu content is visible above dense panels
  - Trigger ultra-compact mode earlier (`1260w / 820h`) and auto-collapse heavy diagnostics/advanced panels in ultra-compact openings to recover visible node area
  - Extend proxy manager UI regression checks for updated ultra-compact thresholds and compact auto-collapse persistence contracts
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF24: Dense-window readability recovery + menu orientation safeguards
- id: `PT-SSOT-208-HF24`
- status: `DONE`
- owner: `Codex`
- scope:
  - Remove sticky top-bar behavior that caused tab/header overlap in constrained windows, and re-balance top/group/header paddings for denser readability
  - Reduce action bar footprint (button min-width/height tuning) and trim duplicated bottom primary action (`Done`) to recover vertical list space
  - Add group-more adaptive direction logic (`open-upward`) and shell-scroll re-evaluation to keep menu entries visible near viewport edges
  - Keep group/row more menus scroll-safe via max-height + overflow guard and stronger z-index layering in dense layouts
  - Extend proxy manager UI regression checks for non-sticky top-controls contract and group-more direction-helper wiring
- acceptance:
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF25: Proxy-manager layout hierarchy uplift + menu visibility stabilization
- id: `PT-SSOT-208-HF25`
- status: `DONE`
- owner: `Codex`
- scope:
  - Rebuild proxy-manager visual hierarchy for dense workflows: stronger top-control grouping, clearer typography scale, larger touch targets, and lower cognitive noise in group header blocks
  - Reduce right-pane pressure by tightening default inspector width contract and auto-collapsing inspector in compact openings so node lists remain fully readable on non-maximized windows
  - Improve group/node `More` menu reachability via stronger layering, bounded adaptive menu heights, and larger scroll-safe buffers in node list containers
  - Remove stale delta/stat card clutter by using snapshot-aware `data-empty` visibility control and cleaner stat/delta chrome states
  - Keep compact/ultra-compact behavior aligned with existing regression contracts while improving mobile/narrow-screen top-control composition
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF26: Density compression pass for above-the-fold visibility
- id: `PT-SSOT-208-HF26`
- status: `DONE`
- owner: `Codex`
- scope:
  - Compress top control lane and group header vertical footprint (smaller control heights, tighter spacing, removed redundant hint row occupancy) to increase visible node-list area
  - Rebalance compact layout behavior to avoid stacked oversized controls: compact top lane returns to horizontal-wrap flow and primary group actions are reduced to `Test + More`
  - Reduce filter/quick-bar/advanced toolbar paddings and control heights for denser information display without removing functionality
  - Shrink list bottom reserve space from fixed oversized padding to practical menu-safe values, preserving more-menu visibility while restoring visible rows
  - Enforce compact-open auto-collapse for secondary filter panel to keep first-screen interaction focused and reduce unnecessary scrolling
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF27: Action-layout hierarchy correction + command placement optimization
- id: `PT-SSOT-208-HF27`
- status: `DONE`
- owner: `Codex`
- scope:
  - Correct command hierarchy by moving subscription creation from top-global lane into group action lane, so “group operations” (Test/New Sub/Report) stay in one place
  - Keep global top lane focused on mode/notify/finalize only, and convert benchmark hint into a single inline guidance chip to prevent multi-row control fragmentation
  - Rebalance group action placement (`primary` vs `secondary`) so “Hide Details” and `More` are adjacent and no longer split across unrelated control tiers
  - Add Snapshot into group `More` menu to reduce operation hunting and align high-frequency actions near the group context instead of deep filter rows
  - Harden visibility of overflow menus with stronger group-header stacking context (`position/z-index/overflow`) so menu content remains accessible over dense list panes
  - Refine compact/ultra-compact contracts to match new action placement (hide report/details/new-sub progressively while preserving a stable `More` fallback path)
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-208-HF28: Empty-space elimination + inline action alignment pass
- id: `PT-SSOT-208-HF28`
- status: `DONE`
- owner: `Codex`
- scope:
  - Remove top command-lane center void by switching from 3-column split to inline flex alignment (mode/notify/done inline, hint lane removed)
  - Collapse group header from 2-column split to single-column flow so key group controls no longer leave a large unused right area
  - Tighten title/stats/diagnostics alignment by replacing `auto + 1fr + auto` with contiguous auto columns and left-anchored diagnostics toggle
  - Convert group action block to full-width left-to-right flow (`primary` left, `secondary` right) to avoid disconnected button islands
  - Compress collapsed advanced section into an inline toolbar row (title + expand) and hide redundant description while collapsed
  - Keep compact mode consistent with the new inline command alignment to prevent fallback re-introducing center gaps
- acceptance:
  - `node --check renderer.js` PASS
  - `node scripts/regression_i18n.js` PASS
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `node scripts/regression_ui_smoke.js` PASS
  - `npm run regression:all` PASS

### PT-SSOT-349: Preload IPC multi-arg forwarding fix
- id: `PT-SSOT-349`
- status: `DONE`
- owner: `Codex`
- scope:
  - Fix preload IPC bridge to forward variadic arguments (`...args`) instead of truncating to a single `data` payload
  - Restore argument integrity for multi-arg channels used by renderer (`launch-profile`, `clear-profile-logs`, `delete-profile-rotated-log`)
  - Keep trusted-origin assertions and channel allowlist behavior unchanged while hardening argument forwarding
- acceptance:
  - `node --check preload.js` PASS
  - multi-arg IPC regression script PASS (new)
  - `npm run regression:all` PASS

### PT-SSOT-350: IPC bridge multi-arg regression coverage
- id: `PT-SSOT-350`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a focused regression harness validating preload bridge forwards all IPC arguments for key channels
  - Verify channel allowlist remains enforced for generic `invoke`
  - Wire the regression into `scripts/regression_all.js` to prevent future silent argument truncation regressions
- acceptance:
  - regression script validates `launch-profile`, `clear-profile-logs`, `delete-profile-rotated-log` argument forwarding
  - regression script validates blocked channel rejection path
  - `npm run regression:all` PASS

### PT-SSOT-351: CI trigger/path + ignore-scripts stability hardening
- id: `PT-SSOT-351`
- status: `DONE`
- owner: `Codex`
- scope:
  - Expand proxy gate workflow path filters to include `preload.js` and `security/**` changes
  - Reduce CI flakiness by avoiding heavy postinstall side effects during default `npm ci` in non-build quality workflows
  - Preserve existing quality-gate and smoke semantics while separating environment bootstrap from regression execution
- acceptance:
  - workflow path filters include `preload.js` and `security/**`
  - quality workflows avoid unnecessary binary download side-effects on install stage
  - CI workflows still pass existing gate commands

### PT-SSOT-352: Supply-chain security audit fallback command
- id: `PT-SSOT-352`
- status: `DONE`
- owner: `Codex`
- scope:
  - Add a reproducible npm-script level audit fallback strategy for mirrors lacking advisory endpoints
  - Document preferred registry/audit invocation path and fallback execution command
  - Integrate the command into maintainability docs without changing production runtime behavior
- acceptance:
  - fallback audit command can run successfully when default mirror audit endpoint is unavailable
  - command and usage are documented in repo docs

### PT-SSOT-353: README encoding + duplicate license cleanup
- id: `PT-SSOT-353`
- status: `DONE`
- owner: `Codex`
- scope:
  - Normalize README text encoding artifacts in both EN/CN docs
  - Remove duplicated license section and keep one canonical license block
  - Preserve existing links/examples while improving readability
- acceptance:
  - `README.md` no duplicate license section
  - `README.md` and `docs/README_zh.md` show readable headings/body text

### PT-SSOT-354: Repo hygiene ignore-rules refresh
- id: `PT-SSOT-354`
- status: `DONE`
- owner: `Codex`
- scope:
  - Update `.gitignore` to ignore local workflow/cache artifacts (`.context-snapshots/`, `.claude/`, temp diff outputs)
  - Keep tracked project artifacts unaffected and avoid overbroad ignore patterns
- acceptance:
  - `.gitignore` includes explicit local-artifact ignore entries
  - no tracked source/doc files are accidentally hidden by new ignore rules

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
- status: `DOING`
- owner: `Codex`
- scope: `loadProfiles` 改为 DOM `createElement` 渲染（profile 卡片不再拼接 `innerHTML`）；移除 `onclick/onchange` inline handlers，改用 `data-action` + 列表容器事件委托；保证按钮（launch/restart/edit/open log/rotated/clear logs/leakcheck/delete）与 quick-switch 下拉行为不回归；Leak/Err tag 点击逻辑保持
- acceptance:
  - 手动验证：Profile 列表所有按钮可用，quick-switch 选择后会更新 preProxyOverride
  - 手动验证：Leak tag（有报告时）可打开报告；Err tag 可打开日志
  - `npm run regression:all` PASS

### SEC-11：Proxy Manager 列表去 innerHTML 拼接 + DOM 事件绑定（renderProxyNodes）
- id: `SEC-11`
- status: `DOING`
- owner: `Codex`
- scope: `renderProxyNodes` 的节点行改为 DOM `createElement` 渲染（不再拼接 `div.innerHTML` / inline `onclick/onchange`）；测试按钮用 `data-proxy-action/data-proxy-id` 标注并更新 `testSingleProxy/testCurrentGroup` 的按钮定位逻辑；保留 single/balance/failover 选择行为与样式
- acceptance:
  - 手动验证：Proxy Manager 列表的 radio/checkbox 切换、Test/Edit/Delete 按钮行为正常，Test 时按钮会显示 `...`
  - `npm run regression:all` PASS

### SEC-12：City/Language/Timezone 下拉去 innerHTML 拼接（populateDropdown）
- id: `SEC-12`
- status: `DOING`
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

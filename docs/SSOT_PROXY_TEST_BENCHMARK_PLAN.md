# GeekezBrowser 代理测试 SSOT 任务化方案（对标竞品）

## 1) 目标与范围（SSOT）

### 1.1 目标
- 把“代理是否可用”的判断从单一延迟探测，升级为**分阶段可观测**、**可解释失败**、**可批量收敛**的统一测试体系。
- 将“结果展示格式、测试速度、测试流程”对齐主流竞品（v2rayN / mihomo / sing-box 图形客户端实践）。
- 建立唯一真相源（SSOT）：测试输入、执行流程、结果结构、错误码、UI 呈现、回归标准全部由同一文档与 schema 驱动。

### 1.2 范围
- 仅针对“节点测试（单测 + 批测）”闭环：
  - 解析/归一化
  - 引擎路由（xray/sing-box）
  - 探测流程（连通性 + IP/Geo）
  - 结果存储与展示
  - 批量并发与性能策略
- 不包含：
  - 完整代理内核实现替换
  - 大规模 UI 重构（仅做测试视图增强）

---

## 2) 现状与缺口（基于当前仓库）

## 2.1 已有能力（已落地）
- 引擎自动选择 + 回退：`main.js`
- 多 URL 连通性探测：`main.js`
- SOCKS 异形输入兜底解析：`utils.js`
- xray 26.1.31 `allowInsecure` 兼容修复：`utils.js`
- `socks5h://` 远端 DNS 探测：`main.js`、`proxy/headerProbe.js`

## 2.2 缺口（需要补齐）
- 缺少统一测试结果 schema（当前字段分散，缺少阶段化/尝试列表标准）。
- 缺少可解释失败分层（例如 `ENGINE_UNSUPPORTED`、`HANDSHAKE_EOF`、`HTTP_403`、`GEO_TIMEOUT`）。
- 缺少对批测策略的配置化（批大小、并发、分协议策略、超时预算）。
- 缺少竞品同等级别“可读结果”：排序、过滤、阶段耗时、失败原因聚合、自动重测策略。
- 缺少“协议能力矩阵 SSOT”：解析支持 ≠ 引擎支持 ≠ 探测支持三者未统一。

---

## 3) 竞品对标基线（格式 / 速度 / 流程）

## 3.1 对标结论（摘要）
- **mihomo**：健康检查高度配置化（`url/interval/timeout/lazy/expected-status`），并提供 API 级延迟测试与 provider 级 healthcheck。
- **v2rayN**：强调多核心和“多配置最低延迟自动选择”，并支持批量测速节奏控制。
- **sing-box 客户端规范**：Dashboard 应展示 group（Selector/URLTest）状态，URLTest 内置 `interval/tolerance/idle_timeout`。

## 3.2 我们要对齐的关键点
- **结果格式**：从“单延迟值”升级为“阶段结果 + 综合结论 + 可追溯 attempts”。
- **速度策略**：分级超时预算 + lazy 检测 + 协议感知探测 URL。
- **流程策略**：先能力判定再执行，避免无效回退；失败可分类可重试。

## 3.3 竞品“支持形式”对标矩阵（协议/参数/节点形态）
- **v2rayN（订阅导入）**：支持从订阅导入 `ss/socks/trojan/vmess/vless/wireguard/hysteria2/tuic` 等节点形态（以官方 wiki 列表为准），并支持多核心切换与自动测速选优。
- **mihomo（proxy-groups / providers）**：以 `url-test`、`fallback`、`load-balance` 等组策略组织节点；健康检查参数核心是 `url/interval/timeout/lazy/expected-status`，并可通过 API 做延迟/健康检查。
- **sing-box（outbound types + urltest）**：将节点形态抽象为 outbounds（`direct/block/socks/http/shadowsocks/vmess/trojan/hysteria2/tuic/wireguard/...`），通过 `urltest` outbound 做自动测速选择，参数含 `url/interval/tolerance/idle_timeout`。
- **GeekezBrowser v1 对齐策略**：
  - 输入层：统一接收 URL 类节点（含 `socks/http/ss/vmess/vless/trojan/hysteria2/tuic`）并做能力门禁。
  - 执行层：按能力路由 `xray/sing-box`，不再执行“已知不支持”的无效尝试。
  - 参数层：引入 `quick|standard|deep` + 超时/探测数量/Geo 开关，补齐与竞品同类“测速档位”。

---

## 4) SSOT 数据模型（Proxy Test Result v1）

## 4.1 输入模型（ProxyTestInput）
- `id`: 节点唯一标识
- `raw`: 原始链接
- `normalized`: 归一化链接
- `protocol`: 解析出的协议
- `enginePreference`: `auto|xray|sing-box`
- `testProfile`: `quick|standard|deep`

## 4.2 执行模型（ProxyTestExecution）
- `capability`: `{ xray: boolean, singbox: boolean, reason?: string }`
- `enginePlan`: `["xray", "sing-box"]`（按能力过滤后）
- `budgetMs`: 总预算
- `steps`: 阶段数组（见下）

## 4.3 阶段模型（StepResult）
- `name`: `parse|capability|engine_start|socks_ready|http_probe|ip_probe|geo_probe|finalize`
- `ok`: boolean
- `startAt`: number
- `endAt`: number
- `durationMs`: number
- `code`: 规范错误码（见 4.5）
- `message`: 人类可读摘要
- `meta`: 任意结构（例如 `statusCode`、`probeUrl`、`enginePid`）

## 4.4 输出模型（ProxyTestResult）
- `ok`: boolean
- `finalCode`: string
- `finalMessage`: string
- `engineUsed`: `xray|sing-box|none`
- `protocol`: string
- `latencyMs`: number | null
- `ip`: string | null
- `geo`: `{country, region, city, asn, isp, timezone, latitude, longitude} | null`
- `attempts`: `EngineAttempt[]`
- `steps`: `StepResult[]`
- `score`: 0-100（可选）

## 4.5 错误码分层（SSOT）
- `PARSE_*`：输入与解析异常
- `CAPABILITY_*`：协议-引擎不匹配
- `ENGINE_*`：启动/退出/配置异常
- `HANDSHAKE_*`：握手链路错误（EOF/403/502）
- `PROBE_*`：连通性探测失败（timeout/status mismatch）
- `IP_GEO_*`：IP/地理探测失败
- `POLICY_*`：被策略禁止

---

## 5) 测试结果展示格式（对标目标）

## 5.1 列表行（简版）
- `状态`：`PASS / WARN / FAIL / UNSUPPORTED`
- `延迟`：`best / median / p95`（至少展示 `best`）
- `引擎`：`xray|sing-box`
- `协议`：`vless|hy2|tuic|...`
- `出口`：`ip + country + timezone`
- `失败摘要`：`finalCode`

## 5.2 详情面板（展开）
- `阶段时间线`：每阶段耗时 + 结果
- `attempts`：每引擎尝试历史（启动、探测 URL、状态码/错误）
- `诊断建议`：根据 `finalCode` 给出建议（如“节点疑似失效/参数不匹配/目标站封锁”）

## 5.3 批测汇总
- 成功率（总/按协议/按引擎）
- 平均延迟、p50/p90/p95
- Top 失败码分布
- 可选：按国家/ASN 分组可用率

---

## 6) 速度目标（SLO）

## 6.1 单节点
- `quick`：目标 3-5 秒内给出初判（不阻塞 UI）
- `standard`：目标 8-12 秒给出可解释结果
- `deep`：允许 15-20 秒，补齐 IP/Geo/附加探测

## 6.2 批量
- 默认并发：`min(8, CPU逻辑核数)`，按协议分桶调度
- 分批：默认每批 50，可配置 10-200
- 目标：100 节点在 `standard` 档 3-8 分钟可完成（取决于节点质量）

## 6.3 预算与退避
- 每阶段有独立 timeout（避免单阶段拖死）
- 同协议连续失败触发退避（例如 hy2 节点若 80% timeout，降低并发）

## 6.4 v1 已落地参数基线（2026-02-06）
- Profile（对标竞品 URLTest/healthcheck 的分级策略）：
  - `quick`：`probeTimeout=4.5s`、`ipTimeout=3.5s`、`geoTimeout=3.5s`、`probeCount=2`、`includeGeo=false`
  - `standard`：`probeTimeout=7s`、`ipTimeout=8s`、`geoTimeout=8s`、`probeCount=4`、`includeGeo=true`
  - `deep`：`probeTimeout=12s`、`ipTimeout=12s`、`geoTimeout=12s`、`probeCount=4`、`includeGeo=true`
- Scheduler（批测）：
  - `maxConcurrency`（1-16），`batchSize`（10-200），`budgetMs`（5s-600s）
  - `backoffBaseMs/backoffMaxMs` + `highFailureRatio/minSamplesForBackoff`
  - 批测按钮实时显示 `x/y` 进度，结束输出 `done/ok/fail/duration`

---

## 7) 流程规范（流程对标）

## 7.1 单节点流程
1. Parse & Normalize
2. Capability Gate（协议-引擎可支持性）
3. Engine Start（仅尝试支持引擎）
4. Socks Ready
5. HTTP Probe Ladder（多 URL / expected-status）
6. IP/Geo Probe（可与步骤 5 并行或顺序）
7. Finalize（分类错误码 + 建议）

## 7.2 批量流程
1. 节点预分类（协议、是否可支持）
2. 调度器按协议桶并发执行
3. 实时流式更新（进度、阶段、错误码）
4. 汇总报表 + 可筛选导出

---

## 8) 详细任务拆解（SSOT Task Package）

## P0（必须，2 周）

### PT-SSOT-001：结果 schema 固化
- 目标：新增 `ProxyTestResult v1` schema + runtime 校验
- 产出：`proxy/testResultSchema.js`、统一类型注释
- 验收：
  - 单测覆盖成功/失败样例
  - 历史字段可兼容读取
- 依赖：无

### PT-SSOT-002：错误码体系固化
- 目标：建立 `finalCode` 与 `step.code` 字典
- 产出：`proxy/testErrorCodes.js` + 文档映射
- 验收：
  - 所有失败路径都能映射到规范 code
  - UI 不再展示裸 `EOF` 作为最终结论
- 依赖：PT-SSOT-001

### PT-SSOT-003：阶段化执行器
- 目标：把当前测试链路重构为步骤执行器（可观测）
- 产出：`proxy/testRunner.js`
- 验收：
  - 返回 `steps[]` + `attempts[]`
  - 单节点流程完整可追溯
- 依赖：PT-SSOT-001, PT-SSOT-002

### PT-SSOT-004：UI 结果视图升级（最小可用）
- 目标：列表 + 详情面板支持阶段结果和失败码
- 产出：`renderer.js` 节点卡片增强
- 验收：
  - 可按 `status/code/engine/protocol` 过滤
  - 点击节点可见步骤耗时和 attempt 明细
- 依赖：PT-SSOT-003

### PT-SSOT-005：批测调度策略 v1
- 目标：并发、分批、预算、退避参数化
- 产出：`proxy/testScheduler.js` + 设置项
- 验收：
  - 100 节点批测可稳定收敛，不阻塞 UI
  - 失败高峰时自动降压
- 依赖：PT-SSOT-003

## P1（应该，2-4 周）

### PT-SSOT-101：协议能力矩阵 SSOT
- 目标：统一 `parserSupport / engineSupport / probeSupport`
- 产出：`proxy/protocolMatrix.js`
- 验收：
  - 新增协议只改一处即可生效
  - `Unsupported protocol` 全部转为能力门禁返回
- 依赖：PT-SSOT-002
- 实施状态：DONE（2026-02-06），主链路已切换为矩阵驱动能力判定/引擎规划。

### PT-SSOT-102：协议感知探测模板
- 目标：为 `vless/ws`、`hy2`、`tuic`、`ss` 定制探测 URL 与 expected-status
- 产出：`proxy/probeProfiles.js`
- 验收：
  - 假阴性显著下降（以历史失败样本回放评估）
- 依赖：PT-SSOT-101
- 实施状态：DONE（2026-02-06），主链路已切换为协议模板驱动探测。

### PT-SSOT-103：导出报告与诊断建议
- 目标：支持 JSON/CSV 导出（含失败分布）
- 产出：`proxy/testReport.js`
- 验收：
  - 可按协议/引擎生成可读报表
- 依赖：PT-SSOT-003
- 实施状态：DONE（2026-02-06），已支持 UI 一键导出 JSON/CSV 与失败码诊断建议。

### PT-SSOT-104：批测速度优化
- 目标：优化 IO/超时预算/探测并行策略
- 产出：性能基准脚本 + 参数建议
- 验收：
  - 达到 6.1/6.2 SLO
- 依赖：PT-SSOT-005
- 实施状态：DONE（2026-02-06），已落地 `probeParallelism` 与调度基准脚本。

## P2（可选，持续）

### PT-SSOT-201：竞品回放对照框架
- 目标：同一批节点在不同内核/策略下对比结果
- 产出：对照回放脚本与差异报告模板
- 验收：
  - 每次版本升级可复现“回归差异”
- 实施状态：DONE（2026-02-06），已新增回放对照计算器、CLI 与 Markdown 差异报告模板输出。
- 回放输入（v1）：
  - 支持 `nodes[]`（Geekez 导出）或 `results[]`（外部回放）两种容器。
  - 单条记录最小字段：`id/protocol/engine/status/finalCode`，可选 `durationMs/latencyMs/steps/attempts/probeProfile`。
- 输出报告（v1）：
  - `formatCoverageDiff`：必填与增强字段覆盖率差异（展示格式对标）。
  - `matched.durationDelta/latencyDelta`：中位数与 p95 变化（速度对标）。
  - `flowCoverageDiff`：关键步骤覆盖率和全流程覆盖变化（流程对标）。
  - `protocolComparison`：按协议的 passRate 对照。
- CLI 示例：
  - `node scripts/proxy_replay_compare.js --baseline=baseline.json --candidate=candidate.json --baseline-name=v2rayN --candidate-name=Geekez --out-dir=logs/proxy-replay/run-001`

### PT-SSOT-203：回放对标门禁评分
- 目标：将回放对照转为可自动判定的 PASS/FAIL 门禁，降低人工解读成本。
- 产出：`paritySummary`（格式/流程/稳定性/速度四维）+ 总分 + 门禁结论。
- 验收：
  - 报告包含 `gatePass` 与 `overallScore`
  - Markdown 报告包含“对标门禁”分项表格
  - CLI 直接输出 gate/score，便于流水线消费
- 实施状态：DONE（2026-02-06），已完成并接入回归。

### PT-SSOT-205：Socks 探测可靠性与订阅更新无阻塞
- 目标：提升 socks-like 节点在 quick/高压场景的探测成功率，并避免自动更新失败阻塞测试流程。
- 产出：
  - socks-like 协议 HTTPS 优先探测模板
  - socks-like 协议最小探针数策略（>=2）
  - 自动订阅更新 silent 错误提示（toast）
- 验收：
  - `scripts/regression_probe_profiles.js` PASS（socks quick 为 HTTPS-first）
  - `scripts/regression_all.js` PASS
- 实施状态：DONE（2026-02-06）。

### PT-SSOT-208：代理管理窗口交互重构 + 中英文切换稳定性
- 目标：在不改动核心测试内核的前提下，对 Proxy Manager 的布局、信息层级、结果摘要进行竞品风格升级，并修复语言切换“无反馈/无响应”问题。
- 产出：
  - `index.html`：Proxy Manager 分区布局（顶部控制、分组摘要、策略区、节点列表、底部动作）
  - `renderer.js`：组内统计（PASS/FAIL/WAIT/AVG/P95）与节点行状态视觉模型（延迟状态类）
  - `renderer.js`：语言切换安全路径（`window.curLang` + safe translator + fallback）与按钮状态反馈
  - `scripts/regression_i18n_toggle_behavior.js`：语言切换行为回归脚本
- 验收：
  - 代理管理窗口在批测后可直接读取组级统计和节点状态层级
  - CN/EN 切换后按钮文本与界面文案可即时刷新（无需重启）
  - `node scripts/regression_i18n_toggle_behavior.js` PASS
  - `npm run regression:all` PASS
- 实施状态：DONE（2026-02-06）。

### PT-SSOT-209：Proxy Manager 结果筛选/排序 + 基准快照对比
- 目标：将批测结果浏览体验对齐竞品“快速定位失败节点 + 对比回归趋势”的使用方式，补齐交互链路中的检索、排序与基准对比能力。
- 产出：
  - Proxy Manager 列表控制区：`search / status filter / sort / clear filters`
  - 渲染管线：`applyProxyListFilterAndSort`（状态与延迟语义排序）
  - 组级基准快照：保存当前组指标并展示 `Δ Snapshot(passRate/avg/p95)` 对比行
  - 本地持久化：`proxyListViewState` 与 `proxyBenchmarkSnapshotByGroup`
  - 回归：`scripts/regression_proxy_manager_ui.js`
- 验收：
  - 可按 `PASS/FAIL/WAIT` 一键筛选节点并支持多排序策略（延迟、最近测试、失败优先、名称）
  - 支持保存当前组基准快照并展示与当前结果的 delta（pp/ms）
  - 重开应用后筛选/排序偏好保持（localStorage）
  - `node scripts/regression_proxy_manager_ui.js` PASS
  - `npm run regression:all` PASS
- 实施状态：DONE（2026-02-06）。

### PT-SSOT-202：自动化验收门禁
- 目标：CI 中加入协议覆盖、错误码覆盖、SLO 守门
- 验收：
  - 不满足覆盖率/SLO 的 PR 阻断

---

## 9) 代码落点（建议）
- 主流程：`main.js`（逐步迁移到 `proxy/testRunner.js`）
- 解析层：`utils.js`、`proxy/proxySpec.js`
- 能力矩阵：`proxy/protocolMatrix.js`
- 探测模板：`proxy/probeProfiles.js`
- 回放对照：`proxy/replayComparator.js`
- 回放门禁：`proxy/replayComparator.js`（`paritySummary`）
- socks 探测模板：`proxy/probeProfiles.js`
- sing-box 映射：`proxy/singboxConfig.js`
- 订阅解析：`proxy/subscription.js`
- UI：`index.html`、`renderer.js`（subscription silent update + proxy manager UX + i18n toggle resiliency + list filter/sort + snapshot delta）
- 回归：`scripts/regression_protocol_matrix.js`、`scripts/regression_probe_profiles.js`、`scripts/regression_proxy_test_schema.js`、`scripts/regression_proxy_scheduler.js`、`scripts/regression_proxy_replay_compare.js`
- 回归：`scripts/regression_i18n_toggle_behavior.js`
- 回归：`scripts/regression_proxy_manager_ui.js`
- 工具：`scripts/proxy_replay_compare.js`（baseline/candidate 对照报告）
- 回归：`scripts/regression_*`

---

## 10) 验收清单（Definition of Done）
- 每个测试结果都有 `finalCode` 与 `steps[]`。
- 不再出现“协议不支持却仍尝试启动不支持引擎”的无效流程。
- 批测可观察（进度、阶段、失败分布）且可复盘（导出）。
- 对标项达标：
  - 可配置探测 URL/interval/timeout/expected-status/lazy（至少在应用层实现等价能力）
  - 具备 URLTest/自动选择思路下的批测与自动优选基础能力

---

## 11) 对标参考（官方文档）
- v2rayN UI/流程与多配置最低延迟：`https://github.com/2dust/v2rayN/wiki/Description-of-some-ui`
- v2rayN 订阅支持协议：`https://github.com/2dust/v2rayN/wiki/Description-of-subscription`
- mihomo proxy-groups（url/interval/lazy/expected-status）：`https://wiki.metacubex.one/en/config/proxy-groups/`
- mihomo proxy-providers health-check：`https://wiki.metacubex.one/en/config/proxy-providers/`
- mihomo API（delay/healthcheck）：`https://wiki.metacubex.one/en/api/`
- mihomo unified-delay / tcp-concurrent：`https://wiki.metacubex.one/en/config/general/`
- sing-box URLTest：`https://sing-box.sagernet.org/configuration/outbound/urltest/`
- sing-box 图形客户端统一能力（Dashboard/Groups）：`https://sing-box.sagernet.org/clients/general/`

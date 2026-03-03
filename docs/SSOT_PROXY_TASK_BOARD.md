# SSOT Proxy Test Collaboration Board

> Source: `docs/SSOT_PROXY_TEST_BENCHMARK_PLAN.md`  
> Mode: review -> claim -> implement -> verify  
> Updated: 2026-02-10

## Current Sprint (Sprint-S0)
| Task ID | Task | Priority | Status | Owner | Notes |
|---|---|---|---|---|---|
| PT-SSOT-001 | Result schema hardening | P0 | DONE | Codex | `proxy/testResultSchema.js` |
| PT-SSOT-002 | Error code taxonomy hardening | P0 | DONE | Codex | `proxy/testErrorCodes.js` |
| PT-SSOT-003 | Staged test runner integration | P0 | DONE | Codex | unified `steps/attempts` |
| PT-SSOT-004 | UI result visualization upgrade | P0 | DONE | Codex | structured detail panel |
| PT-SSOT-005 | Batch scheduler strategy v1 | P0 | DONE | Codex | profile + timeout runtime wiring |
| PT-SSOT-101 | Protocol capability matrix SSOT | P1 | DONE | Other-Agent | explicitly owned/completed by another agent |
| PT-SSOT-102 | Protocol-aware probe templates | P1 | DONE | Codex | `proxy/probeProfiles.js` |
| PT-SSOT-103 | Export report + diagnostics | P1 | DONE | Codex | `proxy/testReport.js` + IPC/UI |
| PT-SSOT-104 | Batch speed optimization + benchmark SLO | P1 | DONE | Other-Agent | claimed externally (avoid) |
| PT-SSOT-201 | Competitor replay comparison framework | P2 | DONE | Codex | replay compare JSON/Markdown |
| PT-SSOT-202 | Automated quality gate in CI | P2 | DONE | Other-Agent | claimed externally (avoid) |
| PT-SSOT-203 | Replay parity gate scoring | P2 | DONE | Codex | replay gate score + pass/fail |
| PT-SSOT-204 | CI gate result linkage + visual summary | P2 | DONE | Codex | step summary + artifact linkage |
| PT-SSOT-205 | Socks probe reliability + silent subscription update | P2 | DONE | Codex | HTTPS-first socks probes + non-blocking silent refresh |
| PT-SSOT-206 | Quality gate trend history + threshold versioning | P2 | DONE | Codex | threshold file + `history.jsonl` + trend summary |
| PT-SSOT-207 | Threshold lifecycle governance + release audit flow | P2 | DONE | Codex | strict threshold audit + digest registry + CI preflight check |
| PT-SSOT-208 | Proxy manager UX overhaul + i18n toggle resilience | P2 | DONE | Codex | modernized proxy modal layout + language toggle hot-switch stability |
| PT-SSOT-208-HF2 | Proxy manager scroll + inspector collapse toggle | P2 | DONE | Codex | list scroll containment + hide/show details + stronger i18n regression |
| PT-SSOT-208-HF3 | UI polish + i18n placeholder sweep + profile More reliability | P2 | DONE | Codex | localized search placeholders + calmer surfaces + native <details> overflow menu toggle |
| PT-SSOT-209 | Proxy manager filtering/sorting + benchmark snapshot compare | P2 | DONE | Codex | filter/sort pipeline + snapshot delta (pass rate/avg/p95) + persisted view state |
| PT-SSOT-210 | Proxy manager multi-keyword query presets + failure-code mini-chart | P2 | DONE | Codex | grouped search parser + one-click presets + failure code top-N mini-chart |
| PT-SSOT-211 | Proxy manager failure trend timeline + preset-set portability | P2 | DONE | Codex | custom preset set save/export/import + per-group fail-code trend timeline |
| PT-SSOT-212 | Signed preset bundle + trend snapshot export | P2 | DONE | Codex | stable-json SHA-256 signature + import verify + trend snapshot export action |
| PT-SSOT-213 | Main workspace low-click layout + profile flow acceleration | P2 | DONE | Codex | status quick-filters + progressive action menu + reduced card noise |
| PT-SSOT-214 | Preset bundle trust policy + trend snapshot import/merge | P2 | DONE | Codex | trust policy selector + signed-only enforcement + trend snapshot merge tooling |
| PT-SSOT-215 | Preset trust key pinning + trend diff visualization | P2 | DONE | Codex | signer key pinning gate + trust summary + trend diff pack |
| PT-SSOT-216 | Proxy manager bilingual polish + lang code normalization | P2 | DONE | Codex | localized core/advanced controls + `zh/zh-CN` legacy lang healing |
| PT-SSOT-217 | Signed bundle issuer policy templates + trend anomaly badges | P2 | DONE | Codex | issuer template presets + signature template metadata + anomaly badges |
| PT-SSOT-218 | Proxy manager low-click quickbar + keyboard workflow | P2 | DONE | Codex | status quickbar chips + Ctrl/Cmd+F focus + Enter quick-save + Esc clear search |
| PT-SSOT-219 | Policy drift audit export + anomaly history rollup | P2 | DONE | Codex | issuer policy drift audit payload + per-group anomaly history rollup/export |
| PT-SSOT-220 | Trust preset provenance diff + anomaly replay export | P2 | DONE | Codex | provenance delta summary/export + anomaly replay frames export |
| PT-SSOT-221 | Provenance trust gate automation + anomaly replay import/merge | P2 | DONE | Codex | provenance-aware trust gate auto decision + replay import merge pipeline |
| PT-SSOT-222 | Cross-group replay routing + trust-gate exception audit trail | P2 | DONE | Codex | replay route mode/map + trust warn/block audit trail export |
| PT-SSOT-223 | Issuer-template remediation suggestions + replay route drift detection | P2 | DONE | Codex | remediation hint apply + replay route drift summary/export |
| PT-SSOT-224 | Template remediation confidence scoring + route drift auto-mitigation hints | P2 | DONE | Codex | remediation confidence + drift mitigation hints/apply |
| PT-SSOT-225 | Trust decision explainability pack + mitigation success telemetry | P2 | DONE | Codex | explainability pack + remediation telemetry summary/export |
| PT-SSOT-226 | Explainability history trail + trust/mitigation correlation export | P2 | DONE | Codex | explainability history rollup + decision/mitigation correlation payload |
| PT-SSOT-227 | Correlation observability summary + decision success-rate readout | P2 | DONE | Codex | on-screen trust/mitigation correlation summary + pending/unknown diagnostics |
| PT-SSOT-228 | Correlation alert history + severity diagnostics export | P2 | DONE | Codex | alert severity evaluator + history summary/export + diagnostics tooltip |
| PT-SSOT-229 | Correlation alert trend rollup + one-click history reset | P2 | DONE | Codex | trend rollup summary + clear action + export rollup payload |
| PT-SSOT-230 | Updater unzip symlink-traversal guard + extraction-path hardening | P2 | DONE | Codex | symlink entry/path pivot block + extracted-byte budget enforcement |
| PT-SSOT-231 | Xray release-tag normalization + anti-downgrade enforcement | P2 | DONE | Codex | strict release-tag normalize/compare + monotonic update gate |
| PT-SSOT-232 | Asset-scoped digest parsing hardening for updater verification | P2 | DONE | Codex | deterministic asset-bound `.dgst` parser + ambiguity rejection |
| PT-SSOT-233 | Release manifest asset-presence gate for Xray updater | P2 | DONE | Codex | latest-release asset/digest presence validation + manifest-bound download routing |
| PT-SSOT-234 | Extracted Xray binary uniqueness + realpath escape guard | P2 | DONE | Codex | multi-binary ambiguity block + canonical-path extraction guard |
| PT-SSOT-235 | Xray install atomic replacement + rollback restore guard | P2 | DONE | Codex | backup-restore install helper + failed-copy rollback recovery |
| PT-SSOT-236 | Post-install Xray binary integrity hash verification | P2 | DONE | Codex | source/installed hash verification + rollback-on-mismatch |
| PT-SSOT-237 | Post-install executable version probe + rollback coupling | P2 | DONE | Codex | installed binary runtime version probe + mismatch-triggered rollback |
| PT-SSOT-238 | Updater secure temp workspace randomization + containment guard | P2 | DONE | Codex | mkdtemp-based temp dir + realpath containment validation |
| PT-SSOT-239 | Updater single-flight lock for download-xray-update | P2 | DONE | Codex | main-process in-progress guard + finally release |
| PT-SSOT-240 | Updater staged atomic install (verify-then-rename) | P2 | DONE | Codex | stage to `.new` + verify + atomic rename into place |
| PT-SSOT-241 | Updater cross-process lock file (multi-instance safety) | P2 | DONE | Codex | tmp lock file + TTL stale cleanup + finally release |
| PT-SSOT-242 | Updater unzip declared-size precheck (zip bomb resilience) | P2 | DONE | Codex | precheck entry.header.size + declared total before decompress |
| PT-SSOT-243 | Updater tighten xray zip/unzip budgets | P2 | DONE | Codex | per-flow maxBytes/maxEntries/maxUncompressedBytes constants |
| PT-SSOT-244 | Setup Xray installer digest + budget hardening | P2 | DONE | Codex | setup.js conditional digest parse + tighter zip/unzip budgets |
| PT-SSOT-245 | Setup Xray version fetch URL/redirect hardening | P2 | DONE | Codex | allowlist + redirect limit + response size cap |
| PT-SSOT-246 | Main-process GitHub API fetchJson hardening | P2 | DONE | Codex | https-only + redirect limit + response size cap |
| PT-SSOT-247 | Main-process GitHub API gh-proxy fallback | P2 | DONE | Codex | retry via gh-proxy on network/timeout errors |
| PT-SSOT-248 | Setup Xray version fetch gh-proxy fallback | P2 | DONE | Codex | retry via alternate route on network/timeout errors |
| PT-SSOT-249 | Setup Xray zip/dgst download gh-proxy fallback | P2 | DONE | Codex | retry via alternate route on network/timeout errors |
| PT-SSOT-250 | Main-process Xray zip/dgst download gh-proxy fallback | P2 | DONE | Codex | retry via alternate route on network/timeout errors |
| PT-SSOT-251 | Main-process updater digest budget constantization + fallback guard assertion | P2 | DONE | Codex | replace magic number with constant and lock fallback precondition |
| PT-SSOT-252 | Main-process updater route-affinity for digest download after zip fallback | P2 | DONE | Codex | reuse successful zip route as digest primary to reduce redundant failures |
| PT-SSOT-253 | Setup updater route-affinity for digest download after zip fallback | P2 | DONE | Codex | reuse successful zip route as digest primary to reduce redundant failures |
| PT-SSOT-254 | Setup version-fetch route-affinity for asset/digest primary route | P2 | DONE | Codex | prefer asset/digest primary route aligned with API route that fetched latest version |
| PT-SSOT-255 | Main-process version-fetch route-affinity for asset/digest primary route | P2 | DONE | Codex | prefer asset/digest primary route aligned with API route that fetched latest version |
| PT-SSOT-256 | Main-process check-xray-update downloadUrl route-affinity | P2 | DONE | Codex | prefer update hint URL aligned with successful metadata fetch route |
| PT-SSOT-257 | Main-process check-xray-update route metadata exposure | P2 | DONE | Codex | expose direct/proxy urls + selected route for deterministic updater handoff |
| PT-SSOT-258 | Main-process check-xray-update metadata-route observability | P2 | DONE | Codex | expose metadata route url/type for end-to-end route diagnostics |
| PT-SSOT-259 | Main-process download-xray-update structured route result + renderer compatibility | P2 | DONE | Codex | return structured success/error+route payload while keeping renderer boolean-compatible |
| PT-SSOT-260 | Renderer download-xray-update structured error + route diagnostics | P2 | DONE | Codex | surface structured updater error in alert and log route telemetry for operator diagnostics |
| PT-SSOT-261 | Renderer explicit route URL handoff for updater download | P2 | DONE | Codex | use route metadata (`downloadRoute/downloadUrlDirect/downloadUrlProxy`) to choose deterministic updater handoff URL |
| PT-SSOT-262 | Main/renderer structured updater request route-hint contract | P2 | DONE | Codex | pass `{url,route}` from renderer and honor route hint in main-process while preserving string compatibility |
| PT-SSOT-263 | Updater request-route hint telemetry exposure | P2 | DONE | Codex | include normalized request route hint in structured updater result and renderer diagnostics |
| PT-SSOT-264 | Updater release-source telemetry exposure | P2 | DONE | Codex | expose whether remote version/source came from release manifest or URL-derived fallback |
| PT-SSOT-265 | Updater structured error-code telemetry contract | P2 | DONE | Codex | return normalized `errorCode` in updater result and wire renderer diagnostics/alerts for deterministic triage |
| PT-SSOT-266 | Updater structured failure-stage telemetry contract | P2 | DONE | Codex | return normalized `failureStage` on updater failures for deterministic pipeline triage |
| PT-SSOT-267 | Updater requested-url-host telemetry exposure | P2 | DONE | Codex | expose normalized request URL host in structured updater telemetry for route-intent diagnostics |
| PT-SSOT-268 | Updater metadata-route-url telemetry exposure | P2 | DONE | Codex | include metadata route URL in structured updater result for end-to-end route observability |
| PT-SSOT-269 | Updater selected-digest-route telemetry exposure | P2 | DONE | Codex | expose digest primary route selection in structured updater telemetry for route-affinity diagnostics |
| PT-SSOT-270 | Updater digest-source telemetry exposure | P2 | DONE | Codex | expose whether digest URL selection came from release manifest or derived fallback in updater telemetry |
| PT-SSOT-271 | Updater effective-host telemetry exposure | P2 | DONE | Codex | expose effective asset/digest download hosts in structured updater telemetry for cross-route diagnostics |
| PT-SSOT-272 | Updater selected-host telemetry exposure | P2 | DONE | Codex | expose selected asset/digest primary hosts in updater telemetry before fallback execution |
| PT-SSOT-273 | Updater route-decision-source telemetry exposure | P2 | DONE | Codex | expose route decision source (`request_hint/request_url/metadata_route/derived_url`) for updater route-affinity diagnostics |
| PT-SSOT-274 | Updater route-hint conflict telemetry exposure | P2 | DONE | Codex | expose whether route hint conflicts with request URL route inference for diagnostics without behavior change |
| PT-SSOT-275 | Updater metadata-fetch-status telemetry exposure | P2 | DONE | Codex | expose metadata fetch status (`ok`/`manifest_missing`/`fetch_error`) in structured updater telemetry |
| PT-SSOT-276 | Updater metadata-fetch-error-code telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch error code when metadataFetchStatus is `fetch_error` |
| PT-SSOT-277 | Updater metadata-fetch-http-status telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch HTTP status in updater telemetry when metadata fetch fails |
| PT-SSOT-278 | Updater metadata-fetch-fallback-used telemetry exposure | P2 | DONE | Codex | expose whether metadata fetch used/attempted gh-proxy fallback route in updater telemetry |
| PT-SSOT-279 | Updater metadata-fetch-failure-route telemetry exposure | P2 | DONE | Codex | expose metadata fetch failure route (`direct`/`proxy`/`unknown`) in updater telemetry |
| PT-SSOT-280 | Updater metadata-fetch-fallback-attempted telemetry exposure | P2 | DONE | Codex | expose whether metadata fetch entered fallback-attempt flow in updater telemetry |
| PT-SSOT-281 | Updater metadata-fetch-route telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch route (`direct`/`proxy`/`unknown`) in updater telemetry |
| PT-SSOT-282 | Updater metadata-fetch-fallback-result telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch fallback result (`not_attempted`/`succeeded`/`failed`) in updater telemetry |
| PT-SSOT-283 | Updater metadata-fetch-failure-host telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch failure host in updater telemetry |
| PT-SSOT-284 | Updater metadata-fetch-error-retryable telemetry exposure | P2 | DONE | Codex | expose whether metadata fetch failure is retryable in updater telemetry |
| PT-SSOT-285 | Updater metadata-fetch-route-host telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch route host in updater telemetry |
| PT-SSOT-286 | Updater metadata-fetch-attempt-flow telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch attempt flow (`direct_only`/`direct_then_proxy`) in updater telemetry |
| PT-SSOT-287 | Updater metadata-fetch-attempt-count telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch attempt count (`1`/`2`) in updater telemetry |
| PT-SSOT-288 | Updater metadata-fetch-fallback-decision telemetry exposure | P2 | DONE | Codex | expose normalized metadata fetch fallback decision (`not_needed`/`retryable_error`/`non_retryable_error`) in updater telemetry |
| PT-SSOT-289 | TUN guardrail regression coverage + leakcheck mode evidence | P2 | DONE | Codex | add dedicated tun guardrail regression and leakcheck tun-mode contract assertions |
| PT-SSOT-290 | Launch diagnostics error-code normalization exposure | P2 | DONE | Codex | normalize launch error codes and surface `lastError.errorCode` in renderer diagnostics flows |
| PT-SSOT-291 | Stop-path diagnostics error-code normalization exposure | P2 | DONE | Codex | normalize stop failure codes and propagate structured error diagnostics to renderer/restart flows |
| PT-SSOT-292 | Profile-status structured error context model | P2 | DONE | Codex | unify profile-status failure event payload (`errorCode/errorStage/errorMessage`) for launch/stop paths |
| PT-SSOT-293 | Launch/stop error-code actionable guidance mapping | P2 | DONE | Codex | map launch/stop error codes to actionable guidance hints and unify alert composer in renderer |
| PT-SSOT-294 | Error-code remediation action routing for profile operations | P2 | DONE | Codex | add retry-aware remediation action routing (`Refresh List` / `Stop Others & Retry`) for launch/restart/stop failures |
| PT-SSOT-295 | Main/preload remediation IPC contract + TUN conflict context | P2 | DONE | Codex | add structured `stop-other-running-profiles`/`list-running-profile-summaries` IPC and wire renderer conflict summary/remediation path |
| PT-SSOT-296 | Remediation outcome normalization + retry-readiness feedback | P2 | DONE | Codex | normalize stop-other outcome metadata and align renderer retry/feedback with `retryReady` + partial/fail differentiation |
| PT-SSOT-297 | Remediation reason/status guidance mapping in renderer | P2 | DONE | Codex | map `status/retryReasonCode` to deterministic renderer guidance branches and reason-aware remediation feedback |
| PT-SSOT-298 | Stop-other failure-code aggregation + dominant-code guidance | P2 | DONE | Codex | aggregate stop-other failure codes in main and surface dominant/summary code guidance in renderer remediation alerts |
| PT-SSOT-299 | Dominant-code next-step suggestion mapping for stop-other remediation | P2 | DONE | Codex | map dominant stop-other failure codes to explicit “next step” guidance text and append to blocked remediation alerts |
| PT-SSOT-300 | Unified remediation outcome explanation layer | P2 | DONE | Codex | append dominant-code next-step explanation layer to blocked remediation alerts and guard it with dedicated regression coverage |
| PT-SSOT-301 | Blocked remediation conflicting-profile detail layer | P2 | DONE | Codex | expose remaining/failed profile name summaries in stop-other blocked alerts with dedicated regression guard |
| PT-SSOT-302 | Blocked remediation failure-detail explanation layer | P2 | DONE | Codex | expose per-profile failure detail summaries in blocked stop-other alerts with dedicated regression guard |
| PT-SSOT-303 | Blocked remediation failure-code profile-map explanation layer | P2 | DONE | Codex | expose failure code -> profile map summaries in blocked stop-other alerts with dedicated regression guard |
| PT-SSOT-304 | Main-side failure-code profile-map contract + renderer contract-first consumption | P2 | DONE | Codex | expose `errorCodeProfiles` contract from main and make renderer prefer contract-first code-profile mapping with fallback |
| PT-SSOT-305 | Dominant-priority-consistent code-profile map ordering | P2 | DONE | Codex | align renderer code-profile map ordering with main dominant code priority to keep summary ordering consistent with dominant suggestion |
| PT-SSOT-306 | Ranked error-code contract propagation for map ordering SSOT | P2 | DONE | Codex | expose `rankedErrorCodes` + `failureCodeSummaries` from main and make renderer map ordering prefer contract-ranked sequence with fallback |
| PT-SSOT-307 | Failure-detail contract propagation for renderer summary layer | P2 | DONE | Codex | enrich main `failureCodeSummaries` with detail samples and make renderer failure-detail summary consume contract-first with fallback |
| PT-SSOT-308 | Failure-detail truncation metadata contract + renderer extra-count correctness | P2 | DONE | Codex | bound per-code detail samples, expose `detailTotal/detailTruncated`, and make renderer detail extra-count contract-first |
| PT-SSOT-309 | Failure-detail display-limit contract propagation | P2 | DONE | Codex | expose `failureDetailSampleLimitPerCode` in stop-other result and make renderer consume contract limit first |
| PT-SSOT-310 | Failure code-summary top-limit contract propagation | P2 | DONE | Codex | expose `errorCodeSummaryTopLimit` and make renderer code-summary top-N contract-first |
| PT-SSOT-311 | Code-profile-map display-limit contract propagation | P2 | DONE | Codex | expose `codeProfileMapCodeLimit/codeProfileMapProfileLimit` and make renderer map summary limits contract-first |
| PT-SSOT-312 | Remaining/failed profile-summary limit contract propagation | P2 | DONE | Codex | expose `remainingProfileSummaryLimit/failedProfileSummaryLimit` and make renderer profile-summary limits contract-first |
| PT-SSOT-313 | Ranked fallback ordering for error-code summary | P2 | DONE | Codex | make code-summary fallback sorting consume `rankedErrorCodes` contract before count-based tie-break |
| PT-SSOT-314 | Failure-detail message max-length contract propagation | P2 | DONE | Codex | expose `failureDetailMessageMaxLength` and align detail truncation with main contract |
| PT-SSOT-315 | Code-profile-map profile sampling bound + totals/truncation metadata | P2 | DONE | Codex | bound per-code profile samples and expose `profileTotal/profileTruncated` so renderer hidden counts remain correct |
| PT-SSOT-316 | Settings modal inline-handler removal + DOM event binding hardening | P2 | DONE | Codex | remove remaining `onchange/onmouseover/onmouseout` handlers and bind settings/watermark events via renderer DOM listeners |
| PT-SSOT-317 | Proxy UI regression contract alignment + diagnostics anchor restoration | P2 | DONE | Codex | align proxy-ui regression with current action layout and restore missing diagnostics/trend anchor nodes so full regression remains deterministic |
| PT-SSOT-318 | Stop-other legacy code-profile-map totals/truncation contract propagation | P2 | DONE | Codex | expose `errorCodeProfileTotals/errorCodeProfilesTruncated` and make renderer fallback code-profile-map hidden counts contract-first |
| PT-SSOT-319 | Stop-other legacy failure-detail totals/truncation contract propagation | P2 | DONE | Codex | expose `errorCodeDetailSamples/errorCodeDetailTotals/errorCodeDetailsTruncated` and make renderer fallback detail summary hidden counts contract-first |
| PT-SSOT-320 | Stop-other contract-version gate + strict fallback heuristic shutdown | P2 | DONE | Codex | expose `stopOtherContractVersion` and gate renderer fallback branches so v2 contract no longer derives hidden counts from `failed[]` or sample lengths |
| PT-SSOT-321 | Stop-other dominant-code strict contract fallback gate | P2 | DONE | Codex | in strict contract mode, stop deriving dominant error code from `failed[0]` and rely on contract `dominantErrorCode` only |
| PT-SSOT-322 | Stop-other strict fallback totals/truncation-only code coverage | P2 | DONE | Codex | include totals/truncation-only codes in strict fallback ordering so hidden counts and code-map summaries do not miss contract-only buckets |
| PT-SSOT-323 | Stop-other code-profile hidden-count correctness for no-name buckets | P2 | DONE | Codex | compute hidden counts by shown-name count (not fixed limit) and surface `+N` fallback when strict contract buckets have no sampled names |
| PT-SSOT-324 | Stop-other failure-detail strict no-sample visibility fallback | P2 | DONE | Codex | when strict contract has totals/truncation but no detail samples, surface deterministic `+N` failure-detail summary instead of empty output |
| PT-SSOT-325 | Stop-other summary-list strict no-sample failure-detail fallback | P2 | DONE | Codex | when `failureCodeSummaries` has totals/truncation but empty details, keep strict contract output visible via deterministic `+N` summary |
| PT-SSOT-326 | Stop-other outcome counters strict contract-first gating | P2 | DONE | Codex | in strict contract mode resolve outcome counts from explicit contract fields only (no array-length fallback), keep legacy fallback for older payloads |
| PT-SSOT-327 | Stop-other profile-summary strict no-name count fallback | P2 | DONE | Codex | when strict contract has remaining/failed counts but no profile names, show deterministic `+N` profile summaries instead of dropping those lines |
| PT-SSOT-328 | Stop-other code-summary strict dominant-code visibility fallback | P2 | DONE | Codex | when strict contract lacks code-count maps but provides `dominantErrorCode`, keep code-summary visible via dominant-code fallback (optionally with `failedCount`) |
| PT-SSOT-329 | Stop-other profile-summary strict remaining-id fallback shutdown | P2 | DONE | Codex | disable `remainingIds` name fallback in strict mode so strict summaries rely on named `remainingProfiles` or count-based `+N` only |
| PT-SSOT-330 | Stop-other failed-profile strict contract list field | P2 | DONE | Codex | add `failedProfiles` contract field in main and make strict renderer failed-list summary consume it (disable strict `failed[]` name fallback) |
| PT-SSOT-331 | Updater unzip duplicate-path collision hardening | P2 | DONE | Codex | block case-fold path collisions in `extractZip` on case-insensitive platforms to prevent duplicate-entry overwrite ambiguity |
| PT-SSOT-332 | Main updater URL validation contract unification | P2 | DONE | Codex | centralize `validateUpdateDownloadUrl` usage for manifest/derived download URLs in main updater flow and assert via updater regression |
| PT-SSOT-333 | Main updater fallback URL pre-validation + protocol error mapping | P2 | DONE | Codex | validate fallback route URLs before retry handoff and map non-HTTPS URL rejection to dedicated updater error code |
| PT-SSOT-334 | Main updater error-code taxonomy stratification | P2 | DONE | Codex | stratify updater error mapping for HTTP/timeout/redirect/payload/url-validation classes and lock with updater regression assertions |
| PT-SSOT-335 | Main updater failureStage-aware error-code resolver | P2 | DONE | Codex | add stage fallback resolver so generic updater failures map to deterministic stage-scoped error codes |
| PT-SSOT-336 | Renderer updater error-message stratified mapping | P2 | DONE | Codex | map updater error codes to user-facing remediation messages and compose structured alert output with code/stage metadata |
| PT-SSOT-337 | Renderer updater next-step guidance mapping | P2 | DONE | Codex | add updater error-code/stage to next-step suggestion mapping and include guidance line in composed updater error alerts |
| PT-SSOT-338 | Renderer updater metadata-hint enrichment | P2 | DONE | Codex | add metadata fetch-status hint line in updater error alert composition and lock via regression assertions |
| PT-SSOT-339 | Renderer updater metadata route-switch guidance | P2 | DONE | Codex | enrich metadata fetch-error hint with direct/proxy switch suggestions based on route/fallback/retryable signals |
| PT-SSOT-340 | Renderer metadata route-hint signal precedence hardening | P2 | DONE | Codex | refine metadata route suggestions with failure-route fallback + fallback-succeeded/non-retryable branches for deterministic guidance |
| PT-SSOT-341 | Renderer metadata attempt-flow route fallback | P2 | DONE | Codex | when route signals are unknown, use metadata attempt-flow (`direct_only`/`direct_then_proxy`) to drive deterministic route hint fallback |
| PT-SSOT-342 | Renderer metadata hint severity layering | P2 | DONE | Codex | add metadata hint severity resolver/formatter (`info`/`warn`/`block`) and prepend severity labels in composed updater error alerts |
| PT-SSOT-343 | Renderer metadata fetch diagnostics enrichment | P2 | DONE | Codex | include metadata host/http/attempt diagnostics in fetch-error hint template for deterministic updater triage context |
| PT-SSOT-344 | Renderer metadata unknown-status fallback hint | P2 | DONE | Codex | add non-silent fallback hint for unknown metadata status using status/route/host/http/attempt fields to keep warning context observable |
| PT-SSOT-345 | Renderer metadata severity precedence alignment | P2 | DONE | Codex | align severity precedence so `fallback succeeded` resolves to `info` before non-retryable block, matching route-hint semantics |
| PT-SSOT-346 | Updater metadata runtime scenario regression harness | P2 | DONE | Codex | add vm-based runtime assertions for metadata hint/severity/formatter semantics to prevent string-only false positives |
| PT-SSOT-347 | Updater compose-error runtime assembly regression harness | P2 | DONE | Codex | add vm-based runtime assertions for `composeXrayUpdateErrorMessage` line assembly and detail token ordering (`metadata -> code/stage -> raw`) |
| PT-SSOT-348 | Updater compose unknown-status coexisting-token runtime guard | P2 | DONE | Codex | add runtime compose assertion for unknown metadata status when code/stage/raw tokens coexist, including detail-line order contract |
| PT-SSOT-349 | Preload IPC multi-arg forwarding fix | P0 | DONE | Codex | fixed `invokeTrusted(...args)` variadic forwarding to restore multi-arg IPC semantics |
| PT-SSOT-350 | IPC bridge multi-arg regression coverage | P1 | DONE | Codex | added `scripts/regression_preload_ipc_bridge.js` and wired into `regression:all` |
| PT-SSOT-351 | CI trigger/path + ignore-scripts stability hardening | P1 | DONE | Codex | expanded proxy gate trigger coverage and switched quality workflows to `npm ci --ignore-scripts` |
| PT-SSOT-352 | Supply-chain security audit fallback command | P1 | DONE | Codex | added `audit:deps` fallback command + strict mode + documentation |
| PT-SSOT-353 | README encoding + duplicate license cleanup | P2 | DONE | Codex | rewrote EN/CN README for readability and kept single License section in `README.md` |
| PT-SSOT-354 | Repo hygiene ignore-rules refresh | P2 | DONE | Codex | added targeted ignore rules for local snapshot/assistant/temp-diff artifacts |

## Claimed Work Details

### PT-SSOT-349 (Codex)
- Claimed on 2026-02-10.
- Scope lock (actual): `preload.js`, `scripts/regression_preload_ipc_bridge.js`, `scripts/regression_all.js`, `package.json`.
- Implemented:
  - Changed preload bridge helper from single-arg forwarding to variadic forwarding (`invokeTrusted(channel, ...args)`).
  - Restored runtime argument integrity for `launch-profile`, `clear-profile-logs`, `delete-profile-rotated-log`.
- Verified:
  - `node --check preload.js`
  - `node scripts/regression_preload_ipc_bridge.js`
  - `npm run regression:all`

### PT-SSOT-350 (Codex)
- Added focused preload IPC bridge regression harness: `scripts/regression_preload_ipc_bridge.js`.
- Coverage includes:
  - multi-arg forwarding for `launchProfile`, `clearProfileLogs`, `deleteProfileRotatedLog`
  - generic allowlisted invoke path
  - blocked channel rejection path
  - trusted-origin guard (`file:` required)
- Wired into aggregated regression entry: `scripts/regression_all.js`.
- Verified: `node scripts/regression_preload_ipc_bridge.js`, `npm run regression:all`.

### PT-SSOT-351 (Codex)
- Updated `.github/workflows/proxy-quality-gate.yml` trigger paths to include:
  - `preload.js`
  - `security/**`
- Hardened quality workflow installs to avoid heavy postinstall side effects:
  - `.github/workflows/proxy-quality-gate.yml`: `npm ci --ignore-scripts`
  - `.github/workflows/cookie-api-smoke.yml`: both jobs now use `npm ci --ignore-scripts`
- Verified:
  - `npm run audit:proxy-gate-thresholds`
  - `npm run quality-gate:proxy`
  - `npm run regression:cookie-manager`

### PT-SSOT-352 (Codex)
- Added fallback audit wrapper script: `scripts/npm_audit_with_fallback.js`.
- Added npm commands:
  - `audit:deps`
  - `audit:deps:strict`
- Added usage and fallback policy documentation: `docs/SECURITY_AUDIT.md`.
- Behavior:
  - uses current registry first
  - auto-retries with fallback registry when advisory endpoint is unavailable
  - supports strict mode via `--strict` / `NPM_AUDIT_FAIL_ON_VULN=1`
- Verified:
  - `npm run audit:deps`
  - `npm run audit:deps:strict`
  - `npm run regression:all`

### PT-SSOT-353 (Codex)
- Rewrote `README.md` with clean readable EN content while preserving key links/commands.
- Rewrote `docs/README_zh.md` with clean readable CN content and aligned section structure.
- Removed duplicate License block in `README.md` (single canonical section retained).
- Verified:
  - `rg -n "^## .*License|^## 许可证" README.md docs/README_zh.md`
  - `rg -n "馃|锛|鉁|鈿|�" README.md docs/README_zh.md` (no matches)
  - `rg -n "API_COOKIE_EXAMPLES|postman|smoke:cookie-api|build:win|regression:all|subscriptionPrivateAllowlist" README.md docs/README_zh.md`

### PT-SSOT-354 (Codex)
- Updated `.gitignore` with explicit local-artifact patterns:
  - `.context-snapshots/`
  - `.claude/`
  - `*temp_diff*.txt`
- Verification:
  - `git check-ignore -v .context-snapshots/decision-packet-PT-SSOT-352-2026-02-10.md .claude/test.txt "HRootjiaobenbrowerGeekezBrowsertemp_diff.txt"`
  - `git status --short` (noise from those local artifacts no longer appears)

### PT-SSOT-202 (Codex)
- Added unified gate script: `scripts/proxy_quality_gate.js`
- Added CI workflow: `.github/workflows/proxy-quality-gate.yml`
- Added npm command: `quality-gate:proxy`
- Verified: `npm run quality-gate:proxy`, `npm run regression:all`

### PT-SSOT-204 (Codex)
- Added markdown summary artifact `report.md` from gate result
- Published summary to `GITHUB_STEP_SUMMARY`
- Uploaded gate artifacts using `actions/upload-artifact@v4`
- Verified: `npm run quality-gate:proxy`, `npm run regression:all`

### PT-SSOT-205 (Codex)
- Improved socks-like probe reliability and silent subscription refresh UX
- Verified: `node scripts/regression_probe_profiles.js`, `npm run regression:all`

### PT-SSOT-206 (Codex)
- Added threshold config file: `scripts/config/proxy_quality_gate.thresholds.json`
- Added threshold version + file/env merge in gate script
- Added history tracking: `.context-snapshots/proxy-quality-gate/history.jsonl`
- Added trend metrics to `report.json` + `report.md`
- Added helper regression: `scripts/regression_proxy_quality_gate.js`
- Wired helper regression into `scripts/regression_all.js`
- Verified: `npm run quality-gate:proxy`, `node scripts/regression_proxy_quality_gate.js`, `npm run regression:all`

### PT-SSOT-207 (Codex)
- Added threshold governance/audit module: `scripts/lib/proxy_gate_threshold_audit.js`
- Added strict audit CLI entrypoint: `scripts/proxy_gate_threshold_audit.js` + npm `audit:proxy-gate-thresholds`
- Added release registry: `docs/proxy_quality_gate_threshold_audit.json` (version + sha256 + releasedAt)
- Integrated audit signal into gate JSON/Markdown outputs via `scripts/proxy_quality_gate.js`
- Added regression guard: `scripts/regression_proxy_gate_audit.js` and wired into `scripts/regression_all.js`
- Updated CI to run audit preflight before quality gate in `.github/workflows/proxy-quality-gate.yml`
- Verified: `npm run regression:proxy-gate-audit`, `npm run audit:proxy-gate-thresholds`, `npm run quality-gate:proxy`, `npm run regression:all`

### PT-SSOT-208 (Codex)
- Refactored `#proxyModal` into grouped control zones (top controls / group header / strategy panel / node list / footer), aligned with competitor-style test-console workflow
- Upgraded node row visual hierarchy (status, latency chip states, compact detail toggle, pass/fail summary, IP geo meta)
- Added runtime group stats (`PASS/FAIL/WAIT/AVG/P95`) in Proxy Manager for batch-test readability
- Hardened language switch path in `renderer.js` (`window.curLang` + safe translator + fallback) and added explicit CN/EN visual feedback
- Added regression guard: `scripts/regression_i18n_toggle_behavior.js` (wired into `scripts/regression_all.js`)
- Verified: `node scripts/regression_i18n.js`, `node scripts/regression_i18n_toggle_behavior.js`, `npm run regression:all`

### PT-SSOT-209 (Codex)
- Added Proxy Manager list controls: search / status filter / sort order / clear filters actions
- Added deterministic list pipeline in `renderer.js`: `applyProxyListFilterAndSort` with status-aware + latency-aware sorting
- Added benchmark snapshot compare strip (`Δ Snapshot`) showing pass-rate / avg / p95 deltas against saved baseline
- Persisted per-user list view state in `localStorage` (`proxyListViewState`) and benchmark snapshots by group (`proxyBenchmarkSnapshotByGroup`)
- Added UI regression guard: `scripts/regression_proxy_manager_ui.js` and wired into `scripts/regression_all.js`
- Verified: `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-210 (Codex)
- Added grouped keyword parser in `renderer.js` (`parseSearchKeywordGroups`) with `space=AND` and `|=OR` semantics
- Added one-click preset actions in Proxy Manager (`apply-proxy-query-preset`) for network/tls/auth/wait/slow triage paths
- Persisted and reflected preset-aware list view state (`proxyListViewState.preset`) with active preset highlighting
- Added failure-code distribution mini-chart in group header (`#proxyFailCodeMiniChart`) with top-N + OTHER aggregation
- Extended regression guard `scripts/regression_proxy_manager_ui.js` for presets, parser, mini-chart renderer, and action wiring
- Verified: `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-211 (Codex)
- Added custom preset-set storage + normalization in `renderer.js` (`proxyCustomQueryPresets`)
- Added preset-set actions in Proxy Manager: `save-current-proxy-preset`, `export-proxy-query-presets`, `import-proxy-query-presets`
- Added dynamic custom preset button renderer (`#proxyCustomPresetList`) with active-state sync
- Added per-group failure trend store (`proxyFailCodeTrendByGroup`) and compact timeline chips (`#proxyFailTrendTimeline`)
- Extended regression guard `scripts/regression_proxy_manager_ui.js` for preset-set portability and trend timeline wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-212 (Codex)
- Added signature helpers in `renderer.js`: stable canonicalization + SHA-256 digest (`buildSignedProxyPresetBundle`, `verifySignedProxyPresetBundle`)
- Upgraded preset-set export/import flow to include and verify signature metadata when available
- Added trend snapshot export action (`export-proxy-trend-snapshot`) for current group metrics/distribution/timeline bundle
- Reused unified current-group node source via `getCurrentProxyGroupNodeList` for snapshot/trend consistency
- Extended regression guard `scripts/regression_proxy_manager_ui.js` for signature/export wiring assertions
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-213 (Codex)
- Added workspace-level quick status filters (`All / Running / Attention / Idle`) with live count badges
- Added persisted status filter state in renderer (`profileStatusFilter`) and integrated it into `loadProfiles` filtering
- Refactored profile card actions into low-click flow: context primary actions + overflow menu for secondary/destructive actions
- Reduced card visual noise via compact tag policy and lightweight brief metadata row (`screen + log size`)
- Added UI regression guard: `scripts/regression_profile_layout_ui.js` and wired into `scripts/regression_all.js`
- Verified: `node scripts/regression_profile_layout_ui.js`, `npm run regression:all`

### PT-SSOT-214 (Codex)
- Added preset trust policy lifecycle in `renderer.js` (`normalizeProxyPresetTrustPolicy`, persistence + selector sync)
- Added signed-only/permissive/signed-preferred import policy behavior for preset bundles
- Added trend snapshot import + deduped merge helpers (`importProxyFailTrendSnapshot`, `mergeProxyFailTrendEntries`)
- Added Proxy Manager controls: `import-proxy-trend-snapshot` action and trust-policy selector (`#proxyPresetTrustPolicy`)
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for trust/import/merge action wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-215 (Codex)
- Added signer-key lifecycle for bundle signatures (`proxyPresetSignerKeyId`) and pinned key set store (`proxyPresetPinnedKeys`)
- Added trust-key pinning management actions: `manage-proxy-preset-pins`, `manage-proxy-signer-key`
- Added key pinning gate in preset import flow (blocks unpinned signer when pin list configured)
- Added trend diff visualization pack (`buildProxyTrendDiffPack` + `renderProxyTrendDiffPack`) with Δfail/Δpass/Δavg/Δp95 + top-code shift
- Added trust summary UI panel (`#proxyPresetTrustSummary`) and trend diff UI block (`#proxyTrendDiffPack`)
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for key pinning controls + diff pack + wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-208-HF1 (Codex)
- Root cause: `locales/zh-CN.js` encoding corruption caused syntax error, so Chinese locale script never loaded
- Fix: restored valid UTF-8 locale map and补齐 `subFetchAllowlistSaved/subFetchAllowlistInvalid` keys
- Verified: `node --check locales/zh-CN.js`, `node scripts/regression_i18n.js`, `node scripts/regression_i18n_toggle_behavior.js`, `npm run regression:all`

### PT-SSOT-216 (Codex)
- Added language normalization at i18n/runtime layer (`normalizeGeekezLang` + `normalizeUiLang`) so legacy `zh`/`zh-CN`/`zh_CN` values no longer break hot-switch rendering
- Localized Proxy Manager core/advanced controls (query preset toolbar, filter/sort controls, strategy panel, trend empty states, snapshot hints)
- Upgraded proxy interaction polish with stronger primary CTA visual hierarchy and compact, non-shrinking control bars for faster repeated operations
- Extended regression guards:
  - `scripts/regression_i18n_toggle_behavior.js`
  - `scripts/regression_proxy_manager_ui.js`
- Verified: `node --check renderer.js`, `node --check i18n.js`, `node --check locales/zh-CN.js`, `node scripts/regression_i18n_toggle_behavior.js`, `node scripts/regression_proxy_manager_ui.js`

### PT-SSOT-217 (Codex)
- Added issuer policy template lifecycle (`strict_local` / `strict_current` / `bootstrap_permissive`) with one-click actions and local persistence
- Added `issuerPolicyTemplate` metadata in signed preset bundle signature and import-time template mismatch warning path
- Added manual-edit downgrade to `custom` template when trust policy/pins/signer key are changed directly
- Added trend anomaly badge pack (`critical/warn/good/info`) from diff deltas (`fail/pass/avg/p95/topCode`) and rendered badge strip `#proxyTrendAnomalyBadges`
- Extended trend snapshot export payload with `trendAnomalyBadges` for collaboration handoff
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for issuer-template controls/actions + anomaly badge renderer hooks
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-218 (Codex)
- Added quick status chip bar in Proxy Manager (`ALL/PASS/FAIL/WAIT`) with live counters and one-click status filtering
- Added keyboard workflow optimization:
  - `Ctrl/Cmd + F` focuses proxy search box in modal
  - `Esc` clears active search text
  - `Enter` in manual node remark/url input triggers save
- Added auto-focus to proxy search when opening Proxy Manager for faster repeated operations
- Added main workspace visual compaction pass (toolbar polish + profile card hierarchy + action-row density + responsive breakpoint shift) to reduce large blank areas on ~1200px widths
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for quickbar/action/shortcut checks
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-219 (Codex)
- Added issuer-policy drift audit model (`buildProxyPresetPolicyDriftAudit`) covering template expected state vs. current trust/signer/pins
- Added drift summary UI `#proxyPresetPolicyDrift` and export action `export-proxy-policy-drift-audit`
- Added anomaly history persistence (`proxyTrendAnomalyHistoryByGroup`) with dedupe + bounded retention and rollup builder (`buildProxyTrendAnomalyHistoryRollup`)
- Added anomaly history UI strip `#proxyTrendAnomalyHistory` and export action `export-proxy-anomaly-rollup`
- Extended trend snapshot export payload with `trendAnomalyHistory`
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for drift/anomaly-history controls and helper/action wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-220 (Codex)
- Added preset provenance snapshot store (`proxyPresetProvenanceHistory`) for import/export lifecycle events
- Added provenance diff helper (`buildProxyPresetProvenanceDiff`) and on-screen summary `#proxyPresetProvenanceDiff`
- Added provenance export action `export-proxy-preset-provenance` including history + latest diff + drift audit context
- Added automatic provenance recording on preset-set export/import success paths
- Added anomaly replay payload builder (`buildProxyTrendAnomalyReplayPayload`) and export action `export-proxy-anomaly-replay`
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for provenance/replay controls and action/helper wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-221 (Codex)
- Added automated trust-gate decision helper (`buildAutomatedProxyPresetTrustGateDecision`) to evaluate imports using trust policy + pinned keys + provenance history patterns
- Extended provenance entries with trust-gate metadata (`decision/reasons`) and surfaced latest trust-gate summary in advanced panel (`#proxyPresetTrustGateStatus`)
- Extended provenance export payload with `latestTrustGate` snapshot for collaboration handoff
- Added anomaly replay import pipeline (`parseProxyTrendAnomalyReplayPayload` + `importProxyTrendAnomalyReplay`) and merge helpers for trend/anomaly stores
- Added UI action wiring `import-proxy-anomaly-replay` and updated regression guard coverage for trust-gate/replay-import functions + switch cases
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-222 (Codex)
- Added replay route selector (`payload` / `mapped` / `current`) with local persistence (`proxyReplayImportRouteMode`)
- Added replay route map manager (`manageProxyReplayRouteMap`) and resolver (`resolveProxyReplayImportTargetGroup`) for cross-group import routing
- Added trust-gate exception audit trail store (`proxyTrustGateExceptionAuditTrail`) and summary UI (`#proxyTrustGateAuditSummary`)
- Added trust-gate audit export action (`export-proxy-trust-gate-audit`) and embedded trust audit context in provenance export payload
- Added replay route summary UI (`#proxyReplayRouteSummary`) and action wiring `manage-proxy-replay-route-map`
- Extended anomaly replay import toast with applied route info and extended UI regression guard for route/audit helpers + actions
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-223 (Codex)
- Added issuer remediation suggestion builder (`buildProxyIssuerTemplateRemediationSuggestion`) from trust-gate results + issuer warnings
- Added remediation hint persistence/render (`proxyIssuerRemediationHint`, `#proxyIssuerTemplateRemediation`) and apply action (`apply-proxy-issuer-remediation`)
- Added replay route drift detection + audit store (`proxyReplayRouteDriftTrail`) with summary UI (`#proxyReplayRouteDriftSummary`)
- Added replay route drift export (`export-proxy-replay-route-drift`) and extended trust-gate audit payload with drift/remediation context
- Kept replay import path route-aware and now records drift events when target group diverges from payload group
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for remediation/drift controls, helpers, and switch wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-224 (Codex)
- Added remediation confidence scoring (`computeProxyIssuerRemediationConfidence`) with persisted `confidenceScore/confidenceLevel`
- Upgraded remediation UI to show confidence and enriched tooltip context (`#proxyIssuerTemplateRemediation`)
- Extended replay route drift model with `mitigationHint/recommendedMode/suggestedMapEntry` auto-hints
- Added replay mitigation summary (`#proxyReplayRouteMitigationHint`) and one-click action (`apply-proxy-replay-mitigation`)
- Extended replay drift export payload with aggregated mitigation hints and linked trust-gate audit context
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for mitigation/confidence helpers and action wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-225 (Codex)
- Added trust explainability pack model/persistence (`proxyTrustExplainabilityPack`) with decision/reasons + policy/bundle snapshots + heuristic traces
- Wired preset import trust-gate pipeline (block/warn/allow/template-check) to generate explainability artifacts and exportable payload
- Added remediation/mitigation telemetry store (`proxyMitigationTelemetry`) with success/noop/failed outcomes and before/after state snapshots
- Wired remediation apply actions (`apply-proxy-issuer-remediation`, `apply-proxy-replay-mitigation`) to emit telemetry and update summary
- Added advanced-panel summaries/exports (`#proxyTrustExplainabilitySummary`, `#proxyMitigationTelemetrySummary`, export actions)
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for explainability/telemetry helpers + action wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-226 (Codex)
- Added explainability history store (`proxyTrustExplainabilityHistory`) with bounded retention + dedupe guard
- Added per-group explainability history summary UI (`#proxyTrustExplainabilityHistorySummary`) with decision distribution and latest reason context
- Extended explainability export payload with group history rows
- Added trust/mitigation correlation payload builder (`buildProxyTrustMitigationCorrelationPayload`) linking mitigation outcomes with nearest explainability decisions
- Added one-click correlation export action (`export-proxy-trust-mitigation-correlation`)
- Extended UI regression guard `scripts/regression_proxy_manager_ui.js` for history/correlation controls, helpers, and switch wiring
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-227 (Codex)
- Added on-screen trust/mitigation correlation summary (`#proxyTrustMitigationCorrelationSummary`) with linked/unknown rows + overall success rate
- Added pending-state diagnostics when explainability exists but mitigation telemetry is not yet recorded
- Added decision-level success-rate readout (warn/block) and latest correlated reason details in summary tooltip
- Added correlation summary renderer (`renderProxyTrustMitigationCorrelationSummary`) and integrated it into explainability/telemetry refresh chain
- Extended i18n map with correlation-summary copy for both EN/CN and updated regression guard for new summary renderer + DOM node
- Verified: `node --check renderer.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-228 (Codex)
- Added correlation alert history store (`proxyTrustMitigationAlertHistory`) with normalized entry schema, per-group filtering, bounded retention, and dedupe guard
- Added alert severity evaluator (`evaluateProxyTrustMitigationAlert`) for low success rate, unknown linkage drift, and block-linked mitigation degradation
- Added advanced-panel alert summary (`#proxyTrustMitigationAlertSummary`) with init/pending/summary states and diagnostics tooltip (latest alert + reason/details/metrics/history count)
- Added alert export payload/action (`buildProxyTrustMitigationAlertPayload`, `exportProxyTrustMitigationAlerts`, `export-proxy-trust-mitigation-alerts`)
- Integrated alert summary rendering into trust/mitigation correlation refresh path and synchronized EN/CN i18n keys
- Extended regression guard `scripts/regression_proxy_manager_ui.js` for alert summary DOM node, helper functions, and action switch wiring
- Verified: `node --check renderer.js`, `node --check i18n.js`, `node --check locales/zh-CN.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-229 (Codex)
- Added alert trend rollup helper (`buildProxyTrustMitigationAlertRollup`) with critical/warn totals + latest/streak diagnostics for current-group history
- Added trend summary strip (`#proxyTrustMitigationAlertTrendSummary`) and localized tooltip line (`latest: {time} · {reason}`)
- Added current-group alert history reset action (`clear-proxy-trust-mitigation-alerts`) with success toast + failure alert handling
- Extended alert export payload (`buildProxyTrustMitigationAlertPayload`) with rollup block for downstream correlation evidence ingestion
- Unified severity label formatting via `getProxyTrustMitigationSeverityLabel` across summary/trend outputs
- Extended regression guard `scripts/regression_proxy_manager_ui.js` for trend DOM node, rollup/clear helpers, and action switch wiring
- Verified: `node --check renderer.js`, `node --check i18n.js`, `node --check locales/zh-CN.js`, `node scripts/regression_proxy_manager_ui.js`, `npm run regression:all`

### PT-SSOT-230 (Codex)
- Hardened updater unzip guard in `updateUtils.js`: reject symlink archive entries and reject extraction through any existing symlink/junction segment under destination root
- Kept existing absolute/traversal Zip-Slip checks and layered symlink-path guard to block pre-created symlink pivot writes
- Switched uncompressed-budget accounting to actual extracted bytes (`entry.getData().length`) to reduce forged header-size bypass risk
- Extended updater regression `scripts/regression_updater_security.js` with symlink-entry and symlink-path attack cases
- Relaxed brittle profile layout regression assertions in `scripts/regression_profile_layout_ui.js` to tolerate collaborative action-limit tuning while preserving key layout contracts
- Verified: `node --check updateUtils.js`, `node scripts/regression_updater_security.js`, `node scripts/regression_profile_layout_ui.js`, `npm run regression:all`

### PT-SSOT-231 (Codex)
- Added release-tag hardening helpers in `main.js`: `normalizeXrayReleaseTag` + `compareXrayReleaseTags`
- Hardened `check-xray-update` to reject invalid/non-upgrade tags before exposing update CTA
- Hardened `download-xray-update` fallback/API tag flow with normalization and explicit downgrade block (`Xray downgrade blocked`)
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for release-tag normalize/comparator + anti-downgrade gates
- Preserved existing digest/zip/allowlist verification chain while introducing monotonic version safety
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-232 (Codex)
- Added digest parser helpers in `updateUtils.js`: `normalizeDigestFileToken` + `parseSha256DigestForAsset`
- Supported OpenSSL (`SHA2-256 (...) = ...`), `sha256sum` (`hash  file`), and bare hash formats with unique-hash resolution rules
- Enforced asset-scoped digest matching and ambiguity rejection (same asset mapping to multiple hashes fails)
- Updated main-process update verifier to parse digest with explicit asset context (`parseSha256FromDgstText(dgstText, assetName)`)
- Extended updater regression `scripts/regression_updater_security.js` with digest parser behavior checks (match/mismatch/ambiguous/bare)
- Verified: `node --check updateUtils.js`, `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-233 (Codex)
- Added release manifest helpers in `main.js`: `resolveXrayReleaseAssetUrl` + `resolveXrayReleaseAssetManifest`
- Hardened `check-xray-update` to require manifest validation (platform asset + `.dgst`) before returning update availability
- Hardened `download-xray-update` to route zip/digest downloads via manifest-bound URLs when API data is available
- Kept fallback URL mode for API-unavailable scenario and preserved anti-downgrade + digest + zip checks
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for manifest resolver usage and update gate wiring
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-234 (Codex)
- Replaced first-hit updater binary lookup with candidate collector (`collectXrayBinaryCandidates`) and enforced exactly one candidate
- Added ambiguity hard-fail when archive contains multiple `xray`/`xray.exe` binaries (`Multiple Xray binaries found in package`)
- Added canonical-path guards (`fs.realpathSync`) for extracted root + selected binary and blocked escape (`Resolved Xray binary escapes extracted directory`)
- Routed sanity/version/copy operations through `realXrayBinary` to ensure post-resolution consistency
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for binary uniqueness and realpath guards
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-235 (Codex)
- Added install helper `installXrayBinaryWithRollback(sourceBinaryPath)` to perform backup-copy-restore flow around `BIN_PATH`
- Added rollback restore path (`fs.renameSync(backupPath, BIN_PATH)`) when replacement fails after backup rename
- Replaced direct copy flow with rollback-protected invocation (`installXrayBinaryWithRollback(realXrayBinary)`)
- Kept extracted-binary validation and update integrity chain intact while hardening failure recovery semantics
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for rollback helper and invocation wiring
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-236 (Codex)
- Extended rollback installer helper with source binary stat/hash capture before replacement
- Added post-install target validation (file type + size parity + sha256 parity) and hard-fail guard `Installed Xray binary sha256 mismatch`
- Ensured post-install integrity failure path still triggers rollback restore when backup exists
- Kept updater install invocation unchanged (`installXrayBinaryWithRollback(realXrayBinary)`) while strengthening helper internals
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for source/installed hash checks
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-237 (Codex)
- Upgraded installer helper to async signature with expected-version validation (`installXrayBinaryWithRollback(sourceBinaryPath, options = {})`)
- Added post-install runtime probe (`getXrayVersionFromBinary(BIN_PATH)`) and mismatch guard `Installed Xray binary version mismatch`
- Coupled version-probe failure into existing rollback restore path to recover previous `BIN_PATH`
- Updated updater invocation to pass expected release tag (`await installXrayBinaryWithRollback(realXrayBinary, { expectedVersion: remoteVer })`)
- Extended updater regression `scripts/regression_updater_security.js` with static checks for version probe/mismatch guard and async invocation wiring
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-238 (Codex)
- Added secure temp directory helper `createSecureXrayUpdateTempDir()` in `main.js`
- Replaced predictable `Date.now()` updater temp path with `fs.mkdtempSync(path.join(tempBase, 'xray_update_'))`
- Added realpath containment guard (`Resolved update temp directory escapes system temp root`) before any download/extract/install operation
- Updated cleanup paths to remove temp directory only when created and present
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for secure temp-dir helper and updater flow binding
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-239 (Codex)
- Added main-process single-flight lock for `download-xray-update` (`xrayUpdateInProgress` guard + acquire/release)
- Rejects concurrent update requests with explicit error (`Xray update already in progress`)
- Ensures lock release via `finally` even when update fails mid-flight
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for guard/acquire/release wiring
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-240 (Codex)
- Updated installer helper `installXrayBinaryWithRollback` to stage binary to `${BIN_PATH}.new` before swapping
- Verifies staged file type/size/sha256 (and version when expected) before touching `BIN_PATH`
- Swaps staged binary into place via atomic rename (`fs.renameSync(stagePath, BIN_PATH)`)
- Tightened rollback semantics: never deletes the original `BIN_PATH` unless replacement already happened
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for staged copy + atomic rename wiring
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-241 (Codex)
- Added cross-process updater lock file in `os.tmpdir()` (`fs.openSync(..., 'wx')`) to protect multi-instance update races
- Implemented TTL-based stale lock cleanup to tolerate crashes (`XRAY_UPDATE_LOCK_TTL_MS`)
- Wired lock acquire/release into updater `finally` (`xrayUpdateLockPath` + `releaseXrayUpdateFileLock`)
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for lock helpers and usage
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-242 (Codex)
- Hardened `extractZip` in `updateUtils.js` with declared uncompressed-size prechecks (`entry.header.size`)
- Accumulates declared bytes before `getData()` and blocks when declared size exceeds `maxUncompressedBytes`
- Extended updater regression `scripts/regression_updater_security.js` with a mutated header-size zip case (declared size must be blocked)
- Verified: `node --check updateUtils.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

### PT-SSOT-243 (Codex)
- Added per-flow updater budget constants in `main.js`: `XRAY_UPDATE_ZIP_MAX_BYTES`, `XRAY_UPDATE_EXTRACT_MAX_ENTRIES`, `XRAY_UPDATE_EXTRACT_MAX_BYTES`
- Passed tighter zip download limit into `downloadFile(url, zipPath, { maxBytes: ... })`
- Passed tighter unzip limits into `extractZip(zipPath, extractDir, { maxEntries, maxUncompressedBytes })`
- Extended updater regression `scripts/regression_updater_security.js` with static assertions for constants and usage wiring
- Verified: `node --check main.js`, `node scripts/regression_updater_security.js`, `npm run regression:all`

## Collaboration Evidence (Decision / ACK)

- `.context-snapshots/decision-packet-PT-SSOT-202-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-204-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-206-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-207-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-210-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-211-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-212-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-213-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-214-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-215-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-217-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-219-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-220-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-221-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-222-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-223-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-224-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-225-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-226-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-227-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-228-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-229-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-230-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-231-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-232-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-233-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-234-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-235-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-236-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-237-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-238-2026-02-06.md`
- `.context-snapshots/decision-packet-PT-SSOT-239-2026-02-07.md`
- `.context-snapshots/decision-packet-PT-SSOT-240-2026-02-07.md`
- `.context-snapshots/decision-packet-PT-SSOT-241-2026-02-07.md`
- `.context-snapshots/decision-packet-PT-SSOT-242-2026-02-07.md`
- `.context-snapshots/decision-packet-PT-SSOT-243-2026-02-07.md`
- Mailbox rule satisfied before implementation: `>=2 ACCEPT` and `0 BLOCK`

## Progress Log

- 2026-02-06: re-reviewed PT-SSOT-104 / PT-SSOT-201 completion and revalidated.
- 2026-02-06: claimed and completed PT-SSOT-202.
- 2026-02-06: claimed and completed PT-SSOT-204.
- 2026-02-06: claimed and completed PT-SSOT-205.
- 2026-02-06: claimed and completed PT-SSOT-206.
- 2026-02-06: claimed and completed PT-SSOT-207.
- 2026-02-06: claimed and completed PT-SSOT-208 (without touching PT-SSOT-104 / PT-SSOT-202 ownership scope).
- 2026-02-06: claimed and completed PT-SSOT-209.
- 2026-02-06: hotfix PT-SSOT-208-HF1 (zh locale syntax/encoding recovery).
- 2026-02-06: claimed and completed PT-SSOT-210.
- 2026-02-06: claimed and completed PT-SSOT-211.
- 2026-02-06: claimed and completed PT-SSOT-212.
- 2026-02-06: claimed and completed PT-SSOT-213.
- 2026-02-06: claimed and completed PT-SSOT-214.
- 2026-02-06: claimed and completed PT-SSOT-215.
- 2026-02-06: claimed and completed PT-SSOT-216 (proxy manager bilingual polish + language normalization).
- 2026-02-06: claimed and completed PT-SSOT-217 (signed bundle issuer policy templates + trend anomaly badges).
- 2026-02-06: claimed and completed PT-SSOT-218 (proxy manager low-click quickbar + keyboard workflow).
- 2026-02-06: claimed and completed PT-SSOT-219 (policy drift audit export + anomaly history rollup).
- 2026-02-06: claimed and completed PT-SSOT-220 (trust preset provenance diff + anomaly replay export).
- 2026-02-06: claimed and completed PT-SSOT-221 (provenance trust gate automation + anomaly replay import/merge).
- 2026-02-06: claimed and completed PT-SSOT-222 (cross-group replay routing + trust-gate exception audit trail).
- 2026-02-06: claimed and completed PT-SSOT-223 (issuer-template remediation suggestions + replay route drift detection).
- 2026-02-06: claimed and completed PT-SSOT-224 (template remediation confidence scoring + route drift auto-mitigation hints).
- 2026-02-06: claimed and completed PT-SSOT-225 (trust decision explainability pack + mitigation success telemetry).
- 2026-02-06: claimed and completed PT-SSOT-226 (explainability history trail + trust/mitigation correlation export).
- 2026-02-06: claimed and completed PT-SSOT-227 (correlation observability summary + decision success-rate readout).
- 2026-02-06: claimed and completed PT-SSOT-228 (correlation alert history + severity diagnostics export).
- 2026-02-06: claimed and completed PT-SSOT-229 (correlation alert trend rollup + one-click history reset).
- 2026-02-06: claimed and completed PT-SSOT-230 (updater unzip symlink-traversal guard + extraction-path hardening).
- 2026-02-06: claimed and completed PT-SSOT-231 (xray release-tag normalization + anti-downgrade enforcement).
- 2026-02-06: claimed and completed PT-SSOT-232 (asset-scoped digest parsing hardening for updater verification).
- 2026-02-06: claimed and completed PT-SSOT-233 (release manifest asset-presence gate for xray updater).
- 2026-02-06: claimed and completed PT-SSOT-234 (extracted xray binary uniqueness + realpath escape guard).
- 2026-02-06: claimed and completed PT-SSOT-235 (xray install atomic replacement + rollback restore guard).
- 2026-02-06: claimed and completed PT-SSOT-236 (post-install xray binary integrity hash verification).
- 2026-02-06: claimed and completed PT-SSOT-237 (post-install executable version probe + rollback coupling).
- 2026-02-06: claimed and completed PT-SSOT-238 (updater secure temp workspace randomization + containment guard).
- 2026-02-07: claimed and completed PT-SSOT-239 (updater single-flight lock for download-xray-update).
- 2026-02-07: claimed and completed PT-SSOT-240 (updater staged atomic install / verify-then-rename).
- 2026-02-07: claimed and completed PT-SSOT-241 (updater cross-process lock file / TTL stale cleanup).
- 2026-02-07: claimed and completed PT-SSOT-242 (updater unzip declared-size precheck / zip bomb resilience).
- 2026-02-07: claimed and completed PT-SSOT-243 (updater tighten xray zip/unzip budgets).
- 2026-02-07: claimed and completed PT-SSOT-244 (setup xray installer digest + budget hardening).
- 2026-02-07: claimed and completed PT-SSOT-245 (setup xray version fetch URL/redirect hardening).
- 2026-02-07: claimed and completed PT-SSOT-246 (main-process github api fetchJson hardening).
- 2026-02-07: claimed and completed PT-SSOT-247 (main-process github api gh-proxy fallback).
- 2026-02-07: claimed and completed PT-SSOT-248 (setup xray version fetch gh-proxy fallback).
- 2026-02-07: re-audited PT-SSOT-104 acceptance (`regression:proxy-scheduler` + benchmark SLO pass) before PT-SSOT-249.
- 2026-02-07: claimed and completed PT-SSOT-249 (setup xray zip/dgst download gh-proxy fallback).
- 2026-02-07: claimed and completed PT-SSOT-250 (main-process xray zip/dgst download gh-proxy fallback).
- 2026-02-07: claimed and completed PT-SSOT-251 (main-process updater digest budget constantization + fallback guard assertion).
- 2026-02-07: claimed and completed PT-SSOT-252 (main-process updater digest route-affinity after zip fallback).
- 2026-02-07: claimed and completed PT-SSOT-253 (setup updater digest route-affinity after zip fallback).
- 2026-02-07: claimed and completed PT-SSOT-254 (setup version-fetch route-affinity for asset/digest primary route).
- 2026-02-07: claimed and completed PT-SSOT-255 (main-process version-fetch route-affinity for asset/digest primary route).
- 2026-02-07: claimed and completed PT-SSOT-256 (main-process check-xray-update downloadUrl route-affinity).
- 2026-02-07: claimed and completed PT-SSOT-257 (main-process check-xray-update route metadata exposure).
- 2026-02-07: claimed and completed PT-SSOT-258 (main-process check-xray-update metadata-route observability).
- 2026-02-07: claimed and completed PT-SSOT-259 (main-process download-xray-update structured route result + renderer compatibility).
- 2026-02-07: claimed and completed PT-SSOT-260 (renderer download-xray-update structured error + route diagnostics).
- 2026-02-07: claimed and completed PT-SSOT-261 (renderer explicit route URL handoff for updater download).
- 2026-02-07: claimed and completed PT-SSOT-262 (main/renderer structured updater request route-hint contract).
- 2026-02-07: claimed and completed PT-SSOT-263 (updater request-route hint telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-264 (updater release-source telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-265 (updater structured error-code telemetry contract).
- 2026-02-07: claimed and completed PT-SSOT-266 (updater structured failure-stage telemetry contract).
- 2026-02-07: claimed and completed PT-SSOT-267 (updater requested-url-host telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-268 (updater metadata-route-url telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-269 (updater selected-digest-route telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-270 (updater digest-source telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-271 (updater effective-host telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-272 (updater selected-host telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-273 (updater route-decision-source telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-274 (updater route-hint conflict telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-275 (updater metadata-fetch-status telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-276 (updater metadata-fetch-error-code telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-277 (updater metadata-fetch-http-status telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-278 (updater metadata-fetch-fallback-used telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-279 (updater metadata-fetch-failure-route telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-280 (updater metadata-fetch-fallback-attempted telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-281 (updater metadata-fetch-route telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-282 (updater metadata-fetch-fallback-result telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-283 (updater metadata-fetch-failure-host telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-284 (updater metadata-fetch-error-retryable telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-285 (updater metadata-fetch-route-host telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-286 (updater metadata-fetch-attempt-flow telemetry exposure).
- 2026-02-07: claimed and completed PT-SSOT-287 (updater metadata-fetch-attempt-count telemetry exposure).
- 2026-02-08: claimed and completed PT-SSOT-288 (updater metadata-fetch-fallback-decision telemetry exposure).
- 2026-02-08: claimed and completed PT-SSOT-289 (tun guardrail regression coverage + leakcheck tun-mode evidence).
- 2026-02-08: claimed and completed PT-SSOT-290 (launch diagnostics error-code normalization exposure).
- 2026-02-08: claimed and completed PT-SSOT-291 (stop-path diagnostics error-code normalization exposure).
- 2026-02-08: claimed and completed PT-SSOT-292 (profile-status structured error context model for launch/stop failures).
- 2026-02-08: claimed and completed PT-SSOT-293 (launch/stop error-code actionable guidance mapping).
- 2026-02-08: claimed and completed PT-SSOT-294 (error-code remediation action routing for profile operations).
- 2026-02-08: claimed and completed PT-SSOT-295 (main/preload remediation IPC contract + TUN conflict context).
- 2026-02-08: claimed and completed PT-SSOT-296 (remediation outcome normalization + retry-readiness feedback).
- 2026-02-08: claimed and completed PT-SSOT-297 (remediation reason/status guidance mapping in renderer).
- 2026-02-08: claimed and completed PT-SSOT-298 (stop-other failure-code aggregation + dominant-code guidance).
- 2026-02-08: claimed and completed PT-SSOT-299 (dominant-code next-step suggestion mapping for stop-other remediation).
- 2026-02-08: claimed and completed PT-SSOT-300 (unified remediation outcome explanation layer).
- 2026-02-08: claimed and completed PT-SSOT-301 (blocked remediation conflicting-profile detail layer).
- 2026-02-08: claimed and completed PT-SSOT-302 (blocked remediation failure-detail explanation layer).
- 2026-02-08: claimed and completed PT-SSOT-303 (blocked remediation failure-code profile-map explanation layer).
- 2026-02-08: claimed and completed PT-SSOT-304 (main-side failure-code profile-map contract + renderer contract-first consumption).
- 2026-02-08: claimed and completed PT-SSOT-305 (dominant-priority-consistent code-profile map ordering).
- 2026-02-08: claimed and completed PT-SSOT-306 (ranked error-code contract propagation for map ordering SSOT).
- 2026-02-09: claimed and completed PT-SSOT-307 (failure-detail contract propagation for renderer summary layer).
- 2026-02-09: claimed and completed PT-SSOT-308 (failure-detail truncation metadata contract + renderer extra-count correctness).
- 2026-02-09: claimed and completed PT-SSOT-309 (failure-detail display-limit contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-310 (failure code-summary top-limit contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-311 (code-profile-map display-limit contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-312 (remaining/failed profile-summary limit contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-313 (ranked fallback ordering for error-code summary).
- 2026-02-09: claimed and completed PT-SSOT-314 (failure-detail message max-length contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-315 (code-profile-map profile sampling bound + totals/truncation metadata).
- 2026-02-09: claimed and completed PT-SSOT-316 (settings modal inline-handler removal + DOM event binding hardening).
- 2026-02-09: claimed and completed PT-SSOT-317 (proxy-ui regression contract alignment + diagnostics anchor restoration).
- 2026-02-09: claimed and completed PT-SSOT-318 (stop-other legacy code-profile-map totals/truncation contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-319 (stop-other legacy failure-detail totals/truncation contract propagation).
- 2026-02-09: claimed and completed PT-SSOT-320 (stop-other contract-version gate + strict fallback heuristic shutdown).
- 2026-02-09: claimed and completed PT-SSOT-321 (stop-other dominant-code strict contract fallback gate).
- 2026-02-09: claimed and completed PT-SSOT-322 (stop-other strict fallback totals/truncation-only code coverage).
- 2026-02-09: claimed and completed PT-SSOT-323 (stop-other code-profile hidden-count correctness for no-name buckets).
- 2026-02-09: claimed and completed PT-SSOT-324 (stop-other failure-detail strict no-sample visibility fallback).
- 2026-02-09: claimed and completed PT-SSOT-325 (stop-other summary-list strict no-sample failure-detail fallback).
- 2026-02-09: claimed and completed PT-SSOT-326 (stop-other outcome counters strict contract-first gating).
- 2026-02-09: claimed and completed PT-SSOT-327 (stop-other profile-summary strict no-name count fallback).
- 2026-02-09: claimed and completed PT-SSOT-328 (stop-other code-summary strict dominant-code visibility fallback).
- 2026-02-09: claimed and completed PT-SSOT-329 (stop-other profile-summary strict remaining-id fallback shutdown).
- 2026-02-09: claimed and completed PT-SSOT-330 (stop-other failed-profile strict contract list field).
- 2026-02-09: claimed and completed PT-SSOT-331 (updater unzip duplicate-path collision hardening).
- 2026-02-09: claimed and completed PT-SSOT-332 (main updater URL validation contract unification).
- 2026-02-09: claimed and completed PT-SSOT-333 (main updater fallback URL pre-validation + protocol error mapping).
- 2026-02-09: claimed and completed PT-SSOT-334 (main updater error-code taxonomy stratification).
- 2026-02-09: claimed and completed PT-SSOT-335 (main updater failureStage-aware error-code resolver).
- 2026-02-09: claimed and completed PT-SSOT-336 (renderer updater error-message stratified mapping).
- 2026-02-09: claimed and completed PT-SSOT-337 (renderer updater next-step guidance mapping).
- 2026-02-09: claimed and completed PT-SSOT-338 (renderer updater metadata-hint enrichment).
- 2026-02-09: claimed and completed PT-SSOT-339 (renderer updater metadata route-switch guidance).
- 2026-02-09: claimed and completed PT-SSOT-340 (renderer metadata route-hint signal precedence hardening).
- 2026-02-09: claimed and completed PT-SSOT-341 (renderer metadata attempt-flow route fallback).
- 2026-02-09: claimed and completed PT-SSOT-342 (renderer metadata hint severity layering).
- 2026-02-09: claimed and completed PT-SSOT-343 (renderer metadata fetch diagnostics enrichment).
- 2026-02-09: claimed and completed PT-SSOT-344 (renderer metadata unknown-status fallback hint).
- 2026-02-09: claimed and completed PT-SSOT-345 (renderer metadata severity precedence alignment).
- 2026-02-09: claimed and completed PT-SSOT-346 (updater metadata runtime scenario regression harness).
- 2026-02-09: claimed and completed PT-SSOT-347 (updater compose-error runtime assembly regression harness).
- 2026-02-09: claimed and completed PT-SSOT-348 (updater compose unknown-status coexisting-token runtime guard).
- 2026-02-07: hotfix PT-SSOT-208-HF4 (proxy manager phase-2 readability/layout uplift + inspector visibility improvement).
- 2026-02-07: hotfix PT-SSOT-208-HF5 (proxy manager hierarchy/readability pass + row status cues + inspector pane visibility tuning).
- 2026-02-07: hotfix PT-SSOT-208-HF6 (advanced-density reflow + strategy readability + action-grid optimization).
- 2026-02-07: hotfix PT-SSOT-208-HF7 (status-accent triage + low-noise row actions + advanced-shell grouping).
- 2026-02-07: hotfix PT-SSOT-208-HF8 (common/expert advanced workflow split + persistent view mode).
- 2026-02-07: hotfix PT-SSOT-208-HF9 (common strategy compression + one-click profile preset chips + expert-only tuning knobs).
- 2026-02-07: hotfix PT-SSOT-208-HF10 (group action hierarchy simplification + compact more-menu for subscription management actions).
- 2026-02-07: hotfix PT-SSOT-208-HF11 (two-tier filter layout + persistent secondary filter fold to reduce initial operator clutter).
- 2026-02-07: hotfix PT-SSOT-208-HF12 (diagnostics summary-first cards + collapsible detail stream with persisted detail-fold state).
- 2026-02-07: hotfix PT-SSOT-208-HF13 (inspector summary-first cards + collapsible steps/attempts + adaptive inspector width clamp for list readability).
- 2026-02-07: hotfix PT-SSOT-208-HF14 (node-row action hierarchy + per-row more-menu flow to reduce clutter and improve deterministic operations).
- 2026-02-07: hotfix PT-SSOT-208-HF15 (node-row meta-pill visual hierarchy + compact telemetry strip for faster scan and lower row noise).
- 2026-02-07: hotfix PT-SSOT-208-HF16 (adaptive compact-layout mode for narrow/zoomed proxy manager with stacked inspector/list and denser control spacing).
- 2026-02-07: hotfix PT-SSOT-208-HF17 (touch-optimized tap targets + row selection-to-inspector sync + smooth scroll rhythm helpers).
- 2026-02-07: hotfix PT-SSOT-208-HF18 (ultra-compact action hierarchy with one-click test priority + compact-menu fallback actions).
- 2026-02-07: hotfix PT-SSOT-208-HF19 (full-content visibility pass + clearer group-more affordance + collapsed advanced-shell density mode).
- 2026-02-07: hotfix PT-SSOT-208-HF20 (top quick-action lane + status-filter one-click clear + proxy modal Ctrl/Cmd+S save shortcut).
- 2026-02-07: hotfix PT-SSOT-208-HF21 (visual rhythm polish + tab overflow usability + row action noise reduction).
- 2026-02-07: hotfix PT-SSOT-208-HF22 (sticky top command bar + Ctrl/Cmd+N new-sub shortcut + duplicated button i18n sync hardening).
- 2026-02-07: hotfix PT-SSOT-208-HF23 (visibility recovery + menu layering hardening + earlier ultra-compact fallback for dense windows).
- 2026-02-07: hotfix PT-SSOT-208-HF24 (dense-window readability recovery + non-sticky top controls + group-more direction safeguards).
- 2026-02-07: hotfix PT-SSOT-208-HF25 (layout hierarchy uplift + compact inspector auto-collapse + adaptive more-menu max-height stabilization).
- 2026-02-07: hotfix PT-SSOT-208-HF26 (density compression pass: reduced top/header/filter whitespace + compact action simplification + secondary filters auto-collapse in compact open).
- 2026-02-07: hotfix PT-SSOT-208-HF27 (button placement re-hierarchy: global-vs-group command split, group action lane consolidation, and menu visibility hardening).
- 2026-02-07: hotfix PT-SSOT-208-HF28 (empty-space elimination pass: inline top commands, single-column group header flow, and collapsed-advanced inline action row).

## Artifacts (this round)

- Gate script: `scripts/proxy_quality_gate.js`
- Gate thresholds: `scripts/config/proxy_quality_gate.thresholds.json`
- Threshold audit library: `scripts/lib/proxy_gate_threshold_audit.js`
- Threshold audit CLI: `scripts/proxy_gate_threshold_audit.js`
- Threshold audit registry: `docs/proxy_quality_gate_threshold_audit.json`
- Threshold audit regression: `scripts/regression_proxy_gate_audit.js`
- Gate helper regression: `scripts/regression_proxy_quality_gate.js`
- i18n toggle regression: `scripts/regression_i18n_toggle_behavior.js`
- Proxy manager UI regression: `scripts/regression_proxy_manager_ui.js`
- i18n maps: `i18n.js`, `locales/zh-CN.js`
- Profile workspace UI regression: `scripts/regression_profile_layout_ui.js`
- TUN guardrail regression: `scripts/regression_tun_guardrails.js`
- Launch diagnostics regression: `scripts/regression_launch_error_diagnostics.js`
- Stop diagnostics regression: `scripts/regression_stop_error_diagnostics.js`
- Profile status context regression: `scripts/regression_profile_status_error_context.js`
- Profile error guidance regression: `scripts/regression_profile_error_guidance.js`
- Updater extraction security helper: `updateUtils.js`
- Updater security regression: `scripts/regression_updater_security.js`
- Xray updater main-process guard flow: `main.js`
- Setup installer security hardening: `setup.js`
- Proxy manager modal UI: `index.html`
- Proxy manager + profile workspace UI logic: `renderer.js`
- Proxy manager trend/preset decision packets:
  - `.context-snapshots/decision-packet-PT-SSOT-210-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-211-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-212-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-213-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-214-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-215-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-217-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-219-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-220-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-221-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-222-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-223-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-224-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-225-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-226-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-227-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-228-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-229-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-230-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-231-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-232-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-233-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-234-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-235-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-236-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-237-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-238-2026-02-06.md`
  - `.context-snapshots/decision-packet-PT-SSOT-239-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-240-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-241-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-242-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-243-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-244-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-245-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-246-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-247-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-248-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-249-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-250-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-251-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-252-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-253-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-254-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-255-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-256-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-257-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-258-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-259-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-260-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-261-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-262-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-263-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-264-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-265-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-266-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-267-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-268-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-269-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-270-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-271-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-272-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-273-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-274-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-275-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-276-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-277-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-278-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-279-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-280-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-281-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-282-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-283-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-284-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-285-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-286-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-287-2026-02-07.md`
  - `.context-snapshots/decision-packet-PT-SSOT-288-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-289-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-290-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-291-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-292-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-293-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-294-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-295-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-296-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-297-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-298-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-299-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-300-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-301-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-302-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-303-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-304-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-305-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-306-2026-02-08.md`
  - `.context-snapshots/decision-packet-PT-SSOT-307-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-308-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-309-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-310-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-311-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-312-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-313-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-314-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-315-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-316-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-317-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-318-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-319-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-320-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-321-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-322-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-323-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-324-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-325-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-326-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-327-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-328-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-329-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-330-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-331-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-332-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-333-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-334-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-335-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-336-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-337-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-338-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-339-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-340-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-341-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-342-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-343-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-344-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-345-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-346-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-347-2026-02-09.md`
  - `.context-snapshots/decision-packet-PT-SSOT-348-2026-02-09.md`
- CI workflow: `.github/workflows/proxy-quality-gate.yml`
- Aggregated regression runner: `scripts/regression_all.js`
- Gate outputs:
  - `.context-snapshots/proxy-quality-gate/report.json`
  - `.context-snapshots/proxy-quality-gate/report.md`
  - `.context-snapshots/proxy-quality-gate/benchmark.json`
  - `.context-snapshots/proxy-quality-gate/history.jsonl`

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const root = process.cwd();
  const renderer = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const stylesPath = path.join(root, 'styles.css');
  const styles = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const indexOrStyles = index + styles;

  // === Core UI elements ===
  assert(index.includes('id="proxySearchInput"'), 'missing proxy search input');
  assert(index.includes('data-i18n-placeholder="proxySearchPlaceholder"'), 'missing localized proxy search placeholder');
  assert(index.includes('id="proxySortBy"'), 'missing proxy sort selector');
  assert(index.includes('id="proxySecondaryFilterToggleBtn"'), 'missing secondary filter toggle button');
  assert(index.includes('id="proxySecondaryFilters"'), 'missing secondary filter container');
  assert(index.includes('data-action="toggle-proxy-secondary-filters"'), 'missing secondary filter toggle action');
  assert(index.includes('id="proxyModal" class="modal-overlay" data-advanced-expanded="collapsed"'), 'missing proxy advanced expanded default state');
  assert(index.includes('id="proxyStatusQuickbar"'), 'missing proxy status quickbar');
  assert(indexOrStyles.includes('#proxyModal .proxy-group-tabs {'), 'missing proxy group tabs style block');
  assert(index.includes('data-action="set-proxy-status-filter"'), 'missing quick status filter action');
  assert(index.includes('id="proxyQuickAllCount"'), 'missing quick all count');
  assert(index.includes('id="proxyQuickPassCount"'), 'missing quick pass count');
  assert(index.includes('id="proxyQuickFailCount"'), 'missing quick fail count');
  assert(index.includes('id="proxyQuickWaitCount"'), 'missing quick wait count');

  // === New redesigned layout ===
  assert(index.includes('proxy-modal-header-left'), 'missing proxy modal header left section');
  assert(index.includes('proxy-modal-title'), 'missing proxy modal title');
  assert(index.includes('proxy-header-mode-select'), 'missing proxy header mode select');
  assert(index.includes('proxy-stats-cards'), 'missing proxy stats cards container');
  assert(index.includes('id="proxyStatPass"'), 'missing proxy stat pass element');
  assert(index.includes('id="proxyStatFail"'), 'missing proxy stat fail element');
  assert(index.includes('id="proxyStatWait"'), 'missing proxy stat wait element');
  assert(index.includes('proxy-quick-actions'), 'missing proxy quick actions container');
  assert(index.includes('proxy-footer-status'), 'missing proxy footer status');
  assert(index.includes('proxy-footer-actions'), 'missing proxy footer actions');
  assert(index.includes('id="proxyFooterStatus"'), 'missing proxy footer status element');
  assert(index.includes('data-i18n="proxyGroupsLabel"'), 'missing groups section label');
  assert(index.includes('data-i18n="proxyStatsLabel"'), 'missing stats section label');
  assert(index.includes('data-i18n="proxyActionsLabel"'), 'missing actions section label');

  // === Inspector panel ===
  assert(index.includes('id="proxyInspectorToggleBtn"'), 'missing proxy inspector toggle button');
  assert(index.includes('data-action="toggle-proxy-inspector"'), 'missing proxy inspector toggle action');
  assert(index.includes('id="proxyInspectorSummary"'), 'missing proxy inspector summary container');
  assert(index.includes('id="proxyInspectorStepsToggleBtn"'), 'missing proxy inspector steps toggle');
  assert(index.includes('id="proxyInspectorAttemptsToggleBtn"'), 'missing proxy inspector attempts toggle');
  assert(index.includes('id="proxyInspectorStepsCount"'), 'missing proxy inspector steps count badge');
  assert(index.includes('id="proxyInspectorAttemptsCount"'), 'missing proxy inspector attempts count badge');

  // === CSS structure ===
  assert(indexOrStyles.includes('.proxy-meta-strip'), 'missing proxy row meta strip styles');
  assert(indexOrStyles.includes('.proxy-meta-pill'), 'missing proxy row meta pill styles');
  assert(indexOrStyles.includes('#proxyModal .proxy-modal-shell {'), 'missing proxy modal shell style block');

  // === Advanced panel elements (kept but hidden) ===
  assert(index.includes('data-i18n="proxyPresetSaveCurrent"'), 'missing localized proxy preset save action');
  assert(index.includes('data-proxy-preset="fail_network"'), 'missing fail_network query preset');
  assert(index.includes('data-action="apply-proxy-query-preset"'), 'missing query preset action');
  assert(index.includes('id="proxyCustomPresetList"'), 'missing custom preset container');
  assert(index.includes('data-action="save-current-proxy-preset"'), 'missing save preset action');
  assert(index.includes('data-action="export-proxy-query-presets"'), 'missing export preset action');
  assert(index.includes('data-action="import-proxy-query-presets"'), 'missing import preset action');
  assert(index.includes('id="proxyAdvancedToggleBtn"'), 'missing proxy advanced toggle');
  assert(index.includes('id="proxyAdvancedPanel"'), 'missing proxy advanced panel');
  assert(index.includes('data-action="toggle-proxy-advanced"'), 'missing toggle proxy advanced action');
  assert(index.includes('data-action="apply-proxy-test-profile"'), 'missing apply proxy profile action');
  assert(index.includes('data-action="clear-proxy-filters"'), 'missing clear filters action');
  assert(index.includes('data-action="snapshot-current-group"'), 'missing snapshot action');

  // === Renderer functions ===
  assert(renderer.includes('function parseSearchKeywordGroups(query)'), 'missing multi-keyword query parser');
  assert(renderer.includes('function setProxyStatusFilter(statusTag)'), 'missing quick status filter handler');
  assert(renderer.includes('function renderProxyStatusQuickbar(metrics, visibleCount = null)'), 'missing quick status quickbar renderer');
  assert(renderer.includes('function saveCurrentProxyQueryPreset()'), 'missing save preset helper');
  assert(renderer.includes('function applyProxyListFilterAndSort(nodes)'), 'missing proxy list filter/sort helper');
  assert(renderer.includes('function snapshotCurrentGroupBenchmark()'), 'missing benchmark snapshot function');
  assert(renderer.includes('function updateProxyBenchmarkDelta(metrics)'), 'missing benchmark delta renderer');
  assert(renderer.includes('function getLastTestedAgoText(list)'), 'missing last tested ago text helper');
  assert(renderer.includes('function toggleProxyInspectorPanel()'), 'missing inspector toggle handler');
  assert(renderer.includes('function applyProxyInspectorSectionState()'), 'proxy inspector section state applier missing');
  assert(renderer.includes('function loadProxyInspectorStepsUiState()'), 'proxy inspector steps ui-state loader missing');
  assert(renderer.includes('function loadProxyInspectorAttemptsUiState()'), 'proxy inspector attempts ui-state loader missing');

  // === Action wiring ===
  assert(renderer.includes("case 'apply-proxy-query-preset': run(applyProxyQueryPreset(actionArg));"), 'query preset action not wired');
  assert(renderer.includes("case 'set-proxy-status-filter': run(setProxyStatusFilter(actionArg));"), 'quick status filter action not wired');
  assert(renderer.includes("case 'toggle-proxy-secondary-filters': run(toggleProxySecondaryFilters());"), 'secondary filter toggle action not wired');
  assert(renderer.includes("case 'toggle-proxy-inspector': run(toggleProxyInspectorPanel());"), 'proxy inspector toggle action not wired');
  assert(renderer.includes("case 'clear-proxy-filters': run(clearProxyFilters());"), 'clear filter action not wired');
  assert(renderer.includes("case 'snapshot-current-group': run(snapshotCurrentGroupBenchmark());"), 'snapshot action not wired');
  assert(renderer.includes('updateProxyGroupStats(rawList, list);'), 'render pipeline does not apply filtered stats');

  console.log('[ok] proxy manager ui regression checks passed');
}

main();

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
  const i18n = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
  const zh = fs.readFileSync(path.join(root, 'locales', 'zh-CN.js'), 'utf8');
  const stylesPath = path.join(root, 'styles.css');
  const styles = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const indexOrStyles = index + styles;

  assert(index.includes('id="profileQuickFilters"'), 'missing profile quick filters container');
  assert(index.includes('data-action="set-profile-filter" data-action-arg="all"'), 'missing profile all filter action');
  assert(index.includes('data-action="set-profile-filter" data-action-arg="running"'), 'missing profile running filter action');
  assert(index.includes('data-action="set-profile-filter" data-action-arg="attention"'), 'missing profile attention filter action');
  assert(index.includes('data-action="set-profile-filter" data-action-arg="idle"'), 'missing profile idle filter action');
  assert(indexOrStyles.includes('.profile-more-menu'), 'missing profile overflow menu styles');
  assert(indexOrStyles.includes('.profile-filter-chip'), 'missing profile filter chip styles');

  assert(renderer.includes('function normalizeProfileStatusFilter(value)'), 'missing profile status filter normalizer');
  assert(renderer.includes('function getProfileHealthState({ isRunning, lastStatus, lastLeak, lastErr })'), 'missing profile health classifier');
  assert(renderer.includes('function setProfileStatusFilter(value)'), 'missing profile status filter setter');
  assert(renderer.includes("case 'set-profile-filter': run(setProfileStatusFilter(actionArg));"), 'profile status filter action not wired');
  assert(renderer.includes('matchesProfileStatusFilter(profileStatusFilter, healthState)'), 'profile status filtering is not applied in loadProfiles');
  assert(renderer.includes("more.className = 'profile-more-menu no-drag';"), 'profile overflow menu DOM is missing');

  assert(i18n.includes('pfAll: "All"'), 'missing English translation: pfAll');
  assert(i18n.includes('pfRunning: "Running"'), 'missing English translation: pfRunning');
  assert(i18n.includes('pfAttention: "Attention"'), 'missing English translation: pfAttention');
  assert(i18n.includes('pfIdle: "Idle"'), 'missing English translation: pfIdle');
  assert(i18n.includes('moreActions: "More"'), 'missing English translation: moreActions');
  assert(i18n.includes('idleStatus: "Idle"'), 'missing English translation: idleStatus');

  assert(zh.includes('pfAll: "全部"'), 'missing Chinese translation: pfAll');
  assert(zh.includes('pfRunning: "运行中"'), 'missing Chinese translation: pfRunning');
  assert(zh.includes('pfAttention: "需关注"'), 'missing Chinese translation: pfAttention');
  assert(zh.includes('pfIdle: "空闲"'), 'missing Chinese translation: pfIdle');
  assert(zh.includes('moreActions: "更多"'), 'missing Chinese translation: moreActions');
  assert(zh.includes('idleStatus: "空闲"'), 'missing Chinese translation: idleStatus');

  console.log('[ok] profile layout ui regression checks passed');
}

main();

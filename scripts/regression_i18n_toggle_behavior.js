/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const root = process.cwd();
  const rendererPath = path.join(root, 'renderer.js');
  const indexPath = path.join(root, 'index.html');
  const i18nPath = path.join(root, 'i18n.js');

  const renderer = fs.readFileSync(rendererPath, 'utf8');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const i18n = fs.readFileSync(i18nPath, 'utf8');

  assert(renderer.includes('function updateLangToggleLabel()'), 'missing updateLangToggleLabel helper');
  assert(renderer.includes('function normalizeUiLang(input)'), 'missing normalizeUiLang helper');
  assert(renderer.includes('window.curLang = normalizedNext'), 'toggleLang does not update window.curLang');
  assert(renderer.includes("localStorage.setItem('geekez_lang', normalizedNext)"), 'toggleLang does not persist normalized language');
  assert(renderer.includes('window.curLang = normalized;'), 'applyLang does not normalize current language');
  assert(renderer.includes('updateLangToggleLabel();'), 'applyLang does not refresh language toggle label');
  assert(renderer.includes("showToast(normalizedNext === 'en' ? 'Language: English' : '语言：中文'"), 'toggleLang missing visual feedback toast');

  assert(i18n.includes('function normalizeGeekezLang(input)'), 'missing normalizeGeekezLang in i18n');
  assert(i18n.includes('window.normalizeGeekezLang = normalizeGeekezLang;'), 'normalize helper is not exposed');
  assert(i18n.includes("window.curLang = normalizeGeekezLang(localStorage.getItem('geekez_lang'));"), 'i18n does not normalize persisted language');

  assert(indexHtml.includes('id="langToggleBtn"'), 'index is missing langToggleBtn');
  assert(indexHtml.includes('data-action="toggle-lang"'), 'lang toggle action binding missing');
  assert(indexHtml.includes('data-lang="cn"'), 'lang toggle data-lang default missing');

  console.log('[ok] i18n toggle behavior regression checks passed');
}

main();

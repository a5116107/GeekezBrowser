/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractTKeys(jsText) {
  const keys = new Set();
  // Lightweight regexes for common helpers:
  // - t('key')
  // - tText('key', ...)
  // - tFormat('key', ...)
  const res = [
    /\bt\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\btText\(\s*['"]([^'"]+)['"]/g,
    /\btFormat\(\s*['"]([^'"]+)['"]/g,
  ];
  for (const re of res) {
    let m;
    while ((m = re.exec(jsText))) keys.add(m[1]);
  }
  return keys;
}

function extractEnKeys(i18nText) {
  const keys = new Set();
  // Match: key: "..." (including multiple entries on one line)
  const re = /([a-zA-Z0-9_]+)\s*:\s*["']/g;
  let m;
  while ((m = re.exec(i18nText))) keys.add(m[1]);
  return keys;
}

function extractZhKeys(zhText) {
  const keys = new Set();
  const re = /([a-zA-Z0-9_]+)\s*:\s*["']/g;
  let m;
  while ((m = re.exec(zhText))) keys.add(m[1]);
  return keys;
}

function extractHtmlI18nKeys(indexHtmlText) {
  const keys = new Set();
  const res = [
    /data-i18n\s*=\s*"([^"]+)"/g,
    /data-i18n-placeholder\s*=\s*"([^"]+)"/g,
  ];
  for (const re of res) {
    let m;
    while ((m = re.exec(indexHtmlText))) keys.add(m[1]);
  }
  return keys;
}

function main() {
  const root = process.cwd();
  const rendererPath = path.join(root, 'renderer.js');
  const indexPath = path.join(root, 'index.html');
  const i18nPath = path.join(root, 'i18n.js');
  const zhPath = path.join(root, 'locales', 'zh-CN.js');

  const renderer = readText(rendererPath);
  const indexHtml = readText(indexPath);
  const i18n = readText(i18nPath);
  const zh = readText(zhPath);

  const used = extractTKeys(renderer);
  const htmlUsed = extractHtmlI18nKeys(indexHtml);
  for (const k of htmlUsed) used.add(k);
  const enKeys = extractEnKeys(i18n);
  const zhKeys = extractZhKeys(zh);

  const missingEn = [];
  const missingZh = [];
  for (const k of used) {
    if (!enKeys.has(k)) missingEn.push(k);
    if (!zhKeys.has(k)) missingZh.push(k);
  }

  if (missingEn.length || missingZh.length) {
    console.error('[i18n regression] missing keys');
    if (missingEn.length) console.error('missing en:', missingEn.sort().join(', '));
    if (missingZh.length) console.error('missing zh:', missingZh.sort().join(', '));
    process.exit(1);
  }

  console.log('[ok] i18n keys present:', used.size);
}

main();

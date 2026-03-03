/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(text, needle, errorMessage) {
  if (!text.includes(needle)) {
    throw new Error(errorMessage);
  }
}

function main() {
  const root = process.cwd();
  const indexPath = path.join(root, 'index.html');
  const rendererPath = path.join(root, 'renderer.js');
  const indexText = readText(indexPath);
  const rendererText = readText(rendererPath);

  const inlineHandlerRe = /\son(?:click|change|mouseover|mouseout|input|keydown|keyup|submit|load|error)\s*=\s*["']/gi;
  const inlineMatches = Array.from(indexText.matchAll(inlineHandlerRe)).map((m) => m[0].trim());
  if (inlineMatches.length > 0) {
    const sample = inlineMatches.slice(0, 5).join(', ');
    throw new Error(`index.html still contains inline event handlers: ${sample}`);
  }

  assertIncludes(indexText, 'id="defaultProxyConsistency"', 'missing defaultProxyConsistency selector');
  assertIncludes(indexText, 'id="enableSystemProxy"', 'missing enableSystemProxy toggle');
  assertIncludes(indexText, 'id="enableRemoteDebugging"', 'missing enableRemoteDebugging toggle');
  assertIncludes(indexText, 'id="enableCustomArgs"', 'missing enableCustomArgs toggle');
  assertIncludes(indexText, 'id="enableApiServer"', 'missing enableApiServer toggle');
  assertIncludes(indexText, 'data-watermark-option="enhanced"', 'missing enhanced watermark option marker');
  assertIncludes(indexText, 'data-watermark-option="banner"', 'missing banner watermark option marker');

  assertIncludes(rendererText, 'function ensureSettingsInputEventsBound()', 'missing settings DOM binding helper');
  assertIncludes(rendererText, "bindChangeById('defaultProxyConsistency'", 'missing default consistency DOM binding');
  assertIncludes(
    rendererText,
    "['enableSystemProxy', 'enableRemoteDebugging', 'enableCustomArgs', 'enableApiServer']",
    'missing developer toggle DOM binding group'
  );
  assertIncludes(
    rendererText,
    "document.querySelectorAll('input[name=\"watermarkStyle\"]')",
    'missing watermark radio DOM binding'
  );
  assertIncludes(
    rendererText,
    "document.querySelectorAll('[data-watermark-option]')",
    'missing watermark option hover/focus DOM binding'
  );
  assertIncludes(rendererText, 'ensureSettingsInputEventsBound();', 'init does not bind settings DOM events');

  console.log('[ok] settings inline-handler hardening regression passed');
}

main();

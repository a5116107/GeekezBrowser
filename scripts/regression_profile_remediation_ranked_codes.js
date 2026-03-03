/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const root = process.cwd();
  const mainText = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const rendererText = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');

  assert(mainText.includes('rankedErrorCodes: rankedCodes,'), 'missing main failure aggregation rankedErrorCodes output');
  assert(mainText.includes('failureCodeSummaries,'), 'missing main failure aggregation failureCodeSummaries output');
  assert(mainText.includes('rankedErrorCodes: [],'), 'missing main stop-other rankedErrorCodes default');
  assert(mainText.includes('failureCodeSummaries: [],'), 'missing main stop-other failureCodeSummaries default');
  assert(mainText.includes('result.rankedErrorCodes = failureAggregation.rankedErrorCodes;'), 'missing main stop-other rankedErrorCodes binding');
  assert(mainText.includes('result.failureCodeSummaries = failureAggregation.failureCodeSummaries;'), 'missing main stop-other failureCodeSummaries binding');

  assert(rendererText.includes('const summaryList = result && Array.isArray(result.failureCodeSummaries)'), 'missing renderer failureCodeSummaries contract read');
  assert(rendererText.includes('const rankedCodesForSummary = result && Array.isArray(result.rankedErrorCodes)'), 'missing renderer code-summary rankedErrorCodes contract read');
  assert(rendererText.includes('const rankIndexByCodeForSummary = new Map(rankedCodesForSummary.map((code, index) => [code, index]));'), 'missing renderer code-summary rankedErrorCodes index map');
  assert(rendererText.includes('const leftRank = rankIndexByCodeForSummary.has(left[0]) ? rankIndexByCodeForSummary.get(left[0]) : Number.POSITIVE_INFINITY;'), 'missing renderer code-summary rankedErrorCodes ordering branch');
  assert(rendererText.includes('const rankedCodes = result && Array.isArray(result.rankedErrorCodes)'), 'missing renderer rankedErrorCodes contract read');
  assert(rendererText.includes('const rankIndexByCode = new Map(rankedCodes.map((code, index) => [code, index]));'), 'missing renderer rankedErrorCodes index map');
  assert(rendererText.includes('if (leftRank !== rightRank) {'), 'missing renderer rankedErrorCodes ordering branch');
  assert(rendererText.includes('if (leftRank === Number.POSITIVE_INFINITY) return 1;'), 'missing renderer ranked ordering infinity fallback');

  console.log('[ok] profile remediation ranked-codes regression checks passed');
}

main();

/* eslint-disable no-console */
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const vm = require('vm');

const { extractZip, isZipFileHeader, parseSha256DigestForAsset, sha256FileHex, validateUpdateDownloadUrl } = require('../updateUtils');

function extractBlockBetween(text, startMarker, endMarker, label) {
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error(`missing ${label} start marker`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`missing ${label} end marker`);
  return text.slice(start, end).trim();
}

function assertContainsToken(name, text, token) {
  if (!String(text || '').includes(token)) {
    throw new Error(`${name} missing token: ${token}`);
  }
}

async function main() {
  const base = path.join(os.tmpdir(), `geekez_updater_reg_${Date.now()}`);
  await fs.ensureDir(base);

  // 1) Safe zip should extract normally
  const safeZip = new AdmZip();
  safeZip.addFile('dir/safe.txt', Buffer.from('safe'));
  const safeZipPath = path.join(base, 'safe.zip');
  safeZip.writeZip(safeZipPath);

  if (!isZipFileHeader(safeZipPath)) throw new Error('safe.zip header check failed');
  const safeSha = sha256FileHex(safeZipPath);
  if (!safeSha || safeSha.length !== 64) throw new Error('safe.zip sha256 check failed');

  const safeOut = path.join(base, 'safe_out');
  await extractZip(safeZipPath, safeOut);
  const safeFile = path.join(safeOut, 'dir', 'safe.txt');
  if (!await fs.pathExists(safeFile)) throw new Error('safe.txt not extracted');
  const safeText = await fs.readFile(safeFile, 'utf8');
  if (safeText !== 'safe') throw new Error('safe.txt content mismatch');

  // 2) Zip-Slip traversal must be blocked
  const evilZip = new AdmZip();
  evilZip.addFile('ok.txt', Buffer.from('ok'));
  // Mutate entryName after addFile to keep traversal in zip (AdmZip addFile sanitizes).
  const e0 = evilZip.getEntries()[0];
  e0.entryName = '../evil.txt';
  evilZip.addFile('dir/also.txt', Buffer.from('x'));
  const evilZipPath = path.join(base, 'evil.zip');
  evilZip.writeZip(evilZipPath);

  if (!isZipFileHeader(evilZipPath)) throw new Error('evil.zip header check failed');

  const evilOut = path.join(base, 'evil_out');
  let blocked = false;
  try {
    await extractZip(evilZipPath, evilOut);
  } catch (e) {
    blocked = true;
  }
  if (!blocked) throw new Error('expected Zip-Slip to be blocked');

  // Ensure traversal target (base/evil.txt) was not created.
  const traversalTarget = path.join(base, 'evil.txt');
  if (await fs.pathExists(traversalTarget)) throw new Error('Zip-Slip wrote outside destDir');

  // 2.5) Case-folding duplicate path entries should be blocked on case-insensitive platforms.
  const duplicateCaseZip = new AdmZip();
  duplicateCaseZip.addFile('CaseFile.txt', Buffer.from('first'));
  duplicateCaseZip.addFile('casefile.txt', Buffer.from('second'));
  const duplicateCaseZipPath = path.join(base, 'duplicate_case.zip');
  duplicateCaseZip.writeZip(duplicateCaseZipPath);
  const duplicateCaseOut = path.join(base, 'duplicate_case_out');
  const caseInsensitiveFs = process.platform === 'win32' || process.platform === 'darwin';
  blocked = false;
  try {
    await extractZip(duplicateCaseZipPath, duplicateCaseOut);
  } catch (e) {
    blocked = true;
  }
  if (caseInsensitiveFs && !blocked) {
    throw new Error('expected case-fold duplicate zip path to be blocked');
  }
  if (!caseInsensitiveFs && blocked) {
    throw new Error('unexpected case-fold duplicate zip path block on case-sensitive platform');
  }

  // 3) Absolute path entry must be blocked
  const absZip = new AdmZip();
  absZip.addFile('x.txt', Buffer.from('x'));
  absZip.getEntries()[0].entryName = '/abs.txt';
  const absZipPath = path.join(base, 'abs.zip');
  absZip.writeZip(absZipPath);

  blocked = false;
  try {
    await extractZip(absZipPath, path.join(base, 'abs_out'));
  } catch (e) {
    blocked = true;
  }
  if (!blocked) throw new Error('expected absolute path entry to be blocked');

  // 3.5) Declared uncompressed size must be blocked (precheck entry.header.size)
  const declaredZip = new AdmZip();
  declaredZip.addFile('big.txt', Buffer.from('x'));
  const declaredEntry = declaredZip.getEntries()[0];
  declaredEntry.header.size = 1024 * 1024; // 1MB declared, but actual data is tiny
  const declaredZipPath = path.join(base, 'declared_size.zip');
  declaredZip.writeZip(declaredZipPath);
  blocked = false;
  try {
    await extractZip(declaredZipPath, path.join(base, 'declared_size_out'), { maxUncompressedBytes: 1024 });
  } catch (e) {
    blocked = true;
  }
  if (!blocked) throw new Error('expected declared uncompressed size to be blocked');

  // 4) Symlink entry must be blocked (unix mode link bit)
  const symlinkZip = new AdmZip();
  symlinkZip.addFile('x.txt', Buffer.from('x'));
  const symlinkEntry = symlinkZip.getEntries()[0];
  symlinkEntry.entryName = 'link';
  symlinkEntry.attr = ((0o120777 << 16) >>> 0);
  const symlinkZipPath = path.join(base, 'symlink.zip');
  symlinkZip.writeZip(symlinkZipPath);

  blocked = false;
  try {
    await extractZip(symlinkZipPath, path.join(base, 'symlink_out'));
  } catch (e) {
    blocked = true;
  }
  if (!blocked) throw new Error('expected symlink entry to be blocked');

  // 5) Existing symlink path under destDir must be blocked
  const symlinkBaseOut = path.join(base, 'symlink_path_out');
  const outsideDir = path.join(base, 'outside_dir');
  await fs.ensureDir(symlinkBaseOut);
  await fs.ensureDir(outsideDir);
  const linkedDir = path.join(symlinkBaseOut, 'linked');
  let symlinkReady = false;
  try {
    await fs.symlink(outsideDir, linkedDir, 'junction');
    symlinkReady = true;
  } catch (e) {
    try {
      await fs.symlink(outsideDir, linkedDir, 'dir');
      symlinkReady = true;
    } catch (e2) {
      symlinkReady = false;
    }
  }
  if (symlinkReady) {
    const symlinkPathZip = new AdmZip();
    symlinkPathZip.addFile('linked/pwn.txt', Buffer.from('pwned'));
    const symlinkPathZipFile = path.join(base, 'symlink_path.zip');
    symlinkPathZip.writeZip(symlinkPathZipFile);
    blocked = false;
    try {
      await extractZip(symlinkPathZipFile, symlinkBaseOut);
    } catch (e) {
      blocked = true;
    }
    if (!blocked) throw new Error('expected symlink path extraction to be blocked');
    const outsidePwn = path.join(outsideDir, 'pwn.txt');
    if (await fs.pathExists(outsidePwn)) throw new Error('symlink path wrote outside destDir');
  } else {
    console.warn('[warn] symlink path test skipped (symlink not available on this host)');
  }

  // 6) gh-proxy target allowlist must be enforced (no network; validation only)
  validateUpdateDownloadUrl(
    'https://gh-proxy.com/https://github.com/XTLS/Xray-core/releases/download/v0.0.0/Xray-windows-64.zip'
  );
  blocked = false;
  try {
    validateUpdateDownloadUrl('https://gh-proxy.com/https://example.com/evil.zip');
  } catch (e) {
    blocked = true;
  }
  if (!blocked) throw new Error('expected gh-proxy target host to be blocked');

  // 7) Digest parser should support asset-scoped parsing and reject ambiguous rows
  const hashA = 'a'.repeat(64);
  const hashB = 'b'.repeat(64);
  const asset = 'Xray-windows-64.zip';
  const parsedOpenSsl = parseSha256DigestForAsset(`SHA2-256 (${asset}) = ${hashA}`, asset);
  if (parsedOpenSsl !== hashA) throw new Error('digest parser failed on openssl format');
  const parsedShaSum = parseSha256DigestForAsset(`${hashB}  ${asset}`, asset);
  if (parsedShaSum !== hashB) throw new Error('digest parser failed on sha256sum format');
  const parsedMismatch = parseSha256DigestForAsset(`SHA2-256 (other.zip) = ${hashA}`, asset);
  if (parsedMismatch !== null) throw new Error('digest parser should ignore mismatched asset rows');
  const parsedAmbiguous = parseSha256DigestForAsset(`SHA2-256 (${asset}) = ${hashA}\nSHA2-256 (${asset}) = ${hashB}`, asset);
  if (parsedAmbiguous !== null) throw new Error('digest parser should reject ambiguous asset hashes');
  const parsedBareSingle = parseSha256DigestForAsset(`SHA2-256=${hashA}`, '');
  if (parsedBareSingle !== hashA) throw new Error('digest parser failed on bare hash line');
  const parsedBareAmbiguous = parseSha256DigestForAsset(`${hashA}\n${hashB}`, '');
  if (parsedBareAmbiguous !== null) throw new Error('digest parser should reject ambiguous bare hashes');

  // 8) Main-process updater flow should keep release tag normalization + downgrade guard
  const mainText = await fs.readFile(path.join(process.cwd(), 'main.js'), 'utf8');
  if (!mainText.includes('function normalizeXrayReleaseTag(tag)')) {
    throw new Error('missing xray release tag normalizer');
  }
  if (!mainText.includes('function compareXrayReleaseTags(tagA, tagB)')) {
    throw new Error('missing xray release tag comparator');
  }
  if (!/compareXrayReleaseTags\(remoteVer,\s*currentVer\)\s*<=\s*0/.test(mainText)) {
    throw new Error('missing xray check-update anti-downgrade gate');
  }
  if (!mainText.includes('Xray downgrade blocked: current')) {
    throw new Error('missing xray download anti-downgrade guard');
  }
  if (!mainText.includes('parseSha256FromDgstText(dgstText, assetName)')) {
    throw new Error('missing asset-scoped digest parsing usage');
  }
  if (!mainText.includes('validateUpdateDownloadUrl')) {
    throw new Error('missing updater download url validator wiring');
  }
  if (!mainText.includes('function enforceValidatedXrayUpdateUrl(url) {')) {
    throw new Error('missing xray updater url validation helper');
  }
  if (!mainText.includes('validateUpdateDownloadUrl(url);')) {
    throw new Error('missing xray updater helper validation call');
  }
  if (!mainText.includes('function resolveXrayReleaseAssetManifest(releaseData, assetName)')) {
    throw new Error('missing xray release manifest resolver');
  }
  if (!mainText.includes('const assetDirectValidated = enforceValidatedXrayUpdateUrl(assetDirectUrl);')) {
    throw new Error('missing manifest direct asset url validation');
  }
  if (!mainText.includes('const dgstDirectValidated = enforceValidatedXrayUpdateUrl(dgstDirectUrl);')) {
    throw new Error('missing manifest direct digest url validation');
  }
  if (!mainText.includes('const assetProxyValidated = enforceValidatedXrayUpdateUrl(`https://gh-proxy.com/${assetDirectValidated}`);')) {
    throw new Error('missing manifest proxy asset url validation');
  }
  if (!mainText.includes('const dgstProxyValidated = enforceValidatedXrayUpdateUrl(`https://gh-proxy.com/${dgstDirectValidated}`);')) {
    throw new Error('missing manifest proxy digest url validation');
  }
  if (!mainText.includes('direct: enforceValidatedXrayUpdateUrl(direct),')) {
    throw new Error('missing derived direct download url validation');
  }
  if (!mainText.includes('proxy: enforceValidatedXrayUpdateUrl(proxy),')) {
    throw new Error('missing derived proxy download url validation');
  }
  if (!mainText.includes('resolveXrayReleaseAssetManifest(data, assetName)')) {
    throw new Error('missing release manifest usage in updater flow');
  }
  if (!mainText.includes('if (!manifest) return { update: false };')) {
    throw new Error('missing check-update manifest gate');
  }
  if (!mainText.includes('const releaseFetch = await fetchLatestXrayReleaseWithRoute();')) {
    throw new Error('missing check-update xray release route-helper usage');
  }
  if (!mainText.includes("const releaseRouteUrl = (releaseFetch && releaseFetch.routeUrl) ? releaseFetch.routeUrl : '';")) {
    throw new Error('missing check-update release-route propagation');
  }
  if (!mainText.includes("return new URL(releaseRouteUrl).hostname === 'api.github.com';")) {
    throw new Error('missing check-update release-route direct host check');
  }
  if (!mainText.includes('const downloadUrl = preferDirectDownloadRoute ? manifest.assetDirectUrl : manifest.assetProxyUrl;')) {
    throw new Error('missing check-update route-affinity download url binding');
  }
  if (!mainText.includes("const downloadRoute = preferDirectDownloadRoute ? 'direct' : 'proxy';")) {
    throw new Error('missing check-update route-affinity route label binding');
  }
  if (!mainText.includes('const metadataRoute = (() => {')) {
    throw new Error('missing check-update metadata route label binding');
  }
  if (!mainText.includes("return new URL(releaseRouteUrl).hostname === 'api.github.com' ? 'direct' : 'proxy';")) {
    throw new Error('missing check-update metadata route direct/proxy selector');
  }
  if (!mainText.includes('downloadUrlDirect: manifest.assetDirectUrl,')) {
    throw new Error('missing check-update direct url metadata field');
  }
  if (!mainText.includes('downloadUrlProxy: manifest.assetProxyUrl,')) {
    throw new Error('missing check-update proxy url metadata field');
  }
  if (!mainText.includes('downloadRoute,')) {
    throw new Error('missing check-update selected route metadata field');
  }
  if (!mainText.includes('metadataRouteUrl: releaseRouteUrl,')) {
    throw new Error('missing check-update metadata route url field');
  }
  if (!mainText.includes('metadataRoute,')) {
    throw new Error('missing check-update metadata route field');
  }
  if (!mainText.includes('downloadUrl,')) {
    throw new Error('missing check-update compatibility downloadUrl field');
  }
  if (!mainText.includes('remote: remoteVer.replace(/^v/, \'\'),')) {
    throw new Error('missing check-update route-affinity return binding');
  }
  if (!mainText.includes('function createSecureXrayUpdateTempDir()')) {
    throw new Error('missing secure xray update temp dir helper');
  }
  if (!mainText.includes("fs.mkdtempSync(path.join(tempBase, 'xray_update_'));")) {
    throw new Error('missing mkdtemp-based temp dir creation');
  }
  if (!mainText.includes('Resolved update temp directory escapes system temp root')) {
    throw new Error('missing temp dir containment guard');
  }
  if (!mainText.includes('tempDir = createSecureXrayUpdateTempDir();')) {
    throw new Error('missing secure temp dir usage in updater flow');
  }
  if (!mainText.includes("zipPath = path.join(tempDir, 'xray.zip');")) {
    throw new Error('missing secure zip target path binding');
  }
  if (!mainText.includes('const XRAY_UPDATE_ZIP_MAX_BYTES = 100 * 1024 * 1024;')) {
    throw new Error('missing xray zip max-bytes constant');
  }
  if (!mainText.includes('const XRAY_UPDATE_EXTRACT_MAX_ENTRIES = 200;')) {
    throw new Error('missing xray extract max-entries constant');
  }
  if (!mainText.includes('const XRAY_UPDATE_EXTRACT_MAX_BYTES = 140 * 1024 * 1024;')) {
    throw new Error('missing xray extract max-bytes constant');
  }
  if (!mainText.includes('const XRAY_UPDATE_DGST_MAX_BYTES = 1 * 1024 * 1024;')) {
    throw new Error('missing xray digest max-bytes constant');
  }
  if (!mainText.includes('await downloadFileWithRouteFallback(primaryAssetUrl, fallbackAssetUrl, zipPath, { maxBytes: XRAY_UPDATE_ZIP_MAX_BYTES });')) {
    throw new Error('missing xray zip download max-bytes usage');
  }
  if (!mainText.includes('await extractZip(zipPath, extractDir, { maxEntries: XRAY_UPDATE_EXTRACT_MAX_ENTRIES, maxUncompressedBytes: XRAY_UPDATE_EXTRACT_MAX_BYTES });')) {
    throw new Error('missing xray unzip budget usage');
  }
  if (!mainText.includes('function isRetryableXrayUpdateDownloadNetworkError(err)')) {
    throw new Error('missing main-process updater download retryable error helper');
  }
  if (!mainText.includes('async function downloadFileWithRouteFallback(primaryUrl, fallbackUrl, dest, options = {})')) {
    throw new Error('missing main-process updater download fallback helper');
  }
  if (!mainText.includes('if (!isRetryableXrayUpdateDownloadNetworkError(err)) throw err;')) {
    throw new Error('missing main-process updater download retryable fallback gate');
  }
  if (!mainText.includes('const normalizedPrimaryUrl = enforceValidatedXrayUpdateUrl(primaryUrl);')) {
    throw new Error('missing main-process updater primary-route validation');
  }
  if (
    !mainText.includes('await downloadFile(normalizedPrimaryUrl, dest, options);')
    && !mainText.includes('await downloadFile(normalizedPrimaryUrl, dest, downloadOptions);')
  ) {
    throw new Error('missing main-process updater normalized primary download call');
  }
  if (!mainText.includes('return normalizedPrimaryUrl;')) {
    throw new Error('missing main-process updater normalized primary return contract');
  }
  if (!mainText.includes('const normalizedFallbackUrl = fallbackUrl ? enforceValidatedXrayUpdateUrl(fallbackUrl) : \'\';')) {
    throw new Error('missing main-process updater fallback-route validation');
  }
  if (!mainText.includes('if (!normalizedFallbackUrl || normalizedFallbackUrl === normalizedPrimaryUrl) throw err;')) {
    throw new Error('missing main-process updater normalized fallback precondition guard');
  }
  if (
    !mainText.includes('await downloadFile(normalizedFallbackUrl, dest, options);')
    && !mainText.includes('await downloadFile(normalizedFallbackUrl, dest, downloadOptions);')
  ) {
    throw new Error('missing main-process updater normalized fallback download call');
  }
  if (!mainText.includes('return normalizedFallbackUrl;')) {
    throw new Error('missing main-process updater normalized fallback return contract');
  }
  if (!mainText.includes('const effectiveAssetUrl = await downloadFileWithRouteFallback(primaryAssetUrl, fallbackAssetUrl, zipPath, { maxBytes: XRAY_UPDATE_ZIP_MAX_BYTES });')) {
    throw new Error('missing main-process updater effective zip route binding');
  }
  if (!mainText.includes('const usedDirectRoute = (() => {')) {
    throw new Error('missing main-process updater used-route detector');
  }
  if (!mainText.includes("return new URL(effectiveAssetUrl).hostname === 'github.com';")) {
    throw new Error('missing main-process updater used-route direct host check');
  }
  if (!mainText.includes('primaryDgstUrl = usedDirectRoute ?')) {
    throw new Error('missing main-process updater digest route-affinity binding');
  }
  if (!mainText.includes('await downloadFileWithRouteFallback(primaryDgstUrl, fallbackDgstUrl, dgstPath, { maxBytes: XRAY_UPDATE_DGST_MAX_BYTES });')) {
    throw new Error('missing main-process updater digest fallback usage');
  }
  if (!mainText.includes('const updateRouteMeta = {')) {
    throw new Error('missing main-process updater route telemetry container');
  }
  if (!mainText.includes('usedAssetFallback: false,')) {
    throw new Error('missing main-process updater asset fallback telemetry seed');
  }
  if (!mainText.includes("requestRouteHint: 'none',")) {
    throw new Error('missing main-process updater request route-hint telemetry seed');
  }
  if (!mainText.includes("requestUrlHost: 'none',")) {
    throw new Error('missing main-process updater request-url host telemetry seed');
  }
  if (!mainText.includes("releaseSource: 'unknown',")) {
    throw new Error('missing main-process updater release-source telemetry seed');
  }
  if (!mainText.includes("metadataRouteUrl: 'unknown',")) {
    throw new Error('missing main-process updater metadata-route-url telemetry seed');
  }
  if (!mainText.includes("metadataFetchStatus: 'unknown',")) {
    throw new Error('missing main-process updater metadata-fetch-status telemetry seed');
  }
  if (!mainText.includes("metadataFetchErrorCode: 'none',")) {
    throw new Error('missing main-process updater metadata-fetch-error-code telemetry seed');
  }
  if (!mainText.includes('metadataFetchHttpStatus: null,')) {
    throw new Error('missing main-process updater metadata-fetch-http-status telemetry seed');
  }
  if (!mainText.includes('metadataFetchErrorRetryable: null,')) {
    throw new Error('missing main-process updater metadata-fetch-error-retryable telemetry seed');
  }
  if (!mainText.includes('metadataFetchAttemptCount: 0,')) {
    throw new Error('missing main-process updater metadata-fetch-attempt-count telemetry seed');
  }
  if (!mainText.includes('metadataFetchFallbackUsed: false,')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-used telemetry seed');
  }
  if (!mainText.includes('metadataFetchFallbackAttempted: false,')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-attempted telemetry seed');
  }
  if (!mainText.includes("metadataFetchFallbackResult: 'unknown',")) {
    throw new Error('missing main-process updater metadata-fetch-fallback-result telemetry seed');
  }
  if (!mainText.includes("metadataFetchFallbackDecision: 'unknown',")) {
    throw new Error('missing main-process updater metadata-fetch-fallback-decision telemetry seed');
  }
  if (!mainText.includes("metadataFetchAttemptFlow: 'unknown',")) {
    throw new Error('missing main-process updater metadata-fetch-attempt-flow telemetry seed');
  }
  if (!mainText.includes("metadataFetchFailureRoute: 'none',")) {
    throw new Error('missing main-process updater metadata-fetch-failure-route telemetry seed');
  }
  if (!mainText.includes("metadataFetchFailureHost: 'none',")) {
    throw new Error('missing main-process updater metadata-fetch-failure-host telemetry seed');
  }
  if (!mainText.includes("metadataFetchRoute: 'unknown',")) {
    throw new Error('missing main-process updater metadata-fetch-route telemetry seed');
  }
  if (!mainText.includes("metadataFetchRouteHost: 'unknown',")) {
    throw new Error('missing main-process updater metadata-fetch-route-host telemetry seed');
  }
  if (!mainText.includes("selectedAssetHost: 'unknown',")) {
    throw new Error('missing main-process updater selected-asset-host telemetry seed');
  }
  if (!mainText.includes("routeDecisionSource: 'unknown',")) {
    throw new Error('missing main-process updater route-decision-source telemetry seed');
  }
  if (!mainText.includes('routeHintConflict: false,')) {
    throw new Error('missing main-process updater route-hint-conflict telemetry seed');
  }
  if (!mainText.includes("routeHintConflictType: 'none',")) {
    throw new Error('missing main-process updater route-hint-conflict-type telemetry seed');
  }
  if (!mainText.includes("selectedDgstRoute: 'unknown',")) {
    throw new Error('missing main-process updater selected-digest-route telemetry seed');
  }
  if (!mainText.includes("selectedDgstHost: 'unknown',")) {
    throw new Error('missing main-process updater selected-digest-host telemetry seed');
  }
  if (!mainText.includes("dgstSource: 'unknown',")) {
    throw new Error('missing main-process updater digest-source telemetry seed');
  }
  if (!mainText.includes("effectiveAssetHost: 'unknown',")) {
    throw new Error('missing main-process updater effective-asset-host telemetry seed');
  }
  if (!mainText.includes("effectiveDgstHost: 'unknown',")) {
    throw new Error('missing main-process updater effective-digest-host telemetry seed');
  }
  if (!mainText.includes('usedDgstFallback: false,')) {
    throw new Error('missing main-process updater digest fallback telemetry seed');
  }
  if (!mainText.includes("updateRouteMeta.requestRouteHint = inputRouteHint || 'none';")) {
    throw new Error('missing main-process updater request route-hint telemetry binding');
  }
  if (!mainText.includes("updateRouteMeta.requestUrlHost = (() => {")) {
    throw new Error('missing main-process updater request-url host telemetry resolver');
  }
  if (!mainText.includes("return new URL(inputUrl).hostname || 'none';")) {
    throw new Error('missing main-process updater request-url host telemetry binding');
  }
  if (!mainText.includes("return 'invalid';")) {
    throw new Error('missing main-process updater request-url host telemetry invalid fallback');
  }
  if (!mainText.includes("updateRouteMeta.metadataRouteUrl = releaseMetadataRouteUrl || 'unknown';")) {
    throw new Error('missing main-process updater metadata-route-url telemetry manifest binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataFetchStatus = 'ok';")) {
    throw new Error('missing main-process updater metadata-fetch-status ok binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataFetchErrorCode = 'none';")) {
    throw new Error('missing main-process updater metadata-fetch-error-code non-error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchHttpStatus = null;')) {
    throw new Error('missing main-process updater metadata-fetch-http-status non-error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchErrorRetryable = null;')) {
    throw new Error('missing main-process updater metadata-fetch-error-retryable non-error binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataFetchFailureRoute = 'none';")) {
    throw new Error('missing main-process updater metadata-fetch-failure-route non-error binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataFetchFailureHost = 'none';")) {
    throw new Error('missing main-process updater metadata-fetch-failure-host non-error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchRoute = mapMetadataFetchRouteFromUrl(releaseMetadataRouteUrl);')) {
    throw new Error('missing main-process updater metadata-fetch-route success binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchRouteHost = mapMetadataFetchRouteHostFromUrl(releaseMetadataRouteUrl);')) {
    throw new Error('missing main-process updater metadata-fetch-route-host success binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataFetchStatus = 'manifest_missing';")) {
    throw new Error('missing main-process updater metadata-fetch-status manifest-missing binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataFetchStatus = 'fetch_error';")) {
    throw new Error('missing main-process updater metadata-fetch-status fetch-error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchErrorCode = mapXrayMetadataFetchErrorCode(e);')) {
    throw new Error('missing main-process updater metadata-fetch-error-code fetch-error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchHttpStatus = parseHttpStatusFromError(e);')) {
    throw new Error('missing main-process updater metadata-fetch-http-status fetch-error binding');
  }
  if (!mainText.includes('const metadataFetchErrorRetryable = mapMetadataFetchErrorRetryable(e);')) {
    throw new Error('missing main-process updater metadata-fetch-error-retryable fetch-error mapper');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchErrorRetryable = metadataFetchErrorRetryable;')) {
    throw new Error('missing main-process updater metadata-fetch-error-retryable fetch-error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchAttemptCount = mapMetadataFetchAttemptCount(')) {
    throw new Error('missing main-process updater metadata-fetch-attempt-count binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFallbackUsed = !!(releaseFetch && releaseFetch.fallbackUsed);')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-used success binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFallbackAttempted = !!(releaseFetch && releaseFetch.fallbackAttempted);')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-attempted success binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFallbackResult = mapMetadataFetchFallbackResult(')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-result binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFallbackDecision = mapMetadataFetchFallbackDecision(')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-decision binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchAttemptFlow = mapMetadataFetchAttemptFlow(')) {
    throw new Error('missing main-process updater metadata-fetch-attempt-flow binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFallbackUsed = !!(e && e.githubApiFallbackAttempted);')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-used error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFallbackAttempted = !!(e && e.githubApiFallbackAttempted);')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-attempted error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFailureRoute = mapXrayMetadataFetchFailureRoute(e);')) {
    throw new Error('missing main-process updater metadata-fetch-failure-route error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchFailureHost = mapXrayMetadataFetchFailureHost(e);')) {
    throw new Error('missing main-process updater metadata-fetch-failure-host error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchRoute = mapXrayMetadataFetchFailureRoute(e);')) {
    throw new Error('missing main-process updater metadata-fetch-route error binding');
  }
  if (!mainText.includes('updateRouteMeta.metadataFetchRouteHost = mapXrayMetadataFetchFailureHost(e);')) {
    throw new Error('missing main-process updater metadata-fetch-route-host error binding');
  }
  if (!mainText.includes('wrapped.githubApiFallbackAttempted = !!fallbackAttempted;')) {
    throw new Error('missing github api fallback-attempted error annotation');
  }
  if (!mainText.includes("wrapped.githubApiFailureHost = String(failureHost || 'unknown').trim().toLowerCase() || 'unknown';")) {
    throw new Error('missing github api failure-host error annotation');
  }
  if (!mainText.includes('const githubApiErrorRetryable = isRetryableGitHubApiNetworkError(wrapped);')) {
    throw new Error('missing github api error-retryable mapper');
  }
  if (!mainText.includes('wrapped.githubApiErrorRetryable = githubApiErrorRetryable;')) {
    throw new Error('missing github api error-retryable annotation');
  }
  if (!mainText.includes('wrapped.githubApiAttemptCount = mapMetadataFetchAttemptCount(attemptCount, !!fallbackAttempted);')) {
    throw new Error('missing github api attempt-count annotation');
  }
  if (!mainText.includes('wrapped.githubApiFallbackDecision = mapMetadataFetchFallbackDecision(')) {
    throw new Error('missing github api fallback-decision annotation');
  }
  if (!mainText.includes('wrapped.githubApiAttemptFlow = mapMetadataFetchAttemptFlow(attemptFlow, !!fallbackAttempted);')) {
    throw new Error('missing github api attempt-flow annotation');
  }
  if (!mainText.includes('const directErr = annotateGitHubApiRouteError(')) {
    throw new Error('missing github api direct-route annotated error binding');
  }
  if (!mainText.includes('const proxyHost = (() => {')) {
    throw new Error('missing github api proxy-host resolver');
  }
  if (!/throw annotateGitHubApiRouteError\(\s*proxyErr,\s*'proxy',\s*true,\s*'failed',\s*'retryable_error',\s*proxyHost,\s*'direct_then_proxy',\s*2,\s*\);/m.test(mainText)) {
    throw new Error('missing github api proxy-route fallback-decision error binding');
  }
  if (!mainText.includes("wrapped.githubApiFallbackResult = mapMetadataFetchFallbackResult(fallbackResult, !!fallbackAttempted);")) {
    throw new Error('missing github api fallback-result error annotation');
  }
  if (!mainText.includes("fallbackResult: 'not_attempted',")) {
    throw new Error('missing github api fallback-used false return contract');
  }
  if (!mainText.includes("fallbackDecision: 'not_needed',")) {
    throw new Error('missing github api direct-route fallback-decision return contract');
  }
  if (!mainText.includes('attemptCount: 1,')) {
    throw new Error('missing github api direct-route attempt-count return contract');
  }
  if (!mainText.includes("fallbackResult: 'succeeded',")) {
    throw new Error('missing github api fallback-used true return contract');
  }
  if (!mainText.includes("fallbackDecision: 'retryable_error',")) {
    throw new Error('missing github api proxy-route fallback-decision return contract');
  }
  if (!mainText.includes('attemptCount: 2,')) {
    throw new Error('missing github api proxy-route attempt-count return contract');
  }
  if (!mainText.includes('function parseHttpStatusFromError(err)')) {
    throw new Error('missing main-process updater metadata-fetch-http-status parser');
  }
  if (!mainText.includes('function mapXrayMetadataFetchErrorCode(err)')) {
    throw new Error('missing main-process updater metadata-fetch-error-code mapper');
  }
  if (!mainText.includes('function mapXrayMetadataFetchFailureRoute(err)')) {
    throw new Error('missing main-process updater metadata-fetch-failure-route mapper');
  }
  if (!mainText.includes('function mapXrayMetadataFetchFailureHost(err)')) {
    throw new Error('missing main-process updater metadata-fetch-failure-host mapper');
  }
  if (!mainText.includes('function mapMetadataFetchRouteFromUrl(routeUrl)')) {
    throw new Error('missing main-process updater metadata-fetch-route resolver');
  }
  if (!mainText.includes('function mapMetadataFetchRouteHostFromUrl(routeUrl)')) {
    throw new Error('missing main-process updater metadata-fetch-route-host resolver');
  }
  if (!mainText.includes('function mapMetadataFetchFallbackResult(value, fallbackAttempted = false)')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-result resolver');
  }
  if (!mainText.includes('function mapMetadataFetchFallbackDecision(value, fallbackAttempted = false, retryable = null)')) {
    throw new Error('missing main-process updater metadata-fetch-fallback-decision resolver');
  }
  if (!mainText.includes('function mapMetadataFetchAttemptFlow(value, fallbackAttempted = false)')) {
    throw new Error('missing main-process updater metadata-fetch-attempt-flow resolver');
  }
  if (!mainText.includes('function mapMetadataFetchErrorRetryable(err)')) {
    throw new Error('missing main-process updater metadata-fetch-error-retryable resolver');
  }
  if (!mainText.includes('function mapMetadataFetchAttemptCount(value, fallbackAttempted = false)')) {
    throw new Error('missing main-process updater metadata-fetch-attempt-count resolver');
  }
  if (!mainText.includes('const httpStatus = parseHttpStatusFromError(err);')) {
    throw new Error('missing main-process updater metadata-fetch-error-code http-status binding');
  }
  if (!mainText.includes("updateRouteMeta.metadataRouteUrl = 'unavailable';")) {
    throw new Error('missing main-process updater metadata-route-url telemetry fallback binding');
  }
  if (!mainText.includes('updateRouteMeta.routeDecisionSource = (() => {')) {
    throw new Error('missing main-process updater route-decision-source telemetry resolver');
  }
  if (!mainText.includes("const hintRoute = explicitDirectRequestedByHint ? 'direct' : (explicitProxyRequestedByHint ? 'proxy' : 'none');")) {
    throw new Error('missing main-process updater route-hint normalized resolver');
  }
  if (!mainText.includes("const urlRoute = explicitDirectRequestedByUrl ? 'direct' : (explicitProxyRequestedByUrl ? 'proxy' : 'none');")) {
    throw new Error('missing main-process updater route-url normalized resolver');
  }
  if (!mainText.includes("const routeHintConflict = hintRoute !== 'none' && urlRoute !== 'none' && hintRoute !== urlRoute;")) {
    throw new Error('missing main-process updater route conflict detector');
  }
  if (!mainText.includes("return 'metadata_route';")) {
    throw new Error('missing main-process updater metadata-route decision source binding');
  }
  if (!mainText.includes("updateRouteMeta.routeDecisionSource = 'derived_url';")) {
    throw new Error('missing main-process updater derived-url decision source binding');
  }
  if (!mainText.includes('updateRouteMeta.routeHintConflict = routeHintConflict;')) {
    throw new Error('missing main-process updater route-hint-conflict telemetry binding');
  }
  if (!mainText.includes("updateRouteMeta.routeHintConflictType = routeHintConflict ? 'hint_vs_url' : 'none';")) {
    throw new Error('missing main-process updater route-hint-conflict-type telemetry binding');
  }
  if (!mainText.includes('updateRouteMeta.selectedAssetHost = (() => {')) {
    throw new Error('missing main-process updater selected-asset-host telemetry resolver');
  }
  if (!mainText.includes("return new URL(primaryAssetUrl).hostname || 'unknown';")) {
    throw new Error('missing main-process updater selected-asset-host telemetry binding');
  }
  if (!mainText.includes('updateRouteMeta.selectedDgstHost = (() => {')) {
    throw new Error('missing main-process updater selected-digest-host telemetry resolver');
  }
  if (!mainText.includes("return new URL(primaryDgstUrl).hostname || 'unknown';")) {
    throw new Error('missing main-process updater selected-digest-host telemetry binding');
  }
  if (!mainText.includes('updateRouteMeta.selectedDgstRoute = (() => {')) {
    throw new Error('missing main-process updater selected-digest-route telemetry resolver');
  }
  if (!mainText.includes("return new URL(primaryDgstUrl).hostname === 'github.com' ? 'direct' : 'proxy';")) {
    throw new Error('missing main-process updater selected-digest-route telemetry binding');
  }
  if (!mainText.includes("updateRouteMeta.dgstSource = 'manifest';")) {
    throw new Error('missing main-process updater manifest digest-source telemetry binding');
  }
  if (!mainText.includes("updateRouteMeta.dgstSource = 'derived';")) {
    throw new Error('missing main-process updater derived digest-source telemetry binding');
  }
  if (!mainText.includes("updateRouteMeta.releaseSource = 'manifest';")) {
    throw new Error('missing main-process updater manifest release-source telemetry binding');
  }
  if (!mainText.includes("updateRouteMeta.releaseSource = 'derived';")) {
    throw new Error('missing main-process updater derived release-source telemetry binding');
  }
  if (!mainText.includes("let updateFailureStage = 'resolve_release';")) {
    throw new Error('missing main-process updater failure-stage seed');
  }
  if (!mainText.includes("updateFailureStage = 'download_asset';")) {
    throw new Error('missing main-process updater download stage marker');
  }
  if (!mainText.includes("updateFailureStage = 'install_binary';")) {
    throw new Error('missing main-process updater install stage marker');
  }
  if (!mainText.includes('function mapXrayUpdateErrorCode(err)')) {
    throw new Error('missing main-process updater error-code mapper');
  }
  if (!mainText.includes("if (/only https urls are allowed/i.test(message)) return 'XRAY_UPDATE_PROTOCOL_NOT_ALLOWED';")) {
    throw new Error('missing main-process updater protocol rejection error mapping');
  }
  if (!mainText.includes("if (/download failed:\\s*http\\s*\\d+/i.test(message)) return 'XRAY_UPDATE_HTTP_ERROR';")) {
    throw new Error('missing main-process updater http error mapping');
  }
  if (!mainText.includes("if (/download timeout/i.test(message)) return 'XRAY_UPDATE_NETWORK_TIMEOUT';")) {
    throw new Error('missing main-process updater timeout error mapping');
  }
  if (!mainText.includes("if (/too many redirects/i.test(message)) return 'XRAY_UPDATE_REDIRECT_LIMIT';")) {
    throw new Error('missing main-process updater redirect-limit error mapping');
  }
  if (!mainText.includes("if (/download too large|zip too large/i.test(message)) return 'XRAY_UPDATE_PAYLOAD_TOO_LARGE';")) {
    throw new Error('missing main-process updater payload-too-large error mapping');
  }
  if (!mainText.includes("if (/invalid xray download url|missing xray download url|invalid url|invalid gh-proxy url/i.test(message)) return 'XRAY_UPDATE_URL_INVALID';")) {
    throw new Error('missing main-process updater invalid-url error mapping');
  }
  if (!mainText.includes('function mapXrayUpdateFailureStageFallbackCode(failureStage)')) {
    throw new Error('missing main-process updater failure-stage fallback mapper');
  }
  if (!mainText.includes("case 'resolve_release':")) {
    throw new Error('missing main-process updater resolve-release fallback stage');
  }
  if (!mainText.includes("return 'XRAY_UPDATE_RELEASE_RESOLVE_FAILED';")) {
    throw new Error('missing main-process updater resolve-release fallback code');
  }
  if (!mainText.includes("case 'download_asset':")) {
    throw new Error('missing main-process updater download-asset fallback stage');
  }
  if (!mainText.includes("return 'XRAY_UPDATE_DOWNLOAD_FAILED';")) {
    throw new Error('missing main-process updater download-asset fallback code');
  }
  if (!mainText.includes("case 'verify_digest':")) {
    throw new Error('missing main-process updater verify-digest fallback stage');
  }
  if (!mainText.includes("return 'XRAY_UPDATE_DIGEST_VERIFY_FAILED';")) {
    throw new Error('missing main-process updater verify-digest fallback code');
  }
  if (!mainText.includes("case 'extract_zip':")) {
    throw new Error('missing main-process updater extract-zip fallback stage');
  }
  if (!mainText.includes("return 'XRAY_UPDATE_ZIP_EXTRACT_FAILED';")) {
    throw new Error('missing main-process updater extract-zip fallback code');
  }
  if (!mainText.includes('function resolveXrayUpdateErrorCode(err, failureStage)')) {
    throw new Error('missing main-process updater error-code resolver');
  }
  if (!mainText.includes('const directCode = mapXrayUpdateErrorCode(err);')) {
    throw new Error('missing main-process updater direct error-code mapping in resolver');
  }
  if (!mainText.includes('return mapXrayUpdateFailureStageFallbackCode(failureStage);')) {
    throw new Error('missing main-process updater failure-stage fallback resolver binding');
  }
  if (!mainText.includes('updateRouteMeta.effectiveAssetRoute = usedDirectRoute ? \'direct\' : \'proxy\';')) {
    throw new Error('missing main-process updater effective asset route telemetry');
  }
  if (!mainText.includes('updateRouteMeta.effectiveAssetHost = (() => {')) {
    throw new Error('missing main-process updater effective asset host telemetry resolver');
  }
  if (!mainText.includes("return new URL(effectiveAssetUrl).hostname || 'unknown';")) {
    throw new Error('missing main-process updater effective asset host telemetry binding');
  }
  if (!mainText.includes('updateRouteMeta.usedAssetFallback = String(effectiveAssetUrl) !== String(primaryAssetUrl);')) {
    throw new Error('missing main-process updater asset fallback telemetry binding');
  }
  if (!mainText.includes('updateRouteMeta.usedDgstFallback = String(effectiveDgstUrl) !== String(primaryDgstUrl);')) {
    throw new Error('missing main-process updater digest fallback telemetry binding');
  }
  if (!mainText.includes('updateRouteMeta.effectiveDgstHost = (() => {')) {
    throw new Error('missing main-process updater effective digest host telemetry resolver');
  }
  if (!mainText.includes("return new URL(effectiveDgstUrl).hostname || 'unknown';")) {
    throw new Error('missing main-process updater effective digest host telemetry binding');
  }
  if (!mainText.includes('success: true,')) {
    throw new Error('missing main-process updater structured success return');
  }
  if (!mainText.includes('errorCode: null,')) {
    throw new Error('missing main-process updater structured success errorCode');
  }
  if (!mainText.includes('failureStage: null,')) {
    throw new Error('missing main-process updater structured success failureStage');
  }
  if (!mainText.includes('success: false,')) {
    throw new Error('missing main-process updater structured failure return');
  }
  if (!mainText.includes('...updateRouteMeta,')) {
    throw new Error('missing main-process updater route telemetry return spread');
  }
  if (!mainText.includes('error: e && e.message ? e.message : String(e),')) {
    throw new Error('missing main-process updater structured error return');
  }
  if (!mainText.includes('errorCode: resolveXrayUpdateErrorCode(e, updateFailureStage),')) {
    throw new Error('missing main-process updater structured resolved errorCode return');
  }
  if (!mainText.includes('failureStage: updateFailureStage,')) {
    throw new Error('missing main-process updater structured failureStage return');
  }
  if (!mainText.includes('let xrayUpdateInProgress = false;')) {
    throw new Error('missing xray update single-flight flag');
  }
  if (!/if\s*\(xrayUpdateInProgress\)\s*throw new Error\('Xray update already in progress'\)/.test(mainText)) {
    throw new Error('missing xray update single-flight guard');
  }
  if (!/xrayUpdateInProgress\s*=\s*true;/.test(mainText)) {
    throw new Error('missing xray update lock acquire');
  }
  if (!/finally\s*\{[^}]*xrayUpdateInProgress\s*=\s*false;/.test(mainText)) {
    throw new Error('missing xray update lock release');
  }
  if (!mainText.includes('function acquireXrayUpdateFileLock()')) {
    throw new Error('missing xray update cross-process lock helper');
  }
  if (!mainText.includes("fs.openSync(lockPath, 'wx');")) {
    throw new Error('missing cross-process lock file openSync(wx)');
  }
  if (!mainText.includes('xrayUpdateLockPath = acquireXrayUpdateFileLock();')) {
    throw new Error('missing cross-process lock acquire usage');
  }
  if (!mainText.includes('releaseXrayUpdateFileLock(xrayUpdateLockPath);')) {
    throw new Error('missing cross-process lock release usage');
  }
  if (!mainText.includes("ipcMain.handle('download-xray-update', async (e, updateRequest) => {")) {
    throw new Error('missing updater structured request handler signature');
  }
  if (!mainText.includes("if (typeof updateRequest === 'string') return updateRequest.trim();")) {
    throw new Error('missing updater legacy string request compatibility');
  }
  if (!mainText.includes("const route = typeof updateRequest.route === 'string' ? updateRequest.route.trim().toLowerCase() : '';")) {
    throw new Error('missing updater route hint normalization');
  }
  if (!mainText.includes("const explicitDirectRequestedByHint = inputRouteHint === 'direct';")) {
    throw new Error('missing updater direct route hint binding');
  }
  if (!mainText.includes("const explicitProxyRequestedByHint = inputRouteHint === 'proxy';")) {
    throw new Error('missing updater proxy route hint binding');
  }
  if (!mainText.includes("const explicitDirectRequestedByUrl = inputUrl === releaseManifest.assetDirectUrl;")) {
    throw new Error('missing updater direct route url binding');
  }
  if (!mainText.includes("const explicitProxyRequestedByUrl = inputUrl === releaseManifest.assetProxyUrl;")) {
    throw new Error('missing updater proxy route url binding');
  }

  const rendererText = await fs.readFile(path.join(process.cwd(), 'renderer.js'), 'utf8');
  if (!rendererText.includes('const preferredUpdateRoute = (() => {')) {
    throw new Error('missing renderer updater preferred route resolver');
  }
  if (!rendererText.includes('const preferredUpdateUrl = (() => {')) {
    throw new Error('missing renderer updater preferred route-url resolver');
  }
  if (!rendererText.includes("return route === 'direct' || route === 'proxy' ? route : '';")) {
    throw new Error('missing renderer updater route normalization return');
  }
  if (!rendererText.includes('if (preferredUpdateRoute === \'direct\' && directUrl) return directUrl;')) {
    throw new Error('missing renderer updater direct route-url resolver');
  }
  if (!rendererText.includes('if (preferredUpdateRoute === \'proxy\' && proxyUrl) return proxyUrl;')) {
    throw new Error('missing renderer updater proxy route-url resolver');
  }
  if (!rendererText.includes('if (!preferredUpdateUrl) {')) {
    throw new Error('missing renderer updater empty-handoff guard');
  }
  if (!rendererText.includes('const updateRequest = preferredUpdateRoute')) {
    throw new Error('missing renderer updater structured request resolver');
  }
  if (!rendererText.includes('? { url: preferredUpdateUrl, route: preferredUpdateRoute }')) {
    throw new Error('missing renderer updater object request payload');
  }
  if (!rendererText.includes("console.log('[Update] check-xray-update handoff:', {")) {
    throw new Error('missing renderer updater handoff diagnostic log');
  }
  if (!rendererText.includes('const updateResult = await window.electronAPI.invoke(\'download-xray-update\', updateRequest);')) {
    throw new Error('missing renderer structured updater result binding');
  }
  if (!rendererText.includes('const updatePayload = updateResult && typeof updateResult === \'object\' ? updateResult : null;')) {
    throw new Error('missing renderer updater payload normalization');
  }
  if (!rendererText.includes('const updateSuccess = !!(')) {
    throw new Error('missing renderer updater result normalization');
  }
  if (!rendererText.includes('updateResult && typeof updateResult === \'object\'')) {
    throw new Error('missing renderer updater object compatibility guard');
  }
  if (!rendererText.includes("console.log('[Update] download-xray-update result:', {")) {
    throw new Error('missing renderer updater route telemetry console binding');
  }
  if (!rendererText.includes('errorCode: updatePayload.errorCode || null,')) {
    throw new Error('missing renderer updater errorCode telemetry log binding');
  }
  if (!rendererText.includes('failureStage: updatePayload.failureStage || null,')) {
    throw new Error('missing renderer updater failureStage telemetry log binding');
  }
  if (!rendererText.includes('requestRouteHint: updatePayload.requestRouteHint || null,')) {
    throw new Error('missing renderer updater request route-hint telemetry log binding');
  }
  if (!rendererText.includes('requestUrlHost: updatePayload.requestUrlHost || null,')) {
    throw new Error('missing renderer updater request-url host telemetry log binding');
  }
  if (!rendererText.includes('releaseSource: updatePayload.releaseSource || null,')) {
    throw new Error('missing renderer updater release-source telemetry log binding');
  }
  if (!rendererText.includes('metadataRouteUrl: updatePayload.metadataRouteUrl || null,')) {
    throw new Error('missing renderer updater metadata-route-url telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchStatus: updatePayload.metadataFetchStatus || null,')) {
    throw new Error('missing renderer updater metadata-fetch-status telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchErrorCode: updatePayload.metadataFetchErrorCode || null,')) {
    throw new Error('missing renderer updater metadata-fetch-error-code telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchHttpStatus: Number.isInteger(updatePayload.metadataFetchHttpStatus)')) {
    throw new Error('missing renderer updater metadata-fetch-http-status telemetry log binding');
  }
  if (!rendererText.includes("metadataFetchErrorRetryable: typeof updatePayload.metadataFetchErrorRetryable === 'boolean'")) {
    throw new Error('missing renderer updater metadata-fetch-error-retryable telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchAttemptCount: Number.isInteger(updatePayload.metadataFetchAttemptCount)')) {
    throw new Error('missing renderer updater metadata-fetch-attempt-count telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchFallbackUsed: !!updatePayload.metadataFetchFallbackUsed,')) {
    throw new Error('missing renderer updater metadata-fetch-fallback-used telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchFallbackAttempted: !!updatePayload.metadataFetchFallbackAttempted,')) {
    throw new Error('missing renderer updater metadata-fetch-fallback-attempted telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchFallbackResult: updatePayload.metadataFetchFallbackResult || null,')) {
    throw new Error('missing renderer updater metadata-fetch-fallback-result telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchAttemptFlow: updatePayload.metadataFetchAttemptFlow || null,')) {
    throw new Error('missing renderer updater metadata-fetch-attempt-flow telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchFailureRoute: updatePayload.metadataFetchFailureRoute || null,')) {
    throw new Error('missing renderer updater metadata-fetch-failure-route telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchFailureHost: updatePayload.metadataFetchFailureHost || null,')) {
    throw new Error('missing renderer updater metadata-fetch-failure-host telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchRoute: updatePayload.metadataFetchRoute || null,')) {
    throw new Error('missing renderer updater metadata-fetch-route telemetry log binding');
  }
  if (!rendererText.includes('metadataFetchRouteHost: updatePayload.metadataFetchRouteHost || null,')) {
    throw new Error('missing renderer updater metadata-fetch-route-host telemetry log binding');
  }
  if (!rendererText.includes('routeDecisionSource: updatePayload.routeDecisionSource || null,')) {
    throw new Error('missing renderer updater route-decision-source telemetry log binding');
  }
  if (!rendererText.includes('routeHintConflict: !!updatePayload.routeHintConflict,')) {
    throw new Error('missing renderer updater route-hint-conflict telemetry log binding');
  }
  if (!rendererText.includes('routeHintConflictType: updatePayload.routeHintConflictType || null,')) {
    throw new Error('missing renderer updater route-hint-conflict-type telemetry log binding');
  }
  if (!rendererText.includes('selectedAssetHost: updatePayload.selectedAssetHost || null,')) {
    throw new Error('missing renderer updater selected-asset-host telemetry log binding');
  }
  if (!rendererText.includes('selectedDgstRoute: updatePayload.selectedDgstRoute || null,')) {
    throw new Error('missing renderer updater selected-digest-route telemetry log binding');
  }
  if (!rendererText.includes('selectedDgstHost: updatePayload.selectedDgstHost || null,')) {
    throw new Error('missing renderer updater selected-digest-host telemetry log binding');
  }
  if (!rendererText.includes('dgstSource: updatePayload.dgstSource || null,')) {
    throw new Error('missing renderer updater digest-source telemetry log binding');
  }
  if (!rendererText.includes('effectiveAssetHost: updatePayload.effectiveAssetHost || null,')) {
    throw new Error('missing renderer updater effective asset host telemetry log binding');
  }
  if (!rendererText.includes('effectiveDgstHost: updatePayload.effectiveDgstHost || null,')) {
    throw new Error('missing renderer updater effective digest host telemetry log binding');
  }
  if (!rendererText.includes('function resolveXrayUpdateErrorMessage(errorCode, failureStage)')) {
    throw new Error('missing renderer updater error-message resolver');
  }
  if (!rendererText.includes("case 'XRAY_UPDATE_PROTOCOL_NOT_ALLOWED':")) {
    throw new Error('missing renderer updater protocol error message mapping');
  }
  if (!rendererText.includes("case 'XRAY_UPDATE_HTTP_ERROR':")) {
    throw new Error('missing renderer updater http error message mapping');
  }
  if (!rendererText.includes("case 'XRAY_UPDATE_DIGEST_VERIFY_FAILED':")) {
    throw new Error('missing renderer updater digest-verify message mapping');
  }
  if (!rendererText.includes('function composeXrayUpdateErrorMessage(updatePayload)')) {
    throw new Error('missing renderer updater error-message composer');
  }
  if (!rendererText.includes('function resolveXrayUpdateNextStepMessage(errorCode, failureStage)')) {
    throw new Error('missing renderer updater next-step resolver');
  }
  if (!rendererText.includes('function resolveXrayUpdateMetadataHint(updatePayload)')) {
    throw new Error('missing renderer updater metadata-hint resolver');
  }
  if (!rendererText.includes('function resolveXrayUpdateMetadataSeverity(updatePayload)')) {
    throw new Error('missing renderer updater metadata severity resolver');
  }
  if (!rendererText.includes("if (fallbackAttempted && fallbackResult === 'failed') return 'block';")) {
    throw new Error('missing renderer updater metadata severity blocked-by-fallback branch');
  }
  if (!rendererText.includes("if (retryableError === false) return 'block';")) {
    throw new Error('missing renderer updater metadata severity blocked non-retryable branch');
  }
  if (!rendererText.includes("if (fallbackAttempted && fallbackResult === 'succeeded') return 'info';")) {
    throw new Error('missing renderer updater metadata severity fallback-succeeded info branch');
  }
  const severityFallbackSucceeded = "if (fallbackAttempted && fallbackResult === 'succeeded') return 'info';";
  const severityNonRetryable = "if (retryableError === false) return 'block';";
  if (rendererText.indexOf(severityFallbackSucceeded) === -1 || rendererText.indexOf(severityNonRetryable) === -1 || rendererText.indexOf(severityFallbackSucceeded) > rendererText.indexOf(severityNonRetryable)) {
    throw new Error('missing renderer updater metadata severity order: fallback succeeded before non-retryable');
  }
  if (!rendererText.includes("if (retryableError === true) return 'warn';")) {
    throw new Error('missing renderer updater metadata severity warn branch');
  }
  if (!rendererText.includes('function formatXrayUpdateMetadataHint(updatePayload)')) {
    throw new Error('missing renderer updater metadata severity formatter');
  }
  if (!rendererText.includes("if (severity === 'block') return tText('xrayUpdateMetaSeverityBlock', '[block]');")) {
    throw new Error('missing renderer updater metadata severity block label binding');
  }
  if (!rendererText.includes("if (severity === 'warn') return tText('xrayUpdateMetaSeverityWarn', '[warn]');")) {
    throw new Error('missing renderer updater metadata severity warn label binding');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaSeverityInfo', '[info]');")) {
    throw new Error('missing renderer updater metadata severity info label binding');
  }
  if (!rendererText.includes("const metadataFailureRoute = String(updatePayload.metadataFetchFailureRoute || '').trim().toLowerCase() || 'unknown';")) {
    throw new Error('missing renderer updater metadata failure-route normalization');
  }
  if (!rendererText.includes("const metadataRouteHost = String(updatePayload.metadataFetchRouteHost || '').trim().toLowerCase() || 'unknown';")) {
    throw new Error('missing renderer updater metadata route-host normalization');
  }
  if (!rendererText.includes("const metadataFailureHost = String(updatePayload.metadataFetchFailureHost || '').trim().toLowerCase() || 'unknown';")) {
    throw new Error('missing renderer updater metadata failure-host normalization');
  }
  if (!rendererText.includes('const metadataHost = (() => {')) {
    throw new Error('missing renderer updater metadata host resolver');
  }
  if (!rendererText.includes('const metadataHttpStatus = Number.isInteger(updatePayload.metadataFetchHttpStatus)')) {
    throw new Error('missing renderer updater metadata http-status normalization');
  }
  if (!rendererText.includes('const metadataAttemptCount = Number.isInteger(updatePayload.metadataFetchAttemptCount)')) {
    throw new Error('missing renderer updater metadata attempt-count normalization');
  }
  if (!rendererText.includes("const attemptFlow = String(updatePayload.metadataFetchAttemptFlow || '').trim().toLowerCase();")) {
    throw new Error('missing renderer updater metadata attempt-flow normalization');
  }
  if (!rendererText.includes("if (metadataStatus === 'manifest_missing') {")) {
    throw new Error('missing renderer updater metadata manifest-missing hint branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaHintManifestMissing', 'Metadata hint: release metadata is incomplete; updater used fallback derivation checks.');")) {
    throw new Error('missing renderer updater metadata manifest-missing text binding');
  }
  if (!rendererText.includes("if (metadataStatus === 'fetch_error') {")) {
    throw new Error('missing renderer updater metadata fetch-error hint branch');
  }
  if (!rendererText.includes("return tFormat(")) {
    throw new Error('missing renderer updater metadata tFormat binding');
  }
  if (!rendererText.includes("'xrayUpdateMetaHintFetchError',")) {
    throw new Error('missing renderer updater metadata fetch-error i18n key binding');
  }
  if (!rendererText.includes("'Metadata hint: route={route}, host={host}, code={code}, http={http}, attempts={attempts}, retryable={retryable}, fallback={fallback}.',")) {
    throw new Error('missing renderer updater metadata fetch-error diagnostics template');
  }
  if (!rendererText.includes('host: metadataHost,')) {
    throw new Error('missing renderer updater metadata host binding');
  }
  if (!rendererText.includes("http: metadataHttpStatus === null ? 'none' : String(metadataHttpStatus),")) {
    throw new Error('missing renderer updater metadata http-status binding');
  }
  if (!rendererText.includes("attempts: metadataAttemptCount === null ? 'unknown' : String(metadataAttemptCount),")) {
    throw new Error('missing renderer updater metadata attempt-count binding');
  }
  if (!rendererText.includes("if (metadataStatus && metadataStatus !== 'manifest_missing' && metadataStatus !== 'fetch_error') {")) {
    throw new Error('missing renderer updater metadata unknown-status fallback branch');
  }
  if (!rendererText.includes("'xrayUpdateMetaHintUnknownStatus',")) {
    throw new Error('missing renderer updater metadata unknown-status i18n key binding');
  }
  if (!rendererText.includes("'Metadata hint: status={status}, route={route}, host={host}, http={http}, attempts={attempts}.',")) {
    throw new Error('missing renderer updater metadata unknown-status diagnostics template');
  }
  if (!rendererText.includes('status: metadataStatus,')) {
    throw new Error('missing renderer updater metadata unknown-status binding');
  }
  if (!rendererText.includes("if (fallbackAttempted && fallbackResult === 'failed') {")) {
    throw new Error('missing renderer updater metadata route-hint both-failed branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaRouteHintBothFailed', 'Route hint: both direct and proxy metadata routes failed. Retry later.');")) {
    throw new Error('missing renderer updater metadata route-hint both-failed text binding');
  }
  if (!rendererText.includes("if (fallbackAttempted && fallbackResult === 'succeeded') {")) {
    throw new Error('missing renderer updater metadata route-hint fallback-succeeded branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaRouteHintFallbackSucceeded', 'Route hint: fallback metadata route succeeded; keep this route for retries.');")) {
    throw new Error('missing renderer updater metadata route-hint fallback-succeeded text binding');
  }
  if (!rendererText.includes("if (retryableError === false) {")) {
    throw new Error('missing renderer updater metadata route-hint non-retryable branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaRouteHintNonRetryable', 'Route hint: metadata error is non-retryable; wait and retry later.');")) {
    throw new Error('missing renderer updater metadata route-hint non-retryable text binding');
  }
  if (!rendererText.includes("const metadataRouteForHint = (metadataRoute === 'direct' || metadataRoute === 'proxy')")) {
    throw new Error('missing renderer updater metadata route-hint source resolver');
  }
  if (!rendererText.includes("if (retryableError === true && metadataRouteForHint === 'direct') {")) {
    throw new Error('missing renderer updater metadata route-hint try-proxy branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaRouteHintTryProxy', 'Route hint: try proxy metadata route on next retry.');")) {
    throw new Error('missing renderer updater metadata route-hint try-proxy text binding');
  }
  if (!rendererText.includes("if (retryableError === true && metadataRouteForHint === 'proxy') {")) {
    throw new Error('missing renderer updater metadata route-hint try-direct branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaRouteHintTryDirect', 'Route hint: try direct metadata route on next retry.');")) {
    throw new Error('missing renderer updater metadata route-hint try-direct text binding');
  }
  if (!rendererText.includes("if (retryableError === true && metadataRouteForHint === 'unknown' && attemptFlow === 'direct_only') {")) {
    throw new Error('missing renderer updater metadata route-hint direct-only flow fallback branch');
  }
  if (!rendererText.includes("if (retryableError === true && metadataRouteForHint === 'unknown' && attemptFlow === 'direct_then_proxy') {")) {
    throw new Error('missing renderer updater metadata route-hint ambiguous flow branch');
  }
  if (!rendererText.includes("return tText('xrayUpdateMetaRouteHintFlowAmbiguous', 'Route hint: metadata attempt flow is ambiguous; retry update check later.');")) {
    throw new Error('missing renderer updater metadata route-hint ambiguous flow text binding');
  }
  if (!rendererText.includes('if (routeSuggestion) return `${baseHint} ${routeSuggestion}`;')) {
    throw new Error('missing renderer updater metadata route-hint append binding');
  }
  if (!rendererText.includes("case 'XRAY_UPDATE_NETWORK_TIMEOUT':")) {
    throw new Error('missing renderer updater timeout next-step mapping');
  }
  if (!rendererText.includes("return tText('xrayUpdateNextStepTimeout', 'Next step: verify network connectivity and retry update.');")) {
    throw new Error('missing renderer updater timeout next-step text binding');
  }
  if (!rendererText.includes("return tText('xrayUpdateNextStepGeneric', 'Next step: retry update in a stable network environment.');")) {
    throw new Error('missing renderer updater generic next-step text binding');
  }
  if (!rendererText.includes('const nextStep = resolveXrayUpdateNextStepMessage(errorCode, failureStage);')) {
    throw new Error('missing renderer updater next-step composition binding');
  }
  if (!rendererText.includes('const metadataHint = formatXrayUpdateMetadataHint(updatePayload);')) {
    throw new Error('missing renderer updater formatted metadata-hint composition binding');
  }
  if (!rendererText.includes('if (metadataHint) detailParts.push(metadataHint);')) {
    throw new Error('missing renderer updater metadata-hint detail-line binding');
  }
  if (!rendererText.includes('if (detailLine) return `${headline}\\n${nextStep}\\n${detailLine}`;')) {
    throw new Error('missing renderer updater multiline detail composition binding');
  }
  if (!rendererText.includes('return `${headline}\\n${nextStep}`;')) {
    throw new Error('missing renderer updater headline+next-step fallback composition binding');
  }
  if (!rendererText.includes('if (errorCode) metaTokens.push(`[${errorCode}]`);')) {
    throw new Error('missing renderer updater error-code meta token binding');
  }
  if (!rendererText.includes('if (failureStage) metaTokens.push(`[stage:${failureStage}]`);')) {
    throw new Error('missing renderer updater failure-stage meta token binding');
  }
  if (!rendererText.includes('showAlert(composeXrayUpdateErrorMessage(updatePayload));')) {
    throw new Error('missing renderer updater composed error alert binding');
  }
  if (!rendererText.includes('if (updateSuccess) showToast(t(\'updateDownloaded\') || \'Downloaded\', 1800);')) {
    throw new Error('missing renderer updater success toast binding');
  }

  // 10.5) Runtime metadata-hint/severity behavior assertions (not only static string checks)
  const errorMessageSource = extractBlockBetween(
    rendererText,
    'function resolveXrayUpdateErrorMessage(errorCode, failureStage) {',
    'function resolveXrayUpdateNextStepMessage(errorCode, failureStage) {',
    'renderer error-message function'
  );
  const nextStepSource = extractBlockBetween(
    rendererText,
    'function resolveXrayUpdateNextStepMessage(errorCode, failureStage) {',
    'function resolveXrayUpdateMetadataHint(updatePayload) {',
    'renderer next-step function'
  );
  const metadataHintSource = extractBlockBetween(
    rendererText,
    'function resolveXrayUpdateMetadataHint(updatePayload) {',
    'function resolveXrayUpdateMetadataSeverity(updatePayload) {',
    'renderer metadata-hint function'
  );
  const metadataSeveritySource = extractBlockBetween(
    rendererText,
    'function resolveXrayUpdateMetadataSeverity(updatePayload) {',
    'function formatXrayUpdateMetadataHint(updatePayload) {',
    'renderer metadata-severity function'
  );
  const metadataFormatSource = extractBlockBetween(
    rendererText,
    'function formatXrayUpdateMetadataHint(updatePayload) {',
    'function composeXrayUpdateErrorMessage(updatePayload) {',
    'renderer metadata-format function'
  );
  const composeErrorSource = extractBlockBetween(
    rendererText,
    'function composeXrayUpdateErrorMessage(updatePayload) {',
    'async function checkUpdates() {',
    'renderer compose-error function'
  );
  const runtimeContext = {
    tText: (_key, fallback) => fallback,
    tFormat: (_key, template, vars = {}) => String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => (
      Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : match
    )),
  };
  vm.createContext(runtimeContext);
  const runtimeScript = [
    errorMessageSource,
    nextStepSource,
    metadataHintSource,
    metadataSeveritySource,
    metadataFormatSource,
    composeErrorSource,
    'globalThis.__updaterMetaFns = {',
    '  resolveXrayUpdateErrorMessage,',
    '  resolveXrayUpdateNextStepMessage,',
    '  resolveXrayUpdateMetadataHint,',
    '  resolveXrayUpdateMetadataSeverity,',
    '  formatXrayUpdateMetadataHint,',
    '  composeXrayUpdateErrorMessage,',
    '};',
  ].join('\n');
  new vm.Script(runtimeScript).runInContext(runtimeContext);
  const runtimeFns = runtimeContext.__updaterMetaFns;
  if (
    !runtimeFns
    || typeof runtimeFns.resolveXrayUpdateErrorMessage !== 'function'
    || typeof runtimeFns.resolveXrayUpdateNextStepMessage !== 'function'
    || typeof runtimeFns.resolveXrayUpdateMetadataHint !== 'function'
    || typeof runtimeFns.resolveXrayUpdateMetadataSeverity !== 'function'
    || typeof runtimeFns.formatXrayUpdateMetadataHint !== 'function'
    || typeof runtimeFns.composeXrayUpdateErrorMessage !== 'function'
  ) {
    throw new Error('missing runtime updater metadata function harness');
  }

  // fallback succeeded should take precedence and yield info (aligned with route-hint semantics)
  const fallbackSucceededPayload = {
    metadataFetchStatus: 'fetch_error',
    metadataFetchFallbackUsed: true,
    metadataFetchFallbackAttempted: true,
    metadataFetchFallbackResult: 'succeeded',
    metadataFetchErrorRetryable: false,
    metadataFetchRoute: 'direct',
    metadataFetchFailureRoute: 'direct',
    metadataFetchRouteHost: 'api.github.com',
    metadataFetchFailureHost: 'api.github.com',
    metadataFetchErrorCode: 'fetch_http',
    metadataFetchHttpStatus: 502,
    metadataFetchAttemptCount: 2,
  };
  const fallbackSucceededSeverity = runtimeFns.resolveXrayUpdateMetadataSeverity(fallbackSucceededPayload);
  if (fallbackSucceededSeverity !== 'info') {
    throw new Error(`unexpected metadata severity for fallback-succeeded payload: ${fallbackSucceededSeverity}`);
  }
  const fallbackSucceededFormatted = runtimeFns.formatXrayUpdateMetadataHint(fallbackSucceededPayload);
  assertContainsToken('fallback-succeeded metadata hint', fallbackSucceededFormatted, '[info]');
  assertContainsToken('fallback-succeeded metadata hint', fallbackSucceededFormatted, 'host=api.github.com');
  assertContainsToken('fallback-succeeded metadata hint', fallbackSucceededFormatted, 'http=502');
  assertContainsToken('fallback-succeeded metadata hint', fallbackSucceededFormatted, 'attempts=2');
  assertContainsToken('fallback-succeeded metadata hint', fallbackSucceededFormatted, 'fallback metadata route succeeded');

  // non-retryable without fallback success should stay block
  const nonRetryablePayload = {
    metadataFetchStatus: 'fetch_error',
    metadataFetchFallbackUsed: false,
    metadataFetchFallbackAttempted: false,
    metadataFetchFallbackResult: 'not_attempted',
    metadataFetchErrorRetryable: false,
    metadataFetchRoute: 'proxy',
    metadataFetchFailureRoute: 'proxy',
    metadataFetchRouteHost: 'gh-proxy.com',
    metadataFetchFailureHost: 'gh-proxy.com',
    metadataFetchErrorCode: 'fetch_network',
    metadataFetchHttpStatus: null,
    metadataFetchAttemptCount: 1,
  };
  const nonRetryableSeverity = runtimeFns.resolveXrayUpdateMetadataSeverity(nonRetryablePayload);
  if (nonRetryableSeverity !== 'block') {
    throw new Error(`unexpected metadata severity for non-retryable payload: ${nonRetryableSeverity}`);
  }
  const nonRetryableFormatted = runtimeFns.formatXrayUpdateMetadataHint(nonRetryablePayload);
  assertContainsToken('non-retryable metadata hint', nonRetryableFormatted, '[block]');
  assertContainsToken('non-retryable metadata hint', nonRetryableFormatted, 'host=gh-proxy.com');
  assertContainsToken('non-retryable metadata hint', nonRetryableFormatted, 'http=none');
  assertContainsToken('non-retryable metadata hint', nonRetryableFormatted, 'attempts=1');
  assertContainsToken('non-retryable metadata hint', nonRetryableFormatted, 'metadata error is non-retryable');

  // unknown status should no longer be silent and should remain warn severity
  const unknownStatusPayload = {
    metadataFetchStatus: 'unknown',
    metadataFetchRoute: 'direct',
    metadataFetchRouteHost: 'api.github.com',
    metadataFetchHttpStatus: 304,
    metadataFetchAttemptCount: 1,
  };
  const unknownStatusSeverity = runtimeFns.resolveXrayUpdateMetadataSeverity(unknownStatusPayload);
  if (unknownStatusSeverity !== 'warn') {
    throw new Error(`unexpected metadata severity for unknown-status payload: ${unknownStatusSeverity}`);
  }
  const unknownStatusFormatted = runtimeFns.formatXrayUpdateMetadataHint(unknownStatusPayload);
  assertContainsToken('unknown-status metadata hint', unknownStatusFormatted, '[warn]');
  assertContainsToken('unknown-status metadata hint', unknownStatusFormatted, 'status=unknown');
  assertContainsToken('unknown-status metadata hint', unknownStatusFormatted, 'route=direct');
  assertContainsToken('unknown-status metadata hint', unknownStatusFormatted, 'host=api.github.com');
  assertContainsToken('unknown-status metadata hint', unknownStatusFormatted, 'http=304');
  assertContainsToken('unknown-status metadata hint', unknownStatusFormatted, 'attempts=1');

  // ok status remains silent info
  const okPayload = { metadataFetchStatus: 'ok' };
  if (runtimeFns.resolveXrayUpdateMetadataHint(okPayload) !== '') {
    throw new Error('expected metadata hint to be empty for ok status');
  }
  if (runtimeFns.resolveXrayUpdateMetadataSeverity(okPayload) !== 'info') {
    throw new Error('expected metadata severity info for ok status');
  }
  if (runtimeFns.formatXrayUpdateMetadataHint(okPayload) !== '') {
    throw new Error('expected formatted metadata hint to be empty for ok status');
  }

  // 10.6) Runtime compose message assertions (headline/next-step/detail assembly)
  const composeFullPayload = {
    errorCode: 'XRAY_UPDATE_HTTP_ERROR',
    failureStage: 'download_asset',
    error: 'Download failed: HTTP 502',
    metadataFetchStatus: 'fetch_error',
    metadataFetchRoute: 'direct',
    metadataFetchRouteHost: 'api.github.com',
    metadataFetchFailureRoute: 'direct',
    metadataFetchFailureHost: 'api.github.com',
    metadataFetchErrorCode: 'fetch_http',
    metadataFetchErrorRetryable: true,
    metadataFetchHttpStatus: 502,
    metadataFetchAttemptCount: 2,
    metadataFetchFallbackUsed: false,
    metadataFetchFallbackAttempted: true,
    metadataFetchFallbackResult: 'failed',
    metadataFetchAttemptFlow: 'direct_then_proxy',
  };
  const composeFullMessage = runtimeFns.composeXrayUpdateErrorMessage(composeFullPayload);
  const composeFullLines = String(composeFullMessage || '').split('\n');
  if (composeFullLines.length !== 3) {
    throw new Error(`unexpected compose line count for full payload: ${composeFullLines.length}`);
  }
  assertContainsToken('compose full headline', composeFullLines[0], 'Download failed due to upstream HTTP error.');
  assertContainsToken('compose full next-step', composeFullLines[1], 'Next step: retry later or switch network route, then run update again.');
  const composeDetailLine = composeFullLines[2];
  assertContainsToken('compose full detail', composeDetailLine, '[block]');
  assertContainsToken('compose full detail', composeDetailLine, 'Metadata hint: route=direct');
  assertContainsToken('compose full detail', composeDetailLine, 'fallback=not_used');
  assertContainsToken('compose full detail', composeDetailLine, 'both direct and proxy metadata routes failed');
  assertContainsToken('compose full detail', composeDetailLine, '[XRAY_UPDATE_HTTP_ERROR]');
  assertContainsToken('compose full detail', composeDetailLine, '[stage:download_asset]');
  assertContainsToken('compose full detail', composeDetailLine, 'Download failed: HTTP 502');
  const detailMetaHintIdx = composeDetailLine.indexOf('[block]');
  const detailCodeIdx = composeDetailLine.indexOf('[XRAY_UPDATE_HTTP_ERROR]');
  const detailStageIdx = composeDetailLine.indexOf('[stage:download_asset]');
  const detailRawIdx = composeDetailLine.indexOf('Download failed: HTTP 502');
  if (detailMetaHintIdx === -1 || detailCodeIdx === -1 || detailStageIdx === -1 || detailRawIdx === -1) {
    throw new Error('missing compose detail token indexes');
  }
  if (!(detailMetaHintIdx < detailCodeIdx && detailCodeIdx < detailStageIdx && detailStageIdx < detailRawIdx)) {
    throw new Error('unexpected compose detail token order (expected metadata -> code/stage -> raw error)');
  }

  const composeTwoLineMessage = runtimeFns.composeXrayUpdateErrorMessage({});
  const composeTwoLineLines = String(composeTwoLineMessage || '').split('\n');
  if (composeTwoLineLines.length !== 2) {
    throw new Error(`unexpected compose line count for empty payload: ${composeTwoLineLines.length}`);
  }
  assertContainsToken('compose two-line headline', composeTwoLineLines[0], 'Update failed');
  assertContainsToken('compose two-line next-step', composeTwoLineLines[1], 'Next step: retry update in a stable network environment.');

  const composeMetadataOnlyMessage = runtimeFns.composeXrayUpdateErrorMessage({
    metadataFetchStatus: 'manifest_missing',
  });
  const composeMetadataOnlyLines = String(composeMetadataOnlyMessage || '').split('\n');
  if (composeMetadataOnlyLines.length !== 3) {
    throw new Error(`unexpected compose line count for metadata-only payload: ${composeMetadataOnlyLines.length}`);
  }
  assertContainsToken('compose metadata-only detail', composeMetadataOnlyLines[2], '[info] Metadata hint:');
  if (composeMetadataOnlyLines[2].includes('[XRAY_UPDATE_') || composeMetadataOnlyLines[2].includes('[stage:')) {
    throw new Error('metadata-only compose detail should not include updater code/stage tokens');
  }

  const composeUnknownStatusPayload = {
    errorCode: 'XRAY_UPDATE_HTTP_ERROR',
    failureStage: 'download_asset',
    error: 'Download failed: HTTP 502',
    metadataFetchStatus: 'unknown',
    metadataFetchRoute: 'direct',
    metadataFetchRouteHost: 'api.github.com',
    metadataFetchHttpStatus: 304,
    metadataFetchAttemptCount: 1,
  };
  const composeUnknownStatusMessage = runtimeFns.composeXrayUpdateErrorMessage(composeUnknownStatusPayload);
  const composeUnknownStatusLines = String(composeUnknownStatusMessage || '').split('\n');
  if (composeUnknownStatusLines.length !== 3) {
    throw new Error(`unexpected compose line count for unknown-status payload: ${composeUnknownStatusLines.length}`);
  }
  const composeUnknownStatusDetail = composeUnknownStatusLines[2];
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, '[warn]');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, 'Metadata hint: status=unknown');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, 'route=direct');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, 'host=api.github.com');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, 'http=304');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, 'attempts=1');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, '[XRAY_UPDATE_HTTP_ERROR]');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, '[stage:download_asset]');
  assertContainsToken('compose unknown-status detail', composeUnknownStatusDetail, 'Download failed: HTTP 502');
  const unknownDetailMetaIdx = composeUnknownStatusDetail.indexOf('[warn]');
  const unknownDetailCodeIdx = composeUnknownStatusDetail.indexOf('[XRAY_UPDATE_HTTP_ERROR]');
  const unknownDetailStageIdx = composeUnknownStatusDetail.indexOf('[stage:download_asset]');
  const unknownDetailRawIdx = composeUnknownStatusDetail.indexOf('Download failed: HTTP 502');
  if (unknownDetailMetaIdx === -1 || unknownDetailCodeIdx === -1 || unknownDetailStageIdx === -1 || unknownDetailRawIdx === -1) {
    throw new Error('missing unknown-status compose detail token indexes');
  }
  if (!(unknownDetailMetaIdx < unknownDetailCodeIdx && unknownDetailCodeIdx < unknownDetailStageIdx && unknownDetailStageIdx < unknownDetailRawIdx)) {
    throw new Error('unexpected unknown-status compose detail token order (expected metadata -> code/stage -> raw error)');
  }

  if (!mainText.includes('function collectXrayBinaryCandidates(dir, bucket = [])')) {
    throw new Error('missing xray binary candidate collector');
  }
  if (!mainText.includes('Multiple Xray binaries found in package')) {
    throw new Error('missing xray binary ambiguity guard');
  }
  if (!mainText.includes('Resolved Xray binary escapes extracted directory')) {
    throw new Error('missing resolved binary path escape guard');
  }
  if (!mainText.includes('const realXrayBinary = fs.realpathSync(xrayBinary);')) {
    throw new Error('missing xray binary realpath resolution');
  }
  if (!mainText.includes('async function installXrayBinaryWithRollback(sourceBinaryPath, options = {})')) {
    throw new Error('missing xray install rollback helper');
  }
  if (!mainText.includes('const stagePath = `${BIN_PATH}.new`;')) {
    throw new Error('missing staged install path');
  }
  if (!mainText.includes('fs.copyFileSync(sourcePath, stagePath);')) {
    throw new Error('missing staged copy before install');
  }
  if (!mainText.includes('fs.renameSync(stagePath, BIN_PATH);')) {
    throw new Error('missing staged atomic rename into BIN_PATH');
  }
  if (!mainText.includes('fs.renameSync(BIN_PATH, backupPath);')) {
    throw new Error('missing backup rename before install');
  }
  if (!mainText.includes('fs.renameSync(backupPath, BIN_PATH);')) {
    throw new Error('missing rollback restore rename');
  }
  if (!mainText.includes('const sourceSha = sha256FileHex(sourcePath);')) {
    throw new Error('missing source binary sha256 capture');
  }
  if (!mainText.includes('const installedSha = sha256FileHex(BIN_PATH);')) {
    throw new Error('missing installed binary sha256 capture');
  }
  if (!mainText.includes('Installed Xray binary sha256 mismatch')) {
    throw new Error('missing post-install sha256 mismatch guard');
  }
  if (!mainText.includes('getXrayVersionFromBinary(BIN_PATH)')) {
    throw new Error('missing post-install xray version probe');
  }
  if (!mainText.includes('Installed Xray binary version mismatch')) {
    throw new Error('missing post-install version mismatch guard');
  }
  if (!mainText.includes('await installXrayBinaryWithRollback(realXrayBinary, { expectedVersion: remoteVer });')) {
    throw new Error('missing rollback-protected install invocation');
  }

  // 9) main-process GitHub API fetchJson should be bounded + allowlisted
  if (!mainText.includes('const GITHUB_API_MAX_REDIRECTS = 5;')) {
    throw new Error('missing main-process github api max-redirects constant');
  }
  if (!mainText.includes('const GITHUB_API_MAX_BYTES = 1 * 1024 * 1024;')) {
    throw new Error('missing main-process github api max-bytes constant');
  }
  if (!mainText.includes('const GITHUB_API_TIMEOUT_MS = 10_000;')) {
    throw new Error('missing main-process github api timeout constant');
  }
  if (!mainText.includes('function validateGitHubApiUrlOrThrow(inputUrl)')) {
    throw new Error('missing main-process github api url validator');
  }
  if (!mainText.includes("'/repos/XTLS/Xray-core/releases/latest'")) {
    throw new Error('missing main-process github api allowlisted xray endpoint');
  }
  if (!mainText.includes("'/repos/EchoHS/GeekezBrowser/releases/latest'")) {
    throw new Error('missing main-process github api allowlisted app endpoint');
  }
  if (!/async function fetchGitHubApiJsonWithRoute\(/.test(mainText)) {
    throw new Error('missing async main-process fetchGitHubApiJsonWithRoute');
  }
  if (!/async function fetchJson\(/.test(mainText)) {
    throw new Error('missing async main-process fetchJson');
  }
  if (!mainText.includes('const urlObj = validateGitHubApiUrlOrThrow(currentUrl);')) {
    throw new Error('missing main-process fetchJson url validation usage');
  }
  if (!mainText.includes('const redirectStatus = new Set([301, 302, 303, 307, 308]);')) {
    throw new Error('missing main-process fetchJson redirect status allowlist');
  }
  if (!mainText.includes('const nextUrl = new URL(location, urlObj).toString();')) {
    throw new Error('missing main-process fetchJson relative redirect resolution');
  }
  if (!mainText.includes('contentLength > 0 && contentLength > GITHUB_API_MAX_BYTES')) {
    throw new Error('missing main-process fetchJson content-length precheck cap');
  }
  if (!mainText.includes('receivedBytes > GITHUB_API_MAX_BYTES')) {
    throw new Error('missing main-process fetchJson streaming response cap');
  }

  // 10) main-process fetchJson should have gh-proxy fallback for network/timeout errors
  if (!mainText.includes('function isRetryableGitHubApiNetworkError(err)')) {
    throw new Error('missing main-process github api retryable error helper');
  }
  if (!mainText.includes('async function fetchGitHubApiJsonOnce(url)')) {
    throw new Error('missing main-process github api single-attempt helper');
  }
  if (!mainText.includes('const data = await fetchGitHubApiJsonOnce(directUrl);')) {
    throw new Error('missing main-process github api direct-route fetch binding');
  }
  if (!mainText.includes("fallbackResult: 'not_attempted',")) {
    throw new Error('missing main-process github api direct-route metadata return');
  }
  if (!mainText.includes("attemptFlow: 'direct_only',")) {
    throw new Error('missing main-process github api direct-route attempt-flow return');
  }
  if (!mainText.includes('attemptCount: 1,')) {
    throw new Error('missing main-process github api direct-route attempt-count return');
  }
  if (!mainText.includes("if (directHost !== 'api.github.com') throw directErr;")) {
    throw new Error('missing main-process github api direct-host fallback gate');
  }
  if (!mainText.includes('if (!isRetryableGitHubApiNetworkError(directErr)) throw directErr;')) {
    throw new Error('missing main-process github api retryable fallback gate');
  }
  if (!mainText.includes('const proxyUrl = `https://gh-proxy.com/${directUrl}`;')) {
    throw new Error('missing main-process github api gh-proxy fallback url');
  }
  if (!mainText.includes('const data = await fetchGitHubApiJsonOnce(proxyUrl);')) {
    throw new Error('missing main-process github api proxy-route fetch binding');
  }
  if (!mainText.includes("fallbackResult: 'succeeded',")) {
    throw new Error('missing main-process github api gh-proxy fallback invocation');
  }
  if (!mainText.includes("attemptFlow: 'direct_then_proxy',")) {
    throw new Error('missing main-process github api gh-proxy attempt-flow return');
  }
  if (!mainText.includes('attemptCount: 2,')) {
    throw new Error('missing main-process github api gh-proxy attempt-count return');
  }
  if (!mainText.includes('const result = await fetchGitHubApiJsonWithRoute(url);')) {
    throw new Error('missing main-process fetchJson route-helper invocation');
  }
  if (!mainText.includes('return result.data;')) {
    throw new Error('missing main-process fetchJson route-helper unwrap');
  }
  if (!mainText.includes('async function fetchLatestXrayReleaseWithRoute()')) {
    throw new Error('missing main-process xray release route helper');
  }
  if (!mainText.includes("return await fetchGitHubApiJsonWithRoute('https://api.github.com/repos/XTLS/Xray-core/releases/latest');")) {
    throw new Error('missing main-process xray release route helper binding');
  }
  if (!mainText.includes("let releaseMetadataRouteUrl = 'https://api.github.com/repos/XTLS/Xray-core/releases/latest';")) {
    throw new Error('missing main-process xray metadata route seed');
  }
  if (!mainText.includes('const releaseFetch = await fetchLatestXrayReleaseWithRoute();')) {
    throw new Error('missing main-process xray metadata route helper usage');
  }
  if (!mainText.includes('releaseMetadataRouteUrl = (releaseFetch && releaseFetch.routeUrl) ? releaseFetch.routeUrl : releaseMetadataRouteUrl;')) {
    throw new Error('missing main-process xray metadata route propagation');
  }
  if (!mainText.includes('const preferDirectDownloadRoute = (() => {')) {
    throw new Error('missing main-process xray metadata route selector');
  }
  if (!mainText.includes("return new URL(releaseMetadataRouteUrl).hostname === 'api.github.com';")) {
    throw new Error('missing main-process xray metadata route direct-host check');
  }

  // 11) setup installer should use strict digest parsing + per-flow budgets
  const setupText = await fs.readFile(path.join(process.cwd(), 'setup.js'), 'utf8');
  if (!setupText.includes('parseSha256DigestForAsset')) {
    throw new Error('missing setup digest parser dependency');
  }
  if (!setupText.includes('function digestContainsNamedAssets(text)')) {
    throw new Error('missing setup digest named-asset detector');
  }
  if (!setupText.includes('if (digestContainsNamedAssets(text)) return null;')) {
    throw new Error('missing setup digest conditional fallback guard');
  }
  if (!setupText.includes('const XRAY_SETUP_ZIP_MAX_BYTES = 100 * 1024 * 1024;')) {
    throw new Error('missing setup xray zip max-bytes constant');
  }
  if (!setupText.includes('const XRAY_SETUP_EXTRACT_MAX_ENTRIES = 200;')) {
    throw new Error('missing setup xray extract max-entries constant');
  }
  if (!setupText.includes('const XRAY_SETUP_EXTRACT_MAX_BYTES = 140 * 1024 * 1024;')) {
    throw new Error('missing setup xray extract max-bytes constant');
  }
  if (!setupText.includes('const XRAY_SETUP_DGST_MAX_BYTES = 1 * 1024 * 1024;')) {
    throw new Error('missing setup xray digest max-bytes constant');
  }
  if (!setupText.includes("await downloadFileWithFallback(primaryXrayZipUrl, fallbackXrayZipUrl, zipPath, 'Xray Core', { maxBytes: XRAY_SETUP_ZIP_MAX_BYTES });")) {
    throw new Error('missing setup xray zip download max-bytes usage');
  }
  if (!setupText.includes("await downloadFileWithFallback(primaryXrayDgstUrl, fallbackXrayDgstUrl, dgstPath, 'Xray Digest', { maxBytes: XRAY_SETUP_DGST_MAX_BYTES });")) {
    throw new Error('missing setup xray digest download max-bytes usage');
  }
  if (!setupText.includes('const expectedSha = parseSha256FromDgstText(dgstText, xrayAsset);')) {
    throw new Error('missing setup asset-scoped digest parse usage');
  }
  if (
    !/extractZip\(zipPath,\s*BIN_DIR,\s*\{[\s\S]*maxEntries:\s*XRAY_SETUP_EXTRACT_MAX_ENTRIES,[\s\S]*maxUncompressedBytes:\s*XRAY_SETUP_EXTRACT_MAX_BYTES,[\s\S]*\}\);/.test(
      setupText
    )
  ) {
    throw new Error('missing setup xray unzip budget usage');
  }

  // 10) setup should harden GitHub API version fetch (allowlist + redirect limit + response cap)
  if (!setupText.includes('const XRAY_SETUP_API_MAX_REDIRECTS = 5;')) {
    throw new Error('missing setup api max-redirects constant');
  }
  if (!setupText.includes('const XRAY_SETUP_API_MAX_BYTES = 1 * 1024 * 1024;')) {
    throw new Error('missing setup api max-bytes constant');
  }
  if (!setupText.includes('const XRAY_SETUP_API_TIMEOUT_MS = 10_000;')) {
    throw new Error('missing setup api timeout constant');
  }
  if (!setupText.includes('function validateXrayApiUrlOrThrow(inputUrl)')) {
    throw new Error('missing setup xray api url validator');
  }
  if (!setupText.includes("const allowedPathPrefix = '/repos/XTLS/Xray-core/';")) {
    throw new Error('missing setup api path allowlist prefix');
  }
  if (!/async function getLatestXrayVersionWithRoute\(/.test(setupText)) {
    throw new Error('missing async setup getLatestXrayVersionWithRoute');
  }
  if (!setupText.includes('const urlObj = validateXrayApiUrlOrThrow(currentUrl);')) {
    throw new Error('missing setup api url validation usage');
  }
  if (!setupText.includes('const redirectStatus = new Set([301, 302, 303, 307, 308]);')) {
    throw new Error('missing setup api redirect status allowlist');
  }
  if (!setupText.includes('const nextUrl = new URL(location, urlObj).toString();')) {
    throw new Error('missing setup relative redirect resolution');
  }
  if (!setupText.includes('contentLength > 0 && contentLength > XRAY_SETUP_API_MAX_BYTES')) {
    throw new Error('missing setup api content-length precheck cap');
  }
  if (!setupText.includes('receivedBytes > XRAY_SETUP_API_MAX_BYTES')) {
    throw new Error('missing setup api streaming response cap');
  }

  // 12) setup getLatestXrayVersion route helper should fallback between direct and gh-proxy for network/timeout errors
  if (!setupText.includes('function isRetryableXrayApiNetworkError(err)')) {
    throw new Error('missing setup api retryable error helper');
  }
  if (!setupText.includes('async function fetchLatestXrayVersionOnce(startUrl)')) {
    throw new Error('missing setup api single-attempt helper');
  }
  if (!setupText.includes('const tag = await fetchLatestXrayVersionOnce(primary);')) {
    throw new Error('missing setup api primary route invocation');
  }
  if (!setupText.includes('if (!isRetryableXrayApiNetworkError(err)) throw err;')) {
    throw new Error('missing setup api retryable fallback gate');
  }
  if (!setupText.includes('const tag = await fetchLatestXrayVersionOnce(fallback);')) {
    throw new Error('missing setup api fallback route invocation');
  }
  if (!setupText.includes('return { tag, routeUrl: primary };')) {
    throw new Error('missing setup api primary route return metadata');
  }
  if (!setupText.includes('return { tag, routeUrl: fallback };')) {
    throw new Error('missing setup api fallback route return metadata');
  }
  if (!setupText.includes('const result = await getLatestXrayVersionWithRoute(useProxy);')) {
    throw new Error('missing setup api route-helper wrapper invocation');
  }
  if (!setupText.includes('return result.tag;')) {
    throw new Error('missing setup api route-helper wrapper tag return');
  }
  if (!setupText.includes('let xrayVersionRouteUrl = isGlobal ? XRAY_API_URL : (GH_PROXY + XRAY_API_URL);')) {
    throw new Error('missing setup api-route affinity seed');
  }
  if (!setupText.includes('const latestXray = await getLatestXrayVersionWithRoute(!isGlobal);')) {
    throw new Error('missing setup api-route affinity fetch usage');
  }
  if (!setupText.includes('xrayVersionRouteUrl = latestXray.routeUrl || xrayVersionRouteUrl;')) {
    throw new Error('missing setup api-route affinity route propagation');
  }
  if (!setupText.includes('const preferDirectDownloadRoute = (() => {')) {
    throw new Error('missing setup api-route affinity route selector');
  }
  if (!setupText.includes("return new URL(xrayVersionRouteUrl).hostname === 'api.github.com';")) {
    throw new Error('missing setup api-route affinity direct host check');
  }
  if (!setupText.includes('const primaryXrayZipUrl = preferDirectDownloadRoute ? directXrayZipUrl : proxyXrayZipUrl;')) {
    throw new Error('missing setup api-route affinity zip primary binding');
  }
  if (!setupText.includes('const fallbackXrayZipUrl = preferDirectDownloadRoute ? proxyXrayZipUrl : directXrayZipUrl;')) {
    throw new Error('missing setup api-route affinity zip fallback binding');
  }

  // 13) setup zip/dgst downloads should fallback direct<->gh-proxy on retryable network/timeout errors
  if (!setupText.includes('function isRetryableXrayDownloadNetworkError(err)')) {
    throw new Error('missing setup download retryable error helper');
  }
  if (!setupText.includes('async function downloadFileWithFallback(primaryUrl, fallbackUrl, dest, label = \'Downloading\', options = {})')) {
    throw new Error('missing setup download fallback helper');
  }
  if (!setupText.includes('if (!isRetryableXrayDownloadNetworkError(err)) throw err;')) {
    throw new Error('missing setup download retryable fallback gate');
  }
  if (!setupText.includes('return String(primaryUrl);')) {
    throw new Error('missing setup download primary-route return contract');
  }
  if (!setupText.includes('return String(fallbackUrl);')) {
    throw new Error('missing setup download fallback-route return contract');
  }
  if (!setupText.includes('const effectiveXrayZipUrl = await downloadFileWithFallback(primaryXrayZipUrl, fallbackXrayZipUrl, zipPath, \'Xray Core\', { maxBytes: XRAY_SETUP_ZIP_MAX_BYTES });')) {
    throw new Error('missing setup effective zip route binding');
  }
  if (!setupText.includes('const usedDirectRoute = (() => {')) {
    throw new Error('missing setup used-route detector');
  }
  if (!setupText.includes("return new URL(effectiveXrayZipUrl).hostname === 'github.com';")) {
    throw new Error('missing setup used-route direct host check');
  }
  if (!setupText.includes('const primaryXrayDgstUrl = `${usedDirectRoute ? directXrayZipUrl : proxyXrayZipUrl}.dgst`;')) {
    throw new Error('missing setup digest primary route wiring');
  }
  if (!setupText.includes('const fallbackXrayDgstUrl = `${usedDirectRoute ? proxyXrayZipUrl : directXrayZipUrl}.dgst`;')) {
    throw new Error('missing setup digest fallback route wiring');
  }
  console.log('[ok] updater security regression passed');
}

main().catch((e) => {
  console.error('[fail]', e && e.stack ? e.stack : e);
  process.exit(1);
});

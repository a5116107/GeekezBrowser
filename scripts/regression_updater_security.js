/* eslint-disable no-console */
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');

const { extractZip, isZipFileHeader, sha256FileHex } = require('../updateUtils');

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

  console.log('[ok] updater security regression passed');
}

main().catch((e) => {
  console.error('[fail]', e && e.stack ? e.stack : e);
  process.exit(1);
});


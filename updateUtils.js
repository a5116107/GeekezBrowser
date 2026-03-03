const fs = require('fs-extra');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const UPDATE_ALLOWED_DOWNLOAD_HOSTS = new Set([
  'gh-proxy.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
]);

const UPDATE_MAX_REDIRECTS = 5;
const UPDATE_MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024; // 200MB
const UPDATE_DOWNLOAD_TIMEOUT_MS = 60_000;
const UPDATE_MAX_ZIP_ENTRIES = 2000;

function parseHttpsUrlOrThrow(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Invalid URL');
  const u = new URL(input);
  if (u.protocol !== 'https:') throw new Error('Only https URLs are allowed');
  return u;
}

function getGhProxyTargetUrl(u) {
  if (!u || typeof u !== 'object' || u.hostname !== 'gh-proxy.com') return null;
  const raw = (u.pathname || '').replace(/^\/+/, '');
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('https://')) return null;
    return new URL(decoded);
  } catch (e) {
    return null;
  }
}

function assertAllowedUpdateUrl(u) {
  if (!u || typeof u !== 'object') throw new Error('Invalid URL');
  if (!UPDATE_ALLOWED_DOWNLOAD_HOSTS.has(u.hostname)) {
    throw new Error(`Download host not allowed: ${u.hostname}`);
  }

  // gh-proxy.com can proxy arbitrary URLs via path payloads like:
  //   https://gh-proxy.com/https://github.com/...
  // Enforce that the embedded target URL is also within our allowlist.
  if (u.hostname === 'gh-proxy.com') {
    const target = getGhProxyTargetUrl(u);
    if (!target) throw new Error('Invalid gh-proxy URL (missing target URL)');
    if (target.protocol !== 'https:') throw new Error('Only https proxy targets are allowed');
    if (target.hostname === 'gh-proxy.com') throw new Error('Nested gh-proxy targets are not allowed');
    if (!UPDATE_ALLOWED_DOWNLOAD_HOSTS.has(target.hostname)) {
      throw new Error(`Download host not allowed (proxy target): ${target.hostname}`);
    }
  }
}

function isZipFileHeader(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    // PK\x03\x04 (local), PK\x05\x06 (empty), PK\x07\x08 (spanned)
    return (
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
      (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08)
    );
  } catch (e) {
    return false;
  }
}

function sha256FileHex(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(64 * 1024);
  try {
    let bytesRead = 0;
    let pos = 0;
    // eslint-disable-next-line no-cond-assign
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, pos)) > 0) {
      hash.update(buf.subarray(0, bytesRead));
      pos += bytesRead;
    }
    return hash.digest('hex');
  } finally {
    try {
      fs.closeSync(fd);
    } catch (e) {}
  }
}

function downloadFile(url, dest, options = {}) {
  const maxRedirects = Number.isInteger(options.maxRedirects) ? options.maxRedirects : UPDATE_MAX_REDIRECTS;
  const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : UPDATE_MAX_DOWNLOAD_BYTES;
  const timeoutMs = Number.isInteger(options.timeoutMs) ? options.timeoutMs : UPDATE_DOWNLOAD_TIMEOUT_MS;
  const agent = options && options.agent ? options.agent : undefined;

  const destDir = path.dirname(dest);
  try {
    fs.ensureDirSync(destDir);
  } catch (e) {}

  const tmpPath = `${dest}.${Date.now()}.tmp`;

  const doRequest = (currentUrl, redirectsLeft) =>
    new Promise((resolve, reject) => {
      let resolvedUrl;
      try {
        resolvedUrl = parseHttpsUrlOrThrow(currentUrl);
        assertAllowedUpdateUrl(resolvedUrl);
      } catch (e) {
        reject(e);
        return;
      }

      const headers = { 'User-Agent': 'GeekEZ-Browser' };
      const req = https.get(resolvedUrl, { headers, agent }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          const nextUrl = new URL(res.headers.location, resolvedUrl).toString();
          res.resume();
          doRequest(nextUrl, redirectsLeft - 1).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          const err = new Error(`Download failed: HTTP ${res.statusCode}`);
          res.resume();
          reject(err);
          return;
        }

        const len = res.headers['content-length'];
        if (len && Number(len) > maxBytes) {
          const err = new Error(`Download too large: ${len} bytes`);
          res.resume();
          reject(err);
          return;
        }

        const file = fs.createWriteStream(tmpPath);
        let downloaded = 0;
        let finished = false;

        const cleanup = (err) => {
          if (finished) return;
          finished = true;
          try {
            file.close(() => {});
          } catch (e) {}
          try {
            fs.unlinkSync(tmpPath);
          } catch (e) {}
          reject(err);
        };

        const timer = setTimeout(() => {
          try {
            req.destroy(new Error('Download timeout'));
          } catch (e) {}
        }, timeoutMs);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (downloaded > maxBytes) {
            try {
              clearTimeout(timer);
            } catch (e) {}
            cleanup(new Error(`Download too large (>${maxBytes} bytes)`));
            try {
              req.destroy();
            } catch (e) {}
            try {
              res.destroy();
            } catch (e) {}
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          try {
            clearTimeout(timer);
          } catch (e) {}
          try {
            file.close(() => {});
          } catch (e) {}
          try {
            fs.renameSync(tmpPath, dest);
          } catch (e) {
            cleanup(e);
            return;
          }
          resolve();
        });

        file.on('error', (err) => {
          try {
            clearTimeout(timer);
          } catch (e) {}
          cleanup(err);
        });

        res.on('error', (err) => {
          try {
            clearTimeout(timer);
          } catch (e) {}
          cleanup(err);
        });
      });

      req.on('error', (err) => {
        try {
          fs.unlinkSync(tmpPath);
        } catch (e) {}
        reject(err);
      });
    });

  return doRequest(url, maxRedirects);
}

function validateUpdateDownloadUrl(url) {
  const u = parseHttpsUrlOrThrow(url);
  assertAllowedUpdateUrl(u);
  return u;
}

function normalizeDigestFileToken(input) {
  if (typeof input !== 'string') return '';
  let token = input.trim();
  if (!token) return '';
  token = token.replace(/^["']+|["']+$/g, '');
  token = token.replace(/^[*]+/, '');
  token = token.replace(/\\/g, '/');
  const parts = token.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

function parseSha256DigestForAsset(text, assetName = '') {
  if (typeof text !== 'string') return null;
  const targetAsset = normalizeDigestFileToken(String(assetName || ''));
  const candidates = [];
  const lines = text.split(/\r?\n/g);

  const pushCandidate = (hash, token = '') => {
    const normalizedHash = String(hash || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalizedHash)) return;
    candidates.push({
      hash: normalizedHash,
      file: normalizeDigestFileToken(String(token || '')),
    });
  };

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) continue;

    // OpenSSL style:
    // SHA2-256 (Xray-windows-64.zip) = <sha256>
    let match = line.match(/^SHA2?-?256\s*\(([^)]+)\)\s*=\s*([a-f0-9]{64})$/i);
    if (match) {
      pushCandidate(match[2], match[1]);
      continue;
    }

    // GNU sha256sum style:
    // <sha256>  Xray-windows-64.zip
    match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (match) {
      pushCandidate(match[1], match[2]);
      continue;
    }

    // Bare hash line:
    // SHA2-256=<sha256> or plain <sha256>
    match = line.match(/^SHA2?-?256\s*=\s*([a-f0-9]{64})$/i);
    if (match) {
      pushCandidate(match[1], '');
      continue;
    }
    match = line.match(/^([a-f0-9]{64})$/i);
    if (match) {
      pushCandidate(match[1], '');
      continue;
    }
  }

  if (candidates.length === 0) return null;

  const resolveUniqueHash = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const unique = new Set(rows.map((row) => row.hash).filter(Boolean));
    if (unique.size !== 1) return null;
    return Array.from(unique)[0];
  };

  if (targetAsset) {
    return resolveUniqueHash(candidates.filter((item) => item.file === targetAsset));
  }

  const namedRows = candidates.filter((item) => item.file);
  if (namedRows.length > 0) {
    return resolveUniqueHash(namedRows);
  }

  return resolveUniqueHash(candidates);
}

function isZipEntrySymlink(entry) {
  const rawAttr = entry && entry.attr !== undefined ? Number(entry.attr) : NaN;
  if (!Number.isFinite(rawAttr)) return false;
  const unixMode = ((rawAttr >>> 0) >>> 16) & 0xffff;
  const fileTypeBits = unixMode & 0o170000;
  return fileTypeBits === 0o120000;
}

function assertNoSymlinkInTargetPath(destRoot, targetPath, rawName) {
  const relative = path.relative(destRoot, targetPath);
  if (!relative || relative === '.' || relative.startsWith('..')) return;
  const parts = relative.split(path.sep).filter(Boolean);
  let cursor = destRoot;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) continue;
    let stats = null;
    try {
      stats = fs.lstatSync(cursor);
    } catch (e) {
      stats = null;
    }
    if (stats && typeof stats.isSymbolicLink === 'function' && stats.isSymbolicLink()) {
      throw new Error(`Zip-Slip blocked: symlink path entry (${rawName})`);
    }
  }
}

function getZipEntryCollisionKey(targetPath) {
  const normalizedPath = String(targetPath || '').replace(/\\/g, '/');
  if (process.platform === 'win32' || process.platform === 'darwin') {
    return normalizedPath.toLowerCase();
  }
  return normalizedPath;
}

function extractZip(zipPath, destDir, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const destRoot = path.resolve(destDir);
      const destPrefix = destRoot.endsWith(path.sep) ? destRoot : destRoot + path.sep;
      const seenTargetPaths = new Set();

      try {
        fs.ensureDirSync(destRoot);
      } catch (e) {}

      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries ? zip.getEntries() : [];
      if (!Array.isArray(entries)) throw new Error('Invalid zip entries');

      const maxEntries = Number.isInteger(options.maxEntries) ? options.maxEntries : UPDATE_MAX_ZIP_ENTRIES;
      const maxUncompressedBytes = Number.isFinite(options.maxUncompressedBytes)
        ? options.maxUncompressedBytes
        : UPDATE_MAX_DOWNLOAD_BYTES;

      if (entries.length > maxEntries) throw new Error('Zip contains too many entries');

      let totalBytes = 0;
      let totalDeclaredBytes = 0;
      for (const entry of entries) {
        const rawName = entry && entry.entryName ? String(entry.entryName) : '';
        const name = rawName.replace(/\\/g, '/');

        if (!name || name === '.') continue;
        if (name.includes('\0')) throw new Error(`Zip-Slip blocked: null byte entry (${rawName})`);
        if (name.startsWith('/') || name.startsWith('\\') || /^[a-zA-Z]:/.test(name)) {
          throw new Error(`Zip-Slip blocked: absolute path entry (${rawName})`);
        }
        if (isZipEntrySymlink(entry)) {
          throw new Error(`Zip-Slip blocked: symlink entry (${rawName})`);
        }

        const targetPath = path.resolve(destRoot, name);
        if (!(targetPath === destRoot || targetPath.startsWith(destPrefix))) {
          throw new Error(`Zip-Slip blocked: path traversal entry (${rawName})`);
        }
        const collisionKey = getZipEntryCollisionKey(targetPath);
        if (seenTargetPaths.has(collisionKey)) {
          throw new Error(`Zip-Slip blocked: duplicate path entry (${rawName})`);
        }
        seenTargetPaths.add(collisionKey);

        const isDir = !!entry.isDirectory || name.endsWith('/');
        if (!isDir && targetPath === destRoot) {
          throw new Error(`Zip-Slip blocked: invalid root file entry (${rawName})`);
        }
        assertNoSymlinkInTargetPath(destRoot, targetPath, rawName);
        if (isDir) {
          try {
            fs.ensureDirSync(targetPath);
          } catch (e) {}
          assertNoSymlinkInTargetPath(destRoot, targetPath, rawName);
          continue;
        }

        const declaredSize = Number(entry && entry.header && entry.header.size);
        if (Number.isFinite(declaredSize) && declaredSize > 0) {
          totalDeclaredBytes += declaredSize;
          if (declaredSize > maxUncompressedBytes || totalDeclaredBytes > maxUncompressedBytes) {
            throw new Error('Zip too large (uncompressed)');
          }
        }

        try {
          fs.ensureDirSync(path.dirname(targetPath));
        } catch (e) {}
        assertNoSymlinkInTargetPath(destRoot, path.dirname(targetPath), rawName);
        const data = entry.getData ? entry.getData() : null;
        if (!Buffer.isBuffer(data)) throw new Error(`Failed to read zip entry: ${rawName}`);
        totalBytes += data.length;
        if (totalBytes > maxUncompressedBytes) {
          throw new Error('Zip too large (uncompressed)');
        }
        fs.writeFileSync(targetPath, data);
      }

      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  UPDATE_ALLOWED_DOWNLOAD_HOSTS,
  UPDATE_MAX_REDIRECTS,
  UPDATE_MAX_DOWNLOAD_BYTES,
  UPDATE_DOWNLOAD_TIMEOUT_MS,
  UPDATE_MAX_ZIP_ENTRIES,
  downloadFile,
  extractZip,
  isZipFileHeader,
  parseSha256DigestForAsset,
  sha256FileHex,
  validateUpdateDownloadUrl,
};

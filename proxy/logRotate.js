const fs = require('fs-extra');
const path = require('path');

function getTimestamp() {
  // Keep sortable + filesystem-safe
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sanitizeToken(token) {
  return String(token || '').replace(/[^\w.-]+/g, '_');
}

async function rotateLogIfNeeded(logPath, options = {}) {
  const maxBytes = typeof options.maxBytes === 'number' ? options.maxBytes : 5 * 1024 * 1024; // 5MB
  const keep = typeof options.keep === 'number' ? options.keep : 5;
  const tag = sanitizeToken(options.tag);

  try {
    if (!logPath) return { rotated: false };
    if (!await fs.pathExists(logPath)) return { rotated: false };
    const stat = await fs.stat(logPath);
    if (stat.size <= maxBytes) return { rotated: false, size: stat.size };

    const dir = path.dirname(logPath);
    const base = path.basename(logPath, path.extname(logPath));
    const ext = path.extname(logPath) || '.log';
    const rotatedName = `${base}.${tag ? (tag + '.') : ''}${getTimestamp()}${ext}`;
    const rotatedPath = path.join(dir, rotatedName);

    await fs.move(logPath, rotatedPath, { overwrite: true });

    // Prune old rotated logs
    const files = (await fs.readdir(dir))
      .filter((f) => f.startsWith(base + '.') && f.endsWith(ext))
      .sort()
      .reverse();
    const toDelete = files.slice(keep);
    for (const f of toDelete) {
      try { await fs.remove(path.join(dir, f)); } catch (e) {}
    }

    return { rotated: true, rotatedPath };
  } catch (e) {
    return { rotated: false, error: e.message };
  }
}

module.exports = { rotateLogIfNeeded };

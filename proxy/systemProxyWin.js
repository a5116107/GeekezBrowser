const { execFile } = require('child_process');

function runReg(args) {
  return new Promise((resolve, reject) => {
    execFile('reg.exe', args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        const msg = (stderr || stdout || err.message || 'reg.exe failed').toString();
        reject(new Error(msg));
        return;
      }
      resolve((stdout || '').toString());
    });
  });
}

function normalizeHostPort(endpoint) {
  if (!endpoint) return null;
  const str = String(endpoint).trim();
  if (!str) return null;
  return str.replace(/^\w+:\/\//, '');
}

async function setSystemProxySocks({ endpoint, bypassList }) {
  const hp = normalizeHostPort(endpoint);
  if (!hp) throw new Error('system proxy endpoint is required');
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
  const proxyServer = `socks=${hp}`;
  const bypass = Array.isArray(bypassList) && bypassList.length > 0 ? bypassList.join(';') : '<local>';
  await runReg(['ADD', key, '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '1', '/f']);
  await runReg(['ADD', key, '/v', 'ProxyServer', '/t', 'REG_SZ', '/d', proxyServer, '/f']);
  await runReg(['ADD', key, '/v', 'ProxyOverride', '/t', 'REG_SZ', '/d', bypass, '/f']);
  return { enabled: true, proxyServer, proxyOverride: bypass };
}

async function clearSystemProxy() {
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
  await runReg(['ADD', key, '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '0', '/f']);
  return { enabled: false };
}

module.exports = {
  setSystemProxySocks,
  clearSystemProxy,
};


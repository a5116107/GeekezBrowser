/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function getEnv(name, fallback = '') {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  const root = process.cwd();
  const collectionPath = path.join(root, 'docs', 'postman', 'GeekEZ_Cookie_API.postman_collection.json');
  const envTemplatePath = path.join(root, 'docs', 'postman', 'GeekEZ_Local.postman_environment.json');

  if (!fs.existsSync(collectionPath)) {
    throw new Error(`collection not found: ${collectionPath}`);
  }
  if (!fs.existsSync(envTemplatePath)) {
    throw new Error(`environment template not found: ${envTemplatePath}`);
  }

  const envObj = JSON.parse(fs.readFileSync(envTemplatePath, 'utf8'));
  const valueMap = {};
  (Array.isArray(envObj.values) ? envObj.values : []).forEach((v) => {
    if (v && v.key) valueMap[v.key] = v;
  });

  const overrides = {
    baseUrl: getEnv('GEEKEZ_API_BASE', valueMap.baseUrl ? valueMap.baseUrl.value : 'http://localhost:12138'),
    apiToken: getEnv('GEEKEZ_API_TOKEN', valueMap.apiToken ? valueMap.apiToken.value : 'replace-with-your-token'),
    profileIdOrName: getEnv('GEEKEZ_PROFILE', valueMap.profileIdOrName ? valueMap.profileIdOrName.value : 'your-profile-id-or-name'),
    site: getEnv('GEEKEZ_COOKIE_SITE', valueMap.site ? valueMap.site.value : 'example.com'),
  };

  Object.keys(overrides).forEach((key) => {
    if (!valueMap[key]) {
      valueMap[key] = { key, value: '', enabled: true };
      envObj.values = envObj.values || [];
      envObj.values.push(valueMap[key]);
    }
    valueMap[key].value = overrides[key];
    valueMap[key].enabled = true;
  });

  const tmpPath = path.join(os.tmpdir(), `geekez_cookie_api_env_${Date.now()}.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(envObj, null, 2), 'utf8');

  try {
    console.log('[run] npx --yes newman run ...');
    await run('npx', [
      '--yes',
      'newman',
      'run',
      collectionPath,
      '-e',
      tmpPath,
      '--reporters',
      'cli',
    ]);
    console.log('[ok] newman cookie api run passed');
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (e) { }
  }
}

main().catch((err) => {
  console.error('[fail] newman cookie api run failed:', err && err.message ? err.message : err);
  process.exit(1);
});

/* eslint-disable no-console */
const { spawn } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function main() {
  console.log('[regression:all] ipc');
  await run('node', ['scripts/regression_ipc.js']);
  console.log('[regression:all] subscription-parser');
  await run('node', ['scripts/e2e_subscription_parser.js']);
  console.log('[regression:all] proxy-parser');
  await run('node', ['scripts/regression_proxy_parser.js']);
  console.log('[regression:all] updater-security');
  await run('node', ['scripts/regression_updater_security.js']);
  console.log('[regression:all] i18n');
  await run('node', ['scripts/regression_i18n.js']);
  console.log('[regression:all] done');
}

main().catch((e) => {
  console.error('[regression:all] fail:', e.message || e);
  process.exit(1);
});

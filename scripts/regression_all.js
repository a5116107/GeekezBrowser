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
  console.log('[regression:all] preload-ipc-bridge');
  await run('node', ['scripts/regression_preload_ipc_bridge.js']);
  console.log('[regression:all] subscription-parser');
  await run('node', ['scripts/e2e_subscription_parser.js']);
  console.log('[regression:all] proxy-parser');
  await run('node', ['scripts/regression_proxy_parser.js']);
  console.log('[regression:all] protocol-matrix');
  await run('node', ['scripts/regression_protocol_matrix.js']);
  console.log('[regression:all] probe-profiles');
  await run('node', ['scripts/regression_probe_profiles.js']);
  console.log('[regression:all] proxy-test-schema');
  await run('node', ['scripts/regression_proxy_test_schema.js']);
  console.log('[regression:all] fetch-policy');
  await run('node', ['scripts/regression_fetch_policy.js']);
  console.log('[regression:all] url-policy');
  await run('node', ['scripts/regression_url_policy.js']);
  console.log('[regression:all] proxy-scheduler');
  await run('node', ['scripts/regression_proxy_scheduler.js']);
  console.log('[regression:all] proxy-report');
  await run('node', ['scripts/regression_proxy_test_report.js']);
  console.log('[regression:all] proxy-replay-compare');
  await run('node', ['scripts/regression_proxy_replay_compare.js']);
  console.log('[regression:all] proxy-gate-audit');
  await run('node', ['scripts/regression_proxy_gate_audit.js']);
  console.log('[regression:all] proxy-quality-gate');
  await run('node', ['scripts/regression_proxy_quality_gate.js']);
  console.log('[regression:all] updater-security');
  await run('node', ['scripts/regression_updater_security.js']);
  console.log('[regression:all] tun-guardrails');
  await run('node', ['scripts/regression_tun_guardrails.js']);
  console.log('[regression:all] i18n');
  await run('node', ['scripts/regression_i18n.js']);
  console.log('[regression:all] i18n-toggle');
  await run('node', ['scripts/regression_i18n_toggle_behavior.js']);
  console.log('[regression:all] no-inline-handlers');
  await run('node', ['scripts/regression_no_inline_handlers.js']);
  console.log('[regression:all] proxy-ui');
  await run('node', ['scripts/regression_proxy_manager_ui.js']);
  console.log('[regression:all] profile-ui');
  await run('node', ['scripts/regression_profile_layout_ui.js']);
  console.log('[regression:all] launch-diagnostics');
  await run('node', ['scripts/regression_launch_error_diagnostics.js']);
  console.log('[regression:all] stop-diagnostics');
  await run('node', ['scripts/regression_stop_error_diagnostics.js']);
  console.log('[regression:all] profile-status-context');
  await run('node', ['scripts/regression_profile_status_error_context.js']);
  console.log('[regression:all] profile-error-guidance');
  await run('node', ['scripts/regression_profile_error_guidance.js']);
  console.log('[regression:all] profile-error-actions');
  await run('node', ['scripts/regression_profile_error_actions.js']);
  console.log('[regression:all] profile-remediation-ipc');
  await run('node', ['scripts/regression_profile_remediation_ipc.js']);
  console.log('[regression:all] profile-remediation-aggregation');
  await run('node', ['scripts/regression_profile_remediation_aggregation.js']);
  console.log('[regression:all] profile-remediation-nextstep');
  await run('node', ['scripts/regression_profile_remediation_nextstep.js']);
  console.log('[regression:all] profile-remediation-profiles');
  await run('node', ['scripts/regression_profile_remediation_profiles.js']);
  console.log('[regression:all] profile-remediation-failure-details');
  await run('node', ['scripts/regression_profile_remediation_failure_details.js']);
  console.log('[regression:all] profile-remediation-failure-summaries');
  await run('node', ['scripts/regression_profile_remediation_failure_summaries.js']);
  console.log('[regression:all] profile-remediation-code-profile-map');
  await run('node', ['scripts/regression_profile_remediation_code_profile_map.js']);
  console.log('[regression:all] profile-remediation-ranked-codes');
  await run('node', ['scripts/regression_profile_remediation_ranked_codes.js']);
  console.log('[regression:all] cookie-manager');
  await run('node', ['scripts/regression_cookie_manager.js']);
  console.log('[regression:all] ui-smoke');
  await run('node', ['scripts/regression_ui_smoke.js']);
  console.log('[regression:all] done');
}

main().catch((e) => {
  console.error('[regression:all] fail:', e.message || e);
  process.exit(1);
});

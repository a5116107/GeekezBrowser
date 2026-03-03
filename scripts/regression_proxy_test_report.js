/* eslint-disable no-console */
const assert = require('assert');
const { buildProxyTestReport, toProxyTestReportCsv } = require('../proxy/testReport');

function createSampleNodes() {
  return [
    {
      id: 'n1',
      remark: 'vless-a',
      groupId: 'g1',
      url: 'vless://example-a',
      latency: 120,
      lastTestAt: Date.now() - 1000,
      lastTestOk: true,
      lastTestCode: 'OK',
      lastTestCore: 'xray',
      lastTestAttempts: 1,
      lastTestResult: {
        protocol: 'vless',
        engine: 'xray',
        finalCode: 'OK',
        finalMessage: '',
        durationMs: 1800,
        attempts: [{ index: 1, ok: true }],
      },
      ipInfo: { ip: '1.1.1.1', country: 'US', timezone: 'America/New_York' },
    },
    {
      id: 'n2',
      remark: 'hy2-b',
      groupId: 'g1',
      url: 'hy2://example-b',
      latency: -1,
      lastTestAt: Date.now() - 800,
      lastTestOk: false,
      lastTestCode: 'PROBE_TIMEOUT',
      lastTestCore: 'sing-box',
      lastTestAttempts: 2,
      lastTestResult: {
        protocol: 'hy2',
        engine: 'sing-box',
        finalCode: 'PROBE_TIMEOUT',
        finalMessage: 'timeout',
        durationMs: 3200,
        attempts: [{ index: 1, ok: false }, { index: 2, ok: false }],
      },
      ipInfo: { ip: '2.2.2.2', country: 'JP', timezone: 'Asia/Tokyo' },
    },
    {
      id: 'n3',
      remark: 'manual-untested',
      groupId: 'manual',
      url: 'ss://example-c',
      enable: true,
    },
  ];
}

function testBuildAll() {
  const report = buildProxyTestReport({
    nodes: createSampleNodes(),
    subscriptions: [{ id: 'g1', name: 'Sub-A' }],
  });

  assert.strictEqual(report.summary.totalNodes, 3);
  assert.strictEqual(report.summary.testedNodes, 2);
  assert.strictEqual(report.summary.passNodes, 1);
  assert.strictEqual(report.summary.failNodes, 1);
  assert.strictEqual(report.summary.notTestedNodes, 1);
  assert(report.failureDistribution.some((x) => x.code === 'PROBE_TIMEOUT' && x.count === 1));
  assert(report.protocolBreakdown.some((x) => x.key === 'vless' && x.total === 1));
  assert(report.engineBreakdown.some((x) => x.key === 'xray' && x.total === 1));
  assert(report.suggestions.length >= 1);
}

function testBuildByGroup() {
  const report = buildProxyTestReport({
    nodes: createSampleNodes(),
    subscriptions: [{ id: 'g1', name: 'Sub-A' }],
    groupId: 'g1',
  });
  assert.strictEqual(report.summary.totalNodes, 2);
  assert.strictEqual(report.nodes.every((x) => x.groupId === 'g1'), true);
}

function testCsv() {
  const report = buildProxyTestReport({
    nodes: createSampleNodes(),
    subscriptions: [{ id: 'g1', name: 'Sub-A' }],
  });
  const csv = toProxyTestReportCsv(report);
  assert(csv.includes('id,remark,groupId,groupName,protocol,engine,status,finalCode'));
  assert(csv.includes('failure_code,count'));
  assert(csv.includes('suggestion_code,count,ratio,suggestion'));
  assert(csv.includes('n1'));
}

function main() {
  testBuildAll();
  testBuildByGroup();
  testCsv();
  console.log('[ok] proxy test report regression passed');
}

main();

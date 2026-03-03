const REPORT_VERSION = 1;

function safeText(input) {
  return String(input == null ? '' : input).trim();
}

function inferProtocol(node) {
  if (node && node.lastTestResult && typeof node.lastTestResult.protocol === 'string' && node.lastTestResult.protocol.trim()) {
    return node.lastTestResult.protocol.trim().toLowerCase();
  }
  const rawUrl = safeText(node && node.url);
  const match = rawUrl.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  return match && match[1] ? String(match[1]).toLowerCase() : 'unknown';
}

function inferEngine(node) {
  if (node && node.lastTestResult && typeof node.lastTestResult.engine === 'string' && node.lastTestResult.engine.trim()) {
    return node.lastTestResult.engine.trim();
  }
  const fallback = safeText(node && node.lastTestCore);
  return fallback || 'unknown';
}

function inferFinalCode(node) {
  const result = node && node.lastTestResult && typeof node.lastTestResult === 'object' ? node.lastTestResult : null;
  if (result && typeof result.finalCode === 'string' && result.finalCode.trim()) return result.finalCode.trim();
  const fromNode = safeText(node && (node.lastTestFinalCode || node.lastTestCode));
  if (fromNode) return fromNode;
  if (node && node.lastTestAt && node.lastTestOk === true) return 'OK';
  if (node && node.lastTestAt && node.lastTestOk === false) return 'UNKNOWN';
  return 'NOT_TESTED';
}

function inferFinalMessage(node) {
  const result = node && node.lastTestResult && typeof node.lastTestResult === 'object' ? node.lastTestResult : null;
  const value = safeText(result && (result.finalMessage || result.error));
  if (value) return value;
  return safeText(node && node.lastTestMsg);
}

function inferDurationMs(node) {
  const result = node && node.lastTestResult && typeof node.lastTestResult === 'object' ? node.lastTestResult : null;
  const duration = result && Number(result.durationMs);
  if (Number.isFinite(duration) && duration >= 0) return Math.round(duration);
  return null;
}

function inferAttempts(node) {
  const result = node && node.lastTestResult && typeof node.lastTestResult === 'object' ? node.lastTestResult : null;
  if (result && Array.isArray(result.attempts)) return result.attempts.length;
  const fallback = Number(node && node.lastTestAttempts);
  if (Number.isFinite(fallback) && fallback >= 0) return Math.round(fallback);
  return 0;
}

function inferLatencyMs(node) {
  const latency = Number(node && node.latency);
  if (!Number.isFinite(latency) || latency < 0 || latency >= 9999) return null;
  return Math.round(latency);
}

function inferStatus(node) {
  if (!node || !node.lastTestAt) return 'NOT_TESTED';
  return node.lastTestOk ? 'PASS' : 'FAIL';
}

function pushCount(map, key) {
  const normalizedKey = safeText(key) || 'unknown';
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function updateBucket(map, key, row) {
  const bucketKey = safeText(key) || 'unknown';
  if (!map.has(bucketKey)) {
    map.set(bucketKey, {
      key: bucketKey,
      total: 0,
      tested: 0,
      pass: 0,
      fail: 0,
      latencySum: 0,
      latencyCount: 0,
    });
  }
  const bucket = map.get(bucketKey);
  bucket.total += 1;
  if (row.status !== 'NOT_TESTED') bucket.tested += 1;
  if (row.status === 'PASS') bucket.pass += 1;
  if (row.status === 'FAIL') bucket.fail += 1;
  if (Number.isFinite(row.latencyMs)) {
    bucket.latencySum += row.latencyMs;
    bucket.latencyCount += 1;
  }
}

function toBucketRows(map) {
  return Array.from(map.values())
    .map((item) => ({
      key: item.key,
      total: item.total,
      tested: item.tested,
      pass: item.pass,
      fail: item.fail,
      avgLatencyMs: item.latencyCount > 0 ? Math.round(item.latencySum / item.latencyCount) : null,
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.key.localeCompare(b.key);
    });
}

function suggestFromCode(code) {
  const table = {
    PROBE_TIMEOUT: '网络链路超时，建议检查节点连通性、运营商出口或上游阻断。',
    PROBE_CONNECTIVITY_FAILED: '连通性探测失败，建议核对节点地址、端口与传输参数。',
    PROBE_HTTP_STATUS: '探测返回异常 HTTP 状态，建议更换探测目标或检查中间代理/网关。',
    HANDSHAKE_EOF: '握手提前断开，建议检查协议参数（SNI/ALPN/传输层）是否匹配。',
    HANDSHAKE_HTTP_400: '服务端返回 HTTP 400，通常为参数不匹配或请求格式错误。',
    HANDSHAKE_HTTP_403: '服务端返回 HTTP 403，可能被目标站或网关策略拦截。',
    HANDSHAKE_HTTP_502: '服务端返回 HTTP 502，建议排查上游可用性与转发链路。',
    PARSE_EMPTY: '节点链接为空，建议检查订阅内容完整性。',
    PARSE_INVALID: '节点解析失败，建议校验分享链接或订阅解码逻辑。',
    CAPABILITY_UNSUPPORTED_PROTOCOL: '协议当前未被能力矩阵支持，建议等待 PT-SSOT-101 矩阵收敛后重试。',
    ENGINE_START_FAILED: '内核启动失败，建议检查本地核心文件、端口占用与配置语法。',
    ENGINE_EXITED_EARLY: '内核异常提前退出，建议查看运行日志定位崩溃原因。',
    IP_GEO_UNAVAILABLE: 'IP/GEO 数据不可用，建议稍后重试或更换地理信息源。',
    UNKNOWN: '未知错误，建议结合 steps/attempts 明细进行逐步排查。',
    NOT_TESTED: '节点尚未测试，建议先执行批测。',
  };
  return table[code] || table.UNKNOWN;
}

function buildSuggestions(failureDistribution, totalFail) {
  if (totalFail <= 0) return [];
  return failureDistribution
    .filter((item) => item.code !== 'NOT_TESTED')
    .slice(0, 8)
    .map((item) => ({
      code: item.code,
      count: item.count,
      ratio: totalFail > 0 ? Number((item.count / totalFail).toFixed(4)) : 0,
      suggestion: suggestFromCode(item.code),
    }));
}

function buildNodeRow(node, groupNameById) {
  const groupId = safeText(node && node.groupId) || 'manual';
  const status = inferStatus(node);
  const finalCode = inferFinalCode(node);
  return {
    id: safeText(node && node.id),
    remark: safeText(node && node.remark),
    groupId,
    groupName: safeText(groupNameById.get(groupId)) || (groupId === 'manual' ? 'manual' : groupId),
    protocol: inferProtocol(node),
    engine: inferEngine(node),
    status,
    finalCode,
    finalMessage: inferFinalMessage(node),
    latencyMs: inferLatencyMs(node),
    durationMs: inferDurationMs(node),
    attempts: inferAttempts(node),
    testedAt: Number.isFinite(Number(node && node.lastTestAt)) ? Number(node.lastTestAt) : null,
    ip: safeText(node && node.ipInfo && node.ipInfo.ip),
    country: safeText(node && node.ipInfo && node.ipInfo.country),
    timezone: safeText(node && node.ipInfo && node.ipInfo.timezone),
    enable: node && node.enable !== false,
    urlScheme: inferProtocol(node),
  };
}

function buildProxyTestReport({ nodes = [], subscriptions = [], groupId = null } = {}) {
  const allNodes = Array.isArray(nodes) ? nodes.filter((node) => node && typeof node === 'object') : [];
  const groupNameById = new Map([['manual', 'manual']]);
  if (Array.isArray(subscriptions)) {
    subscriptions.forEach((sub) => {
      if (!sub || typeof sub !== 'object') return;
      const id = safeText(sub.id);
      if (!id) return;
      groupNameById.set(id, safeText(sub.name) || id);
    });
  }

  const targetGroup = groupId ? safeText(groupId) : '';
  const filtered = targetGroup
    ? allNodes.filter((node) => (safeText(node.groupId) || 'manual') === targetGroup)
    : allNodes;

  const rows = filtered.map((node) => buildNodeRow(node, groupNameById));

  const protocolBuckets = new Map();
  const engineBuckets = new Map();
  const finalCodeMap = new Map();

  let testedNodes = 0;
  let passNodes = 0;
  let failNodes = 0;
  let notTestedNodes = 0;

  rows.forEach((row) => {
    updateBucket(protocolBuckets, row.protocol, row);
    updateBucket(engineBuckets, row.engine, row);
    pushCount(finalCodeMap, row.finalCode);

    if (row.status === 'NOT_TESTED') notTestedNodes += 1;
    else testedNodes += 1;
    if (row.status === 'PASS') passNodes += 1;
    if (row.status === 'FAIL') failNodes += 1;
  });

  const failureDistribution = Array.from(finalCodeMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.code.localeCompare(b.code);
    });

  const report = {
    version: REPORT_VERSION,
    createdAt: Date.now(),
    filters: {
      groupId: targetGroup || null,
    },
    summary: {
      totalNodes: rows.length,
      testedNodes,
      passNodes,
      failNodes,
      notTestedNodes,
      passRate: testedNodes > 0 ? Number((passNodes / testedNodes).toFixed(4)) : null,
    },
    failureDistribution,
    protocolBreakdown: toBucketRows(protocolBuckets),
    engineBreakdown: toBucketRows(engineBuckets),
    suggestions: buildSuggestions(failureDistribution, failNodes),
    nodes: rows,
  };

  return report;
}

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  if (/["\n,\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toProxyTestReportCsv(report) {
  const lines = [];
  const rows = report && Array.isArray(report.nodes) ? report.nodes : [];
  const summary = report && report.summary ? report.summary : {};
  const failures = report && Array.isArray(report.failureDistribution) ? report.failureDistribution : [];
  const suggestions = report && Array.isArray(report.suggestions) ? report.suggestions : [];

  lines.push(`# Proxy Test Report v${report && report.version ? report.version : REPORT_VERSION}`);
  lines.push(`# CreatedAt,${csvEscape(new Date(report && report.createdAt ? report.createdAt : Date.now()).toISOString())}`);
  lines.push(`# TotalNodes,${csvEscape(summary.totalNodes || 0)}`);
  lines.push(`# TestedNodes,${csvEscape(summary.testedNodes || 0)}`);
  lines.push(`# PassNodes,${csvEscape(summary.passNodes || 0)}`);
  lines.push(`# FailNodes,${csvEscape(summary.failNodes || 0)}`);
  lines.push('');

  lines.push([
    'id',
    'remark',
    'groupId',
    'groupName',
    'protocol',
    'engine',
    'status',
    'finalCode',
    'finalMessage',
    'latencyMs',
    'durationMs',
    'attempts',
    'testedAt',
    'ip',
    'country',
    'timezone',
    'enable',
    'urlScheme',
  ].join(','));

  rows.forEach((row) => {
    lines.push([
      row.id,
      row.remark,
      row.groupId,
      row.groupName,
      row.protocol,
      row.engine,
      row.status,
      row.finalCode,
      row.finalMessage,
      row.latencyMs == null ? '' : row.latencyMs,
      row.durationMs == null ? '' : row.durationMs,
      row.attempts == null ? '' : row.attempts,
      row.testedAt == null ? '' : new Date(row.testedAt).toISOString(),
      row.ip,
      row.country,
      row.timezone,
      row.enable ? '1' : '0',
      row.urlScheme,
    ].map(csvEscape).join(','));
  });

  lines.push('');
  lines.push('failure_code,count');
  failures.forEach((item) => {
    lines.push([item.code, item.count].map(csvEscape).join(','));
  });

  lines.push('');
  lines.push('suggestion_code,count,ratio,suggestion');
  suggestions.forEach((item) => {
    lines.push([item.code, item.count, item.ratio, item.suggestion].map(csvEscape).join(','));
  });

  return lines.join('\n');
}

module.exports = {
  REPORT_VERSION,
  buildProxyTestReport,
  toProxyTestReportCsv,
};

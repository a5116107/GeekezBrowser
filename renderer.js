// i18n structure moved to i18n.js and locales/

let globalSettings = { preProxies: [], subscriptions: [], mode: 'single', enablePreProxy: false };
let currentEditId = null;
let confirmCallback = null;
let confirmAltCallback = null;
let confirmCancelCallback = null;
let currentProxyGroup = 'manual';
let inputCallback = null;
let searchText = '';
let profileStatusFilter = localStorage.getItem('profileStatusFilter') || 'all';
let viewMode = localStorage.getItem('geekez_view') || 'list';
let currentProxyDetailId = null;
let currentProxyInspectorId = null;
let proxyListViewState = { search: '', status: 'all', sort: 'default', preset: 'custom' };
let proxySecondaryFiltersExpanded = false;
let proxyAdvancedExpanded = false;
let proxyAdvancedView = 'common';
let proxyCognitiveMode = 'standard';
let proxyCognitiveStateCache = null;
let proxySidebarCollapsed = false;
let proxyWorkflowFocus = 'nodes';
let proxyDiagnosticsExpanded = false;
let proxyDiagnosticsDetailExpanded = false;
let proxyInspectorStepsExpanded = true;
let proxyInspectorAttemptsExpanded = false;
let proxyInspectorWidthPx = null;
let proxyInspectorCollapsed = false;
let proxyCustomQueryPresets = {};
let proxyPresetTrustPolicy = 'signed_preferred';
let proxyPresetPinnedKeys = [];
let proxyPresetSignerKeyId = 'local-default';
let proxyPresetIssuerTemplate = 'custom';
let proxyPresetTrustGateState = null;
let proxyReplayImportRouteMode = 'payload';
let proxyReplayRouteMap = {};
let proxyIssuerTemplateRemediationHint = null;
let proxyTrustExplainabilityPack = null;
const __restartState = new Set();
const __lastStatus = new Map();
const __lastStatusErrorCode = new Map();
const __lastStatusErrorStage = new Map();
const __lastStatusErrorMessage = new Map();
const __logSizeCache = new Map(); // id -> { ts:number, total:number }
let __profileListEventsBound = false;
let __preProxyListEventsBound = false;
let __globalActionEventsBound = false;
let __settingsInputEventsBound = false;
let __proxyModalUiEventsBound = false;
let __cookieManagerEventsBound = false;
let __settingsSaveTimer = null;
let __settingsDirty = false;
let __settingsSaveChain = Promise.resolve();
let __settingsSaveVersion = 0;
let __settingsSavedVersion = 0;
const __cookieManagerState = {
    profileId: null,
    profileName: '',
    site: '',
    sites: [],
    cookies: [],
    selectedId: null,
};
const SUBSCRIPTION_PRIVATE_ALLOWLIST_KEY = 'subscriptionPrivateAllowlist';
const PROFILE_STATUS_FILTER_KEY = 'profileStatusFilter';
const PROXY_BATCH_TEST_STRATEGY_KEY = 'proxyBatchTestStrategy';
const PROXY_LIST_VIEW_STATE_KEY = 'proxyListViewState';
const PROXY_SECONDARY_FILTERS_EXPANDED_KEY = 'proxySecondaryFiltersExpanded';
const PROXY_BENCHMARK_SNAPSHOT_KEY = 'proxyBenchmarkSnapshotByGroup';
const PROXY_ADVANCED_PANEL_EXPANDED_KEY = 'proxyAdvancedExpanded';
const PROXY_ADVANCED_VIEW_KEY = 'proxyAdvancedView';
const PROXY_COGNITIVE_MODE_KEY = 'proxyCognitiveMode';
const PROXY_COGNITIVE_STATE_CACHE_KEY = 'proxyCognitiveStateCache';
const PROXY_SIDEBAR_COLLAPSED_KEY = 'proxySidebarCollapsed';
const PROXY_DIAGNOSTICS_PANEL_EXPANDED_KEY = 'proxyDiagnosticsExpanded';
const PROXY_DIAGNOSTICS_DETAILS_EXPANDED_KEY = 'proxyDiagnosticsDetailsExpanded';
const PROXY_INSPECTOR_STEPS_EXPANDED_KEY = 'proxyInspectorStepsExpanded';
const PROXY_INSPECTOR_ATTEMPTS_EXPANDED_KEY = 'proxyInspectorAttemptsExpanded';
const PROXY_INSPECTOR_WIDTH_KEY = 'proxyInspectorWidthPx';
const PROXY_INSPECTOR_COLLAPSED_KEY = 'proxyInspectorCollapsed';
const PROXY_CUSTOM_QUERY_PRESETS_KEY = 'proxyCustomQueryPresets';
const PROXY_PRESET_TRUST_POLICY_KEY = 'proxyPresetTrustPolicy';
const PROXY_PRESET_PINNED_KEYS_KEY = 'proxyPresetPinnedKeys';
const PROXY_PRESET_SIGNER_KEY_ID_KEY = 'proxyPresetSignerKeyId';
const PROXY_PRESET_ISSUER_TEMPLATE_KEY = 'proxyPresetIssuerTemplate';
const PROXY_PRESET_PROVENANCE_KEY = 'proxyPresetProvenanceHistory';
const PROXY_REPLAY_IMPORT_ROUTE_MODE_KEY = 'proxyReplayImportRouteMode';
const PROXY_REPLAY_ROUTE_MAP_KEY = 'proxyReplayRouteMap';
const PROXY_TRUST_GATE_EXCEPTION_AUDIT_KEY = 'proxyTrustGateExceptionAuditTrail';
const PROXY_REPLAY_ROUTE_DRIFT_KEY = 'proxyReplayRouteDriftTrail';
const PROXY_ISSUER_REMEDIATION_HINT_KEY = 'proxyIssuerRemediationHint';
const PROXY_TRUST_EXPLAINABILITY_KEY = 'proxyTrustExplainabilityPack';
const PROXY_TRUST_EXPLAINABILITY_HISTORY_KEY = 'proxyTrustExplainabilityHistory';
const PROXY_MITIGATION_TELEMETRY_KEY = 'proxyMitigationTelemetry';
const PROXY_TRUST_MITIGATION_ALERT_HISTORY_KEY = 'proxyTrustMitigationAlertHistory';
const PROXY_FAIL_CODE_TREND_KEY = 'proxyFailCodeTrendByGroup';
const PROXY_TREND_ANOMALY_HISTORY_KEY = 'proxyTrendAnomalyHistoryByGroup';
const PROXY_FAIL_CODE_TREND_LIMIT = 24;
const PROXY_TREND_ANOMALY_HISTORY_LIMIT = 18;
const PROXY_PRESET_PROVENANCE_LIMIT = 20;
const PROXY_TRUST_GATE_EXCEPTION_AUDIT_LIMIT = 80;
const PROXY_REPLAY_ROUTE_DRIFT_LIMIT = 80;
const PROXY_TRUST_EXPLAINABILITY_HISTORY_LIMIT = 120;
const PROXY_MITIGATION_TELEMETRY_LIMIT = 120;
const PROXY_TRUST_MITIGATION_ALERT_HISTORY_LIMIT = 80;
const PROFILE_CARD_PRIMARY_ACTION_LIMIT = 3;
const PROFILE_CARD_TAG_LIMIT_LIST_VIEW = 1;
const PROFILE_CARD_TAG_LIMIT_GRID_VIEW = 2;
const PROXY_PRESET_KEY_RE = /^custom_[a-z0-9_]{1,24}$/;
const PROXY_SIGNER_KEY_ID_RE = /^[a-z0-9][a-z0-9._:-]{2,39}$/i;
const PROXY_PRESET_ISSUER_POLICY_TEMPLATES = Object.freeze({
    custom: Object.freeze({
        label: 'Custom',
        summary: 'Manual trust and signer settings',
        summaryKey: 'proxyIssuerTplSummaryCustom',
    }),
    strict_local: Object.freeze({
        label: 'Strict Local',
        trustPolicy: 'signed_only',
        signerKeyId: 'local-default',
        pinnedKeys: Object.freeze(['local-default']),
        summary: 'Only local-default signed bundles',
        summaryKey: 'proxyIssuerTplSummaryStrictLocal',
    }),
    strict_current: Object.freeze({
        label: 'Strict Current',
        trustPolicy: 'signed_only',
        signerKeyId: '$current',
        pinnedKeys: Object.freeze(['$current']),
        summary: 'Require signature from current signer key only',
        summaryKey: 'proxyIssuerTplSummaryStrictCurrent',
    }),
    bootstrap_permissive: Object.freeze({
        label: 'Bootstrap',
        trustPolicy: 'permissive',
        signerKeyId: '$current',
        pinnedKeys: Object.freeze([]),
        summary: 'Temporarily allow unsigned preset imports',
        summaryKey: 'proxyIssuerTplSummaryBootstrap',
    }),
});
const PROXY_QUERY_PRESETS = Object.freeze({
    custom: null,
    fail_network: Object.freeze({
        search: 'timeout|timed|reset|refused|unreachable|network|dns',
        status: 'fail',
        sort: 'fail_first',
    }),
    fail_tls: Object.freeze({
        search: 'tls|ssl cert|handshake|x509|certificate',
        status: 'fail',
        sort: 'fail_first',
    }),
    fail_auth: Object.freeze({
        search: 'auth|token|credential denied|forbidden|blocked|policy',
        status: 'fail',
        sort: 'fail_first',
    }),
    wait_retry: Object.freeze({
        search: 'wait|pending|queue|retry',
        status: 'wait',
        sort: 'updated_desc',
    }),
    slow_latency: Object.freeze({
        search: 'slow|latency|timeout',
        status: 'all',
        sort: 'latency_desc',
    }),
});
const HOST_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function isDomainLikeHost(input) {
    const host = String(input || '').trim().toLowerCase();
    if (!host || host.length > 253 || host.startsWith('.') || host.endsWith('.')) return false;
    const labels = host.split('.');
    return labels.length > 0 && labels.every(label => HOST_LABEL_RE.test(label));
}

function normalizePrivateAllowlistEntry(input) {
    if (typeof input !== 'string') return null;
    let value = input.trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value)) {
        try {
            value = new URL(value).hostname;
        } catch (e) {
            return null;
        }
    }

    value = value.trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (!value) return null;

    if (value.startsWith('*.')) {
        const suffix = value.slice(2);
        return isDomainLikeHost(suffix) ? `*.${suffix}` : null;
    }

    if (value === 'localhost' || value.endsWith('.localhost')) return value;

    // IPv4
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
        const nums = value.split('.').map(n => Number(n));
        if (nums.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return value;
        return null;
    }

    // IPv6 literal (simple validation accepted by URL parser)
    if (value.includes(':')) {
        try {
            const u = new URL(`http://[${value}]`);
            if (u.hostname) return value;
        } catch (e) { }
        return null;
    }

    if (isDomainLikeHost(value)) return value;
    return null;
}

function parseSubscriptionPrivateAllowlistText(text) {
    const out = [];
    const invalid = [];
    const seen = new Set();
    const raw = String(text || '');
    const parts = raw.split(/[\n,;]/g).map(x => x.trim()).filter(Boolean);

    for (const p of parts) {
        const normalized = normalizePrivateAllowlistEntry(p);
        if (!normalized) {
            invalid.push(p);
            continue;
        }
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
        if (out.length >= 64) break;
    }

    return { entries: out, invalid };
}

function normalizeProxyQueryPresetDefinition(raw, fallbackLabel = 'Preset') {
    const source = raw && typeof raw === 'object' ? raw : {};
    const label = typeof source.label === 'string' && source.label.trim()
        ? source.label.trim().slice(0, 24)
        : String(fallbackLabel || 'Preset').trim().slice(0, 24) || 'Preset';
    const search = typeof source.search === 'string' ? source.search.trim().slice(0, 80) : '';
    const status = ['all', 'pass', 'fail', 'wait'].includes(source.status) ? source.status : 'all';
    const sort = [
        'default',
        'latency_asc',
        'latency_desc',
        'updated_desc',
        'fail_first',
        'name_asc',
    ].includes(source.sort) ? source.sort : 'default';
    return { label, search, status, sort };
}

function normalizeProxyCustomQueryPresets(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.entries(raw).forEach(([key, value]) => {
        if (!PROXY_PRESET_KEY_RE.test(String(key || ''))) return;
        if (Object.keys(out).length >= 12) return;
        out[key] = normalizeProxyQueryPresetDefinition(value, key.replace(/^custom_/, '').replace(/_/g, ' '));
    });
    return out;
}

function loadProxyCustomQueryPresets() {
    try {
        const text = localStorage.getItem(PROXY_CUSTOM_QUERY_PRESETS_KEY);
        if (!text) return {};
        return normalizeProxyCustomQueryPresets(JSON.parse(text));
    } catch (e) {
        return {};
    }
}

function persistProxyCustomQueryPresets() {
    try {
        localStorage.setItem(PROXY_CUSTOM_QUERY_PRESETS_KEY, JSON.stringify(normalizeProxyCustomQueryPresets(proxyCustomQueryPresets)));
    } catch (e) { }
}

function normalizeProxyPresetTrustPolicy(input) {
    const value = String(input || '').trim().toLowerCase();
    if (value === 'signed_only') return 'signed_only';
    if (value === 'permissive') return 'permissive';
    return 'signed_preferred';
}

function normalizeProxyPresetIssuerTemplate(input) {
    const value = String(input || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PROXY_PRESET_ISSUER_POLICY_TEMPLATES, value)) return value;
    return 'custom';
}

function normalizeProxySignerKeyId(input, fallback = 'local-default') {
    const text = String(input || '').trim();
    if (PROXY_SIGNER_KEY_ID_RE.test(text)) return text.slice(0, 40);
    return fallback;
}

function parseProxyPinnedSignerKeys(text) {
    const raw = String(text || '');
    const parts = raw.split(/[\n,;]+/g).map((item) => item.trim()).filter(Boolean);
    const invalid = [];
    const out = [];
    const seen = new Set();
    parts.forEach((item) => {
        if (!PROXY_SIGNER_KEY_ID_RE.test(item)) {
            invalid.push(item);
            return;
        }
        const normalized = item.slice(0, 40);
        if (seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
    });
    return { keys: out.slice(0, 20), invalid };
}

function loadProxyPresetTrustPolicy() {
    try {
        const text = localStorage.getItem(PROXY_PRESET_TRUST_POLICY_KEY);
        return normalizeProxyPresetTrustPolicy(text);
    } catch (e) {
        return 'signed_preferred';
    }
}

function persistProxyPresetTrustPolicy() {
    try {
        localStorage.setItem(PROXY_PRESET_TRUST_POLICY_KEY, normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy));
    } catch (e) { }
}

function loadProxyPresetPinnedKeys() {
    try {
        const text = localStorage.getItem(PROXY_PRESET_PINNED_KEYS_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return [];
        const joined = parsed.map((item) => String(item || '')).join(',');
        return parseProxyPinnedSignerKeys(joined).keys;
    } catch (e) {
        return [];
    }
}

function persistProxyPresetPinnedKeys() {
    try {
        const normalized = parseProxyPinnedSignerKeys((proxyPresetPinnedKeys || []).join(',')).keys;
        localStorage.setItem(PROXY_PRESET_PINNED_KEYS_KEY, JSON.stringify(normalized));
    } catch (e) { }
}

function loadProxyPresetSignerKeyId() {
    try {
        const text = localStorage.getItem(PROXY_PRESET_SIGNER_KEY_ID_KEY);
        return normalizeProxySignerKeyId(text, 'local-default');
    } catch (e) {
        return 'local-default';
    }
}

function persistProxyPresetSignerKeyId() {
    try {
        localStorage.setItem(PROXY_PRESET_SIGNER_KEY_ID_KEY, normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'));
    } catch (e) { }
}

function loadProxyPresetIssuerTemplate() {
    try {
        const text = localStorage.getItem(PROXY_PRESET_ISSUER_TEMPLATE_KEY);
        return normalizeProxyPresetIssuerTemplate(text);
    } catch (e) {
        return 'custom';
    }
}

function persistProxyPresetIssuerTemplate() {
    try {
        localStorage.setItem(PROXY_PRESET_ISSUER_TEMPLATE_KEY, normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate));
    } catch (e) { }
}

function normalizeProxyReplayImportRouteMode(input) {
    const value = String(input || '').trim().toLowerCase();
    if (value === 'current') return 'current';
    if (value === 'mapped') return 'mapped';
    return 'payload';
}

function normalizeProxyReplayRouteMap(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    let count = 0;
    Object.entries(raw).forEach(([source, target]) => {
        if (count >= 40) return;
        const sourceKey = String(source || '').trim().slice(0, 80);
        const targetKey = String(target || '').trim().slice(0, 80);
        if (!sourceKey || !targetKey) return;
        out[sourceKey] = targetKey;
        count += 1;
    });
    return out;
}

function parseProxyReplayRouteMapText(text) {
    const map = {};
    const invalid = [];
    const lines = String(text || '')
        .split(/\n+/g)
        .map((line) => line.trim())
        .filter(Boolean);
    lines.forEach((line) => {
        if (Object.keys(map).length >= 40) return;
        const match = line.match(/^(.+?)(?:=>|=)(.+)$/);
        if (!match) {
            invalid.push(line);
            return;
        }
        const source = String(match[1] || '').trim().slice(0, 80);
        const target = String(match[2] || '').trim().slice(0, 80);
        if (!source || !target) {
            invalid.push(line);
            return;
        }
        map[source] = target;
    });
    return { map: normalizeProxyReplayRouteMap(map), invalid };
}

function loadProxyReplayImportRouteMode() {
    try {
        const text = localStorage.getItem(PROXY_REPLAY_IMPORT_ROUTE_MODE_KEY);
        return normalizeProxyReplayImportRouteMode(text);
    } catch (e) {
        return 'payload';
    }
}

function persistProxyReplayImportRouteMode() {
    try {
        localStorage.setItem(PROXY_REPLAY_IMPORT_ROUTE_MODE_KEY, normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode));
    } catch (e) { }
}

function loadProxyReplayRouteMap() {
    try {
        const text = localStorage.getItem(PROXY_REPLAY_ROUTE_MAP_KEY);
        if (!text) return {};
        return normalizeProxyReplayRouteMap(JSON.parse(text));
    } catch (e) {
        return {};
    }
}

function persistProxyReplayRouteMap() {
    try {
        localStorage.setItem(PROXY_REPLAY_ROUTE_MAP_KEY, JSON.stringify(normalizeProxyReplayRouteMap(proxyReplayRouteMap)));
    } catch (e) { }
}

function computeProxyIssuerRemediationConfidence(input) {
    const hint = input && typeof input === 'object' ? input : {};
    const severity = String(hint.severity || 'info').toLowerCase();
    const reason = String(hint.reason || '').toLowerCase();
    let score = severity === 'critical' ? 88 : (severity === 'warn' ? 74 : 64);
    if (reason.includes('template mismatch')) score += 8;
    if (reason.includes('signer key not pinned')) score += 7;
    if (reason.includes('requires signature') || reason.includes('unsigned')) score += 6;
    if (String(hint.recommendedTemplate || '') !== 'custom') score += 4;
    if (String(hint.recommendedSignerKeyId || '').trim()) score += 3;
    return Math.max(30, Math.min(98, score));
}

function normalizeProxyIssuerRemediationHint(input) {
    if (!input || typeof input !== 'object') return null;
    const generatedAt = Number(input.generatedAt);
    const createdAt = Number.isFinite(generatedAt) && generatedAt > 0 ? generatedAt : Date.now();
    const severity = String(input.severity || 'info').toLowerCase();
    const recommendedTemplate = normalizeProxyPresetIssuerTemplate(input.recommendedTemplate);
    const recommendedSignerKeyId = normalizeProxySignerKeyId(input.recommendedSignerKeyId, '');
    const summary = String(input.summary || '').trim().slice(0, 180);
    const reason = String(input.reason || '').trim().slice(0, 180);
    const note = String(input.note || '').trim().slice(0, 200);
    if (!summary) return null;
    const scoreRaw = Number(input.confidenceScore);
    const confidenceScore = Number.isFinite(scoreRaw)
        ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
        : computeProxyIssuerRemediationConfidence({ severity, reason, recommendedTemplate, recommendedSignerKeyId });
    const confidenceLevel = confidenceScore >= 85 ? 'high' : (confidenceScore >= 65 ? 'medium' : 'low');
    return {
        generatedAt: createdAt,
        severity: ['critical', 'warn', 'info'].includes(severity) ? severity : 'info',
        summary,
        reason,
        note,
        recommendedTemplate,
        recommendedSignerKeyId,
        confidenceScore,
        confidenceLevel,
    };
}

function loadProxyIssuerTemplateRemediationHint() {
    try {
        const text = localStorage.getItem(PROXY_ISSUER_REMEDIATION_HINT_KEY);
        if (!text) return null;
        return normalizeProxyIssuerRemediationHint(JSON.parse(text));
    } catch (e) {
        return null;
    }
}

function persistProxyIssuerTemplateRemediationHint() {
    try {
        const payload = normalizeProxyIssuerRemediationHint(proxyIssuerTemplateRemediationHint);
        if (!payload) {
            localStorage.removeItem(PROXY_ISSUER_REMEDIATION_HINT_KEY);
            return;
        }
        localStorage.setItem(PROXY_ISSUER_REMEDIATION_HINT_KEY, JSON.stringify(payload));
    } catch (e) { }
}

function setProxyIssuerTemplateRemediationHint(input) {
    proxyIssuerTemplateRemediationHint = normalizeProxyIssuerRemediationHint(input);
    persistProxyIssuerTemplateRemediationHint();
    renderProxyIssuerTemplateRemediationHint();
}

function normalizeProxyTrustExplainabilityHeuristic(input) {
    if (!input || typeof input !== 'object') return null;
    const id = String(input.id || '').trim().slice(0, 48);
    if (!id) return null;
    const outcomeRaw = String(input.outcome || 'info').toLowerCase();
    const outcome = ['pass', 'warn', 'block', 'info'].includes(outcomeRaw) ? outcomeRaw : 'info';
    const detail = String(input.detail || '').trim().slice(0, 200);
    if (!detail) return null;
    const label = String(input.label || id).trim().slice(0, 72) || id;
    return { id, label, outcome, detail };
}

function normalizeProxyTrustExplainabilityPack(input) {
    if (!input || typeof input !== 'object') return null;
    const generatedAtRaw = Number(input.generatedAt);
    const generatedAt = Number.isFinite(generatedAtRaw) && generatedAtRaw > 0 ? generatedAtRaw : Date.now();
    const groupId = String(input.groupId || 'manual').trim().slice(0, 80) || 'manual';
    const decision = normalizeProxyPresetTrustGateDecision(input.decision);
    const reasons = Array.isArray(input.reasons)
        ? input.reasons.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
        : [];
    const policyRaw = input.policySnapshot && typeof input.policySnapshot === 'object' ? input.policySnapshot : {};
    const policySnapshot = {
        trustPolicy: normalizeProxyPresetTrustPolicy(policyRaw.trustPolicy),
        template: normalizeProxyPresetIssuerTemplate(policyRaw.template),
        signerKeyId: normalizeProxySignerKeyId(policyRaw.signerKeyId, 'local-default'),
        pinnedKeys: normalizeSignerKeyListForCompare(policyRaw.pinnedKeys),
    };
    const bundleRaw = input.bundleSnapshot && typeof input.bundleSnapshot === 'object' ? input.bundleSnapshot : {};
    const bundleSnapshot = {
        signed: !!bundleRaw.signed,
        signerKeyId: normalizeProxySignerKeyId(bundleRaw.signerKeyId, ''),
        issuerPolicyTemplate: normalizeProxyPresetIssuerTemplate(bundleRaw.issuerPolicyTemplate),
        hash: /^[a-f0-9]{64}$/i.test(String(bundleRaw.hash || '').trim()) ? String(bundleRaw.hash).trim().toLowerCase() : '',
        presetCount: Math.max(0, Math.min(200, Number.isFinite(Number(bundleRaw.presetCount)) ? Number(bundleRaw.presetCount) : 0)),
    };
    const heuristics = Array.isArray(input.heuristics)
        ? input.heuristics.map((item) => normalizeProxyTrustExplainabilityHeuristic(item)).filter(Boolean).slice(0, 20)
        : [];
    const remediationHint = normalizeProxyIssuerRemediationHint(input.remediationHint);
    return {
        generatedAt,
        groupId,
        decision,
        reasons,
        policySnapshot,
        bundleSnapshot,
        heuristics,
        remediationHint,
    };
}

function loadProxyTrustExplainabilityPack() {
    try {
        const text = localStorage.getItem(PROXY_TRUST_EXPLAINABILITY_KEY);
        if (!text) return null;
        return normalizeProxyTrustExplainabilityPack(JSON.parse(text));
    } catch (e) {
        return null;
    }
}

function persistProxyTrustExplainabilityPack() {
    try {
        const payload = normalizeProxyTrustExplainabilityPack(proxyTrustExplainabilityPack);
        if (!payload) {
            localStorage.removeItem(PROXY_TRUST_EXPLAINABILITY_KEY);
            return;
        }
        localStorage.setItem(PROXY_TRUST_EXPLAINABILITY_KEY, JSON.stringify(payload));
    } catch (e) { }
}

function setProxyTrustExplainabilityPack(input) {
    proxyTrustExplainabilityPack = normalizeProxyTrustExplainabilityPack(input);
    persistProxyTrustExplainabilityPack();
    if (proxyTrustExplainabilityPack) {
        recordProxyTrustExplainabilityPack(proxyTrustExplainabilityPack);
    }
    renderProxyTrustExplainabilitySummary();
    renderProxyTrustExplainabilityHistorySummary();
}

function readProxyTrustExplainabilityHistoryStore() {
    try {
        const text = localStorage.getItem(PROXY_TRUST_EXPLAINABILITY_HISTORY_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
            ? parsed.map((item) => normalizeProxyTrustExplainabilityPack(item)).filter(Boolean).slice(-PROXY_TRUST_EXPLAINABILITY_HISTORY_LIMIT)
            : [];
    } catch (e) {
        return [];
    }
}

function writeProxyTrustExplainabilityHistoryStore(list) {
    try {
        localStorage.setItem(
            PROXY_TRUST_EXPLAINABILITY_HISTORY_KEY,
            JSON.stringify(Array.isArray(list) ? list : []),
        );
    } catch (e) { }
}

function recordProxyTrustExplainabilityPack(entryInput) {
    const entry = normalizeProxyTrustExplainabilityPack(entryInput);
    if (!entry) return;
    const rows = readProxyTrustExplainabilityHistoryStore();
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    if (last
        && last.groupId === entry.groupId
        && last.decision === entry.decision
        && String(last.bundleSnapshot && last.bundleSnapshot.hash || '') === String(entry.bundleSnapshot && entry.bundleSnapshot.hash || '')
        && String((last.reasons || [])[0] || '') === String((entry.reasons || [])[0] || '')
        && Math.abs(Number(entry.generatedAt) - Number(last.generatedAt)) < 4000) {
        return;
    }
    rows.push(entry);
    writeProxyTrustExplainabilityHistoryStore(rows.slice(-PROXY_TRUST_EXPLAINABILITY_HISTORY_LIMIT));
}

function getCurrentProxyTrustExplainabilityHistoryList() {
    const key = currentProxyGroup || 'manual';
    return readProxyTrustExplainabilityHistoryStore()
        .filter((item) => item.groupId === key)
        .slice(-24);
}

function sanitizeProxyMitigationTelemetryState(input) {
    if (!input || typeof input !== 'object') return null;
    const out = {};
    Object.keys(input).slice(0, 12).forEach((key) => {
        const safeKey = String(key || '').trim().slice(0, 48);
        if (!safeKey) return;
        const value = input[key];
        if (value === null || value === undefined) return;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            out[safeKey] = value;
            return;
        }
        if (Array.isArray(value)) {
            out[safeKey] = value.slice(0, 8).map((item) => String(item || '').slice(0, 80));
            return;
        }
        if (typeof value === 'object') {
            out[safeKey] = Object.keys(value)
                .slice(0, 6)
                .reduce((acc, subKey) => {
                    const k = String(subKey || '').slice(0, 40);
                    const v = value[subKey];
                    if (!k || v === undefined || v === null) return acc;
                    acc[k] = (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
                        ? v
                        : String(v).slice(0, 80);
                    return acc;
                }, {});
        }
    });
    return out;
}

function normalizeProxyMitigationTelemetryEntry(input) {
    if (!input || typeof input !== 'object') return null;
    const savedAt = Number(input.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    const actionTypeRaw = String(input.actionType || '').toLowerCase();
    const actionType = ['issuer_remediation', 'replay_mitigation'].includes(actionTypeRaw) ? actionTypeRaw : 'issuer_remediation';
    const statusRaw = String(input.status || '').toLowerCase();
    const status = ['success', 'noop', 'failed'].includes(statusRaw) ? statusRaw : 'noop';
    const groupId = String(input.groupId || 'manual').trim().slice(0, 80) || 'manual';
    const detail = String(input.detail || '').trim().slice(0, 220);
    const changedCountRaw = Number(input.changedCount);
    const changedCount = Number.isFinite(changedCountRaw) ? Math.max(0, Math.min(20, Math.round(changedCountRaw))) : 0;
    return {
        savedAt,
        actionType,
        status,
        groupId,
        detail,
        changedCount,
        beforeState: sanitizeProxyMitigationTelemetryState(input.beforeState),
        afterState: sanitizeProxyMitigationTelemetryState(input.afterState),
    };
}

function readProxyMitigationTelemetryStore() {
    try {
        const text = localStorage.getItem(PROXY_MITIGATION_TELEMETRY_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
            ? parsed.map((item) => normalizeProxyMitigationTelemetryEntry(item)).filter(Boolean).slice(-PROXY_MITIGATION_TELEMETRY_LIMIT)
            : [];
    } catch (e) {
        return [];
    }
}

function writeProxyMitigationTelemetryStore(list) {
    try {
        localStorage.setItem(PROXY_MITIGATION_TELEMETRY_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function recordProxyMitigationTelemetry(entryInput) {
    const entry = normalizeProxyMitigationTelemetryEntry({ savedAt: Date.now(), ...entryInput });
    if (!entry) return;
    const rows = readProxyMitigationTelemetryStore();
    rows.push(entry);
    writeProxyMitigationTelemetryStore(rows.slice(-PROXY_MITIGATION_TELEMETRY_LIMIT));
}

function getCurrentProxyMitigationTelemetryList() {
    const key = currentProxyGroup || 'manual';
    return readProxyMitigationTelemetryStore()
        .filter((item) => item.groupId === key)
        .slice(-30);
}

function buildProxyMitigationTelemetrySummary(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const byStatus = { success: 0, noop: 0, failed: 0 };
    const byAction = { issuer_remediation: 0, replay_mitigation: 0 };
    list.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(byStatus, item.status)) byStatus[item.status] += 1;
        if (Object.prototype.hasOwnProperty.call(byAction, item.actionType)) byAction[item.actionType] += 1;
    });
    const successRate = list.length > 0 ? Math.round((byStatus.success / list.length) * 1000) / 10 : 0;
    return {
        total: list.length,
        byStatus,
        byAction,
        successRate,
        latest: list.length > 0 ? list[list.length - 1] : null,
    };
}

function buildProxyMitigationTelemetryPayload() {
    const rows = getCurrentProxyMitigationTelemetryList();
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        summary: buildProxyMitigationTelemetrySummary(rows),
        rows,
    };
}

function resolveProxyPresetIssuerTemplateDefinition(templateKey) {
    const key = normalizeProxyPresetIssuerTemplate(templateKey);
    const template = PROXY_PRESET_ISSUER_POLICY_TEMPLATES[key] || PROXY_PRESET_ISSUER_POLICY_TEMPLATES.custom;
    const summary = template.summaryKey
        ? tText(template.summaryKey, String(template.summary || ''))
        : String(template.summary || '');
    const currentSigner = normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default');
    if (key === 'custom') {
        return {
            key,
            label: String(template.label || 'Custom'),
            summary,
            trustPolicy: normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy),
            signerKeyId: currentSigner,
            pinnedKeys: parseProxyPinnedSignerKeys((proxyPresetPinnedKeys || []).join(',')).keys,
        };
    }
    const signerRaw = template.signerKeyId === '$current' ? currentSigner : template.signerKeyId;
    const signerKeyId = normalizeProxySignerKeyId(signerRaw, currentSigner);
    const pinTokens = Array.isArray(template.pinnedKeys) ? template.pinnedKeys : [];
    const pinJoined = pinTokens.map((item) => item === '$current' ? signerKeyId : item).join(',');
    return {
        key,
        label: String(template.label || key),
        summary,
        trustPolicy: normalizeProxyPresetTrustPolicy(template.trustPolicy),
        signerKeyId,
        pinnedKeys: parseProxyPinnedSignerKeys(pinJoined).keys,
    };
}

function updateProxyPresetTrustSummary() {
    const summaryEl = document.getElementById('proxyPresetTrustSummary');
    if (!summaryEl) return;
    const policy = normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy);
    const pins = Array.isArray(proxyPresetPinnedKeys) ? proxyPresetPinnedKeys.length : 0;
    const signer = normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default');
    const templateDef = resolveProxyPresetIssuerTemplateDefinition(proxyPresetIssuerTemplate);
    const templateLabel = formatProxyIssuerTemplateLabel(templateDef && templateDef.key ? templateDef.key : proxyPresetIssuerTemplate);
    summaryEl.textContent = tFormat('proxyTrustSummaryLine', 'Trust: {policy} · template {template} · pins {pins} · signer {signer}', {
        policy: formatProxyTrustPolicyLabel(policy),
        template: templateLabel,
        pins,
        signer,
    });
    const pinSummary = pins > 0 ? `${tText('proxyTrustPinnedKeys', 'Pinned keys')}: ${proxyPresetPinnedKeys.join(', ')}` : tText('proxyTrustNoPins', 'No pinned signer keys');
    const templateSummary = templateDef && templateDef.summary
        ? tFormat('proxyIssuerTemplateSummaryWithNote', 'Issuer template: {template} ({note})', {
            template: templateLabel,
            note: templateDef.summary,
        })
        : tFormat('proxyIssuerTemplateSummary', 'Issuer template: {template}', { template: templateLabel });
    summaryEl.title = `${templateSummary}\n${pinSummary}`;
    renderProxyPresetPolicyDriftSummary();
    renderProxyPresetProvenanceDiff();
    renderProxyPresetTrustGateStatus();
    renderProxyReplayRouteSummary();
    renderProxyTrustGateExceptionAuditSummary();
    renderProxyReplayRouteDriftSummary();
    renderProxyReplayRouteMitigationHint();
    renderProxyIssuerTemplateRemediationHint();
    renderProxyTrustExplainabilitySummary();
    renderProxyTrustExplainabilityHistorySummary();
    renderProxyTrustMitigationCorrelationSummary();
    renderProxyMitigationTelemetrySummary();
}

function normalizeSignerKeyListForCompare(list) {
    return parseProxyPinnedSignerKeys((Array.isArray(list) ? list : []).join(',')).keys
        .slice()
        .sort((a, b) => a.localeCompare(b));
}

function buildProxyPresetTrustSnapshot() {
    return {
        template: normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate),
        trustPolicy: normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy),
        signerKeyId: normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
        pinnedKeys: normalizeSignerKeyListForCompare(proxyPresetPinnedKeys),
    };
}

function normalizeProxyPresetTrustGateDecision(input) {
    const value = String(input || '').trim().toLowerCase();
    if (value === 'block') return 'block';
    if (value === 'warn') return 'warn';
    return 'allow';
}

function normalizeProxyPresetTrustGateMeta(meta) {
    const raw = meta && typeof meta === 'object' ? meta : {};
    const decision = normalizeProxyPresetTrustGateDecision(raw.decision);
    const reasons = Array.isArray(raw.reasons)
        ? raw.reasons
            .map((item) => String(item || '').trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];
    return { decision, reasons };
}

function normalizeProxyPresetProvenanceEntry(item) {
    if (!item || typeof item !== 'object') return null;
    const savedAt = Number(item.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    const direction = String(item.direction || '').toLowerCase() === 'export' ? 'export' : 'import';
    const trustSnapshotRaw = item.trustSnapshot && typeof item.trustSnapshot === 'object' ? item.trustSnapshot : {};
    const trustSnapshot = {
        template: normalizeProxyPresetIssuerTemplate(trustSnapshotRaw.template),
        trustPolicy: normalizeProxyPresetTrustPolicy(trustSnapshotRaw.trustPolicy),
        signerKeyId: normalizeProxySignerKeyId(trustSnapshotRaw.signerKeyId, 'local-default'),
        pinnedKeys: normalizeSignerKeyListForCompare(trustSnapshotRaw.pinnedKeys),
    };
    const digestMapRaw = item.presetDigests && typeof item.presetDigests === 'object' ? item.presetDigests : {};
    const presetDigests = {};
    Object.entries(digestMapRaw).forEach(([key, digest]) => {
        if (!PROXY_PRESET_KEY_RE.test(String(key || ''))) return;
        presetDigests[key] = String(digest || '').slice(0, 320);
    });
    const presetCount = Number.isFinite(Number(item.presetCount)) ? Number(item.presetCount) : Object.keys(presetDigests).length;
    const bundleHash = /^[a-f0-9]{64}$/i.test(String(item.bundleHash || '').trim()) ? String(item.bundleHash).trim().toLowerCase() : '';
    const trustGate = normalizeProxyPresetTrustGateMeta(item.trustGate);
    return {
        savedAt,
        direction,
        trustSnapshot,
        bundleHash,
        signerKeyId: normalizeProxySignerKeyId(item.signerKeyId, ''),
        issuerPolicyTemplate: normalizeProxyPresetIssuerTemplate(item.issuerPolicyTemplate),
        presetCount: Math.max(0, Math.min(200, presetCount)),
        presetDigests,
        trustGate,
    };
}

function readProxyPresetProvenanceStore() {
    try {
        const text = localStorage.getItem(PROXY_PRESET_PROVENANCE_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
            ? parsed.map((item) => normalizeProxyPresetProvenanceEntry(item)).filter(Boolean).slice(-PROXY_PRESET_PROVENANCE_LIMIT)
            : [];
    } catch (e) {
        return [];
    }
}

function writeProxyPresetProvenanceStore(list) {
    try {
        localStorage.setItem(PROXY_PRESET_PROVENANCE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function buildProxyPresetDigestMap(presets) {
    const normalized = normalizeProxyCustomQueryPresets(presets);
    const out = {};
    Object.keys(normalized)
        .sort((a, b) => a.localeCompare(b))
        .forEach((key) => {
            out[key] = stableStringify(normalized[key]);
        });
    return out;
}

function recordProxyPresetProvenance(direction, payload, verify, presets, trustGateMeta = null) {
    const digestMap = buildProxyPresetDigestMap(presets);
    const signature = payload && typeof payload === 'object' && payload.signature && typeof payload.signature === 'object'
        ? payload.signature
        : null;
    const trustGate = normalizeProxyPresetTrustGateMeta(trustGateMeta);
    const entry = normalizeProxyPresetProvenanceEntry({
        savedAt: Date.now(),
        direction: String(direction || 'import').toLowerCase() === 'export' ? 'export' : 'import',
        trustSnapshot: buildProxyPresetTrustSnapshot(),
        bundleHash: verify && verify.hash ? verify.hash : (signature && signature.canonicalHash ? signature.canonicalHash : ''),
        signerKeyId: verify && verify.signerKeyId ? verify.signerKeyId : (signature && signature.signerKeyId ? signature.signerKeyId : ''),
        issuerPolicyTemplate: verify && verify.issuerPolicyTemplate ? verify.issuerPolicyTemplate : (signature && signature.issuerPolicyTemplate ? signature.issuerPolicyTemplate : 'custom'),
        presetCount: Object.keys(digestMap).length,
        presetDigests: digestMap,
        trustGate,
    });
    if (!entry) return;
    const history = readProxyPresetProvenanceStore();
    const last = history.length > 0 ? history[history.length - 1] : null;
    const duplicate = last
        && last.direction === entry.direction
        && last.bundleHash === entry.bundleHash
        && stableStringify(last.trustSnapshot) === stableStringify(entry.trustSnapshot)
        && stableStringify(last.presetDigests) === stableStringify(entry.presetDigests)
        && stableStringify(last.trustGate) === stableStringify(entry.trustGate);
    if (duplicate) return;
    history.push(entry);
    writeProxyPresetProvenanceStore(history.slice(-PROXY_PRESET_PROVENANCE_LIMIT));
}

function buildProxyPresetProvenanceDiff(history) {
    const list = Array.isArray(history) ? history.map((item) => normalizeProxyPresetProvenanceEntry(item)).filter(Boolean) : [];
    if (list.length < 2) return null;
    const previous = list[list.length - 2];
    const current = list[list.length - 1];
    const prevKeys = Object.keys(previous.presetDigests || {});
    const currKeys = Object.keys(current.presetDigests || {});
    const prevSet = new Set(prevKeys);
    const currSet = new Set(currKeys);
    const addedKeys = currKeys.filter((key) => !prevSet.has(key)).sort((a, b) => a.localeCompare(b));
    const removedKeys = prevKeys.filter((key) => !currSet.has(key)).sort((a, b) => a.localeCompare(b));
    const changedKeys = currKeys
        .filter((key) => prevSet.has(key) && String(current.presetDigests[key] || '') !== String(previous.presetDigests[key] || ''))
        .sort((a, b) => a.localeCompare(b));
    const trustFields = [];
    ['template', 'trustPolicy', 'signerKeyId'].forEach((field) => {
        if (String(previous.trustSnapshot[field] || '') !== String(current.trustSnapshot[field] || '')) {
            trustFields.push(field);
        }
    });
    if ((previous.trustSnapshot.pinnedKeys || []).join(',') !== (current.trustSnapshot.pinnedKeys || []).join(',')) {
        trustFields.push('pinnedKeys');
    }
    if (String(previous.trustGate && previous.trustGate.decision || 'allow') !== String(current.trustGate && current.trustGate.decision || 'allow')) {
        trustFields.push('trustGateDecision');
    }
    return {
        previous,
        current,
        addedKeys,
        removedKeys,
        changedKeys,
        trustFields,
    };
}

function formatProxyDirectionLabel(direction) {
    const normalized = String(direction || '').trim().toLowerCase();
    if (normalized === 'import') return tText('proxyWordImport', 'import');
    if (normalized === 'export') return tText('proxyWordExport', 'export');
    return normalized || '-';
}

function formatProxyTrustGateDecisionLabel(decision) {
    const normalized = normalizeProxyPresetTrustGateDecision(decision);
    if (normalized === 'block') return tText('proxyWordBlocked', 'blocked');
    if (normalized === 'warn') return tText('proxyWordWarning', 'warning');
    return tText('proxyWordAllow', 'allow');
}

function formatProxyTrustPolicyLabel(policy) {
    const normalized = normalizeProxyPresetTrustPolicy(policy);
    if (normalized === 'signed_only') return tText('proxyTrustSignedOnly', 'Signed Only');
    if (normalized === 'permissive') return tText('proxyTrustPermissive', 'Permissive');
    return tText('proxyTrustSignedPreferred', 'Signed Preferred');
}

function formatProxyIssuerTemplateLabel(templateKey) {
    const normalized = normalizeProxyPresetIssuerTemplate(templateKey);
    if (normalized === 'strict_local') return tText('proxyIssuerTplStrictLocal', 'Strict Local');
    if (normalized === 'strict_current') return tText('proxyIssuerTplStrictCurrent', 'Strict Current');
    if (normalized === 'bootstrap_permissive') return tText('proxyIssuerTplBootstrap', 'Bootstrap');
    return tText('proxyIssuerTplCustom', 'Custom');
}

function formatProxyReplayRouteModeLabel(mode) {
    const normalized = normalizeProxyReplayImportRouteMode(mode);
    if (normalized === 'payload') return tText('proxyReplayRoutePayloadGroup', 'Payload Group');
    if (normalized === 'mapped') return tText('proxyReplayRouteMappedPayload', 'Mapped / Payload');
    return tText('proxyReplayRouteCurrentGroup', 'Current Group');
}

function formatProxyReplayDriftKindLabel(kind) {
    const normalized = String(kind || '').trim().toLowerCase();
    if (normalized === 'forced-current') return tText('proxyReplayKindForcedCurrent', 'forced current');
    if (normalized === 'mapped-reroute') return tText('proxyReplayKindMappedReroute', 'mapped reroute');
    if (normalized === 'mapping-miss') return tText('proxyReplayKindMappingMiss', 'mapping miss');
    if (normalized === 'reroute') return tText('proxyReplayKindReroute', 'reroute');
    return normalized || tText('proxyWordNone', 'none');
}

const PROXY_ERROR_CODE_TEXT_KEY_MAP = Object.freeze({
    OTHER: 'proxyErrorCodeOther',
    UNKNOWN: 'proxyErrorCodeUnknown',
    PARSE_EMPTY: 'proxyErrorCodeParseEmpty',
    PARSE_INVALID: 'proxyErrorCodeParseInvalid',
    PROXY_TEST_FORMAT_ERR: 'proxyErrorCodeParseInvalid',
    CAPABILITY_UNSUPPORTED_PROTOCOL: 'proxyErrorCodeUnsupportedProtocol',
    ENGINE_START_FAILED: 'proxyErrorCodeEngineStartFailed',
    ENGINE_EXITED_EARLY: 'proxyErrorCodeEngineExitedEarly',
    PROXY_ENGINE_EXITED_EARLY: 'proxyErrorCodeEngineExitedEarly',
    HANDSHAKE_EOF: 'proxyErrorCodeHandshakeEof',
    HANDSHAKE_HTTP_400: 'proxyErrorCodeHandshakeHttp400',
    HANDSHAKE_HTTP_403: 'proxyErrorCodeHandshakeHttp403',
    HANDSHAKE_HTTP_502: 'proxyErrorCodeHandshakeHttp502',
    PROBE_TIMEOUT: 'proxyErrorCodeProbeTimeout',
    PROBE_HTTP_STATUS: 'proxyErrorCodeProbeHttpStatus',
    PROBE_CONNECTIVITY_FAILED: 'proxyErrorCodeProbeConnectivityFailed',
    IP_GEO_UNAVAILABLE: 'proxyErrorCodeIpGeoUnavailable',
});

function normalizeProxyErrorCode(rawCode) {
    const normalized = String(rawCode || '').trim().toUpperCase();
    if (!normalized || normalized === 'OK') return '';
    return normalized;
}

function formatProxyErrorCodeLabel(rawCode, options = {}) {
    const { fallbackDash = false } = options || {};
    const code = normalizeProxyErrorCode(rawCode);
    if (!code) return fallbackDash ? '-' : tText('proxyErrorCodeUnknown', 'Unknown');
    const key = PROXY_ERROR_CODE_TEXT_KEY_MAP[code];
    if (key) return tText(key, code);
    if (/^[A-Z0-9_]+$/.test(code)) return code.replace(/_/g, ' ');
    return code;
}

function formatProxyErrorCodeWithRaw(rawCode, options = {}) {
    const { fallbackDash = false } = options || {};
    const code = normalizeProxyErrorCode(rawCode);
    if (!code) return fallbackDash ? '-' : tText('proxyErrorCodeUnknown', 'Unknown');
    const label = formatProxyErrorCodeLabel(code, { fallbackDash: true });
    return label === code ? code : `${label} (${code})`;
}

function formatProxyErrorCodeShiftLabel(previousCode, currentCode) {
    const prev = formatProxyErrorCodeLabel(previousCode, { fallbackDash: true });
    const curr = formatProxyErrorCodeLabel(currentCode, { fallbackDash: true });
    if (prev === curr) return curr;
    return `${prev} → ${curr}`;
}

function formatProxyTestProfileLabel(profile) {
    const normalized = String(profile || '').trim().toLowerCase();
    if (!normalized) return '-';
    if (normalized === 'quick') return tText('proxyStrategyQuick', 'Quick');
    if (normalized === 'deep') return tText('proxyStrategyDeep', 'Deep');
    if (normalized === 'standard') return tText('proxyStrategyStandard', 'Standard');
    return profile;
}

function normalizeProxyTestProfileValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'quick' || normalized === 'deep' || normalized === 'standard') return normalized;
    return 'standard';
}

function applyProxyStrategyProfileChipState(profile) {
    const normalized = normalizeProxyTestProfileValue(profile);
    const profileEl = document.getElementById('proxyTestProfile');
    if (profileEl && profileEl.value !== normalized) profileEl.value = normalized;

    const chips = Array.from(document.querySelectorAll('#proxyModal [data-profile-chip]'));
    chips.forEach((chip) => {
        const key = normalizeProxyTestProfileValue(chip.getAttribute('data-profile-chip'));
        const active = key === normalized;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function localizeProxyTrustReasonText(reason) {
    const raw = String(reason || '').trim();
    if (!raw) return raw;

    const exactMap = {
        'signed_only policy requires signature': tText('proxyTrustGateReasonSignedOnlyNeedsSignature', 'signed_only policy requires signature'),
        'pinned signer keys require signed bundle': tText('proxyTrustGateReasonPinnedNeedsSigned', 'pinned signer keys require signed bundle'),
        'signed bundle missing signer key id': tText('proxyTrustGateReasonMissingSignerId', 'signed bundle missing signer key id'),
        'recent provenance imports are signed-only; unsigned import blocked': tText('proxyTrustGateReasonRecentSignedOnly', 'recent provenance imports are signed-only; unsigned import blocked'),
        'unsigned preset bundle imported under signed_preferred': tText('proxyTrustGateReasonUnsignedPreferred', 'unsigned preset bundle imported under signed_preferred'),
        'policy mismatch': tText('proxyTrustGateReasonPolicyMismatch', 'policy mismatch'),
        'trust checks passed': tText('proxyPresetTrustGatePassReason', 'trust checks passed'),
        'check provenance': tText('proxyTrustGateReasonCheckProvenance', 'check provenance'),
        'trust gate warning': tText('proxyIssuerRemediationReasonGateWarning', 'trust gate warning'),
        'trust gate blocked import': tText('proxyIssuerRemediationReasonBlockedImport', 'trust gate blocked import'),
    };
    if (Object.prototype.hasOwnProperty.call(exactMap, raw)) return exactMap[raw];

    let matched = raw.match(/^signer key not pinned:\s*(.+)$/i);
    if (matched) return tFormat('proxyTrustGateReasonSignerNotPinned', 'signer key not pinned: {signer}', { signer: matched[1] || '-' });

    matched = raw.match(/^signer rotated\s+(.+)\s+->\s+(.+)$/i);
    if (matched) {
        return tFormat('proxyTrustGateReasonSignerRotated', 'signer rotated {previous} -> {current}', {
            previous: matched[1] || '-',
            current: matched[2] || '-',
        });
    }

    matched = raw.match(/^new signer key outside recent provenance:\s*(.+)$/i);
    if (matched) return tFormat('proxyTrustGateReasonSignerOutsideRecent', 'new signer key outside recent provenance: {signer}', { signer: matched[1] || '-' });

    matched = raw.match(/^preset count drops\s+(\d+)\s+->\s+(\d+)$/i);
    if (matched) {
        return tFormat('proxyTrustGateReasonPresetDrop', 'preset count drops {previous} -> {current}', {
            previous: matched[1] || '-',
            current: matched[2] || '-',
        });
    }

    matched = raw.match(/^issuer template mismatch\s+(.+)\s+vs\s+(.+)$/i);
    if (matched) {
        return tFormat('proxyTrustGateReasonTemplateMismatch', 'issuer template mismatch {signatureTemplate} vs {currentTemplate}', {
            signatureTemplate: matched[1] || '-',
            currentTemplate: matched[2] || '-',
        });
    }

    return raw;
}

function localizeProxyReplayDriftText(text) {
    const raw = String(text || '').trim();
    if (!raw) return raw;

    let matched = raw.match(/^replay routed\s+(.+)\s+->\s+(.+)$/i);
    if (matched) {
        return tFormat('proxyReplayDriftDetailReroute', 'replay routed {payload} -> {target}', {
            payload: matched[1] || '-',
            target: matched[2] || '-',
        });
    }

    matched = raw.match(/^no mapping for payload group\s+(.+?)(\s+\(current\s+(.+)\))?$/i);
    if (matched) {
        const payload = (matched[1] || '').trim();
        const current = (matched[3] || '').trim();
        return tFormat('proxyReplayDriftDetailMappingMiss', 'no mapping for payload group {payload}{currentSuffix}', {
            payload,
            currentSuffix: current ? ` (${tText('proxyWordCurrent', 'current')} ${current})` : '',
        });
    }

    return raw;
}

function renderProxyPresetProvenanceDiff() {
    const diffEl = document.getElementById('proxyPresetProvenanceDiff');
    if (!diffEl) return;
    const history = readProxyPresetProvenanceStore();
    if (!history.length) {
        diffEl.textContent = tText('proxyPresetProvenanceInit', 'Provenance: no snapshots yet');
        diffEl.title = tText('proxyPresetProvenanceHint', 'Preset provenance snapshots appear after import/export actions');
        return;
    }
    const diff = buildProxyPresetProvenanceDiff(history);
    const latest = history[history.length - 1];
    if (!diff) {
        diffEl.textContent = tFormat('proxyPresetProvenanceLatest', 'Provenance: {direction} · presets {count}', {
            direction: formatProxyDirectionLabel(latest.direction),
            count: latest.presetCount,
        });
        diffEl.title = tFormat('proxyPresetProvenanceLatestHint', 'latest template={template}, signer={signer}', {
            template: latest.trustSnapshot.template,
            signer: latest.signerKeyId || '-',
        });
        return;
    }
    const summary = tFormat('proxyPresetProvenanceDeltaSummary', 'Provenance Δ +{added} -{removed} ~{changed} · trust {trust}', {
        added: diff.addedKeys.length,
        removed: diff.removedKeys.length,
        changed: diff.changedKeys.length,
        trust: diff.trustFields.length,
    });
    diffEl.textContent = summary;
    diffEl.title = [
        tFormat('proxyPresetProvenancePrevCurr', 'prev={previous} -> curr={current}', {
            previous: formatProxyDirectionLabel(diff.previous.direction),
            current: formatProxyDirectionLabel(diff.current.direction),
        }),
        diff.addedKeys.length > 0
            ? tFormat('proxyPresetProvenanceAdded', 'added: {items}', { items: diff.addedKeys.join(', ') })
            : tFormat('proxyPresetProvenanceAdded', 'added: {items}', { items: '-' }),
        diff.removedKeys.length > 0
            ? tFormat('proxyPresetProvenanceRemoved', 'removed: {items}', { items: diff.removedKeys.join(', ') })
            : tFormat('proxyPresetProvenanceRemoved', 'removed: {items}', { items: '-' }),
        diff.changedKeys.length > 0
            ? tFormat('proxyPresetProvenanceChanged', 'changed: {items}', { items: diff.changedKeys.join(', ') })
            : tFormat('proxyPresetProvenanceChanged', 'changed: {items}', { items: '-' }),
        diff.trustFields.length > 0
            ? tFormat('proxyPresetProvenanceTrustChanged', 'trust changed: {items}', { items: diff.trustFields.join(', ') })
            : tFormat('proxyPresetProvenanceTrustChanged', 'trust changed: {items}', { items: '-' }),
    ].join('\n');
}

function getLatestProxyPresetTrustGateState(history) {
    const list = Array.isArray(history) ? history.map((item) => normalizeProxyPresetProvenanceEntry(item)).filter(Boolean) : [];
    const latest = list.length > 0 ? list[list.length - 1] : null;
    if (!latest || !latest.trustGate) return normalizeProxyPresetTrustGateMeta(null);
    return normalizeProxyPresetTrustGateMeta(latest.trustGate);
}

function renderProxyPresetTrustGateStatus() {
    const el = document.getElementById('proxyPresetTrustGateStatus');
    if (!el) return;
    const history = readProxyPresetProvenanceStore();
    const latest = history.length > 0 ? history[history.length - 1] : null;
    if (!latest) {
        proxyPresetTrustGateState = normalizeProxyPresetTrustGateMeta({ decision: 'allow', reasons: ['no provenance snapshots yet'] });
        el.textContent = tText('proxyPresetTrustGateInit', 'Trust gate: idle');
        el.title = tText('proxyPresetTrustGateHint', 'Trust gate automation evaluates preset imports once provenance snapshots exist');
        return;
    }
    proxyPresetTrustGateState = getLatestProxyPresetTrustGateState(history);
    const decision = normalizeProxyPresetTrustGateDecision(proxyPresetTrustGateState.decision);
    const reasonList = (Array.isArray(proxyPresetTrustGateState.reasons) ? proxyPresetTrustGateState.reasons : [])
        .map((item) => localizeProxyTrustReasonText(item))
        .filter((item) => String(item || '').trim());
    const decisionLabel = formatProxyTrustGateDecisionLabel(decision);
    const reason = reasonList.length > 0 ? reasonList[0] : tText('proxyPresetTrustGatePassReason', 'trust checks passed');
    el.textContent = tFormat('proxyPresetTrustGateStatusLine', 'Trust gate: {decision} · {count} reasons', {
        decision: decisionLabel,
        count: reasonList.length || 1,
    });
    el.title = [
        tFormat('proxyPresetTrustGateLatestDirection', 'latest direction: {direction}', {
            direction: formatProxyDirectionLabel(latest.direction),
        }),
        tFormat('proxyPresetTrustGateDecisionLine', 'decision: {decision}', { decision: decisionLabel }),
        reasonList.length > 0
            ? tFormat('proxyPresetTrustGateReasonsLine', 'reasons: {reasons}', { reasons: reasonList.join(' | ') })
            : tFormat('proxyPresetTrustGateReasonsLine', 'reasons: {reasons}', { reasons: reason }),
    ].join('\n');
}

function normalizeProxyTrustGateExceptionEntry(item) {
    if (!item || typeof item !== 'object') return null;
    const savedAt = Number(item.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    const decision = normalizeProxyPresetTrustGateDecision(item.decision);
    if (decision !== 'warn' && decision !== 'block') return null;
    const groupId = String(item.groupId || 'manual').trim().slice(0, 80) || 'manual';
    const reason = String(item.reason || '').trim().slice(0, 160);
    if (!reason) return null;
    const signerKeyId = normalizeProxySignerKeyId(item.signerKeyId, '');
    const bundleHash = /^[a-f0-9]{64}$/i.test(String(item.bundleHash || '').trim())
        ? String(item.bundleHash).trim().toLowerCase()
        : '';
    const route = String(item.route || '').trim().slice(0, 120);
    const trustPolicy = normalizeProxyPresetTrustPolicy(item.trustPolicy);
    const template = normalizeProxyPresetIssuerTemplate(item.template);
    const payloadTemplate = normalizeProxyPresetIssuerTemplate(item.payloadTemplate);
    const presetCount = Number(item.presetCount || 0);
    return {
        savedAt,
        groupId,
        decision,
        reason,
        signerKeyId,
        bundleHash,
        route,
        trustPolicy,
        template,
        payloadTemplate,
        presetCount: Number.isFinite(presetCount) && presetCount >= 0 ? presetCount : 0,
    };
}

function readProxyTrustGateExceptionAuditStore() {
    try {
        const text = localStorage.getItem(PROXY_TRUST_GATE_EXCEPTION_AUDIT_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
            ? parsed.map((item) => normalizeProxyTrustGateExceptionEntry(item)).filter(Boolean).slice(-PROXY_TRUST_GATE_EXCEPTION_AUDIT_LIMIT)
            : [];
    } catch (e) {
        return [];
    }
}

function writeProxyTrustGateExceptionAuditStore(list) {
    try {
        localStorage.setItem(PROXY_TRUST_GATE_EXCEPTION_AUDIT_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function recordProxyTrustGateException(entryInput) {
    const entry = normalizeProxyTrustGateExceptionEntry({
        savedAt: Date.now(),
        ...entryInput,
    });
    if (!entry) return;
    const list = readProxyTrustGateExceptionAuditStore();
    const last = list.length > 0 ? list[list.length - 1] : null;
    if (last
        && last.groupId === entry.groupId
        && last.decision === entry.decision
        && last.reason === entry.reason
        && last.signerKeyId === entry.signerKeyId
        && last.bundleHash === entry.bundleHash
        && Math.abs(entry.savedAt - last.savedAt) < 4000) {
        return;
    }
    list.push(entry);
    writeProxyTrustGateExceptionAuditStore(list.slice(-PROXY_TRUST_GATE_EXCEPTION_AUDIT_LIMIT));
}

function getCurrentProxyTrustGateExceptionList() {
    const key = currentProxyGroup || 'manual';
    return readProxyTrustGateExceptionAuditStore()
        .filter((item) => item.groupId === key)
        .slice(-24);
}

function buildProxyTrustGateExceptionAuditPayload() {
    const rows = getCurrentProxyTrustGateExceptionList();
    const replayRouteDrift = buildProxyReplayRouteDriftAuditPayload();
    const remediationHint = normalizeProxyIssuerRemediationHint(proxyIssuerTemplateRemediationHint);
    const totals = rows.reduce((acc, item) => {
        if (item.decision === 'block') acc.block += 1;
        if (item.decision === 'warn') acc.warn += 1;
        return acc;
    }, { block: 0, warn: 0 });
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        replayRouteMode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
        replayRouteMapSize: Object.keys(normalizeProxyReplayRouteMap(proxyReplayRouteMap)).length,
        totals,
        rows,
        replayRouteDrift,
        remediationHint,
    };
}

function renderProxyTrustGateExceptionAuditSummary() {
    const el = document.getElementById('proxyTrustGateAuditSummary');
    if (!el) return;
    const rows = getCurrentProxyTrustGateExceptionList();
    if (rows.length === 0) {
        el.textContent = tText('proxyTrustGateExceptionsInit', 'Trust exceptions: none');
        el.title = tText('proxyTrustGateExceptionsHint', 'No trust-gate warnings/blocks recorded for this group');
        return;
    }
    const latest = rows[rows.length - 1];
    const label = formatProxyTrustGateDecisionLabel(latest.decision);
    el.textContent = tFormat('proxyTrustGateExceptionsSummary', 'Trust exceptions: {count} · latest {label}', {
        count: rows.length,
        label,
    });
    const latestTime = Number.isFinite(Number(latest.savedAt))
        ? new Date(Number(latest.savedAt)).toLocaleString()
        : '-';
    const reasonText = localizeProxyTrustReasonText(latest.reason || '-');
    el.title = [
        tFormat('proxyTrustGateExceptionsLatest', 'latest: {label} @ {time}', { label, time: latestTime }),
        tFormat('proxyTrustGateExceptionsReason', 'reason: {reason}', { reason: reasonText || '-' }),
        latest.route
            ? tFormat('proxyTrustGateExceptionsRoute', 'route: {route}', { route: latest.route })
            : tFormat('proxyTrustGateExceptionsRoute', 'route: {route}', { route: '-' }),
        latest.signerKeyId
            ? tFormat('proxyTrustGateExceptionsSigner', 'signer: {signer}', { signer: latest.signerKeyId })
            : tFormat('proxyTrustGateExceptionsSigner', 'signer: {signer}', { signer: '-' }),
    ].join('\n');
}

async function exportProxyTrustGateExceptionAudit() {
    try {
        const payload = buildProxyTrustGateExceptionAuditPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyTrustGateAuditCopied', 'Trust gate audit copied ({rows} rows)', { rows: payload.rows.length }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyTrustGateAuditExportFailed', 'Export trust gate audit failed')}: ${err && err.message ? err.message : err}`);
    }
}

function getCurrentProxyTrustExplainabilityPack() {
    const pack = normalizeProxyTrustExplainabilityPack(proxyTrustExplainabilityPack);
    if (!pack) return null;
    const current = currentProxyGroup || 'manual';
    if (pack.groupId === current) return pack;
    return null;
}

function buildProxyTrustExplainabilityPayload() {
    const pack = normalizeProxyTrustExplainabilityPack(proxyTrustExplainabilityPack);
    const history = getCurrentProxyTrustExplainabilityHistoryList();
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        pack,
        history,
    };
}

function renderProxyTrustExplainabilityHistorySummary() {
    const el = document.getElementById('proxyTrustExplainabilityHistorySummary');
    if (!el) return;
    const rows = getCurrentProxyTrustExplainabilityHistoryList();
    if (rows.length === 0) {
        el.textContent = tText('proxyTrustExplainabilityHistoryInit', 'Trust explainability history: none');
        el.title = tText('proxyTrustExplainabilityHistoryHint', 'No trust explainability history for this group');
        return;
    }
    const totals = rows.reduce((acc, row) => {
        const key = normalizeProxyPresetTrustGateDecision(row.decision);
        if (Object.prototype.hasOwnProperty.call(acc, key)) acc[key] += 1;
        return acc;
    }, { allow: 0, warn: 0, block: 0 });
    const latest = rows[rows.length - 1];
    const latestLabel = formatProxyTrustGateDecisionLabel(latest.decision);
    el.textContent = tFormat(
        'proxyTrustExplainabilityHistorySummary',
        'Trust explainability history: {count} · block {block} · warn {warn}',
        { count: rows.length, block: totals.block, warn: totals.warn },
    );
    const latestTime = Number.isFinite(Number(latest.generatedAt))
        ? new Date(Number(latest.generatedAt)).toLocaleString()
        : '-';
    const firstReason = localizeProxyTrustReasonText((latest.reasons || [])[0] || '');
    el.title = [
        tFormat('proxyTrustExplainabilityHistoryLatest', 'latest: {decision} @ {time}', { decision: latestLabel, time: latestTime }),
        tFormat('proxyTrustExplainabilityHistoryDecisionTotals', 'totals allow/warn/block: {allow}/{warn}/{block}', {
            allow: totals.allow,
            warn: totals.warn,
            block: totals.block,
        }),
        tFormat('proxyTrustExplainabilityHistoryReason', 'reason: {reason}', { reason: firstReason || '-' }),
    ].join('\n');
}

function renderProxyTrustExplainabilitySummary() {
    const el = document.getElementById('proxyTrustExplainabilitySummary');
    if (!el) return;
    const pack = getCurrentProxyTrustExplainabilityPack();
    if (!pack) {
        const stored = normalizeProxyTrustExplainabilityPack(proxyTrustExplainabilityPack);
        if (stored && stored.groupId && stored.groupId !== (currentProxyGroup || 'manual')) {
            el.textContent = tText('proxyTrustExplainabilityCrossGroup', 'Trust explainability: latest pack belongs to another group');
            el.title = tFormat('proxyTrustExplainabilityCrossGroupHint', 'Latest explainability pack is for group {group}', {
                group: stored.groupId,
            });
            return;
        }
        el.textContent = tText('proxyTrustExplainabilityInit', 'Trust explainability: none');
        el.title = tText('proxyTrustExplainabilityHint', 'Trust explainability pack is generated after preset import decisions');
        return;
    }
    const decisionLabel = formatProxyTrustGateDecisionLabel(pack.decision);
    const reasonTextRaw = pack.reasons.length > 0 ? pack.reasons[0] : tText('proxyPresetTrustGatePassReason', 'trust checks passed');
    const reasonText = localizeProxyTrustReasonText(reasonTextRaw || '');
    const heuristicsCount = Array.isArray(pack.heuristics) ? pack.heuristics.length : 0;
    el.textContent = tFormat('proxyTrustExplainabilitySummary', 'Trust explainability: {decision} · heuristics {count}', {
        decision: decisionLabel,
        count: heuristicsCount,
    });
    const generatedAt = Number.isFinite(Number(pack.generatedAt))
        ? new Date(Number(pack.generatedAt)).toLocaleString()
        : '-';
    const signedText = pack.bundleSnapshot && pack.bundleSnapshot.signed
        ? tText('proxyWordYes', 'yes')
        : tText('proxyWordNo', 'no');
    el.title = [
        tFormat('proxyTrustExplainabilityGeneratedAt', 'generated: {time}', { time: generatedAt }),
        tFormat('proxyTrustExplainabilityDecision', 'decision: {decision}', { decision: decisionLabel }),
        tFormat('proxyTrustExplainabilityReason', 'reason: {reason}', { reason: reasonText }),
        tFormat('proxyTrustExplainabilityPolicy', 'policy: {policy}, template: {template}', {
            policy: formatProxyTrustPolicyLabel(pack.policySnapshot && pack.policySnapshot.trustPolicy),
            template: formatProxyIssuerTemplateLabel(pack.policySnapshot && pack.policySnapshot.template),
        }),
        tFormat('proxyTrustExplainabilityBundle', 'signed: {signed}, signer: {signer}', {
            signed: signedText,
            signer: pack.bundleSnapshot && pack.bundleSnapshot.signerKeyId ? pack.bundleSnapshot.signerKeyId : '-',
        }),
    ].join('\n');
}

async function exportProxyTrustExplainabilityPack() {
    try {
        const payload = buildProxyTrustExplainabilityPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        const count = payload && payload.pack && Array.isArray(payload.pack.heuristics) ? payload.pack.heuristics.length : 0;
        showToast(tFormat('proxyTrustExplainabilityCopied', 'Trust explainability copied ({count} heuristics)', { count }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyTrustExplainabilityExportFailed', 'Export trust explainability failed')}: ${err && err.message ? err.message : err}`);
    }
}

function buildProxyTrustMitigationCorrelationPayload() {
    const explainRows = getCurrentProxyTrustExplainabilityHistoryList();
    const mitigationRows = getCurrentProxyMitigationTelemetryList();
    const decisionTotals = explainRows.reduce((acc, row) => {
        const key = normalizeProxyPresetTrustGateDecision(row.decision);
        if (Object.prototype.hasOwnProperty.call(acc, key)) acc[key] += 1;
        return acc;
    }, { allow: 0, warn: 0, block: 0 });
    const successByDecision = {
        allow: { total: 0, success: 0 },
        warn: { total: 0, success: 0 },
        block: { total: 0, success: 0 },
        unknown: { total: 0, success: 0 },
    };
    const linkedRows = mitigationRows.map((row) => {
        const savedAt = Number(row.savedAt) || 0;
        const matched = explainRows
            .filter((pack) => Number(pack.generatedAt) > 0 && Number(pack.generatedAt) <= savedAt)
            .slice(-1)[0] || null;
        const decision = matched ? normalizeProxyPresetTrustGateDecision(matched.decision) : 'unknown';
        if (Object.prototype.hasOwnProperty.call(successByDecision, decision)) {
            successByDecision[decision].total += 1;
            if (row.status === 'success') successByDecision[decision].success += 1;
        }
        return {
            savedAt: row.savedAt,
            actionType: row.actionType,
            status: row.status,
            changedCount: row.changedCount,
            detail: row.detail,
            explainabilityDecision: decision,
            explainabilityGeneratedAt: matched ? matched.generatedAt : null,
            explainabilityReason: matched && matched.reasons && matched.reasons[0]
                ? localizeProxyTrustReasonText(matched.reasons[0])
                : '',
        };
    });
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        explainability: {
            count: explainRows.length,
            decisionTotals,
            latest: explainRows.length > 0 ? explainRows[explainRows.length - 1] : null,
            rows: explainRows,
        },
        mitigation: buildProxyMitigationTelemetryPayload(),
        correlation: {
            rows: linkedRows,
            successByDecision,
        },
    };
}

async function exportProxyTrustMitigationCorrelation() {
    try {
        const payload = buildProxyTrustMitigationCorrelationPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyTrustMitigationCorrelationCopied', 'Trust/mitigation correlation copied ({rows} rows)', {
            rows: payload.correlation.rows.length,
        }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyTrustMitigationCorrelationExportFailed', 'Export trust/mitigation correlation failed')}: ${err && err.message ? err.message : err}`);
    }
}

function formatProxyTrustMitigationDecisionRate(bucket) {
    const row = bucket && typeof bucket === 'object' ? bucket : { total: 0, success: 0 };
    const total = Number(row.total) || 0;
    const success = Number(row.success) || 0;
    if (total <= 0) return { label: '-', value: 0, total: 0, success: 0 };
    const value = Math.round((success / total) * 1000) / 10;
    return {
        label: `${value}%`,
        value,
        total,
        success,
    };
}

function normalizeProxyTrustMitigationAlertSeverity(input) {
    const raw = String(input || '').trim().toLowerCase();
    if (raw === 'critical') return 'critical';
    if (raw === 'warn') return 'warn';
    return 'ok';
}

function normalizeProxyTrustMitigationAlertEntry(input) {
    if (!input || typeof input !== 'object') return null;
    const savedAt = Number(input.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    const groupId = String(input.groupId || 'manual').trim().slice(0, 80) || 'manual';
    const severity = normalizeProxyTrustMitigationAlertSeverity(input.severity);
    const reason = String(input.reason || '').trim().slice(0, 220);
    const details = Array.isArray(input.details)
        ? input.details.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
        : [];
    const metricsRaw = input.metrics && typeof input.metrics === 'object' ? input.metrics : {};
    const metrics = {
        rows: Math.max(0, Math.min(300, Number.isFinite(Number(metricsRaw.rows)) ? Number(metricsRaw.rows) : 0)),
        linked: Math.max(0, Math.min(300, Number.isFinite(Number(metricsRaw.linked)) ? Number(metricsRaw.linked) : 0)),
        unknown: Math.max(0, Math.min(300, Number.isFinite(Number(metricsRaw.unknown)) ? Number(metricsRaw.unknown) : 0)),
        successRate: Math.max(0, Math.min(100, Number.isFinite(Number(metricsRaw.successRate)) ? Number(metricsRaw.successRate) : 0)),
        warnRate: Math.max(0, Math.min(100, Number.isFinite(Number(metricsRaw.warnRate)) ? Number(metricsRaw.warnRate) : 0)),
        blockRate: Math.max(0, Math.min(100, Number.isFinite(Number(metricsRaw.blockRate)) ? Number(metricsRaw.blockRate) : 0)),
    };
    return {
        savedAt,
        groupId,
        severity,
        reason,
        details,
        metrics,
    };
}

function readProxyTrustMitigationAlertHistoryStore() {
    try {
        const text = localStorage.getItem(PROXY_TRUST_MITIGATION_ALERT_HISTORY_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
            ? parsed.map((item) => normalizeProxyTrustMitigationAlertEntry(item)).filter(Boolean).slice(-PROXY_TRUST_MITIGATION_ALERT_HISTORY_LIMIT)
            : [];
    } catch (e) {
        return [];
    }
}

function writeProxyTrustMitigationAlertHistoryStore(list) {
    try {
        localStorage.setItem(
            PROXY_TRUST_MITIGATION_ALERT_HISTORY_KEY,
            JSON.stringify(Array.isArray(list) ? list : []),
        );
    } catch (e) { }
}

function recordProxyTrustMitigationAlert(entryInput) {
    const entry = normalizeProxyTrustMitigationAlertEntry({ savedAt: Date.now(), ...entryInput });
    if (!entry) return;
    const rows = readProxyTrustMitigationAlertHistoryStore();
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    if (last
        && last.groupId === entry.groupId
        && last.severity === entry.severity
        && last.reason === entry.reason
        && Number(last.metrics && last.metrics.rows || 0) === Number(entry.metrics && entry.metrics.rows || 0)
        && Number(last.metrics && last.metrics.unknown || 0) === Number(entry.metrics && entry.metrics.unknown || 0)
        && Number(last.metrics && last.metrics.successRate || 0) === Number(entry.metrics && entry.metrics.successRate || 0)) {
        return;
    }
    rows.push(entry);
    writeProxyTrustMitigationAlertHistoryStore(rows.slice(-PROXY_TRUST_MITIGATION_ALERT_HISTORY_LIMIT));
}

function getCurrentProxyTrustMitigationAlertList() {
    const key = currentProxyGroup || 'manual';
    return readProxyTrustMitigationAlertHistoryStore()
        .filter((item) => item.groupId === key)
        .slice(-24);
}

function clearCurrentProxyTrustMitigationAlertHistory() {
    const key = currentProxyGroup || 'manual';
    const rows = readProxyTrustMitigationAlertHistoryStore();
    if (rows.length === 0) return 0;
    const keep = rows.filter((item) => item.groupId !== key);
    const removed = rows.length - keep.length;
    if (removed > 0) {
        writeProxyTrustMitigationAlertHistoryStore(keep.slice(-PROXY_TRUST_MITIGATION_ALERT_HISTORY_LIMIT));
    }
    return removed;
}

function buildProxyTrustMitigationAlertRollup(rowsInput = null) {
    const rows = Array.isArray(rowsInput) ? rowsInput : getCurrentProxyTrustMitigationAlertList();
    const normalizedRows = rows
        .map((item) => normalizeProxyTrustMitigationAlertEntry(item))
        .filter(Boolean);
    const totals = { critical: 0, warn: 0, ok: 0 };
    for (const item of normalizedRows) {
        if (item.severity === 'critical') totals.critical += 1;
        else if (item.severity === 'warn') totals.warn += 1;
        else totals.ok += 1;
    }
    const latest = normalizedRows.length > 0 ? normalizedRows[normalizedRows.length - 1] : null;
    let streak = 0;
    let streakSeverity = latest ? latest.severity : 'ok';
    if (latest) {
        for (let i = normalizedRows.length - 1; i >= 0; i -= 1) {
            if (normalizedRows[i].severity !== latest.severity) break;
            streak += 1;
        }
    }
    return {
        count: normalizedRows.length,
        totals,
        latest,
        streak,
        streakSeverity,
    };
}

function evaluateProxyTrustMitigationAlert(payload) {
    const corr = payload && payload.correlation && typeof payload.correlation === 'object' ? payload.correlation : {};
    const rows = Array.isArray(corr.rows) ? corr.rows : [];
    if (rows.length === 0) return null;
    const linkedRows = rows.filter((item) => item && item.explainabilityDecision && item.explainabilityDecision !== 'unknown').length;
    const unknownRows = rows.length - linkedRows;
    const successRows = rows.filter((item) => item && item.status === 'success').length;
    const overallRate = rows.length > 0 ? Math.round((successRows / rows.length) * 1000) / 10 : 0;
    const unknownRate = rows.length > 0 ? Math.round((unknownRows / rows.length) * 1000) / 10 : 0;
    const successByDecision = corr && corr.successByDecision && typeof corr.successByDecision === 'object'
        ? corr.successByDecision
        : {};
    const blockRate = formatProxyTrustMitigationDecisionRate(successByDecision.block);
    const warnRate = formatProxyTrustMitigationDecisionRate(successByDecision.warn);
    const severityRank = { ok: 1, warn: 2, critical: 3 };
    let severity = 'ok';
    const reasons = [];
    const pushSeverity = (next, reason) => {
        const normalized = normalizeProxyTrustMitigationAlertSeverity(next);
        if (severityRank[normalized] > severityRank[severity]) severity = normalized;
        const text = String(reason || '').trim();
        if (text && !reasons.includes(text)) reasons.push(text);
    };
    if (rows.length >= 5 && overallRate < 55) {
        pushSeverity('warn', tFormat('proxyTrustMitigationAlertReasonLowSuccess', 'overall mitigation success drops to {rate}%', {
            rate: overallRate,
        }));
    }
    if (rows.length >= 8 && overallRate < 40) {
        pushSeverity('critical', tFormat('proxyTrustMitigationAlertReasonCriticalSuccess', 'overall mitigation success is critically low at {rate}%', {
            rate: overallRate,
        }));
    }
    if (rows.length >= 5 && unknownRate >= 35) {
        pushSeverity('warn', tFormat('proxyTrustMitigationAlertReasonUnknownLink', 'unknown decision linkage reaches {rate}% ({unknown}/{rows})', {
            rate: unknownRate,
            unknown: unknownRows,
            rows: rows.length,
        }));
    }
    if (rows.length >= 5 && unknownRate >= 55) {
        pushSeverity('critical', tFormat('proxyTrustMitigationAlertReasonCriticalUnknownLink', 'unknown decision linkage is critically high at {rate}%', {
            rate: unknownRate,
        }));
    }
    if (blockRate.total >= 2 && blockRate.value < 50) {
        pushSeverity('warn', tFormat('proxyTrustMitigationAlertReasonBlockRate', 'block-linked mitigation success is low at {rate}%', {
            rate: blockRate.label,
        }));
    }
    if (blockRate.total >= 4 && blockRate.value < 30) {
        pushSeverity('critical', tFormat('proxyTrustMitigationAlertReasonCriticalBlockRate', 'block-linked mitigation success is critically low at {rate}%', {
            rate: blockRate.label,
        }));
    }
    if (reasons.length === 0) {
        reasons.push(tText('proxyTrustMitigationAlertReasonStable', 'correlation health is stable'));
    }
    return normalizeProxyTrustMitigationAlertEntry({
        savedAt: Date.now(),
        groupId: currentProxyGroup || 'manual',
        severity,
        reason: reasons[0],
        details: reasons,
        metrics: {
            rows: rows.length,
            linked: linkedRows,
            unknown: unknownRows,
            successRate: overallRate,
            warnRate: warnRate.value,
            blockRate: blockRate.value,
        },
    });
}

function getProxyTrustMitigationSeverityLabel(input) {
    const severity = normalizeProxyTrustMitigationAlertSeverity(input);
    if (severity === 'critical') return tText('proxyTrustMitigationSeverityCritical', 'critical');
    if (severity === 'warn') return tText('proxyTrustMitigationSeverityWarn', 'warn');
    return tText('proxyTrustMitigationSeverityOk', 'ok');
}

function buildProxyTrustMitigationAlertPayload() {
    const correlation = buildProxyTrustMitigationCorrelationPayload();
    const currentAlert = evaluateProxyTrustMitigationAlert(correlation);
    const rows = getCurrentProxyTrustMitigationAlertList();
    const rollup = buildProxyTrustMitigationAlertRollup(rows);
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        currentAlert,
        rows,
        rollup,
        correlation,
    };
}

async function exportProxyTrustMitigationAlerts() {
    try {
        const payload = buildProxyTrustMitigationAlertPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyTrustMitigationAlertCopied', 'Trust/mitigation alerts copied ({rows} rows)', {
            rows: payload.rows.length,
        }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyTrustMitigationAlertExportFailed', 'Export trust/mitigation alerts failed')}: ${err && err.message ? err.message : err}`);
    }
}

function renderProxyTrustMitigationAlertTrendSummary(rowsInput = null) {
    const el = document.getElementById('proxyTrustMitigationAlertTrendSummary');
    if (!el) return;
    const rollup = buildProxyTrustMitigationAlertRollup(rowsInput);
    if (!rollup || rollup.count <= 0) {
        el.textContent = tText('proxyTrustMitigationAlertTrendInit', 'Alert trend: no history');
        el.title = tText('proxyTrustMitigationAlertTrendHint', 'Trend appears after warn/critical alerts are recorded');
        return;
    }
    const severityLabel = getProxyTrustMitigationSeverityLabel(rollup.streakSeverity);
    el.textContent = tFormat('proxyTrustMitigationAlertTrendSummary', 'Alert trend: critical {critical} · warn {warn} · streak {severity} x{streak}', {
        critical: rollup.totals.critical,
        warn: rollup.totals.warn,
        severity: severityLabel,
        streak: Math.max(rollup.streak, 0),
    });
    const latest = rollup.latest || null;
    const latestTime = latest && Number.isFinite(Number(latest.savedAt))
        ? new Date(Number(latest.savedAt)).toLocaleString()
        : '-';
    const latestReason = latest && latest.reason ? latest.reason : '-';
    el.title = tFormat('proxyTrustMitigationAlertTrendLatest', 'latest: {time} · {reason}', {
        time: latestTime,
        reason: latestReason,
    });
}

async function clearProxyTrustMitigationAlerts() {
    try {
        const removed = clearCurrentProxyTrustMitigationAlertHistory();
        const correlationPayload = buildProxyTrustMitigationCorrelationPayload();
        renderProxyTrustMitigationAlertSummary(correlationPayload, { skipRecord: true });
        showToast(tFormat('proxyTrustMitigationAlertClearToast', 'Correlation alerts cleared ({count} rows)', {
            count: removed,
        }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyTrustMitigationAlertClearFailed', 'Clear correlation alerts failed')}: ${err && err.message ? err.message : err}`);
    }
}

function renderProxyTrustMitigationAlertSummary(correlationPayload = null, options = {}) {
    const el = document.getElementById('proxyTrustMitigationAlertSummary');
    if (!el) return;
    const runtimeOptions = options && typeof options === 'object' ? options : {};
    const payload = correlationPayload && typeof correlationPayload === 'object'
        ? correlationPayload
        : buildProxyTrustMitigationCorrelationPayload();
    const rows = payload && payload.correlation && Array.isArray(payload.correlation.rows)
        ? payload.correlation.rows
        : [];
    const historyRows = getCurrentProxyTrustMitigationAlertList();
    if (rows.length === 0) {
        const explainCount = Number(payload && payload.explainability && payload.explainability.count || 0);
        if (explainCount > 0) {
            el.textContent = tText('proxyTrustMitigationAlertPending', 'Correlation alerts: waiting for mitigation records');
            el.title = tFormat('proxyTrustMitigationAlertPendingHint', 'Explainability packs available: {count}, but no mitigation telemetry yet', {
                count: explainCount,
            });
            renderProxyTrustMitigationAlertTrendSummary(historyRows);
            return;
        }
        el.textContent = tText('proxyTrustMitigationAlertInit', 'Correlation alerts: none');
        el.title = tText('proxyTrustMitigationAlertHint', 'Alerts appear after correlation rows are available');
        renderProxyTrustMitigationAlertTrendSummary(historyRows);
        return;
    }
    const currentAlert = evaluateProxyTrustMitigationAlert(payload);
    if (!currentAlert) {
        el.textContent = tText('proxyTrustMitigationAlertInit', 'Correlation alerts: none');
        el.title = tText('proxyTrustMitigationAlertHint', 'Alerts appear after correlation rows are available');
        renderProxyTrustMitigationAlertTrendSummary(historyRows);
        return;
    }
    if (!runtimeOptions.skipRecord && (currentAlert.severity === 'warn' || currentAlert.severity === 'critical')) {
        recordProxyTrustMitigationAlert(currentAlert);
    }
    const recentAlerts = getCurrentProxyTrustMitigationAlertList();
    const latestAlert = recentAlerts.length > 0 ? recentAlerts[recentAlerts.length - 1] : currentAlert;
    const severityLabel = getProxyTrustMitigationSeverityLabel(currentAlert.severity);
    const metrics = currentAlert.metrics || {};
    el.textContent = tFormat('proxyTrustMitigationAlertSummary', 'Correlation alerts: {severity} · success {successRate}% · unknown {unknown}/{rows}', {
        severity: severityLabel,
        successRate: Number(metrics.successRate || 0),
        unknown: Number(metrics.unknown || 0),
        rows: Number(metrics.rows || 0),
    });
    const latestTime = latestAlert && Number.isFinite(Number(latestAlert.savedAt))
        ? new Date(Number(latestAlert.savedAt)).toLocaleString()
        : '-';
    const detailText = Array.isArray(currentAlert.details) && currentAlert.details.length > 0
        ? currentAlert.details.slice(0, 3).join(' | ')
        : currentAlert.reason;
    el.title = [
        tFormat('proxyTrustMitigationAlertLatest', 'latest alert: {time} · {severity}', {
            time: latestTime,
            severity: severityLabel,
        }),
        tFormat('proxyTrustMitigationAlertReasonLine', 'reason: {reason}', { reason: currentAlert.reason || '-' }),
        tFormat('proxyTrustMitigationAlertDetailsLine', 'details: {details}', { details: detailText || '-' }),
        tFormat('proxyTrustMitigationAlertMetricsLine', 'metrics rows={rows}, linked={linked}, unknown={unknown}', {
            rows: Number(metrics.rows || 0),
            linked: Number(metrics.linked || 0),
            unknown: Number(metrics.unknown || 0),
        }),
        tFormat('proxyTrustMitigationAlertHistoryCountLine', 'alert history: {count}', { count: recentAlerts.length }),
    ].join('\n');
    renderProxyTrustMitigationAlertTrendSummary(recentAlerts);
}

function renderProxyTrustMitigationCorrelationSummary() {
    const el = document.getElementById('proxyTrustMitigationCorrelationSummary');
    if (!el) return;
    const payload = buildProxyTrustMitigationCorrelationPayload();
    const corr = payload && payload.correlation && typeof payload.correlation === 'object' ? payload.correlation : {};
    const rows = Array.isArray(corr.rows) ? corr.rows : [];
    if (rows.length === 0) {
        const explainCount = Number(payload && payload.explainability && payload.explainability.count || 0);
        if (explainCount > 0) {
            el.textContent = tText('proxyTrustMitigationCorrelationPending', 'Trust/mitigation correlation: waiting for mitigation records');
            el.title = tFormat('proxyTrustMitigationCorrelationPendingHint', 'Explainability packs available: {count}, but no mitigation telemetry yet', {
                count: explainCount,
            });
            renderProxyTrustMitigationAlertSummary(payload);
            return;
        }
        el.textContent = tText('proxyTrustMitigationCorrelationInit', 'Trust/mitigation correlation: none');
        el.title = tText('proxyTrustMitigationCorrelationHint', 'Correlation appears after explainability history and mitigation telemetry are both available');
        renderProxyTrustMitigationAlertSummary(payload);
        return;
    }
    const successRows = rows.filter((item) => item && item.status === 'success').length;
    const linkedRows = rows.filter((item) => item && item.explainabilityDecision && item.explainabilityDecision !== 'unknown');
    const unknownRows = rows.length - linkedRows.length;
    const overallRate = rows.length > 0 ? Math.round((successRows / rows.length) * 1000) / 10 : 0;
    const successByDecision = corr && corr.successByDecision && typeof corr.successByDecision === 'object'
        ? corr.successByDecision
        : {};
    const warnRate = formatProxyTrustMitigationDecisionRate(successByDecision.warn);
    const blockRate = formatProxyTrustMitigationDecisionRate(successByDecision.block);
    el.textContent = tFormat(
        'proxyTrustMitigationCorrelationSummary',
        'Trust/mitigation correlation: {rows} · linked {linked} · unknown {unknown} · success {rate}%',
        {
            rows: rows.length,
            linked: linkedRows.length,
            unknown: unknownRows,
            rate: overallRate,
        },
    );
    const latest = rows[rows.length - 1] || null;
    const latestTime = latest && Number.isFinite(Number(latest.savedAt))
        ? new Date(Number(latest.savedAt)).toLocaleString()
        : '-';
    const latestReason = latest && latest.explainabilityReason
        ? latest.explainabilityReason
        : '-';
    el.title = [
        tFormat('proxyTrustMitigationCorrelationLatest', 'latest: {time} · {action} · {status}', {
            time: latestTime,
            action: latest && latest.actionType ? latest.actionType : '-',
            status: latest && latest.status ? latest.status : '-',
        }),
        tFormat('proxyTrustMitigationCorrelationDecisionRateLine', 'warn success: {rate} ({success}/{total})', {
            rate: warnRate.label,
            success: warnRate.success,
            total: warnRate.total,
        }),
        tFormat('proxyTrustMitigationCorrelationDecisionRateLineBlock', 'block success: {rate} ({success}/{total})', {
            rate: blockRate.label,
            success: blockRate.success,
            total: blockRate.total,
        }),
        tFormat('proxyTrustMitigationCorrelationReasonLine', 'latest reason: {reason}', { reason: latestReason }),
    ].join('\n');
    renderProxyTrustMitigationAlertSummary(payload);
}

function renderProxyMitigationTelemetrySummary() {
    const el = document.getElementById('proxyMitigationTelemetrySummary');
    if (!el) return;
    const rows = getCurrentProxyMitigationTelemetryList();
    if (rows.length === 0) {
        el.textContent = tText('proxyMitigationTelemetryInit', 'Mitigation telemetry: none');
        el.title = tText('proxyMitigationTelemetryHint', 'No remediation/mitigation telemetry records for this group');
        renderProxyTrustMitigationCorrelationSummary();
        return;
    }
    const summary = buildProxyMitigationTelemetrySummary(rows);
    el.textContent = tFormat('proxyMitigationTelemetrySummary', 'Mitigation telemetry: {total} · success {rate}%', {
        total: summary.total,
        rate: summary.successRate,
    });
    const latest = summary.latest || null;
    const latestTime = latest && Number.isFinite(Number(latest.savedAt))
        ? new Date(Number(latest.savedAt)).toLocaleString()
        : '-';
    el.title = [
        tFormat('proxyMitigationTelemetryStatusLine', 'status success/noop/failed: {success}/{noop}/{failed}', {
            success: summary.byStatus.success,
            noop: summary.byStatus.noop,
            failed: summary.byStatus.failed,
        }),
        tFormat('proxyMitigationTelemetryActionLine', 'actions issuer/replay: {issuer}/{replay}', {
            issuer: summary.byAction.issuer_remediation,
            replay: summary.byAction.replay_mitigation,
        }),
        tFormat('proxyMitigationTelemetryLatestLine', 'latest: {time} · {status} · {action}', {
            time: latestTime,
            status: latest ? latest.status : '-',
            action: latest ? latest.actionType : '-',
        }),
    ].join('\n');
    renderProxyTrustMitigationCorrelationSummary();
}

async function exportProxyMitigationTelemetry() {
    try {
        const payload = buildProxyMitigationTelemetryPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyMitigationTelemetryCopied', 'Mitigation telemetry copied ({rows} rows)', {
            rows: payload.rows.length,
        }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyMitigationTelemetryExportFailed', 'Export mitigation telemetry failed')}: ${err && err.message ? err.message : err}`);
    }
}

async function exportProxyPresetProvenanceDiff() {
    try {
        const history = readProxyPresetProvenanceStore();
        const payload = {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            history,
            latestDiff: buildProxyPresetProvenanceDiff(history),
            latestTrustGate: getLatestProxyPresetTrustGateState(history),
            currentDriftAudit: buildProxyPresetPolicyDriftAudit(),
            trustExceptionAudit: buildProxyTrustGateExceptionAuditPayload(),
        };
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyPresetProvenanceCopied', 'Preset provenance copied ({entries} entries)', { entries: history.length }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyPresetProvenanceExportFailed', 'Export preset provenance failed')}: ${err && err.message ? err.message : err}`);
    }
}

function buildProxyPresetPolicyDriftAudit() {
    const templateDef = resolveProxyPresetIssuerTemplateDefinition(proxyPresetIssuerTemplate);
    const current = {
        template: normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate),
        trustPolicy: normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy),
        signerKeyId: normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
        pinnedKeys: normalizeSignerKeyListForCompare(proxyPresetPinnedKeys),
    };
    const expected = {
        template: templateDef.key,
        trustPolicy: normalizeProxyPresetTrustPolicy(templateDef.trustPolicy),
        signerKeyId: normalizeProxySignerKeyId(templateDef.signerKeyId, 'local-default'),
        pinnedKeys: normalizeSignerKeyListForCompare(templateDef.pinnedKeys),
    };
    const driftItems = [];
    if (current.trustPolicy !== expected.trustPolicy) {
        driftItems.push({ field: 'trustPolicy', expected: expected.trustPolicy, actual: current.trustPolicy });
    }
    if (current.signerKeyId !== expected.signerKeyId) {
        driftItems.push({ field: 'signerKeyId', expected: expected.signerKeyId, actual: current.signerKeyId });
    }
    const expectedPinsText = expected.pinnedKeys.join(',');
    const currentPinsText = current.pinnedKeys.join(',');
    if (expectedPinsText !== currentPinsText) {
        driftItems.push({ field: 'pinnedKeys', expected: expected.pinnedKeys, actual: current.pinnedKeys });
    }
    const trend = getCurrentProxyGroupFailTrend();
    const trendDiffPack = buildProxyTrendDiffPack(trend);
    const trendAnomalyBadges = buildProxyTrendAnomalyBadges(trendDiffPack);
    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        template: {
            key: templateDef.key,
            label: formatProxyIssuerTemplateLabel(templateDef.key),
            summary: templateDef.summary,
        },
        current,
        expected,
        driftCount: driftItems.length,
        driftItems,
        trendDiffPack,
        trendAnomalyBadges,
    };
}

function renderProxyPresetPolicyDriftSummary() {
    const driftEl = document.getElementById('proxyPresetPolicyDrift');
    if (!driftEl) return;
    const audit = buildProxyPresetPolicyDriftAudit();
    if (!audit.driftCount) {
        driftEl.textContent = tText('proxyPresetPolicyDriftInit', 'Policy drift: none');
        driftEl.title = tFormat('proxyPresetPolicyDriftHint', 'Template {template} matches current trust settings', {
            template: audit.template.label,
        });
        return;
    }
    driftEl.textContent = tFormat('proxyPresetPolicyDriftSummary', 'Policy drift: {count} mismatches', {
        count: audit.driftCount,
    });
    driftEl.title = audit.driftItems
        .slice(0, 4)
        .map((item) => tFormat('proxyPresetPolicyDriftItem', '{field}: expected={expected} actual={actual}', {
            field: item.field,
            expected: JSON.stringify(item.expected),
            actual: JSON.stringify(item.actual),
        }))
        .join('\n');
}

async function exportProxyPresetPolicyDriftAudit() {
    try {
        const audit = buildProxyPresetPolicyDriftAudit();
        await copyTextToClipboard(JSON.stringify(audit));
        const driftText = audit.driftCount > 0
            ? tFormat('proxyPresetPolicyDriftCount', '{count} mismatches', { count: audit.driftCount })
            : tText('proxyPresetPolicyDriftNoDrift', 'no drift');
        showToast(tFormat('proxyPresetPolicyDriftCopied', 'Policy drift audit copied · {drift}', { drift: driftText }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyPresetPolicyDriftExportFailed', 'Export policy drift audit failed')}: ${err && err.message ? err.message : err}`);
    }
}

function applyProxyPresetTrustPolicyToControl() {
    const select = document.getElementById('proxyPresetTrustPolicy');
    if (!select) return;
    const value = normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy);
    if (select.value !== value) select.value = value;
    updateProxyPresetTrustSummary();
}

function renderProxyReplayRouteSummary() {
    const summaryEl = document.getElementById('proxyReplayRouteSummary');
    if (!summaryEl) return;
    const mode = normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode);
    const modeLabel = formatProxyReplayRouteModeLabel(mode);
    const map = normalizeProxyReplayRouteMap(proxyReplayRouteMap);
    const mapCount = Object.keys(map).length;
    summaryEl.textContent = tFormat('proxyReplayRouteSummaryLine', 'Replay route: {mode} · map {count}', {
        mode: modeLabel,
        count: mapCount,
    });
    summaryEl.title = mapCount > 0
        ? Object.entries(map)
            .slice(0, 5)
            .map(([source, target]) => `${source} => ${target}`)
            .join('\n')
        : tText('proxyReplayRouteSummaryEmptyHint', 'No replay route map entries');
}

function applyProxyReplayImportRouteModeToControl() {
    const select = document.getElementById('proxyReplayImportRouteMode');
    if (!select) return;
    const mode = normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode);
    if (select.value !== mode) select.value = mode;
    renderProxyReplayRouteSummary();
    renderProxyReplayRouteDriftSummary();
    renderProxyReplayRouteMitigationHint();
}

function manageProxyReplayRouteMap() {
    const existingMap = normalizeProxyReplayRouteMap(proxyReplayRouteMap);
    const currentText = Object.entries(existingMap).map(([source, target]) => `${source}=${target}`).join('\n');
    showInput(tText('proxyReplayRouteMapInputTitle', 'Replay route map (source=target per line)'), (value) => {
        const parsed = parseProxyReplayRouteMapText(value);
        if (parsed.invalid.length > 0) {
            showAlert(`${tText('proxyReplayRouteMapInvalid', 'Invalid replay route lines')}:\n${parsed.invalid.slice(0, 8).join('\n')}`);
            return;
        }
        proxyReplayRouteMap = parsed.map;
        persistProxyReplayRouteMap();
        renderProxyReplayRouteSummary();
        renderProxyReplayRouteDriftSummary();
        renderProxyReplayRouteMitigationHint();
        showToast(
            tFormat('proxyReplayRouteMapSaved', 'Replay route map saved ({count})', {
                count: Object.keys(proxyReplayRouteMap).length,
            }),
            1800,
        );
    });
    const inputEl = document.getElementById('inputModalValue');
    if (inputEl) inputEl.value = currentText;
}

function resolveProxyReplayImportTargetGroup(payloadGroupId) {
    const payloadGroup = String(payloadGroupId || '').trim() || 'manual';
    const currentGroup = currentProxyGroup || 'manual';
    const mode = normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode);
    const map = normalizeProxyReplayRouteMap(proxyReplayRouteMap);
    if (mode === 'current') {
        return { targetGroup: currentGroup, route: 'current', mode, payloadGroup, currentGroup };
    }
    const mappedTarget = Object.prototype.hasOwnProperty.call(map, payloadGroup)
        ? String(map[payloadGroup] || '').trim()
        : '';
    if (mappedTarget) {
        return { targetGroup: mappedTarget, route: `mapped:${payloadGroup}`, mode, payloadGroup, currentGroup };
    }
    return {
        targetGroup: payloadGroup,
        route: mode === 'mapped' ? `mapped-miss:${payloadGroup}` : 'payload',
        mode,
        payloadGroup,
        currentGroup,
    };
}

function normalizeProxyReplayRouteDriftEntry(input) {
    if (!input || typeof input !== 'object') return null;
    const savedAt = Number(input.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    const targetGroup = String(input.targetGroup || '').trim().slice(0, 80);
    const payloadGroup = String(input.payloadGroup || '').trim().slice(0, 80);
    if (!targetGroup || !payloadGroup) return null;
    const route = String(input.route || '').trim().slice(0, 120);
    const mode = normalizeProxyReplayImportRouteMode(input.mode);
    const kind = String(input.kind || 'reroute').trim().slice(0, 40);
    const detail = String(input.detail || '').trim().slice(0, 200);
    const mitigationHint = String(input.mitigationHint || '').trim().slice(0, 220);
    const recommendedModeRaw = String(input.recommendedMode || '').trim();
    const recommendedMode = recommendedModeRaw ? normalizeProxyReplayImportRouteMode(recommendedModeRaw) : '';
    const suggestedMapEntry = input && typeof input === 'object' && input.suggestedMapEntry && typeof input.suggestedMapEntry === 'object'
        ? {
            source: String(input.suggestedMapEntry.source || '').trim().slice(0, 80),
            target: String(input.suggestedMapEntry.target || '').trim().slice(0, 80),
        }
        : null;
    return {
        savedAt,
        targetGroup,
        payloadGroup,
        route,
        mode,
        kind,
        detail,
        mitigationHint,
        recommendedMode,
        suggestedMapEntry: suggestedMapEntry && suggestedMapEntry.source && suggestedMapEntry.target ? suggestedMapEntry : null,
    };
}

function readProxyReplayRouteDriftStore() {
    try {
        const text = localStorage.getItem(PROXY_REPLAY_ROUTE_DRIFT_KEY);
        if (!text) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
            ? parsed.map((item) => normalizeProxyReplayRouteDriftEntry(item)).filter(Boolean).slice(-PROXY_REPLAY_ROUTE_DRIFT_LIMIT)
            : [];
    } catch (e) {
        return [];
    }
}

function writeProxyReplayRouteDriftStore(list) {
    try {
        localStorage.setItem(PROXY_REPLAY_ROUTE_DRIFT_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function recordProxyReplayRouteDrift(entryInput) {
    const entry = normalizeProxyReplayRouteDriftEntry({ savedAt: Date.now(), ...entryInput });
    if (!entry) return;
    const rows = readProxyReplayRouteDriftStore();
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    if (last
        && last.targetGroup === entry.targetGroup
        && last.payloadGroup === entry.payloadGroup
        && last.mode === entry.mode
        && last.route === entry.route
        && last.kind === entry.kind
        && Math.abs(entry.savedAt - last.savedAt) < 4000) {
        return;
    }
    rows.push(entry);
    writeProxyReplayRouteDriftStore(rows.slice(-PROXY_REPLAY_ROUTE_DRIFT_LIMIT));
}

function detectProxyReplayRouteDrift(routeMeta) {
    const meta = routeMeta && typeof routeMeta === 'object' ? routeMeta : {};
    const targetGroup = String(meta.targetGroup || '').trim();
    const payloadGroup = String(meta.payloadGroup || '').trim();
    const currentGroup = String(meta.currentGroup || '').trim();
    const mode = normalizeProxyReplayImportRouteMode(meta.mode);
    if (!targetGroup || !payloadGroup) return null;
    if (targetGroup !== payloadGroup) {
        const rerouteKind = mode === 'current' ? 'forced-current' : (mode === 'mapped' ? 'mapped-reroute' : 'reroute');
        const mitigation = rerouteKind === 'forced-current'
            ? {
                mitigationHint: tFormat(
                    'proxyReplayMitigationForcedCurrent',
                    'Payload group {payload} is forced to current group {target}; switch to payload/mapped mode if this is unintended',
                    { payload: payloadGroup, target: targetGroup },
                ),
                recommendedMode: 'payload',
                suggestedMapEntry: { source: payloadGroup, target: targetGroup },
            }
            : rerouteKind === 'mapped-reroute'
                ? {
                    mitigationHint: tFormat(
                        'proxyReplayMitigationMappedReroute',
                        'Route map overrides payload {payload} to {target}; verify this mapping or switch to payload mode',
                        { payload: payloadGroup, target: targetGroup },
                    ),
                    recommendedMode: 'payload',
                    suggestedMapEntry: { source: payloadGroup, target: targetGroup },
                }
                : {
                    mitigationHint: tFormat(
                        'proxyReplayMitigationReroute',
                        'Replay routed {payload} -> {target}; add an explicit map entry if this should stay stable',
                        { payload: payloadGroup, target: targetGroup },
                    ),
                    recommendedMode: mode,
                    suggestedMapEntry: { source: payloadGroup, target: targetGroup },
                };
        return {
            targetGroup,
            payloadGroup,
            route: String(meta.route || '').trim(),
            mode,
            kind: rerouteKind,
            detail: tFormat('proxyReplayDriftDetailReroute', 'replay routed {payload} -> {target}', {
                payload: payloadGroup,
                target: targetGroup,
            }),
            mitigationHint: mitigation.mitigationHint,
            recommendedMode: mitigation.recommendedMode,
            suggestedMapEntry: mitigation.suggestedMapEntry,
        };
    }
    if (mode === 'mapped' && String(meta.route || '').startsWith('mapped-miss:')) {
        return {
            targetGroup,
            payloadGroup,
            route: String(meta.route || '').trim(),
            mode,
            kind: 'mapping-miss',
            detail: tFormat(
                'proxyReplayDriftDetailMappingMiss',
                'no mapping for payload group {payload}{currentSuffix}',
                { payload: payloadGroup, currentSuffix: currentGroup ? ` (${tText('proxyWordCurrent', 'current')} ${currentGroup})` : '' },
            ),
            mitigationHint: tFormat(
                'proxyReplayMitigationMappingMiss',
                'Add route map {payload} => {target} or switch replay route mode to payload',
                { payload: payloadGroup, target: targetGroup },
            ),
            recommendedMode: 'mapped',
            suggestedMapEntry: { source: payloadGroup, target: targetGroup },
        };
    }
    return null;
}

function getCurrentProxyReplayRouteDriftList() {
    const key = currentProxyGroup || 'manual';
    return readProxyReplayRouteDriftStore()
        .filter((item) => item.targetGroup === key)
        .slice(-24);
}

function buildProxyReplayRouteDriftAuditPayload() {
    const rows = getCurrentProxyReplayRouteDriftList();
    const kindTotals = {};
    const mitigationHints = [];
    rows.forEach((item) => {
        const key = item.kind || 'unknown';
        kindTotals[key] = Number(kindTotals[key] || 0) + 1;
        if (item.mitigationHint && !mitigationHints.includes(item.mitigationHint)) {
            mitigationHints.push(item.mitigationHint);
        }
    });
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        routeMode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
        rows,
        kindTotals,
        mitigationHints: mitigationHints.slice(0, 8),
    };
}

function renderProxyReplayRouteDriftSummary() {
    const el = document.getElementById('proxyReplayRouteDriftSummary');
    if (!el) return;
    const rows = getCurrentProxyReplayRouteDriftList();
    if (rows.length === 0) {
        el.textContent = tText('proxyReplayRouteDriftInit', 'Replay route drift: none');
        el.title = tText('proxyReplayRouteDriftHint', 'No replay route drift events for this group');
        return;
    }
    const latest = rows[rows.length - 1];
    const kindLabel = formatProxyReplayDriftKindLabel(latest.kind);
    const detailText = localizeProxyReplayDriftText(latest.detail || '');
    const mitigationText = localizeProxyReplayDriftText(latest.mitigationHint || '');
    el.textContent = tFormat('proxyReplayRouteDriftSummary', 'Replay route drift: {count} · latest {kind}', {
        count: rows.length,
        kind: kindLabel,
    });
    const latestTime = Number.isFinite(Number(latest.savedAt))
        ? new Date(Number(latest.savedAt)).toLocaleString()
        : '-';
    el.title = [
        tFormat('proxyReplayRouteDriftLatest', 'latest: {kind} @ {time}', {
            kind: kindLabel,
            time: latestTime,
        }),
        tFormat('proxyReplayRouteDriftPayloadTarget', 'payload={payload}, target={target}', {
            payload: latest.payloadGroup,
            target: latest.targetGroup,
        }),
        latest.route
            ? tFormat('proxyReplayRouteDriftRouteLine', 'route={route}', { route: latest.route })
            : tFormat('proxyReplayRouteDriftRouteLine', 'route={route}', { route: '-' }),
        detailText
            ? tFormat('proxyReplayRouteDriftDetailLine', 'detail={detail}', { detail: detailText })
            : tFormat('proxyReplayRouteDriftDetailLine', 'detail={detail}', { detail: '-' }),
        mitigationText
            ? tFormat('proxyReplayRouteDriftMitigationLine', 'mitigation={mitigation}', { mitigation: mitigationText })
            : tFormat('proxyReplayRouteDriftMitigationLine', 'mitigation={mitigation}', { mitigation: '-' }),
    ].join('\n');
}

async function exportProxyReplayRouteDriftAudit() {
    try {
        const payload = buildProxyReplayRouteDriftAuditPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyReplayRouteDriftCopied', 'Replay route drift copied ({rows} rows)', { rows: payload.rows.length }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyReplayRouteDriftExportFailed', 'Export replay route drift failed')}: ${err && err.message ? err.message : err}`);
    }
}

function renderProxyReplayRouteMitigationHint() {
    const el = document.getElementById('proxyReplayRouteMitigationHint');
    if (!el) return;
    const rows = getCurrentProxyReplayRouteDriftList();
    if (rows.length === 0) {
        el.textContent = tText('proxyReplayMitigationInit', 'Replay mitigation: none');
        el.title = tText('proxyReplayMitigationHintEmpty', 'No replay route mitigation hints available');
        return;
    }
    const latest = rows[rows.length - 1];
    const localizedHint = localizeProxyReplayDriftText(latest.mitigationHint || '');
    if (!localizedHint) {
        el.textContent = tText('proxyReplayMitigationInit', 'Replay mitigation: none');
        el.title = tText('proxyReplayMitigationNoHint', 'Latest drift event has no mitigation hint');
        return;
    }
    const modeText = latest.recommendedMode
        ? ` · ${tText('proxyWordMode', 'mode')} ${formatProxyReplayRouteModeLabel(latest.recommendedMode)}`
        : '';
    el.textContent = `${tText('proxyReplayMitigationPrefix', 'Replay mitigation')}: ${localizedHint}${modeText}`;
    el.title = [
        latest.suggestedMapEntry
            ? tFormat('proxyReplayMitigationMapLine', 'map: {source} => {target}', {
                source: latest.suggestedMapEntry.source,
                target: latest.suggestedMapEntry.target,
            })
            : tFormat('proxyReplayMitigationMapLine', 'map: {source} => {target}', { source: '-', target: '-' }),
        latest.recommendedMode
            ? tFormat('proxyReplayMitigationRecommendedModeLine', 'recommended mode: {mode}', {
                mode: formatProxyReplayRouteModeLabel(latest.recommendedMode),
            })
            : tFormat('proxyReplayMitigationRecommendedModeLine', 'recommended mode: {mode}', { mode: '-' }),
    ].join('\n');
}

function applyProxyReplayMitigationHint() {
    const groupId = currentProxyGroup || 'manual';
    const rows = getCurrentProxyReplayRouteDriftList();
    if (rows.length === 0) {
        recordProxyMitigationTelemetry({
            actionType: 'replay_mitigation',
            status: 'noop',
            groupId,
            detail: tText('proxyReplayMitigationUnavailable', 'No replay route mitigation hint available'),
            changedCount: 0,
            beforeState: {
                mode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
                routeMapSize: Object.keys(normalizeProxyReplayRouteMap(proxyReplayRouteMap)).length,
            },
            afterState: {
                mode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
                routeMapSize: Object.keys(normalizeProxyReplayRouteMap(proxyReplayRouteMap)).length,
            },
        });
        renderProxyMitigationTelemetrySummary();
        showToast(tText('proxyReplayMitigationUnavailable', 'No replay route mitigation hint available'), 1600);
        return;
    }
    const latest = rows[rows.length - 1];
    const beforeState = {
        mode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
        routeMapSize: Object.keys(normalizeProxyReplayRouteMap(proxyReplayRouteMap)).length,
        driftKind: latest.kind || '',
        suggestedMapSource: latest.suggestedMapEntry && latest.suggestedMapEntry.source ? latest.suggestedMapEntry.source : '',
        suggestedMapTarget: latest.suggestedMapEntry && latest.suggestedMapEntry.target ? latest.suggestedMapEntry.target : '',
    };
    let changed = false;
    let changedCount = 0;
    try {
        if (latest.suggestedMapEntry && latest.suggestedMapEntry.source && latest.suggestedMapEntry.target) {
            const normalizedMap = normalizeProxyReplayRouteMap(proxyReplayRouteMap);
            const previousTarget = String(normalizedMap[latest.suggestedMapEntry.source] || '').trim();
            const target = latest.suggestedMapEntry.target;
            if (previousTarget !== target) {
                proxyReplayRouteMap = normalizeProxyReplayRouteMap({
                    ...normalizedMap,
                    [latest.suggestedMapEntry.source]: target,
                });
                persistProxyReplayRouteMap();
                changed = true;
                changedCount += 1;
            }
        }
        if (latest.recommendedMode) {
            const targetMode = normalizeProxyReplayImportRouteMode(latest.recommendedMode);
            if (proxyReplayImportRouteMode !== targetMode) {
                proxyReplayImportRouteMode = targetMode;
                persistProxyReplayImportRouteMode();
                changed = true;
                changedCount += 1;
            }
        }
        applyProxyReplayImportRouteModeToControl();
        renderProxyReplayRouteSummary();
        renderProxyReplayRouteDriftSummary();
        renderProxyReplayRouteMitigationHint();
        const afterState = {
            mode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
            routeMapSize: Object.keys(normalizeProxyReplayRouteMap(proxyReplayRouteMap)).length,
            driftKind: latest.kind || '',
            suggestedMapSource: latest.suggestedMapEntry && latest.suggestedMapEntry.source ? latest.suggestedMapEntry.source : '',
            suggestedMapTarget: latest.suggestedMapEntry && latest.suggestedMapEntry.target ? latest.suggestedMapEntry.target : '',
        };
        const status = changed ? 'success' : 'noop';
        recordProxyMitigationTelemetry({
            actionType: 'replay_mitigation',
            status,
            groupId,
            detail: changed
                ? tText('proxyReplayMitigationApplied', 'Replay mitigation applied')
                : tText('proxyReplayMitigationAlreadySatisfied', 'Replay mitigation already satisfied'),
            changedCount,
            beforeState,
            afterState,
        });
        renderProxyMitigationTelemetrySummary();
        showToast(
            changed
                ? tText('proxyReplayMitigationApplied', 'Replay mitigation applied')
                : tText('proxyReplayMitigationAlreadySatisfied', 'Replay mitigation already satisfied'),
            1800,
        );
    } catch (err) {
        recordProxyMitigationTelemetry({
            actionType: 'replay_mitigation',
            status: 'failed',
            groupId,
            detail: err && err.message ? err.message : String(err),
            changedCount,
            beforeState,
            afterState: {
                mode: normalizeProxyReplayImportRouteMode(proxyReplayImportRouteMode),
                routeMapSize: Object.keys(normalizeProxyReplayRouteMap(proxyReplayRouteMap)).length,
            },
        });
        renderProxyMitigationTelemetrySummary();
        showAlert(`${tText('proxyReplayMitigationApplyFailed', 'Apply replay mitigation failed')}: ${err && err.message ? err.message : err}`);
    }
}

function renderProxyIssuerTemplateRemediationHint() {
    const el = document.getElementById('proxyIssuerTemplateRemediation');
    if (!el) return;
    const hint = normalizeProxyIssuerRemediationHint(proxyIssuerTemplateRemediationHint);
    if (!hint) {
        el.textContent = tText('proxyIssuerRemediationInit', 'Issuer remediation: none');
        el.title = tText('proxyIssuerRemediationHintEmpty', 'No remediation suggestion at the moment');
        return;
    }
    const confidenceText = Number.isFinite(Number(hint.confidenceScore))
        ? tFormat('proxyIssuerRemediationConfidenceInline', ' · conf {score} ({level})', {
            score: hint.confidenceScore,
            level: hint.confidenceLevel || tText('proxyTrendValueNA', 'n/a'),
        })
        : '';
    const templateText = hint.recommendedTemplate && hint.recommendedTemplate !== 'custom'
        ? ` -> ${hint.recommendedTemplate}`
        : '';
    el.textContent = tFormat('proxyIssuerRemediationSummary', 'Issuer remediation: {summary}{templateText}{confidenceText}', {
        summary: hint.summary,
        templateText,
        confidenceText,
    });
    el.title = [
        hint.reason
            ? tFormat('proxyIssuerRemediationReasonLine', 'reason: {reason}', { reason: hint.reason })
            : tFormat('proxyIssuerRemediationReasonLine', 'reason: {reason}', { reason: '-' }),
        hint.note
            ? tFormat('proxyIssuerRemediationNoteLine', 'note: {note}', { note: hint.note })
            : tFormat('proxyIssuerRemediationNoteLine', 'note: {note}', { note: '-' }),
        hint.recommendedSignerKeyId
            ? tFormat('proxyIssuerRemediationSignerLine', 'signer: {signer}', { signer: hint.recommendedSignerKeyId })
            : tFormat('proxyIssuerRemediationSignerLine', 'signer: {signer}', { signer: '-' }),
        Number.isFinite(Number(hint.confidenceScore))
            ? tFormat('proxyIssuerRemediationConfidenceLine', 'confidence: {score} ({level})', {
                score: hint.confidenceScore,
                level: hint.confidenceLevel || tText('proxyTrendValueNA', 'n/a'),
            })
            : tFormat('proxyIssuerRemediationConfidenceLine', 'confidence: {score} ({level})', { score: '-', level: '-' }),
    ].join('\n');
}

function applyProxyIssuerTemplateRemediationHint() {
    const groupId = currentProxyGroup || 'manual';
    const hint = normalizeProxyIssuerRemediationHint(proxyIssuerTemplateRemediationHint);
    const beforeState = {
        template: normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate),
        signerKeyId: normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
        trustPolicy: normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy),
        pinnedCount: normalizeSignerKeyListForCompare(proxyPresetPinnedKeys).length,
        hintSummary: hint && hint.summary ? hint.summary : '',
    };
    if (!hint) {
        recordProxyMitigationTelemetry({
            actionType: 'issuer_remediation',
            status: 'noop',
            groupId,
            detail: tText('proxyIssuerRemediationUnavailable', 'No issuer remediation suggestion available'),
            changedCount: 0,
            beforeState,
            afterState: beforeState,
        });
        renderProxyMitigationTelemetrySummary();
        showToast(tText('proxyIssuerRemediationUnavailable', 'No issuer remediation suggestion available'), 1600);
        return;
    }
    let remediationStatus = 'success';
    try {
        if (hint.recommendedSignerKeyId) {
            proxyPresetSignerKeyId = normalizeProxySignerKeyId(hint.recommendedSignerKeyId, proxyPresetSignerKeyId);
            persistProxyPresetSignerKeyId();
        }
        if (hint.recommendedTemplate && hint.recommendedTemplate !== 'custom') {
            applyProxyIssuerPolicyTemplate(hint.recommendedTemplate);
        } else {
            updateProxyPresetTrustSummary();
        }
        const afterState = {
            template: normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate),
            signerKeyId: normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
            trustPolicy: normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy),
            pinnedCount: normalizeSignerKeyListForCompare(proxyPresetPinnedKeys).length,
            hintSummary: hint.summary || '',
        };
        const changedFields = ['template', 'signerKeyId', 'trustPolicy', 'pinnedCount']
            .filter((key) => String(beforeState[key]) !== String(afterState[key]));
        const changedCount = changedFields.length;
        const status = changedCount > 0 ? 'success' : 'noop';
        remediationStatus = status;
        recordProxyMitigationTelemetry({
            actionType: 'issuer_remediation',
            status,
            groupId,
            detail: status === 'success'
                ? tFormat('proxyIssuerRemediationApplied', 'Issuer remediation applied: {summary}', { summary: hint.summary })
                : tText('proxyIssuerRemediationAlreadySatisfied', 'Issuer remediation already satisfied'),
            changedCount,
            beforeState,
            afterState,
        });
        renderProxyMitigationTelemetrySummary();
    } catch (err) {
        recordProxyMitigationTelemetry({
            actionType: 'issuer_remediation',
            status: 'failed',
            groupId,
            detail: err && err.message ? err.message : String(err),
            changedCount: 0,
            beforeState,
            afterState: {
                template: normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate),
                signerKeyId: normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
                trustPolicy: normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy),
                pinnedCount: normalizeSignerKeyListForCompare(proxyPresetPinnedKeys).length,
            },
        });
        renderProxyMitigationTelemetrySummary();
        showAlert(`${tText('proxyIssuerRemediationApplyFailed', 'Apply issuer remediation failed')}: ${err && err.message ? err.message : err}`);
        return;
    }
    proxyIssuerTemplateRemediationHint = null;
    persistProxyIssuerTemplateRemediationHint();
    renderProxyIssuerTemplateRemediationHint();
    const currentPack = getCurrentProxyTrustExplainabilityPack();
    if (currentPack) {
        setProxyTrustExplainabilityPack({
            ...currentPack,
            remediationHint: null,
            generatedAt: Date.now(),
        });
    }
    showToast(
        remediationStatus === 'success'
            ? tFormat('proxyIssuerRemediationApplied', 'Issuer remediation applied: {summary}', { summary: hint.summary })
            : tText('proxyIssuerRemediationAlreadySatisfied', 'Issuer remediation already satisfied'),
        2200,
    );
}

function getProxyQueryPresetMap() {
    return { ...PROXY_QUERY_PRESETS, ...normalizeProxyCustomQueryPresets(proxyCustomQueryPresets) };
}

function toProxyCustomPresetKey(name) {
    const slug = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 24);
    return `custom_${slug || 'preset'}`;
}

function ensureUniqueProxyCustomPresetKey(baseKey) {
    const map = getProxyQueryPresetMap();
    if (!Object.prototype.hasOwnProperty.call(map, baseKey)) return baseKey;
    for (let i = 2; i <= 99; i += 1) {
        const key = `${baseKey}_${i}`;
        if (!Object.prototype.hasOwnProperty.call(map, key)) return key;
    }
    return `${baseKey}_${Date.now().toString(36)}`.slice(0, 31);
}

function normalizeStableObject(value) {
    if (Array.isArray(value)) return value.map((item) => normalizeStableObject(item));
    if (value && typeof value === 'object') {
        const out = {};
        Object.keys(value)
            .sort((a, b) => a.localeCompare(b))
            .forEach((key) => {
                out[key] = normalizeStableObject(value[key]);
            });
        return out;
    }
    return value;
}

function stableStringify(value) {
    return JSON.stringify(normalizeStableObject(value));
}

function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Text(text) {
    const cryptoApi = (typeof globalThis !== 'undefined' && globalThis.crypto) ? globalThis.crypto : null;
    if (!cryptoApi || !cryptoApi.subtle || typeof TextEncoder === 'undefined') {
        throw new Error('crypto.subtle unavailable');
    }
    const data = new TextEncoder().encode(String(text || ''));
    const digest = await cryptoApi.subtle.digest('SHA-256', data);
    return bufferToHex(digest);
}

async function copyTextToClipboard(text) {
    const payload = String(text == null ? '' : text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(payload);
            return;
        } catch (e) { }
    }
    const ta = document.createElement('textarea');
    ta.value = payload;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
}

function normalizeSignedPresetBundle(parsed) {
    if (!parsed || typeof parsed !== 'object') throw new Error(tText('proxyPresetSetErrObject', 'invalid preset payload object'));
    const custom = parsed.customPresets || parsed.presets || parsed;
    return {
        payload: parsed,
        presets: normalizeProxyCustomQueryPresets(custom),
    };
}

async function buildSignedProxyPresetBundle(customPresets) {
    const signerKeyId = normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default');
    const issuerPolicyTemplate = normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate);
    const unsigned = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        customPresets: normalizeProxyCustomQueryPresets(customPresets),
    };
    const canonical = stableStringify(unsigned);
    const sha256 = await sha256Text(canonical);
    return {
        ...unsigned,
        signature: {
            algorithm: 'SHA-256',
            mode: 'stable-json-v1',
            canonicalHash: sha256,
            signerKeyId,
            issuerPolicyTemplate,
            signedAt: new Date().toISOString(),
        },
    };
}

async function verifySignedProxyPresetBundle(payload) {
    const signature = payload && typeof payload === 'object' ? payload.signature : null;
    if (!signature || typeof signature !== 'object') {
        return { ok: true, signed: false, warning: tText('proxyTrustUnsignedWarningShort', 'unsigned preset bundle') };
    }
    const algorithm = String(signature.algorithm || '').toUpperCase();
    if (algorithm !== 'SHA-256') {
        throw new Error(tFormat('proxyPresetSignatureErrAlgorithm', 'unsupported signature algorithm: {algorithm}', {
            algorithm: signature.algorithm || '-',
        }));
    }
    const expected = String(signature.canonicalHash || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected)) {
        throw new Error(tText('proxyPresetSignatureErrHashFormat', 'invalid signature hash format'));
    }
    const signerKeyId = normalizeProxySignerKeyId(signature.signerKeyId, '');
    const unsignedPayload = {
        ...payload,
        signature: undefined,
    };
    delete unsignedPayload.signature;
    const canonical = stableStringify(unsignedPayload);
    const actual = await sha256Text(canonical);
    if (actual !== expected) {
        throw new Error(tText('proxyPresetSignatureErrMismatch', 'preset bundle signature mismatch'));
    }
    return {
        ok: true,
        signed: true,
        hash: actual,
        signerKeyId: signerKeyId || null,
        issuerPolicyTemplate: normalizeProxyPresetIssuerTemplate(signature.issuerPolicyTemplate),
    };
}

function renderProxyCustomPresetButtons() {
    const container = document.getElementById('proxyCustomPresetList');
    if (!container) return;
    container.textContent = '';
    const entries = Object.entries(normalizeProxyCustomQueryPresets(proxyCustomQueryPresets));
    if (entries.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    entries.sort((a, b) => String(a[1].label || a[0]).localeCompare(String(b[1].label || b[0])));
    entries.forEach(([key, preset]) => {
        const btn = document.createElement('button');
        btn.className = 'outline';
        btn.setAttribute('data-action', 'apply-proxy-query-preset');
        btn.setAttribute('data-action-arg', key);
        btn.setAttribute('data-proxy-preset', key);
        btn.textContent = preset.label || key;
        container.appendChild(btn);
    });
}

async function exportProxyQueryPresetSet() {
    try {
        const payload = await buildSignedProxyPresetBundle(proxyCustomQueryPresets);
        const verifyMeta = {
            hash: payload && payload.signature ? payload.signature.canonicalHash : '',
            signerKeyId: payload && payload.signature ? payload.signature.signerKeyId : '',
            issuerPolicyTemplate: payload && payload.signature ? payload.signature.issuerPolicyTemplate : 'custom',
        };
        recordProxyPresetProvenance(
            'export',
            payload,
            verifyMeta,
            payload && payload.customPresets ? payload.customPresets : proxyCustomQueryPresets,
            { decision: 'allow', reasons: ['export bundle generated'] },
        );
        renderProxyPresetProvenanceDiff();
        renderProxyPresetTrustGateStatus();
        const text = JSON.stringify(payload);
        await copyTextToClipboard(text);
        const total = Object.keys(payload.customPresets || {}).length;
        const hash = payload.signature && payload.signature.canonicalHash ? payload.signature.canonicalHash.slice(0, 8) : 'nosig';
        const signer = payload.signature && payload.signature.signerKeyId ? payload.signature.signerKeyId : '-';
        showToast(
            tFormat('proxyPresetSetCopied', 'Preset set copied ({count}) · sig {sig} · key {key}', {
                count: total,
                sig: hash,
                key: signer,
            }),
            2400,
        );
    } catch (err) {
        showAlert(`${tText('proxyPresetSetExportFailed', 'Export preset set failed')}: ${err && err.message ? err.message : err}`);
    }
}

function parseProxyPresetSetPayload(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error(tText('proxyPresetSetErrEmpty', 'empty preset payload'));
    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        try {
            parsed = JSON.parse(atob(raw));
        } catch (e2) {
            throw new Error(tText('proxyPresetSetErrFormat', 'invalid preset payload format'));
        }
    }
    return normalizeSignedPresetBundle(parsed);
}

function evaluateProxyIssuerTemplateForImport(verify, payload) {
    const currentTemplate = normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate);
    const signature = payload && typeof payload === 'object' && payload.signature && typeof payload.signature === 'object'
        ? payload.signature
        : null;
    const declaredTemplate = normalizeProxyPresetIssuerTemplate(signature && signature.issuerPolicyTemplate);
    const warnings = [];
    if (currentTemplate !== 'custom' && declaredTemplate !== 'custom' && declaredTemplate !== currentTemplate) {
        warnings.push(
            tFormat('proxyIssuerTemplateWarnMismatch', 'bundle template {bundle} differs from current {current}', {
                bundle: declaredTemplate,
                current: currentTemplate,
            }),
        );
    }
    if (currentTemplate === 'strict_local') {
        if (!verify.signed) throw new Error(tText('proxyIssuerTemplateErrStrictLocalUnsigned', 'issuer template strict_local requires signed bundle'));
        if ((verify.signerKeyId || '') !== 'local-default') {
            throw new Error(tFormat(
                'proxyIssuerTemplateErrStrictLocalSigner',
                'issuer template strict_local expects signer local-default, got {signer}',
                { signer: verify.signerKeyId || '-' },
            ));
        }
    }
    if (currentTemplate === 'strict_current') {
        const expectedSigner = normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default');
        if (!verify.signed) throw new Error(tText('proxyIssuerTemplateErrStrictCurrentUnsigned', 'issuer template strict_current requires signed bundle'));
        if ((verify.signerKeyId || '') !== expectedSigner) {
            throw new Error(tFormat(
                'proxyIssuerTemplateErrStrictCurrentSigner',
                'issuer template strict_current expects signer {expected}, got {actual}',
                { expected: expectedSigner, actual: verify.signerKeyId || '-' },
            ));
        }
    }
    return warnings;
}

function buildAutomatedProxyPresetTrustGateDecision(verify, payload, presets) {
    const policy = normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy);
    const pinned = normalizeSignerKeyListForCompare(proxyPresetPinnedKeys);
    const history = readProxyPresetProvenanceStore();
    const recentImports = history
        .filter((item) => item && item.direction === 'import')
        .slice(-6);
    const recentSignedImports = recentImports
        .filter((item) => normalizeProxySignerKeyId(item && item.signerKeyId, '') || (item && item.bundleHash));
    const recentSignerSet = new Set(
        recentSignedImports
            .map((item) => normalizeProxySignerKeyId(item && item.signerKeyId, ''))
            .filter(Boolean),
    );
    const latestSignedImport = recentSignedImports.length > 0 ? recentSignedImports[recentSignedImports.length - 1] : null;
    const signed = !!(verify && verify.signed);
    const signerKeyId = normalizeProxySignerKeyId(verify && verify.signerKeyId, '');
    const presetCount = Object.keys(normalizeProxyCustomQueryPresets(presets)).length;
    const previousPresetCount = Number(latestSignedImport && latestSignedImport.presetCount || 0);
    const severityRank = { allow: 1, warn: 2, block: 3 };
    let decision = 'allow';
    const reasons = [];
    const pushDecision = (next, reason) => {
        const normalized = normalizeProxyPresetTrustGateDecision(next);
        if (severityRank[normalized] > severityRank[decision]) decision = normalized;
        const message = String(reason || '').trim();
        if (message && !reasons.includes(message)) reasons.push(message);
    };

    if (policy === 'signed_only' && !signed) {
        pushDecision('block', tText('proxyTrustGateReasonSignedOnlyNeedsSignature', 'signed_only policy requires signature'));
    }
    if (pinned.length > 0) {
        if (!signed) {
            pushDecision('block', tText('proxyTrustGateReasonPinnedNeedsSigned', 'pinned signer keys require signed bundle'));
        } else if (!signerKeyId) {
            pushDecision('block', tText('proxyTrustGateReasonMissingSignerId', 'signed bundle missing signer key id'));
        } else if (!pinned.includes(signerKeyId)) {
            pushDecision('block', tFormat('proxyTrustGateReasonSignerNotPinned', 'signer key not pinned: {signer}', { signer: signerKeyId }));
        }
    }
    if (!signed && policy === 'signed_preferred') {
        if (recentImports.length >= 3 && recentSignedImports.length === recentImports.length) {
            pushDecision('block', tText('proxyTrustGateReasonRecentSignedOnly', 'recent provenance imports are signed-only; unsigned import blocked'));
        } else {
            pushDecision('warn', tText('proxyTrustGateReasonUnsignedPreferred', 'unsigned preset bundle imported under signed_preferred'));
        }
    }
    if (signed && signerKeyId) {
        if (latestSignedImport) {
            const prevSigner = normalizeProxySignerKeyId(latestSignedImport.signerKeyId, '');
            if (prevSigner && prevSigner !== signerKeyId) {
                pushDecision('warn', tFormat('proxyTrustGateReasonSignerRotated', 'signer rotated {previous} -> {current}', {
                    previous: prevSigner,
                    current: signerKeyId,
                }));
            }
        }
        if (recentSignerSet.size >= 2 && !recentSignerSet.has(signerKeyId)) {
            pushDecision('warn', tFormat('proxyTrustGateReasonSignerOutsideRecent', 'new signer key outside recent provenance: {signer}', {
                signer: signerKeyId,
            }));
        }
    }
    if (previousPresetCount > 0 && presetCount > 0 && presetCount < Math.ceil(previousPresetCount * 0.5)) {
        pushDecision('warn', tFormat('proxyTrustGateReasonPresetDrop', 'preset count drops {previous} -> {current}', {
            previous: previousPresetCount,
            current: presetCount,
        }));
    }
    const signatureTemplate = normalizeProxyPresetIssuerTemplate(payload && payload.signature && payload.signature.issuerPolicyTemplate);
    const currentTemplate = normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate);
    if (currentTemplate !== 'custom' && signatureTemplate !== 'custom' && signatureTemplate !== currentTemplate) {
        pushDecision('warn', tFormat('proxyTrustGateReasonTemplateMismatch', 'issuer template mismatch {signatureTemplate} vs {currentTemplate}', {
            signatureTemplate,
            currentTemplate,
        }));
    }
    if (reasons.length === 0) reasons.push(tText('proxyPresetTrustGatePassReason', 'trust checks passed'));
    return {
        decision: normalizeProxyPresetTrustGateDecision(decision),
        reasons: reasons.slice(0, 6),
    };
}

function mapProxyTrustDecisionToOutcome(decision) {
    const normalized = normalizeProxyPresetTrustGateDecision(decision);
    if (normalized === 'block') return 'block';
    if (normalized === 'warn') return 'warn';
    return 'pass';
}

function buildProxyTrustExplainabilityPack(input) {
    const data = input && typeof input === 'object' ? input : {};
    const verify = data.verify && typeof data.verify === 'object' ? data.verify : {};
    const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
    const trustGate = normalizeProxyPresetTrustGateMeta(data.trustGate);
    const policy = normalizeProxyPresetTrustPolicy(data.policy || proxyPresetTrustPolicy);
    const currentTemplate = normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate);
    const currentSigner = normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default');
    const pinnedKeys = normalizeSignerKeyListForCompare(proxyPresetPinnedKeys);
    const presetCount = Object.keys(normalizeProxyCustomQueryPresets(data.presets)).length;
    const signatureTemplate = normalizeProxyPresetIssuerTemplate(verify.issuerPolicyTemplate || payload && payload.signature && payload.signature.issuerPolicyTemplate);
    const signed = !!verify.signed;
    const signerKeyId = normalizeProxySignerKeyId(verify.signerKeyId, '');
    const history = readProxyPresetProvenanceStore()
        .filter((item) => item && item.direction === 'import')
        .slice(-6);
    const latest = history.length > 0 ? history[history.length - 1] : null;
    const previousPresetCount = Number(latest && latest.presetCount || 0);
    const previousSigner = normalizeProxySignerKeyId(latest && latest.signerKeyId, '');
    const heuristics = [];

    if (policy === 'signed_only' && !signed) {
        heuristics.push({
            id: 'policy_signed_only',
            label: tText('proxyTrustExplainHeuristicPolicyLabel', 'Trust policy'),
            outcome: 'block',
            detail: tText('proxyTrustExplainHeuristicPolicySignedOnlyBlock', 'signed_only policy blocks unsigned bundles'),
        });
    } else if (policy === 'signed_preferred' && !signed) {
        heuristics.push({
            id: 'policy_signed_preferred',
            label: tText('proxyTrustExplainHeuristicPolicyLabel', 'Trust policy'),
            outcome: 'warn',
            detail: tText('proxyTrustExplainHeuristicPolicySignedPreferredWarn', 'signed_preferred policy allows but warns on unsigned bundles'),
        });
    } else {
        heuristics.push({
            id: 'policy_gate',
            label: tText('proxyTrustExplainHeuristicPolicyLabel', 'Trust policy'),
            outcome: 'pass',
            detail: tFormat('proxyTrustExplainHeuristicPolicyPass', 'policy {policy} accepted bundle signature posture', {
                policy: formatProxyTrustPolicyLabel(policy),
            }),
        });
    }

    heuristics.push({
        id: 'bundle_signature',
        label: tText('proxyTrustExplainHeuristicSignatureLabel', 'Bundle signature'),
        outcome: signed ? 'pass' : 'info',
        detail: signed
            ? tFormat('proxyTrustExplainHeuristicSignatureSigned', 'signature verified for signer {signer}', {
                signer: signerKeyId || tText('proxyTrendValueNA', 'n/a'),
            })
            : tText('proxyTrustExplainHeuristicSignatureUnsigned', 'bundle has no signature block'),
    });

    if (pinnedKeys.length === 0) {
        heuristics.push({
            id: 'pinning_config',
            label: tText('proxyTrustExplainHeuristicPinningLabel', 'Signer pinning'),
            outcome: 'info',
            detail: tText('proxyTrustExplainHeuristicPinningNone', 'no pinned signer keys configured'),
        });
    } else if (!signed) {
        heuristics.push({
            id: 'pinning_unsigned',
            label: tText('proxyTrustExplainHeuristicPinningLabel', 'Signer pinning'),
            outcome: 'block',
            detail: tText('proxyTrustExplainHeuristicPinningUnsigned', 'pinning cannot be satisfied by unsigned bundle'),
        });
    } else if (!signerKeyId) {
        heuristics.push({
            id: 'pinning_missing_signer',
            label: tText('proxyTrustExplainHeuristicPinningLabel', 'Signer pinning'),
            outcome: 'block',
            detail: tText('proxyTrustExplainHeuristicPinningMissingSigner', 'signed bundle has no usable signer key id'),
        });
    } else if (pinnedKeys.includes(signerKeyId)) {
        heuristics.push({
            id: 'pinning_match',
            label: tText('proxyTrustExplainHeuristicPinningLabel', 'Signer pinning'),
            outcome: 'pass',
            detail: tFormat('proxyTrustExplainHeuristicPinningMatch', 'signer {signer} is pinned', { signer: signerKeyId }),
        });
    } else {
        heuristics.push({
            id: 'pinning_mismatch',
            label: tText('proxyTrustExplainHeuristicPinningLabel', 'Signer pinning'),
            outcome: 'block',
            detail: tFormat('proxyTrustExplainHeuristicPinningMismatch', 'signer {signer} not in pinned set', { signer: signerKeyId }),
        });
    }

    if (signed && signerKeyId && previousSigner) {
        heuristics.push({
            id: 'signer_rotation',
            label: tText('proxyTrustExplainHeuristicRotationLabel', 'Signer rotation'),
            outcome: previousSigner === signerKeyId ? 'pass' : 'warn',
            detail: previousSigner === signerKeyId
                ? tFormat('proxyTrustExplainHeuristicRotationStable', 'signer remains {signer}', { signer: signerKeyId })
                : tFormat('proxyTrustExplainHeuristicRotationChanged', 'signer rotated {previous} -> {current}', {
                    previous: previousSigner,
                    current: signerKeyId,
                }),
        });
    }

    if (currentTemplate !== 'custom' && signatureTemplate !== 'custom') {
        heuristics.push({
            id: 'template_alignment',
            label: tText('proxyTrustExplainHeuristicTemplateLabel', 'Template alignment'),
            outcome: currentTemplate === signatureTemplate ? 'pass' : 'warn',
            detail: currentTemplate === signatureTemplate
                ? tFormat('proxyTrustExplainHeuristicTemplateMatch', 'template {template} aligned', { template: currentTemplate })
                : tFormat('proxyTrustExplainHeuristicTemplateMismatch', 'bundle template {bundle} differs from current {current}', {
                    bundle: signatureTemplate,
                    current: currentTemplate,
                }),
        });
    }

    if (previousPresetCount > 0 && presetCount > 0) {
        heuristics.push({
            id: 'preset_volume',
            label: tText('proxyTrustExplainHeuristicPresetVolumeLabel', 'Preset volume'),
            outcome: presetCount < Math.ceil(previousPresetCount * 0.5) ? 'warn' : 'pass',
            detail: tFormat('proxyTrustExplainHeuristicPresetVolumeDetail', 'preset count {previous} -> {current}', {
                previous: previousPresetCount,
                current: presetCount,
            }),
        });
    }

    const reasons = Array.isArray(trustGate.reasons)
        ? trustGate.reasons.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    reasons.slice(0, 6).forEach((reason, index) => {
        heuristics.push({
            id: `trust_reason_${index + 1}`,
            label: tText('proxyTrustExplainHeuristicReasonLabel', 'Trust gate reason'),
            outcome: mapProxyTrustDecisionToOutcome(trustGate.decision),
            detail: reason,
        });
    });

    const issuerTemplateWarnings = Array.isArray(data.issuerTemplateWarnings)
        ? data.issuerTemplateWarnings.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    issuerTemplateWarnings.slice(0, 4).forEach((warning, index) => {
        heuristics.push({
            id: `template_warning_${index + 1}`,
            label: tText('proxyTrustExplainHeuristicTemplateWarningLabel', 'Template warning'),
            outcome: 'warn',
            detail: warning,
        });
    });

    return normalizeProxyTrustExplainabilityPack({
        generatedAt: Date.now(),
        groupId: currentProxyGroup || 'manual',
        decision: trustGate.decision,
        reasons,
        policySnapshot: {
            trustPolicy: policy,
            template: currentTemplate,
            signerKeyId: currentSigner,
            pinnedKeys,
        },
        bundleSnapshot: {
            signed,
            signerKeyId,
            issuerPolicyTemplate: signatureTemplate,
            hash: verify.hash || payload && payload.signature && payload.signature.canonicalHash || '',
            presetCount,
        },
        heuristics: heuristics.slice(0, 20),
        remediationHint: data.remediationHint || null,
    });
}

function buildProxyIssuerTemplateRemediationSuggestion(verify, payload, trustGate, issuerTemplateWarnings) {
    const gate = trustGate && typeof trustGate === 'object' ? trustGate : { decision: 'allow', reasons: [] };
    const reasons = Array.isArray(gate.reasons)
        ? gate.reasons.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    const warnings = Array.isArray(issuerTemplateWarnings)
        ? issuerTemplateWarnings.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    const allReasons = [...reasons, ...warnings];
    const signerKeyId = normalizeProxySignerKeyId(verify && verify.signerKeyId, '');
    const payloadTemplate = normalizeProxyPresetIssuerTemplate(
        verify && verify.issuerPolicyTemplate
            ? verify.issuerPolicyTemplate
            : (payload && payload.signature && payload.signature.issuerPolicyTemplate),
    );
    const currentTemplate = normalizeProxyPresetIssuerTemplate(proxyPresetIssuerTemplate);

    if (allReasons.length === 0 && gate.decision === 'allow') return null;

    if (payloadTemplate !== 'custom' && payloadTemplate !== currentTemplate) {
        return {
            generatedAt: Date.now(),
            severity: gate.decision === 'block' ? 'critical' : 'warn',
            summary: tFormat('proxyIssuerRemediationSummaryApplyTemplate', 'apply issuer template {template} from bundle', {
                template: payloadTemplate,
            }),
            reason: allReasons[0] || tText('proxyIssuerRemediationReasonTemplateMismatch', 'issuer template mismatch'),
            note: tText('proxyIssuerRemediationNoteAlignTemplate', 'Align local issuer policy template with bundle declaration'),
            recommendedTemplate: payloadTemplate,
            recommendedSignerKeyId: signerKeyId,
        };
    }

    const firstReason = allReasons[0] || (
        gate.decision === 'block'
            ? tText('proxyIssuerRemediationReasonBlockedImport', 'trust gate blocked import')
            : tText('proxyIssuerRemediationReasonGateWarning', 'trust gate warning')
    );
    if (firstReason.includes('signer key not pinned') || firstReason.includes('new signer key outside recent provenance') || firstReason.includes('signer rotated')) {
        return {
            generatedAt: Date.now(),
            severity: gate.decision === 'block' ? 'critical' : 'warn',
            summary: signerKeyId
                ? tFormat('proxyIssuerRemediationSummaryPinSigner', 'pin signer {signer} with strict_current', { signer: signerKeyId })
                : tText('proxyIssuerRemediationSummaryReviewPinning', 'review signer pinning policy'),
            reason: firstReason,
            note: signerKeyId
                ? tText('proxyIssuerRemediationNoteSetSignerThenStrictCurrent', 'Set signer then apply strict_current template to enforce single signer provenance')
                : tText('proxyIssuerRemediationNoteMissingSigner', 'Signed bundle without valid signer key id'),
            recommendedTemplate: signerKeyId ? 'strict_current' : 'custom',
            recommendedSignerKeyId: signerKeyId,
        };
    }

    if (firstReason.includes('unsigned') || firstReason.includes('requires signature')) {
        return {
            generatedAt: Date.now(),
            severity: gate.decision === 'block' ? 'critical' : 'warn',
            summary: tText('proxyIssuerRemediationSummaryUnsigned', 'unsigned bundle detected; use bootstrap or signed bundle'),
            reason: firstReason,
            note: tText('proxyIssuerRemediationNotePreferSigned', 'Prefer signed bundle from trusted signer; bootstrap_permissive is temporary fallback'),
            recommendedTemplate: 'bootstrap_permissive',
            recommendedSignerKeyId: normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
        };
    }

    return {
        generatedAt: Date.now(),
        severity: gate.decision === 'block' ? 'critical' : 'warn',
        summary: tText('proxyIssuerRemediationSummaryReviewPolicy', 'review issuer policy drift and signer trust settings'),
        reason: firstReason,
        note: tText('proxyIssuerRemediationNoteUseAudit', 'Use policy drift audit and provenance export to align team trust policy'),
        recommendedTemplate: currentTemplate,
        recommendedSignerKeyId: signerKeyId || normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default'),
    };
}

function importProxyQueryPresetSet() {
    showInput(tText('proxyPresetSetImportPrompt', 'Paste preset set JSON/base64'), (value) => {
        Promise.resolve()
            .then(() => parseProxyPresetSetPayload(value))
            .then(async ({ payload, presets }) => {
                const verify = await verifySignedProxyPresetBundle(payload);
                const policy = normalizeProxyPresetTrustPolicy(proxyPresetTrustPolicy);
                const trustGate = buildAutomatedProxyPresetTrustGateDecision(verify, payload, presets);
                if (trustGate.decision === 'block') {
                    const remediationHint = buildProxyIssuerTemplateRemediationSuggestion(verify, payload, trustGate, []);
                    setProxyIssuerTemplateRemediationHint(remediationHint);
                    setProxyTrustExplainabilityPack(buildProxyTrustExplainabilityPack({
                        verify,
                        payload,
                        presets,
                        trustGate,
                        policy,
                        remediationHint,
                        issuerTemplateWarnings: [],
                    }));
                    recordProxyTrustGateException({
                        groupId: currentProxyGroup || 'manual',
                        decision: 'block',
                        reason: trustGate.reasons[0] || tText('proxyTrustGateReasonPolicyMismatch', 'policy mismatch'),
                        signerKeyId: verify && verify.signerKeyId ? verify.signerKeyId : '',
                        bundleHash: verify && verify.hash ? verify.hash : '',
                        route: 'preset-import',
                        trustPolicy: policy,
                        template: proxyPresetIssuerTemplate,
                        payloadTemplate: verify && verify.issuerPolicyTemplate ? verify.issuerPolicyTemplate : 'custom',
                        presetCount: Object.keys(normalizeProxyCustomQueryPresets(presets)).length,
                    });
                    renderProxyTrustGateExceptionAuditSummary();
                    throw new Error(tFormat('proxyTrustGateBlockedError', 'trust gate blocked: {reason}', {
                        reason: trustGate.reasons[0] || tText('proxyTrustGateReasonPolicyMismatch', 'policy mismatch'),
                    }));
                }
                let issuerTemplateWarnings = [];
                try {
                    issuerTemplateWarnings = evaluateProxyIssuerTemplateForImport(verify, payload);
                } catch (templateErr) {
                    const warning = templateErr && templateErr.message ? templateErr.message : tText('proxyIssuerTemplateCheckFailed', 'issuer template check failed');
                    const remediationHint = buildProxyIssuerTemplateRemediationSuggestion(verify, payload, trustGate, [warning]);
                    setProxyIssuerTemplateRemediationHint(remediationHint);
                    setProxyTrustExplainabilityPack(buildProxyTrustExplainabilityPack({
                        verify,
                        payload,
                        presets,
                        trustGate,
                        policy,
                        remediationHint,
                        issuerTemplateWarnings: [warning],
                    }));
                    recordProxyTrustGateException({
                        groupId: currentProxyGroup || 'manual',
                        decision: 'block',
                        reason: warning,
                        signerKeyId: verify && verify.signerKeyId ? verify.signerKeyId : '',
                        bundleHash: verify && verify.hash ? verify.hash : '',
                        route: 'preset-import',
                        trustPolicy: policy,
                        template: proxyPresetIssuerTemplate,
                        payloadTemplate: verify && verify.issuerPolicyTemplate ? verify.issuerPolicyTemplate : 'custom',
                        presetCount: Object.keys(normalizeProxyCustomQueryPresets(presets)).length,
                    });
                    renderProxyTrustGateExceptionAuditSummary();
                    throw templateErr;
                }
                if (issuerTemplateWarnings.length > 0) {
                    const mergedReasons = [...trustGate.reasons, ...issuerTemplateWarnings]
                        .map((item) => String(item || '').trim())
                        .filter(Boolean);
                    trustGate.reasons = Array.from(new Set(mergedReasons)).slice(0, 6);
                    if (trustGate.decision === 'allow') trustGate.decision = 'warn';
                }
                proxyCustomQueryPresets = presets;
                persistProxyCustomQueryPresets();
                renderProxyCustomPresetButtons();
                if (!Object.prototype.hasOwnProperty.call(getProxyQueryPresetMap(), proxyListViewState.preset)) {
                    proxyListViewState = normalizeProxyListViewState({ ...proxyListViewState, preset: 'custom' });
                }
                applyProxyListViewStateToControls();
                persistProxyListViewState();
                renderProxyNodes();
                recordProxyPresetProvenance('import', payload, verify, presets, trustGate);
                renderProxyPresetProvenanceDiff();
                renderProxyPresetTrustGateStatus();
                const signedText = verify.signed
                    ? tFormat('proxyPresetSetImportedSignedText', ' · signature ok ({signer}) · tpl {template}', {
                        signer: verify.signerKeyId || '-',
                        template: verify.issuerPolicyTemplate || 'custom',
                    })
                    : tText('proxyPresetSetImportedUnsignedText', ' · unsigned');
                showToast(
                    tFormat('proxyPresetSetImported', 'Preset set imported ({count}){signedText}', {
                        count: Object.keys(presets).length,
                        signedText,
                    }),
                    2400,
                );
                if (trustGate.decision === 'warn') {
                    const remediationHint = buildProxyIssuerTemplateRemediationSuggestion(verify, payload, trustGate, issuerTemplateWarnings);
                    setProxyIssuerTemplateRemediationHint(remediationHint);
                    setProxyTrustExplainabilityPack(buildProxyTrustExplainabilityPack({
                        verify,
                        payload,
                        presets,
                        trustGate,
                        policy,
                        remediationHint,
                        issuerTemplateWarnings,
                    }));
                    recordProxyTrustGateException({
                        groupId: currentProxyGroup || 'manual',
                        decision: 'warn',
                        reason: trustGate.reasons[0] || tText('proxyIssuerRemediationReasonGateWarning', 'trust gate warning'),
                        signerKeyId: verify && verify.signerKeyId ? verify.signerKeyId : '',
                        bundleHash: verify && verify.hash ? verify.hash : '',
                        route: 'preset-import',
                        trustPolicy: policy,
                        template: proxyPresetIssuerTemplate,
                        payloadTemplate: verify && verify.issuerPolicyTemplate ? verify.issuerPolicyTemplate : 'custom',
                        presetCount: Object.keys(normalizeProxyCustomQueryPresets(presets)).length,
                    });
                    renderProxyTrustGateExceptionAuditSummary();
                    showToast(
                        tFormat('proxyTrustGateWarningToast', 'Trust gate warning: {reason}', {
                            reason: trustGate.reasons[0] || tText('proxyTrustGateReasonCheckProvenance', 'check provenance'),
                        }),
                        2800,
                    );
                } else if (!verify.signed && policy === 'signed_preferred') {
                    setProxyTrustExplainabilityPack(buildProxyTrustExplainabilityPack({
                        verify,
                        payload,
                        presets,
                        trustGate,
                        policy,
                        remediationHint: null,
                        issuerTemplateWarnings,
                    }));
                    showToast(tText('proxyTrustUnsignedWarning', 'Warning: unsigned preset bundle imported under signed_preferred policy'), 2800);
                } else {
                    setProxyTrustExplainabilityPack(buildProxyTrustExplainabilityPack({
                        verify,
                        payload,
                        presets,
                        trustGate,
                        policy,
                        remediationHint: null,
                        issuerTemplateWarnings,
                    }));
                }
                if (issuerTemplateWarnings.length > 0) {
                    showToast(
                        tFormat('proxyIssuerTemplateWarningToast', 'Issuer template warning: {warning}', {
                            warning: issuerTemplateWarnings[0],
                        }),
                        2800,
                    );
                }
                if (trustGate.decision !== 'warn' && issuerTemplateWarnings.length === 0) {
                    setProxyIssuerTemplateRemediationHint(null);
                }
            })
            .catch((err) => {
                showAlert(`${tText('proxyPresetSetImportFailed', 'Import preset set failed')}: ${err && err.message ? err.message : err}`);
            });
    });
}

function manageProxyPresetPinnedKeys() {
    const current = Array.isArray(proxyPresetPinnedKeys) ? proxyPresetPinnedKeys.join(', ') : '';
    showInput(tText('proxyPinnedKeysInputPrompt', 'Pinned signer keys (comma/newline)'), (value) => {
        const parsed = parseProxyPinnedSignerKeys(value);
        if (parsed.invalid.length > 0) {
            showAlert(`${tText('proxyPinnedKeysInvalid', 'Invalid signer keys')}:\n${parsed.invalid.slice(0, 8).join('\n')}`);
            return;
        }
        proxyPresetPinnedKeys = parsed.keys;
        proxyPresetIssuerTemplate = 'custom';
        persistProxyPresetPinnedKeys();
        persistProxyPresetIssuerTemplate();
        updateProxyPresetTrustSummary();
        showToast(tFormat('proxyPinnedKeysSaved', 'Pinned signer keys saved ({count})', { count: proxyPresetPinnedKeys.length }), 1800);
    });
    const inputEl = document.getElementById('inputModalValue');
    if (inputEl) inputEl.value = current;
}

function manageProxyPresetSignerKey() {
    showInput(tText('proxySignerKeyInputPrompt', 'Signer key ID'), (value) => {
        const normalized = normalizeProxySignerKeyId(value, '');
        if (!normalized) {
            showAlert(tText('proxySignerKeyInvalid', 'Invalid signer key id (allowed: letters/numbers . _ : -)'));
            return;
        }
        proxyPresetSignerKeyId = normalized;
        proxyPresetIssuerTemplate = 'custom';
        persistProxyPresetSignerKeyId();
        persistProxyPresetIssuerTemplate();
        updateProxyPresetTrustSummary();
        showToast(tFormat('proxySignerKeySaved', 'Signer key set: {signer}', { signer: proxyPresetSignerKeyId }), 1800);
    });
    const inputEl = document.getElementById('inputModalValue');
    if (inputEl) inputEl.value = normalizeProxySignerKeyId(proxyPresetSignerKeyId, 'local-default');
}

function applyProxyIssuerPolicyTemplate(templateKey) {
    const normalizedKey = normalizeProxyPresetIssuerTemplate(templateKey);
    if (normalizedKey === 'custom') {
        showAlert(tFormat('proxyIssuerTemplateUnknown', 'Unknown issuer template: {template}', { template: templateKey || '-' }));
        return;
    }
    const resolved = resolveProxyPresetIssuerTemplateDefinition(normalizedKey);
    proxyPresetIssuerTemplate = normalizedKey;
    proxyPresetTrustPolicy = normalizeProxyPresetTrustPolicy(resolved.trustPolicy);
    proxyPresetSignerKeyId = normalizeProxySignerKeyId(resolved.signerKeyId, 'local-default');
    proxyPresetPinnedKeys = parseProxyPinnedSignerKeys((resolved.pinnedKeys || []).join(',')).keys;
    persistProxyPresetIssuerTemplate();
    persistProxyPresetTrustPolicy();
    persistProxyPresetSignerKeyId();
    persistProxyPresetPinnedKeys();
    applyProxyPresetTrustPolicyToControl();
    updateProxyPresetTrustSummary();
    showToast(
        tFormat('proxyIssuerTemplateApplied', 'Issuer template applied: {label}', {
            label: formatProxyIssuerTemplateLabel(normalizedKey) || resolved.label,
        }),
        2000,
    );
}

function saveCurrentProxyQueryPreset() {
    showInput(tText('proxyPresetNamePrompt', 'Preset name'), (nameInput) => {
        const name = String(nameInput || '').trim();
        if (!name) return;
        if (Object.keys(normalizeProxyCustomQueryPresets(proxyCustomQueryPresets)).length >= 12) {
            showAlert(tText('proxyPresetLimitReached', 'Maximum custom preset count reached (12)'));
            return;
        }
        const baseKey = toProxyCustomPresetKey(name);
        const key = ensureUniqueProxyCustomPresetKey(baseKey);
        const preset = normalizeProxyQueryPresetDefinition({
            label: name,
            search: proxyListViewState.search,
            status: proxyListViewState.status,
            sort: proxyListViewState.sort,
        }, name);
        proxyCustomQueryPresets = {
            ...normalizeProxyCustomQueryPresets(proxyCustomQueryPresets),
            [key]: preset,
        };
        persistProxyCustomQueryPresets();
        renderProxyCustomPresetButtons();
        proxyListViewState = normalizeProxyListViewState({
            ...proxyListViewState,
            ...preset,
            preset: key,
        });
        persistProxyListViewState();
        applyProxyListViewStateToControls();
        renderProxyNodes();
        showToast(tFormat('proxyPresetSaved', 'Preset saved: {label}', { label: preset.label }), 1800);
    });
}

function normalizeProxyListViewState(input) {
    const raw = (input && typeof input === 'object') ? input : {};
    const status = ['all', 'pass', 'fail', 'wait'].includes(raw.status) ? raw.status : 'all';
    const sort = [
        'default',
        'latency_asc',
        'latency_desc',
        'updated_desc',
        'fail_first',
        'name_asc',
    ].includes(raw.sort) ? raw.sort : 'default';
    const search = typeof raw.search === 'string' ? raw.search.slice(0, 80) : '';
    const presetMap = getProxyQueryPresetMap();
    const preset = Object.prototype.hasOwnProperty.call(presetMap, raw.preset) ? raw.preset : 'custom';
    return { search, status, sort, preset };
}

function loadProxyListViewState() {
    try {
        const text = localStorage.getItem(PROXY_LIST_VIEW_STATE_KEY);
        if (!text) return normalizeProxyListViewState({});
        return normalizeProxyListViewState(JSON.parse(text));
    } catch (e) {
        return normalizeProxyListViewState({});
    }
}

function persistProxyListViewState() {
    try {
        localStorage.setItem(PROXY_LIST_VIEW_STATE_KEY, JSON.stringify(normalizeProxyListViewState(proxyListViewState)));
    } catch (e) { }
}

function loadProxySecondaryFiltersUiState() {
    try {
        const text = localStorage.getItem(PROXY_SECONDARY_FILTERS_EXPANDED_KEY);
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxySecondaryFiltersUiState() {
    try {
        localStorage.setItem(PROXY_SECONDARY_FILTERS_EXPANDED_KEY, proxySecondaryFiltersExpanded ? '1' : '0');
    } catch (e) { }
}

function loadProxyAdvancedUiState() {
    try {
        const text = localStorage.getItem(PROXY_ADVANCED_PANEL_EXPANDED_KEY);
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxyAdvancedUiState() {
    try {
        localStorage.setItem(PROXY_ADVANCED_PANEL_EXPANDED_KEY, proxyAdvancedExpanded ? '1' : '0');
    } catch (e) { }
}

function normalizeProxyAdvancedView(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'expert' ? 'expert' : 'common';
}

function loadProxyAdvancedViewState() {
    try {
        return normalizeProxyAdvancedView(localStorage.getItem(PROXY_ADVANCED_VIEW_KEY) || 'common');
    } catch (e) {
        return 'common';
    }
}

function persistProxyAdvancedViewState() {
    try {
        localStorage.setItem(PROXY_ADVANCED_VIEW_KEY, normalizeProxyAdvancedView(proxyAdvancedView));
    } catch (e) { }
}

function normalizeProxyCognitiveMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'quick') return 'quick';
    if (normalized === 'expert') return 'expert';
    return 'standard';
}

function loadProxyCognitiveModeState() {
    try {
        return normalizeProxyCognitiveMode(localStorage.getItem(PROXY_COGNITIVE_MODE_KEY) || 'standard');
    } catch (e) {
        return 'standard';
    }
}

function persistProxyCognitiveModeState() {
    try {
        localStorage.setItem(PROXY_COGNITIVE_MODE_KEY, normalizeProxyCognitiveMode(proxyCognitiveMode));
    } catch (e) { }
}

function normalizeProxyCognitiveStateCache(input) {
    const raw = (input && typeof input === 'object') ? input : {};
    return {
        secondaryFiltersExpanded: Boolean(raw.secondaryFiltersExpanded),
        advancedExpanded: Boolean(raw.advancedExpanded),
        advancedView: normalizeProxyAdvancedView(raw.advancedView || 'common'),
        diagnosticsExpanded: Boolean(raw.diagnosticsExpanded),
        diagnosticsDetailExpanded: Boolean(raw.diagnosticsDetailExpanded),
        inspectorAttemptsExpanded: Boolean(raw.inspectorAttemptsExpanded),
    };
}

function loadProxyCognitiveStateCache() {
    try {
        const text = localStorage.getItem(PROXY_COGNITIVE_STATE_CACHE_KEY);
        if (!text) {
            return normalizeProxyCognitiveStateCache({
                secondaryFiltersExpanded: proxySecondaryFiltersExpanded,
                advancedExpanded: proxyAdvancedExpanded,
                advancedView: proxyAdvancedView,
                diagnosticsExpanded: proxyDiagnosticsExpanded,
                diagnosticsDetailExpanded: proxyDiagnosticsDetailExpanded,
                inspectorAttemptsExpanded: proxyInspectorAttemptsExpanded,
            });
        }
        return normalizeProxyCognitiveStateCache(JSON.parse(text));
    } catch (e) {
        return normalizeProxyCognitiveStateCache({
            secondaryFiltersExpanded: proxySecondaryFiltersExpanded,
            advancedExpanded: proxyAdvancedExpanded,
            advancedView: proxyAdvancedView,
            diagnosticsExpanded: proxyDiagnosticsExpanded,
            diagnosticsDetailExpanded: proxyDiagnosticsDetailExpanded,
            inspectorAttemptsExpanded: proxyInspectorAttemptsExpanded,
        });
    }
}

function persistProxyCognitiveStateCache() {
    try {
        const normalized = normalizeProxyCognitiveStateCache(proxyCognitiveStateCache || {});
        localStorage.setItem(PROXY_COGNITIVE_STATE_CACHE_KEY, JSON.stringify(normalized));
    } catch (e) { }
}

function loadProxySidebarCollapsedState() {
    try {
        const text = localStorage.getItem(PROXY_SIDEBAR_COLLAPSED_KEY);
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxySidebarCollapsedState() {
    try {
        localStorage.setItem(PROXY_SIDEBAR_COLLAPSED_KEY, proxySidebarCollapsed ? '1' : '0');
    } catch (e) { }
}

function canUseProxySidebarCollapsedLayout() {
    const modal = document.getElementById('proxyModal');
    const viewportWidth = Number(window.innerWidth || 0);
    const modalWidth = (modal instanceof HTMLElement && modal.clientWidth > 0)
        ? modal.clientWidth
        : viewportWidth;
    return modalWidth > 1240;
}

function applyProxySidebarState() {
    const modal = document.getElementById('proxyModal');
    if (!(modal instanceof HTMLElement)) return;
    const canCollapse = canUseProxySidebarCollapsedLayout();
    const collapsed = canCollapse && !!proxySidebarCollapsed;
    modal.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');

    const btn = document.getElementById('proxySidebarToggleBtn');
    if (btn) {
        btn.style.display = canCollapse ? '' : 'none';
        btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
        const tr = getTranslator();
        const collapseText = tr('proxySidebarCollapse') || 'Collapse Sidebar';
        const expandText = tr('proxySidebarExpand') || 'Expand Sidebar';
        btn.innerText = collapsed ? '«' : collapseText;
        btn.title = collapsed ? `${expandText} (Alt+B)` : `${collapseText} (Alt+B)`;
        btn.setAttribute('aria-label', collapsed ? expandText : collapseText);
    }
}

function toggleProxySidebar() {
    if (!canUseProxySidebarCollapsedLayout()) return;
    proxySidebarCollapsed = !proxySidebarCollapsed;
    persistProxySidebarCollapsedState();
    applyProxySidebarState();
}

function normalizeProxyWorkflowFocus(focus) {
    const value = String(focus || 'nodes').trim().toLowerCase();
    if (value === 'advanced' || value === 'strategy') return value;
    return 'nodes';
}

function applyProxyWorkflowFocusState() {
    const modal = document.getElementById('proxyModal');
    if (!(modal instanceof HTMLElement)) return;
    proxyWorkflowFocus = normalizeProxyWorkflowFocus(proxyWorkflowFocus);
    modal.setAttribute('data-workflow-focus', proxyWorkflowFocus);
}

function setProxyWorkflowFocus(focus) {
    proxyWorkflowFocus = normalizeProxyWorkflowFocus(focus);
    applyProxyWorkflowFocusState();
}

function setProxySidebarNavActive(targetId) {
    const activeId = String(targetId || '').trim();
    const items = Array.from(document.querySelectorAll('#proxySidebarNav [data-action="focus-proxy-panel"]'));
    items.forEach((btn) => {
        const isActive = activeId && btn.getAttribute('data-action-arg') === activeId;
        btn.classList.toggle('is-active', isActive);
        if (isActive) {
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.removeAttribute('aria-current');
        }
    });
}

function focusProxyPanel(panelId) {
    const targetId = String(panelId || '').trim();
    if (!targetId) return;

    if (targetId === 'proxyAdvancedShell' && proxyCognitiveMode !== 'expert') {
        setProxyCognitiveMode('expert');
    } else if (targetId === 'proxyStrategyPanel' && proxyCognitiveMode === 'quick') {
        setProxyCognitiveMode('standard');
    }

    if (targetId === 'proxyInspector' && proxyInspectorCollapsed) {
        proxyInspectorCollapsed = false;
        persistProxyInspectorCollapsedUiState();
        applyProxyInspectorCollapsedUiState();
    }

    if (targetId === 'proxyAdvancedShell' && !proxyAdvancedExpanded) {
        proxyAdvancedExpanded = true;
        persistProxyAdvancedUiState();
        applyProxyAdvancedPanelState();
    }

    if (targetId === 'proxyAdvancedShell') {
        setProxyWorkflowFocus('advanced');
    } else if (targetId === 'proxyStrategyPanel') {
        setProxyWorkflowFocus('strategy');
    } else if (targetId === 'proxyFilterStack') {
        setProxyWorkflowFocus('nodes');
    }

    const targetEl = document.getElementById(targetId);
    if (!(targetEl instanceof HTMLElement)) return;

    setProxySidebarNavActive(targetId);
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });

    if (targetId === 'proxyFilterStack') {
        const searchInput = document.getElementById('proxySearchInput');
        if (searchInput instanceof HTMLElement) searchInput.focus();
    }
}

function loadProxyDiagnosticsUiState() {
    try {
        const text = localStorage.getItem(PROXY_DIAGNOSTICS_PANEL_EXPANDED_KEY);
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxyDiagnosticsUiState() {
    try {
        localStorage.setItem(PROXY_DIAGNOSTICS_PANEL_EXPANDED_KEY, proxyDiagnosticsExpanded ? '1' : '0');
    } catch (e) { }
}

function loadProxyDiagnosticsDetailUiState() {
    try {
        const text = localStorage.getItem(PROXY_DIAGNOSTICS_DETAILS_EXPANDED_KEY);
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxyDiagnosticsDetailUiState() {
    try {
        localStorage.setItem(PROXY_DIAGNOSTICS_DETAILS_EXPANDED_KEY, proxyDiagnosticsDetailExpanded ? '1' : '0');
    } catch (e) { }
}

function loadProxyInspectorStepsUiState() {
    try {
        const text = localStorage.getItem(PROXY_INSPECTOR_STEPS_EXPANDED_KEY);
        if (text === null || text === undefined || text === '') return true;
        return text === '1' || text === 'true';
    } catch (e) {
        return true;
    }
}

function persistProxyInspectorStepsUiState() {
    try {
        localStorage.setItem(PROXY_INSPECTOR_STEPS_EXPANDED_KEY, proxyInspectorStepsExpanded ? '1' : '0');
    } catch (e) { }
}

function loadProxyInspectorAttemptsUiState() {
    try {
        const text = localStorage.getItem(PROXY_INSPECTOR_ATTEMPTS_EXPANDED_KEY);
        if (text === null || text === undefined || text === '') return false;
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxyInspectorAttemptsUiState() {
    try {
        localStorage.setItem(PROXY_INSPECTOR_ATTEMPTS_EXPANDED_KEY, proxyInspectorAttemptsExpanded ? '1' : '0');
    } catch (e) { }
}

function normalizeProxyInspectorWidthPx(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 400;
    return Math.max(320, Math.min(720, Math.round(num)));
}

function loadProxyInspectorWidthPx() {
    try {
        const raw = localStorage.getItem(PROXY_INSPECTOR_WIDTH_KEY);
        if (!raw) return 400;
        return normalizeProxyInspectorWidthPx(raw);
    } catch (e) {
        return 400;
    }
}

function persistProxyInspectorWidthPx() {
    try {
        const value = normalizeProxyInspectorWidthPx(proxyInspectorWidthPx);
        localStorage.setItem(PROXY_INSPECTOR_WIDTH_KEY, String(value));
    } catch (e) { }
}

function applyProxyInspectorWidthPx() {
    const modal = document.getElementById('proxyModal');
    if (!modal) return;
    const normalized = normalizeProxyInspectorWidthPx(proxyInspectorWidthPx);
    const mainEl = modal.querySelector('#proxyModal .proxy-main') || modal.querySelector('.proxy-main');
    const maxByMain = mainEl instanceof HTMLElement
        ? Math.max(360, Math.round(mainEl.clientWidth * 0.56))
        : 760;
    const value = Math.min(normalized, maxByMain);
    if (proxyInspectorWidthPx !== value) proxyInspectorWidthPx = value;
    modal.style.setProperty('--proxy-inspector-width', `${value}px`);
}

function shouldUseProxyCompactLayout() {
    const modal = document.getElementById('proxyModal');
    const viewportWidth = Number(window.innerWidth || 0);
    const viewportHeight = Number(window.innerHeight || 0);
    const modalWidth = (modal instanceof HTMLElement && modal.clientWidth > 0)
        ? modal.clientWidth
        : viewportWidth;
    return modalWidth <= 1320 || viewportHeight <= 860;
}

function shouldUseProxyUltraCompactLayout() {
    const modal = document.getElementById('proxyModal');
    const viewportWidth = Number(window.innerWidth || 0);
    const viewportHeight = Number(window.innerHeight || 0);
    const modalWidth = (modal instanceof HTMLElement && modal.clientWidth > 0)
        ? modal.clientWidth
        : viewportWidth;
    return modalWidth <= 1260 || viewportHeight <= 820;
}

function shouldUseProxyTouchOptimizedLayout() {
    try {
        if (typeof window.matchMedia === 'function') {
            return window.matchMedia('(pointer: coarse)').matches;
        }
    } catch (e) { }
    return false;
}

function applyProxyModalLayoutMode() {
    const modal = document.getElementById('proxyModal');
    if (!(modal instanceof HTMLElement)) return;
    const compact = shouldUseProxyCompactLayout();
    const ultraCompact = shouldUseProxyUltraCompactLayout();
    const touchOptimized = shouldUseProxyTouchOptimizedLayout();

    if (shouldUseProxyUltraCompactLayout()) {
        let collapsedByLayout = false;
        if (proxySecondaryFiltersExpanded) {
            proxySecondaryFiltersExpanded = false;
            persistProxySecondaryFiltersUiState();
            collapsedByLayout = true;
        }
        if (proxyAdvancedExpanded) {
            proxyAdvancedExpanded = false;
            persistProxyAdvancedUiState();
            collapsedByLayout = true;
        }
        if (proxyDiagnosticsExpanded) {
            proxyDiagnosticsExpanded = false;
            persistProxyDiagnosticsUiState();
            collapsedByLayout = true;
        }
        if (proxyDiagnosticsDetailExpanded) {
            proxyDiagnosticsDetailExpanded = false;
            persistProxyDiagnosticsDetailUiState();
            collapsedByLayout = true;
        }
        if (collapsedByLayout) {
            applyProxySecondaryFiltersUiState();
            applyProxyAdvancedPanelState();
            applyProxyDiagnosticsPanelState();
        }
    }

    modal.classList.toggle('is-compact-layout', compact);
    modal.classList.toggle('is-ultra-compact-layout', ultraCompact);
    modal.classList.toggle('is-touch-optimized', touchOptimized);
    modal.setAttribute('data-cognitive-mode', normalizeProxyCognitiveMode(proxyCognitiveMode));
    applyProxySidebarState();
    applyProxyInspectorWidthPx();
}

function loadProxyInspectorCollapsedUiState() {
    try {
        const text = localStorage.getItem(PROXY_INSPECTOR_COLLAPSED_KEY);
        return text === '1' || text === 'true';
    } catch (e) {
        return false;
    }
}

function persistProxyInspectorCollapsedUiState() {
    try {
        localStorage.setItem(PROXY_INSPECTOR_COLLAPSED_KEY, proxyInspectorCollapsed ? '1' : '0');
    } catch (e) { }
}

function applyProxyInspectorCollapsedUiState() {
    const modal = document.getElementById('proxyModal');
    if (modal) {
        modal.classList.toggle('is-inspector-collapsed', !!proxyInspectorCollapsed);
        modal.classList.toggle('is-inspector-open', !proxyInspectorCollapsed);
        const shell = modal.querySelector('.proxy-modal-shell');
        if (shell) {
            shell.style.setProperty('--proxy-right-width', proxyInspectorCollapsed ? '0px' : '340px');
        }
    }

    const tr = getTranslator();
    const text = proxyInspectorCollapsed
        ? (tr('proxyInspectorShow') || 'Show Details')
        : (tr('proxyInspectorHide') || 'Hide Details');
    const mainToggleBtn = document.getElementById('proxyInspectorToggleBtn');
    if (mainToggleBtn) mainToggleBtn.innerText = text;

    const compactMenuButtons = Array.from(document.querySelectorAll('#proxyModal .proxy-group-more-list .proxy-compact-only[data-action="toggle-proxy-inspector"]'));
    compactMenuButtons.forEach((btn) => {
        btn.innerText = text;
    });

    const sidebarQuickBtn = document.getElementById('proxySidebarQuickInspectorBtn');
    if (sidebarQuickBtn) {
        sidebarQuickBtn.title = `${text} (Alt+I)`;
        sidebarQuickBtn.setAttribute('aria-label', text);
    }
}

function toggleProxyInspectorPanel() {
    proxyInspectorCollapsed = !proxyInspectorCollapsed;
    persistProxyInspectorCollapsedUiState();
    applyProxyInspectorCollapsedUiState();
}

function openProxyInspectorDrawer() {
    proxyInspectorCollapsed = false;
    persistProxyInspectorCollapsedUiState();
    applyProxyInspectorCollapsedUiState();
}

function closeProxyInspectorDrawer() {
    proxyInspectorCollapsed = true;
    persistProxyInspectorCollapsedUiState();
    applyProxyInspectorCollapsedUiState();
}

function applyProxyInspectorSectionState() {
    const tr = getTranslator();
    const applyOne = ({ sectionId, buttonId, expanded, labelKey, fallbackLabel }) => {
        const sectionEl = document.getElementById(sectionId);
        if (sectionEl) sectionEl.classList.toggle('is-collapsed', !expanded);

        const buttonEl = document.getElementById(buttonId);
        if (!buttonEl) return;
        buttonEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        buttonEl.setAttribute('data-expanded', expanded ? 'true' : 'false');
        const actionText = expanded
            ? (tr('proxyDetailHide') || 'Hide details')
            : (tr('proxyDetailShow') || 'Show details');
        const labelText = tr(labelKey) || fallbackLabel;
        buttonEl.title = `${actionText} · ${labelText}`;
    };

    applyOne({
        sectionId: 'proxyInspectorStepsSection',
        buttonId: 'proxyInspectorStepsToggleBtn',
        expanded: !!proxyInspectorStepsExpanded,
        labelKey: 'proxyDetailStepsTitle',
        fallbackLabel: 'Steps',
    });

    applyOne({
        sectionId: 'proxyInspectorAttemptsSection',
        buttonId: 'proxyInspectorAttemptsToggleBtn',
        expanded: !!proxyInspectorAttemptsExpanded,
        labelKey: 'proxyDetailAttemptsTitle',
        fallbackLabel: 'Attempts',
    });
}

function toggleProxyInspectorStepsPanel() {
    proxyInspectorStepsExpanded = !proxyInspectorStepsExpanded;
    persistProxyInspectorStepsUiState();
    applyProxyInspectorSectionState();
}

function toggleProxyInspectorAttemptsPanel() {
    proxyInspectorAttemptsExpanded = !proxyInspectorAttemptsExpanded;
    persistProxyInspectorAttemptsUiState();
    applyProxyInspectorSectionState();
}

function applyProxySecondaryFiltersUiState() {
    const modal = document.getElementById('proxyModal');
    const panel = document.getElementById('proxySecondaryFilters');
    if (panel) panel.classList.toggle('is-collapsed', !proxySecondaryFiltersExpanded);
    if (modal) modal.setAttribute('data-secondary-filters', proxySecondaryFiltersExpanded ? 'expanded' : 'collapsed');

    const btn = document.getElementById('proxySecondaryFilterToggleBtn');
    if (btn) {
        const tr = getTranslator();
        btn.setAttribute('aria-expanded', proxySecondaryFiltersExpanded ? 'true' : 'false');
        btn.setAttribute('data-expanded', proxySecondaryFiltersExpanded ? 'true' : 'false');
        btn.innerText = proxySecondaryFiltersExpanded
            ? (tr('proxyFiltersLess') || 'Hide Filters')
            : (tr('proxyFiltersMore') || 'More Filters');
    }
}

function applyProxyAdvancedPanelState() {
    const modal = document.getElementById('proxyModal');
    if (modal) modal.setAttribute('data-advanced-expanded', proxyAdvancedExpanded ? 'expanded' : 'collapsed');

    const panel = document.getElementById('proxyAdvancedPanel');
    if (panel) panel.classList.toggle('is-collapsed', !proxyAdvancedExpanded);

    const btn = document.getElementById('proxyAdvancedToggleBtn');
    if (btn) {
        const tr = getTranslator();
        btn.setAttribute('aria-expanded', proxyAdvancedExpanded ? 'true' : 'false');
        btn.setAttribute('data-expanded', proxyAdvancedExpanded ? 'true' : 'false');
        btn.innerText = proxyAdvancedExpanded
            ? (tr('hideAdvanced') || 'Hide Advanced')
            : (tr('showAdvanced') || 'Show Advanced');
    }
}

function applyProxyAdvancedViewState() {
    const modal = document.getElementById('proxyModal');
    const view = normalizeProxyAdvancedView(proxyAdvancedView);
    proxyAdvancedView = view;
    if (modal) modal.setAttribute('data-advanced-view', view);

    const buttons = Array.from(document.querySelectorAll('#proxyModal [data-advanced-view]'));
    buttons.forEach((btn) => {
        const key = normalizeProxyAdvancedView(btn.getAttribute('data-advanced-view'));
        const active = key === view;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function formatProxyCognitiveModeLabel(mode) {
    const tr = getTranslator();
    if (mode === 'quick') return tr('proxyStrategyQuick') || 'Quick';
    if (mode === 'expert') return tr('proxyAdvancedViewExpert') || 'Expert';
    return tr('proxyStrategyStandard') || 'Standard';
}

function updateProxyTopHint() {
    const hintEl = document.querySelector('#proxyModal .proxy-top-hint');
    if (!(hintEl instanceof HTMLElement)) return;
    const lang = getCurrentLangSafe();
    const mode = normalizeProxyCognitiveMode(proxyCognitiveMode);
    const modeLabel = formatProxyCognitiveModeLabel(mode);

    let text = '';
    if (lang === 'cn') {
        if (mode === 'quick') {
            text = `模式：${modeLabel} · 聚焦路径：搜索/筛选/测试 · Alt+B 侧栏 · Alt+2 标准 · Alt+3 专家`;
        } else if (mode === 'expert') {
            text = `模式：${modeLabel} · 高级诊断已就绪 · Alt+B 侧栏 · Alt+1 简洁 · Alt+D 诊断 · Alt+F 筛选`;
        } else {
            text = `模式：${modeLabel} · 单击选中 双击测试 · / 或 Ctrl+F 搜索 · Alt+B 侧栏 · Alt+1/2/3 切换模式`;
        }
    } else {
        if (mode === 'quick') {
            text = `Mode: ${modeLabel} · Focused flow: search/filter/test · Alt+B sidebar · Alt+2 standard · Alt+3 expert`;
        } else if (mode === 'expert') {
            text = `Mode: ${modeLabel} · Advanced diagnostics ready · Alt+B sidebar · Alt+1 quick · Alt+D diagnostics · Alt+F filters`;
        } else {
            text = `Mode: ${modeLabel} · click select · double-click test · / or Ctrl+F search · Alt+B sidebar · Alt+1/2/3 mode`;
        }
    }
    hintEl.innerText = text;
}

function applyProxyCognitiveModeState() {
    const modal = document.getElementById('proxyModal');
    const normalized = normalizeProxyCognitiveMode(proxyCognitiveMode);
    proxyCognitiveMode = normalized;
    if (modal) modal.setAttribute('data-cognitive-mode', normalized);

    const buttons = Array.from(document.querySelectorAll('#proxyModal [data-ui-mode]'));
    buttons.forEach((btn) => {
        const key = normalizeProxyCognitiveMode(btn.getAttribute('data-ui-mode'));
        const active = key === normalized;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    updateProxyTopHint();
}

function setProxyCognitiveMode(mode, options = {}) {
    const normalized = normalizeProxyCognitiveMode(mode);
    const prev = normalizeProxyCognitiveMode(proxyCognitiveMode);
    proxyCognitiveMode = normalized;
    persistProxyCognitiveModeState();

    if (normalized === 'quick' && prev !== 'quick') {
        proxyCognitiveStateCache = normalizeProxyCognitiveStateCache({
            secondaryFiltersExpanded: proxySecondaryFiltersExpanded,
            advancedExpanded: proxyAdvancedExpanded,
            advancedView: proxyAdvancedView,
            diagnosticsExpanded: proxyDiagnosticsExpanded,
            diagnosticsDetailExpanded: proxyDiagnosticsDetailExpanded,
            inspectorAttemptsExpanded: proxyInspectorAttemptsExpanded,
        });
        persistProxyCognitiveStateCache();
    }

    if (prev === 'quick' && normalized !== 'quick') {
        const snapshot = normalizeProxyCognitiveStateCache(proxyCognitiveStateCache || loadProxyCognitiveStateCache());
        proxySecondaryFiltersExpanded = Boolean(snapshot.secondaryFiltersExpanded);
        proxyAdvancedExpanded = Boolean(snapshot.advancedExpanded);
        proxyAdvancedView = normalizeProxyAdvancedView(snapshot.advancedView);
        proxyDiagnosticsExpanded = Boolean(snapshot.diagnosticsExpanded);
        proxyDiagnosticsDetailExpanded = Boolean(snapshot.diagnosticsDetailExpanded);
        proxyInspectorAttemptsExpanded = Boolean(snapshot.inspectorAttemptsExpanded);
    }

    if (normalized === 'quick') {
        proxySecondaryFiltersExpanded = false;
        proxyAdvancedExpanded = false;
        proxyAdvancedView = 'common';
        proxyDiagnosticsExpanded = false;
        proxyDiagnosticsDetailExpanded = false;
        proxyInspectorAttemptsExpanded = false;
        proxyWorkflowFocus = 'nodes';
        setProxySidebarNavActive('proxyFilterStack');
        persistProxySecondaryFiltersUiState();
        persistProxyAdvancedUiState();
        persistProxyAdvancedViewState();
        persistProxyDiagnosticsUiState();
        persistProxyDiagnosticsDetailUiState();
        persistProxyInspectorAttemptsUiState();
        applyProxySecondaryFiltersUiState();
        applyProxyAdvancedPanelState();
        applyProxyAdvancedViewState();
        applyProxyDiagnosticsPanelState();
        applyProxyInspectorSectionState();
    } else if (normalized === 'expert') {
        proxyAdvancedView = 'expert';
        persistProxySecondaryFiltersUiState();
        persistProxyAdvancedUiState();
        persistProxyAdvancedViewState();
        persistProxyDiagnosticsUiState();
        persistProxyDiagnosticsDetailUiState();
        persistProxyInspectorAttemptsUiState();
        applyProxyAdvancedViewState();
        applyProxySecondaryFiltersUiState();
        applyProxyAdvancedPanelState();
        applyProxyDiagnosticsPanelState();
        applyProxyInspectorSectionState();
    } else {
        if (normalizeProxyWorkflowFocus(proxyWorkflowFocus) === 'advanced') {
            proxyWorkflowFocus = 'nodes';
            setProxySidebarNavActive('proxyFilterStack');
        }
        persistProxySecondaryFiltersUiState();
        persistProxyAdvancedUiState();
        persistProxyAdvancedViewState();
        persistProxyDiagnosticsUiState();
        persistProxyDiagnosticsDetailUiState();
        persistProxyInspectorAttemptsUiState();
        applyProxyAdvancedViewState();
        applyProxySecondaryFiltersUiState();
        applyProxyAdvancedPanelState();
        applyProxyDiagnosticsPanelState();
        applyProxyInspectorSectionState();
    }

    applyProxyCognitiveModeState();
    applyProxyWorkflowFocusState();

    if (!options.silent && prev !== normalized) {
        showToast(`UI Mode: ${formatProxyCognitiveModeLabel(normalized)}`, 1300);
    }
}

function applyProxyDiagnosticsDetailState() {
    const details = document.getElementById('proxyDiagnosticsDetails');
    if (details) details.classList.toggle('is-collapsed', !proxyDiagnosticsDetailExpanded);

    const btn = document.getElementById('proxyDiagnosticsDetailToggleBtn');
    if (btn) {
        const tr = getTranslator();
        btn.setAttribute('aria-expanded', proxyDiagnosticsDetailExpanded ? 'true' : 'false');
        btn.setAttribute('data-expanded', proxyDiagnosticsDetailExpanded ? 'true' : 'false');
        btn.innerText = proxyDiagnosticsDetailExpanded
            ? (tr('proxyDiagnosticsDetailsCollapse') || 'Hide Diagnostics Details')
            : (tr('proxyDiagnosticsDetailsExpand') || 'Show Diagnostics Details');
    }
}

function applyProxyDiagnosticsPanelState() {
    const panel = document.getElementById('proxyDiagnosticsPanel');
    if (panel) panel.classList.toggle('is-collapsed', !proxyDiagnosticsExpanded);

    const btn = document.getElementById('proxyDiagnosticsToggleBtn');
    if (btn) {
        const tr = getTranslator();
        btn.setAttribute('aria-expanded', proxyDiagnosticsExpanded ? 'true' : 'false');
        btn.setAttribute('data-expanded', proxyDiagnosticsExpanded ? 'true' : 'false');
        btn.innerText = proxyDiagnosticsExpanded
            ? (tr('proxyDiagnosticsCollapse') || 'Hide Diagnostics')
            : (tr('proxyDiagnosticsExpand') || 'Show Diagnostics');
    }
    applyProxyDiagnosticsDetailState();
}

function toggleProxyAdvancedPanel() {
    if (proxyCognitiveMode === 'quick') return;
    proxyAdvancedExpanded = !proxyAdvancedExpanded;
    persistProxyAdvancedUiState();
    applyProxyAdvancedPanelState();
    if (proxyAdvancedExpanded) {
        setProxySidebarNavActive('proxyAdvancedShell');
        setProxyWorkflowFocus('advanced');
    } else {
        setProxyWorkflowFocus('nodes');
    }
}

function toggleProxySecondaryFilters() {
    if (proxyCognitiveMode === 'quick') return;
    proxySecondaryFiltersExpanded = !proxySecondaryFiltersExpanded;
    persistProxySecondaryFiltersUiState();
    applyProxySecondaryFiltersUiState();
    if (proxySecondaryFiltersExpanded) setProxySidebarNavActive('proxyFilterStack');
    setProxyWorkflowFocus('nodes');
}

function setProxyAdvancedView(view) {
    if (proxyCognitiveMode === 'quick') {
        proxyAdvancedView = 'common';
        persistProxyAdvancedViewState();
        applyProxyAdvancedViewState();
        return;
    }
    proxyAdvancedView = normalizeProxyAdvancedView(view);
    persistProxyAdvancedViewState();
    applyProxyAdvancedViewState();
}

function toggleProxyDiagnosticsPanel() {
    if (proxyCognitiveMode === 'quick') return;
    proxyDiagnosticsExpanded = !proxyDiagnosticsExpanded;
    persistProxyDiagnosticsUiState();
    applyProxyDiagnosticsPanelState();
}

function toggleProxyDiagnosticsDetailPanel() {
    if (proxyCognitiveMode === 'quick') return;
    proxyDiagnosticsDetailExpanded = !proxyDiagnosticsDetailExpanded;
    persistProxyDiagnosticsDetailUiState();
    applyProxyDiagnosticsDetailState();
}

function applyProxyListViewStateToControls() {
    const searchEl = document.getElementById('proxySearchInput');
    if (searchEl && searchEl.value !== proxyListViewState.search) searchEl.value = proxyListViewState.search;

    const statusEl = document.getElementById('proxyStatusFilter');
    if (statusEl && statusEl.value !== proxyListViewState.status) statusEl.value = proxyListViewState.status;

    const sortEl = document.getElementById('proxySortBy');
    if (sortEl && sortEl.value !== proxyListViewState.sort) sortEl.value = proxyListViewState.sort;

    const presetButtons = Array.from(document.querySelectorAll('#proxyModal [data-proxy-preset]'));
    presetButtons.forEach((btn) => {
        const key = String(btn.getAttribute('data-proxy-preset') || '').trim();
        btn.classList.toggle('active', key && key === proxyListViewState.preset);
    });

    const statusQuickButtons = Array.from(document.querySelectorAll('#proxyModal [data-status-filter]'));
    statusQuickButtons.forEach((btn) => {
        const key = String(btn.getAttribute('data-status-filter') || '').trim();
        btn.classList.toggle('active', key === proxyListViewState.status);
    });

    applyProxyPresetTrustPolicyToControl();
}

function getNodeLatencyForSort(node) {
    const latency = Number(node && node.latency);
    return Number.isFinite(latency) && latency >= 0 ? latency : Number.POSITIVE_INFINITY;
}

function getNodeStatusTag(node) {
    if (node && node.lastTestAt) return node.lastTestOk ? 'pass' : 'fail';
    return 'wait';
}

function parseSearchKeywordGroups(query) {
    const raw = String(query || '').trim().toLowerCase();
    if (!raw) return [];
    return raw
        .split(/\s+/g)
        .map((group) => group
            .split('|')
            .map((token) => token.trim())
            .filter(Boolean)
            .slice(0, 12))
        .filter((group) => group.length > 0)
        .slice(0, 10);
}

function nodeMatchesSearch(node, query) {
    const groups = parseSearchKeywordGroups(query);
    if (groups.length === 0) return true;
    const text = [
        node && node.remark ? node.remark : '',
        node && node.url ? node.url : '',
        node && node.lastTestCode ? node.lastTestCode : '',
        node && node.lastTestFinalCode ? node.lastTestFinalCode : '',
        node && node.lastTestMsg ? node.lastTestMsg : '',
        node && node.ipInfo && node.ipInfo.ip ? node.ipInfo.ip : '',
        node && node.ipInfo && node.ipInfo.country ? node.ipInfo.country : '',
        node && node.ipInfo && node.ipInfo.city ? node.ipInfo.city : '',
        node && node.ipInfo && node.ipInfo.region ? node.ipInfo.region : '',
        node && node.ipInfo && node.ipInfo.timezone ? node.ipInfo.timezone : '',
    ].join(' ').toLowerCase();
    return groups.every((group) => group.some((token) => text.includes(token)));
}

function applyProxyQueryPreset(presetKey) {
    const key = String(presetKey || '').trim();
    const presetMap = getProxyQueryPresetMap();
    if (!Object.prototype.hasOwnProperty.call(presetMap, key)) {
        proxyListViewState = normalizeProxyListViewState({ ...proxyListViewState, preset: 'custom' });
        applyProxyListViewStateToControls();
        persistProxyListViewState();
        renderProxyNodes();
        return;
    }

    const preset = presetMap[key];
    if (!preset) {
        proxyListViewState = normalizeProxyListViewState({ ...proxyListViewState, preset: 'custom' });
        applyProxyListViewStateToControls();
        persistProxyListViewState();
        renderProxyNodes();
        return;
    }

    proxyListViewState = normalizeProxyListViewState({
        ...proxyListViewState,
        ...preset,
        preset: key,
    });
    applyProxyListViewStateToControls();
    persistProxyListViewState();
    renderProxyNodes();
}

function applyProxyListFilterAndSort(nodes) {
    const list = Array.isArray(nodes) ? nodes.slice() : [];
    const view = normalizeProxyListViewState(proxyListViewState);
    const filtered = list.filter((node) => {
        if (view.status !== 'all' && getNodeStatusTag(node) !== view.status) return false;
        if (!nodeMatchesSearch(node, view.search)) return false;
        return true;
    });

    const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    switch (view.sort) {
        case 'latency_asc':
            filtered.sort((a, b) => getNodeLatencyForSort(a) - getNodeLatencyForSort(b));
            break;
        case 'latency_desc':
            filtered.sort((a, b) => getNodeLatencyForSort(b) - getNodeLatencyForSort(a));
            break;
        case 'updated_desc':
            filtered.sort((a, b) => Number(b && b.lastTestAt || 0) - Number(a && a.lastTestAt || 0));
            break;
        case 'fail_first':
            filtered.sort((a, b) => {
                const rank = { fail: 0, wait: 1, pass: 2 };
                const d = rank[getNodeStatusTag(a)] - rank[getNodeStatusTag(b)];
                if (d !== 0) return d;
                return getNodeLatencyForSort(a) - getNodeLatencyForSort(b);
            });
            break;
        case 'name_asc':
            filtered.sort((a, b) => collator.compare(String(a && a.remark || ''), String(b && b.remark || '')));
            break;
        default:
            break;
    }

    return filtered;
}

function readProxyBenchmarkSnapshotStore() {
    try {
        const text = localStorage.getItem(PROXY_BENCHMARK_SNAPSHOT_KEY);
        if (!text) return {};
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function writeProxyBenchmarkSnapshotStore(store) {
    try {
        localStorage.setItem(PROXY_BENCHMARK_SNAPSHOT_KEY, JSON.stringify(store || {}));
    } catch (e) { }
}

function getCurrentProxyGroupSnapshot() {
    const store = readProxyBenchmarkSnapshotStore();
    const key = currentProxyGroup || 'manual';
    const item = store[key];
    if (!item || typeof item !== 'object') return null;
    return item;
}

function saveCurrentProxyGroupSnapshot(snapshot) {
    const key = currentProxyGroup || 'manual';
    const store = readProxyBenchmarkSnapshotStore();
    store[key] = snapshot;
    writeProxyBenchmarkSnapshotStore(store);
}

function readProxyFailCodeTrendStore() {
    try {
        const text = localStorage.getItem(PROXY_FAIL_CODE_TREND_KEY);
        if (!text) return {};
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function writeProxyFailCodeTrendStore(store) {
    try {
        localStorage.setItem(PROXY_FAIL_CODE_TREND_KEY, JSON.stringify(store || {}));
    } catch (e) { }
}

function getCurrentProxyGroupFailTrend() {
    const store = readProxyFailCodeTrendStore();
    const key = currentProxyGroup || 'manual';
    const list = store[key];
    return Array.isArray(list) ? list.filter((item) => item && typeof item === 'object').slice(-PROXY_FAIL_CODE_TREND_LIMIT) : [];
}

function readProxyTrendAnomalyHistoryStore() {
    try {
        const text = localStorage.getItem(PROXY_TREND_ANOMALY_HISTORY_KEY);
        if (!text) return {};
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function writeProxyTrendAnomalyHistoryStore(store) {
    try {
        localStorage.setItem(PROXY_TREND_ANOMALY_HISTORY_KEY, JSON.stringify(store || {}));
    } catch (e) { }
}

function normalizeProxyTrendAnomalyHistoryEntry(item) {
    if (!item || typeof item !== 'object') return null;
    const savedAt = Number(item.savedAt);
    const signature = String(item.signature || '').trim();
    const topSeverity = String(item.topSeverity || 'info').toLowerCase();
    const headline = String(item.headline || '').trim();
    const failDelta = Number(item.failDelta || 0);
    const passRateDelta = Number(item.passRateDelta);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    if (!signature) return null;
    return {
        savedAt,
        signature,
        topSeverity: ['critical', 'warn', 'good', 'info'].includes(topSeverity) ? topSeverity : 'info',
        headline: headline || tText('proxyAnomalyStable', 'Stable'),
        failDelta: Number.isFinite(failDelta) ? failDelta : 0,
        passRateDelta: Number.isFinite(passRateDelta) ? passRateDelta : null,
    };
}

function getCurrentProxyGroupTrendAnomalyHistory() {
    const store = readProxyTrendAnomalyHistoryStore();
    const key = currentProxyGroup || 'manual';
    const list = store[key];
    return Array.isArray(list)
        ? list.map((item) => normalizeProxyTrendAnomalyHistoryEntry(item)).filter(Boolean).slice(-PROXY_TREND_ANOMALY_HISTORY_LIMIT)
        : [];
}

function getCurrentProxyGroupNodeList() {
    return (globalSettings.preProxies || []).filter((node) => {
        if (currentProxyGroup === 'manual') return !node.groupId || node.groupId === 'manual';
        return node.groupId === currentProxyGroup;
    });
}

async function exportProxyFailTrendSnapshot() {
    try {
        const list = getCurrentProxyGroupNodeList();
        const metrics = computeProxyGroupMetrics(list);
        const distribution = buildFailureCodeDistribution(list, 8);
        const trend = getCurrentProxyGroupFailTrend();
        const trendDiffPack = buildProxyTrendDiffPack(trend);
        const trendAnomalyBadges = buildProxyTrendAnomalyBadges(trendDiffPack);
        const trendAnomalyHistory = getCurrentProxyGroupTrendAnomalyHistory();
        const payload = {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            groupId: currentProxyGroup || 'manual',
            metrics,
            failureDistribution: distribution,
            trend,
            trendDiffPack,
            trendAnomalyBadges,
            trendAnomalyHistory,
            queryViewState: normalizeProxyListViewState(proxyListViewState),
        };
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyTrendSnapshotCopied', 'Trend snapshot copied ({points} points)', { points: payload.trend.length }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyTrendSnapshotExportFailed', 'Export trend snapshot failed')}: ${err && err.message ? err.message : err}`);
    }
}

function normalizeProxyFailTrendPoint(item) {
    if (!item || typeof item !== 'object') return null;
    const savedAt = Number(item.savedAt);
    const signature = String(item.signature || '').trim();
    const total = Number(item.total);
    const fail = Number(item.fail);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    if (!Number.isFinite(total) || total < 0) return null;
    if (!Number.isFinite(fail) || fail < 0) return null;
    return {
        savedAt,
        signature: signature || `${savedAt}|${String(item.topCode || '-')}`,
        total,
        pass: Number.isFinite(Number(item.pass)) ? Number(item.pass) : 0,
        fail,
        waiting: Number.isFinite(Number(item.waiting)) ? Number(item.waiting) : 0,
        passRate: Number.isFinite(Number(item.passRate)) ? Number(item.passRate) : null,
        avgLatency: Number.isFinite(Number(item.avgLatency)) ? Number(item.avgLatency) : null,
        p95Latency: Number.isFinite(Number(item.p95Latency)) ? Number(item.p95Latency) : null,
        topCode: String(item.topCode || '-'),
        topCount: Number.isFinite(Number(item.topCount)) ? Number(item.topCount) : 0,
    };
}

function mergeProxyFailTrendEntries(existing, incoming, maxEntries = PROXY_FAIL_CODE_TREND_LIMIT) {
    const mergedMap = new Map();
    (Array.isArray(existing) ? existing : [])
        .map((item) => normalizeProxyFailTrendPoint(item))
        .filter(Boolean)
        .forEach((item) => mergedMap.set(`${item.signature}|${item.savedAt}`, item));
    (Array.isArray(incoming) ? incoming : [])
        .map((item) => normalizeProxyFailTrendPoint(item))
        .filter(Boolean)
        .forEach((item) => mergedMap.set(`${item.signature}|${item.savedAt}`, item));
    return Array.from(mergedMap.values())
        .sort((a, b) => a.savedAt - b.savedAt)
        .slice(-Math.max(1, Number(maxEntries) || PROXY_FAIL_CODE_TREND_LIMIT));
}

function mergeProxyTrendAnomalyHistoryEntries(existing, incoming, maxEntries = PROXY_TREND_ANOMALY_HISTORY_LIMIT) {
    const mergedMap = new Map();
    (Array.isArray(existing) ? existing : [])
        .map((item) => normalizeProxyTrendAnomalyHistoryEntry(item))
        .filter(Boolean)
        .forEach((item) => mergedMap.set(`${item.signature}|${item.savedAt}`, item));
    (Array.isArray(incoming) ? incoming : [])
        .map((item) => normalizeProxyTrendAnomalyHistoryEntry(item))
        .filter(Boolean)
        .forEach((item) => mergedMap.set(`${item.signature}|${item.savedAt}`, item));
    return Array.from(mergedMap.values())
        .sort((a, b) => a.savedAt - b.savedAt)
        .slice(-Math.max(1, Number(maxEntries) || PROXY_TREND_ANOMALY_HISTORY_LIMIT));
}

function parseProxyFailTrendSnapshotPayload(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error(tText('proxyTrendSnapshotErrEmpty', 'empty trend snapshot payload'));
    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        try {
            parsed = JSON.parse(atob(raw));
        } catch (e2) {
            throw new Error(tText('proxyTrendSnapshotErrFormat', 'invalid trend snapshot payload format'));
        }
    }
    if (!parsed || typeof parsed !== 'object') throw new Error(tText('proxyTrendSnapshotErrInvalid', 'invalid trend snapshot payload'));
    const trend = Array.isArray(parsed.trend) ? parsed.trend : [];
    const normalizedTrend = trend.map((item) => normalizeProxyFailTrendPoint(item)).filter(Boolean);
    if (normalizedTrend.length === 0) throw new Error(tText('proxyTrendSnapshotErrNoPoints', 'trend snapshot payload has no valid trend points'));
    return {
        groupId: String(parsed.groupId || '').trim() || currentProxyGroup || 'manual',
        trend: normalizedTrend,
    };
}

function normalizeProxyTrendAnomalyReplayFrame(item) {
    if (!item || typeof item !== 'object') return null;
    const savedAt = Number(item.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    const severity = String(item.severity || 'info').toLowerCase();
    const headline = String(item.headline || '').trim().slice(0, 96) || tText('proxyAnomalyLabel', 'Anomaly');
    const failDelta = Number(item.failDelta || 0);
    const passRateDelta = Number(item.passRateDelta);
    const nearestTrendPoint = normalizeProxyFailTrendPoint(item.nearestTrendPoint);
    return {
        savedAt,
        severity: ['critical', 'warn', 'good', 'info'].includes(severity) ? severity : 'info',
        headline,
        failDelta: Number.isFinite(failDelta) ? failDelta : 0,
        passRateDelta: Number.isFinite(passRateDelta) ? passRateDelta : null,
        nearestTrendPoint,
    };
}

function parseProxyTrendAnomalyReplayPayload(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error(tText('proxyAnomalyReplayErrEmpty', 'empty anomaly replay payload'));
    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        try {
            parsed = JSON.parse(atob(raw));
        } catch (e2) {
            throw new Error(tText('proxyAnomalyReplayErrFormat', 'invalid anomaly replay payload format'));
        }
    }
    if (!parsed || typeof parsed !== 'object') throw new Error(tText('proxyAnomalyReplayErrInvalid', 'invalid anomaly replay payload'));
    const frames = (Array.isArray(parsed.replayFrames) ? parsed.replayFrames : [])
        .map((item) => normalizeProxyTrendAnomalyReplayFrame(item))
        .filter(Boolean);
    if (frames.length === 0) throw new Error(tText('proxyAnomalyReplayErrNoFrames', 'anomaly replay payload has no valid replay frames'));
    const trend = frames
        .map((frame) => frame.nearestTrendPoint)
        .filter(Boolean);
    const anomalyHistory = frames
        .map((frame) => normalizeProxyTrendAnomalyHistoryEntry({
            savedAt: frame.savedAt,
            signature: `${frame.savedAt}::${frame.severity}:${frame.headline}::${frame.nearestTrendPoint ? frame.nearestTrendPoint.savedAt : 0}`,
            topSeverity: frame.severity,
            headline: frame.headline,
            failDelta: frame.failDelta,
            passRateDelta: frame.passRateDelta,
        }))
        .filter(Boolean);
    if (anomalyHistory.length === 0) throw new Error(tText('proxyAnomalyReplayErrNoHistory', 'anomaly replay payload has no valid anomaly history points'));
    return {
        groupId: String(parsed.groupId || '').trim() || currentProxyGroup || 'manual',
        trend,
        anomalyHistory,
        replayFrames: frames,
    };
}

function importProxyFailTrendSnapshot() {
    showInput(tText('proxyTrendSnapshotImportPrompt', 'Paste trend snapshot JSON/base64'), (value) => {
        try {
            const parsed = parseProxyFailTrendSnapshotPayload(value);
            const targetGroup = parsed.groupId || 'manual';
            const store = readProxyFailCodeTrendStore();
            const existing = Array.isArray(store[targetGroup]) ? store[targetGroup] : [];
            const merged = mergeProxyFailTrendEntries(existing, parsed.trend, PROXY_FAIL_CODE_TREND_LIMIT);
            store[targetGroup] = merged;
            writeProxyFailCodeTrendStore(store);
            if ((currentProxyGroup || 'manual') === targetGroup) {
                renderProxyFailTrendTimeline();
                renderProxyTrendDiffPack();
            }
            showToast(
                tFormat('proxyTrendSnapshotMerged', 'Trend snapshot merged ({group}) · +{count}', {
                    group: targetGroup,
                    count: parsed.trend.length,
                }),
                2400,
            );
        } catch (err) {
            showAlert(`${tText('proxyTrendSnapshotImportFailed', 'Import trend snapshot failed')}: ${err && err.message ? err.message : err}`);
        }
    });
}

function importProxyTrendAnomalyReplay() {
    showInput(tText('proxyAnomalyReplayImportPrompt', 'Paste anomaly replay JSON/base64'), (value) => {
        try {
            const parsed = parseProxyTrendAnomalyReplayPayload(value);
            const routeMeta = resolveProxyReplayImportTargetGroup(parsed.groupId);
            const targetGroup = String(routeMeta && routeMeta.targetGroup || '').trim() || 'manual';
            const driftEntry = detectProxyReplayRouteDrift(routeMeta);
            if (driftEntry) {
                recordProxyReplayRouteDrift(driftEntry);
            }
            const trendStore = readProxyFailCodeTrendStore();
            const existingTrend = Array.isArray(trendStore[targetGroup]) ? trendStore[targetGroup] : [];
            const mergedTrend = mergeProxyFailTrendEntries(existingTrend, parsed.trend, PROXY_FAIL_CODE_TREND_LIMIT);
            trendStore[targetGroup] = mergedTrend;
            writeProxyFailCodeTrendStore(trendStore);
            const anomalyStore = readProxyTrendAnomalyHistoryStore();
            const existingAnomaly = Array.isArray(anomalyStore[targetGroup]) ? anomalyStore[targetGroup] : [];
            const mergedAnomaly = mergeProxyTrendAnomalyHistoryEntries(existingAnomaly, parsed.anomalyHistory, PROXY_TREND_ANOMALY_HISTORY_LIMIT);
            anomalyStore[targetGroup] = mergedAnomaly;
            writeProxyTrendAnomalyHistoryStore(anomalyStore);
            if ((currentProxyGroup || 'manual') === targetGroup) {
                renderProxyFailTrendTimeline();
                renderProxyTrendDiffPack();
                renderProxyTrendAnomalyHistory();
                renderProxyReplayRouteDriftSummary();
                renderProxyReplayRouteMitigationHint();
            }
            showToast(
                tFormat(
                    'proxyAnomalyReplayMerged',
                    'Anomaly replay merged ({group}) · route {route} · trend +{trendCount} · history +{historyCount}',
                    {
                        group: targetGroup,
                        route: routeMeta.route,
                        trendCount: parsed.trend.length,
                        historyCount: parsed.anomalyHistory.length,
                    },
                ),
                2600,
            );
        } catch (err) {
            showAlert(`${tText('proxyAnomalyReplayImportFailed', 'Import anomaly replay failed')}: ${err && err.message ? err.message : err}`);
        }
    });
}

function clearProxyFilters() {
    proxyListViewState = normalizeProxyListViewState({});
    applyProxyListViewStateToControls();
    persistProxyListViewState();
    renderProxyNodes();
}

function setProxyStatusFilter(statusTag) {
    const nextStatus = String(statusTag || 'all');
    proxyListViewState.status = (
        nextStatus !== 'all'
        && String(proxyListViewState.status || 'all') === nextStatus
    )
        ? 'all'
        : nextStatus;
    proxyListViewState.preset = 'custom';
    proxyListViewState = normalizeProxyListViewState(proxyListViewState);
    applyProxyListViewStateToControls();
    persistProxyListViewState();
    renderProxyNodes();
}

function renderProxyStatusQuickbar(metrics, visibleCount = null) {
    const allCountEl = document.getElementById('proxyQuickAllCount');
    const passCountEl = document.getElementById('proxyQuickPassCount');
    const failCountEl = document.getElementById('proxyQuickFailCount');
    const waitCountEl = document.getElementById('proxyQuickWaitCount');
    if (!allCountEl || !passCountEl || !failCountEl || !waitCountEl) return;

    const total = Number(metrics && metrics.total) || 0;
    const pass = Number(metrics && metrics.pass) || 0;
    const fail = Number(metrics && metrics.fail) || 0;
    const wait = Number(metrics && metrics.waiting) || 0;
    const visible = Number.isFinite(visibleCount) ? Math.max(0, Math.floor(visibleCount)) : total;

    allCountEl.textContent = visible !== total ? `${visible}/${total}` : `${total}`;
    passCountEl.textContent = String(pass);
    failCountEl.textContent = String(fail);
    waitCountEl.textContent = String(wait);
}

function ensureProxyModalUiEventsBound() {
    if (__proxyModalUiEventsBound) return;
    __proxyModalUiEventsBound = true;

    const modalEl = document.getElementById('proxyModal');
    if (modalEl instanceof HTMLElement) {
        document.addEventListener('click', (ev) => {
            if (modalEl.style.display !== 'flex') return;
            if (ev.target && ev.target.closest && ev.target.closest('#proxyModal .proxy-group-more.profile-more-menu')) return;
            closeOpenProxyGroupMoreMenus(modalEl);
        });

        document.addEventListener('keydown', (ev) => {
            if (modalEl.style.display !== 'flex') return;
            if (ev.key === 'Escape') closeOpenProxyGroupMoreMenus(modalEl);
            if ((ev.ctrlKey || ev.metaKey) && String(ev.key || '').toLowerCase() === 's') {
                ev.preventDefault();
                saveProxySettings();
            }
            if ((ev.ctrlKey || ev.metaKey) && String(ev.key || '').toLowerCase() === 'n') {
                ev.preventDefault();
                openSubEditModal(true);
            }
        });

        const groupMenus = Array.from(modalEl.querySelectorAll('.proxy-group-more.profile-more-menu'));
        groupMenus.forEach((menuEl) => {
            if (!(menuEl instanceof HTMLDetailsElement)) return;
            menuEl.addEventListener('toggle', () => {
                if (menuEl.open) {
                    closeOpenProxyGroupMoreMenus(modalEl, menuEl);
                    updateProxyGroupMoreMenuDirection(menuEl, modalEl);
                } else {
                    menuEl.classList.remove('open-upward');
                }
            });
        });

        const modalShellEl = modalEl.querySelector('.proxy-modal-shell');
        if (modalShellEl instanceof HTMLElement) {
            modalShellEl.addEventListener('scroll', () => {
                modalEl.querySelectorAll('.proxy-group-more.profile-more-menu[open]').forEach((menuEl) => {
                    updateProxyGroupMoreMenuDirection(menuEl, modalEl);
                });
            }, { passive: true });
        }
    }

    const searchEl = document.getElementById('proxySearchInput');
    if (searchEl) {
        searchEl.addEventListener('input', (ev) => {
            proxyListViewState.search = String(ev && ev.target ? ev.target.value : '');
            proxyListViewState.preset = 'custom';
            proxyListViewState = normalizeProxyListViewState(proxyListViewState);
            persistProxyListViewState();
            renderProxyNodes();
        });
        searchEl.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && String(searchEl.value || '').trim()) {
                ev.preventDefault();
                proxyListViewState.search = '';
                proxyListViewState.preset = 'custom';
                proxyListViewState = normalizeProxyListViewState(proxyListViewState);
                applyProxyListViewStateToControls();
                persistProxyListViewState();
                renderProxyNodes();
            }
        });
    }

    const statusEl = document.getElementById('proxyStatusFilter');
    if (statusEl) {
        statusEl.addEventListener('change', (ev) => {
            proxyListViewState.status = String(ev && ev.target ? ev.target.value : 'all');
            proxyListViewState.preset = 'custom';
            proxyListViewState = normalizeProxyListViewState(proxyListViewState);
            persistProxyListViewState();
            renderProxyNodes();
        });
    }

    const sortEl = document.getElementById('proxySortBy');
    if (sortEl) {
        sortEl.addEventListener('change', (ev) => {
            proxyListViewState.sort = String(ev && ev.target ? ev.target.value : 'default');
            proxyListViewState.preset = 'custom';
            proxyListViewState = normalizeProxyListViewState(proxyListViewState);
            persistProxyListViewState();
            renderProxyNodes();
        });
    }

    const splitterEl = document.getElementById('proxyMainSplitter');
    const proxyMainEl = document.querySelector('#proxyModal .proxy-main');
    if (splitterEl instanceof HTMLElement && proxyMainEl instanceof HTMLElement) {
        splitterEl.addEventListener('mousedown', (ev) => {
            try {
                if (ev.button !== 0) return;
                ev.preventDefault();

                const rect = proxyMainEl.getBoundingClientRect();
                const rightEdge = rect.right;
                const prevCursor = document.body ? document.body.style.cursor : '';
                if (document.body) document.body.style.cursor = 'col-resize';
                splitterEl.classList.add('is-dragging');

                const onMove = (moveEv) => {
                    try {
                        const nextWidth = normalizeProxyInspectorWidthPx(rightEdge - Number(moveEv.clientX || 0));
                        proxyInspectorWidthPx = nextWidth;
                        applyProxyInspectorWidthPx();
                    } catch (e) { }
                };

                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    splitterEl.classList.remove('is-dragging');
                    if (document.body) document.body.style.cursor = prevCursor;
                    persistProxyInspectorWidthPx();
                };

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            } catch (e) {
                console.error('proxy splitter resize failed:', e);
            }
        });

        splitterEl.addEventListener('dblclick', () => {
            try {
                proxyInspectorWidthPx = 400;
                applyProxyInspectorWidthPx();
                persistProxyInspectorWidthPx();
            } catch (e) { }
        });
    }

    window.addEventListener('resize', () => {
        try {
            const modal = document.getElementById('proxyModal');
            if (!modal || modal.style.display !== 'flex') return;
            applyProxyModalLayoutMode();
        } catch (e) { }
    }, { passive: true });

    const trustPolicyEl = document.getElementById('proxyPresetTrustPolicy');
    if (trustPolicyEl) {
        trustPolicyEl.addEventListener('change', (ev) => {
            proxyPresetTrustPolicy = normalizeProxyPresetTrustPolicy(ev && ev.target ? ev.target.value : 'signed_preferred');
            proxyPresetIssuerTemplate = 'custom';
            persistProxyPresetIssuerTemplate();
            persistProxyPresetTrustPolicy();
            applyProxyPresetTrustPolicyToControl();
            showToast(
                tFormat('proxyTrustPolicySaved', 'Preset trust policy: {policy}', {
                    policy: formatProxyTrustPolicyLabel(proxyPresetTrustPolicy),
                }),
                1600,
            );
        });
    }

    const replayRouteEl = document.getElementById('proxyReplayImportRouteMode');
    if (replayRouteEl) {
        replayRouteEl.addEventListener('change', (ev) => {
            proxyReplayImportRouteMode = normalizeProxyReplayImportRouteMode(ev && ev.target ? ev.target.value : 'payload');
            persistProxyReplayImportRouteMode();
            applyProxyReplayImportRouteModeToControl();
            showToast(
                tFormat('proxyReplayRouteModeSaved', 'Replay route mode: {mode}', {
                    mode: formatProxyReplayRouteModeLabel(proxyReplayImportRouteMode),
                }),
                1600,
            );
        });
    }

    const quickSaveByEnter = (ev) => {
        if (!ev || ev.key !== 'Enter' || ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) return;
        ev.preventDefault();
        savePreProxy();
    };
    const manualRemarkEl = document.getElementById('newProxyRemark');
    const manualUrlEl = document.getElementById('newProxyUrl');
    if (manualRemarkEl) manualRemarkEl.addEventListener('keydown', quickSaveByEnter);
    if (manualUrlEl) manualUrlEl.addEventListener('keydown', quickSaveByEnter);

    const modeEl = document.getElementById('proxyMode');
    if (modeEl) {
        modeEl.addEventListener('change', (ev) => {
            globalSettings.mode = String(ev && ev.target ? ev.target.value : 'single') || 'single';
            scheduleSettingsSave();
            renderProxyNodes();
            updateToolbar();
        });
    }

    const notifyEl = document.getElementById('notifySwitch');
    if (notifyEl) {
        notifyEl.addEventListener('change', (ev) => {
            globalSettings.notify = Boolean(ev && ev.target ? ev.target.checked : false);
            const ns2 = document.getElementById('notifySwitch2');
            if (ns2 instanceof HTMLInputElement) ns2.checked = globalSettings.notify;
            scheduleSettingsSave();
        });
    }

    const notifyEl2 = document.getElementById('notifySwitch2');
    if (notifyEl2) {
        notifyEl2.addEventListener('change', (ev) => {
            globalSettings.notify = Boolean(ev && ev.target ? ev.target.checked : false);
            const ns1 = document.getElementById('notifySwitch');
            if (ns1 instanceof HTMLInputElement) ns1.checked = globalSettings.notify;
            scheduleSettingsSave();
        });
    }

    const strategyProfileEl = document.getElementById('proxyTestProfile');
    if (strategyProfileEl) {
        strategyProfileEl.addEventListener('change', (ev) => {
            applyProxyStrategyProfileChipState(ev && ev.target ? ev.target.value : 'standard');
        });
    }

    document.addEventListener('keydown', (ev) => {
        const modal = document.getElementById('proxyModal');
        if (!modal || modal.style.display !== 'flex') return;
        const targetEl = ev.target instanceof HTMLElement ? ev.target : null;
        const tagName = targetEl ? String(targetEl.tagName || '').toLowerCase() : '';
        const isTypingContext = !!(targetEl && (targetEl.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'));
        const key = String(ev.key || '');
        const keyLower = key.toLowerCase();
        if ((ev.ctrlKey || ev.metaKey) && String(ev.key || '').toLowerCase() === 'f') {
            const searchInput = document.getElementById('proxySearchInput');
            if (!searchInput) return;
            ev.preventDefault();
            searchInput.focus();
            searchInput.select();
            return;
        }
        if (!isTypingContext && ev.altKey && !ev.ctrlKey && !ev.metaKey) {
            if (key === '1') {
                ev.preventDefault();
                setProxyCognitiveMode('quick');
                return;
            }
            if (key === '2') {
                ev.preventDefault();
                setProxyCognitiveMode('standard');
                return;
            }
            if (key === '3') {
                ev.preventDefault();
                setProxyCognitiveMode('expert');
                return;
            }
            if (keyLower === 'b') {
                ev.preventDefault();
                toggleProxySidebar();
                return;
            }
            if (keyLower === 'f') {
                ev.preventDefault();
                if (proxyCognitiveMode !== 'quick') toggleProxySecondaryFilters();
                return;
            }
            if (keyLower === 'd') {
                ev.preventDefault();
                if (proxyCognitiveMode !== 'quick') toggleProxyDiagnosticsPanel();
                return;
            }
            if (keyLower === 'i') {
                ev.preventDefault();
                toggleProxyInspectorPanel();
                return;
            }
            if (keyLower === 't') {
                ev.preventDefault();
                testCurrentGroup();
                return;
            }
        }
        if (!isTypingContext && !ev.ctrlKey && !ev.metaKey && !ev.altKey && key === '/') {
            const searchInput = document.getElementById('proxySearchInput');
            if (!searchInput) return;
            ev.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });
}

function getProxyBatchSchedulerApi() {
    if (typeof window !== 'undefined' && window.ProxyTestScheduler && typeof window.ProxyTestScheduler.normalizeProxyBatchTestStrategy === 'function') {
        return window.ProxyTestScheduler;
    }
    return null;
}

function getHardwareConcurrencyHint() {
    if (typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)) {
        return Math.max(1, Math.floor(Number(navigator.hardwareConcurrency)));
    }
    return 4;
}

function normalizeProxyBatchTestStrategyForUi(input, nodeCount = 0) {
    const api = getProxyBatchSchedulerApi();
    if (api && typeof api.normalizeProxyBatchTestStrategy === 'function') {
        return api.normalizeProxyBatchTestStrategy(input, {
            nodeCount: Number.isFinite(nodeCount) ? nodeCount : 0,
            hardwareConcurrency: getHardwareConcurrencyHint(),
        });
    }

    const fallback = {
        enabled: true,
        maxConcurrency: Math.max(1, Math.min(4, Number.isFinite(nodeCount) && nodeCount > 0 ? nodeCount : 4)),
        batchSize: 50,
        budgetMs: 180000,
        backoffBaseMs: 600,
        backoffMaxMs: 5000,
        highFailureRatio: 0.8,
        minSamplesForBackoff: 5,
        perProtocolBackoff: true,
        yieldEvery: 20,
        testProfile: 'standard',
        probeTimeoutMs: 7000,
        ipTimeoutMs: 8000,
        geoTimeoutMs: 8000,
        probeCount: 4,
        probeParallelism: 2,
        includeGeo: true,
        engineBootWaitMs: 800,
        adaptiveBudget: true,
        adaptivePressureThreshold: 1.2,
        protocolBucketed: true,
    };
    return { ...fallback, ...(input && typeof input === 'object' ? input : {}) };
}

function applyProxyBatchStrategyToInputs(strategy) {
    const target = strategy || normalizeProxyBatchTestStrategyForUi(null, 0);
    const enabledEl = document.getElementById('proxyTestStrategyEnabled');
    const concurrencyEl = document.getElementById('proxyTestMaxConcurrency');
    const batchSizeEl = document.getElementById('proxyTestBatchSize');
    const budgetEl = document.getElementById('proxyTestBudgetSec');
    const backoffEl = document.getElementById('proxyTestBackoffMs');
    const profileEl = document.getElementById('proxyTestProfile');
    const probeTimeoutEl = document.getElementById('proxyTestProbeTimeoutSec');
    const ipTimeoutEl = document.getElementById('proxyTestIpTimeoutSec');
    const geoTimeoutEl = document.getElementById('proxyTestGeoTimeoutSec');
    const probeCountEl = document.getElementById('proxyTestProbeCount');
    const probeParallelismEl = document.getElementById('proxyTestProbeParallelism');
    const includeGeoEl = document.getElementById('proxyTestIncludeGeo');

    if (enabledEl) enabledEl.checked = target.enabled !== false;
    if (concurrencyEl) concurrencyEl.value = String(target.maxConcurrency || 1);
    if (batchSizeEl) batchSizeEl.value = String(target.batchSize || 50);
    if (budgetEl) budgetEl.value = String(Math.max(1, Math.round((target.budgetMs || 180000) / 1000)));
    if (backoffEl) backoffEl.value = String(target.backoffBaseMs || 0);
    if (profileEl) profileEl.value = normalizeProxyTestProfileValue(target.testProfile || 'standard');
    if (probeTimeoutEl) probeTimeoutEl.value = String(Math.max(1, Math.round((target.probeTimeoutMs || 7000) / 1000)));
    if (ipTimeoutEl) ipTimeoutEl.value = String(Math.max(1, Math.round((target.ipTimeoutMs || 8000) / 1000)));
    if (geoTimeoutEl) geoTimeoutEl.value = String(Math.max(1, Math.round((target.geoTimeoutMs || 8000) / 1000)));
    if (probeCountEl) probeCountEl.value = String(target.probeCount || 4);
    if (probeParallelismEl) probeParallelismEl.value = String(target.probeParallelism || 1);
    if (includeGeoEl) includeGeoEl.checked = target.includeGeo !== false;
    applyProxyStrategyProfileChipState(target.testProfile || 'standard');
}

function readProxyBatchStrategyFromInputs() {
    const enabledEl = document.getElementById('proxyTestStrategyEnabled');
    const concurrencyEl = document.getElementById('proxyTestMaxConcurrency');
    const batchSizeEl = document.getElementById('proxyTestBatchSize');
    const budgetEl = document.getElementById('proxyTestBudgetSec');
    const backoffEl = document.getElementById('proxyTestBackoffMs');
    const profileEl = document.getElementById('proxyTestProfile');
    const probeTimeoutEl = document.getElementById('proxyTestProbeTimeoutSec');
    const ipTimeoutEl = document.getElementById('proxyTestIpTimeoutSec');
    const geoTimeoutEl = document.getElementById('proxyTestGeoTimeoutSec');
    const probeCountEl = document.getElementById('proxyTestProbeCount');
    const probeParallelismEl = document.getElementById('proxyTestProbeParallelism');
    const includeGeoEl = document.getElementById('proxyTestIncludeGeo');

    return {
        enabled: enabledEl ? Boolean(enabledEl.checked) : true,
        maxConcurrency: concurrencyEl ? Number(concurrencyEl.value) : undefined,
        batchSize: batchSizeEl ? Number(batchSizeEl.value) : undefined,
        budgetMs: budgetEl ? Number(budgetEl.value) * 1000 : undefined,
        backoffBaseMs: backoffEl ? Number(backoffEl.value) : undefined,
        testProfile: profileEl ? normalizeProxyTestProfileValue(profileEl.value || '') : undefined,
        probeTimeoutMs: probeTimeoutEl ? Number(probeTimeoutEl.value) * 1000 : undefined,
        ipTimeoutMs: ipTimeoutEl ? Number(ipTimeoutEl.value) * 1000 : undefined,
        geoTimeoutMs: geoTimeoutEl ? Number(geoTimeoutEl.value) * 1000 : undefined,
        probeCount: probeCountEl ? Number(probeCountEl.value) : undefined,
        probeParallelism: probeParallelismEl ? Number(probeParallelismEl.value) : undefined,
        includeGeo: includeGeoEl ? Boolean(includeGeoEl.checked) : undefined,
    };
}

function buildProxyTestInvokePayload(proxyUrl, strategy) {
    const normalized = normalizeProxyBatchTestStrategyForUi(strategy, 1);
    return {
        proxyStr: proxyUrl,
        engineHint: 'auto',
        options: {
            profile: normalized.testProfile || 'standard',
            probeTimeoutMs: normalized.probeTimeoutMs,
            ipTimeoutMs: normalized.ipTimeoutMs,
            geoTimeoutMs: normalized.geoTimeoutMs,
            probeCount: normalized.probeCount,
            probeParallelism: normalized.probeParallelism,
            includeGeo: normalized.includeGeo,
            engineBootWaitMs: normalized.engineBootWaitMs,
        },
    };
}

async function saveProxyBatchTestStrategy() {
    const raw = readProxyBatchStrategyFromInputs();
    const list = Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies : [];
    const normalized = normalizeProxyBatchTestStrategyForUi(raw, list.length);
    globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY] = normalized;
    applyProxyBatchStrategyToInputs(normalized);
    await window.electronAPI.saveSettings(globalSettings);
    showToast(tFormat('proxyStrategySavedBrief', 'Saved: C{concurrency} / B{batch} / {budget}s', {
        concurrency: normalized.maxConcurrency,
        batch: normalized.batchSize,
        budget: Math.round(normalized.budgetMs / 1000),
    }), 1800);
}

async function applyProxyStrategyProfilePreset(profile) {
    const nextProfile = normalizeProxyTestProfileValue(profile);
    const raw = readProxyBatchStrategyFromInputs();
    const list = Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies : [];

    raw.testProfile = nextProfile;
    delete raw.probeTimeoutMs;
    delete raw.ipTimeoutMs;
    delete raw.geoTimeoutMs;
    delete raw.probeCount;
    delete raw.probeParallelism;
    delete raw.includeGeo;
    delete raw.engineBootWaitMs;

    const normalized = normalizeProxyBatchTestStrategyForUi(raw, list.length);
    globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY] = normalized;
    applyProxyBatchStrategyToInputs(normalized);
    await window.electronAPI.saveSettings(globalSettings);
    showToast(tFormat('proxyStrategyProfileApplied', 'Profile preset applied: {profile}', {
        profile: formatProxyTestProfileLabel(normalized.testProfile),
    }), 1600);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return ch;
        }
    });
}

function escapeAttr(value) {
    // For HTML attribute values (double-quoted).
    return escapeHtml(value);
}

// Custom City Dropdown Initialization (Matches Timezone Logic)
function initCustomCityDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Build cached list
    let allOptions = [];
    // 1. Add English "Auto" option
    allOptions.push({ name: "Auto (IP Based)", isAuto: true });
    // 2. Add cities
    if (window.CITY_DATA) {
        allOptions = allOptions.concat(window.CITY_DATA);
    }

    let selectedIndex = -1;

    function populateDropdown(filter = '') {
        const lowerFilter = filter.toLowerCase();
        // 如果是 "Auto" 则显示全部，否则按关键词过滤
        const shouldShowAll = filter === 'Auto (IP Based)' || filter === '';

        const filtered = shouldShowAll ? allOptions : allOptions.filter(item =>
            item.name.toLowerCase().includes(lowerFilter)
        );

        dropdown.textContent = '';
        filtered.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'timezone-item';
            el.dataset.name = item.name;
            el.dataset.index = String(index);
            el.textContent = item.name;
            dropdown.appendChild(el);
        });

        selectedIndex = -1;
    }

    function showDropdown() {
        populateDropdown(''); // Always show full list on click
        dropdown.classList.add('active');
    }

    function hideDropdown() {
        dropdown.classList.remove('active');
        selectedIndex = -1;
    }

    function selectItem(name) {
        input.value = name;
        hideDropdown();
    }

    input.addEventListener('focus', showDropdown);

    // Prevent blur from closing immediately so click can register
    // Relaxed for click-outside logic instead

    input.addEventListener('input', () => {
        populateDropdown(input.value);
        if (!dropdown.classList.contains('active')) dropdown.classList.add('active');
    });

    // Keyboard nav
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.timezone-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(items[selectedIndex].dataset.name);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    function updateSelection(items) {
        items.forEach((item, index) => item.classList.toggle('selected', index === selectedIndex));
        if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.timezone-item');
        if (item) selectItem(item.dataset.name);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}

// --- Language Dropdown Helpers ---
function getLanguageName(code) {
    if (!code || code === 'auto') return "Auto (System Default)";
    if (!window.LANGUAGE_DATA) return code;
    const entry = window.LANGUAGE_DATA.find(x => x.code === code);
    return entry ? entry.name : "Auto (System Default)";
}

function getLanguageCode(name) {
    if (!name || name === "Auto (System Default)") return 'auto';
    if (!window.LANGUAGE_DATA) return 'auto';
    const entry = window.LANGUAGE_DATA.find(x => x.name === name);
    return entry ? entry.code : 'auto';
}

function initCustomLanguageDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    // Use window.LANGUAGE_DATA from languages.js
    const allOptions = window.LANGUAGE_DATA || [];
    let selectedIndex = -1;

    function populateDropdown(filter = '') {
        const lowerFilter = filter.toLowerCase();
        const shouldShowAll = filter === '' || filter === 'Auto (System Default)';
        const filtered = shouldShowAll ? allOptions : allOptions.filter(item =>
            item.name.toLowerCase().includes(lowerFilter)
        );

        dropdown.textContent = '';
        filtered.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'timezone-item';
            el.dataset.code = item.code;
            el.dataset.index = String(index);
            el.textContent = item.name;
            dropdown.appendChild(el);
        });
        selectedIndex = -1;
    }

    function showDropdown() {
        populateDropdown('');
        dropdown.classList.add('active');
    }

    function hideDropdown() {
        dropdown.classList.remove('active');
        selectedIndex = -1;
    }

    function selectItem(name) {
        input.value = name;
        hideDropdown();
    }

    input.addEventListener('focus', showDropdown);
    input.addEventListener('input', () => {
        populateDropdown(input.value);
        if (!dropdown.classList.contains('active')) dropdown.classList.add('active');
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.timezone-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(items[selectedIndex].innerText);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    function updateSelection(items) {
        items.forEach((item, index) => item.classList.toggle('selected', index === selectedIndex));
        if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.timezone-item');
        if (item) selectItem(item.innerText);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}


function decodeBase64Content(str) {
    try {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch (e) { return atob(str); }
}

function getProxyRemark(link) {
    if (!link) return '';
    link = link.trim();
    try {
        if (link.startsWith('vmess://')) {
            const base64Str = link.replace('vmess://', '');
            const configStr = decodeBase64Content(base64Str);
            try { return JSON.parse(configStr).ps || ''; } catch (e) { return ''; }
        } else if (link.includes('#')) {
            return decodeURIComponent(link.split('#')[1]).trim();
        }
    } catch (e) { }
    return '';
}

function renderHelpContent() {
    const manualEl = document.getElementById('help-manual');
    const aboutEl = document.getElementById('help-about');
    const isEn = curLang === 'en';

    function createEl(tag, options = {}, children = []) {
        const el = document.createElement(tag);
        if (options.className) el.className = options.className;
        if (options.text !== undefined && options.text !== null) el.textContent = String(options.text);
        if (options.style) el.style.cssText = String(options.style);
        if (options.href) el.setAttribute('href', String(options.href));
        if (options.title) el.setAttribute('title', String(options.title));
        if (options.attrs && typeof options.attrs === 'object') {
            for (const [k, v] of Object.entries(options.attrs)) {
                if (v === undefined || v === null) continue;
                el.setAttribute(k, String(v));
            }
        }
        for (const child of children) {
            if (!child) continue;
            el.appendChild(child);
        }
        return el;
    }

    function appendLinesWithBreaks(parent, lines) {
        lines.forEach((line, idx) => {
            parent.appendChild(document.createTextNode(line));
            if (idx < lines.length - 1) parent.appendChild(document.createElement('br'));
        });
    }

    function appendSectionHeader(container, title, gradient) {
        const header = createEl('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:16px;' });
        header.appendChild(createEl('div', { style: `width:4px;height:18px;background:${gradient};border-radius:2px;` }));
        header.appendChild(createEl('h4', { style: 'margin:0;color:var(--text-primary);font-size:14px;font-weight:600;', text: title }));
        container.appendChild(header);
    }

    if (manualEl) {
        manualEl.replaceChildren();

        const manualSections = isEn
            ? [
                { title: '1. Create Environment', text: 'Enter a name and proxy link. The system auto-generates a unique fingerprint with randomized Hardware.' },
                { title: '2. Launch', text: 'Click Launch. A green badge indicates active status. Each environment is fully isolated.' },
                { title: '3. Pre-Proxy (Optional)', text: 'Chain proxy for IP hiding. Use TCP protocols for stability.' },
                { title: '4. Best Practices', lines: ['• Use high-quality residential IPs', '• Keep one account per environment', '• Avoid frequent switching', '• Simulate real user behavior'] },
            ]
            : [
                { title: '1. 新建环境', text: '填写名称与代理链接。系统自动生成唯一指纹（硬件随机化）。' },
                { title: '2. 启动环境', text: '点击启动，列表中显示绿色运行标签。每个环境完全隔离。' },
                { title: '3. 前置代理（可选）', text: '用于隐藏本机IP或链路加速。建议使用TCP协议。' },
                { title: '4. 最佳实践', lines: ['• 使用高质量住宅IP', '• 一个账号固定一个环境', '• 避免频繁切换', '• 模拟真实用户行为'] },
            ];

        for (const section of manualSections) {
            const block = createEl('div', { style: 'margin-bottom:25px;' });
            block.appendChild(createEl('h4', { style: 'color:var(--accent);margin-bottom:8px;', text: section.title }));
            const p = createEl('p', { style: 'font-size:14px;' });
            if (Array.isArray(section.lines)) appendLinesWithBreaks(p, section.lines);
            else p.textContent = section.text || '';
            block.appendChild(p);
            manualEl.appendChild(block);
        }
    }

    if (aboutEl) {
        aboutEl.replaceChildren();

        const top = createEl('div', { style: 'text-align:center;margin-bottom:24px;padding:20px 0;' });
        const brand = createEl('div', { style: 'font-size:28px;font-weight:700;color:var(--text-primary);letter-spacing:1px;' });
        brand.appendChild(document.createTextNode('Geek'));
        brand.appendChild(createEl('span', { style: 'color:var(--accent);', text: 'EZ' }));
        top.appendChild(brand);
        top.appendChild(createEl('div', { style: 'font-size:12px;opacity:0.5;margin-top:4px;', text: isEn ? 'v1.3.4 · Anti-detect Browser' : 'v1.3.4 · 指纹浏览器' }));
        aboutEl.appendChild(top);

        appendSectionHeader(aboutEl, isEn ? 'CORE TECHNOLOGY' : '核心技术', 'linear-gradient(180deg, var(--accent), #7c3aed)');
        const coreGrid = createEl('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;' });
        const coreCards = isEn
            ? [
                { title: '🧬 Real Chrome Kernel', desc: 'Native Chrome + JS Injection' },
                { title: '🔐 Hardware Fingerprint', desc: 'CPU/Memory Randomization' },
                { title: '🌍 60+ Languages', desc: 'Timezone & Locale Spoofing' },
                { title: '⚡ GPU Acceleration', desc: 'Smooth UI Performance' },
            ]
            : [
                { title: '🧬 真实 Chrome 内核', desc: '原生内核 + JS 注入' },
                { title: '🔐 硬件指纹随机化', desc: 'CPU/内存完全随机' },
                { title: '🌍 60+ 语言适配', desc: '时区与语言完美伪装' },
                { title: '⚡ GPU 硬件加速', desc: '流畅 UI 渲染体验' },
            ];
        for (const card of coreCards) {
            const cardEl = createEl('div', { style: 'background:var(--input-bg);padding:12px;border-radius:8px;border:1px solid var(--border);' });
            cardEl.appendChild(createEl('div', { style: 'font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px;', text: card.title }));
            cardEl.appendChild(createEl('div', { style: 'font-size:11px;opacity:0.7;', text: card.desc }));
            coreGrid.appendChild(cardEl);
        }
        aboutEl.appendChild(coreGrid);

        appendSectionHeader(aboutEl, isEn ? 'DETECTION STATUS' : '检测状态', 'linear-gradient(180deg, #4CAF50, #2196F3)');
        const statusBox = createEl('div', { style: 'background:var(--input-bg);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:24px;' });
        const statusWrap = createEl('div', { style: 'display:flex;flex-wrap:wrap;gap:16px;' });
        const statusItems = isEn
            ? ['Browserscan Passed', 'Pixelscan Clean', 'Real TLS Fingerprint', 'Minimal API Hook']
            : ['Browserscan 全绿', 'Pixelscan 无检测', 'TLS 指纹真实', '最小化 API Hook'];
        for (const text of statusItems) {
            const item = createEl('div', { style: 'font-size:12px;' });
            item.appendChild(createEl('span', { style: 'color:#4CAF50;', text: '✓' }));
            item.appendChild(document.createTextNode(` ${text}`));
            statusWrap.appendChild(item);
        }
        statusBox.appendChild(statusWrap);
        aboutEl.appendChild(statusBox);

        appendSectionHeader(aboutEl, isEn ? 'PLATFORM COMPATIBILITY' : '平台适配', 'linear-gradient(180deg, #FF9800, #F44336)');
        const platformWrap = createEl('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;' });
        const platformTags = [
            { style: 'background:linear-gradient(135deg, rgba(243,156,18,0.2), rgba(243,156,18,0.1));color:#f39c12;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;', text: 'Amazon' },
            { style: 'background:linear-gradient(135deg, rgba(39,174,96,0.2), rgba(39,174,96,0.1));color:#27ae60;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;', text: 'TikTok' },
            { style: 'background:linear-gradient(135deg, rgba(41,128,185,0.2), rgba(41,128,185,0.1));color:#2980b9;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;', text: 'Facebook' },
            { style: 'background:linear-gradient(135deg, rgba(230,126,34,0.2), rgba(230,126,34,0.1));color:#e67e22;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;', text: isEn ? 'Shopee' : '虾皮' },
            { style: 'background:linear-gradient(135deg, rgba(191,0,0,0.2), rgba(191,0,0,0.1));color:#bf0000;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;', text: isEn ? 'Rakuten' : '乐天' },
            { style: 'background:linear-gradient(135deg, rgba(241,196,15,0.2), rgba(241,196,15,0.1));color:#f1c40f;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:500;', text: isEn ? 'Mercado' : '美客多' },
        ];
        for (const tag of platformTags) {
            platformWrap.appendChild(createEl('span', { style: tag.style, text: tag.text }));
        }
        aboutEl.appendChild(platformWrap);

        appendSectionHeader(aboutEl, isEn ? 'COMMUNITY' : '交流社群', 'linear-gradient(180deg, #9C27B0, #E91E63)');
        const communityCard = createEl('div', { style: 'background:linear-gradient(135deg, var(--input-bg), var(--card-bg));padding:16px;border-radius:8px;border:1px solid var(--border);text-align:center;' });
        communityCard.appendChild(createEl('div', { style: 'font-size:18px;margin-bottom:6px;', text: '💬' }));
        communityCard.appendChild(createEl('div', { style: 'font-size:12px;opacity:0.8;margin-bottom:8px;', text: isEn ? 'Join our QQ Group for support' : '加入 QQ 群获取支持与交流' }));
        communityCard.appendChild(createEl('a', {
            style: 'font-size:16px;font-weight:600;color:var(--accent);letter-spacing:1px;text-decoration:none;',
            href: 'tencent://groupwpa/?subcmd=all&uin=1079216892',
            title: isEn ? 'Click to join QQ Group' : '点击加入QQ群',
            text: isEn ? 'Click to join: 1079216892' : '点击加入：1079216892'
        }));
        aboutEl.appendChild(communityCard);
    }
}

function getTranslator() {
    if (typeof window !== 'undefined' && typeof window.t === 'function') return window.t;
    return (key) => String(key || '');
}

function normalizeUiLang(input) {
    if (typeof window !== 'undefined' && typeof window.normalizeGeekezLang === 'function') {
        return window.normalizeGeekezLang(input);
    }
    const text = String(input || '').trim().toLowerCase();
    if (text === 'en' || text.startsWith('en-')) return 'en';
    return 'cn';
}

function getCurrentLangSafe() {
    const raw = (typeof window !== 'undefined' ? window.curLang : null) || localStorage.getItem('geekez_lang') || 'cn';
    const lang = normalizeUiLang(raw);
    if (typeof window !== 'undefined' && window.curLang !== lang) window.curLang = lang;
    if (localStorage.getItem('geekez_lang') !== lang) localStorage.setItem('geekez_lang', lang);
    return lang;
}

function tText(key, fallback = '') {
    const tr = getTranslator();
    const translated = tr(key);
    if (!translated || translated === key) return fallback || key;
    return translated;
}

function tFormat(key, fallback, vars = {}) {
    const text = tText(key, fallback);
    return String(text).replace(/\{(\w+)\}/g, (_, token) => {
        const value = vars[token];
        return value === undefined || value === null ? '' : String(value);
    });
}

function updateLangToggleLabel() {
    const btn = document.querySelector('[data-action="toggle-lang"]');
    if (!btn) return;
    const lang = getCurrentLangSafe();
    if (lang === 'cn') {
        btn.innerText = '中文 · EN';
        btn.title = 'Switch to English';
        btn.setAttribute('data-lang', 'cn');
    } else {
        btn.innerText = 'CN · English';
        btn.title = '切换到中文';
        btn.setAttribute('data-lang', 'en');
    }
}

function applyLang() {
    const normalized = getCurrentLangSafe();
    if (typeof window !== 'undefined') window.curLang = normalized;
    const tr = getTranslator();
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerText = tr(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.setAttribute('placeholder', tr(el.getAttribute('data-i18n-placeholder'))); });
    const themeSel = document.getElementById('themeSelect');
    if (themeSel) { themeSel.options[0].text = tr('themeGeek'); themeSel.options[1].text = tr('themeLight'); themeSel.options[2].text = tr('themeDark'); }
    updateLangToggleLabel();
    try { applyProxyModalLayoutMode(); } catch (e) { console.error('applyProxyModalLayoutMode failed:', e); }
    try { applyProxySidebarState(); } catch (e) { console.error('applyProxySidebarState failed:', e); }
    try { applyProxyInspectorCollapsedUiState(); } catch (e) { console.error('applyProxyInspectorCollapsedUiState failed:', e); }
    try { applyProxyInspectorSectionState(); } catch (e) { console.error('applyProxyInspectorSectionState failed:', e); }
    try { applyProxySecondaryFiltersUiState(); } catch (e) { console.error('applyProxySecondaryFiltersUiState failed:', e); }
    try { applyProxyAdvancedPanelState(); } catch (e) { console.error('applyProxyAdvancedPanelState failed:', e); }
    try { applyProxyAdvancedViewState(); } catch (e) { console.error('applyProxyAdvancedViewState failed:', e); }
    try { applyProxyDiagnosticsPanelState(); } catch (e) { console.error('applyProxyDiagnosticsPanelState failed:', e); }
    try { applyProxyCognitiveModeState(); } catch (e) { console.error('applyProxyCognitiveModeState failed:', e); }
    try { updateProxyPresetTrustSummary(); } catch (e) { console.error('updateProxyPresetTrustSummary failed:', e); }
    try { renderHelpContent(); } catch (e) { console.error('renderHelpContent failed:', e); }
    try { updateToolbar(); } catch (e) { console.error('updateToolbar failed:', e); }
    try { loadProfiles(); } catch (e) { console.error('loadProfiles failed:', e); }
    try { renderGroupTabs(); } catch (e) { console.error('renderGroupTabs failed:', e); }
}

function toggleLang() {
    const nextLang = getCurrentLangSafe() === 'cn' ? 'en' : 'cn';
    try {
        const normalizedNext = normalizeUiLang(nextLang);
        if (typeof window !== 'undefined') window.curLang = normalizedNext;
        localStorage.setItem('geekez_lang', normalizedNext);
        applyLang();
        showToast(normalizedNext === 'en' ? 'Language: English' : '语言：中文', 1000);
    } catch (err) {
        console.error('toggleLang failed, fallback to reload mode:', err);
        if (typeof window !== 'undefined' && typeof window.toggleLanguage === 'function') {
            window.toggleLanguage();
        }
    }
}

function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('geekez_theme', themeName);
    const themeColors = {
        'geek': { bg: '#1e1e2d', symbol: '#ffffff' },
        'light': { bg: '#f0f2f5', symbol: '#000000' },
        'dark': { bg: '#121212', symbol: '#ffffff' }
    };
    const colors = themeColors[themeName] || themeColors['geek'];
    window.electronAPI.invoke('set-title-bar-color', colors);
}

// Show Alert (supports loading state)
function showAlert(msg, showBtn = true) {
    document.getElementById('alertMsg').innerText = msg;
    const btn = document.getElementById('alertBtn');
    if (btn) btn.style.display = showBtn ? 'block' : 'none';
    document.getElementById('alertModal').style.display = 'flex';
}
function showConfirm(msg, callback) {
    const altBtn = document.getElementById('confirmAltBtn');
    if (altBtn) altBtn.style.display = 'none';
    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) okBtn.textContent = t('confirm') || 'Confirm';
    confirmAltCallback = null;
    confirmCancelCallback = null;
    document.getElementById('confirmMsg').innerText = msg;
    document.getElementById('confirmModal').style.display = 'flex';
    const modal = document.getElementById('confirmModal');
    logModalState('confirmModal.showConfirm', modal);
    requestAnimationFrame(() => logModalState('confirmModal.showConfirm.raf', modal));
    setTimeout(() => logModalState('confirmModal.showConfirm.t20', modal), 20);
    confirmCallback = callback;
}

let __toastTimer = null;
function showToast(msg, durationMs = 1800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerText = msg;
    el.style.display = 'block';
    clearTimeout(__toastTimer);
    __toastTimer = setTimeout(() => { el.style.display = 'none'; }, durationMs);
}

function formatIpcError(err) {
    if (!err) return { message: 'unknown', code: null };
    if (typeof err === 'string') return { message: err, code: null };
    const code = err.code || err.errorCode || null;
    const message = err.message || err.error || JSON.stringify(err);
    return { message, code };
}

function formatResultError(result, fallbackMessage) {
    if (!result) return { message: fallbackMessage || 'unknown', code: null };
    const code = result.code || result.errorCode || null;
    const message = result.error || result.message || (result.errors ? result.errors.join('; ') : null) || fallbackMessage || 'unknown';
    return { message, code };
}

function getProfileErrorActionHint(code, stage = '') {
    const normalized = String(code || '').trim().toUpperCase();
    switch (normalized) {
        case 'TUN_ADMIN_REQUIRED':
            return tText('profileErrHintTunAdmin', 'Run GeekEZ Browser as Administrator, then retry.');
        case 'TUN_RESOURCES_MISSING':
            return tText('profileErrHintTunResources', 'Install/restore sing-box and wintun resources, then retry.');
        case 'TUN_UNSUPPORTED_PLATFORM':
            return tText('profileErrHintTunUnsupported', 'TUN mode is Windows-only. Switch to app proxy mode on this platform.');
        case 'TUN_REQUIRES_SINGLE_PROFILE':
        case 'TUN_ALREADY_RUNNING':
            return tText('profileErrHintTunSingle', 'Stop other running profiles before using TUN mode.');
        case 'SINGBOX_BINARY_MISSING':
            return tText('profileErrHintSingboxMissing', 'sing-box binary is missing. Reinstall resources and retry.');
        case 'CHROME_BINARY_NOT_FOUND':
            return tText('profileErrHintChromeMissing', 'Chrome runtime is missing. Reinstall browser resources and retry.');
        case 'PROFILE_PROXY_PORT_IN_USE':
            return tText('profileErrHintPortInUse', 'Proxy port is already in use. Close conflicting process and retry.');
        case 'STOP_PROFILE_PERMISSION_DENIED':
            return tText('profileErrHintStopPermission', 'Permission denied while stopping process. Try Administrator mode.');
        case 'STOP_PROFILE_PROCESS_NOT_FOUND':
            return tText('profileErrHintStopProcessMissing', 'Process already exited. Refresh list and continue.');
        case 'STOP_PROFILE_MISSING_ID':
        case 'STOP_PROFILE_INVALID_ID':
        case 'STOP_PROFILE_NOT_FOUND':
        case 'PROFILE_NOT_FOUND':
            return tText('profileErrHintProfileInvalid', 'Profile reference is invalid. Refresh profile list and retry.');
        case 'PROFILE_PROXY_EMPTY':
            return tText('profileErrHintProxyEmpty', 'Profile proxy is empty. Set a proxy (or bind a node) then retry.');
        case 'PROXY_BIND_NODE_NOT_FOUND':
            return tText('profileErrHintProxyBindMissing', 'Bound proxy node is missing. Open Proxy Manager or unbind the node, then retry.');
        case 'PROXY_BIND_IN_USE':
            return tText('profileErrHintProxyBindInUse', 'Proxy node is already bound to another profile. Unbind it first, then retry.');
        default:
            break;
    }

    if (stage === 'launch') {
        return tText('profileErrHintLaunchGeneric', 'Open profile log and retry launch.');
    }
    if (stage === 'stop') {
        return tText('profileErrHintStopGeneric', 'Open profile log and retry stop.');
    }
    return tText('profileErrHintGeneric', 'Open profile log for details, then retry.');
}

function resolveStopOthersOutcome(result) {
    const status = String(result && result.status ? result.status : '').trim().toUpperCase();
    const reason = String(result && result.retryReasonCode ? result.retryReasonCode : '').trim().toLowerCase();
    const contractVersion = getStopOtherContractVersion(result);
    const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;
    const requestedCount = result && Number.isFinite(Number(result.requestedCount))
        ? Number(result.requestedCount)
        : (!strictContractMode && result && Array.isArray(result.requestedIds) ? result.requestedIds.length : 0);
    const stoppedCount = result && Number.isFinite(Number(result.stoppedCount))
        ? Number(result.stoppedCount)
        : (!strictContractMode && result && Array.isArray(result.stoppedIds) ? result.stoppedIds.length : 0);
    const failedCount = result && Number.isFinite(Number(result.failedCount))
        ? Number(result.failedCount)
        : (!strictContractMode && result && Array.isArray(result.failed) ? result.failed.length : 0);
    const remainingCount = result && Number.isFinite(Number(result.remainingCount))
        ? Number(result.remainingCount)
        : (!strictContractMode && result && Array.isArray(result.remainingIds) ? result.remainingIds.length : 0);
    const retryReady = Boolean(result && result.retryReady);

    let kind = 'blocked';
    if (status === 'STOP_OTHER_INVALID_KEEP_ID' || reason === 'invalid_keep_id') {
        kind = 'invalid_keep_id';
    } else if (status === 'STOP_OTHER_NONE_RUNNING' || reason === 'no_conflict') {
        kind = 'no_conflict';
    } else if ((status === 'STOP_OTHER_ALL_STOPPED' || reason === 'ready') && retryReady) {
        kind = 'ready';
    } else if ((status === 'STOP_OTHER_PARTIAL_READY' || reason === 'ready_partial') && retryReady) {
        kind = 'ready_partial';
    } else if (status === 'STOP_OTHER_PARTIAL_BLOCKED' || (stoppedCount > 0 && !retryReady)) {
        kind = 'partial_blocked';
    } else if (status === 'STOP_OTHER_BLOCKED' || reason === 'still_running') {
        kind = 'blocked';
    } else if (retryReady) {
        kind = 'ready';
    }

    return {
        kind,
        status,
        reason,
        retryReady,
        requestedCount,
        stoppedCount,
        failedCount,
        remainingCount,
    };
}

const STOP_OTHER_STRICT_CONTRACT_VERSION = 2;

function getStopOtherContractVersion(result) {
    const raw = Number(result && result.stopOtherContractVersion);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.floor(raw);
}

function formatStopOthersErrorCodeSummary(result) {
    const contractTopRaw = Number(result && result.errorCodeSummaryTopLimit);
    const topLimit = Number.isFinite(contractTopRaw) && contractTopRaw > 0 ? Math.floor(contractTopRaw) : 3;
    const contractVersion = getStopOtherContractVersion(result);
    const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;
    const rankedCodesForSummary = result && Array.isArray(result.rankedErrorCodes)
        ? result.rankedErrorCodes
            .map((code) => String(code || '').trim().toUpperCase())
            .filter((code) => Boolean(code))
        : [];
    const rankIndexByCodeForSummary = new Map(rankedCodesForSummary.map((code, index) => [code, index]));
    const summaryList = result && Array.isArray(result.failureCodeSummaries)
        ? result.failureCodeSummaries
            .map((item) => ({
                code: String(item && item.code ? item.code : '').trim().toUpperCase(),
                count: Number(item && item.count),
            }))
            .filter((item) => item.code && Number.isFinite(item.count) && item.count > 0)
        : [];
    if (summaryList.length > 0) {
        const topFromSummary = summaryList.slice(0, topLimit).map((item) => `${item.code}x${item.count}`).join(', ');
        return tFormat('profileErrActionStopOthersCodeSummary', 'Failure code distribution: {codes}', { codes: topFromSummary });
    }
    const counts = {};
    if (result && result.errorCodeCounts && typeof result.errorCodeCounts === 'object') {
        for (const [key, value] of Object.entries(result.errorCodeCounts)) {
            const code = String(key || '').trim().toUpperCase();
            const count = Number(value);
            if (!code || !Number.isFinite(count) || count <= 0) continue;
            counts[code] = (counts[code] || 0) + count;
        }
    }
    if (Object.keys(counts).length === 0 && !strictContractMode && result && Array.isArray(result.failed)) {
        for (const item of result.failed) {
            const code = String(item && (item.errorCode || item.code) ? (item.errorCode || item.code) : 'STOP_PROFILE_FAILED').trim().toUpperCase();
            if (!code) continue;
            counts[code] = (counts[code] || 0) + 1;
        }
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        const dominantCode = String(result && result.dominantErrorCode ? result.dominantErrorCode : '').trim().toUpperCase();
        if (strictContractMode && dominantCode) {
            const failedCountRaw = Number(result && result.failedCount);
            const failedCount = Number.isFinite(failedCountRaw) && failedCountRaw > 0 ? Math.floor(failedCountRaw) : 0;
            const dominantText = failedCount > 0 ? `${dominantCode}x${failedCount}` : dominantCode;
            return tFormat('profileErrActionStopOthersCodeSummary', 'Failure code distribution: {codes}', { codes: dominantText });
        }
        return '';
    }
    entries.sort((left, right) => {
        const leftRank = rankIndexByCodeForSummary.has(left[0]) ? rankIndexByCodeForSummary.get(left[0]) : Number.POSITIVE_INFINITY;
        const rightRank = rankIndexByCodeForSummary.has(right[0]) ? rankIndexByCodeForSummary.get(right[0]) : Number.POSITIVE_INFINITY;
        if (leftRank !== rightRank) {
            if (leftRank === Number.POSITIVE_INFINITY) return 1;
            if (rightRank === Number.POSITIVE_INFINITY) return -1;
            return leftRank - rightRank;
        }
        const byCount = Number(right[1] || 0) - Number(left[1] || 0);
        if (byCount !== 0) return byCount;
        return String(left[0]).localeCompare(String(right[0]));
    });
    const top = entries.slice(0, topLimit).map(([code, count]) => `${code}x${count}`).join(', ');
    return tFormat('profileErrActionStopOthersCodeSummary', 'Failure code distribution: {codes}', { codes: top });
}

function buildStopOtherProfileNameSummary(items, limit = 3) {
    const uniqueNames = [];
    const seen = new Set();
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
        const id = typeof item === 'string' ? String(item || '').trim() : String(item && item.id ? item.id : '').trim();
        const rawName = typeof item === 'string'
            ? id
            : String(item && (item.name || item.id) ? (item.name || item.id) : '').trim();
        const name = rawName || id;
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueNames.push(name);
    }
    const shownNames = uniqueNames.slice(0, Math.max(1, Number(limit) || 3)).join(', ');
    return {
        total: uniqueNames.length,
        names: shownNames,
        extra: Math.max(0, uniqueNames.length - Math.max(1, Number(limit) || 3)),
    };
}

function formatStopOthersFailedDetailSummary(result, limit = 3) {
    const contractLimitRaw = Number(result && result.failureDetailSampleLimitPerCode);
    const contractLimit = Number.isFinite(contractLimitRaw) && contractLimitRaw > 0 ? Math.floor(contractLimitRaw) : 0;
    const contractMessageMaxRaw = Number(result && result.failureDetailMessageMaxLength);
    const messageMaxLength = Number.isFinite(contractMessageMaxRaw) && contractMessageMaxRaw > 0 ? Math.floor(contractMessageMaxRaw) : 72;
    const fallbackLimit = Math.max(1, Number(limit) || 3);
    const maxItems = contractLimit > 0 ? contractLimit : fallbackLimit;
    const contractVersion = getStopOtherContractVersion(result);
    const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;
    const summaryList = result && Array.isArray(result.failureCodeSummaries)
        ? result.failureCodeSummaries
            .map((item) => {
                const detailTotalRaw = Number(item && item.detailTotal);
                const hasDetailTotal = Number.isFinite(detailTotalRaw) && detailTotalRaw >= 0;
                return {
                    code: String(item && item.code ? item.code : '').trim().toUpperCase(),
                    details: Array.isArray(item && item.details) ? item.details : [],
                    detailTotal: hasDetailTotal ? detailTotalRaw : null,
                    detailTruncated: Boolean(item && item.detailTruncated),
                    hasDetailTotal,
                };
            })
            .filter((item) => item.code)
        : [];
    if (summaryList.length > 0) {
        const details = [];
        const seen = new Set();
        for (const item of summaryList) {
            for (const detail of item.details) {
                const normalized = String(detail || '').replace(/\s+/g, ' ').trim();
                if (!normalized) continue;
                const key = normalized.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                details.push(normalized);
            }
        }
        const shownCount = Math.min(details.length, maxItems);
        const hasContractDetailMeta = summaryList.some((item) => item.hasDetailTotal || item.detailTruncated);
        const hasSummaryDetailTruncated = summaryList.some((item) => item.detailTruncated);
        const contractTotal = summaryList.reduce((total, item) => {
            if (item.hasDetailTotal) return total + Number(item.detailTotal || 0);
            if (!strictContractMode) return total + (Array.isArray(item.details) ? item.details.length : 0);
            return total;
        }, 0);
        let extraCount = 0;
        if (hasContractDetailMeta) {
            extraCount = strictContractMode
                ? Math.max(0, contractTotal - shownCount)
                : Math.max(0, Math.max(contractTotal, details.length) - shownCount);
        } else if (!strictContractMode) {
            extraCount = Math.max(0, details.length - shownCount);
        }
        if (extraCount === 0 && hasSummaryDetailTruncated) {
            extraCount = 1;
        }
        if (details.length > 0) {
            const shown = details.slice(0, maxItems).join('; ');
            const extra = extraCount > 0 ? ` +${extraCount}` : '';
            return tFormat('profileErrActionStopOthersFailedDetail', 'Failure details: {details}{extra}', { details: shown, extra });
        }
        if (strictContractMode && hasContractDetailMeta && extraCount > 0) {
            return tFormat('profileErrActionStopOthersFailedDetail', 'Failure details: {details}{extra}', {
                details: `+${extraCount}`,
                extra: '',
            });
        }
    }
    const detailSampleMap = result && result.errorCodeDetailSamples && typeof result.errorCodeDetailSamples === 'object'
        ? result.errorCodeDetailSamples
        : {};
    const detailTotalMap = result && result.errorCodeDetailTotals && typeof result.errorCodeDetailTotals === 'object'
        ? result.errorCodeDetailTotals
        : {};
    const detailTruncatedMap = result && result.errorCodeDetailsTruncated && typeof result.errorCodeDetailsTruncated === 'object'
        ? result.errorCodeDetailsTruncated
        : {};
    const detailSampleEntries = Object.entries(detailSampleMap);
    const detailTotalEntries = Object.entries(detailTotalMap);
    const detailTruncatedEntries = Object.entries(detailTruncatedMap);
    const hasDetailContractEntries = detailSampleEntries.length > 0 || detailTotalEntries.length > 0 || detailTruncatedEntries.length > 0;
    if (hasDetailContractEntries) {
        const rankedCodes = result && Array.isArray(result.rankedErrorCodes)
            ? result.rankedErrorCodes
                .map((code) => String(code || '').trim().toUpperCase())
                .filter((code) => Boolean(code))
            : [];
        const rankIndexByCode = new Map(rankedCodes.map((code, index) => [code, index]));
        const contractCodes = Array.from(new Set([
            ...detailSampleEntries.map(([rawCode]) => String(rawCode || '').trim().toUpperCase()),
            ...detailTotalEntries.map(([rawCode]) => String(rawCode || '').trim().toUpperCase()),
            ...detailTruncatedEntries.map(([rawCode]) => String(rawCode || '').trim().toUpperCase()),
        ])).filter((code) => Boolean(code));
        const orderedCodes = Array.from(new Set([...rankedCodes, ...contractCodes]));
        orderedCodes.sort((left, right) => {
            const leftRank = rankIndexByCode.has(left) ? rankIndexByCode.get(left) : Number.POSITIVE_INFINITY;
            const rightRank = rankIndexByCode.has(right) ? rankIndexByCode.get(right) : Number.POSITIVE_INFINITY;
            if (leftRank !== rightRank) {
                if (leftRank === Number.POSITIVE_INFINITY) return 1;
                if (rightRank === Number.POSITIVE_INFINITY) return -1;
                return leftRank - rightRank;
            }
            const byPriority = getStopOtherCodePriority(left) - getStopOtherCodePriority(right);
            if (byPriority !== 0) return byPriority;
            return String(left).localeCompare(String(right));
        });

        const details = [];
        const seen = new Set();
        let contractTotal = 0;
        let hasContractDetailMeta = false;
        let anyTruncated = false;
        for (const code of orderedCodes) {
            const totalRaw = Number(detailTotalMap[code]);
            const hasTotal = Number.isFinite(totalRaw) && totalRaw >= 0;
            if (hasTotal) {
                contractTotal += totalRaw;
                hasContractDetailMeta = true;
            }
            const truncated = Boolean(detailTruncatedMap[code]);
            if (truncated) {
                hasContractDetailMeta = true;
                anyTruncated = true;
            }
            const samples = Array.isArray(detailSampleMap[code]) ? detailSampleMap[code] : [];
            for (const detail of samples) {
                const normalized = String(detail || '').replace(/\s+/g, ' ').trim();
                if (!normalized) continue;
                const key = normalized.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                details.push(normalized);
            }
            if (!strictContractMode && !hasTotal && !truncated) {
                contractTotal += samples.length;
            }
        }
        const shownCount = Math.min(details.length, maxItems);
        let extraCount = 0;
        if (hasContractDetailMeta) {
            extraCount = strictContractMode
                ? Math.max(0, contractTotal - shownCount)
                : Math.max(0, Math.max(contractTotal, details.length) - shownCount);
        } else if (!strictContractMode) {
            extraCount = Math.max(0, details.length - shownCount);
        }
        if (extraCount === 0 && anyTruncated) {
            extraCount = 1;
        }
        if (details.length > 0) {
            const shown = details.slice(0, maxItems).join('; ');
            const extra = extraCount > 0 ? ` +${extraCount}` : '';
            return tFormat('profileErrActionStopOthersFailedDetail', 'Failure details: {details}{extra}', { details: shown, extra });
        }
        if (strictContractMode && hasContractDetailMeta && extraCount > 0) {
            return tFormat('profileErrActionStopOthersFailedDetail', 'Failure details: {details}{extra}', {
                details: `+${extraCount}`,
                extra: '',
            });
        }
    }
    if (strictContractMode) return '';
    const list = result && Array.isArray(result.failed) ? result.failed : [];
    if (list.length === 0) return '';
    const details = [];
    const seen = new Set();
    for (const item of list) {
        const name = String(item && (item.name || item.id) ? (item.name || item.id) : '').trim();
        const code = String(item && (item.errorCode || item.code) ? (item.errorCode || item.code) : 'STOP_PROFILE_FAILED').trim().toUpperCase();
        const messageRaw = String(item && (item.error || item.message) ? (item.error || item.message) : '').replace(/\s+/g, ' ').trim();
        const message = messageRaw.length > messageMaxLength ? `${messageRaw.slice(0, messageMaxLength)}…` : messageRaw;
        const detail = message ? `${name || code}(${code}): ${message}` : `${name || code}(${code})`;
        const key = detail.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        details.push(detail);
    }
    if (details.length === 0) return '';
    const shown = details.slice(0, maxItems).join('; ');
    const extra = details.length > maxItems ? ` +${details.length - maxItems}` : '';
    return tFormat('profileErrActionStopOthersFailedDetail', 'Failure details: {details}{extra}', { details: shown, extra });
}

function getStopOtherCodePriority(code) {
    const normalized = String(code || '').trim().toUpperCase();
    switch (normalized) {
        case 'STOP_PROFILE_PERMISSION_DENIED':
            return 1;
        case 'STOP_PROFILE_INVALID_ID':
        case 'STOP_PROFILE_MISSING_ID':
        case 'STOP_PROFILE_NOT_FOUND':
            return 2;
        case 'STOP_PROFILE_PROCESS_NOT_FOUND':
            return 3;
        case 'STOP_PROFILE_FAILED':
            return 4;
        default:
            return 5;
    }
}

function formatStopOthersCodeProfileMapSummary(result, codeLimit = 2, nameLimit = 2) {
    const contractCodeLimitRaw = Number(result && result.codeProfileMapCodeLimit);
    const contractNameLimitRaw = Number(result && result.codeProfileMapProfileLimit);
    const fallbackCodeLimit = Math.max(1, Number(codeLimit) || 2);
    const fallbackNameLimit = Math.max(1, Number(nameLimit) || 2);
    const contractVersion = getStopOtherContractVersion(result);
    const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;
    const resolvedCodeLimit = Number.isFinite(contractCodeLimitRaw) && contractCodeLimitRaw > 0
        ? Math.floor(contractCodeLimitRaw)
        : fallbackCodeLimit;
    const resolvedNameLimit = Number.isFinite(contractNameLimitRaw) && contractNameLimitRaw > 0
        ? Math.floor(contractNameLimitRaw)
        : fallbackNameLimit;
    const summaryList = result && Array.isArray(result.failureCodeSummaries)
        ? result.failureCodeSummaries
            .map((item) => {
                const profileTotalRaw = Number(item && item.profileTotal);
                const hasProfileTotal = Number.isFinite(profileTotalRaw) && profileTotalRaw >= 0;
                return {
                    code: String(item && item.code ? item.code : '').trim().toUpperCase(),
                    count: Number(item && item.count),
                    profiles: Array.isArray(item && item.profiles) ? item.profiles : [],
                    profileTotal: hasProfileTotal ? profileTotalRaw : null,
                    profileTruncated: Boolean(item && item.profileTruncated),
                    hasProfileTotal,
                };
            })
            .filter((item) => item.code)
        : [];
    if (summaryList.length > 0) {
        const codeTop = resolvedCodeLimit;
        const nameTop = resolvedNameLimit;
        const items = summaryList.slice(0, codeTop).map((item) => {
            const normalizedNames = item.profiles
                .map((name) => String(name || '').trim())
                .filter((name) => Boolean(name));
            const shownNameCount = Math.min(normalizedNames.length, nameTop);
            const shownNames = normalizedNames.slice(0, nameTop).join(', ');
            const effectiveTotal = item.hasProfileTotal
                ? Number(item.profileTotal || 0)
                : (strictContractMode ? 0 : normalizedNames.length);
            let hiddenCount = Math.max(0, effectiveTotal - shownNameCount);
            if (hiddenCount === 0 && item.profileTruncated) {
                hiddenCount = 1;
            }
            const hidden = hiddenCount > 0 ? ` +${hiddenCount}` : '';
            if (shownNames) return `${item.code}: ${shownNames}${hidden}`;
            const countBase = item.hasProfileTotal
                ? effectiveTotal
                : (Number.isFinite(item.count) && item.count > 0 ? Number(item.count) : 0);
            const countText = countBase > 0 ? `x${countBase}` : '';
            if (countText) return `${item.code}${countText}`;
            if (hidden) return `${item.code}${hidden}`;
            return `${item.code}`;
        }).filter(Boolean);
        if (items.length > 0) {
            return tFormat('profileErrActionStopOthersCodeProfileMap', 'Failure code -> profiles: {items}', { items: items.join('; ') });
        }
    }
    const codeMap = new Map();
    const rankedCodes = result && Array.isArray(result.rankedErrorCodes)
        ? result.rankedErrorCodes
            .map((code) => String(code || '').trim().toUpperCase())
            .filter((code) => Boolean(code))
        : [];
    const rankIndexByCode = new Map(rankedCodes.map((code, index) => [code, index]));
    const countMap = result && result.errorCodeCounts && typeof result.errorCodeCounts === 'object'
        ? result.errorCodeCounts
        : {};
    const profileTotalMap = result && result.errorCodeProfileTotals && typeof result.errorCodeProfileTotals === 'object'
        ? result.errorCodeProfileTotals
        : {};
    const profileTruncatedMap = result && result.errorCodeProfilesTruncated && typeof result.errorCodeProfilesTruncated === 'object'
        ? result.errorCodeProfilesTruncated
        : {};
    if (result && result.errorCodeProfiles && typeof result.errorCodeProfiles === 'object') {
        for (const [rawCode, rawNames] of Object.entries(result.errorCodeProfiles)) {
            const code = String(rawCode || '').trim().toUpperCase();
            if (!code) continue;
            const names = Array.isArray(rawNames)
                ? rawNames
                    .map((name) => String(name || '').trim())
                    .filter((name) => Boolean(name))
                : [];
            const totalFromContract = Number(profileTotalMap[code]);
            const hasTotalFromContract = Number.isFinite(totalFromContract) && totalFromContract >= 0;
            const fallbackTotal = Number.isFinite(Number(countMap[code])) ? Number(countMap[code]) : names.length;
            const total = hasTotalFromContract
                ? totalFromContract
                : (strictContractMode ? 0 : fallbackTotal);
            codeMap.set(code, {
                total,
                names,
                truncated: Boolean(profileTruncatedMap[code]),
            });
        }
    }
    const contractOnlyCodes = Array.from(new Set([
        ...rankedCodes,
        ...Object.keys(profileTotalMap || {}).map((code) => String(code || '').trim().toUpperCase()),
        ...Object.keys(profileTruncatedMap || {}).map((code) => String(code || '').trim().toUpperCase()),
    ])).filter((code) => Boolean(code));
    for (const code of contractOnlyCodes) {
        if (codeMap.has(code)) continue;
        const totalFromContract = Number(profileTotalMap[code]);
        const hasTotalFromContract = Number.isFinite(totalFromContract) && totalFromContract >= 0;
        const fallbackTotal = Number.isFinite(Number(countMap[code])) ? Number(countMap[code]) : 0;
        const total = hasTotalFromContract
            ? totalFromContract
            : (strictContractMode ? 0 : fallbackTotal);
        const truncated = Boolean(profileTruncatedMap[code]);
        if (total <= 0 && !truncated) continue;
        codeMap.set(code, {
            total,
            names: [],
            truncated,
        });
    }
    if (codeMap.size === 0) {
        if (strictContractMode) return '';
        const list = result && Array.isArray(result.failed) ? result.failed : [];
        if (list.length === 0) return '';
        for (const item of list) {
            const code = String(item && (item.errorCode || item.code) ? (item.errorCode || item.code) : 'STOP_PROFILE_FAILED').trim().toUpperCase();
            if (!code) continue;
            const name = String(item && (item.name || item.id) ? (item.name || item.id) : '').trim() || code;
            if (!codeMap.has(code)) codeMap.set(code, { total: 0, names: [], truncated: false });
            const bucket = codeMap.get(code);
            bucket.total += 1;
            if (!bucket.names.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
                bucket.names.push(name);
            }
        }
    }
    const entries = Array.from(codeMap.entries()).sort((left, right) => {
        const leftRank = rankIndexByCode.has(left[0]) ? rankIndexByCode.get(left[0]) : Number.POSITIVE_INFINITY;
        const rightRank = rankIndexByCode.has(right[0]) ? rankIndexByCode.get(right[0]) : Number.POSITIVE_INFINITY;
        if (leftRank !== rightRank) {
            if (leftRank === Number.POSITIVE_INFINITY) return 1;
            if (rightRank === Number.POSITIVE_INFINITY) return -1;
            return leftRank - rightRank;
        }
        const byPriority = getStopOtherCodePriority(left[0]) - getStopOtherCodePriority(right[0]);
        if (byPriority !== 0) return byPriority;
        const leftTotal = Number(left[1] && left[1].total ? left[1].total : 0);
        const rightTotal = Number(right[1] && right[1].total ? right[1].total : 0);
        const byTotal = rightTotal - leftTotal;
        if (byTotal !== 0) return byTotal;
        return String(left[0]).localeCompare(String(right[0]));
    });
    if (entries.length === 0) return '';
    const codeTop = resolvedCodeLimit;
    const nameTop = resolvedNameLimit;
    const items = entries.slice(0, codeTop).map(([code, bucket]) => {
        const names = Array.isArray(bucket && bucket.names) ? bucket.names : [];
        const shownNameCount = Math.min(names.length, nameTop);
        const shownNames = names.slice(0, nameTop).join(', ');
        const totalRaw = Number(bucket && bucket.total);
        const effectiveTotal = Number.isFinite(totalRaw) && totalRaw >= 0
            ? totalRaw
            : (strictContractMode ? 0 : names.length);
        let hiddenCount = Math.max(0, effectiveTotal - shownNameCount);
        if (hiddenCount === 0 && bucket && bucket.truncated) {
            hiddenCount = 1;
        }
        const hidden = hiddenCount > 0 ? ` +${hiddenCount}` : '';
        if (shownNames) return `${code}: ${shownNames}${hidden}`;
        const countBase = Number.isFinite(totalRaw) && totalRaw > 0 ? Number(totalRaw) : 0;
        const countText = countBase > 0 ? `x${countBase}` : '';
        if (countText) return `${code}${countText}`;
        if (hidden) return `${code}${hidden}`;
        return `${code}`;
    }).filter(Boolean);
    if (items.length === 0) return '';
    return tFormat('profileErrActionStopOthersCodeProfileMap', 'Failure code -> profiles: {items}', { items: items.join('; ') });
}

function formatStopOthersProfileSummary(result) {
    const lines = [];
    const contractVersion = getStopOtherContractVersion(result);
    const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;
    const remainingLimitRaw = Number(result && result.remainingProfileSummaryLimit);
    const failedLimitRaw = Number(result && result.failedProfileSummaryLimit);
    const remainingCountRaw = Number(result && result.remainingCount);
    const failedCountRaw = Number(result && result.failedCount);
    const remainingCount = Number.isFinite(remainingCountRaw) && remainingCountRaw >= 0 ? remainingCountRaw : 0;
    const failedCount = Number.isFinite(failedCountRaw) && failedCountRaw >= 0 ? failedCountRaw : 0;
    const remainingLimit = Number.isFinite(remainingLimitRaw) && remainingLimitRaw > 0 ? Math.floor(remainingLimitRaw) : 3;
    const failedLimit = Number.isFinite(failedLimitRaw) && failedLimitRaw > 0 ? Math.floor(failedLimitRaw) : 3;
    const remainingSummary = buildStopOtherProfileNameSummary(
        result && Array.isArray(result.remainingProfiles) && result.remainingProfiles.length > 0
            ? result.remainingProfiles
            : (!strictContractMode && result && Array.isArray(result.remainingIds) ? result.remainingIds : []),
        remainingLimit
    );
    if (remainingSummary.total > 0 && remainingSummary.names) {
        lines.push(tFormat('profileErrActionStopOthersRemainingList', 'Still running profiles: {names}{extra}', {
            names: remainingSummary.names,
            extra: remainingSummary.extra > 0 ? ` +${remainingSummary.extra}` : '',
        }));
    } else if (strictContractMode && remainingCount > 0) {
        lines.push(tFormat('profileErrActionStopOthersRemainingList', 'Still running profiles: {names}{extra}', {
            names: `+${remainingCount}`,
            extra: '',
        }));
    }
    const failedSummary = buildStopOtherProfileNameSummary(
        result && Array.isArray(result.failedProfiles) && result.failedProfiles.length > 0
            ? result.failedProfiles
            : (!strictContractMode && result && Array.isArray(result.failed) ? result.failed : []),
        failedLimit
    );
    if (failedSummary.total > 0 && failedSummary.names) {
        lines.push(tFormat('profileErrActionStopOthersFailedList', 'Failed to stop profiles: {names}{extra}', {
            names: failedSummary.names,
            extra: failedSummary.extra > 0 ? ` +${failedSummary.extra}` : '',
        }));
    } else if (strictContractMode && failedCount > 0) {
        lines.push(tFormat('profileErrActionStopOthersFailedList', 'Failed to stop profiles: {names}{extra}', {
            names: `+${failedCount}`,
            extra: '',
        }));
    }
    const failedDetailSummary = formatStopOthersFailedDetailSummary(result);
    if (failedDetailSummary) {
        lines.push(failedDetailSummary);
    }
    const codeProfileMapSummary = formatStopOthersCodeProfileMapSummary(result);
    if (codeProfileMapSummary) {
        lines.push(codeProfileMapSummary);
    }
    return lines.join('\n');
}

function getStopOtherDominantActionSuggestion(code) {
    const normalized = String(code || '').trim().toUpperCase();
    switch (normalized) {
        case 'STOP_PROFILE_PERMISSION_DENIED':
            return tText('profileErrActionStopOthersNextStepPermissionDenied', 'Next step: Run GeekEZ Browser as Administrator, then retry Stop Others.');
        case 'STOP_PROFILE_INVALID_ID':
        case 'STOP_PROFILE_MISSING_ID':
        case 'STOP_PROFILE_NOT_FOUND':
            return tText('profileErrActionStopOthersNextStepProfileInvalid', 'Next step: Refresh profile list, confirm IDs, then retry Stop Others.');
        case 'STOP_PROFILE_PROCESS_NOT_FOUND':
            return tText('profileErrActionStopOthersNextStepProcessMissing', 'Next step: Refresh running status and retry; missing processes may already be exited.');
        default:
            return tText('profileErrActionStopOthersNextStepGeneric', 'Next step: Stop remaining profiles manually, then retry.');
    }
}

async function stopOtherRunningProfilesForTun(profileId) {
    if (!profileId) return false;
    if (!window.electronAPI) {
        return false;
    }
    if (typeof window.electronAPI.stopOtherRunningProfiles === 'function') {
        try {
            const result = await window.electronAPI.stopOtherRunningProfiles(profileId);
            await loadProfiles();
            const outcome = resolveStopOthersOutcome(result);
            if (outcome.stoppedCount > 0) {
                showToast(tFormat('profileErrActionStopOthersDone', 'Stopped {count} conflicting profile(s).', { count: outcome.stoppedCount }), 1800);
            }
            if (outcome.kind === 'invalid_keep_id') {
                showAlert(composeProfileErrorMessage('Stop Error', {
                    code: 'STOP_OTHER_INVALID_KEEP_ID',
                    message: tText('profileErrActionInvalidKeep', 'Current profile reference is invalid. Refresh profile list and retry.'),
                }, 'stop'));
                return false;
            }
            if (outcome.kind === 'no_conflict' || outcome.requestedCount === 0) {
                showToast(tText('profileErrActionNoConflict', 'No conflicting running profiles found.'), 1600);
                return false;
            }
            if (outcome.kind === 'ready_partial') {
                showToast(
                    tFormat('profileErrActionStopOthersReadyPartial', 'Stopped {stopped}/{requested}; retrying now.', {
                        stopped: outcome.stoppedCount,
                        requested: outcome.requestedCount,
                    }),
                    2000
                );
                return true;
            }
            if (outcome.kind === 'ready') {
                return true;
            }
            if (outcome.kind === 'partial_blocked' || outcome.kind === 'blocked') {
                if (outcome.stoppedCount > 0 || outcome.failedCount > 0 || outcome.remainingCount > 0) {
                    showToast(
                        tFormat('profileErrActionStopOthersPartial', 'Stopped {stopped}/{requested}; {remaining} still running.', {
                            stopped: outcome.stoppedCount,
                            requested: outcome.requestedCount,
                            remaining: outcome.remainingCount,
                        }),
                        2400
                    );
                }
                const contractVersion = getStopOtherContractVersion(result);
                const strictContractMode = contractVersion >= STOP_OTHER_STRICT_CONTRACT_VERSION;
                const firstFailed = !strictContractMode && result && Array.isArray(result.failed) && result.failed.length > 0
                    ? result.failed[0]
                    : null;
                const dominantCode = String(
                    result && result.dominantErrorCode
                        ? result.dominantErrorCode
                        : (!strictContractMode && firstFailed && (firstFailed.errorCode || firstFailed.code))
                            ? (firstFailed.errorCode || firstFailed.code)
                            : ''
                ).trim().toUpperCase();
                const codeSummary = formatStopOthersErrorCodeSummary(result);
                const blockedMessage = tFormat('profileErrActionStopOthersFailed', 'Could not stop conflicting profiles ({remaining} still running). Stop them manually and retry.', { remaining: outcome.remainingCount });
                const profileSummary = formatStopOthersProfileSummary(result);
                const blockedMessageWithProfiles = profileSummary ? `${blockedMessage}\n${profileSummary}` : blockedMessage;
                const blockedMessageWithSummary = codeSummary ? `${blockedMessageWithProfiles}\n${codeSummary}` : blockedMessageWithProfiles;
                const dominantSuggestion = getStopOtherDominantActionSuggestion(dominantCode);
                const blockedMessageWithSuggestion = dominantSuggestion ? `${blockedMessageWithSummary}\n${dominantSuggestion}` : blockedMessageWithSummary;
                if (firstFailed || dominantCode) {
                    showAlert(composeProfileErrorMessage('Stop Error', {
                        code: dominantCode || null,
                        message: blockedMessageWithSuggestion,
                    }, 'stop'));
                } else {
                    showAlert(blockedMessageWithSuggestion);
                }
                return false;
            }
            return Boolean(outcome.retryReady);
        } catch (e) { }
    }
    if (typeof window.electronAPI.getRunningIds !== 'function' || typeof window.electronAPI.stopProfile !== 'function') {
        return false;
    }
    try {
        const runningIds = await window.electronAPI.getRunningIds();
        const targets = Array.isArray(runningIds) ? runningIds.filter((rid) => rid && rid !== profileId) : [];
        if (targets.length === 0) {
            await loadProfiles();
            return false;
        }
        let allStopped = true;
        for (const runningId of targets) {
            try {
                const stopResult = await window.electronAPI.stopProfile(runningId);
                if (!stopResult || stopResult.success === false) allStopped = false;
            } catch (e) {
                allStopped = false;
            }
        }
        await loadProfiles();
        return allStopped;
    } catch (e) {
        return false;
    }
}

async function listRunningProfileSummariesSafe() {
    if (!window.electronAPI) return [];
    if (typeof window.electronAPI.listRunningProfileSummaries === 'function') {
        try {
            const result = await window.electronAPI.listRunningProfileSummaries();
            if (result && result.success === false) return [];
            if (Array.isArray(result)) return result;
            if (result && Array.isArray(result.profiles)) return result.profiles;
        } catch (e) { }
    }
    if (typeof window.electronAPI.getRunningIds === 'function') {
        try {
            const ids = await window.electronAPI.getRunningIds();
            if (Array.isArray(ids)) return ids.map((id) => ({ id, name: id }));
        } catch (e) { }
    }
    return [];
}

async function buildTunConflictSummary(profileId, code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (normalized !== 'TUN_ALREADY_RUNNING' && normalized !== 'TUN_REQUIRES_SINGLE_PROFILE') return '';
    const summaries = await listRunningProfileSummariesSafe();
    const others = Array.isArray(summaries) ? summaries.filter((item) => item && item.id && item.id !== profileId) : [];
    if (others.length === 0) return '';
    const names = others
        .map((item) => item.name || item.id)
        .filter((name) => Boolean(name))
        .slice(0, 3)
        .join(', ');
    const extraCount = others.length > 3 ? ` +${others.length - 3}` : '';
    return tFormat('profileErrActionTunConflictList', 'Conflicting running profiles: {names}{extra}', { names, extra: extraCount });
}

function getProfileErrorActionPlan(code, stage = '', profileId = null) {
    const normalized = String(code || '').trim().toUpperCase();
    const defaultPlan = {
        altText: t('openLog') || 'Open Log',
        onAlt: async () => {
            if (profileId) {
                await openProfileLogById(profileId);
                return false;
            }
            await loadProfiles();
            return false;
        }
    };
    const refreshCodes = new Set([
        'STOP_PROFILE_MISSING_ID',
        'STOP_PROFILE_INVALID_ID',
        'STOP_PROFILE_NOT_FOUND',
        'STOP_PROFILE_PROCESS_NOT_FOUND',
        'PROFILE_NOT_FOUND',
    ]);
    if (refreshCodes.has(normalized) || (!normalized && stage === 'stop')) {
        return {
            altText: tText('profileErrActionRefreshList', 'Refresh List'),
            onAlt: async () => {
                await loadProfiles();
                return false;
            }
        };
    }
    if (normalized === 'TUN_ALREADY_RUNNING' || normalized === 'TUN_REQUIRES_SINGLE_PROFILE') {
        return {
            altText: tText('profileErrActionStopOthersRetry', 'Stop Others & Retry'),
            onAlt: async () => {
                const ready = await stopOtherRunningProfilesForTun(profileId);
                return Boolean(ready);
            }
        };
    }
    return defaultPlan;
}

function composeProfileErrorMessage(prefix, errorLike, stage = '') {
    const code = errorLike && typeof errorLike === 'object' ? (errorLike.code || null) : null;
    const message = errorLike && typeof errorLike === 'object' && errorLike.message
        ? errorLike.message
        : String(errorLike || 'unknown');
    const hint = getProfileErrorActionHint(code, stage);
    const withCode = `${prefix}${code ? ` [${code}]` : ''}: ${message}`;
    return hint ? `${withCode}\n${hint}` : withCode;
}

async function showProfileErrorWithActions(prefix, errorLike, stage = '', profileId = null, retryFn = null) {
    const message = composeProfileErrorMessage(prefix, errorLike, stage);
    if (typeof retryFn !== 'function' || typeof showConfirmChoice !== 'function') {
        showAlert(message);
        return;
    }
    const code = errorLike && typeof errorLike === 'object'
        ? (errorLike.code || errorLike.errorCode || null)
        : null;
    const tunConflictSummary = await buildTunConflictSummary(profileId, code);
    const actionMessage = tunConflictSummary ? `${message}\n${tunConflictSummary}` : message;
    const actionPlan = getProfileErrorActionPlan(code, stage, profileId);
    await new Promise((resolve) => {
        showConfirmChoice(
            `${actionMessage}\n${t('chooseAction') || 'Choose action:'}`,
            {
                altText: (actionPlan && actionPlan.altText) ? actionPlan.altText : (t('openLog') || 'Open Log'),
                okText: t('retryNow') || 'Retry Now',
                onAlt: async () => {
                    let shouldRetry = false;
                    try {
                        if (actionPlan && typeof actionPlan.onAlt === 'function') {
                            shouldRetry = Boolean(await actionPlan.onAlt());
                        }
                    } catch (e) { }
                    if (shouldRetry) {
                        try { await retryFn(); } catch (e) { }
                    }
                    resolve();
                },
                onConfirm: async () => {
                    try { await retryFn(); } catch (e) { }
                    resolve();
                },
                onCancel: () => resolve(),
            }
        );
    });
}

function showConfirmChoice(msg, options) {
    const altBtn = document.getElementById('confirmAltBtn');
    if (altBtn) {
        altBtn.textContent = options && options.altText ? options.altText : 'Alt';
        altBtn.style.display = 'inline-block';
    }
    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) okBtn.textContent = (options && options.okText) ? options.okText : (t('confirm') || 'Confirm');
    confirmAltCallback = options && typeof options.onAlt === 'function' ? options.onAlt : null;
    confirmCancelCallback = options && typeof options.onCancel === 'function' ? options.onCancel : null;
    document.getElementById('confirmMsg').innerText = msg;
    document.getElementById('confirmModal').style.display = 'flex';
    const modal = document.getElementById('confirmModal');
    logModalState('confirmModal.showConfirmChoice', modal);
    requestAnimationFrame(() => logModalState('confirmModal.showConfirmChoice.raf', modal));
    setTimeout(() => logModalState('confirmModal.showConfirmChoice.t20', modal), 20);
    confirmCallback = options && typeof options.onConfirm === 'function' ? options.onConfirm : null;
}

function closeConfirm(result) {
    document.getElementById('confirmModal').style.display = 'none';
    if (result === 'alt' && confirmAltCallback) confirmAltCallback();
    if (result === true && confirmCallback) confirmCallback();
    if (result === false && confirmCancelCallback) confirmCancelCallback();
    confirmCallback = null;
    confirmAltCallback = null;
    confirmCancelCallback = null;
    const altBtn = document.getElementById('confirmAltBtn');
    if (altBtn) altBtn.style.display = 'none';
}

function showInput(title, callback) {
    document.getElementById('inputModalTitle').innerText = title;
    document.getElementById('inputModalValue').value = '';
    document.getElementById('inputModal').style.display = 'flex';
    document.getElementById('inputModalValue').focus();
    inputCallback = callback;
}
function closeInputModal() { document.getElementById('inputModal').style.display = 'none'; inputCallback = null; }
function submitInputModal() {
    const val = document.getElementById('inputModalValue').value.trim();
    if (val && inputCallback) inputCallback(val);
    closeInputModal();
}

function resolveActionElementFromEvent(ev) {
    if (!ev) return null;

    if (typeof ev.composedPath === 'function') {
        const path = ev.composedPath();
        if (Array.isArray(path)) {
            for (const node of path) {
                if (
                    node
                    && node.nodeType === 1
                    && typeof node.getAttribute === 'function'
                    && node.getAttribute('data-action')
                ) {
                    return node;
                }
            }
        }
    }

    let target = ev.target || null;
    if (target && target.nodeType === 3) target = target.parentElement; // Text node -> Element
    return (target && typeof target.closest === 'function') ? target.closest('[data-action]') : null;
}

const CLICK_DEBUG_KEY = 'geekez_debug_clicks';
function isClickDebugEnabled() {
    try {
        if (typeof window !== 'undefined' && window.__debugClicks) return true;
        return localStorage.getItem(CLICK_DEBUG_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function describeClickNode(node) {
    if (!node) return null;
    if (node.nodeType === 3) return '#text';
    if (node.nodeType !== 1) return String(node.nodeType);
    const el = node;
    const tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
        ? `.${el.className.trim().replace(/\s+/g, '.')}`
        : '';
    return `${tag}${id}${cls}`;
}

function logClickDebug(label, ev, extra = {}) {
    if (!isClickDebugEnabled()) return;
    try {
        const target = ev ? ev.target : null;
        const path = (ev && typeof ev.composedPath === 'function') ? ev.composedPath() : null;
        const payload = {
            label,
            target: describeClickNode(target),
            actionEl: extra.actionEl ? describeClickNode(extra.actionEl) : null,
            action: extra.action || null,
            role: extra.role || null,
            proxyId: extra.proxyId || null,
            path: Array.isArray(path) ? path.slice(0, 6).map(describeClickNode) : null,
        };
        console.log('[click-debug]', payload);
    } catch (e) {
        console.log('[click-debug] log failed', e);
    }
}

function logModalState(label, modal) {
    if (!isClickDebugEnabled()) return;
    try {
        if (!modal) {
            console.log('[click-debug]', { label, missing: true });
            return;
        }
        const style = window.getComputedStyle(modal);
        const rect = modal.getBoundingClientRect();
        const docEl = document.documentElement;
        const bodyEl = document.body;
        const docRect = docEl ? docEl.getBoundingClientRect() : { width: 0, height: 0 };
        const bodyRect = bodyEl ? bodyEl.getBoundingClientRect() : { width: 0, height: 0 };
        const bodyStyle = bodyEl ? window.getComputedStyle(bodyEl) : null;
        const docStyle = docEl ? window.getComputedStyle(docEl) : null;
        const ancestors = [];
        let cur = modal.parentElement;
        while (cur) {
            const cs = window.getComputedStyle(cur);
            const suspicious = cs.display === 'none'
                || cs.visibility === 'hidden'
                || cs.opacity === '0'
                || cs.contentVisibility === 'hidden'
                || cs.transform !== 'none'
                || cs.filter !== 'none';
            if (suspicious) {
                ancestors.push({
                    el: describeClickNode(cur),
                    display: cs.display,
                    visibility: cs.visibility,
                    opacity: cs.opacity,
                    transform: cs.transform,
                    filter: cs.filter,
                    contentVisibility: cs.contentVisibility,
                    position: cs.position,
                    overflow: cs.overflow,
                });
            }
            cur = cur.parentElement;
        }
        console.log('[click-debug]', {
            label,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
            position: style.position,
            top: style.top,
            left: style.left,
            width: style.width,
            height: style.height,
            transform: style.transform,
            zIndex: style.zIndex,
            rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
            offset: { w: modal.offsetWidth, h: modal.offsetHeight },
            client: { w: modal.clientWidth, h: modal.clientHeight },
            scroll: { w: modal.scrollWidth, h: modal.scrollHeight },
            firstChild: describeClickNode(modal.firstElementChild),
            inDom: document.body ? document.body.contains(modal) : false,
            viewport: { w: window.innerWidth, h: window.innerHeight },
            doc: { w: Math.round(docRect.width), h: Math.round(docRect.height) },
            body: { w: Math.round(bodyRect.width), h: Math.round(bodyRect.height) },
            bodyTransform: bodyStyle ? bodyStyle.transform : null,
            bodyZoom: bodyStyle ? (bodyStyle.zoom || null) : null,
            docTransform: docStyle ? docStyle.transform : null,
            docZoom: docStyle ? (docStyle.zoom || null) : null,
            ancestorIssues: ancestors.slice(0, 6),
        });
        try {
            const payload = {
                label,
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                pointerEvents: style.pointerEvents,
                position: style.position,
                top: style.top,
                left: style.left,
                width: style.width,
                height: style.height,
                transform: style.transform,
                zIndex: style.zIndex,
                rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
                offset: { w: modal.offsetWidth, h: modal.offsetHeight },
                client: { w: modal.clientWidth, h: modal.clientHeight },
                scroll: { w: modal.scrollWidth, h: modal.scrollHeight },
                firstChild: describeClickNode(modal.firstElementChild),
                inDom: document.body ? document.body.contains(modal) : false,
                viewport: { w: window.innerWidth, h: window.innerHeight },
                doc: { w: Math.round(docRect.width), h: Math.round(docRect.height) },
                body: { w: Math.round(bodyRect.width), h: Math.round(bodyRect.height) },
                bodyTransform: bodyStyle ? bodyStyle.transform : null,
                bodyZoom: bodyStyle ? (bodyStyle.zoom || null) : null,
                docTransform: docStyle ? docStyle.transform : null,
                docZoom: docStyle ? (docStyle.zoom || null) : null,
                ancestorIssues: ancestors.slice(0, 6),
            };
            console.log('[click-debug-json]', JSON.stringify(payload));
        } catch (e) { }
    } catch (e) {
        console.log('[click-debug] modal state failed', label, e);
    }
}

function hoistGlobalModalsToBody() {
    const body = document.body;
    if (!body) return;
    const overlays = Array.from(document.querySelectorAll('.modal-overlay'));
    overlays.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (el.id === 'proxyModal') return;
        if (el.parentElement !== body) {
            body.appendChild(el);
            if (isClickDebugEnabled()) console.log('[click-debug] hoisted modal', el.id || el.className);
        }
    });
}

function ensureGlobalActionEventsBound() {
    if (__globalActionEventsBound) return;
    __globalActionEventsBound = true;
    if (isClickDebugEnabled()) console.log('[click-debug] global action events bound');

    document.addEventListener('click', (ev) => {
        try {
            logClickDebug('doc-click', ev);
            const actionEl = resolveActionElementFromEvent(ev);
            logClickDebug('action-resolve', ev, { actionEl });
            if (!actionEl) return;
            const action = actionEl.getAttribute('data-action');
            if (!action) return;
            logClickDebug('action-hit', ev, { actionEl, action });
            const actionArg = actionEl.getAttribute('data-action-arg');
            const proxyGroupMoreMenu = actionEl.closest ? actionEl.closest('#proxyModal .proxy-group-more.profile-more-menu') : null;
            if (proxyGroupMoreMenu && proxyGroupMoreMenu.hasAttribute('open')) {
                proxyGroupMoreMenu.removeAttribute('open');
            }
            if (actionEl.tagName === 'A') ev.preventDefault();

            const run = (p) => {
                try {
                    if (p && typeof p.then === 'function') {
                        p.catch((err) => console.error('data-action async failed:', err));
                    }
                } catch (e) {
                    console.error('data-action runner failed:', e);
                }
            };

            switch (action) {
                case 'open-github': run(openGithub()); break;
                case 'open-help': run(openHelp()); break;
                case 'open-settings': run(openSettings()); break;
                case 'check-updates': run(checkUpdates()); break;
                case 'toggle-lang': run(toggleLang()); break;
                case 'open-proxy-manager': run(openProxyManager()); break;
                case 'close-proxy-manager': run(closeProxyManager()); break;
                case 'copy-proxy-url': run(copyProxyInspectorUrl()); break;
                case 'proxy-inspector-test': run(actionArg ? testSingleProxy(actionArg) : null); break;
                case 'proxy-inspector-edit': run(actionArg ? editPreProxy(actionArg) : null); break;
                case 'proxy-inspector-delete': run(actionArg ? confirmDeleteProxyNode(actionArg) : null); break;
                case 'open-export-modal': run(openExportModal()); break;
                case 'close-export-modal': run(closeExportModal()); break;
                case 'open-export-select-modal': run(openExportSelectModal(actionArg)); break;
                case 'close-export-select-modal': run(closeExportSelectModal()); break;
                case 'confirm-export': run(confirmExport()); break;
                case 'toggle-import-menu': run(toggleImportMenu()); break;
                case 'import-full-backup': run(importFullBackup()); closeImportMenu(); break;
                case 'import-data': run(importData()); closeImportMenu(); break;
                case 'open-add-modal': run(openAddModal()); break;
                case 'close-add-modal': run(closeAddModal()); break;
                case 'save-new-profile': run(saveNewProfile()); break;
                case 'close-edit-modal': run(closeEditModal()); break;
                case 'save-edit-profile': run(saveEditProfile()); break;
                case 'close-cookie-manager': run(closeCookieManager()); break;
                case 'proxy-page-add': openProxyPageAddPanel(); break;
                case 'proxy-page-cancel-add': closeProxyPageAddPanel(); break;
                case 'proxy-page-save': run(saveProxyPageNode()); break;
                case 'proxy-page-batch-import': run(openProxyBatchImport()); break;
                case 'proxy-page-batch-delete': run(openProxyBatchDelete()); break;
                case 'proxy-page-switch-group': switchProxyPageGroup(actionArg); break;
                case 'set-proxy-page-filter': setProxyPageStatusFilter(actionArg); break;
                case 'refresh-cookie-sites': run(refreshCookieManagerData({ keepSelected: true })); break;
                case 'open-cookie-add': run(openCookieAddEditor()); break;
                case 'save-cookie-edit': run(saveCookieEdit()); break;
                case 'delete-cookie-edit': run(deleteCookieEdit()); break;
                case 'export-profile-cookies': run(exportCurrentCookieScope()); break;
                case 'import-profile-cookies': run(importCurrentCookieScope()); break;
                case 'clear-profile-cookies-site': run(clearCurrentCookieScope()); break;
                case 'toggle-view-mode': run(toggleViewMode()); break;
                case 'set-profile-filter': run(setProfileStatusFilter(actionArg)); break;
                case 'set-proxy-status-filter': run(setProxyStatusFilter(actionArg)); break;
                case 'focus-proxy-panel': run(focusProxyPanel(actionArg)); break;
                case 'toggle-proxy-secondary-filters': run(toggleProxySecondaryFilters()); break;
                case 'set-proxy-cognitive-mode': run(setProxyCognitiveMode(actionArg)); break;
                case 'toggle-proxy-sidebar': run(toggleProxySidebar()); break;
                case 'test-current-group': run(testCurrentGroup()); break;
                case 'export-current-group-report': run(exportCurrentGroupReport()); break;
                case 'rollback-current-group': run(rollbackSubscriptionNodes(currentProxyGroup)); break;
                case 'edit-current-subscription': run(editCurrentSubscription()); break;
                case 'open-sub-edit-modal': run(openSubEditModal(actionArg === 'true')); break;
                case 'save-pre-proxy': run(savePreProxy()); break;
                case 'reset-proxy-input': run(resetProxyInput()); break;
                case 'toggle-proxy-inspector': run(toggleProxyInspectorPanel()); break;
                case 'close-proxy-inspector-drawer': run(closeProxyInspectorDrawer()); break;
                case 'toggle-proxy-inspector-steps': run(toggleProxyInspectorStepsPanel()); break;
                case 'toggle-proxy-inspector-attempts': run(toggleProxyInspectorAttemptsPanel()); break;
                case 'toggle-proxy-advanced': run(toggleProxyAdvancedPanel()); break;
                case 'set-proxy-advanced-view': run(setProxyAdvancedView(actionArg)); break;
                case 'toggle-proxy-diagnostics': run(toggleProxyDiagnosticsPanel()); break;
                case 'toggle-proxy-diagnostics-detail': run(toggleProxyDiagnosticsDetailPanel()); break;
                case 'save-proxy-test-strategy': run(saveProxyBatchTestStrategy()); break;
                case 'apply-proxy-test-profile': run(applyProxyStrategyProfilePreset(actionArg)); break;
                case 'apply-proxy-query-preset': run(applyProxyQueryPreset(actionArg)); break;
                case 'save-current-proxy-preset': run(saveCurrentProxyQueryPreset()); break;
                case 'manage-proxy-preset-pins': run(manageProxyPresetPinnedKeys()); break;
                case 'manage-proxy-signer-key': run(manageProxyPresetSignerKey()); break;
                case 'manage-proxy-replay-route-map': run(manageProxyReplayRouteMap()); break;
                case 'apply-proxy-replay-mitigation': run(applyProxyReplayMitigationHint()); break;
                case 'apply-proxy-issuer-remediation': run(applyProxyIssuerTemplateRemediationHint()); break;
                case 'apply-proxy-issuer-policy-template': run(applyProxyIssuerPolicyTemplate(actionArg)); break;
                case 'export-proxy-policy-drift-audit': run(exportProxyPresetPolicyDriftAudit()); break;
                case 'export-proxy-preset-provenance': run(exportProxyPresetProvenanceDiff()); break;
                case 'export-proxy-trust-gate-audit': run(exportProxyTrustGateExceptionAudit()); break;
                case 'export-proxy-replay-route-drift': run(exportProxyReplayRouteDriftAudit()); break;
                case 'export-proxy-trust-explainability': run(exportProxyTrustExplainabilityPack()); break;
                case 'export-proxy-mitigation-telemetry': run(exportProxyMitigationTelemetry()); break;
                case 'export-proxy-trust-mitigation-correlation': run(exportProxyTrustMitigationCorrelation()); break;
                case 'export-proxy-trust-mitigation-alerts': run(exportProxyTrustMitigationAlerts()); break;
                case 'clear-proxy-trust-mitigation-alerts': run(clearProxyTrustMitigationAlerts()); break;
                case 'export-proxy-query-presets': run(exportProxyQueryPresetSet()); break;
                case 'import-proxy-query-presets': run(importProxyQueryPresetSet()); break;
                case 'export-proxy-trend-snapshot': run(exportProxyFailTrendSnapshot()); break;
                case 'export-proxy-anomaly-rollup': run(exportProxyTrendAnomalyRollup()); break;
                case 'export-proxy-anomaly-replay': run(exportProxyTrendAnomalyReplay()); break;
                case 'import-proxy-anomaly-replay': run(importProxyTrendAnomalyReplay()); break;
                case 'import-proxy-trend-snapshot': run(importProxyFailTrendSnapshot()); break;
                case 'clear-proxy-filters': run(clearProxyFilters()); break;
                case 'snapshot-current-group': run(snapshotCurrentGroupBenchmark()); break;
                case 'save-proxy-settings': run(saveProxySettings()); break;
                case 'close-password-modal': run(closePasswordModal()); break;
                case 'submit-password': run(submitPassword()); break;
                case 'close-sub-edit-modal': run(closeSubEditModal()); break;
                case 'delete-subscription': run(deleteSubscription()); break;
                case 'save-subscription': run(saveSubscription()); break;
                case 'close-confirm': {
                    const res = actionArg === 'true' ? true : (actionArg === 'false' ? false : actionArg);
                    run(closeConfirm(res));
                    break;
                }
                case 'close-alert-modal': {
                    const m = document.getElementById('alertModal');
                    if (m) m.style.display = 'none';
                    break;
                }
                case 'close-rotated-logs-modal': run(closeRotatedLogsModal()); break;
                case 'close-settings': run(closeSettings()); break;
                case 'switch-settings-tab': run(switchSettingsTab(actionArg, actionEl)); break;
                case 'select-extension-folder': run(selectExtensionFolder()); break;
                case 'save-api-port': run(saveApiPort()); break;
                case 'save-sub-private-allowlist': run(saveSubscriptionPrivateAllowlist()); break;
                case 'open-api-docs': run(openApiDocs()); break;
                case 'copy-api-token': run(copyApiToken()); break;
                case 'select-data-directory': run(selectDataDirectory()); break;
                case 'reset-data-directory': run(resetDataDirectory()); break;
                case 'close-help': run(closeHelp()); break;
                case 'switch-help-tab': run(switchHelpTab(actionArg)); break;
                case 'close-input-modal': run(closeInputModal()); break;
                case 'submit-input-modal': run(submitInputModal()); break;
                case 'navigate': run(navigateTo(actionArg)); break;
                case 'batch-import-profiles': run(importData()); break;
                default: return;
            }
        } catch (e) {
            console.error('data-action handler failed:', e);
        }
    });
}

function ensureSettingsInputEventsBound() {
    if (__settingsInputEventsBound) return;
    __settingsInputEventsBound = true;

    const bindChangeById = (id, handler) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', (ev) => {
            try {
                handler(ev.target);
            } catch (e) {
                console.error('settings change handler failed:', id, e);
            }
        });
    };

    bindChangeById('defaultProxyConsistency', (target) => {
        const mode = target && typeof target.value === 'string' ? target.value : 'warn';
        saveDefaultProxyConsistency(mode);
    });

    ['enableSystemProxy', 'enableRemoteDebugging', 'enableCustomArgs', 'enableApiServer'].forEach((id) => {
        bindChangeById(id, (target) => {
            if (target) handleDevToggle(target);
        });
    });

    document.querySelectorAll('input[name="watermarkStyle"]').forEach((radio) => {
        radio.addEventListener('change', (ev) => {
            const target = ev.target;
            if (!target || !target.value) return;
            saveWatermarkStyle(target.value);
        });
    });

    document.querySelectorAll('[data-watermark-option]').forEach((optionEl) => {
        const restoreBorder = () => {
            const radio = optionEl.querySelector('input[name="watermarkStyle"]');
            optionEl.style.borderColor = (radio && radio.checked) ? 'var(--accent)' : 'var(--border)';
        };
        optionEl.addEventListener('mouseenter', () => {
            optionEl.style.borderColor = 'var(--accent)';
        });
        optionEl.addEventListener('mouseleave', restoreBorder);
        optionEl.addEventListener('focusin', () => {
            optionEl.style.borderColor = 'var(--accent)';
        });
        optionEl.addEventListener('focusout', restoreBorder);
    });
}

function setViewModeIcon(mode) {
    const svg = document.getElementById('viewIcon');
    if (!svg) return;
    const ns = 'http://www.w3.org/2000/svg';
    svg.textContent = '';

    if (mode === 'grid') {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', 'M3 10h18M3 14h18M3 18h18M3 6h18');
        p.setAttribute('stroke-width', '2');
        svg.appendChild(p);
        return;
    }

    const rects = [
        { x: 3, y: 3 },
        { x: 14, y: 3 },
        { x: 14, y: 14 },
        { x: 3, y: 14 }
    ];
    rects.forEach(({ x, y }) => {
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', String(x));
        r.setAttribute('y', String(y));
        r.setAttribute('width', '7');
        r.setAttribute('height', '7');
        svg.appendChild(r);
    });
}

function renderProfileListEmptyState(listEl, msg) {
    if (!listEl) return;
    listEl.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'empty-state';

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');

    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '7');
    circle.setAttribute('r', '4');

    svg.appendChild(path);
    svg.appendChild(circle);

    const text = document.createElement('div');
    text.className = 'empty-state-text';
    text.textContent = String(msg ?? '');

    wrap.appendChild(svg);
    wrap.appendChild(text);
    listEl.appendChild(wrap);
}

/* =========================================================
   Sidebar Navigation
   ========================================================= */
let currentPage = 'profiles';

function navigateTo(page) {
    if (!page || page === currentPage) return;
    currentPage = page;

    // Toggle page visibility
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.remove('hidden');

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update topbar title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        const activeItem = document.querySelector('.sidebar-item[data-page="' + page + '"] .nav-label');
        if (activeItem) {
            titleEl.textContent = activeItem.textContent;
        }
    }

    // Load page-specific data
    switch (page) {
        case 'profiles':
            loadProfiles();
            break;
        case 'proxies':
            openProxyPage();
            break;
        case 'trash':
            loadTrashBin();
            break;
        case 'groups':
            loadGroupsPage();
            break;
        case 'apps':
            loadAppsPage();
            break;
    }
}


// =========================================================
// Proxy Page — Inline Table Redesign
// =========================================================
let currentProxyPageExpandedId = null;
let proxyPageEventsBound = false;

function openProxyPage() {
    proxyListViewState = loadProxyListViewState();
    renderProxyPageGroupTabs();
    renderProxyPageTable();
    ensureProxyPageEventsBound();
}

function renderProxyPageGroupTabs() {
    const container = document.getElementById('proxyPageGroupTabs');
    if (!container) return;
    container.textContent = '';
    const manualBtn = document.createElement('button');
    manualBtn.className = `proxy-page-group-tab ${currentProxyGroup === 'manual' ? 'active' : ''}`;
    manualBtn.textContent = t('groupManual') || 'Manual';
    manualBtn.setAttribute('data-action', 'proxy-page-switch-group');
    manualBtn.setAttribute('data-action-arg', 'manual');
    container.appendChild(manualBtn);
    (globalSettings.subscriptions || []).forEach(sub => {
        const btn = document.createElement('button');
        btn.className = `proxy-page-group-tab ${currentProxyGroup === sub.id ? 'active' : ''}`;
        btn.textContent = sub.name || tText('proxySubDefaultShort', 'Sub');
        btn.setAttribute('data-action', 'proxy-page-switch-group');
        btn.setAttribute('data-action-arg', sub.id);
        container.appendChild(btn);
    });
}

function extractProxyAddress(url) {
    if (!url || typeof url !== 'string') return '-';
    try {
        if (url.startsWith('vmess://')) {
            const b64 = url.replace('vmess://', '');
            const json = decodeBase64Content(b64);
            const cfg = JSON.parse(json);
            return `${cfg.add || '?'}:${cfg.port || '?'}`;
        }
        const match = url.match(/@([^/?#]+)/);
        if (match) return match[1];
        const hostMatch = url.match(/:\/\/([^/?#]+)/);
        if (hostMatch) return hostMatch[1];
    } catch (e) { }
    return '-';
}

function renderProxyPageTable() {
    const tbody = document.getElementById('proxyPageTableBody');
    const emptyEl = document.getElementById('proxyPageListEmpty');
    if (!tbody) return;

    const allNodes = (globalSettings.preProxies || []).filter(p => {
        if (currentProxyGroup === 'manual') return !p.groupId || p.groupId === 'manual';
        return p.groupId === currentProxyGroup;
    });
    const isManual = currentProxyGroup === 'manual';
    const useSingleMode = globalSettings.mode === 'single';

    // Sync view state from page controls
    syncProxyPageViewState();

    const filtered = applyProxyListFilterAndSort(allNodes);
    const metrics = computeProxyGroupMetrics(allNodes);
    updateProxyPageFilterCounts(metrics);

    tbody.textContent = '';
    if (filtered.length === 0) {
        if (emptyEl) {
            emptyEl.style.display = '';
            emptyEl.textContent = allNodes.length === 0
                ? (t('proxyEmptyHint') || 'No proxies yet. Click "+ Add" to add one.')
                : (t('proxyFilterEmpty') || 'No proxies match current filter.');
        }
        const tableWrap = tbody.closest('.profile-table-wrap');
        if (tableWrap) tableWrap.style.display = 'none';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    const tableWrap = tbody.closest('.profile-table-wrap');
    if (tableWrap) tableWrap.style.display = '';

    filtered.forEach((node, idx) => {
        const proxyId = String(node.id || '');
        const isExpanded = currentProxyPageExpandedId === proxyId;
        const isSelected = globalSettings.selectedId === proxyId;
        const statusTag = getNodeStatusTag(node);
        const protocol = getProxyNodeProtocol(node);
        const address = extractProxyAddress(node.url);
        const remark = getProxyNodeDisplayRemark(node);
        const latency = Number(node.latency);
        const latencyOk = Number.isFinite(latency) && latency > 0 && latency < 9000;

        // Main row
        const tr = document.createElement('tr');
        tr.className = `proxy-page-row${isExpanded ? ' is-expanded' : ''}`;
        tr.setAttribute('data-proxy-id', proxyId);

        // 1. Checkbox/Radio
        const tdSel = document.createElement('td');
        if (useSingleMode) {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'proxyPageSelect';
            radio.className = 'row-checkbox';
            radio.checked = isSelected;
            radio.setAttribute('data-proxy-id', proxyId);
            tdSel.appendChild(radio);
        } else {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'row-checkbox';
            cb.checked = Boolean(node.enable);
            cb.setAttribute('data-proxy-id', proxyId);
            tdSel.appendChild(cb);
        }
        tr.appendChild(tdSel);

        // 2. Index
        const tdIdx = document.createElement('td');
        tdIdx.textContent = String(idx + 1);
        tr.appendChild(tdIdx);

        // 3. Name
        const tdName = document.createElement('td');
        const nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = '600';
        nameSpan.textContent = remark;
        tdName.appendChild(nameSpan);
        tr.appendChild(tdName);

        // 4. Protocol
        const tdProto = document.createElement('td');
        const protoSpan = document.createElement('span');
        protoSpan.className = 'proxy-page-proto';
        protoSpan.textContent = protocol;
        tdProto.appendChild(protoSpan);
        tr.appendChild(tdProto);

        // 5. Address
        const tdAddr = document.createElement('td');
        const addrSpan = document.createElement('span');
        addrSpan.className = 'proxy-page-addr';
        addrSpan.textContent = address;
        addrSpan.title = address;
        tdAddr.appendChild(addrSpan);
        tr.appendChild(tdAddr);

        // 6. Status
        const tdStatus = document.createElement('td');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'status-cell';
        statusDiv.style.display = 'flex';
        statusDiv.style.alignItems = 'center';
        statusDiv.style.gap = '6px';
        const dot = document.createElement('span');
        dot.className = `proxy-page-status-dot ${statusTag}`;
        statusDiv.appendChild(dot);
        const statusLabel = document.createElement('span');
        statusLabel.textContent = statusTag.toUpperCase();
        statusLabel.style.fontSize = '11px';
        statusDiv.appendChild(statusLabel);
        tdStatus.appendChild(statusDiv);
        tr.appendChild(tdStatus);

        // 7. Latency
        const tdLat = document.createElement('td');
        const latSpan = document.createElement('span');
        latSpan.className = 'proxy-page-latency';
        if (latencyOk) {
            latSpan.textContent = `${latency}ms`;
            latSpan.classList.add(latency < 300 ? 'good' : latency < 800 ? 'mid' : 'bad');
        } else {
            latSpan.textContent = '-';
        }
        tdLat.appendChild(latSpan);
        tr.appendChild(tdLat);

        // 8. Actions
        const tdAct = document.createElement('td');
        const actDiv = document.createElement('div');
        actDiv.className = 'actions-cell';

        const testBtn = document.createElement('button');
        testBtn.className = 'action-btn';
        testBtn.textContent = 'Test';
        testBtn.setAttribute('data-role', 'proxy-page-test');
        testBtn.setAttribute('data-proxy-id', proxyId);
        actDiv.appendChild(testBtn);

        if (isManual) {
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn';
            editBtn.textContent = 'Edit';
            editBtn.setAttribute('data-role', 'proxy-page-edit');
            editBtn.setAttribute('data-proxy-id', proxyId);
            actDiv.appendChild(editBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn danger';
        delBtn.textContent = 'Del';
        delBtn.setAttribute('data-role', 'proxy-page-del');
        delBtn.setAttribute('data-proxy-id', proxyId);
        actDiv.appendChild(delBtn);

        tdAct.appendChild(actDiv);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);

        // Expand row
        const expandTr = document.createElement('tr');
        expandTr.className = `proxy-page-expand-row${isExpanded ? ' is-open' : ''}`;
        expandTr.setAttribute('data-expand-for', proxyId);
        const expandTd = document.createElement('td');
        expandTd.colSpan = 8;
        if (isExpanded) {
            expandTd.appendChild(buildProxyPageDetail(node));
        }
        expandTr.appendChild(expandTd);
        tbody.appendChild(expandTr);
    });
}

function buildProxyPageDetail(node) {
    const detail = document.createElement('div');
    detail.className = 'proxy-page-detail';

    // Proxy URL
    addDetailField(detail, 'Proxy Link', node.url || '-', true, true);

    // Test result info
    const testResult = getProxyTestResultForNode(node);
    if (testResult) {
        addDetailField(detail, 'Status', testResult.ok ? 'PASS' : `FAIL — ${testResult.finalCode || testResult.code || 'UNKNOWN'}`);
        if (Number.isFinite(testResult.durationMs)) {
            addDetailField(detail, 'Duration', formatDurationText(testResult.durationMs));
        }
        if (testResult.engine) {
            addDetailField(detail, 'Engine', testResult.engine);
        }
        if (testResult.error) {
            addDetailField(detail, 'Error', testResult.error, true);
        }
    }

    // IP info
    if (node.ipInfo) {
        if (node.ipInfo.ip) addDetailField(detail, 'IP', node.ipInfo.ip);
        if (node.ipInfo.country) addDetailField(detail, 'Country', node.ipInfo.country);
        if (node.ipInfo.city) addDetailField(detail, 'City', node.ipInfo.city);
        if (node.ipInfo.timezone) addDetailField(detail, 'Timezone', node.ipInfo.timezone);
    }

    // Steps
    if (testResult && Array.isArray(testResult.steps) && testResult.steps.length > 0) {
        const stepsWrap = document.createElement('div');
        stepsWrap.className = 'proxy-page-detail-steps';
        const stepsLabel = document.createElement('div');
        stepsLabel.className = 'proxy-page-detail-label';
        stepsLabel.textContent = 'TEST STEPS';
        stepsWrap.appendChild(stepsLabel);
        testResult.steps.forEach(step => {
            const row = document.createElement('div');
            row.className = 'proxy-page-detail-step';
            const st = document.createElement('span');
            st.className = `step-status ${step.ok ? 'ok' : 'fail'}`;
            st.textContent = step.ok ? 'OK' : 'FAIL';
            row.appendChild(st);
            const nm = document.createElement('span');
            nm.className = 'step-name';
            nm.textContent = step.name || step.step || '-';
            row.appendChild(nm);
            if (Number.isFinite(step.durationMs)) {
                const dur = document.createElement('span');
                dur.className = 'step-dur';
                dur.textContent = formatDurationText(step.durationMs);
                row.appendChild(dur);
            }
            stepsWrap.appendChild(row);
        });
        detail.appendChild(stepsWrap);
    }

    return detail;
}

function addDetailField(parent, label, value, isFull, isMono) {
    const section = document.createElement('div');
    section.className = 'proxy-page-detail-section' + (isFull ? ' proxy-page-detail-full' : '');
    const lbl = document.createElement('div');
    lbl.className = 'proxy-page-detail-label';
    lbl.textContent = label;
    section.appendChild(lbl);
    const val = document.createElement('div');
    val.className = 'proxy-page-detail-value' + (isMono ? ' mono' : '');
    val.textContent = String(value || '-');
    section.appendChild(val);
    parent.appendChild(section);
}

function ensureProxyPageEventsBound() {
    if (proxyPageEventsBound) return;
    proxyPageEventsBound = true;
    if (isClickDebugEnabled()) console.log('[click-debug] proxy page events bound');

    const tbody = document.getElementById('proxyPageTableBody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            logClickDebug('proxy-page-click', e);
            let target = e && e.target ? e.target : null;
            if (target && target.nodeType === 3) target = target.parentElement; // Text node -> Element
            if (!(target instanceof Element)) return;

            // Action buttons
            const actionBtn = target.closest('[data-role][data-proxy-id]');
            if (actionBtn) {
                const role = actionBtn.getAttribute('data-role');
                const proxyId = actionBtn.getAttribute('data-proxy-id');
                logClickDebug('proxy-page-action', e, { actionEl: actionBtn, role, proxyId });
                e.stopPropagation();
                if (role === 'proxy-page-test') {
                    actionBtn.textContent = '...';
                    testSingleProxy(proxyId, actionBtn);
                } else if (role === 'proxy-page-edit') {
                    openProxyPageEditPanel(proxyId);
                } else if (role === 'proxy-page-del') {
                    confirmDeleteProxyNode(proxyId);
                }
                return;
            }

            // Checkbox/radio click
            const checkbox = target.matches('input.row-checkbox')
                ? target
                : target.closest('input.row-checkbox');
            if (checkbox) {
                const pid = checkbox.getAttribute('data-proxy-id');
                if (!pid) return;
                if (checkbox.type === 'radio') {
                    selP(pid);
                } else {
                    togP(pid);
                }
                return;
            }

            // Row click -> expand/collapse
            const row = target.closest('.proxy-page-row');
            if (row) {
                const pid = row.getAttribute('data-proxy-id');
                if (pid) {
                    currentProxyPageExpandedId = currentProxyPageExpandedId === pid ? null : pid;
                    renderProxyPageTable();
                }
            }
        });
    }

    // Search
    const searchInput = document.getElementById('proxyPageSearchInput');
    if (searchInput) {
        let debounce = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                proxyListViewState.search = searchInput.value;
                persistProxyListViewState();
                renderProxyPageTable();
            }, 200);
        });
    }

    // Sort
    const sortSelect = document.getElementById('proxyPageSortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            proxyListViewState.sort = sortSelect.value;
            persistProxyListViewState();
            renderProxyPageTable();
        });
    }
}

function syncProxyPageViewState() {
    const searchInput = document.getElementById('proxyPageSearchInput');
    const sortSelect = document.getElementById('proxyPageSortBy');
    if (searchInput && searchInput.value !== (proxyListViewState.search || '')) {
        searchInput.value = proxyListViewState.search || '';
    }
    if (sortSelect && sortSelect.value !== (proxyListViewState.sort || 'default')) {
        sortSelect.value = proxyListViewState.sort || 'default';
    }
}

function updateProxyPageFilterCounts(metrics) {
    const setCount = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
    };
    setCount('proxyPageCountAll', metrics.total);
    setCount('proxyPageCountPass', metrics.pass);
    setCount('proxyPageCountFail', metrics.fail);
    setCount('proxyPageCountWait', metrics.waiting);
}

function openProxyPageAddPanel() {
    const panel = document.getElementById('proxyPageAddPanel');
    if (!panel) return;
    panel.style.display = '';
    document.getElementById('proxyPageEditId').value = '';
    document.getElementById('proxyPageNewRemark').value = '';
    document.getElementById('proxyPageNewUrl').value = '';
    const btn = document.getElementById('proxyPageBtnSave');
    if (btn) btn.textContent = t('add') || 'Add';
    const urlInput = document.getElementById('proxyPageNewUrl');
    if (urlInput) urlInput.focus();
}

function closeProxyPageAddPanel() {
    const panel = document.getElementById('proxyPageAddPanel');
    if (panel) panel.style.display = 'none';
}

function openProxyPageEditPanel(proxyId) {
    const p = (globalSettings.preProxies || []).find(x => x.id === proxyId);
    if (!p) return;
    const panel = document.getElementById('proxyPageAddPanel');
    if (!panel) return;
    panel.style.display = '';
    document.getElementById('proxyPageEditId').value = p.id;
    document.getElementById('proxyPageNewRemark').value = p.remark || '';
    document.getElementById('proxyPageNewUrl').value = p.url || '';
    const btn = document.getElementById('proxyPageBtnSave');
    if (btn) btn.textContent = t('save') || 'Save';
    const urlInput = document.getElementById('proxyPageNewUrl');
    if (urlInput) urlInput.focus();
}

async function saveProxyPageNode() {
    const id = document.getElementById('proxyPageEditId').value;
    let remark = document.getElementById('proxyPageNewRemark').value;
    const url = document.getElementById('proxyPageNewUrl').value.trim();
    if (!url) return;
    if (!remark) remark = getProxyRemark(url) || tText('proxyManualNodeFallback', 'Manual Node');
    if (!globalSettings.preProxies) globalSettings.preProxies = [];
    if (id) {
        const idx = globalSettings.preProxies.findIndex(x => x.id === id);
        if (idx > -1) {
            globalSettings.preProxies[idx].remark = remark;
            globalSettings.preProxies[idx].url = url;
        }
    } else {
        globalSettings.preProxies.push({
            id: Date.now().toString(),
            remark,
            url,
            enable: true,
            groupId: 'manual',
        });
    }
    closeProxyPageAddPanel();
    renderProxyPageTable();
    await window.electronAPI.saveSettings(globalSettings);
}

function switchProxyPageGroup(groupId) {
    currentProxyGroup = groupId || 'manual';
    currentProxyPageExpandedId = null;
    renderProxyPageGroupTabs();
    renderProxyPageTable();
}

function setProxyPageStatusFilter(statusTag) {
    proxyListViewState.status = statusTag || 'all';
    persistProxyListViewState();
    // Update chip active states
    const container = document.getElementById('proxyPageQuickFilters');
    if (container) {
        container.querySelectorAll('.profile-filter-chip').forEach(chip => {
            const arg = chip.getAttribute('data-action-arg');
            const isActive = arg === statusTag;
            chip.classList.toggle('active', isActive);
            chip.setAttribute('aria-pressed', String(isActive));
        });
    }
    renderProxyPageTable();
}


function loadTrashBin() {
    // placeholder - can be expanded when backend supports listing trash
    const el = document.getElementById('trashContent');
    if (!el) return;
    // For now just show the empty state
}

function loadGroupsPage() {
    // Build group list from profile tags
    const groupList = document.getElementById('groupList');
    if (!groupList) return;
    while (groupList.firstChild) groupList.removeChild(groupList.firstChild);

    if (!Array.isArray(window.__cachedProfiles)) return;

    const tagMap = {};
    window.__cachedProfiles.forEach(p => {
        let rawTags = [];
        if (Array.isArray(p.tags)) rawTags = p.tags;
        else if (typeof p.tags === 'string') rawTags = p.tags.split(',');
        const tags = rawTags.map(t => String(t || '').trim()).filter(Boolean);
        tags.forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = 0;
            tagMap[tag]++;
        });
    });

    const sorted = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center; padding:40px; color:var(--text-secondary);';
        empty.textContent = 'No groups found. Add tags to your profiles.';
        groupList.appendChild(empty);
        return;
    }

    sorted.forEach(([tag, count]) => {
        const item = document.createElement('div');
        item.className = 'group-item';
        const nameEl = document.createElement('span');
        nameEl.className = 'group-name';
        nameEl.textContent = tag;
        const countEl = document.createElement('span');
        countEl.className = 'group-count';
        countEl.textContent = count + ' profiles';
        item.appendChild(nameEl);
        item.appendChild(countEl);
        item.addEventListener('click', () => {
            // Navigate back to profiles filtered by this tag
            navigateTo('profiles');
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = tag;
                filterProfiles(tag);
            }
        });
        groupList.appendChild(item);
    });
}

function loadAppsPage() {
    // Show installed extensions from settings
    const grid = document.getElementById('appGrid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    if (!globalSettings || !Array.isArray(globalSettings.extensions) || globalSettings.extensions.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center; padding:40px; color:var(--text-secondary); grid-column:1/-1;';
        empty.textContent = 'No extensions installed. Add extensions in Settings.';
        grid.appendChild(empty);
        return;
    }

    globalSettings.extensions.forEach(ext => {
        const card = document.createElement('div');
        card.className = 'app-card';
        const name = document.createElement('div');
        name.className = 'app-name';
        name.textContent = ext.name || ext.path || 'Extension';
        const desc = document.createElement('div');
        desc.className = 'app-desc';
        desc.textContent = ext.path || '';
        card.appendChild(name);
        card.appendChild(desc);
        grid.appendChild(card);
    });
}

async function init() {
    ensureGlobalActionEventsBound();
    hoistGlobalModalsToBody();
    ensureSettingsInputEventsBound();
    ensureAddProxySourceEventsBound();
    proxyCustomQueryPresets = loadProxyCustomQueryPresets();
    proxyPresetTrustPolicy = loadProxyPresetTrustPolicy();
    proxyPresetPinnedKeys = loadProxyPresetPinnedKeys();
    proxyPresetSignerKeyId = loadProxyPresetSignerKeyId();
    proxyPresetIssuerTemplate = loadProxyPresetIssuerTemplate();
    proxyReplayImportRouteMode = loadProxyReplayImportRouteMode();
    proxyReplayRouteMap = loadProxyReplayRouteMap();
    proxyIssuerTemplateRemediationHint = loadProxyIssuerTemplateRemediationHint();
    proxyTrustExplainabilityPack = loadProxyTrustExplainabilityPack();
    proxyListViewState = loadProxyListViewState();
    proxyInspectorWidthPx = loadProxyInspectorWidthPx();
    proxyInspectorCollapsed = loadProxyInspectorCollapsedUiState();
    proxySidebarCollapsed = loadProxySidebarCollapsedState();
    proxySecondaryFiltersExpanded = loadProxySecondaryFiltersUiState();
    proxyAdvancedExpanded = loadProxyAdvancedUiState();
    proxyAdvancedView = loadProxyAdvancedViewState();
    proxyCognitiveMode = loadProxyCognitiveModeState();
    proxyDiagnosticsExpanded = loadProxyDiagnosticsUiState();
    proxyDiagnosticsDetailExpanded = loadProxyDiagnosticsDetailUiState();
    proxyInspectorStepsExpanded = loadProxyInspectorStepsUiState();
    proxyInspectorAttemptsExpanded = loadProxyInspectorAttemptsUiState();
    proxyCognitiveStateCache = loadProxyCognitiveStateCache();
    applyProxyModalLayoutMode();
    applyProxyInspectorCollapsedUiState();
    applyProxyInspectorSectionState();
    ensureProxyModalUiEventsBound();
    ensureCookieManagerEventsBound();
    renderProxyCustomPresetButtons();
    applyProxyPresetTrustPolicyToControl();
    applyProxyReplayImportRouteModeToControl();
    applyProxyListViewStateToControls();
    applyProxySecondaryFiltersUiState();
    applyProxyAdvancedPanelState();
    applyProxyAdvancedViewState();
    applyProxyDiagnosticsPanelState();
    setProxyCognitiveMode(proxyCognitiveMode, { silent: true });
    const savedTheme = localStorage.getItem('geekez_theme') || 'geek';
    setTheme(savedTheme);
    const themeSel = document.getElementById('themeSelect');
    if (themeSel) {
        themeSel.value = savedTheme;
        themeSel.addEventListener('change', (ev) => setTheme(ev.target.value));
    }
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (ev) => filterProfiles(ev.target.value || ''));
    }
    profileStatusFilter = normalizeProfileStatusFilter(localStorage.getItem(PROFILE_STATUS_FILTER_KEY) || profileStatusFilter);
    updateProfileFilterControls();

    const addProxyMode = document.getElementById('addProxyMode');
    if (addProxyMode) addProxyMode.addEventListener('change', () => updateProxyModeUi('add'));
    const editProxyMode = document.getElementById('editProxyMode');
    if (editProxyMode) editProxyMode.addEventListener('change', () => updateProxyModeUi('edit'));

    const exportSelectAll = document.getElementById('exportSelectAll');
    if (exportSelectAll) {
        exportSelectAll.addEventListener('change', () => toggleExportSelectAll());
    }
    const rotatedLogsSearch = document.getElementById('rotatedLogsSearch');
    if (rotatedLogsSearch) {
        rotatedLogsSearch.addEventListener('input', () => filterRotatedLogs());
    }
    const dismissSplash = () => {
        const s = document.getElementById('splash');
        if (!s) return;
        if (s.dataset && s.dataset.dismissed === 'true') return;
        if (s.dataset) s.dataset.dismissed = 'true';
        s.style.opacity = '0';
        s.style.pointerEvents = 'none';
        setTimeout(() => {
            try { s.remove(); } catch (e) { }
        }, 500);
    };
    const splashEl = document.getElementById('splash');
    if (splashEl) splashEl.addEventListener('click', dismissSplash);
    setTimeout(dismissSplash, 1500);

    globalSettings = await window.electronAPI.getSettings();
    if (!globalSettings.preProxies) globalSettings.preProxies = [];
    if (!globalSettings.subscriptions) globalSettings.subscriptions = [];

    document.getElementById('enablePreProxy').checked = globalSettings.enablePreProxy || false;
    document.getElementById('enablePreProxy').addEventListener('change', updateToolbar);
    let __statusRefreshTimer = null;
    window.electronAPI.onProfileStatus(({ id, status, errorCode, errorStage, errorMessage }) => {
        __lastStatus.set(id, status);
        if (status === 'stop_failed' || status === 'launch_failed') {
            __lastStatusErrorCode.set(id, errorCode || null);
            __lastStatusErrorStage.set(id, errorStage || null);
            __lastStatusErrorMessage.set(id, errorMessage || null);
        } else if (status === 'running' || status === 'stopped') {
            __lastStatusErrorCode.delete(id);
            __lastStatusErrorStage.delete(id);
            __lastStatusErrorMessage.delete(id);
        }
        const badge = document.getElementById(`status-${id}`);
        if (status === 'running') __restartState.delete(id);
        if (status === 'stopped' || status === 'stop_failed' || status === 'launch_failed') __restartState.delete(id);
        if (status === 'restarting' || status === 'starting' || status === 'stopping') __restartState.add(id);
        if (badge) {
            if (status === 'restarting' || status === 'starting' || status === 'stopping') {
                badge.className = 'running-badge active pending';
                badge.innerText = t('workingStatus') || 'Working...';
            } else if (status === 'launch_failed') {
                badge.className = 'running-badge active error';
                badge.innerText = t('launchFailedStatus') || 'Launch Failed';
            } else if (status === 'stop_failed') {
                badge.className = 'running-badge active error';
                badge.innerText = t('stopFailedStatus') || 'Stop Failed';
            } else if (status === 'running') {
                badge.className = 'running-badge active';
                badge.innerText = t('runningStatus') || 'Running';
            } else {
                badge.className = 'running-badge active idle';
                badge.innerText = t('idleStatus') || 'Idle';
            }
        }
        if ((status === 'stop_failed' || status === 'launch_failed') && errorCode) {
            const statusLabel = status === 'launch_failed'
                ? (t('launchFailedStatus') || 'Launch Failed')
                : (t('stopFailedStatus') || 'Stop Failed');
            const details = (errorMessage && String(errorMessage).trim())
                ? `: ${String(errorMessage).trim().slice(0, 100)}`
                : '';
            showToast(`${statusLabel} [${errorCode}]${details}`, 2200);
        }
        clearTimeout(__statusRefreshTimer);
        __statusRefreshTimer = setTimeout(() => loadProfiles(), 250);
    });
    if (window.electronAPI.onLeakCheckFinished) {
        window.electronAPI.onLeakCheckFinished(() => loadProfiles());
    }

    // API event listeners for remote refresh and launch
    window.electronAPI.onRefreshProfiles(() => {
        console.log('API triggered profile refresh');
        loadProfiles();
    });

    window.electronAPI.onApiLaunchProfile((id) => {
        console.log('API triggered launch for:', id);
        launch(id);
    });

    if (window.electronAPI.onProxyConsistencyWarning) {
        window.electronAPI.onProxyConsistencyWarning((payload) => {
            try {
                const profileId = payload && payload.profileId ? payload.profileId : null;
                const issues = payload && payload.issues ? payload.issues : [];
                const details = formatConsistencyIssues(issues);
                const title = t('proxyMismatchTitle') || 'Proxy/Fingerprint mismatch detected';
                const desc = t('proxyMismatchDesc') || 'The current proxy geo does not match this profile fingerprint settings.';
                const msg = `${title}\n\n${desc}\n\n${details}`;

                showConfirmChoice(msg, {
                    okText: t('proxyMismatchActionProceed') || 'Proceed Anyway',
                    altText: t('proxyMismatchActionAutofix') || 'Auto-fix & Continue',
                    onAlt: async () => {
                        try {
                            const profiles = await window.electronAPI.getProfiles();
                            const p = profiles.find(x => x.id === profileId);
                            if (!p) return;
                            p.proxyPolicy = p.proxyPolicy || {};
                            p.proxyPolicy.autoLink = true;
                            p.proxyPolicy.consistencyPolicy = { enforce: true, onMismatch: 'autofix' };
                            p.proxyPolicy.allowAutofix = { geo: true, language: true };
                            await window.electronAPI.updateProfile(p);
                            await loadProfiles();
                            await launch(profileId);
                        } catch (e) {
                            showAlert('Error: ' + e.message);
                        }
                    },
                    onConfirm: async () => {
                        try {
                            const watermarkStyle = localStorage.getItem('geekez_watermark_style') || 'enhanced';
                            await window.electronAPI.launchProfile(profileId, watermarkStyle, { skipProxyWarnOnce: true });
                        } catch (e) {
                            showAlert('Error: ' + e.message);
                        }
                    },
                    onCancel: () => { }
                });
            } catch (e) {
                console.error('Failed to handle proxy-consistency-warning:', e);
            }
        });
    }

    // 核心修复：版本号注入
    const info = await window.electronAPI.invoke('get-app-info');
    const verSpan = document.getElementById('app-version');
    if (verSpan) verSpan.innerText = `v${info.version}`;

    checkSubscriptionUpdates();
    applyLang();

    // Load timezones after DOM is ready - Custom Dropdown
    if (typeof window.TIMEZONES !== 'undefined' && Array.isArray(window.TIMEZONES)) {
        initCustomTimezoneDropdown('addTimezone', 'addTimezoneDropdown');
        initCustomTimezoneDropdown('editTimezone', 'editTimezoneDropdown');
    }

    // Check for updates silently on startup
    checkUpdatesSilent();
}


async function checkSubscriptionUpdates() {
    const now = Date.now();
    let updated = false;
    for (const sub of globalSettings.subscriptions) {
        if (!sub.interval || sub.interval == '0') continue;
        const intervalMs = parseInt(sub.interval) * 3600 * 1000;
        if (now - (sub.lastUpdated || 0) > intervalMs) {
            await updateSubscriptionNodes(sub, { silent: true });
            updated = true;
        }
    }
    if (updated) await window.electronAPI.saveSettings(globalSettings);
}

function resolveXrayUpdateErrorMessage(errorCode, failureStage) {
    const normalizedCode = String(errorCode || '').trim().toUpperCase();
    switch (normalizedCode) {
        case 'XRAY_UPDATE_IN_PROGRESS':
            return tText('xrayUpdateErrInProgress', 'Another update is already running. Please wait and retry.');
        case 'XRAY_UPDATE_PROTOCOL_NOT_ALLOWED':
            return tText('xrayUpdateErrProtocolNotAllowed', 'Updater rejected a non-HTTPS download URL.');
        case 'XRAY_UPDATE_HOST_NOT_ALLOWED':
            return tText('xrayUpdateErrHostNotAllowed', 'Updater rejected a non-allowlisted download host.');
        case 'XRAY_UPDATE_HTTP_ERROR':
            return tText('xrayUpdateErrHttp', 'Download failed due to upstream HTTP error.');
        case 'XRAY_UPDATE_NETWORK_TIMEOUT':
            return tText('xrayUpdateErrTimeout', 'Download timed out. Check network and retry.');
        case 'XRAY_UPDATE_REDIRECT_LIMIT':
            return tText('xrayUpdateErrRedirectLimit', 'Download failed due to too many redirects.');
        case 'XRAY_UPDATE_PAYLOAD_TOO_LARGE':
            return tText('xrayUpdateErrPayloadTooLarge', 'Downloaded payload exceeds updater safety limits.');
        case 'XRAY_UPDATE_URL_INVALID':
            return tText('xrayUpdateErrUrlInvalid', 'Updater URL is invalid or failed validation.');
        case 'XRAY_UPDATE_DIGEST_MISMATCH':
            return tText('xrayUpdateErrDigestMismatch', 'Package integrity verification failed (sha256 mismatch).');
        case 'XRAY_UPDATE_DIGEST_VERIFY_FAILED':
            return tText('xrayUpdateErrDigestVerify', 'Failed to verify upstream digest file.');
        case 'XRAY_UPDATE_INVALID_ZIP':
            return tText('xrayUpdateErrInvalidZip', 'Downloaded package is not a valid zip file.');
        case 'XRAY_UPDATE_ZIP_EXTRACT_FAILED':
            return tText('xrayUpdateErrZipExtract', 'Failed to safely extract update package.');
        case 'XRAY_UPDATE_BINARY_NOT_FOUND':
            return tText('xrayUpdateErrBinaryNotFound', 'Xray binary was not found in update package.');
        case 'XRAY_UPDATE_BINARY_INVALID':
            return tText('xrayUpdateErrBinaryInvalid', 'Extracted Xray binary failed safety checks.');
        case 'XRAY_UPDATE_VERSION_MISMATCH':
            return tText('xrayUpdateErrVersionMismatch', 'Extracted Xray version does not match expected release.');
        case 'XRAY_UPDATE_DOWNGRADE_BLOCKED':
            return tText('xrayUpdateErrDowngradeBlocked', 'Update was blocked to prevent version downgrade.');
        case 'XRAY_UPDATE_INSTALL_FAILED':
            return tText('xrayUpdateErrInstallFailed', 'Failed to install Xray binary into target location.');
        case 'XRAY_UPDATE_RELEASE_RESOLVE_FAILED':
            return tText('xrayUpdateErrReleaseResolveFailed', 'Failed to resolve latest release metadata.');
        case 'XRAY_UPDATE_VERSION_GUARD_FAILED':
            return tText('xrayUpdateErrVersionGuardFailed', 'Version guard rejected this update candidate.');
        case 'XRAY_UPDATE_DOWNLOAD_FAILED':
            return tText('xrayUpdateErrDownloadFailed', 'Failed to download update package.');
        default:
            break;
    }
    const normalizedStage = String(failureStage || '').trim().toLowerCase();
    if (normalizedStage === 'verify_digest') {
        return tText('xrayUpdateErrDigestVerify', 'Failed to verify upstream digest file.');
    }
    if (normalizedStage === 'extract_zip') {
        return tText('xrayUpdateErrZipExtract', 'Failed to safely extract update package.');
    }
    return tText('updateError', 'Update failed');
}

function resolveXrayUpdateNextStepMessage(errorCode, failureStage) {
    const normalizedCode = String(errorCode || '').trim().toUpperCase();
    switch (normalizedCode) {
        case 'XRAY_UPDATE_IN_PROGRESS':
            return tText('xrayUpdateNextStepInProgress', 'Next step: wait for the current updater task to finish, then retry.');
        case 'XRAY_UPDATE_PROTOCOL_NOT_ALLOWED':
        case 'XRAY_UPDATE_HOST_NOT_ALLOWED':
        case 'XRAY_UPDATE_URL_INVALID':
            return tText('xrayUpdateNextStepUrlValidation', 'Next step: use official update source and retry from in-app update check.');
        case 'XRAY_UPDATE_HTTP_ERROR':
            return tText('xrayUpdateNextStepHttp', 'Next step: retry later or switch network route, then run update again.');
        case 'XRAY_UPDATE_NETWORK_TIMEOUT':
            return tText('xrayUpdateNextStepTimeout', 'Next step: verify network connectivity and retry update.');
        case 'XRAY_UPDATE_REDIRECT_LIMIT':
            return tText('xrayUpdateNextStepRedirect', 'Next step: check network/proxy redirect behavior and retry.');
        case 'XRAY_UPDATE_PAYLOAD_TOO_LARGE':
            return tText('xrayUpdateNextStepPayloadTooLarge', 'Next step: verify update package source and avoid oversized mirrored assets.');
        case 'XRAY_UPDATE_DIGEST_MISMATCH':
        case 'XRAY_UPDATE_DIGEST_VERIFY_FAILED':
            return tText('xrayUpdateNextStepDigest', 'Next step: retry with stable network; if still failing, verify upstream release integrity.');
        case 'XRAY_UPDATE_INVALID_ZIP':
        case 'XRAY_UPDATE_ZIP_EXTRACT_FAILED':
            return tText('xrayUpdateNextStepZip', 'Next step: clear temp update files and retry download/extract.');
        case 'XRAY_UPDATE_BINARY_NOT_FOUND':
        case 'XRAY_UPDATE_BINARY_INVALID':
            return tText('xrayUpdateNextStepBinary', 'Next step: retry update; if repeated, report issue with update package details.');
        case 'XRAY_UPDATE_VERSION_MISMATCH':
        case 'XRAY_UPDATE_VERSION_GUARD_FAILED':
        case 'XRAY_UPDATE_DOWNGRADE_BLOCKED':
            return tText('xrayUpdateNextStepVersion', 'Next step: keep current version and retry after upstream release metadata stabilizes.');
        case 'XRAY_UPDATE_INSTALL_FAILED':
            return tText('xrayUpdateNextStepInstall', 'Next step: ensure write permission for install directory, then retry.');
        case 'XRAY_UPDATE_RELEASE_RESOLVE_FAILED':
        case 'XRAY_UPDATE_DOWNLOAD_FAILED':
            return tText('xrayUpdateNextStepDownload', 'Next step: retry update check later or switch to a stable network route.');
        default:
            break;
    }
    const normalizedStage = String(failureStage || '').trim().toLowerCase();
    if (normalizedStage === 'verify_digest') {
        return tText('xrayUpdateNextStepDigest', 'Next step: retry with stable network; if still failing, verify upstream release integrity.');
    }
    if (normalizedStage === 'extract_zip') {
        return tText('xrayUpdateNextStepZip', 'Next step: clear temp update files and retry download/extract.');
    }
    return tText('xrayUpdateNextStepGeneric', 'Next step: retry update in a stable network environment.');
}

function resolveXrayUpdateMetadataHint(updatePayload) {
    if (!updatePayload || typeof updatePayload !== 'object') return '';
    const metadataStatus = String(updatePayload.metadataFetchStatus || '').trim().toLowerCase();
    if (!metadataStatus || metadataStatus === 'ok') return '';
    const metadataRoute = String(updatePayload.metadataFetchRoute || '').trim().toLowerCase() || 'unknown';
    const metadataFailureRoute = String(updatePayload.metadataFetchFailureRoute || '').trim().toLowerCase() || 'unknown';
    const metadataRouteHost = String(updatePayload.metadataFetchRouteHost || '').trim().toLowerCase() || 'unknown';
    const metadataFailureHost = String(updatePayload.metadataFetchFailureHost || '').trim().toLowerCase() || 'unknown';
    const metadataCode = String(updatePayload.metadataFetchErrorCode || '').trim().toLowerCase() || 'none';
    const metadataHost = (() => {
        if (metadataRouteHost !== 'unknown' && metadataRouteHost !== 'none') return metadataRouteHost;
        if (metadataFailureHost !== 'unknown' && metadataFailureHost !== 'none') return metadataFailureHost;
        return 'unknown';
    })();
    const metadataHttpStatus = Number.isInteger(updatePayload.metadataFetchHttpStatus)
        ? updatePayload.metadataFetchHttpStatus
        : null;
    const metadataAttemptCount = Number.isInteger(updatePayload.metadataFetchAttemptCount)
        ? updatePayload.metadataFetchAttemptCount
        : null;
    const retryable = typeof updatePayload.metadataFetchErrorRetryable === 'boolean'
        ? (updatePayload.metadataFetchErrorRetryable ? 'yes' : 'no')
        : 'unknown';
    if (metadataStatus === 'manifest_missing') {
        return tText('xrayUpdateMetaHintManifestMissing', 'Metadata hint: release metadata is incomplete; updater used fallback derivation checks.');
    }
    if (metadataStatus === 'fetch_error') {
        const fallbackUsed = updatePayload.metadataFetchFallbackUsed ? 'used' : 'not_used';
        const baseHint = tFormat(
            'xrayUpdateMetaHintFetchError',
            'Metadata hint: route={route}, host={host}, code={code}, http={http}, attempts={attempts}, retryable={retryable}, fallback={fallback}.',
            {
                route: metadataRoute,
                host: metadataHost,
                code: metadataCode,
                http: metadataHttpStatus === null ? 'none' : String(metadataHttpStatus),
                attempts: metadataAttemptCount === null ? 'unknown' : String(metadataAttemptCount),
                retryable,
                fallback: fallbackUsed,
            }
        );
        const routeSuggestion = (() => {
            const fallbackAttempted = !!updatePayload.metadataFetchFallbackAttempted;
            const fallbackResult = String(updatePayload.metadataFetchFallbackResult || '').trim().toLowerCase();
            const attemptFlow = String(updatePayload.metadataFetchAttemptFlow || '').trim().toLowerCase();
            const retryableError = typeof updatePayload.metadataFetchErrorRetryable === 'boolean'
                ? updatePayload.metadataFetchErrorRetryable
                : null;
            const metadataRouteForHint = (metadataRoute === 'direct' || metadataRoute === 'proxy')
                ? metadataRoute
                : ((metadataFailureRoute === 'direct' || metadataFailureRoute === 'proxy') ? metadataFailureRoute : 'unknown');
            if (fallbackAttempted && fallbackResult === 'failed') {
                return tText('xrayUpdateMetaRouteHintBothFailed', 'Route hint: both direct and proxy metadata routes failed. Retry later.');
            }
            if (fallbackAttempted && fallbackResult === 'succeeded') {
                return tText('xrayUpdateMetaRouteHintFallbackSucceeded', 'Route hint: fallback metadata route succeeded; keep this route for retries.');
            }
            if (retryableError === false) {
                return tText('xrayUpdateMetaRouteHintNonRetryable', 'Route hint: metadata error is non-retryable; wait and retry later.');
            }
            if (retryableError === true && metadataRouteForHint === 'direct') {
                return tText('xrayUpdateMetaRouteHintTryProxy', 'Route hint: try proxy metadata route on next retry.');
            }
            if (retryableError === true && metadataRouteForHint === 'proxy') {
                return tText('xrayUpdateMetaRouteHintTryDirect', 'Route hint: try direct metadata route on next retry.');
            }
            if (retryableError === true && metadataRouteForHint === 'unknown' && attemptFlow === 'direct_only') {
                return tText('xrayUpdateMetaRouteHintTryProxy', 'Route hint: try proxy metadata route on next retry.');
            }
            if (retryableError === true && metadataRouteForHint === 'unknown' && attemptFlow === 'direct_then_proxy') {
                return tText('xrayUpdateMetaRouteHintFlowAmbiguous', 'Route hint: metadata attempt flow is ambiguous; retry update check later.');
            }
            return '';
        })();
        if (routeSuggestion) return `${baseHint} ${routeSuggestion}`;
        return baseHint;
    }
    if (metadataStatus && metadataStatus !== 'manifest_missing' && metadataStatus !== 'fetch_error') {
        return tFormat(
            'xrayUpdateMetaHintUnknownStatus',
            'Metadata hint: status={status}, route={route}, host={host}, http={http}, attempts={attempts}.',
            {
                status: metadataStatus,
                route: metadataRoute,
                host: metadataHost,
                http: metadataHttpStatus === null ? 'none' : String(metadataHttpStatus),
                attempts: metadataAttemptCount === null ? 'unknown' : String(metadataAttemptCount),
            }
        );
    }
    return '';
}

function resolveXrayUpdateMetadataSeverity(updatePayload) {
    if (!updatePayload || typeof updatePayload !== 'object') return 'info';
    const metadataStatus = String(updatePayload.metadataFetchStatus || '').trim().toLowerCase();
    if (!metadataStatus || metadataStatus === 'ok') return 'info';
    if (metadataStatus === 'manifest_missing') return 'info';
    if (metadataStatus !== 'fetch_error') return 'warn';
    const fallbackAttempted = !!updatePayload.metadataFetchFallbackAttempted;
    const fallbackResult = String(updatePayload.metadataFetchFallbackResult || '').trim().toLowerCase();
    const retryableError = typeof updatePayload.metadataFetchErrorRetryable === 'boolean'
        ? updatePayload.metadataFetchErrorRetryable
        : null;
    if (fallbackAttempted && fallbackResult === 'failed') return 'block';
    if (fallbackAttempted && fallbackResult === 'succeeded') return 'info';
    if (retryableError === false) return 'block';
    if (retryableError === true) return 'warn';
    return 'warn';
}

function formatXrayUpdateMetadataHint(updatePayload) {
    const hint = resolveXrayUpdateMetadataHint(updatePayload);
    if (!hint) return '';
    const severity = resolveXrayUpdateMetadataSeverity(updatePayload);
    const severityLabel = (() => {
        if (severity === 'block') return tText('xrayUpdateMetaSeverityBlock', '[block]');
        if (severity === 'warn') return tText('xrayUpdateMetaSeverityWarn', '[warn]');
        return tText('xrayUpdateMetaSeverityInfo', '[info]');
    })();
    return `${severityLabel} ${hint}`;
}

function composeXrayUpdateErrorMessage(updatePayload) {
    const errorCode = updatePayload && typeof updatePayload.errorCode === 'string'
        ? updatePayload.errorCode.trim().toUpperCase()
        : '';
    const failureStage = updatePayload && typeof updatePayload.failureStage === 'string'
        ? updatePayload.failureStage.trim()
        : '';
    const rawError = updatePayload && typeof updatePayload.error === 'string'
        ? updatePayload.error.trim()
        : '';
    const headline = resolveXrayUpdateErrorMessage(errorCode, failureStage);
    const nextStep = resolveXrayUpdateNextStepMessage(errorCode, failureStage);
    const metadataHint = formatXrayUpdateMetadataHint(updatePayload);
    const metaTokens = [];
    if (errorCode) metaTokens.push(`[${errorCode}]`);
    if (failureStage) metaTokens.push(`[stage:${failureStage}]`);
    const metaLine = metaTokens.join(' ');
    const detailParts = [];
    if (metadataHint) detailParts.push(metadataHint);
    if (metaLine) detailParts.push(metaLine);
    if (rawError) detailParts.push(rawError);
    const detailLine = detailParts.join(' ');
    if (detailLine) return `${headline}\n${nextStep}\n${detailLine}`;
    return `${headline}\n${nextStep}`;
}

async function checkUpdates() {
    const btn = document.getElementById('btnUpdate');
    btn.style.transition = 'transform 1s';
    btn.style.transform = 'rotate(360deg)';

    // Show "Checking..." without button
    showToast(t('checkingUpdate') || 'Checking update...', 1200);

    try {
        const appRes = await window.electronAPI.invoke('check-app-update');

        // Hide alert modal first to avoid conflict with showConfirm or to refresh state
        document.getElementById('alertModal').style.display = 'none';

        if (appRes.update) {
            // Found App Update -> Show Confirm with Skip option
            showUpdateConfirm(appRes.remote, appRes.url);
            return;
        }

        const xrayRes = await window.electronAPI.invoke('check-xray-update');
        if (xrayRes.update) {
            showToast(`${t('xrayUpdateFound') || 'Update found'} (v${xrayRes.remote})`, 1800);
            const preferredUpdateRoute = (() => {
                const route = xrayRes && typeof xrayRes.downloadRoute === 'string' ? xrayRes.downloadRoute.trim().toLowerCase() : '';
                return route === 'direct' || route === 'proxy' ? route : '';
            })();
            const preferredUpdateUrl = (() => {
                const directUrl = xrayRes && typeof xrayRes.downloadUrlDirect === 'string' ? xrayRes.downloadUrlDirect.trim() : '';
                const proxyUrl = xrayRes && typeof xrayRes.downloadUrlProxy === 'string' ? xrayRes.downloadUrlProxy.trim() : '';
                const legacyUrl = xrayRes && typeof xrayRes.downloadUrl === 'string' ? xrayRes.downloadUrl.trim() : '';
                if (preferredUpdateRoute === 'direct' && directUrl) return directUrl;
                if (preferredUpdateRoute === 'proxy' && proxyUrl) return proxyUrl;
                if (legacyUrl) return legacyUrl;
                return directUrl || proxyUrl || '';
            })();
            if (!preferredUpdateUrl) {
                showAlert(t('updateError') || 'Update failed');
                return;
            }
            const updateRequest = preferredUpdateRoute
                ? { url: preferredUpdateUrl, route: preferredUpdateRoute }
                : preferredUpdateUrl;
            console.log('[Update] check-xray-update handoff:', {
                routeHint: preferredUpdateRoute || null,
                handoffUrl: preferredUpdateUrl,
            });
            const updateResult = await window.electronAPI.invoke('download-xray-update', updateRequest);
            const updatePayload = updateResult && typeof updateResult === 'object' ? updateResult : null;
            const updateSuccess = !!(
                updatePayload
                    ? updatePayload.success
                    : updateResult
            );
            if (updatePayload) {
                console.log('[Update] download-xray-update result:', {
                    success: !!updatePayload.success,
                    error: updatePayload.error || null,
                    errorCode: updatePayload.errorCode || null,
                    failureStage: updatePayload.failureStage || null,
                    remote: updatePayload.remote || null,
                    requestRouteHint: updatePayload.requestRouteHint || null,
                    requestUrlHost: updatePayload.requestUrlHost || null,
                    releaseSource: updatePayload.releaseSource || null,
                    metadataRouteUrl: updatePayload.metadataRouteUrl || null,
                    metadataFetchStatus: updatePayload.metadataFetchStatus || null,
                    metadataFetchErrorCode: updatePayload.metadataFetchErrorCode || null,
                    metadataFetchHttpStatus: Number.isInteger(updatePayload.metadataFetchHttpStatus)
                        ? updatePayload.metadataFetchHttpStatus
                        : null,
                    metadataFetchErrorRetryable: typeof updatePayload.metadataFetchErrorRetryable === 'boolean'
                        ? updatePayload.metadataFetchErrorRetryable
                        : null,
                    metadataFetchAttemptCount: Number.isInteger(updatePayload.metadataFetchAttemptCount)
                        ? updatePayload.metadataFetchAttemptCount
                        : null,
                    metadataFetchFallbackUsed: !!updatePayload.metadataFetchFallbackUsed,
                    metadataFetchFallbackAttempted: !!updatePayload.metadataFetchFallbackAttempted,
                    metadataFetchFallbackResult: updatePayload.metadataFetchFallbackResult || null,
                    metadataFetchFallbackDecision: updatePayload.metadataFetchFallbackDecision || null,
                    metadataFetchAttemptFlow: updatePayload.metadataFetchAttemptFlow || null,
                    metadataFetchFailureRoute: updatePayload.metadataFetchFailureRoute || null,
                    metadataFetchFailureHost: updatePayload.metadataFetchFailureHost || null,
                    metadataFetchRoute: updatePayload.metadataFetchRoute || null,
                    metadataFetchRouteHost: updatePayload.metadataFetchRouteHost || null,
                    metadataRoute: updatePayload.metadataRoute || null,
                    selectedAssetRoute: updatePayload.selectedAssetRoute || null,
                    routeDecisionSource: updatePayload.routeDecisionSource || null,
                    routeHintConflict: !!updatePayload.routeHintConflict,
                    routeHintConflictType: updatePayload.routeHintConflictType || null,
                    selectedAssetHost: updatePayload.selectedAssetHost || null,
                    selectedDgstRoute: updatePayload.selectedDgstRoute || null,
                    selectedDgstHost: updatePayload.selectedDgstHost || null,
                    dgstSource: updatePayload.dgstSource || null,
                    effectiveAssetRoute: updatePayload.effectiveAssetRoute || null,
                    effectiveAssetHost: updatePayload.effectiveAssetHost || null,
                    effectiveDgstRoute: updatePayload.effectiveDgstRoute || null,
                    effectiveDgstHost: updatePayload.effectiveDgstHost || null,
                    usedAssetFallback: !!updatePayload.usedAssetFallback,
                    usedDgstFallback: !!updatePayload.usedDgstFallback,
                });
            }
            if (updateSuccess) showToast(t('updateDownloaded') || 'Downloaded', 1800);
            else {
                showAlert(composeXrayUpdateErrorMessage(updatePayload));
            }
            return;
        }

        // No Update -> Show Alert with OK button
        showToast(t('noUpdate') || 'No update', 1200);

        // Clear badge if no update found after manual check
        btn.classList.remove('has-update');
    } catch (e) {
        showAlert(t('updateError') + " " + e.message);
    } finally {
        setTimeout(() => { btn.style.transform = 'none'; }, 1000);
    }
}

async function checkUpdatesSilent() {
    try {
        const appRes = await window.electronAPI.invoke('check-app-update');
        if (appRes.update) {
            // Check if this version was skipped
            const skippedVersion = localStorage.getItem('geekez_skipped_version');
            if (skippedVersion === appRes.remote) {
                console.log(`Version ${appRes.remote} was skipped, not showing update notification`);
                return;
            }

            const btn = document.getElementById('btnUpdate');
            if (btn) btn.classList.add('has-update');

            // Auto popup for App update with Skip option
            showUpdateConfirm(appRes.remote, appRes.url);
            return;
        }
        const xrayRes = await window.electronAPI.invoke('check-xray-update');
        if (xrayRes.update) {
            const btn = document.getElementById('btnUpdate');
            if (btn) btn.classList.add('has-update');
        }
    } catch (e) {
        console.error('Silent update check failed:', e);
    }
}

// Show update confirm dialog with Skip option
function showUpdateConfirm(version, url) {
    const msg = `${t('appUpdateFound') || 'Update found'} (v${version})\n\n${t('askUpdate') || 'Update now'}?`;
    if (typeof showConfirmChoice === 'function') {
        showConfirmChoice(msg, {
            altText: t('skipVersion') || '跳过此版本',
            okText: t('goDownload') || '前往下载',
            onAlt: () => {
                localStorage.setItem('geekez_skipped_version', version);
                showAlert(t('versionSkipped') || `已跳过 v${version} 版本更新`);
            },
            onConfirm: () => {
                if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
                    window.electronAPI.invoke('open-url', url);
                }
            },
        });
        return;
    }

    showAlert(msg);
}

function openGithub() { window.electronAPI.invoke('open-url', 'https://github.com/EchoHS/GeekezBrowser'); }

function normalizeProfileStatusFilter(value) {
    const raw = String(value || '').toLowerCase().trim();
    if (raw === 'running' || raw === 'attention' || raw === 'idle') return raw;
    return 'all';
}

function getProfileHealthState({ isRunning, lastStatus, lastLeak, lastErr }) {
    const hasLeakRisk = !!(lastLeak && lastLeak.summary && lastLeak.summary.webrtc === 'leak');
    const hasError = lastStatus === 'stop_failed' || lastStatus === 'launch_failed' || !!lastErr;
    if (hasError || hasLeakRisk) return 'attention';
    if (isRunning) return 'running';
    return 'idle';
}

function matchesProfileStatusFilter(filter, profileState) {
    const status = normalizeProfileStatusFilter(filter);
    if (status === 'all') return true;
    return profileState === status;
}

function persistProfileStatusFilter() {
    try {
        localStorage.setItem(PROFILE_STATUS_FILTER_KEY, normalizeProfileStatusFilter(profileStatusFilter));
    } catch (e) { }
}

function updateProfileFilterControls(counts = null) {
    const normalized = normalizeProfileStatusFilter(profileStatusFilter);
    const chips = Array.from(document.querySelectorAll('[data-action="set-profile-filter"]'));
    chips.forEach((chip) => {
        const value = normalizeProfileStatusFilter(chip.getAttribute('data-action-arg'));
        chip.classList.toggle('active', value === normalized);
        chip.setAttribute('aria-pressed', value === normalized ? 'true' : 'false');
        if (!counts) return;
        const countEl = chip.querySelector('[data-role="count"]');
        if (!countEl) return;
        const key = value === 'all' ? 'all' : value;
        const val = Number(counts[key] || 0);
        countEl.textContent = String(val);
    });
}

function setProfileStatusFilter(value) {
    profileStatusFilter = normalizeProfileStatusFilter(value);
    persistProfileStatusFilter();
    updateProfileFilterControls();
    loadProfiles();
}

function filterProfiles(text) {
    searchText = text.toLowerCase();
    loadProfiles();
}

function toggleViewMode() {
    viewMode = viewMode === 'list' ? 'grid' : 'list';
    localStorage.setItem('geekez_view', viewMode);
    loadProfiles();
}

async function runLeakCheck(profileId) {
    try {
        const res = await window.electronAPI.runLeakCheck(profileId);
        if (!res || !res.success) {
            showAlert((res && res.error) ? res.error : 'Leak check failed');
            return;
        }
        showToast(`LeakCheck: ${res.status}`);
        if (res.reportPath) {
            // Best-effort: open folder containing report
            try { await window.electronAPI.openPath(res.reportPath); } catch (e) { }
        }
        loadProfiles();
    } catch (e) {
        showAlert(e.message || 'Leak check failed');
    }
}

async function openLastLeakReport(profile) {
    try {
        const last = profile && profile.diagnostics ? profile.diagnostics.lastLeakReport : null;
        if (!last || !last.path) return showAlert('No leak report yet');
        await window.electronAPI.openPath(last.path);
    } catch (e) {
        showAlert(e.message || 'Failed to open report');
    }
}

async function openLastLeakReportById(profileId) {
    try {
        const profiles = await window.electronAPI.getProfiles();
        const p = profiles.find(x => x.id === profileId);
        if (!p) return showAlert('Profile not found');
        await openLastLeakReport(p);
    } catch (e) {
        showAlert(e.message || 'Failed to open report');
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

function closeRotatedLogsModal() {
    const m = document.getElementById('rotatedLogsModal');
    if (m) m.style.display = 'none';
    __rotatedLogsCurrentProfileId = null;
}

function filterRotatedLogs() {
    const input = document.getElementById('rotatedLogsSearch');
    const q = input ? input.value.trim().toLowerCase() : '';
    const list = document.getElementById('rotatedLogsList');
    if (!list) return;
    Array.from(list.children).forEach((child) => {
        const name = (child.getAttribute('data-log-name') || '').toLowerCase();
        child.style.display = !q || name.includes(q) ? '' : 'none';
    });
}

let __rotatedLogsCurrentProfileId = null;

async function openRotatedLogsById(profileId) {
    try {
        __rotatedLogsCurrentProfileId = profileId;
        const res = await window.electronAPI.listProfileRotatedLogs(profileId);
        if (!res || !res.success) return showAlert((res && res.error) ? res.error : 'Failed to list logs');
        const list = document.getElementById('rotatedLogsList');
        if (!list) return;
        const search = document.getElementById('rotatedLogsSearch');
        if (search) search.value = '';
        list.textContent = '';
        if (!res.files || res.files.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.7; padding:10px;';
            empty.textContent = t('noRotatedLogs') || 'No rotated logs';
            list.appendChild(empty);
        } else {
            res.files.forEach(f => {
                const fileName = f.name || '';
                const item = document.createElement('div');
                item.className = 'no-drag';
                item.style.cssText = 'padding:10px; border:1px solid rgba(255,255,255,0.10); border-radius:10px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:10px;';
                item.setAttribute('data-log-name', fileName);

                const info = document.createElement('div');
                info.style.cssText = 'flex:1; cursor:pointer; min-width:0;';

                const title = document.createElement('div');
                title.style.cssText = 'font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
                title.textContent = fileName;

                const sizeEl = document.createElement('div');
                sizeEl.style.cssText = 'font-size:11px; opacity:0.7;';
                sizeEl.textContent = formatBytes(f.size || 0);

                info.appendChild(title);
                info.appendChild(sizeEl);

                info.onclick = async () => { await window.electronAPI.openPath(f.path); };

                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex; gap:8px;';

                const openBtn = document.createElement('button');
                openBtn.className = 'outline no-drag';
                openBtn.style.cssText = 'padding:6px 10px;';
                openBtn.textContent = t('openLog') || 'Open Log';
                openBtn.onclick = async (ev) => { ev.stopPropagation(); await window.electronAPI.openPath(f.path); };

                const delBtn = document.createElement('button');
                delBtn.className = 'outline no-drag';
                delBtn.style.cssText = 'padding:6px 10px; border-color:#ef4444; color:#ef4444;';
                delBtn.textContent = t('delete') || 'Delete';
                delBtn.onclick = async (ev) => { ev.stopPropagation(); await confirmDeleteRotatedLog(fileName); };

                actions.appendChild(openBtn);
                actions.appendChild(delBtn);

                item.appendChild(info);
                item.appendChild(actions);
                list.appendChild(item);
            });
            filterRotatedLogs();
        }
        const modal = document.getElementById('rotatedLogsModal');
        if (modal) modal.style.display = 'flex';
    } catch (e) {
        showAlert(e.message || 'Failed to list logs');
    }
}

async function confirmDeleteRotatedLog(filename) {
    if (!__rotatedLogsCurrentProfileId) return;
    showConfirm(`${t('confirmDelLog') || 'Delete this log file?'}\n${filename}`, async () => {
        const res = await window.electronAPI.deleteProfileRotatedLog(__rotatedLogsCurrentProfileId, filename);
        if (!res || !res.success) return showAlert((res && res.error) ? res.error : 'Delete failed');
        showToast(t('deleted') || 'Deleted');
        await openRotatedLogsById(__rotatedLogsCurrentProfileId);
    });
}

async function openProfileLogById(profileId) {
    try {
        const profiles = await window.electronAPI.getProfiles();
        const p = profiles.find(x => x.id === profileId);
        if (!p) return showAlert('Profile not found');
        const logPath = await window.electronAPI.getProfileLogPath(profileId);
        if (!logPath) return showAlert('Log path not available');
        await window.electronAPI.openPath(logPath);
    } catch (e) {
        showAlert(e.message || 'Failed to open log');
    }
}

async function clearProfileLogsById(profileId, clearHistory = false) {
    try {
        const runningIds = await window.electronAPI.getRunningIds();
        if (runningIds.includes(profileId)) {
            return showAlert(t('stopBeforeClearLogs') || 'Stop the profile before clearing logs.');
        }
        const prompt = clearHistory
            ? `${t('clearLogsConfirm') || 'Clear logs for this profile?'}\n${t('clearLogsHistoryHint') || 'This will also remove rotated history logs.'}`
            : (t('clearLogsConfirm') || 'Clear logs for this profile?');
        showConfirm(prompt, async () => {
            const res = await window.electronAPI.clearProfileLogs(profileId, clearHistory);
            if (!res || !res.success) return showAlert((res && res.error) ? res.error : 'Failed to clear logs');
            showToast(t('logsCleared') || 'Logs cleared');
        });
    } catch (e) {
        showAlert(e.message || 'Failed to clear logs');
    }
}

// 简单的颜色生成器
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

function closeOpenProfileMoreMenus(listEl, exceptMenu = null) {
    if (!(listEl instanceof HTMLElement)) return;
    const openMenus = listEl.querySelectorAll('.profile-more-menu[open]');
    openMenus.forEach((menuEl) => {
        if (exceptMenu && menuEl === exceptMenu) return;
        if (menuEl instanceof HTMLDetailsElement) menuEl.open = false;
        menuEl.classList.remove('open-upward');
        const item = menuEl.closest ? menuEl.closest('[data-profile-id]') : null;
        if (item) item.classList.remove('is-menu-open');
    });
}

function updateProfileMoreMenuDirection(menuEl, listEl) {
    if (!(menuEl instanceof HTMLElement) || !(listEl instanceof HTMLElement)) return;
    const panelEl = menuEl.querySelector('.profile-more-list');
    if (!(panelEl instanceof HTMLElement)) return;
    menuEl.classList.remove('open-upward');
    const menuRect = menuEl.getBoundingClientRect();
    const listRect = listEl.getBoundingClientRect();
    const panelHeight = Math.max(panelEl.scrollHeight || 0, panelEl.offsetHeight || 0);
    const viewportBottom = Math.min(listRect.bottom, window.innerHeight || listRect.bottom);
    const spaceBelow = viewportBottom - menuRect.bottom;
    const spaceAbove = menuRect.top - listRect.top;
    if (spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow) {
        menuEl.classList.add('open-upward');
    }
}

function closeOpenProxyRowMoreMenus(listEl, exceptMenu = null) {
    if (!(listEl instanceof HTMLElement)) return;
    const openMenus = listEl.querySelectorAll('.proxy-row-more.profile-more-menu[open]');
    openMenus.forEach((menuEl) => {
        if (exceptMenu && menuEl === exceptMenu) return;
        if (menuEl instanceof HTMLDetailsElement) menuEl.open = false;
        const panelEl = menuEl.querySelector('.profile-more-list');
        if (panelEl instanceof HTMLElement) panelEl.style.maxHeight = '';
        menuEl.classList.remove('open-upward');
    });
}

function updateProxyRowMoreMenuDirection(menuEl, listEl) {
    if (!(menuEl instanceof HTMLElement) || !(listEl instanceof HTMLElement)) return;
    const panelEl = menuEl.querySelector('.profile-more-list');
    if (!(panelEl instanceof HTMLElement)) return;
    panelEl.style.maxHeight = '';
    menuEl.classList.remove('open-upward');
    const menuRect = menuEl.getBoundingClientRect();
    const listRect = listEl.getBoundingClientRect();
    const panelHeight = Math.max(panelEl.scrollHeight || 0, panelEl.offsetHeight || 0);
    const viewportBottom = Math.min(listRect.bottom, window.innerHeight || listRect.bottom);
    const spaceBelow = viewportBottom - menuRect.bottom;
    const spaceAbove = menuRect.top - listRect.top;
    const preferredSpace = Math.max(spaceBelow, spaceAbove);
    const availableSpace = Math.max(160, Math.floor(preferredSpace - 14));
    if (panelHeight > availableSpace) panelEl.style.maxHeight = `${availableSpace}px`;
    if (spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow) {
        menuEl.classList.add('open-upward');
    }
}

function closeOpenProxyGroupMoreMenus(modalEl, exceptMenu = null) {
    if (!(modalEl instanceof HTMLElement)) return;
    const openMenus = modalEl.querySelectorAll('.proxy-group-more.profile-more-menu[open]');
    openMenus.forEach((menuEl) => {
        if (exceptMenu && menuEl === exceptMenu) return;
        if (menuEl instanceof HTMLDetailsElement) menuEl.open = false;
        const panelEl = menuEl.querySelector('.profile-more-list');
        if (panelEl instanceof HTMLElement) panelEl.style.maxHeight = '';
        menuEl.classList.remove('open-upward');
    });
}

function updateProxyGroupMoreMenuDirection(menuEl, modalEl) {
    if (!(menuEl instanceof HTMLElement) || !(modalEl instanceof HTMLElement)) return;
    const panelEl = menuEl.querySelector('.profile-more-list');
    if (!(panelEl instanceof HTMLElement)) return;
    panelEl.style.maxHeight = '';
    menuEl.classList.remove('open-upward');
    const menuRect = menuEl.getBoundingClientRect();
    const hostRect = modalEl.getBoundingClientRect();
    const panelHeight = Math.max(panelEl.scrollHeight || 0, panelEl.offsetHeight || 0);
    const viewportBottom = Math.min(hostRect.bottom, window.innerHeight || hostRect.bottom);
    const spaceBelow = viewportBottom - menuRect.bottom;
    const spaceAbove = menuRect.top - hostRect.top;
    const preferredSpace = Math.max(spaceBelow, spaceAbove);
    const availableSpace = Math.max(180, Math.floor(preferredSpace - 14));
    if (panelHeight > availableSpace) panelEl.style.maxHeight = `${availableSpace}px`;
    if (spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow) {
        menuEl.classList.add('open-upward');
    }
}

function ensureProfileListEventsBound() {
    if (__profileListEventsBound) return;
    const listEl = document.getElementById('profileTableBody');
    if (!listEl) return;
    __profileListEventsBound = true;

    document.addEventListener('click', (ev) => {
        if (!listEl.contains(ev.target)) closeOpenProfileMoreMenus(listEl);
    });

    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeOpenProfileMoreMenus(listEl);
    });

    listEl.addEventListener('click', async (ev) => {
        try {
            const actionEl = ev.target && ev.target.closest ? ev.target.closest('[data-action]') : null;
            if (!actionEl || !listEl.contains(actionEl)) {
                if (!(ev.target && ev.target.closest && ev.target.closest('.profile-more-menu'))) {
                    closeOpenProfileMoreMenus(listEl);
                }
                return;
            }
            const action = actionEl.getAttribute('data-action');
            if (!action) return;

            // Buttons can be disabled; ignore.
            if (actionEl instanceof HTMLButtonElement && actionEl.disabled) return;

            const item = actionEl.closest('[data-profile-id]');
            const profileId = item ? item.getAttribute('data-profile-id') : null;
            if (!profileId) return;

            switch (action) {
                case 'launch':
                    await launch(profileId);
                    break;
                case 'restart':
                    await restart(profileId);
                    break;
                case 'edit':
                    openEditModal(profileId);
                    break;
                case 'open-log':
                    await openProfileLogById(profileId);
                    break;
                case 'open-rotated-logs':
                    await openRotatedLogsById(profileId);
                    break;
                case 'clear-logs':
                    await clearProfileLogsById(profileId, false);
                    break;
                case 'clear-logs-history':
                    await clearProfileLogsById(profileId, true);
                    break;
                case 'leak-check':
                    await runLeakCheck(profileId);
                    break;
                case 'cookie-manager':
                    await openCookieManager(profileId);
                    break;
                case 'delete':
                    remove(profileId);
                    break;
                case 'open-leak':
                    await openLastLeakReportById(profileId);
                    break;
                default:
                    break;
            }

            const menu = actionEl.closest('.profile-more-menu');
            if (menu instanceof HTMLDetailsElement) {
                menu.open = false;
                menu.classList.remove('open-upward');
                const item = menu.closest ? menu.closest('[data-profile-id]') : null;
                if (item) item.classList.remove('is-menu-open');
            }
        } catch (e) {
            console.error('Profile list action failed:', e);
        }
    });

    listEl.addEventListener('change', async (ev) => {
        try {
            if (!(ev.target instanceof HTMLSelectElement)) return;
            const sel = ev.target;
            if (sel.getAttribute('data-action') !== 'quick-pre-proxy') return;
            const item = sel.closest('[data-profile-id]');
            const profileId = item ? item.getAttribute('data-profile-id') : null;
            if (!profileId) return;
            await quickUpdatePreProxy(profileId, sel.value);
        } catch (e) {
            console.error('Profile list change handler failed:', e);
        }
    });
}

function getCookieManagerModal() {
    return document.getElementById('cookieManagerModal');
}

function getCookieManagerCookieById(cookieId) {
    return (__cookieManagerState.cookies || []).find(item => item && item.id === cookieId) || null;
}

function setCookieManagerSummaryText(text) {
    const el = document.getElementById('cookieSummary');
    if (!el) return;
    el.textContent = String(text || '');
}

function formatCookieExpiryText(cookie) {
    if (!cookie || cookie.session) return t('cookieSessionLabel') || 'Session';
    if (!cookie.expires) return '-';
    try {
        return new Date(cookie.expires * 1000).toLocaleString();
    } catch (e) {
        return String(cookie.expires);
    }
}

function updateCookieExpiryInputState() {
    const sessionEl = document.getElementById('cookieEditSession');
    const expiresEl = document.getElementById('cookieEditExpires');
    if (!sessionEl || !expiresEl) return;
    if (sessionEl.checked) {
        expiresEl.disabled = true;
    } else {
        expiresEl.disabled = false;
    }
}

function renderCookieEditor(cookie = null, options = {}) {
    const titleEl = document.getElementById('cookieEditorTitle');
    const nameEl = document.getElementById('cookieEditName');
    const valueEl = document.getElementById('cookieEditValue');
    const domainEl = document.getElementById('cookieEditDomain');
    const pathEl = document.getElementById('cookieEditPath');
    const sameSiteEl = document.getElementById('cookieEditSameSite');
    const secureEl = document.getElementById('cookieEditSecure');
    const httpOnlyEl = document.getElementById('cookieEditHttpOnly');
    const sessionEl = document.getElementById('cookieEditSession');
    const expiresEl = document.getElementById('cookieEditExpires');
    const deleteBtn = document.querySelector('[data-action=\"delete-cookie-edit\"]');

    if (!nameEl || !valueEl || !domainEl || !pathEl || !sameSiteEl || !secureEl || !httpOnlyEl || !sessionEl || !expiresEl) return;

    const isNew = options && options.isNew === true;
    if (titleEl) {
        titleEl.textContent = isNew
            ? (t('cookieEditorNewTitle') || 'New Cookie')
            : (t('cookieEditorEditTitle') || 'Edit Cookie');
    }

    nameEl.value = cookie && cookie.name ? cookie.name : '';
    valueEl.value = cookie && cookie.value ? cookie.value : '';
    domainEl.value = cookie && cookie.domain ? String(cookie.domain).replace(/^\./, '') : (options.defaultDomain || '');
    pathEl.value = cookie && cookie.path ? cookie.path : '/';
    const sameSite = cookie && cookie.sameSite ? String(cookie.sameSite).toLowerCase() : 'unspecified';
    if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') sameSiteEl.value = sameSite;
    else sameSiteEl.value = 'unspecified';
    secureEl.checked = !!(cookie && cookie.secure);
    httpOnlyEl.checked = !!(cookie && cookie.httpOnly);
    sessionEl.checked = !!(cookie && cookie.session);

    if (cookie && cookie.expires && !cookie.session) {
        try {
            const date = new Date(cookie.expires * 1000);
            expiresEl.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        } catch (e) {
            expiresEl.value = '';
        }
    } else {
        expiresEl.value = '';
    }

    if (deleteBtn) deleteBtn.disabled = isNew;
    updateCookieExpiryInputState();
}

function renderCookieRows() {
    const tbody = document.getElementById('cookieTableBody');
    if (!tbody) return;
    tbody.textContent = '';

    const rows = Array.isArray(__cookieManagerState.cookies) ? __cookieManagerState.cookies : [];
    if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.opacity = '0.7';
        td.style.textAlign = 'center';
        td.style.padding = '14px';
        td.textContent = t('cookieTableEmpty') || 'No cookies';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    rows.forEach((cookie) => {
        const tr = document.createElement('tr');
        tr.dataset.cookieId = cookie.id;
        if (__cookieManagerState.selectedId && __cookieManagerState.selectedId === cookie.id) {
            tr.style.background = 'rgba(0, 224, 255, 0.12)';
        }

        const cName = document.createElement('td');
        cName.textContent = cookie.name || '';
        cName.style.maxWidth = '160px';
        cName.style.overflow = 'hidden';
        cName.style.textOverflow = 'ellipsis';
        cName.style.whiteSpace = 'nowrap';

        const cDomain = document.createElement('td');
        cDomain.textContent = cookie.domain || cookie.host || '-';
        cDomain.style.maxWidth = '170px';
        cDomain.style.overflow = 'hidden';
        cDomain.style.textOverflow = 'ellipsis';
        cDomain.style.whiteSpace = 'nowrap';

        const cPath = document.createElement('td');
        cPath.textContent = cookie.path || '/';

        const cValue = document.createElement('td');
        const valueText = typeof cookie.value === 'string' ? cookie.value : '';
        cValue.textContent = valueText.length > 30 ? `${valueText.slice(0, 30)}…` : valueText;
        cValue.style.maxWidth = '220px';
        cValue.style.overflow = 'hidden';
        cValue.style.textOverflow = 'ellipsis';
        cValue.style.whiteSpace = 'nowrap';

        const cExp = document.createElement('td');
        cExp.textContent = formatCookieExpiryText(cookie);
        cExp.style.maxWidth = '170px';
        cExp.style.overflow = 'hidden';
        cExp.style.textOverflow = 'ellipsis';
        cExp.style.whiteSpace = 'nowrap';

        tr.appendChild(cName);
        tr.appendChild(cDomain);
        tr.appendChild(cPath);
        tr.appendChild(cValue);
        tr.appendChild(cExp);
        tbody.appendChild(tr);
    });
}

function renderCookieSiteOptions() {
    const sel = document.getElementById('cookieSiteSelect');
    if (!sel) return;
    const current = __cookieManagerState.site || '';
    sel.textContent = '';

    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = t('cookieSiteAll') || 'All Sites';
    sel.appendChild(allOpt);

    const sites = Array.isArray(__cookieManagerState.sites) ? __cookieManagerState.sites : [];
    sites.forEach((siteItem) => {
        const opt = document.createElement('option');
        opt.value = siteItem.site || '';
        const count = Number(siteItem.count) || 0;
        opt.textContent = `${siteItem.site || 'unknown'} (${count})`;
        sel.appendChild(opt);
    });

    const hasCurrent = sites.some(item => (item.site || '') === current);
    sel.value = hasCurrent ? current : '';
    __cookieManagerState.site = sel.value || '';
}

async function loadCookieSites() {
    if (!__cookieManagerState.profileId) return;
    const res = await window.electronAPI.getProfileCookieSites(__cookieManagerState.profileId);
    if (!res || !res.success) {
        const err = res && res.error ? res.error : (t('cookieLoadFailed') || 'Failed to load cookies');
        showAlert(err);
        __cookieManagerState.sites = [];
        renderCookieSiteOptions();
        return;
    }
    __cookieManagerState.sites = Array.isArray(res.sites) ? res.sites : [];
    renderCookieSiteOptions();

    const totalSites = Number(res.totalSites) || __cookieManagerState.sites.length;
    const totalCookies = Number(res.totalCookies) || 0;
    setCookieManagerSummaryText(tFormat('cookieSummaryFmt', 'Sites: {sites} · Cookies: {cookies}', {
        sites: totalSites,
        cookies: totalCookies,
    }));
}

async function loadCookiesForCurrentSite() {
    if (!__cookieManagerState.profileId) return;
    const payload = {
        id: __cookieManagerState.profileId,
        site: __cookieManagerState.site || undefined,
    };
    const res = await window.electronAPI.getProfileCookies(payload);
    if (!res || !res.success) {
        const err = res && res.error ? res.error : (t('cookieLoadFailed') || 'Failed to load cookies');
        showAlert(err);
        __cookieManagerState.cookies = [];
        renderCookieRows();
        return;
    }
    __cookieManagerState.cookies = Array.isArray(res.cookies) ? res.cookies : [];
    renderCookieRows();

    if (__cookieManagerState.site) {
        setCookieManagerSummaryText(tFormat('cookieSummarySiteFmt', 'Site: {site} · Cookies: {cookies}', {
            site: __cookieManagerState.site,
            cookies: __cookieManagerState.cookies.length,
        }));
    } else {
        setCookieManagerSummaryText(tFormat('cookieSummaryFmt', 'Sites: {sites} · Cookies: {cookies}', {
            sites: __cookieManagerState.sites.length,
            cookies: __cookieManagerState.cookies.length,
        }));
    }
}

async function refreshCookieManagerData(options = {}) {
    const keepSelected = !(options && options.keepSelected === false);
    const prevSelected = keepSelected ? __cookieManagerState.selectedId : null;
    await loadCookieSites();
    await loadCookiesForCurrentSite();

    if (prevSelected && getCookieManagerCookieById(prevSelected)) {
        __cookieManagerState.selectedId = prevSelected;
        renderCookieRows();
        renderCookieEditor(getCookieManagerCookieById(prevSelected), { isNew: false });
        return;
    }
    if (__cookieManagerState.cookies.length > 0) {
        __cookieManagerState.selectedId = __cookieManagerState.cookies[0].id;
        renderCookieRows();
        renderCookieEditor(__cookieManagerState.cookies[0], { isNew: false });
        return;
    }
    __cookieManagerState.selectedId = null;
    renderCookieEditor(null, { isNew: true, defaultDomain: __cookieManagerState.site || '' });
}

async function openCookieManager(profileId) {
    try {
        const safeId = String(profileId || '').trim();
        if (!safeId) return;
        const profiles = await window.electronAPI.getProfiles();
        const profile = Array.isArray(profiles) ? profiles.find(item => item && item.id === safeId) : null;
        __cookieManagerState.profileId = safeId;
        __cookieManagerState.profileName = profile && profile.name ? profile.name : safeId;
        __cookieManagerState.site = '';
        __cookieManagerState.sites = [];
        __cookieManagerState.cookies = [];
        __cookieManagerState.selectedId = null;

        const titleEl = document.getElementById('cookieManagerTitle');
        if (titleEl) {
            titleEl.textContent = tFormat('cookieManagerTitleFmt', 'Cookie Manager · {profile}', {
                profile: __cookieManagerState.profileName,
            });
        }
        const modal = getCookieManagerModal();
        if (!modal) return;
        modal.style.display = 'flex';

        ensureCookieManagerEventsBound();
        await refreshCookieManagerData({ keepSelected: false });
    } catch (e) {
        showAlert((t('cookieOpenFailed') || 'Failed to open cookie manager') + `: ${e.message || String(e)}`);
    }
}

function closeCookieManager() {
    const modal = getCookieManagerModal();
    if (!modal) return;
    modal.style.display = 'none';
    __cookieManagerState.profileId = null;
    __cookieManagerState.profileName = '';
    __cookieManagerState.site = '';
    __cookieManagerState.sites = [];
    __cookieManagerState.cookies = [];
    __cookieManagerState.selectedId = null;
}

function selectCookieForEdit(cookieId) {
    if (!cookieId) return;
    const cookie = getCookieManagerCookieById(cookieId);
    if (!cookie) return;
    __cookieManagerState.selectedId = cookie.id;
    renderCookieRows();
    renderCookieEditor(cookie, { isNew: false });
}

function openCookieAddEditor() {
    __cookieManagerState.selectedId = null;
    renderCookieRows();
    renderCookieEditor(null, { isNew: true, defaultDomain: __cookieManagerState.site || '' });
}

function readCookieEditorPayload() {
    const nameEl = document.getElementById('cookieEditName');
    const valueEl = document.getElementById('cookieEditValue');
    const domainEl = document.getElementById('cookieEditDomain');
    const pathEl = document.getElementById('cookieEditPath');
    const sameSiteEl = document.getElementById('cookieEditSameSite');
    const secureEl = document.getElementById('cookieEditSecure');
    const httpOnlyEl = document.getElementById('cookieEditHttpOnly');
    const sessionEl = document.getElementById('cookieEditSession');
    const expiresEl = document.getElementById('cookieEditExpires');

    const name = nameEl ? nameEl.value.trim() : '';
    const domain = domainEl ? domainEl.value.trim() : '';
    const pathValue = pathEl && pathEl.value ? pathEl.value.trim() : '/';

    if (!name) throw new Error(t('cookieNameRequired') || 'Cookie name is required');
    if (!domain) throw new Error(t('cookieDomainRequired') || 'Cookie domain is required');

    const session = !!(sessionEl && sessionEl.checked);
    const cookiePayload = {
        name,
        value: valueEl ? valueEl.value : '',
        domain,
        path: pathValue || '/',
        sameSite: sameSiteEl ? sameSiteEl.value : 'unspecified',
        secure: !!(secureEl && secureEl.checked),
        httpOnly: !!(httpOnlyEl && httpOnlyEl.checked),
        session,
    };

    if (!session && expiresEl && expiresEl.value) {
        const dt = new Date(expiresEl.value);
        if (Number.isNaN(dt.getTime())) throw new Error(t('cookieExpiryInvalid') || 'Invalid expiry time');
        cookiePayload.expires = Math.floor(dt.getTime() / 1000);
    }
    return cookiePayload;
}

async function saveCookieEdit() {
    if (!__cookieManagerState.profileId) return;
    try {
        const cookiePayload = readCookieEditorPayload();
        const res = await window.electronAPI.setProfileCookie({
            id: __cookieManagerState.profileId,
            site: __cookieManagerState.site || undefined,
            cookie: cookiePayload,
        });
        if (!res || !res.success) {
            showAlert((res && res.error) || (t('cookieSaveFailed') || 'Failed to save cookie'));
            return;
        }
        __cookieManagerState.selectedId = null;
        showToast(t('cookieSaved') || 'Cookie saved', 1400);
        await refreshCookieManagerData({ keepSelected: true });

        const keyName = cookiePayload.name;
        const keyDomain = String(cookiePayload.domain || '').replace(/^\./, '');
        const keyPath = cookiePayload.path || '/';
        const matched = __cookieManagerState.cookies.find(item => (
            item && item.name === keyName
            && String(item.domain || '').replace(/^\./, '') === keyDomain
            && (item.path || '/') === keyPath
        ));
        if (matched) selectCookieForEdit(matched.id);
    } catch (e) {
        showAlert(e.message || String(e));
    }
}

async function deleteCookieEdit() {
    if (!__cookieManagerState.profileId || !__cookieManagerState.selectedId) return;
    const cookie = getCookieManagerCookieById(__cookieManagerState.selectedId);
    if (!cookie) return;
    showConfirm(tFormat('cookieDeleteConfirm', 'Delete cookie {name}?', { name: cookie.name || '' }), async () => {
        const res = await window.electronAPI.deleteProfileCookie({
            id: __cookieManagerState.profileId,
            site: __cookieManagerState.site || undefined,
            cookie: {
                name: cookie.name,
                domain: cookie.domain,
                path: cookie.path,
            },
        });
        if (!res || !res.success) {
            showAlert((res && res.error) || (t('cookieDeleteFailed') || 'Failed to delete cookie'));
            return;
        }
        __cookieManagerState.selectedId = null;
        showToast(t('cookieDeleted') || 'Cookie deleted', 1400);
        await refreshCookieManagerData({ keepSelected: false });
    });
}

async function exportCurrentCookieScope() {
    if (!__cookieManagerState.profileId) return;
    const res = await window.electronAPI.exportProfileCookies({
        id: __cookieManagerState.profileId,
        site: __cookieManagerState.site || undefined,
    });
    if (!res || !res.success) {
        if (res && res.cancelled) return;
        showAlert((res && res.error) || (t('cookieExportFailed') || 'Cookie export failed'));
        return;
    }
    showToast(tFormat('cookieExported', 'Exported {count} cookies', { count: res.total || 0 }), 1600);
}

async function importCurrentCookieScope() {
    if (!__cookieManagerState.profileId) return;
    const shouldReplace = await new Promise((resolve) => {
        showConfirmChoice(
            t('cookieImportModePrompt') || 'Choose import mode: Merge keeps existing cookies, Replace clears the current scope first.',
            {
                altText: t('cookieImportReplace') || 'Replace',
                okText: t('cookieImportMerge') || 'Merge',
                onAlt: () => resolve(true),
                onConfirm: () => resolve(false),
                onCancel: () => resolve(null),
            }
        );
    });
    if (shouldReplace === null) return;

    const mode = shouldReplace ? 'replace' : 'merge';
    const res = await window.electronAPI.importProfileCookies({
        id: __cookieManagerState.profileId,
        site: __cookieManagerState.site || undefined,
        mode,
    });
    if (!res || !res.success) {
        if (res && res.cancelled) return;
        showAlert((res && res.error) || (t('cookieImportFailed') || 'Cookie import failed'));
        return;
    }
    const imported = Number(res.imported) || 0;
    const failed = Number(res.failed) || 0;
    if (failed > 0) {
        const details = Array.isArray(res.errors) && res.errors.length > 0 ? `\n${res.errors.join('\n')}` : '';
        showAlert(tFormat('cookieImportPartial', 'Imported {ok}, failed {fail}', { ok: imported, fail: failed }) + details);
    } else {
        showToast(tFormat('cookieImported', 'Imported {count} cookies', { count: imported }), 1800);
    }
    await refreshCookieManagerData({ keepSelected: false });
}

async function clearCurrentCookieScope() {
    if (!__cookieManagerState.profileId) return;
    const message = __cookieManagerState.site
        ? tFormat('cookieClearSiteConfirm', 'Clear cookies for site {site}?', { site: __cookieManagerState.site })
        : (t('cookieClearAllConfirm') || 'Clear all cookies for this profile?');
    showConfirm(message, async () => {
        const res = await window.electronAPI.clearProfileCookiesSite({
            id: __cookieManagerState.profileId,
            site: __cookieManagerState.site || undefined,
        });
        if (!res || !res.success) {
            showAlert((res && res.error) || (t('cookieClearFailed') || 'Failed to clear cookies'));
            return;
        }
        showToast(tFormat('cookieCleared', 'Cleared {count} cookies', { count: Number(res.removed) || 0 }), 1600);
        await refreshCookieManagerData({ keepSelected: false });
    });
}

function ensureCookieManagerEventsBound() {
    if (__cookieManagerEventsBound) return;
    __cookieManagerEventsBound = true;

    const siteSel = document.getElementById('cookieSiteSelect');
    if (siteSel) {
        siteSel.addEventListener('change', async () => {
            __cookieManagerState.site = siteSel.value || '';
            __cookieManagerState.selectedId = null;
            await loadCookiesForCurrentSite();
            if (__cookieManagerState.cookies.length > 0) {
                selectCookieForEdit(__cookieManagerState.cookies[0].id);
            } else {
                openCookieAddEditor();
            }
        });
    }

    const body = document.getElementById('cookieTableBody');
    if (body) {
        body.addEventListener('click', (ev) => {
            const row = ev.target && ev.target.closest ? ev.target.closest('tr[data-cookie-id]') : null;
            if (!row) return;
            const cookieId = row.getAttribute('data-cookie-id');
            if (!cookieId) return;
            selectCookieForEdit(cookieId);
        });
    }

    const sessionEl = document.getElementById('cookieEditSession');
    if (sessionEl) {
        sessionEl.addEventListener('change', () => updateCookieExpiryInputState());
    }
}

function ensurePreProxyListEventsBound() {
    if (__preProxyListEventsBound) return;
    const listEl = document.getElementById('preProxyList');
    if (!listEl) return;
    __preProxyListEventsBound = true;

    document.addEventListener('click', (ev) => {
        if (!listEl.contains(ev.target)) closeOpenProxyRowMoreMenus(listEl);
    });

    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeOpenProxyRowMoreMenus(listEl);
    });

    listEl.addEventListener('scroll', () => {
        listEl.querySelectorAll('.proxy-row-more.profile-more-menu[open]').forEach((menuEl) => {
            updateProxyRowMoreMenuDirection(menuEl, listEl);
        });
    }, { passive: true });

    listEl.addEventListener('toggle', (ev) => {
        const menuEl = ev.target;
        if (!(menuEl instanceof HTMLDetailsElement)) return;
        if (!(menuEl.classList && menuEl.classList.contains('proxy-row-more') && menuEl.classList.contains('profile-more-menu'))) return;
        if (menuEl.open) {
            closeOpenProxyRowMoreMenus(listEl, menuEl);
            updateProxyRowMoreMenuDirection(menuEl, listEl);
        } else {
            menuEl.classList.remove('open-upward');
        }
    }, true);

    listEl.addEventListener('click', async (ev) => {
        try {
            let target = ev && ev.target ? ev.target : null;
            if (target && target.nodeType === 3) target = target.parentElement; // Text node -> Element
            const actionEl = target && target.closest ? target.closest('[data-action]') : null;
            if (!actionEl || !listEl.contains(actionEl)) {
                if (target && target.closest && target.closest('.proxy-row-more.profile-more-menu')) return;
                const rowEl = target && target.closest ? target.closest('.proxy-row[data-proxy-id]') : null;
                if (!rowEl || !listEl.contains(rowEl)) return;
                const proxyId = rowEl.getAttribute('data-proxy-id');
                if (!proxyId) return;
                currentProxyInspectorId = proxyId;
                if (globalSettings.mode === 'single') selP(proxyId);
                else togP(proxyId);
                openProxyInspectorDrawer();
                requestAnimationFrame(() => {
                    try {
                        const nextRow = listEl.querySelector(`.proxy-row[data-proxy-id="${proxyId}"]`);
                        if (nextRow && typeof nextRow.focus === 'function') nextRow.focus();
                        if (nextRow && typeof nextRow.scrollIntoView === 'function') {
                            nextRow.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                        }
                    } catch (e) { }
                });
                return;
            }
            const action = actionEl.getAttribute('data-action');
            const proxyId = actionEl.getAttribute('data-proxy-id');
            if (!action || !proxyId) return;
            const proxyRowMoreMenu = actionEl.closest ? actionEl.closest('.proxy-row-more.profile-more-menu') : null;
            if (proxyRowMoreMenu && proxyRowMoreMenu.hasAttribute('open')) {
                proxyRowMoreMenu.removeAttribute('open');
            }

            currentProxyInspectorId = proxyId;

            if (action === 'proxy-test') {
                await testSingleProxy(proxyId, actionEl);
            } else if (action === 'proxy-edit') {
                editPreProxy(proxyId);
            } else if (action === 'proxy-delete') {
                delP(proxyId);
            } else if (action === 'proxy-detail') {
                toggleProxyDetail(proxyId);
            }
        } catch (e) {
            console.error('Pre-proxy list action failed:', e);
        }
    });

    listEl.addEventListener('dblclick', async (ev) => {
        try {
            let target = ev && ev.target ? ev.target : null;
            if (target && target.nodeType === 3) target = target.parentElement; // Text node -> Element
            const rowEl = target && target.closest ? target.closest('.proxy-row[data-proxy-id]') : null;
            if (!rowEl || !listEl.contains(rowEl)) return;
            if (target && target.closest && target.closest('[data-action], input, button, select, textarea, a')) return;
            const proxyId = rowEl.getAttribute('data-proxy-id');
            if (!proxyId) return;
            await testSingleProxy(proxyId);
        } catch (e) {
            console.error('Pre-proxy list dblclick handler failed:', e);
        }
    });

    listEl.addEventListener('change', (ev) => {
        try {
            if (!(ev.target instanceof HTMLInputElement)) return;
            const input = ev.target;
            if (input.getAttribute('data-action') !== 'proxy-select') return;
            const proxyId = input.getAttribute('data-proxy-id');
            if (!proxyId) return;
            currentProxyInspectorId = proxyId;

            if (globalSettings.mode === 'single') selP(proxyId);
            else togP(proxyId);
        } catch (e) {
            console.error('Pre-proxy list change handler failed:', e);
        }
    });

    listEl.addEventListener('keydown', async (ev) => {
        try {
            let target = ev && ev.target ? ev.target : null;
            if (target && target.nodeType === 3) target = target.parentElement; // Text node -> Element
            const rowEl = target && target.closest ? target.closest('.proxy-row[data-proxy-id]') : null;
            if (!rowEl || !listEl.contains(rowEl)) return;
            const interactiveEl = target && target.closest
                ? target.closest('[data-action], input, button, select, textarea, a')
                : null;
            if (interactiveEl && interactiveEl !== rowEl) return;
            const proxyId = rowEl.getAttribute('data-proxy-id');
            if (!proxyId) return;
            if (ev.key === 'Enter') {
                ev.preventDefault();
                await testSingleProxy(proxyId);
                return;
            }
            if (ev.key === ' ') {
                ev.preventDefault();
                currentProxyInspectorId = proxyId;
                if (globalSettings.mode === 'single') selP(proxyId);
                else togP(proxyId);
                return;
            }
            if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const rows = Array.from(listEl.querySelectorAll('.proxy-row[data-proxy-id]'));
                const currentIndex = rows.indexOf(rowEl);
                if (currentIndex < 0 || rows.length === 0) return;
                const nextIndex = ev.key === 'ArrowDown'
                    ? Math.min(currentIndex + 1, rows.length - 1)
                    : Math.max(currentIndex - 1, 0);
                const nextRow = rows[nextIndex];
                if (nextRow && typeof nextRow.focus === 'function') nextRow.focus();
                if (nextRow && typeof nextRow.scrollIntoView === 'function') {
                    nextRow.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            }
        } catch (e) {
            console.error('Pre-proxy list keydown handler failed:', e);
        }
    });
}

async function loadProfiles() {
    try {
        const profiles = await window.electronAPI.getProfiles();
        const runningIds = await window.electronAPI.getRunningIds();
        // Cache profiles for groups page
        window.__cachedProfiles = profiles;

        const tableBody = document.getElementById('profileTableBody');
        const emptyEl = document.getElementById('profileListEmpty');
        if (!tableBody) return;
        ensureProfileListEventsBound();

        profileStatusFilter = normalizeProfileStatusFilter(profileStatusFilter);
        persistProfileStatusFilter();

        while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);

        const profileStates = profiles.map((p) => {
            const isRunning = runningIds.includes(p.id);
            const lastStatus = __lastStatus.get(p.id);
            const lastLeak = p && p.diagnostics ? p.diagnostics.lastLeakReport : null;
            const lastErr = p && p.diagnostics ? p.diagnostics.lastError : null;
            const healthState = getProfileHealthState({ isRunning, lastStatus, lastLeak, lastErr });
            return { p, isRunning, lastStatus, lastLeak, lastErr, healthState };
        });

        const counts = profileStates.reduce((acc, item) => {
            acc.all += 1;
            acc[item.healthState] = (acc[item.healthState] || 0) + 1;
            return acc;
        }, { all: 0, running: 0, attention: 0, idle: 0 });
        updateProfileFilterControls(counts);

        const filtered = profileStates.filter(({ p, healthState }) => {
            const text = searchText;
            const hitSearch = String(p.name || '').toLowerCase().includes(text) ||
                String(p.proxyStr || '').toLowerCase().includes(text) ||
                (Array.isArray(p.tags) && p.tags.some(t => String(t || '').toLowerCase().includes(text)));
            if (!hitSearch) return false;
            return matchesProfileStatusFilter(profileStatusFilter, healthState);
        });

        if (filtered.length === 0) {
            if (emptyEl) {
                emptyEl.style.display = '';
                const isSearch = searchText.length > 0;
                const hasStatusFilter = normalizeProfileStatusFilter(profileStatusFilter) !== 'all';
                const msg = isSearch
                    ? (t('noSearchResults') || 'No Search Results')
                    : (hasStatusFilter ? (t('noFilterResults') || 'No profiles in this view') : t('emptyStateMsg'));
                emptyEl.textContent = msg;
            }
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        filtered.forEach(({ p, isRunning, lastStatus, lastLeak, lastErr, healthState }, idx) => {
            const isRestarting = __restartState.has(p.id);
            const engine = p.proxyEngine || (p.fingerprint && p.fingerprint.proxyEngine) || 'xray';
            const proto = ((p.proxyStr || '').split('://')[0] || 'N/A').toUpperCase();
            const statusErrCode = __lastStatusErrorCode.get(p.id);
            const statusErrStage = __lastStatusErrorStage.get(p.id);
            const statusErrMessage = __lastStatusErrorMessage.get(p.id);

            const tr = document.createElement('tr');
            tr.className = 'profile-row';
            tr.setAttribute('data-profile-id', p.id);

            // Col 1: Checkbox
            const tdCheck = document.createElement('td');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'row-checkbox no-drag';
            cb.dataset.profileId = p.id;
            tdCheck.appendChild(cb);
            tr.appendChild(tdCheck);

            // Col 2: Row number
            const tdNum = document.createElement('td');
            tdNum.className = 'row-num';
            tdNum.textContent = String(idx + 1);
            tr.appendChild(tdNum);

            // Col 3: Name + Tags
            const tdName = document.createElement('td');
            const nameWrap = document.createElement('div');
            nameWrap.className = 'profile-name-cell';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = p.name || '';
            nameWrap.appendChild(nameSpan);

            if (Array.isArray(p.tags) && p.tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'tags';
                const maxTags = 3;
                const visibleTags = p.tags.slice(0, maxTags);
                visibleTags.forEach(tag => {
                    const chip = document.createElement('span');
                    chip.className = 'tag-chip';
                    chip.textContent = tag;
                    tagsDiv.appendChild(chip);
                });
                if (p.tags.length > maxTags) {
                    const extra = document.createElement('span');
                    extra.className = 'tag-chip';
                    extra.textContent = '+' + (p.tags.length - maxTags);
                    tagsDiv.appendChild(extra);
                }
                nameWrap.appendChild(tagsDiv);
            }
            tdName.appendChild(nameWrap);
            tr.appendChild(tdName);

            // Col 4: Proxy
            const tdProxy = document.createElement('td');
            const proxyBadge = document.createElement('span');
            proxyBadge.className = 'proxy-badge';
            proxyBadge.textContent = proto;
            tdProxy.appendChild(proxyBadge);
            tr.appendChild(tdProxy);

            // Col 5: Engine
            const tdEngine = document.createElement('td');
            const engineBadge = document.createElement('span');
            engineBadge.className = 'engine-badge';
            engineBadge.textContent = engine;
            tdEngine.appendChild(engineBadge);
            tr.appendChild(tdEngine);

            // Col 6: Status
            const tdStatus = document.createElement('td');
            const statusWrap = document.createElement('div');
            statusWrap.className = 'status-cell';
            statusWrap.id = 'status-' + p.id;

            const dot = document.createElement('span');
            dot.className = 'status-dot ' + healthState;

            const label = document.createElement('span');
            label.className = 'status-label ' + healthState;

            if (isRestarting) {
                label.textContent = t('workingStatus') || 'Working...';
            } else if (lastStatus === 'launch_failed') {
                dot.className = 'status-dot attention';
                label.className = 'status-label attention';
                label.textContent = t('launchFailedStatus') || 'Launch Failed';
            } else if (lastStatus === 'stop_failed') {
                dot.className = 'status-dot attention';
                label.className = 'status-label attention';
                label.textContent = t('stopFailedStatus') || 'Stop Failed';
            } else if (isRunning) {
                label.textContent = t('runningStatus') || 'Running';
            } else {
                label.textContent = t('idleStatus') || 'Idle';
            }

            statusWrap.appendChild(dot);
            statusWrap.appendChild(label);
            tdStatus.appendChild(statusWrap);
            tr.appendChild(tdStatus);

            // Col 7: Last Opened
            const tdLast = document.createElement('td');
            tdLast.style.cssText = 'font-size:12px; color:var(--text-secondary);';
            if (p.lastOpened) {
                try {
                    const d = new Date(p.lastOpened);
                    tdLast.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                    tdLast.textContent = '-';
                }
            } else {
                tdLast.textContent = '-';
            }
            tr.appendChild(tdLast);

            // Col 8: Actions
            const tdActions = document.createElement('td');
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'actions-cell';

            // Primary action button
            if (lastStatus === 'stop_failed' || lastStatus === 'launch_failed') {
                const btnRetry = document.createElement('button');
                btnRetry.className = 'action-btn primary no-drag';
                btnRetry.dataset.action = 'restart';
                btnRetry.textContent = t('retry') || 'Retry';
                btnRetry.disabled = isRestarting;
                actionsWrap.appendChild(btnRetry);
            } else if (isRunning) {
                const btnRestart = document.createElement('button');
                btnRestart.className = 'action-btn primary no-drag';
                btnRestart.dataset.action = 'restart';
                btnRestart.textContent = isRestarting ? (t('restarting') || '...') : (t('restart') || 'Restart');
                btnRestart.disabled = isRestarting;
                actionsWrap.appendChild(btnRestart);
            } else {
                const btnLaunch = document.createElement('button');
                btnLaunch.className = 'action-btn primary no-drag';
                btnLaunch.dataset.action = 'launch';
                btnLaunch.textContent = t('launch') || 'Open';
                btnLaunch.disabled = isRestarting;
                actionsWrap.appendChild(btnLaunch);
            }

            // Edit button
            const btnEdit = document.createElement('button');
            btnEdit.className = 'action-btn no-drag';
            btnEdit.dataset.action = 'edit';
            btnEdit.textContent = t('edit') || 'Edit';
            btnEdit.disabled = isRestarting;
            actionsWrap.appendChild(btnEdit);

            // More menu
            const more = document.createElement('details');
            more.className = 'profile-more-menu no-drag';
            const moreSummary = document.createElement('summary');
            moreSummary.className = 'more-btn';
            moreSummary.textContent = '\u22EF';
            moreSummary.title = t('moreActions') || 'More';
            more.appendChild(moreSummary);

            const moreList = document.createElement('div');
            moreList.className = 'profile-more-list';

            const pushMenuAction = (action, menuLabel, options = {}) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = (options.className || 'outline') + ' no-drag';
                btn.dataset.action = action;
                btn.textContent = menuLabel;
                if (options.title) btn.title = options.title;
                btn.disabled = !!options.disabled;
                moreList.appendChild(btn);
            };

            pushMenuAction('open-log', t('openLog') || 'Log', { disabled: isRestarting });
            if (isRunning) {
                pushMenuAction('leak-check', t('leakCheck') || 'LeakCheck', { disabled: isRestarting });
            }
            pushMenuAction('cookie-manager', t('cookieManagerBtn') || 'Cookies', { disabled: isRestarting });
            pushMenuAction('open-rotated-logs', t('rotatedLogsBtn') || 'Rotated', { disabled: isRestarting });
            pushMenuAction('clear-logs', t('clearLogs') || 'Clear Logs', { disabled: isRunning || isRestarting });
            pushMenuAction('delete', t('delete') || 'Delete', { className: 'danger', disabled: isRestarting });

            more.appendChild(moreList);
            more.addEventListener('toggle', () => {
                if (!more.open) {
                    more.classList.remove('open-upward');
                    return;
                }
                // Close other open menus
                document.querySelectorAll('.profile-more-menu[open]').forEach(m => {
                    if (m !== more) m.removeAttribute('open');
                });
            });

            actionsWrap.appendChild(more);
            tdActions.appendChild(actionsWrap);
            tr.appendChild(tdActions);

            tableBody.appendChild(tr);
        });

        // Select-all checkbox logic
        const selectAll = document.getElementById('selectAllProfiles');
        if (selectAll) {
            selectAll.checked = false;
            selectAll.onchange = () => {
                const checked = selectAll.checked;
                tableBody.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = checked; });
            };
        }
    } catch (e) { console.error(e); }
}


async function quickUpdatePreProxy(id, val) {
    const profiles = await window.electronAPI.getProfiles();
    const p = profiles.find(x => x.id === id);
    if (p) { p.preProxyOverride = val; await window.electronAPI.updateProfile(p); }
}

function updateProxyModeUi(prefix) {
    const modeEl = document.getElementById(`${prefix}ProxyMode`);
    const tunEl = document.getElementById(`${prefix}TunOptions`);
    const engineEl = document.getElementById(`${prefix}ProxyEngine`);
    if (!modeEl) return;
    const isTun = modeEl.value === 'tun';
    if (tunEl) tunEl.style.display = isTun ? 'block' : 'none';
    if (engineEl) {
        if (isTun) {
            engineEl.value = 'sing-box';
            engineEl.disabled = true;
        } else {
            engineEl.disabled = false;
        }
    }
}

const proxyBindNodeCache = { add: new Map(), edit: new Map() };

async function ensureProxyBindSettingsLoaded() {
    if (!globalSettings || typeof globalSettings !== 'object') {
        try { globalSettings = await window.electronAPI.getSettings(); } catch (e) { globalSettings = {}; }
    }
    if (!globalSettings || typeof globalSettings !== 'object') globalSettings = {};
    if (!Array.isArray(globalSettings.preProxies)) globalSettings.preProxies = [];
    if (!Array.isArray(globalSettings.subscriptions)) globalSettings.subscriptions = [];
    return globalSettings;
}

function getBoundProxyNodeMap(profiles) {
    const map = new Map();
    (profiles || []).forEach((p) => {
        const id = p && p.proxyBindId ? String(p.proxyBindId) : '';
        if (!id) return;
        if (!map.has(id)) map.set(id, { profileId: p.id, name: p.name || id });
    });
    return map;
}

function getProxyNodeRegionLabel(node) {
    const info = node && node.ipInfo ? node.ipInfo : null;
    const country = info && info.country ? String(info.country) : '';
    const city = info && info.city ? String(info.city) : '';
    const region = info && info.region ? String(info.region) : '';
    if (country && city) return `${country} / ${city}`;
    if (country && region) return `${country} / ${region}`;
    if (country) return country;
    if (city) return city;
    if (region) return region;
    return tText('proxyRegionUnknown', 'Unknown');
}

function getProxyNodeGroupLabel(node) {
    const groupId = String((node && node.groupId) || 'manual').trim() || 'manual';
    if (groupId === 'manual') return t('groupManual') || 'Manual';
    if (node && node.groupName) return String(node.groupName);
    const subs = globalSettings && Array.isArray(globalSettings.subscriptions) ? globalSettings.subscriptions : [];
    const sub = subs.find(s => s && s.id === groupId);
    return sub && sub.name ? String(sub.name) : tText('proxyGroupUnknown', 'Group');
}

function buildProxyBindOptions(mode, { filterText = '', currentProfileId = '', selectedId = '', profiles = [] } = {}) {
    const selectEl = document.getElementById(`${mode}ProxyBindSelect`);
    if (!selectEl) return { nodeMap: new Map(), boundMap: new Map() };
    const boundMap = getBoundProxyNodeMap(profiles);
    const nodes = Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies.slice() : [];
    const filter = String(filterText || '').trim().toLowerCase();
    const nodeMap = new Map();
    const groups = new Map();

    nodes.forEach((node) => {
        if (!node || !node.id || !node.url) return;
        if (node.enable === false) return;
        // Hide known-bad nodes in binding selector (failed tests / invalid).
        if (node.lastTestOk === false) return;
        const id = String(node.id);
        const remark = getProxyNodeDisplayRemark(node);
        const region = getProxyNodeRegionLabel(node);
        const groupLabel = getProxyNodeGroupLabel(node);
        const ip = node.ipInfo && node.ipInfo.ip ? String(node.ipInfo.ip) : '';
        const country = node.ipInfo && node.ipInfo.country ? String(node.ipInfo.country) : '';
        const city = node.ipInfo && node.ipInfo.city ? String(node.ipInfo.city) : '';
        const regionRaw = node.ipInfo && node.ipInfo.region ? String(node.ipInfo.region) : '';
        const search = [remark, node.url, ip, country, city, regionRaw, region, groupLabel].join(' ').toLowerCase();
        const isSelected = selectedId && String(selectedId) === id;
        if (filter && !search.includes(filter) && !isSelected) return;
        const label = region || tText('proxyRegionUnknown', 'Unknown');
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push({ id, node, remark, region, groupLabel, ip });
        nodeMap.set(id, node);
    });

    selectEl.textContent = '';
    const manualOpt = document.createElement('option');
    manualOpt.value = '';
    manualOpt.textContent = tText('proxyBindManualOption', 'Manual input (no binding)');
    selectEl.appendChild(manualOpt);

    if (selectedId && !nodeMap.has(String(selectedId))) {
        const missingOpt = document.createElement('option');
        missingOpt.value = String(selectedId);
        missingOpt.textContent = tFormat('proxyBindMissingNode', 'Bound node missing ({id})', { id: String(selectedId).slice(0, 8) });
        selectEl.appendChild(missingOpt);
        nodeMap.set(String(selectedId), null);
    }

    if (groups.size === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = tText('proxyBindNoNodes', 'No available nodes');
        opt.disabled = true;
        selectEl.appendChild(opt);
    } else {
        const groupLabels = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
        groupLabels.forEach((label) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = label;
            const items = groups.get(label).sort((a, b) => a.remark.localeCompare(b.remark));
            items.forEach((item) => {
                const opt = document.createElement('option');
                opt.value = item.id;
                const bound = boundMap.get(item.id);
                const boundByOther = bound && bound.profileId && bound.profileId !== currentProfileId;
                let text = item.remark;
                const metaParts = [];
                if (item.ip) metaParts.push(item.ip);
                if (item.groupLabel) metaParts.push(item.groupLabel);
                if (metaParts.length) text += ` · ${metaParts.join(' · ')}`;
                if (bound && boundByOther) {
                    text += ` · ${tFormat('proxyBindUsedBy', 'Bound: {name}', { name: bound.name || bound.profileId })}`;
                }
                opt.textContent = text;
                if (boundByOther) opt.disabled = true;
                optgroup.appendChild(opt);
            });
            selectEl.appendChild(optgroup);
        });
    }

    selectEl.value = selectedId ? String(selectedId) : '';
    proxyBindNodeCache[mode] = nodeMap;
    return { nodeMap, boundMap };
}

function applyProxyBindSelection(mode) {
    const selectEl = document.getElementById(`${mode}ProxyBindSelect`);
    const proxyEl = document.getElementById(`${mode}Proxy`);
    const hintEl = document.getElementById(`${mode}ProxyBindHint`);
    if (!selectEl || !proxyEl) return;
    const selectedId = String(selectEl.value || '').trim();
    const nodeMap = proxyBindNodeCache[mode] || new Map();
    const node = selectedId ? nodeMap.get(selectedId) : null;
    if (selectedId && node && node.url) {
        proxyEl.value = String(node.url || '');
        proxyEl.readOnly = true;
        proxyEl.classList.add('proxy-bound-input');
        if (hintEl) hintEl.textContent = tFormat('proxyBindSelectedHint', 'Bound to {name}', { name: getProxyNodeDisplayRemark(node) });
    } else {
        proxyEl.readOnly = false;
        proxyEl.classList.remove('proxy-bound-input');
        if (hintEl) hintEl.textContent = tText('proxyBindHint', 'Selecting a node binds it exclusively.');
    }
}

function resolveProxyBindSelection(mode, profiles, currentProfileId) {
    const selectEl = document.getElementById(`${mode}ProxyBindSelect`);
    if (!selectEl) return { bindId: '', node: null };
    const bindId = String(selectEl.value || '').trim();
    if (!bindId) return { bindId: '', node: null };
    const nodeMap = proxyBindNodeCache[mode] || new Map();
    const node = nodeMap.get(bindId);
    if (!node || !node.url) {
        return { error: tFormat('proxyBindMissingError', 'Bound node not found ({id})', { id: bindId }) };
    }
    const boundMap = getBoundProxyNodeMap(profiles);
    const bound = boundMap.get(bindId);
    if (bound && bound.profileId && bound.profileId !== currentProfileId) {
        return { error: tFormat('proxyBindInUse', 'Node already bound to {name}', { name: bound.name || bound.profileId }) };
    }
    return { bindId, node };
}

async function initProxyBindControls(mode, { profile } = {}) {
    const filterEl = document.getElementById(`${mode}ProxyBindFilter`);
    const selectEl = document.getElementById(`${mode}ProxyBindSelect`);
    if (!filterEl || !selectEl) return;
    await ensureProxyBindSettingsLoaded();
    let profiles = window.__cachedProfiles;
    if (!Array.isArray(profiles)) {
        try { profiles = await window.electronAPI.getProfiles(); } catch (e) { profiles = []; }
    }
    const currentProfileId = profile && profile.id ? profile.id : '';
    const initialSelected = profile && profile.proxyBindId ? String(profile.proxyBindId) : '';
    const build = () => {
        const chosen = selectEl.value || initialSelected;
        buildProxyBindOptions(mode, {
            filterText: filterEl.value,
            currentProfileId,
            selectedId: chosen,
            profiles
        });
        applyProxyBindSelection(mode);
    };
    if (!filterEl.dataset.bindInit) {
        filterEl.addEventListener('input', build);
        filterEl.dataset.bindInit = '1';
    }
    if (!selectEl.dataset.bindInit) {
        selectEl.addEventListener('change', () => applyProxyBindSelection(mode));
        selectEl.dataset.bindInit = '1';
    }
    build();
    if (initialSelected) {
        selectEl.value = initialSelected;
        applyProxyBindSelection(mode);
    }
}

async function openAddModal() {
    document.getElementById('addName').value = '';
    document.getElementById('addProxy').value = '';
    const addProxyInput = document.getElementById('addProxy');
    if (addProxyInput) {
        addProxyInput.readOnly = false;
        addProxyInput.classList.remove('proxy-bound-input');
    }
    document.getElementById('addTags').value = ''; // Clear tags
    document.getElementById('addTimezone').value = 'Auto (No Change)';
    const engineEl = document.getElementById('addProxyEngine');
    if (engineEl) engineEl.value = 'xray';
    const consistencyEl = document.getElementById('addProxyConsistency');
    if (consistencyEl) consistencyEl.value = 'warn';

    // Initialize location dropdown
    initCustomCityDropdown('addCity', 'addCityDropdown');
    document.getElementById('addCity').value = 'Auto (IP Based)';

    // Initialize language dropdown
    initCustomLanguageDropdown('addLanguage', 'addLanguageDropdown');
    document.getElementById('addLanguage').value = 'Auto (System Default)';

    const modeEl = document.getElementById('addProxyMode');
    if (modeEl) modeEl.value = 'app_proxy';
    const tunAuto = document.getElementById('addTunAutoRoute');
    if (tunAuto) tunAuto.checked = true;
    const tunStrict = document.getElementById('addTunStrictRoute');
    if (tunStrict) tunStrict.checked = true;
    const tunDns = document.getElementById('addTunDnsHijack');
    if (tunDns) tunDns.checked = true;
    const tunMtu = document.getElementById('addTunMtu');
    if (tunMtu) tunMtu.value = '';
    updateProxyModeUi('add');

    const bindFilter = document.getElementById('addProxyBindFilter');
    if (bindFilter) bindFilter.value = '';
    const bindSelect = document.getElementById('addProxyBindSelect');
    if (bindSelect) bindSelect.value = '';
    await initProxyBindControls('add');

    // Proxy source (manual vs auto allocate)
    const sourceSel = document.getElementById('addProxySource');
    if (sourceSel) sourceSel.value = 'manual';
    try { syncAddProxySourceUi(); } catch (e) { }

    document.getElementById('addModal').style.display = 'flex';
}
function closeAddModal() { document.getElementById('addModal').style.display = 'none'; }

function isAddAutoAllocateEnabled() {
    const sel = document.getElementById('addProxySource');
    return !!(sel && sel.value === 'allocate');
}

function collectAllocatorCountries(nodes, { passOnly = true } = {}) {
    const out = new Set();
    (nodes || []).forEach((n) => {
        if (!n || !n.ipInfo) return;
        if (n.enable === false) return;
        if (passOnly && n.lastTestOk !== true) return;
        const c = n.ipInfo.country ? String(n.ipInfo.country).trim() : '';
        if (c) out.add(c);
    });
    return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function collectAllocatorCities(nodes, country, { passOnly = true } = {}) {
    const want = String(country || '').trim().toLowerCase();
    const out = new Set();
    if (!want) return [];
    (nodes || []).forEach((n) => {
        if (!n || !n.ipInfo) return;
        if (n.enable === false) return;
        if (passOnly && n.lastTestOk !== true) return;
        const c = n.ipInfo.country ? String(n.ipInfo.country).trim().toLowerCase() : '';
        if (!c || c !== want) return;
        const city = n.ipInfo.city ? String(n.ipInfo.city).trim() : '';
        if (city) out.add(city);
    });
    return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function fillDatalist(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    (items || []).forEach((v) => {
        const opt = document.createElement('option');
        opt.value = String(v);
        el.appendChild(opt);
    });
}

function syncAddProxySourceUi() {
    const manual = document.getElementById('addManualProxyBlock');
    const alloc = document.getElementById('addAutoAllocBlock');
    const isAlloc = isAddAutoAllocateEnabled();
    if (manual) manual.style.display = isAlloc ? 'none' : '';
    if (alloc) alloc.style.display = isAlloc ? '' : 'none';

    if (isAlloc) {
        try {
            const nodes = globalSettings && Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies : [];
            fillDatalist('addAllocCountryList', collectAllocatorCountries(nodes, { passOnly: true }));
            const countryEl = document.getElementById('addAllocCountry');
            const cityEl = document.getElementById('addAllocCity');
            const country = countryEl ? countryEl.value : '';
            fillDatalist('addAllocCityList', collectAllocatorCities(nodes, country, { passOnly: true }));
            if (cityEl && !String(cityEl.value || '').trim()) {
                // keep empty by default
            }
        } catch (e) { }
    }
}

function ensureAddProxySourceEventsBound() {
    const sel = document.getElementById('addProxySource');
    if (!sel || sel.dataset.bindInit) return;
    sel.addEventListener('change', () => {
        syncAddProxySourceUi();
    });
    sel.dataset.bindInit = '1';

    const countryEl = document.getElementById('addAllocCountry');
    if (countryEl && !countryEl.dataset.bindInit) {
        countryEl.addEventListener('input', () => {
            try {
                const nodes = globalSettings && Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies : [];
                fillDatalist('addAllocCityList', collectAllocatorCities(nodes, countryEl.value, { passOnly: true }));
            } catch (e) { }
        });
        countryEl.dataset.bindInit = '1';
    }
}

async function allocateProfilesFromAddModal() {
    await ensureProxyBindSettingsLoaded();
    const namePrefix = document.getElementById('addName').value.trim();
    const tagsStr = document.getElementById('addTags').value;
    const tags = tagsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);

    const timezoneInput = document.getElementById('addTimezone').value;
    const timezone = timezoneInput === 'Auto (No Change)' ? 'Auto' : timezoneInput;
    const languageInput = document.getElementById('addLanguage').value;
    const language = getLanguageCode(languageInput);

    const proxyMode = document.getElementById('addProxyMode') ? document.getElementById('addProxyMode').value : 'app_proxy';
    let proxyEngine = document.getElementById('addProxyEngine') ? document.getElementById('addProxyEngine').value : 'xray';
    if (proxyMode === 'tun') proxyEngine = 'sing-box';
    const tun = proxyMode === 'tun' ? {
        auto_route: document.getElementById('addTunAutoRoute') ? document.getElementById('addTunAutoRoute').checked : true,
        strict_route: document.getElementById('addTunStrictRoute') ? document.getElementById('addTunStrictRoute').checked : true,
        dns_hijack: document.getElementById('addTunDnsHijack') ? document.getElementById('addTunDnsHijack').checked : true,
        mtu: document.getElementById('addTunMtu') && document.getElementById('addTunMtu').value ? parseInt(document.getElementById('addTunMtu').value) : undefined
    } : undefined;

    const proxyConsistency = document.getElementById('addProxyConsistency') ? document.getElementById('addProxyConsistency').value : 'warn';

    const country = document.getElementById('addAllocCountry') ? document.getElementById('addAllocCountry').value.trim() : '';
    const city = document.getElementById('addAllocCity') ? document.getElementById('addAllocCity').value.trim() : '';
    const countRaw = document.getElementById('addAllocCount') ? document.getElementById('addAllocCount').value : '1';
    const count = Math.max(1, Math.min(200, parseInt(countRaw || '1') || 1));
    const strategy = document.getElementById('addAllocStrategy') ? document.getElementById('addAllocStrategy').value : 'round_robin';
    if (!country) return showAlert(tText('allocCountryRequired', 'Country is required for auto allocation.'));

    const res = await window.electronAPI.invoke('allocate-proxy-profiles', {
        namePrefix,
        tags,
        timezone,
        language,
        proxyMode: proxyMode === 'tun' ? 'tun' : 'app_proxy',
        proxyEngine,
        tun,
        proxyConsistency,
        country,
        city,
        count,
        strategy,
        allowPartial: true,
        includeUntested: false,
    });

    if (!res || res.success === false) {
        const err = formatResultError(res, tText('allocFailed', 'Auto allocation failed'));
        showAlert((tText('allocFailed', 'Auto allocation failed') || 'Auto allocation failed') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
        return;
    }

    closeAddModal();
    await loadProfiles();
    const msg = tFormat('allocSuccess', 'Allocated {count} profiles (shortage {shortage})', {
        count: res.createdCount || 0,
        shortage: res.shortage || 0
    });
    showToast(msg, 2400);
}

async function saveNewProfile() {
    // Auto allocate flow
    if (isAddAutoAllocateEnabled()) {
        try {
            return await allocateProfilesFromAddModal();
        } catch (e) {
            const err = formatIpcError(e);
            showAlert((tText('allocFailed', 'Auto allocation failed') || 'Auto allocation failed') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
            return;
        }
    }

    const nameBase = document.getElementById('addName').value.trim();
    const proxyText = document.getElementById('addProxy').value.trim();
    const proxyMode = document.getElementById('addProxyMode') ? document.getElementById('addProxyMode').value : 'app_proxy';
    let proxyEngine = document.getElementById('addProxyEngine') ? document.getElementById('addProxyEngine').value : 'xray';
    if (proxyMode === 'tun') proxyEngine = 'sing-box';
    const tun = proxyMode === 'tun' ? {
        auto_route: document.getElementById('addTunAutoRoute') ? document.getElementById('addTunAutoRoute').checked : true,
        strict_route: document.getElementById('addTunStrictRoute') ? document.getElementById('addTunStrictRoute').checked : true,
        dns_hijack: document.getElementById('addTunDnsHijack') ? document.getElementById('addTunDnsHijack').checked : true,
        mtu: document.getElementById('addTunMtu') && document.getElementById('addTunMtu').value ? parseInt(document.getElementById('addTunMtu').value) : undefined
    } : undefined;
    const settings = await window.electronAPI.getSettings().catch(() => ({}));
    const defaultConsistency = settings.defaultProxyConsistency || 'warn';
    const proxyConsistency = document.getElementById('addProxyConsistency') ? document.getElementById('addProxyConsistency').value : defaultConsistency;
    const tagsStr = document.getElementById('addTags').value;
    const timezoneInput = document.getElementById('addTimezone').value;
    // 将 "Auto (No Change)" 转换为 "Auto" 存储
    const timezone = timezoneInput === 'Auto (No Change)' ? 'Auto' : timezoneInput;

    // Get city/location value
    const cityInput = document.getElementById('addCity').value;
    let city = null;
    let geolocation = null;
    if (cityInput && cityInput !== 'Auto (IP Based)') {
        const cityData = window.CITY_DATA ? window.CITY_DATA.find(c => c.name === cityInput) : null;
        if (cityData) {
            city = cityData.name;
            geolocation = { latitude: cityData.lat, longitude: cityData.lng, accuracy: 100 };
        }
    }

    // Get language value
    const languageInput = document.getElementById('addLanguage').value;
    const language = getLanguageCode(languageInput);

    const tags = tagsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    const profiles = await window.electronAPI.getProfiles().catch(() => []);
    const bindSelection = resolveProxyBindSelection('add', profiles, '');
    if (bindSelection && bindSelection.error) {
        return showAlert(bindSelection.error);
    }

    // 分割多行代理链接
    let proxyLines = proxyText.split('\n').map(l => l.trim()).filter(l => l);
    if (bindSelection && bindSelection.bindId && proxyLines.length > 1) {
        return showAlert(tText('proxyBindBatchNotAllowed', 'Bound node does not support batch create. Use one node only.'));
    }
    if (bindSelection && bindSelection.bindId && bindSelection.node) {
        proxyLines = [String(bindSelection.node.url || '').trim()].filter(l => l);
    }

    if (proxyLines.length === 0) {
        return showAlert(t('inputReq'));
    }

    // 批量创建环境
    let createdCount = 0;
    for (let i = 0; i < proxyLines.length; i++) {
        const proxyStr = proxyLines[i];
        let name;

        if (!nameBase) {
            // 无名称输入，使用代理备注
            const boundRemark = bindSelection && bindSelection.node && bindSelection.node.remark ? String(bindSelection.node.remark) : '';
            name = boundRemark || getProxyRemark(proxyStr) || `Profile-${String(i + 1).padStart(2, '0')}`;
        } else if (proxyLines.length === 1) {
            // 单个代理，使用输入名称
            name = nameBase;
        } else {
            // 多个代理，添加序号
            name = `${nameBase}-${String(i + 1).padStart(2, '0')}`;
        }

        try {
            const consistencyPolicy = { enforce: true, onMismatch: proxyConsistency };
            const allowAutofix = { language: proxyConsistency === 'autofix', geo: proxyConsistency === 'autofix' };
            const payload = {
                name,
                proxyStr,
                tags,
                timezone,
                city,
                geolocation,
                language,
                proxyEngine,
                proxyMode,
                tun,
                proxyPolicy: { autoLink: true, consistencyPolicy, allowAutofix }
            };
            if (bindSelection && bindSelection.bindId) {
                payload.proxyBindId = bindSelection.bindId;
            }
            await window.electronAPI.saveProfile(payload);
            createdCount++;
        } catch (e) {
            console.error(`Failed to create profile ${name}:`, e);
            // When binding is requested, failures must be surfaced (backend may reject conflicts).
            if (bindSelection && bindSelection.bindId) {
                const err = formatIpcError(e);
                showAlert((tText('profileCreateFailed', 'Create failed') || 'Create failed') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
                break;
            }
        }
    }

    closeAddModal();
    await loadProfiles();

    if (proxyLines.length > 1) {
        showToast(`${t('msgBatchCreated') || '批量创建成功'}: ${createdCount} ${t('msgProfiles') || '个环境'}`, 2200);
    }
}

async function launch(id) {
    try {
        const watermarkStyle = localStorage.getItem('geekez_watermark_style') || 'enhanced';
        const msg = await window.electronAPI.launchProfile(id, watermarkStyle, {});
        if (msg && msg.includes(':')) showAlert(msg);
    } catch (e) {
        const launchErr = formatIpcError(e);
        await showProfileErrorWithActions('Error', launchErr, 'launch', id, async () => { await launch(id); });
    }
}

function formatConsistencyIssues(issues) {
    if (!Array.isArray(issues) || issues.length === 0) return '-';
    return issues.map(i => {
        const code = i && i.code ? i.code : 'ISSUE';
        const msg = i && i.message ? i.message : '';
        return `- ${code}${msg ? `: ${msg}` : ''}`;
    }).join('\n');
}

async function restart(id) {
    try {
        if (__restartState.has(id)) return;
        __restartState.add(id);
        await loadProfiles();
        const profiles = await window.electronAPI.getProfiles();
        const p = profiles.find(x => x.id === id);
        const lastErr = p && p.diagnostics ? p.diagnostics.lastError : null;
        if (lastErr && lastErr.message && typeof showConfirmChoice === 'function') {
            const lastErrCodeSuffix = lastErr && lastErr.errorCode ? ` [${lastErr.errorCode}]` : '';
            const lastErrHint = getProfileErrorActionHint(lastErr && lastErr.errorCode, lastErr && lastErr.stage);
            const lastErrConflictSummary = await buildTunConflictSummary(id, lastErr && lastErr.errorCode);
            const lastErrPlan = getProfileErrorActionPlan(lastErr && lastErr.errorCode, lastErr && lastErr.stage, id);
            // Pause restart flow until user chooses.
            const shouldContinue = await new Promise((resolve) => {
                showConfirmChoice(
                    `${t('lastError') || 'Last error'}${lastErrCodeSuffix}: ${(lastErr.message || '').slice(0, 160)}${lastErrHint ? `\n${lastErrHint}` : ''}${lastErrConflictSummary ? `\n${lastErrConflictSummary}` : ''}\n${t('chooseAction') || 'Choose action:'}`,
                    {
                        altText: (lastErrPlan && lastErrPlan.altText) ? lastErrPlan.altText : (t('openLog') || 'Open Log'),
                        okText: t('retryNow') || 'Retry Now',
                        onAlt: async () => {
                            let continueAfterAlt = false;
                            try {
                                if (lastErrPlan && typeof lastErrPlan.onAlt === 'function') {
                                    continueAfterAlt = Boolean(await lastErrPlan.onAlt());
                                } else {
                                    await openProfileLogById(id);
                                }
                            } catch (e) { }
                            resolve(continueAfterAlt);
                        },
                        onConfirm: async () => { resolve(true); },
                        onCancel: async () => { resolve(false); }
                    }
                );
            });
            if (!shouldContinue) return;
        }
        // Immediately reflect work state in UI
        __restartState.add(id);
        await loadProfiles();
        const watermarkStyle = localStorage.getItem('geekez_watermark_style') || 'enhanced';
        const stopResult = await window.electronAPI.stopProfile(id);
        if (stopResult && stopResult.success === false) {
            const stopErr = formatResultError(stopResult, 'Stop failed');
            await showProfileErrorWithActions('Restart Error', stopErr, 'stop', id, async () => { await restart(id); });
            return;
        }
        await launch(id);
    } catch (e) {
        const restartErr = formatIpcError(e);
        await showProfileErrorWithActions('Restart Error', restartErr, '', id, async () => { await restart(id); });
    } finally {
        __restartState.delete(id);
        await loadProfiles();
    }
}

function remove(id) {
    showConfirm(t('confirmDel'), async () => { await window.electronAPI.deleteProfile(id); await loadProfiles(); });
}

async function stopProfile(id) {
    try {
        const result = await window.electronAPI.stopProfile(id);
        if (result && result.success === false) {
            const stopErr = formatResultError(result, 'Stop failed');
            await showProfileErrorWithActions('Stop Error', stopErr, 'stop', id, async () => { await stopProfile(id); });
        }
    } catch (e) {
        const stopErr = formatIpcError(e);
        await showProfileErrorWithActions('Stop Error', stopErr, 'stop', id, async () => { await stopProfile(id); });
    }
}

async function openEditModal(id) {
    const profiles = await window.electronAPI.getProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    currentEditId = id;
    window.__geekez_edit_snapshot = {
        id,
        proxyStr: p.proxyStr,
        proxyEngine: p.proxyEngine || (p.fingerprint && p.fingerprint.proxyEngine) || 'xray',
        proxyMode: p.proxyMode || 'app_proxy',
        proxyBindId: p.proxyBindId || ''
    };
    const fp = p.fingerprint || {};
    document.getElementById('editName').value = p.name;
    document.getElementById('editProxy').value = p.proxyStr;
    const editProxyEngine = document.getElementById('editProxyEngine');
    if (editProxyEngine) editProxyEngine.value = p.proxyEngine || (fp && fp.proxyEngine) || 'xray';

    const editProxyMode = document.getElementById('editProxyMode');
    if (editProxyMode) editProxyMode.value = p.proxyMode || 'app_proxy';
    const tun = (p.tun && typeof p.tun === 'object') ? p.tun : {};
    const tunAuto = document.getElementById('editTunAutoRoute');
    if (tunAuto) tunAuto.checked = tun.auto_route === false ? false : true;
    const tunStrict = document.getElementById('editTunStrictRoute');
    if (tunStrict) tunStrict.checked = tun.strict_route === false ? false : true;
    const tunDns = document.getElementById('editTunDnsHijack');
    if (tunDns) tunDns.checked = tun.dns_hijack === false ? false : true;
    const tunMtu = document.getElementById('editTunMtu');
    if (tunMtu) tunMtu.value = (tun.mtu && Number.isFinite(Number(tun.mtu))) ? String(Number(tun.mtu)) : '';
    updateProxyModeUi('edit');

    const editConsistency = document.getElementById('editProxyConsistency');
    if (editConsistency) {
        const onMismatch = (p.proxyPolicy && p.proxyPolicy.consistencyPolicy && p.proxyPolicy.consistencyPolicy.onMismatch) ? p.proxyPolicy.consistencyPolicy.onMismatch : 'warn';
        editConsistency.value = onMismatch;
    }
    const editAutofixLang = document.getElementById('editProxyAutofixLanguage');
    if (editAutofixLang) {
        const allow = (p.proxyPolicy && p.proxyPolicy.allowAutofix) ? p.proxyPolicy.allowAutofix : null;
        editAutofixLang.value = (allow && allow.language === true) ? 'on' : 'off';
    }
    const editAutofixGeo = document.getElementById('editProxyAutofixGeo');
    if (editAutofixGeo) {
        const allow = (p.proxyPolicy && p.proxyPolicy.allowAutofix) ? p.proxyPolicy.allowAutofix : null;
        editAutofixGeo.value = (allow && allow.geo === true) ? 'on' : 'off';
    }
    document.getElementById('editTags').value = (p.tags || []).join(', ');

    // 回填时区，将 "Auto" 转换为 "Auto (No Change)" 显示
    const savedTimezone = fp.timezone || 'Auto';
    const displayTimezone = savedTimezone === 'Auto' ? 'Auto (No Change)' : savedTimezone;
    document.getElementById('editTimezone').value = displayTimezone;

    initCustomCityDropdown('editCity', 'editCityDropdown');

    // Use stored value directly or Default English Auto
    const savedCity = fp.city || "Auto (IP Based)";
    document.getElementById('editCity').value = savedCity;

    const sel = document.getElementById('editPreProxyOverride');
    sel.options[0].text = t('optDefault'); sel.options[1].text = t('optOn'); sel.options[2].text = t('optOff');
    sel.value = p.preProxyOverride || 'default';
    document.getElementById('editResW').value = fp.screen?.width || 1920;
    document.getElementById('editResH').value = fp.screen?.height || 1080;

    // Init Language Dropdown
    initCustomLanguageDropdown('editLanguage', 'editLanguageDropdown');
    document.getElementById('editLanguage').value = getLanguageName(fp.language || 'auto');

    // Load debug port and show/hide based on global setting
    const settings = await window.electronAPI.getSettings();
    const debugPortSection = document.getElementById('debugPortSection');
    if (settings.enableRemoteDebugging) {
        debugPortSection.style.display = 'block';
        document.getElementById('editDebugPort').value = p.debugPort || '';
    } else {
        debugPortSection.style.display = 'none';
    }

    // Load custom args and show/hide based on global setting
    const customArgsSection = document.getElementById('customArgsSection');
    if (settings.enableCustomArgs) {
        customArgsSection.style.display = 'block';
        document.getElementById('editCustomArgs').value = p.customArgs || '';
    } else {
        customArgsSection.style.display = 'none';
    }

    const bindFilter = document.getElementById('editProxyBindFilter');
    if (bindFilter) bindFilter.value = '';
    const bindSelect = document.getElementById('editProxyBindSelect');
    if (bindSelect) bindSelect.value = p.proxyBindId ? String(p.proxyBindId) : '';
    await initProxyBindControls('edit', { profile: p });

    document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; currentEditId = null; }
async function saveEditProfile() {
    console.log('[saveEditProfile] Called, currentEditId:', currentEditId);
    if (!currentEditId) return;
    const profiles = await window.electronAPI.getProfiles();
    let p = profiles.find(x => x.id === currentEditId);
    console.log('[saveEditProfile] Found profile:', p);
    if (p) {
        const runningIds = await window.electronAPI.getRunningIds();
        const wasRunning = runningIds.includes(p.id);
        const before = window.__geekez_edit_snapshot || { proxyStr: p.proxyStr, proxyEngine: p.proxyEngine || 'xray', proxyMode: p.proxyMode || 'app_proxy' };
        p.name = document.getElementById('editName').value;
        p.proxyStr = document.getElementById('editProxy').value;
        const bindSelection = resolveProxyBindSelection('edit', profiles, p.id);
        if (bindSelection && bindSelection.error) {
            showAlert(bindSelection.error);
            return;
        }
        if (bindSelection && bindSelection.bindId && bindSelection.node) {
            p.proxyBindId = bindSelection.bindId;
            p.proxyStr = String(bindSelection.node.url || '');
        } else if (p.proxyBindId) {
            delete p.proxyBindId;
        }
        const proxyMode = document.getElementById('editProxyMode') ? document.getElementById('editProxyMode').value : (p.proxyMode || 'app_proxy');
        const editProxyEngine = document.getElementById('editProxyEngine');
        p.proxyMode = proxyMode === 'tun' ? 'tun' : 'app_proxy';
        if (p.proxyMode === 'tun') {
            p.proxyEngine = 'sing-box';
            p.tun = {
                auto_route: document.getElementById('editTunAutoRoute') ? document.getElementById('editTunAutoRoute').checked : true,
                strict_route: document.getElementById('editTunStrictRoute') ? document.getElementById('editTunStrictRoute').checked : true,
                dns_hijack: document.getElementById('editTunDnsHijack') ? document.getElementById('editTunDnsHijack').checked : true,
                mtu: document.getElementById('editTunMtu') && document.getElementById('editTunMtu').value ? parseInt(document.getElementById('editTunMtu').value) : undefined
            };
        } else {
            if (editProxyEngine) p.proxyEngine = editProxyEngine.value || 'xray';
            if (p.tun) delete p.tun;
        }
        const editConsistency = document.getElementById('editProxyConsistency');
        const onMismatch = editConsistency ? (editConsistency.value || 'warn') : 'warn';
        p.proxyPolicy = p.proxyPolicy || {};
        p.proxyPolicy.autoLink = true;
        p.proxyPolicy.consistencyPolicy = { enforce: true, onMismatch };
        const editAutofixLang = document.getElementById('editProxyAutofixLanguage');
        const editAutofixGeo = document.getElementById('editProxyAutofixGeo');
        p.proxyPolicy.allowAutofix = {
            language: editAutofixLang ? (editAutofixLang.value === 'on') : false,
            geo: editAutofixGeo ? (editAutofixGeo.value === 'on') : false
        };
        const tagsStr = document.getElementById('editTags').value;
        p.tags = tagsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
        p.preProxyOverride = document.getElementById('editPreProxyOverride').value;

        if (!p.fingerprint) p.fingerprint = {};
        p.fingerprint.screen = { width: parseInt(document.getElementById('editResW').value), height: parseInt(document.getElementById('editResH').value) };
        p.fingerprint.window = p.fingerprint.screen;
        const timezoneValue = document.getElementById('editTimezone').value;
        console.log('[saveEditProfile] Timezone value:', timezoneValue);
        p.fingerprint.timezone = timezoneValue === 'Auto (No Change)' ? 'Auto' : timezoneValue;
        console.log('[saveEditProfile] Converted timezone:', p.fingerprint.timezone);


        // Save City & Geolocation
        const cityInput = document.getElementById('editCity').value;
        if (cityInput && cityInput !== 'Auto (IP Based)') {
            const cityData = window.CITY_DATA ? window.CITY_DATA.find(c => c.name === cityInput) : null;
            if (cityData) {
                p.fingerprint.city = cityData.name;
                p.fingerprint.geolocation = { latitude: cityData.lat, longitude: cityData.lng, accuracy: 100 };
            }
        } else {
            // Auto mode: remove geolocation to let system/IP decide
            delete p.fingerprint.city;
            delete p.fingerprint.geolocation;
        }
        p.fingerprint.language = getLanguageCode(document.getElementById('editLanguage').value);

        // Save debug port if enabled
        const debugPortInput = document.getElementById('editDebugPort');
        if (debugPortInput.parentElement.style.display !== 'none') {
            const portValue = debugPortInput.value.trim();
            p.debugPort = portValue ? parseInt(portValue) : null;
        }

        // Save custom args if enabled
        const customArgsInput = document.getElementById('editCustomArgs');
        if (customArgsInput.parentElement.style.display !== 'none') {
            p.customArgs = customArgsInput.value.trim();
        }

        console.log('[saveEditProfile] Calling updateProfile...');
        try {
            const ok = await window.electronAPI.updateProfile(p);
            if (!ok) {
                showAlert(tText('profileSaveFailed', 'Save failed. Please retry.'));
                return;
            }
        } catch (e) {
            const err = formatIpcError(e);
            showAlert((tText('profileSaveFailed', 'Save failed') || 'Save failed') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
            return;
        }
        console.log('[saveEditProfile] Profile updated successfully');
        closeEditModal(); await loadProfiles();

        const proxyChanged = (before.proxyStr !== p.proxyStr) || (before.proxyEngine !== p.proxyEngine) || (before.proxyMode !== p.proxyMode);
        if (wasRunning && proxyChanged) {
            showConfirm('Proxy settings changed. Restart this profile now to apply?', async () => {
                await stopProfile(p.id);
                await launch(p.id);
            });
        }
    }
}

async function openProxyManager() {
    globalSettings = await window.electronAPI.getSettings();
    if (!globalSettings.subscriptions) globalSettings.subscriptions = [];
    proxyCustomQueryPresets = loadProxyCustomQueryPresets();
    proxyPresetTrustPolicy = loadProxyPresetTrustPolicy();
    proxyPresetPinnedKeys = loadProxyPresetPinnedKeys();
    proxyPresetSignerKeyId = loadProxyPresetSignerKeyId();
    proxyPresetIssuerTemplate = loadProxyPresetIssuerTemplate();
    proxyReplayImportRouteMode = loadProxyReplayImportRouteMode();
    proxyReplayRouteMap = loadProxyReplayRouteMap();
    proxyIssuerTemplateRemediationHint = loadProxyIssuerTemplateRemediationHint();
    proxyTrustExplainabilityPack = loadProxyTrustExplainabilityPack();
    proxyListViewState = loadProxyListViewState();
    proxySidebarCollapsed = false;
    proxySecondaryFiltersExpanded = loadProxySecondaryFiltersUiState();
    proxyAdvancedExpanded = false;
    proxyAdvancedView = 'common';
    proxyCognitiveMode = 'expert';
    proxyDiagnosticsExpanded = false;
    proxyDiagnosticsDetailExpanded = false;
    proxyInspectorStepsExpanded = loadProxyInspectorStepsUiState();
    proxyInspectorAttemptsExpanded = loadProxyInspectorAttemptsUiState();
    proxyCognitiveStateCache = {};
    proxyInspectorCollapsed = loadProxyInspectorCollapsedUiState();
    proxyWorkflowFocus = 'nodes';
    ensureProxyModalUiEventsBound();
    renderProxyCustomPresetButtons();
    applyProxyPresetTrustPolicyToControl();
    applyProxyReplayImportRouteModeToControl();
    applyProxyListViewStateToControls();
    applyProxySecondaryFiltersUiState();
    applyProxyInspectorCollapsedUiState();
    applyProxyInspectorSectionState();
    currentProxyDetailId = null;
    renderGroupTabs();
    const modal = document.getElementById('proxyModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.toggle('is-inspector-collapsed', !!proxyInspectorCollapsed);
        modal.classList.toggle('is-inspector-open', !proxyInspectorCollapsed);
    }
    const searchEl = document.getElementById('proxySearchInput');
    if (searchEl) {
        setTimeout(() => {
            searchEl.focus();
            if (String(searchEl.value || '').trim()) searchEl.select();
        }, 0);
    }
}
function closeProxyManager() {
    const modal = document.getElementById('proxyModal');
    if (modal) modal.style.display = 'none';
    flushScheduledSettingsSave();
    updateToolbar();
}

function renderGroupTabs() {
    const container = document.getElementById('proxyGroupTabs');
    if (!container) return;
    container.textContent = '';
    const manualBtn = document.createElement('div');
    manualBtn.className = `tab-btn no-drag ${currentProxyGroup === 'manual' ? 'active' : ''}`;
    manualBtn.innerText = t('groupManual');
    manualBtn.onclick = () => switchProxyGroup('manual');
    container.appendChild(manualBtn);
    globalSettings.subscriptions.forEach(sub => {
        const btn = document.createElement('div');
        btn.className = `tab-btn no-drag ${currentProxyGroup === sub.id ? 'active' : ''}`;
        btn.innerText = sub.name || tText('proxySubDefaultShort', 'Sub');
        btn.onclick = () => switchProxyGroup(sub.id);
        container.appendChild(btn);
    });
    renderProxyNodes();
}

function switchProxyGroup(gid) { currentProxyGroup = gid; renderGroupTabs(); }

function safeProxyTestText(input, maxLen = 240) {
    if (input === null || input === undefined) return '';
    const text = String(input).trim();
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

function safeProxyTestDuration(value) {
    if (!Number.isFinite(value)) return null;
    const num = Math.round(Number(value));
    return num >= 0 ? num : null;
}

function normalizeStoredProxyTestResult(result, fallback = {}) {
    if (!result || typeof result !== 'object') return null;

    const stepsRaw = Array.isArray(result.steps) ? result.steps : [];
    const attemptsRaw = Array.isArray(result.attempts) ? result.attempts : [];

    const steps = stepsRaw.slice(0, 32).map((step) => ({
        name: safeProxyTestText(step && step.name ? step.name : 'step', 80),
        ok: Boolean(step && step.ok),
        code: safeProxyTestText(step && step.code ? step.code : '', 80),
        message: safeProxyTestText(step && step.message ? step.message : '', 240),
        durationMs: safeProxyTestDuration(step && step.durationMs),
    }));

    const attempts = attemptsRaw.slice(0, 8).map((attempt, idx) => ({
        index: Number.isFinite(attempt && attempt.index) ? Number(attempt.index) : (idx + 1),
        engine: safeProxyTestText(attempt && attempt.engine ? attempt.engine : '', 80),
        ok: Boolean(attempt && attempt.ok),
        code: safeProxyTestText(attempt && attempt.code ? attempt.code : '', 80),
        message: safeProxyTestText(attempt && attempt.message ? attempt.message : '', 240),
        durationMs: safeProxyTestDuration(attempt && attempt.durationMs),
    }));

    const testedAt = Number.isFinite(result.startedAt)
        ? Number(result.startedAt)
        : (Number.isFinite(fallback.lastTestAt) ? Number(fallback.lastTestAt) : Date.now());

    const finalCode = safeProxyTestText(result.finalCode || result.code || fallback.lastTestCode || '', 80);
    const finalMessage = safeProxyTestText(result.finalMessage || result.error || fallback.lastTestMsg || '', 240);

    return {
        schemaVersion: Number.isFinite(result.schemaVersion) ? Number(result.schemaVersion) : 1,
        ok: Boolean(result.ok),
        protocol: safeProxyTestText(result.protocol || '', 48),
        engine: safeProxyTestText(result.engine || fallback.lastTestCore || '', 48),
        testProfile: safeProxyTestText(result.testProfile || (result.testOptions && result.testOptions.profile) || '', 24),
        finalCode,
        finalMessage,
        durationMs: safeProxyTestDuration(result.durationMs),
        testedAt,
        steps,
        attempts,
    };
}

function buildLegacyProxyTestResultFromNode(node) {
    if (!node || !node.lastTestAt) return null;
    const attempts = [];
    const totalAttempts = Number.isFinite(node.lastTestAttempts) ? Math.max(0, Number(node.lastTestAttempts)) : 0;
    const fallbackCount = totalAttempts > 0 ? totalAttempts : (node.lastTestCode || node.lastTestMsg ? 1 : 0);

    for (let index = 0; index < fallbackCount; index += 1) {
        attempts.push({
            index: index + 1,
            engine: safeProxyTestText(node.lastTestCore || '', 48),
            ok: Boolean(node.lastTestOk),
            code: safeProxyTestText(node.lastTestFinalCode || node.lastTestCode || '', 80),
            message: safeProxyTestText(node.lastTestMsg || '', 240),
            durationMs: null,
        });
    }

    return {
        schemaVersion: 1,
        ok: Boolean(node.lastTestOk),
        protocol: safeProxyTestText((node.url && String(node.url).split('://')[0]) || '', 48),
        engine: safeProxyTestText(node.lastTestCore || '', 48),
        finalCode: safeProxyTestText(node.lastTestFinalCode || node.lastTestCode || '', 80),
        finalMessage: safeProxyTestText(node.lastTestMsg || '', 240),
        durationMs: null,
        testedAt: Number(node.lastTestAt),
        steps: [],
        attempts,
    };
}

function getProxyTestResultForNode(node) {
    if (!node || typeof node !== 'object') return null;
    const normalized = normalizeStoredProxyTestResult(node.lastTestResult, node);
    if (normalized) return normalized;
    return buildLegacyProxyTestResultFromNode(node);
}

function formatDurationText(durationMs) {
    if (!Number.isFinite(durationMs) || durationMs < 0) return '-';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
}

function createProxyDetailInfoChip(label, value, tone = 'default', title = '') {
    const chip = document.createElement('span');
    chip.className = `proxy-detail-chip ${tone}`;
    chip.textContent = `${label}: ${value}`;
    if (title) chip.title = title;
    return chip;
}

function appendProxyDetailEntry(container, leftText, rightText, ok = null) {
    const line = document.createElement('div');
    line.className = 'proxy-detail-line';

    const left = document.createElement('span');
    left.className = 'proxy-detail-line-left';
    left.textContent = leftText;

    const right = document.createElement('span');
    right.className = 'proxy-detail-line-right';
    right.textContent = rightText;
    if (ok === true) right.classList.add('ok');
    if (ok === false) right.classList.add('fail');

    line.appendChild(left);
    line.appendChild(right);
    container.appendChild(line);
}

function createProxyTestDetailPanel(node) {
    const detail = getProxyTestResultForNode(node);
    if (!detail) return null;

    const wrap = document.createElement('div');
    wrap.className = 'proxy-detail-wrap no-drag';

    const panel = document.createElement('div');
    panel.className = 'proxy-detail-panel';

    const top = document.createElement('div');
    top.className = 'proxy-detail-top';
    top.appendChild(createProxyDetailInfoChip(tText('proxyDetailStatus', 'Status'), detail.ok ? tText('proxyWordOk', 'OK') : tText('proxyWordFail', 'FAIL'), detail.ok ? 'ok' : 'fail'));
    if (detail.finalCode) {
        const finalCodeLabel = formatProxyErrorCodeLabel(detail.finalCode, { fallbackDash: true });
        top.appendChild(createProxyDetailInfoChip(tText('proxyDetailCode', 'Code'), finalCodeLabel, 'default', formatProxyErrorCodeWithRaw(detail.finalCode, { fallbackDash: true })));
    }
    if (detail.protocol) top.appendChild(createProxyDetailInfoChip(tText('proxyDetailProto', 'Proto'), detail.protocol));
    if (detail.engine) top.appendChild(createProxyDetailInfoChip(tText('proxyDetailEngine', 'Engine'), detail.engine));
    top.appendChild(createProxyDetailInfoChip(tText('proxyDetailAttemptsLabel', 'Attempts'), String((detail.attempts || []).length)));
    top.appendChild(createProxyDetailInfoChip(tText('proxyDetailDurationLabel', 'Duration'), formatDurationText(detail.durationMs)));
    if (detail.testProfile) top.appendChild(createProxyDetailInfoChip(tText('proxyDetailProfileLabel', 'Profile'), formatProxyTestProfileLabel(detail.testProfile)));
    panel.appendChild(top);

    if (detail.finalMessage) {
        const msg = document.createElement('div');
        msg.className = 'proxy-detail-note';
        msg.textContent = `${tText('proxyDetailMessageLabel', 'Message')}: ${detail.finalMessage}`;
        panel.appendChild(msg);
    }

    const testedAt = Number.isFinite(detail.testedAt) ? new Date(detail.testedAt).toLocaleString() : '-';
    const metaLine = document.createElement('div');
    metaLine.className = 'proxy-detail-note';
    metaLine.textContent = `${tText('proxyDetailTestedAtLabel', 'Tested At')}: ${testedAt}`;
    panel.appendChild(metaLine);

    const steps = Array.isArray(detail.steps) ? detail.steps : [];
    const attempts = Array.isArray(detail.attempts) ? detail.attempts : [];

    const stepsBlock = document.createElement('div');
    stepsBlock.className = 'proxy-detail-block';
    const stepsTitle = document.createElement('div');
    stepsTitle.className = 'proxy-detail-block-title';
    stepsTitle.textContent = `${tText('proxyDetailStepsTitle', 'Steps')} (${steps.length})`;
    stepsBlock.appendChild(stepsTitle);
    if (steps.length === 0) {
        appendProxyDetailEntry(stepsBlock, tText('proxyDetailNoStageDetails', 'No stage details recorded'), '-', null);
    } else {
        steps.forEach((step) => {
            const label = `${step.name || tText('proxyDetailStepFallback', 'step')} · ${formatProxyErrorCodeLabel(step.code, { fallbackDash: true })}`;
            const value = `${step.message || '-'} (${formatDurationText(step.durationMs)})`;
            appendProxyDetailEntry(stepsBlock, label, value, step.ok);
        });
    }
    panel.appendChild(stepsBlock);

    const attemptsBlock = document.createElement('div');
    attemptsBlock.className = 'proxy-detail-block';
    const attemptsTitle = document.createElement('div');
    attemptsTitle.className = 'proxy-detail-block-title';
    attemptsTitle.textContent = `${tText('proxyDetailAttemptsTitle', 'Attempts')} (${attempts.length})`;
    attemptsBlock.appendChild(attemptsTitle);
    if (attempts.length === 0) {
        appendProxyDetailEntry(attemptsBlock, tText('proxyDetailNoAttemptDetails', 'No attempt details recorded'), '-', null);
    } else {
        attempts.forEach((attempt) => {
            const label = `#${attempt.index || 1} · ${(attempt.engine || tText('proxyDetailAttemptFallback', 'engine?'))} · ${formatProxyErrorCodeLabel(attempt.code, { fallbackDash: true })}`;
            const value = `${attempt.message || '-'} (${formatDurationText(attempt.durationMs)})`;
            appendProxyDetailEntry(attemptsBlock, label, value, attempt.ok);
        });
    }
    panel.appendChild(attemptsBlock);

    wrap.appendChild(panel);
    return wrap;
}

function toggleProxyDetail(proxyId) {
    if (!proxyId) return;
    currentProxyDetailId = currentProxyDetailId === proxyId ? null : proxyId;
    renderProxyNodes();
}

function calcPercentile(sortedValues, ratio) {
    if (!Array.isArray(sortedValues) || sortedValues.length === 0) return null;
    const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
    return Math.round(sortedValues[idx]);
}

function computeProxyGroupMetrics(list) {
    let pass = 0;
    let fail = 0;
    let waiting = 0;
    const latencyValues = [];

    (list || []).forEach((node) => {
        if (node && node.lastTestAt) {
            if (node.lastTestOk) pass += 1;
            else fail += 1;
        } else {
            waiting += 1;
        }
        const latency = Number(node && node.latency);
        if (Number.isFinite(latency) && latency >= 0 && latency < 9000) latencyValues.push(latency);
    });

    latencyValues.sort((a, b) => a - b);
    const total = Array.isArray(list) ? list.length : 0;
    const tested = pass + fail;
    const avgLatency = latencyValues.length > 0 ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length) : null;
    const p95Latency = calcPercentile(latencyValues, 0.95);
    const medianLatency = calcPercentile(latencyValues, 0.5);
    const passRate = tested > 0 ? Number(((pass / tested) * 100).toFixed(1)) : null;

    return {
        total,
        tested,
        pass,
        fail,
        waiting,
        passRate,
        avgLatency,
        p95Latency,
        medianLatency,
    };
}

function formatSignedNumber(value, suffix = '') {
    if (!Number.isFinite(value) || value === 0) return `0${suffix}`;
    const abs = Math.abs(value);
    return `${value > 0 ? '+' : '-'}${abs}${suffix}`;
}

function buildFailureCodeDistribution(list, topN = 4) {
    const codeCounter = new Map();
    let failCount = 0;
    (list || []).forEach((node) => {
        if (!node || !node.lastTestAt || node.lastTestOk) return;
        failCount += 1;
        const rawCode = String(node.lastTestFinalCode || node.lastTestCode || 'UNKNOWN').trim().toUpperCase();
        const code = rawCode && rawCode !== 'OK' ? rawCode : 'UNKNOWN';
        codeCounter.set(code, (codeCounter.get(code) || 0) + 1);
    });

    const rows = Array.from(codeCounter.entries())
        .map(([code, count]) => ({
            code,
            count,
            ratio: failCount > 0 ? Number((count / failCount).toFixed(4)) : 0,
        }))
        .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    const topRows = rows.slice(0, Math.max(1, topN));
    const covered = topRows.reduce((sum, item) => sum + item.count, 0);
    const otherCount = Math.max(0, failCount - covered);
    if (otherCount > 0) {
        topRows.push({
            code: 'OTHER',
            count: otherCount,
            ratio: Number((otherCount / failCount).toFixed(4)),
        });
    }
    return { failCount, rows: topRows };
}

function setProxyDiagnosticsSummaryCard(cardId, valueId, severity, valueText, titleText = '') {
    const cardEl = document.getElementById(cardId);
    const valueEl = document.getElementById(valueId);
    if (!cardEl || !valueEl) return;
    const tone = ['critical', 'warn', 'good', 'info'].includes(String(severity || '').toLowerCase())
        ? String(severity || '').toLowerCase()
        : 'info';
    cardEl.classList.remove('is-critical', 'is-warn', 'is-good', 'is-info');
    cardEl.classList.add(`is-${tone}`);
    valueEl.textContent = String(valueText || tText('proxyDiagSummaryEmpty', 'No data'));
    const title = String(titleText || '');
    if (title) {
        cardEl.title = title;
        valueEl.title = title;
    } else {
        cardEl.removeAttribute('title');
        valueEl.removeAttribute('title');
    }
}

function renderProxyDiagnosticsSummary(allList, metrics) {
    const list = Array.isArray(allList) ? allList : [];
    const safeMetrics = (metrics && typeof metrics === 'object') ? metrics : computeProxyGroupMetrics(list);
    const distribution = buildFailureCodeDistribution(list, 1);
    const tested = Number(safeMetrics.tested || 0);
    const total = Number(safeMetrics.total || 0);
    const fail = Number(safeMetrics.fail || 0);
    const topFail = Array.isArray(distribution.rows) && distribution.rows.length > 0 ? distribution.rows[0] : null;
    const topFailLabel = topFail ? formatProxyErrorCodeLabel(topFail.code, { fallbackDash: true }) : '-';
    const failRatio = tested > 0 ? (fail / tested) : (total > 0 ? (fail / total) : 0);
    let failSeverity = 'info';
    if (fail <= 0) failSeverity = 'good';
    else if (failRatio >= 0.6) failSeverity = 'critical';
    else if (failRatio >= 0.25) failSeverity = 'warn';
    const failValue = fail > 0
        ? `${tText('proxyWordFailShort', 'F')}${fail}/${Math.max(1, total)} · ${topFailLabel}`
        : tText('proxyDiagSummaryFailHealthy', 'No failures');
    const failTitle = fail > 0
        ? `${tText('proxyWordFail', 'FAIL')}=${fail}, ${tText('proxyWordTopCode', 'TopCode')}=${formatProxyErrorCodeWithRaw(topFail && topFail.code, { fallbackDash: true })}`
        : tText('proxyDiagSummaryFailHealthy', 'No failures');
    setProxyDiagnosticsSummaryCard('proxyDiagSummaryFailCard', 'proxyDiagSummaryFailValue', failSeverity, failValue, failTitle);

    const trend = getCurrentProxyGroupFailTrend();
    const pack = buildProxyTrendDiffPack(trend);
    let trendSeverity = 'info';
    let trendValue = tText('proxyDiagSummaryTrendNoDiff', 'Need baseline');
    let trendTitle = tText('proxyDiagSummaryTrendNoDiff', 'Need baseline');
    if (pack) {
        const passText = pack.passRateDelta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(pack.passRateDelta, 'pp');
        const failText = formatSignedNumber(pack.failDelta);
        const p95Text = pack.p95Delta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(pack.p95Delta, 'ms');
        trendValue = `Δ${tText('proxyWordFailShort', 'F')} ${failText} · Δ${tText('proxyWordPassShort', 'P')} ${passText}`;
        trendTitle = `${trendValue} · Δ${tText('proxyWordP95', 'P95')} ${p95Text}`;

        const passDelta = Number(pack.passRateDelta);
        const p95Delta = Number(pack.p95Delta);
        if (pack.failDelta >= 8 || (Number.isFinite(passDelta) && passDelta <= -8) || (Number.isFinite(p95Delta) && p95Delta >= 250)) trendSeverity = 'critical';
        else if (pack.failDelta > 0 || (Number.isFinite(passDelta) && passDelta < 0) || (Number.isFinite(p95Delta) && p95Delta >= 120)) trendSeverity = 'warn';
        else if (pack.failDelta < 0 || (Number.isFinite(passDelta) && passDelta > 0)) trendSeverity = 'good';
    }
    setProxyDiagnosticsSummaryCard('proxyDiagSummaryTrendCard', 'proxyDiagSummaryTrendValue', trendSeverity, trendValue, trendTitle);

    const badges = pack ? buildProxyTrendAnomalyBadges(pack) : [];
    if (!pack || !badges.length) {
        setProxyDiagnosticsSummaryCard(
            'proxyDiagSummaryAnomalyCard',
            'proxyDiagSummaryAnomalyValue',
            'info',
            tText('proxyDiagSummaryEmpty', 'No data'),
            tText('proxyTrendAnomalyHint', 'Badges appear after trend comparisons'),
        );
        return;
    }

    const sortedBadges = badges.slice().sort((a, b) => {
        const rankDelta = getProxyTrendAnomalySeverityRank(b && b.severity) - getProxyTrendAnomalySeverityRank(a && a.severity);
        if (rankDelta !== 0) return rankDelta;
        return String(a && a.label || '').localeCompare(String(b && b.label || ''));
    });
    const topBadge = sortedBadges[0] || { severity: 'info', label: tText('proxyDiagSummaryEmpty', 'No data'), detail: '' };
    const anomalySeverity = ['critical', 'warn', 'good', 'info'].includes(String(topBadge.severity || '').toLowerCase())
        ? String(topBadge.severity || '').toLowerCase()
        : 'info';
    setProxyDiagnosticsSummaryCard(
        'proxyDiagSummaryAnomalyCard',
        'proxyDiagSummaryAnomalyValue',
        anomalySeverity,
        String(topBadge.label || tText('proxyDiagSummaryEmpty', 'No data')),
        String(topBadge.detail || ''),
    );
}

function renderProxyFailCodeMiniChart(list) {
    const chartEl = document.getElementById('proxyFailCodeMiniChart');
    if (!chartEl) return;
    chartEl.textContent = '';

    const distribution = buildFailureCodeDistribution(list, 4);
    if (!distribution.failCount || distribution.rows.length === 0) {
        chartEl.classList.add('proxy-fail-mini-empty');
        chartEl.textContent = tText('proxyFailCodeEmpty', 'Failure code distribution is empty');
        chartEl.title = tText('proxyFailCodeHint', 'Run tests to populate failure code mini-chart');
        return;
    }
    chartEl.classList.remove('proxy-fail-mini-empty');

    distribution.rows.forEach((row) => {
        const line = document.createElement('div');
        line.className = 'proxy-fail-mini-row';

        const label = document.createElement('span');
        label.className = 'proxy-fail-mini-label';
        label.textContent = formatProxyErrorCodeLabel(row.code, { fallbackDash: true });
        label.title = formatProxyErrorCodeWithRaw(row.code, { fallbackDash: true });

        const track = document.createElement('div');
        track.className = 'proxy-fail-mini-track';

        const fill = document.createElement('div');
        fill.className = 'proxy-fail-mini-fill';
        fill.style.width = `${Math.max(6, Math.round((row.ratio || 0) * 100))}%`;
        track.appendChild(fill);

        const meta = document.createElement('span');
        meta.className = 'proxy-fail-mini-meta';
        meta.textContent = `${row.count} (${Math.max(0, Math.round((row.ratio || 0) * 100))}%)`;

        line.appendChild(label);
        line.appendChild(track);
        line.appendChild(meta);
        chartEl.appendChild(line);
    });

    chartEl.title = `${tText('proxyWordFail', 'FAIL')}=${distribution.failCount}, ${tText('proxyWordTopCode', 'TopCode')}=${distribution.rows.map((item) => `${formatProxyErrorCodeWithRaw(item.code, { fallbackDash: true })}:${item.count}`).join(', ')}`;
}

function recordProxyFailCodeTrend(list, metrics) {
    const total = Number(metrics && metrics.total);
    if (!Number.isFinite(total) || total <= 0) return;
    const distribution = buildFailureCodeDistribution(list, 1);
    const top = Array.isArray(distribution.rows) && distribution.rows.length > 0 ? distribution.rows[0] : null;
    const topCode = top && top.code ? top.code : '-';
    const topCount = top && Number.isFinite(top.count) ? top.count : 0;
    const signature = [
        total,
        Number(metrics && metrics.pass) || 0,
        Number(metrics && metrics.fail) || 0,
        Number(metrics && metrics.waiting) || 0,
        topCode,
        topCount,
        Number(metrics && metrics.avgLatency) || -1,
        Number(metrics && metrics.p95Latency) || -1,
    ].join('|');

    const store = readProxyFailCodeTrendStore();
    const key = currentProxyGroup || 'manual';
    const listForGroup = Array.isArray(store[key]) ? store[key].filter((item) => item && typeof item === 'object') : [];
    const last = listForGroup.length > 0 ? listForGroup[listForGroup.length - 1] : null;
    if (last && String(last.signature || '') === signature) return;

    listForGroup.push({
        savedAt: Date.now(),
        signature,
        total,
        pass: Number(metrics && metrics.pass) || 0,
        fail: Number(metrics && metrics.fail) || 0,
        waiting: Number(metrics && metrics.waiting) || 0,
        passRate: Number.isFinite(metrics && metrics.passRate) ? Number(metrics.passRate) : null,
        avgLatency: Number.isFinite(metrics && metrics.avgLatency) ? Number(metrics.avgLatency) : null,
        p95Latency: Number.isFinite(metrics && metrics.p95Latency) ? Number(metrics.p95Latency) : null,
        topCode,
        topCount,
    });
    store[key] = listForGroup.slice(-PROXY_FAIL_CODE_TREND_LIMIT);
    writeProxyFailCodeTrendStore(store);
}

function renderProxyFailTrendTimeline() {
    const timelineEl = document.getElementById('proxyFailTrendTimeline');
    if (!timelineEl) return;
    timelineEl.textContent = '';
    const trend = getCurrentProxyGroupFailTrend();
    if (!trend.length) {
        timelineEl.classList.add('proxy-fail-trend-empty');
        timelineEl.textContent = tText('proxyFailTrendEmpty', 'No failure trend yet');
        timelineEl.title = tText('proxyFailTrendHint', 'Timeline populates after test result changes');
        return;
    }
    timelineEl.classList.remove('proxy-fail-trend-empty');

    trend.slice(-8).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'proxy-fail-trend-item';

        const time = document.createElement('span');
        time.className = 'proxy-fail-trend-time';
        const ts = Number(item.savedAt);
        time.textContent = Number.isFinite(ts) ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

        const summary = document.createElement('span');
        summary.className = 'proxy-fail-trend-summary';
        summary.textContent = `${tText('proxyWordFailShort', 'F')}${item.fail || 0}/${item.total || 0}`;

        const code = document.createElement('span');
        code.className = 'proxy-fail-trend-code';
        code.textContent = formatProxyErrorCodeLabel(item.topCode, { fallbackDash: true });
        code.title = formatProxyErrorCodeWithRaw(item.topCode, { fallbackDash: true });

        row.title = `${tText('proxyWordPass', 'PASS')}=${item.pass || 0}, ${tText('proxyWordFail', 'FAIL')}=${item.fail || 0}, ${tText('proxyWordWait', 'WAIT')}=${item.waiting || 0}, ${tText('proxyWordAvg', 'AVG')}=${item.avgLatency ?? '-'}ms, ${tText('proxyWordP95', 'P95')}=${item.p95Latency ?? '-'}ms`;
        row.appendChild(time);
        row.appendChild(summary);
        row.appendChild(code);
        timelineEl.appendChild(row);
    });
}

function buildProxyTrendDiffPack(trend) {
    const list = Array.isArray(trend) ? trend : [];
    if (list.length < 2) return null;
    const curr = list[list.length - 1];
    const prev = list[list.length - 2];
    const previousTopCode = String(prev.topCode || '-');
    const currentTopCode = String(curr.topCode || '-');
    const passRateDelta = (Number.isFinite(Number(curr.passRate)) && Number.isFinite(Number(prev.passRate)))
        ? Number((Number(curr.passRate) - Number(prev.passRate)).toFixed(1))
        : null;
    const avgDelta = (Number.isFinite(Number(curr.avgLatency)) && Number.isFinite(Number(prev.avgLatency)))
        ? Number(curr.avgLatency) - Number(prev.avgLatency)
        : null;
    const p95Delta = (Number.isFinite(Number(curr.p95Latency)) && Number.isFinite(Number(prev.p95Latency)))
        ? Number(curr.p95Latency) - Number(prev.p95Latency)
        : null;
    return {
        current: curr,
        previous: prev,
        previousTopCode,
        currentTopCode,
        failDelta: Number(curr.fail || 0) - Number(prev.fail || 0),
        passRateDelta,
        avgDelta,
        p95Delta,
        topCodeShift: previousTopCode === currentTopCode
            ? currentTopCode
            : `${previousTopCode}→${currentTopCode}`,
    };
}

function buildProxyTrendAnomalyBadges(pack) {
    if (!pack || typeof pack !== 'object') return [];
    const badges = [];
    const failDelta = Number(pack.failDelta || 0);
    if (failDelta >= 8) badges.push({ severity: 'critical', label: `${tText('proxyAnomalyFailSpike', 'FAIL spike')} +${failDelta}`, detail: tText('proxyAnomalyDetailFailSharp', 'Failure count sharply increased') });
    else if (failDelta >= 3) badges.push({ severity: 'warn', label: `${tText('proxyAnomalyFailUp', 'FAIL up')} +${failDelta}`, detail: tText('proxyAnomalyDetailFailIncreased', 'Failure count increased') });
    else if (failDelta <= -3) badges.push({ severity: 'good', label: `${tText('proxyAnomalyFailDown', 'FAIL down')} ${failDelta}`, detail: tText('proxyAnomalyDetailFailImproved', 'Failure count improved') });

    const passDelta = Number(pack.passRateDelta);
    if (Number.isFinite(passDelta)) {
        if (passDelta <= -10) badges.push({ severity: 'critical', label: `${tText('proxyAnomalyPassDrop', 'PASS drop')} ${passDelta}pp`, detail: tText('proxyAnomalyDetailPassSharpDrop', 'Pass rate dropped sharply') });
        else if (passDelta <= -4) badges.push({ severity: 'warn', label: `${tText('proxyAnomalyPassDown', 'PASS down')} ${passDelta}pp`, detail: tText('proxyAnomalyDetailPassDeclined', 'Pass rate declined') });
        else if (passDelta >= 6) badges.push({ severity: 'good', label: `${tText('proxyAnomalyPassUp', 'PASS up')} +${passDelta}pp`, detail: tText('proxyAnomalyDetailPassImproved', 'Pass rate improved') });
    }

    const avgDelta = Number(pack.avgDelta);
    if (Number.isFinite(avgDelta)) {
        if (avgDelta >= 180) badges.push({ severity: 'critical', label: `${tText('proxyWordAvg', 'AVG')} +${avgDelta}ms`, detail: tText('proxyAnomalyDetailAvgRegressed', 'Average latency regressed heavily') });
        else if (avgDelta >= 80) badges.push({ severity: 'warn', label: `${tText('proxyWordAvg', 'AVG')} +${avgDelta}ms`, detail: tText('proxyAnomalyDetailAvgIncreased', 'Average latency increased') });
        else if (avgDelta <= -80) badges.push({ severity: 'good', label: `${tText('proxyWordAvg', 'AVG')} ${avgDelta}ms`, detail: tText('proxyAnomalyDetailAvgImproved', 'Average latency improved') });
    }

    const p95Delta = Number(pack.p95Delta);
    if (Number.isFinite(p95Delta)) {
        if (p95Delta >= 250) badges.push({ severity: 'critical', label: `${tText('proxyWordP95', 'P95')} +${p95Delta}ms`, detail: tText('proxyAnomalyDetailP95Regressed', 'Tail latency regressed heavily') });
        else if (p95Delta >= 120) badges.push({ severity: 'warn', label: `${tText('proxyWordP95', 'P95')} +${p95Delta}ms`, detail: tText('proxyAnomalyDetailP95Increased', 'Tail latency increased') });
        else if (p95Delta <= -120) badges.push({ severity: 'good', label: `${tText('proxyWordP95', 'P95')} ${p95Delta}ms`, detail: tText('proxyAnomalyDetailP95Improved', 'Tail latency improved') });
    }

    if (String(pack.previousTopCode || '-') !== String(pack.currentTopCode || '-')) {
        badges.push({
            severity: 'info',
            label: `${tText('proxyWordTopCode', 'TopCode')} ${formatProxyErrorCodeShiftLabel(pack.previousTopCode, pack.currentTopCode)}`,
            detail: tText('proxyAnomalyDetailTopCodeShift', 'Top failure code shifted between snapshots'),
        });
    }

    if (badges.length === 0) {
        badges.push({ severity: 'good', label: tText('proxyAnomalyStable', 'Stable'), detail: tText('proxyAnomalyDetailStable', 'No anomaly thresholds crossed') });
    }
    return badges.slice(0, 5);
}

function getProxyTrendAnomalySeverityRank(severity) {
    const value = String(severity || '').toLowerCase();
    if (value === 'critical') return 4;
    if (value === 'warn') return 3;
    if (value === 'good') return 2;
    return 1;
}

function buildProxyTrendAnomalyHistoryEntry(pack, badges) {
    if (!pack || typeof pack !== 'object') return null;
    const list = Array.isArray(badges) ? badges : [];
    if (list.length === 0) return null;
    const sorted = list.slice().sort((a, b) => {
        const d = getProxyTrendAnomalySeverityRank(b && b.severity) - getProxyTrendAnomalySeverityRank(a && a.severity);
        if (d !== 0) return d;
        return String(a && a.label || '').localeCompare(String(b && b.label || ''));
    });
    const top = sorted[0] || { severity: 'info', label: tText('proxyAnomalyStable', 'Stable') };
    const signature = [
        Number(pack.previous && pack.previous.savedAt || 0),
        Number(pack.current && pack.current.savedAt || 0),
        list.map((item) => `${String(item && item.severity || 'info')}:${String(item && item.label || '')}`).join('|'),
    ].join('::');
    return {
        savedAt: Date.now(),
        signature,
        topSeverity: String(top.severity || 'info').toLowerCase(),
        headline: String(top.label || tText('proxyAnomalyStable', 'Stable')),
        failDelta: Number(pack.failDelta || 0),
        passRateDelta: Number.isFinite(Number(pack.passRateDelta)) ? Number(pack.passRateDelta) : null,
    };
}

function recordProxyTrendAnomalyHistory(pack, badges) {
    const entry = buildProxyTrendAnomalyHistoryEntry(pack, badges);
    if (!entry) return;
    const key = currentProxyGroup || 'manual';
    const store = readProxyTrendAnomalyHistoryStore();
    const list = Array.isArray(store[key]) ? store[key].map((item) => normalizeProxyTrendAnomalyHistoryEntry(item)).filter(Boolean) : [];
    const last = list.length > 0 ? list[list.length - 1] : null;
    if (last && String(last.signature || '') === entry.signature) return;
    list.push(entry);
    store[key] = list.slice(-PROXY_TREND_ANOMALY_HISTORY_LIMIT);
    writeProxyTrendAnomalyHistoryStore(store);
}

function buildProxyTrendAnomalyHistoryRollup(history) {
    const rows = Array.isArray(history) ? history.map((item) => normalizeProxyTrendAnomalyHistoryEntry(item)).filter(Boolean) : [];
    const severityTotals = { critical: 0, warn: 0, good: 0, info: 0 };
    rows.forEach((item) => {
        const key = ['critical', 'warn', 'good', 'info'].includes(item.topSeverity) ? item.topSeverity : 'info';
        severityTotals[key] += 1;
    });
    return {
        totalPoints: rows.length,
        severityTotals,
        latest: rows.length > 0 ? rows[rows.length - 1] : null,
        rows,
    };
}

function renderProxyTrendAnomalyHistory() {
    const wrap = document.getElementById('proxyTrendAnomalyHistory');
    if (!wrap) return;
    wrap.textContent = '';
    const history = getCurrentProxyGroupTrendAnomalyHistory();
    if (!history.length) {
        wrap.classList.add('proxy-trend-anomaly-history-empty');
        wrap.textContent = tText('proxyTrendAnomalyHistoryEmpty', 'No anomaly history yet');
        wrap.title = tText('proxyTrendAnomalyHistoryHint', 'Anomaly history appears after trend diff updates');
        return;
    }
    wrap.classList.remove('proxy-trend-anomaly-history-empty');
    history.slice(-8).forEach((item) => {
        const row = document.createElement('div');
        row.className = `proxy-trend-anomaly-history-item proxy-trend-anomaly-history-item--${item.topSeverity}`;
        const ts = Number(item.savedAt);
        const timeText = Number.isFinite(ts) ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const passDeltaText = Number.isFinite(Number(item.passRateDelta)) ? formatSignedNumber(Number(item.passRateDelta), 'pp') : tText('proxyTrendValueNA', 'n/a');
        row.textContent = `${timeText} · ${item.headline} · Δ${tText('proxyWordFailShort', 'F')} ${formatSignedNumber(item.failDelta || 0)} · Δ${tText('proxyWordPassShort', 'P')} ${passDeltaText}`;
        row.title = `${tText('proxyWordSeverity', 'severity')}=${item.topSeverity}, ${tText('proxyWordSignature', 'signature')}=${item.signature}`;
        wrap.appendChild(row);
    });
}

async function exportProxyTrendAnomalyRollup() {
    try {
        const history = getCurrentProxyGroupTrendAnomalyHistory();
        const rollup = buildProxyTrendAnomalyHistoryRollup(history);
        const payload = {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            groupId: currentProxyGroup || 'manual',
            rollup,
        };
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyAnomalyRollupCopied', 'Anomaly rollup copied ({points} points)', { points: rollup.totalPoints }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyAnomalyRollupExportFailed', 'Export anomaly rollup failed')}: ${err && err.message ? err.message : err}`);
    }
}

function buildProxyTrendAnomalyReplayPayload() {
    const trend = getCurrentProxyGroupFailTrend();
    const history = getCurrentProxyGroupTrendAnomalyHistory();
    const rollup = buildProxyTrendAnomalyHistoryRollup(history);
    const diffPack = buildProxyTrendDiffPack(trend);
    const currentBadges = buildProxyTrendAnomalyBadges(diffPack);
    const frames = history.map((entry) => {
        const ts = Number(entry && entry.savedAt);
        let nearest = null;
        if (Number.isFinite(ts) && Array.isArray(trend) && trend.length > 0) {
            nearest = trend.reduce((best, point) => {
                if (!point || !Number.isFinite(Number(point.savedAt))) return best;
                if (!best) return point;
                const dist = Math.abs(Number(point.savedAt) - ts);
                const bestDist = Math.abs(Number(best.savedAt) - ts);
                return dist < bestDist ? point : best;
            }, null);
        }
        return {
            savedAt: Number(entry && entry.savedAt) || 0,
            severity: String(entry && entry.topSeverity || 'info'),
            headline: String(entry && entry.headline || ''),
            failDelta: Number(entry && entry.failDelta || 0),
            passRateDelta: Number.isFinite(Number(entry && entry.passRateDelta)) ? Number(entry.passRateDelta) : null,
            nearestTrendPoint: nearest ? {
                savedAt: Number(nearest.savedAt || 0),
                fail: Number(nearest.fail || 0),
                total: Number(nearest.total || 0),
                topCode: String(nearest.topCode || '-'),
                avgLatency: Number.isFinite(Number(nearest.avgLatency)) ? Number(nearest.avgLatency) : null,
                p95Latency: Number.isFinite(Number(nearest.p95Latency)) ? Number(nearest.p95Latency) : null,
            } : null,
        };
    });
    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        groupId: currentProxyGroup || 'manual',
        rollup,
        currentDiffPack: diffPack,
        currentBadges,
        replayFrames: frames,
    };
}

async function exportProxyTrendAnomalyReplay() {
    try {
        const payload = buildProxyTrendAnomalyReplayPayload();
        await copyTextToClipboard(JSON.stringify(payload));
        showToast(tFormat('proxyAnomalyReplayCopied', 'Anomaly replay copied ({frames} frames)', { frames: payload.replayFrames.length }), 2200);
    } catch (err) {
        showAlert(`${tText('proxyAnomalyReplayExportFailed', 'Export anomaly replay failed')}: ${err && err.message ? err.message : err}`);
    }
}

function renderProxyTrendAnomalyBadges(pack) {
    const badgeWrap = document.getElementById('proxyTrendAnomalyBadges');
    if (!badgeWrap) return [];
    badgeWrap.textContent = '';
    const badges = buildProxyTrendAnomalyBadges(pack);
    if (!badges.length) {
        badgeWrap.classList.add('proxy-trend-anomaly-empty');
        badgeWrap.textContent = tText('proxyTrendAnomalyEmpty', 'No anomaly badges yet');
        badgeWrap.title = tText('proxyTrendAnomalyHint', 'Badges appear after trend comparisons');
        return [];
    }
    badgeWrap.classList.remove('proxy-trend-anomaly-empty');
    badges.forEach((badge) => {
        const tag = document.createElement('span');
        const severity = String(badge && badge.severity || 'info').toLowerCase();
        tag.className = `proxy-trend-anomaly-badge proxy-trend-anomaly-badge--${severity}`;
        tag.textContent = String(badge && badge.label || 'Anomaly');
        tag.title = String(badge && badge.detail || '');
        badgeWrap.appendChild(tag);
    });
    return badges;
}

function renderProxyTrendDiffPack() {
    const diffEl = document.getElementById('proxyTrendDiffPack');
    if (!diffEl) return;
    diffEl.textContent = '';
    const trend = getCurrentProxyGroupFailTrend();
    const pack = buildProxyTrendDiffPack(trend);
    if (!pack) {
        diffEl.classList.add('proxy-trend-diff-empty');
        diffEl.textContent = tText('proxyTrendDiffEmpty', 'No trend diff yet');
        diffEl.title = tText('proxyTrendDiffHint', 'Need at least two trend points');
        renderProxyTrendAnomalyBadges(null);
        renderProxyTrendAnomalyHistory();
        return;
    }
    diffEl.classList.remove('proxy-trend-diff-empty');
    const first = document.createElement('span');
    first.className = 'proxy-trend-diff-line';
    const passText = pack.passRateDelta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(pack.passRateDelta, 'pp');
    const avgText = pack.avgDelta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(pack.avgDelta, 'ms');
    const p95Text = pack.p95Delta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(pack.p95Delta, 'ms');
    first.textContent = `Δ${tText('proxyWordFailLower', 'fail')} ${formatSignedNumber(pack.failDelta)} · Δ${tText('proxyWordPassLower', 'pass')} ${passText} · Δ${tText('proxyWordAvgLower', 'avg')} ${avgText} · Δ${tText('proxyWordP95Lower', 'p95')} ${p95Text}`;

    const second = document.createElement('span');
    second.className = 'proxy-trend-diff-line proxy-trend-diff-line--sub';
    second.textContent = `${tText('proxyWordTopCode', 'TopCode')} ${formatProxyErrorCodeShiftLabel(pack.previousTopCode, pack.currentTopCode)} · ${tText('proxyWordNow', 'now')} ${tText('proxyWordFailShort', 'F')}${pack.current.fail || 0}/${pack.current.total || 0}`;

    diffEl.appendChild(first);
    diffEl.appendChild(second);
    diffEl.title = `${tText('proxyWordPrevious', 'prev')}@${new Date(Number(pack.previous.savedAt || 0)).toLocaleTimeString()} -> ${tText('proxyWordNow', 'now')}@${new Date(Number(pack.current.savedAt || 0)).toLocaleTimeString()}`;
    const badges = renderProxyTrendAnomalyBadges(pack);
    recordProxyTrendAnomalyHistory(pack, badges);
    renderProxyTrendAnomalyHistory();
}

function updateProxyBenchmarkDelta(metrics) {
    const deltaEl = document.getElementById('proxyGroupDelta');
    if (!deltaEl) return;
    const snapshot = getCurrentProxyGroupSnapshot();
    if (!snapshot || typeof snapshot !== 'object') {
        deltaEl.setAttribute('data-empty', 'true');
        deltaEl.textContent = tText('proxyGroupDeltaEmpty', 'No benchmark snapshot yet');
        deltaEl.title = tText('proxyGroupDeltaHint', 'Click Snapshot in Proxy Manager to save baseline');
        return;
    }
    deltaEl.setAttribute('data-empty', 'false');

    const passRateNow = Number.isFinite(metrics.passRate) ? metrics.passRate : 0;
    const passRatePrev = Number.isFinite(snapshot.passRate) ? Number(snapshot.passRate) : 0;
    const passRateDelta = Number((passRateNow - passRatePrev).toFixed(1));
    const avgDelta = (Number.isFinite(metrics.avgLatency) && Number.isFinite(snapshot.avgLatency))
        ? metrics.avgLatency - Number(snapshot.avgLatency)
        : null;
    const p95Delta = (Number.isFinite(metrics.p95Latency) && Number.isFinite(snapshot.p95Latency))
        ? metrics.p95Latency - Number(snapshot.p95Latency)
        : null;
    const ts = Number(snapshot.savedAt);
    const tsText = Number.isFinite(ts) ? new Date(ts).toLocaleTimeString() : '-';

    const avgText = avgDelta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(avgDelta, 'ms');
    const p95Text = p95Delta === null ? tText('proxyTrendValueNA', 'n/a') : formatSignedNumber(p95Delta, 'ms');
    deltaEl.textContent = `Δ ${tText('proxyWordSnapshot', 'Snapshot')}(${tsText}) · ${tText('proxyWordPassLower', 'pass')} ${formatSignedNumber(passRateDelta, 'pp')} · ${tText('proxyWordAvgLower', 'avg')} ${avgText} · ${tText('proxyWordP95Lower', 'p95')} ${p95Text}`;
    deltaEl.title = `${tText('proxyWordBaseline', 'baseline')} ${tText('proxyWordPassRate', 'passRate')}=${snapshot.passRate ?? '-'}%, ${tText('proxyWordAvgLower', 'avg')}=${snapshot.avgLatency ?? '-'}ms, ${tText('proxyWordP95Lower', 'p95')}=${snapshot.p95Latency ?? '-'}ms`;
}

function getLastTestedAgoText(list) {
    if (!Array.isArray(list) || list.length === 0) return '';
    let latest = 0;
    list.forEach(n => { if (n && n.lastTestAt && n.lastTestAt > latest) latest = n.lastTestAt; });
    if (!latest) return '';
    const diff = Date.now() - latest;
    if (diff < 60000) return 'tested just now';
    if (diff < 3600000) return `tested ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `tested ${Math.floor(diff / 3600000)}h ago`;
    return `tested ${Math.floor(diff / 86400000)}d ago`;
}

function updateProxyGroupStats(allList, visibleList = allList) {
    const statsEl = document.getElementById('proxyGroupStats');
    const metrics = computeProxyGroupMetrics(allList || []);
    renderProxyFailCodeMiniChart(allList || []);
    recordProxyFailCodeTrend(allList || [], metrics);
    renderProxyFailTrendTimeline();
    renderProxyTrendDiffPack();
    renderProxyDiagnosticsSummary(allList || [], metrics);
    const avgText = metrics.avgLatency !== null ? `${metrics.avgLatency}ms` : '-';
    const p95Text = metrics.p95Latency !== null ? `${metrics.p95Latency}ms` : '-';
    const visible = Array.isArray(visibleList) ? visibleList.length : metrics.total;
    renderProxyStatusQuickbar(metrics, visible);
    if (statsEl) {
        const visibleSuffix = visible !== metrics.total ? ` · ${tText('proxyStatsShow', 'show')} ${visible}/${metrics.total}` : '';
        statsEl.textContent = `${tText('proxyWordPass', 'PASS')} ${metrics.pass} · ${tText('proxyWordFail', 'FAIL')} ${metrics.fail} · ${tText('proxyWordWait', 'WAIT')} ${metrics.waiting} · ${tText('proxyWordAvg', 'AVG')} ${avgText} · ${tText('proxyWordP95', 'P95')} ${p95Text}${visibleSuffix}`;
        statsEl.title = `${tText('proxyWordTotal', 'total')}=${metrics.total}, ${tText('proxyWordTested', 'tested')}=${metrics.tested}, ${tText('proxyWordPassRate', 'passRate')}=${metrics.passRate ?? '-'}%, ${tText('proxyWordAvgLower', 'avg')}=${avgText}, ${tText('proxyWordP95Lower', 'p95')}=${p95Text}, ${tText('proxyWordMedian', 'median')}=${metrics.medianLatency ?? '-'}ms`;
    }
    // Update sidebar stat cards
    const passEl = document.getElementById('proxyStatPass');
    const failEl = document.getElementById('proxyStatFail');
    const waitEl = document.getElementById('proxyStatWait');
    if (passEl) passEl.textContent = String(metrics.pass);
    if (failEl) failEl.textContent = String(metrics.fail);
    if (waitEl) waitEl.textContent = String(metrics.waiting);
    // Update stat bar fills
    const total = metrics.total || 1;
    const passBar = document.getElementById('proxyStatPassBar');
    const failBar = document.getElementById('proxyStatFailBar');
    const waitBar = document.getElementById('proxyStatWaitBar');
    if (passBar) passBar.style.width = `${(metrics.pass / total) * 100}%`;
    if (failBar) failBar.style.width = `${(metrics.fail / total) * 100}%`;
    if (waitBar) waitBar.style.width = `${(metrics.waiting / total) * 100}%`;
    // Update footer status
    const footerStatusEl = document.getElementById('proxyFooterStatus');
    if (footerStatusEl) {
        const lastTestedAgo = getLastTestedAgoText(allList || []);
        footerStatusEl.textContent = `${metrics.total} proxies · ${tText('proxyWordAvg', 'AVG')} ${avgText}${lastTestedAgo ? ` · ${lastTestedAgo}` : ''}`;
    }
    // Update footer inline stats
    const footerPassEl = document.getElementById('proxyFooterPassCount');
    const footerFailEl = document.getElementById('proxyFooterFailCount');
    const footerWaitEl = document.getElementById('proxyFooterWaitCount');
    const footerAvgEl = document.getElementById('proxyFooterAvg');
    const footerTestedEl = document.getElementById('proxyFooterTested');
    if (footerPassEl) footerPassEl.textContent = String(metrics.pass);
    if (footerFailEl) footerFailEl.textContent = String(metrics.fail);
    if (footerWaitEl) footerWaitEl.textContent = String(metrics.waiting);
    if (footerAvgEl) footerAvgEl.textContent = `avg ${avgText}`;
    if (footerTestedEl) {
        const lastTestedAgo = getLastTestedAgoText(allList || []);
        footerTestedEl.textContent = lastTestedAgo || '\u2014';
    }
    updateProxyBenchmarkDelta(metrics);
    return metrics;
}

function snapshotCurrentGroupBenchmark() {
    const allList = getCurrentProxyGroupNodeList();
    const metrics = computeProxyGroupMetrics(allList);
    const snapshot = {
        savedAt: Date.now(),
        groupId: currentProxyGroup || 'manual',
        total: metrics.total,
        tested: metrics.tested,
        pass: metrics.pass,
        fail: metrics.fail,
        waiting: metrics.waiting,
        passRate: metrics.passRate,
        avgLatency: metrics.avgLatency,
        p95Latency: metrics.p95Latency,
        medianLatency: metrics.medianLatency,
        viewState: normalizeProxyListViewState(proxyListViewState),
    };
    saveCurrentProxyGroupSnapshot(snapshot);
    updateProxyBenchmarkDelta(metrics);
    showToast(`${tText('proxySnapshotSaved', 'Snapshot saved')} · ${tText('proxyWordPassLower', 'pass')} ${snapshot.passRate ?? '-'}% · ${tText('proxyWordAvgLower', 'avg')} ${snapshot.avgLatency ?? '-'}ms`, 2200);
}

function isProxyNodeInCurrentGroup(node) {
    if (!node || typeof node !== 'object') return false;
    const nodeGroup = String(node.groupId || '').trim() || 'manual';
    const currentGroup = String(currentProxyGroup || 'manual').trim() || 'manual';
    if (currentGroup === 'manual') return nodeGroup === 'manual';
    return nodeGroup === currentGroup;
}

function getProxyNodeDisplayRemark(node) {
    const remark = node && node.remark ? String(node.remark) : '';
    const normalized = remark.trim();
    if (!normalized) return tText('proxyManualNodeFallback', 'Manual Node');
    if (normalized.toLowerCase() === 'manual node') return tText('proxyManualNodeFallback', 'Manual Node');
    return normalized;
}

function getProxyNodeProtocol(node) {
    const url = node && node.url ? String(node.url) : '';
    if (!url.includes('://')) return 'UNK';
    return String(url.split('://')[0] || 'UNK').toUpperCase();
}

function createProxyNodeFallbackRow(node, options = {}) {
    if (!node || typeof node !== 'object') return null;
    const proxyId = String(options.proxyId || node.id || '').trim();
    if (!proxyId) return null;

    const isManual = Boolean(options.isManual);
    const isSelected = Boolean(options.isSelected);
    const errorMessage = String(options.errorMessage || '').trim();
    const useSingleMode = globalSettings && globalSettings.mode === 'single';

    const row = document.createElement('div');
    row.className = 'proxy-row no-drag proxy-row-fallback';
    row.setAttribute('data-proxy-id', proxyId);
    row.tabIndex = 0;
    if (isSelected) row.classList.add('is-selected');

    const left = document.createElement('div');
    left.className = 'proxy-left';
    const input = document.createElement('input');
    input.type = useSingleMode ? 'radio' : 'checkbox';
    input.name = 'ps';
    input.checked = useSingleMode
        ? isSelected
        : (node.enable !== false);
    input.dataset.action = 'proxy-select';
    input.dataset.proxyId = proxyId;
    input.className = 'proxy-select-input no-drag';
    left.appendChild(input);

    const mid = document.createElement('div');
    mid.className = 'proxy-mid';

    const header = document.createElement('div');
    header.className = 'proxy-header';

    const proto = document.createElement('span');
    proto.className = 'proxy-proto';
    proto.textContent = getProxyNodeProtocol(node);

    const remark = document.createElement('span');
    remark.className = 'proxy-remark';
    remark.textContent = getProxyNodeDisplayRemark(node);
    remark.title = remark.textContent;

    header.appendChild(proto);
    header.appendChild(remark);
    mid.appendChild(header);

    const badge = document.createElement('span');
    badge.className = 'proxy-meta-pill is-critical';
    badge.textContent = tText('proxyFallbackBasicView', 'Basic view');
    if (errorMessage) badge.title = errorMessage;
    mid.appendChild(badge);

    const right = document.createElement('div');
    right.className = 'proxy-right';
    right.classList.add(isManual ? 'is-manual' : 'is-sub');

    const btnTest = document.createElement('button');
    btnTest.className = 'proxy-action-btn test';
    btnTest.dataset.action = 'proxy-test';
    btnTest.dataset.proxyId = proxyId;
    btnTest.textContent = '⚡';
    btnTest.title = t('btnTest') || 'Test';
    right.appendChild(btnTest);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);
    return row;
}

function createProxyNodeLiteRow(node, options = {}) {
    if (!node || typeof node !== 'object') return null;
    const proxyId = String(options.proxyId || node.id || '').trim();
    if (!proxyId) return null;

    const isManual = Boolean(options.isManual);
    const isSelected = Boolean(options.isSelected);
    const useSingleMode = globalSettings && globalSettings.mode === 'single';
    const statusTag = getNodeStatusTag(node);
    const latency = Number(node.latency);
    const latencyText = Number.isFinite(latency) && latency >= 0 && latency < 9000 ? `${latency}ms` : '-';
    const protocol = getProxyNodeProtocol(node);
    const remark = getProxyNodeDisplayRemark(node);

    const row = document.createElement('div');
    row.className = `proxy-row proxy-row-lite no-drag is-status-${statusTag}`;
    row.setAttribute('data-proxy-id', proxyId);
    row.tabIndex = 0;
    if (isSelected) row.classList.add('is-selected');
    if (currentProxyInspectorId === proxyId) row.classList.add('is-inspecting');

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;min-width:22px;';
    const input = document.createElement('input');
    input.type = useSingleMode ? 'radio' : 'checkbox';
    input.name = 'ps';
    input.checked = useSingleMode ? isSelected : (node.enable !== false);
    input.dataset.action = 'proxy-select';
    input.dataset.proxyId = proxyId;
    input.className = 'proxy-select-input no-drag';
    left.appendChild(input);

    const mid = document.createElement('div');
    mid.style.cssText = 'flex:1;min-width:0;display:flex;align-items:center;gap:8px;';

    const statusDot = document.createElement('span');
    statusDot.className = `proxy-status-dot is-${statusTag}`;
    mid.appendChild(statusDot);

    const name = document.createElement('span');
    name.className = 'proxy-remark';
    name.textContent = remark;
    name.title = remark;
    mid.appendChild(name);

    const latencyBadge = document.createElement('span');
    latencyBadge.textContent = latencyText;
    let latencyClass = '';
    if (Number.isFinite(latency) && latency >= 0 && latency < 9000) {
        if (latency < 300) latencyClass = 'good';
        else if (latency < 800) latencyClass = 'mid';
        else latencyClass = 'bad';
    }
    latencyBadge.className = `proxy-latency-badge ${latencyClass}`;
    latencyBadge.style.marginLeft = 'auto';
    latencyBadge.style.flexShrink = '0';
    mid.appendChild(latencyBadge);

    const protoBadge = document.createElement('span');
    protoBadge.textContent = protocol;
    protoBadge.className = 'proxy-proto';
    mid.appendChild(protoBadge);

    const right = document.createElement('div');
    right.className = 'proxy-right';
    right.classList.add(isManual ? 'is-manual' : 'is-sub');

    const btnTest = document.createElement('button');
    btnTest.className = 'proxy-action-btn test';
    btnTest.dataset.action = 'proxy-test';
    btnTest.dataset.proxyId = proxyId;
    btnTest.textContent = '⚡';
    btnTest.title = t('btnTest') || 'Test';
    right.appendChild(btnTest);

    if (isManual) {
        const btnEdit = document.createElement('button');
        btnEdit.className = 'proxy-action-btn edit';
        btnEdit.dataset.action = 'proxy-edit';
        btnEdit.dataset.proxyId = proxyId;
        btnEdit.textContent = '✎';
        btnEdit.title = t('btnEdit') || 'Edit';
        right.appendChild(btnEdit);
    }

    const btnDel = document.createElement('button');
    btnDel.className = 'proxy-action-btn delete';
    btnDel.dataset.action = 'proxy-delete';
    btnDel.dataset.proxyId = proxyId;
    btnDel.textContent = '🗑';
    btnDel.title = t('delete') || 'Delete';
    right.appendChild(btnDel);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);
    return row;
}

function shouldUseProxyNodeLiteFallback(listEl) {
    if (!(listEl instanceof HTMLElement)) return false;
    const firstRow = listEl.querySelector('.proxy-row[data-proxy-id]');
    if (!(firstRow instanceof HTMLElement)) return true;
    try {
        const style = window.getComputedStyle(firstRow);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
        const opacity = Number(style.opacity);
        if (Number.isFinite(opacity) && opacity <= 0) return true;
    } catch (e) { }
    const rect = firstRow.getBoundingClientRect();
    return rect.height < 14 || rect.width < 60;
}

function renderProxyNodesLite(list, listEl, options = {}) {
    if (!Array.isArray(list) || !(listEl instanceof HTMLElement)) return 0;
    const isManual = Boolean(options.isManual);
    listEl.textContent = '';
    let count = 0;
    list.forEach((node) => {
        if (!node || typeof node !== 'object') return;
        const proxyId = String(node.id || '').trim();
        if (!proxyId) return;
        const row = createProxyNodeLiteRow(node, {
            proxyId,
            isManual,
            isSelected: globalSettings.mode === 'single' && String(globalSettings.selectedId || '') === proxyId,
        });
        if (!row) return;
        listEl.appendChild(row);
        count += 1;
    });
    return count;
}

async function copyProxyInspectorUrl() {
    const node = (globalSettings.preProxies || []).find(p => p && p.id === currentProxyInspectorId);
    if (!node || !node.url) return;
    await copyTextToClipboard(String(node.url));
    showToast(tText('proxyUrlCopied', 'Proxy link copied'), 1200);
}

function renderProxyInspector() {
    const emptyEl = document.getElementById('proxyInspectorEmpty');
    const contentEl = document.getElementById('proxyInspectorContent');
    if (!emptyEl || !contentEl) return;

    const titleEl = document.getElementById('proxyInspectorTitle');
    const subEl = document.getElementById('proxyInspectorSub');
    const summaryEl = document.getElementById('proxyInspectorSummary');
    const metaEl = document.getElementById('proxyInspectorMeta');
    const urlEl = document.getElementById('proxyInspectorUrl');
    const stepsEl = document.getElementById('proxyInspectorSteps');
    const attemptsEl = document.getElementById('proxyInspectorAttempts');
    const actionsEl = document.getElementById('proxyInspectorActions');
    const stepsCountEl = document.getElementById('proxyInspectorStepsCount');
    const attemptsCountEl = document.getElementById('proxyInspectorAttemptsCount');

    const clearInspectorContent = () => {
        if (titleEl) titleEl.textContent = '-';
        if (subEl) subEl.textContent = '-';
        if (summaryEl) summaryEl.textContent = '';
        if (metaEl) metaEl.textContent = '';
        if (urlEl) {
            urlEl.textContent = '';
            urlEl.title = '';
        }
        if (stepsEl) stepsEl.textContent = '';
        if (attemptsEl) attemptsEl.textContent = '';
        if (actionsEl) actionsEl.textContent = '';
        if (stepsCountEl) stepsCountEl.textContent = '0';
        if (attemptsCountEl) attemptsCountEl.textContent = '0';
    };

    const node = (globalSettings.preProxies || []).find(p => p && p.id === currentProxyInspectorId);
    if (!node || !isProxyNodeInCurrentGroup(node)) {
        emptyEl.style.display = 'block';
        contentEl.style.display = 'none';
        clearInspectorContent();
        applyProxyInspectorSectionState();
        return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';

    const remark = getProxyNodeDisplayRemark(node);
    const proto = getProxyNodeProtocol(node);
    if (titleEl) titleEl.textContent = remark;
    if (subEl) subEl.textContent = proto;

    const detail = getProxyTestResultForNode(node);
    const steps = detail && Array.isArray(detail.steps) ? detail.steps : [];
    const attempts = detail && Array.isArray(detail.attempts) ? detail.attempts : [];
    const isExpertMode = normalizeProxyCognitiveMode(proxyCognitiveMode) === 'expert';

    const latency = Number(node.latency);
    const latencyText = Number.isFinite(latency) && latency >= 0 && latency < 9000
        ? `${latency}ms`
        : (node.lastTestAt ? tText('proxyWordFail', 'FAIL') : '-');
    const codeRaw = String(node.lastTestFinalCode || node.lastTestCode || '').trim();
    const codeText = codeRaw
        ? formatProxyErrorCodeLabel(codeRaw, { fallbackDash: true })
        : tText('proxyDiagSummaryEmpty', 'No data');
    const statusText = node.lastTestAt
        ? (node.lastTestOk ? tText('proxyWordOk', 'OK') : tText('proxyWordFail', 'FAIL'))
        : tText('proxyWordWait', 'WAIT');
    const engineText = node.lastTestCore ? String(node.lastTestCore || '-') : tText('proxyDiagSummaryEmpty', 'No data');
    const profileText = detail && detail.testProfile ? formatProxyTestProfileLabel(detail.testProfile) : '';
    const testedAtText = node.lastTestAt ? new Date(node.lastTestAt).toLocaleString() : '';
    const ip = node.ipInfo && node.ipInfo.ip ? String(node.ipInfo.ip) : '';
    const country = node.ipInfo && node.ipInfo.country ? String(node.ipInfo.country) : '';
    const city = node.ipInfo && node.ipInfo.city ? String(node.ipInfo.city) : '';
    const ipText = [ip, country, city].filter(Boolean).join(' · ');

    if (summaryEl) {
        summaryEl.textContent = '';
        const makeSummaryCard = (label, value, tone = 'info', title = '', kind = '') => {
            const card = document.createElement('div');
            card.className = `proxy-inspector-summary-card is-${tone}`;
            if (title) card.title = title;
            if (kind) card.setAttribute('data-kind', kind);

            const labelEl = document.createElement('div');
            labelEl.className = 'proxy-inspector-summary-label';
            labelEl.textContent = label;
            card.appendChild(labelEl);

            const valueEl = document.createElement('div');
            valueEl.className = 'proxy-inspector-summary-value';
            valueEl.textContent = value;
            card.appendChild(valueEl);
            summaryEl.appendChild(card);
        };

        makeSummaryCard(
            tText('proxyDetailStatus', 'Status'),
            statusText,
            node.lastTestAt ? (node.lastTestOk ? 'good' : 'critical') : 'neutral',
            '',
            'status',
        );
        makeSummaryCard(
            tText('proxyWordLatency', 'Latency'),
            latencyText,
            Number.isFinite(latency) && latency >= 0
                ? (latency < 350 ? 'good' : latency < 900 ? 'warn' : 'critical')
                : 'neutral',
            '',
            'latency',
        );
        if (isExpertMode) {
            makeSummaryCard(
                tText('proxyDetailCode', 'Code'),
                codeText,
                codeRaw
                    ? (String(codeRaw).toUpperCase().startsWith('OK') ? 'good' : 'warn')
                    : 'neutral',
                codeRaw ? formatProxyErrorCodeWithRaw(codeRaw, { fallbackDash: true }) : '',
                'code',
            );
            makeSummaryCard(
                tText('proxyDetailEngine', 'Engine'),
                engineText,
                engineText === tText('proxyDiagSummaryEmpty', 'No data') ? 'neutral' : 'info',
                '',
                'engine',
            );
        }
    }

    if (urlEl) {
        urlEl.textContent = String(node.url || '');
        urlEl.title = String(node.url || '');
    }

    if (metaEl) {
        metaEl.textContent = '';
        if (profileText) metaEl.appendChild(createProxyDetailInfoChip(tText('proxyDetailProfileLabel', 'Profile'), profileText, 'default'));
        if (isExpertMode) {
            if (testedAtText) metaEl.appendChild(createProxyDetailInfoChip(tText('proxyDetailTestedAtLabel', 'Tested At'), testedAtText, 'default'));
            if (ipText) metaEl.appendChild(createProxyDetailInfoChip(tText('proxyWordIp', 'IP'), ipText, 'default'));
            metaEl.appendChild(createProxyDetailInfoChip(tText('proxyDetailAttemptsLabel', 'Attempts'), String(attempts.length), 'default'));
        } else {
            const hint = createProxyDetailInfoChip(
                tText('proxyConfigFocusLabel', 'Focus'),
                tText('proxyConfigFocusHint', 'Expert mode shows code/engine and step diagnostics'),
                'default',
            );
            hint.classList.add('proxy-detail-chip-hint');
            metaEl.appendChild(hint);
        }
    }

    if (actionsEl) {
        actionsEl.textContent = '';
        const makeBtn = (key, label, tone = 'outline') => {
            const btn = document.createElement('button');
            btn.className = `${tone} no-drag`;
            btn.type = 'button';
            btn.setAttribute('data-action', key);
            btn.setAttribute('data-action-arg', String(node.id || ''));
            btn.textContent = label;
            actionsEl.appendChild(btn);
        };

        makeBtn('proxy-inspector-test', tText('btnTest', 'Test'), 'outline');
        if ((currentProxyGroup || 'manual') === 'manual') {
            makeBtn('proxy-inspector-edit', tText('btnEdit', 'Edit'), 'outline');
        }
        makeBtn('proxy-inspector-delete', tText('delete', 'Delete'), 'danger');
    }

    const sectionsWrapEl = contentEl ? contentEl.querySelector('.proxy-inspector-sections') : null;
    if (sectionsWrapEl) sectionsWrapEl.style.display = isExpertMode ? '' : 'none';

    if (stepsEl) {
        stepsEl.textContent = '';
        if (!detail) {
            appendProxyDetailEntry(stepsEl, tText('proxyDetailNoStageDetails', 'No stage details recorded'), '-', null);
        } else if (steps.length === 0) {
            appendProxyDetailEntry(stepsEl, tText('proxyDetailNoStageDetails', 'No stage details recorded'), '-', null);
        } else {
            steps.forEach((step) => {
                const label = `${step.name || tText('proxyDetailStepFallback', 'step')} · ${formatProxyErrorCodeLabel(step.code, { fallbackDash: true })}`;
                const value = `${step.message || '-'} (${formatDurationText(step.durationMs)})`;
                appendProxyDetailEntry(stepsEl, label, value, step.ok);
            });
        }
    }
    if (stepsCountEl) stepsCountEl.textContent = isExpertMode ? String(steps.length || 0) : '-';

    if (attemptsEl) {
        attemptsEl.textContent = '';
        if (!detail) {
            appendProxyDetailEntry(attemptsEl, tText('proxyDetailNoAttemptDetails', 'No attempt details recorded'), '-', null);
        } else if (attempts.length === 0) {
            appendProxyDetailEntry(attemptsEl, tText('proxyDetailNoAttemptDetails', 'No attempt details recorded'), '-', null);
        } else {
            attempts.forEach((attempt) => {
                const label = `#${attempt.index || 1} · ${(attempt.engine || tText('proxyDetailAttemptFallback', 'engine?'))} · ${formatProxyErrorCodeLabel(attempt.code, { fallbackDash: true })}`;
                const value = `${attempt.message || '-'} (${formatDurationText(attempt.durationMs)})`;
                appendProxyDetailEntry(attemptsEl, label, value, attempt.ok);
            });
        }
    }
    if (attemptsCountEl) attemptsCountEl.textContent = isExpertMode ? String(attempts.length || 0) : '-';
    applyProxyInspectorSectionState();
}

function renderProxyNodes() {
    if (currentPage === 'proxies' && document.getElementById('proxyPageTableBody')) {
        renderProxyPageTable();
    }
    ensurePreProxyListEventsBound();
    applyProxyListViewStateToControls();
    const runNonBlocking = (label, fn) => {
        try {
            fn();
        } catch (error) {
            console.error(`[proxy-ui] ${label} failed`, error);
        }
    };
    const modeSel = document.getElementById('proxyMode');
    if (modeSel && modeSel.options.length === 0) {
        modeSel.textContent = '';
        const optSingle = document.createElement('option');
        optSingle.value = 'single';
        optSingle.textContent = t('modeSingle') || 'Single';
        const optBalance = document.createElement('option');
        optBalance.value = 'balance';
        optBalance.textContent = t('modeBalance') || 'Balance';
        const optFailover = document.createElement('option');
        optFailover.value = 'failover';
        optFailover.textContent = t('modeFailover') || 'Failover';
        modeSel.appendChild(optSingle);
        modeSel.appendChild(optBalance);
        modeSel.appendChild(optFailover);
    }
    if (modeSel) modeSel.value = globalSettings.mode || 'single';
    const notifySwitch = document.getElementById('notifySwitch');
    if (notifySwitch instanceof HTMLInputElement) notifySwitch.checked = globalSettings.notify || false;
    const notifySwitch2 = document.getElementById('notifySwitch2');
    if (notifySwitch2 instanceof HTMLInputElement) notifySwitch2.checked = globalSettings.notify || false;

    const rawList = (globalSettings.preProxies || []).filter(p => {
        if (currentProxyGroup === 'manual') return !p.groupId || p.groupId === 'manual';
        return p.groupId === currentProxyGroup;
    });
    const list = applyProxyListFilterAndSort(rawList);
    const isExpertMode = normalizeProxyCognitiveMode(proxyCognitiveMode) === 'expert';
    if (currentProxyDetailId && !list.some((p) => p.id === currentProxyDetailId)) {
        currentProxyDetailId = null;
    }
    if (currentProxyInspectorId && !rawList.some((p) => p && p.id === currentProxyInspectorId)) {
        currentProxyInspectorId = null;
    }
    if (currentProxyInspectorId && !list.some((p) => p && p.id === currentProxyInspectorId)) {
        currentProxyInspectorId = list.length > 0 ? list[0].id : null;
    }
    if (!currentProxyInspectorId) {
        if (globalSettings.mode === 'single' && globalSettings.selectedId && list.some((p) => p && p.id === globalSettings.selectedId)) {
            currentProxyInspectorId = globalSettings.selectedId;
        } else if (list.length > 0) {
            currentProxyInspectorId = list[0].id;
        }
    }
    const normalizedStrategy = normalizeProxyBatchTestStrategyForUi(globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY], rawList.length);
    globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY] = normalizedStrategy;
    applyProxyBatchStrategyToInputs(normalizedStrategy);

    const listEl = document.getElementById('preProxyList');
    if (!(listEl instanceof HTMLElement)) {
        console.error('[proxy-ui] preProxyList container is missing');
        return;
    }
    listEl.textContent = '';
    listEl.title = tText('proxyNodeListHint', 'Tip: click row to select, double-click row to test, Enter to test, Space to toggle');
    listEl.setAttribute('data-empty-hint', tText('proxyListLoadingHint', 'Loading node list...'));

    const groupName = currentProxyGroup === 'manual' ? t('groupManual') : (globalSettings.subscriptions.find(s => s.id === currentProxyGroup)?.name || tText('subTitle', 'Subscription'));
    const visibleLabel = list.length !== rawList.length ? `${list.length}/${rawList.length}` : `${rawList.length}`;
    const currentGroupTitleEl = document.getElementById('currentGroupTitle');
    if (currentGroupTitleEl) currentGroupTitleEl.innerText = `${groupName} (${visibleLabel})`;
    try {
        updateProxyGroupStats(rawList, list);
    } catch (error) {
        console.error('[proxy-ui] updateProxyGroupStats failed', error);
    }
    runNonBlocking('renderProxyTrustGateExceptionAuditSummary', renderProxyTrustGateExceptionAuditSummary);
    runNonBlocking('renderProxyReplayRouteSummary', renderProxyReplayRouteSummary);
    runNonBlocking('renderProxyReplayRouteDriftSummary', renderProxyReplayRouteDriftSummary);
    runNonBlocking('renderProxyReplayRouteMitigationHint', renderProxyReplayRouteMitigationHint);
    runNonBlocking('renderProxyIssuerTemplateRemediationHint', renderProxyIssuerTemplateRemediationHint);
    runNonBlocking('renderProxyTrustExplainabilitySummary', renderProxyTrustExplainabilitySummary);
    runNonBlocking('renderProxyTrustExplainabilityHistorySummary', renderProxyTrustExplainabilityHistorySummary);
    runNonBlocking('renderProxyMitigationTelemetrySummary', renderProxyMitigationTelemetrySummary);

    const btnTest = document.getElementById('proxyGroupTestBtn');
    if (btnTest) btnTest.innerText = t('btnTestGroup');
    const btnNewSub = document.querySelector('button[data-action="open-sub-edit-modal"][data-action-arg="true"]');
    if (btnNewSub) btnNewSub.innerText = t('btnImportSub');
    const btnEditSub = document.getElementById('btnEditSub');
    if (btnEditSub) btnEditSub.innerText = t('btnEditSub');
    const btnRollbackSub = document.getElementById('btnRollbackSub');
    if (btnRollbackSub) btnRollbackSub.innerText = `↩ ${tText('proxyRollback', 'Rollback')}`;

    const isManual = currentProxyGroup === 'manual';
    const manualAddAreaEl = document.getElementById('manualAddArea');
    if (manualAddAreaEl instanceof HTMLElement) manualAddAreaEl.style.display = isManual ? 'block' : 'none';
    const manualStageLabelEl = document.getElementById('proxyManualStageLabel');
    if (manualStageLabelEl) manualStageLabelEl.style.display = isManual ? '' : 'none';
    const btnEditSubEl = document.getElementById('btnEditSub');
    if (btnEditSubEl instanceof HTMLElement) btnEditSubEl.style.display = isManual ? 'none' : 'inline-block';
    const currentSub = globalSettings.subscriptions.find(s => s.id === currentProxyGroup);
    if (btnRollbackSub) btnRollbackSub.style.display = (!isManual && currentSub && currentSub.snapshots && currentSub.snapshots.length > 0) ? 'inline-block' : 'none';

    if (list.length === 0) {
        currentProxyInspectorId = null;
        currentProxyDetailId = null;
        const empty = document.createElement('div');
        empty.className = 'proxy-empty-state no-drag';
        const icon = document.createElement('div');
        icon.className = 'proxy-empty-state-icon';
        icon.textContent = '📡';
        empty.appendChild(icon);
        const msg = document.createElement('div');
        msg.textContent = rawList.length === 0
            ? tText('proxyNoNodesInGroup', 'No proxy nodes in this group yet')
            : tText('proxyNoNodesByFilter', 'No nodes match current search/filter');
        empty.appendChild(msg);
        const hint = document.createElement('div');
        hint.className = 'proxy-empty-state-hint';
        hint.textContent = rawList.length === 0
            ? tText('proxyEmptyHint', 'Add a proxy or import a subscription to get started')
            : tText('proxyFilterHint', 'Try adjusting your search or filter criteria');
        empty.appendChild(hint);
        listEl.appendChild(empty);
        renderProxyInspector();
        const btnDone = document.querySelector('#proxyModal button[data-i18n="done"]');
        if (btnDone) btnDone.innerText = t('done');
        return;
    }

    let renderedRows = 0;
    let renderErrors = 0;
    const preferLiteRows = true;
    if (preferLiteRows) {
        renderedRows = renderProxyNodesLite(list, listEl, { isManual });
        listEl.dataset.renderMode = 'lite';
    } else {
    list.forEach((p, index) => {
        let proxyId = '';
        try {
            if (!p || typeof p !== 'object') return;
            proxyId = String(p.id || '').trim();
            if (!proxyId) return;

            const row = document.createElement('div');
            row.className = 'proxy-row no-drag';
            row.setAttribute('data-proxy-id', proxyId);
            row.tabIndex = 0;
            const nodeStatusTag = getNodeStatusTag(p);
            row.classList.add(`is-status-${nodeStatusTag}`);

            const isSel = globalSettings.mode === 'single' && String(globalSettings.selectedId || '') === proxyId;
            if (isSel) row.classList.add('is-selected');
            if (currentProxyInspectorId === proxyId) row.classList.add('is-inspecting');

        const inputType = globalSettings.mode === 'single' ? 'radio' : 'checkbox';
        const checked = globalSettings.mode === 'single' ? isSel : (p.enable !== false);

        const left = document.createElement('div');
        left.className = 'proxy-left';
        const input = document.createElement('input');
        input.type = inputType;
        input.name = 'ps';
        input.checked = checked;
        input.dataset.action = 'proxy-select';
        input.dataset.proxyId = proxyId;
        input.style.cssText = 'cursor:pointer; margin:0;';
        input.className = 'proxy-select-input no-drag';
        left.appendChild(input);

        const mid = document.createElement('div');
        mid.className = 'proxy-mid';

        const header = document.createElement('div');
        header.className = 'proxy-header';

        const proto = getProxyNodeProtocol(p);
        const displayRemark = getProxyNodeDisplayRemark(p);

        const protoSpan = document.createElement('span');
        protoSpan.className = 'proxy-proto';
        protoSpan.textContent = proto;

        const remarkSpan = document.createElement('span');
        remarkSpan.className = 'proxy-remark';
        remarkSpan.title = displayRemark;
        remarkSpan.textContent = displayRemark;

        const latencySpan = document.createElement('span');
        // Use new latency badge styles
        if (p.latency !== undefined) {
            if (p.latency === -1 || p.latency === 9999) {
                latencySpan.className = 'proxy-latency-badge is-fail';
                latencySpan.textContent = tText('proxyWordFail', 'FAIL');
            } else {
                let latencyClass = 'bad';
                if (p.latency < 300) latencyClass = 'good';
                else if (p.latency < 800) latencyClass = 'mid';
                latencySpan.className = `proxy-latency-badge ${latencyClass}`;
                latencySpan.textContent = `${p.latency}ms`;
            }
        } else {
            latencySpan.className = 'proxy-latency-badge';
            latencySpan.textContent = '-';
        }

        const statusTag = nodeStatusTag;
        const statusText = statusTag === 'pass'
            ? tText('proxyWordPass', 'PASS')
            : (statusTag === 'fail' ? tText('proxyWordFail', 'FAIL') : tText('proxyWordWait', 'WAIT'));
        const statusBadge = document.createElement('span');
        statusBadge.className = `proxy-status-pill is-${statusTag}`;
        statusBadge.textContent = statusText;

        header.appendChild(protoSpan);
        header.appendChild(remarkSpan);
        header.appendChild(latencySpan);
        header.appendChild(statusBadge);

        mid.appendChild(header);

        const testDetail = getProxyTestResultForNode(p);
        const metaStrip = document.createElement('div');
        metaStrip.className = 'proxy-meta-strip';
        const appendMetaPill = (text, tone = 'neutral', title = '') => {
            const normalized = String(text || '').trim();
            if (!normalized) return;
            const pill = document.createElement('span');
            pill.className = `proxy-meta-pill is-${tone}`;
            pill.textContent = normalized;
            if (title) pill.title = title;
            metaStrip.appendChild(pill);
        };

        if (testDetail) {
            const attemptCount = Array.isArray(testDetail.attempts) ? testDetail.attempts.length : 0;
            const finalCodeLabel = formatProxyErrorCodeLabel(testDetail.finalCode, { fallbackDash: true });
            const profileLabel = formatProxyTestProfileLabel(testDetail.testProfile);
            if (isExpertMode) {
                const statusCodeLabel = `${testDetail.ok ? tText('proxyWordOk', 'OK') : tText('proxyWordFail', 'FAIL')} · ${finalCodeLabel}`;
                const statusTitleParts = [];
                statusTitleParts.push(`${tText('proxyDetailCode', 'Code')}: ${formatProxyErrorCodeWithRaw(testDetail.finalCode, { fallbackDash: true })}`);
                if (testDetail.finalMessage) statusTitleParts.push(testDetail.finalMessage);
                appendMetaPill(statusCodeLabel, testDetail.ok ? 'good' : 'critical', statusTitleParts.join(' · '));
                if (testDetail.engine) appendMetaPill(testDetail.engine, 'info', tText('proxyDetailEngine', 'Engine'));
                appendMetaPill(formatDurationText(testDetail.durationMs), 'neutral', tText('proxyDetailDurationLabel', 'Duration'));
                appendMetaPill(`${attemptCount} ${tText('proxyWordAttempts', 'attempts')}`, 'neutral');
            } else {
                appendMetaPill(testDetail.ok ? tText('proxyWordPass', 'PASS') : tText('proxyWordFail', 'FAIL'), testDetail.ok ? 'good' : 'critical');
            }
            if (isExpertMode && profileLabel) appendMetaPill(profileLabel, 'info', tText('proxyDetailProfileLabel', 'Profile'));
        } else if (p.lastTestAt) {
            const fallbackStatus = p.lastTestOk ? tText('proxyWordOk', 'OK') : tText('proxyWordFail', 'FAIL');
            if (isExpertMode) {
                const fallbackCodeLabel = formatProxyErrorCodeLabel(p.lastTestFinalCode || p.lastTestCode, { fallbackDash: true });
                appendMetaPill(`${fallbackStatus} · ${fallbackCodeLabel}`, p.lastTestOk ? 'good' : 'critical');
            } else {
                appendMetaPill(fallbackStatus, p.lastTestOk ? 'good' : 'critical');
            }
        } else if (isExpertMode) {
            appendMetaPill(tText('proxyWordWait', 'WAIT'), 'neutral');
        }

        if (isExpertMode && p.lastTestAt) {
            const testedAt = new Date(p.lastTestAt);
            appendMetaPill(testedAt.toLocaleTimeString(), 'neutral', testedAt.toLocaleString());
        }

        if (metaStrip.childElementCount > 0) mid.appendChild(metaStrip);

        if (isExpertMode && p.ipInfo && (p.ipInfo.country || p.ipInfo.city || p.ipInfo.timezone || p.ipInfo.ip)) {
            const parts = [];
            if (p.ipInfo.ip) parts.push(p.ipInfo.ip);
            if (p.ipInfo.country) parts.push(p.ipInfo.country);
            if (p.ipInfo.city) parts.push(p.ipInfo.city);
            if (p.ipInfo.timezone) parts.push(p.ipInfo.timezone);
            const text = parts.join(' · ');

            const ipBadge = document.createElement('div');
            ipBadge.className = 'proxy-sub proxy-sub-ip';
            ipBadge.title = text;
            ipBadge.textContent = text;
            mid.appendChild(ipBadge);
        }

        const right = document.createElement('div');
        right.className = 'proxy-right';
        right.classList.add(isManual ? 'is-manual' : 'is-sub');

        // Test button - icon only
        const btnTest = document.createElement('button');
        btnTest.className = 'proxy-action-btn test';
        btnTest.dataset.action = 'proxy-test';
        btnTest.dataset.proxyId = proxyId;
        btnTest.textContent = '⚡';
        btnTest.title = t('btnTest') || 'Test';
        right.appendChild(btnTest);

        // Detail toggle button - icon only
        const btnDetail = document.createElement('button');
        const isDetailOpen = currentProxyDetailId === proxyId;
        btnDetail.className = `proxy-action-btn detail ${isDetailOpen ? 'is-expanded' : ''}`;
        btnDetail.dataset.action = 'proxy-detail';
        btnDetail.dataset.proxyId = proxyId;
        btnDetail.textContent = isDetailOpen ? '▼' : '▶';
        btnDetail.title = isDetailOpen
            ? tText('proxyDetailHide', 'Hide details')
            : tText('proxyDetailShow', 'Show details');
        right.appendChild(btnDetail);

        // Edit button - icon only (for manual proxies)
        if (isManual) {
            const btnEdit = document.createElement('button');
            btnEdit.className = 'proxy-action-btn edit';
            btnEdit.dataset.action = 'proxy-edit';
            btnEdit.dataset.proxyId = proxyId;
            btnEdit.textContent = '✎';
            btnEdit.title = t('btnEdit') || 'Edit';
            right.appendChild(btnEdit);
        }

        // Delete button - icon only
        const btnDel = document.createElement('button');
        btnDel.className = 'proxy-action-btn delete';
        btnDel.dataset.action = 'proxy-delete';
        btnDel.dataset.proxyId = proxyId;
        btnDel.textContent = '🗑';
        btnDel.title = t('delete') || 'Delete';
        right.appendChild(btnDel);

        row.appendChild(left);
        row.appendChild(mid);
        row.appendChild(right);
        listEl.appendChild(row);

        if (currentProxyDetailId === proxyId) {
            const detailPanel = createProxyTestDetailPanel(p);
            if (detailPanel) listEl.appendChild(detailPanel);
        }
        renderedRows += 1;
        } catch (err) {
            renderErrors += 1;
            console.error('Failed to render proxy row:', err, { index, node: p });
            const fallbackRow = createProxyNodeFallbackRow(p, {
                proxyId,
                isManual,
                isSelected: globalSettings.mode === 'single' && String(globalSettings.selectedId || '') === proxyId,
                errorMessage: err && err.message ? err.message : String(err),
            });
            if (fallbackRow) {
                listEl.appendChild(fallbackRow);
                renderedRows += 1;
            }
        }
    });
    }

    listEl.dataset.rawCount = String(rawList.length);
    listEl.dataset.filteredCount = String(list.length);
    listEl.dataset.renderedCount = String(renderedRows);
    listEl.dataset.renderErrors = String(renderErrors);
    listEl.setAttribute('data-empty-hint', tText('proxyNoNodesByFilter', 'No nodes match current search/filter'));

    if (!preferLiteRows && list.length > 0 && shouldUseProxyNodeLiteFallback(listEl)) {
        const liteCount = renderProxyNodesLite(list, listEl, { isManual });
        if (liteCount > 0) {
            renderedRows = liteCount;
            listEl.dataset.renderedCount = String(renderedRows);
            listEl.dataset.renderMode = 'lite';
        }
    }

    if (renderedRows === 0) {
        currentProxyInspectorId = null;
        currentProxyDetailId = null;
        const empty = document.createElement('div');
        empty.className = 'proxy-empty-state no-drag';
        empty.textContent = tText('proxyNoRenderableNodes', 'Nodes exist, but they could not be rendered. Please check node data format.');
        listEl.appendChild(empty);
    }

    const doneButtons = Array.from(document.querySelectorAll('#proxyModal button[data-i18n="done"]'));
    doneButtons.forEach((btn) => { btn.innerText = t('done'); });
    const closeButtons = Array.from(document.querySelectorAll('#proxyModal button[data-i18n="btnClose"]'));
    closeButtons.forEach((btn) => { btn.innerText = t('btnClose') || 'Close'; });
    runNonBlocking('renderProxyInspector', renderProxyInspector);
}

function resetProxyInput() {
    document.getElementById('editProxyId').value = '';
    document.getElementById('newProxyRemark').value = '';
    document.getElementById('newProxyUrl').value = '';
    const btn = document.getElementById('btnSaveProxy');
    btn.innerText = t('add'); btn.className = '';
}

function editPreProxy(id) {
    const p = globalSettings.preProxies.find(x => x.id === id);
    if (!p) return;
    document.getElementById('editProxyId').value = p.id;
    document.getElementById('newProxyRemark').value = p.remark;
    document.getElementById('newProxyUrl').value = p.url;
    const btn = document.getElementById('btnSaveProxy');
    btn.innerText = t('save'); btn.className = 'outline';
    document.getElementById('newProxyUrl').focus();
}

async function savePreProxy() {
    const id = document.getElementById('editProxyId').value;
    let remark = document.getElementById('newProxyRemark').value;
    const url = document.getElementById('newProxyUrl').value.trim();
    if (!url) return;
    if (!remark) remark = getProxyRemark(url) || tText('proxyManualNodeFallback', 'Manual Node');
    if (!globalSettings.preProxies) globalSettings.preProxies = [];
    if (id) {
        const idx = globalSettings.preProxies.findIndex(x => x.id === id);
        if (idx > -1) { globalSettings.preProxies[idx].remark = remark; globalSettings.preProxies[idx].url = url; }
    } else {
        globalSettings.preProxies.push({ id: Date.now().toString(), remark, url, enable: true, groupId: 'manual' });
    }
    resetProxyInput(); renderProxyNodes(); await window.electronAPI.saveSettings(globalSettings);
}

const PROXY_HTTP_PORTS = new Set(['80', '8080', '8081', '8000', '8001', '8008', '8010', '8118', '8123', '8880', '8888', '8889', '3128', '808', '82', '83']);
const PROXY_HTTPS_PORTS = new Set(['443', '8443', '9443', '4443']);
const PROXY_SOCKS_PORTS = new Set(['1080', '10808', '1081', '10888', '9050', '9051', '9052', '9053', '9054', '9055', '9060', '9061', '9062', '9065', '9066', '9070', '9080', '9090', '9100', '9150', '9191', '9200', '9250']);

function detectProxySchemeFromPort(port) {
    const p = String(port || '').trim();
    if (PROXY_HTTP_PORTS.has(p)) return 'http';
    if (PROXY_HTTPS_PORTS.has(p)) return 'https';
    if (PROXY_SOCKS_PORTS.has(p)) return 'socks5';
    return 'socks5';
}

function parseProxyHostPort(input) {
    const text = String(input || '').trim();
    const m = text.match(/^([^\s:]+):(\d{2,5})$/);
    if (!m) return null;
    return { host: m[1], port: m[2] };
}

function extractProxyHostPortForMatch(url) {
    const text = String(url || '').trim();
    if (!text) return '';
    let hostPort = '';
    const at = text.match(/@([^/?#]+)/);
    if (at) hostPort = at[1];
    if (!hostPort) {
        const m = text.match(/:\/\/([^/?#]+)/);
        if (m) hostPort = m[1];
    }
    if (!hostPort) return '';
    if (hostPort.includes('@')) hostPort = hostPort.split('@').pop();
    return hostPort.trim().toLowerCase();
}

function parseProxyBatchEntry(token, { defaultScheme = 'socks5', autoScheme = true } = {}) {
    const text = String(token || '').trim();
    if (!text) return null;
    if (text.startsWith('#') || text.startsWith('//')) return null;
    if (text.includes('://')) {
        return {
            raw: text,
            url: text,
            hostPort: extractProxyHostPortForMatch(text),
            hasScheme: true,
            scheme: String(text.split('://')[0] || '').toLowerCase(),
        };
    }
    const hp = parseProxyHostPort(text);
    if (!hp) return null;
    const scheme = autoScheme ? detectProxySchemeFromPort(hp.port) : defaultScheme;
    const url = `${scheme}://${hp.host}:${hp.port}`;
    return { raw: text, url, hostPort: `${hp.host}:${hp.port}`.toLowerCase(), hasScheme: false, scheme };
}

function normalizeProxyUrlKey(url) {
    return String(url || '').trim().toLowerCase();
}

async function importProxyBatchFromText(rawText, { defaultScheme = 'socks5', autoScheme = true } = {}) {
    const text = String(rawText || '').trim();
    if (!text) {
        showAlert(tText('proxyBatchImportEmpty', 'Paste at least one node (host:port)'));
        return;
    }
    if (currentProxyGroup !== 'manual') {
        showAlert(tText('proxyBatchImportManualOnly', 'Switch to Manual group before batch importing nodes.'));
        return;
    }
    if (!globalSettings.preProxies) globalSettings.preProxies = [];
    const existing = new Set(globalSettings.preProxies.map(p => normalizeProxyUrlKey(p && p.url)));

    const candidates = [];
    text.split(/\r?\n/).forEach((line) => {
        const trimmed = String(line || '').trim();
        if (!trimmed) return;
        if (trimmed.startsWith('#') || trimmed.startsWith('//')) return;
        const cleaned = trimmed.split('#')[0].trim();
        if (!cleaned) return;
        cleaned.split(/[,\s]+/).filter(Boolean).forEach((tok) => candidates.push(tok));
    });

    let added = 0;
    let dup = 0;
    let invalid = 0;

    candidates.forEach((line, idx) => {
        const entry = parseProxyBatchEntry(line, { defaultScheme, autoScheme });
        if (!entry || !entry.url) {
            invalid += 1;
            return;
        }
        const key = normalizeProxyUrlKey(entry.url);
        if (!key || existing.has(key)) {
            dup += 1;
            return;
        }
        existing.add(key);
        const remark = getProxyRemark(entry.url) || tFormat('proxyNodeDefaultName', 'Node {index}', { index: idx + 1 });
        globalSettings.preProxies.push({
            id: `${Date.now()}-${added}-${Math.random().toString(16).slice(2, 8)}`,
            remark,
            url: entry.url,
            enable: true,
            groupId: 'manual',
        });
        added += 1;
    });

    await window.electronAPI.saveSettings(globalSettings);
    renderProxyNodes();
    updateToolbar();

    if (added === 0 && invalid > 0) {
        showAlert(tText('proxyBatchImportFailed', 'No valid nodes imported.'));
        return;
    }
    const summary = tFormat('proxyBatchImportSummary', 'Imported {added} · Skipped {dup} duplicates · {invalid} invalid', {
        added,
        dup,
        invalid,
    });
    showToast(summary, 2600);
}

async function openProxyBatchImport() {
    if (currentProxyGroup !== 'manual') {
        showAlert(tText('proxyBatchImportManualOnly', 'Switch to Manual group before batch importing nodes.'));
        return;
    }
    showInput(tText('proxyBatchImportTitle', 'Batch import nodes (one per line)'), async (value) => {
        await importProxyBatchFromText(value, { defaultScheme: 'socks5', autoScheme: true });
    });
    const inputEl = document.getElementById('inputModalValue');
    if (inputEl) {
        inputEl.value = '';
        inputEl.placeholder = tText('proxyBatchImportPlaceholder', 'host:port or scheme://host:port (auto-detect if omitted)');
        inputEl.rows = 8;
    }
}

function collectProxyBatchMatches(entries, nodes) {
    const idSet = new Set();
    let unmatched = 0;
    entries.forEach((entry) => {
        let matched = false;
        if (entry.hasScheme && entry.url) {
            const key = normalizeProxyUrlKey(entry.url);
            nodes.forEach((node) => {
                if (normalizeProxyUrlKey(node && node.url) === key) {
                    idSet.add(node.id);
                    matched = true;
                }
            });
        } else if (entry.hostPort) {
            nodes.forEach((node) => {
                const hp = extractProxyHostPortForMatch(node && node.url);
                if (hp && hp === entry.hostPort) {
                    idSet.add(node.id);
                    matched = true;
                }
            });
        }
        if (!matched) unmatched += 1;
    });
    return { idSet, unmatched };
}

async function deleteProxyBatchFromText(rawText, { defaultScheme = 'socks5', autoScheme = true, scope = 'ask' } = {}) {
    const text = String(rawText || '').trim();
    if (!text) {
        showAlert(tText('proxyBatchDeleteEmpty', 'Paste at least one node to delete.'));
        return;
    }
    const candidates = [];
    text.split(/\r?\n/).forEach((line) => {
        const trimmed = String(line || '').trim();
        if (!trimmed) return;
        if (trimmed.startsWith('#') || trimmed.startsWith('//')) return;
        const cleaned = trimmed.split('#')[0].trim();
        if (!cleaned) return;
        cleaned.split(/[,\s]+/).filter(Boolean).forEach((tok) => candidates.push(tok));
    });
    if (candidates.length === 0) {
        showAlert(tText('proxyBatchDeleteEmpty', 'Paste at least one node to delete.'));
        return;
    }

    const entries = candidates.map((line) => parseProxyBatchEntry(line, { defaultScheme, autoScheme })).filter(Boolean);
    if (entries.length === 0) {
        showAlert(tText('proxyBatchDeleteNone', 'No valid entries found.'));
        return;
    }

    const nodes = Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies.slice() : [];
    const inGroup = nodes.filter((node) => isProxyNodeInCurrentGroup(node));
    const currentMatch = collectProxyBatchMatches(entries, inGroup);
    const allMatch = collectProxyBatchMatches(entries, nodes);

    const runDelete = (match, scopeLabel) => {
        if (!match || match.idSet.size === 0) return;
        const confirmMsg = tFormat('proxyBatchDeleteConfirmScope', 'Delete {count} nodes in {scope}? (Unmatched {unmatched})', {
            count: match.idSet.size,
            unmatched: match.unmatched,
            scope: scopeLabel
        });
        showConfirm(confirmMsg, async () => {
            globalSettings.preProxies = nodes.filter((node) => !match.idSet.has(node.id));
            scheduleSettingsSave(0);
            renderProxyNodes();
            updateToolbar();
            const summary = tFormat('proxyBatchDeleteSummaryScope', 'Deleted {count} ({scope}) · Unmatched {unmatched}', {
                count: match.idSet.size,
                unmatched: match.unmatched,
                scope: scopeLabel
            });
            showToast(summary, 2600);
        });
    };

    const scopeCurrentLabel = tText('proxyBatchDeleteScopeCurrent', 'Current group');
    const scopeAllLabel = tText('proxyBatchDeleteScopeAll', 'All groups');

    if (scope === 'current') {
        if (currentMatch.idSet.size === 0) {
            showAlert(tText('proxyBatchDeleteNothing', 'No matching nodes found in current group.'));
            return;
        }
        runDelete(currentMatch, scopeCurrentLabel);
        return;
    }
    if (scope === 'all') {
        if (allMatch.idSet.size === 0) {
            showAlert(tText('proxyBatchDeleteNothingAll', 'No matching nodes found across all groups.'));
            return;
        }
        runDelete(allMatch, scopeAllLabel);
        return;
    }

    if (currentMatch.idSet.size === 0 && allMatch.idSet.size === 0) {
        showAlert(tText('proxyBatchDeleteNothing', 'No matching nodes found in current group.'));
        return;
    }

    if (currentMatch.idSet.size === 0 && allMatch.idSet.size > 0) {
        const msg = tFormat('proxyBatchDeleteConfirmAllOnly', 'No matches in current group. Delete {count} nodes in all groups? (Unmatched {unmatched})', {
            count: allMatch.idSet.size,
            unmatched: allMatch.unmatched
        });
        showConfirm(msg, async () => {
            globalSettings.preProxies = nodes.filter((node) => !allMatch.idSet.has(node.id));
            scheduleSettingsSave(0);
            renderProxyNodes();
            updateToolbar();
            const summary = tFormat('proxyBatchDeleteSummaryScope', 'Deleted {count} ({scope}) · Unmatched {unmatched}', {
                count: allMatch.idSet.size,
                unmatched: allMatch.unmatched,
                scope: scopeAllLabel
            });
            showToast(summary, 2600);
        });
        return;
    }

    if (typeof showConfirmChoice === 'function' && allMatch.idSet.size > currentMatch.idSet.size) {
        const msg = tFormat('proxyBatchDeleteScopePrompt', 'Delete matching nodes?\nCurrent group: {current} (Unmatched {currentUnmatched})\nAll groups: {all} (Unmatched {allUnmatched})', {
            current: currentMatch.idSet.size,
            currentUnmatched: currentMatch.unmatched,
            all: allMatch.idSet.size,
            allUnmatched: allMatch.unmatched
        });
        showConfirmChoice(msg, {
            okText: tFormat('proxyBatchDeleteScopeCurrentBtn', 'Current ({count})', { count: currentMatch.idSet.size }),
            altText: tFormat('proxyBatchDeleteScopeAllBtn', 'All ({count})', { count: allMatch.idSet.size }),
            onConfirm: () => runDelete(currentMatch, scopeCurrentLabel),
            onAlt: () => runDelete(allMatch, scopeAllLabel),
            onCancel: () => { }
        });
        return;
    }

    runDelete(currentMatch, scopeCurrentLabel);
}

async function openProxyBatchDelete() {
    showInput(tText('proxyBatchDeleteTitle', 'Batch delete nodes (one per line)'), async (value) => {
        await deleteProxyBatchFromText(value, { defaultScheme: 'socks5', autoScheme: true });
    });
    const inputEl = document.getElementById('inputModalValue');
    if (inputEl) {
        inputEl.value = '';
        inputEl.placeholder = tText('proxyBatchDeletePlaceholder', 'host:port or scheme://host:port (auto-detect if omitted)');
        inputEl.rows = 8;
    }
}

// --- Subscription Management ---
function openSubEditModal(isNew) {
    if (isClickDebugEnabled()) console.log('[click-debug] openSubEditModal invoked', isNew);
    const modal = document.getElementById('subEditModal');
    const headerTitle = modal.querySelector('.modal-header span'); if (headerTitle) headerTitle.innerText = t('subTitle');
    const labels = modal.querySelectorAll('label'); if (labels[0]) labels[0].innerText = t('subName'); if (labels[1]) labels[1].innerText = t('subUrl'); if (labels[2]) labels[2].innerText = t('subInterval');
    const options = document.getElementById('subInterval').options; options[0].text = t('optDisabled'); options[1].text = t('opt24h'); options[2].text = t('opt72h'); options[3].text = t('optCustom');
    const btnDel = document.getElementById('btnDelSub'); btnDel.innerText = t('btnDelSub'); btnDel.style.display = isNew ? 'none' : 'inline-block';
    const btnSave = modal.querySelector('button[data-action="save-subscription"]'); if (btnSave) btnSave.innerText = t('btnSaveUpdate');

    if (isNew) {
        document.getElementById('subId').value = '';
        document.getElementById('subName').value = '';
        document.getElementById('subUrl').value = '';
        document.getElementById('subInterval').value = '24';
        document.getElementById('subCustomInterval').style.display = 'none';
    }
    modal.style.display = 'flex';
    logModalState('subEditModal.open', modal);
    requestAnimationFrame(() => logModalState('subEditModal.open.raf', modal));
    setTimeout(() => logModalState('subEditModal.open.t20', modal), 20);
    document.getElementById('subInterval').onchange = function () { document.getElementById('subCustomInterval').style.display = this.value === 'custom' ? 'block' : 'none'; }
}

function closeSubEditModal() { document.getElementById('subEditModal').style.display = 'none'; }

function editCurrentSubscription() {
    const sub = globalSettings.subscriptions.find(s => s.id === currentProxyGroup);
    if (!sub) return;
    openSubEditModal(false);
    document.getElementById('subId').value = sub.id;
    document.getElementById('subName').value = sub.name;
    document.getElementById('subUrl').value = sub.url;
    const sel = document.getElementById('subInterval');
    const cust = document.getElementById('subCustomInterval');
    if (['0', '24', '72'].includes(sub.interval)) { sel.value = sub.interval; cust.style.display = 'none'; }
    else { sel.value = 'custom'; cust.style.display = 'block'; cust.value = sub.interval; }
}

async function saveSubscription() {
    const id = document.getElementById('subId').value;
    const name = document.getElementById('subName').value || 'Subscription';
    const url = document.getElementById('subUrl').value.trim();
    let interval = document.getElementById('subInterval').value;
    if (interval === 'custom') interval = document.getElementById('subCustomInterval').value;
    if (!url) return;

    let sub;
    if (id) {
        sub = globalSettings.subscriptions.find(s => s.id === id);
        if (sub) { sub.name = name; sub.url = url; sub.interval = interval; }
    } else {
        function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
        sub = { id: `sub-${Date.now()}`, name, url, interval, lastUpdated: 0 };
        globalSettings.subscriptions.push(sub);
    }
    closeSubEditModal();
    await updateSubscriptionNodes(sub);
    currentProxyGroup = sub.id;
    renderGroupTabs();
    await window.electronAPI.saveSettings(globalSettings);
}

async function deleteSubscription() {
    const id = document.getElementById('subId').value;
    if (!id) return;
    showConfirm(t('confirmDelSub'), async () => {
        globalSettings.subscriptions = globalSettings.subscriptions.filter(s => s.id !== id);
        globalSettings.preProxies = globalSettings.preProxies.filter(p => p.groupId !== id);
        currentProxyGroup = 'manual';
        closeSubEditModal(); renderGroupTabs(); await window.electronAPI.saveSettings(globalSettings);
    });
}

async function updateSubscriptionNodes(sub, options = {}) {
    const silent = Boolean(options && options.silent);
    try {
        const fetched = await window.electronAPI.invoke('fetch-url-conditional', { url: sub.url, etag: sub.etag, lastModified: sub.lastModified });
        if (fetched && fetched.notModified) {
            sub.lastUpdated = Date.now();
            if (!silent) showToast(`${t('msgSubUpdated')} ${sub.name} (Not Modified)`, 2000);
            return;
        }
        if (!fetched || fetched.error) throw new Error((fetched && fetched.error) ? fetched.error : 'Fetch failed');
        sub.etag = fetched.etag || sub.etag;
        sub.lastModified = fetched.lastModified || sub.lastModified;

        // Snapshot previous node list for rollback (keep last N snapshots)
        try {
            if (!sub.snapshots) sub.snapshots = [];
            const prevNodes = (globalSettings.preProxies || []).filter(p => p && p.groupId === sub.id).map(p => ({
                id: p.id,
                remark: p.remark,
                url: p.url,
                enable: p.enable,
                groupId: p.groupId,
                latency: p.latency,
                lastTestMsg: p.lastTestMsg,
                lastTestCore: p.lastTestCore,
                lastTestCoreSwitched: p.lastTestCoreSwitched,
                lastTestResult: p.lastTestResult && typeof p.lastTestResult === 'object' ? p.lastTestResult : null,
                ipInfo: p.ipInfo,
                lastIpAt: p.lastIpAt
            }));
            sub.snapshots.unshift({
                at: Date.now(),
                etag: sub.etag || null,
                lastModified: sub.lastModified || null,
                count: prevNodes.length,
                nodes: prevNodes
            });
            if (sub.snapshots.length > 5) sub.snapshots = sub.snapshots.slice(0, 5);
        } catch (e) { }

        const result = await window.electronAPI.invoke('parse-subscription', { content: fetched.content, hintType: sub.defaultScheme || 'auto' });
        if (!result || (result.errors && result.errors.length > 0 && (!result.nodes || result.nodes.length === 0))) {
            const e = formatResultError(result, 'Parse failed');
            const msg = (e.code ? `[${e.code}] ` : '') + e.message;
            throw new Error(msg);
        }

        // Replace nodes for this group using stable node.id (dedupe inside same subscription)
        const existing = new Map();
        (globalSettings.preProxies || []).forEach(p => {
            if (p && p.groupId === sub.id && p.id) existing.set(p.id, p);
        });
        globalSettings.preProxies = (globalSettings.preProxies || []).filter(p => p.groupId !== sub.id);

        const seen = new Set();
        let count = 0;
        (result.nodes || []).forEach((node, idx) => {
            const link = node.raw || node.url || '';
            if (!link || !link.includes('://')) return;
            const stableId = node.id || null;
            if (stableId && seen.has(stableId)) return;
            if (stableId) seen.add(stableId);

            const old = stableId ? existing.get(stableId) : null;
            const remark = node.name || getProxyRemark(link) || `Node ${idx + 1}`;
            const enable = old ? (old.enable !== false) : true;
            const latency = old && typeof old.latency === 'number' ? old.latency : -1;
            const lastTestMsg = old ? (old.lastTestMsg || '') : '';
            const lastTestCore = old ? (old.lastTestCore || '') : '';
            const lastTestCoreSwitched = old ? !!old.lastTestCoreSwitched : false;
            const lastTestAttempts = old && typeof old.lastTestAttempts === 'number' ? old.lastTestAttempts : 0;
            const lastTestFinalCode = old ? (old.lastTestFinalCode || '') : '';
            const lastTestResult = old && old.lastTestResult && typeof old.lastTestResult === 'object' ? old.lastTestResult : null;
            const ipInfo = old ? (old.ipInfo || null) : null;
            const lastIpAt = old ? (old.lastIpAt || 0) : 0;

            // Fall back to random uuid if parser didn't provide stable id
            function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
            const id = stableId || uuidv4();

            globalSettings.preProxies.push({
                id,
                remark,
                url: link,
                enable,
                groupId: sub.id,
                latency,
                lastTestMsg,
                lastTestCore,
                lastTestCoreSwitched,
                lastTestAttempts,
                lastTestFinalCode,
                lastTestResult,
                ipInfo,
                lastIpAt
            });
            count++;
        });

        sub.lastUpdated = Date.now();
        sub.lastImportAt = Date.now();
        sub.lastImportOk = true;
        sub.lastImportCount = count;
        if (!silent) showToast(`${t('msgSubUpdated')} ${sub.name} (${count} ${t('msgNodes')})`, 2200);
    } catch (e) {
        sub.lastImportAt = Date.now();
        sub.lastImportOk = false;
        const err = formatIpcError(e);
        const msg = `${t('msgUpdateFailed')}${err.code ? ` [${err.code}]` : ''} ${err.message}`;
        if (silent) {
            const errDetail = (() => {
                try { return JSON.stringify(e); } catch (_) { return null; }
            })();
            console.warn('[subscription-update] silent failure', sub && sub.name ? sub.name : '', err, errDetail || '');
            showToast(msg, 2400);
        } else {
            showAlert(msg);
        }
    }
}

async function rollbackSubscriptionNodes(subId) {
    const sub = (globalSettings.subscriptions || []).find(s => s.id === subId);
    if (!sub || !sub.snapshots || sub.snapshots.length === 0) {
        return showAlert(tText('proxyRollbackNoSnapshot', 'No snapshot to rollback'));
    }
    const snap = sub.snapshots[0];
    showConfirm(tFormat('proxyRollbackConfirm', 'Rollback {name} to snapshot ({time})?', {
        name: sub.name,
        time: new Date(snap.at).toLocaleString(),
    }), async () => {
        globalSettings.preProxies = (globalSettings.preProxies || []).filter(p => p.groupId !== sub.id);
        (snap.nodes || []).forEach(n => globalSettings.preProxies.push({ ...n }));
        sub.lastUpdated = Date.now();
        await window.electronAPI.saveSettings(globalSettings);
        renderProxyNodes();
        showAlert(tFormat('proxyRollbackDone', 'Rolled back: {name} ({count} nodes)', {
            name: sub.name,
            count: snap.count || 0,
        }));
    });
}

function applyProxyTestResultToNode(node, res) {
    if (!node || typeof node !== 'object') return;
    const attempts = (res && Array.isArray(res.attempts)) ? res.attempts : [];
    const firstAttempt = attempts.length > 0 ? attempts[0] : null;
    const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const finalEngine = (res && res.engine) ? String(res.engine) : (lastAttempt && lastAttempt.engine ? String(lastAttempt.engine) : '');
    const switched = Boolean(firstAttempt && lastAttempt && firstAttempt.engine && lastAttempt.engine && firstAttempt.engine !== lastAttempt.engine);

    node.latency = res && res.ok
        ? (res.connectivity && typeof res.connectivity.latencyMs === 'number' ? res.connectivity.latencyMs : node.latency)
        : -1;
    node.lastTestAt = Date.now();
    node.lastTestOk = Boolean(res && res.ok);
    node.lastTestCode = res && res.code ? String(res.code) : '';
    const lastMsg = res && (res.finalMessage || res.error || (res.connectivity && res.connectivity.error))
        ? String(res.finalMessage || res.error || res.connectivity.error)
        : '';
    node.lastTestMsg = lastMsg;
    node.lastTestCore = finalEngine;
    node.lastTestCoreSwitched = switched;
    node.lastTestAttempts = attempts.length;
    node.lastTestFinalCode = res && res.finalCode ? String(res.finalCode) : (node.lastTestCode || '');
    node.ipInfo = res && res.geo ? res.geo : (res && res.ip ? { ip: res.ip } : null);
    node.lastIpAt = (res && (res.geo || res.ip)) ? Date.now() : (node.lastIpAt || 0);
    node.lastTestResult = normalizeStoredProxyTestResult(res, node);
}

async function testSingleProxy(id, btnEl = null) {
    const p = globalSettings.preProxies.find(x => x.id === id);
    if (!p) return;
    const strategy = normalizeProxyBatchTestStrategyForUi(globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY], 1);
    globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY] = strategy;
    applyProxyBatchStrategyToInputs(strategy);
    const btn = (btnEl instanceof HTMLButtonElement)
        ? btnEl
        : Array.from(document.querySelectorAll('#preProxyList button[data-action="proxy-test"]')).find(el => el.getAttribute('data-proxy-id') === id);
    if (btn) btn.innerText = "...";
    try {
        const res = await window.electronAPI.invoke('test-proxy-node', buildProxyTestInvokePayload(p.url, strategy));
        applyProxyTestResultToNode(p, res);
        await window.electronAPI.saveSettings(globalSettings);
        renderProxyNodes();
    } catch (e) {
        p.lastTestAt = Date.now();
        p.lastTestOk = false;
        const err = formatIpcError(e);
        p.lastTestCode = err.code ? String(err.code) : '';
        p.lastTestMsg = err.message;
        p.lastTestCore = '';
        p.lastTestCoreSwitched = false;
        p.lastTestAttempts = 0;
        p.lastTestFinalCode = p.lastTestCode || '';
        p.lastTestResult = normalizeStoredProxyTestResult({
            ok: false,
            code: p.lastTestCode || 'UNKNOWN',
            finalCode: p.lastTestFinalCode || p.lastTestCode || 'UNKNOWN',
            finalMessage: err.message || '',
            error: err.message || '',
            engine: '',
            protocol: (p.url && p.url.includes('://')) ? p.url.split('://')[0] : '',
            startedAt: p.lastTestAt,
            durationMs: 0,
            steps: [],
            attempts: [],
        }, p);
        await window.electronAPI.saveSettings(globalSettings);
        renderProxyNodes();
    }
}

async function testCurrentGroup() {
    const list = (globalSettings.preProxies || []).filter(p => {
        if (currentProxyGroup === 'manual') return !p.groupId || p.groupId === 'manual';
        return p.groupId === currentProxyGroup;
    });
    if (currentProxyDetailId && !list.some((p) => p.id === currentProxyDetailId)) {
        currentProxyDetailId = null;
    }
    const normalizedStrategy = normalizeProxyBatchTestStrategyForUi(globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY], list.length);
    globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY] = normalizedStrategy;
    applyProxyBatchStrategyToInputs(normalizedStrategy);
    if (list.length === 0) return;
    const groupTestButton = document.getElementById('proxyGroupTestBtn');
    const pageTestBtn = document.getElementById('proxyPageTestAllBtn');
    if (groupTestButton) groupTestButton.innerText = `⚡ 0/${list.length}`;
    if (pageTestBtn) pageTestBtn.innerText = `⚡ 0/${list.length}`;

    // 先将所有测试按钮设置为加载状态
    list.forEach(p => {
        const btn = Array.from(document.querySelectorAll('#preProxyList button[data-action="proxy-test"]')).find(el => el.getAttribute('data-proxy-id') === p.id);
        if (btn) btn.innerText = "...";
    });

    try {
        const runOne = async (p, _index, ctx = null) => {
            try {
                const runtimeStrategy = normalizeProxyBatchTestStrategyForUi(
                    ctx && ctx.runtimeOptions ? ctx.runtimeOptions : normalizedStrategy,
                    1
                );
                const res = await window.electronAPI.invoke('test-proxy-node', buildProxyTestInvokePayload(p.url, runtimeStrategy));
                applyProxyTestResultToNode(p, res);
                return { ok: Boolean(res && res.ok), result: res };
            } catch (e) {
                p.latency = -1;
                p.lastTestAt = Date.now();
                p.lastTestOk = false;
                const err = formatIpcError(e);
                p.lastTestCode = err.code ? String(err.code) : '';
                p.lastTestMsg = err.message;
                p.lastTestCore = '';
                p.lastTestCoreSwitched = false;
                p.lastTestAttempts = 0;
                p.lastTestFinalCode = p.lastTestCode || '';
                p.lastTestResult = normalizeStoredProxyTestResult({
                    ok: false,
                    code: p.lastTestCode || 'UNKNOWN',
                    finalCode: p.lastTestFinalCode || p.lastTestCode || 'UNKNOWN',
                    finalMessage: err.message || '',
                    error: err.message || '',
                    engine: '',
                    protocol: (p.url && p.url.includes('://')) ? p.url.split('://')[0] : '',
                    startedAt: p.lastTestAt,
                    durationMs: 0,
                    steps: [],
                    attempts: [],
                }, p);
                return { ok: false, error: err.message };
            }
        };

        const schedulerApi = getProxyBatchSchedulerApi();
        let summary = null;
        if (schedulerApi && typeof schedulerApi.runProxyBatchTestSchedule === 'function') {
            summary = await schedulerApi.runProxyBatchTestSchedule(
                list,
                runOne,
                normalizedStrategy,
                {
                    hardwareConcurrency: getHardwareConcurrencyHint(),
                    onProgress: ({ completed, total, failed, success, runtimeOptions }) => {
                        if (groupTestButton) {
                            groupTestButton.innerText = `⚡ ${completed}/${total}`;
                            const profile = runtimeOptions && runtimeOptions.profile ? String(runtimeOptions.profile) : normalizedStrategy.testProfile;
                            groupTestButton.title = `${tText('proxyWordOk', 'OK')} ${success} · ${tText('proxyWordFail', 'FAIL')} ${failed} · ${formatProxyTestProfileLabel(profile)}`;
                        }
                        if (pageTestBtn) pageTestBtn.innerText = `⚡ ${completed}/${total}`;
                    },
                }
            );
        } else {
            // Fallback: keep previous bounded concurrency behavior.
            const concurrency = Math.max(1, Math.min(4, (list.length || 1)));
            let cursor = 0;
            const workers = new Array(concurrency).fill(0).map(async () => {
                while (cursor < list.length) {
                    const p = list[cursor++];
                    await runOne(p);
                }
            });
            await Promise.all(workers);
            summary = {
                total: list.length,
                completed: list.length,
                success: list.filter(p => p.lastTestOk).length,
                failed: list.filter(p => !p.lastTestOk).length,
                skipped: 0,
                budgetExceeded: false,
                durationMs: null,
            };
        }
        await window.electronAPI.saveSettings(globalSettings);
        if (globalSettings.mode === 'single') {
            let best = null, min = 99999;
            list.forEach(p => { if (p.latency > 0 && p.latency < min) { min = p.latency; best = p; } });
            if (best) {
                globalSettings.selectedId = best.id;
                if (document.getElementById('notifySwitch').checked) new Notification('GeekEZ', { body: `Auto-Switched: ${best.remark}` });
            }
        }
        if (summary) {
            const durationText = Number.isFinite(summary.durationMs) ? ` · ${(summary.durationMs / 1000).toFixed(1)}s` : '';
            const brief = tFormat('proxyBatchSummaryBrief', '{completed}/{total} done · ok {success} · fail {failed}{duration}', {
                completed: summary.completed,
                total: summary.total,
                success: summary.success,
                failed: summary.failed,
                duration: durationText,
            });
            const recommendedProfile = summary.recommended && summary.recommended.testProfile
                ? tFormat('proxyBatchSummaryNextProfile', ' · next:{profile}', { profile: formatProxyTestProfileLabel(summary.recommended.testProfile) })
                : '';
            showToast(
                summary.budgetExceeded
                    ? `${brief} · ${tText('proxyBudgetReached', 'budget reached')}${recommendedProfile}`
                    : `${brief}${recommendedProfile}`,
                2800,
            );
        }
    } catch (e) {
        const err = formatIpcError(e);
        showToast(`${tText('proxyBatchTestFailed', 'Batch test failed')}: ${err.message}`, 2600);
    } finally {
        if (groupTestButton) {
            groupTestButton.innerText = t('btnTestGroup');
            groupTestButton.title = '';
        }
        if (pageTestBtn) {
            pageTestBtn.innerText = t('btnTestGroup');
            pageTestBtn.title = '';
        }
        renderProxyNodes();
    }
}

async function exportCurrentGroupReport() {
    try {
        const groupId = currentProxyGroup === 'manual' ? 'manual' : currentProxyGroup;
        const result = await window.electronAPI.invoke('export-proxy-test-report', { groupId });
        if (result && result.success) {
            const format = result.format ? String(result.format).toUpperCase() : 'JSON';
            showToast(
                tFormat('proxyReportExported', 'Report exported ({format}) · nodes {nodes} · fail {fail}', {
                    format,
                    nodes: result.totalNodes || 0,
                    fail: result.failNodes || 0,
                }),
                2600,
            );
            return;
        }
        if (result && result.cancelled) return;
        const msg = result && result.error ? String(result.error) : tText('proxyReportExportFailed', 'Export report failed');
        showAlert(msg);
    } catch (e) {
        const err = formatIpcError(e);
        showAlert(`${tText('proxyReportExportFailed', 'Export report failed')}${err.code ? ` [${err.code}]` : ''}: ${err.message}`);
    }
}

function queueSettingsSave() {
    __settingsSaveChain = __settingsSaveChain
        .catch(() => { })
        .then(async () => {
            if (!__settingsDirty || __settingsSavedVersion === __settingsSaveVersion) return;
            const versionAtStart = __settingsSaveVersion;
            try {
                await window.electronAPI.saveSettings(globalSettings);
                __settingsSavedVersion = versionAtStart;
                if (__settingsSavedVersion === __settingsSaveVersion) __settingsDirty = false;
            } catch (e) {
                console.warn('[auto-save-settings] failed:', e);
            }
        });
    return __settingsSaveChain;
}

function scheduleSettingsSave(delayMs = 350) {
    try {
        __settingsDirty = true;
        __settingsSaveVersion += 1;
        const delay = Number.isFinite(delayMs) ? Math.max(0, Number(delayMs)) : 350;
        if (__settingsSaveTimer) clearTimeout(__settingsSaveTimer);
        __settingsSaveTimer = setTimeout(() => {
            __settingsSaveTimer = null;
            queueSettingsSave();
        }, delay);
    } catch (e) { }
}

function flushScheduledSettingsSave() {
    try {
        if (__settingsSaveTimer) {
            clearTimeout(__settingsSaveTimer);
            __settingsSaveTimer = null;
        }
        return queueSettingsSave();
    } catch (e) {
        return Promise.resolve();
    }
}

function delP(id) {
    globalSettings.preProxies = (globalSettings.preProxies || []).filter(p => p.id !== id);
    if (currentProxyInspectorId === id) currentProxyInspectorId = null;
    if (currentProxyDetailId === id) currentProxyDetailId = null;
    scheduleSettingsSave();
    renderProxyNodes();
    updateToolbar();
}

function confirmDeleteProxyNode(proxyId) {
    const node = (globalSettings.preProxies || []).find(p => p && p.id === proxyId);
    const name = node ? getProxyNodeDisplayRemark(node) : proxyId;
    if (isClickDebugEnabled()) console.log('[click-debug] confirmDeleteProxyNode', { proxyId, name });
    showConfirm(`${tText('confirmDelProxyNode', 'Delete this proxy node?')}\n${name}`, async () => {
        delP(proxyId);
    });
}

function selP(id) {
    globalSettings.selectedId = id;
    currentProxyInspectorId = id;
    scheduleSettingsSave();
    renderProxyNodes();
    updateToolbar();
}

function togP(id) {
    const p = (globalSettings.preProxies || []).find(x => x.id === id);
    if (p) p.enable = !p.enable;
    currentProxyInspectorId = id;
    scheduleSettingsSave();
    renderProxyNodes();
    updateToolbar();
}

async function saveProxySettings() {
    const modeEl = document.getElementById('proxyMode');
    const notifyEl = document.getElementById('notifySwitch');
    const notifyEl2 = document.getElementById('notifySwitch2');
    if (modeEl) globalSettings.mode = modeEl.value;
    if (notifyEl2 instanceof HTMLInputElement) globalSettings.notify = notifyEl2.checked;
    else if (notifyEl) globalSettings.notify = notifyEl.checked;
    globalSettings[PROXY_BATCH_TEST_STRATEGY_KEY] = normalizeProxyBatchTestStrategyForUi(
        readProxyBatchStrategyFromInputs(),
        Array.isArray(globalSettings.preProxies) ? globalSettings.preProxies.length : 0
    );
    scheduleSettingsSave(0);
    await flushScheduledSettingsSave();
    closeProxyManager(); updateToolbar();
}

function updateToolbar() {
    const enable = document.getElementById('enablePreProxy').checked;
    globalSettings.enablePreProxy = enable;
    window.electronAPI.saveSettings(globalSettings);
    const d = document.getElementById('currentProxyDisplay');
    if (!enable) {
        d.innerText = t('proxyChainOff') || 'Off';
        d.classList.add('is-off');
        return;
    }
    d.classList.remove('is-off');
    let count = 0;
    if (globalSettings.mode === 'single') count = globalSettings.selectedId ? 1 : 0;
    else count = (globalSettings.preProxies || []).filter(p => p.enable !== false).length;
    let modeText = "";
    if (globalSettings.mode === 'single') modeText = t('modeSingle');
    else if (globalSettings.mode === 'balance') modeText = t('modeBalance');
    else modeText = t('modeFailover');
    d.innerText = `${modeText} [${count}]`;
}

// Export Logic (重构版)
let exportType = '';
let selectedProfileIds = [];
let passwordCallback = null;
let isImportMode = false;

function openExportModal() { document.getElementById('exportModal').style.display = 'flex'; }
function closeExportModal() { document.getElementById('exportModal').style.display = 'none'; }

async function openExportSelectModal(type) {
    exportType = type;
    closeExportModal();

    // 如果是仅导出代理，不需要选择环境
    if (type === 'proxies') {
        try {
            const result = await window.electronAPI.invoke('export-selected-data', { type: 'proxies', profileIds: [] });
            if (result.success) showAlert(t('msgExportSuccess'));
            else if (!result.cancelled) showAlert(result.error || t('msgNoData'));
        } catch (e) {
            const err = formatIpcError(e);
            showAlert((t('msgExportFailed') || 'Export Failed') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
        }
        return;
    }

    // 获取环境列表
    const profiles = await window.electronAPI.invoke('get-export-profiles');

    if (profiles.length === 0) {
        showAlert(t('expNoProfiles'));
        return;
    }

    // 渲染选择器
    renderExportProfileList(profiles);

    // 默认全选
    selectedProfileIds = profiles.map(p => p.id);
    document.getElementById('exportSelectAll').checked = true;
    updateExportSelectedCount(profiles.length);

    // 更新标题（使用 i18n）
    const titleSpan = document.querySelector('#exportSelectTitle span[data-i18n]');
    const iconSpan = document.querySelector('#exportSelectTitle span:first-child');
    if (type === 'full-backup') {
        if (titleSpan) titleSpan.innerText = t('expSelectTitleFull');
        if (iconSpan) iconSpan.innerText = '🔐';
    } else {
        if (titleSpan) titleSpan.innerText = t('expSelectTitle');
        if (iconSpan) iconSpan.innerText = '📦';
    }

    document.getElementById('exportSelectModal').style.display = 'flex';
}

function closeExportSelectModal() {
    document.getElementById('exportSelectModal').style.display = 'none';
    selectedProfileIds = [];
}

function renderExportProfileList(profiles) {
    const container = document.getElementById('exportProfileList');
    if (!container) return;
    container.textContent = '';
    if (!profiles || profiles.length === 0) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'padding: 30px; text-align: center; color: var(--text-secondary);';

        const icon = document.createElement('div');
        icon.style.cssText = 'font-size: 24px; margin-bottom: 8px;';
        icon.textContent = '📭';

        const text = document.createElement('div');
        text.textContent = t('expNoProfiles');

        wrap.append(icon, text);
        container.append(wrap);
        return;
    }

    const frag = document.createDocumentFragment();
    for (const p of profiles) {
        const id = p && p.id ? String(p.id) : '';
        const name = p && p.name ? String(p.name) : '';
        const tags = Array.isArray(p && p.tags) ? p.tags : [];

        const label = document.createElement('label');
        label.style.cssText = "display: flex; align-items: center; padding: 10px 12px; margin: 4px 0; background: rgba(255,255,255,0.03); border: 1px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;";
        label.addEventListener('mouseenter', () => {
            label.style.background = 'rgba(0,255,255,0.05)';
            label.style.borderColor = 'var(--accent)';
        });
        label.addEventListener('mouseleave', () => {
            label.style.background = 'rgba(255,255,255,0.03)';
            label.style.borderColor = 'transparent';
        });

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `export-${id}`;
        input.checked = true;
        input.style.cssText = 'width: 18px; height: 18px; margin-right: 12px; cursor: pointer; accent-color: var(--accent); flex-shrink: 0;';
        input.addEventListener('change', () => {
            handleExportCheckboxChange(id, input.checked);
        });

        const nameWrap = document.createElement('div');
        nameWrap.style.cssText = 'flex: 1; min-width: 0;';

        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        nameEl.textContent = name || t('expNoProfiles');
        nameWrap.append(nameEl);

        const tagsWrap = document.createElement('div');
        tagsWrap.style.cssText = 'display: flex; align-items: center; flex-shrink: 0;';
        for (const tagRaw of tags) {
            const tag = String(tagRaw);
            const c = stringToColor(tag);
            const span = document.createElement('span');
            span.style.cssText = `font-size: 9px; padding: 2px 6px; background: ${c}22; color: ${c}; border-radius: 4px; margin-left: 6px; font-weight: 500;`;
            span.textContent = tag;
            tagsWrap.append(span);
        }

        label.append(input, nameWrap, tagsWrap);
        frag.append(label);
    }
    container.append(frag);
}

// 处理单个 checkbox 变化
function handleExportCheckboxChange(id, checked) {
    if (checked) {
        if (!selectedProfileIds.includes(id)) selectedProfileIds.push(id);
    } else {
        selectedProfileIds = selectedProfileIds.filter(pid => pid !== id);
    }

    // 更新全选状态
    const allCheckboxes = document.querySelectorAll('#exportProfileList input[type="checkbox"]');
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    document.getElementById('exportSelectAll').checked = allChecked;

    updateExportSelectedCount(allCheckboxes.length);
}

function toggleExportProfile(id) {
    const checkbox = document.getElementById(`export-${id}`);
    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
        if (!selectedProfileIds.includes(id)) selectedProfileIds.push(id);
    } else {
        selectedProfileIds = selectedProfileIds.filter(pid => pid !== id);
    }

    // 更新全选状态
    const allCheckboxes = document.querySelectorAll('#exportProfileList input[type="checkbox"]');
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    document.getElementById('exportSelectAll').checked = allChecked;

    updateExportSelectedCount(allCheckboxes.length);
}

function toggleExportSelectAll() {
    const selectAll = document.getElementById('exportSelectAll').checked;
    const checkboxes = document.querySelectorAll('#exportProfileList input[type="checkbox"]');

    checkboxes.forEach(cb => {
        cb.checked = selectAll;
        const id = cb.id.replace('export-', '');
        if (selectAll) {
            if (!selectedProfileIds.includes(id)) selectedProfileIds.push(id);
        }
    });

    if (!selectAll) selectedProfileIds = [];

    updateExportSelectedCount(checkboxes.length);
}

function updateExportSelectedCount(total) {
    document.getElementById('exportSelectedCount').innerText = `${selectedProfileIds.length}/${total}`;
}

async function confirmExport() {
    if (selectedProfileIds.length === 0) {
        showAlert('请至少选择一个环境');
        return;
    }

    // 保存选中的 ID（因为 closeExportSelectModal 会清空）
    const idsToExport = [...selectedProfileIds];
    const typeToExport = exportType;

    closeExportSelectModal();

    if (typeToExport === 'full-backup') {
        // 保存到全局变量供密码提交后使用
        selectedProfileIds = idsToExport;
        isImportMode = false;
        openPasswordModal('设置备份密码', true);
    } else {
        // 直接导出
        try {
            const result = await window.electronAPI.invoke('export-selected-data', {
                type: typeToExport,
                profileIds: idsToExport
            });
            if (result.success) {
                showAlert(`导出成功！共 ${result.count} 个环境`);
            } else if (!result.cancelled) {
                showAlert(result.error || t('msgNoData'));
            }
        } catch (e) {
            showAlert("Export Failed: " + e.message);
        }
    }
}

// 密码模态框
function openPasswordModal(title, showConfirm) {
    document.getElementById('passwordModalTitle').innerText = title;
    document.getElementById('backupPassword').value = '';
    document.getElementById('backupPasswordConfirm').value = '';

    // 导入时不需要确认密码
    const confirmLabel = document.getElementById('confirmPasswordLabel');
    const confirmInput = document.getElementById('backupPasswordConfirm');
    if (showConfirm) {
        confirmLabel.style.display = 'block';
        confirmInput.style.display = 'block';
    } else {
        confirmLabel.style.display = 'none';
        confirmInput.style.display = 'none';
    }

    document.getElementById('passwordModal').style.display = 'flex';
    document.getElementById('backupPassword').focus();
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    passwordCallback = null;
}

async function submitPassword() {
    const password = document.getElementById('backupPassword').value;
    const confirmPassword = document.getElementById('backupPasswordConfirm').value;

    if (!password) {
        showAlert('请输入密码');
        return;
    }

    if (!isImportMode && password !== confirmPassword) {
        showAlert('两次输入的密码不一致');
        return;
    }

    if (password.length < 4) {
        showAlert('密码长度至少 4 位');
        return;
    }

    closePasswordModal();

    if (isImportMode) {
        // 导入完整备份
        try {
            const result = await window.electronAPI.invoke('import-full-backup', { password });
            if (result.success) {
                showAlert(`导入成功！共 ${result.count} 个环境`);
                loadProfiles();
                globalSettings = await window.electronAPI.getSettings();
                renderGroupTabs();
                updateToolbar();
            } else if (!result.cancelled) {
                showAlert(result.error || '导入失败');
            }
        } catch (e) {
            showAlert("Import Failed: " + e.message);
        }
    } else {
        // 导出完整备份
        try {
            const result = await window.electronAPI.invoke('export-full-backup', {
                profileIds: selectedProfileIds,
                password
            });
            if (result.success) {
                showAlert(`完整备份成功！共 ${result.count} 个环境`);
            } else if (!result.cancelled) {
                showAlert(result.error || '备份失败');
            }
        } catch (e) {
            showAlert("Backup Failed: " + e.message);
        }
    }
}

// Import Logic
async function importData() {
    try {
        const result = await window.electronAPI.invoke('import-data');
        if (result) {
            globalSettings = await window.electronAPI.getSettings();
            if (!globalSettings.preProxies) globalSettings.preProxies = [];
            if (!globalSettings.subscriptions) globalSettings.subscriptions = [];
            loadProfiles(); renderGroupTabs(); updateToolbar();
            showAlert(t('msgImportSuccess'));
        }
    } catch (e) { showAlert("Import Failed: " + e.message); }
}

// 导入完整备份（.geekez 文件）
async function importFullBackup() {
    isImportMode = true;
    openPasswordModal('输入备份密码', false);
}

// Import Menu Toggle
function toggleImportMenu() {
    const menu = document.getElementById('importMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeImportMenu() {
    document.getElementById('importMenu').style.display = 'none';
}

// 点击其他地方关闭菜单
document.addEventListener('click', (e) => {
    const menu = document.getElementById('importMenu');
    const btn = document.getElementById('importBtn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function openImportSub() { showInput(t('importSubTitle'), importSubscription); }
async function importSubscription(url) {
    if (!url) return;
    try {
        const content = await window.electronAPI.invoke('fetch-url', url);
        if (!content) return showAlert(t('subErr'));

        // Use unified subscription parser (supports raw/base64/v2rayN + clash YAML + sing-box JSON)
        const result = await window.electronAPI.invoke('parse-subscription', { content });
        if (!result || (result.errors && result.errors.length > 0 && (!result.nodes || result.nodes.length === 0))) {
            const e = formatResultError(result, t('subErr') || '订阅解析失败');
            return showAlert((t('subErr') || '订阅解析失败') + (e.code ? ` [${e.code}]` : '') + ': ' + e.message);
        }

        let count = 0;
        if (!globalSettings.preProxies) globalSettings.preProxies = [];
        const groupId = `group-${Date.now()}`;
        const groupName = tFormat('proxySubDefaultName', 'Sub {time}', { time: new Date().toLocaleTimeString() });
        (result.nodes || []).forEach((node, idx) => {
            const link = node.raw || node.url || '';
            if (!link || !link.includes('://')) return;
            const remark = node.name || getProxyRemark(link) || tFormat('proxyNodeDefaultName', 'Node {index}', { index: idx + 1 });
            function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
            globalSettings.preProxies.push({
                id: uuidv4(), remark, url: link, enable: true, groupId, groupName
            });
            count++;
        });
        renderProxyNodes(); await window.electronAPI.saveSettings(globalSettings);
        showAlert(`${t('msgImported')} ${count} ${t('msgNodes')}`);
    } catch (e) {
        const err = formatIpcError(e);
        showAlert((t('subErr') || '订阅解析失败') + (err.code ? ` [${err.code}]` : '') + ': ' + err.message);
    }
}

function switchHelpTab(tabName) {
    document.querySelectorAll('#helpModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    const idx = tabName === 'manual' ? 0 : 1;
    const tabs = document.querySelectorAll('#helpModal .tab-btn');
    if (tabs[idx]) tabs[idx].classList.add('active');
    document.querySelectorAll('.help-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`help-${tabName}`).classList.add('active');
}
// ============================================================================
// Settings Modal Functions
// ============================================================================
function openSettings() {
    if (isClickDebugEnabled()) console.log('[click-debug] openSettings invoked');
    document.getElementById('settingsModal').style.display = 'flex';
    const modal = document.getElementById('settingsModal');
    logModalState('settingsModal.open', modal);
    requestAnimationFrame(() => logModalState('settingsModal.open.raf', modal));
    setTimeout(() => logModalState('settingsModal.open.t20', modal), 20);
    loadUserExtensions();
    loadWatermarkStyle();
    loadSystemProxySetting();
    loadRemoteDebuggingSetting();
    loadCustomArgsSetting();
    loadApiServerSetting();
    loadSubscriptionPrivateAllowlistSetting();
    loadDataPathSetting();
    loadDefaultProxyConsistency();
}
function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

async function loadDefaultProxyConsistency() {
    try {
        const settings = await window.electronAPI.getSettings();
        const mode = settings.defaultProxyConsistency || 'warn';
        const el = document.getElementById('defaultProxyConsistency');
        if (el) el.value = mode;
    } catch (e) {
        console.error('Failed to load default proxy consistency:', e);
    }
}

async function saveDefaultProxyConsistency(mode) {
    try {
        const settings = await window.electronAPI.getSettings();
        settings.defaultProxyConsistency = mode || 'warn';
        await window.electronAPI.saveSettings(settings);
        showToast((t('saved') || 'Saved') + `: ${mode}`, 1400);
    } catch (e) {
        showAlert('Error: ' + e.message);
    }
}

// Watermark Style Functions
function loadWatermarkStyle() {
    const style = localStorage.getItem('geekez_watermark_style') || 'enhanced';
    const radios = document.getElementsByName('watermarkStyle');
    radios.forEach(radio => {
        if (radio.value === style) {
            radio.checked = true;
            radio.parentElement.style.borderColor = 'var(--accent)';
        } else {
            radio.parentElement.style.borderColor = 'var(--border)';
        }
    });
}

function saveWatermarkStyle(style) {
    localStorage.setItem('geekez_watermark_style', style);
    const radios = document.getElementsByName('watermarkStyle');
    radios.forEach(radio => {
        if (radio.checked) {
            radio.parentElement.style.borderColor = 'var(--accent)';
        } else {
            radio.parentElement.style.borderColor = 'var(--border)';
        }
    });
    showAlert('水印样式已保存，重启环境后生效');
}

// --- 自定义数据目录 ---
async function loadDataPathSetting() {
    try {
        const info = await window.electronAPI.invoke('get-data-path-info');
        document.getElementById('currentDataPath').textContent = info.currentPath;
        document.getElementById('resetDataPathBtn').style.display = info.isCustom ? 'inline-block' : 'none';
    } catch (e) {
        console.error('Failed to load data path:', e);
    }
}

async function selectDataDirectory() {
    const newPath = await window.electronAPI.invoke('select-data-directory');
    if (!newPath) return;

    // 确认迁移
    const migrate = confirm(t('dataPathConfirmMigrate') || '是否将现有数据迁移到新目录？\n\n选择"确定"迁移数据\n选择"取消"仅更改路径（不迁移）');

    showAlert(t('dataPathMigrating') || '正在迁移数据，请稍候...');

    const result = await window.electronAPI.invoke('set-data-directory', { newPath, migrate });

    if (result.success) {
        document.getElementById('currentDataPath').textContent = newPath;
        document.getElementById('resetDataPathBtn').style.display = 'inline-block';
        document.getElementById('dataPathWarning').style.display = 'block';
        showAlert(t('dataPathSuccess') || '数据目录已更改，请重启应用');
    } else {
        showAlert((t('dataPathError') || '更改失败: ') + result.error);
    }
}

async function resetDataDirectory() {
    if (!confirm(t('dataPathConfirmReset') || '确定要恢复默认数据目录吗？\n\n注意：这不会迁移数据，您需要手动处理自定义目录中的数据。')) {
        return;
    }

    const result = await window.electronAPI.invoke('reset-data-directory');

    if (result.success) {
        const info = await window.electronAPI.invoke('get-data-path-info');
        document.getElementById('currentDataPath').textContent = info.defaultPath;
        document.getElementById('resetDataPathBtn').style.display = 'none';
        document.getElementById('dataPathWarning').style.display = 'block';
        showAlert(t('dataPathResetSuccess') || '已恢复默认目录，请重启应用');
    } else {
        showAlert((t('dataPathError') || '操作失败: ') + result.error);
    }
}

async function saveRemoteDebuggingSetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableRemoteDebugging = enabled;
    await window.electronAPI.saveSettings(settings);
    showAlert(enabled ? '远程调试已启用，编辑环境时可设置端口' : '远程调试已禁用');
}

// Unified toggle handler for developer features
function handleDevToggle(checkbox) {
    const toggleSwitch = checkbox.closest('.toggle-switch');
    const track = toggleSwitch?.querySelector('.toggle-track');
    const knob = toggleSwitch?.querySelector('.toggle-knob');

    // Animate toggle - update track color and knob position
    if (track) {
        track.style.background = checkbox.checked ? 'var(--accent)' : 'var(--border)';
    }
    if (knob) {
        knob.style.left = checkbox.checked ? '22px' : '2px';
    }

    // Call appropriate save function based on checkbox id
    if (checkbox.id === 'enableSystemProxy') {
        saveSystemProxySetting(checkbox.checked);
    } else if (checkbox.id === 'enableRemoteDebugging') {
        saveRemoteDebuggingSetting(checkbox.checked);
    } else if (checkbox.id === 'enableCustomArgs') {
        saveCustomArgsSetting(checkbox.checked);
    } else if (checkbox.id === 'enableApiServer') {
        saveApiServerSetting(checkbox.checked);
    }
}

// Update toggle visual state (for loading saved state)
function updateToggleVisual(checkbox) {
    const toggleSwitch = checkbox.closest('.toggle-switch');
    const track = toggleSwitch?.querySelector('.toggle-track');
    const knob = toggleSwitch?.querySelector('.toggle-knob');

    if (track) {
        track.style.background = checkbox.checked ? 'var(--accent)' : 'var(--border)';
    }
    if (knob) {
        knob.style.left = checkbox.checked ? '22px' : '2px';
    }
}

async function loadRemoteDebuggingSetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableRemoteDebugging');
    if (checkbox) {
        checkbox.checked = settings.enableRemoteDebugging || false;
        updateToggleVisual(checkbox);
    }
}

// System Proxy (Windows)
async function saveSystemProxySetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableSystemProxy = enabled;
    await window.electronAPI.saveSettings(settings);

    // Apply immediately when possible (needs a running profile with a local proxy port).
    try {
        if (!enabled) {
            const res = await window.electronAPI.setSystemProxyMode(false, null);
            if (res && res.success) showToast(t('systemProxyDisabled') || 'System proxy disabled');
            else showToast((t('systemProxyError') || 'System proxy error: ') + (res?.error || 'unknown'));
            return;
        }

        const profiles = await window.electronAPI.getProfiles();
        const running = await window.electronAPI.getRunningIds();
        const runningId = Array.isArray(running) && running.length > 0 ? running[0] : null;
        const p = runningId ? profiles.find(x => x.id === runningId) : null;
        const port = p && p.localPort ? p.localPort : null;
        if (!runningId || !port) {
            showToast(t('systemProxyNoRunning') || 'No running profile found (will apply on launch)');
            return;
        }

        const endpoint = `127.0.0.1:${port}`;
        const res = await window.electronAPI.setSystemProxyMode(true, endpoint);
        if (res && res.success) showToast(t('systemProxyEnabled') || 'System proxy enabled');
        else showToast((t('systemProxyError') || 'System proxy error: ') + (res?.error || 'unknown'));
    } catch (e) {
        showToast((t('systemProxyError') || 'System proxy error: ') + e.message);
    }
}

async function loadSystemProxySetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableSystemProxy');
    if (!checkbox) return;
    checkbox.checked = settings.enableSystemProxy || false;
    updateToggleVisual(checkbox);
}

// Custom Args Settings
async function saveCustomArgsSetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableCustomArgs = enabled;
    await window.electronAPI.saveSettings(settings);
    showAlert(enabled ? t('customArgsEnabled') || '自定义启动参数已启用' : t('customArgsDisabled') || '自定义启动参数已禁用');
}

async function loadCustomArgsSetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableCustomArgs');
    if (checkbox) {
        checkbox.checked = settings.enableCustomArgs || false;
        updateToggleVisual(checkbox);
    }
}

// API Server Settings
async function saveApiServerSetting(enabled) {
    const settings = await window.electronAPI.getSettings();
    settings.enableApiServer = enabled;
    await window.electronAPI.saveSettings(settings);

    // Show/hide port section
    document.getElementById('apiPortSection').style.display = enabled ? 'block' : 'none';

    if (enabled) {
        // Start API server
        const port = settings.apiPort || 12138;
        const result = await window.electronAPI.invoke('start-api-server', { port });
        if (result.success) {
            document.getElementById('apiStatus').style.display = 'inline-block';
            const tokenEl = document.getElementById('apiTokenInput');
            if (tokenEl) tokenEl.value = result.token || settings.apiToken || '';
            const tokenLine = result.token ? `\nX-GeekEZ-API-Token: ${result.token}` : '';
            showAlert(`${t('apiStarted') || 'API 服务已启动'}: http://localhost:${port}${tokenLine}`);
        } else {
            showAlert((t('apiError') || 'API 启动失败: ') + result.error);
        }
    } else {
        // Stop API server
        await window.electronAPI.invoke('stop-api-server');
        document.getElementById('apiStatus').style.display = 'none';
        const tokenEl = document.getElementById('apiTokenInput');
        if (tokenEl) tokenEl.value = '';
        showAlert(t('apiStopped') || 'API 服务已停止');
    }
}

async function saveApiPort() {
    const port = parseInt(document.getElementById('apiPortInput').value) || 12138;
    if (port < 1024 || port > 65535) {
        showAlert(t('apiPortInvalid') || '端口号必须在 1024-65535 之间');
        return;
    }

    const settings = await window.electronAPI.getSettings();
    settings.apiPort = port;
    await window.electronAPI.saveSettings(settings);
    document.getElementById('apiPortDisplay').textContent = port;

    // Restart API server if enabled
    if (settings.enableApiServer) {
        await window.electronAPI.invoke('stop-api-server');
        const result = await window.electronAPI.invoke('start-api-server', { port });
        if (result.success) {
            const tokenEl = document.getElementById('apiTokenInput');
            if (tokenEl) tokenEl.value = result.token || settings.apiToken || '';
            const tokenLine = result.token ? `\nX-GeekEZ-API-Token: ${result.token}` : '';
            showAlert(`${t('apiRestarted') || 'API 服务已重启'}: http://localhost:${port}${tokenLine}`);
        }
    } else {
        showAlert(t('apiPortSaved') || 'API 端口已保存');
    }
}

async function loadApiServerSetting() {
    const settings = await window.electronAPI.getSettings();
    const checkbox = document.getElementById('enableApiServer');
    const portInput = document.getElementById('apiPortInput');
    const portDisplay = document.getElementById('apiPortDisplay');
    const portSection = document.getElementById('apiPortSection');
    const apiStatus = document.getElementById('apiStatus');

    if (checkbox) {
        checkbox.checked = settings.enableApiServer || false;
        updateToggleVisual(checkbox);
    }
    if (portInput) {
        portInput.value = settings.apiPort || 12138;
    }
    if (portDisplay) {
        portDisplay.textContent = settings.apiPort || 12138;
    }
    if (portSection) {
        portSection.style.display = settings.enableApiServer ? 'block' : 'none';
    }
    const tokenEl = document.getElementById('apiTokenInput');
    if (tokenEl) tokenEl.value = settings.apiToken || '';

    // Check if API is running
    try {
        const status = await window.electronAPI.invoke('get-api-status');
        if (apiStatus) {
            apiStatus.style.display = status.running ? 'inline-block' : 'none';
        }
    } catch (e) { }
}

async function loadSubscriptionPrivateAllowlistSetting() {
    try {
        const settings = await window.electronAPI.getSettings();
        const input = document.getElementById('subscriptionPrivateAllowlist');
        if (!input) return;
        const list = Array.isArray(settings[SUBSCRIPTION_PRIVATE_ALLOWLIST_KEY])
            ? settings[SUBSCRIPTION_PRIVATE_ALLOWLIST_KEY]
            : [];
        input.value = list.join('\n');
    } catch (e) {
        console.error('Failed to load subscription private allowlist:', e);
    }
}

async function saveSubscriptionPrivateAllowlist() {
    const input = document.getElementById('subscriptionPrivateAllowlist');
    if (!input) return;

    const parsed = parseSubscriptionPrivateAllowlistText(input.value);
    if (parsed.invalid.length > 0) {
        const invalidPreview = parsed.invalid.slice(0, 5).join('\n');
        showAlert(`${t('subFetchAllowlistInvalid') || 'Invalid allowlist entries'}:\n${invalidPreview}`);
        return;
    }

    const settings = await window.electronAPI.getSettings();
    settings[SUBSCRIPTION_PRIVATE_ALLOWLIST_KEY] = parsed.entries;
    await window.electronAPI.saveSettings(settings);
    input.value = parsed.entries.join('\n');
    showToast(t('subFetchAllowlistSaved') || 'Subscription allowlist saved', 1400);
}

function openApiDocs() {
    window.electronAPI.invoke('open-url', 'https://browser.geekez.net/docs.html#doc-api');
}

async function copyApiToken() {
    const el = document.getElementById('apiTokenInput');
    const token = el ? String(el.value || '') : '';
    if (!token) return;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(token);
        } else {
            const ta = document.createElement('textarea');
            ta.value = token;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        showToast(t('apiTokenCopied') || 'Copied', 1400);
    } catch (e) {
        showAlert((e && e.message) ? e.message : String(e));
    }
}

function switchSettingsTab(tabName, clickedEl) {
    // Update tab buttons
    document.querySelectorAll('#settingsModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const target = clickedEl || (typeof event !== 'undefined' ? event.target : null);
    if (target && target.classList) target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.settings-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('settings-' + tabName).style.display = 'block';
}
// ============================================================================
// Extension Management Functions
// ============================================================================
async function selectExtensionFolder() {
    const path = await window.electronAPI.invoke('select-extension-folder');
    if (path) {
        await window.electronAPI.invoke('add-user-extension', path);
        await loadUserExtensions();
        showAlert(t('settingsExtAdded'));
    }
}
async function loadUserExtensions() {
    const exts = await window.electronAPI.invoke('get-user-extensions');
    const list = document.getElementById('userExtensionList');
    if (!list) return;

    if (exts.length === 0) {
        list.textContent = '';
        const empty = document.createElement('div');
        empty.style.cssText = 'opacity:0.5; text-align:center; padding:20px;';
        empty.textContent = t('settingsExtNoExt') || '';
        list.appendChild(empty);
        return;
    }

    list.textContent = '';
    exts.forEach((ext) => {
        const extPath = String(ext ?? '');
        const name = extPath.split(/[\\/]/).pop() || extPath;

        const item = document.createElement('div');
        item.className = 'ext-item';

        const left = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = 'bold';
        nameEl.textContent = name;
        const pathEl = document.createElement('div');
        pathEl.style.fontSize = '11px';
        pathEl.style.opacity = '0.6';
        pathEl.textContent = extPath;
        left.appendChild(nameEl);
        left.appendChild(pathEl);

        const btn = document.createElement('button');
        btn.className = 'danger outline';
        btn.style.padding = '4px 12px';
        btn.style.fontSize = '11px';
        btn.textContent = t('settingsExtRemove');
        btn.onclick = async () => { await removeUserExtension(extPath); };

        item.appendChild(left);
        item.appendChild(btn);
        list.appendChild(item);
    });
}
async function removeUserExtension(path) {
    await window.electronAPI.invoke('remove-user-extension', path);
    await loadUserExtensions();
    showAlert(t('settingsExtRemoved'));
}
function openHelp() { switchHelpTab('manual'); document.getElementById('helpModal').style.display = 'flex'; } // flex
function closeHelp() { document.getElementById('helpModal').style.display = 'none'; }


// Custom timezone dropdown initialization
function initCustomTimezoneDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown || !window.TIMEZONES) return;

    let selectedIndex = -1;

    // Populate dropdown with all timezones
    function populateDropdown(filter = '') {
        const filtered = window.TIMEZONES.filter(tz =>
            tz.toLowerCase().includes(filter.toLowerCase())
        );

        dropdown.textContent = '';
        filtered.forEach((tz, index) => {
            const el = document.createElement('div');
            el.className = 'timezone-item';
            el.dataset.value = tz;
            el.dataset.index = String(index);
            el.textContent = tz;
            dropdown.appendChild(el);
        });

        selectedIndex = -1;
    }



    // Hide dropdown
    function hideDropdown() {
        dropdown.classList.remove('active');
        selectedIndex = -1;
    }

    // Select item
    function selectItem(value) {
        input.value = value;
        hideDropdown();
    }

    // Input focus - show dropdown (Show ALL options, ignore current value filter)
    input.addEventListener('focus', () => {
        populateDropdown('');
        dropdown.classList.add('active');
    });

    // Input typing - filter
    input.addEventListener('input', () => {
        populateDropdown(input.value);
        if (!dropdown.classList.contains('active')) {
            dropdown.classList.add('active');
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.timezone-item:not(.hidden)');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectItem(items[selectedIndex].dataset.value);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    // Update selection highlight
    function updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
        if (items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Click on item
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.timezone-item');
        if (item) {
            selectItem(item.dataset.value);
        }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}
init();

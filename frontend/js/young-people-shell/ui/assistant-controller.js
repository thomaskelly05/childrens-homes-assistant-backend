import {
  state,
  setAssistantScopeBundle,
  setAssistantScopeBundleLoading,
  setAssistantScopeBundleError,
  setAssistantDerivedState,
  clearAssistantLiveUpdates,
} from "../state.js";

import { fetchAssistantScopeBundle } from "../core/api.js";
import { buildAssistantEvidenceContext } from "../core/assistant-runtime.js";
import { refreshAssistantUi } from "./assistant-ui.js";

import {
  buildMorningBrief,
  buildManagerBrief,
  buildQualityBrief,
} from "../assistant/brain.js";

import {
  ensureAssistantState,
  getAssistantMeta,
  mergeAssistantMeta,
  getCurrentScope,
  getSelectedYoungPerson,
  getHomeName,
  getAllowedHomeIds,
  getAccessLevelForScope,
  getAssistantTypeForScope,
} from "../assistant/helpers.js";

let latestRefreshToken = 0;
let currentRefreshPromise = null;
let currentRefreshKey = "";
let autoRefreshInterval = null;

function toNumericId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normaliseHomeIds(homeIds = []) {
  if (!Array.isArray(homeIds)) return [];
  return [...new Set(homeIds.map((item) => Number(item)).filter((item) => item > 0))];
}

function getResolvedHomeId() {
  return (
    toNumericId(state.readinessSelectedHomeId) ||
    toNumericId(state.homeId) ||
    toNumericId(state.selectedYoungPerson?.home_id) ||
    toNumericId(state.selectedYoungPerson?.homeId) ||
    toNumericId(state.currentUser?.home_id) ||
    toNumericId(state.currentUser?.homeId) ||
    toNumericId(state.allowedHomeIds?.[0]) ||
    null
  );
}

function getResolvedProviderId() {
  return (
    toNumericId(state.providerId) ||
    toNumericId(state.currentUser?.provider_id) ||
    toNumericId(state.currentUser?.providerId) ||
    null
  );
}

function getScopeContext() {
  const scope = getCurrentScope();
  const accessLevel = getAccessLevelForScope(scope);
  const youngPerson = getSelectedYoungPerson();

  const homeId = getResolvedHomeId();
  const providerId = getResolvedProviderId();

  const allowedHomeIds =
    (scope === "quality" || scope === "ofsted") && accessLevel === "provider"
      ? normaliseHomeIds(getAllowedHomeIds())
      : [homeId].filter(Boolean);

  return {
    scope,
    current_scope: scope,
    access_level: accessLevel,

    home_id: homeId,
    provider_id: providerId,
    allowed_home_ids: allowedHomeIds,

    young_person_id:
      toNumericId(state.youngPersonId) ||
      toNumericId(youngPerson?.id) ||
      null,

    home_name: getHomeName(),

    young_person_name:
      youngPerson?.preferred_name ||
      youngPerson?.full_name ||
      youngPerson?.name ||
      "Young person",

    assistant_type: getAssistantTypeForScope(scope),
  };
}

function getBundleFreshness(bundle = {}) {
  const records = Array.isArray(bundle.records)
    ? bundle.records
    : Array.isArray(bundle.items)
      ? bundle.items
      : Array.isArray(bundle.evidence)
        ? bundle.evidence
        : [];

  const dates = records
    .map((item) => Date.parse(item?.date || item?.created_at || item?.updated_at || ""))
    .filter((time) => Number.isFinite(time));

  if (!dates.length) {
    return {
      latest_record_at: null,
      oldest_record_at: null,
      record_count_with_dates: 0,
    };
  }

  return {
    latest_record_at: new Date(Math.max(...dates)).toISOString(),
    oldest_record_at: new Date(Math.min(...dates)).toISOString(),
    record_count_with_dates: dates.length,
  };
}

function buildBriefs(bundle, context) {
  try {
    const scope = context.scope;
    let brief;

    if (scope === "child") {
      brief = buildMorningBrief("morning brief", bundle, { context });
    } else if (scope === "home") {
      brief = buildManagerBrief("manager oversight brief", bundle, { context });
    } else {
      brief = buildQualityBrief("quality and inspection brief", bundle, {
        context,
      });
    }

    const existingMeta = getAssistantMeta();
    const freshness = getBundleFreshness(bundle);

    mergeAssistantMeta({
      ...existingMeta,
      latest_brief: brief,
      brain_summary: brief?.summary || null,
      brain_insights: brief?.insights || [],
      suggested_actions: brief?.suggested_actions || [],
      top_sources: brief?.top_sources || [],
      evidence_count: brief?.evidence_count || 0,
      analysis_lens: brief?.analysis_lens || null,
      confidence: brief?.confidence || null,
      confidence_reason: brief?.confidence_reason || null,
      recommended_next_records: brief?.recommended_next_records || [],
      bundle_freshness: freshness,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("[assistant-controller] brief generation failed", error);
  }
}

export async function loadAssistantBundle({ force = false } = {}) {
  ensureAssistantState();

  const context = getScopeContext();
  const refreshKey = JSON.stringify(context);

  if (!force && currentRefreshKey === refreshKey && currentRefreshPromise) {
    return currentRefreshPromise;
  }

  const token = ++latestRefreshToken;

  setAssistantScopeBundleLoading(true);
  setAssistantScopeBundleError(null);

  const promise = (async () => {
    try {
      const bundle = await fetchAssistantScopeBundle(context);

      if (token !== latestRefreshToken) return null;

      setAssistantScopeBundle(bundle);

      const evidence = buildAssistantEvidenceContext(bundle);

      setAssistantDerivedState({
        evidence,
        latest_bundle_context: context,
        latest_bundle_loaded_at: new Date().toISOString(),
      });

      buildBriefs(bundle, context);
      refreshAssistantUi();

      return bundle;
    } catch (error) {
      console.error("[assistant-controller] load failed", error);

      if (token !== latestRefreshToken) return null;

      setAssistantScopeBundleError(
        error?.message || "Failed to load assistant evidence."
      );

      mergeAssistantMeta({
        last_error: error?.message || "Failed to load assistant evidence.",
        last_error_at: new Date().toISOString(),
      });

      refreshAssistantUi();
      return null;
    } finally {
      if (token === latestRefreshToken) {
        setAssistantScopeBundleLoading(false);
      }
    }
  })();

  currentRefreshPromise = promise;
  currentRefreshKey = refreshKey;

  return promise;
}

export async function onAssistantScopeChanged() {
  ensureAssistantState();
  clearAssistantLiveUpdates();
  currentRefreshPromise = null;
  currentRefreshKey = "";
  return loadAssistantBundle({ force: true });
}

export function renderAssistantControllerPanels() {
  refreshAssistantUi();
}

export function startAssistantAutoRefresh(intervalMs = 60000) {
  stopAssistantAutoRefresh();

  autoRefreshInterval = window.setInterval(() => {
    loadAssistantBundle().catch((error) => {
      console.warn("[assistant-controller] auto refresh failed", error);
    });
  }, intervalMs);
}

export function stopAssistantAutoRefresh() {
  if (autoRefreshInterval) {
    window.clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

export function getLatestAssistantScopeContext() {
  return getScopeContext();
}

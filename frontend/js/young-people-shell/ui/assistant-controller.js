```javascript
import {
  state,
  setAssistantScopeBundle,
  setAssistantScopeBundleLoading,
  setAssistantScopeBundleError,
  setAssistantDerivedState,
  clearAssistantLiveUpdates,
} from "../state.js";

import { els } from "../dom.js";
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

/* -------------------------------- state -------------------------------- */

let latestRefreshToken = 0;
let currentRefreshPromise = null;
let currentRefreshKey = "";

/* -------------------------------- helpers -------------------------------- */

function toNumericId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normaliseHomeIds(homeIds = []) {
  if (!Array.isArray(homeIds)) return [];
  return [...new Set(homeIds.map((i) => Number(i)).filter((i) => i > 0))];
}

/* -------------------------------- FIXED CONTEXT -------------------------------- */

function getResolvedHomeId() {
  return (
    toNumericId(state.readinessSelectedHomeId) ||
    toNumericId(state.homeId) ||
    toNumericId(state.selectedYoungPerson?.home_id) ||
    toNumericId(state.currentUser?.home_id) ||
    toNumericId(state.allowedHomeIds?.[0]) ||
    null
  );
}

function getResolvedProviderId() {
  return (
    toNumericId(state.providerId) ||
    toNumericId(state.currentUser?.provider_id) ||
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
    scope === "quality" && accessLevel === "provider"
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
      "Young person",

    assistant_type: getAssistantTypeForScope(scope),
  };
}

/* -------------------------------- core loader -------------------------------- */

async function loadAssistantBundle() {
  const context = getScopeContext();

  const refreshKey = JSON.stringify(context);

  if (currentRefreshKey === refreshKey && currentRefreshPromise) {
    return currentRefreshPromise;
  }

  const token = ++latestRefreshToken;

  setAssistantScopeBundleLoading(true);
  setAssistantScopeBundleError(null);

  const promise = (async () => {
    try {
      const bundle = await fetchAssistantScopeBundle(context);

      if (token !== latestRefreshToken) return;

      setAssistantScopeBundle(bundle);

      const evidence = buildAssistantEvidenceContext(bundle);

      setAssistantDerivedState({
        evidence,
      });

      buildBriefs(bundle, context);

      refreshAssistantUi();

      return bundle;
    } catch (error) {
      console.error("[assistant] load failed", error);

      if (token !== latestRefreshToken) return;

      setAssistantScopeBundleError(error.message || "Failed to load assistant");

      refreshAssistantUi();
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

/* -------------------------------- briefs -------------------------------- */

function buildBriefs(bundle, context) {
  try {
    const scope = context.scope;

    let brief;

    if (scope === "child") {
      brief = buildMorningBrief(bundle);
    } else if (scope === "home") {
      brief = buildManagerBrief(bundle);
    } else {
      brief = buildQualityBrief(bundle);
    }

    const meta = getAssistantMeta();

    mergeAssistantMeta({
      ...meta,
      latest_brief: brief,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[assistant] brief generation failed", err);
  }
}

/* -------------------------------- public API -------------------------------- */

export async function onAssistantScopeChanged() {
  ensureAssistantState();
  clearAssistantLiveUpdates();
  return loadAssistantBundle();
}

export function renderAssistantControllerPanels() {
  // UI handled in assistant-ui.js
  // This remains for compatibility with existing shell
}

/* -------------------------------- auto refresh (optional) -------------------------------- */

let autoRefreshInterval = null;

export function startAssistantAutoRefresh(intervalMs = 60000) {
  stopAssistantAutoRefresh();

  autoRefreshInterval = setInterval(() => {
    loadAssistantBundle();
  }, intervalMs);
}

export function stopAssistantAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}
```

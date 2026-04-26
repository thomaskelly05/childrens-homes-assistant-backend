import {
  state,
  setAssistantScopeBundle,
  setAssistantScopeBundleLoading,
  setAssistantScopeBundleError,
  setAssistantDerivedState,
  pushAssistantLiveUpdate,
  clearAssistantLiveUpdates,
} from "../state.js";
import { els } from "../dom.js";
import { fetchAssistantScopeBundle } from "../core/api.js";
import * as aiScrubber from "../core/ai-scrubber.js";
import { buildAssistantEvidenceContext } from "../core/assistant-runtime.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import { escapeHtml, formatDate } from "../core/utils.js";
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
  getCurrentSection,
  getSelectedYoungPerson,
  getHomeName,
  getAllowedHomeIds,
  getAccessLevelForScope,
  getAssistantTypeForScope,
  detectAssistantIntents,
  assistantPromptsForView,
} from "../assistant/helpers.js";
import { inferAssistantAnalysisLens } from "../core/assistant-context.js";

let assistantControllerBound = false;
let refreshButtonsBound = false;
let latestRefreshToken = 0;
let currentRefreshPromise = null;
let currentRefreshKey = "";

const MAX_BRIEF_EVIDENCE = 10;
const MAX_BRIEF_CHRONOLOGY = 5;
const QUALITY_LEVEL_SCOPES = new Set(["quality", "ofsted", "reports"]);

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumericId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normaliseHomeIds(homeIds = []) {
  if (!Array.isArray(homeIds)) return [];
  return [...new Set(
    homeIds
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  )];
}

function hasChildContext() {
  return Boolean(
    toNumericId(state.youngPersonId) ||
      toNumericId(state.selectedYoungPerson?.id) ||
      toNumericId(state.selectedYoungPerson?.young_person_id)
  );
}

/* 🔧 FIX APPLIED HERE */
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
  const resolvedHomeId = getResolvedHomeId();
  const resolvedProviderId = getResolvedProviderId();

  const providerAllowedHomeIds =
    QUALITY_LEVEL_SCOPES.has(scope) && accessLevel === "provider"
      ? normaliseHomeIds(getAllowedHomeIds())
      : [];

  const allowedHomeIds =
    providerAllowedHomeIds.length > 0
      ? providerAllowedHomeIds
      : [resolvedHomeId].filter(Boolean);

  return {
    scope,
    current_scope: scope,
    access_level: accessLevel,
    provider_id: resolvedProviderId,
    allowed_home_ids: allowedHomeIds,
    young_person_id:
      toNumericId(state.youngPersonId) ||
      toNumericId(youngPerson?.id) ||
      toNumericId(youngPerson?.young_person_id) ||
      null,
    home_id: resolvedHomeId,
    home_name: getHomeName(),
    young_person_name:
      youngPerson?.preferred_name ||
      youngPerson?.full_name ||
      youngPerson?.name ||
      "Young person",
    assistant_type: getAssistantTypeForScope(scope),
  };
}

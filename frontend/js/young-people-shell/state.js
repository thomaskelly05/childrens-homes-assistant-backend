export const DEFAULT_SECTION = "workspace";
export const DEFAULT_SCOPE = "child";
export const DEFAULT_ROLE = "staff";

export function createAssistantMeta() {
  return {
    // UI / evidence
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: {},
    assistant_context: {},
    suggested_actions: [],

    // Intelligence / derived assistant state
    intent: null,
    retrieval_mode: "whole_scope",
    output_mode: "answer",
    chronology: [],
    facts: {},
    care_domains: {},
    evidence_summary: {},
    evidence_sufficiency: {},
    live_summary: null,

    // Scrubber / privacy metadata
    scrubber_enabled: false,
    scrubber_meta: {},
    scrubber_reverse_map: {},

    // Timing
    last_bundle_refresh_at: null,
    last_analysis_at: null,
  };
}

export function createComposerState() {
  return {
    composerOpen: false,
    composerMode: "create", // "create" | "edit"
    composerRecordType: null,
    composerRecordId: null,
    composerEditItem: null,
    composerMeta: {},
    autosaveTimer: null,
  };
}

export function createSuggestionState() {
  return {
    currentSuggestions: [],
    currentSuggestionSource: null,
    lastSavedRecord: null,
    suggestions: [],
  };
}

export function createAssistantBundleState() {
  return {
    scopeBundle: null,
    scopeBundleLoadedAt: null,
    scopeBundleLoading: false,
    scopeBundleError: null,

    // Derived assistant caches
    latestChronology: [],
    latestFacts: {},
    latestCareDomains: {},
    latestMorningBrief: null,
    latestManagerBrief: null,
    latestQualityBrief: null,
    liveUpdates: [],
  };
}

export const state = {
  // Selected young person / workspace
  youngPersonId: null,
  selectedYoungPerson: null,
  youngPeople: [],
  youngPeopleFilter: "",

  // Current shell section / view
  currentSection: DEFAULT_SECTION,
  activeSection: DEFAULT_SECTION,
  currentView: DEFAULT_SECTION,

  // Role / scope layer
  userRole: DEFAULT_ROLE, // "staff" | "manager" | "ri" | "admin"
  currentScope: DEFAULT_SCOPE, // "child" | "home" | "quality"

  // General UI state
  loading: false,
  error: null,
  mobileNavOpen: false,
  assistantOpen: false,
  fullscreenPanelOpen: false,
  recordDrawerOpen: false,

  // Suggestions / linked follow-up state
  ...createSuggestionState(),

  // Composer state
  ...createComposerState(),

  // Active record / drawer context
  activeRecordType: null,
  activeRecordItem: null,

  // Runtime / context state
  homeId: null,
  currentUser: null,
  userId: null,
  staffId: null,

  // Assistant chat state
  assistantMessages: [],
  assistantModalMessages: [],
  assistantSending: false,
  assistantMeta: createAssistantMeta(),

  // Legacy compatibility fields
  assistantContext: null,
  assistantSources: [],
  assistantRuntime: null,
  assistantExplainability: null,

  // Whole-scope assistant bundle / live intelligence state
  ...createAssistantBundleState(),

  // Request optimisation state
  resourceCache: Object.create(null),
  requestCooldowns: Object.create(null),
};

export function normaliseUserRole(role) {
  const raw = String(role || DEFAULT_ROLE).trim().toLowerCase();

  if (raw === "administrator") return "admin";
  if (raw === "super_admin") return "admin";
  if (raw === "superadmin") return "admin";

  return raw || DEFAULT_ROLE;
}

export function getDefaultScopeForRole(role = state.userRole) {
  const safeRole = normaliseUserRole(role);

  if (safeRole === "ri") return "quality";
  if (safeRole === "manager") return "home";
  if (safeRole === "admin") return "home";

  return DEFAULT_SCOPE;
}

export function getDefaultSectionForScope(scope = state.currentScope) {
  if (scope === "home") return "home-dashboard";
  if (scope === "quality") return "quality";
  return DEFAULT_SECTION;
}

export function resetAssistantState() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  state.assistantSending = false;
  state.assistantMeta = createAssistantMeta();

  // Legacy compatibility fields
  state.assistantContext = null;
  state.assistantSources = [];
  state.assistantRuntime = null;
  state.assistantExplainability = null;

  state.scopeBundle = null;
  state.scopeBundleLoadedAt = null;
  state.scopeBundleLoading = false;
  state.scopeBundleError = null;

  state.latestChronology = [];
  state.latestFacts = {};
  state.latestCareDomains = {};
  state.latestMorningBrief = null;
  state.latestManagerBrief = null;
  state.latestQualityBrief = null;
  state.liveUpdates = [];
}

export function resetComposerState() {
  if (state.autosaveTimer) {
    clearTimeout(state.autosaveTimer);
  }

  const next = createComposerState();
  state.composerOpen = next.composerOpen;
  state.composerMode = next.composerMode;
  state.composerRecordType = next.composerRecordType;
  state.composerRecordId = next.composerRecordId;
  state.composerEditItem = next.composerEditItem;
  state.composerMeta = next.composerMeta;
  state.autosaveTimer = next.autosaveTimer;
}

export function resetSuggestionState() {
  const next = createSuggestionState();
  state.currentSuggestions = next.currentSuggestions;
  state.currentSuggestionSource = next.currentSuggestionSource;
  state.lastSavedRecord = next.lastSavedRecord;
  state.suggestions = next.suggestions;
}

export function resetActiveRecordState() {
  state.activeRecordType = null;
  state.activeRecordItem = null;
  state.recordDrawerOpen = false;
}

export function resetWorkspaceState() {
  state.youngPersonId = null;
  state.selectedYoungPerson = null;
  state.youngPeopleFilter = "";

  state.currentScope = DEFAULT_SCOPE;
  state.currentSection = DEFAULT_SECTION;
  state.activeSection = DEFAULT_SECTION;
  state.currentView = DEFAULT_SECTION;

  state.loading = false;
  state.error = null;
  state.mobileNavOpen = false;
  state.assistantOpen = false;
  state.fullscreenPanelOpen = false;

  resetSuggestionState();
  resetActiveRecordState();
  resetComposerState();
  resetAssistantState();
}

export function clearRequestOptimisationState() {
  state.resourceCache = Object.create(null);
  state.requestCooldowns = Object.create(null);
}

export function setCurrentSection(section) {
  const safeSection = section || getDefaultSectionForScope(state.currentScope);
  state.currentSection = safeSection;
  state.activeSection = safeSection;
  state.currentView = safeSection;
}

export function setCurrentScope(scope, { resetSection = true } = {}) {
  const safeScope =
    scope === "home" || scope === "quality" || scope === "child"
      ? scope
      : DEFAULT_SCOPE;

  state.currentScope = safeScope;

  if (resetSection) {
    setCurrentSection(getDefaultSectionForScope(safeScope));
  }
}

export function setUserRole(role) {
  state.userRole = normaliseUserRole(role);
}

export function setSelectedYoungPerson(person = null) {
  state.selectedYoungPerson = person || null;
  state.youngPersonId = person?.id || person?.young_person_id || null;
}

export function clearSelectedYoungPerson() {
  state.youngPersonId = null;
  state.selectedYoungPerson = null;
}

export function setHomeContext(homeId = null) {
  state.homeId =
    homeId === null || homeId === undefined || homeId === ""
      ? null
      : homeId;
}

// ========================
// Assistant bundle / live intelligence helpers
// ========================

export function setAssistantScopeBundle(bundle = null) {
  state.scopeBundle = bundle || null;
  state.scopeBundleLoadedAt = bundle ? new Date().toISOString() : null;
  state.scopeBundleError = null;
}

export function setAssistantScopeBundleLoading(isLoading = false) {
  state.scopeBundleLoading = Boolean(isLoading);
}

export function setAssistantScopeBundleError(error = null) {
  state.scopeBundleError = error || null;
}

export function setAssistantDerivedState({
  chronology = null,
  facts = null,
  care_domains = null,
  morning_brief = null,
  manager_brief = null,
  quality_brief = null,
  live_summary = null,
} = {}) {
  if (Array.isArray(chronology)) {
    state.latestChronology = chronology;
    state.assistantMeta.chronology = chronology;
  }

  if (facts && typeof facts === "object") {
    state.latestFacts = facts;
    state.assistantMeta.facts = facts;
  }

  if (care_domains && typeof care_domains === "object") {
    state.latestCareDomains = care_domains;
    state.assistantMeta.care_domains = care_domains;
  }

  if (morning_brief !== null) {
    state.latestMorningBrief = morning_brief;
  }

  if (manager_brief !== null) {
    state.latestManagerBrief = manager_brief;
  }

  if (quality_brief !== null) {
    state.latestQualityBrief = quality_brief;
  }

  if (live_summary !== null) {
    state.assistantMeta.live_summary = live_summary;
  }

  state.assistantMeta.last_analysis_at = new Date().toISOString();
}

export function pushAssistantLiveUpdate(update = null) {
  if (!update || typeof update !== "object") return;
  state.liveUpdates = [update, ...(state.liveUpdates || [])].slice(0, 50);
}

export function clearAssistantLiveUpdates() {
  state.liveUpdates = [];
}

// ========================
// Scope-aware helpers
// ========================

export function getCurrentScopeEntity() {
  if (state.currentScope === "child") {
    return {
      type: "child",
      id: state.youngPersonId || null,
      name:
        state.selectedYoungPerson?.preferred_name ||
        state.selectedYoungPerson?.full_name ||
        state.selectedYoungPerson?.name ||
        null,
    };
  }

  if (state.currentScope === "home") {
    return {
      type: "home",
      id: state.homeId || null,
      name:
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        null,
    };
  }

  if (state.currentScope === "quality") {
    return {
      type: "quality",
      id: state.homeId || null,
      name:
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        null,
    };
  }

  return {
    type: "unknown",
    id: null,
    name: null,
  };
}

export function shouldUseWholeScopeAssistant() {
  return true;
}
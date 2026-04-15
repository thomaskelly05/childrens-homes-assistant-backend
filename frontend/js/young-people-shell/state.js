export const DEFAULT_SECTION = "workspace";
export const DEFAULT_SCOPE = "child";
export const DEFAULT_ROLE = "staff";

export const SCOPE_DEFAULT_SECTION = Object.freeze({
  child: "workspace",
  home: "home-dashboard",
  quality: "quality",
});

export function createAssistantMeta() {
  return {
    // Evidence / UI
    sources: [],
    runtime: {},
    explainability: {},
    suggested_actions: [],

    // Scoped assistant context
    assistant_scope: {},
    assistant_context: {},

    // Derived intelligence
    intent: null,
    retrieval_mode: "whole_scope",
    output_mode: "answer",
    chronology: [],
    facts: {},
    care_domains: {},
    evidence_summary: {},
    evidence_sufficiency: {},
    live_summary: null,

    // Privacy / scrubber
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
    composerMode: "create", // create | edit
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

    latestChronology: [],
    latestFacts: {},
    latestCareDomains: {},
    latestMorningBrief: null,
    latestManagerBrief: null,
    latestQualityBrief: null,
    liveUpdates: [],
  };
}

export function createUiState() {
  return {
    loading: false,
    error: null,
    mobileNavOpen: false,
    assistantOpen: false,
    fullscreenPanelOpen: false,
    recordDrawerOpen: false,
  };
}

export function createContextState() {
  return {
    homeId: null,
    providerId: null,
    allowedHomeIds: [],
    currentUser: null,
    userId: null,
    staffId: null,
  };
}

export function createWorkspaceState() {
  return {
    youngPersonId: null,
    selectedYoungPerson: null,
    youngPeople: [],
    youngPeopleFilter: "",

    currentScope: DEFAULT_SCOPE,
    currentSection: DEFAULT_SECTION,
  };
}

export const state = {
  ...createWorkspaceState(),
  ...createUiState(),
  ...createSuggestionState(),
  ...createComposerState(),
  ...createContextState(),
  ...createAssistantBundleState(),

  userRole: DEFAULT_ROLE,

  // Record drawer / active record
  activeRecordType: null,
  activeRecordItem: null,

  // Assistant chat
  assistantMessages: [],
  assistantSending: false,
  assistantMeta: createAssistantMeta(),

  // Cache / optimisation
  resourceCache: Object.create(null),
  requestCooldowns: Object.create(null),
};

export function normaliseUserRole(role) {
  const raw = String(role || DEFAULT_ROLE).trim().toLowerCase();

  if (
    raw === "administrator" ||
    raw === "super_admin" ||
    raw === "superadmin" ||
    raw === "admin_user" ||
    raw === "system_admin" ||
    raw === "owner"
  ) {
    return "admin";
  }

  if (
    raw === "registered_manager" ||
    raw === "deputy_manager" ||
    raw === "rm"
  ) {
    return "manager";
  }

  if (
    raw === "responsible_individual" ||
    raw === "director" ||
    raw === "ceo"
  ) {
    return "ri";
  }

  if (
    raw === "residential_support_worker" ||
    raw === "rsw"
  ) {
    return "staff";
  }

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
  return SCOPE_DEFAULT_SECTION[scope] || DEFAULT_SECTION;
}

export function setUserRole(role) {
  state.userRole = normaliseUserRole(role);
}

export function setCurrentScope(scope, options = {}) {
  const safeScope =
    scope === "home" || scope === "quality" || scope === "child"
      ? scope
      : DEFAULT_SCOPE;

  const resetSection = options.resetSection !== false;

  state.currentScope = safeScope;

  if (resetSection) {
    state.currentSection = getDefaultSectionForScope(safeScope);
  }
}

export function setCurrentSection(section) {
  state.currentSection = section || getDefaultSectionForScope(state.currentScope);
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

export function setProviderContext(providerId = null) {
  state.providerId =
    providerId === null || providerId === undefined || providerId === ""
      ? null
      : providerId;
}

export function setAllowedHomeIds(homeIds = []) {
  state.allowedHomeIds = Array.isArray(homeIds)
    ? homeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    : [];
}

export function resetAssistantState() {
  state.assistantMessages = [];
  state.assistantSending = false;
  state.assistantMeta = createAssistantMeta();

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
  const workspace = createWorkspaceState();
  state.youngPersonId = workspace.youngPersonId;
  state.selectedYoungPerson = workspace.selectedYoungPerson;
  state.youngPeople = workspace.youngPeople;
  state.youngPeopleFilter = workspace.youngPeopleFilter;
  state.currentScope = workspace.currentScope;
  state.currentSection = workspace.currentSection;

  const ui = createUiState();
  state.loading = ui.loading;
  state.error = ui.error;
  state.mobileNavOpen = ui.mobileNavOpen;
  state.assistantOpen = ui.assistantOpen;
  state.fullscreenPanelOpen = ui.fullscreenPanelOpen;
  state.recordDrawerOpen = ui.recordDrawerOpen;

  resetSuggestionState();
  resetActiveRecordState();
  resetComposerState();
  resetAssistantState();
}

export function clearRequestOptimisationState() {
  state.resourceCache = Object.create(null);
  state.requestCooldowns = Object.create(null);
}

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

export const DEFAULT_SECTION = "workspace";
export const DEFAULT_SCOPE = "child";
export const DEFAULT_ROLE = "staff";

const VALID_SCOPES = new Set(["child", "home", "quality"]);
const VALID_READINESS_TABS = new Set([
  "overview",
  "judgements",
  "reasons",
  "actions",
  "tasks",
  "briefing",
  "prep",
]);

function getValidScope(scope) {
  const safeScope = String(scope || DEFAULT_SCOPE).trim().toLowerCase();
  return VALID_SCOPES.has(safeScope) ? safeScope : DEFAULT_SCOPE;
}

function getScopeDefaultSection(scope = DEFAULT_SCOPE) {
  const safeScope = getValidScope(scope);
  if (safeScope === "home") return "home-dashboard";
  if (safeScope === "quality") return "quality";
  return DEFAULT_SECTION;
}

function getValidReadinessTab(tab = "overview") {
  const safeTab = String(tab || "overview").trim().toLowerCase();
  return VALID_READINESS_TABS.has(safeTab) ? safeTab : "overview";
}

export function createAssistantMeta() {
  return {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: {},
    assistant_context: {},
    suggested_actions: [],

    intent: null,
    secondary_intents: [],
    retrieval_mode: "whole_scope",
    output_mode: "answer",

    chronology: [],
    facts: {},
    care_domains: {},
    evidence_summary: {},
    evidence_sufficiency: {},
    live_summary: null,

    scrubber_enabled: false,
    scrubber_meta: {},
    scrubber_reverse_map: {},

    last_bundle_refresh_at: null,
    last_analysis_at: null,
  };
}

export function createAssistantUiState() {
  return {
    assistantOpen: false,
    assistantSending: false,
    assistantAutoScroll: true,
    assistantLastError: null,
  };
}

export function createAssistantChatState() {
  return {
    assistantMessages: [],
  };
}

export function createComposerState() {
  return {
    composerOpen: false,
    composerMode: "create",
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

export function createReadinessState() {
  return {
    readinessSelectedHomeId: null,
    readinessActiveTab: "overview",

    readinessHomeCards: [],
    readinessHeader: null,
    readinessSections: [],
    readinessReasons: [],
    readinessActions: [],
    readinessTasks: [],
    readinessBriefing: null,
    readinessPrep72h: null,

    readinessLoadedAt: null,
    readinessLoading: false,
    readinessRefreshing: false,
    readinessSyncing: false,
    readinessError: null,
  };
}

function createUiState() {
  return {
    loading: false,
    error: null,
    mobileNavOpen: false,
    fullscreenPanelOpen: false,
    recordDrawerOpen: false,
  };
}

function createContextState() {
  return {
    homeId: null,
    providerId: null,
    allowedHomeIds: [],
    currentUser: null,
    userId: null,
    staffId: null,
  };
}

function createYoungPersonState() {
  return {
    youngPersonId: null,
    selectedYoungPerson: null,
    youngPerson: null,
    youngPeople: [],
    youngPeopleFilter: "",
  };
}

function createSectionState(scope = DEFAULT_SCOPE) {
  const section = getScopeDefaultSection(scope);
  return {
    currentSection: section,
    activeSection: section,
    currentView: section,
  };
}

export const state = {
  ...createYoungPersonState(),
  ...createSectionState(DEFAULT_SCOPE),

  userRole: DEFAULT_ROLE,
  currentScope: DEFAULT_SCOPE,

  ...createUiState(),
  ...createAssistantUiState(),
  ...createAssistantChatState(),
  ...createSuggestionState(),
  ...createComposerState(),

  activeRecordType: null,
  activeRecordItem: null,

  ...createContextState(),

  assistantMeta: createAssistantMeta(),

  assistantContext: null,
  assistantSources: [],
  assistantRuntime: null,
  assistantExplainability: null,

  ...createAssistantBundleState(),
  ...createReadinessState(),

  resourceCache: Object.create(null),
  requestCooldowns: Object.create(null),
};

function ensureAssistantMeta() {
  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = createAssistantMeta();
    return;
  }

  state.assistantMeta.sources = Array.isArray(state.assistantMeta.sources)
    ? state.assistantMeta.sources
    : [];
  state.assistantMeta.runtime = state.assistantMeta.runtime || {};
  state.assistantMeta.explainability = state.assistantMeta.explainability || {};
  state.assistantMeta.assistant_scope = state.assistantMeta.assistant_scope || {};
  state.assistantMeta.assistant_context =
    state.assistantMeta.assistant_context || {};
  state.assistantMeta.suggested_actions = Array.isArray(
    state.assistantMeta.suggested_actions
  )
    ? state.assistantMeta.suggested_actions
    : [];
  state.assistantMeta.chronology = Array.isArray(state.assistantMeta.chronology)
    ? state.assistantMeta.chronology
    : [];
  state.assistantMeta.facts = state.assistantMeta.facts || {};
  state.assistantMeta.care_domains = state.assistantMeta.care_domains || {};
  state.assistantMeta.evidence_summary =
    state.assistantMeta.evidence_summary || {};
  state.assistantMeta.evidence_sufficiency =
    state.assistantMeta.evidence_sufficiency || {};
  state.assistantMeta.scrubber_meta = state.assistantMeta.scrubber_meta || {};
  state.assistantMeta.scrubber_reverse_map =
    state.assistantMeta.scrubber_reverse_map || {};
  state.assistantMeta.secondary_intents = Array.isArray(
    state.assistantMeta.secondary_intents
  )
    ? state.assistantMeta.secondary_intents
    : [];
}

function ensureAssistantMessages() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }
}

export function normaliseUserRole(role) {
  const raw = String(role || DEFAULT_ROLE).trim().toLowerCase();

  if (raw === "administrator") return "admin";
  if (raw === "super_admin") return "admin";
  if (raw === "superadmin") return "admin";
  if (raw === "responsible_individual") return "ri";

  return raw || DEFAULT_ROLE;
}

export function getDefaultScopeForRole(role = state.userRole) {
  const safeRole = normaliseUserRole(role);

  if (["ri", "admin"].includes(safeRole)) return "quality";

  if (["manager", "registered_manager", "deputy_manager"].includes(safeRole)) {
    return "home";
  }

  return DEFAULT_SCOPE;
}

export function getDefaultSectionForScope(scope = state.currentScope) {
  return getScopeDefaultSection(scope);
}

function syncSectionAliases(section) {
  state.currentSection = section;
  state.activeSection = section;
  state.currentView = section;
}

export function resetAssistantState() {
  Object.assign(state, createAssistantUiState());
  Object.assign(state, createAssistantChatState());

  state.assistantMeta = createAssistantMeta();

  state.assistantContext = null;
  state.assistantSources = [];
  state.assistantRuntime = null;
  state.assistantExplainability = null;

  Object.assign(state, createAssistantBundleState());
}

export function resetComposerState() {
  if (state.autosaveTimer) {
    clearTimeout(state.autosaveTimer);
  }

  Object.assign(state, createComposerState());
}

export function resetSuggestionState() {
  Object.assign(state, createSuggestionState());
}

export function resetActiveRecordState() {
  state.activeRecordType = null;
  state.activeRecordItem = null;
  state.recordDrawerOpen = false;
}

export function resetReadinessState({ preserveSelectedHomeId = false } = {}) {
  const selectedHomeId = preserveSelectedHomeId
    ? state.readinessSelectedHomeId
    : null;

  Object.assign(state, createReadinessState());

  if (preserveSelectedHomeId) {
    state.readinessSelectedHomeId = selectedHomeId;
  }
}

export function resetWorkspaceState() {
  Object.assign(state, createYoungPersonState());

  state.currentScope = DEFAULT_SCOPE;
  state.userRole = DEFAULT_ROLE;
  syncSectionAliases(getScopeDefaultSection(DEFAULT_SCOPE));

  Object.assign(state, createUiState());
  Object.assign(state, createContextState());

  resetSuggestionState();
  resetActiveRecordState();
  resetComposerState();
  resetAssistantState();
  resetReadinessState();
}

export function clearRequestOptimisationState() {
  state.resourceCache = Object.create(null);
  state.requestCooldowns = Object.create(null);
}

export function setCurrentSection(section) {
  const safeSection = section || getScopeDefaultSection(state.currentScope);
  syncSectionAliases(safeSection);
}

export function setCurrentScope(scope, { resetSection = true } = {}) {
  const safeScope = getValidScope(scope);
  state.currentScope = safeScope;

  if (resetSection) {
    syncSectionAliases(getScopeDefaultSection(safeScope));
  }

  if (safeScope !== "quality") {
    state.readinessActiveTab = "overview";
  }
}

export function setUserRole(role) {
  state.userRole = normaliseUserRole(role);
}

export function setSelectedYoungPerson(person = null) {
  const safePerson = person || null;
  state.selectedYoungPerson = safePerson;
  state.youngPerson = safePerson;
  state.youngPersonId = safePerson?.id || safePerson?.young_person_id || null;

  if (!state.homeId && (safePerson?.home_id || safePerson?.homeId)) {
    state.homeId = safePerson.home_id || safePerson.homeId || null;
  }
}

export function clearSelectedYoungPerson() {
  state.youngPersonId = null;
  state.selectedYoungPerson = null;
  state.youngPerson = null;
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

export function setReadinessSelectedHomeId(homeId = null) {
  const safeHomeId = Number(homeId);
  state.readinessSelectedHomeId =
    Number.isFinite(safeHomeId) && safeHomeId > 0 ? safeHomeId : null;
}

export function setReadinessActiveTab(tab = "overview") {
  state.readinessActiveTab = getValidReadinessTab(tab);
}

export function setReadinessLoading(isLoading = false) {
  state.readinessLoading = Boolean(isLoading);
  if (isLoading) {
    state.readinessError = null;
  }
}

export function setReadinessRefreshing(isRefreshing = false) {
  state.readinessRefreshing = Boolean(isRefreshing);
  if (isRefreshing) {
    state.readinessError = null;
  }
}

export function setReadinessSyncing(isSyncing = false) {
  state.readinessSyncing = Boolean(isSyncing);
  if (isSyncing) {
    state.readinessError = null;
  }
}

export function setReadinessError(error = null) {
  state.readinessError = error || null;
}

export function setReadinessData({
  homeCards = null,
  header = null,
  sections = null,
  reasons = null,
  actions = null,
  tasks = null,
  briefing = null,
  prep72h = null,
  selectedHomeId = null,
} = {}) {
  if (Array.isArray(homeCards)) {
    state.readinessHomeCards = homeCards;
  }

  if (header !== null) {
    state.readinessHeader = header;
  }

  if (Array.isArray(sections)) {
    state.readinessSections = sections;
  }

  if (Array.isArray(reasons)) {
    state.readinessReasons = reasons;
  }

  if (Array.isArray(actions)) {
    state.readinessActions = actions;
  }

  if (Array.isArray(tasks)) {
    state.readinessTasks = tasks;
  }

  if (briefing !== null) {
    state.readinessBriefing = briefing;
  }

  if (prep72h !== null) {
    state.readinessPrep72h = prep72h;
  }

  if (
    selectedHomeId !== null &&
    selectedHomeId !== undefined &&
    selectedHomeId !== ""
  ) {
    setReadinessSelectedHomeId(selectedHomeId);
  }

  state.readinessLoadedAt = new Date().toISOString();
  state.readinessError = null;
}

export function getCurrentReadinessHomeId() {
  if (state.readinessSelectedHomeId) {
    return state.readinessSelectedHomeId;
  }

  if (state.homeId) {
    return state.homeId;
  }

  if (state.allowedHomeIds?.length) {
    return state.allowedHomeIds[0];
  }

  return null;
}

export function getBestAvailableHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.selectedYoungPerson?.home_id ||
    state.selectedYoungPerson?.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.allowedHomeIds?.[0] ||
    null
  );
}

export function setAssistantScopeBundle(bundle = null) {
  state.scopeBundle = bundle || null;
  state.scopeBundleLoadedAt = bundle ? new Date().toISOString() : null;
  state.scopeBundleError = null;

  ensureAssistantMeta();
  state.assistantMeta.last_bundle_refresh_at = state.scopeBundleLoadedAt;
}

export function setAssistantScopeBundleLoading(isLoading = false) {
  state.scopeBundleLoading = Boolean(isLoading);

  if (isLoading) {
    state.scopeBundleError = null;
  }
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
  ensureAssistantMeta();

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

export function pushAssistantMessage(message = {}) {
  ensureAssistantMessages();
  state.assistantMessages.push(message);
}

export function replaceLastAssistantMessage(message = {}) {
  ensureAssistantMessages();

  if (!state.assistantMessages.length) {
    state.assistantMessages.push(message);
    return;
  }

  state.assistantMessages[state.assistantMessages.length - 1] = message;
}

export function updateLastAssistantMessage(updater) {
  ensureAssistantMessages();

  if (!state.assistantMessages.length) return;

  const lastIndex = state.assistantMessages.length - 1;
  const current = state.assistantMessages[lastIndex];

  state.assistantMessages[lastIndex] =
    typeof updater === "function" ? updater(current) : current;
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
      id: getBestAvailableHomeId(),
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

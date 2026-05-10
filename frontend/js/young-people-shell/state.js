export const DEFAULT_SECTION = "workspace";
export const DEFAULT_SCOPE = "child";
export const DEFAULT_ROLE = "staff";

export const VALID_SCOPES = new Set(["child", "home", "quality", "ofsted"]);

export const CANONICAL_RECORD_TYPES = Object.freeze({
  daily_note: "daily_note",
  incident: "incident",
  safeguarding: "safeguarding",
  risk: "risk",
  keywork: "keywork",
  education: "education",
  health: "health",
  family: "family",
  document: "document",
  task: "task",
  chronology: "chronology",
});

export const WORKSPACE_RECORD_TYPES = Object.freeze({
  workspace: null,
  "daily-notes": CANONICAL_RECORD_TYPES.daily_note,
  incidents: CANONICAL_RECORD_TYPES.incident,
  safeguarding: CANONICAL_RECORD_TYPES.safeguarding,
  risk: CANONICAL_RECORD_TYPES.risk,
  keywork: CANONICAL_RECORD_TYPES.keywork,
  education: CANONICAL_RECORD_TYPES.education,
  health: CANONICAL_RECORD_TYPES.health,
  family: CANONICAL_RECORD_TYPES.family,
  documents: CANONICAL_RECORD_TYPES.document,
  tasks: CANONICAL_RECORD_TYPES.task,
  timeline: CANONICAL_RECORD_TYPES.chronology,
});

const VALID_READINESS_TABS = new Set([
  "overview",
  "judgements",
  "reasons",
  "actions",
  "tasks",
  "briefing",
  "prep",
]);

export function normaliseNumericId(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getValidScope(scope) {
  const safeScope = String(scope || DEFAULT_SCOPE).trim().toLowerCase();
  return VALID_SCOPES.has(safeScope) ? safeScope : DEFAULT_SCOPE;
}

function getScopeDefaultSection(scope = DEFAULT_SCOPE) {
  const safeScope = getValidScope(scope);
  if (safeScope === "home") return "home-dashboard";
  if (safeScope === "quality") return "quality";
  if (safeScope === "ofsted") return "ofsted-dashboard";
  return DEFAULT_SECTION;
}

function getValidReadinessTab(tab = "overview") {
  const safeTab = String(tab || "overview").trim().toLowerCase();
  return VALID_READINESS_TABS.has(safeTab) ? safeTab : "overview";
}

function normaliseHomeIds(homeIds = []) {
  if (!Array.isArray(homeIds)) return [];
  return [
    ...new Set(
      homeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    ),
  ];
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function ensureObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : fallback;
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
    assistant_insight_pack: null,

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
    assistantModalMessages: [],
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
    homes: [],
    provider: null,
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

  state.assistantMeta.sources = ensureArray(state.assistantMeta.sources);
  state.assistantMeta.runtime = ensureObject(state.assistantMeta.runtime);
  state.assistantMeta.explainability = ensureObject(
    state.assistantMeta.explainability
  );
  state.assistantMeta.assistant_scope = ensureObject(
    state.assistantMeta.assistant_scope
  );
  state.assistantMeta.assistant_context = ensureObject(
    state.assistantMeta.assistant_context
  );
  state.assistantMeta.suggested_actions = ensureArray(
    state.assistantMeta.suggested_actions
  );
  state.assistantMeta.secondary_intents = ensureArray(
    state.assistantMeta.secondary_intents
  );
  state.assistantMeta.chronology = ensureArray(state.assistantMeta.chronology);
  state.assistantMeta.facts = ensureObject(state.assistantMeta.facts);
  state.assistantMeta.care_domains = ensureObject(state.assistantMeta.care_domains);
  state.assistantMeta.evidence_summary = ensureObject(
    state.assistantMeta.evidence_summary
  );
  state.assistantMeta.evidence_sufficiency = ensureObject(
    state.assistantMeta.evidence_sufficiency
  );
  state.assistantMeta.scrubber_meta = ensureObject(state.assistantMeta.scrubber_meta);
  state.assistantMeta.scrubber_reverse_map = ensureObject(
    state.assistantMeta.scrubber_reverse_map
  );

  if (!("live_summary" in state.assistantMeta)) {
    state.assistantMeta.live_summary = null;
  }

  if (!("assistant_insight_pack" in state.assistantMeta)) {
    state.assistantMeta.assistant_insight_pack = null;
  }

  if (!("intent" in state.assistantMeta)) {
    state.assistantMeta.intent = null;
  }

  if (!("retrieval_mode" in state.assistantMeta)) {
    state.assistantMeta.retrieval_mode = "whole_scope";
  }

  if (!("output_mode" in state.assistantMeta)) {
    state.assistantMeta.output_mode = "answer";
  }
}

function ensureAssistantMessages() {
  state.assistantMessages = ensureArray(state.assistantMessages);
  state.assistantModalMessages = ensureArray(state.assistantModalMessages);
}

export function initialiseStateGuards() {
  ensureAssistantMeta();
  ensureAssistantMessages();

  state.allowedHomeIds = normaliseHomeIds(state.allowedHomeIds);
  state.homes = ensureArray(state.homes);
  state.youngPeople = ensureArray(state.youngPeople);
  state.currentSuggestions = ensureArray(state.currentSuggestions);
  state.suggestions = ensureArray(state.suggestions);
  state.liveUpdates = ensureArray(state.liveUpdates);

  if (!state.resourceCache || typeof state.resourceCache !== "object") {
    state.resourceCache = Object.create(null);
  }

  if (!state.requestCooldowns || typeof state.requestCooldowns !== "object") {
    state.requestCooldowns = Object.create(null);
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

  if (safeRole === "ri" || safeRole === "admin") return "quality";

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
  state.activeRecordType = WORKSPACE_RECORD_TYPES[section] || null;
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
  state.activeRecordType = WORKSPACE_RECORD_TYPES[state.currentSection] || null;
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
  clearRequestOptimisationState();
  initialiseStateGuards();
}

export function clearRequestOptimisationState() {
  state.resourceCache = Object.create(null);
  state.requestCooldowns = Object.create(null);
}

export function setCurrentSection(section) {
  const safeSection =
    typeof section === "string" && section.trim()
      ? section.trim()
      : getScopeDefaultSection(state.currentScope);

  syncSectionAliases(safeSection);
}

export function setCurrentScope(scope, { resetSection = true } = {}) {
  const safeScope = getValidScope(scope);
  state.currentScope = safeScope;

  if (resetSection) {
    syncSectionAliases(getScopeDefaultSection(safeScope));
  }

  if (!["quality", "ofsted"].includes(safeScope)) {
    state.readinessActiveTab = "overview";
  }
}

export function setUserRole(role) {
  state.userRole = normaliseUserRole(role);
}

export function setCurrentUserContext(user = null) {
  const safeUser = user && typeof user === "object" ? user : null;

  state.currentUser = safeUser;

  state.userId = normaliseNumericId(
    safeUser?.id ?? safeUser?.user_id ?? safeUser?.userId ?? null
  );

  state.staffId = normaliseNumericId(
    safeUser?.staff_id ?? safeUser?.staffId ?? null
  );

  state.providerId = normaliseNumericId(
    safeUser?.provider_id ?? safeUser?.providerId ?? state.providerId
  );

  const userHomeId = normaliseNumericId(
    safeUser?.home_id ?? safeUser?.homeId ?? state.homeId
  );

  if (userHomeId) {
    state.homeId = userHomeId;
  }

  const explicitAllowedHomes =
    safeUser?.allowed_home_ids ||
    safeUser?.allowedHomeIds ||
    safeUser?.home_ids ||
    safeUser?.homeIds ||
    [];

  const allowedHomeIds = normaliseHomeIds([
    ...ensureArray(explicitAllowedHomes),
    userHomeId,
  ]);

  if (allowedHomeIds.length) {
    state.allowedHomeIds = allowedHomeIds;
  }

  if (Array.isArray(safeUser?.homes)) {
    state.homes = safeUser.homes;
    const idsFromHomes = normaliseHomeIds(
      safeUser.homes.map((home) => home?.id ?? home?.home_id)
    );
    if (idsFromHomes.length) {
      state.allowedHomeIds = normaliseHomeIds([
        ...state.allowedHomeIds,
        ...idsFromHomes,
      ]);
    }
  }

  if (safeUser?.provider && typeof safeUser.provider === "object") {
    state.provider = safeUser.provider;
  }

  setUserRole(safeUser?.role || safeUser?.user_role || state.userRole);

  if (!state.currentScope || state.currentScope === DEFAULT_SCOPE) {
    setCurrentScope(getDefaultScopeForRole(state.userRole));
  }

  initialiseStateGuards();
}

export function setSelectedYoungPerson(person = null) {
  const safePerson = person || null;

  state.selectedYoungPerson = safePerson;
  state.youngPerson = safePerson;
  state.youngPersonId = normaliseNumericId(
    safePerson?.id ?? safePerson?.young_person_id ?? safePerson?.youngPersonId
  );

  const personHomeId = normaliseNumericId(
    safePerson?.home_id ?? safePerson?.homeId ?? null
  );

  if (personHomeId) {
    state.homeId = personHomeId;
  }

  resetActiveRecordState();
  resetSuggestionState();
  clearAssistantLiveUpdates();
}

export function setYoungPeople(people = []) {
  state.youngPeople = ensureArray(people);
}

export function clearSelectedYoungPerson() {
  state.youngPersonId = null;
  state.selectedYoungPerson = null;
  state.youngPerson = null;

  resetActiveRecordState();
  resetSuggestionState();
}

export function getSelectedYoungPersonId() {
  return normaliseNumericId(
    state.youngPersonId ||
      state.selectedYoungPerson?.id ||
      state.selectedYoungPerson?.young_person_id ||
      state.youngPerson?.id ||
      state.youngPerson?.young_person_id
  );
}

export function setHomeContext(homeId = null) {
  state.homeId = normaliseNumericId(homeId);
}

export function setProviderContext(providerId = null) {
  state.providerId = normaliseNumericId(providerId);
}

export function setAllowedHomeIds(homeIds = []) {
  state.allowedHomeIds = normaliseHomeIds(homeIds);
}

export function canAccessHomeId(homeId = null) {
  const parsedHomeId = normaliseNumericId(homeId);
  if (!parsedHomeId) return false;

  const allowedHomeIds = normaliseHomeIds(state.allowedHomeIds);
  if (!allowedHomeIds.length) return true;

  return allowedHomeIds.includes(parsedHomeId);
}

export function setReadinessSelectedHomeId(homeId = null) {
  state.readinessSelectedHomeId = normaliseNumericId(homeId);
}

export function setReadinessActiveTab(tab = "overview") {
  state.readinessActiveTab = getValidReadinessTab(tab);
}

export function setReadinessLoading(isLoading = false) {
  state.readinessLoading = Boolean(isLoading);
  if (isLoading) state.readinessError = null;
}

export function setReadinessRefreshing(isRefreshing = false) {
  state.readinessRefreshing = Boolean(isRefreshing);
  if (isRefreshing) state.readinessError = null;
}

export function setReadinessSyncing(isSyncing = false) {
  state.readinessSyncing = Boolean(isSyncing);
  if (isSyncing) state.readinessError = null;
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
  if (Array.isArray(homeCards)) state.readinessHomeCards = homeCards;
  if (header !== null) state.readinessHeader = header;
  if (Array.isArray(sections)) state.readinessSections = sections;
  if (Array.isArray(reasons)) state.readinessReasons = reasons;
  if (Array.isArray(actions)) state.readinessActions = actions;
  if (Array.isArray(tasks)) state.readinessTasks = tasks;
  if (briefing !== null) state.readinessBriefing = briefing;
  if (prep72h !== null) state.readinessPrep72h = prep72h;

  if (selectedHomeId !== null && selectedHomeId !== undefined && selectedHomeId !== "") {
    setReadinessSelectedHomeId(selectedHomeId);
  }

  state.readinessLoadedAt = new Date().toISOString();
  state.readinessError = null;
}

export function getCurrentReadinessHomeId() {
  return (
    normaliseNumericId(state.readinessSelectedHomeId) ||
    normaliseNumericId(state.homeId) ||
    normaliseNumericId(state.allowedHomeIds?.[0]) ||
    null
  );
}

export function getBestAvailableHomeId() {
  return (
    normaliseNumericId(state.readinessSelectedHomeId) ||
    normaliseNumericId(state.homeId) ||
    normaliseNumericId(state.selectedYoungPerson?.home_id) ||
    normaliseNumericId(state.selectedYoungPerson?.homeId) ||
    normaliseNumericId(state.currentUser?.home_id) ||
    normaliseNumericId(state.currentUser?.homeId) ||
    normaliseNumericId(state.allowedHomeIds?.[0]) ||
    null
  );
}

export function resolveAccessibleHomeId(preferredHomeId = null) {
  const parsedPreferred = normaliseNumericId(
    preferredHomeId ??
      state.readinessSelectedHomeId ??
      state.homeId ??
      state.selectedYoungPerson?.home_id ??
      state.selectedYoungPerson?.homeId ??
      state.currentUser?.home_id ??
      state.currentUser?.homeId ??
      null
  );

  const allowedHomeIds = normaliseHomeIds(state.allowedHomeIds);

  if (allowedHomeIds.length) {
    if (parsedPreferred && allowedHomeIds.includes(parsedPreferred)) {
      return parsedPreferred;
    }

    return allowedHomeIds[0];
  }

  return parsedPreferred;
}

export function hasResolvedHomeContext() {
  return Boolean(resolveAccessibleHomeId());
}

export function hasResolvedProviderContext() {
  return Boolean(normaliseNumericId(state.providerId));
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
  if (isLoading) state.scopeBundleError = null;
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
  assistant_insight_pack = null,
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

  if (morning_brief !== null) state.latestMorningBrief = morning_brief;
  if (manager_brief !== null) state.latestManagerBrief = manager_brief;
  if (quality_brief !== null) state.latestQualityBrief = quality_brief;
  if (live_summary !== null) state.assistantMeta.live_summary = live_summary;

  if (assistant_insight_pack && typeof assistant_insight_pack === "object") {
    state.assistantMeta.assistant_insight_pack = assistant_insight_pack;
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

export function pushAssistantModalMessage(message = {}) {
  ensureAssistantMessages();
  state.assistantModalMessages.push(message);
}

export function replaceLastAssistantModalMessage(message = {}) {
  ensureAssistantMessages();

  if (!state.assistantModalMessages.length) {
    state.assistantModalMessages.push(message);
    return;
  }

  state.assistantModalMessages[state.assistantModalMessages.length - 1] = message;
}

export function updateLastAssistantModalMessage(updater) {
  ensureAssistantMessages();
  if (!state.assistantModalMessages.length) return;

  const lastIndex = state.assistantModalMessages.length - 1;
  const current = state.assistantModalMessages[lastIndex];

  state.assistantModalMessages[lastIndex] =
    typeof updater === "function" ? updater(current) : current;
}

export function getCurrentScopeEntity() {
  if (state.currentScope === "child") {
    return {
      type: "child",
      id: getSelectedYoungPersonId(),
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
      id: resolveAccessibleHomeId(),
      name: state.currentUser?.home_name || state.currentUser?.homeName || null,
    };
  }

  if (state.currentScope === "quality") {
    return {
      type: "quality",
      id: normaliseNumericId(state.providerId) || resolveAccessibleHomeId(),
      name:
        state.currentUser?.provider_name ||
        state.currentUser?.providerName ||
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        null,
    };
  }

  if (state.currentScope === "ofsted") {
    return {
      type: "ofsted",
      id: resolveAccessibleHomeId(),
      name:
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        state.currentUser?.provider_name ||
        state.currentUser?.providerName ||
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

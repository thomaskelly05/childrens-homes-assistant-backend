export const state = {
  // Selected young person / workspace
  youngPersonId: null,
  selectedYoungPerson: null,
  youngPeople: [],
  youngPeopleFilter: "",

  // Current shell section / view
  currentSection: "workspace",
  activeSection: "workspace",
  currentView: "workspace",

  // Role / scope layer
  userRole: "staff", // "staff" | "manager" | "ri"
  currentScope: "child", // "child" | "home" | "quality"

  // General UI state
  loading: false,
  error: null,
  mobileNavOpen: false,
  assistantOpen: false,
  fullscreenPanelOpen: false,
  recordDrawerOpen: false,

  // Suggestions / linked follow-up state
  currentSuggestions: [],
  currentSuggestionSource: null,
  lastSavedRecord: null,
  suggestions: [],

  // Composer state
  composerOpen: false,
  composerMode: "create", // "create" | "edit"
  composerRecordType: null,
  composerRecordId: null,
  composerEditItem: null,
  composerMeta: {},
  autosaveTimer: null,

  // Active record / drawer context
  activeRecordType: null,
  activeRecordItem: null,

  // Runtime / context state
  homeId: null,
  currentUser: null,
  userId: null,
  staffId: null,

  // Assistant state
  assistantMessages: [],
  assistantModalMessages: [],
  assistantContext: null,
  assistantSources: [],
  assistantRuntime: null,
  assistantExplainability: null,
  assistantSending: false,
  assistantMeta: {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: {},
    assistant_context: {},
    suggested_actions: [],
  },

  // Request optimisation state
  resourceCache: Object.create(null),
  requestCooldowns: Object.create(null),
};

export function resetAssistantState() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  state.assistantContext = null;
  state.assistantSources = [];
  state.assistantRuntime = null;
  state.assistantExplainability = null;
  state.assistantSending = false;
  state.assistantMeta = {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: {},
    assistant_context: {},
    suggested_actions: [],
  };
}

export function resetComposerState() {
  state.composerOpen = false;
  state.composerMode = "create";
  state.composerRecordType = null;
  state.composerRecordId = null;
  state.composerEditItem = null;
  state.composerMeta = {};

  if (state.autosaveTimer) {
    clearTimeout(state.autosaveTimer);
  }
  state.autosaveTimer = null;
}

export function resetActiveRecordState() {
  state.activeRecordType = null;
  state.activeRecordItem = null;
  state.recordDrawerOpen = false;
}

export function resetWorkspaceState() {
  state.youngPersonId = null;
  state.selectedYoungPerson = null;
  state.currentSection = "workspace";
  state.activeSection = "workspace";
  state.currentView = "workspace";
  state.currentScope = "child";
  state.loading = false;
  state.error = null;
  state.fullscreenPanelOpen = false;
  state.mobileNavOpen = false;
  state.currentSuggestions = [];
  state.currentSuggestionSource = null;
  state.lastSavedRecord = null;
  state.suggestions = [];

  resetActiveRecordState();
  resetComposerState();
}

export function clearRequestOptimisationState() {
  state.resourceCache = Object.create(null);
  state.requestCooldowns = Object.create(null);
}

export function setCurrentSection(section) {
  const safeSection = section || "workspace";
  state.currentSection = safeSection;
  state.activeSection = safeSection;
  state.currentView = safeSection;
}

export function setCurrentScope(scope) {
  state.currentScope = scope || "child";
}

export function setUserRole(role) {
  state.userRole = role || "staff";
}

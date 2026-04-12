export const state = {
  // Selected young person / workspace
  youngPersonId: null,
  selectedYoungPerson: null,
  youngPeople: [],
  youngPeopleFilter: "",

  // Current shell section
  currentSection: "workspace",
  activeSection: "workspace",

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
  composerMode: "create",
  composerRecordType: null,
  composerRecordId: null,
  composerEditItem: null,
  composerMeta: {},
  autosaveTimer: null,

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
};
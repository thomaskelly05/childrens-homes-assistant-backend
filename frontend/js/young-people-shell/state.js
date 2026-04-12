export const state = {
  // Selected young person
  youngPersonId: null,
  selectedYoungPerson: null,
  youngPeople: [],
  youngPeopleFilter: "",

  // Section / navigation
  currentSection: "workspace",
  activeSection: "workspace",

  // Workspace / records
  activeRecordItem: null,
  activeRecordType: null,
  lastSavedRecord: null,

  // Composer
  composerOpen: false,
  composerMode: "create",
  composerRecordType: null,
  composerRecordId: null,
  composerEditItem: null,
  autosaveTimer: null,

  // Suggestions
  currentSuggestions: [],
  currentSuggestionSource: null,

  // Optional legacy compatibility
  suggestions: [],
};
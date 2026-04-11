export const state = {
  youngPersonId: null,
  youngPerson: null,
  currentView: "overview",
  selectorItems: [],
  activeRecordItem: null,
  activeRecordType: null,

  assistantMessages: [],
  assistantModalMessages: [],
  assistantSending: false,
  assistantMeta: {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: {},
    assistant_context: {},
    suggested_actions: [],
  },

  composerOpen: false,
  composerMode: "create",
  composerRecordType: null,
  composerRecordId: null,
  composerEditItem: null,

  autosaveTimer: null,
  autosaveDirty: false,
  autosaveKey: null,
  autosaveLastAt: null,

  mobileNavOpen: false,
};

export function resetAssistantState() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
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
  state.autosaveTimer = null;
  state.autosaveDirty = false;
  state.autosaveKey = null;
  state.autosaveLastAt = null;
}

export function resetWorkspaceState() {
  state.youngPersonId = null;
  state.youngPerson = null;
  state.currentView = "overview";
  state.selectorItems = [];
  state.activeRecordItem = null;
  state.activeRecordType = null;
  state.mobileNavOpen = false;

  resetAssistantState();
  resetComposerState();
}

function byId(id) {
  return document.getElementById(id);
}

const DOM_KEYS = {
  app: "app",
  mainContent: "mainContent",

  workspaceScreen: "workspacePanel",
  workspacePanel: "workspacePanel",
  workspaceShell: "workspaceShell",
  selectorScreen: "selectorPanel",
  selectorPanel: "selectorPanel",
  viewContent: "viewContent",
  statusBar: "statusBar",
  statusMessage: "statusMessage",
  selectorStatusMessage: "selectorStatusMessage",

  logoBtn: "logoBtn",
  refreshBtn: "refreshBtn",
  refreshWorkspaceBtn: "refreshWorkspaceBtn",
  goHomeBtn: "goHomeBtn",
  assistantLauncher: "assistantLauncher",

  themeToggleBtn: "themeToggleBtn",
  nightShiftModeBtn: "nightShiftModeBtn",

  globalSearchForm: "globalSearchForm",
  recordSearchInput: "recordSearchInput",
  recordTypeFilter: "recordTypeFilter",

  scopeSwitch: "scopeSwitch",
  scopeChildBtn: "scopeChildBtn",
  scopeHomeBtn: "scopeHomeBtn",
  scopeQualityBtn: "scopeQualityBtn",
  scopeOfstedBtn: "scopeOfstedBtn",

  welcomePanel: "welcomePanel",
  welcomeMessage: "welcomeMessage",
  welcomeSubMessage: "welcomeSubMessage",
  welcomeOpenActions: "welcomeOpenActions",
  welcomeReviewsDue: "welcomeReviewsDue",
  welcomeDocumentsDue: "welcomeDocumentsDue",

  selectorList: "selectorList",
  selectorSearch: "selectorSearch",
  youngPersonSearchInput: "youngPersonSearchInput",
  selectorRefreshBtn: "selectorRefreshBtn",

  safeStartChooseHomeBtn: "safeStartChooseHomeBtn",
  safeStartAskAssistantBtn: "safeStartAskAssistantBtn",
  safeStartVoiceSearchBtn: "safeStartVoiceSearchBtn",

  homeSearchInput: "homeSearchInput",
  homeSelect: "homeSelect",
  homeChipList: "homeChipList",
  selectedHomeSummary: "selectedHomeSummary",

  youngPersonSelect: "youngPersonSelect",
  selectedChildSummary: "selectedChildSummary",

  launchReadinessStrip: "launchReadinessStrip",
  launchReadyHome: "launchReadyHome",
  launchReadyChild: "launchReadyChild",
  launchLastRefreshed: "launchLastRefreshed",
  launchOpenCareHubBtn: "launchOpenCareHubBtn",

  openCareHubDrawer: "openCareHubDrawer",
  openCareHubBtn: "openCareHubBtn",
  clearSafeStartBtn: "clearSafeStartBtn",
  safeStartReadySummary: "safeStartReadySummary",
  readyHomeName: "readyHomeName",
  readyChildName: "readyChildName",

  workspaceEyebrow: "workspaceEyebrow",
  pageTitle: "pageTitle",
  pageSubtitle: "pageSubtitle",
  heroAssistantBtn: "heroAssistantBtn",
  heroQuickActions: "heroQuickActions",
  quickCreateBar: "quickCreateBar",
  changePersonBtn: "changePersonBtn",
  profileOpenBtn: "profileOpenBtn",
  profilePhotoUploadBtn: "profilePhotoUploadBtn",

  osSidebar: "osSidebar",
  therapeuticPromptPanel: "therapeuticPromptPanel",
  dismissTherapeuticPromptBtn: "dismissTherapeuticPromptBtn",
  journeyRail: "journeyRail",
  recordQuickDock: "recordQuickDock",
  priorityDock: "priorityDock",

  priorityRiskChanges: "priorityRiskChanges",
  priorityDueToday: "priorityDueToday",
  priorityDocuments: "priorityDocuments",
  priorityOversight: "priorityOversight",

  personAvatar: "personAvatar",
  personName: "personName",
  personMeta: "personMeta",
  personSummaryChips: "personSummaryChips",

  mobilePersonAvatar: "mobilePersonAvatar",
  mobilePersonName: "mobilePersonName",
  mobilePersonMeta: "mobilePersonMeta",
  mobileHomeBtn: "mobileHomeBtn",

  mobileNavToggle: "mobileNavToggle",
  mobileNavPanel: "mobileNavPanel",
  mobileNavDrawer: "mobileNavPanel",
  mobileNavBackdrop: "mobileNavBackdrop",
  closeMobileNavBtn: "closeMobileNavBtn",
  mobileNavContent: "mobileNavContent",
  mobileBottomNav: "mobileBottomNav",
  mobileBottomBar: "mobileBottomNav",

  mobileDrawerPersonName: "mobileDrawerPersonName",
  mobileDrawerPersonMeta: "mobileDrawerPersonMeta",
  mobileSearchForm: "mobileSearchForm",
  mobileRecordSearchInput: "mobileRecordSearchInput",

  workspaceSummaryStrip: "workspaceSummaryStrip",
  summaryToday: "summaryToday",
  summaryNextEvent: "summaryNextEvent",
  summaryLastRecord: "summaryLastRecord",
  summaryOpenActions: "summaryOpenActions",

  searchResultsRegion: "searchResultsRegion",
  searchResultsTitle: "searchResultsTitle",
  searchResultsList: "searchResultsList",
  clearSearchResultsBtn: "clearSearchResultsBtn",

  documentLibraryShell: "documentLibraryShell",
  documentCategoryGrid: "documentCategoryGrid",
  staffJourneyShell: "staffJourneyShell",
  staffJourneyGrid: "staffJourneyGrid",

  assistantBackdrop: "assistantBackdrop",
  assistantModal: "assistantModal",
  assistantPanel: "assistantModal",
  closeAssistantBtn: "closeAssistantBtn",
  assistantMessages: "assistantMessages",
  assistantForm: "assistantForm",
  assistantInput: "assistantInput",
  assistantVoiceBtn: "assistantVoiceBtn",
  assistantSendBtn: "assistantSendBtn",
  assistantClearBtn: "assistantClearBtn",

  assistantContext: "assistantContext",
  assistantSuggestions: "assistantSuggestions",
  assistantScopeSummary: "assistantScopeSummary",
  assistantActions: "assistantActions",
  assistantSources: "assistantSources",
  assistantRuntime: "assistantRuntime",
  assistantExplainability: "assistantExplainability",

  scopeBadge: "scopeBadge",
  scopeHomeBadge: "scopeHomeBadge",
  scopeChildBadge: "scopeChildBadge",
  scopeShiftBadge: "scopeShiftBadge",

  assistantScopeBundleStatus: "assistantScopeBundleStatus",
  assistantScopeBundleError: "assistantScopeBundleError",
  assistantLiveStatus: "assistantLiveStatus",
  assistantRefreshScopeBtn: "assistantRefreshScopeBtn",
  assistantRefreshAnalysisBtn: "assistantRefreshAnalysisBtn",
  morningBriefBody: "morningBriefBody",
  managerBriefBody: "managerBriefBody",
  qualityBriefBody: "qualityBriefBody",
  liveUpdatesBody: "liveUpdatesBody",
  clearLiveUpdatesBtn: "clearLiveUpdatesBtn",

  fullscreenPanel: "fullscreenPanel",
  fullscreenPanelTitle: "fullscreenPanelTitle",
  fullscreenPanelSubtitle: "fullscreenPanelSubtitle",
  fullscreenPanelActions: "fullscreenPanelActions",
  closeFullscreenPanelBtn: "closeFullscreenPanelBtn",
  fullscreenPanelBody: "fullscreenPanelBody",

  composerPanel: "recordComposerPage",
  recordComposerPage: "recordComposerPage",
  composerTitle: "composerTitle",
  composerSubtitle: "composerSubtitle",
  composerGuidanceText: "composerGuidanceText",
  composerPrompts: "composerPrompts",
  recordComposerForm: "recordComposerForm",
  recordComposerFields: "recordComposerFields",

  autosaveStatus: "autosaveStatus",
  autosaveTime: "autosaveTime",

  composerSpeechBtn: "composerSpeechBtn",
  composerTherapeuticModeBtn: "composerTherapeuticModeBtn",
  closeComposerBtn: "closeComposerBtn",
  composerSaveBtn: "composerSaveBtn",
  composerSaveDraftBtn: "composerSaveDraftBtn",
  composerCheckBtn: "composerCheckBtn",
  composerSubmitBtn: "composerSubmitBtn",

  recordQualityMeter: "recordQualityMeter",
  qualityFactsStatus: "qualityFactsStatus",
  qualityChildVoiceStatus: "qualityChildVoiceStatus",
  qualityActionsStatus: "qualityActionsStatus",
  qualityOversightStatus: "qualityOversightStatus",
  composerModePanel: "composerModePanel",

  composerGrammarBtn: "composerGrammarBtn",
  composerClarityBtn: "composerClarityBtn",
  composerSafeguardingBtn: "composerSafeguardingBtn",
  composerChildVoiceBtn: "composerChildVoiceBtn",
  composerLanguageBtn: "composerLanguageBtn",
  composerAiFeedback: "composerAiFeedback",
  childVoiceReminder: "childVoiceReminder",

  recordDrawer: "recordDrawer",
  recordDrawerBackdrop: "recordDrawerBackdrop",
  recordDrawerTitle: "recordDrawerTitle",
  recordDrawerSubtitle: "recordDrawerSubtitle",
  recordDrawerBody: "recordDrawerBody",
  recordDrawerActions: "recordDrawerActions",
  closeRecordDrawerBtn: "closeRecordDrawerBtn",
  drawerEditBtn: "drawerEditBtn",
  drawerSubmitBtn: "drawerSubmitBtn",
  drawerApproveBtn: "drawerApproveBtn",
  drawerReturnBtn: "drawerReturnBtn",
  drawerArchiveBtn: "drawerArchiveBtn",

  suggestionsPanel: "suggestionsPanel",
  suggestionsPanelTitle: "suggestionsPanelTitle",
  suggestionsPanelSubtitle: "suggestionsPanelSubtitle",
  suggestionsPanelBody: "suggestionsPanelBody",
  closeSuggestionsPanelBtn: "closeSuggestionsPanelBtn",
};

function firstDefinedElement(...candidates) {
  return candidates.find(Boolean) || null;
}

function buildEls() {
  const resolved = {};

  Object.entries(DOM_KEYS).forEach(([key, id]) => {
    resolved[key] = byId(id);
  });

  resolved.selectorPanel = firstDefinedElement(
    resolved.selectorPanel,
    resolved.selectorScreen,
    byId("selectorScreen")
  );

  resolved.selectorScreen = firstDefinedElement(
    resolved.selectorScreen,
    resolved.selectorPanel
  );

  resolved.workspacePanel = firstDefinedElement(
    resolved.workspacePanel,
    resolved.workspaceScreen,
    byId("workspaceScreen")
  );

  resolved.workspaceScreen = firstDefinedElement(
    resolved.workspaceScreen,
    resolved.workspacePanel
  );

  resolved.mobileNavBtn = firstDefinedElement(
    resolved.mobileNavToggle,
    byId("mobileNavBtn")
  );

  resolved.mobileNavDrawer = firstDefinedElement(
    resolved.mobileNavPanel,
    resolved.mobileNavDrawer
  );

  resolved.mobileBottomBar = firstDefinedElement(
    resolved.mobileBottomNav,
    resolved.mobileBottomBar
  );

  resolved.homeBtn = firstDefinedElement(
    byId("homeBtn"),
    resolved.goHomeBtn,
    resolved.logoBtn
  );

  resolved.composerPanel = firstDefinedElement(
    resolved.recordComposerPage,
    resolved.composerPanel
  );

  resolved.composerForm = resolved.recordComposerForm;
  resolved.composerFields = resolved.recordComposerFields;
  resolved.composerBody = resolved.recordComposerFields;
  resolved.composerError = resolved.composerAiFeedback;
  resolved.composerAutosaveStatus = firstDefinedElement(
    resolved.autosaveStatus,
    byId("composerAutosaveStatus")
  );

  resolved.drawer = resolved.recordDrawer;
  resolved.drawerBackdrop = resolved.recordDrawerBackdrop;
  resolved.drawerTitle = resolved.recordDrawerTitle;
  resolved.drawerSubtitle = resolved.recordDrawerSubtitle;
  resolved.drawerBody = resolved.recordDrawerBody;
  resolved.drawerActions = resolved.recordDrawerActions;
  resolved.closeDrawerBtn = resolved.closeRecordDrawerBtn;

  resolved.workspaceTitle = firstDefinedElement(
    byId("workspaceTitle"),
    resolved.pageTitle
  );

  resolved.workspaceSubtitle = firstDefinedElement(
    byId("workspaceSubtitle"),
    resolved.pageSubtitle
  );

  resolved.workspaceBody = firstDefinedElement(
    byId("workspaceBody"),
    resolved.viewContent
  );

  resolved.sectionNav = firstDefinedElement(
    byId("sectionNav"),
    resolved.heroQuickActions,
    resolved.mobileNavContent,
    resolved.osSidebar
  );

  resolved.assistantBody = firstDefinedElement(
    byId("assistantBody"),
    resolved.assistantMessages
  );

  resolved.youngPersonSelector = firstDefinedElement(
    resolved.youngPersonSelect,
    byId("youngPersonSelector"),
    resolved.selectorList
  );

  resolved.assistantComposer = firstDefinedElement(
    resolved.assistantForm,
    byId("assistantComposer")
  );

  resolved.assistantSend = firstDefinedElement(
    resolved.assistantSendBtn,
    byId("assistantSend")
  );

  resolved.workspaceRoot = firstDefinedElement(
    resolved.workspacePanel,
    resolved.workspaceScreen,
    resolved.workspaceShell
  );

  resolved.youngPeopleRoot = firstDefinedElement(
    resolved.mainContent,
    resolved.workspacePanel,
    resolved.selectorPanel
  );

  resolved.youngPeopleShell = firstDefinedElement(
    resolved.app,
    byId("youngPeopleShell")
  );

  return resolved;
}

export let els = buildEls();

export function refreshEls() {
  els = buildEls();
  return els;
}

export function getEl(id) {
  return byId(id);
}

export function requireEl(id, context = "unknown") {
  const el = byId(id);

  if (!el) {
    console.warn(`[dom] missing required element "${id}" in ${context}`);
  }

  return el;
}

export function validateCoreDom() {
  const requiredIds = [
    "app",
    "mainContent",
    "workspacePanel",
    "selectorPanel",
    "viewContent",
    "homeSelect",
    "youngPersonSelect",
    "selectorList",
    "homeChipList",
    "recordComposerPage",
    "recordComposerForm",
    "recordComposerFields",
    "assistantModal",
    "assistantMessages",
    "recordDrawer",
  ];

  const missing = requiredIds.filter((id) => !byId(id));

  if (missing.length) {
    console.warn("[dom] missing core elements", missing);
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}
function byId(id) {
  return document.getElementById(id);
}

const DOM_KEYS = {
  app: "app",
  mainContent: "mainContent",

  selectorPanel: "selectorPanel",
  selectorScreen: "selectorPanel",
  workspacePanel: "workspacePanel",
  workspaceScreen: "workspacePanel",
  workspaceShell: "workspaceShell",
  viewContent: "viewContent",

  statusBar: "statusBar",
  statusMessage: "statusMessage",
  selectorStatusMessage: "selectorStatusMessage",

  logoBtn: "logoBtn",
  refreshBtn: "refreshBtn",
  refreshWorkspaceBtn: "refreshWorkspaceBtn",
  goHomeBtn: "goHomeBtn",
  changePersonBtn: "changePersonBtn",

  themeToggleBtn: "themeToggleBtn",
  nightShiftModeBtn: "nightShiftModeBtn",

  scopeSwitch: "scopeSwitch",
  scopeChildBtn: "scopeChildBtn",
  scopeHomeBtn: "scopeHomeBtn",
  scopeQualityBtn: "scopeQualityBtn",
  scopeOfstedBtn: "scopeOfstedBtn",

  homeSearchInput: "homeSearchInput",
  homeSelect: "homeSelect",
  homeChipList: "homeChipList",
  selectedHomeSummary: "selectedHomeSummary",

  selectorList: "selectorList",
  selectorSearch: "selectorSearch",
  youngPersonSearchInput: "youngPersonSearchInput",
  youngPersonSelect: "youngPersonSelect",
  selectorRefreshBtn: "selectorRefreshBtn",
  selectedChildSummary: "selectedChildSummary",

  launchReadyHome: "launchReadyHome",
  launchReadyChild: "launchReadyChild",
  launchLastRefreshed: "launchLastRefreshed",
  launchOpenCareHubBtn: "launchOpenCareHubBtn",

  openCareHubBtn: "openCareHubBtn",
  clearSafeStartBtn: "clearSafeStartBtn",
  safeStartReadySummary: "safeStartReadySummary",
  readyHomeName: "readyHomeName",
  readyChildName: "readyChildName",

  welcomePanel: "welcomePanel",
  welcomeMessage: "welcomeMessage",
  welcomeSubMessage: "welcomeSubMessage",

  recordSearchInput: "recordSearchInput",
  mobileRecordSearchInput: "mobileRecordSearchInput",
  recordTypeFilter: "recordTypeFilter",
  globalSearchForm: "globalSearchForm",
  mobileSearchForm: "mobileSearchForm",

  workspaceEyebrow: "workspaceEyebrow",
  pageTitle: "pageTitle",
  pageSubtitle: "pageSubtitle",

  personAvatar: "personAvatar",
  personName: "personName",
  personMeta: "personMeta",
  personSummaryChips: "personSummaryChips",

  mobilePersonAvatar: "mobilePersonAvatar",
  mobilePersonName: "mobilePersonName",
  mobilePersonMeta: "mobilePersonMeta",
  mobileHomeBtn: "mobileHomeBtn",

  mobileDrawerPersonName: "mobileDrawerPersonName",
  mobileDrawerPersonMeta: "mobileDrawerPersonMeta",

  heroAssistantBtn: "heroAssistantBtn",
  safeStartAskAssistantBtn: "safeStartAskAssistantBtn",
  assistantLauncher: "assistantLauncher",

  profileOpenBtn: "profileOpenBtn",
  profilePhotoUploadBtn: "profilePhotoUploadBtn",

  osSidebar: "osSidebar",
  journeyRail: "journeyRail",
  recordQuickDock: "recordQuickDock",
  priorityDock: "priorityDock",
  quickCreateBar: "quickCreateBar",
  heroQuickActions: "heroQuickActions",

  therapeuticPromptPanel: "therapeuticPromptPanel",
  dismissTherapeuticPromptBtn: "dismissTherapeuticPromptBtn",

  workspaceSummaryStrip: "workspaceSummaryStrip",
  summaryToday: "summaryToday",
  summaryNextEvent: "summaryNextEvent",
  summaryLastRecord: "summaryLastRecord",
  summaryOpenActions: "summaryOpenActions",

  searchResultsRegion: "searchResultsRegion",
  searchResultsTitle: "searchResultsTitle",
  searchResultsList: "searchResultsList",
  clearSearchResultsBtn: "clearSearchResultsBtn",

  mobileNavToggle: "mobileNavToggle",
  mobileNavPanel: "mobileNavPanel",
  mobileNavDrawer: "mobileNavPanel",
  mobileNavBackdrop: "mobileNavBackdrop",
  closeMobileNavBtn: "closeMobileNavBtn",
  mobileNavContent: "mobileNavContent",
  mobileBottomNav: "mobileBottomNav",
  mobileBottomBar: "mobileBottomNav",

  fullscreenPanel: "fullscreenPanel",
  fullscreenPanelTitle: "fullscreenPanelTitle",
  fullscreenPanelSubtitle: "fullscreenPanelSubtitle",
  fullscreenPanelActions: "fullscreenPanelActions",
  fullscreenPanelBody: "fullscreenPanelBody",
  closeFullscreenPanelBtn: "closeFullscreenPanelBtn",

  recordComposerPage: "recordComposerPage",
  composerPanel: "recordComposerPage",
  composerTitle: "composerTitle",
  composerSubtitle: "composerSubtitle",
  recordComposerForm: "recordComposerForm",
  recordComposerFields: "recordComposerFields",
  composerGuidanceText: "composerGuidanceText",
  composerPrompts: "composerPrompts",
  composerAiFeedback: "composerAiFeedback",
  autosaveStatus: "autosaveStatus",
  autosaveTime: "autosaveTime",
  composerSaveBtn: "composerSaveBtn",
  composerSaveDraftBtn: "composerSaveDraftBtn",
  composerCheckBtn: "composerCheckBtn",
  composerSubmitBtn: "composerSubmitBtn",
  composerSpeechBtn: "composerSpeechBtn",
  composerTherapeuticModeBtn: "composerTherapeuticModeBtn",
  composerGrammarBtn: "composerGrammarBtn",
  composerClarityBtn: "composerClarityBtn",
  composerSafeguardingBtn: "composerSafeguardingBtn",
  composerChildVoiceBtn: "composerChildVoiceBtn",
  composerLanguageBtn: "composerLanguageBtn",

  assistantBackdrop: "assistantBackdrop",
  assistantModal: "assistantModal",
  assistantMessages: "assistantMessages",
  assistantForm: "assistantForm",
  assistantInput: "assistantInput",
  assistantSendBtn: "assistantSendBtn",
  assistantVoiceBtn: "assistantVoiceBtn",
  assistantClearBtn: "assistantClearBtn",
  closeAssistantBtn: "closeAssistantBtn",

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

function firstDefinedElement(...items) {
  return items.find(Boolean) || null;
}

function buildEls() {
  const resolved = {};

  Object.entries(DOM_KEYS).forEach(([key, id]) => {
    resolved[key] = byId(id);
  });

  resolved.selectorPanel = firstDefinedElement(resolved.selectorPanel, resolved.selectorScreen);
  resolved.selectorScreen = firstDefinedElement(resolved.selectorScreen, resolved.selectorPanel);

  resolved.workspacePanel = firstDefinedElement(resolved.workspacePanel, resolved.workspaceScreen);
  resolved.workspaceScreen = firstDefinedElement(resolved.workspaceScreen, resolved.workspacePanel);

  resolved.mobileNavDrawer = firstDefinedElement(resolved.mobileNavDrawer, resolved.mobileNavPanel);
  resolved.mobileNavPanel = firstDefinedElement(resolved.mobileNavPanel, resolved.mobileNavDrawer);

  resolved.mobileBottomBar = firstDefinedElement(resolved.mobileBottomBar, resolved.mobileBottomNav);
  resolved.mobileBottomNav = firstDefinedElement(resolved.mobileBottomNav, resolved.mobileBottomBar);

  resolved.composerPanel = firstDefinedElement(resolved.composerPanel, resolved.recordComposerPage);
  resolved.recordComposerPage = firstDefinedElement(resolved.recordComposerPage, resolved.composerPanel);

  resolved.composerForm = resolved.recordComposerForm;
  resolved.composerFields = resolved.recordComposerFields;

  resolved.drawer = resolved.recordDrawer;
  resolved.drawerBackdrop = resolved.recordDrawerBackdrop;
  resolved.drawerTitle = resolved.recordDrawerTitle;
  resolved.drawerSubtitle = resolved.recordDrawerSubtitle;
  resolved.drawerBody = resolved.recordDrawerBody;
  resolved.drawerActions = resolved.recordDrawerActions;
  resolved.closeDrawerBtn = resolved.closeRecordDrawerBtn;

  resolved.workspaceTitle = resolved.pageTitle;
  resolved.workspaceSubtitle = resolved.pageSubtitle;
  resolved.workspaceBody = resolved.viewContent;

  resolved.sectionNav = firstDefinedElement(
    resolved.heroQuickActions,
    resolved.mobileNavContent
  );

  resolved.assistantPanel = resolved.assistantModal;
  resolved.assistantBody = resolved.assistantMessages;

  resolved.youngPersonSelector = firstDefinedElement(
    resolved.youngPersonSelect,
    resolved.selectorList
  );

  resolved.assistantComposer = resolved.assistantForm;
  resolved.assistantSend = resolved.assistantSendBtn;

  resolved.workspaceRoot = firstDefinedElement(
    resolved.workspacePanel,
    resolved.workspaceScreen,
    resolved.workspaceShell
  );

  resolved.youngPeopleRoot = firstDefinedElement(
    resolved.mainContent,
    resolved.workspacePanel
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
    "workspacePanel",
    "selectorPanel",
    "viewContent",
    "homeSelect",
    "youngPersonSelect",
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
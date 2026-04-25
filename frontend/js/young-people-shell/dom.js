function byId(id) {
  return document.getElementById(id);
}

const DOM_KEYS = {
  /* --------------------------------
     App shell
  --------------------------------- */
  app: "app",
  mainContent: "mainContent",
  workspaceScreen: "workspacePanel",
  workspaceShell: "workspaceShell",
  selectorScreen: "selectorPanel",
  viewContent: "viewContent",
  statusBar: "statusBar",
  statusMessage: "statusMessage",

  /* --------------------------------
     Top bar
  --------------------------------- */
  logoBtn: "logoBtn",
  mobileNavBtn: "mobileNavBtn",
  mobileNavToggle: "mobileNavToggle",
  refreshBtn: "refreshBtn",
  refreshWorkspaceBtn: "refreshWorkspaceBtn",
  homeBtn: "homeBtn",
  goHomeBtn: "goHomeBtn",
  assistantLauncher: "assistantLauncher",

  globalSearchForm: "globalSearchForm",
  recordSearchInput: "recordSearchInput",
  recordTypeFilter: "recordTypeFilter",

  /* --------------------------------
     Scope switch
  --------------------------------- */
  scopeSwitch: "scopeSwitch",
  scopeChildBtn: "scopeChildBtn",
  scopeHomeBtn: "scopeHomeBtn",
  scopeQualityBtn: "scopeQualityBtn",
  scopeOfstedBtn: "scopeOfstedBtn",

  /* --------------------------------
     Selector
  --------------------------------- */
  selectorList: "selectorList",
  selectorSearch: "selectorSearch",
  youngPersonSearchInput: "youngPersonSearchInput",
  selectorRefreshBtn: "selectorRefreshBtn",
  backToSelectorBtn: "backToSelectorBtn",

  /* --------------------------------
     Workspace person summary
  --------------------------------- */
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

  /* --------------------------------
     Navigation
  --------------------------------- */
  desktopNav: "desktopNav",
  mobileNavContent: "mobileNavContent",
  mobileNavDrawer: "mobileNavDrawer",
  mobileNavPanel: "mobileNavPanel",
  mobileNavBackdrop: "mobileNavBackdrop",
  closeMobileNavBtn: "closeMobileNavBtn",
  mobileBottomBar: "mobileBottomBar",
  mobileBottomNav: "mobileBottomNav",

  /* --------------------------------
     Mobile search
  --------------------------------- */
  mobileSearchForm: "mobileSearchForm",
  mobileRecordSearchInput: "mobileRecordSearchInput",

  /* --------------------------------
     Header / hero
  --------------------------------- */
  workspaceEyebrow: "workspaceEyebrow",
  pageTitle: "pageTitle",
  pageSubtitle: "pageSubtitle",
  heroAssistantBtn: "heroAssistantBtn",
  heroQuickActions: "heroQuickActions",
  quickCreateBar: "quickCreateBar",
  changePersonBtn: "changePersonBtn",
  profileOpenBtn: "profileOpenBtn",
  profilePhotoUploadBtn: "profilePhotoUploadBtn",

  /* --------------------------------
     Workspace summary strip
  --------------------------------- */
  workspaceSummaryStrip: "workspaceSummaryStrip",
  summaryToday: "summaryToday",
  summaryNextEvent: "summaryNextEvent",
  summaryLastRecord: "summaryLastRecord",
  summaryOpenActions: "summaryOpenActions",

  /* --------------------------------
     Profile snapshot
  --------------------------------- */
  profileSnapshotPhotoWrap: "profileSnapshotPhotoWrap",
  profileSnapshotName: "profileSnapshotName",
  profileSnapshotMeta: "profileSnapshotMeta",

  /* --------------------------------
     Search results
  --------------------------------- */
  searchResultsRegion: "searchResultsRegion",
  searchResultsTitle: "searchResultsTitle",
  searchResultsList: "searchResultsList",
  clearSearchResultsBtn: "clearSearchResultsBtn",

  /* --------------------------------
     Assistant
  --------------------------------- */
  assistantBackdrop: "assistantBackdrop",
  assistantModal: "assistantModal",
  closeAssistantBtn: "closeAssistantBtn",

  assistantMessages: "assistantMessages",
  assistantForm: "assistantForm",
  assistantInput: "assistantInput",
  assistantSendBtn: "assistantSendBtn",
  assistantClearBtn: "assistantClearBtn",

  assistantContext: "assistantContext",
  assistantSuggestions: "assistantSuggestions",
  assistantScopeSummary: "assistantScopeSummary",
  assistantActions: "assistantActions",
  assistantSources: "assistantSources",
  assistantRuntime: "assistantRuntime",
  assistantExplainability: "assistantExplainability",

  /* --------------------------------
     Assistant badges
  --------------------------------- */
  scopeBadge: "scopeBadge",
  scopeHomeBadge: "scopeHomeBadge",
  scopeChildBadge: "scopeChildBadge",
  scopeShiftBadge: "scopeShiftBadge",

  /* --------------------------------
     Assistant controller / intelligence panels
  --------------------------------- */
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

  /* --------------------------------
     Fullscreen panel
  --------------------------------- */
  fullscreenPanel: "fullscreenPanel",
  fullscreenPanelTitle: "fullscreenPanelTitle",
  fullscreenPanelSubtitle: "fullscreenPanelSubtitle",
  fullscreenPanelActions: "fullscreenPanelActions",
  closeFullscreenPanelBtn: "closeFullscreenPanelBtn",
  fullscreenPanelBody: "fullscreenPanelBody",

  /* --------------------------------
     Composer
  --------------------------------- */
  composerPanel: "composerPanel",
  recordComposerPage: "recordComposerPage",
  composerTitle: "composerTitle",
  composerSubtitle: "composerSubtitle",
  composerGuidanceText: "composerGuidanceText",
  composerPrompts: "composerPrompts",
  recordComposerForm: "recordComposerForm",
  recordComposerFields: "recordComposerFields",
  composerAiFeedback: "composerAiFeedback",
  composerAutosaveStatus: "composerAutosaveStatus",
  autosaveStatus: "autosaveStatus",
  autosaveTime: "autosaveTime",
  closeComposerBtn: "closeComposerBtn",
  composerSaveBtn: "composerSaveBtn",
  composerSaveDraftBtn: "composerSaveDraftBtn",
  composerCheckBtn: "composerCheckBtn",
  composerSubmitBtn: "composerSubmitBtn",
  composerGrammarBtn: "composerGrammarBtn",
  composerClarityBtn: "composerClarityBtn",
  composerSafeguardingBtn: "composerSafeguardingBtn",
  composerChildVoiceBtn: "composerChildVoiceBtn",

  /* --------------------------------
     Record drawer
  --------------------------------- */
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

  /* --------------------------------
     Suggestions
  --------------------------------- */
  suggestionsPanel: "suggestionsPanel",
  suggestionsPanelTitle: "suggestionsPanelTitle",
  suggestionsPanelSubtitle: "suggestionsPanelSubtitle",
  suggestionsPanelBody: "suggestionsPanelBody",
  closeSuggestionsPanelBtn: "closeSuggestionsPanelBtn",
};

function firstDefinedElement(...candidates) {
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return null;
}

function buildEls() {
  const resolved = {};

  Object.entries(DOM_KEYS).forEach(([key, id]) => {
    resolved[key] = byId(id);
  });

  /* --------------------------------
     Compatibility aliases
  --------------------------------- */

  resolved.selectorPanel = firstDefinedElement(
    resolved.selectorScreen,
    byId("selectorPanel"),
    byId("selectorScreen")
  );

  resolved.selectorScreen = firstDefinedElement(
    resolved.selectorScreen,
    resolved.selectorPanel,
    byId("selectorScreen")
  );

  resolved.workspacePanel = firstDefinedElement(
    resolved.workspaceScreen,
    byId("workspacePanel"),
    byId("workspaceScreen")
  );

  resolved.workspaceScreen = firstDefinedElement(
    resolved.workspaceScreen,
    resolved.workspacePanel,
    byId("workspaceScreen")
  );

  resolved.mobileNavBtn = firstDefinedElement(
    resolved.mobileNavBtn,
    resolved.mobileNavToggle
  );

  resolved.mobileNavToggle = firstDefinedElement(
    resolved.mobileNavToggle,
    resolved.mobileNavBtn
  );

  resolved.mobileNavDrawer = firstDefinedElement(
    resolved.mobileNavDrawer,
    resolved.mobileNavPanel
  );

  resolved.mobileNavPanel = firstDefinedElement(
    resolved.mobileNavPanel,
    resolved.mobileNavDrawer
  );

  resolved.mobileBottomBar = firstDefinedElement(
    resolved.mobileBottomBar,
    resolved.mobileBottomNav
  );

  resolved.mobileBottomNav = firstDefinedElement(
    resolved.mobileBottomNav,
    resolved.mobileBottomBar
  );

  resolved.homeBtn = firstDefinedElement(
    resolved.homeBtn,
    resolved.goHomeBtn
  );

  resolved.goHomeBtn = firstDefinedElement(
    resolved.goHomeBtn,
    resolved.homeBtn
  );

  resolved.composerPanel = firstDefinedElement(
    resolved.composerPanel,
    resolved.recordComposerPage
  );

  resolved.recordComposerPage = firstDefinedElement(
    resolved.recordComposerPage,
    resolved.composerPanel
  );

  resolved.composerForm = resolved.recordComposerForm;
  resolved.composerFields = resolved.recordComposerFields;

  resolved.drawer = resolved.recordDrawer;
  resolved.drawerBackdrop = resolved.recordDrawerBackdrop;
  resolved.drawerTitle = resolved.recordDrawerTitle;
  resolved.drawerSubtitle = resolved.recordDrawerSubtitle;
  resolved.drawerBody = resolved.recordDrawerBody;
  resolved.drawerActions = resolved.recordDrawerActions;
  resolved.closeDrawerBtn = resolved.closeRecordDrawerBtn;

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

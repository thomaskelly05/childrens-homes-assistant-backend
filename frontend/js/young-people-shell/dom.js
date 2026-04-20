function byId(id) {
  return document.getElementById(id);
}

export const els = {
  /* --------------------------------
     App shell
  --------------------------------- */
  app: byId("app"),
  mainContent: byId("mainContent"),
  workspaceScreen: byId("workspaceScreen"),
  workspaceShell: byId("workspaceShell"),
  selectorScreen: byId("selectorScreen"),
  viewContent: byId("viewContent"),
  statusBar: byId("statusBar"),
  statusMessage: byId("statusMessage"),

  /* --------------------------------
     Top bar
  --------------------------------- */
  logoBtn: byId("logoBtn"),
  mobileNavBtn: byId("mobileNavBtn"),
  refreshBtn: byId("refreshBtn"),
  refreshWorkspaceBtn: byId("refreshWorkspaceBtn"),
  homeBtn: byId("homeBtn"),
  assistantLauncher: byId("assistantLauncher"),

  globalSearchForm: byId("globalSearchForm"),
  recordSearchInput: byId("recordSearchInput"),
  recordTypeFilter: byId("recordTypeFilter"),

  /* --------------------------------
     Scope switch
  --------------------------------- */
  scopeSwitch: byId("scopeSwitch"),
  scopeChildBtn: byId("scopeChildBtn"),
  scopeHomeBtn: byId("scopeHomeBtn"),
  scopeQualityBtn: byId("scopeQualityBtn"),
  scopeOfstedBtn: byId("scopeOfstedBtn"),

  /* --------------------------------
     Selector
  --------------------------------- */
  selectorList: byId("selectorList"),
  selectorSearch: byId("selectorSearch"),
  youngPersonSearchInput: byId("youngPersonSearchInput"),
  selectorRefreshBtn: byId("selectorRefreshBtn"),
  backToSelectorBtn: byId("backToSelectorBtn"),

  /* --------------------------------
     Workspace person summary
  --------------------------------- */
  personAvatar: byId("personAvatar"),
  personName: byId("personName"),
  personMeta: byId("personMeta"),

  mobilePersonAvatar: byId("mobilePersonAvatar"),
  mobilePersonName: byId("mobilePersonName"),
  mobilePersonMeta: byId("mobilePersonMeta"),
  mobileHomeBtn: byId("mobileHomeBtn"),

  mobileDrawerPersonName: byId("mobileDrawerPersonName"),
  mobileDrawerPersonMeta: byId("mobileDrawerPersonMeta"),

  /* --------------------------------
     Navigation
  --------------------------------- */
  desktopNav: byId("desktopNav"),
  mobileNavContent: byId("mobileNavContent"),
  mobileNavDrawer: byId("mobileNavDrawer"),
  mobileNavBackdrop: byId("mobileNavBackdrop"),
  closeMobileNavBtn: byId("closeMobileNavBtn"),
  mobileBottomBar: byId("mobileBottomBar"),

  /* --------------------------------
     Mobile search
  --------------------------------- */
  mobileSearchForm: byId("mobileSearchForm"),
  mobileRecordSearchInput: byId("mobileRecordSearchInput"),

  /* --------------------------------
     Header / hero
  --------------------------------- */
  workspaceEyebrow: byId("workspaceEyebrow"),
  pageTitle: byId("pageTitle"),
  pageSubtitle: byId("pageSubtitle"),
  heroAssistantBtn: byId("heroAssistantBtn"),
  heroQuickActions: byId("heroQuickActions"),
  quickCreateBar: byId("quickCreateBar"),
  changePersonBtn: byId("changePersonBtn"),
  profileOpenBtn: byId("profileOpenBtn"),
  profilePhotoUploadBtn: byId("profilePhotoUploadBtn"),

  /* --------------------------------
     Workspace summary strip
  --------------------------------- */
  workspaceSummaryStrip: byId("workspaceSummaryStrip"),
  summaryToday: byId("summaryToday"),
  summaryNextEvent: byId("summaryNextEvent"),
  summaryLastRecord: byId("summaryLastRecord"),
  summaryOpenActions: byId("summaryOpenActions"),

  /* --------------------------------
     Profile snapshot
  --------------------------------- */
  profileSnapshotPhotoWrap: byId("profileSnapshotPhotoWrap"),
  profileSnapshotName: byId("profileSnapshotName"),
  profileSnapshotMeta: byId("profileSnapshotMeta"),

  /* --------------------------------
     Search results
  --------------------------------- */
  searchResultsRegion: byId("searchResultsRegion"),
  searchResultsTitle: byId("searchResultsTitle"),
  searchResultsList: byId("searchResultsList"),
  clearSearchResultsBtn: byId("clearSearchResultsBtn"),

  /* --------------------------------
     Assistant
  --------------------------------- */
  assistantBackdrop: byId("assistantBackdrop"),
  assistantModal: byId("assistantModal"),
  closeAssistantBtn: byId("closeAssistantBtn"),

  assistantMessages: byId("assistantMessages"),
  assistantForm: byId("assistantForm"),
  assistantInput: byId("assistantInput"),
  assistantSendBtn: byId("assistantSendBtn"),
  assistantClearBtn: byId("assistantClearBtn"),

  assistantContext: byId("assistantContext"),
  assistantSuggestions: byId("assistantSuggestions"),
  assistantScopeSummary: byId("assistantScopeSummary"),
  assistantActions: byId("assistantActions"),
  assistantSources: byId("assistantSources"),
  assistantRuntime: byId("assistantRuntime"),
  assistantExplainability: byId("assistantExplainability"),

  /* --------------------------------
     Assistant badges
  --------------------------------- */
  scopeBadge: byId("scopeBadge"),
  scopeHomeBadge: byId("scopeHomeBadge"),
  scopeChildBadge: byId("scopeChildBadge"),
  scopeShiftBadge: byId("scopeShiftBadge"),

  /* --------------------------------
     Assistant controller / intelligence panels
  --------------------------------- */
  assistantScopeBundleStatus: byId("assistantScopeBundleStatus"),
  assistantScopeBundleError: byId("assistantScopeBundleError"),
  assistantLiveStatus: byId("assistantLiveStatus"),
  assistantRefreshScopeBtn: byId("assistantRefreshScopeBtn"),
  assistantRefreshAnalysisBtn: byId("assistantRefreshAnalysisBtn"),
  morningBriefBody: byId("morningBriefBody"),
  managerBriefBody: byId("managerBriefBody"),
  qualityBriefBody: byId("qualityBriefBody"),
  liveUpdatesBody: byId("liveUpdatesBody"),
  clearLiveUpdatesBtn: byId("clearLiveUpdatesBtn"),

  /* --------------------------------
     Fullscreen panel
  --------------------------------- */
  fullscreenPanel: byId("fullscreenPanel"),
  fullscreenPanelTitle: byId("fullscreenPanelTitle"),
  fullscreenPanelSubtitle: byId("fullscreenPanelSubtitle"),
  fullscreenPanelActions: byId("fullscreenPanelActions"),
  closeFullscreenPanelBtn: byId("closeFullscreenPanelBtn"),
  fullscreenPanelBody: byId("fullscreenPanelBody"),

  /* --------------------------------
     Composer
  --------------------------------- */
  composerPanel: byId("composerPanel"),
  composerTitle: byId("composerTitle"),
  composerSubtitle: byId("composerSubtitle"),
  composerGuidanceText: byId("composerGuidanceText"),
  composerPrompts: byId("composerPrompts"),
  recordComposerForm: byId("recordComposerForm"),
  recordComposerFields: byId("recordComposerFields"),
  composerAiFeedback: byId("composerAiFeedback"),
  composerAutosaveStatus: byId("composerAutosaveStatus"),
  closeComposerBtn: byId("closeComposerBtn"),
  composerSaveBtn: byId("composerSaveBtn"),
  composerSaveDraftBtn: byId("composerSaveDraftBtn"),
  composerCheckBtn: byId("composerCheckBtn"),
  composerSubmitBtn: byId("composerSubmitBtn"),
  composerGrammarBtn: byId("composerGrammarBtn"),
  composerClarityBtn: byId("composerClarityBtn"),
  composerSafeguardingBtn: byId("composerSafeguardingBtn"),
  composerChildVoiceBtn: byId("composerChildVoiceBtn"),

  /* backward-compatible composer aliases */
  composerForm: byId("recordComposerForm"),
  composerFields: byId("recordComposerFields"),

  /* --------------------------------
     Record drawer
  --------------------------------- */
  recordDrawer: byId("recordDrawer"),
  recordDrawerBackdrop: byId("recordDrawerBackdrop"),
  recordDrawerTitle: byId("recordDrawerTitle"),
  recordDrawerSubtitle: byId("recordDrawerSubtitle"),
  recordDrawerBody: byId("recordDrawerBody"),
  recordDrawerActions: byId("recordDrawerActions"),
  closeRecordDrawerBtn: byId("closeRecordDrawerBtn"),
  drawerEditBtn: byId("drawerEditBtn"),
  drawerSubmitBtn: byId("drawerSubmitBtn"),
  drawerApproveBtn: byId("drawerApproveBtn"),
  drawerReturnBtn: byId("drawerReturnBtn"),
  drawerArchiveBtn: byId("drawerArchiveBtn"),

  /* backward-compatible drawer aliases */
  drawer: byId("recordDrawer"),
  drawerBackdrop: byId("recordDrawerBackdrop"),
  drawerTitle: byId("recordDrawerTitle"),
  drawerSubtitle: byId("recordDrawerSubtitle"),
  drawerBody: byId("recordDrawerBody"),
  drawerActions: byId("recordDrawerActions"),
  closeDrawerBtn: byId("closeRecordDrawerBtn"),

  /* --------------------------------
     Suggestions
  --------------------------------- */
  suggestionsPanel: byId("suggestionsPanel"),
  suggestionsPanelTitle: byId("suggestionsPanelTitle"),
  suggestionsPanelSubtitle: byId("suggestionsPanelSubtitle"),
  suggestionsPanelBody: byId("suggestionsPanelBody"),
  closeSuggestionsPanelBtn: byId("closeSuggestionsPanelBtn"),
};

export function getEl(id) {
  return byId(id);
}

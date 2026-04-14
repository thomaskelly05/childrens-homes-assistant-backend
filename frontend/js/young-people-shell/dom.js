export const els = {
  // App shell
  app: document.getElementById("app"),
  mainContent: document.getElementById("mainContent"),
  workspaceScreen: document.getElementById("workspaceScreen"),
  workspaceShell: document.getElementById("workspaceShell"),
  selectorScreen: document.getElementById("selectorScreen"),
  viewContent: document.getElementById("viewContent"),
  statusBar: document.getElementById("statusBar"),
  statusMessage: document.getElementById("statusMessage"),

  // Top bar
  logoBtn: document.getElementById("logoBtn"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  homeBtn: document.getElementById("homeBtn"),
  assistantLauncher: document.getElementById("assistantLauncher"),

  // Scope switch
  scopeSwitch: document.getElementById("scopeSwitch"),
  scopeChildBtn: document.getElementById("scopeChildBtn"),
  scopeHomeBtn: document.getElementById("scopeHomeBtn"),
  scopeQualityBtn: document.getElementById("scopeQualityBtn"),

  // Selector
  selectorList: document.getElementById("selectorList"),
  selectorSearch: document.getElementById("selectorSearch"),
  selectorRefreshBtn: document.getElementById("selectorRefreshBtn"),
  backToSelectorBtn: document.getElementById("backToSelectorBtn"),

  // Workspace person summary
  personAvatar: document.getElementById("personAvatar"),
  personName: document.getElementById("personName"),
  personMeta: document.getElementById("personMeta"),

  mobilePersonAvatar: document.getElementById("mobilePersonAvatar"),
  mobilePersonName: document.getElementById("mobilePersonName"),
  mobilePersonMeta: document.getElementById("mobilePersonMeta"),
  mobileHomeBtn: document.getElementById("mobileHomeBtn"),

  mobileDrawerPersonName: document.getElementById("mobileDrawerPersonName"),
  mobileDrawerPersonMeta: document.getElementById("mobileDrawerPersonMeta"),

  // Navigation
  desktopNav: document.getElementById("desktopNav"),
  mobileNavContent: document.getElementById("mobileNavContent"),
  mobileNavDrawer: document.getElementById("mobileNavDrawer"),
  mobileNavBackdrop: document.getElementById("mobileNavBackdrop"),
  closeMobileNavBtn: document.getElementById("closeMobileNavBtn"),
  mobileBottomBar: document.getElementById("mobileBottomBar"),

  // Header / hero
  workspaceEyebrow: document.getElementById("workspaceEyebrow"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  heroAssistantBtn: document.getElementById("heroAssistantBtn"),
  heroQuickActions: document.getElementById("heroQuickActions"),
  changePersonBtn: document.getElementById("changePersonBtn"),
  profileOpenBtn: document.getElementById("profileOpenBtn"),
  profilePhotoUploadBtn: document.getElementById("profilePhotoUploadBtn"),

  // Workspace summary strip
  workspaceSummaryStrip: document.getElementById("workspaceSummaryStrip"),
  summaryToday: document.getElementById("summaryToday"),
  summaryNextEvent: document.getElementById("summaryNextEvent"),
  summaryLastRecord: document.getElementById("summaryLastRecord"),
  summaryOpenActions: document.getElementById("summaryOpenActions"),

  // Profile snapshot
  profileSnapshotPhotoWrap: document.getElementById("profileSnapshotPhotoWrap"),
  profileSnapshotName: document.getElementById("profileSnapshotName"),
  profileSnapshotMeta: document.getElementById("profileSnapshotMeta"),

  // Assistant
  assistantBackdrop: document.getElementById("assistantBackdrop"),
  assistantModal: document.getElementById("assistantModal"),
  closeAssistantBtn: document.getElementById("closeAssistantBtn"),

  assistantMessages: document.getElementById("assistantMessages"),
  assistantForm: document.getElementById("assistantForm"),
  assistantInput: document.getElementById("assistantInput"),
  assistantSendBtn: document.getElementById("assistantSendBtn"),
  assistantClearBtn: document.getElementById("assistantClearBtn"),

  assistantContext: document.getElementById("assistantContext"),
  assistantSuggestions: document.getElementById("assistantSuggestions"),
  assistantScopeSummary: document.getElementById("assistantScopeSummary"),
  assistantActions: document.getElementById("assistantActions"),
  assistantSources: document.getElementById("assistantSources"),
  assistantRuntime: document.getElementById("assistantRuntime"),
  assistantExplainability: document.getElementById("assistantExplainability"),

  // Assistant badges
  scopeBadge: document.getElementById("scopeBadge"),
  scopeHomeBadge: document.getElementById("scopeHomeBadge"),
  scopeChildBadge: document.getElementById("scopeChildBadge"),
  scopeShiftBadge: document.getElementById("scopeShiftBadge"),

  // Assistant hidden compatibility nodes
  assistantModalMessages: document.getElementById("assistantModalMessages"),
  assistantModalForm: document.getElementById("assistantModalForm"),
  assistantModalInput: document.getElementById("assistantModalInput"),
  assistantModalSendBtn: document.getElementById("assistantModalSendBtn"),
  assistantModalScopeSummary: document.getElementById("assistantModalScopeSummary"),
  assistantModalSources: document.getElementById("assistantModalSources"),
  modalScopeHomeBadge: document.getElementById("modalScopeHomeBadge"),
  modalScopeChildBadge: document.getElementById("modalScopeChildBadge"),

  // Fullscreen panel
  fullscreenPanel: document.getElementById("fullscreenPanel"),
  fullscreenPanelTitle: document.getElementById("fullscreenPanelTitle"),
  fullscreenPanelSubtitle: document.getElementById("fullscreenPanelSubtitle"),
  fullscreenPanelActions: document.getElementById("fullscreenPanelActions"),
  closeFullscreenPanelBtn: document.getElementById("closeFullscreenPanelBtn"),
  fullscreenPanelBody: document.getElementById("fullscreenPanelBody"),

  // Composer
  composerPanel: document.getElementById("composerPanel"),
  composerTitle: document.getElementById("composerTitle"),
  composerSubtitle: document.getElementById("composerSubtitle"),
  composerGuidanceText: document.getElementById("composerGuidanceText"),
  composerPrompts: document.getElementById("composerPrompts"),
  recordComposerForm: document.getElementById("recordComposerForm"),
  recordComposerFields: document.getElementById("recordComposerFields"),
  composerAiFeedback: document.getElementById("composerAiFeedback"),
  composerAutosaveStatus: document.getElementById("composerAutosaveStatus"),
  closeComposerBtn: document.getElementById("closeComposerBtn"),
  composerSaveDraftBtn: document.getElementById("composerSaveDraftBtn"),
  composerCheckBtn: document.getElementById("composerCheckBtn"),
  composerSubmitBtn: document.getElementById("composerSubmitBtn"),
  composerGrammarBtn: document.getElementById("composerGrammarBtn"),
  composerClarityBtn: document.getElementById("composerClarityBtn"),
  composerSafeguardingBtn: document.getElementById("composerSafeguardingBtn"),
  composerChildVoiceBtn: document.getElementById("composerChildVoiceBtn"),

  // Backward-compatible composer aliases
  composerForm: document.getElementById("recordComposerForm"),
  composerFields: document.getElementById("recordComposerFields"),

  // Record drawer
  drawer: document.getElementById("recordDrawer"),
  drawerBackdrop: document.getElementById("recordDrawerBackdrop"),
  drawerTitle: document.getElementById("recordDrawerTitle"),
  drawerSubtitle: document.getElementById("recordDrawerSubtitle"),
  drawerBody: document.getElementById("recordDrawerBody"),
  drawerActions: document.getElementById("recordDrawerActions"),
  closeDrawerBtn: document.getElementById("closeRecordDrawerBtn"),
  drawerEditBtn: document.getElementById("drawerEditBtn"),
  drawerSubmitBtn: document.getElementById("drawerSubmitBtn"),
  drawerApproveBtn: document.getElementById("drawerApproveBtn"),
  drawerReturnBtn: document.getElementById("drawerReturnBtn"),
  drawerArchiveBtn: document.getElementById("drawerArchiveBtn"),

  // Suggestions
  suggestionsPanel: document.getElementById("suggestionsPanel"),
  suggestionsPanelTitle: document.getElementById("suggestionsPanelTitle"),
  suggestionsPanelSubtitle: document.getElementById("suggestionsPanelSubtitle"),
  suggestionsPanelBody: document.getElementById("suggestionsPanelBody"),
  closeSuggestionsPanelBtn: document.getElementById("closeSuggestionsPanelBtn"),

  // Filters
  recordSearchInput: document.getElementById("recordSearchInput"),
  recordTypeFilter: document.getElementById("recordTypeFilter"),
}
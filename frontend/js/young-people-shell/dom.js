export const els = {
  // Shell / layout
  app: document.getElementById("app"),
  workspaceScreen: document.getElementById("workspaceScreen"),
  workspaceShell: document.getElementById("workspaceShell"),
  selectorScreen: document.getElementById("selectorScreen"),
  viewContent: document.getElementById("viewContent"),
  statusBar: document.getElementById("statusBar"),
  statusMessage: document.getElementById("statusMessage"),

  // Top bar / shell controls
  logoBtn: document.getElementById("logoBtn"),
  mobileNavBtn: document.getElementById("mobileNavBtn"),
  assistantLauncher: document.getElementById("assistantLauncher"),
  refreshBtn: document.getElementById("refreshBtn"),
  refreshWorkspaceBtn: document.getElementById("refreshWorkspaceBtn"),
  homeBtn: document.getElementById("homeBtn"),

  // Scope switch
  scopeSwitch: document.getElementById("scopeSwitch"),
  scopeChildBtn: document.getElementById("scopeChildBtn"),
  scopeHomeBtn: document.getElementById("scopeHomeBtn"),
  scopeQualityBtn: document.getElementById("scopeQualityBtn"),

  // Selector
  selectorList: document.getElementById("selectorList"),
  selectorSearch: document.getElementById("selectorSearch"),
  youngPersonSearchInput: document.getElementById("youngPersonSearchInput"),
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
  quickCreateBar: document.getElementById("quickCreateBar"),

  // Workspace summary strip
  summaryToday: document.getElementById("summaryToday"),
  summaryNextEvent: document.getElementById("summaryNextEvent"),
  summaryLastRecord: document.getElementById("summaryLastRecord"),
  summaryOpenActions: document.getElementById("summaryOpenActions"),

  // Profile snapshot
  profileSnapshotPhotoWrap: document.getElementById("profileSnapshotPhotoWrap"),
  profileSnapshotName: document.getElementById("profileSnapshotName"),
  profileSnapshotMeta: document.getElementById("profileSnapshotMeta"),
  profileOpenBtn: document.getElementById("profileOpenBtn"),
  profilePhotoUploadBtn: document.getElementById("profilePhotoUploadBtn"),
  changePersonBtn: document.getElementById("changePersonBtn"),

  // Assistant shell
  assistantBackdrop: document.getElementById("assistantBackdrop"),
  assistantModal: document.getElementById("assistantModal"),
  assistantLauncherInline: document.getElementById("assistantLauncherInline"),
  assistantExpandBtn: document.getElementById("assistantExpandBtn"),
  closeAssistantBtn: document.getElementById("closeAssistantBtn"),

  // Assistant primary chat
  assistantMessages: document.getElementById("assistantMessages"),
  assistantForm: document.getElementById("assistantForm"),
  assistantInput: document.getElementById("assistantInput"),
  assistantSendBtn: document.getElementById("assistantSendBtn"),
  assistantClearBtn: document.getElementById("assistantClearBtn"),

  // Assistant context / chips / insights
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

  // Modal assistant mirrors / secondary panels
  assistantModalScopeSummary: document.getElementById("assistantModalScopeSummary"),
  assistantModalSources: document.getElementById("assistantModalSources"),
  modalScopeHomeBadge: document.getElementById("modalScopeHomeBadge"),
  modalScopeChildBadge: document.getElementById("modalScopeChildBadge"),

  // Hidden compatibility assistant nodes
  assistantModalMessages: document.getElementById("assistantModalMessages"),
  assistantModalForm: document.getElementById("assistantModalForm"),
  assistantModalInput: document.getElementById("assistantModalInput"),
  assistantModalSendBtn: document.getElementById("assistantModalSendBtn"),

  // Assistant live intelligence / bundle state
  assistantLiveStatus: document.getElementById("assistantLiveStatus"),
  assistantScopeBundleStatus: document.getElementById("assistantScopeBundleStatus"),
  assistantScopeBundleError: document.getElementById("assistantScopeBundleError"),
  assistantRefreshScopeBtn: document.getElementById("assistantRefreshScopeBtn"),
  assistantRefreshAnalysisBtn: document.getElementById("assistantRefreshAnalysisBtn"),

  // Morning / manager / quality brief surfaces
  morningBriefPanel: document.getElementById("morningBriefPanel"),
  morningBriefBody: document.getElementById("morningBriefBody"),
  managerBriefPanel: document.getElementById("managerBriefPanel"),
  managerBriefBody: document.getElementById("managerBriefBody"),
  qualityBriefPanel: document.getElementById("qualityBriefPanel"),
  qualityBriefBody: document.getElementById("qualityBriefBody"),

  // Live updates surface
  liveUpdatesPanel: document.getElementById("liveUpdatesPanel"),
  liveUpdatesBody: document.getElementById("liveUpdatesBody"),
  clearLiveUpdatesBtn: document.getElementById("clearLiveUpdatesBtn"),

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
  composerSaveBtn: document.getElementById("composerSaveBtn"),
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
};
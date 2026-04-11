function byId(id) {
  return document.getElementById(id);
}

export const els = {
  app: byId("app"),

  // selector
  selectorScreen: byId("selectorScreen"),
  selectorSearch: byId("selectorSearch"),
  selectorRefreshBtn: byId("selectorRefreshBtn"),
  selectorList: byId("selectorList"),

  // workspace shell
  workspaceScreen: byId("workspaceScreen"),
  homeBtn: byId("homeBtn"),
  mobileHomeBtn: byId("mobileHomeBtn"),
  logoBtn: byId("logoBtn"),
  refreshBtn: byId("refreshBtn"),

  // header / hero
  personAvatar: byId("personAvatar"),
  personName: byId("personName"),
  personMeta: byId("personMeta"),

  mobilePersonAvatar: byId("mobilePersonAvatar"),
  mobilePersonName: byId("mobilePersonName"),
  mobilePersonMeta: byId("mobilePersonMeta"),

  profileSnapshotPhotoWrap: byId("profileSnapshotPhotoWrap"),
  profileSnapshotName: byId("profileSnapshotName"),
  profileSnapshotMeta: byId("profileSnapshotMeta"),
  profileOpenBtn: byId("profileOpenBtn"),
  profilePhotoUploadBtn: byId("profilePhotoUploadBtn"),

  // page header
  pageTitle: byId("pageTitle"),
  pageSubtitle: byId("pageSubtitle"),
  heroQuickActions: byId("heroQuickActions"),
  statusBar: byId("statusBar"),

  // navigation
  desktopNav: byId("desktopNav"),
  mobileNavDrawer: byId("mobileNavDrawer"),
  mobileNavBackdrop: byId("mobileNavBackdrop"),
  mobileNavBtn: byId("mobileNavBtn"),
  closeMobileNavBtn: byId("closeMobileNavBtn"),
  mobileNavContent: byId("mobileNavContent"),
  mobileBottomBar: byId("mobileBottomBar"),

  // main content
  viewContent: byId("viewContent"),

  // assistant inline
  assistantContext: byId("assistantContext"),
  assistantSuggestions: byId("assistantSuggestions"),
  assistantMessages: byId("assistantMessages"),
  assistantForm: byId("assistantForm"),
  assistantInput: byId("assistantInput"),
  assistantSendBtn: byId("assistantSendBtn"),
  assistantLauncher: byId("assistantLauncher"),
  assistantExpandBtn: byId("assistantExpandBtn"),

  // assistant modal
  assistantModal: byId("assistantModal"),
  assistantBackdrop: byId("assistantBackdrop"),
  closeAssistantBtn: byId("closeAssistantBtn"),
  assistantModalMessages: byId("assistantModalMessages"),
  assistantModalForm: byId("assistantModalForm"),
  assistantModalInput: byId("assistantModalInput"),
  assistantModalSendBtn: byId("assistantModalSendBtn"),
  assistantClearBtn: byId("assistantClearBtn"),

  // assistant scope chips
  scopeBadge: byId("scopeBadge"),
  scopeHomeBadge: byId("scopeHomeBadge"),
  scopeChildBadge: byId("scopeChildBadge"),
  scopeShiftBadge: byId("scopeShiftBadge"),
  modalScopeHomeBadge: byId("modalScopeHomeBadge"),
  modalScopeChildBadge: byId("modalScopeChildBadge"),

  // assistant insight panels
  assistantScopeSummary: byId("assistantScopeSummary"),
  assistantActions: byId("assistantActions"),
  assistantSources: byId("assistantSources"),
  assistantRuntime: byId("assistantRuntime"),
  assistantExplainability: byId("assistantExplainability"),
  assistantModalScopeSummary: byId("assistantModalScopeSummary"),
  assistantModalSources: byId("assistantModalSources"),

  // fullscreen panel
  fullscreenPanel: byId("fullscreenPanel"),
  fullscreenPanelTitle: byId("fullscreenPanelTitle"),
  fullscreenPanelSubtitle: byId("fullscreenPanelSubtitle"),
  fullscreenPanelActions: byId("fullscreenPanelActions"),
  fullscreenPanelBody: byId("fullscreenPanelBody"),
  closeFullscreenPanelBtn: byId("closeFullscreenPanelBtn"),

  // composer
  composerPanel: byId("composerPanel"),
  composerTitle: byId("composerTitle"),
  composerSubtitle: byId("composerSubtitle"),
  composerFields: byId("recordComposerFields"),
  composerForm: byId("recordComposerForm"),
  composerGuidanceText: byId("composerGuidanceText"),
  composerPrompts: byId("composerPrompts"),
  composerAiFeedback: byId("composerAiFeedback"),
  composerAutosaveStatus: byId("composerAutosaveStatus"),
  closeComposerBtn: byId("closeComposerBtn"),
  composerSaveDraftBtn: byId("composerSaveDraftBtn"),
  composerCheckBtn: byId("composerCheckBtn"),
  composerSubmitBtn: byId("composerSubmitBtn"),
  composerGrammarBtn: byId("composerGrammarBtn"),
  composerClarityBtn: byId("composerClarityBtn"),
  composerSafeguardingBtn: byId("composerSafeguardingBtn"),
  composerChildVoiceBtn: byId("composerChildVoiceBtn"),

  // record drawer
  drawer: byId("recordDrawer"),
  drawerBackdrop: byId("recordDrawerBackdrop"),
  drawerTitle: byId("recordDrawerTitle"),
  drawerSubtitle: byId("recordDrawerSubtitle"),
  drawerBody: byId("recordDrawerBody"),
  drawerActions: byId("recordDrawerActions"),
  closeDrawerBtn: byId("closeRecordDrawerBtn"),
  drawerEditBtn: byId("drawerEditBtn"),
  drawerSubmitBtn: byId("drawerSubmitBtn"),
  drawerApproveBtn: byId("drawerApproveBtn"),
  drawerReturnBtn: byId("drawerReturnBtn"),
  drawerArchiveBtn: byId("drawerArchiveBtn"),

  // misc actions
  changePersonBtn: byId("changePersonBtn"),
};

export function requireEls(keys = []) {
  const missing = keys.filter((key) => !els[key]);
  if (missing.length) {
    console.warn("[young-people-shell] Missing DOM elements:", missing);
  }
  return missing.length === 0;
}

export function getMissingEls(keys = []) {
  return keys.filter((key) => !els[key]);
}

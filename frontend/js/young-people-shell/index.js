import { state, resetAssistantState, resetComposerState, setYoungPersonId, setYoungPerson, setCurrentView } from "./state.js";
import { els, query, queryAll } from "./dom.js";
import { apiGet, apiSend } from "./api.js";
import {
  showError,
  showMessage,
  clearStatus,
  showSelectorScreen,
  showWorkspaceScreen,
  openMobileNav,
  closeMobileNav,
  openAssistantModal,
  closeAssistantModal,
  openFullscreenPanel,
  closeFullscreenPanel,
  openComposerModal,
  closeComposerModal,
  renderStatusBar,
  renderDesktopNav,
  renderMobileNav,
  renderMobileBottomBar,
  renderYoungPersonHeader,
  renderSelectorList,
  renderAssistantMessages,
  renderAssistantInsights,
  renderAssistantContext,
  renderPageHeader,
  renderHeroActions,
  setViewLoading,
  setViewEmpty,
} from "./ui.js";
import {
  VIEW_CONFIG,
  loadCurrentView,
  loadOverviewView,
  loadProfileView,
  loadDailyNotesView,
  loadIncidentsView,
  loadPlansView,
  loadAppointmentsView,
  loadHealthView,
  loadEducationView,
  loadFamilyView,
  loadKeyworkView,
  loadTimelineView,
  loadHandoverView,
  loadReportsView,
  loadComplianceView,
  loadCalendarView,
  loadManagerView,
} from "./views.js";
import {
  normaliseRecordType,
  openRecordDetail,
  bindDynamicRecordRows,
  runRecordWorkflowAction,
} from "./records.js";
import {
  askAssistant,
  updateAssistantContextFromState,
  renderAssistantScopeBadges,
} from "./assistant.js";
import {
  openComposerFor,
  saveComposer,
  buildAiFeedback,
  bindComposerAutosave,
  flushComposerAutosave,
} from "./composer.js";

const VIEW_LOADERS = {
  overview: loadOverviewView,
  profile: loadProfileView,
  daily_notes: loadDailyNotesView,
  incidents: loadIncidentsView,
  plans: loadPlansView,
  appointments: loadAppointmentsView,
  health: loadHealthView,
  education: loadEducationView,
  family: loadFamilyView,
  keywork: loadKeyworkView,
  timeline: loadTimelineView,
  handover: loadHandoverView,
  reports: loadReportsView,
  compliance: loadComplianceView,
  calendar: loadCalendarView,
  manager: loadManagerView,
};

function getYoungPersonIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("young_person_id");
  return id ? Number(id) : null;
}

function updateUrlForYoungPerson(id = null) {
  const url = new URL(window.location.href);

  if (id) {
    url.searchParams.set("id", String(id));
  } else {
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
  }

  window.history.replaceState({}, "", url.toString());
}

function getDisplayName(item = {}) {
  return [
    item.first_name,
    item.last_name,
  ].filter(Boolean).join(" ").trim() || item.preferred_name || item.name || "Young person";
}

function getSelectorSearchTerm() {
  return String(els.selectorSearch?.value || "").trim().toLowerCase();
}

function filterSelectorItems(items = []) {
  const term = getSelectorSearchTerm();
  if (!term) return items;

  return items.filter((item) => {
    const haystack = [
      item.first_name,
      item.last_name,
      item.preferred_name,
      item.home_name,
      item.current_status,
      item.summary_risk_level,
      item.placement_status,
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(term);
  });
}

function rerenderShellChrome() {
  renderDesktopNav(state.currentView);
  renderMobileNav(state.currentView);
  renderMobileBottomBar(state.currentView);
  renderPageHeader(state.currentView);
  renderYoungPersonHeader(state.youngPerson);
  renderHeroActions(state.youngPerson, state.currentView);
  renderAssistantScopeBadges();
  renderAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
}

function resetWorkspaceStateForSelector() {
  setYoungPersonId(null);
  setYoungPerson(null);
  setCurrentView("overview");
  state.activeRecordItem = null;
  state.activeRecordType = null;
  state.mobileNavOpen = false;
  resetAssistantState();
  resetComposerState();
}

async function loadYoungPersonSelector() {
  clearStatus();
  showSelectorScreen();
  renderStatusBar();
  renderSelectorList([], { loading: true });

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(filterSelectorItems(state.selectorItems), { loading: false });
  } catch (error) {
    showError(error.message || "Unable to load young people.");
    renderSelectorList([], { loading: false, emptyMessage: "Unable to load young people." });
  }
}

async function loadYoungPersonHeaderOnly() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const yp = data.young_person || data.bundle?.young_person || data || {};
  setYoungPerson(yp);
  rerenderShellChrome();
}

async function loadViewByKey(viewKey) {
  const nextView = VIEW_CONFIG[viewKey] ? viewKey : "overview";
  setCurrentView(nextView);
  rerenderShellChrome();

  const loader = VIEW_LOADERS[nextView];
  if (!loader) {
    setViewEmpty("Unknown view.");
    return;
  }

  clearStatus();

  try {
    await loader();
    bindDynamicRecordRows();
  } catch (error) {
    showError(error.message || "Unable to load this view.");
    setViewEmpty("Unable to load this view.");
  }
}

async function openYoungPersonWorkspace(id) {
  if (!id) return;

  setYoungPersonId(Number(id));
  setCurrentView("overview");
  updateUrlForYoungPerson(id);
  showWorkspaceScreen();

  try {
    await loadYoungPersonHeaderOnly();
    await loadViewByKey("overview");
  } catch (error) {
    showError(error.message || "Failed to open workspace.");
    await goHomeToSelector();
  }
}

async function goHomeToSelector() {
  resetWorkspaceStateForSelector();
  updateUrlForYoungPerson(null);
  closeMobileNav();
  closeAssistantModal();
  closeFullscreenPanel();
  closeComposerModal(false);
  rerenderShellChrome();
  await loadYoungPersonSelector();
}

async function refreshCurrentWorkspace() {
  if (!state.youngPersonId) {
    await loadYoungPersonSelector();
    return;
  }

  try {
    await loadYoungPersonHeaderOnly();
    await loadViewByKey(state.currentView);
    showMessage("Workspace refreshed.");
  } catch (error) {
    showError(error.message || "Failed to refresh workspace.");
  }
}

function handleGlobalClick(event) {
  const viewBtn = event.target.closest("[data-view]");
  if (viewBtn) {
    if (!state.youngPersonId) {
      showError("Select a young person first.");
      return;
    }
    closeMobileNav();
    loadViewByKey(viewBtn.dataset.view);
    return;
  }

  const mobileViewBtn = event.target.closest("[data-mobile-view]");
  if (mobileViewBtn) {
    const key = mobileViewBtn.dataset.mobileView;
    if (key === "assistant") {
      openAssistantModal();
      return;
    }
    if (!state.youngPersonId) {
      showError("Select a young person first.");
      return;
    }
    loadViewByKey(key);
    return;
  }

  const openYoungPersonBtn = event.target.closest("[data-open-young-person]");
  if (openYoungPersonBtn) {
    openYoungPersonWorkspace(Number(openYoungPersonBtn.dataset.openYoungPerson));
    return;
  }

  const recordBtn = event.target.closest("[data-open-record]");
  if (recordBtn) {
    try {
      const item = JSON.parse(recordBtn.dataset.openRecord);
      openRecordDetail(item);
    } catch {
      showError("Could not open this record.");
    }
    return;
  }

  const quickActionBtn = event.target.closest("[data-action]");
  if (quickActionBtn) {
    const action = quickActionBtn.dataset.action;
    if (action === "daily-note") openComposerFor("daily_note", "create");
    if (action === "incident") openComposerFor("incident", "create");
    if (action === "plan") openComposerFor("support_plan", "create");
    if (action === "appointment") openComposerFor("appointment", "create");
    return;
  }

  const assistantPromptBtn = event.target.closest("[data-prompt]");
  if (assistantPromptBtn) {
    askAssistant(assistantPromptBtn.dataset.prompt || "");
    return;
  }

  const assistantChipBtn = event.target.closest("[data-assistant-chip]");
  if (assistantChipBtn) {
    const text = assistantChipBtn.dataset.assistantChip || "";
    if (els.assistantInput) els.assistantInput.value = text;
    if (els.assistantModalInput) els.assistantModalInput.value = text;
    return;
  }

  const assistantQuickBtn = event.target.closest("[data-assistant-quick]");
  if (assistantQuickBtn) {
    const action = assistantQuickBtn.dataset.assistantQuick;
    const prompts = {
      handover: "Draft a handover for the next shift for this young person.",
      priorities: "What matters most right now for this young person?",
      voice: "Pull out young person voice themes from recent records.",
      patterns: "Summarise recent patterns and what adults should notice.",
    };
    askAssistant(prompts[action] || "Summarise what matters most right now.");
    return;
  }

  const editableCard = event.target.closest("[data-edit-box]");
  if (editableCard) {
    const box = editableCard.dataset.editBox;
    if (box === "identity") openComposerFor("support_plan", "create");
    if (box === "communication") openComposerFor("support_plan", "create");
    if (box === "education") loadViewByKey("education");
    if (box === "health") loadViewByKey("health");
    if (box === "network") loadViewByKey("family");
    return;
  }

  const workflowBtn = event.target.closest("[data-record-action]");
  if (workflowBtn) {
    const action = workflowBtn.dataset.recordAction;
    runRecordWorkflowAction(action);
    return;
  }
}

function bindTopLevelEvents() {
  document.addEventListener("click", handleGlobalClick);

  els.selectorSearch?.addEventListener("input", () => {
    renderSelectorList(filterSelectorItems(state.selectorItems), { loading: false });
  });

  els.selectorRefreshBtn?.addEventListener("click", loadYoungPersonSelector);

  els.refreshBtn?.addEventListener("click", refreshCurrentWorkspace);

  els.homeBtn?.addEventListener("click", goHomeToSelector);
  els.mobileHomeBtn?.addEventListener("click", goHomeToSelector);

  els.mobileNavBtn?.addEventListener("click", openMobileNav);
  els.closeMobileNavBtn?.addEventListener("click", closeMobileNav);
  els.mobileNavBackdrop?.addEventListener("click", closeMobileNav);

  els.assistantLauncher?.addEventListener("click", openAssistantModal);
  els.assistantExpandBtn?.addEventListener("click", openAssistantModal);
  els.closeAssistantBtn?.addEventListener("click", closeAssistantModal);
  els.assistantBackdrop?.addEventListener("click", closeAssistantModal);

  els.assistantClearBtn?.addEventListener("click", () => {
    resetAssistantState();
    renderAssistantMessages();
    renderAssistantInsights();
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput?.value || "";
    if (els.assistantInput) els.assistantInput.value = "";
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) els.assistantModalInput.value = "";
    await askAssistant(question);
  });

  els.closeFullscreenPanelBtn?.addEventListener("click", closeFullscreenPanel);

  els.closeComposerBtn?.addEventListener("click", () => closeComposerModal(true));

  els.composerSaveDraftBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("draft");
    } catch (error) {
      showError(error.message || "Could not save draft.");
    }
  });

  els.composerSubmitBtn?.addEventListener("click", async () => {
    try {
      await flushComposerAutosave();
      await saveComposer("submit");
    } catch (error) {
      showError(error.message || "Could not submit this form.");
    }
  });

  els.composerCheckBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
    showMessage("Review prompts generated.");
  });

  els.composerGrammarBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("grammar");
  });

  els.composerClarityBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("clarity");
  });

  els.composerSafeguardingBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("safeguarding");
  });

  els.composerChildVoiceBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("child_voice");
  });

  els.profileOpenBtn?.addEventListener("click", () => {
    if (state.youngPersonId) loadViewByKey("profile");
  });

  els.profilePhotoUploadBtn?.addEventListener("click", () => {
    showMessage("Wire this button to your photo upload route.");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
      closeAssistantModal();
      closeFullscreenPanel();
      closeComposerModal(true);
    }
  });

  window.addEventListener("beforeunload", () => {
    flushComposerAutosave();
  });
}

async function boot() {
  bindTopLevelEvents();
  rerenderShellChrome();
  updateAssistantContextFromState();

  const initialId = getYoungPersonIdFromUrl();

  if (!initialId) {
    await loadYoungPersonSelector();
    return;
  }

  setYoungPersonId(initialId);
  showWorkspaceScreen();

  try {
    await loadYoungPersonHeaderOnly();
    await loadViewByKey(state.currentView || "overview");
  } catch (error) {
    showError(error.message || "Failed to load workspace.");
    await goHomeToSelector();
  }
}

boot();

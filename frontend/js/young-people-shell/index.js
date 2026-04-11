// CORE
import { state, resetAssistantState, resetComposerState, setYoungPersonId, setYoungPerson, setCurrentView } from "./state.js";
import { els } from "./dom.js";
import { apiGet } from "../core/api.js";

// UI
import {
  showError,
  showMessage,
  clearStatus,
  showSelectorScreen,
  showWorkspaceScreen,
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
} from "./ui/ui.js";

// FEATURES (views)
import { loadOverview } from "./features/overview.js";
import { loadProfile } from "./features/profile.js";
import { loadTimeline } from "./features/timeline.js";
import { loadHandover } from "./features/handover.js";
import { loadReports } from "./features/reports.js";
import { loadHealth } from "./features/health.js";
import { loadEducation } from "./features/education.js";
import { loadFamily } from "./features/family.js";
import { loadCalendar } from "./features/calendar.js";

// UI FEATURES
import { askAssistant } from "./ui/assistant.js";
import { openComposerFor, saveComposer } from "./ui/composer.js";
import { openRecordDetail } from "./ui/records.js";

// ========================
// VIEW MAP
// ========================

const VIEW_LOADERS = {
  overview: loadOverview,
  profile: loadProfile,
  timeline: loadTimeline,
  handover: loadHandover,
  reports: loadReports,
  health: loadHealth,
  education: loadEducation,
  family: loadFamily,
  calendar: loadCalendar,
};

// ========================
// URL
// ========================

function getYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id")) || null;
}

function setUrl(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history.replaceState({}, "", url);
}

// ========================
// LOADERS
// ========================

async function loadSelector() {
  showSelectorScreen();
  clearStatus();

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || [];
    renderSelectorList(state.selectorItems);
  } catch (err) {
    showError("Failed to load young people");
  }
}

async function loadYoungPerson() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const yp = data.young_person || data;

  setYoungPerson(yp);

  renderYoungPersonHeader(yp);
  renderDesktopNav(state.currentView);
  renderMobileNav(state.currentView);
  renderMobileBottomBar(state.currentView);
  renderAssistantContext();
}

// ========================
// VIEW LOADER
// ========================

async function loadView(view) {
  setCurrentView(view);

  renderPageHeader(view);
  renderDesktopNav(view);

  const loader = VIEW_LOADERS[view];

  if (!loader) {
    showError("Unknown view");
    return;
  }

  try {
    await loader(state.youngPersonId);
  } catch (err) {
    showError("Failed to load view");
  }
}

// ========================
// NAVIGATION
// ========================

async function openWorkspace(id) {
  setYoungPersonId(id);
  setUrl(id);

  showWorkspaceScreen();

  await loadYoungPerson();
  await loadView("overview");
}

function goHome() {
  setYoungPersonId(null);
  setUrl(null);
  loadSelector();
}

// ========================
// EVENTS
// ========================

function bindEvents() {
  document.addEventListener("click", (e) => {
    const openYP = e.target.closest("[data-open-young-person]");
    if (openYP) {
      openWorkspace(Number(openYP.dataset.openYoungPerson));
      return;
    }

    const nav = e.target.closest("[data-view]");
    if (nav) {
      loadView(nav.dataset.view);
      return;
    }

    const record = e.target.closest("[data-open-record]");
    if (record) {
      openRecordDetail(JSON.parse(record.dataset.openRecord));
      return;
    }

    const action = e.target.closest("[data-action]");
    if (action) {
      if (action.dataset.action === "daily-note") {
        openComposerFor("daily_note");
      }
    }

    const assistant = e.target.closest("[data-prompt]");
    if (assistant) {
      askAssistant(assistant.dataset.prompt);
    }
  });

  els.selectorSearch?.addEventListener("input", () => {
    renderSelectorList(state.selectorItems);
  });
}

// ========================
// INIT
// ========================

async function init() {
  bindEvents();

  const id = getYoungPersonId();

  if (!id) {
    await loadSelector();
    return;
  }

  await openWorkspace(id);
}

init();

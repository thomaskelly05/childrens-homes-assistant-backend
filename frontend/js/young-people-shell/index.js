import { state, setYoungPersonId, setYoungPerson, setCurrentView } from "./state.js";
import { els } from "./dom.js";

import { apiGet } from "./core/api.js";

import { renderHeaderYoungPerson } from "./ui/header.js";
import { renderDesktopNav, renderMobileNav, renderMobileBottomBar } from "./ui/nav.js";
import { renderSelectorList } from "./ui/selector.js";
import {
  showError,
  showMessage,
  clearStatus,
  showSelectorScreen,
  showWorkspaceScreen,
  renderPageHeader,
  renderHeroActions,
} from "./app.js";
import {
  renderAssistantMessages,
  renderAssistantInsights,
  renderAssistantContext,
} from "./ui/assistant-ui.js";
import { askAssistant } from "./ui/assistant.js";
import { openComposerFor } from "./ui/composer.js";
import { openRecordDetail } from "./ui/records.js";

import { loadOverview } from "./features/overview.js";
import { loadProfile } from "./features/profile.js";
import { loadTimeline } from "./features/timeline.js";
import { loadHandover } from "./features/handover.js";
import { loadReports } from "./features/reports.js";
import { loadHealth } from "./features/health.js";
import { loadEducation } from "./features/education.js";
import { loadFamily } from "./features/family.js";
import { loadCalendar } from "./features/calendar.js";

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

function getYoungPersonIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("young_person_id");
  return id ? Number(id) : null;
}

function updateUrlWithYoungPerson(id) {
  const url = new URL(window.location.href);

  if (id) {
    url.searchParams.set("id", String(id));
  } else {
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
  }

  window.history.replaceState({}, "", url.toString());
}

async function loadSelectorScreen() {
  showSelectorScreen();
  clearStatus();

  if (els.selectorList) {
    els.selectorList.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading young people...</p>
        </div>
      </div>
    `;
  }

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    showError(error.message || "Failed to load young people.");
  }
}

async function loadYoungPersonRecord() {
  if (!state.youngPersonId) return;

  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const youngPerson = data.young_person || data.bundle?.young_person || data;

  setYoungPerson(youngPerson);

  renderHeaderYoungPerson(youngPerson);
  renderAssistantContext();
  renderAssistantInsights();
}

async function loadCurrentView(viewKey = state.currentView) {
  const view = viewKey || "overview";
  setCurrentView(view);

  renderPageHeader(view);
  renderDesktopNav(view);
  renderMobileNav(view);
  renderMobileBottomBar(view);
  renderHeroActions(view);
  renderAssistantContext();

  const loader = VIEW_LOADERS[view];

  if (!loader) {
    showError(`Unknown view: ${view}`);
    return;
  }

  try {
    await loader(state.youngPersonId);
  } catch (error) {
    showError(error.message || "Failed to load this view.");
  }
}

async function openYoungPersonWorkspace(id) {
  if (!id) return;

  setYoungPersonId(Number(id));
  updateUrlWithYoungPerson(id);
  showWorkspaceScreen();

  await loadYoungPersonRecord();
  await loadCurrentView("overview");
}

async function goBackToYoungPeopleHome() {
  setYoungPersonId(null);
  setYoungPerson(null);
  updateUrlWithYoungPerson(null);
  await loadSelectorScreen();
}

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const openYoungPersonBtn = event.target.closest("[data-open-young-person]");
    if (openYoungPersonBtn) {
      const id = Number(openYoungPersonBtn.dataset.openYoungPerson);
      openYoungPersonWorkspace(id);
      return;
    }

    const navBtn = event.target.closest("[data-view]");
    if (navBtn) {
      const view = navBtn.dataset.view;
      loadCurrentView(view);
      return;
    }

    const mobileViewBtn = event.target.closest("[data-mobile-view]");
    if (mobileViewBtn) {
      const view = mobileViewBtn.dataset.mobileView;
      if (view === "assistant") {
        const prompt = els.assistantInput?.value?.trim() || "";
        if (prompt) askAssistant(prompt);
        return;
      }
      loadCurrentView(view);
      return;
    }

    const recordBtn = event.target.closest("[data-open-record]");
    if (recordBtn) {
      try {
        openRecordDetail(JSON.parse(recordBtn.dataset.openRecord));
      } catch (_) {
        showError("Could not open record.");
      }
      return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;

      if (action === "daily-note") {
        openComposerFor("daily_note", "create");
        return;
      }

      if (action === "incident") {
        openComposerFor("incident", "create");
        return;
      }

      if (action === "plan") {
        openComposerFor("support_plan", "create");
        return;
      }
    }

    const assistantPromptBtn = event.target.closest("[data-prompt]");
    if (assistantPromptBtn) {
      const prompt = assistantPromptBtn.dataset.prompt || "";
      askAssistant(prompt);
      return;
    }

    const homeBtn = event.target.closest("[data-go-home]");
    if (homeBtn) {
      goBackToYoungPeopleHome();
    }
  });

  els.selectorSearch?.addEventListener("input", () => {
    const term = String(els.selectorSearch.value || "").trim().toLowerCase();

    if (!term) {
      renderSelectorList(state.selectorItems);
      return;
    }

    const filtered = state.selectorItems.filter((item) => {
      const haystack = [
        item.first_name,
        item.last_name,
        item.preferred_name,
        item.home_name,
        item.placement_status,
        item.summary_risk_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });

    renderSelectorList(filtered);
  });

  els.selectorRefreshBtn?.addEventListener("click", loadSelectorScreen);
  els.refreshBtn?.addEventListener("click", async () => {
    if (!state.youngPersonId) {
      await loadSelectorScreen();
      return;
    }

    await loadYoungPersonRecord();
    await loadCurrentView(state.currentView);
    showMessage("Workspace refreshed.");
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
}

async function init() {
  bindGlobalEvents();
  renderAssistantMessages();
  renderAssistantInsights();

  const id = getYoungPersonIdFromUrl();

  if (!id) {
    await loadSelectorScreen();
    return;
  }

  try {
    await openYoungPersonWorkspace(id);
  } catch (error) {
    showError(error.message || "Failed to open workspace.");
    await loadSelectorScreen();
  }
}

init();

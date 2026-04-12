import { state } from "../state.js";
import { els } from "../dom.js";
import { NAV_SECTIONS } from "../core/config.js";
import { escapeHtml } from "../core/utils.js";

import {
  openYoungPerson,
  goBackToSelector,
  loadYoungPersonSelector,
  filterSelectorList,
} from "./selector.js";
import { bindRecordDrawerEvents, openRecordDetail } from "./records.js";
import { closeComposer, saveComposer } from "./composer.js";
import { bindSuggestionEvents } from "./suggestions.js";
import { bindActionRouter, getActionForQuickButton } from "./action-router.js";
import {
  updateSectionChrome,
  updateYoungPersonChrome,
  closeMobileNav,
} from "./shell-ui.js";

import { loadOverview } from "../features/overview.js";
import { loadProfile } from "../features/profile.js";
import { loadTimeline } from "../features/timeline.js";
import { loadHandover } from "../features/handover.js";
import { loadReports } from "../features/reports.js";
import { loadHealth } from "../features/health.js";
import { loadEducation } from "../features/education.js";
import { loadFamily } from "../features/family.js";
import { loadCalendar } from "../features/calendar.js";
import { loadReadiness } from "../features/readiness.js";
import { loadManager } from "../features/manager.js";
import { loadCurrentView as loadWorkspace } from "../features/workspace.js";

const SECTION_LOADERS = {
  workspace: loadWorkspace,
  overview: loadOverview,
  profile: loadProfile,
  timeline: loadTimeline,
  handover: loadHandover,
  reports: loadReports,
  health: loadHealth,
  education: loadEducation,
  family: loadFamily,
  calendar: loadCalendar,
  readiness: loadReadiness,
  manager: loadManager,
};

export function showError(message) {
  if (els.statusMessage) {
    els.statusMessage.innerHTML = `<span class="status-error">${escapeHtml(
      message || "Something went wrong."
    )}</span>`;
  }

  if (els.statusBar) {
    els.statusBar.classList.remove("hidden");
  }
}

export function showMessage(message) {
  if (els.statusMessage) {
    els.statusMessage.innerHTML = `<span class="status-ok">${escapeHtml(
      message || ""
    )}</span>`;
  }

  if (els.statusBar) {
    els.statusBar.classList.remove("hidden");
  }
}

export function clearStatus() {
  if (els.statusMessage) {
    els.statusMessage.innerHTML = "";
  }

  if (els.statusBar) {
    els.statusBar.classList.add("hidden");
  }
}

function markActiveNav(section) {
  document.querySelectorAll("[data-nav-section]").forEach((button) => {
    const isActive = button.dataset.navSection === section;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

export async function loadSection(section) {
  if (!state.youngPersonId) {
    showError("Select a young person first.");
    return;
  }

  const loader = SECTION_LOADERS[section];
  if (!loader) {
    showError(`Unknown section: ${section}`);
    return;
  }

  state.currentSection = section;
  state.activeSection = section;
  state.currentView = section;

  markActiveNav(section);
  updateSectionChrome(section);
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  clearStatus();

  try {
    await loader();
    closeMobileNav?.();
  } catch (error) {
    console.error(`[nav] failed loading section "${section}"`, error);
    showError(error?.message || "Failed to load this section.");
  }
}

export async function reloadCurrentSection() {
  const section = getCurrentSection();
  await loadSection(section);
}

function bindNavButtons() {
  document.querySelectorAll("[data-nav-section]").forEach((button) => {
    button.addEventListener("click", async () => {
      const section = button.dataset.navSection;
      if (!section) return;
      await loadSection(section);
    });
  });
}

function bindSelectorControls() {
  els.backToSelectorBtn?.addEventListener("click", async () => {
    state.youngPersonId = null;
    state.selectedYoungPerson = null;
    state.currentView = state.currentSection || "workspace";
    state.activeRecordType = null;
    state.activeRecordItem = null;

    if (els.workspaceShell) els.workspaceShell.classList.add("hidden");
    if (els.selectorScreen) els.selectorScreen.classList.remove("hidden");

    goBackToSelector?.();
    updateYoungPersonChrome({});
    clearStatus();

    try {
      await loadYoungPersonSelector?.();
    } catch (error) {
      showError(error?.message || "Failed to load young people.");
    }
  });

  els.youngPersonSearchInput?.addEventListener("input", (event) => {
    filterSelectorList?.(event.target.value || "");
  });

  els.selectorRefreshBtn?.addEventListener("click", async () => {
    try {
      await loadYoungPersonSelector?.();
      clearStatus();
    } catch (error) {
      showError(error?.message || "Failed to refresh young people.");
    }
  });
}

function bindQuickActionButtons() {
  document.querySelectorAll("[data-quick-action]").forEach((button) => {
    const action = getActionForQuickButton(button.dataset.quickAction || "", {
      section: button.dataset.section || getCurrentSection(),
    });

    if (action?.label && !button.textContent.trim()) {
      button.textContent = action.label;
    }
  });

  bindActionRouter({
    onMissingYoungPerson: () => {
      showError("Select a young person first.");
    },
  });
}

function bindComposerControls() {
  els.closeComposerBtn?.addEventListener("click", () => {
    closeComposer(true);
  });

  els.composerSaveBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("draft");
      showMessage("Draft saved.");
      await reloadCurrentSection();
    } catch (error) {
      console.error("[nav] save draft failed", error);
      showError(error?.message || "Could not save draft.");
    }
  });

  els.composerSubmitBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("submit");
      showMessage("Record sent for review.");
      await reloadCurrentSection();
    } catch (error) {
      console.error("[nav] submit failed", error);
      showError(error?.message || "Could not submit record.");
    }
  });
}

function bindRefreshControls() {
  els.refreshWorkspaceBtn?.addEventListener("click", async () => {
    try {
      await reloadCurrentSection();
      showMessage("Workspace refreshed.");
    } catch (error) {
      console.error("[nav] refresh failed", error);
      showError(error?.message || "Failed to refresh workspace.");
    }
  });
}

function bindOpenRecordEvents() {
  if (!els.viewContent) return;

  els.viewContent.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-record-id], [data-open-record]");
    if (!trigger) return;

    const id = trigger.dataset.recordId || trigger.dataset.id || null;
    const recordType = trigger.dataset.recordType || trigger.dataset.type || "";

    if (!id) return;

    try {
      const numericId = Number(id);
      const safeId = Number.isNaN(numericId) ? id : numericId;

      state.activeRecordType = recordType || null;
      state.activeRecordItem = {
        id: safeId,
        source_id: safeId,
        record_id: safeId,
        record_type: recordType,
        title: trigger.dataset.title || "",
      };

      await openRecordDetail(state.activeRecordItem);
    } catch (error) {
      console.error("[nav] open record failed", error);
      showError("Could not open record.");
    }
  });
}

function bindYoungPersonOpen() {
  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-open-young-person]");
    if (!trigger) return;

    const id = trigger.dataset.openYoungPerson || trigger.dataset.youngPersonId;
    if (!id) return;

    try {
      await openYoungPerson?.(id);

      if (els.selectorScreen) els.selectorScreen.classList.add("hidden");
      if (els.workspaceShell) els.workspaceShell.classList.remove("hidden");

      updateYoungPersonChrome(state.selectedYoungPerson || {});
      updateSectionChrome(getCurrentSection());
      clearStatus();

      await loadSection(getCurrentSection());
    } catch (error) {
      console.error("[nav] open young person failed", error);
      showError(error?.message || "Unable to open workspace.");
    }
  });
}

function bindDrawerCallbacks() {
  bindRecordDrawerEvents({
    onEdit: async (recordType, item) => {
      const { openComposerFor } = await import("./composer.js");
      openComposerFor(recordType, "edit", item);
    },
    onWorkflowComplete: async () => {
      try {
        await reloadCurrentSection();
      } catch (error) {
        console.error("[nav] workflow refresh failed", error);
        showError(error?.message || "Failed to refresh workspace.");
      }
    },
  });
}

export function bindNavEvents() {
  bindNavButtons();
  bindSelectorControls();
  bindQuickActionButtons();
  bindComposerControls();
  bindRefreshControls();
  bindOpenRecordEvents();
  bindYoungPersonOpen();
  bindDrawerCallbacks();
  bindSuggestionEvents();
}

export async function initialiseShellNavigation() {
  bindNavEvents();

  if (!state.currentSection) {
    state.currentSection = NAV_SECTIONS?.[0]?.id || "workspace";
  }

  if (!state.activeSection) {
    state.activeSection = state.currentSection;
  }

  state.currentView = state.currentSection;

  markActiveNav(getCurrentSection());
  updateSectionChrome(getCurrentSection());
  updateYoungPersonChrome(state.selectedYoungPerson || {});

  if (!state.youngPersonId) {
    try {
      await loadYoungPersonSelector?.();
      if (els.workspaceShell) els.workspaceShell.classList.add("hidden");
      if (els.selectorScreen) els.selectorScreen.classList.remove("hidden");
    } catch (error) {
      console.error("[nav] selector load failed", error);
      showError(error?.message || "Unable to load young people.");
    }
    return;
  }

  try {
    if (els.selectorScreen) els.selectorScreen.classList.add("hidden");
    if (els.workspaceShell) els.workspaceShell.classList.remove("hidden");
    await loadSection(getCurrentSection());
  } catch (error) {
    console.error("[nav] initial section load failed", error);
    showError(error?.message || "Failed to load this section.");
  }
}

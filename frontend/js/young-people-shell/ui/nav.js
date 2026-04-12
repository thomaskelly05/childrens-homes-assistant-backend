import { state } from "../state.js";
import { els } from "../dom.js";
import { NAV_SECTIONS, NAV_GROUPS_CONFIG } from "../core/config.js";
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

const MOBILE_BOTTOM_SECTIONS = ["workspace", "timeline", "profile", "readiness", "manager"];

const ICON_MAP = {
  home: "⌂",
  "layout-dashboard": "◫",
  user: "◉",
  "list-ordered": "≣",
  repeat: "↻",
  "heart-pulse": "♥",
  "graduation-cap": "⌁",
  users: "◌",
  calendar: "◷",
  "shield-check": "✓",
  "clipboard-check": "☑",
  "file-text": "▤",
};

function getNavIcon(icon) {
  return ICON_MAP[icon] || "•";
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function buildDesktopNavHtml() {
  return `
    <div class="workspace-nav-inner">
      ${NAV_GROUPS_CONFIG.map((group) => {
        const itemsHtml = (group.items || [])
          .map((item) => {
            const isActive = item.id === getCurrentSection();
            return `
              <button
                class="nav-btn ${isActive ? "active" : ""}"
                type="button"
                data-nav-section="${escapeHtml(item.id)}"
                aria-pressed="${isActive ? "true" : "false"}"
                title="${escapeHtml(item.description || item.label || item.id)}"
              >
                <span class="nav-btn-icon" aria-hidden="true">${escapeHtml(getNavIcon(item.icon))}</span>
                <span class="nav-btn-copy">
                  <span class="nav-btn-label">${escapeHtml(item.label || item.id)}</span>
                </span>
              </button>
            `;
          })
          .join("");

        return `
          <section class="nav-section" data-nav-group="${escapeHtml(group.id)}">
            <div class="nav-section-title">${escapeHtml(group.title || "")}</div>
            <div class="nav-section-items">
              ${itemsHtml}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function buildMobileDrawerNavHtml() {
  return `
    <div class="workspace-nav-inner">
      ${NAV_GROUPS_CONFIG.map((group) => {
        const itemsHtml = (group.items || [])
          .map((item) => {
            const isActive = item.id === getCurrentSection();
            return `
              <button
                class="nav-btn ${isActive ? "active" : ""}"
                type="button"
                data-nav-section="${escapeHtml(item.id)}"
                aria-pressed="${isActive ? "true" : "false"}"
                title="${escapeHtml(item.description || item.label || item.id)}"
              >
                <span class="nav-btn-icon" aria-hidden="true">${escapeHtml(getNavIcon(item.icon))}</span>
                <span class="nav-btn-copy">
                  <span class="nav-btn-label">${escapeHtml(item.label || item.id)}</span>
                </span>
              </button>
            `;
          })
          .join("");

        return `
          <section class="nav-section" data-nav-group="${escapeHtml(group.id)}">
            <div class="nav-section-title">${escapeHtml(group.title || "")}</div>
            <div class="nav-section-items">
              ${itemsHtml}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function buildMobileBottomBarHtml() {
  const byId = new Map(NAV_SECTIONS.map((item) => [item.id, item]));

  return MOBILE_BOTTOM_SECTIONS.map((sectionId) => {
    const item = byId.get(sectionId);
    if (!item) return "";

    const isActive = item.id === getCurrentSection();

    return `
      <button
        class="mobile-tab-btn ${isActive ? "active" : ""}"
        type="button"
        data-nav-section="${escapeHtml(item.id)}"
        aria-pressed="${isActive ? "true" : "false"}"
        title="${escapeHtml(item.label || item.id)}"
      >
        <span class="mobile-tab-icon" aria-hidden="true">${escapeHtml(getNavIcon(item.icon))}</span>
        <span class="mobile-tab-label">${escapeHtml(item.short_label || item.label || item.id)}</span>
      </button>
    `;
  }).join("");
}

function renderNavigation() {
  if (els.desktopNav) {
    els.desktopNav.innerHTML = buildDesktopNavHtml();
  }

  if (els.mobileNavContent) {
    els.mobileNavContent.innerHTML = buildMobileDrawerNavHtml();
  }

  if (els.mobileBottomBar) {
    els.mobileBottomBar.innerHTML = buildMobileBottomBarHtml();
  }
}

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
  const goToSelector = async () => {
    state.youngPersonId = null;
    state.selectedYoungPerson = null;
    state.currentView = state.currentSection || "workspace";
    state.activeRecordType = null;
    state.activeRecordItem = null;

    if (els.workspaceScreen) els.workspaceScreen.classList.add("hidden");
    if (els.selectorScreen) els.selectorScreen.classList.remove("hidden");

    goBackToSelector?.();
    updateYoungPersonChrome({});
    clearStatus();

    try {
      await loadYoungPersonSelector?.();
    } catch (error) {
      showError(error?.message || "Failed to load young people.");
    }
  };

  els.backToSelectorBtn?.addEventListener("click", goToSelector);
  els.homeBtn?.addEventListener("click", goToSelector);
  els.mobileHomeBtn?.addEventListener("click", goToSelector);
  els.changePersonBtn?.addEventListener("click", goToSelector);
  els.logoBtn?.addEventListener("click", goToSelector);

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
      if (els.workspaceScreen) els.workspaceScreen.classList.remove("hidden");

      updateYoungPersonChrome(state.selectedYoungPerson || {});
      updateSectionChrome(getCurrentSection());
      clearStatus();

      renderNavigation();
      bindNavButtons();

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
  if (!state.currentSection) {
    state.currentSection = NAV_SECTIONS?.[0]?.id || "workspace";
  }

  if (!state.activeSection) {
    state.activeSection = state.currentSection;
  }

  state.currentView = state.currentSection;

  renderNavigation();
  bindNavButtons();
  bindNavEvents();

  markActiveNav(getCurrentSection());
  updateSectionChrome(getCurrentSection());
  updateYoungPersonChrome(state.selectedYoungPerson || {});

  if (!state.youngPersonId) {
    try {
      await loadYoungPersonSelector?.();
      if (els.workspaceScreen) els.workspaceScreen.classList.add("hidden");
      if (els.selectorScreen) els.selectorScreen.classList.remove("hidden");
    } catch (error) {
      console.error("[nav] selector load failed", error);
      showError(error?.message || "Unable to load young people.");
    }
    return;
  }

  try {
    if (els.selectorScreen) els.selectorScreen.classList.add("hidden");
    if (els.workspaceScreen) els.workspaceScreen.classList.remove("hidden");
    await loadSection(getCurrentSection());
  } catch (error) {
    console.error("[nav] initial section load failed", error);
    showError(error?.message || "Failed to load this section.");
  }
}

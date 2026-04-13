import { state } from "../state.js";
import { els } from "../dom.js";
import {
  NAV_SECTIONS,
  NAV_GROUPS_CONFIG,
  SCOPE_SECTIONS,
  SCOPE_DEFAULT_SECTION,
} from "../core/config.js";
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
import { bindActionRouter } from "./action-router.js";
import {
  updateSectionChrome,
  updateYoungPersonChrome,
  closeMobileNav,
} from "./shell-ui.js";
import { resetWorkspaceSummaryStrip } from "./workspace-summary.js";

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

import { loadHomeDashboard } from "../features/home-dashboard.js";
import { loadQualityDashboard } from "../features/quality.js";
import { loadCompliance } from "../features/compliance.js";
import { loadDocuments } from "../features/documents.js";
import { loadCommunication } from "../features/communication.js";
import { loadTherapy } from "../features/therapy.js";
import { loadTeam } from "../features/team.js";
import { loadSupervision } from "../features/supervision.js";

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
  documents: loadDocuments,
  communication: loadCommunication,
  therapy: loadTherapy,
  team: loadTeam,
  supervision: loadSupervision,
  compliance: loadCompliance,
  "home-dashboard": loadHomeDashboard,
  quality: loadQualityDashboard,
};

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
  folder: "▣",
  "messages-square": "✉",
  sparkles: "✦",
  "badge-check": "⬢",
  "users-round": "◍",
  "building-2": "▥",
  "bar-chart-3": "▦",
};

const MOBILE_BOTTOM_BY_SCOPE = {
  child: ["workspace", "timeline", "profile", "readiness", "manager"],
  home: ["home-dashboard", "compliance", "readiness", "reports", "calendar"],
  quality: ["quality", "compliance", "reports", "manager", "calendar"],
};

let navButtonsBound = false;
let selectorControlsBound = false;
let composerControlsBound = false;
let refreshControlsBound = false;
let recordEventsBound = false;
let youngPersonOpenBound = false;
let drawerCallbacksBound = false;
let shellEventsBound = false;
let actionRouterBound = false;
let suggestionsBound = false;

function getNavIcon(icon) {
  return ICON_MAP[icon] || "•";
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function getAllowedSectionIdsForScope() {
  const scope = getCurrentScope();
  return new Set(
    SCOPE_SECTIONS?.[scope] || SCOPE_SECTIONS?.child || ["workspace"]
  );
}

function getDefaultSectionForScope(scope = getCurrentScope()) {
  return SCOPE_DEFAULT_SECTION?.[scope] || "workspace";
}

function isSectionAllowed(sectionId) {
  return getAllowedSectionIdsForScope().has(sectionId);
}

function ensureValidCurrentSection() {
  const current = getCurrentSection();

  if (isSectionAllowed(current)) {
    return current;
  }

  const fallback = getDefaultSectionForScope();
  state.currentSection = fallback;
  state.activeSection = fallback;
  state.currentView = fallback;
  return fallback;
}

function getScopedNavGroups() {
  const allowed = getAllowedSectionIdsForScope();

  return (NAV_GROUPS_CONFIG || [])
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => allowed.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}

function getScopedNavSections() {
  const allowed = getAllowedSectionIdsForScope();
  return (NAV_SECTIONS || []).filter((item) => allowed.has(item.id));
}

function getMobileBottomSections() {
  const scope = getCurrentScope();
  return MOBILE_BOTTOM_BY_SCOPE[scope] || MOBILE_BOTTOM_BY_SCOPE.child;
}

function renderNavItem(item, { compact = false } = {}) {
  const isActive = item.id === getCurrentSection();
  const description = item.description || item.label || item.id;
  const label = item.label || item.id;
  const meta = compact
    ? ""
    : `<span class="nav-btn-meta">${escapeHtml(description)}</span>`;

  return `
    <button
      class="nav-btn ${isActive ? "active" : ""}"
      type="button"
      data-nav-section="${escapeHtml(item.id)}"
      aria-pressed="${isActive ? "true" : "false"}"
      title="${escapeHtml(description)}"
    >
      <span class="nav-btn-icon" aria-hidden="true">${escapeHtml(
        getNavIcon(item.icon)
      )}</span>
      <span class="nav-btn-copy">
        <span class="nav-btn-label">${escapeHtml(label)}</span>
        ${meta}
      </span>
    </button>
  `;
}

function buildDesktopNavHtml() {
  return getScopedNavGroups()
    .map(
      (group) => `
        <section class="nav-section" data-nav-group="${escapeHtml(group.id)}">
          <div class="nav-section-title">${escapeHtml(group.title || "")}</div>
          <div class="nav-section-items">
            ${(group.items || []).map((item) => renderNavItem(item)).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function buildMobileDrawerNavHtml() {
  return getScopedNavGroups()
    .map(
      (group) => `
        <section class="nav-section" data-nav-group="${escapeHtml(group.id)}">
          <div class="nav-section-title">${escapeHtml(group.title || "")}</div>
          <div class="nav-section-items">
            ${(group.items || []).map((item) => renderNavItem(item)).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function buildMobileBottomBarHtml() {
  const byId = new Map(getScopedNavSections().map((item) => [item.id, item]));

  return getMobileBottomSections()
    .map((sectionId) => {
      const item = byId.get(sectionId);
      if (!item) return "";

      const isActive = item.id === getCurrentSection();

      return `
        <button
          class="nav-btn ${isActive ? "active" : ""}"
          type="button"
          data-nav-section="${escapeHtml(item.id)}"
          aria-pressed="${isActive ? "true" : "false"}"
          title="${escapeHtml(item.label || item.id)}"
        >
          <span class="nav-btn-icon" aria-hidden="true">${escapeHtml(
            getNavIcon(item.icon)
          )}</span>
          <span class="nav-btn-copy">
            <span class="nav-btn-label">${escapeHtml(
              item.short_label || item.label || item.id
            )}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderNavigation() {
  ensureValidCurrentSection();

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

function showWorkspaceScreen() {
  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

function showSelectorScreen() {
  els.workspaceScreen?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

export function showError(message) {
  const text = escapeHtml(message || "Something went wrong.");

  if (els.statusMessage) {
    els.statusMessage.textContent = "";
    els.statusMessage.innerHTML = text;
    els.statusMessage.classList.remove("hidden");
  }

  if (els.statusBar) {
    els.statusBar.classList.remove("hidden");
  }
}

export function showMessage(message) {
  const text = escapeHtml(message || "");

  if (els.statusMessage) {
    els.statusMessage.textContent = "";
    els.statusMessage.innerHTML = text;
    els.statusMessage.classList.remove("hidden");
  }

  if (els.statusBar) {
    els.statusBar.classList.remove("hidden");
  }
}

export function clearStatus() {
  if (els.statusMessage) {
    els.statusMessage.innerHTML = "";
    els.statusMessage.classList.add("hidden");
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
  const safeSection = isSectionAllowed(section)
    ? section
    : getDefaultSectionForScope();

  if (!state.youngPersonId && getCurrentScope() === "child") {
    showError("Select a young person first.");
    showSelectorScreen();
    resetWorkspaceSummaryStrip();
    return;
  }

  const loader = SECTION_LOADERS[safeSection];

  if (!loader) {
    showError(`Unknown section: ${safeSection}`);
    resetWorkspaceSummaryStrip();
    return;
  }

  state.currentSection = safeSection;
  state.activeSection = safeSection;
  state.currentView = safeSection;

  showWorkspaceScreen();
  markActiveNav(safeSection);
  updateSectionChrome(safeSection);
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  clearStatus();
  resetWorkspaceSummaryStrip();

  try {
    await loader();
    closeMobileNav();
  } catch (error) {
    console.error(`[nav] failed loading section "${safeSection}"`, error);
    showError(error?.message || "Failed to load this section.");
    resetWorkspaceSummaryStrip();
  }
}

export async function reloadCurrentSection() {
  await loadSection(ensureValidCurrentSection());
}

function bindNavButtons() {
  if (navButtonsBound) return;
  navButtonsBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-nav-section]");
    if (!button) return;

    const section = button.dataset.navSection;
    if (!section) return;

    await loadSection(section);
  });
}

function bindSelectorControls() {
  if (selectorControlsBound) return;
  selectorControlsBound = true;

  const goToSelector = async () => {
    state.youngPersonId = null;
    state.selectedYoungPerson = null;
    state.currentScope = "child";
    state.currentSection = getDefaultSectionForScope("child");
    state.activeSection = state.currentSection;
    state.currentView = state.currentSection;
    state.activeRecordType = null;
    state.activeRecordItem = null;

    showSelectorScreen();

    goBackToSelector?.();
    updateYoungPersonChrome({});
    clearStatus();
    resetWorkspaceSummaryStrip();

    try {
      await loadYoungPersonSelector();
      renderNavigation();
      markActiveNav(getCurrentSection());
    } catch (error) {
      showError(error?.message || "Failed to load young people.");
    }
  };

  els.backToSelectorBtn?.addEventListener("click", goToSelector);
  els.homeBtn?.addEventListener("click", goToSelector);
  els.mobileHomeBtn?.addEventListener("click", goToSelector);
  els.changePersonBtn?.addEventListener("click", goToSelector);
  els.logoBtn?.addEventListener("click", goToSelector);

  [els.youngPersonSearchInput, els.selectorSearch]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener("input", (event) => {
        filterSelectorList?.(event.target.value || "");
      });
    });

  els.selectorRefreshBtn?.addEventListener("click", async () => {
    try {
      await loadYoungPersonSelector();
      clearStatus();
    } catch (error) {
      showError(error?.message || "Failed to refresh young people.");
    }
  });
}

function bindComposerControls() {
  if (composerControlsBound) return;
  composerControlsBound = true;

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

  els.composerSaveDraftBtn?.addEventListener("click", async () => {
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
  if (refreshControlsBound) return;
  refreshControlsBound = true;

  const refresh = async () => {
    try {
      await reloadCurrentSection();
      showMessage("Workspace refreshed.");
    } catch (error) {
      console.error("[nav] refresh failed", error);
      showError(error?.message || "Failed to refresh workspace.");
    }
  };

  els.refreshBtn?.addEventListener("click", refresh);
  els.refreshWorkspaceBtn?.addEventListener("click", refresh);
}

function bindOpenRecordEvents() {
  if (recordEventsBound || !els.viewContent) return;
  recordEventsBound = true;

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

  els.viewContent.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const trigger = event.target.closest("[data-record-id], [data-open-record]");
    if (!trigger) return;

    event.preventDefault();
    trigger.click();
  });
}

function bindYoungPersonOpen() {
  if (youngPersonOpenBound) return;
  youngPersonOpenBound = true;

  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-open-young-person]");
    if (!trigger) return;

    const id = trigger.dataset.openYoungPerson || trigger.dataset.youngPersonId;
    if (!id) return;

    try {
      await openYoungPerson(id);

      showWorkspaceScreen();

      state.currentScope = "child";
      state.currentSection = getDefaultSectionForScope("child");
      state.activeSection = state.currentSection;
      state.currentView = state.currentSection;

      updateYoungPersonChrome(state.selectedYoungPerson || {});
      updateSectionChrome(getCurrentSection());
      clearStatus();
      resetWorkspaceSummaryStrip();

      renderNavigation();
      markActiveNav(getCurrentSection());

      await loadSection(getCurrentSection());
    } catch (error) {
      console.error("[nav] open young person failed", error);
      showError(error?.message || "Unable to open workspace.");
    }
  });
}

function bindDrawerCallbacks() {
  if (drawerCallbacksBound) return;
  drawerCallbacksBound = true;

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

function bindQuickActionRouter() {
  if (actionRouterBound) return;
  actionRouterBound = true;

  bindActionRouter({
    onMissingYoungPerson: () => {
      showError("Select a young person first.");
    },
  });
}

export function bindNavEvents() {
  if (shellEventsBound) return;
  shellEventsBound = true;

  bindSelectorControls();
  bindComposerControls();
  bindRefreshControls();
  bindOpenRecordEvents();
  bindYoungPersonOpen();
  bindDrawerCallbacks();
  bindQuickActionRouter();

  if (!suggestionsBound) {
    bindSuggestionEvents();
    suggestionsBound = true;
  }
}

export function rerenderNavigationForScope() {
  ensureValidCurrentSection();
  renderNavigation();
  markActiveNav(getCurrentSection());
  updateSectionChrome(getCurrentSection());
}

export async function initialiseShellNavigation() {
  if (!state.currentSection) {
    state.currentSection = getDefaultSectionForScope();
  }

  if (!state.activeSection) {
    state.activeSection = state.currentSection;
  }

  state.currentView = state.currentSection;
  ensureValidCurrentSection();

  renderNavigation();
  bindNavButtons();
  bindNavEvents();

  markActiveNav(getCurrentSection());
  updateSectionChrome(getCurrentSection());
  updateYoungPersonChrome(state.selectedYoungPerson || {});

  if (getCurrentScope() === "child" && !state.youngPersonId) {
    try {
      await loadYoungPersonSelector();
      showSelectorScreen();
      resetWorkspaceSummaryStrip();
    } catch (error) {
      console.error("[nav] selector load failed", error);
      showError(error?.message || "Unable to load young people.");
    }
    return;
  }

  try {
    showWorkspaceScreen();
    await loadSection(getCurrentSection());
  } catch (error) {
    console.error("[nav] initial section load failed", error);
    showError(error?.message || "Failed to load this section.");
    resetWorkspaceSummaryStrip();
  }
}
import { state, setCurrentScope, setCurrentSection } from "../state.js";
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
import {
  bindAssistantController,
  onAssistantScopeChanged,
  onWorkspaceRefreshRequested,
  refreshAssistantAnalysisOnly,
  renderAssistantControllerPanels,
} from "./assistant-controller.js";

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
import { loadStaffProfile } from "../features/staff-profile.js";
import { loadOnboarding } from "../features/onboarding.js";
import { loadNotifications } from "../features/notifications.js";
import { loadRota } from "../features/rota.js";

const PLACEHOLDER_LOADER = async () => {
  const { renderPlaceholderFeaturePage } = await import("../features/placeholder.js");
  await renderPlaceholderFeaturePage();
};

const SECTION_LOADERS = {
  workspace: loadWorkspace,
  overview: loadOverview,
  admission: PLACEHOLDER_LOADER,
  profile: loadProfile,
  timeline: loadTimeline,
  handover: loadHandover,
  "daily-life": PLACEHOLDER_LOADER,
  health: loadHealth,
  medication: PLACEHOLDER_LOADER,
  education: loadEducation,
  family: loadFamily,
  calendar: loadCalendar,
  therapy: loadTherapy,
  risk: PLACEHOLDER_LOADER,
  safeguarding: PLACEHOLDER_LOADER,
  "missing-from-care": PLACEHOLDER_LOADER,
  readiness: loadReadiness,
  reviews: PLACEHOLDER_LOADER,
  reports: loadReports,
  transition: PLACEHOLDER_LOADER,
  "leaving-care": PLACEHOLDER_LOADER,
  documents: loadDocuments,
  communication: loadCommunication,
  manager: loadManager,

  "home-dashboard": loadHomeDashboard,
  operations: PLACEHOLDER_LOADER,
  team: loadTeam,
  rota: loadRota,
  "staff-profile": loadStaffProfile,
  onboarding: loadOnboarding,
  supervision: loadSupervision,
  "training-centre": PLACEHOLDER_LOADER,
  compliance: loadCompliance,
  "health-safety": PLACEHOLDER_LOADER,
  maintenance: PLACEHOLDER_LOADER,
  notifications: loadNotifications,
  quality: loadQualityDashboard,
  "ofsted-readiness": PLACEHOLDER_LOADER,
  policies: PLACEHOLDER_LOADER,

  "provider-overview": PLACEHOLDER_LOADER,
  "quality-audits": PLACEHOLDER_LOADER,
  reg44: PLACEHOLDER_LOADER,
  reg45: PLACEHOLDER_LOADER,
  "inspection-readiness": PLACEHOLDER_LOADER,
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
  child: ["workspace", "timeline", "health", "risk", "reviews"],
  home: ["home-dashboard", "operations", "rota", "compliance", "quality"],
  quality: [
    "provider-overview",
    "quality",
    "compliance",
    "quality-audits",
    "inspection-readiness",
  ],
};

let navButtonsBound = false;
let selectorControlsBound = false;
let composerControlsBound = false;
let refreshControlsBound = false;
let searchControlsBound = false;
let recordEventsBound = false;
let youngPersonOpenBound = false;
let drawerCallbacksBound = false;
let shellEventsBound = false;
let actionRouterBound = false;
let suggestionsBound = false;
let scopeSwitchBound = false;
let workspaceMenusBound = false;
let overlayDismissBound = false;
let workspaceMenuLinksBound = false;
let loadingSectionPromise = null;

function getNavIcon(icon) {
  return ICON_MAP[icon] || "•";
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getDefaultSectionForScope(scope = getCurrentScope()) {
  return SCOPE_DEFAULT_SECTION?.[scope] || "workspace";
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    getDefaultSectionForScope()
  );
}

function getSectionLabel(item) {
  return item?.label || item?.id || "";
}

function getSectionDescription(item) {
  return item?.description || getSectionLabel(item);
}

function getGroupTitle(group) {
  return group?.title || "";
}

function isChildScope() {
  return getCurrentScope() === "child";
}

function shouldShowDesktopSidebar() {
  return getCurrentScope() !== "child";
}

function getAllowedSectionIdsForScope(scope = getCurrentScope()) {
  return new Set(
    SCOPE_SECTIONS?.[scope] || SCOPE_SECTIONS?.child || ["workspace"]
  );
}

function isSectionAllowed(sectionId, scope = getCurrentScope()) {
  return getAllowedSectionIdsForScope(scope).has(sectionId);
}

function ensureValidCurrentSection() {
  const scope = getCurrentScope();
  const current = getCurrentSection();

  if (isSectionAllowed(current, scope)) {
    return current;
  }

  const fallback = getDefaultSectionForScope(scope);
  setCurrentSection(fallback);
  state.activeSection = fallback;
  state.currentView = fallback;
  return fallback;
}

function getScopedNavGroups() {
  const allowed = getAllowedSectionIdsForScope();

  return (NAV_GROUPS_CONFIG || [])
    .map((group) => ({
      ...group,
      title: getGroupTitle(group),
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
  const label = getSectionLabel(item);
  const description = getSectionDescription(item);
  const meta = compact
    ? ""
    : `<span class="nav-btn-meta">${escapeHtml(description)}</span>`;

  return `
    <button
      class="nav-btn ${isActive ? "active" : ""}"
      type="button"
      data-nav-section="${escapeHtml(item.id)}"
      data-nav-key="${escapeHtml(item.id)}"
      data-view-key="${escapeHtml(item.id)}"
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
  return getScopedNavSections()
    .map((item) => renderNavItem(item))
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
          data-nav-key="${escapeHtml(item.id)}"
          data-view-key="${escapeHtml(item.id)}"
          aria-pressed="${isActive ? "true" : "false"}"
          title="${escapeHtml(getSectionLabel(item))}"
        >
          <span class="nav-btn-icon" aria-hidden="true">${escapeHtml(
            getNavIcon(item.icon)
          )}</span>
          <span class="nav-btn-copy">
            <span class="nav-btn-label">${escapeHtml(
              item.short_label || getSectionLabel(item)
            )}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function syncDesktopSidebarChrome() {
  const workspaceShell =
    els.workspaceShell || document.getElementById("workspaceShell");
  const sidebar = document.querySelector(".workspace-sidebar");
  const desktopNav = els.desktopNav || document.getElementById("desktopNav");

  const showSidebar = shouldShowDesktopSidebar();

  if (workspaceShell) {
    workspaceShell.classList.toggle("has-sidebar", showSidebar);
  }

  if (sidebar) {
    sidebar.classList.toggle("workspace-sidebar--hidden", !showSidebar);
    sidebar.classList.toggle("workspace-sidebar--visible", showSidebar);
    sidebar.setAttribute("aria-hidden", showSidebar ? "false" : "true");
  }

  if (desktopNav) {
    desktopNav.classList.toggle("workspace-nav--hidden", !showSidebar);
    desktopNav.classList.toggle("workspace-nav--visible", showSidebar);
    desktopNav.setAttribute("aria-hidden", showSidebar ? "false" : "true");
  }
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

  syncDesktopSidebarChrome();
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

function markActiveScopeButtons() {
  const scope = getCurrentScope();

  const pairs = [
    [els.scopeChildBtn, "child"],
    [els.scopeHomeBtn, "home"],
    [els.scopeQualityBtn, "quality"],
  ];

  pairs.forEach(([button, value]) => {
    if (!button) return;
    const isActive = scope === value;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function updateSectionState(section) {
  setCurrentSection(section);
  state.activeSection = section;
  state.currentView = section;
}

function requireChildContext() {
  return Boolean(state.youngPersonId || state.selectedYoungPerson?.id);
}

function getWorkspaceMenus() {
  return Array.from(document.querySelectorAll(".workspace-menu"));
}

function closeAllWorkspaceMenus(except = null) {
  getWorkspaceMenus().forEach((menu) => {
    if (except && menu === except) return;
    menu.removeAttribute("open");
  });
}

function bindWorkspaceMenuBehaviour() {
  if (workspaceMenusBound) return;
  workspaceMenusBound = true;

  document.addEventListener(
    "toggle",
    (event) => {
      const menu = event.target;
      if (!(menu instanceof HTMLDetailsElement)) return;
      if (!menu.classList.contains("workspace-menu")) return;
      if (!menu.open) return;

      closeAllWorkspaceMenus(menu);
    },
    true
  );

  document.addEventListener("click", (event) => {
    const insideMenubar = event.target.closest(".workspace-menubar");
    if (!insideMenubar) {
      closeAllWorkspaceMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllWorkspaceMenus();
    }
  });
}

function findNavTarget(navSection) {
  if (!navSection) return null;

  return (
    document.querySelector(`[data-nav-section="${navSection}"]`) ||
    document.querySelector(`[data-nav-key="${navSection}"]`) ||
    document.querySelector(`[data-view-key="${navSection}"]`) ||
    document.querySelector(`[data-view="${navSection}"]`) ||
    null
  );
}

function bindWorkspaceMenuLinks() {
  if (workspaceMenuLinksBound) return;
  workspaceMenuLinksBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".workspace-menu-link");
    if (!button) return;

    const actionRouter = button.dataset.actionRouter;
    const navSection = button.dataset.navSection;

    if (actionRouter) {
      const target = document.querySelector(
        `[data-action-router="${actionRouter}"]`
      );

      if (target && target !== button && typeof target.click === "function") {
        target.click();
        closeAllWorkspaceMenus();
        return;
      }
    }

    if (navSection) {
      if (isSectionAllowed(navSection, getCurrentScope())) {
        await loadSection(navSection);
        closeAllWorkspaceMenus();
        return;
      }

      const navTarget = findNavTarget(navSection);
      if (
        navTarget &&
        navTarget !== button &&
        typeof navTarget.click === "function"
      ) {
        navTarget.click();
      }

      closeAllWorkspaceMenus();
    }
  });
}

function closeAssistantOverlay() {
  state.assistantOpen = false;
  const assistantModal = document.getElementById("assistantModal");
  const assistantBackdrop = document.getElementById("assistantBackdrop");
  assistantModal?.classList.add("hidden");
  assistantBackdrop?.classList.add("hidden");
  assistantModal?.setAttribute("aria-hidden", "true");
  assistantBackdrop?.setAttribute("aria-hidden", "true");
}

function closeFullscreenOverlay() {
  state.fullscreenPanelOpen = false;
  const fullscreenPanel = document.getElementById("fullscreenPanel");
  fullscreenPanel?.classList.add("hidden");
  fullscreenPanel?.setAttribute("aria-hidden", "true");
}

function closeSuggestionsOverlay() {
  const suggestionsPanel = document.getElementById("suggestionsPanel");
  suggestionsPanel?.classList.add("hidden");
  suggestionsPanel?.setAttribute("aria-hidden", "true");
}

function closeRecordDrawerOverlay() {
  state.recordDrawerOpen = false;
  const recordDrawer = document.getElementById("recordDrawer");
  const recordDrawerBackdrop = document.getElementById("recordDrawerBackdrop");
  recordDrawer?.classList.add("hidden");
  recordDrawerBackdrop?.classList.add("hidden");
  recordDrawer?.setAttribute("aria-hidden", "true");
  recordDrawerBackdrop?.setAttribute("aria-hidden", "true");
}

function bindOverlayDismiss() {
  if (overlayDismissBound) return;
  overlayDismissBound = true;

  document.addEventListener("click", (event) => {
    const assistantModal = document.getElementById("assistantModal");
    if (
      assistantModal &&
      !assistantModal.classList.contains("hidden") &&
      !event.target.closest(".assistant-shell")
    ) {
      if (
        event.target === assistantModal ||
        event.target.id === "assistantBackdrop"
      ) {
        closeAssistantOverlay();
      }
    }

    const composerPanel = document.getElementById("composerPanel");
    if (
      composerPanel &&
      !composerPanel.classList.contains("hidden") &&
      !event.target.closest(".composer-shell")
    ) {
      if (event.target === composerPanel) {
        closeComposer(true);
      }
    }

    const fullscreenPanel = document.getElementById("fullscreenPanel");
    if (
      fullscreenPanel &&
      !fullscreenPanel.classList.contains("hidden") &&
      !event.target.closest(".fullscreen-panel-shell")
    ) {
      if (event.target === fullscreenPanel) {
        closeFullscreenOverlay();
      }
    }

    const suggestionsPanel = document.getElementById("suggestionsPanel");
    if (
      suggestionsPanel &&
      !suggestionsPanel.classList.contains("hidden") &&
      !event.target.closest(".fullscreen-panel-shell")
    ) {
      if (event.target === suggestionsPanel) {
        closeSuggestionsOverlay();
      }
    }

    const recordDrawer = document.getElementById("recordDrawer");
    const recordDrawerBackdrop = document.getElementById("recordDrawerBackdrop");
    if (event.target === recordDrawerBackdrop) {
      closeRecordDrawerOverlay();
    }
    if (
      recordDrawer &&
      !recordDrawer.classList.contains("hidden") &&
      event.target === recordDrawer
    ) {
      closeRecordDrawerOverlay();
    }

    const mobileNavBackdrop = document.getElementById("mobileNavBackdrop");
    if (event.target === mobileNavBackdrop) {
      closeMobileNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    closeAllWorkspaceMenus();
    closeAssistantOverlay();
    closeFullscreenOverlay();
    closeSuggestionsOverlay();
    closeRecordDrawerOverlay();
    closeMobileNav();
    closeComposer(true);
  });
}

async function runAssistantScopeSync() {
  try {
    await onAssistantScopeChanged();
  } catch (error) {
    console.error("[nav] assistant scope change failed", error);
  }
}

function paintNavigationChrome() {
  renderNavigation();
  markActiveNav(getCurrentSection());
  markActiveScopeButtons();
  updateSectionChrome(getCurrentSection());
  updateYoungPersonChrome(state.selectedYoungPerson || {});
}

async function applyScopeChange(scope) {
  const safeScope =
    scope === "home" || scope === "quality" || scope === "child"
      ? scope
      : "child";

  setCurrentScope(safeScope);
  ensureValidCurrentSection();
  paintNavigationChrome();
  clearStatus();
  resetWorkspaceSummaryStrip();

  if (safeScope === "child" && !requireChildContext()) {
    try {
      await loadYoungPersonSelector();
      showSelectorScreen();
      renderAssistantControllerPanels();
    } catch (error) {
      showError(error?.message || "Unable to load young people.");
    }
    return;
  }

  showWorkspaceScreen();
  await runAssistantScopeSync();
  renderAssistantControllerPanels();
  await loadSection(getCurrentSection());
}

export async function loadSection(section, options = {}) {
  const scope = getCurrentScope();
  const safeSection = isSectionAllowed(section, scope)
    ? section
    : getDefaultSectionForScope(scope);

  if (loadingSectionPromise && safeSection === getCurrentSection()) {
    return loadingSectionPromise;
  }

  if (scope === "child" && !requireChildContext()) {
    showError("Select a child or young person first.");
    showSelectorScreen();
    resetWorkspaceSummaryStrip();
    renderAssistantControllerPanels();
    return;
  }

  const loader = SECTION_LOADERS[safeSection] || PLACEHOLDER_LOADER;

  updateSectionState(safeSection);
  showWorkspaceScreen();
  paintNavigationChrome();
  clearStatus();
  resetWorkspaceSummaryStrip();

  loadingSectionPromise = (async () => {
    try {
      await loader(options);
      closeMobileNav();
      closeAllWorkspaceMenus();
      renderAssistantControllerPanels();
    } catch (error) {
      console.error(`[nav] failed loading section "${safeSection}"`, error);
      showError(error?.message || "Failed to load this section.");
      resetWorkspaceSummaryStrip();
    } finally {
      loadingSectionPromise = null;
    }
  })();

  return loadingSectionPromise;
}

export async function reloadCurrentSection(options = {}) {
  await loadSection(ensureValidCurrentSection(), options);
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

function bindScopeSwitch() {
  if (scopeSwitchBound) return;
  scopeSwitchBound = true;

  els.scopeChildBtn?.addEventListener("click", async () => {
    await applyScopeChange("child");
  });

  els.scopeHomeBtn?.addEventListener("click", async () => {
    await applyScopeChange("home");
  });

  els.scopeQualityBtn?.addEventListener("click", async () => {
    await applyScopeChange("quality");
  });
}

function bindSelectorControls() {
  if (selectorControlsBound) return;
  selectorControlsBound = true;

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
      showError(error?.message || "Failed to refresh children and young people.");
    }
  });
}

function bindComposerControls() {
  if (composerControlsBound) return;
  composerControlsBound = true;

  els.closeComposerBtn?.addEventListener("click", () => {
    closeComposer(true);
  });

  const handleSaveThenRefresh = async (mode, successMessage) => {
    try {
      await saveComposer(mode);
      showMessage(successMessage);
      await reloadCurrentSection();
      await refreshAssistantAnalysisOnly();
      renderAssistantControllerPanels();
    } catch (error) {
      console.error("[nav] composer action failed", error);
      showError(error?.message || "Could not save record.");
    }
  };

  els.composerSaveBtn?.addEventListener("click", async () => {
    await handleSaveThenRefresh("draft", "Draft saved.");
  });

  els.composerSaveDraftBtn?.addEventListener("click", async () => {
    await handleSaveThenRefresh("draft", "Draft saved.");
  });

  els.composerSubmitBtn?.addEventListener("click", async () => {
    await handleSaveThenRefresh("submit", "Record sent for review.");
  });
}

function bindRefreshControls() {
  if (refreshControlsBound) return;
  refreshControlsBound = true;

  const refresh = async () => {
    try {
      await onWorkspaceRefreshRequested();
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

function bindSearchControls() {
  if (searchControlsBound) return;
  searchControlsBound = true;

  let activeSearchRequest = 0;

  const clearSearchState = async () => {
    const query =
      document.getElementById("recordSearchInput")?.value ||
      document.getElementById("mobileRecordSearchInput")?.value ||
      "";
    const recordType =
      document.getElementById("recordTypeFilter")?.value || "";

    if (String(query).trim() || String(recordType).trim()) return;

    try {
      await reloadCurrentSection();
    } catch (error) {
      console.error("[nav] failed reloading section after clearing search", error);
    }
  };

  document.addEventListener("indicared:record-search-changed", async (event) => {
    const requestId = ++activeSearchRequest;

    const detail = event?.detail || {};
    const query = String(detail.query || "").trim();
    const recordType = String(detail.recordType || "").trim();
    const scope = String(detail.scope || getCurrentScope()).trim();
    const section = String(detail.section || getCurrentSection()).trim();

    if (scope !== getCurrentScope()) return;
    if (section && section !== getCurrentSection()) return;

    if (!query && !recordType) {
      await clearSearchState();
      return;
    }

    try {
      const currentLoader = SECTION_LOADERS[getCurrentSection()];

      if (typeof currentLoader === "function") {
        await currentLoader({
          search: {
            query,
            record_type: recordType,
          },
        });
      } else {
        showMessage(`Search ready: "${escapeHtml(query || recordType)}"`);
      }

      if (requestId !== activeSearchRequest) return;
    } catch (error) {
      console.error("[nav] search event handling failed", error);
      showError(error?.message || "Search failed.");
    }
  });
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
      setCurrentScope("child");
      updateSectionState(getDefaultSectionForScope("child"));
      await openYoungPerson(id);

      showWorkspaceScreen();
      paintNavigationChrome();
      clearStatus();
      resetWorkspaceSummaryStrip();
      await runAssistantScopeSync();
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
        await refreshAssistantAnalysisOnly();
        renderAssistantControllerPanels();
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
      showError("Select a child or young person first.");
    },
    onMissingHomeContext: () => {
      showError("Load a home context first.");
    },
  });
}

export function bindNavEvents() {
  if (shellEventsBound) return;
  shellEventsBound = true;

  bindAssistantController();
  bindSelectorControls();
  bindComposerControls();
  bindRefreshControls();
  bindSearchControls();
  bindOpenRecordEvents();
  bindYoungPersonOpen();
  bindDrawerCallbacks();
  bindQuickActionRouter();
  bindScopeSwitch();
  bindWorkspaceMenuBehaviour();
  bindWorkspaceMenuLinks();
  bindOverlayDismiss();

  if (!suggestionsBound) {
    bindSuggestionEvents();
    suggestionsBound = true;
  }
}

export function rerenderNavigationForScope() {
  ensureValidCurrentSection();
  paintNavigationChrome();
  renderAssistantControllerPanels();
}

export async function initialiseShellNavigation() {
  if (!state.currentSection) {
    setCurrentSection(getDefaultSectionForScope());
  }

  if (!state.activeSection) {
    state.activeSection = state.currentSection;
  }

  state.currentView = state.currentSection;
  ensureValidCurrentSection();

  bindAssistantController();
  renderNavigation();
  bindNavButtons();
  bindNavEvents();

  markActiveNav(getCurrentSection());
  markActiveScopeButtons();
  updateSectionChrome(getCurrentSection());
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  renderAssistantControllerPanels();

  if (isChildScope() && !requireChildContext()) {
    try {
      await loadYoungPersonSelector();
      showSelectorScreen();
      resetWorkspaceSummaryStrip();
      renderAssistantControllerPanels();
    } catch (error) {
      console.error("[nav] selector load failed", error);
      showError(error?.message || "Unable to load children and young people.");
    }
    return;
  }

  try {
    showWorkspaceScreen();
    await runAssistantScopeSync();
    await loadSection(getCurrentSection());
  } catch (error) {
    console.error("[nav] initial section load failed", error);
    showError(error?.message || "Failed to load this section.");
    resetWorkspaceSummaryStrip();
  }
}

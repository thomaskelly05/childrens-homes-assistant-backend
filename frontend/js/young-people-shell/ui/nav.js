import { state, setCurrentScope, setCurrentSection } from "../state.js";
import { els } from "../dom.js";
import {
  NAV_SECTIONS,
  NAV_GROUPS_CONFIG,
  SCOPE_SECTIONS,
  SCOPE_DEFAULT_SECTION,
  ROLE_SCOPE_ACCESS,
  canRoleAccessScope,
} from "../core/config.js";
import { escapeHtml } from "../core/utils.js";

import {
  openYoungPerson,
  loadYoungPersonSelector,
  filterSelectorList,
} from "./selector.js";
import { bindRecordDrawerEvents } from "./records.js";
import { closeComposer, saveComposer } from "./composer.js";
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
import { loadCurrentView as loadAdmission } from "../features/admission.js";
import { loadProfile } from "../features/profile.js";
import { loadTimeline } from "../features/timeline.js";
import { loadHandover } from "../features/handover.js";
import { loadCurrentView as loadDailyLife } from "../features/daily-life.js";
import { loadHealth } from "../features/health.js";
import { loadCurrentView as loadMedication } from "../features/medication.js";
import { loadEducation } from "../features/education.js";
import { loadFamily } from "../features/family.js";
import { loadCalendar } from "../features/calendar.js";
import { loadTherapy } from "../features/therapy.js";
import { loadRisk } from "../features/risk.js";
import { loadCurrentView as loadSafeguarding } from "../features/safeguarding.js";
import { loadCurrentView as loadMissingFromCare } from "../features/missing.js";
import { loadReadiness } from "../features/readiness.js";
import { loadCurrentView as loadReviews } from "../features/reviews.js";
import { loadReports } from "../features/reports.js";
import { loadCurrentView as loadLeavingCare } from "../features/leaving-care.js";
import { loadManager } from "../features/manager.js";
import { loadCurrentView as loadWorkspace } from "../features/workspace.js";
import { loadActions } from "../features/actions.js";

import { loadHomeDashboard } from "../features/home-dashboard.js";
import { loadOperations } from "../features/operations.js";
import { loadTeam } from "../features/team.js";
import { loadRota } from "../features/rota.js";
import { loadStaffProfile } from "../features/staff-profile.js";
import { loadOnboarding } from "../features/onboarding.js";
import { loadSupervision } from "../features/supervision.js";
import { loadTrainingCentre } from "../features/training-centre.js";
import { loadCompliance } from "../features/compliance.js";
import { loadHealthSafety } from "../features/health-safety.js";
import { loadNotifications } from "../features/notifications.js";
import { loadQualityDashboard } from "../features/quality.js";
import { loadDocuments } from "../features/documents.js";
import { loadCommunication } from "../features/communication.js";

import { loadProviderOverview } from "../features/provider-overview.js";
import { loadQualityAudits } from "../features/quality-audits.js";
import { loadReg44 } from "../features/reg44.js";
import { loadReg45 } from "../features/reg45.js";
import { loadOfstedDashboard } from "../features/ofsted-dashboard.js";
import { loadSccifEvidence } from "../features/sccif-evidence.js";
import { loadJudgementBuilder } from "../features/judgement-builder.js";

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
  child: ["workspace", "timeline", "actions", "risk", "reviews"],
  home: ["home-dashboard", "actions", "compliance", "team", "rota"],
  quality: ["provider-overview", "actions", "quality", "compliance", "quality-audits"],
  ofsted: ["ofsted-dashboard", "actions", "sccif-evidence", "judgement-builder", "inspection-readiness"],
};

const SECTION_SCOPE_MAP = {
  workspace: "child",
  overview: "child",
  admission: "child",
  profile: "child",
  timeline: "child",
  handover: "child",
  "daily-life": "child",
  health: "child",
  medication: "child",
  education: "child",
  family: "child",
  calendar: "child",
  therapy: "child",
  risk: "child",
  safeguarding: "child",
  "missing-from-care": "child",
  readiness: "child",
  reviews: "child",
  reports: "child",
  "leaving-care": "child",
  manager: "child",
  documents: "child",
  communication: "child",
  actions: "child",

  "home-dashboard": "home",
  operations: "home",
  team: "home",
  rota: "home",
  "staff-profile": "home",
  onboarding: "home",
  supervision: "home",
  "training-centre": "home",
  compliance: "home",
  "health-safety": "home",
  maintenance: "home",
  notifications: "home",
  policies: "home",

  "provider-overview": "quality",
  quality: "quality",
  "quality-audits": "quality",
  reg44: "quality",
  reg45: "quality",

  "ofsted-dashboard": "ofsted",
  "ofsted-readiness": "ofsted",
  "inspection-readiness": "ofsted",
  "sccif-evidence": "ofsted",
  "judgement-builder": "ofsted",
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
let scopeSwitchBound = false;
let workspaceMenusBound = false;
let overlayDismissBound = false;
let workspaceMenuLinksBound = false;
let assistantControllerBound = false;

let currentLoadToken = 0;
let currentLoadPromise = null;
let currentLoadKey = "";

function getNavIcon(icon) {
  return ICON_MAP[icon] || "•";
}

function normaliseRole(role) {
  const raw = String(role || "staff").trim().toLowerCase();

  if (["admin", "administrator", "super_admin", "superadmin", "owner"].includes(raw)) {
    return "admin";
  }

  if (["manager", "registered_manager", "deputy_manager", "rm"].includes(raw)) {
    return "manager";
  }

  if (["ri", "responsible_individual", "director", "ceo"].includes(raw)) {
    return "ri";
  }

  return "staff";
}

function getCurrentRole() {
  return normaliseRole(state.userRole || state.currentUser?.role || "staff");
}

function getAllowedScopesForCurrentRole() {
  const role = getCurrentRole();

  if (ROLE_SCOPE_ACCESS?.[role]) {
    return ROLE_SCOPE_ACCESS[role];
  }

  if (["admin", "manager", "ri"].includes(role)) {
    return ["child", "home", "quality", "ofsted"];
  }

  return ["child", "home"];
}

function roleCanAccessScope(scope) {
  const safeScope = String(scope || "child").trim().toLowerCase();

  if (typeof canRoleAccessScope === "function") {
    return canRoleAccessScope(getCurrentRole(), safeScope);
  }

  return getAllowedScopesForCurrentRole().includes(safeScope);
}

function getCurrentScope() {
  const raw = String(state.currentScope || "child").trim().toLowerCase();
  return ["child", "home", "quality", "ofsted"].includes(raw) ? raw : "child";
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

function getSectionConfig(sectionId) {
  return (NAV_SECTIONS || []).find((item) => item.id === sectionId) || null;
}

function getSectionLabel(itemOrId) {
  if (!itemOrId) return "";
  if (typeof itemOrId === "string") {
    return getSectionConfig(itemOrId)?.label || itemOrId;
  }
  return itemOrId.label || itemOrId.id || "";
}

function getSectionDescription(itemOrId) {
  if (!itemOrId) return "";
  if (typeof itemOrId === "string") {
    const found = getSectionConfig(itemOrId);
    return found?.description || found?.label || itemOrId;
  }
  return itemOrId.description || itemOrId.label || itemOrId.id || "";
}

function isChildScope() {
  return getCurrentScope() === "child";
}

function shouldShowDesktopSidebar() {
  return getCurrentScope() !== "child";
}

function isReadinessSection(sectionId) {
  return ["readiness", "ofsted-readiness", "inspection-readiness"].includes(
    String(sectionId || "")
  );
}

function getRequiredScopeForSection(sectionId) {
  return SECTION_SCOPE_MAP[String(sectionId || "").trim().toLowerCase()] || getCurrentScope();
}

function getAllowedSectionIdsForScope(scope = getCurrentScope()) {
  const allowedByConfig = new Set(
    SCOPE_SECTIONS?.[scope] || SCOPE_SECTIONS?.child || ["workspace"]
  );

  const loaders = getLoaderMapForScope(scope);
  return new Set(
    Array.from(allowedByConfig).filter((sectionId) => typeof loaders[sectionId] === "function")
  );
}

function isSectionAllowed(sectionId, scope = getCurrentScope()) {
  if (!sectionId) return false;
  if (!roleCanAccessScope(scope)) return false;
  return getAllowedSectionIdsForScope(scope).has(sectionId);
}

function findBestScopeForSection(sectionId) {
  const wantedScope = getRequiredScopeForSection(sectionId);

  if (
    roleCanAccessScope(wantedScope) &&
    getAllowedSectionIdsForScope(wantedScope).has(sectionId)
  ) {
    return wantedScope;
  }

  return null;
}

function updateAppShellDataset() {
  const app = document.getElementById("app");
  if (!app) return;

  const scope = getCurrentScope();
  const section = getCurrentSection();

  app.dataset.scope = scope;
  app.dataset.section = section;
  app.dataset.assistantScopeType =
    scope === "child" ? "child" : scope === "home" ? "home" : "quality";

  app.dataset.youngPersonId = state.youngPersonId || "";
  app.dataset.homeId =
    state.homeId ||
    state.selectedYoungPerson?.home_id ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    "";
  app.dataset.providerId =
    state.providerId ||
    state.currentUser?.provider_id ||
    state.currentUser?.providerId ||
    "";
  app.dataset.userRole = getCurrentRole();
  app.dataset.allowedHomeIds = JSON.stringify(
    Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : []
  );
}

function updateSectionState(section) {
  setCurrentSection(section);
  state.activeSection = section;
  state.currentView = section;
  updateAppShellDataset();
}

function ensureValidCurrentScope() {
  const scope = getCurrentScope();

  if (roleCanAccessScope(scope)) return scope;

  const fallback = getAllowedScopesForCurrentRole()[0] || "child";
  setCurrentScope(fallback);
  return fallback;
}

function ensureValidCurrentSection() {
  const scope = ensureValidCurrentScope();
  const current = getCurrentSection();

  if (isSectionAllowed(current, scope)) {
    return current;
  }

  const fallback = getDefaultSectionForScope(scope);
  const allowed = getAllowedSectionIdsForScope(scope);
  const safeFallback = allowed.has(fallback)
    ? fallback
    : Array.from(allowed)[0] || "workspace";

  updateSectionState(safeFallback);
  return safeFallback;
}

function getScopedNavGroups() {
  const scope = getCurrentScope();
  const allowed = getAllowedSectionIdsForScope(scope);

  return (NAV_GROUPS_CONFIG || [])
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => allowed.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}

function getScopedNavSections() {
  const scope = getCurrentScope();
  const allowed = getAllowedSectionIdsForScope(scope);
  return (NAV_SECTIONS || []).filter((item) => allowed.has(item.id));
}

function getMobileBottomSections() {
  const scope = getCurrentScope();
  return MOBILE_BOTTOM_BY_SCOPE[scope] || MOBILE_BOTTOM_BY_SCOPE.child;
}

async function runPlaceholderLoader(options = {}) {
  const { renderPlaceholderFeaturePage } = await import(
    "../features/placeholder.js"
  );

  const section = options.section || getCurrentSection();
  const config = getSectionConfig(section);

  await renderPlaceholderFeaturePage({
    title: config?.label || "Coming soon",
    description:
      config?.description ||
      "This area has been scaffolded and is ready for live feature wiring next.",
    section,
    scope: getCurrentScope(),
  });
}

const CHILD_SECTION_LOADERS = Object.freeze({
  workspace: loadWorkspace,
  overview: loadOverview,
  admission: loadAdmission,
  profile: loadProfile,
  timeline: loadTimeline,
  handover: loadHandover,
  "daily-life": loadDailyLife,
  health: loadHealth,
  medication: loadMedication,
  education: loadEducation,
  family: loadFamily,
  calendar: loadCalendar,
  therapy: loadTherapy,
  risk: loadRisk,
  safeguarding: loadSafeguarding,
  "missing-from-care": loadMissingFromCare,
  readiness: loadReadiness,
  reviews: loadReviews,
  reports: loadReports,
  "leaving-care": loadLeavingCare,
  documents: loadDocuments,
  communication: loadCommunication,
  manager: loadManager,
  actions: loadActions,
});

const HOME_SECTION_LOADERS = Object.freeze({
  "home-dashboard": loadHomeDashboard,
  operations: loadOperations,
  calendar: loadCalendar,
  team: loadTeam,
  rota: loadRota,
  "staff-profile": loadStaffProfile,
  onboarding: loadOnboarding,
  supervision: loadSupervision,
  "training-centre": loadTrainingCentre,
  compliance: loadCompliance,
  "health-safety": loadHealthSafety,
  maintenance: runPlaceholderLoader,
  notifications: loadNotifications,
  policies: runPlaceholderLoader,
  actions: loadActions,
});

const QUALITY_SECTION_LOADERS = Object.freeze({
  "provider-overview": loadProviderOverview,
  quality: loadQualityDashboard,
  "quality-audits": loadQualityAudits,
  compliance: loadCompliance,
  reg44: loadReg44,
  reg45: loadReg45,
  "inspection-readiness": loadReadiness,
  reports: loadReports,
  actions: loadActions,
});

const OFSTED_SECTION_LOADERS = Object.freeze({
  "ofsted-dashboard": loadOfstedDashboard,
  "sccif-evidence": loadSccifEvidence,
  "judgement-builder": loadJudgementBuilder,
  "inspection-readiness": loadReadiness,
  compliance: loadCompliance,
  actions: loadActions,
});

function getLoaderMapForScope(scope = getCurrentScope()) {
  if (scope === "home") return HOME_SECTION_LOADERS;
  if (scope === "quality") return QUALITY_SECTION_LOADERS;
  if (scope === "ofsted") return OFSTED_SECTION_LOADERS;
  return CHILD_SECTION_LOADERS;
}

function getLoaderForSection(scope, section) {
  const scopeLoaders = getLoaderMapForScope(scope);
  return scopeLoaders[section] || null;
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
        <section class="nav-section" data-nav-group="${escapeHtml(group.id || "")}">
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
  updateAppShellDataset();
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
  const allowedScopes = getAllowedScopesForCurrentRole();

  const pairs = [
    [els.scopeChildBtn, "child"],
    [els.scopeHomeBtn, "home"],
    [els.scopeQualityBtn, "quality"],
    [els.scopeOfstedBtn, "ofsted"],
  ];

  pairs.forEach(([button, value]) => {
    if (!button) return;

    const visible = allowedScopes.includes(value);
    const isActive = scope === value;

    button.classList.toggle("hidden", !visible);
    button.classList.toggle("active", visible && isActive);
    button.setAttribute("aria-hidden", visible ? "false" : "true");
    button.setAttribute("aria-pressed", visible && isActive ? "true" : "false");
    button.setAttribute("aria-selected", visible && isActive ? "true" : "false");
    button.disabled = !visible;
  });
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

    if (!navSection) return;

    event.preventDefault();
    event.stopPropagation();

    const targetScope = findBestScopeForSection(navSection);

    if (!targetScope) {
      showError(`This area is not available for your current role or is not wired yet.`);
      closeAllWorkspaceMenus();
      return;
    }

    if (targetScope !== getCurrentScope()) {
      await applyScopeChange(targetScope, { preferredSection: navSection });
      closeAllWorkspaceMenus();
      return;
    }

    await loadSection(navSection);
    closeAllWorkspaceMenus();
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

    const composerPanel =
      document.getElementById("composerPanel") ||
      document.getElementById("recordComposerPage");

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

async function applyScopeChange(scope, options = {}) {
  const safeScope = ["child", "home", "quality", "ofsted"].includes(scope)
    ? scope
    : "child";

  if (!roleCanAccessScope(safeScope)) {
    showError(`Your current role does not have access to the ${safeScope} area.`);
    return;
  }

  closeAllWorkspaceMenus();
  closeMobileNav();

  setCurrentScope(safeScope);

  if (safeScope !== "child" && !state.readinessSelectedHomeId) {
    state.readinessSelectedHomeId =
      state.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      null;
  }

  const preferredSection = options.preferredSection;
  if (preferredSection && isSectionAllowed(preferredSection, safeScope)) {
    updateSectionState(preferredSection);
  } else {
    ensureValidCurrentSection();
  }

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
  await loadSection(getCurrentSection(), { force: true });
}

export async function loadSection(section, options = {}) {
  const requestedSection = String(section || "").trim();
  let scope = getCurrentScope();

  if (!roleCanAccessScope(scope)) {
    scope = ensureValidCurrentScope();
  }

  let safeSection = requestedSection;

  if (!isSectionAllowed(safeSection, scope)) {
    const betterScope = findBestScopeForSection(safeSection);

    if (betterScope && betterScope !== scope) {
      await applyScopeChange(betterScope, {
        preferredSection: safeSection,
      });
      return;
    }

    safeSection = ensureValidCurrentSection();
  }

  if (!isSectionAllowed(safeSection, scope)) {
    showError(`This area is not available yet: ${safeSection || "unknown"}.`);
    return;
  }

  const force = Boolean(options.force);
  const loadKey = `${scope}:${safeSection}`;
  const loadToken = ++currentLoadToken;

  if (scope === "child" && !requireChildContext()) {
    showError("Select a child or young person first.");
    showSelectorScreen();
    resetWorkspaceSummaryStrip();
    renderAssistantControllerPanels();
    return;
  }

  if (!force && currentLoadPromise && currentLoadKey === loadKey) {
    return currentLoadPromise;
  }

  const loader = getLoaderForSection(scope, safeSection);

  if (typeof loader !== "function") {
    showError(`No loader is configured for "${safeSection}" in ${scope} scope.`);
    return;
  }

  updateSectionState(safeSection);
  showWorkspaceScreen();
  paintNavigationChrome();
  clearStatus();
  resetWorkspaceSummaryStrip();
  closeAllWorkspaceMenus();

  currentLoadKey = loadKey;

  currentLoadPromise = (async () => {
    try {
      await loader({
        ...options,
        section: safeSection,
        scope,
      });

      if (loadToken !== currentLoadToken) return;

      closeMobileNav();

      if (isReadinessSection(safeSection)) {
        state.currentView = safeSection;
      }

      renderAssistantControllerPanels();
    } catch (error) {
      if (loadToken !== currentLoadToken) return;

      console.error(`[nav] failed loading section "${safeSection}"`, error);
      showError(error?.message || "Failed to load this section.");
      resetWorkspaceSummaryStrip();
    } finally {
      if (loadToken === currentLoadToken) {
        currentLoadPromise = null;
        currentLoadKey = "";
      }
    }
  })();

  return currentLoadPromise;
}

export async function reloadCurrentSection(options = {}) {
  await loadSection(ensureValidCurrentSection(), { ...options, force: true });
}

function bindNavButtons() {
  if (navButtonsBound) return;
  navButtonsBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-nav-section]");
    if (!button) return;

    if (button.classList.contains("workspace-menu-link")) return;

    const section = button.dataset.navSection;
    if (!section) return;

    event.preventDefault();
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

  els.scopeOfstedBtn?.addEventListener("click", async () => {
    await applyScopeChange("ofsted");
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
      showError(
        error?.message || "Failed to refresh children and young people."
      );
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
      console.error(
        "[nav] failed reloading section after clearing search",
        error
      );
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
      const currentLoader = getLoaderForSection(
        getCurrentScope(),
        getCurrentSection()
      );

      if (typeof currentLoader === "function") {
        await currentLoader({
          section: getCurrentSection(),
          scope: getCurrentScope(),
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

function parseRecordPayload(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw || raw === "true" || raw === "1") return null;

  const attempts = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) {
      attempts.push(decoded);
    }
  } catch {
    // noop
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // noop
    }
  }

  return null;
}

function pickRecordText(trigger, selector) {
  const node = trigger.querySelector(selector);
  return node?.textContent?.trim() || "";
}

function buildRecordItemFromTrigger(trigger) {
  const dataset = trigger?.dataset || {};
  const payload =
    parseRecordPayload(dataset.recordPayload) ||
    parseRecordPayload(dataset.openRecord);

  const idValue =
    dataset.recordId ||
    dataset.id ||
    payload?.record_id ||
    payload?.source_id ||
    payload?.id ||
    null;

  if (!idValue) return null;

  const numericId = Number(idValue);
  const safeId = Number.isNaN(numericId) ? idValue : numericId;

  const type = String(
    dataset.recordType || payload?.record_type || payload?.type || ""
  ).trim();

  const title =
    dataset.recordTitle ||
    dataset.title ||
    payload?.title ||
    payload?.name ||
    pickRecordText(trigger, ".record-row-title");

  const summary =
    dataset.recordSummary ||
    payload?.summary ||
    payload?.description ||
    pickRecordText(trigger, ".record-row-summary");

  const status =
    dataset.recordStatus ||
    payload?.workflow_status ||
    payload?.status ||
    "";

  const dateValue =
    dataset.recordDate ||
    payload?.due_date ||
    payload?.record_date ||
    payload?.event_datetime ||
    payload?.contact_datetime ||
    payload?.session_date ||
    payload?.review_date ||
    payload?.created_at ||
    payload?.updated_at ||
    "";

  const item = {
    ...(payload && typeof payload === "object" ? payload : {}),
    id: payload?.id ?? safeId,
    source_id: payload?.source_id ?? safeId,
    record_id: payload?.record_id ?? safeId,
    record_type: type || payload?.record_type || "",
    title: title || "",
  };

  if (summary && !item.summary) item.summary = summary;
  if (status && !item.status) item.status = status;
  if (status && !item.workflow_status) item.workflow_status = status;
  if (dateValue && !item.record_date) item.record_date = dateValue;

  if (dataset.recordPriority && !item.priority) {
    item.priority = dataset.recordPriority;
  }

  if (dataset.recordSeverity && !item.severity) {
    item.severity = dataset.recordSeverity;
  }

  if (dataset.recordOwner && !item.owner_name) {
    item.owner_name = dataset.recordOwner;
  }

  if (dataset.sourceTable && !item.source_table) {
    item.source_table = dataset.sourceTable;
  }

  if (dataset.sourceId && !item.source_id) {
    item.source_id = dataset.sourceId;
  }

  return item;
}

function bindOpenRecordEvents() {
  if (recordEventsBound || !els.viewContent) return;
  recordEventsBound = true;

  els.viewContent.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-record-id], [data-open-record]");
    if (!trigger) return;

    const recordItem = buildRecordItemFromTrigger(trigger);
    if (!recordItem) return;

    try {
      state.activeRecordType = recordItem.record_type || null;
      state.activeRecordItem = recordItem;

      const { openRecordDetail } = await import("./records.js");
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
      await loadSection(getCurrentSection(), { force: true });
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

function ensureAssistantControllerBound() {
  if (assistantControllerBound) return;
  assistantControllerBound = true;
  bindAssistantController();
}

export function bindNavEvents() {
  if (shellEventsBound) return;
  shellEventsBound = true;

  ensureAssistantControllerBound();
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
}

export function rerenderNavigationForScope() {
  ensureValidCurrentSection();
  paintNavigationChrome();
  renderAssistantControllerPanels();
}

export async function initialiseShellNavigation() {
  ensureAssistantControllerBound();

  ensureValidCurrentScope();

  if (!state.currentSection) {
    setCurrentSection(getDefaultSectionForScope());
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

  showWorkspaceScreen();
  await runAssistantScopeSync();
}

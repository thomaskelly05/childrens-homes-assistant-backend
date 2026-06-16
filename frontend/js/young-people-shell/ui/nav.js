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

import { loadCurrentView as loadWorkspace } from "../features/workspace.js";
import { loadOverview } from "../features/overview.js";
import renderExperienceIntelligence from "../features/experience-intelligence.js";
import { loadProfile } from "../features/profile.js";
import { loadTimeline } from "../features/timeline.js";
import { loadHandover } from "../features/handover.js";
import { loadHealth } from "../features/health.js";
import { loadEducation } from "../features/education.js";
import { loadFamily } from "../features/family.js";
import { loadCalendar } from "../features/calendar.js";
import { loadTherapy } from "../features/therapy.js";
import { loadRisk } from "../features/risk.js";
import { loadReadiness } from "../features/readiness.js";
import { loadReports } from "../features/reports.js";
import { loadManager } from "../features/manager.js";
import { loadActions } from "../features/actions.js";

import { loadCurrentView as loadAdmission } from "../features/admission.js";
import { loadCurrentView as loadDailyLife } from "../features/daily-life.js";
import { loadCurrentView as loadMedication } from "../features/medication.js";
import { loadCurrentView as loadSafeguarding } from "../features/safeguarding.js";
import { loadCurrentView as loadMissingFromCare } from "../features/missing.js";
import { loadCurrentView as loadReviews } from "../features/reviews.js";
import { loadCurrentView as loadLeavingCare } from "../features/leaving-care.js";

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
import { loadDocuments } from "../features/documents.js";
import { loadCommunication } from "../features/communication.js";

import { loadProviderOverview } from "../features/provider-overview.js";
import { loadQualityDashboard } from "../features/quality.js";
import { loadQualityAudits } from "../features/quality-audits.js";
import { loadReg44 } from "../features/reg44.js";
import { loadReg45 } from "../features/reg45.js";
import { loadOfstedDashboard } from "../features/ofsted-dashboard.js";
import { loadSccifEvidence } from "../features/sccif-evidence.js";
import { loadJudgementBuilder } from "../features/judgement-builder.js";

const VALID_SCOPES = new Set(["child", "home", "quality", "ofsted"]);

const CORE_CHILD_SECTIONS = new Set([
  "timeline",
  "daily-life",
  "daily-notes",
  "incidents",
]);

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

const SECTION_ALIASES = Object.freeze({
  home: "workspace",
  myday: "workspace",
  "my-day": "workspace",
  dashboard: "workspace",
});

const MOBILE_BOTTOM_BY_SCOPE = {
  child: ["workspace", "timeline", "actions", "risk", "reviews"],
  home: ["home-dashboard", "operations", "actions", "team", "rota"],
  quality: [
    "provider-overview",
    "quality",
    "actions",
    "compliance",
    "quality-audits",
  ],
  ofsted: [
    "ofsted-dashboard",
    "sccif-evidence",
    "judgement-builder",
    "inspection-readiness",
    "actions",
  ],
};

const SECTION_SCOPE_MAP = {
  home: "child",
  workspace: "child",
  overview: "child",
  "experience-intelligence": "child",
  admission: "child",
  profile: "child",
  timeline: "child",
  handover: "child",
  "daily-life": "child",
  "daily-notes": "child",
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
  documents: "child",
  communication: "child",
  manager: "child",
  actions: "child",
  incidents: "child",

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
  "inspection-readiness": "ofsted",
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
let requestedSectionLock = "";

function normaliseRole(role) {
  const raw = String(role || "staff").trim().toLowerCase();

  if (
    [
      "admin",
      "administrator",
      "super_admin",
      "superadmin",
      "owner",
      "admin_user",
      "system_admin",
    ].includes(raw)
  ) {
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

function normaliseSectionId(sectionId) {
  const raw = String(sectionId || "").trim().toLowerCase();
  return SECTION_ALIASES[raw] || raw;
}

function getCurrentRole() {
  return normaliseRole(state.userRole || state.currentUser?.role || "staff");
}

function getAllowedScopesForCurrentRole() {
  const role = getCurrentRole();

  if (ROLE_SCOPE_ACCESS?.[role]) return ROLE_SCOPE_ACCESS[role];

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
  return VALID_SCOPES.has(raw) ? raw : "child";
}

function getDefaultSectionForScope(scope = getCurrentScope()) {
  return normaliseSectionId(SCOPE_DEFAULT_SECTION?.[scope] || "workspace");
}

function getCurrentSection() {
  return normaliseSectionId(
    state.currentSection ||
      state.activeSection ||
      state.currentView ||
      getDefaultSectionForScope()
  );
}

function getSectionConfig(sectionId) {
  const safeSection = normaliseSectionId(sectionId);

  return (
    (NAV_SECTIONS || []).find(
      (item) => normaliseSectionId(item.id) === safeSection
    ) || null
  );
}

function getSectionLabel(itemOrId) {
  if (!itemOrId) return "";

  if (typeof itemOrId === "string") {
    return getSectionConfig(itemOrId)?.label || normaliseSectionId(itemOrId);
  }

  return itemOrId.label || itemOrId.id || "";
}

function getSectionDescription(itemOrId) {
  if (!itemOrId) return "";

  if (typeof itemOrId === "string") {
    const found = getSectionConfig(itemOrId);
    return found?.description || found?.label || normaliseSectionId(itemOrId);
  }

  return itemOrId.description || itemOrId.label || itemOrId.id || "";
}

function getNavIcon(icon) {
  return ICON_MAP[icon] || "•";
}

function isChildScope() {
  return getCurrentScope() === "child";
}

function shouldShowDesktopSidebar() {
  return getCurrentScope() !== "child";
}

function isReadinessSection(sectionId) {
  return ["readiness", "inspection-readiness", "inspection-readiness"].includes(
    String(sectionId || "")
  );
}

function getRequiredScopeForSection(sectionId) {
  return SECTION_SCOPE_MAP[normaliseSectionId(sectionId)] || getCurrentScope();
}

async function runPlaceholderLoader(options = {}) {
  const { renderPlaceholderFeaturePage } = await import(
    "../features/placeholder.js"
  );

  const section = normaliseSectionId(options.section || getCurrentSection());
  const config = getSectionConfig(section);

  await renderPlaceholderFeaturePage({
    title: config?.label || "Coming soon",
    description:
      config?.description ||
      "This area is ready in the OS shell but has not been connected to live records yet.",
    section,
    scope: getCurrentScope(),
  });
}

const CHILD_SECTION_LOADERS = Object.freeze({
  home: loadWorkspace,
  workspace: loadWorkspace,
  overview: loadOverview,
  "experience-intelligence": renderExperienceIntelligence,
  admission: loadAdmission,
  profile: loadProfile,
  timeline: loadTimeline,
  handover: loadHandover,
  "daily-life": loadDailyLife,
  "daily-notes": loadDailyLife,
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
  const safeSection = normaliseSectionId(section);
  return getLoaderMapForScope(scope)[safeSection] || null;
}

function getAllowedSectionIdsForScope(scope = getCurrentScope()) {
  const configured = new Set(
    (SCOPE_SECTIONS?.[scope] || []).map(normaliseSectionId)
  );

  const loaders = getLoaderMapForScope(scope);

  Object.entries(loaders).forEach(([sectionId, loader]) => {
    if (typeof loader === "function") {
      configured.add(normaliseSectionId(sectionId));
    }
  });

  if (scope === "child") {
    [
      "workspace",
      "timeline",
      "daily-life",
      "daily-notes",
      "incidents",
      "risk",
      "safeguarding",
      "health",
      "education",
      "family",
      "calendar",
      "appointments",
      "profile",
      "actions",
      "reviews",
    ].forEach((sectionId) => configured.add(sectionId));
  }

  return configured;
}

function isSectionAllowed(sectionId, scope = getCurrentScope()) {
  const safeSection = normaliseSectionId(sectionId);

  if (!safeSection) return false;
  if (!roleCanAccessScope(scope)) return false;

  if (scope === "child" && CORE_CHILD_SECTIONS.has(safeSection)) return true;

  return getAllowedSectionIdsForScope(scope).has(safeSection);
}

function findBestScopeForSection(sectionId) {
  const safeSection = normaliseSectionId(sectionId);
  const required = getRequiredScopeForSection(safeSection);

  if (
    roleCanAccessScope(required) &&
    getAllowedSectionIdsForScope(required).has(safeSection)
  ) {
    return required;
  }

  if (required === "child" && CORE_CHILD_SECTIONS.has(safeSection)) {
    return "child";
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
  const safeSection = normaliseSectionId(section);

  state.currentSection = safeSection;
  state.activeSection = safeSection;
  state.currentView = safeSection;

  setCurrentSection(safeSection);

  const app = document.getElementById("app");
  if (app) {
    app.dataset.section = safeSection;
    app.dataset.scope = getCurrentScope();
  }

  updateAppShellDataset();
}

function forceSectionState(section) {
  const safeSection = normaliseSectionId(section);
  if (!safeSection) return;

  updateSectionState(safeSection);

  const app = document.getElementById("app");
  if (app) app.dataset.section = safeSection;

  markActiveNav(safeSection);
}

function stabiliseRequestedSection(section, token) {
  const safeSection = normaliseSectionId(section);
  requestedSectionLock = safeSection;

  [0, 80, 200, 500, 900].forEach((delay) => {
    window.setTimeout(() => {
      if (token !== currentLoadToken) return;
      if (requestedSectionLock !== safeSection) return;
      forceSectionState(safeSection);
    }, delay);
  });
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

  if (isSectionAllowed(current, scope)) return current;

  const defaultSection = getDefaultSectionForScope(scope);
  const allowed = getAllowedSectionIdsForScope(scope);
  const safeSection = allowed.has(defaultSection)
    ? defaultSection
    : Array.from(allowed)[0] || "workspace";

  updateSectionState(safeSection);
  return safeSection;
}

function getScopedNavSections() {
  const scope = getCurrentScope();
  const allowed = getAllowedSectionIdsForScope(scope);

  return (NAV_SECTIONS || []).filter((item) =>
    allowed.has(normaliseSectionId(item.id))
  );
}

function getScopedNavGroups() {
  const allowed = getAllowedSectionIdsForScope(getCurrentScope());

  return (NAV_GROUPS_CONFIG || [])
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) =>
        allowed.has(normaliseSectionId(item.id))
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function getMobileBottomSections() {
  return MOBILE_BOTTOM_BY_SCOPE[getCurrentScope()] || MOBILE_BOTTOM_BY_SCOPE.child;
}

function renderNavItem(item, { compact = false } = {}) {
  const safeId = normaliseSectionId(item.id);
  const isActive = safeId === getCurrentSection();
  const label = getSectionLabel(item);
  const description = getSectionDescription(item);
  const meta = compact
    ? ""
    : `<span class="nav-btn-meta">${escapeHtml(description)}</span>`;

  return `
    <button
      class="nav-btn ${isActive ? "active" : ""}"
      type="button"
      data-nav-section="${escapeHtml(safeId)}"
      data-nav-key="${escapeHtml(safeId)}"
      data-view-key="${escapeHtml(safeId)}"
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
  return getScopedNavSections().map((item) => renderNavItem(item)).join("");
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
  const byId = new Map(
    getScopedNavSections().map((item) => [normaliseSectionId(item.id), item])
  );

  return getMobileBottomSections()
    .map((sectionId) => {
      const safeSection = normaliseSectionId(sectionId);
      const item = byId.get(safeSection);
      if (!item) return "";

      const isActive = safeSection === getCurrentSection();

      return `
        <button
          class="nav-btn ${isActive ? "active" : ""}"
          type="button"
          data-nav-section="${escapeHtml(safeSection)}"
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

  workspaceShell?.classList.toggle("has-sidebar", showSidebar);

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
  const current = getCurrentSection();
  const scope = getCurrentScope();

  if (!(scope === "child" && CORE_CHILD_SECTIONS.has(current))) {
    ensureValidCurrentSection();
  }

  if (els.desktopNav) els.desktopNav.innerHTML = buildDesktopNavHtml();

  if (els.mobileNavContent) {
    els.mobileNavContent.innerHTML = buildMobileDrawerNavHtml();
  }

  if (els.mobileBottomBar) {
    els.mobileBottomBar.innerHTML = buildMobileBottomBarHtml();
  }

  if (els.mobileBottomNav && els.mobileBottomNav !== els.mobileBottomBar) {
    els.mobileBottomNav.innerHTML = buildMobileBottomBarHtml();
  }

  syncDesktopSidebarChrome();
  updateAppShellDataset();
}

function showWorkspaceScreen() {
  els.selectorPanel?.classList.add("hidden");
  els.selectorScreen?.classList.add("hidden");
  els.workspacePanel?.classList.remove("hidden");
  els.workspaceScreen?.classList.remove("hidden");

  els.selectorPanel?.setAttribute("aria-hidden", "true");
  els.selectorScreen?.setAttribute("aria-hidden", "true");
  els.workspacePanel?.setAttribute("aria-hidden", "false");
  els.workspaceScreen?.setAttribute("aria-hidden", "false");
}

function showSelectorScreen() {
  els.workspacePanel?.classList.add("hidden");
  els.workspaceScreen?.classList.add("hidden");
  els.selectorPanel?.classList.remove("hidden");
  els.selectorScreen?.classList.remove("hidden");

  els.workspacePanel?.setAttribute("aria-hidden", "true");
  els.workspaceScreen?.setAttribute("aria-hidden", "true");
  els.selectorPanel?.setAttribute("aria-hidden", "false");
  els.selectorScreen?.setAttribute("aria-hidden", "false");
}

export function showError(message) {
  const text = escapeHtml(message || "Something went wrong.");

  if (els.statusMessage) {
    els.statusMessage.textContent = "";
    els.statusMessage.innerHTML = text;
    els.statusMessage.classList.remove("hidden");
  }

  els.statusBar?.classList.remove("hidden");
}

export function showMessage(message) {
  const text = escapeHtml(message || "");

  if (els.statusMessage) {
    els.statusMessage.textContent = "";
    els.statusMessage.innerHTML = text;
    els.statusMessage.classList.remove("hidden");
  }

  els.statusBar?.classList.remove("hidden");
}

export function clearStatus() {
  if (els.statusMessage) {
    els.statusMessage.innerHTML = "";
    els.statusMessage.classList.add("hidden");
  }

  els.statusBar?.classList.add("hidden");
}

function markActiveNav(section) {
  const safeSection = normaliseSectionId(section);

  document.querySelectorAll("[data-nav-section], [data-view]").forEach((button) => {
    const buttonSection = normaliseSectionId(
      button.dataset.navSection || button.dataset.view || ""
    );

    const isActive = buttonSection === safeSection;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function markActiveScopeButtons() {
  const scope = getCurrentScope();
  const allowedScopes = getAllowedScopesForCurrentRole();

  [
    [els.scopeChildBtn, "child"],
    [els.scopeHomeBtn, "home"],
    [els.scopeQualityBtn, "quality"],
    [els.scopeOfstedBtn, "ofsted"],
  ].forEach(([button, value]) => {
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
    if (!event.target.closest(".workspace-menubar")) closeAllWorkspaceMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllWorkspaceMenus();
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
  const safeScope = VALID_SCOPES.has(scope) ? scope : "child";

  if (!roleCanAccessScope(safeScope)) {
    showError(`Your current role does not have access to the ${safeScope} area.`);
    return;
  }

  closeAllWorkspaceMenus();
  closeMobileNav();

  setCurrentScope(safeScope);

  if (!["child"].includes(safeScope) && !state.readinessSelectedHomeId) {
    state.readinessSelectedHomeId =
      state.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      null;
  }

  if (
    options.preferredSection &&
    isSectionAllowed(options.preferredSection, safeScope)
  ) {
    updateSectionState(options.preferredSection);
  } else {
    ensureValidCurrentSection();
  }

  paintNavigationChrome();
  clearStatus();
  resetWorkspaceSummaryStrip();

  if (safeScope === "child" && !requireChildContext()) {
    await loadYoungPersonSelector();
    showSelectorScreen();
    renderAssistantControllerPanels();
    return;
  }

  showWorkspaceScreen();
  await runAssistantScopeSync();
  renderAssistantControllerPanels();
  await loadSection(getCurrentSection(), { force: true });
}

function bindWorkspaceMenuLinks() {
  if (workspaceMenuLinksBound) return;
  workspaceMenuLinksBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".workspace-menu-link");
    if (!button) return;

    const actionRouter = button.dataset.actionRouter;
    const navSection = button.dataset.navSection || button.dataset.view;

    if (actionRouter) {
      closeAllWorkspaceMenus();
      return;
    }

    if (!navSection) return;

    event.preventDefault();
    event.stopPropagation();

    const safeSection = normaliseSectionId(navSection);
    const targetScope = findBestScopeForSection(safeSection);

    if (!targetScope) {
      showError("This area is not available for your current role or is not wired yet.");
      closeAllWorkspaceMenus();
      return;
    }

    if (targetScope !== getCurrentScope()) {
      await applyScopeChange(targetScope, { preferredSection: safeSection });
      closeAllWorkspaceMenus();
      return;
    }

    await loadSection(safeSection, { force: true });
    closeAllWorkspaceMenus();
  });
}

function closeAssistantOverlay() {
  state.assistantOpen = false;
  const modal = document.getElementById("assistantModal");
  const backdrop = document.getElementById("assistantBackdrop");

  modal?.classList.add("hidden");
  backdrop?.classList.add("hidden");
  modal?.setAttribute("aria-hidden", "true");
  backdrop?.setAttribute("aria-hidden", "true");
}

function closeFullscreenOverlay() {
  state.fullscreenPanelOpen = false;
  const panel = document.getElementById("fullscreenPanel");

  panel?.classList.add("hidden");
  panel?.setAttribute("aria-hidden", "true");
}

function closeSuggestionsOverlay() {
  const panel = document.getElementById("suggestionsPanel");

  panel?.classList.add("hidden");
  panel?.setAttribute("aria-hidden", "true");
}

function closeRecordDrawerOverlay() {
  state.recordDrawerOpen = false;
  const drawer = document.getElementById("recordDrawer");
  const backdrop = document.getElementById("recordDrawerBackdrop");

  drawer?.classList.add("hidden");
  backdrop?.classList.add("hidden");
  drawer?.setAttribute("aria-hidden", "true");
  backdrop?.setAttribute("aria-hidden", "true");
}

function bindOverlayDismiss() {
  if (overlayDismissBound) return;
  overlayDismissBound = true;

  document.addEventListener("click", (event) => {
    const assistantModal = document.getElementById("assistantModal");

    if (
      assistantModal &&
      !assistantModal.classList.contains("hidden") &&
      !event.target.closest(".assistant-shell") &&
      (event.target === assistantModal || event.target.id === "assistantBackdrop")
    ) {
      closeAssistantOverlay();
    }

    const fullscreenPanel = document.getElementById("fullscreenPanel");

    if (
      fullscreenPanel &&
      !fullscreenPanel.classList.contains("hidden") &&
      !event.target.closest(".fullscreen-panel-shell") &&
      event.target === fullscreenPanel
    ) {
      closeFullscreenOverlay();
    }

    const suggestionsPanel = document.getElementById("suggestionsPanel");

    if (
      suggestionsPanel &&
      !suggestionsPanel.classList.contains("hidden") &&
      !event.target.closest(".fullscreen-panel-shell") &&
      event.target === suggestionsPanel
    ) {
      closeSuggestionsOverlay();
    }

    const drawer = document.getElementById("recordDrawer");
    const drawerBackdrop = document.getElementById("recordDrawerBackdrop");

    if (event.target === drawerBackdrop) closeRecordDrawerOverlay();

    if (drawer && !drawer.classList.contains("hidden") && event.target === drawer) {
      closeRecordDrawerOverlay();
    }

    if (event.target === document.getElementById("mobileNavBackdrop")) {
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
  });
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    ""
  );
}

function setCoreLoadingState(section) {
  const safeSection = normaliseSectionId(section);

  if (els.pageTitle) {
    els.pageTitle.textContent =
      safeSection === "timeline"
        ? "Care story timeline"
        : safeSection === "incidents"
          ? "Important events"
          : "Daily life";
  }

  if (els.pageSubtitle) {
    els.pageSubtitle.textContent = "Opening live records for this child.";
  }

  if (els.viewContent) {
    els.viewContent.innerHTML = `
      <section class="overview-panel overview-panel--care">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">○</div>
            <h3>Loading ${escapeHtml(safeSection)} records…</h3>
            <p>Opening live records for this child.</p>
          </div>
        </div>
      </section>
    `;
  }
}

function normaliseItemsFromResponse(data, section) {
  if (!data || typeof data !== "object") return [];

  const safeSection = normaliseSectionId(section);

  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.timeline)) return data.timeline;
  if (Array.isArray(data.daily_notes)) return data.daily_notes;
  if (Array.isArray(data.incidents)) return data.incidents;
  if (Array.isArray(data[safeSection])) return data[safeSection];

  return [];
}

async function renderCoreSectionFallback(section) {
  const safeSection = normaliseSectionId(section);
  const youngPersonId = getYoungPersonId();

  if (!els.viewContent) return false;

  const routeMap = {
    timeline: `/young-people/${youngPersonId}/timeline`,
    "daily-life": `/young-people/${youngPersonId}/daily-notes`,
    "daily-notes": `/young-people/${youngPersonId}/daily-notes`,
    incidents: `/young-people/${youngPersonId}/incidents`,
  };

  const titleMap = {
    timeline: "Care story timeline",
    "daily-life": "Daily life",
    "daily-notes": "Daily life",
    incidents: "Important events",
  };

  if (!youngPersonId) {
    els.viewContent.innerHTML = `
      <section class="overview-panel overview-panel--care">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">○</div>
            <h3>Select a child or young person first</h3>
            <p>This section needs a child record before live records can open.</p>
          </div>
        </div>
      </section>
    `;
    return false;
  }

  const url = routeMap[safeSection];
  if (!url) return false;

  let items = [];
  let loadFailed = false;

  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      loadFailed = true;
    } else {
      const data = await res.json();
      items = normaliseItemsFromResponse(data, safeSection);
    }
  } catch (error) {
    console.error(`[nav] failed fetching core section "${safeSection}"`, error);
    loadFailed = true;
  }

  forceSectionState(safeSection);

  if (els.pageTitle) els.pageTitle.textContent = titleMap[safeSection] || safeSection;

  if (els.pageSubtitle) {
    els.pageSubtitle.textContent = loadFailed
      ? "The section opened, but live records could not be fetched."
      : `${items.length} record${items.length === 1 ? "" : "s"} loaded from live records.`;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel overview-panel--care" data-core-section="${escapeHtml(
      safeSection
    )}">
      <div class="overview-section-head">
        <div>
          <div class="eyebrow">Live records</div>
          <h2>${escapeHtml(titleMap[safeSection] || safeSection)}</h2>
          <p>${
            loadFailed
              ? "Unable to load live records from the API."
              : `${items.length} record${items.length === 1 ? "" : "s"} found.`
          }</p>
        </div>
      </div>

      <div class="record-list">
        ${
          items.length
            ? items
                .map((item) => {
                  const id = String(
                    item.id || item.record_id || item.source_id || item.note_id || ""
                  );

                  const type =
                    item.record_type ||
                    item.type ||
                    item.category ||
                    safeSection;

                  const title =
                    item.title ||
                    item.subject ||
                    item.heading ||
                    item.category ||
                    type ||
                    "Record";

                  const summary =
                    item.summary ||
                    item.note ||
                    item.description ||
                    item.narrative ||
                    item.body ||
                    item.details ||
                    "No summary available.";

                  const date =
                    item.event_datetime ||
                    item.occurred_at ||
                    item.note_date ||
                    item.incident_datetime ||
                    item.created_at ||
                    item.updated_at ||
                    "";

                  return `
                    <article
                      class="record-card"
                      data-record-id="${escapeHtml(id)}"
                      data-record-type="${escapeHtml(type)}"
                      tabindex="0"
                      role="button"
                    >
                      <div class="record-card-main">
                        <div class="eyebrow">${escapeHtml(type)}</div>
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(summary)}</p>
                      </div>
                      <div class="record-card-meta">${escapeHtml(date)}</div>
                    </article>
                  `;
                })
                .join("")
            : `
              <div class="empty-state">
                <div class="empty-state-inner">
                  <div class="empty-state-icon" aria-hidden="true">○</div>
                  <h3>${loadFailed ? "Records could not be loaded" : "No records found"}</h3>
                  <p>${
                    loadFailed
                      ? "The page is now in the correct section, but the API request failed."
                      : "No live records were returned for this section."
                  }</p>
                </div>
              </div>
            `
        }
      </div>
    </section>
  `;

  forceSectionState(safeSection);
  return !loadFailed;
}

export async function loadSection(section, options = {}) {
  const requestedSection = normaliseSectionId(section || "");
  let scope = getCurrentScope();

  if (!roleCanAccessScope(scope)) {
    scope = ensureValidCurrentScope();
  }

  let safeSection = requestedSection || getDefaultSectionForScope(scope);
  const requiredScope = getRequiredScopeForSection(safeSection);

  if (requiredScope && requiredScope !== scope && roleCanAccessScope(requiredScope)) {
    scope = requiredScope;
    setCurrentScope(requiredScope, { resetSection: false });
    updateAppShellDataset();
  }

  if (!isSectionAllowed(safeSection, scope)) {
    const betterScope = findBestScopeForSection(safeSection);

    if (betterScope && betterScope !== scope) {
      await applyScopeChange(betterScope, { preferredSection: safeSection });
      return;
    }

    safeSection = ensureValidCurrentSection();
  }

  if (!isSectionAllowed(safeSection, scope)) {
    showError(`This area is not available yet: ${safeSection || "unknown"}.`);
    return;
  }

  if (scope === "child" && !requireChildContext()) {
    showError("Select a child or young person first.");
    showSelectorScreen();
    resetWorkspaceSummaryStrip();
    renderAssistantControllerPanels();
    return;
  }

  const force = Boolean(options.force);
  const loadKey = `${scope}:${safeSection}`;
  const loadToken = ++currentLoadToken;

  requestedSectionLock = safeSection;

  if (!force && currentLoadPromise && currentLoadKey === loadKey) {
    return currentLoadPromise;
  }

  updateSectionState(safeSection);
  showWorkspaceScreen();
  clearStatus();

  if (els.viewContent) {
    els.viewContent.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading ${escapeHtml(safeSection)}…</p>
        </div>
      </div>
    `;
  }

  resetWorkspaceSummaryStrip();
  closeAllWorkspaceMenus();

  currentLoadKey = loadKey;

  if (scope === "child" && CORE_CHILD_SECTIONS.has(safeSection)) {
    forceSectionState(safeSection);
    setCoreLoadingState(safeSection);
    stabiliseRequestedSection(safeSection, loadToken);
  } else {
    paintNavigationChrome();
  }

  currentLoadPromise = (async () => {
    try {
      if (scope === "child" && CORE_CHILD_SECTIONS.has(safeSection)) {
        await renderCoreSectionFallback(safeSection);
        stabiliseRequestedSection(safeSection, loadToken);
      } else {
        const loader = getLoaderForSection(scope, safeSection);

        if (typeof loader !== "function") {
          showError(`No loader is configured for "${safeSection}" in ${scope} scope.`);
          return;
        }

        await loader({
          ...options,
          section: safeSection,
          scope,
        });
      }

      if (loadToken !== currentLoadToken) return;

      closeMobileNav();

      if (isReadinessSection(safeSection)) {
        state.currentView = safeSection;
      }

      if (scope === "child" && CORE_CHILD_SECTIONS.has(safeSection)) {
        forceSectionState(safeSection);
      } else {
        paintNavigationChrome();
      }

      renderAssistantControllerPanels();
    } catch (error) {
      if (loadToken !== currentLoadToken) return;

      console.error(`[nav] failed loading section "${safeSection}"`, error);
      showError(error?.message || "Failed to load this section.");
      resetWorkspaceSummaryStrip();

      if (scope === "child" && CORE_CHILD_SECTIONS.has(safeSection)) {
        await renderCoreSectionFallback(safeSection);
      }
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
  await loadSection(getCurrentSection(), { ...options, force: true });
}

function bindNavButtons() {
  if (navButtonsBound) return;
  navButtonsBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-nav-section], [data-view]");
    if (!button) return;
    if (button.classList.contains("workspace-menu-link")) return;

    const section = button.dataset.navSection || button.dataset.view;
    if (!section) return;

    event.preventDefault();
    await loadSection(section, { force: true });
  });
}

function bindScopeSwitch() {
  if (scopeSwitchBound) return;
  scopeSwitchBound = true;

  els.scopeChildBtn?.addEventListener("click", async () => applyScopeChange("child"));
  els.scopeHomeBtn?.addEventListener("click", async () => applyScopeChange("home"));
  els.scopeQualityBtn?.addEventListener("click", async () =>
    applyScopeChange("quality")
  );
  els.scopeOfstedBtn?.addEventListener("click", async () =>
    applyScopeChange("ofsted")
  );
}

function bindSelectorControls() {
  if (selectorControlsBound) return;
  selectorControlsBound = true;

  [els.youngPersonSearchInput, els.selectorSearch].filter(Boolean).forEach((input) => {
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
  if (state.composerEventsBound) return;
  composerControlsBound = true;

  els.closeComposerBtn?.addEventListener("click", () => closeComposer());

  const saveThenRefresh = async (mode, successMessage) => {
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

  els.composerSaveBtn?.addEventListener("click", async () =>
    saveThenRefresh("draft", "Draft saved.")
  );

  els.composerSaveDraftBtn?.addEventListener("click", async () =>
    saveThenRefresh("draft", "Draft saved.")
  );

  els.composerSubmitBtn?.addEventListener("click", async () =>
    saveThenRefresh("submit", "Record sent for review.")
  );
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

  const handler = async (event) => {
    const requestId = ++activeSearchRequest;
    const detail = event?.detail || {};
    const query = String(detail.query || "").trim();
    const recordType = String(detail.recordType || "").trim();
    const scope = String(detail.scope || getCurrentScope()).trim();
    const section = normaliseSectionId(detail.section || getCurrentSection());

    if (scope !== getCurrentScope()) return;
    if (section && section !== getCurrentSection()) return;

    if (!query && !recordType) {
      await reloadCurrentSection();
      return;
    }

    try {
      const currentLoader = getLoaderForSection(getCurrentScope(), getCurrentSection());

      if (typeof currentLoader === "function") {
        await currentLoader({
          section: getCurrentSection(),
          scope: getCurrentScope(),
          search: { query, record_type: recordType },
        });
      }

      if (requestId !== activeSearchRequest) return;
    } catch (error) {
      console.error("[nav] search event handling failed", error);
      showError(error?.message || "Search failed.");
    }
  };

  document.addEventListener("indicare:record-search-changed", handler);
}

function parseRecordPayload(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw || raw === "true" || raw === "1") return null;

  const attempts = [raw];

  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) attempts.push(decoded);
  } catch {
    // No-op.
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // No-op.
    }
  }

  return null;
}

function pickRecordText(trigger, selector) {
  return trigger.querySelector(selector)?.textContent?.trim() || "";
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

  const item = {
    ...(payload && typeof payload === "object" ? payload : {}),
    id: payload?.id ?? safeId,
    source_id: payload?.source_id ?? safeId,
    record_id: payload?.record_id ?? safeId,
    record_type: dataset.recordType || payload?.record_type || payload?.type || "",
    title:
      dataset.recordTitle ||
      dataset.title ||
      payload?.title ||
      payload?.name ||
      pickRecordText(trigger, ".record-row-title") ||
      "Record",
  };

  const summary =
    dataset.recordSummary ||
    payload?.summary ||
    payload?.description ||
    pickRecordText(trigger, ".record-row-summary");

  if (summary && !item.summary) item.summary = summary;

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
      await openRecordDetail(recordItem);
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
      setCurrentScope("child", { resetSection: false });
      updateSectionState("workspace");

      await openYoungPerson(id, {
        initialSection: "workspace",
        skipInitialSectionLoad: true,
      });

      showWorkspaceScreen();
      paintNavigationChrome();
      clearStatus();
      resetWorkspaceSummaryStrip();
      await runAssistantScopeSync();
      await loadSection("workspace", { force: true });
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
    onMissingYoungPerson: () => showError("Select a child or young person first."),
    onMissingHomeContext: () => showError("Load a home context first."),
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
    state.activeSection = normaliseSectionId(state.currentSection);
  }

  state.currentView = normaliseSectionId(state.currentSection || "workspace");

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
  await loadSection(getCurrentSection(), { force: true });
}

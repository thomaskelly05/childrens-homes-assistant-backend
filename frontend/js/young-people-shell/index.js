import {
  state,
  setCurrentScope,
  setCurrentSection,
  clearSelectedYoungPerson,
  setHomeContext,
  setProviderContext,
  setAllowedHomeIds,
  setUserRole,
  setCurrentUserContext,
  initialiseStateGuards,
} from "./state.js";

import { els, refreshEls } from "./dom.js";
import { setYoungPersonIdInUrl } from "./core/utils.js";

import {
  initialiseShellNavigation,
  showError,
  loadSection,
  rerenderNavigationForScope,
} from "./ui/nav.js";
import { bindComposerEvents } from "./ui/composer.js";

import { loadYoungPersonSelector, openYoungPerson } from "./ui/selector.js";

import { bindShellChrome, refreshShellChrome } from "./ui/shell-ui.js";
import { bindAssistantUi, refreshAssistantUi } from "./ui/assistant-ui.js";

import {
  bindAssistantEvents,
  updateAssistantContext,
  renderAssistantInsights,
  renderAssistantMessages,
} from "./ui/assistant.js";

import { refreshWorkspaceSummary } from "./ui/workspace-summary-controller.js";

import {
  ROLE_SCOPE_ACCESS,
  SCOPE_DEFAULT_SECTION,
  SCOPE_SECTIONS,
  getDefaultScopeForRole as getConfigDefaultScopeForRole,
  canRoleAccessScope,
} from "./core/config.js";

let scopeEventsBound = false;
let bootstrapped = false;
let globalSearchMirrorsBound = false;
let globalRefreshShortcutsBound = false;
let changePersonFallbackBound = false;
let restrictedSectionGuardBound = false;
let openCareHubFallbackBound = false;
let workspaceNavigationFallbackBound = false;
let launchReadinessBound = false;
let osNavigationBound = false;
let therapeuticPromptBound = false;
let nightShiftBound = false;

const ADMIN_LIKE_ROLES = new Set([
  "administrator",
  "admin",
  "super_admin",
  "superadmin",
  "admin_user",
  "system_admin",
  "owner",
]);

const MANAGER_LIKE_ROLES = new Set([
  "manager",
  "registered_manager",
  "deputy_manager",
  "rm",
]);

const RI_LIKE_ROLES = new Set([
  "ri",
  "responsible_individual",
  "director",
  "ceo",
]);

const STAFF_LIKE_ROLES = new Set([
  "rsw",
  "residential_support_worker",
  "staff",
]);

const SECTION_ALIASES = Object.freeze({
  home: "workspace",
  dashboard: "workspace",
  myday: "workspace",
  "my-day": "workspace",
});

const VIEW_SECTION_MAP = Object.freeze({
  home: "workspace",
  timeline: "timeline",
  profile: "profile",
  risk: "risk",
  manager: "manager",
  health: "health",
  education: "education",
  family: "family",
  appointments: "appointments",
  compliance: "compliance",
  evidence: "sccif-evidence",
});

const CORE_CHILD_SECTIONS = new Set([
  "workspace",
  "profile",
  "timeline",
  "daily-life",
  "daily-notes",
  "incidents",
  "risk",
  "safeguarding",
  "missing-from-care",
  "health",
  "education",
  "family",
  "appointments",
  "actions",
  "admission",
  "reviews",
  "transition",
  "leaving-care",
  "medication",
  "manager",
  "sccif-evidence",
  "compliance",
]);

function byId(id) {
  return document.getElementById(id);
}

function normaliseRole(role) {
  const rawRole = String(role || "staff").toLowerCase().trim();

  if (ADMIN_LIKE_ROLES.has(rawRole)) return "admin";
  if (MANAGER_LIKE_ROLES.has(rawRole)) return "manager";
  if (RI_LIKE_ROLES.has(rawRole)) return "ri";
  if (STAFF_LIKE_ROLES.has(rawRole)) return "staff";

  return "staff";
}

function normaliseSection(section) {
  const raw = String(section || "").trim().toLowerCase();
  return SECTION_ALIASES[raw] || raw || "workspace";
}

function normaliseNumericId(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function toIdArray(value) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    ),
  ];
}

function parseAllowedHomeIds(rawValue) {
  if (!rawValue) return [];

  try {
    return toIdArray(JSON.parse(rawValue));
  } catch {
    return String(rawValue)
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
  }
}

function readSessionUser() {
  try {
    const raw =
      sessionStorage.getItem("current_user") ||
      localStorage.getItem("current_user");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionUser(user) {
  try {
    if (!user) {
      sessionStorage.removeItem("current_user");
      return;
    }

    sessionStorage.setItem("current_user", JSON.stringify(user));
  } catch {
    // Ignore storage failure.
  }
}

function formatTime(value = new Date()) {
  try {
    return value.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function showWorkspace() {
  refreshEls();

  els.selectorPanel?.classList.add("hidden");
  els.selectorScreen?.classList.add("hidden");
  els.workspacePanel?.classList.remove("hidden");
  els.workspaceScreen?.classList.remove("hidden");

  els.selectorPanel?.setAttribute("aria-hidden", "true");
  els.selectorScreen?.setAttribute("aria-hidden", "true");
  els.workspacePanel?.setAttribute("aria-hidden", "false");
  els.workspaceScreen?.setAttribute("aria-hidden", "false");
}

function showSelector() {
  refreshEls();

  els.workspacePanel?.classList.add("hidden");
  els.workspaceScreen?.classList.add("hidden");
  els.selectorPanel?.classList.remove("hidden");
  els.selectorScreen?.classList.remove("hidden");

  els.workspacePanel?.setAttribute("aria-hidden", "true");
  els.workspaceScreen?.setAttribute("aria-hidden", "true");
  els.selectorPanel?.setAttribute("aria-hidden", "false");
  els.selectorScreen?.setAttribute("aria-hidden", "false");

  syncLaunchReadinessStrip();
}

function getCurrentSection() {
  return normaliseSection(
    state.currentSection || state.activeSection || state.currentView || "workspace"
  );
}

function setSectionSafe(section) {
  const safeSection = normaliseSection(section);

  setCurrentSection(safeSection);
  state.currentSection = safeSection;
  state.activeSection = safeSection;
  state.currentView = safeSection;

  syncDomDatasetFromState();

  return safeSection;
}

function getCurrentRole() {
  return normaliseRole(state.userRole || state.currentUser?.role || "staff");
}

function getAllowedScopesForRole() {
  const role = getCurrentRole();

  if (ROLE_SCOPE_ACCESS?.[role]) {
    return ROLE_SCOPE_ACCESS[role];
  }

  if (["admin", "manager", "ri"].includes(role)) {
    return ["child", "home", "quality", "ofsted"];
  }

  return ["child", "home"];
}

function canAccessScope(scope) {
  return canRoleAccessScope(getCurrentRole(), scope);
}

function getDefaultScopeForRole() {
  return getConfigDefaultScopeForRole(getCurrentRole());
}

function getDefaultSectionForScope(scope = state.currentScope || "child") {
  return normaliseSection(SCOPE_DEFAULT_SECTION?.[scope] || "workspace");
}

function getAllowedSectionsForScope(scope = state.currentScope || "child") {
  return SCOPE_SECTIONS?.[scope] || SCOPE_SECTIONS?.child || ["workspace"];
}

function isSectionAllowedInScope(section = "", scope = state.currentScope || "child") {
  const safeSection = normaliseSection(section);
  const safeScope = String(scope || "child").trim().toLowerCase();

  if (safeScope === "child" && CORE_CHILD_SECTIONS.has(safeSection)) {
    return true;
  }

  return getAllowedSectionsForScope(safeScope)
    .map(normaliseSection)
    .includes(safeSection);
}

function getRequiredScopeForSection(section = "") {
  const value = normaliseSection(section);

  const qualitySections = new Set([
    "quality",
    "provider-overview",
    "quality-audits",
    "reg44",
    "reg45",
  ]);

  const ofstedSections = new Set([
    "ofsted",
    "ofsted-dashboard",
    "inspection-readiness",
    "inspection-readiness",
    "sccif-evidence",
    "judgement-builder",
    "evidence",
  ]);

  const homeSections = new Set([
    "home-dashboard",
    "operations",
    "rota",
    "team",
    "staff-profile",
    "onboarding",
    "supervision",
    "training-centre",
    "notifications",
    "health-safety",
    "maintenance",
    "policies",
  ]);

  if (ofstedSections.has(value)) return "ofsted";
  if (qualitySections.has(value)) return "quality";
  if (homeSections.has(value)) return "home";

  return "child";
}

function syncSingleHomeFallback() {
  if (
    !state.homeId &&
    Array.isArray(state.allowedHomeIds) &&
    state.allowedHomeIds.length === 1
  ) {
    setHomeContext(state.allowedHomeIds[0]);
  }
}

function hydrateRuntimeContextFromDom() {
  refreshEls();

  if (!els.app) return;

  const datasetRole = normaliseRole(els.app.dataset.userRole || "");
  const datasetScope = String(els.app.dataset.scope || "").trim().toLowerCase();
  const datasetSection = normaliseSection(els.app.dataset.section || "");
  const datasetHomeId = normaliseNumericId(els.app.dataset.homeId);
  const datasetProviderId = normaliseNumericId(els.app.dataset.providerId);
  const datasetAllowedHomeIds = els.app.dataset.allowedHomeIds || "";
  const datasetYoungPersonId = normaliseNumericId(els.app.dataset.youngPersonId);

  setUserRole(datasetRole);
  setHomeContext(datasetHomeId);
  setProviderContext(datasetProviderId);
  setAllowedHomeIds(parseAllowedHomeIds(datasetAllowedHomeIds));

  if (datasetScope) {
    setCurrentScope(datasetScope, { resetSection: false });
  }

  if (datasetSection) {
    setSectionSafe(datasetSection);
  }

  if (datasetYoungPersonId) {
    state.youngPersonId = datasetYoungPersonId;
  }

  syncSingleHomeFallback();
}

function hydrateRuntimeContextFromSession() {
  const currentUser = readSessionUser();
  if (!currentUser) return;

  setCurrentUserContext(currentUser);

  const sessionRole = normaliseRole(
    currentUser.role ||
      currentUser.user_role ||
      currentUser.account_type ||
      currentUser.role_name
  );

  const sessionHomeId = normaliseNumericId(
    currentUser.home_id || currentUser.homeId || null
  );

  const sessionProviderId = normaliseNumericId(
    currentUser.provider_id || currentUser.providerId || null
  );

  const allowedHomes = toIdArray(
    currentUser.allowed_home_ids ||
      currentUser.allowedHomeIds ||
      currentUser.home_ids ||
      currentUser.homeIds ||
      []
  );

  setUserRole(sessionRole);
  setHomeContext(sessionHomeId);
  setProviderContext(sessionProviderId);

  if (currentUser.user_id || currentUser.id) {
    state.userId = currentUser.user_id || currentUser.id;
  }

  if (currentUser.staff_id) {
    state.staffId = currentUser.staff_id;
  }

  if (allowedHomes.length) {
    setAllowedHomeIds(allowedHomes);
  } else if (sessionHomeId) {
    setAllowedHomeIds([sessionHomeId]);
  }

  syncSingleHomeFallback();
}

async function hydrateRuntimeContextFromAuthCheck() {
  try {
    const response = await fetch("/auth/check", {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return;

    const auth = await response.json();
    if (!auth || auth.authenticated !== true) return;

    setCurrentUserContext(auth);
    writeSessionUser(auth);

    if (auth.user_id || auth.id) {
      state.userId = auth.user_id || auth.id;
    }

    if (auth.staff_id) {
      state.staffId = auth.staff_id;
    }

    const role = normaliseRole(auth.role || auth.user_role || auth.role_name);
    const authHomeId = normaliseNumericId(auth.home_id || auth.homeId || null);
    const authProviderId = normaliseNumericId(
      auth.provider_id || auth.providerId || null
    );

    const allowedHomes = toIdArray(
      auth.allowed_home_ids ||
        auth.allowedHomeIds ||
        auth.home_ids ||
        auth.homeIds ||
        []
    );

    setUserRole(role);
    setHomeContext(authHomeId);
    setProviderContext(authProviderId);

    if (allowedHomes.length) {
      setAllowedHomeIds(allowedHomes);
    } else if (authHomeId) {
      setAllowedHomeIds([authHomeId]);
    }

    syncSingleHomeFallback();
  } catch (error) {
    console.error("[index] auth context hydration failed", error);
  }
}

function syncDomDatasetFromState() {
  refreshEls();

  if (!els.app) return;

  const scope = state.currentScope || "child";
  const section = getCurrentSection();

  els.app.dataset.userRole = normaliseRole(state.userRole || "staff");
  els.app.dataset.scope = scope;
  els.app.dataset.section = section;
  els.app.dataset.homeId = state.homeId ? String(state.homeId) : "";
  els.app.dataset.youngPersonId = state.youngPersonId
    ? String(state.youngPersonId)
    : "";
  els.app.dataset.providerId = state.providerId ? String(state.providerId) : "";
  els.app.dataset.allowedHomeIds = JSON.stringify(
    Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : []
  );

  els.app.dataset.assistantScopeType =
    scope === "home"
      ? "home"
      : scope === "quality" || scope === "ofsted"
        ? "quality"
        : "child";

  syncLaunchReadinessStrip();
}

function forceChildEntryMode() {
  setCurrentScope("child", { resetSection: false });
  setSectionSafe("workspace");
  clearSelectedYoungPerson();
  state.youngPersonId = null;
  setYoungPersonIdInUrl(null);
  syncDomDatasetFromState();
}

function ensureValidScopeForRole() {
  const allowedScopes = getAllowedScopesForRole();
  const currentScope = state.currentScope || "child";

  if (!allowedScopes.includes(currentScope)) {
    setCurrentScope(getDefaultScopeForRole(), { resetSection: false });
  }
}

function ensureInitialSectionForScope() {
  const scope = state.currentScope || "child";
  const currentSection = getCurrentSection();

  if (isSectionAllowedInScope(currentSection, scope)) {
    setSectionSafe(currentSection);
    return currentSection;
  }

  const fallback = getDefaultSectionForScope(scope);
  setSectionSafe(fallback);
  return fallback;
}

function syncScopeButtons() {
  const scope = state.currentScope || "child";
  const allowedScopes = getAllowedScopesForRole();

  const buttons = [
    { el: els.scopeChildBtn, value: "child" },
    { el: els.scopeHomeBtn, value: "home" },
    { el: els.scopeQualityBtn, value: "quality" },
    { el: els.scopeOfstedBtn, value: "ofsted" },
  ];

  for (const { el, value } of buttons) {
    if (!el) continue;

    const visible = allowedScopes.includes(value);
    const active = scope === value;

    el.classList.toggle("hidden", !visible);
    el.classList.toggle("active", visible && active);
    el.setAttribute("aria-hidden", visible ? "false" : "true");
    el.setAttribute("aria-selected", visible && active ? "true" : "false");
    el.setAttribute("aria-pressed", visible && active ? "true" : "false");

    if (!visible) {
      el.setAttribute("tabindex", "-1");
      el.disabled = true;
    } else {
      el.removeAttribute("tabindex");
      el.disabled = false;
    }
  }

  if (els.scopeSwitch) {
    const showSwitch = allowedScopes.length > 1;
    els.scopeSwitch.classList.toggle("hidden", !showSwitch);
    els.scopeSwitch.setAttribute("aria-hidden", showSwitch ? "false" : "true");
  }
}

function syncRestrictedNavigationVisibility() {
  document.querySelectorAll("[data-nav-section]").forEach((button) => {
    const section = button.dataset.navSection || "";
    const requiredScope = getRequiredScopeForSection(section);
    const allowed = canAccessScope(requiredScope);

    button.classList.toggle("hidden", !allowed);
    button.setAttribute("aria-hidden", allowed ? "false" : "true");

    if (allowed) {
      button.removeAttribute("tabindex");
      button.disabled = false;
    } else {
      button.setAttribute("tabindex", "-1");
      button.disabled = true;
    }
  });

  document.querySelectorAll("[data-workspace-menu]").forEach((menu) => {
    const visibleLinks = menu.querySelectorAll(
      ".workspace-menu-link:not(.hidden)"
    );
    const hasVisibleLinks = visibleLinks.length > 0;

    menu.classList.toggle("hidden", !hasVisibleLinks);
    menu.setAttribute("aria-hidden", hasVisibleLinks ? "false" : "true");
  });
}

function syncVisibleScreen() {
  const scope = state.currentScope || "child";

  if (scope === "child") {
    if (state.youngPersonId) {
      showWorkspace();
    } else {
      showSelector();
    }
    return;
  }

  showWorkspace();
}

function refreshAllChrome() {
  ensureValidScopeForRole();
  ensureInitialSectionForScope();
  syncDomDatasetFromState();
  syncVisibleScreen();
  refreshShellChrome();
  refreshAssistantUi();
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
  syncScopeButtons();
  syncRestrictedNavigationVisibility();
  syncOsNavigationActiveState();

  if (!state.youngPersonId) {
    refreshWorkspaceSummary();
  }
}

async function setScope(scope) {
  const safeScope = String(scope || "").trim().toLowerCase();

  if (!safeScope || state.currentScope === safeScope || !canAccessScope(safeScope)) {
    return;
  }

  const defaultSection = getDefaultSectionForScope(safeScope);

  setCurrentScope(safeScope, { resetSection: false });
  setSectionSafe(defaultSection);

  syncDomDatasetFromState();
  rerenderNavigationForScope();
  refreshAllChrome();

  if (safeScope === "child" && !state.youngPersonId) {
    showSelector();
    await loadYoungPersonSelector();
    return;
  }

  showWorkspace();
  await loadSection(defaultSection, { force: true });
}

function bindScopeEvents() {
  if (scopeEventsBound) return;
  scopeEventsBound = true;

  const bindings = [
    { el: els.scopeChildBtn, scope: "child" },
    { el: els.scopeHomeBtn, scope: "home" },
    { el: els.scopeQualityBtn, scope: "quality" },
    { el: els.scopeOfstedBtn, scope: "ofsted" },
  ];

  for (const { el, scope } of bindings) {
    el?.addEventListener("click", async () => {
      try {
        await setScope(scope);
      } catch (error) {
        console.error(`[index] failed switching to ${scope} scope`, error);
        showError(error?.message || "Failed to switch scope.");
      }
    });
  }
}

async function openYoungPersonSafely(id, options = {}) {
  const safeId = normaliseNumericId(id);
  if (!safeId) return false;

  const initialSection = normaliseSection(
    options.initialSection || getCurrentSection() || "workspace"
  );

  state.youngPersonId = safeId;
  setCurrentScope("child", { resetSection: false });
  setSectionSafe(initialSection);
  setYoungPersonIdInUrl(safeId);
  syncDomDatasetFromState();

  try {
    await openYoungPerson(safeId, {
      initialSection,
      forceInitialSectionLoad: false,
      skipInitialSectionLoad: true,
      ...options,
    });

    state.youngPersonId = safeId;
    setCurrentScope("child", { resetSection: false });
    setSectionSafe(initialSection);

    syncDomDatasetFromState();
    showWorkspace();

    await loadSection(initialSection, { force: true });

    setSectionSafe(initialSection);
    refreshShellChrome();
    refreshAssistantUi();
    updateAssistantContext();
    renderAssistantMessages();
    renderAssistantInsights();
    syncOsNavigationActiveState();
    showTherapeuticPrompt();

    return true;
  } catch (error) {
    console.error("[index] failed to open young person", error);
    clearSelectedYoungPerson();
    state.youngPersonId = null;
    setYoungPersonIdInUrl(null);
    syncDomDatasetFromState();
    showSelector();
    refreshWorkspaceSummary();
    showError(error?.message || "Failed to open selected young person.");
    return false;
  }
}

async function bootstrapSelectorDashboard() {
  forceChildEntryMode();
  showSelector();

  try {
    await loadYoungPersonSelector();
  } catch (error) {
    console.error("[index] selector load failed", error);
    showError(error?.message || "Failed to load homes and children.");
  }

  refreshWorkspaceSummary();
  syncLaunchReadinessStrip();
}

function bindChangePersonFallback() {
  if (changePersonFallbackBound) return;
  changePersonFallbackBound = true;

  const buttons = [
    byId("changePersonBtn"),
    byId("mobileHomeBtn"),
  ].filter(Boolean);

  for (const button of buttons) {
    button.addEventListener("click", async () => {
      await bootstrapSelectorDashboard();
    });
  }
}

function bindRestrictedSectionGuard() {
  if (restrictedSectionGuardBound) return;
  restrictedSectionGuardBound = true;

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-nav-section]");
      if (!button) return;

      const section = button.dataset.navSection || "";
      const requiredScope = getRequiredScopeForSection(section);

      if (canAccessScope(requiredScope)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      showError(
        `Your current role does not have access to the ${requiredScope} area.`
      );
    },
    true
  );
}

function bindGlobalSearchMirrors() {
  if (globalSearchMirrorsBound) return;
  globalSearchMirrorsBound = true;

  const desktopSearch = byId("recordSearchInput");
  const mobileSearch = byId("mobileRecordSearchInput");
  const filter = byId("recordTypeFilter");

  if (!desktopSearch && !mobileSearch && !filter) return;

  let debounceTimer = null;
  let lastPayload = "";

  const syncSearchValues = (source, target) => {
    if (!source || !target || target.value === source.value) return;
    target.value = source.value;
  };

  const dispatchSearchChanged = () => {
    const payload = {
      query: desktopSearch?.value || mobileSearch?.value || "",
      recordType: filter?.value || "",
      scope: state.currentScope || "child",
      section: getCurrentSection(),
    };

    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastPayload) return;
    lastPayload = payloadKey;

    document.dispatchEvent(
      new CustomEvent("indicare:record-search-changed", {
        detail: payload,
      })
    );
  };

  const scheduleDispatch = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(dispatchSearchChanged, 220);
  };

  desktopSearch?.addEventListener("input", () => {
    syncSearchValues(desktopSearch, mobileSearch);
    scheduleDispatch();
  });

  mobileSearch?.addEventListener("input", () => {
    syncSearchValues(mobileSearch, desktopSearch);
    scheduleDispatch();
  });

  desktopSearch?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    window.clearTimeout(debounceTimer);
    dispatchSearchChanged();
  });

  mobileSearch?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    window.clearTimeout(debounceTimer);
    dispatchSearchChanged();
  });

  filter?.addEventListener("change", () => {
    window.clearTimeout(debounceTimer);
    dispatchSearchChanged();
  });
}

function bindGlobalRefreshShortcuts() {
  if (globalRefreshShortcutsBound) return;
  globalRefreshShortcutsBound = true;

  window.addEventListener("popstate", async () => {
    try {
      await bootstrapSelectorDashboard();
    } catch (error) {
      console.error("[index] popstate restore failed", error);
    }
  });
}

function getSelectedYoungPersonIdFromDom() {
  const select = byId("youngPersonSelect");
  const app = byId("app");

  return (
    select?.value ||
    state.youngPersonId ||
    app?.dataset.youngPersonId ||
    null
  );
}

function getSelectedHomeLabelFromDom() {
  const select = byId("homeSelect");
  const selectedOption = select?.selectedOptions?.[0];

  if (selectedOption?.value) return selectedOption.textContent.trim();

  const activeChip =
    document.querySelector("#homeChipList .active") ||
    document.querySelector("#homeChipList [aria-pressed='true']");

  if (activeChip) return activeChip.textContent.trim();

  if (state.homeId) return `Home ${state.homeId}`;

  return "Not selected";
}

function getSelectedChildLabelFromDom() {
  const select = byId("youngPersonSelect");
  const selectedOption = select?.selectedOptions?.[0];

  if (selectedOption?.value) return selectedOption.textContent.trim();

  const activeCard =
    document.querySelector("#selectorList .active") ||
    document.querySelector("#selectorList [aria-pressed='true']");

  const heading = activeCard?.querySelector("h3");
  if (heading) return heading.textContent.trim();

  if (state.youngPersonId) return `Young person ${state.youngPersonId}`;

  return "Not selected";
}

function syncLaunchReadinessStrip() {
  const readyHome = byId("launchReadyHome");
  const readyChild = byId("launchReadyChild");
  const refreshed = byId("launchLastRefreshed");
  const openBtn = byId("launchOpenCareHubBtn");

  if (!readyHome && !readyChild && !refreshed && !openBtn) return;

  const selectedHome = getSelectedHomeLabelFromDom();
  const selectedChild = getSelectedChildLabelFromDom();
  const selectedId = normaliseNumericId(getSelectedYoungPersonIdFromDom());

  if (readyHome) readyHome.textContent = selectedHome;
  if (readyChild) readyChild.textContent = selectedChild;
  if (refreshed && !refreshed.dataset.touched) {
    refreshed.textContent = "Ready";
    refreshed.dataset.touched = "true";
  }

  if (openBtn) {
    openBtn.disabled = !selectedId;
    openBtn.setAttribute("aria-disabled", selectedId ? "false" : "true");
  }
}

function bindLaunchReadinessStrip() {
  if (launchReadinessBound) return;
  launchReadinessBound = true;

  const homeSelect = byId("homeSelect");
  const youngPersonSelect = byId("youngPersonSelect");
  const selectorSearch = byId("selectorSearch");
  const openBtn = byId("launchOpenCareHubBtn");
  const refreshBtn = byId("selectorRefreshBtn");
  const refreshed = byId("launchLastRefreshed");

  const sync = () => {
    if (refreshed) {
      refreshed.textContent = formatTime(new Date());
      refreshed.dataset.touched = "true";
    }
    syncLaunchReadinessStrip();
  };

  homeSelect?.addEventListener("change", sync);
  youngPersonSelect?.addEventListener("change", sync);
  selectorSearch?.addEventListener("input", sync);

  document.addEventListener("click", (event) => {
    if (
      event.target.closest("#homeChipList") ||
      event.target.closest("#selectorList")
    ) {
      window.setTimeout(sync, 80);
    }
  });

  refreshBtn?.addEventListener("click", () => {
    window.setTimeout(sync, 120);
  });

  openBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    const selectedId = normaliseNumericId(getSelectedYoungPersonIdFromDom());

    if (!selectedId) {
      showError("Choose a child or young person first.");
      return;
    }

    openBtn.disabled = true;
    openBtn.setAttribute("aria-busy", "true");

    try {
      await openYoungPersonSafely(selectedId, {
        initialSection: "workspace",
      });
    } finally {
      openBtn.disabled = false;
      openBtn.removeAttribute("aria-busy");
      syncLaunchReadinessStrip();
    }
  });

  syncLaunchReadinessStrip();
}

function bindOpenCareHubFallback() {
  if (openCareHubFallbackBound) return;
  openCareHubFallbackBound = true;

  document.addEventListener(
    "click",
    async (event) => {
      const button = event.target.closest("#openCareHubBtn");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const selectedId = getSelectedYoungPersonIdFromDom();

      if (!selectedId) {
        showError("Choose a child or young person first.");
        return;
      }

      button.disabled = true;
      button.setAttribute("aria-busy", "true");

      try {
        await openYoungPersonSafely(selectedId, {
          initialSection: "workspace",
        });
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    },
    true
  );
}

async function loadWorkspaceTarget(target, options = {}) {
  const section = normaliseSection(target);
  if (!section) return;

  const requiredScope = getRequiredScopeForSection(section);

  if (!canAccessScope(requiredScope)) {
    showError(`Your current role does not have access to the ${requiredScope} area.`);
    return;
  }

  if (requiredScope !== (state.currentScope || "child")) {
    setCurrentScope(requiredScope, { resetSection: false });
  }

  if (requiredScope === "child" && !state.youngPersonId) {
    showError("Choose a child or young person first.");
    showSelector();
    return;
  }

  setSectionSafe(section);
  syncDomDatasetFromState();
  showWorkspace();

  try {
    await loadSection(section, {
      force: true,
      ...options,
    });

    setSectionSafe(section);
    refreshShellChrome();
    refreshAssistantUi();
    updateAssistantContext();
    renderAssistantMessages();
    renderAssistantInsights();
    syncOsNavigationActiveState();
  } catch (error) {
    console.error(`[index] failed loading workspace section "${section}"`, error);
    showError(error?.message || `Failed to load ${section}.`);
  }
}

function normaliseViewToSection(view) {
  const value = normaliseSection(view);
  return VIEW_SECTION_MAP[value] || value;
}

function bindWorkspaceNavigationFallback() {
  if (workspaceNavigationFallbackBound) return;
  workspaceNavigationFallbackBound = true;

  document.addEventListener(
    "click",
    async (event) => {
      const viewButton = event.target.closest("[data-view]");
      const sectionButton = event.target.closest("[data-nav-section]");

      if (!viewButton && !sectionButton) return;

      const rawTarget =
        viewButton?.dataset.view || sectionButton?.dataset.navSection || "";

      const target = viewButton ? normaliseViewToSection(rawTarget) : rawTarget;
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      await loadWorkspaceTarget(target);
    },
    true
  );
}

function syncOsNavigationActiveState() {
  const currentSection = getCurrentSection();

  document.querySelectorAll(".os-nav-item").forEach((button) => {
    const target = button.dataset.view
      ? normaliseViewToSection(button.dataset.view)
      : normaliseSection(button.dataset.navSection || "");

    const active = target === currentSection;

    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  document.querySelectorAll(".journey-step").forEach((button) => {
    const target = button.dataset.view
      ? normaliseViewToSection(button.dataset.view)
      : normaliseSection(button.dataset.navSection || "");

    const active = target === currentSection;

    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "step" : "false");
  });
}

function bindOsNavigationActiveState() {
  if (osNavigationBound) return;
  osNavigationBound = true;

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".os-nav-item, .journey-step");
    if (!button) return;

    document
      .querySelectorAll(".os-nav-item, .journey-step")
      .forEach((item) => {
        if (item.classList.contains("journey-step") !== button.classList.contains("journey-step")) {
          return;
        }

        item.classList.remove("active");
        item.setAttribute("aria-current", "false");
      });

    button.classList.add("active");
    button.setAttribute(
      "aria-current",
      button.classList.contains("journey-step") ? "step" : "page"
    );
  });

  syncOsNavigationActiveState();
}

function showTherapeuticPrompt() {
  const panel = byId("therapeuticPromptPanel");
  if (!panel) return;

  const dismissed = sessionStorage.getItem("indicare-therapeutic-prompt-dismissed");
  if (dismissed === "true") return;

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}

function bindTherapeuticPrompt() {
  if (therapeuticPromptBound) return;
  therapeuticPromptBound = true;

  const panel = byId("therapeuticPromptPanel");
  const dismissBtn = byId("dismissTherapeuticPromptBtn");

  dismissBtn?.addEventListener("click", () => {
    panel?.classList.add("hidden");
    panel?.setAttribute("aria-hidden", "true");
    sessionStorage.setItem("indicare-therapeutic-prompt-dismissed", "true");
  });

  document.addEventListener("click", (event) => {
    const recordButton = event.target.closest(
      "[data-action='daily-note'], [data-action='incident'], [data-action='risk'], [data-action='plan']"
    );

    if (!recordButton) return;
    showTherapeuticPrompt();
  });
}

function bindNightShiftMode() {
  if (nightShiftBound) return;
  nightShiftBound = true;

  const button = byId("nightShiftModeBtn");
  const app = byId("app");
  const stored = localStorage.getItem("indicare-night-shift") === "true";

  const apply = (enabled) => {
    document.body.classList.toggle("night-shift-mode", enabled);
    app?.setAttribute("data-night-shift", enabled ? "true" : "false");
    button?.setAttribute("aria-pressed", enabled ? "true" : "false");

    if (button) {
      button.textContent = enabled ? "Night mode on" : "Night mode";
    }

    localStorage.setItem("indicare-night-shift", enabled ? "true" : "false");
  };

  apply(stored);

  button?.addEventListener("click", () => {
    const enabled = document.body.classList.contains("night-shift-mode");
    apply(!enabled);
  });
}

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    refreshEls();
    initialiseStateGuards();

    hydrateRuntimeContextFromDom();
    hydrateRuntimeContextFromSession();
    await hydrateRuntimeContextFromAuthCheck();

    const existingYoungPersonId = normaliseNumericId(state.youngPersonId);

    if (!existingYoungPersonId) {
      forceChildEntryMode();
    }

    const existingSection = getCurrentSection();

    ensureValidScopeForRole();
    ensureInitialSectionForScope();

    if (!existingYoungPersonId) {
      forceChildEntryMode();
    }

    syncDomDatasetFromState();

    console.log("[young-people-shell] boot", {
      role: state.userRole,
      scope: state.currentScope,
      section: state.currentSection,
      allowedScopes: getAllowedScopesForRole(),
      providerId: state.providerId,
      homeId: state.homeId,
      allowedHomeIds: state.allowedHomeIds,
      youngPersonId: state.youngPersonId,
      currentUser: state.currentUser,
    });

    bindShellChrome();
    bindAssistantUi();
    bindAssistantEvents();
    bindScopeEvents();
    bindComposerEvents();
    bindChangePersonFallback();
    bindGlobalSearchMirrors();
    bindGlobalRefreshShortcuts();
    bindRestrictedSectionGuard();
    bindOpenCareHubFallback();
    bindWorkspaceNavigationFallback();
    bindLaunchReadinessStrip();
    bindOsNavigationActiveState();
    bindTherapeuticPrompt();
    bindNightShiftMode();

    await initialiseShellNavigation();

    if (existingYoungPersonId) {
      await openYoungPersonSafely(existingYoungPersonId, {
        initialSection: existingSection || "workspace",
      });
    } else {
      showSelector();
      await loadYoungPersonSelector();
      syncLaunchReadinessStrip();
    }

    refreshAllChrome();

    if (state.youngPersonId) {
      await loadSection(getCurrentSection(), { force: true });
      syncOsNavigationActiveState();
      showTherapeuticPrompt();
    } else {
      showSelector();
      refreshWorkspaceSummary();
      syncLaunchReadinessStrip();
    }
  } catch (error) {
    console.error("[index] bootstrap failed", error);
    showError(error?.message || "Failed to start Care Hub.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

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
import {
  getYoungPersonIdFromUrl,
  setYoungPersonIdInUrl,
} from "./core/utils.js";
import {
  initialiseShellNavigation,
  showError,
  loadSection,
  rerenderNavigationForScope,
} from "./ui/nav.js";
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

const VALID_SCOPES = new Set(["child", "home", "quality", "ofsted"]);

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

function showWorkspace() {
  els.selectorPanel?.classList.add("hidden");
  els.selectorScreen?.classList.add("hidden");

  els.workspacePanel?.classList.remove("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

function showSelector() {
  els.workspacePanel?.classList.add("hidden");
  els.workspaceScreen?.classList.add("hidden");

  els.selectorPanel?.classList.remove("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

function normaliseRole(role) {
  const rawRole = String(role || "staff").toLowerCase().trim();

  if (ADMIN_LIKE_ROLES.has(rawRole)) return "admin";
  if (MANAGER_LIKE_ROLES.has(rawRole)) return "manager";
  if (RI_LIKE_ROLES.has(rawRole)) return "ri";
  if (STAFF_LIKE_ROLES.has(rawRole)) return "staff";

  return "staff";
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
    // Ignore storage failures.
  }
}

function parseAllowedHomeIds(rawValue) {
  if (!rawValue) return [];

  try {
    return toIdArray(JSON.parse(rawValue));
  } catch {
    return rawValue
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
  }
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
  if (!els.app) return;

  const datasetRole = normaliseRole(els.app.dataset.userRole || "");
  const datasetScope = String(els.app.dataset.scope || "").trim().toLowerCase();
  const datasetHomeId = normaliseNumericId(els.app.dataset.homeId);
  const datasetYoungPersonId = normaliseNumericId(
    els.app.dataset.youngPersonId
  );
  const datasetProviderId = normaliseNumericId(els.app.dataset.providerId);
  const datasetAllowedHomeIds = els.app.dataset.allowedHomeIds || "";

  setUserRole(datasetRole);

  if (VALID_SCOPES.has(datasetScope)) {
    setCurrentScope(datasetScope, { resetSection: false });
  }

  setHomeContext(datasetHomeId);
  setProviderContext(datasetProviderId);

  if (datasetYoungPersonId && !state.youngPersonId) {
    state.youngPersonId = datasetYoungPersonId;
  }

  setAllowedHomeIds(parseAllowedHomeIds(datasetAllowedHomeIds));
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
  if (!els.app) return;

  els.app.dataset.userRole = normaliseRole(state.userRole || "staff");
  els.app.dataset.scope = state.currentScope || "child";
  els.app.dataset.homeId = state.homeId ? String(state.homeId) : "";
  els.app.dataset.youngPersonId = state.youngPersonId
    ? String(state.youngPersonId)
    : "";
  els.app.dataset.providerId = state.providerId ? String(state.providerId) : "";
  els.app.dataset.allowedHomeIds = JSON.stringify(
    Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : []
  );
}

function getCurrentRole() {
  return normaliseRole(state.userRole || "staff");
}

function getAllowedScopesForRole() {
  const role = getCurrentRole();

  if (ROLE_SCOPE_ACCESS?.[role]) {
    return ROLE_SCOPE_ACCESS[role];
  }

  if (role === "admin" || role === "manager" || role === "ri") {
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
  return SCOPE_DEFAULT_SECTION?.[scope] || "workspace";
}

function getAllowedSectionsForScope(scope = state.currentScope || "child") {
  return SCOPE_SECTIONS?.[scope] || SCOPE_SECTIONS?.child || ["workspace"];
}

function isSectionAllowedInScope(
  section = "",
  scope = state.currentScope || "child"
) {
  return getAllowedSectionsForScope(scope).includes(section);
}

function getRequiredScopeForSection(section = "") {
  const value = String(section || "").trim().toLowerCase();

  const qualitySections = new Set([
    "quality",
    "actions",
    "provider-overview",
    "quality-audits",
    "reg44",
    "reg45",
  ]);

  const ofstedSections = new Set([
    "ofsted",
    "ofsted-dashboard",
    "ofsted-readiness",
    "inspection-readiness",
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

function ensureValidScopeForRole() {
  const allowedScopes = getAllowedScopesForRole();
  const currentScope = state.currentScope || "child";

  if (!allowedScopes.includes(currentScope)) {
    setCurrentScope(getDefaultScopeForRole(), { resetSection: false });
  }
}

function ensureInitialSectionForScope() {
  const scope = state.currentScope || "child";
  const expectedDefault = getDefaultSectionForScope(scope);
  const currentSection =
    state.currentSection || state.activeSection || state.currentView || "";

  const safeSection = isSectionAllowedInScope(currentSection, scope)
    ? currentSection
    : expectedDefault;

  setCurrentSection(safeSection);
}

function applyRoleDefaultScopeIfNeeded() {
  const defaultScope = getDefaultScopeForRole();
  const currentScope = state.currentScope || "child";

  const datasetScope = String(els.app?.dataset?.scope || "")
    .trim()
    .toLowerCase();

  const hasExplicitScopeFromDom = VALID_SCOPES.has(datasetScope);
  const currentScopeAccessible = canAccessScope(currentScope);

  if (!currentScopeAccessible) {
    setCurrentScope(defaultScope, { resetSection: true });
    setCurrentSection(getDefaultSectionForScope(defaultScope));
    return;
  }

  if (!hasExplicitScopeFromDom && !currentScope) {
    setCurrentScope(defaultScope, { resetSection: true });
    setCurrentSection(getDefaultSectionForScope(defaultScope));
  }
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
    } else {
      el.removeAttribute("tabindex");
    }
  }

  if (els.scopeSwitch) {
    const showSwitch = allowedScopes.length > 1;
    els.scopeSwitch.classList.toggle("hidden", !showSwitch);
    els.scopeSwitch.setAttribute("aria-hidden", showSwitch ? "false" : "true");
  }
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
  refreshWorkspaceSummary();
}

async function setScope(scope) {
  if (!scope || state.currentScope === scope || !canAccessScope(scope)) return;

  setCurrentScope(scope, { resetSection: true });
  syncDomDatasetFromState();
  rerenderNavigationForScope();
  refreshAllChrome();

  if (scope === "child") {
    if (state.youngPersonId) {
      await loadSection(state.currentSection);
    } else {
      await restoreOrShowYoungPersonSelector();
    }

    refreshWorkspaceSummary();
    return;
  }

  await loadSection(state.currentSection);
  refreshWorkspaceSummary();
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

  state.youngPersonId = safeId;
  setYoungPersonIdInUrl(safeId);
  syncDomDatasetFromState();

  try {
    await openYoungPerson(safeId, {
      skipInitialSectionLoad: true,
      ...options,
    });

    state.youngPersonId = safeId;
    syncDomDatasetFromState();
    showWorkspace();
    refreshWorkspaceSummary();

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

async function restoreOrShowYoungPersonSelector() {
  if ((state.currentScope || "child") !== "child") return false;

  const idFromUrl = normaliseNumericId(getYoungPersonIdFromUrl());
  if (idFromUrl) {
    return openYoungPersonSafely(idFromUrl);
  }

  const existingStateId = normaliseNumericId(state.youngPersonId);
  if (existingStateId) {
    return openYoungPersonSafely(existingStateId);
  }

  const datasetId = normaliseNumericId(els.app?.dataset?.youngPersonId);
  if (datasetId) {
    return openYoungPersonSafely(datasetId);
  }

  clearSelectedYoungPerson();
  state.youngPersonId = null;
  setYoungPersonIdInUrl(null);
  syncDomDatasetFromState();
  showSelector();

  try {
    await loadYoungPersonSelector();
  } catch (error) {
    console.error("[index] selector load failed", error);
    showError(error?.message || "Failed to load young people.");
  }

  refreshWorkspaceSummary();
  return false;
}

async function restoreSelectedYoungPerson() {
  return restoreOrShowYoungPersonSelector();
}

async function bootstrapSelectorIfNeeded(restoredYoungPerson) {
  const scope = state.currentScope || "child";

  if (scope !== "child") return;

  if (restoredYoungPerson || state.youngPersonId) {
    showWorkspace();
    return;
  }

  clearSelectedYoungPerson();
  state.youngPersonId = null;
  setYoungPersonIdInUrl(null);
  syncDomDatasetFromState();

  try {
    await loadYoungPersonSelector();
    showSelector();
    refreshWorkspaceSummary();
  } catch (error) {
    console.error("[index] selector load failed", error);
    showError(error?.message || "Failed to load young people.");
  }
}

function bindChangePersonFallback() {
  if (changePersonFallbackBound) return;
  changePersonFallbackBound = true;

  const buttons = [
    document.getElementById("changePersonBtn"),
    document.getElementById("mobileHomeBtn"),
  ].filter(Boolean);

  for (const button of buttons) {
    button.addEventListener("click", async () => {
      if ((state.currentScope || "child") !== "child") return;

      clearSelectedYoungPerson();
      state.youngPersonId = null;
      setYoungPersonIdInUrl(null);
      syncDomDatasetFromState();
      showSelector();

      try {
        await loadYoungPersonSelector();
      } catch (error) {
        console.error("[index] failed loading selector from change button", error);
        showError(error?.message || "Failed to load young people.");
      }
    });
  }
}

function bindGlobalSearchMirrors() {
  if (globalSearchMirrorsBound) return;
  globalSearchMirrorsBound = true;

  const desktopSearch = document.getElementById("recordSearchInput");
  const mobileSearch = document.getElementById("mobileRecordSearchInput");
  const filter = document.getElementById("recordTypeFilter");

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
      section:
        state.currentSection || state.activeSection || state.currentView || "",
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
      const restoredYoungPerson = await restoreSelectedYoungPerson();
      syncVisibleScreen();

      if (
        (state.currentScope || "child") === "child" &&
        restoredYoungPerson &&
        state.currentSection
      ) {
        await loadSection(state.currentSection);
      }
    } catch (error) {
      console.error("[index] popstate restore failed", error);
    }
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

    ensureValidScopeForRole();
    applyRoleDefaultScopeIfNeeded();
    ensureInitialSectionForScope();
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
    bindChangePersonFallback();
    bindGlobalSearchMirrors();
    bindGlobalRefreshShortcuts();
    bindRestrictedSectionGuard();

    const restoredYoungPerson = await restoreSelectedYoungPerson();

    await bootstrapSelectorIfNeeded(restoredYoungPerson);
    await initialiseShellNavigation();

    refreshAllChrome();

    if (
      (state.currentScope || "child") === "child" &&
      state.youngPersonId &&
      state.currentSection
    ) {
      await loadSection(state.currentSection);
    }

    refreshWorkspaceSummary();
  } catch (error) {
    console.error("[index] bootstrap failed", error);
    showError(error?.message || "Failed to start workspace.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

import { state } from "./state.js";
import { els } from "./dom.js";
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
} from "./core/config.js";

let scopeEventsBound = false;
let bootstrapped = false;

function showWorkspace() {
  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

function showSelector() {
  els.workspaceScreen?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

function normaliseRole(role) {
  const rawRole = String(role || "staff").toLowerCase().trim();

  if (
    rawRole === "administrator" ||
    rawRole === "admin" ||
    rawRole === "super_admin" ||
    rawRole === "superadmin" ||
    rawRole === "admin_user" ||
    rawRole === "system_admin" ||
    rawRole === "owner"
  ) {
    return "admin";
  }

  if (
    rawRole === "manager" ||
    rawRole === "registered_manager" ||
    rawRole === "deputy_manager"
  ) {
    return "manager";
  }

  if (
    rawRole === "ri" ||
    rawRole === "responsible_individual"
  ) {
    return "ri";
  }

  if (
    rawRole === "rsw" ||
    rawRole === "residential_support_worker" ||
    rawRole === "staff"
  ) {
    return "staff";
  }

  return "staff";
}

function readSessionUser() {
  try {
    const raw = sessionStorage.getItem("current_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hydrateRuntimeContextFromDom() {
  if (!els.app) return;

  const datasetRole = normaliseRole(els.app.dataset.userRole || "");
  const datasetScope = String(els.app.dataset.scope || "").trim().toLowerCase();
  const datasetHomeId = els.app.dataset.homeId || "";
  const datasetYoungPersonId = els.app.dataset.youngPersonId || "";

  if (datasetRole) {
    state.userRole = datasetRole;
  }

  if (datasetHomeId) {
    state.homeId = datasetHomeId;
  }

  if (datasetYoungPersonId && !state.youngPersonId) {
    state.youngPersonId = datasetYoungPersonId;
  }

  if (datasetScope) {
    state.currentScope = datasetScope;
  }
}

function hydrateRuntimeContextFromSession() {
  const currentUser = readSessionUser();
  if (!currentUser) return;

  state.currentUser = currentUser;

  const sessionRole = normaliseRole(
    currentUser.role ||
      currentUser.user_role ||
      currentUser.account_type ||
      currentUser.role_name
  );

  if (sessionRole) {
    state.userRole = sessionRole;
  }

  if (currentUser.home_id || currentUser.homeId) {
    state.homeId = currentUser.home_id || currentUser.homeId;
  }

  if (currentUser.user_id || currentUser.id) {
    state.userId = currentUser.user_id || currentUser.id;
  }

  if (currentUser.staff_id) {
    state.staffId = currentUser.staff_id;
  }
}

function syncDomDatasetFromState() {
  if (!els.app) return;

  els.app.dataset.userRole = normaliseRole(state.userRole || "staff");
  els.app.dataset.scope = state.currentScope || "child";
  els.app.dataset.homeId = state.homeId ? String(state.homeId) : "";
  els.app.dataset.youngPersonId = state.youngPersonId ? String(state.youngPersonId) : "";
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
    return ["child", "home", "quality"];
  }

  return ["child", "home"];
}

function canAccessScope(scope) {
  return getAllowedScopesForRole().includes(scope);
}

function getDefaultScopeForRole() {
  const allowed = getAllowedScopesForRole();

  if (allowed.includes("home")) return "home";
  if (allowed.includes("quality")) return "quality";
  return allowed[0] || "child";
}

function getDefaultSectionForScope(scope = state.currentScope || "child") {
  return SCOPE_DEFAULT_SECTION?.[scope] || "workspace";
}

function ensureValidScopeForRole() {
  const allowedScopes = getAllowedScopesForRole();
  const currentScope = state.currentScope || "child";

  if (!allowedScopes.includes(currentScope)) {
    state.currentScope = getDefaultScopeForRole();
  }
}

function ensureInitialSectionForScope() {
  const expectedDefault = getDefaultSectionForScope(state.currentScope);

  if (!state.currentSection) {
    state.currentSection = expectedDefault;
  }

  if (!state.activeSection) {
    state.activeSection = state.currentSection;
  }

  if (!state.currentView) {
    state.currentView = state.currentSection;
  }
}

function syncScopeButtons() {
  const scope = state.currentScope || "child";
  const allowedScopes = getAllowedScopesForRole();

  const buttons = [
    { el: els.scopeChildBtn, value: "child" },
    { el: els.scopeHomeBtn, value: "home" },
    { el: els.scopeQualityBtn, value: "quality" },
  ];

  buttons.forEach(({ el, value }) => {
    if (!el) return;

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
  });

  if (els.scopeSwitch) {
    const showSwitch = getAllowedScopesForRole().length > 1;
    els.scopeSwitch.classList.toggle("hidden", !showSwitch);
    els.scopeSwitch.setAttribute("aria-hidden", showSwitch ? "false" : "true");
  }
}

function refreshAllChrome() {
  ensureValidScopeForRole();
  ensureInitialSectionForScope();
  syncDomDatasetFromState();
  refreshShellChrome();
  refreshAssistantUi();
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
  syncScopeButtons();
  refreshWorkspaceSummary();
}

async function setScope(scope) {
  if (!scope) return;
  if (state.currentScope === scope) return;
  if (!canAccessScope(scope)) return;

  state.currentScope = scope;

  const nextSection = getDefaultSectionForScope(scope);
  state.currentSection = nextSection;
  state.activeSection = nextSection;
  state.currentView = nextSection;

  syncDomDatasetFromState();
  refreshAllChrome();
  rerenderNavigationForScope();

  if (scope === "child") {
    if (state.youngPersonId) {
      showWorkspace();
      await loadSection(nextSection);
    } else {
      showSelector();
      await loadYoungPersonSelector();
      refreshWorkspaceSummary();
    }
    return;
  }

  showWorkspace();
  await loadSection(nextSection);
  refreshWorkspaceSummary();
}

function bindScopeEvents() {
  if (scopeEventsBound) return;
  scopeEventsBound = true;

  els.scopeChildBtn?.addEventListener("click", async () => {
    try {
      await setScope("child");
    } catch (error) {
      console.error("[index] failed switching to child scope", error);
      showError(error?.message || "Failed to switch scope.");
    }
  });

  els.scopeHomeBtn?.addEventListener("click", async () => {
    try {
      await setScope("home");
    } catch (error) {
      console.error("[index] failed switching to home scope", error);
      showError(error?.message || "Failed to switch scope.");
    }
  });

  els.scopeQualityBtn?.addEventListener("click", async () => {
    try {
      await setScope("quality");
    } catch (error) {
      console.error("[index] failed switching to quality scope", error);
      showError(error?.message || "Failed to switch scope.");
    }
  });
}

async function restoreSelectedYoungPerson() {
  const idFromUrl = getYoungPersonIdFromUrl();

  if (!idFromUrl) {
    state.youngPersonId = null;
    state.selectedYoungPerson = null;
    syncDomDatasetFromState();
    return false;
  }

  state.youngPersonId = idFromUrl;
  setYoungPersonIdInUrl(idFromUrl);
  syncDomDatasetFromState();

  try {
    await openYoungPerson(idFromUrl, { skipInitialSectionLoad: true });
    syncDomDatasetFromState();
    refreshWorkspaceSummary();
    return true;
  } catch (error) {
    console.error("[index] failed to restore young person", error);
    state.youngPersonId = null;
    state.selectedYoungPerson = null;
    setYoungPersonIdInUrl(null);
    syncDomDatasetFromState();
    refreshWorkspaceSummary();
    showError(error?.message || "Failed to open selected young person.");
    return false;
  }
}

async function bootstrapSelectorIfNeeded(restoredYoungPerson) {
  const scope = state.currentScope || "child";

  if (scope !== "child") return;
  if (restoredYoungPerson) return;

  try {
    await loadYoungPersonSelector();
    refreshWorkspaceSummary();
  } catch (error) {
    console.error("[index] selector load failed", error);
    showError(error?.message || "Failed to load young people.");
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

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    hydrateRuntimeContextFromDom();
    hydrateRuntimeContextFromSession();
    ensureValidScopeForRole();

    if (!state.currentScope || state.currentScope === "child") {
      const currentRole = getCurrentRole();
      if (currentRole === "admin" || currentRole === "manager" || currentRole === "ri") {
        state.currentScope = getDefaultScopeForRole();
      }
    }

    state.currentSection = getDefaultSectionForScope(state.currentScope);
    state.activeSection = state.currentSection;
    state.currentView = state.currentSection;

    syncDomDatasetFromState();

    console.log("[young-people-shell] boot", {
      role: state.userRole,
      scope: state.currentScope,
      section: state.currentSection,
      allowedScopes: getAllowedScopesForRole(),
      currentUser: state.currentUser,
    });

    bindShellChrome();
    bindAssistantUi();
    bindAssistantEvents();
    bindScopeEvents();

    refreshAllChrome();

    const restoredYoungPerson = await restoreSelectedYoungPerson();

    if (state.currentScope === "child") {
      if (restoredYoungPerson) {
        showWorkspace();
      } else {
        showSelector();
      }
    } else {
      showWorkspace();
    }

    syncVisibleScreen();

    await bootstrapSelectorIfNeeded(restoredYoungPerson);
    await initialiseShellNavigation();
    refreshAllChrome();
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

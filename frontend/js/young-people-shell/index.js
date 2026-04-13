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

function getCurrentRole() {
  return String(state.userRole || "staff").toLowerCase();
}

function getAllowedScopesForRole() {
  return ROLE_SCOPE_ACCESS?.[getCurrentRole()] || ["child"];
}

function canAccessScope(scope) {
  return getAllowedScopesForRole().includes(scope);
}

function getDefaultSectionForScope(scope = state.currentScope || "child") {
  return SCOPE_DEFAULT_SECTION?.[scope] || "workspace";
}

function ensureValidScopeForRole() {
  const allowedScopes = getAllowedScopesForRole();
  const currentScope = state.currentScope || "child";

  if (!allowedScopes.includes(currentScope)) {
    state.currentScope = allowedScopes[0] || "child";
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
  refreshShellChrome();
  refreshAssistantUi();
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
  syncScopeButtons();
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

  refreshAllChrome();
  rerenderNavigationForScope();

  if (scope === "child") {
    if (state.youngPersonId) {
      showWorkspace();
      await loadSection(nextSection);
    } else {
      showSelector();
      await loadYoungPersonSelector();
    }
    return;
  }

  showWorkspace();
  await loadSection(nextSection);
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
    showSelector();
    refreshAllChrome();
    return false;
  }

  state.youngPersonId = idFromUrl;
  setYoungPersonIdInUrl(idFromUrl);
  showWorkspace();

  try {
    await openYoungPerson(idFromUrl, { skipInitialSectionLoad: true });
    refreshAllChrome();
    return true;
  } catch (error) {
    console.error("[index] failed to restore young person", error);
    state.youngPersonId = null;
    state.selectedYoungPerson = null;
    setYoungPersonIdInUrl(null);
    showSelector();
    refreshAllChrome();
    showError(error?.message || "Failed to open selected young person.");
    return false;
  }
}

async function bootstrapSelectorIfNeeded(restored) {
  if (restored) return;

  try {
    await loadYoungPersonSelector();
  } catch (error) {
    console.error("[index] selector load failed", error);
    showError(error?.message || "Failed to load young people.");
  }
}

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    ensureValidScopeForRole();

    bindShellChrome();
    bindAssistantUi();
    bindAssistantEvents();
    bindScopeEvents();

    refreshAllChrome();

    const restored = await restoreSelectedYoungPerson();
    await bootstrapSelectorIfNeeded(restored);

    await initialiseShellNavigation();
    refreshAllChrome();
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

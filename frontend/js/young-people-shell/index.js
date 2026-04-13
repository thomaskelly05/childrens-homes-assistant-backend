import { state } from "./state.js";
import { els } from "./dom.js";
import {
  getYoungPersonIdFromUrl,
  setYoungPersonIdInUrl,
} from "./core/utils.js";
import { initialiseShellNavigation, showError, loadSection } from "./ui/nav.js";
import { loadYoungPersonSelector, openYoungPerson } from "./ui/selector.js";
import { bindShellChrome, refreshShellChrome } from "./ui/shell-ui.js";
import { bindAssistantUi, refreshAssistantUi } from "./ui/assistant-ui.js";
import {
  bindAssistantEvents,
  updateAssistantContext,
  renderAssistantInsights,
  renderAssistantMessages,
} from "./ui/assistant.js";

function showWorkspace() {
  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

function showSelector() {
  els.workspaceScreen?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

function syncScopeButtons() {
  const scope = state.currentScope || "child";

  const buttons = [
    { el: els.scopeChildBtn, scope: "child" },
    { el: els.scopeHomeBtn, scope: "home" },
    { el: els.scopeQualityBtn, scope: "quality" },
  ];

  buttons.forEach(({ el, scope: value }) => {
    if (!el) return;
    const active = scope === value;
    el.classList.toggle("active", active);
    el.setAttribute("aria-selected", active ? "true" : "false");
    el.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateScopeVisibility() {
  const role = String(state.userRole || "staff").toLowerCase();

  if (els.scopeHomeBtn) {
    const canSeeHome = role === "manager" || role === "ri";
    els.scopeHomeBtn.classList.toggle("hidden", !canSeeHome);
    els.scopeHomeBtn.setAttribute("aria-hidden", canSeeHome ? "false" : "true");
    if (!canSeeHome) {
      els.scopeHomeBtn.setAttribute("tabindex", "-1");
    } else {
      els.scopeHomeBtn.removeAttribute("tabindex");
    }
  }

  if (els.scopeQualityBtn) {
    const canSeeQuality = role === "ri";
    els.scopeQualityBtn.classList.toggle("hidden", !canSeeQuality);
    els.scopeQualityBtn.setAttribute("aria-hidden", canSeeQuality ? "false" : "true");
    if (!canSeeQuality) {
      els.scopeQualityBtn.setAttribute("tabindex", "-1");
    } else {
      els.scopeQualityBtn.removeAttribute("tabindex");
    }
  }
}

function refreshAllChrome() {
  refreshShellChrome();
  refreshAssistantUi();
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
  updateScopeVisibility();
  syncScopeButtons();
}

function canAccessScope(scope) {
  const role = String(state.userRole || "staff").toLowerCase();

  if (scope === "child") return true;
  if (scope === "home") return role === "manager" || role === "ri";
  if (scope === "quality") return role === "ri";
  return false;
}

function getDefaultSectionForScope(scope) {
  if (scope === "home") return "manager";
  if (scope === "quality") return "reports";
  return "workspace";
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

  if (state.youngPersonId) {
    await loadSection(nextSection);
  }
}

function bindScopeEvents() {
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

async function bootstrap() {
  try {
    bindShellChrome();
    bindAssistantUi();
    bindAssistantEvents();
    bindScopeEvents();

    refreshAllChrome();

    const restored = await restoreSelectedYoungPerson();

    if (!restored) {
      try {
        await loadYoungPersonSelector();
      } catch (error) {
        console.error("[index] selector load failed", error);
        showError(error?.message || "Failed to load young people.");
      }
    }

    await initialiseShellNavigation();
    refreshAllChrome();
  } catch (error) {
    console.error("[index] bootstrap failed", error);
    showError(error?.message || "Failed to start workspace.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

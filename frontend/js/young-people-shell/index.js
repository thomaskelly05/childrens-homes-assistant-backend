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
  getDefaultScopeForRole,
  canRoleAccessScope,
} from "./core/config.js";

/* ============================================================
   HELPERS
============================================================ */

function normaliseSection(section) {
  const raw = String(section || "").trim().toLowerCase();

  if (!raw || ["home", "dashboard", "myday", "my-day"].includes(raw)) {
    return "workspace";
  }

  return raw;
}

function showWorkspace() {
  refreshEls();

  els.selectorPanel?.classList.add("hidden");
  els.selectorScreen?.classList.add("hidden");

  els.workspacePanel?.classList.remove("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

function showSelector() {
  refreshEls();

  els.workspacePanel?.classList.add("hidden");
  els.workspaceScreen?.classList.add("hidden");

  els.selectorPanel?.classList.remove("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

function syncDom() {
  if (!els.app) return;

  els.app.dataset.scope = state.currentScope || "child";
  els.app.dataset.section =
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace";

  els.app.dataset.youngPersonId = state.youngPersonId || "";
}

/* ============================================================
   CORE FIX: DO NOT FORCE WORKSPACE
============================================================ */

function setSectionSafe(section) {
  const safe = normaliseSection(section);

  setCurrentSection(safe);
  state.currentSection = safe;
  state.activeSection = safe;
  state.currentView = safe;

  syncDom();
}

/* ============================================================
   OPEN YOUNG PERSON (FIXED)
============================================================ */

async function openYoungPersonSafe(id, options = {}) {
  if (!id) return;

  const initialSection = normaliseSection(
    options.initialSection || state.currentSection || "workspace"
  );

  state.youngPersonId = id;

  setCurrentScope("child", { resetSection: false });
  setSectionSafe(initialSection);
  setYoungPersonIdInUrl(id);

  try {
    await openYoungPerson(id, {
      initialSection,
      forceInitialSectionLoad: true,
    });

    showWorkspace();

    await loadSection(initialSection, { force: true });
  } catch (error) {
    console.error("[index] open young person failed", error);

    clearSelectedYoungPerson();
    state.youngPersonId = null;

    showSelector();
    showError("Failed to open young person.");
  }
}

/* ============================================================
   SCOPE SWITCH (CLEAN)
============================================================ */

async function setScope(scope) {
  if (!scope || !canRoleAccessScope(state.userRole, scope)) return;

  setCurrentScope(scope, { resetSection: false });

  const defaultSection = "workspace";
  setSectionSafe(defaultSection);

  syncDom();
  rerenderNavigationForScope();

  await loadSection(defaultSection, { force: true });
}

/* ============================================================
   BOOTSTRAP (CRITICAL FIXES)
============================================================ */

async function bootstrap() {
  refreshEls();
  initialiseStateGuards();

  // DO NOT overwrite section blindly
  if (!state.currentScope) {
    setCurrentScope(getDefaultScopeForRole(state.userRole), {
      resetSection: false,
    });
  }

  if (!state.currentSection) {
    setSectionSafe("workspace");
  }

  syncDom();

  console.log("[young-people-shell] boot", {
    scope: state.currentScope,
    section: state.currentSection,
  });

  bindShellChrome();
  bindAssistantUi();
  bindAssistantEvents();

  await initialiseShellNavigation();

  if (state.youngPersonId) {
    await openYoungPersonSafe(state.youngPersonId, {
      initialSection: state.currentSection,
    });
  } else {
    showSelector();
    await loadYoungPersonSelector();
  }
}

/* ============================================================
   START
============================================================ */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

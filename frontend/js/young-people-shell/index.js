import { state } from "./state.js";
import { els } from "./dom.js";
import {
  getYoungPersonIdFromUrl,
  setYoungPersonIdInUrl,
} from "./core/utils.js";
import { initialiseShellNavigation, showError } from "./ui/nav.js";
import { loadYoungPersonSelector, openYoungPerson } from "./ui/selector.js";
import { bindShellChrome, refreshShellChrome } from "./ui/shell-ui.js";
import { bindAssistantUi, refreshAssistantUi } from "./ui/assistant-ui.js";
import { bindAssistantEvents, updateAssistantContext, renderAssistantInsights, renderAssistantMessages } from "./ui/assistant.js";

function showWorkspace() {
  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

function showSelector() {
  els.workspaceScreen?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

function refreshAllChrome() {
  refreshShellChrome();
  refreshAssistantUi();
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
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

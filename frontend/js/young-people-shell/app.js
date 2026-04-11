import { state, resetAssistantState, resetComposerState, setCurrentView } from "./state.js";
import { els } from "./dom.js";
import { getYoungPersonIdFromUrl } from "./core/utils.js";
import { VIEW_CONFIG } from "./core/config.js";

import { loadYoungPersonSelector, openYoungPersonFromState, goBackToSelector } from "./ui/selector.js";
import { bindGlobalEvents } from "./ui/nav.js";
import { renderAssistantMessages, renderAssistantInsights, updateAssistantContext } from "./ui/assistant-ui.js";
import { updateAssistantScopeDataset, renderAssistantScopeBadges } from "./ui/header.js";
import { loadCurrentView } from "./features/workspace.js";

function bootstrapUi() {
  renderAssistantMessages();
  renderAssistantInsights();
  updateAssistantScopeDataset();
  renderAssistantScopeBadges();
  updateAssistantContext();
}

function ensureValidStartingView() {
  if (!VIEW_CONFIG[state.currentView]) {
    setCurrentView("overview");
    return;
  }

  if (!state.currentView) {
    setCurrentView("overview");
  }
}

async function initFromUrl() {
  const urlYoungPersonId = getYoungPersonIdFromUrl();
  state.youngPersonId = urlYoungPersonId;

  if (!state.youngPersonId) {
    await loadYoungPersonSelector();
    return;
  }

  try {
    await openYoungPersonFromState();
    ensureValidStartingView();
    await loadCurrentView();
  } catch (error) {
    console.error("Young people shell init failed:", error);
    resetAssistantState();
    resetComposerState();
    await goBackToSelector();
  }
}

async function init() {
  bindGlobalEvents();
  bootstrapUi();
  await initFromUrl();
}

init();

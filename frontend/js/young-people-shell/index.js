import { state, resetAssistantState, resetComposerState } from "./state.js";
import { getYoungPersonIdFromUrl } from "./core/utils.js";
import { VIEW_CONFIG } from "./core/config.js";
import {
  loadYoungPersonSelector,
  openYoungPersonFromState,
  goBackToSelector,
} from "./ui/selector.js";
import { bindGlobalEvents, showError, showMessage, clearStatus } from "./ui/nav.js";
import { renderAssistantMessages, renderAssistantInsights, updateAssistantContext } from "./ui/assistant-ui.js";
import { updateAssistantScopeDataset, renderAssistantScopeBadges } from "./ui/header.js";
import { loadCurrentView } from "./features/workspace.js";

async function init() {
  state.youngPersonId = getYoungPersonIdFromUrl();

  bindGlobalEvents();
  renderAssistantMessages();
  renderAssistantInsights();
  updateAssistantScopeDataset();
  renderAssistantScopeBadges();
  updateAssistantContext();

  if (!state.youngPersonId) {
    clearStatus();
    await loadYoungPersonSelector();
    return;
  }

  try {
    await openYoungPersonFromState();

    if (!VIEW_CONFIG[state.currentView]) {
      state.currentView = "overview";
    }

    clearStatus();
    await loadCurrentView();
    showMessage("Workspace loaded.");
  } catch (error) {
    console.error(error);
    resetAssistantState();
    resetComposerState();
    showError(error?.message || "Failed to load young person workspace.");
    await goBackToSelector();
  }
}

init();

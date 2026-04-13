import { state } from "../state.js";
import { els } from "../dom.js";

let assistantUiBound = false;

function syncAssistantVisibility() {
  const isOpen = Boolean(state.assistantOpen);

  if (els.assistantModal) {
    els.assistantModal.classList.toggle("hidden", !isOpen);
    els.assistantModal.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  if (els.assistantBackdrop) {
    els.assistantBackdrop.classList.toggle("hidden", !isOpen);
  }
}

function syncAssistantSendButtons() {
  const sending = Boolean(state.assistantSending);

  if (els.assistantSendBtn) {
    els.assistantSendBtn.disabled = sending;
  }

  if (els.assistantModalSendBtn) {
    els.assistantModalSendBtn.disabled = sending;
  }
}

function syncAssistantInputs() {
  const disabled = Boolean(state.assistantSending);

  if (els.assistantInput) {
    els.assistantInput.disabled = disabled;
  }

  if (els.assistantModalInput) {
    els.assistantModalInput.disabled = disabled;
  }
}

export function refreshAssistantUi() {
  syncAssistantVisibility();
  syncAssistantSendButtons();
  syncAssistantInputs();
}

export function bindAssistantUi() {
  if (assistantUiBound) return;
  assistantUiBound = true;

  refreshAssistantUi();
}

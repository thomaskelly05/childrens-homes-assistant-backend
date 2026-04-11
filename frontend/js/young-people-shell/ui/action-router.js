import { openComposerFor } from "./composer.js";
import { askAssistant } from "./assistant-ui.js";
import { openRecordDetail } from "./records.js";
import { state } from "../state.js";

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getDefaultAssistantPrompt(action, context = {}) {
  const name =
    [state.youngPerson?.first_name, state.youngPerson?.last_name].filter(Boolean).join(" ").trim() ||
    state.youngPerson?.preferred_name ||
    "this young person";

  const prompts = {
    handover: `Draft a handover for the next shift for ${name}.`,
    priorities: `What matters most right now for ${name}?`,
    chronology: `Summarise the recent chronology for ${name}.`,
    incidents: `Summarise recent incidents and patterns for ${name}.`,
    plans: `Summarise current support plans for ${name}.`,
    health: `Summarise current health and wellbeing needs for ${name}.`,
    education: `Summarise current education themes for ${name}.`,
    family: `Summarise current family and relationship themes for ${name}.`,
    monthly_review: `Draft a monthly summary for ${name}.`,
  };

  return prompts[action] || context.prompt || `Summarise what matters most right now for ${name}.`;
}

export const ACTION_MAP = {
  "new-daily-note": () => openComposerFor("daily_note", "create"),
  "new-incident": () => openComposerFor("incident", "create"),
  "new-support-plan": () => openComposerFor("support_plan", "create"),
  "new-risk-assessment": () => openComposerFor("risk", "create"),
  "new-health-record": () => openComposerFor("health_record", "create"),
  "new-education-record": () => openComposerFor("education_record", "create"),
  "new-family-record": () => openComposerFor("family_contact", "create"),
  "new-keywork-session": () => openComposerFor("keywork", "create"),
  "new-appointment": () => openComposerFor("appointment", "create"),

  "edit-profile-identity": () => openComposerFor("profile_identity", "create"),
  "edit-profile-communication": () => openComposerFor("profile_communication", "create"),
  "edit-profile-education": () => openComposerFor("profile_education", "create"),
  "edit-profile-health": () => openComposerFor("profile_health", "create"),
  "edit-profile-legal": () => openComposerFor("profile_legal", "create"),
  "edit-profile-formulation": () => openComposerFor("profile_formulation", "create"),

  "assistant-handover": () => askAssistant(getDefaultAssistantPrompt("handover")),
  "assistant-priorities": () => askAssistant(getDefaultAssistantPrompt("priorities")),
  "assistant-chronology": () => askAssistant(getDefaultAssistantPrompt("chronology")),
  "assistant-incidents": () => askAssistant(getDefaultAssistantPrompt("incidents")),
  "assistant-plans": () => askAssistant(getDefaultAssistantPrompt("plans")),
  "assistant-health": () => askAssistant(getDefaultAssistantPrompt("health")),
  "assistant-education": () => askAssistant(getDefaultAssistantPrompt("education")),
  "assistant-family": () => askAssistant(getDefaultAssistantPrompt("family")),
  "assistant-monthly-review": () => askAssistant(getDefaultAssistantPrompt("monthly_review")),
};

export function runAction(action, context = {}) {
  if (!action) return false;

  const handler = ACTION_MAP[action];
  if (!handler) return false;

  handler(context);
  return true;
}

export function runDatasetAction(element) {
  if (!element) return false;

  const action =
    element.dataset.actionRouter ||
    element.dataset.workspaceAction ||
    element.dataset.shellAction ||
    element.dataset.actionKey ||
    "";

  return runAction(action, element.dataset || {});
}

export function bindActionRouter(root = document) {
  root.addEventListener("click", async (event) => {
    const actionEl = event.target.closest(
      "[data-action-router],[data-workspace-action],[data-shell-action],[data-action-key]"
    );

    if (actionEl) {
      const handled = runDatasetAction(actionEl);
      if (handled) return;
    }

    const assistantEl = event.target.closest("[data-assistant-action]");
    if (assistantEl) {
      const prompt = getDefaultAssistantPrompt(assistantEl.dataset.assistantAction, assistantEl.dataset);
      await askAssistant(prompt);
      return;
    }

    const recordEl = event.target.closest("[data-record-json]");
    if (recordEl) {
      const item = safeParseJson(recordEl.dataset.recordJson);
      if (item) {
        await openRecordDetail(item);
      }
    }
  });
}

export function getActionForProfileEdit(key = "") {
  const map = {
    identity: "edit-profile-identity",
    communication: "edit-profile-communication",
    education: "edit-profile-education",
    health: "edit-profile-health",
    legal: "edit-profile-legal",
    formulation: "edit-profile-formulation",
    network: "edit-profile-legal",
  };

  return map[key] || "edit-profile-identity";
}

export function getActionForQuickButton(key = "") {
  const map = {
    "daily-note": "new-daily-note",
    incident: "new-incident",
    plan: "new-support-plan",
    risk: "new-risk-assessment",
    health: "new-health-record",
    education: "new-education-record",
    family: "new-family-record",
    keywork: "new-keywork-session",
    appointment: "new-appointment",
    handover: "assistant-handover",
    priorities: "assistant-priorities",
  };

  return map[key] || "";
}

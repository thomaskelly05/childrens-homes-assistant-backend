import { saveEvidenceEntry } from "./sccif-outcomes-engine.js";
import { persistWorkflowDecision } from "./workflow-audit.js";

const LOCAL_ACTIONS_KEY = "indicare.careHub.actions.v1";

function nowIso() {
  return new Date().toISOString();
}

function addDays(days = 3) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function getLocalActions() {
  try {
    return safeJsonParse(window.localStorage?.getItem(LOCAL_ACTIONS_KEY), []);
  } catch (_) {
    return [];
  }
}

function saveLocalActions(actions) {
  try {
    window.localStorage?.setItem(LOCAL_ACTIONS_KEY, JSON.stringify(actions));
  } catch (_) {}
  return actions;
}

function stableId(parts = []) {
  return parts.filter(Boolean).join(":").replace(/[^a-zA-Z0-9:_-]/g, "_");
}

function actionPriority(type = "") {
  if (["safeguarding_concern", "reg40_decision", "risk_update", "medication_error"].includes(type)) return "high";
  if (["manager_review", "quality_check", "follow_up"].includes(type)) return "medium";
  return "normal";
}

function defaultDueDate(type = "") {
  return addDays(actionPriority(type) === "high" ? 1 : 3);
}

export function normaliseCareHubAction(input = {}) {
  const type = input.type || "follow_up";
  const createdAt = input.created_at || nowIso();
  const id = input.id || stableId(["care-action", input.child_id, input.section_id, type, createdAt]);
  return {
    id,
    type,
    title: input.title || "Follow-up action",
    body: input.body || input.description || "Action created from Care Hub OS.",
    priority: input.priority || actionPriority(type),
    status: input.status || "open",
    owner: input.owner || "Manager",
    due: input.due || defaultDueDate(type),
    child_id: input.child_id || null,
    child_name: input.child_name || "",
    section_id: input.section_id || "",
    source: input.source || "care_hub_quick_action",
    created_at: createdAt,
    updated_at: input.updated_at || createdAt,
  };
}

export function listCareHubActions() {
  return getLocalActions();
}

export async function createCareHubAction(input = {}) {
  const action = normaliseCareHubAction(input);
  const existing = getLocalActions();
  saveLocalActions([action, ...existing].slice(0, 500));

  try {
    await fetch("/workflow/actions", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action),
    });
  } catch (error) {
    console.warn("[care-hub-actions] backend action persistence unavailable", error);
  }

  await persistWorkflowDecision({
    itemId: action.id,
    itemType: "action",
    action: "created",
    after: action,
    metadata: {
      child_id: action.child_id,
      section_id: action.section_id,
      source: action.source,
    },
  });

  saveEvidenceEntry({
    child_id: action.child_id,
    child_name: action.child_name,
    source_id: action.id,
    source_type: "care_hub_action",
    action_id: action.id,
    actionType: action.type,
    sectionId: action.section_id,
    title: action.title,
    summary: action.body,
  });

  window.dispatchEvent(new CustomEvent("indicare:care-hub-action-created", { detail: action }));
  return action;
}

export async function updateCareHubAction(actionId, patch = {}) {
  const actions = getLocalActions();
  const before = actions.find((action) => String(action.id) === String(actionId));
  const updated = actions.map((action) => String(action.id) === String(actionId)
    ? { ...action, ...patch, updated_at: nowIso() }
    : action
  );
  saveLocalActions(updated);
  const after = updated.find((action) => String(action.id) === String(actionId));

  await persistWorkflowDecision({
    itemId: actionId,
    itemType: "action",
    action: patch.status || "updated",
    before,
    after,
  });

  if (after) {
    saveEvidenceEntry({
      child_id: after.child_id,
      child_name: after.child_name,
      source_id: after.id,
      source_type: "care_hub_action_update",
      action_id: after.id,
      actionType: after.type,
      sectionId: after.section_id,
      title: `${after.title} ${patch.status || "updated"}`,
      summary: `Action status changed to ${patch.status || "updated"}.`,
    });
  }

  window.dispatchEvent(new CustomEvent("indicare:care-hub-action-updated", { detail: after }));
  return after;
}

export function actionsForChild(childId) {
  return getLocalActions().filter((action) => String(action.child_id || "") === String(childId || ""));
}

export function safeguardingActions() {
  return getLocalActions().filter((action) => action.priority === "high" || ["safeguarding_concern", "reg40_decision", "risk_update"].includes(action.type));
}

window.IndiCareCareHubActions = Object.freeze({
  createCareHubAction,
  updateCareHubAction,
  listCareHubActions,
  actionsForChild,
  safeguardingActions,
});

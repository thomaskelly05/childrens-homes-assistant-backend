const LOCAL_AUDIT_KEY = "indicare.workflowAudit.v1";
const LOCAL_WORKFLOW_KEY = "indicare.workflowState.v1";

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function safeStorageGet(key, fallback) {
  try {
    return safeJsonParse(window.localStorage?.getItem(key), fallback);
  } catch (_) {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

function currentActor() {
  return {
    id: window.currentUser?.id || window.IndiCareCurrentUser?.id || document.body?.dataset?.staffId || null,
    name: window.currentUser?.name || window.IndiCareCurrentUser?.name || document.body?.dataset?.staffName || "Current user",
    role: window.currentUser?.role || window.IndiCareCurrentUser?.role || document.body?.dataset?.staffRole || "staff",
  };
}

function stableAuditId(event) {
  return ["audit", event.event_type, event.target_type, event.target_id, event.created_at]
    .filter(Boolean)
    .join(":")
    .replace(/[^a-zA-Z0-9:_-]/g, "_");
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  return response.headers.get("content-type")?.includes("application/json") ? response.json() : {};
}

export function createAuditEvent({
  eventType,
  targetType,
  targetId,
  action,
  before = null,
  after = null,
  reason = "",
  metadata = {},
}) {
  const actor = currentActor();
  const event = {
    id: null,
    event_type: eventType || action || "workflow_event",
    target_type: targetType || "workflow_item",
    target_id: targetId || "unknown",
    action: action || eventType || "workflow_event",
    actor,
    before,
    after,
    reason,
    metadata,
    created_at: nowIso(),
  };
  event.id = stableAuditId(event);
  return event;
}

export function appendLocalAuditEvent(event) {
  const existing = safeStorageGet(LOCAL_AUDIT_KEY, []);
  const next = [event, ...existing].slice(0, 500);
  safeStorageSet(LOCAL_AUDIT_KEY, next);
  return next;
}

export function getLocalAuditEvents() {
  return safeStorageGet(LOCAL_AUDIT_KEY, []);
}

export function getLocalWorkflowState() {
  return safeStorageGet(LOCAL_WORKFLOW_KEY, {
    approvals: {},
    actions: {},
    lifecycle: {},
  });
}

export function saveLocalWorkflowState(state) {
  safeStorageSet(LOCAL_WORKFLOW_KEY, state);
  return state;
}

export function updateLocalWorkflowItem({ itemId, itemType, patch }) {
  const state = getLocalWorkflowState();
  const bucket = itemType === "approval" ? "approvals" : itemType === "lifecycle" ? "lifecycle" : "actions";
  state[bucket][itemId] = {
    ...(state[bucket][itemId] || {}),
    ...patch,
    updated_at: nowIso(),
  };
  return saveLocalWorkflowState(state);
}

export async function recordWorkflowAudit(eventInput) {
  const event = createAuditEvent(eventInput);

  try {
    const saved = await postJson("/workflow/audit", event);
    if (saved) return saved;
  } catch (error) {
    console.warn("[workflow-audit] backend audit unavailable; using local fallback", error);
  }

  appendLocalAuditEvent(event);
  return event;
}

export async function persistWorkflowDecision({ itemId, itemType = "action", action, before = null, after = null, reason = "", metadata = {} }) {
  const audit = await recordWorkflowAudit({
    eventType: action,
    targetType: itemType,
    targetId: itemId,
    action,
    before,
    after,
    reason,
    metadata,
  });

  updateLocalWorkflowItem({
    itemId,
    itemType,
    patch: {
      status: after?.status || action,
      last_action: action,
      last_audit_id: audit.id,
      reason,
    },
  });

  return audit;
}

window.IndiCareWorkflowAudit = Object.freeze({
  createAuditEvent,
  recordWorkflowAudit,
  persistWorkflowDecision,
  getLocalAuditEvents,
  getLocalWorkflowState,
});

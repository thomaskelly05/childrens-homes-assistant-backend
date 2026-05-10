import {
  actionDefinition,
  evidenceForRecordType,
  lifecycleLabel,
  normaliseLifecycleState,
} from "./workflow-contract.js";

const ACTION_STATUS = Object.freeze({
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
  cancelled: "Cancelled",
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days = 2) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stableId(parts = []) {
  return parts.filter(Boolean).join(":").replace(/[^a-zA-Z0-9:_-]/g, "_");
}

export function normaliseRecordForWorkflow(record = {}, fallback = {}) {
  const recordType = record.record_type || record.type || fallback.recordType || "daily_note";
  const workflow = record.workflow || {};
  const lifecycleState = normaliseLifecycleState(
    workflow.lifecycle_state || record.lifecycle_state || record.workflow_status || record.status || "draft"
  );
  const evidence = workflow.evidence_mapping || evidenceForRecordType(recordType);

  return {
    id: record.id || record.record_id || fallback.id || stableId([recordType, record.created_at, record.title]),
    title: record.title || record.summary || record.presentation || fallback.title || "Untitled record",
    recordType,
    lifecycleState,
    lifecycleLabel: lifecycleLabel(lifecycleState),
    youngPersonId: record.young_person_id || record.youngPersonId || fallback.youngPersonId || null,
    youngPersonName: record.young_person_name || record.youngPersonName || fallback.youngPersonName || "",
    createdAt: record.created_at || record.createdAt || fallback.createdAt || todayIsoDate(),
    updatedAt: record.updated_at || record.updatedAt || fallback.updatedAt || "",
    managerReviewNeeded: Boolean(workflow.manager_review_needed ?? record.manager_review_needed ?? lifecycleState === "submitted"),
    evidenceBankReady: Boolean(workflow.evidence_bank_ready ?? record.evidence_bank_ready ?? lifecycleState === "submitted"),
    evidenceMapping: {
      sccif: asArray(evidence.sccif),
      quality_standards: asArray(evidence.quality_standards || evidence.quality),
    },
    actionIntents: asArray(workflow.action_intents || record.action_intents),
    source: record,
  };
}

export function actionsFromRecord(record = {}, options = {}) {
  const item = normaliseRecordForWorkflow(record, options);
  const intents = item.actionIntents.length
    ? item.actionIntents
    : item.managerReviewNeeded
      ? [{ type: "manager_review", status: "open", source: "workflow_default" }]
      : [];

  return intents.map((intent, index) => {
    const type = intent.type || "manager_review";
    const definition = actionDefinition(type);
    const due = intent.due || intent.due_date || addDaysIso(type.includes("reg40") || type.includes("safeguarding") ? 1 : 3);
    return {
      id: intent.id || stableId(["action", item.id, type, index]),
      type,
      title: intent.title || definition.label,
      body: intent.body || `${definition.label} required for ${item.title}.`,
      priority: intent.priority || definition.priority || "medium",
      status: intent.status || "open",
      statusLabel: ACTION_STATUS[intent.status || "open"] || intent.status || "Open",
      owner: intent.owner || intent.assignee || options.defaultOwner || "Manager",
      due,
      sourceRecordId: item.id,
      sourceRecordType: item.recordType,
      youngPersonId: item.youngPersonId,
      youngPersonName: item.youngPersonName,
      href: intent.href || `/young-people-shell?young_person_id=${encodeURIComponent(item.youngPersonId || "")}`,
    };
  });
}

export function approvalFromRecord(record = {}, options = {}) {
  const item = normaliseRecordForWorkflow(record, options);
  if (!item.managerReviewNeeded) return null;

  return {
    id: stableId(["approval", item.id]),
    title: `Review ${item.title}`,
    body: `${item.lifecycleLabel}: manager review required before sign-off.`,
    priority: item.recordType === "incident" ? "high" : "medium",
    owner: options.defaultOwner || "Registered manager",
    due: addDaysIso(item.recordType === "incident" ? 1 : 3),
    href: `/young-people-shell?young_person_id=${encodeURIComponent(item.youngPersonId || "")}`,
    sourceRecordId: item.id,
    sourceRecordType: item.recordType,
    youngPersonId: item.youngPersonId,
    youngPersonName: item.youngPersonName,
  };
}

export function dashboardFromRecords(records = [], options = {}) {
  const normalised = records.map((record) => normaliseRecordForWorkflow(record, options));
  const approvals = normalised.map((record) => approvalFromRecord(record, options)).filter(Boolean);
  const actions = normalised.flatMap((record) => actionsFromRecord(record, options));
  const safeguarding = actions.filter((action) => ["safeguarding_follow_up", "reg40_decision", "risk_update"].includes(action.type));
  const evidence = normalised
    .filter((record) => record.evidenceBankReady)
    .map((record) => ({
      id: stableId(["evidence", record.id]),
      title: `${record.title} evidence mapped`,
      body: [
        ...record.evidenceMapping.sccif,
        ...record.evidenceMapping.quality_standards,
      ].join(" · ") || "Evidence mapping pending.",
      priority: record.recordType === "incident" ? "high" : "normal",
      href: `/young-people-shell?young_person_id=${encodeURIComponent(record.youngPersonId || "")}`,
    }));

  return {
    pending_approvals: approvals.length,
    actions_due: actions.filter((action) => ["open", "in_progress", "overdue"].includes(action.status)).length,
    safeguarding_alerts: safeguarding.length,
    inspection_gaps: evidence.length ? 0 : normalised.length,
    today: [...safeguarding.slice(0, 3), ...approvals.slice(0, 3), ...actions.slice(0, 3)].slice(0, 6),
    lifecycle: normalised.map((record) => ({
      title: record.title,
      body: `${record.lifecycleLabel} · ${record.recordType}`,
      priority: record.recordType === "incident" ? "high" : "normal",
      href: `/young-people-shell?young_person_id=${encodeURIComponent(record.youngPersonId || "")}`,
    })),
    approvals,
    actions,
    safeguarding,
    reg: actions.filter((action) => ["reg40_decision", "reg44_action", "reg45_action"].includes(action.type)),
    evidence,
    voice: actions.filter((action) => action.type === "child_voice_follow_up"),
  };
}

window.IndiCareWorkflowEngine = Object.freeze({
  normaliseRecordForWorkflow,
  actionsFromRecord,
  approvalFromRecord,
  dashboardFromRecords,
});

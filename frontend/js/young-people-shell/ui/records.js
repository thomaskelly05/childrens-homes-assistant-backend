import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  evaluateRecordSuggestions,
  mergeSuggestionLists,
} from "../core/rules-client.js";
import {
  normaliseRecord as normaliseDisplayRecord,
  buildRecordDisplayMeta,
} from "../core/record-normaliser.js";
import {
  normaliseRecordType as normaliseContractRecordType,
} from "../core/contracts.js";

/* ------------------------- local helper replacements ------------------------- */

function statusBadgeTone(status = "") {
  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");

  if (
    [
      "approved",
      "complete",
      "completed",
      "active",
      "success",
      "resolved",
      "closed",
      "current",
      "up_to_date",
      "good",
      "outstanding",
    ].includes(value)
  ) {
    return "success";
  }

  if (
    [
      "pending",
      "submitted",
      "in_progress",
      "due_soon",
      "review_due",
      "warning",
      "attention",
      "open",
    ].includes(value)
  ) {
    return "warning";
  }

  if (
    [
      "overdue",
      "rejected",
      "returned",
      "failed",
      "expired",
      "missing",
      "critical",
      "high",
      "danger",
    ].includes(value)
  ) {
    return "danger";
  }

  return "muted";
}

/* -------------------------- local suggestions bridge ------------------------- */

function showSuggestionsPanelSafe(suggestions = [], meta = {}) {
  try {
    const panel = document.getElementById("suggestionsPanel");
    const body = document.getElementById("suggestionsPanelBody");
    const title = document.getElementById("suggestionsPanelTitle");
    const subtitle = document.getElementById("suggestionsPanelSubtitle");

    if (!panel || !body) return;

    if (title) {
      title.textContent = suggestions.length ? "Suggested follow-ups" : "Suggestions";
    }

    if (subtitle) {
      const bits = [];
      if (meta.source_record_type) {
        bits.push(String(meta.source_record_type).replaceAll("_", " "));
      }
      if (meta.source_record_id) bits.push(`Source #${meta.source_record_id}`);
      if (meta.scope) bits.push(`Scope: ${meta.scope}`);
      subtitle.textContent = bits.join(" • ");
    }

    if (!Array.isArray(suggestions) || !suggestions.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">○</div>
            <h3>No suggestions</h3>
            <p>No suggestions right now.</p>
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="record-list">
          ${suggestions
            .map((item, index) => {
              const titleText =
                item.title || item.label || item.name || `Suggestion ${index + 1}`;

              const description =
                item.description || item.summary || item.reason || "";

              const actionType =
                item.action_type ||
                item.record_type ||
                item.target_record_type ||
                "create_record";

              return `
                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">${escapeHtml(String(titleText))}</div>
                    ${
                      description
                        ? `<div class="record-row-summary">${escapeHtml(String(description))}</div>`
                        : ""
                    }
                    <div class="record-row-meta">${escapeHtml(
                      String(actionType).replaceAll("_", " ")
                    )}</div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    }

    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  } catch (error) {
    console.error("[records] failed to show suggestions panel", error);
  }
}

function hideSuggestionsPanelSafe() {
  try {
    const panel = document.getElementById("suggestionsPanel");
    const body = document.getElementById("suggestionsPanelBody");

    if (body) body.innerHTML = "";
    if (panel) {
      panel.classList.add("hidden");
      panel.setAttribute("aria-hidden", "true");
    }
  } catch (error) {
    console.error("[records] failed to hide suggestions panel", error);
  }
}

/* -------------------------------- scope -------------------------------- */

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeScopedBase() {
  return "/homes";
}

function getChildScopedBase() {
  return "/young-people";
}

/* ------------------------------- record map ------------------------------ */

const RECORD_CONFIG = {
  daily_note: { label: "Daily note" },
  incident: { label: "Incident" },
  support_plan: { label: "Support plan" },
  risk: { label: "Risk assessment" },
  appointment: { label: "Appointment" },
  health_record: { label: "Health record" },
  education_record: { label: "Education record" },
  family_contact: { label: "Family contact" },
  keywork: { label: "Keywork session" },
  report: { label: "Report" },
  chronology_event: { label: "Chronology event" },
  compliance_item: { label: "Compliance item" },
  safeguarding_record: { label: "Safeguarding record" },
  missing_episode: { label: "Missing episode" },
  task: { label: "Task" },
  achievement_record: { label: "Achievement" },
  medication_profile: { label: "Medication profile" },
  medication_record: { label: "Medication record" },
  communication: { label: "Communication" },
  document: { label: "Document" },
  statutory_document: { label: "Statutory document" },
  therapy: { label: "Therapy" },
  team: { label: "Team item" },
  supervision: { label: "Supervision" },
  compliance: { label: "Compliance" },
  audit: { label: "Audit" },
  manager_action: { label: "Manager action" },
  onboarding: { label: "Onboarding" },
  notification: { label: "Notification" },
  shift_log: { label: "Shift log" },
  handover: { label: "Handover" },
  handover_record: { label: "Handover record" },
  finance: { label: "Finance item" },
  home_notification: { label: "Home notification" },
  operational_notification: { label: "Operational notification" },
};

/* ------------------------------- utilities ------------------------------- */

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function prettifyKey(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeString(value, fallback = "") {
  return String(value ?? fallback ?? "");
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function firstDefined(...values) {
  for (const value of values) {
    if (hasValue(value)) return value;
  }
  return null;
}

/* ---------------------------- route resolution --------------------------- */

function buildScopedDetailUrl(recordType, id, item = {}) {
  const childBase = getChildScopedBase();
  const homeBase = getHomeScopedBase();
  const scope = getCurrentScope();

  const youngPersonId =
    item.young_person_id ||
    item.child_id ||
    state.selectedYoungPerson?.id ||
    state.currentYoungPersonId ||
    state.youngPersonId;

  const homeId = item.home_id || state.currentHomeId || state.homeId;

  const childPrefix = youngPersonId ? `${childBase}/${youngPersonId}` : childBase;
  const homePrefix = homeId ? `${homeBase}/${homeId}` : homeBase;

  const childRoutes = {
    daily_note: `${childPrefix}/daily-notes/${id}`,
    incident: `${childPrefix}/incidents/${id}`,
    support_plan: `${childPrefix}/plans/${id}`,
    risk: `${childPrefix}/risk/${id}`,
    appointment: `${childPrefix}/appointments/${id}`,
    health_record: `${childPrefix}/health/${id}`,
    education_record: `${childPrefix}/education/${id}`,
    family_contact: `${childPrefix}/family/${id}`,
    keywork: `${childPrefix}/keywork/${id}`,
    report: `${childPrefix}/reports/${id}`,
    chronology_event: `${childPrefix}/timeline/${id}`,
    compliance_item: `${childPrefix}/compliance/${id}`,
    safeguarding_record: `${childPrefix}/safeguarding/${id}`,
    missing_episode: `${childPrefix}/missing-episodes/${id}`,
    task: `${childPrefix}/tasks/${id}`,
    achievement_record: `${childPrefix}/achievements/${id}`,
    medication_profile: `${childPrefix}/medication-records/${id}`,
    medication_record: `${childPrefix}/medication-records/${id}`,
    communication: `${childPrefix}/communications/${id}`,
    document: `${childPrefix}/documents/${id}`,
    statutory_document: `${childPrefix}/statutory-documents/${id}`,
    therapy: `${childPrefix}/therapy/${id}`,
    handover: `${childPrefix}/handover/${id}`,
    handover_record: `${childPrefix}/handover/${id}`,
  };

  const homeRoutes = {
    daily_note: `${homePrefix}/daily-notes/${id}`,
    incident: `${homePrefix}/incidents/${id}`,
    support_plan: `${homePrefix}/plans/${id}`,
    risk: `${homePrefix}/risks/${id}`,
    appointment: `${homePrefix}/appointments/${id}`,
    task: `${homePrefix}/tasks/${id}`,
    manager_action: `${homePrefix}/manager-actions/${id}`,
    communication: `${homePrefix}/communications/${id}`,
    document: `${homePrefix}/documents/${id}`,
    statutory_document: `${homePrefix}/statutory-documents/${id}`,
    therapy: `${homePrefix}/therapy/${id}`,
    team: `${homePrefix}/team/${id}`,
    supervision: `${homePrefix}/supervisions/${id}`,
    compliance: `${homePrefix}/compliance/${id}`,
    compliance_item: `${homePrefix}/compliance/${id}`,
    audit: `${homePrefix}/audits/${id}`,
    report: `${homePrefix}/reports/${id}`,
    handover: `${homePrefix}/handover/${id}`,
    handover_record: `${homePrefix}/handover/${id}`,
    shift_log: `${homePrefix}/shift-logs/${id}`,
    onboarding: `${homePrefix}/onboarding/${id}`,
    notification: `${homePrefix}/notifications/${id}`,
    home_notification: `${homePrefix}/home-notifications/${id}`,
    operational_notification: `${homePrefix}/operational-notifications/${id}`,
    finance: `${homePrefix}/finance/${id}`,
  };

  if (scope === "child") {
    return childRoutes[recordType] || null;
  }

  return homeRoutes[recordType] || childRoutes[recordType] || null;
}

function buildScopedWorkflowUrl(recordType, id, action, item = {}) {
  const childBase = getChildScopedBase();
  const homeBase = getHomeScopedBase();
  const scope = getCurrentScope();

  const youngPersonId =
    item.young_person_id ||
    item.child_id ||
    state.selectedYoungPerson?.id ||
    state.currentYoungPersonId ||
    state.youngPersonId;

  const homeId = item.home_id || state.currentHomeId || state.homeId;

  const childPrefix = youngPersonId ? `${childBase}/${youngPersonId}` : childBase;
  const homePrefix = homeId ? `${homeBase}/${homeId}` : homeBase;

  const childActions = {
    daily_note: {
      submit: `${childPrefix}/daily-notes/${id}/submit`,
      approve: `${childPrefix}/daily-notes/${id}/approve`,
      return: `${childPrefix}/daily-notes/${id}/return`,
      archive: `${childPrefix}/daily-notes/${id}/archive`,
    },
    incident: {
      submit: `${childPrefix}/incidents/${id}/submit`,
      approve: `${childPrefix}/incidents/${id}/approve`,
      return: `${childPrefix}/incidents/${id}/return`,
      archive: `${childPrefix}/incidents/${id}/archive`,
    },
    support_plan: {
      submit: `${childPrefix}/plans/${id}/submit`,
      approve: `${childPrefix}/plans/${id}/approve`,
      return: `${childPrefix}/plans/${id}/return`,
      archive: `${childPrefix}/plans/${id}/archive`,
    },
    risk: {
      submit: `${childPrefix}/risk/${id}/submit`,
      approve: `${childPrefix}/risk/${id}/approve`,
      return: `${childPrefix}/risk/${id}/return`,
      archive: `${childPrefix}/risk/${id}/archive`,
    },
    appointment: {
      approve: `${childPrefix}/appointments/${id}/complete`,
      return: `${childPrefix}/appointments/${id}/cancel`,
    },
    keywork: {
      submit: `${childPrefix}/keywork/${id}/submit`,
      approve: `${childPrefix}/keywork/${id}/approve`,
      return: `${childPrefix}/keywork/${id}/return`,
      archive: `${childPrefix}/keywork/${id}/archive`,
    },
    safeguarding_record: {
      submit: `${childPrefix}/safeguarding/${id}/submit`,
      approve: `${childPrefix}/safeguarding/${id}/approve`,
      return: `${childPrefix}/safeguarding/${id}/return`,
      archive: `${childPrefix}/safeguarding/${id}/archive`,
    },
    missing_episode: {
      submit: `${childPrefix}/missing-episodes/${id}/submit`,
      approve: `${childPrefix}/missing-episodes/${id}/approve`,
      return: `${childPrefix}/missing-episodes/${id}/return`,
      archive: `${childPrefix}/missing-episodes/${id}/archive`,
    },
  };

  const homeActions = {
    daily_note: {
      submit: `${homePrefix}/daily-notes/${id}/submit`,
      approve: `${homePrefix}/daily-notes/${id}/approve`,
      return: `${homePrefix}/daily-notes/${id}/return`,
      archive: `${homePrefix}/daily-notes/${id}/archive`,
    },
    incident: {
      submit: `${homePrefix}/incidents/${id}/submit`,
      approve: `${homePrefix}/incidents/${id}/approve`,
      return: `${homePrefix}/incidents/${id}/return`,
      archive: `${homePrefix}/incidents/${id}/archive`,
    },
    support_plan: {
      submit: `${homePrefix}/plans/${id}/submit`,
      approve: `${homePrefix}/plans/${id}/approve`,
      return: `${homePrefix}/plans/${id}/return`,
      archive: `${homePrefix}/plans/${id}/archive`,
    },
    risk: {
      submit: `${homePrefix}/risks/${id}/submit`,
      approve: `${homePrefix}/risks/${id}/approve`,
      return: `${homePrefix}/risks/${id}/return`,
      archive: `${homePrefix}/risks/${id}/archive`,
    },
    appointment: {
      approve: `${homePrefix}/appointments/${id}/complete`,
      return: `${homePrefix}/appointments/${id}/cancel`,
    },
  };

  const map =
    scope === "child"
      ? childActions[recordType]
      : homeActions[recordType] || childActions[recordType];

  return map?.[action] || null;
}

/* --------------------------- record type normalise ----------------------- */

export function normaliseRecordType(item = {}) {
  if (typeof item === "string") {
    return normaliseContractRecordType(item);
  }

  return normaliseContractRecordType(
    item.record_type ||
      item.type ||
      item.primary_record_type ||
      item.source_table ||
      item.event_type ||
      item.category ||
      ""
  );
}

/* ------------------------------ record ids ------------------------------- */

export function getRecordId(item = {}) {
  return firstDefined(
    item.id,
    item.record_id,
    item.source_id,
    item.incident_id,
    item.task_id,
    item.document_id,
    item.report_id
  );
}

export function getRecordUrl(item = {}) {
  const normalised = item?.raw ? item : normaliseDisplayRecord(item);
  const type = normalised.type || normaliseRecordType(item);
  const id = getRecordId(normalised) || getRecordId(normalised.raw || item);
  if (!id) return null;
  return buildScopedDetailUrl(type, id, normalised.raw || item);
}

/* ----------------------------- drawer content ---------------------------- */

function buildSubtitle(type, item = {}, detail = {}) {
  const dateValue = firstDefined(
    item.date,
    item.event_datetime,
    item.start_datetime,
    item.contact_datetime,
    item.session_date,
    item.record_date,
    item.recorded_at,
    item.occurred_at,
    item.audit_date,
    item.review_date,
    item.note_date,
    item.incident_datetime,
    item.created_at,
    detail.date,
    detail.event_datetime,
    detail.start_datetime,
    detail.contact_datetime,
    detail.session_date,
    detail.record_date,
    detail.note_date,
    detail.incident_datetime,
    detail.audit_date,
    detail.review_date,
    detail.created_at
  );

  const status = firstDefined(
    item.status,
    item.workflow_status,
    item.approval_status,
    detail.workflow_status,
    detail.status,
    detail.approval_status,
    ""
  );

  return [
    safeString(type || "record").replaceAll("_", " "),
    dateValue ? formatDate(dateValue) : "",
    status || "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function detailObjectFromResponse(data = {}) {
  if (!data || typeof data !== "object") return {};

  return (
    data.daily_note ||
    data.incident ||
    data.risk ||
    data.risk_assessment ||
    data.support_plan ||
    data.plan ||
    data.appointment ||
    data.young_person_appointment ||
    data.health_record ||
    data.education_record ||
    data.family_contact_record ||
    data.contact ||
    data.keywork ||
    data.keywork_session ||
    data.report ||
    data.chronology_event ||
    data.compliance_item ||
    data.safeguarding_record ||
    data.missing_episode ||
    data.task ||
    data.achievement_record ||
    data.medication_profile ||
    data.medication_record ||
    data.communication ||
    data.document ||
    data.statutory_document ||
    data.therapy ||
    data.team ||
    data.supervision ||
    data.audit ||
    data.compliance ||
    data.manager_action ||
    data.notification ||
    data.home_notification ||
    data.operational_notification ||
    data.handover ||
    data.handover_record ||
    data.item ||
    data.record ||
    data
  );
}

function renderRichEmptyState(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

const DRAWER_HIDDEN_KEYS = new Set([
  "id",
  "young_person_id",
  "home_id",
  "provider_id",
  "created_by",
  "updated_by",
  "_local_only",
  "raw",
]);

const DRAWER_PRIORITY_FIELDS = {
  daily_note: [
    "presentation",
    "activities",
    "young_person_voice",
    "behaviour_update",
    "actions_required",
    "positives",
  ],
  incident: [
    "description",
    "antecedent",
    "presentation",
    "child_voice",
    "staff_response",
    "outcome",
    "actions_taken",
  ],
  health_record: ["summary", "child_voice", "outcome", "professional_name", "next_action_date"],
  education_record: [
    "learning_engagement",
    "behaviour_summary",
    "child_voice",
    "achievement_note",
    "action_taken",
    "issue_raised",
  ],
  family_contact: [
    "pre_contact_presentation",
    "post_contact_presentation",
    "child_voice",
    "concerns",
    "follow_up_required",
  ],
  keywork: ["purpose", "summary", "child_voice", "reflective_analysis", "actions_agreed"],
  safeguarding_record: [
    "concern_details",
    "disclosure_details",
    "immediate_action_taken",
    "referral_details",
    "outcome",
  ],
  missing_episode: [
    "trigger_factors",
    "push_pull_factors",
    "actions_taken",
    "child_voice",
    "outcome",
  ],
  medication_profile: ["medication_name", "dosage", "route", "frequency", "prn_guidance", "notes"],
  medication_record: [
    "medication_name",
    "dose",
    "status",
    "scheduled_time",
    "administered_time",
    "refusal_reason",
    "omission_reason",
    "error_details",
  ],
  handover_record: ["shift", "summary", "risks", "actions_required", "handover_notes"],
};

function renderObjectValue(value) {
  if (value === null || value === undefined || value === "") return "—";

  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value
      .map((item) =>
        escapeHtml(typeof item === "object" ? JSON.stringify(item) : String(item))
      )
      .join(", ");
  }

  if (typeof value === "object") {
    return `<pre class="drawer-code-block">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  }

  return escapeHtml(String(value));
}

function detailRows(detail = {}) {
  return Object.entries(detail).filter(
    ([key, value]) =>
      !DRAWER_HIDDEN_KEYS.has(key) && value !== null && value !== "" && value !== undefined
  );
}

function splitDetailRows(type, detail = {}) {
  const rows = detailRows(detail);
  const preferred = DRAWER_PRIORITY_FIELDS[type] || [];
  if (!preferred.length) {
    return { primaryRows: rows, supportingRows: [] };
  }

  const preferredSet = new Set(preferred);
  const sortedPrimaryRows = preferred
    .map((field) => rows.find(([key]) => key === field))
    .filter(Boolean);
  const supportingRows = rows.filter(([key]) => !preferredSet.has(key));
  return { primaryRows: sortedPrimaryRows, supportingRows };
}

function renderRowsBlock(rows = []) {
  if (!rows.length) return "";
  return rows
    .map(
      ([key, value]) => `
        <div class="drawer-detail-row">
          <div class="drawer-detail-key">${escapeHtml(prettifyKey(key))}</div>
          <div class="drawer-detail-value">${renderObjectValue(value)}</div>
        </div>
      `
    )
    .join("");
}

function renderDetailRows(type, detail = {}) {
  const { primaryRows, supportingRows } = splitDetailRows(type, detail);
  const combinedRows = [...primaryRows, ...supportingRows];

  if (!combinedRows.length) {
    return `
      <div class="drawer-detail-list">
        <div class="drawer-detail-row">
          <div class="drawer-detail-key">Details</div>
          <div class="drawer-detail-value">No additional details.</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="drawer-detail-list">
      ${
        primaryRows.length
          ? `
        <section class="drawer-detail-group drawer-detail-group--primary">
          <h4>Key details</h4>
          ${renderRowsBlock(primaryRows)}
        </section>
      `
          : ""
      }
      ${
        supportingRows.length
          ? `
        <section class="drawer-detail-group">
          <h4>Additional detail</h4>
          ${renderRowsBlock(supportingRows)}
        </section>
      `
          : ""
      }
    </div>
  `;
}

function renderDrawerSection(type, detail = {}) {
  return `
    <section class="drawer-content-card">
      ${renderDetailRows(type, detail)}
    </section>
  `;
}

/* ------------------------------ drawer state ----------------------------- */

export function openDrawer() {
  els.drawer?.classList.remove("hidden");
  els.drawerBackdrop?.classList.remove("hidden");
  els.drawer?.setAttribute("aria-hidden", "false");
  state.recordDrawerOpen = true;
}

export function closeDrawer() {
  els.drawer?.classList.add("hidden");
  els.drawerBackdrop?.classList.add("hidden");
  els.drawer?.setAttribute("aria-hidden", "true");

  state.activeRecordItem = null;
  state.activeRecordType = null;
  state.recordDrawerOpen = false;

  hideSuggestionsPanelSafe();
}

function setDrawerButtons(type) {
  const active = state.activeRecordItem || {};
  const id = getRecordId(active);
  const hasWorkflow = Boolean(
    id &&
      (buildScopedWorkflowUrl(type, id, "submit", active) ||
        buildScopedWorkflowUrl(type, id, "approve", active) ||
        buildScopedWorkflowUrl(type, id, "return", active) ||
        buildScopedWorkflowUrl(type, id, "archive", active))
  );

  els.drawerActions?.classList.toggle("hidden", !hasWorkflow);

  if (!hasWorkflow) return;

  els.drawerSubmitBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "submit", active)
  );
  els.drawerApproveBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "approve", active)
  );
  els.drawerReturnBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "return", active)
  );
  els.drawerArchiveBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "archive", active)
  );

  if (type === "appointment") {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Complete";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Cancel";
  } else {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Approve";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Return";
  }
}

function setDrawerWorkflowBusy(isBusy) {
  [
    els.drawerEditBtn,
    els.drawerSubmitBtn,
    els.drawerApproveBtn,
    els.drawerReturnBtn,
    els.drawerArchiveBtn,
    els.closeDrawerBtn,
  ].forEach((button) => {
    if (!button) return;
    button.disabled = Boolean(isBusy);
  });
}

/* ------------------------------ suggestions ------------------------------ */

function buildSuggestionContext(type, detail = {}, item = {}) {
  return {
    ...item,
    ...detail,
    id: getRecordId(detail) || getRecordId(item),
    record_type: type,
    source_id: getRecordId(detail) || getRecordId(item),
  };
}

function shouldShowSuggestionsForType(type) {
  return [
    "daily_note",
    "incident",
    "support_plan",
    "risk",
    "health_record",
    "education_record",
    "family_contact",
    "keywork",
    "appointment",
    "safeguarding_record",
    "missing_episode",
    "task",
    "communication",
    "document",
    "statutory_document",
    "therapy",
    "supervision",
    "audit",
    "compliance",
    "compliance_item",
    "manager_action",
    "handover",
    "handover_record",
    "medication_record",
  ].includes(type);
}

/* -------------------------------- fetch -------------------------------- */

async function fetchRecordDetail(url) {
  if (!url) {
    throw new Error("No detail URL available for this record.");
  }

  return apiGet(url, { skipCache: true });
}

/* ------------------------------ public api ------------------------------- */

export async function openRecordDetail(item) {
  const normalised = normaliseDisplayRecord(item);
  const meta = buildRecordDisplayMeta(normalised);
  const type = normalised.type || normaliseRecordType(item);
  const rawItem = normalised.raw || item;
  const url = getRecordUrl(normalised);

  state.activeRecordItem = normalised;
  state.activeRecordType = type;

  openDrawer();
  setDrawerButtons(type);
  setDrawerWorkflowBusy(false);

  if (els.drawerTitle) {
    els.drawerTitle.textContent = meta.title || RECORD_CONFIG[type]?.label || "Details";
  }

  if (els.drawerSubtitle) {
    els.drawerSubtitle.textContent = "Loading…";
  }

  if (els.drawerBody) {
    els.drawerBody.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading details…</p>
        </div>
      </div>
    `;
  }

  try {
    if (!url || rawItem?._local_only) {
      const fallbackDetail = {
        ...rawItem,
        detail_status: rawItem?._local_only ? "local_preview" : "preview_only",
        detail_note: rawItem?._local_only
          ? "This record is currently stored locally because no live endpoint was available."
          : "This item is being shown from the normalised record data.",
      };

      if (els.drawerTitle) {
        els.drawerTitle.textContent =
          meta.title ||
          rawItem.title ||
          rawItem.name ||
          rawItem.staff_member ||
          rawItem.young_person_name ||
          RECORD_CONFIG[type]?.label ||
          "Details";
      }

      if (els.drawerSubtitle) {
        els.drawerSubtitle.textContent = buildSubtitle(type, normalised, fallbackDetail);
      }

      if (els.drawerBody) {
        els.drawerBody.innerHTML = renderDrawerSection(type, fallbackDetail);
      }

      hideSuggestionsPanelSafe();
      return;
    }

    const data = await fetchRecordDetail(url);
    const detail = detailObjectFromResponse(data);

    if (els.drawerTitle) {
      els.drawerTitle.textContent =
        meta.title ||
        detail.title ||
        detail.name ||
        detail.incident_type ||
        detail.contact_person ||
        detail.staff_member ||
        detail.young_person_name ||
        RECORD_CONFIG[type]?.label ||
        "Details";
    }

    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = buildSubtitle(type, normalised, detail);
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = renderDrawerSection(type, detail);
    }

    if (shouldShowSuggestionsForType(type)) {
      const suggestionRecord = buildSuggestionContext(type, detail, rawItem);
      const suggestions = mergeSuggestionLists(
        evaluateRecordSuggestions(suggestionRecord)
      );

      if (suggestions.length) {
        showSuggestionsPanelSafe(suggestions, {
          source_record_type: type,
          source_record_id: suggestionRecord.id,
          scope: getCurrentScope(),
        });
      } else {
        hideSuggestionsPanelSafe();
      }
    } else {
      hideSuggestionsPanelSafe();
    }
  } catch (error) {
    const fallbackDetail = {
      ...rawItem,
      detail_status: "loaded_from_normalised_record",
      detail_note:
        "The detail endpoint was unavailable, so IndiCare displayed the normalised record data instead.",
    };

    if (els.drawerTitle) {
      els.drawerTitle.textContent = meta.title || RECORD_CONFIG[type]?.label || "Details";
    }

    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = buildSubtitle(type, normalised, fallbackDetail);
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = renderDrawerSection(type, fallbackDetail);
    }

    hideSuggestionsPanelSafe();
  }
}

export async function runDrawerWorkflow(action) {
  const item = state.activeRecordItem;
  const type = state.activeRecordType;

  if (!item || !type) {
    throw new Error("No active record is available.");
  }

  const id = getRecordId(item);
  if (!id) {
    throw new Error("No record ID is available.");
  }

  const url = buildScopedWorkflowUrl(type, id, action, item.raw || item);

  if (!url) {
    throw new Error(`No workflow action is configured for "${action}".`);
  }

  let body = null;

  if (action === "approve" && type !== "appointment") {
    body = { review_note: "Approved in workspace" };
  }

  if (action === "return" && type !== "appointment") {
    body = { review_note: "Returned in workspace" };
  }

  return apiSend(url, "POST", body);
}

let drawerEventsBound = false;

export function bindRecordDrawerEvents({ onEdit, onWorkflowComplete } = {}) {
  if (drawerEventsBound) return;
  drawerEventsBound = true;

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);

  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType) return;
    onEdit?.(state.activeRecordType, state.activeRecordItem.raw || state.activeRecordItem);
  });

  const handleWorkflowAction = async (action) => {
    try {
      setDrawerWorkflowBusy(true);
      await runDrawerWorkflow(action);
      closeDrawer();
      await onWorkflowComplete?.({ action });
    } catch (error) {
      setDrawerWorkflowBusy(false);

      if (els.drawerSubtitle) {
        els.drawerSubtitle.textContent = "Action failed";
      }

      if (els.drawerBody) {
        els.drawerBody.innerHTML = renderRichEmptyState(
          "Workflow action failed",
          error?.message || "The record action could not be completed."
        );
      }
    }
  };

  els.drawerSubmitBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("submit");
  });

  els.drawerApproveBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("approve");
  });

  els.drawerReturnBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("return");
  });

  els.drawerArchiveBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("archive");
  });
}

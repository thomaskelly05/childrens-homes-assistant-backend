import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  evaluateRecordSuggestions,
  mergeSuggestionLists,
} from "../core/rules-client.js";

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
      title.textContent = suggestions.length
        ? `Suggested follow-ups`
        : "Suggestions";
    }

    if (subtitle) {
      const bits = [];
      if (meta.source_record_type) bits.push(String(meta.source_record_type).replaceAll("_", " "));
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
                item.title ||
                item.label ||
                item.name ||
                `Suggestion ${index + 1}`;

              const description =
                item.description ||
                item.summary ||
                item.reason ||
                "";

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
                    <div class="record-row-meta">${escapeHtml(String(actionType).replaceAll("_", " "))}</div>
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

function buildScopedDetailUrl(recordType, id) {
  const childBase = getChildScopedBase();
  const homeBase = getHomeScopedBase();
  const scope = getCurrentScope();

  const childRoutes = {
    daily_note: `${childBase}/daily-notes/${id}`,
    incident: `${childBase}/incidents/${id}`,
    support_plan: `${childBase}/plans/${id}`,
    risk: `${childBase}/risks/${id}`,
    appointment: `${childBase}/appointments/${id}`,
    health_record: `${childBase}/health-records/${id}`,
    education_record: `${childBase}/education-records/${id}`,
    family_contact: `${childBase}/family-contact-records/${id}`,
    keywork: `${childBase}/keywork/${id}`,
    report: `${childBase}/reports/${id}`,
    chronology_event: `${childBase}/chronology/${id}`,
    compliance_item: `${childBase}/compliance/${id}`,
    safeguarding_record: `${childBase}/safeguarding-records/${id}`,
    missing_episode: `${childBase}/missing-episodes/${id}`,
    task: `${childBase}/tasks/${id}`,
    achievement_record: `${childBase}/achievements/${id}`,
    medication_profile: `${childBase}/medication-profiles/${id}`,
    medication_record: `${childBase}/medication-records/${id}`,
    communication: `${childBase}/communications/${id}`,
    document: `${childBase}/documents/${id}`,
    therapy: `${childBase}/therapy/${id}`,
  };

  const homeRoutes = {
    daily_note: `${homeBase}/daily-notes/${id}`,
    incident: `${homeBase}/incidents/${id}`,
    support_plan: `${homeBase}/plans/${id}`,
    risk: `${homeBase}/risks/${id}`,
    appointment: `${homeBase}/appointments/${id}`,
    task: `${homeBase}/tasks/${id}`,
    manager_action: `${homeBase}/manager-actions/${id}`,
    communication: `${homeBase}/communications/${id}`,
    document: `${homeBase}/documents/${id}`,
    therapy: `${homeBase}/therapy/${id}`,
    team: `${homeBase}/team/${id}`,
    supervision: `${homeBase}/supervisions/${id}`,
    compliance: `${homeBase}/compliance/${id}`,
    compliance_item: `${homeBase}/compliance/${id}`,
    audit: `${homeBase}/audits/${id}`,
    report: `${homeBase}/reports/${id}`,
    handover: `${homeBase}/handover/${id}`,
    shift_log: `${homeBase}/shift-logs/${id}`,
    onboarding: `${homeBase}/onboarding/${id}`,
    notification: `${homeBase}/notifications/${id}`,
    home_notification: `${homeBase}/home-notifications/${id}`,
    operational_notification: `${homeBase}/operational-notifications/${id}`,
    finance: `${homeBase}/finance/${id}`,
  };

  if (scope === "child") {
    return childRoutes[recordType] || null;
  }

  return homeRoutes[recordType] || childRoutes[recordType] || null;
}

function buildScopedWorkflowUrl(recordType, id, action) {
  const childBase = getChildScopedBase();
  const homeBase = getHomeScopedBase();
  const scope = getCurrentScope();

  const childActions = {
    daily_note: {
      submit: `${childBase}/daily-notes/${id}/submit`,
      approve: `${childBase}/daily-notes/${id}/approve`,
      return: `${childBase}/daily-notes/${id}/return`,
      archive: `${childBase}/daily-notes/${id}/archive`,
    },
    incident: {
      submit: `${childBase}/incidents/${id}/submit`,
      approve: `${childBase}/incidents/${id}/approve`,
      return: `${childBase}/incidents/${id}/return`,
      archive: `${childBase}/incidents/${id}/archive`,
    },
    support_plan: {
      submit: `${childBase}/plans/${id}/submit`,
      approve: `${childBase}/plans/${id}/approve`,
      return: `${childBase}/plans/${id}/return`,
      archive: `${childBase}/plans/${id}/archive`,
    },
    risk: {
      submit: `${childBase}/risks/${id}/submit`,
      approve: `${childBase}/risks/${id}/approve`,
      return: `${childBase}/risks/${id}/return`,
      archive: `${childBase}/risks/${id}/archive`,
    },
    appointment: {
      approve: `${childBase}/appointments/${id}/complete`,
      return: `${childBase}/appointments/${id}/cancel`,
    },
    keywork: {
      submit: `${childBase}/keywork/${id}/submit`,
      approve: `${childBase}/keywork/${id}/approve`,
      return: `${childBase}/keywork/${id}/return`,
      archive: `${childBase}/keywork/${id}/archive`,
    },
    safeguarding_record: {
      submit: `${childBase}/safeguarding-records/${id}/submit`,
      approve: `${childBase}/safeguarding-records/${id}/approve`,
      return: `${childBase}/safeguarding-records/${id}/return`,
      archive: `${childBase}/safeguarding-records/${id}/archive`,
    },
    missing_episode: {
      submit: `${childBase}/missing-episodes/${id}/submit`,
      approve: `${childBase}/missing-episodes/${id}/approve`,
      return: `${childBase}/missing-episodes/${id}/return`,
      archive: `${childBase}/missing-episodes/${id}/archive`,
    },
  };

  const homeActions = {
    daily_note: {
      submit: `${homeBase}/daily-notes/${id}/submit`,
      approve: `${homeBase}/daily-notes/${id}/approve`,
      return: `${homeBase}/daily-notes/${id}/return`,
      archive: `${homeBase}/daily-notes/${id}/archive`,
    },
    incident: {
      submit: `${homeBase}/incidents/${id}/submit`,
      approve: `${homeBase}/incidents/${id}/approve`,
      return: `${homeBase}/incidents/${id}/return`,
      archive: `${homeBase}/incidents/${id}/archive`,
    },
    support_plan: {
      submit: `${homeBase}/plans/${id}/submit`,
      approve: `${homeBase}/plans/${id}/approve`,
      return: `${homeBase}/plans/${id}/return`,
      archive: `${homeBase}/plans/${id}/archive`,
    },
    risk: {
      submit: `${homeBase}/risks/${id}/submit`,
      approve: `${homeBase}/risks/${id}/approve`,
      return: `${homeBase}/risks/${id}/return`,
      archive: `${homeBase}/risks/${id}/archive`,
    },
    appointment: {
      approve: `${homeBase}/appointments/${id}/complete`,
      return: `${homeBase}/appointments/${id}/cancel`,
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
  const raw = lower(
    item.record_type ||
      item.primary_record_type ||
      item.source_table ||
      item.event_type ||
      item.category ||
      item.type ||
      ""
  );

  const map = {
    plan: "support_plan",
    support_plans: "support_plan",
    support_plan: "support_plan",
    daily_notes: "daily_note",
    daily_note: "daily_note",
    incidents: "incident",
    incident: "incident",
    risk_assessment: "risk",
    risk_assessments: "risk",
    risks: "risk",
    risk: "risk",
    health_records: "health_record",
    health_record: "health_record",
    education_records: "education_record",
    education_record: "education_record",
    family_contact_records: "family_contact",
    family_contact_record: "family_contact",
    family_contact: "family_contact",
    contact: "family_contact",
    keywork_sessions: "keywork",
    keywork_session: "keywork",
    keywork: "keywork",
    ai_generated_reports: "report",
    reports: "report",
    report: "report",
    chronology_events: "chronology_event",
    chronology_event: "chronology_event",
    compliance_items: "compliance_item",
    compliance_item: "compliance_item",
    young_person_appointments: "appointment",
    appointments: "appointment",
    appointment: "appointment",
    safeguarding_records: "safeguarding_record",
    safeguarding_record: "safeguarding_record",
    missing_episodes: "missing_episode",
    missing_episode: "missing_episode",
    tasks: "task",
    task: "task",
    achievement_records: "achievement_record",
    achievement_record: "achievement_record",
    medication_profiles: "medication_profile",
    medication_profile: "medication_profile",
    medication_records: "medication_record",
    medication_record: "medication_record",
    communications: "communication",
    communication: "communication",
    documents: "document",
    document: "document",
    therapy_records: "therapy",
    therapeutic_services: "therapy",
    therapy_sessions: "therapy",
    therapy: "therapy",
    team_items: "team",
    staff: "team",
    team: "team",
    supervisions: "supervision",
    supervision_sessions: "supervision",
    supervision: "supervision",
    audits: "audit",
    audit: "audit",
    compliance: "compliance",
    manager_actions: "manager_action",
    manager_action: "manager_action",
    onboarding: "onboarding",
    onboarding_programmes: "onboarding",
    onboarding_plans: "onboarding",
    notifications: "notification",
    notification: "notification",
    home_notifications: "home_notification",
    operational_notifications: "operational_notification",
    shift_logs: "shift_log",
    shift_log: "shift_log",
    handover: "handover",
    handovers: "handover",
    petty_cash_transactions: "finance",
    purchase_requests: "finance",
    allowance_payments: "finance",
    young_person_financial_transactions: "finance",
    finance: "finance",
  };

  return map[raw] || raw;
}

/* ------------------------------ record ids ------------------------------- */

export function getRecordId(item = {}) {
  return firstDefined(
    item.record_id,
    item.source_id,
    item.id,
    item.incident_id,
    item.task_id,
    item.document_id,
    item.report_id
  );
}

export function getRecordUrl(item = {}) {
  const type = normaliseRecordType(item);
  const id = getRecordId(item);
  if (!id) return null;
  return buildScopedDetailUrl(type, id);
}

/* ----------------------------- drawer content ---------------------------- */

function buildSubtitle(type, item = {}, detail = {}) {
  const dateValue = firstDefined(
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
    item.workflow_status,
    item.status,
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
    data.therapy ||
    data.team ||
    data.supervision ||
    data.audit ||
    data.compliance ||
    data.manager_action ||
    data.notification ||
    data.home_notification ||
    data.operational_notification ||
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

function renderDetailRows(detail = {}) {
  const rows = Object.entries(detail).filter(
    ([key, value]) =>
      ![
        "id",
        "young_person_id",
        "home_id",
        "created_by",
        "updated_by",
        "_local_only",
      ].includes(key) &&
      value !== null &&
      value !== "" &&
      value !== undefined
  );

  if (!rows.length) {
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
      ${rows
        .map(
          ([key, value]) => `
            <div class="drawer-detail-row">
              <div class="drawer-detail-key">${escapeHtml(prettifyKey(key))}</div>
              <div class="drawer-detail-value">${renderObjectValue(value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDrawerSection(detail = {}) {
  return `
    <section class="drawer-content-card">
      ${renderDetailRows(detail)}
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
  const id = getRecordId(state.activeRecordItem || {});
  const hasWorkflow = Boolean(
    id &&
      (buildScopedWorkflowUrl(type, id, "submit") ||
        buildScopedWorkflowUrl(type, id, "approve") ||
        buildScopedWorkflowUrl(type, id, "return") ||
        buildScopedWorkflowUrl(type, id, "archive"))
  );

  els.drawerActions?.classList.toggle("hidden", !hasWorkflow);

  if (!hasWorkflow) return;

  els.drawerSubmitBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "submit")
  );
  els.drawerApproveBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "approve")
  );
  els.drawerReturnBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "return")
  );
  els.drawerArchiveBtn?.classList.toggle(
    "hidden",
    !buildScopedWorkflowUrl(type, id, "archive")
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
    "therapy",
    "supervision",
    "audit",
    "compliance",
    "compliance_item",
    "manager_action",
  ].includes(type);
}

/* -------------------------------- fetch -------------------------------- */

async function fetchRecordDetail(url) {
  if (!url) {
    throw new Error("No detail URL available for this record.");
  }

  return apiGet(url);
}

/* ------------------------------ public api ------------------------------- */

export async function openRecordDetail(item) {
  const type = normaliseRecordType(item);
  const url = getRecordUrl(item);

  state.activeRecordItem = item;
  state.activeRecordType = type;

  openDrawer();
  setDrawerButtons(type);
  setDrawerWorkflowBusy(false);

  if (els.drawerTitle) {
    els.drawerTitle.textContent =
      item.title ||
      item.name ||
      item.staff_member ||
      item.young_person_name ||
      RECORD_CONFIG[type]?.label ||
      "Details";
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
    if (!url || item?._local_only) {
      const fallbackDetail = {
        ...item,
        detail_status: item?._local_only ? "local_preview" : "preview_only",
        detail_note: item?._local_only
          ? "This record is currently stored locally because no live endpoint was available."
          : "This item does not yet have a dedicated detail endpoint.",
      };

      if (els.drawerTitle) {
        els.drawerTitle.textContent =
          item.title ||
          item.name ||
          item.staff_member ||
          item.young_person_name ||
          RECORD_CONFIG[type]?.label ||
          "Details";
      }

      if (els.drawerSubtitle) {
        els.drawerSubtitle.textContent = buildSubtitle(type, item, fallbackDetail);
      }

      if (els.drawerBody) {
        els.drawerBody.innerHTML = renderDrawerSection(fallbackDetail);
      }

      hideSuggestionsPanelSafe();
      return;
    }

    const data = await fetchRecordDetail(url);
    const detail = detailObjectFromResponse(data);

    if (els.drawerTitle) {
      els.drawerTitle.textContent =
        item.title ||
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
      els.drawerSubtitle.textContent = buildSubtitle(type, item, detail);
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = renderDrawerSection(detail);
    }

    if (shouldShowSuggestionsForType(type)) {
      const suggestionRecord = buildSuggestionContext(type, detail, item);
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
    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = "Unable to load";
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = renderRichEmptyState(
        "Record unavailable",
        error.message || "Failed to load record details."
      );
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

  const url = buildScopedWorkflowUrl(type, id, action);

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
    onEdit?.(state.activeRecordType, state.activeRecordItem);
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

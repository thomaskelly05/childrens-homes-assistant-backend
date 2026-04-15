import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  renderRowList,
  renderRecordsTable,
  renderBadges,
  statusBadgeClass,
  renderSection,
  renderSummaryStat,
  renderEmptyState,
} from "./helpers.js";
import {
  evaluateRecordSuggestions,
  mergeSuggestionLists,
} from "../core/rules-client.js";
import {
  showSuggestionsPanel,
  hideSuggestionsPanel,
} from "./suggestions.js";

export {
  renderRowList,
  renderRecordsTable,
  renderBadges,
  statusBadgeClass,
  renderSection,
  renderSummaryStat,
  renderEmptyState,
} from "./helpers.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeScopedBase() {
  return "/homes";
}

function getChildScopedBase() {
  return "/young-people";
}

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
  };

  const homeRoutes = {
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
    audit: `${homeBase}/audits/${id}`,
    report: `${homeBase}/reports/${id}`,
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

const RECORD_CONFIG = {
  daily_note: { label: "Daily note" },
  incident: { label: "Important event" },
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
};

export function normaliseRecordType(item = {}) {
  const raw = String(
    item.record_type ||
      item.primary_record_type ||
      item.source_table ||
      item.event_type ||
      item.category ||
      item.type ||
      ""
  )
    .toLowerCase()
    .trim();

  if (raw === "plan" || raw === "support_plans") return "support_plan";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
  if (raw === "risk_assessment" || raw === "risk_assessments") return "risk";
  if (raw === "health_records") return "health_record";
  if (raw === "education_records") return "education_record";
  if (raw === "family_contact_records") return "family_contact";
  if (raw === "keywork_sessions") return "keywork";
  if (raw === "ai_generated_reports") return "report";
  if (raw === "chronology_events") return "chronology_event";
  if (raw === "compliance_items") return "compliance_item";
  if (raw === "young_person_appointments" || raw === "appointments") return "appointment";
  if (raw === "safeguarding_records") return "safeguarding_record";
  if (raw === "missing_episodes") return "missing_episode";
  if (raw === "tasks") return "task";
  if (raw === "achievement_records") return "achievement_record";
  if (raw === "medication_profiles") return "medication_profile";
  if (raw === "medication_records") return "medication_record";
  if (raw === "communications") return "communication";
  if (raw === "documents") return "document";
  if (raw === "therapy_records" || raw === "therapeutic_services" || raw === "therapy") return "therapy";
  if (raw === "team_items" || raw === "staff" || raw === "team") return "team";
  if (raw === "supervisions") return "supervision";
  if (raw === "audits") return "audit";
  if (raw === "compliance") return "compliance";
  if (raw === "manager_actions") return "manager_action";

  return raw;
}

export function getRecordId(item = {}) {
  return item.record_id || item.source_id || item.id || null;
}

export function getRecordUrl(item = {}) {
  const type = normaliseRecordType(item);
  const id = getRecordId(item);
  if (!id) return null;
  return buildScopedDetailUrl(type, id);
}

function buildSubtitle(type, item = {}, detail = {}) {
  const dateValue =
    item.event_datetime ||
    item.start_datetime ||
    item.contact_datetime ||
    item.session_date ||
    item.record_date ||
    item.recorded_at ||
    item.occurred_at ||
    item.audit_date ||
    item.review_date ||
    item.created_at ||
    detail.event_datetime ||
    detail.start_datetime ||
    detail.contact_datetime ||
    detail.session_date ||
    detail.record_date ||
    detail.note_date ||
    detail.incident_datetime ||
    detail.audit_date ||
    detail.review_date ||
    detail.created_at ||
    null;

  const status =
    item.workflow_status ||
    item.status ||
    item.approval_status ||
    detail.workflow_status ||
    detail.status ||
    detail.approval_status ||
    "";

  return [
    String(type || "record").replaceAll("_", " "),
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
    data.item ||
    data.record ||
    data
  );
}

function prettifyKey(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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
      !["id", "young_person_id", "home_id", "created_by", "updated_by", "_local_only"].includes(key) &&
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

  els.drawerSubmitBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "submit"));
  els.drawerApproveBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "approve"));
  els.drawerReturnBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "return"));
  els.drawerArchiveBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "archive"));

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
    "manager_action",
  ].includes(type);
}

async function fetchRecordDetail(url) {
  if (!url) {
    throw new Error("No detail URL available for this record.");
  }

  return apiGet(url);
}

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

      hideSuggestionsPanel();
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
        showSuggestionsPanel(suggestions, {
          source_record_type: type,
          source_record_id: suggestionRecord.id,
          scope: getCurrentScope(),
        });
      } else {
        hideSuggestionsPanel();
      }
    } else {
      hideSuggestionsPanel();
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

    hideSuggestionsPanel();
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

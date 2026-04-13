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

const RECORD_CONFIG = {
  daily_note: {
    label: "Daily note",
    detailUrl: (id) => `/young-people/daily-notes/${id}`,
    submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
    approveUrl: (id) => `/young-people/daily-notes/${id}/approve`,
    returnUrl: (id) => `/young-people/daily-notes/${id}/return`,
    archiveUrl: (id) => `/young-people/daily-notes/${id}/archive`,
  },
  incident: {
    label: "Important event",
    detailUrl: (id) => `/young-people/incidents/${id}`,
    submitUrl: (id) => `/young-people/incidents/${id}/submit`,
    approveUrl: (id) => `/young-people/incidents/${id}/approve`,
    returnUrl: (id) => `/young-people/incidents/${id}/return`,
    archiveUrl: (id) => `/young-people/incidents/${id}/archive`,
  },
  support_plan: {
    label: "Support plan",
    detailUrl: (id) => `/young-people/plans/${id}`,
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
    approveUrl: (id) => `/young-people/plans/${id}/approve`,
    returnUrl: (id) => `/young-people/plans/${id}/return`,
    archiveUrl: (id) => `/young-people/plans/${id}/archive`,
  },
  risk: {
    label: "Risk assessment",
    detailUrl: (id) => `/young-people/risks/${id}`,
    submitUrl: (id) => `/young-people/risks/${id}/submit`,
    approveUrl: (id) => `/young-people/risks/${id}/approve`,
    returnUrl: (id) => `/young-people/risks/${id}/return`,
    archiveUrl: (id) => `/young-people/risks/${id}/archive`,
  },
  appointment: {
    label: "Appointment",
    detailUrl: (id) => `/young-people/appointments/${id}`,
    approveUrl: (id) => `/young-people/appointments/${id}/complete`,
    returnUrl: (id) => `/young-people/appointments/${id}/cancel`,
  },
  health_record: {
    label: "Health record",
    detailUrl: (id) => `/young-people/health-records/${id}`,
  },
  education_record: {
    label: "Education record",
    detailUrl: (id) => `/young-people/education-records/${id}`,
  },
  family_contact: {
    label: "Family contact",
    detailUrl: (id) => `/young-people/family-contact-records/${id}`,
  },
  keywork: {
    label: "Keywork session",
    detailUrl: (id) => `/young-people/keywork/${id}`,
    submitUrl: (id) => `/young-people/keywork/${id}/submit`,
    approveUrl: (id) => `/young-people/keywork/${id}/approve`,
    returnUrl: (id) => `/young-people/keywork/${id}/return`,
    archiveUrl: (id) => `/young-people/keywork/${id}/archive`,
  },
  report: {
    label: "Report",
    detailUrl: (id) => `/young-people/reports/${id}`,
  },
  chronology_event: {
    label: "Chronology event",
    detailUrl: (id) => `/young-people/chronology/${id}`,
  },
  compliance_item: {
    label: "Compliance item",
    detailUrl: (id) => `/young-people/compliance/${id}`,
  },
  safeguarding_record: {
    label: "Safeguarding record",
    detailUrl: (id) => `/young-people/safeguarding-records/${id}`,
    submitUrl: (id) => `/young-people/safeguarding-records/${id}/submit`,
    approveUrl: (id) => `/young-people/safeguarding-records/${id}/approve`,
    returnUrl: (id) => `/young-people/safeguarding-records/${id}/return`,
    archiveUrl: (id) => `/young-people/safeguarding-records/${id}/archive`,
  },
  missing_episode: {
    label: "Missing episode",
    detailUrl: (id) => `/young-people/missing-episodes/${id}`,
    submitUrl: (id) => `/young-people/missing-episodes/${id}/submit`,
    approveUrl: (id) => `/young-people/missing-episodes/${id}/approve`,
    returnUrl: (id) => `/young-people/missing-episodes/${id}/return`,
    archiveUrl: (id) => `/young-people/missing-episodes/${id}/archive`,
  },
  task: {
    label: "Task",
    detailUrl: (id) => `/young-people/tasks/${id}`,
  },
  achievement_record: {
    label: "Achievement",
    detailUrl: (id) => `/young-people/achievements/${id}`,
  },
  medication_profile: {
    label: "Medication profile",
    detailUrl: (id) => `/young-people/medication-profiles/${id}`,
  },
  medication_record: {
    label: "Medication record",
    detailUrl: (id) => `/young-people/medication-records/${id}`,
  },

  // Wider home / quality shell items
  communication: {
    label: "Communication",
    detailUrl: (id) => `/communications/${id}`,
  },
  document: {
    label: "Document",
    detailUrl: (id) => `/documents/${id}`,
  },
  therapy: {
    label: "Therapy",
    detailUrl: (id) => `/therapy/${id}`,
  },
  team: {
    label: "Team item",
    detailUrl: (id) => `/team/${id}`,
  },
  supervision: {
    label: "Supervision",
    detailUrl: (id) => `/supervisions/${id}`,
  },
  compliance: {
    label: "Compliance",
    detailUrl: (id) => `/compliance/${id}`,
  },
  audit: {
    label: "Audit",
    detailUrl: (id) => `/audits/${id}`,
  },
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
  if (raw === "therapy_records" || raw === "therapeutic_services") return "therapy";
  if (raw === "team_items" || raw === "staff") return "team";
  if (raw === "supervisions") return "supervision";
  if (raw === "audits") return "audit";

  return raw;
}

export function getRecordId(item = {}) {
  return item.record_id || item.source_id || item.id || null;
}

export function getRecordUrl(item = {}) {
  const type = normaliseRecordType(item);
  const id = getRecordId(item);
  if (!id) return null;

  const config = RECORD_CONFIG[type];
  if (config?.detailUrl) {
    return config.detailUrl(id);
  }

  return null;
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
      !["id", "young_person_id", "home_id", "created_by", "updated_by"].includes(key) &&
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
  const config = RECORD_CONFIG[type];
  const hasWorkflow = !!(
    config?.submitUrl ||
    config?.approveUrl ||
    config?.returnUrl ||
    config?.archiveUrl
  );

  els.drawerActions?.classList.toggle("hidden", !hasWorkflow);

  if (!hasWorkflow) return;

  els.drawerSubmitBtn?.classList.toggle("hidden", !config.submitUrl);
  els.drawerApproveBtn?.classList.toggle("hidden", !config.approveUrl);
  els.drawerReturnBtn?.classList.toggle("hidden", !config.returnUrl);
  els.drawerArchiveBtn?.classList.toggle("hidden", !config.archiveUrl);

  if (type === "appointment") {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Complete";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Cancel";
  } else {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Approve";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Return";
  }
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

  if (els.drawerTitle) {
    els.drawerTitle.textContent =
      item.title ||
      item.name ||
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
    if (!url) {
      const fallbackDetail = {
        ...item,
        detail_status: "preview_only",
        detail_note: "This item does not yet have a dedicated detail endpoint.",
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
  const config = RECORD_CONFIG[type];

  if (!item || !config) return;

  const id = getRecordId(item);
  if (!id) return;

  let url = null;
  let body = null;

  if (action === "submit" && config.submitUrl) {
    url = config.submitUrl(id);
  }

  if (action === "approve" && config.approveUrl) {
    url = config.approveUrl(id);
    if (type !== "appointment") {
      body = { review_note: "Approved in workspace" };
    }
  }

  if (action === "return" && config.returnUrl) {
    url = config.returnUrl(id);
    if (type !== "appointment") {
      body = { review_note: "Returned in workspace" };
    }
  }

  if (action === "archive" && config.archiveUrl) {
    url = config.archiveUrl(id);
  }

  if (!url) return;
  await apiSend(url, "POST", body);
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

  els.drawerSubmitBtn?.addEventListener("click", async () => {
    await runDrawerWorkflow("submit");
    closeDrawer();
    await onWorkflowComplete?.();
  });

  els.drawerApproveBtn?.addEventListener("click", async () => {
    await runDrawerWorkflow("approve");
    closeDrawer();
    await onWorkflowComplete?.();
  });

  els.drawerReturnBtn?.addEventListener("click", async () => {
    await runDrawerWorkflow("return");
    closeDrawer();
    await onWorkflowComplete?.();
  });

  els.drawerArchiveBtn?.addEventListener("click", async () => {
    await runDrawerWorkflow("archive");
    closeDrawer();
    await onWorkflowComplete?.();
  });
}
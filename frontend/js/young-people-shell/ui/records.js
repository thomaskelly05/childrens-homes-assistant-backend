import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";

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
  appointment: {
    label: "Appointment",
    detailUrl: (id) => `/young-people/appointments/${id}`,
    approveUrl: (id) => `/young-people/appointments/${id}/complete`,
    returnUrl: (id) => `/young-people/appointments/${id}/cancel`,
  },
};

function normaliseRecordType(item = {}) {
  const raw = String(item.record_type || item.event_type || item.category || "").toLowerCase();

  if (raw === "plan") return "support_plan";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
  if (raw === "risk_assessment") return "risk";
  return raw;
}

function getRecordUrl(item = {}) {
  const type = normaliseRecordType(item);
  const id = item.record_id || item.source_id || item.id;
  if (!id) return null;

  const map = {
    daily_note: `/young-people/daily-notes/${id}`,
    incident: `/young-people/incidents/${id}`,
    support_plan: `/young-people/plans/${id}`,
    appointment: `/young-people/appointments/${id}`,
    health: `/young-people/health-records/${id}`,
    health_record: `/young-people/health-records/${id}`,
    medication_profile: `/young-people/medication-profiles/${id}`,
    medication_record: `/young-people/medication-records/${id}`,
    education: `/young-people/education-records/${id}`,
    education_record: `/young-people/education-records/${id}`,
    family: `/young-people/family/records/${id}`,
    family_contact: `/young-people/family/records/${id}`,
    keywork: `/young-people/keywork/${id}`,
    report: `/young-people/reports/${id}`,
    risk: `/young-people/risk/${id}`,
  };

  return map[type] || null;
}

function buildSubtitle(type, item = {}, detail = {}) {
  return `${String(type || "record").replaceAll("_", " ")} • ${formatDate(
    item.recorded_at ||
      item.occurred_at ||
      item.created_at ||
      detail.recorded_at ||
      detail.appointment_date ||
      detail.incident_datetime ||
      detail.note_date ||
      detail.created_at
  )}`;
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
    data.health_record ||
    data.medication_profile ||
    data.medication_record ||
    data.education_record ||
    data.family_contact_record ||
    data.contact ||
    data.keywork ||
    data.report ||
    data
  );
}

function renderDetailRows(detail = {}) {
  const rows = Object.entries(detail).filter(
    ([key, value]) =>
      !["id", "young_person_id", "home_id"].includes(key) &&
      value !== null &&
      value !== "" &&
      value !== undefined
  );

  if (!rows.length) {
    return `
      <div class="drawer-row">
        <div class="drawer-key">Details</div>
        <div class="drawer-value">No additional details.</div>
      </div>
    `;
  }

  return rows
    .map(
      ([key, value]) => `
        <div class="drawer-row">
          <div class="drawer-key">${escapeHtml(key.replaceAll("_", " "))}</div>
          <div class="drawer-value">${escapeHtml(
            typeof value === "object" ? JSON.stringify(value) : String(value)
          )}</div>
        </div>
      `
    )
    .join("");
}

export function openDrawer() {
  els.recordDrawer?.classList.remove("hidden");
  els.recordDrawerBackdrop?.classList.remove("hidden");
  els.recordDrawer?.setAttribute("aria-hidden", "false");
}

export function closeDrawer() {
  els.recordDrawer?.classList.add("hidden");
  els.recordDrawerBackdrop?.classList.add("hidden");
  els.recordDrawer?.setAttribute("aria-hidden", "true");
  state.activeRecordItem = null;
  state.activeRecordType = null;
}

function setDrawerButtons(type) {
  const config = RECORD_CONFIG[type];
  const hasWorkflow = !!config;

  els.recordDrawerActions?.classList.toggle("hidden", !hasWorkflow);

  if (!hasWorkflow) return;

  if (type === "appointment") {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Complete";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Cancel";
    els.drawerSubmitBtn?.classList.add("hidden");
    els.drawerArchiveBtn?.classList.add("hidden");
  } else {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Approve";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Return";
    els.drawerSubmitBtn?.classList.remove("hidden");
    els.drawerArchiveBtn?.classList.remove("hidden");
  }
}

export async function openRecordDetail(item) {
  const type = normaliseRecordType(item);
  const url = getRecordUrl(item);

  if (!url) {
    return;
  }

  state.activeRecordItem = item;
  state.activeRecordType = type;

  openDrawer();
  setDrawerButtons(type);

  if (els.recordDrawerTitle) {
    els.recordDrawerTitle.textContent = item.title || "Details";
  }
  if (els.recordDrawerSubtitle) {
    els.recordDrawerSubtitle.textContent = "Loading…";
  }
  if (els.recordDrawerBody) {
    els.recordDrawerBody.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading details…</p>
        </div>
      </div>
    `;
  }

  try {
    const data = await apiGet(url);
    const detail = detailObjectFromResponse(data);

    if (els.recordDrawerTitle) {
      els.recordDrawerTitle.textContent = item.title || detail.title || "Details";
    }
    if (els.recordDrawerSubtitle) {
      els.recordDrawerSubtitle.textContent = buildSubtitle(type, item, detail);
    }
    if (els.recordDrawerBody) {
      els.recordDrawerBody.innerHTML = `
        <div class="drawer-section">
          ${renderDetailRows(detail)}
        </div>
      `;
    }
  } catch (error) {
    if (els.recordDrawerSubtitle) {
      els.recordDrawerSubtitle.textContent = "Unable to load";
    }
    if (els.recordDrawerBody) {
      els.recordDrawerBody.innerHTML = `
        <div class="empty-state">
          <p>${escapeHtml(error.message || "Failed to load record details.")}</p>
        </div>
      `;
    }
  }
}

export async function runDrawerWorkflow(action) {
  const item = state.activeRecordItem;
  const type = state.activeRecordType;
  const config = RECORD_CONFIG[type];

  if (!item || !config) return;

  const id = item.record_id || item.source_id || item.id;
  if (!id) return;

  let url = null;
  let body = null;

  if (type === "appointment") {
    if (action === "approve") url = config.approveUrl?.(id);
    if (action === "return") url = config.returnUrl?.(id);
  } else {
    if (action === "submit") url = config.submitUrl?.(id);
    if (action === "approve") {
      url = config.approveUrl?.(id);
      body = { review_note: "Approved in workspace" };
    }
    if (action === "return") {
      url = config.returnUrl?.(id);
      body = { review_note: "Returned in workspace" };
    }
    if (action === "archive") url = config.archiveUrl?.(id);
  }

  if (!url) return;

  await apiSend(url, "POST", body);
}

export function bindRecordDrawerEvents({ onEdit, onWorkflowComplete } = {}) {
  els.closeRecordDrawerBtn?.addEventListener("click", closeDrawer);
  els.recordDrawerBackdrop?.addEventListener("click", closeDrawer);

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

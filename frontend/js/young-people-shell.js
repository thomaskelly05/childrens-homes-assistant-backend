const state = {
  youngPersonId: null,
  youngPerson: null,
  currentView: "home",
  selectorItems: [],
  activeRecordItem: null,
  activeRecordType: null,
  modalMode: "create",
  modalRecordType: null,
  modalEditItem: null,
  assistantMessages: [],
};

const els = {
  nav: document.getElementById("sidebarNav"),
  content: document.getElementById("viewContent"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  statusBar: document.getElementById("statusBar"),
  refreshBtn: document.getElementById("refreshBtn"),
  personName: document.getElementById("personName"),
  personMeta: document.getElementById("personMeta"),
  personAvatar: document.getElementById("personAvatar"),

  selectorPanel: document.getElementById("selectorPanel"),
  selectorList: document.getElementById("selectorList"),
  selectorSearch: document.getElementById("selectorSearch"),
  selectorRefreshBtn: document.getElementById("selectorRefreshBtn"),
  workspacePanel: document.getElementById("workspacePanel"),
  quickActions: document.getElementById("quickActions"),
  changePersonBtn: document.getElementById("changePersonBtn"),

  drawer: document.getElementById("recordDrawer"),
  drawerBackdrop: document.getElementById("recordDrawerBackdrop"),
  drawerTitle: document.getElementById("recordDrawerTitle"),
  drawerSubtitle: document.getElementById("recordDrawerSubtitle"),
  drawerBody: document.getElementById("recordDrawerBody"),
  drawerActions: document.getElementById("recordDrawerActions"),
  closeDrawerBtn: document.getElementById("closeRecordDrawerBtn"),
  drawerEditBtn: document.getElementById("drawerEditBtn"),
  drawerSubmitBtn: document.getElementById("drawerSubmitBtn"),
  drawerApproveBtn: document.getElementById("drawerApproveBtn"),
  drawerReturnBtn: document.getElementById("drawerReturnBtn"),
  drawerArchiveBtn: document.getElementById("drawerArchiveBtn"),

  modalBackdrop: document.getElementById("modalBackdrop"),
  modal: document.getElementById("recordModal"),
  modalTitle: document.getElementById("recordModalTitle"),
  modalSubtitle: document.getElementById("recordModalSubtitle"),
  closeModalBtn: document.getElementById("closeRecordModalBtn"),
  modalCancelBtn: document.getElementById("recordModalCancelBtn"),
  modalForm: document.getElementById("recordModalForm"),
  modalFields: document.getElementById("recordModalFields"),
  modalSaveBtn: document.getElementById("recordModalSaveBtn"),

  assistantLauncher: document.getElementById("assistantLauncher"),
  assistantBackdrop: document.getElementById("assistantBackdrop"),
  assistantModal: document.getElementById("assistantModal"),
  closeAssistantBtn: document.getElementById("closeAssistantBtn"),
  assistantContext: document.getElementById("assistantContext"),
  assistantMessages: document.getElementById("assistantMessages"),
  assistantForm: document.getElementById("assistantForm"),
  assistantInput: document.getElementById("assistantInput"),
  assistantSendBtn: document.getElementById("assistantSendBtn"),
  assistantClearBtn: document.getElementById("assistantClearBtn"),
  assistantSuggestions: document.getElementById("assistantSuggestions"),
};

const VIEW_CONFIG = {
  home: {
    title: "Home",
    subtitle: "What matters now",
    loader: loadHome,
  },
  "daily-notes": {
    title: "Daily notes",
    subtitle: "Shift recording and review",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/daily-notes`, "Daily notes"),
  },
  incidents: {
    title: "Incidents",
    subtitle: "Concerns, responses and follow-up",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/incidents`, "Incidents"),
  },
  risk: {
    title: "Risks",
    subtitle: "Current risks and what helps",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/risk`, "Risk assessments"),
  },
  plans: {
    title: "Plans",
    subtitle: "Support and care planning",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/plans`, "Plans"),
  },
  appointments: {
    title: "Appointments",
    subtitle: "Young person appointments",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/appointments`, "Appointments"),
  },
  timeline: {
    title: "Timeline",
    subtitle: "What happened over time",
    loader: loadTimeline,
  },
  handover: {
    title: "Handover",
    subtitle: "What the next adult needs to know",
    loader: loadHandover,
  },
  reports: {
    title: "Reports",
    subtitle: "Summaries and outputs",
    loader: loadReports,
  },
  profile: {
    title: "Profile",
    subtitle: "Identity, communication and legal information",
    loader: loadProfile,
  },
  health: {
    title: "Health",
    subtitle: "Health and medication",
    loader: loadHealth,
  },
  education: {
    title: "Education",
    subtitle: "Education and progress",
    loader: loadEducation,
  },
  family: {
    title: "Family",
    subtitle: "Relationships and contact",
    loader: loadFamily,
  },
  keywork: {
    title: "Keywork",
    subtitle: "Keywork sessions and reflection",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/keywork`, "Keywork"),
  },
  evidence: {
    title: "Evidence",
    subtitle: "Inspection readiness",
    loader: loadEvidence,
  },
  compliance: {
    title: "Compliance",
    subtitle: "Checks and due items",
    loader: loadCompliance,
  },
  manager: {
    title: "Manager review",
    subtitle: "Leadership and oversight",
    loader: loadManager,
  },
};

const RECORD_CONFIG = {
  daily_note: {
    label: "Daily note",
    createUrl: (id) => `/young-people/${id}/daily-notes`,
    updateUrl: (id) => `/young-people/daily-notes/${id}`,
    detailUrl: (id) => `/young-people/daily-notes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
    approveUrl: (id) => `/young-people/daily-notes/${id}/approve`,
    returnUrl: (id) => `/young-people/daily-notes/${id}/return`,
    archiveUrl: (id) => `/young-people/daily-notes/${id}/archive`,
  },
  incident: {
    label: "Incident",
    createUrl: (id) => `/young-people/${id}/incidents`,
    updateUrl: (id) => `/young-people/incidents/${id}`,
    detailUrl: (id) => `/young-people/incidents/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/incidents/${id}/submit`,
    approveUrl: (id) => `/young-people/incidents/${id}/approve`,
    returnUrl: (id) => `/young-people/incidents/${id}/return`,
    archiveUrl: (id) => `/young-people/incidents/${id}/archive`,
  },
  risk: {
    label: "Risk assessment",
    createUrl: (id) => `/young-people/${id}/risk`,
    updateUrl: (id) => `/young-people/risk/${id}`,
    detailUrl: (id) => `/young-people/risk/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/risk/${id}/submit`,
    approveUrl: (id) => `/young-people/risk/${id}/approve`,
    returnUrl: (id) => `/young-people/risk/${id}/return`,
    archiveUrl: (id) => `/young-people/risk/${id}/archive`,
  },
  support_plan: {
    label: "Plan",
    createUrl: (id) => `/young-people/${id}/plans`,
    updateUrl: (id) => `/young-people/plans/${id}`,
    detailUrl: (id) => `/young-people/plans/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
    approveUrl: (id) => `/young-people/plans/${id}/approve`,
    returnUrl: (id) => `/young-people/plans/${id}/return`,
    archiveUrl: (id) => `/young-people/plans/${id}/archive`,
  },
  appointment: {
    label: "Appointment",
    createUrl: (id) => `/young-people/${id}/appointments`,
    updateUrl: (id) => `/young-people/appointments/${id}`,
    detailUrl: (id) => `/young-people/appointments/${id}`,
    updateMethod: "PATCH",
    approveUrl: (id) => `/young-people/appointments/${id}/complete`,
    returnUrl: (id) => `/young-people/appointments/${id}/cancel`,
  },
};

function getYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("young_person_id");
  return id ? Number(id) : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: String(value).includes("T") ? "short" : undefined,
  });
}

function toDateInputValue(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function initialsFromName(name) {
  if (!name) return "YP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "YP";
}

function showError(message) {
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function showMessage(message) {
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function clearStatus() {
  els.statusBar.classList.add("hidden");
  els.statusBar.textContent = "";
}

function setLoading(message = "Loading...") {
  els.content.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function setEmpty(message = "No records found.") {
  els.content.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function apiGet(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  return response.json();
}

async function apiSend(url, method, body) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch (_) {
    return {};
  }
}

function statusBadgeClass(value) {
  const v = String(value || "").toLowerCase();
  if (["approved", "active", "recorded", "completed", "scheduled", "success"].includes(v)) return "success";
  if (["submitted", "pending", "draft", "warning", "medium", "due_soon"].includes(v)) return "warning";
  if (["returned", "archived", "cancelled", "high", "critical", "overdue", "danger"].includes(v)) return "danger";
  return "";
}

function renderBadges(values = []) {
  const list = values.filter(Boolean);
  if (!list.length) return "";
  return `
    <div class="badge-row">
      ${list.map((value) => `<span class="badge ${statusBadgeClass(value)}">${escapeHtml(value)}</span>`).join("")}
    </div>
  `;
}

function renderRecordCard(item) {
  const title =
    item.title ||
    item.topic ||
    item.contact_person ||
    item.record_type ||
    item.event_type ||
    "Record";

  const summary =
    item.summary ||
    item.narrative ||
    item.description ||
    item.concern_summary ||
    item.outcome ||
    "Open to view details.";

  const when =
    item.recorded_at ||
    item.occurred_at ||
    item.event_datetime ||
    item.created_at ||
    item.note_date ||
    item.record_date ||
    item.appointment_date;

  const by =
    item.recorded_by_name ||
    item.author_name ||
    item.created_by_name ||
    item.worker_name ||
    item.owner_name ||
    item.professional_name ||
    "";

  const badges = [
    item.workflow_status,
    item.status,
    item.approval_status,
    item.compliance_status,
    item.severity,
  ].filter(Boolean);

  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(String(title).replaceAll("_", " "))}</h4>
          <div class="record-meta">
            ${escapeHtml(formatDate(when))}
            ${by ? ` • ${escapeHtml(by)}` : ""}
          </div>
        </div>
      </div>

      <div class="record-body">${escapeHtml(summary)}</div>

      ${renderBadges(badges)}

      <div class="day-record-actions">
        <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button>
      </div>
    </article>
  `;
}

function renderSimpleSection(title, subtitle, bodyHtml) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p class="panel-subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${bodyHtml}
    </section>
  `;
}

function renderStat(label, value) {
  return `
    <div class="stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function openDrawer() {
  els.drawer.classList.remove("hidden");
  els.drawerBackdrop.classList.remove("hidden");
  els.drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  els.drawer.classList.add("hidden");
  els.drawerBackdrop.classList.add("hidden");
  els.drawer.setAttribute("aria-hidden", "true");
  state.activeRecordItem = null;
  state.activeRecordType = null;
}

function openModal() {
  els.modal.classList.remove("hidden");
  els.modalBackdrop.classList.remove("hidden");
  els.modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  els.modal.classList.add("hidden");
  els.modalBackdrop.classList.add("hidden");
  els.modal.setAttribute("aria-hidden", "true");
  state.modalMode = "create";
  state.modalRecordType = null;
  state.modalEditItem = null;
  els.modalFields.innerHTML = "";
}

function openAssistant() {
  updateAssistantContext();
  els.assistantModal.classList.remove("hidden");
  els.assistantBackdrop.classList.remove("hidden");
}

function closeAssistant() {
  els.assistantModal.classList.add("hidden");
  els.assistantBackdrop.classList.add("hidden");
}

function toggleAssistantLauncher() {
  if (state.youngPersonId) {
    els.assistantLauncher.classList.remove("hidden");
  } else {
    els.assistantLauncher.classList.add("hidden");
  }
}

function normaliseRecordType(item) {
  const raw = String(item.record_type || item.event_type || item.category || "").toLowerCase();
  if (raw === "plan") return "support_plan";
  if (raw === "risk_assessment") return "risk";
  if (raw === "keywork_session") return "keywork";
  return raw;
}

function getRecordUrl(item) {
  const type = normaliseRecordType(item);
  const id = item.record_id || item.source_id || item.id;
  if (!id) return null;

  const map = {
    daily_note: RECORD_CONFIG.daily_note.detailUrl(id),
    incident: RECORD_CONFIG.incident.detailUrl(id),
    risk: RECORD_CONFIG.risk.detailUrl(id),
    support_plan: RECORD_CONFIG.support_plan.detailUrl(id),
    appointment: RECORD_CONFIG.appointment.detailUrl(id),
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
  };

  return map[type] || null;
}

async function openRecordDetail(item) {
  const type = normaliseRecordType(item);
  const url = getRecordUrl(item);

  if (!url) {
    showError("This record cannot be opened yet.");
    return;
  }

  state.activeRecordItem = item;
  state.activeRecordType = type;

  openDrawer();
  els.drawerActions.classList.toggle("hidden", !RECORD_CONFIG[type]);
  els.drawerTitle.textContent = item.title || "Record details";
  els.drawerSubtitle.textContent = "Loading...";
  els.drawerBody.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading record details...</p>
      </div>
    </div>
  `;

  if (type === "appointment") {
    els.drawerApproveBtn.textContent = "Complete";
    els.drawerReturnBtn.textContent = "Cancel";
    els.drawerSubmitBtn.classList.add("hidden");
    els.drawerArchiveBtn.classList.add("hidden");
  } else {
    els.drawerApproveBtn.textContent = "Approve";
    els.drawerReturnBtn.textContent = "Return";
    els.drawerSubmitBtn.classList.remove("hidden");
    els.drawerArchiveBtn.classList.remove("hidden");
  }

  try {
    const data = await apiGet(url);
    const detail =
      data.daily_note ||
      data.incident ||
      data.risk ||
      data.support_plan ||
      data.appointment ||
      data.health_record ||
      data.medication_profile ||
      data.medication_record ||
      data.education_record ||
      data.family_contact_record ||
      data.contact ||
      data.keywork ||
      data.report ||
      data;

    const entries = Object.entries(detail || {})
      .filter(([key, value]) => !["id", "young_person_id"].includes(key) && value !== null && value !== "" && value !== undefined)
      .slice(0, 24);

    els.drawerTitle.textContent = item.title || detail.title || "Record details";
    els.drawerSubtitle.textContent = `${String(type).replaceAll("_", " ")} • ${formatDate(item.recorded_at || item.occurred_at || item.created_at || detail.created_at)}`;

    els.drawerBody.innerHTML = `
      <div class="detail-section">
        <h4>Summary</h4>
        <div class="detail-list">
          <div class="detail-row">
            <div class="detail-key">Title</div>
            <div class="detail-value">${escapeHtml(item.title || detail.title || "—")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-key">Status</div>
            <div class="detail-value">${escapeHtml(item.workflow_status || detail.workflow_status || detail.status || detail.approval_status || "—")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-key">Summary</div>
            <div class="detail-value">${escapeHtml(item.summary || detail.summary || detail.description || detail.concern_summary || "—")}</div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Details</h4>
        <div class="detail-list">
          ${
            entries.length
              ? entries.map(([key, value]) => `
                <div class="detail-row">
                  <div class="detail-key">${escapeHtml(key.replaceAll("_", " "))}</div>
                  <div class="detail-value">${escapeHtml(typeof value === "object" ? JSON.stringify(value) : String(value))}</div>
                </div>
              `).join("")
              : `
                <div class="detail-row">
                  <div class="detail-key">Details</div>
                  <div class="detail-value">No additional details.</div>
                </div>
              `
          }
        </div>
      </div>
    `;
  } catch (error) {
    els.drawerSubtitle.textContent = "Could not load";
    els.drawerBody.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load record details.")}</p>
      </div>
    `;
  }
}

function buildFormField(field) {
  const label = `<label class="form-label" for="${field.name}">${escapeHtml(field.label)}</label>`;

  if (field.type === "textarea") {
    return `
      <div class="form-field ${field.full ? "full" : ""}">
        ${label}
        <textarea id="${field.name}" name="${field.name}" class="textarea-input">${escapeHtml(field.value || "")}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="form-field ${field.full ? "full" : ""}">
        ${label}
        <select id="${field.name}" name="${field.name}" class="select-input">
          ${(field.options || []).map((opt) => `
            <option value="${escapeHtml(opt.value)}" ${String(opt.value) === String(field.value || "") ? "selected" : ""}>
              ${escapeHtml(opt.label)}
            </option>
          `).join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="form-field ${field.full ? "full" : ""}">
      ${label}
      <input id="${field.name}" name="${field.name}" type="${field.type || "text"}" class="text-input" value="${escapeHtml(field.value || "")}" />
    </div>
  `;
}

function getModalSchema(recordType, item = null) {
  const today = toDateInputValue(new Date());

  if (recordType === "daily_note") {
    return [
      { name: "note_date", label: "Date", type: "date", value: item?.note_date || today },
      {
        name: "shift_type",
        label: "Shift type",
        type: "select",
        value: item?.shift_type || "day",
        options: [
          { value: "day", label: "Day" },
          { value: "evening", label: "Evening" },
          { value: "night", label: "Night" },
          { value: "waking_night", label: "Waking night" },
        ],
      },
      { name: "presentation", label: "Presentation", type: "textarea", full: true, value: item?.presentation || "" },
      { name: "activities", label: "Activities", type: "textarea", full: true, value: item?.activities || "" },
      { name: "young_person_voice", label: "Young person voice", type: "textarea", full: true, value: item?.young_person_voice || item?.child_voice || "" },
      { name: "positives", label: "Positives", type: "textarea", full: true, value: item?.positives || "" },
      { name: "actions_required", label: "Actions required", type: "textarea", full: true, value: item?.actions_required || "" },
    ];
  }

  if (recordType === "incident") {
    return [
      { name: "incident_datetime", label: "Incident time", type: "datetime-local", value: item?.incident_datetime ? String(item.incident_datetime).slice(0, 16) : "" },
      { name: "incident_type", label: "Incident type", type: "text", value: item?.incident_type || "" },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        value: item?.severity || "medium",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
          { value: "critical", label: "Critical" },
        ],
      },
      { name: "description", label: "Description", type: "textarea", full: true, value: item?.description || "" },
      { name: "staff_response", label: "Staff response", type: "textarea", full: true, value: item?.staff_response || "" },
      { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
      { name: "outcome", label: "Outcome", type: "textarea", full: true, value: item?.outcome || "" },
    ];
  }

  if (recordType === "risk") {
    return [
      { name: "category", label: "Category", type: "text", value: item?.category || "" },
      { name: "title", label: "Title", type: "text", value: item?.title || "" },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        value: item?.severity || "medium",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
      {
        name: "likelihood",
        label: "Likelihood",
        type: "select",
        value: item?.likelihood || "medium",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
      { name: "review_date", label: "Review date", type: "date", value: item?.review_date || today },
      { name: "concern_summary", label: "Concern summary", type: "textarea", full: true, value: item?.concern_summary || "" },
      { name: "current_controls", label: "Current controls", type: "textarea", full: true, value: item?.current_controls || "" },
      { name: "response_actions", label: "Response actions", type: "textarea", full: true, value: item?.response_actions || "" },
    ];
  }

  if (recordType === "appointment") {
    return [
      { name: "title", label: "Appointment title", type: "text", value: item?.title || "" },
      { name: "appointment_type", label: "Appointment type", type: "text", value: item?.appointment_type || "" },
      { name: "appointment_date", label: "Appointment date and time", type: "datetime-local", value: item?.appointment_date ? toDateTimeLocalValue(item.appointment_date) : "" },
      { name: "end_datetime", label: "End time", type: "datetime-local", value: item?.end_datetime ? toDateTimeLocalValue(item.end_datetime) : "" },
      { name: "location", label: "Location", type: "text", value: item?.location || "" },
      { name: "professional_name", label: "Professional name", type: "text", value: item?.professional_name || "" },
      { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
      { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
      { name: "follow_up_actions", label: "Follow-up actions", type: "textarea", full: true, value: item?.follow_up_actions || "" },
    ];
  }

  return [
    { name: "title", label: "Title", type: "text", value: item?.title || "" },
    { name: "review_date", label: "Review date", type: "date", value: item?.review_date || today },
    { name: "presenting_need", label: "Presenting need", type: "textarea", full: true, value: item?.presenting_need || "" },
    { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
    { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
    { name: "proactive_strategies", label: "Proactive strategies", type: "textarea", full: true, value: item?.proactive_strategies || "" },
  ];
}

function openRecordModal(recordType, mode = "create", item = null) {
  state.modalRecordType = recordType;
  state.modalMode = mode;
  state.modalEditItem = item;

  const config = RECORD_CONFIG[recordType] || RECORD_CONFIG.support_plan;
  els.modalTitle.textContent = mode === "edit" ? `Edit ${config.label}` : `Add ${config.label}`;
  els.modalSubtitle.textContent = "Complete the form below";
  els.modalSaveBtn.textContent = mode === "edit" ? "Save changes" : "Save";

  const schema = getModalSchema(recordType, item);
  els.modalFields.innerHTML = schema.map(buildFormField).join("");
  openModal();
}

function serialiseValue(key, value) {
  if (value === "") return null;
  if (["linked_plan_id", "reminder_minutes_before"].includes(key)) return Number(value);
  return value;
}

function serializeModalForm() {
  const formData = new FormData(els.modalForm);
  const obj = {};

  for (const [key, value] of formData.entries()) {
    obj[key] = serialiseValue(key, value);
  }

  obj.young_person_id = state.youngPersonId;
  return obj;
}

async function handleModalSubmit(event) {
  event.preventDefault();

  const recordType = state.modalRecordType;
  const config = RECORD_CONFIG[recordType];
  if (!config) {
    showError("This record type is not configured.");
    return;
  }

  const payload = serializeModalForm();

  try {
    els.modalSaveBtn.disabled = true;

    if (state.modalMode === "edit" && state.modalEditItem?.id) {
      await apiSend(config.updateUrl(state.modalEditItem.id), config.updateMethod || "PATCH", payload);
      showMessage(`${config.label} updated.`);
    } else {
      await apiSend(config.createUrl(state.youngPersonId), "POST", payload);
      showMessage(`${config.label} created.`);
    }

    closeModal();
    await loadCurrentView();
  } catch (error) {
    showError(error.message || "Could not save record.");
  } finally {
    els.modalSaveBtn.disabled = false;
  }
}

async function runDrawerWorkflow(action) {
  const item = state.activeRecordItem;
  const type = state.activeRecordType;
  const config = RECORD_CONFIG[type];

  if (!item || !config) {
    showError("No record selected.");
    return;
  }

  const id = item.record_id || item.source_id || item.id;
  if (!id) {
    showError("This record has no id.");
    return;
  }

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

  if (!url) {
    showError(`No ${action} route is configured for this record.`);
    return;
  }

  try {
    await apiSend(url, "POST", body);
    showMessage(`${config.label} ${action}ed.`);
    closeDrawer();
    await loadCurrentView();
  } catch (error) {
    showError(error.message || `Could not ${action} record.`);
  }
}

function assistantPromptsForView(view) {
  const map = {
    home: [
      "Give me a short handover for this young person.",
      "What matters most right now?",
    ],
    incidents: [
      "Summarise the recent incidents.",
      "What patterns are visible in incidents?",
    ],
    risk: [
      "Summarise current risks and what helps.",
      "What should adults understand better?",
    ],
    handover: [
      "Give me a short handover for this young person.",
      "What does the next shift most need to know?",
    ],
    evidence: [
      "What evidence would support Ofsted right now?",
      "What child voice is visible and what is missing?",
    ],
    manager: [
      "What needs manager review right now?",
      "What is overdue or waiting for approval?",
    ],
  };

  return map[view] || [
    "Give me a short handover for this young person.",
    "Summarise current risks and what helps.",
    "What evidence would support Ofsted right now?",
  ];
}

function updateAssistantContext() {
  if (!state.youngPerson) {
    els.assistantContext.textContent = "No young person selected.";
  } else {
    const fullName =
      [state.youngPerson.first_name, state.youngPerson.last_name].filter(Boolean).join(" ").trim() ||
      state.youngPerson.preferred_name ||
      "Young Person";

    els.assistantContext.textContent = [
      `Young person: ${fullName}`,
      state.youngPerson.placement_status ? `Placement: ${state.youngPerson.placement_status}` : null,
      state.youngPerson.summary_risk_level ? `Risk: ${state.youngPerson.summary_risk_level}` : null,
      `View: ${state.currentView.replaceAll("-", " ")}`,
    ].filter(Boolean).join(" • ");
  }

  const prompts = assistantPromptsForView(state.currentView);
  els.assistantSuggestions.innerHTML = prompts.map((prompt) => `
    <button class="secondary-btn" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>
  `).join("");
}

function renderAssistantMessages() {
  const base = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">Ask a question about this young person.</div>
    </article>
  `;

  const messagesHtml = state.assistantMessages.map((message) => `
    <article class="assistant-message ${message.role === "user" ? "assistant-message-user" : ""}">
      <div class="assistant-message-role">${message.role === "user" ? "You" : "Assistant"}</div>
      <div class="assistant-message-body">${escapeHtml(message.content)}</div>
    </article>
  `).join("");

  els.assistantMessages.innerHTML = base + messagesHtml;
  els.assistantMessages.scrollTop = els.assistantMessages.scrollHeight;
}

function pushAssistantMessage(role, content) {
  state.assistantMessages.push({ role, content });
  renderAssistantMessages();
}

async function askAssistant(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed) return;

  pushAssistantMessage("user", trimmed);

  try {
    els.assistantSendBtn.disabled = true;

    const response = await apiSend("/young-people/assistant", "POST", {
      message: trimmed,
      context: {
        scope: "young_person",
        young_person_id: state.youngPersonId,
        current_view: state.currentView,
        young_person_name: els.personName.textContent || "",
      },
    });

    pushAssistantMessage(
      "assistant",
      response.reply ||
      response.message ||
      response.answer ||
      response.output_text ||
      response.text ||
      "No assistant reply returned."
    );
  } catch (error) {
    pushAssistantMessage("assistant", error.message || "The assistant could not answer right now.");
  } finally {
    els.assistantSendBtn.disabled = false;
  }
}

function updatePageHeader() {
  const config = VIEW_CONFIG[state.currentView];
  if (!config) return;
  els.pageTitle.textContent = config.title;
  els.pageSubtitle.textContent = config.subtitle;
}

function updateActiveNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
  });
}

function showSelectorMode() {
  els.selectorPanel.classList.remove("hidden");
  els.workspacePanel.classList.add("hidden");
  els.refreshBtn.classList.add("hidden");
  els.personName.textContent = "No young person selected";
  els.personMeta.textContent = "Choose a young person to begin";
  els.personAvatar.textContent = "YP";
  toggleAssistantLauncher();
}

function showWorkspaceMode() {
  els.selectorPanel.classList.add("hidden");
  els.workspacePanel.classList.remove("hidden");
  els.refreshBtn.classList.remove("hidden");
  toggleAssistantLauncher();
}

function renderSelectorList(items) {
  if (!items.length) {
    els.selectorList.innerHTML = `
      <div class="empty-state">
        <p>No young people found.</p>
      </div>
    `;
    return;
  }

  els.selectorList.innerHTML = items.map((item) => {
    const fullName =
      [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
      item.preferred_name ||
      "Young Person";

    const meta = [
      item.preferred_name ? `Preferred: ${item.preferred_name}` : null,
      item.placement_status || null,
      item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : null,
    ].filter(Boolean).join(" • ");

    return `
      <article class="selector-card">
        <div class="selector-card-left">
          <div class="selector-card-avatar">${escapeHtml(initialsFromName(fullName))}</div>
          <div>
            <h4>${escapeHtml(fullName)}</h4>
            <p>${escapeHtml(meta || "Young person record")}</p>
          </div>
        </div>
        <button class="primary-btn" data-open-young-person="${item.id}">Open</button>
      </article>
    `;
  }).join("");
}

function filterSelectorList() {
  const term = (els.selectorSearch.value || "").trim().toLowerCase();

  if (!term) {
    renderSelectorList(state.selectorItems);
    return;
  }

  const filtered = state.selectorItems.filter((item) => {
    const haystack = [
      item.first_name,
      item.last_name,
      item.preferred_name,
      item.placement_status,
      item.summary_risk_level,
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(term);
  });

  renderSelectorList(filtered);
}

async function loadYoungPersonSelector() {
  clearStatus();
  showSelectorMode();

  els.selectorList.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading young people...</p>
      </div>
    </div>
  `;

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    showError(error.message || "Failed to load young people.");
    els.selectorList.innerHTML = `
      <div class="empty-state">
        <p>Unable to load young people.</p>
      </div>
    `;
  }
}

async function loadYoungPerson() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const youngPerson = data.young_person || data.bundle?.young_person || data;
  state.youngPerson = youngPerson;

  const fullName =
    [youngPerson.first_name, youngPerson.last_name].filter(Boolean).join(" ").trim() ||
    youngPerson.preferred_name ||
    "Young Person";

  const meta = [
    youngPerson.preferred_name ? `Preferred: ${youngPerson.preferred_name}` : null,
    youngPerson.placement_status || null,
    youngPerson.summary_risk_level ? `Risk: ${youngPerson.summary_risk_level}` : null,
  ].filter(Boolean).join(" • ");

  els.personName.textContent = fullName;
  els.personMeta.textContent = meta || "Young person record";
  els.personAvatar.textContent = initialsFromName(fullName);
  updateAssistantContext();
  toggleAssistantLauncher();
}

async function loadHome() {
  setLoading("Loading home...");

  const [overviewData, timelineData, complianceData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`).catch(() => ({})),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=10`).catch(() => ({ timeline: [] })),
    apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
  ]);

  const yp = overviewData.young_person || state.youngPerson || {};
  const alerts = overviewData.alerts || [];
  const recent = timelineData.timeline || [];
  const compliance = complianceData.compliance_items || complianceData.items || [];

  const urgentItems = [
    ...alerts.map((x) => ({ ...x, _kind: "alert" })),
    ...compliance.filter((x) =>
      ["overdue", "pending", "submitted", "due_soon"].includes(
        String(x.status || x.compliance_status || "").toLowerCase()
      )
    ),
  ].slice(0, 6);

  const todayItems = recent.slice(0, 6);

  const managerItems = recent.filter((x) =>
    ["submitted", "pending", "returned"].includes(
      String(x.workflow_status || x.status || x.approval_status || "").toLowerCase()
    )
  ).slice(0, 6);

  const quickSummary = [
    yp.placement_status ? `Placement: ${yp.placement_status}` : null,
    yp.summary_risk_level ? `Risk: ${yp.summary_risk_level}` : null,
    alerts.length ? `${alerts.length} active alert${alerts.length === 1 ? "" : "s"}` : "No active alerts",
    compliance.length ? `${compliance.length} compliance item${compliance.length === 1 ? "" : "s"}` : "No compliance items",
  ].filter(Boolean).join(" • ");

  els.content.innerHTML = `
    <div class="grid grid-4">
      ${renderStat("Placement status", yp.placement_status || "—")}
      ${renderStat("Risk level", yp.summary_risk_level || "—")}
      ${renderStat("Active alerts", String(alerts.length))}
      ${renderStat("Needs attention", String(urgentItems.length))}
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Today at a glance</h3>
          <p class="panel-subtitle">A simple overview of what matters most right now.</p>
        </div>
      </div>
      <div class="record-body">${escapeHtml(quickSummary || "No summary available.")}</div>
    </section>

    <div class="callout-grid">
      ${renderSimpleSection(
        "What happened today",
        "Recent events, updates and child voice.",
        todayItems.length
          ? `<div class="record-list">${todayItems.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>No recent activity recorded.</p></div>`
      )}

      ${renderSimpleSection(
        "What needs doing next",
        "Alerts, due items and follow-up that adults should act on.",
        urgentItems.length
          ? `<div class="record-list">${urgentItems.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>Nothing urgent is showing right now.</p></div>`
      )}
    </div>

    <div class="callout-grid">
      ${renderSimpleSection(
        "What needs manager attention",
        "Records waiting for review, approval or return comments.",
        managerItems.length
          ? `<div class="record-list">${managerItems.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>No manager review items are currently visible.</p></div>`
      )}

      ${renderSimpleSection(
        "Helpful next actions",
        "Simple actions to keep the record current and inspection-ready.",
        `
          <div class="record-list">
            <article class="record-card">
              <div class="record-card-header">
                <div>
                  <h4>Add a daily note</h4>
                  <div class="record-meta">Capture the shift clearly and therapeutically.</div>
                </div>
              </div>
              <div class="record-body">Record what happened, how the young person presented, what helped, their voice, and what adults need to do next.</div>
            </article>

            <article class="record-card">
              <div class="record-card-header">
                <div>
                  <h4>Check current risks</h4>
                  <div class="record-meta">Make sure adult guidance matches current needs.</div>
                </div>
              </div>
              <div class="record-body">Review triggers, protective factors, calm responses, and practical guidance that supports consistent care.</div>
            </article>

            <article class="record-card">
              <div class="record-card-header">
                <div>
                  <h4>Prepare for review</h4>
                  <div class="record-meta">Keep records ready for leadership and oversight.</div>
                </div>
              </div>
              <div class="record-body">Submit finished records, respond to manager comments, and keep evidence linked through the chronology.</div>
            </article>
          </div>
        `
      )}
    </div>
  `;

  bindDynamicOpenRecordButtons();
}

async function loadTimeline() {
  setLoading("Loading timeline...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/timeline?limit=100`);
  const items = data.timeline || [];

  els.content.innerHTML = items.length
    ? `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`
    : `<div class="empty-state"><p>No timeline items found.</p></div>`;

  bindDynamicOpenRecordButtons();
}

async function loadHandover() {
  setLoading("Loading handover...");

  const [timelineData, riskData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=6`).catch(() => ({ timeline: [] })),
    apiGet(`/young-people/${state.youngPersonId}/risk`).catch(() => ({ items: [] })),
  ]);

  const recent = timelineData.timeline || [];
  const risks = riskData.items || [];

  els.content.innerHTML = `
    <div class="callout-grid">
      ${renderSimpleSection(
        "Recent activity",
        "Latest record activity",
        recent.length
          ? `<div class="record-list">${recent.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>No recent activity.</p></div>`
      )}

      ${renderSimpleSection(
        "Current risks",
        "What adults need to understand",
        risks.length
          ? `<div class="record-list">${risks.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>No current risks.</p></div>`
      )}
    </div>
  `;

  bindDynamicOpenRecordButtons();
}

async function loadRecordList(url, label) {
  setLoading(`Loading ${label.toLowerCase()}...`);

  const data = await apiGet(url);
  const items = data.items || data.records || data.timeline || [];

  els.content.innerHTML = items.length
    ? `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`
    : `<div class="empty-state"><p>No ${escapeHtml(label.toLowerCase())} found.</p></div>`;

  bindDynamicOpenRecordButtons();
}

async function loadReports() {
  setLoading("Loading reports...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] }));
  const reports = data.items || [];

  els.content.innerHTML = reports.length
    ? `<div class="record-list">${
        reports.map((report) =>
          renderRecordCard({
            ...report,
            record_type: "report",
            summary: report.report_text || "Report ready.",
          })
        ).join("")
      }</div>`
    : `<div class="empty-state"><p>No reports found.</p></div>`;

  bindDynamicOpenRecordButtons();
}

async function loadProfile() {
  setLoading("Loading profile...");
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const bundle = data.bundle || {};
  const yp = bundle.young_person || data.young_person || state.youngPerson || {};
  const communication = bundle.communication_profile || {};
  const identity = bundle.identity_profile || {};
  const education = bundle.education_profile || {};
  const health = bundle.health_profile || {};
  const legal = bundle.legal_status || {};

  els.content.innerHTML = `
    <div class="callout-grid">
      ${renderSimpleSection(
        "Core profile",
        "",
        `
          <div class="detail-list">
            <div class="detail-row"><div class="detail-key">Preferred name</div><div class="detail-value">${escapeHtml(yp.preferred_name || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Date of birth</div><div class="detail-value">${escapeHtml(formatDate(yp.date_of_birth))}</div></div>
            <div class="detail-row"><div class="detail-key">Placement status</div><div class="detail-value">${escapeHtml(yp.placement_status || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Risk level</div><div class="detail-value">${escapeHtml(yp.summary_risk_level || "—")}</div></div>
          </div>
        `
      )}

      ${renderSimpleSection(
        "Communication and identity",
        "",
        `
          <div class="detail-list">
            <div class="detail-row"><div class="detail-key">Communication style</div><div class="detail-value">${escapeHtml(communication.communication_style || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">What helps</div><div class="detail-value">${escapeHtml(communication.what_helps || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Interests</div><div class="detail-value">${escapeHtml(identity.interests || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Strengths</div><div class="detail-value">${escapeHtml(identity.strengths_summary || "—")}</div></div>
          </div>
        `
      )}

      ${renderSimpleSection(
        "Education, health and legal",
        "",
        `
          <div class="detail-list">
            <div class="detail-row"><div class="detail-key">School</div><div class="detail-value">${escapeHtml(education.school_name || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Education status</div><div class="detail-value">${escapeHtml(education.education_status || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">GP</div><div class="detail-value">${escapeHtml(health.gp_name || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Allergies</div><div class="detail-value">${escapeHtml(health.allergies || "—")}</div></div>
            <div class="detail-row"><div class="detail-key">Legal status</div><div class="detail-value">${escapeHtml(legal.legal_status || "—")}</div></div>
          </div>
        `
      )}
    </div>
  `;
}

async function loadHealth() {
  setLoading("Loading health...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/health`);
  const profile = data.health_profile || {};
  const records = data.health_records || [];

  els.content.innerHTML = `
    ${renderSimpleSection(
      "Health profile",
      "",
      `
        <div class="detail-list">
          <div class="detail-row"><div class="detail-key">GP</div><div class="detail-value">${escapeHtml(profile.gp_name || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Allergies</div><div class="detail-value">${escapeHtml(profile.allergies || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Diagnoses</div><div class="detail-value">${escapeHtml(profile.diagnoses || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Mental health</div><div class="detail-value">${escapeHtml(profile.mental_health_summary || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Medication summary</div><div class="detail-value">${escapeHtml(profile.medication_summary || "—")}</div></div>
        </div>
      `
    )}

    ${renderSimpleSection(
      "Health records",
      "",
      records.length
        ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>`
        : `<div class="empty-state"><p>No health records.</p></div>`
    )}
  `;

  bindDynamicOpenRecordButtons();
}

async function loadEducation() {
  setLoading("Loading education...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);
  const profile = data.education_profile || {};
  const records = data.education_records || data.items || [];

  els.content.innerHTML = `
    ${renderSimpleSection(
      "Education profile",
      "",
      `
        <div class="detail-list">
          <div class="detail-row"><div class="detail-key">School</div><div class="detail-value">${escapeHtml(profile.school_name || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Year group</div><div class="detail-value">${escapeHtml(profile.year_group || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Education status</div><div class="detail-value">${escapeHtml(profile.education_status || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Support summary</div><div class="detail-value">${escapeHtml(profile.support_summary || "—")}</div></div>
        </div>
      `
    )}

    ${renderSimpleSection(
      "Education records",
      "",
      records.length
        ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>`
        : `<div class="empty-state"><p>No education records.</p></div>`
    )}
  `;

  bindDynamicOpenRecordButtons();
}

async function loadFamily() {
  setLoading("Loading family...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/family`);
  const records = data.family_contact_records || data.items || [];

  els.content.innerHTML = renderSimpleSection(
    "Family contact records",
    "",
    records.length
      ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>`
      : `<div class="empty-state"><p>No family records.</p></div>`
  );

  bindDynamicOpenRecordButtons();
}

async function loadEvidence() {
  setLoading("Loading evidence...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/timeline?limit=40`).catch(() => ({ timeline: [] }));
  const items = data.timeline || [];

  els.content.innerHTML = renderSimpleSection(
    "Inspection evidence",
    "Recent linked records",
    items.length
      ? `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`
      : `<div class="empty-state"><p>No evidence found.</p></div>`
  );

  bindDynamicOpenRecordButtons();
}

async function loadCompliance() {
  setLoading("Loading compliance...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] }));
  const items = data.compliance_items || data.items || [];

  els.content.innerHTML = items.length
    ? `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`
    : `<div class="empty-state"><p>No compliance items found.</p></div>`;

  bindDynamicOpenRecordButtons();
}

async function loadManager() {
  setLoading("Loading manager overview...");

  const [complianceData, timelineData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=12`).catch(() => ({ timeline: [] })),
  ]);

  const compliance = complianceData.compliance_items || complianceData.items || [];
  const recent = timelineData.timeline || [];

  els.content.innerHTML = `
    <div class="callout-grid">
      ${renderSimpleSection(
        "Needs manager attention",
        "",
        compliance.length
          ? `<div class="record-list">${compliance.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>No urgent items.</p></div>`
      )}

      ${renderSimpleSection(
        "Recent record activity",
        "",
        recent.length
          ? `<div class="record-list">${recent.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state"><p>No recent activity.</p></div>`
      )}
    </div>
  `;

  bindDynamicOpenRecordButtons();
}

async function loadCurrentView() {
  clearStatus();
  updatePageHeader();
  updateActiveNav();
  updateAssistantContext();

  const config = VIEW_CONFIG[state.currentView];
  if (!config) {
    setEmpty("Unknown view.");
    return;
  }

  try {
    await config.loader();
  } catch (error) {
    showError(error.message || "Something went wrong.");
    setEmpty("Unable to load this view.");
  }
}

function bindDynamicOpenRecordButtons() {
  els.content.querySelectorAll("[data-open-record]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        openRecordDetail(JSON.parse(btn.dataset.openRecord));
      } catch (_) {
        showError("Could not open record.");
      }
    });
  });
}

function openYoungPerson(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", String(id));
  window.history.replaceState({}, "", url.toString());

  state.youngPersonId = Number(id);
  state.currentView = "home";

  showWorkspaceMode();

  loadYoungPerson()
    .then(loadCurrentView)
    .catch((error) => showError(error.message || "Failed to load young person."));
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const navBtn = event.target.closest(".nav-btn");
    if (navBtn) {
      if (!state.youngPersonId) {
        showError("Select a young person first.");
        return;
      }
      state.currentView = navBtn.dataset.view;
      loadCurrentView();
      return;
    }

    const openBtn = event.target.closest("[data-open-young-person]");
    if (openBtn) {
      openYoungPerson(Number(openBtn.dataset.openYoungPerson));
      return;
    }
  });

  els.selectorSearch?.addEventListener("input", filterSelectorList);
  els.selectorRefreshBtn?.addEventListener("click", loadYoungPersonSelector);

  els.refreshBtn?.addEventListener("click", async () => {
    if (!state.youngPersonId) {
      await loadYoungPersonSelector();
      return;
    }

    try {
      await loadYoungPerson();
      await loadCurrentView();
      showMessage("Workspace refreshed.");
    } catch (error) {
      showError(error.message || "Failed to refresh.");
    }
  });

  els.changePersonBtn?.addEventListener("click", async () => {
    state.youngPersonId = null;
    state.youngPerson = null;
    state.assistantMessages = [];
    closeDrawer();
    closeModal();
    closeAssistant();

    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
    window.history.replaceState({}, "", url.toString());

    await loadYoungPersonSelector();
  });

  els.quickActions?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    if (btn.dataset.action === "daily-note") openRecordModal("daily_note", "create");
    if (btn.dataset.action === "incident") openRecordModal("incident", "create");
    if (btn.dataset.action === "risk") openRecordModal("risk", "create");
    if (btn.dataset.action === "plan") openRecordModal("support_plan", "create");
  });

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);

  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType || !RECORD_CONFIG[state.activeRecordType]) return;
    openRecordModal(state.activeRecordType, "edit", state.activeRecordItem);
  });

  els.drawerSubmitBtn?.addEventListener("click", () => runDrawerWorkflow("submit"));
  els.drawerApproveBtn?.addEventListener("click", () => runDrawerWorkflow("approve"));
  els.drawerReturnBtn?.addEventListener("click", () => runDrawerWorkflow("return"));
  els.drawerArchiveBtn?.addEventListener("click", () => runDrawerWorkflow("archive"));

  els.closeModalBtn?.addEventListener("click", closeModal);
  els.modalCancelBtn?.addEventListener("click", closeModal);
  els.modalBackdrop?.addEventListener("click", closeModal);
  els.modalForm?.addEventListener("submit", handleModalSubmit);

  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    state.assistantMessages = [];
    renderAssistantMessages();
  });

  els.assistantSuggestions?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-prompt]");
    if (!btn) return;
    await askAssistant(btn.dataset.prompt || "");
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput.value;
    els.assistantInput.value = "";
    await askAssistant(question);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeModal();
      closeAssistant();
    }
  });
}

async function init() {
  state.youngPersonId = getYoungPersonId();

  bindEvents();
  renderAssistantMessages();
  updateAssistantContext();
  toggleAssistantLauncher();

  if (!state.youngPersonId) {
    await loadYoungPersonSelector();
    return;
  }

  try {
    showWorkspaceMode();
    await loadYoungPerson();
    await loadCurrentView();
  } catch (error) {
    showError(error.message || "Failed to load young person.");
    await loadYoungPersonSelector();
  }
}

init();

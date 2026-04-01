const state = {
  youngPersonId: null,
  youngPerson: null,
  currentView: "home",
  selectorItems: [],
  timelineCache: [],
  calendarDate: new Date(),
  selectedDate: toDateInputValue(new Date()),
  calendarMonthSummary: [],
  selectedDayRecords: [],
  activeRecordItem: null,
  activeRecordType: null,
  modalMode: "create",
  modalRecordType: null,
  modalEditItem: null,
  documentMode: "create",
  documentRecordType: null,
  documentEditItem: null,
  documentViewItem: null,
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

  documentModalBackdrop: document.getElementById("documentModalBackdrop"),
  documentModal: document.getElementById("documentModal"),
  documentModalEyebrow: document.getElementById("documentModalEyebrow"),
  documentModalTitle: document.getElementById("documentModalTitle"),
  documentModalSubtitle: document.getElementById("documentModalSubtitle"),
  documentModalBody: document.getElementById("documentModalBody"),
  documentModalCloseBtn: document.getElementById("documentModalCloseBtn"),
  documentModalCancelBtn: document.getElementById("documentModalCancelBtn"),
  documentModalSaveBtn: document.getElementById("documentModalSaveBtn"),
  documentModalSecondaryBtn: document.getElementById("documentModalSecondaryBtn"),
  documentFooterLeft: document.getElementById("documentFooterLeft"),
};

const VIEW_CONFIG = {
  home: {
    title: "Home",
    subtitle: "What staff need first",
    loader: loadHome,
  },
  profile: {
    title: "Profile",
    subtitle: "Identity, communication, legal and contact information",
    loader: loadProfile,
  },
  calendar: {
    title: "Calendar",
    subtitle: "All records by day",
    loader: loadCalendarView,
  },
  timeline: {
    title: "What happened",
    subtitle: "Chronology across all records",
    loader: loadTimeline,
  },
  handover: {
    title: "Handover",
    subtitle: "What the next staff need to know",
    loader: loadHandover,
  },
  "daily-notes": {
    title: "Daily notes",
    subtitle: "Shift recording",
    loader: () => loadRecordList(RECORD_CONFIG.daily_note.listUrl(state.youngPersonId), "Daily notes"),
  },
  incidents: {
    title: "Incidents",
    subtitle: "Incidents and safeguarding concerns",
    loader: () => loadRecordList(RECORD_CONFIG.incident.listUrl(state.youngPersonId), "Incidents"),
  },
  risk: {
    title: "Risks",
    subtitle: "Current risks and concerns",
    loader: () => loadRecordList(RECORD_CONFIG.risk.listUrl(state.youngPersonId), "Risk assessments"),
  },
  plans: {
    title: "Plans",
    subtitle: "Plans and staff guidance",
    loader: () => loadRecordList(RECORD_CONFIG.support_plan.listUrl(state.youngPersonId), "Plans"),
  },
  health: {
    title: "Health",
    subtitle: "Health profile, records and medication",
    loader: loadHealth,
  },
  education: {
    title: "Education",
    subtitle: "Education profile and records",
    loader: loadEducation,
  },
  family: {
    title: "Family",
    subtitle: "Family and contact records",
    loader: loadFamily,
  },
  keywork: {
    title: "Keywork",
    subtitle: "Keywork sessions",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/keywork`, "Keywork"),
  },
  compliance: {
    title: "Compliance",
    subtitle: "Checks, gaps and evidence readiness",
    loader: loadCompliancePlaceholder,
  },
  reports: {
    title: "Reports",
    subtitle: "Outputs, summaries and management reporting",
    loader: loadReportsPlaceholder,
  },
};

const RECORD_CONFIG = {
  daily_note: {
    label: "Daily note",
    listUrl: (youngPersonId) => `/young-people/${youngPersonId}/daily-notes`,
    createUrl: (youngPersonId) => `/young-people/${youngPersonId}/daily-notes`,
    detailUrl: (id) => `/young-people/daily-notes/${id}`,
    updateUrl: (id) => `/young-people/daily-notes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
    approveUrl: (id) => `/young-people/daily-notes/${id}/approve`,
    returnUrl: (id) => `/young-people/daily-notes/${id}/return`,
    archiveUrl: (id) => `/young-people/daily-notes/${id}/archive`,
  },
  incident: {
    label: "Incident",
    listUrl: (youngPersonId) => `/young-people/${youngPersonId}/incidents`,
    createUrl: (youngPersonId) => `/young-people/${youngPersonId}/incidents`,
    detailUrl: (id) => `/young-people/incidents/${id}`,
    updateUrl: (id) => `/young-people/incidents/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/incidents/${id}/submit`,
    approveUrl: (id) => `/young-people/incidents/${id}/approve`,
    returnUrl: (id) => `/young-people/incidents/${id}/return`,
    archiveUrl: (id) => `/young-people/incidents/${id}/archive`,
  },
  risk: {
    label: "Risk assessment",
    listUrl: (youngPersonId) => `/young-people/${youngPersonId}/risk`,
    createUrl: (youngPersonId) => `/young-people/${youngPersonId}/risk`,
    detailUrl: (id) => `/young-people/risk/${id}`,
    updateUrl: (id) => `/young-people/risk/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/risk/${id}/submit`,
    approveUrl: (id) => `/young-people/risk/${id}/approve`,
    returnUrl: (id) => `/young-people/risk/${id}/return`,
    archiveUrl: (id) => `/young-people/risk/${id}/archive`,
  },
  support_plan: {
    label: "Plan",
    listUrl: (youngPersonId) => `/young-people/${youngPersonId}/plans`,
    createUrl: (youngPersonId) => `/young-people/${youngPersonId}/plans`,
    detailUrl: (id) => `/young-people/plans/${id}`,
    updateUrl: (id) => `/young-people/plans/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
    approveUrl: (id) => `/young-people/plans/${id}/approve`,
    returnUrl: (id) => `/young-people/plans/${id}/return`,
    archiveUrl: (id) => `/young-people/plans/${id}/archive`,
  },
  plan: {
    label: "Plan",
    listUrl: (youngPersonId) => `/young-people/${youngPersonId}/plans`,
    createUrl: (youngPersonId) => `/young-people/${youngPersonId}/plans`,
    detailUrl: (id) => `/young-people/plans/${id}`,
    updateUrl: (id) => `/young-people/plans/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
    approveUrl: (id) => `/young-people/plans/${id}/approve`,
    returnUrl: (id) => `/young-people/plans/${id}/return`,
    archiveUrl: (id) => `/young-people/plans/${id}/archive`,
  },
};

function getYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("young_person_id");
  return id ? Number(id) : null;
}

function toDateInputValue(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthName(date) {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
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
      const data = await response.json();
      message = data.detail || data.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch (_) {
    return {};
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function clearError() {
  els.statusBar.classList.add("hidden");
  els.statusBar.textContent = "";
}

function showMessage(message) {
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function setLoading(message = "Loading workspace...") {
  els.content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${escapeHtml(message)}</p>
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

function initialsFromName(name) {
  if (!name) return "YP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "YP";
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

function formatShortTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(value) {
  const v = String(value || "").toLowerCase();
  if (["approved", "active", "recorded", "low", "completed", "ok"].includes(v)) return "success";
  if (["submitted", "pending", "medium", "due_soon"].includes(v)) return "warning";
  if (["returned", "high", "critical", "archived", "overdue"].includes(v)) return "danger";
  return "";
}

function renderBadges(values = []) {
  const filtered = values.filter(Boolean);
  if (!filtered.length) return "";
  return `
    <div class="badge-row">
      ${filtered.map((value) => `<span class="badge ${statusBadgeClass(value)}">${escapeHtml(value)}</span>`).join("")}
    </div>
  `;
}

function getRecordUrl(item) {
  const type = String(item.record_type || item.event_type || item.category || "").toLowerCase();
  const id = item.record_id || item.source_id || item.id;
  if (!id) return null;

  const map = {
    daily_note: RECORD_CONFIG.daily_note.detailUrl(id),
    daily_notes: RECORD_CONFIG.daily_note.detailUrl(id),
    incident: RECORD_CONFIG.incident.detailUrl(id),
    incidents: RECORD_CONFIG.incident.detailUrl(id),
    risk: RECORD_CONFIG.risk.detailUrl(id),
    risk_assessment: RECORD_CONFIG.risk.detailUrl(id),
    support_plan: RECORD_CONFIG.support_plan.detailUrl(id),
    plan: RECORD_CONFIG.support_plan.detailUrl(id),
    health: `/young-people/health-records/${id}`,
    health_record: `/young-people/health-records/${id}`,
    medication_profile: `/young-people/medication-profiles/${id}`,
    medication_record: `/young-people/medication-records/${id}`,
    education: `/young-people/education-records/${id}`,
    education_record: `/young-people/education-records/${id}`,
    family: `/young-people/family/records/${id}`,
    family_contact: `/young-people/family/records/${id}`,
    keywork: `/young-people/keywork/${id}`,
    keywork_session: `/young-people/keywork/${id}`,
  };

  return map[type] || null;
}

function normaliseRecordType(item) {
  const raw = String(item.record_type || item.event_type || item.category || "").toLowerCase();
  if (raw === "plan") return "support_plan";
  if (raw === "risk_assessment") return "risk";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
  if (raw === "keywork_session") return "keywork";
  return raw;
}

function normaliseDetailEntries(data) {
  const skipKeys = new Set([
    "id",
    "record_id",
    "young_person_id",
    "created_at",
    "updated_at",
    "title",
    "summary",
    "narrative",
  ]);

  return Object.entries(data || {})
    .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== "" && value !== undefined)
    .map(([key, value]) => ({
      key: key.replaceAll("_", " "),
      value: typeof value === "object" ? JSON.stringify(value, null, 2) : String(value),
    }));
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

function openDocumentModal() {
  els.documentModal.classList.remove("hidden");
  els.documentModalBackdrop.classList.remove("hidden");
  els.documentModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDocumentModal() {
  els.documentModal.classList.add("hidden");
  els.documentModalBackdrop.classList.add("hidden");
  els.documentModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  state.documentMode = "create";
  state.documentRecordType = null;
  state.documentEditItem = null;
  state.documentViewItem = null;
  els.documentModalBody.innerHTML = "";
  els.documentFooterLeft.innerHTML = "";
  els.documentModalSecondaryBtn.classList.add("hidden");
  els.documentModalSecondaryBtn.textContent = "Secondary";
  els.documentModalSaveBtn.disabled = false;
  els.documentModalSaveBtn.textContent = "Save";
}

function renderDocumentChips(item = {}, type = "") {
  const chips = [
    item.workflow_status,
    item.status,
    item.approval_status,
    item.severity,
    type ? type.replaceAll("_", " ") : "",
    "PACE informed",
    "Ofsted linked",
    "Quality standards linked",
  ].filter(Boolean);

  return chips.map((chip) => `<span class="document-chip ${statusBadgeClass(chip)}">${escapeHtml(chip)}</span>`).join("");
}

function documentField(name, label, value = "", options = {}) {
  const {
    type = "text",
    placeholder = "",
    full = false,
    readonly = false,
    selectOptions = [],
  } = options;

  if (type === "textarea") {
    return `
      <div class="document-field ${full ? "full" : ""}">
        <label class="document-label" for="doc_${name}">${escapeHtml(label)}</label>
        <textarea
          id="doc_${name}"
          name="${escapeHtml(name)}"
          class="document-input document-textarea"
          placeholder="${escapeHtml(placeholder)}"
          ${readonly ? "readonly" : ""}
        >${escapeHtml(value || "")}</textarea>
      </div>
    `;
  }

  if (type === "select") {
    return `
      <div class="document-field ${full ? "full" : ""}">
        <label class="document-label" for="doc_${name}">${escapeHtml(label)}</label>
        <select
          id="doc_${name}"
          name="${escapeHtml(name)}"
          class="document-input"
          ${readonly ? "disabled" : ""}
        >
          ${selectOptions.map((opt) => `
            <option value="${escapeHtml(opt.value)}" ${String(opt.value) === String(value || "") ? "selected" : ""}>
              ${escapeHtml(opt.label)}
            </option>
          `).join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="document-field ${full ? "full" : ""}">
      <label class="document-label" for="doc_${name}">${escapeHtml(label)}</label>
      <input
        id="doc_${name}"
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        class="document-input"
        value="${escapeHtml(value || "")}"
        placeholder="${escapeHtml(placeholder)}"
        ${readonly ? "readonly" : ""}
      />
    </div>
  `;
}

function buildDocumentForm(type, item = {}, mode = "create") {
  const readonly = mode === "view";
  const today = toDateInputValue(new Date());

  if (type === "daily_note") {
    return `
      <form id="documentRecordForm" class="document-sheet document-sheet-narrow">
        <div class="document-sheet-header">
          <div>
            <div class="document-sheet-kicker">Daily note</div>
            <h3 class="document-sheet-title">Shift recording</h3>
            <p class="document-sheet-text">Record the shift in a calm, reflective, PACE-informed format.</p>
          </div>
        </div>

        <div class="document-meta-grid">
          ${documentField("note_date", "Date", item.note_date || today, { type: "date", readonly })}
          ${documentField("shift_type", "Shift type", item.shift_type || "day", {
            type: "select",
            readonly,
            selectOptions: [
              { value: "day", label: "Day" },
              { value: "evening", label: "Evening" },
              { value: "night", label: "Night" },
              { value: "waking_night", label: "Waking night" },
            ],
          })}
          ${documentField("mood", "Mood", item.mood || "", { readonly })}
          ${documentField("significance", "Significance", item.significance || "standard", { readonly })}
        </div>

        <div class="document-section">
          <h4>Presentation and engagement</h4>
          <div class="document-grid">
            ${documentField("presentation", "Presentation", item.presentation || "", { type: "textarea", full: true, readonly })}
            ${documentField("activities", "Activities", item.activities || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>

        <div class="document-section">
          <h4>Updates across the day</h4>
          <div class="document-grid">
            ${documentField("education_update", "Education update", item.education_update || "", { type: "textarea", full: true, readonly })}
            ${documentField("health_update", "Health update", item.health_update || "", { type: "textarea", full: true, readonly })}
            ${documentField("family_update", "Family update", item.family_update || "", { type: "textarea", full: true, readonly })}
            ${documentField("behaviour_update", "Behaviour and regulation", item.behaviour_update || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>

        <div class="document-section">
          <h4>Voice and reflection</h4>
          <div class="document-grid">
            ${documentField("young_person_voice", "Young person’s voice", item.young_person_voice || item.child_voice || "", { type: "textarea", full: true, readonly })}
            ${documentField("positives", "Positives", item.positives || "", { type: "textarea", full: true, readonly })}
            ${documentField("actions_required", "Actions required", item.actions_required || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>
      </form>
    `;
  }

  if (type === "incident") {
    return `
      <form id="documentRecordForm" class="document-sheet document-sheet-wide">
        <div class="document-sheet-header">
          <div>
            <div class="document-sheet-kicker">Incident record</div>
            <h3 class="document-sheet-title">Incident and response</h3>
            <p class="document-sheet-text">Record the incident with clear chronology, relational understanding and PACE-informed reflection.</p>
          </div>
        </div>

        <div class="document-meta-grid document-meta-grid-4">
          ${documentField("incident_datetime", "Date and time", item.incident_datetime ? String(item.incident_datetime).slice(0, 16) : "", { type: "datetime-local", readonly })}
          ${documentField("incident_type", "Incident type", item.incident_type || "", { readonly })}
          ${documentField("severity", "Severity", item.severity || "medium", {
            type: "select",
            readonly,
            selectOptions: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ],
          })}
          ${documentField("location", "Location", item.location || "", { readonly })}
        </div>

        <div class="document-section">
          <h4>Incident narrative</h4>
          <div class="document-grid">
            ${documentField("description", "Description", item.description || item.narrative || "", { type: "textarea", full: true, readonly })}
            ${documentField("antecedent", "Antecedent", item.antecedent || "", { type: "textarea", full: true, readonly })}
            ${documentField("presentation", "Presentation before / during", item.presentation || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>

        <div class="document-section">
          <h4>Staff response and PACE reflection</h4>
          <div class="document-grid document-grid-2">
            ${documentField("staff_response", "Staff response", item.staff_response || "", { type: "textarea", full: true, readonly })}
            ${documentField("trauma_informed_formulation", "Trauma informed formulation", item.trauma_informed_formulation || "", { type: "textarea", full: true, readonly })}
            ${documentField("child_voice", "Child voice", item.child_voice || "", { type: "textarea", full: true, readonly })}
            ${documentField("restorative_follow_up", "Restorative follow up", item.restorative_follow_up || "", { type: "textarea", full: true, readonly })}
            ${documentField("outcome", "Outcome", item.outcome || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>
      </form>
    `;
  }

  if (type === "risk") {
    return `
      <form id="documentRecordForm" class="document-sheet document-sheet-landscape">
        <div class="document-sheet-header">
          <div>
            <div class="document-sheet-kicker">Risk assessment</div>
            <h3 class="document-sheet-title">Landscape risk assessment</h3>
            <p class="document-sheet-text">A working document linking concern, context, triggers, protective factors and staff response.</p>
          </div>
        </div>

        <div class="document-meta-grid document-meta-grid-4">
          ${documentField("category", "Category", item.category || "", { readonly })}
          ${documentField("title", "Title", item.title || "", { readonly })}
          ${documentField("severity", "Severity", item.severity || "medium", {
            type: "select",
            readonly,
            selectOptions: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ],
          })}
          ${documentField("likelihood", "Likelihood", item.likelihood || "medium", {
            type: "select",
            readonly,
            selectOptions: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ],
          })}
        </div>

        <div class="document-meta-grid">
          ${documentField("review_date", "Review date", item.review_date || today, { type: "date", readonly })}
          ${documentField("status", "Status", item.status || item.approval_status || "active", { readonly })}
        </div>

        <div class="document-section">
          <h4>Understanding the concern</h4>
          <div class="document-grid document-grid-2">
            ${documentField("concern_summary", "Concern summary", item.concern_summary || item.formulation || "", { type: "textarea", full: true, readonly })}
            ${documentField("contextual_factors", "Contextual factors", item.contextual_factors || "", { type: "textarea", full: true, readonly })}
            ${documentField("known_triggers", "Known triggers", item.known_triggers || "", { type: "textarea", full: true, readonly })}
            ${documentField("early_warning_signs", "Early warning signs", item.early_warning_signs || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>

        <div class="document-section">
          <h4>Protection and response</h4>
          <div class="document-grid document-grid-2">
            ${documentField("current_controls", "Current controls", item.current_controls || "", { type: "textarea", full: true, readonly })}
            ${documentField("deescalation_strategies", "De-escalation strategies", item.deescalation_strategies || "", { type: "textarea", full: true, readonly })}
            ${documentField("response_actions", "Response actions", item.response_actions || "", { type: "textarea", full: true, readonly })}
            ${documentField("child_views", "Child views", item.child_views || item.child_voice || "", { type: "textarea", full: true, readonly })}
          </div>
        </div>
      </form>
    `;
  }

  return `
    <form id="documentRecordForm" class="document-sheet document-sheet-landscape">
      <div class="document-sheet-header">
        <div>
          <div class="document-sheet-kicker">Support plan</div>
          <h3 class="document-sheet-title">Staff guidance and support planning</h3>
          <p class="document-sheet-text">Plan support in a structured, relational and PACE-informed way, linked to standards and Ofsted-ready evidence.</p>
        </div>
      </div>

      <div class="document-meta-grid document-meta-grid-4">
        ${documentField("plan_type", "Plan type", item.plan_type || "support_plan", { readonly })}
        ${documentField("title", "Title", item.title || "", { readonly })}
        ${documentField("review_date", "Review date", item.review_date || today, { type: "date", readonly })}
        ${documentField("status", "Status", item.status || item.approval_status || "draft", { readonly })}
      </div>

      <div class="document-section">
        <h4>Understanding need</h4>
        <div class="document-grid document-grid-2">
          ${documentField("presenting_need", "Presenting need / formulation", item.presenting_need || item.formulation || "", { type: "textarea", full: true, readonly })}
          ${documentField("summary", "Summary", item.summary || "", { type: "textarea", full: true, readonly })}
          ${documentField("child_voice", "Child voice", item.child_voice || "", { type: "textarea", full: true, readonly })}
          ${documentField("protective_factors", "Protective factors", item.protective_factors || "", { type: "textarea", full: true, readonly })}
        </div>
      </div>

      <div class="document-section">
        <h4>Staff guidance</h4>
        <div class="document-grid document-grid-2">
          ${documentField("proactive_strategies", "Proactive strategies", item.proactive_strategies || item.staff_guidance || "", { type: "textarea", full: true, readonly })}
          ${documentField("pace_guidance", "PACE guidance", item.pace_guidance || "", { type: "textarea", full: true, readonly })}
          ${documentField("triggers", "Triggers", item.triggers || "", { type: "textarea", full: true, readonly })}
        </div>
      </div>
    </form>
  `;
}

function serializeDocumentForm() {
  const form = document.getElementById("documentRecordForm");
  if (!form) return {};
  const formData = new FormData(form);
  const obj = {};

  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }

  obj.young_person_id = state.youngPersonId;
  return obj;
}

function getDocumentConfig(type) {
  return RECORD_CONFIG[type] || RECORD_CONFIG.plan;
}

function renderDocumentFooter(type, item = {}, mode = "create") {
  els.documentFooterLeft.innerHTML = renderDocumentChips(item, type);
  if (mode === "view") {
    els.documentModalSaveBtn.textContent = "Edit document";
  } else if (mode === "edit") {
    els.documentModalSaveBtn.textContent = "Save changes";
  } else {
    els.documentModalSaveBtn.textContent = "Save document";
  }
}

function renderDocumentShell(type, mode, item = {}) {
  const config = getDocumentConfig(type);
  const modeLabel = mode === "create" ? "Create" : mode === "edit" ? "Edit" : "View";

  els.documentModalEyebrow.textContent = `${modeLabel} ${config.label}`;
  els.documentModalTitle.textContent = item.title || config.label;
  els.documentModalSubtitle.textContent =
    mode === "view"
      ? "Full document view."
      : mode === "edit"
        ? "Update this document in full-screen format."
        : "Create this document in full-screen format.";

  els.documentModalBody.innerHTML = buildDocumentForm(type, item, mode);
  renderDocumentFooter(type, item, mode);
  openDocumentModal();
}

function openRecordModal(recordType, mode = "create", item = null) {
  state.documentRecordType = recordType;
  state.documentMode = mode;
  state.documentEditItem = item;
  state.documentViewItem = item;
  renderDocumentShell(recordType, mode, item || {});
}

async function handleDocumentSave() {
  const recordType = state.documentRecordType;
  const mode = state.documentMode;
  const config = getDocumentConfig(recordType);

  if (!config) {
    showError("This record type is not configured.");
    return;
  }

  if (mode === "view" && state.documentViewItem) {
    openRecordModal(recordType, "edit", state.documentViewItem);
    return;
  }

  const payload = serializeDocumentForm();

  try {
    els.documentModalSaveBtn.disabled = true;

    if (mode === "edit" && state.documentEditItem?.id) {
      await apiSend(
        config.updateUrl(state.documentEditItem.id),
        config.updateMethod || "PATCH",
        payload,
      );
      showMessage(`${config.label} updated.`);
    } else {
      await apiSend(
        config.createUrl(state.youngPersonId),
        "POST",
        payload,
      );
      showMessage(`${config.label} created.`);
    }

    closeDocumentModal();
    await loadCurrentView();
  } catch (error) {
    console.error(error);
    showError(error.message || "Could not save document.");
  } finally {
    els.documentModalSaveBtn.disabled = false;
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
  const method = "POST";

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

  if (!url) {
    showError(`No ${action} route is configured for this record.`);
    return;
  }

  try {
    await apiSend(url, method, body);
    showMessage(`${config.label} ${action}ed.`);
    await loadCurrentView();
    closeDrawer();
    closeDocumentModal();
  } catch (error) {
    console.error(error);
    showError(error.message || `Could not ${action} record.`);
  }
}

function shouldShowDrawerActions(type) {
  return Boolean(RECORD_CONFIG[type]);
}

async function openRecordDetail(item) {
  const url = getRecordUrl(item);
  if (!url) {
    showError("This record cannot be opened yet.");
    return;
  }

  const type = normaliseRecordType(item);
  state.activeRecordItem = item;
  state.activeRecordType = type;

  try {
    const data = await apiGet(url);
    const detailData =
      data?.daily_note ||
      data?.incident ||
      data?.risk ||
      data?.support_plan ||
      data?.health_record ||
      data?.medication_profile ||
      data?.medication_record ||
      data?.education_record ||
      data?.family_contact_record ||
      data?.contact ||
      data?.keywork ||
      data?.report ||
      data;

    const merged = { ...item, ...detailData };
    state.documentViewItem = merged;
    state.documentEditItem = merged;
    state.documentRecordType = type;
    state.documentMode = "view";
    renderDocumentShell(type, "view", merged);
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load record details.");
  }
}

function renderRecordCard(item) {
  const title = item.title || item.topic || item.contact_person || item.record_type || "Record";
  const summary = item.summary || item.narrative || item.description || item.concern_summary || "No summary available.";

  const meta = [
    item.occurred_at ? formatDate(item.occurred_at) : null,
    item.session_date ? formatDate(item.session_date) : null,
    item.recorded_at ? formatDate(item.recorded_at) : null,
    item.worker_name || null,
    item.author_name || null,
    item.created_by_name || null,
    item.owner_name || null,
  ].filter(Boolean);

  const badges = [
    item.workflow_status,
    item.severity,
    item.status,
    item.approval_status,
  ].filter(Boolean);

  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <div class="record-meta">${escapeHtml(meta.join(" • ") || "Record")}</div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(summary)}</div>
      ${renderBadges(badges)}
      <div class="day-record-actions">
        <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open document</button>
      </div>
    </article>
  `;
}

function renderTimelineItem(item) {
  const severityClass = `severity-${String(item.severity || item.significance || "").toLowerCase()}`;
  return `
    <article class="timeline-item ${escapeHtml(severityClass)}">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(item.title || item.event_type || item.category || "Timeline item")}</h4>
          <div class="record-meta">
            ${escapeHtml(formatDate(item.occurred_at || item.event_datetime || item.created_at))}
            ${(item.event_type || item.category) ? ` • ${escapeHtml(item.event_type || item.category)}` : ""}
          </div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(item.summary || item.narrative || "No summary available.")}</div>
      ${renderBadges([item.severity || item.significance, item.workflow_status || item.event_status])}
      <div class="day-record-actions">
        <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open document</button>
      </div>
    </article>
  `;
}

function groupTimelineItems(items) {
  const groups = { today: [], thisWeek: [], earlier: [] };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);

  items.forEach((item) => {
    const raw = item.occurred_at || item.event_datetime || item.created_at;
    const d = new Date(raw);

    if (Number.isNaN(d.getTime())) groups.earlier.push(item);
    else if (d >= startOfToday) groups.today.push(item);
    else if (d >= startOfWeek) groups.thisWeek.push(item);
    else groups.earlier.push(item);
  });

  return groups;
}

function renderGroupedTimelineFromItems(items) {
  const groups = groupTimelineItems(items);

  const renderGroup = (title, arr) => {
    if (!arr.length) return "";
    return `
      <div class="timeline-group">
        <div class="timeline-group-title">${escapeHtml(title)}</div>
        ${arr.map(renderTimelineItem).join("")}
      </div>
    `;
  };

  return [
    renderGroup("Today", groups.today),
    renderGroup("This week", groups.thisWeek),
    renderGroup("Earlier", groups.earlier),
  ].join("") || `<div class="empty-state">No timeline items.</div>`;
}

function renderProfileSection(title, rows = []) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="kv">
        ${
          rows.length
            ? rows.map((row) => `
                <div class="kv-key">${escapeHtml(row.label)}</div>
                <div>${escapeHtml(row.value || "—")}</div>
              `).join("")
            : `<div class="kv-key">Details</div><div>—</div>`
        }
      </div>
    </section>
  `;
}

function renderHandoverItem(title, body, badges = []) {
  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(title)}</h4>
        </div>
      </div>
      <div class="record-body">${escapeHtml(body || "—")}</div>
      ${renderBadges(badges)}
    </article>
  `;
}

function updateHeaderForView(view) {
  const config = VIEW_CONFIG[view];
  els.pageTitle.textContent = config.title;
  els.pageSubtitle.textContent = config.subtitle;
}

function markActiveNav(view) {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function showSelectorMode() {
  els.selectorPanel.classList.remove("hidden");
  els.workspacePanel.classList.add("hidden");
  els.refreshBtn.classList.add("hidden");
  els.quickActions.classList.add("hidden");
  els.pageTitle.textContent = "Select a young person";
  els.pageSubtitle.textContent = "Open a workspace to begin";
  els.personName.textContent = "No young person selected";
  els.personMeta.textContent = "Choose from the selector";
  els.personAvatar.textContent = "YP";
}

function hideSelectorMode() {
  els.selectorPanel.classList.add("hidden");
  els.workspacePanel.classList.remove("hidden");
  els.refreshBtn.classList.remove("hidden");
  els.quickActions.classList.remove("hidden");
}

function openYoungPerson(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", String(id));
  url.searchParams.delete("young_person_id");
  window.history.replaceState({}, "", url.toString());

  state.youngPersonId = Number(id);
  state.youngPerson = null;
  state.currentView = "home";
  state.timelineCache = [];
  state.calendarDate = new Date();
  state.selectedDate = toDateInputValue(new Date());
  state.calendarMonthSummary = [];
  state.selectedDayRecords = [];

  hideSelectorMode();

  loadYoungPerson()
    .then(loadCurrentView)
    .catch((error) => {
      console.error(error);
      showError(error.message || "Failed to load young person.");
      setEmpty("Unable to load workspace.");
    });
}

function renderSelectorList(items) {
  if (!items.length) {
    els.selectorList.innerHTML = `<div class="selector-empty">No young people found.</div>`;
    return;
  }

  els.selectorList.innerHTML = items.map((item) => {
    const name =
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
          <div class="selector-card-avatar">${escapeHtml(initialsFromName(name))}</div>
          <div>
            <h4>${escapeHtml(name)}</h4>
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
  clearError();
  showSelectorMode();
  els.selectorList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading young people...</p>
    </div>
  `;

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young people.");
    els.selectorList.innerHTML = `<div class="selector-empty">Unable to load young people.</div>`;
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
}

async function loadProfile() {
  setLoading("Loading profile...");

  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const bundle = data.bundle || {};
  const yp = bundle.young_person || data.young_person || state.youngPerson || {};
  const communication = bundle.communication_profile || {};
  const education = bundle.education_profile || {};
  const health = bundle.health_profile || {};
  const identity = bundle.identity_profile || {};
  const legal = bundle.legal_status || {};
  const contacts = bundle.contacts || [];
  const alerts = bundle.alerts || [];

  const displayName =
    [yp.first_name, yp.last_name].filter(Boolean).join(" ").trim() ||
    yp.preferred_name ||
    "Young Person";

  els.content.innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card">
        <div class="stat-label">Name</div>
        <div class="stat-value" style="font-size:18px;">${escapeHtml(displayName)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Placement status</div>
        <div class="stat-value" style="font-size:18px;">${escapeHtml(yp.placement_status || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Risk level</div>
        <div class="stat-value" style="font-size:18px;">${escapeHtml(yp.summary_risk_level || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Alerts</div>
        <div class="stat-value">${alerts.length}</div>
      </div>
    </div>

    <div class="callout-grid">
      <div class="record-list">
        ${renderProfileSection("Core profile", [
          { label: "Preferred name", value: yp.preferred_name || "—" },
          { label: "Date of birth", value: formatDate(yp.date_of_birth) },
          { label: "Gender", value: yp.gender || "—" },
          { label: "Ethnicity", value: yp.ethnicity || "—" },
          { label: "Admission date", value: formatDate(yp.admission_date) },
          { label: "Discharge date", value: formatDate(yp.discharge_date) },
        ])}

        ${renderProfileSection("Communication and presentation", [
          { label: "Communication style", value: communication.communication_style || "—" },
          { label: "Sensory profile", value: communication.sensory_profile || "—" },
          { label: "Processing needs", value: communication.processing_needs || "—" },
          { label: "Signs of distress", value: communication.signs_of_distress || "—" },
          { label: "What helps", value: communication.what_helps || "—" },
          { label: "What to avoid", value: communication.what_to_avoid || "—" },
        ])}

        ${renderProfileSection("Identity and what matters", [
          { label: "Religion or faith", value: identity.religion_or_faith || "—" },
          { label: "Cultural identity", value: identity.cultural_identity || "—" },
          { label: "First language", value: identity.first_language || "—" },
          { label: "Dietary needs", value: identity.dietary_needs || "—" },
          { label: "Interests", value: identity.interests || "—" },
          { label: "Strengths", value: identity.strengths_summary || "—" },
          { label: "What matters to me", value: identity.what_matters_to_me || "—" },
        ])}
      </div>

      <div class="record-list">
        ${renderProfileSection("Legal and contact", [
          { label: "Legal status", value: legal.legal_status || "—" },
          { label: "Order type", value: legal.order_type || "—" },
          { label: "Restrictions", value: legal.restrictions_text || "—" },
          { label: "Delegated authority", value: legal.delegated_authority_details || "—" },
          { label: "Consent arrangements", value: legal.consent_arrangements || "—" },
        ])}

        ${renderProfileSection("Education profile", [
          { label: "School", value: education.school_name || "—" },
          { label: "Year group", value: education.year_group || "—" },
          { label: "Education status", value: education.education_status || "—" },
          { label: "SEN status", value: education.sen_status || "—" },
          { label: "Support summary", value: education.support_summary || "—" },
        ])}

        ${renderProfileSection("Health profile", [
          { label: "GP", value: health.gp_name || "—" },
          { label: "Allergies", value: health.allergies || "—" },
          { label: "Diagnoses", value: health.diagnoses || "—" },
          { label: "Mental health", value: health.mental_health_summary || "—" },
          { label: "Medication summary", value: health.medication_summary || "—" },
        ])}

        <section class="panel">
          <div class="panel-header">
            <div>
              <h3>Contacts and alerts</h3>
              <p class="panel-subtitle">Important adults and current profile alerts.</p>
            </div>
          </div>

          ${
            contacts.length
              ? `<div class="record-list">
                  ${contacts.slice(0, 6).map((contact) => `
                    <article class="record-card">
                      <div class="record-card-header">
                        <div>
                          <h4>${escapeHtml(contact.full_name || "Contact")}</h4>
                          <div class="record-meta">${escapeHtml(contact.relationship_to_young_person || contact.contact_type || "Contact")}</div>
                        </div>
                      </div>
                      <div class="record-body">Phone: ${escapeHtml(contact.phone || "—")}
Email: ${escapeHtml(contact.email || "—")}
Notes: ${escapeHtml(contact.notes || "—")}</div>
                    </article>
                  `).join("")}
                </div>`
              : `<div class="empty-state">No contacts recorded.</div>`
          }

          <div style="height:10px;"></div>

          ${
            alerts.length
              ? `<div class="record-list">
                  ${alerts.map((alert) => `
                    <article class="record-card">
                      <div class="record-card-header">
                        <div>
                          <h4>${escapeHtml(alert.title || "Alert")}</h4>
                        </div>
                      </div>
                      <div class="record-body">${escapeHtml(alert.description || "No description.")}</div>
                      ${renderBadges([alert.severity, alert.is_active ? "active" : "inactive"])}
                    </article>
                  `).join("")}
                </div>`
              : `<div class="empty-state">No active alerts.</div>`
          }
        </section>
      </div>
    </div>
  `;
}

async function loadHome() {
  setLoading("Loading home...");

  const [overviewData, timelineData, plansData, riskData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=50`),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/risk`).catch(() => ({ items: [] })),
  ]);

  const yp = overviewData.young_person || {};
  const counts = overviewData.dashboard_counts || {};
  const alerts = overviewData.alerts || [];
  const recent = (timelineData.timeline || []).slice(0, 12);
  const plans = (plansData.items || []).slice(0, 3);
  const risks = (riskData.items || []).slice(0, 3);

  state.timelineCache = timelineData.timeline || [];

  els.content.innerHTML = `
    <div class="grid grid-3">
      <div class="stat-card">
        <div class="stat-label">Placement status</div>
        <div class="stat-value">${escapeHtml(yp.placement_status || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Risk level</div>
        <div class="stat-value">${escapeHtml(yp.summary_risk_level || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Open alerts</div>
        <div class="stat-value">${escapeHtml(String(alerts.length))}</div>
      </div>
    </div>

    <div class="callout-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Alerts</h3>
            <p class="panel-subtitle">What staff need to know right now.</p>
          </div>
        </div>
        ${
          alerts.length
            ? `<div class="record-list">${alerts.map((alert) => `
                <article class="record-card">
                  <div class="record-card-header">
                    <div>
                      <h4>${escapeHtml(alert.title || "Alert")}</h4>
                      <div class="record-meta">${escapeHtml(alert.alert_type || "Alert")}</div>
                    </div>
                  </div>
                  <div class="record-body">${escapeHtml(alert.description || "No description.")}</div>
                  ${renderBadges([alert.severity, alert.is_active ? "active" : "inactive"])}
                </article>
              `).join("")}</div>`
            : `<div class="empty-state">No active alerts.</div>`
        }
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>At a glance</h3>
            <p class="panel-subtitle">Useful information for this shift.</p>
          </div>
        </div>
        <div class="mini-list">
          <div class="mini-item"><div class="mini-item-title">Daily notes</div><div class="mini-item-subtitle">${escapeHtml(String(counts.daily_notes || 0))} recorded</div></div>
          <div class="mini-item"><div class="mini-item-title">Incidents</div><div class="mini-item-subtitle">${escapeHtml(String(counts.incidents || 0))} recorded</div></div>
          <div class="mini-item"><div class="mini-item-title">Risk assessments</div><div class="mini-item-subtitle">${escapeHtml(String(counts.risk_assessments || 0))} on file</div></div>
          <div class="mini-item"><div class="mini-item-title">Plans</div><div class="mini-item-subtitle">${escapeHtml(String(counts.support_plans || 0))} on file</div></div>
        </div>
      </div>
    </div>

    <div class="callout-grid">
      <div class="panel">
        <div class="panel-header"><div><h3>Current risks</h3><p class="panel-subtitle">Most relevant current risk records.</p></div></div>
        ${risks.length ? `<div class="record-list">${risks.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No current risk records.</div>`}
      </div>

      <div class="panel">
        <div class="panel-header"><div><h3>Plans</h3><p class="panel-subtitle">Current plans staff may need to follow.</p></div></div>
        ${plans.length ? `<div class="record-list">${plans.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No current plans.</div>`}
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><div><h3>Recent activity</h3><p class="panel-subtitle">Recent chronology across the record.</p></div></div>
      ${recent.length ? renderGroupedTimelineFromItems(recent) : `<div class="empty-state">No recent activity.</div>`}
    </div>
  `;

  bindDynamicOpenRecordButtons();
}

async function loadHandover() {
  setLoading("Loading handover...");

  const [overviewData, timelineData, riskData, plansData, handoverData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=25`),
    apiGet(`/young-people/${state.youngPersonId}/risk`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/handover`).catch(() => ({ items: [] })),
  ]);

  const alerts = overviewData.alerts || [];
  const recent = (timelineData.timeline || []).slice(0, 10);
  const risks = (riskData.items || []).slice(0, 5);
  const plans = (plansData.items || []).slice(0, 5);
  const handovers = handoverData.items || [];

  const incidents = recent.filter((item) => String(item.event_type || item.category || "").toLowerCase().includes("incident"));
  const dailyNotes = recent.filter((item) => String(item.event_type || item.category || "").toLowerCase().includes("daily_note"));
  const latestHandover = handovers[0] || null;

  els.content.innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card">
        <div class="stat-label">Active alerts</div>
        <div class="stat-value">${alerts.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Recent incidents</div>
        <div class="stat-value">${incidents.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Recent daily notes</div>
        <div class="stat-value">${dailyNotes.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current risks</div>
        <div class="stat-value">${risks.length}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Generated handover</h3>
          <p class="panel-subtitle">Auto-built from recent recorded reality.</p>
        </div>
        <div class="day-record-actions">
          <button id="generateHandoverBtn" class="primary-btn">Generate handover</button>
        </div>
      </div>
      ${
        latestHandover
          ? `
            <article class="record-card">
              <div class="record-card-header">
                <div>
                  <h4>${escapeHtml(latestHandover.title || "Shift handover")}</h4>
                  <div class="record-meta">${escapeHtml(formatDate(latestHandover.handover_date || latestHandover.created_at))}</div>
                </div>
              </div>
              <div class="record-body">${escapeHtml(latestHandover.summary_text || "No summary.")}</div>
              ${renderBadges([latestHandover.status, latestHandover.shift_type])}
            </article>
          `
          : `<div class="empty-state">No handover generated yet.</div>`
      }
    </div>

    <div class="callout-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>What staff need to know now</h3>
            <p class="panel-subtitle">Priority alerts, current risks and recent events.</p>
          </div>
        </div>

        <div class="record-list">
          ${
            alerts.length
              ? alerts.map((alert) => renderHandoverItem(
                  alert.title || "Alert",
                  alert.description || "No description.",
                  [alert.severity, alert.is_active ? "active" : "inactive"]
                )).join("")
              : renderHandoverItem("Alerts", "No active alerts recorded.", [])
          }

          ${
            risks.length
              ? risks.map((risk) => renderHandoverItem(
                  risk.title || "Risk",
                  risk.concern_summary || risk.summary || "No summary recorded.",
                  [risk.severity, risk.status, risk.approval_status]
                )).join("")
              : renderHandoverItem("Risks", "No current risk records.", [])
          }
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Plans staff may need to follow</h3>
            <p class="panel-subtitle">Current plans and guidance likely to matter next shift.</p>
          </div>
        </div>

        ${
          plans.length
            ? `<div class="record-list">${plans.map(renderRecordCard).join("")}</div>`
            : `<div class="empty-state">No current plans recorded.</div>`
        }
      </section>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Recent chronology for handover</h3>
          <p class="panel-subtitle">Recent recorded activity across the record.</p>
        </div>
      </div>
      ${recent.length ? renderGroupedTimelineFromItems(recent) : `<div class="empty-state">No recent chronology recorded.</div>`}
    </section>
  `;

  const generateBtn = document.getElementById("generateHandoverBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      try {
        generateBtn.disabled = true;
        await apiSend(`/young-people/${state.youngPersonId}/handover/generate`, "POST", {
          shift_type: "day",
          title: "Shift Handover",
        });
        showMessage("Handover generated.");
        await loadCurrentView();
      } catch (error) {
        console.error(error);
        showError(error.message || "Could not generate handover.");
      } finally {
        generateBtn.disabled = false;
      }
    });
  }

  bindDynamicOpenRecordButtons();
}

async function loadCompliancePlaceholder() {
  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Compliance</h3>
          <p class="panel-subtitle">Checks, gaps, due dates and evidence readiness.</p>
        </div>
      </div>
      <div class="empty-state">
        <p>This section is ready for the full compliance view in the next step.</p>
      </div>
    </div>
  `;
}

async function loadReportsPlaceholder() {
  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Reports</h3>
          <p class="panel-subtitle">Reports, summaries and management outputs.</p>
        </div>
      </div>
      <div class="empty-state">
        <p>This section is ready for the full reports view in the next step.</p>
      </div>
    </div>
  `;
}

async function loadCalendarMonthSummary() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth() + 1;

  try {
    const data = await apiGet(`/young-people/${state.youngPersonId}/calendar-summary?year=${year}&month=${month}`);
    state.calendarMonthSummary = data.days || data.items || [];
  } catch (error) {
    console.error(error);
    state.calendarMonthSummary = [];
  }
}

async function loadSelectedDayRecords() {
  try {
    const data = await apiGet(`/young-people/${state.youngPersonId}/records-by-date?date=${state.selectedDate}`);
    state.selectedDayRecords = data.items || [];
  } catch (error) {
    console.error(error);
    state.selectedDayRecords = [];
  }
}

function getMonthDayMeta(dateString) {
  return state.calendarMonthSummary.find((item) => item.date === dateString) || null;
}

function buildCalendarGrid() {
  const current = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
  const firstDay = new Date(current);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - startWeekday);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + i);
    const dateString = toDateInputValue(day);
    const meta = getMonthDayMeta(dateString);
    const isCurrentMonth = day.getMonth() === state.calendarDate.getMonth();
    const isToday = dateString === toDateInputValue(new Date());
    const isSelected = dateString === state.selectedDate;
    const markers = meta?.record_types || meta?.types || [];

    days.push(`
      <button
        class="calendar-day ${isCurrentMonth ? "" : "other-month"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}"
        data-calendar-date="${dateString}"
      >
        <div class="calendar-day-number">${day.getDate()}</div>
        <div class="calendar-day-markers">
          ${markers.slice(0, 6).map((type) => `<span class="calendar-marker marker-${escapeHtml(type)}"></span>`).join("")}
        </div>
      </button>
    `);
  }
  return days.join("");
}

function renderDayRecords(records) {
  if (!records.length) {
    return `<div class="empty-state">No records were recorded on this day.</div>`;
  }

  return records.map((item) => {
    const title = item.title || item.record_type || item.event_type || item.category || "Record";
    const summary = item.summary || item.narrative || item.description || "No summary available.";
    const staffName = item.recorded_by_name || item.author_name || item.created_by_name || item.worker_name || "Unknown";
    const recordedAt = item.recorded_at || item.occurred_at || item.event_datetime || item.created_at;

    return `
      <article class="day-record-card">
        <div class="day-record-top">
          <div>
            <div class="day-record-title">${escapeHtml(title)}</div>
            <div class="day-record-meta">
              ${escapeHtml(String(item.record_type || item.event_type || item.category || "record").replaceAll("_", " "))}
              • ${escapeHtml(formatShortTime(recordedAt))}
              • ${escapeHtml(staffName)}
            </div>
          </div>
          <div>${renderBadges([item.workflow_status, item.severity || item.significance])}</div>
        </div>
        <div class="day-record-summary">${escapeHtml(summary)}</div>
        <div class="day-record-actions">
          <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open document</button>
        </div>
      </article>
    `;
  }).join("");
}

function buildDaySummary(records) {
  const total = records.length;
  const incidents = records.filter((x) => String(x.record_type || x.event_type || x.category || "").toLowerCase().includes("incident")).length;
  const dailyNotes = records.filter((x) => {
    const t = String(x.record_type || x.event_type || x.category || "").toLowerCase();
    return t.includes("daily_note") || t.includes("daily note");
  }).length;
  return { total, incidents, dailyNotes };
}

async function loadCalendarView() {
  setLoading("Loading calendar...");
  await Promise.all([loadCalendarMonthSummary(), loadSelectedDayRecords()]);
  renderCalendarView();
}

function renderCalendarView() {
  const selectedDateLabel = formatDate(`${state.selectedDate}T12:00:00`);
  const summary = buildDaySummary(state.selectedDayRecords);

  els.content.innerHTML = `
    <div class="calendar-shell">
      <section class="calendar-panel">
        <div class="calendar-header">
          <div class="calendar-title">${escapeHtml(monthName(state.calendarDate))}</div>
          <div class="calendar-controls">
            <button class="calendar-icon-btn" id="calendarPrevBtn">←</button>
            <button class="calendar-icon-btn" id="calendarTodayBtn">Today</button>
            <button class="calendar-icon-btn" id="calendarNextBtn">→</button>
          </div>
        </div>

        <div class="calendar-weekdays">
          <div class="calendar-weekday">Mon</div>
          <div class="calendar-weekday">Tue</div>
          <div class="calendar-weekday">Wed</div>
          <div class="calendar-weekday">Thu</div>
          <div class="calendar-weekday">Fri</div>
          <div class="calendar-weekday">Sat</div>
          <div class="calendar-weekday">Sun</div>
        </div>

        <div class="calendar-grid">${buildCalendarGrid()}</div>
      </section>

      <section class="day-panel">
        <div class="panel-header">
          <div>
            <h3>${escapeHtml(selectedDateLabel)}</h3>
            <p class="panel-subtitle">Everything recorded on this day.</p>
          </div>
        </div>

        <div class="day-summary-row">
          <div class="day-summary-card"><div class="day-summary-label">Total records</div><div class="day-summary-value">${summary.total}</div></div>
          <div class="day-summary-card"><div class="day-summary-label">Incidents</div><div class="day-summary-value">${summary.incidents}</div></div>
          <div class="day-summary-card"><div class="day-summary-label">Daily notes</div><div class="day-summary-value">${summary.dailyNotes}</div></div>
        </div>

        <div class="day-filter-row">
          <input id="dayRecordSearch" class="text-input" type="text" placeholder="Search this day..." />
          <select id="dayRecordType" class="select-input">
            <option value="">All record types</option>
            <option value="daily_note">Daily notes</option>
            <option value="incident">Incidents</option>
            <option value="risk">Risk</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="family">Family</option>
            <option value="keywork">Keywork</option>
            <option value="support_plan">Plans</option>
          </select>
        </div>

        <div id="dayRecordsResults">${renderDayRecords(state.selectedDayRecords)}</div>
      </section>
    </div>
  `;

  bindCalendarEvents();
}

function bindCalendarEvents() {
  const prevBtn = document.getElementById("calendarPrevBtn");
  const nextBtn = document.getElementById("calendarNextBtn");
  const todayBtn = document.getElementById("calendarTodayBtn");
  const dayResults = document.getElementById("dayRecordsResults");
  const searchEl = document.getElementById("dayRecordSearch");
  const typeEl = document.getElementById("dayRecordType");

  async function rerenderCalendar() {
    setLoading("Loading calendar...");
    await Promise.all([loadCalendarMonthSummary(), loadSelectedDayRecords()]);
    renderCalendarView();
  }

  prevBtn.addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    await rerenderCalendar();
  });

  nextBtn.addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    await rerenderCalendar();
  });

  todayBtn.addEventListener("click", async () => {
    const today = new Date();
    state.calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    state.selectedDate = toDateInputValue(today);
    await rerenderCalendar();
  });

  els.content.querySelectorAll("[data-calendar-date]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.selectedDate = btn.dataset.calendarDate;
      const clicked = new Date(`${state.selectedDate}T12:00:00`);
      state.calendarDate = new Date(clicked.getFullYear(), clicked.getMonth(), 1);
      await rerenderCalendar();
    });
  });

  function applyDayFilters() {
    const term = (searchEl.value || "").trim().toLowerCase();
    const type = (typeEl.value || "").trim().toLowerCase();

    const filtered = state.selectedDayRecords.filter((item) => {
      const haystack = [
        item.title, item.summary, item.narrative, item.description, item.record_type,
        item.event_type, item.category, item.recorded_by_name, item.author_name, item.created_by_name, item.worker_name,
      ].filter(Boolean).join(" ").toLowerCase();

      const typeValue = String(item.record_type || item.event_type || item.category || "").toLowerCase();
      return (!term || haystack.includes(term)) && (!type || typeValue === type);
    });

    dayResults.innerHTML = renderDayRecords(filtered);
    bindDynamicOpenRecordButtons();
  }

  searchEl.addEventListener("input", applyDayFilters);
  typeEl.addEventListener("change", applyDayFilters);
  bindDynamicOpenRecordButtons();
}

async function loadTimeline() {
  setLoading("Loading timeline...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/timeline?limit=250`);
  const items = data.timeline || [];
  state.timelineCache = items;
  renderTimelinePanel(items);
}

function renderTimelinePanel(items) {
  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>What happened</h3>
          <p class="panel-subtitle">Chronology across all records.</p>
        </div>
      </div>

      <div class="timeline-toolbar">
        <input id="timelineSearch" class="text-input" type="text" placeholder="Search..." />
        <select id="timelineType" class="select-input">
          <option value="">All record types</option>
          <option value="daily_note">Daily notes</option>
          <option value="incident">Incidents</option>
          <option value="risk">Risk</option>
          <option value="health">Health</option>
          <option value="education">Education</option>
          <option value="family">Family</option>
          <option value="keywork">Keywork</option>
          <option value="support_plan">Plans</option>
        </select>
      </div>

      <div id="timelineResults">
        ${items.length ? renderGroupedTimelineFromItems(items) : `<div class="empty-state">No timeline items.</div>`}
      </div>
    </div>
  `;

  const searchEl = document.getElementById("timelineSearch");
  const typeEl = document.getElementById("timelineType");
  const resultsEl = document.getElementById("timelineResults");

  function applyTimelineFilters() {
    const term = (searchEl.value || "").trim().toLowerCase();
    const type = (typeEl.value || "").trim().toLowerCase();

    const filtered = state.timelineCache.filter((item) => {
      const haystack = [item.title, item.summary, item.narrative, item.event_type, item.category, item.subcategory]
        .filter(Boolean).join(" ").toLowerCase();
      const typeValue = String(item.event_type || item.category || "").toLowerCase();

      return (!term || haystack.includes(term)) && (!type || typeValue === type);
    });

    resultsEl.innerHTML = filtered.length
      ? renderGroupedTimelineFromItems(filtered)
      : `<div class="empty-state">No timeline items match these filters.</div>`;

    bindDynamicOpenRecordButtons();
  }

  searchEl.addEventListener("input", applyTimelineFilters);
  typeEl.addEventListener("change", applyTimelineFilters);
  bindDynamicOpenRecordButtons();
}

async function loadRecordList(url, label) {
  setLoading(`Loading ${label.toLowerCase()}...`);
  const data = await apiGet(url);
  const items = data.items || data.timeline || data.records || [];

  if (!items.length) {
    setEmpty(`No ${label.toLowerCase()} found.`);
    return;
  }

  els.content.innerHTML = `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`;
  bindDynamicOpenRecordButtons();
}

async function loadHealth() {
  setLoading("Loading health...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/health`);
  const profile = data.health_profile || data.profile || {};
  const records = data.health_records || [];
  const medicationProfiles = data.medication_profiles || [];
  const medicationRecords = data.medication_records || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><div><h3>Health profile</h3><p class="panel-subtitle">Key health information.</p></div></div>
      <div class="kv">
        <div class="kv-key">GP</div><div>${escapeHtml(profile.gp_name || "—")}</div>
        <div class="kv-key">Allergies</div><div>${escapeHtml(profile.allergies || "—")}</div>
        <div class="kv-key">Diagnoses</div><div>${escapeHtml(profile.diagnoses || "—")}</div>
        <div class="kv-key">Mental health</div><div>${escapeHtml(profile.mental_health_summary || "—")}</div>
        <div class="kv-key">Medication summary</div><div>${escapeHtml(profile.medication_summary || "—")}</div>
      </div>
    </div>

    <div class="panel"><h3>Health records</h3>${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No health records.</div>`}</div>

    <div class="panel">
      <h3>Medication profiles</h3>
      ${
        medicationProfiles.length
          ? `<div class="record-list">${medicationProfiles.map((item) => `
              <article class="record-card">
                <div class="record-card-header">
                  <div>
                    <h4>${escapeHtml(item.medication_name || "Medication")}</h4>
                    <div class="record-meta">${escapeHtml(item.dosage || item.dose || "—")} • ${escapeHtml(item.frequency || "—")}</div>
                  </div>
                </div>
                <div class="record-body">${escapeHtml(item.notes || item.prn_guidance || item.reason || "No notes.")}</div>
                <div class="day-record-actions">
                  <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify({ ...item, record_type: "medication_profile" }))}'>Open document</button>
                </div>
              </article>
            `).join("")}</div>`
          : `<div class="empty-state">No medication profiles.</div>`
      }
    </div>

    <div class="panel"><h3>Medication records</h3>${medicationRecords.length ? `<div class="record-list">${medicationRecords.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No medication records.</div>`}</div>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadEducation() {
  setLoading("Loading education...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);
  const profile = data.education_profile || data.profile || {};
  const records = data.education_records || data.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><div><h3>Education profile</h3><p class="panel-subtitle">Current school and support information.</p></div></div>
      <div class="kv">
        <div class="kv-key">School</div><div>${escapeHtml(profile.school_name || "—")}</div>
        <div class="kv-key">Year group</div><div>${escapeHtml(profile.year_group || "—")}</div>
        <div class="kv-key">Education status</div><div>${escapeHtml(profile.education_status || "—")}</div>
        <div class="kv-key">SEN status</div><div>${escapeHtml(profile.sen_status || "—")}</div>
        <div class="kv-key">Support summary</div><div>${escapeHtml(profile.support_summary || "—")}</div>
      </div>
    </div>

    <div class="panel"><h3>Education records</h3>${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No education records.</div>`}</div>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadFamily() {
  setLoading("Loading family...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/family`);
  const contacts = data.contacts || [];
  const records = data.family_contact_records || data.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header"><div><h3>Family contacts</h3><p class="panel-subtitle">Family and contact information.</p></div></div>
      ${contacts.length ? `<div class="record-list">${contacts.map((contact) => `
        <article class="record-card">
          <div class="record-card-header">
            <div>
              <h4>${escapeHtml(contact.full_name || "Contact")}</h4>
              <div class="record-meta">${escapeHtml(contact.relationship_to_young_person || contact.contact_type || "Contact")}</div>
            </div>
          </div>
          <div class="record-body">Phone: ${escapeHtml(contact.phone || "—")}
Email: ${escapeHtml(contact.email || "—")}
Notes: ${escapeHtml(contact.notes || "—")}</div>
        </article>
      `).join("")}</div>` : `<div class="empty-state">No family contacts.</div>`}
    </div>

    <div class="panel"><h3>Family records</h3>${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No family contact records.</div>`}</div>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadCurrentView() {
  clearError();
  updateHeaderForView(state.currentView);
  markActiveNav(state.currentView);

  const config = VIEW_CONFIG[state.currentView];
  if (!config) {
    setEmpty("Unknown view.");
    return;
  }

  try {
    await config.loader();
  } catch (error) {
    console.error(error);
    showError(error.message || "Something went wrong.");
    setEmpty("Unable to load this workspace.");
  }
}

function bindDynamicOpenRecordButtons() {
  els.content.querySelectorAll("[data-open-record]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const item = JSON.parse(btn.dataset.openRecord);
        openRecordDetail(item);
      } catch (error) {
        console.error(error);
        showError("Could not open record.");
      }
    });
  });
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".nav-btn");
    if (!btn) return;
    if (!state.youngPersonId) {
      showError("Select a young person first.");
      return;
    }
    state.currentView = btn.dataset.view;
    loadCurrentView();
  });

  els.refreshBtn.addEventListener("click", () => {
    if (!state.youngPersonId) {
      loadYoungPersonSelector();
      return;
    }
    loadYoungPerson().then(loadCurrentView).catch((error) => {
      console.error(error);
      showError(error.message || "Failed to refresh.");
    });
  });

  els.selectorRefreshBtn.addEventListener("click", loadYoungPersonSelector);
  els.selectorSearch.addEventListener("input", filterSelectorList);

  els.selectorList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open-young-person]");
    if (!btn) return;
    const id = Number(btn.dataset.openYoungPerson);
    if (id) openYoungPerson(id);
  });

  els.changePersonBtn.addEventListener("click", () => {
    state.youngPersonId = null;
    state.youngPerson = null;
    state.timelineCache = [];
    state.calendarMonthSummary = [];
    state.selectedDayRecords = [];
    closeDrawer();
    closeModal();
    closeDocumentModal();

    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
    window.history.replaceState({}, "", url.toString());
    loadYoungPersonSelector();
  });

  els.quickActions.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === "daily-note") openRecordModal("daily_note", "create");
    if (action === "incident") openRecordModal("incident", "create");
    if (action === "risk") openRecordModal("risk", "create");
    if (action === "plan") openRecordModal("support_plan", "create");
  });

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);

  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType) return;
    if (!RECORD_CONFIG[state.activeRecordType]) {
      showError("This record type cannot be edited from the workspace yet.");
      return;
    }
    openRecordModal(state.activeRecordType, "edit", state.activeRecordItem);
  });

  els.drawerSubmitBtn?.addEventListener("click", () => runDrawerWorkflow("submit"));
  els.drawerApproveBtn?.addEventListener("click", () => runDrawerWorkflow("approve"));
  els.drawerReturnBtn?.addEventListener("click", () => runDrawerWorkflow("return"));
  els.drawerArchiveBtn?.addEventListener("click", () => runDrawerWorkflow("archive"));

  els.closeModalBtn?.addEventListener("click", closeModal);
  els.modalCancelBtn?.addEventListener("click", closeModal);
  els.modalBackdrop?.addEventListener("click", closeModal);
  els.modalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  els.documentModalCloseBtn?.addEventListener("click", closeDocumentModal);
  els.documentModalCancelBtn?.addEventListener("click", closeDocumentModal);
  els.documentModalBackdrop?.addEventListener("click", closeDocumentModal);
  els.documentModalSaveBtn?.addEventListener("click", handleDocumentSave);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeModal();
      closeDocumentModal();
    }
  });
}

async function init() {
  state.youngPersonId = getYoungPersonId();
  bindEvents();

  if (!state.youngPersonId) {
    await loadYoungPersonSelector();
    return;
  }

  try {
    hideSelectorMode();
    await loadYoungPerson();
    await loadCurrentView();
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young person.");
    await loadYoungPersonSelector();
  }
}

init();

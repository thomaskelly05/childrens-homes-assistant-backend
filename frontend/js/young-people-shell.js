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
  assistantTitle: document.getElementById("assistantTitle"),
  assistantSubtitle: document.getElementById("assistantSubtitle"),
  assistantContext: document.getElementById("assistantContext"),
  assistantMessages: document.getElementById("assistantMessages"),
  assistantForm: document.getElementById("assistantForm"),
  assistantInput: document.getElementById("assistantInput"),
  assistantSendBtn: document.getElementById("assistantSendBtn"),
  assistantClearBtn: document.getElementById("assistantClearBtn"),
  assistantSuggestions: document.getElementById("assistantSuggestions"),
};

const VIEW_CONFIG = {
  home: { title: "Home", subtitle: "What staff need first", loader: loadHome },
  profile: { title: "Profile", subtitle: "Identity, communication, legal and contact information", loader: loadProfile },
  calendar: { title: "Calendar", subtitle: "All records, appointments and alerts by day", loader: loadCalendarView },
  timeline: { title: "What happened", subtitle: "Chronology across all records", loader: loadTimeline },
  handover: { title: "Handover", subtitle: "What the next staff need to know", loader: loadHandover },
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
    subtitle: "Support, care and placement guidance",
    loader: () => loadRecordList(RECORD_CONFIG.support_plan.listUrl(state.youngPersonId), "Plans"),
  },
  appointments: {
    title: "Appointments",
    subtitle: "Appointments, reminders and linked plans",
    loader: loadAppointments,
  },
  health: { title: "Health", subtitle: "Health profile, records and medication", loader: loadHealth },
  education: { title: "Education", subtitle: "Education profile and records", loader: loadEducation },
  family: { title: "Family", subtitle: "Family and contact records", loader: loadFamily },
  keywork: {
    title: "Keywork",
    subtitle: "Keywork sessions",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/keywork`, "Keywork"),
  },
  compliance: {
    title: "Compliance",
    subtitle: "Checks, gaps, deadlines and evidence readiness",
    loader: loadCompliance,
  },
  reports: {
    title: "Reports",
    subtitle: "Reports, evidence links and inspection outputs",
    loader: loadReports,
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
  appointment: {
    label: "Appointment",
    listUrl: (youngPersonId) => `/young-people/${youngPersonId}/appointments`,
    createUrl: (youngPersonId) => `/young-people/${youngPersonId}/appointments`,
    detailUrl: (id) => `/young-people/appointments/${id}`,
    updateUrl: (id) => `/young-people/appointments/${id}`,
    updateMethod: "PATCH",
    completeUrl: (id) => `/young-people/appointments/${id}/complete`,
    cancelUrl: (id) => `/young-people/appointments/${id}/cancel`,
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
  if (["approved", "active", "recorded", "low", "completed", "ok", "scheduled"].includes(v)) return "success";
  if (["submitted", "pending", "medium", "due_soon", "draft"].includes(v)) return "warning";
  if (["returned", "high", "critical", "archived", "overdue", "cancelled"].includes(v)) return "danger";
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
    keywork_session: `/young-people/keywork/${id}`,
    report: `/young-people/reports/${id}`,
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
    "report_text",
  ]);

  return Object.entries(data || {})
    .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== "" && value !== undefined)
    .map(([key, value]) => ({
      key: key.replaceAll("_", " "),
      value: typeof value === "object" ? JSON.stringify(value, null, 2) : String(value),
    }));
}

function renderDocumentHint(recordType) {
  const hints = {
    daily_note: {
      title: "Daily note guidance",
      text: "Write clearly, chronologically and therapeutically. Show what happened, how the young person presented, their voice, what helped, and what adults need next.",
    },
    incident: {
      title: "Incident guidance",
      text: "Keep this child-focused and factual. Describe the concern, context, de-escalation used, impact, safeguarding significance, and what needs to happen next.",
    },
    risk: {
      title: "Risk assessment guidance",
      text: "Write this as a living landscape risk assessment. Focus on triggers, meaning behind behaviour, protective factors, PACE-informed staff responses and practical controls.",
    },
    support_plan: {
      title: "Plan guidance",
      text: "This should read like a therapeutic support, placement or care plan. Keep the young person at the centre, explain what adults need to understand, and give kind, practical guidance.",
    },
    appointment: {
      title: "Appointment guidance",
      text: "Record the purpose, child voice, emotional meaning, preparation needed, who is attending, links to plans, and follow-up actions for staff afterwards.",
    },
  };

  const hint = hints[recordType];
  if (!hint) return "";
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(hint.title)}</h3>
          <p class="panel-subtitle">PACE-informed, quality-led recording.</p>
        </div>
      </div>
      <div class="record-body">${escapeHtml(hint.text)}</div>
      ${renderBadges(["PACE", "quality_standards", "ofsted_ready"])}
    </section>
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
  els.assistantModal.setAttribute("aria-hidden", "false");
}

function closeAssistant() {
  els.assistantModal.classList.add("hidden");
  els.assistantBackdrop.classList.add("hidden");
  els.assistantModal.setAttribute("aria-hidden", "true");
}

function toggleAssistantLauncher() {
  if (state.youngPersonId) {
    els.assistantLauncher?.classList.remove("hidden");
  } else {
    els.assistantLauncher?.classList.add("hidden");
  }
}

function assistantContextSummary() {
  if (!state.youngPerson) return "No young person selected.";
  const fullName =
    [state.youngPerson.first_name, state.youngPerson.last_name].filter(Boolean).join(" ").trim() ||
    state.youngPerson.preferred_name ||
    "Young Person";

  const parts = [
    `Young person: ${fullName}`,
    state.youngPerson.preferred_name ? `Preferred name: ${state.youngPerson.preferred_name}` : null,
    state.youngPerson.placement_status ? `Placement status: ${state.youngPerson.placement_status}` : null,
    state.youngPerson.summary_risk_level ? `Risk level: ${state.youngPerson.summary_risk_level}` : null,
    `Current view: ${state.currentView.replaceAll("-", " ")}`,
  ].filter(Boolean);

  return parts.join(" • ");
}

function updateAssistantContext() {
  if (els.assistantContext) {
    els.assistantContext.textContent = assistantContextSummary();
  }
}

function renderAssistantMessages() {
  if (!els.assistantMessages) return;

  const base = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">
        Ask a question about this young person. The assistant can help with handovers, reports, planning, risks, appointments, evidence and Ofsted preparation.
      </div>
    </article>
  `;

  const messagesHtml = state.assistantMessages.map((message) => `
    <article class="assistant-message assistant-message-${escapeHtml(message.role)}">
      <div class="assistant-message-role">${escapeHtml(message.role === "user" ? "You" : "Assistant")}</div>
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

    const payload = {
      message: trimmed,
      context: {
        scope: "young_person",
        young_person_id: state.youngPersonId,
        current_view: state.currentView,
        young_person_name: els.personName?.textContent || "",
      },
    };

    let replyText = "";

    try {
      const response = await apiSend("/chat", "POST", payload);
      replyText =
        response.reply ||
        response.message ||
        response.answer ||
        response.output_text ||
        response.text ||
        "";
    } catch (_) {
      replyText = "";
    }

    if (!replyText) {
      replyText = "The assistant route is connected, but no reply text came back yet. The launcher and young person context are now in place. Next step is wiring the backend assistant response shape to this shell.";
    }

    pushAssistantMessage("assistant", replyText);
  } catch (error) {
    console.error(error);
    pushAssistantMessage("assistant", error.message || "The assistant could not answer right now.");
  } finally {
    els.assistantSendBtn.disabled = false;
  }
}

function buildFormField(field) {
  const common = `<label class="form-label" for="${field.name}">${escapeHtml(field.label)}</label>`;

  if (field.type === "textarea") {
    return `
      <div class="form-field ${field.full ? "full" : ""}">
        ${common}
        <textarea
          id="${field.name}"
          name="${field.name}"
          class="textarea-input"
          placeholder="${escapeHtml(field.placeholder || "")}"
        >${escapeHtml(field.value || "")}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="form-field ${field.full ? "full" : ""}">
        ${common}
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
      ${common}
      <input
        id="${field.name}"
        name="${field.name}"
        type="${field.type || "text"}"
        class="text-input"
        placeholder="${escapeHtml(field.placeholder || "")}"
        value="${escapeHtml(field.value || "")}"
      />
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
      { name: "mood", label: "Mood", type: "text", value: item?.mood || "" },
      { name: "presentation", label: "Presentation", type: "textarea", full: true, value: item?.presentation || "" },
      { name: "activities", label: "Activities", type: "textarea", full: true, value: item?.activities || "" },
      { name: "behaviour_update", label: "Behaviour update", type: "textarea", full: true, value: item?.behaviour_update || "" },
      { name: "young_person_voice", label: "Young person voice", type: "textarea", full: true, value: item?.young_person_voice || item?.child_voice || "" },
      { name: "positives", label: "Positives", type: "textarea", full: true, value: item?.positives || "" },
      { name: "actions_required", label: "Actions required", type: "textarea", full: true, value: item?.actions_required || "" },
    ];
  }

  if (recordType === "incident") {
    return [
      {
        name: "incident_datetime",
        label: "Incident time",
        type: "datetime-local",
        value: item?.incident_datetime
          ? item.incident_datetime.slice(0, 16)
          : (item?.occurred_at ? String(item.occurred_at).slice(0, 16) : ""),
      },
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
      { name: "location", label: "Location", type: "text", value: item?.location || "" },
      { name: "description", label: "Description", type: "textarea", full: true, value: item?.description || item?.narrative || "" },
      { name: "antecedent", label: "Antecedent", type: "textarea", full: true, value: item?.antecedent || "" },
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
      { name: "concern_summary", label: "Concern summary", type: "textarea", full: true, value: item?.concern_summary || item?.formulation || "" },
      { name: "known_triggers", label: "Known triggers", type: "textarea", full: true, value: item?.known_triggers || "" },
      { name: "current_controls", label: "Current controls", type: "textarea", full: true, value: item?.current_controls || item?.staff_guidance || "" },
      { name: "response_actions", label: "Response actions", type: "textarea", full: true, value: item?.response_actions || "" },
    ];
  }

  if (recordType === "appointment") {
    return [
      { name: "title", label: "Appointment title", type: "text", value: item?.title || "" },
      {
        name: "appointment_type",
        label: "Appointment type",
        type: "select",
        value: item?.appointment_type || "general",
        options: [
          { value: "general", label: "General" },
          { value: "health", label: "Health" },
          { value: "education", label: "Education" },
          { value: "family", label: "Family" },
          { value: "therapy", label: "Therapy" },
          { value: "review", label: "Review" },
        ],
      },
      {
        name: "appointment_date",
        label: "Appointment date and time",
        type: "datetime-local",
        value: item?.appointment_date ? toDateTimeLocalValue(item.appointment_date) : "",
      },
      {
        name: "end_datetime",
        label: "End time",
        type: "datetime-local",
        value: item?.end_datetime ? toDateTimeLocalValue(item.end_datetime) : "",
      },
      { name: "location", label: "Location", type: "text", value: item?.location || "" },
      { name: "professional_name", label: "Professional name", type: "text", value: item?.professional_name || "" },
      { name: "professional_role", label: "Professional role", type: "text", value: item?.professional_role || "" },
      { name: "linked_plan_id", label: "Linked plan id", type: "number", value: item?.linked_plan_id || "" },
      { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
      { name: "purpose", label: "Purpose", type: "textarea", full: true, value: item?.purpose || "" },
      { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
      { name: "preparation_notes", label: "Preparation notes", type: "textarea", full: true, value: item?.preparation_notes || "" },
      { name: "outcome_notes", label: "Outcome notes", type: "textarea", full: true, value: item?.outcome_notes || "" },
      { name: "follow_up_actions", label: "Follow-up actions", type: "textarea", full: true, value: item?.follow_up_actions || "" },
      { name: "reminder_minutes_before", label: "Reminder minutes before", type: "number", value: item?.reminder_minutes_before ?? 30 },
      {
        name: "status",
        label: "Status",
        type: "select",
        value: item?.status || "scheduled",
        options: [
          { value: "scheduled", label: "Scheduled" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
    ];
  }

  return [
    { name: "plan_type", label: "Plan type", type: "text", value: item?.plan_type || "support_plan" },
    { name: "title", label: "Title", type: "text", value: item?.title || "" },
    { name: "review_date", label: "Review date", type: "date", value: item?.review_date || today },
    { name: "presenting_need", label: "Presenting need", type: "textarea", full: true, value: item?.presenting_need || item?.formulation || "" },
    { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
    { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
    { name: "proactive_strategies", label: "Proactive strategies", type: "textarea", full: true, value: item?.proactive_strategies || item?.staff_guidance || "" },
    { name: "triggers", label: "Triggers", type: "textarea", full: true, value: item?.triggers || "" },
    { name: "protective_factors", label: "Protective factors", type: "textarea", full: true, value: item?.protective_factors || "" },
  ];
}

function openRecordModal(recordType, mode = "create", item = null) {
  state.modalRecordType = recordType;
  state.modalMode = mode;
  state.modalEditItem = item;

  const config = RECORD_CONFIG[recordType] || RECORD_CONFIG.support_plan;
  const label = config.label || "Record";

  els.modalTitle.textContent = mode === "edit" ? `Edit ${label}` : `Add ${label}`;
  els.modalSubtitle.textContent = mode === "edit"
    ? "Full-screen therapeutic document editing"
    : "Complete this document in full-screen";

  els.modalSaveBtn.textContent = mode === "edit" ? "Save changes" : "Save";

  const schema = getModalSchema(recordType, item);
  els.modalFields.innerHTML = `
    ${renderDocumentHint(recordType)}
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(label)} document</h3>
          <p class="panel-subtitle">Child-focused, therapeutically written, linked to standards and inspection readiness.</p>
        </div>
      </div>
      <div class="form-grid">
        ${schema.map(buildFormField).join("")}
      </div>
    </section>
  `;
  openModal();
}

function serialiseValue(key, value) {
  if (value === "") return null;
  if (["linked_plan_id", "reminder_minutes_before"].includes(key)) {
    return value === null ? null : Number(value);
  }
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
      await apiSend(
        config.updateUrl(state.modalEditItem.id),
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

    closeModal();
    await loadCurrentView();
  } catch (error) {
    console.error(error);
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
  const method = "POST";

  if (type === "appointment") {
    if (action === "submit") {
      showError("Appointments do not use submit.");
      return;
    }
    if (action === "approve") url = config.completeUrl?.(id);
    if (action === "return") url = config.cancelUrl?.(id);
    if (action === "archive") {
      showError("Appointments do not use archive.");
      return;
    }
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
    await apiSend(url, method, body);
    showMessage(`${config.label} ${action}ed.`);
    await loadCurrentView();
    closeDrawer();
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

  openDrawer();

  if (shouldShowDrawerActions(type)) {
    els.drawerActions.classList.remove("hidden");
  } else {
    els.drawerActions.classList.add("hidden");
  }

  if (type === "appointment") {
    els.drawerApproveBtn.textContent = "Complete";
    els.drawerReturnBtn.textContent = "Cancel";
  } else {
    els.drawerApproveBtn.textContent = "Approve";
    els.drawerReturnBtn.textContent = "Return";
  }

  els.drawerTitle.textContent = item.title || "Record details";
  els.drawerSubtitle.textContent = "Loading record...";
  els.drawerBody.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading record details...</p>
    </div>
  `;

  try {
    const data = await apiGet(url);
    const detailData =
      data?.daily_note ||
      data?.incident ||
      data?.risk ||
      data?.support_plan ||
      data?.appointment ||
      data?.health_record ||
      data?.medication_profile ||
      data?.medication_record ||
      data?.education_record ||
      data?.family_contact_record ||
      data?.contact ||
      data?.keywork ||
      data?.report ||
      data;

    const entries = normaliseDetailEntries(detailData);

    els.drawerTitle.textContent = item.title || detailData.title || "Record details";
    els.drawerSubtitle.textContent =
      `${String(item.record_type || item.event_type || item.category || "record").replaceAll("_", " ")} • ${formatDate(item.recorded_at || item.occurred_at || item.event_datetime || detailData.created_at)}`;

    els.drawerBody.innerHTML = `
      ${renderDocumentHint(type)}
      <div class="detail-section">
        <h4>Summary</h4>
        <div class="detail-list">
          <div class="detail-row">
            <div class="detail-key">Title</div>
            <div class="detail-value">${escapeHtml(item.title || detailData.title || "—")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-key">Recorded at</div>
            <div class="detail-value">${escapeHtml(formatDate(item.recorded_at || item.occurred_at || item.event_datetime || detailData.created_at || detailData.updated_at || detailData.appointment_date))}</div>
          </div>
          <div class="detail-row">
            <div class="detail-key">Recorded by</div>
            <div class="detail-value">${escapeHtml(item.recorded_by_name || item.author_name || item.created_by_name || item.worker_name || detailData.created_by_name || detailData.owner_name || "Unknown")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-key">Status</div>
            <div class="detail-value">${escapeHtml(item.workflow_status || detailData.workflow_status || detailData.status || detailData.approval_status || "—")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-key">Summary</div>
            <div class="detail-value">${escapeHtml(item.summary || item.narrative || detailData.summary || detailData.description || detailData.concern_summary || detailData.report_text || "—")}</div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Details</h4>
        <div class="detail-list">
          ${
            entries.length
              ? entries.map((entry) => `
                  <div class="detail-row">
                    <div class="detail-key">${escapeHtml(entry.key)}</div>
                    <div class="detail-value">${escapeHtml(entry.value)}</div>
                  </div>
                `).join("")
              : `<div class="detail-row"><div class="detail-key">Details</div><div class="detail-value">No additional details.</div></div>`
          }
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    els.drawerSubtitle.textContent = "Could not load record";
    els.drawerBody.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load record details.")}</p>
      </div>
    `;
  }
}

function renderRecordCard(item) {
  const title = item.title || item.topic || item.contact_person || item.record_type || "Record";
  const summary = item.summary || item.narrative || item.description || item.concern_summary || "No summary available.";

  const meta = [
    item.occurred_at ? formatDate(item.occurred_at) : null,
    item.session_date ? formatDate(item.session_date) : null,
    item.recorded_at ? formatDate(item.recorded_at) : null,
    item.appointment_date ? formatDate(item.appointment_date) : null,
    item.worker_name || null,
    item.author_name || null,
    item.created_by_name || null,
    item.owner_name || null,
    item.professional_name || null,
  ].filter(Boolean);

  const badges = [
    item.workflow_status,
    item.severity,
    item.status,
    item.approval_status,
    item.compliance_status,
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
        <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button>
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
        <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button>
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
        <div><h3>${escapeHtml(title)}</h3></div>
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
        <div><h4>${escapeHtml(title)}</h4></div>
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
  updateAssistantContext();
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
  toggleAssistantLauncher();
  updateAssistantContext();
}

function hideSelectorMode() {
  els.selectorPanel.classList.add("hidden");
  els.workspacePanel.classList.remove("hidden");
  els.refreshBtn.classList.remove("hidden");
  els.quickActions.classList.remove("hidden");
  toggleAssistantLauncher();
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
  toggleAssistantLauncher();
  updateAssistantContext();
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

  const [overviewData, timelineData, plansData, riskData, appointmentsData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=50`),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/risk`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
  ]);

  const yp = overviewData.young_person || {};
  const counts = overviewData.dashboard_counts || {};
  const alerts = overviewData.alerts || [];
  const recent = (timelineData.timeline || []).slice(0, 12);
  const plans = (plansData.items || []).slice(0, 3);
  const risks = (riskData.items || []).slice(0, 3);
  const appointments = (appointmentsData.items || []).slice(0, 3);

  state.timelineCache = timelineData.timeline || [];

  els.content.innerHTML = `
    <div class="grid grid-4">
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
      <div class="stat-card">
        <div class="stat-label">Upcoming appointments</div>
        <div class="stat-value">${escapeHtml(String(appointments.length))}</div>
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
        <div class="panel-header"><div><h3>Upcoming appointments</h3><p class="panel-subtitle">Appointments linked to care and planning.</p></div></div>
        ${appointments.length ? `<div class="record-list">${appointments.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No upcoming appointments.</div>`}
      </div>
    </div>

    <div class="callout-grid">
      <div class="panel">
        <div class="panel-header"><div><h3>Plans</h3><p class="panel-subtitle">Current plans staff may need to follow.</p></div></div>
        ${plans.length ? `<div class="record-list">${plans.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No current plans.</div>`}
      </div>

      <div class="panel">
        <div class="panel-header"><div><h3>Recent activity</h3><p class="panel-subtitle">Recent chronology across the record.</p></div></div>
        ${recent.length ? renderGroupedTimelineFromItems(recent) : `<div class="empty-state">No recent activity.</div>`}
      </div>
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
          <button id="generateHandoverBtn" class="primary-btn" type="button">Generate handover</button>
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

async function loadAppointments() {
  setLoading("Loading appointments...");

  const appointmentsData = await apiGet(`/young-people/${state.youngPersonId}/appointments`);
  const appointments = appointmentsData.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Appointments</h3>
          <p class="panel-subtitle">Each appointment should connect to the most relevant plan and support follow-up.</p>
        </div>
        <div class="day-record-actions">
          <button id="addAppointmentBtn" class="primary-btn" type="button">Add appointment</button>
        </div>
      </div>
      <div class="helper-note">Use appointments for reviews, health appointments, education meetings, therapy and family time. Keep them linked to plans wherever possible.</div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Current appointments</h3>
          <p class="panel-subtitle">Scheduled, completed and cancelled appointments.</p>
        </div>
      </div>
      ${
        appointments.length
          ? `<div class="record-list">${appointments.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No appointments recorded.</div>`
      }
    </div>
  `;

  document.getElementById("addAppointmentBtn")?.addEventListener("click", () => {
    openRecordModal("appointment", "create");
  });

  bindDynamicOpenRecordButtons();
}

async function loadCompliance() {
  setLoading("Loading compliance...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/compliance`);
  const items = data.compliance_items || data.items || [];

  const overdue = items.filter((x) => x.compliance_status === "overdue").length;
  const dueSoon = items.filter((x) => x.compliance_status === "due_soon").length;
  const ok = items.filter((x) => !x.compliance_status || x.compliance_status === "ok").length;

  els.content.innerHTML = `
    <div class="grid grid-3">
      <div class="stat-card">
        <div class="stat-label">Overdue</div>
        <div class="stat-value">${overdue}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Due soon</div>
        <div class="stat-value">${dueSoon}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">OK</div>
        <div class="stat-value">${ok}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Compliance items</h3>
          <p class="panel-subtitle">Deadlines and evidence readiness for this young person.</p>
        </div>
      </div>
      ${
        items.length
          ? `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No compliance items found.</div>`
      }
    </div>
  `;

  bindDynamicOpenRecordButtons();
}

async function loadReports() {
  setLoading("Loading reports...");

  const reportsData = await apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] }));
  const reports = reportsData.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Reports</h3>
          <p class="panel-subtitle">Linked outputs, evidence-led summaries and inspection-ready documents.</p>
        </div>
      </div>
      ${
        reports.length
          ? `<div class="record-list">${reports.map((report) => renderRecordCard({ ...report, record_type: "report", summary: report.report_text || report.summary || "Report ready." })).join("")}</div>`
          : `<div class="empty-state">No reports have been generated yet.</div>`
      }
    </div>
  `;

  bindDynamicOpenRecordButtons();
}

async function loadCalendarMonthSummary() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth() + 1;
  const data = await apiGet(`/young-people/${state.youngPersonId}/calendar-summary?year=${year}&month=${month}`);
  state.calendarMonthSummary = data.days || data.items || [];
}

async function loadSelectedDayRecords() {
  const data = await apiGet(`/young-people/${state.youngPersonId}/records-by-date?date=${state.selectedDate}`);
  state.selectedDayRecords = data.items || [];
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
        type="button"
      >
        <div class="calendar-day-number">${day.getDate()}</div>
        <div class="calendar-day-markers">
          ${markers.slice(0, 8).map((type) => `<span class="calendar-marker marker-${escapeHtml(type)}"></span>`).join("")}
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
    const recordedAt = item.recorded_at || item.occurred_at || item.event_datetime || item.created_at || item.appointment_date;

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
          <div>${renderBadges([item.workflow_status, item.severity || item.significance, item.status])}</div>
        </div>
        <div class="day-record-summary">${escapeHtml(summary)}</div>
        <div class="day-record-actions">
          <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button>
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
  try {
    await Promise.all([loadCalendarMonthSummary(), loadSelectedDayRecords()]);
    renderCalendarView();
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load calendar.");
    setEmpty("Unable to load calendar.");
  }
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
            <button class="calendar-icon-btn" id="calendarPrevBtn" type="button">←</button>
            <button class="calendar-icon-btn" id="calendarTodayBtn" type="button">Today</button>
            <button class="calendar-icon-btn" id="calendarNextBtn" type="button">→</button>
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
            <p class="panel-subtitle">Everything recorded on this day, including appointments and alerts.</p>
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
            <option value="appointment">Appointments</option>
            <option value="alert">Alerts</option>
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
        item.title,
        item.summary,
        item.narrative,
        item.description,
        item.record_type,
        item.event_type,
        item.category,
        item.recorded_by_name,
        item.author_name,
        item.created_by_name,
        item.worker_name,
        item.professional_name,
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

function bindAssistantEvents() {
  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    state.assistantMessages = [];
    renderAssistantMessages();
    els.assistantInput.value = "";
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = els.assistantInput.value;
    els.assistantInput.value = "";
    await askAssistant(value);
  });

  els.assistantSuggestions?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-prompt]");
    if (!btn) return;
    const prompt = btn.dataset.prompt || "";
    els.assistantInput.value = prompt;
    await askAssistant(prompt);
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
    state.assistantMessages = [];
    closeDrawer();
    closeModal();
    closeAssistant();

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

  els.closeDrawerBtn.addEventListener("click", closeDrawer);
  els.drawerBackdrop.addEventListener("click", closeDrawer);

  els.drawerEditBtn.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType) return;
    if (!RECORD_CONFIG[state.activeRecordType]) {
      showError("This record type cannot be edited from the workspace yet.");
      return;
    }
    openRecordModal(state.activeRecordType, "edit", state.activeRecordItem);
  });

  els.drawerSubmitBtn.addEventListener("click", () => runDrawerWorkflow("submit"));
  els.drawerApproveBtn.addEventListener("click", () => runDrawerWorkflow("approve"));
  els.drawerReturnBtn.addEventListener("click", () => runDrawerWorkflow("return"));
  els.drawerArchiveBtn.addEventListener("click", () => runDrawerWorkflow("archive"));

  els.closeModalBtn.addEventListener("click", closeModal);
  els.modalCancelBtn.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", closeModal);
  els.modalForm.addEventListener("submit", handleModalSubmit);

  bindAssistantEvents();

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
  toggleAssistantLauncher();
  updateAssistantContext();

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

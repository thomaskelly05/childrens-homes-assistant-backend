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
  alertsBtn: document.getElementById("alertsBtn"),
  workflowStrip: document.getElementById("workflowStrip"),
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
    subtitle: "What matters now, what has changed, and what adults need next",
    loader: loadHome,
    showQuickActions: true,
    showWorkflow: false,
  },
  write: {
    title: "Write",
    subtitle: "Create clear, child-focused records with guided prompts",
    loader: loadWriteHub,
    showQuickActions: true,
    showWorkflow: true,
  },
  timeline: {
    title: "Timeline",
    subtitle: "Chronology across all records, patterns, child voice and linked evidence",
    loader: loadTimeline,
    showQuickActions: false,
    showWorkflow: false,
  },
  actions: {
    title: "Actions",
    subtitle: "What is due, what is returned, and what needs attention",
    loader: loadActionsView,
    showQuickActions: false,
    showWorkflow: false,
  },
  reports: {
    title: "Reports",
    subtitle: "Summaries, evidence links and inspection outputs",
    loader: loadReports,
    showQuickActions: false,
    showWorkflow: false,
  },
  profile: {
    title: "Profile & settings",
    subtitle: "Identity, communication, legal status, relationships and everyday guidance",
    loader: loadProfile,
    showQuickActions: false,
    showWorkflow: false,
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

function monthName(date) {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
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

function normaliseRecordType(item) {
  const raw = String(item.record_type || item.event_type || item.category || "").toLowerCase();
  if (raw === "plan") return "support_plan";
  if (raw === "risk_assessment") return "risk";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
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

function normaliseDetailEntries(data) {
  const skipKeys = new Set(["id", "record_id", "young_person_id", "created_at", "updated_at", "title", "summary", "narrative", "report_text"]);
  return Object.entries(data || {})
    .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== "" && value !== undefined)
    .map(([key, value]) => ({
      key: key.replaceAll("_", " "),
      value: typeof value === "object" ? JSON.stringify(value, null, 2) : String(value),
    }));
}

function recordSummary(item) {
  return item.summary || item.narrative || item.description || item.concern_summary || item.outcome || "No summary available.";
}

function renderRecordCard(item) {
  const title = item.title || item.topic || item.contact_person || item.record_type || "Record";
  const meta = [
    item.recorded_at ? formatDate(item.recorded_at) : null,
    item.occurred_at ? formatDate(item.occurred_at) : null,
    item.event_datetime ? formatDate(item.event_datetime) : null,
    item.appointment_date ? formatDate(item.appointment_date) : null,
    item.created_at ? formatDate(item.created_at) : null,
    item.author_name || item.created_by_name || item.owner_name || item.worker_name || item.professional_name || null,
  ].filter(Boolean);

  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <div class="record-meta">${escapeHtml(meta.join(" • ") || "Record")}</div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(recordSummary(item))}</div>
      ${renderBadges([item.workflow_status, item.severity, item.status, item.approval_status])}
      <div class="day-record-actions">
        <button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button>
      </div>
    </article>
  `;
}

function renderProfileSection(title, rows = []) {
  return `
    <section class="panel">
      <div class="panel-header"><div><h3>${escapeHtml(title)}</h3></div></div>
      <div class="kv">
        ${rows.map((row) => `
          <div class="kv-key">${escapeHtml(row.label)}</div>
          <div>${escapeHtml(row.value || "—")}</div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWorkflowStrip(step = "Draft") {
  if (!els.workflowStrip) return;
  const steps = Array.from(els.workflowStrip.querySelectorAll(".workflow-step"));
  const order = ["Draft", "Check", "AI review", "Submit", "Manager review", "Signed off"];
  const idx = Math.max(order.indexOf(step), 0);
  steps.forEach((el, i) => {
    el.classList.toggle("active", i <= idx);
  });
}

function updateHeaderForView(view) {
  const config = VIEW_CONFIG[view];
  if (!config) return;
  els.pageTitle.textContent = config.title;
  els.pageSubtitle.textContent = config.subtitle;
  els.quickActions.classList.toggle("hidden", !config.showQuickActions);
  els.workflowStrip.classList.toggle("hidden", !config.showWorkflow);
  renderWorkflowStrip(config.showWorkflow ? "Draft" : "Draft");
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
  toggleAssistantLauncher();
}

function assistantPromptsForView(view) {
  const defaults = [
    "Give me a short handover for this young person.",
    "Summarise current risks and what helps.",
    "What are the key patterns in recent incidents and daily notes?",
    "What evidence would support Ofsted for this young person right now?",
  ];
  const byView = {
    actions: [
      "What is due soon for this young person?",
      "What needs manager attention right now?",
      "Which records are still drafts or returned?",
    ],
    reports: [
      "What should go into a monthly summary?",
      "What evidence would support Ofsted for this young person right now?",
      "Summarise current progress, risks and actions.",
    ],
    timeline: [
      "Summarise what has changed recently for this young person.",
      "What patterns are visible in recent records?",
    ],
  };
  return byView[view] || defaults;
}

function renderAssistantSuggestionButtons() {
  if (!els.assistantSuggestions) return;
  const prompts = assistantPromptsForView(state.currentView);
  els.assistantSuggestions.innerHTML = prompts.map((prompt) => `
    <button class="secondary-btn assistant-prompt-btn" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>
  `).join("");
}

function assistantContextSummary() {
  if (!state.youngPerson) return "No young person selected.";
  const fullName = [state.youngPerson.first_name, state.youngPerson.last_name].filter(Boolean).join(" ").trim() || state.youngPerson.preferred_name || "Young Person";
  const parts = [
    `Young person: ${fullName}`,
    state.youngPerson.preferred_name ? `Preferred name: ${state.youngPerson.preferred_name}` : null,
    state.youngPerson.placement_status ? `Placement status: ${state.youngPerson.placement_status}` : null,
    state.youngPerson.summary_risk_level ? `Risk level: ${state.youngPerson.summary_risk_level}` : null,
    `Current view: ${state.currentView}`,
  ].filter(Boolean);
  return parts.join(" • ");
}

function updateAssistantContext() {
  if (els.assistantContext) {
    els.assistantContext.textContent = assistantContextSummary();
  }
  renderAssistantSuggestionButtons();
}

function renderAssistantMessages() {
  if (!els.assistantMessages) return;
  const base = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">Ask a question about this young person. The assistant can help with handovers, reports, planning, risks, appointments, evidence and next steps.</div>
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
    const response = await apiSend("/young-people/assistant", "POST", payload);
    const replyText = response.reply || response.message || response.answer || response.output_text || response.text || "No assistant reply returned.";
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
        <textarea id="${field.name}" name="${field.name}" class="textarea-input" placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(field.value || "")}</textarea>
      </div>
    `;
  }
  if (field.type === "select") {
    return `
      <div class="form-field ${field.full ? "full" : ""}">
        ${common}
        <select id="${field.name}" name="${field.name}" class="select-input">
          ${(field.options || []).map((opt) => `
            <option value="${escapeHtml(opt.value)}" ${String(opt.value) === String(field.value || "") ? "selected" : ""}>${escapeHtml(opt.label)}</option>
          `).join("")}
        </select>
      </div>
    `;
  }
  return `
    <div class="form-field ${field.full ? "full" : ""}">
      ${common}
      <input id="${field.name}" name="${field.name}" type="${field.type || "text"}" class="text-input" placeholder="${escapeHtml(field.placeholder || "")}" value="${escapeHtml(field.value || "")}" />
    </div>
  `;
}

function getModalSchema(recordType, item = null) {
  const today = toDateInputValue(new Date());
  if (recordType === "daily_note") {
    return [
      { name: "note_date", label: "Date", type: "date", value: item?.note_date || today },
      { name: "shift_type", label: "Shift type", type: "select", value: item?.shift_type || "day", options: [{ value: "day", label: "Day" }, { value: "evening", label: "Evening" }, { value: "night", label: "Night" }, { value: "waking_night", label: "Waking night" }] },
      { name: "mood", label: "Mood", type: "text", value: item?.mood || "" },
      { name: "presentation", label: "How the child presented", type: "textarea", full: true, value: item?.presentation || "" },
      { name: "activities", label: "What happened during the shift", type: "textarea", full: true, value: item?.activities || "" },
      { name: "behaviour_update", label: "What adults noticed and how they responded", type: "textarea", full: true, value: item?.behaviour_update || "" },
      { name: "young_person_voice", label: "Child voice", type: "textarea", full: true, value: item?.young_person_voice || item?.child_voice || "" },
      { name: "positives", label: "What went well", type: "textarea", full: true, value: item?.positives || "" },
      { name: "actions_required", label: "What adults need next", type: "textarea", full: true, value: item?.actions_required || "" },
    ];
  }
  if (recordType === "incident") {
    return [
      { name: "incident_datetime", label: "Incident time", type: "datetime-local", value: item?.incident_datetime ? String(item.incident_datetime).slice(0, 16) : (item?.occurred_at ? String(item.occurred_at).slice(0, 16) : "") },
      { name: "incident_type", label: "Incident type", type: "text", value: item?.incident_type || "" },
      { name: "severity", label: "Severity", type: "select", value: item?.severity || "medium", options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }] },
      { name: "location", label: "Location", type: "text", value: item?.location || "" },
      { name: "description", label: "What happened", type: "textarea", full: true, value: item?.description || item?.narrative || "" },
      { name: "antecedent", label: "What was happening before", type: "textarea", full: true, value: item?.antecedent || "" },
      { name: "staff_response", label: "What adults noticed and did", type: "textarea", full: true, value: item?.staff_response || "" },
      { name: "child_voice", label: "What the child communicated", type: "textarea", full: true, value: item?.child_voice || "" },
      { name: "outcome", label: "Outcome and what needs to happen next", type: "textarea", full: true, value: item?.outcome || "" },
    ];
  }
  if (recordType === "risk") {
    return [
      { name: "category", label: "Category", type: "text", value: item?.category || "" },
      { name: "title", label: "Title", type: "text", value: item?.title || "" },
      { name: "severity", label: "Severity", type: "select", value: item?.severity || "medium", options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }] },
      { name: "likelihood", label: "Likelihood", type: "select", value: item?.likelihood || "medium", options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }] },
      { name: "review_date", label: "Review date", type: "date", value: item?.review_date || today },
      { name: "concern_summary", label: "Main concern", type: "textarea", full: true, value: item?.concern_summary || item?.formulation || "" },
      { name: "known_triggers", label: "Known triggers or pressures", type: "textarea", full: true, value: item?.known_triggers || "" },
      { name: "current_controls", label: "What helps and what adults should do", type: "textarea", full: true, value: item?.current_controls || item?.staff_guidance || "" },
      { name: "response_actions", label: "What needs to happen next", type: "textarea", full: true, value: item?.response_actions || "" },
    ];
  }
  if (recordType === "appointment") {
    return [
      { name: "title", label: "Appointment title", type: "text", value: item?.title || "" },
      { name: "appointment_type", label: "Appointment type", type: "select", value: item?.appointment_type || "general", options: [{ value: "general", label: "General" }, { value: "health", label: "Health" }, { value: "education", label: "Education" }, { value: "family", label: "Family" }, { value: "therapy", label: "Therapy" }, { value: "review", label: "Review" }] },
      { name: "appointment_date", label: "Appointment date and time", type: "datetime-local", value: item?.appointment_date ? toDateTimeLocalValue(item.appointment_date) : "" },
      { name: "end_datetime", label: "End time", type: "datetime-local", value: item?.end_datetime ? toDateTimeLocalValue(item.end_datetime) : "" },
      { name: "location", label: "Location", type: "text", value: item?.location || "" },
      { name: "professional_name", label: "Professional name", type: "text", value: item?.professional_name || "" },
      { name: "professional_role", label: "Professional role", type: "text", value: item?.professional_role || "" },
      { name: "linked_plan_id", label: "Linked plan id", type: "number", value: item?.linked_plan_id || "" },
      { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
      { name: "purpose", label: "Purpose", type: "textarea", full: true, value: item?.purpose || "" },
      { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
      { name: "preparation_notes", label: "Preparation notes", type: "textarea", full: true, value: item?.preparation_notes || "" },
      { name: "follow_up_actions", label: "Follow-up actions", type: "textarea", full: true, value: item?.follow_up_actions || "" },
      { name: "reminder_minutes_before", label: "Reminder minutes before", type: "number", value: item?.reminder_minutes_before ?? 30 },
    ];
  }
  return [
    { name: "plan_type", label: "Plan type", type: "text", value: item?.plan_type || "support_plan" },
    { name: "title", label: "Title", type: "text", value: item?.title || "" },
    { name: "review_date", label: "Review date", type: "date", value: item?.review_date || today },
    { name: "presenting_need", label: "What adults need to understand", type: "textarea", full: true, value: item?.presenting_need || item?.formulation || "" },
    { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
    { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
    { name: "proactive_strategies", label: "What helps and what adults should do", type: "textarea", full: true, value: item?.proactive_strategies || item?.staff_guidance || "" },
    { name: "triggers", label: "Triggers or pressures", type: "textarea", full: true, value: item?.triggers || "" },
    { name: "protective_factors", label: "Protective factors", type: "textarea", full: true, value: item?.protective_factors || "" },
  ];
}

function renderDocumentHint(recordType) {
  const hints = {
    daily_note: { title: "Daily note guidance", text: "Write clearly and kindly. Show what happened, how the child presented, their voice, what helped, and what adults need next." },
    incident: { title: "Incident guidance", text: "Describe what happened in order, what may have been going on for the child, what adults noticed and did, and what needs to happen next." },
    risk: { title: "Risk guidance", text: "Focus on triggers, pressures, warning signs, what helps, and the practical guidance adults need to follow consistently." },
    support_plan: { title: "Plan guidance", text: "Write this like guidance for adults. Keep the child at the centre and explain what adults need to understand and do." },
    appointment: { title: "Appointment guidance", text: "Record the purpose, child voice, preparation, who is involved, and any follow-up actions for adults afterwards." },
  };
  const hint = hints[recordType];
  if (!hint) return "";
  return `
    <section class="panel">
      <div class="panel-header"><div><h3>${escapeHtml(hint.title)}</h3><p class="panel-subtitle">Use the prompts to keep the record thoughtful, respectful and useful.</p></div></div>
      <div class="record-body">${escapeHtml(hint.text)}</div>
    </section>
  `;
}

function openRecordModal(recordType, mode = "create", item = null) {
  state.modalRecordType = recordType;
  state.modalMode = mode;
  state.modalEditItem = item;
  const config = RECORD_CONFIG[recordType] || RECORD_CONFIG.support_plan;
  const label = config.label || "Record";
  els.modalTitle.textContent = mode === "edit" ? `Edit ${label}` : `Add ${label}`;
  els.modalSubtitle.textContent = mode === "edit" ? "Review and update this record carefully" : "Complete this record using the guided prompts";
  els.modalSaveBtn.textContent = mode === "edit" ? "Save changes" : "Save";
  const schema = getModalSchema(recordType, item);
  els.modalFields.innerHTML = `
    ${renderDocumentHint(recordType)}
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${escapeHtml(label)} form</h3>
          <p class="panel-subtitle">Keep this clear, respectful, child-focused and useful for the next adult.</p>
        </div>
      </div>
      <div class="form-grid">${schema.map(buildFormField).join("")}</div>
    </section>
  `;
  els.modal.classList.remove("hidden");
  els.modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  els.modal.classList.add("hidden");
  els.modalBackdrop.classList.add("hidden");
  state.modalMode = "create";
  state.modalRecordType = null;
  state.modalEditItem = null;
  els.modalFields.innerHTML = "";
}

function openDrawer() {
  els.drawer.classList.remove("hidden");
  els.drawerBackdrop.classList.remove("hidden");
}

function closeDrawer() {
  els.drawer.classList.add("hidden");
  els.drawerBackdrop.classList.add("hidden");
  state.activeRecordItem = null;
  state.activeRecordType = null;
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
  if (state.youngPersonId) els.assistantLauncher?.classList.remove("hidden");
  else els.assistantLauncher?.classList.add("hidden");
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
  if (obj.appointment_date && !obj.start_datetime) obj.start_datetime = obj.appointment_date;
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
  if (!item || !config) return showError("No record selected.");
  const id = item.record_id || item.source_id || item.id;
  if (!id) return showError("This record has no id.");
  let url = null;
  let body = null;
  const method = "POST";
  if (type === "appointment") {
    if (action === "approve") url = config.completeUrl?.(id);
    if (action === "return") url = config.cancelUrl?.(id);
    if (["submit", "archive"].includes(action)) return showError("That action is not used for appointments.");
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
  if (!url) return showError(`No ${action} route is configured for this record.`);
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

function renderLinkedContextSection(detailData, baseItem) {
  const childVoice = detailData.child_voice || detailData.young_person_voice || baseItem.child_voice || baseItem.young_person_voice;
  const nextActions = detailData.actions_required || detailData.response_actions || detailData.follow_up_actions || detailData.action_taken || detailData.outcome_notes || baseItem.actions_required || baseItem.response_actions || "No immediate next actions recorded.";
  return `
    <div class="detail-section">
      <h4>Linked context</h4>
      <div class="detail-list">
        <div class="detail-row"><div class="detail-key">Workflow</div><div class="detail-value">${escapeHtml(baseItem.workflow_status || detailData.workflow_status || detailData.status || "recorded")}</div></div>
        <div class="detail-row"><div class="detail-key">Child voice present</div><div class="detail-value">${escapeHtml(childVoice ? "Yes" : "No")}</div></div>
        <div class="detail-row"><div class="detail-key">What adults need next</div><div class="detail-value">${escapeHtml(nextActions)}</div></div>
      </div>
    </div>
  `;
}

async function openRecordDetail(item) {
  const type = normaliseRecordType(item);
  if (type === "report") {
    return openReportDetail(item);
  }
  const url = getRecordUrl(item);
  if (!url) return showError("This record cannot be opened yet.");

  state.activeRecordItem = item;
  state.activeRecordType = type;
  openDrawer();
  els.drawerActions.classList.toggle("hidden", !RECORD_CONFIG[type]);
  els.drawerApproveBtn.textContent = type === "appointment" ? "Complete" : "Approve";
  els.drawerReturnBtn.textContent = type === "appointment" ? "Cancel" : "Return";
  els.drawerTitle.textContent = item.title || "Record details";
  els.drawerSubtitle.textContent = "Loading record...";
  els.drawerBody.innerHTML = `<div class="loading-state"><div><div class="spinner"></div><p>Loading record details...</p></div></div>`;

  try {
    const data = await apiGet(url);
    const detailData = data?.daily_note || data?.incident || data?.risk || data?.support_plan || data?.appointment || data?.health_record || data?.medication_profile || data?.medication_record || data?.education_record || data?.family_contact_record || data?.contact || data?.keywork || data;
    const entries = normaliseDetailEntries(detailData);
    els.drawerTitle.textContent = item.title || detailData.title || "Record details";
    els.drawerSubtitle.textContent = `${String(item.record_type || item.event_type || item.category || "record").replaceAll("_", " ")} • ${formatDate(item.recorded_at || item.occurred_at || item.event_datetime || detailData.created_at)}`;
    els.drawerBody.innerHTML = `
      ${renderDocumentHint(type)}
      <div class="detail-section">
        <h4>Summary</h4>
        <div class="detail-list">
          <div class="detail-row"><div class="detail-key">Title</div><div class="detail-value">${escapeHtml(item.title || detailData.title || "—")}</div></div>
          <div class="detail-row"><div class="detail-key">Recorded at</div><div class="detail-value">${escapeHtml(formatDate(item.recorded_at || item.occurred_at || item.event_datetime || detailData.created_at || detailData.updated_at || detailData.appointment_date))}</div></div>
          <div class="detail-row"><div class="detail-key">Recorded by</div><div class="detail-value">${escapeHtml(item.recorded_by_name || item.author_name || item.created_by_name || item.worker_name || detailData.created_by_name || detailData.owner_name || "Unknown")}</div></div>
          <div class="detail-row"><div class="detail-key">Summary</div><div class="detail-value">${escapeHtml(recordSummary({ ...item, ...detailData }))}</div></div>
        </div>
      </div>
      ${renderLinkedContextSection(detailData, item)}
      <div class="detail-section">
        <h4>Details</h4>
        <div class="detail-list">
          ${entries.length ? entries.map((entry) => `<div class="detail-row"><div class="detail-key">${escapeHtml(entry.key)}</div><div class="detail-value">${escapeHtml(entry.value)}</div></div>`).join("") : `<div class="detail-row"><div class="detail-key">Details</div><div class="detail-value">No additional details.</div></div>`}
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    els.drawerSubtitle.textContent = "Could not load record";
    els.drawerBody.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message || "Failed to load record details.")}</p></div>`;
  }
}

async function openReportDetail(item) {
  state.activeRecordItem = item;
  state.activeRecordType = "report";
  openDrawer();
  els.drawerActions.classList.add("hidden");
  els.drawerTitle.textContent = item.title || "Report";
  els.drawerSubtitle.textContent = "Loading report...";
  els.drawerBody.innerHTML = `<div class="loading-state"><div><div class="spinner"></div><p>Loading report...</p></div></div>`;
  try {
    const [reportData, linksData] = await Promise.all([
      apiGet(`/young-people/reports/${item.id || item.report_id || item.record_id}`),
      apiGet(`/young-people/reports/${item.id || item.report_id || item.record_id}/links`).catch(() => ({ items: [] })),
    ]);
    const report = reportData?.report || reportData || {};
    const links = linksData?.items || [];
    els.drawerTitle.textContent = report.title || "Report";
    els.drawerSubtitle.textContent = `${String(report.report_type || "report").replaceAll("_", " ")} • ${formatDate(report.created_at)}`;
    els.drawerBody.innerHTML = `
      <div class="detail-section"><h4>Report summary</h4><div class="detail-list">
      <div class="detail-row"><div class="detail-key">Title</div><div class="detail-value">${escapeHtml(report.title || "—")}</div></div>
      <div class="detail-row"><div class="detail-key">Type</div><div class="detail-value">${escapeHtml(report.report_type || "—")}</div></div>
      <div class="detail-row"><div class="detail-key">Status</div><div class="detail-value">${escapeHtml(report.status || "—")}</div></div>
      <div class="detail-row"><div class="detail-key">Created</div><div class="detail-value">${escapeHtml(formatDate(report.created_at))}</div></div>
      </div></div>
      <div class="detail-section"><h4>Report text</h4><div class="detail-value">${escapeHtml(report.report_text || "No report text.")}</div></div>
      <div class="detail-section"><h4>Linked evidence</h4><div class="detail-list">${links.length ? links.map((link) => `<div class="detail-row"><div class="detail-key">${escapeHtml(link.source_table || "source")}</div><div class="detail-value">Source ID: ${escapeHtml(link.source_id || "—")} ${link.link_reason ? `• ${escapeHtml(link.link_reason)}` : ""}</div></div>`).join("") : `<div class="detail-row"><div class="detail-key">Evidence</div><div class="detail-value">No linked evidence.</div></div>`}</div></div>
    `;
  } catch (error) {
    console.error(error);
    els.drawerSubtitle.textContent = "Could not load report";
    els.drawerBody.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message || "Failed to load report.")}</p></div>`;
  }
}

function renderSelectorList(items) {
  if (!items.length) {
    els.selectorList.innerHTML = `<div class="empty-state"><p>No young people found.</p></div>`;
    return;
  }
  els.selectorList.innerHTML = items.map((item) => {
    const name = [item.first_name, item.last_name].filter(Boolean).join(" ").trim() || item.preferred_name || "Young Person";
    const meta = [item.preferred_name ? `Preferred: ${item.preferred_name}` : null, item.placement_status || null, item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : null].filter(Boolean).join(" • ");
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
  if (!term) return renderSelectorList(state.selectorItems);
  const filtered = state.selectorItems.filter((item) => [item.first_name, item.last_name, item.preferred_name, item.placement_status, item.summary_risk_level].filter(Boolean).join(" ").toLowerCase().includes(term));
  renderSelectorList(filtered);
}

async function loadYoungPersonSelector() {
  clearError();
  showSelectorMode();
  els.selectorList.innerHTML = `<div class="loading-state"><div><div class="spinner"></div><p>Loading young people...</p></div></div>`;
  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young people.");
    els.selectorList.innerHTML = `<div class="empty-state"><p>Unable to load young people.</p></div>`;
  }
}

async function loadYoungPerson() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const youngPerson = data.young_person || data.bundle?.young_person || data;
  state.youngPerson = youngPerson;
  const fullName = [youngPerson.first_name, youngPerson.last_name].filter(Boolean).join(" ").trim() || youngPerson.preferred_name || "Young Person";
  const meta = [youngPerson.preferred_name ? `Preferred: ${youngPerson.preferred_name}` : null, youngPerson.placement_status || null, youngPerson.summary_risk_level ? `Risk: ${youngPerson.summary_risk_level}` : null].filter(Boolean).join(" • ");
  els.personName.textContent = fullName;
  els.personMeta.textContent = meta || "Young person record";
  els.personAvatar.textContent = initialsFromName(fullName);
  toggleAssistantLauncher();
  updateAssistantContext();
}

function openYoungPerson(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", String(id));
  url.searchParams.delete("young_person_id");
  window.history.replaceState({}, "", url.toString());
  state.youngPersonId = Number(id);
  state.youngPerson = null;
  state.currentView = "home";
  hideSelectorMode();
  loadYoungPerson().then(loadCurrentView).catch((error) => {
    console.error(error);
    showError(error.message || "Failed to load young person.");
    setEmpty("Unable to load workspace.");
  });
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
  els.content.innerHTML = `
    <div class="callout-grid">
      <div class="record-list">
        ${renderProfileSection("Who this young person is", [
          { label: "Preferred name", value: yp.preferred_name || "—" },
          { label: "Date of birth", value: formatDate(yp.date_of_birth) },
          { label: "Placement status", value: yp.placement_status || "—" },
          { label: "Risk level", value: yp.summary_risk_level || "—" },
        ])}
        ${renderProfileSection("Communication and what helps", [
          { label: "Communication style", value: communication.communication_style || "—" },
          { label: "Sensory profile", value: communication.sensory_profile || "—" },
          { label: "Signs of distress", value: communication.signs_of_distress || "—" },
          { label: "What helps", value: communication.what_helps || "—" },
        ])}
        ${renderProfileSection("Identity and what matters", [
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
          { label: "Consent arrangements", value: legal.consent_arrangements || "—" },
        ])}
        ${renderProfileSection("Education and health", [
          { label: "School", value: education.school_name || "—" },
          { label: "Education status", value: education.education_status || "—" },
          { label: "GP", value: health.gp_name || "—" },
          { label: "Allergies", value: health.allergies || "—" },
        ])}
        <section class="panel">
          <div class="panel-header"><div><h3>Important contacts</h3><p class="panel-subtitle">Adults involved around this child.</p></div></div>
          ${contacts.length ? `<div class="record-list">${contacts.slice(0, 6).map((contact) => `<article class="record-card"><div class="record-card-header"><div><h4>${escapeHtml(contact.full_name || "Contact")}</h4><div class="record-meta">${escapeHtml(contact.relationship_to_young_person || contact.contact_type || "Contact")}</div></div></div><div class="record-body">Phone: ${escapeHtml(contact.phone || "—")} Email: ${escapeHtml(contact.email || "—")}</div></article>`).join("")}</div>` : `<div class="empty-state"><p>No contacts recorded.</p></div>`}
        </section>
      </div>
    </div>
  `;
}

async function loadHome() {
  setLoading("Loading home...");
  const [overviewData, timelineData, appointmentsData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=20`),
    apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
  ]);
  const yp = overviewData.young_person || {};
  const counts = overviewData.dashboard_counts || {};
  const alerts = overviewData.alerts || [];
  const recent = (timelineData.timeline || []).slice(0, 6);
  const appointments = (appointmentsData.items || []).slice(0, 4);
  state.timelineCache = timelineData.timeline || [];
  els.content.innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card"><div class="stat-label">Placement status</div><div class="stat-value">${escapeHtml(yp.placement_status || "—")}</div></div>
      <div class="stat-card"><div class="stat-label">Risk level</div><div class="stat-value">${escapeHtml(yp.summary_risk_level || "—")}</div></div>
      <div class="stat-card"><div class="stat-label">Open alerts</div><div class="stat-value">${alerts.length}</div></div>
      <div class="stat-card"><div class="stat-label">Upcoming appointments</div><div class="stat-value">${appointments.length}</div></div>
    </div>
    <div class="callout-grid">
      <section class="panel">
        <div class="panel-header"><div><h3>What matters now</h3><p class="panel-subtitle">The most important things adults need to know today.</p></div></div>
        ${alerts.length ? `<div class="record-list">${alerts.map((alert) => `<article class="record-card"><div class="record-card-header"><div><h4>${escapeHtml(alert.title || "Alert")}</h4><div class="record-meta">${escapeHtml(alert.alert_type || "Alert")}</div></div></div><div class="record-body">${escapeHtml(alert.description || "No description.")}</div>${renderBadges([alert.severity, alert.is_active ? "active" : null])}</article>`).join("")}</div>` : `<div class="empty-state"><p>No active alerts.</p></div>`}
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>At a glance</h3><p class="panel-subtitle">Useful information for this shift.</p></div></div>
        <div class="record-list">
          <div class="mini-item"><div class="mini-item-title">Daily notes</div><div class="mini-item-subtitle">${escapeHtml(String(counts.daily_notes || 0))} recorded</div></div>
          <div class="mini-item"><div class="mini-item-title">Incidents</div><div class="mini-item-subtitle">${escapeHtml(String(counts.incidents || 0))} recorded</div></div>
          <div class="mini-item"><div class="mini-item-title">Risk assessments</div><div class="mini-item-subtitle">${escapeHtml(String(counts.risk_assessments || 0))} on file</div></div>
          <div class="mini-item"><div class="mini-item-title">Plans</div><div class="mini-item-subtitle">${escapeHtml(String(counts.support_plans || 0))} on file</div></div>
        </div>
      </section>
    </div>
    <div class="callout-grid">
      <section class="panel"><div class="panel-header"><div><h3>Upcoming appointments</h3><p class="panel-subtitle">Appointments linked to care and planning.</p></div></div>${appointments.length ? `<div class="record-list">${appointments.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No upcoming appointments.</p></div>`}</section>
      <section class="panel"><div class="panel-header"><div><h3>Recent chronology</h3><p class="panel-subtitle">Recent recorded activity across the record.</p></div></div>${recent.length ? `<div class="record-list">${recent.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No recent activity.</p></div>`}</section>
    </div>
  `;
  bindDynamicOpenRecordButtons();
}

function renderWriteTile(title, subtitle, action) {
  return `
    <button class="quick-action" type="button" data-action="${escapeHtml(action)}">
      <span class="quick-action-title">${escapeHtml(title)}</span>
      <span class="quick-action-subtitle">${escapeHtml(subtitle)}</span>
    </button>
  `;
}

async function loadWriteHub() {
  els.content.innerHTML = `
    <div class="callout-grid">
      <section class="panel">
        <div class="panel-header"><div><h3>Write a record</h3><p class="panel-subtitle">Choose the kind of record you want to write. Each form uses guided prompts.</p></div></div>
        <div class="quick-actions">
          ${renderWriteTile("Daily note", "Record the shift clearly", "daily-note")}
          ${renderWriteTile("Incident", "Record what happened and what it means", "incident")}
          ${renderWriteTile("Risk update", "Review what helps and what needs to change", "risk")}
          ${renderWriteTile("Plan", "Create practical guidance for adults", "plan")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h3>Shared workflow</h3><p class="panel-subtitle">Every written form follows the same simple path.</p></div></div>
        <div class="record-list">
          <div class="mini-item"><div class="mini-item-title">1. Draft</div><div class="mini-item-subtitle">Write clearly and thoroughly.</div></div>
          <div class="mini-item"><div class="mini-item-title">2. Check</div><div class="mini-item-subtitle">Use the prompts and checklist.</div></div>
          <div class="mini-item"><div class="mini-item-title">3. AI review</div><div class="mini-item-subtitle">Spot gaps, tone and safeguarding concerns.</div></div>
          <div class="mini-item"><div class="mini-item-title">4. Submit</div><div class="mini-item-subtitle">Send for manager review.</div></div>
          <div class="mini-item"><div class="mini-item-title">5. Manager review</div><div class="mini-item-subtitle">Comments, approval or return.</div></div>
          <div class="mini-item"><div class="mini-item-title">6. Signed off</div><div class="mini-item-subtitle">Final approved version.</div></div>
        </div>
      </section>
    </div>
  `;
}

async function loadTimeline() {
  setLoading("Loading timeline...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/timeline?limit=100`);
  const items = data.timeline || [];
  state.timelineCache = items;
  els.content.innerHTML = `
    <section class="panel">
      <div class="panel-header"><div><h3>Timeline</h3><p class="panel-subtitle">Chronology across all records.</p></div></div>
      <div class="record-list">${items.length ? items.map(renderRecordCard).join("") : `<div class="empty-state"><p>No timeline items.</p></div>`}</div>
    </section>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadActionsView() {
  setLoading("Loading actions...");
  const [complianceData, appointmentsData, dailyNotesData, incidentsData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
  ]);
  const complianceItems = complianceData.compliance_items || complianceData.items || [];
  const appointments = appointmentsData.items || [];
  const dueAppointments = appointments.filter((x) => String(x.status || "").toLowerCase() === "scheduled").slice(0, 6);
  const drafts = [...(dailyNotesData.items || []), ...(incidentsData.items || [])].filter((x) => ["draft", "returned", "submitted"].includes(String(x.workflow_status || x.status || x.approval_status || "").toLowerCase())).slice(0, 8);
  els.content.innerHTML = `
    <div class="callout-grid">
      <section class="panel"><div class="panel-header"><div><h3>Due and overdue</h3><p class="panel-subtitle">Checks, reviews and compliance items that need attention.</p></div></div>${complianceItems.length ? `<div class="record-list">${complianceItems.slice(0, 8).map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No due items found.</p></div>`}</section>
      <section class="panel"><div class="panel-header"><div><h3>Records in workflow</h3><p class="panel-subtitle">Drafts, submissions and returned records.</p></div></div>${drafts.length ? `<div class="record-list">${drafts.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No workflow items found.</p></div>`}</section>
    </div>
    <section class="panel"><div class="panel-header"><div><h3>Upcoming appointments</h3><p class="panel-subtitle">Appointments adults need to prepare for.</p></div></div>${dueAppointments.length ? `<div class="record-list">${dueAppointments.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No upcoming appointments.</p></div>`}</section>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadReports() {
  setLoading("Loading reports...");
  const reportsData = await apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] }));
  const reports = reportsData.items || [];
  els.content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div><h3>Summaries and reports</h3><p class="panel-subtitle">Generate evidence-led reports and outputs for this young person.</p></div>
        <div class="day-record-actions">
          <button id="generateHandoverReportBtn" class="primary-btn" type="button">Generate handover summary</button>
          <button id="generateMonthlyReportBtn" class="secondary-btn" type="button">Generate monthly summary</button>
          <button id="generateOfstedReportBtn" class="secondary-btn" type="button">Generate evidence summary</button>
        </div>
      </div>
      ${reports.length ? `<div class="record-list">${reports.map((report) => renderRecordCard({ ...report, record_type: "report", title: report.title || "Report", summary: report.report_text || "Report ready.", workflow_status: report.status, recorded_at: report.created_at })).join("")}</div>` : `<div class="empty-state"><p>No reports have been generated yet.</p></div>`}
    </section>
  `;
  async function generateReport(reportType, title) {
    try {
      showMessage("Generating report...");
      const response = await apiSend(`/young-people/${state.youngPersonId}/reports/generate`, "POST", { report_type: reportType, title });
      showMessage("Report generated.");
      await loadCurrentView();
      const report = response?.report;
      if (report) {
        openRecordDetail({ ...report, record_type: "report", title: report.title || "Report", summary: report.report_text || "Report ready.", workflow_status: report.status, recorded_at: report.created_at });
      }
    } catch (error) {
      console.error(error);
      showError(error.message || "Could not generate report.");
    }
  }
  document.getElementById("generateHandoverReportBtn")?.addEventListener("click", () => generateReport("handover_summary", "Handover Summary"));
  document.getElementById("generateMonthlyReportBtn")?.addEventListener("click", () => generateReport("monthly_summary", "Monthly Summary"));
  document.getElementById("generateOfstedReportBtn")?.addEventListener("click", () => generateReport("ofsted_evidence_summary", "Ofsted Evidence Summary"));
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
      <button class="calendar-day ${isCurrentMonth ? "" : "other-month"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-calendar-date="${dateString}" type="button">
        <div class="calendar-day-number">${day.getDate()}</div>
        <div class="calendar-day-markers">${markers.slice(0, 8).map(() => `<span class="calendar-marker"></span>`).join("")}</div>
      </button>
    `);
  }
  return days.join("");
}

function renderDayRecords(records) {
  if (!records.length) return `<div class="empty-state"><p>No records were recorded on this day.</p></div>`;
  return records.map((item) => `
    <article class="day-record-card">
      <div class="day-record-top">
        <div>
          <div class="day-record-title">${escapeHtml(item.title || item.record_type || item.event_type || item.category || "Record")}</div>
          <div class="record-meta">${escapeHtml(String(item.record_type || item.event_type || item.category || "record").replaceAll("_", " "))} • ${escapeHtml(formatShortTime(item.recorded_at || item.occurred_at || item.event_datetime || item.created_at || item.appointment_date))}</div>
        </div>
      </div>
      <div class="day-record-summary">${escapeHtml(recordSummary(item))}</div>
      ${renderBadges([item.workflow_status, item.severity || item.significance, item.status])}
      <div class="day-record-actions"><button class="ghost-btn" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button></div>
    </article>
  `).join("");
}

function buildDaySummary(records) {
  const total = records.length;
  const incidents = records.filter((x) => String(x.record_type || x.event_type || x.category || "").toLowerCase().includes("incident")).length;
  const dailyNotes = records.filter((x) => String(x.record_type || x.event_type || x.category || "").toLowerCase().includes("daily_note")).length;
  return { total, incidents, dailyNotes };
}

async function loadCalendarView() {
  setLoading("Loading calendar...");
  try {
    await Promise.all([loadCalendarMonthSummary(), loadSelectedDayRecords()]);
    const selectedDateLabel = formatDate(`${state.selectedDate}T12:00:00`);
    const summary = buildDaySummary(state.selectedDayRecords);
    els.content.innerHTML = `
      <div class="calendar-shell">
        <section class="calendar-panel">
          <div class="calendar-header"><div class="calendar-title">${escapeHtml(monthName(state.calendarDate))}</div><div class="calendar-controls"><button class="calendar-icon-btn" id="calendarPrevBtn" type="button">←</button><button class="calendar-icon-btn" id="calendarTodayBtn" type="button">Today</button><button class="calendar-icon-btn" id="calendarNextBtn" type="button">→</button></div></div>
          <div class="calendar-weekdays"><div class="calendar-weekday">Mon</div><div class="calendar-weekday">Tue</div><div class="calendar-weekday">Wed</div><div class="calendar-weekday">Thu</div><div class="calendar-weekday">Fri</div><div class="calendar-weekday">Sat</div><div class="calendar-weekday">Sun</div></div>
          <div class="calendar-grid">${buildCalendarGrid()}</div>
        </section>
        <section class="day-panel">
          <div class="panel-header"><div><h3>${escapeHtml(selectedDateLabel)}</h3><p class="panel-subtitle">Everything recorded on this day.</p></div></div>
          <div class="day-summary-row"><div class="day-summary-card"><div class="day-summary-label">Total records</div><div class="day-summary-value">${summary.total}</div></div><div class="day-summary-card"><div class="day-summary-label">Incidents</div><div class="day-summary-value">${summary.incidents}</div></div><div class="day-summary-card"><div class="day-summary-label">Daily notes</div><div class="day-summary-value">${summary.dailyNotes}</div></div></div>
          <div id="dayRecordsResults">${renderDayRecords(state.selectedDayRecords)}</div>
        </section>
      </div>
    `;
    bindCalendarEvents();
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load calendar.");
    setEmpty("Unable to load calendar.");
  }
}

function bindCalendarEvents() {
  document.getElementById("calendarPrevBtn")?.addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    await loadCalendarView();
  });
  document.getElementById("calendarNextBtn")?.addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    await loadCalendarView();
  });
  document.getElementById("calendarTodayBtn")?.addEventListener("click", async () => {
    const today = new Date();
    state.calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    state.selectedDate = toDateInputValue(today);
    await loadCalendarView();
  });
  els.content.querySelectorAll("[data-calendar-date]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.selectedDate = btn.dataset.calendarDate;
      await loadCalendarView();
    });
  });
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
    <section class="panel"><div class="panel-header"><div><h3>Health profile</h3><p class="panel-subtitle">Key health information.</p></div></div><div class="kv"><div class="kv-key">GP</div><div>${escapeHtml(profile.gp_name || "—")}</div><div class="kv-key">Allergies</div><div>${escapeHtml(profile.allergies || "—")}</div><div class="kv-key">Diagnoses</div><div>${escapeHtml(profile.diagnoses || "—")}</div><div class="kv-key">Mental health</div><div>${escapeHtml(profile.mental_health_summary || "—")}</div></div></section>
    <section class="panel"><div class="panel-header"><div><h3>Health records</h3></div></div>${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No health records.</p></div>`}</section>
    <section class="panel"><div class="panel-header"><div><h3>Medication profiles</h3></div></div>${medicationProfiles.length ? `<div class="record-list">${medicationProfiles.map((item) => `<article class="record-card"><div class="record-card-header"><div><h4>${escapeHtml(item.medication_name || "Medication")}</h4><div class="record-meta">${escapeHtml(item.dosage || item.dose || "—")} • ${escapeHtml(item.frequency || "—")}</div></div></div><div class="record-body">${escapeHtml(item.notes || item.prn_guidance || item.reason || "No notes.")}</div></article>`).join("")}</div>` : `<div class="empty-state"><p>No medication profiles.</p></div>`}</section>
    <section class="panel"><div class="panel-header"><div><h3>Medication records</h3></div></div>${medicationRecords.length ? `<div class="record-list">${medicationRecords.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No medication records.</p></div>`}</section>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadEducation() {
  setLoading("Loading education...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);
  const profile = data.education_profile || data.profile || {};
  const records = data.education_records || data.items || [];
  els.content.innerHTML = `
    <section class="panel"><div class="panel-header"><div><h3>Education profile</h3><p class="panel-subtitle">Current school and support information.</p></div></div><div class="kv"><div class="kv-key">School</div><div>${escapeHtml(profile.school_name || "—")}</div><div class="kv-key">Year group</div><div>${escapeHtml(profile.year_group || "—")}</div><div class="kv-key">Education status</div><div>${escapeHtml(profile.education_status || "—")}</div><div class="kv-key">Support summary</div><div>${escapeHtml(profile.support_summary || "—")}</div></div></section>
    <section class="panel"><div class="panel-header"><div><h3>Education records</h3></div></div>${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No education records.</p></div>`}</section>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadFamily() {
  setLoading("Loading family...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/family`);
  const contacts = data.contacts || [];
  const records = data.family_contact_records || data.items || [];
  els.content.innerHTML = `
    <section class="panel"><div class="panel-header"><div><h3>Family contacts</h3><p class="panel-subtitle">Important relationships and contact information.</p></div></div>${contacts.length ? `<div class="record-list">${contacts.map((contact) => `<article class="record-card"><div class="record-card-header"><div><h4>${escapeHtml(contact.full_name || "Contact")}</h4><div class="record-meta">${escapeHtml(contact.relationship_to_young_person || contact.contact_type || "Contact")}</div></div></div><div class="record-body">Phone: ${escapeHtml(contact.phone || "—")} Email: ${escapeHtml(contact.email || "—")}</div></article>`).join("")}</div>` : `<div class="empty-state"><p>No family contacts.</p></div>`}</section>
    <section class="panel"><div class="panel-header"><div><h3>Family records</h3></div></div>${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No family contact records.</p></div>`}</section>
  `;
  bindDynamicOpenRecordButtons();
}

async function loadAppointments() {
  setLoading("Loading appointments...");
  const appointmentsData = await apiGet(`/young-people/${state.youngPersonId}/appointments`);
  const appointments = appointmentsData.items || [];
  els.content.innerHTML = `
    <section class="panel">
      <div class="panel-header"><div><h3>Young person appointments</h3><p class="panel-subtitle">Appointments should connect to the most relevant plan and follow-up.</p></div><div class="day-record-actions"><button id="addAppointmentBtn" class="primary-btn" type="button">Add appointment</button></div></div>
      ${appointments.length ? `<div class="record-list">${appointments.map(renderRecordCard).join("")}</div>` : `<div class="empty-state"><p>No appointments recorded.</p></div>`}
    </section>
  `;
  document.getElementById("addAppointmentBtn")?.addEventListener("click", () => openRecordModal("appointment", "create"));
  bindDynamicOpenRecordButtons();
}

async function loadCurrentView() {
  clearError();
  const config = VIEW_CONFIG[state.currentView];
  if (!config) return setEmpty("Unknown view.");
  updateHeaderForView(state.currentView);
  markActiveNav(state.currentView);
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
    const navBtn = event.target.closest(".nav-btn");
    if (navBtn && navBtn.dataset.view) {
      if (!state.youngPersonId) return showError("Select a young person first.");
      state.currentView = navBtn.dataset.view;
      loadCurrentView();
      return;
    }

    const quickAction = event.target.closest("[data-action]");
    if (quickAction && quickAction.dataset.action) {
      const action = quickAction.dataset.action;
      if (action === "daily-note") openRecordModal("daily_note", "create");
      if (action === "incident") openRecordModal("incident", "create");
      if (action === "risk") openRecordModal("risk", "create");
      if (action === "plan") openRecordModal("support_plan", "create");
    }
  });

  els.refreshBtn?.addEventListener("click", () => {
    if (!state.youngPersonId) return loadYoungPersonSelector();
    loadYoungPerson().then(loadCurrentView).catch((error) => {
      console.error(error);
      showError(error.message || "Failed to refresh.");
    });
  });

  els.alertsBtn?.addEventListener("click", () => {
    if (!state.youngPersonId) return showError("Select a young person first.");
    state.currentView = "actions";
    loadCurrentView();
  });

  els.selectorRefreshBtn?.addEventListener("click", loadYoungPersonSelector);
  els.selectorSearch?.addEventListener("input", filterSelectorList);
  els.selectorList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open-young-person]");
    if (!btn) return;
    const id = Number(btn.dataset.openYoungPerson);
    if (id) openYoungPerson(id);
  });

  els.changePersonBtn?.addEventListener("click", () => {
    state.youngPersonId = null;
    state.youngPerson = null;
    state.timelineCache = [];
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

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);
  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType) return;
    if (!RECORD_CONFIG[state.activeRecordType]) return showError("This record type cannot be edited here yet.");
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

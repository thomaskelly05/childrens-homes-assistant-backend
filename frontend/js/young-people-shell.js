const state = {
  youngPersonId: null,
  youngPerson: null,
  currentView: "home",
  selectorItems: [],
  activeRecordItem: null,
  activeRecordType: null,

  assistantMessages: [],
  assistantModalMessages: [],
  assistantSending: false,
  assistantMeta: {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: {},
    assistant_context: {},
    suggested_actions: [],
  },

  composerOpen: false,
  composerMode: "create",
  composerRecordType: null,
  composerRecordId: null,
  composerEditItem: null,
};

const els = {
  app: document.getElementById("app"),

  nav: document.getElementById("sidebarNav"),
  content: document.getElementById("viewContent"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  statusBar: document.getElementById("statusBar"),
  refreshBtn: document.getElementById("refreshBtn"),

  personName: document.getElementById("personName"),
  personMeta: document.getElementById("personMeta"),
  personAvatar: document.getElementById("personAvatar"),
  changePersonBtn: document.getElementById("changePersonBtn"),

  selectorPanel: document.getElementById("selectorPanel"),
  selectorList: document.getElementById("selectorList"),
  selectorSearch: document.getElementById("selectorSearch"),
  selectorRefreshBtn: document.getElementById("selectorRefreshBtn"),

  workspacePanel: document.getElementById("workspacePanel"),
  quickActions: document.querySelector(".quick-actions"),

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

  composerPage: document.getElementById("recordComposerPage"),
  composerTitle: document.getElementById("composerTitle"),
  composerSubtitle: document.getElementById("composerSubtitle"),
  composerFields: document.getElementById("recordComposerFields"),
  composerForm: document.getElementById("recordComposerForm"),
  composerGuidanceText: document.getElementById("composerGuidanceText"),
  composerPrompts: document.getElementById("composerPrompts"),
  composerAiFeedback: document.getElementById("composerAiFeedback"),
  closeComposerBtn: document.getElementById("closeComposerBtn"),
  composerSaveDraftBtn: document.getElementById("composerSaveDraftBtn"),
  composerCheckBtn: document.getElementById("composerCheckBtn"),
  composerSubmitBtn: document.getElementById("composerSubmitBtn"),
  composerGrammarBtn: document.getElementById("composerGrammarBtn"),
  composerClarityBtn: document.getElementById("composerClarityBtn"),
  composerSafeguardingBtn: document.getElementById("composerSafeguardingBtn"),
  composerChildVoiceBtn: document.getElementById("composerChildVoiceBtn"),

  assistantLauncher: document.getElementById("assistantLauncher"),
  assistantExpandBtn: document.getElementById("assistantExpandBtn"),
  assistantBackdrop: document.getElementById("assistantBackdrop"),
  assistantModal: document.getElementById("assistantModal"),
  closeAssistantBtn: document.getElementById("closeAssistantBtn"),

  assistantContext: document.getElementById("assistantContext"),
  assistantSuggestions: document.getElementById("assistantSuggestions"),
  assistantMessages: document.getElementById("assistantMessages"),
  assistantForm: document.getElementById("assistantForm"),
  assistantInput: document.getElementById("assistantInput"),
  assistantSendBtn: document.getElementById("assistantSendBtn"),
  assistantClearBtn: document.getElementById("assistantClearBtn"),

  assistantModalMessages: document.getElementById("assistantModalMessages"),
  assistantModalForm: document.getElementById("assistantModalForm"),
  assistantModalInput: document.getElementById("assistantModalInput"),
  assistantModalSendBtn: document.getElementById("assistantModalSendBtn"),

  scopeBadge: document.getElementById("scopeBadge"),
  scopeHomeBadge: document.getElementById("scopeHomeBadge"),
  scopeChildBadge: document.getElementById("scopeChildBadge"),
  scopeShiftBadge: document.getElementById("scopeShiftBadge"),

  modalScopeHomeBadge: document.getElementById("modalScopeHomeBadge"),
  modalScopeChildBadge: document.getElementById("modalScopeChildBadge"),

  assistantScopeSummary: document.getElementById("assistantScopeSummary"),
  assistantActions: document.getElementById("assistantActions"),
  assistantSources: document.getElementById("assistantSources"),
  assistantRuntime: document.getElementById("assistantRuntime"),
  assistantExplainability: document.getElementById("assistantExplainability"),

  assistantModalScopeSummary: document.getElementById("assistantModalScopeSummary"),
  assistantModalSources: document.getElementById("assistantModalSources"),
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
    listUrl: (id) => `/young-people/${id}/daily-notes`,
    createUrl: (id) => `/young-people/${id}/daily-notes`,
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
    listUrl: (id) => `/young-people/${id}/incidents`,
    createUrl: (id) => `/young-people/${id}/incidents`,
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
    listUrl: (id) => `/young-people/${id}/risk`,
    createUrl: (id) => `/young-people/${id}/risk`,
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
    listUrl: (id) => `/young-people/${id}/plans`,
    createUrl: (id) => `/young-people/${id}/plans`,
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
    listUrl: (id) => `/young-people/${id}/appointments`,
    createUrl: (id) => `/young-people/${id}/appointments`,
    detailUrl: (id) => `/young-people/appointments/${id}`,
    updateUrl: (id) => `/young-people/appointments/${id}`,
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
  if (!els.statusBar) return;
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function showMessage(message) {
  if (!els.statusBar) return;
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function clearStatus() {
  if (!els.statusBar) return;
  els.statusBar.classList.add("hidden");
  els.statusBar.textContent = "";
}

function setLoading(message = "Loading...") {
  if (!els.content) return;
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
  if (!els.content) return;
  els.content.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + escaped + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

function withCsrfHeaders(method, headers = {}) {
  const m = String(method || "GET").toUpperCase();
  const next = { ...headers };
  if (["POST", "PUT", "PATCH", "DELETE"].includes(m)) {
    const token = getCsrfToken();
    if (token) next["X-CSRF-Token"] = token;
  }
  return next;
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
    headers: withCsrfHeaders(method, {
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
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
        <button class="ghost-btn" type="button" data-open-record='${escapeHtml(JSON.stringify(item))}'>Open</button>
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
      <div class="stat-value">${escapeHtml(String(value))}</div>
    </div>
  `;
}

function normaliseRecordType(item) {
  const raw = String(item.record_type || item.event_type || item.category || "").toLowerCase();
  if (raw === "plan") return "support_plan";
  if (raw === "risk_assessment") return "risk";
  if (raw === "keywork_session") return "keywork";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
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

function updatePageHeader() {
  const config = VIEW_CONFIG[state.currentView];
  if (!config || !els.pageTitle || !els.pageSubtitle) return;
  els.pageTitle.textContent = config.title;
  els.pageSubtitle.textContent = config.subtitle;
}

function updateActiveNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
  });
}

function closeAllNavGroups(except = null) {
  document.querySelectorAll(".nav-group").forEach((group) => {
    if (group !== except) group.removeAttribute("open");
  });
}

function showSelectorMode() {
  els.selectorPanel?.classList.remove("hidden");
  els.workspacePanel?.classList.add("hidden");
  els.refreshBtn?.classList.add("hidden");
  if (els.personName) els.personName.textContent = "No young person selected";
  if (els.personMeta) els.personMeta.textContent = "Choose a young person to begin";
  if (els.personAvatar) els.personAvatar.textContent = "YP";
  toggleAssistantLauncher();
}

function showWorkspaceMode() {
  els.selectorPanel?.classList.add("hidden");
  els.workspacePanel?.classList.remove("hidden");
  els.refreshBtn?.classList.remove("hidden");
  toggleAssistantLauncher();
}

function openDrawer() {
  els.drawer?.classList.remove("hidden");
  els.drawerBackdrop?.classList.remove("hidden");
  els.drawer?.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  els.drawer?.classList.add("hidden");
  els.drawerBackdrop?.classList.add("hidden");
  els.drawer?.setAttribute("aria-hidden", "true");
  state.activeRecordItem = null;
  state.activeRecordType = null;
}

function openComposer() {
  state.composerOpen = true;
  els.composerPage?.classList.remove("hidden");
  els.composerPage?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeComposer() {
  state.composerOpen = false;
  state.composerMode = "create";
  state.composerRecordType = null;
  state.composerRecordId = null;
  state.composerEditItem = null;

  els.composerPage?.classList.add("hidden");
  els.composerPage?.setAttribute("aria-hidden", "true");
  if (els.composerFields) els.composerFields.innerHTML = "";
  if (els.composerAiFeedback) els.composerAiFeedback.textContent = "No AI review run yet.";
  document.body.style.overflow = "";
}

function openAssistant() {
  updateAssistantContext();
  els.assistantModal?.classList.remove("hidden");
  els.assistantBackdrop?.classList.remove("hidden");
}

function closeAssistant() {
  els.assistantModal?.classList.add("hidden");
  els.assistantBackdrop?.classList.add("hidden");
}

function toggleAssistantLauncher() {
  if (!els.assistantLauncher) return;
  if (state.youngPersonId) {
    els.assistantLauncher.classList.remove("hidden");
  } else {
    els.assistantLauncher.classList.add("hidden");
  }
}

function getFullYoungPersonName() {
  if (!state.youngPerson) return "";
  return (
    [state.youngPerson.first_name, state.youngPerson.last_name].filter(Boolean).join(" ").trim() ||
    state.youngPerson.preferred_name ||
    "Young Person"
  );
}

function updateAssistantScopeDataset() {
  if (!els.app) return;

  els.app.dataset.assistantScopeType = state.youngPersonId ? "young_person" : "global";
  els.app.dataset.youngPersonId = state.youngPersonId ? String(state.youngPersonId) : "";
  els.app.dataset.homeId =
    state.youngPerson?.home_id != null ? String(state.youngPerson.home_id) : "";
}

function renderAssistantScopeBadges() {
  const homeText =
    state.youngPerson?.home_name ||
    (state.youngPerson?.home_id != null ? `Home ${state.youngPerson.home_id}` : "");

  const childText = getFullYoungPersonName();

  if (els.scopeBadge) {
    els.scopeBadge.textContent = state.youngPersonId ? "Young person assistant" : "Assistant";
  }

  if (els.scopeHomeBadge) {
    if (homeText) {
      els.scopeHomeBadge.textContent = homeText;
      els.scopeHomeBadge.classList.remove("hidden");
    } else {
      els.scopeHomeBadge.textContent = "";
      els.scopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.scopeChildBadge) {
    if (childText) {
      els.scopeChildBadge.textContent = childText;
      els.scopeChildBadge.classList.remove("hidden");
    } else {
      els.scopeChildBadge.textContent = "";
      els.scopeChildBadge.classList.add("hidden");
    }
  }

  if (els.scopeShiftBadge) {
    els.scopeShiftBadge.textContent = state.currentView ? state.currentView.replaceAll("-", " ") : "";
    if (state.currentView) {
      els.scopeShiftBadge.classList.remove("hidden");
    } else {
      els.scopeShiftBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeHomeBadge) {
    if (homeText) {
      els.modalScopeHomeBadge.textContent = homeText;
      els.modalScopeHomeBadge.classList.remove("hidden");
    } else {
      els.modalScopeHomeBadge.textContent = "";
      els.modalScopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeChildBadge) {
    if (childText) {
      els.modalScopeChildBadge.textContent = childText;
      els.modalScopeChildBadge.classList.remove("hidden");
    } else {
      els.modalScopeChildBadge.textContent = "";
      els.modalScopeChildBadge.classList.add("hidden");
    }
  }
}

function renderSelectorList(items) {
  if (!els.selectorList) return;

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
        <button class="primary-btn" type="button" data-open-young-person="${item.id}">Open</button>
      </article>
    `;
  }).join("");
}

function filterSelectorList() {
  const term = (els.selectorSearch?.value || "").trim().toLowerCase();

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

  if (els.selectorList) {
    els.selectorList.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading young people...</p>
        </div>
      </div>
    `;
  }

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    showError(error.message || "Failed to load young people.");
    if (els.selectorList) {
      els.selectorList.innerHTML = `
        <div class="empty-state">
          <p>Unable to load young people.</p>
        </div>
      `;
    }
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

  if (els.personName) els.personName.textContent = fullName;
  if (els.personMeta) els.personMeta.textContent = meta || "Young person record";
  if (els.personAvatar) els.personAvatar.textContent = initialsFromName(fullName);

  updateAssistantScopeDataset();
  updateAssistantContext();
  renderAssistantScopeBadges();
  renderAssistantInsights();
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
    ...alerts.map((x) => ({ ...x, _kind: "alert", title: x.title || x.label || "Alert" })),
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

  if (!els.content) return;

  els.content.innerHTML = `
    <div class="grid grid-4">
      ${renderStat("Placement status", yp.placement_status || "—")}
      ${renderStat("Risk level", yp.summary_risk_level || "—")}
      ${renderStat("Active alerts", alerts.length)}
      ${renderStat("Needs attention", urgentItems.length)}
    </div>

    ${renderSimpleSection(
      "Today at a glance",
      "A simple overview of what matters most right now.",
      `<div class="record-body">${escapeHtml(quickSummary || "No summary available.")}</div>`
    )}

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
        "Alerts, due items and follow-up for adults.",
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
              <div class="record-card-header"><div><h4>Add a daily note</h4></div></div>
              <div class="record-body">Record what happened, how the young person presented, what helped, their voice, and what adults need next.</div>
            </article>
            <article class="record-card">
              <div class="record-card-header"><div><h4>Check current risks</h4></div></div>
              <div class="record-body">Review triggers, protective factors, calm responses, and practical guidance that supports consistent care.</div>
            </article>
            <article class="record-card">
              <div class="record-card-header"><div><h4>Prepare for review</h4></div></div>
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

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
  els.content.innerHTML = items.length
    ? `<div class="record-list">${items.map(renderRecordCard).join("")}</div>`
    : `<div class="empty-state"><p>No ${escapeHtml(label.toLowerCase())} found.</p></div>`;

  bindDynamicOpenRecordButtons();
}

async function loadReports() {
  setLoading("Loading reports...");
  const data = await apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] }));
  const reports = data.items || [];

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
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

  if (!els.content) return;
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
  renderAssistantScopeBadges();

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
  if (!els.content) return;
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
  els.drawerActions?.classList.toggle("hidden", !RECORD_CONFIG[type]);
  if (els.drawerTitle) els.drawerTitle.textContent = item.title || "Record details";
  if (els.drawerSubtitle) els.drawerSubtitle.textContent = "Loading...";
  if (els.drawerBody) {
    els.drawerBody.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading record details...</p>
        </div>
      </div>
    `;
  }

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

    if (els.drawerTitle) els.drawerTitle.textContent = item.title || detail.title || "Record details";
    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = `${String(type).replaceAll("_", " ")} • ${formatDate(item.recorded_at || item.occurred_at || item.created_at || detail.created_at)}`;
    }

    if (els.drawerBody) {
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
    }
  } catch (error) {
    if (els.drawerSubtitle) els.drawerSubtitle.textContent = "Could not load";
    if (els.drawerBody) {
      els.drawerBody.innerHTML = `
        <div class="empty-state">
          <p>${escapeHtml(error.message || "Failed to load record details.")}</p>
        </div>
      `;
    }
  }
}

function buildFormField(field) {
  const label = `<label class="form-label" for="${field.name}">${escapeHtml(field.label)}</label>`;

  if (field.type === "textarea") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
        ${label}
        <textarea id="${field.name}" name="${field.name}" class="textarea-input">${escapeHtml(field.value || "")}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
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
    <div class="composer-field ${field.full ? "full" : ""}">
      ${label}
      <input id="${field.name}" name="${field.name}" type="${field.type || "text"}" class="text-input" value="${escapeHtml(field.value || "")}" />
    </div>
  `;
}

function getComposerContent(recordType, item = null) {
  const today = toDateInputValue(new Date());

  if (recordType === "daily_note") {
    return {
      title: item ? "Edit daily note" : "Create daily note",
      subtitle: "Write clearly, therapeutically and with the young person at the centre.",
      guidance:
        "Describe the shift in a calm and child-focused way. Show what happened, how the young person presented, what helped, their voice, and what adults need next.",
      prompts: [
        "What was the young person showing through behaviour, mood or communication?",
        "What helped them feel safer, calmer or more connected?",
        "What positives or strengths should be captured as well as challenges?",
        "What do adults need to do next?",
      ],
      sections: [
        {
          title: "Shift details",
          subtitle: "Start with the basic context for this record.",
          fields: [
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
          ],
        },
        {
          title: "What happened",
          subtitle: "Record the shift in a clear and balanced way.",
          fields: [
            { name: "presentation", label: "Presentation", type: "textarea", full: true, value: item?.presentation || "" },
            { name: "activities", label: "Activities", type: "textarea", full: true, value: item?.activities || "" },
            { name: "behaviour_update", label: "Behaviour update", type: "textarea", full: true, value: item?.behaviour_update || "" },
          ],
        },
        {
          title: "Young person voice and next steps",
          subtitle: "Make sure the record includes the young person and what adults need to do next.",
          fields: [
            { name: "young_person_voice", label: "Young person voice", type: "textarea", full: true, value: item?.young_person_voice || item?.child_voice || "" },
            { name: "positives", label: "Positives", type: "textarea", full: true, value: item?.positives || "" },
            { name: "actions_required", label: "Actions required", type: "textarea", full: true, value: item?.actions_required || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "incident") {
    return {
      title: item ? "Edit incident" : "Create incident",
      subtitle: "Describe the concern, context, response and follow-up clearly and safely.",
      guidance:
        "Be factual, child-focused and calm. Describe what happened, what adults noticed before, what adults did, what helped, the young person’s view, and what follow-up is needed.",
      prompts: [
        "What may the young person have been communicating before or during the incident?",
        "What were the earliest signs that adults noticed?",
        "What did adults do that helped or reduced risk?",
        "What follow-up action, reflection or leadership response is needed?",
      ],
      sections: [
        {
          title: "Incident details",
          subtitle: "Start with the key event details.",
          fields: [
            {
              name: "incident_datetime",
              label: "Incident time",
              type: "datetime-local",
              value: item?.incident_datetime ? String(item.incident_datetime).slice(0, 16) : "",
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
          ],
        },
        {
          title: "Context and event",
          subtitle: "Describe what happened and what led up to it.",
          fields: [
            { name: "antecedent", label: "Antecedent", type: "textarea", full: true, value: item?.antecedent || "" },
            { name: "description", label: "Description", type: "textarea", full: true, value: item?.description || "" },
          ],
        },
        {
          title: "Response and follow-up",
          subtitle: "Record what adults did, the young person’s voice and what happens next.",
          fields: [
            { name: "staff_response", label: "Staff response", type: "textarea", full: true, value: item?.staff_response || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
            { name: "outcome", label: "Outcome", type: "textarea", full: true, value: item?.outcome || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "risk") {
    return {
      title: item ? "Edit risk assessment" : "Create risk assessment",
      subtitle: "Build a living risk picture that helps adults respond consistently and safely.",
      guidance:
        "Focus on patterns, meaning, triggers, protective factors and practical guidance for adults. Keep the tone clear, calm and supportive rather than punitive.",
      prompts: [
        "What is the underlying concern adults need to understand?",
        "What are the most consistent triggers or warning signs?",
        "What helps reduce risk or support regulation?",
        "What should adults actually do in practice?",
      ],
      sections: [
        {
          title: "Risk overview",
          subtitle: "Set out the main risk and its current level.",
          fields: [
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
          ],
        },
        {
          title: "Understanding the concern",
          subtitle: "Help adults understand what sits behind the risk.",
          fields: [
            { name: "concern_summary", label: "Concern summary", type: "textarea", full: true, value: item?.concern_summary || "" },
            { name: "known_triggers", label: "Known triggers", type: "textarea", full: true, value: item?.known_triggers || "" },
          ],
        },
        {
          title: "What helps and what adults should do",
          subtitle: "Be specific and practical for staff.",
          fields: [
            { name: "current_controls", label: "Current controls", type: "textarea", full: true, value: item?.current_controls || "" },
            { name: "response_actions", label: "Response actions", type: "textarea", full: true, value: item?.response_actions || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "appointment") {
    return {
      title: item ? "Edit appointment" : "Create appointment",
      subtitle: "Record the appointment clearly, including preparation and follow-up.",
      guidance:
        "Show the purpose of the appointment, who is involved, what preparation is needed, the young person’s view, and what adults need to do before or after it.",
      prompts: [
        "What is the purpose of this appointment?",
        "How does the young person feel about it?",
        "What preparation or emotional support is needed?",
        "What follow-up action is needed afterwards?",
      ],
      sections: [
        {
          title: "Appointment details",
          subtitle: "Set out the practical information clearly.",
          fields: [
            { name: "title", label: "Appointment title", type: "text", value: item?.title || "" },
            { name: "appointment_type", label: "Appointment type", type: "text", value: item?.appointment_type || "" },
            { name: "appointment_date", label: "Appointment date and time", type: "datetime-local", value: item?.appointment_date ? toDateTimeLocalValue(item.appointment_date) : "" },
            { name: "end_datetime", label: "End time", type: "datetime-local", value: item?.end_datetime ? toDateTimeLocalValue(item.end_datetime) : "" },
            { name: "location", label: "Location", type: "text", value: item?.location || "" },
            { name: "professional_name", label: "Professional name", type: "text", value: item?.professional_name || "" },
          ],
        },
        {
          title: "Purpose and support",
          subtitle: "Help adults understand the meaning and support needed.",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
            { name: "follow_up_actions", label: "Follow-up actions", type: "textarea", full: true, value: item?.follow_up_actions || "" },
          ],
        },
      ],
    };
  }

  return {
    title: item ? "Edit plan" : "Create plan",
    subtitle: "Create support guidance that helps adults understand and respond well.",
    guidance:
      "Write the plan around the young person’s needs, voice and what helps. Keep it practical, kind and useful for adults in day-to-day care.",
    prompts: [
      "What need or pattern are adults trying to understand?",
      "What should adults do consistently?",
      "What helps this young person feel safer or more connected?",
      "How is the young person’s voice reflected in this plan?",
    ],
    sections: [
      {
        title: "Plan details",
        subtitle: "Set out the core plan information.",
        fields: [
          { name: "title", label: "Title", type: "text", value: item?.title || "" },
          { name: "review_date", label: "Review date", type: "date", value: item?.review_date || today },
        ],
      },
      {
        title: "Understanding the need",
        subtitle: "Describe the main need and summary.",
        fields: [
          { name: "presenting_need", label: "Presenting need", type: "textarea", full: true, value: item?.presenting_need || "" },
          { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
          { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item?.child_voice || "" },
        ],
      },
      {
        title: "Guidance for adults",
        subtitle: "Be practical and clear.",
        fields: [
          { name: "proactive_strategies", label: "Proactive strategies", type: "textarea", full: true, value: item?.proactive_strategies || "" },
          { name: "triggers", label: "Triggers", type: "textarea", full: true, value: item?.triggers || "" },
          { name: "protective_factors", label: "Protective factors", type: "textarea", full: true, value: item?.protective_factors || "" },
        ],
      },
    ],
  };
}

function renderComposerSections(content) {
  return content.sections.map((section) => `
    <section class="composer-section">
      <h3>${escapeHtml(section.title)}</h3>
      <p>${escapeHtml(section.subtitle || "")}</p>
      <div class="composer-grid">
        ${section.fields.map(buildFormField).join("")}
      </div>
    </section>
  `).join("");
}

function openComposerFor(recordType, mode = "create", item = null) {
  state.composerMode = mode;
  state.composerRecordType = recordType;
  state.composerRecordId = item?.id || item?.record_id || item?.source_id || null;
  state.composerEditItem = item || null;

  const content = getComposerContent(recordType, item);

  if (els.composerTitle) els.composerTitle.textContent = content.title;
  if (els.composerSubtitle) els.composerSubtitle.textContent = content.subtitle;
  if (els.composerGuidanceText) els.composerGuidanceText.textContent = content.guidance;
  if (els.composerPrompts) {
    els.composerPrompts.innerHTML = content.prompts.map((prompt) => `
      <div class="composer-prompt">${escapeHtml(prompt)}</div>
    `).join("");
  }
  if (els.composerFields) els.composerFields.innerHTML = renderComposerSections(content);
  if (els.composerAiFeedback) els.composerAiFeedback.textContent = "No AI review run yet.";

  openComposer();
}

function serialiseValue(key, value) {
  if (value === "") return null;
  if (["linked_plan_id", "reminder_minutes_before"].includes(key)) return Number(value);
  return value;
}

function serializeComposerForm() {
  const formData = new FormData(els.composerForm);
  const obj = {};

  for (const [key, value] of formData.entries()) {
    obj[key] = serialiseValue(key, value);
  }

  obj.young_person_id = state.youngPersonId;

  if (obj.appointment_date && !obj.start_datetime) {
    obj.start_datetime = obj.appointment_date;
  }

  return obj;
}

async function saveComposer(mode = "draft") {
  const recordType = state.composerRecordType;
  const config = RECORD_CONFIG[recordType];

  if (!config) {
    showError("This record type is not configured.");
    return;
  }

  const payload = serializeComposerForm();

  if (mode === "submit" && recordType !== "appointment") {
    if (!state.composerRecordId) {
      const created = await apiSend(config.createUrl(state.youngPersonId), "POST", payload);
      state.composerRecordId = created.id || created.record_id || state.composerRecordId;
    } else {
      await apiSend(config.updateUrl(state.composerRecordId), config.updateMethod || "PATCH", payload);
    }

    await apiSend(config.submitUrl(state.composerRecordId), "POST", {});
    showMessage(`${config.label} sent for approval.`);
    closeComposer();
    await loadCurrentView();
    return;
  }

  if (state.composerMode === "edit" && state.composerRecordId) {
    await apiSend(config.updateUrl(state.composerRecordId), config.updateMethod || "PATCH", payload);
    showMessage(`${config.label} updated.`);
  } else {
    const created = await apiSend(config.createUrl(state.youngPersonId), "POST", payload);
    state.composerRecordId = created.id || created.record_id || state.composerRecordId;
    state.composerMode = "edit";
    showMessage(`${config.label} saved.`);
  }

  if (mode === "draft") {
    await loadCurrentView();
  }
}

function buildAiFeedback(type) {
  const form = serializeComposerForm();
  const notes = [];

  if (type === "grammar") {
    notes.push("Spelling and grammar review:");
    notes.push("• Check sentence length and simplify long sections.");
    notes.push("• Keep language clear, calm and professional.");
    notes.push("• Remove repeated phrases and make dates/times precise.");
  }

  if (type === "clarity") {
    notes.push("Clarity review:");
    notes.push("• Make sure the order of events is easy to follow.");
    notes.push("• Separate facts, interpretation and next steps.");
    notes.push("• Use plain language that another adult can quickly understand.");
  }

  if (type === "safeguarding") {
    notes.push("Safeguarding review:");
    notes.push("• Consider whether any behaviour, injury, disclosure or pattern needs escalating.");
    notes.push("• Check whether the record clearly shows risk, response and follow-up.");
    notes.push("• Make sure the record states who needs to know next.");
  }

  if (type === "child_voice") {
    notes.push("Child voice review:");
    notes.push("• Check whether the young person’s view, feeling or communication is visible.");
    notes.push("• If not verbal, describe how they communicated through behaviour, mood or presentation.");
    notes.push("• Show how adults responded to that communication.");
  }

  if (!form.child_voice && !form.young_person_voice && type !== "grammar") {
    notes.push("");
    notes.push("Prompt:");
    notes.push("• The current draft appears light on child voice.");
  }

  if (!form.actions_required && !form.response_actions && !form.follow_up_actions && type !== "grammar") {
    notes.push("• Add clearer next steps for adults where needed.");
  }

  return notes.join("\n");
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
  const fullName = getFullYoungPersonName();

  if (!state.youngPerson) {
    if (els.assistantContext) {
      els.assistantContext.textContent = "No young person selected.";
    }
  } else {
    const text = [
      `Young person: ${fullName}`,
      state.youngPerson.placement_status ? `Placement: ${state.youngPerson.placement_status}` : null,
      state.youngPerson.summary_risk_level ? `Risk: ${state.youngPerson.summary_risk_level}` : null,
      `View: ${state.currentView.replaceAll("-", " ")}`,
    ].filter(Boolean).join(" • ");

    if (els.assistantContext) {
      els.assistantContext.textContent = text;
    }
  }

  const prompts = assistantPromptsForView(state.currentView);
  if (els.assistantSuggestions) {
    els.assistantSuggestions.innerHTML = prompts.map((prompt) => `
      <button class="secondary-btn" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>
    `).join("");
  }
}

function renderAssistantMessageList(host, messages) {
  if (!host) return;

  const base = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">Ask a question about this young person.</div>
    </article>
  `;

  const messagesHtml = messages.map((message) => `
    <article class="assistant-message ${message.role === "user" ? "assistant-message-user" : ""}">
      <div class="assistant-message-role">${message.role === "user" ? "You" : "Assistant"}</div>
      <div class="assistant-message-body">${escapeHtml(message.content)}</div>
    </article>
  `).join("");

  host.innerHTML = base + messagesHtml;
  host.scrollTop = host.scrollHeight;
}

function renderAssistantMessages() {
  renderAssistantMessageList(els.assistantMessages, state.assistantMessages);
  renderAssistantMessageList(els.assistantModalMessages, state.assistantModalMessages);
}

function pushAssistantMessage(role, content) {
  const entry = { role, content };
  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(entry);
  renderAssistantMessages();
}

function addAssistantPlaceholder() {
  state.assistantMessages.push({ role: "assistant", content: "Thinking...", _streaming: true });
  state.assistantModalMessages.push({ role: "assistant", content: "Thinking...", _streaming: true });
  renderAssistantMessages();
}

function replaceLastAssistantPlaceholder(text) {
  const lists = [state.assistantMessages, state.assistantModalMessages];
  lists.forEach((list) => {
    if (!list.length) return;
    const last = list[list.length - 1];
    if (last.role === "assistant" && last._streaming) {
      last.content = text;
      last._streaming = false;
    }
  });
  renderAssistantMessages();
}

function updateLastAssistantStreamingText(text) {
  const lists = [state.assistantMessages, state.assistantModalMessages];
  lists.forEach((list) => {
    if (!list.length) return;
    const last = list[list.length - 1];
    if (last.role === "assistant" && last._streaming) {
      last.content = text;
    }
  });
  renderAssistantMessages();
}

function setAssistantSending(flag) {
  state.assistantSending = !!flag;
  if (els.assistantSendBtn) els.assistantSendBtn.disabled = flag;
  if (els.assistantModalSendBtn) els.assistantModalSendBtn.disabled = flag;
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function renderAssistantSourcesHtml(sources) {
  if (!Array.isArray(sources) || !sources.length) {
    return `<p>Sources will appear here after a response.</p>`;
  }

  return sources.map((source) => {
    const type = escapeHtml(source?.type || "source");
    const label = escapeHtml(source?.label || source?.document_title || "Source");
    const excerpt = escapeHtml(source?.excerpt || "");
    const section = escapeHtml(source?.section || "");
    const page = source?.page_number != null ? escapeHtml(String(source.page_number)) : "";

    return `
      <div class="entity-row">
        <div>
          <div class="entity-title">${label}</div>
          <div class="entity-meta">
            ${type}
            ${section ? ` • ${section}` : ""}
            ${page ? ` • p.${page}` : ""}
          </div>
          ${excerpt ? `<div class="entity-meta" style="margin-top:6px;">${excerpt}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function inferAssistantSuggestedActions() {
  const actions = [];
  const scope = state.assistantMeta.assistant_scope || {};
  const context = state.assistantMeta.assistant_context || {};

  if (scope.scope_type === "young_person") {
    actions.push("Summarise current risks");
    actions.push("Draft handover");
    actions.push("Pull child voice themes");
    actions.push("Summarise recent incidents");
  }

  if (context.recent_records?.incidents?.length) {
    actions.push("Review incident patterns");
  }

  if (context.active_work?.tasks?.length) {
    actions.push("Review outstanding tasks");
  }

  return [...new Set(actions)].slice(0, 6);
}

function renderAssistantInsights() {
  const scope = state.assistantMeta.assistant_scope || {};
  const context = state.assistantMeta.assistant_context || {};
  const sources = state.assistantMeta.sources || [];
  const runtime = state.assistantMeta.runtime || {};
  const explainability = state.assistantMeta.explainability || {};

  if (els.assistantScopeSummary) {
    const rows = [];

    rows.push(`
      <div class="entity-row">
        <div>
          <div class="entity-title">${scope.scope_type === "young_person" ? "Young person scope" : "Assistant scope"}</div>
          <div class="entity-meta">View: ${escapeHtml(state.currentView.replaceAll("-", " "))}</div>
        </div>
      </div>
    `);

    if (state.youngPerson) {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">${escapeHtml(getFullYoungPersonName())}</div>
            <div class="entity-meta">
              ${escapeHtml(state.youngPerson.placement_status || "—")} • Risk: ${escapeHtml(state.youngPerson.summary_risk_level || "—")}
            </div>
          </div>
        </div>
      `);
    }

    if (context.young_person && typeof context.young_person === "object") {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">Context loaded</div>
            <div class="entity-meta">Assistant context includes young person profile and recent records.</div>
          </div>
        </div>
      `);
    }

    els.assistantScopeSummary.innerHTML = rows.join("");
  }

  const suggestedActions = inferAssistantSuggestedActions();
  if (els.assistantActions) {
    els.assistantActions.innerHTML = suggestedActions.length
      ? suggestedActions.map((item) => `<button class="chip" type="button" data-assistant-chip="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")
      : `<p>No suggested actions yet.</p>`;
  }

  if (els.assistantSources) {
    els.assistantSources.innerHTML = renderAssistantSourcesHtml(sources);
  }

  if (els.assistantRuntime) {
    els.assistantRuntime.textContent = prettyJson(runtime);
  }

  if (els.assistantExplainability) {
    els.assistantExplainability.textContent = prettyJson(explainability);
  }

  if (els.assistantModalScopeSummary) {
    els.assistantModalScopeSummary.innerHTML = els.assistantScopeSummary
      ? els.assistantScopeSummary.innerHTML
      : `<p>No scoped context loaded.</p>`;
  }

  if (els.assistantModalSources) {
    els.assistantModalSources.innerHTML = renderAssistantSourcesHtml(sources);
  }
}

function buildAssistantScopePayload() {
  return {
    scope_type: "young_person",
    young_person_id: state.youngPersonId,
    home_id: state.youngPerson?.home_id ?? null,
  };
}

function buildAssistantContextPayload() {
  return {
    current_view: state.currentView,
    young_person_name: getFullYoungPersonName(),
    placement_status: state.youngPerson?.placement_status || null,
    summary_risk_level: state.youngPerson?.summary_risk_level || null,
    composer_record_type: state.composerRecordType || null,
  };
}

function detectAssistantResponseMode(text) {
  return /6 month|six month|12 month|twelve month|summary|timeline|chronology|review|report/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

function parseSseChunk(buffer, onEvent) {
  const parts = buffer.split("\n\n");
  const complete = parts.slice(0, -1);
  const remainder = parts[parts.length - 1] || "";

  for (const block of complete) {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
      }
    }

    onEvent(eventName, dataLines.join("\n"));
  }

  return remainder;
}

async function askAssistant(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed || !state.youngPersonId || state.assistantSending) return;

  pushAssistantMessage("user", trimmed);
  addAssistantPlaceholder();
  setAssistantSending(true);

  try {
    const response = await fetch("/chat/", {
      method: "POST",
      credentials: "include",
      headers: withCsrfHeaders("POST", {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      }),
      body: JSON.stringify({
        message: trimmed,
        response_mode: detectAssistantResponseMode(trimmed),
        context: buildAssistantContextPayload(),
        scope: buildAssistantScopePayload(),
      }),
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        message = body.detail || body.error || message;
      } catch (_) {}
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error("No assistant response stream was returned.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      buffer = parseSseChunk(buffer, (eventName, payload) => {
        if (eventName === "done" || payload === "[DONE]") return;

        if (eventName === "meta") {
          try {
            const meta = JSON.parse(payload || "{}");
            state.assistantMeta = {
              sources: Array.isArray(meta.sources) ? meta.sources : [],
              runtime: meta.runtime || {},
              explainability: meta.explainability || {},
              assistant_scope: meta.assistant_scope || buildAssistantScopePayload(),
              assistant_context: meta.assistant_context || {},
            };
            renderAssistantInsights();
          } catch (_) {}
          return;
        }

        if (eventName === "progress") return;

        if (eventName === "message") {
          streamedText += payload || "";
          updateLastAssistantStreamingText(streamedText.trim() || "Thinking...");
        }
      });
    }

    replaceLastAssistantPlaceholder(streamedText.trim() || "No assistant reply returned.");
  } catch (error) {
    replaceLastAssistantPlaceholder(error.message || "The assistant could not answer right now.");
  } finally {
    setAssistantSending(false);
  }
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
      closeAllNavGroups();
      updateAssistantContext();
      renderAssistantScopeBadges();
      loadCurrentView();
      return;
    }

    const openBtn = event.target.closest("[data-open-young-person]");
    if (openBtn) {
      openYoungPerson(Number(openBtn.dataset.openYoungPerson));
      return;
    }

    const quickAssistantBtn = event.target.closest("[data-assistant-quick]");
    if (quickAssistantBtn) {
      const action = quickAssistantBtn.dataset.assistantQuick;
      const prompts = {
        handover: "Draft a handover for the next shift for this young person.",
        priorities: "Summarise current risks and priorities for today.",
      };
      askAssistant(prompts[action] || "Summarise what matters most right now.");
      return;
    }

    const assistantChip = event.target.closest("[data-assistant-chip]");
    if (assistantChip) {
      const text = assistantChip.dataset.assistantChip || "";
      if (els.assistantInput) els.assistantInput.value = text;
      if (els.assistantModalInput) els.assistantModalInput.value = text;
      return;
    }

    const suggestionBtn = event.target.closest("[data-prompt]");
    if (suggestionBtn) {
      askAssistant(suggestionBtn.dataset.prompt || "");
      return;
    }

    if (!event.target.closest(".nav-group")) {
      closeAllNavGroups();
    }
  });

  document.querySelectorAll(".nav-group").forEach((group) => {
    group.addEventListener("toggle", () => {
      if (group.open) closeAllNavGroups(group);
    });
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
    state.assistantModalMessages = [];
    state.assistantMeta = {
      sources: [],
      runtime: {},
      explainability: {},
      assistant_scope: {},
      assistant_context: {},
      suggested_actions: [],
    };

    closeDrawer();
    closeComposer();
    closeAssistant();

    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
    window.history.replaceState({}, "", url.toString());

    updateAssistantScopeDataset();
    renderAssistantScopeBadges();
    renderAssistantMessages();
    renderAssistantInsights();

    await loadYoungPersonSelector();
  });

  els.quickActions?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    if (btn.dataset.action === "daily-note") openComposerFor("daily_note", "create");
    if (btn.dataset.action === "incident") openComposerFor("incident", "create");
    if (btn.dataset.action === "risk") openComposerFor("risk", "create");
    if (btn.dataset.action === "plan") openComposerFor("support_plan", "create");
  });

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);

  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType || !RECORD_CONFIG[state.activeRecordType]) return;
    openComposerFor(state.activeRecordType, "edit", state.activeRecordItem);
  });

  els.drawerSubmitBtn?.addEventListener("click", () => runDrawerWorkflow("submit"));
  els.drawerApproveBtn?.addEventListener("click", () => runDrawerWorkflow("approve"));
  els.drawerReturnBtn?.addEventListener("click", () => runDrawerWorkflow("return"));
  els.drawerArchiveBtn?.addEventListener("click", () => runDrawerWorkflow("archive"));

  els.closeComposerBtn?.addEventListener("click", closeComposer);

  els.composerSaveDraftBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("draft");
    } catch (error) {
      showError(error.message || "Could not save draft.");
    }
  });

  els.composerSubmitBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("submit");
    } catch (error) {
      showError(error.message || "Could not submit record.");
    }
  });

  els.composerCheckBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
    showMessage("Review prompts generated.");
  });

  els.composerGrammarBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("grammar");
  });

  els.composerClarityBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("clarity");
  });

  els.composerSafeguardingBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("safeguarding");
  });

  els.composerChildVoiceBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("child_voice");
  });

  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.assistantExpandBtn?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    state.assistantMessages = [];
    state.assistantModalMessages = [];
    renderAssistantMessages();
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput?.value || "";
    if (els.assistantInput) els.assistantInput.value = "";
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) els.assistantModalInput.value = "";
    await askAssistant(question);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeAssistant();
      if (state.composerOpen) closeComposer();
      closeAllNavGroups();
    }
  });
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

async function init() {
  state.youngPersonId = getYoungPersonId();

  bindEvents();
  renderAssistantMessages();
  renderAssistantInsights();
  updateAssistantScopeDataset();
  renderAssistantScopeBadges();
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

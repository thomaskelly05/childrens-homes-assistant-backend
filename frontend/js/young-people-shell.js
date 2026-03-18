const token = () => localStorage.getItem("chos_access_token") || "";
const currentUser = () => JSON.parse(localStorage.getItem("chos_user") || "{}");

const state = {
  primaryTab: "home",
  secondaryTab: "",
  selectedYoungPersonId: null,
  youngPeople: [],
  command: null,
  profile: null,
  cache: {},
  modal: {
    key: null,
    recordId: null
  }
};

const $ = (id) => document.getElementById(id);

const UI = {
  primaryNav: $("primaryNav"),
  secondaryNav: $("secondaryNav"),
  secondaryNavWrap: $("secondaryNavWrap"),
  content: $("workspaceContent"),
  userChip: $("currentUserChip"),
  heroAvatar: $("heroAvatar"),
  heroTitle: $("heroTitle"),
  heroDescription: $("heroDescription"),
  heroBadges: $("heroBadges"),
  pageTitle: $("pageTitle"),
  pageSubtitle: $("pageSubtitle"),
  globalActions: $("globalActions"),
  youngPersonSelect: $("youngPersonSelect"),
  modal: $("appModal"),
  modalTitle: $("modalTitle"),
  modalContent: $("modalContent"),
  modalStatus: $("modalStatus")
};

const CONFIG = {
  primaryTabs: {
    home: {
      label: "Home",
      subtitle: "Therapeutic recording, oversight, compliance and inspection readiness.",
      actions: [
        { id: "refreshCommand", label: "Refresh Command Centre", kind: "ghost" },
        { id: "openAiInfo", label: "AI Notes", kind: "primary" }
      ]
    },
    youngPeople: {
      label: "Young People",
      subtitle: "Recording, planning, risk, chronology and documents.",
      secondary: {
        overview: { label: "Overview" },
        recording: { label: "Recording" },
        health: { label: "Health" },
        education: { label: "Education" },
        family: { label: "Family" },
        keywork: { label: "Keywork" },
        plans: { label: "Plans" },
        risk: { label: "Risk" },
        timeline: { label: "Timeline" },
        documents: { label: "Documents" }
      }
    },
    quality: {
      label: "Quality",
      subtitle: "Standards, compliance, therapeutic practice and management review.",
      secondary: {
        standards: { label: "Standards" },
        compliance: { label: "Compliance" },
        ai: { label: "AI / Therapeutic" },
        management: { label: "Management Queue" },
        archive: { label: "Archive" }
      }
    },
    inspection: {
      label: "Inspection",
      subtitle: "Inspection pack and evidence overview."
    },
    operations: {
      label: "Operations",
      subtitle: "Rostering and home operations.",
      secondary: {
        rostering: { label: "Rostering" }
      }
    }
  },

  endpoints: {
    youngPeople: "/young-people/",
    command: "/command-centre",
    profile: (id) => `/young-people/${id}/profile`,

    daily: {
      list: (id) => `/young-people/${id}/daily-notes`,
      archiveList: (id) => `/young-people/${id}/daily-notes/archive`,
      create: "/young-people/daily-notes",
      update: (id) => `/young-people/daily-notes/${id}`,
      get: (id) => `/young-people/daily-notes/${id}`,
      submit: (id) => `/young-people/daily-notes/${id}/submit`,
      archive: (id) => `/young-people/daily-notes/${id}/archive`
    },

    incidents: {
      list: (id) => `/young-people/${id}/incidents`,
      archiveList: (id) => `/young-people/${id}/incidents/archive`,
      create: "/young-people/incidents",
      update: (id) => `/young-people/incidents/${id}`,
      get: (id) => `/young-people/incidents/${id}`,
      submit: (id) => `/young-people/incidents/${id}/submit`,
      archive: (id) => `/young-people/incidents/${id}/archive`
    },

    handover: {
      list: (id) => `/young-people/${id}/handover`,
      generate: (id) => `/young-people/${id}/handover/generate`,
      approve: (id) => `/young-people/handover/${id}/approve`,
      archive: (id) => `/young-people/handover/${id}/archive`
    },

    health: {
      list: (id) => `/young-people/${id}/health`
    },

    education: {
      list: (id) => `/young-people/${id}/education`
    },

    family: {
      list: (id) => `/young-people/${id}/family`
    },

    keywork: {
      list: (id) => `/young-people/${id}/keywork`,
      submit: (id) => `/young-people/${id}/keywork/${id}/submit`,
      archive: (id) => `/young-people/${id}/keywork/${id}/archive`
    },

    plans: {
      list: (id) => `/young-people/${id}/plans`,
      archiveList: (id) => `/young-people/${id}/plans/archive`,
      create: "/young-people/plans",
      update: (id) => `/young-people/plans/${id}`,
      get: (id) => `/young-people/plans/${id}`,
      submit: (id) => `/young-people/plans/${id}/submit`,
      approve: (id) => `/young-people/plans/${id}/approve`,
      archive: (id) => `/young-people/plans/${id}/archive`
    },

    risk: {
      list: (id) => `/young-people/${id}/risk`,
      archiveList: (id) => `/young-people/${id}/risk/archive`,
      create: "/young-people/risk",
      update: (id) => `/young-people/risk/${id}`,
      get: (id) => `/young-people/risk/${id}`
    },

    chronology: {
      list: (id) => `/young-people/${id}/chronology`,
      rebuild: (id) => `/young-people/${id}/chronology/rebuild`
    },

    compliance: (id) => `/young-people/${id}/compliance`,

    standards: {
      summary: (id) => `/young-people/${id}/standards`,
      evidence: (id) => `/young-people/${id}/standards/evidence`,
      rebuild: (id) => `/young-people/${id}/standards/rebuild`
    },

    statutory: {
      list: (id) => `/young-people/${id}/statutory-documents`
    },

    ai: {
      history: "/ai-notes/history"
    },

    inspection: (id) => `/inspection-pack/young-person/${id}`,
    photo: (id) => `/young-people/${id}/photo`
  }
};

const FORM_SCHEMAS = {
  daily: {
    title: "Daily Note",
    load: CONFIG.endpoints.daily.get,
    save: {
      create: CONFIG.endpoints.daily.create,
      update: CONFIG.endpoints.daily.update
    },
    fields: [
      { name: "note_date", label: "Note date", type: "date" },
      { name: "shift_type", label: "Shift type" },
      { name: "mood", label: "Mood" },
      { name: "presentation", label: "Presentation", type: "textarea" },
      { name: "activities", label: "Activities", type: "textarea" },
      { name: "education_update", label: "Education update", type: "textarea" },
      { name: "health_update", label: "Health update", type: "textarea" },
      { name: "family_update", label: "Family update", type: "textarea" },
      { name: "behaviour_update", label: "Behaviour update", type: "textarea" },
      { name: "young_person_voice", label: "Young person’s voice", type: "textarea" },
      { name: "positives", label: "Positives", type: "textarea" },
      { name: "actions_required", label: "Actions required", type: "textarea" }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      note_date: value("note_date"),
      shift_type: value("shift_type"),
      mood: value("mood"),
      presentation: value("presentation"),
      activities: value("activities"),
      education_update: value("education_update"),
      health_update: value("health_update"),
      family_update: value("family_update"),
      behaviour_update: value("behaviour_update"),
      young_person_voice: value("young_person_voice"),
      positives: value("positives"),
      actions_required: value("actions_required")
    })
  },

  incident: {
    title: "Incident",
    load: CONFIG.endpoints.incidents.get,
    save: {
      create: CONFIG.endpoints.incidents.create,
      update: CONFIG.endpoints.incidents.update
    },
    fields: [
      { name: "occurred_at", label: "Occurred at", type: "datetime-local" },
      {
        name: "incident_type",
        label: "Incident type",
        type: "select",
        options: [
          "missing_from_placement",
          "physical_aggression",
          "verbal_aggression",
          "self_harm_concern",
          "safeguarding_concern",
          "absconding",
          "property_damage",
          "bullying",
          "substance_misuse",
          "relationship_incident",
          "health_incident",
          "medication_error",
          "physical_intervention",
          "restraint",
          "other"
        ]
      },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        options: ["low", "medium", "high", "critical"]
      },
      { name: "location", label: "Location" },
      { name: "staff_id", label: "Staff ID", type: "number" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "antecedent", label: "Antecedent", type: "textarea" },
      { name: "presentation", label: "Presentation", type: "textarea" },
      { name: "staff_response", label: "Staff response", type: "textarea" },
      { name: "trauma_informed_formulation", label: "Trauma-informed formulation", type: "textarea" },
      { name: "child_voice", label: "Child voice", type: "textarea" },
      { name: "restorative_follow_up", label: "Restorative follow-up", type: "textarea" }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      occurred_at: isoFromLocal(value("occurred_at")),
      incident_type: value("incident_type"),
      severity: value("severity"),
      location: value("location"),
      description: value("description"),
      antecedent: value("antecedent"),
      presentation: value("presentation"),
      staff_response: value("staff_response"),
      trauma_informed_formulation: value("trauma_informed_formulation"),
      child_voice: value("child_voice"),
      restorative_follow_up: value("restorative_follow_up"),
      staff_id: numberOrNull(value("staff_id"))
    })
  },

  plan: {
    title: "Support Plan",
    load: CONFIG.endpoints.plans.get,
    save: {
      create: CONFIG.endpoints.plans.create,
      update: CONFIG.endpoints.plans.update
    },
    fields: [
      { name: "plan_type", label: "Plan type", value: "support_plan" },
      { name: "title", label: "Title" },
      { name: "start_date", label: "Start date", type: "date" },
      { name: "review_date", label: "Review date", type: "date" },
      { name: "owner_id", label: "Owner ID", type: "number" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "child_voice", label: "Child voice", type: "textarea" },
      { name: "formulation", label: "Formulation / presenting need", type: "textarea" },
      { name: "staff_guidance", label: "Staff guidance / proactive strategies", type: "textarea" },
      { name: "pace_guidance", label: "PACE guidance", type: "textarea" },
      { name: "triggers", label: "Triggers", type: "textarea" },
      { name: "protective_factors", label: "Protective factors", type: "textarea" }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      plan_type: value("plan_type") || "support_plan",
      title: value("title"),
      summary: value("summary"),
      child_voice: value("child_voice"),
      formulation: value("formulation"),
      staff_guidance: value("staff_guidance"),
      pace_guidance: value("pace_guidance"),
      triggers: value("triggers"),
      protective_factors: value("protective_factors"),
      start_date: value("start_date"),
      review_date: value("review_date"),
      owner_id: numberOrNull(value("owner_id")),
      status: "draft",
      approval_status: "draft"
    })
  },

  risk: {
    title: "Risk Assessment",
    load: CONFIG.endpoints.risk.get,
    save: {
      create: CONFIG.endpoints.risk.create,
      update: CONFIG.endpoints.risk.update
    },
    fields: [
      { name: "category", label: "Category" },
      { name: "title", label: "Title" },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        options: ["low", "medium", "high", "critical"]
      },
      {
        name: "likelihood",
        label: "Likelihood",
        type: "select",
        options: ["low", "medium", "high"]
      },
      { name: "review_date", label: "Review date", type: "date" },
      { name: "owner_id", label: "Owner ID", type: "number" },
      { name: "concern_summary", label: "Concern summary", type: "textarea" },
      { name: "known_triggers", label: "Known triggers", type: "textarea" },
      { name: "early_warning_signs", label: "Early warning signs", type: "textarea" },
      { name: "contextual_factors", label: "Contextual factors", type: "textarea" },
      { name: "current_controls", label: "Current controls", type: "textarea" },
      { name: "deescalation_strategies", label: "De-escalation strategies", type: "textarea" },
      { name: "response_actions", label: "Response actions", type: "textarea" },
      { name: "child_views", label: "Child views", type: "textarea" }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      category: value("category"),
      title: value("title"),
      concern_summary: value("concern_summary"),
      known_triggers: value("known_triggers"),
      early_warning_signs: value("early_warning_signs"),
      contextual_factors: value("contextual_factors"),
      current_controls: value("current_controls"),
      deescalation_strategies: value("deescalation_strategies"),
      response_actions: value("response_actions"),
      child_views: value("child_views"),
      severity: value("severity"),
      likelihood: value("likelihood"),
      review_date: value("review_date"),
      owner_id: numberOrNull(value("owner_id")),
      status: "active"
    })
  }
};

function requireAuth() {
  if (!token()) {
    window.location.href = "/oslogin.html";
    throw new Error("Not authenticated");
  }
}

async function api(url, options = {}) {
  requireAuth();

  const headers = {
    Authorization: `Bearer ${token()}`,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (response.status === 401) {
    localStorage.removeItem("chos_access_token");
    localStorage.removeItem("chos_user");
    window.location.href = "/oslogin.html";
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const message = typeof body === "object" ? (body.detail || "Request failed") : body;
    throw new Error(message);
  }

  return body;
}

const postJson = (url, payload) =>
  api(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

const putJson = (url, payload) =>
  api(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-GB");
}

function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-GB");
}

function numberOrNull(value) {
  return value === "" || value == null ? null : Number(value);
}

function isoFromLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : "";
}

function toDateTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function initials(name) {
  return String(name || "OS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function fullName(person) {
  if (!person) return "";
  return `${person.first_name || ""} ${person.last_name || ""}`.trim();
}

function value(fieldName) {
  const el = document.querySelector(`[data-field="${fieldName}"]`);
  return el ? el.value : "";
}

function badgeClass(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("critical") || v.includes("high") || v.includes("overdue")) return "badge-danger";
  if (v.includes("medium") || v.includes("returned") || v.includes("submitted") || v.includes("due_soon")) return "badge-warning";
  if (v.includes("approved") || v.includes("active") || v.includes("ok")) return "badge-success";
  return "badge-neutral";
}

function titleCaseLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function card(title, meta = "", body = "", actions = "") {
  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <div class="record-title">${escapeHtml(title || "Untitled")}</div>
          <div class="record-meta">${escapeHtml(meta)}</div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(body || "No detail")}</div>
      ${actions ? `<div class="record-actions">${actions}</div>` : ""}
    </article>
  `;
}

function summaryCard(label, value, tone = "neutral") {
  return `
    <div class="dashboard-stat dashboard-stat-${tone}">
      <div class="dashboard-stat-label">${escapeHtml(label)}</div>
      <div class="dashboard-stat-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function alertCard(item = {}) {
  return `
    <article class="priority-card priority-${escapeHtml(String(item.level || "neutral").toLowerCase())}">
      <div class="priority-card-top">
        <div class="priority-title">${escapeHtml(item.title || "Alert")}</div>
        <span class="badge ${badgeClass(item.level)}">${escapeHtml(item.level || "info")}</span>
      </div>
      <div class="priority-meta">${escapeHtml(item.young_person_name || "Home-wide")}</div>
      <div class="priority-body">${escapeHtml(item.detail || "No further detail recorded.")}</div>
    </article>
  `;
}

function taskCard(item = {}) {
  return `
    <article class="flow-card">
      <div class="flow-card-title">${escapeHtml(item.title || "Task")}</div>
      <div class="flow-card-meta">${escapeHtml(item.young_person_name || "Home-wide")} • ${escapeHtml(item.due || "No due time")}</div>
    </article>
  `;
}

function medCard(item = {}) {
  return `
    <article class="flow-card">
      <div class="flow-card-title">${escapeHtml(item.medicine || item.item || "Medication")}</div>
      <div class="flow-card-meta">${escapeHtml(item.young_person_name || "Young person")} • ${escapeHtml(item.time_due || "No due time")}</div>
      <div class="flow-card-foot">
        <span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status || "due")}</span>
      </div>
    </article>
  `;
}

function handoverCard(item = {}) {
  return `
    <article class="flow-card">
      <div class="flow-card-title">${escapeHtml(item.title || "Handover")}</div>
      <div class="flow-card-meta">${escapeHtml(item.time || "No time recorded")}</div>
      <div class="flow-card-body">${escapeHtml(item.detail || "No handover detail recorded.")}</div>
    </article>
  `;
}

function overdueCard(item = {}) {
  return `
    <article class="priority-card priority-high">
      <div class="priority-card-top">
        <div class="priority-title">${escapeHtml(item.title || "Overdue item")}</div>
        <span class="badge badge-danger">Overdue</span>
      </div>
      <div class="priority-meta">${escapeHtml(item.young_person_name || "Home-wide")}</div>
      <div class="priority-body">${escapeHtml(titleCaseLabel(item.type || "review"))}</div>
    </article>
  `;
}

function renderCollection(title, kicker, items, mapFn, actionBtn = "") {
  return `
    <section class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-kicker">${escapeHtml(kicker)}</div>
          <h3>${escapeHtml(title)}</h3>
        </div>
        ${actionBtn}
      </div>
      <div class="surface-body">
        <div class="records-wrap">
          ${items.length ? items.map(mapFn).join("") : `<div class="empty-state">No records found.</div>`}
        </div>
      </div>
    </section>
  `;
}

function setPageHeader() {
  const conf = CONFIG.primaryTabs[state.primaryTab];
  UI.pageTitle.textContent = conf.label;
  UI.pageSubtitle.textContent = conf.subtitle;
}

function setHero() {
  const yp = state.profile?.young_person;
  if (!yp) {
    UI.heroAvatar.textContent = "OS";
    UI.heroTitle.textContent = "IndiCare OS";
    UI.heroDescription.textContent = "Select a young person to begin.";
    UI.heroBadges.innerHTML = "";
    return;
  }

  const name = yp.preferred_name || fullName(yp);
  UI.heroAvatar.textContent = initials(name);
  UI.heroTitle.textContent = name;
  UI.heroDescription.textContent = `${yp.placement_status || "Placement not set"} • DOB ${fmtDate(yp.date_of_birth)}`;
  UI.heroBadges.innerHTML = `
    <span class="badge ${badgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk set")}</span>
    <span class="badge badge-neutral">${escapeHtml(yp.gender || "No gender set")}</span>
  `;
}

function renderPrimaryNav() {
  UI.primaryNav.innerHTML = Object.entries(CONFIG.primaryTabs)
    .map(([key, tab]) => `
      <button class="${state.primaryTab === key ? "active" : ""}" data-primary="${key}">
        ${escapeHtml(tab.label)}
      </button>
    `)
    .join("");

  UI.primaryNav.querySelectorAll("[data-primary]").forEach((btn) => {
    btn.onclick = () => {
      state.primaryTab = btn.dataset.primary;
      const secondary = CONFIG.primaryTabs[state.primaryTab].secondary;
      state.secondaryTab = secondary ? Object.keys(secondary)[0] : "";
      renderApp();
    };
  });
}

function renderSecondaryNav() {
  const secondary = CONFIG.primaryTabs[state.primaryTab].secondary;
  if (!secondary) {
    UI.secondaryNavWrap.classList.add("hidden");
    UI.secondaryNav.innerHTML = "";
    return;
  }

  UI.secondaryNavWrap.classList.remove("hidden");
  UI.secondaryNav.innerHTML = Object.entries(secondary)
    .map(([key, item]) => `
      <button class="${state.secondaryTab === key ? "active" : ""}" data-secondary="${key}">
        ${escapeHtml(item.label)}
      </button>
    `)
    .join("");

  UI.secondaryNav.querySelectorAll("[data-secondary]").forEach((btn) => {
    btn.onclick = () => {
      state.secondaryTab = btn.dataset.secondary;
      renderContent();
      renderSecondaryNav();
    };
  });
}

function renderGlobalActions() {
  const conf = CONFIG.primaryTabs[state.primaryTab];
  const actions = conf.actions || [];

  UI.globalActions.innerHTML = actions
    .map((a) => `
      <button class="btn btn-${a.kind === "primary" ? "primary" : "ghost"}" data-action="${a.id}">
        ${escapeHtml(a.label)}
      </button>
    `)
    .join("");

  UI.globalActions.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleGlobalAction(btn.dataset.action);
  });
}

function renderYoungPersonSelect() {
  if (!UI.youngPersonSelect) return;

  if (!state.youngPeople.length) {
    UI.youngPersonSelect.innerHTML = `<option value="">No young people found</option>`;
    return;
  }

  if (!state.selectedYoungPersonId) {
    state.selectedYoungPersonId = state.youngPeople[0].id;
  }

  UI.youngPersonSelect.innerHTML = state.youngPeople
    .map((yp) => `
      <option value="${yp.id}" ${state.selectedYoungPersonId === yp.id ? "selected" : ""}>
        ${escapeHtml(fullName(yp))}
      </option>
    `)
    .join("");

  UI.youngPersonSelect.onchange = async (e) => {
    state.selectedYoungPersonId = Number(e.target.value);
    await loadSelectedYoungPerson();
    renderApp();
  };
}

function selectedYoungPeopleSummary() {
  const yp = state.profile?.young_person;
  const alerts = safeArray(state.profile?.alerts);
  const plans = safeArray(state.cache?.plans?.items);
  const risks = safeArray(state.cache?.risk?.items || state.cache?.risk);
  const incidents = safeArray(state.cache?.incidents?.items);
  const daily = safeArray(state.cache?.daily?.items);
  const compliance = safeArray(state.cache?.compliance?.compliance_items);

  if (!yp) {
    return `<div class="empty-state">Select a young person to view their therapeutic care snapshot.</div>`;
  }

  const overdueCompliance = compliance.filter(
    (x) => String(x.compliance_status || "").toLowerCase() === "overdue"
  ).length;

  const submittedCount =
    daily.filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted").length +
    incidents.filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted").length +
    plans.filter((x) => String(x.approval_status || "").toLowerCase() === "submitted").length;

  return `
    <div class="yp-focus-card">
      <div class="yp-focus-head">
        <div>
          <div class="surface-kicker">Selected young person</div>
          <h3>${escapeHtml(yp.preferred_name || fullName(yp) || "Young person")}</h3>
        </div>
        <div class="hero-badges">
          <span class="badge ${badgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk set")}</span>
          <span class="badge badge-neutral">${escapeHtml(yp.placement_status || "Placement not set")}</span>
        </div>
      </div>

      <div class="yp-focus-grid">
        ${summaryCard("Open alerts", alerts.length, alerts.length ? "danger" : "neutral")}
        ${summaryCard("Active plans", plans.length, plans.length ? "success" : "neutral")}
        ${summaryCard("Active risks", risks.length, risks.length ? "warning" : "neutral")}
        ${summaryCard("Incidents", incidents.length, incidents.length ? "warning" : "neutral")}
        ${summaryCard("Submitted for review", submittedCount, submittedCount ? "warning" : "neutral")}
        ${summaryCard("Overdue compliance", overdueCompliance, overdueCompliance ? "danger" : "success")}
      </div>
    </div>
  `;
}

function managementQueueHome() {
  const daily = safeArray(state.cache?.daily?.items)
    .filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted")
    .map((x) => ({
      title: x.title || "Daily note",
      meta: `${fmtDate(x.note_date)} • ${x.shift_type || "shift"}`,
      body: x.summary || x.presentation || "Submitted daily note"
    }));

  const incidents = safeArray(state.cache?.incidents?.items)
    .filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted")
    .map((x) => ({
      title: x.title || "Incident",
      meta: `${fmtDateTime(x.occurred_at)} • ${x.severity || "medium"}`,
      body: x.description || "Submitted incident"
    }));

  const plans = safeArray(state.cache?.plans?.items)
    .filter((x) => String(x.approval_status || "").toLowerCase() === "submitted")
    .map((x) => ({
      title: x.title || "Support plan",
      meta: `${x.plan_type || "plan"} • review ${fmtDate(x.review_due_at)}`,
      body: x.summary || x.formulation || "Submitted support plan"
    }));

  const queue = [...daily, ...incidents, ...plans].slice(0, 8);

  if (!queue.length) {
    return `<div class="empty-state">No submitted items currently awaiting management review.</div>`;
  }

  return `
    <div class="records-wrap">
      ${queue
        .map(
          (q) => `
            <article class="record-card">
              <div class="record-card-header">
                <div>
                  <div class="record-title">${escapeHtml(q.title)}</div>
                  <div class="record-meta">${escapeHtml(q.meta)}</div>
                </div>
                <span class="badge badge-warning">Review due</span>
              </div>
              <div class="record-body">${escapeHtml(q.body)}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHome() {
  const c = state.command || {};
  const summary = c.summary || {};
  const alerts = safeArray(c.alerts);
  const tasks = safeArray(c.tasks);
  const meds = safeArray(c.meds_due);
  const handover = safeArray(c.handover);
  const overdue = safeArray(c.overdue);

  return `
    <div class="workspace-grid home-command-grid">
      <section class="surface surface-hero">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Command Centre</div>
            <h3>Home operational picture</h3>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="App.primaryTabTo('youngPeople', 'recording')">Go to Recording</button>
            <button class="btn btn-ghost" onclick="App.primaryTabTo('quality', 'management')">Open Review Queue</button>
          </div>
        </div>
        <div class="surface-body">
          <div class="dashboard-stat-grid">
            ${summaryCard("Children in home", summary.children_in_home ?? "—", "neutral")}
            ${summaryCard("Staff on shift", summary.staff_on_shift ?? "—", "neutral")}
            ${summaryCard("High risk alerts", summary.high_risk_alerts ?? "—", (summary.high_risk_alerts || 0) > 0 ? "danger" : "success")}
            ${summaryCard("Open incidents", summary.open_incidents ?? "—", (summary.open_incidents || 0) > 0 ? "warning" : "success")}
            ${summaryCard("Safeguarding items", summary.open_safeguarding_items ?? "—", (summary.open_safeguarding_items || 0) > 0 ? "danger" : "success")}
            ${summaryCard("Manager reviews due", summary.manager_reviews_due ?? "—", (summary.manager_reviews_due || 0) > 0 ? "warning" : "success")}
            ${summaryCard("Overdue reviews", summary.overdue_reviews ?? "—", (summary.overdue_reviews || 0) > 0 ? "danger" : "success")}
            ${summaryCard("Plans overdue", summary.plans_overdue ?? "—", (summary.plans_overdue || 0) > 0 ? "danger" : "success")}
            ${summaryCard("Documents due", summary.documents_due ?? "—", (summary.documents_due || 0) > 0 ? "warning" : "success")}
            ${summaryCard("Medication due this shift", summary.medication_due_this_shift ?? "—", (summary.medication_due_this_shift || 0) > 0 ? "warning" : "neutral")}
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Therapeutic care focus</div>
            <h3>Selected young person snapshot</h3>
          </div>
        </div>
        <div class="surface-body">
          ${selectedYoungPeopleSummary()}
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Priority alerts</div>
            <h3>Safeguarding and risk</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="records-wrap">
            ${alerts.length ? alerts.map(alertCard).join("") : `<div class="empty-state">No current safeguarding or risk alerts.</div>`}
            ${overdue.length ? overdue.map(overdueCard).join("") : ""}
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Shift flow</div>
            <h3>Tasks, meds and handover</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="flow-stack">
            <div class="flow-group">
              <div class="flow-group-title">Tasks</div>
              <div class="records-wrap">
                ${tasks.length ? tasks.map(taskCard).join("") : `<div class="empty-state">No open tasks.</div>`}
              </div>
            </div>

            <div class="flow-group">
              <div class="flow-group-title">Medication due</div>
              <div class="records-wrap">
                ${meds.length ? meds.map(medCard).join("") : `<div class="empty-state">No medication due in this view.</div>`}
              </div>
            </div>

            <div class="flow-group">
              <div class="flow-group-title">Handover</div>
              <div class="records-wrap">
                ${handover.length ? handover.map(handoverCard).join("") : `<div class="empty-state">No handover summary loaded.</div>`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="surface surface-wide">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Leadership and oversight</div>
            <h3>Management review queue</h3>
          </div>
          <button class="btn btn-ghost" onclick="App.primaryTabTo('quality', 'management')">Open full queue</button>
        </div>
        <div class="surface-body">
          ${managementQueueHome()}
        </div>
      </section>
    </div>
  `;
}

function renderOverview() {
  const yp = state.profile?.young_person;
  if (!yp) return `<div class="empty-state">Select a young person to view profile.</div>`;

  const identity = state.profile.identity_profile?.[0] || {};
  const communication = state.profile.communication_profile?.[0] || {};
  const alerts = state.profile.alerts || [];

  return `
    <div class="workspace-grid split-grid">
      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Profile</div>
            <h3>Core information</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="kv">
            <div class="kv-label">Full name</div><div>${escapeHtml(fullName(yp))}</div>
            <div class="kv-label">Preferred name</div><div>${escapeHtml(yp.preferred_name || "—")}</div>
            <div class="kv-label">DOB</div><div>${fmtDate(yp.date_of_birth)}</div>
            <div class="kv-label">Gender</div><div>${escapeHtml(yp.gender || "—")}</div>
            <div class="kv-label">Ethnicity</div><div>${escapeHtml(yp.ethnicity || "—")}</div>
            <div class="kv-label">NHS number</div><div>${escapeHtml(yp.nhs_number || "—")}</div>
            <div class="kv-label">Local ID number</div><div>${escapeHtml(yp.local_id_number || "—")}</div>
            <div class="kv-label">Admission date</div><div>${fmtDate(yp.admission_date)}</div>
            <div class="kv-label">Placement status</div><div>${escapeHtml(yp.placement_status || "—")}</div>
            <div class="kv-label">Summary risk level</div><div>${escapeHtml(yp.summary_risk_level || "—")}</div>
          </div>

          <div class="section-block">
            <h4>Communication</h4>
            <div class="simple-item"><strong>Communication style</strong><br>${escapeHtml(communication.communication_style || "—")}</div>
            <div class="simple-item"><strong>Sensory profile</strong><br>${escapeHtml(communication.sensory_profile || "—")}</div>
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Identity and alerts</div>
            <h3>Therapeutic understanding</h3>
          </div>
          <button class="btn btn-primary" onclick="App.openPhotoUpload()">Upload Photo</button>
        </div>
        <div class="surface-body">
          <div class="section-block">
            <h4>Identity</h4>
            <div class="simple-item"><strong>Interests</strong><br>${escapeHtml(identity.interests || "—")}</div>
            <div class="simple-item"><strong>Strengths</strong><br>${escapeHtml(identity.strengths_summary || "—")}</div>
            <div class="simple-item"><strong>What matters to me</strong><br>${escapeHtml(identity.what_matters_to_me || "—")}</div>
          </div>

          <div class="section-block">
            <h4>Alerts</h4>
            ${
              alerts.length
                ? alerts.map((a) => `<div class="alert-item"><strong>${escapeHtml(a.title || a.alert_type || "Alert")}</strong><br>${escapeHtml(a.description || "")}</div>`).join("")
                : `<div class="empty-state">No alerts recorded.</div>`
            }
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderRecording() {
  const daily = state.cache.daily?.items || [];
  const incidents = state.cache.incidents?.items || [];
  const handover = state.cache.handover || [];

  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Daily notes",
        "Daily living",
        daily,
        (n) =>
          card(
            n.title || "Daily note",
            `${fmtDate(n.note_date)} • ${n.shift_type || "shift"} • ${n.workflow_status || "draft"}`,
            n.summary || n.presentation || "Daily note recorded",
            `
              <button class="btn btn-secondary" onclick="App.openForm('daily', ${n.id})">Edit</button>
              <button class="btn btn-ghost" onclick="App.submitDaily(${n.id})">Submit</button>
              <button class="btn btn-ghost" onclick="App.archiveDaily(${n.id})">Archive</button>
            `
          ),
        `<button class="btn btn-primary" onclick="App.openForm('daily')">New Daily Note</button>`
      )}

      ${renderCollection(
        "Incidents",
        "Safeguarding",
        incidents,
        (n) =>
          card(
            n.title || "Incident",
            `${fmtDateTime(n.occurred_at)} • ${n.severity || "medium"} • ${n.workflow_status || "draft"}`,
            n.description || "Incident recorded",
            `
              <button class="btn btn-secondary" onclick="App.openForm('incident', ${n.id})">Edit</button>
              <button class="btn btn-ghost" onclick="App.submitIncident(${n.id})">Submit</button>
              <button class="btn btn-ghost" onclick="App.archiveIncident(${n.id})">Archive</button>
            `
          ),
        `<button class="btn btn-primary" onclick="App.openForm('incident')">New Incident</button>`
      )}

      ${renderCollection(
        "Handover",
        "Shift continuity",
        handover,
        (h) =>
          card(
            h.title || "Handover",
            `${fmtDate(h.handover_date)} • ${h.shift_type || "shift"} • ${h.status || "draft"}`,
            h.summary_text || "Handover recorded",
            `
              <button class="btn btn-ghost" onclick="App.approveHandover(${h.id})">Approve</button>
              <button class="btn btn-ghost" onclick="App.archiveHandover(${h.id})">Archive</button>
            `
          ),
        `<button class="btn btn-primary" onclick="App.generateHandover()">Generate Handover</button>`
      )}
    </div>
  `;
}

function renderHealth() {
  const data = state.cache.health || {};
  const profile = data.health_profile || {};
  const records = data.health_records || [];
  const medProfiles = data.medication_profiles || [];
  const medRecords = data.medication_records || [];

  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Health records",
        "Health",
        records,
        (r) => card(r.title || "Health record", `${fmtDateTime(r.event_datetime)} • ${r.record_type || "record"}`, r.summary || r.outcome || "Health record")
      )}

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Profile</div>
            <h3>Health profile</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="simple-item"><strong>GP</strong><br>${escapeHtml(profile.gp_name || "—")}</div>
          <div class="simple-item"><strong>Allergies</strong><br>${escapeHtml(profile.allergies || "—")}</div>
          <div class="simple-item"><strong>Diagnoses</strong><br>${escapeHtml(profile.diagnoses || "—")}</div>
        </div>
      </section>

      ${renderCollection(
        "Medication profiles",
        "Medication",
        medProfiles,
        (m) => card(m.medication_name || "Medication", `${m.dose || "—"} • ${m.frequency || "—"}`, m.reason || "")
      )}

      ${renderCollection(
        "Medication records",
        "Administration",
        medRecords,
        (m) => card(m.medication_name || "Medication", `${fmtDateTime(m.scheduled_time)} • ${m.status || "recorded"}`, m.dose || "")
      )}
    </div>
  `;
}

function renderEducation() {
  const data = state.cache.education || {};
  const profile = data.education_profile || {};
  const records = data.education_records || [];

  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Education records",
        "Education",
        records,
        (r) => card(r.title || "Education record", `${fmtDate(r.record_date)} • ${r.attendance_status || "attendance"}`, r.summary || r.learning_engagement || "Education record")
      )}

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Profile</div>
            <h3>Education profile</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="simple-item"><strong>School</strong><br>${escapeHtml(profile.school_name || "—")}</div>
          <div class="simple-item"><strong>Year group</strong><br>${escapeHtml(profile.year_group || "—")}</div>
          <div class="simple-item"><strong>Status</strong><br>${escapeHtml(profile.education_status || "—")}</div>
        </div>
      </section>
    </div>
  `;
}

function renderFamily() {
  const data = state.cache.family || {};
  const records = data.family_contact_records || [];
  const contacts = data.contacts || [];

  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Family contact records",
        "Family and relationships",
        records,
        (r) => card(r.title || "Family contact", `${fmtDateTime(r.contact_datetime)} • ${r.contact_type || "contact"}`, r.summary || r.concerns || "Family contact recorded")
      )}

      ${renderCollection(
        "Contacts",
        "Approved network",
        contacts,
        (c) => card(c.full_name || "Contact", `${c.relationship_to_child || "Relationship"} • ${c.is_approved_contact ? "Approved" : "Not approved"}`, c.contact_notes || c.phone_number || c.email || "")
      )}
    </div>
  `;
}

function renderKeywork() {
  const items = state.cache.keywork?.items || [];
  return renderCollection(
    "Keywork sessions",
    "Direct work",
    items,
    (k) =>
      card(
        k.title || "Keywork session",
        `${fmtDate(k.session_date)} • ${k.workflow_status || "draft"}`,
        k.summary || "Keywork session recorded"
      )
  );
}

function renderPlans() {
  const items = state.cache.plans?.items || [];
  return renderCollection(
    "Support plans",
    "Planning",
    items,
    (p) =>
      card(
        p.title || "Support plan",
        `${p.plan_type || "plan"} • review ${fmtDate(p.review_due_at)} • ${p.status || "draft"}`,
        p.summary || p.formulation || "Support plan recorded",
        `
          <button class="btn btn-secondary" onclick="App.openForm('plan', ${p.id})">Edit</button>
          <button class="btn btn-ghost" onclick="App.submitPlan(${p.id})">Submit</button>
          <button class="btn btn-ghost" onclick="App.approvePlan(${p.id})">Approve</button>
          <button class="btn btn-ghost" onclick="App.archivePlan(${p.id})">Archive</button>
        `
      ),
    `<button class="btn btn-primary" onclick="App.openForm('plan')">New Support Plan</button>`
  );
}

function renderRisk() {
  const items = Array.isArray(state.cache.risk) ? state.cache.risk : (state.cache.risk?.items || []);
  return renderCollection(
    "Risk assessments",
    "Risk management",
    items,
    (r) =>
      card(
        r.title || "Risk assessment",
        `${r.category || "risk"} • ${r.severity || "medium"} • review ${fmtDate(r.review_date)}`,
        r.concern_summary || "Risk assessment recorded",
        `<button class="btn btn-secondary" onclick="App.openForm('risk', ${r.id})">Edit</button>`
      ),
    `<button class="btn btn-primary" onclick="App.openForm('risk')">New Risk Assessment</button>`
  );
}

function renderTimeline() {
  const items = state.cache.chronology?.items || [];
  return renderCollection(
    "Chronology",
    "Joined-up timeline",
    items,
    (e) => card(e.title || "Chronology event", `${fmtDateTime(e.event_datetime)} • ${e.category || "event"}`, e.summary || "Chronology event"),
    `<button class="btn btn-primary" onclick="App.rebuildChronology()">Rebuild Chronology</button>`
  );
}

function renderDocuments() {
  const items = Array.isArray(state.cache.statutory) ? state.cache.statutory : [];
  return renderCollection(
    "Statutory documents",
    "Documents",
    items,
    (d) => card(d.title || "Document", `${d.document_type || "document"} • review ${fmtDate(d.review_date)}`, d.description || d.status || "")
  );
}

function renderStandards() {
  const summary = Array.isArray(state.cache.standards) ? state.cache.standards : [];
  const evidence = Array.isArray(state.cache.standardsEvidence) ? state.cache.standardsEvidence : [];

  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Standards summary",
        "Quality standards",
        summary,
        (s) => card(`${s.code} • ${s.short_label || s.title}`, `Display order ${s.display_order || "—"}`, `${s.linked_record_count || 0} linked records`),
        `<button class="btn btn-primary" onclick="App.rebuildStandards()">Rebuild Evidence</button>`
      )}

      ${renderCollection(
        "Standards evidence",
        "Evidence",
        evidence,
        (e) => card(`${e.standard_code} • ${e.standard_short_label || e.standard_title}`, `${e.source_table || "source"} #${e.source_id || "—"}`, e.rationale || "No rationale")
      )}
    </div>
  `;
}

function renderCompliance() {
  const items = state.cache.compliance?.compliance_items || [];
  return renderCollection(
    "Compliance",
    "Reviews and due dates",
    items,
    (c) => card(c.title || "Compliance item", `${c.compliance_type || "item"} • due ${fmtDate(c.due_date)} • ${c.compliance_status || "ok"}`, `${c.status || ""} ${c.approval_status || ""}`.trim())
  );
}

function renderAI() {
  const items = state.cache.aiHistory?.notes || state.cache.aiHistory || [];
  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "AI / therapeutic notes",
        "Therapeutic recording",
        items,
        (n) => card(n.title || "AI note", `${n.young_person_name || "No young person"} • ${n.record_date || "No date"}`, n.excerpt || n.final_note || "")
      )}
      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Practice support</div>
            <h3>Assistant workspace</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="simple-item">
            AI notes are available in history. The live therapeutic writing assistant can be added into this modal system next.
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderManagement() {
  const daily = state.cache.daily?.items || [];
  const incidents = state.cache.incidents?.items || [];
  const plans = state.cache.plans?.items || [];

  const queue = [
    ...daily.filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted"),
    ...incidents.filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted"),
    ...plans.filter((x) => String(x.approval_status || "").toLowerCase() === "submitted")
  ];

  return renderCollection(
    "Management queue",
    "Leadership and oversight",
    queue,
    (q) => card(q.title || "Review item", q.workflow_status || q.approval_status || "", q.summary || q.description || "Awaiting review")
  );
}

function renderArchive() {
  const daily = state.cache.dailyArchive?.items || [];
  const incidents = state.cache.incidentArchive?.items || [];
  const plans = state.cache.plansArchive?.items || [];
  const risk = Array.isArray(state.cache.riskArchive) ? state.cache.riskArchive : [];

  const merged = [
    ...daily.map((x) => ({ title: x.title || "Daily note", meta: fmtDate(x.note_date), body: x.summary || "" })),
    ...incidents.map((x) => ({ title: x.title || "Incident", meta: fmtDateTime(x.occurred_at), body: x.description || "" })),
    ...plans.map((x) => ({ title: x.title || "Plan", meta: fmtDate(x.review_due_at), body: x.summary || "" })),
    ...risk.map((x) => ({ title: x.title || "Risk", meta: fmtDate(x.review_date), body: x.concern_summary || "" }))
  ];

  return renderCollection("Archive", "Archived records", merged, (x) => card(x.title, x.meta, x.body));
}

function renderInspection() {
  const inspection = state.cache.inspection;
  if (!inspection) {
    return `
      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Inspection readiness</div>
            <h3>Inspection pack</h3>
          </div>
          <button class="btn btn-primary" onclick="App.loadInspection()">Load Inspection Data</button>
        </div>
        <div class="surface-body">
          <div class="empty-state">Select a young person and load the inspection pack.</div>
        </div>
      </section>
    `;
  }

  return `
    <div class="workspace-grid split-grid">
      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Inspection readiness</div>
            <h3>Inspection overview</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="records-wrap">
            ${summaryCard("Plans", (inspection.plans || []).length, "neutral")}
            ${summaryCard("Risks", (inspection.risks || []).length, "neutral")}
            ${summaryCard("Daily notes", (inspection.daily_notes || []).length, "neutral")}
            ${summaryCard("Incidents", (inspection.incidents || []).length, "neutral")}
            ${summaryCard("Health records", (inspection.health_records || []).length, "neutral")}
            ${summaryCard("Education records", (inspection.education_records || []).length, "neutral")}
            ${summaryCard("Family records", (inspection.family_records || []).length, "neutral")}
            ${summaryCard("Keywork", (inspection.keywork_sessions || []).length, "neutral")}
            ${summaryCard("Chronology", (inspection.chronology || []).length, "neutral")}
          </div>
        </div>
      </section>

      ${renderCollection(
        "Inspection evidence",
        "Due dates and compliance",
        (inspection.compliance_items || []).slice(0, 10),
        (item) => card(item.title || item.compliance_type, `${fmtDate(item.due_date)} • ${item.compliance_status || "ok"}`, item.status || "")
      )}
    </div>
  `;
}

function renderOperations() {
  return `
    <section class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-kicker">Operations</div>
          <h3>Rostering</h3>
        </div>
      </div>
      <div class="surface-body">
        <div class="simple-item">
          Rostering routes are available. This section can be turned into a dedicated rota board next.
        </div>
      </div>
    </section>
  `;
}

function renderContent() {
  let html = `<div class="empty-state">Nothing selected.</div>`;

  if (state.primaryTab === "home") {
    html = renderHome();
  }

  if (state.primaryTab === "youngPeople") {
    if (!state.selectedYoungPersonId) {
      html = `<div class="empty-state">Select a young person to continue.</div>`;
    } else {
      if (state.secondaryTab === "overview") html = renderOverview();
      if (state.secondaryTab === "recording") html = renderRecording();
      if (state.secondaryTab === "health") html = renderHealth();
      if (state.secondaryTab === "education") html = renderEducation();
      if (state.secondaryTab === "family") html = renderFamily();
      if (state.secondaryTab === "keywork") html = renderKeywork();
      if (state.secondaryTab === "plans") html = renderPlans();
      if (state.secondaryTab === "risk") html = renderRisk();
      if (state.secondaryTab === "timeline") html = renderTimeline();
      if (state.secondaryTab === "documents") html = renderDocuments();
    }
  }

  if (state.primaryTab === "quality") {
    if (!state.selectedYoungPersonId) {
      html = `<div class="empty-state">Select a young person to continue.</div>`;
    } else {
      if (state.secondaryTab === "standards") html = renderStandards();
      if (state.secondaryTab === "compliance") html = renderCompliance();
      if (state.secondaryTab === "ai") html = renderAI();
      if (state.secondaryTab === "management") html = renderManagement();
      if (state.secondaryTab === "archive") html = renderArchive();
    }
  }

  if (state.primaryTab === "inspection") {
    html = state.selectedYoungPersonId
      ? renderInspection()
      : `<div class="empty-state">Select a young person to continue.</div>`;
  }

  if (state.primaryTab === "operations") {
    html = renderOperations();
  }

  UI.content.innerHTML = html;
}

function renderApp() {
  setPageHeader();
  renderPrimaryNav();
  renderSecondaryNav();
  renderGlobalActions();
  renderYoungPersonSelect();
  setHero();
  renderContent();
}

function buildField(field, data = {}) {
  const rawValue = data[field.name] ?? field.value ?? "";
  const fieldValue =
    field.type === "date" ? toDateInput(rawValue)
      : field.type === "datetime-local" ? toDateTimeInput(rawValue)
        : rawValue;

  if (field.type === "textarea") {
    return `
      <div class="field">
        <label>${escapeHtml(field.label)}</label>
        <textarea data-field="${field.name}" rows="4">${escapeHtml(fieldValue)}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="field">
        <label>${escapeHtml(field.label)}</label>
        <select data-field="${field.name}">
          ${(field.options || [])
            .map((opt) => `<option value="${escapeHtml(opt)}" ${String(fieldValue) === String(opt) ? "selected" : ""}>${escapeHtml(opt)}</option>`)
            .join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="field">
      <label>${escapeHtml(field.label)}</label>
      <input data-field="${field.name}" type="${field.type || "text"}" value="${escapeHtml(fieldValue)}" />
    </div>
  `;
}

function openModal(title, html) {
  UI.modalTitle.textContent = title;
  UI.modalContent.innerHTML = html;
  UI.modalStatus.textContent = "";
  UI.modal.classList.remove("hidden");
}

function closeModal() {
  UI.modal.classList.add("hidden");
  UI.modalTitle.textContent = "Editor";
  UI.modalContent.innerHTML = "";
  UI.modalStatus.textContent = "";
  state.modal.key = null;
  state.modal.recordId = null;
}

async function openForm(formKey, recordId = null) {
  const schema = FORM_SCHEMAS[formKey];
  if (!schema) return;

  state.modal.key = formKey;
  state.modal.recordId = recordId;

  let data = {};
  if (recordId && schema.load) {
    data = await api(schema.load(recordId));
  }

  const fieldsHtml = schema.fields.map((f) => buildField(f, data)).join("");

  openModal(
    recordId ? `Edit ${schema.title}` : `New ${schema.title}`,
    `
      <div class="form-grid two">${fieldsHtml}</div>
      <div class="action-row">
        <button class="btn btn-primary" id="modalSaveBtn">Save</button>
      </div>
    `
  );

  $("modalSaveBtn").onclick = saveCurrentForm;
}

async function saveCurrentForm() {
  const schema = FORM_SCHEMAS[state.modal.key];
  if (!schema) return;

  try {
    const payload = schema.buildPayload();

    if (state.modal.recordId) {
      await putJson(schema.save.update(state.modal.recordId), payload);
    } else {
      await postJson(schema.save.create, payload);
    }

    UI.modalStatus.textContent = "Saved successfully.";
    if (state.selectedYoungPersonId) {
      await loadSelectedYoungPerson();
      renderApp();
    }
    setTimeout(closeModal, 500);
  } catch (error) {
    UI.modalStatus.textContent = error.message || "Save failed.";
  }
}

function openSimpleMessage(message) {
  openModal("Info", `<div class="simple-item">${escapeHtml(message)}</div>`);
}

function openPhotoUpload() {
  openModal(
    "Upload Young Person Photo",
    `
      <div class="field">
        <label>Photo</label>
        <input id="photoFileInput" type="file" accept="image/*" />
      </div>
      <div class="action-row">
        <button class="btn btn-primary" id="savePhotoBtn">Upload Photo</button>
      </div>
    `
  );

  $("savePhotoBtn").onclick = async () => {
    try {
      const file = $("photoFileInput").files?.[0];
      if (!file || !state.selectedYoungPersonId) {
        UI.modalStatus.textContent = "Please choose a file.";
        return;
      }

      const fd = new FormData();
      fd.append("photo", file);

      await api(CONFIG.endpoints.photo(state.selectedYoungPersonId), {
        method: "POST",
        body: fd
      });

      UI.modalStatus.textContent = "Photo uploaded.";
      await loadSelectedYoungPerson();
      renderApp();
      setTimeout(closeModal, 500);
    } catch (error) {
      UI.modalStatus.textContent = error.message || "Upload failed.";
    }
  };
}

function handleGlobalAction(action) {
  if (action === "refreshCommand") {
    loadCommand().then(renderApp);
  }
  if (action === "openAiInfo") {
    openSimpleMessage("AI note builder can be added back into this streamlined modal system next.");
  }
}

async function loadYoungPeople() {
  const data = await api(CONFIG.endpoints.youngPeople);
  state.youngPeople = Array.isArray(data.items) ? data.items : [];
}

async function loadCommand() {
  state.command = await api(CONFIG.endpoints.command);
}

async function loadAiHistory() {
  try {
    const data = await api(CONFIG.endpoints.ai.history);
    state.cache.aiHistory = data.notes || [];
  } catch {
    state.cache.aiHistory = [];
  }
}

async function loadSelectedYoungPerson() {
  const id = state.selectedYoungPersonId;
  if (!id) return;

  const [
    profile,
    daily,
    incidents,
    handover,
    health,
    education,
    family,
    keywork,
    plans,
    risk,
    chronology,
    standards,
    standardsEvidence,
    compliance,
    statutory,
    dailyArchive,
    incidentArchive,
    plansArchive,
    riskArchive
  ] = await Promise.all([
    api(CONFIG.endpoints.profile(id)),
    api(CONFIG.endpoints.daily.list(id)),
    api(CONFIG.endpoints.incidents.list(id)),
    api(CONFIG.endpoints.handover.list(id)),
    api(CONFIG.endpoints.health.list(id)),
    api(CONFIG.endpoints.education.list(id)),
    api(CONFIG.endpoints.family.list(id)),
    api(CONFIG.endpoints.keywork.list(id)),
    api(CONFIG.endpoints.plans.list(id)),
    api(CONFIG.endpoints.risk.list(id)),
    api(CONFIG.endpoints.chronology.list(id)),
    api(CONFIG.endpoints.standards.summary(id)),
    api(CONFIG.endpoints.standards.evidence(id)),
    api(CONFIG.endpoints.compliance(id)).catch(() => ({ compliance_items: [] })),
    api(CONFIG.endpoints.statutory.list(id)),
    api(CONFIG.endpoints.daily.archiveList(id)),
    api(CONFIG.endpoints.incidents.archiveList(id)),
    api(CONFIG.endpoints.plans.archiveList(id)),
    api(CONFIG.endpoints.risk.archiveList(id))
  ]);

  state.profile = profile;
  state.cache = {
    ...state.cache,
    daily,
    incidents,
    handover,
    health,
    education,
    family,
    keywork,
    plans,
    risk,
    chronology,
    standards,
    standardsEvidence,
    compliance,
    statutory,
    dailyArchive,
    incidentArchive,
    plansArchive,
    riskArchive
  };
}

async function rebuildChronology() {
  if (!state.selectedYoungPersonId) return;
  await postJson(CONFIG.endpoints.chronology.rebuild(state.selectedYoungPersonId), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function rebuildStandards() {
  if (!state.selectedYoungPersonId) return;
  await postJson(CONFIG.endpoints.standards.rebuild(state.selectedYoungPersonId), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function generateHandover() {
  if (!state.selectedYoungPersonId) return;
  await postJson(CONFIG.endpoints.handover.generate(state.selectedYoungPersonId), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function approveHandover(id) {
  await api(CONFIG.endpoints.handover.approve(id), { method: "PUT" });
  await loadSelectedYoungPerson();
  renderApp();
}

async function archiveHandover(id) {
  await api(CONFIG.endpoints.handover.archive(id), { method: "PUT" });
  await loadSelectedYoungPerson();
  renderApp();
}

async function submitDaily(id) {
  await postJson(CONFIG.endpoints.daily.submit(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function archiveDaily(id) {
  await postJson(CONFIG.endpoints.daily.archive(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function submitIncident(id) {
  await postJson(CONFIG.endpoints.incidents.submit(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function archiveIncident(id) {
  await postJson(CONFIG.endpoints.incidents.archive(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function submitPlan(id) {
  await postJson(CONFIG.endpoints.plans.submit(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function approvePlan(id) {
  await postJson(CONFIG.endpoints.plans.approve(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function archivePlan(id) {
  await postJson(CONFIG.endpoints.plans.archive(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function loadInspection() {
  if (!state.selectedYoungPersonId) return;
  state.cache.inspection = await api(CONFIG.endpoints.inspection(state.selectedYoungPersonId));
  state.primaryTab = "inspection";
  renderApp();
}

function primaryTabTo(primary, secondary = "") {
  state.primaryTab = primary;
  const secondaryTabs = CONFIG.primaryTabs[primary]?.secondary || null;
  state.secondaryTab = secondary || (secondaryTabs ? Object.keys(secondaryTabs)[0] : "");
  renderApp();
}

function bindGlobalEvents() {
  $("refreshBtn").onclick = async () => {
    await Promise.all([loadYoungPeople(), loadCommand(), loadAiHistory()]);
    if (state.selectedYoungPersonId) await loadSelectedYoungPerson();
    renderApp();
  };

  $("logoutBtn").onclick = () => {
    localStorage.removeItem("chos_access_token");
    localStorage.removeItem("chos_user");
    window.location.href = "/oslogin.html";
  };

  $("closeModalBtn").onclick = closeModal;

  UI.modal.onclick = (e) => {
    if (e.target === UI.modal) closeModal();
  };
}

const App = {
  openForm,
  openPhotoUpload,
  openSimpleMessage,
  rebuildChronology,
  rebuildStandards,
  generateHandover,
  approveHandover,
  archiveHandover,
  submitDaily,
  archiveDaily,
  submitIncident,
  archiveIncident,
  submitPlan,
  approvePlan,
  archivePlan,
  loadInspection,
  primaryTabTo
};

async function init() {
  requireAuth();

  UI.userChip.textContent = currentUser().email || "Unknown user";

  const homeSecondary = CONFIG.primaryTabs.home.secondary;
  state.secondaryTab = homeSecondary ? Object.keys(homeSecondary)[0] : "";

  bindGlobalEvents();

  await Promise.all([loadYoungPeople(), loadCommand(), loadAiHistory()]);

  if (state.youngPeople.length) {
    state.selectedYoungPersonId = state.youngPeople[0].id;
    state.primaryTab = "youngPeople";
    state.secondaryTab = "overview";
    await loadSelectedYoungPerson();
  }

  renderApp();
}

window.App = App;
document.addEventListener("DOMContentLoaded", init);

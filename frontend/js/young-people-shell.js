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
  ypList: $("youngPeopleList"),
  search: $("youngPeopleSearch"),
  userChip: $("currentUserChip"),
  heroAvatar: $("heroAvatar"),
  heroTitle: $("heroTitle"),
  heroDescription: $("heroDescription"),
  heroBadges: $("heroBadges"),
  pageTitle: $("pageTitle"),
  pageSubtitle: $("pageSubtitle"),
  globalActions: $("globalActions"),
  modal: $("appModal"),
  modalTitle: $("modalTitle"),
  modalContent: $("modalContent"),
  modalStatus: $("modalStatus")
};

const CONFIG = {
  primaryTabs: {
    home: {
      label: "Home",
      subtitle: "Command, alerts, tasks, handover and operational oversight.",
      actions: [
        { id: "refreshCommand", label: "Refresh Command Centre", kind: "ghost" },
        { id: "newAi", label: "New AI Note", kind: "primary" }
      ]
    },
    youngPeople: {
      label: "Young People",
      subtitle: "Care recording, planning, risk, timeline and documents.",
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
      subtitle: "Standards, compliance, management review, archive and therapeutic support.",
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
      subtitle: "Inspection readiness and evidence overview."
    },
    operations: {
      label: "Operations",
      subtitle: "Rostering and wider home operations.",
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
      create: "/young-people/daily-notes",
      update: (id) => `/young-people/daily-notes/${id}`,
      get: (id) => `/young-people/daily-notes/${id}`,
      submit: (id) => `/young-people/daily-notes/${id}/submit`,
      archive: (id) => `/young-people/daily-notes/${id}/archive`,
      archiveList: (id) => `/young-people/${id}/daily-notes/archive`
    },
    incidents: {
      list: (id) => `/young-people/${id}/incidents`,
      create: "/young-people/incidents",
      update: (id) => `/young-people/incidents/${id}`,
      get: (id) => `/young-people/incidents/${id}`,
      submit: (id) => `/young-people/incidents/${id}/submit`,
      archive: (id) => `/young-people/incidents/${id}/archive`,
      archiveList: (id) => `/young-people/${id}/incidents/archive`
    },
    handover: {
      list: (id) => `/young-people/${id}/handover`,
      generate: (id) => `/young-people/${id}/handover/generate`,
      approve: (id) => `/young-people/handover/${id}/approve`,
      archive: (id) => `/young-people/handover/${id}/archive`
    },
    health: {
      list: (id) => `/young-people/${id}/health`,
      profileSave: (id) => `/young-people/${id}/health/profile`,
      create: "/young-people/health-records",
      update: (id) => `/young-people/health-records/${id}`,
      get: (id) => `/young-people/health-records/${id}`
    },
    education: {
      list: (id) => `/young-people/${id}/education`,
      profileSave: (id) => `/young-people/${id}/education/profile`,
      create: "/young-people/education-records",
      update: (id) => `/young-people/education-records/${id}`,
      get: (id) => `/young-people/education-records/${id}`
    },
    family: {
      list: (id) => `/young-people/${id}/family`,
      contactCreate: (id) => `/young-people/${id}/family/contacts`,
      contactUpdate: (id) => `/young-people/family/contacts/${id}`,
      contactGet: (id) => `/young-people/family/contacts/${id}`,
      recordCreate: "/young-people/family/records",
      recordUpdate: (id) => `/young-people/family/records/${id}`,
      recordGet: (id) => `/young-people/family/records/${id}`
    },
    keywork: {
      list: (id) => `/young-people/${id}/keywork`,
      create: "/young-people/keywork",
      update: (id) => `/young-people/keywork/${id}`,
      get: (id) => `/young-people/keywork/${id}`,
      submit: (id) => `/young-people/keywork/${id}/submit`,
      approve: (id) => `/young-people/keywork/${id}/approve`,
      archive: (id) => `/young-people/keywork/${id}/archive`
    },
    plans: {
      list: (id) => `/young-people/${id}/plans`,
      create: "/young-people/plans",
      update: (id) => `/young-people/plans/${id}`,
      get: (id) => `/young-people/plans/${id}`,
      submit: (id) => `/young-people/plans/${id}/submit`,
      approve: (id) => `/young-people/plans/${id}/approve`,
      archive: (id) => `/young-people/plans/${id}/archive`,
      archiveList: (id) => `/young-people/${id}/plans/archive`
    },
    risk: {
      list: (id) => `/young-people/${id}/risk`,
      create: "/young-people/risk",
      update: (id) => `/young-people/risk/${id}`,
      get: (id) => `/young-people/risk/${id}`,
      archiveList: (id) => `/young-people/${id}/risk/archive`
    },
    chronology: {
      list: (id) => `/young-people/${id}/chronology`,
      create: "/young-people/chronology",
      update: (id) => `/young-people/chronology/${id}`,
      get: (id) => `/young-people/chronology/${id}`,
      rebuild: (id) => `/young-people/${id}/chronology/rebuild`
    },
    standards: {
      summary: (id) => `/young-people/${id}/standards`,
      evidence: (id) => `/young-people/${id}/standards/evidence`,
      rebuild: (id) => `/young-people/${id}/standards/rebuild`
    },
    compliance: (id) => `/young-people/${id}/compliance`,
    statutory: {
      list: (id) => `/young-people/${id}/statutory-documents`,
      create: (id) => `/young-people/${id}/statutory-documents`,
      update: (id) => `/young-people/statutory-documents/${id}`,
      upload: (id) => `/young-people/${id}/statutory-documents/upload`
    },
    ai: {
      history: "/ai-notes/history",
      one: (id) => `/ai-notes/history/${id}`,
      generate: "/ai-notes/generate",
      edit: "/ai-notes/edit",
      save: "/ai-notes/save"
    },
    inspection: (id) => `/inspection-pack/young-person/${id}`,
    rosteringWeek: (homeId, weekStart) => `/api/rostering/week?home_id=${homeId}&week_start=${weekStart}`,
    rosteringBuild: "/api/rostering/build-week-template",
    rosteringPublish: "/api/rostering/publish-week",
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
    }),
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
    ]
  },

  incident: {
    title: "Incident",
    load: CONFIG.endpoints.incidents.get,
    save: {
      create: CONFIG.endpoints.incidents.create,
      update: CONFIG.endpoints.incidents.update
    },
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
    }),
    fields: [
      { name: "occurred_at", label: "Occurred at", type: "datetime-local" },
      {
        name: "incident_type",
        label: "Incident type",
        type: "select",
        options: [
          "missing_from_placement", "physical_aggression", "verbal_aggression",
          "self_harm_concern", "safeguarding_concern", "absconding",
          "property_damage", "bullying", "substance_misuse",
          "relationship_incident", "health_incident", "medication_error",
          "physical_intervention", "restraint", "other"
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
    ]
  },

  plan: {
    title: "Support Plan",
    load: CONFIG.endpoints.plans.get,
    save: {
      create: CONFIG.endpoints.plans.create,
      update: CONFIG.endpoints.plans.update
    },
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
    }),
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
    ]
  },

  risk: {
    title: "Risk Assessment",
    load: CONFIG.endpoints.risk.get,
    save: {
      create: CONFIG.endpoints.risk.create,
      update: CONFIG.endpoints.risk.update
    },
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
    }),
    fields: [
      { name: "category", label: "Category" },
      { name: "title", label: "Title" },
      { name: "severity", label: "Severity", type: "select", options: ["low", "medium", "high", "critical"] },
      { name: "likelihood", label: "Likelihood", type: "select", options: ["low", "medium", "high"] },
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
    ]
  }
};

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB");
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("en-GB");
}

function initials(name) {
  return String(name || "OS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x[0])
    .join("")
    .toUpperCase();
}

function numberOrNull(v) {
  return v === "" || v == null ? null : Number(v);
}

function isoFromLocal(v) {
  return v ? new Date(v).toISOString() : null;
}

function toDateInput(v) {
  return v ? String(v).slice(0, 10) : "";
}

function toDateTimeInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function badgeClass(v) {
  const x = String(v || "").toLowerCase();
  if (x.includes("high") || x.includes("critical") || x.includes("overdue")) return "badge-danger";
  if (x.includes("medium") || x.includes("submitted") || x.includes("returned") || x.includes("due_soon")) return "badge-warning";
  if (x.includes("approved") || x.includes("active") || x.includes("ok")) return "badge-success";
  return "badge-neutral";
}

function fullName(yp) {
  if (!yp) return "";
  return `${yp.first_name || ""} ${yp.last_name || ""}`.trim();
}

function requireAuth() {
  if (!token()) {
    window.location.href = "/oslogin.html";
    throw new Error("No token");
  }
}

async function api(url, options = {}) {
  requireAuth();
  const headers = {
    Authorization: `Bearer ${token()}`,
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (res.status === 401) {
    localStorage.removeItem("chos_access_token");
    localStorage.removeItem("chos_user");
    window.location.href = "/oslogin.html";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(typeof body === "object" ? body.detail || "Request failed" : body);
  }

  return body;
}

const postJson = (url, payload) => api(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

const putJson = (url, payload) => api(url, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

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

function stat(label, value) {
  return `<div class="dashboard-card"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</div>`;
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

function setPageHeader() {
  const conf = CONFIG.primaryTabs[state.primaryTab];
  UI.pageTitle.textContent = conf.label;
  UI.pageSubtitle.textContent = conf.subtitle;
}

function renderPrimaryNav() {
  UI.primaryNav.innerHTML = Object.entries(CONFIG.primaryTabs).map(([key, tab]) => `
    <button class="rail-nav-btn ${state.primaryTab === key ? "active" : ""}" data-primary="${key}">
      <span>${escapeHtml(tab.label)}</span>
    </button>
  `).join("");

  UI.primaryNav.querySelectorAll("[data-primary]").forEach(btn => {
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
  UI.secondaryNav.innerHTML = Object.entries(secondary).map(([key, item]) => `
    <button class="subnav-btn ${state.secondaryTab === key ? "active" : ""}" data-secondary="${key}">
      ${escapeHtml(item.label)}
    </button>
  `).join("");

  UI.secondaryNav.querySelectorAll("[data-secondary]").forEach(btn => {
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
  UI.globalActions.innerHTML = actions.map(a => `
    <button class="btn btn-${a.kind === "primary" ? "primary" : "ghost"}" data-action="${a.id}">
      ${escapeHtml(a.label)}
    </button>
  `).join("");

  UI.globalActions.querySelectorAll("[data-action]").forEach(btn => {
    btn.onclick = () => handleGlobalAction(btn.dataset.action);
  });
}

function renderYoungPeopleList(items = state.youngPeople) {
  if (!items.length) {
    UI.ypList.innerHTML = `<div class="empty-state compact">No young people found.</div>`;
    return;
  }

  UI.ypList.innerHTML = items.map(yp => `
    <article class="yp-card ${state.selectedYoungPersonId === yp.id ? "active" : ""}" data-yp="${yp.id}">
      <div class="yp-name-row">
        <div class="yp-name">${escapeHtml(fullName(yp))}</div>
        <span class="badge ${badgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk")}</span>
      </div>
      <div class="yp-sub">${escapeHtml(yp.placement_status || "Placement not set")}</div>
    </article>
  `).join("");

  UI.ypList.querySelectorAll("[data-yp]").forEach(el => {
    el.onclick = async () => {
      state.selectedYoungPersonId = Number(el.dataset.yp);
      await loadSelectedYoungPerson();
      renderApp();
    };
  });
}

function renderHome() {
  const c = state.command;
  if (!c) {
    return `<div class="empty-state">Loading command centre…</div>`;
  }

  const summary = Object.entries(c.summary || {}).map(([k, v]) => stat(k.replaceAll("_", " "), v)).join("");
  const alerts = (c.alerts || []).map(a => card(a.title, `${a.level || ""} • ${a.young_person_name || ""}`, a.detail || "")).join("");
  const tasks = (c.tasks || []).map(t => card(t.title, `${t.young_person_name || ""} • ${t.due || ""}`)).join("");
  const meds = (c.meds_due || []).map(m => card(m.medicine || m.item, `${m.young_person_name || ""} • ${m.time_due || ""}`, m.status || "")).join("");
  const handover = (c.handover || []).map(h => card(h.title, h.time || "", h.detail || "")).join("");

  return `
    <div class="workspace-grid home-grid">
      <section class="surface surface-hero">
        <div class="surface-header"><div><div class="surface-kicker">Command Centre</div><h3>Shift overview</h3></div></div>
        <div class="surface-body"><div class="records-wrap">${summary}</div></div>
      </section>

      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Alerts</div><h3>Risk and safeguarding</h3></div></div>
        <div class="surface-body"><div class="records-wrap">${alerts || `<div class="empty-state">No alerts.</div>`}</div></div>
      </section>

      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Shift actions</div><h3>Tasks and meds</h3></div></div>
        <div class="surface-body"><div class="records-wrap">${tasks}${meds}${handover}</div></div>
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
        <div class="surface-header"><div><div class="surface-kicker">Profile</div><h3>Core information</h3></div></div>
        <div class="surface-body">
          <div class="kv">
            <div class="kv-label">Full name</div><div>${escapeHtml(fullName(yp))}</div>
            <div class="kv-label">Preferred name</div><div>${escapeHtml(yp.preferred_name || "—")}</div>
            <div class="kv-label">DOB</div><div>${fmtDate(yp.date_of_birth)}</div>
            <div class="kv-label">Gender</div><div>${escapeHtml(yp.gender || "—")}</div>
            <div class="kv-label">Ethnicity</div><div>${escapeHtml(yp.ethnicity || "—")}</div>
            <div class="kv-label">NHS number</div><div>${escapeHtml(yp.nhs_number || "—")}</div>
            <div class="kv-label">Admission date</div><div>${fmtDate(yp.admission_date)}</div>
            <div class="kv-label">Placement status</div><div>${escapeHtml(yp.placement_status || "—")}</div>
          </div>

          <div class="section-block">
            <h4>Communication</h4>
            <div class="simple-item"><strong>Communication style</strong><br>${escapeHtml(communication.communication_style || "—")}</div>
            <div class="simple-item"><strong>Sensory profile</strong><br>${escapeHtml(communication.sensory_profile || "—")}</div>
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Identity</div><h3>Identity, alerts and profile detail</h3></div></div>
        <div class="surface-body">
          <div class="section-block">
            <h4>Identity</h4>
            <div class="simple-item"><strong>Interests</strong><br>${escapeHtml(identity.interests || "—")}</div>
            <div class="simple-item"><strong>Strengths</strong><br>${escapeHtml(identity.strengths_summary || "—")}</div>
            <div class="simple-item"><strong>What matters to me</strong><br>${escapeHtml(identity.what_matters_to_me || "—")}</div>
          </div>

          <div class="section-block">
            <h4>Alerts</h4>
            ${alerts.length ? alerts.map(a => `<div class="alert-item"><strong>${escapeHtml(a.title || a.alert_type || "Alert")}</strong><br>${escapeHtml(a.description || "")}</div>`).join("") : `<div class="empty-state">No alerts recorded.</div>`}
          </div>

          <div class="section-block">
            <button class="btn btn-primary" onclick="App.openPhotoUpload()">Upload Photo</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderCollection(title, kicker, items, mapItem, actionBtn = "") {
  return `
    <section class="surface">
      <div class="surface-header">
        <div><div class="surface-kicker">${escapeHtml(kicker)}</div><h3>${escapeHtml(title)}</h3></div>
        ${actionBtn}
      </div>
      <div class="surface-body">
        <div class="records-wrap">
          ${items.length ? items.map(mapItem).join("") : `<div class="empty-state">No records found.</div>`}
        </div>
      </div>
    </section>
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
        n => card(
          n.title || "Daily note",
          `${fmtDate(n.note_date)} • ${n.shift_type || "shift"} • ${n.workflow_status || "draft"}`,
          n.summary || n.presentation || "Daily note recorded",
          `<button class="btn btn-secondary" onclick="App.openForm('daily', ${n.id})">Edit</button>`
        ),
        `<button class="btn btn-primary" onclick="App.openForm('daily')">New Daily Note</button>`
      )}

      ${renderCollection(
        "Incidents",
        "Safeguarding",
        incidents,
        n => card(
          n.title || "Incident",
          `${fmtDateTime(n.occurred_at)} • ${n.severity || "medium"}`,
          n.description || "Incident recorded",
          `<button class="btn btn-secondary" onclick="App.openForm('incident', ${n.id})">Edit</button>`
        ),
        `<button class="btn btn-primary" onclick="App.openForm('incident')">New Incident</button>`
      )}

      ${renderCollection(
        "Handover",
        "Shift continuity",
        handover,
        h => card(
          h.title || "Handover",
          `${fmtDate(h.handover_date)} • ${h.shift_type || "shift"} • ${h.status || "draft"}`,
          h.summary_text || "Handover recorded",
          `<button class="btn btn-secondary" onclick="App.approveHandover(${h.id})">Approve</button>`
        ),
        `<button class="btn btn-primary" onclick="App.generateHandover()">Generate Handover</button>`
      )}
    </div>
  `;
}

function renderHealth() {
  const data = state.cache.health || {};
  const records = data.health_records || [];
  const profile = data.health_profile || {};
  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Health records",
        "Health",
        records,
        r => card(r.title, `${fmtDateTime(r.event_datetime)} • ${r.record_type || "record"}`, r.summary || r.outcome || "Health record"),
        `<button class="btn btn-primary" onclick="App.openSimpleMessage('Health profile editing can be added next.')">New Health Record</button>`
      )}
      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Profile</div><h3>Health profile</h3></div></div>
        <div class="surface-body">
          <div class="simple-item"><strong>GP</strong><br>${escapeHtml(profile.gp_name || "—")}</div>
          <div class="simple-item"><strong>Allergies</strong><br>${escapeHtml(profile.allergies || "—")}</div>
          <div class="simple-item"><strong>Diagnoses</strong><br>${escapeHtml(profile.diagnoses || "—")}</div>
        </div>
      </section>
    </div>
  `;
}

function renderEducation() {
  const data = state.cache.education || {};
  const records = data.education_records || [];
  const profile = data.education_profile || {};
  return `
    <div class="workspace-grid split-grid">
      ${renderCollection(
        "Education records",
        "Education",
        records,
        r => card(r.title || "Education record", `${fmtDate(r.record_date)} • ${r.attendance_status || "attendance"}`, r.summary || r.learning_engagement || "Education record")
      )}
      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Profile</div><h3>Education profile</h3></div></div>
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
        r => card(r.title || "Family contact", `${fmtDateTime(r.contact_datetime)} • ${r.contact_type || "contact"}`, r.summary || r.concerns || "Family contact recorded")
      )}
      ${renderCollection(
        "Contacts",
        "Approved network",
        contacts,
        c => card(c.full_name, `${c.relationship_to_child || "Relationship"} • ${c.is_approved_contact ? "Approved" : "Not approved"}`, c.contact_notes || c.phone_number || c.email || "")
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
    k => card(k.title || "Keywork", `${fmtDate(k.session_date)} • ${k.workflow_status || "draft"}`, k.summary || "Keywork session recorded"),
    `<button class="btn btn-primary" onclick="App.openSimpleMessage('Keywork schema can be added next.')">New Keywork Session</button>`
  );
}

function renderPlans() {
  const items = state.cache.plans?.items || [];
  return renderCollection(
    "Support plans",
    "Planning",
    items,
    p => card(
      p.title || "Support plan",
      `${p.plan_type || "plan"} • review ${fmtDate(p.review_due_at)} • ${p.status || "draft"}`,
      p.summary || p.formulation || "Support plan recorded",
      `<button class="btn btn-secondary" onclick="App.openForm('plan', ${p.id})">Edit</button>`
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
    r => card(
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
    e => card(e.title || "Chronology event", `${fmtDateTime(e.event_datetime)} • ${e.category || "event"}`, e.summary || "Chronology event"),
    `<button class="btn btn-primary" onclick="App.rebuildChronology()">Rebuild</button>`
  );
}

function renderDocuments() {
  const items = Array.isArray(state.cache.statutory) ? state.cache.statutory : [];
  return renderCollection(
    "Statutory documents",
    "Documents",
    items,
    d => card(d.title || "Document", `${d.document_type || "document"} • review ${fmtDate(d.review_date)}`, d.description || d.status || ""),
    `<button class="btn btn-primary" onclick="App.openSimpleMessage('Statutory upload form can be added next.')">Upload Document</button>`
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
        s => card(`${s.code} • ${s.short_label || s.title}`, `Display order ${s.display_order || "—"}`, `${s.linked_record_count || 0} linked records`),
        `<button class="btn btn-primary" onclick="App.rebuildStandards()">Rebuild Evidence</button>`
      )}
      ${renderCollection(
        "Standards evidence",
        "Evidence",
        evidence,
        e => card(`${e.standard_code} • ${e.standard_short_label || e.standard_title}`, `${e.source_table || "source"} #${e.source_id || "—"}`, e.rationale || "No rationale")
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
    c => card(c.title || "Compliance item", `${c.compliance_type || "item"} • due ${fmtDate(c.due_date)} • ${c.compliance_status || "ok"}`, `${c.status || ""} ${c.approval_status || ""}`.trim())
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
        n => card(n.title || "AI note", `${n.young_person_name || "No young person"} • ${n.record_date || "No date"}`, n.excerpt || n.final_note || ""),
        `<button class="btn btn-primary" onclick="App.openSimpleMessage('AI note builder can be reattached next.')">New AI Note</button>`
      )}
      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Practice support</div><h3>Assistant workspace</h3></div></div>
        <div class="surface-body">
          <div class="simple-item">Use the AI note area and therapeutic prompts as the next step in the rebuild.</div>
        </div>
      </section>
    </div>
  `;
}

function renderManagement() {
  const daily = state.cache.daily?.items || [];
  const incidents = state.cache.incidents?.items || [];
  const keywork = state.cache.keywork?.items || [];
  const plans = state.cache.plans?.items || [];

  const queue = [
    ...daily.filter(x => String(x.workflow_status || "").toLowerCase() === "submitted"),
    ...incidents.filter(x => String(x.workflow_status || "").toLowerCase() === "submitted"),
    ...keywork.filter(x => String(x.workflow_status || "").toLowerCase() === "submitted"),
    ...plans.filter(x => String(x.approval_status || "").toLowerCase() === "submitted")
  ];

  return renderCollection(
    "Management queue",
    "Leadership and oversight",
    queue,
    q => card(q.title || "Review item", q.workflow_status || q.approval_status || "", q.summary || q.description || "Awaiting review")
  );
}

function renderArchive() {
  const daily = state.cache.dailyArchive?.items || [];
  const incidents = state.cache.incidentArchive?.items || [];
  const plans = state.cache.plansArchive?.items || [];
  const risk = Array.isArray(state.cache.riskArchive) ? state.cache.riskArchive : [];

  const merged = [
    ...daily.map(x => ({ title: x.title || "Daily note", meta: fmtDate(x.note_date), body: x.summary || "" })),
    ...incidents.map(x => ({ title: x.title || "Incident", meta: fmtDateTime(x.occurred_at), body: x.description || "" })),
    ...plans.map(x => ({ title: x.title || "Plan", meta: fmtDate(x.review_due_at), body: x.summary || "" })),
    ...risk.map(x => ({ title: x.title || "Risk", meta: fmtDate(x.review_date), body: x.concern_summary || "" }))
  ];

  return renderCollection("Archive", "Archived records", merged, x => card(x.title, x.meta, x.body));
}

function renderInspection() {
  const i = state.cache.inspection;
  if (!i) {
    return `
      <section class="surface">
        <div class="surface-header">
          <div><div class="surface-kicker">Inspection readiness</div><h3>Inspection pack</h3></div>
          <button class="btn btn-primary" onclick="App.loadInspection()">Load Inspection Data</button>
        </div>
        <div class="surface-body"><div class="empty-state">Select a young person and load the inspection pack.</div></div>
      </section>
    `;
  }

  return `
    <div class="workspace-grid split-grid">
      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Inspection readiness</div><h3>Inspection pack</h3></div></div>
        <div class="surface-body">
          <div class="records-wrap">
            ${stat("Plans", (i.plans || []).length)}
            ${stat("Risks", (i.risks || []).length)}
            ${stat("Daily notes", (i.daily_notes || []).length)}
            ${stat("Incidents", (i.incidents || []).length)}
            ${stat("Health records", (i.health_records || []).length)}
            ${stat("Education records", (i.education_records || []).length)}
            ${stat("Family records", (i.family_records || []).length)}
            ${stat("Keywork", (i.keywork_sessions || []).length)}
            ${stat("Chronology", (i.chronology || []).length)}
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header"><div><div class="surface-kicker">Evidence summary</div><h3>Inspection overview</h3></div></div>
        <div class="surface-body">
          <div class="records-wrap">
            ${(i.compliance_items || []).slice(0, 10).map(x => card(x.title || x.compliance_type, `${fmtDate(x.due_date)} • ${x.compliance_status || "ok"}`, x.status || "")).join("") || `<div class="empty-state">No compliance summary found.</div>`}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderOperations() {
  return `
    <section class="surface">
      <div class="surface-header">
        <div><div class="surface-kicker">Operations</div><h3>Rostering</h3></div>
      </div>
      <div class="surface-body">
        <div class="simple-item">
          Rostering can be mounted next as a dedicated dynamic module with its own schema and actions.
        </div>
      </div>
    </section>
  `;
}

function renderContent() {
  let html = `<div class="empty-state">Nothing selected.</div>`;

  if (state.primaryTab === "home") html = renderHome();
  if (state.primaryTab === "youngPeople") {
    const sub = state.secondaryTab;
    if (!state.selectedYoungPersonId) {
      html = `<div class="empty-state">Select a young person to continue.</div>`;
    } else {
      if (sub === "overview") html = renderOverview();
      if (sub === "recording") html = renderRecording();
      if (sub === "health") html = renderHealth();
      if (sub === "education") html = renderEducation();
      if (sub === "family") html = renderFamily();
      if (sub === "keywork") html = renderKeywork();
      if (sub === "plans") html = renderPlans();
      if (sub === "risk") html = renderRisk();
      if (sub === "timeline") html = renderTimeline();
      if (sub === "documents") html = renderDocuments();
    }
  }
  if (state.primaryTab === "quality") {
    const sub = state.secondaryTab;
    if (!state.selectedYoungPersonId) {
      html = `<div class="empty-state">Select a young person to continue.</div>`;
    } else {
      if (sub === "standards") html = renderStandards();
      if (sub === "compliance") html = renderCompliance();
      if (sub === "ai") html = renderAI();
      if (sub === "management") html = renderManagement();
      if (sub === "archive") html = renderArchive();
    }
  }
  if (state.primaryTab === "inspection") html = renderInspection();
  if (state.primaryTab === "operations") html = renderOperations();

  UI.content.innerHTML = html;
}

function renderApp() {
  setPageHeader();
  renderPrimaryNav();
  renderSecondaryNav();
  renderGlobalActions();
  renderYoungPeopleList();
  setHero();
  renderContent();
}

async function loadYoungPeople() {
  const data = await api(CONFIG.endpoints.youngPeople);
  state.youngPeople = Array.isArray(data.items) ? data.items : [];
}

async function loadCommand() {
  state.command = await api(CONFIG.endpoints.command);
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

async function loadAiHistory() {
  const data = await api(CONFIG.endpoints.ai.history);
  state.cache.aiHistory = data.notes || [];
}

function handleGlobalAction(action) {
  if (action === "refreshCommand") {
    loadCommand().then(renderApp);
  }
  if (action === "newAi") {
    App.openSimpleMessage("AI note builder can be reattached into the new modal system next.");
  }
}

function openModal(title, html) {
  UI.modalTitle.textContent = title;
  UI.modalContent.innerHTML = html;
  UI.modalStatus.textContent = "";
  UI.modal.classList.remove("hidden");
}

function closeModal() {
  UI.modal.classList.add("hidden");
  UI.modalContent.innerHTML = "";
  UI.modalStatus.textContent = "";
  state.modal.key = null;
  state.modal.recordId = null;
}

function value(name) {
  const el = document.querySelector(`[data-field="${name}"]`);
  return el ? el.value : "";
}

function buildField(field, data = {}) {
  const val = data[field.name] ?? field.value ?? "";
  if (field.type === "textarea") {
    return `
      <div class="field">
        <label>${escapeHtml(field.label)}</label>
        <textarea data-field="${field.name}" rows="4">${escapeHtml(val)}</textarea>
      </div>
    `;
  }
  if (field.type === "select") {
    return `
      <div class="field">
        <label>${escapeHtml(field.label)}</label>
        <select data-field="${field.name}">
          ${(field.options || []).map(opt => `<option value="${escapeHtml(opt)}" ${String(val) === String(opt) ? "selected" : ""}>${escapeHtml(opt)}</option>`).join("")}
        </select>
      </div>
    `;
  }
  return `
    <div class="field">
      <label>${escapeHtml(field.label)}</label>
      <input data-field="${field.name}" type="${field.type || "text"}" value="${escapeHtml(
        field.type === "date" ? toDateInput(val) :
        field.type === "datetime-local" ? toDateTimeInput(val) :
        val
      )}" />
    </div>
  `;
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

  const fieldsHtml = schema.fields.map(f => buildField(f, data)).join("");
  openModal(
    recordId ? `Edit ${schema.title}` : `New ${schema.title}`,
    `
      <div class="form-grid two">${fieldsHtml}</div>
      <div class="action-row right">
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
  } catch (err) {
    UI.modalStatus.textContent = err.message || "Save failed.";
  }
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

async function loadInspection() {
  if (!state.selectedYoungPersonId) return;
  state.cache.inspection = await api(CONFIG.endpoints.inspection(state.selectedYoungPersonId));
  state.primaryTab = "inspection";
  renderApp();
}

function openSimpleMessage(message) {
  openModal("Info", `<div class="simple-item">${escapeHtml(message)}</div>`);
}

function openPhotoUpload() {
  openModal("Upload Photo", `
    <div class="field">
      <label>Photo</label>
      <input id="photoFileInput" type="file" accept="image/*" />
    </div>
    <div class="action-row right">
      <button class="btn btn-primary" id="savePhotoBtn">Upload Photo</button>
    </div>
  `);

  $("savePhotoBtn").onclick = async () => {
    const file = $("photoFileInput").files?.[0];
    if (!file || !state.selectedYoungPersonId) return;
    const fd = new FormData();
    fd.append("photo", file);
    await api(CONFIG.endpoints.photo(state.selectedYoungPersonId), { method: "POST", body: fd });
    await loadSelectedYoungPerson();
    renderApp();
    closeModal();
  };
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

  UI.search.oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    const items = !q ? state.youngPeople : state.youngPeople.filter(yp =>
      fullName(yp).toLowerCase().includes(q) ||
      String(yp.placement_status || "").toLowerCase().includes(q)
    );
    renderYoungPeopleList(items);
  };

  $("closeModalBtn").onclick = closeModal;
  UI.modal.onclick = (e) => {
    if (e.target === UI.modal) closeModal();
  };
}

const App = {
  openForm,
  rebuildChronology,
  rebuildStandards,
  generateHandover,
  approveHandover,
  loadInspection,
  openSimpleMessage,
  openPhotoUpload
};

async function init() {
  requireAuth();
  UI.userChip.textContent = currentUser().email || "Unknown user";

  state.secondaryTab = Object.keys(CONFIG.primaryTabs.home.secondary || {})[0] || "";
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

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
  workflowViews: {
    daily: "draft",
    incidents: "draft",
    keywork: "draft",
    plans: "draft",
    risk: "active"
  },
  modal: {
    key: null,
    recordId: null,
    draftId: null,
    isNew: false,
    autosaveTimer: null,
    autosaveState: "Ready",
    draftCreated: false,
    hasChanges: false
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
  modalKicker: $("modalKicker"),
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
        { id: "openAiInfo", label: "AI Writing Support", kind: "primary" }
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
      create: "/young-people/keywork",
      update: (id) => `/young-people/keywork/${id}`,
      get: (id) => `/young-people/keywork/${id}`,
      submit: (id) => `/young-people/keywork/${id}/submit`,
      approve: (id) => `/young-people/keywork/${id}/approve`,
      archive: (id) => `/young-people/keywork/${id}/archive`
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
      history: "/ai-notes/history",
      edit: "/ai-notes/edit"
    },

    inspection: (id) => `/inspection-pack/young-person/${id}`,
    photo: (id) => `/young-people/${id}/photo`
  }
};

const FORM_SCHEMAS = {
  daily: {
    title: "Daily Care Record",
    kicker: "Quality and purpose of care • Child's views • Health and wellbeing • Relationships",
    intro:
      "Use this record to capture the young person's day with clarity, warmth and professional accuracy. Record lived experience, regulation, routine, relationships and next caring actions.",
    standards: ["Quality of care", "Views, wishes and feelings", "Health and wellbeing", "Positive relationships", "Care planning"],
    load: CONFIG.endpoints.daily.get,
    save: {
      create: CONFIG.endpoints.daily.create,
      update: CONFIG.endpoints.daily.update,
      submit: CONFIG.endpoints.daily.submit
    },
    sections: [
      {
        title: "Record context",
        helper: "Start with the essentials for the shift record.",
        columns: 2,
        fields: [
          { name: "note_date", label: "Record date", type: "date" },
          { name: "shift_type", label: "Shift type", type: "select", options: ["day", "evening", "night", "waking_night", "sleep_in", "handover"] },
          { name: "mood", label: "Overall mood / presentation" }
        ]
      },
      {
        title: "Daily lived experience",
        helper: "Describe how the day felt and what took place in ordinary daily living.",
        columns: 1,
        fields: [
          { name: "presentation", label: "Presentation and emotional wellbeing", type: "textarea", ai: true },
          { name: "activities", label: "Daily living, activities and engagement", type: "textarea", ai: true }
        ]
      },
      {
        title: "Progress and wellbeing",
        helper: "Capture relevant progress, health, education and family information.",
        columns: 1,
        fields: [
          { name: "education_update", label: "Education / structure / participation", type: "textarea", ai: true },
          { name: "health_update", label: "Health and wellbeing", type: "textarea", ai: true },
          { name: "family_update", label: "Family, contact and relationships", type: "textarea", ai: true }
        ]
      },
      {
        title: "Reflection and response",
        helper: "Record behaviour, the child's voice, strengths and next actions.",
        columns: 1,
        fields: [
          { name: "behaviour_update", label: "Behaviour, regulation and staff response", type: "textarea", ai: true },
          { name: "young_person_voice", label: "Child's voice", type: "textarea", ai: true },
          { name: "positives", label: "Strengths, positives and progress", type: "textarea", ai: true },
          { name: "actions_required", label: "Next caring actions / handover needs", type: "textarea", ai: true }
        ]
      }
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
      actions_required: value("actions_required"),
      workflow_status: "draft"
    })
  },

  incident: {
    title: "Significant Event Record",
    kicker: "Protection of children • Positive relationships • Leadership and management",
    intro:
      "Use this record for significant incidents or safeguarding-related events. Be factual, proportionate and clear about context, response and follow-up.",
    standards: ["Protection of children", "Positive relationships", "Leadership and management", "Care planning"],
    load: CONFIG.endpoints.incidents.get,
    save: {
      create: CONFIG.endpoints.incidents.create,
      update: CONFIG.endpoints.incidents.update,
      submit: CONFIG.endpoints.incidents.submit
    },
    sections: [
      {
        title: "Event details",
        helper: "Record the essential facts of the event.",
        columns: 2,
        fields: [
          { name: "occurred_at", label: "Occurred at", type: "datetime-local" },
          {
            name: "incident_type",
            label: "Event type",
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
          { name: "severity", label: "Level of concern", type: "select", options: ["low", "medium", "high", "critical"] },
          { name: "location", label: "Location" },
          { name: "staff_id", label: "Staff ID", type: "number" }
        ]
      },
      {
        title: "What happened",
        helper: "Describe the event, context and presentation in clear professional language.",
        columns: 1,
        fields: [
          { name: "description", label: "What happened", type: "textarea", ai: true },
          { name: "antecedent", label: "Context and antecedents", type: "textarea", ai: true },
          { name: "presentation", label: "Child presentation and regulation", type: "textarea", ai: true }
        ]
      },
      {
        title: "Response and follow-up",
        helper: "Record relational response, child voice and restorative follow-up.",
        columns: 1,
        fields: [
          { name: "staff_response", label: "Relational / staff response", type: "textarea", ai: true },
          { name: "trauma_informed_formulation", label: "Therapeutic understanding / formulation", type: "textarea", ai: true },
          { name: "child_voice", label: "Child's voice", type: "textarea", ai: true },
          { name: "restorative_follow_up", label: "Restorative follow-up and next protective actions", type: "textarea", ai: true }
        ]
      }
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
      staff_id: numberOrNull(value("staff_id")),
      manager_review_status: "draft"
    })
  },

  keywork: {
    title: "Direct Work Record",
    kicker: "Views, wishes and feelings • Positive relationships • Care planning",
    intro:
      "Use this record for keywork and direct work sessions. Capture purpose, the child's voice, your reflection and the agreed next steps.",
    standards: ["Views, wishes and feelings", "Positive relationships", "Care planning", "Enjoyment and achievement"],
    load: CONFIG.endpoints.keywork.get,
    save: {
      create: CONFIG.endpoints.keywork.create,
      update: CONFIG.endpoints.keywork.update,
      submit: CONFIG.endpoints.keywork.submit
    },
    sections: [
      {
        title: "Session context",
        helper: "Set out the basic details for the direct work session.",
        columns: 2,
        fields: [
          { name: "session_date", label: "Session date", type: "date" },
          { name: "worker_id", label: "Worker ID", type: "number" },
          { name: "topic", label: "Focus / topic" },
          { name: "next_session_date", label: "Next session date", type: "date" }
        ]
      },
      {
        title: "Purpose and child voice",
        helper: "What was the purpose of the session and what did the child communicate?",
        columns: 1,
        fields: [
          { name: "purpose", label: "Purpose", type: "textarea", ai: true },
          { name: "summary", label: "Session summary", type: "textarea", ai: true },
          { name: "child_voice", label: "Child's voice", type: "textarea", ai: true }
        ]
      },
      {
        title: "Reflection and continuity",
        helper: "Record understanding, actions and continuity planning.",
        columns: 1,
        fields: [
          { name: "reflective_analysis", label: "Reflective analysis / understanding", type: "textarea", ai: true },
          { name: "actions_agreed", label: "Actions agreed", type: "textarea", ai: true }
        ]
      }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      session_date: value("session_date"),
      worker_id: numberOrNull(value("worker_id")),
      topic: value("topic"),
      purpose: value("purpose"),
      summary: value("summary"),
      child_voice: value("child_voice"),
      reflective_analysis: value("reflective_analysis"),
      actions_agreed: value("actions_agreed"),
      next_session_date: value("next_session_date"),
      status: "draft"
    })
  },

  plan: {
    title: "Care and Support Plan",
    kicker: "Quality and purpose of care • Care planning • Positive relationships",
    intro:
      "Use this plan to describe a clear need, the child's views, therapeutic understanding and the practical guidance staff should follow consistently.",
    standards: ["Quality of care", "Care planning", "Positive relationships", "Protection of children"],
    load: CONFIG.endpoints.plans.get,
    save: {
      create: CONFIG.endpoints.plans.create,
      update: CONFIG.endpoints.plans.update,
      submit: CONFIG.endpoints.plans.submit
    },
    sections: [
      {
        title: "Plan details",
        helper: "Set ownership, review date and plan purpose.",
        columns: 2,
        fields: [
          { name: "plan_type", label: "Plan type", value: "support_plan" },
          { name: "title", label: "Plan title" },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "review_date", label: "Review date", type: "date" },
          { name: "owner_id", label: "Owner ID", type: "number" }
        ]
      },
      {
        title: "Need and understanding",
        helper: "Describe the identified need and the child's own views.",
        columns: 1,
        fields: [
          { name: "summary", label: "Summary of need", type: "textarea", ai: true },
          { name: "child_voice", label: "Child's voice", type: "textarea", ai: true },
          { name: "formulation", label: "Therapeutic understanding / formulation", type: "textarea", ai: true }
        ]
      },
      {
        title: "Support guidance",
        helper: "Set out what helps, how staff should respond and what to notice.",
        columns: 1,
        fields: [
          { name: "staff_guidance", label: "Staff guidance / proactive strategies", type: "textarea", ai: true },
          { name: "pace_guidance", label: "PACE / relational guidance", type: "textarea", ai: true },
          { name: "triggers", label: "Known triggers / indicators of stress", type: "textarea", ai: true },
          { name: "protective_factors", label: "Protective factors / strengths", type: "textarea", ai: true }
        ]
      }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      plan_type: value("plan_type") || "support_plan",
      title: value("title"),
      start_date: value("start_date"),
      review_date: value("review_date"),
      owner_id: numberOrNull(value("owner_id")),
      summary: value("summary"),
      child_voice: value("child_voice"),
      formulation: value("formulation"),
      staff_guidance: value("staff_guidance"),
      pace_guidance: value("pace_guidance"),
      triggers: value("triggers"),
      protective_factors: value("protective_factors"),
      status: "draft",
      approval_status: "draft"
    })
  },

  risk: {
    title: "Safer Care and Risk Plan",
    kicker: "Protection of children • Care planning • Leadership and management",
    intro:
      "Use this record to identify risk clearly, explain what to notice and set out consistent safeguarding and relational responses.",
    standards: ["Protection of children", "Care planning", "Leadership and management"],
    load: CONFIG.endpoints.risk.get,
    save: {
      create: CONFIG.endpoints.risk.create,
      update: CONFIG.endpoints.risk.update,
      submit: null
    },
    sections: [
      {
        title: "Risk details",
        helper: "Set out the category, severity and review information.",
        columns: 2,
        fields: [
          { name: "category", label: "Risk category" },
          { name: "title", label: "Risk title" },
          { name: "severity", label: "Severity", type: "select", options: ["low", "medium", "high", "critical"] },
          { name: "likelihood", label: "Likelihood", type: "select", options: ["low", "medium", "high"] },
          { name: "review_date", label: "Review date", type: "date" },
          { name: "owner_id", label: "Owner ID", type: "number" }
        ]
      },
      {
        title: "Risk picture",
        helper: "Describe the concern, triggers and early warning signs.",
        columns: 1,
        fields: [
          { name: "concern_summary", label: "Presenting concern", type: "textarea", ai: true },
          { name: "known_triggers", label: "Known triggers and vulnerabilities", type: "textarea", ai: true },
          { name: "early_warning_signs", label: "Early warning signs", type: "textarea", ai: true },
          { name: "contextual_factors", label: "Contextual factors", type: "textarea", ai: true }
        ]
      },
      {
        title: "Protective planning",
        helper: "State the current safeguards, de-escalation approach and child views.",
        columns: 1,
        fields: [
          { name: "current_controls", label: "Current safeguards / controls", type: "textarea", ai: true },
          { name: "deescalation_strategies", label: "Relational and de-escalation responses", type: "textarea", ai: true },
          { name: "response_actions", label: "Response actions / next protective steps", type: "textarea", ai: true },
          { name: "child_views", label: "Child's views and protective factors", type: "textarea", ai: true }
        ]
      }
    ],
    buildPayload: () => ({
      young_person_id: state.selectedYoungPersonId,
      category: value("category"),
      title: value("title"),
      severity: value("severity"),
      likelihood: value("likelihood"),
      review_date: value("review_date"),
      owner_id: numberOrNull(value("owner_id")),
      concern_summary: value("concern_summary"),
      known_triggers: value("known_triggers"),
      early_warning_signs: value("early_warning_signs"),
      contextual_factors: value("contextual_factors"),
      current_controls: value("current_controls"),
      deescalation_strategies: value("deescalation_strategies"),
      response_actions: value("response_actions"),
      child_views: value("child_views"),
      status: "active",
      approval_status: "not_required"
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
  if (v.includes("medium") || v.includes("returned") || v.includes("submitted") || v.includes("pending") || v.includes("due_soon")) return "badge-warning";
  if (v.includes("approved") || v.includes("active") || v.includes("ok") || v.includes("recorded")) return "badge-success";
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

function renderStatusTabs(key, current, tabs) {
  return `
    <div class="workflow-tabs">
      ${tabs.map((tab) => `
        <button
          class="workflow-tab ${current === tab.value ? "active" : ""}"
          onclick="App.setWorkflowView('${key}', '${tab.value}')"
        >
          ${escapeHtml(tab.label)} ${typeof tab.count === "number" ? `(${tab.count})` : ""}
        </button>
      `).join("")}
    </div>
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
    incidents.filter((x) => ["submitted", "pending"].includes(String(x.workflow_status || x.manager_review_status || "").toLowerCase())).length +
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
      title: x.title || "Daily Care Record",
      meta: `${fmtDate(x.note_date)} • ${x.shift_type || "shift"}`,
      body: x.summary || x.presentation || "Submitted daily record"
    }));

  const incidents = safeArray(state.cache?.incidents?.items)
    .filter((x) => ["submitted", "pending"].includes(String(x.workflow_status || x.manager_review_status || "").toLowerCase()))
    .map((x) => ({
      title: x.title || "Significant Event Record",
      meta: `${fmtDateTime(x.occurred_at)} • ${x.severity || "medium"}`,
      body: x.description || "Submitted significant event"
    }));

  const plans = safeArray(state.cache?.plans?.items)
    .filter((x) => String(x.approval_status || "").toLowerCase() === "submitted")
    .map((x) => ({
      title: x.title || "Care and Support Plan",
      meta: `${x.plan_type || "plan"} • review ${fmtDate(x.review_due_at)}`,
      body: x.summary || x.formulation || "Submitted plan"
    }));

  const queue = [...daily, ...incidents, ...plans].slice(0, 8);

  if (!queue.length) {
    return `<div class="empty-state">No submitted items currently awaiting management review.</div>`;
  }

  return `
    <div class="records-wrap">
      ${queue.map((q) => `
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
      `).join("")}
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

/* ---------- workflow filters ---------- */

function splitDailyRecords(items = []) {
  return {
    draft: items.filter((x) => ["draft", "returned", ""].includes(String(x.workflow_status || "").toLowerCase())),
    submitted: items.filter((x) => String(x.workflow_status || "").toLowerCase() === "submitted"),
    approved: items.filter((x) => ["approved", "reviewed", "completed"].includes(String(x.workflow_status || "").toLowerCase()))
  };
}

function splitIncidentRecords(items = []) {
  return {
    draft: items.filter((x) => ["draft", "returned", ""].includes(String(x.workflow_status || x.manager_review_status || "").toLowerCase())),
    submitted: items.filter((x) => ["submitted", "pending"].includes(String(x.workflow_status || x.manager_review_status || "").toLowerCase())),
    approved: items.filter((x) => ["approved", "reviewed", "closed"].includes(String(x.workflow_status || x.manager_review_status || "").toLowerCase()))
  };
}

function splitKeyworkRecords(items = []) {
  return {
    draft: items.filter((x) => ["draft", "returned", ""].includes(String(x.workflow_status || x.status || "").toLowerCase())),
    submitted: items.filter((x) => String(x.workflow_status || x.status || "").toLowerCase() === "submitted"),
    approved: items.filter((x) => ["approved"].includes(String(x.workflow_status || x.status || "").toLowerCase()))
  };
}

function splitPlanRecords(items = []) {
  return {
    draft: items.filter((x) => ["draft", "returned", ""].includes(String(x.approval_status || x.status || "").toLowerCase())),
    submitted: items.filter((x) => String(x.approval_status || "").toLowerCase() === "submitted"),
    approved: items.filter((x) => ["approved", "active"].includes(String(x.approval_status || x.status || "").toLowerCase()))
  };
}

function splitRiskRecords(items = []) {
  return {
    active: items.filter((x) => !["archived", "completed"].includes(String(x.status || "").toLowerCase()) && !x.archived),
    archived: items.filter((x) => ["archived", "completed"].includes(String(x.status || "").toLowerCase()) || x.archived)
  };
}

/* ---------- main module renders ---------- */

function renderRecording() {
  const dailySplit = splitDailyRecords(state.cache.daily?.items || []);
  const incidentSplit = splitIncidentRecords(state.cache.incidents?.items || []);
  const dailyCurrent = state.workflowViews.daily;
  const incidentCurrent = state.workflowViews.incidents;

  return `
    <div class="workspace-grid split-grid">
      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Daily living</div>
            <h3>Daily Care Records</h3>
          </div>
          <button class="btn btn-primary" onclick="App.openForm('daily')">New Daily Care Record</button>
        </div>
        <div class="surface-body">
          ${renderStatusTabs("daily", dailyCurrent, [
            { value: "draft", label: "Drafts", count: dailySplit.draft.length },
            { value: "submitted", label: "Submitted", count: dailySplit.submitted.length },
            { value: "approved", label: "Approved", count: dailySplit.approved.length }
          ])}
          <div class="records-wrap">
            ${(dailySplit[dailyCurrent] || []).length
              ? (dailySplit[dailyCurrent] || []).map((n) =>
                  card(
                    n.title || "Daily Care Record",
                    `${fmtDate(n.note_date)} • ${n.shift_type || "shift"} • ${n.workflow_status || "draft"}`,
                    n.summary || n.presentation || "Daily care record",
                    `
                      <button class="btn btn-secondary" onclick="App.openForm('daily', ${n.id})">Open</button>
                      ${dailyCurrent === "draft" ? `<button class="btn btn-ghost" onclick="App.submitDaily(${n.id})">Submit</button>` : ""}
                      ${dailyCurrent !== "approved" ? `<button class="btn btn-ghost" onclick="App.archiveDaily(${n.id})">Archive</button>` : ""}
                    `
                  )
                ).join("")
              : `<div class="workflow-empty">No ${escapeHtml(dailyCurrent)} daily care records.</div>`
            }
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <div class="surface-kicker">Protection of children</div>
            <h3>Significant Event Records</h3>
          </div>
          <button class="btn btn-primary" onclick="App.openForm('incident')">New Significant Event Record</button>
        </div>
        <div class="surface-body">
          ${renderStatusTabs("incidents", incidentCurrent, [
            { value: "draft", label: "Drafts", count: incidentSplit.draft.length },
            { value: "submitted", label: "Submitted", count: incidentSplit.submitted.length },
            { value: "approved", label: "Approved", count: incidentSplit.approved.length }
          ])}
          <div class="records-wrap">
            ${(incidentSplit[incidentCurrent] || []).length
              ? (incidentSplit[incidentCurrent] || []).map((n) =>
                  card(
                    n.title || "Significant Event Record",
                    `${fmtDateTime(n.occurred_at)} • ${n.severity || "medium"} • ${n.workflow_status || n.manager_review_status || "draft"}`,
                    n.description || "Significant event recorded",
                    `
                      <button class="btn btn-secondary" onclick="App.openForm('incident', ${n.id})">Open</button>
                      ${incidentCurrent === "draft" ? `<button class="btn btn-ghost" onclick="App.submitIncident(${n.id})">Submit</button>` : ""}
                      ${incidentCurrent !== "approved" ? `<button class="btn btn-ghost" onclick="App.archiveIncident(${n.id})">Archive</button>` : ""}
                    `
                  )
                ).join("")
              : `<div class="workflow-empty">No ${escapeHtml(incidentCurrent)} significant event records.</div>`
            }
          </div>
        </div>
      </section>

      ${renderCollection(
        "Shift Handover Summary",
        "Shift continuity",
        state.cache.handover || [],
        (h) =>
          card(
            h.title || "Shift Handover Summary",
            `${fmtDate(h.handover_date)} • ${h.shift_type || "shift"} • ${h.status || "draft"}`,
            h.summary_text || "Handover summary",
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
        "Health and Wellbeing Records",
        "Health",
        records,
        (r) => card(r.title || "Health and Wellbeing Record", `${fmtDateTime(r.event_datetime)} • ${r.record_type || "record"}`, r.summary || r.outcome || "Health record")
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
        "Medication Profiles",
        "Medication",
        medProfiles,
        (m) => card(m.medication_name || "Medication", `${m.dose || "—"} • ${m.frequency || "—"}`, m.reason || "")
      )}

      ${renderCollection(
        "Medication Records",
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
        "Education and Participation Records",
        "Education",
        records,
        (r) => card(r.title || "Education and Participation Record", `${fmtDate(r.record_date)} • ${r.attendance_status || "attendance"}`, r.summary || r.learning_engagement || "Education update")
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
        "Family and Important Relationships Records",
        "Relationships",
        records,
        (r) => card(r.title || "Family and Important Relationships Record", `${fmtDateTime(r.contact_datetime)} • ${r.contact_type || "contact"}`, r.summary || r.concerns || "Relationship record")
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
  const split = splitKeyworkRecords(state.cache.keywork?.items || []);
  const current = state.workflowViews.keywork;

  return `
    <section class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-kicker">Direct work</div>
          <h3>Direct Work Records</h3>
        </div>
        <button class="btn btn-primary" onclick="App.openForm('keywork')">New Direct Work Record</button>
      </div>
      <div class="surface-body">
        ${renderStatusTabs("keywork", current, [
          { value: "draft", label: "Drafts", count: split.draft.length },
          { value: "submitted", label: "Submitted", count: split.submitted.length },
          { value: "approved", label: "Approved", count: split.approved.length }
        ])}
        <div class="records-wrap">
          ${(split[current] || []).length
            ? (split[current] || []).map((k) =>
                card(
                  k.title || "Direct Work Record",
                  `${fmtDate(k.session_date)} • ${k.workflow_status || k.status || "draft"}`,
                  k.summary || "Direct work record",
                  `
                    <button class="btn btn-secondary" onclick="App.openForm('keywork', ${k.id})">Open</button>
                    ${current === "draft" ? `<button class="btn btn-ghost" onclick="App.submitKeywork(${k.id})">Submit</button>` : ""}
                    ${current !== "approved" ? `<button class="btn btn-ghost" onclick="App.archiveKeywork(${k.id})">Archive</button>` : ""}
                  `
                )
              ).join("")
            : `<div class="workflow-empty">No ${escapeHtml(current)} direct work records.</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderPlans() {
  const split = splitPlanRecords(state.cache.plans?.items || []);
  const current = state.workflowViews.plans;

  return `
    <section class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-kicker">Care planning</div>
          <h3>Care and Support Plans</h3>
        </div>
        <button class="btn btn-primary" onclick="App.openForm('plan')">New Care and Support Plan</button>
      </div>
      <div class="surface-body">
        ${renderStatusTabs("plans", current, [
          { value: "draft", label: "Drafts", count: split.draft.length },
          { value: "submitted", label: "Submitted", count: split.submitted.length },
          { value: "approved", label: "Approved", count: split.approved.length }
        ])}
        <div class="records-wrap">
          ${(split[current] || []).length
            ? (split[current] || []).map((p) =>
                card(
                  p.title || "Care and Support Plan",
                  `${p.plan_type || "plan"} • review ${fmtDate(p.review_due_at)} • ${p.status || p.approval_status || "draft"}`,
                  p.summary || p.formulation || "Care and support plan",
                  `
                    <button class="btn btn-secondary" onclick="App.openForm('plan', ${p.id})">Open</button>
                    ${current === "draft" ? `<button class="btn btn-ghost" onclick="App.submitPlan(${p.id})">Submit</button>` : ""}
                    ${current === "submitted" ? `<button class="btn btn-ghost" onclick="App.approvePlan(${p.id})">Approve</button>` : ""}
                    ${current !== "approved" ? `<button class="btn btn-ghost" onclick="App.archivePlan(${p.id})">Archive</button>` : ""}
                  `
                )
              ).join("")
            : `<div class="workflow-empty">No ${escapeHtml(current)} care and support plans.</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderRisk() {
  const split = splitRiskRecords(Array.isArray(state.cache.risk) ? state.cache.risk : (state.cache.risk?.items || []));
  const current = state.workflowViews.risk;

  return `
    <section class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-kicker">Risk management</div>
          <h3>Safer Care and Risk Plans</h3>
        </div>
        <button class="btn btn-primary" onclick="App.openForm('risk')">New Safer Care and Risk Plan</button>
      </div>
      <div class="surface-body">
        ${renderStatusTabs("risk", current, [
          { value: "active", label: "Active", count: split.active.length },
          { value: "archived", label: "Archived", count: split.archived.length }
        ])}
        <div class="records-wrap">
          ${(split[current] || []).length
            ? (split[current] || []).map((r) =>
                card(
                  r.title || "Safer Care and Risk Plan",
                  `${r.category || "risk"} • ${r.severity || "medium"} • review ${fmtDate(r.review_date)}`,
                  r.concern_summary || "Risk plan",
                  current === "active" ? `<button class="btn btn-secondary" onclick="App.openForm('risk', ${r.id})">Open</button>` : ""
                )
              ).join("")
            : `<div class="workflow-empty">No ${escapeHtml(current)} risk plans.</div>`
          }
        </div>
      </div>
    </section>
  `;
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
    "Statutory Documents",
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
            <h3>Writing support</h3>
          </div>
        </div>
        <div class="surface-body">
          <div class="simple-item">
            All long-text fields in the main forms now support spellcheck, autosave and AI language support.
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderManagement() {
  const queue = [
    ...splitDailyRecords(state.cache.daily?.items || []).submitted.map((x) => ({
      title: x.title || "Daily Care Record",
      meta: fmtDate(x.note_date),
      body: x.summary || x.presentation || "Submitted daily care record"
    })),
    ...splitIncidentRecords(state.cache.incidents?.items || []).submitted.map((x) => ({
      title: x.title || "Significant Event Record",
      meta: fmtDateTime(x.occurred_at),
      body: x.description || "Submitted event record"
    })),
    ...splitKeyworkRecords(state.cache.keywork?.items || []).submitted.map((x) => ({
      title: x.title || "Direct Work Record",
      meta: fmtDate(x.session_date),
      body: x.summary || "Submitted direct work record"
    })),
    ...splitPlanRecords(state.cache.plans?.items || []).submitted.map((x) => ({
      title: x.title || "Care and Support Plan",
      meta: fmtDate(x.review_due_at),
      body: x.summary || x.formulation || "Submitted plan"
    }))
  ];

  return renderCollection(
    "Management queue",
    "Leadership and oversight",
    queue,
    (q) => card(q.title, q.meta, q.body)
  );
}

function renderArchive() {
  const daily = state.cache.dailyArchive?.items || [];
  const incidents = state.cache.incidentArchive?.items || [];
  const plans = state.cache.plansArchive?.items || [];
  const risk = Array.isArray(state.cache.riskArchive) ? state.cache.riskArchive : [];

  const merged = [
    ...daily.map((x) => ({ title: x.title || "Daily Care Record", meta: fmtDate(x.note_date), body: x.summary || "" })),
    ...incidents.map((x) => ({ title: x.title || "Significant Event Record", meta: fmtDateTime(x.occurred_at), body: x.description || "" })),
    ...plans.map((x) => ({ title: x.title || "Care and Support Plan", meta: fmtDate(x.review_due_at), body: x.summary || "" })),
    ...risk.map((x) => ({ title: x.title || "Safer Care and Risk Plan", meta: fmtDate(x.review_date), body: x.concern_summary || "" }))
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

function renderContent() {
  let html = `<div class="empty-state">Nothing selected.</div>`;

  if (state.primaryTab === "home") html = renderHome();

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

/* ---------- modal + forms ---------- */

function draftStorageKey(formKey, recordId = "new") {
  return `indicare_draft_${state.selectedYoungPersonId}_${formKey}_${recordId}`;
}

function clearDraftStorage(formKey, recordId = "new") {
  localStorage.removeItem(draftStorageKey(formKey, recordId));
}

function saveDraftStorage(formKey, recordId, payload) {
  localStorage.setItem(
    draftStorageKey(formKey, recordId || "new"),
    JSON.stringify(payload)
  );
}

function loadDraftStorage(formKey, recordId = "new") {
  try {
    const raw = localStorage.getItem(draftStorageKey(formKey, recordId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function updateAutosaveState(text) {
  state.modal.autosaveState = text;
  const el = $("autosaveState");
  if (el) el.textContent = text;
}

function buildField(field, data = {}) {
  const rawValue = data[field.name] ?? field.value ?? "";
  const fieldValue =
    field.type === "date" ? toDateInput(rawValue)
      : field.type === "datetime-local" ? toDateTimeInput(rawValue)
        : rawValue;

  if (field.type === "textarea") {
    return `
      <div class="field-row">
        <div class="field-head">
          <label>${escapeHtml(field.label)}</label>
          ${field.ai ? `<button type="button" class="ai-inline-btn" data-ai-field="${field.name}">AI improve</button>` : ""}
        </div>
        <textarea
          data-field="${field.name}"
          rows="5"
          spellcheck="true"
          autocapitalize="sentences"
          autocomplete="off"
        >${escapeHtml(fieldValue)}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="field-row">
        <label>${escapeHtml(field.label)}</label>
        <select data-field="${field.name}">
          ${(field.options || [])
            .map((opt) => `<option value="${escapeHtml(opt)}" ${String(fieldValue) === String(opt) ? "selected" : ""}>${escapeHtml(titleCaseLabel(opt))}</option>`)
            .join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="field-row">
      <label>${escapeHtml(field.label)}</label>
      <input
        data-field="${field.name}"
        type="${field.type || "text"}"
        value="${escapeHtml(fieldValue)}"
        autocomplete="off"
      />
    </div>
  `;
}

function openModal(title, html, kicker = "Record editor") {
  UI.modalTitle.textContent = title;
  UI.modalKicker.textContent = kicker;
  UI.modalContent.innerHTML = html;
  UI.modalStatus.textContent = "";
  UI.modal.classList.remove("hidden");
}

function resetModalState() {
  if (state.modal.autosaveTimer) {
    clearTimeout(state.modal.autosaveTimer);
  }

  state.modal.key = null;
  state.modal.recordId = null;
  state.modal.draftId = null;
  state.modal.isNew = false;
  state.modal.autosaveTimer = null;
  state.modal.autosaveState = "Ready";
  state.modal.draftCreated = false;
  state.modal.hasChanges = false;
}

function closeModal() {
  UI.modal.classList.add("hidden");
  UI.modalTitle.textContent = "Editor";
  UI.modalKicker.textContent = "Record editor";
  UI.modalContent.innerHTML = "";
  UI.modalStatus.textContent = "";
  resetModalState();
}

function buildFormLayout(schema, data = {}) {
  const sectionsHtml = schema.sections.map((section) => `
    <section class="form-section">
      <div class="form-section-head">
        <h4>${escapeHtml(section.title)}</h4>
        <p>${escapeHtml(section.helper || "")}</p>
      </div>
      <div class="form-grid ${section.columns === 2 ? "two" : "one"}">
        ${section.fields.map((field) => buildField(field, data)).join("")}
      </div>
    </section>
  `).join("");

  return `
    <div class="form-layout">
      <div class="form-intro">
        <div class="workspace-kicker">${escapeHtml(schema.kicker || "Record")}</div>
        <div class="helper-text">${escapeHtml(schema.intro || "")}</div>
        <div class="standards-row">
          ${(schema.standards || []).map((s) => `<span class="badge badge-neutral">${escapeHtml(s)}</span>`).join("")}
        </div>
      </div>

      ${sectionsHtml}

      <div class="editor-toolbar">
        <div>
          <div class="autosave-state" id="autosaveState">Ready</div>
          <div class="meta-line">Forms autosave as draft while you type. Submitting clears the form and moves the record to review.</div>
        </div>
        <div class="action-row">
          <button class="btn btn-secondary" id="modalSaveBtn">Save Draft</button>
          ${schema.save.submit ? `<button class="btn btn-primary" id="modalSubmitBtn">Submit for Review</button>` : `<button class="btn btn-primary" id="modalDoneBtn">Save and Close</button>`}
        </div>
      </div>
    </div>
  `;
}

async function openForm(formKey, recordId = null) {
  const schema = FORM_SCHEMAS[formKey];
  if (!schema) return;

  resetModalState();

  state.modal.key = formKey;
  state.modal.recordId = recordId;
  state.modal.draftId = recordId;
  state.modal.isNew = !recordId;

  let data = {};
  if (recordId && schema.load) {
    data = await api(schema.load(recordId));
  } else {
    const localDraft = loadDraftStorage(formKey, "new");
    if (localDraft) data = localDraft;
  }

  openModal(
    recordId ? `Edit ${schema.title}` : `New ${schema.title}`,
    buildFormLayout(schema, data),
    schema.kicker || "Record editor"
  );

  bindFormEditorEvents();
  updateAutosaveState(recordId ? "Loaded" : "Ready");
}

function bindFormEditorEvents() {
  document.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", onFormEdited);
    el.addEventListener("change", onFormEdited);
  });

  document.querySelectorAll("[data-ai-field]").forEach((btn) => {
    btn.addEventListener("click", () => runAiForField(btn.dataset.aiField));
  });

  const saveBtn = $("modalSaveBtn");
  const submitBtn = $("modalSubmitBtn");
  const doneBtn = $("modalDoneBtn");

  if (saveBtn) saveBtn.onclick = () => saveCurrentForm(false);
  if (submitBtn) submitBtn.onclick = () => submitCurrentForm();
  if (doneBtn) doneBtn.onclick = async () => {
    await saveCurrentForm(false);
    closeModal();
  };
}

function onFormEdited() {
  state.modal.hasChanges = true;
  updateAutosaveState("Unsaved changes");

  const schema = FORM_SCHEMAS[state.modal.key];
  if (!schema) return;

  const payload = schema.buildPayload();
  saveDraftStorage(state.modal.key, state.modal.draftId || "new", payload);

  if (state.modal.autosaveTimer) {
    clearTimeout(state.modal.autosaveTimer);
  }

  state.modal.autosaveTimer = setTimeout(async () => {
    await saveCurrentForm(true);
  }, 1400);
}

async function saveCurrentForm(isAutosave = false) {
  const schema = FORM_SCHEMAS[state.modal.key];
  if (!schema) return null;

  try {
    const payload = schema.buildPayload();

    if (isAutosave) updateAutosaveState("Saving…");

    let result;
    const targetId = state.modal.draftId || state.modal.recordId;

    if (targetId) {
      result = await putJson(schema.save.update(targetId), payload);
    } else {
      result = await postJson(schema.save.create, payload);
      const newId = result?.id || result?.record?.id || null;
      if (newId) {
        state.modal.draftId = newId;
        state.modal.recordId = newId;
        state.modal.draftCreated = true;
        clearDraftStorage(state.modal.key, "new");
        saveDraftStorage(state.modal.key, newId, payload);
      }
    }

    state.modal.hasChanges = false;
    updateAutosaveState("Saved");

    if (!isAutosave) {
      UI.modalStatus.textContent = "Draft saved.";
    }

    return state.modal.draftId || state.modal.recordId || result?.id || null;
  } catch (error) {
    updateAutosaveState("Save failed");
    if (!isAutosave) {
      UI.modalStatus.textContent = error.message || "Save failed.";
    }
    return null;
  }
}

async function submitCurrentForm() {
  const schema = FORM_SCHEMAS[state.modal.key];
  if (!schema || !schema.save.submit) return;

  try {
    updateAutosaveState("Saving…");
    const recordId = await saveCurrentForm(false);
    if (!recordId) throw new Error("Could not save draft before submission.");

    await postJson(schema.save.submit(recordId), {});
    clearDraftStorage(state.modal.key, "new");
    clearDraftStorage(state.modal.key, recordId);

    UI.modalStatus.textContent = "Submitted for manager review.";
    updateAutosaveState("Submitted");

    await loadSelectedYoungPerson();
    renderApp();

    setTimeout(() => {
      closeModal();
    }, 500);
  } catch (error) {
    UI.modalStatus.textContent = error.message || "Submission failed.";
    updateAutosaveState("Submit failed");
  }
}

async function runAiForField(fieldName) {
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (!field) return;

  const text = String(field.value || "").trim();
  if (!text) {
    UI.modalStatus.textContent = "Add some text first, then use AI improve.";
    return;
  }

  try {
    UI.modalStatus.textContent = "AI is improving the text…";

    const fd = new FormData();
    fd.append("text", text);
    fd.append("mode", "improve");
    fd.append(
      "instruction",
      "Improve spelling, grammar, clarity and professional therapeutic language for a children's residential care record. Keep the facts unchanged. Do not add information."
    );

    const result = await api(CONFIG.endpoints.ai.edit, {
      method: "POST",
      body: fd
    });

    field.value = result.text || text;
    onFormEdited();
    UI.modalStatus.textContent = "AI suggestion applied. Review before saving or submitting.";
  } catch (error) {
    UI.modalStatus.textContent = error.message || "AI improvement failed.";
  }
}

function openSimpleMessage(message) {
  openModal("Information", `<div class="simple-item">${escapeHtml(message)}</div>`);
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
    openSimpleMessage("All major long-text fields now support spellcheck, autosave and AI improve inside the editor.");
  }
}

/* ---------- data loading ---------- */

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

/* ---------- actions ---------- */

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

async function submitKeywork(id) {
  await postJson(CONFIG.endpoints.keywork.submit(id), {});
  await loadSelectedYoungPerson();
  renderApp();
}

async function archiveKeywork(id) {
  await postJson(CONFIG.endpoints.keywork.archive(id), {});
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

function setWorkflowView(key, value) {
  state.workflowViews[key] = value;
  renderContent();
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
  submitKeywork,
  archiveKeywork,
  submitPlan,
  approvePlan,
  archivePlan,
  loadInspection,
  primaryTabTo,
  setWorkflowView
};

async function init() {
  requireAuth();

  UI.userChip.textContent = currentUser().email || "Unknown user";

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

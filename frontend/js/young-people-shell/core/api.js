const API_BASE = window.location.origin;

const GET_CACHE_MS = 30000;
const inflightGetRequests = new Map();
const getResponseCache = new Map();

const DEMO_MODE =
  window.localStorage.getItem("youngPeopleShell.demoMode") === "true";

async function readJsonSafely(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildErrorMessage(response, data) {
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (typeof data?.raw === "string" && data.raw.trim()) return data.raw.trim();
  return `Request failed (${response.status})`;
}

const API_ROUTE_ALIASES = [
  [/\/young-people\/(\d+)\/alerts$/, "/young-people/$1/incidents"],

  [/\/young-people\/(\d+)\/young-person-appointments$/, "/young-people/$1/appointments"],

  [/\/young-people\/(\d+)\/handover-records$/, "/young-people/$1/timeline?limit=12"],

  [/\/young-people\/(\d+)\/health-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-profiles$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-records$/, "/young-people/$1/health"],

  [/\/young-people\/(\d+)\/education-records$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/achievements$/, "/young-people/$1/education"],

  [/\/young-people\/(\d+)\/family-contact-records$/, "/young-people/$1/family"],

  [/\/young-people\/(\d+)\/safeguarding-records$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/missing-episodes$/, "/young-people/$1/incidents"],

  [/\/young-people\/(\d+)\/tasks$/, "/young-people/$1/tasks"],
  [/\/young-people\/(\d+)\/documents$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/approvals$/, "/young-people/$1/compliance"],

  [/\/young-people\/(\d+)\/manager-review$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-actions$/, "/young-people/$1/compliance"],

  [/\/young-people\/(\d+)\/risks$/, "/young-people/$1/plans"],

  [/\/young-people\/(\d+)\/inspection-packs$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/monthly-reviews$/, "/young-people/$1/reports"],

  [/\/homes\/(\d+)\/young-people$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/communications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/documents$/, "/homes/$1/documents"],
  [/\/homes\/(\d+)\/therapy$/, "/homes/$1/therapy"],
  [/\/homes\/(\d+)\/team$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/supervisions$/, "/homes/$1/supervisions"],
  [/\/homes\/(\d+)\/reports$/, "/homes/$1/reports"],
  [/\/homes\/(\d+)\/quality-dashboard$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/compliance-dashboard$/, "/homes/$1/compliance"],
];

function shouldResolveAlias(method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  return upper === "GET" || upper === "HEAD";
}

export function resolveApiUrl(url, method = "GET") {
  if (!url || typeof url !== "string") return url;
  if (!shouldResolveAlias(method)) return url;

  for (const [pattern, replacement] of API_ROUTE_ALIASES) {
    if (pattern.test(url)) {
      return url.replace(pattern, replacement);
    }
  }

  return url;
}

function getCookie(name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + escaped + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

export function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

export function withCsrfHeaders(method = "GET", headers = {}) {
  const upper = String(method || "GET").toUpperCase();
  const nextHeaders = {
    ...(headers || {}),
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(upper)) {
    const csrfToken = getCsrfToken();
    if (csrfToken && !nextHeaders["X-CSRF-Token"]) {
      nextHeaders["X-CSRF-Token"] = csrfToken;
    }
  }

  return nextHeaders;
}

function makeCacheKey(method, resolvedUrl) {
  return `${String(method || "GET").toUpperCase()}::${resolvedUrl}`;
}

function getCachedResponse(cacheKey) {
  const cached = getResponseCache.get(cacheKey);
  if (!cached) return null;

  const expired = Date.now() - cached.timestamp > GET_CACHE_MS;
  if (expired) {
    getResponseCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedResponse(cacheKey, data) {
  getResponseCache.set(cacheKey, {
    timestamp: Date.now(),
    data,
  });
}

function shouldCacheRequest(method = "GET", options = {}) {
  const upper = String(method || "GET").toUpperCase();
  if (upper !== "GET") return false;
  if (options.skipCache) return false;
  return true;
}

export function clearApiCache(url = null) {
  if (!url) {
    getResponseCache.clear();
    inflightGetRequests.clear();
    return;
  }

  const resolvedUrl = resolveApiUrl(url, "GET");
  const cacheKey = makeCacheKey("GET", resolvedUrl);
  getResponseCache.delete(cacheKey);
  inflightGetRequests.delete(cacheKey);
}

function invalidateCacheByPrefixes(prefixes = []) {
  if (!Array.isArray(prefixes) || !prefixes.length) {
    clearApiCache();
    return;
  }

  const safePrefixes = prefixes.filter(Boolean);
  if (!safePrefixes.length) {
    clearApiCache();
    return;
  }

  for (const key of [...getResponseCache.keys()]) {
    const [, urlPart = ""] = key.split("::");
    if (safePrefixes.some((prefix) => urlPart.startsWith(prefix))) {
      getResponseCache.delete(key);
    }
  }

  for (const key of [...inflightGetRequests.keys()]) {
    const [, urlPart = ""] = key.split("::");
    if (safePrefixes.some((prefix) => urlPart.startsWith(prefix))) {
      inflightGetRequests.delete(key);
    }
  }
}

/* =========================
   DEMO DATA HELPERS
   ========================= */

function demoHome(homeId = 1) {
  return {
    id: homeId,
    name: "IndiCare House",
    home_name: "IndiCare House",
    registration_status: "Active",
    local_authority: "Birmingham",
  };
}

function demoYoungPeople(homeId = 1) {
  return [
    {
      id: 101,
      home_id: homeId,
      first_name: "Jay",
      last_name: "Smith",
      preferred_name: "Jay",
      full_name: "Jay Smith",
      placement_status: "active",
      summary_risk_level: "medium",
      home_name: "IndiCare House",
      date_of_birth: "2010-08-14",
      gender: "Male",
    },
    {
      id: 102,
      home_id: homeId,
      first_name: "Amira",
      last_name: "Khan",
      preferred_name: "Amira",
      full_name: "Amira Khan",
      placement_status: "active",
      summary_risk_level: "high",
      home_name: "IndiCare House",
      date_of_birth: "2009-11-02",
      gender: "Female",
    },
    {
      id: 103,
      home_id: homeId,
      first_name: "Luca",
      last_name: "Brown",
      preferred_name: "Luca",
      full_name: "Luca Brown",
      placement_status: "active",
      summary_risk_level: "low",
      home_name: "IndiCare House",
      date_of_birth: "2011-03-21",
      gender: "Male",
    },
  ];
}

function demoTimelineItems(youngPersonId) {
  return [
    {
      id: 1,
      title: "Behaviour incident",
      summary: "Verbal escalation after school, settled with staff support.",
      category: "incident",
      event_datetime: "2026-04-11T16:15:00Z",
      significance: "medium",
      record_type: "chronology_event",
    },
    {
      id: 2,
      title: "Health appointment attended",
      summary: "Routine GP medication review completed.",
      category: "health",
      event_datetime: "2026-04-09T10:00:00Z",
      significance: "low",
      record_type: "chronology_event",
    },
    {
      id: 3,
      title: "Family contact",
      summary: "Positive phone contact with mum.",
      category: "family",
      event_datetime: "2026-04-07T18:30:00Z",
      significance: "low",
      record_type: "chronology_event",
    },
  ].map((x) => ({ ...x, young_person_id: youngPersonId }));
}

function demoIncidents(youngPersonId) {
  return [
    {
      id: 201,
      young_person_id: youngPersonId,
      incident_type: "Behaviour incident",
      title: "Behaviour incident",
      description: "Verbal escalation after returning from school.",
      summary: "Verbal escalation after returning from school.",
      severity: "medium",
      significance: "medium",
      incident_datetime: "2026-04-11T16:15:00Z",
      status: "reviewed",
      workflow_status: "reviewed",
      actions_taken: "Offered space, low arousal approach used, later repair completed.",
      child_voice: "Said school had been stressful.",
      source_table: "incidents",
      record_type: "incident",
    },
    {
      id: 202,
      young_person_id: youngPersonId,
      incident_type: "Missing from placement",
      title: "Missing from placement",
      description: "Absent from home for 25 minutes after community activity.",
      summary: "Absent from home for 25 minutes after community activity.",
      severity: "high",
      significance: "high",
      incident_datetime: "2026-04-06T18:40:00Z",
      status: "pending_review",
      workflow_status: "pending_review",
      actions_taken: "Search completed, young person returned safely.",
      child_voice: "Did not want to come back straight away.",
      source_table: "incidents",
      record_type: "incident",
    },
  ];
}

function demoTasks(youngPersonId) {
  return [
    {
      id: 301,
      young_person_id: youngPersonId,
      title: "Book GP appointment",
      task: "Book GP appointment",
      status: "open",
      due_date: "2026-04-15",
      completed: false,
      record_type: "task",
      source_table: "tasks",
    },
    {
      id: 302,
      young_person_id: youngPersonId,
      title: "Update school transport form",
      task: "Update school transport form",
      status: "open",
      due_date: "2026-04-19",
      completed: false,
      record_type: "task",
      source_table: "tasks",
    },
  ];
}

function demoHealth(youngPersonId) {
  return [
    {
      id: 401,
      young_person_id: youngPersonId,
      title: "GP medication review",
      record_type: "health_record",
      source_table: "health_records",
      summary: "Medication reviewed with no changes.",
      event_datetime: "2026-04-09T10:00:00Z",
      professional_name: "Dr Ahmed",
      outcome: "Continue current medication.",
      significance: "low",
      workflow_status: "approved",
      next_action_date: "2026-06-01",
    },
    {
      id: 402,
      young_person_id: youngPersonId,
      title: "Dental check",
      record_type: "health_record",
      source_table: "health_records",
      summary: "Routine dental check completed.",
      event_datetime: "2026-03-21T14:00:00Z",
      professional_name: "Smile Dental",
      outcome: "Next review in 6 months.",
      significance: "low",
      workflow_status: "approved",
    },
  ];
}

function demoEducation(youngPersonId) {
  return [
    {
      id: 501,
      young_person_id: youngPersonId,
      title: "Education record",
      record_type: "education_record",
      source_table: "education_records",
      provision_name: "Riverside Academy",
      attendance_status: "Attended",
      learning_engagement: "Engaged in the morning, reduced concentration in afternoon.",
      behaviour_summary: "Needed 1:1 support after lunch.",
      issue_raised: "",
      record_date: "2026-04-10",
      significance: "medium",
      workflow_status: "approved",
    },
    {
      id: 502,
      young_person_id: youngPersonId,
      title: "Education record",
      record_type: "education_record",
      source_table: "education_records",
      provision_name: "Riverside Academy",
      attendance_status: "Partial attendance",
      learning_engagement: "Joined maths and tutor session.",
      behaviour_summary: "Anxious on arrival.",
      issue_raised: "Travel anxiety",
      record_date: "2026-04-08",
      significance: "medium",
      workflow_status: "approved",
    },
  ];
}

function demoFamily(youngPersonId) {
  return [
    {
      id: 601,
      young_person_id: youngPersonId,
      record_type: "family_contact_record",
      source_table: "family_contact_records",
      contact_type: "Phone call",
      contact_person: "Mum",
      contact_datetime: "2026-04-07T18:30:00Z",
      post_contact_presentation: "Settled and positive afterwards.",
      concerns: "",
      child_voice: "Said it was nice to speak.",
      significance: "low",
      workflow_status: "approved",
    },
    {
      id: 602,
      young_person_id: youngPersonId,
      record_type: "family_contact_record",
      source_table: "family_contact_records",
      contact_type: "Community visit",
      contact_person: "Grandmother",
      contact_datetime: "2026-03-30T13:00:00Z",
      post_contact_presentation: "Tearful returning home.",
      concerns: "Needed extra support after return.",
      child_voice: "Wanted longer contact.",
      significance: "medium",
      workflow_status: "approved",
    },
  ];
}

function demoAppointments(youngPersonId) {
  return [
    {
      id: 701,
      young_person_id: youngPersonId,
      record_type: "appointment",
      source_table: "appointments",
      title: "GP medication review",
      appointment_type: "Health",
      start_datetime: "2026-04-22T09:30:00Z",
      location: "Central Medical Practice",
      professional_name: "Dr Ahmed",
      status: "booked",
      summary: "Routine medication review.",
      follow_up_actions: "",
    },
    {
      id: 702,
      young_person_id: youngPersonId,
      record_type: "appointment",
      source_table: "appointments",
      title: "PEP meeting",
      appointment_type: "Education",
      start_datetime: "2026-04-25T13:00:00Z",
      location: "School",
      professional_name: "Virtual School Team",
      status: "booked",
      summary: "Termly education planning meeting.",
      follow_up_actions: "Prepare attendance summary.",
    },
  ];
}

function demoReports(youngPersonId) {
  return [
    {
      id: 801,
      young_person_id: youngPersonId,
      record_type: "monthly_review",
      source_table: "monthly_reviews",
      review_title: "March monthly review",
      review_month: "2026-03",
      status: "approved",
      summary_of_month: "Month showed stable routines with some school-related anxiety.",
      progress_summary: "Improved morning routines and reduced conflict in evenings.",
      child_voice_summary: "Young person said school remains the biggest stressor.",
    },
  ];
}

function demoCompliance(homeId = 1) {
  return [
    {
      id: 901,
      home_id: homeId,
      title: "Regulation 44 visit due",
      status: "overdue",
      due_date: "2026-04-08",
      severity: "high",
      record_type: "compliance_item",
      source_table: "compliance_items",
    },
    {
      id: 902,
      home_id: homeId,
      title: "Fire drill record",
      status: "due_soon",
      due_date: "2026-04-16",
      severity: "medium",
      record_type: "compliance_item",
      source_table: "compliance_items",
    },
    {
      id: 903,
      home_id: homeId,
      title: "Staff training matrix review",
      status: "active",
      due_date: "2026-04-28",
      severity: "low",
      record_type: "compliance_item",
      source_table: "compliance_items",
    },
  ];
}

function demoDocuments(homeId = 1) {
  return [
    {
      id: 1001,
      home_id: homeId,
      title: "Statement of Purpose",
      document_type: "Governance",
      summary: "Latest signed version available.",
      status: "active",
      review_date: "2026-06-01",
      record_type: "statutory_document",
      source_table: "statutory_documents",
    },
    {
      id: 1002,
      home_id: homeId,
      title: "Location Risk Assessment",
      document_type: "Risk",
      summary: "Review required following recent incident trend.",
      status: "review_due",
      review_date: "2026-04-20",
      record_type: "statutory_document",
      source_table: "statutory_documents",
    },
    {
      id: 1003,
      home_id: homeId,
      title: "Fire Safety Certificate",
      document_type: "Safety",
      summary: "Current certification on file.",
      status: "valid",
      review_date: "2026-09-15",
      record_type: "statutory_document",
      source_table: "statutory_documents",
    },
    {
      id: 1004,
      home_id: homeId,
      title: "Missing from Care Protocol",
      document_type: "Procedure",
      summary: "Requires annual refresh.",
      status: "expired",
      review_date: "2026-03-15",
      record_type: "statutory_document",
      source_table: "statutory_documents",
    },
  ];
}

function demoTeam(homeId = 1) {
  return [
    {
      id: 1101,
      home_id: homeId,
      staff_member: "Sarah Jones",
      role: "Registered Manager",
      status: "On shift",
    },
    {
      id: 1102,
      home_id: homeId,
      staff_member: "Tom Patel",
      role: "Senior Residential Worker",
      status: "On shift",
    },
    {
      id: 1103,
      home_id: homeId,
      staff_member: "Leah Brown",
      role: "Residential Worker",
      status: "Off shift",
    },
    {
      id: 1104,
      home_id: homeId,
      staff_member: "Amir Hussain",
      role: "Waking Night",
      status: "Annual leave",
    },
  ];
}

function demoTherapy(homeId = 1) {
  return [
    {
      id: 1201,
      home_id: homeId,
      title: "Therapeutic session",
      summary: "Young person engaged well and reflected on recent conflict.",
      status: "Completed",
      created_at: "2026-04-10T10:30:00Z",
      record_type: "therapy",
      source_table: "therapy",
    },
    {
      id: 1202,
      home_id: homeId,
      title: "Clinical consultation",
      summary: "Staff advised to reduce verbal demand during escalation.",
      status: "Completed",
      created_at: "2026-04-04T14:00:00Z",
      record_type: "therapy",
      source_table: "therapy",
    },
  ];
}

function demoCommunications(homeId = 1) {
  return [
    {
      id: 1301,
      home_id: homeId,
      title: "IRO update",
      summary: "Review meeting confirmed for next Tuesday.",
      status: "Sent",
      contact_datetime: "2026-04-11T09:00:00Z",
      record_type: "communication",
      source_table: "communications",
    },
    {
      id: 1302,
      home_id: homeId,
      title: "Social worker email",
      summary: "Requested updated incident chronology.",
      status: "Received",
      contact_datetime: "2026-04-09T15:20:00Z",
      record_type: "communication",
      source_table: "communications",
    },
  ];
}

function demoSupervisions(homeId = 1) {
  return [
    {
      id: 1401,
      home_id: homeId,
      staff_member: "Tom Patel",
      role: "Senior Residential Worker",
      status: "due_soon",
      due_date: "2026-04-18",
      record_type: "supervision",
      source_table: "supervisions",
    },
    {
      id: 1402,
      home_id: homeId,
      staff_member: "Leah Brown",
      role: "Residential Worker",
      status: "overdue",
      due_date: "2026-04-10",
      record_type: "supervision",
      source_table: "supervisions",
    },
  ];
}

function demoAssistantReply(payload = {}) {
  const scope =
    payload?.context?.scope ||
    payload?.context?.current_scope ||
    payload?.context?.scope_type ||
    "child";

  const section =
    payload?.context?.current_view ||
    payload?.context?.current_section ||
    "workspace";

  const name =
    payload?.context?.young_person_name ||
    "the young person";

  const homeName =
    payload?.context?.home_name ||
    "the home";

  if (scope === "home") {
    return `Summary for ${homeName}: staffing is broadly stable, there are a small number of overdue compliance items, and leadership attention should focus on supervision timeliness, document review dates, and preparing for upcoming multi-agency meetings.`;
  }

  if (scope === "quality") {
    return `Quality summary for ${homeName}: the main themes are document review timeliness, consistency of management oversight, and maintaining clear evidence of follow-up actions. Inspection readiness would improve by tightening compliance tracking and supervision completion.`;
  }

  return `Summary for ${name}: current themes suggest school-related anxiety, generally responsive relationships with staff, and a need for continued attention to predictable routines, follow-up actions, and emotionally regulated transitions, especially around education and family contact. Section in view: ${section}.`;
}

function getDemoResponse(url, method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  if (upper !== "GET") return null;

  let match;

  match = url.match(/^\/homes\/(\d+)\/dashboard(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      home: demoHome(homeId),
      items: [],
      young_people: demoYoungPeople(homeId),
      summary: {
        occupancy: 3,
        incidents_last_7_days: 2,
        overdue_items: 4,
        staffing_pressure: "medium",
      },
      alerts: [
        { id: 1, title: "Two compliance items overdue", severity: "high" },
        { id: 2, title: "One supervision due this week", severity: "medium" },
      ],
    };
  }

  match = url.match(/^\/homes\/(\d+)\/team(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      items: demoTeam(homeId),
      team: demoTeam(homeId),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/documents(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      items: demoDocuments(homeId),
      documents: demoDocuments(homeId),
      statutory_documents: demoDocuments(homeId),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/therapy(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      items: demoTherapy(homeId),
      therapy: demoTherapy(homeId),
      therapy_records: demoTherapy(homeId),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/communications(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      items: demoCommunications(homeId),
      communications: demoCommunications(homeId),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/supervisions(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      items: demoSupervisions(homeId),
      supervisions: demoSupervisions(homeId),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/reports(?:\?.*)?$/);
  if (match) {
    return {
      items: [
        {
          id: 1501,
          title: "Monthly home summary",
          summary: "Stable month overall with two notable incidents.",
          status: "completed",
          review_month: "2026-03",
          record_type: "monthly_review",
        },
      ],
      reports: [
        {
          id: 1501,
          title: "Monthly home summary",
          summary: "Stable month overall with two notable incidents.",
          status: "completed",
          review_month: "2026-03",
          record_type: "monthly_review",
        },
      ],
    };
  }

  match = url.match(/^\/homes\/(\d+)\/quality(?:\?.*)?$/);
  if (match) {
    return {
      summary: {
        rating: "Good",
        concerns: 2,
        strengths: 5,
      },
      items: [
        {
          id: 1601,
          title: "Audit action",
          summary: "Medication signatures complete in 95% of records.",
          status: "monitor",
        },
      ],
    };
  }

  match = url.match(/^\/homes\/(\d+)\/compliance(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      items: demoCompliance(homeId),
      compliance_items: demoCompliance(homeId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/incidents(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoIncidents(youngPersonId),
      incidents: demoIncidents(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/tasks(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoTasks(youngPersonId),
      tasks: demoTasks(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/health(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoHealth(youngPersonId),
      health_records: demoHealth(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/education(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoEducation(youngPersonId),
      education_records: demoEducation(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/family(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoFamily(youngPersonId),
      family_contact_records: demoFamily(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/appointments(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoAppointments(youngPersonId),
      appointments: demoAppointments(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/reports(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoReports(youngPersonId),
      reports: demoReports(youngPersonId),
      monthly_reviews: demoReports(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/timeline(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoTimelineItems(youngPersonId),
      chronology_events: demoTimelineItems(youngPersonId),
      timeline: demoTimelineItems(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/compliance(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: demoTasks(youngPersonId),
      compliance_items: demoTasks(youngPersonId),
    };
  }

  match = url.match(/^\/young-people\/(\d+)\/plans(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    return {
      items: [
        {
          id: 1701,
          young_person_id: youngPersonId,
          title: "Risk assessment",
          summary: "Current triggers include school transition and uncertainty.",
          category: "Emotional wellbeing",
          review_date: "2026-04-26",
          status: "active",
          record_type: "risk_assessment",
        },
      ],
      risks: [
        {
          id: 1701,
          young_person_id: youngPersonId,
          title: "Risk assessment",
          summary: "Current triggers include school transition and uncertainty.",
          category: "Emotional wellbeing",
          review_date: "2026-04-26",
          status: "active",
          record_type: "risk_assessment",
        },
      ],
      risk_assessments: [
        {
          id: 1701,
          young_person_id: youngPersonId,
          title: "Risk assessment",
          summary: "Current triggers include school transition and uncertainty.",
          category: "Emotional wellbeing",
          review_date: "2026-04-26",
          status: "active",
          record_type: "risk_assessment",
        },
      ],
    };
  }

  return null;
}

export async function apiRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const resolvedUrl = resolveApiUrl(url, method);
  const isFormData = options.body instanceof FormData;
  const useCache = shouldCacheRequest(method, options);
  const cacheKey = makeCacheKey(method, resolvedUrl);

  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) return inflight;
  }

  if (DEMO_MODE) {
    const demo = getDemoResponse(resolvedUrl, method);
    if (demo !== null) {
      if (useCache) {
        setCachedResponse(cacheKey, demo);
      }
      return demo;
    }
  }

  const headers = withCsrfHeaders(method, {
    Accept: options.accept || "application/json",
    ...(options.headers || {}),
  });

  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    credentials: "include",
    ...options,
    method,
    headers,
  };

  delete config.accept;
  delete config.invalidatePrefixes;
  delete config.skipCache;

  if (
    config.body &&
    typeof config.body !== "string" &&
    !(config.body instanceof FormData)
  ) {
    config.body = JSON.stringify(config.body);
  }

  const requestPromise = (async () => {
    let response;

    try {
      response = await fetch(`${API_BASE}${resolvedUrl}`, config);
    } catch {
      throw new Error("Network error");
    }

    const data = await readJsonSafely(response);

    if (!response.ok) {
      const error = new Error(buildErrorMessage(response, data));
      error.status = response.status;
      error.data = data;
      error.url = `${API_BASE}${resolvedUrl}`;
      error.originalUrl = url;
      throw error;
    }

    if (useCache) {
      setCachedResponse(cacheKey, data);
    }

    return data;
  })();

  if (useCache) {
    inflightGetRequests.set(cacheKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (useCache) {
      inflightGetRequests.delete(cacheKey);
    }
  }
}

export async function apiGet(url, options = {}) {
  return apiRequest(url, {
    method: "GET",
    ...options,
  });
}

export async function apiSend(url, method = "POST", body = null, options = {}) {
  if (DEMO_MODE) {
    clearApiCache();
    return {
      ok: true,
      status: "demo_saved",
      record: body || {},
      item: body || {},
      data: body || {},
      id: Date.now(),
    };
  }

  const response = await apiRequest(url, {
    method,
    body,
    skipCache: true,
    ...options,
  });

  if (Array.isArray(options.invalidatePrefixes) && options.invalidatePrefixes.length) {
    invalidateCacheByPrefixes(options.invalidatePrefixes);
  } else {
    clearApiCache();
  }

  return response;
}

export function unwrapCreateResponse(recordType, response) {
  if (!response || typeof response !== "object") return response;

  const directKeys = ["item", "record", "data", recordType];

  for (const key of directKeys) {
    if (response[key] && typeof response[key] === "object") {
      return response[key];
    }
  }

  const commonByType = {
    daily_note: ["daily_note"],
    incident: ["incident"],
    support_plan: ["support_plan", "plan"],
    risk: ["risk", "risk_assessment"],
    health_record: ["health_record"],
    education_record: ["education_record"],
    family_contact: ["family_contact_record", "contact"],
    keywork: ["keywork", "keywork_session"],
    appointment: ["appointment", "young_person_appointment"],
    achievement_record: ["achievement_record", "achievement"],
    safeguarding_record: ["safeguarding_record"],
    missing_episode: ["missing_episode"],
    task: ["task"],
    profile_identity: ["identity_profile", "young_person_identity_profile"],
    profile_communication: [
      "communication_profile",
      "young_person_communication_profile",
    ],
    profile_education: ["education_profile", "young_person_education_profile"],
    profile_health: ["health_profile", "young_person_health_profile"],
    profile_legal: ["legal_status", "young_person_legal_status"],
    profile_formulation: [
      "formulation",
      "young_person_formulation",
      "young_person_formulations",
    ],
    communication: ["communication"],
    document: ["document"],
    therapy: ["therapy"],
    team: ["team"],
    supervision: ["supervision"],
    compliance: ["compliance", "compliance_item"],
    audit: ["audit"],
  };

  const keys = commonByType[recordType] || [];
  for (const key of keys) {
    if (response[key] && typeof response[key] === "object") {
      return response[key];
    }
  }

  return response;
}

export function buildSseContextFetch(url, payload) {
  return fetch(`${API_BASE}${url}`, {
    method: "POST",
    credentials: "include",
    headers: withCsrfHeaders("POST", {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    }),
    body: JSON.stringify(payload || {}),
  });
}

function parseSseBlock(block) {
  const lines = block.split("\n");
  let eventName = "message";
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;

    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
    }
  }

  return {
    eventName,
    payload: dataLines.join("\n"),
  };
}

function consumeSseBuffer(buffer, onEvent) {
  const parts = buffer.split("\n\n");
  const completeBlocks = parts.slice(0, -1);
  const remainder = parts[parts.length - 1] || "";

  for (const block of completeBlocks) {
    if (!block.trim()) continue;
    const parsed = parseSseBlock(block);
    onEvent(parsed.eventName, parsed.payload);
  }

  return remainder;
}

function resolveAssistantEndpoint(payload = {}) {
  const scope =
    payload?.context?.scope ||
    payload?.context?.current_scope ||
    payload?.context?.scope_type ||
    "child";

  if (scope === "home") return "/home/assistant";
  if (scope === "quality") return "/quality/assistant";
  return "/young-people/assistant";
}

export async function apiStreamAssistant(payload, handlers = {}) {
  if (DEMO_MODE) {
    const {
      onMeta = () => {},
      onMessage = () => {},
      onProgress = () => {},
      onDone = () => {},
    } = handlers;

    onMeta({
      sources: [],
      runtime: {
        mode: "demo",
        provider: "local-demo",
      },
      explainability: {
        summary: "This is a demonstration assistant response using local sample data.",
      },
      assistant_scope: payload?.context || {},
      assistant_context: payload?.context || {},
      suggested_actions: [
        { label: "Summarise key risks" },
        { label: "Draft handover" },
        { label: "What needs attention next?" },
      ],
    });

    onProgress("Analysing records...");
    const finalText = demoAssistantReply(payload);
    onMessage(finalText);
    onDone(finalText);
    return;
  }

  const endpoint = resolveAssistantEndpoint(payload);
  const response = await buildSseContextFetch(endpoint, payload);

  if (!response.ok) {
    const data = await readJsonSafely(response);
    throw new Error(buildErrorMessage(response, data));
  }

  if (!response.body) {
    throw new Error("No assistant response stream was returned.");
  }

  const {
    onMeta = () => {},
    onMessage = () => {},
    onProgress = () => {},
    onDone = () => {},
  } = handlers;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamedText = "";
  let doneEmitted = false;

  const finish = () => {
    if (doneEmitted) return;
    doneEmitted = true;
    onDone(streamedText);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      buffer = consumeSseBuffer(buffer, (eventName, payloadValue) => {
        if (payloadValue === "[DONE]" || eventName === "done") {
          finish();
          return;
        }

        if (eventName === "meta") {
          try {
            onMeta(JSON.parse(payloadValue || "{}"));
          } catch {
            onMeta({});
          }
          return;
        }

        if (eventName === "progress") {
          onProgress(payloadValue || "");
          return;
        }

        if (eventName === "message") {
          streamedText += payloadValue || "";
          onMessage(streamedText);
        }
      });
    }

    if (buffer.trim()) {
      consumeSseBuffer(`${buffer}\n\n`, (eventName, payloadValue) => {
        if (payloadValue === "[DONE]" || eventName === "done") {
          finish();
          return;
        }

        if (eventName === "meta") {
          try {
            onMeta(JSON.parse(payloadValue || "{}"));
          } catch {
            onMeta({});
          }
          return;
        }

        if (eventName === "progress") {
          onProgress(payloadValue || "");
          return;
        }

        if (eventName === "message") {
          streamedText += payloadValue || "";
          onMessage(streamedText);
        }
      });
    }
  } finally {
    finish();
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

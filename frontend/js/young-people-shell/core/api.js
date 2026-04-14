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
  // ------------------------------
  // Young person aliases
  // ------------------------------
  [/\/young-people\/(\d+)\/alerts$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/young-person-appointments$/, "/young-people/$1/appointments"],
  [/\/young-people\/(\d+)\/handover-records$/, "/young-people/$1/timeline?limit=12"],

  // Health
  [/\/young-people\/(\d+)\/health-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-profiles$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-records$/, "/young-people/$1/health"],

  // Education
  [/\/young-people\/(\d+)\/education-records$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/achievements$/, "/young-people/$1/education"],

  // Family
  [/\/young-people\/(\d+)\/family-contact-records$/, "/young-people/$1/family"],

  // Timeline / safeguarding
  [/\/young-people\/(\d+)\/safeguarding-records$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/missing-episodes$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/safeguarding$/, "/young-people/$1/incidents"],

  // Readiness / action fallbacks
  [/\/young-people\/(\d+)\/documents$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/approvals$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-review$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-actions$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/child-compliance$/, "/young-people/$1/compliance"],

  // Planning / risk
  [/\/young-people\/(\d+)\/risks$/, "/young-people/$1/plans"],

  // Reports
  [/\/young-people\/(\d+)\/inspection-packs$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/monthly-reviews$/, "/young-people/$1/reports"],

  // Optional unsupported child routes -> safe fallbacks
  [/\/young-people\/(\d+)\/communications$/, "/young-people/$1/family"],
  [/\/young-people\/(\d+)\/therapy$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/keywork$/, "/young-people/$1/timeline"],

  // ------------------------------
  // Home aliases
  // ------------------------------
  [/\/homes\/(\d+)\/young-people$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/quality-dashboard$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/compliance-dashboard$/, "/homes/$1/compliance"],

  // Stable direct home routes
  [/\/homes\/(\d+)\/communications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/documents$/, "/homes/$1/documents"],
  [/\/homes\/(\d+)\/therapy$/, "/homes/$1/therapy"],
  [/\/homes\/(\d+)\/team$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/supervisions$/, "/homes/$1/supervisions"],
  [/\/homes\/(\d+)\/reports$/, "/homes/$1/reports"],
  [/\/homes\/(\d+)\/quality$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/compliance$/, "/homes/$1/compliance"],

  // Home unsupported workflow routes -> safe fallbacks
  [/\/homes\/(\d+)\/tasks$/, "/homes/$1/compliance"],
  [/\/homes\/(\d+)\/incidents$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/manager-actions$/, "/homes/$1/compliance"],
  [/\/homes\/(\d+)\/risks$/, "/homes/$1/compliance"],
  [/\/homes\/(\d+)\/daily-notes$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/keywork$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/training$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/probations$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/inductions$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/staff$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/staff-documents$/, "/homes/$1/documents"],
  [/\/homes\/(\d+)\/notifications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/inspection-readiness$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/audits$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/safeguarding$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/child-compliance$/, "/homes/$1/compliance"],
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

function iso(daysOffset = 0, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateOnly(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function pick(list, index) {
  return list[index % list.length];
}

function makeAdults(homeId = 1) {
  return [
    { id: 1, full_name: "Sarah Jones", role: "Registered Manager", status: "On shift", home_id: homeId },
    { id: 2, full_name: "Tom Patel", role: "Deputy Manager", status: "On shift", home_id: homeId },
    { id: 3, full_name: "Leah Brown", role: "Senior Residential Worker", status: "On shift", home_id: homeId },
    { id: 4, full_name: "Amir Hussain", role: "Residential Worker", status: "On shift", home_id: homeId },
    { id: 5, full_name: "Chloe Davies", role: "Residential Worker", status: "On shift", home_id: homeId },
    { id: 6, full_name: "Michael Osei", role: "Waking Night Residential Worker", status: "On shift", home_id: homeId },
    { id: 7, full_name: "Danielle Green", role: "Residential Worker", status: "On shift", home_id: homeId },
    { id: 8, full_name: "Helen Morris", role: "Residential Worker", status: "On shift", home_id: homeId },
    { id: 9, full_name: "Chris Walker", role: "Residential Worker", status: "Off shift", home_id: homeId },
    { id: 10, full_name: "Priya Shah", role: "Therapist", status: "Visiting professional", home_id: homeId },
    { id: 11, full_name: "Jade Collins", role: "Residential Worker", status: "On shift", home_id: homeId },
    { id: 12, full_name: "Mason Reed", role: "Residential Worker", status: "Annual leave", home_id: homeId },
    { id: 13, full_name: "Olivia Bennett", role: "Residential Worker", status: "On shift", home_id: homeId },
  ];
}

function makeYoungPeople(homeId = 1) {
  return [
    {
      id: 101,
      home_id: homeId,
      first_name: "Jay",
      last_name: "Smith",
      preferred_name: "Jay",
      full_name: "Jay Smith",
      date_of_birth: "2010-08-14",
      gender: "Male",
      placement_status: "active",
      summary_risk_level: "medium",
      home_name: "IndiCare House",
      primary_keyworker_id: 3,
    },
    {
      id: 102,
      home_id: homeId,
      first_name: "Amira",
      last_name: "Khan",
      preferred_name: "Amira",
      full_name: "Amira Khan",
      date_of_birth: "2009-11-02",
      gender: "Female",
      placement_status: "active",
      summary_risk_level: "high",
      home_name: "IndiCare House",
      primary_keyworker_id: 5,
    },
    {
      id: 103,
      home_id: homeId,
      first_name: "Luca",
      last_name: "Brown",
      preferred_name: "Luca",
      full_name: "Luca Brown",
      date_of_birth: "2011-03-21",
      gender: "Male",
      placement_status: "active",
      summary_risk_level: "low",
      home_name: "IndiCare House",
      primary_keyworker_id: 11,
    },
  ];
}

function makeDocuments(homeId = 1) {
  const areas = [
    "Placement Plan",
    "Risk Assessment",
    "Health Care Plan",
    "PEP",
    "Family Contact Plan",
    "Behaviour Support Plan",
    "Safeguarding Chronology",
    "Missing From Care Protocol",
    "Statement of Purpose",
    "Location Risk Assessment",
    "Fire Safety Record",
    "Safer Recruitment Audit",
  ];

  return areas.map((area, i) => ({
    id: 1000 + i + 1,
    home_id: homeId,
    title: `${area}`,
    document_type: area,
    summary: `${area} available for review and inspection evidence.`,
    status: i % 5 === 0 ? "review_due" : i % 6 === 0 ? "expired" : "active",
    review_date: dateOnly(i - 3),
    record_type: "statutory_document",
    source_table: "statutory_documents",
  }));
}

function makeTeam(homeId = 1) {
  return makeAdults(homeId).map((a, i) => ({
    id: a.id,
    home_id: a.home_id,
    staff_member: a.full_name,
    full_name: a.full_name,
    role: a.role,
    status: a.status,
    employment_status:
      a.status === "Annual leave"
        ? "active"
        : a.role === "Therapist"
        ? "active"
        : i === 8
        ? "agency"
        : "active",
    line_manager:
      a.role === "Registered Manager"
        ? "Tom Kelly"
        : a.role === "Deputy Manager"
        ? "Sarah Jones"
        : "Tom Patel",
    start_date: dateOnly(-(40 + i * 18)),
    record_type: "team",
    source_table: "team",
  }));
}

function makeSupervisions(homeId = 1) {
  return makeAdults(homeId).map((a, i) => ({
    id: 2000 + i + 1,
    home_id: homeId,
    staff_member: a.full_name,
    role: a.role,
    status: i % 4 === 0 ? "overdue" : i % 4 === 1 ? "due_soon" : "active",
    due_date: dateOnly(i - 4),
    next_due_date: dateOnly(i - 4),
    summary: `${a.full_name} supervision ${i % 4 === 0 ? "overdue" : i % 4 === 1 ? "due soon" : "up to date"}.`,
    record_type: "supervision",
    source_table: "supervisions",
  }));
}

function makeCommunications(homeId = 1) {
  const subjects = [
    "IRO update",
    "Social worker email",
    "School safeguarding query",
    "Virtual school call",
    "CAMHS feedback",
    "Family update",
    "LADO information request",
    "Health appointment confirmation",
    "PEP planning email",
    "Placement review invite",
    "Regulation 44 follow-up",
    "Commissioning update",
  ];

  return subjects.map((title, i) => ({
    id: 3000 + i + 1,
    home_id: homeId,
    title,
    summary: `${title} logged with follow-up noted.`,
    status: i % 2 === 0 ? "Sent" : "Received",
    contact_datetime: iso(-i, 10, 15),
    communication_type: i % 2 === 0 ? "email" : "phone",
    record_type: "communication",
    source_table: "communications",
  }));
}

function makeTherapy(homeId = 1) {
  const titles = [
    "Therapeutic session",
    "Clinical consultation",
    "Reflective practice note",
    "Sensory guidance update",
    "Attachment-informed support note",
    "Emotional regulation planning",
    "Transition support review",
    "Behaviour formulation review",
    "Wellbeing check-in",
    "Multi-disciplinary consultation",
  ];

  return titles.map((title, i) => ({
    id: 4000 + i + 1,
    home_id: homeId,
    title,
    summary: `${title} completed with practical recommendations for staff.`,
    status: "Completed",
    created_at: iso(-(i + 1), 11, 0),
    record_type: "therapy",
    source_table: "therapy",
  }));
}

function makeCompliance(homeId = 1) {
  const titles = [
    "Regulation 44 visit due",
    "Fire drill record",
    "Statement of purpose review",
    "Training matrix update",
    "Medication audit",
    "Staff file check",
    "Incident review sign-off",
    "Location risk review",
    "Supervision tracker review",
    "Safer recruitment audit",
    "Missing from care audit",
    "Child file compliance spot-check",
  ];

  return titles.map((title, i) => ({
    id: 5000 + i + 1,
    home_id: homeId,
    title,
    status: i % 4 === 0 ? "overdue" : i % 4 === 1 ? "due_soon" : "active",
    due_date: dateOnly(i - 5),
    severity: i % 4 === 0 ? "high" : "medium",
    record_type: "compliance_item",
    source_table: "compliance_items",
  }));
}

function makeReports(homeId = 1) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: 6000 + i + 1,
    home_id: homeId,
    title: `Monthly home summary ${i + 1}`,
    summary: "Summary of quality, incidents, staffing, and compliance themes.",
    status: "completed",
    review_month: `2025-${String((i % 12) + 1).padStart(2, "0")}`,
    record_type: "monthly_review",
    source_table: "monthly_reviews",
  }));
}

function makeIncidents(youngPersonId) {
  const types = [
    "Behaviour incident",
    "Missing from placement",
    "Verbal aggression",
    "Property damage",
    "Self-harm concern",
    "Boundary testing",
    "Community incident",
    "School incident",
    "Safeguarding concern",
    "Restorative follow-up",
  ];

  return types.map((type, i) => ({
    id: 7000 + youngPersonId + i,
    young_person_id: youngPersonId,
    incident_type: type,
    title: type,
    description: `${type} recorded with follow-up support provided.`,
    summary: `${type} recorded with follow-up support provided.`,
    severity: i % 4 === 0 ? "high" : i % 3 === 0 ? "medium" : "low",
    significance: i % 4 === 0 ? "high" : i % 3 === 0 ? "medium" : "low",
    incident_datetime: iso(-(i + 1), 16, 15),
    status: i % 2 === 0 ? "reviewed" : "pending_review",
    workflow_status: i % 2 === 0 ? "reviewed" : "pending_review",
    actions_taken: "Low arousal approach used, reflection completed, follow-up logged.",
    child_voice: "Young person shared mixed feelings after the event.",
    source_table: "incidents",
    record_type: "incident",
  }));
}

function makeTasks(youngPersonId) {
  const titles = [
    "Book GP appointment",
    "Update school transport form",
    "Prepare PEP summary",
    "Check medication stock",
    "Follow up family contact plan",
    "Review behaviour support plan",
    "Update chronology summary",
    "Book dental review",
    "Confirm therapy slot",
    "Upload review paperwork",
  ];

  return titles.map((title, i) => ({
    id: 8000 + youngPersonId + i,
    young_person_id: youngPersonId,
    title,
    task: title,
    status: i % 3 === 0 ? "open" : "active",
    due_date: dateOnly(i - 2),
    completed: false,
    record_type: "task",
    source_table: "tasks",
  }));
}

function makeHealth(youngPersonId) {
  const titles = [
    "GP medication review",
    "Dental check",
    "Optician review",
    "CAMHS appointment",
    "Health plan update",
    "Weight and wellbeing check",
    "Sleep review",
    "Medication administration review",
    "Immunisation follow-up",
    "Health practitioner phone advice",
  ];

  return titles.map((title, i) => ({
    id: 9000 + youngPersonId + i,
    young_person_id: youngPersonId,
    title,
    record_type: "health_record",
    source_table: "health_records",
    summary: `${title} completed with clear outcome and next steps.`,
    event_datetime: iso(-(i + 2), 10, 0),
    professional_name: pick(["Dr Ahmed", "Nurse Kelly", "CAMHS Team", "Smile Dental"], i),
    outcome: "Plan reviewed and follow-up recorded.",
    significance: i % 4 === 0 ? "medium" : "low",
    workflow_status: "approved",
    next_action_date: dateOnly(i + 7),
  }));
}

function makeEducation(youngPersonId) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: 10000 + youngPersonId + i,
    young_person_id: youngPersonId,
    title: "Education record",
    record_type: "education_record",
    source_table: "education_records",
    provision_name: "Riverside Academy",
    attendance_status: i % 4 === 0 ? "Partial attendance" : "Attended",
    learning_engagement: "Engaged with support and responded to structure.",
    behaviour_summary: i % 3 === 0 ? "Needed emotional reassurance after lunch." : "Managed the day well.",
    issue_raised: i % 4 === 0 ? "Travel anxiety" : "",
    record_date: dateOnly(-(i + 1)),
    significance: i % 4 === 0 ? "medium" : "low",
    workflow_status: "approved",
  }));
}

function makeFamily(youngPersonId) {
  const contacts = ["Mum", "Dad", "Grandmother", "Older sister"];
  return Array.from({ length: 10 }, (_, i) => ({
    id: 11000 + youngPersonId + i,
    young_person_id: youngPersonId,
    record_type: "family_contact_record",
    source_table: "family_contact_records",
    contact_type: i % 2 === 0 ? "Phone call" : "Community visit",
    contact_person: pick(contacts, i),
    contact_datetime: iso(-(i + 1), 18, 30),
    post_contact_presentation: i % 3 === 0 ? "Needed extra reassurance afterwards." : "Settled and positive afterwards.",
    concerns: i % 4 === 0 ? "Wanted longer contact." : "",
    child_voice: "Shared mixed feelings about contact.",
    significance: i % 4 === 0 ? "medium" : "low",
    workflow_status: "approved",
  }));
}

function makeAppointments(youngPersonId) {
  const titles = [
    "GP medication review",
    "PEP meeting",
    "CAMHS review",
    "Dental appointment",
    "School planning meeting",
    "LAC review",
    "Optician check",
    "Therapy session",
    "Education review",
    "Social worker visit",
  ];

  return titles.map((title, i) => ({
    id: 12000 + youngPersonId + i,
    young_person_id: youngPersonId,
    record_type: "appointment",
    source_table: "appointments",
    title,
    appointment_type: i % 2 === 0 ? "Health" : "Professional meeting",
    start_datetime: iso(i + 1, 9 + (i % 4), 30),
    location: i % 2 === 0 ? "Community clinic" : "Home / School",
    professional_name: pick(["Dr Ahmed", "Virtual School Team", "CAMHS Team", "Social Worker"], i),
    status: "booked",
    summary: `${title} arranged with preparation noted.`,
    follow_up_actions: i % 3 === 0 ? "Prepare brief summary beforehand." : "",
  }));
}

function makeReportsForYoungPerson(youngPersonId) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: 13000 + youngPersonId + i,
    young_person_id: youngPersonId,
    record_type: "monthly_review",
    source_table: "monthly_reviews",
    review_title: `Monthly review ${i + 1}`,
    review_month: `2025-${String((i % 12) + 1).padStart(2, "0")}`,
    status: "approved",
    summary_of_month: "Month showed progress in routines and relationship repair.",
    progress_summary: "Improved engagement with boundaries and support.",
    child_voice_summary: "Young person identified school and uncertainty as key stressors.",
  }));
}

function makeTimeline(youngPersonId) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: 14000 + youngPersonId + i,
    title: pick(
      [
        "Behaviour incident",
        "Health appointment attended",
        "Family contact",
        "School update",
        "Therapy reflection",
        "Achievement noted",
      ],
      i
    ),
    summary: "Timeline event recorded with clear significance and context.",
    category: pick(["incident", "health", "family", "education", "therapy"], i),
    event_datetime: iso(-(i + 1), 14, 0),
    significance: i % 4 === 0 ? "medium" : "low",
    record_type: "chronology_event",
    source_table: "chronology_events",
    young_person_id: youngPersonId,
  }));
}

function getDemoResponse(url, method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  if (upper !== "GET") return null;

  let match;

  match = url.match(/^\/homes\/(\d+)\/dashboard(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      home: {
        id: homeId,
        name: "IndiCare House",
        home_name: "IndiCare House",
        registration_status: "Active",
        local_authority: "Birmingham",
      },
      young_people: makeYoungPeople(homeId),
      items: [],
      summary: {
        occupancy: 3,
        incidents_last_7_days: 5,
        overdue_items: 4,
        staffing_pressure: "medium",
        total_staff: 13,
      },
      alerts: [
        { id: 1, title: "Three compliance items overdue", severity: "high" },
        { id: 2, title: "Two supervisions due this week", severity: "medium" },
      ],
    };
  }

  match = url.match(/^\/homes\/(\d+)\/team(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeTeam(homeId);
    return { items, team: items, staff: items };
  }

  match = url.match(/^\/homes\/(\d+)\/documents(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeDocuments(homeId);
    return { items, documents: items, statutory_documents: items };
  }

  match = url.match(/^\/homes\/(\d+)\/therapy(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeTherapy(homeId);
    return { items, therapy: items, therapy_records: items };
  }

  match = url.match(/^\/homes\/(\d+)\/communications(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeCommunications(homeId);
    return { items, communications: items, notifications: items };
  }

  match = url.match(/^\/homes\/(\d+)\/supervisions(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeSupervisions(homeId);
    return { items, supervisions: items };
  }

  match = url.match(/^\/homes\/(\d+)\/reports(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeReports(homeId);
    return { items, reports: items, monthly_reviews: items };
  }

  match = url.match(/^\/homes\/(\d+)\/quality(?:\?.*)?$/);
  if (match) {
    return {
      summary: {
        rating: "Good",
        concerns: 3,
        strengths: 6,
      },
      items: makeCompliance(1).slice(0, 6),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/compliance(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeCompliance(homeId);
    return { items, compliance_items: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/incidents(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeIncidents(youngPersonId);
    return { items, incidents: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/tasks(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeTasks(youngPersonId);
    return { items, tasks: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/health(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeHealth(youngPersonId);
    return { items, health_records: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/education(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeEducation(youngPersonId);
    return { items, education_records: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/family(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeFamily(youngPersonId);
    return { items, family_contact_records: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/appointments(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeAppointments(youngPersonId);
    return { items, appointments: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/reports(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeReportsForYoungPerson(youngPersonId);
    return { items, reports: items, monthly_reviews: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/timeline(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeTimeline(youngPersonId);
    return { items, chronology_events: items, timeline: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/compliance(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeTasks(youngPersonId);
    return { items, compliance_items: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/plans(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = [
      {
        id: 15001 + youngPersonId,
        young_person_id: youngPersonId,
        title: "Risk assessment",
        summary: "Current triggers include school transition and uncertainty.",
        category: "Emotional wellbeing",
        review_date: dateOnly(10),
        status: "active",
        record_type: "risk_assessment",
      },
      {
        id: 15002 + youngPersonId,
        young_person_id: youngPersonId,
        title: "Support plan",
        summary: "Best responses include reassurance, predictability, and low demand language.",
        category: "Support",
        review_date: dateOnly(14),
        status: "active",
        record_type: "support_plan",
      },
    ];
    return { items, risks: items, risk_assessments: items, support_plans: items };
  }

  return null;
}

async function apiGetSettled(urls = []) {
  const settled = await Promise.allSettled(urls.map((url) => apiGet(url)));
  return settled.map((result, index) => ({
    url: urls[index],
    ok: result.status === "fulfilled",
    data: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? result.reason : null,
  }));
}

function mergeAssistantBundle(responses = []) {
  const bundle = {
    items: [],
    daily_notes: [],
    incidents: [],
    tasks: [],
    health_records: [],
    education_records: [],
    family_contact_records: [],
    appointments: [],
    monthly_reviews: [],
    chronology_events: [],
    risk_assessments: [],
    support_plans: [],
    compliance_items: [],
    statutory_documents: [],
    documents: [],
    communications: [],
    therapy: [],
    therapy_records: [],
    team: [],
    supervisions: [],
    reports: [],
    home: null,
    young_people: [],
    summary: {},
    alerts: [],
  };

  for (const response of responses) {
    if (!response?.ok || !response.data || typeof response.data !== "object") continue;
    const data = response.data;

    if (Array.isArray(data.items)) bundle.items.push(...data.items);
    if (Array.isArray(data.daily_notes)) bundle.daily_notes.push(...data.daily_notes);
    if (Array.isArray(data.incidents)) bundle.incidents.push(...data.incidents);
    if (Array.isArray(data.tasks)) bundle.tasks.push(...data.tasks);
    if (Array.isArray(data.health_records)) bundle.health_records.push(...data.health_records);
    if (Array.isArray(data.education_records)) bundle.education_records.push(...data.education_records);
    if (Array.isArray(data.family_contact_records)) bundle.family_contact_records.push(...data.family_contact_records);
    if (Array.isArray(data.appointments)) bundle.appointments.push(...data.appointments);
    if (Array.isArray(data.monthly_reviews)) bundle.monthly_reviews.push(...data.monthly_reviews);
    if (Array.isArray(data.reports)) bundle.reports.push(...data.reports);
    if (Array.isArray(data.timeline)) bundle.chronology_events.push(...data.timeline);
    if (Array.isArray(data.chronology_events)) bundle.chronology_events.push(...data.chronology_events);
    if (Array.isArray(data.risk_assessments)) bundle.risk_assessments.push(...data.risk_assessments);
    if (Array.isArray(data.risks)) bundle.risk_assessments.push(...data.risks);
    if (Array.isArray(data.support_plans)) bundle.support_plans.push(...data.support_plans);
    if (Array.isArray(data.compliance_items)) bundle.compliance_items.push(...data.compliance_items);
    if (Array.isArray(data.documents)) bundle.documents.push(...data.documents);
    if (Array.isArray(data.statutory_documents)) bundle.statutory_documents.push(...data.statutory_documents);
    if (Array.isArray(data.communications)) bundle.communications.push(...data.communications);
    if (Array.isArray(data.therapy)) bundle.therapy.push(...data.therapy);
    if (Array.isArray(data.therapy_records)) bundle.therapy_records.push(...data.therapy_records);
    if (Array.isArray(data.team)) bundle.team.push(...data.team);
    if (Array.isArray(data.staff)) bundle.team.push(...data.staff);
    if (Array.isArray(data.supervisions)) bundle.supervisions.push(...data.supervisions);
    if (Array.isArray(data.young_people)) bundle.young_people.push(...data.young_people);
    if (Array.isArray(data.alerts)) bundle.alerts.push(...data.alerts);

    if (data.home && !bundle.home) {
      bundle.home = data.home;
    }

    if (data.summary && typeof data.summary === "object") {
      bundle.summary = {
        ...bundle.summary,
        ...data.summary,
      };
    }
  }

  return bundle;
}

export async function fetchYoungPersonAssistantBundle(youngPersonId) {
  if (!youngPersonId) {
    return mergeAssistantBundle([]);
  }

  const urls = [
    `/young-people/${youngPersonId}/incidents`,
    `/young-people/${youngPersonId}/tasks`,
    `/young-people/${youngPersonId}/health`,
    `/young-people/${youngPersonId}/education`,
    `/young-people/${youngPersonId}/family`,
    `/young-people/${youngPersonId}/appointments`,
    `/young-people/${youngPersonId}/reports`,
    `/young-people/${youngPersonId}/timeline`,
    `/young-people/${youngPersonId}/plans`,
    `/young-people/${youngPersonId}/compliance`,
  ];

  const responses = await apiGetSettled(urls);
  return mergeAssistantBundle(responses);
}

export async function fetchHomeAssistantBundle(homeId) {
  if (!homeId) {
    return mergeAssistantBundle([]);
  }

  const urls = [
    `/homes/${homeId}/dashboard`,
    `/homes/${homeId}/team`,
    `/homes/${homeId}/documents`,
    `/homes/${homeId}/therapy`,
    `/homes/${homeId}/communications`,
    `/homes/${homeId}/supervisions`,
    `/homes/${homeId}/reports`,
    `/homes/${homeId}/quality`,
    `/homes/${homeId}/compliance`,
  ];

  const responses = await apiGetSettled(urls);
  return mergeAssistantBundle(responses);
}

export async function fetchQualityAssistantBundle(homeId) {
  return fetchHomeAssistantBundle(homeId);
}

export async function fetchAssistantScopeBundle(context = {}) {
  const scope =
    context.scope ||
    context.current_scope ||
    context.scope_type ||
    "child";

  const youngPersonId =
    context.young_person_id ||
    context.person_id ||
    null;

  const homeId =
    context.home_id ||
    null;

  if (scope === "home") {
    return fetchHomeAssistantBundle(homeId);
  }

  if (scope === "quality") {
    return fetchQualityAssistantBundle(homeId);
  }

  return fetchYoungPersonAssistantBundle(youngPersonId);
}

function formatLine(item = {}, includeDate = true) {
  const bits = [];

  if (includeDate && item?.date) bits.push(item.date);
  if (item?.title) bits.push(item.title);
  if (item?.summary) bits.push(item.summary);

  return bits.join(" - ");
}

function getDemoAssistantReply(payload = {}) {
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
    "IndiCare House";

  const intent =
    payload?.context?.assistant_intent ||
    payload?.intent ||
    "summary";

  const outputMode =
    payload?.context?.output_mode ||
    payload?.output_mode ||
    "answer";

  const evidence = Array.isArray(payload?.evidence) ? payload.evidence : [];
  const chronology = Array.isArray(payload?.chronology) ? payload.chronology : [];
  const facts = payload?.facts || {};
  const summary = payload?.summary || {};
  const confidence = payload?.evidence_sufficiency?.confidence || "medium";

  if (intent === "greeting") {
    if (scope === "home") {
      return `Hello. I’m ready to help with ${homeName}. I can provide a full summary, chronology, compliance view, dates, staffing themes, or management priorities.`;
    }

    if (scope === "quality") {
      return `Hello. I’m ready to help with ${homeName} quality and oversight. I can provide chronology, audit themes, compliance gaps, and an RI-style summary.`;
    }

    return `Hello. I’m ready to help with ${name}. I can provide a full summary, chronology, dates, incidents, appointments, risks, family contact themes, or a handover.`;
  }

  if (intent === "morning_brief" || outputMode === "morning_brief") {
    return [
      `Morning brief for ${scope === "child" ? name : homeName}:`,
      "",
      `• Evidence reviewed: ${summary?.total || evidence.length || 0}`,
      `• Open tasks: ${summary?.open_tasks || 0}`,
      `• Overdue items: ${summary?.overdue_items || 0}`,
      `• Confidence: ${confidence}`,
      ...(facts?.next_appointment
        ? [`• Next appointment: ${facts.next_appointment.title || "Appointment"} (${facts.next_appointment.date || "date not set"})`]
        : []),
      "",
      "What matters this morning:",
      ...(evidence.slice(0, 3).map((item) => `• ${formatLine(item, false)}`)),
    ].join("\n");
  }

  if (intent === "chronology" || outputMode === "chronology") {
    if (chronology.length) {
      return [
        `Chronology for ${scope === "child" ? name : homeName}:`,
        "",
        ...chronology.slice(0, 8).map((item) => `• ${formatLine(item, true)}`),
        "",
        `Evidence reviewed: ${summary?.total || evidence.length || 0}`,
      ].join("\n");
    }

    return `Chronology for ${scope === "child" ? name : homeName}: no dated chronology items are currently available in demo mode.`;
  }

  if (intent === "factual_lookup" || outputMode === "factual_answer") {
    const lines = [];

    if (facts?.latest_incident) {
      lines.push(`• Latest incident: ${formatLine(facts.latest_incident, true)}`);
    }

    if (facts?.latest_missing_episode) {
      lines.push(`• Latest missing episode: ${formatLine(facts.latest_missing_episode, true)}`);
    }

    if (facts?.next_appointment) {
      lines.push(`• Next appointment: ${formatLine(facts.next_appointment, true)}`);
    }

    if (!lines.length) {
      lines.push("• No matching dated record is currently available in demo mode.");
    }

    return [
      `Date-based lookup for ${scope === "child" ? name : homeName}:`,
      "",
      ...lines,
    ].join("\n");
  }

  if (intent === "review") {
    return [
      `Full review summary for ${scope === "child" ? name : homeName}:`,
      "",
      `• Evidence reviewed: ${summary?.total || evidence.length || 0}`,
      `• Confidence: ${confidence}`,
      `• Overdue items: ${summary?.overdue_items || 0}`,
      `• Incident items: ${summary?.incident_items || 0}`,
      "",
      "Key themes:",
      ...(evidence.slice(0, 4).map((item) => `• ${formatLine(item, false)}`)),
    ].join("\n");
  }

  if (scope === "home") {
    return `Summary for ${homeName}: the home appears broadly stable, staffing is sufficient for current needs across 3 children and 13 adults, and management attention should focus on document review dates, overdue compliance items, supervision timeliness, and whole-service follow-up.`;
  }

  if (scope === "quality") {
    return `Quality summary for ${homeName}: evidence is strongest in routine recording and relationship-based care. Improvement priorities are tighter compliance follow-up, clearer management oversight trails, and more consistent review-date discipline across documents and supervision.`;
  }

  return `Summary for ${name}: the main current themes are anxiety around education, stronger outcomes when routines are predictable, generally responsive relationships with staff, and a need for continued follow-up around family contact, appointments, and emotionally regulated transitions. Current section: ${section}. Whole-scope mode is enabled in demo mode.`;
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

    const intent =
      payload?.context?.assistant_intent ||
      payload?.intent ||
      "summary";

    const retrievalMode =
      payload?.context?.retrieval_mode ||
      payload?.retrieval_mode ||
      "whole_scope";

    onMeta({
      sources: Array.isArray(payload?.evidence)
        ? payload.evidence.slice(0, 8).map((item) => ({
            type: item.record_type || "record",
            label: item.title || "Record",
            excerpt: item.summary || "",
            section: item.section || "",
            record_type: item.record_type || null,
            record_id: item.source_id || item.id || null,
          }))
        : [],
      runtime: {
        mode: "demo",
        provider: "local-demo",
        intent,
        retrieval_mode: retrievalMode,
        whole_os_default: true,
      },
      explainability: {
        summary: "This is a demonstration assistant response using local sample data and whole-scope-style assistant behaviour.",
        reasoning_summary: `Intent: ${intent}. Retrieval: ${retrievalMode}.`,
      },
      assistant_scope: payload?.context || {},
      assistant_context: {
        ...(payload?.context || {}),
        requested_scope_mode: retrievalMode,
        whole_os_default: true,
      },
      suggested_actions: [
        { type: "draft_summary", label: "Draft summary" },
        { type: "draft_handover", label: "Draft handover" },
        { type: "create_task", label: "Create action list" },
      ],
    });

    onProgress("Analysing scoped records...");
    const finalText = getDemoAssistantReply(payload);
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

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

  // Optional child routes
  [/\/young-people\/(\d+)\/communications$/, "/young-people/$1/family"],
  [/\/young-people\/(\d+)\/therapy$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/keywork$/, "/young-people/$1/keywork"],

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
  [/\/homes\/(\d+)\/rota$/, "/homes/$1/rota"],
  [/\/homes\/(\d+)\/staffing$/, "/homes/$1/staffing"],
  [/\/homes\/(\d+)\/onboarding$/, "/homes/$1/onboarding"],
  [/\/homes\/(\d+)\/training$/, "/homes/$1/training"],
  [/\/homes\/(\d+)\/probations$/, "/homes/$1/probations"],
  [/\/homes\/(\d+)\/vacancies$/, "/homes/$1/vacancies"],
  [/\/homes\/(\d+)\/pipeline$/, "/homes/$1/pipeline"],
  [/\/homes\/(\d+)\/shifts$/, "/homes/$1/shifts"],
  [/\/homes\/(\d+)\/absences$/, "/homes/$1/absences"],
  [/\/homes\/(\d+)\/maintenance$/, "/homes/$1/maintenance"],
  [/\/homes\/(\d+)\/finance$/, "/homes/$1/finance"],
  [/\/homes\/(\d+)\/medication$/, "/homes/$1/medication"],
  [/\/homes\/(\d+)\/admissions$/, "/homes/$1/admissions"],
  [/\/homes\/(\d+)\/discharges$/, "/homes/$1/discharges"],
  [/\/homes\/(\d+)\/visitors$/, "/homes/$1/visitors"],
  [/\/homes\/(\d+)\/staff-files$/, "/homes/$1/staff-files"],
  [/\/homes\/(\d+)\/audits$/, "/homes/$1/audits"],
  [/\/homes\/(\d+)\/manager-actions$/, "/homes/$1/manager-actions"],
  [/\/homes\/(\d+)\/reg40$/, "/homes/$1/reg40"],
  [/\/homes\/(\d+)\/reg44$/, "/homes/$1/reg44"],
  [/\/homes\/(\d+)\/reg45$/, "/homes/$1/reg45"],
  [/\/homes\/(\d+)\/daily-notes$/, "/homes/$1/daily-notes"],
  [/\/homes\/(\d+)\/incidents$/, "/homes/$1/incidents"],
  [/\/homes\/(\d+)\/keywork$/, "/homes/$1/keywork"],
  [/\/homes\/(\d+)\/transport$/, "/homes/$1/transport"],

  // Backwards-compatible fallbacks
  [/\/homes\/(\d+)\/staff$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/staff-documents$/, "/homes/$1/staff-files"],
  [/\/homes\/(\d+)\/notifications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/inspection-readiness$/, "/homes/$1/quality"],
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

function money(value) {
  return Number(value).toFixed(2);
}

function pick(list, index) {
  return list[index % list.length];
}

function makeHome(homeId = 1) {
  return {
    id: homeId,
    name: "IndiCare House",
    home_name: "IndiCare House",
    registration_status: "Active",
    local_authority: "Birmingham",
    registration_category: "Children's Home",
    registered_beds: 3,
    occupancy: 3,
    address_summary: "Birmingham residential children’s home",
  };
}

/**
 * 12 employed staff
 * 2 in pipeline
 */
function makeAdults(homeId = 1) {
  return [
    { id: 1, full_name: "Sarah Jones", role: "Registered Manager", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 2, full_name: "Tom Patel", role: "Deputy Manager", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 3, full_name: "Leah Brown", role: "Senior Residential Worker", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 4, full_name: "Amir Hussain", role: "Senior Residential Worker", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 5, full_name: "Chloe Davies", role: "Residential Worker", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 6, full_name: "Michael Osei", role: "Waking Night Residential Worker", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 7, full_name: "Danielle Green", role: "Residential Worker", status: "On shift", home_id: homeId, contracted_hours: 40 },
    { id: 8, full_name: "Helen Morris", role: "Residential Worker", status: "Off shift", home_id: homeId, contracted_hours: 20 },
    { id: 9, full_name: "Chris Walker", role: "Residential Worker", status: "Off shift", home_id: homeId, contracted_hours: 40 },
    { id: 10, full_name: "Jade Collins", role: "Residential Worker", status: "Annual leave", home_id: homeId, contracted_hours: 40 },
    { id: 11, full_name: "Mason Reed", role: "Bank Residential Worker", status: "Available", home_id: homeId, contracted_hours: 0 },
    { id: 12, full_name: "Olivia Bennett", role: "Therapeutic Residential Worker", status: "On shift", home_id: homeId, contracted_hours: 40 },
  ];
}

function makePipelineStaff(homeId = 1) {
  return [
    {
      id: 101,
      home_id: homeId,
      full_name: "Ava Robinson",
      role_applied_for: "Residential Worker",
      stage: "pre-employment checks",
      status: "pipeline",
      start_target_date: dateOnly(14),
      dbs_status: "clear",
      right_to_work: "verified",
      references: "2 of 2 received",
      mandatory_training_status: "booked",
      record_type: "pipeline_candidate",
      source_table: "pipeline_candidates",
    },
    {
      id: 102,
      home_id: homeId,
      full_name: "Noah Campbell",
      role_applied_for: "Waking Night Residential Worker",
      stage: "offer accepted",
      status: "pipeline",
      start_target_date: dateOnly(21),
      dbs_status: "pending",
      right_to_work: "verified",
      references: "1 of 2 received",
      mandatory_training_status: "pending",
      record_type: "pipeline_candidate",
      source_table: "pipeline_candidates",
    },
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
      bedroom: "Bedroom 1",
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
      bedroom: "Bedroom 2",
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
      primary_keyworker_id: 12,
      bedroom: "Bedroom 3",
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
    title: area,
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
    contracted_hours: a.contracted_hours,
    employment_status: a.role === "Bank Residential Worker" ? "bank" : "active",
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

function makeRota(homeId = 1) {
  const staff = makeAdults(homeId);
  const patterns = [
    { shift_name: "Day", start_time: "08:00", end_time: "22:00" },
    { shift_name: "Sleep-in", start_time: "08:00", end_time: "23:00 + sleep-in" },
    { shift_name: "Waking night", start_time: "22:00", end_time: "08:00" },
  ];

  const rota = [];

  for (let day = 0; day < 7; day += 1) {
    rota.push(
      {
        id: 70000 + day * 10 + 1,
        home_id: homeId,
        rota_date: dateOnly(day),
        staff_member: staff[0].full_name,
        role: staff[0].role,
        ...patterns[0],
        status: "scheduled",
        record_type: "rota_shift",
        source_table: "rota",
      },
      {
        id: 70000 + day * 10 + 2,
        home_id: homeId,
        rota_date: dateOnly(day),
        staff_member: staff[2].full_name,
        role: staff[2].role,
        ...patterns[0],
        status: "scheduled",
        record_type: "rota_shift",
        source_table: "rota",
      },
      {
        id: 70000 + day * 10 + 3,
        home_id: homeId,
        rota_date: dateOnly(day),
        staff_member: staff[4].full_name,
        role: staff[4].role,
        ...patterns[1],
        status: "scheduled",
        record_type: "rota_shift",
        source_table: "rota",
      },
      {
        id: 70000 + day * 10 + 4,
        home_id: homeId,
        rota_date: dateOnly(day),
        staff_member: staff[5].full_name,
        role: staff[5].role,
        ...patterns[2],
        status: "scheduled",
        record_type: "rota_shift",
        source_table: "rota",
      }
    );
  }

  rota.push({
    id: 79999,
    home_id: homeId,
    rota_date: dateOnly(2),
    staff_member: "Unfilled shift",
    role: "Residential Worker",
    shift_name: "Day",
    start_time: "08:00",
    end_time: "22:00",
    status: "gap",
    note: "Use bank or overtime cover",
    record_type: "rota_shift",
    source_table: "rota",
  });

  return rota;
}

function makeStaffing(homeId = 1) {
  return {
    home_id: homeId,
    beds_registered: 3,
    occupancy: 3,
    staff_employed: 12,
    staff_pipeline: 2,
    on_shift_now: 7,
    off_shift_now: 2,
    annual_leave_now: 1,
    bank_available: 1,
    staffing_pressure: "medium",
    vacancies_open: 2,
    waking_night_cover: "covered",
    daytime_cover: "covered_with_gap_this_week",
    manager_on_call: "Sarah Jones",
    summary:
      "Home is safely staffed for current occupancy of 3 young people. One rota gap exists later this week. Two candidates are in pipeline and would reduce pressure when cleared.",
    items: [
      {
        id: 81001,
        home_id: homeId,
        title: "Current staffing position",
        summary: "12 employed staff, 2 in pipeline, 1 rota gap this week.",
        status: "stable_with_pressure",
        record_type: "staffing_snapshot",
        source_table: "staffing",
      },
    ],
  };
}

function makeOnboarding(homeId = 1) {
  return [
    {
      id: 82001,
      home_id: homeId,
      full_name: "Ava Robinson",
      role: "Residential Worker",
      start_target_date: dateOnly(14),
      stage: "pre-employment checks",
      checklist_completion: 78,
      dbs: "clear",
      references: "complete",
      right_to_work: "complete",
      induction: "booked",
      shadow_shifts: 2,
      mandatory_training: "booked",
      status: "on_track",
      record_type: "onboarding",
      source_table: "onboarding",
    },
    {
      id: 82002,
      home_id: homeId,
      full_name: "Noah Campbell",
      role: "Waking Night Residential Worker",
      start_target_date: dateOnly(21),
      stage: "offer accepted",
      checklist_completion: 46,
      dbs: "pending",
      references: "1 outstanding",
      right_to_work: "complete",
      induction: "not booked",
      shadow_shifts: 0,
      mandatory_training: "pending",
      status: "attention_needed",
      record_type: "onboarding",
      source_table: "onboarding",
    },
  ];
}

function makeTraining(homeId = 1) {
  const staff = makeAdults(homeId);

  return staff.map((person, i) => ({
    id: 83000 + i + 1,
    home_id: homeId,
    staff_member: person.full_name,
    role: person.role,
    safeguarding_children: i % 5 === 0 ? "due_soon" : "current",
    medication: i % 4 === 0 ? "expired" : "current",
    behaviour_support: i % 3 === 0 ? "due_soon" : "current",
    first_aid: i % 6 === 0 ? "expired" : "current",
    fire_safety: "current",
    training_compliance_percent: i % 4 === 0 ? 74 : i % 3 === 0 ? 86 : 100,
    status: i % 4 === 0 ? "action_required" : "current",
    next_due_date: dateOnly(i - 2),
    record_type: "training_record",
    source_table: "training",
  }));
}

function makeProbations(homeId = 1) {
  return [
    {
      id: 84001,
      home_id: homeId,
      staff_member: "Olivia Bennett",
      role: "Therapeutic Residential Worker",
      start_date: dateOnly(-58),
      probation_end_date: dateOnly(32),
      probation_stage: "mid-point review completed",
      line_manager: "Tom Patel",
      status: "active",
      record_type: "probation",
      source_table: "probations",
    },
    {
      id: 84002,
      home_id: homeId,
      staff_member: "Chris Walker",
      role: "Residential Worker",
      start_date: dateOnly(-80),
      probation_end_date: dateOnly(10),
      probation_stage: "final review due",
      line_manager: "Tom Patel",
      status: "due_soon",
      record_type: "probation",
      source_table: "probations",
    },
  ];
}

function makeVacancies(homeId = 1) {
  return [
    {
      id: 85001,
      home_id: homeId,
      title: "Residential Worker",
      posts: 1,
      status: "open",
      priority: "high",
      summary: "Backfill vacancy to reduce overtime and cover planned leave.",
      record_type: "vacancy",
      source_table: "vacancies",
    },
    {
      id: 85002,
      home_id: homeId,
      title: "Waking Night Residential Worker",
      posts: 1,
      status: "open",
      priority: "medium",
      summary: "Targeted recruitment to strengthen waking night resilience.",
      record_type: "vacancy",
      source_table: "vacancies",
    },
  ];
}

function makeShifts(homeId = 1) {
  return [
    {
      id: 86001,
      home_id: homeId,
      date: dateOnly(0),
      shift: "Day shift",
      lead: "Sarah Jones",
      staff: ["Sarah Jones", "Leah Brown", "Chloe Davies", "Olivia Bennett"],
      young_people_present: ["Jay Smith", "Amira Khan", "Luca Brown"],
      note: "Community activity planned after school.",
      record_type: "shift",
      source_table: "shifts",
    },
    {
      id: 86002,
      home_id: homeId,
      date: dateOnly(0),
      shift: "Night shift",
      lead: "Michael Osei",
      staff: ["Michael Osei"],
      young_people_present: ["Jay Smith", "Amira Khan", "Luca Brown"],
      note: "Waking night cover in place.",
      record_type: "shift",
      source_table: "shifts",
    },
  ];
}

function makeAbsences(homeId = 1) {
  return [
    {
      id: 87001,
      home_id: homeId,
      staff_member: "Jade Collins",
      absence_type: "Annual leave",
      start_date: dateOnly(-1),
      end_date: dateOnly(5),
      status: "approved",
      impact: "low",
      cover_plan: "Covered via existing rota",
      record_type: "absence",
      source_table: "absences",
    },
    {
      id: 87002,
      home_id: homeId,
      staff_member: "Helen Morris",
      absence_type: "Sickness",
      start_date: dateOnly(1),
      end_date: dateOnly(3),
      status: "reported",
      impact: "medium",
      cover_plan: "Bank worker or overtime may be required",
      record_type: "absence",
      source_table: "absences",
    },
  ];
}

function makeMaintenance(homeId = 1) {
  const items = [
    ["Boiler service", "due_soon", "Contractor booked for annual service"],
    ["Garden fence repair", "open", "Panel damaged after high winds"],
    ["Bedroom 2 blind replacement", "open", "Young person requested more privacy"],
    ["PAT testing", "completed", "Completed this month"],
    ["Bathroom extractor fan", "open", "Reported noise and intermittent fault"],
    ["Fire door adjustment", "due_soon", "Close mechanism needs adjustment"],
  ];

  return items.map((row, i) => ({
    id: 88000 + i + 1,
    home_id: homeId,
    title: row[0],
    status: row[1],
    summary: row[2],
    priority: i < 2 ? "medium" : "low",
    reported_date: dateOnly(-(i + 1)),
    record_type: "maintenance_item",
    source_table: "maintenance",
  }));
}

function makeFinance(homeId = 1) {
  return [
    {
      id: 89001,
      home_id: homeId,
      title: "Weekly staffing cost",
      category: "staffing",
      amount: money(6425.5),
      period: "weekly",
      status: "recorded",
      summary: "Core staffing and sleep-in costs for current week.",
      record_type: "finance_item",
      source_table: "finance",
    },
    {
      id: 89002,
      home_id: homeId,
      title: "Agency / bank spend",
      category: "staffing",
      amount: money(420.0),
      period: "weekly",
      status: "watch",
      summary: "Linked to cover for sickness and rota pressure.",
      record_type: "finance_item",
      source_table: "finance",
    },
    {
      id: 89003,
      home_id: homeId,
      title: "Maintenance spend",
      category: "property",
      amount: money(185.0),
      period: "monthly",
      status: "recorded",
      summary: "Routine repairs and consumables.",
      record_type: "finance_item",
      source_table: "finance",
    },
    {
      id: 89004,
      home_id: homeId,
      title: "Activity budget",
      category: "young_people",
      amount: money(275.0),
      period: "monthly",
      status: "active",
      summary: "Community and enrichment activity spend.",
      record_type: "finance_item",
      source_table: "finance",
    },
  ];
}

function makeMedicationHome(homeId = 1) {
  return [
    {
      id: 90001,
      home_id: homeId,
      title: "Medication audit",
      status: "due_soon",
      audit_date: dateOnly(2),
      summary: "Next weekly medication audit due.",
      record_type: "medication_item",
      source_table: "medication",
    },
    {
      id: 90002,
      home_id: homeId,
      title: "Paracetamol stock count",
      status: "current",
      stock_level: "sufficient",
      summary: "Stock checked and recorded.",
      record_type: "medication_item",
      source_table: "medication",
    },
    {
      id: 90003,
      home_id: homeId,
      title: "Jay Smith MAR review",
      status: "current",
      summary: "Recent administration records complete.",
      record_type: "medication_item",
      source_table: "medication",
    },
    {
      id: 90004,
      home_id: homeId,
      title: "Controlled medication cabinet check",
      status: "completed",
      summary: "Cabinet checked and signed off.",
      record_type: "medication_item",
      source_table: "medication",
    },
  ];
}

function makeAdmissions(homeId = 1) {
  return [
    {
      id: 91001,
      home_id: homeId,
      young_person_name: "Mia Thompson",
      referral_source: "Local Authority Commissioning",
      referral_date: dateOnly(-8),
      status: "under_consideration",
      summary: "Referral screened against current group dynamics and vacancy planning.",
      record_type: "admission",
      source_table: "admissions",
    },
    {
      id: 91002,
      home_id: homeId,
      young_person_name: "Tyler Evans",
      referral_source: "Emergency Placement Team",
      referral_date: dateOnly(-2),
      status: "declined",
      summary: "Declined due to matching and current occupancy.",
      record_type: "admission",
      source_table: "admissions",
    },
  ];
}

function makeDischarges(homeId = 1) {
  return [
    {
      id: 92001,
      home_id: homeId,
      young_person_name: "Ella Johnson",
      discharge_date: "2025-11-28",
      destination: "Step-down placement",
      status: "completed",
      summary: "Transition completed with final documents uploaded.",
      record_type: "discharge",
      source_table: "discharges",
    },
  ];
}

function makeVisitors(homeId = 1) {
  return [
    {
      id: 93001,
      home_id: homeId,
      visitor_name: "Reg 44 Visitor",
      organisation: "Independent Visitor Service",
      visit_date: dateOnly(-3),
      purpose: "Monthly regulation 44 visit",
      status: "completed",
      record_type: "visitor_log",
      source_table: "visitors",
    },
    {
      id: 93002,
      home_id: homeId,
      visitor_name: "Boiler Contractor",
      organisation: "HeatSafe Ltd",
      visit_date: dateOnly(3),
      purpose: "Annual boiler service",
      status: "booked",
      record_type: "visitor_log",
      source_table: "visitors",
    },
    {
      id: 93003,
      home_id: homeId,
      visitor_name: "Social Worker - Jay",
      organisation: "Birmingham Children’s Services",
      visit_date: dateOnly(1),
      purpose: "Placement visit",
      status: "booked",
      record_type: "visitor_log",
      source_table: "visitors",
    },
  ];
}

function makeStaffFiles(homeId = 1) {
  return makeAdults(homeId).map((person, i) => ({
    id: 94000 + i + 1,
    home_id: homeId,
    staff_member: person.full_name,
    application_form: "present",
    references: i === 10 ? "bank_worker_record" : "complete",
    dbs: i % 5 === 0 ? "review_due" : "complete",
    right_to_work: "complete",
    id_check: "complete",
    qualification_evidence: i % 4 === 0 ? "missing_copy" : "complete",
    file_audit_status: i % 4 === 0 ? "action_required" : "current",
    record_type: "staff_file",
    source_table: "staff_files",
  }));
}

function makeAudits(homeId = 1) {
  const titles = [
    "Medication audit",
    "Health and safety audit",
    "File audit",
    "Environment audit",
    "Safeguarding audit",
    "Night monitoring audit",
  ];

  return titles.map((title, i) => ({
    id: 95000 + i + 1,
    home_id: homeId,
    title,
    audit_date: dateOnly(-(i * 7 + 3)),
    outcome: i % 4 === 0 ? "actions_required" : "satisfactory",
    status: i % 4 === 0 ? "open_actions" : "closed",
    summary: `${title} completed with ${i % 4 === 0 ? "follow-up actions" : "no major issues"}.`,
    record_type: "audit",
    source_table: "audits",
  }));
}

function makeManagerActions(homeId = 1) {
  return [
    {
      id: 96001,
      home_id: homeId,
      title: "Close rota gap for Thursday day shift",
      owner: "Tom Patel",
      due_date: dateOnly(2),
      status: "open",
      priority: "high",
      record_type: "manager_action",
      source_table: "manager_actions",
    },
    {
      id: 96002,
      home_id: homeId,
      title: "Complete Noah Campbell pre-employment checks",
      owner: "Sarah Jones",
      due_date: dateOnly(5),
      status: "open",
      priority: "medium",
      record_type: "manager_action",
      source_table: "manager_actions",
    },
    {
      id: 96003,
      home_id: homeId,
      title: "Review overdue medication training",
      owner: "Tom Patel",
      due_date: dateOnly(4),
      status: "in_progress",
      priority: "medium",
      record_type: "manager_action",
      source_table: "manager_actions",
    },
  ];
}

function makeReg40(homeId = 1) {
  return [
    {
      id: 97001,
      home_id: homeId,
      event_date: dateOnly(-18),
      notification_type: "Serious incident notification",
      status: "submitted",
      summary: "Regulation 40 notification submitted within timescale.",
      record_type: "reg40_item",
      source_table: "reg40",
    },
  ];
}

function makeReg44(homeId = 1) {
  return [
    {
      id: 98001,
      home_id: homeId,
      visit_date: dateOnly(-12),
      visitor_name: "Independent Visitor",
      status: "completed",
      summary: "Visit completed. Positive feedback on routines and relationships.",
      recommendations: "Tighten review date oversight and continue bedroom environment improvements.",
      record_type: "reg44_item",
      source_table: "reg44",
    },
    {
      id: 98002,
      home_id: homeId,
      visit_date: dateOnly(18),
      visitor_name: "Independent Visitor",
      status: "scheduled",
      summary: "Next Reg 44 visit booked.",
      recommendations: "",
      record_type: "reg44_item",
      source_table: "reg44",
    },
  ];
}

function makeReg45(homeId = 1) {
  return [
    {
      id: 99001,
      home_id: homeId,
      period_start: "2025-10-01",
      period_end: "2026-03-31",
      status: "drafting",
      summary: "Quality of care review in progress.",
      record_type: "reg45_item",
      source_table: "reg45",
    },
  ];
}

function makeDailyNotes(homeId = 1) {
  const people = makeYoungPeople(homeId);
  const entries = [];

  for (let i = 0; i < 6; i += 1) {
    entries.push({
      id: 100000 + i + 1,
      home_id: homeId,
      date: dateOnly(-i),
      shift: i % 2 === 0 ? "day" : "night",
      title: `${pick(people, i).full_name} daily note`,
      young_person_name: pick(people, i).full_name,
      summary: "Routine, engagement, and presentation recorded with no major concerns.",
      record_type: "daily_note",
      source_table: "daily_notes",
    });
  }

  return entries;
}

function makeHomeIncidents(homeId = 1) {
  return [
    {
      id: 101001,
      home_id: homeId,
      date: dateOnly(-1),
      title: "Behaviour incident - Jay Smith",
      incident_type: "Behaviour incident",
      severity: "medium",
      status: "reviewed",
      summary: "Escalation after school transition. Restorative work completed.",
      record_type: "home_incident",
      source_table: "home_incidents",
    },
    {
      id: 101002,
      home_id: homeId,
      date: dateOnly(-3),
      title: "Missing from placement - Amira Khan",
      incident_type: "Missing episode",
      severity: "high",
      status: "manager_reviewed",
      summary: "Returned safely. Follow-up and notifications completed.",
      record_type: "home_incident",
      source_table: "home_incidents",
    },
    {
      id: 101003,
      home_id: homeId,
      date: dateOnly(-5),
      title: "Property damage in lounge",
      incident_type: "Property damage",
      severity: "low",
      status: "closed",
      summary: "Minor damage and repair logged.",
      record_type: "home_incident",
      source_table: "home_incidents",
    },
  ];
}

function makeHomeKeywork(homeId = 1) {
  const yps = makeYoungPeople(homeId);
  return yps.map((yp, i) => ({
    id: 102000 + i + 1,
    home_id: homeId,
    young_person_name: yp.full_name,
    keyworker: pick(["Leah Brown", "Chloe Davies", "Olivia Bennett"], i),
    session_date: dateOnly(-(i + 2)),
    theme: pick(["Identity", "Family", "Education", "Emotional regulation"], i),
    status: "completed",
    summary: "Structured keywork completed and recorded.",
    record_type: "keywork_session",
    source_table: "keywork",
  }));
}

function makeTransport(homeId = 1) {
  return [
    {
      id: 103001,
      home_id: homeId,
      date: dateOnly(0),
      vehicle: "Home vehicle 1",
      journey: "School run",
      driver: "Chloe Davies",
      status: "completed",
      summary: "Morning school transport completed.",
      record_type: "transport_log",
      source_table: "transport",
    },
    {
      id: 103002,
      home_id: homeId,
      date: dateOnly(1),
      vehicle: "Home vehicle 1",
      journey: "CAMHS appointment",
      driver: "Leah Brown",
      status: "booked",
      summary: "Transport booked for health appointment.",
      record_type: "transport_log",
      source_table: "transport",
    },
  ];
}

function makeChildKeywork(youngPersonId) {
  return Array.from({ length: 6 }, (_, i) => ({
    id: 104000 + youngPersonId + i,
    young_person_id: youngPersonId,
    session_date: dateOnly(-(i + 1)),
    theme: pick(["Identity", "Routine", "Family", "Safety", "Goals"], i),
    summary: "Keywork session completed with reflection and agreed next steps.",
    status: "completed",
    record_type: "keywork_session",
    source_table: "keywork_sessions",
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

function makeChildPlans(youngPersonId) {
  return [
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
}

function getDemoResponse(url, method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  if (upper !== "GET") return null;

  let match;

  match = url.match(/^\/homes\/(\d+)\/dashboard(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      home: makeHome(homeId),
      young_people: makeYoungPeople(homeId),
      items: [],
      summary: {
        occupancy: 3,
        registered_beds: 3,
        incidents_last_7_days: 5,
        overdue_items: 4,
        staffing_pressure: "medium",
        total_staff: 12,
        staff_pipeline: 2,
        rota_gaps: 1,
        open_vacancies: 2,
      },
      alerts: [
        { id: 1, title: "Three compliance items overdue", severity: "high" },
        { id: 2, title: "Two supervisions due this week", severity: "medium" },
        { id: 3, title: "One rota gap later this week", severity: "medium" },
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
    const homeId = Number(match[1]);
    return {
      summary: {
        rating: "Good",
        concerns: 3,
        strengths: 6,
        staffing_pressure: "medium",
      },
      items: makeCompliance(homeId).slice(0, 6),
    };
  }

  match = url.match(/^\/homes\/(\d+)\/compliance(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeCompliance(homeId);
    return { items, compliance_items: items };
  }

  match = url.match(/^\/homes\/(\d+)\/rota(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeRota(homeId);
    return { items, rota: items };
  }

  match = url.match(/^\/homes\/(\d+)\/staffing(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const staffing = makeStaffing(homeId);
    return {
      ...staffing,
      items: staffing.items || [],
      staffing,
    };
  }

  match = url.match(/^\/homes\/(\d+)\/onboarding(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeOnboarding(homeId);
    return { items, onboarding: items };
  }

  match = url.match(/^\/homes\/(\d+)\/training(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeTraining(homeId);
    return { items, training: items };
  }

  match = url.match(/^\/homes\/(\d+)\/probations(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeProbations(homeId);
    return { items, probations: items };
  }

  match = url.match(/^\/homes\/(\d+)\/vacancies(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeVacancies(homeId);
    return { items, vacancies: items };
  }

  match = url.match(/^\/homes\/(\d+)\/pipeline(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makePipelineStaff(homeId);
    return { items, pipeline: items, pipeline_candidates: items };
  }

  match = url.match(/^\/homes\/(\d+)\/shifts(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeShifts(homeId);
    return { items, shifts: items };
  }

  match = url.match(/^\/homes\/(\d+)\/absences(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeAbsences(homeId);
    return { items, absences: items };
  }

  match = url.match(/^\/homes\/(\d+)\/maintenance(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeMaintenance(homeId);
    return { items, maintenance: items };
  }

  match = url.match(/^\/homes\/(\d+)\/finance(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeFinance(homeId);
    return { items, finance: items };
  }

  match = url.match(/^\/homes\/(\d+)\/medication(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeMedicationHome(homeId);
    return { items, medication: items };
  }

  match = url.match(/^\/homes\/(\d+)\/admissions(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeAdmissions(homeId);
    return { items, admissions: items };
  }

  match = url.match(/^\/homes\/(\d+)\/discharges(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeDischarges(homeId);
    return { items, discharges: items };
  }

  match = url.match(/^\/homes\/(\d+)\/visitors(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeVisitors(homeId);
    return { items, visitors: items };
  }

  match = url.match(/^\/homes\/(\d+)\/staff-files(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeStaffFiles(homeId);
    return { items, staff_files: items };
  }

  match = url.match(/^\/homes\/(\d+)\/audits(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeAudits(homeId);
    return { items, audits: items };
  }

  match = url.match(/^\/homes\/(\d+)\/manager-actions(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeManagerActions(homeId);
    return { items, manager_actions: items };
  }

  match = url.match(/^\/homes\/(\d+)\/reg40(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeReg40(homeId);
    return { items, reg40: items };
  }

  match = url.match(/^\/homes\/(\d+)\/reg44(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeReg44(homeId);
    return { items, reg44: items };
  }

  match = url.match(/^\/homes\/(\d+)\/reg45(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeReg45(homeId);
    return { items, reg45: items };
  }

  match = url.match(/^\/homes\/(\d+)\/daily-notes(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeDailyNotes(homeId);
    return { items, daily_notes: items };
  }

  match = url.match(/^\/homes\/(\d+)\/incidents(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeHomeIncidents(homeId);
    return { items, incidents: items, home_incidents: items };
  }

  match = url.match(/^\/homes\/(\d+)\/keywork(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeHomeKeywork(homeId);
    return { items, keywork: items };
  }

  match = url.match(/^\/homes\/(\d+)\/transport(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    const items = makeTransport(homeId);
    return { items, transport: items };
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
    const items = makeChildPlans(youngPersonId);
    return { items, risks: items, risk_assessments: items, support_plans: items };
  }

  match = url.match(/^\/young-people\/(\d+)\/keywork(?:\?.*)?$/);
  if (match) {
    const youngPersonId = Number(match[1]);
    const items = makeChildKeywork(youngPersonId);
    return { items, keywork: items };
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
    rota: [],
    staffing: [],
    onboarding: [],
    training: [],
    probations: [],
    vacancies: [],
    pipeline: [],
    shifts: [],
    absences: [],
    pipeline_candidates: [],
    maintenance: [],
    finance: [],
    medication: [],
    admissions: [],
    discharges: [],
    visitors: [],
    staff_files: [],
    audits: [],
    manager_actions: [],
    reg40: [],
    reg44: [],
    reg45: [],
    home_incidents: [],
    keywork: [],
    transport: [],
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
    if (Array.isArray(data.home_incidents)) bundle.home_incidents.push(...data.home_incidents);
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
    if (Array.isArray(data.rota)) bundle.rota.push(...data.rota);
    if (Array.isArray(data.onboarding)) bundle.onboarding.push(...data.onboarding);
    if (Array.isArray(data.training)) bundle.training.push(...data.training);
    if (Array.isArray(data.probations)) bundle.probations.push(...data.probations);
    if (Array.isArray(data.vacancies)) bundle.vacancies.push(...data.vacancies);
    if (Array.isArray(data.pipeline)) bundle.pipeline.push(...data.pipeline);
    if (Array.isArray(data.pipeline_candidates)) bundle.pipeline_candidates.push(...data.pipeline_candidates);
    if (Array.isArray(data.shifts)) bundle.shifts.push(...data.shifts);
    if (Array.isArray(data.absences)) bundle.absences.push(...data.absences);
    if (Array.isArray(data.maintenance)) bundle.maintenance.push(...data.maintenance);
    if (Array.isArray(data.finance)) bundle.finance.push(...data.finance);
    if (Array.isArray(data.medication)) bundle.medication.push(...data.medication);
    if (Array.isArray(data.admissions)) bundle.admissions.push(...data.admissions);
    if (Array.isArray(data.discharges)) bundle.discharges.push(...data.discharges);
    if (Array.isArray(data.visitors)) bundle.visitors.push(...data.visitors);
    if (Array.isArray(data.staff_files)) bundle.staff_files.push(...data.staff_files);
    if (Array.isArray(data.audits)) bundle.audits.push(...data.audits);
    if (Array.isArray(data.manager_actions)) bundle.manager_actions.push(...data.manager_actions);
    if (Array.isArray(data.reg40)) bundle.reg40.push(...data.reg40);
    if (Array.isArray(data.reg44)) bundle.reg44.push(...data.reg44);
    if (Array.isArray(data.reg45)) bundle.reg45.push(...data.reg45);
    if (Array.isArray(data.keywork)) bundle.keywork.push(...data.keywork);
    if (Array.isArray(data.transport)) bundle.transport.push(...data.transport);
    if (Array.isArray(data.young_people)) bundle.young_people.push(...data.young_people);
    if (Array.isArray(data.alerts)) bundle.alerts.push(...data.alerts);

    if (data.staffing) {
      bundle.staffing.push(data.staffing);
    }

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
    `/young-people/${youngPersonId}/keywork`,
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
    `/homes/${homeId}/rota`,
    `/homes/${homeId}/staffing`,
    `/homes/${homeId}/onboarding`,
    `/homes/${homeId}/training`,
    `/homes/${homeId}/probations`,
    `/homes/${homeId}/vacancies`,
    `/homes/${homeId}/pipeline`,
    `/homes/${homeId}/shifts`,
    `/homes/${homeId}/absences`,
    `/homes/${homeId}/maintenance`,
    `/homes/${homeId}/finance`,
    `/homes/${homeId}/medication`,
    `/homes/${homeId}/admissions`,
    `/homes/${homeId}/discharges`,
    `/homes/${homeId}/visitors`,
    `/homes/${homeId}/staff-files`,
    `/homes/${homeId}/audits`,
    `/homes/${homeId}/manager-actions`,
    `/homes/${homeId}/reg40`,
    `/homes/${homeId}/reg44`,
    `/homes/${homeId}/reg45`,
    `/homes/${homeId}/daily-notes`,
    `/homes/${homeId}/incidents`,
    `/homes/${homeId}/keywork`,
    `/homes/${homeId}/transport`,
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
  if (includeDate && item?.rota_date) bits.push(item.rota_date);
  if (includeDate && item?.start_date) bits.push(item.start_date);
  if (includeDate && item?.visit_date) bits.push(item.visit_date);
  if (includeDate && item?.event_date) bits.push(item.event_date);
  if (item?.title) bits.push(item.title);
  if (item?.staff_member) bits.push(item.staff_member);
  if (item?.full_name) bits.push(item.full_name);
  if (item?.young_person_name) bits.push(item.young_person_name);
  if (item?.summary) bits.push(item.summary);
  if (item?.status) bits.push(`status: ${item.status}`);

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
      return `Hello. I’m ready to help with ${homeName}. I can summarise staffing, rota coverage, onboarding, training, compliance, audits, Reg 40/44/45, incidents, visitors, transport, finance, and management priorities.`;
    }

    if (scope === "quality") {
      return `Hello. I’m ready to help with ${homeName} quality and oversight. I can summarise audits, compliance gaps, staffing resilience, recruitment pipeline, statutory monitoring, and inspection-readiness themes.`;
    }

    return `Hello. I’m ready to help with ${name}. I can provide a full summary, chronology, dates, incidents, appointments, risks, family contact themes, keywork, or a handover.`;
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
      ...(scope !== "child"
        ? [
            `• Staffing pressure: ${summary?.staffing_pressure || "medium"}`,
            `• Pipeline staff: ${summary?.staff_pipeline || 2}`,
            `• Rota gaps: ${summary?.rota_gaps || 1}`,
          ]
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
    if (scope === "home" || scope === "quality") {
      return [
        `Full review summary for ${homeName}:`,
        "",
        `• Registered beds: 3`,
        `• Occupancy: 3`,
        `• Employed staff: 12`,
        `• Staff in pipeline: 2`,
        `• Staffing pressure: ${summary?.staffing_pressure || "medium"}`,
        `• Rota gaps: ${summary?.rota_gaps || 1}`,
        `• Overdue items: ${summary?.overdue_items || 4}`,
        `• Confidence: ${confidence}`,
        "",
        "Management priorities:",
        "• Close the single rota gap later this week.",
        "• Progress the 2 recruitment pipeline staff through checks and induction.",
        "• Address overdue compliance, staff file, and training items.",
        "• Keep supervision, probation, and audit action dates on track.",
        "• Maintain clear oversight of Reg 44 recommendations and Reg 45 review preparation.",
      ].join("\n");
    }

    return [
      `Full review summary for ${name}:`,
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
    return `Summary for ${homeName}: this is a 3-bed children’s home with full occupancy, 12 employed staff, and 2 further staff in recruitment/onboarding pipeline. Staffing is broadly safe, with one rota gap later this week and moderate pressure due to leave, file actions, training compliance, and routine oversight requirements. Management attention should focus on rota resilience, onboarding completion, overdue compliance items, training and probation follow-up, audit actions, and statutory monitoring.`;
  }

  if (scope === "quality") {
    return `Quality summary for ${homeName}: evidence is strongest in daily care structure, communication records, and core operational oversight. Improvement priorities are more consistent compliance follow-up, tighter training expiry management, clearer staff file and probation tracking, prompt completion of onboarding for pipeline staff, and timely closure of audit and Reg 44 actions.`;
  }

  return `Summary for ${name}: the main current themes are anxiety around education, stronger outcomes when routines are predictable, generally responsive relationships with staff, and a need for continued follow-up around family contact, appointments, keywork, and emotionally regulated transitions. Current section: ${section}. Whole-scope mode is enabled in demo mode.`;
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
    profile_communication: ["communication_profile", "young_person_communication_profile"],
    profile_education: ["education_profile", "young_person_education_profile"],
    profile_health: ["health_profile", "young_person_health_profile"],
    profile_legal: ["legal_status", "young_person_legal_status"],
    profile_formulation: ["formulation", "young_person_formulation", "young_person_formulations"],
    communication: ["communication"],
    document: ["document"],
    therapy: ["therapy"],
    team: ["team"],
    supervision: ["supervision"],
    compliance: ["compliance", "compliance_item"],
    audit: ["audit"],
    rota: ["rota_shift", "rota"],
    staffing: ["staffing", "staffing_snapshot"],
    onboarding: ["onboarding"],
    training: ["training_record", "training"],
    probation: ["probation"],
    vacancy: ["vacancy"],
    pipeline: ["pipeline_candidate", "pipeline"],
    shift: ["shift"],
    absence: ["absence"],
    maintenance: ["maintenance_item"],
    finance: ["finance_item"],
    medication: ["medication_item"],
    admission: ["admission"],
    discharge: ["discharge"],
    visitor: ["visitor_log"],
    staff_file: ["staff_file"],
    manager_action: ["manager_action"],
    reg40: ["reg40_item"],
    reg44: ["reg44_item"],
    reg45: ["reg45_item"],
    transport: ["transport_log"],
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
            label: item.title || item.staff_member || item.full_name || item.young_person_name || "Record",
            excerpt: item.summary || item.note || "",
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
        { type: "review_staffing", label: "Review staffing" },
        { type: "review_rota", label: "Review rota" },
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

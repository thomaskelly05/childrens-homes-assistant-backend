import { RECORD_TYPES } from "./contracts.js";

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
    { id: 4, full_name: "Amir Hussain", role: "Residential Worker", status: "Off shift", home_id: homeId },
    { id: 5, full_name: "Chloe Davies", role: "Residential Worker", status: "On shift", home_id: homeId },
    { id: 6, full_name: "Michael Osei", role: "Waking Night", status: "Annual leave", home_id: homeId },
    { id: 7, full_name: "Priya Shah", role: "Therapist", status: "Visiting professional", home_id: homeId },
    { id: 8, full_name: "Danielle Green", role: "Education Lead", status: "Working remotely", home_id: homeId },
    { id: 9, full_name: "Helen Morris", role: "Administrator", status: "On shift", home_id: homeId },
    { id: 10, full_name: "Chris Walker", role: "Bank Staff", status: "Available", home_id: homeId },
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
      primary_keyworker_id: 4,
    },
    {
      id: 104,
      home_id: homeId,
      first_name: "Maya",
      last_name: "Johnson",
      preferred_name: "Maya",
      full_name: "Maya Johnson",
      date_of_birth: "2010-01-30",
      gender: "Female",
      placement_status: "active",
      summary_risk_level: "medium",
      home_name: "IndiCare House",
      primary_keyworker_id: 3,
    },
  ];
}

function makeDocuments(homeId = 1) {
  const areas = [
    "Placement",
    "Risk",
    "Health",
    "Education",
    "Family",
    "Behaviour Support",
    "Safeguarding",
    "Missing From Care",
    "Governance",
    "Compliance",
  ];

  return areas.map((area, i) => ({
    id: 1000 + i + 1,
    home_id: homeId,
    title: `${area} Document ${i + 1}`,
    document_type: area,
    summary: `${area} document available for review and inspection evidence.`,
    status: i % 4 === 0 ? "review_due" : i % 5 === 0 ? "expired" : "active",
    review_date: dateOnly(i - 3),
    record_type: "statutory_document",
    source_table: "statutory_documents",
  }));
}

function makeTeam(homeId = 1) {
  return makeAdults(homeId).map((a) => ({
    id: a.id,
    home_id: a.home_id,
    staff_member: a.full_name,
    role: a.role,
    status: a.status,
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
    status: i % 3 === 0 ? "overdue" : i % 3 === 1 ? "due_soon" : "active",
    due_date: dateOnly(i - 4),
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
    record_type: RECORD_TYPES.health_record,
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
    record_type: RECORD_TYPES.education_record,
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
    record_type: RECORD_TYPES.family_contact_record,
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
    record_type: RECORD_TYPES.appointment,
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
    record_type: RECORD_TYPES.monthly_review,
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

const DEMO_DB = {
  home: demoHome(1),
  adults: makeAdults(1),
  youngPeople: makeYoungPeople(1),
};

export function getDemoDb() {
  return DEMO_DB;
}

export function getDemoAssistantReply(payload = {}) {
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

  if (scope === "home") {
    return `Summary for ${homeName}: the home appears broadly stable, staffing is sufficient for current needs, and management attention should focus on document review dates, overdue compliance items, and supervision timeliness.`;
  }

  if (scope === "quality") {
    return `Quality summary for ${homeName}: evidence is strongest in routine recording and relationship-based care. Improvement priorities are tighter compliance follow-up, clearer management oversight trails, and more consistent review-date discipline across documents and supervision.`;
  }

  return `Summary for ${name}: the main current themes are anxiety around education, stronger outcomes when routines are predictable, generally responsive relationships with staff, and a need for continued follow-up around family contact, appointments, and emotionally regulated transitions. Section in view: ${section}.`;
}

export function getDemoResponse(url, method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  if (upper !== "GET") return null;

  let match;

  match = url.match(/^\/homes\/(\d+)\/dashboard(?:\?.*)?$/);
  if (match) {
    const homeId = Number(match[1]);
    return {
      home: demoHome(homeId),
      young_people: makeYoungPeople(homeId),
      items: [],
      summary: {
        occupancy: 4,
        incidents_last_7_days: 6,
        overdue_items: 5,
        staffing_pressure: "medium",
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
    const team = makeTeam(homeId);
    return { items: team, team };
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
    return { items, communications: items };
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
      items: makeCompliance(1).slice(0, 5),
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
        record_type: RECORD_TYPES.risk_assessment,
      },
      {
        id: 15002 + youngPersonId,
        young_person_id: youngPersonId,
        title: "Support plan",
        summary: "Best responses include reassurance, predictability, and low demand language.",
        category: "Support",
        review_date: dateOnly(14),
        status: "active",
        record_type: RECORD_TYPES.support_plan,
      },
    ];
    return { items, risks: items, risk_assessments: items };
  }

  return null;
}

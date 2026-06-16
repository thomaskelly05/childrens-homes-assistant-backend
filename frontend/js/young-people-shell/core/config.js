export const ROLE_SCOPE_ACCESS = Object.freeze({
  staff: ["child", "home"],
  rsw: ["child", "home"],
  residential_support_worker: ["child", "home"],

  manager: ["child", "home", "quality", "ofsted"],
  registered_manager: ["child", "home", "quality", "ofsted"],
  deputy_manager: ["child", "home", "quality", "ofsted"],

  ri: ["child", "home", "quality", "ofsted"],
  responsible_individual: ["child", "home", "quality", "ofsted"],

  admin: ["child", "home", "quality", "ofsted"],
  administrator: ["child", "home", "quality", "ofsted"],
  super_admin: ["child", "home", "quality", "ofsted"],
  superadmin: ["child", "home", "quality", "ofsted"],
});

export const SCOPE_DEFAULT_SECTION = Object.freeze({
  child: "workspace",
  home: "home-dashboard",
  quality: "quality",
  ofsted: "ofsted-dashboard",
});

export const SCOPE_SECTIONS = Object.freeze({
  child: Object.freeze([
    "workspace",
    "overview",
    "experience-intelligence",
    "admission",
    "profile",
    "timeline",
    "handover",
    "daily-life",
    "health",
    "medication",
    "education",
    "family",
    "calendar",
    "therapy",
    "risk",
    "safeguarding",
    "missing-from-care",
    "readiness",
    "reviews",
    "reports",
    "transition",
    "leaving-care",
    "documents",
    "communication",
    "manager",
    "actions",
  ]),
  home: Object.freeze([
    "home-dashboard",
    "operations",
    "calendar",
    "team",
    "rota",
    "staff-profile",
    "onboarding",
    "supervision",
    "training-centre",
    "compliance",
    "health-safety",
    "maintenance",
    "notifications",
    "manager",
    "quality",
    "reports",
    "inspection evidence preparation",
    "policies",
    "documents",
    "communication",
    "actions",
  ]),
  quality: Object.freeze([
    "provider-overview",
    "quality",
    "quality-audits",
    "compliance",
    "reg44",
    "reg45",
    "inspection evidence preparation",
    "staff-profile",
    "onboarding",
    "supervision",
    "training-centre",
    "team",
    "rota",
    "notifications",
    "reports",
    "policies",
    "documents",
    "communication",
    "actions",
  ]),
  ofsted: Object.freeze([
    "ofsted-dashboard",
    "sccif-evidence",
    "judgement-builder",
    "inspection evidence preparation",
    "quality-audits",
    "reg44",
    "reg45",
    "compliance",
    "health-safety",
    "staff-profile",
    "onboarding",
    "supervision",
    "training-centre",
    "team",
    "rota",
    "notifications",
    "reports",
    "documents",
    "policies",
    "communication",
    "actions",
  ]),
});

export const SECTION_TITLES = Object.freeze({
  workspace: "Today at a glance",
  overview: "What matters today",
  "experience-intelligence": "Child Experience Intelligence",
  admission: "Admission and planning",
  profile: "About this child",
  timeline: "Timeline and recent events",
  handover: "Handover",
  "daily-life": "Daily life in placement",
  health: "Health overview",
  medication: "Medication and treatment",
  education: "Education overview",
  family: "Family and relationships",
  calendar: "Calendar and appointments",
  therapy: "Therapeutic support",
  risk: "Risk assessment",
  safeguarding: "Safeguarding",
  "missing-from-care": "Missing from care",
  readiness: "Actions and readiness",
  reviews: "Reviews and outcomes",
  reports: "Reports and reviews",
  transition: "Transition planning",
  "leaving-care": "Leaving placement",
  documents: "Documents",
  communication: "Communication log",
  manager: "Manager review",
  actions: "Actions and follow-through",

  "home-dashboard": "Home dashboard",
  operations: "Daily operations",
  team: "Team and staffing",
  rota: "Rota and cover",
  "staff-profile": "Staff profiles",
  onboarding: "Recruitment and onboarding",
  supervision: "Supervision and development",
  "training-centre": "Training and compliance",
  compliance: "Compliance and statutory checks",
  "health-safety": "Health and safety",
  maintenance: "Maintenance and environment",
  notifications: "Alerts and notifications",
  quality: "Quality dashboard",
  "inspection evidence preparation": "Inspection evidence preparation",
  policies: "Policies and guidance",

  "provider-overview": "Provider overview",
  "quality-audits": "Quality audits",
  reg44: "Regulation 44",
  reg45: "Regulation 45",
  "inspection evidence preparation": "Inspection evidence preparation",

  "ofsted-dashboard": "Ofsted dashboard",
  "sccif-evidence": "SCCIF evidence",
  "judgement-builder": "Judgement builder",
});

export const SECTION_SUBTITLES = Object.freeze({
  workspace:
    "A calm, practical space to record, reflect, safeguard and respond to what matters today.",
  overview:
    "A clear picture of strengths, risks, priorities, progress and next steps.",
  "experience-intelligence":
    "Understand lived experience, stability, triggers, positive anchors, relationship patterns and risk trajectory over time.",
  admission:
    "Admission tasks, planning, baseline needs, risk and welcome arrangements.",
  profile:
    "Identity, communication, needs, strengths and what adults should hold in mind.",
  timeline:
    "A shared view of significant events, patterns, progress and concerns over time.",
  handover:
    "Support safe, thoughtful communication between adults across the shift.",
  "daily-life":
    "Daily routines, notes, achievements, appointments and life in placement.",
  health:
    "Health needs, appointments, professionals, outcomes and follow-up.",
  medication:
    "Medication administration, treatment plans, audits and health follow-up.",
  education:
    "Learning, attendance, support, strengths and educational experience.",
  family:
    "Family contact, important relationships and how these are experienced.",
  calendar:
    "Appointments, meetings and important dates that shape the week.",
  therapy:
    "Therapeutic input, recommendations, outcomes and emotional wellbeing support.",
  risk:
    "Risk assessments, triggers, protective factors and response guidance.",
  safeguarding:
    "Safeguarding concerns, referrals, linked actions and oversight.",
  "missing-from-care":
    "Missing episodes, returns, patterns, response quality and follow-up.",
  readiness:
    "Actions, practical tasks, readiness signals, compliance pressure and follow-up.",
  reviews:
    "Review preparation, outcomes tracking, progress themes and next steps.",
  reports:
    "Structured summaries, reports and review outputs for the child or service.",
  transition:
    "Planning for change, independence, step-down and future moves.",
  "leaving-care":
    "Leaving placement planning, closure work, summaries and ending well.",
  documents:
    "Upload, organise and review statutory and supporting documents.",
  communication:
    "Track communication with professionals, families and partner agencies.",
  manager:
    "Oversight, management review, decision-making and quality assurance.",
  actions:
    "A single action board for ownership, due dates, escalation, updates and closure.",

  "home-dashboard":
    "A whole-home operational view for managers and senior staff.",
  operations:
    "Daily running of the home, live issues, occupancy, shift visibility and priorities.",
  team:
    "Team capacity, staffing, deployment and workforce context.",
  rota:
    "A live rota view across cover, absences, shift leads, agency use and gaps.",
  "staff-profile":
    "A live workforce view across staff roles, files, checks, training and readiness.",
  onboarding:
    "Track recruitment checks, induction, probation and safer recruitment progress.",
  supervision:
    "Supervision, training, appraisal, development and workforce support.",
  "training-centre":
    "Mandatory training, role development, compliance and workforce learning needs.",
  compliance:
    "A live compliance view across workforce, children’s files, statutory paperwork and Inspection evidence preparation.",
  "health-safety":
    "Fire, premises, risk controls, safety checks and environmental readiness.",
  maintenance:
    "Repairs, environment standards, premises issues and follow-up actions.",
  notifications:
    "A live action layer for reminders, escalations, acknowledgements and workforce follow-up.",
  quality:
    "Quality assurance, audits, trends, RI oversight and service performance.",
  "inspection evidence preparation":
    "Live mock Ofsted dashboard, evidence gaps, action tracking and Inspection evidence preparation across the home.",
  policies:
    "Policy library, review dates, guidance and practice standards across the service.",

  "provider-overview":
    "A cross-home quality and operational overview for provider and senior leaders.",
  "quality-audits":
    "Internal audit activity, findings, action plans and progress against improvement themes.",
  reg44:
    "Independent visit preparation, evidence collation, themes and resulting actions.",
  reg45:
    "Quality of care review planning, evidence, analysis and improvement actions.",
  "inspection evidence preparation":
    "Portfolio-level inspection evidence, gaps, readiness tracking and regulator-facing preparation.",

  "ofsted-dashboard":
    "A dedicated inspection-facing view that turns live practice, evidence and oversight into a clear inspection picture.",
  "sccif-evidence":
    "Evidence mapped against SCCIF themes, lines of enquiry and likely inspection focus areas.",
  "judgement-builder":
    "Build inspection evidence preparation strengths, gaps, impact statements and draft judgement language from the underlying evidence.",
});

/*
  Keep this empty for now if you are not ready to wire grouped nav metadata yet.
  The rest of the app must tolerate it.
*/
const NAV_GROUPS = [];

export const NAV_GROUPS_CONFIG = Object.freeze(
  NAV_GROUPS.map((group) =>
    Object.freeze({
      ...group,
      items: Object.freeze(
        Array.isArray(group.items)
          ? group.items.map((item) => Object.freeze({ ...item }))
          : []
      ),
    })
  )
);

export const NAV_SECTIONS = Object.freeze(
  NAV_GROUPS.flatMap((group) =>
    (Array.isArray(group.items) ? group.items : []).map((item) =>
      Object.freeze({
        ...item,
        group_id: group.id,
        group_title: group.title,
      })
    )
  )
);

export const NAV_SECTION_MAP = Object.freeze(
  Object.fromEntries(NAV_SECTIONS.map((item) => [item.id, item]))
);

export const NAV_GROUP_MAP = Object.freeze(
  Object.fromEntries(NAV_GROUPS_CONFIG.map((group) => [group.id, group]))
);

export const QUICK_ACTIONS = Object.freeze([
  {
    id: "daily_note",
    label: "Add daily note",
    short_label: "Daily note",
    record_type: "daily_note",
    section_hint: "workspace",
    description:
      "Capture the day clearly, warmly and with the child at the centre.",
  },
  {
    id: "incident",
    label: "Add incident or important event",
    short_label: "Incident",
    record_type: "incident",
    section_hint: "timeline",
    description:
      "Record a significant event clearly, safely and factually.",
  },
  {
    id: "support_plan",
    label: "Add care or support plan",
    short_label: "Support plan",
    record_type: "support_plan",
    section_hint: "admission",
    description:
      "Create practical guidance to help adults respond consistently.",
  },
  {
    id: "risk",
    label: "Add risk assessment",
    short_label: "Risk",
    record_type: "risk",
    section_hint: "risk",
    description:
      "Record risks, early signs, protective factors and response guidance.",
  },
  {
    id: "health_record",
    label: "Add health record",
    short_label: "Health",
    record_type: "health_record",
    section_hint: "health",
    description:
      "Record health events, professionals, outcomes and follow-up.",
  },
  {
    id: "education_record",
    label: "Add education update",
    short_label: "Education",
    record_type: "education_record",
    section_hint: "education",
    description:
      "Record learning, attendance, support, concerns and strengths.",
  },
  {
    id: "family_contact",
    label: "Add family contact",
    short_label: "Family contact",
    record_type: "family_contact",
    section_hint: "family",
    description:
      "Record contact, presentation, concerns and next steps.",
  },
  {
    id: "keywork",
    label: "Add keywork session",
    short_label: "Keywork",
    record_type: "keywork",
    section_hint: "daily-life",
    description:
      "Record direct work, reflection and agreed actions.",
  },
  {
    id: "appointment",
    label: "Add appointment",
    short_label: "Appointment",
    record_type: "appointment",
    section_hint: "calendar",
    description:
      "Add an appointment, purpose, preparation and follow-up.",
  },
  {
    id: "achievement_record",
    label: "Add achievement",
    short_label: "Achievement",
    record_type: "achievement_record",
    section_hint: "education",
    description:
      "Capture progress, strengths, success and what it meant.",
  },
  {
    id: "safeguarding_record",
    label: "Add safeguarding record",
    short_label: "Safeguarding",
    record_type: "safeguarding_record",
    section_hint: "safeguarding",
    description:
      "Record safeguarding concerns, immediate action and referrals.",
  },
  {
    id: "missing_episode",
    label: "Add missing episode",
    short_label: "Missing",
    record_type: "missing_episode",
    section_hint: "missing-from-care",
    description:
      "Record a missing episode, response, return and follow-up.",
  },
  {
    id: "task",
    label: "Add action",
    short_label: "Action",
    record_type: "task",
    section_hint: "readiness",
    description:
      "Create a clear action with ownership and next steps.",
  },
  {
    id: "upload_document",
    label: "Upload document",
    short_label: "Upload",
    record_type: "document",
    section_hint: "documents",
    description:
      "Upload a statutory or supporting document to the child or service record.",
  },
  {
    id: "professional_message",
    label: "Log communication",
    short_label: "Communication",
    record_type: "communication",
    section_hint: "communication",
    description:
      "Record contact with professionals, family members and partner agencies.",
  },
  {
    id: "staff_task",
    label: "Add staff action",
    short_label: "Staff action",
    record_type: "task",
    section_hint: "staff-profile",
    description:
      "Create a workforce action linked to onboarding, training, supervision or staffing.",
  },
  {
    id: "policy_review",
    label: "Add policy review action",
    short_label: "Policy action",
    record_type: "task",
    section_hint: "policies",
    description:
      "Create an action linked to policy updates, review dates or guidance changes.",
  },
  {
    id: "health_safety_check",
    label: "Add health and safety check",
    short_label: "H&S check",
    record_type: "task",
    section_hint: "health-safety",
    description:
      "Record a health and safety action, check or follow-up.",
  },
  {
    id: "ofsted_action",
    label: "Add inspection action",
    short_label: "Inspection action",
    record_type: "task",
    section_hint: "ofsted-dashboard",
    description:
      "Create an inspection evidence preparation or evidence-gap action linked to SCCIF and Ofsted preparation.",
  },
]);

export const QUICK_ACTION_MAP = Object.freeze(
  Object.fromEntries(QUICK_ACTIONS.map((action) => [action.id, action]))
);

export const SECTION_DEFAULT_ACTION = Object.freeze({
  workspace: "daily_note",
  overview: "daily_note",
  "experience-intelligence": "task",
  admission: "support_plan",
  profile: "profile_identity",
  timeline: "incident",
  handover: "daily_note",
  "daily-life": "daily_note",
  health: "health_record",
  medication: "health_record",
  education: "education_record",
  family: "family_contact",
  calendar: "appointment",
  therapy: "task",
  risk: "risk",
  safeguarding: "safeguarding_record",
  "missing-from-care": "missing_episode",
  readiness: "task",
  reviews: "task",
  reports: "task",
  transition: "task",
  "leaving-care": "task",
  documents: "upload_document",
  communication: "professional_message",
  manager: "task",
  actions: "task",

  "home-dashboard": "task",
  operations: "task",
  team: "task",
  rota: "staff_task",
  "staff-profile": "staff_task",
  onboarding: "staff_task",
  supervision: "staff_task",
  "training-centre": "staff_task",
  compliance: "task",
  "health-safety": "health_safety_check",
  maintenance: "task",
  notifications: "staff_task",
  quality: "task",
  "inspection evidence preparation": "task",
  policies: "policy_review",

  "provider-overview": "task",
  "quality-audits": "task",
  reg44: "task",
  reg45: "task",
  "inspection evidence preparation": "task",

  "ofsted-dashboard": "ofsted_action",
  "sccif-evidence": "ofsted_action",
  "judgement-builder": "ofsted_action",
});

export const PROFILE_ACTIONS = Object.freeze([
  {
    id: "profile_identity",
    label: "Identity and what matters",
    short_label: "Identity",
    record_type: "profile_identity",
    description:
      "Culture, language, strengths, interests and what matters most.",
  },
  {
    id: "profile_communication",
    label: "Communication and regulation",
    short_label: "Communication",
    record_type: "profile_communication",
    description:
      "How this child communicates, processes and what helps.",
  },
  {
    id: "profile_education",
    label: "Education profile",
    short_label: "Education",
    record_type: "profile_education",
    description:
      "School, support, learning access and educational context.",
  },
  {
    id: "profile_health",
    label: "Health profile",
    short_label: "Health",
    record_type: "profile_health",
    description:
      "Health contacts, diagnoses, allergies, medication and wellbeing.",
  },
  {
    id: "profile_legal",
    label: "Legal status",
    short_label: "Legal",
    record_type: "profile_legal",
    description:
      "Legal context, authority, restrictions and consent arrangements.",
  },
  {
    id: "profile_formulation",
    label: "Formulation",
    short_label: "Formulation",
    record_type: "profile_formulation",
    description:
      "Shared understanding of needs, behaviour, patterns and what helps.",
  },
]);

export const PROFILE_ACTION_MAP = Object.freeze(
  Object.fromEntries(PROFILE_ACTIONS.map((action) => [action.id, action]))
);

export function normaliseRoleKey(role = "staff") {
  const value = String(role || "staff").trim().toLowerCase();

  if (
    value === "administrator" ||
    value === "super_admin" ||
    value === "superadmin" ||
    value === "admin_user" ||
    value === "system_admin" ||
    value === "owner"
  ) {
    return "admin";
  }

  if (value === "responsible_individual" || value === "director" || value === "ceo") {
    return "ri";
  }

  if (value === "rm") {
    return "manager";
  }

  return value || "staff";
}

export function getAllowedScopesForRole(role = "staff") {
  const safeRole = normaliseRoleKey(role);
  return ROLE_SCOPE_ACCESS[safeRole] || ROLE_SCOPE_ACCESS.staff;
}

export function canRoleAccessScope(role = "staff", scope = "child") {
  return getAllowedScopesForRole(role).includes(scope);
}

export function getDefaultScopeForRole(role = "staff") {
  const safeRole = normaliseRoleKey(role);

  if (["ri", "admin"].includes(safeRole)) return "quality";
  if (["manager", "registered_manager", "deputy_manager"].includes(safeRole)) {
    return "home";
  }

  const allowed = getAllowedScopesForRole(safeRole);
  return allowed[0] || "child";
}

export function getSectionsForScope(scope = "child") {
  return SCOPE_SECTIONS[scope] || SCOPE_SECTIONS.child;
}

export function isSectionInScope(section = "", scope = "child") {
  return getSectionsForScope(scope).includes(section);
}

export function getDefaultSectionForScope(scope = "child") {
  return SCOPE_DEFAULT_SECTION[scope] || "workspace";
}

export function getSafeSectionForScope(section = "", scope = "child") {
  return isSectionInScope(section, scope)
    ? section
    : getDefaultSectionForScope(scope);
}

export function getSectionTitle(section = "") {
  return SECTION_TITLES[section] || "Workspace";
}

export function getSectionSubtitle(section = "") {
  return SECTION_SUBTITLES[section] || "";
}

export function getNavSection(sectionId = "") {
  return NAV_SECTION_MAP[sectionId] || null;
}

export function getQuickAction(actionId = "") {
  return QUICK_ACTION_MAP[actionId] || null;
}

export function getProfileAction(actionId = "") {
  return PROFILE_ACTION_MAP[actionId] || null;
}

export function validateConfig() {
  const issues = [];

  Object.entries(SCOPE_DEFAULT_SECTION).forEach(([scope, section]) => {
    if (!isSectionInScope(section, scope)) {
      issues.push(
        `Default section "${section}" is not present in scope "${scope}".`
      );
    }
  });

  Object.entries(SECTION_DEFAULT_ACTION).forEach(([section, actionId]) => {
    const isQuickAction = Boolean(QUICK_ACTION_MAP[actionId]);
    const isProfileAction = Boolean(PROFILE_ACTION_MAP[actionId]);

    if (!isQuickAction && !isProfileAction) {
      issues.push(
        `Default action "${actionId}" for section "${section}" does not exist.`
      );
    }
  });

  QUICK_ACTIONS.forEach((action) => {
    if (action.section_hint && !SECTION_TITLES[action.section_hint]) {
      issues.push(
        `Quick action "${action.id}" points to unknown section "${action.section_hint}".`
      );
    }
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}

/*
  Canonical inspection / quality endpoints plus compatibility aliases for
  existing loaders already in the frontend.

  Canonical newer families:
  - quality audits / findings / actions
  - compliance items
  - reg44 visits / findings / actions
  - reg45 reviews / actions
  - inspection scores / sections / reasons / lines of enquiry / actions
  - manager review queue

  Compatibility aliases preserved for existing loaders:
  - ofstedDashboard
  - dashboard
  - sccifEvidence
  - judgementBuilder
  - readiness
  - compliance
  - audits
  - documents
  - incidents
*/
export function buildInspectionUiEndpoints(homeId) {
  const safeHomeId =
    homeId !== null && homeId !== undefined && homeId !== ""
      ? Number(homeId)
      : null;

  if (!Number.isFinite(safeHomeId) || safeHomeId <= 0) {
    return null;
  }

  const base = `/homes/${safeHomeId}`;

  const endpoints = {
    homeId: safeHomeId,
    base,

    qualityAudits: `${base}/quality-audits`,
    qualityAuditFindings: `${base}/quality-audit-findings`,
    qualityAuditActions: `${base}/quality-audit-actions`,

    complianceItems: `${base}/compliance-items`,

    reg44Visits: `${base}/reg44-visits`,
    reg44Findings: `${base}/reg44-findings`,
    reg44Actions: `${base}/reg44-actions`,

    reg45Reviews: `${base}/reg45-reviews`,
    reg45Actions: `${base}/reg45-actions`,

    inspectionScores: `${base}/inspection-scores`,
    inspectionSectionScores: `${base}/inspection-section-scores`,
    inspectionScoreReasons: `${base}/inspection-score-reasons`,
    inspectionLinesOfEnquiry: `${base}/inspection-lines-of-enquiry`,
    inspectionImprovementActions: `${base}/inspection-improvement-actions`,

    managerReviewQueue: `${base}/manager-review-queue`,

    visibilityQuality: `/visibility/quality?home_id=${safeHomeId}&all_accessible_homes=false`,
    visibilityOfsted: `/visibility/ofsted?home_id=${safeHomeId}&all_accessible_homes=false`,

    team: `${base}/team`,
    training: `${base}/training`,
    supervisions: `${base}/supervisions`,
    probations: `${base}/probations`,
    inductions: `${base}/inductions`,
    childCompliance: `${base}/child-compliance`,
    documents: `${base}/documents`,
    incidents: `${base}/incidents`,
    safeguarding: `${base}/safeguarding`,
    reports: `${base}/reports`,

    dashboard: `${base}/inspection-scores`,
    ofstedDashboard: `${base}/inspection-scores`,
    sccifEvidence: `${base}/inspection-section-scores`,
    judgementBuilder: `${base}/inspection-lines-of-enquiry`,
    readiness: `${base}/inspection-improvement-actions`,
    compliance: `${base}/compliance-items`,
    audits: `${base}/quality-audits`,
  };

  return Object.freeze(endpoints);
}
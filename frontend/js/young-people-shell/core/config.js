export const ROLE_SCOPE_ACCESS = Object.freeze({
  // Direct care staff
  staff: ["child", "home"],
  rsw: ["child", "home"],
  residential_support_worker: ["child", "home"],

  // Management
  manager: ["child", "home", "quality"],
  registered_manager: ["child", "home", "quality"],
  deputy_manager: ["child", "home", "quality"],

  // Responsible individual / oversight
  ri: ["child", "home", "quality"],
  responsible_individual: ["child", "home", "quality"],

  // Admin
  admin: ["child", "home", "quality"],
  administrator: ["child", "home", "quality"],
  super_admin: ["child", "home", "quality"],
  superadmin: ["child", "home", "quality"],
});

export const SCOPE_DEFAULT_SECTION = Object.freeze({
  child: "workspace",
  home: "home-dashboard",
  quality: "quality",
});

export const SCOPE_SECTIONS = Object.freeze({
  child: [
    "workspace",
    "overview",
    "profile",
    "timeline",
    "handover",
    "health",
    "education",
    "family",
    "calendar",
    "readiness",
    "manager",
    "reports",
    "documents",
    "communication",
    "therapy",
  ],
  home: [
    "home-dashboard",
    "compliance",
    "staff-profile",
    "onboarding",
    "notifications",
    "rota",
    "manager",
    "reports",
    "calendar",
    "team",
    "supervision",
    "communication",
    "documents",
  ],
  quality: [
    "quality",
    "compliance",
    "staff-profile",
    "onboarding",
    "notifications",
    "rota",
    "reports",
    "manager",
    "calendar",
    "team",
    "supervision",
    "communication",
    "documents",
  ],
});

export const SECTION_TITLES = Object.freeze({
  workspace: "Today at a glance",
  overview: "What matters today",
  profile: "About this child",
  timeline: "Timeline and recent events",
  handover: "Handover",
  health: "Health overview",
  education: "Education overview",
  family: "Family and relationships",
  calendar: "Calendar and appointments",
  readiness: "Independence and readiness",
  manager: "Manager review",
  reports: "Reports and reviews",
  documents: "Documents",
  communication: "Communication log",
  therapy: "Therapeutic support",
  "home-dashboard": "Home dashboard",
  team: "Team and staffing",
  supervision: "Supervision and development",
  compliance: "Compliance and statutory checks",
  quality: "Quality dashboard",
  "staff-profile": "Staff profiles",
  onboarding: "Recruitment and onboarding",
  notifications: "Alerts and notifications",
  rota: "Rota and cover",
});

export const SECTION_SUBTITLES = Object.freeze({
  workspace:
    "A calm, practical space to record, reflect, safeguard and respond to what matters today.",
  overview:
    "A clear picture of strengths, risks, priorities, progress and next steps.",
  profile:
    "Identity, communication, needs, strengths and what adults should hold in mind.",
  timeline:
    "A shared view of significant events, patterns, progress and concerns over time.",
  handover:
    "Support safe, thoughtful communication between adults across the shift.",
  health:
    "Health needs, appointments, professionals, outcomes and follow-up.",
  education:
    "Learning, attendance, support, strengths and educational experience.",
  family:
    "Family contact, important relationships and how these are experienced.",
  calendar:
    "Appointments, meetings and important dates that shape the week.",
  readiness:
    "Actions, practical tasks, preparation and follow-up that need attention.",
  manager:
    "Oversight, management review, decision-making and quality assurance.",
  reports:
    "Structured summaries, reports and review outputs for the child or service.",
  documents:
    "Upload, organise and review statutory and supporting documents.",
  communication:
    "Track communication with professionals, families and partner agencies.",
  therapy:
    "Therapeutic input, recommendations, outcomes and emotional wellbeing support.",
  "home-dashboard":
    "A whole-home operational view for managers and senior staff.",
  team:
    "Team capacity, staffing, deployment and workforce context.",
  supervision:
    "Supervision, training, appraisal, development and workforce support.",
  compliance:
    "A live compliance view across workforce, children’s files, statutory paperwork and inspection readiness.",
  quality:
    "Quality assurance, audits, trends, RI oversight and service performance.",
  "staff-profile":
    "A live workforce view across staff roles, files, checks, training and readiness.",
  onboarding:
    "Track recruitment checks, induction, probation and safer recruitment progress.",
  notifications:
    "A live action layer for reminders, escalations, acknowledgements and workforce follow-up.",
  rota:
    "A live rota view across cover, absences, shift leads, agency use and gaps.",
});

const NAV_GROUPS = [
  {
    id: "dashboard",
    title: "Dashboard",
    items: [
      {
        id: "workspace",
        label: "Today at a glance",
        short_label: "Today",
        icon: "home",
        description:
          "The main place to record, reflect and act on what matters today.",
      },
      {
        id: "overview",
        label: "What matters today",
        short_label: "Overview",
        icon: "layout-dashboard",
        description:
          "A clear picture of priorities, progress, strengths and current concerns.",
      },
      {
        id: "timeline",
        label: "Timeline and recent events",
        short_label: "Timeline",
        icon: "list-ordered",
        description: "A clear view of what has happened over time.",
      },
      {
        id: "calendar",
        label: "Calendar and appointments",
        short_label: "Calendar",
        icon: "calendar",
        description: "Appointments, meetings and important dates.",
      },
    ],
  },
  {
    id: "daily_recording",
    title: "Daily recording",
    items: [
      {
        id: "handover",
        label: "Handover",
        short_label: "Handover",
        icon: "repeat",
        description:
          "Support smooth, thoughtful communication between adults.",
      },
      {
        id: "communication",
        label: "Communication log",
        short_label: "Comms",
        icon: "messages-square",
        description:
          "Professional liaison, family contact and important communication trails.",
      },
      {
        id: "documents",
        label: "Documents",
        short_label: "Documents",
        icon: "folder",
        description:
          "Statutory documents, uploads and important child or service records.",
      },
    ],
  },
  {
    id: "child_and_family",
    title: "Family and relationships",
    items: [
      {
        id: "profile",
        label: "About this child",
        short_label: "Profile",
        icon: "user",
        description:
          "Identity, communication, needs, strengths and what matters to them.",
      },
      {
        id: "family",
        label: "Family and relationships",
        short_label: "Family",
        icon: "users",
        description:
          "Family contact, important relationships and how contact is experienced.",
      },
    ],
  },
  {
    id: "health_and_progress",
    title: "Health and progress",
    items: [
      {
        id: "health",
        label: "Health overview",
        short_label: "Health",
        icon: "heart-pulse",
        description:
          "Health needs, professionals, appointments, outcomes and follow-up.",
      },
      {
        id: "education",
        label: "Education overview",
        short_label: "Education",
        icon: "graduation-cap",
        description:
          "Learning, attendance, strengths, support and educational progress.",
      },
      {
        id: "therapy",
        label: "Therapeutic support",
        short_label: "Therapy",
        icon: "sparkles",
        description:
          "Therapy input, recommendations, outcomes and emotional wellbeing support.",
      },
      {
        id: "readiness",
        label: "Independence and readiness",
        short_label: "Readiness",
        icon: "shield-check",
        description:
          "Practical life skills, independence work, actions and preparation.",
      },
    ],
  },
  {
    id: "planning_and_review",
    title: "Plans and actions",
    items: [
      {
        id: "reports",
        label: "Reports and reviews",
        short_label: "Reports",
        icon: "file-text",
        description:
          "Reports, summaries and structured review outputs.",
      },
      {
        id: "manager",
        label: "Manager review",
        short_label: "Manager",
        icon: "clipboard-check",
        description:
          "Review workflows, oversight, decision-making and management actions.",
      },
    ],
  },
  {
    id: "home_operations",
    title: "Home operations",
    items: [
      {
        id: "home-dashboard",
        label: "Home dashboard",
        short_label: "Home",
        icon: "building-2",
        description:
          "A whole-home dashboard with live operational visibility.",
      },
      {
        id: "rota",
        label: "Rota and cover",
        short_label: "Rota",
        icon: "calendar",
        description:
          "Shift cover, shift leads, absences, agency use and operational gaps.",
      },
      {
        id: "team",
        label: "Team and staffing",
        short_label: "Team",
        icon: "users-round",
        description:
          "Staffing, roles, rota context, sickness, vacancies and deployment.",
      },
      {
        id: "notifications",
        label: "Alerts and notifications",
        short_label: "Alerts",
        icon: "messages-square",
        description:
          "Reminders, escalations and live actions for staff and managers.",
      },
    ],
  },
  {
    id: "staff_and_development",
    title: "Staff and development",
    items: [
      {
        id: "staff-profile",
        label: "Staff profiles",
        short_label: "Staff",
        icon: "users-round",
        description:
          "Workforce profiles, checks, training, supervision and file readiness.",
      },
      {
        id: "onboarding",
        label: "Recruitment and onboarding",
        short_label: "Onboarding",
        icon: "clipboard-check",
        description:
          "Recruitment checks, induction, probation and safer recruitment workflow.",
      },
      {
        id: "supervision",
        label: "Supervision and development",
        short_label: "Supervision",
        icon: "badge-check",
        description:
          "Supervisions, appraisals, capability, training and workforce support.",
      },
    ],
  },
  {
    id: "quality_and_compliance",
    title: "Quality and compliance",
    items: [
      {
        id: "compliance",
        label: "Compliance and statutory checks",
        short_label: "Compliance",
        icon: "badge-check",
        description:
          "Compliance across staff files, supervisions, training, statutory paperwork and inspection readiness.",
      },
      {
        id: "quality",
        label: "Quality dashboard",
        short_label: "Quality",
        icon: "bar-chart-3",
        description:
          "Quality assurance, audits, trends, RI oversight and service standards.",
      },
    ],
  },
];

export const NAV_GROUPS_CONFIG = Object.freeze(
  NAV_GROUPS.map((group) =>
    Object.freeze({
      ...group,
      items: Object.freeze(group.items.map((item) => Object.freeze({ ...item }))),
    })
  )
);

export const NAV_SECTIONS = Object.freeze(
  NAV_GROUPS.flatMap((group) =>
    group.items.map((item) =>
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
    section_hint: "workspace",
    description:
      "Create practical guidance to help adults respond consistently.",
  },
  {
    id: "risk",
    label: "Add risk assessment",
    short_label: "Risk",
    record_type: "risk",
    section_hint: "manager",
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
    section_hint: "workspace",
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
    section_hint: "manager",
    description:
      "Record safeguarding concerns, immediate action and referrals.",
  },
  {
    id: "missing_episode",
    label: "Add missing episode",
    short_label: "Missing",
    record_type: "missing_episode",
    section_hint: "timeline",
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
]);

export const QUICK_ACTION_MAP = Object.freeze(
  Object.fromEntries(QUICK_ACTIONS.map((action) => [action.id, action]))
);

export const SECTION_DEFAULT_ACTION = Object.freeze({
  workspace: "daily_note",
  overview: "daily_note",
  profile: "profile_identity",
  timeline: "incident",
  handover: "daily_note",
  health: "health_record",
  education: "education_record",
  family: "family_contact",
  calendar: "appointment",
  readiness: "task",
  manager: "task",
  reports: "task",
  documents: "upload_document",
  communication: "professional_message",
  therapy: "task",
  "home-dashboard": "task",
  compliance: "task",
  "staff-profile": "staff_task",
  onboarding: "staff_task",
  notifications: "staff_task",
  rota: "staff_task",
  team: "task",
  supervision: "task",
  quality: "task",
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

export function getAllowedScopesForRole(role = "staff") {
  const safeRole = String(role || "staff").trim().toLowerCase();
  return ROLE_SCOPE_ACCESS[safeRole] || ROLE_SCOPE_ACCESS.staff;
}

export function canRoleAccessScope(role = "staff", scope = "child") {
  return getAllowedScopesForRole(role).includes(scope);
}

export function getDefaultScopeForRole(role = "staff") {
  const allowed = getAllowedScopesForRole(role);

  if (allowed.includes("home")) return "home";
  if (allowed.includes("quality")) return "quality";
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

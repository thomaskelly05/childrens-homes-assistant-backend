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
  quality: "provider-overview",
});

export const SCOPE_SECTIONS = Object.freeze({
  child: [
    "workspace",
    "overview",
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
  ],
  home: [
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
    "ofsted-readiness",
    "policies",
    "documents",
    "communication",
  ],
  quality: [
    "provider-overview",
    "quality",
    "quality-audits",
    "compliance",
    "reg44",
    "reg45",
    "inspection-readiness",
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
  ],
});

export const SECTION_TITLES = Object.freeze({
  workspace: "Today at a glance",
  overview: "What matters today",
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
  "ofsted-readiness": "Ofsted readiness",
  policies: "Policies and guidance",

  "provider-overview": "Provider overview",
  "quality-audits": "Quality audits",
  reg44: "Regulation 44",
  reg45: "Regulation 45",
  "inspection-readiness": "Inspection readiness",
});

export const SECTION_SUBTITLES = Object.freeze({
  workspace:
    "A calm, practical space to record, reflect, safeguard and respond to what matters today.",
  overview:
    "A clear picture of strengths, risks, priorities, progress and next steps.",
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
    "A live compliance view across workforce, children’s files, statutory paperwork and inspection readiness.",
  "health-safety":
    "Fire, premises, risk controls, safety checks and environmental readiness.",
  maintenance:
    "Repairs, environment standards, premises issues and follow-up actions.",
  notifications:
    "A live action layer for reminders, escalations, acknowledgements and workforce follow-up.",
  quality:
    "Quality assurance, audits, trends, RI oversight and service performance.",
  "ofsted-readiness":
    "Live mock Ofsted dashboard, evidence gaps, action tracking and inspection readiness across the home.",
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
  "inspection-readiness":
    "Portfolio-level inspection evidence, gaps, readiness tracking and regulator-facing preparation.",
});

const NAV_GROUPS = [
  {
    id: "child_dashboard",
    title: "Child dashboard",
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
    id: "child_admission_and_life",
    title: "Admission and daily life",
    items: [
      {
        id: "admission",
        label: "Admission and planning",
        short_label: "Admission",
        icon: "clipboard-check",
        description:
          "Admission checklist, planning, baseline information and welcome arrangements.",
      },
      {
        id: "handover",
        label: "Handover",
        short_label: "Handover",
        icon: "repeat",
        description:
          "Support smooth, thoughtful communication between adults.",
      },
      {
        id: "daily-life",
        label: "Daily life in placement",
        short_label: "Daily life",
        icon: "home",
        description:
          "Daily routines, notes, appointments, achievements and life in placement.",
      },
      {
        id: "communication",
        label: "Communication log",
        short_label: "Comms",
        icon: "messages-square",
        description:
          "Professional liaison, family contact and important communication trails.",
      },
    ],
  },
  {
    id: "child_identity_and_family",
    title: "Identity and family",
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
      {
        id: "documents",
        label: "Documents",
        short_label: "Documents",
        icon: "folder",
        description:
          "Statutory documents, uploads and important child records.",
      },
    ],
  },
  {
    id: "child_health_and_progress",
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
        id: "medication",
        label: "Medication and treatment",
        short_label: "Medication",
        icon: "heart-pulse",
        description:
          "Medication administration, treatment plans and health monitoring.",
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
        label: "Actions and readiness",
        short_label: "Readiness",
        icon: "shield-check",
        description:
          "Actions, practical tasks, readiness signals, independence work and follow-up.",
      },
    ],
  },
  {
    id: "child_risk_and_review",
    title: "Risk and review",
    items: [
      {
        id: "risk",
        label: "Risk assessment",
        short_label: "Risk",
        icon: "shield-check",
        description:
          "Risk assessments, triggers, protective factors and response guidance.",
      },
      {
        id: "safeguarding",
        label: "Safeguarding",
        short_label: "Safeguarding",
        icon: "badge-check",
        description:
          "Safeguarding concerns, referrals, linked actions and oversight.",
      },
      {
        id: "missing-from-care",
        label: "Missing from care",
        short_label: "Missing",
        icon: "repeat",
        description:
          "Missing episodes, returns, patterns and follow-up.",
      },
      {
        id: "reviews",
        label: "Reviews and outcomes",
        short_label: "Reviews",
        icon: "file-text",
        description:
          "Review preparation, outcomes tracking and next steps.",
      },
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
    id: "child_transition",
    title: "Transition and leaving",
    items: [
      {
        id: "transition",
        label: "Transition planning",
        short_label: "Transition",
        icon: "repeat",
        description:
          "Planning for change, independence, step-down and future moves.",
      },
      {
        id: "leaving-care",
        label: "Leaving placement",
        short_label: "Leaving",
        icon: "home",
        description:
          "Leaving placement planning, summaries and ending well.",
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
        id: "operations",
        label: "Daily operations",
        short_label: "Operations",
        icon: "layout-dashboard",
        description:
          "Live events, shift visibility, occupancy and daily priorities across the home.",
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
    id: "home_staff_and_development",
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
      {
        id: "training-centre",
        label: "Training and compliance",
        short_label: "Training",
        icon: "graduation-cap",
        description:
          "Mandatory training, role development and workforce learning needs.",
      },
    ],
  },
  {
    id: "home_compliance_and_quality",
    title: "Compliance and quality",
    items: [
      {
        id: "compliance",
        label: "Compliance and statutory checks",
        short_label: "Compliance",
        icon: "badge-check",
        description:
          "Compliance across staff files, children’s files, statutory paperwork and inspection readiness.",
      },
      {
        id: "health-safety",
        label: "Health and safety",
        short_label: "H&S",
        icon: "shield-check",
        description:
          "Fire, premises, risk controls, safety checks and environmental readiness.",
      },
      {
        id: "maintenance",
        label: "Maintenance and environment",
        short_label: "Maintenance",
        icon: "building-2",
        description:
          "Repairs, environment standards, premises issues and follow-up actions.",
      },
      {
        id: "quality",
        label: "Quality dashboard",
        short_label: "Quality",
        icon: "bar-chart-3",
        description:
          "Quality assurance, audits, trends, RI oversight and service standards.",
      },
      {
        id: "reports",
        label: "Reports and reviews",
        short_label: "Reports",
        icon: "file-text",
        description:
          "Home reports, reviews and structured management outputs.",
      },
      {
        id: "ofsted-readiness",
        label: "Ofsted readiness",
        short_label: "Ofsted",
        icon: "clipboard-check",
        description:
          "Live mock Ofsted dashboard, evidence gaps, action tracking and inspection readiness.",
      },
      {
        id: "policies",
        label: "Policies and guidance",
        short_label: "Policies",
        icon: "folder",
        description:
          "Policy library, review dates, guidance and practice standards.",
      },
      {
        id: "documents",
        label: "Documents",
        short_label: "Documents",
        icon: "folder",
        description:
          "Home documents, evidence packs and supporting records.",
      },
      {
        id: "communication",
        label: "Communication log",
        short_label: "Comms",
        icon: "messages-square",
        description:
          "Communication with professionals, families, providers and partner agencies.",
      },
      {
        id: "manager",
        label: "Manager review",
        short_label: "Manager",
        icon: "clipboard-check",
        description:
          "Home oversight, decision-making and management actions.",
      },
    ],
  },
  {
    id: "quality_provider_and_audit",
    title: "Provider and oversight",
    items: [
      {
        id: "provider-overview",
        label: "Provider overview",
        short_label: "Provider",
        icon: "building-2",
        description:
          "A cross-home quality and operational overview for provider and senior leaders.",
      },
      {
        id: "quality",
        label: "Quality dashboard",
        short_label: "Quality",
        icon: "bar-chart-3",
        description:
          "Quality assurance, audits, trends, RI oversight and service performance.",
      },
      {
        id: "quality-audits",
        label: "Quality audits",
        short_label: "Audits",
        icon: "clipboard-check",
        description:
          "Internal audits, findings, action plans and progress.",
      },
      {
        id: "reg44",
        label: "Regulation 44",
        short_label: "Reg 44",
        icon: "file-text",
        description:
          "Independent visit preparation, evidence, themes and resulting actions.",
      },
      {
        id: "reg45",
        label: "Regulation 45",
        short_label: "Reg 45",
        icon: "file-text",
        description:
          "Quality of care review planning, evidence and improvement actions.",
      },
      {
        id: "inspection-readiness",
        label: "Inspection readiness",
        short_label: "Inspection",
        icon: "badge-check",
        description:
          "Portfolio-level inspection evidence, gaps, readiness tracking and preparation.",
      },
      {
        id: "compliance",
        label: "Compliance and statutory checks",
        short_label: "Compliance",
        icon: "badge-check",
        description:
          "Cross-home compliance themes, overdue actions and statutory readiness.",
      },
      {
        id: "reports",
        label: "Reports and reviews",
        short_label: "Reports",
        icon: "file-text",
        description:
          "Provider reports, summaries and quality outputs.",
      },
      {
        id: "policies",
        label: "Policies and guidance",
        short_label: "Policies",
        icon: "folder",
        description:
          "Policy library, review dates and practice standards across services.",
      },
      {
        id: "documents",
        label: "Documents",
        short_label: "Documents",
        icon: "folder",
        description:
          "Inspection evidence, reports and provider-level supporting documents.",
      },
    ],
  },
  {
    id: "quality_workforce",
    title: "Workforce oversight",
    items: [
      {
        id: "staff-profile",
        label: "Staff profiles",
        short_label: "Staff",
        icon: "users-round",
        description:
          "Cross-home workforce profiles, file readiness and workforce overview.",
      },
      {
        id: "onboarding",
        label: "Recruitment and onboarding",
        short_label: "Onboarding",
        icon: "clipboard-check",
        description:
          "Recruitment checks, induction progress and probation themes.",
      },
      {
        id: "supervision",
        label: "Supervision and development",
        short_label: "Supervision",
        icon: "badge-check",
        description:
          "Supervision completion, development themes and workforce support.",
      },
      {
        id: "training-centre",
        label: "Training and compliance",
        short_label: "Training",
        icon: "graduation-cap",
        description:
          "Training completion, mandatory learning and workforce risks.",
      },
      {
        id: "team",
        label: "Team and staffing",
        short_label: "Team",
        icon: "users-round",
        description:
          "Team structure, staffing capacity, vacancies and deployment themes.",
      },
      {
        id: "rota",
        label: "Rota and cover",
        short_label: "Rota",
        icon: "calendar",
        description:
          "Shift coverage, agency usage, absence patterns and operational gaps.",
      },
      {
        id: "notifications",
        label: "Alerts and notifications",
        short_label: "Alerts",
        icon: "messages-square",
        description:
          "Cross-home reminders, escalations and live actions.",
      },
      {
        id: "communication",
        label: "Communication log",
        short_label: "Comms",
        icon: "messages-square",
        description:
          "Communication trails relevant to quality, staffing and oversight.",
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
]);

export const QUICK_ACTION_MAP = Object.freeze(
  Object.fromEntries(QUICK_ACTIONS.map((action) => [action.id, action]))
);

export const SECTION_DEFAULT_ACTION = Object.freeze({
  workspace: "daily_note",
  overview: "daily_note",
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
  "ofsted-readiness": "task",
  policies: "policy_review",

  "provider-overview": "task",
  "quality-audits": "task",
  reg44: "task",
  reg45: "task",
  "inspection-readiness": "task",
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

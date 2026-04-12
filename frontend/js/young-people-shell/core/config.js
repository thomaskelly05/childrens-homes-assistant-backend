export const NAV_SECTIONS = [
  {
    id: "workspace",
    label: "Workspace",
    icon: "home",
  },
  {
    id: "overview",
    label: "Overview",
    icon: "layout-dashboard",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "user",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: "list-ordered",
  },
  {
    id: "handover",
    label: "Handover",
    icon: "repeat",
  },
  {
    id: "health",
    label: "Health",
    icon: "heart-pulse",
  },
  {
    id: "education",
    label: "Education",
    icon: "graduation-cap",
  },
  {
    id: "family",
    label: "Family",
    icon: "users",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: "calendar",
  },
  {
    id: "readiness",
    label: "Readiness",
    icon: "shield-check",
  },
  {
    id: "manager",
    label: "Manager review",
    icon: "clipboard-check",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "file-text",
  },
];

export const QUICK_ACTIONS = [
  {
    id: "daily_note",
    label: "Daily note",
    record_type: "daily_note",
    section_hint: "workspace",
  },
  {
    id: "incident",
    label: "Important event",
    record_type: "incident",
    section_hint: "timeline",
  },
  {
    id: "support_plan",
    label: "Support plan",
    record_type: "support_plan",
    section_hint: "workspace",
  },
  {
    id: "risk",
    label: "Risk assessment",
    record_type: "risk",
    section_hint: "manager",
  },
  {
    id: "health_record",
    label: "Health record",
    record_type: "health_record",
    section_hint: "health",
  },
  {
    id: "education_record",
    label: "Education record",
    record_type: "education_record",
    section_hint: "education",
  },
  {
    id: "family_contact",
    label: "Family contact",
    record_type: "family_contact",
    section_hint: "family",
  },
  {
    id: "keywork",
    label: "Keywork",
    record_type: "keywork",
    section_hint: "workspace",
  },
  {
    id: "appointment",
    label: "Appointment",
    record_type: "appointment",
    section_hint: "calendar",
  },
  {
    id: "achievement_record",
    label: "Achievement",
    record_type: "achievement_record",
    section_hint: "education",
  },
  {
    id: "safeguarding_record",
    label: "Safeguarding",
    record_type: "safeguarding_record",
    section_hint: "manager",
  },
  {
    id: "missing_episode",
    label: "Missing episode",
    record_type: "missing_episode",
    section_hint: "timeline",
  },
  {
    id: "task",
    label: "Task",
    record_type: "task",
    section_hint: "readiness",
  },
];

export const SECTION_DEFAULT_ACTION = {
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
};

export const PROFILE_ACTIONS = [
  {
    id: "profile_identity",
    label: "Identity profile",
    record_type: "profile_identity",
  },
  {
    id: "profile_communication",
    label: "Communication profile",
    record_type: "profile_communication",
  },
  {
    id: "profile_education",
    label: "Education profile",
    record_type: "profile_education",
  },
  {
    id: "profile_health",
    label: "Health profile",
    record_type: "profile_health",
  },
  {
    id: "profile_legal",
    label: "Legal status",
    record_type: "profile_legal",
  },
  {
    id: "profile_formulation",
    label: "Formulation",
    record_type: "profile_formulation",
  },
];
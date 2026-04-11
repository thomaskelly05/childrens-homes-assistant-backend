export const VIEW_CONFIG = {
  overview: {
    title: "Overview",
    subtitle: "What matters today",
  },
  profile: {
    title: "About me",
    subtitle: "Who this young person is, what matters to them, and what helps",
  },
  daily_notes: {
    title: "Daily notes",
    subtitle: "Day-to-day lived experience, care, connection and progress",
  },
  incidents: {
    title: "Important events",
    subtitle: "Significant moments, responses, repair and learning",
  },
  plans: {
    title: "Support plans",
    subtitle: "What helps, what to notice, and how adults can respond well",
  },
  health: {
    title: "Health and wellbeing",
    subtitle: "Health needs, appointments, medication and wellbeing information",
  },
  education: {
    title: "Education and learning",
    subtitle: "School, attendance, progress and learning support",
  },
  family: {
    title: "Family and relationships",
    subtitle: "Important relationships, contact and family life",
  },
  appointments: {
    title: "Appointments",
    subtitle: "Upcoming appointments, support needed and follow-up",
  },
  keywork: {
    title: "Keywork",
    subtitle: "Direct work, reflection, goals and voice",
  },
  timeline: {
    title: "Timeline",
    subtitle: "A clear chronology of what has happened over time",
  },
  handover: {
    title: "Handover",
    subtitle: "What the next adult needs to know",
  },
  reports: {
    title: "Reports",
    subtitle: "Drafts, summaries and outputs",
  },
  compliance: {
    title: "Readiness",
    subtitle: "Checks, due items and what needs action",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Important dates, appointments and key events",
  },
  manager: {
    title: "Manager overview",
    subtitle: "Oversight, sign-off, themes and actions",
  },
};

export const DEFAULT_VIEW = "overview";

export const RECORD_CONFIG = {
  daily_note: {
    label: "Daily note",
    createUrl: (id) => `/young-people/${id}/daily-notes`,
    detailUrl: (id) => `/young-people/daily-notes/${id}`,
    updateUrl: (id) => `/young-people/daily-notes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
    approveUrl: (id) => `/young-people/daily-notes/${id}/approve`,
    returnUrl: (id) => `/young-people/daily-notes/${id}/return`,
    archiveUrl: (id) => `/young-people/daily-notes/${id}/archive`,
  },
  incident: {
    label: "Important event",
    createUrl: (id) => `/young-people/${id}/incidents`,
    detailUrl: (id) => `/young-people/incidents/${id}`,
    updateUrl: (id) => `/young-people/incidents/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/incidents/${id}/submit`,
    approveUrl: (id) => `/young-people/incidents/${id}/approve`,
    returnUrl: (id) => `/young-people/incidents/${id}/return`,
    archiveUrl: (id) => `/young-people/incidents/${id}/archive`,
  },
  support_plan: {
    label: "Support plan",
    createUrl: (id) => `/young-people/${id}/plans`,
    detailUrl: (id) => `/young-people/plans/${id}`,
    updateUrl: (id) => `/young-people/plans/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
    approveUrl: (id) => `/young-people/plans/${id}/approve`,
    returnUrl: (id) => `/young-people/plans/${id}/return`,
    archiveUrl: (id) => `/young-people/plans/${id}/archive`,
  },
  appointment: {
    label: "Appointment",
    createUrl: (id) => `/young-people/${id}/appointments`,
    detailUrl: (id) => `/young-people/appointments/${id}`,
    updateUrl: (id) => `/young-people/appointments/${id}`,
    updateMethod: "PATCH",
    approveUrl: (id) => `/young-people/appointments/${id}/complete`,
    returnUrl: (id) => `/young-people/appointments/${id}/cancel`,
  },
};

export const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { key: "overview", label: "Overview", icon: "🏠" },
      { key: "profile", label: "About me", icon: "🙂" },
      { key: "timeline", label: "Timeline", icon: "🕒" },
      { key: "handover", label: "Handover", icon: "🔄" },
    ],
  },
  {
    title: "Day to day",
    items: [
      { key: "daily_notes", label: "Daily notes", icon: "📝" },
      { key: "incidents", label: "Important events", icon: "⚠️" },
      { key: "plans", label: "Support plans", icon: "🧩" },
      { key: "appointments", label: "Appointments", icon: "📅" },
      { key: "keywork", label: "Keywork", icon: "💬" },
    ],
  },
  {
    title: "Wellbeing",
    items: [
      { key: "health", label: "Health", icon: "💚" },
      { key: "education", label: "Education", icon: "📘" },
      { key: "family", label: "Family", icon: "👨‍👩‍👧" },
      { key: "calendar", label: "Calendar", icon: "🗓️" },
    ],
  },
  {
    title: "Leadership",
    items: [
      { key: "reports", label: "Reports", icon: "📄" },
      { key: "compliance", label: "Readiness", icon: "✅" },
      { key: "manager", label: "Manager view", icon: "🧠" },
    ],
  },
];

export const MOBILE_TABS = [
  { key: "overview", label: "Home", icon: "🏠" },
  { key: "timeline", label: "Timeline", icon: "🕒" },
  { key: "daily_notes", label: "Notes", icon: "📝" },
  { key: "plans", label: "Plans", icon: "🧩" },
  { key: "assistant", label: "AI", icon: "✨" },
];

export const ASSISTANT_PROMPTS_BY_VIEW = {
  overview: [
    "Give me a short handover for this young person.",
    "What matters most right now?",
  ],
  profile: [
    "Summarise who this young person is and what helps most.",
    "Pull out strengths, needs and important themes.",
  ],
  daily_notes: [
    "Summarise the most recent daily notes.",
    "What themes are showing in day-to-day care?",
  ],
  incidents: [
    "Summarise the recent incidents.",
    "What patterns are showing in significant events?",
  ],
  plans: [
    "Summarise current support plans.",
    "What should adults understand and do consistently?",
  ],
  health: [
    "Summarise health and wellbeing updates.",
    "What follow-up is needed around health?",
  ],
  education: [
    "Summarise education progress and current needs.",
    "What matters most in learning right now?",
  ],
  family: [
    "Summarise important family and relationship updates.",
    "What should adults hold in mind around family time?",
  ],
  appointments: [
    "Summarise upcoming appointments and support needed.",
    "What preparation is needed before the next appointment?",
  ],
  keywork: [
    "Summarise recent keywork themes.",
    "What is the young person telling us through direct work?",
  ],
  timeline: [
    "Give me a clear chronology summary.",
    "What are the most important events over time?",
  ],
  handover: [
    "Give me a short handover for this young person.",
    "What does the next shift most need to know?",
  ],
  reports: [
    "Summarise the main report themes.",
    "What should a manager notice first?",
  ],
  compliance: [
    "What checks or actions need attention?",
    "Summarise readiness and due items.",
  ],
  calendar: [
    "Summarise upcoming key dates and appointments.",
    "What needs preparing for this week?",
  ],
  manager: [
    "What needs manager review right now?",
    "What is overdue or waiting for sign-off?",
  },
};

export function getViewConfig(view) {
  return VIEW_CONFIG[view] || VIEW_CONFIG[DEFAULT_VIEW];
}

export function getAssistantPromptsForView(view) {
  return ASSISTANT_PROMPTS_BY_VIEW[view] || ASSISTANT_PROMPTS_BY_VIEW[DEFAULT_VIEW] || [];
}

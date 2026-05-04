export const RECORD_LIFECYCLE_STATES = Object.freeze({
  draft: {
    label: "Draft",
    next: ["submitted"],
    dashboardBucket: "drafts",
    requiresManager: false,
  },
  submitted: {
    label: "Submitted",
    next: ["in_review"],
    dashboardBucket: "approvals",
    requiresManager: true,
  },
  in_review: {
    label: "Manager review",
    next: ["approved", "requires_action"],
    dashboardBucket: "approvals",
    requiresManager: true,
  },
  requires_action: {
    label: "Requires action",
    next: ["follow_up", "closed"],
    dashboardBucket: "actions",
    requiresManager: true,
  },
  follow_up: {
    label: "Follow-up",
    next: ["quality_sign_off", "requires_action"],
    dashboardBucket: "actions",
    requiresManager: true,
  },
  quality_sign_off: {
    label: "Quality sign-off",
    next: ["evidence_bank"],
    dashboardBucket: "quality",
    requiresManager: true,
  },
  evidence_bank: {
    label: "Evidence bank",
    next: ["closed"],
    dashboardBucket: "evidence",
    requiresManager: false,
  },
  closed: {
    label: "Closed",
    next: [],
    dashboardBucket: "closed",
    requiresManager: false,
  },
});

export const ACTION_TYPES = Object.freeze({
  manager_review: { label: "Manager review", priority: "medium" },
  safeguarding_follow_up: { label: "Safeguarding follow-up", priority: "high" },
  reg40_decision: { label: "Reg 40 decision", priority: "high" },
  risk_update: { label: "Risk assessment update", priority: "high" },
  care_plan_update: { label: "Care plan update", priority: "medium" },
  medication_follow_up: { label: "Medication follow-up", priority: "high" },
  education_follow_up: { label: "Education follow-up", priority: "medium" },
  family_contact_follow_up: { label: "Family contact follow-up", priority: "medium" },
  reg44_action: { label: "Reg 44 action", priority: "medium" },
  reg45_action: { label: "Reg 45 action", priority: "medium" },
  sccif_evidence_gap: { label: "SCCIF evidence gap", priority: "medium" },
  child_voice_follow_up: { label: "Child voice follow-up", priority: "medium" },
});

export const SCCIF_AREAS = Object.freeze({
  experiences_progress: "Children's experiences and progress",
  help_protection: "Help and protection",
  leadership_management: "Leadership and management",
});

export const QUALITY_STANDARDS_AREAS = Object.freeze({
  quality_purpose: "Quality and purpose of care",
  views_wishes: "Children's views, wishes and feelings",
  education: "Education",
  enjoyment_achievement: "Enjoyment and achievement",
  health_wellbeing: "Health and wellbeing",
  positive_relationships: "Positive relationships",
  protection: "Protection of children",
  leadership_management: "Leadership and management",
  care_planning: "Care planning",
});

export const RECORD_EVIDENCE_MAP = Object.freeze({
  daily_note: {
    sccif: ["experiences_progress"],
    quality: ["quality_purpose", "views_wishes", "enjoyment_achievement"],
    defaultActions: ["manager_review"],
  },
  health_record: {
    sccif: ["experiences_progress", "help_protection"],
    quality: ["health_wellbeing"],
    defaultActions: ["manager_review"],
  },
  medication_record: {
    sccif: ["help_protection"],
    quality: ["health_wellbeing", "protection"],
    defaultActions: ["manager_review", "medication_follow_up"],
  },
  education_record: {
    sccif: ["experiences_progress"],
    quality: ["education", "enjoyment_achievement"],
    defaultActions: ["manager_review", "education_follow_up"],
  },
  family_record: {
    sccif: ["experiences_progress", "help_protection"],
    quality: ["positive_relationships", "views_wishes"],
    defaultActions: ["manager_review", "family_contact_follow_up"],
  },
  incident: {
    sccif: ["help_protection", "leadership_management"],
    quality: ["protection", "leadership_management", "care_planning"],
    defaultActions: ["manager_review", "risk_update", "care_plan_update"],
    conditionalActions: ["safeguarding_follow_up", "reg40_decision"],
  },
  missing_episode: {
    sccif: ["help_protection", "leadership_management"],
    quality: ["protection", "care_planning"],
    defaultActions: ["manager_review", "risk_update", "safeguarding_follow_up"],
  },
  child_voice: {
    sccif: ["experiences_progress"],
    quality: ["views_wishes", "quality_purpose"],
    defaultActions: ["child_voice_follow_up"],
  },
  reg44: {
    sccif: ["leadership_management"],
    quality: ["leadership_management"],
    defaultActions: ["reg44_action"],
  },
  reg45: {
    sccif: ["leadership_management"],
    quality: ["leadership_management"],
    defaultActions: ["reg45_action"],
  },
});

export function normaliseLifecycleState(value = "draft") {
  const key = String(value || "draft").trim().toLowerCase();
  return RECORD_LIFECYCLE_STATES[key] ? key : "draft";
}

export function lifecycleLabel(value = "draft") {
  return RECORD_LIFECYCLE_STATES[normaliseLifecycleState(value)].label;
}

export function canTransition(from, to) {
  const current = RECORD_LIFECYCLE_STATES[normaliseLifecycleState(from)];
  return current.next.includes(normaliseLifecycleState(to));
}

export function evidenceForRecordType(recordType = "daily_note") {
  return RECORD_EVIDENCE_MAP[recordType] || RECORD_EVIDENCE_MAP.daily_note;
}

export function actionDefinition(actionType = "manager_review") {
  return ACTION_TYPES[actionType] || ACTION_TYPES.manager_review;
}

window.IndiCareWorkflowContract = Object.freeze({
  RECORD_LIFECYCLE_STATES,
  ACTION_TYPES,
  SCCIF_AREAS,
  QUALITY_STANDARDS_AREAS,
  RECORD_EVIDENCE_MAP,
  normaliseLifecycleState,
  lifecycleLabel,
  canTransition,
  evidenceForRecordType,
  actionDefinition,
});

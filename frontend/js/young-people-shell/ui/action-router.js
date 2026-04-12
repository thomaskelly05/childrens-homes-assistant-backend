import { state } from "../state.js";
import { openComposerFor } from "./composer.js";

function ensureYoungPersonSelected() {
  return Boolean(state.youngPersonId);
}

function resolveRecordType(value = "") {
  const type = String(value || "").trim().toLowerCase();

  const aliases = {
    risk_assessment: "risk",
    risk_assessments: "risk",
    family_contact_record: "family_contact",
    family_contact_records: "family_contact",
    keywork_session: "keywork",
    keywork_sessions: "keywork",
    achievement: "achievement_record",
    achievement_records: "achievement_record",
    safeguarding: "safeguarding_record",
    safeguarding_records: "safeguarding_record",
    missing: "missing_episode",
    missing_episodes: "missing_episode",
    health: "health_record",
    health_records: "health_record",
    education: "education_record",
    education_records: "education_record",
    appointment_record: "appointment",
    appointments: "appointment",
    task_record: "task",
    tasks: "task",
    profile_identity: "profile_identity",
    profile_communication: "profile_communication",
    profile_education: "profile_education",
    profile_health: "profile_health",
    profile_legal: "profile_legal",
    profile_formulation: "profile_formulation",
  };

  return aliases[type] || type;
}

function normaliseActionKey(value = "") {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  const legacy = {
    new_daily_note: "daily_note",
    new_incident: "incident",
    new_support_plan: "support_plan",
    new_risk: "risk",
    new_health_record: "health_record",
    new_education_record: "education_record",
    new_family_contact: "family_contact",
    new_keywork: "keywork",
    new_appointment: "appointment",
    new_task: "task",
    edit_profile_identity: "profile_identity",
    edit_profile_communication: "profile_communication",
    edit_profile_education: "profile_education",
    edit_profile_health: "profile_health",
    edit_profile_legal: "profile_legal",
    edit_profile_formulation: "profile_formulation",
    assistant_handover: "daily_note",
    assistant_priorities: "task",
    assistant_chronology: "incident",
    assistant_plans: "support_plan",
  };

  return legacy[key] || key;
}

function buildDraftFromSuggestion(suggestion = {}, resolvedType = "") {
  const metadata = suggestion.metadata || {};

  const draft = {
    young_person_id:
      suggestion.young_person_id ||
      metadata.young_person_id ||
      state.youngPersonId ||
      null,

    ...(suggestion.prefill || {}),
    ...(suggestion.draft || {}),
    ...(suggestion.payload || {}),

    title:
      suggestion.prefill?.title ||
      suggestion.draft?.title ||
      suggestion.payload?.title ||
      suggestion.title ||
      "",

    source_record_type:
      suggestion.source_record_type ||
      metadata.source_record_type ||
      "",

    source_record_id:
      suggestion.source_record_id ||
      metadata.source_record_id ||
      null,

    suggestion_id: suggestion.id || null,
    suggestion_priority: suggestion.priority || metadata.priority || "",
    suggestion_reason:
      suggestion.description ||
      suggestion.reason ||
      suggestion.summary ||
      "",
    suggestion_record_type: resolvedType,
    suggestion_metadata: metadata,
  };

  return draft;
}

function safeOpen(recordType, mode = "create", item = null) {
  const resolvedType = resolveRecordType(recordType);

  if (!ensureYoungPersonSelected()) return false;
  if (!resolvedType) return false;

  openComposerFor(resolvedType, mode, item);
  return true;
}

const QUICK_ACTIONS = {
  daily_note: {
    id: "daily_note",
    label: "Daily note",
    record_type: "daily_note",
    run: () => safeOpen("daily_note"),
  },
  incident: {
    id: "incident",
    label: "Important event",
    record_type: "incident",
    run: () => safeOpen("incident"),
  },
  support_plan: {
    id: "support_plan",
    label: "Support plan",
    record_type: "support_plan",
    run: () => safeOpen("support_plan"),
  },
  risk: {
    id: "risk",
    label: "Risk assessment",
    record_type: "risk",
    run: () => safeOpen("risk"),
  },
  health_record: {
    id: "health_record",
    label: "Health record",
    record_type: "health_record",
    run: () => safeOpen("health_record"),
  },
  education_record: {
    id: "education_record",
    label: "Education record",
    record_type: "education_record",
    run: () => safeOpen("education_record"),
  },
  family_contact: {
    id: "family_contact",
    label: "Family contact",
    record_type: "family_contact",
    run: () => safeOpen("family_contact"),
  },
  keywork: {
    id: "keywork",
    label: "Keywork",
    record_type: "keywork",
    run: () => safeOpen("keywork"),
  },
  appointment: {
    id: "appointment",
    label: "Appointment",
    record_type: "appointment",
    run: () => safeOpen("appointment"),
  },
  achievement_record: {
    id: "achievement_record",
    label: "Achievement",
    record_type: "achievement_record",
    run: () => safeOpen("achievement_record"),
  },
  safeguarding_record: {
    id: "safeguarding_record",
    label: "Safeguarding",
    record_type: "safeguarding_record",
    run: () => safeOpen("safeguarding_record"),
  },
  missing_episode: {
    id: "missing_episode",
    label: "Missing episode",
    record_type: "missing_episode",
    run: () => safeOpen("missing_episode"),
  },
  task: {
    id: "task",
    label: "Task",
    record_type: "task",
    run: () => safeOpen("task"),
  },
  profile_identity: {
    id: "profile_identity",
    label: "Identity profile",
    record_type: "profile_identity",
    run: () => safeOpen("profile_identity"),
  },
  profile_communication: {
    id: "profile_communication",
    label: "Communication profile",
    record_type: "profile_communication",
    run: () => safeOpen("profile_communication"),
  },
  profile_education: {
    id: "profile_education",
    label: "Education profile",
    record_type: "profile_education",
    run: () => safeOpen("profile_education"),
  },
  profile_health: {
    id: "profile_health",
    label: "Health profile",
    record_type: "profile_health",
    run: () => safeOpen("profile_health"),
  },
  profile_legal: {
    id: "profile_legal",
    label: "Legal status",
    record_type: "profile_legal",
    run: () => safeOpen("profile_legal"),
  },
  profile_formulation: {
    id: "profile_formulation",
    label: "Formulation",
    record_type: "profile_formulation",
    run: () => safeOpen("profile_formulation"),
  },
};

const SECTION_DEFAULTS = {
  overview: "daily_note",
  workspace: "daily_note",
  timeline: "incident",
  handover: "daily_note",
  reports: "task",
  health: "health_record",
  education: "education_record",
  family: "family_contact",
  calendar: "appointment",
  readiness: "task",
  manager: "task",
  profile: "profile_identity",
};

export function getActionForQuickButton(key, context = {}) {
  const resolvedKey = normaliseActionKey(key);

  if (QUICK_ACTIONS[resolvedKey]) {
    return QUICK_ACTIONS[resolvedKey];
  }

  const section =
    context.section ||
    state.currentSection ||
    state.activeSection ||
    "workspace";

  const fallbackKey = SECTION_DEFAULTS[section] || "daily_note";
  return QUICK_ACTIONS[fallbackKey];
}

export function runSuggestionAction(suggestion = {}) {
  const type = resolveRecordType(
    suggestion.action_type ||
      suggestion.record_type ||
      suggestion.create_record_type ||
      suggestion.target_record_type
  );

  if (!type || !QUICK_ACTIONS[type]) return false;
  if (!ensureYoungPersonSelected()) return false;

  const draft = buildDraftFromSuggestion(suggestion, type);

  openComposerFor(type, "create", draft);
  return true;
}

function getActionFromButton(button) {
  const actionKey =
    button.dataset.quickAction ||
    button.dataset.actionRouter ||
    "";

  return getActionForQuickButton(actionKey, {
    section:
      button.dataset.section ||
      state.currentSection ||
      state.activeSection ||
      "workspace",
  });
}

export function bindActionRouter({
  onMissingYoungPerson,
  quickButtonSelector = "[data-quick-action], [data-action-router]",
  suggestionButtonSelector = "[data-suggestion-action]",
} = {}) {
  document.addEventListener("click", (event) => {
    const quickButton = event.target.closest(quickButtonSelector);
    if (quickButton) {
      if (!ensureYoungPersonSelected()) {
        onMissingYoungPerson?.();
        return;
      }

      const action = getActionFromButton(quickButton);
      action?.run?.();
      return;
    }

    const suggestionButton = event.target.closest(suggestionButtonSelector);
    if (suggestionButton) {
      if (!ensureYoungPersonSelected()) {
        onMissingYoungPerson?.();
        return;
      }

      const type = resolveRecordType(
        suggestionButton.dataset.recordType ||
          suggestionButton.dataset.suggestionAction ||
          ""
      );

      if (!type) return;
      safeOpen(type);
    }
  });
}
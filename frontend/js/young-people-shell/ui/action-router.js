import { state } from "../state.js";
import { openComposerFor } from "./composer.js";

function ensureYoungPersonSelected() {
  return Boolean(state.youngPersonId);
}

function safeOpen(recordType, mode = "create", item = null) {
  if (!ensureYoungPersonSelected()) return false;
  openComposerFor(recordType, mode, item);
  return true;
}

const QUICK_ACTIONS = {
  daily_note: {
    id: "daily_note",
    label: "Daily note",
    run: () => safeOpen("daily_note"),
  },
  incident: {
    id: "incident",
    label: "Important event",
    run: () => safeOpen("incident"),
  },
  support_plan: {
    id: "support_plan",
    label: "Support plan",
    run: () => safeOpen("support_plan"),
  },
  risk: {
    id: "risk",
    label: "Risk assessment",
    run: () => safeOpen("risk"),
  },
  health_record: {
    id: "health_record",
    label: "Health record",
    run: () => safeOpen("health_record"),
  },
  education_record: {
    id: "education_record",
    label: "Education record",
    run: () => safeOpen("education_record"),
  },
  family_contact: {
    id: "family_contact",
    label: "Family contact",
    run: () => safeOpen("family_contact"),
  },
  keywork: {
    id: "keywork",
    label: "Keywork",
    run: () => safeOpen("keywork"),
  },
  appointment: {
    id: "appointment",
    label: "Appointment",
    run: () => safeOpen("appointment"),
  },
  achievement_record: {
    id: "achievement_record",
    label: "Achievement",
    run: () => safeOpen("achievement_record"),
  },
  safeguarding_record: {
    id: "safeguarding_record",
    label: "Safeguarding",
    run: () => safeOpen("safeguarding_record"),
  },
  missing_episode: {
    id: "missing_episode",
    label: "Missing episode",
    run: () => safeOpen("missing_episode"),
  },
  task: {
    id: "task",
    label: "Task",
    run: () => safeOpen("task"),
  },
  profile_identity: {
    id: "profile_identity",
    label: "Identity profile",
    run: () => safeOpen("profile_identity"),
  },
  profile_communication: {
    id: "profile_communication",
    label: "Communication profile",
    run: () => safeOpen("profile_communication"),
  },
  profile_education: {
    id: "profile_education",
    label: "Education profile",
    run: () => safeOpen("profile_education"),
  },
  profile_health: {
    id: "profile_health",
    label: "Health profile",
    run: () => safeOpen("profile_health"),
  },
  profile_legal: {
    id: "profile_legal",
    label: "Legal status",
    run: () => safeOpen("profile_legal"),
  },
  profile_formulation: {
    id: "profile_formulation",
    label: "Formulation",
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
  if (QUICK_ACTIONS[key]) {
    return QUICK_ACTIONS[key];
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
  const type =
    suggestion.action_type ||
    suggestion.record_type ||
    suggestion.create_record_type ||
    suggestion.target_record_type;

  if (!type || !QUICK_ACTIONS[type]) return false;

  const draft = {
    ...(suggestion.prefill || {}),
    ...(suggestion.draft || {}),
    ...(suggestion.payload || {}),
    title: suggestion.title || suggestion.prefill?.title || "",
    source_record_type:
      suggestion.source_record_type ||
      suggestion.metadata?.source_record_type ||
      "",
    source_record_id:
      suggestion.source_record_id ||
      suggestion.metadata?.source_record_id ||
      null,
  };

  return safeOpen(type, "create", draft);
}

export function bindActionRouter({
  onMissingYoungPerson,
  quickButtonSelector = "[data-quick-action]",
  suggestionButtonSelector = "[data-suggestion-action]",
} = {}) {
  document.querySelectorAll(quickButtonSelector).forEach((button) => {
    button.addEventListener("click", () => {
      if (!ensureYoungPersonSelected()) {
        onMissingYoungPerson?.();
        return;
      }

      const actionKey = button.dataset.quickAction;
      const action = getActionForQuickButton(actionKey, {
        section:
          button.dataset.section ||
          state.currentSection ||
          state.activeSection ||
          "workspace",
      });

      action?.run?.();
    });
  });

  document.querySelectorAll(suggestionButtonSelector).forEach((button) => {
    button.addEventListener("click", () => {
      if (!ensureYoungPersonSelected()) {
        onMissingYoungPerson?.();
        return;
      }

      const type =
        button.dataset.recordType ||
        button.dataset.suggestionAction ||
        "";

      if (!type) return;
      safeOpen(type);
    });
  });
}
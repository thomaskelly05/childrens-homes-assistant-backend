import { state } from "../state.js";
import { openComposerFor } from "./composer.js";
import {
  QUICK_ACTIONS as CONFIG_QUICK_ACTIONS,
  SECTION_DEFAULT_ACTION,
  SCOPE_SECTIONS,
} from "../core/config.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function ensureScopeContext() {
  const scope = getCurrentScope();

  if (scope === "child") {
    return Boolean(state.youngPersonId);
  }

  return true;
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
    achievements: "achievement_record",
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

    upload: "document",
    upload_document: "document",
    documents: "document",

    message: "communication",
    professional_message: "communication",
    communication_log: "communication",
    communications: "communication",

    therapy_note: "therapy",
    therapeutic_service: "therapy",

    supervision_record: "supervision",
    supervision_notes: "supervision",

    team_note: "team",
    staffing_note: "team",

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
    new_document: "document",
    new_upload: "document",
    new_professional_message: "communication",
    new_communication: "communication",
    new_therapy: "therapy",
    new_team: "team",
    new_supervision: "supervision",

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

function isActionAllowedInScope(actionId, scope = getCurrentScope()) {
  const allowedSections = SCOPE_SECTIONS?.[scope] || [];

  if (scope === "child") {
    return true;
  }

  const scopeSpecificMap = {
    daily_note: false,
    incident: false,
    support_plan: false,
    risk: true,
    health_record: false,
    education_record: false,
    family_contact: false,
    keywork: false,
    appointment: allowedSections.includes("calendar"),
    achievement_record: false,
    safeguarding_record: true,
    missing_episode: false,
    task: true,
    document: allowedSections.includes("documents"),
    communication: allowedSections.includes("communication"),
    therapy: allowedSections.includes("therapy"),
    team: allowedSections.includes("team"),
    supervision: allowedSections.includes("supervision"),
    profile_identity: false,
    profile_communication: false,
    profile_education: false,
    profile_health: false,
    profile_legal: false,
    profile_formulation: false,
  };

  return scopeSpecificMap[actionId] ?? true;
}

function buildDraftFromSuggestion(suggestion = {}, resolvedType = "") {
  const metadata = suggestion.metadata || {};
  const scope = getCurrentScope();

  const draft = {
    young_person_id:
      scope === "child"
        ? suggestion.young_person_id ||
          metadata.young_person_id ||
          state.youngPersonId ||
          null
        : null,

    home_id:
      suggestion.home_id ||
      metadata.home_id ||
      state.homeId ||
      null,

    scope,
    current_scope: scope,

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
  const scope = getCurrentScope();

  if (!resolvedType) return false;
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(resolvedType, scope)) return false;

  const payload =
    item && typeof item === "object"
      ? {
          ...item,
          current_scope: scope,
          home_id: item.home_id ?? state.homeId ?? null,
          young_person_id:
            scope === "child"
              ? item.young_person_id ?? state.youngPersonId ?? null
              : null,
        }
      : item;

  openComposerFor(resolvedType, mode, payload);
  return true;
}

function buildQuickActionMap() {
  const actions = {};

  (CONFIG_QUICK_ACTIONS || []).forEach((action) => {
    const resolvedType = resolveRecordType(action.record_type || action.id);

    actions[action.id] = {
      id: action.id,
      label: action.label || action.id,
      short_label: action.short_label || action.label || action.id,
      record_type: resolvedType,
      section_hint: action.section_hint || "",
      description: action.description || "",
      run: () => safeOpen(resolvedType),
    };
  });

  if (!actions.document) {
    actions.document = {
      id: "document",
      label: "Upload document",
      short_label: "Upload",
      record_type: "document",
      section_hint: "documents",
      description: "Upload and organise documents.",
      run: () => safeOpen("document"),
    };
  }

  if (!actions.communication) {
    actions.communication = {
      id: "communication",
      label: "Log communication",
      short_label: "Communication",
      record_type: "communication",
      section_hint: "communication",
      description: "Log professional communication.",
      run: () => safeOpen("communication"),
    };
  }

  if (!actions.therapy) {
    actions.therapy = {
      id: "therapy",
      label: "Add therapy note",
      short_label: "Therapy",
      record_type: "therapy",
      section_hint: "therapy",
      description: "Record therapeutic work and recommendations.",
      run: () => safeOpen("therapy"),
    };
  }

  if (!actions.team) {
    actions.team = {
      id: "team",
      label: "Add team item",
      short_label: "Team",
      record_type: "team",
      section_hint: "team",
      description: "Record staffing or team updates.",
      run: () => safeOpen("team"),
    };
  }

  if (!actions.supervision) {
    actions.supervision = {
      id: "supervision",
      label: "Add supervision note",
      short_label: "Supervision",
      record_type: "supervision",
      section_hint: "supervision",
      description: "Record supervision and development notes.",
      run: () => safeOpen("supervision"),
    };
  }

  return actions;
}

const ACTIONS = buildQuickActionMap();

function getFallbackActionKey(section = "", scope = getCurrentScope()) {
  const sectionKey = String(section || "").trim();
  const configured = SECTION_DEFAULT_ACTION?.[sectionKey];

  if (configured && isActionAllowedInScope(configured, scope)) {
    return configured;
  }

  if (scope === "home") return "task";
  if (scope === "quality") return "task";
  return "daily_note";
}

export function getActionForQuickButton(key, context = {}) {
  const scope = context.scope || getCurrentScope();
  const resolvedKey = normaliseActionKey(key);

  if (ACTIONS[resolvedKey] && isActionAllowedInScope(ACTIONS[resolvedKey].record_type, scope)) {
    return ACTIONS[resolvedKey];
  }

  const resolvedType = resolveRecordType(resolvedKey);
  if (ACTIONS[resolvedType] && isActionAllowedInScope(ACTIONS[resolvedType].record_type, scope)) {
    return ACTIONS[resolvedType];
  }

  const section =
    context.section ||
    state.currentSection ||
    state.activeSection ||
    "workspace";

  const fallbackKey = getFallbackActionKey(section, scope);
  return ACTIONS[fallbackKey];
}

export function runSuggestionAction(suggestion = {}) {
  const scope = getCurrentScope();

  const type = resolveRecordType(
    suggestion.action_type ||
      suggestion.record_type ||
      suggestion.create_record_type ||
      suggestion.target_record_type
  );

  if (!type) return false;
  if (!ACTIONS[type] && !isActionAllowedInScope(type, scope)) return false;
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(type, scope)) return false;

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
    scope: getCurrentScope(),
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
      if (!ensureScopeContext()) {
        onMissingYoungPerson?.();
        return;
      }

      const action = getActionFromButton(quickButton);
      action?.run?.();
      return;
    }

    const suggestionButton = event.target.closest(suggestionButtonSelector);
    if (suggestionButton) {
      if (!ensureScopeContext()) {
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

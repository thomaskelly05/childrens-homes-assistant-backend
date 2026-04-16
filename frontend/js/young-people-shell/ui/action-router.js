import { state } from "../state.js";
import { openComposerFor } from "./composer.js";
import {
  QUICK_ACTIONS as CONFIG_QUICK_ACTIONS,
  PROFILE_ACTIONS as CONFIG_PROFILE_ACTIONS,
  SECTION_DEFAULT_ACTION,
  SCOPE_SECTIONS,
  getSafeSectionForScope,
} from "../core/config.js";

let actionRouterBound = false;

function cleanText(value) {
  return String(value || "").trim();
}

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function getCurrentHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function hasChildContext() {
  return Boolean(state.youngPersonId);
}

function hasHomeContext() {
  return Boolean(getCurrentHomeId());
}

function ensureScopeContext() {
  return getCurrentScope() === "child" ? hasChildContext() : hasHomeContext();
}

function getAllowedSectionsForScope(scope = getCurrentScope()) {
  return SCOPE_SECTIONS?.[scope] || [];
}

function resolveRecordType(value = "") {
  const type = normaliseToken(value);

  const aliases = {
    risk_assessment: "risk",
    risk_assessments: "risk",
    risk_record: "risk",

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
    statutory_document: "document",
    statutory_documents: "document",

    message: "communication",
    professional_message: "communication",
    communication_log: "communication",
    communications: "communication",

    therapy_note: "therapy",
    therapeutic_service: "therapy",
    therapeutic_services: "therapy",

    supervision_record: "supervision",
    supervision_notes: "supervision",
    supervisions: "supervision",

    team_note: "team",
    staffing_note: "team",
    staffing: "team",

    manager_action: "manager_action",
    manager_actions: "manager_action",

    report: "ai_generated_report",
    summary: "ai_generated_report",
    chronology: "ai_generated_report",
    review: "ai_generated_report",

    profile_identity: "profile_identity",
    profile_communication: "profile_communication",
    profile_education: "profile_education",
    profile_health: "profile_health",
    profile_legal: "profile_legal",
    profile_formulation: "profile_formulation",
  };

  return aliases[type] || type;
}

function resolveActionType(value = "") {
  const type = normaliseToken(value);

  const aliases = {
    create: "create_record",
    create_record: "create_record",
    create_task: "create_task",

    review: "review_record",
    review_record: "review_record",
    review_incidents: "review_incidents",
    review_compliance: "review_compliance",
    review_documents: "review_documents",

    improve: "improve_record",
    improve_record: "improve_record",

    escalate: "escalate",

    open: "open_section",
    open_section: "open_section",
    open_record: "open_record",

    draft_summary: "draft_summary",
    draft_handover: "draft_handover",
    draft_note: "draft_note",
  };

  return aliases[type] || "create_record";
}

function normaliseActionKey(value = "") {
  const key = normaliseToken(value);

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
    new_manager_action: "manager_action",

    edit_profile_identity: "profile_identity",
    edit_profile_communication: "profile_communication",
    edit_profile_education: "profile_education",
    edit_profile_health: "profile_health",
    edit_profile_legal: "profile_legal",
    edit_profile_formulation: "profile_formulation",

    assistant_handover: "task",
    assistant_priorities: "task",
    assistant_chronology: "ai_generated_report",
    assistant_plans: "support_plan",
    assistant_summary: "ai_generated_report",
    assistant_review: "ai_generated_report",
    chronology: "ai_generated_report",
    summary: "ai_generated_report",
    report: "ai_generated_report",
  };

  return legacy[key] || key;
}

function isActionAllowedInScope(actionId, scope = getCurrentScope()) {
  const allowedSections = getAllowedSectionsForScope(scope);

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
    safeguarding_record: scope === "quality",
    missing_episode: false,
    task: true,
    manager_action: true,
    document: allowedSections.includes("documents"),
    communication: allowedSections.includes("communication"),
    therapy: allowedSections.includes("therapy"),
    team: allowedSections.includes("team"),
    supervision: allowedSections.includes("supervision"),
    ai_generated_report: allowedSections.includes("reports"),

    profile_identity: false,
    profile_communication: false,
    profile_education: false,
    profile_health: false,
    profile_legal: false,
    profile_formulation: false,
  };

  return scopeSpecificMap[actionId] ?? true;
}

function inferSectionForRecordType(recordType = "") {
  const map = {
    daily_note: "workspace",
    incident: "timeline",
    support_plan: "workspace",
    risk: "manager",
    health_record: "health",
    education_record: "education",
    family_contact: "family",
    keywork: "workspace",
    appointment: "calendar",
    achievement_record: "education",
    safeguarding_record: "manager",
    missing_episode: "timeline",
    task: "readiness",
    manager_action: "manager",
    document: "documents",
    communication: "communication",
    therapy: "therapy",
    team: "team",
    supervision: "supervision",
    ai_generated_report: "reports",

    profile_identity: "profile",
    profile_communication: "profile",
    profile_education: "profile",
    profile_health: "profile",
    profile_legal: "profile",
    profile_formulation: "profile",
  };

  return map[recordType] || "";
}

function inferRecordTypeFromActionType(actionType = "", suggestion = {}) {
  const resolvedAction = resolveActionType(actionType);

  if (resolvedAction === "draft_summary" || resolvedAction === "draft_note") {
    return resolveRecordType(
      suggestion.record_type ||
        suggestion.target_record_type ||
        "ai_generated_report"
    );
  }

  if (resolvedAction === "draft_handover") {
    return "task";
  }

  if (resolvedAction === "review_incidents") {
    return "incident";
  }

  if (resolvedAction === "review_compliance") {
    return "task";
  }

  if (resolvedAction === "review_documents") {
    return "document";
  }

  if (resolvedAction === "escalate") {
    return "manager_action";
  }

  return resolveRecordType(
    suggestion.record_type ||
      suggestion.target_record_type ||
      suggestion.source_record_type ||
      ""
  );
}

function buildDraftFromSuggestion(suggestion = {}, resolvedType = "") {
  const metadata = suggestion.metadata || {};
  const scope = getCurrentScope();

  return {
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
      getCurrentHomeId() ||
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
    suggestion_action_type: resolveActionType(suggestion.action_type),
    suggestion_metadata: metadata,
  };
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
          home_id: item.home_id ?? getCurrentHomeId() ?? null,
          young_person_id:
            scope === "child"
              ? item.young_person_id ?? state.youngPersonId ?? null
              : null,
        }
      : item;

  openComposerFor(resolvedType, mode, payload);
  return true;
}

async function navigateToSection(section = "") {
  const scope = getCurrentScope();
  const safeSection = getSafeSectionForScope(section, scope);

  try {
    const navModule = await import("./nav.js");
    if (typeof navModule.loadSection === "function") {
      await navModule.loadSection(safeSection);
      return true;
    }
  } catch (error) {
    console.error("[action-router] failed to navigate section", error);
  }

  return false;
}

function buildQuickActionMap() {
  const actions = {};

  [...(CONFIG_QUICK_ACTIONS || []), ...(CONFIG_PROFILE_ACTIONS || [])].forEach(
    (action) => {
      const resolvedType = resolveRecordType(action.record_type || action.id);

      actions[action.id] = {
        id: action.id,
        label: action.label || action.id,
        short_label: action.short_label || action.label || action.id,
        record_type: resolvedType,
        section_hint: action.section_hint || inferSectionForRecordType(resolvedType),
        description: action.description || "",
        run: () => safeOpen(resolvedType),
      };
    }
  );

  return actions;
}

const ACTIONS = buildQuickActionMap();

function getFallbackActionKey(section = "", scope = getCurrentScope()) {
  const sectionKey = cleanText(section);
  const configured = SECTION_DEFAULT_ACTION?.[sectionKey];

  if (configured && isActionAllowedInScope(configured, scope)) {
    return configured;
  }

  if (scope === "home" || scope === "quality") return "task";
  return "daily_note";
}

export function getActionForQuickButton(key, context = {}) {
  const scope = context.scope || getCurrentScope();
  const resolvedKey = normaliseActionKey(key);

  if (
    ACTIONS[resolvedKey] &&
    isActionAllowedInScope(ACTIONS[resolvedKey].record_type, scope)
  ) {
    return ACTIONS[resolvedKey];
  }

  const resolvedType = resolveRecordType(resolvedKey);
  if (
    ACTIONS[resolvedType] &&
    isActionAllowedInScope(ACTIONS[resolvedType].record_type, scope)
  ) {
    return ACTIONS[resolvedType];
  }

  const section = context.section || getCurrentSection();
  const fallbackKey = getFallbackActionKey(section, scope);
  return ACTIONS[fallbackKey] || null;
}

function runCreateSuggestion(suggestion = {}) {
  const scope = getCurrentScope();
  const type = resolveRecordType(
    suggestion.record_type ||
      suggestion.create_record_type ||
      suggestion.target_record_type
  );

  if (!type) return false;
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(type, scope)) return false;

  const draft = buildDraftFromSuggestion(suggestion, type);
  openComposerFor(type, "create", draft);
  return true;
}

function runTaskSuggestion(suggestion = {}) {
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope("task")) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      record_type: "task",
      prefill: {
        ...(suggestion.prefill || {}),
        title:
          suggestion.prefill?.title ||
          suggestion.title ||
          "Follow-up action",
      },
    },
    "task"
  );

  openComposerFor("task", "create", draft);
  return true;
}

function runReviewSuggestion(suggestion = {}) {
  const scope = getCurrentScope();
  const targetType = inferRecordTypeFromActionType(
    suggestion.action_type,
    suggestion
  );

  if (!targetType) return false;
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(targetType, scope)) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      prefill: {
        ...(suggestion.prefill || {}),
        title:
          suggestion.prefill?.title ||
          suggestion.title ||
          `Review: ${cleanText(suggestion.source_record_type || targetType)}`,
      },
    },
    targetType
  );

  openComposerFor(targetType, "create", draft);
  return true;
}

function runImproveSuggestion(suggestion = {}) {
  const scope = getCurrentScope();
  const targetType = resolveRecordType(
    suggestion.record_type ||
      suggestion.source_record_type ||
      suggestion.target_record_type
  );

  if (!targetType) return false;
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(targetType, scope)) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      prefill: {
        ...(suggestion.prefill || {}),
        improvement_prompt:
          suggestion.description ||
          suggestion.reason ||
          "Improve clarity, completeness and professional quality.",
      },
    },
    targetType
  );

  openComposerFor(targetType, "create", draft);
  return true;
}

function runEscalationSuggestion(suggestion = {}) {
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope("manager_action")) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      record_type: "manager_action",
      prefill: {
        ...(suggestion.prefill || {}),
        action_type: suggestion.prefill?.action_type || "escalation",
        note:
          suggestion.prefill?.note ||
          suggestion.description ||
          suggestion.reason ||
          suggestion.title ||
          "Escalation required",
      },
    },
    "manager_action"
  );

  openComposerFor("manager_action", "create", draft);
  return true;
}

async function runOpenSectionSuggestion(suggestion = {}) {
  const explicitSection = cleanText(
    suggestion.section ||
      suggestion.target_section ||
      suggestion.prefill?.section
  );

  const recordSection = inferSectionForRecordType(
    resolveRecordType(
      suggestion.record_type ||
        suggestion.target_record_type ||
        suggestion.source_record_type
    )
  );

  const targetSection = explicitSection || recordSection;
  if (!targetSection) return false;

  return navigateToSection(targetSection);
}

async function runOpenRecordSuggestion(suggestion = {}) {
  const targetSection =
    cleanText(suggestion.target_section) ||
    inferSectionForRecordType(
      resolveRecordType(
        suggestion.record_type ||
          suggestion.target_record_type ||
          suggestion.source_record_type
      )
    );

  if (!targetSection) return false;

  return navigateToSection(targetSection);
}

function runDraftSummarySuggestion(suggestion = {}) {
  const scope = getCurrentScope();
  const targetType = resolveRecordType(
    suggestion.record_type ||
      suggestion.target_record_type ||
      "ai_generated_report"
  );

  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(targetType, scope)) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      record_type: targetType,
      prefill: {
        ...(suggestion.prefill || {}),
        title: suggestion.prefill?.title || suggestion.title || "AI summary",
        summary_type: suggestion.prefill?.summary_type || "summary",
      },
    },
    targetType
  );

  openComposerFor(targetType, "create", draft);
  return true;
}

function runDraftHandoverSuggestion(suggestion = {}) {
  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope("task")) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      record_type: "task",
      prefill: {
        ...(suggestion.prefill || {}),
        title:
          suggestion.prefill?.title ||
          suggestion.title ||
          "Handover follow-up",
        task_type: suggestion.prefill?.task_type || "handover",
      },
    },
    "task"
  );

  openComposerFor("task", "create", draft);
  return true;
}

function runDraftNoteSuggestion(suggestion = {}) {
  const scope = getCurrentScope();
  const targetType = resolveRecordType(
    suggestion.record_type ||
      suggestion.target_record_type ||
      "manager_action"
  );

  if (!ensureScopeContext()) return false;
  if (!isActionAllowedInScope(targetType, scope)) return false;

  const draft = buildDraftFromSuggestion(
    {
      ...suggestion,
      record_type: targetType,
      prefill: {
        ...(suggestion.prefill || {}),
        title:
          suggestion.prefill?.title ||
          suggestion.title ||
          "AI drafted note",
      },
    },
    targetType
  );

  openComposerFor(targetType, "create", draft);
  return true;
}

export async function runSuggestionAction(suggestion = {}) {
  const actionType = resolveActionType(suggestion.action_type);

  if (actionType === "create_record") return runCreateSuggestion(suggestion);
  if (actionType === "create_task") return runTaskSuggestion(suggestion);

  if (
    actionType === "review_record" ||
    actionType === "review_incidents" ||
    actionType === "review_compliance" ||
    actionType === "review_documents"
  ) {
    return runReviewSuggestion(suggestion);
  }

  if (actionType === "improve_record") return runImproveSuggestion(suggestion);
  if (actionType === "escalate") return runEscalationSuggestion(suggestion);
  if (actionType === "open_section") return runOpenSectionSuggestion(suggestion);
  if (actionType === "open_record") return runOpenRecordSuggestion(suggestion);
  if (actionType === "draft_summary") return runDraftSummarySuggestion(suggestion);
  if (actionType === "draft_handover") return runDraftHandoverSuggestion(suggestion);
  if (actionType === "draft_note") return runDraftNoteSuggestion(suggestion);

  return runCreateSuggestion(suggestion);
}

function getActionFromButton(button) {
  const actionKey =
    button.dataset.quickAction || button.dataset.actionRouter || "";

  return getActionForQuickButton(actionKey, {
    section: button.dataset.section || getCurrentSection(),
    scope: getCurrentScope(),
  });
}

function buildSuggestionFromButton(button) {
  return {
    id: button.dataset.suggestionId || null,
    title: button.dataset.title || "",
    description: button.dataset.description || "",
    reason: button.dataset.reason || "",
    summary: button.dataset.summary || "",

    action_type:
      button.dataset.actionType ||
      button.dataset.suggestionActionType ||
      "create_record",

    record_type:
      button.dataset.recordType ||
      button.dataset.suggestionAction ||
      "",

    target_record_type: button.dataset.targetRecordType || "",
    target_section: button.dataset.targetSection || "",
    source_record_type: button.dataset.sourceRecordType || "",
    source_record_id: button.dataset.sourceRecordId || null,
    priority: button.dataset.priority || "",

    young_person_id: button.dataset.youngPersonId || state.youngPersonId || null,
    home_id: button.dataset.homeId || getCurrentHomeId() || null,

    prefill: {},
    metadata: {
      source_record_type: button.dataset.sourceRecordType || "",
      source_record_id: button.dataset.sourceRecordId || null,
      young_person_id: button.dataset.youngPersonId || state.youngPersonId || null,
      home_id: button.dataset.homeId || getCurrentHomeId() || null,
      target_section: button.dataset.targetSection || "",
    },
  };
}

export function bindActionRouter({
  onMissingYoungPerson,
  onMissingHomeContext,
  onSectionChange,
  quickButtonSelector = "[data-quick-action], [data-action-router]",
  suggestionButtonSelector = "[data-suggestion-action]",
} = {}) {
  if (actionRouterBound) return;
  actionRouterBound = true;

  document.addEventListener("click", async (event) => {
    const quickButton = event.target.closest(quickButtonSelector);
    if (quickButton) {
      if (!ensureScopeContext()) {
        if (getCurrentScope() === "child") {
          onMissingYoungPerson?.();
        } else {
          onMissingHomeContext?.();
        }
        return;
      }

      const action = getActionFromButton(quickButton);
      action?.run?.();
      return;
    }

    const suggestionButton = event.target.closest(suggestionButtonSelector);
    if (!suggestionButton) return;

    if (!ensureScopeContext()) {
      if (getCurrentScope() === "child") {
        onMissingYoungPerson?.();
      } else {
        onMissingHomeContext?.();
      }
      return;
    }

    const suggestion = buildSuggestionFromButton(suggestionButton);
    const actionType = resolveActionType(suggestion.action_type);
    const didRun = await runSuggestionAction(suggestion);

    if (didRun && actionType === "open_section") {
      onSectionChange?.(getCurrentSection());
    }
  });
}

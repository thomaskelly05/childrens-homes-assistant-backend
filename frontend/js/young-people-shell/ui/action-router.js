import {
  state,
  getCurrentReadinessHomeId,
  resolveAccessibleHomeId,
} from "../state.js";
import { openComposerFor } from "./composer.js";
import {
  QUICK_ACTIONS as CONFIG_QUICK_ACTIONS,
  PROFILE_ACTIONS as CONFIG_PROFILE_ACTIONS,
  SECTION_DEFAULT_ACTION,
  SCOPE_SECTIONS,
  getSafeSectionForScope,
} from "../core/config.js";
import { apiSend } from "../core/api.js";

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
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getCurrentHomeId() {
  return resolveAccessibleHomeId?.() || state.homeId || state.selectedHomeId || null;
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.currentYoungPersonId ||
    state.selectedYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    state.currentYoungPerson?.id ||
    state.currentYoungPerson?.young_person_id ||
    document.getElementById("app")?.dataset?.youngPersonId ||
    document.getElementById("youngPersonSelect")?.value ||
    null
  );
}

function hasChildContext() {
  return Boolean(getYoungPersonId());
}

function hasHomeContext() {
  return Boolean(getCurrentHomeId() || getCurrentReadinessHomeId?.());
}

function ensureScopeContext(recordType = "") {
  const scope = getCurrentScope();

  if (scope === "child") return hasChildContext();

  const childOnly = new Set([
    "daily_note",
    "incident",
    "support_plan",
    "risk",
    "health_record",
    "education_record",
    "family_contact",
    "keywork",
    "appointment",
    "safeguarding_record",
    "missing_episode",
    "medication_record",
    "handover_record",
    "therapy",
    "profile_identity",
    "profile_communication",
    "profile_education",
    "profile_health",
    "profile_legal",
    "profile_formulation",
  ]);

  if (childOnly.has(recordType)) return hasChildContext();

  return hasHomeContext();
}

function getAllowedSectionsForScope(scope = getCurrentScope()) {
  return SCOPE_SECTIONS?.[scope] || [];
}

function resolveRecordType(value = "") {
  const type = normaliseToken(value);

  const aliases = {
    daily: "daily_note",
    daily_note: "daily_note",
    daily_notes: "daily_note",
    new_daily_note: "daily_note",

    incident: "incident",
    incidents: "incident",
    event: "incident",
    important_event: "incident",
    new_incident: "incident",

    plan: "support_plan",
    support_plan: "support_plan",
    care_plan: "support_plan",
    new_support_plan: "support_plan",

    risk: "risk",
    risk_assessment: "risk",
    risk_assessments: "risk",
    new_risk: "risk",

    health: "health_record",
    health_record: "health_record",
    new_health_record: "health_record",

    education: "education_record",
    education_record: "education_record",
    new_education_record: "education_record",

    family: "family_contact",
    family_contact: "family_contact",
    new_family_contact: "family_contact",

    keywork: "keywork",
    keywork_session: "keywork",
    new_keywork: "keywork",

    appointment: "appointment",
    appointments: "appointment",
    new_appointment: "appointment",

    task: "task",
    tasks: "task",
    action: "task",
    actions: "task",
    new_task: "task",

    document: "document",
    documents: "document",
    upload: "document",
    upload_document: "document",
    new_document: "document",

    communication: "communication",
    communications: "communication",
    professional_message: "communication",
    new_communication: "communication",
    new_professional_message: "communication",

    safeguarding: "safeguarding_record",
    safeguarding_record: "safeguarding_record",
    new_safeguarding: "safeguarding_record",
    new_safeguarding_record: "safeguarding_record",

    missing: "missing_episode",
    missing_episode: "missing_episode",
    missing_from_care: "missing_episode",
    new_missing_episode: "missing_episode",
    new_missing_from_care: "missing_episode",

    medication: "medication_record",
    medication_record: "medication_record",
    medication_records: "medication_record",
    new_medication_record: "medication_record",

    handover: "handover_record",
    handover_record: "handover_record",
    new_handover: "handover_record",
    new_handover_record: "handover_record",

    therapy: "therapy",
    therapy_note: "therapy",
    new_therapy: "therapy",

    team: "team",
    staffing: "team",
    new_team: "team",

    supervision: "supervision",
    supervisions: "supervision",
    new_supervision: "supervision",

    manager_action: "manager_action",
    staff_task: "staff_task",
    policy_review: "policy_review",
    health_safety_check: "health_safety_check",

    report: "ai_generated_report",
    summary: "ai_generated_report",
    ai_generated_report: "ai_generated_report",

    profile_identity: "profile_identity",
    profile_communication: "profile_communication",
    profile_education: "profile_education",
    profile_health: "profile_health",
    profile_legal: "profile_legal",
    profile_formulation: "profile_formulation",

    inspection_refresh: "inspection_refresh",
    inspection_sync: "inspection_sync",
    sync_actions: "inspection_sync",
  };

  return aliases[type] || type;
}

function normaliseActionKey(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  const underscored = normaliseToken(raw);

  const aliases = {
    "daily-note": "daily_note",
    daily_note: "daily_note",
    new_daily_note: "daily_note",

    incident: "incident",
    new_incident: "incident",

    risk: "risk",
    new_risk: "risk",

    plan: "support_plan",
    support_plan: "support_plan",
    care_plan: "support_plan",

    health: "health_record",
    health_record: "health_record",
    "new-health-record": "health_record",
    new_health_record: "health_record",

    education: "education_record",
    education_record: "education_record",
    "new-education-record": "education_record",
    new_education_record: "education_record",

    family: "family_contact",
    family_contact: "family_contact",
    "new-family-contact": "family_contact",
    new_family_contact: "family_contact",

    keywork: "keywork",
    "new-keywork": "keywork",
    new_keywork: "keywork",

    appointment: "appointment",
    "new-appointment": "appointment",
    new_appointment: "appointment",

    task: "task",
    action: "task",
    "new-task": "task",
    new_task: "task",

    document: "document",
    "upload-document": "document",
    upload_document: "document",
    "new-document": "document",
    new_document: "document",

    safeguarding: "safeguarding_record",
    safeguarding_record: "safeguarding_record",
    "new-safeguarding": "safeguarding_record",
    new_safeguarding: "safeguarding_record",

    missing: "missing_episode",
    missing_episode: "missing_episode",
    "new-missing-episode": "missing_episode",
    new_missing_episode: "missing_episode",

    medication: "medication_record",
    medication_record: "medication_record",
    "new-medication-record": "medication_record",
    new_medication_record: "medication_record",

    handover: "handover_record",
    handover_record: "handover_record",
    "new-handover-record": "handover_record",
    new_handover_record: "handover_record",

    therapy: "therapy",
    "new-therapy": "therapy",
    new_therapy: "therapy",

    team: "team",
    "new-team": "team",
    new_team: "team",

    supervision: "supervision",
    "new-supervision": "supervision",
    new_supervision: "supervision",

    inspection_refresh: "inspection_refresh",
    inspection_sync: "inspection_sync",
    sync_actions: "inspection_sync",
  };

  return aliases[raw] || aliases[underscored] || resolveRecordType(underscored);
}

function isActionAllowedInScope(recordType, scope = getCurrentScope()) {
  if (!recordType) return false;
  if (scope === "child") return true;

  const allowedSections = getAllowedSectionsForScope(scope);

  const homeSafe = new Set([
    "task",
    "staff_task",
    "manager_action",
    "team",
    "supervision",
    "document",
    "communication",
    "ai_generated_report",
    "policy_review",
    "health_safety_check",
    "handover_record",
  ]);

  if (homeSafe.has(recordType)) return true;
  if (recordType === "appointment") return allowedSections.includes("calendar");
  if (recordType === "risk") return allowedSections.includes("manager");
  if (recordType === "inspection_refresh") return true;
  if (recordType === "inspection_sync") return true;

  return false;
}

function inferSectionForRecordType(recordType = "", scope = getCurrentScope()) {
  const map = {
    daily_note: "workspace",
    incident: "timeline",
    support_plan: "admission",
    risk: "risk",
    health_record: "health",
    education_record: "education",
    family_contact: "family",
    keywork: "daily-life",
    appointment: "calendar",
    safeguarding_record: "safeguarding",
    missing_episode: "missing-from-care",
    medication_record: "health",
    handover_record: "workspace",
    therapy: "therapy",
    task: "actions",
    staff_task: "team",
    manager_action: "manager",
    document: "documents",
    communication: "communication",
    team: "team",
    supervision: "supervision",
    ai_generated_report: "reports",
    policy_review: "policies",
    health_safety_check: "health-safety",
    inspection_refresh: scope === "quality" ? "inspection-readiness" : "inspection-readiness",
    inspection_sync: scope === "quality" ? "inspection-readiness" : "inspection-readiness",
    profile_identity: "profile",
    profile_communication: "profile",
    profile_education: "profile",
    profile_health: "profile",
    profile_legal: "profile",
    profile_formulation: "profile",
  };

  return map[recordType] || "";
}

function buildDraftPayload(item = {}, recordType = "") {
  const scope = getCurrentScope();

  return {
    ...(item || {}),
    current_scope: scope,
    scope,
    young_person_id:
      scope === "child" || hasChildContext()
        ? item.young_person_id || getYoungPersonId()
        : null,
    home_id:
      item.home_id ||
      getCurrentHomeId() ||
      getCurrentReadinessHomeId?.() ||
      state.selectedYoungPerson?.home_id ||
      null,
    source_section: getCurrentSection(),
    record_type: recordType,
  };
}

function safeOpen(recordType, mode = "create", item = {}) {
  const resolvedType = resolveRecordType(recordType);
  const scope = getCurrentScope();

  console.log("[action-router] safeOpen", {
    recordType,
    resolvedType,
    mode,
    scope,
    youngPersonId: getYoungPersonId(),
    homeId: getCurrentHomeId(),
  });

  if (!resolvedType) return false;

  if (!ensureScopeContext(resolvedType)) {
    console.warn("[action-router] missing scope context", { resolvedType, scope });
    return false;
  }

  if (!isActionAllowedInScope(resolvedType, scope)) {
    console.warn("[action-router] action not allowed in scope", {
      resolvedType,
      scope,
    });
    return false;
  }

  try {
    openComposerFor(resolvedType, mode, buildDraftPayload(item, resolvedType));

    console.log("[action-router] composer opened", {
      resolvedType,
      panelClass: document.getElementById("recordComposerPage")?.className,
      fieldsLength: document.getElementById("recordComposerFields")?.innerHTML?.length,
    });

    return true;
  } catch (error) {
    console.error("[action-router] openComposerFor failed", error);
    return false;
  }
}

async function navigateToSection(section = "") {
  const scope = getCurrentScope();
  const safeSection = getSafeSectionForScope
    ? getSafeSectionForScope(section, scope)
    : section;

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

async function postInspectionAction(homeId, actionType) {
  const safeHomeId = Number(homeId);
  if (!Number.isFinite(safeHomeId) || safeHomeId <= 0) return false;

  const route =
    actionType === "refresh"
      ? `/inspection/ui/homes/${safeHomeId}/refresh-cycle`
      : `/inspection/ui/homes/${safeHomeId}/sync-tasks`;

  await apiSend(route, "POST", {}, { skipCache: true });
  return true;
}

function buildQuickActionMap() {
  const actions = {};

  [...(CONFIG_QUICK_ACTIONS || []), ...(CONFIG_PROFILE_ACTIONS || [])].forEach(
    (action) => {
      const recordType = resolveRecordType(action.record_type || action.id);
      const id = normaliseActionKey(action.id);

      actions[id] = {
        id,
        label: action.label || action.id,
        record_type: recordType,
        section_hint: action.section_hint || inferSectionForRecordType(recordType),
        run: () => safeOpen(recordType),
      };
    }
  );

  const core = {
    daily_note: "daily_note",
    incident: "incident",
    support_plan: "support_plan",
    risk: "risk",
    health_record: "health_record",
    education_record: "education_record",
    family_contact: "family_contact",
    keywork: "keywork",
    appointment: "appointment",
    medication_record: "medication_record",
    handover_record: "handover_record",
    task: "task",
    document: "document",
    communication: "communication",
    safeguarding_record: "safeguarding_record",
    missing_episode: "missing_episode",
    therapy: "therapy",
    team: "team",
    supervision: "supervision",
    manager_action: "manager_action",
    staff_task: "staff_task",
    policy_review: "policy_review",
    health_safety_check: "health_safety_check",
    ai_generated_report: "ai_generated_report",
    profile_identity: "profile_identity",
    profile_communication: "profile_communication",
    profile_education: "profile_education",
    profile_health: "profile_health",
    profile_legal: "profile_legal",
    profile_formulation: "profile_formulation",
  };

  Object.entries(core).forEach(([key, recordType]) => {
    actions[key] = {
      id: key,
      label: key.replaceAll("_", " "),
      record_type: recordType,
      section_hint: inferSectionForRecordType(recordType),
      run: () => safeOpen(recordType),
    };
  });

  actions.inspection_refresh = {
    id: "inspection_refresh",
    label: "Refresh inspection cycle",
    record_type: "inspection_refresh",
    run: async () => {
      const homeId = getCurrentReadinessHomeId?.() || getCurrentHomeId();
      if (!homeId) return false;
      await postInspectionAction(homeId, "refresh");
      await navigateToSection(inferSectionForRecordType("inspection_refresh"));
      return true;
    },
  };

  actions.inspection_sync = {
    id: "inspection_sync",
    label: "Sync inspection actions",
    record_type: "inspection_sync",
    run: async () => {
      const homeId = getCurrentReadinessHomeId?.() || getCurrentHomeId();
      if (!homeId) return false;
      await postInspectionAction(homeId, "sync");
      await navigateToSection(inferSectionForRecordType("inspection_sync"));
      return true;
    },
  };

  return actions;
}

const ACTIONS = buildQuickActionMap();

function getFallbackActionKey(section = "", scope = getCurrentScope()) {
  const configured = SECTION_DEFAULT_ACTION?.[cleanText(section)];

  if (configured) {
    const safeConfigured = normaliseActionKey(configured);
    const action = ACTIONS[safeConfigured];

    if (action && isActionAllowedInScope(action.record_type, scope)) {
      return safeConfigured;
    }
  }

  if (scope !== "child") return "task";
  return "daily_note";
}

export function getActionForQuickButton(key, context = {}) {
  const scope = context.scope || getCurrentScope();
  const resolvedKey = normaliseActionKey(key);
  const resolvedType = resolveRecordType(resolvedKey);

  const directAction = ACTIONS[resolvedKey] || ACTIONS[resolvedType];

  if (directAction && isActionAllowedInScope(directAction.record_type, scope)) {
    return directAction;
  }

  const fallbackKey = getFallbackActionKey(
    context.section || getCurrentSection(),
    scope
  );

  return ACTIONS[fallbackKey] || null;
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
      button.dataset.targetRecordType ||
      button.dataset.suggestionAction ||
      "",
    target_section: button.dataset.targetSection || "",
    source_record_type: button.dataset.sourceRecordType || "",
    source_record_id: button.dataset.sourceRecordId || null,
    priority: button.dataset.priority || "",
    young_person_id: button.dataset.youngPersonId || getYoungPersonId(),
    home_id:
      button.dataset.homeId ||
      getCurrentReadinessHomeId?.() ||
      getCurrentHomeId(),
    prefill: {},
    metadata: {},
  };
}

export async function runSuggestionAction(suggestion = {}) {
  const type = resolveRecordType(
    suggestion.record_type ||
      suggestion.target_record_type ||
      suggestion.source_record_type ||
      "task"
  );

  const actionType = normaliseToken(suggestion.action_type);

  if (actionType === "open_section") {
    return navigateToSection(suggestion.target_section || inferSectionForRecordType(type));
  }

  if (actionType === "inspection_refresh") {
    const homeId =
      suggestion.home_id || getCurrentReadinessHomeId?.() || getCurrentHomeId();
    if (!homeId) return false;
    await postInspectionAction(homeId, "refresh");
    return navigateToSection(inferSectionForRecordType("inspection_refresh"));
  }

  if (actionType === "inspection_sync") {
    const homeId =
      suggestion.home_id || getCurrentReadinessHomeId?.() || getCurrentHomeId();
    if (!homeId) return false;
    await postInspectionAction(homeId, "sync");
    return navigateToSection(inferSectionForRecordType("inspection_sync"));
  }

  return safeOpen(type, "create", {
    title: suggestion.title || "",
    summary: suggestion.summary || suggestion.description || suggestion.reason || "",
    suggestion_id: suggestion.id || null,
    source_record_type: suggestion.source_record_type || "",
    source_record_id: suggestion.source_record_id || null,
    priority: suggestion.priority || "",
    ...(suggestion.prefill || {}),
  });
}

function getActionKeyFromButton(button) {
  return (
    button.dataset.action ||
    button.dataset.actionRouter ||
    button.dataset.quickAction ||
    button.dataset.recordType ||
    ""
  );
}

function getActionFromButton(button) {
  return getActionForQuickButton(getActionKeyFromButton(button), {
    section: button.dataset.section || getCurrentSection(),
    scope: getCurrentScope(),
  });
}

function showMissingContext(callbacks = {}) {
  if (getCurrentScope() === "child") {
    callbacks.onMissingYoungPerson?.();
  } else {
    callbacks.onMissingHomeContext?.();
  }
}

export function bindActionRouter({
  onMissingYoungPerson,
  onMissingHomeContext,
  onSectionChange,
  onInspectionActionComplete,
  quickButtonSelector = "[data-action], [data-action-router], [data-quick-action], [data-record-type]",
  suggestionButtonSelector = "[data-suggestion-action]",
} = {}) {
  if (actionRouterBound) return;
  actionRouterBound = true;

  document.addEventListener(
    "click",
    async (event) => {
      if (event.target.closest("#recordComposerPage, #recordComposerForm")) {
        return;
      }

      const quickButton = event.target.closest(quickButtonSelector);

      if (quickButton) {
        const actionKey = getActionKeyFromButton(quickButton);
        const action = getActionFromButton(quickButton);

        console.log("[action-router] quick button clicked", {
          key: actionKey,
          normalisedKey: normaliseActionKey(actionKey),
          action,
        });

        if (!action) return;

        event.preventDefault();
        event.stopPropagation();

        if (!ensureScopeContext(action.record_type)) {
          showMissingContext({ onMissingYoungPerson, onMissingHomeContext });
          return;
        }

        const didRun = await action.run?.();

        if (!didRun) {
          showMissingContext({ onMissingYoungPerson, onMissingHomeContext });
          return;
        }

        if (action.id === "inspection_refresh" || action.id === "inspection_sync") {
          onInspectionActionComplete?.(action.id, didRun);
        }

        return;
      }

      const suggestionButton = event.target.closest(suggestionButtonSelector);
      if (!suggestionButton) return;

      event.preventDefault();
      event.stopPropagation();

      const suggestion = buildSuggestionFromButton(suggestionButton);
      const didRun = await runSuggestionAction(suggestion);

      if (didRun && normaliseToken(suggestion.action_type) === "open_section") {
        onSectionChange?.(getCurrentSection());
      }
    },
    true
  );
}

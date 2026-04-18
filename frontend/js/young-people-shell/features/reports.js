import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  renderRowList,
  renderRecordsTable,
  renderBadges,
  statusBadgeClass,
  renderSection,
  renderSummaryStat,
  renderEmptyState,
} from "./helpers.js";
import {
  evaluateRecordSuggestions,
  mergeSuggestionLists,
} from "../core/rules-client.js";
import {
  showSuggestionsPanel,
  hideSuggestionsPanel,
} from "./suggestions.js";

export {
  renderRowList,
  renderRecordsTable,
  renderBadges,
  statusBadgeClass,
  renderSection,
  renderSummaryStat,
  renderEmptyState,
} from "./helpers.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeScopedBase() {
  return "/homes";
}

function getChildScopedBase() {
  return "/young-people";
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function buildScopedDetailUrl(recordType, id) {
  const childBase = getChildScopedBase();
  const homeBase = getHomeScopedBase();
  const scope = getCurrentScope();

  const childRoutes = {
    daily_note: `${childBase}/daily-notes/${id}`,
    incident: `${childBase}/incidents/${id}`,
    support_plan: `${childBase}/plans/${id}`,
    risk: `${childBase}/risks/${id}`,
    appointment: `${childBase}/appointments/${id}`,
    health_record: `${childBase}/health-records/${id}`,
    education_record: `${childBase}/education-records/${id}`,
    family_contact: `${childBase}/family-contact-records/${id}`,
    keywork: `${childBase}/keywork/${id}`,
    report: `${childBase}/reports/${id}`,
    chronology_event: `${childBase}/chronology/${id}`,
    compliance_item: `${childBase}/compliance/${id}`,
    safeguarding_record: `${childBase}/safeguarding-records/${id}`,
    missing_episode: `${childBase}/missing-episodes/${id}`,
    task: `${childBase}/tasks/${id}`,
    achievement_record: `${childBase}/achievements/${id}`,
    medication_profile: `${childBase}/medication-profiles/${id}`,
    medication_record: `${childBase}/medication-records/${id}`,
    communication: `${childBase}/communications/${id}`,
    document: `${childBase}/documents/${id}`,
    wellbeing_check: `${childBase}/wellbeing-checks/${id}`,
    therapy: `${childBase}/therapy/${id}`,
    transition_plan: `${childBase}/transition-plans/${id}`,
    transition_action: `${childBase}/transition-actions/${id}`,
    contact: `${childBase}/contacts/${id}`,
    consent: `${childBase}/consents/${id}`,
    allowance: `${childBase}/allowances/${id}`,
    appointment_record: `${childBase}/appointments/${id}`,
    financial_transaction: `${childBase}/financial-transactions/${id}`,
    property_item: `${childBase}/property-inventory/${id}`,
    belongings: `${childBase}/belongings/${id}`,
    legal_status: `${childBase}/legal-status/${id}`,
    essential_document: `${childBase}/essential-documents/${id}`,
    therapy_case: `${childBase}/therapy-cases/${id}`,
    therapy_session_note: `${childBase}/therapy-session-notes/${id}`,
    formulation: `${childBase}/formulations/${id}`,
    all_about_me: `${childBase}/all-about-me/${id}`,
    identity_profile: `${childBase}/identity-profile/${id}`,
    communication_profile: `${childBase}/communication-profile/${id}`,
    education_profile: `${childBase}/education-profile/${id}`,
    health_profile: `${childBase}/health-profile/${id}`,
  };

  const homeRoutes = {
    risk: `${homeBase}/risks/${id}`,
    appointment: `${homeBase}/appointments/${id}`,
    task: `${homeBase}/tasks/${id}`,
    manager_action: `${homeBase}/manager-actions/${id}`,
    communication: `${homeBase}/communications/${id}`,
    document: `${homeBase}/documents/${id}`,
    therapy: `${homeBase}/therapy/${id}`,
    team: `${homeBase}/team/${id}`,
    supervision: `${homeBase}/supervisions/${id}`,
    compliance: `${homeBase}/compliance/${id}`,
    audit: `${homeBase}/audits/${id}`,
    report: `${homeBase}/reports/${id}`,
    notification: `${homeBase}/notifications/${id}`,
    notification_queue: `${homeBase}/notification-queue/${id}`,
    operational_notification: `${homeBase}/operational-notifications/${id}`,
    home_notification: `${homeBase}/home-notifications/${id}`,
    staff_profile: `${homeBase}/staff/${id}`,
    onboarding: `${homeBase}/onboarding/${id}`,
    training: `${homeBase}/training/${id}`,
    staff_document: `${homeBase}/staff-documents/${id}`,
    invoice: `${homeBase}/finance-invoices/${id}`,
    finance_item: `${homeBase}/finance/${id}`,
    budget: `${homeBase}/budgets/${id}`,
    allowance: `${homeBase}/allowances/${id}`,
    maintenance_job: `${homeBase}/maintenance-jobs/${id}`,
    environment_check: `${homeBase}/environment-checks/${id}`,
    visitor_log: `${homeBase}/visitor-log/${id}`,
    vehicle: `${homeBase}/vehicles/${id}`,
    vehicle_check: `${homeBase}/vehicle-checks/${id}`,
    vehicle_journey: `${homeBase}/vehicle-journeys/${id}`,
    inventory_item: `${homeBase}/inventory-items/${id}`,
    purchase_request: `${homeBase}/purchase-requests/${id}`,
    petty_cash_transaction: `${homeBase}/petty-cash-transactions/${id}`,
    monthly_review: `${homeBase}/monthly-reviews/${id}`,
    monthly_review_action: `${homeBase}/monthly-review-actions/${id}`,
    ai_generated_report: `${homeBase}/ai-generated-reports/${id}`,
    report_delivery_log: `${homeBase}/report-delivery-log/${id}`,
    report_fact_snapshot: `${homeBase}/report-fact-snapshots/${id}`,
    ai_meeting_note: `${homeBase}/ai-meeting-notes/${id}`,
    handover_record: `${homeBase}/handover-records/${id}`,
    inspection_pack_job: `${homeBase}/inspection-pack-jobs/${id}`,
    operations_log: `${homeBase}/home-operations-log/${id}`,
    operational_action: `${homeBase}/home-operational-actions/${id}`,
    shift_log: `${homeBase}/shift-logs/${id}`,
  };

  if (scope === "child") {
    return childRoutes[recordType] || null;
  }

  return homeRoutes[recordType] || childRoutes[recordType] || null;
}

function buildScopedWorkflowUrl(recordType, id, action) {
  const childBase = getChildScopedBase();
  const homeBase = getHomeScopedBase();
  const scope = getCurrentScope();

  const childActions = {
    daily_note: {
      submit: `${childBase}/daily-notes/${id}/submit`,
      approve: `${childBase}/daily-notes/${id}/approve`,
      return: `${childBase}/daily-notes/${id}/return`,
      archive: `${childBase}/daily-notes/${id}/archive`,
    },
    incident: {
      submit: `${childBase}/incidents/${id}/submit`,
      approve: `${childBase}/incidents/${id}/approve`,
      return: `${childBase}/incidents/${id}/return`,
      archive: `${childBase}/incidents/${id}/archive`,
    },
    support_plan: {
      submit: `${childBase}/plans/${id}/submit`,
      approve: `${childBase}/plans/${id}/approve`,
      return: `${childBase}/plans/${id}/return`,
      archive: `${childBase}/plans/${id}/archive`,
    },
    risk: {
      submit: `${childBase}/risks/${id}/submit`,
      approve: `${childBase}/risks/${id}/approve`,
      return: `${childBase}/risks/${id}/return`,
      archive: `${childBase}/risks/${id}/archive`,
    },
    appointment: {
      approve: `${childBase}/appointments/${id}/complete`,
      return: `${childBase}/appointments/${id}/cancel`,
    },
    keywork: {
      submit: `${childBase}/keywork/${id}/submit`,
      approve: `${childBase}/keywork/${id}/approve`,
      return: `${childBase}/keywork/${id}/return`,
      archive: `${childBase}/keywork/${id}/archive`,
    },
    safeguarding_record: {
      submit: `${childBase}/safeguarding-records/${id}/submit`,
      approve: `${childBase}/safeguarding-records/${id}/approve`,
      return: `${childBase}/safeguarding-records/${id}/return`,
      archive: `${childBase}/safeguarding-records/${id}/archive`,
    },
    missing_episode: {
      submit: `${childBase}/missing-episodes/${id}/submit`,
      approve: `${childBase}/missing-episodes/${id}/approve`,
      return: `${childBase}/missing-episodes/${id}/return`,
      archive: `${childBase}/missing-episodes/${id}/archive`,
    },
    monthly_review: {
      submit: `${childBase}/monthly-reviews/${id}/submit`,
      approve: `${childBase}/monthly-reviews/${id}/approve`,
      return: `${childBase}/monthly-reviews/${id}/return`,
      archive: `${childBase}/monthly-reviews/${id}/archive`,
    },
  };

  const homeActions = {
    risk: {
      submit: `${homeBase}/risks/${id}/submit`,
      approve: `${homeBase}/risks/${id}/approve`,
      return: `${homeBase}/risks/${id}/return`,
      archive: `${homeBase}/risks/${id}/archive`,
    },
    appointment: {
      approve: `${homeBase}/appointments/${id}/complete`,
      return: `${homeBase}/appointments/${id}/cancel`,
    },
    monthly_review: {
      submit: `${homeBase}/monthly-reviews/${id}/submit`,
      approve: `${homeBase}/monthly-reviews/${id}/approve`,
      return: `${homeBase}/monthly-reviews/${id}/return`,
      archive: `${homeBase}/monthly-reviews/${id}/archive`,
    },
    ai_meeting_note: {
      submit: `${homeBase}/ai-meeting-notes/${id}/submit`,
      approve: `${homeBase}/ai-meeting-notes/${id}/approve`,
      return: `${homeBase}/ai-meeting-notes/${id}/return`,
      archive: `${homeBase}/ai-meeting-notes/${id}/archive`,
    },
    handover_record: {
      submit: `${homeBase}/handover-records/${id}/submit`,
      approve: `${homeBase}/handover-records/${id}/approve`,
      return: `${homeBase}/handover-records/${id}/return`,
      archive: `${homeBase}/handover-records/${id}/archive`,
    },
  };

  const map =
    scope === "child"
      ? childActions[recordType]
      : homeActions[recordType] || childActions[recordType];

  return map?.[action] || null;
}

const RECORD_CONFIG = {
  daily_note: { label: "Daily note" },
  incident: { label: "Important event" },
  support_plan: { label: "Support plan" },
  risk: { label: "Risk assessment" },
  appointment: { label: "Appointment" },
  health_record: { label: "Health record" },
  education_record: { label: "Education record" },
  family_contact: { label: "Family contact" },
  keywork: { label: "Keywork session" },
  report: { label: "Report" },
  chronology_event: { label: "Chronology event" },
  compliance_item: { label: "Compliance item" },
  safeguarding_record: { label: "Safeguarding record" },
  missing_episode: { label: "Missing episode" },
  task: { label: "Task" },
  achievement_record: { label: "Achievement" },
  medication_profile: { label: "Medication profile" },
  medication_record: { label: "Medication record" },
  communication: { label: "Communication" },
  document: { label: "Document" },
  therapy: { label: "Therapy" },
  team: { label: "Team item" },
  supervision: { label: "Supervision" },
  compliance: { label: "Compliance" },
  audit: { label: "Audit" },
  manager_action: { label: "Manager action" },
  notification: { label: "Notification" },
  notification_queue: { label: "Queued notification" },
  operational_notification: { label: "Operational notification" },
  home_notification: { label: "Home notification" },
  staff_profile: { label: "Staff profile" },
  onboarding: { label: "Onboarding record" },
  training: { label: "Training record" },
  staff_document: { label: "Staff document" },
  invoice: { label: "Invoice" },
  finance_item: { label: "Finance item" },
  budget: { label: "Budget line" },
  allowance: { label: "Allowance" },
  maintenance_job: { label: "Maintenance job" },
  environment_check: { label: "Environment check" },
  visitor_log: { label: "Visitor log" },
  vehicle: { label: "Vehicle" },
  vehicle_check: { label: "Vehicle check" },
  vehicle_journey: { label: "Vehicle journey" },
  inventory_item: { label: "Inventory item" },
  purchase_request: { label: "Purchase request" },
  petty_cash_transaction: { label: "Petty cash transaction" },
  monthly_review: { label: "Monthly review" },
  monthly_review_action: { label: "Monthly review action" },
  ai_generated_report: { label: "AI generated report" },
  report_delivery_log: { label: "Report delivery" },
  report_fact_snapshot: { label: "Report snapshot" },
  ai_meeting_note: { label: "AI meeting note" },
  handover_record: { label: "Handover record" },
  inspection_pack_job: { label: "Inspection pack job" },
  operations_log: { label: "Operations log" },
  operational_action: { label: "Operational action" },
  shift_log: { label: "Shift log" },
  wellbeing_check: { label: "Wellbeing check" },
  transition_plan: { label: "Transition plan" },
  transition_action: { label: "Transition action" },
  contact: { label: "Contact" },
  consent: { label: "Consent" },
  appointment_record: { label: "Appointment" },
  financial_transaction: { label: "Financial transaction" },
  property_item: { label: "Property item" },
  belongings: { label: "Belongings" },
  legal_status: { label: "Legal status" },
  essential_document: { label: "Essential document" },
  therapy_case: { label: "Therapy case" },
  therapy_session_note: { label: "Therapy session note" },
  formulation: { label: "Formulation" },
  all_about_me: { label: "All about me" },
  identity_profile: { label: "Identity profile" },
  communication_profile: { label: "Communication profile" },
  education_profile: { label: "Education profile" },
  health_profile: { label: "Health profile" },
};

export function normaliseRecordType(item = {}) {
  const raw = String(
    item.record_type ||
      item.primary_record_type ||
      item.source_table ||
      item.event_type ||
      item.category ||
      item.type ||
      ""
  )
    .toLowerCase()
    .trim();

  if (raw === "plan" || raw === "support_plans") return "support_plan";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
  if (raw === "risk_assessment" || raw === "risk_assessments") return "risk";
  if (raw === "health_records") return "health_record";
  if (raw === "education_records") return "education_record";
  if (raw === "family_contact_records") return "family_contact";
  if (raw === "keywork_sessions") return "keywork";
  if (raw === "ai_generated_reports") return "ai_generated_report";
  if (raw === "chronology_events") return "chronology_event";
  if (raw === "compliance_items") return "compliance_item";
  if (raw === "young_person_appointments" || raw === "appointments") return "appointment";
  if (raw === "safeguarding_records") return "safeguarding_record";
  if (raw === "missing_episodes") return "missing_episode";
  if (raw === "tasks") return "task";
  if (raw === "achievement_records") return "achievement_record";
  if (raw === "medication_profiles") return "medication_profile";
  if (raw === "medication_records") return "medication_record";
  if (raw === "communications") return "communication";
  if (raw === "documents" || raw === "statutory_documents") return "document";
  if (raw === "therapy_records" || raw === "therapeutic_services" || raw === "therapy_cases" || raw === "therapy") return "therapy";
  if (raw === "team_items" || raw === "staff" || raw === "team") return "team";
  if (raw === "supervisions" || raw === "staff_supervisions" || raw === "staff_supervision_sessions") return "supervision";
  if (raw === "audits") return "audit";
  if (raw === "compliance") return "compliance";
  if (raw === "manager_actions") return "manager_action";
  if (raw === "notifications") return "notification";
  if (raw === "notification_queue") return "notification_queue";
  if (raw === "operational_notifications") return "operational_notification";
  if (raw === "home_notifications") return "home_notification";
  if (raw === "staff_profiles" || raw === "staff_profile") return "staff_profile";
  if (raw === "onboarding" || raw === "staff_onboarding_profiles" || raw === "staff_onboarding_cases") return "onboarding";
  if (raw === "training" || raw === "training_records" || raw === "staff_training_records" || raw === "staff_training_matrix") return "training";
  if (raw === "staff_documents") return "staff_document";
  if (raw === "finance" || raw === "financial_items") return "finance_item";
  if (raw === "finance_invoices" || raw === "invoices") return "invoice";
  if (raw === "budgets") return "budget";
  if (raw === "maintenance_jobs" || raw === "maintenance_requests") return "maintenance_job";
  if (raw === "environment_checks" || raw === "premises_checks" || raw === "safety_checks" || raw === "health_safety_checks") return "environment_check";
  if (raw === "visitor_log" || raw === "home_visitors_log" || raw === "home_visitors") return "visitor_log";
  if (raw === "vehicles" || raw === "home_vehicles") return "vehicle";
  if (raw === "vehicle_checks") return "vehicle_check";
  if (raw === "vehicle_journeys" || raw === "transport_journeys") return "vehicle_journey";
  if (raw === "inventory_items" || raw === "home_assets" || raw === "premises_assets") return "inventory_item";
  if (raw === "purchase_requests") return "purchase_request";
  if (raw === "petty_cash_transactions") return "petty_cash_transaction";
  if (raw === "monthly_reviews") return "monthly_review";
  if (raw === "monthly_review_actions") return "monthly_review_action";
  if (raw === "report_delivery_log") return "report_delivery_log";
  if (raw === "report_fact_snapshots") return "report_fact_snapshot";
  if (raw === "ai_meeting_notes") return "ai_meeting_note";
  if (raw === "handover_records") return "handover_record";
  if (raw === "inspection_pack_jobs") return "inspection_pack_job";
  if (raw === "home_operations_log") return "operations_log";
  if (raw === "home_operational_actions") return "operational_action";
  if (raw === "shift_logs" || raw === "home_shift_logs" || raw === "home_daily_logs") return "shift_log";
  if (raw === "wellbeing_checks") return "wellbeing_check";
  if (raw === "transition_plans") return "transition_plan";
  if (raw === "transition_actions" || raw === "transition_plan_actions") return "transition_action";
  if (raw === "young_person_contacts") return "contact";
  if (raw === "young_person_consents") return "consent";
  if (raw === "young_person_allowances" || raw === "allowance_payments") return "allowance";
  if (raw === "young_person_financial_transactions") return "financial_transaction";
  if (raw === "young_person_property_inventory") return "property_item";
  if (raw === "young_person_belongings") return "belongings";
  if (raw === "young_person_legal_status" || raw === "young_person_legal_statuses") return "legal_status";
  if (raw === "young_person_essential_documents") return "essential_document";
  if (raw === "therapy_session_notes") return "therapy_session_note";
  if (raw === "young_person_formulations") return "formulation";
  if (raw === "young_person_all_about_me") return "all_about_me";
  if (raw === "young_person_identity_profile") return "identity_profile";
  if (raw === "young_person_communication_profile") return "communication_profile";
  if (raw === "young_person_education_profile") return "education_profile";
  if (raw === "young_person_health_profile") return "health_profile";

  return raw;
}

export function getRecordId(item = {}) {
  return item.record_id || item.source_id || item.id || null;
}

export function getRecordUrl(item = {}) {
  const type = normaliseRecordType(item);
  const id = getRecordId(item);
  if (!id) return null;
  return buildScopedDetailUrl(type, id);
}

function buildSubtitle(type, item = {}, detail = {}) {
  const dateValue =
    item.event_datetime ||
    item.start_datetime ||
    item.contact_datetime ||
    item.session_date ||
    item.record_date ||
    item.recorded_at ||
    item.occurred_at ||
    item.audit_date ||
    item.review_date ||
    item.review_month ||
    item.handover_date ||
    item.completed_at ||
    item.delivered_at ||
    item.created_at ||
    detail.event_datetime ||
    detail.start_datetime ||
    detail.contact_datetime ||
    detail.session_date ||
    detail.record_date ||
    detail.note_date ||
    detail.incident_datetime ||
    detail.audit_date ||
    detail.review_date ||
    detail.review_month ||
    detail.handover_date ||
    detail.completed_at ||
    detail.delivered_at ||
    detail.created_at ||
    null;

  const status =
    item.workflow_status ||
    item.status ||
    item.approval_status ||
    item.delivery_status ||
    item.note_status ||
    detail.workflow_status ||
    detail.status ||
    detail.approval_status ||
    detail.delivery_status ||
    detail.note_status ||
    "";

  return [
    String(type || "record").replaceAll("_", " "),
    dateValue ? formatDate(dateValue) : "",
    status || "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function detailObjectFromResponse(data = {}) {
  if (!data || typeof data !== "object") return {};

  return (
    data.daily_note ||
    data.incident ||
    data.risk ||
    data.risk_assessment ||
    data.support_plan ||
    data.plan ||
    data.appointment ||
    data.young_person_appointment ||
    data.health_record ||
    data.education_record ||
    data.family_contact_record ||
    data.contact ||
    data.keywork ||
    data.keywork_session ||
    data.report ||
    data.chronology_event ||
    data.compliance_item ||
    data.safeguarding_record ||
    data.missing_episode ||
    data.task ||
    data.achievement_record ||
    data.medication_profile ||
    data.medication_record ||
    data.communication ||
    data.document ||
    data.therapy ||
    data.team ||
    data.supervision ||
    data.audit ||
    data.compliance ||
    data.manager_action ||
    data.notification ||
    data.notification_queue ||
    data.operational_notification ||
    data.home_notification ||
    data.staff_profile ||
    data.staff ||
    data.onboarding ||
    data.training ||
    data.staff_document ||
    data.invoice ||
    data.finance_item ||
    data.budget ||
    data.allowance ||
    data.maintenance_job ||
    data.environment_check ||
    data.visitor_log ||
    data.vehicle ||
    data.vehicle_check ||
    data.vehicle_journey ||
    data.inventory_item ||
    data.purchase_request ||
    data.petty_cash_transaction ||
    data.monthly_review ||
    data.monthly_review_action ||
    data.ai_generated_report ||
    data.report_delivery_log ||
    data.report_fact_snapshot ||
    data.ai_meeting_note ||
    data.handover_record ||
    data.inspection_pack_job ||
    data.operations_log ||
    data.operational_action ||
    data.shift_log ||
    data.wellbeing_check ||
    data.transition_plan ||
    data.transition_action ||
    data.consent ||
    data.essential_document ||
    data.financial_transaction ||
    data.property_item ||
    data.belongings ||
    data.legal_status ||
    data.therapy_case ||
    data.therapy_session_note ||
    data.formulation ||
    data.all_about_me ||
    data.identity_profile ||
    data.communication_profile ||
    data.education_profile ||
    data.health_profile ||
    data.item ||
    data.record ||
    data
  );
}

function prettifyKey(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function renderRichEmptyState(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function renderObjectValue(value) {
  if (value === null || value === undefined || value === "") return "—";

  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value
      .map((item) =>
        escapeHtml(typeof item === "object" ? JSON.stringify(item) : String(item))
      )
      .join(", ");
  }

  if (typeof value === "object") {
    return `<pre class="drawer-code-block">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  }

  return escapeHtml(String(value));
}

function renderDetailRows(detail = {}) {
  const rows = Object.entries(detail).filter(
    ([key, value]) =>
      ![
        "id",
        "young_person_id",
        "home_id",
        "provider_id",
        "created_by",
        "updated_by",
        "_local_only",
      ].includes(key) &&
      value !== null &&
      value !== "" &&
      value !== undefined
  );

  if (!rows.length) {
    return `
      <div class="drawer-detail-list">
        <div class="drawer-detail-row">
          <div class="drawer-detail-key">Details</div>
          <div class="drawer-detail-value">No additional details.</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="drawer-detail-list">
      ${rows
        .map(
          ([key, value]) => `
            <div class="drawer-detail-row">
              <div class="drawer-detail-key">${escapeHtml(prettifyKey(key))}</div>
              <div class="drawer-detail-value">${renderObjectValue(value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDrawerSection(detail = {}) {
  return `
    <section class="drawer-content-card">
      ${renderDetailRows(detail)}
    </section>
  `;
}

export function openDrawer() {
  els.drawer?.classList.remove("hidden");
  els.drawerBackdrop?.classList.remove("hidden");
  els.drawer?.setAttribute("aria-hidden", "false");
  state.recordDrawerOpen = true;
}

export function closeDrawer() {
  els.drawer?.classList.add("hidden");
  els.drawerBackdrop?.classList.add("hidden");
  els.drawer?.setAttribute("aria-hidden", "true");

  state.activeRecordItem = null;
  state.activeRecordType = null;
  state.recordDrawerOpen = false;
  hideSuggestionsPanel();
}

function setDrawerButtons(type) {
  const id = getRecordId(state.activeRecordItem || {});
  const hasWorkflow = Boolean(
    id &&
      (buildScopedWorkflowUrl(type, id, "submit") ||
        buildScopedWorkflowUrl(type, id, "approve") ||
        buildScopedWorkflowUrl(type, id, "return") ||
        buildScopedWorkflowUrl(type, id, "archive"))
  );

  els.drawerActions?.classList.toggle("hidden", !hasWorkflow);

  if (!hasWorkflow) return;

  els.drawerSubmitBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "submit"));
  els.drawerApproveBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "approve"));
  els.drawerReturnBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "return"));
  els.drawerArchiveBtn?.classList.toggle("hidden", !buildScopedWorkflowUrl(type, id, "archive"));

  if (type === "appointment") {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Complete";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Cancel";
  } else {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Approve";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Return";
  }
}

function setDrawerWorkflowBusy(isBusy) {
  [
    els.drawerEditBtn,
    els.drawerSubmitBtn,
    els.drawerApproveBtn,
    els.drawerReturnBtn,
    els.drawerArchiveBtn,
    els.closeDrawerBtn,
  ].forEach((button) => {
    if (!button) return;
    button.disabled = Boolean(isBusy);
  });
}

function buildSuggestionContext(type, detail = {}, item = {}) {
  return {
    ...item,
    ...detail,
    id: getRecordId(detail) || getRecordId(item),
    record_type: type,
    source_id: getRecordId(detail) || getRecordId(item),
  };
}

function shouldShowSuggestionsForType(type) {
  return [
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
    "task",
    "communication",
    "document",
    "therapy",
    "supervision",
    "audit",
    "compliance",
    "manager_action",
    "monthly_review",
    "ai_meeting_note",
    "handover_record",
    "wellbeing_check",
    "transition_plan",
    "transition_action",
  ].includes(type);
}

async function fetchRecordDetail(url) {
  if (!url) {
    throw new Error("No detail URL available for this record.");
  }

  return apiGet(url);
}

export async function openRecordDetail(item) {
  const type = normaliseRecordType(item);
  const url = getRecordUrl(item);

  state.activeRecordItem = item;
  state.activeRecordType = type;

  openDrawer();
  setDrawerButtons(type);
  setDrawerWorkflowBusy(false);

  if (els.drawerTitle) {
    els.drawerTitle.textContent =
      item.title ||
      item.name ||
      item.staff_member ||
      item.young_person_name ||
      RECORD_CONFIG[type]?.label ||
      "Details";
  }

  if (els.drawerSubtitle) {
    els.drawerSubtitle.textContent = "Loading…";
  }

  if (els.drawerBody) {
    els.drawerBody.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading details…</p>
        </div>
      </div>
    `;
  }

  try {
    if (!url || item?._local_only) {
      const fallbackDetail = {
        ...item,
        detail_status: item?._local_only ? "local_preview" : "preview_only",
        detail_note: item?._local_only
          ? "This record is currently stored locally because no live endpoint was available."
          : "This item does not yet have a dedicated detail endpoint.",
      };

      if (els.drawerTitle) {
        els.drawerTitle.textContent =
          item.title ||
          item.name ||
          item.staff_member ||
          item.young_person_name ||
          RECORD_CONFIG[type]?.label ||
          "Details";
      }

      if (els.drawerSubtitle) {
        els.drawerSubtitle.textContent = buildSubtitle(type, item, fallbackDetail);
      }

      if (els.drawerBody) {
        els.drawerBody.innerHTML = renderDrawerSection(fallbackDetail);
      }

      hideSuggestionsPanel();
      return;
    }

    const data = await fetchRecordDetail(url);
    const detail = detailObjectFromResponse(data);

    if (els.drawerTitle) {
      els.drawerTitle.textContent =
        item.title ||
        detail.title ||
        detail.name ||
        detail.incident_type ||
        detail.contact_person ||
        detail.staff_member ||
        detail.young_person_name ||
        RECORD_CONFIG[type]?.label ||
        "Details";
    }

    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = buildSubtitle(type, item, detail);
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = renderDrawerSection(detail);
    }

    if (shouldShowSuggestionsForType(type)) {
      const suggestionRecord = buildSuggestionContext(type, detail, item);
      const suggestions = mergeSuggestionLists(
        evaluateRecordSuggestions(suggestionRecord)
      );

      if (suggestions.length) {
        showSuggestionsPanel(suggestions, {
          source_record_type: type,
          source_record_id: suggestionRecord.id,
          scope: getCurrentScope(),
        });
      } else {
        hideSuggestionsPanel();
      }
    } else {
      hideSuggestionsPanel();
    }
  } catch (error) {
    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = "Unable to load";
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = renderRichEmptyState(
        "Record unavailable",
        error.message || "Failed to load record details."
      );
    }

    hideSuggestionsPanel();
  }
}

export async function runDrawerWorkflow(action) {
  const item = state.activeRecordItem;
  const type = state.activeRecordType;

  if (!item || !type) {
    throw new Error("No active record is available.");
  }

  const id = getRecordId(item);
  if (!id) {
    throw new Error("No record ID is available.");
  }

  const url = buildScopedWorkflowUrl(type, id, action);

  if (!url) {
    throw new Error(`No workflow action is configured for "${action}".`);
  }

  let body = null;

  if (action === "approve" && type !== "appointment") {
    body = { review_note: "Approved in workspace" };
  }

  if (action === "return" && type !== "appointment") {
    body = { review_note: "Returned in workspace" };
  }

  return apiSend(url, "POST", body);
}

let drawerEventsBound = false;

export function bindRecordDrawerEvents({ onEdit, onWorkflowComplete } = {}) {
  if (drawerEventsBound) return;
  drawerEventsBound = true;

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);

  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType) return;
    onEdit?.(state.activeRecordType, state.activeRecordItem);
  });

  const handleWorkflowAction = async (action) => {
    try {
      setDrawerWorkflowBusy(true);
      await runDrawerWorkflow(action);
      closeDrawer();
      await onWorkflowComplete?.({ action });
    } catch (error) {
      setDrawerWorkflowBusy(false);

      if (els.drawerSubtitle) {
        els.drawerSubtitle.textContent = "Action failed";
      }

      if (els.drawerBody) {
        els.drawerBody.innerHTML = renderRichEmptyState(
          "Workflow action failed",
          error?.message || "The record action could not be completed."
        );
      }
    }
  };

  els.drawerSubmitBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("submit");
  });

  els.drawerApproveBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("approve");
  });

  els.drawerReturnBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("return");
  });

  els.drawerArchiveBtn?.addEventListener("click", async () => {
    await handleWorkflowAction("archive");
  });
}
import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* -------------------------------- helpers -------------------------------- */

const SAFE_EMPTY = Object.freeze({ items: [] });

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function toBool(value) {
  return Boolean(value);
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function getHomeId() {
  return (
    state.homeId ||
    state.selectedHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

function pickItems(response, candidates = []) {
  for (const key of candidates) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function badgeClass(value) {
  const v = lower(value);
  if (
    [
      "declined",
      "withdrawn",
      "cancelled",
      "closed",
      "disrupted",
      "urgent",
      "high",
      "critical",
      "overdue",
      "at_risk",
      "at risk",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }
  if (
    [
      "screening",
      "matching",
      "decision_pending",
      "decision pending",
      "visit_planned",
      "visit planned",
      "in_progress",
      "in progress",
      "planned",
      "scheduled",
      "pending",
      "draft",
      "open",
      "waitlist",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }
  if (
    [
      "accepted",
      "completed",
      "admitted",
      "active",
      "achieved",
      "good",
      "approved",
      "pass",
    ].includes(v)
  ) {
    return "badge badge-success";
  }
  return "badge";
}

/* -------------------------------- mappers -------------------------------- */

function mapReferral(record = {}) {
  const firstName =
    record.young_person_first_name ||
    record.child_first_name ||
    record.first_name ||
    "";
  const lastName =
    record.young_person_last_name ||
    record.child_last_name ||
    record.last_name ||
    "";
  const preferred =
    record.young_person_preferred_name ||
    record.preferred_name ||
    record.young_person_name ||
    "";
  const personName = preferred || [firstName, lastName].filter(Boolean).join(" ").trim() || "Young person";

  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || record.linked_young_person_id || null,
    referral_reference: record.referral_reference || "",
    referral_source: record.referral_source || "",
    local_authority_name:
      record.local_authority_name || record.local_authority || record.placing_authority_name || "",
    social_worker_name:
      record.social_worker_name || record.referring_worker_name || "",
    social_worker_email:
      record.social_worker_email || record.referring_worker_email || "",
    social_worker_phone:
      record.social_worker_phone || record.referring_worker_phone || "",
    date_of_birth: record.date_of_birth || null,
    gender: record.gender || "",
    ethnicity: record.ethnicity || "",
    referral_date: record.referral_date || record.enquiry_date || null,
    requested_move_in_date:
      record.requested_move_in_date || record.desired_start_date || record.planned_admission_date || null,
    status: record.referral_status || record.status || record.current_stage || "",
    decision_outcome: record.decision_outcome || record.decision || record.outcome_decision || "",
    decision_date: record.decision_date || null,
    presenting_needs: record.presenting_needs || "",
    known_risks: record.known_risks || record.risk_summary || "",
    matching_summary: record.matching_summary || record.matching_considerations || "",
    decision_rationale: record.decision_rationale || record.decision_reason || record.outcome_reason || "",
    notes: record.notes || "",
    title: `${personName} referral`,
    person_name: personName,
    summary:
      record.presenting_needs ||
      record.matching_summary ||
      record.referral_summary ||
      "Referral received.",
    record_type: "referral",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPreAdmissionAssessment(record = {}) {
  return {
    id: record.id,
    referral_id: record.referral_id || null,
    young_person_id: record.young_person_id || null,
    home_id: record.home_id || null,
    assessment_date: record.assessment_date || null,
    assessor_user_id: record.assessor_user_id || record.assessed_by_user_id || null,
    status: record.status || record.assessment_status || "",
    presenting_needs: record.presenting_needs || record.needs_summary || "",
    known_risks: record.known_risks || record.risk_summary || "",
    communication_needs: record.communication_needs || record.communication_summary || "",
    education_needs: record.education_needs || record.education_summary || "",
    health_needs: record.health_needs || record.health_summary || "",
    family_context: record.family_context || record.family_summary || "",
    matching_considerations: record.matching_considerations || record.matching_summary || "",
    rationale: record.rationale || record.admission_recommendation || record.outcome_recommendation || "",
    title: "Pre-admission assessment",
    summary:
      record.matching_considerations ||
      record.matching_summary ||
      record.rationale ||
      record.outcome_recommendation ||
      "Assessment completed.",
    record_type: "pre_admission_assessment",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPreAdmissionVisit(record = {}) {
  return {
    id: record.id,
    referral_id: record.referral_id || null,
    home_id: record.home_id || null,
    visit_type: record.visit_type || "",
    planned_datetime: record.planned_datetime || null,
    completed_datetime: record.completed_datetime || null,
    attended_by_json: record.attended_by_json || null,
    visit_summary: record.visit_summary || "",
    young_person_response: record.young_person_response || "",
    family_response: record.family_response || "",
    staff_reflection: record.staff_reflection || "",
    outcome: record.outcome || "",
    status: record.status || "",
    title: titleCase(record.visit_type || "Pre-admission visit"),
    summary:
      record.visit_summary ||
      record.young_person_response ||
      record.outcome ||
      "Visit recorded.",
    record_type: "pre_admission_visit",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAdmissionPlan(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    referral_id: record.referral_id || null,
    home_id: record.home_id || null,
    planned_admission_date: record.planned_admission_date || null,
    actual_admission_date: record.actual_admission_date || null,
    admission_status: record.admission_status || "",
    welcome_arrangements: record.welcome_arrangements || "",
    room_preparation_notes: record.room_preparation_notes || "",
    staff_briefing_notes: record.staff_briefing_notes || "",
    education_transition_notes: record.education_transition_notes || "",
    health_transition_notes: record.health_transition_notes || "",
    family_contact_arrangements: record.family_contact_arrangements || "",
    transport_arrangements: record.transport_arrangements || "",
    immediate_risk_actions: record.immediate_risk_actions || "",
    first_72_hours_plan: record.first_72_hours_plan || "",
    lead_staff_user_id: record.lead_staff_user_id || null,
    manager_user_id: record.manager_user_id || null,
    title: "Admission plan",
    summary:
      record.first_72_hours_plan ||
      record.immediate_risk_actions ||
      record.welcome_arrangements ||
      "Admission planning in place.",
    record_type: "admission_plan",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAdmissionChecklist(record = {}) {
  return {
    id: record.id,
    admission_plan_id: record.admission_plan_id || record.admission_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    referral_id: record.referral_id || null,
    checklist_type: record.checklist_type || "",
    item_code: record.item_code || "",
    item_title: record.item_title || record.item_label || "",
    item_description: record.item_description || "",
    is_required: toBool(record.is_required ?? record.required),
    status: record.status || (toBool(record.completed) ? "completed" : ""),
    completed_at: record.completed_at || null,
    due_date: record.due_date || null,
    assigned_user_id: record.assigned_user_id || null,
    completed_by_user_id: record.completed_by_user_id || record.completed_by || null,
    notes: record.notes || "",
    title: record.item_title || record.item_label || "Admission checklist item",
    summary: record.item_description || record.notes || "Checklist item recorded.",
    record_type: "admission_checklist",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAdmissionEvent(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    referral_id: record.referral_id || null,
    admission_type: record.admission_type || "",
    admission_status: record.admission_status || record.status || "",
    admission_date: record.admission_date || null,
    arrival_time: record.arrival_time || record.admission_time || null,
    admitted_by_user_id: record.admitted_by_user_id || record.admitting_user_id || null,
    room_id: record.room_id || null,
    placement_reason: record.placement_reason || record.referral_information_summary || "",
    initial_observations: record.initial_observations || record.first_day_observations || "",
    welcome_notes: record.welcome_notes || "",
    immediate_actions: record.immediate_actions || "",
    child_initial_presentation: record.child_initial_presentation || "",
    child_initial_wishes_feelings: record.child_initial_wishes_feelings || "",
    title: "Admission event",
    summary:
      record.initial_observations ||
      record.immediate_actions ||
      record.welcome_notes ||
      "Young person admitted.",
    record_type: "admission_event",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPlacementPeriod(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    home_id: record.home_id || null,
    admission_date: record.admission_date || record.start_date || null,
    discharge_date: record.discharge_date || record.end_date || null,
    placement_status: record.placement_status || "",
    legal_basis: record.legal_basis || record.legal_status || "",
    placing_authority_name: record.placing_authority_name || record.authority_name || "",
    primary_social_worker_name: record.primary_social_worker_name || record.social_worker_name || "",
    placement_reason: record.placement_reason || record.admission_reason || "",
    planned_duration_text: record.planned_duration_text || "",
    ending_reason: record.ending_reason || record.discharge_reason || "",
    ending_summary: record.ending_summary || "",
    title: "Placement period",
    summary:
      record.placement_reason ||
      record.ending_summary ||
      record.planned_duration_text ||
      "Placement timeline recorded.",
    record_type: "placement_period",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPlacementPlan(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    home_id: record.home_id || null,
    plan_title: record.plan_title || "",
    start_date: record.start_date || null,
    review_date: record.review_date || null,
    status: record.status || "",
    placement_objectives: record.placement_objectives || "",
    daily_routines: record.daily_routines || "",
    education_arrangements: record.education_arrangements || "",
    health_arrangements: record.health_arrangements || "",
    contact_arrangements: record.contact_arrangements || "",
    behaviour_support_guidance: record.behaviour_support_guidance || "",
    safeguarding_arrangements: record.safeguarding_arrangements || "",
    bedroom_plan: record.bedroom_plan || "",
    transport_arrangements: record.transport_arrangements || "",
    created_by: record.created_by || null,
    approved_by: record.approved_by || null,
    approved_at: record.approved_at || null,
    title: record.plan_title || "Placement plan",
    summary:
      record.placement_objectives ||
      record.daily_routines ||
      record.behaviour_support_guidance ||
      "Placement plan recorded.",
    record_type: "placement_plan",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPlacementGoal(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    placement_period_id: record.placement_period_id || null,
    goal_area: record.goal_area || "",
    goal_title: record.goal_title || "",
    goal_description: record.goal_description || "",
    target_date: record.target_date || null,
    status: record.status || "",
    progress_summary: record.progress_summary || "",
    achieved_at: record.achieved_at || null,
    owner_user_id: record.owner_user_id || null,
    title: record.goal_title || "Placement goal",
    summary:
      record.progress_summary ||
      record.goal_description ||
      "Goal progress recorded.",
    record_type: "placement_goal",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapTransitionPlan(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    home_id: record.home_id || null,
    placement_period_id: record.placement_period_id || null,
    transition_type: record.transition_type || "",
    target_move_date: record.target_move_date || record.planned_move_date || null,
    status: record.status || record.plan_status || "",
    destination_summary: record.destination_summary || record.destination_details || "",
    reason_for_transition: record.reason_for_transition || "",
    emotional_preparation_plan:
      record.emotional_preparation_plan || record.emotional_preparation || "",
    practical_preparation_plan:
      record.practical_preparation_plan || record.practical_preparation || "",
    education_transition_plan: record.education_transition_plan || "",
    health_transition_plan: record.health_transition_plan || "",
    family_transition_plan: record.family_transition_plan || "",
    child_voice: record.child_voice || "",
    lead_user_id: record.lead_user_id || record.owner_id || null,
    reviewed_by_user_id: record.reviewed_by_user_id || null,
    reviewed_at: record.reviewed_at || null,
    title: titleCase(record.transition_type || "Transition plan"),
    summary:
      record.destination_summary ||
      record.destination_details ||
      record.reason_for_transition ||
      "Transition planning recorded.",
    record_type: "transition_plan",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapTransitionAction(record = {}) {
  return {
    id: record.id,
    transition_plan_id: record.transition_plan_id || null,
    young_person_id: record.young_person_id || null,
    action_title: record.action_title || record.title || "",
    action_description: record.action_description || record.description || "",
    action_area: record.action_area || record.action_type || "",
    owner_user_id: record.owner_user_id || record.assigned_to_user_id || null,
    due_date: record.due_date || null,
    completed_at: record.completed_at || null,
    completed_by_user_id: record.completed_by_user_id || null,
    status:
      record.status || (toBool(record.completed) ? "completed" : ""),
    notes: record.notes || "",
    title: record.action_title || record.title || "Transition action",
    summary:
      record.action_description ||
      record.description ||
      record.notes ||
      "Transition action recorded.",
    record_type: "transition_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapDischargeRecord(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    home_id: record.home_id || null,
    discharge_date: record.discharge_date || null,
    discharge_type: record.discharge_type || "",
    destination: record.destination || "",
    summary_of_placement:
      record.summary_of_placement ||
      record.move_summary ||
      record.ending_summary ||
      "",
    achievements_summary: record.achievements_summary || "",
    final_child_voice:
      record.final_child_voice || record.child_voice_summary || "",
    final_manager_summary:
      record.final_manager_summary || record.recommendations_for_next_service || "",
    follow_up_required: toBool(record.follow_up_required),
    follow_up_notes: record.follow_up_notes || "",
    completed_by_user_id: record.completed_by_user_id || record.created_by || record.recorded_by_user_id || null,
    approved_by_user_id: record.approved_by_user_id || null,
    approved_at: record.approved_at || null,
    title: "Discharge summary",
    summary:
      record.summary_of_placement ||
      record.move_summary ||
      record.achievements_summary ||
      "Discharge recorded.",
    record_type: "discharge_record",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

/* -------------------------------- render -------------------------------- */

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function renderCard(item = {}) {
  const status =
    item.status ||
    item.referral_status ||
    item.admission_status ||
    item.placement_status ||
    item.plan_status ||
    item.decision_outcome ||
    "";

  const primaryDate =
    item.referral_date ||
    item.assessment_date ||
    item.planned_datetime ||
    item.completed_datetime ||
    item.planned_admission_date ||
    item.actual_admission_date ||
    item.admission_date ||
    item.target_date ||
    item.target_move_date ||
    item.due_date ||
    item.discharge_date ||
    item.review_date ||
    item.created_at;

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "record")}"
      data-title="${safeText(item.title || "Record")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Record")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(primaryDate, "No date"))}</div>
        </div>
        ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.person_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Young person</div>
                  <div class="details-grid-value">${safeText(item.person_name)}</div>
                </div>
              `
              : ""
          }
          ${
            item.referral_source
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Source</div>
                  <div class="details-grid-value">${safeText(titleCase(item.referral_source))}</div>
                </div>
              `
              : ""
          }
          ${
            item.requested_move_in_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Requested move in</div>
                  <div class="details-grid-value">${safeText(formatDate(item.requested_move_in_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.target_move_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Target move</div>
                  <div class="details-grid-value">${safeText(formatDate(item.target_move_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.discharge_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Discharge</div>
                  <div class="details-grid-value">${safeText(formatDate(item.discharge_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.social_worker_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Social worker</div>
                  <div class="details-grid-value">${safeText(item.social_worker_name)}</div>
                </div>
              `
              : ""
          }
          ${
            item.local_authority_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Authority</div>
                  <div class="details-grid-value">${safeText(item.local_authority_name)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.presenting_needs
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Presenting needs</div>
                <div>${safeText(item.presenting_needs)}</div>
              </div>
            `
            : ""
        }

        ${
          item.known_risks
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Known risks</div>
                <div>${safeText(item.known_risks)}</div>
              </div>
            `
            : ""
        }

        ${
          item.matching_summary || item.matching_considerations
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Matching</div>
                <div>${safeText(item.matching_summary || item.matching_considerations)}</div>
              </div>
            `
            : ""
        }

        ${
          item.first_72_hours_plan
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">First 72 hours</div>
                <div>${safeText(item.first_72_hours_plan)}</div>
              </div>
            `
            : ""
        }

        ${
          item.immediate_risk_actions
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Immediate risk actions</div>
                <div>${safeText(item.immediate_risk_actions)}</div>
              </div>
            `
            : ""
        }

        ${
          item.visit_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Visit summary</div>
                <div>${safeText(item.visit_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.progress_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Progress</div>
                <div>${safeText(item.progress_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.destination_summary || item.destination
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Destination</div>
                <div>${safeText(item.destination_summary || item.destination)}</div>
              </div>
            `
            : ""
        }

        ${
          item.summary_of_placement
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Placement summary</div>
                <div>${safeText(item.summary_of_placement)}</div>
              </div>
            `
            : ""
        }

        ${
          item.notes
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Notes</div>
                <div>${safeText(item.notes)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items.map(renderCard).join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No admissions activity",
      "No admissions, placement or transition activity has been recorded yet."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.referral_date ||
            item.assessment_date ||
            item.completed_datetime ||
            item.planned_datetime ||
            item.actual_admission_date ||
            item.admission_date ||
            item.review_date ||
            item.target_move_date ||
            item.due_date ||
            item.discharge_date ||
            item.created_at;

          const status =
            item.status ||
            item.referral_status ||
            item.admission_status ||
            item.placement_status ||
            item.plan_status ||
            item.decision_outcome ||
            "";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
                </div>
                <div class="timeline-item-summary">${safeText(item.summary || "")}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    liveReferrals,
    upcomingAdmissions,
    openChecklistItems,
    activePlacements,
    activeTransitions,
    recentDischarges,
    timeline,
    overdueTransitionActions,
    pendingVisits,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Admissions and placement journey</div>
          <h2>Referral, pre-admission, admission, placement and transition</h2>
          <p class="overview-panel-subtitle">
            End-to-end child journey from referral through move-in, placement oversight, transition planning and leaving.
          </p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Live referrals", liveReferrals.length)}
        ${renderStatCard("Upcoming admissions", upcomingAdmissions.length)}
        ${renderStatCard("Open checklist items", openChecklistItems.length)}
        ${renderStatCard("Active placements", activePlacements.length)}
        ${renderStatCard("Active transitions", activeTransitions.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Live referrals",
            renderCardList(
              liveReferrals,
              "No live referrals",
              "There are no active referral cases at the moment."
            )
          )}

          ${renderSection(
            "Upcoming admissions",
            renderCardList(
              upcomingAdmissions,
              "No upcoming admissions",
              "There are no planned admissions currently scheduled."
            )
          )}

          ${renderSection(
            "Open admission checklist items",
            renderCardList(
              openChecklistItems,
              "No open checklist items",
              "All known admission checklist items are complete."
            )
          )}

          ${renderSection("Journey timeline", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Pending pre-admission visits",
            renderCardList(
              pendingVisits,
              "No pending visits",
              "No pre-admission visits are currently awaiting completion."
            )
          )}

          ${renderSection(
            "Active placements",
            renderCardList(
              activePlacements,
              "No active placements",
              "No active placement periods were returned for this home."
            )
          )}

          ${renderSection(
            "Active transitions",
            renderCardList(
              activeTransitions,
              "No active transitions",
              "There are no active transition plans for this home."
            )
          )}

          ${renderSection(
            "Overdue transition actions",
            renderCardList(
              overdueTransitionActions,
              "No overdue actions",
              "There are no overdue transition actions."
            )
          )}

          ${renderSection(
            "Recent discharges",
            renderCardList(
              recentDischarges,
              "No recent discharges",
              "No recent discharges have been recorded."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- fetch -------------------------------- */

async function fetchAll(homeId) {
  const [
    referralsRes,
    preAdmissionAssessmentsRes,
    preAdmissionVisitsRes,
    admissionPlansRes,
    admissionChecklistRes,
    admissionEventsRes,
    placementPeriodsRes,
    placementPlansRes,
    placementGoalsRes,
    transitionPlansRes,
    transitionActionsRes,
    dischargeSummariesRes,
    dischargeEventsRes,
    dischargeRecordsRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/referrals`),
    safeGet(`/homes/${homeId}/pre-admission-assessments`),
    safeGet(`/homes/${homeId}/pre-admission-visits`),
    safeGet(`/homes/${homeId}/admission-plans`),
    safeGet(`/homes/${homeId}/admission-checklists`),
    safeGet(`/homes/${homeId}/admission-events`),
    safeGet(`/homes/${homeId}/placement-periods`),
    safeGet(`/homes/${homeId}/placement-plans`),
    safeGet(`/homes/${homeId}/placement-goals`),
    safeGet(`/homes/${homeId}/transition-plans`),
    safeGet(`/homes/${homeId}/transition-actions`),
    safeGet(`/homes/${homeId}/discharge-summaries`),
    safeGet(`/homes/${homeId}/discharge-events`),
    safeGet(`/homes/${homeId}/discharge-records`),
  ]);

  return {
    referrals: pickItems(referralsRes, [
      "referrals",
      "referral_records",
      "admission_referrals",
      "items",
    ]).map(mapReferral),

    preAdmissionAssessments: pickItems(preAdmissionAssessmentsRes, [
      "pre_admission_assessments",
      "admission_assessments",
      "items",
    ]).map(mapPreAdmissionAssessment),

    preAdmissionVisits: pickItems(preAdmissionVisitsRes, [
      "pre_admission_visits",
      "items",
    ]).map(mapPreAdmissionVisit),

    admissionPlans: pickItems(admissionPlansRes, [
      "admission_plans",
      "items",
    ]).map(mapAdmissionPlan),

    admissionChecklists: pickItems(admissionChecklistRes, [
      "admission_checklists",
      "admission_checklist_items",
      "items",
    ]).map(mapAdmissionChecklist),

    admissionEvents: pickItems(admissionEventsRes, [
      "admission_events",
      "admissions",
      "items",
    ]).map(mapAdmissionEvent),

    placementPeriods: pickItems(placementPeriodsRes, [
      "placement_periods",
      "placement_history",
      "items",
    ]).map(mapPlacementPeriod),

    placementPlans: pickItems(placementPlansRes, [
      "placement_plans",
      "items",
    ]).map(mapPlacementPlan),

    placementGoals: pickItems(placementGoalsRes, [
      "placement_goals",
      "child_goals",
      "items",
    ]).map(mapPlacementGoal),

    transitionPlans: pickItems(transitionPlansRes, [
      "transition_plans",
      "items",
    ]).map(mapTransitionPlan),

    transitionActions: pickItems(transitionActionsRes, [
      "transition_actions",
      "transition_plan_actions",
      "items",
    ]).map(mapTransitionAction),

    dischargeSummaries: pickItems(dischargeSummariesRes, [
      "discharge_summaries",
      "items",
    ]).map(mapDischargeRecord),

    dischargeEvents: pickItems(dischargeEventsRes, [
      "discharge_events",
      "items",
    ]).map(mapDischargeRecord),

    dischargeRecords: pickItems(dischargeRecordsRes, [
      "discharge_records",
      "items",
    ]).map(mapDischargeRecord),
  };
}

/* -------------------------------- builders -------------------------------- */

function buildLiveReferrals(data) {
  return sortNewest(
    data.referrals.filter(
      (item) =>
        ![
          "accepted",
          "declined",
          "withdrawn",
          "closed",
          "admitted",
        ].includes(lower(item.status))
    ),
    ["referral_date", "created_at", "updated_at"]
  ).slice(0, 12);
}

function buildUpcomingAdmissions(data) {
  return sortNewest(
    [
      ...data.admissionPlans.filter((item) => {
        const status = lower(item.admission_status);
        return !["admitted", "cancelled"].includes(status);
      }),
      ...data.admissionEvents.filter((item) => {
        const status = lower(item.admission_status);
        return ["planned", "scheduled", "in_progress", "in progress"].includes(status);
      }),
    ],
    ["planned_admission_date", "admission_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildOpenChecklistItems(data) {
  return sortNewest(
    data.admissionChecklists.filter((item) => !["completed", "not_applicable", "not applicable"].includes(lower(item.status))),
    ["due_date", "created_at", "updated_at"]
  ).slice(0, 12);
}

function buildActivePlacements(data) {
  return sortNewest(
    [
      ...data.placementPeriods.filter((item) =>
        ["active", "planned"].includes(lower(item.placement_status))
      ),
      ...data.placementPlans.filter((item) =>
        !["closed", "archived", "ended"].includes(lower(item.status))
      ),
    ],
    ["admission_date", "start_date", "review_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildActiveTransitions(data) {
  return sortNewest(
    data.transitionPlans.filter(
      (item) => !["completed", "cancelled", "closed"].includes(lower(item.status))
    ),
    ["target_move_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildOverdueTransitionActions(data) {
  return sortNewest(
    data.transitionActions.filter(
      (item) =>
        !["completed", "cancelled"].includes(lower(item.status)) && isOverdue(item.due_date)
    ),
    ["due_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildPendingVisits(data) {
  return sortNewest(
    data.preAdmissionVisits.filter(
      (item) => !["completed", "cancelled", "no_show", "no show"].includes(lower(item.status))
    ),
    ["planned_datetime", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildRecentDischarges(data) {
  return sortNewest(
    [...data.dischargeSummaries, ...data.dischargeEvents, ...data.dischargeRecords],
    ["discharge_date", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    [
      ...data.referrals,
      ...data.preAdmissionAssessments,
      ...data.preAdmissionVisits,
      ...data.admissionPlans,
      ...data.admissionEvents,
      ...data.placementPeriods,
      ...data.placementPlans,
      ...data.placementGoals,
      ...data.transitionPlans,
      ...data.transitionActions,
      ...data.dischargeSummaries,
      ...data.dischargeEvents,
      ...data.dischargeRecords,
    ],
    [
      "referral_date",
      "assessment_date",
      "planned_datetime",
      "completed_datetime",
      "planned_admission_date",
      "actual_admission_date",
      "admission_date",
      "start_date",
      "review_date",
      "target_move_date",
      "due_date",
      "discharge_date",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 25);
}

/* -------------------------------- public -------------------------------- */

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = renderEmpty(
      "No home selected",
      "Select a home to view admissions and placement activity."
    );
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const data = await fetchAll(homeId);

    const liveReferrals = buildLiveReferrals(data);
    const upcomingAdmissions = buildUpcomingAdmissions(data);
    const openChecklistItems = buildOpenChecklistItems(data);
    const activePlacements = buildActivePlacements(data);
    const activeTransitions = buildActiveTransitions(data);
    const overdueTransitionActions = buildOverdueTransitionActions(data);
    const pendingVisits = buildPendingVisits(data);
    const recentDischarges = buildRecentDischarges(data);
    const timeline = buildTimeline(data);

    const nextAdmission =
      upcomingAdmissions.find((item) => item.planned_admission_date || item.admission_date) || null;

    els.viewContent.innerHTML = renderWorkspace({
      liveReferrals,
      upcomingAdmissions,
      openChecklistItems,
      activePlacements,
      activeTransitions,
      overdueTransitionActions,
      pendingVisits,
      recentDischarges,
      timeline,
    });

    updateWorkspaceSummaryStrip({
      today: `${liveReferrals.length} live referrals`,
      nextEvent: nextAdmission
        ? formatDate(nextAdmission.planned_admission_date || nextAdmission.admission_date)
        : "No planned admission",
      lastRecord: timeline[0]
        ? formatDate(
            timeline[0].referral_date ||
              timeline[0].assessment_date ||
              timeline[0].completed_datetime ||
              timeline[0].planned_datetime ||
              timeline[0].actual_admission_date ||
              timeline[0].admission_date ||
              timeline[0].target_move_date ||
              timeline[0].discharge_date ||
              timeline[0].created_at
          )
        : "None",
      openActions: `${openChecklistItems.length} checklist items open`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load admissions",
      "Something went wrong while loading admissions and placement records."
    );
  }
}
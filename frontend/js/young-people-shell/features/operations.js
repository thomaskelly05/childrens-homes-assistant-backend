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

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, candidates = []) {
  for (const key of candidates) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    const aTime = aValue ? new Date(aValue).getTime() : Number.POSITIVE_INFINITY;
    const bTime = bValue ? new Date(bValue).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "critical",
      "high",
      "urgent",
      "unsafe",
      "action_required",
      "action required",
      "open",
      "overdue",
      "reported",
      "declined",
      "cancelled",
      "problem",
      "failed",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "pending",
      "submitted",
      "planned",
      "draft",
      "in_progress",
      "in progress",
      "ordered",
      "awaiting_contractor",
      "priority",
      "warning",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "low",
      "completed",
      "approved",
      "resolved",
      "pass",
      "active",
      "received",
      "paid",
      "good",
      "safe",
      "in_stock",
      "in stock",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function getSupportedRecordType(type = "") {
  const normalised = String(type || "").toLowerCase().trim();

  if (["notification", "task"].includes(normalised)) return normalised;

  return "";
}

function buildCardAttrs(item = {}) {
  const supportedType = getSupportedRecordType(item.record_type || "");
  const rowId = item?.id || "";

  if (!supportedType || !rowId) {
    return `class="record-card"`;
  }

  return `
    class="record-card"
    data-open-record="true"
    data-record-id="${safeText(rowId)}"
    data-record-type="${safeText(supportedType)}"
    data-title="${safeText(item.title || "Record")}"
    role="button"
    tabindex="0"
  `;
}

/* -------------------------------- mappers -------------------------------- */

function mapMaintenanceJob(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    area_id: record.area_id || null,
    room_id: record.room_id || null,
    job_title: record.job_title || record.title || record.issue_title || "Maintenance job",
    job_description:
      record.job_description || record.description || record.issue_description || "",
    reported_date: record.reported_date || record.reported_at || null,
    priority: record.priority || record.severity || "",
    status: record.status || "",
    reported_by_user_id: record.reported_by_user_id || null,
    assigned_to_user_id: record.assigned_to_user_id || null,
    contractor_name: record.contractor_name || "",
    contractor_contact: record.contractor_contact || "",
    target_completion_date: record.target_completion_date || record.due_date || null,
    completed_date: record.completed_date || record.completed_at || null,
    completion_notes: record.completion_notes || "",
    cost_amount: record.cost_amount || record.cost_estimate || null,
    area: record.area || "",
    room_name: record.room_name || "",
    category: record.category || record.issue_category || "",
    notes: record.notes || "",
    title: record.job_title || record.title || record.issue_title || "Maintenance job",
    summary:
      record.job_description ||
      record.description ||
      record.issue_description ||
      record.notes ||
      "Maintenance logged.",
    record_type: "maintenance_job",
    source_type: record.issue_title ? "maintenance_request" : "maintenance_job",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapEnvironmentCheck(record = {}, sourceType = "environment_check") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    area_id: record.area_id || null,
    room_id: record.room_id || null,
    check_date: record.check_date || null,
    check_type: record.check_type || "",
    status: record.status || record.outcome || record.outcome_status || "",
    cleanliness_rating: record.cleanliness_rating ?? null,
    safety_rating: record.safety_rating ?? null,
    homeliness_rating: record.homeliness_rating ?? null,
    findings: record.findings || record.finding_summary || record.issues_found || "",
    action_required: toBool(record.action_required),
    action_notes: record.action_notes || record.action_note || record.actions_required || "",
    checked_by_user_id:
      record.checked_by_user_id || record.completed_by || record.completed_by_user_id || null,
    next_due_date: record.next_due_date || record.next_check_date || null,
    title: titleCase(record.check_type || "Environment check"),
    summary:
      record.findings ||
      record.finding_summary ||
      record.action_notes ||
      record.action_note ||
      "Environment check recorded.",
    record_type: "environment_check",
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapVisitor(record = {}, sourceType = "visitor_log") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id:
      record.young_person_id || record.related_young_person_id || null,
    visitor_name: record.visitor_name || "",
    organisation_name: record.organisation_name || record.organisation || "",
    visitor_type: record.visitor_type || "",
    purpose_of_visit: record.purpose_of_visit || record.purpose || "",
    arrived_at: record.arrived_at || record.arrival_time || record.sign_in_time || null,
    departed_at: record.departed_at || record.departure_time || record.sign_out_time || null,
    signed_in_by_user_id: record.signed_in_by_user_id || null,
    signed_out_by_user_id: record.signed_out_by_user_id || null,
    dbs_checked: toBool(record.dbs_checked),
    identification_seen: toBool(
      record.identification_seen ?? record.identity_checked ?? record.id_checked
    ),
    escorted: toBool(record.escorted ?? record.supervised_visit ?? record.supervised),
    notes: record.notes || "",
    title: record.visitor_name || "Visitor",
    summary:
      record.purpose_of_visit ||
      record.purpose ||
      record.notes ||
      "Visitor activity recorded.",
    record_type: "visitor_log",
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapVehicle(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    vehicle_name: record.vehicle_name || "",
    registration_number: record.registration_number || "",
    make:
      record.make ||
      (record.make_model ? String(record.make_model).split(" ")[0] : ""),
    model:
      record.model ||
      (record.make_model
        ? String(record.make_model).split(" ").slice(1).join(" ")
        : ""),
    colour: record.colour || "",
    seats_count: record.seats_count || record.seats || null,
    wheelchair_accessible: toBool(record.wheelchair_accessible),
    active: toBool(record.active),
    mot_expiry_date: record.mot_expiry_date || record.mot_due_date || null,
    tax_expiry_date: record.tax_expiry_date || record.tax_due_date || null,
    insurance_expiry_date:
      record.insurance_expiry_date || record.insurance_due_date || null,
    service_due_date: record.service_due_date || null,
    notes: record.notes || "",
    title: record.vehicle_name || record.registration_number || "Vehicle",
    summary:
      `${record.registration_number || ""} ${record.make || record.make_model || ""} ${record.model || ""}`.trim() ||
      "Vehicle profile.",
    record_type: "vehicle",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapVehicleCheck(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    vehicle_id: record.vehicle_id || null,
    home_id: record.home_id || null,
    check_date: record.check_date || null,
    mileage: record.mileage ?? null,
    fuel_level_text: record.fuel_level_text || record.fuel_level || "",
    tyres_ok: toBool(record.tyres_ok),
    lights_ok: toBool(record.lights_ok),
    cleanliness_ok: toBool(record.cleanliness_ok),
    damage_noted: record.damage_noted || "",
    status: record.status || (toBool(record.roadworthy) ? "pass" : ""),
    checked_by_user_id: record.checked_by_user_id || record.completed_by_user_id || null,
    notes: record.notes || record.actions_required || "",
    title: "Vehicle check",
    summary:
      record.damage_noted ||
      record.actions_required ||
      record.notes ||
      "Vehicle check recorded.",
    record_type: "vehicle_check",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapVehicleJourney(record = {}, sourceType = "vehicle_journey") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    vehicle_id: record.vehicle_id || null,
    home_id: record.home_id || null,
    driver_staff_id: record.driver_staff_id || null,
    driver_user_id: record.driver_user_id || null,
    young_person_id: record.young_person_id || null,
    journey_date: record.journey_date || null,
    start_time: record.start_time || record.departure_time || null,
    end_time: record.end_time || record.arrival_time || null,
    start_mileage: record.start_mileage || record.mileage_start || null,
    end_mileage: record.end_mileage || record.mileage_end || null,
    journey_purpose: record.journey_purpose || record.purpose || "",
    destination: record.destination || record.to_location || "",
    passengers_summary: record.passengers_summary || "",
    notes: record.notes || record.risk_considerations || "",
    status: record.status || "",
    title: "Vehicle journey",
    summary:
      record.journey_purpose ||
      record.purpose ||
      record.destination ||
      "Journey recorded.",
    record_type: "vehicle_journey",
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInventoryItem(record = {}, sourceType = "inventory_item") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    area_id: record.area_id || null,
    item_name: record.item_name || record.asset_name || "",
    category: record.category || record.asset_category || record.asset_type || "",
    quantity: record.quantity ?? 1,
    unit_text: record.unit_text || "",
    status: record.status || record.condition_status || "",
    purchase_date: record.purchase_date || null,
    replacement_due_date: record.replacement_due_date || record.next_service_due || null,
    condition_text: record.condition_text || "",
    serial_number: record.serial_number || "",
    notes: record.notes || "",
    title: record.item_name || record.asset_name || "Inventory item",
    summary:
      record.condition_text ||
      record.notes ||
      record.category ||
      "Inventory record.",
    record_type: "inventory_item",
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPurchaseRequest(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    request_type: record.request_type || "",
    request_title: record.request_title || "",
    request_description: record.request_description || "",
    requested_by_user_id: record.requested_by_user_id || null,
    requested_date: record.requested_date || null,
    estimated_cost: record.estimated_cost ?? null,
    approved_cost: record.approved_cost ?? null,
    supplier_name: record.supplier_name || "",
    urgency: record.urgency || "",
    status: record.status || "",
    approved_by_user_id: record.approved_by_user_id || null,
    approved_at: record.approved_at || null,
    purchased_at: record.purchased_at || null,
    notes: record.notes || "",
    title: record.request_title || "Purchase request",
    summary:
      record.request_description ||
      record.notes ||
      record.request_type ||
      "Purchase request logged.",
    record_type: "purchase_request",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapPettyCash(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    petty_cash_account_id: record.petty_cash_account_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    transaction_date: record.transaction_date || null,
    transaction_type: record.transaction_type || "",
    amount: record.amount ?? null,
    description: record.description || "",
    requested_by_user_id: record.requested_by_user_id || null,
    approved_by_user_id: record.approved_by_user_id || null,
    running_balance_after: record.running_balance_after ?? null,
    notes: record.notes || "",
    title: titleCase(record.transaction_type || "Petty cash"),
    summary:
      record.description ||
      record.notes ||
      "Petty cash transaction.",
    record_type: "petty_cash_transaction",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAllowancePayment(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    allowance_id: record.allowance_id || null,
    young_person_id: record.young_person_id || null,
    home_id: record.home_id || null,
    payment_date: record.payment_date || null,
    amount: record.amount ?? null,
    payment_method: record.payment_method || "",
    payment_status: record.payment_status || "",
    paid_by_user_id: record.paid_by_user_id || null,
    received_confirmed: toBool(record.received_confirmed),
    notes: record.notes || "",
    title: "Allowance payment",
    summary:
      `£${toNumber(record.amount, 0).toFixed(2)} ${record.payment_method || ""}`.trim(),
    record_type: "allowance_payment",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapOperationalNotification(record = {}, sourceType = "notification") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    staff_id: record.staff_id || null,
    notification_type: record.notification_type || "",
    severity: record.severity || "",
    title: record.title || "Notification",
    message: record.message || "",
    status: record.status || "",
    due_at: record.due_at || null,
    acknowledged_by_user_id: record.acknowledged_by_user_id || null,
    acknowledged_at: record.acknowledged_at || null,
    resolved_by_user_id: record.resolved_by_user_id || null,
    resolved_at: record.resolved_at || null,
    action_url: record.action_url || "",
    action_label: record.action_label || "",
    summary: record.message || "Notification recorded.",
    record_type: "notification",
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapHomeOperationsLog(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    log_date: record.log_date || null,
    log_type: record.log_type || "",
    title: record.title || "Operations log",
    summary: record.summary || "",
    severity: record.severity || "",
    linked_table: record.linked_table || "",
    linked_id: record.linked_id || null,
    recorded_by_user_id: record.recorded_by_user_id || null,
    record_type: "operations_log",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapOperationalAction(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    related_room_id: record.related_room_id || null,
    related_young_person_id: record.related_young_person_id || null,
    related_staff_id: record.related_staff_id || null,
    action_title: record.action_title || "",
    action_description: record.action_description || "",
    action_type: record.action_type || "",
    priority: record.priority || "",
    status: record.status || "",
    assigned_to_user_id: record.assigned_to_user_id || null,
    due_date: record.due_date || null,
    completed_at: record.completed_at || null,
    completed_by_user_id: record.completed_by_user_id || null,
    notes: record.notes || "",
    title: record.action_title || "Operational action",
    summary:
      record.action_description ||
      record.notes ||
      "Operational action recorded.",
    record_type: "operational_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapShiftLog(record = {}, sourceType = "shift_log") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    shift_date: record.shift_date || record.log_date || null,
    shift_type: record.shift_type || "",
    shift_lead_user_id: record.shift_lead_user_id || null,
    shift_lead_staff_id: record.shift_lead_staff_id || null,
    staffing_summary: record.staffing_summary || "",
    young_people_summary: record.young_people_summary || "",
    safeguarding_summary: record.safeguarding_summary || "",
    health_summary: record.health_summary || "",
    appointments_summary: record.appointments_summary || "",
    incidents_summary: record.incidents_summary || "",
    environment_summary: record.environment_summary || "",
    handover_notes: record.handover_notes || record.handover_summary || "",
    manager_attention_items:
      record.manager_attention_items || record.operational_priorities || "",
    status: record.status || "",
    title: `${titleCase(record.shift_type || "Shift")} shift log`,
    summary:
      record.handover_notes ||
      record.handover_summary ||
      record.staffing_summary ||
      "Shift log recorded.",
    record_type: "shift_log",
    source_type: sourceType,
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
    item.priority ||
    item.payment_status ||
    item.severity ||
    "";

  const primaryDate =
    item.reported_date ||
    item.check_date ||
    item.arrived_at ||
    item.transaction_date ||
    item.payment_date ||
    item.requested_date ||
    item.log_date ||
    item.shift_date ||
    item.due_at ||
    item.due_date ||
    item.created_at;

  return `
    <article ${buildCardAttrs(item)}>
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
            item.priority
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Priority</div>
                  <div class="details-grid-value">${safeText(titleCase(item.priority))}</div>
                </div>
              `
              : ""
          }

          ${
            item.check_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Check type</div>
                  <div class="details-grid-value">${safeText(titleCase(item.check_type))}</div>
                </div>
              `
              : ""
          }

          ${
            item.visitor_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Visitor type</div>
                  <div class="details-grid-value">${safeText(titleCase(item.visitor_type))}</div>
                </div>
              `
              : ""
          }

          ${
            item.registration_number
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Registration</div>
                  <div class="details-grid-value">${safeText(item.registration_number)}</div>
                </div>
              `
              : ""
          }

          ${
            item.destination
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Destination</div>
                  <div class="details-grid-value">${safeText(item.destination)}</div>
                </div>
              `
              : ""
          }

          ${
            item.target_completion_date || item.due_date || item.next_due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due</div>
                  <div class="details-grid-value">${safeText(formatDate(item.target_completion_date || item.due_date || item.next_due_date))}</div>
                </div>
              `
              : ""
          }

          ${
            item.amount !== null && item.amount !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Amount</div>
                  <div class="details-grid-value">£${safeText(toNumber(item.amount, 0).toFixed(2))}</div>
                </div>
              `
              : ""
          }

          ${
            item.source_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Source</div>
                  <div class="details-grid-value">${safeText(titleCase(item.source_type))}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.job_description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Description</div>
                <div>${safeText(item.job_description)}</div>
              </div>
            `
            : ""
        }

        ${
          item.findings
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Findings</div>
                <div>${safeText(item.findings)}</div>
              </div>
            `
            : ""
        }

        ${
          item.purpose_of_visit
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Purpose</div>
                <div>${safeText(item.purpose_of_visit)}</div>
              </div>
            `
            : ""
        }

        ${
          item.message
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Message</div>
                <div>${safeText(item.message)}</div>
              </div>
            `
            : ""
        }

        ${
          item.action_notes
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action notes</div>
                <div>${safeText(item.action_notes)}</div>
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
      "No operational activity",
      "No shift, maintenance, environment, visitor, vehicle or financial activity has been recorded yet."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.reported_date ||
            item.check_date ||
            item.arrived_at ||
            item.transaction_date ||
            item.payment_date ||
            item.requested_date ||
            item.log_date ||
            item.shift_date ||
            item.due_at ||
            item.created_at;

          const status =
            item.status ||
            item.priority ||
            item.payment_status ||
            item.severity ||
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
    openMaintenance,
    urgentNotifications,
    openOperationalActions,
    failedEnvironmentChecks,
    visitorActivity,
    dueVehicleChecks,
    recentFinance,
    recentShiftLogs,
    timeline,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Home operations</div>
          <h2>Environment, maintenance, visitors, vehicles, purchases and shift operations</h2>
          <p class="overview-panel-subtitle">
            Daily operational oversight for the home, including issues needing action and recent activity across the running of the service.
          </p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open maintenance", openMaintenance.length)}
        ${renderStatCard("Urgent notifications", urgentNotifications.length)}
        ${renderStatCard("Open operational actions", openOperationalActions.length)}
        ${renderStatCard("Environment concerns", failedEnvironmentChecks.length)}
        ${renderStatCard("Due vehicle checks", dueVehicleChecks.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Open maintenance",
            renderCardList(
              openMaintenance,
              "No open maintenance",
              "There are no open maintenance items recorded for this home."
            )
          )}

          ${renderSection(
            "Urgent operational notifications",
            renderCardList(
              urgentNotifications,
              "No urgent notifications",
              "There are no urgent operational notifications at the moment."
            )
          )}

          ${renderSection(
            "Open operational actions",
            renderCardList(
              openOperationalActions,
              "No open actions",
              "There are no open operational actions currently assigned."
            )
          )}

          ${renderSection("Operations timeline", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Environment checks needing action",
            renderCardList(
              failedEnvironmentChecks,
              "No current environment concerns",
              "Recent environment and safety checks do not show outstanding concerns."
            )
          )}

          ${renderSection(
            "Recent visitors",
            renderCardList(
              visitorActivity,
              "No recent visitors",
              "No visitor activity has been recorded recently."
            )
          )}

          ${renderSection(
            "Vehicle checks due or open",
            renderCardList(
              dueVehicleChecks,
              "No vehicle checks due",
              "There are no due or open vehicle check concerns."
            )
          )}

          ${renderSection(
            "Recent finance activity",
            renderCardList(
              recentFinance,
              "No finance activity",
              "No purchase, petty cash or allowance activity has been recorded recently."
            )
          )}

          ${renderSection(
            "Recent shift and operations logs",
            renderCardList(
              recentShiftLogs,
              "No recent shift logs",
              "No recent shift logs or operations logs were returned."
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
    maintenanceJobsRes,
    maintenanceRequestsRes,
    environmentChecksRes,
    premisesChecksRes,
    safetyChecksRes,
    healthSafetyChecksRes,
    visitorLogRes,
    homeVisitorsLogRes,
    homeVisitorsRes,
    vehiclesRes,
    vehicleChecksRes,
    vehicleJourneysRes,
    transportJourneysRes,
    inventoryRes,
    homeAssetsRes,
    premisesAssetsRes,
    purchaseRequestsRes,
    pettyCashRes,
    allowancePaymentsRes,
    notificationsRes,
    operationalNotificationsRes,
    homeNotificationsRes,
    operationsLogRes,
    operationalActionsRes,
    shiftLogsRes,
    homeShiftLogsRes,
    homeDailyLogsRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/maintenance-jobs`),
    safeGet(`/homes/${homeId}/maintenance-requests`),
    safeGet(`/homes/${homeId}/environment-checks`),
    safeGet(`/homes/${homeId}/premises-checks`),
    safeGet(`/homes/${homeId}/safety-checks`),
    safeGet(`/homes/${homeId}/health-safety-checks`),
    safeGet(`/homes/${homeId}/visitor-log`),
    safeGet(`/homes/${homeId}/home-visitors-log`),
    safeGet(`/homes/${homeId}/home-visitors`),
    safeGet(`/homes/${homeId}/vehicles`),
    safeGet(`/homes/${homeId}/vehicle-checks`),
    safeGet(`/homes/${homeId}/vehicle-journeys`),
    safeGet(`/homes/${homeId}/transport-journeys`),
    safeGet(`/homes/${homeId}/inventory-items`),
    safeGet(`/homes/${homeId}/home-assets`),
    safeGet(`/homes/${homeId}/premises-assets`),
    safeGet(`/homes/${homeId}/purchase-requests`),
    safeGet(`/homes/${homeId}/petty-cash-transactions`),
    safeGet(`/homes/${homeId}/allowance-payments`),
    safeGet(`/homes/${homeId}/notifications`),
    safeGet(`/homes/${homeId}/operational-notifications`),
    safeGet(`/homes/${homeId}/home-notifications`),
    safeGet(`/homes/${homeId}/home-operations-log`),
    safeGet(`/homes/${homeId}/home-operational-actions`),
    safeGet(`/homes/${homeId}/shift-logs`),
    safeGet(`/homes/${homeId}/home-shift-logs`),
    safeGet(`/homes/${homeId}/home-daily-logs`),
  ]);

  return {
    maintenanceJobs: [
      ...pickItems(maintenanceJobsRes, ["maintenance_jobs", "items"]).map((r) =>
        mapMaintenanceJob(r)
      ),
      ...pickItems(maintenanceRequestsRes, ["maintenance_requests", "items"]).map((r) =>
        mapMaintenanceJob(r)
      ),
    ],

    environmentChecks: [
      ...pickItems(environmentChecksRes, ["environment_checks", "items"]).map((r) =>
        mapEnvironmentCheck(r, "environment_check")
      ),
      ...pickItems(premisesChecksRes, ["premises_checks", "items"]).map((r) =>
        mapEnvironmentCheck(r, "premises_check")
      ),
      ...pickItems(safetyChecksRes, ["safety_checks", "items"]).map((r) =>
        mapEnvironmentCheck(r, "safety_check")
      ),
      ...pickItems(healthSafetyChecksRes, ["health_safety_checks", "items"]).map((r) =>
        mapEnvironmentCheck(r, "health_safety_check")
      ),
    ],

    visitors: [
      ...pickItems(visitorLogRes, ["visitor_log", "items"]).map((r) =>
        mapVisitor(r, "visitor_log")
      ),
      ...pickItems(homeVisitorsLogRes, ["home_visitors_log", "items"]).map((r) =>
        mapVisitor(r, "home_visitors_log")
      ),
      ...pickItems(homeVisitorsRes, ["home_visitors", "items"]).map((r) =>
        mapVisitor(r, "home_visitors")
      ),
    ],

    vehicles: pickItems(vehiclesRes, ["home_vehicles", "vehicles", "items"]).map(
      mapVehicle
    ),

    vehicleChecks: pickItems(vehicleChecksRes, ["vehicle_checks", "items"]).map(
      mapVehicleCheck
    ),

    vehicleJourneys: [
      ...pickItems(vehicleJourneysRes, ["vehicle_journeys", "items"]).map((r) =>
        mapVehicleJourney(r, "vehicle_journey")
      ),
      ...pickItems(transportJourneysRes, ["transport_journeys", "items"]).map((r) =>
        mapVehicleJourney(r, "transport_journey")
      ),
    ],

    inventory: [
      ...pickItems(inventoryRes, ["inventory_items", "items"]).map((r) =>
        mapInventoryItem(r, "inventory_item")
      ),
      ...pickItems(homeAssetsRes, ["home_assets", "items"]).map((r) =>
        mapInventoryItem(r, "home_asset")
      ),
      ...pickItems(premisesAssetsRes, ["premises_assets", "items"]).map((r) =>
        mapInventoryItem(r, "premises_asset")
      ),
    ],

    purchaseRequests: pickItems(
      purchaseRequestsRes,
      ["purchase_requests", "items"]
    ).map(mapPurchaseRequest),

    pettyCash: pickItems(pettyCashRes, ["petty_cash_transactions", "items"]).map(
      mapPettyCash
    ),

    allowancePayments: pickItems(
      allowancePaymentsRes,
      ["allowance_payments", "items"]
    ).map(mapAllowancePayment),

    notifications: [
      ...pickItems(notificationsRes, ["notifications", "items"]).map((r) =>
        mapOperationalNotification(r, "notification")
      ),
      ...pickItems(operationalNotificationsRes, ["operational_notifications", "items"]).map((r) =>
        mapOperationalNotification(r, "operational_notification")
      ),
      ...pickItems(homeNotificationsRes, ["home_notifications", "items"]).map((r) =>
        mapOperationalNotification(r, "home_notification")
      ),
    ],

    operationsLog: pickItems(
      operationsLogRes,
      ["home_operations_log", "items"]
    ).map(mapHomeOperationsLog),

    operationalActions: pickItems(
      operationalActionsRes,
      ["home_operational_actions", "items"]
    ).map(mapOperationalAction),

    shiftLogs: [
      ...pickItems(shiftLogsRes, ["shift_logs", "items"]).map((r) =>
        mapShiftLog(r, "shift_log")
      ),
      ...pickItems(homeShiftLogsRes, ["home_shift_logs", "items"]).map((r) =>
        mapShiftLog(r, "home_shift_log")
      ),
      ...pickItems(homeDailyLogsRes, ["home_daily_logs", "items"]).map((r) =>
        mapShiftLog(r, "home_daily_log")
      ),
    ],
  };
}

/* -------------------------------- builders -------------------------------- */

function buildOpenMaintenance(data) {
  return sortSoonest(
    data.maintenanceJobs.filter(
      (item) => !["completed", "cancelled", "resolved"].includes(lower(item.status))
    ),
    ["target_completion_date", "reported_date", "created_at", "updated_at"]
  ).slice(0, 12);
}

function buildUrgentNotifications(data) {
  return sortSoonest(
    data.notifications.filter((item) => {
      const severity = lower(item.severity);
      const status = lower(item.status);
      return (
        ["high", "critical", "urgent"].includes(severity) &&
        !["resolved", "closed", "dismissed", "completed"].includes(status)
      );
    }),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildOpenOperationalActions(data) {
  return sortSoonest(
    data.operationalActions.filter(
      (item) => !["completed", "cancelled", "closed"].includes(lower(item.status))
    ),
    ["due_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildFailedEnvironmentChecks(data) {
  return sortSoonest(
    data.environmentChecks.filter((item) => {
      const status = lower(item.status);
      return (
        item.action_required ||
        ["action_required", "action required", "urgent_action", "unsafe", "fail"].includes(status)
      );
    }),
    ["next_due_date", "check_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildVisitorActivity(data) {
  return sortNewest(data.visitors, ["arrived_at", "created_at", "updated_at"]).slice(0, 8);
}

function buildDueVehicleChecks(data) {
  return sortSoonest(
    data.vehicleChecks.filter((item) => {
      const status = lower(item.status);
      return ["action_required", "unsafe", "open", "warning", "fail"].includes(status);
    }),
    ["check_date", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildRecentFinance(data) {
  return sortNewest(
    [...data.purchaseRequests, ...data.pettyCash, ...data.allowancePayments],
    ["requested_date", "transaction_date", "payment_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildRecentShiftLogs(data) {
  return sortNewest(
    [...data.shiftLogs, ...data.operationsLog],
    ["shift_date", "log_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildTimeline(data) {
  return sortNewest(
    [
      ...data.maintenanceJobs,
      ...data.environmentChecks,
      ...data.visitors,
      ...data.vehicleChecks,
      ...data.vehicleJourneys,
      ...data.purchaseRequests,
      ...data.pettyCash,
      ...data.allowancePayments,
      ...data.notifications,
      ...data.operationalActions,
      ...data.operationsLog,
      ...data.shiftLogs,
    ],
    [
      "reported_date",
      "check_date",
      "arrived_at",
      "journey_date",
      "requested_date",
      "transaction_date",
      "payment_date",
      "log_date",
      "shift_date",
      "due_at",
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
      "Select a home to view operational activity."
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

    const openMaintenance = buildOpenMaintenance(data);
    const urgentNotifications = buildUrgentNotifications(data);
    const openOperationalActions = buildOpenOperationalActions(data);
    const failedEnvironmentChecks = buildFailedEnvironmentChecks(data);
    const visitorActivity = buildVisitorActivity(data);
    const dueVehicleChecks = buildDueVehicleChecks(data);
    const recentFinance = buildRecentFinance(data);
    const recentShiftLogs = buildRecentShiftLogs(data);
    const timeline = buildTimeline(data);

    const nextOpenAction =
      openOperationalActions.find((item) => item.due_date) ||
      openMaintenance.find((item) => item.target_completion_date) ||
      null;

    els.viewContent.innerHTML = renderWorkspace({
      openMaintenance,
      urgentNotifications,
      openOperationalActions,
      failedEnvironmentChecks,
      visitorActivity,
      dueVehicleChecks,
      recentFinance,
      recentShiftLogs,
      timeline,
    });

    updateWorkspaceSummaryStrip({
      today: `${openMaintenance.length} maintenance items open`,
      nextEvent: nextOpenAction
        ? formatDate(nextOpenAction.due_date || nextOpenAction.target_completion_date)
        : "No due action",
      lastRecord: timeline[0]
        ? formatDate(
            timeline[0].reported_date ||
              timeline[0].check_date ||
              timeline[0].arrived_at ||
              timeline[0].transaction_date ||
              timeline[0].payment_date ||
              timeline[0].log_date ||
              timeline[0].shift_date ||
              timeline[0].created_at
          )
        : "None",
      openActions: `${openOperationalActions.length} operational actions open`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load operations",
      "Something went wrong while loading operational records."
    );
  }
}
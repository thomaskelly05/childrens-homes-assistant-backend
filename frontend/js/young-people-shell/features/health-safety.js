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
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < now.getTime();
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

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
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

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "critical",
      "urgent",
      "unsafe",
      "high",
      "open",
      "overdue",
      "action_required",
      "fail",
      "failed",
      "danger",
      "requires_action",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "warning",
      "pending",
      "in_progress",
      "due",
      "review_due",
      "planned",
      "monitoring",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "pass",
      "completed",
      "resolved",
      "closed",
      "good",
      "low",
      "current",
      "safe",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function hasUsableData(data = {}) {
  return Object.values(data).some((value) => Array.isArray(value) && value.length > 0);
}

/* -------------------------------- mappers -------------------------------- */

function mapEnvironmentCheck(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    area_id: record.area_id || null,
    room_id: record.room_id || null,
    check_date: record.check_date || null,
    check_type: record.check_type || "",
    status: record.status || "",
    cleanliness_rating:
      record.cleanliness_rating === null || record.cleanliness_rating === undefined
        ? null
        : toNumber(record.cleanliness_rating, null),
    safety_rating:
      record.safety_rating === null || record.safety_rating === undefined
        ? null
        : toNumber(record.safety_rating, null),
    homeliness_rating:
      record.homeliness_rating === null || record.homeliness_rating === undefined
        ? null
        : toNumber(record.homeliness_rating, null),
    findings: record.findings || "",
    action_required: toBool(record.action_required),
    action_notes: record.action_notes || "",
    checked_by_user_id: record.checked_by_user_id || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: record.check_type ? titleCase(record.check_type) : "Environment check",
    summary: record.findings || record.action_notes || "Environment check recorded.",
    record_type: "environment_check",
  };
}

function mapHealthSafetyCheck(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    room_id: record.room_id || null,
    check_type: record.check_type || "",
    check_title: record.check_title || "",
    check_date: record.check_date || null,
    status: record.status || "",
    finding_summary: record.finding_summary || "",
    action_required: toBool(record.action_required),
    action_note: record.action_note || "",
    next_due_date: record.next_due_date || null,
    completed_by_user_id: record.completed_by_user_id || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: record.check_title || titleCase(record.check_type || "Health and safety check"),
    summary: record.finding_summary || record.action_note || "Health and safety check recorded.",
    record_type: "health_safety_check",
  };
}

function mapSafetyCheck(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    room_id: record.room_id || null,
    template_id: record.template_id || null,
    check_date: record.check_date || null,
    check_type: record.check_type || "",
    outcome_status: record.outcome_status || "",
    findings: record.findings || "",
    action_required: record.action_required || "",
    action_due_date: record.action_due_date || null,
    completed_by_user_id: record.completed_by_user_id || null,
    reviewed_by_user_id: record.reviewed_by_user_id || null,
    reviewed_at: record.reviewed_at || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: titleCase(record.check_type || "Safety check"),
    summary: record.findings || record.action_required || "Safety check recorded.",
    record_type: "safety_check",
  };
}

function mapFireSafetyCheck(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    check_date: record.check_date || null,
    check_type: record.check_type || "",
    area: record.area || "",
    equipment_checked: record.equipment_checked || "",
    outcome: record.outcome || "",
    issues_found: record.issues_found || "",
    actions_required: record.actions_required || "",
    next_due_date: record.next_due_date || null,
    completed_by: record.completed_by || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: titleCase(record.check_type || "Fire safety check"),
    summary:
      record.issues_found ||
      record.actions_required ||
      record.outcome ||
      "Fire safety check recorded.",
    record_type: "fire_safety_check",
  };
}

function mapFireDrill(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    drill_datetime: record.drill_datetime || null,
    shift_type: record.shift_type || "",
    evacuation_time_seconds:
      record.evacuation_time_seconds === null || record.evacuation_time_seconds === undefined
        ? null
        : toNumber(record.evacuation_time_seconds, null),
    issues_identified: record.issues_identified || "",
    learning_points: record.learning_points || "",
    follow_up_actions: record.follow_up_actions || "",
    completed_by_user_id: record.completed_by_user_id || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: "Fire drill",
    summary:
      record.issues_identified ||
      record.learning_points ||
      record.follow_up_actions ||
      "Fire drill recorded.",
    record_type: "fire_drill",
  };
}

function mapMaintenanceJob(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    area_id: record.area_id || null,
    room_id: record.room_id || null,
    job_title: record.job_title || record.title || "",
    job_description: record.job_description || record.description || "",
    reported_date: record.reported_date || record.reported_at || null,
    priority: record.priority || "",
    status: record.status || "",
    reported_by_user_id: record.reported_by_user_id || null,
    assigned_to_user_id: record.assigned_to_user_id || null,
    contractor_name: record.contractor_name || "",
    contractor_contact: record.contractor_contact || "",
    target_completion_date: record.target_completion_date || record.due_date || null,
    completed_date: record.completed_date || record.completed_at || null,
    completion_notes: record.completion_notes || "",
    cost_amount:
      record.cost_amount === null || record.cost_amount === undefined
        ? record.cost_estimate ?? null
        : record.cost_amount,
    notes: record.notes || "",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: record.job_title || record.title || "Maintenance job",
    summary:
      record.job_description ||
      record.description ||
      record.notes ||
      "Maintenance issue recorded.",
    record_type: "maintenance_job",
  };
}

function mapVisitorLog(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    visitor_name: record.visitor_name || "",
    organisation_name: record.organisation_name || "",
    visitor_type: record.visitor_type || "",
    purpose_of_visit: record.purpose_of_visit || "",
    arrived_at: record.arrived_at || record.arrival_time || null,
    departed_at: record.departed_at || record.departure_time || null,
    signed_in_by_user_id: record.signed_in_by_user_id || null,
    signed_out_by_user_id: record.signed_out_by_user_id || null,
    dbs_checked: toBool(record.dbs_checked),
    identification_seen: toBool(record.identification_seen || record.identity_checked),
    escorted: toBool(record.escorted || record.supervised_visit),
    notes: record.notes || "",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: record.visitor_name || "Visitor log",
    summary: record.purpose_of_visit || record.notes || "Visitor recorded.",
    record_type: "visitor_log",
  };
}

/* ------------------------------ fallback data ----------------------------- */

function buildFallbackData(homeId) {
  const now = new Date();

  const minusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const plusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return {
    environmentChecks: [
      mapEnvironmentCheck({
        id: "env-1",
        home_id: homeId,
        check_date: minusDays(1),
        check_type: "daily_environment",
        status: "action_required",
        findings: "Loose stair gate fitting identified.",
        action_required: true,
        action_notes: "Temporary control in place pending repair.",
      }),
    ],
    healthSafetyChecks: [
      mapHealthSafetyCheck({
        id: "hs-1",
        home_id: homeId,
        check_date: minusDays(2),
        check_title: "Weekly kitchen safety check",
        check_type: "kitchen_safety",
        status: "warning",
        finding_summary: "Cleaning cupboard lock needs replacement.",
        action_required: true,
        action_note: "Replace lock and confirm secure storage.",
        next_due_date: plusDays(5),
      }),
    ],
    safetyChecks: [
      mapSafetyCheck({
        id: "sc-1",
        home_id: homeId,
        check_date: minusDays(3),
        check_type: "window_restrictor_check",
        outcome_status: "pass",
        findings: "All restrictors in place.",
      }),
    ],
    fireSafetyChecks: [
      mapFireSafetyCheck({
        id: "fs-1",
        home_id: homeId,
        check_date: minusDays(4),
        check_type: "weekly_fire_alarm_test",
        outcome: "good",
        equipment_checked: "Panel and alarms",
        next_due_date: plusDays(3),
      }),
    ],
    fireDrills: [
      mapFireDrill({
        id: "fd-1",
        home_id: homeId,
        drill_datetime: minusDays(7, 19),
        shift_type: "evening",
        evacuation_time_seconds: 142,
        learning_points: "Reminder needed about rear assembly point route.",
      }),
    ],
    maintenanceJobs: [
      mapMaintenanceJob({
        id: "mj-1",
        home_id: homeId,
        job_title: "Replace stair gate fitting",
        job_description: "Repair required following safety check.",
        reported_date: minusDays(1),
        priority: "high",
        status: "open",
        target_completion_date: plusDays(2),
        contractor_name: "SafeHome Repairs",
      }),
    ],
    visitorLog: [
      mapVisitorLog({
        id: "vl-1",
        home_id: homeId,
        visitor_name: "IRO",
        organisation_name: "Local Authority",
        visitor_type: "professional",
        purpose_of_visit: "Review visit",
        arrived_at: minusDays(2, 14),
        departed_at: minusDays(2, 15),
        identification_seen: true,
      }),
    ],
    isFallback: true,
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

function renderSection(title, content, action = "") {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
        ${action ? `<div class="overview-panel-section-action">${action}</div>` : ""}
      </div>
      ${content}
    </section>
  `;
}

function renderRecordCard(item = {}) {
  const statusText =
    item.status ||
    item.outcome_status ||
    item.outcome ||
    item.priority ||
    (item.action_required ? "action required" : "recorded");

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
          <div class="record-card-meta">
            ${
              item.check_date
                ? `Date: ${safeText(formatDate(item.check_date))}`
                : item.drill_datetime
                  ? `Drill: ${safeText(formatDateTime(item.drill_datetime))}`
                  : item.arrived_at
                    ? `Arrival: ${safeText(formatDateTime(item.arrived_at))}`
                    : item.reported_date
                      ? `Reported: ${safeText(formatDate(item.reported_date))}`
                      : ""
            }
          </div>
        </div>
        <span class="${badgeClass(statusText)}">${safeText(titleCase(statusText))}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.next_due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Next due</div>
                  <div class="details-grid-value">${safeText(formatDate(item.next_due_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.action_due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Action due</div>
                  <div class="details-grid-value">${safeText(formatDate(item.action_due_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.target_completion_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Target completion</div>
                  <div class="details-grid-value">${safeText(formatDate(item.target_completion_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.completed_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Completed</div>
                  <div class="details-grid-value">${safeText(formatDate(item.completed_date))}</div>
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
            item.contractor_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Contractor</div>
                  <div class="details-grid-value">${safeText(item.contractor_name)}</div>
                </div>
              `
              : ""
          }
          ${
            Number.isFinite(item.evacuation_time_seconds) && item.evacuation_time_seconds !== null
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Evacuation time</div>
                  <div class="details-grid-value">${safeText(`${item.evacuation_time_seconds} sec`)}</div>
                </div>
              `
              : ""
          }
        </div>

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
          item.finding_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Finding summary</div>
                <div>${safeText(item.finding_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.issues_found
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Issues found</div>
                <div>${safeText(item.issues_found)}</div>
              </div>
            `
            : ""
        }

        ${
          item.action_notes || item.action_note || item.actions_required || item.action_required
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Actions</div>
                <div>${safeText(item.action_notes || item.action_note || item.actions_required || item.action_required)}</div>
              </div>
            `
            : ""
        }

        ${
          item.job_description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Job description</div>
                <div>${safeText(item.job_description)}</div>
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

  return `
    <div class="record-card-list">
      ${items.map((item) => renderRecordCard(item)).join("")}
    </div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No recent activity",
      "No recent health and safety activity has been recorded yet."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.check_date ||
            item.drill_datetime ||
            item.arrived_at ||
            item.reported_date ||
            item.created_at;

          const statusText =
            item.status ||
            item.outcome_status ||
            item.outcome ||
            item.priority ||
            (item.action_required ? "action required" : "recorded");

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  <span class="${badgeClass(statusText)}">${safeText(titleCase(statusText))}</span>
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
    urgentChecks,
    overdueChecks,
    openMaintenance,
    recentFire,
    recentVisitors,
    timeline,
    nextFireCheckDue,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Health and safety</div>
          <h2>Environment, fire, premises and visitor safety</h2>
          <p class="overview-panel-subtitle">
            Daily operational safety, premises oversight, maintenance follow-up and visitor monitoring.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live health and safety routes are fully available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Urgent safety items", urgentChecks.length)}
        ${renderStatCard("Overdue checks", overdueChecks.length)}
        ${renderStatCard("Open maintenance", openMaintenance.length)}
        ${renderStatCard("Recent fire records", recentFire.length)}
        ${renderStatCard(
          "Next due check",
          nextFireCheckDue ? formatDate(nextFireCheckDue) : "None due"
        )}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Urgent safety items",
            renderCardList(
              urgentChecks,
              "No urgent safety items",
              "There are no urgent or unsafe health and safety records right now."
            )
          )}

          ${renderSection(
            "Open maintenance",
            renderCardList(
              openMaintenance,
              "No open maintenance",
              "There are no open maintenance jobs at present."
            )
          )}

          ${renderSection("Recent activity", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Overdue checks",
            renderCardList(
              overdueChecks,
              "No overdue checks",
              "No health and safety checks appear overdue."
            )
          )}

          ${renderSection(
            "Fire safety and drills",
            renderCardList(
              recentFire,
              "No fire records",
              "No recent fire safety records have been found."
            )
          )}

          ${renderSection(
            "Recent visitors",
            renderCardList(
              recentVisitors,
              "No visitor records",
              "No recent visitors have been logged."
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
    environmentRes,
    healthSafetyRes,
    safetyRes,
    fireSafetyRes,
    fireDrillRes,
    maintenanceRes,
    visitorRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/environment-checks`),
    safeGet(`/homes/${homeId}/health-safety-checks`),
    safeGet(`/homes/${homeId}/safety-checks`),
    safeGet(`/homes/${homeId}/fire-safety-checks`),
    safeGet(`/homes/${homeId}/fire-drills`),
    safeGet(`/homes/${homeId}/maintenance-jobs`),
    safeGet(`/homes/${homeId}/visitor-log`),
  ]);

  const data = {
    environmentChecks: pickItems(environmentRes, [
      "environment_checks",
      "checks",
      "items",
    ]).map(mapEnvironmentCheck),

    healthSafetyChecks: pickItems(healthSafetyRes, [
      "health_safety_checks",
      "checks",
      "items",
    ]).map(mapHealthSafetyCheck),

    safetyChecks: pickItems(safetyRes, [
      "safety_checks",
      "checks",
      "items",
    ]).map(mapSafetyCheck),

    fireSafetyChecks: pickItems(fireSafetyRes, [
      "fire_safety_checks",
      "checks",
      "items",
    ]).map(mapFireSafetyCheck),

    fireDrills: pickItems(fireDrillRes, [
      "fire_drills",
      "drills",
      "items",
    ]).map(mapFireDrill),

    maintenanceJobs: pickItems(maintenanceRes, [
      "maintenance_jobs",
      "jobs",
      "items",
    ]).map(mapMaintenanceJob),

    visitorLog: pickItems(visitorRes, [
      "visitor_log",
      "visitors",
      "items",
    ]).map(mapVisitorLog),
  };

  if (!hasUsableData(data)) {
    return buildFallbackData(homeId);
  }

  return {
    ...data,
    isFallback: false,
  };
}

/* -------------------------------- builders -------------------------------- */

function buildUrgentChecks(data) {
  const urgent = [
    ...data.environmentChecks.filter(
      (item) =>
        item.action_required ||
        ["urgent_action", "unsafe", "critical", "action_required"].includes(
          lower(item.status)
        )
    ),
    ...data.healthSafetyChecks.filter(
      (item) =>
        item.action_required ||
        ["urgent", "unsafe", "critical", "fail", "action_required"].includes(
          lower(item.status)
        )
    ),
    ...data.safetyChecks.filter(
      (item) =>
        ["overdue", "failed", "fail", "unsafe", "critical"].includes(
          lower(item.outcome_status)
        ) || Boolean(item.action_required)
    ),
    ...data.fireSafetyChecks.filter(
      (item) =>
        Boolean(item.issues_found) ||
        Boolean(item.actions_required) ||
        ["fail", "action_required", "urgent"].includes(lower(item.outcome))
    ),
  ];

  return sortNewest(urgent, ["check_date", "created_at", "updated_at"]).slice(0, 12);
}

function buildOverdueChecks(data) {
  const overdue = [
    ...data.healthSafetyChecks.filter((item) => isOverdue(item.next_due_date)),
    ...data.safetyChecks.filter((item) => isOverdue(item.action_due_date)),
    ...data.fireSafetyChecks.filter((item) => isOverdue(item.next_due_date)),
  ];

  return sortNewest(overdue, ["next_due_date", "action_due_date", "check_date"]).slice(0, 10);
}

function buildOpenMaintenance(data) {
  return sortNewest(
    data.maintenanceJobs.filter(
      (item) => !["completed", "cancelled", "resolved", "closed"].includes(lower(item.status))
    ),
    ["reported_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildRecentFire(data) {
  return sortNewest(
    [...data.fireSafetyChecks, ...data.fireDrills],
    ["check_date", "drill_datetime", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildRecentVisitors(data) {
  return sortNewest(data.visitorLog, ["arrived_at", "created_at", "updated_at"]).slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    [
      ...data.environmentChecks,
      ...data.healthSafetyChecks,
      ...data.safetyChecks,
      ...data.fireSafetyChecks,
      ...data.fireDrills,
      ...data.maintenanceJobs,
      ...data.visitorLog,
    ],
    ["check_date", "drill_datetime", "arrived_at", "reported_date", "created_at", "updated_at"]
  ).slice(0, 20);
}

function buildNextFireCheckDue(data) {
  const candidates = [
    ...data.fireSafetyChecks.map((item) => item.next_due_date).filter(Boolean),
    ...data.healthSafetyChecks
      .filter((item) => lower(item.check_type).includes("fire"))
      .map((item) => item.next_due_date)
      .filter(Boolean),
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return candidates[0] || null;
}

/* -------------------------------- public -------------------------------- */

export async function loadHealthSafety() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = renderEmpty(
      "No home selected",
      "Select a home to view health and safety information."
    );

    updateWorkspaceSummaryStrip({
      today: "No home context",
      nextEvent: "No due check",
      lastRecord: "No health and safety data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading health and safety...</p>
        </div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(homeId);

    const urgentChecks = buildUrgentChecks(data);
    const overdueChecks = buildOverdueChecks(data);
    const openMaintenance = buildOpenMaintenance(data);
    const recentFire = buildRecentFire(data);
    const recentVisitors = buildRecentVisitors(data);
    const timeline = buildTimeline(data);
    const nextFireCheckDue = buildNextFireCheckDue(data);

    els.viewContent.innerHTML = renderWorkspace({
      urgentChecks,
      overdueChecks,
      openMaintenance,
      recentFire,
      recentVisitors,
      timeline,
      nextFireCheckDue,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${urgentChecks.length} urgent items • preview mode`
        : `${urgentChecks.length} urgent items`,
      nextEvent: nextFireCheckDue ? formatDate(nextFireCheckDue) : "No due check",
      lastRecord: timeline[0]
        ? formatDate(
            timeline[0].check_date ||
              timeline[0].reported_date ||
              timeline[0].arrived_at ||
              timeline[0].drill_datetime ||
              timeline[0].created_at
          )
        : "None",
      openActions: `${openMaintenance.length} maintenance open`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[health-safety] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load health and safety",
      error?.message || "Something went wrong while loading health and safety records."
    );

    updateWorkspaceSummaryStrip({
      today: "Health and safety unavailable",
      nextEvent: "No due check",
      lastRecord: "No health and safety data",
      openActions: "Check safety routes",
    });
  }
}

export async function loadCurrentView() {
  return loadHealthSafety();
}
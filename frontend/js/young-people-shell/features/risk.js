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

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
  );
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

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

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    const aTime = aValue ? toTime(aValue) : Number.POSITIVE_INFINITY;
    const bTime = bValue ? toTime(bValue) : Number.POSITIVE_INFINITY;
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
      "overdue",
      "open",
      "escalated",
      "not_safe",
      "unsafe",
      "active",
      "red",
      "danger",
      "failed",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "warning",
      "review_due",
      "due_soon",
      "pending",
      "monitoring",
      "planned",
      "in_progress",
      "amber",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "low",
      "completed",
      "closed",
      "resolved",
      "current",
      "good",
      "green",
      "safe",
      "archived",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
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

function hasUsableData(data = {}) {
  return Object.values(data).some(
    (value) =>
      (Array.isArray(value) && value.length > 0) ||
      (value && typeof value === "object" && !Array.isArray(value))
  );
}

/* -------------------------------- mappers -------------------------------- */

function mapRiskAssessment(record = {}) {
  return {
    id: record.id ?? record.risk_assessment_id ?? null,
    young_person_id: record.young_person_id || null,
    title:
      record.title ||
      record.risk_title ||
      record.risk_name ||
      "Risk assessment",
    category:
      record.category ||
      record.risk_category ||
      record.domain ||
      "",
    severity:
      record.severity ||
      record.risk_level ||
      record.level ||
      "",
    status: record.status || "active",
    reviewed_at: record.reviewed_at || record.last_reviewed_at || null,
    next_review_date:
      record.next_review_date ||
      record.review_due_date ||
      record.due_date ||
      null,
    created_by_user_id: record.created_by_user_id || null,
    summary:
      record.summary ||
      record.risk_description ||
      record.description ||
      "Risk assessment recorded.",
    triggers:
      record.triggers ||
      record.known_triggers ||
      "",
    protective_factors:
      record.protective_factors ||
      record.strengths ||
      "",
    coping_strategies:
      record.coping_strategies ||
      record.support_strategies ||
      "",
    warning_signs:
      record.warning_signs ||
      "",
    record_type: "risk_assessment",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapRiskAction(record = {}) {
  return {
    id: record.id ?? record.risk_action_id ?? null,
    young_person_id: record.young_person_id || null,
    risk_assessment_id: record.risk_assessment_id || null,
    title:
      record.title ||
      record.action_title ||
      "Risk action",
    action_description:
      record.action_description ||
      record.description ||
      record.notes ||
      "",
    owner_name:
      record.owner_name ||
      record.assigned_to_name ||
      record.staff_member ||
      "",
    priority: record.priority || "",
    status: record.status || "open",
    due_date: record.due_date || null,
    completed_at: record.completed_at || null,
    summary:
      record.summary ||
      record.action_description ||
      record.notes ||
      "Risk action recorded.",
    record_type: "risk_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapMissingEpisode(record = {}) {
  return {
    id: record.id ?? record.missing_episode_id ?? null,
    young_person_id: record.young_person_id || null,
    title: "Missing episode",
    episode_start:
      record.episode_start ||
      record.start_time ||
      record.missing_from ||
      null,
    episode_end:
      record.episode_end ||
      record.end_time ||
      record.returned_at ||
      null,
    status: record.status || (record.episode_end ? "completed" : "open"),
    location_found:
      record.location_found ||
      record.return_location ||
      "",
    summary:
      record.summary ||
      record.notes ||
      record.context ||
      "Missing from care episode recorded.",
    risk_level:
      record.risk_level ||
      record.severity ||
      "",
    record_type: "missing_episode",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapSafeguardingConcern(record = {}) {
  return {
    id: record.id ?? record.concern_id ?? null,
    young_person_id: record.young_person_id || null,
    title:
      record.title ||
      record.concern_type ||
      "Safeguarding concern",
    concern_type:
      record.concern_type ||
      record.category ||
      "",
    severity:
      record.severity ||
      record.risk_level ||
      "",
    status: record.status || "open",
    reported_at:
      record.reported_at ||
      record.concern_date ||
      record.created_at ||
      null,
    summary:
      record.summary ||
      record.concern_details ||
      record.description ||
      "Safeguarding concern recorded.",
    record_type: "safeguarding_concern",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapIncident(record = {}) {
  return {
    id: record.id ?? record.incident_id ?? null,
    young_person_id: record.young_person_id || null,
    title:
      record.title ||
      record.incident_type ||
      "Incident",
    incident_type:
      record.incident_type ||
      record.category ||
      "",
    severity:
      record.severity ||
      record.risk_level ||
      "",
    status: record.status || "recorded",
    occurred_at:
      record.occurred_at ||
      record.incident_date ||
      record.created_at ||
      null,
    summary:
      record.summary ||
      record.description ||
      record.notes ||
      "Incident recorded.",
    record_type: "incident",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapNotification(record = {}) {
  return {
    id: record.id ?? null,
    young_person_id: record.young_person_id || null,
    title: record.title || "Notification",
    severity: record.severity || "",
    status: record.status || "open",
    due_at: record.due_at || null,
    summary:
      record.summary ||
      record.message ||
      record.notes ||
      "Notification recorded.",
    record_type: "notification",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

/* ------------------------------ fallback data ----------------------------- */

function buildFallbackData(youngPersonId) {
  const now = new Date();

  const minusDays = (days, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const plusDays = (days, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const youngPersonName =
    state.selectedYoungPerson?.preferred_name ||
    state.selectedYoungPerson?.first_name ||
    state.selectedYoungPerson?.full_name ||
    "Young person";

  return {
    summary: {
      title: `${youngPersonName} risk`,
      risk_level: "high",
    },

    riskAssessments: [
      mapRiskAssessment({
        id: "risk-1",
        young_person_id: youngPersonId,
        title: "Missing from care",
        category: "missing_from_care",
        severity: "high",
        status: "active",
        reviewed_at: minusDays(3),
        next_review_date: plusDays(4),
        summary:
          "Heightened vulnerability when distressed and more likely to leave without informing staff after family upset.",
        triggers: "Family contact upset, peer conflict, feeling overwhelmed",
        protective_factors: "Responds to calm adult support and familiar routines",
        coping_strategies: "Offer low-arousal support, clear options and walk-and-talk",
        warning_signs: "Pacing, shutting down, packing belongings",
      }),
      mapRiskAssessment({
        id: "risk-2",
        young_person_id: youngPersonId,
        title: "Self-harm thoughts",
        category: "self_harm",
        severity: "medium",
        status: "active",
        reviewed_at: minusDays(7),
        next_review_date: plusDays(2),
        summary:
          "Historical thoughts when feeling rejected or low in mood. Current presentation more stable but still needs monitoring.",
        triggers: "Feelings of rejection, difficult phone calls, disrupted sleep",
        protective_factors: "Positive relationships with staff, distraction plans",
      }),
    ],

    riskActions: [
      mapRiskAction({
        id: "risk-action-1",
        young_person_id: youngPersonId,
        risk_assessment_id: "risk-1",
        title: "Update return-home prompt questions",
        action_description:
          "Refresh return-home prompts so staff capture triggers, locations and protective responses consistently.",
        owner_name: "Keyworker",
        priority: "high",
        status: "open",
        due_date: plusDays(2),
      }),
      mapRiskAction({
        id: "risk-action-2",
        young_person_id: youngPersonId,
        risk_assessment_id: "risk-2",
        title: "Review coping plan with therapist",
        action_description:
          "Ensure current coping strategies remain relevant and understood by the team.",
        owner_name: "Therapist",
        priority: "medium",
        status: "in_progress",
        due_date: plusDays(5),
      }),
    ],

    missingEpisodes: [
      mapMissingEpisode({
        id: "missing-1",
        young_person_id: youngPersonId,
        episode_start: minusDays(12, 18),
        episode_end: minusDays(12, 21),
        status: "completed",
        location_found: "Friend's address",
        risk_level: "high",
        summary:
          "Left following difficult family call. Returned safely after staff and police welfare checks.",
      }),
    ],

    safeguardingConcerns: [
      mapSafeguardingConcern({
        id: "sg-1",
        young_person_id: youngPersonId,
        title: "Peer exploitation concern",
        concern_type: "contextual_safeguarding",
        severity: "high",
        status: "open",
        reported_at: minusDays(6, 15),
        summary:
          "Ongoing concern around influence from older peers in the community.",
      }),
    ],

    incidents: [
      mapIncident({
        id: "inc-1",
        young_person_id: youngPersonId,
        title: "Escalation after family contact",
        incident_type: "behaviour",
        severity: "medium",
        status: "recorded",
        occurred_at: minusDays(2, 19),
        summary:
          "Increased distress, verbal escalation and attempts to leave the home.",
      }),
      mapIncident({
        id: "inc-2",
        young_person_id: youngPersonId,
        title: "Night-time low mood presentation",
        incident_type: "emotional_wellbeing",
        severity: "medium",
        status: "recorded",
        occurred_at: minusDays(4, 22),
        summary:
          "Requested one-to-one support and settled after reflective conversation.",
      }),
    ],

    notifications: [
      mapNotification({
        id: "notif-1",
        young_person_id: youngPersonId,
        title: "Risk review due this week",
        severity: "warning",
        status: "open",
        due_at: plusDays(2),
        summary: "Missing from care risk assessment review is due.",
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

function renderRecordCard(item = {}) {
  const status =
    item.status ||
    item.severity ||
    item.priority ||
    item.risk_level ||
    "recorded";

  const primaryDate =
    item.next_review_date ||
    item.due_date ||
    item.reported_at ||
    item.occurred_at ||
    item.episode_start ||
    item.reviewed_at ||
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
        <span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.category
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Category</div>
                  <div class="details-grid-value">${safeText(titleCase(item.category))}</div>
                </div>
              `
              : ""
          }

          ${
            item.concern_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Concern type</div>
                  <div class="details-grid-value">${safeText(titleCase(item.concern_type))}</div>
                </div>
              `
              : ""
          }

          ${
            item.owner_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">${safeText(item.owner_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.next_review_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Next review</div>
                  <div class="details-grid-value ${isOverdue(item.next_review_date) ? "text-danger" : ""}">
                    ${safeText(formatDate(item.next_review_date))}
                  </div>
                </div>
              `
              : ""
          }

          ${
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due</div>
                  <div class="details-grid-value ${isOverdue(item.due_date) ? "text-danger" : ""}">
                    ${safeText(formatDate(item.due_date))}
                  </div>
                </div>
              `
              : ""
          }

          ${
            item.location_found
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Location found</div>
                  <div class="details-grid-value">${safeText(item.location_found)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.triggers
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Triggers</div>
                <div>${safeText(item.triggers)}</div>
              </div>
            `
            : ""
        }

        ${
          item.warning_signs
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Warning signs</div>
                <div>${safeText(item.warning_signs)}</div>
              </div>
            `
            : ""
        }

        ${
          item.protective_factors
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Protective factors</div>
                <div>${safeText(item.protective_factors)}</div>
              </div>
            `
            : ""
        }

        ${
          item.coping_strategies
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Coping / support strategies</div>
                <div>${safeText(item.coping_strategies)}</div>
              </div>
            `
            : ""
        }

        ${
          item.action_description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action</div>
                <div>${safeText(item.action_description)}</div>
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
  return `<div class="record-card-list">${items.map(renderRecordCard).join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No recent risk activity",
      "There is no recent risk-related activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.occurred_at ||
            item.reported_at ||
            item.episode_start ||
            item.reviewed_at ||
            item.created_at;

          const status =
            item.status ||
            item.severity ||
            item.risk_level ||
            item.priority ||
            "recorded";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  <span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>
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
    activeRisks,
    riskActions,
    missingEpisodes,
    safeguardingConcerns,
    incidents,
    overdueReviews,
    notifications,
    timeline,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Risk and safety</div>
          <h2>Risk assessments, concerns, incidents and live actions</h2>
          <p class="overview-panel-subtitle">
            A child-focused view of current risks, live actions, safeguarding concerns and recent significant events.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live risk routes are fully available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Active risks", activeRisks.length)}
        ${renderStatCard("Risk actions", riskActions.length)}
        ${renderStatCard("Overdue reviews", overdueReviews.length)}
        ${renderStatCard("Safeguarding concerns", safeguardingConcerns.length)}
        ${renderStatCard("Recent incidents", incidents.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Active risk assessments",
            renderCardList(
              activeRisks,
              "No active risks",
              "There are no active risk assessments recorded."
            )
          )}

          ${renderSection(
            "Risk actions and controls",
            renderCardList(
              riskActions,
              "No risk actions",
              "There are no open risk actions currently recorded."
            )
          )}

          ${renderSection(
            "Risk activity timeline",
            renderTimeline(timeline)
          )}
        </div>

        <aside>
          ${renderSection(
            "Overdue or due reviews",
            renderCardList(
              overdueReviews,
              "No reviews due",
              "There are no overdue or imminent risk reviews."
            )
          )}

          ${renderSection(
            "Safeguarding concerns",
            renderCardList(
              safeguardingConcerns,
              "No safeguarding concerns",
              "No current safeguarding concerns are showing."
            )
          )}

          ${renderSection(
            "Missing from care episodes",
            renderCardList(
              missingEpisodes,
              "No missing episodes",
              "No missing from care episodes are recorded."
            )
          )}

          ${renderSection(
            "Notifications",
            renderCardList(
              notifications,
              "No notifications",
              "There are no current risk-related notifications."
            )
          )}

          ${renderSection(
            "Recent incidents",
            renderCardList(
              incidents,
              "No recent incidents",
              "No recent incidents are recorded."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- fetch -------------------------------- */

async function fetchAll(youngPersonId) {
  const [
    riskAssessmentsRes,
    riskActionsRes,
    missingEpisodesRes,
    safeguardingConcernsRes,
    incidentsRes,
    notificationsRes,
  ] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/risk-assessments`),
    safeGet(`/young-people/${youngPersonId}/risk-actions`),
    safeGet(`/young-people/${youngPersonId}/missing-from-care`),
    safeGet(`/young-people/${youngPersonId}/safeguarding-concerns`),
    safeGet(`/young-people/${youngPersonId}/incidents`),
    safeGet(`/young-people/${youngPersonId}/notifications`),
  ]);

  const data = {
    riskAssessments: pickItems(riskAssessmentsRes, [
      "risk_assessments",
      "risk",
      "items",
    ]).map(mapRiskAssessment),

    riskActions: pickItems(riskActionsRes, [
      "risk_actions",
      "actions",
      "items",
    ]).map(mapRiskAction),

    missingEpisodes: pickItems(missingEpisodesRes, [
      "missing_episodes",
      "episodes",
      "items",
    ]).map(mapMissingEpisode),

    safeguardingConcerns: pickItems(safeguardingConcernsRes, [
      "safeguarding_concerns",
      "concerns",
      "items",
    ]).map(mapSafeguardingConcern),

    incidents: pickItems(incidentsRes, [
      "incidents",
      "items",
    ]).map(mapIncident),

    notifications: pickItems(notificationsRes, [
      "notifications",
      "items",
    ]).map(mapNotification),
  };

  if (!hasUsableData(data)) {
    return buildFallbackData(youngPersonId);
  }

  return {
    ...data,
    isFallback: false,
  };
}

/* -------------------------------- builders -------------------------------- */

function buildActiveRisks(data) {
  return sortSoonest(
    data.riskAssessments.filter((item) => {
      const status = lower(item.status);
      return !["closed", "archived", "resolved"].includes(status);
    }),
    ["next_review_date", "reviewed_at", "updated_at", "created_at"]
  ).slice(0, 10);
}

function buildRiskActions(data) {
  return sortSoonest(
    data.riskActions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled", "resolved"].includes(status);
    }),
    ["due_date", "updated_at", "created_at"]
  ).slice(0, 10);
}

function buildMissingEpisodes(data) {
  return sortNewest(data.missingEpisodes, [
    "episode_start",
    "episode_end",
    "created_at",
    "updated_at",
  ]).slice(0, 8);
}

function buildSafeguardingConcerns(data) {
  return sortNewest(
    data.safeguardingConcerns.filter((item) => {
      const status = lower(item.status);
      return !["closed", "resolved", "archived"].includes(status);
    }),
    ["reported_at", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildRecentIncidents(data) {
  return sortNewest(data.incidents, [
    "occurred_at",
    "created_at",
    "updated_at",
  ]).slice(0, 8);
}

function buildOverdueReviews(data) {
  return sortSoonest(
    data.riskAssessments.filter((item) => {
      const status = lower(item.status);
      return (
        !["closed", "archived", "resolved"].includes(status) &&
        (isOverdue(item.next_review_date) || ["review_due", "due_soon"].includes(status))
      );
    }),
    ["next_review_date", "updated_at", "created_at"]
  ).slice(0, 8);
}

function buildNotifications(data) {
  return sortSoonest(
    data.notifications.filter((item) => {
      const status = lower(item.status);
      return !["resolved", "closed", "dismissed"].includes(status);
    }),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    [
      ...data.incidents,
      ...data.safeguardingConcerns,
      ...data.missingEpisodes,
      ...data.riskAssessments,
      ...data.riskActions,
      ...data.notifications,
    ],
    [
      "occurred_at",
      "reported_at",
      "episode_start",
      "reviewed_at",
      "due_date",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 20);
}

/* -------------------------------- public -------------------------------- */

export async function loadRisk() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a child or young person to view risk information."
    );

    updateWorkspaceSummaryStrip({
      today: "No risk context",
      nextEvent: "No risk review due",
      lastRecord: "No risk data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading risk...</p>
        </div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const activeRisks = buildActiveRisks(data);
    const riskActions = buildRiskActions(data);
    const missingEpisodes = buildMissingEpisodes(data);
    const safeguardingConcerns = buildSafeguardingConcerns(data);
    const incidents = buildRecentIncidents(data);
    const overdueReviews = buildOverdueReviews(data);
    const notifications = buildNotifications(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      activeRisks,
      riskActions,
      missingEpisodes,
      safeguardingConcerns,
      incidents,
      overdueReviews,
      notifications,
      timeline,
      isFallback: Boolean(data.isFallback),
    });

    const nextReview =
      overdueReviews[0]?.next_review_date ||
      activeRisks[0]?.next_review_date ||
      riskActions[0]?.due_date ||
      notifications[0]?.due_at ||
      null;

    const latestActivity =
      timeline[0]?.occurred_at ||
      timeline[0]?.reported_at ||
      timeline[0]?.episode_start ||
      timeline[0]?.created_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${activeRisks.length} active risks • preview mode`
        : `${activeRisks.length} active risks`,
      nextEvent: nextReview
        ? `Next review ${formatDate(nextReview)}`
        : "No risk review due",
      lastRecord: latestActivity
        ? `Latest risk activity ${formatDateTime(latestActivity)}`
        : "No recent risk activity",
      openActions: `${riskActions.length} actions • ${safeguardingConcerns.length} safeguarding`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[risk] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load risk",
      error?.message || "Something went wrong while loading risk information."
    );

    updateWorkspaceSummaryStrip({
      today: "Risk unavailable",
      nextEvent: "No risk review due",
      lastRecord: "No risk data",
      openActions: "Check risk routes",
    });
  }
}
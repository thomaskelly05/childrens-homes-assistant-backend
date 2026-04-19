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

function toBool(value) {
  return Boolean(value);
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
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
      "open",
      "overdue",
      "escalated",
      "strategy_required",
      "unsafe",
      "red",
      "danger",
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
      "review_due",
      "due_soon",
      "monitoring",
      "planned",
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
      "recorded",
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
  return Object.values(data).some((value) => Array.isArray(value) && value.length > 0);
}

/* -------------------------------- mappers -------------------------------- */

function mapConcern(record = {}) {
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
      record.type ||
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
    referrer:
      record.referrer ||
      record.reported_by_name ||
      "",
    record_type: "safeguarding_concern",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAction(record = {}) {
  return {
    id: record.id ?? record.safeguarding_action_id ?? null,
    young_person_id: record.young_person_id || null,
    concern_id: record.concern_id || record.safeguarding_concern_id || null,
    title:
      record.title ||
      record.action_title ||
      "Safeguarding action",
    action_description:
      record.action_description ||
      record.description ||
      record.notes ||
      "",
    owner_name:
      record.owner_name ||
      record.assigned_to_name ||
      "",
    priority: record.priority || "",
    status: record.status || "open",
    due_date: record.due_date || null,
    completed_at: record.completed_at || null,
    summary:
      record.summary ||
      record.action_description ||
      record.notes ||
      "Safeguarding action recorded.",
    record_type: "safeguarding_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReferral(record = {}) {
  return {
    id: record.id ?? record.referral_id ?? null,
    young_person_id: record.young_person_id || null,
    title:
      record.title ||
      record.referral_type ||
      "Safeguarding referral",
    referral_type:
      record.referral_type ||
      record.category ||
      "",
    agency:
      record.agency ||
      record.team_name ||
      "",
    status: record.status || "submitted",
    referred_at:
      record.referred_at ||
      record.created_at ||
      null,
    outcome:
      record.outcome ||
      "",
    summary:
      record.summary ||
      record.reason ||
      record.notes ||
      "Safeguarding referral recorded.",
    record_type: "safeguarding_referral",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapStrategyMeeting(record = {}) {
  return {
    id: record.id ?? record.strategy_meeting_id ?? null,
    young_person_id: record.young_person_id || null,
    title:
      record.title ||
      "Strategy meeting",
    meeting_date:
      record.meeting_date ||
      record.scheduled_at ||
      null,
    chair_name:
      record.chair_name ||
      "",
    status: record.status || "planned",
    outcome:
      record.outcome ||
      "",
    summary:
      record.summary ||
      record.notes ||
      "Strategy meeting recorded.",
    record_type: "strategy_meeting",
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

function mapChronology(record = {}) {
  return {
    id: record.id ?? record.event_id ?? null,
    young_person_id: record.young_person_id || null,
    title:
      record.title ||
      record.event_type ||
      "Chronology event",
    event_type:
      record.event_type ||
      record.category ||
      "",
    status:
      record.status ||
      record.severity ||
      "recorded",
    occurred_at:
      record.occurred_at ||
      record.event_date ||
      record.created_at ||
      null,
    summary:
      record.summary ||
      record.description ||
      record.notes ||
      "Safeguarding chronology event recorded.",
    record_type: "safeguarding_event",
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

  return {
    concerns: [
      mapConcern({
        id: "sgc-1",
        young_person_id: youngPersonId,
        title: "Community exploitation concern",
        concern_type: "contextual_safeguarding",
        severity: "high",
        status: "open",
        reported_at: minusDays(5, 16),
        summary:
          "Concerns remain around contact with older peers and possible exploitation risk in the community.",
        referrer: "Home team",
      }),
      mapConcern({
        id: "sgc-2",
        young_person_id: youngPersonId,
        title: "Online safety concern",
        concern_type: "online_safety",
        severity: "medium",
        status: "monitoring",
        reported_at: minusDays(10, 19),
        summary:
          "Worry about contact with unknown adults through social media accounts.",
        referrer: "Keyworker",
      }),
    ],

    actions: [
      mapAction({
        id: "sga-1",
        young_person_id: youngPersonId,
        concern_id: "sgc-1",
        title: "Update contextual safeguarding plan",
        action_description:
          "Review hotspots, peer mapping and agreed disruption actions with the team.",
        owner_name: "Registered Manager",
        priority: "high",
        status: "open",
        due_date: plusDays(2),
      }),
      mapAction({
        id: "sga-2",
        young_person_id: youngPersonId,
        concern_id: "sgc-2",
        title: "Complete online safety direct work",
        action_description:
          "Undertake focused direct work around contact requests, privacy and safe reporting.",
        owner_name: "Keyworker",
        priority: "medium",
        status: "in_progress",
        due_date: plusDays(4),
      }),
    ],

    referrals: [
      mapReferral({
        id: "sgr-1",
        young_person_id: youngPersonId,
        title: "Contextual safeguarding referral",
        referral_type: "multi_agency_referral",
        agency: "MASH",
        status: "submitted",
        referred_at: minusDays(4, 12),
        outcome: "Awaiting screening outcome",
        summary:
          "Referral shared due to escalating concern about peer influence and locations frequented.",
      }),
    ],

    strategyMeetings: [
      mapStrategyMeeting({
        id: "sgm-1",
        young_person_id: youngPersonId,
        meeting_date: plusDays(3, 14),
        chair_name: "Social Worker",
        status: "planned",
        summary:
          "Strategy discussion planned to review current concern, disruption and information sharing.",
      }),
    ],

    notifications: [
      mapNotification({
        id: "sgn-1",
        young_person_id: youngPersonId,
        title: "Safeguarding action due",
        severity: "warning",
        status: "open",
        due_at: plusDays(2),
        summary: "Contextual safeguarding plan review is due this week.",
      }),
    ],

    chronology: [
      mapChronology({
        id: "sge-1",
        young_person_id: youngPersonId,
        title: "Phone contact from unknown adult",
        event_type: "online_safety",
        status: "warning",
        occurred_at: minusDays(6, 21),
        summary:
          "Young person disclosed contact attempt from an unknown adult account.",
      }),
      mapChronology({
        id: "sge-2",
        young_person_id: youngPersonId,
        title: "Returned late from community",
        event_type: "community_risk",
        status: "high",
        occurred_at: minusDays(3, 20),
        summary:
          "Returned later than agreed and initially reluctant to share whereabouts.",
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
    "recorded";

  const primaryDate =
    item.due_date ||
    item.meeting_date ||
    item.referred_at ||
    item.reported_at ||
    item.occurred_at ||
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
            item.agency
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Agency</div>
                  <div class="details-grid-value">${safeText(item.agency)}</div>
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
            item.meeting_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Meeting date</div>
                  <div class="details-grid-value">${safeText(formatDate(item.meeting_date))}</div>
                </div>
              `
              : ""
          }

          ${
            item.referrer
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Raised by</div>
                  <div class="details-grid-value">${safeText(item.referrer)}</div>
                </div>
              `
              : ""
          }
        </div>

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

        ${
          item.outcome
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Outcome</div>
                <div>${safeText(item.outcome)}</div>
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
      "No recent safeguarding activity",
      "There is no recent safeguarding activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.occurred_at ||
            item.reported_at ||
            item.referred_at ||
            item.meeting_date ||
            item.created_at;

          const status =
            item.status ||
            item.severity ||
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
    openConcerns,
    openActions,
    overdueActions,
    referrals,
    strategyMeetings,
    notifications,
    chronology,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Safeguarding</div>
          <h2>Concerns, referrals, strategy work and live safeguarding actions</h2>
          <p class="overview-panel-subtitle">
            A clear view of current safeguarding concerns, live responses, referral activity and multi-agency coordination.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live safeguarding routes are fully available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open concerns", openConcerns.length)}
        ${renderStatCard("Open actions", openActions.length)}
        ${renderStatCard("Overdue actions", overdueActions.length)}
        ${renderStatCard("Referrals", referrals.length)}
        ${renderStatCard("Strategy meetings", strategyMeetings.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Open safeguarding concerns",
            renderCardList(
              openConcerns,
              "No open concerns",
              "There are no current open safeguarding concerns."
            )
          )}

          ${renderSection(
            "Safeguarding actions",
            renderCardList(
              openActions,
              "No open actions",
              "There are no open safeguarding actions right now."
            )
          )}

          ${renderSection(
            "Safeguarding chronology",
            renderTimeline(chronology)
          )}
        </div>

        <aside>
          ${renderSection(
            "Overdue or urgent actions",
            renderCardList(
              overdueActions,
              "No overdue actions",
              "There are no overdue safeguarding actions."
            )
          )}

          ${renderSection(
            "Referrals",
            renderCardList(
              referrals,
              "No referrals",
              "No safeguarding referrals are currently recorded."
            )
          )}

          ${renderSection(
            "Strategy meetings",
            renderCardList(
              strategyMeetings,
              "No strategy meetings",
              "No strategy meetings are currently listed."
            )
          )}

          ${renderSection(
            "Notifications",
            renderCardList(
              notifications,
              "No notifications",
              "There are no current safeguarding notifications."
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
    concernsRes,
    actionsRes,
    referralsRes,
    meetingsRes,
    notificationsRes,
    chronologyRes,
  ] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/safeguarding-concerns`),
    safeGet(`/young-people/${youngPersonId}/safeguarding-actions`),
    safeGet(`/young-people/${youngPersonId}/safeguarding-referrals`),
    safeGet(`/young-people/${youngPersonId}/strategy-meetings`),
    safeGet(`/young-people/${youngPersonId}/notifications`),
    safeGet(`/young-people/${youngPersonId}/safeguarding-chronology`),
  ]);

  const data = {
    concerns: pickItems(concernsRes, [
      "safeguarding_concerns",
      "concerns",
      "items",
    ]).map(mapConcern),

    actions: pickItems(actionsRes, [
      "safeguarding_actions",
      "actions",
      "items",
    ]).map(mapAction),

    referrals: pickItems(referralsRes, [
      "safeguarding_referrals",
      "referrals",
      "items",
    ]).map(mapReferral),

    strategyMeetings: pickItems(meetingsRes, [
      "strategy_meetings",
      "meetings",
      "items",
    ]).map(mapStrategyMeeting),

    notifications: pickItems(notificationsRes, [
      "notifications",
      "items",
    ]).map(mapNotification),

    chronology: pickItems(chronologyRes, [
      "safeguarding_chronology",
      "events",
      "items",
    ]).map(mapChronology),
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

function buildOpenConcerns(data) {
  return sortNewest(
    data.concerns.filter((item) => {
      const status = lower(item.status);
      return !["closed", "resolved", "archived"].includes(status);
    }),
    ["reported_at", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildOpenActions(data) {
  return sortSoonest(
    data.actions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled", "resolved"].includes(status);
    }),
    ["due_date", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildOverdueActions(data) {
  return sortSoonest(
    data.actions.filter((item) => {
      const status = lower(item.status);
      return (
        !["completed", "closed", "cancelled", "resolved"].includes(status) &&
        (isOverdue(item.due_date) || ["overdue", "urgent", "high"].includes(lower(item.priority)))
      );
    }),
    ["due_date", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildReferrals(data) {
  return sortNewest(data.referrals, [
    "referred_at",
    "created_at",
    "updated_at",
  ]).slice(0, 8);
}

function buildStrategyMeetings(data) {
  return sortSoonest(data.strategyMeetings, [
    "meeting_date",
    "created_at",
    "updated_at",
  ]).slice(0, 8);
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

function buildChronology(data) {
  return sortNewest(
    [
      ...data.chronology,
      ...data.concerns,
      ...data.referrals,
      ...data.strategyMeetings,
    ],
    [
      "occurred_at",
      "reported_at",
      "referred_at",
      "meeting_date",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 20);
}

/* -------------------------------- public -------------------------------- */

export async function loadSafeguarding() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a child or young person to view safeguarding information."
    );

    updateWorkspaceSummaryStrip({
      today: "No safeguarding context",
      nextEvent: "No action due",
      lastRecord: "No safeguarding data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading safeguarding...</p>
        </div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const openConcerns = buildOpenConcerns(data);
    const openActions = buildOpenActions(data);
    const overdueActions = buildOverdueActions(data);
    const referrals = buildReferrals(data);
    const strategyMeetings = buildStrategyMeetings(data);
    const notifications = buildNotifications(data);
    const chronology = buildChronology(data);

    els.viewContent.innerHTML = renderWorkspace({
      openConcerns,
      openActions,
      overdueActions,
      referrals,
      strategyMeetings,
      notifications,
      chronology,
      isFallback: Boolean(data.isFallback),
    });

    const nextAction =
      overdueActions[0]?.due_date ||
      openActions[0]?.due_date ||
      strategyMeetings[0]?.meeting_date ||
      notifications[0]?.due_at ||
      null;

    const latestRecord =
      chronology[0]?.occurred_at ||
      chronology[0]?.reported_at ||
      chronology[0]?.referred_at ||
      chronology[0]?.meeting_date ||
      chronology[0]?.created_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${openConcerns.length} concerns • preview mode`
        : `${openConcerns.length} concerns • ${openActions.length} actions`,
      nextEvent: nextAction
        ? `Next action ${formatDate(nextAction)}`
        : "No action due",
      lastRecord: latestRecord
        ? `Latest safeguarding activity ${formatDateTime(latestRecord)}`
        : "No recent safeguarding activity",
      openActions: `${overdueActions.length} overdue • ${referrals.length} referrals`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[safeguarding] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load safeguarding",
      error?.message || "Something went wrong while loading safeguarding information."
    );

    updateWorkspaceSummaryStrip({
      today: "Safeguarding unavailable",
      nextEvent: "No action due",
      lastRecord: "No safeguarding data",
      openActions: "Check safeguarding routes",
    });
  }
}
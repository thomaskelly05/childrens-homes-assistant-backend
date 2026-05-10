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

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function plainText(value, fallback = "") {
  return String(value ?? fallback ?? "");
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

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "critical",
      "high",
      "urgent",
      "error",
      "failed",
      "overdue",
      "open",
      "unread",
      "danger",
      "red",
      "pending",
      "action_required",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "warning",
      "amber",
      "scheduled",
      "queued",
      "processing",
      "acknowledged",
      "in_progress",
      "due",
      "awaiting",
      "sent_for_review",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "low",
      "sent",
      "resolved",
      "closed",
      "read",
      "completed",
      "dismissed",
      "success",
      "green",
      "done",
      "active",
      "current",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function getHomeId() {
  return (
    state.homeId ||
    state.selectedHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    state.youngPerson?.home_id ||
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

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);

    const aTime = aValue
      ? new Date(aValue).getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = bValue
      ? new Date(bValue).getTime()
      : Number.POSITIVE_INFINITY;

    return aTime - bTime;
  });
}

function dedupeBy(items = [], keyFn) {
  const seen = new Set();

  return items.filter((item) => {
    const key = keyFn(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasUsableData(data = {}) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.notifications) && data.notifications.length > 0) return true;
  if (Array.isArray(data.notification_queue) && data.notification_queue.length > 0) return true;
  if (Array.isArray(data.operational_notifications) && data.operational_notifications.length > 0) return true;
  if (Array.isArray(data.home_notifications) && data.home_notifications.length > 0) return true;
  if (Array.isArray(data.notifications_centre) && data.notifications_centre.length > 0) return true;
  return false;
}

function canOpenRecord(item = {}) {
  return Boolean(item.id && item.record_type);
}

function buildRecordAttrs(item = {}) {
  if (!canOpenRecord(item)) {
    return `class="record-card"`;
  }

  return `
    class="record-card"
    data-open-record="true"
    data-record-id="${safeText(item.id || "")}"
    data-record-type="${safeText(item.record_type || "notification")}"
    data-title="${safeText(item.title || "Notification")}"
    role="button"
    tabindex="0"
  `;
}

/* -------------------------------- mappers -------------------------------- */

function mapNotification(record = {}, sourceType = "notification") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    staff_id: record.staff_id || null,
    user_id: record.user_id || null,
    notification_type: record.notification_type || "",
    severity: record.severity || "",
    title: record.title || "Notification",
    message: record.message || "",
    source_table: record.source_table || "",
    source_id: record.source_id || null,
    due_date: record.due_date || null,
    read_at: record.read_at || null,
    dismissed_at: record.dismissed_at || null,
    status: record.status || "",
    action_url: record.action_url || "",
    action_label: record.action_label || "",
    due_at: record.due_at || null,
    acknowledged_by_user_id: record.acknowledged_by_user_id || null,
    acknowledged_at: record.acknowledged_at || null,
    resolved_by_user_id: record.resolved_by_user_id || null,
    resolved_at: record.resolved_at || null,
    expires_at: record.expires_at || null,
    detail_url: record.detail_url || "",
    is_read:
      record.is_read !== undefined
        ? toBool(record.is_read)
        : Boolean(record.read_at),
    summary: record.message || "Notification recorded.",
    record_type: sourceType,
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapNotificationQueue(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    user_id: record.user_id || null,
    notification_type: record.notification_type || "",
    title: record.title || "Queued notification",
    message: record.body || record.message || "",
    channel: record.channel || "",
    status: record.status || "",
    related_table: record.related_table || "",
    related_id: record.related_id || null,
    scheduled_for: record.scheduled_for || null,
    sent_at: record.sent_at || null,
    read_at: record.read_at || null,
    detail_url: record.detail_url || "",
    summary: record.body || record.message || "Queued notification.",
    record_type: "notification_queue",
    source_type: "notification_queue",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapOperationalNotification(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    staff_id: record.staff_id || null,
    notification_type: record.notification_type || "",
    title: record.title || "Operational notification",
    message: record.message || "",
    severity: record.severity || "",
    status: record.status || "",
    due_at: record.due_at || null,
    acknowledged_at: record.acknowledged_at || null,
    resolved_at: record.resolved_at || null,
    created_by_user_id: record.created_by_user_id || null,
    assigned_to_user_id: record.assigned_to_user_id || null,
    detail_url: record.detail_url || "",
    summary: record.message || "Operational notification recorded.",
    record_type: "operational_notification",
    source_type: "operational_notification",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapHomeNotification(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    staff_id: record.staff_id || null,
    notification_type: record.notification_type || "",
    severity: record.severity || "",
    title: record.title || "Home notification",
    message: record.message || "",
    status: record.status || "",
    action_url: record.action_url || "",
    action_label: record.action_label || "",
    due_at: record.due_at || null,
    acknowledged_by_user_id: record.acknowledged_by_user_id || null,
    acknowledged_at: record.acknowledged_at || null,
    resolved_by_user_id: record.resolved_by_user_id || null,
    resolved_at: record.resolved_at || null,
    detail_url: record.detail_url || "",
    summary: record.message || "Home notification recorded.",
    record_type: "home_notification",
    source_type: "home_notification",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

/* ------------------------------ demo fallback ----------------------------- */

function buildFallbackData(homeId) {
  const now = new Date();

  const minusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  };

  const plusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  };

  return {
    notifications: [
      mapNotification(
        {
          id: "notif-1",
          home_id: homeId,
          notification_type: "task_reminder",
          severity: "high",
          title: "Manager review still open",
          message: "A manager review remains open and is now overdue.",
          status: "unread",
          due_at: minusHours(6),
          created_at: minusHours(10),
        },
        "notification"
      ),
      mapNotification(
        {
          id: "notif-2",
          home_id: homeId,
          notification_type: "document_review",
          severity: "medium",
          title: "Document review due soon",
          message: "A statutory document review is due within the next 24 hours.",
          status: "unread",
          due_at: plusHours(18),
          created_at: minusHours(5),
        },
        "notification"
      ),
    ],
    notificationQueue: [
      mapNotificationQueue({
        id: "queue-1",
        home_id: homeId,
        notification_type: "scheduled_digest",
        title: "Morning digest",
        body: "Scheduled shift digest queued for the next shift handover.",
        channel: "in_app",
        status: "queued",
        scheduled_for: plusHours(3),
        created_at: minusHours(1),
      }),
    ],
    operationalNotifications: [
      mapOperationalNotification({
        id: "op-1",
        home_id: homeId,
        notification_type: "staffing_alert",
        title: "Staffing pressure today",
        message: "Cover pressure has increased for the evening shift.",
        severity: "critical",
        status: "open",
        due_at: plusHours(2),
        created_at: minusHours(2),
      }),
    ],
    homeNotifications: [
      mapHomeNotification({
        id: "home-1",
        home_id: homeId,
        notification_type: "home_alert",
        severity: "high",
        title: "Health and safety follow-up",
        message: "A follow-up check is still outstanding after a recent concern.",
        status: "acknowledged",
        due_at: plusHours(12),
        created_at: minusHours(12),
        acknowledged_at: minusHours(4),
      }),
      mapHomeNotification({
        id: "home-2",
        home_id: homeId,
        notification_type: "communication_update",
        severity: "low",
        title: "Parent call logged",
        message: "Recent home communication was logged and marked complete.",
        status: "resolved",
        created_at: minusHours(20),
        resolved_at: minusHours(8),
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

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong class="overview-stat-value">${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderNotificationCard(item = {}) {
  const status = item.status || (item.is_read ? "read" : "unread");
  const severity = item.severity || "";
  const dueValue = item.due_at || item.due_date || item.scheduled_for || null;

  return `
    <article ${buildRecordAttrs(item)}>
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Notification")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(item.created_at, "No date"))}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          ${severity ? `<span class="${badgeClass(severity)}">${safeText(titleCase(severity))}</span>` : ""}
          ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
        </div>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.notification_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Type</div>
                  <div class="details-grid-value">${safeText(titleCase(item.notification_type))}</div>
                </div>
              `
              : ""
          }

          ${
            item.channel
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Channel</div>
                  <div class="details-grid-value">${safeText(titleCase(item.channel))}</div>
                </div>
              `
              : ""
          }

          ${
            dueValue
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due</div>
                  <div class="details-grid-value ${isOverdue(dueValue) ? "text-danger" : ""}">
                    ${safeText(formatDateTime(dueValue, "No date"))}
                  </div>
                </div>
              `
              : ""
          }

          ${
            item.source_table || item.related_table
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Source</div>
                  <div class="details-grid-value">${safeText(titleCase(item.source_table || item.related_table))}</div>
                </div>
              `
              : ""
          }

          ${
            item.acknowledged_at
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Acknowledged</div>
                  <div class="details-grid-value">${safeText(formatDateTime(item.acknowledged_at))}</div>
                </div>
              `
              : ""
          }

          ${
            item.resolved_at
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Resolved</div>
                  <div class="details-grid-value">${safeText(formatDateTime(item.resolved_at))}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.action_label || item.action_url
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action</div>
                <div>${safeText(item.action_label || item.action_url)}</div>
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
  return `<div class="record-card-list">${items.map(renderNotificationCard).join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No recent notification activity",
      "There is no notification activity to display yet."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const status = item.status || (item.is_read ? "read" : "unread");
          const severity = item.severity || "";
          const activityDate =
            item.sent_at ||
            item.resolved_at ||
            item.acknowledged_at ||
            item.read_at ||
            item.scheduled_for ||
            item.created_at;

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(activityDate, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
                  <strong>${safeText(item.title || "Notification")}</strong>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${severity ? `<span class="${badgeClass(severity)}">${safeText(titleCase(severity))}</span>` : ""}
                    ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
                  </div>
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
    unreadNotifications,
    overdueNotifications,
    activeOperationalNotifications,
    queuedNotifications,
    resolvedNotifications,
    homeNotifications,
    timeline,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Notifications and alerts</div>
          <h2>Operational alerts, queued messages, unread items and resolved activity</h2>
          <p class="overview-panel-subtitle">
            A live workspace for notification flow across home alerts, operational prompts and queued communication.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live notification routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Unread items", unreadNotifications.length)}
        ${renderStatCard("Overdue items", overdueNotifications.length)}
        ${renderStatCard("Operational alerts", activeOperationalNotifications.length)}
        ${renderStatCard("Queued messages", queuedNotifications.length)}
        ${renderStatCard("Resolved items", resolvedNotifications.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Unread notifications",
            renderCardList(
              unreadNotifications,
              "No unread notifications",
              "There are no unread notifications right now."
            )
          )}

          ${renderSection(
            "Overdue and urgent items",
            renderCardList(
              overdueNotifications,
              "Nothing overdue",
              "There are no overdue or urgent notifications."
            )
          )}

          ${renderSection(
            "Notification activity timeline",
            renderTimeline(timeline)
          )}
        </div>

        <aside>
          ${renderSection(
            "Operational notifications",
            renderCardList(
              activeOperationalNotifications,
              "No operational alerts",
              "There are no active operational notifications."
            )
          )}

          ${renderSection(
            "Queued notifications",
            renderCardList(
              queuedNotifications,
              "No queued notifications",
              "There are no queued notifications waiting to send."
            )
          )}

          ${renderSection(
            "Home notifications",
            renderCardList(
              homeNotifications,
              "No home notifications",
              "There are no active home notifications."
            )
          )}

          ${renderSection(
            "Recently resolved",
            renderCardList(
              resolvedNotifications,
              "No recently resolved items",
              "No notifications have been resolved recently."
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
    notificationsRes,
    notificationsCentreRes,
    notificationQueueRes,
    operationalNotificationsRes,
    homeNotificationsRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/notifications`),
    safeGet(`/homes/${homeId}/notifications-centre`),
    safeGet(`/homes/${homeId}/notification-queue`),
    safeGet(`/homes/${homeId}/operational-notifications`),
    safeGet(`/homes/${homeId}/home-notifications`),
  ]);

  const hasLiveSuccess = [
    notificationsRes,
    notificationsCentreRes,
    notificationQueueRes,
    operationalNotificationsRes,
    homeNotificationsRes,
  ].some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  const mergedNotifications = [
    ...pickItems(notificationsRes, ["notifications", "items"]).map((item) =>
      mapNotification(item, "notification")
    ),
    ...pickItems(notificationsCentreRes, [
      "notifications_centre",
      "notifications",
      "items",
    ]).map((item) => mapNotification(item, "notification")),
  ];

  return {
    notifications: dedupeBy(
      mergedNotifications,
      (item) => `${item.record_type}:${item.id || ""}:${item.created_at || ""}`
    ),
    notificationQueue: pickItems(
      notificationQueueRes,
      ["notification_queue", "items"]
    ).map(mapNotificationQueue),
    operationalNotifications: pickItems(
      operationalNotificationsRes,
      ["operational_notifications", "items"]
    ).map(mapOperationalNotification),
    homeNotifications: pickItems(
      homeNotificationsRes,
      ["home_notifications", "items"]
    ).map(mapHomeNotification),
    isFallback: false,
  };
}

async function fetchVisibility(homeId) {
  if (!homeId) return SAFE_EMPTY;
  try {
    return (await apiGet(`/visibility/homes/${homeId}`)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

/* ------------------------------- selectors ------------------------------- */

function buildUnreadNotifications(data) {
  return sortNewest(
    data.notifications.filter((item) => {
      const status = lower(item.status);
      return (
        !item.is_read &&
        !["read", "resolved", "dismissed", "closed"].includes(status)
      );
    }),
    ["due_at", "due_date", "created_at", "updated_at"]
  ).slice(0, 12);
}

function buildOverdueNotifications(data) {
  const combined = [
    ...data.notifications,
    ...data.operationalNotifications,
    ...data.homeNotifications,
  ];

  return sortSoonest(
    combined.filter((item) => {
      const status = lower(item.status);
      const dueValue = item.due_at || item.due_date || null;
      const overdue = isOverdue(dueValue);
      const urgent = ["critical", "high", "urgent"].includes(lower(item.severity));

      return (
        !["resolved", "closed", "dismissed", "completed"].includes(status) &&
        (overdue || urgent)
      );
    }),
    ["due_at", "due_date", "created_at"]
  ).slice(0, 12);
}

function buildActiveOperationalNotifications(data) {
  return sortNewest(
    data.operationalNotifications.filter((item) => {
      const status = lower(item.status);
      return !["resolved", "closed", "dismissed"].includes(status);
    }),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildQueuedNotifications(data) {
  return sortSoonest(
    data.notificationQueue.filter((item) => {
      const status = lower(item.status);
      return !["sent", "cancelled", "read"].includes(status);
    }),
    ["scheduled_for", "created_at"]
  ).slice(0, 10);
}

function buildResolvedNotifications(data) {
  const combined = [
    ...data.notifications,
    ...data.operationalNotifications,
    ...data.homeNotifications,
  ];

  return sortNewest(
    combined.filter((item) => {
      const status = lower(item.status);
      return (
        ["resolved", "dismissed", "closed", "read"].includes(status) ||
        item.resolved_at ||
        item.read_at
      );
    }),
    ["resolved_at", "read_at", "updated_at", "created_at"]
  ).slice(0, 10);
}

function buildHomeNotifications(data) {
  return sortNewest(
    data.homeNotifications.filter((item) => {
      const status = lower(item.status);
      return !["resolved", "dismissed", "closed"].includes(status);
    }),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildTimeline(data) {
  return sortNewest(
    [
      ...data.notifications,
      ...data.notificationQueue,
      ...data.operationalNotifications,
      ...data.homeNotifications,
    ],
    [
      "sent_at",
      "resolved_at",
      "acknowledged_at",
      "read_at",
      "scheduled_for",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 25);
}

/* -------------------------------- public -------------------------------- */

export async function loadNotifications() {
  return loadCurrentView();
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = renderEmpty(
      "No home selected",
      "Select a home to view notifications and operational alerts."
    );

    updateWorkspaceSummaryStrip({
      today: "No notification context",
      nextEvent: "No queued sends",
      lastRecord: "No notification data",
      openActions: "No alerts loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading notifications...</p>
    </div>
  `;

  try {
    const [data, visibility] = await Promise.all([
      fetchAll(homeId),
      fetchVisibility(homeId),
    ]);

    const unreadNotifications = buildUnreadNotifications(data);
    const overdueNotifications = buildOverdueNotifications(data);
    const activeOperationalNotifications = buildActiveOperationalNotifications(data);
    const queuedNotifications = buildQueuedNotifications(data);
    const resolvedNotifications = buildResolvedNotifications(data);
    const homeNotifications = buildHomeNotifications(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      unreadNotifications,
      overdueNotifications,
      activeOperationalNotifications,
      queuedNotifications,
      resolvedNotifications,
      homeNotifications,
      timeline,
      isFallback: Boolean(data.isFallback),
    });

    const nextQueued = queuedNotifications[0] || null;
    const topUrgent = overdueNotifications[0] || null;
    const latestActivity = timeline[0] || null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${unreadNotifications.length} unread • preview mode`
        : `${unreadNotifications.length} unread notifications`,
      nextEvent: nextQueued?.scheduled_for
        ? formatDateTime(nextQueued.scheduled_for)
        : "No queued sends",
      lastRecord: latestActivity
        ? formatDateTime(
            latestActivity.sent_at ||
              latestActivity.resolved_at ||
              latestActivity.read_at ||
              latestActivity.scheduled_for ||
              latestActivity.created_at
          )
        : "None",
      openActions: topUrgent
        ? plainText(topUrgent.title)
        : `${activeOperationalNotifications.length} operational alerts`,
      pressure: Array.isArray(visibility?.queues?.urgent) &&
        visibility.queues.urgent.length
        ? `${visibility.queues.urgent.length} management alerts`
        : Number(visibility?.pressures?.total || 0)
        ? `${Number(visibility.pressures.total)} pressure score`
        : "No active alerts",
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[notifications] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load notifications",
      "Something went wrong while loading notifications and alerts."
    );

    updateWorkspaceSummaryStrip({
      today: "Notifications unavailable",
      nextEvent: "No queued sends",
      lastRecord: "No notification data",
      openActions: "Check notification routes",
    });
  }
}

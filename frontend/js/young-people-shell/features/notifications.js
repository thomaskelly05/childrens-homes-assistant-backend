import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

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

function getStatusTone(status = "") {
  const normalised = String(status || "").toLowerCase();

  if (
    [
      "critical",
      "overdue",
      "high",
      "failed",
      "danger",
      "escalated",
      "unread_critical",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "due_soon",
      "pending",
      "attention",
      "unread",
      "action_required",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "read",
      "sent",
      "completed",
      "resolved",
      "acknowledged",
      "success",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
}

function normaliseSummary(data = {}) {
  return data.summary || data.notifications_summary || data.dashboard || data || {};
}

function normaliseNotificationItems(data = {}) {
  return toArray(data.items, [data.notifications, data.records]);
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]);
}

function normaliseOnboardingItems(data = {}) {
  return toArray(data.items, [data.onboarding, data.records]);
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]);
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]);
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance, data.records]);
}

function buildTopStats({
  notifications = [],
  unread = [],
  critical = [],
  managerActions = [],
  staffActions = [],
  escalations = [],
}) {
  return [
    {
      label: "Total notifications",
      value: notifications.length,
      note: "All current messages and prompts",
      tone: "muted",
    },
    {
      label: "Unread",
      value: unread.length,
      note: "Still needing acknowledgement",
      tone: unread.length ? "warning" : "success",
    },
    {
      label: "Critical",
      value: critical.length,
      note: "Urgent items needing action",
      tone: critical.length ? "danger" : "success",
    },
    {
      label: "Manager actions",
      value: managerActions.length,
      note: "Items assigned to leadership",
      tone: managerActions.length ? "warning" : "muted",
    },
    {
      label: "Staff actions",
      value: staffActions.length,
      note: "Items assigned to workers",
      tone: staffActions.length ? "warning" : "muted",
    },
    {
      label: "Escalations",
      value: escalations.length,
      note: "Items already escalated",
      tone: escalations.length ? "danger" : "success",
    },
  ];
}

function buildProgressCards({
  notifications = [],
  readItems = [],
  critical = [],
  escalations = [],
}) {
  const readPercent =
    notifications.length > 0
      ? Math.round((readItems.length / notifications.length) * 100)
      : 0;

  const criticalPercent =
    notifications.length > 0
      ? Math.round((critical.length / notifications.length) * 100)
      : 0;

  const escalationPercent =
    notifications.length > 0
      ? Math.round((escalations.length / notifications.length) * 100)
      : 0;

  return [
    {
      label: "Read and acknowledged",
      value: `${readPercent}%`,
      percent: readPercent,
      tone:
        readPercent >= 85 ? "success" : readPercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Critical pressure",
      value: `${criticalPercent}%`,
      percent: criticalPercent,
      tone:
        criticalPercent <= 10 ? "success" : criticalPercent <= 25 ? "warning" : "danger",
    },
    {
      label: "Escalation rate",
      value: `${escalationPercent}%`,
      percent: escalationPercent,
      tone:
        escalationPercent <= 5 ? "success" : escalationPercent <= 15 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  critical = [],
  escalations = [],
  onboardingDriven = [],
  supervisionDriven = [],
  trainingDriven = [],
}) {
  const items = [];

  critical.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Critical notification",
      summary:
        item.summary ||
        item.message ||
        "This issue needs urgent attention.",
    });
  });

  escalations.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Escalated item",
      summary:
        item.summary ||
        item.message ||
        "This item has already escalated and requires leadership action.",
    });
  });

  onboardingDriven.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || "Onboarding action",
      summary:
        item.summary ||
        item.message ||
        "A staff onboarding issue still needs completion.",
    });
  });

  supervisionDriven.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || "Supervision reminder",
      summary:
        item.summary ||
        item.message ||
        "A supervision task still needs action.",
    });
  });

  trainingDriven.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || "Training reminder",
      summary:
        item.summary ||
        item.message ||
        "Training action still needs completion.",
    });
  });

  return items.slice(0, 6);
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      ${cards
        .map(
          (card) => `
            <article class="overview-stat-card ${
              card.tone === "danger"
                ? "overview-stat-card--danger"
                : card.tone === "warning"
                ? "overview-stat-card--warning"
                : card.tone === "success"
                ? "overview-stat-card--success"
                : ""
            }">
              <span class="overview-stat-label">${safeText(card.label)}</span>
              <strong class="overview-stat-value">${safeText(card.value)}</strong>
              <span class="overview-stat-note">${safeText(card.note)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgressCards(cards = []) {
  return `
    <div class="analytics-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="analytics-progress-card">
              <div class="analytics-progress-head">
                <span class="analytics-progress-label">${safeText(card.label)}</span>
                <strong class="analytics-progress-value">${safeText(card.value)}</strong>
              </div>
              <div class="analytics-progress-track">
                <span
                  class="analytics-progress-bar analytics-progress-bar--${safeText(card.tone || "muted")}"
                  style="width: ${safeText(card.percent || 0)}%;"
                ></span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRows(items = [], options = {}) {
  const {
    emptyMessage = "Nothing to show right now.",
    titleKey = "title",
    summaryKey = "summary",
    metaBuilder = null,
    statusKey = "status",
    recordType = "",
  } = options;

  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>Nothing to show</h3>
          <p>${safeText(emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.recipient_name ||
            item?.staff_member ||
            item?.full_name ||
            "Notification";

          const summary =
            item?.[summaryKey] ||
            item?.message ||
            item?.notes ||
            item?.description ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
              data-title="${safeText(title)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
                  status || "Recorded"
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent notification pressure is showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title)}</strong>
              <p>${safeText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderNotificationsHtml({
  title = "Notifications and actions",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  notifications = [],
  managerActions = [],
  staffActions = [],
  escalations = [],
  onboardingDriven = [],
  supervisionDriven = [],
  trainingDriven = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Notifications and actions</div>
          <h2>${safeText(title)}</h2>
          <p>A live action layer across reminders, escalations, onboarding prompts, supervision prompts and compliance follow-up.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live notification endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Notification snapshot</h3>
          <p>A quick visual read across acknowledgement, urgency and escalation.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>All current notifications</h3>
              <p>Messages, reminders and prompts currently live in the system.</p>
            </div>

            ${renderRows(notifications, {
              emptyMessage: "No notifications found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.channel || "",
                  item.created_at ? formatDateTime(item.created_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Manager actions</h3>
              <p>Notifications and prompts assigned to managers or leaders.</p>
            </div>

            ${renderRows(managerActions, {
              emptyMessage: "No manager actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.action_due_date ? `Due ${formatDate(item.action_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Staff actions</h3>
              <p>Notifications and prompts sent directly to staff members.</p>
            </div>

            ${renderRows(staffActions, {
              emptyMessage: "No staff actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.action_due_date ? `Due ${formatDate(item.action_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent notification and escalation themes.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Escalations</h3>
              <p>Items that have already escalated and need leadership action.</p>
            </div>

            ${renderRows(escalations, {
              emptyMessage: "No escalations found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.escalated_at ? `Escalated ${formatDateTime(item.escalated_at)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Onboarding prompts</h3>
              <p>Reminders driven by onboarding, induction and probation.</p>
            </div>

            ${renderRows(onboardingDriven, {
              emptyMessage: "No onboarding-driven notifications found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.created_at ? formatDateTime(item.created_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Supervision and training prompts</h3>
              <p>Reminders linked to practice oversight and workforce learning.</p>
            </div>

            ${renderRows([...supervisionDriven.slice(0, 3), ...trainingDriven.slice(0, 3)], {
              emptyMessage: "No supervision or training prompts found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.action_due_date ? `Due ${formatDate(item.action_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function buildFallbackNotificationData(homeId) {
  const now = new Date();
  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };
  const minusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title: "Notifications and actions",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    notificationData: {
      items: [
        {
          id: "n-1",
          title: "Probation review overdue",
          recipient_name: "Sarah Ahmed",
          channel: "in_app",
          created_at: minusDays(1),
          action_due_date: plusDays(1),
          escalated_at: minusDays(0.5),
          summary: "Ben Carter probation review is overdue and should be completed this week.",
          status: "critical",
          audience: "manager",
          source_type: "onboarding",
        },
        {
          id: "n-2",
          title: "Upload induction evidence",
          recipient_name: "Aimee Khan",
          channel: "in_app",
          created_at: minusDays(1),
          action_due_date: plusDays(2),
          summary: "Please upload final induction checklist and signed evidence.",
          status: "unread",
          audience: "staff",
          source_type: "onboarding",
        },
        {
          id: "n-3",
          title: "Safeguarding refresher due soon",
          recipient_name: "Lena Morris",
          channel: "in_app",
          created_at: minusDays(1),
          action_due_date: plusDays(6),
          summary: "Your safeguarding refresher is due this week.",
          status: "due_soon",
          audience: "staff",
          source_type: "training",
        },
        {
          id: "n-4",
          title: "Supervision reminder",
          recipient_name: "Sarah Ahmed",
          channel: "in_app",
          created_at: minusDays(2),
          action_due_date: plusDays(3),
          summary: "Aimee Khan induction supervision is due this week.",
          status: "warning",
          audience: "manager",
          source_type: "supervision",
        },
        {
          id: "n-5",
          title: "Right to work evidence missing",
          recipient_name: "Tom Kelly",
          channel: "in_app",
          created_at: minusDays(1),
          action_due_date: plusDays(1),
          escalated_at: minusDays(0.25),
          summary: "A recruitment file still needs right to work evidence before completion.",
          status: "escalated",
          audience: "leadership",
          source_type: "compliance",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "t-1",
          title: "Book probation review",
          task: "Arrange and record Ben Carter probation review.",
          staff_member: "Ben Carter",
          assigned_role: "Manager",
          due_date: plusDays(1),
          completed: false,
          status: "overdue",
        },
        {
          id: "t-2",
          title: "Upload induction evidence",
          task: "Add signed induction paperwork and certificates.",
          staff_member: "Aimee Khan",
          assigned_role: "Staff",
          due_date: plusDays(2),
          completed: false,
          status: "due_soon",
        },
      ],
    },
    onboardingData: {
      items: [
        {
          id: "o-1",
          staff_member: "Ben Carter",
          summary: "Probation review overdue and PMVA refresher outstanding.",
          status: "in_progress",
        },
        {
          id: "o-2",
          staff_member: "Aimee Khan",
          summary: "Final induction sign-off still missing.",
          status: "due_soon",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: "s-1",
          staff_member: "Ben Carter",
          summary: "Probation supervision overdue.",
          next_due_date: minusDays(5),
          status: "overdue",
        },
        {
          id: "s-2",
          staff_member: "Aimee Khan",
          summary: "Initial supervision due this week.",
          next_due_date: plusDays(3),
          status: "due_soon",
        },
      ],
    },
    trainingData: {
      items: [
        {
          id: "tr-1",
          staff_member: "Lena Morris",
          summary: "Safeguarding refresher due this week.",
          expiry_date: plusDays(6),
          status: "due_soon",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: "c-1",
          staff_member: "Aimee Khan",
          summary: "Right to work evidence missing from file.",
          review_date: plusDays(1),
          status: "missing",
        },
      ],
    },
  };
}

async function fetchNotificationsDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/notifications`),
    apiGet(`/homes/${homeId}/staff-tasks`),
    apiGet(`/homes/${homeId}/onboarding`),
    apiGet(`/homes/${homeId}/supervisions`),
    apiGet(`/homes/${homeId}/training`),
    apiGet(`/homes/${homeId}/compliance`),
  ];

  const results = await Promise.allSettled(requests);
  const hasLiveSuccess = results.some((result) => result.status === "fulfilled");

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackNotificationData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: {},
    notificationData: results[0].status === "fulfilled" ? results[0].value : { items: [] },
    taskData: results[1].status === "fulfilled" ? results[1].value : { items: [] },
    onboardingData: results[2].status === "fulfilled" ? results[2].value : { items: [] },
    supervisionData: results[3].status === "fulfilled" ? results[3].value : { items: [] },
    trainingData: results[4].status === "fulfilled" ? results[4].value : { items: [] },
    complianceData: results[5].status === "fulfilled" ? results[5].value : { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">✉</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before notifications can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No notification context",
    nextEvent: "No due item loaded",
    lastRecord: "No notification data",
    openActions: "No actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading notifications…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading notifications",
    nextEvent: "Checking due items",
    lastRecord: "Loading latest alert",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load notifications</h3>
          <p>${safeText(message || "The notifications view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Notifications unavailable",
    nextEvent: "No due item loaded",
    lastRecord: "No notification loaded",
    openActions: "No actions loaded",
  });
}

export async function loadNotifications() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      notificationData,
      taskData,
      onboardingData,
      supervisionData,
      trainingData,
      complianceData,
      isFallback,
    } = await fetchNotificationsDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const notifications = sortNewestFirst(normaliseNotificationItems(notificationData), [
      "created_at",
      "updated_at",
    ]).slice(0, 12);

    const tasks = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const onboarding = normaliseOnboardingItems(onboardingData);
    const supervisions = normaliseSupervisionItems(supervisionData);
    const training = normaliseTrainingItems(trainingData);
    const compliance = normaliseComplianceItems(complianceData);

    const unread = notifications.filter((item) =>
      ["unread", "unread_critical", "pending", "action_required"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const critical = notifications.filter((item) =>
      ["critical", "overdue", "escalated", "unread_critical"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const managerActions = notifications.filter((item) =>
      ["manager", "leadership"].includes(String(item.audience || "").toLowerCase())
    );

    const staffActions = notifications.filter((item) =>
      String(item.audience || "").toLowerCase() === "staff"
    );

    const escalations = notifications.filter((item) =>
      ["escalated"].includes(String(item.status || "").toLowerCase()) || item.escalated_at
    );

    const readItems = notifications.filter((item) =>
      ["read", "acknowledged", "resolved", "completed"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const onboardingDriven = notifications.filter(
      (item) => String(item.source_type || "").toLowerCase() === "onboarding"
    );

    const supervisionDriven = notifications.filter(
      (item) => String(item.source_type || "").toLowerCase() === "supervision"
    );

    const trainingDriven = notifications.filter(
      (item) => String(item.source_type || "").toLowerCase() === "training"
    );

    const topStats = buildTopStats({
      notifications,
      unread,
      critical,
      managerActions,
      staffActions,
      escalations,
    });

    const progressCards = buildProgressCards({
      notifications,
      readItems,
      critical,
      escalations,
    });

    const priorityItems = buildPriorityItems({
      critical,
      escalations,
      onboardingDriven,
      supervisionDriven,
      trainingDriven,
    });

    const title =
      summary.title ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} notifications`;

    els.viewContent.innerHTML = renderNotificationsHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      notifications,
      managerActions: managerActions.slice(0, 8),
      staffActions: staffActions.slice(0, 8),
      escalations: escalations.slice(0, 6),
      onboardingDriven: onboardingDriven.slice(0, 6),
      supervisionDriven: supervisionDriven.slice(0, 6),
      trainingDriven: trainingDriven.slice(0, 6),
      isFallback,
    });

    const nextTask = tasks.find((item) => !item.completed);
    const latestNotification = notifications[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${notifications.length} live notifications • preview mode`
        : `${notifications.length} live notifications • ${unread.length} unread`,
      nextEvent: nextTask?.due_date
        ? `Action due ${formatDate(nextTask.due_date)}`
        : "No immediate action due",
      lastRecord: latestNotification?.created_at
        ? `Latest alert ${formatDateTime(latestNotification.created_at)}`
        : isFallback
        ? "Preview notification data loaded"
        : "No recent alert loaded",
      openActions: `${managerActions.length} manager • ${staffActions.length} staff`,
    });
  } catch (error) {
    renderErrorState(error?.message || "The notifications view could not be loaded.");
  }
}
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

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
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

function normaliseStatus(value = "") {
  return String(value || "").toLowerCase().trim().replaceAll(" ", "_");
}

function getStatusTone(status = "") {
  const normalised = normaliseStatus(status);

  if (
    [
      "overdue",
      "high",
      "critical",
      "expired",
      "missing",
      "non_compliant",
      "failed",
      "at_risk",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "warning",
      "review_due",
      "attention",
      "incomplete",
      "pending",
      "expiring",
      "in_progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "active",
      "complete",
      "completed",
      "ok",
      "good",
      "passed",
      "compliant",
      "booked",
      "up_to_date",
      "current",
      "signed_off",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(aValue) - toTime(bValue);
  });
}

function hasUsableData(data = {}) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.staff) && data.staff.length > 0) return true;
  if (Array.isArray(data.team) && data.team.length > 0) return true;
  if (Array.isArray(data.training) && data.training.length > 0) return true;
  if (Array.isArray(data.supervisions) && data.supervisions.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.notifications) && data.notifications.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.staff_summary && typeof data.staff_summary === "object") return true;
  return false;
}

function normaliseStaffSummary(data = {}) {
  return data.summary || data.staff_summary || data.dashboard || data || {};
}

function normaliseStaffItems(data = {}) {
  return toArray(data.items, [data.staff, data.team, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "staff_profile",
    full_name:
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      item.staff_member ||
      "Staff member",
    staff_member:
      item.staff_member ||
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Staff member",
    role: item.role || item.job_title || item.position || "",
    line_manager:
      item.line_manager ||
      item.line_manager_name ||
      "",
    employment_status:
      item.employment_status ||
      item.status ||
      "active",
    start_date:
      item.start_date ||
      item.employment_start_date ||
      item.created_at ||
      null,
    status: item.status || item.employment_status || "active",
    summary:
      item.summary ||
      item.notes ||
      item.role ||
      "Staff profile available.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "training",
    staff_member:
      item.staff_member ||
      item.full_name ||
      "Staff member",
    training_name:
      item.training_name ||
      item.course_name ||
      item.title ||
      "Training",
    expiry_date:
      item.expiry_date ||
      item.expires_on ||
      item.expires_at ||
      null,
    status: item.status || "recorded",
    summary:
      item.summary ||
      item.notes ||
      item.course_name ||
      "Training record logged.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "supervision",
    staff_member:
      item.staff_member ||
      item.full_name ||
      "Staff member",
    supervisor:
      item.supervisor ||
      item.supervisor_name ||
      "",
    next_due_date:
      item.next_due_date ||
      item.next_supervision_date ||
      item.next_session_date ||
      item.review_date ||
      null,
    status: item.status || "recorded",
    summary:
      item.summary ||
      item.actions_agreed ||
      item.development_needs ||
      "Supervision record logged.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "staff_document",
    staff_member:
      item.staff_member ||
      item.full_name ||
      "Staff member",
    document_type:
      item.document_type ||
      item.title ||
      "Document",
    review_date:
      item.review_date ||
      item.expiry_date ||
      null,
    status: item.status || "recorded",
    summary:
      item.summary ||
      item.notes ||
      "Document record logged.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "task",
    title: item.title || item.task || "Task",
    task: item.task || item.title || "Task",
    staff_member:
      item.staff_member ||
      item.full_name ||
      "",
    assigned_role: item.assigned_role || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.task ||
      item.notes ||
      "Action recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseNotificationItems(data = {}) {
  return toArray(data.items, [data.notifications, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "notification",
    title: item.title || "Notification",
    recipient_name:
      item.recipient_name ||
      item.staff_member ||
      "",
    summary:
      item.summary ||
      item.message ||
      item.notes ||
      "Notification logged.",
    status: item.status || "recorded",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseOnboardingItems(data = {}) {
  return toArray(data.items, [data.onboarding, data.checklist, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "onboarding",
    staff_member:
      item.staff_member ||
      item.full_name ||
      "Staff member",
    stage: item.stage || item.status || "",
    next_step: item.next_step || "",
    next_review_date:
      item.next_review_date ||
      item.review_date ||
      item.target_completion_date ||
      null,
    status: item.status || "recorded",
    summary:
      item.summary ||
      item.next_step ||
      item.notes ||
      "Onboarding record logged.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  staffItems = [],
  onboardingItems = [],
  overdueTraining = [],
  overdueSupervisions = [],
  documentGaps = [],
  openTasks = [],
}) {
  const activeStaff = staffItems.filter((item) =>
    ["active", "probation", "induction"].includes(
      normaliseStatus(item.employment_status || item.status)
    )
  ).length;

  return [
    {
      label: "Active staff",
      value: activeStaff,
      note: "Current workforce in post",
      tone: "muted",
    },
    {
      label: "Onboarding live",
      value: onboardingItems.length,
      note: "Staff in onboarding or induction",
      tone: onboardingItems.length ? "warning" : "muted",
    },
    {
      label: "Training gaps",
      value: overdueTraining.length,
      note: "Mandatory training due or overdue",
      tone: overdueTraining.length ? "warning" : "success",
    },
    {
      label: "Supervision due",
      value: overdueSupervisions.length,
      note: "Oversight requiring action",
      tone: overdueSupervisions.length ? "warning" : "success",
    },
    {
      label: "Document gaps",
      value: documentGaps.length,
      note: "DBS, ID, RTW or file issues",
      tone: documentGaps.length ? "danger" : "success",
    },
    {
      label: "Open actions",
      value: openTasks.length,
      note: "Staff tasks needing completion",
      tone: openTasks.length ? "warning" : "success",
    },
  ];
}

function buildPriorityItems({
  onboardingItems = [],
  overdueTraining = [],
  overdueSupervisions = [],
  documentGaps = [],
  notificationItems = [],
}) {
  const items = [];

  onboardingItems.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || item.full_name || "Onboarding issue",
      summary:
        item.summary ||
        item.next_step ||
        "Onboarding still has incomplete checks or actions.",
    });
  });

  overdueTraining.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || item.training_name || "Training gap",
      summary: item.expiry_date
        ? `${item.training_name || "Training"} due ${formatDate(item.expiry_date)}`
        : "Mandatory training needs attention.",
    });
  });

  overdueSupervisions.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Supervision due",
      summary: item.next_due_date
        ? `Due ${formatDate(item.next_due_date)}`
        : "Supervision requires booking or completion.",
    });
  });

  documentGaps.slice(0, 1).forEach((item) => {
    items.push({
      title: item.staff_member || item.document_type || "Document gap",
      summary:
        item.summary ||
        "Important employment or compliance document is incomplete.",
    });
  });

  notificationItems.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || "Notification",
      summary: item.summary || "Outstanding notification requires action.",
    });
  });

  return items.slice(0, 6);
}

function buildStaffKpis({
  staffItems = [],
  trainingItems = [],
  supervisionItems = [],
  onboardingItems = [],
  documentItems = [],
}) {
  const activeStaff = staffItems.filter((item) =>
    ["active", "probation", "induction"].includes(
      normaliseStatus(item.employment_status || item.status)
    )
  ).length;

  const compliantTraining = trainingItems.filter((item) =>
    ["completed", "up_to_date", "passed"].includes(
      normaliseStatus(item.status)
    )
  ).length;
  const trainingPercent =
    trainingItems.length > 0
      ? Math.round((compliantTraining / trainingItems.length) * 100)
      : 0;

  const completedSupervisions = supervisionItems.filter((item) =>
    ["completed", "done", "current", "up_to_date"].includes(
      normaliseStatus(item.status)
    )
  ).length;
  const supervisionPercent =
    supervisionItems.length > 0
      ? Math.round((completedSupervisions / supervisionItems.length) * 100)
      : 0;

  const completedOnboarding = onboardingItems.filter((item) =>
    ["completed", "complete", "signed_off"].includes(
      normaliseStatus(item.status)
    )
  ).length;
  const onboardingPercent =
    onboardingItems.length > 0
      ? Math.round((completedOnboarding / onboardingItems.length) * 100)
      : 0;

  const compliantDocuments = documentItems.filter((item) =>
    ["compliant", "current", "complete", "up_to_date"].includes(
      normaliseStatus(item.status)
    )
  ).length;
  const documentPercent =
    documentItems.length > 0
      ? Math.round((compliantDocuments / documentItems.length) * 100)
      : 0;

  const workforcePercent = staffItems.length
    ? Math.min(Math.round((activeStaff / staffItems.length) * 100), 100)
    : 0;

  return [
    {
      label: "Workforce coverage",
      value: `${workforcePercent}%`,
      percent: workforcePercent,
      tone:
        workforcePercent >= 85
          ? "success"
          : workforcePercent >= 65
          ? "warning"
          : "danger",
    },
    {
      label: "Training compliance",
      value: `${trainingPercent}%`,
      percent: trainingPercent,
      tone:
        trainingPercent >= 90
          ? "success"
          : trainingPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Supervision compliance",
      value: `${supervisionPercent}%`,
      percent: supervisionPercent,
      tone:
        supervisionPercent >= 90
          ? "success"
          : supervisionPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Onboarding completion",
      value: `${onboardingPercent}%`,
      percent: onboardingPercent,
      tone:
        onboardingPercent >= 90
          ? "success"
          : onboardingPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Document readiness",
      value: `${documentPercent}%`,
      percent: documentPercent,
      tone:
        documentPercent >= 90
          ? "success"
          : documentPercent >= 70
          ? "warning"
          : "danger",
    },
  ];
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
            item?.full_name ||
            item?.staff_member ||
            item?.training_name ||
            item?.document_type ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.role ||
            item?.next_step ||
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
        <p>No urgent workforce issues are showing right now.</p>
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

function renderStaffDashboardHtml({
  title = "Staff profiles and onboarding",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  staffItems = [],
  onboardingItems = [],
  overdueTraining = [],
  overdueSupervisions = [],
  documentGaps = [],
  notificationItems = [],
  openTasks = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">HR and workforce</div>
          <h2>${safeText(title)}</h2>
          <p>A live workforce view across staff profiles, onboarding, training, supervision, documents and required actions.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live workforce endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Workforce snapshot</h3>
          <p>A quick visual read across onboarding, supervision, training and compliance readiness.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Staff profiles</h3>
              <p>Live workforce records across role, manager, status and current context.</p>
            </div>

            ${renderRows(staffItems, {
              emptyMessage: "No staff profiles found.",
              titleKey: "full_name",
              summaryKey: "summary",
              recordType: "staff_profile",
              metaBuilder: (item) =>
                [
                  item.role || "",
                  item.line_manager || "",
                  item.start_date ? `Started ${formatDate(item.start_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Onboarding and induction</h3>
              <p>Pre-employment checks, induction progress and probation milestones.</p>
            </div>

            ${renderRows(onboardingItems, {
              emptyMessage: "No onboarding records found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "onboarding",
              metaBuilder: (item) =>
                [
                  item.stage || "",
                  item.next_review_date ? `Review ${formatDate(item.next_review_date)}` : "",
                  item.next_step || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open staff actions</h3>
              <p>Tasks and required actions assigned to staff or managers.</p>
            </div>

            ${renderRows(openTasks, {
              emptyMessage: "No staff actions found.",
              titleKey: "title",
              summaryKey: "task",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.staff_member || item.assigned_role || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
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
              <p>The most urgent staffing and onboarding issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Training due</h3>
              <p>Mandatory learning due soon or overdue.</p>
            </div>

            ${renderRows(overdueTraining, {
              emptyMessage: "No overdue or expiring training found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "training",
              metaBuilder: (item) =>
                [
                  item.training_name || "",
                  item.expiry_date ? `Expires ${formatDate(item.expiry_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Supervision due</h3>
              <p>Upcoming or overdue staff oversight.</p>
            </div>

            ${renderRows(overdueSupervisions, {
              emptyMessage: "No supervision gaps found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "supervision",
              metaBuilder: (item) =>
                [
                  item.supervisor || "",
                  item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Document gaps</h3>
              <p>DBS, ID, right to work and other profile requirements.</p>
            </div>

            ${renderRows(documentGaps, {
              emptyMessage: "No document gaps found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "staff_document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Notifications</h3>
              <p>Messages and reminders needing staff or manager action.</p>
            </div>

            ${renderRows(notificationItems, {
              emptyMessage: "No active notifications found.",
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
        </aside>
      </div>
    </section>
  `;
}

function buildFallbackStaffData(homeId) {
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
        title: "Staff profiles and onboarding",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    staffData: {
      items: [
        {
          id: "staff-1",
          full_name: "Sarah Ahmed",
          staff_member: "Sarah Ahmed",
          role: "Deputy manager",
          line_manager: "Tom Kelly",
          employment_status: "active",
          start_date: minusDays(320),
          summary: "Leads daily operations, staffing cover and compliance follow-up.",
          status: "active",
        },
        {
          id: "staff-2",
          full_name: "Ben Carter",
          staff_member: "Ben Carter",
          role: "Senior residential worker",
          line_manager: "Sarah Ahmed",
          employment_status: "probation",
          start_date: minusDays(48),
          summary: "In probation. Shadow shifts complete but supervision needs booking.",
          status: "warning",
        },
        {
          id: "staff-3",
          full_name: "Lena Morris",
          staff_member: "Lena Morris",
          role: "Residential worker",
          line_manager: "Sarah Ahmed",
          employment_status: "active",
          start_date: minusDays(180),
          summary: "Keyworker for two young people. Training refresh due this month.",
          status: "active",
        },
      ],
    },
    onboardingData: {
      items: [
        {
          id: "onboard-1",
          staff_member: "Ben Carter",
          stage: "Probation",
          next_step: "Book 8-week supervision and probation review.",
          next_review_date: plusDays(4),
          summary: "DBS complete. Induction signed. Probation review and PMVA refresher outstanding.",
          status: "in_progress",
        },
        {
          id: "onboard-2",
          staff_member: "Aimee Khan",
          stage: "Induction",
          next_step: "Complete final shadow shift and upload certificates.",
          next_review_date: plusDays(2),
          summary: "Right to work complete. Final induction evidence still needed.",
          status: "due_soon",
        },
      ],
    },
    trainingData: {
      items: [
        {
          id: "training-1",
          staff_member: "Lena Morris",
          training_name: "Safeguarding refresher",
          expiry_date: plusDays(6),
          summary: "Safeguarding refresher expires soon.",
          status: "due_soon",
        },
        {
          id: "training-2",
          staff_member: "Ben Carter",
          training_name: "PMVA",
          expiry_date: minusDays(2),
          summary: "PMVA expired and needs urgent rebooking.",
          status: "overdue",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: "supervision-1",
          staff_member: "Ben Carter",
          supervisor: "Sarah Ahmed",
          next_due_date: minusDays(5),
          summary: "Probation supervision overdue.",
          status: "overdue",
        },
        {
          id: "supervision-2",
          staff_member: "Lena Morris",
          supervisor: "Sarah Ahmed",
          next_due_date: plusDays(3),
          summary: "Monthly supervision due this week.",
          status: "due_soon",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          staff_member: "Aimee Khan",
          document_type: "Reference check",
          review_date: plusDays(1),
          summary: "Second reference still awaiting upload.",
          status: "missing",
        },
        {
          id: "doc-2",
          staff_member: "Ben Carter",
          document_type: "Driving licence copy",
          review_date: plusDays(5),
          summary: "Updated ID copy needed for file completion.",
          status: "review_due",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Book probation review",
          task: "Arrange and record Ben Carter probation review.",
          staff_member: "Ben Carter",
          due_date: plusDays(4),
          completed: false,
          status: "due_soon",
        },
        {
          id: "task-2",
          title: "Upload induction evidence",
          task: "Add signed induction checklist and certificates.",
          staff_member: "Aimee Khan",
          due_date: plusDays(2),
          completed: false,
          status: "warning",
        },
        {
          id: "task-3",
          title: "Refresh safeguarding training",
          task: "Book Lena Morris onto refresher training.",
          staff_member: "Lena Morris",
          due_date: plusDays(6),
          completed: false,
          status: "due_soon",
        },
      ],
    },
    notificationData: {
      items: [
        {
          id: "notif-1",
          title: "Supervision reminder",
          recipient_name: "Sarah Ahmed",
          summary: "Ben Carter supervision is overdue and should be booked this week.",
          created_at: minusDays(1),
          status: "attention",
        },
        {
          id: "notif-2",
          title: "Training reminder",
          recipient_name: "Lena Morris",
          summary: "Safeguarding refresher expires within 7 days.",
          created_at: minusDays(1),
          status: "due_soon",
        },
      ],
    },
  };
}

async function fetchStaffDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/staff`).catch(() => null),
    apiGet(`/homes/${homeId}/onboarding`).catch(() => null),
    apiGet(`/homes/${homeId}/training`).catch(() => null),
    apiGet(`/homes/${homeId}/supervisions`).catch(() => null),
    apiGet(`/homes/${homeId}/staff-documents`).catch(() => null),
    apiGet(`/homes/${homeId}/staff-tasks`).catch(() => null),
    apiGet(`/homes/${homeId}/notifications`).catch(() => null),
  ];

  const [
    staffData,
    onboardingData,
    trainingData,
    supervisionData,
    documentData,
    taskData,
    notificationData,
  ] = await Promise.all(requests);

  const hasLiveSuccess = [
    staffData,
    onboardingData,
    trainingData,
    supervisionData,
    documentData,
    taskData,
    notificationData,
  ].some(hasUsableData);

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackStaffData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: {},
    staffData: staffData || { items: [] },
    onboardingData: onboardingData || { items: [] },
    trainingData: trainingData || { items: [] },
    supervisionData: supervisionData || { items: [] },
    documentData: documentData || { items: [] },
    taskData: taskData || { items: [] },
    notificationData: notificationData || { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">◍</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before workforce profiles can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No workforce context",
    nextEvent: "No review loaded",
    lastRecord: "No staff profile loaded",
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
          <p>Loading staff profiles…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading workforce view",
    nextEvent: "Checking next review date",
    lastRecord: "Loading latest staff activity",
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
          <h3>Failed to load staff profiles</h3>
          <p>${safeText(message || "The workforce view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Workforce view unavailable",
    nextEvent: "No event loaded",
    lastRecord: "No staff record loaded",
    openActions: "No actions loaded",
  });
}

export async function loadStaffProfile() {
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
      staffData,
      onboardingData,
      trainingData,
      supervisionData,
      documentData,
      taskData,
      notificationData,
      isFallback,
    } = await fetchStaffDataset(homeId);

    const summary = normaliseStaffSummary(summaryData);

    const staffItems = sortNewestFirst(normaliseStaffItems(staffData), [
      "updated_at",
      "created_at",
      "start_date",
    ]).slice(0, 8);

    const onboardingItems = sortSoonestFirst(normaliseOnboardingItems(onboardingData), [
      "next_review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const trainingItems = sortSoonestFirst(normaliseTrainingItems(trainingData), [
      "expiry_date",
      "updated_at",
      "created_at",
    ]);

    const supervisionItems = sortSoonestFirst(normaliseSupervisionItems(supervisionData), [
      "next_due_date",
      "updated_at",
      "created_at",
    ]);

    const documentItems = sortSoonestFirst(normaliseDocumentItems(documentData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const notificationItems = sortNewestFirst(
      normaliseNotificationItems(notificationData),
      ["created_at", "updated_at"]
    ).slice(0, 6);

    const overdueTraining = trainingItems.filter((item) =>
      ["due_soon", "overdue", "expired", "expiring"].includes(
        normaliseStatus(item.status)
      )
    );

    const overdueSupervisions = supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        normaliseStatus(item.status)
      )
    );

    const documentGaps = documentItems.filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "incomplete"].includes(
        normaliseStatus(item.status)
      )
    );

    const openTasks = taskItems.filter((item) => !item.completed);

    const topStats = buildTopStats({
      staffItems,
      onboardingItems,
      overdueTraining,
      overdueSupervisions,
      documentGaps,
      openTasks,
    });

    const progressCards = buildStaffKpis({
      staffItems,
      trainingItems,
      supervisionItems,
      onboardingItems,
      documentItems,
    });

    const priorityItems = buildPriorityItems({
      onboardingItems,
      overdueTraining,
      overdueSupervisions,
      documentGaps,
      notificationItems,
    });

    const title =
      summary.title ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} workforce`;

    els.viewContent.innerHTML = renderStaffDashboardHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      staffItems,
      onboardingItems,
      overdueTraining: overdueTraining.slice(0, 6),
      overdueSupervisions: overdueSupervisions.slice(0, 6),
      documentGaps: documentGaps.slice(0, 6),
      notificationItems,
      openTasks: openTasks.slice(0, 8),
      isFallback,
    });

    const nextSupervision = overdueSupervisions[0];
    const latestNotification = notificationItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${staffItems.length} staff • preview mode`
        : `${staffItems.length} staff • ${openTasks.length} open actions`,
      nextEvent: nextSupervision?.next_due_date
        ? `Supervision due ${formatDate(nextSupervision.next_due_date)}`
        : "No immediate review loaded",
      lastRecord: latestNotification?.created_at
        ? `Latest notification ${formatDateTime(latestNotification.created_at)}`
        : isFallback
        ? "Preview staff data loaded"
        : "No recent staff activity loaded",
      openActions: `${openTasks.length} open • ${documentGaps.length} file gaps`,
    });
  } catch (error) {
    renderErrorState(error?.message || "The workforce view could not be loaded.");
  }
}
import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

const SAFE_EMPTY = Object.freeze({ items: [] });

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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

function normaliseStatus(status = "") {
  return String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");
}

function getStatusTone(status = "") {
  const normalised = normaliseStatus(status);

  if (
    [
      "expired",
      "overdue",
      "failed",
      "critical",
      "high",
      "missing",
      "non_compliant",
      "escalated",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due",
      "due_soon",
      "review_due",
      "warning",
      "attention",
      "booked",
      "scheduled",
      "in_progress",
      "pending",
      "awaiting",
      "open",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "current",
      "completed",
      "complete",
      "up_to_date",
      "passed",
      "active",
      "confirmed",
      "recorded",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);

    const aTime = aValue ? toTime(aValue) : Number.POSITIVE_INFINITY;
    const bTime = bValue ? toTime(bValue) : Number.POSITIVE_INFINITY;

    return aTime - bTime;
  });
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function hasUsableData(data = {}) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.training) && data.training.length > 0) return true;
  if (Array.isArray(data.compliance_items) && data.compliance_items.length > 0)
    return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.training_summary && typeof data.training_summary === "object")
    return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.training_summary || data.dashboard || {};
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "training_record",
    title: item.title || item.training_name || "Training",
    training_name: item.training_name || item.title || "Training",
    staff_member: item.staff_member || item.name || "Staff member",
    role: item.role || item.job_title || "",
    status: item.status || "current",
    training_type: item.training_type || item.category || "",
    provider: item.provider || "",
    completed_date: item.completed_date || item.session_date || null,
    expiry_date: item.expiry_date || item.next_due_date || null,
    next_due_date: item.next_due_date || item.expiry_date || null,
    summary:
      item.summary ||
      item.notes ||
      [
        item.training_name || item.title || "",
        item.expiry_date || item.next_due_date
          ? `Due ${formatDate(item.expiry_date || item.next_due_date)}`
          : "",
      ]
        .filter(Boolean)
        .join(" • ") ||
      "Training record.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance_items, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "compliance_item",
      title: item.title || item.training_name || "Compliance item",
      staff_member: item.staff_member || item.name || "",
      status: item.status || "recorded",
      severity: item.severity || "",
      due_date: item.due_date || item.review_date || null,
      summary:
        item.summary ||
        item.notes ||
        (item.due_date
          ? `Due ${formatDate(item.due_date)}`
          : "Compliance item."),
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })
  );
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "task",
    title: item.title || item.task || "Task",
    staff_member: item.staff_member || "",
    assigned_role: item.assigned_role || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.notes ||
      item.task ||
      "Training follow-up action.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildStats(trainingItems = [], complianceItems = [], taskItems = []) {
  const total = trainingItems.length;

  const overdue = trainingItems.filter((item) =>
    ["expired", "overdue"].includes(normaliseStatus(item.status))
  ).length;

  const dueSoon = trainingItems.filter((item) =>
    ["due", "due_soon", "review_due", "scheduled", "booked"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  const current = trainingItems.filter((item) =>
    ["current", "completed", "complete", "up_to_date", "passed"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  const urgentCompliance = complianceItems.filter((item) =>
    ["overdue", "escalated", "missing"].includes(normaliseStatus(item.status))
  ).length;

  const openActions = taskItems.filter(
    (item) =>
      !item.completed &&
      !["completed", "closed", "cancelled"].includes(normaliseStatus(item.status))
  ).length;

  const uniqueStaff = new Set(
    trainingItems.map((item) => item.staff_member).filter(Boolean)
  ).size;

  return {
    total,
    overdue,
    dueSoon,
    current,
    urgentCompliance,
    openActions,
    uniqueStaff,
  };
}

function buildProgressCards(trainingItems = []) {
  const total = trainingItems.length || 0;

  const current = trainingItems.filter((item) =>
    ["current", "completed", "complete", "up_to_date", "passed"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  const dueSoon = trainingItems.filter((item) =>
    ["due", "due_soon", "review_due", "scheduled", "booked"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  const expired = trainingItems.filter((item) =>
    ["expired", "overdue"].includes(normaliseStatus(item.status))
  ).length;

  const currentPercent = total ? Math.round((current / total) * 100) : 0;
  const dueSoonPercent = total ? Math.round((dueSoon / total) * 100) : 0;
  const expiredPercent = total ? Math.round((expired / total) * 100) : 0;

  return [
    {
      label: "Current",
      value: `${currentPercent}%`,
      percent: currentPercent,
      tone:
        currentPercent >= 85
          ? "success"
          : currentPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Due soon",
      value: `${dueSoonPercent}%`,
      percent: dueSoonPercent,
      tone:
        dueSoonPercent <= 10
          ? "success"
          : dueSoonPercent <= 20
          ? "warning"
          : "danger",
    },
    {
      label: "Expired",
      value: `${expiredPercent}%`,
      percent: expiredPercent,
      tone:
        expiredPercent <= 5
          ? "success"
          : expiredPercent <= 10
          ? "warning"
          : "danger",
    },
  ];
}

function buildPriorityItems(trainingItems = [], complianceItems = [], taskItems = []) {
  const items = [];

  trainingItems
    .filter((item) =>
      ["expired", "overdue", "due_soon", "review_due"].includes(
        normaliseStatus(item.status)
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: `${item.staff_member || "Staff member"} • ${
          item.training_name || "Training"
        }`,
        summary: item.summary || "Training needs review.",
      });
    });

  complianceItems
    .filter((item) =>
      ["overdue", "missing", "escalated"].includes(normaliseStatus(item.status))
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Compliance item",
        summary: item.summary || "Compliance issue needs attention.",
      });
    });

  taskItems
    .filter(
      (item) =>
        !item.completed &&
        !["completed", "closed", "cancelled"].includes(normaliseStatus(item.status))
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Training task",
        summary: item.summary || "Training follow-up action remains open.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major training pressure",
      summary: "Training records are not currently surfacing urgent issues.",
    });
  }

  return items.slice(0, 8);
}

/* -------------------------------- render -------------------------------- */

function renderEmptyState(message = "No training records.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">◌</div>
        <h3>No training data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCards(stats) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      <article class="overview-stat-card">
        <span class="overview-stat-label">Training records</span>
        <strong class="overview-stat-value">${safeText(stats.total)}</strong>
        <span class="overview-stat-note">All visible training entries</span>
      </article>

      <article class="overview-stat-card ${
        stats.current > 0 ? "overview-stat-card--success" : ""
      }">
        <span class="overview-stat-label">Current</span>
        <strong class="overview-stat-value">${safeText(stats.current)}</strong>
        <span class="overview-stat-note">Up-to-date records</span>
      </article>

      <article class="overview-stat-card ${
        stats.dueSoon > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Due soon</span>
        <strong class="overview-stat-value">${safeText(stats.dueSoon)}</strong>
        <span class="overview-stat-note">Need planning soon</span>
      </article>

      <article class="overview-stat-card ${
        stats.overdue > 0 ? "overview-stat-card--danger" : ""
      }">
        <span class="overview-stat-label">Expired / overdue</span>
        <strong class="overview-stat-value">${safeText(stats.overdue)}</strong>
        <span class="overview-stat-note">Need urgent follow-up</span>
      </article>

      <article class="overview-stat-card ${
        stats.urgentCompliance > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Compliance pressure</span>
        <strong class="overview-stat-value">${safeText(
          stats.urgentCompliance
        )}</strong>
        <span class="overview-stat-note">Training-linked issues</span>
      </article>

      <article class="overview-stat-card ${
        stats.openActions > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Open actions</span>
        <strong class="overview-stat-value">${safeText(stats.openActions)}</strong>
        <span class="overview-stat-note">Outstanding training actions</span>
      </article>
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
                  class="analytics-progress-bar analytics-progress-bar--${safeText(
                    card.tone || "muted"
                  )}"
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

function renderRecordRows(items = [], options = {}) {
  const {
    emptyMessage = "No records found.",
    titleBuilder = null,
    summaryBuilder = null,
    metaBuilder = null,
    statusBuilder = null,
    recordType = "training_record",
  } = options;

  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title = titleBuilder
            ? titleBuilder(item)
            : item.title || item.training_name || "Training";

          const summary = summaryBuilder
            ? summaryBuilder(item)
            : item.summary || "Training record.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : [
                item.staff_member || "",
                item.expiry_date || item.next_due_date
                  ? `Due ${formatDate(item.expiry_date || item.next_due_date)}`
                  : "",
              ]
                .filter(Boolean)
                .join(" • ");

          const status = statusBuilder ? statusBuilder(item) : item.status || "recorded";
          const tone = getStatusTone(status);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id)}"
              data-record-type="${safeText(item.record_type || recordType)}"
              data-title="${safeText(item.title || "Training record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(status)}</span>
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
        <p>No urgent training issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 8)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Training issue")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTrainingCentrePage({
  title = "Training centre",
  stats,
  progressCards,
  recentItems,
  dueItems,
  priorityItems,
  complianceItems,
  taskItems,
  allItems,
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Training and compliance</div>
          <h2>${safeText(title)}</h2>
          <p>Mandatory training, expiry pressure, compliance issues and linked follow-up actions across the home.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live training endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(stats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Training health</h3>
          <p>A quick visual read across current, due soon and expired training.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent training records</h3>
              <p>Latest training updates and completed activity.</p>
            </div>

            ${renderRecordRows(recentItems, {
              emptyMessage: "No recent training records found.",
              titleBuilder: (item) =>
                `${item.training_name || item.title || "Training"}${
                  item.staff_member ? ` • ${item.staff_member}` : ""
                }`,
            })}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Due and expiring</h3>
              <p>Training items needing booking, review or renewal.</p>
            </div>

            ${renderRecordRows(dueItems, {
              emptyMessage: "No due or expiring training items found.",
              titleBuilder: (item) =>
                `${item.training_name || item.title || "Training"}${
                  item.staff_member ? ` • ${item.staff_member}` : ""
                }`,
            })}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important training and compliance issues.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Compliance items</h3>
              <p>Training-linked compliance pressure and overdue issues.</p>
            </div>

            ${renderRecordRows(complianceItems, {
              emptyMessage: "No training-related compliance issues found.",
              recordType: "compliance_item",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open actions</h3>
              <p>Outstanding follow-up actions linked to training readiness.</p>
            </div>

            ${renderRecordRows(taskItems, {
              emptyMessage: "No open training actions found.",
              recordType: "task",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All training records</h3>
              <p>Full visible list for the home.</p>
            </div>

            ${renderRecordRows(allItems, {
              emptyMessage: "No training records found.",
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- fallback -------------------------------- */

function buildFallbackData(homeId) {
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
        title: "Training centre",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    trainingData: {
      items: [
        {
          id: "tr-1",
          training_name: "Safeguarding refresher",
          staff_member: "Ben Carter",
          expiry_date: minusDays(4),
          status: "expired",
          summary: "Safeguarding refresher has expired and needs rebooking.",
        },
        {
          id: "tr-2",
          training_name: "Medication administration",
          staff_member: "Lena Morris",
          expiry_date: plusDays(6),
          status: "due_soon",
          summary: "Medication training expires next week.",
        },
        {
          id: "tr-3",
          training_name: "First aid",
          staff_member: "Sarah Ahmed",
          completed_date: minusDays(20),
          expiry_date: plusDays(180),
          status: "current",
          summary: "First aid training is current.",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: "comp-1",
          title: "Expired safeguarding refresher",
          staff_member: "Ben Carter",
          due_date: minusDays(2),
          status: "overdue",
          summary: "Training-linked compliance issue needs action.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Book safeguarding refresher",
          task: "Rebook mandatory safeguarding training.",
          due_date: plusDays(2),
          completed: false,
          status: "open",
          summary: "Mandatory refresher still needs booking.",
        },
      ],
    },
  };
}

/* -------------------------------- fetch -------------------------------- */

async function fetchDataset(homeId) {
  const safeGet = (path) => apiGet(path).catch(() => null);

  const [summaryData, trainingData, complianceData, taskData] = await Promise.all([
    safeGet(`/homes/${homeId}/training-summary`),
    safeGet(`/homes/${homeId}/training`),
    safeGet(`/homes/${homeId}/compliance`),
    safeGet(`/homes/${homeId}/tasks`),
  ]);

  const hasLiveSuccess = [summaryData, trainingData, complianceData, taskData].some(
    hasUsableData
  );

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: summaryData || {},
    trainingData: trainingData || { items: [] },
    complianceData: complianceData || { items: [] },
    taskData: taskData || { items: [] },
    isFallback: false,
  };
}

/* -------------------------------- states -------------------------------- */

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("A home ID is needed before training can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No training context",
    nextEvent: "No training view loaded",
    lastRecord: "No training data",
    openActions: "No training actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading training…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading training view",
    nextEvent: "Checking expiry dates",
    lastRecord: "Loading latest training record",
    openActions: "Loading training actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load training data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Training unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No training data",
    openActions: "Check API routes",
  });
}

/* -------------------------------- public -------------------------------- */

export async function loadTrainingCentre() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const { summaryData, trainingData, complianceData, taskData, isFallback } =
      await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);
    const allItems = normaliseTrainingItems(trainingData);

    const complianceItems = normaliseComplianceItems(complianceData).slice(0, 8);

    const taskItems = normaliseTaskItems(taskData)
      .filter(
        (item) =>
          !item.completed &&
          !["completed", "closed", "cancelled"].includes(normaliseStatus(item.status))
      )
      .slice(0, 8);

    const stats = buildStats(allItems, complianceItems, taskItems);
    const progressCards = buildProgressCards(allItems);

    const recentItems = sortNewestFirst(allItems, [
      "completed_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const dueItems = sortSoonestFirst(allItems, [
      "expiry_date",
      "next_due_date",
      "updated_at",
      "created_at",
    ])
      .filter((item) =>
        [
          "expired",
          "overdue",
          "due",
          "due_soon",
          "review_due",
          "scheduled",
          "booked",
        ].includes(normaliseStatus(item.status))
      )
      .slice(0, 8);

    const priorityItems = buildPriorityItems(allItems, complianceItems, taskItems);

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} training`;

    els.viewContent.innerHTML = renderTrainingCentrePage({
      title,
      stats,
      progressCards,
      recentItems,
      dueItems,
      priorityItems,
      complianceItems,
      taskItems,
      allItems,
      isFallback,
    });

    const nextDue = dueItems[0];
    const latest = recentItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${stats.uniqueStaff} staff • preview mode`
        : `${stats.uniqueStaff} staff in training view`,
      nextEvent:
        nextDue?.expiry_date || nextDue?.next_due_date
          ? `Next due ${formatDate(nextDue.expiry_date || nextDue.next_due_date)}`
          : "No urgent training due date",
      lastRecord: latest?.completed_date
        ? `Latest training ${formatDateTime(latest.completed_date)}`
        : latest?.updated_at
        ? `Latest record ${formatDateTime(latest.updated_at)}`
        : isFallback
        ? "Preview training data loaded"
        : "No recent training record",
      openActions: `${toNumber(stats.openActions)} action${
        stats.openActions === 1 ? "" : "s"
      } • ${toNumber(stats.overdue)} overdue`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[training-centre] load failed", error);
    renderErrorState(error?.message || "Failed to load training data.");
  }
}
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
      "overdue",
      "expired",
      "missed",
      "critical",
      "escalated",
      "failed",
      "non_compliant",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due",
      "due_soon",
      "warning",
      "review_due",
      "attention",
      "scheduled",
      "probation",
      "induction",
      "in_progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "completed",
      "complete",
      "active",
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
  return data.summary || data.supervision_summary || data.dashboard || data || {};
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "supervision",
    title: item.title || item.staff_member || "Supervision record",
    staff_member: item.staff_member || item.name || "Staff member",
    supervisor: item.supervisor || item.line_manager || "",
    supervision_type: item.supervision_type || item.type || "supervision",
    probation_stage: item.probation_stage || "",
    summary:
      item.summary ||
      item.strengths ||
      item.development_needs ||
      item.actions_agreed ||
      "Supervision record logged.",
    strengths: item.strengths || "",
    development_needs: item.development_needs || "",
    actions_agreed: item.actions_agreed || "",
    session_date: item.session_date || item.completed_at || null,
    next_due_date: item.next_due_date || item.review_date || null,
    status: item.status || "recorded",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildStats(items = []) {
  const overdue = items.filter((item) =>
    ["overdue", "expired", "missed"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const dueSoon = items.filter((item) =>
    ["due", "due_soon", "review_due", "scheduled"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const probation = items.filter((item) =>
    ["probation", "induction"].includes(
      String(item.status || item.probation_stage || "").toLowerCase()
    )
  ).length;

  const completed = items.filter((item) =>
    ["completed", "complete", "up_to_date", "current", "signed_off"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const actions = items.filter((item) => item.actions_agreed).length;

  const uniqueStaff = new Set(
    items.map((item) => item.staff_member).filter(Boolean)
  ).size;

  return {
    total: items.length,
    overdue,
    dueSoon,
    probation,
    completed,
    actions,
    uniqueStaff,
  };
}

function buildPriorityItems(items = []) {
  return items.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return (
      [
        "overdue",
        "expired",
        "missed",
        "due",
        "due_soon",
        "review_due",
        "probation",
        "induction",
      ].includes(status) ||
      Boolean(item.development_needs) ||
      Boolean(item.actions_agreed)
    );
  });
}

function buildRecentItems(items = []) {
  return sortNewestFirst(items, ["session_date", "updated_at", "created_at"]);
}

function buildDueItems(items = []) {
  return sortSoonestFirst(items, ["next_due_date", "updated_at", "created_at"]);
}

function buildActionItems(items = []) {
  return items.filter((item) => item.actions_agreed || item.development_needs);
}

function renderEmptyState(message = "No supervision records.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">⬢</div>
        <h3>No supervision data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCards(stats) {
  return `
    <div class="overview-stats-grid overview-stats-grid--five">
      <article class="overview-stat-card">
        <span class="overview-stat-label">All records</span>
        <strong class="overview-stat-value">${safeText(stats.total)}</strong>
        <span class="overview-stat-note">Supervision records logged</span>
      </article>

      <article class="overview-stat-card ${
        stats.overdue > 0 ? "overview-stat-card--danger" : ""
      }">
        <span class="overview-stat-label">Overdue</span>
        <strong class="overview-stat-value">${safeText(stats.overdue)}</strong>
        <span class="overview-stat-note">Need urgent action</span>
      </article>

      <article class="overview-stat-card ${
        stats.dueSoon > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Due soon</span>
        <strong class="overview-stat-value">${safeText(stats.dueSoon)}</strong>
        <span class="overview-stat-note">Upcoming supervision pressure</span>
      </article>

      <article class="overview-stat-card ${
        stats.probation > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Probation / induction</span>
        <strong class="overview-stat-value">${safeText(stats.probation)}</strong>
        <span class="overview-stat-note">Closer oversight required</span>
      </article>

      <article class="overview-stat-card ${
        stats.completed > 0 ? "overview-stat-card--success" : ""
      }">
        <span class="overview-stat-label">Completed</span>
        <strong class="overview-stat-value">${safeText(stats.completed)}</strong>
        <span class="overview-stat-note">Up-to-date supervision records</span>
      </article>
    </div>
  `;
}

function renderRecordRows(items = [], options = {}) {
  const {
    emptyMessage = "No supervision records found.",
    titleBuilder = null,
    summaryBuilder = null,
    metaBuilder = null,
    statusBuilder = null,
    recordType = "supervision",
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
            : item.staff_member || item.title || "Staff member";

          const summary = summaryBuilder
            ? summaryBuilder(item)
            : item.summary || "Supervision record logged.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : [
                item.supervisor ? `Supervisor: ${item.supervisor}` : "",
                item.supervision_type || "",
                item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
              ]
                .filter(Boolean)
                .join(" • ");

          const status = statusBuilder
            ? statusBuilder(item)
            : item.status || "recorded";

          const tone = getStatusTone(status);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id)}"
              data-record-type="${safeText(item.record_type || recordType)}"
              data-title="${safeText(item.title || "Supervision record")}"
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
        <p>No urgent supervision issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 6)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.staff_member || "Supervision item")}</strong>
              <p>${safeText(
                item.actions_agreed ||
                  item.development_needs ||
                  item.summary ||
                  "Supervision item needs attention."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSupervisionPage({
  stats,
  recentItems,
  dueItems,
  priorityItems,
  actionItems,
  allItems,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Supervision</div>
          <h2>Supervision and development</h2>
          <p>Supervision oversight, due dates, probation, development needs and agreed actions across the home.</p>
        </div>
      </div>

      ${renderStatCards(stats)}

      <div class="overview-grid">
        <section class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent supervision records</h3>
              <p>The latest supervision activity and reflective conversations.</p>
            </div>

            ${renderRecordRows(recentItems, {
              emptyMessage: "No recent supervision records found.",
            })}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Due and upcoming</h3>
              <p>Supervisions due soon, overdue or requiring closer review.</p>
            </div>

            ${renderRecordRows(dueItems, {
              emptyMessage: "No due or upcoming supervision items found.",
            })}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important supervision and workforce development issues.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Development and actions</h3>
              <p>Agreed actions and development themes from supervision records.</p>
            </div>

            ${renderRecordRows(actionItems, {
              emptyMessage: "No development actions or supervision follow-up items found.",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All supervision records</h3>
              <p>Full supervision list for the home.</p>
            </div>

            ${renderRecordRows(allItems, {
              emptyMessage: "No supervision records found.",
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

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
        title: "Supervision and development",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    supervisionData: {
      items: [
        {
          id: "sup-1",
          staff_member: "Ben Carter",
          supervisor: "Sarah Ahmed",
          supervision_type: "Probation supervision",
          summary: "Probation supervision overdue. Review confidence, boundaries and recording quality.",
          development_needs: "Needs stronger confidence with safeguarding recording.",
          actions_agreed: "Book supervision this week and complete probation review note.",
          session_date: minusDays(35),
          next_due_date: minusDays(5),
          status: "overdue",
        },
        {
          id: "sup-2",
          staff_member: "Lena Morris",
          supervisor: "Sarah Ahmed",
          supervision_type: "Monthly supervision",
          summary: "Monthly supervision due this week.",
          strengths: "Strong relationship-based practice and good reflection.",
          actions_agreed: "Review workload and training refresh in next supervision.",
          session_date: minusDays(24),
          next_due_date: plusDays(3),
          status: "due_soon",
        },
        {
          id: "sup-3",
          staff_member: "Sarah Ahmed",
          supervisor: "Tom Kelly",
          supervision_type: "Manager supervision",
          summary: "Recent supervision completed and signed off.",
          strengths: "Clear leadership, consistent follow-up and good oversight.",
          session_date: minusDays(10),
          next_due_date: plusDays(18),
          status: "completed",
        },
        {
          id: "sup-4",
          staff_member: "Aimee Khan",
          supervisor: "Sarah Ahmed",
          supervision_type: "Induction supervision",
          summary: "Initial induction supervision scheduled.",
          development_needs: "Needs confidence with medication processes and handover clarity.",
          next_due_date: plusDays(2),
          status: "induction",
        },
      ],
    },
  };
}

async function fetchDataset(homeId) {
  const requests = [apiGet(`/homes/${homeId}/supervisions`)];

  const results = await Promise.allSettled(requests);
  const hasLiveSuccess = results.some((result) => result.status === "fulfilled");

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: {},
    supervisionData:
      results[0].status === "fulfilled" ? results[0].value : { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("A home ID is needed before supervision records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No supervision context",
    nextEvent: "No supervision view loaded",
    lastRecord: "No supervision data",
    openActions: "No supervision actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading supervision…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading supervision view",
    nextEvent: "Checking due dates",
    lastRecord: "Loading latest supervision",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load supervision data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Supervision unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No supervision data",
    openActions: "Check API routes",
  });
}

export async function loadSupervision() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const { summaryData, supervisionData, isFallback } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);
    const allItems = normaliseSupervisionItems(supervisionData);

    const stats = buildStats(allItems);
    const recentItems = buildRecentItems(allItems).slice(0, 8);
    const dueItems = buildDueItems(allItems)
      .filter((item) =>
        [
          "overdue",
          "expired",
          "missed",
          "due",
          "due_soon",
          "review_due",
          "scheduled",
          "probation",
          "induction",
        ].includes(String(item.status || "").toLowerCase())
      )
      .slice(0, 8);

    const priorityItems = buildPriorityItems(allItems);
    const actionItems = buildActionItems(allItems).slice(0, 8);
    const latest = recentItems[0];

    els.viewContent.innerHTML = renderSupervisionPage({
      stats,
      recentItems,
      dueItems,
      priorityItems,
      actionItems,
      allItems,
      title:
        summary.title ||
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        `Home ${homeId} supervision`,
      isFallback,
    });

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${stats.uniqueStaff} staff • preview mode`
        : `${stats.uniqueStaff} staff in supervision view`,
      nextEvent:
        dueItems[0]?.next_due_date
          ? `Next due ${formatDate(dueItems[0].next_due_date)}`
          : "No urgent supervision due date",
      lastRecord:
        latest?.session_date
          ? `Latest supervision ${formatDateTime(latest.session_date)}`
          : isFallback
          ? "Preview supervision data loaded"
          : "No recent supervision record",
      openActions: `${toNumber(stats.actions)} supervision action${
        stats.actions === 1 ? "" : "s"
      }`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load supervision data.");
  }
}
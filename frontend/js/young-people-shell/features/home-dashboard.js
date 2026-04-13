import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

function getHomeId() {
  return state.homeId || state.currentUser?.home_id || state.currentUser?.homeId || null;
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

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function getStatusTone(status = "") {
  const normalised = String(status || "").toLowerCase();

  if (["overdue", "high", "critical", "escalated", "missing"].includes(normalised)) {
    return "danger";
  }

  if (["due_soon", "warning", "medium", "review_due"].includes(normalised)) {
    return "warning";
  }

  if (["completed", "good", "active", "booked", "compliant"].includes(normalised)) {
    return "success";
  }

  return "muted";
}

function normaliseHomeSummary(data = {}) {
  return data.summary || data.home_summary || data.dashboard || data || {};
}

function normaliseTeamItems(data = {}) {
  return toArray(data.items, [data.team, data.staff, data.records]);
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]);
}

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [data.communications, data.records]);
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]);
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]);
}

function normaliseTherapyItems(data = {}) {
  return toArray(data.items, [data.therapy, data.records]);
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

function buildTopStats({
  summary = {},
  openTasks = [],
  overdueTasks = [],
  dueSupervisions = [],
  recentCommunications = [],
}) {
  return [
    {
      label: "Children in home",
      value: toNumber(summary.children_count ?? summary.young_people_count ?? summary.resident_count, 0),
      note: "Current live children",
      tone: "muted",
    },
    {
      label: "Open actions",
      value: openTasks.length,
      note: "Tasks needing completion",
      tone: openTasks.length ? "warning" : "success",
    },
    {
      label: "Overdue",
      value: overdueTasks.length,
      note: "Items needing urgent attention",
      tone: overdueTasks.length ? "danger" : "success",
    },
    {
      label: "Supervision due",
      value: dueSupervisions.length,
      note: "Staff oversight to complete",
      tone: dueSupervisions.length ? "warning" : "muted",
    },
    {
      label: "Recent comms",
      value: recentCommunications.length,
      note: "Latest liaison activity",
      tone: "muted",
    },
  ];
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--five">
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
            item?.name ||
            item?.staff_member ||
            item?.contact_person ||
            item?.document_type ||
            item?.service_name ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.role ||
            item?.organisation ||
            "No summary available.";

          const meta = metaBuilder ? metaBuilder(item) : item?.updated_at || item?.created_at || "";
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
                <span class="row-pill ${safeText(tone)}">${safeText(status || "Recorded")}</span>
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
        <p>No urgent home-wide issues are showing right now.</p>
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

function buildPriorityItems({ overdueTasks = [], dueSupervisions = [], expiringDocuments = [] }) {
  const items = [];

  overdueTasks.slice(0, 3).forEach((task) => {
    items.push({
      title: task.title || task.task || "Overdue task",
      summary: task.summary || task.notes || `Due ${formatDate(task.due_date)}`,
    });
  });

  dueSupervisions.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || item.title || "Supervision due",
      summary: item.next_due_date
        ? `Supervision due ${formatDate(item.next_due_date)}`
        : "Supervision needs booking or completion.",
    });
  });

  expiringDocuments.slice(0, 2).forEach((doc) => {
    items.push({
      title: doc.title || doc.document_type || "Document review due",
      summary: doc.review_date
        ? `Review due ${formatDate(doc.review_date)}`
        : "Document review is approaching.",
    });
  });

  return items.slice(0, 6);
}

function buildOperationalCounts({ summary = {}, team = [], tasks = [], documents = [] }) {
  const openVacancies = toNumber(summary.open_vacancies ?? summary.vacancies_count, 0);
  const absentStaff = team.filter((item) =>
    ["off", "sick", "absence"].includes(String(item.status || "").toLowerCase())
  ).length;
  const openActions = tasks.filter((item) => !item.completed).length;
  const docReviewsDue = documents.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return ["review_due", "due_soon", "overdue"].includes(status);
  }).length;

  return { openVacancies, absentStaff, openActions, docReviewsDue };
}

function renderHomeDashboardHtml({
  homeName = "Home",
  topStats = [],
  operationalCounts = {},
  priorityItems = [],
  recentCommunications = [],
  openTasks = [],
  dueSupervisions = [],
  recentDocuments = [],
  therapyItems = [],
  teamItems = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Home dashboard</div>
          <h2>${safeText(homeName)}</h2>
          <p>A live home-wide management view across operations, staffing, communication, documents and oversight.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Operational picture</h3>
              <p>The quickest view of workforce, actions, vacancies and document review pressure.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open vacancies</div>
                  <div class="record-row-summary">Known vacancies across the home.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.openVacancies > 0 ? "warning" : "muted"}">${safeText(
    operationalCounts.openVacancies
  )}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Staff absent</div>
                  <div class="record-row-summary">Staff currently off, sick or unavailable.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.absentStaff > 0 ? "warning" : "muted"}">${safeText(
    operationalCounts.absentStaff
  )}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open actions</div>
                  <div class="record-row-summary">Outstanding management and operational tasks.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.openActions > 0 ? "warning" : "muted"}">${safeText(
    operationalCounts.openActions
  )}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Document reviews due</div>
                  <div class="record-row-summary">Policies, statutory documents or records needing review.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.docReviewsDue > 0 ? "warning" : "muted"}">${safeText(
    operationalCounts.docReviewsDue
  )}</span>
                </div>
              </article>
            </div>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent communication</h3>
              <p>Latest liaison with professionals, families and partner agencies.</p>
            </div>

            ${renderRows(recentCommunications, {
              emptyMessage: "No recent communication records found.",
              titleKey: "contact_person",
              summaryKey: "summary",
              recordType: "communication",
              metaBuilder: (item) =>
                [
                  item.organisation || "",
                  item.contact_type || "",
                  formatDateTime(item.contact_datetime || item.created_at),
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open tasks</h3>
              <p>Management and operational actions still needing completion.</p>
            </div>

            ${renderRows(openTasks, {
              emptyMessage: "No open tasks found.",
              titleKey: "title",
              summaryKey: "task",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.assigned_role || "",
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
              <p>The most urgent management issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Supervision due</h3>
              <p>Upcoming or overdue staff supervision and oversight.</p>
            </div>

            ${renderRows(dueSupervisions, {
              emptyMessage: "No supervision items are currently due.",
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
              <h3>Documents</h3>
              <p>Recent uploads and review-sensitive records.</p>
            </div>

            ${renderRows(recentDocuments, {
              emptyMessage: "No documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
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
              <h3>Therapeutic services</h3>
              <p>Recent therapeutic input, recommendations and follow-up.</p>
            </div>

            ${renderRows(therapyItems, {
              emptyMessage: "No therapeutic service records found.",
              titleKey: "service_name",
              summaryKey: "summary",
              recordType: "therapy",
              metaBuilder: (item) =>
                [
                  item.professional_name || "",
                  item.session_date ? formatDate(item.session_date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Team overview</h3>
              <p>Latest team and staffing context.</p>
            </div>

            ${renderRows(teamItems, {
              emptyMessage: "No team updates found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "team",
              metaBuilder: (item) =>
                [item.role || "", item.status || "", formatDate(item.record_date || item.created_at)]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadHomeDashboard() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">▥</div>
            <h3>No home context available</h3>
            <p>A home ID is needed before the home dashboard can load.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading home dashboard…</p>
        </div>
      </div>
    </section>
  `;

  try {
    const [
      summaryData,
      teamData,
      taskData,
      communicationData,
      documentData,
      supervisionData,
      therapyData,
    ] = await Promise.all([
      apiGet(`/homes/${homeId}/dashboard`).catch(() => ({})),
      apiGet(`/homes/${homeId}/team`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/tasks`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/communications`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/documents`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/supervisions`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/therapy`).catch(() => ({ items: [] })),
    ]);

    const summary = normaliseHomeSummary(summaryData);

    const teamItems = sortNewestFirst(normaliseTeamItems(teamData), [
      "record_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const openTasks = taskItems.filter((item) => !item.completed);
    const overdueTasks = openTasks.filter((item) =>
      ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
    );

    const communicationItems = sortNewestFirst(
      normaliseCommunicationItems(communicationData),
      ["contact_datetime", "updated_at", "created_at"]
    ).slice(0, 6);

    const documentItems = sortSoonestFirst(normaliseDocumentItems(documentData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const recentDocuments = documentItems.slice(0, 6);
    const expiringDocuments = documentItems.filter((item) =>
      ["review_due", "due_soon", "overdue"].includes(String(item.status || "").toLowerCase())
    );

    const supervisionItems = sortSoonestFirst(
      normaliseSupervisionItems(supervisionData),
      ["next_due_date", "updated_at", "created_at"]
    );

    const dueSupervisions = supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue"].includes(String(item.status || "").toLowerCase())
    );

    const therapyItems = sortNewestFirst(normaliseTherapyItems(therapyData), [
      "session_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const topStats = buildTopStats({
      summary,
      openTasks,
      overdueTasks,
      dueSupervisions,
      recentCommunications: communicationItems,
    });

    const operationalCounts = buildOperationalCounts({
      summary,
      team: teamItems,
      tasks: taskItems,
      documents: documentItems,
    });

    const priorityItems = buildPriorityItems({
      overdueTasks,
      dueSupervisions,
      expiringDocuments,
    });

    const homeName =
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      "Home dashboard";

    els.viewContent.innerHTML = renderHomeDashboardHtml({
      homeName,
      topStats,
      operationalCounts,
      priorityItems,
      recentCommunications: communicationItems,
      openTasks: openTasks.slice(0, 8),
      dueSupervisions: dueSupervisions.slice(0, 6),
      recentDocuments,
      therapyItems,
      teamItems,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">!</div>
            <h3>Failed to load home dashboard</h3>
            <p>${safeText(error?.message || "The home dashboard could not be loaded.")}</p>
          </div>
        </div>
      </section>
    `;
  }
}

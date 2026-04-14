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

function getStatusTone(status = "") {
  const normalised = String(status || "").toLowerCase().replaceAll(" ", "_");

  if (
    [
      "absent",
      "sick",
      "off_shift",
      "annual_leave",
      "vacant",
      "vacancy",
      "critical",
      "escalated",
      "overdue",
      "missing",
      "non_compliant",
      "failed",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "agency",
      "bank_staff",
      "limited",
      "training_due",
      "probation",
      "attention",
      "due_soon",
      "in_progress",
      "review_due",
      "induction",
      "working_remotely",
      "visiting_professional",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "active",
      "on_shift",
      "available",
      "confirmed",
      "good",
      "compliant",
      "complete",
      "completed",
      "up_to_date",
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

function normaliseSummary(data = {}) {
  return data.summary || data.dashboard || {};
}

function normaliseTeamItems(data = {}) {
  return toArray(data.items, [data.team, data.staff, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "team",
    full_name:
      item.full_name ||
      item.staff_member ||
      item.name ||
      item.title ||
      "Staff member",
    staff_member:
      item.staff_member ||
      item.full_name ||
      item.name ||
      "Staff member",
    role: item.role || item.job_title || "",
    status: item.status || item.employment_status || "active",
    summary:
      item.summary ||
      item.notes ||
      `${item.role || "Team member"} status recorded.`,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "supervision",
    staff_member: item.staff_member || item.name || "Staff member",
    role: item.role || "",
    status: item.status || "recorded",
    due_date: item.due_date || item.next_due_date || item.review_date || null,
    summary:
      item.summary ||
      (item.due_date ? `Supervision due ${formatDate(item.due_date)}` : "Supervision record."),
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.statutory_documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "document",
    title: item.title || item.document_type || "Document",
    document_type: item.document_type || "",
    status: item.status || "active",
    review_date: item.review_date || item.expiry_date || null,
    summary:
      item.summary ||
      item.description ||
      "Document available for review.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [data.communications, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "communication",
    title: item.title || "Communication",
    status: item.status || "recorded",
    summary:
      item.summary ||
      "Communication logged.",
    contact_datetime: item.contact_datetime || item.created_at || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildStats({
  teamItems = [],
  supervisionItems = [],
  documentItems = [],
}) {
  const active = teamItems.filter((item) =>
    ["active", "on_shift", "available"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const staffingPressure = teamItems.filter((item) =>
    ["off_shift", "annual_leave", "sick", "bank_staff", "agency", "working_remotely", "visiting_professional"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const supervisionGaps = supervisionItems.filter((item) =>
    ["due", "due_soon", "overdue", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const documentGaps = documentItems.filter((item) =>
    ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const uniqueRoles = new Set(
    teamItems.map((item) => item.role).filter(Boolean)
  ).size;

  return {
    total: teamItems.length,
    active,
    staffingPressure,
    supervisionGaps,
    documentGaps,
    uniqueRoles,
  };
}

function buildPriorityItems({
  teamItems = [],
  supervisionItems = [],
  documentItems = [],
  communicationItems = [],
}) {
  const items = [];

  supervisionItems
    .filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.staff_member || "Supervision due",
        summary:
          item.summary ||
          (item.due_date
            ? `Supervision due ${formatDate(item.due_date)}`
            : "Supervision requires action."),
      });
    });

  documentItems
    .filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.title || item.document_type || "Document gap",
        summary:
          item.summary ||
          "Important document needs review.",
      });
    });

  teamItems
    .filter((item) =>
      ["sick", "absent", "annual_leave", "agency", "bank_staff"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || "Staffing pressure",
        summary:
          item.summary ||
          `${item.role || "Team role"} is affecting staffing coverage.`,
      });
    });

  communicationItems
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Communication",
        summary: item.summary || "Recent communication logged.",
      });
    });

  return items.slice(0, 8);
}

function renderEmptyState(message = "No workforce data available.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">◍</div>
        <h3>No workforce data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCards(stats) {
  return `
    <div class="overview-stats-grid overview-stats-grid--five">
      <article class="overview-stat-card">
        <span class="overview-stat-label">Team records</span>
        <strong class="overview-stat-value">${safeText(stats.total)}</strong>
        <span class="overview-stat-note">Visible workforce entries</span>
      </article>

      <article class="overview-stat-card ${
        stats.active > 0 ? "overview-stat-card--success" : ""
      }">
        <span class="overview-stat-label">Active</span>
        <strong class="overview-stat-value">${safeText(stats.active)}</strong>
        <span class="overview-stat-note">Currently active staff</span>
      </article>

      <article class="overview-stat-card ${
        stats.staffingPressure > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Staffing pressure</span>
        <strong class="overview-stat-value">${safeText(stats.staffingPressure)}</strong>
        <span class="overview-stat-note">Absence, leave or agency use</span>
      </article>

      <article class="overview-stat-card ${
        stats.supervisionGaps > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Supervision due</span>
        <strong class="overview-stat-value">${safeText(stats.supervisionGaps)}</strong>
        <span class="overview-stat-note">Oversight needing action</span>
      </article>

      <article class="overview-stat-card ${
        stats.documentGaps > 0 ? "overview-stat-card--danger" : ""
      }">
        <span class="overview-stat-label">Document gaps</span>
        <strong class="overview-stat-value">${safeText(stats.documentGaps)}</strong>
        <span class="overview-stat-note">Review or expiry issues</span>
      </article>
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
    recordType = "",
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
            : item.full_name || item.staff_member || item.title || "Record";

          const summary = summaryBuilder
            ? summaryBuilder(item)
            : item.summary || "Record available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : [
                item.role || "",
                item.updated_at ? formatDateTime(item.updated_at) : "",
              ]
                .filter(Boolean)
                .join(" • ");

          const rawStatus = statusBuilder
            ? statusBuilder(item)
            : item.status || "recorded";

          const tone = getStatusTone(rawStatus);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item.record_type || "team")}"
              data-title="${safeText(title)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(rawStatus)}</span>
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
              <strong>${safeText(item.title || "Workforce item")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTeamPage({
  stats,
  teamItems,
  supervisionItems,
  documentItems,
  communicationItems,
  priorityItems,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Team and workforce</div>
          <h2>Team and staffing</h2>
          <p>A workforce view across team members, staffing pressures, supervision, documents and operational readiness.</p>
        </div>
      </div>

      ${renderStatCards(stats)}

      <div class="overview-grid">
        <section class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Team members</h3>
              <p>Current staff roles and availability across the home.</p>
            </div>

            ${renderRecordRows(teamItems, {
              emptyMessage: "No team records found.",
              recordType: "team",
              titleBuilder: (item) => item.full_name || item.staff_member || "Staff member",
              summaryBuilder: (item) =>
                item.summary || `${item.role || "Team member"} status recorded.`,
              metaBuilder: (item) =>
                [item.role || ""].filter(Boolean).join(" • "),
              statusBuilder: (item) => item.status || "active",
            })}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Supervision</h3>
              <p>Supervision activity, due items and oversight needs.</p>
            </div>

            ${renderRecordRows(supervisionItems.slice(0, 8), {
              emptyMessage: "No supervision items found.",
              recordType: "supervision",
              titleBuilder: (item) => item.staff_member || "Supervision item",
              summaryBuilder: (item) => item.summary || "Supervision record.",
              metaBuilder: (item) =>
                [
                  item.role || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusBuilder: (item) => item.status || "recorded",
            })}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important workforce issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Document readiness</h3>
              <p>Documents requiring review, renewal or follow-up.</p>
            </div>

            ${renderRecordRows(documentItems.slice(0, 8), {
              emptyMessage: "No document readiness issues found.",
              recordType: "document",
              titleBuilder: (item) =>
                item.title || item.document_type || "Document item",
              summaryBuilder: (item) =>
                item.summary || "Document item recorded.",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusBuilder: (item) => item.status || "recorded",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent communications</h3>
              <p>Latest staffing-related communication or updates.</p>
            </div>

            ${renderRecordRows(communicationItems.slice(0, 6), {
              emptyMessage: "No recent communications found.",
              recordType: "communication",
              titleBuilder: (item) => item.title || "Communication",
              summaryBuilder: (item) => item.summary || "Communication logged.",
              metaBuilder: (item) =>
                item.contact_datetime
                  ? formatDateTime(item.contact_datetime)
                  : "",
              statusBuilder: (item) => item.status || "recorded",
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
        title: "Team and staffing",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    teamData: {
      items: [
        {
          id: "team-1",
          full_name: "Sarah Ahmed",
          staff_member: "Sarah Ahmed",
          role: "Deputy manager",
          status: "On shift",
          summary: "Leading day-to-day operational oversight.",
        },
        {
          id: "team-2",
          full_name: "Ben Carter",
          staff_member: "Ben Carter",
          role: "Senior residential worker",
          status: "On shift",
          summary: "Senior shift support and child-focused oversight.",
        },
        {
          id: "team-3",
          full_name: "Lena Morris",
          staff_member: "Lena Morris",
          role: "Residential worker",
          status: "Annual leave",
          summary: "Currently away from rota.",
        },
        {
          id: "team-4",
          full_name: "Agency cover worker",
          staff_member: "Agency cover worker",
          role: "Agency worker",
          status: "Available",
          summary: "Available for rota pressure.",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: "sup-1",
          staff_member: "Ben Carter",
          role: "Senior residential worker",
          due_date: minusDays(2),
          summary: "Supervision overdue.",
          status: "overdue",
        },
        {
          id: "sup-2",
          staff_member: "Sarah Ahmed",
          role: "Deputy manager",
          due_date: plusDays(5),
          summary: "Supervision due this week.",
          status: "due_soon",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          title: "Staff file review",
          document_type: "Staff file",
          review_date: plusDays(3),
          summary: "One file review due this week.",
          status: "review_due",
        },
      ],
    },
    communicationData: {
      items: [
        {
          id: "comm-1",
          title: "Staffing update",
          summary: "Agency cover arranged for weekend shifts.",
          contact_datetime: minusDays(1),
          status: "Sent",
        },
      ],
    },
  };
}

async function fetchDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/team`),
    apiGet(`/homes/${homeId}/supervisions`),
    apiGet(`/homes/${homeId}/documents`),
    apiGet(`/homes/${homeId}/communications`),
  ];

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
    teamData: results[0].status === "fulfilled" ? results[0].value : { items: [] },
    supervisionData: results[1].status === "fulfilled" ? results[1].value : { items: [] },
    documentData: results[2].status === "fulfilled" ? results[2].value : { items: [] },
    communicationData: results[3].status === "fulfilled" ? results[3].value : { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("A home ID is needed before team records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No team context",
    nextEvent: "No staffing view loaded",
    lastRecord: "No team data",
    openActions: "No staffing actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading team…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading workforce view",
    nextEvent: "Checking reviews",
    lastRecord: "Loading latest workforce record",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load team data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Team unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No workforce data",
    openActions: "Check API routes",
  });
}

export async function loadTeam() {
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
      teamData,
      supervisionData,
      documentData,
      communicationData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const teamItems = sortNewestFirst(normaliseTeamItems(teamData), [
      "updated_at",
      "created_at",
    ]).slice(0, 12);

    const supervisionItems = sortSoonestFirst(
      normaliseSupervisionItems(supervisionData),
      ["due_date", "updated_at", "created_at"]
    );

    const documentItems = sortSoonestFirst(
      normaliseDocumentItems(documentData),
      ["review_date", "updated_at", "created_at"]
    );

    const communicationItems = sortNewestFirst(
      normaliseCommunicationItems(communicationData),
      ["contact_datetime", "updated_at", "created_at"]
    );

    const stats = buildStats({
      teamItems,
      supervisionItems,
      documentItems,
    });

    const priorityItems = buildPriorityItems({
      teamItems,
      supervisionItems,
      documentItems,
      communicationItems,
    });

    els.viewContent.innerHTML = renderTeamPage({
      stats,
      teamItems,
      supervisionItems,
      documentItems,
      communicationItems,
      priorityItems,
      isFallback,
      title:
        summary.title ||
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        `Home ${homeId} workforce`,
    });

    const nextSupervision = supervisionItems.find((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const latestProfile = teamItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${toNumber(stats.total)} team • preview mode`
        : `${toNumber(stats.total)} team • ${toNumber(stats.active)} active`,
      nextEvent: nextSupervision?.due_date
        ? `Supervision due ${formatDate(nextSupervision.due_date)}`
        : "No immediate workforce review",
      lastRecord:
        latestProfile?.updated_at || latestProfile?.created_at
          ? `Latest team update ${formatDateTime(
              latestProfile.updated_at || latestProfile.created_at
            )}`
          : isFallback
          ? "Preview workforce data loaded"
          : "No recent workforce record",
      openActions: `${toNumber(stats.supervisionGaps)} supervision • ${toNumber(
        stats.documentGaps
      )} document gaps`,
    });
  } catch (error) {
    console.error("[team] load failed", error);
    renderErrorState(error?.message || "Failed to load team data.");
  }
}

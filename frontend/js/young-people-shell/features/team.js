import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* -------------------------------- helpers -------------------------------- */

const SAFE_EMPTY = Object.freeze({ items: [] });

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

function normaliseStatus(value = "") {
  return String(value || "").toLowerCase().trim().replaceAll(" ", "_");
}

function getStatusTone(status = "") {
  const normalised = normaliseStatus(status);

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
      "expired",
      "inactive",
      "suspended",
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
      "due",
      "scheduled",
      "booked",
      "pending",
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
      "current",
      "passed",
      "recorded",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
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

    const aTime = aValue ? toTime(aValue) : Number.POSITIVE_INFINITY;
    const bTime = bValue ? toTime(bValue) : Number.POSITIVE_INFINITY;

    return aTime - bTime;
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.staff) && data.staff.length > 0) return true;
  if (Array.isArray(data.team) && data.team.length > 0) return true;
  if (Array.isArray(data.supervisions) && data.supervisions.length > 0) return true;
  if (Array.isArray(data.staff_supervisions) && data.staff_supervisions.length > 0) return true;
  if (Array.isArray(data.staff_supervision_sessions) && data.staff_supervision_sessions.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.staff_documents) && data.staff_documents.length > 0) return true;
  if (Array.isArray(data.employee_files) && data.employee_files.length > 0) return true;
  if (Array.isArray(data.communications) && data.communications.length > 0) return true;
  if (Array.isArray(data.notifications) && data.notifications.length > 0) return true;
  return false;
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

          const meta = metaBuilder ? metaBuilder(item) : "";
          const rawStatus = statusBuilder
            ? statusBuilder(item)
            : item.status || "recorded";

          const tone = getStatusTone(rawStatus);

          return `
            <article class="record-row record-row--static">
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

/* -------------------------------- mappers -------------------------------- */

function normaliseTeamItems(data = {}) {
  return toArray(data.items, [data.staff, data.team, data.records]).map(
    (item) => ({
      id: item.id ?? item.staff_id ?? null,
      full_name:
        item.full_name ||
        [item.first_name, item.last_name].filter(Boolean).join(" ") ||
        item.staff_member ||
        "Staff member",
      staff_member:
        item.full_name ||
        [item.first_name, item.last_name].filter(Boolean).join(" ") ||
        item.staff_member ||
        "Staff member",
      role: item.role || item.job_role || item.role_title || "Team member",
      status:
        item.status ||
        item.employment_status ||
        (item.active === false ? "inactive" : item.active === true ? "active" : "active"),
      summary:
        item.summary ||
        item.notes ||
        item.employment_status ||
        `${item.role || item.role_title || "Team member"} profile recorded.`,
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
      record_type: "team",
    })
  );
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [
    data.supervisions,
    data.staff_supervisions,
    data.staff_supervision_sessions,
    data.records,
  ]).map((item) => ({
    id: item.id ?? null,
    staff_member: item.staff_member || item.full_name || "Staff member",
    role: item.role || item.supervision_type || "",
    due_date:
      item.due_date ||
      item.next_supervision_date ||
      item.next_session_date ||
      item.scheduled_date ||
      null,
    summary:
      item.summary ||
      item.agreed_actions ||
      item.wellbeing_summary ||
      "Supervision record.",
    status:
      item.status ||
      item.session_status ||
      (item.due_date || item.next_supervision_date || item.next_session_date
        ? "due_soon"
        : "recorded"),
    record_type: "supervision",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [
    data.documents,
    data.staff_documents,
    data.employee_files,
    data.records,
  ]).map((item) => ({
    id: item.id ?? null,
    title: item.title || item.file_type || item.document_type || "Document item",
    document_type: item.document_type || item.file_type || "Document",
    review_date: item.review_date || item.expiry_date || null,
    summary:
      item.summary ||
      item.notes ||
      item.status ||
      "Document item recorded.",
    status: item.status || (item.expiry_date ? "review_due" : "recorded"),
    record_type: "document",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [
    data.communications,
    data.notifications,
    data.records,
  ]).map((item) => ({
    id: item.id ?? null,
    title: item.title || item.subject || "Communication",
    summary: item.summary || item.message || item.notes || "Communication logged.",
    contact_datetime:
      item.contact_datetime ||
      item.created_at ||
      item.updated_at ||
      null,
    status: item.status || "recorded",
    record_type: "communication",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

/* -------------------------------- models -------------------------------- */

function buildStats(teamItems, supervisionItems, documentItems) {
  return {
    total: teamItems.length,
    active: teamItems.filter((item) =>
      ["active", "on_shift", "available"].includes(normaliseStatus(item.status))
    ).length,
    staffingPressure: teamItems.filter((item) =>
      [
        "off_shift",
        "annual_leave",
        "sick",
        "bank_staff",
        "agency",
        "working_remotely",
        "visiting_professional",
        "vacant",
        "vacancy",
      ].includes(normaliseStatus(item.status))
    ).length,
    supervisionGaps: supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        normaliseStatus(item.status)
      )
    ).length,
    documentGaps: documentItems.filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
        normaliseStatus(item.status)
      )
    ).length,
  };
}

function buildPriorityItems(teamItems, supervisionItems, documentItems) {
  const items = [];

  supervisionItems
    .filter((item) =>
      ["overdue", "due_soon", "review_due", "due"].includes(
        normaliseStatus(item.status)
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || "Supervision due",
        summary: item.due_date
          ? `Supervision due ${formatDate(item.due_date)}.`
          : item.summary || "Supervision needs booking.",
      });
    });

  documentItems
    .filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
        normaliseStatus(item.status)
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Document gap",
        summary: item.review_date
          ? `Review due ${formatDate(item.review_date)}.`
          : item.summary || "Document needs attention.",
      });
    });

  const pressureCount = teamItems.filter((item) =>
    [
      "off_shift",
      "annual_leave",
      "sick",
      "bank_staff",
      "agency",
      "working_remotely",
      "visiting_professional",
      "vacant",
      "vacancy",
    ].includes(normaliseStatus(item.status))
  ).length;

  if (pressureCount > 0) {
    items.push({
      title: "Staffing pressure",
      summary: `${pressureCount} workforce record${pressureCount === 1 ? "" : "s"} need staffing attention.`,
    });
  }

  return items.slice(0, 6);
}

function buildStaticTeamModel(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const teamItems = [
    {
      id: "team-1",
      full_name: "Sarah Ahmed",
      staff_member: "Sarah Ahmed",
      role: "Registered Manager",
      status: "On shift",
      summary: "Leads home oversight, staffing and safeguarding review.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-2",
      full_name: "Tom Patel",
      staff_member: "Tom Patel",
      role: "Deputy Manager",
      status: "On shift",
      summary: "Supporting daily operations and shift leadership.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-3",
      full_name: "Leah Brown",
      staff_member: "Leah Brown",
      role: "Senior Residential Worker",
      status: "On shift",
      summary: "Senior shift support and child-centred practice leadership.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-4",
      full_name: "Amir Hussain",
      staff_member: "Amir Hussain",
      role: "Residential Worker",
      status: "Off shift",
      summary: "Core residential care and routines support.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-5",
      full_name: "Chloe Davies",
      staff_member: "Chloe Davies",
      role: "Residential Worker",
      status: "On shift",
      summary: "Daily care, routines and relationship-based support.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-6",
      full_name: "Michael Osei",
      staff_member: "Michael Osei",
      role: "Waking Night",
      status: "Annual leave",
      summary: "Night cover and overnight welfare monitoring.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-7",
      full_name: "Priya Shah",
      staff_member: "Priya Shah",
      role: "Therapist",
      status: "Visiting professional",
      summary: "Therapeutic support and consultation.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
    {
      id: "team-8",
      full_name: "Danielle Green",
      staff_member: "Danielle Green",
      role: "Education Lead",
      status: "Working remotely",
      summary: "Education liaison and attendance support.",
      updated_at: new Date().toISOString(),
      record_type: "team",
    },
  ];

  const supervisionItems = [
    {
      id: "sup-1",
      staff_member: "Leah Brown",
      role: "Senior Residential Worker",
      due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      summary: "Supervision due this week.",
      status: "due_soon",
      record_type: "supervision",
    },
    {
      id: "sup-2",
      staff_member: "Michael Osei",
      role: "Waking Night",
      due_date: new Date(Date.now() - 2 * 86400000).toISOString(),
      summary: "Supervision overdue.",
      status: "overdue",
      record_type: "supervision",
    },
  ];

  const documentItems = [
    {
      id: "doc-1",
      title: "Staff file review",
      document_type: "Staff file",
      review_date: new Date(Date.now() + 5 * 86400000).toISOString(),
      summary: "Staff file review due this week.",
      status: "review_due",
      record_type: "document",
    },
    {
      id: "doc-2",
      title: "Training certificate check",
      document_type: "Training",
      review_date: new Date(Date.now() + 10 * 86400000).toISOString(),
      summary: "Training evidence needs updating.",
      status: "due_soon",
      record_type: "document",
    },
  ];

  const communicationItems = [
    {
      id: "comm-1",
      title: "Staffing update",
      summary: "Weekend cover confirmed and rota adjusted.",
      contact_datetime: new Date(Date.now() - 86400000).toISOString(),
      status: "Sent",
      record_type: "communication",
    },
    {
      id: "comm-2",
      title: "Supervision reminder",
      summary: "Upcoming supervision reminders sent to staff.",
      contact_datetime: new Date().toISOString(),
      status: "Sent",
      record_type: "communication",
    },
  ];

  return {
    homeName,
    teamItems,
    supervisionItems,
    documentItems,
    communicationItems,
    stats: buildStats(teamItems, supervisionItems, documentItems),
    priorityItems: buildPriorityItems(teamItems, supervisionItems, documentItems),
  };
}

/* -------------------------------- render -------------------------------- */

function renderTeamPage({
  stats,
  teamItems,
  supervisionItems,
  documentItems,
  communicationItems,
  priorityItems,
  homeName,
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Team and workforce</div>
          <h2>Team and staffing • ${safeText(homeName)}</h2>
          <p>A workforce view across team members, staffing pressures, supervision, documents and operational readiness.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live workforce endpoints are available.</p>`
              : ""
          }
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

/* ------------------------------- UI states ------------------------------- */

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
    openActions: "Check setup",
  });
}

/* -------------------------------- fetch -------------------------------- */

async function fetchDataset(homeId) {
  const safe = (url) => apiGet(url).catch(() => null);

  const [
    staffData,
    supervisionData,
    documentData,
    communicationData,
  ] = await Promise.all([
    safe(`/homes/${homeId}/staff`),
    safe(`/homes/${homeId}/supervisions`),
    safe(`/homes/${homeId}/documents`),
    safe(`/homes/${homeId}/communications`),
  ]);

  const hasLive =
    hasUsableData(staffData) ||
    hasUsableData(supervisionData) ||
    hasUsableData(documentData) ||
    hasUsableData(communicationData);

  if (!hasLive) {
    return {
      ...buildStaticTeamModel(homeId),
      isFallback: true,
    };
  }

  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const teamItems = sortNewestFirst(normaliseTeamItems(staffData), [
    "updated_at",
    "created_at",
  ]);

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

  return {
    homeName,
    teamItems,
    supervisionItems,
    documentItems,
    communicationItems,
    stats: buildStats(teamItems, supervisionItems, documentItems),
    priorityItems: buildPriorityItems(teamItems, supervisionItems, documentItems),
    isFallback: false,
  };
}

/* -------------------------------- public -------------------------------- */

export async function loadTeam() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const model = await fetchDataset(homeId);

    els.viewContent.innerHTML = renderTeamPage({
      stats: model.stats,
      teamItems: model.teamItems,
      supervisionItems: model.supervisionItems,
      documentItems: model.documentItems,
      communicationItems: model.communicationItems,
      priorityItems: model.priorityItems,
      homeName: model.homeName,
      isFallback: model.isFallback,
    });

    const nextSupervision = model.supervisionItems.find((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        normaliseStatus(item.status)
      )
    );

    const latestProfile = sortNewestFirst(model.teamItems, [
      "updated_at",
      "created_at",
    ])[0];

    updateWorkspaceSummaryStrip({
      today: model.isFallback
        ? `${toNumber(model.stats.total)} team • preview mode`
        : `${toNumber(model.stats.total)} team • live view`,
      nextEvent: nextSupervision?.due_date
        ? `Supervision due ${formatDate(nextSupervision.due_date)}`
        : "No immediate workforce review",
      lastRecord:
        latestProfile?.updated_at || latestProfile?.created_at
          ? `Latest team update ${formatDateTime(
              latestProfile.updated_at || latestProfile.created_at
            )}`
          : "No recent workforce record",
      openActions: `${toNumber(model.stats.supervisionGaps)} supervision • ${toNumber(
        model.stats.documentGaps
      )} document gaps`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[team] load failed", error);
    renderErrorState(error?.message || "Failed to load team data.");
  }
}
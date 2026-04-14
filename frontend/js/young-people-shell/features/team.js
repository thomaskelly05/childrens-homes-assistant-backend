import { state } from "../state.js";
import { els } from "../dom.js";
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
            : "";

          const rawStatus = statusBuilder
            ? statusBuilder(item)
            : item.status || "recorded";

          const tone = getStatusTone(rawStatus);
          const rowId = item?.id || "";

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

  const stats = {
    total: teamItems.length,
    active: teamItems.filter((item) =>
      ["active", "on_shift", "available"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    ).length,
    staffingPressure: teamItems.filter((item) =>
      ["off_shift", "annual_leave", "sick", "bank_staff", "agency", "working_remotely", "visiting_professional"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    ).length,
    supervisionGaps: supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    ).length,
    documentGaps: documentItems.filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    ).length,
  };

  const priorityItems = [
    {
      title: "Michael Osei",
      summary: "Supervision overdue and needs booking.",
    },
    {
      title: "Staff file review",
      summary: "Document review due this week.",
    },
    {
      title: "Weekend staffing",
      summary: "Agency or bank support may still be needed for cover.",
    },
  ];

  return {
    homeName,
    teamItems,
    supervisionItems,
    documentItems,
    communicationItems,
    stats,
    priorityItems,
  };
}

function renderTeamPage({
  stats,
  teamItems,
  supervisionItems,
  documentItems,
  communicationItems,
  priorityItems,
  homeName,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Team and workforce</div>
          <h2>Team and staffing • ${safeText(homeName)}</h2>
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

export async function loadTeam() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const model = buildStaticTeamModel(homeId);

    els.viewContent.innerHTML = renderTeamPage({
      stats: model.stats,
      teamItems: model.teamItems,
      supervisionItems: model.supervisionItems,
      documentItems: model.documentItems,
      communicationItems: model.communicationItems,
      priorityItems: model.priorityItems,
      homeName: model.homeName,
    });

    const nextSupervision = model.supervisionItems.find((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const latestProfile = model.teamItems[0];

    updateWorkspaceSummaryStrip({
      today: `${toNumber(model.stats.total)} team • safe mode`,
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
  } catch (error) {
    console.error("[team] load failed", error);
    renderErrorState(error?.message || "Failed to load team data.");
  }
}

import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
  mapComplianceItem,
  mapTask,
} from "../core/adapters.js";

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

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isFuture(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

function isValidDateValue(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSummaryDate(value) {
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

function getRowTitle(item = {}) {
  return (
    item.title ||
    item.summary ||
    item.appointment_type ||
    item.record_type_label ||
    item.event_type ||
    "Record"
  );
}

function getRowSummary(item = {}) {
  return (
    item.summary ||
    item.presentation ||
    item.description ||
    item.notes ||
    item.outcome ||
    "No summary available."
  );
}

function getRowMetaDate(item = {}) {
  return (
    item.record_date ||
    item.start_datetime ||
    item.event_datetime ||
    item.occurred_at ||
    item.contact_datetime ||
    item.created_at ||
    item.updated_at ||
    ""
  );
}

function getRowTypeLabel(item = {}) {
  return (
    item.record_type_label ||
    item.record_type ||
    item.type ||
    item.event_type ||
    item.appointment_type ||
    "Record"
  );
}

function getRowPill(item = {}) {
  const severity = String(item.severity || "").toLowerCase();
  const status = String(item.status || item.workflow_status || "").toLowerCase();

  if (
    ["critical", "high"].includes(severity) ||
    ["overdue", "escalated"].includes(status)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["draft", "pending", "review_due", "due_soon"].includes(status)) {
    return { label: "In progress", tone: "muted" };
  }

  return { label: "Recorded", tone: "muted" };
}

function renderRecordRows(items = [], emptyMessage = "Nothing to show right now.") {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>${toText(emptyMessage)}</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);
          const id = item.id ?? item.record_id ?? item.source_id ?? "";
          const type = item.record_type || item.type || "";
          const metaDate = getRowMetaDate(item);
          const metaText = isValidDateValue(metaDate)
            ? formatDate(metaDate)
            : getRowTypeLabel(item);

          return `
            <article
              class="record-row"
              data-record-id="${toText(id)}"
              data-record-type="${toText(type)}"
              data-open-record="true"
              data-title="${toText(getRowTitle(item))}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(getRowTitle(item))}</div>
                <div class="record-row-summary">${toText(getRowSummary(item))}</div>
                <div class="record-row-meta">${toText(metaText)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = [], emptyMessage = "Nothing urgent is showing right now.") {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>${toText(emptyMessage)}</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 4)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${toText(getRowTitle(item))}</strong>
              <p>${toText(getRowSummary(item))}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildPriorityRows({
  incidents = [],
  compliance = [],
  tasks = [],
  chronology = [],
}) {
  const incidentRows = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  );

  const complianceRows = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  );

  const taskRows = tasks.filter((item) => !item.completed);

  const chronologyRows = chronology.filter((item) => item.safeguarding_flag);

  return [...incidentRows, ...complianceRows, ...taskRows, ...chronologyRows].slice(0, 10);
}

function buildTodayRows({
  appointments = [],
  dailyNotes = [],
  chronology = [],
}) {
  const todayAppointments = appointments.filter((item) => isToday(item.start_datetime));
  const todayNotes = dailyNotes.filter((item) => isToday(item.record_date || item.created_at));
  const todayChronology = chronology.filter((item) =>
    isToday(item.event_datetime || item.created_at)
  );

  return [...todayAppointments, ...todayNotes, ...todayChronology].slice(0, 10);
}

function buildUpcomingRows({
  appointments = [],
  plans = [],
  compliance = [],
}) {
  const upcomingAppointments = appointments.filter(
    (item) =>
      isFuture(item.start_datetime) &&
      !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  );

  const reviewPlans = plans.filter((item) => isFuture(item.review_date));
  const dueSoonCompliance = compliance.filter(
    (item) => String(item.status || "").toLowerCase() === "due_soon"
  );

  return [...upcomingAppointments, ...reviewPlans, ...dueSoonCompliance].slice(0, 10);
}

function buildOverviewCounts({
  priorityRows = [],
  todayRows = [],
  upcomingRows = [],
  tasks = [],
}) {
  return {
    urgent: priorityRows.length,
    today: todayRows.length,
    upcoming: upcomingRows.length,
    openTasks: tasks.filter((item) => !item.completed).length,
  };
}

function buildOperationalCounts({
  incidents = [],
  appointments = [],
  plans = [],
  compliance = [],
}) {
  const urgentCount = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  ).length;

  const openAppointments = appointments.filter(
    (item) => !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  ).length;

  const activePlans = plans.filter((item) =>
    ["active", "review_due", "approved", "submitted"].includes(
      String(item.status || item.workflow_status || "").toLowerCase()
    )
  ).length;

  const overdueCount = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  ).length;

  return {
    urgentCount,
    openAppointments,
    activePlans,
    overdueCount,
  };
}

function renderLatestContext({
  dailyNotes = [],
  incidents = [],
  plans = [],
  appointments = [],
}) {
  const latestNote = dailyNotes[0] || null;
  const latestIncident = incidents[0] || null;
  const latestPlan = plans[0] || null;
  const nextAppointment =
    appointments.find(
      (item) =>
        isFuture(item.start_datetime) &&
        !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
    ) || null;

  const items = [
    {
      title: "Latest daily note",
      summary: latestNote?.summary || latestNote?.presentation || "No recent daily note.",
      meta: latestNote?.record_date ? formatSummaryDate(latestNote.record_date) : latestNote?.workflow_status || "",
    },
    {
      title: "Latest important event",
      summary: latestIncident?.summary || latestIncident?.title || "No recent important event.",
      meta: latestIncident?.severity || latestIncident?.workflow_status || "",
    },
    {
      title: "Current plan",
      summary: latestPlan?.title || latestPlan?.summary || "No active support plan.",
      meta: latestPlan?.review_date ? `Review ${formatSummaryDate(latestPlan.review_date)}` : latestPlan?.status || "",
    },
    {
      title: "Next appointment",
      summary: nextAppointment?.title || nextAppointment?.appointment_type || "No upcoming appointment.",
      meta: nextAppointment?.start_datetime ? formatSummaryDate(nextAppointment.start_datetime) : nextAppointment?.status || "",
    },
  ];

  return `
    <div class="record-list">
      ${items
        .map(
          (item) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title)}</div>
                <div class="record-row-summary">${toText(item.summary)}</div>
                <div class="record-row-meta">${toText(item.meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Context</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOverviewHtml({
  counts,
  operationalCounts,
  priorityRows,
  todayRows,
  upcomingRows,
  chronology,
  tasks,
  latestContextHtml,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Overview</div>
          <h2>What matters now</h2>
          <p>The quickest way to see immediate priorities, live risk and operational needs.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Urgent</span>
              <strong class="overview-stat-value">${toText(counts.urgent)}</strong>
              <span class="overview-stat-note">Current priority items</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Today</span>
              <strong class="overview-stat-value">${toText(counts.today)}</strong>
              <span class="overview-stat-note">Things happening today</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Upcoming</span>
              <strong class="overview-stat-value">${toText(counts.upcoming)}</strong>
              <span class="overview-stat-note">Appointments, reviews or due soon items</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Open tasks</span>
              <strong class="overview-stat-value">${toText(counts.openTasks)}</strong>
              <span class="overview-stat-note">Actions still needing follow-up</span>
            </article>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Operational picture</h3>
              <p>A live view across care, risk, appointments and readiness.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Urgent incidents</div>
                  <div class="record-row-summary">High or critical incidents needing attention.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.urgentCount > 0 ? "warning" : "muted"}">${toText(operationalCounts.urgentCount)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open appointments</div>
                  <div class="record-row-summary">Upcoming or active appointments.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(operationalCounts.openAppointments)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Active plans</div>
                  <div class="record-row-summary">Support plans currently in use.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(operationalCounts.activePlans)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Overdue readiness</div>
                  <div class="record-row-summary">Compliance items needing action now.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.overdueCount > 0 ? "warning" : "muted"}">${toText(operationalCounts.overdueCount)}</span>
                </div>
              </article>
            </div>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Latest context</h3>
              <p>The most recent note, event, plan and appointment context for today.</p>
            </div>

            ${latestContextHtml}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Today</h3>
              <p>Appointments, notes and chronology items happening today.</p>
            </div>

            ${renderRecordRows(todayRows, "No recent activity recorded yet.")}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Priority items</h3>
              <p>High-priority incidents, escalated readiness items, tasks and safeguarding-linked chronology.</p>
            </div>

            ${renderPriorityList(priorityRows)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Coming up</h3>
              <p>Upcoming appointments, plan reviews and due soon readiness items.</p>
            </div>

            ${renderRecordRows(upcomingRows, "Nothing upcoming is showing right now.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent chronology</h3>
              <p>Recent linked chronology events across the young person’s story.</p>
            </div>

            ${renderRecordRows(chronology.slice(0, 6), "No chronology events found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open tasks</h3>
              <p>Tasks and follow-up actions linked to care, risk and readiness.</p>
            </div>

            ${renderRecordRows(
              tasks.filter((item) => !item.completed).slice(0, 6),
              "No open tasks found."
            )}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadOverview() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading overview...</p>
      </div>
    </div>
  `;

  try {
    const [
      dailyNotesData,
      incidentsData,
      plansData,
      appointmentsData,
      timelineData,
      complianceData,
      tasksData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/timeline`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
    ]);

    const dailyNotes = sortNewestFirst(
      (dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || []).map(mapDailyNote),
      ["record_date", "created_at"]
    );

    const incidents = sortNewestFirst(
      (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(mapIncident),
      ["occurred_at", "created_at"]
    );

    const plans = sortSoonestFirst(
      (plansData.items || plansData.records || plansData.support_plans || []).map(mapSupportPlan),
      ["review_date", "updated_at", "created_at"]
    );

    const appointments = sortSoonestFirst(
      (
        appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        appointmentsData.young_person_appointments ||
        []
      ).map(mapAppointment),
      ["start_datetime", "created_at"]
    );

    const chronology = sortNewestFirst(
      (
        timelineData.timeline ||
        timelineData.items ||
        timelineData.records ||
        timelineData.chronology_events ||
        []
      ).map(mapChronologyEvent),
      ["event_datetime", "created_at"]
    );

    const compliance = sortSoonestFirst(
      (complianceData.items || complianceData.records || complianceData.compliance_items || []).map(
        mapComplianceItem
      ),
      ["due_date", "created_at"]
    );

    const tasks = sortSoonestFirst(
      (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
      ["due_date", "created_at"]
    );

    const priorityRows = buildPriorityRows({
      incidents,
      compliance,
      tasks,
      chronology,
    });

    const todayRows = buildTodayRows({
      appointments,
      dailyNotes,
      chronology,
    });

    const upcomingRows = buildUpcomingRows({
      appointments,
      plans,
      compliance,
    });

    const counts = buildOverviewCounts({
      priorityRows,
      todayRows,
      upcomingRows,
      tasks,
    });

    const operationalCounts = buildOperationalCounts({
      incidents,
      appointments,
      plans,
      compliance,
    });

    const latestContextHtml = renderLatestContext({
      dailyNotes,
      incidents,
      plans,
      appointments,
    });

    els.viewContent.innerHTML = renderOverviewHtml({
      counts,
      operationalCounts,
      priorityRows,
      todayRows,
      upcomingRows,
      chronology,
      tasks,
      latestContextHtml,
    });

    const nextAppointment =
      appointments.find(
        (item) =>
          isFuture(item.start_datetime) &&
          !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
      ) || null;

    const latestRecord =
      dailyNotes[0]?.record_date ||
      incidents[0]?.occurred_at ||
      chronology[0]?.event_datetime ||
      null;

    updateWorkspaceSummaryStrip({
      today: `${counts.urgent} urgent • ${counts.today} today`,
      nextEvent: nextAppointment?.start_datetime
        ? `${nextAppointment.title || nextAppointment.appointment_type || "Appointment"} • ${formatSummaryDate(nextAppointment.start_datetime)}`
        : "No upcoming appointments",
      lastRecord: latestRecord
        ? `Latest record ${formatSummaryDate(latestRecord)}`
        : "No recent records",
      openActions: `${counts.openTasks} open tasks • ${operationalCounts.overdueCount} overdue readiness`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load overview.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Overview unavailable",
      nextEvent: "Unable to load appointments",
      lastRecord: "No record data loaded",
      openActions: "Check API responses",
    });
  }
}
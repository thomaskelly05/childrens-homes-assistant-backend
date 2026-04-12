import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
  mapComplianceItem,
  mapTask,
  mapHealthRecord,
  mapEducationRecord,
  mapFamilyContactRecord,
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPriorityRows({
  incidents = [],
  compliance = [],
  tasks = [],
  chronology = [],
}) {
  const highIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  );

  const urgentCompliance = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  );

  const openTasks = tasks.filter((item) => !item.completed);

  const safeguardingChronology = chronology.filter((item) => item.safeguarding_flag);

  return [...highIncidents, ...urgentCompliance, ...openTasks, ...safeguardingChronology].slice(0, 12);
}

function buildRecentRows({
  dailyNotes = [],
  incidents = [],
  healthRecords = [],
  educationRecords = [],
  familyRecords = [],
}) {
  return [
    ...dailyNotes.slice(0, 3),
    ...incidents.slice(0, 3),
    ...healthRecords.slice(0, 2),
    ...educationRecords.slice(0, 2),
    ...familyRecords.slice(0, 2),
  ].slice(0, 12);
}

function buildTodayRows({
  appointments = [],
  chronology = [],
  dailyNotes = [],
}) {
  const appointmentRows = appointments.filter((item) => isToday(item.start_datetime));
  const chronologyRows = chronology.filter((item) => isToday(item.event_datetime || item.created_at));
  const dailyNoteRows = dailyNotes.filter((item) => isToday(item.record_date || item.created_at));

  return [...appointmentRows, ...chronologyRows, ...dailyNoteRows].slice(0, 12);
}

function buildUpcomingRows({
  appointments = [],
  plans = [],
  tasks = [],
}) {
  const appointmentRows = appointments.filter(
    (item) =>
      isFuture(item.start_datetime) &&
      !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  );

  const reviewPlans = plans.filter((item) => item.review_date);
  const dueTasks = tasks.filter((item) => !item.completed);

  return [...appointmentRows, ...reviewPlans, ...dueTasks].slice(0, 12);
}

function buildSummaryCounts({ priorityRows = [], recentRows = [], todayRows = [], upcomingRows = [] }) {
  return {
    urgent: priorityRows.length,
    recent: recentRows.length,
    today: todayRows.length,
    upcoming: upcomingRows.length,
  };
}

function buildWorkspaceCounts({
  incidents = [],
  appointments = [],
  plans = [],
  compliance = [],
  tasks = [],
}) {
  const urgentIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  ).length;

  const openAppointments = appointments.filter(
    (item) => !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  ).length;

  const activePlans = plans.filter((item) =>
    ["active", "review_due"].includes(String(item.status || "").toLowerCase())
  ).length;

  const complianceIssues = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  ).length;

  const openTasks = tasks.filter((item) => !item.completed).length;

  return {
    urgentIncidents,
    openAppointments,
    activePlans,
    complianceIssues,
    openTasks,
  };
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

function getRowMeta(item = {}) {
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

  if (["critical", "high"].includes(severity) || ["overdue", "escalated"].includes(status)) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["draft", "pending", "review_due"].includes(status)) {
    return { label: "In progress", tone: "muted" };
  }

  if (["completed", "booked", "confirmed"].includes(status)) {
    return { label: "Recorded", tone: "success" };
  }

  return { label: "Recorded", tone: "muted" };
}

function getRecordRowVariant(item = {}) {
  const type = String(item.record_type || item.type || "").toLowerCase();
  const eventType = String(item.event_type || "").toLowerCase();

  if (type.includes("incident") || eventType.includes("incident")) return "record-row--incident";
  if (type.includes("health") || type.includes("appointment")) return "record-row--health";
  if (type.includes("family")) return "record-row--family";
  if (type.includes("risk") || item.safeguarding_flag) return "record-row--risk";
  return "record-row--daily";
}

function renderEmptyState({
  title = "Nothing to show",
  message = "There is nothing to display right now.",
  actionHtml = "",
} = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>${toText(title)}</h3>
        <p>${toText(message)}</p>
        ${actionHtml ? `<div class="empty-state-actions">${actionHtml}</div>` : ""}
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "Nothing to show right now.") {
  if (!items.length) {
    return renderEmptyState({
      title: "No records to show",
      message: emptyMessage,
    });
  }

  return `
    <div class="record-list">
      ${items.map((item) => {
        const pill = getRowPill(item);
        const id = item.id ?? item.record_id ?? item.source_id ?? "";
        const type = item.record_type || item.type || "";
        const variantClass = getRecordRowVariant(item);
        const formattedDate = formatDate(getRowMeta(item));
        const typeLabel = getRowTypeLabel(item);

        return `
          <article
            class="record-row ${toText(variantClass)}"
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
              <div class="record-row-meta">
                ${formattedDate ? `<span>${toText(formattedDate)}</span>` : ""}
                ${typeLabel ? `<span>${toText(typeLabel)}</span>` : ""}
              </div>
            </div>
            <div class="record-row-side">
              <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderPriorityList(items = [], emptyMessage = "No priority items are showing right now.") {
  if (!items.length) {
    return renderEmptyState({
      title: "Nothing urgent right now",
      message: emptyMessage,
    });
  }

  return `
    <div class="priority-list">
      ${items.slice(0, 4).map((item) => `
        <article class="priority-item">
          <strong>${toText(getRowTitle(item))}</strong>
          <p>${toText(getRowSummary(item))}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderSupportPatterns({ dailyNotes = [], incidents = [], plans = [] }) {
  const patterns = [];

  const latestNote = dailyNotes[0];
  const latestIncident = incidents[0];
  const activePlan = plans.find((item) =>
    ["active", "review_due"].includes(String(item.status || "").toLowerCase())
  );

  if (latestNote?.presentation) {
    patterns.push(latestNote.presentation);
  }

  if (latestIncident?.deescalation || latestIncident?.what_helped) {
    patterns.push(latestIncident.deescalation || latestIncident.what_helped);
  }

  if (activePlan?.summary || activePlan?.guidance) {
    patterns.push(activePlan.summary || activePlan.guidance);
  }

  const cleanPatterns = patterns.filter(Boolean).slice(0, 3);

  if (!cleanPatterns.length) {
    return renderEmptyState({
      title: "No support patterns yet",
      message: "No recent support patterns are showing yet.",
    });
  }

  return `
    <div class="support-pattern-list">
      ${cleanPatterns.map((item) => `
        <div class="support-pattern-item">${toText(item)}</div>
      `).join("")}
    </div>
  `;
}

function renderOverviewHtml({
  priorityRows = [],
  recentRows = [],
  counts,
  workspaceCounts,
  supportPatternsHtml,
}) {
  const urgentStatClass = counts.urgent > 0 ? "overview-stat-card overview-stat-card--danger" : "overview-stat-card";
  const todayStatClass = counts.today > 0 ? "overview-stat-card overview-stat-card--success" : "overview-stat-card";
  const upcomingStatClass = counts.upcoming > 0 ? "overview-stat-card overview-stat-card--warning" : "overview-stat-card";

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Overview</div>
          <h2>Workspace overview</h2>
          <p>A live view across care, records, appointments and follow-up.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="${urgentStatClass}">
              <span class="overview-stat-label">Urgent</span>
              <strong class="overview-stat-value">${toText(counts.urgent)}</strong>
              <span class="overview-stat-note">Items needing prompt attention</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Recent</span>
              <strong class="overview-stat-value">${toText(counts.recent)}</strong>
              <span class="overview-stat-note">Recently added records</span>
            </article>

            <article class="${todayStatClass}">
              <span class="overview-stat-label">Today</span>
              <strong class="overview-stat-value">${toText(counts.today)}</strong>
              <span class="overview-stat-note">Records or updates today</span>
            </article>

            <article class="${upcomingStatClass}">
              <span class="overview-stat-label">Upcoming</span>
              <strong class="overview-stat-value">${toText(counts.upcoming)}</strong>
              <span class="overview-stat-note">Planned appointments or actions</span>
            </article>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent activity</h3>
              <p>What has changed most recently.</p>
            </div>

            ${renderRecordRows(recentRows, "No recent activity found.")}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Operational picture</h3>
              <p>A quick live view of current pressures and open items.</p>
            </div>

            <div class="record-list">
              <article class="record-row record-row--incident">
                <div class="record-row-main">
                  <div class="record-row-title">Urgent incidents</div>
                  <div class="record-row-summary">High or critical incidents needing review.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${workspaceCounts.urgentIncidents > 0 ? "warning" : "muted"}">${toText(workspaceCounts.urgentIncidents)}</span>
                </div>
              </article>

              <article class="record-row record-row--health">
                <div class="record-row-main">
                  <div class="record-row-title">Open appointments</div>
                  <div class="record-row-summary">Upcoming appointments and visits.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(workspaceCounts.openAppointments)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Active plans</div>
                  <div class="record-row-summary">Support plans currently in place.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(workspaceCounts.activePlans)}</span>
                </div>
              </article>

              <article class="record-row record-row--risk">
                <div class="record-row-main">
                  <div class="record-row-title">Compliance issues</div>
                  <div class="record-row-summary">Overdue or escalated items needing attention.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${workspaceCounts.complianceIssues > 0 ? "warning" : "muted"}">${toText(workspaceCounts.complianceIssues)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open tasks</div>
                  <div class="record-row-summary">Follow-up actions still outstanding.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(workspaceCounts.openTasks)}</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>What needs attention</h3>
              <p>Items to notice and act on next.</p>
            </div>

            ${renderPriorityList(priorityRows)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>What helped recently</h3>
              <p>Useful patterns to carry forward.</p>
            </div>

            ${supportPatternsHtml}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading workspace...</p>
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
      healthData,
      educationData,
      familyData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/timeline`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/health-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/education-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/family-contact-records`).catch(() => ({ items: [] })),
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
      (
        complianceData.items ||
        complianceData.records ||
        complianceData.compliance_items ||
        []
      ).map(mapComplianceItem),
      ["due_date", "created_at"]
    );

    const tasks = sortSoonestFirst(
      (
        tasksData.items ||
        tasksData.records ||
        tasksData.tasks ||
        []
      ).map(mapTask),
      ["due_date", "created_at"]
    );

    const healthRecords = sortNewestFirst(
      (
        healthData.items ||
        healthData.records ||
        healthData.health_records ||
        []
      ).map(mapHealthRecord),
      ["event_datetime", "created_at"]
    );

    const educationRecords = sortNewestFirst(
      (
        educationData.items ||
        educationData.records ||
        educationData.education_records ||
        []
      ).map(mapEducationRecord),
      ["record_date", "created_at"]
    );

    const familyRecords = sortNewestFirst(
      (
        familyData.items ||
        familyData.records ||
        familyData.family_contact_records ||
        []
      ).map(mapFamilyContactRecord),
      ["contact_datetime", "created_at"]
    );

    const priorityRows = buildPriorityRows({
      incidents,
      compliance,
      tasks,
      chronology,
    });

    const recentRows = buildRecentRows({
      dailyNotes,
      incidents,
      healthRecords,
      educationRecords,
      familyRecords,
    });

    const todayRows = buildTodayRows({
      appointments,
      chronology,
      dailyNotes,
    });

    const upcomingRows = buildUpcomingRows({
      appointments,
      plans,
      tasks,
    });

    const counts = buildSummaryCounts({
      priorityRows,
      recentRows,
      todayRows,
      upcomingRows,
    });

    const workspaceCounts = buildWorkspaceCounts({
      incidents,
      appointments,
      plans,
      compliance,
      tasks,
    });

    const supportPatternsHtml = renderSupportPatterns({
      dailyNotes,
      incidents,
      plans,
    });

    els.viewContent.innerHTML = renderOverviewHtml({
      priorityRows,
      recentRows,
      counts,
      workspaceCounts,
      supportPatternsHtml,
    });
  } catch (error) {
    els.viewContent.innerHTML = renderEmptyState({
      title: "Workspace unavailable",
      message: error.message || "Failed to load workspace.",
    });
  }
}
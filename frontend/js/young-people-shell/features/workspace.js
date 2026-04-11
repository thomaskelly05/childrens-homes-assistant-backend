import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
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

function buildWorkspaceOverview({
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

  return `
    <div class="profile-grid">
      <div class="profile-card">
        <div class="profile-card-title">Urgent incidents</div>
        <div class="profile-card-text">${escapeHtml(String(urgentIncidents))}</div>
        <div class="profile-card-subtext">High or critical incidents</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Open appointments</div>
        <div class="profile-card-text">${escapeHtml(String(openAppointments))}</div>
        <div class="profile-card-subtext">Upcoming appointments and visits</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Active plans</div>
        <div class="profile-card-text">${escapeHtml(String(activePlans))}</div>
        <div class="profile-card-subtext">Support plans in force</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Compliance issues</div>
        <div class="profile-card-text">${escapeHtml(String(complianceIssues))}</div>
        <div class="profile-card-subtext">Overdue or escalated items</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Open tasks</div>
        <div class="profile-card-text">${escapeHtml(String(openTasks))}</div>
        <div class="profile-card-subtext">Follow-up actions still open</div>
      </div>
    </div>
  `;
}

function buildLatestContext({
  dailyNotes = [],
  incidents = [],
  plans = [],
  appointments = [],
}) {
  const latestNote = dailyNotes[0] || null;
  const latestIncident = incidents[0] || null;
  const currentPlan = plans[0] || null;
  const nextAppointment = appointments[0] || null;

  return `
    <div class="profile-grid">
      <div class="profile-card">
        <div class="profile-card-title">Latest daily note</div>
        <div class="profile-card-text">${escapeHtml(
          latestNote?.summary || latestNote?.presentation || "No recent daily note."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          latestNote?.record_date || latestNote?.workflow_status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Latest incident</div>
        <div class="profile-card-text">${escapeHtml(
          latestIncident?.summary || latestIncident?.title || "No recent incident."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          latestIncident?.severity || latestIncident?.workflow_status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Current plan</div>
        <div class="profile-card-text">${escapeHtml(
          currentPlan?.title || currentPlan?.summary || "No active support plan."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          currentPlan?.review_date || currentPlan?.status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Next appointment</div>
        <div class="profile-card-text">${escapeHtml(
          nextAppointment?.title || nextAppointment?.appointment_type || "No upcoming appointment."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          nextAppointment?.start_datetime || nextAppointment?.status || ""
        )}</div>
      </div>
    </div>
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

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Urgent", priorityRows.length)}
        ${renderSummaryStat("Recent", recentRows.length)}
        ${renderSummaryStat("Today", todayRows.length)}
        ${renderSummaryStat("Upcoming", upcomingRows.length)}
      </section>

      ${renderSection(
        "Workspace overview",
        "A live operational view across care, risk, appointments, compliance and follow-up.",
        buildWorkspaceOverview({
          incidents,
          appointments,
          plans,
          compliance,
          tasks,
        })
      )}

      ${renderSection(
        "Latest context",
        "The quickest way to understand what is happening around this young person right now.",
        buildLatestContext({
          dailyNotes,
          incidents,
          plans,
          appointments,
        })
      )}

      ${renderSection(
        "Priority items",
        "Urgent incidents, readiness issues, open tasks and safeguarding-linked chronology.",
        renderRowList(priorityRows, "No urgent items found.")
      )}

      ${renderSection(
        "Recent activity",
        "Recent notes, incidents, health, education and family records.",
        renderRowList(recentRows, "No recent activity found.")
      )}

      ${renderSection(
        "Today",
        "What is happening today across appointments, notes and chronology.",
        renderRowList(todayRows, "Nothing recorded for today.")
      )}

      ${renderSection(
        "Coming up",
        "Upcoming appointments, plan reviews and follow-up tasks.",
        renderRowList(upcomingRows, "Nothing upcoming is showing right now.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load workspace.")}</p>
      </div>
    `;
  }
}
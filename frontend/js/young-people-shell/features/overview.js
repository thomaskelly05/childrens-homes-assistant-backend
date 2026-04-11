import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection, renderSummaryStat } from "../ui/records.js";
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

function buildPriorityRows({
incidents = [],
compliance = [],
tasks = [],
chronology = [],
}) {
const incidentRows = incidents
.filter((item) =>
["high", "critical"].includes(String(item.severity || "").toLowerCase())
)
.slice(0, 3);

const complianceRows = compliance
.filter((item) =>
["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
)
.slice(0, 3);

const taskRows = tasks.filter((item) => !item.completed).slice(0, 2);

const chronologyRows = chronology
.filter((item) => item.safeguarding_flag)
.slice(0, 2);

return [...incidentRows, ...complianceRows, ...taskRows, ...chronologyRows].slice(0, 10);
}

function buildTodayRows({
appointments = [],
dailyNotes = [],
chronology = [],
}) {
const todayAppointments = appointments.filter((item) => isToday(item.start_datetime));
const todayNotes = dailyNotes.filter((item) => isToday(item.record_date || item.created_at));
const todayChronology = chronology.filter((item) => isToday(item.event_datetime || item.created_at));

return [...todayAppointments, ...todayNotes, ...todayChronology].slice(0, 10);
}

function buildUpcomingRows({
appointments = [],
plans = [],
compliance = [],
}) {
const upcomingAppointments = appointments
.filter(
(item) =>
isFuture(item.start_datetime) &&
!["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
)
.slice(0, 4);

const reviewPlans = plans
.filter((item) => item.review_date)
.slice(0, 3);

const dueSoonCompliance = compliance
.filter((item) => String(item.status || "").toLowerCase() === "due_soon")
.slice(0, 3);

return [...upcomingAppointments, ...reviewPlans, ...dueSoonCompliance].slice(0, 10);
}

function buildOverviewCards({
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
["active", "review_due"].includes(String(item.status || "").toLowerCase())
).length;

const overdueCount = compliance.filter((item) =>
["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
).length;

return `
<div class="profile-grid">
<div class="profile-card">
<div class="profile-card-title">Urgent incidents</div>
<div class="profile-card-text">${escapeHtml(String(urgentCount))}</div>
<div class="profile-card-subtext">High or critical incidents needing attention</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Open appointments</div>
<div class="profile-card-text">${escapeHtml(String(openAppointments))}</div>
<div class="profile-card-subtext">Upcoming or active appointments</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Active plans</div>
<div class="profile-card-text">${escapeHtml(String(activePlans))}</div>
<div class="profile-card-subtext">Support plans currently in use</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Overdue readiness</div>
<div class="profile-card-text">${escapeHtml(String(overdueCount))}</div>
<div class="profile-card-subtext">Compliance items needing action now</div>
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
const latestPlan = plans[0] || null;
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
latestPlan?.title || latestPlan?.summary || "No active support plan."
)}</div>
<div class="profile-card-subtext">${escapeHtml(
latestPlan?.review_date || latestPlan?.status || ""
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

els.viewContent.innerHTML = `
<section class="summary-strip">
${renderSummaryStat("Urgent", priorityRows.length)}
${renderSummaryStat("Today", todayRows.length)}
${renderSummaryStat("Upcoming", upcomingRows.length)}
${renderSummaryStat("Open tasks", tasks.filter((item) => !item.completed).length)}
</section>

${renderSection(
"What matters now",
"The quickest way to see immediate priorities, live risk and operational needs.",
buildOverviewCards({
incidents,
appointments,
plans,
compliance,
})
)}

${renderSection(
"Latest context",
"The most recent note, incident, plan and appointment context for today.",
buildLatestContext({
dailyNotes,
incidents,
plans,
appointments,
})
)}

${renderSection(
"Priority items",
"High-priority incidents, escalated readiness items, tasks and safeguarding-linked chronology.",
renderRowList(priorityRows, "Nothing urgent is showing right now.")
)}

${renderSection(
"Today",
"Appointments, notes and chronology items happening today.",
renderRowList(todayRows, "No recent activity recorded yet.")
)}

${renderSection(
"Coming up",
"Upcoming appointments, plan reviews and due soon readiness items.",
renderRowList(upcomingRows, "Nothing upcoming is showing right now.")
)}

${renderSection(
"Recent chronology",
"Recent linked chronology events across the young person’s story.",
renderRowList(chronology.slice(0, 8), "No chronology events found.")
)}

${renderSection(
"Open tasks",
"Tasks and follow-up actions linked to care, risk and readiness.",
renderRowList(tasks.filter((item) => !item.completed).slice(0, 8), "No open tasks found.")
)}
`;
} catch (error) {
els.viewContent.innerHTML = `
<div class="empty-state">
<p>${escapeHtml(error.message || "Failed to load overview.")}</p>
</div>
`;
}
}

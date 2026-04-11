import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection, renderSummaryStat } from "../ui/records.js";
import {
mapAiReport,
mapMonthlyReview,
mapHandoverRecord,
mapInspectionPackJob,
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

function buildEvidenceOverview({
aiReports = [],
monthlyReviews = [],
handovers = [],
inspectionPacks = [],
chronology = [],
compliance = [],
tasks = [],
}) {
const safeguardingLinked = chronology.filter((item) => item.safeguarding_flag).length;
const overdueReadiness = compliance.filter((item) =>
["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
).length;
const openTasks = tasks.filter((item) => !item.completed).length;

return `
<div class="profile-grid">
<div class="profile-card">
<div class="profile-card-title">AI reports</div>
<div class="profile-card-text">${escapeHtml(String(aiReports.length))}</div>
<div class="profile-card-subtext">Generated summaries and narrative outputs</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Monthly reviews</div>
<div class="profile-card-text">${escapeHtml(String(monthlyReviews.length))}</div>
<div class="profile-card-subtext">Structured monthly review records</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Safeguarding-linked evidence</div>
<div class="profile-card-text">${escapeHtml(String(safeguardingLinked))}</div>
<div class="profile-card-subtext">Chronology items with safeguarding flags</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Readiness gaps</div>
<div class="profile-card-text">${escapeHtml(String(overdueReadiness))}</div>
<div class="profile-card-subtext">Overdue or escalated items affecting readiness</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Open follow-up tasks</div>
<div class="profile-card-text">${escapeHtml(String(openTasks))}</div>
<div class="profile-card-subtext">Actions still needing completion</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Inspection packs</div>
<div class="profile-card-text">${escapeHtml(String(inspectionPacks.length))}</div>
<div class="profile-card-subtext">Generated inspection or evidence outputs</div>
</div>
</div>
`;
}

function buildReadinessEvidenceRows({
compliance = [],
tasks = [],
chronology = [],
}) {
const overdue = compliance.filter((item) =>
["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
);

const taskRows = tasks.filter((item) => !item.completed);

const chronologyRows = chronology
.filter((item) => {
const significance = String(item.significance || "").toLowerCase();
const severity = String(item.severity || "").toLowerCase();
return (
["high", "critical"].includes(significance) ||
["high", "critical"].includes(severity) ||
item.safeguarding_flag
);
})
.slice(0, 6);

return [...overdue, ...taskRows, ...chronologyRows].slice(0, 12);
}
function buildLatestReportContext({
aiReports = [],
monthlyReviews = [],
handovers = [],
inspectionPacks = [],
}) {
const latestAiReport = aiReports[0] || null;
const latestMonthly = monthlyReviews[0] || null;
const latestHandover = handovers[0] || null;
const latestPack = inspectionPacks[0] || null;

return `
<div class="profile-grid">
<div class="profile-card">
<div class="profile-card-title">Latest AI report</div>
<div class="profile-card-text">${escapeHtml(
latestAiReport?.title || latestAiReport?.report_type || "No AI reports yet."
)}</div>
<div class="profile-card-subtext">${escapeHtml(
latestAiReport?.review_month || latestAiReport?.status || ""
)}</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Latest monthly review</div>
<div class="profile-card-text">${escapeHtml(
latestMonthly?.title || latestMonthly?.review_month || "No monthly review yet."
)}</div>
<div class="profile-card-subtext">${escapeHtml(
latestMonthly?.status || latestMonthly?.approved_at || ""
)}</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Latest handover</div>
<div class="profile-card-text">${escapeHtml(
latestHandover?.title || latestHandover?.shift_type || "No handover record yet."
)}</div>
<div class="profile-card-subtext">${escapeHtml(
latestHandover?.handover_date || latestHandover?.status || ""
)}</div>
</div>

<div class="profile-card">
<div class="profile-card-title">Latest inspection pack</div>
<div class="profile-card-text">${escapeHtml(
latestPack?.title || latestPack?.pack_type || "No inspection pack yet."
)}</div>
<div class="profile-card-subtext">${escapeHtml(
latestPack?.status || latestPack?.completed_at || ""
)}</div>
</div>
</div>
`;
}

export async function loadReports() {
if (!els.viewContent) return;

els.viewContent.innerHTML = `
<div class="loading-state">
<div>
<div class="spinner"></div>
<p>Loading reports...</p>
</div>
</div>
`;

try {
const [
aiReportsData,
monthlyReviewsData,
handoversData,
inspectionPacksData,
timelineData,
complianceData,
tasksData,
] = await Promise.all([
apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] })),
apiGet(`/young-people/${state.youngPersonId}/monthly-reviews`).catch(() => ({ items: [] })),
apiGet(`/young-people/${state.youngPersonId}/handover-records`).catch(() => ({ items: [] })),
apiGet(`/young-people/${state.youngPersonId}/inspection-packs`).catch(() => ({ items: [] })),
apiGet(`/young-people/${state.youngPersonId}/timeline`).catch(() => ({ items: [] })),
apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
]);

const aiReports = sortNewestFirst(
(
aiReportsData.items ||
aiReportsData.records ||
aiReportsData.ai_generated_reports ||
[]
).map(mapAiReport),
["review_month", "created_at", "updated_at"]
);

const monthlyReviews = sortNewestFirst(
(
monthlyReviewsData.items ||
monthlyReviewsData.records ||
monthlyReviewsData.monthly_reviews ||
[]
).map(mapMonthlyReview),
["review_month", "created_at", "updated_at"]
);

const handovers = sortNewestFirst(
(
handoversData.items ||
handoversData.records ||
handoversData.handover_records ||
[]
).map(mapHandoverRecord),
["handover_date", "created_at", "updated_at"]
);

const inspectionPacks = sortNewestFirst(
(
inspectionPacksData.items ||
inspectionPacksData.records ||
inspectionPacksData.inspection_pack_jobs ||
[]
).map(mapInspectionPackJob),
["completed_at", "created_at"]
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

const compliance = sortNewestFirst(
(
complianceData.items ||
complianceData.records ||
complianceData.compliance_items ||
[]
).map(mapComplianceItem),
["due_date", "created_at"]
);

const tasks = sortNewestFirst(
(
tasksData.items ||
tasksData.records ||
tasksData.tasks ||
[]
).map(mapTask),
["due_date", "created_at"]
);
const evidenceRows = buildReadinessEvidenceRows({
compliance,
tasks,
chronology,
});

els.viewContent.innerHTML = `
<section class="summary-strip">
${renderSummaryStat("AI reports", aiReports.length)}
${renderSummaryStat("Monthly reviews", monthlyReviews.length)}
${renderSummaryStat("Handovers", handovers.length)}
${renderSummaryStat("Inspection packs", inspectionPacks.length)}
</section>

${renderSection(
"Reports overview",
"Generated outputs, formal reviews and linked evidence that support oversight and inspection readiness.",
buildEvidenceOverview({
aiReports,
monthlyReviews,
handovers,
inspectionPacks,
chronology,
compliance,
tasks,
})
)}

${renderSection(
"Latest report context",
"The most recent reporting outputs across AI reports, monthly reviews, handovers and inspection packs.",
buildLatestReportContext({
aiReports,
monthlyReviews,
handovers,
inspectionPacks,
})
)}

${renderSection(
"AI generated reports",
"Narrative outputs generated for this young person.",
renderRowList(aiReports, "No AI generated reports found.")
)}

${renderSection(
"Monthly reviews",
"Structured monthly summaries, progress, concerns and next steps.",
renderRowList(monthlyReviews, "No monthly reviews found.")
)}

${renderSection(
"Handover records",
"Shift summaries and continuity records that support day-to-day care.",
renderRowList(handovers, "No handover records found.")
)}

${renderSection(
"Inspection packs",
"Generated inspection evidence packs and related outputs.",
renderRowList(inspectionPacks, "No inspection packs found.")
)}

${renderSection(
"Linked evidence needing attention",
"Overdue readiness, open follow-up tasks and significant chronology that should influence reports and reviews.",
renderRowList(evidenceRows, "No evidence gaps or urgent linked items found.")
)}

${renderSection(
"Recent chronology for reporting",
"Recent chronology items that may need to be reflected in reports, reviews or handovers.",
renderRowList(chronology.slice(0, 8), "No chronology items found.")
)}
`;
} catch (error) {
els.viewContent.innerHTML = `
<div class="empty-state">
<p>${escapeHtml(error.message || "Failed to load reports.")}</p>
</div>
`;
}
}

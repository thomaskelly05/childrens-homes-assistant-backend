import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapIncident,
  mapRiskAssessment,
  mapComplianceItem,
  mapManagerAction,
  mapTask,
  mapDailyNote,
  mapKeyworkSession,
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

function buildManagerActionRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "manager_action",
    title: item.title || item.action_type || "Manager action",
    summary: item.note || "Manager action",
    action_at: item.action_at || item.created_at || null,
    created_at: item.created_at || null,
    status: item.action_type || "",
  }));
}

function buildReviewRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    source_id: item.id,
    record_type: item.record_type || "record",
    title: item.title || "Record",
    summary:
      item.summary ||
      item.description ||
      item.presentation ||
      item.reflective_analysis ||
      item.concern_summary ||
      "Record awaiting review",
    created_at: item.created_at || null,
    status: item.workflow_status || item.status || item.approval_status || "",
    severity: item.severity || "",
  }));
}

function buildOverviewCards({
  submittedRecords = [],
  highRiskIncidents = [],
  complianceIssues = [],
  openTasks = [],
}) {
  return `
    <div class="profile-grid">
      <div class="profile-card">
        <div class="profile-card-title">Awaiting review</div>
        <div class="profile-card-text">${escapeHtml(String(submittedRecords.length))}</div>
        <div class="profile-card-subtext">Records that appear to need manager attention</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">High-risk incidents</div>
        <div class="profile-card-text">${escapeHtml(String(highRiskIncidents.length))}</div>
        <div class="profile-card-subtext">Incidents marked high or critical</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Compliance issues</div>
        <div class="profile-card-text">${escapeHtml(String(complianceIssues.length))}</div>
        <div class="profile-card-subtext">Overdue or escalated readiness items</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Open tasks</div>
        <div class="profile-card-text">${escapeHtml(String(openTasks.length))}</div>
        <div class="profile-card-subtext">Tasks still needing follow-up</div>
      </div>
    </div>
  `;
}

export async function loadManager() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading manager review...</p>
      </div>
    </div>
  `;

  try {
    const [
      incidentsData,
      risksData,
      complianceData,
      tasksData,
      managerActionsData,
      dailyNotesData,
      keyworkData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/risks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/manager-actions`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/keywork`).catch(() => ({ items: [] })),
    ]);

    const incidents = sortNewestFirst(
      (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(mapIncident),
      ["occurred_at", "created_at"]
    );

    const risks = sortNewestFirst(
      (risksData.items || risksData.records || risksData.risk_assessments || risksData.risks || []).map(
        mapRiskAssessment
      ),
      ["review_date", "updated_at", "created_at"]
    );

    const complianceItems = sortSoonestFirst(
      (complianceData.items || complianceData.records || complianceData.compliance_items || []).map(
        mapComplianceItem
      ),
      ["due_date", "created_at"]
    );

    const tasks = sortSoonestFirst(
      (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
      ["due_date", "created_at"]
    );

    const managerActions = sortNewestFirst(
      (managerActionsData.items || managerActionsData.records || managerActionsData.manager_actions || []).map(
        mapManagerAction
      ),
      ["action_at", "created_at"]
    );

    const dailyNotes = sortNewestFirst(
      (dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || []).map(mapDailyNote),
      ["record_date", "created_at"]
    );

    const keyworkSessions = sortNewestFirst(
      (keyworkData.items || keyworkData.records || keyworkData.keywork_sessions || []).map(mapKeyworkSession),
      ["session_date", "created_at"]
    );

    const submittedRecords = [
      ...dailyNotes.filter((item) =>
        ["submitted", "pending_review", "review"].includes(String(item.workflow_status || "").toLowerCase())
      ),
      ...incidents.filter((item) =>
        ["submitted", "pending_review", "review"].includes(String(item.workflow_status || "").toLowerCase())
      ),
      ...keyworkSessions.filter((item) =>
        ["submitted", "pending_review", "review"].includes(String(item.workflow_status || "").toLowerCase())
      ),
      ...risks.filter((item) =>
        ["submitted", "pending_review", "review"].includes(String(item.workflow_status || "").toLowerCase())
      ),
    ].slice(0, 12);

    const highRiskIncidents = incidents.filter((item) =>
      ["high", "critical"].includes(String(item.severity || "").toLowerCase())
    );

    const complianceIssues = complianceItems.filter((item) =>
      ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
    );

    const openTasks = tasks.filter((item) => !item.completed);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Awaiting review", submittedRecords.length)}
        ${renderSummaryStat("High-risk incidents", highRiskIncidents.length)}
        ${renderSummaryStat("Compliance issues", complianceIssues.length)}
        ${renderSummaryStat("Manager actions", managerActions.length)}
      </section>

      ${renderSection(
        "Manager overview",
        "The quickest view of records, risk and operational items needing oversight.",
        buildOverviewCards({
          submittedRecords,
          highRiskIncidents,
          complianceIssues,
          openTasks,
        })
      )}

      ${renderSection(
        "Records awaiting review",
        "Submitted or review-stage records that may need manager action.",
        renderRowList(buildReviewRecordRows(submittedRecords), "No submitted records awaiting review.")
      )}

      ${renderSection(
        "High-risk incidents",
        "Incidents marked high or critical that should influence oversight and review.",
        renderRowList(buildReviewRecordRows(highRiskIncidents), "No high-risk incidents found.")
      )}

      ${renderSection(
        "Risk assessments",
        "Current or recent risks and review dates.",
        renderRowList(buildReviewRecordRows(risks), "No risk assessments found.")
      )}

      ${renderSection(
        "Compliance issues",
        "Overdue or escalated readiness items needing management attention.",
        renderRowList(buildReviewRecordRows(complianceIssues), "No compliance issues found.")
      )}

      ${renderSection(
        "Open follow-up tasks",
        "Tasks that may require delegation, escalation or review.",
        renderRowList(buildReviewRecordRows(openTasks), "No open tasks found.")
      )}

      ${renderSection(
        "Manager actions",
        "Recorded management actions linked to this young person.",
        renderRowList(buildManagerActionRows(managerActions), "No manager actions found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load manager review.")}</p>
      </div>
    `;
  }
}
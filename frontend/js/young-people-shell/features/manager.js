import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeValue(value) {
  if (!value) return "";
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

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function buildManagerActionRows(items = []) {
  return items.map((item) => ({
    ...item,
    id: item.id ?? item.source_id ?? "",
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
    ...item,
    id: item.id ?? item.source_id ?? "",
    source_id: item.id ?? item.source_id ?? "",
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
    review_date: item.review_date || null,
    due_date: item.due_date || null,
    occurred_at: item.occurred_at || null,
    session_date: item.session_date || null,
  }));
}

function buildOverviewCards({
  submittedRecords = [],
  highRiskIncidents = [],
  complianceIssues = [],
  openTasks = [],
}) {
  return {
    awaitingReview: submittedRecords.length,
    highRiskIncidents: highRiskIncidents.length,
    complianceIssues: complianceIssues.length,
    openTasks: openTasks.length,
  };
}

function getRowDate(item = {}) {
  return (
    item.action_at ||
    item.review_date ||
    item.due_date ||
    item.occurred_at ||
    item.session_date ||
    item.record_date ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = String(item.status || item.workflow_status || "").toLowerCase();
  const severity = String(item.severity || "").toLowerCase();

  if (
    ["high", "critical"].includes(severity) ||
    ["overdue", "escalated", "returned"].includes(status)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["submitted", "pending_review", "review"].includes(status)) {
    return { label: "Awaiting review", tone: "warning" };
  }

  if (["approved", "active", "completed", "open"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: status ? status.replaceAll("_", " ") : "Recorded", tone: "muted" };
}

function renderRecordRows(items = [], emptyMessage = "No records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(item.id)}"
              data-record-type="${toText(item.record_type || "")}"
              data-title="${toText(item.title || "Record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title || "Record")}</div>
                ${item.summary ? `<div class="record-row-summary">${toText(item.summary)}</div>` : ""}
                ${getRowDate(item) ? `<div class="record-row-meta">${toText(formatDateTimeValue(getRowDate(item)))}</div>` : ""}
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

function renderManagerHtml({
  submittedRecords = [],
  highRiskIncidents = [],
  risks = [],
  complianceIssues = [],
  openTasks = [],
  managerActions = [],
}) {
  const overview = buildOverviewCards({
    submittedRecords,
    highRiskIncidents,
    complianceIssues,
    openTasks,
  });

  const submittedRows = buildReviewRecordRows(submittedRecords);
  const incidentRows = buildReviewRecordRows(highRiskIncidents);
  const riskRows = buildReviewRecordRows(risks);
  const complianceRows = buildReviewRecordRows(complianceIssues);
  const taskRows = buildReviewRecordRows(openTasks);
  const actionRows = buildManagerActionRows(managerActions);

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Oversight</div>
          <h2>Leadership and review</h2>
          <p>The quickest view of records, risk and operational items needing oversight.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Awaiting review</span>
              <strong class="overview-stat-value">${toText(overview.awaitingReview)}</strong>
              <span class="overview-stat-note">Records needing manager attention</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">High-risk incidents</span>
              <strong class="overview-stat-value">${toText(overview.highRiskIncidents)}</strong>
              <span class="overview-stat-note">Incidents marked high or critical</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Compliance issues</span>
              <strong class="overview-stat-value">${toText(overview.complianceIssues)}</strong>
              <span class="overview-stat-note">Overdue or escalated readiness items</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Open tasks</span>
              <strong class="overview-stat-value">${toText(overview.openTasks)}</strong>
              <span class="overview-stat-note">Tasks still needing follow-up</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Records awaiting review</h3>
              <p>Submitted or review-stage records that may need manager action.</p>
            </div>

            ${renderRecordRows(submittedRows, "No submitted records awaiting review.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>High-risk incidents</h3>
              <p>Incidents marked high or critical that should influence oversight and review.</p>
            </div>

            ${renderRecordRows(incidentRows, "No high-risk incidents found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Risk assessments</h3>
              <p>Current or recent risks and review dates.</p>
            </div>

            ${renderRecordRows(riskRows, "No risk assessments found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Compliance issues</h3>
              <p>Overdue or escalated readiness items needing management attention.</p>
            </div>

            ${renderRecordRows(complianceRows, "No compliance issues found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open follow-up tasks</h3>
              <p>Tasks that may require delegation, escalation or review.</p>
            </div>

            ${renderRecordRows(taskRows, "No open tasks found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Manager actions</h3>
              <p>Recorded management actions linked to this young person.</p>
            </div>

            ${renderRecordRows(actionRows, "No manager actions found.")}
          </section>
        </aside>
      </div>
    </section>
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

    els.viewContent.innerHTML = renderManagerHtml({
      submittedRecords,
      highRiskIncidents,
      risks,
      complianceIssues,
      openTasks,
      managerActions,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load manager review.")}</p>
      </div>
    `;
  }
}

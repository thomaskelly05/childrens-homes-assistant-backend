import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection, renderSummaryStat } from "../ui/records.js";
import {
  mapManagerReviewPayload,
  mapIncident,
  mapRiskAssessment,
  mapComplianceItem,
  mapManagerAction,
  mapTask,
} from "../core/adapters.js";

function buildSubmittedRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id ?? item.source_id ?? null,
    source_id: item.source_id ?? item.id ?? null,
    source_table: item.source_table || "",
    record_type: item.record_type || item.source_table || "record",
    title: item.title || item.label || "Submitted record",
    summary:
      item.summary ||
      item.note ||
      item.description ||
      "This record is awaiting manager review.",
    workflow_status: item.workflow_status || item.status || "submitted",
    created_at: item.created_at || item.requested_at || null,
    updated_at: item.updated_at || null,
    severity: item.severity || "",
    significance: item.significance || "",
  }));
}

function buildPatternAlertRows(items = []) {
  return items.map((item, index) => ({
    id: item.id ?? `pattern-${index}`,
    source_id: item.source_id ?? item.id ?? `pattern-${index}`,
    source_table: item.source_table || "pattern_alert",
    record_type: "pattern_alert",
    title: item.title || item.label || "Pattern alert",
    summary:
      item.summary ||
      item.description ||
      item.reason ||
      "A pattern may be emerging across recent records.",
    workflow_status: item.status || "active",
    severity: item.severity || "medium",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function groupManagerPayload(payload) {
  const submittedRecords = buildSubmittedRecordRows(payload.submitted_records || []);
  const managerActions = payload.manager_actions || [];
  const compliance = payload.compliance_items || [];
  const incidents = payload.incidents || [];
  const risks = payload.risks || [];
  const tasks = payload.tasks || [];
  const patternAlerts = buildPatternAlertRows(payload.pattern_alerts || []);

  const urgentItems = [
    ...incidents.filter((item) => ["high", "critical"].includes(String(item.severity || "").toLowerCase())),
    ...risks.filter((item) => ["high", "critical"].includes(String(item.severity || "").toLowerCase())),
    ...compliance.filter((item) => ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())),
    ...patternAlerts.filter((item) => ["high", "critical"].includes(String(item.severity || "").toLowerCase())),
  ].slice(0, 10);

  const awaitingReview = submittedRecords.filter((item) =>
    ["submitted", "pending"].includes(String(item.workflow_status || "").toLowerCase())
  );

  const returnedOrStuck = submittedRecords.filter((item) =>
    ["returned", "draft"].includes(String(item.workflow_status || "").toLowerCase())
  );

  const managerTasks = tasks.filter((item) => !item.completed);
  const overdueCompliance = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  );

  return {
    submittedRecords,
    managerActions,
    compliance,
    incidents,
    risks,
    tasks,
    patternAlerts,
    urgentItems,
    awaitingReview,
    returnedOrStuck,
    managerTasks,
    overdueCompliance,
  };
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
    const [managerData, incidentsData, risksData, complianceData, tasksData, actionsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/manager-review`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/risks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/manager-actions`).catch(() => ({ items: [] })),
    ]);

    const payload = mapManagerReviewPayload({
      ...managerData,
      incidents:
        managerData.incidents ||
        incidentsData.incidents ||
        incidentsData.items ||
        [],
      risk_assessments:
        managerData.risk_assessments ||
        managerData.risks ||
        risksData.risk_assessments ||
        risksData.items ||
        [],
      compliance_items:
        managerData.compliance_items ||
        complianceData.compliance_items ||
        complianceData.items ||
        [],
      tasks:
        managerData.tasks ||
        tasksData.tasks ||
        tasksData.items ||
        [],
      manager_actions:
        managerData.manager_actions ||
        actionsData.manager_actions ||
        actionsData.items ||
        [],
    });

    const grouped = groupManagerPayload({
      ...payload,
      incidents: (payload.incidents || []).map((item) => item.record_type ? item : mapIncident(item)),
      risks: (payload.risks || []).map((item) => item.record_type ? item : mapRiskAssessment(item)),
      compliance_items: (payload.compliance_items || []).map((item) => item.record_type ? item : mapComplianceItem(item)),
      manager_actions: (payload.manager_actions || []).map((item) => item.record_type ? item : mapManagerAction(item)),
      tasks: (payload.tasks || []).map((item) => item.record_type ? item : mapTask(item)),
    });

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Urgent", grouped.urgentItems.length)}
        ${renderSummaryStat("Awaiting review", grouped.awaitingReview.length)}
        ${renderSummaryStat("Open manager tasks", grouped.managerTasks.length)}
        ${renderSummaryStat("Pattern alerts", grouped.patternAlerts.length)}
      </section>

      ${renderSection(
        "Urgent today",
        "High-risk records, escalations and issues needing immediate oversight.",
        renderRowList(grouped.urgentItems, "No urgent items found.")
      )}

      ${renderSection(
        "Awaiting manager review",
        "Submitted records and items waiting for sign-off or review.",
        renderRowList(grouped.awaitingReview, "Nothing is currently awaiting manager review.")
      )}

      ${renderSection(
        "Returned or still in draft",
        "Records that may need coaching, correction or follow-up.",
        renderRowList(grouped.returnedOrStuck, "No returned or stuck records found.")
      )}

      ${renderSection(
        "Pattern alerts",
        "Repeated themes or emerging concerns across recent records.",
        renderRowList(grouped.patternAlerts, "No pattern alerts found.")
      )}

      ${renderSection(
        "Manager actions",
        "Oversight actions already taken or logged.",
        renderRowList(grouped.managerActions, "No manager actions found.")
      )}

      ${renderSection(
        "Open tasks",
        "Tasks that still need oversight, completion or allocation.",
        renderRowList(grouped.managerTasks, "No open manager tasks found.")
      )}

      ${renderSection(
        "Overdue compliance",
        "Readiness issues that may need leadership attention.",
        renderRowList(grouped.overdueCompliance, "No overdue compliance items found.")
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

import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection, renderSummaryStat } from "../ui/records.js";
import {
  mapReadinessPayload,
  mapComplianceItem,
  mapTask,
  mapStatutoryDocument,
} from "../core/adapters.js";

function buildDocumentRows(items = []) {
  return items.map((item) => ({
    ...item,
    record_type: item.record_type || "statutory_document",
    title: item.title || item.document_type || "Document",
    summary:
      item.description ||
      item.compliance_category ||
      item.file_name ||
      "Statutory document",
    status: item.status || "",
    review_date: item.review_date || null,
    expiry_date: item.expiry_date || null,
  }));
}

function buildPendingApprovalRows(items = []) {
  return items.map((item) => ({
    id: item.id ?? item.source_id ?? null,
    source_id: item.source_id ?? item.id ?? null,
    source_table: item.source_table || "",
    record_type: item.record_type || item.source_table || "approval",
    title: item.title || item.label || "Awaiting review",
    summary:
      item.summary ||
      item.note ||
      item.description ||
      "This record is awaiting review or sign-off.",
    workflow_status: item.workflow_status || item.status || "submitted",
    created_at: item.created_at || item.requested_at || null,
    updated_at: item.updated_at || null,
    severity: item.severity || "",
  }));
}

function groupReadiness(payload) {
  const compliance = payload.compliance_items || [];
  const documents = buildDocumentRows(payload.statutory_documents || []);
  const tasks = (payload.tasks || []).map((item) =>
    item.record_type ? item : mapTask(item)
  );

  const overdue = compliance.filter((item) => String(item.status).toLowerCase() === "overdue");
  const dueSoon = compliance.filter((item) => String(item.status).toLowerCase() === "due_soon");
  const escalated = compliance.filter(
    (item) =>
      String(item.status).toLowerCase() === "escalated" ||
      Number(item.escalation_level || 0) > 0
  );
  const pending = compliance.filter((item) => {
    const status = String(item.status).toLowerCase();
    return status === "pending" || status === "submitted";
  });

  const documentConcerns = documents.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return ["expired", "due", "overdue", "review_due"].includes(status) || item.expiry_date || item.review_date;
  });

  const openTasks = tasks.filter((item) => !item.completed);

  return {
    overdue,
    dueSoon,
    escalated,
    pending,
    documents,
    documentConcerns,
    openTasks,
  };
}

export async function loadReadiness() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading readiness...</p>
      </div>
    </div>
  `;

  try {
    const [readinessData, complianceData, tasksData, docsData, approvalsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/readiness`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/documents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/approvals`).catch(() => ({ items: [] })),
    ]);

    const payload = mapReadinessPayload({
      ...readinessData,
      compliance_items:
        readinessData.compliance_items ||
        readinessData.items ||
        complianceData.compliance_items ||
        complianceData.items ||
        [],
      tasks:
        readinessData.tasks ||
        tasksData.tasks ||
        tasksData.items ||
        [],
      statutory_documents:
        readinessData.statutory_documents ||
        docsData.statutory_documents ||
        docsData.items ||
        [],
    });

    const approvals = buildPendingApprovalRows(
      approvalsData.items || approvalsData.approvals || []
    );

    const {
      overdue,
      dueSoon,
      escalated,
      pending,
      documents,
      documentConcerns,
      openTasks,
    } = groupReadiness(payload);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Overdue", overdue.length || payload.overdue_count || 0)}
        ${renderSummaryStat("Due soon", dueSoon.length || payload.due_soon_count || 0)}
        ${renderSummaryStat("Escalated", escalated.length || payload.escalation_count || 0)}
        ${renderSummaryStat("Pending review", approvals.length || payload.approvals_pending || 0)}
      </section>

      ${renderSection(
        "Overdue now",
        "Items that need attention immediately.",
        renderRowList(overdue, "No overdue items found.")
      )}

      ${renderSection(
        "Due soon",
        "Upcoming checks, reviews and actions that need planning.",
        renderRowList(dueSoon, "No due soon items found.")
      )}

      ${renderSection(
        "Escalated concerns",
        "Compliance or review items that have already escalated.",
        renderRowList(escalated, "No escalated items found.")
      )}

      ${renderSection(
        "Awaiting review or sign-off",
        "Records and items waiting for approval or manager action.",
        renderRowList(approvals.length ? approvals : pending, "Nothing is currently awaiting sign-off.")
      )}

      ${renderSection(
        "Open tasks",
        "Actions generated from practice, follow-up and compliance.",
        renderRowList(openTasks, "No open tasks found.")
      )}

      ${renderSection(
        "Document readiness",
        "Statutory and supporting documents linked to this young person.",
        renderRowList(documentConcerns.length ? documentConcerns : documents, "No document readiness issues found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load readiness.")}</p>
      </div>
    `;
  }
}

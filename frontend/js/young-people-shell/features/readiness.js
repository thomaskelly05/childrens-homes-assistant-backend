import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapComplianceItem,
  mapTask,
  mapStatutoryDocument,
} from "../core/adapters.js";

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function buildComplianceRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "compliance_item",
    title: item.title || "Compliance item",
    summary: [
      item.status || "",
      item.severity || "",
      item.due_date ? `Due ${formatDate(item.due_date)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    due_date: item.due_date || null,
    created_at: item.created_at || null,
    status: item.status || "",
    severity: item.severity || "",
  }));
}

function buildTaskRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "task",
    title: item.title || item.task || "Task",
    summary: [
      item.task_type || "",
      item.assigned_role || "",
      item.due_date ? `Due ${formatDate(item.due_date)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    due_date: item.due_date || null,
    created_at: item.created_at || null,
    status: item.completed ? "Completed" : "Open",
  }));
}

function buildDocumentRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "statutory_document",
    title: item.title || item.document_type || "Document",
    summary: [
      item.document_type || "",
      item.status || "",
      item.review_date ? `Review ${formatDate(item.review_date)}` : "",
      item.expiry_date ? `Expiry ${formatDate(item.expiry_date)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    review_date: item.review_date || null,
    expiry_date: item.expiry_date || null,
    created_at: item.created_at || null,
    status: item.status || "",
  }));
}

function buildReadinessOverview({ compliance = [], tasks = [], documents = [] }) {
  const overdue = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  ).length;

  const dueSoon = compliance.filter((item) =>
    ["due_soon", "due soon"].includes(String(item.status || "").toLowerCase())
  ).length;

  const openTasks = tasks.filter((item) => !item.completed).length;

  const reviewDueDocs = documents.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return ["review_due", "expiring", "expired"].includes(status);
  }).length;

  return `
    <div class="profile-grid">
      <div class="profile-card">
        <div class="profile-card-title">Overdue</div>
        <div class="profile-card-text">${escapeHtml(String(overdue))}</div>
        <div class="profile-card-subtext">Items needing urgent action</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Due soon</div>
        <div class="profile-card-text">${escapeHtml(String(dueSoon))}</div>
        <div class="profile-card-subtext">Items approaching deadline</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Open tasks</div>
        <div class="profile-card-text">${escapeHtml(String(openTasks))}</div>
        <div class="profile-card-subtext">Follow-up actions still outstanding</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Documents needing review</div>
        <div class="profile-card-text">${escapeHtml(String(reviewDueDocs))}</div>
        <div class="profile-card-subtext">Documents affecting readiness</div>
      </div>
    </div>
  `;
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
    const [complianceData, tasksData, documentsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/documents`).catch(() => ({ items: [] })),
    ]);

    const complianceItems = sortSoonestFirst(
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

    const documents = sortNewestFirst(
      (
        documentsData.items ||
        documentsData.records ||
        documentsData.documents ||
        documentsData.statutory_documents ||
        []
      ).map(mapStatutoryDocument),
      ["review_date", "expiry_date", "created_at"]
    );

    const overdueItems = complianceItems.filter((item) =>
      ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
    );

    const dueSoonItems = complianceItems.filter((item) =>
      ["due_soon", "due soon"].includes(String(item.status || "").toLowerCase())
    );

    const openTasks = tasks.filter((item) => !item.completed);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Compliance items", complianceItems.length)}
        ${renderSummaryStat("Overdue", overdueItems.length)}
        ${renderSummaryStat("Open tasks", openTasks.length)}
        ${renderSummaryStat("Documents", documents.length)}
      </section>

      ${renderSection(
        "Readiness overview",
        "A live view of compliance, actions and document readiness.",
        buildReadinessOverview({
          compliance: complianceItems,
          tasks,
          documents,
        })
      )}

      ${renderSection(
        "Overdue and escalated items",
        "Items that need immediate attention.",
        renderRowList(buildComplianceRows(overdueItems), "No overdue or escalated items found.")
      )}

      ${renderSection(
        "Due soon",
        "Upcoming compliance items that need action soon.",
        renderRowList(buildComplianceRows(dueSoonItems), "No due soon items found.")
      )}

      ${renderSection(
        "Open follow-up tasks",
        "Tasks linked to care, compliance or review actions.",
        renderRowList(buildTaskRows(openTasks), "No open tasks found.")
      )}

      ${renderSection(
        "Statutory and linked documents",
        "Documents that may affect review, expiry or inspection readiness.",
        renderRowList(buildDocumentRows(documents), "No documents found.")
      )}

      ${renderSection(
        "All compliance items",
        "Full compliance list in due-date order.",
        renderRowList(buildComplianceRows(complianceItems), "No compliance items found.")
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
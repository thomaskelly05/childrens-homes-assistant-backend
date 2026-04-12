import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  mapComplianceItem,
  mapTask,
  mapStatutoryDocument,
} from "../core/adapters.js";

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

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

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
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
    status: item.completed ? "completed" : "open",
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

  return {
    overdue,
    dueSoon,
    openTasks,
    reviewDueDocs,
  };
}

function getRowDate(item = {}) {
  return item.due_date || item.review_date || item.expiry_date || item.created_at || "";
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const severity = String(item.severity || "").toLowerCase();

  if (
    ["overdue", "escalated", "expired"].includes(status) ||
    ["high", "critical"].includes(severity)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["due_soon", "due soon", "review_due", "expiring"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "warning" };
  }

  if (["completed", "active", "open"].includes(status)) {
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
              data-record-type="${toText(item.record_type)}"
              data-title="${toText(item.title)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title)}</div>
                ${item.summary ? `<div class="record-row-summary">${toText(item.summary)}</div>` : ""}
                ${getRowDate(item) ? `<div class="record-row-meta">${toText(formatDate(getRowDate(item)))}</div>` : ""}
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

function renderReadinessHtml({
  complianceItems = [],
  overdueItems = [],
  dueSoonItems = [],
  tasks = [],
  openTasks = [],
  documents = [],
}) {
  const overview = buildReadinessOverview({
    compliance: complianceItems,
    tasks,
    documents,
  });

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Readiness</div>
          <h2>Actions and readiness</h2>
          <p>A live view of compliance, follow-up actions and document readiness.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Compliance items</span>
              <strong class="overview-stat-value">${toText(complianceItems.length)}</strong>
              <span class="overview-stat-note">All recorded compliance items</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Overdue</span>
              <strong class="overview-stat-value">${toText(overdueItems.length)}</strong>
              <span class="overview-stat-note">Items needing urgent action</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Open tasks</span>
              <strong class="overview-stat-value">${toText(openTasks.length)}</strong>
              <span class="overview-stat-note">Follow-up actions outstanding</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Documents</span>
              <strong class="overview-stat-value">${toText(documents.length)}</strong>
              <span class="overview-stat-note">Linked readiness documents</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Readiness overview</h3>
              <p>The quickest view of actions, deadlines and document readiness.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Overdue</div>
                  <div class="record-row-summary">Items needing urgent action now.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.overdue > 0 ? "warning" : "muted"}">${toText(overview.overdue)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Due soon</div>
                  <div class="record-row-summary">Items approaching deadline.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.dueSoon > 0 ? "warning" : "muted"}">${toText(overview.dueSoon)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open tasks</div>
                  <div class="record-row-summary">Follow-up actions still outstanding.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.openTasks > 0 ? "warning" : "muted"}">${toText(overview.openTasks)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Documents needing review</div>
                  <div class="record-row-summary">Documents affecting readiness and review.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.reviewDueDocs > 0 ? "warning" : "muted"}">${toText(overview.reviewDueDocs)}</span>
                </div>
              </article>
            </div>
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Overdue and escalated items</h3>
              <p>Items that need immediate attention.</p>
            </div>

            ${renderRecordRows(buildComplianceRows(overdueItems), "No overdue or escalated items found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Due soon</h3>
              <p>Upcoming compliance items that need action soon.</p>
            </div>

            ${renderRecordRows(buildComplianceRows(dueSoonItems), "No due soon items found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open follow-up tasks</h3>
              <p>Tasks linked to care, compliance or review actions.</p>
            </div>

            ${renderRecordRows(buildTaskRows(openTasks), "No open tasks found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Statutory and linked documents</h3>
              <p>Documents that may affect review, expiry or inspection readiness.</p>
            </div>

            ${renderRecordRows(buildDocumentRows(documents), "No documents found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All compliance items</h3>
              <p>Full compliance list in due-date order.</p>
            </div>

            ${renderRecordRows(buildComplianceRows(complianceItems), "No compliance items found.")}
          </section>
        </aside>
      </div>
    </section>
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

    els.viewContent.innerHTML = renderReadinessHtml({
      complianceItems,
      overdueItems,
      dueSoonItems,
      tasks,
      openTasks,
      documents,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load readiness.")}</p>
      </div>
    `;
  }
}

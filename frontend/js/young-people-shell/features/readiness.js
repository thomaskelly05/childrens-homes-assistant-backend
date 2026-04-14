import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  mapComplianceItem,
  mapTask,
  mapStatutoryDocument,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

function getScopeEntityId() {
  if (getCurrentScope() === "child") {
    return state.youngPersonId || null;
  }

  return getHomeId();
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Home")
    );
  }

  if (scope === "quality") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Quality and RI")
    );
  }

  const person = state.selectedYoungPerson || state.youngPerson || {};
  return (
    person.full_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    "Young person"
  );
}

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

function buildOversightRows(complianceItems = [], tasks = []) {
  const complianceRows = complianceItems
    .filter((item) =>
      ["overdue", "escalated", "missing", "review_due", "due_soon", "expiring"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 6)
    .map((item) => ({
      id: `compliance-${item.id}`,
      record_type: "compliance_item",
      title: item.title || "Compliance item",
      summary: [
        "Compliance",
        item.status || "",
        item.due_date ? `Due ${formatDate(item.due_date)}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      action_at: item.due_date || item.created_at || null,
      created_at: item.created_at || null,
      status: item.status || "recorded",
    }));

  const taskRows = tasks
    .filter((item) => !item.completed)
    .slice(0, 6)
    .map((item) => ({
      id: `task-${item.id}`,
      record_type: "task",
      title: item.title || item.task || "Task",
      summary: [
        "Task",
        item.assigned_role || "",
        item.due_date ? `Due ${formatDate(item.due_date)}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      action_at: item.due_date || item.created_at || null,
      created_at: item.created_at || null,
      status: item.completed ? "completed" : "open",
    }));

  return sortNewestFirst([...complianceRows, ...taskRows], ["action_at", "created_at"]);
}

function buildReadinessOverview({
  compliance = [],
  tasks = [],
  documents = [],
  oversightRows = [],
}) {
  const overdue = compliance.filter((item) =>
    ["overdue", "escalated", "missing", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const dueSoon = compliance.filter((item) =>
    ["due_soon", "due soon", "expiring"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const openTasks = tasks.filter((item) => !item.completed).length;

  const reviewDueDocs = documents.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return ["review_due", "expiring", "expired", "overdue", "missing"].includes(status);
  }).length;

  return {
    overdue,
    dueSoon,
    openTasks,
    reviewDueDocs,
    oversightActions: oversightRows.length,
  };
}

function getRowDate(item = {}) {
  return (
    item.due_date ||
    item.review_date ||
    item.expiry_date ||
    item.action_at ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const severity = String(item.severity || "").toLowerCase();

  if (
    ["overdue", "escalated", "expired", "missing", "review_due"].includes(status) ||
    ["high", "critical"].includes(severity)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["due_soon", "due soon", "review_due", "expiring"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "warning" };
  }

  if (["completed", "active", "open", "recorded"].includes(status)) {
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
                ${
                  getRowDate(item)
                    ? `<div class="record-row-meta">${toText(formatDate(getRowDate(item)))}</div>`
                    : ""
                }
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
  oversightRows = [],
}) {
  const scope = getCurrentScope();
  const overview = buildReadinessOverview({
    compliance: complianceItems,
    tasks,
    documents,
    oversightRows,
  });

  const title =
    scope === "child"
      ? "Actions and readiness"
      : scope === "home"
      ? "Home actions and readiness"
      : "Quality and readiness";

  const subtitle =
    scope === "child"
      ? "A live view of compliance, follow-up actions and document readiness."
      : scope === "home"
      ? "A live view of service-level actions, compliance pressure and statutory readiness."
      : "A live quality and RI view of compliance pressure, oversight actions and readiness gaps.";

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Readiness</div>
          <h2>${toText(title)} • ${toText(getScopeTitle())}</h2>
          <p>${toText(subtitle)}</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Compliance items</span>
              <strong class="overview-stat-value">${toText(complianceItems.length)}</strong>
              <span class="overview-stat-note">All readiness-linked compliance items</span>
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

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Oversight actions</div>
                  <div class="record-row-summary">Action signals raised from compliance and open tasks.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.oversightActions > 0 ? "warning" : "muted"}">${toText(overview.oversightActions)}</span>
                </div>
              </article>
            </div>
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Overdue and escalated items</h3>
              <p>Items that need immediate attention.</p>
            </div>

            ${renderRecordRows(
              buildComplianceRows(overdueItems),
              "No overdue or escalated items found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Due soon</h3>
              <p>Upcoming compliance items that need action soon.</p>
            </div>

            ${renderRecordRows(
              buildComplianceRows(dueSoonItems),
              "No due soon items found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open follow-up tasks</h3>
              <p>Tasks linked to care, compliance, service oversight or review actions.</p>
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
              <h3>Oversight actions</h3>
              <p>Derived from compliance pressure and open readiness tasks.</p>
            </div>

            ${renderRecordRows(
              oversightRows,
              "No oversight actions found."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All compliance items</h3>
              <p>Full compliance list in due-date order.</p>
            </div>

            ${renderRecordRows(
              buildComplianceRows(complianceItems),
              "No compliance items found."
            )}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function getReadinessEndpoints() {
  const scope = getCurrentScope();
  const id = getScopeEntityId();

  if (!id) {
    return null;
  }

  if (scope === "home" || scope === "quality") {
    return {
      compliance: `/homes/${id}/compliance`,
      documents: `/homes/${id}/documents`,
      tasks: null,
    };
  }

  return {
    compliance: `/young-people/${id}/compliance`,
    tasks: `/young-people/${id}/tasks`,
    documents: `/young-people/${id}/documents`,
  };
}

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening readiness."
      : "A home context is needed before readiness can load.";

  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "No readiness context",
    nextEvent: "No deadline loaded",
    lastRecord: "No readiness data",
    openActions: "No actions loaded",
  });
}

export async function loadReadiness() {
  if (!els.viewContent) return;

  const endpoints = getReadinessEndpoints();

  if (!endpoints) {
    renderNoContext();
    return;
  }

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
      apiGet(endpoints.compliance).catch(() => ({ items: [] })),
      endpoints.tasks
        ? apiGet(endpoints.tasks).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      apiGet(endpoints.documents).catch(() => ({ items: [] })),
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
      (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
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
      ["overdue", "escalated", "missing", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const dueSoonItems = complianceItems.filter((item) =>
      ["due_soon", "due soon", "expiring"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const openTasks = tasks.filter((item) => !item.completed);
    const oversightRows = buildOversightRows(complianceItems, tasks);

    els.viewContent.innerHTML = renderReadinessHtml({
      complianceItems,
      overdueItems,
      dueSoonItems,
      tasks,
      openTasks,
      documents,
      oversightRows,
    });

    const nextDeadline =
      overdueItems[0] ||
      dueSoonItems[0] ||
      openTasks[0] ||
      documents[0] ||
      null;

    updateWorkspaceSummaryStrip({
      today: `${overdueItems.length} overdue • ${openTasks.length} open actions`,
      nextEvent: nextDeadline
        ? `Next due ${formatDate(
            nextDeadline.due_date ||
              nextDeadline.review_date ||
              nextDeadline.expiry_date ||
              nextDeadline.created_at
          )}`
        : "No immediate readiness deadline",
      lastRecord: oversightRows[0]
        ? `${oversightRows[0].title || "Oversight action"}`
        : "No recent readiness action",
      openActions: `${openTasks.length} open • ${dueSoonItems.length} due soon`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load readiness.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Readiness unavailable",
      nextEvent: "Unable to load",
      lastRecord: "No readiness data",
      openActions: "Check API routes",
    });
  }
}

import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  mapIncident,
  mapRiskAssessment,
  mapComplianceItem,
  mapTask,
  mapCommunicationRecord,
  mapStatutoryDocument,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

/* -------------------------------- helpers -------------------------------- */

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  const preferredHomeId = Number(
    state.homeId ||
      state.readinessSelectedHomeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      state.selectedYoungPerson?.home_id ||
      null
  );
  const allowedHomeIds = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (allowedHomeIds.length) {
    if (Number.isFinite(preferredHomeId) && allowedHomeIds.includes(preferredHomeId)) {
      return preferredHomeId;
    }
    return allowedHomeIds[0];
  }

  return Number.isFinite(preferredHomeId) && preferredHomeId > 0 ? preferredHomeId : null;
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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return toTime(aValue) - toTime(bValue);
  });
}

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
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
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>No oversight data</h3>
        <p>${toText(message)}</p>
      </div>
    </div>
  `;
}

function dedupeBy(items = [], getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasData(items = []) {
  return Array.isArray(items) && items.length > 0;
}

/* ------------------------------ fallback data ----------------------------- */

function buildFallbackManagerData(homeId) {
  const now = new Date();
  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };
  const minusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  return {
    incidents: [
      mapIncident({
        id: "incident-1",
        title: "Missing from care episode",
        incident_type: "Missing from care",
        severity: "high",
        workflow_status: "submitted",
        incident_datetime: minusDays(2),
        created_at: minusDays(2),
        summary: "Missing episode recorded and awaiting manager review.",
      }),
      mapIncident({
        id: "incident-2",
        title: "Physical intervention",
        incident_type: "Physical intervention",
        severity: "critical",
        workflow_status: "pending_review",
        incident_datetime: minusDays(1),
        created_at: minusDays(1),
        summary: "Critical incident logged and needs management oversight.",
      }),
    ],
    risks: [
      mapRiskAssessment({
        id: "risk-1",
        title: "Community risk review",
        workflow_status: "submitted",
        review_date: plusDays(3),
        created_at: minusDays(3),
        summary: "Risk assessment updated and awaiting manager sign-off.",
      }),
      mapRiskAssessment({
        id: "risk-2",
        title: "Bedroom safety risk",
        workflow_status: "active",
        review_date: plusDays(7),
        created_at: minusDays(6),
        summary: "Current risk assessment due for routine review.",
      }),
    ],
    complianceItems: [
      mapComplianceItem({
        id: "comp-1",
        title: "Medication audit follow-up",
        status: "overdue",
        due_date: minusDays(2),
        created_at: minusDays(5),
        severity: "high",
      }),
      mapComplianceItem({
        id: "comp-2",
        title: "Care plan signature check",
        status: "review_due",
        due_date: plusDays(2),
        created_at: minusDays(4),
        severity: "medium",
      }),
    ],
    tasks: [
      mapTask({
        id: "task-1",
        title: "Review missing from care episode",
        task: "Manager review needed for missing from care incident.",
        assigned_role: "Manager",
        due_date: plusDays(1),
        completed: false,
        created_at: minusDays(1),
      }),
      mapTask({
        id: "task-2",
        title: "Check medication audit actions",
        task: "Confirm all audit actions are complete.",
        assigned_role: "Deputy manager",
        due_date: plusDays(3),
        completed: false,
        created_at: minusDays(1),
      }),
    ],
    communications: [
      typeof mapCommunicationRecord === "function"
        ? mapCommunicationRecord({
            id: "comm-1",
            title: "Local authority update",
            summary: "Update shared regarding current missing from care concerns.",
            contact_datetime: minusDays(1),
            status: "sent",
          })
        : {
            id: "comm-1",
            record_type: "communication",
            title: "Local authority update",
            summary: "Update shared regarding current missing from care concerns.",
            contact_datetime: minusDays(1),
            status: "sent",
          },
    ],
    documents: [
      typeof mapStatutoryDocument === "function"
        ? mapStatutoryDocument({
            id: "doc-1",
            title: "Statement of Purpose",
            document_type: "Statutory",
            status: "review_due",
            review_date: plusDays(5),
            created_at: minusDays(10),
          })
        : {
            id: "doc-1",
            record_type: "document",
            title: "Statement of Purpose",
            document_type: "Statutory",
            status: "review_due",
            review_date: plusDays(5),
            created_at: minusDays(10),
          },
    ],
    isFallback: true,
  };
}

/* --------------------------- manager action rows -------------------------- */

function buildManagerActionRowsFromData({
  complianceItems = [],
  tasks = [],
  incidents = [],
  risks = [],
}) {
  const rows = [];

  complianceItems
    .filter((item) =>
      ["overdue", "escalated", "review_due", "missing", "due_soon", "expiring"].includes(
        normaliseToken(item.status)
      )
    )
    .slice(0, 6)
    .forEach((item) => {
      rows.push({
        id: `compliance-${item.id}`,
        record_type: "manager_action",
        title: item.title || "Compliance action",
        summary: [
          "Compliance",
          item.status || "",
          item.due_date ? `Due ${formatDateValue(item.due_date)}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        action_at: item.due_date || item.created_at || null,
        created_at: item.created_at || null,
        status: item.status || "recorded",
      });
    });

  tasks
    .filter((item) => !item.completed)
    .slice(0, 6)
    .forEach((item) => {
      rows.push({
        id: `task-${item.id}`,
        record_type: "manager_action",
        title: item.title || item.task || "Open task",
        summary: [
          "Task",
          item.assigned_role || "",
          item.due_date ? `Due ${formatDateValue(item.due_date)}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        action_at: item.due_date || item.created_at || null,
        created_at: item.created_at || null,
        status: item.completed ? "completed" : "open",
      });
    });

  incidents
    .filter((item) =>
      ["high", "critical"].includes(normaliseToken(item.severity))
    )
    .slice(0, 4)
    .forEach((item) => {
      rows.push({
        id: `incident-${item.id}`,
        record_type: "manager_action",
        title: item.title || item.incident_type || "High-risk incident",
        summary: [
          "Incident",
          item.severity || "",
          item.occurred_at || item.incident_datetime
            ? formatDateValue(item.occurred_at || item.incident_datetime)
            : "",
        ]
          .filter(Boolean)
          .join(" • "),
        action_at: item.occurred_at || item.incident_datetime || item.created_at || null,
        created_at: item.created_at || null,
        status: "needs_review",
        severity: item.severity || "",
      });
    });

  risks
    .slice(0, 4)
    .forEach((item) => {
      rows.push({
        id: `risk-${item.id}`,
        record_type: "manager_action",
        title: item.title || "Risk assessment",
        summary: [
          "Risk",
          item.review_date ? `Review ${formatDateValue(item.review_date)}` : "",
          item.summary || "",
        ]
          .filter(Boolean)
          .join(" • "),
        action_at: item.review_date || item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
        status: item.workflow_status || item.status || "recorded",
      });
    });

  return sortNewestFirst(
    dedupeBy(rows, (item) => `${item.record_type}:${item.id}`),
    ["action_at", "created_at"]
  ).slice(0, 12);
}

/* ------------------------------ row shaping ------------------------------- */

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
      item.note ||
      "Record awaiting review",
    created_at: item.created_at || null,
    status: item.workflow_status || item.status || item.approval_status || "",
    severity: item.severity || "",
    review_date: item.review_date || null,
    due_date: item.due_date || null,
    occurred_at: item.occurred_at || item.incident_datetime || null,
    session_date: item.session_date || null,
    contact_datetime: item.contact_datetime || null,
  }));
}

function buildOverviewCards({
  submittedRecords = [],
  highRiskIncidents = [],
  complianceIssues = [],
  openTasks = [],
  managerActions = [],
}) {
  return {
    awaitingReview: submittedRecords.length,
    highRiskIncidents: highRiskIncidents.length,
    complianceIssues: complianceIssues.length,
    openTasks: openTasks.length,
    managerActions: managerActions.length,
  };
}

function getRowDate(item = {}) {
  return (
    item.action_at ||
    item.review_date ||
    item.due_date ||
    item.occurred_at ||
    item.contact_datetime ||
    item.session_date ||
    item.record_date ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = normaliseToken(item.status || item.workflow_status || "");
  const severity = normaliseToken(item.severity || "");

  if (
    ["high", "critical"].includes(severity) ||
    ["overdue", "escalated", "returned", "review_due", "needs_review"].includes(status)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["submitted", "pending_review", "review"].includes(status)) {
    return { label: "Awaiting review", tone: "warning" };
  }

  if (["approved", "active", "completed", "open", "recorded", "current"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: status ? status.replaceAll("_", " ") : "Recorded", tone: "muted" };
}

/* -------------------------------- render --------------------------------- */

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
                ${
                  getRowDate(item)
                    ? `<div class="record-row-meta">${toText(formatDateTimeValue(getRowDate(item)))}</div>`
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

function renderManagerHtml({
  submittedRecords = [],
  highRiskIncidents = [],
  risks = [],
  complianceIssues = [],
  openTasks = [],
  managerActions = [],
  communications = [],
  documents = [],
  isFallback = false,
}) {
  const scope = getCurrentScope();
  const overview = buildOverviewCards({
    submittedRecords,
    highRiskIncidents,
    complianceIssues,
    openTasks,
    managerActions,
  });

  const submittedRows = buildReviewRecordRows(submittedRecords);
  const incidentRows = buildReviewRecordRows(highRiskIncidents);
  const riskRows = buildReviewRecordRows(risks);
  const complianceRows = buildReviewRecordRows(complianceIssues);
  const taskRows = buildReviewRecordRows(openTasks);
  const actionRows = buildReviewRecordRows(managerActions);
  const communicationRows = buildReviewRecordRows(communications);
  const documentRows = buildReviewRecordRows(documents);

  const title =
    scope === "child"
      ? "Leadership and review"
      : scope === "home"
      ? "Home leadership and oversight"
      : "Quality and RI oversight";

  const subtitle =
    scope === "child"
      ? "The quickest view of records, risk and operational items needing oversight."
      : scope === "home"
      ? "A service-wide view of records, risks, compliance and action needing leadership attention."
      : "A quality and RI view of risk, compliance, patterns and oversight activity.";

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Oversight</div>
          <h2>${toText(title)} • ${toText(getScopeTitle())}</h2>
          <p>${toText(subtitle)}</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview oversight data until live routes are available.</p>`
              : ""
          }
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

            <article class="overview-stat-card">
              <span class="overview-stat-label">Manager actions</span>
              <strong class="overview-stat-value">${toText(overview.managerActions)}</strong>
              <span class="overview-stat-note">Derived leadership actions</span>
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
              <p>Derived from live compliance, risk and task pressure.</p>
            </div>

            ${renderRecordRows(actionRows, "No manager actions found.")}
          </section>

          ${
            scope !== "child"
              ? `
                <section class="overview-side-card">
                  <div class="overview-section-head">
                    <h3>Recent communication</h3>
                    <p>Partner-agency or operational communication that may need leadership awareness.</p>
                  </div>

                  ${renderRecordRows(communicationRows, "No recent communication found.")}
                </section>

                <section class="overview-side-card">
                  <div class="overview-section-head">
                    <h3>Documents for oversight</h3>
                    <p>Recent or review-sensitive documents that may affect compliance or leadership decisions.</p>
                  </div>

                  ${renderRecordRows(documentRows, "No oversight documents found.")}
                </section>
              `
              : `
                <section class="overview-side-card">
                  <div class="overview-section-head">
                    <h3>Documents for oversight</h3>
                    <p>Recent or review-sensitive documents linked to this young person.</p>
                  </div>

                  ${renderRecordRows(documentRows, "No oversight documents found.")}
                </section>
              `
          }
        </aside>
      </div>
    </section>
  `;
}

/* ------------------------------- endpoints -------------------------------- */

function getManagerEndpoints() {
  const scope = getCurrentScope();
  const id = getScopeEntityId();

  if (!id) return null;

  if (scope === "home" || scope === "quality") {
    return {
      incidents: `/homes/${id}/incidents`,
      risks: `/homes/${id}/risks`,
      compliance: `/homes/${id}/compliance`,
      tasks: `/homes/${id}/tasks`,
      communications: `/homes/${id}/communications`,
      documents: `/homes/${id}/documents`,
    };
  }

  return {
    incidents: `/young-people/${id}/incidents`,
    risks: `/young-people/${id}/risks`,
    compliance: `/young-people/${id}/compliance`,
    tasks: `/young-people/${id}/tasks`,
    communications: null,
    documents: `/young-people/${id}/documents`,
  };
}

/* -------------------------------- states --------------------------------- */

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening leadership and review."
      : "A home context is needed before leadership and review can load.";

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message)}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No oversight context",
    nextEvent: "No review due",
    lastRecord: "No oversight data",
    openActions: "No actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading manager review...</p>
      </div>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading oversight view",
    nextEvent: "Checking reviews",
    lastRecord: "Loading oversight records",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load manager review.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Oversight unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No oversight data",
    openActions: "Check API routes",
  });
}

/* -------------------------------- public --------------------------------- */

export async function loadCurrentView() {
  return loadManager();
}

export async function loadManager() {
  if (!els.viewContent) return;

  const endpoints = getManagerEndpoints();
  if (!endpoints) {
    renderNoContext();
    return;
  }

  renderLoadingState();

  try {
    const [
      incidentsData,
      risksData,
      complianceData,
      tasksData,
      communicationsData,
      documentsData,
    ] = await Promise.all([
      endpoints.incidents
        ? apiGet(endpoints.incidents).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      endpoints.risks
        ? apiGet(endpoints.risks).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      endpoints.compliance
        ? apiGet(endpoints.compliance).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      endpoints.tasks
        ? apiGet(endpoints.tasks).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      endpoints.communications
        ? apiGet(endpoints.communications).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      endpoints.documents
        ? apiGet(endpoints.documents).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
    ]);

    let incidents = sortNewestFirst(
      (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(
        mapIncident
      ),
      ["occurred_at", "incident_datetime", "created_at"]
    );

    let risks = sortNewestFirst(
      (risksData.items ||
        risksData.records ||
        risksData.risk_assessments ||
        risksData.risks ||
        []).map(mapRiskAssessment),
      ["review_date", "updated_at", "created_at"]
    );

    let complianceItems = sortSoonestFirst(
      (complianceData.items ||
        complianceData.records ||
        complianceData.compliance_items ||
        []).map(mapComplianceItem),
      ["due_date", "created_at"]
    );

    let tasks = sortSoonestFirst(
      (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
      ["due_date", "created_at"]
    );

    let communications = sortNewestFirst(
      (
        communicationsData.items ||
        communicationsData.records ||
        communicationsData.communications ||
        []
      ).map((item) =>
        typeof mapCommunicationRecord === "function" ? mapCommunicationRecord(item) : item
      ),
      ["contact_datetime", "created_at", "updated_at"]
    ).slice(0, 8);

    let documents = sortNewestFirst(
      (
        documentsData.items ||
        documentsData.records ||
        documentsData.documents ||
        documentsData.statutory_documents ||
        []
      ).map((item) =>
        typeof mapStatutoryDocument === "function" ? mapStatutoryDocument(item) : item
      ),
      ["review_date", "expiry_date", "created_at", "updated_at"]
    ).slice(0, 8);

    let isFallback = false;

    if (
      !hasData(incidents) &&
      !hasData(risks) &&
      !hasData(complianceItems) &&
      !hasData(tasks) &&
      !hasData(communications) &&
      !hasData(documents)
    ) {
      const fallback = buildFallbackManagerData(getHomeId());
      incidents = fallback.incidents;
      risks = fallback.risks;
      complianceItems = fallback.complianceItems;
      tasks = fallback.tasks;
      communications = fallback.communications;
      documents = fallback.documents;
      isFallback = true;
    }

    const submittedRecords = sortNewestFirst(
      dedupeBy(
        [
          ...incidents.filter((item) =>
            ["submitted", "pending_review", "review"].includes(
              normaliseToken(item.workflow_status)
            )
          ),
          ...risks.filter((item) =>
            ["submitted", "pending_review", "review"].includes(
              normaliseToken(item.workflow_status)
            )
          ),
          ...complianceItems.filter((item) =>
            ["submitted", "pending_review", "review"].includes(
              normaliseToken(item.workflow_status || item.status)
            )
          ),
        ],
        (item) => `${item.record_type || "record"}:${item.id}`
      ),
      ["created_at", "updated_at", "occurred_at", "review_date"]
    ).slice(0, 12);

    const highRiskIncidents = incidents.filter((item) =>
      ["high", "critical"].includes(normaliseToken(item.severity))
    );

    const complianceIssues = complianceItems.filter((item) =>
      ["overdue", "escalated", "review_due", "missing"].includes(
        normaliseToken(item.status)
      )
    );

    const openTasks = tasks.filter((item) => !item.completed);

    const managerActions = buildManagerActionRowsFromData({
      complianceItems,
      tasks,
      incidents,
      risks,
    });

    els.viewContent.innerHTML = renderManagerHtml({
      submittedRecords,
      highRiskIncidents,
      risks,
      complianceIssues,
      openTasks,
      managerActions,
      communications,
      documents,
      isFallback,
    });

    const nextReview =
      submittedRecords[0] ||
      complianceIssues[0] ||
      risks[0] ||
      highRiskIncidents[0] ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${submittedRecords.length} awaiting review • preview mode`
        : `${submittedRecords.length} awaiting review • ${openTasks.length} open actions`,
      nextEvent: nextReview
        ? `Next review ${formatDateValue(
            nextReview.review_date ||
              nextReview.due_date ||
              nextReview.created_at ||
              nextReview.occurred_at
          )}`
        : "No immediate review due",
      lastRecord: managerActions[0]
        ? `${managerActions[0].title || "Manager action"}`
        : isFallback
        ? "Preview oversight data loaded"
        : "No recent manager action",
      openActions: `${complianceIssues.length} compliance issue${
        complianceIssues.length === 1 ? "" : "s"
      } • ${highRiskIncidents.length} high-risk incident${
        highRiskIncidents.length === 1 ? "" : "s"
      }`,
    });
  } catch (error) {
    console.error("[manager] load failed", error);
    renderErrorState(error?.message || "Failed to load manager review.");
  }
}
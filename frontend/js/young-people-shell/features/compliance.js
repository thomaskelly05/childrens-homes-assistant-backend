import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { buildInspectionUiEndpoints } from "../core/config.js";
import { escapeHtml, formatDate, formatDateTime } from "../core/utils.js";
import {
  mapInspectionAction,
  mapInspectionTask,
  mapInspectionHeader,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  const toSafeHomeId = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const preferredHomeId = toSafeHomeId(
    state.readinessSelectedHomeId ||
      state.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      state.selectedYoungPerson?.home_id ||
      state.selectedYoungPerson?.homeId ||
      null
  );

  const allowedHomeIds = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (allowedHomeIds.length) {
    if (preferredHomeId && allowedHomeIds.includes(preferredHomeId)) {
      return preferredHomeId;
    }
    return allowedHomeIds[0];
  }

  return preferredHomeId;
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function normaliseToken(value = "") {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function formatBand(value = "") {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getBandTone(value = "") {
  const band = normaliseToken(value);

  if (band === "outstanding") return "success";
  if (band === "good") return "success";
  if (band === "requires_improvement") return "warning";
  if (band === "inadequate") return "danger";

  return "muted";
}

function getStatusTone(status = "") {
  const normalised = normaliseToken(status);

  if (
    [
      "overdue",
      "critical",
      "high",
      "expired",
      "missing",
      "non_compliant",
      "failed",
      "danger",
      "blocked",
      "escalated",
      "inadequate",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "warning",
      "review_due",
      "amber",
      "attention",
      "incomplete",
      "expiring",
      "at_risk",
      "due",
      "requires_improvement",
      "medium",
      "open",
      "in_progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "complete",
      "completed",
      "active",
      "compliant",
      "ok",
      "good",
      "up_to_date",
      "passed",
      "current",
      "reviewed",
      "outstanding",
      "resolved",
      "closed",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(aValue) - toTime(bValue);
  });
}

function buildRecordPayloadAttr(item = {}) {
  try {
    return encodeURIComponent(JSON.stringify(item));
  } catch {
    return "";
  }
}

function isOpenAttentionStatus(value = "") {
  return [
    "overdue",
    "missing",
    "review_due",
    "due_soon",
    "warning",
    "attention",
    "incomplete",
    "expired",
    "expiring",
    "at_risk",
    "open",
    "in_progress",
    "high",
    "critical",
  ].includes(normaliseToken(value));
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.rows) && data.rows.length > 0) return true;
  if (Array.isArray(data.workforce) && data.workforce.length > 0) return true;
  if (Array.isArray(data.staff) && data.staff.length > 0) return true;
  if (Array.isArray(data.training) && data.training.length > 0) return true;
  if (Array.isArray(data.supervisions) && data.supervisions.length > 0) return true;
  if (Array.isArray(data.probations) && data.probations.length > 0) return true;
  if (Array.isArray(data.inductions) && data.inductions.length > 0) return true;
  if (Array.isArray(data.children) && data.children.length > 0) return true;
  if (Array.isArray(data.child_files) && data.child_files.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.inspection) && data.inspection.length > 0) return true;
  if (Array.isArray(data.readiness) && data.readiness.length > 0) return true;
  if (Array.isArray(data.actions) && data.actions.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.compliance_summary && typeof data.compliance_summary === "object") return true;
  if (typeof data.compliance_score !== "undefined") return true;
  if (typeof data.score !== "undefined") return true;
  if (typeof data.overall_score !== "undefined") return true;
  return false;
}

function normaliseComplianceSummary(data = {}) {
  return data.summary || data.compliance_summary || data.dashboard || data || {};
}

function normaliseWorkforceItems(data = {}) {
  return toArray(data.items, [data.workforce, data.staff, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    staff_member:
      item.staff_member ||
      item.full_name ||
      item.name ||
      item.title ||
      "Staff member",
    title:
      item.title ||
      item.staff_member ||
      item.full_name ||
      item.name ||
      "Staff member",
    role: item.role || item.job_title || "",
    status: item.status || item.employment_status || "active",
    summary:
      item.summary ||
      item.notes ||
      `${item.role || "Workforce item"} status recorded.`,
    record_type: item.record_type || "workforce",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.training_name || "Training",
    training_name: item.training_name || item.title || "Training",
    staff_member: item.staff_member || item.name || "",
    expiry_date: item.expiry_date || item.review_date || null,
    review_date: item.review_date || item.expiry_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      (item.expiry_date
        ? `Training expires ${formatDate(item.expiry_date)}`
        : "Training record."),
    record_type: item.record_type || "training",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    staff_member: item.staff_member || item.name || "Staff member",
    title: item.title || item.staff_member || item.name || "Supervision",
    supervisor: item.supervisor || "",
    next_due_date: item.next_due_date || item.due_date || item.review_date || null,
    due_date: item.due_date || item.next_due_date || item.review_date || null,
    status: item.status || "recorded",
    summary:
      item.summary ||
      (item.next_due_date || item.due_date
        ? `Supervision due ${formatDate(item.next_due_date || item.due_date)}`
        : "Supervision record."),
    record_type: item.record_type || "supervision",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseProbationItems(data = {}) {
  return toArray(data.items, [data.probations, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    staff_member: item.staff_member || item.name || "Staff member",
    title: item.title || item.staff_member || "Probation",
    review_date: item.review_date || item.due_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      (item.review_date
        ? `Probation review ${formatDate(item.review_date)}`
        : "Probation record."),
    record_type: item.record_type || "probation",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseInductionItems(data = {}) {
  return toArray(data.items, [data.inductions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    staff_member: item.staff_member || item.name || "Staff member",
    title: item.title || item.staff_member || "Induction",
    review_date: item.review_date || item.due_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      (item.review_date
        ? `Induction review ${formatDate(item.review_date)}`
        : "Induction record."),
    record_type: item.record_type || "induction",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseChildComplianceItems(data = {}) {
  return toArray(data.items, [data.children, data.child_files, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    young_person_name:
      item.young_person_name ||
      item.preferred_name ||
      item.full_name ||
      item.name ||
      "Young person",
    title:
      item.title ||
      item.young_person_name ||
      item.document_type ||
      "Child compliance item",
    document_type: item.document_type || item.type || "",
    review_date: item.review_date || item.due_date || null,
    due_date: item.due_date || item.review_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      (item.review_date || item.due_date
        ? `Review due ${formatDate(item.review_date || item.due_date)}`
        : "Child compliance item."),
    record_type: item.record_type || "child_compliance",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.document_type || "Document",
    document_type: item.document_type || item.type || "",
    review_date: item.review_date || item.due_date || null,
    due_date: item.due_date || item.review_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      (item.review_date || item.due_date
        ? `Review due ${formatDate(item.review_date || item.due_date)}`
        : "Document record."),
    record_type: item.record_type || "document",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseInspectionReadinessItems(data = {}) {
  return toArray(data.items, [data.inspection, data.readiness, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.requirement || "Inspection evidence preparation item",
    category: item.category || item.area || "",
    review_date: item.review_date || item.due_date || null,
    due_date: item.due_date || item.review_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      item.requirement ||
      "Inspection evidence preparation item.",
    record_type: item.record_type || "inspection_readiness",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseInspectionActions(data = {}) {
  return toArray(data.items, [data.actions, data.rows, data.records]).map(mapInspectionAction);
}

function normaliseInspectionTasks(data = {}) {
  return toArray(data.items, [data.tasks, data.rows, data.records]).map(mapInspectionTask);
}

function normaliseInspectionHeader(data = {}) {
  const items = toArray(data.items, [data.rows, data.records]).map(mapInspectionHeader);
  return items[0] || null;
}

function buildTopStats({
  summary = {},
  overdueSupervisions = [],
  expiringTraining = [],
  outstandingProbations = [],
  overdueChildFiles = [],
  overdueHomeDocs = [],
  inspectionActions = [],
  inspectionTasks = [],
  inspectionHeader = null,
}) {
  const score = toNumber(
    summary.compliance_score ??
      summary.score ??
      inspectionHeader?.confidence_score ??
      0
  );

  const highPriorityInspectionActions = inspectionActions.filter((item) =>
    ["critical", "high"].includes(normaliseToken(item.priority))
  );

  const openInspectionTasks = inspectionTasks.filter((item) => !item.completed);

  return [
    {
      label: "Compliance score",
      value: `${score}%`,
      note: "Overall home compliance position",
      tone: score < 70 ? "danger" : score < 85 ? "warning" : "success",
    },
    {
      label: "Overdue supervisions",
      value: overdueSupervisions.length,
      note: "Staff oversight needing attention",
      tone: overdueSupervisions.length ? "warning" : "success",
    },
    {
      label: "Training expiring",
      value: expiringTraining.length,
      note: "Training due or overdue soon",
      tone: expiringTraining.length ? "warning" : "success",
    },
    {
      label: "Probation / induction gaps",
      value: outstandingProbations.length,
      note: "Staff progression checks incomplete",
      tone: outstandingProbations.length ? "warning" : "success",
    },
    {
      label: "File / document gaps",
      value: overdueChildFiles.length + overdueHomeDocs.length,
      note: "Child and home statutory paperwork",
      tone:
        overdueChildFiles.length + overdueHomeDocs.length
          ? "danger"
          : "success",
    },
    {
      label: "Inspection actions",
      value: highPriorityInspectionActions.length + openInspectionTasks.length,
      note: "High-priority actions and linked tasks",
      tone:
        highPriorityInspectionActions.length || openInspectionTasks.length
          ? "warning"
          : "success",
    },
  ];
}

function buildProgressCards({
  workforceItems = [],
  trainingItems = [],
  supervisionItems = [],
  childComplianceItems = [],
  homeDocumentItems = [],
}) {
  const compliantWorkforce = workforceItems.filter((item) =>
    ["active", "ok", "good", "compliant"].includes(normaliseToken(item.status))
  ).length;
  const workforcePercent = workforceItems.length
    ? Math.round((compliantWorkforce / workforceItems.length) * 100)
    : 0;

  const validTraining = trainingItems.filter((item) =>
    ["active", "current", "up_to_date", "completed", "passed"].includes(
      normaliseToken(item.status)
    )
  ).length;
  const trainingPercent = trainingItems.length
    ? Math.round((validTraining / trainingItems.length) * 100)
    : 0;

  const completedSupervisions = supervisionItems.filter((item) =>
    ["completed", "complete", "up_to_date", "current"].includes(
      normaliseToken(item.status)
    )
  ).length;
  const supervisionPercent = supervisionItems.length
    ? Math.round((completedSupervisions / supervisionItems.length) * 100)
    : 0;

  const childFileCurrent = childComplianceItems.filter((item) =>
    ["compliant", "up_to_date", "current", "completed"].includes(
      normaliseToken(item.status)
    )
  ).length;
  const childFilePercent = childComplianceItems.length
    ? Math.round((childFileCurrent / childComplianceItems.length) * 100)
    : 0;

  const homeDocsCurrent = homeDocumentItems.filter((item) =>
    ["compliant", "up_to_date", "current", "completed"].includes(
      normaliseToken(item.status)
    )
  ).length;
  const homeDocPercent = homeDocumentItems.length
    ? Math.round((homeDocsCurrent / homeDocumentItems.length) * 100)
    : 0;

  return [
    {
      label: "Workforce position",
      value: `${workforcePercent}%`,
      percent: workforcePercent,
      tone:
        workforcePercent >= 90
          ? "success"
          : workforcePercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Training compliance",
      value: `${trainingPercent}%`,
      percent: trainingPercent,
      tone:
        trainingPercent >= 90
          ? "success"
          : trainingPercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Supervision completion",
      value: `${supervisionPercent}%`,
      percent: supervisionPercent,
      tone:
        supervisionPercent >= 90
          ? "success"
          : supervisionPercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Child files current",
      value: `${childFilePercent}%`,
      percent: childFilePercent,
      tone:
        childFilePercent >= 90
          ? "success"
          : childFilePercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Home docs current",
      value: `${homeDocPercent}%`,
      percent: homeDocPercent,
      tone:
        homeDocPercent >= 90
          ? "success"
          : homeDocPercent >= 75
          ? "warning"
          : "danger",
    },
  ];
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      ${cards
        .map(
          (card) => `
            <article class="overview-stat-card ${
              card.tone === "danger"
                ? "overview-stat-card--danger"
                : card.tone === "warning"
                ? "overview-stat-card--warning"
                : card.tone === "success"
                ? "overview-stat-card--success"
                : ""
            }">
              <span class="overview-stat-label">${safeText(card.label)}</span>
              <strong class="overview-stat-value">${safeText(card.value)}</strong>
              <span class="overview-stat-note">${safeText(card.note)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgressCards(cards = []) {
  return `
    <div class="analytics-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="analytics-progress-card">
              <div class="analytics-progress-head">
                <span class="analytics-progress-label">${safeText(card.label)}</span>
                <strong class="analytics-progress-value">${safeText(card.value)}</strong>
              </div>
              <div class="analytics-progress-track">
                <span
                  class="analytics-progress-bar analytics-progress-bar--${safeText(card.tone || "muted")}"
                  style="width: ${safeText(card.percent || 0)}%;"
                ></span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRows(items = [], options = {}) {
  const {
    emptyMessage = "Nothing to show right now.",
    titleKey = "title",
    summaryKey = "summary",
    metaBuilder = null,
    statusKey = "status",
    recordType = "",
  } = options;

  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>Nothing to show</h3>
          <p>${safeText(emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.name ||
            item?.staff_member ||
            item?.young_person_name ||
            item?.document_type ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.requirement ||
            item?.role ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";
          const recordPayload = buildRecordPayloadAttr(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
              data-title="${safeText(title)}"
              data-record-summary="${safeText(summary)}"
              data-record-status="${safeText(status || "")}"
              data-record-date="${safeText(
                item?.due_date ||
                  item?.review_date ||
                  item?.next_due_date ||
                  item?.expiry_date ||
                  item?.updated_at ||
                  item?.created_at ||
                  ""
              )}"
              data-record-payload="${safeText(recordPayload)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
                  status || "Recorded"
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No critical compliance issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title)}</strong>
              <p>${safeText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildPriorityItems({
  overdueSupervisions = [],
  expiringTraining = [],
  outstandingProbations = [],
  overdueChildFiles = [],
  overdueHomeDocs = [],
  inspectionActions = [],
  inspectionTasks = [],
}) {
  const items = [];

  overdueSupervisions.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Supervision overdue",
      summary: item.next_due_date
        ? `Supervision overdue since ${formatDate(item.next_due_date)}`
        : item.due_date
        ? `Supervision overdue since ${formatDate(item.due_date)}`
        : "Supervision is overdue.",
    });
  });

  expiringTraining.slice(0, 2).forEach((item) => {
    items.push({
      title: item.training_name || item.title || "Training gap",
      summary: item.expiry_date
        ? `Expires ${formatDate(item.expiry_date)}`
        : "Training review required.",
    });
  });

  outstandingProbations.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || item.title || "Probation / induction gap",
      summary:
        item.summary ||
        item.notes ||
        "Probation review or induction requirement is incomplete.",
    });
  });

  overdueChildFiles.slice(0, 3).forEach((item) => {
    items.push({
      title:
        item.young_person_name ||
        item.title ||
        item.document_type ||
        "Child file gap",
      summary:
        item.summary ||
        item.notes ||
        (item.review_date || item.due_date
          ? `Review due ${formatDate(item.review_date || item.due_date)}`
          : "Statutory paperwork is missing or overdue."),
    });
  });

  overdueHomeDocs.slice(0, 3).forEach((item) => {
    items.push({
      title: item.title || item.document_type || "Home document gap",
      summary:
        item.summary ||
        item.notes ||
        (item.review_date || item.due_date
          ? `Review due ${formatDate(item.review_date || item.due_date)}`
          : "Home document requires attention."),
    });
  });

  inspectionActions
    .filter((item) => ["critical", "high"].includes(normaliseToken(item.priority)))
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.action_title || "Inspection action",
        summary:
          item.action_description ||
          (item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : "High-priority inspection action."),
      });
    });

  inspectionTasks
    .filter((item) => !item.completed)
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.task_title || item.action_title || "Inspection task",
        summary:
          item.task_due_date
            ? `Due ${formatDate(item.task_due_date)}`
            : "Inspection-linked task remains open.",
      });
    });

  return items.slice(0, 10);
}

function renderComplianceDashboardHtml({
  homeName = "Compliance",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  overdueSupervisions = [],
  expiringTraining = [],
  outstandingProbations = [],
  overdueChildFiles = [],
  overdueHomeDocs = [],
  inspectionReadiness = [],
  inspectionActions = [],
  inspectionTasks = [],
  inspectionHeader = null,
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--compliance">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Compliance</div>
          <h2>${safeText(homeName)}</h2>
          <p>
            ${safeText(
              inspectionHeader?.top_concerns ||
                "A live compliance view across workforce, children’s files, statutory paperwork and Inspection evidence preparation."
            )}
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live compliance endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Compliance health</h3>
          <p>A quick visual read across workforce, files and statutory paperwork.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      ${
        inspectionHeader
          ? `
            <div class="overview-section-card">
              <div class="overview-section-head">
                <h3>Inspection position</h3>
                <p>Headline inspection picture for this home.</p>
              </div>
              <div class="record-list">
                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">Overall band</div>
                    <div class="record-row-summary">
                      Confidence ${safeText(inspectionHeader.confidence_score || 0)}
                    </div>
                  </div>
                  <div class="record-row-side">
                    <span class="row-pill ${safeText(getBandTone(inspectionHeader.overall_band))}">
                      ${safeText(formatBand(inspectionHeader.overall_band))}
                    </span>
                  </div>
                </article>

                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">Experiences and progress</div>
                  </div>
                  <div class="record-row-side">
                    <span class="row-pill ${safeText(getBandTone(inspectionHeader.experiences_band))}">
                      ${safeText(formatBand(inspectionHeader.experiences_band))}
                    </span>
                  </div>
                </article>

                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">Helped and protected</div>
                  </div>
                  <div class="record-row-side">
                    <span class="row-pill ${safeText(getBandTone(inspectionHeader.helped_band))}">
                      ${safeText(formatBand(inspectionHeader.helped_band))}
                    </span>
                  </div>
                </article>

                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">Leadership and management</div>
                  </div>
                  <div class="record-row-side">
                    <span class="row-pill ${safeText(getBandTone(inspectionHeader.leadership_band))}">
                      ${safeText(formatBand(inspectionHeader.leadership_band))}
                    </span>
                  </div>
                </article>
              </div>
            </div>
          `
          : ""
      }

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Workforce compliance</h3>
              <p>Supervision, training, induction, probation and staffing compliance.</p>
            </div>

            ${renderRows(overdueSupervisions, {
              emptyMessage: "No overdue supervision items found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "supervision",
              metaBuilder: (item) =>
                [
                  item.supervisor || "",
                  item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
                  item.due_date && !item.next_due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Training and probation</h3>
              <p>Mandatory training, induction progress and probation checkpoints.</p>
            </div>

            ${renderRows(
              [...expiringTraining.slice(0, 5), ...outstandingProbations.slice(0, 5)],
              {
                emptyMessage: "No workforce compliance gaps found.",
                titleKey: "title",
                summaryKey: "summary",
                recordType: "compliance",
                metaBuilder: (item) =>
                  [
                    item.staff_member || "",
                    item.training_name || "",
                    item.expiry_date ? `Expires ${formatDate(item.expiry_date)}` : "",
                    item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • "),
              }
            )}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Child statutory paperwork</h3>
              <p>PEP, risk, plans, consents, delegated authority and key statutory file checks.</p>
            </div>

            ${renderRows(overdueChildFiles, {
              emptyMessage: "No child statutory paperwork gaps found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                  item.due_date && !item.review_date ? `Due ${formatDate(item.due_date)}` : "",
                  item.status || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Inspection actions</h3>
              <p>Best next compliance-led actions linked to the inspection picture.</p>
            </div>

            ${renderRows(inspectionActions, {
              emptyMessage: "No inspection actions are currently linked.",
              titleKey: "action_title",
              summaryKey: "action_description",
              recordType: "inspection_action",
              metaBuilder: (item) =>
                [
                  item.section_name || item.section_code || "",
                  item.owner_user_name || item.owner_staff_name || "Unassigned",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "priority",
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs immediate attention</h3>
              <p>The most urgent compliance risks across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Home statutory documents</h3>
              <p>Statement of Purpose, Annex A and other home-wide document checks.</p>
            </div>

            ${renderRows(overdueHomeDocs, {
              emptyMessage: "No overdue home documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                  item.due_date && !item.review_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Inspection evidence preparation</h3>
              <p>What an inspector or RI would likely want to see next.</p>
            </div>

            ${renderRows(inspectionReadiness, {
              emptyMessage: "No Inspection evidence preparation issues are currently flagged.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_readiness",
              metaBuilder: (item) =>
                [
                  item.category || "",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                  item.due_date && !item.review_date ? `Due ${formatDate(item.due_date)}` : "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked inspection tasks</h3>
              <p>Operational follow-through attached to inspection improvement.</p>
            </div>

            ${renderRows(inspectionTasks, {
              emptyMessage: "No linked inspection tasks are currently open.",
              titleKey: "task_title",
              summaryKey: "action_title",
              recordType: "inspection_task",
              metaBuilder: (item) =>
                [
                  item.assigned_user_name || item.assigned_role || "Unassigned",
                  item.task_due_date ? `Due ${formatDate(item.task_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">✓</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the compliance dashboard can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No compliance context",
    nextEvent: "No home loaded",
    lastRecord: "No dashboard data",
    openActions: "No actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading compliance dashboard…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading compliance view",
    nextEvent: "Checking Inspection evidence preparation",
    lastRecord: "Loading latest compliance record",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load compliance dashboard</h3>
          <p>${safeText(message || "The compliance dashboard could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Compliance unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No dashboard data",
    openActions: "Check API routes",
  });
}

function buildFallbackComplianceData(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const now = new Date();
  const plusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const minusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      home_name: homeName,
      compliance_score: 81,
      score: 81,
    },
    workforceData: {
      items: [
        {
          id: 1,
          staff_member: "Sarah Jones",
          role: "Registered Manager",
          status: "active",
          updated_at: minusDays(2),
        },
        {
          id: 2,
          staff_member: "Tom Patel",
          role: "Deputy Manager",
          status: "active",
          updated_at: minusDays(1),
        },
      ],
    },
    trainingData: {
      items: [
        {
          id: 11,
          training_name: "Safeguarding refresher",
          staff_member: "Leah Brown",
          expiry_date: plusDays(7),
          status: "due_soon",
          summary: "Refresher is due within the next week.",
        },
        {
          id: 12,
          training_name: "Medication administration",
          staff_member: "Ben Carter",
          expiry_date: minusDays(3),
          status: "expired",
          summary: "Training has expired and requires renewal.",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: 21,
          staff_member: "Ben Carter",
          supervisor: "Sarah Jones",
          next_due_date: minusDays(5),
          status: "overdue",
          summary: "Supervision is overdue.",
        },
      ],
    },
    probationData: {
      items: [
        {
          id: 31,
          staff_member: "Amina Shah",
          review_date: plusDays(4),
          status: "due_soon",
          summary: "Probation review is approaching.",
        },
      ],
    },
    inductionData: {
      items: [
        {
          id: 41,
          staff_member: "Jake Hill",
          review_date: minusDays(2),
          status: "incomplete",
          summary: "Induction actions remain incomplete.",
        },
      ],
    },
    childComplianceData: {
      items: [
        {
          id: 51,
          young_person_name: "Amira Khan",
          document_type: "PEP",
          review_date: minusDays(4),
          status: "overdue",
          summary: "PEP review is overdue.",
        },
        {
          id: 52,
          young_person_name: "Jay Smith",
          document_type: "Consent form",
          review_date: plusDays(3),
          status: "due_soon",
          summary: "Consent form review is due soon.",
        },
      ],
    },
    homeDocumentsData: {
      items: [
        {
          id: 61,
          title: "Statement of Purpose",
          document_type: "Governance",
          review_date: minusDays(6),
          status: "overdue",
          summary: "Annual review is overdue.",
        },
        {
          id: 62,
          title: "Annex A",
          document_type: "Governance",
          review_date: plusDays(5),
          status: "due_soon",
          summary: "Annex A needs reviewing shortly.",
        },
      ],
    },
    inspectionData: {
      items: [
        {
          id: 71,
          title: "Training matrix evidence",
          category: "Workforce",
          review_date: plusDays(2),
          status: "warning",
          summary: "Inspector likely to ask for refreshed evidence.",
        },
        {
          id: 72,
          title: "Missing child paperwork audit",
          category: "Children's files",
          review_date: minusDays(1),
          status: "overdue",
          summary: "Outstanding child file checks need completion.",
        },
      ],
    },
    inspectionActionsData: {
      items: [
        {
          id: 81,
          action_title: "Resolve workforce training gaps",
          action_description: "Bring overdue and expiring mandatory training back into date.",
          section_name: "Leadership and management",
          priority: "high",
          due_date: plusDays(3),
          owner_user_name: "Registered Manager",
        },
      ],
    },
    inspectionTasksData: {
      items: [
        {
          id: 91,
          task_title: "Update training matrix",
          action_title: "Resolve workforce training gaps",
          task_due_date: plusDays(2),
          assigned_user_name: "Deputy Manager",
          completed: false,
          status: "open",
        },
      ],
    },
    inspectionHeaderData: {
      items: [
        {
          home_id: homeId,
          home_name: homeName,
          overall_band: "good",
          confidence_score: 76,
          experiences_band: "good",
          helped_band: "good",
          leadership_band: "requires_improvement",
          top_concerns: "Workforce readiness and document review cycles need closer grip.",
        },
      ],
    },
    isFallback: true,
  };
}

async function tryFetchInspectionComplianceData(homeId) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) return null;

  const inspectionUiEndpoints = {
    homeHeader: `/inspection/ui/homes/${endpoints.homeId}/header`,
    actions: `/inspection/ui/homes/${endpoints.homeId}/actions`,
    tasks: `/inspection/ui/homes/${endpoints.homeId}/tasks`,
  };

  const safeGet = (url) => apiGet(url).catch(() => null);

  const [headerData, actionsData, tasksData] = await Promise.all([
    safeGet(inspectionUiEndpoints.homeHeader),
    safeGet(inspectionUiEndpoints.actions),
    safeGet(inspectionUiEndpoints.tasks),
  ]);

  const inspectionHeader = normaliseInspectionHeader(headerData || {});
  const inspectionActions = sortSoonestFirst(
    normaliseInspectionActions(actionsData || {}),
    ["due_date", "created_at", "updated_at"]
  );
  const inspectionTasks = sortSoonestFirst(
    normaliseInspectionTasks(tasksData || {}),
    ["task_due_date", "created_at", "updated_at"]
  );

  if (!inspectionHeader && !inspectionActions.length && !inspectionTasks.length) {
    return null;
  }

  return {
    inspectionHeader,
    inspectionActions,
    inspectionTasks,
  };
}

async function fetchComplianceDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/compliance`),
    safeGet(`/homes/${homeId}/team`),
    safeGet(`/homes/${homeId}/training`),
    safeGet(`/homes/${homeId}/supervisions`),
    safeGet(`/homes/${homeId}/probations`),
    safeGet(`/homes/${homeId}/inductions`),
    safeGet(`/homes/${homeId}/child-compliance`),
    safeGet(`/homes/${homeId}/documents`),
    safeGet(`/homes/${homeId}/inspection-readiness`),
  ];

  const [
    summaryData,
    workforceData,
    trainingData,
    supervisionData,
    probationData,
    inductionData,
    childComplianceData,
    homeDocumentsData,
    inspectionData,
  ] = await Promise.all(requests);

  const inspectionUiData = await tryFetchInspectionComplianceData(homeId);

  const responses = [
    summaryData,
    workforceData,
    trainingData,
    supervisionData,
    probationData,
    inductionData,
    childComplianceData,
    homeDocumentsData,
    inspectionData,
  ];

  const hasLiveSuccess =
    responses.some(hasUsableData) ||
    Boolean(inspectionUiData?.inspectionHeader) ||
    Boolean(inspectionUiData?.inspectionActions?.length) ||
    Boolean(inspectionUiData?.inspectionTasks?.length);

  if (!hasLiveSuccess) {
    const fallback = buildFallbackComplianceData(homeId);

    return {
      ...fallback,
      inspectionHeader:
        normaliseInspectionHeader(fallback.inspectionHeaderData || {}) || null,
      inspectionActions: sortSoonestFirst(
        normaliseInspectionActions(fallback.inspectionActionsData || {}),
        ["due_date", "created_at", "updated_at"]
      ),
      inspectionTasks: sortSoonestFirst(
        normaliseInspectionTasks(fallback.inspectionTasksData || {}),
        ["task_due_date", "created_at", "updated_at"]
      ),
    };
  }

  return {
    summaryData: summaryData || {},
    workforceData: workforceData || { items: [] },
    trainingData: trainingData || { items: [] },
    supervisionData: supervisionData || { items: [] },
    probationData: probationData || { items: [] },
    inductionData: inductionData || { items: [] },
    childComplianceData: childComplianceData || { items: [] },
    homeDocumentsData: homeDocumentsData || { items: [] },
    inspectionData: inspectionData || { items: [] },
    inspectionHeader: inspectionUiData?.inspectionHeader || null,
    inspectionActions: inspectionUiData?.inspectionActions || [],
    inspectionTasks: inspectionUiData?.inspectionTasks || [],
    isFallback: false,
  };
}

export async function loadCompliance() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    updateWorkspaceSummaryStrip({
      today: "No compliance context",
      nextEvent: "No home loaded",
      lastRecord: "No dashboard data",
      openActions: "No actions loaded",
    });
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      workforceData,
      trainingData,
      supervisionData,
      probationData,
      inductionData,
      childComplianceData,
      homeDocumentsData,
      inspectionData,
      inspectionHeader,
      inspectionActions,
      inspectionTasks,
      isFallback,
    } = await fetchComplianceDataset(homeId);

    const summary = normaliseComplianceSummary(summaryData);

    const workforceItems = sortNewestFirst(normaliseWorkforceItems(workforceData), [
      "updated_at",
      "created_at",
      "record_date",
    ]);

    const trainingItems = sortSoonestFirst(normaliseTrainingItems(trainingData), [
      "expiry_date",
      "review_date",
      "updated_at",
    ]);

    const supervisionItems = sortSoonestFirst(
      normaliseSupervisionItems(supervisionData),
      ["next_due_date", "due_date", "updated_at", "created_at"]
    );

    const probationItems = sortSoonestFirst(normaliseProbationItems(probationData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const inductionItems = sortSoonestFirst(normaliseInductionItems(inductionData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const childComplianceItems = sortSoonestFirst(
      normaliseChildComplianceItems(childComplianceData),
      ["review_date", "due_date", "updated_at", "created_at"]
    );

    const homeDocumentItems = sortSoonestFirst(
      normaliseDocumentItems(homeDocumentsData),
      ["review_date", "due_date", "updated_at", "created_at"]
    );

    const inspectionReadiness = sortSoonestFirst(
      normaliseInspectionReadinessItems(inspectionData),
      ["review_date", "due_date", "updated_at", "created_at"]
    ).filter((item) => isOpenAttentionStatus(item.status));

    const overdueSupervisions = supervisionItems.filter((item) =>
      isOpenAttentionStatus(item.status)
    );

    const expiringTraining = trainingItems.filter((item) =>
      isOpenAttentionStatus(item.status)
    );

    const outstandingProbations = [...probationItems, ...inductionItems].filter((item) =>
      isOpenAttentionStatus(item.status)
    );

    const overdueChildFiles = childComplianceItems.filter((item) =>
      isOpenAttentionStatus(item.status)
    );

    const overdueHomeDocs = homeDocumentItems.filter((item) =>
      isOpenAttentionStatus(item.status)
    );

    const topStats = buildTopStats({
      summary,
      overdueSupervisions,
      expiringTraining,
      outstandingProbations,
      overdueChildFiles,
      overdueHomeDocs,
      inspectionActions,
      inspectionTasks,
      inspectionHeader,
    });

    const progressCards = buildProgressCards({
      workforceItems,
      trainingItems,
      supervisionItems,
      childComplianceItems,
      homeDocumentItems,
    });

    const priorityItems = buildPriorityItems({
      overdueSupervisions,
      expiringTraining,
      outstandingProbations,
      overdueChildFiles,
      overdueHomeDocs,
      inspectionActions,
      inspectionTasks,
    });

    const homeName =
      inspectionHeader?.home_name ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId}`;

    els.viewContent.innerHTML = renderComplianceDashboardHtml({
      homeName,
      topStats,
      progressCards,
      priorityItems,
      overdueSupervisions: overdueSupervisions.slice(0, 8),
      expiringTraining: expiringTraining.slice(0, 6),
      outstandingProbations: outstandingProbations.slice(0, 6),
      overdueChildFiles: overdueChildFiles.slice(0, 8),
      overdueHomeDocs: overdueHomeDocs.slice(0, 6),
      inspectionReadiness: inspectionReadiness.slice(0, 6),
      inspectionActions: inspectionActions.slice(0, 6),
      inspectionTasks: inspectionTasks.filter((item) => !item.completed).slice(0, 6),
      inspectionHeader,
      isFallback,
    });

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${toNumber(summary.compliance_score ?? summary.score ?? inspectionHeader?.confidence_score ?? 0)}% compliant • demo preview`
        : `${toNumber(summary.compliance_score ?? summary.score ?? inspectionHeader?.confidence_score ?? 0)}% compliant`,
      nextEvent:
        inspectionActions[0]?.due_date
          ? `Inspection action due ${formatDate(inspectionActions[0].due_date)}`
          : inspectionReadiness[0]?.review_date
          ? `Inspection item due ${formatDate(inspectionReadiness[0].review_date)}`
          : inspectionReadiness[0]?.due_date
          ? `Inspection item due ${formatDate(inspectionReadiness[0].due_date)}`
          : "No urgent inspection milestone",
      lastRecord:
        inspectionHeader?.top_concerns ||
        overdueHomeDocs[0]?.title ||
        overdueChildFiles[0]?.young_person_name ||
        "Latest compliance data loaded",
      openActions: `${priorityItems.length} priority item${
        priorityItems.length === 1 ? "" : "s"
      }`,
    });
  } catch (error) {
    console.error("[compliance] load failed", error);
    renderErrorState(error?.message || "The compliance dashboard could not be loaded.");
    updateWorkspaceSummaryStrip({
      today: "Compliance unavailable",
      nextEvent: "Unable to load",
      lastRecord: "No dashboard data",
      openActions: "Check API routes",
    });
  }
}
import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { buildInspectionUiEndpoints } from "../core/config.js";

function getHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.selectedHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function getAllowedHomeIds() {
  const rawIds = Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : [];
  return rawIds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function resolveAccessibleHomeId() {
  const candidate = Number(getHomeId());
  const allowed = getAllowedHomeIds();
  const role = String(state.userRole || "").toLowerCase();
  const providerLikeRole =
    role.includes("ri") ||
    role.includes("responsible") ||
    role.includes("admin") ||
    role.includes("manager");

  if (!allowed.length) {
    return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
  }

  if (Number.isFinite(candidate) && allowed.includes(candidate)) {
    return candidate;
  }

  return providerLikeRole ? allowed[0] : null;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function buildRecordPayloadAttr(item = {}) {
  try {
    return encodeURIComponent(JSON.stringify(item));
  } catch {
    return "";
  }
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

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

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

function getStatusTone(status = "") {
  const normalised = String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (
    [
      "critical",
      "overdue",
      "high",
      "failed",
      "missing",
      "blocked",
      "weak",
      "not_ready",
      "inadequate",
      "danger",
      "requires_improvement",
      "concern",
      "gap",
      "risk",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "due_soon",
      "review_due",
      "attention",
      "in_progress",
      "partial",
      "developing",
      "awaiting",
      "requires_work",
      "medium",
      "open",
      "planned",
      "draft",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "good",
      "strong",
      "ready",
      "available",
      "reviewed",
      "complete",
      "completed",
      "active",
      "effective",
      "resolved",
      "current",
      "up_to_date",
      "compliant",
      "strength",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
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

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.evidence) && data.evidence.length > 0) return true;
  if (Array.isArray(data.gaps) && data.gaps.length > 0) return true;
  if (Array.isArray(data.actions) && data.actions.length > 0) return true;
  if (Array.isArray(data.sccif_areas) && data.sccif_areas.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.compliance) && data.compliance.length > 0) return true;
  if (Array.isArray(data.inspection_reasons) && data.inspection_reasons.length > 0)
    return true;
  if (Array.isArray(data.inspection_actions) && data.inspection_actions.length > 0)
    return true;
  if (Array.isArray(data.inspection_sections) && data.inspection_sections.length > 0)
    return true;
  if (Array.isArray(data.inspection_section_scores) && data.inspection_section_scores.length > 0)
    return true;
  if (Array.isArray(data.inspection_scores) && data.inspection_scores.length > 0)
    return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (typeof data.readiness_score !== "undefined") return true;
  if (typeof data.overall_score !== "undefined") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.dashboard || data.sccif_summary || data || {};
}

function normaliseEvidenceItems(data = {}) {
  return toArray(data.items, [data.evidence, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "sccif_evidence",
    title: item.title || item.evidence_title || item.area || "Evidence item",
    area:
      item.area ||
      item.sccif_area ||
      item.judgement_area ||
      item.section_name ||
      "Uncategorised area",
    standard: item.standard || item.quality_standard || item.sub_area || "",
    source_type: item.source_type || item.evidence_source || "",
    linked_record_type: item.linked_record_type || "",
    linked_record_id: item.linked_record_id || null,
    strength: item.strength || item.status || "recorded",
    status: item.status || item.strength || "recorded",
    summary:
      item.summary ||
      item.description ||
      item.evidence_note ||
      item.evidence_excerpt ||
      "Evidence item recorded.",
    owner_user_name: item.owner_user_name || item.owner || "",
    review_date: item.review_date || item.due_date || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseGapItems(data = {}) {
  return toArray(data.items, [data.gaps, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "sccif_gap",
    title: item.title || item.gap_title || "Evidence gap",
    area:
      item.area ||
      item.sccif_area ||
      item.judgement_area ||
      item.section_name ||
      "Uncategorised area",
    status: item.status || item.priority || "open",
    priority: item.priority || "",
    summary:
      item.summary ||
      item.description ||
      item.gap_reason ||
      item.concerns_text ||
      "Evidence gap recorded.",
    owner_user_name: item.owner_user_name || item.owner || "",
    due_date: item.due_date || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseActionItems(data = {}) {
  return toArray(data.items, [data.actions, data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "sccif_action",
    title: item.title || item.action_title || item.task || "Action",
    area:
      item.area || item.sccif_area || item.judgement_area || item.section_name || "",
    status: item.status || "open",
    priority: item.priority || "",
    summary:
      item.summary ||
      item.description ||
      item.task ||
      item.action_description ||
      "Follow-up action recorded.",
    owner_user_name:
      item.owner_user_name ||
      item.owner ||
      item.assigned_to ||
      item.assigned_user_name ||
      "",
    due_date: item.due_date || item.task_due_date || item.action_due_date || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "compliance",
    title: item.title || item.area || "Compliance item",
    area: item.area || "",
    status: item.status || "recorded",
    due_date: item.due_date || item.review_date || null,
    summary: item.summary || item.notes || "Compliance item recorded.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "document",
    title: item.title || item.document_type || "Document",
    document_type: item.document_type || "",
    area: item.area || item.sccif_area || "",
    status: item.status || "active",
    review_date: item.review_date || item.expiry_date || null,
    summary:
      item.summary ||
      item.description ||
      "Linked inspection document available.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildEvidenceFromReadiness(readinessData = {}) {
  const sections = toArray(readinessData?.inspection_section_scores, [
    readinessData?.inspection_sections,
    readinessData?.sections,
    readinessData?.items,
  ]);

  const reasons = toArray(readinessData?.inspection_reasons, [
    readinessData?.reasons,
  ]);

  const sectionEvidence = sections.map((item) => ({
    id: item.id ?? item.section_score_id ?? item.source_id ?? null,
    record_type: "sccif_evidence",
    title: item.section_name || item.title || "Inspection section evidence",
    area: item.section_name || item.section_code || "Uncategorised area",
    standard: item.section_code || "",
    source_type: "inspection_section",
    linked_record_type: item.record_type || "inspection_section_score",
    linked_record_id: item.id ?? item.section_score_id ?? null,
    strength: item.score_band || item.status || "recorded",
    status: item.score_band || item.status || "recorded",
    summary:
      item.summary_text ||
      item.strengths_text ||
      item.concerns_text ||
      item.summary ||
      "Inspection section evidence available.",
    owner_user_name: "",
    review_date: item.review_date || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));

  const reasonEvidence = reasons.map((item) => ({
    id: item.id ?? item.source_id ?? null,
    record_type: "sccif_evidence",
    title: item.title || item.line_of_enquiry_name || "Inspection evidence",
    area: item.section_name || item.section_code || "Uncategorised area",
    standard: item.reason_type || "",
    source_type: item.source_table || "inspection_reason",
    linked_record_type: item.record_type || "inspection_reason",
    linked_record_id: item.id ?? null,
    strength: item.reason_type || "recorded",
    status: item.reason_type || "recorded",
    summary:
      item.description ||
      item.evidence_excerpt ||
      item.summary ||
      "Inspection evidence available.",
    owner_user_name: "",
    review_date: item.due_date || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));

  return [...sectionEvidence, ...reasonEvidence];
}

function buildGapsFromReadiness(readinessData = {}) {
  const reasons = toArray(readinessData?.inspection_reasons, [
    readinessData?.reasons,
  ]);

  return reasons
    .filter((item) =>
      ["concern", "gap", "weakness", "risk"].includes(
        String(item.reason_type || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .map((item) => ({
      id: item.id ?? item.source_id ?? null,
      record_type: "sccif_gap",
      title: item.title || item.line_of_enquiry_name || "Evidence gap",
      area: item.section_name || item.section_code || "Uncategorised area",
      status: item.reason_type || "open",
      priority: item.priority || "",
      summary:
        item.description ||
        item.evidence_excerpt ||
        item.summary ||
        "Evidence gap identified.",
      owner_user_name: item.owner_user_name || "",
      due_date: item.due_date || null,
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    }));
}

function buildActionsFromReadiness(readinessData = {}) {
  const actions = toArray(readinessData?.inspection_actions, [
    readinessData?.actions,
    readinessData?.inspection_tasks,
    readinessData?.tasks,
  ]);

  return actions.map((item) => ({
    id: item.id ?? item.action_id ?? item.task_id ?? item.source_id ?? null,
    record_type: "sccif_action",
    title: item.action_title || item.task_title || item.title || "Action",
    area: item.section_name || item.section_code || item.area || "",
    status: item.status || (item.completed ? "completed" : "open"),
    priority: item.priority || "",
    summary:
      item.action_description ||
      item.evidence_required ||
      item.summary ||
      "Follow-up action recorded.",
    owner_user_name:
      item.owner_user_name ||
      item.owner_staff_name ||
      item.assigned_user_name ||
      "",
    due_date: item.due_date || item.task_due_date || item.action_due_date || null,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildSummaryFromReadiness(readinessData = {}) {
  const summary = readinessData?.summary || readinessData || {};
  return {
    title: summary.title || summary.home_name || summary.name || "SCCIF evidence",
    home_name: summary.home_name || "",
    readiness_score:
      summary.readiness_score ??
      summary.overall_score ??
      summary.evidence_score ??
      0,
    overall_band: summary.overall_band || "",
  };
}

function buildAreaCards({ evidenceItems = [], gapItems = [], actionItems = [] }) {
  const map = new Map();

  const ensureArea = (name) => {
    const key = name || "Uncategorised area";
    if (!map.has(key)) {
      map.set(key, {
        area: key,
        evidence: 0,
        strong: 0,
        gaps: 0,
        actions: 0,
      });
    }
    return map.get(key);
  };

  evidenceItems.forEach((item) => {
    const area = ensureArea(item.area);
    area.evidence += 1;

    if (
      ["good", "strong", "ready", "reviewed", "available", "effective"].includes(
        String(item.status || item.strength || "")
          .toLowerCase()
          .replaceAll(" ", "_")
      )
    ) {
      area.strong += 1;
    }
  });

  gapItems.forEach((item) => {
    const area = ensureArea(item.area);
    area.gaps += 1;
  });

  actionItems.forEach((item) => {
    const area = ensureArea(item.area);
    area.actions += 1;
  });

  return [...map.values()]
    .sort((a, b) => {
      const aScore = a.gaps * 3 + a.actions * 2 - a.strong;
      const bScore = b.gaps * 3 + b.actions * 2 - b.strong;
      return bScore - aScore;
    })
    .slice(0, 8);
}

function buildTopStats({ evidenceItems = [], gapItems = [], actionItems = [], areaCards = [] }) {
  const strongEvidence = evidenceItems.filter((item) =>
    ["good", "strong", "ready", "reviewed", "available", "effective"].includes(
      String(item.status || item.strength || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;

  const criticalGaps = gapItems.filter((item) =>
    ["critical", "high", "overdue", "missing", "blocked"].includes(
      String(item.priority || item.status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;

  const openActions = actionItems.filter((item) =>
    !["closed", "completed", "resolved"].includes(
      String(item.status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Evidence items",
      value: evidenceItems.length,
      note: "Mapped across SCCIF themes",
      tone: evidenceItems.length ? "success" : "muted",
    },
    {
      label: "Strong evidence",
      value: strongEvidence,
      note: "Evidence showing confidence",
      tone: strongEvidence ? "success" : "muted",
    },
    {
      label: "Evidence gaps",
      value: gapItems.length,
      note: "Areas still needing work",
      tone: gapItems.length ? "warning" : "success",
    },
    {
      label: "Critical gaps",
      value: criticalGaps,
      note: "Urgent inspection weakness",
      tone: criticalGaps ? "danger" : "success",
    },
    {
      label: "Open actions",
      value: openActions,
      note: "Linked improvement actions",
      tone: openActions ? "warning" : "success",
    },
    {
      label: "SCCIF areas",
      value: areaCards.length,
      note: "Themes currently mapped",
      tone: areaCards.length ? "success" : "muted",
    },
  ];
}

function buildProgressCards({ evidenceItems = [], gapItems = [], actionItems = [] }) {
  const strongEvidence = evidenceItems.filter((item) =>
    ["good", "strong", "ready", "reviewed", "available", "effective"].includes(
      String(item.status || item.strength || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;
  const evidencePercent = evidenceItems.length
    ? Math.round((strongEvidence / evidenceItems.length) * 100)
    : 0;

  const closedGaps = gapItems.filter((item) =>
    ["closed", "completed", "resolved"].includes(
      String(item.status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;
  const gapClosurePercent = gapItems.length
    ? Math.round((closedGaps / gapItems.length) * 100)
    : 100;

  const closedActions = actionItems.filter((item) =>
    ["closed", "completed", "resolved"].includes(
      String(item.status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;
  const actionPercent = actionItems.length
    ? Math.round((closedActions / actionItems.length) * 100)
    : 100;

  return [
    {
      label: "Evidence confidence",
      value: `${evidencePercent}%`,
      percent: evidencePercent,
      tone:
        evidencePercent >= 80 ? "success" : evidencePercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Gap closure",
      value: `${gapClosurePercent}%`,
      percent: gapClosurePercent,
      tone:
        gapClosurePercent >= 80 ? "success" : gapClosurePercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Action completion",
      value: `${actionPercent}%`,
      percent: actionPercent,
      tone:
        actionPercent >= 80 ? "success" : actionPercent >= 60 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({ gapItems = [], actionItems = [], complianceItems = [] }) {
  const items = [];

  gapItems
    .filter((item) =>
      ["critical", "high", "overdue", "missing", "blocked"].includes(
        String(item.priority || item.status || "")
          .toLowerCase()
          .replaceAll(" ", "_")
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.title || "Evidence gap",
        summary:
          item.summary ||
          (item.due_date ? `Due ${formatDate(item.due_date)}` : "Gap needs urgent work."),
      });
    });

  actionItems
    .filter((item) =>
      !["closed", "completed", "resolved"].includes(
        String(item.status || "")
          .toLowerCase()
          .replaceAll(" ", "_")
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.title || "Action",
        summary:
          item.summary ||
          (item.due_date ? `Due ${formatDate(item.due_date)}` : "Outstanding action."),
      });
    });

  complianceItems
    .filter((item) =>
      ["overdue", "missing", "review_due", "due_soon", "escalated"].includes(
        String(item.status || "")
          .toLowerCase()
          .replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Compliance issue",
        summary: item.summary || "Compliance weakness affecting readiness.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major SCCIF pressure",
      summary: "Current evidence mapping is not surfacing urgent SCCIF concerns.",
    });
  }

  return items.slice(0, 8);
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
                  class="analytics-progress-bar analytics-progress-bar--${safeText(
                    card.tone || "muted"
                  )}"
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
          const title = item?.[titleKey] || "Record";
          const summary = item?.[summaryKey] || "No summary available.";
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
                item?.due_date || item?.updated_at || item?.created_at || ""
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
        <p>No urgent SCCIF evidence issues are showing right now.</p>
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

function renderAreaCards(cards = []) {
  if (!cards.length) {
    return `
      <div class="empty-state">
        <p>No SCCIF areas mapped yet.</p>
      </div>
    `;
  }

  return `
    <div class="overview-stats-grid">
      ${cards
        .map(
          (card) => `
          <article class="overview-stat-card ${
            card.gaps > 0
              ? "overview-stat-card--warning"
              : "overview-stat-card--success"
          }">
            <span class="overview-stat-label">${safeText(card.area)}</span>
            <strong class="overview-stat-value">${safeText(card.evidence)}</strong>
            <span class="overview-stat-note">
              ${safeText(
                `${card.strong} strong • ${card.gaps} gaps • ${card.actions} actions`
              )}
            </span>
          </article>
        `
        )
        .join("")}
    </div>
  `;
}

function renderSccifEvidenceHtml({
  title = "SCCIF evidence",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  areaCards = [],
  evidenceItems = [],
  gapItems = [],
  actionItems = [],
  complianceItems = [],
  documentItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--ofsted">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">SCCIF evidence</div>
          <h2>${safeText(title)}</h2>
          <p>A mapped evidence view across SCCIF themes, strength signals, gaps, follow-up actions and linked readiness material.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live SCCIF evidence endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Evidence confidence</h3>
          <p>A quick visual read across evidence confidence, gap closure and action completion.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>SCCIF area map</h3>
              <p>The main judgement and evidence areas currently being populated.</p>
            </div>
            ${renderAreaCards(areaCards)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Evidence library</h3>
              <p>Mapped evidence entries linked to SCCIF themes and standards.</p>
            </div>

            ${renderRows(evidenceItems, {
              emptyMessage: "No SCCIF evidence items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "sccif_evidence",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.standard || "",
                  item.source_type || "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Evidence gaps</h3>
              <p>Inspection-facing evidence areas still needing work.</p>
            </div>

            ${renderRows(gapItems, {
              emptyMessage: "No SCCIF evidence gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "sccif_gap",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.owner_user_name || "",
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
              <h3>Needs attention</h3>
              <p>The most urgent SCCIF evidence weaknesses and follow-up actions.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked actions</h3>
              <p>Actions created to strengthen evidence confidence.</p>
            </div>

            ${renderRows(actionItems, {
              emptyMessage: "No SCCIF actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "sccif_action",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.owner_user_name || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked compliance</h3>
              <p>Compliance signals that may affect inspection evidence confidence.</p>
            </div>

            ${renderRows(complianceItems, {
              emptyMessage: "No linked compliance pressure found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked documents</h3>
              <p>Documents supporting inspection evidence and discussion.</p>
            </div>

            ${renderRows(documentItems, {
              emptyMessage: "No SCCIF-linked documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
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
          <div class="empty-state-icon" aria-hidden="true">▣</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before SCCIF evidence can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No SCCIF context",
    nextEvent: "No evidence milestone loaded",
    lastRecord: "No SCCIF data",
    openActions: "No SCCIF actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading SCCIF evidence…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading SCCIF view",
    nextEvent: "Checking evidence map",
    lastRecord: "Loading latest evidence signal",
    openActions: "Loading SCCIF actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load SCCIF evidence</h3>
          <p>${safeText(
            message || "The SCCIF evidence view could not be loaded."
          )}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "SCCIF unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No SCCIF data",
    openActions: "Check API routes",
  });
}

function buildFallbackData(homeId) {
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
      summary: {
        title: `${homeName} SCCIF evidence`,
        home_name: homeName,
        readiness_score: 76,
      },
    },
    evidenceData: {
      items: [
        {
          id: "ev-1",
          title: "Child voice examples in keywork",
          area: "Overall experiences and progress of children",
          standard: "Children’s experiences",
          source_type: "keywork",
          status: "strong",
          summary: "Recent keywork captures child voice and progress well.",
          updated_at: minusDays(1),
        },
        {
          id: "ev-2",
          title: "Safeguarding chronology quality",
          area: "How well children are helped and protected",
          standard: "Protection and response",
          source_type: "chronology",
          status: "review_due",
          summary: "Chronology exists but management analysis needs tightening.",
          updated_at: minusDays(2),
        },
        {
          id: "ev-3",
          title: "Reg 45 leadership analysis",
          area: "The effectiveness of leaders and managers",
          standard: "Leadership impact",
          source_type: "report",
          status: "good",
          summary: "Recent Reg 45 review shows stronger service analysis.",
          updated_at: minusDays(4),
        },
      ],
    },
    gapData: {
      items: [
        {
          id: "gap-1",
          title: "Return-home evidence not consistently linked",
          area: "How well children are helped and protected",
          priority: "high",
          status: "open",
          owner_user_name: "Sarah Jones",
          due_date: plusDays(3),
          summary:
            "Return-home interviews need clearer linkage into chronologies and management review.",
        },
        {
          id: "gap-2",
          title: "Management challenge not explicit in some audits",
          area: "The effectiveness of leaders and managers",
          priority: "critical",
          status: "overdue",
          owner_user_name: "Tom Patel",
          due_date: plusDays(1),
          summary:
            "Audit follow-through is not always showing clear management challenge and impact.",
        },
      ],
    },
    actionData: {
      items: [
        {
          id: "act-1",
          title: "Strengthen missing-from-care evidence trail",
          area: "How well children are helped and protected",
          status: "in_progress",
          owner_user_name: "Sarah Jones",
          due_date: plusDays(4),
          summary:
            "Update evidence links between incident, return-home and chronology records.",
        },
        {
          id: "act-2",
          title: "Upload audit closure evidence",
          area: "The effectiveness of leaders and managers",
          status: "open",
          owner_user_name: "Tom Patel",
          due_date: plusDays(2),
          summary:
            "Attach completed evidence and management rationale to closed audit actions.",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: "comp-1",
          title: "Training matrix refresh",
          area: "Workforce",
          status: "due_soon",
          due_date: plusDays(5),
          summary: "Two mandatory refreshers are due this week.",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          title: "Inspection evidence pack draft",
          document_type: "Inspection",
          area: "Leadership and management",
          status: "review_due",
          review_date: plusDays(2),
          summary: "Draft pack is ready for final review.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(endpoints.inspectionScores),
    safeGet(endpoints.inspectionSectionScores),
    safeGet(endpoints.inspectionScoreReasons),
    safeGet(endpoints.inspectionImprovementActions),
    safeGet(endpoints.complianceItems),
  ];

  const [
    inspectionScoresData,
    inspectionSectionScoresData,
    inspectionReasonsData,
    inspectionActionsData,
    complianceData,
  ] = await Promise.all(requests);

  const hasLiveSuccess = [
    inspectionScoresData,
    inspectionSectionScoresData,
    inspectionReasonsData,
    inspectionActionsData,
    complianceData,
  ].some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  const readinessData = {
    summary:
      normaliseSummary(inspectionScoresData).summary ||
      normaliseSummary(inspectionScoresData),
    inspection_section_scores: toArray(inspectionSectionScoresData?.inspection_section_scores, [
      inspectionSectionScoresData?.items,
      inspectionSectionScoresData?.records,
    ]),
    inspection_reasons: toArray(inspectionReasonsData?.inspection_score_reasons, [
      inspectionReasonsData?.inspection_reasons,
      inspectionReasonsData?.items,
      inspectionReasonsData?.records,
    ]),
    inspection_actions: toArray(
      inspectionActionsData?.inspection_improvement_actions,
      [inspectionActionsData?.inspection_actions, inspectionActionsData?.items, inspectionActionsData?.records]
    ),
  };

  return {
    summaryData: buildSummaryFromReadiness(readinessData),
    evidenceData: { items: buildEvidenceFromReadiness(readinessData) },
    gapData: { items: buildGapsFromReadiness(readinessData) },
    actionData: { items: buildActionsFromReadiness(readinessData) },
    complianceData: complianceData || { items: [] },
    documentData: { items: [] },
    isFallback: false,
  };
}

export async function loadSccifEvidence() {
  if (!els.viewContent) return;

  const homeId = resolveAccessibleHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      evidenceData,
      gapData,
      actionData,
      complianceData,
      documentData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary =
      typeof summaryData === "object" && !Array.isArray(summaryData)
        ? summaryData
        : normaliseSummary(summaryData);

    const evidenceItems = sortNewestFirst(normaliseEvidenceItems(evidenceData), [
      "updated_at",
      "created_at",
    ]).slice(0, 10);

    const gapItems = sortSoonestFirst(normaliseGapItems(gapData), [
      "due_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const actionItems = sortSoonestFirst(normaliseActionItems(actionData), [
      "due_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const complianceItems = sortSoonestFirst(
      normaliseComplianceItems(complianceData),
      ["due_date", "updated_at", "created_at"]
    )
      .filter((item) =>
        ["overdue", "missing", "review_due", "due_soon", "escalated"].includes(
          String(item.status || "")
            .toLowerCase()
            .replaceAll(" ", "_")
        )
      )
      .slice(0, 6);

    const documentItems = sortSoonestFirst(
      normaliseDocumentItems(documentData),
      ["review_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const areaCards = buildAreaCards({
      evidenceItems,
      gapItems,
      actionItems,
    });

    const topStats = buildTopStats({
      evidenceItems,
      gapItems,
      actionItems,
      areaCards,
    });

    const progressCards = buildProgressCards({
      evidenceItems,
      gapItems,
      actionItems,
    });

    const priorityItems = buildPriorityItems({
      gapItems,
      actionItems,
      complianceItems,
    });

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} SCCIF evidence`;

    els.viewContent.innerHTML = renderSccifEvidenceHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      areaCards,
      evidenceItems,
      gapItems,
      actionItems,
      complianceItems,
      documentItems,
      isFallback,
    });

    const nextGap = gapItems[0];
    const latestEvidence = evidenceItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${evidenceItems.length} evidence • ${gapItems.length} gaps • preview mode`
        : `${evidenceItems.length} evidence • ${gapItems.length} gaps`,
      nextEvent: nextGap?.due_date
        ? `Gap due ${formatDate(nextGap.due_date)}`
        : "No urgent SCCIF milestone",
      lastRecord: latestEvidence?.updated_at
        ? `Latest evidence ${formatDateTime(latestEvidence.updated_at)}`
        : isFallback
        ? "Preview SCCIF data loaded"
        : "No recent SCCIF evidence loaded",
      openActions: `${actionItems.length} actions • ${complianceItems.length} linked compliance`,
    });
  } catch (error) {
    console.error("[sccif-evidence] load failed", error);
    renderErrorState(
      error?.message || "The SCCIF evidence view could not be loaded."
    );
  }
}
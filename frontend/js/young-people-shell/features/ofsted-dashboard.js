import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { buildInspectionUiEndpoints } from "../core/config.js";

function getHomeId() {
  const selected =
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.selectedHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null;

  const selectedNum = Number(selected);
  const allowed = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (!allowed.length) {
    return Number.isFinite(selectedNum) && selectedNum > 0 ? selectedNum : null;
  }

  if (
    Number.isFinite(selectedNum) &&
    selectedNum > 0 &&
    allowed.includes(selectedNum)
  ) {
    return selectedNum;
  }

  return allowed[0] || null;
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
      "danger",
      "escalated",
      "missing",
      "not_ready",
      "inadequate",
      "weak",
      "unavailable",
      "blocked",
      "incomplete",
      "requires_improvement",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "due_soon",
      "pending",
      "attention",
      "review_due",
      "in_progress",
      "partial",
      "developing",
      "awaiting",
      "draft",
      "open",
      "planned",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "good",
      "strong",
      "ready",
      "complete",
      "completed",
      "resolved",
      "active",
      "available",
      "stable",
      "effective",
      "current",
      "up_to_date",
      "compliant",
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
  if (Array.isArray(data.judgements) && data.judgements.length > 0) return true;
  if (Array.isArray(data.evidence) && data.evidence.length > 0) return true;
  if (Array.isArray(data.gaps) && data.gaps.length > 0) return true;
  if (Array.isArray(data.actions) && data.actions.length > 0) return true;
  if (Array.isArray(data.compliance) && data.compliance.length > 0) return true;
  if (Array.isArray(data.audits) && data.audits.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (typeof data.readiness_score !== "undefined") return true;
  if (typeof data.evidence_score !== "undefined") return true;
  if (typeof data.overall_score !== "undefined") return true;
  return false;
}

function ofstedVisibilityPath(homeId) {
  if (homeId) {
    return `/visibility/ofsted?home_id=${encodeURIComponent(
      homeId
    )}&all_accessible_homes=false`;
  }
  return "/visibility/ofsted?all_accessible_homes=true";
}

function normaliseSummary(data = {}) {
  return data.summary || data.dashboard || data.ofsted_summary || data || {};
}

function normaliseJudgementItems(data = {}) {
  return toArray(data.items, [data.judgements, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "ofsted_judgement",
    title: item.title || item.area || item.judgement_area || "Judgement area",
    area: item.area || item.judgement_area || item.title || "Area",
    status: item.status || item.grade || "recorded",
    strength_summary:
      item.strength_summary ||
      item.strengths ||
      item.summary ||
      item.narrative_summary ||
      "Evidence summary available.",
    evidence_count: toNumber(item.evidence_count, 0),
    gap_count: toNumber(item.gap_count, 0),
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseEvidenceItems(data = {}) {
  return toArray(data.items, [data.evidence, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "inspection_evidence",
    title: item.title || item.evidence_title || item.area || "Evidence item",
    area: item.area || item.sccif_area || item.section_name || "",
    status: item.status || "recorded",
    summary:
      item.summary ||
      item.description ||
      item.evidence_note ||
      item.concerns_text ||
      item.strengths_text ||
      "Evidence item recorded.",
    source_type: item.source_type || item.evidence_source || "",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseGapItems(data = {}) {
  return toArray(data.items, [data.gaps, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "inspection_gap",
    title: item.title || item.gap_title || item.area || "Evidence gap",
    area: item.area || item.sccif_area || item.section_name || "",
    status: item.status || item.priority || "open",
    priority: item.priority || "",
    due_date: item.due_date || null,
    owner_user_name: item.owner_user_name || item.owner || "",
    summary:
      item.summary ||
      item.description ||
      item.gap_reason ||
      item.concerns_text ||
      "Inspection gap recorded.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseActionItems(data = {}) {
  return toArray(data.items, [data.actions, data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "inspection_action",
    title: item.title || item.action_title || item.task || "Inspection action",
    status: item.status || "open",
    priority: item.priority || "",
    due_date: item.due_date || item.task_due_date || null,
    owner_user_name:
      item.owner_user_name || item.assigned_to || item.owner || item.assigned_user_name || "",
    summary:
      item.summary ||
      item.description ||
      item.task ||
      item.action_description ||
      "Inspection action recorded.",
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

function normaliseAuditItems(data = {}) {
  return toArray(data.items, [data.audits, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "audit",
    title: item.title || item.audit_name || "Audit",
    audit_name: item.audit_name || item.title || "Audit",
    status: item.status || "recorded",
    audit_date: item.audit_date || item.review_date || item.created_at || null,
    summary:
      item.summary ||
      item.finding ||
      item.notes ||
      item.outcome ||
      "Audit record available.",
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
    status: item.status || "active",
    review_date: item.review_date || item.expiry_date || null,
    summary:
      item.summary ||
      item.description ||
      "Inspection-linked document available.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildJudgementsFromReadiness(readinessData = {}) {
  const summary = readinessData?.summary || readinessData || {};
  const sections = toArray(readinessData?.items, [
    readinessData?.inspection_section_scores,
    readinessData?.sections,
    readinessData?.inspection_sections,
    readinessData?.records,
  ]);

  if (!sections.length) return [];

  return sections.map((item) => ({
    id: item.id ?? item.section_score_id ?? item.source_id ?? null,
    record_type: "ofsted_judgement",
    title: item.title || item.section_name || item.section_code || "Judgement area",
    area: item.section_name || item.section_code || item.title || "Area",
    status: item.score_band || item.status || summary.overall_band || "recorded",
    strength_summary:
      item.summary_text ||
      item.strengths_text ||
      item.concerns_text ||
      item.summary ||
      "Inspection section evidence available.",
    evidence_count: toNumber(item.evidence_count, 0),
    gap_count: toNumber(item.gap_count, 0),
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildEvidenceFromReadiness(readinessData = {}) {
  const reasons = toArray(readinessData?.inspection_reasons, [
    readinessData?.reasons,
    readinessData?.items,
  ]);

  return reasons.map((item) => ({
    id: item.id ?? item.source_id ?? null,
    record_type: "inspection_evidence",
    title: item.title || item.line_of_enquiry_name || "Evidence item",
    area: item.section_name || item.section_code || "",
    status: item.reason_type || "recorded",
    summary:
      item.description ||
      item.evidence_excerpt ||
      item.summary ||
      "Inspection evidence available.",
    source_type: item.source_table || "",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildGapsFromReadiness(readinessData = {}) {
  const reasons = toArray(readinessData?.inspection_reasons, [
    readinessData?.reasons,
    readinessData?.items,
  ]);

  return reasons
    .filter((item) =>
      ["concern", "gap", "weakness", "risk"].includes(
        String(item.reason_type || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .map((item) => ({
      id: item.id ?? item.source_id ?? null,
      record_type: "inspection_gap",
      title: item.title || item.line_of_enquiry_name || "Evidence gap",
      area: item.section_name || item.section_code || "",
      status: item.reason_type || "open",
      priority: item.priority || "",
      due_date: item.due_date || null,
      owner_user_name: item.owner_user_name || "",
      summary:
        item.description ||
        item.evidence_excerpt ||
        item.summary ||
        "Inspection gap identified.",
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
    record_type: "inspection_action",
    title:
      item.action_title ||
      item.task_title ||
      item.title ||
      "Inspection action",
    status: item.status || (item.completed ? "completed" : "open"),
    priority: item.priority || "",
    due_date: item.due_date || item.task_due_date || item.action_due_date || null,
    owner_user_name:
      item.owner_user_name ||
      item.owner_staff_name ||
      item.assigned_user_name ||
      "",
    summary:
      item.action_description ||
      item.evidence_required ||
      item.summary ||
      "Inspection action recorded.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildSummaryFromReadiness(readinessData = {}) {
  const summary = readinessData?.summary || readinessData || {};
  return {
    title:
      summary.title ||
      summary.home_name ||
      summary.name ||
      "Ofsted dashboard",
    home_name: summary.home_name || "",
    readiness_score:
      summary.readiness_score ??
      summary.overall_score ??
      summary.evidence_score ??
      0,
    evidence_score:
      summary.evidence_score ??
      summary.confidence_score ??
      summary.readiness_score ??
      0,
    overall_band: summary.overall_band || "",
    narrative_summary:
      summary.narrative_summary ||
      summary.summary_text ||
      summary.concerns_summary ||
      "",
  };
}

function buildTopStats({
  summary = {},
  gaps = [],
  actions = [],
  evidence = [],
  compliance = [],
  judgements = [],
}) {
  const readinessScore = toNumber(
    summary.readiness_score ?? summary.evidence_score ?? 0,
    0
  );

  const criticalGaps = gaps.filter((item) =>
    ["critical", "high", "overdue", "escalated", "missing"].includes(
      String(item.priority || item.status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;

  const openActions = actions.filter((item) =>
    !["completed", "resolved", "closed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const overdueCompliance = compliance.filter((item) =>
    ["overdue", "missing", "review_due", "due_soon", "escalated"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const strongJudgements = judgements.filter((item) =>
    ["good", "strong", "ready", "effective"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Readiness score",
      value: `${readinessScore}%`,
      note: "Inspection-facing readiness position",
      tone:
        readinessScore >= 85 ? "success" : readinessScore >= 70 ? "warning" : "danger",
    },
    {
      label: "Evidence items",
      value: evidence.length,
      note: "Mapped inspection evidence",
      tone: evidence.length ? "success" : "muted",
    },
    {
      label: "Critical gaps",
      value: criticalGaps,
      note: "Weak or missing evidence",
      tone: criticalGaps ? "danger" : "success",
    },
    {
      label: "Open actions",
      value: openActions,
      note: "Inspection actions still live",
      tone: openActions ? "warning" : "success",
    },
    {
      label: "Compliance pressure",
      value: overdueCompliance,
      note: "Overdue or weak compliance",
      tone: overdueCompliance ? "warning" : "success",
    },
    {
      label: "Strong areas",
      value: strongJudgements,
      note: "Judgement areas showing strength",
      tone: strongJudgements ? "success" : "muted",
    },
  ];
}

function buildProgressCards({
  evidence = [],
  gaps = [],
  actions = [],
  judgements = [],
}) {
  const strongEvidence = evidence.filter((item) =>
    ["good", "strong", "ready", "reviewed", "available"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const evidencePercent = evidence.length
    ? Math.round((strongEvidence / evidence.length) * 100)
    : 0;

  const closedGaps = gaps.filter((item) =>
    ["resolved", "closed", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const gapClosurePercent = gaps.length
    ? Math.round((closedGaps / gaps.length) * 100)
    : 100;

  const closedActions = actions.filter((item) =>
    ["resolved", "closed", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const actionPercent = actions.length
    ? Math.round((closedActions / actions.length) * 100)
    : 100;

  const positiveJudgements = judgements.filter((item) =>
    ["good", "strong", "ready", "effective"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const judgementPercent = judgements.length
    ? Math.round((positiveJudgements / judgements.length) * 100)
    : 0;

  return [
    {
      label: "Evidence confidence",
      value: `${evidencePercent}%`,
      percent: evidencePercent,
      tone:
        evidencePercent >= 85 ? "success" : evidencePercent >= 65 ? "warning" : "danger",
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
    {
      label: "Judgement strength",
      value: `${judgementPercent}%`,
      percent: judgementPercent,
      tone:
        judgementPercent >= 75 ? "success" : judgementPercent >= 50 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({ gaps = [], actions = [], compliance = [] }) {
  const items = [];

  gaps
    .filter((item) =>
      ["critical", "high", "overdue", "escalated", "missing"].includes(
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
          (item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : "Needs inspection attention."),
      });
    });

  actions
    .filter((item) =>
      !["completed", "resolved", "closed"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.title || "Inspection action",
        summary:
          item.summary ||
          (item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : "Outstanding action."),
      });
    });

  compliance
    .filter((item) =>
      ["overdue", "missing", "review_due", "due_soon", "escalated"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Compliance issue",
        summary:
          item.summary ||
          (item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : "Compliance pressure recorded."),
      });
    });

  if (!items.length) {
    items.push({
      title: "No major inspection pressure",
      summary:
        "The dashboard is not currently surfacing urgent inspection-facing gaps.",
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
          const title = item?.[titleKey] || item?.title || "Record";
          const summary = item?.[summaryKey] || item?.summary || "No summary available.";
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
        <p>No urgent inspection issues are showing right now.</p>
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

function renderVisibilitySignals(signals = []) {
  if (!signals.length) {
    return `
      <div class="empty-state">
        <p>No urgent inspection visibility alerts are active right now.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${signals
        .slice(0, 6)
        .map(
          (signal) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  signal.title || "Inspection visibility signal"
                )}</div>
                <div class="record-row-summary">${safeText(
                  signal.description ||
                    "Inspection signal requires follow-through."
                )}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(
                  getStatusTone(signal.severity || "medium")
                )}">
                  ${safeText(signal.count ?? 0)}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInsightStory(story = "") {
  const text = String(story || "").trim();
  if (!text) {
    return `
      <div class="empty-state">
        <p>No inspection narrative is available yet.</p>
      </div>
    `;
  }
  return `<p class="record-row-summary">${safeText(text)}</p>`;
}

function renderTrendRows(trends = []) {
  if (!trends.length) {
    return `
      <div class="empty-state">
        <p>No inspection trend movement is available yet.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${trends
        .slice(0, 4)
        .map((item) => {
          const delta = toNumber(item?.delta, 0);
          const sign = delta > 0 ? "+" : "";
          const tone =
            String(item?.assessment || "") === "declining"
              ? "danger"
              : String(item?.assessment || "") === "improving"
              ? "success"
              : "muted";
          return `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  item?.label || "Trend"
                )}</div>
                <div class="record-row-summary">
                  ${safeText(item?.assessment || "stable")} • ${safeText(
                    item?.current ?? 0
                  )} now vs
                  ${safeText(item?.previous ?? 0)} before
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${tone}">${safeText(
                  `${sign}${delta}`
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPatternRows(patterns = []) {
  if (!patterns.length) {
    return `
      <div class="empty-state">
        <p>No repeated inspection-risk patterns have crossed threshold yet.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${patterns
        .slice(0, 5)
        .map(
          (item) => `
          <article class="record-row">
            <div class="record-row-main">
              <div class="record-row-title">${safeText(
                item?.title || "Pattern"
              )}</div>
              <div class="record-row-summary">${safeText(
                item?.evidence || ""
              )}</div>
              <div class="record-row-meta">
                <span>${safeText(
                  `${toNumber(item?.frequency, 0)} in ${toNumber(
                    item?.period_days,
                    0
                  )} days`
                )}</span>
              </div>
            </div>
            <div class="record-row-side">
              <span class="row-pill ${safeText(
                getStatusTone(item?.severity || "medium")
              )}">
                ${safeText(item?.severity || "medium")}
              </span>
            </div>
          </article>
        `
        )
        .join("")}
    </div>
  `;
}

function renderDecisionRows(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No decision-support prompts are available yet.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .slice(0, 3)
        .map(
          (item) => `
          <article class="record-row">
            <div class="record-row-main">
              <div class="record-row-title">${safeText(
                item?.question || "Decision prompt"
              )}</div>
              <div class="record-row-summary">${safeText(
                item?.evidence || ""
              )}</div>
              <div class="record-row-meta">${safeText(
                item?.suggested_action || ""
              )}</div>
            </div>
            <div class="record-row-side">
              <span class="row-pill ${safeText(
                getStatusTone(item?.severity || "medium")
              )}">
                ${safeText(item?.severity || "medium")}
              </span>
            </div>
          </article>
        `
        )
        .join("")}
    </div>
  `;
}

function renderJudgementSupportRows(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No generated judgement support is available yet.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .slice(0, 3)
        .map(
          (item) => `
          <article class="record-row">
            <div class="record-row-main">
              <div class="record-row-title">${safeText(
                item?.title || "Judgement support"
              )}</div>
              <div class="record-row-summary">${safeText(
                item?.evidence || ""
              )}</div>
              <div class="record-row-meta">${safeText(
                item?.suggested_action || ""
              )}</div>
            </div>
            <div class="record-row-side">
              <span class="row-pill ${safeText(
                getStatusTone(item?.severity || "medium")
              )}">
                ${safeText(item?.severity || "medium")}
              </span>
            </div>
          </article>
        `
        )
        .join("")}
    </div>
  `;
}

function renderMissingRows(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No missing inspection evidence warnings are currently highlighted.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 5)
        .map(
          (text) => `
            <article class="priority-item">
              <p>${safeText(text)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOfstedDashboardHtml({
  title = "Ofsted dashboard",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  judgementItems = [],
  gapItems = [],
  actionItems = [],
  evidenceItems = [],
  complianceItems = [],
  auditItems = [],
  documentItems = [],
  visibilitySignals = [],
  insightStory = "",
  changing = [],
  patterns = [],
  decisionSupport = [],
  judgementSupport = [],
  missingItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--ofsted">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Ofsted</div>
          <h2>${safeText(title)}</h2>
          <p>A dedicated inspection-facing dashboard across judgement areas, evidence confidence, gaps, actions and inspection readiness.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live Ofsted endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Inspection snapshot</h3>
          <p>A quick visual read across evidence confidence, gap closure, action completion and judgement strength.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Judgement areas</h3>
              <p>Inspection-facing judgement themes and how strong the evidence currently looks.</p>
            </div>

            ${renderRows(judgementItems, {
              emptyMessage: "No judgement areas found.",
              titleKey: "area",
              summaryKey: "strength_summary",
              recordType: "ofsted_judgement",
              metaBuilder: (item) =>
                [
                  `${toNumber(item.evidence_count)} evidence`,
                  `${toNumber(item.gap_count)} gaps`,
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Evidence gaps</h3>
              <p>Gaps likely to matter most during inspection preparation or live inspection activity.</p>
            </div>

            ${renderRows(gapItems, {
              emptyMessage: "No inspection gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_gap",
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

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open inspection actions</h3>
              <p>Leadership and service actions linked to evidence strength and readiness.</p>
            </div>

            ${renderRows(actionItems, {
              emptyMessage: "No inspection actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_action",
              metaBuilder: (item) =>
                [
                  item.owner_user_name || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Evidence library</h3>
              <p>Recent evidence items mapped to inspection themes and areas.</p>
            </div>

            ${renderRows(evidenceItems, {
              emptyMessage: "No inspection evidence found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_evidence",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.source_type || "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Story right now</h3>
              <p>Current inspection narrative from trends and repeated themes.</p>
            </div>

            ${renderInsightStory(insightStory)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>What is changing</h3>
              <p>Direction of key inspection readiness indicators.</p>
            </div>

            ${renderTrendRows(changing)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Repeating patterns</h3>
              <p>Explainable recurring issues from evidence and action data.</p>
            </div>

            ${renderPatternRows(patterns)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Decision support</h3>
              <p>Evidence-backed prompts for inspection preparation decisions.</p>
            </div>

            ${renderDecisionRows(decisionSupport)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Generated judgement support</h3>
              <p>Auto-generated, evidence-linked support points for likely judgement lines.</p>
            </div>

            ${renderJudgementSupportRows(judgementSupport)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent inspection-facing issues across the service.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Inspection visibility alerts</h3>
              <p>Calm, prioritised signals for evidence gaps and likely inspector concerns.</p>
            </div>

            ${renderVisibilitySignals(visibilitySignals)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>What is missing</h3>
              <p>Gaps likely to weaken readiness if left open.</p>
            </div>

            ${renderMissingRows(missingItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Compliance pressure</h3>
              <p>Compliance items that could weaken inspection confidence.</p>
            </div>

            ${renderRows(complianceItems, {
              emptyMessage: "No inspection-linked compliance issues found.",
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
              <h3>Audit signals</h3>
              <p>Recent audit findings that support or weaken inspection readiness.</p>
            </div>

            ${renderRows(auditItems, {
              emptyMessage: "No audit records found.",
              titleKey: "audit_name",
              summaryKey: "summary",
              recordType: "audit",
              metaBuilder: (item) =>
                [
                  item.audit_date ? formatDate(item.audit_date) : "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Key documents</h3>
              <p>Documents likely to be relied on during evidence collation or inspection discussion.</p>
            </div>

            ${renderRows(documentItems, {
              emptyMessage: "No inspection-linked documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
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
          <p>A home ID is needed before the Ofsted dashboard can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No Ofsted context",
    nextEvent: "No inspection milestone loaded",
    lastRecord: "No inspection data",
    openActions: "No inspection actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading Ofsted dashboard…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading Ofsted view",
    nextEvent: "Checking readiness",
    lastRecord: "Loading latest inspection signal",
    openActions: "Loading inspection actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load Ofsted dashboard</h3>
          <p>${safeText(
            message || "The Ofsted dashboard could not be loaded."
          )}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Ofsted unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No inspection data",
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
        title: `${homeName} Ofsted dashboard`,
        home_name: homeName,
        readiness_score: 78,
        evidence_score: 78,
      },
    },
    judgementData: {
      items: [
        {
          id: "judge-1",
          area: "Overall experiences and progress of children",
          status: "good",
          strength_summary:
            "Good day-to-day care evidence, strong routines and consistent relationship-based practice.",
          evidence_count: 18,
          gap_count: 2,
          updated_at: minusDays(1),
        },
        {
          id: "judge-2",
          area: "How well children are helped and protected",
          status: "warning",
          strength_summary:
            "Safeguarding systems are sound, but return-home and chronologies need tightening.",
          evidence_count: 13,
          gap_count: 4,
          updated_at: minusDays(1),
        },
        {
          id: "judge-3",
          area: "The effectiveness of leaders and managers",
          status: "requires_improvement",
          strength_summary:
            "Good grip in places, but audit follow-through and action closure need to be more consistent.",
          evidence_count: 11,
          gap_count: 5,
          updated_at: minusDays(2),
        },
      ],
    },
    evidenceData: {
      items: [
        {
          id: "ev-1",
          title: "Monthly quality review",
          area: "Leadership and management",
          source_type: "report",
          status: "available",
          summary:
            "Latest monthly review links incidents, staffing and audit themes clearly.",
          updated_at: minusDays(2),
        },
        {
          id: "ev-2",
          title: "Direct-work examples",
          area: "Experiences and progress",
          source_type: "child records",
          status: "good",
          summary:
            "Examples show meaningful keywork, child voice and progress capture.",
          updated_at: minusDays(1),
        },
        {
          id: "ev-3",
          title: "Safeguarding chronology sample",
          area: "Help and protection",
          source_type: "chronology",
          status: "review_due",
          summary:
            "Good chronology exists but cross-referencing could be stronger.",
          updated_at: minusDays(1),
        },
      ],
    },
    gapData: {
      items: [
        {
          id: "gap-1",
          title: "Return-home interview evidence not consistently linked",
          area: "Help and protection",
          priority: "high",
          status: "open",
          due_date: plusDays(3),
          owner_user_name: "Sarah Jones",
          summary:
            "Recent missing episodes need stronger return-home evidence and management analysis.",
        },
        {
          id: "gap-2",
          title: "Audit actions not all closed with evidence",
          area: "Leadership and management",
          priority: "critical",
          status: "overdue",
          due_date: plusDays(1),
          owner_user_name: "Sarah Jones",
          summary:
            "Some completed actions still lack uploaded evidence and closure rationale.",
        },
      ],
    },
    actionData: {
      items: [
        {
          id: "act-1",
          title: "Complete inspection evidence gap tracker",
          status: "open",
          due_date: plusDays(2),
          owner_user_name: "Sarah Jones",
          summary:
            "Finish outstanding evidence tracker entries across SCCIF themes.",
        },
        {
          id: "act-2",
          title: "Update leadership impact narrative",
          status: "in_progress",
          due_date: plusDays(4),
          owner_user_name: "Tom Patel",
          summary:
            "Strengthen narrative around management oversight, review and challenge.",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: "comp-1",
          title: "Statement of Purpose review",
          area: "Governance",
          status: "due_soon",
          due_date: plusDays(5),
          summary: "Statement of Purpose review due shortly.",
        },
        {
          id: "comp-2",
          title: "Training matrix assurance",
          area: "Workforce",
          status: "overdue",
          due_date: minusDays(2),
          summary: "Two mandatory workforce refreshers remain overdue.",
        },
      ],
    },
    auditData: {
      items: [
        {
          id: "audit-1",
          audit_name: "File audit",
          status: "completed",
          audit_date: minusDays(6),
          summary:
            "Overall standard good, but management signatures were inconsistent.",
        },
        {
          id: "audit-2",
          audit_name: "Missing-from-care audit",
          status: "review_due",
          audit_date: plusDays(2),
          summary:
            "Sample shows good immediate response but weak return-home linkage.",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          title: "Regulation 45 review",
          document_type: "Governance",
          status: "active",
          review_date: plusDays(14),
          summary: "Latest quality of care review available.",
        },
        {
          id: "doc-2",
          title: "Inspection evidence pack draft",
          document_type: "Inspection",
          status: "review_due",
          review_date: plusDays(2),
          summary: "Draft evidence pack needs final sign-off.",
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
    safeGet(endpoints.readiness),
    safeGet(endpoints.quality),
    safeGet(endpoints.compliance),
    safeGet(endpoints.documents),
    safeGet(endpoints.audits),
    safeGet(endpoints.dashboard),
  ];

  const [
    readinessData,
    qualityData,
    complianceData,
    documentData,
    auditData,
    dashboardData,
  ] = await Promise.all(requests);

  const hasLiveSuccess = [
    readinessData,
    qualityData,
    complianceData,
    documentData,
    auditData,
    dashboardData,
  ].some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  const summaryData =
    readinessData && hasUsableData(readinessData)
      ? buildSummaryFromReadiness(readinessData)
      : normaliseSummary(qualityData || dashboardData || {});

  const judgementItems =
    normaliseJudgementItems(qualityData || {}).length
      ? normaliseJudgementItems(qualityData || {})
      : buildJudgementsFromReadiness(readinessData || {});

  const evidenceItems =
    normaliseEvidenceItems(qualityData || {}).length
      ? normaliseEvidenceItems(qualityData || {})
      : buildEvidenceFromReadiness(readinessData || {});

  const gapItems =
    normaliseGapItems(qualityData || {}).length
      ? normaliseGapItems(qualityData || {})
      : buildGapsFromReadiness(readinessData || {});

  const actionItems =
    normaliseActionItems(qualityData || {}).length
      ? normaliseActionItems(qualityData || {})
      : buildActionsFromReadiness(readinessData || {});

  return {
    summaryData,
    judgementData: { items: judgementItems },
    evidenceData: { items: evidenceItems },
    gapData: { items: gapItems },
    actionData: { items: actionItems },
    complianceData: complianceData || { items: [] },
    auditData: auditData || { items: [] },
    documentData: documentData || { items: [] },
    isFallback: false,
  };
}

async function fetchVisibility(homeId) {
  const path = ofstedVisibilityPath(homeId);
  try {
    return (await apiGet(path)) || {};
  } catch {
    return {};
  }
}

export async function loadOfstedDashboard() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const [
      {
        summaryData,
        evidenceData,
        judgementData,
        gapData,
        actionData,
        complianceData,
        auditData,
        documentData,
        isFallback,
      },
      visibility,
    ] = await Promise.all([fetchDataset(homeId), fetchVisibility(homeId)]);

    const summary =
      typeof summaryData === "object" && !Array.isArray(summaryData)
        ? summaryData
        : normaliseSummary(summaryData);

    const judgementItems = sortNewestFirst(
      normaliseJudgementItems(judgementData),
      ["updated_at", "created_at"]
    ).slice(0, 8);

    const evidenceItems = sortNewestFirst(
      normaliseEvidenceItems(evidenceData),
      ["updated_at", "created_at"]
    ).slice(0, 8);

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
          String(item.status || "").toLowerCase().replaceAll(" ", "_")
        )
      )
      .slice(0, 6);

    const auditItems = sortNewestFirst(normaliseAuditItems(auditData), [
      "audit_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const documentItems = sortSoonestFirst(
      normaliseDocumentItems(documentData),
      ["review_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const topStats = buildTopStats({
      summary,
      gaps: gapItems,
      actions: actionItems,
      evidence: evidenceItems,
      compliance: complianceItems,
      judgements: judgementItems,
    });

    const progressCards = buildProgressCards({
      evidence: evidenceItems,
      gaps: gapItems,
      actions: actionItems,
      judgements: judgementItems,
    });

    const priorityItems = buildPriorityItems({
      gaps: gapItems,
      actions: actionItems,
      compliance: complianceItems,
    });

    const changing = toArray(
      visibility?.what_is_changing || visibility?.trends
    ).slice(0, 4);
    const patterns = toArray(visibility?.patterns).slice(0, 6);
    const decisionSupport = toArray(visibility?.decision_support).slice(0, 4);
    const judgementSupport = toArray(visibility?.ofsted_judgement_support).slice(
      0,
      3
    );
    const missingItems = toArray(visibility?.what_is_missing).slice(0, 6);

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} Ofsted dashboard`;

    els.viewContent.innerHTML = renderOfstedDashboardHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      judgementItems,
      gapItems,
      actionItems,
      evidenceItems,
      complianceItems,
      auditItems,
      documentItems,
      visibilitySignals: toArray(visibility?.signals).slice(0, 6),
      insightStory:
        visibility?.insight_story || summary.narrative_summary || "",
      changing,
      patterns,
      decisionSupport,
      judgementSupport,
      missingItems,
      isFallback,
    });

    const nextGap = gapItems[0];
    const latestSignal =
      evidenceItems[0]?.updated_at ||
      judgementItems[0]?.updated_at ||
      auditItems[0]?.audit_date ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${evidenceItems.length} evidence • ${gapItems.length} gaps • preview mode`
        : `${evidenceItems.length} evidence • ${gapItems.length} gaps`,
      nextEvent: nextGap?.due_date
        ? `Gap due ${formatDate(nextGap.due_date)}`
        : "No urgent inspection milestone",
      lastRecord: latestSignal
        ? `Latest inspection signal ${formatDateTime(latestSignal)}`
        : isFallback
        ? "Preview Ofsted data loaded"
        : "No recent inspection signal loaded",
      openActions: `${actionItems.length} actions • ${complianceItems.length} compliance pressure`,
      pressure: toArray(visibility?.queues?.urgent).length
        ? `${toArray(visibility?.queues?.urgent).length} inspector alerts`
        : toNumber(visibility?.pressures?.total, 0)
        ? `${toNumber(visibility?.pressures?.total, 0)} pressure score`
        : "No active alerts",
    });
  } catch (error) {
    console.error("[ofsted-dashboard] load failed", error);
    renderErrorState(
      error?.message || "The Ofsted dashboard could not be loaded."
    );
  }
}
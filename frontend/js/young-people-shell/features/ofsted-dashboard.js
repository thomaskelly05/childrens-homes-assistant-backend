// IMPORTANT FIXES IN THIS VERSION:
// 1. Adds missing toBool() helper.
// 2. Improves Ofsted presentation into dashboard cards.
// 3. Reduces plain-text feel.
// 4. Keeps existing endpoint logic and fallback preview mode.
// 5. Keeps record-opening data attributes.

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

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalised = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "required"].includes(normalised);
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

function normaliseStatus(value = "") {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
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
  const normalised = normaliseStatus(status);

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
      "good",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "strong",
      "ready",
      "complete",
      "completed",
      "resolved",
      "closed",
      "active",
      "available",
      "stable",
      "effective",
      "current",
      "up_to_date",
      "compliant",
      "outstanding",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function getToneLabel(tone = "muted") {
  if (tone === "danger") return "Needs action";
  if (tone === "warning") return "Monitor";
  if (tone === "success") return "Assured";
  return "Recorded";
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

    const aTime = toTime(aValue) || Number.MAX_SAFE_INTEGER;
    const bTime = toTime(bValue) || Number.MAX_SAFE_INTEGER;

    return aTime - bTime;
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;

  const keys = [
    "items",
    "records",
    "judgements",
    "evidence",
    "gaps",
    "actions",
    "compliance",
    "audits",
    "documents",
    "inspection_scores",
    "inspection_section_scores",
    "inspection_reasons",
    "inspection_actions",
    "inspection_tasks",
  ];

  if (keys.some((key) => Array.isArray(data[key]) && data[key].length > 0)) {
    return true;
  }

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
    priority: item.priority || item.status || "",
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
  return toArray(data.items, [data.actions, data.tasks, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "inspection_action",
      title: item.title || item.action_title || item.task || "Inspection action",
      status: item.status || "open",
      priority: item.priority || "",
      due_date: item.due_date || item.task_due_date || null,
      owner_user_name:
        item.owner_user_name ||
        item.assigned_to ||
        item.owner ||
        item.assigned_user_name ||
        "",
      summary:
        item.summary ||
        item.description ||
        item.task ||
        item.action_description ||
        "Inspection action recorded.",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })
  );
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
      normaliseStatus(item.priority || item.status || "")
    )
  ).length;

  const openActions = actions.filter(
    (item) =>
      !["completed", "resolved", "closed"].includes(normaliseStatus(item.status))
  ).length;

  const overdueCompliance = compliance.filter((item) =>
    ["overdue", "missing", "review_due", "due_soon", "escalated"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  const strongJudgements = judgements.filter((item) =>
    ["good", "strong", "ready", "effective", "outstanding"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  return [
    {
      label: "Readiness",
      value: `${readinessScore}%`,
      note: "Inspection-facing position",
      tone:
        readinessScore >= 85 ? "success" : readinessScore >= 70 ? "warning" : "danger",
    },
    {
      label: "Evidence",
      value: evidence.length,
      note: "Mapped evidence items",
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
      note: "Still requiring follow-up",
      tone: openActions ? "warning" : "success",
    },
    {
      label: "Compliance",
      value: overdueCompliance,
      note: "Pressure points",
      tone: overdueCompliance ? "warning" : "success",
    },
    {
      label: "Strong areas",
      value: strongJudgements,
      note: "Judgement areas with strength",
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
    ["good", "strong", "ready", "reviewed", "available", "effective"].includes(
      normaliseStatus(item.status)
    )
  ).length;

  const evidencePercent = evidence.length
    ? Math.round((strongEvidence / evidence.length) * 100)
    : 0;

  const closedGaps = gaps.filter((item) =>
    ["resolved", "closed", "completed"].includes(normaliseStatus(item.status))
  ).length;

  const gapClosurePercent = gaps.length
    ? Math.round((closedGaps / gaps.length) * 100)
    : 100;

  const closedActions = actions.filter((item) =>
    ["resolved", "closed", "completed"].includes(normaliseStatus(item.status))
  ).length;

  const actionPercent = actions.length
    ? Math.round((closedActions / actions.length) * 100)
    : 100;

  const positiveJudgements = judgements.filter((item) =>
    ["good", "strong", "ready", "effective", "outstanding"].includes(
      normaliseStatus(item.status)
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
        normaliseStatus(item.priority || item.status || "")
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        tone: getStatusTone(item.priority || item.status),
        title: item.title || "Evidence gap",
        summary:
          item.summary ||
          (item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : "Needs inspection attention."),
      });
    });

  actions
    .filter(
      (item) =>
        !["completed", "resolved", "closed"].includes(
          normaliseStatus(item.status)
        )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        tone: getStatusTone(item.status || item.priority),
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
        normaliseStatus(item.status)
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        tone: getStatusTone(item.status),
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
      tone: "success",
      title: "No major inspection pressure",
      summary:
        "The dashboard is not currently surfacing urgent inspection-facing gaps.",
    });
  }

  return items.slice(0, 8);
}

function renderStatusPill(status = "", fallback = "Recorded") {
  const label = status || fallback;
  const tone = getStatusTone(label);

  return `<span class="ofsted-pill ofsted-pill--${safeText(tone)}">${safeText(
    label
  )}</span>`;
}

function renderSectionHeader(kicker, title, description) {
  return `
    <div class="ofsted-section-head">
      <div>
        ${kicker ? `<span class="ofsted-kicker">${safeText(kicker)}</span>` : ""}
        <h3>${safeText(title)}</h3>
        ${description ? `<p>${safeText(description)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderStatCards(cards = []) {
  return `
    <div class="ofsted-metric-grid">
      ${cards
        .map(
          (card) => `
            <article class="ofsted-metric-card ofsted-metric-card--${safeText(
              card.tone || "muted"
            )}">
              <span class="ofsted-metric-label">${safeText(card.label)}</span>
              <strong class="ofsted-metric-value">${safeText(card.value)}</strong>
              <span class="ofsted-metric-note">${safeText(card.note)}</span>
              <span class="ofsted-metric-status">${safeText(
                getToneLabel(card.tone)
              )}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgressCards(cards = []) {
  return `
    <div class="ofsted-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="ofsted-progress-card">
              <div class="ofsted-progress-top">
                <span>${safeText(card.label)}</span>
                <strong>${safeText(card.value)}</strong>
              </div>
              <div class="ofsted-progress-track">
                <span
                  class="ofsted-progress-fill ofsted-progress-fill--${safeText(
                    card.tone || "muted"
                  )}"
                  style="width:${safeText(card.percent || 0)}%;"
                ></span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderEmptyState(message = "Nothing to show right now.") {
  return `
    <div class="ofsted-empty">
      <div class="ofsted-empty-icon" aria-hidden="true">○</div>
      <p>${safeText(message)}</p>
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
    variant = "standard",
  } = options;

  if (!items.length) return renderEmptyState(emptyMessage);

  return `
    <div class="ofsted-card-list ofsted-card-list--${safeText(variant)}">
      ${items
        .map((item) => {
          const title = item?.[titleKey] || item?.title || "Record";
          const summary =
            item?.[summaryKey] || item?.summary || "No summary available.";
          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || item?.status || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";
          const recordPayload = buildRecordPayloadAttr(item);

          return `
            <article
              class="ofsted-record-card ofsted-record-card--${safeText(tone)}"
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
              <div class="ofsted-record-main">
                <div class="ofsted-record-title">${safeText(title)}</div>
                <div class="ofsted-record-summary">${safeText(summary)}</div>
                ${meta ? `<div class="ofsted-record-meta">${safeText(meta)}</div>` : ""}
              </div>
              <div class="ofsted-record-side">
                ${renderStatusPill(status || "Recorded")}
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
    return renderEmptyState("No urgent inspection issues are showing right now.");
  }

  return `
    <div class="ofsted-priority-list">
      ${items
        .map(
          (item) => `
            <article class="ofsted-priority-item ofsted-priority-item--${safeText(
              item.tone || "muted"
            )}">
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
    return renderEmptyState(
      "No urgent inspection visibility alerts are active right now."
    );
  }

  return `
    <div class="ofsted-card-list">
      ${signals
        .slice(0, 6)
        .map((signal) => {
          const tone = getStatusTone(signal.severity || "medium");

          return `
            <article class="ofsted-record-card ofsted-record-card--${safeText(tone)}">
              <div class="ofsted-record-main">
                <div class="ofsted-record-title">${safeText(
                  signal.title || "Inspection visibility signal"
                )}</div>
                <div class="ofsted-record-summary">${safeText(
                  signal.description ||
                    "Inspection signal requires follow-through."
                )}</div>
              </div>
              <div class="ofsted-record-side">
                <span class="ofsted-pill ofsted-pill--${safeText(tone)}">
                  ${safeText(signal.count ?? signal.severity ?? 0)}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderInsightStory(story = "") {
  const text = String(story || "").trim();

  if (!text) {
    return renderEmptyState("No inspection narrative is available yet.");
  }

  return `
    <div class="ofsted-narrative-card">
      <p>${safeText(text)}</p>
    </div>
  `;
}

function renderTrendRows(trends = []) {
  if (!trends.length) {
    return renderEmptyState("No inspection trend movement is available yet.");
  }

  return `
    <div class="ofsted-card-list">
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
            <article class="ofsted-record-card ofsted-record-card--${safeText(
              tone
            )}">
              <div class="ofsted-record-main">
                <div class="ofsted-record-title">${safeText(
                  item?.label || "Trend"
                )}</div>
                <div class="ofsted-record-summary">
                  ${safeText(item?.assessment || "stable")} • ${safeText(
                    item?.current ?? 0
                  )} now vs ${safeText(item?.previous ?? 0)} before
                </div>
              </div>
              <div class="ofsted-record-side">
                <span class="ofsted-pill ofsted-pill--${safeText(tone)}">${safeText(
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
    return renderEmptyState(
      "No repeated inspection-risk patterns have crossed threshold yet."
    );
  }

  return `
    <div class="ofsted-card-list">
      ${patterns
        .slice(0, 5)
        .map((item) => {
          const tone = getStatusTone(item?.severity || "medium");

          return `
            <article class="ofsted-record-card ofsted-record-card--${safeText(tone)}">
              <div class="ofsted-record-main">
                <div class="ofsted-record-title">${safeText(
                  item?.title || "Pattern"
                )}</div>
                <div class="ofsted-record-summary">${safeText(
                  item?.evidence || ""
                )}</div>
                <div class="ofsted-record-meta">
                  ${safeText(
                    `${toNumber(item?.frequency, 0)} in ${toNumber(
                      item?.period_days,
                      0
                    )} days`
                  )}
                </div>
              </div>
              <div class="ofsted-record-side">
                <span class="ofsted-pill ofsted-pill--${safeText(tone)}">
                  ${safeText(item?.severity || "medium")}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDecisionRows(items = []) {
  if (!items.length) {
    return renderEmptyState("No decision-support prompts are available yet.");
  }

  return `
    <div class="ofsted-card-list">
      ${items
        .slice(0, 3)
        .map((item) => {
          const tone = getStatusTone(item?.severity || "medium");

          return `
            <article class="ofsted-record-card ofsted-record-card--${safeText(tone)}">
              <div class="ofsted-record-main">
                <div class="ofsted-record-title">${safeText(
                  item?.question || "Decision prompt"
                )}</div>
                <div class="ofsted-record-summary">${safeText(
                  item?.evidence || ""
                )}</div>
                <div class="ofsted-record-meta">${safeText(
                  item?.suggested_action || ""
                )}</div>
              </div>
              <div class="ofsted-record-side">
                <span class="ofsted-pill ofsted-pill--${safeText(tone)}">
                  ${safeText(item?.severity || "medium")}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderJudgementSupportRows(items = []) {
  if (!items.length) {
    return renderEmptyState("No generated judgement support is available yet.");
  }

  return `
    <div class="ofsted-card-list">
      ${items
        .slice(0, 3)
        .map((item) => {
          const tone = getStatusTone(item?.severity || "medium");

          return `
            <article class="ofsted-record-card ofsted-record-card--${safeText(tone)}">
              <div class="ofsted-record-main">
                <div class="ofsted-record-title">${safeText(
                  item?.title || "Judgement support"
                )}</div>
                <div class="ofsted-record-summary">${safeText(
                  item?.evidence || ""
                )}</div>
                <div class="ofsted-record-meta">${safeText(
                  item?.suggested_action || ""
                )}</div>
              </div>
              <div class="ofsted-record-side">
                <span class="ofsted-pill ofsted-pill--${safeText(tone)}">
                  ${safeText(item?.severity || "medium")}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderMissingRows(items = []) {
  if (!items.length) {
    return renderEmptyState(
      "No missing inspection evidence warnings are currently highlighted."
    );
  }

  return `
    <div class="ofsted-priority-list">
      ${items
        .slice(0, 5)
        .map(
          (text) => `
            <article class="ofsted-priority-item ofsted-priority-item--warning">
              <strong>Missing evidence</strong>
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
    <section class="ofsted-dashboard-shell">
      <section class="ofsted-hero-card">
        <div class="ofsted-hero-copy">
          <span class="ofsted-kicker">Ofsted command centre</span>
          <h2>${safeText(title)}</h2>
          <p>
            Inspection-facing grip across SCCIF judgement areas, evidence confidence,
            gaps, actions, compliance pressure and leadership readiness.
          </p>
          ${
            isFallback
              ? `<div class="ofsted-preview-banner">Preview data is showing because live Ofsted endpoints are not yet returning usable records.</div>`
              : `<div class="ofsted-live-banner">Live inspection data loaded for the current home.</div>`
          }
        </div>

        <div class="ofsted-hero-actions">
          <button class="primary-btn" type="button" data-action-router="inspection_refresh">
            Refresh inspection cycle
          </button>
          <button class="secondary-btn" type="button" data-action-router="inspection_sync">
            Sync actions
          </button>
        </div>
      </section>

      ${renderStatCards(topStats)}

      <section class="ofsted-section-card ofsted-section-card--snapshot">
        ${renderSectionHeader(
          "Snapshot",
          "Inspection evidence preparation picture",
          "A quick visual read across evidence confidence, gap closure, action completion and judgement strength."
        )}
        ${renderProgressCards(progressCards)}
      </section>

      <section class="ofsted-command-grid">
        <section class="ofsted-command-main">
          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "SCCIF",
              "Judgement areas",
              "Inspection-facing judgement themes and how strong the evidence currently looks."
            )}
            ${renderRows(judgementItems, {
              emptyMessage: "No judgement areas found.",
              titleKey: "area",
              summaryKey: "strength_summary",
              recordType: "ofsted_judgement",
              variant: "judgements",
              metaBuilder: (item) =>
                [
                  `${toNumber(item.evidence_count)} evidence`,
                  `${toNumber(item.gap_count)} gaps`,
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Risk",
              "Evidence gaps",
              "Gaps most likely to weaken inspection confidence if left unresolved."
            )}
            ${renderRows(gapItems, {
              emptyMessage: "No inspection gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_gap",
              statusKey: "priority",
              variant: "gaps",
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

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Follow-through",
              "Open inspection actions",
              "Leadership and service actions linked to evidence strength and readiness."
            )}
            ${renderRows(actionItems, {
              emptyMessage: "No inspection actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_action",
              variant: "actions",
              metaBuilder: (item) =>
                [
                  item.owner_user_name || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Evidence",
              "Evidence library",
              "Recent evidence items mapped to inspection themes and areas."
            )}
            ${renderRows(evidenceItems, {
              emptyMessage: "No inspection evidence found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_evidence",
              variant: "evidence",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.source_type || "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>
        </section>

        <aside class="ofsted-command-side">
          <section class="ofsted-section-card ofsted-section-card--sticky">
            ${renderSectionHeader(
              "Priority",
              "Needs attention",
              "The most urgent inspection-facing issues across the service."
            )}
            ${renderPriorityList(priorityItems)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Narrative",
              "Story right now",
              "Current inspection narrative from trends and repeated themes."
            )}
            ${renderInsightStory(insightStory)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Movement",
              "What is changing",
              "Direction of key Inspection evidence preparation indicators."
            )}
            ${renderTrendRows(changing)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Patterns",
              "Repeating patterns",
              "Explainable recurring issues from evidence and action data."
            )}
            ${renderPatternRows(patterns)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Decision support",
              "Inspection prompts",
              "Evidence-backed prompts for preparation decisions."
            )}
            ${renderDecisionRows(decisionSupport)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Judgement support",
              "Generated support",
              "Auto-generated, evidence-linked support points for likely judgement lines."
            )}
            ${renderJudgementSupportRows(judgementSupport)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Alerts",
              "Inspection visibility alerts",
              "Prioritised signals for evidence gaps and likely inspector concerns."
            )}
            ${renderVisibilitySignals(visibilitySignals)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Missing",
              "What is missing",
              "Gaps likely to weaken readiness if left open."
            )}
            ${renderMissingRows(missingItems)}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Compliance",
              "Compliance pressure",
              "Compliance items that could weaken inspection confidence."
            )}
            ${renderRows(complianceItems, {
              emptyMessage: "No inspection-linked compliance issues found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance",
              variant: "compact",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Audit",
              "Audit signals",
              "Recent audit findings that support or weaken readiness."
            )}
            ${renderRows(auditItems, {
              emptyMessage: "No audit records found.",
              titleKey: "audit_name",
              summaryKey: "summary",
              recordType: "audit",
              variant: "compact",
              metaBuilder: (item) =>
                [
                  item.audit_date ? formatDate(item.audit_date) : "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="ofsted-section-card">
            ${renderSectionHeader(
              "Documents",
              "Key documents",
              "Documents likely to be relied on during evidence collation or inspection discussion."
            )}
            ${renderRows(documentItems, {
              emptyMessage: "No inspection-linked documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              variant: "compact",
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
      </section>
    </section>
  `;
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="ofsted-dashboard-shell">
      <section class="ofsted-section-card">
        ${renderEmptyState("A home ID is needed before the Ofsted dashboard can load.")}
      </section>
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
    <section class="ofsted-dashboard-shell">
      <section class="ofsted-section-card">
        <div class="loading-state">
          <div>
            <div class="spinner" aria-hidden="true"></div>
            <p>Loading Ofsted dashboard…</p>
          </div>
        </div>
      </section>
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
    <section class="ofsted-dashboard-shell">
      <section class="ofsted-section-card">
        <div class="ofsted-empty">
          <div class="ofsted-empty-icon" aria-hidden="true">!</div>
          <h3>Failed to load Ofsted dashboard</h3>
          <p>${safeText(message || "The Ofsted dashboard could not be loaded.")}</p>
        </div>
      </section>
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
        overall_band: "good",
        narrative_summary:
          "Good day-to-day practice is visible, but action closure and evidence freshness still need tightening.",
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

  if (!endpoints) {
    return buildFallbackData(homeId);
  }

  const safeGet = (url) => {
    if (!url) return Promise.resolve(null);
    return apiGet(url).catch(() => null);
  };

  const requests = [
    safeGet(endpoints.inspectionScores),
    safeGet(endpoints.inspectionSectionScores),
    safeGet(endpoints.inspectionScoreReasons),
    safeGet(endpoints.inspectionLinesOfEnquiry),
    safeGet(endpoints.inspectionImprovementActions),
    safeGet(endpoints.complianceItems),
    safeGet(endpoints.qualityAudits),
    safeGet(endpoints.qualityAuditFindings),
    safeGet(endpoints.qualityAuditActions),
    safeGet(endpoints.reg44Visits),
    safeGet(endpoints.reg44Findings),
    safeGet(endpoints.reg44Actions),
    safeGet(endpoints.reg45Reviews),
    safeGet(endpoints.reg45Actions),
  ];

  const [
    inspectionScoresData,
    inspectionSectionScoresData,
    inspectionReasonsData,
    inspectionLinesData,
    inspectionActionsData,
    complianceData,
    qualityAuditsData,
    qualityAuditFindingsData,
    qualityAuditActionsData,
    reg44VisitsData,
    reg44FindingsData,
    reg44ActionsData,
    reg45ReviewsData,
    reg45ActionsData,
  ] = await Promise.all(requests);

  const hasLiveSuccess = [
    inspectionScoresData,
    inspectionSectionScoresData,
    inspectionReasonsData,
    inspectionLinesData,
    inspectionActionsData,
    complianceData,
    qualityAuditsData,
    qualityAuditFindingsData,
    qualityAuditActionsData,
    reg44VisitsData,
    reg44FindingsData,
    reg44ActionsData,
    reg45ReviewsData,
    reg45ActionsData,
  ].some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  const scoreSummary =
    normaliseSummary(inspectionScoresData || {}).summary ||
    normaliseSummary(inspectionScoresData || {});

  const inspectionSections = toArray(inspectionSectionScoresData?.items, [
    inspectionSectionScoresData?.inspection_section_scores,
    inspectionSectionScoresData?.records,
  ]);

  const inspectionReasons = toArray(inspectionReasonsData?.items, [
    inspectionReasonsData?.inspection_score_reasons,
    inspectionReasonsData?.inspection_reasons,
    inspectionReasonsData?.records,
  ]);

  const inspectionActions = toArray(inspectionActionsData?.items, [
    inspectionActionsData?.inspection_improvement_actions,
    inspectionActionsData?.inspection_actions,
    inspectionActionsData?.records,
  ]);

  const qualityFindings = toArray(qualityAuditFindingsData?.items, [
    qualityAuditFindingsData?.quality_audit_findings,
    qualityAuditFindingsData?.records,
  ]);

  const qualityActions = toArray(qualityAuditActionsData?.items, [
    qualityAuditActionsData?.quality_audit_actions,
    qualityAuditActionsData?.records,
  ]);

  const reg44Findings = toArray(reg44FindingsData?.items, [
    reg44FindingsData?.reg44_findings,
    reg44FindingsData?.records,
  ]);

  const reg44Actions = toArray(reg44ActionsData?.items, [
    reg44ActionsData?.reg44_actions,
    reg44ActionsData?.records,
  ]);

  const reg45Actions = toArray(reg45ActionsData?.items, [
    reg45ActionsData?.reg45_actions,
    reg45ActionsData?.records,
  ]);

  const summaryData = {
    summary: {
      title:
        scoreSummary.title ||
        scoreSummary.home_name ||
        `Home ${homeId} Ofsted dashboard`,
      home_name: scoreSummary.home_name || "",
      readiness_score:
        scoreSummary.readiness_score ??
        scoreSummary.overall_score ??
        scoreSummary.confidence_score ??
        0,
      evidence_score:
        scoreSummary.evidence_score ??
        scoreSummary.confidence_score ??
        scoreSummary.readiness_score ??
        0,
      overall_band: scoreSummary.overall_band || "",
      narrative_summary:
        scoreSummary.narrative_summary ||
        scoreSummary.concerns_summary ||
        scoreSummary.strengths_summary ||
        "",
    },
  };

  const judgementData = {
    items: inspectionSections.map((item) => ({
      id: item.id ?? item.section_score_id ?? item.source_id ?? null,
      record_type: "ofsted_judgement",
      title: item.section_name || item.section_code || "Judgement area",
      area: item.section_name || item.section_code || "Area",
      status: item.score_band || item.status || scoreSummary.overall_band || "recorded",
      strength_summary:
        item.summary_text ||
        item.strengths_text ||
        item.concerns_text ||
        "Inspection section evidence available.",
      evidence_count: toNumber(item.evidence_count, 0),
      gap_count: toNumber(item.gap_count, 0),
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })),
  };

  const evidenceData = {
    items: [
      ...inspectionReasons.map((item) => ({
        id: item.id ?? item.source_id ?? null,
        record_type: "inspection_evidence",
        title: item.title || item.line_of_enquiry_name || "Inspection reason",
        area: item.section_name || item.section_code || "",
        status: item.reason_type || "recorded",
        summary:
          item.description ||
          item.evidence_excerpt ||
          item.summary ||
          "Inspection evidence available.",
        source_type: item.source_table || "inspection_reason",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
      ...qualityFindings.map((item) => ({
        id: item.id ?? item.source_id ?? null,
        record_type: "inspection_evidence",
        title: item.title || "Quality finding",
        area: item.judgement_area || "Quality",
        status: item.finding_type || "recorded",
        summary: item.details || item.summary || "Quality finding recorded.",
        source_type: "quality_audit_finding",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
      ...reg44Findings.map((item) => ({
        id: item.id ?? item.source_id ?? null,
        record_type: "inspection_evidence",
        title: item.title || "Reg 44 finding",
        area: item.judgement_area || "Regulation 44",
        status: item.finding_type || "recorded",
        summary:
          item.finding_text || item.summary || "Regulation 44 finding recorded.",
        source_type: "reg44_finding",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
    ],
  };

  const gapData = {
    items: [
      ...inspectionReasons
        .filter((item) =>
          ["concern", "gap", "weakness", "risk"].includes(
            normaliseStatus(item.reason_type)
          )
        )
        .map((item) => ({
          id: item.id ?? item.source_id ?? null,
          record_type: "inspection_gap",
          title: item.title || item.line_of_enquiry_name || "Evidence gap",
          area: item.section_name || item.section_code || "",
          status: item.reason_type || "open",
          priority: item.priority || item.reason_type || "",
          due_date: item.due_date || null,
          owner_user_name: item.owner_user_name || "",
          summary:
            item.description ||
            item.evidence_excerpt ||
            item.summary ||
            "Inspection gap identified.",
          updated_at: item.updated_at || item.created_at || null,
          created_at: item.created_at || null,
        })),
      ...qualityFindings
        .filter((item) => toBool(item.action_required))
        .map((item) => ({
          id: `quality-gap-${item.id}`,
          record_type: "inspection_gap",
          title: item.title || "Quality gap",
          area: item.judgement_area || "Quality",
          status: "open",
          priority: item.priority || "",
          due_date: null,
          owner_user_name: "",
          summary: item.details || item.summary || "Quality gap identified.",
          updated_at: item.updated_at || item.created_at || null,
          created_at: item.created_at || null,
        })),
      ...reg44Findings
        .filter((item) => toBool(item.requires_action))
        .map((item) => ({
          id: `reg44-gap-${item.id}`,
          record_type: "inspection_gap",
          title: item.title || "Reg 44 gap",
          area: item.judgement_area || "Regulation 44",
          status: "open",
          priority: item.priority || "",
          due_date: null,
          owner_user_name: "",
          summary:
            item.finding_text || item.summary || "Regulation 44 gap identified.",
          updated_at: item.updated_at || item.created_at || null,
          created_at: item.created_at || null,
        })),
    ],
  };

  const actionData = {
    items: [
      ...inspectionActions.map((item) => ({
        id: item.id ?? item.action_id ?? item.task_id ?? item.source_id ?? null,
        record_type: "inspection_action",
        title:
          item.action_title || item.task_title || item.title || "Inspection action",
        status: item.status || (item.completed ? "completed" : "open"),
        priority: item.priority || "",
        due_date:
          item.due_date || item.task_due_date || item.action_due_date || null,
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
      })),
      ...qualityActions.map((item) => ({
        id: `quality-action-${item.id}`,
        record_type: "inspection_action",
        title: item.action_title || "Quality action",
        status: item.status || "open",
        priority: item.priority || "",
        due_date: item.due_date || null,
        owner_user_name: item.owner_user_name || "",
        summary:
          item.action_description ||
          item.completion_notes ||
          "Quality action recorded.",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
      ...reg44Actions.map((item) => ({
        id: `reg44-action-${item.id}`,
        record_type: "inspection_action",
        title: item.action_title || "Reg 44 action",
        status: item.status || "open",
        priority: item.priority || "",
        due_date: item.due_date || null,
        owner_user_name: item.owner_user_name || "",
        summary: item.action_description || item.summary || "Reg 44 action recorded.",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
      ...reg45Actions.map((item) => ({
        id: `reg45-action-${item.id}`,
        record_type: "inspection_action",
        title: item.action_title || "Reg 45 action",
        status: item.status || "open",
        priority: item.priority || "",
        due_date: item.due_date || null,
        owner_user_name: item.owner_user_name || "",
        summary: item.action_description || item.summary || "Reg 45 action recorded.",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
    ],
  };

  return {
    summaryData,
    judgementData,
    evidenceData,
    gapData,
    actionData,
    complianceData: complianceData || { items: [] },
    auditData: {
      items: [
        ...toArray(qualityAuditsData?.items, [
          qualityAuditsData?.quality_audits,
          qualityAuditsData?.audits,
          qualityAuditsData?.records,
        ]),
        ...toArray(reg44VisitsData?.items, [
          reg44VisitsData?.reg44_visits,
          reg44VisitsData?.records,
        ]).map((item) => ({
          ...item,
          title:
            item.title ||
            `Reg 44 visit${item.visit_date ? ` - ${formatDate(item.visit_date)}` : ""}`,
          audit_name: item.audit_name || "Reg 44 visit",
          audit_date: item.visit_date || item.created_at || null,
          summary:
            item.overall_summary ||
            item.recommendations_summary ||
            "Regulation 44 visit available.",
        })),
        ...toArray(reg45ReviewsData?.items, [
          reg45ReviewsData?.reg45_reviews,
          reg45ReviewsData?.records,
        ]).map((item) => ({
          ...item,
          title: item.title || "Reg 45 review",
          audit_name: item.audit_name || "Reg 45 review",
          audit_date: item.review_period_end || item.created_at || null,
          summary:
            item.overall_quality_summary ||
            item.action_plan_summary ||
            "Regulation 45 review available.",
        })),
      ],
    },
    documentData: { items: [] },
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

    const summary = normaliseSummary(summaryData);

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
          normaliseStatus(item.status)
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

    const judgementSupport = toArray(
      visibility?.ofsted_judgement_support
    ).slice(0, 3);

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

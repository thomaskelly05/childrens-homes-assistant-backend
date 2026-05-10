import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { buildInspectionUiEndpoints } from "../core/config.js";

function getAllowedHomeIds() {
  const rawIds = Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : [];
  return rawIds
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function getHomeId() {
  const preferredHomeId = Number(
    state.readinessSelectedHomeId ||
      state.homeId ||
      state.selectedHomeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      state.selectedYoungPerson?.home_id ||
      0
  );

  const allowedHomeIds = getAllowedHomeIds();

  if (allowedHomeIds.length) {
    if (
      Number.isFinite(preferredHomeId) &&
      preferredHomeId > 0 &&
      allowedHomeIds.includes(preferredHomeId)
    ) {
      return preferredHomeId;
    }
    return allowedHomeIds[0];
  }

  return Number.isFinite(preferredHomeId) && preferredHomeId > 0
    ? preferredHomeId
    : null;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
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
      "high",
      "overdue",
      "missing",
      "blocked",
      "inadequate",
      "weak",
      "danger",
      "escalated",
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
      "requires_work",
      "partial",
      "developing",
      "requires_improvement",
      "attention",
      "medium",
      "open",
      "planned",
      "draft",
      "in_progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "good",
      "strong",
      "effective",
      "ready",
      "reviewed",
      "secure",
      "complete",
      "completed",
      "resolved",
      "available",
      "active",
      "current",
      "compliant",
      "outstanding",
      "strength",
      "success",
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
  if (Array.isArray(data.incidents) && data.incidents.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.safeguarding) && data.safeguarding.length > 0) return true;
  if (Array.isArray(data.reports) && data.reports.length > 0) return true;
  if (Array.isArray(data.inspection_sections) && data.inspection_sections.length > 0)
    return true;
  if (Array.isArray(data.inspection_section_scores) && data.inspection_section_scores.length > 0)
    return true;
  if (Array.isArray(data.inspection_reasons) && data.inspection_reasons.length > 0)
    return true;
  if (Array.isArray(data.inspection_score_reasons) && data.inspection_score_reasons.length > 0)
    return true;
  if (Array.isArray(data.inspection_actions) && data.inspection_actions.length > 0)
    return true;
  if (Array.isArray(data.inspection_improvement_actions) && data.inspection_improvement_actions.length > 0)
    return true;
  if (Array.isArray(data.quality_audits) && data.quality_audits.length > 0) return true;
  if (Array.isArray(data.quality_audit_findings) && data.quality_audit_findings.length > 0)
    return true;
  if (Array.isArray(data.quality_audit_actions) && data.quality_audit_actions.length > 0)
    return true;
  if (Array.isArray(data.reg44_visits) && data.reg44_visits.length > 0) return true;
  if (Array.isArray(data.reg44_findings) && data.reg44_findings.length > 0) return true;
  if (Array.isArray(data.reg44_actions) && data.reg44_actions.length > 0) return true;
  if (Array.isArray(data.reg45_reviews) && data.reg45_reviews.length > 0) return true;
  if (Array.isArray(data.reg45_actions) && data.reg45_actions.length > 0) return true;
  if (Array.isArray(data.compliance_items) && data.compliance_items.length > 0) return true;
  if (Array.isArray(data.inspection_scores) && data.inspection_scores.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  return false;
}

const JUDGEMENTS = Object.freeze([
  {
    id: "overall_experiences",
    title: "Overall experiences and progress of children and young people",
    keywords: [
      "overall experiences",
      "experiences and progress",
      "child voice",
      "education",
      "health",
      "therapy",
      "achievement",
      "daily life",
      "relationships",
      "placement plan",
      "progress",
      "wishes and feelings",
      "experience",
      "keywork",
    ],
  },
  {
    id: "helped_and_protected",
    title: "How well children and young people are helped and protected",
    keywords: [
      "helped and protected",
      "safeguarding",
      "risk",
      "missing",
      "incident",
      "restraint",
      "protection",
      "return home",
      "chronology",
      "safety",
      "behaviour",
      "harm",
    ],
  },
  {
    id: "leadership_and_management",
    title: "The effectiveness of leaders and managers",
    keywords: [
      "leaders and managers",
      "leadership",
      "management",
      "reg 44",
      "reg44",
      "reg 45",
      "reg45",
      "audit",
      "quality",
      "supervision",
      "training",
      "compliance",
      "staffing",
      "notifications",
      "oversight",
      "manager",
      "quality audit",
    ],
  },
]);

function normaliseSummary(data = {}) {
  return data.summary || data.dashboard || data.judgement_summary || data || {};
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
      "",
    standard: item.standard || item.quality_standard || item.sub_area || "",
    source_type: item.source_type || item.evidence_source || "",
    status: item.status || item.strength || "recorded",
    summary:
      item.summary ||
      item.description ||
      item.evidence_note ||
      item.evidence_excerpt ||
      "Evidence item recorded.",
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
      "",
    priority: item.priority || "",
    status: item.status || item.priority || "open",
    summary:
      item.summary ||
      item.description ||
      item.gap_reason ||
      item.concerns_text ||
      "Evidence gap recorded.",
    due_date: item.due_date || null,
    owner_user_name: item.owner_user_name || item.owner || "",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseActionItems(data = {}) {
  return toArray(data.items, [data.actions, data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "sccif_action",
    title: item.title || item.task || item.action_title || "Action",
    area:
      item.area ||
      item.sccif_area ||
      item.judgement_area ||
      item.section_name ||
      "",
    priority: item.priority || "",
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.description ||
      item.task ||
      item.action_description ||
      "Action recorded.",
    due_date: item.due_date || item.task_due_date || item.action_due_date || null,
    owner_user_name:
      item.owner_user_name || item.owner || item.assigned_to || item.assigned_user_name || "",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.incidents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.incident_type || "Incident",
    incident_type: item.incident_type || item.title || "",
    severity: item.severity || "",
    status: item.status || "recorded",
    summary: item.summary || item.description || "Incident recorded.",
    occurred_at:
      item.occurred_at ||
      item.date ||
      item.incident_datetime ||
      item.created_at ||
      null,
  }));
}

function normaliseSafeguardingItems(data = {}) {
  return toArray(data.items, [data.safeguarding, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.safeguarding_category || "Safeguarding item",
    safeguarding_category: item.safeguarding_category || item.category || "",
    status: item.status || "open",
    summary:
      item.summary ||
      item.concern_details ||
      item.description ||
      "Safeguarding record.",
    concern_datetime: item.concern_datetime || item.created_at || null,
  }));
}

function normaliseReportItems(data = {}) {
  return toArray(data.items, [data.reports, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.report_type || "Report",
    report_type: item.report_type || "",
    status: item.status || "completed",
    summary:
      item.summary ||
      item.notes ||
      item.report_text ||
      "Report recorded.",
    created_at: item.created_at || item.updated_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildEvidenceFromInspectionReadiness(readinessData = {}) {
  const scores = toArray(readinessData?.inspection_section_scores, [
    readinessData?.inspection_sections,
    readinessData?.sections,
    readinessData?.items,
  ]);

  const reasons = toArray(readinessData?.inspection_score_reasons, [
    readinessData?.inspection_reasons,
    readinessData?.reasons,
  ]);

  const sectionEvidence = scores.map((item) => ({
    id: item.id ?? item.section_score_id ?? item.source_id ?? null,
    record_type: "sccif_evidence",
    title: item.section_name || item.title || "Inspection section evidence",
    area: item.section_name || item.section_code || "",
    standard: item.section_code || "",
    source_type: "inspection_section",
    status: item.score_band || item.status || "recorded",
    summary:
      item.summary_text ||
      item.strengths_text ||
      item.concerns_text ||
      item.summary ||
      "Inspection section evidence available.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));

  const reasonEvidence = reasons.map((item) => ({
    id: item.id ?? item.source_id ?? null,
    record_type: "sccif_evidence",
    title: item.title || item.line_of_enquiry_name || "Inspection evidence",
    area: item.section_name || item.section_code || "",
    standard: item.reason_type || "",
    source_type: item.source_table || "inspection_reason",
    status: item.reason_type || "recorded",
    summary:
      item.description ||
      item.evidence_excerpt ||
      item.summary ||
      "Inspection evidence available.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));

  return [...sectionEvidence, ...reasonEvidence];
}

function buildGapsFromInspectionReadiness(readinessData = {}) {
  const reasons = toArray(readinessData?.inspection_score_reasons, [
    readinessData?.inspection_reasons,
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
      area: item.section_name || item.section_code || "",
      priority: item.priority || "",
      status: item.reason_type || "open",
      summary:
        item.description ||
        item.evidence_excerpt ||
        item.summary ||
        "Evidence gap identified.",
      due_date: item.due_date || null,
      owner_user_name: item.owner_user_name || "",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    }));
}

function buildActionsFromInspectionReadiness(readinessData = {}) {
  const actions = toArray(readinessData?.inspection_improvement_actions, [
    readinessData?.inspection_actions,
    readinessData?.actions,
    readinessData?.inspection_tasks,
    readinessData?.tasks,
  ]);

  return actions.map((item) => ({
    id: item.id ?? item.action_id ?? item.task_id ?? item.source_id ?? null,
    record_type: "sccif_action",
    title: item.action_title || item.task_title || item.title || "Action",
    area: item.section_name || item.section_code || item.area || "",
    priority: item.priority || "",
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.action_description ||
      item.evidence_required ||
      item.summary ||
      "Action recorded.",
    due_date: item.due_date || item.task_due_date || item.action_due_date || null,
    owner_user_name:
      item.owner_user_name ||
      item.owner_staff_name ||
      item.assigned_user_name ||
      "",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function textBlob(item = {}) {
  return [
    item.title,
    item.summary,
    item.area,
    item.standard,
    item.source_type,
    item.record_type,
    item.incident_type,
    item.safeguarding_category,
    item.report_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchJudgement(item = {}) {
  const text = textBlob(item);

  let best = JUDGEMENTS[0];
  let bestScore = -1;

  JUDGEMENTS.forEach((judgement) => {
    const score = judgement.keywords.reduce(
      (sum, keyword) => sum + (text.includes(keyword) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = judgement;
    }
  });

  if (bestScore <= 0) {
    if (
      text.includes("safeguard") ||
      text.includes("risk") ||
      text.includes("missing") ||
      text.includes("incident")
    ) {
      return JUDGEMENTS[1];
    }
    if (
      text.includes("manager") ||
      text.includes("audit") ||
      text.includes("training") ||
      text.includes("reg 44") ||
      text.includes("reg 45") ||
      text.includes("quality")
    ) {
      return JUDGEMENTS[2];
    }
  }

  return best;
}

function groupJudgementData({
  evidenceItems = [],
  gapItems = [],
  actionItems = [],
  incidentItems = [],
  safeguardingItems = [],
  reportItems = [],
}) {
  const groups = new Map();

  JUDGEMENTS.forEach((judgement) => {
    groups.set(judgement.id, {
      ...judgement,
      evidence: [],
      gaps: [],
      actions: [],
      incidents: [],
      safeguarding: [],
      reports: [],
    });
  });

  evidenceItems.forEach((item) => groups.get(matchJudgement(item).id).evidence.push(item));
  gapItems.forEach((item) => groups.get(matchJudgement(item).id).gaps.push(item));
  actionItems.forEach((item) => groups.get(matchJudgement(item).id).actions.push(item));
  incidentItems.forEach((item) => groups.get(matchJudgement(item).id).incidents.push(item));
  safeguardingItems.forEach((item) => groups.get(matchJudgement(item).id).safeguarding.push(item));
  reportItems.forEach((item) => groups.get(matchJudgement(item).id).reports.push(item));

  return [...groups.values()];
}

function pickStrengths(group) {
  return group.evidence
    .filter((item) =>
      ["good", "strong", "effective", "ready", "reviewed", "secure", "available", "success"].includes(
        String(item.status || "")
          .toLowerCase()
          .replaceAll(" ", "_")
      )
    )
    .slice(0, 4);
}

function pickGaps(group) {
  return [...group.gaps]
    .sort((a, b) => {
      const aRisk = ["critical", "high", "overdue", "missing"].includes(
        String(a.priority || a.status || "").toLowerCase().replaceAll(" ", "_")
      )
        ? 1
        : 0;
      const bRisk = ["critical", "high", "overdue", "missing"].includes(
        String(b.priority || b.status || "").toLowerCase().replaceAll(" ", "_")
      )
        ? 1
        : 0;
      return bRisk - aRisk || toTime(a.due_date) - toTime(b.due_date);
    })
    .slice(0, 4);
}

function pickActions(group) {
  return group.actions
    .filter(
      (item) =>
        !["closed", "completed", "resolved"].includes(
          String(item.status || "")
            .toLowerCase()
            .replaceAll(" ", "_")
        )
    )
    .slice(0, 4);
}

function buildProposedWording(group) {
  const strengths = pickStrengths(group);
  const gaps = pickGaps(group);
  const actions = pickActions(group);

  const strengthLine = strengths.length
    ? `Strengths are evident in ${strengths
        .map((item) => item.title || item.area || "recorded practice")
        .slice(0, 2)
        .join(" and ")}.`
    : "There is some evidence available within this area, but it is not yet consistently strong.";

  const gapLine = gaps.length
    ? `Areas requiring further work include ${gaps
        .map((item) => item.title || item.area || "evidence gaps")
        .slice(0, 2)
        .join(" and ")}.`
    : "No major evidence gaps are currently surfacing within this area.";

  const actionLine = actions.length
    ? `Current follow-up work includes ${actions
        .map((item) => item.title || "action")
        .slice(0, 2)
        .join(" and ")}.`
    : "There are no significant open actions currently mapped against this area.";

  return `${strengthLine} ${gapLine} ${actionLine}`;
}

function deriveGrade(group) {
  const strongCount = pickStrengths(group).length;
  const gapCount = pickGaps(group).length;
  const actionCount = pickActions(group).length;
  const highRiskIncidents = group.incidents.filter((item) =>
    ["high", "critical"].includes(
      String(item.severity || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;
  const openSafeguarding = group.safeguarding.filter((item) =>
    !["closed", "completed", "resolved"].includes(
      String(item.status || "")
        .toLowerCase()
        .replaceAll(" ", "_")
    )
  ).length;

  const pressure = gapCount * 3 + actionCount * 2 + highRiskIncidents * 2 + openSafeguarding;
  const confidence = strongCount * 2 + Math.min(group.reports.length, 2);

  if (pressure >= 12) return "Inadequate";
  if (pressure >= 8) return "Requires improvement";
  if (confidence >= 7 && pressure === 0) return "Outstanding";
  if (confidence >= 5 && pressure <= 2) return "Good";
  return "Requires improvement";
}

function buildOverviewStats(groups = []) {
  const grades = groups.map((group) => deriveGrade(group));
  const goodOrBetter = grades.filter((grade) =>
    ["Good", "Outstanding"].includes(grade)
  ).length;
  const requiringWork = grades.filter((grade) =>
    ["Requires improvement", "Inadequate"].includes(grade)
  ).length;

  return [
    {
      label: "Judgement areas",
      value: groups.length,
      note: "Ofsted judgement headings",
      tone: "muted",
    },
    {
      label: "Good or better",
      value: goodOrBetter,
      note: "Draft judgement signal",
      tone: goodOrBetter ? "success" : "muted",
    },
    {
      label: "Need strengthening",
      value: requiringWork,
      note: "Judgements under pressure",
      tone: requiringWork ? "warning" : "success",
    },
  ];
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid">
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

function renderList(items = [], emptyMessage = "Nothing to show.") {
  if (!items.length) {
    return `<div class="empty-state"><p>${safeText(emptyMessage)}</p></div>`;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Item")}</strong>
              <p>${safeText(item.summary || "No summary available.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderJudgementCards(groups = []) {
  if (!groups.length) {
    return `
      <div class="empty-state">
        <p>No judgement material is available yet.</p>
      </div>
    `;
  }

  return groups
    .map((group) => {
      const strengths = pickStrengths(group);
      const gaps = pickGaps(group);
      const actions = pickActions(group);
      const grade = deriveGrade(group);
      const tone =
        grade === "Outstanding" || grade === "Good"
          ? "success"
          : grade === "Requires improvement"
          ? "warning"
          : "danger";

      return `
        <section class="overview-section-card">
          <div class="overview-section-head">
            <div>
              <h3>${safeText(group.title)}</h3>
              <p>
                ${safeText(
                  `${group.evidence.length} evidence • ${group.gaps.length} gaps • ${group.actions.length} actions`
                )}
              </p>
            </div>
            <span class="row-pill ${safeText(tone)}">${safeText(grade)}</span>
          </div>

          <div class="overview-grid">
            <section class="overview-main">
              <div class="overview-section-card">
                <div class="overview-section-head">
                  <h3>Strengths</h3>
                  <p>Evidence currently supporting this judgement.</p>
                </div>
                ${renderList(
                  strengths.map((item) => ({
                    title: item.title,
                    summary: item.summary,
                  })),
                  "No clear strengths are currently mapped."
                )}
              </div>

              <div class="overview-section-card">
                <div class="overview-section-head">
                  <h3>Gaps and risks</h3>
                  <p>Weaknesses or missing evidence affecting confidence.</p>
                </div>
                ${renderList(
                  gaps.map((item) => ({
                    title: item.title,
                    summary: item.summary,
                  })),
                  "No major gaps are currently mapped."
                )}
              </div>

              <div class="overview-section-card">
                <div class="overview-section-head">
                  <h3>Draft narrative</h3>
                  <p>Proposed wording to shape an Ofsted-style report section.</p>
                </div>
                <div class="record-list">
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-summary">${safeText(
                        buildProposedWording(group)
                      )}</div>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <aside class="overview-side">
              <section class="overview-side-card">
                <div class="overview-section-head">
                  <h3>Open actions</h3>
                  <p>Improvement work linked to this judgement.</p>
                </div>
                ${renderList(
                  actions.map((item) => ({
                    title: item.title,
                    summary: item.summary,
                  })),
                  "No open actions are currently mapped."
                )}
              </section>

              <section class="overview-side-card">
                <div class="overview-section-head">
                  <h3>Inspection signals</h3>
                  <p>Related incidents, safeguarding and reports.</p>
                </div>
                <div class="record-list">
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-title">Incidents</div>
                      <div class="record-row-summary">${safeText(
                        group.incidents.length
                      )}</div>
                    </div>
                  </article>
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-title">Safeguarding</div>
                      <div class="record-row-summary">${safeText(
                        group.safeguarding.length
                      )}</div>
                    </div>
                  </article>
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-title">Reports</div>
                      <div class="record-row-summary">${safeText(
                        group.reports.length
                      )}</div>
                    </div>
                  </article>
                </div>
              </section>
            </aside>
          </div>
        </section>
      `;
    })
    .join("");
}

function renderJudgementBuilderHtml({
  title = "Judgement builder",
  stats = [],
  groups = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--ofsted">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Judgement builder</div>
          <h2>${safeText(title)}</h2>
          <p>Draft Ofsted judgement blocks built from SCCIF evidence, strengths, risks, actions and linked practice material.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live judgement inputs are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(stats)}

      ${renderJudgementCards(groups)}
    </section>
  `;
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">▤</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the judgement builder can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No judgement context",
    nextEvent: "No inspection heading loaded",
    lastRecord: "No judgement data",
    openActions: "No linked actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading judgement builder…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading judgement builder",
    nextEvent: "Checking judgement areas",
    lastRecord: "Loading latest evidence",
    openActions: "Loading linked actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load judgement builder</h3>
          <p>${safeText(message || "The judgement builder could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Judgement builder unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No judgement data",
    openActions: "Check API routes",
  });
}

function buildFallbackData(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

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
    summaryData: {
      summary: {
        title: `${homeName} judgement builder`,
        home_name: homeName,
      },
    },
    evidenceData: {
      items: [
        {
          id: "ev-1",
          title: "Child voice in planning and keywork",
          area: "Overall experiences and progress of children and young people",
          status: "strong",
          source_type: "keywork",
          summary:
            "Children’s wishes and feelings are reflected well in recent plans and sessions.",
          updated_at: minusDays(1),
        },
        {
          id: "ev-2",
          title: "Safeguarding chronology and response trail",
          area: "How well children and young people are helped and protected",
          status: "review_due",
          source_type: "chronology",
          summary:
            "Core response is evident but management analysis is not always explicit.",
          updated_at: minusDays(2),
        },
        {
          id: "ev-3",
          title: "Reg 45 service analysis",
          area: "The effectiveness of leaders and managers",
          status: "good",
          source_type: "report",
          summary:
            "Recent review shows better analysis of trends and action planning.",
          updated_at: minusDays(4),
        },
      ],
    },
    gapData: {
      items: [
        {
          id: "gap-1",
          title: "Return-home interviews not consistently linked",
          area: "How well children and young people are helped and protected",
          priority: "high",
          status: "open",
          due_date: plusDays(3),
          summary:
            "Evidence chain between incidents, returns and management oversight needs tightening.",
        },
        {
          id: "gap-2",
          title: "Audit challenge not always visible",
          area: "The effectiveness of leaders and managers",
          priority: "critical",
          status: "overdue",
          due_date: plusDays(1),
          summary:
            "Some audit closures do not clearly evidence management challenge and impact.",
        },
      ],
    },
    actionData: {
      items: [
        {
          id: "act-1",
          title: "Link return-home evidence into chronology",
          area: "How well children and young people are helped and protected",
          status: "open",
          due_date: plusDays(4),
          summary:
            "Strengthen evidence trail for missing-from-care practice.",
        },
        {
          id: "act-2",
          title: "Attach leadership rationale to audit closure",
          area: "The effectiveness of leaders and managers",
          status: "in_progress",
          due_date: plusDays(2),
          summary:
            "Add clear analysis and management decision-making.",
        },
      ],
    },
    incidentData: {
      items: [
        {
          id: "inc-1",
          incident_type: "Missing from care",
          severity: "high",
          status: "review_due",
          summary: "Returned safely. Follow-up interview required.",
        },
      ],
    },
    safeguardingData: {
      items: [
        {
          id: "safe-1",
          safeguarding_category: "Peer-on-peer concern",
          status: "open",
          summary: "Monitoring and management oversight ongoing.",
        },
      ],
    },
    reportData: {
      items: [
        {
          id: "rep-1",
          title: "Monthly quality review",
          report_type: "Quality review",
          status: "completed",
          summary:
            "Themes identified across incidents, staffing and oversight.",
          created_at: minusDays(6),
        },
      ],
    },
    isFallback: true,
  };
}

function buildSummaryFromInspectionReadiness(readinessData = {}) {
  const summary = readinessData?.summary || readinessData || {};
  return {
    title:
      summary.title ||
      summary.home_name ||
      summary.name ||
      "Judgement builder",
    home_name: summary.home_name || "",
    readiness_score:
      summary.readiness_score ??
      summary.overall_score ??
      summary.evidence_score ??
      0,
    overall_band: summary.overall_band || "",
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
    safeGet(endpoints.qualityAudits),
    safeGet(endpoints.qualityAuditFindings),
    safeGet(endpoints.qualityAuditActions),
    safeGet(endpoints.reg44Visits),
    safeGet(endpoints.reg44Findings),
    safeGet(endpoints.reg44Actions),
    safeGet(endpoints.reg45Reviews),
    safeGet(endpoints.reg45Actions),
    safeGet(endpoints.complianceItems),
  ];

  const [
    inspectionScoresData,
    inspectionSectionScoresData,
    inspectionReasonsData,
    inspectionActionsData,
    qualityAuditsData,
    qualityAuditFindingsData,
    qualityAuditActionsData,
    reg44VisitsData,
    reg44FindingsData,
    reg44ActionsData,
    reg45ReviewsData,
    reg45ActionsData,
    complianceItemsData,
  ] = await Promise.all(requests);

  const responses = [
    inspectionScoresData,
    inspectionSectionScoresData,
    inspectionReasonsData,
    inspectionActionsData,
    qualityAuditsData,
    qualityAuditFindingsData,
    qualityAuditActionsData,
    reg44VisitsData,
    reg44FindingsData,
    reg44ActionsData,
    reg45ReviewsData,
    reg45ActionsData,
    complianceItemsData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  const readinessData = {
    summary:
      normaliseSummary(inspectionScoresData).summary ||
      normaliseSummary(inspectionScoresData),
    inspection_section_scores: toArray(
      inspectionSectionScoresData?.inspection_section_scores,
      [inspectionSectionScoresData?.items, inspectionSectionScoresData?.records]
    ),
    inspection_score_reasons: toArray(
      inspectionReasonsData?.inspection_score_reasons,
      [inspectionReasonsData?.items, inspectionReasonsData?.records]
    ),
    inspection_improvement_actions: toArray(
      inspectionActionsData?.inspection_improvement_actions,
      [inspectionActionsData?.items, inspectionActionsData?.records]
    ),
  };

  const inspectionEvidence = buildEvidenceFromInspectionReadiness(readinessData);
  const inspectionGaps = buildGapsFromInspectionReadiness(readinessData);
  const inspectionActions = buildActionsFromInspectionReadiness(readinessData);

  const reportItems = [
    ...toArray(qualityAuditsData?.quality_audits, [qualityAuditsData?.items, qualityAuditsData?.records]).map((item) => ({
      id: item.id ?? null,
      title: item.audit_title || item.title || "Quality audit",
      report_type: "quality_audit",
      status: item.status || item.overall_outcome || "completed",
      summary:
        item.summary ||
        item.concerns ||
        item.recommendations ||
        "Quality audit recorded.",
      created_at: item.audit_date || item.created_at || item.updated_at || null,
      updated_at: item.updated_at || null,
    })),
    ...toArray(reg44VisitsData?.reg44_visits, [reg44VisitsData?.items, reg44VisitsData?.records]).map((item) => ({
      id: item.id ?? null,
      title: "Reg 44 visit",
      report_type: "reg44_visit",
      status: "completed",
      summary:
        item.overall_summary ||
        item.recommendations_summary ||
        "Reg 44 visit recorded.",
      created_at: item.visit_date || item.created_at || item.updated_at || null,
      updated_at: item.updated_at || null,
    })),
    ...toArray(reg45ReviewsData?.reg45_reviews, [reg45ReviewsData?.items, reg45ReviewsData?.records]).map((item) => ({
      id: item.id ?? null,
      title: "Reg 45 review",
      report_type: "reg45_review",
      status: item.review_status || "completed",
      summary:
        item.overall_quality_summary ||
        item.action_plan_summary ||
        "Reg 45 review recorded.",
      created_at:
        item.review_period_end || item.created_at || item.updated_at || null,
      updated_at: item.updated_at || null,
    })),
  ];

  const safeguardingItems = [
    ...toArray(reg44FindingsData?.reg44_findings, [reg44FindingsData?.items, reg44FindingsData?.records])
      .filter((item) =>
        String(item.judgement_area || "")
          .toLowerCase()
          .replaceAll(" ", "_")
          .includes("protected")
      )
      .map((item) => ({
        id: item.id ?? null,
        title: item.title || "Reg 44 safeguarding-related finding",
        safeguarding_category: item.judgement_area || "Safeguarding",
        status: item.requires_action ? "open" : "reviewed",
        summary: item.finding_text || "Finding recorded.",
        concern_datetime: item.created_at || null,
      })),
  ];

  const incidentItems = [
    ...inspectionGaps
      .filter((item) => {
        const area = String(item.area || "").toLowerCase();
        return area.includes("helped") || area.includes("protected");
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        incident_type: item.area || "Inspection-linked risk",
        severity: item.priority || item.status || "medium",
        status: item.status || "recorded",
        summary: item.summary,
        occurred_at: item.updated_at || item.created_at || null,
      })),
  ];

  const qualityEvidence = [
    ...inspectionEvidence,
    ...toArray(qualityAuditFindingsData?.quality_audit_findings, [qualityAuditFindingsData?.items, qualityAuditFindingsData?.records]).map((item) => ({
      id: item.id ?? null,
      record_type: "sccif_evidence",
      title: item.title || "Quality audit finding",
      area: item.finding_type || "Leadership and management",
      standard: "",
      source_type: "quality_audit_finding",
      status: item.priority || (item.action_required ? "warning" : "good"),
      summary: item.details || "Audit finding recorded.",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })),
  ];

  const qualityGaps = [
    ...inspectionGaps,
    ...toArray(reg44FindingsData?.reg44_findings, [reg44FindingsData?.items, reg44FindingsData?.records])
      .filter((item) => item.requires_action)
      .map((item) => ({
        id: item.id ?? null,
        record_type: "sccif_gap",
        title: item.title || "Reg 44 finding",
        area: item.judgement_area || "Leadership and management",
        priority: item.priority || "medium",
        status: item.finding_type || "open",
        summary: item.finding_text || "Reg 44 finding recorded.",
        due_date: null,
        owner_user_name: "",
        updated_at: item.updated_at || item.created_at || null,
        created_at: item.created_at || null,
      })),
  ];

  const qualityActions = [
    ...inspectionActions,
    ...toArray(qualityAuditActionsData?.quality_audit_actions, [qualityAuditActionsData?.items, qualityAuditActionsData?.records]).map((item) => ({
      id: item.id ?? null,
      record_type: "sccif_action",
      title: item.action_title || "Quality audit action",
      area: "Leadership and management",
      priority: item.priority || "",
      status: item.status || "open",
      summary:
        item.action_description ||
        item.completion_notes ||
        "Quality audit action recorded.",
      due_date: item.due_date || null,
      owner_user_name: "",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })),
    ...toArray(reg44ActionsData?.reg44_actions, [reg44ActionsData?.items, reg44ActionsData?.records]).map((item) => ({
      id: item.id ?? null,
      record_type: "sccif_action",
      title: item.action_title || "Reg 44 action",
      area: "Leadership and management",
      priority: "",
      status: item.status || "open",
      summary: item.action_description || "Reg 44 action recorded.",
      due_date: item.due_date || null,
      owner_user_name: "",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })),
    ...toArray(reg45ActionsData?.reg45_actions, [reg45ActionsData?.items, reg45ActionsData?.records]).map((item) => ({
      id: item.id ?? null,
      record_type: "sccif_action",
      title: item.action_title || "Reg 45 action",
      area: "Leadership and management",
      priority: item.priority || "",
      status: item.status || "open",
      summary: item.action_description || "Reg 45 action recorded.",
      due_date: item.due_date || null,
      owner_user_name: "",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })),
  ];

  return {
    summaryData: buildSummaryFromInspectionReadiness(readinessData),
    evidenceData: { items: qualityEvidence },
    gapData: { items: qualityGaps },
    actionData: { items: qualityActions },
    incidentData: { items: incidentItems },
    safeguardingData: { items: safeguardingItems },
    reportData: { items: reportItems },
    isFallback: false,
  };
}

export async function loadJudgementBuilder() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

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
      incidentData,
      safeguardingData,
      reportData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary =
      typeof summaryData === "object" && !Array.isArray(summaryData)
        ? summaryData
        : normaliseSummary(summaryData);

    const evidenceItems = sortNewestFirst(normaliseEvidenceItems(evidenceData), [
      "updated_at",
      "created_at",
    ]);

    const gapItems = sortSoonestFirst(normaliseGapItems(gapData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const actionItems = sortSoonestFirst(normaliseActionItems(actionData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const incidentItems = sortNewestFirst(normaliseIncidentItems(incidentData), [
      "occurred_at",
    ]);

    const safeguardingItems = sortNewestFirst(
      normaliseSafeguardingItems(safeguardingData),
      ["concern_datetime"]
    );

    const reportItems = sortNewestFirst(normaliseReportItems(reportData), [
      "created_at",
      "updated_at",
    ]);

    const groups = groupJudgementData({
      evidenceItems,
      gapItems,
      actionItems,
      incidentItems,
      safeguardingItems,
      reportItems,
    });

    const stats = buildOverviewStats(groups);

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} judgement builder`;

    els.viewContent.innerHTML = renderJudgementBuilderHtml({
      title,
      stats,
      groups,
      isFallback,
    });

    const mostPressuredGroup = [...groups].sort((a, b) => {
      const aPressure = pickGaps(a).length * 3 + pickActions(a).length * 2;
      const bPressure = pickGaps(b).length * 3 + pickActions(b).length * 2;
      return bPressure - aPressure;
    })[0];

    const latestEvidence = evidenceItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${groups.length} judgement areas • preview mode`
        : `${groups.length} judgement areas mapped`,
      nextEvent: mostPressuredGroup
        ? `Focus ${mostPressuredGroup.title}`
        : "No judgement pressure loaded",
      lastRecord: latestEvidence?.updated_at
        ? `Latest evidence ${formatDateTime(latestEvidence.updated_at)}`
        : isFallback
        ? "Preview judgement data loaded"
        : "No recent judgement evidence loaded",
      openActions: `${gapItems.length} gaps • ${actionItems.length} actions`,
    });
  } catch (error) {
    console.error("[judgement-builder] load failed", error);
    renderErrorState(
      error?.message || "The judgement builder could not be loaded."
    );
  }
}
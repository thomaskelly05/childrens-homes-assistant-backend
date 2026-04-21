import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { buildInspectionUiEndpoints } from "../core/config.js";

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
      "reg 45",
      "audit",
      "quality",
      "supervision",
      "training",
      "compliance",
      "staffing",
      "notifications",
      "oversight",
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
    area: item.area || item.sccif_area || item.judgement_area || "",
    standard: item.standard || item.quality_standard || item.sub_area || "",
    source_type: item.source_type || item.evidence_source || "",
    status: item.status || item.strength || "recorded",
    summary:
      item.summary ||
      item.description ||
      item.evidence_note ||
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
    area: item.area || item.sccif_area || item.judgement_area || "",
    priority: item.priority || "",
    status: item.status || item.priority || "open",
    summary:
      item.summary ||
      item.description ||
      item.gap_reason ||
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
    area: item.area || item.sccif_area || item.judgement_area || "",
    priority: item.priority || "",
    status: item.status || "open",
    summary:
      item.summary ||
      item.description ||
      item.task ||
      "Action recorded.",
    due_date: item.due_date || null,
    owner_user_name: item.owner_user_name || item.owner || item.assigned_to || "",
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
    occurred_at: item.occurred_at || item.date || item.incident_datetime || item.created_at || null,
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
    summary: item.summary || item.notes || item.report_text || "Report recorded.",
    created_at: item.created_at || item.updated_at || null,
    updated_at: item.updated_at || null,
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
    if (text.includes("safeguard") || text.includes("risk") || text.includes("missing")) {
      return JUDGEMENTS[1];
    }
    if (text.includes("manager") || text.includes("audit") || text.includes("training")) {
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
      ["good", "strong", "effective", "ready", "reviewed", "secure"].includes(
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
    : `There is some evidence available within this area, but it is not yet consistently strong.`;

  const gapLine = gaps.length
    ? `Areas requiring further work include ${gaps
        .map((item) => item.title || item.area || "evidence gaps")
        .slice(0, 2)
        .join(" and ")}.`
    : `No major evidence gaps are currently surfacing within this area.`;

  const actionLine = actions.length
    ? `Current follow-up work includes ${actions
        .map((item) => item.title || "action")
        .slice(0, 2)
        .join(" and ")}.`
    : `There are no significant open actions currently mapped against this area.`;

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

  if (pressure >= 8) return "Requires improvement";
  if (pressure >= 12) return "Inadequate";
  if (confidence >= 5 && pressure <= 2) return "Good";
  if (confidence >= 7 && pressure === 0) return "Outstanding";
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
                      <div class="record-row-summary">${safeText(buildProposedWording(group))}</div>
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
                      <div class="record-row-summary">${safeText(group.incidents.length)}</div>
                    </div>
                  </article>
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-title">Safeguarding</div>
                      <div class="record-row-summary">${safeText(group.safeguarding.length)}</div>
                    </div>
                  </article>
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-title">Reports</div>
                      <div class="record-row-summary">${safeText(group.reports.length)}</div>
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
          summary: "Children’s wishes and feelings are reflected well in recent plans and sessions.",
          updated_at: minusDays(1),
        },
        {
          id: "ev-2",
          title: "Safeguarding chronology and response trail",
          area: "How well children and young people are helped and protected",
          status: "review_due",
          source_type: "chronology",
          summary: "Core response is evident but management analysis is not always explicit.",
          updated_at: minusDays(2),
        },
        {
          id: "ev-3",
          title: "Reg 45 service analysis",
          area: "The effectiveness of leaders and managers",
          status: "good",
          source_type: "report",
          summary: "Recent review shows better analysis of trends and action planning.",
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
          summary: "Evidence chain between incidents, returns and management oversight needs tightening.",
        },
        {
          id: "gap-2",
          title: "Audit challenge not always visible",
          area: "The effectiveness of leaders and managers",
          priority: "critical",
          status: "overdue",
          due_date: plusDays(1),
          summary: "Some audit closures do not clearly evidence management challenge and impact.",
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
          summary: "Strengthen evidence trail for missing-from-care practice.",
        },
        {
          id: "act-2",
          title: "Attach leadership rationale to audit closure",
          area: "The effectiveness of leaders and managers",
          status: "in_progress",
          due_date: plusDays(2),
          summary: "Add clear analysis and management decision-making.",
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
          summary: "Themes identified across incidents, staffing and oversight.",
          created_at: minusDays(6),
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
    safeGet(endpoints.sccifEvidence),
    safeGet(endpoints.readiness),
    safeGet(endpoints.incidents),
    safeGet(`${endpoints.base}/safeguarding`),
    safeGet(`${endpoints.base}/reports`),
  ];

  const [evidenceData, readinessData, incidentData, safeguardingData, reportData] =
    await Promise.all(requests);

  const responses = [evidenceData, readinessData, incidentData, safeguardingData, reportData];
  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: evidenceData || {},
    evidenceData: evidenceData || { items: [] },
    gapData: readinessData || { items: [] },
    actionData: readinessData || { items: [] },
    incidentData: incidentData || { items: [] },
    safeguardingData: safeguardingData || { items: [] },
    reportData: reportData || { items: [] },
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

    const summary = normaliseSummary(summaryData);

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
    renderErrorState(error?.message || "The judgement builder could not be loaded.");
  }
}
import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet, apiSend } from "../core/api.js";
import { buildInspectionUiEndpoints } from "../core/config.js";
import { escapeHtml, formatDate, formatDateTime } from "../core/utils.js";
import {
  mapComplianceItem,
  mapTask,
  mapStatutoryDocument,
  mapInspectionAction,
  mapInspectionTask,
  mapInspectionHeader,
  mapInspectionSectionPanel,
  mapInspectionReason,
  mapInspectionBriefing,
  mapInspectionPrep72Hour,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

/* -------------------------------- helpers -------------------------------- */

function getCurrentScope() {
  return state.currentScope || "child";
}

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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
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

function dedupeBy(items = [], getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>No readiness data</h3>
        <p>${toText(message)}</p>
      </div>
    </div>
  `;
}

function getGradeTone(band = "") {
  const value = normaliseToken(band);
  if (value === "outstanding") return "success";
  if (value === "good") return "positive";
  if (value === "requires_improvement") return "warning";
  if (value === "inadequate") return "danger";
  return "muted";
}

function getConfidenceTone(score) {
  const value = Number(score || 0);
  if (value >= 75) return "success";
  if (value >= 50) return "warning";
  return "danger";
}

function formatBand(value) {
  return String(value || "Unknown").replaceAll("_", " ");
}

function formatNumber(value, fallback = "0") {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number % 1 === 0 ? String(number) : number.toFixed(1);
}

function normaliseApiRows(payload) {
  return firstArray(
    payload?.items,
    payload?.rows,
    payload?.data,
    payload?.results,
    payload?.records
  );
}

function getRowDate(item = {}) {
  return (
    item.due_date ||
    item.review_date ||
    item.expiry_date ||
    item.action_at ||
    item.task_due_date ||
    item.action_due_date ||
    item.task_created_at ||
    item.created_at ||
    item.updated_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = normaliseToken(item.status);
  const severity = normaliseToken(item.severity);
  const priority = normaliseToken(item.priority);

  if (
    ["overdue", "escalated", "expired", "missing", "review_due", "failed"].includes(
      status
    ) ||
    ["high", "critical"].includes(severity) ||
    ["high", "critical"].includes(priority)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["due_soon", "expiring", "open", "pending"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "warning" };
  }

  if (["completed", "active", "recorded", "current"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return {
    label: status ? status.replaceAll("_", " ") : "Recorded",
    tone: "muted",
  };
}

/* ------------------------------ fallback data ----------------------------- */

function buildFallbackInspectionData(homeId) {
  const baseHomeName =
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
    cards: [
      {
        home_id: homeId,
        home_name: baseHomeName,
        overall_band: "good",
        overall_score: 74.2,
        confidence_score: 71.5,
        experiences_band: "good",
        experiences_score: 75.4,
        helped_band: "requires_improvement",
        helped_score: 68.5,
        leadership_band: "good",
        leadership_score: 77.1,
        open_actions: 5,
        overdue_actions: 2,
        critical_actions: 1,
        open_lines_of_enquiry: 3,
        top_actions_summary:
          "Two overdue actions and one safeguarding-linked improvement priority.",
        top_concerns:
          "Return interview follow-up and evidence freshness remain the main pressure points.",
        scored_at: minusDays(1),
      },
    ],
    header: {
      home_id: homeId,
      home_name: baseHomeName,
      overall_band: "good",
      overall_score: 74.2,
      confidence_score: 71.5,
      data_completeness_score: 78.2,
      evidence_freshness_score: 69.4,
      limiting_judgement_triggered: false,
      limiting_reason: "",
      experiences_band: "good",
      experiences_score: 75.4,
      helped_band: "requires_improvement",
      helped_score: 68.5,
      leadership_band: "good",
      leadership_score: 77.1,
      open_actions: 5,
      overdue_actions: 2,
      critical_actions: 1,
      impactful_open_actions: 2,
      band_shifting_actions: 1,
      overall_band_shifting_actions: 0,
      top_concerns:
        "Return interviews and action follow-up remain the strongest pressure points.",
      top_actions_text:
        "Close overdue safeguarding-linked actions and refresh stale evidence in oversight.",
      narrative_summary:
        "The home shows stable care and warm relationships, with most pressure sitting in follow-up discipline rather than core care quality.",
      strengths_summary:
        "Consistent care routines, positive feedback from young people and stronger internal oversight.",
      concerns_summary:
        "Some actions remain overdue and evidence is not always refreshed quickly enough.",
      scored_at: minusDays(1),
      next_action_due_date: plusDays(2),
    },
    sections: [
      {
        home_id: homeId,
        section_code: "experiences",
        section_name: "Experiences and progress",
        score_band: "good",
        score_value: 75.4,
        confidence_score: 73.2,
        data_completeness_score: 80.1,
        evidence_freshness_score: 72.5,
        limiting_issue_present: false,
        summary_text:
          "Young people’s day-to-day experiences are broadly positive with improving consistency.",
        strengths_text:
          "Positive routines, good engagement and clearer celebration of progress.",
        concerns_text:
          "Some monthly review evidence still needs tightening to show impact more clearly.",
      },
      {
        home_id: homeId,
        section_code: "helped",
        section_name: "Help and protection",
        score_band: "requires_improvement",
        score_value: 68.5,
        confidence_score: 66.3,
        data_completeness_score: 72.7,
        evidence_freshness_score: 61.8,
        limiting_issue_present: false,
        summary_text:
          "Safeguarding responses are mostly appropriate but follow-through needs to be more timely.",
        strengths_text:
          "Good initial response and awareness of safeguarding thresholds.",
        concerns_text:
          "Return interviews and linked tasks are not always being closed quickly enough.",
      },
      {
        home_id: homeId,
        section_code: "leadership",
        section_name: "Leadership and management",
        score_band: "good",
        score_value: 77.1,
        confidence_score: 75.2,
        data_completeness_score: 82.4,
        evidence_freshness_score: 74.3,
        limiting_issue_present: false,
        summary_text:
          "Leaders know the service well and are using actions more effectively.",
        strengths_text:
          "Oversight is becoming more structured and quality assurance is more visible.",
        concerns_text:
          "Some improvement work still relies on follow-up reminders rather than first-time closure.",
      },
    ],
    reasons: [
      {
        home_id: homeId,
        section_code: "helped",
        section_name: "Help and protection",
        reason_type: "concern",
        priority: 1,
        title: "Return interview follow-up not consistently evidenced",
        description:
          "A small number of missing-from-care episodes do not yet show timely return-interview evidence and manager closure.",
        created_at: minusDays(1),
      },
      {
        home_id: homeId,
        section_code: "leadership",
        section_name: "Leadership and management",
        reason_type: "strength",
        priority: 2,
        title: "Leadership oversight is stronger",
        description:
          "Improvement actions are better organised and linked to clearer priorities.",
        created_at: minusDays(1),
      },
      {
        home_id: homeId,
        section_code: "experiences",
        section_name: "Experiences and progress",
        reason_type: "context",
        priority: 3,
        title: "Progress evidence is improving",
        description:
          "Achievements, routines and direct work are being captured more consistently than before.",
        created_at: minusDays(1),
      },
    ],
    actions: [
      {
        home_id: homeId,
        section_code: "helped",
        section_name: "Help and protection",
        action_title: "Close overdue return interview actions",
        action_description:
          "Review all open return-interview actions and ensure each is evidenced and closed.",
        priority: "critical",
        owner_user_name: "Sarah Ahmed",
        due_date: plusDays(2),
        recoverable_points_estimate: 2.5,
        projected_section_band: "good",
        status: "open",
      },
      {
        home_id: homeId,
        section_code: "leadership",
        section_name: "Leadership and management",
        action_title: "Tighten monthly action closure discipline",
        action_description:
          "Managers to review all overdue actions weekly and evidence closure more promptly.",
        priority: "high",
        owner_user_name: "Tom Patel",
        due_date: plusDays(5),
        recoverable_points_estimate: 1.3,
        projected_section_band: "good",
        status: "open",
      },
    ],
    tasks: [
      {
        home_id: homeId,
        task_title: "Review open return interview tasks",
        action_title: "Close overdue return interview actions",
        task_due_date: plusDays(2),
        assigned_user_name: "Sarah Ahmed",
        completed: false,
      },
      {
        home_id: homeId,
        task_title: "Audit evidence freshness",
        action_title: "Tighten monthly action closure discipline",
        task_due_date: plusDays(4),
        assigned_user_name: "Tom Patel",
        completed: false,
      },
    ],
    briefing: {
      home_id: homeId,
      headline_summary:
        "The home appears broadly good, with the strongest pressure sitting in safeguarding follow-through rather than overall care quality.",
      overall_position_statement:
        "Evidence suggests a stable home with positive routines and improving leadership grip, but a few overdue actions are preventing a cleaner picture.",
      likely_inspector_focus:
        "Inspectors are likely to focus on how safeguarding follow-up and return-interview learning are tracked to completion.",
      immediate_priority_actions:
        "Clear overdue safeguarding-linked actions, refresh stale evidence and ensure manager commentary is current.",
    },
    prep72h: {
      home_id: homeId,
      inspection_pressure_level: "heightened",
      primary_focus_area: "Help and protection",
      top_concerns:
        "Return interviews, action closure and evidence freshness.",
      urgent_actions:
        "Complete open return-interview follow-up and refresh key evidence before any visit window.",
    },
    isFallback: true,
  };
}

function buildFallbackLegacyData() {
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
    complianceItems: [
      mapComplianceItem({
        id: "comp-1",
        title: "Medication audit follow-up",
        status: "overdue",
        severity: "high",
        due_date: minusDays(2),
        created_at: minusDays(8),
      }),
      mapComplianceItem({
        id: "comp-2",
        title: "Risk assessment review",
        status: "due_soon",
        severity: "medium",
        due_date: plusDays(3),
        created_at: minusDays(4),
      }),
      mapComplianceItem({
        id: "comp-3",
        title: "Key statutory record check",
        status: "review_due",
        severity: "medium",
        due_date: plusDays(5),
        created_at: minusDays(2),
      }),
    ],
    tasks: [
      mapTask({
        id: "task-1",
        title: "Update audit tracker",
        task_type: "quality",
        assigned_role: "Manager",
        due_date: plusDays(2),
        completed: false,
        created_at: minusDays(1),
      }),
      mapTask({
        id: "task-2",
        title: "Check document expiry dates",
        task_type: "compliance",
        assigned_role: "Deputy manager",
        due_date: plusDays(4),
        completed: false,
        created_at: minusDays(1),
      }),
    ],
    documents: [
      mapStatutoryDocument({
        id: "doc-1",
        title: "Statement of Purpose",
        document_type: "Statutory",
        status: "active",
        review_date: plusDays(30),
        created_at: minusDays(20),
      }),
      mapStatutoryDocument({
        id: "doc-2",
        title: "Annex A",
        document_type: "Statutory",
        status: "review_due",
        review_date: plusDays(6),
        created_at: minusDays(15),
      }),
      mapStatutoryDocument({
        id: "doc-3",
        title: "Medication procedure",
        document_type: "Policy",
        status: "expiring",
        expiry_date: plusDays(10),
        created_at: minusDays(12),
      }),
    ],
    isFallback: true,
  };
}

/* ------------------------------- row builders ------------------------------ */

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
        normaliseToken(item.status)
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
      normaliseToken(item.status)
    )
  ).length;

  const dueSoon = compliance.filter((item) =>
    ["due_soon", "due soon", "expiring"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const openTasks = tasks.filter((item) => !item.completed).length;

  const reviewDueDocs = documents.filter((item) => {
    const status = normaliseToken(item.status);
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

/* -------------------------------- renderers ------------------------------- */

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

function renderLegacyReadinessHtml({
  complianceItems = [],
  overdueItems = [],
  dueSoonItems = [],
  tasks = [],
  openTasks = [],
  documents = [],
  oversightRows = [],
  isFallback = false,
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
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview readiness data until live routes are available.</p>`
              : ""
          }
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

function renderStatCard(label, value, note = "", tone = "muted") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${toText(label)}</span>
      <strong class="overview-stat-value">${toText(value)}</strong>
      ${note ? `<span class="overview-stat-note ${toText(tone)}">${toText(note)}</span>` : ""}
    </article>
  `;
}

function renderBandChip(label, band, score) {
  const tone = getGradeTone(band);
  return `
    <article class="record-row">
      <div class="record-row-main">
        <div class="record-row-title">${toText(label)}</div>
        <div class="record-row-summary">${toText(formatBand(band))}</div>
      </div>
      <div class="record-row-side">
        <span class="row-pill ${toText(tone)}">${toText(formatNumber(score))}</span>
      </div>
    </article>
  `;
}

function renderHomeCards(cards = [], selectedHomeId = null) {
  if (!cards.length) {
    return renderEmptyState("No inspection readiness cards are available.");
  }

  return `
    <div class="record-list readiness-home-cards">
      ${cards
        .map((card) => {
          const isSelected = Number(card.home_id) === Number(selectedHomeId);
          return `
            <article
              class="record-row ${isSelected ? "active" : ""}"
              data-readiness-home-card="true"
              data-home-id="${toText(card.home_id)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(card.home_name)}</div>
                <div class="record-row-summary">
                  ${toText(formatBand(card.overall_band))} •
                  Score ${toText(formatNumber(card.overall_score))} •
                  Confidence ${toText(formatNumber(card.confidence_score))}
                </div>
                <div class="record-row-meta">
                  ${toText(
                    [
                      `${card.open_actions || 0} open actions`,
                      `${card.overdue_actions || 0} overdue`,
                      `${card.critical_actions || 0} critical`,
                    ].join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(getGradeTone(card.overall_band))}">
                  ${toText(formatBand(card.overall_band))}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSectionPanels(sections = []) {
  if (!sections.length) {
    return renderEmptyState("No judgement panels are available.");
  }

  return `
    <div class="overview-grid">
      ${sections
        .map(
          (section) => `
            <section class="overview-section-card">
              <div class="overview-section-head">
                <h3>${toText(section.section_name || formatBand(section.section_code))}</h3>
                <p>${toText(formatBand(section.score_band))} • Score ${toText(formatNumber(section.score_value))}</p>
              </div>
              <div class="record-list">
                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">Summary</div>
                    <div class="record-row-summary">${toText(section.summary_text || "No summary available.")}</div>
                  </div>
                </article>
                ${
                  section.strengths_text
                    ? `
                      <article class="record-row">
                        <div class="record-row-main">
                          <div class="record-row-title">Strengths</div>
                          <div class="record-row-summary">${toText(section.strengths_text)}</div>
                        </div>
                      </article>
                    `
                    : ""
                }
                ${
                  section.concerns_text
                    ? `
                      <article class="record-row">
                        <div class="record-row-main">
                          <div class="record-row-title">Concerns</div>
                          <div class="record-row-summary">${toText(section.concerns_text)}</div>
                        </div>
                      </article>
                    `
                    : ""
                }
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderReasonRows(reasons = []) {
  if (!reasons.length) {
    return renderEmptyState("No inspection reasons are available.");
  }

  return `
    <div class="record-list">
      ${reasons
        .map(
          (reason) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(reason.title || "Reason")}</div>
                <div class="record-row-summary">
                  ${toText(
                    [
                      reason.section_name || formatBand(reason.section_code),
                      reason.reason_type || "",
                      reason.priority ? `Priority ${reason.priority}` : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
                <div class="record-row-meta">${toText(reason.description || "No description available.")}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(
                  reason.reason_type === "limiting_factor"
                    ? "warning"
                    : reason.reason_type === "concern"
                    ? "warning"
                    : "muted"
                )}">
                  ${toText(reason.reason_type || "recorded")}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderActionRows(actions = []) {
  if (!actions.length) {
    return renderEmptyState("No open inspection actions are available.");
  }

  return `
    <div class="record-list">
      ${actions
        .map(
          (action) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(action.action_title || "Action")}</div>
                <div class="record-row-summary">
                  ${toText(
                    [
                      action.section_name || formatBand(action.section_code),
                      action.priority || "",
                      action.due_date ? `Due ${formatDate(action.due_date)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
                <div class="record-row-meta">
                  ${toText(
                    [
                      action.owner_user_name || action.owner_staff_name || "Unassigned",
                      action.recoverable_points_estimate
                        ? `Impact ${formatNumber(action.recoverable_points_estimate)}`
                        : "",
                      action.projected_section_band
                        ? `Projected ${formatBand(action.projected_section_band)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(
                  ["critical", "high"].includes(normaliseToken(action.priority))
                    ? "warning"
                    : "muted"
                )}">
                  ${toText(action.priority || "open")}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInspectionTaskRows(tasks = []) {
  if (!tasks.length) {
    return renderEmptyState("No linked inspection tasks are available.");
  }

  return `
    <div class="record-list">
      ${tasks
        .map(
          (task) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(task.task_title || task.action_title || "Task")}</div>
                <div class="record-row-summary">
                  ${toText(
                    [
                      task.action_title || "",
                      task.task_due_date ? `Due ${formatDate(task.task_due_date)}` : "",
                      task.assigned_user_name || task.assigned_role || "Unassigned",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(task.completed ? "positive" : "warning")}">
                  ${toText(task.completed ? "completed" : "open")}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBriefingPanel(briefing = null, prep72h = null) {
  if (!briefing && !prep72h) {
    return renderEmptyState("No inspection briefing is available.");
  }

  return `
    <section class="overview-section-card">
      <div class="overview-section-head">
        <h3>Manager briefing</h3>
        <p>Plain-English summary of the current inspection picture.</p>
      </div>
      <div class="record-list">
        ${
          briefing?.headline_summary
            ? `
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Headline</div>
                  <div class="record-row-summary">${toText(briefing.headline_summary)}</div>
                </div>
              </article>
            `
            : ""
        }
        ${
          briefing?.overall_position_statement
            ? `
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Overall position</div>
                  <div class="record-row-summary">${toText(briefing.overall_position_statement)}</div>
                </div>
              </article>
            `
            : ""
        }
        ${
          briefing?.likely_inspector_focus
            ? `
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Likely inspector focus</div>
                  <div class="record-row-summary">${toText(briefing.likely_inspector_focus)}</div>
                </div>
              </article>
            `
            : ""
        }
        ${
          briefing?.immediate_priority_actions
            ? `
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Immediate priority actions</div>
                  <div class="record-row-summary">${toText(briefing.immediate_priority_actions)}</div>
                </div>
              </article>
            `
            : ""
        }
        ${
          prep72h
            ? `
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">72-hour inspection focus</div>
                  <div class="record-row-summary">
                    ${toText(
                      [
                        prep72h.inspection_pressure_level,
                        prep72h.primary_focus_area,
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    )}
                  </div>
                  ${
                    prep72h.urgent_actions
                      ? `<div class="record-row-meta">${toText(prep72h.urgent_actions)}</div>`
                      : ""
                  }
                </div>
              </article>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function renderInspectionDetail({
  selectedCard,
  header,
  sections,
  reasons,
  actions,
  tasks,
  briefing,
  prep72h,
}) {
  if (!header && !selectedCard) {
    return renderEmptyState("No inspection detail is available for this home.");
  }

  const detail = header || selectedCard || {};
  const topBand = detail.overall_band;
  const topScore = detail.overall_score;
  const confidenceScore = detail.confidence_score;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Inspection readiness</div>
          <h2>${toText(detail.home_name || getScopeTitle())}</h2>
          <p>
            ${toText(
              detail.top_concerns ||
                detail.narrative_summary ||
                "Live inspection readiness, actions, and likely areas of inspector focus."
            )}
          </p>
        </div>
        <div class="overview-panel-actions">
          <button class="btn btn-secondary" data-readiness-sync="true">Sync actions</button>
          <button class="btn btn-primary" data-readiness-refresh="true">Refresh inspection cycle</button>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Overall band", formatBand(topBand), `Score ${formatNumber(topScore)}`, getGradeTone(topBand))}
        ${renderStatCard("Confidence", formatNumber(confidenceScore), "Inspection confidence", getConfidenceTone(confidenceScore))}
        ${renderStatCard("Open actions", detail.open_actions || actions.length || 0, `${detail.overdue_actions || 0} overdue`, Number(detail.overdue_actions || 0) > 0 ? "warning" : "muted")}
        ${renderStatCard("Critical actions", detail.critical_actions || 0, `${detail.open_lines_of_enquiry || 0} open lines of enquiry`, Number(detail.critical_actions || 0) > 0 ? "warning" : "muted")}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Judgement areas</h3>
              <p>Current position across the three main inspection domains.</p>
            </div>
            <div class="record-list">
              ${renderBandChip("Experiences and progress", detail.experiences_band, detail.experiences_score)}
              ${renderBandChip("Helped and protected", detail.helped_band, detail.helped_score)}
              ${renderBandChip("Leadership and management", detail.leadership_band, detail.leadership_score)}
            </div>
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Judgement summaries</h3>
              <p>Section-level narrative, strengths, and concerns.</p>
            </div>
            ${renderSectionPanels(sections)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Top inspection reasons</h3>
              <p>Why the home is currently graded this way.</p>
            </div>
            ${renderReasonRows(reasons)}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Best next actions</h3>
              <p>Ordered by likely impact on the inspection picture.</p>
            </div>
            ${renderActionRows(actions)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked tasks</h3>
              <p>Operational tasks connected to inspection improvement work.</p>
            </div>
            ${renderInspectionTaskRows(tasks)}
          </section>

          <section class="overview-side-card">
            ${renderBriefingPanel(briefing, prep72h)}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderInspectionWorkspace({
  cards,
  selectedCard,
  header,
  sections,
  reasons,
  actions,
  tasks,
  briefing,
  prep72h,
}) {
  return `
    <div class="overview-grid">
      <section class="overview-main">
        <section class="overview-section-card">
          <div class="overview-section-head">
            <h3>Homes</h3>
            <p>Live inspection readiness across available homes.</p>
          </div>
          ${renderHomeCards(cards, selectedCard?.home_id || state.readinessSelectedHomeId)}
        </section>
      </section>
    </div>
    ${renderInspectionDetail({
      selectedCard,
      header,
      sections,
      reasons,
      actions,
      tasks,
      briefing,
      prep72h,
    })}
  `;
}

/* --------------------------- endpoint resolution -------------------------- */

function getInspectionEndpoints(homeId) {
  const base = buildInspectionUiEndpoints(homeId);

  if (!base?.homeId) return null;

  return {
    ...base,

    // official config-backed endpoints
    homeCards: "/inspection/ui/home-cards",
    homeHeader: `/inspection/ui/homes/${base.homeId}/header`,
    sectionPanels: `/inspection/ui/homes/${base.homeId}/sections`,
    reasons: `/inspection/ui/homes/${base.homeId}/reasons`,
    actions: `/inspection/ui/homes/${base.homeId}/actions`,
    tasks: `/inspection/ui/homes/${base.homeId}/tasks`,
    briefing: `/inspection/ui/homes/${base.homeId}/briefing`,
    prep72h: `/inspection/ui/homes/${base.homeId}/prep-72h`,

    // optional actions
    refreshCycle: `/inspection/ui/homes/${base.homeId}/refresh`,
    syncTasks: `/inspection/ui/homes/${base.homeId}/sync-tasks`,
  };
}

function getLegacyReadinessEndpoints() {
  const scope = getCurrentScope();
  const id = getScopeEntityId();

  if (!id) {
    return null;
  }

  if (scope === "home" || scope === "quality") {
    return {
      compliance: `/homes/${id}/compliance`,
      documents: `/homes/${id}/documents`,
      tasks: `/homes/${id}/tasks`,
    };
  }

  return {
    compliance: `/young-people/${id}/compliance`,
    tasks: `/young-people/${id}/tasks`,
    documents: `/young-people/${id}/documents`,
  };
}

/* ----------------------------- summary helpers ---------------------------- */

function updateReadinessSummaryFromInspection(
  detail = {},
  actions = [],
  tasks = [],
  isFallback = false
) {
  const nextDue =
    actions.find((item) => item.due_date)?.due_date ||
    tasks.find((item) => item.task_due_date)?.task_due_date ||
    detail.next_action_due_date ||
    null;

  updateWorkspaceSummaryStrip({
    today: isFallback
      ? `${formatBand(detail.overall_band || "unknown")} • preview mode`
      : `${formatBand(detail.overall_band || "unknown")} • Score ${formatNumber(detail.overall_score)}`,
    nextEvent: nextDue
      ? `Next action due ${formatDate(nextDue)}`
      : "No immediate inspection deadline",
    lastRecord: detail.top_concerns || "No major concerns recorded",
    openActions: `${detail.open_actions || actions.length || 0} open • ${detail.overdue_actions || 0} overdue`,
  });
}

function updateReadinessSummaryFromLegacy({
  overdueItems = [],
  dueSoonItems = [],
  openTasks = [],
  oversightRows = [],
  documents = [],
  isFallback = false,
}) {
  const nextDeadline =
    overdueItems[0] ||
    dueSoonItems[0] ||
    openTasks[0] ||
    documents[0] ||
    null;

  updateWorkspaceSummaryStrip({
    today: isFallback
      ? `${overdueItems.length} overdue • preview mode`
      : `${overdueItems.length} overdue • ${openTasks.length} open actions`,
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
}

/* -------------------------- inspection data flow -------------------------- */

function chooseSelectedHome(cards = []) {
  const currentHomeId = getHomeId();
  const selectedHomeId =
    state.readinessSelectedHomeId ||
    currentHomeId ||
    cards[0]?.home_id ||
    null;

  const selectedCard =
    cards.find((card) => Number(card.home_id) === Number(selectedHomeId)) ||
    cards[0] ||
    null;

  if (selectedCard?.home_id) {
    state.readinessSelectedHomeId = selectedCard.home_id;
  }

  return selectedCard;
}

async function tryLoadInspectionReadiness() {
  const homeId = getHomeId();
  const scope = getCurrentScope();

  if (!homeId || (scope !== "home" && scope !== "quality")) {
    return null;
  }

  const endpoints = getInspectionEndpoints(homeId);
  if (!endpoints) return null;

  const safeRead = (url) =>
    url ? apiGet(url).catch(() => null) : Promise.resolve(null);

  const [
    cardsRes,
    headerRes,
    sectionsRes,
    reasonsRes,
    actionsRes,
    tasksRes,
    briefingRes,
    prepRes,
  ] = await Promise.all([
    safeRead(endpoints.homeCards),
    safeRead(endpoints.homeHeader),
    safeRead(endpoints.sectionPanels),
    safeRead(endpoints.reasons),
    safeRead(endpoints.actions),
    safeRead(endpoints.tasks),
    safeRead(endpoints.briefing),
    safeRead(endpoints.prep72h),
  ]);

  const cards = dedupeBy(
    normaliseApiRows(cardsRes),
    (row) => `card:${row.home_id}:${row.scored_at || row.updated_at || ""}`
  );

  const selectedCard = chooseSelectedHome(cards);

  const headerRows = normaliseApiRows(headerRes).map(mapInspectionHeader);
  const sectionRows = normaliseApiRows(sectionsRes).map(mapInspectionSectionPanel);
  const reasonRows = normaliseApiRows(reasonsRes).map(mapInspectionReason);
  const actionRows = normaliseApiRows(actionsRes).map(mapInspectionAction);
  const taskRows = normaliseApiRows(tasksRes).map(mapInspectionTask);
  const briefingRows = normaliseApiRows(briefingRes).map(mapInspectionBriefing);
  const prepRows = normaliseApiRows(prepRes).map(mapInspectionPrep72Hour);

  const targetHomeId = selectedCard?.home_id || homeId;

  const header =
    headerRows.find((row) => Number(row.home_id) === Number(targetHomeId)) ||
    headerRows[0] ||
    selectedCard ||
    null;

  const sections = sectionRows.filter(
    (row) => Number(row.home_id) === Number(targetHomeId)
  );

  const reasons = sortNewestFirst(
    reasonRows.filter((row) => Number(row.home_id) === Number(targetHomeId)),
    ["priority", "created_at"]
  );

  const actions = sortSoonestFirst(
    actionRows.filter((row) => Number(row.home_id) === Number(targetHomeId)),
    ["due_date", "created_at"]
  );

  const tasks = sortSoonestFirst(
    taskRows.filter((row) => Number(row.home_id) === Number(targetHomeId)),
    ["task_due_date", "action_due_date", "task_created_at", "created_at"]
  );

  const briefing =
    briefingRows.find((row) => Number(row.home_id) === Number(targetHomeId)) ||
    briefingRows[0] ||
    null;

  const prep72h =
    prepRows.find((row) => Number(row.home_id) === Number(targetHomeId)) ||
    prepRows[0] ||
    null;

  const hasInspectionData =
    cards.length ||
    header ||
    sections.length ||
    reasons.length ||
    actions.length ||
    tasks.length ||
    briefing ||
    prep72h;

  if (!hasInspectionData) {
    const fallback = buildFallbackInspectionData(homeId);
    return {
      ...fallback,
      selectedCard: fallback.cards[0] || null,
      endpoints,
    };
  }

  return {
    cards,
    selectedCard,
    header,
    sections,
    reasons,
    actions,
    tasks,
    briefing,
    prep72h,
    endpoints,
    isFallback: false,
  };
}

/* ---------------------------- legacy data flow ---------------------------- */

async function loadLegacyReadiness() {
  const endpoints = getLegacyReadinessEndpoints();

  if (!endpoints) {
    renderNoContext();
    return;
  }

  const [complianceData, tasksData, documentsData] = await Promise.all([
    apiGet(endpoints.compliance).catch(() => ({ items: [] })),
    endpoints.tasks
      ? apiGet(endpoints.tasks).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
    apiGet(endpoints.documents).catch(() => ({ items: [] })),
  ]);

  let complianceItems = sortSoonestFirst(
    (
      complianceData.items ||
      complianceData.records ||
      complianceData.compliance_items ||
      []
    ).map(mapComplianceItem),
    ["due_date", "created_at"]
  );

  let tasks = sortSoonestFirst(
    (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
    ["due_date", "created_at"]
  );

  let documents = sortNewestFirst(
    (
      documentsData.items ||
      documentsData.records ||
      documentsData.documents ||
      documentsData.statutory_documents ||
      []
    ).map(mapStatutoryDocument),
    ["review_date", "expiry_date", "created_at"]
  );

  let isFallback = false;

  if (!complianceItems.length && !tasks.length && !documents.length) {
    const fallback = buildFallbackLegacyData();
    complianceItems = fallback.complianceItems;
    tasks = fallback.tasks;
    documents = fallback.documents;
    isFallback = true;
  }

  const overdueItems = complianceItems.filter((item) =>
    ["overdue", "escalated", "missing", "review_due"].includes(
      normaliseToken(item.status)
    )
  );

  const dueSoonItems = complianceItems.filter((item) =>
    ["due_soon", "due soon", "expiring"].includes(
      String(item.status || "").toLowerCase()
    )
  );

  const openTasks = tasks.filter((item) => !item.completed);
  const oversightRows = buildOversightRows(complianceItems, tasks);

  els.viewContent.innerHTML = renderLegacyReadinessHtml({
    complianceItems,
    overdueItems,
    dueSoonItems,
    tasks,
    openTasks,
    documents,
    oversightRows,
    isFallback,
  });

  updateReadinessSummaryFromLegacy({
    overdueItems,
    dueSoonItems,
    openTasks,
    oversightRows,
    documents,
    isFallback,
  });
}

/* -------------------------------- bindings -------------------------------- */

function bindInspectionReadinessEvents(endpoints) {
  if (!els.viewContent || !endpoints) return;

  els.viewContent
    .querySelectorAll("[data-readiness-home-card]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const homeId = Number(button.dataset.homeId || 0);
        if (!homeId) return;
        state.readinessSelectedHomeId = homeId;
        await loadReadiness();
      });
    });

  const refreshButton = els.viewContent.querySelector(
    "[data-readiness-refresh='true']"
  );
  if (refreshButton && endpoints.refreshCycle) {
    refreshButton.addEventListener("click", async () => {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing...";
      try {
        await apiSend(endpoints.refreshCycle, "POST", {}, {
          invalidatePrefixes: [
            "/inspection/ui",
            `/inspection/ui/homes/${Number(
              state.readinessSelectedHomeId || getHomeId()
            )}`,
            "/homes/",
          ],
        });
        await loadReadiness();
      } catch (error) {
        console.error("Failed to refresh inspection cycle", error);
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "Refresh inspection cycle";
      }
    });
  }

  const syncButton = els.viewContent.querySelector("[data-readiness-sync='true']");
  if (syncButton && endpoints.syncTasks) {
    syncButton.addEventListener("click", async () => {
      syncButton.disabled = true;
      syncButton.textContent = "Syncing...";
      try {
        await apiSend(endpoints.syncTasks, "POST", {}, {
          invalidatePrefixes: [
            "/inspection/ui",
            `/inspection/ui/homes/${Number(
              state.readinessSelectedHomeId || getHomeId()
            )}`,
            "/homes/",
            "/tasks",
          ],
        });
        await loadReadiness();
      } catch (error) {
        console.error("Failed to sync readiness tasks", error);
      } finally {
        syncButton.disabled = false;
        syncButton.textContent = "Sync actions";
      }
    });
  }
}

/* -------------------------------- states --------------------------------- */

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening readiness."
      : "A home context is needed before readiness can load.";

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message)}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No readiness context",
    nextEvent: "No deadline loaded",
    lastRecord: "No readiness data",
    openActions: "No actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading readiness...</p>
      </div>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading readiness",
    nextEvent: "Checking deadlines",
    lastRecord: "Loading latest readiness output",
    openActions: "Loading actions",
  });
}

/* -------------------------------- public --------------------------------- */

export async function loadCurrentView() {
  return loadReadiness();
}

export async function loadReadiness() {
  if (!els.viewContent) return;

  if (!getScopeEntityId()) {
    renderNoContext();
    return;
  }

  renderLoadingState();

  try {
    const inspectionData = await tryLoadInspectionReadiness();

    if (
      inspectionData &&
      (getCurrentScope() === "home" || getCurrentScope() === "quality")
    ) {
      els.viewContent.innerHTML = renderInspectionWorkspace(inspectionData);

      updateReadinessSummaryFromInspection(
        inspectionData.header || inspectionData.selectedCard || {},
        inspectionData.actions || [],
        inspectionData.tasks || [],
        inspectionData.isFallback
      );

      bindInspectionReadinessEvents(inspectionData.endpoints);
      return;
    }

    await loadLegacyReadiness();
  } catch (error) {
    console.error("Failed to load readiness", error);

    try {
      await loadLegacyReadiness();
    } catch (legacyError) {
      els.viewContent.innerHTML = `
        <section class="overview-panel">
          ${renderEmptyState(
            legacyError.message || error.message || "Failed to load readiness."
          )}
        </section>
      `;

      updateWorkspaceSummaryStrip({
        today: "Readiness unavailable",
        nextEvent: "Unable to load",
        lastRecord: "No readiness data",
        openActions: "Check API routes",
      });
    }
  }
}
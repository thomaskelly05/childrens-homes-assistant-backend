import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
} from "../core/utils.js";
import { buildInspectionUiEndpoints } from "../core/config.js";
import {
  mapInspectionHomeCard,
  mapInspectionHeader,
  mapInspectionSectionPanel,
  mapInspectionReason,
  mapInspectionAction,
  mapInspectionTask,
  mapInspectionBriefing,
  mapInspection72Hour,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
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
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function toTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
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
  if (Array.isArray(data.rows) && data.rows.length > 0) return true;
  if (Array.isArray(data.cards) && data.cards.length > 0) return true;
  if (Array.isArray(data.sections) && data.sections.length > 0) return true;
  if (Array.isArray(data.reasons) && data.reasons.length > 0) return true;
  if (Array.isArray(data.actions) && data.actions.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.audits) && data.audits.length > 0) return true;
  if (Array.isArray(data.incidents) && data.incidents.length > 0) return true;
  if (Array.isArray(data.safeguarding) && data.safeguarding.length > 0) return true;
  if (Array.isArray(data.compliance) && data.compliance.length > 0) return true;
  if (Array.isArray(data.compliance_items) && data.compliance_items.length > 0) return true;
  if (Array.isArray(data.reports) && data.reports.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.quality_summary && typeof data.quality_summary === "object") return true;
  if (typeof data.audit_score !== "undefined") return true;
  if (typeof data.quality_score !== "undefined") return true;
  if (typeof data.overall_score !== "undefined") return true;
  return false;
}

function getStatusTone(status = "") {
  const normalised = normaliseToken(status);

  if (
    [
      "overdue",
      "high",
      "critical",
      "escalated",
      "missing",
      "non_compliant",
      "failed",
      "danger",
      "open",
      "blocked",
      "inadequate",
      "limiting_factor",
      "concern",
      "requires_improvement",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due",
      "due_soon",
      "warning",
      "medium",
      "review_due",
      "attention",
      "at_risk",
      "planned",
      "received",
      "sent",
      "in_progress",
      "good",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "completed",
      "active",
      "booked",
      "compliant",
      "ok",
      "passed",
      "resolved",
      "closed",
      "reviewed",
      "current",
      "outstanding",
      "strength",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
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

function renderEmptyState(message = "Nothing to show right now.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>Nothing to show</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
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
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.name ||
            item?.audit_name ||
            item?.staff_member ||
            item?.category ||
            item?.type ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.finding ||
            item?.outcome ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
              data-title="${safeText(title)}"
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

function renderInsightCards(items = []) {
  if (!items.length) {
    return renderEmptyState(
      "Quality insights will appear here as audits, inspection data and compliance activity build up."
    );
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

function renderInspectionBandCards(detail = {}) {
  return `
    <div class="record-list">
      <article class="record-row">
        <div class="record-row-main">
          <div class="record-row-title">Experiences and progress</div>
          <div class="record-row-summary">Current inspection judgement area</div>
        </div>
        <div class="record-row-side">
          <span class="row-pill ${safeText(getBandTone(detail.experiences_band))}">
            ${safeText(formatBand(detail.experiences_band))}
          </span>
        </div>
      </article>

      <article class="record-row">
        <div class="record-row-main">
          <div class="record-row-title">Helped and protected</div>
          <div class="record-row-summary">Current inspection judgement area</div>
        </div>
        <div class="record-row-side">
          <span class="row-pill ${safeText(getBandTone(detail.helped_band))}">
            ${safeText(formatBand(detail.helped_band))}
          </span>
        </div>
      </article>

      <article class="record-row">
        <div class="record-row-main">
          <div class="record-row-title">Leadership and management</div>
          <div class="record-row-summary">Current inspection judgement area</div>
        </div>
        <div class="record-row-side">
          <span class="row-pill ${safeText(getBandTone(detail.leadership_band))}">
            ${safeText(formatBand(detail.leadership_band))}
          </span>
        </div>
      </article>
    </div>
  `;
}

function renderSectionPanels(items = []) {
  if (!items.length) {
    return renderEmptyState("No inspection section panels are available.");
  }

  return `
    <div class="overview-grid overview-grid--cards">
      ${items
        .map(
          (item) => `
            <section class="overview-section-card">
              <div class="overview-section-head">
                <h3>${safeText(item.section_name || formatBand(item.section_code))}</h3>
                <p>
                  ${safeText(formatBand(item.score_band))}${
                    item.score_value !== null && item.score_value !== undefined
                      ? ` • Score ${safeText(item.score_value)}`
                      : ""
                  }
                </p>
              </div>
              <div class="record-list">
                <article class="record-row">
                  <div class="record-row-main">
                    <div class="record-row-title">Summary</div>
                    <div class="record-row-summary">${safeText(
                      item.summary_text || "No summary available."
                    )}</div>
                  </div>
                </article>
                ${
                  item.strengths_text
                    ? `
                      <article class="record-row">
                        <div class="record-row-main">
                          <div class="record-row-title">Strengths</div>
                          <div class="record-row-summary">${safeText(item.strengths_text)}</div>
                        </div>
                      </article>
                    `
                    : ""
                }
                ${
                  item.concerns_text
                    ? `
                      <article class="record-row">
                        <div class="record-row-main">
                          <div class="record-row-title">Concerns</div>
                          <div class="record-row-summary">${safeText(item.concerns_text)}</div>
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

function renderInspectionHomes(items = [], selectedHomeId) {
  if (!items.length) {
    return renderEmptyState("No home inspection cards are available.");
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const isSelected =
            Number(item.home_id) === Number(selectedHomeId);

          return `
            <article
              class="record-row ${isSelected ? "active" : ""}"
              data-quality-home-card="true"
              data-home-id="${safeText(item.home_id)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(item.home_name)}</div>
                <div class="record-row-summary">
                  ${safeText(formatBand(item.overall_band))} •
                  Score ${safeText(item.overall_score)} •
                  Confidence ${safeText(item.confidence_score)}
                </div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      `${item.open_actions || 0} open actions`,
                      `${item.overdue_actions || 0} overdue`,
                      `${item.critical_actions || 0} critical`,
                    ].join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(getBandTone(item.overall_band))}">
                  ${safeText(formatBand(item.overall_band))}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildInspectionInsights({
  detail = {},
  reasons = [],
  actions = [],
  tasks = [],
  sections = [],
}) {
  const items = [];

  if (detail.top_concerns) {
    items.push({
      title: "Top concern",
      summary: detail.top_concerns,
    });
  }

  const criticalActions = actions.filter((item) =>
    ["critical", "high"].includes(normaliseToken(item.priority))
  ).length;

  if (criticalActions) {
    items.push({
      title: "Action pressure",
      summary: `${criticalActions} high-priority inspection action${
        criticalActions === 1 ? "" : "s"
      } need attention.`,
    });
  }

  const limitingFactors = reasons.filter((item) =>
    ["limiting_factor", "concern"].includes(normaliseToken(item.reason_type))
  ).length;

  if (limitingFactors) {
    items.push({
      title: "Limiting factors",
      summary: `${limitingFactors} inspection reason${
        limitingFactors === 1 ? "" : "s"
      } are currently limiting the judgement picture.`,
    });
  }

  const incompleteTasks = tasks.filter((item) => !item.completed).length;
  if (incompleteTasks) {
    items.push({
      title: "Operational follow-through",
      summary: `${incompleteTasks} linked inspection task${
        incompleteTasks === 1 ? "" : "s"
      } remain open.`,
    });
  }

  const weakSections = sections.filter((item) =>
    ["requires_improvement", "inadequate"].includes(normaliseToken(item.score_band))
  ).length;

  if (weakSections) {
    items.push({
      title: "Judgement pressure",
      summary: `${weakSections} judgement area${
        weakSections === 1 ? "" : "s"
      } are below good.`,
    });
  }

  if (!items.length) {
    items.push({
      title: "No major inspection pressure surfaced",
      summary:
        "The current inspection view is not surfacing immediate critical concerns.",
    });
  }

  return items.slice(0, 6);
}

function buildFallbackInsights({
  audits = [],
  incidents = [],
  safeguarding = [],
  compliance = [],
}) {
  const items = [];

  const overdueAuditCount = audits.filter((item) =>
    ["overdue", "due_soon", "review_due"].includes(normaliseToken(item.status))
  ).length;

  if (overdueAuditCount) {
    items.push({
      title: "Audit pressure",
      summary: `${overdueAuditCount} audit item${
        overdueAuditCount === 1 ? "" : "s"
      } due or overdue.`,
    });
  }

  const restrictivePractice = incidents.filter((item) =>
    /restraint|physical intervention|hold/i.test(
      String(item.incident_type || item.title || item.description || "")
    )
  ).length;

  if (restrictivePractice) {
    items.push({
      title: "Restrictive practice pattern",
      summary: `${restrictivePractice} recent incident${
        restrictivePractice === 1 ? "" : "s"
      } mention restraint or physical intervention.`,
    });
  }

  const openSafeguarding = safeguarding.filter((item) =>
    !["closed", "completed", "resolved"].includes(normaliseToken(item.status))
  ).length;

  if (openSafeguarding) {
    items.push({
      title: "Safeguarding oversight",
      summary: `${openSafeguarding} safeguarding concern${
        openSafeguarding === 1 ? "" : "s"
      } remain open.`,
    });
  }

  const nonCompliant = compliance.filter((item) =>
    ["overdue", "non_compliant", "due_soon", "missing"].includes(
      normaliseToken(item.status)
    )
  ).length;

  if (nonCompliant) {
    items.push({
      title: "Compliance risk",
      summary: `${nonCompliant} compliance item${
        nonCompliant === 1 ? "" : "s"
      } need action or assurance.`,
    });
  }

  if (!items.length) {
    items.push({
      title: "No critical themes showing",
      summary:
        "The dashboard is not currently surfacing major audit, incident or compliance pressure.",
    });
  }

  return items.slice(0, 6);
}

function renderInspectionDashboardHtml({
  title,
  cards = [],
  selectedHomeId = null,
  detail = {},
  sectionPanels = [],
  reasons = [],
  actions = [],
  tasks = [],
  briefing = null,
  prep72h = null,
  topStats = [],
  insightItems = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Quality and inspection</div>
          <h2>${safeText(title)}</h2>
          <p>
            ${safeText(
              detail.narrative_summary ||
                detail.top_concerns ||
                "A live view of inspection readiness, judgement pressure, actions and operational follow-through."
            )}
          </p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Available homes</h3>
              <p>Inspection position across homes you can currently access.</p>
            </div>
            ${renderInspectionHomes(cards, selectedHomeId)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Inspection insights</h3>
              <p>Current themes rising from the inspection picture.</p>
            </div>
            ${renderInsightCards(insightItems)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Overall judgement picture</h3>
              <p>Live headline across the three main judgement areas.</p>
            </div>
            ${renderInspectionBandCards(detail)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Section summaries</h3>
              <p>Detailed section-level strengths, concerns and narrative.</p>
            </div>
            ${renderSectionPanels(sectionPanels)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Inspection reasons</h3>
              <p>The lines of evidence driving the current picture.</p>
            </div>
            ${renderRows(reasons, {
              emptyMessage: "No inspection reasons are available.",
              titleKey: "title",
              summaryKey: "description",
              recordType: "inspection_reason",
              metaBuilder: (item) =>
                [
                  item.section_name || formatBand(item.section_code),
                  item.reason_type ? formatBand(item.reason_type) : "",
                  item.priority ? `Priority ${item.priority}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "reason_type",
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Best next actions</h3>
              <p>Inspection improvement actions ordered for practical follow-up.</p>
            </div>
            ${renderRows(actions, {
              emptyMessage: "No inspection improvement actions are available.",
              titleKey: "action_title",
              summaryKey: "action_description",
              recordType: "inspection_action",
              metaBuilder: (item) =>
                [
                  item.section_name || formatBand(item.section_code),
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                  item.owner_user_name || item.owner_staff_name || "Unassigned",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "priority",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked operational tasks</h3>
              <p>Tasks already synced or linked to inspection improvement work.</p>
            </div>
            ${renderRows(tasks, {
              emptyMessage: "No linked inspection tasks are available.",
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
              statusKey: "status",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Manager briefing</h3>
              <p>Plain-English summary and 72-hour focus.</p>
            </div>
            ${
              briefing || prep72h
                ? `
                  <div class="record-list">
                    ${
                      briefing?.headline_summary
                        ? `
                          <article class="record-row">
                            <div class="record-row-main">
                              <div class="record-row-title">Headline</div>
                              <div class="record-row-summary">${safeText(
                                briefing.headline_summary
                              )}</div>
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
                              <div class="record-row-summary">${safeText(
                                briefing.overall_position_statement
                              )}</div>
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
                              <div class="record-row-summary">${safeText(
                                briefing.likely_inspector_focus
                              )}</div>
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
                              <div class="record-row-summary">${safeText(
                                briefing.immediate_priority_actions
                              )}</div>
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
                              <div class="record-row-title">72-hour focus</div>
                              <div class="record-row-summary">${safeText(
                                [
                                  prep72h.inspection_pressure_level,
                                  prep72h.primary_focus_area,
                                ]
                                  .filter(Boolean)
                                  .join(" • ")
                              )}</div>
                              ${
                                prep72h.urgent_actions
                                  ? `<div class="record-row-meta">${safeText(prep72h.urgent_actions)}</div>`
                                  : ""
                              }
                            </div>
                          </article>
                        `
                        : ""
                    }
                  </div>
                `
                : renderEmptyState("No manager briefing is available.")
            }
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderFallbackQualityDashboardHtml({
  title = "Quality and RI dashboard",
  topStats = [],
  insightItems = [],
  auditItems = [],
  incidentItems = [],
  safeguardingItems = [],
  complianceItems = [],
  reportItems = [],
  openActions = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Quality and RI</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across audits, incidents, safeguarding, compliance, reports and service quality themes.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Quality insights</h3>
              <p>The biggest themes rising from audits, incidents and compliance activity.</p>
            </div>
            ${renderInsightCards(insightItems)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Audits and checks</h3>
              <p>Recent and upcoming audit activity across the service.</p>
            </div>
            ${renderRows(auditItems, {
              emptyMessage: "No audit records found.",
              titleKey: "audit_name",
              summaryKey: "finding",
              recordType: "audit",
              metaBuilder: (item) =>
                [
                  item.auditor || "",
                  item.audit_date ? formatDate(item.audit_date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open actions</h3>
              <p>Actions raised through quality, compliance and oversight activity.</p>
            </div>
            ${renderRows(openActions, {
              emptyMessage: "No open quality actions found.",
              titleKey: "title",
              summaryKey: "task",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.assigned_role || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Reports and review outputs</h3>
              <p>Recent management and quality outputs.</p>
            </div>
            ${renderRows(reportItems, {
              emptyMessage: "No reports found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "report",
              metaBuilder: (item) =>
                [
                  item.report_type || "",
                  item.created_at ? formatDateTime(item.created_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Compliance pressure</h3>
              <p>Items at risk, due soon or overdue.</p>
            </div>
            ${renderRows(complianceItems, {
              emptyMessage: "No compliance pressure items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Safeguarding oversight</h3>
              <p>Current concerns and oversight activity.</p>
            </div>
            ${renderRows(safeguardingItems, {
              emptyMessage: "No safeguarding records found.",
              titleKey: "safeguarding_category",
              summaryKey: "concern_details",
              recordType: "safeguarding",
              metaBuilder: (item) =>
                [
                  item.concern_datetime ? formatDateTime(item.concern_datetime) : "",
                  item.referral_made ? "Referral made" : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Incident themes</h3>
              <p>Recent incidents that need quality attention.</p>
            </div>
            ${renderRows(incidentItems, {
              emptyMessage: "No recent incidents found.",
              titleKey: "incident_type",
              summaryKey: "description",
              recordType: "incident",
              metaBuilder: (item) =>
                [
                  item.location || "",
                  item.incident_datetime ? formatDateTime(item.incident_datetime) : "",
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
          <div class="empty-state-icon" aria-hidden="true">▦</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the quality dashboard can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No quality context",
    nextEvent: "No audit event loaded",
    lastRecord: "No quality data",
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
          <p>Loading quality dashboard…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading quality view",
    nextEvent: "Checking next audit",
    lastRecord: "Loading latest quality record",
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
          <h3>Failed to load quality dashboard</h3>
          <p>${safeText(message || "The quality dashboard could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Quality dashboard unavailable",
    nextEvent: "No event loaded",
    lastRecord: "No record loaded",
    openActions: "No actions loaded",
  });
}

function normaliseQualitySummary(data = {}) {
  return data.summary || data.quality_summary || data.dashboard || data || {};
}

function normaliseAuditItems(data = {}) {
  return toArray(data.items, [data.audits, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    audit_name: item.audit_name || item.title || item.name || "Audit",
    finding: item.finding || item.summary || item.notes || "Audit recorded.",
    status: item.status || "recorded",
    audit_date: item.audit_date || item.review_date || item.created_at || null,
    auditor: item.auditor || item.owner || "",
    record_type: item.record_type || "audit",
  }));
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.incidents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    incident_type: item.incident_type || item.title || "Incident",
    description:
      item.description || item.summary || item.notes || "Incident recorded.",
    location: item.location || "",
    status: item.status || item.manager_review_status || "recorded",
    incident_datetime: item.incident_datetime || item.created_at || null,
    record_type: item.record_type || "incident",
  }));
}

function normaliseSafeguardingItems(data = {}) {
  return toArray(data.items, [data.safeguarding, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    safeguarding_category:
      item.safeguarding_category || item.title || item.category || "Safeguarding",
    concern_details:
      item.concern_details ||
      item.summary ||
      item.notes ||
      "Safeguarding concern recorded.",
    concern_datetime: item.concern_datetime || item.created_at || null,
    referral_made: Boolean(item.referral_made),
    status: item.status || item.manager_review_status || "open",
    record_type: item.record_type || "safeguarding",
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.task || "Task",
    task: item.task || item.summary || item.title || "Task",
    assigned_role: item.assigned_role || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    record_type: item.record_type || "task",
  }));
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance, data.compliance_items, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.area || "Compliance item",
    summary:
      item.summary ||
      item.notes ||
      `${item.status || "Status recorded"}${item.due_date ? ` • Due ${formatDate(item.due_date)}` : ""}`,
    area: item.area || "",
    review_date: item.review_date || item.due_date || null,
    due_date: item.due_date || item.review_date || null,
    severity: item.severity || "",
    status: item.status || "recorded",
    record_type: item.record_type || "compliance",
  }));
}

function normaliseReportItems(data = {}) {
  return toArray(data.items, [data.reports, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.report_type || "Report",
    summary: item.summary || item.notes || item.report_text || "Report recorded.",
    report_type: item.report_type || "",
    status: item.status || "completed",
    created_at: item.created_at || item.updated_at || null,
    updated_at: item.updated_at || null,
    record_type: item.record_type || "report",
  }));
}

function buildFallbackTopStats({
  summary = {},
  audits = [],
  incidents = [],
  safeguarding = [],
  openActions = [],
  compliancePressure = [],
}) {
  const overdueAudits = audits.filter((item) =>
    ["overdue", "due_soon", "review_due"].includes(normaliseToken(item.status))
  ).length;

  const recentIncidents = incidents.filter((item) => {
    const when = item.incident_datetime || item.created_at || item.updated_at;
    if (!when) return false;
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  const safeguardingOpen = safeguarding.filter((item) =>
    !["closed", "completed", "resolved"].includes(normaliseToken(item.status))
  ).length;

  const score = toNumber(summary.audit_score ?? summary.quality_score, 0);

  return [
    {
      label: "Audit score",
      value: score,
      note: "Current quality score",
      tone: score >= 85 ? "success" : score >= 70 ? "warning" : "danger",
    },
    {
      label: "Audits due",
      value: overdueAudits,
      note: "Reviews due or overdue",
      tone: overdueAudits ? "warning" : "success",
    },
    {
      label: "Recent incidents",
      value: recentIncidents,
      note: "Last 30 days",
      tone: recentIncidents > 10 ? "warning" : "muted",
    },
    {
      label: "Open safeguarding",
      value: safeguardingOpen,
      note: "Concerns needing oversight",
      tone: safeguardingOpen ? "danger" : "success",
    },
    {
      label: "Compliance pressure",
      value: compliancePressure.length,
      note: "Items needing assurance",
      tone: compliancePressure.length ? "warning" : "success",
    },
    {
      label: "Open actions",
      value: openActions.length,
      note: "Quality follow-up actions",
      tone: openActions.length ? "warning" : "success",
    },
  ];
}

function buildInspectionTopStats({
  detail = {},
  actions = [],
  reasons = [],
  tasks = [],
}) {
  const overallScore = toNumber(detail.overall_score, 0);
  const confidenceScore = toNumber(detail.confidence_score, 0);
  const openActions = toNumber(detail.open_actions, actions.length);
  const overdueActions = toNumber(detail.overdue_actions, 0);
  const criticalActions = toNumber(detail.critical_actions, 0);
  const openReasons = reasons.length;
  const openTasks = tasks.filter((item) => !item.completed).length;

  return [
    {
      label: "Overall band",
      value: formatBand(detail.overall_band),
      note: `Score ${overallScore || 0}`,
      tone: getBandTone(detail.overall_band),
    },
    {
      label: "Confidence",
      value: confidenceScore || 0,
      note: "Inspection confidence",
      tone:
        confidenceScore >= 75
          ? "success"
          : confidenceScore >= 50
          ? "warning"
          : "danger",
    },
    {
      label: "Open actions",
      value: openActions,
      note: `${overdueActions} overdue`,
      tone: openActions ? "warning" : "success",
    },
    {
      label: "Critical actions",
      value: criticalActions,
      note: "Highest priority work",
      tone: criticalActions ? "danger" : "success",
    },
    {
      label: "Reason lines",
      value: openReasons,
      note: "Inspection drivers",
      tone: openReasons ? "warning" : "muted",
    },
    {
      label: "Linked tasks",
      value: openTasks,
      note: "Operational follow-through",
      tone: openTasks ? "warning" : "success",
    },
  ];
}

function buildFallbackQualityData(homeId) {
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
      title: `${homeName} quality dashboard`,
      home_name: homeName,
      audit_score: 78,
      quality_score: 78,
    },
    auditData: {
      items: [
        {
          id: 1,
          audit_name: "Medication audit",
          finding: "Minor recording gaps identified in two entries.",
          status: "due_soon",
          audit_date: plusDays(5),
          auditor: "Quality Lead",
        },
        {
          id: 2,
          audit_name: "File audit",
          finding: "Overall good standard with one missing signature.",
          status: "completed",
          audit_date: minusDays(6),
          auditor: "RI",
        },
      ],
    },
    incidentData: {
      items: [
        {
          id: 11,
          incident_type: "Missing from care",
          description: "Returned safely after 45 minutes. Debrief complete.",
          location: "Community",
          status: "review_due",
          incident_datetime: minusDays(2, 18, 20),
        },
        {
          id: 12,
          incident_type: "Physical intervention",
          description: "Single hold used to prevent injury. Manager review needed.",
          location: "Home",
          status: "attention",
          incident_datetime: minusDays(7, 20, 10),
        },
      ],
    },
    safeguardingData: {
      items: [
        {
          id: 21,
          safeguarding_category: "Peer-on-peer concern",
          concern_details: "Ongoing monitoring with weekly oversight.",
          concern_datetime: minusDays(3, 14, 0),
          referral_made: true,
          status: "open",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: 31,
          title: "Update audit action tracker",
          task: "Record evidence against open audit actions.",
          assigned_role: "Manager",
          due_date: plusDays(2),
          completed: false,
          status: "open",
        },
        {
          id: 32,
          title: "Review restraint debrief quality",
          task: "Check language and reflection quality in latest debrief.",
          assigned_role: "RI",
          due_date: plusDays(4),
          completed: false,
          status: "open",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: 41,
          title: "Statement of Purpose review",
          summary: "Annual review is overdue.",
          area: "Governance",
          review_date: minusDays(4),
          severity: "high",
          status: "overdue",
        },
        {
          id: 42,
          title: "Training matrix assurance",
          summary: "Two certificates need refreshing.",
          area: "Workforce",
          review_date: plusDays(6),
          severity: "medium",
          status: "due_soon",
        },
      ],
    },
    reportData: {
      items: [
        {
          id: 51,
          title: "Monthly quality review",
          summary: "Themes noted across incidents, staffing and audit quality.",
          report_type: "Monthly review",
          status: "completed",
          created_at: minusDays(8, 10, 0),
        },
      ],
    },
  };
}

async function tryFetchInspectionDataset(homeId) {
  const base = buildInspectionUiEndpoints(homeId);
  if (!base?.homeId) return null;

  const endpoints = {
    homeCards: "/inspection/ui/home-cards",
    homeHeader: `/inspection/ui/homes/${base.homeId}/header`,
    sectionPanels: `/inspection/ui/homes/${base.homeId}/sections`,
    reasons: `/inspection/ui/homes/${base.homeId}/reasons`,
    actions: `/inspection/ui/homes/${base.homeId}/actions`,
    tasks: `/inspection/ui/homes/${base.homeId}/tasks`,
    briefing: `/inspection/ui/homes/${base.homeId}/briefing`,
    prep72h: `/inspection/ui/homes/${base.homeId}/prep-72h`,
  };

  const safeGet = (url) => apiGet(url).catch(() => null);

  const [
    cardsData,
    headerData,
    sectionData,
    reasonsData,
    actionsData,
    tasksData,
    briefingData,
    prep72hData,
  ] = await Promise.all([
    safeGet(endpoints.homeCards),
    safeGet(endpoints.homeHeader),
    safeGet(endpoints.sectionPanels),
    safeGet(endpoints.reasons),
    safeGet(endpoints.actions),
    safeGet(endpoints.tasks),
    safeGet(endpoints.briefing),
    safeGet(endpoints.prep72h),
  ]);

  const cards = toArray(cardsData?.items, [
    cardsData?.rows,
    cardsData?.cards,
    cardsData?.records,
  ]).map(mapInspectionHomeCard);

  const headers = toArray(headerData?.items, [
    headerData?.rows,
    headerData?.records,
  ]).map(mapInspectionHeader);

  const sections = toArray(sectionData?.items, [
    sectionData?.rows,
    sectionData?.sections,
    sectionData?.records,
  ]).map(mapInspectionSectionPanel);

  const reasons = toArray(reasonsData?.items, [
    reasonsData?.rows,
    reasonsData?.reasons,
    reasonsData?.records,
  ]).map(mapInspectionReason);

  const actions = toArray(actionsData?.items, [
    actionsData?.rows,
    actionsData?.actions,
    actionsData?.records,
  ]).map(mapInspectionAction);

  const tasks = toArray(tasksData?.items, [
    tasksData?.rows,
    tasksData?.tasks,
    tasksData?.records,
  ]).map(mapInspectionTask);

  const briefings = toArray(briefingData?.items, [
    briefingData?.rows,
    briefingData?.records,
  ]).map(mapInspectionBriefing);

  const prep72h = toArray(prep72hData?.items, [
    prep72hData?.rows,
    prep72hData?.records,
  ]).map(mapInspection72Hour);

  const hasInspectionData =
    cards.length ||
    headers.length ||
    sections.length ||
    reasons.length ||
    actions.length ||
    tasks.length ||
    briefings.length ||
    prep72h.length;

  if (!hasInspectionData) {
    return null;
  }

  const selectedCard =
    cards.find((item) => Number(item.home_id) === Number(homeId)) ||
    cards[0] ||
    null;

  const activeHomeId = selectedCard?.home_id || homeId;

  const detail =
    headers.find((item) => Number(item.home_id) === Number(activeHomeId)) ||
    selectedCard ||
    {};

  return {
    mode: "inspection",
    selectedHomeId: activeHomeId,
    cards: cards,
    detail,
    sections: sortNewestFirst(
      sections.filter((item) => Number(item.home_id) === Number(activeHomeId)),
      ["updated_at", "created_at"]
    ),
    reasons: sortNewestFirst(
      reasons.filter((item) => Number(item.home_id) === Number(activeHomeId)),
      ["updated_at", "created_at"]
    ),
    actions: sortSoonestFirst(
      actions.filter((item) => Number(item.home_id) === Number(activeHomeId)),
      ["due_date", "created_at"]
    ),
    tasks: sortSoonestFirst(
      tasks.filter((item) => Number(item.home_id) === Number(activeHomeId)),
      ["task_due_date", "created_at"]
    ),
    briefing:
      briefings.find((item) => Number(item.home_id) === Number(activeHomeId)) ||
      briefings[0] ||
      null,
    prep72h:
      prep72h.find((item) => Number(item.home_id) === Number(activeHomeId)) ||
      prep72h[0] ||
      null,
  };
}

async function fetchFallbackQualityDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/quality`),
    safeGet(`/homes/${homeId}/audits`),
    safeGet(`/homes/${homeId}/incidents`),
    safeGet(`/homes/${homeId}/safeguarding`),
    safeGet(`/homes/${homeId}/tasks`),
    safeGet(`/homes/${homeId}/compliance`),
    safeGet(`/homes/${homeId}/reports`),
  ];

  const [
    summaryData,
    auditData,
    incidentData,
    safeguardingData,
    taskData,
    complianceData,
    reportData,
  ] = await Promise.all(requests);

  const responses = [
    summaryData,
    auditData,
    incidentData,
    safeguardingData,
    taskData,
    complianceData,
    reportData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackQualityData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: summaryData || {},
    auditData: auditData || { items: [] },
    incidentData: incidentData || { items: [] },
    safeguardingData: safeguardingData || { items: [] },
    taskData: taskData || { items: [] },
    complianceData: complianceData || { items: [] },
    reportData: reportData || { items: [] },
    isFallback: false,
  };
}

function bindInspectionHomeEvents() {
  if (!els.viewContent) return;

  els.viewContent
    .querySelectorAll("[data-quality-home-card='true']")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const homeId = Number(button.dataset.homeId || 0);
        if (!homeId) return;
        state.readinessSelectedHomeId = homeId;
        state.homeId = homeId;
        await loadQualityDashboard();
      });
    });
}

export async function loadQualityDashboard() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const inspectionData = await tryFetchInspectionDataset(homeId);

    if (inspectionData) {
      const topStats = buildInspectionTopStats({
        detail: inspectionData.detail,
        actions: inspectionData.actions,
        reasons: inspectionData.reasons,
        tasks: inspectionData.tasks,
      });

      const insightItems = buildInspectionInsights({
        detail: inspectionData.detail,
        reasons: inspectionData.reasons,
        actions: inspectionData.actions,
        tasks: inspectionData.tasks,
        sections: inspectionData.sections,
      });

      els.viewContent.innerHTML = renderInspectionDashboardHtml({
        title:
          inspectionData.detail.home_name ||
          state.currentUser?.home_name ||
          "Inspection quality dashboard",
        cards: inspectionData.cards,
        selectedHomeId: inspectionData.selectedHomeId,
        detail: inspectionData.detail,
        sectionPanels: inspectionData.sections,
        reasons: inspectionData.reasons.slice(0, 8),
        actions: inspectionData.actions.slice(0, 8),
        tasks: inspectionData.tasks.slice(0, 8),
        briefing: inspectionData.briefing,
        prep72h: inspectionData.prep72h,
        topStats,
        insightItems,
      });

      updateWorkspaceSummaryStrip({
        today: `${formatBand(inspectionData.detail.overall_band)} • Score ${toNumber(
          inspectionData.detail.overall_score,
          0
        )}`,
        nextEvent: inspectionData.detail.next_action_due_date
          ? `Next inspection action ${formatDate(inspectionData.detail.next_action_due_date)}`
          : inspectionData.actions[0]?.due_date
          ? `Next inspection action ${formatDate(inspectionData.actions[0].due_date)}`
          : "No immediate inspection deadline",
        lastRecord: inspectionData.briefing?.headline_summary
          ? inspectionData.briefing.headline_summary
          : inspectionData.detail.top_concerns || "No major inspection concern recorded",
        openActions: `${toNumber(
          inspectionData.detail.open_actions,
          inspectionData.actions.length
        )} open • ${toNumber(inspectionData.detail.overdue_actions, 0)} overdue`,
      });

      bindInspectionHomeEvents();
      return;
    }

    const {
      summaryData,
      auditData,
      incidentData,
      safeguardingData,
      taskData,
      complianceData,
      reportData,
      isFallback,
    } = await fetchFallbackQualityDataset(homeId);

    const summary = normaliseQualitySummary(summaryData);

    const auditItems = sortSoonestFirst(normaliseAuditItems(auditData), [
      "audit_date",
      "review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const incidentItems = sortNewestFirst(normaliseIncidentItems(incidentData), [
      "incident_datetime",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const safeguardingItems = sortNewestFirst(
      normaliseSafeguardingItems(safeguardingData),
      ["concern_datetime", "updated_at", "created_at"]
    ).slice(0, 6);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const openActions = taskItems.filter((item) => !item.completed).slice(0, 8);

    const complianceItems = sortSoonestFirst(
      normaliseComplianceItems(complianceData),
      ["review_date", "due_date", "updated_at", "created_at"]
    )
      .filter((item) =>
        ["overdue", "due_soon", "review_due", "missing", "non_compliant"].includes(
          normaliseToken(item.status)
        )
      )
      .slice(0, 8);

    const reportItems = sortNewestFirst(normaliseReportItems(reportData), [
      "created_at",
      "updated_at",
    ]).slice(0, 6);

    const topStats = buildFallbackTopStats({
      summary,
      audits: auditItems,
      incidents: incidentItems,
      safeguarding: safeguardingItems,
      openActions,
      compliancePressure: complianceItems,
    });

    const insightItems = buildFallbackInsights({
      audits: auditItems,
      incidents: incidentItems,
      safeguarding: safeguardingItems,
      compliance: complianceItems,
    });

    els.viewContent.innerHTML = renderFallbackQualityDashboardHtml({
      title:
        summary.title ||
        summary.home_name ||
        state.currentUser?.home_name ||
        "Quality and RI dashboard",
      topStats,
      insightItems,
      auditItems,
      incidentItems,
      safeguardingItems,
      complianceItems,
      reportItems,
      openActions,
    });

    const nextAudit = auditItems.find((item) => item.audit_date || item.review_date);
    const latestReport = reportItems[0];
    const auditScore = toNumber(summary.audit_score ?? summary.quality_score, 0);

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `Audit score ${auditScore} • ${openActions.length} open actions • demo preview`
        : `Audit score ${auditScore} • ${openActions.length} open actions`,
      nextEvent: nextAudit
        ? `Next audit ${formatDate(nextAudit.audit_date || nextAudit.review_date)}`
        : "No audit scheduled",
      lastRecord:
        latestReport?.created_at
          ? `Latest report ${formatDateTime(latestReport.created_at)}`
          : "No recent report loaded",
      openActions: `${openActions.length} open • ${complianceItems.length} compliance pressure`,
    });
  } catch (error) {
    console.error("[quality] load failed", error);
    renderErrorState(error?.message || "The quality dashboard could not be loaded.");
  }
}

import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* -------------------------------- helpers -------------------------------- */

const SAFE_EMPTY = Object.freeze({ items: [] });

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

function toBool(value) {
  return Boolean(value);
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
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

function badgeClass(value) {
  const v = lower(value).replaceAll(" ", "_");

  if (
    [
      "critical",
      "high",
      "urgent",
      "overdue",
      "failed",
      "error",
      "inadequate",
      "open",
      "red",
      "missing",
      "late",
      "stale",
      "requires_action",
      "non_compliant",
      "escalated",
      "not_started",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "warning",
      "in_progress",
      "pending",
      "draft",
      "amber",
      "awaiting_review",
      "monitor",
      "submitted",
      "scheduled",
      "active",
      "under_review",
      "review_due",
      "planned",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "completed",
      "approved",
      "resolved",
      "good",
      "outstanding",
      "pass",
      "closed",
      "green",
      "safe",
      "done",
      "ok",
      "satisfied",
      "up_to_date",
      "compliant",
      "current",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function getAccessibleHomeIds() {
  const ids = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (ids.length) return [...new Set(ids)];

  const singleHomeId = Number(
    state.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      0
  );

  return Number.isFinite(singleHomeId) && singleHomeId > 0
    ? [singleHomeId]
    : [];
}

function getProviderLabel() {
  return (
    state.currentUser?.provider_name ||
    state.currentUser?.providerName ||
    "Provider"
  );
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], dateKeys = []) {
  return [...items].sort((a, b) => {
    const aValue = dateKeys.map((key) => a?.[key]).find(Boolean);
    const bValue = dateKeys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], dateKey) {
  return [...items].sort((a, b) => {
    const aDate = a?.[dateKey] ? new Date(a[dateKey]).getTime() : Number.POSITIVE_INFINITY;
    const bDate = b?.[dateKey] ? new Date(b[dateKey]).getTime() : Number.POSITIVE_INFINITY;
    return aDate - bDate;
  });
}

function dedupeBy(items = [], buildKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = buildKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* -------------------------------- mappers -------------------------------- */

function mapQualityAudit(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    home_name: record.home_name || record.title || "",
    audit_type: record.audit_type || "",
    audit_title: record.audit_title || record.title || "Quality audit",
    audit_date: record.audit_date || null,
    period_start: record.period_start || null,
    period_end: record.period_end || null,
    completed_by: record.completed_by || record.auditor_user_id || null,
    overall_outcome: record.overall_outcome || record.overall_rating || "",
    summary: record.summary || "",
    strengths: record.strengths || "",
    concerns: record.concerns || "",
    recommendations: record.recommendations || "",
    status: record.status || "",
    title:
      record.audit_title ||
      record.title ||
      titleCase(record.audit_type || "Quality audit"),
    record_type: "quality_audit",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapQualityAuditFinding(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    audit_id: record.audit_id || record.quality_audit_id || null,
    home_id: record.home_id || null,
    home_name: record.home_name || "",
    finding_type: record.finding_type || "",
    priority: record.priority || "",
    title: record.title || "Audit finding",
    details: record.details || "",
    action_required: toBool(record.action_required),
    linked_record_type: record.linked_record_type || "",
    linked_record_id: record.linked_record_id || null,
    summary:
      record.details ||
      `${record.home_name || "Home"} • ${record.title || "Audit finding"}`,
    record_type: "quality_audit_finding",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapQualityAuditAction(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    quality_audit_id: record.quality_audit_id || record.audit_id || null,
    home_id: record.home_id || null,
    home_name: record.home_name || "",
    action_title: record.action_title || "Audit action",
    action_description: record.action_description || "",
    priority: record.priority || "",
    owner_user_id: record.owner_user_id || null,
    owner_name: record.owner_name || record.owner_user_name || "",
    due_date: record.due_date || null,
    status: record.status || "",
    completed_at: record.completed_at || null,
    linked_task_id: record.linked_task_id || null,
    completion_notes: record.completion_notes || "",
    finding_id: record.finding_id || null,
    title: record.action_title || "Audit action",
    summary:
      record.action_description ||
      record.completion_notes ||
      "Quality action recorded.",
    record_type: "quality_audit_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

/* ------------------------------ demo fallback ----------------------------- */

function buildFallbackData(homeIds = []) {
  const ids = homeIds.length ? homeIds : [1, 2, 3];
  const now = new Date();

  const minusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const plusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return {
    qualityAudits: [
      mapQualityAudit({
        id: "qa-1",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        audit_type: "monthly_audit",
        audit_title: "Monthly quality audit",
        audit_date: minusDays(4),
        overall_outcome: "good",
        status: "completed",
        summary: "Stable month with good oversight, though document freshness needs attention.",
        strengths: "Good staff visibility and improved incident management.",
        concerns: "A small number of overdue document reviews.",
        recommendations: "Tighten management checks for review dates.",
        created_at: minusDays(5),
        updated_at: minusDays(4),
      }),
      mapQualityAudit({
        id: "qa-2",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        audit_type: "compliance_audit",
        audit_title: "Compliance deep dive",
        audit_date: minusDays(2),
        overall_outcome: "requires_action",
        status: "open",
        summary: "Audit found multiple items needing follow-up before next review cycle.",
        strengths: "Improved staffing consistency.",
        concerns: "Supervision and statutory review dates need closer oversight.",
        recommendations: "Complete linked actions within seven days.",
        created_at: minusDays(3),
        updated_at: minusDays(2),
      }),
    ],

    qualityAuditFindings: [
      mapQualityAuditFinding({
        id: "qf-1",
        audit_id: "qa-2",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        finding_type: "document_review",
        priority: "high",
        title: "Document review dates slipping",
        details: "Several key statutory records were approaching or past review due dates.",
        action_required: true,
        created_at: minusDays(2),
      }),
      mapQualityAuditFinding({
        id: "qf-2",
        audit_id: "qa-1",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        finding_type: "good_practice",
        priority: "low",
        title: "Improved management oversight",
        details: "Management review evidence was clearer and more consistent.",
        action_required: false,
        created_at: minusDays(4),
      }),
    ],

    qualityAuditActions: [
      mapQualityAuditAction({
        id: "qaa-1",
        quality_audit_id: "qa-2",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        action_title: "Complete overdue review checks",
        action_description: "Review all flagged records and confirm new review dates.",
        priority: "high",
        owner_name: "Sarah Jones",
        due_date: plusDays(2),
        status: "open",
        created_at: minusDays(2),
      }),
      mapQualityAuditAction({
        id: "qaa-2",
        quality_audit_id: "qa-1",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        action_title: "Evidence stronger chronology links",
        action_description: "Tighten links between incidents, actions and management review.",
        priority: "medium",
        owner_name: "Tom Patel",
        due_date: plusDays(5),
        status: "in_progress",
        created_at: minusDays(4),
      }),
    ],

    isFallback: true,
  };
}

/* -------------------------------- render -------------------------------- */

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function renderCard(item = {}, options = {}) {
  const status =
    item.status ||
    item.priority ||
    item.overall_outcome ||
    "";

  const primaryDate =
    options.primaryDate ||
    item.due_date ||
    item.audit_date ||
    item.completed_at ||
    item.created_at ||
    item.updated_at;

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "record")}"
      data-title="${safeText(item.title || "Record")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Record")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(primaryDate, "No date"))}</div>
        </div>
        ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.home_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Home</div>
                  <div class="details-grid-value">${safeText(item.home_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.priority
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Priority</div>
                  <div class="details-grid-value">${safeText(titleCase(item.priority))}</div>
                </div>
              `
              : ""
          }

          ${
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due date</div>
                  <div class="details-grid-value">${safeText(formatDate(item.due_date))}</div>
                </div>
              `
              : ""
          }

          ${
            item.owner_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">${safeText(item.owner_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.audit_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Audit type</div>
                  <div class="details-grid-value">${safeText(titleCase(item.audit_type))}</div>
                </div>
              `
              : ""
          }

          ${
            item.overall_outcome
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Outcome</div>
                  <div class="details-grid-value">${safeText(titleCase(item.overall_outcome))}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.concerns
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Concerns</div>
                <div>${safeText(item.concerns)}</div>
              </div>
            `
            : ""
        }

        ${
          item.recommendations
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Recommendations</div>
                <div>${safeText(item.recommendations)}</div>
              </div>
            `
            : ""
        }

        ${
          item.action_description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action</div>
                <div>${safeText(item.action_description)}</div>
              </div>
            `
            : ""
        }

        ${
          item.details
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Detail</div>
                <div>${safeText(item.details)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage, options = {}) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items
    .map((item) => renderCard(item, options))
    .join("")}</div>`;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent audit issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 8)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Audit issue")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No audit activity yet",
      "There is no recent quality audit activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.due_date ||
            item.audit_date ||
            item.completed_at ||
            item.created_at ||
            item.updated_at;

          const status =
            item.status ||
            item.priority ||
            item.overall_outcome ||
            "";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
                </div>
                <div class="timeline-item-summary">${safeText(
                  [item.home_name, item.summary].filter(Boolean).join(" • ")
                )}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    providerLabel,
    latestAudits,
    openActions,
    actionRequiredFindings,
    priorityItems,
    timeline,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Quality audits</div>
          <h2>${safeText(providerLabel)} • audit and action tracking</h2>
          <p class="overview-panel-subtitle">
            A provider-wide view of completed audits, action-required findings, open follow-up and recent quality activity.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live quality audit routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Recent audits", latestAudits.length)}
        ${renderStatCard("Open audit actions", openActions.length)}
        ${renderStatCard("Action-required findings", actionRequiredFindings.length)}
        ${renderStatCard("Homes with audit pressure", priorityItems.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Latest audits",
            renderCardList(
              latestAudits,
              "No audits available",
              "No quality audits have been returned yet.",
              { primaryDate: null }
            )
          )}

          ${renderSection(
            "Open audit actions",
            renderCardList(
              openActions,
              "No open audit actions",
              "There are no open quality audit actions currently recorded."
            )
          )}

          ${renderSection(
            "Quality audit timeline",
            renderTimeline(timeline)
          )}
        </div>

        <aside>
          ${renderSection(
            "Needs attention",
            renderPriorityList(priorityItems)
          )}

          ${renderSection(
            "Action-required findings",
            renderCardList(
              actionRequiredFindings,
              "No action-required findings",
              "There are no current findings requiring action."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- fetch -------------------------------- */

async function fetchAll(homeIds = []) {
  const perHomeResults = await Promise.all(
    homeIds.map(async (homeId) => {
      const [auditsRes, findingsRes, actionsRes] = await Promise.all([
        safeGet(`/homes/${homeId}/quality-audits`),
        safeGet(`/homes/${homeId}/quality-audit-findings`),
        safeGet(`/homes/${homeId}/quality-audit-actions`),
      ]);

      const audits = pickItems(auditsRes, ["quality_audits", "items"]).map((item) =>
        mapQualityAudit({
          ...item,
          home_id: item.home_id || homeId,
          home_name: item.home_name || item.home_title || `Home ${homeId}`,
        })
      );

      const findings = pickItems(
        findingsRes,
        ["quality_audit_findings", "items"]
      ).map((item) =>
        mapQualityAuditFinding({
          ...item,
          home_id: item.home_id || homeId,
          home_name: item.home_name || `Home ${homeId}`,
        })
      );

      const actions = pickItems(
        actionsRes,
        ["quality_audit_actions", "items"]
      ).map((item) =>
        mapQualityAuditAction({
          ...item,
          home_id: item.home_id || homeId,
          home_name: item.home_name || `Home ${homeId}`,
        })
      );

      return { audits, findings, actions };
    })
  );

  const qualityAudits = perHomeResults.flatMap((item) => item.audits);
  const qualityAuditFindings = perHomeResults.flatMap((item) => item.findings);
  const qualityAuditActions = perHomeResults.flatMap((item) => item.actions);

  const hasLiveData =
    qualityAudits.length ||
    qualityAuditFindings.length ||
    qualityAuditActions.length;

  if (!hasLiveData) {
    return buildFallbackData(homeIds);
  }

  return {
    qualityAudits,
    qualityAuditFindings,
    qualityAuditActions,
    isFallback: false,
  };
}

/* ------------------------------- selectors ------------------------------- */

function buildLatestAudits(data) {
  return sortNewest(data.qualityAudits, [
    "audit_date",
    "updated_at",
    "created_at",
  ]).slice(0, 10);
}

function buildOpenActions(data) {
  return sortSoonest(
    data.qualityAuditActions.filter((item) => {
      const status = lower(item.status).replaceAll(" ", "_");
      return !["completed", "closed", "cancelled"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildActionRequiredFindings(data) {
  return sortNewest(
    data.qualityAuditFindings.filter((item) => item.action_required),
    ["updated_at", "created_at"]
  ).slice(0, 10);
}

function buildPriorityItems(data) {
  const items = [];

  buildOpenActions(data)
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: `${item.home_name || "Home"} • ${item.title || "Audit action"}`,
        summary:
          item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : item.summary || "Audit action needs follow-up.",
      });
    });

  buildActionRequiredFindings(data)
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: `${item.home_name || "Home"} • ${item.title || "Finding"}`,
        summary: item.summary || "Finding requires follow-up.",
      });
    });

  return items.slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    dedupeBy(
      [
        ...data.qualityAudits,
        ...data.qualityAuditFindings,
        ...data.qualityAuditActions,
      ],
      (item) => `${item.record_type}:${item.id}:${item.home_id || ""}`
    ),
    ["due_date", "audit_date", "completed_at", "updated_at", "created_at"]
  ).slice(0, 25);
}

/* -------------------------------- public -------------------------------- */

export async function loadQualityAudits() {
  if (!els.viewContent) return;

  const homeIds = getAccessibleHomeIds();

  if (!homeIds.length) {
    els.viewContent.innerHTML = renderEmpty(
      "No homes available",
      "There are no accessible homes available for quality audit review."
    );

    updateWorkspaceSummaryStrip({
      today: "No provider context",
      nextEvent: "No audits in scope",
      lastRecord: "No audit data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading quality audits...</p>
    </div>
  `;

  try {
    const data = await fetchAll(homeIds);

    const latestAudits = buildLatestAudits(data);
    const openActions = buildOpenActions(data);
    const actionRequiredFindings = buildActionRequiredFindings(data);
    const priorityItems = buildPriorityItems(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      providerLabel: getProviderLabel(),
      latestAudits,
      openActions,
      actionRequiredFindings,
      priorityItems,
      timeline,
      isFallback: data.isFallback,
    });

    const nextAction = openActions[0] || null;
    const latestAudit = latestAudits[0] || null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${latestAudits.length} audits • preview mode`
        : `${latestAudits.length} audits • ${openActions.length} open actions`,
      nextEvent: nextAction?.due_date
        ? `Audit action due ${formatDate(nextAction.due_date)}`
        : "No audit action due",
      lastRecord: latestAudit?.audit_date
        ? `Latest audit ${formatDate(latestAudit.audit_date)}`
        : latestAudit?.created_at
        ? `Latest audit ${formatDate(latestAudit.created_at)}`
        : "No recent audit",
      openActions: `${openActions.length} open • ${actionRequiredFindings.length} action findings`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[quality-audits] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load quality audits",
      error?.message || "Something went wrong while loading quality audits."
    );

    updateWorkspaceSummaryStrip({
      today: "Quality audits unavailable",
      nextEvent: "No audit action due",
      lastRecord: "No audit data",
      openActions: "Check audit routes",
    });
  }
}
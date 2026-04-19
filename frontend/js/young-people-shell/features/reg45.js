import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* ------------------------------- helpers ------------------------------- */

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

function formatDateRange(start, end) {
  if (!start && !end) return "No period";
  if (start && end) return `${formatDate(start)} to ${formatDate(end)}`;
  return formatDate(start || end);
}

function getBadgeClass(status = "") {
  const v = lower(status);

  if (
    [
      "overdue",
      "critical",
      "high",
      "requires_action",
      "requires_improvement",
      "inadequate",
      "late",
      "open",
      "stalled",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "in_progress",
      "pending",
      "draft",
      "submitted",
      "review_due",
      "planned",
      "monitoring",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "completed",
      "approved",
      "good",
      "outstanding",
      "closed",
      "active",
      "current",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], key = "due_date") {
  return [...items].sort((a, b) => {
    const aTime = a?.[key] ? new Date(a[key]).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b?.[key] ? new Date(b[key]).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function getHomeIds() {
  if (Array.isArray(state.allowedHomeIds) && state.allowedHomeIds.length) {
    return state.allowedHomeIds;
  }

  if (state.homeId) return [state.homeId];

  return [];
}

/* ------------------------------- mappers ------------------------------- */

function mapReg45Review(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    home_name: record.home_name || `Home ${record.home_id || ""}`.trim(),
    review_period_start: record.review_period_start || null,
    review_period_end: record.review_period_end || null,
    review_status: record.review_status || record.status || "",
    overall_quality_summary: record.overall_quality_summary || "",
    action_plan_summary: record.action_plan_summary || "",
    strengths_summary: record.strengths_summary || "",
    concerns_summary: record.concerns_summary || "",
    reviewed_by_user_name:
      record.reviewed_by_user_name || record.reviewed_by || "",
    approved_by_user_name:
      record.approved_by_user_name || record.approved_by || "",
    approved_at: record.approved_at || null,
    title:
      record.title ||
      `Reg 45 review${record.review_period_end ? ` - ${formatDate(record.review_period_end)}` : ""}`,
    summary:
      record.overall_quality_summary ||
      record.action_plan_summary ||
      record.concerns_summary ||
      "Regulation 45 review available.",
    record_type: "reg45_review",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReg45Action(record = {}) {
  return {
    id: record.id,
    reg45_review_id: record.reg45_review_id || null,
    home_id: record.home_id || null,
    home_name: record.home_name || `Home ${record.home_id || ""}`.trim(),
    action_title: record.action_title || "Reg 45 action",
    action_description: record.action_description || "",
    owner_user_name: record.owner_user_name || record.owner_name || "",
    due_date: record.due_date || null,
    priority: record.priority || "",
    status: record.status || "",
    completed_at: record.completed_at || null,
    completion_notes: record.completion_notes || "",
    title: record.action_title || "Reg 45 action",
    summary:
      record.action_description ||
      record.completion_notes ||
      "Reg 45 action recorded.",
    record_type: "reg45_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

/* ------------------------------ fallback ------------------------------ */

function buildFallbackData(homeIds = []) {
  const homeId = homeIds[0] || 1;
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const now = new Date();

  const minusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  return {
    reviews: [
      mapReg45Review({
        id: "reg45-1",
        home_id: homeId,
        home_name: homeName,
        review_period_start: minusDays(180),
        review_period_end: minusDays(1),
        review_status: "approved",
        overall_quality_summary:
          "Overall quality of care remains stable with stronger routines, improved relationship consistency and better evidence of direct work.",
        action_plan_summary:
          "Priority remains on education attendance, supervision timeliness and strengthening management oversight evidence.",
        strengths_summary:
          "Staff consistency, calmer routines and improved child-focused recording.",
        concerns_summary:
          "Education drift for one child and some slippage in supervision timescales.",
        reviewed_by_user_name: "Sarah Jones",
        approved_by_user_name: "David Clarke",
        approved_at: minusDays(1),
        created_at: minusDays(7),
        updated_at: minusDays(1),
      }),
      mapReg45Review({
        id: "reg45-2",
        home_id: homeId,
        home_name: homeName,
        review_period_start: minusDays(30),
        review_period_end: plusDays(150),
        review_status: "draft",
        overall_quality_summary:
          "Draft review in progress with emerging themes around attendance, staff capacity and document freshness.",
        action_plan_summary:
          "Draft action plan still needs manager approval and dates.",
        created_at: minusDays(2),
        updated_at: minusDays(1),
      }),
    ],
    actions: [
      mapReg45Action({
        id: "reg45-action-1",
        reg45_review_id: "reg45-1",
        home_id: homeId,
        home_name: homeName,
        action_title: "Complete overdue supervision cycle",
        action_description:
          "Bring outstanding supervision sessions back into timescale and record management reflection clearly.",
        owner_user_name: "Sarah Jones",
        due_date: plusDays(5),
        priority: "high",
        status: "open",
        created_at: minusDays(3),
      }),
      mapReg45Action({
        id: "reg45-action-2",
        reg45_review_id: "reg45-1",
        home_id: homeId,
        home_name: homeName,
        action_title: "Strengthen attendance escalation evidence",
        action_description:
          "Ensure attendance concerns are tracked, escalated and reflected in reporting.",
        owner_user_name: "Tom Patel",
        due_date: plusDays(10),
        priority: "medium",
        status: "in_progress",
        created_at: minusDays(4),
      }),
      mapReg45Action({
        id: "reg45-action-3",
        reg45_review_id: "reg45-1",
        home_id: homeId,
        home_name: homeName,
        action_title: "Update quality monitoring examples",
        action_description:
          "Add stronger examples of management challenge, review and follow-through.",
        owner_user_name: "Sarah Jones",
        due_date: minusDays(2),
        priority: "high",
        status: "overdue",
        created_at: minusDays(8),
      }),
    ],
    isFallback: true,
  };
}

/* -------------------------------- fetch -------------------------------- */

async function fetchAll(homeIds = []) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const results = await Promise.all(
    homeIds.map(async (homeId) => {
      const [reviewsRes, actionsRes] = await Promise.all([
        safeGet(`/homes/${homeId}/reg45-reviews`),
        safeGet(`/homes/${homeId}/reg45-actions`),
      ]);

      return {
        reviews: toArray(
          reviewsRes?.reg45_reviews || reviewsRes?.items || reviewsRes
        ).map(mapReg45Review),
        actions: toArray(
          actionsRes?.reg45_actions || actionsRes?.items || actionsRes
        ).map(mapReg45Action),
      };
    })
  );

  const reviews = results.flatMap((item) => item.reviews);
  const actions = results.flatMap((item) => item.actions);

  if (!reviews.length && !actions.length) {
    return buildFallbackData(homeIds);
  }

  return {
    reviews,
    actions,
    isFallback: false,
  };
}

/* ------------------------------- selectors ------------------------------- */

function buildLatestReviews(data) {
  return sortNewest(data.reviews, [
    "review_period_end",
    "approved_at",
    "updated_at",
    "created_at",
  ]).slice(0, 8);
}

function buildOpenActions(data) {
  return sortSoonest(
    data.actions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildOverdueActions(data) {
  return buildOpenActions(data).filter((item) => lower(item.status) === "overdue");
}

function buildCompletedActions(data) {
  return sortNewest(
    data.actions.filter((item) => {
      const status = lower(item.status);
      return ["completed", "closed"].includes(status);
    }),
    ["completed_at", "updated_at", "created_at"]
  ).slice(0, 8);
}

function buildPriorityItems({ overdueActions, openActions, reviews }) {
  const items = [];

  overdueActions.slice(0, 3).forEach((item) => {
    items.push({
      title: item.title || "Overdue Reg 45 action",
      summary: item.due_date
        ? `Overdue since ${formatDate(item.due_date)}`
        : item.summary || "This action needs immediate review.",
    });
  });

  reviews
    .filter((item) => ["draft", "pending", "submitted"].includes(lower(item.review_status)))
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Draft Reg 45 review",
        summary:
          item.action_plan_summary ||
          item.summary ||
          "This review still needs completion or approval.",
      });
    });

  openActions
    .filter((item) => lower(item.priority) === "high")
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "High priority action",
        summary:
          item.summary ||
          (item.due_date ? `Due ${formatDate(item.due_date)}` : "Needs attention."),
      });
    });

  if (!items.length) {
    items.push({
      title: "No immediate Reg 45 pressure",
      summary: "No urgent quality of care review issues are showing right now.",
    });
  }

  return items.slice(0, 6);
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

function renderCard(item = {}) {
  const status = item.review_status || item.status || item.priority || "";
  const primaryDate =
    item.due_date ||
    item.review_period_end ||
    item.approved_at ||
    item.completed_at ||
    item.updated_at ||
    item.created_at;

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
        ${status ? `<span class="${getBadgeClass(status)}">${safeText(status.replaceAll("_", " "))}</span>` : ""}
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.review_period_start || item.review_period_end
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Review period</div>
                  <div class="details-grid-value">
                    ${safeText(formatDateRange(item.review_period_start, item.review_period_end))}
                  </div>
                </div>
              `
              : ""
          }

          ${
            item.owner_user_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">${safeText(item.owner_user_name)}</div>
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
            item.priority
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Priority</div>
                  <div class="details-grid-value">${safeText(item.priority)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.overall_quality_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Overall quality summary</div>
                <div>${safeText(item.overall_quality_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.action_plan_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action plan summary</div>
                <div>${safeText(item.action_plan_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.concerns_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Concerns</div>
                <div>${safeText(item.concerns_summary)}</div>
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
          item.completion_notes
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Completion notes</div>
                <div>${safeText(item.completion_notes)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items.map(renderCard).join("")}</div>`;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent Reg 45 issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Reg 45 priority")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    latestReviews,
    openActions,
    overdueActions,
    completedActions,
    priorityItems,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Regulation 45</div>
          <h2>Quality of care review and improvement planning</h2>
          <p class="overview-panel-subtitle">
            Leadership review of care quality, improvement actions, strategic themes and evidence of management follow-through.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live Reg 45 endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Reviews", latestReviews.length)}
        ${renderStatCard("Open actions", openActions.length)}
        ${renderStatCard("Overdue actions", overdueActions.length)}
        ${renderStatCard("Completed actions", completedActions.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Latest Reg 45 reviews",
            renderCardList(
              latestReviews,
              "No Reg 45 reviews",
              "No Regulation 45 reviews have been recorded yet."
            )
          )}

          ${renderSection(
            "Open Reg 45 actions",
            renderCardList(
              openActions,
              "No open Reg 45 actions",
              "There are no open Regulation 45 actions currently recorded."
            )
          )}
        </div>

        <aside>
          ${renderSection(
            "Needs attention",
            renderPriorityList(priorityItems)
          )}

          ${renderSection(
            "Overdue actions",
            renderCardList(
              overdueActions,
              "No overdue actions",
              "There are no overdue Regulation 45 actions."
            )
          )}

          ${renderSection(
            "Recently completed actions",
            renderCardList(
              completedActions,
              "No completed actions",
              "No completed Regulation 45 actions are available yet."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- public -------------------------------- */

export async function loadReg45() {
  if (!els.viewContent) return;

  const homeIds = getHomeIds();

  if (!homeIds.length) {
    els.viewContent.innerHTML = renderEmpty(
      "No home selected",
      "A home context is needed before Regulation 45 can load."
    );

    updateWorkspaceSummaryStrip({
      today: "No Reg 45 context",
      nextEvent: "No review due",
      lastRecord: "No Reg 45 data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const data = await fetchAll(homeIds);

    const latestReviews = buildLatestReviews(data);
    const openActions = buildOpenActions(data);
    const overdueActions = buildOverdueActions(data);
    const completedActions = buildCompletedActions(data);
    const priorityItems = buildPriorityItems({
      overdueActions,
      openActions,
      reviews: latestReviews,
    });

    els.viewContent.innerHTML = renderWorkspace({
      latestReviews,
      openActions,
      overdueActions,
      completedActions,
      priorityItems,
      isFallback: data.isFallback,
    });

    const latestReview = latestReviews[0] || null;
    const nextAction = openActions[0] || null;

    updateWorkspaceSummaryStrip({
      today: latestReview?.review_period_end
        ? `Latest review ${formatDate(latestReview.review_period_end)}`
        : `${latestReviews.length} reviews loaded`,
      nextEvent: nextAction?.due_date
        ? `Due ${formatDate(nextAction.due_date)}`
        : "No Reg 45 action due",
      lastRecord: latestReview?.approved_at
        ? `Approved ${formatDate(latestReview.approved_at)}`
        : latestReview?.updated_at
        ? `Updated ${formatDate(latestReview.updated_at)}`
        : "No review approved yet",
      openActions: `${openActions.length} open action${
        openActions.length === 1 ? "" : "s"
      }`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[reg45] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load Regulation 45",
      error?.message || "Something went wrong while loading Regulation 45."
    );

    updateWorkspaceSummaryStrip({
      today: "Reg 45 unavailable",
      nextEvent: "No review due",
      lastRecord: "No Reg 45 data",
      openActions: "Check Reg 45 routes",
    });
  }
}
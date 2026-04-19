import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

const SAFE_EMPTY = Object.freeze({ items: [] });

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function toBool(value) {
  return Boolean(value);
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "overdue",
      "urgent",
      "high",
      "critical",
      "open",
      "missing",
      "not_started",
      "escalated",
      "action_required",
      "late",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "due_soon",
      "scheduled",
      "planned",
      "pending",
      "in_progress",
      "review_due",
      "awaiting_signoff",
      "draft",
      "medium",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "completed",
      "closed",
      "resolved",
      "recorded",
      "current",
      "approved",
      "good",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
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

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    const aTime = aValue ? new Date(aValue).getTime() : Number.POSITIVE_INFINITY;
    const bTime = bValue ? new Date(bValue).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function hasUsableData(data = {}) {
  return Object.values(data).some((value) => Array.isArray(value) && value.length > 0);
}

function mapReview(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    review_type: record.review_type || record.type || "",
    title:
      record.title ||
      titleCase(record.review_type || record.type || "Review"),
    review_date: record.review_date || record.meeting_date || record.date || null,
    next_review_date: record.next_review_date || record.due_date || null,
    status: record.status || "",
    chair_name: record.chair_name || record.chair || "",
    social_worker_name: record.social_worker_name || record.social_worker || "",
    iro_name: record.iro_name || "",
    summary:
      record.summary ||
      record.outcomes ||
      record.decision_summary ||
      "Review recorded.",
    child_voice: record.child_voice || "",
    decisions: record.decisions || record.decision_summary || "",
    actions: record.actions || record.actions_agreed || "",
    attendance: record.attendance || "",
    record_type: "review",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReviewAction(record = {}) {
  return {
    id: record.id,
    review_id: record.review_id || null,
    young_person_id: record.young_person_id || null,
    title: record.title || record.action_title || "Review action",
    summary:
      record.summary ||
      record.action_description ||
      record.notes ||
      "Review action recorded.",
    owner_name: record.owner_name || record.assigned_to || "",
    due_date: record.due_date || null,
    status: record.status || "",
    priority: record.priority || "",
    record_type: "review_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function buildFallbackData() {
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
      mapReview({
        id: "rev-1",
        review_type: "looked_after_review",
        title: "Looked after review",
        review_date: minusDays(20),
        next_review_date: plusDays(65),
        status: "completed",
        chair_name: "Independent Reviewing Officer",
        social_worker_name: "A. Smith",
        summary: "Review completed with focus on school attendance, routines and emotional regulation.",
        child_voice: "Young person said they want more notice before meetings and more say in activities.",
        decisions: "Maintain placement, increase education support and review internet safety arrangements.",
        actions: "Home to evidence direct-work plan and school liaison weekly.",
      }),
      mapReview({
        id: "rev-2",
        review_type: "placement_review",
        title: "Placement planning review",
        review_date: plusDays(10),
        next_review_date: plusDays(10),
        status: "scheduled",
        summary: "Upcoming placement review with focus on routines, family time and risk reduction.",
      }),
    ],
    reviewActions: [
      mapReviewAction({
        id: "ra-1",
        review_id: "rev-1",
        title: "Update education support plan",
        summary: "Reflect review decisions and evidence support arrangements.",
        owner_name: "Keyworker",
        due_date: plusDays(5),
        status: "open",
        priority: "high",
      }),
      mapReviewAction({
        id: "ra-2",
        review_id: "rev-1",
        title: "Capture child feedback before next review",
        summary: "Use direct work to gather wishes and feelings in advance.",
        owner_name: "Residential staff",
        due_date: plusDays(20),
        status: "planned",
        priority: "medium",
      }),
    ],
    isFallback: true,
  };
}

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

function renderReviewCard(item = {}) {
  const status = item.status || item.priority || "recorded";

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "review")}"
      data-title="${safeText(item.title || "Review")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Review")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(item.review_date || item.created_at))}</div>
        </div>
        <span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.next_review_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Next review</div>
                  <div class="details-grid-value">${safeText(formatDate(item.next_review_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.chair_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Chair</div>
                  <div class="details-grid-value">${safeText(item.chair_name)}</div>
                </div>
              `
              : ""
          }
          ${
            item.social_worker_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Social worker</div>
                  <div class="details-grid-value">${safeText(item.social_worker_name)}</div>
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
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due date</div>
                  <div class="details-grid-value">${safeText(formatDate(item.due_date))}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.child_voice
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Child voice</div>
                <div>${safeText(item.child_voice)}</div>
              </div>
            `
            : ""
        }

        ${
          item.decisions
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Decisions</div>
                <div>${safeText(item.decisions)}</div>
              </div>
            `
            : ""
        }

        ${
          item.actions
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Actions</div>
                <div>${safeText(item.actions)}</div>
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
  return `<div class="record-card-list">${items.map(renderReviewCard).join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty("No review history", "No review activity has been recorded yet.");
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => `
          <article class="timeline-item">
            <div class="timeline-item-date">${safeText(
              formatDateTime(item.review_date || item.due_date || item.created_at)
            )}</div>
            <div class="timeline-item-body">
              <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                <strong>${safeText(item.title || "Review item")}</strong>
                <span class="${badgeClass(item.status || item.priority || "recorded")}">${safeText(
                  titleCase(item.status || item.priority || "recorded")
                )}</span>
              </div>
              <div class="timeline-item-summary">${safeText(item.summary || "")}</div>
            </div>
          </article>
        `)
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    upcomingReviews,
    overdueActions,
    openActions,
    recentReviews,
    timeline,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Reviews</div>
          <h2>Reviews, outcomes and follow-up</h2>
          <p class="overview-panel-subtitle">
            Oversight of review dates, decisions, child voice and resulting actions.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live review routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Upcoming reviews", upcomingReviews.length)}
        ${renderStatCard("Open actions", openActions.length)}
        ${renderStatCard("Overdue actions", overdueActions.length)}
        ${renderStatCard("Recent reviews", recentReviews.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Upcoming reviews",
            renderCardList(
              upcomingReviews,
              "No upcoming reviews",
              "No future review dates are currently recorded."
            )
          )}

          ${renderSection(
            "Recent reviews",
            renderCardList(
              recentReviews,
              "No reviews recorded",
              "There are no recent reviews available."
            )
          )}

          ${renderSection("Review timeline", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Open review actions",
            renderCardList(
              openActions,
              "No open actions",
              "There are no review actions currently open."
            )
          )}

          ${renderSection(
            "Overdue review actions",
            renderCardList(
              overdueActions,
              "No overdue actions",
              "There are no overdue review actions."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

async function fetchAll(youngPersonId) {
  const [reviewsRes, actionsRes] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/reviews`),
    safeGet(`/young-people/${youngPersonId}/review-actions`),
  ]);

  const data = {
    reviews: pickItems(reviewsRes, ["reviews", "care_reviews", "items"]).map(mapReview),
    reviewActions: pickItems(actionsRes, ["review_actions", "items"]).map(mapReviewAction),
  };

  if (!hasUsableData(data)) return buildFallbackData();
  return { ...data, isFallback: false };
}

function buildUpcomingReviews(data) {
  return sortSoonest(
    data.reviews.filter((item) => item.next_review_date && !isOverdue(item.next_review_date)),
    ["next_review_date", "review_date", "created_at"]
  ).slice(0, 8);
}

function buildOpenActions(data) {
  return sortSoonest(
    data.reviewActions.filter((item) => !["completed", "closed", "resolved"].includes(lower(item.status))),
    ["due_date", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildOverdueActions(data) {
  return sortSoonest(
    data.reviewActions.filter(
      (item) =>
        !["completed", "closed", "resolved"].includes(lower(item.status)) &&
        isOverdue(item.due_date)
    ),
    ["due_date", "created_at"]
  ).slice(0, 8);
}

function buildRecentReviews(data) {
  return sortNewest(data.reviews, ["review_date", "updated_at", "created_at"]).slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    [...data.reviews, ...data.reviewActions],
    ["review_date", "due_date", "updated_at", "created_at"]
  ).slice(0, 20);
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view reviews."
    );
    updateWorkspaceSummaryStrip({
      today: "No review context",
      nextEvent: "No review due",
      lastRecord: "No review data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div><div class="spinner" aria-hidden="true"></div><p>Loading reviews...</p></div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const upcomingReviews = buildUpcomingReviews(data);
    const openActions = buildOpenActions(data);
    const overdueActions = buildOverdueActions(data);
    const recentReviews = buildRecentReviews(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      upcomingReviews,
      overdueActions,
      openActions,
      recentReviews,
      timeline,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${recentReviews.length} reviews • preview mode`
        : `${recentReviews.length} reviews loaded`,
      nextEvent: upcomingReviews[0]?.next_review_date
        ? `Next review ${formatDate(upcomingReviews[0].next_review_date)}`
        : "No upcoming review",
      lastRecord: recentReviews[0]?.review_date
        ? `Last review ${formatDate(recentReviews[0].review_date)}`
        : "No review recorded",
      openActions: `${openActions.length} open • ${overdueActions.length} overdue`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[reviews] load failed", error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load reviews",
      error?.message || "Something went wrong while loading reviews."
    );
    updateWorkspaceSummaryStrip({
      today: "Reviews unavailable",
      nextEvent: "No review due",
      lastRecord: "No review data",
      openActions: "Check review routes",
    });
  }
}
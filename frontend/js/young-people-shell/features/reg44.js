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

const SAFE_EMPTY = Object.freeze({ items: [] });

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

function lower(value) {
  return String(value ?? "").toLowerCase().trim().replaceAll(" ", "_");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

function badgeClass(status) {
  const v = lower(status);

  if (
    [
      "overdue",
      "critical",
      "high",
      "urgent",
      "inadequate",
      "requires_improvement",
      "requires_action",
      "open",
      "escalated",
      "late",
      "failed",
      "missing",
      "red",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "due",
      "pending",
      "scheduled",
      "in_progress",
      "planned",
      "review_due",
      "warning",
      "medium",
      "amber",
      "awaiting_review",
      "active",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "completed",
      "closed",
      "resolved",
      "good",
      "outstanding",
      "approved",
      "current",
      "up_to_date",
      "green",
      "done",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonest(items = [], key) {
  return [...items].sort((a, b) => {
    const aTime = a?.[key] ? toTime(a[key]) : Number.POSITIVE_INFINITY;
    const bTime = b?.[key] ? toTime(b[key]) : Number.POSITIVE_INFINITY;
    return aTime - bTime;
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

function isClosedStatus(status = "") {
  return ["completed", "closed", "cancelled", "resolved"].includes(lower(status));
}

function isOverdue(dateValue, status = "") {
  if (!dateValue || isClosedStatus(status)) return false;

  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return false;

  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return due.getTime() < now.getTime();
}

function getHomeIds() {
  if (Array.isArray(state.allowedHomeIds) && state.allowedHomeIds.length) {
    return state.allowedHomeIds
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  const homeId = Number(
    state.homeId || state.currentUser?.home_id || state.currentUser?.homeId || 0
  );

  return Number.isFinite(homeId) && homeId > 0 ? [homeId] : [];
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

/* ------------------------------ mappers ------------------------------ */

function mapVisit(v = {}) {
  return {
    id: v.id ?? v.visit_id ?? null,
    home_id: v.home_id ?? null,
    home_name: v.home_name || `Home ${v.home_id ?? ""}`,
    title:
      v.title ||
      `Reg 44 visit${v.visit_date ? ` - ${formatDate(v.visit_date)}` : ""}`,
    visitor:
      v.visitor_name ||
      v.visitor ||
      v.independent_person_name ||
      "Independent visitor",
    visit_date: v.visit_date || null,
    status: v.status || "completed",
    summary:
      v.summary ||
      v.overall_summary ||
      v.recommendations_summary ||
      "Regulation 44 visit recorded.",
    judgement: v.judgement || v.overall_judgement || "",
    recommendations_summary: v.recommendations_summary || "",
    created_at: v.created_at || null,
    updated_at: v.updated_at || null,
    record_type: "reg44_visit",
  };
}

function mapAction(a = {}) {
  return {
    id: a.id ?? a.action_id ?? null,
    home_id: a.home_id ?? null,
    home_name: a.home_name || `Home ${a.home_id ?? ""}`,
    title: a.title || a.action_title || "Reg 44 action",
    description: a.description || a.action_description || "",
    status: a.status || "open",
    priority: a.priority || "",
    due_date: a.due_date || null,
    owner: a.owner_name || a.owner_user_name || a.owner_staff_name || "",
    summary:
      a.summary ||
      a.action_description ||
      a.description ||
      "Regulation 44 action recorded.",
    completed_at: a.completed_at || null,
    created_at: a.created_at || null,
    updated_at: a.updated_at || null,
    record_type: "reg44_action",
  };
}

/* ------------------------------ fallback ------------------------------ */

function buildFallback(homeIds = []) {
  const ids = homeIds.length ? homeIds : [1, 2, 3];
  const now = new Date();

  const daysAgo = (n, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const daysAhead = (n, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return {
    visits: [
      mapVisit({
        id: "rv-1",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        visit_date: daysAgo(5),
        visitor_name: "Independent Visitor",
        judgement: "Good",
        status: "completed",
        summary:
          "Positive relationships observed. Some minor documentation gaps were noted.",
        recommendations_summary:
          "Tighten review-date checks on a small number of records.",
        created_at: daysAgo(5),
        updated_at: daysAgo(5),
      }),
      mapVisit({
        id: "rv-2",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        visit_date: daysAgo(18),
        visitor_name: "Independent Visitor",
        judgement: "Requires improvement",
        status: "completed",
        summary:
          "Visit noted inconsistent management oversight and some delay in action follow-up.",
        recommendations_summary:
          "Complete overdue actions and evidence stronger management review.",
        created_at: daysAgo(18),
        updated_at: daysAgo(18),
      }),
    ],
    actions: [
      mapAction({
        id: "ra-1",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        title: "Update missing risk review",
        description:
          "Review and update the missing from care risk assessment and linked guidance.",
        status: "open",
        priority: "high",
        due_date: daysAhead(3),
        owner_name: "Manager",
        created_at: daysAgo(2),
      }),
      mapAction({
        id: "ra-2",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        title: "Evidence management oversight",
        description:
          "Strengthen links between Reg 44 concerns, actions and manager review.",
        status: "overdue",
        priority: "high",
        due_date: daysAgo(2),
        owner_name: "Deputy Manager",
        created_at: daysAgo(10),
      }),
    ],
    isFallback: true,
  };
}

/* ------------------------------ selectors ------------------------------ */

function buildRecentVisits(data) {
  return sortNewest(data.visits, ["visit_date", "updated_at", "created_at"]).slice(0, 10);
}

function buildOpenActions(data) {
  return sortSoonest(
    data.actions.filter((a) => !isClosedStatus(a.status)),
    "due_date"
  ).slice(0, 10);
}

function buildOverdueActions(data) {
  return sortSoonest(
    data.actions.filter(
      (a) => lower(a.status) === "overdue" || isOverdue(a.due_date, a.status)
    ),
    "due_date"
  ).slice(0, 10);
}

function buildHomesNeedingAttention(visits = [], actions = []) {
  const grouped = new Map();

  [...visits, ...actions].forEach((item) => {
    const homeId = item.home_id || item.home_name || "unknown";
    const existing = grouped.get(homeId) || {
      home_name: item.home_name || "Home",
      open_actions: 0,
      overdue_actions: 0,
      latest_visit_date: null,
      latest_judgement: "",
      concerns: [],
    };

    if (item.record_type === "reg44_action" && !isClosedStatus(item.status)) {
      existing.open_actions += 1;
      if (lower(item.status) === "overdue" || isOverdue(item.due_date, item.status)) {
        existing.overdue_actions += 1;
      }
      if (item.title) existing.concerns.push(item.title);
    }

    if (item.record_type === "reg44_visit") {
      if (!existing.latest_visit_date || toTime(item.visit_date) > toTime(existing.latest_visit_date)) {
        existing.latest_visit_date = item.visit_date;
        existing.latest_judgement = item.judgement || "";
      }
      if (item.recommendations_summary) {
        existing.concerns.push(item.recommendations_summary);
      }
    }

    grouped.set(homeId, existing);
  });

  return [...grouped.values()]
    .filter((item) => {
      const judgement = lower(item.latest_judgement);
      return (
        item.overdue_actions > 0 ||
        item.open_actions >= 2 ||
        ["requires_improvement", "inadequate"].includes(judgement)
      );
    })
    .map((item) => ({
      title: item.home_name,
      summary: [
        item.latest_judgement ? `Judgement ${titleCase(item.latest_judgement)}` : "",
        item.overdue_actions ? `${item.overdue_actions} overdue` : "",
        item.open_actions ? `${item.open_actions} open actions` : "",
        item.latest_visit_date ? `Last visit ${formatDate(item.latest_visit_date)}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    }))
    .slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    dedupeBy(
      [...data.visits, ...data.actions],
      (item) => `${item.record_type}:${item.id}:${item.home_id || ""}`
    ),
    ["due_date", "visit_date", "completed_at", "updated_at", "created_at"]
  ).slice(0, 25);
}

/* ------------------------------ render ------------------------------ */

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

function renderLoading() {
  return `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading Regulation 44...</p>
        </div>
      </div>
    </section>
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
  const status = item.status || item.priority || item.judgement || "";
  const primaryDate =
    options.primaryDate ||
    item.visit_date ||
    item.due_date ||
    item.completed_at ||
    item.updated_at ||
    item.created_at;

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "record")}"
      data-title="${safeText(item.title || item.home_name || "Record")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(
            item.title || item.home_name || "Record"
          )}</div>
          <div class="record-card-meta">${safeText(
            formatDateTime(primaryDate, "No date")
          )}</div>
        </div>
        ${
          status
            ? `<span class="${badgeClass(status)}">${safeText(
                titleCase(status)
              )}</span>`
            : ""
        }
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(
          item.summary || item.description || ""
        )}</div>

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
            item.visitor
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Visitor</div>
                  <div class="details-grid-value">${safeText(item.visitor)}</div>
                </div>
              `
              : ""
          }

          ${
            item.owner
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">${safeText(item.owner)}</div>
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
            item.judgement
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Judgement</div>
                  <div class="details-grid-value">${safeText(titleCase(item.judgement))}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.recommendations_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Recommendations</div>
                <div>${safeText(item.recommendations_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action detail</div>
                <div>${safeText(item.description)}</div>
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
        <p>No urgent Reg 44 issues are showing right now.</p>
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
              <strong>${safeText(item.title || "Issue")}</strong>
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
      "No Regulation 44 activity yet",
      "There is no recent Reg 44 activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.visit_date ||
            item.due_date ||
            item.completed_at ||
            item.updated_at ||
            item.created_at;

          const status = item.status || item.priority || item.judgement || "";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(
                formatDateTime(dateValue, "No date")
              )}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(
                    item.title || item.home_name || "Record"
                  )}</strong>
                  ${
                    status
                      ? `<span class="${badgeClass(status)}">${safeText(
                          titleCase(status)
                        )}</span>`
                      : ""
                  }
                </div>
                <div class="timeline-item-summary">${safeText(
                  [item.home_name, item.summary || item.description]
                    .filter(Boolean)
                    .join(" • ")
                )}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDashboard({
  visits,
  openActions,
  overdueActions,
  homesNeedingAttention,
  timeline,
  isFallback,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Regulation 44</div>
          <h2>${safeText(getProviderLabel())} • independent visitor oversight</h2>
          <p>External scrutiny, visit themes, open actions and cross-home attention points.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live Reg 44 routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Recent visits", visits.length)}
        ${renderStatCard("Open actions", openActions.length)}
        ${renderStatCard("Overdue actions", overdueActions.length)}
        ${renderStatCard("Homes needing attention", homesNeedingAttention.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Recent visits",
            renderCardList(
              visits,
              "No visits recorded",
              "No Regulation 44 visits have been returned yet."
            )
          )}

          ${renderSection(
            "Open actions",
            renderCardList(
              openActions,
              "No open actions",
              "There are no open Regulation 44 actions currently recorded."
            )
          )}

          ${renderSection(
            "Regulation 44 timeline",
            renderTimeline(timeline)
          )}
        </div>

        <aside>
          ${renderSection(
            "Homes needing attention",
            renderPriorityList(homesNeedingAttention)
          )}

          ${renderSection(
            "Overdue actions",
            renderCardList(
              overdueActions,
              "No overdue actions",
              "There are no overdue Regulation 44 actions right now."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* ------------------------------ fetch ------------------------------ */

async function fetchAll(homeIds) {
  const results = await Promise.all(
    homeIds.map(async (id) => {
      const [visitsRes, actionsRes] = await Promise.all([
        safeGet(`/homes/${id}/reg44`),
        safeGet(`/homes/${id}/reg44/actions`),
      ]);

      return {
        visits: pickItems(visitsRes, ["reg44_visits", "items", "visits"]).map((item) =>
          mapVisit({
            ...item,
            home_id: item.home_id || id,
            home_name: item.home_name || `Home ${id}`,
          })
        ),
        actions: pickItems(actionsRes, ["reg44_actions", "items", "actions"]).map((item) =>
          mapAction({
            ...item,
            home_id: item.home_id || id,
            home_name: item.home_name || `Home ${id}`,
          })
        ),
      };
    })
  );

  const visits = results.flatMap((r) => r.visits);
  const actions = results.flatMap((r) => r.actions);

  if (!visits.length && !actions.length) {
    return buildFallback(homeIds);
  }

  return { visits, actions, isFallback: false };
}

/* ------------------------------ public ------------------------------ */

export async function loadReg44() {
  if (!els.viewContent) return;

  const homeIds = getHomeIds();

  if (!homeIds.length) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        ${renderEmpty(
          "No homes available",
          "There are no accessible homes available for Regulation 44 review."
        )}
      </section>
    `;

    updateWorkspaceSummaryStrip({
      today: "No provider context",
      nextEvent: "No Reg 44 actions due",
      lastRecord: "No Reg 44 data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = renderLoading();

  try {
    const data = await fetchAll(homeIds);

    const visits = buildRecentVisits(data);
    const openActions = buildOpenActions(data);
    const overdueActions = buildOverdueActions(data);
    const homesNeedingAttention = buildHomesNeedingAttention(data.visits, data.actions);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderDashboard({
      visits,
      openActions,
      overdueActions,
      homesNeedingAttention,
      timeline,
      isFallback: data.isFallback,
    });

    const nextAction = openActions[0] || null;
    const latestVisit = visits[0] || null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${visits.length} visits • preview mode`
        : `${visits.length} visits • ${openActions.length} open actions`,
      nextEvent: nextAction?.due_date
        ? `Action due ${formatDate(nextAction.due_date)}`
        : "No Reg 44 action due",
      lastRecord: latestVisit?.visit_date
        ? `Last visit ${formatDate(latestVisit.visit_date)}`
        : "No recent visit",
      openActions: `${openActions.length} open • ${overdueActions.length} overdue`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (err) {
    console.error("[reg44] load failed", err);

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        ${renderEmpty(
          "Unable to load Regulation 44",
          "Something went wrong while loading Reg 44 visits and actions."
        )}
      </section>
    `;

    updateWorkspaceSummaryStrip({
      today: "Reg 44 unavailable",
      nextEvent: "No Reg 44 action due",
      lastRecord: "No Reg 44 data",
      openActions: "Check Reg 44 routes",
    });
  }
}
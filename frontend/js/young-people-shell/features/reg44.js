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
  return String(value ?? "").toLowerCase().trim().replaceAll(" ", "_");
}

function formatDate(value) {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
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

  if (["overdue", "critical", "inadequate", "requires_improvement"].includes(v))
    return "badge badge-danger";

  if (["due", "pending", "scheduled", "in_progress"].includes(v))
    return "badge badge-warning";

  if (["completed", "good", "outstanding"].includes(v))
    return "badge badge-success";

  return "badge";
}

function getHomeIds() {
  if (Array.isArray(state.allowedHomeIds) && state.allowedHomeIds.length) {
    return state.allowedHomeIds;
  }

  if (state.homeId) return [state.homeId];

  return [];
}

/* ------------------------------ mappers ------------------------------ */

function mapVisit(v = {}) {
  return {
    id: v.id,
    home_id: v.home_id,
    home_name: v.home_name || `Home ${v.home_id}`,
    visitor: v.visitor_name || v.visitor || "Independent visitor",
    visit_date: v.visit_date,
    status: v.status || "completed",
    summary: v.summary || "",
    judgement: v.judgement || "",
    created_at: v.created_at,
    updated_at: v.updated_at,
    record_type: "reg44_visit",
  };
}

function mapAction(a = {}) {
  return {
    id: a.id,
    home_id: a.home_id,
    home_name: a.home_name || `Home ${a.home_id}`,
    title: a.title || "Reg 44 action",
    description: a.description || "",
    status: a.status || "open",
    priority: a.priority || "",
    due_date: a.due_date,
    owner: a.owner_name || "",
    created_at: a.created_at,
    updated_at: a.updated_at,
    record_type: "reg44_action",
  };
}

/* ------------------------------ fallback ------------------------------ */

function buildFallback(homeIds) {
  const now = new Date();

  const days = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  const future = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  return {
    visits: [
      mapVisit({
        id: 1,
        home_id: homeIds[0],
        home_name: `Home ${homeIds[0]}`,
        visit_date: days(5),
        visitor_name: "Independent Visitor",
        judgement: "Good",
        summary: "Positive relationships observed. Some minor documentation gaps.",
      }),
    ],
    actions: [
      mapAction({
        id: 1,
        home_id: homeIds[0],
        title: "Update missing risk review",
        status: "open",
        priority: "high",
        due_date: future(3),
        owner_name: "Manager",
      }),
    ],
    isFallback: true,
  };
}

/* ------------------------------ fetch ------------------------------ */

async function fetchAll(homeIds) {
  const safe = (url) => apiGet(url).catch(() => null);

  const results = await Promise.all(
    homeIds.map(async (id) => {
      const [visits, actions] = await Promise.all([
        safe(`/homes/${id}/reg44`),
        safe(`/homes/${id}/reg44/actions`),
      ]);

      return {
        visits: toArray(visits?.items).map(mapVisit),
        actions: toArray(actions?.items).map(mapAction),
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

/* ------------------------------ render ------------------------------ */

function renderCard(item) {
  return `
    <article class="record-card">
      <div class="record-card-head">
        <strong>${safeText(item.title || item.home_name)}</strong>
        <span class="${badgeClass(item.status || item.judgement)}">
          ${safeText(item.status || item.judgement)}
        </span>
      </div>
      <div class="record-card-body">
        <p>${safeText(item.summary || item.description)}</p>
        <div class="record-card-meta">
          ${safeText(formatDate(item.visit_date || item.due_date))}
        </div>
      </div>
    </article>
  `;
}

function renderList(items, empty) {
  if (!items.length) {
    return `<div class="empty-state"><p>${safeText(empty)}</p></div>`;
  }

  return `<div class="record-card-list">
    ${items.map(renderCard).join("")}
  </div>`;
}

function renderDashboard({ visits, actions, isFallback }) {
  const overdue = actions.filter(
    (a) => lower(a.status) === "overdue"
  ).length;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Regulation 44</div>
          <h2>Independent visitor oversight</h2>
          <p>External scrutiny, actions and inspection readiness.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Preview data shown</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        <article class="overview-stat-card">
          <span>Visits</span>
          <strong>${visits.length}</strong>
        </article>
        <article class="overview-stat-card">
          <span>Actions</span>
          <strong>${actions.length}</strong>
        </article>
        <article class="overview-stat-card ${
          overdue ? "overview-stat-card--danger" : ""
        }">
          <span>Overdue</span>
          <strong>${overdue}</strong>
        </article>
      </div>

      <div class="overview-grid">
        <div>
          <h3>Recent visits</h3>
          ${renderList(visits, "No visits recorded")}
        </div>

        <aside>
          <h3>Open actions</h3>
          ${renderList(actions, "No actions")}
        </aside>
      </div>
    </section>
  `;
}

/* ------------------------------ public ------------------------------ */

export async function loadReg44() {
  if (!els.viewContent) return;

  const homeIds = getHomeIds();

  if (!homeIds.length) {
    els.viewContent.innerHTML = `<p>No homes available</p>`;
    return;
  }

  els.viewContent.innerHTML = `<p>Loading Reg 44...</p>`;

  try {
    const data = await fetchAll(homeIds);

    els.viewContent.innerHTML = renderDashboard(data);

    updateWorkspaceSummaryStrip({
      today: `${data.visits.length} visits`,
      nextEvent: data.actions[0]?.due_date
        ? `Action due ${formatDate(data.actions[0].due_date)}`
        : "No actions due",
      lastRecord: data.visits[0]?.visit_date
        ? `Last visit ${formatDate(data.visits[0].visit_date)}`
        : "No visit",
      openActions: `${data.actions.length} actions`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (err) {
    console.error(err);
    els.viewContent.innerHTML = `<p>Failed to load Reg 44</p>`;
  }
}
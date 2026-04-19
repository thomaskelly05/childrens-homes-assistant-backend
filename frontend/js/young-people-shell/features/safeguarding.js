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

function badgeClass(value) {
  const v = lower(value);

  if (["critical", "high", "urgent", "open", "escalated", "strategy_required"].includes(v)) {
    return "badge badge-danger";
  }
  if (["pending", "under_review", "monitoring", "planned", "medium"].includes(v)) {
    return "badge badge-warning";
  }
  if (["closed", "resolved", "completed", "current", "low"].includes(v)) {
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

function hasUsableData(data = {}) {
  return Object.values(data).some((v) => Array.isArray(v) && v.length > 0);
}

function mapConcern(record = {}) {
  return {
    id: record.id,
    title: record.title || "Safeguarding concern",
    concern_type: record.concern_type || "",
    status: record.status || "",
    severity: record.severity || "",
    occurred_at: record.occurred_at || record.concern_date || null,
    summary:
      record.summary ||
      record.concern_details ||
      record.notes ||
      "Safeguarding concern recorded.",
    action_taken: record.action_taken || "",
    child_voice: record.child_voice || "",
    record_type: "safeguarding_concern",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapStrategyAction(record = {}) {
  return {
    id: record.id,
    title: record.title || record.action_title || "Safeguarding action",
    status: record.status || "",
    priority: record.priority || "",
    due_date: record.due_date || null,
    owner_name: record.owner_name || "",
    summary:
      record.summary ||
      record.action_description ||
      record.notes ||
      "Safeguarding action recorded.",
    record_type: "safeguarding_action",
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
    concerns: [
      mapConcern({
        id: "sg-1",
        title: "Peer exploitation concern",
        concern_type: "contextual_safeguarding",
        status: "open",
        severity: "high",
        occurred_at: minusDays(3),
        summary: "Concern about older peer influence and pressure outside placement.",
        action_taken: "Safety planning, parent / carer liaison and increased community mapping.",
        child_voice: "Young person said they do not feel pressured but want support to step back.",
      }),
      mapConcern({
        id: "sg-2",
        title: "Online safety concern",
        concern_type: "online_risk",
        status: "monitoring",
        severity: "medium",
        occurred_at: minusDays(8),
        summary: "Unsafe contact through social media required further exploration.",
      }),
    ],
    actions: [
      mapStrategyAction({
        id: "sga-1",
        title: "Update contextual safety plan",
        status: "open",
        priority: "high",
        due_date: plusDays(2),
        owner_name: "Keyworker",
        summary: "Reflect latest concerns and disruption planning.",
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
      <div class="overview-panel-section-head"><h3>${safeText(title)}</h3></div>
      ${content}
    </section>
  `;
}

function renderCard(item = {}) {
  const status = item.severity || item.priority || item.status || "recorded";

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "safeguarding_concern")}"
      data-title="${safeText(item.title || "Safeguarding")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Safeguarding")}</div>
          <div class="record-card-meta">${safeText(
            formatDateTime(item.occurred_at || item.due_date || item.created_at)
          )}</div>
        </div>
        <span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>
        ${
          item.action_taken
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action taken</div>
                <div>${safeText(item.action_taken)}</div>
              </div>
            `
            : ""
        }
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
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items.map(renderCard).join("")}</div>`;
}

function renderWorkspace(payload) {
  const { openConcerns, recentConcerns, actions, isFallback } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Safeguarding</div>
          <h2>Concerns, context and follow-up</h2>
          <p class="overview-panel-subtitle">
            A live view of safeguarding concerns, escalation and follow-up work.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live safeguarding routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open concerns", openConcerns.length)}
        ${renderStatCard("Recent concerns", recentConcerns.length)}
        ${renderStatCard("Open actions", actions.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Open concerns",
            renderCardList(
              openConcerns,
              "No open concerns",
              "There are no open safeguarding concerns."
            )
          )}

          ${renderSection(
            "Recent concerns",
            renderCardList(
              recentConcerns,
              "No recent concerns",
              "No recent safeguarding concerns have been recorded."
            )
          )}
        </div>

        <aside>
          ${renderSection(
            "Safeguarding actions",
            renderCardList(
              actions,
              "No open actions",
              "There are no open safeguarding actions."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

async function fetchAll(youngPersonId) {
  const [concernsRes, actionsRes] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/safeguarding-concerns`),
    safeGet(`/young-people/${youngPersonId}/safeguarding-actions`),
  ]);

  const data = {
    concerns: pickItems(concernsRes, ["safeguarding_concerns", "concerns", "items"]).map(mapConcern),
    actions: pickItems(actionsRes, ["safeguarding_actions", "actions", "items"]).map(mapStrategyAction),
  };

  if (!hasUsableData(data)) return buildFallbackData();
  return { ...data, isFallback: false };
}

function buildOpenConcerns(data) {
  return sortNewest(
    data.concerns.filter((item) => !["closed", "resolved"].includes(lower(item.status))),
    ["occurred_at", "updated_at", "created_at"]
  ).slice(0, 8);
}

function buildRecentConcerns(data) {
  return sortNewest(data.concerns, ["occurred_at", "updated_at", "created_at"]).slice(0, 8);
}

function buildActions(data) {
  return sortNewest(
    data.actions.filter((item) => !["completed", "closed", "resolved"].includes(lower(item.status))),
    ["due_date", "updated_at", "created_at"]
  ).slice(0, 8);
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view safeguarding."
    );
    updateWorkspaceSummaryStrip({
      today: "No safeguarding context",
      nextEvent: "No action due",
      lastRecord: "No safeguarding data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state"><div><div class="spinner" aria-hidden="true"></div><p>Loading safeguarding...</p></div></div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const openConcerns = buildOpenConcerns(data);
    const recentConcerns = buildRecentConcerns(data);
    const actions = buildActions(data);

    els.viewContent.innerHTML = renderWorkspace({
      openConcerns,
      recentConcerns,
      actions,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${openConcerns.length} open concerns • preview mode`
        : `${openConcerns.length} open concerns`,
      nextEvent: actions[0]?.due_date
        ? `Due ${formatDate(actions[0].due_date)}`
        : "No action due",
      lastRecord: recentConcerns[0]?.occurred_at
        ? `Last concern ${formatDate(recentConcerns[0].occurred_at)}`
        : "No recent concern",
      openActions: `${actions.length} open safeguarding actions`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[safeguarding] load failed", error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load safeguarding",
      error?.message || "Something went wrong while loading safeguarding."
    );
    updateWorkspaceSummaryStrip({
      today: "Safeguarding unavailable",
      nextEvent: "No action due",
      lastRecord: "No safeguarding data",
      openActions: "Check safeguarding routes",
    });
  }
}
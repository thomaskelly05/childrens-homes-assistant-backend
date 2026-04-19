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

function badgeClass(value) {
  const v = lower(value);
  if (["high", "urgent", "overdue", "blocked"].includes(v)) return "badge badge-danger";
  if (["pending", "in_progress", "planned", "due_soon"].includes(v)) return "badge badge-warning";
  if (["completed", "current", "good", "ready"].includes(v)) return "badge badge-success";
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
  return Object.values(data).some((v) => Array.isArray(v) && v.length > 0);
}

function mapLeavingCareItem(record = {}) {
  return {
    id: record.id,
    title: record.title || record.area || "Leaving care item",
    area: record.area || "",
    due_date: record.due_date || record.target_date || null,
    status: record.status || "",
    summary:
      record.summary ||
      record.notes ||
      record.description ||
      "Leaving care item recorded.",
    record_type: "leaving_care_item",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function buildFallbackData() {
  const now = new Date();

  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  return {
    items: [
      mapLeavingCareItem({
        id: "lc-1",
        title: "Complete pathway discussion",
        area: "Pathway planning",
        due_date: plusDays(14),
        status: "planned",
        summary: "Begin structured discussion about independence, support and future goals.",
      }),
      mapLeavingCareItem({
        id: "lc-2",
        title: "Review accommodation options",
        area: "Accommodation",
        due_date: plusDays(30),
        status: "in_progress",
        summary: "Explore realistic accommodation pathways and support needs.",
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

function renderCard(item = {}) {
  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="leaving_care_item"
      data-title="${safeText(item.title || "Leaving care item")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Leaving care item")}</div>
          <div class="record-card-meta">${safeText(formatDate(item.due_date))}</div>
        </div>
        <span class="${badgeClass(item.status || "recorded")}">${safeText(titleCase(item.status || "recorded"))}</span>
      </div>
      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>
      </div>
    </article>
  `;
}

function renderWorkspace({ items, isFallback }) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Leaving care</div>
          <h2>Pathway and leaving-care preparation</h2>
          <p class="overview-panel-subtitle">
            Preparation for adulthood, accommodation, identity, money and support planning.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live leaving-care routes are available.</p>`
              : ""
          }
        </div>
      </div>
      ${
        items.length
          ? `<div class="record-card-list">${items.map(renderCard).join("")}</div>`
          : renderEmpty("No leaving-care items", "No leaving-care items are currently recorded.")
      }
    </section>
  `;
}

async function fetchAll(youngPersonId) {
  const res = await safeGet(`/young-people/${youngPersonId}/leaving-care`);
  const data = {
    items: pickItems(res, ["leaving_care", "pathway_items", "items"]).map(mapLeavingCareItem),
  };
  if (!hasUsableData(data)) return buildFallbackData();
  return { ...data, isFallback: false };
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view leaving-care planning."
    );
    updateWorkspaceSummaryStrip({
      today: "No leaving-care context",
      nextEvent: "No pathway milestone",
      lastRecord: "No leaving-care data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state"><div><div class="spinner" aria-hidden="true"></div><p>Loading leaving care...</p></div></div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);
    const items = sortSoonest(data.items, ["due_date", "updated_at", "created_at"]).slice(0, 12);

    els.viewContent.innerHTML = renderWorkspace({
      items,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${items.length} pathway items • preview mode`
        : `${items.length} pathway items`,
      nextEvent: items[0]?.due_date
        ? `Next due ${formatDate(items[0].due_date)}`
        : "No pathway milestone",
      lastRecord: items[0]?.due_date
        ? `Latest due ${formatDate(items[0].due_date)}`
        : "No recent item",
      openActions: `${items.filter((item) => !["completed", "closed"].includes(lower(item.status))).length} active items`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[leaving-care] load failed", error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load leaving care",
      error?.message || "Something went wrong while loading leaving-care planning."
    );
    updateWorkspaceSummaryStrip({
      today: "Leaving-care unavailable",
      nextEvent: "No pathway milestone",
      lastRecord: "No leaving-care data",
      openActions: "Check leaving-care routes",
    });
  }
}
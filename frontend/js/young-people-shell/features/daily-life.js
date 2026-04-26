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
  if (["high", "urgent", "open", "missed", "distressed"].includes(v)) return "badge badge-danger";
  if (["planned", "pending", "monitoring", "medium"].includes(v)) return "badge badge-warning";
  if (["completed", "good", "settled", "achieved", "positive"].includes(v)) return "badge badge-success";
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

function mapDailyLife(record = {}) {
  return {
    id: record.id,
    title: record.title || record.activity_type || "Daily life record",
    activity_type: record.activity_type || "",
    event_time: record.event_time || record.recorded_at || record.created_at || null,
    status: record.status || "",
    summary:
      record.summary ||
      record.notes ||
      record.description ||
      "Daily life record.",
    child_voice: record.child_voice || "",
    outcome: record.outcome || "",
    record_type: "daily_note",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function buildFallbackData() {
  const now = new Date();

  const minusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  };

  return {
    items: [
      mapDailyLife({
        id: "dl-1",
        title: "Morning routine",
        activity_type: "routine",
        event_time: minusHours(10),
        status: "positive",
        summary: "Young person got ready for school with one prompt and settled well.",
      }),
      mapDailyLife({
        id: "dl-2",
        title: "Community activity",
        activity_type: "activity",
        event_time: minusHours(6),
        status: "completed",
        summary: "Attended football session and engaged positively with peers.",
        child_voice: "Said they want to go again next week.",
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
      data-record-type="daily_note"
      data-title="${safeText(item.title || "Daily life record")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Daily life")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(item.event_time || item.created_at))}</div>
        </div>
        <span class="${badgeClass(item.status || "recorded")}">${safeText(
          titleCase(item.status || "recorded")
        )}</span>
      </div>
      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>
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

function renderWorkspace({ recentItems, isFallback }) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Daily life</div>
          <h2>Routines, activities and lived experience</h2>
          <p class="overview-panel-subtitle">
            Day-to-day life, participation and what ordinary care looked like in practice.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live daily-life routes are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderCardList(
        recentItems,
        "No daily life records",
        "There are no daily life records available."
      )}
    </section>
  `;
}

async function fetchAll(youngPersonId) {
  const res = await safeGet(`/young-people/${youngPersonId}/daily-notes`);
  const data = {
    items: pickItems(res, ["daily_life", "daily_notes", "records", "items"]).map(mapDailyLife),
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
      "Select a young person to view daily life."
    );
    updateWorkspaceSummaryStrip({
      today: "No daily-life context",
      nextEvent: "No planned event",
      lastRecord: "No daily-life data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state"><div><div class="spinner" aria-hidden="true"></div><p>Loading daily life...</p></div></div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);
    const recentItems = sortNewest(data.items, ["event_time", "updated_at", "created_at"]).slice(0, 12);

    els.viewContent.innerHTML = renderWorkspace({
      recentItems,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${recentItems.length} records • preview mode`
        : `${recentItems.length} daily-life records`,
      nextEvent: "No planned event",
      lastRecord: recentItems[0]?.event_time
        ? `Latest ${formatDateTime(recentItems[0].event_time)}`
        : "No recent record",
      openActions: "Daily-life view loaded",
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[daily-life] load failed", error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load daily life",
      error?.message || "Something went wrong while loading daily life."
    );
    updateWorkspaceSummaryStrip({
      today: "Daily-life unavailable",
      nextEvent: "No planned event",
      lastRecord: "No daily-life data",
      openActions: "Check daily-life routes",
    });
  }
}

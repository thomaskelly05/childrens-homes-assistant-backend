import { els } from "../dom.js";
import { state } from "../state.js";
import { escapeHtml } from "../core/utils.js";
import { runSuggestionAction } from "./action-router.js";

function getPanelElement() {
  return (
    els.suggestionsPanel ||
    document.getElementById("suggestionsPanel") ||
    document.querySelector("[data-suggestions-panel]")
  );
}

function getBodyElement() {
  return (
    els.suggestionsPanelBody ||
    document.getElementById("suggestionsPanelBody") ||
    document.querySelector("[data-suggestions-body]")
  );
}

function getTitleElement() {
  return (
    els.suggestionsPanelTitle ||
    document.getElementById("suggestionsPanelTitle") ||
    document.querySelector("[data-suggestions-title]")
  );
}

function getSubtitleElement() {
  return (
    els.suggestionsPanelSubtitle ||
    document.getElementById("suggestionsPanelSubtitle") ||
    document.querySelector("[data-suggestions-subtitle]")
  );
}

function makeSuggestionId(suggestion = {}, index = 0) {
  const parts = [
    suggestion.record_type ||
      suggestion.action_type ||
      suggestion.create_record_type ||
      suggestion.target_record_type ||
      "suggestion",
    suggestion.source_record_type ||
      suggestion.metadata?.source_record_type ||
      "source",
    suggestion.source_record_id ||
      suggestion.metadata?.source_record_id ||
      "new",
    index + 1,
  ];

  return `suggestion-${parts.join("-")}`;
}

function normaliseSuggestion(suggestion = {}, index = 0) {
  const recordType =
    suggestion.record_type ||
    suggestion.action_type ||
    suggestion.create_record_type ||
    suggestion.target_record_type ||
    "";

  const sourceRecordType =
    suggestion.source_record_type ||
    suggestion.metadata?.source_record_type ||
    "";

  const sourceRecordId =
    suggestion.source_record_id ||
    suggestion.metadata?.source_record_id ||
    null;

  return {
    id: suggestion.id || makeSuggestionId(suggestion, index),
    title:
      suggestion.title ||
      suggestion.label ||
      suggestion.name ||
      "Suggested follow-up",
    description:
      suggestion.description ||
      suggestion.summary ||
      suggestion.reason ||
      "",
    record_type: recordType,
    priority: String(suggestion.priority || suggestion.severity || "medium").toLowerCase(),
    source_record_type: sourceRecordType,
    source_record_id: sourceRecordId,
    prefill:
      suggestion.prefill ||
      suggestion.draft ||
      suggestion.payload ||
      {},
    metadata: {
      ...(suggestion.metadata || {}),
      source_record_type: sourceRecordType,
      source_record_id: sourceRecordId,
    },
    raw: suggestion,
  };
}

function priorityRank(priority = "") {
  const value = String(priority || "").toLowerCase();
  if (value === "high" || value === "critical") return 0;
  if (value === "medium" || value === "warning") return 1;
  return 2;
}

function priorityLabel(priority = "") {
  const value = String(priority || "").toLowerCase();
  if (value === "high" || value === "critical") return "High priority";
  if (value === "medium" || value === "warning") return "Medium priority";
  if (value === "low") return "Low priority";
  return "Suggested";
}

function priorityBadgeClass(priority = "") {
  const value = String(priority || "").toLowerCase();
  if (value === "high" || value === "critical") return "badge badge-danger";
  if (value === "medium" || value === "warning") return "badge badge-warning";
  return "badge badge-default";
}

function sourceText(item = {}) {
  const sourceType = String(item.source_record_type || "").replaceAll("_", " ");
  const sourceId = item.source_record_id;

  if (sourceType && sourceId) return `From ${sourceType} #${sourceId}`;
  if (sourceType) return `From ${sourceType}`;
  return "";
}

function groupSuggestions(items = []) {
  const groups = {
    high: [],
    medium: [],
    low: [],
  };

  items.forEach((item) => {
    const key =
      priorityRank(item.priority) === 0
        ? "high"
        : priorityRank(item.priority) === 1
        ? "medium"
        : "low";

    groups[key].push(item);
  });

  return groups;
}

function renderSuggestionCard(item = {}) {
  const source = sourceText(item);

  return `
    <div class="suggestion-card" data-suggestion-id="${escapeHtml(item.id)}">
      <div class="suggestion-card-head">
        <div>
          <div class="suggestion-card-title">${escapeHtml(item.title)}</div>
          <div class="suggestion-card-priority">
            <span class="${escapeHtml(priorityBadgeClass(item.priority))}">
              ${escapeHtml(priorityLabel(item.priority))}
            </span>
          </div>
        </div>
      </div>

      ${
        item.description
          ? `<div class="suggestion-card-body">${escapeHtml(item.description)}</div>`
          : ""
      }

      ${
        source
          ? `<div class="entity-meta">${escapeHtml(source)}</div>`
          : ""
      }

      ${
        item.record_type
          ? `<div class="entity-meta">Creates: ${escapeHtml(
              String(item.record_type).replaceAll("_", " ")
            )}</div>`
          : ""
      }

      <div class="suggestion-card-actions">
        <button
          type="button"
          class="btn btn-primary"
          data-suggestion-run="${escapeHtml(item.id)}"
        >
          Create
        </button>

        <button
          type="button"
          class="btn btn-secondary"
          data-suggestion-dismiss="${escapeHtml(item.id)}"
        >
          Dismiss
        </button>
      </div>
    </div>
  `;
}

function renderSuggestionGroup(title, items = []) {
  if (!items.length) return "";

  return `
    <section class="content-section">
      <div class="content-section-head">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(`${items.length} suggestion${items.length === 1 ? "" : "s"}`)}</p>
      </div>
      <div class="content-section-body">
        <div class="profile-stack">
          ${items.map(renderSuggestionCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function updatePanelMeta(meta = {}, count = 0) {
  const titleEl = getTitleElement();
  const subtitleEl = getSubtitleElement();

  if (titleEl) {
    titleEl.textContent = count
      ? `Suggested follow-up${count === 1 ? "" : "s"}`
      : "Suggestions";
  }

  if (subtitleEl) {
    const parts = [];

    if (meta.source_record_type) {
      parts.push(String(meta.source_record_type).replaceAll("_", " "));
    }

    if (meta.source_record_id) {
      parts.push(`Source #${meta.source_record_id}`);
    }

    subtitleEl.textContent = parts.join(" • ");
  }
}

function setSuggestionsState(suggestions = [], meta = {}) {
  state.currentSuggestions = suggestions.map((item, index) =>
    normaliseSuggestion(item, index)
  );
  state.currentSuggestionSource = meta || {};
}

function renderEmptyPanel() {
  const panel = getPanelElement();
  const body = getBodyElement();

  updatePanelMeta({}, 0);

  if (body) {
    body.innerHTML = `
      <div class="empty-state">
        <p>No suggestions right now.</p>
      </div>
    `;
  }

  if (panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }
}

function rerenderCurrentPanel() {
  showSuggestionsPanel(
    state.currentSuggestions || [],
    state.currentSuggestionSource || {}
  );
}

function dismissSuggestionById(id) {
  state.currentSuggestions = (state.currentSuggestions || []).filter(
    (item) => item.id !== id
  );

  if (!state.currentSuggestions.length) {
    hideSuggestionsPanel();
    return;
  }

  rerenderCurrentPanel();
}

function bindSuggestionCardEvents() {
  const body = getBodyElement();
  if (!body) return;

  body.querySelectorAll("[data-suggestion-run]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.suggestionRun;
      const suggestion = (state.currentSuggestions || []).find(
        (item) => item.id === id
      );
      if (!suggestion) return;

      const worked = runSuggestionAction(suggestion);
      if (worked) {
        dismissSuggestionById(id);
      }
    });
  });

  body.querySelectorAll("[data-suggestion-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.suggestionDismiss;
      dismissSuggestionById(id);
    });
  });

  body.querySelectorAll("[data-suggestion-accept-all]").forEach((button) => {
    button.addEventListener("click", () => {
      const queue = [...(state.currentSuggestions || [])];
      if (!queue.length) return;

      const first = queue[0];
      const worked = runSuggestionAction(first);

      if (worked) {
        state.currentSuggestions = queue.slice(1);
        if (!state.currentSuggestions.length) {
          hideSuggestionsPanel();
          return;
        }
        rerenderCurrentPanel();
      }
    });
  });

  body.querySelectorAll("[data-suggestion-dismiss-all]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentSuggestions = [];
      hideSuggestionsPanel();
    });
  });
}

export function showSuggestionsPanel(suggestions = [], meta = {}) {
  const panel = getPanelElement();
  const body = getBodyElement();

  setSuggestionsState(suggestions, meta);

  if (!panel || !body) return;

  updatePanelMeta(meta, state.currentSuggestions.length);

  if (!state.currentSuggestions.length) {
    renderEmptyPanel();
    return;
  }

  const sorted = [...state.currentSuggestions].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority)
  );

  const groups = groupSuggestions(sorted);

  body.innerHTML = `
    <div class="assistant-context-row" style="margin-bottom: 16px;">
      <button
        type="button"
        class="btn btn-primary"
        data-suggestion-accept-all="true"
      >
        Create next suggested record
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        data-suggestion-dismiss-all="true"
      >
        Dismiss all
      </button>
    </div>

    ${renderSuggestionGroup("High priority", groups.high)}
    ${renderSuggestionGroup("Medium priority", groups.medium)}
    ${renderSuggestionGroup("Low priority", groups.low)}
  `;

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");

  bindSuggestionCardEvents();
}

export function hideSuggestionsPanel() {
  const panel = getPanelElement();
  const body = getBodyElement();

  state.currentSuggestions = [];
  state.currentSuggestionSource = null;

  if (body) {
    body.innerHTML = "";
  }

  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }
}

export function bindSuggestionEvents() {
  const panel = getPanelElement();
  if (!panel) return;

  const closeBtn =
    els.closeSuggestionsPanelBtn ||
    document.getElementById("closeSuggestionsPanelBtn") ||
    panel.querySelector("[data-close-suggestions]");

  closeBtn?.addEventListener("click", hideSuggestionsPanel);
}

export function setSuggestions(suggestions = [], meta = {}) {
  showSuggestionsPanel(suggestions, meta);
}

export function openSuggestionsPanel() {
  const panel = getPanelElement();
  if (!panel) return;

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}
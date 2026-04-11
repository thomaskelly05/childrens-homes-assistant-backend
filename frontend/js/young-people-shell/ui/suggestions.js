import { els } from "../dom.js";
import { state } from "../state.js";
import { escapeHtml } from "../core/utils.js";
import { runSuggestionAction } from "./action-router.js";

function normaliseSuggestion(suggestion = {}) {
  return {
    id:
      suggestion.id ||
      `${suggestion.record_type || suggestion.action_type || "suggestion"}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,
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
    record_type:
      suggestion.record_type ||
      suggestion.action_type ||
      suggestion.create_record_type ||
      suggestion.target_record_type ||
      "",
    priority:
      suggestion.priority ||
      suggestion.severity ||
      "",
    source_record_type:
      suggestion.source_record_type ||
      suggestion.metadata?.source_record_type ||
      "",
    source_record_id:
      suggestion.source_record_id ||
      suggestion.metadata?.source_record_id ||
      null,
    prefill:
      suggestion.prefill ||
      suggestion.draft ||
      suggestion.payload ||
      {},
    raw: suggestion,
  };
}

function renderSuggestionCard(suggestion = {}) {
  const item = normaliseSuggestion(suggestion);

  return `
    <div class="suggestion-card" data-suggestion-id="${escapeHtml(item.id)}">
      <div class="suggestion-card-head">
        <div>
          <div class="suggestion-card-title">${escapeHtml(item.title)}</div>
          ${
            item.priority
              ? `<div class="suggestion-card-priority">${escapeHtml(item.priority)}</div>`
              : ""
          }
        </div>
      </div>

      ${
        item.description
          ? `<div class="suggestion-card-body">${escapeHtml(item.description)}</div>`
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

function bindSuggestionCardEvents() {
  const body = getBodyElement();
  if (!body) return;

  body.querySelectorAll("[data-suggestion-run]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.suggestionRun;
      const suggestion = (state.currentSuggestions || []).find(
        (item) => normaliseSuggestion(item).id === id
      );
      if (!suggestion) return;
      runSuggestionAction(suggestion);
    });
  });

  body.querySelectorAll("[data-suggestion-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.suggestionDismiss;
      state.currentSuggestions = (state.currentSuggestions || []).filter(
        (item) => normaliseSuggestion(item).id !== id
      );

      if (!state.currentSuggestions.length) {
        hideSuggestionsPanel();
        return;
      }

      showSuggestionsPanel(
        state.currentSuggestions,
        state.currentSuggestionSource || {}
      );
    });
  });
}

export function showSuggestionsPanel(suggestions = [], meta = {}) {
  const panel = getPanelElement();
  const body = getBodyElement();

  state.currentSuggestions = (suggestions || []).map(normaliseSuggestion);
  state.currentSuggestionSource = meta || {};

  if (!panel || !body) return;

  updatePanelMeta(meta, state.currentSuggestions.length);

  if (!state.currentSuggestions.length) {
    body.innerHTML = `
      <div class="empty-state">
        <p>No suggestions right now.</p>
      </div>
    `;
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    return;
  }

  body.innerHTML = state.currentSuggestions.map(renderSuggestionCard).join("");

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");

  bindSuggestionCardEvents();
}

export function hideSuggestionsPanel() {
  const panel = getPanelElement();
  const body = getBodyElement();

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
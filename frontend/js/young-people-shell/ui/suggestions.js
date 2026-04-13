import { els } from "../dom.js";
import { state } from "../state.js";
import { escapeHtml } from "../core/utils.js";
import { runSuggestionAction } from "./action-router.js";

function cleanText(value) {
  return String(value || "").trim();
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

function makeSuggestionId(suggestion = {}, index = 0) {
  const parts = [
    suggestion.action_type ||
      suggestion.record_type ||
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

function resolveActionType(value = "") {
  const type = String(value || "").trim().toLowerCase().replaceAll("-", "_");

  const aliases = {
    create: "create_record",
    create_record: "create_record",
    create_task: "create_task",
    review: "review_record",
    review_record: "review_record",
    improve: "improve_record",
    improve_record: "improve_record",
    escalate: "escalate",
    open: "open_section",
    open_section: "open_section",
  };

  return aliases[type] || "create_record";
}

function resolveRecordTypeLabel(value = "") {
  return String(value || "")
    .replaceAll("_", " ")
    .trim();
}

function normaliseSuggestion(suggestion = {}, index = 0) {
  const actionType = resolveActionType(suggestion.action_type);
  const recordType =
    suggestion.record_type ||
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
    action_type: actionType,
    record_type: recordType,
    target_record_type: suggestion.target_record_type || recordType || "",
    target_section:
      suggestion.target_section ||
      suggestion.section ||
      suggestion.prefill?.section ||
      "",
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
  if (value === "critical") return 0;
  if (value === "high") return 1;
  if (value === "medium" || value === "warning") return 2;
  return 3;
}

function priorityLabel(priority = "") {
  const value = String(priority || "").toLowerCase();
  if (value === "critical") return "Critical priority";
  if (value === "high") return "High priority";
  if (value === "medium" || value === "warning") return "Medium priority";
  if (value === "low") return "Low priority";
  return "Suggested";
}

function priorityBadgeClass(priority = "") {
  const value = String(priority || "").toLowerCase();
  if (value === "critical" || value === "high") return "badge badge-danger";
  if (value === "medium" || value === "warning") return "badge badge-warning";
  return "badge badge-default";
}

function actionLabel(actionType = "", recordType = "") {
  const action = resolveActionType(actionType);

  if (action === "create_task") return "Create task";
  if (action === "review_record") return "Review";
  if (action === "improve_record") return "Improve";
  if (action === "escalate") return "Escalate";
  if (action === "open_section") return "Open section";
  if (action === "create_record") {
    if (recordType) {
      return `Create ${resolveRecordTypeLabel(recordType)}`;
    }
    return "Create";
  }

  return "Open";
}

function actionHint(item = {}) {
  const action = resolveActionType(item.action_type);

  if (action === "open_section" && item.target_section) {
    return `Opens: ${resolveRecordTypeLabel(item.target_section)}`;
  }

  if (item.record_type) {
    return `Target: ${resolveRecordTypeLabel(item.record_type)}`;
  }

  return "";
}

function sourceText(item = {}) {
  const sourceType = resolveRecordTypeLabel(item.source_record_type || "");
  const sourceId = item.source_record_id;

  if (sourceType && sourceId) return `From ${sourceType} #${sourceId}`;
  if (sourceType) return `From ${sourceType}`;
  return "";
}

function groupSuggestions(items = []) {
  const groups = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  items.forEach((item) => {
    const value = String(item.priority || "").toLowerCase();

    if (value === "critical") {
      groups.critical.push(item);
      return;
    }

    if (value === "high") {
      groups.high.push(item);
      return;
    }

    if (value === "medium" || value === "warning") {
      groups.medium.push(item);
      return;
    }

    groups.low.push(item);
  });

  return groups;
}

function renderSuggestionCard(item = {}) {
  const source = sourceText(item);
  const hint = actionHint(item);
  const buttonText = actionLabel(item.action_type, item.record_type);

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
        hint
          ? `<div class="entity-meta">${escapeHtml(hint)}</div>`
          : ""
      }

      <div class="suggestion-card-actions">
        <button
          type="button"
          class="btn btn-primary"
          data-suggestion-run="${escapeHtml(item.id)}"
        >
          ${escapeHtml(buttonText)}
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
      parts.push(resolveRecordTypeLabel(meta.source_record_type));
    }

    if (meta.source_record_id) {
      parts.push(`Source #${meta.source_record_id}`);
    }

    if (count) {
      parts.push(`${count} active`);
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

function acceptNextSuggestion() {
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
}

function dismissAllSuggestions() {
  state.currentSuggestions = [];
  hideSuggestionsPanel();
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
    button.addEventListener("click", acceptNextSuggestion);
  });

  body.querySelectorAll("[data-suggestion-dismiss-all]").forEach((button) => {
    button.addEventListener("click", dismissAllSuggestions);
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
        Run next suggestion
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        data-suggestion-dismiss-all="true"
      >
        Dismiss all
      </button>
    </div>

    ${renderSuggestionGroup("Critical priority", groups.critical)}
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

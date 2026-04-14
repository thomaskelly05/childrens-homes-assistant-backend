import { state, createAssistantMeta } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";
import { getActionForQuickButton } from "./action-router.js";

let assistantUiBound = false;

function qs(id) {
  return document.getElementById(id);
}

function getEl(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      const found = qs(candidate);
      if (found) return found;
      continue;
    }
    return candidate;
  }
  return null;
}

function getCurrentPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function ensureAssistantArrays() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }
}

function getAssistantMeta() {
  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = createAssistantMeta();
  }

  if (!Array.isArray(state.assistantMeta.sources)) {
    state.assistantMeta.sources = [];
  }

  if (!Array.isArray(state.assistantMeta.suggested_actions)) {
    state.assistantMeta.suggested_actions = [];
  }

  state.assistantMeta.runtime = state.assistantMeta.runtime || {};
  state.assistantMeta.explainability = state.assistantMeta.explainability || {};
  state.assistantMeta.assistant_scope = state.assistantMeta.assistant_scope || {};
  state.assistantMeta.assistant_context = state.assistantMeta.assistant_context || {};

  return state.assistantMeta;
}

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function normaliseSectionLabel(section = "") {
  return String(section || "workspace")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function getPersonLabel() {
  const person = getCurrentPerson();
  return getDisplayName(person || {}) || "Young person";
}

function getHomeLabel() {
  const person = getCurrentPerson() || {};
  return (
    person.home_name ||
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
}

function getScopeLabel() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home assistant";
  if (scope === "quality") return "Quality assistant";
  return "Young person assistant";
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function renderAssistantRichText(text = "") {
  const escaped = escapeHtml(String(text || ""));

  const withRules = escaped
    .replace(/^---$/gm, '<hr class="assistant-divider" />')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h4>$1</h4>")
    .replace(/^# (.*)$/gm, "<h4>$1</h4>");

  const lines = withRules.split("\n");
  let html = "";
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += "<p></p>";
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${line}</p>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (line.startsWith("<h4>") || line.startsWith("<hr")) {
      html += line;
    } else {
      html += `<p>${line}</p>`;
    }
  }

  if (inList) {
    html += "</ul>";
  }

  return html || "<p></p>";
}

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass = role === "user" ? "assistant-message-user" : "assistant-message-system";
  const content = String(message.content || message.text || "");

  return `
    <article class="assistant-message ${escapeHtml(roleClass)}">
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      <div class="assistant-message-body">
        ${
          role === "assistant"
            ? renderAssistantRichText(content)
            : `<p>${escapeHtml(content)}</p>`
        }
      </div>
    </article>
  `;
}

function buildIntroMessageHtml() {
  const scope = getCurrentScope();

  return `
    <div class="assistant-helper-text">
      ${
        scope === "child"
          ? state.youngPersonId
            ? `
              <p><strong>Ask about ${escapeHtml(getPersonLabel())}.</strong></p>
              <p>You can ask for a full summary, chronology, important dates, risks, appointments, family contact themes, or a handover.</p>
            `
            : `<p>Select a young person to start.</p>`
          : scope === "home"
          ? `
            <p><strong>Ask about ${escapeHtml(getHomeLabel())}.</strong></p>
            <p>You can ask for staffing, compliance, chronology, overdue items, management priorities, or a full home summary.</p>
          `
          : `
            <p><strong>Ask about ${escapeHtml(getHomeLabel())} quality and oversight.</strong></p>
            <p>You can ask for audit themes, compliance gaps, chronology, inspection readiness, or RI-focused summaries.</p>
          `
      }
    </div>
  `;
}

function renderMessageList(host, messages = []) {
  if (!host) return;

  host.innerHTML = `
    ${buildIntroMessageHtml()}
    <div class="assistant-history">
      ${messages.map(renderMessage).join("")}
    </div>
  `;
  host.scrollTop = host.scrollHeight;
}

function renderMessages() {
  ensureAssistantArrays();

  renderMessageList(
    getEl(els.assistantMessages, "assistantMessages"),
    state.assistantMessages
  );

  renderMessageList(
    getEl(els.assistantModalMessages, "assistantModalMessages"),
    state.assistantModalMessages
  );
}

function renderScopeBadges() {
  const scope = getCurrentScope();
  const homeName = getHomeLabel();
  const childName = getPersonLabel();
  const section = normaliseSectionLabel(getCurrentSection());

  const scopeBadge = getEl(els.scopeBadge, "scopeBadge");
  const homeBadge = getEl(els.scopeHomeBadge, "scopeHomeBadge");
  const childBadge = getEl(els.scopeChildBadge, "scopeChildBadge");
  const shiftBadge = getEl(els.scopeShiftBadge, "scopeShiftBadge");
  const modalHomeBadge = getEl(els.modalScopeHomeBadge, "modalScopeHomeBadge");
  const modalChildBadge = getEl(els.modalScopeChildBadge, "modalScopeChildBadge");

  if (scopeBadge) {
    scopeBadge.textContent = getScopeLabel();
  }

  if (homeBadge) {
    const showHome = scope === "home" || scope === "quality" || !!homeName;
    homeBadge.textContent = showHome ? homeName : "";
    homeBadge.classList.toggle("hidden", !showHome);
  }

  if (childBadge) {
    const showChild = scope === "child" && !!state.youngPersonId;
    childBadge.textContent = showChild ? childName : "";
    childBadge.classList.toggle("hidden", !showChild);
  }

  if (shiftBadge) {
    shiftBadge.textContent = section;
    shiftBadge.classList.toggle("hidden", !section);
  }

  if (modalHomeBadge) {
    const showHome = scope === "home" || scope === "quality" || !!homeName;
    modalHomeBadge.textContent = showHome ? homeName : "";
    modalHomeBadge.classList.toggle("hidden", !showHome);
  }

  if (modalChildBadge) {
    const showChild = scope === "child" && !!state.youngPersonId;
    modalChildBadge.textContent = showChild ? childName : "";
    modalChildBadge.classList.toggle("hidden", !showChild);
  }
}

function renderContextText() {
  const scope = getCurrentScope();
  const section = normaliseSectionLabel(getCurrentSection());
  const contextEl = getEl(els.assistantContext, "assistantContext");

  if (!contextEl) return;

  let contextText = "No context loaded.";

  if (scope === "child") {
    contextText = state.youngPersonId
      ? `Scoped to ${getPersonLabel()} • whole OS by default • current section: ${section}`
      : "No young person selected.";
  } else if (scope === "home") {
    contextText = `Scoped to ${getHomeLabel()} • whole-home OS view • section: ${section}`;
  } else if (scope === "quality") {
    contextText = `Scoped to ${getHomeLabel()} • quality and RI • full oversight view • section: ${section}`;
  }

  contextEl.textContent = contextText;
}

function buildScopeSummaryCards() {
  const meta = getAssistantMeta();
  const assistantContext = meta.assistant_context || {};
  const runtime = meta.runtime || {};
  const explainability = meta.explainability || {};
  const scope = getCurrentScope();

  const cards = [
    {
      title: "Scope",
      text:
        scope === "child"
          ? state.youngPersonId
            ? `Young person: ${getPersonLabel()} • whole OS scope • section: ${normaliseSectionLabel(getCurrentSection())}`
            : "No young person selected."
          : `${getScopeLabel()} • ${getHomeLabel()} • whole OS scope • section: ${normaliseSectionLabel(
              getCurrentSection()
            )}`,
    },
    {
      title: "Assistant context",
      text:
        assistantContext.summary ||
        assistantContext.overview ||
        assistantContext.context_summary ||
        (Object.keys(assistantContext).length
          ? "Assistant context is loaded for this scope."
          : "Context will appear here after the assistant analyses records."),
    },
    {
      title: "Reasoning",
      text:
        explainability.summary ||
        explainability.reasoning_summary ||
        "Explainability will appear here after the assistant returns a scoped answer.",
    },
    {
      title: "Runtime",
      text:
        runtime.mode ||
        runtime.response_mode ||
        `Assistant ready for ${scope === "child" ? getPersonLabel() : getHomeLabel()}.`,
    },
    {
      title: "Next steps",
      text:
        assistantContext.next_steps ||
        (Array.isArray(meta.suggested_actions) && meta.suggested_actions.length
          ? meta.suggested_actions
              .map((item) => (typeof item === "string" ? item : item?.label || "Suggested action"))
              .join(" • ")
          : "Suggested next actions will appear here after the assistant responds."),
    },
  ];

  return `
    <div class="profile-stack">
      ${cards
        .map(
          (card) => `
            <div class="profile-card">
              <div class="profile-card-title">${escapeHtml(card.title)}</div>
              <div class="profile-card-text">${escapeHtml(card.text || "")}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderScopeSummary() {
  const html = buildScopeSummaryCards();

  const summaryEl = getEl(els.assistantScopeSummary, "assistantScopeSummary");
  const modalSummaryEl = getEl(els.assistantModalScopeSummary, "assistantModalScopeSummary");

  if (summaryEl) {
    summaryEl.innerHTML = html;
  }

  if (modalSummaryEl) {
    modalSummaryEl.innerHTML = html;
  }
}

function renderSourcesHtml(sources = []) {
  if (!Array.isArray(sources) || !sources.length) {
    return `<p>Sources will appear here after a response.</p>`;
  }

  return sources
    .map((source) => {
      const title = escapeHtml(
        source?.title || source?.label || source?.document_title || "Source"
      );
      const type = escapeHtml(source?.type || "source");
      const description = escapeHtml(source?.description || source?.excerpt || "");
      const section = escapeHtml(source?.section || "");
      const page =
        source?.page_number != null ? escapeHtml(String(source.page_number)) : "";

      return `
        <div class="entity-row">
          <div class="entity-title">${title}</div>
          <div class="entity-meta">
            ${type}${section ? ` • ${section}` : ""}${page ? ` • p.${page}` : ""}
          </div>
          ${
            description
              ? `<div class="entity-meta" style="margin-top:6px;">${description}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderSources() {
  const meta = getAssistantMeta();
  const html = renderSourcesHtml(meta.sources || []);

  const sourcesEl = getEl(els.assistantSources, "assistantSources");
  const modalSourcesEl = getEl(els.assistantModalSources, "assistantModalSources");

  if (sourcesEl) {
    sourcesEl.innerHTML = html;
  }

  if (modalSourcesEl) {
    modalSourcesEl.innerHTML = html;
  }
}

function renderRuntime() {
  const meta = getAssistantMeta();
  const runtime =
    Object.keys(meta.runtime || {}).length > 0
      ? meta.runtime
      : {
          mode: "scoped-assistant",
          current_scope: getCurrentScope(),
          current_section: getCurrentSection(),
          selected_young_person_id: state.youngPersonId || null,
          home_id: state.homeId || null,
          messages: (state.assistantMessages || []).length,
        };

  const runtimeEl = getEl(els.assistantRuntime, "assistantRuntime");
  if (runtimeEl) {
    runtimeEl.textContent = prettyJson(runtime);
  }
}

function renderExplainability() {
  const meta = getAssistantMeta();
  const explainability =
    Object.keys(meta.explainability || {}).length > 0
      ? meta.explainability
      : {
          summary:
            "The assistant will show scoped reasoning and evidence after a response is generated.",
        };

  const explainabilityEl = getEl(els.assistantExplainability, "assistantExplainability");
  if (explainabilityEl) {
    explainabilityEl.textContent = prettyJson(explainability);
  }
}

function inferSuggestedActions() {
  const meta = getAssistantMeta();
  const section = getCurrentSection();
  const scope = getCurrentScope();
  const actions = [];

  if (scope === "child") {
    [
      getActionForQuickButton("daily_note", { section }),
      getActionForQuickButton("incident", { section }),
      getActionForQuickButton("task", { section }),
      getActionForQuickButton("appointment", { section }),
    ]
      .filter(Boolean)
      .forEach((action) => {
        if (action?.id && action?.label) {
          actions.push({
            type: "quick_action",
            id: action.id,
            label: action.label,
          });
        }
      });
  }

  (meta.suggested_actions || []).forEach((item) => {
    if (typeof item === "string") {
      const clean = item.trim();
      if (clean) {
        actions.push({
          type: "assistant_chip",
          id: clean,
          label: clean,
        });
      }
      return;
    }

    if (item && typeof item === "object") {
      const label = String(item.label || item.title || item.text || "").trim();
      if (label) {
        actions.push({
          type: "assistant_chip",
          id: label,
          label,
        });
      }
    }
  });

  const seen = new Set();

  return actions.filter((item) => {
    const key = `${item.type}:${String(item.id).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderSuggestedActions() {
  const actions = inferSuggestedActions();

  const html = actions.length
    ? actions
        .map((action) => {
          if (action.type === "quick_action") {
            return `
              <button
                class="chip"
                type="button"
                data-quick-action="${escapeHtml(action.id)}"
              >
                ${escapeHtml(action.label)}
              </button>
            `;
          }

          return `
            <button
              class="chip"
              type="button"
              data-assistant-chip="${escapeHtml(action.label)}"
            >
              ${escapeHtml(action.label)}
            </button>
          `;
        })
        .join("")
    : `<p>No suggested actions yet.</p>`;

  const suggestionsEl = getEl(els.assistantSuggestions, "assistantSuggestions");
  const actionsEl = getEl(els.assistantActions, "assistantActions");

  if (suggestionsEl) {
    suggestionsEl.innerHTML = html;
  }

  if (actionsEl) {
    actionsEl.innerHTML = html;
  }
}

function syncAssistantVisibility() {
  const isOpen = Boolean(state.assistantOpen);

  if (els.assistantModal) {
    els.assistantModal.classList.toggle("hidden", !isOpen);
    els.assistantModal.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  if (els.assistantBackdrop) {
    els.assistantBackdrop.classList.toggle("hidden", !isOpen);
  }
}

function syncAssistantSendButtons() {
  const sending = Boolean(state.assistantSending);

  if (els.assistantSendBtn) {
    els.assistantSendBtn.disabled = sending;
  }

  if (els.assistantModalSendBtn) {
    els.assistantModalSendBtn.disabled = sending;
  }
}

function syncAssistantInputs() {
  const disabled = Boolean(state.assistantSending);

  if (els.assistantInput) {
    els.assistantInput.disabled = disabled;
  }

  if (els.assistantModalInput) {
    els.assistantModalInput.disabled = disabled;
  }
}

function renderAllAssistantUi() {
  ensureAssistantArrays();
  getAssistantMeta();

  syncAssistantVisibility();
  syncAssistantSendButtons();
  syncAssistantInputs();
  renderScopeBadges();
  renderContextText();
  renderMessages();
  renderScopeSummary();
  renderSources();
  renderRuntime();
  renderExplainability();
  renderSuggestedActions();
}

export function bindAssistantUi() {
  if (assistantUiBound) return;
  assistantUiBound = true;
  renderAllAssistantUi();
}

export function refreshAssistantUi() {
  renderAllAssistantUi();
}

export function appendAssistantSystemMessage(text) {
  ensureAssistantArrays();

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    content: String(text || ""),
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });
  renderAllAssistantUi();
}

export function appendAssistantUserMessage(text) {
  ensureAssistantArrays();

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content: String(text || ""),
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });
  renderAllAssistantUi();
}

export function setAssistantSources(sources = []) {
  const meta = getAssistantMeta();
  meta.sources = Array.isArray(sources) ? sources : [];
  renderAllAssistantUi();
}

export function setAssistantRuntime(runtime = null) {
  const meta = getAssistantMeta();
  meta.runtime = runtime || {};
  renderAllAssistantUi();
}

export function setAssistantExplainability(explainability = null) {
  const meta = getAssistantMeta();
  meta.explainability = explainability || {};
  renderAllAssistantUi();
}

export function setAssistantScopeSummary(scopeSummary = null) {
  const meta = getAssistantMeta();
  meta.assistant_context = {
    ...(meta.assistant_context || {}),
    ...(scopeSummary || {}),
  };
  renderAllAssistantUi();
}

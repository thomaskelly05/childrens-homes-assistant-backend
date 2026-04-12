import { state } from "../state.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";
import { getActionForQuickButton } from "./action-router.js";

function qs(id) {
  return document.getElementById(id);
}

function getCurrentPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getAssistantMeta() {
  if (!state.assistantMeta) {
    state.assistantMeta = {
      sources: [],
      runtime: {},
      explainability: {},
      assistant_scope: {},
      assistant_context: {},
      suggested_actions: [],
    };
  }

  return state.assistantMeta;
}

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function buildPersonLabel() {
  const person = getCurrentPerson();
  return getDisplayName(person || {}) || "Young person";
}

function normaliseSectionLabel(section = "") {
  return String(section || "workspace").replaceAll("_", " ").replaceAll("-", " ");
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass = role === "user" ? "assistant-message-user" : "assistant-message-system";

  return `
    <article class="assistant-message ${escapeHtml(roleClass)}">
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      <div class="assistant-message-body">${escapeHtml(message.content || message.text || "")}</div>
    </article>
  `;
}

function renderMessageList(host, messages = []) {
  if (!host) return;

  const intro = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">${
        state.youngPersonId
          ? `Ask a question about ${escapeHtml(buildPersonLabel())}.`
          : "Select a young person to start."
      }</div>
    </article>
  `;

  host.innerHTML = intro + messages.map(renderMessage).join("");
  host.scrollTop = host.scrollHeight;
}

function renderMessages() {
  renderMessageList(qs("assistantMessages"), state.assistantMessages || []);
  renderMessageList(qs("assistantModalMessages"), state.assistantModalMessages || []);
}

function renderScopeBadges() {
  const person = getCurrentPerson() || {};
  const homeName =
    person.home_name || (person.home_id != null ? `Home ${person.home_id}` : "");
  const childName = buildPersonLabel();
  const section = getCurrentSection();

  const homeBadge = qs("scopeHomeBadge");
  const childBadge = qs("scopeChildBadge");
  const shiftBadge = qs("scopeShiftBadge");
  const modalHomeBadge = qs("modalScopeHomeBadge");
  const modalChildBadge = qs("modalScopeChildBadge");

  if (homeBadge) {
    homeBadge.textContent = homeName || "";
    homeBadge.classList.toggle("hidden", !homeName);
  }

  if (childBadge) {
    childBadge.textContent = childName || "";
    childBadge.classList.toggle("hidden", !state.youngPersonId || !childName);
  }

  if (shiftBadge) {
    shiftBadge.textContent = normaliseSectionLabel(section);
    shiftBadge.classList.toggle("hidden", !section);
  }

  if (modalHomeBadge) {
    modalHomeBadge.textContent = homeName || "";
    modalHomeBadge.classList.toggle("hidden", !homeName);
  }

  if (modalChildBadge) {
    modalChildBadge.textContent = childName || "";
    modalChildBadge.classList.toggle("hidden", !state.youngPersonId || !childName);
  }
}

function renderContextText() {
  const section = getCurrentSection();

  const contextText = state.youngPersonId
    ? `Scoped to ${buildPersonLabel()} • current section: ${normaliseSectionLabel(section)}`
    : "No young person selected.";

  if (qs("assistantContext")) {
    qs("assistantContext").textContent = contextText;
  }
}

function buildScopeSummaryCards() {
  const meta = getAssistantMeta();
  const assistantContext = meta.assistant_context || {};
  const runtime = meta.runtime || {};
  const person = getCurrentPerson();

  const cards = [
    {
      title: "Scope",
      text: state.youngPersonId
        ? `Young person: ${buildPersonLabel()} • section: ${normaliseSectionLabel(getCurrentSection())}`
        : "No young person selected.",
    },
    {
      title: "Assistant context",
      text:
        assistantContext.summary ||
        assistantContext.overview ||
        (assistantContext.young_person
          ? "Young person context is loaded for this assistant session."
          : "Context will appear here after the assistant analyses records."),
    },
    {
      title: "Reasoning",
      text:
        meta.explainability?.summary ||
        "Explainability will appear here after the assistant returns a scoped answer.",
    },
    {
      title: "Runtime",
      text:
        runtime.draft_mode ||
        runtime.mode ||
        (person
          ? `Assistant is ready for ${buildPersonLabel()}.`
          : "Assistant runtime will appear here."),
    },
    {
      title: "Next steps",
      text:
        assistantContext.next_steps ||
        (Array.isArray(meta.suggested_actions) && meta.suggested_actions.length
          ? meta.suggested_actions.join(" • ")
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

  if (qs("assistantScopeSummary")) {
    qs("assistantScopeSummary").innerHTML = html;
  }

  if (qs("assistantModalScopeSummary")) {
    qs("assistantModalScopeSummary").innerHTML = html;
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
      const description = escapeHtml(
        source?.description || source?.excerpt || ""
      );
      const section = escapeHtml(source?.section || "");
      const page =
        source?.page_number != null ? escapeHtml(String(source.page_number)) : "";

      return `
        <div class="entity-row">
          <div class="entity-title">${title}</div>
          <div class="entity-meta">
            ${type}${section ? ` • ${section}` : ""}${page ? ` • p.${page}` : ""}
          </div>
          ${description ? `<div class="entity-meta" style="margin-top:6px;">${description}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function renderSources() {
  const meta = getAssistantMeta();
  const html = renderSourcesHtml(meta.sources || []);

  if (qs("assistantSources")) {
    qs("assistantSources").innerHTML = html;
  }

  if (qs("assistantModalSources")) {
    qs("assistantModalSources").innerHTML = html;
  }
}

function renderRuntime() {
  const meta = getAssistantMeta();
  const runtime = meta.runtime || {
    mode: "scoped-young-person-assistant",
    current_section: getCurrentSection(),
    selected_young_person_id: state.youngPersonId || null,
    messages: (state.assistantMessages || []).length,
  };

  if (qs("assistantRuntime")) {
    qs("assistantRuntime").textContent = prettyJson(runtime);
  }
}

function renderExplainability() {
  const meta = getAssistantMeta();
  const explainability = meta.explainability || {
    summary:
      "The assistant will show scoped reasoning and evidence after a response is generated.",
  };

  if (qs("assistantExplainability")) {
    qs("assistantExplainability").textContent = prettyJson(explainability);
  }
}

function inferSuggestedActions() {
  const meta = getAssistantMeta();
  const section = getCurrentSection();
  const actions = [];

  const quickActions = [
    getActionForQuickButton("daily_note", { section }),
    getActionForQuickButton("incident", { section }),
    getActionForQuickButton("task", { section }),
    getActionForQuickButton("appointment", { section }),
  ].filter(Boolean);

  quickActions.forEach((action) => {
    if (action?.id && action?.label) {
      actions.push({
        type: "quick_action",
        id: action.id,
        label: action.label,
      });
    }
  });

  (meta.suggested_actions || []).forEach((label) => {
    const clean = String(label || "").trim();
    if (clean) {
      actions.push({
        type: "assistant_chip",
        id: clean,
        label: clean,
      });
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

  if (qs("assistantSuggestions")) {
    qs("assistantSuggestions").innerHTML = html;
  }

  if (qs("assistantActions")) {
    qs("assistantActions").innerHTML = html;
  }
}

function renderAllAssistantUi() {
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
  renderAllAssistantUi();
}

export function refreshAssistantUi() {
  renderAllAssistantUi();
}

export function appendAssistantSystemMessage(text) {
  if (!state.assistantMessages) state.assistantMessages = [];
  if (!state.assistantModalMessages) state.assistantModalMessages = [];

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    content: String(text || ""),
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(entry);
  renderAllAssistantUi();
}

export function appendAssistantUserMessage(text) {
  if (!state.assistantMessages) state.assistantMessages = [];
  if (!state.assistantModalMessages) state.assistantModalMessages = [];

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content: String(text || ""),
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(entry);
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

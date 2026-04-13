import { state } from "../state.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";
import { getActionForQuickButton } from "./action-router.js";

function qs(id) {
  return document.getElementById(id);
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getCurrentPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
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

function normaliseSectionLabel(section = "") {
  return String(section || "workspace")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function getFullYoungPersonName() {
  const person = getCurrentPerson() || {};
  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.full_name ||
    person.name ||
    person.preferred_name ||
    getDisplayName(person) ||
    "Young person"
  );
}

function getHomeLabel() {
  const person = getCurrentPerson() || {};
  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    person.home_name ||
    (state.homeId ? `Home ${state.homeId}` : "") ||
    ""
  );
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home assistant";
  if (scope === "quality") return "Quality assistant";
  return "Young person assistant";
}

function getScopePrimaryLabel() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return getHomeLabel() || "Home overview";
  }

  if (scope === "quality") {
    return getHomeLabel() ? `${getHomeLabel()} quality` : "Quality overview";
  }

  return getFullYoungPersonName();
}

function getScopeIntroText() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return "Ask a question about this home, staffing, compliance or operations.";
  }

  if (scope === "quality") {
    return "Ask a question about quality, audits, compliance or RI oversight.";
  }

  if (state.youngPersonId) {
    return `Ask a question about ${getFullYoungPersonName()}.`;
  }

  return "Select a young person to start.";
}

function getContextLine() {
  const section = normaliseSectionLabel(getCurrentSection());
  const scope = getCurrentScope();

  if (scope === "home") {
    return `Scoped to ${getHomeLabel() || "home oversight"} • current section: ${section}`;
  }

  if (scope === "quality") {
    return `Scoped to ${getHomeLabel() || "quality oversight"} • current section: ${section}`;
  }

  if (state.youngPersonId) {
    return `Scoped to ${getFullYoungPersonName()} • current section: ${section}`;
  }

  return "No young person selected.";
}

function buildAssistantScopeBadges() {
  const scope = getCurrentScope();
  const homeLabel = getHomeLabel();
  const childLabel = getFullYoungPersonName();
  const sectionLabel = normaliseSectionLabel(getCurrentSection());

  return {
    mainScope: getScopeTitle(),
    homeBadge:
      scope === "home" || scope === "quality"
        ? homeLabel || "Home context"
        : homeLabel || "",
    childBadge:
      scope === "child" && state.youngPersonId
        ? childLabel
        : "",
    sectionBadge: sectionLabel,
  };
}

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass =
    role === "user" ? "assistant-message-user" : "assistant-message-system";

  return `
    <article class="assistant-message ${escapeHtml(roleClass)}">
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      <div class="assistant-message-body">${escapeHtml(
        message.content || message.text || ""
      )}</div>
    </article>
  `;
}

function renderMessageList(host, messages = []) {
  if (!host) return;

  const intro = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">${escapeHtml(getScopeIntroText())}</div>
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
  const badges = buildAssistantScopeBadges();

  const scopeBadge = qs("scopeBadge");
  const scopeHomeBadge = qs("scopeHomeBadge");
  const scopeChildBadge = qs("scopeChildBadge");
  const scopeShiftBadge = qs("scopeShiftBadge");

  const modalScopeHomeBadge = qs("modalScopeHomeBadge");
  const modalScopeChildBadge = qs("modalScopeChildBadge");

  if (scopeBadge) {
    scopeBadge.textContent = badges.mainScope;
    scopeBadge.classList.remove("hidden");
  }

  if (scopeHomeBadge) {
    scopeHomeBadge.textContent = badges.homeBadge;
    scopeHomeBadge.classList.toggle("hidden", !badges.homeBadge);
  }

  if (scopeChildBadge) {
    scopeChildBadge.textContent = badges.childBadge;
    scopeChildBadge.classList.toggle("hidden", !badges.childBadge);
  }

  if (scopeShiftBadge) {
    scopeShiftBadge.textContent = badges.sectionBadge;
    scopeShiftBadge.classList.toggle("hidden", !badges.sectionBadge);
  }

  if (modalScopeHomeBadge) {
    modalScopeHomeBadge.textContent = badges.homeBadge;
    modalScopeHomeBadge.classList.toggle("hidden", !badges.homeBadge);
  }

  if (modalScopeChildBadge) {
    modalScopeChildBadge.textContent = badges.childBadge;
    modalScopeChildBadge.classList.toggle("hidden", !badges.childBadge);
  }
}

function renderContextText() {
  const contextEl = qs("assistantContext");
  if (!contextEl) return;

  contextEl.textContent = getContextLine();
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
        scope === "home"
          ? `Home scope • ${getHomeLabel() || "Home overview"} • section: ${normaliseSectionLabel(
              getCurrentSection()
            )}`
          : scope === "quality"
          ? `Quality scope • ${getHomeLabel() || "Quality overview"} • section: ${normaliseSectionLabel(
              getCurrentSection()
            )}`
          : state.youngPersonId
          ? `Young person scope • ${getFullYoungPersonName()} • section: ${normaliseSectionLabel(
              getCurrentSection()
            )}`
          : "No young person selected.",
    },
    {
      title: "Assistant context",
      text:
        assistantContext.summary ||
        assistantContext.overview ||
        assistantContext.scope_summary ||
        (assistantContext.young_person
          ? "Young person context is loaded for this assistant session."
          : assistantContext.home
          ? "Home context is loaded for this assistant session."
          : "Context will appear here after the assistant analyses records."),
    },
    {
      title: "Reasoning",
      text:
        explainability.summary ||
        "Explainability will appear here after the assistant returns a scoped answer.",
    },
    {
      title: "Runtime",
      text:
        runtime.mode ||
        runtime.draft_mode ||
        (scope === "home"
          ? "Assistant is ready for home oversight."
          : scope === "quality"
          ? "Assistant is ready for quality oversight."
          : state.youngPersonId
          ? `Assistant is ready for ${getFullYoungPersonName()}.`
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

  const main = qs("assistantScopeSummary");
  const modal = qs("assistantModalScopeSummary");

  if (main) {
    main.innerHTML = html;
  }

  if (modal) {
    modal.innerHTML = html;
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

  const main = qs("assistantSources");
  const modal = qs("assistantModalSources");

  if (main) {
    main.innerHTML = html;
  }

  if (modal) {
    modal.innerHTML = html;
  }
}

function renderRuntime() {
  const meta = getAssistantMeta();
  const runtime = meta.runtime || {
    mode:
      getCurrentScope() === "home"
        ? "scoped-home-assistant"
        : getCurrentScope() === "quality"
        ? "scoped-quality-assistant"
        : "scoped-young-person-assistant",
    current_section: getCurrentSection(),
    current_scope: getCurrentScope(),
    selected_young_person_id: state.youngPersonId || null,
    home_id: state.homeId || null,
    messages: (state.assistantMessages || []).length,
  };

  const runtimeEl = qs("assistantRuntime");
  if (runtimeEl) {
    runtimeEl.textContent = prettyJson(runtime);
  }
}

function renderExplainability() {
  const meta = getAssistantMeta();
  const explainability = meta.explainability || {
    summary:
      "The assistant will show scoped reasoning and evidence after a response is generated.",
  };

  const explainabilityEl = qs("assistantExplainability");
  if (explainabilityEl) {
    explainabilityEl.textContent = prettyJson(explainability);
  }
}

function buildScopeQuickActions() {
  const scope = getCurrentScope();
  const section = getCurrentSection();

  if (scope === "home") {
    return [
      getActionForQuickButton("task", { section }),
      {
        id: "home_summary",
        label: "Summarise home priorities",
        type: "assistant_chip",
      },
      {
        id: "home_compliance",
        label: "Show home compliance risks",
        type: "assistant_chip",
      },
      {
        id: "staffing_pressures",
        label: "Review staffing pressures",
        type: "assistant_chip",
      },
    ];
  }

  if (scope === "quality") {
    return [
      {
        id: "quality_summary",
        label: "Summarise quality themes",
        type: "assistant_chip",
      },
      {
        id: "compliance_risks",
        label: "Highlight compliance risks",
        type: "assistant_chip",
      },
      {
        id: "audit_readiness",
        label: "Review audit readiness",
        type: "assistant_chip",
      },
      {
        id: "ri_focus",
        label: "What should RI focus on?",
        type: "assistant_chip",
      },
    ];
  }

  return [
    getActionForQuickButton("daily_note", { section }),
    getActionForQuickButton("incident", { section }),
    getActionForQuickButton("task", { section }),
    getActionForQuickButton("appointment", { section }),
  ];
}

function inferSuggestedActions() {
  const meta = getAssistantMeta();
  const actions = [];

  buildScopeQuickActions().forEach((action) => {
    if (!action) return;

    if (action.type === "assistant_chip") {
      actions.push({
        type: "assistant_chip",
        id: action.id,
        label: action.label,
      });
      return;
    }

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

  const suggestionsEl = qs("assistantSuggestions");
  const actionsEl = qs("assistantActions");

  if (suggestionsEl) {
    suggestionsEl.innerHTML = html;
  }

  if (actionsEl) {
    actionsEl.innerHTML = html;
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
  state.assistantModalMessages.push({ ...entry });
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
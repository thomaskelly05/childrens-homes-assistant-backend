import { els } from "../dom.js";
import { state } from "../state.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";
import { getActionForQuickButton } from "./action-router.js";

function qs(id) {
  return document.getElementById(id);
}

function getAssistantState() {
  if (!state.assistantUi) {
    state.assistantUi = {
      messages: [
        {
          id: "welcome",
          role: "assistant",
          text: "Select a young person to start.",
          created_at: new Date().toISOString(),
        },
      ],
      sources: [],
      runtime: null,
      explainability: null,
      scopeSummary: null,
      suggestions: [],
    };
  }

  return state.assistantUi;
}

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function buildPersonLabel() {
  const person = state.selectedYoungPerson || {};
  return getDisplayName(person);
}

function buildSectionLabel() {
  return state.currentSection || state.activeSection || "workspace";
}

function normaliseText(value) {
  return String(value || "").trim();
}

function pushMessage(role, text) {
  const assistantState = getAssistantState();

  assistantState.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    created_at: new Date().toISOString(),
  });
}

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass = role === "user" ? "assistant-message-user" : "assistant-message-system";

  return `
    <article class="assistant-message ${escapeHtml(roleClass)}">
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      <div class="assistant-message-body">${escapeHtml(message.text || "")}</div>
    </article>
  `;
}

function renderMessages() {
  const assistantState = getAssistantState();
  const html = assistantState.messages.map(renderMessage).join("");

  if (qs("assistantMessages")) {
    qs("assistantMessages").innerHTML = html;
  }

  if (qs("assistantModalMessages")) {
    qs("assistantModalMessages").innerHTML = html;
  }

  qs("assistantMessages")?.scrollTo({
    top: qs("assistantMessages").scrollHeight,
    behavior: "smooth",
  });

  qs("assistantModalMessages")?.scrollTo({
    top: qs("assistantModalMessages").scrollHeight,
    behavior: "smooth",
  });
}

function renderScopeBadges() {
  const person = state.selectedYoungPerson || {};
  const homeName = person.home_name || "";
  const childName = getDisplayName(person);
  const section = buildSectionLabel();

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
    childBadge.classList.toggle("hidden", !childName || childName === "Young person");
  }

  if (shiftBadge) {
    shiftBadge.textContent = section.replaceAll("_", " ");
    shiftBadge.classList.toggle("hidden", !section);
  }

  if (modalHomeBadge) {
    modalHomeBadge.textContent = homeName || "";
    modalHomeBadge.classList.toggle("hidden", !homeName);
  }

  if (modalChildBadge) {
    modalChildBadge.textContent = childName || "";
    modalChildBadge.classList.toggle("hidden", !childName || childName === "Young person");
  }
}

function renderContextText() {
  const person = state.selectedYoungPerson || {};
  const childName = getDisplayName(person);
  const section = buildSectionLabel();

  const contextText = state.youngPersonId
    ? `Scoped to ${childName} • current section: ${section.replaceAll("_", " ")}`
    : "No young person selected.";

  if (qs("assistantContext")) {
    qs("assistantContext").textContent = contextText;
  }
}

function buildLayerCards() {
  const person = state.selectedYoungPerson || {};
  const section = buildSectionLabel();
  const assistantState = getAssistantState();

  const cards = [
    {
      title: "Layer 1 • Rules and actions",
      text: `Current operational section: ${section.replaceAll("_", " ")}. Quick actions and fixed workflows sit here.`,
    },
    {
      title: "Layer 2 • Patterns and signals",
      text: assistantState.scopeSummary?.patterns || "Pattern view will appear here when linked records and signals are available.",
    },
    {
      title: "Layer 3 • Reasoning and explainability",
      text: assistantState.explainability?.summary || "Explainability will show why a suggestion or summary was generated.",
    },
    {
      title: "Layer 4 • Generative drafting",
      text: assistantState.runtime?.draft_mode || `Drafting support is ready for ${getDisplayName(person)}.`,
    },
    {
      title: "Layer 5 • Agentic next steps",
      text: assistantState.scopeSummary?.next_steps || "Suggested next actions will appear here after analysis or record review.",
    },
  ];

  return `
    <div class="profile-stack">
      ${cards
        .map(
          (card) => `
            <div class="profile-card">
              <div class="profile-card-title">${escapeHtml(card.title)}</div>
              <div class="profile-card-text">${escapeHtml(card.text)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderScopeSummary() {
  const html = buildLayerCards();

  if (qs("assistantScopeSummary")) {
    qs("assistantScopeSummary").innerHTML = html;
  }

  if (qs("assistantModalScopeSummary")) {
    qs("assistantModalScopeSummary").innerHTML = html;
  }
}

function renderSources() {
  const assistantState = getAssistantState();
  const sources = assistantState.sources || [];

  const html = sources.length
    ? sources
        .map(
          (source) => `
            <div class="entity-row">
              <div class="entity-title">${escapeHtml(source.title || "Source")}</div>
              <div class="entity-meta">${escapeHtml(source.description || "")}</div>
            </div>
          `
        )
        .join("")
    : "<p>Sources will appear here after a response.</p>";

  if (qs("assistantSources")) {
    qs("assistantSources").innerHTML = html;
  }

  if (qs("assistantModalSources")) {
    qs("assistantModalSources").innerHTML = html;
  }
}

function renderRuntime() {
  const assistantState = getAssistantState();

  const runtime = assistantState.runtime || {
    mode: "scoped-young-person-assistant",
    current_section: buildSectionLabel(),
    selected_young_person_id: state.youngPersonId || null,
    messages: assistantState.messages.length,
  };

  if (qs("assistantRuntime")) {
    qs("assistantRuntime").textContent = JSON.stringify(runtime, null, 2);
  }
}

function renderExplainability() {
  const assistantState = getAssistantState();

  const explainability = assistantState.explainability || {
    summary:
      "The assistant is currently using scoped workspace context, selected section, and visible young person state.",
    reasoning_layers: [
      "rules",
      "context",
      "prompt shaping",
      "draft generation",
      "suggested actions",
    ],
  };

  if (qs("assistantExplainability")) {
    qs("assistantExplainability").textContent = JSON.stringify(explainability, null, 2);
  }
}

function renderSuggestedActions() {
  const section = buildSectionLabel();

  const actions = [
    getActionForQuickButton("daily_note", { section }),
    getActionForQuickButton("incident", { section }),
    getActionForQuickButton("task", { section }),
    getActionForQuickButton("appointment", { section }),
  ].filter(Boolean);

  const html = actions
    .map(
      (action) => `
        <button
          class="chip"
          type="button"
          data-quick-action="${escapeHtml(action.id)}"
        >
          ${escapeHtml(action.label)}
        </button>
      `
    )
    .join("");

  if (qs("assistantSuggestions")) {
    qs("assistantSuggestions").innerHTML = html;
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

function openAssistantModal() {
  qs("assistantBackdrop")?.classList.remove("hidden");
  qs("assistantModal")?.classList.remove("hidden");
  qs("assistantModal")?.setAttribute("aria-hidden", "false");
}

function closeAssistantModal() {
  qs("assistantBackdrop")?.classList.add("hidden");
  qs("assistantModal")?.classList.add("hidden");
  qs("assistantModal")?.setAttribute("aria-hidden", "true");
}

function clearAssistantChat() {
  const assistantState = getAssistantState();

  assistantState.messages = [
    {
      id: "welcome-reset",
      role: "assistant",
      text: state.youngPersonId
        ? `Assistant reset for ${buildPersonLabel()}.`
        : "Select a young person to start.",
      created_at: new Date().toISOString(),
    },
  ];

  renderAllAssistantUi();
}

function buildPlaceholderAssistantResponse(userText) {
  const person = buildPersonLabel();
  const section = buildSectionLabel();

  const lower = userText.toLowerCase();

  if (lower.includes("handover")) {
    return `Draft handover view for ${person}: recent priorities, current section ${section}, and linked follow-up should be reviewed together.`;
  }

  if (lower.includes("risk")) {
    return `Risk-focused summary for ${person}: review recent incidents, chronology, current plans, and compliance signals for emerging concerns.`;
  }

  if (lower.includes("what matters") || lower.includes("priority")) {
    return `What matters now for ${person}: check urgent incidents, overdue readiness items, open tasks, appointments, and current support guidance.`;
  }

  if (lower.includes("chronology")) {
    return `Chronology summary for ${person}: use recent events, safeguarding-linked records, and significant changes in presentation to build the narrative.`;
  }

  return `Assistant response for ${person}: I am scoped to the ${section} section and ready to support drafting, summarising, and identifying next actions.`;
}

function updateAssistantAnalysis(userText) {
  const assistantState = getAssistantState();

  assistantState.scopeSummary = {
    patterns:
      `Current analysis is centred on ${buildPersonLabel()} in ${buildSectionLabel().replaceAll("_", " ")}.`,
    next_steps:
      "Use quick actions to create linked records, then review the suggestions panel for follow-up actions.",
  };

  assistantState.sources = [
    {
      title: "Selected young person context",
      description: `Current selected young person ID: ${state.youngPersonId || "none"}`,
    },
    {
      title: "Current workspace section",
      description: buildSectionLabel(),
    },
  ];

  assistantState.runtime = {
    mode: "scoped-young-person-assistant",
    current_section: buildSectionLabel(),
    selected_young_person_id: state.youngPersonId || null,
    messages: assistantState.messages.length,
    last_prompt: userText,
    draft_mode: "Layered assistant UI active",
  };

  assistantState.explainability = {
    summary:
      "Response generated from current selected young person, active workspace section, and assistant UI state.",
    reasoning_layers: [
      "section scope",
      "selected person context",
      "UI prompt intent",
      "draft response shaping",
      "suggested operational follow-up",
    ],
  };
}

function handleAssistantSubmit(text) {
  const clean = normaliseText(text);
  if (!clean) return;

  pushMessage("user", clean);

  const reply = buildPlaceholderAssistantResponse(clean);
  pushMessage("assistant", reply);

  updateAssistantAnalysis(clean);
  renderAllAssistantUi();
}

function bindAssistantForms() {
  qs("assistantForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = qs("assistantInput");
    const value = input?.value || "";
    handleAssistantSubmit(value);
    if (input) input.value = "";
  });

  qs("assistantModalForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = qs("assistantModalInput");
    const value = input?.value || "";
    handleAssistantSubmit(value);
    if (input) input.value = "";
  });
}

function bindAssistantButtons() {
  qs("assistantLauncher")?.addEventListener("click", openAssistantModal);
  qs("assistantExpandBtn")?.addEventListener("click", openAssistantModal);
  qs("closeAssistantBtn")?.addEventListener("click", closeAssistantModal);
  qs("assistantBackdrop")?.addEventListener("click", closeAssistantModal);
  qs("assistantClearBtn")?.addEventListener("click", clearAssistantChat);
}

export function bindAssistantUi() {
  bindAssistantForms();
  bindAssistantButtons();
  renderAllAssistantUi();
}

export function refreshAssistantUi() {
  renderAllAssistantUi();
}

export function appendAssistantSystemMessage(text) {
  pushMessage("assistant", text);
  renderAllAssistantUi();
}

export function appendAssistantUserMessage(text) {
  pushMessage("user", text);
  renderAllAssistantUi();
}

export function setAssistantSources(sources = []) {
  const assistantState = getAssistantState();
  assistantState.sources = Array.isArray(sources) ? sources : [];
  renderAllAssistantUi();
}

export function setAssistantRuntime(runtime = null) {
  const assistantState = getAssistantState();
  assistantState.runtime = runtime;
  renderAllAssistantUi();
}

export function setAssistantExplainability(explainability = null) {
  const assistantState = getAssistantState();
  assistantState.explainability = explainability;
  renderAllAssistantUi();
}

export function setAssistantScopeSummary(scopeSummary = null) {
  const assistantState = getAssistantState();
  assistantState.scopeSummary = scopeSummary;
  renderAllAssistantUi();
}
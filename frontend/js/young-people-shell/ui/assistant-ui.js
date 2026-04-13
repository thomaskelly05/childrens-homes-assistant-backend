import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import {
  appendAssistantSystemMessage,
  appendAssistantUserMessage,
  setAssistantSources,
  setAssistantRuntime,
  setAssistantExplainability,
  setAssistantScopeSummary,
  refreshAssistantUi,
} from "./assistant-ui.js";
import { apiStreamAssistant } from "../core/api.js";

function getScope() {
  return state.currentScope || "child";
}

function getSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getSelectedPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getPersonName() {
  const person = getSelectedPerson();
  if (!person) return "Young person";

  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    person.full_name ||
    person.name ||
    "Young person"
  );
}

function normaliseSectionLabel(section = "") {
  return String(section || "workspace").replaceAll("_", " ").replaceAll("-", " ");
}

function getAssistantPrompts() {
  const scope = getScope();
  const section = getSection();

  if (scope === "home") {
    return [
      "Summarise the home dashboard and what needs attention.",
      "What are the top operational risks in the home right now?",
      "What actions should the manager prioritise today?",
      "Draft a short manager handover for the home.",
    ];
  }

  if (scope === "quality") {
    return [
      "Summarise the quality dashboard and main themes.",
      "What should RI or leadership be most concerned about?",
      "Which compliance items are highest priority?",
      "Draft a short quality assurance summary.",
    ];
  }

  const map = {
    workspace: [
      "Give me a short summary of this young person today.",
      "What matters most right now?",
      "Draft a handover for the next shift.",
    ],
    overview: [
      "What matters most right now?",
      "Summarise current themes and risks.",
    ],
    profile: [
      "Summarise this young person’s needs and what helps.",
      "What should adults hold in mind day to day?",
    ],
    timeline: [
      "Create a short chronology summary.",
      "What are the key turning points recently?",
    ],
    handover: [
      "Draft a short handover for the next shift.",
      "What does the next shift most need to know?",
    ],
    health: [
      "Summarise current health and wellbeing needs.",
      "What appointments or follow-up matter most?",
    ],
    education: [
      "Summarise education themes and support needs.",
      "What helps this young person engage with learning?",
    ],
    family: [
      "Summarise family and relationship themes.",
      "What should adults hold in mind around contact?",
    ],
    calendar: [
      "What is the next appointment?",
      "What upcoming dates matter most?",
    ],
    readiness: [
      "What is overdue or due soon?",
      "What actions should happen next?",
    ],
    manager: [
      "What needs manager review right now?",
      "What themes should leadership notice?",
    ],
    reports: [
      "Give me a 6 month summary.",
      "What are the strongest themes across the record?",
    ],
  };

  return map[section] || [
    "Give me a short summary of this young person.",
    "What matters most right now?",
    "What should happen next?",
  ];
}

export function openAssistant() {
  updateAssistantContext();
  refreshAssistantUi();

  els.assistantModal?.classList.remove("hidden");
  els.assistantBackdrop?.classList.remove("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "false");

  state.assistantOpen = true;
}

export function closeAssistant() {
  els.assistantModal?.classList.add("hidden");
  els.assistantBackdrop?.classList.add("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "true");

  state.assistantOpen = false;
}

export function updateAssistantContext() {
  const scope = getScope();
  const section = getSection();
  const prompts = getAssistantPrompts();

  let contextText = "Assistant ready.";

  if (scope === "home") {
    contextText = `Home-scoped assistant • section: ${normaliseSectionLabel(section)}`;
  } else if (scope === "quality") {
    contextText = `Quality-scoped assistant • section: ${normaliseSectionLabel(section)}`;
  } else if (state.youngPersonId) {
    contextText = `Young person: ${getPersonName()} • section: ${normaliseSectionLabel(section)}`;
  } else {
    contextText = "No young person selected.";
  }

  if (els.assistantContext) {
    els.assistantContext.textContent = contextText;
  }

  if (els.assistantSuggestions) {
    els.assistantSuggestions.innerHTML = prompts
      .map(
        (prompt) => `
          <button class="chip" type="button" data-assistant-chip="${escapeHtml(prompt)}">
            ${escapeHtml(prompt)}
          </button>
        `
      )
      .join("");
  }

  setAssistantScopeSummary({
    summary: contextText,
    scope_type: scope,
    section,
    young_person_name: scope === "child" ? getPersonName() : null,
  });
}

function getAssistantContextPayload() {
  const scope = getScope();
  const person = getSelectedPerson();

  return {
    scope_type: scope,
    current_scope: scope,
    current_section: getSection(),
    home_id:
      state.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      person?.home_id ||
      null,
    young_person_id: scope === "child" ? state.youngPersonId || null : null,
    young_person_name: scope === "child" ? getPersonName() : null,
    placement_status: person?.placement_status || null,
    summary_risk_level: person?.summary_risk_level || null,
    active_record_type: state.activeRecordType || null,
    active_record_id:
      state.activeRecordItem?.record_id ||
      state.activeRecordItem?.source_id ||
      state.activeRecordItem?.id ||
      null,
    composer_record_type: state.composerRecordType || null,
    composer_record_id: state.composerRecordId || null,
  };
}

function detectResponseMode(text) {
  return /6 month|six month|12 month|twelve month|summary|chronology|review|report|dashboard|quality/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

function setSending(flag) {
  state.assistantSending = !!flag;

  if (els.assistantSendBtn) {
    els.assistantSendBtn.disabled = !!flag;
  }

  if (els.assistantModalSendBtn) {
    els.assistantModalSendBtn.disabled = !!flag;
  }
}

function ensureMessageArrays() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }
}

function addStreamingPlaceholder() {
  ensureMessageArrays();

  const entry = {
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });
  refreshAssistantUi();
}

function updateStreamingPlaceholder(text) {
  const lists = [state.assistantMessages, state.assistantModalMessages];

  lists.forEach((list) => {
    if (!Array.isArray(list) || !list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = String(text || "Thinking…");
    }
  });

  refreshAssistantUi();
}

function resolveStreamingPlaceholder(text) {
  const lists = [state.assistantMessages, state.assistantModalMessages];

  lists.forEach((list) => {
    if (!Array.isArray(list) || !list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = String(text || "No assistant reply returned.");
      last._streaming = false;
    }
  });

  refreshAssistantUi();
}

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed || state.assistantSending) return;

  if (getScope() === "child" && !state.youngPersonId) {
    appendAssistantSystemMessage("Select a young person first.");
    return;
  }

  appendAssistantUserMessage(trimmed);
  addStreamingPlaceholder();
  setSending(true);

  try {
    await apiStreamAssistant(
      {
        message: trimmed,
        response_mode: detectResponseMode(trimmed),
        context: getAssistantContextPayload(),
      },
      {
        onMeta: (meta) => {
          state.assistantMeta = {
            sources: Array.isArray(meta?.sources) ? meta.sources : [],
            runtime: meta?.runtime || {},
            explainability: meta?.explainability || {},
            assistant_scope: meta?.assistant_scope || {},
            assistant_context: meta?.assistant_context || {},
            suggested_actions: Array.isArray(meta?.suggested_actions)
              ? meta.suggested_actions
              : [],
          };

          setAssistantSources(state.assistantMeta.sources);
          setAssistantRuntime(state.assistantMeta.runtime);
          setAssistantExplainability(state.assistantMeta.explainability);
          setAssistantScopeSummary(state.assistantMeta.assistant_context);
        },
        onMessage: (streamedText) => {
          updateStreamingPlaceholder(streamedText || "Thinking…");
        },
        onDone: (streamedText) => {
          resolveStreamingPlaceholder(
            String(streamedText || "").trim() || "No assistant reply returned."
          );
        },
      }
    );
  } catch (error) {
    resolveStreamingPlaceholder(
      error?.message || "The assistant could not answer right now."
    );
  } finally {
    setSending(false);
    refreshAssistantUi();
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  refreshAssistantUi();
}

function bindPromptButtons() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-prompt], [data-assistant-chip]");
    if (!button) return;

    const prompt =
      button.dataset.prompt ||
      button.dataset.assistantChip ||
      "";

    if (!prompt) return;
    await askAssistant(prompt);
  });
}

export function bindAssistantEvents() {
  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.heroAssistantBtn?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    clearAssistantMessages();
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput?.value || "";
    if (els.assistantInput) {
      els.assistantInput.value = "";
    }
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) {
      els.assistantModalInput.value = "";
    }
    await askAssistant(question);
  });

  bindPromptButtons();
}
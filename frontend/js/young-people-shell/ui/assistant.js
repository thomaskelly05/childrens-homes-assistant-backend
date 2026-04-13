import { state } from "../state.js";
import { els } from "../dom.js";
import { apiStreamAssistant } from "../core/api.js";
import {
  refreshAssistantUi,
  appendAssistantSystemMessage,
  appendAssistantUserMessage,
  setAssistantSources,
  setAssistantRuntime,
  setAssistantExplainability,
  setAssistantScopeSummary,
} from "./assistant-ui.js";

let assistantEventsBound = false;
let assistantPromptDelegatesBound = false;

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getSelectedYoungPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getFullYoungPersonName() {
  const person = getSelectedYoungPerson() || {};

  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    person.full_name ||
    person.name ||
    "Young person"
  );
}

function getHomeName() {
  const person = getSelectedYoungPerson() || {};

  return (
    person.home_name ||
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
}

function getAssistantScopeType() {
  const scope = getCurrentScope();

  if (scope === "home") return "home";
  if (scope === "quality") return "quality";
  return state.youngPersonId ? "young_person" : "global";
}

function ensureAssistantState() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }

  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = {
      sources: [],
      runtime: {},
      explainability: {},
      assistant_scope: {},
      assistant_context: {},
      suggested_actions: [],
    };
  }
}

function cloneMessageEntry(entry = {}) {
  return {
    id:
      entry.id ||
      `assistant-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: entry.role || "assistant",
    content: String(entry.content || ""),
    created_at: entry.created_at || new Date().toISOString(),
    _streaming: !!entry._streaming,
  };
}

function syncAssistantMetaToUi() {
  ensureAssistantState();

  const meta = state.assistantMeta || {};

  setAssistantSources(Array.isArray(meta.sources) ? meta.sources : []);
  setAssistantRuntime(meta.runtime || {});
  setAssistantExplainability(meta.explainability || {});
  setAssistantScopeSummary(meta.assistant_context || {});

  refreshAssistantUi();
}

export function openAssistant() {
  ensureAssistantState();
  updateAssistantContext();
  syncAssistantMetaToUi();
  state.assistantOpen = true;
  refreshAssistantUi();
}

export function closeAssistant() {
  state.assistantOpen = false;
  refreshAssistantUi();
}

export function renderAssistantMessages() {
  ensureAssistantState();
  refreshAssistantUi();
}

export function renderAssistantInsights() {
  ensureAssistantState();
  syncAssistantMetaToUi();
}

function pushLocalMessage(role, content) {
  ensureAssistantState();

  const entry = cloneMessageEntry({
    role,
    content,
  });

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });

  refreshAssistantUi();
  return entry;
}

function addAssistantPlaceholder() {
  ensureAssistantState();

  const entry = cloneMessageEntry({
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
  });

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });

  refreshAssistantUi();
}

function updateLastAssistantStreamingText(text) {
  const safeText = String(text || "Thinking…");
  const lists = [state.assistantMessages || [], state.assistantModalMessages || []];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeText;
    }
  });

  refreshAssistantUi();
}

function replaceLastAssistantPlaceholder(text) {
  const safeText = String(text || "No assistant reply returned.");
  const lists = [state.assistantMessages || [], state.assistantModalMessages || []];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeText;
      last._streaming = false;
    }
  });

  refreshAssistantUi();
}

function setAssistantSending(flag) {
  state.assistantSending = !!flag;
  refreshAssistantUi();
}

function assistantPromptsForView(view, scope = getCurrentScope()) {
  const childMap = {
    workspace: [
      "Give me a 6 month summary for this young person.",
      "What matters most right now?",
      "Draft a short handover for the next shift.",
    ],
    overview: [
      "What matters most right now?",
      "Summarise the key themes today.",
      "What should staff prioritise next?",
    ],
    profile: [
      "Summarise this young person’s needs and what helps.",
      "What should adults hold in mind day to day?",
      "What are the most important communication needs?",
    ],
    timeline: [
      "Create a short chronology summary.",
      "What are the key turning points recently?",
      "What patterns can you see across incidents and presentation?",
    ],
    handover: [
      "Give me a short handover for this young person.",
      "What does the next shift most need to know?",
      "What follow-up should the next shift complete?",
    ],
    health: [
      "Summarise current health and wellbeing needs.",
      "What follow-up is needed from recent health records?",
      "What are the main health themes recently?",
    ],
    education: [
      "Summarise education themes and needs.",
      "What helps this young person engage with learning?",
      "What are the current school concerns and strengths?",
    ],
    family: [
      "Summarise key relationship and family themes.",
      "What should adults hold in mind around contact?",
      "What patterns can you see around family contact?",
    ],
    calendar: [
      "What is the next appointment?",
      "What appointments need preparing for?",
      "What follow-up is due from recent appointments?",
    ],
    readiness: [
      "What is overdue or due soon?",
      "What should be completed next?",
      "Summarise the open actions for this young person.",
    ],
    manager: [
      "What needs manager review right now?",
      "What themes should leadership notice?",
      "What risks or compliance issues need oversight?",
    ],
    reports: [
      "Give me a 6 month summary for this young person.",
      "What are the strongest themes across the record?",
      "Draft a professional summary for a review meeting.",
    ],
    documents: [
      "What important documents are missing or due review?",
      "Summarise the key child documents.",
      "What document follow-up is needed?",
    ],
    communication: [
      "Summarise recent communication with professionals and family.",
      "What communication themes are emerging?",
      "Draft a professional update from recent records.",
    ],
    therapy: [
      "Summarise therapeutic themes and recommendations.",
      "What should staff hold in mind from therapeutic input?",
      "What follow-up actions come from therapy records?",
    ],
  };

  const homeMap = {
    "home-dashboard": [
      "Summarise the home’s operational picture.",
      "What needs management attention right now?",
      "What are the biggest risks across the home today?",
    ],
    compliance: [
      "What compliance issues need urgent action?",
      "Summarise gaps across workforce and statutory paperwork.",
      "What would Ofsted notice first right now?",
    ],
    manager: [
      "What needs leadership review right now?",
      "Summarise the main management pressures across the home.",
      "What actions should the manager prioritise this week?",
    ],
    readiness: [
      "What is overdue or due soon across the home?",
      "What actions should be completed first?",
      "Summarise the service readiness risks.",
    ],
    reports: [
      "Summarise the service for reporting purposes.",
      "What are the strongest themes across the home?",
      "Draft a home-level review summary.",
    ],
    calendar: [
      "What are the next key home dates and meetings?",
      "What requires preparation this week?",
      "Summarise upcoming deadlines and appointments.",
    ],
    team: [
      "Summarise staffing issues across the home.",
      "What workforce risks are emerging?",
      "What should leadership notice about team capacity?",
    ],
    supervision: [
      "Which supervisions are overdue or due soon?",
      "Summarise workforce oversight gaps.",
      "What supervision actions should be prioritised?",
    ],
    communication: [
      "Summarise recent professional communication across the home.",
      "What communication follow-up is outstanding?",
      "Draft a service-level professional update.",
    ],
    documents: [
      "What service documents are due review or missing?",
      "Summarise document compliance gaps.",
      "What statutory paperwork needs attention?",
    ],
    therapy: [
      "Summarise therapeutic service activity across the home.",
      "What recommendations need operational follow-up?",
      "What therapeutic themes are emerging?",
    ],
  };

  const qualityMap = {
    quality: [
      "Summarise current quality themes across the service.",
      "What would an RI or auditor notice first?",
      "What quality concerns are emerging?",
    ],
    compliance: [
      "What compliance gaps create the biggest Ofsted risk?",
      "Summarise workforce and paperwork compliance issues.",
      "What needs urgent correction before inspection?",
    ],
    reports: [
      "Draft a quality summary for leadership.",
      "What themes should be highlighted in reporting?",
      "Summarise audit and compliance themes.",
    ],
    manager: [
      "What leadership themes need escalation?",
      "What service-level patterns should management notice?",
      "Where is oversight weakest right now?",
    ],
    calendar: [
      "What quality deadlines and review dates are coming up?",
      "What compliance milestones are due soon?",
      "What needs preparing this month?",
    ],
    team: [
      "Summarise staffing and workforce quality concerns.",
      "What training or supervision gaps are emerging?",
      "What workforce risks affect compliance?",
    ],
    supervision: [
      "What supervision compliance risks are present?",
      "Where are staff oversight gaps strongest?",
      "Summarise overdue supervisions and appraisals.",
    ],
    communication: [
      "Summarise communication themes relevant to audit and quality.",
      "What partner-agency communication needs follow-up?",
      "Draft a professional quality update.",
    ],
    documents: [
      "What statutory paperwork gaps need urgent action?",
      "Summarise document quality and review issues.",
      "Which documents create the biggest inspection risk?",
    ],
    therapy: [
      "Summarise therapeutic provision quality themes.",
      "What therapeutic follow-up is slipping?",
      "Are there patterns in wellbeing or service delivery?",
    ],
  };

  const map =
    scope === "home"
      ? homeMap
      : scope === "quality"
      ? qualityMap
      : childMap;

  return map[view] || [
    scope === "child"
      ? "What matters most right now for this young person?"
      : "What matters most right now across this area?",
    "What needs attention next?",
    "Give me a concise summary.",
  ];
}

export function updateAssistantContext() {
  const scope = getCurrentScope();
  const section = getCurrentSection();

  ensureAssistantState();

  const contextSummary =
    scope === "child"
      ? state.youngPersonId
        ? {
            summary: `Young person: ${getFullYoungPersonName()} • ${getHomeName()} • section: ${String(
              section
            )
              .replaceAll("_", " ")
              .replaceAll("-", " ")}`,
            scope_type: "young_person",
            current_scope: scope,
            current_section: section,
            young_person_name: getFullYoungPersonName(),
            home_name: getHomeName(),
          }
        : {
            summary: "No young person selected.",
            scope_type: "global",
            current_scope: scope,
            current_section: section,
            young_person_name: null,
            home_name: getHomeName(),
          }
      : scope === "home"
      ? {
          summary: `Home: ${getHomeName()} • scope: home oversight • section: ${String(
            section
          )
            .replaceAll("_", " ")
            .replaceAll("-", " ")}`,
          scope_type: "home",
          current_scope: scope,
          current_section: section,
          young_person_name: null,
          home_name: getHomeName(),
        }
      : {
          summary: `Home: ${getHomeName()} • scope: quality and RI • section: ${String(
            section
          )
            .replaceAll("_", " ")
            .replaceAll("-", " ")}`,
          scope_type: "quality",
          current_scope: scope,
          current_section: section,
          young_person_name: null,
          home_name: getHomeName(),
        };

  state.assistantMeta = {
    ...(state.assistantMeta || {}),
    assistant_context: {
      ...(state.assistantMeta?.assistant_context || {}),
      ...contextSummary,
    },
  };

  syncAssistantMetaToUi();
}

function buildAssistantContextPayload() {
  const person = getSelectedYoungPerson() || {};
  const scope = getCurrentScope();
  const section = getCurrentSection();

  return {
    scope,
    scope_type: getAssistantScopeType(),
    current_view: section,
    shift_context: section,
    young_person_id: scope === "child" ? state.youngPersonId || null : null,
    young_person_name: scope === "child" ? getFullYoungPersonName() : null,
    home_id:
      state.homeId ||
      person.home_id ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      null,
    home_name: getHomeName(),
    placement_status: person.placement_status || null,
    summary_risk_level: person.summary_risk_level || null,
    composer_record_type: state.composerRecordType || null,
    record_type: state.activeRecordType || state.composerRecordType || null,
    record_id:
      state.activeRecordItem?.record_id ||
      state.activeRecordItem?.source_id ||
      state.activeRecordItem?.id ||
      state.composerRecordId ||
      null,
    current_scope: scope,
    current_section: section,
    user_role: state.userRole || "staff",
    suggested_prompts: assistantPromptsForView(section, scope),
  };
}

function detectAssistantResponseMode(text) {
  return /6 month|six month|12 month|twelve month|summary|timeline|chronology|review|report|audit|compliance|ofsted|ri/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

function applyAssistantMeta(meta = {}) {
  ensureAssistantState();

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

  syncAssistantMetaToUi();
}

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();

  if (!trimmed || state.assistantSending) return;

  ensureAssistantState();

  if (getCurrentScope() === "child" && !state.youngPersonId) {
    appendAssistantSystemMessage(
      "Please select a young person first so I can answer in the right context."
    );
    return;
  }

  appendAssistantUserMessage(trimmed);
  addAssistantPlaceholder();
  setAssistantSending(true);

  try {
    await apiStreamAssistant(
      {
        message: trimmed,
        response_mode: detectAssistantResponseMode(trimmed),
        context: buildAssistantContextPayload(),
      },
      {
        onMeta: (meta) => {
          applyAssistantMeta(meta);
        },
        onProgress: () => {},
        onMessage: (streamedText) => {
          updateLastAssistantStreamingText(streamedText || "Thinking…");
        },
        onDone: (streamedText) => {
          replaceLastAssistantPlaceholder(
            String(streamedText || "").trim() || "No assistant reply returned."
          );
        },
      }
    );
  } catch (error) {
    replaceLastAssistantPlaceholder(
      error?.message || "The assistant could not answer right now."
    );
  } finally {
    setAssistantSending(false);
    syncAssistantMetaToUi();
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  refreshAssistantUi();
}

function bindPromptButtons() {
  if (assistantPromptDelegatesBound) return;
  assistantPromptDelegatesBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-prompt], [data-assistant-chip]");
    if (!button) return;

    const prompt = button.dataset.prompt || button.dataset.assistantChip || "";
    if (!prompt) return;

    await askAssistant(prompt);
  });
}

export function bindAssistantEvents() {
  if (assistantEventsBound) return;
  assistantEventsBound = true;

  ensureAssistantState();

  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.heroAssistantBtn?.addEventListener("click", openAssistant);
  els.assistantExpandBtn?.addEventListener("click", openAssistant);
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

import { state } from "../state.js";
import { els } from "../dom.js";
import { apiStreamAssistant } from "../core/api.js";
import * as aiScrubber from "../core/ai-scrubber.js";
import {
  refreshAssistantUi,
  appendAssistantSystemMessage,
  appendAssistantUserMessage,
} from "./assistant-ui.js";

let assistantEventsBound = false;
let assistantPromptDelegatesBound = false;

const ASSISTANT_INTENT = {
  greeting: "greeting",
  factual_lookup: "factual_lookup",
  summary: "summary",
  chronology: "chronology",
  review: "review",
  handover: "handover",
  drafting: "drafting",
  compliance: "compliance",
  risk: "risk",
  quality: "quality",
  management: "management",
  unknown: "unknown",
};

const MAX_SAFE_MESSAGE_LENGTH = 3000;
const MAX_SOURCE_ITEMS = 12;
const MAX_SOURCE_EXCERPT = 240;
const MAX_UI_PROMPTS = 8;

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
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

function getAllowedHomeIds() {
  return Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    : [];
}

function getAccessLevelForScope(scope = getCurrentScope()) {
  const role = String(state.userRole || "").toLowerCase();

  if (scope === "child") return "child";
  if (scope === "home") return "home";

  if (scope === "quality") {
    return role === "ri" || role === "admin" ? "provider" : "home";
  }

  return "home";
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
      scrubber_reverse_map: {},
    };
  }

  if (!Array.isArray(state.assistantMeta.sources)) {
    state.assistantMeta.sources = [];
  }

  if (!Array.isArray(state.assistantMeta.suggested_actions)) {
    state.assistantMeta.suggested_actions = [];
  }

  if (
    !state.assistantMeta.scrubber_reverse_map ||
    typeof state.assistantMeta.scrubber_reverse_map !== "object"
  ) {
    state.assistantMeta.scrubber_reverse_map = {};
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

function mergeAssistantMeta(nextMeta = {}) {
  ensureAssistantState();

  const previous = state.assistantMeta || {};

  state.assistantMeta = {
    sources: Array.isArray(nextMeta.sources)
      ? nextMeta.sources
      : previous.sources || [],
    runtime:
      nextMeta.runtime && typeof nextMeta.runtime === "object"
        ? {
            ...(previous.runtime || {}),
            ...nextMeta.runtime,
          }
        : previous.runtime || {},
    explainability:
      nextMeta.explainability && typeof nextMeta.explainability === "object"
        ? {
            ...(previous.explainability || {}),
            ...nextMeta.explainability,
          }
        : previous.explainability || {},
    assistant_scope:
      nextMeta.assistant_scope && typeof nextMeta.assistant_scope === "object"
        ? {
            ...(previous.assistant_scope || {}),
            ...nextMeta.assistant_scope,
          }
        : previous.assistant_scope || {},
    assistant_context:
      nextMeta.assistant_context && typeof nextMeta.assistant_context === "object"
        ? {
            ...(previous.assistant_context || {}),
            ...nextMeta.assistant_context,
          }
        : previous.assistant_context || {},
    suggested_actions: Array.isArray(nextMeta.suggested_actions)
      ? nextMeta.suggested_actions
      : previous.suggested_actions || [],
    scrubber_reverse_map:
      nextMeta.scrubber_reverse_map &&
      typeof nextMeta.scrubber_reverse_map === "object"
        ? nextMeta.scrubber_reverse_map
        : previous.scrubber_reverse_map || {},
  };
}

function syncAssistantUi() {
  ensureAssistantState();
  refreshAssistantUi();
}

export function openAssistant() {
  ensureAssistantState();
  updateAssistantContext();
  state.assistantOpen = true;
  syncAssistantUi();
}

export function closeAssistant() {
  state.assistantOpen = false;
  syncAssistantUi();
}

export function renderAssistantMessages() {
  ensureAssistantState();
  syncAssistantUi();
}

export function renderAssistantInsights() {
  ensureAssistantState();
  syncAssistantUi();
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

  syncAssistantUi();
}

function updateLastAssistantStreamingText(text) {
  const safeText = String(text || "Thinking…");
  const lists = [
    state.assistantMessages || [],
    state.assistantModalMessages || [],
  ];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeText;
    }
  });

  syncAssistantUi();
}

function replaceLastAssistantPlaceholder(text) {
  const safeText = String(text || "No assistant reply returned.");
  const lists = [
    state.assistantMessages || [],
    state.assistantModalMessages || [],
  ];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeText;
      last._streaming = false;
      return;
    }

    list.push(
      cloneMessageEntry({
        role: "assistant",
        content: safeText,
      })
    );
  });

  syncAssistantUi();
}

function setAssistantSending(flag) {
  state.assistantSending = !!flag;
  syncAssistantUi();
}

function isGreeting(text = "") {
  return /^(hi|hello|hey|hiya|morning|good morning|afternoon|good afternoon|evening|good evening)\b/i.test(
    String(text || "").trim()
  );
}

function detectAssistantIntent(text = "") {
  const value = String(text || "").trim().toLowerCase();

  if (!value) return ASSISTANT_INTENT.unknown;
  if (isGreeting(value)) return ASSISTANT_INTENT.greeting;

  if (
    /reg\s*45|regulation\s*45|qa full summary|full summary|comprehensive summary|full review|period review|six month|6 month|twelve month|12 month/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.review;
  }

  if (
    /chronology|timeline|what happened|history|in date order|events over time/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.chronology;
  }

  if (
    /when was|what date|dates|last incident|last missing|next appointment|how many|overdue|due soon|upcoming/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.factual_lookup;
  }

  if (/handover|next shift|shift brief/.test(value)) {
    return ASSISTANT_INTENT.handover;
  }

  if (/draft|write|reword|rewrite|wording|improve this/.test(value)) {
    return ASSISTANT_INTENT.drafting;
  }

  if (/compliance|ofsted|supervision|training|statutory|audit/.test(value)) {
    return ASSISTANT_INTENT.compliance;
  }

  if (/risk|safeguarding|harm|trigger|protective factor/.test(value)) {
    return ASSISTANT_INTENT.risk;
  }

  if (/quality|ri|inspection|governance|provider|home compare|compare homes|all homes/.test(value)) {
    return ASSISTANT_INTENT.quality;
  }

  if (/manager|oversight|leadership|escalation/.test(value)) {
    return ASSISTANT_INTENT.management;
  }

  if (/summary|summarise|summarize|what matters|overview/.test(value)) {
    return ASSISTANT_INTENT.summary;
  }

  return ASSISTANT_INTENT.unknown;
}

function detectRetrievalMode(text = "", intent = ASSISTANT_INTENT.unknown) {
  const value = String(text || "").trim().toLowerCase();

  if (
    /this section|this page|this screen|current view|current section|workspace section/.test(
      value
    )
  ) {
    return "section_only";
  }

  if (
    [
      ASSISTANT_INTENT.summary,
      ASSISTANT_INTENT.chronology,
      ASSISTANT_INTENT.review,
      ASSISTANT_INTENT.factual_lookup,
      ASSISTANT_INTENT.compliance,
      ASSISTANT_INTENT.risk,
      ASSISTANT_INTENT.quality,
      ASSISTANT_INTENT.management,
    ].includes(intent)
  ) {
    return "whole_scope";
  }

  if (
    intent === ASSISTANT_INTENT.handover ||
    intent === ASSISTANT_INTENT.drafting
  ) {
    return /this section|this page|this draft/.test(value)
      ? "section_only"
      : "whole_scope";
  }

  return "whole_scope";
}

function detectOutputMode(intent = ASSISTANT_INTENT.unknown) {
  if (intent === ASSISTANT_INTENT.chronology) return "chronology";
  if (intent === ASSISTANT_INTENT.review) return "review_pack";
  if (intent === ASSISTANT_INTENT.handover) return "handover";
  if (intent === ASSISTANT_INTENT.compliance) return "compliance_brief";
  if (intent === ASSISTANT_INTENT.summary) return "summary";
  if (intent === ASSISTANT_INTENT.factual_lookup) return "factual_answer";
  if (intent === ASSISTANT_INTENT.drafting) return "drafting";
  return "answer";
}

function detectAssistantResponseMode(text) {
  return /6 month|six month|12 month|twelve month|summary|timeline|chronology|review|report|audit|compliance|ofsted|ri|full summary|reg 45|regulation 45/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

function buildRoleAwareGreeting() {
  const scope = getCurrentScope();

  if (scope === "child") {
    return `Hello. What would you like to know about ${getFullYoungPersonName()}? I can help with a full summary, chronology, dates, risks, appointments, family contact themes, or a handover.`;
  }

  if (scope === "home") {
    return `Hello. What would you like to know about ${getHomeName()}? I can help with a full summary, chronology, staffing, compliance, overdue items, management oversight, or next actions.`;
  }

  return `Hello. What would you like to know about ${
    getAccessLevelForScope("quality") === "provider"
      ? "your homes and provider oversight"
      : `${getHomeName()} quality and oversight`
  }? I can help with compliance themes, chronology, inspection readiness, RI summaries, and cross-home comparisons where allowed.`;
}

function buildUnknownIntentPrompt() {
  const scope = getCurrentScope();

  if (scope === "child") {
    return [
      `I’m ready to help with ${getFullYoungPersonName()} across that child’s full OS record.`,
      "",
      "You can ask for:",
      "• a full summary",
      "• a chronology",
      "• important dates",
      "• last incidents or appointments",
      "• risks and protective factors",
      "• family contact themes",
      "• a handover",
    ].join("\n");
  }

  if (scope === "home") {
    return [
      `I’m ready to help with ${getHomeName()} across that home’s full OS record.`,
      "",
      "You can ask for:",
      "• a full home summary",
      "• chronology and dates",
      "• staffing pressures",
      "• overdue compliance",
      "• management priorities",
      "• handover-ready updates",
    ].join("\n");
  }

  return [
    `I’m ready to help with ${
      getAccessLevelForScope("quality") === "provider"
        ? "all homes you oversee"
        : `${getHomeName()} quality and oversight`
    } across the OS record set.`,
    "",
    "You can ask for:",
    "• a quality summary",
    "• chronology and themes",
    "• audit or RI issues",
    "• compliance gaps",
    "• governance concerns",
    "• cross-home comparisons where permitted",
  ].join("\n");
}

function assistantPromptsForView(view, scope = getCurrentScope()) {
  const childMap = {
    workspace: [
      "Give me a full summary for this young person.",
      "Create a chronology for this young person.",
      "What matters most right now across the whole record?",
    ],
    overview: [
      "What matters most right now across the whole record?",
      "Summarise the main themes for this young person.",
      "What should staff prioritise next?",
    ],
    profile: [
      "Summarise this young person’s needs and what helps.",
      "What should adults hold in mind day to day?",
      "What are the most important communication needs?",
    ],
    timeline: [
      "Create a chronology summary for this young person.",
      "What are the key turning points recently?",
      "What patterns can you see across incidents and presentation?",
    ],
    handover: [
      "Give me a handover for this young person.",
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
      "Give me a full summary for this young person.",
      "Create a chronology and analysis for this young person.",
      "Draft a professional summary for a review meeting.",
    ],
  };

  const homeMap = {
    "home-dashboard": [
      "Give me a full summary for the home.",
      "Create a chronology for the home.",
      "What needs management attention right now across the whole service?",
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
      "Create a chronology and thematic summary for the home.",
      "Draft a home-level review summary.",
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
      "Summarise current quality themes across all homes I oversee.",
      "Compare compliance risk across my homes.",
      "What would an RI notice first?",
    ],
    compliance: [
      "What compliance gaps create the biggest Ofsted risk?",
      "Compare overdue compliance across homes.",
      "What needs urgent correction before inspection?",
    ],
    reports: [
      "Draft a provider-wide quality summary.",
      "What themes should be highlighted in reporting?",
      "Create a chronology and audit summary across homes.",
    ],
    manager: [
      "What leadership themes need escalation?",
      "Which home needs the most support right now?",
      "Where is oversight weakest right now?",
    ],
    team: [
      "Summarise staffing and workforce quality concerns across homes.",
      "What training or supervision gaps are emerging?",
      "What workforce risks affect compliance?",
    ],
    supervision: [
      "What supervision compliance risks are present across homes?",
      "Where are staff oversight gaps strongest?",
      "Summarise overdue supervisions by home.",
    ],
    documents: [
      "What statutory paperwork gaps need urgent action?",
      "Compare document quality and review issues across homes.",
      "Which home creates the biggest inspection risk?",
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
      ? "What matters most right now across the whole record?"
      : "What matters most right now across the whole service record?",
    "What needs attention next?",
    "Give me a concise summary.",
  ];
}

export function updateAssistantContext() {
  const scope = getCurrentScope();
  const section = getCurrentSection();
  const accessLevel = getAccessLevelForScope(scope);

  ensureAssistantState();

  const sectionLabel = String(section)
    .replaceAll("_", " ")
    .replaceAll("-", " ");

  const contextSummary =
    scope === "child"
      ? state.youngPersonId
        ? {
            summary: `Young person: ${getFullYoungPersonName()} • ${getHomeName()} • child-only OS scope • section: ${sectionLabel}`,
            scope_type: "young_person",
            current_scope: scope,
            current_section: section,
            access_level: "child",
            young_person_name: getFullYoungPersonName(),
            home_name: getHomeName(),
            allowed_home_ids: [state.homeId].filter(Boolean),
            retrieval_default: "whole_scope",
            suggested_prompts: assistantPromptsForView(section, scope),
          }
        : {
            summary: "No young person selected.",
            scope_type: "global",
            current_scope: scope,
            current_section: section,
            access_level: "child",
            young_person_name: null,
            home_name: getHomeName(),
            allowed_home_ids: [state.homeId].filter(Boolean),
            retrieval_default: "whole_scope",
            suggested_prompts: assistantPromptsForView(section, scope),
          }
      : scope === "home"
      ? {
          summary: `Home: ${getHomeName()} • home-only OS scope • section: ${sectionLabel}`,
          scope_type: "home",
          current_scope: scope,
          current_section: section,
          access_level: "home",
          young_person_name: null,
          home_name: getHomeName(),
          allowed_home_ids: [state.homeId].filter(Boolean),
          retrieval_default: "whole_scope",
          suggested_prompts: assistantPromptsForView(section, scope),
        }
      : {
          summary:
            accessLevel === "provider"
              ? `Quality: provider-wide oversight across allowed homes • section: ${sectionLabel}`
              : `Quality: ${getHomeName()} only • section: ${sectionLabel}`,
          scope_type: "quality",
          current_scope: scope,
          current_section: section,
          access_level: accessLevel,
          young_person_name: null,
          home_name: getHomeName(),
          allowed_home_ids:
            accessLevel === "provider"
              ? getAllowedHomeIds()
              : [state.homeId].filter(Boolean),
          retrieval_default: "whole_scope",
          suggested_prompts: assistantPromptsForView(section, scope),
        };

  mergeAssistantMeta({
    assistant_context: contextSummary,
  });

  syncAssistantUi();
}

function buildAssistantContextPayload(message = "") {
  const person = getSelectedYoungPerson() || {};
  const scope = getCurrentScope();
  const section = getCurrentSection();
  const intent = detectAssistantIntent(message);
  const retrieval_mode = detectRetrievalMode(message, intent);
  const output_mode = detectOutputMode(intent);
  const accessLevel = getAccessLevelForScope(scope);
  const allowedHomeIds =
    scope === "quality" && accessLevel === "provider"
      ? getAllowedHomeIds()
      : [Number(state.homeId)].filter((item) => Number.isFinite(item));

  return {
    assistant_type: "young_people_os",
    scope,
    scope_type: getAssistantScopeType(),
    access_level: accessLevel,
    provider_id:
      state.providerId ||
      state.currentUser?.provider_id ||
      state.currentUser?.providerId ||
      null,
    allowed_home_ids: allowedHomeIds,
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
    assistant_intent: intent,
    retrieval_mode,
    output_mode,
    whole_os_default: true,
    section_only_requested: retrieval_mode === "section_only",
    use_whole_scope_records: retrieval_mode !== "section_only",
    ask_for_dates:
      intent === ASSISTANT_INTENT.factual_lookup ||
      intent === ASSISTANT_INTENT.chronology,
    ask_for_chronology:
      intent === ASSISTANT_INTENT.chronology ||
      intent === ASSISTANT_INTENT.review,
    ask_for_summary:
      intent === ASSISTANT_INTENT.summary ||
      intent === ASSISTANT_INTENT.review,
    ask_for_review_pack: intent === ASSISTANT_INTENT.review,
    ask_for_compliance_view:
      intent === ASSISTANT_INTENT.compliance || scope === "quality",
    suggested_prompts_ui_only: assistantPromptsForView(section, scope).slice(
      0,
      MAX_UI_PROMPTS
    ),
  };
}

function trimForOutbound(value = "", max = MAX_SAFE_MESSAGE_LENGTH) {
  return String(value || "").trim().slice(0, max);
}

function buildCitationRef(source = {}, index = 0) {
  const recordType = source.record_type || source.type || "record";
  const recordId = source.record_id || source.id || `idx_${index + 1}`;
  return `${recordType}:${recordId}`;
}

function dedupeSources(sources = []) {
  const seen = new Set();
  const result = [];

  for (const source of Array.isArray(sources) ? sources : []) {
    const key = `${source.record_type || source.type || "record"}::${
      source.record_id || source.id || source.label || ""
    }`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(source);
  }

  return result;
}

function sanitiseSourcesForUi(sources = []) {
  return dedupeSources(sources)
    .slice(0, MAX_SOURCE_ITEMS)
    .map((source, index) => ({
      type: source.type || source.record_type || "record",
      label: String(source.label || source.title || "Record"),
      excerpt: String(source.excerpt || source.summary || "").slice(
        0,
        MAX_SOURCE_EXCERPT
      ),
      section: source.section || "",
      record_type: source.record_type || source.type || null,
      record_id: source.record_id || source.id || null,
      citation_ref: source.citation_ref || buildCitationRef(source, index),
    }));
}

function buildSafeAssistantRequestPayload(payload) {
  const context = payload?.context || {};

  return {
    message: trimForOutbound(payload?.message || ""),
    response_mode: payload?.response_mode || "balanced",
    context: {
      assistant_type: context.assistant_type || "young_people_os",
      scope: context.scope || null,
      scope_type: context.scope_type || null,
      access_level: context.access_level || null,
      provider_id: context.provider_id || null,
      allowed_home_ids: Array.isArray(context.allowed_home_ids)
        ? context.allowed_home_ids
        : [],
      current_view: context.current_view || null,
      shift_context: context.shift_context || null,
      young_person_id: context.young_person_id || null,
      young_person_name: context.young_person_name || null,
      home_id: context.home_id || null,
      home_name: context.home_name || null,
      placement_status: context.placement_status || null,
      summary_risk_level: context.summary_risk_level || null,
      composer_record_type: context.composer_record_type || null,
      record_type: context.record_type || null,
      record_id: context.record_id || null,
      current_scope: context.current_scope || null,
      current_section: context.current_section || null,
      user_role: context.user_role || "staff",
      assistant_intent: context.assistant_intent || "summary",
      retrieval_mode: context.retrieval_mode || "whole_scope",
      output_mode: context.output_mode || "answer",
      whole_os_default: Boolean(context.whole_os_default),
      section_only_requested: Boolean(context.section_only_requested),
      use_whole_scope_records: Boolean(context.use_whole_scope_records),
      ask_for_dates: Boolean(context.ask_for_dates),
      ask_for_chronology: Boolean(context.ask_for_chronology),
      ask_for_summary: Boolean(context.ask_for_summary),
      ask_for_review_pack: Boolean(context.ask_for_review_pack),
      ask_for_compliance_view: Boolean(context.ask_for_compliance_view),
      suggested_prompts_ui_only: Array.isArray(context.suggested_prompts_ui_only)
        ? context.suggested_prompts_ui_only.slice(0, MAX_UI_PROMPTS)
        : [],
    },
  };
}

function scrubAssistantRequestPayload(payload) {
  const safeBasePayload = buildSafeAssistantRequestPayload(payload);

  try {
    if (typeof aiScrubber.scrubAssistantPayload === "function") {
      const result = aiScrubber.scrubAssistantPayload(safeBasePayload);

      return {
        payload: result?.safePayload || safeBasePayload,
        reverseMap: result?.reverseMap || {},
        meta: {
          enabled: true,
          mode: "client_side",
        },
      };
    }

    if (typeof aiScrubber.createScrubber === "function") {
      const scrubber = aiScrubber.createScrubber();
      scrubber.registerContext(safeBasePayload?.context || {});
      const safePayload = scrubber.scrubPayload(safeBasePayload);

      return {
        payload: safePayload || safeBasePayload,
        reverseMap:
          typeof scrubber.reverseMap === "function"
            ? scrubber.reverseMap()
            : {},
        meta: {
          enabled: true,
          mode: "client_side",
        },
      };
    }

    return {
      payload: safeBasePayload,
      reverseMap: {},
      meta: {
        enabled: false,
        reason: "scrubber_not_found",
      },
    };
  } catch (error) {
    console.error("[assistant] ai scrubber failed", error);

    return {
      payload: safeBasePayload,
      reverseMap: {},
      meta: {
        enabled: false,
        reason: "scrubber_error",
        error: error?.message || "Unknown scrubber error",
      },
    };
  }
}

function restoreAssistantReplyTokens(text = "", reverseMap = {}) {
  try {
    if (
      reverseMap &&
      Object.keys(reverseMap).length &&
      typeof aiScrubber.restoreTokens === "function"
    ) {
      return aiScrubber.restoreTokens(text, reverseMap);
    }
  } catch (error) {
    console.error("[assistant] token restore failed", error);
  }

  return text;
}

function applyAssistantMeta(meta = {}) {
  const nextMeta = { ...meta };

  if (nextMeta.sources) {
    nextMeta.sources = sanitiseSourcesForUi(nextMeta.sources);
  }

  mergeAssistantMeta(nextMeta);
  syncAssistantUi();
}

async function answerLocallyForGreeting(question) {
  appendAssistantUserMessage(question);
  appendAssistantSystemMessage(buildRoleAwareGreeting());
}

async function answerLocallyForUnknown(question) {
  appendAssistantUserMessage(question);
  appendAssistantSystemMessage(buildUnknownIntentPrompt());
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

  const intent = detectAssistantIntent(trimmed);

  if (intent === ASSISTANT_INTENT.greeting) {
    await answerLocallyForGreeting(trimmed);
    return;
  }

  if (intent === ASSISTANT_INTENT.unknown && trimmed.length < 8) {
    await answerLocallyForUnknown(trimmed);
    return;
  }

  appendAssistantUserMessage(trimmed);
  addAssistantPlaceholder();
  setAssistantSending(true);

  try {
    const contextPayload = buildAssistantContextPayload(trimmed);

    const outboundPayload = {
      message: trimmed,
      response_mode: detectAssistantResponseMode(trimmed),
      context: contextPayload,
    };

    const scrubbed = scrubAssistantRequestPayload(outboundPayload);

    mergeAssistantMeta({
      scrubber_reverse_map: scrubbed.reverseMap || {},
    });

    await apiStreamAssistant(scrubbed.payload, {
      onMeta: (meta) => {
        applyAssistantMeta({
          ...meta,
          runtime: {
            ...(meta?.runtime || {}),
            assistant_intent: contextPayload.assistant_intent,
            retrieval_mode: contextPayload.retrieval_mode,
            output_mode: contextPayload.output_mode,
            whole_os_default: true,
            access_level: contextPayload.access_level,
            allowed_home_ids: contextPayload.allowed_home_ids,
            provider_id: contextPayload.provider_id,
            ai_scrubber_enabled: scrubbed.meta?.enabled ?? false,
          },
          explainability: {
            ...(meta?.explainability || {}),
            reasoning_summary:
              meta?.explainability?.reasoning_summary ||
              `Intent: ${contextPayload.assistant_intent}. Retrieval: ${contextPayload.retrieval_mode}. Output: ${contextPayload.output_mode}. Scope access: ${contextPayload.access_level}.`,
            ai_scrubber:
              scrubbed.meta?.enabled
                ? "Client-side AI scrubber applied before outbound request."
                : "Client-side AI scrubber not applied.",
          },
          assistant_context: {
            ...(meta?.assistant_context || {}),
            requested_scope_mode: contextPayload.retrieval_mode,
            whole_os_default: true,
            access_level: contextPayload.access_level,
            allowed_home_ids: contextPayload.allowed_home_ids,
            provider_id: contextPayload.provider_id,
          },
          assistant_scope: {
            ...(meta?.assistant_scope || {}),
            scrubber_meta: scrubbed.meta || {},
            access_level: contextPayload.access_level,
            allowed_home_ids: contextPayload.allowed_home_ids,
            provider_id: contextPayload.provider_id,
          },
          sources: meta?.sources || [],
          scrubber_reverse_map: scrubbed.reverseMap || {},
        });
      },
      onProgress: () => {},
      onMessage: (streamedText) => {
        const restored = restoreAssistantReplyTokens(
          streamedText || "Thinking…",
          scrubbed.reverseMap
        );
        updateLastAssistantStreamingText(restored || "Thinking…");
      },
      onDone: (streamedText) => {
        const restored = restoreAssistantReplyTokens(
          String(streamedText || "").trim() || "No assistant reply returned.",
          scrubbed.reverseMap
        );

        replaceLastAssistantPlaceholder(restored);
      },
    });
  } catch (error) {
    replaceLastAssistantPlaceholder(
      error?.message || "The assistant could not answer right now."
    );
  } finally {
    setAssistantSending(false);
    syncAssistantUi();
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];

  if (state.assistantMeta && typeof state.assistantMeta === "object") {
    state.assistantMeta.sources = [];
    state.assistantMeta.suggested_actions = [];
    state.assistantMeta.scrubber_reverse_map = {};
    state.assistantMeta.runtime = {};
    state.assistantMeta.explainability = {};
    state.assistantMeta.assistant_scope = {};
    state.assistantMeta.assistant_context = {};
  }

  syncAssistantUi();
}

function handleQuickAction(actionId = "") {
  const id = String(actionId || "").trim();
  if (!id) return;

  const router =
    typeof window !== "undefined" ? window.handleQuickAction : null;

  if (typeof router === "function") {
    router(id);
  }
}

function bindPromptButtons() {
  if (assistantPromptDelegatesBound) return;
  assistantPromptDelegatesBound = true;

  document.addEventListener("click", async (event) => {
    const quickActionButton = event.target.closest("[data-quick-action]");
    if (quickActionButton) {
      const actionId = quickActionButton.dataset.quickAction || "";
      if (actionId) {
        handleQuickAction(actionId);
      }
      return;
    }

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

import {
  state,
  createAssistantMeta,
} from "../state.js";
import { els } from "../dom.js";
import { apiStreamAssistant } from "../core/api.js";
import * as aiScrubber from "../core/ai-scrubber.js";
import {
  refreshAssistantUi,
  appendAssistantSystemMessage,
  appendAssistantUserMessage,
} from "./assistant-ui.js";
import {
  refreshAssistantAnalysisOnly,
} from "./assistant-controller.js";
import {
  ensureAssistantState,
  getAssistantMeta,
  mergeAssistantMeta,
  getCurrentScope,
  getCurrentSection,
  getSelectedYoungPerson,
  getFullYoungPersonName,
  getHomeName,
  getAllowedHomeIds,
  getAccessLevelForScope,
  getAssistantScopeType,
  getAssistantTypeForScope,
  detectAssistantIntent,
  detectAssistantIntents,
  detectRetrievalMode,
  detectOutputMode,
  detectAssistantResponseMode,
  assistantPromptsForView,
} from "../assistant/helpers.js";

let assistantEventsBound = false;
let assistantPromptDelegatesBound = false;

const MAX_SAFE_MESSAGE_LENGTH = 3000;
const MAX_SOURCE_ITEMS = 12;
const MAX_SOURCE_EXCERPT = 240;
const MAX_UI_PROMPTS = 8;

function extractStreamText(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";

  const directCandidates = [
    payload.accumulated_text,
    payload.text,
    payload.message,
    payload.content,
    payload.answer,
    payload.output,
    payload.response,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  if (payload.content && typeof payload.content === "object") {
    const nested = payload.content;
    const nestedCandidates = [
      nested.text,
      nested.message,
      nested.content,
      nested.answer,
      nested.output,
      nested.response,
    ];

    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    if (Array.isArray(nested.parts)) {
      const joined = nested.parts
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          if (part && typeof part.content === "string") return part.content;
          return "";
        })
        .filter(Boolean)
        .join("\n");

      if (joined.trim()) return joined;
    }
  }

  if (Array.isArray(payload.parts)) {
    const joined = payload.parts
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        if (part && typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");

    if (joined.trim()) return joined;
  }

  return "";
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
      label: String(source.label || source.title || source.document_title || "Record"),
      title: String(source.title || source.label || source.document_title || "Record"),
      excerpt: String(source.excerpt || source.summary || source.description || "").slice(
        0,
        MAX_SOURCE_EXCERPT
      ),
      description: String(
        source.description || source.excerpt || source.summary || ""
      ).slice(0, MAX_SOURCE_EXCERPT),
      section: source.section || "",
      record_type: source.record_type || source.type || null,
      record_id: source.record_id || source.id || null,
      citation_ref: source.citation_ref || buildCitationRef(source, index),
      evidence_kind: source.evidence_kind || "direct",
      created_at: source.created_at || source.date || null,
      url: source.url || null,
    }));
}

function getSourcesSafe() {
  ensureAssistantState();
  return Array.isArray(state.assistantMeta?.sources)
    ? state.assistantMeta.sources
    : [];
}

function applyAssistantMeta(meta = {}) {
  const nextMeta = { ...meta };

  if (nextMeta.sources) {
    nextMeta.sources = sanitiseSourcesForUi(nextMeta.sources);
  }

  mergeAssistantMeta(nextMeta);
  refreshAssistantUi();
}

function setAssistantSending(flag) {
  state.assistantSending = !!flag;
  refreshAssistantUi();
}

export function openAssistant() {
  ensureAssistantState();
  state.assistantOpen = true;
  refreshAssistantUi();
}

export function closeAssistant() {
  state.assistantOpen = false;
  refreshAssistantUi();
}

function addAssistantPlaceholder(extra = {}) {
  ensureAssistantState();

  appendAssistantSystemMessage("Thinking…", {
    status: "streaming",
    _streaming: true,
    intent: extra.intent || null,
    citations: [],
    actions: [],
    scope_snapshot: extra.scope_snapshot || null,
  });
}

function updateLastAssistantStreamingText(text, extra = {}) {
  const safeValue =
    typeof text === "string" ? text : extractStreamText(text) || "Thinking…";

  const list = Array.isArray(state.assistantMessages)
    ? state.assistantMessages
    : [];

  if (!list.length) return;

  const last = list[list.length - 1];
  if (!last || last.role !== "assistant" || !last._streaming) return;

  last.content = safeValue;
  last.status = "streaming";
  if (extra.intent) last.intent = extra.intent;
  if (Array.isArray(extra.citations)) last.citations = extra.citations;
  if (Array.isArray(extra.actions)) last.actions = extra.actions;

  refreshAssistantUi();
}

function replaceLastAssistantPlaceholder(text, extra = {}) {
  const safeValue =
    typeof text === "string"
      ? text
      : extractStreamText(text) || "No assistant reply returned.";

  const list = Array.isArray(state.assistantMessages)
    ? state.assistantMessages
    : [];

  if (!list.length) {
    appendAssistantSystemMessage(safeValue, {
      status: "complete",
      _streaming: false,
      intent: extra.intent || null,
      citations: extra.citations || [],
      actions: extra.actions || [],
      scope_snapshot: extra.scope_snapshot || null,
    });
    return;
  }

  const last = list[list.length - 1];

  if (last?.role === "assistant" && last?._streaming) {
    last.content = safeValue;
    last.status = "complete";
    last._streaming = false;
    if (extra.intent) last.intent = extra.intent;
    if (Array.isArray(extra.citations)) last.citations = extra.citations;
    if (Array.isArray(extra.actions)) last.actions = extra.actions;
    refreshAssistantUi();
    return;
  }

  appendAssistantSystemMessage(safeValue, {
    status: "complete",
    _streaming: false,
    intent: extra.intent || null,
    citations: extra.citations || [],
    actions: extra.actions || [],
    scope_snapshot: extra.scope_snapshot || null,
  });
}

function isGreeting(text = "") {
  return /^(hi|hello|hey|hiya|morning|good morning|afternoon|good afternoon|evening|good evening)\b/i.test(
    String(text || "").trim()
  );
}

function buildRoleAwareGreeting() {
  const scope = getCurrentScope();

  if (scope === "child") {
    return `Hello. What would you like to know about ${getFullYoungPersonName()}? I can help with a full summary, chronology, dates, risks, appointments, family contact themes, handover thinking, and evidence-led children’s home support.`;
  }

  if (scope === "home") {
    return `Hello. What would you like to know about ${getHomeName()}? I can help with a full home summary, chronology, staffing, compliance, inspection readiness, management oversight, or next actions.`;
  }

  return `Hello. What would you like to know about ${
    getAccessLevelForScope("quality") === "provider"
      ? "your homes and provider oversight"
      : `${getHomeName()} quality and oversight`
  }? I can help with compliance themes, chronology, inspection readiness, RI summaries, governance patterns and cross-home comparisons where allowed.`;
}

function buildUnknownIntentPrompt() {
  const scope = getCurrentScope();

  if (scope === "child") {
    return [
      `I’m ready to help with ${getFullYoungPersonName()} across the full children’s residential home record.`,
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
      `I’m ready to help with ${getHomeName()} across the full home operating record.`,
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
    } across the OS evidence set.`,
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

function inferAnalysisLens({
  scope = getCurrentScope(),
  section = getCurrentSection(),
  role = state.userRole || "staff",
  intent = ASSISTANT_INTENT.summary,
} = {}) {
  const safeRole = String(role || "staff").toLowerCase();
  const safeSection = String(section || "").toLowerCase();
  const safeIntent = String(intent || "summary").toLowerCase();

  if (
    /safeguarding|risk|missing/.test(safeSection) ||
    safeIntent === "risk"
  ) {
    return "safeguarding";
  }

  if (
    scope === "quality" ||
    safeIntent === "quality" ||
    safeIntent === "compliance" ||
    /quality|compliance|reg44|reg45|ofsted|inspection/.test(safeSection)
  ) {
    return safeRole === "ri" || safeRole === "admin" ? "quality" : "inspection";
  }

  if (
    safeIntent === "management" ||
    ["manager", "registered_manager", "deputy_manager"].includes(safeRole) ||
    /manager|team|supervision|home-dashboard/.test(safeSection)
  ) {
    return "manager";
  }

  if (safeIntent === "handover" || safeIntent === "morning_brief") {
    return "shift";
  }

  if (scope === "child") return "child_centred";
  if (scope === "home") return "operational";
  return "general";
}

function buildAssistantContextPayload(message = "") {
  const person = getSelectedYoungPerson() || {};
  const scope = getCurrentScope();
  const section = getCurrentSection();

  const intentMeta = detectAssistantIntents(message);
  const intent = intentMeta.primary_intent;
  const secondaryIntents = intentMeta.secondary_intents || [];
  const retrievalMode = detectRetrievalMode(message, intent);
  const outputMode = detectOutputMode(intent, message);
  const accessLevel = getAccessLevelForScope(scope);
  const assistantType = getAssistantTypeForScope(scope);
  const analysisLens = inferAnalysisLens({
    scope,
    section,
    role: state.userRole,
    intent,
  });

  const allowedHomeIds =
    scope === "quality" && accessLevel === "provider"
      ? getAllowedHomeIds()
      : [Number(state.homeId)].filter((item) => Number.isFinite(item));

  return {
    assistant_type: assistantType,
    assistant_identity: {
      product_name: "IndiCare OS",
      domain: "children_residential_home_operating_system",
      reasoning_model: "residential_care_operational_reasoning",
      answer_style: "evidence_led_children_home_operational_assistant",
    },
    response_contract: {
      require_inline_citations: true,
      citation_format: "[record_type:record_id]",
      citation_density: "every_substantive_paragraph",
      avoid_generic_policy_language: true,
      prefer_children_home_operational_language: true,
      separate_fact_pattern_action: true,
      evidence_first: true,
    },
    inspection_framework: {
      reference_children_homes_regulations: true,
      reference_quality_standards: true,
      reference_sccif: true,
    },
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
    secondary_intents: secondaryIntents,
    analysis_lens: analysisLens,
    retrieval_mode: retrievalMode,
    output_mode: outputMode,
    whole_os_default: true,
    section_only_requested: retrievalMode === "section_only",
    use_whole_scope_records: retrievalMode !== "section_only",
    ask_for_dates:
      intent === "factual_lookup" || intent === "chronology",
    ask_for_chronology:
      intent === "chronology" || intent === "review",
    ask_for_summary:
      intent === "summary" || intent === "review",
    ask_for_review_pack: intent === "review",
    ask_for_compliance_view:
      intent === "compliance" || scope === "quality",
    suggested_prompts_ui_only: assistantPromptsForView(section, scope).slice(
      0,
      MAX_UI_PROMPTS
    ),
  };
}

function buildSafeAssistantRequestPayload(payload) {
  const context = payload?.context || {};

  return {
    message: trimForOutbound(payload?.message || ""),
    response_mode: payload?.response_mode || "balanced",
    context: {
      assistant_type: context.assistant_type || "young_people_os",
      assistant_identity:
        context.assistant_identity && typeof context.assistant_identity === "object"
          ? context.assistant_identity
          : null,
      response_contract:
        context.response_contract && typeof context.response_contract === "object"
          ? context.response_contract
          : null,
      inspection_framework:
        context.inspection_framework && typeof context.inspection_framework === "object"
          ? context.inspection_framework
          : null,
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
      secondary_intents: Array.isArray(context.secondary_intents)
        ? context.secondary_intents
        : [],
      analysis_lens: context.analysis_lens || "general",
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

async function answerLocallyForGreeting(question) {
  const intentMeta = detectAssistantIntents(question);
  appendAssistantUserMessage(question, {
    intent: intentMeta.primary_intent,
    scope_snapshot: {
      scope: getCurrentScope(),
      section: getCurrentSection(),
    },
  });

  appendAssistantSystemMessage(buildRoleAwareGreeting(), {
    intent: intentMeta.primary_intent,
    scope_snapshot: {
      scope: getCurrentScope(),
      section: getCurrentSection(),
    },
  });
}

async function answerLocallyForUnknown(question) {
  const intentMeta = detectAssistantIntents(question);
  appendAssistantUserMessage(question, {
    intent: intentMeta.primary_intent,
    scope_snapshot: {
      scope: getCurrentScope(),
      section: getCurrentSection(),
    },
  });

  appendAssistantSystemMessage(buildUnknownIntentPrompt(), {
    intent: intentMeta.primary_intent,
    scope_snapshot: {
      scope: getCurrentScope(),
      section: getCurrentSection(),
    },
  });
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

  const intentMeta = detectAssistantIntents(trimmed);
  const primaryIntent = intentMeta.primary_intent;
  const section = getCurrentSection();
  const scope = getCurrentScope();
  const analysisLens = inferAnalysisLens({
    scope,
    section,
    role: state.userRole,
    intent: primaryIntent,
  });

  if (isGreeting(trimmed)) {
    await answerLocallyForGreeting(trimmed);
    return;
  }

  if (primaryIntent === "unknown" && trimmed.length < 8) {
    await answerLocallyForUnknown(trimmed);
    return;
  }

  appendAssistantUserMessage(trimmed, {
    intent: primaryIntent,
    scope_snapshot: { scope, section },
  });

  addAssistantPlaceholder({
    intent: primaryIntent,
    scope_snapshot: { scope, section },
  });

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
      scrubber_enabled: scrubbed.meta?.enabled ?? false,
      scrubber_meta: scrubbed.meta || {},
      runtime: {
        ...(getAssistantMeta().runtime || {}),
        analysis_lens: analysisLens,
        assistant_intent: primaryIntent,
        secondary_intents: intentMeta.secondary_intents || [],
      },
      assistant_context: {
        ...(getAssistantMeta().assistant_context || {}),
        analysis_lens: analysisLens,
      },
    });

    await apiStreamAssistant(scrubbed.payload, {
      onMeta: (meta) => {
        applyAssistantMeta({
          ...meta,
          runtime: {
            ...(meta?.runtime || {}),
            assistant_intent: contextPayload.assistant_intent,
            secondary_intents: contextPayload.secondary_intents || [],
            analysis_lens: contextPayload.analysis_lens,
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
              `This answer used an evidence-led children’s home reasoning approach with a ${contextPayload.analysis_lens} lens.`,
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
            analysis_lens: contextPayload.analysis_lens,
          },
          assistant_scope: {
            ...(meta?.assistant_scope || {}),
            scrubber_meta: scrubbed.meta || {},
            access_level: contextPayload.access_level,
            allowed_home_ids: contextPayload.allowed_home_ids,
            provider_id: contextPayload.provider_id,
            analysis_lens: contextPayload.analysis_lens,
          },
          sources: meta?.sources || [],
          suggested_actions: meta?.suggested_actions || [],
          scrubber_reverse_map: scrubbed.reverseMap || {},
          scrubber_enabled: scrubbed.meta?.enabled ?? false,
          scrubber_meta: scrubbed.meta || {},
          last_analysis_at: new Date().toISOString(),
        });
      },

      onProgress: () => {},

      onMessage: (streamedPayload) => {
        const safeValue = extractStreamText(streamedPayload) || "Thinking…";
        const restored = restoreAssistantReplyTokens(
          safeValue,
          scrubbed.reverseMap
        );

        updateLastAssistantStreamingText(restored || "Thinking…", {
          intent: primaryIntent,
        });
      },

      onDone: async (streamedPayload) => {
        const safeValue =
          extractStreamText(streamedPayload) || "No assistant reply returned.";

        const restored = restoreAssistantReplyTokens(
          safeValue.trim(),
          scrubbed.reverseMap
        );

        const suggestedActions =
          streamedPayload?.suggested_actions || getAssistantMeta().suggested_actions || [];

        const sourceRefs = Array.isArray(streamedPayload?.sources)
          ? sanitiseSourcesForUi(streamedPayload.sources).map((s) => s.citation_ref)
          : getSourcesSafe().map((s) => s.citation_ref);

        if (
          streamedPayload &&
          typeof streamedPayload === "object" &&
          (streamedPayload.sources ||
            streamedPayload.runtime ||
            streamedPayload.explainability ||
            streamedPayload.assistant_scope ||
            streamedPayload.assistant_context ||
            streamedPayload.suggested_actions)
        ) {
          applyAssistantMeta({
            sources: streamedPayload.sources || getSourcesSafe(),
            runtime: streamedPayload.runtime || {},
            explainability: streamedPayload.explainability || {},
            assistant_scope: streamedPayload.assistant_scope || {},
            assistant_context: streamedPayload.assistant_context || {},
            suggested_actions: streamedPayload.suggested_actions || [],
            last_analysis_at: new Date().toISOString(),
          });
        } else {
          await refreshAssistantAnalysisOnly();
        }

        replaceLastAssistantPlaceholder(
          restored || "No assistant reply returned.",
          {
            intent: primaryIntent,
            citations: sourceRefs,
            actions: suggestedActions,
            scope_snapshot: { scope, section },
          }
        );
      },
    });
  } catch (error) {
    replaceLastAssistantPlaceholder(
      error?.message || "The assistant could not answer right now.",
      {
        intent: primaryIntent,
        scope_snapshot: { scope, section },
      }
    );
  } finally {
    setAssistantSending(false);
    refreshAssistantUi();
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];

  if (state.assistantMeta && typeof state.assistantMeta === "object") {
    state.assistantMeta = createAssistantMeta();
  }

  refreshAssistantUi();
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

  bindPromptButtons();
}

export function loadAssistant() {
  ensureAssistantState();
  refreshAssistantUi();
}

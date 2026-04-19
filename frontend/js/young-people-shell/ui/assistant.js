import { state, createAssistantMeta } from "../state.js";
import { els } from "../dom.js";
import { apiStreamAssistant } from "../core/api.js";
import * as aiScrubber from "../core/ai-scrubber.js";
import {
  refreshAssistantUi,
  appendAssistantSystemMessage,
  appendAssistantUserMessage,
} from "./assistant-ui.js";
import {
  ensureAssistantState,
  mergeAssistantMeta,
  getCurrentScope,
  getCurrentSection,
  getFullYoungPersonName,
  getHomeName,
  getAllowedHomeIds,
  getAccessLevelForScope,
  getAssistantScopeType,
  getAssistantTypeForScope,
  detectAssistantIntent,
  detectRetrievalMode,
  detectOutputMode,
  detectAssistantResponseMode,
  extractStreamText,
  cloneAssistantMessage,
  trimForOutbound,
  buildRoleAwareGreeting,
  buildUnknownIntentPrompt,
  resolveReg45DateRange,
  getDefaultReg45DateRange,
  assistantPromptsForView,
} from "../assistant/helpers.js";

let assistantEventsBound = false;
let assistantPromptDelegatesBound = false;

const MAX_UI_PROMPTS = 8;

function ensureAssistantMessageLists() {
  ensureAssistantState();

  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }
}

function syncAssistantUi() {
  ensureAssistantMessageLists();
  refreshAssistantUi();
}

export function openAssistant() {
  ensureAssistantMessageLists();
  updateAssistantContext();
  state.assistantOpen = true;
  syncAssistantUi();
}

export function closeAssistant() {
  state.assistantOpen = false;
  syncAssistantUi();
}

export function renderAssistantMessages() {
  ensureAssistantMessageLists();
  syncAssistantUi();
}

export function renderAssistantInsights() {
  ensureAssistantMessageLists();
  syncAssistantUi();
}

function addAssistantPlaceholder() {
  ensureAssistantMessageLists();

  const entry = cloneAssistantMessage({
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
  });

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(cloneAssistantMessage(entry));
  syncAssistantUi();
}

function updateLastAssistantStreamingText(text) {
  ensureAssistantMessageLists();

  const safeValue =
    typeof text === "string" ? text : extractStreamText(text) || "Thinking…";

  const lists = [state.assistantMessages, state.assistantModalMessages];

  lists.forEach((list) => {
    if (!Array.isArray(list) || !list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeValue;
    }
  });

  syncAssistantUi();
}

function replaceLastAssistantPlaceholder(text) {
  ensureAssistantMessageLists();

  const safeValue =
    typeof text === "string"
      ? text
      : extractStreamText(text) || "No assistant reply returned.";

  const lists = [state.assistantMessages, state.assistantModalMessages];

  lists.forEach((list) => {
    if (!Array.isArray(list)) return;

    if (!list.length) {
      list.push(
        cloneAssistantMessage({
          role: "assistant",
          content: safeValue,
        })
      );
      return;
    }

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeValue;
      last._streaming = false;
    } else {
      list.push(
        cloneAssistantMessage({
          role: "assistant",
          content: safeValue,
        })
      );
    }
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

function buildAssistantContextPayload(message = "") {
  const person = state.selectedYoungPerson || state.youngPerson || null;
  const scope = getCurrentScope();
  const section = getCurrentSection();
  const intent = detectAssistantIntent(message);
  const retrievalMode = detectRetrievalMode(message, intent);
  const outputMode = detectOutputMode(intent, message);
  const accessLevel = getAccessLevelForScope(scope);
  const assistantType = getAssistantTypeForScope(scope);

  const allowedHomeIds =
    scope === "quality" && accessLevel === "provider"
      ? getAllowedHomeIds()
      : [Number(state.homeId)].filter((item) => Number.isFinite(item));

  const reg45Range =
    /reg\s*45|regulation\s*45/.test(String(message || "").toLowerCase())
      ? resolveReg45DateRange(message) || getDefaultReg45DateRange()
      : null;

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
      person?.home_id ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      null,
    home_name: getHomeName(),
    placement_status: person?.placement_status || null,
    summary_risk_level: person?.summary_risk_level || null,
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
    retrieval_mode: retrievalMode,
    output_mode: outputMode,
    whole_os_default: true,
    section_only_requested: retrievalMode === "section_only",
    use_whole_scope_records: retrievalMode !== "section_only",
    ask_for_dates: intent === "factual_lookup" || intent === "chronology",
    ask_for_chronology: intent === "chronology" || intent === "review",
    ask_for_summary: intent === "summary" || intent === "review",
    ask_for_review_pack: intent === "review",
    ask_for_compliance_view: intent === "compliance" || scope === "quality",
    suggested_prompts_ui_only: assistantPromptsForView(section, scope).slice(
      0,
      MAX_UI_PROMPTS
    ),
    reg45_requested: Boolean(reg45Range),
    reporting_period_start: reg45Range?.startDate?.toISOString?.() || null,
    reporting_period_end: reg45Range?.endDate?.toISOString?.() || null,
    reporting_period_inferred: Boolean(reg45Range?.inferred),
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
        context.assistant_identity &&
        typeof context.assistant_identity === "object"
          ? context.assistant_identity
          : null,
      response_contract:
        context.response_contract &&
        typeof context.response_contract === "object"
          ? context.response_contract
          : null,
      inspection_framework:
        context.inspection_framework &&
        typeof context.inspection_framework === "object"
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
      reg45_requested: Boolean(context.reg45_requested),
      reporting_period_start: context.reporting_period_start || null,
      reporting_period_end: context.reporting_period_end || null,
      reporting_period_inferred: Boolean(context.reporting_period_inferred),
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

function getSourcesSafe() {
  ensureAssistantMessageLists();
  return Array.isArray(state.assistantMeta?.sources)
    ? state.assistantMeta.sources
    : [];
}

function applyAssistantMeta(meta = {}) {
  mergeAssistantMeta({
    ...meta,
    last_analysis_at: meta.last_analysis_at || new Date().toISOString(),
  });
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

export function updateAssistantContext() {
  const scope = getCurrentScope();
  const section = getCurrentSection();
  const accessLevel = getAccessLevelForScope(scope);

  ensureAssistantMessageLists();

  const sectionLabel = String(section).replaceAll("_", " ").replaceAll("-", " ");

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

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();

  if (!trimmed || state.assistantSending) return;

  ensureAssistantMessageLists();

  if (getCurrentScope() === "child" && !state.youngPersonId) {
    appendAssistantSystemMessage(
      "Please select a young person first so I can answer in the right context."
    );
    return;
  }

  const intent = detectAssistantIntent(trimmed);

  if (intent === "greeting" || isGreeting(trimmed)) {
    await answerLocallyForGreeting(trimmed);
    return;
  }

  if (intent === "unknown" && trimmed.length < 8) {
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
      scrubber_enabled: scrubbed.meta?.enabled ?? false,
      scrubber_meta: scrubbed.meta || {},
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
            reporting_period_start: contextPayload.reporting_period_start,
            reporting_period_end: contextPayload.reporting_period_end,
            reporting_period_inferred: contextPayload.reporting_period_inferred,
          },
          explainability: {
            ...(meta?.explainability || {}),
            reasoning_summary:
              meta?.explainability?.reasoning_summary ||
              "This answer used an evidence-led children’s home reasoning approach.",
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
            reporting_period_start: contextPayload.reporting_period_start,
            reporting_period_end: contextPayload.reporting_period_end,
            reporting_period_inferred: contextPayload.reporting_period_inferred,
          },
          assistant_scope: {
            ...(meta?.assistant_scope || {}),
            scrubber_meta: scrubbed.meta || {},
            access_level: contextPayload.access_level,
            allowed_home_ids: contextPayload.allowed_home_ids,
            provider_id: contextPayload.provider_id,
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
        updateLastAssistantStreamingText(restored || "Thinking…");
      },
      onDone: (streamedPayload) => {
        const safeValue =
          extractStreamText(streamedPayload) || "No assistant reply returned.";

        const restored = restoreAssistantReplyTokens(
          safeValue.trim(),
          scrubbed.reverseMap
        );

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
        }

        replaceLastAssistantPlaceholder(
          restored || "No assistant reply returned."
        );
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
    state.assistantMeta = createAssistantMeta();
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
      if (actionId) handleQuickAction(actionId);
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

  ensureAssistantMessageLists();

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
    if (els.assistantInput) els.assistantInput.value = "";
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) els.assistantModalInput.value = "";
    await askAssistant(question);
  });

  bindPromptButtons();
}

export function loadAssistant() {
  ensureAssistantMessageLists();
  updateAssistantContext();
  syncAssistantUi();
}

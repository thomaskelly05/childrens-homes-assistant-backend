import { state, createAssistantMeta } from "../state.js";
import { els } from "../dom.js";
import { apiStreamAssistant } from "../core/api.js";
import * as aiScrubber from "../core/ai-scrubber.js";
import { askAssistantBrain } from "../assistant/brain.js";
import {
  refreshAssistantUi,
  appendAssistantSystemMessage,
  appendAssistantUserMessage,
  clearAssistantMessages as clearAssistantUiMessages,
} from "./assistant-ui.js";
import {
  assistantPromptsForView,
  buildRoleAwareGreeting,
  buildUnknownIntentPrompt,
  ASSISTANT_INTENT,
  detectAssistantIntent,
  detectAssistantResponseMode,
  detectOutputMode,
  detectRetrievalMode,
  ensureAssistantState,
  extractStreamText,
  getAllowedHomeIds,
  getAssistantTypeForScope,
  getCurrentScope,
  getCurrentSection,
  getFullYoungPersonName,
  getHomeName,
  trimForOutbound,
  cloneAssistantMessage,
  mergeAssistantMeta,
  resolveReg45DateRange,
} from "../assistant/helpers.js";
import {
  resolveAssistantScopeType,
  resolveAccessLevelForScope,
  normaliseScope,
  isProviderWideScope,
} from "../core/assistant-context.js";

let assistantEventsBound = false;
let assistantPromptDelegatesBound = false;
let activeAssistantRequestId = 0;

const MAX_UI_PROMPTS = 8;

function qs(id) {
  return document.getElementById(id);
}

function getSelectedYoungPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getAssistantScopeType() {
  return resolveAssistantScopeType({
    scope: getCurrentScope(),
    youngPersonId: state.youngPersonId,
  });
}

function ensureAssistantMetaState() {
  ensureAssistantState();

  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = createAssistantMeta();
  }

  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }
}

function syncAssistantUi() {
  ensureAssistantMetaState();
  refreshAssistantUi();
}

function setAssistantSending(flag) {
  state.assistantSending = Boolean(flag);
  syncAssistantUi();
}

function getRequestSnapshot() {
  return {
    scope: getCurrentScope(),
    section: getCurrentSection(),
    youngPersonId: state.youngPersonId || null,
    homeId: state.homeId || null,
    providerId: state.providerId || null,
  };
}

function snapshotMatches(snapshot = {}) {
  return (
    snapshot.scope === getCurrentScope() &&
    snapshot.section === getCurrentSection() &&
    snapshot.youngPersonId === (state.youngPersonId || null) &&
    snapshot.homeId === (state.homeId || null) &&
    snapshot.providerId === (state.providerId || null)
  );
}

function replaceLastAssistantPlaceholder(text) {
  const safeValue =
    typeof text === "string"
      ? text
      : extractStreamText(text) || "No assistant reply returned.";

  const lists = [state.assistantMessages || [], state.assistantModalMessages || []];

  lists.forEach((list) => {
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
      last.status = "complete";
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

function updateLastAssistantStreamingText(text) {
  const safeValue =
    typeof text === "string" ? text : extractStreamText(text) || "Thinking…";

  const lists = [state.assistantMessages || [], state.assistantModalMessages || []];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last?.role === "assistant" && last?._streaming) {
      last.content = safeValue;
      last.status = "streaming";
    }
  });

  syncAssistantUi();
}

function addAssistantPlaceholder(intent = null) {
  ensureAssistantMetaState();

  const entry = cloneAssistantMessage({
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
    status: "streaming",
    intent,
    scope_snapshot: {
      scope: getCurrentScope(),
      section: getCurrentSection(),
      young_person_id: state.youngPersonId || null,
      home_id: state.homeId || null,
    },
  });

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(cloneAssistantMessage(entry));
  syncAssistantUi();
}

function buildAssistantContextPayload(message = "") {
  const person = getSelectedYoungPerson() || {};
  const scope = getCurrentScope();
  const section = getCurrentSection();
  const intent = detectAssistantIntent(message);
  const retrievalMode = detectRetrievalMode(message, intent);
  const outputMode = detectOutputMode(intent, message);

  const accessLevel = resolveAccessLevelForScope({
    scope,
    role: state.userRole || "staff",
  });

  const assistantType = getAssistantTypeForScope(scope);
  const reg45Range = resolveReg45DateRange(message);

  const reportingPeriodStart = reg45Range?.startDate
    ? reg45Range.startDate.toISOString()
    : null;

  const reportingPeriodEnd = reg45Range?.endDate
    ? reg45Range.endDate.toISOString()
    : null;

  const reportingPeriodInferred =
    reg45Range && typeof reg45Range.inferred === "boolean"
      ? reg45Range.inferred
      : null;

  const allowedHomeIds =
    isProviderWideScope(scope) && accessLevel === "provider"
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
      person.homeId ||
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
    retrieval_mode: retrievalMode,
    output_mode: outputMode,
    whole_os_default: true,
    section_only_requested: retrievalMode === "section_only",
    use_whole_scope_records: retrievalMode !== "section_only",
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
      intent === ASSISTANT_INTENT.compliance ||
      scope === "quality" ||
      scope === "ofsted" ||
      scope === "reports",
    reporting_period_start: reportingPeriodStart,
    reporting_period_end: reportingPeriodEnd,
    reporting_period_inferred: reportingPeriodInferred,
    local_bundle_evidence_count:
      state.assistantMeta?.evidence_count ||
      state.assistantMeta?.brain_summary?.total ||
      0,
    local_bundle_last_updated:
      state.assistantMeta?.last_updated ||
      state.assistantMeta?.last_analysis_at ||
      null,
    local_confidence: state.assistantMeta?.confidence || null,
    suggested_prompts_ui_only: assistantPromptsForView(section, scope).slice(
      0,
      MAX_UI_PROMPTS
    ),
  };
}

function buildSafeAssistantRequestPayload(payload) {
  const context = payload?.context || {};
  const scope = String(context.scope || "child").toLowerCase();

  const baseContext = {
    scope,
    home_id: context.home_id || null,
    home_name: context.home_name || null,
    current_view: context.current_view || null,
    current_section: context.current_section || null,
    shift_context: context.shift_context || null,
    composer_record_type: context.composer_record_type || null,
    record_type: context.record_type || null,
    record_id: context.record_id || null,
    start_date: context.start_date || context.reporting_period_start || null,
    end_date: context.end_date || context.reporting_period_end || null,
    reporting_period_start:
      context.reporting_period_start || context.start_date || null,
    reporting_period_end:
      context.reporting_period_end || context.end_date || null,
    reporting_period_inferred:
      typeof context.reporting_period_inferred === "boolean"
        ? context.reporting_period_inferred
        : null,
  };

  let scopedContext = {};

  if (scope === "home") {
    scopedContext = {
      ...baseContext,
      scope: "home",
      access_level: context.access_level || null,
      allowed_home_ids: Array.isArray(context.allowed_home_ids)
        ? context.allowed_home_ids
        : [],
      provider_id: context.provider_id || null,
    };
  } else if (scope === "quality" || scope === "ofsted") {
    scopedContext = {
      ...baseContext,
      scope: "quality",
      access_level: context.access_level || null,
      allowed_home_ids: Array.isArray(context.allowed_home_ids)
        ? context.allowed_home_ids
        : [],
      provider_id: context.provider_id || null,
    };
  } else {
    scopedContext = {
      ...baseContext,
      scope: "young_person",
      home_name: context.home_name || null,
      young_person_id: context.young_person_id || null,
      young_person_name: context.young_person_name || null,
      placement_status: context.placement_status || null,
      summary_risk_level: context.summary_risk_level || null,
    };
    delete scopedContext.home_id;
  }

  return {
    message: trimForOutbound(payload?.message || ""),
    response_mode: payload?.response_mode || "balanced",
    context: scopedContext,
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
          typeof scrubber.reverseMap === "function" ? scrubber.reverseMap() : {},
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
  mergeAssistantMeta({
    ...meta,
    sources: Array.isArray(meta.sources) ? meta.sources : undefined,
    top_sources: Array.isArray(meta.top_sources) ? meta.top_sources : undefined,
    suggested_actions: Array.isArray(meta.suggested_actions)
      ? meta.suggested_actions
      : undefined,
    last_analysis_at: new Date().toISOString(),
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

function buildLocalBrainContext(contextPayload = {}) {
  return {
    scope: contextPayload.scope,
    young_person_name: contextPayload.young_person_name,
    home_name: contextPayload.home_name,
    placement_status: contextPayload.placement_status,
    summary_risk_level: contextPayload.summary_risk_level,
    person: {
      name: contextPayload.young_person_name,
      placement_status: contextPayload.placement_status,
      risk: contextPayload.summary_risk_level,
    },
    home: {
      home_name: contextPayload.home_name,
    },
    analysis_lens:
      contextPayload.output_mode ||
      contextPayload.assistant_intent ||
      "general",
  };
}

function getBestLocalAssistantPayload() {
  return (
    state.assistantScopeBundle ||
    state.assistantBundle ||
    state.assistantDerivedState?.evidence ||
    state.assistantEvidence ||
    {}
  );
}

function answerWithLocalBrain(question, contextPayload = {}, error = null) {
  const brain = askAssistantBrain(question, getBestLocalAssistantPayload(), {
    context: buildLocalBrainContext(contextPayload),
    analysis_lens:
      contextPayload.scope === "quality" || contextPayload.scope === "ofsted"
        ? "quality"
        : contextPayload.scope === "home"
          ? "manager"
          : "general",
  });

  applyAssistantMeta({
    sources: brain.top_sources || [],
    top_sources: brain.top_sources || [],
    suggested_actions: brain.suggested_actions || [],
    brain_summary: brain.summary || null,
    brain_insights: brain.insights || [],
    evidence_count: brain.evidence_count || 0,
    confidence: brain.confidence || "low",
    confidence_reason: brain.confidence_reason || "",
    runtime: {
      local_brain_fallback: true,
      original_error: error?.message || null,
      evidence_count: brain.evidence_count || 0,
      output_mode: brain.intent || "local",
      analysis_lens: brain.analysis_lens || "general",
    },
    explainability: {
      reasoning_summary:
        "This response was generated locally from the currently scoped IndiCare evidence because the streamed assistant was unavailable.",
    },
  });

  return brain.answer;
}

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();

  if (!trimmed || state.assistantSending) return;

  ensureAssistantMetaState();

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

  const requestId = ++activeAssistantRequestId;
  const requestSnapshot = getRequestSnapshot();

  appendAssistantUserMessage(trimmed);
  addAssistantPlaceholder(intent);
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
        if (requestId !== activeAssistantRequestId || !snapshotMatches(requestSnapshot)) return;

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
            local_bundle_evidence_count:
              contextPayload.local_bundle_evidence_count || 0,
            local_bundle_last_updated:
              contextPayload.local_bundle_last_updated || null,
          },
          explainability: {
            ...(meta?.explainability || {}),
            reasoning_summary:
              meta?.explainability?.reasoning_summary ||
              "This answer used an evidence-led children’s home reasoning approach.",
            ai_scrubber: scrubbed.meta?.enabled
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
            access_level: contextPayload.access_level,
            allowed_home_ids: contextPayload.allowed_home_ids,
            provider_id: contextPayload.provider_id,
            scrubber_meta: scrubbed.meta || {},
          },
          sources: meta?.sources || [],
          suggested_actions: meta?.suggested_actions || [],
        });
      },
      onProgress: () => {},
      onMessage: (streamedPayload) => {
        if (requestId !== activeAssistantRequestId || !snapshotMatches(requestSnapshot)) return;

        const safeValue = extractStreamText(streamedPayload) || "Thinking…";
        const restored = restoreAssistantReplyTokens(
          safeValue,
          scrubbed.reverseMap
        );

        updateLastAssistantStreamingText(restored || "Thinking…");
      },
      onDone: (streamedPayload) => {
        if (requestId !== activeAssistantRequestId || !snapshotMatches(requestSnapshot)) {
          replaceLastAssistantPlaceholder(
            "The assistant context changed while this answer was being generated. Please ask again in the current view."
          );
          return;
        }

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
            sources: streamedPayload.sources || [],
            runtime: streamedPayload.runtime || {},
            explainability: streamedPayload.explainability || {},
            assistant_scope: streamedPayload.assistant_scope || {},
            assistant_context: streamedPayload.assistant_context || {},
            suggested_actions: streamedPayload.suggested_actions || [],
          });
        }

        replaceLastAssistantPlaceholder(
          restored || "No assistant reply returned."
        );
      },
    });
  } catch (error) {
    console.error("[assistant] streamed answer failed; using local brain fallback", error);

    const contextPayload = buildAssistantContextPayload(trimmed);
    const localAnswer = answerWithLocalBrain(trimmed, contextPayload, error);

    replaceLastAssistantPlaceholder(
      localAnswer || error?.message || "The assistant could not answer right now."
    );
  } finally {
    if (requestId === activeAssistantRequestId) {
      setAssistantSending(false);
      syncAssistantUi();
    }
  }
}

export function openAssistant() {
  ensureAssistantMetaState();
  updateAssistantContext();
  state.assistantOpen = true;
  syncAssistantUi();
}

export function closeAssistant() {
  state.assistantOpen = false;
  syncAssistantUi();
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  state.assistantMeta = createAssistantMeta();

  clearAssistantUiMessages?.();
  syncAssistantUi();
}

function handleQuickAction(actionId = "") {
  const id = String(actionId || "").trim();
  if (!id) return;

  const router = typeof window !== "undefined" ? window.handleQuickAction : null;

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

export function updateAssistantContext() {
  ensureAssistantMetaState();

  const scope = normaliseScope(getCurrentScope(), "child");
  const section = getCurrentSection();

  const accessLevel = resolveAccessLevelForScope({
    scope,
    role: state.userRole || "staff",
  });

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
      : scope === "home" || scope === "staffing"
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

  state.assistantContext = contextSummary.summary;
  syncAssistantUi();
}

export function renderAssistantMessages() {
  ensureAssistantMetaState();
  syncAssistantUi();
}

export function renderAssistantInsights() {
  ensureAssistantMetaState();
  syncAssistantUi();
}

export function bindAssistantEvents() {
  if (assistantEventsBound) return;
  assistantEventsBound = true;

  ensureAssistantMetaState();

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

  const modalForm = qs("assistantModalForm");
  const modalInput = qs("assistantModalInput");

  modalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = modalInput?.value || "";
    if (modalInput) {
      modalInput.value = "";
    }
    await askAssistant(question);
  });

  bindPromptButtons();
}

export function loadAssistant() {
  ensureAssistantMetaState();
  updateAssistantContext();
  syncAssistantUi();
}

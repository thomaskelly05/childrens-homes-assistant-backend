import { state, createAssistantMeta } from "../state.js";
import { getDisplayName } from "../core/utils.js";
import { getSectionTitle, getSectionSubtitle } from "../core/config.js";
import {
  inferAssistantAnalysisLens,
  isProviderWideScope,
  resolveAccessLevelForScope,
  resolveAssistantScopeType,
  resolveAssistantTypeForScope,
} from "../core/assistant-context.js";

export const ASSISTANT_INTENT = {
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

export const MAX_SAFE_MESSAGE_LENGTH = 3000;
export const MAX_SOURCE_ITEMS = 12;
export const MAX_SOURCE_EXCERPT = 240;
export const MAX_UI_PROMPTS = 8;

export const RECORD_LINK_REGEX =
  /\b(incident|record|note|task|document|report|chronology|entry)\s+(number\s+)?(#?\d+)\b/gi;

export function qs(id) {
  return document.getElementById(id);
}

export function resolveEl(...candidates) {
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

export function ensureAssistantState() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }

  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = createAssistantMeta();
  }

  if (!Array.isArray(state.assistantMeta.sources)) {
    state.assistantMeta.sources = [];
  }

  if (!Array.isArray(state.assistantMeta.suggested_actions)) {
    state.assistantMeta.suggested_actions = [];
  }

  if (!Array.isArray(state.assistantMeta.secondary_intents)) {
    state.assistantMeta.secondary_intents = [];
  }

  if (!Array.isArray(state.assistantMeta.chronology)) {
    state.assistantMeta.chronology = [];
  }

  state.assistantMeta.runtime = state.assistantMeta.runtime || {};
  state.assistantMeta.explainability = state.assistantMeta.explainability || {};
  state.assistantMeta.assistant_scope =
    state.assistantMeta.assistant_scope || {};
  state.assistantMeta.assistant_context =
    state.assistantMeta.assistant_context || {};
  state.assistantMeta.facts = state.assistantMeta.facts || {};
  state.assistantMeta.care_domains = state.assistantMeta.care_domains || {};
  state.assistantMeta.evidence_summary =
    state.assistantMeta.evidence_summary || {};
  state.assistantMeta.evidence_sufficiency =
    state.assistantMeta.evidence_sufficiency || {};
  state.assistantMeta.scrubber_meta = state.assistantMeta.scrubber_meta || {};
  state.assistantMeta.scrubber_reverse_map =
    state.assistantMeta.scrubber_reverse_map || {};

  if (!("live_summary" in state.assistantMeta)) {
    state.assistantMeta.live_summary = null;
  }

  if (!("assistant_insight_pack" in state.assistantMeta)) {
    state.assistantMeta.assistant_insight_pack = null;
  }
}

export function getAssistantMeta() {
  ensureAssistantState();
  return state.assistantMeta;
}

export function mergeAssistantMeta(nextMeta = {}) {
  ensureAssistantState();

  const previous = state.assistantMeta || createAssistantMeta();

  state.assistantMeta = {
    ...previous,

    intent:
      nextMeta.intent !== undefined ? nextMeta.intent : previous.intent || null,

    secondary_intents: Array.isArray(nextMeta.secondary_intents)
      ? nextMeta.secondary_intents
      : previous.secondary_intents || [],

    retrieval_mode:
      nextMeta.retrieval_mode || previous.retrieval_mode || "whole_scope",

    output_mode: nextMeta.output_mode || previous.output_mode || "answer",

    sources: Array.isArray(nextMeta.sources)
      ? nextMeta.sources
      : previous.sources || [],

    runtime:
      nextMeta.runtime && typeof nextMeta.runtime === "object"
        ? { ...(previous.runtime || {}), ...nextMeta.runtime }
        : previous.runtime || {},

    explainability:
      nextMeta.explainability && typeof nextMeta.explainability === "object"
        ? { ...(previous.explainability || {}), ...nextMeta.explainability }
        : previous.explainability || {},

    assistant_scope:
      nextMeta.assistant_scope && typeof nextMeta.assistant_scope === "object"
        ? { ...(previous.assistant_scope || {}), ...nextMeta.assistant_scope }
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

    scrubber_enabled:
      typeof nextMeta.scrubber_enabled === "boolean"
        ? nextMeta.scrubber_enabled
        : Boolean(previous.scrubber_enabled),

    scrubber_meta:
      nextMeta.scrubber_meta && typeof nextMeta.scrubber_meta === "object"
        ? { ...(previous.scrubber_meta || {}), ...nextMeta.scrubber_meta }
        : previous.scrubber_meta || {},

    chronology: Array.isArray(nextMeta.chronology)
      ? nextMeta.chronology
      : previous.chronology || [],

    facts:
      nextMeta.facts && typeof nextMeta.facts === "object"
        ? { ...(previous.facts || {}), ...nextMeta.facts }
        : previous.facts || {},

    care_domains:
      nextMeta.care_domains && typeof nextMeta.care_domains === "object"
        ? { ...(previous.care_domains || {}), ...nextMeta.care_domains }
        : previous.care_domains || {},

    evidence_summary:
      nextMeta.evidence_summary && typeof nextMeta.evidence_summary === "object"
        ? {
            ...(previous.evidence_summary || {}),
            ...nextMeta.evidence_summary,
          }
        : previous.evidence_summary || {},

    evidence_sufficiency:
      nextMeta.evidence_sufficiency &&
      typeof nextMeta.evidence_sufficiency === "object"
        ? {
            ...(previous.evidence_sufficiency || {}),
            ...nextMeta.evidence_sufficiency,
          }
        : previous.evidence_sufficiency || {},

    live_summary:
      nextMeta.live_summary !== undefined
        ? nextMeta.live_summary
        : previous.live_summary || null,

    assistant_insight_pack:
      nextMeta.assistant_insight_pack !== undefined
        ? nextMeta.assistant_insight_pack
        : previous.assistant_insight_pack || null,

    last_analysis_at:
      nextMeta.last_analysis_at || previous.last_analysis_at || null,

    last_bundle_refresh_at:
      nextMeta.last_bundle_refresh_at ||
      previous.last_bundle_refresh_at ||
      null,
  };
}

export function getCurrentPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

export function getCurrentScope() {
  return state.currentScope || "child";
}

export function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

export function getSelectedYoungPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

export function getFullYoungPersonName() {
  const person = getSelectedYoungPerson() || {};

  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    person.full_name ||
    person.name ||
    "Young person"
  );
}

export function getPersonLabel() {
  const person = getCurrentPerson();
  return getDisplayName(person || {}) || "Child";
}

export function getHomeLabel() {
  const person = getCurrentPerson() || {};
  return (
    person.home_name ||
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
}

export function getHomeName() {
  return getHomeLabel();
}

export function getAllowedHomeIds() {
  return Array.isArray(state.allowedHomeIds)
    ? [...new Set(
        state.allowedHomeIds
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item) && item > 0)
      )]
    : [];
}

export function getAccessLevelForScope(scope = getCurrentScope()) {
  return resolveAccessLevelForScope({
    scope,
    role: state.userRole || "staff",
  });
}

export function getAssistantScopeType() {
  return resolveAssistantScopeType({
    scope: getCurrentScope(),
    youngPersonId: state.youngPersonId,
  });
}

export function getAssistantTypeForScope(scope = getCurrentScope()) {
  return resolveAssistantTypeForScope(scope);
}

export function getScopeLabel() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home assistant";
  if (scope === "reports") return "Reporting assistant";
  if (scope === "ofsted") return "Ofsted assistant";
  if (scope === "quality") return "Quality assistant";
  return "Child assistant";
}

export function getReadableSectionLabel() {
  return getSectionTitle(getCurrentSection()) || "Workspace";
}

export function getReadableSectionSubtitle() {
  return getSectionSubtitle(getCurrentSection()) || "";
}

export function inferAnalysisLens({
  scope = getCurrentScope(),
  section = getCurrentSection(),
  role = state.userRole || "staff",
  intent = ASSISTANT_INTENT.summary,
} = {}) {
  return inferAssistantAnalysisLens({
    scope,
    section,
    role,
    intent,
  });
}

export function extractAssistantContent(message = {}) {
  if (typeof message === "string") return message;
  if (!message || typeof message !== "object") return "";

  const directCandidates = [
    message.content,
    message.text,
    message.message,
    message.response,
    message.answer,
    message.output,
    message.accumulated_text,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  if (message.content && typeof message.content === "object") {
    const content = message.content;
    const nestedCandidates = [
      content.text,
      content.message,
      content.response,
      content.answer,
      content.output,
      content.content,
      content.accumulated_text,
    ];

    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    if (Array.isArray(content.parts)) {
      const joined = content.parts
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

  if (Array.isArray(message.parts)) {
    const joined = message.parts
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

export function extractStreamText(payload) {
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

export function cloneAssistantMessage(entry = {}) {
  return {
    id:
      entry.id ||
      `assistant-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: entry.role || "assistant",
    content:
      typeof entry.content === "string"
        ? entry.content
        : extractStreamText(entry.content || ""),
    created_at: entry.created_at || new Date().toISOString(),
    status: entry.status || (entry._streaming ? "streaming" : "complete"),
    intent: entry.intent || null,
    citations: Array.isArray(entry.citations) ? entry.citations : [],
    actions: Array.isArray(entry.actions) ? entry.actions : [],
    scope_snapshot:
      entry.scope_snapshot && typeof entry.scope_snapshot === "object"
        ? entry.scope_snapshot
        : null,
    _streaming: Boolean(entry._streaming),
  };
}

export function isGreeting(text = "") {
  return /^(hi|hello|hey|hiya|morning|good morning|afternoon|good afternoon|evening|good evening)\b/i.test(
    String(text || "").trim()
  );
}

export function detectAssistantIntent(text = "") {
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
    /when was|what date|dates|last incident|last missing|next appointment|how many|overdue|due soon|upcoming|latest/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.factual_lookup;
  }

  if (/handover|next shift|shift brief|morning brief/.test(value)) {
    return ASSISTANT_INTENT.handover;
  }

  if (/draft|write|reword|rewrite|wording|improve this/.test(value)) {
    return ASSISTANT_INTENT.drafting;
  }

  if (
    /compliance|ofsted|supervision|training|statutory|audit|reg\s*40|reg\s*44|quality standards|inspection risk|scrutiny|sccif/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.compliance;
  }

  if (
    /risk|safeguarding|harm|trigger|protective factor|missing from care|missing episode/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.risk;
  }

  if (
    /quality|ri|inspection|governance|provider|home compare|compare homes|all homes/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.quality;
  }

  if (/manager|oversight|leadership|escalation|registered manager/.test(value)) {
    return ASSISTANT_INTENT.management;
  }

  if (
    /summary|summarise|summarize|what matters|overview|lived experience|key work|keywork/.test(
      value
    )
  ) {
    return ASSISTANT_INTENT.summary;
  }

  return ASSISTANT_INTENT.unknown;
}

export function detectAssistantIntents(text = "") {
  const value = String(text || "").trim().toLowerCase();
  const intents = [];

  if (!value) {
    return {
      primary_intent: ASSISTANT_INTENT.unknown,
      secondary_intents: [],
    };
  }

  if (isGreeting(value)) {
    return {
      primary_intent: ASSISTANT_INTENT.greeting,
      secondary_intents: [],
    };
  }

  const checks = [
    [
      ASSISTANT_INTENT.review,
      /reg\s*45|regulation\s*45|qa full summary|full summary|comprehensive summary|full review|period review|six month|6 month|twelve month|12 month/,
    ],
    [
      ASSISTANT_INTENT.chronology,
      /chronology|timeline|what happened|history|in date order|events over time/,
    ],
    [
      ASSISTANT_INTENT.factual_lookup,
      /when was|what date|dates|last incident|last missing|next appointment|how many|overdue|due soon|upcoming|latest/,
    ],
    [ASSISTANT_INTENT.handover, /handover|next shift|shift brief|morning brief/],
    [ASSISTANT_INTENT.drafting, /draft|write|reword|rewrite|wording|improve this/],
    [
      ASSISTANT_INTENT.compliance,
      /compliance|ofsted|supervision|training|statutory|audit|reg\s*40|reg\s*44|quality standards|inspection risk|scrutiny|sccif/,
    ],
    [
      ASSISTANT_INTENT.risk,
      /risk|safeguarding|harm|trigger|protective factor|missing from care|missing episode/,
    ],
    [
      ASSISTANT_INTENT.quality,
      /quality|ri|inspection|governance|provider|home compare|compare homes|all homes/,
    ],
    [
      ASSISTANT_INTENT.management,
      /manager|oversight|leadership|escalation|registered manager/,
    ],
    [
      ASSISTANT_INTENT.summary,
      /summary|summarise|summarize|what matters|overview|lived experience|key work|keywork/,
    ],
  ];

  for (const [intent, regex] of checks) {
    if (regex.test(value)) intents.push(intent);
  }

  if (!intents.length) {
    intents.push(ASSISTANT_INTENT.unknown);
  }

  const uniqueIntents = [...new Set(intents)];

  return {
    primary_intent: uniqueIntents[0],
    secondary_intents: uniqueIntents.slice(1),
  };
}

export function detectRetrievalMode(
  text = "",
  intent = ASSISTANT_INTENT.unknown
) {
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

export function detectOutputMode(
  intent = ASSISTANT_INTENT.unknown,
  text = ""
) {
  const value = String(text || "").toLowerCase();

  if (/reg\s*45|regulation\s*45/.test(value)) {
    return "children_home_reg45_template";
  }

  if (/handover|next shift|morning brief|shift brief/.test(value)) {
    return "children_home_handover_template";
  }

  if (/manager brief|manager summary|leadership brief/.test(value)) {
    return "children_home_manager_brief_template";
  }

  if (
    /quality brief|quality summary|Inspection evidence preparation|ri summary|scrutiny/.test(
      value
    )
  ) {
    return "children_home_quality_brief_template";
  }

  if (/chronology|timeline/.test(value)) {
    return "children_home_chronology_template";
  }

  if (/full summary|comprehensive summary|overview/.test(value)) {
    return "children_home_summary_template";
  }

  if (intent === ASSISTANT_INTENT.factual_lookup) return "factual_answer";
  if (intent === ASSISTANT_INTENT.summary) return "summary";
  if (intent === ASSISTANT_INTENT.chronology) return "chronology";
  if (intent === ASSISTANT_INTENT.review) return "review_pack";
  if (intent === ASSISTANT_INTENT.handover) return "handover";
  if (intent === ASSISTANT_INTENT.compliance) return "compliance_brief";
  if (intent === ASSISTANT_INTENT.management) return "management_brief";
  if (intent === ASSISTANT_INTENT.quality) return "quality_brief";
  if (intent === ASSISTANT_INTENT.drafting) return "drafting";

  return "answer";
}

export function detectAssistantResponseMode(text = "") {
  return /6 month|six month|12 month|twelve month|summary|timeline|chronology|review|report|audit|compliance|ofsted|ri|full summary|reg 45|regulation 45/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

export function resolveRelativeMonthRange(months = 6) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return { startDate: start, endDate: end, inferred: true };
}

export function resolveExplicitDateRange(text = "") {
  const value = String(text || "").trim();
  const matches =
    value.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g) || [];

  if (matches.length < 2) return null;

  const parseDate = (raw) => {
    const parts = raw.split(/[./-]/).map((item) => item.trim());
    if (parts.length !== 3) return null;

    let [day, month, year] = parts.map(Number);
    if (
      !Number.isFinite(day) ||
      !Number.isFinite(month) ||
      !Number.isFinite(year)
    ) {
      return null;
    }

    if (year < 100) year += 2000;

    const result = new Date(year, month - 1, day);
    if (Number.isNaN(result.getTime())) return null;
    return result;
  };

  const startDate = parseDate(matches[0]);
  const endDate = parseDate(matches[1]);

  if (!startDate || !endDate) return null;

  return { startDate, endDate, inferred: false };
}

export function resolveReg45DateRange(message = "") {
  const text = String(message || "").toLowerCase().trim();

  const explicit = resolveExplicitDateRange(text);
  if (explicit) return explicit;

  if (
    /last\s+6\s+months|past\s+6\s+months|previous\s+6\s+months|six\s+months|6\s+months/.test(
      text
    )
  ) {
    return resolveRelativeMonthRange(6);
  }

  if (
    /last\s+12\s+months|past\s+12\s+months|previous\s+12\s+months|twelve\s+months|12\s+months/.test(
      text
    )
  ) {
    return resolveRelativeMonthRange(12);
  }

  return null;
}

export function getDefaultReg45DateRange() {
  return resolveRelativeMonthRange(6);
}

export function trimForOutbound(value = "", max = MAX_SAFE_MESSAGE_LENGTH) {
  return String(value || "").trim().slice(0, max);
}

export function sourceCitationRef(source = {}, index = 0) {
  if (source.citation_ref) return String(source.citation_ref);
  const type = source.record_type || source.type || "record";
  const id = source.record_id || source.id || `idx_${index + 1}`;
  return `${type}:${id}`;
}

export function buildCitationRef(source = {}, index = 0) {
  return sourceCitationRef(source, index);
}

export function sourceSafeDomId(ref = "") {
  return `assistant-source-${String(ref).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function dedupeSources(sources = []) {
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

export function sanitiseSourcesForUi(sources = []) {
  return dedupeSources(sources)
    .slice(0, MAX_SOURCE_ITEMS)
    .map((source, index) => ({
      type: source.type || source.record_type || "record",
      label: String(source.label || source.title || source.document_title || "Record"),
      title: String(source.title || source.label || source.document_title || "Record"),
      excerpt: String(
        source.excerpt || source.summary || source.description || ""
      ).slice(0, MAX_SOURCE_EXCERPT),
      description: String(
        source.description || source.summary || source.excerpt || ""
      ).slice(0, MAX_SOURCE_EXCERPT),
      section: source.section || "",
      record_type: source.record_type || source.type || null,
      record_id: source.record_id || source.id || null,
      citation_ref: source.citation_ref || buildCitationRef(source, index),
      url: source.url || null,
      created_at: source.created_at || source.date || null,
      evidence_kind: source.evidence_kind || "direct",
    }));
}

export function getSources() {
  const meta = getAssistantMeta();
  return Array.isArray(meta.sources) ? meta.sources : [];
}

export function buildSourceMap() {
  const map = new Map();

  getSources().forEach((source, index) => {
    const citationRef = sourceCitationRef(source, index);
    map.set(citationRef.toLowerCase(), {
      ...source,
      citation_ref: citationRef,
      source_index: index,
    });
  });

  return map;
}

export function buildRecordLookupMap() {
  const map = new Map();

  getSources().forEach((source, index) => {
    const recordId =
      source?.record_id ||
      source?.id ||
      source?.source_id ||
      source?.linked_record_id ||
      null;

    if (!recordId) return;

    map.set(String(recordId), {
      ...source,
      citation_ref: sourceCitationRef(source, index),
    });
  });

  return map;
}

export function getSourcesSafe() {
  ensureAssistantState();
  return Array.isArray(state.assistantMeta?.sources)
    ? state.assistantMeta.sources
    : [];
}

export function buildRoleAwareGreeting() {
  const scope = getCurrentScope();
  const accessLevel = getAccessLevelForScope(scope);

  if (scope === "child") {
    return `Hello. What would you like to know about ${getFullYoungPersonName()}? I can help with a full summary, chronology, dates, risks, appointments, family contact themes, handover thinking, and evidence-led children’s home support.`;
  }

  if (scope === "home") {
    return `Hello. What would you like to know about ${getHomeName()}? I can help with a full home summary, chronology, staffing, compliance, Inspection evidence preparation, management oversight, or next actions.`;
  }

  return `Hello. What would you like to know about ${
    accessLevel === "provider"
      ? "your homes and provider oversight"
      : `${getHomeName()} quality and oversight`
  }? I can help with compliance themes, chronology, Inspection evidence preparation, RI summaries, governance patterns and cross-home comparisons where allowed.`;
}

export function buildUnknownIntentPrompt() {
  const scope = getCurrentScope();
  const accessLevel = getAccessLevelForScope(scope);

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
      accessLevel === "provider"
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

export function assistantPromptsForView(view, scope = getCurrentScope()) {
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
    quality: [
      "Summarise the current quality picture for the home.",
      "What are the biggest Inspection evidence preparation risks?",
      "What actions should be prioritised before scrutiny?",
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
      : isProviderWideScope(scope)
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

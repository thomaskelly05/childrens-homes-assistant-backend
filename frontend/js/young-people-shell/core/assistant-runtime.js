import {
  state,
  setAssistantDerivedState,
  setAssistantScopeBundle,
  setAssistantScopeBundleError,
  setAssistantScopeBundleLoading,
} from "../state.js";
import { fetchAssistantScopeBundle, apiStreamAssistant } from "../core/api.js";
import {
  buildAssistantEvidenceSet,
  mapReadinessEvidence,
  mapManagerReviewEvidence,
  toAssistantEvidence,
} from "./adapters.js";
import {
  ASSISTANT_INTENT,
  getCurrentScope,
  getCurrentSection,
  getSelectedYoungPerson,
  getHomeName,
  getAllowedHomeIds,
  getAccessLevelForScope,
  detectAssistantIntent as detectIntentFromHelpers,
  detectAssistantIntents,
  detectRetrievalMode as detectRetrievalModeFromHelpers,
  detectOutputMode as detectOutputModeFromHelpers,
} from "../assistant/helpers.js";
import {
  inferAssistantAnalysisLens,
  isProviderWideScope,
  normaliseScope,
  normaliseSection,
} from "./assistant-context.js";
import {
  cleanText,
  arrayify,
  unique,
  parseDateValue,
  daysFromNow,
  isDueSoon,
  normaliseToken,
} from "./helpers.js";

const RETRIEVAL_MODE = {
  whole_scope: "whole_scope",
  section_only: "section_only",
  period_only: "period_only",
  focused_records: "focused_records",
};

const OUTPUT_MODE = {
  answer: "answer",
  factual_answer: "factual_answer",
  summary: "summary",
  chronology: "chronology",
  review_pack: "review_pack",
  handover: "handover",
  compliance_brief: "compliance_brief",
  management_brief: "management_brief",
  quality_brief: "quality_brief",
  morning_brief: "morning_brief",
  drafting: "drafting",

  children_home_summary_template: "children_home_summary_template",
  children_home_chronology_template: "children_home_chronology_template",
  children_home_handover_template: "children_home_handover_template",
  children_home_manager_brief_template: "children_home_manager_brief_template",
  children_home_quality_brief_template: "children_home_quality_brief_template",
  children_home_reg45_template: "children_home_reg45_template",
};

const MAX_SOURCE_ITEMS = 8;
const MAX_API_EVIDENCE_ITEMS = 40;
const MAX_API_CHRONOLOGY_ITEMS = 30;
const MAX_API_SUMMARY_EXCERPT = 280;
const MAX_LOCAL_ACTIONS = 30;

function makeActionId(parts = []) {
  return parts
    .map((item) => normaliseToken(item))
    .filter(Boolean)
    .join(":");
}

function buildCitationRef(item = {}) {
  const recordType = item.record_type || "record";
  const recordId = item.source_id || item.id || item.record_id || "unknown";
  return `${recordType}:${recordId}`;
}

function getScopeLabel(scope) {
  return normaliseScope(scope, "child");
}

function getSectionLabel(section) {
  return normaliseSection(section, "workspace");
}

function getSelectedPersonSummary() {
  const person = getSelectedYoungPerson() || {};

  return {
    id: state.youngPersonId || null,
    name:
      person.full_name ||
      person.name ||
      [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
      person.preferred_name ||
      "Young person",
    preferred_name: person.preferred_name || "",
    home_name: person.home_name || "",
    risk: person.summary_risk_level || "",
    placement_status: person.placement_status || "",
  };
}

function getHomeSummary() {
  const user = state.currentUser || {};
  const person = getSelectedYoungPerson() || {};

  return {
    home_id:
      state.homeId ||
      user.home_id ||
      user.homeId ||
      person.home_id ||
      person.homeId ||
      null,
    home_name: getHomeName(),
  };
}

function inferAnalysisLens({
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

export function buildAssistantContext() {
  const scope = getScopeLabel(state.currentScope);
  const section = getSectionLabel(state.currentSection);
  const role = state.userRole || "staff";
  const person = getSelectedPersonSummary();
  const home = getHomeSummary();
  const accessLevel = getAccessLevelForScope(state.currentScope || "child");

  const inferredIntents = detectAssistantIntents(`${scope} ${section} ${role}`);
  const analysisLens = inferAnalysisLens({
    scope,
    section,
    role,
    intent: inferredIntents.primary_intent,
  });

  return {
    scope,
    section,
    role,
    access_level: accessLevel,
    analysis_lens: analysisLens,
    allowed_home_ids: getAllowedHomeIds(),
    person,
    home,
    active_record_type: state.activeRecordType || null,
    active_record_item: state.activeRecordItem || null,
    composer_record_type: state.composerRecordType || null,
    composer_record_id: state.composerRecordId || null,
  };
}

function detectAssistantIntent(message = "") {
  return detectIntentFromHelpers(message);
}

function detectRetrievalMode(message = "", intent = ASSISTANT_INTENT.unknown) {
  const fromHelpers = detectRetrievalModeFromHelpers(message, intent);

  if (fromHelpers === "section_only") return RETRIEVAL_MODE.section_only;
  if (intent === ASSISTANT_INTENT.factual_lookup) {
    return RETRIEVAL_MODE.focused_records;
  }

  return RETRIEVAL_MODE.whole_scope;
}

function detectOutputMode(intent = ASSISTANT_INTENT.unknown, message = "") {
  return detectOutputModeFromHelpers(intent, message);
}

function sectionGuidance(section, scope) {
  const map = {
    workspace:
      "Support adults through the shift with child-centred recording, safeguarding awareness, practical next steps and continuity of care.",
    overview:
      "Support with whole-picture summaries, current themes, risks, strengths, lived experience and planning.",
    profile:
      "Support with child-centred profile writing, identity, communication, health, formulation and what helps.",
    timeline:
      "Support with chronology, significant events, pattern analysis and triangulation across records.",
    handover:
      "Support with practical shift handover, what matters now, risks to hold in mind, actions and escalation.",
    health:
      "Support with health needs, appointments, outcomes, professionals, medication context and follow-up.",
    education:
      "Support with attendance, engagement, incidents, progress, barriers and educational planning.",
    family:
      "Support with family contact themes, emotional impact, presentation before and after contact, and follow-up.",
    calendar:
      "Support with appointments, meeting preparation, follow-up and reminders.",
    readiness:
      "Support with task completion, review points, practical readiness, and action planning.",
    manager:
      "Support with management oversight, safeguarding grip, quality of care, decisions, review writing and escalation.",
    reports:
      "Support with report drafting, summaries, review packs and structured professional writing.",
    documents:
      "Support with document summaries, uploaded evidence, statutory paperwork and inspection-cycle evidence review.",
    communication:
      "Support with professional communication, liaison logs and follow-up messages.",
    therapy:
      "Support with therapeutic understanding, formulation-led thinking and practical follow-up.",
    "home-dashboard":
      "Support with whole-home operational oversight, quality of care, staffing, incidents, compliance and management actions.",
    compliance:
      "Support with Ofsted readiness, statutory compliance, supervision, training, audits, quality standards and evidence of good practice.",
    team:
      "Support with staffing pressures, absence impact, rota themes and workforce consistency.",
    supervision:
      "Support with supervision oversight, workforce development, training and practice accountability.",
    quality:
      "Support with audit summaries, RI themes, monthly patterns, triangulation, quality assurance and inspection readiness.",
    "inspection-readiness":
      "Support with inspection scorecards, lines of enquiry, action recovery, evidence quality and Ofsted preparation.",
    reg44:
      "Support with Reg 44 findings, recommendations, provider challenge and evidence of follow-through.",
    reg45:
      "Support with Reg 45 quality of care review, themes, impact, actions and service learning.",
  };

  return (
    map[section] ||
    `Support with ${scope} children’s residential home operating system tasks.`
  );
}

function roleGuidance(role = "") {
  const value = String(role || "").toLowerCase();

  if (value === "staff") {
    return "Prioritise practical, child-centred, shift-relevant support in a children’s residential home.";
  }

  if (["manager", "registered_manager", "deputy_manager"].includes(value)) {
    return "Prioritise safeguarding oversight, consistency of care, management grip, standards, action completion and inspection readiness.";
  }

  if (value === "ri") {
    return "Prioritise triangulation, audit patterns, repeated shortfalls, quality assurance, governance and independent oversight.";
  }

  if (value === "admin") {
    return "Prioritise provider-wide visibility, governance, compliance, reporting and cross-home operational assurance.";
  }

  return "Prioritise calm, evidence-based, operationally useful support in a children’s residential home.";
}

function lensGuidance(lens = "general") {
  const map = {
    child_centred:
      "Weight lived experience, child voice, trauma-informed understanding, daily care meaning, relationship-based practice and practical next steps.",
    shift:
      "Weight immediate operational clarity, what staff need this shift, appointments, incidents, routines, escalations and task completion.",
    manager:
      "Weight management grip, review quality, repeated patterns, safeguarding oversight, staff consistency, action completion and accountability.",
    safeguarding:
      "Weight risk indicators, triggers, vulnerability, missing-from-care concerns, escalation thresholds, protective factors and safeguarding follow-up.",
    inspection:
      "Weight whether the evidence stands up to inspection scrutiny, the quality of analysis, follow-through, compliance and service leadership.",
    quality:
      "Weight governance, cross-record triangulation, recurring shortfalls, provider oversight, audit concerns and inspection readiness.",
    operational:
      "Weight home functioning, routines, staffing, compliance, incidents, communication and practical service actions.",
    general:
      "Use a balanced children’s residential home reasoning approach grounded in evidence and practical next steps.",
  };

  return map[lens] || map.general;
}

function outputModeGuidance(outputMode = OUTPUT_MODE.answer) {
  const map = {
    [OUTPUT_MODE.answer]:
      "Give a direct, evidence-based answer using the scoped records.",
    [OUTPUT_MODE.factual_answer]:
      "Answer directly and precisely. Prefer dates, latest records, counts and explicit evidence.",
    [OUTPUT_MODE.summary]:
      "Provide a structured summary that reflects children’s residential care practice and operational relevance.",
    [OUTPUT_MODE.chronology]:
      "Present a clear chronology of significant events, records, incidents, appointments or changes in presentation, followed by brief pattern analysis.",
    [OUTPUT_MODE.review_pack]:
      "Write in a formal review style suitable for management oversight, Reg 45 support, or review preparation.",
    [OUTPUT_MODE.handover]:
      "Write like a residential care handover: practical, shift-ready, concise and action-focused.",
    [OUTPUT_MODE.compliance_brief]:
      "Write like a compliance and inspection-readiness brief for a children’s home.",
    [OUTPUT_MODE.management_brief]:
      "Write like a manager oversight brief focusing on risk, actions, performance and service pressures.",
    [OUTPUT_MODE.quality_brief]:
      "Write like a quality assurance and RI brief, suitable for governance and scrutiny.",
    [OUTPUT_MODE.morning_brief]:
      "Write like a start-of-day residential home briefing with priorities, risks and follow-up.",
    [OUTPUT_MODE.drafting]:
      "Draft professional wording suitable for children’s home records or management communication.",
    [OUTPUT_MODE.children_home_summary_template]:
      "Use a children’s home summary template. Make it evidence-led, child-centred where relevant, and useful for practice and oversight.",
    [OUTPUT_MODE.children_home_chronology_template]:
      "Use a children’s home chronology template. Focus on significant dates, events, patterns and implications for care.",
    [OUTPUT_MODE.children_home_handover_template]:
      "Use a children’s home handover template. Keep it practical, shift-ready, safeguarding-aware and concise.",
    [OUTPUT_MODE.children_home_manager_brief_template]:
      "Use a children’s home manager brief template. Focus on oversight, safeguarding, quality, compliance, workforce and actions.",
    [OUTPUT_MODE.children_home_quality_brief_template]:
      "Use a children’s home quality and scrutiny template. Focus on triangulation, patterns, quality assurance, Ofsted readiness and governance.",
    [OUTPUT_MODE.children_home_reg45_template]:
      "Use a Reg 45 support template suitable for children’s home review work. Focus on lived experience, progress, care impact, patterns, shortfalls and actions.",
  };

  return map[outputMode] || map[OUTPUT_MODE.answer];
}

function buildSystemPrompt(context, options = {}) {
  const intent = options.intent || ASSISTANT_INTENT.unknown;
  const retrievalMode = options.retrieval_mode || RETRIEVAL_MODE.whole_scope;
  const outputMode = options.output_mode || OUTPUT_MODE.answer;

  return [
    "You are IndiCare OS, a children’s residential home operating system assistant.",
    "You are not a generic chatbot. You are an evidence-led operational intelligence assistant for children’s homes.",
    "You support child-level practice, home-level oversight, provider quality assurance, and inspection readiness.",
    "You should reason from the records as a children’s home practitioner and oversight professional, then produce one clear answer suited to the user’s role, scope and need.",
    `Current scope: ${context.scope}.`,
    `Current section: ${context.section}.`,
    `User role: ${context.role}.`,
    `Assistant intent: ${intent}.`,
    `Retrieval mode: ${retrievalMode}.`,
    `Output mode: ${outputMode}.`,
    `Analysis lens: ${context.analysis_lens}.`,
    `Purpose: ${sectionGuidance(context.section, context.scope)}`,
    `Role guidance: ${roleGuidance(context.role)}`,
    `Lens guidance: ${lensGuidance(context.analysis_lens)}`,
    `Output guidance: ${outputModeGuidance(outputMode)}`,
    context.scope === "child"
      ? `Selected young person: ${context.person.name}. Preferred name: ${context.person.preferred_name || "not set"}. Home: ${context.person.home_name || "not set"}. Risk: ${context.person.risk || "not set"}. Placement status: ${context.person.placement_status || "not set"}.`
      : `Current home: ${context.home.home_name}.`,
    retrievalMode === RETRIEVAL_MODE.section_only
      ? "Use section-focused evidence only because the user explicitly asked about the current section."
      : "Use the full scoped children’s home record set for this request, not just the visible page.",
    "Answer from the records and evidence provided.",
    "Do not invent missing facts.",
    "Citations must appear throughout the answer, not only at the end.",
    "Use short inline citations like [record_type:record_id].",
    "Where useful, identify: what is evidenced, what pattern is emerging, what creates risk, what is missing, and what action should follow.",
    "Keep the answer calm, professional, practical, evidence-based and suitable for children’s residential care.",
  ].join(" ");
}

function dedupeEvidence(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = [
      item.record_type || "",
      item.source_id || item.id || "",
      item.date || "",
      item.title || "",
    ].join("::");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeEvidenceSources(...chunks) {
  return dedupeEvidence(
    chunks.flatMap((chunk) => (Array.isArray(chunk) ? chunk : []))
  );
}

function normaliseEvidenceInput(input = {}) {
  const evidence = [];

  if (Array.isArray(input.evidence)) {
    evidence.push(...input.evidence.map((item) => toAssistantEvidence(item)));
  }

  if (input.readiness_payload) {
    evidence.push(...mapReadinessEvidence(input.readiness_payload));
  }

  if (input.manager_review_payload) {
    evidence.push(...mapManagerReviewEvidence(input.manager_review_payload));
  }

  if (input.bundle_payload) {
    evidence.push(...buildAssistantEvidenceSet(input.bundle_payload));
  }

  if (input.records_payload) {
    evidence.push(...buildAssistantEvidenceSet(input.records_payload));
  }

  if (input.scope_bundle) {
    evidence.push(...buildAssistantEvidenceSet(input.scope_bundle));
  }

  if (state.scopeBundle) {
    evidence.push(...buildAssistantEvidenceSet(state.scopeBundle));
  }

  return dedupeEvidence(evidence);
}

async function resolveScopeBundle(options = {}) {
  if (options.scope_bundle && typeof options.scope_bundle === "object") {
    return options.scope_bundle;
  }

  if (state.scopeBundle && typeof state.scopeBundle === "object") {
    return state.scopeBundle;
  }

  if (options.fetchScopeBundle === false) {
    return null;
  }

  try {
    setAssistantScopeBundleLoading(true);

    const scope = state.currentScope || "child";
    const accessLevel = getAccessLevelForScope(scope);
    const youngPerson = getSelectedYoungPerson();

    const bundle = await fetchAssistantScopeBundle({
      scope,
      current_scope: scope,
      young_person_id: state.youngPersonId || null,
      home_id:
        state.homeId ||
        youngPerson?.home_id ||
        youngPerson?.homeId ||
        null,
      allowed_home_ids: getAllowedHomeIds(),
      access_level: accessLevel,
      provider_id:
        state.providerId ||
        state.currentUser?.provider_id ||
        state.currentUser?.providerId ||
        null,
    });

    if (bundle) {
      setAssistantScopeBundle(bundle);
      return bundle;
    }
  } catch (error) {
    setAssistantScopeBundleError(
      error?.message || "Failed to load scoped records."
    );
  } finally {
    setAssistantScopeBundleLoading(false);
  }

  return null;
}

function filterEvidenceByScope(
  evidence = [],
  context = buildAssistantContext()
) {
  const scope = context.scope;

  if (scope === "child") {
    return evidence.filter((item) => {
      const raw = item.raw || {};
      const youngPersonId =
        item.young_person_id ??
        raw.young_person_id ??
        raw.child_id ??
        raw.person_id ??
        null;

      if (!context.person.id) return true;
      if (youngPersonId === null || youngPersonId === undefined) return true;

      return String(youngPersonId) === String(context.person.id);
    });
  }

  if (isProviderWideScope(scope) && context.access_level === "provider") {
    const allowed = new Set(
      arrayify(context.allowed_home_ids).map((item) => String(item))
    );

    if (!allowed.size) return evidence;

    return evidence.filter((item) => {
      const raw = item.raw || {};
      const itemHomeId = item.home_id ?? raw.home_id ?? raw.service_id ?? null;

      if (itemHomeId === null || itemHomeId === undefined) return true;
      return allowed.has(String(itemHomeId));
    });
  }

  const homeId = context.home?.home_id;
  if (!homeId) return evidence;

  return evidence.filter((item) => {
    const raw = item.raw || {};
    const itemHomeId = item.home_id ?? raw.home_id ?? raw.service_id ?? null;

    if (itemHomeId === null || itemHomeId === undefined) return true;
    return String(itemHomeId) === String(homeId);
  });
}

function filterEvidenceBySection(evidence = [], section = "workspace") {
  if (!section) return evidence;

  const sectionGroups = {
    workspace: ["workspace", "overview", "handover"],
    overview: ["overview", "workspace", "timeline", "manager"],
    profile: ["profile", "overview"],
    timeline: ["timeline", "manager"],
    handover: ["handover", "workspace", "timeline"],
    health: ["health", "calendar"],
    education: ["education", "calendar"],
    family: ["family", "communication"],
    calendar: ["calendar", "health", "education", "family"],
    readiness: ["readiness", "compliance", "documents", "manager"],
    manager: ["manager", "timeline", "readiness", "compliance"],
    reports: ["reports", "manager", "timeline", "readiness"],
    documents: ["documents", "compliance", "reports"],
    communication: ["communication", "family", "manager"],
    therapy: ["therapy", "health", "manager"],
    "home-dashboard": [
      "home-dashboard",
      "team",
      "communication",
      "documents",
      "therapy",
      "readiness",
      "compliance",
    ],
    compliance: [
      "compliance",
      "documents",
      "supervision",
      "team",
      "readiness",
    ],
    team: ["team", "supervision", "manager"],
    supervision: ["supervision", "team", "compliance"],
    quality: [
      "quality",
      "compliance",
      "reports",
      "manager",
      "team",
      "supervision",
      "documents",
      "inspection-readiness",
      "reg44",
      "reg45",
    ],
    "inspection-readiness": [
      "inspection-readiness",
      "quality",
      "compliance",
      "manager",
      "reports",
    ],
    reg44: ["reg44", "quality", "inspection-readiness", "manager"],
    reg45: ["reg45", "quality", "reports", "inspection-readiness"],
  };

  const allowed = new Set(sectionGroups[section] || [section]);
  return evidence.filter((item) => allowed.has(item.section));
}

function resolveDateRange(message = "", options = {}) {
  if (options.date_range && typeof options.date_range === "object") {
    return {
      start: options.date_range.start || null,
      end: options.date_range.end || null,
    };
  }

  const text = String(message || "").toLowerCase();
  const now = new Date();

  if (/last 7 days|past 7 days/.test(text)) {
    return {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };
  }

  if (/last 30 days|past 30 days/.test(text)) {
    return {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };
  }

  if (/last 3 months|past 3 months/.test(text)) {
    return {
      start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };
  }

  if (/last 6 months|past 6 months|6 month|six month|reg 45/.test(text)) {
    return {
      start: new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };
  }

  if (
    /last 12 months|past 12 months|12 month|twelve month|yearly|annual/.test(
      text
    )
  ) {
    return {
      start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    };
  }

  return { start: null, end: null };
}

function filterEvidenceByDateRange(evidence = [], dateRange = {}) {
  const start = dateRange?.start ? Date.parse(dateRange.start) : null;
  const end = dateRange?.end ? Date.parse(dateRange.end) : null;

  if (start === null && end === null) return evidence;

  return evidence.filter((item) => {
    const value = Date.parse(item.date || "");
    if (Number.isNaN(value)) return false;
    if (start !== null && value < start) return false;
    if (end !== null && value > end) return false;
    return true;
  });
}

function buildQueryProfile(message = "", intent = ASSISTANT_INTENT.unknown) {
  const text = String(message || "").toLowerCase();

  return {
    text,
    intent,
    focus:
      intent === ASSISTANT_INTENT.chronology
        ? "chronology"
        : intent === ASSISTANT_INTENT.compliance
          ? "compliance"
          : intent === ASSISTANT_INTENT.risk
            ? "risk"
            : intent === ASSISTANT_INTENT.quality
              ? "quality"
              : intent === ASSISTANT_INTENT.management
                ? "management"
                : intent === ASSISTANT_INTENT.handover
                  ? "handover"
                  : /morning brief/.test(text)
                    ? "morning_brief"
                    : "general",
    wants_dates:
      intent === ASSISTANT_INTENT.factual_lookup ||
      intent === ASSISTANT_INTENT.chronology ||
      /date|when|last|next|latest|earliest/.test(text),
  };
}

function scoreEvidence(
  item = {},
  queryProfile = {},
  context = buildAssistantContext()
) {
  let score = 0;

  if (item.tags?.includes("safeguarding")) score += 6;
  if (item.tags?.includes("follow_up_required")) score += 4;
  if (item.tags?.includes("review_required")) score += 4;
  if (item.tags?.includes("open_task")) score += 3;
  if (item.tags?.includes("severity:critical")) score += 6;
  if (item.tags?.includes("severity:high")) score += 4;
  if (item.tags?.includes("significance:high")) score += 3;
  if (item.tags?.includes("status:overdue")) score += 5;
  if (item.tags?.includes("status:due_soon")) score += 3;
  if (item.tags?.includes("workflow:pending_review")) score += 2;
  if (item.summary) score += 1;
  if (item.child_voice) score += 1;

  if (
    context.analysis_lens === "safeguarding" &&
    item.tags?.includes("safeguarding")
  ) {
    score += 3;
  }

  if (context.analysis_lens === "manager" && item.tags?.includes("open_task")) {
    score += 2;
  }

  if (
    ["quality", "inspection"].includes(context.analysis_lens) &&
    (item.record_type === "compliance_item" ||
      item.tags?.includes("status:overdue") ||
      item.tags?.includes("inspection_relevant"))
  ) {
    score += 3;
  }

  if (queryProfile.focus === "chronology" && item.date) score += 2;

  if (
    queryProfile.focus === "compliance" &&
    (item.record_type === "compliance_item" ||
      item.tags?.includes("regulatory"))
  ) {
    score += 5;
  }

  if (
    queryProfile.focus === "risk" &&
    (item.record_type === "risk" || item.tags?.includes("safeguarding"))
  ) {
    score += 5;
  }

  if (
    queryProfile.focus === "handover" &&
    ["daily_note", "incident", "appointment", "handover_record"].includes(
      item.record_type
    )
  ) {
    score += 4;
  }

  if (queryProfile.focus === "morning_brief" && item.date) score += 2;

  if (
    queryProfile.focus === "quality" &&
    [
      "compliance_item",
      "audit",
      "manager_action",
      "document",
      "quality_audit",
      "quality_audit_action",
      "quality_audit_finding",
      "reg44_item",
      "reg44_action",
      "reg44_finding",
      "reg44_visit",
      "reg45_item",
      "reg45_action",
      "reg45_review",
      "inspection_home_header",
      "inspection_section_panel",
      "inspection_reason",
      "inspection_action",
      "inspection_task",
      "inspection_briefing",
      "inspection_prep_72_hour",
      "inspection_score",
      "inspection_section_score",
      "inspection_line_of_enquiry",
    ].includes(item.record_type)
  ) {
    score += 4;
  }

  if (
    queryProfile.focus === "management" &&
    [
      "task",
      "manager_action",
      "incident",
      "compliance_item",
      "manager_review_queue",
      "inspection_action",
      "inspection_task",
    ].includes(item.record_type)
  ) {
    score += 4;
  }

  return score;
}

function sortEvidence(
  evidence = [],
  queryProfile = {},
  context = buildAssistantContext()
) {
  return [...evidence].sort((a, b) => {
    const aScore = scoreEvidence(a, queryProfile, context);
    const bScore = scoreEvidence(b, queryProfile, context);

    if (bScore !== aScore) return bScore - aScore;

    const aTime = parseDateValue(a.date);
    const bTime = parseDateValue(b.date);
    return bTime - aTime;
  });
}

function summariseEvidence(evidence = []) {
  const counts = {};
  const tags = {};
  let openTasks = 0;
  let safeguarding = 0;
  let overdue = 0;
  let incidents = 0;
  let documents = 0;
  let compliance = 0;
  let appointments = 0;

  for (const item of evidence) {
    counts[item.record_type || "record"] =
      (counts[item.record_type || "record"] || 0) + 1;

    for (const tag of item.tags || []) {
      tags[tag] = (tags[tag] || 0) + 1;
    }

    if ((item.record_type || "") === "task" && item.tags?.includes("open_task")) {
      openTasks += 1;
    }
    if ((item.record_type || "") === "incident") incidents += 1;
    if ((item.record_type || "") === "appointment") appointments += 1;

    if (
      (item.record_type || "") === "document" ||
      (item.record_type || "") === "statutory_document"
    ) {
      documents += 1;
    }

    if ((item.record_type || "") === "compliance_item") compliance += 1;
    if (item.tags?.includes("safeguarding")) safeguarding += 1;
    if (item.tags?.includes("status:overdue")) overdue += 1;
  }

  return {
    total: evidence.length,
    counts,
    tags,
    open_tasks: openTasks,
    safeguarding_items: safeguarding,
    overdue_items: overdue,
    incident_items: incidents,
    appointment_items: appointments,
    document_items: documents,
    compliance_items: compliance,
  };
}

function buildChronology(evidence = [], limit = 100) {
  return [...evidence]
    .filter((item) => item.date)
    .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))
    .slice(0, limit)
    .map((item) => ({
      date: item.date,
      title: item.title || item.record_type || "Record",
      summary: item.summary || "",
      record_type: item.record_type || "record",
      record_id: item.source_id || item.id || null,
      section: item.section || "",
      tags: item.tags || [],
      citation_ref: buildCitationRef(item),
    }));
}

function latestByType(evidence = [], recordType = "") {
  return (
    [...evidence]
      .filter((item) => item.record_type === recordType && item.date)
      .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))[0] ||
    null
  );
}

function nextUpcomingByType(evidence = [], recordType = "") {
  const now = Date.now();

  return (
    [...evidence]
      .filter((item) => item.record_type === recordType && item.date)
      .filter((item) => parseDateValue(item.date) > now)
      .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))[0] ||
    null
  );
}

function extractFacts(evidence = []) {
  return {
    latest_incident: latestByType(evidence, "incident"),
    latest_missing_episode: latestByType(evidence, "missing_episode"),
    latest_family_contact: latestByType(evidence, "family_contact"),
    latest_health_record: latestByType(evidence, "health_record"),
    latest_education_record: latestByType(evidence, "education_record"),
    next_appointment: nextUpcomingByType(evidence, "appointment"),
    overdue_items: evidence
      .filter((x) => x.tags?.includes("status:overdue"))
      .slice(0, 20),
    open_tasks: evidence.filter((x) => x.tags?.includes("open_task")).slice(0, 20),
  };
}

function buildCareDomains(evidence = []) {
  return {
    presentation: evidence.filter((x) =>
      ["daily_note", "handover_record"].includes(x.record_type)
    ),
    incidents: evidence.filter((x) =>
      ["incident", "missing_episode"].includes(x.record_type)
    ),
    safeguarding: evidence.filter((x) => x.tags?.includes("safeguarding")),
    education: evidence.filter((x) => x.record_type === "education_record"),
    health: evidence.filter((x) =>
      ["health_record", "medication_record", "appointment"].includes(
        x.record_type
      )
    ),
    family: evidence.filter((x) => x.record_type === "family_contact"),
    planning: evidence.filter((x) =>
      [
        "support_plan",
        "risk",
        "task",
        "manager_action",
        "inspection_action",
        "inspection_task",
      ].includes(x.record_type)
    ),
    strengths: evidence.filter((x) =>
      ["achievement_record", "daily_note"].includes(x.record_type)
    ),
    documents: evidence.filter((x) =>
      ["document", "statutory_document", "monthly_review", "reg45_review"].includes(
        x.record_type
      )
    ),
    compliance: evidence.filter((x) =>
      [
        "compliance_item",
        "quality_audit",
        "quality_audit_action",
        "quality_audit_finding",
        "reg44_item",
        "reg44_action",
        "reg44_finding",
        "reg44_visit",
        "reg45_item",
        "reg45_action",
        "reg45_review",
        "inspection_home_header",
        "inspection_section_panel",
        "inspection_reason",
        "inspection_action",
        "inspection_task",
        "inspection_briefing",
        "inspection_prep_72_hour",
        "inspection_score",
        "inspection_section_score",
        "inspection_line_of_enquiry",
      ].includes(x.record_type)
    ),
  };
}

function buildTriangulationSummary(evidence = []) {
  return {
    incidents: evidence.filter((x) => x.record_type === "incident").length,
    daily_notes: evidence.filter((x) => x.record_type === "daily_note").length,
    plans: evidence.filter((x) => ["support_plan", "risk"].includes(x.record_type)).length,
    family: evidence.filter((x) => x.record_type === "family_contact").length,
    health: evidence.filter((x) => x.record_type === "health_record").length,
    education: evidence.filter((x) => x.record_type === "education_record").length,
    compliance: evidence.filter((x) => x.record_type === "compliance_item").length,
    documents: evidence.filter((x) =>
      ["document", "statutory_document"].includes(x.record_type)
    ).length,
    quality_audits: evidence.filter((x) => x.record_type === "quality_audit").length,
    reg44_items: evidence.filter((x) =>
      ["reg44_item", "reg44_action", "reg44_finding", "reg44_visit"].includes(x.record_type)
    ).length,
    reg45_items: evidence.filter((x) =>
      ["reg45_item", "reg45_action", "reg45_review"].includes(x.record_type)
    ).length,
    inspection_items: evidence.filter((x) => String(x.record_type || "").startsWith("inspection_")).length,
  };
}

function assessEvidenceSufficiency(evidence = []) {
  return {
    total: evidence.length,
    has_dates: evidence.some((x) => x.date),
    has_incidents: evidence.some((x) => x.record_type === "incident"),
    has_health: evidence.some((x) => x.record_type === "health_record"),
    has_education: evidence.some((x) => x.record_type === "education_record"),
    has_family: evidence.some((x) => x.record_type === "family_contact"),
    confidence:
      evidence.length > 30
        ? "high"
        : evidence.length > 10
          ? "medium"
          : evidence.length > 0
            ? "low"
            : "very_low",
  };
}

function makeSource(item = {}, evidenceKind = "direct") {
  return {
    type: item.record_type || "record",
    label: item.title || "Record",
    excerpt: cleanText(item.summary || "").slice(0, MAX_API_SUMMARY_EXCERPT),
    section: item.section || "",
    record_type: item.record_type || null,
    record_id: item.source_id || item.id || null,
    citation_ref: buildCitationRef(item),
    evidence_kind: evidenceKind,
    title: item.title || "Record",
    description: cleanText(item.summary || "").slice(0, MAX_API_SUMMARY_EXCERPT),
    created_at: item.date || null,
  };
}

function buildEvidenceSummaryLines(evidence = [], limit = 5) {
  const top = evidence.slice(0, limit);

  if (!top.length) {
    return ["No supporting records are currently loaded for this scope."];
  }

  return top.map((item) => {
    const bits = [
      item.title || "Record",
      item.summary || "",
      item.date ? `(${item.date})` : "",
      `[${buildCitationRef(item)}]`,
    ].filter(Boolean);

    return `• ${bits.join(" - ")}`;
  });
}

function buildChronologyLines(chronology = [], limit = 8) {
  const lines = chronology.slice(0, limit).map((item) => {
    const bits = [
      item.date || "",
      item.title || "Record",
      item.summary || "",
      `[${item.citation_ref || buildCitationRef(item)}]`,
    ].filter(Boolean);
    return `• ${bits.join(" - ")}`;
  });

  return lines.length
    ? lines
    : ["• No dated chronology items are currently available."];
}

function getTopConcerns(evidence = []) {
  const concerns = [];
  const sorted = evidence.slice(0, 10);

  if (sorted.some((item) => item.tags?.includes("safeguarding"))) {
    concerns.push("Safeguarding-linked evidence needs attention.");
  }
  if (sorted.some((item) => item.tags?.includes("status:overdue"))) {
    concerns.push("There are overdue items in the current evidence set.");
  }
  if (sorted.some((item) => item.tags?.includes("severity:critical"))) {
    concerns.push("Critical severity evidence is present.");
  }
  if (sorted.some((item) => item.tags?.includes("severity:high"))) {
    concerns.push("High severity evidence is present.");
  }
  if (sorted.some((item) => item.tags?.includes("open_task"))) {
    concerns.push("There are open tasks requiring follow-up.");
  }
  if (sorted.some((item) => item.tags?.includes("inspection_relevant"))) {
    concerns.push("Inspection-relevant evidence suggests readiness or scrutiny issues need attention.");
  }

  return unique(concerns).slice(0, 5);
}

function dedupeActions(actions = []) {
  const seen = new Set();
  return actions.filter((item) => {
    const key =
      item.action_id ||
      makeActionId([item.category, item.record_type, item.record_id]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildOperationalActions(
  evidence = [],
  context = buildAssistantContext()
) {
  const actions = [];

  for (const item of evidence) {
    const recordType = item.record_type || "record";
    const recordId = item.source_id || item.id || item.record_id || null;
    const dueDate =
      item.raw?.due_date ||
      item.raw?.review_date ||
      item.raw?.expiry_date ||
      item.raw?.appointment_date ||
      item.date ||
      null;

    if (item.tags?.includes("status:overdue")) {
      actions.push({
        action_id: makeActionId(["overdue", recordType, recordId]),
        priority: "high",
        category: "overdue",
        title: `Overdue ${recordType.replaceAll("_", " ")}`,
        description: item.title || item.summary || "An overdue item needs review.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: context.scope === "child" ? "staff" : "manager",
      });
    }

    if (item.tags?.includes("status:due_soon")) {
      actions.push({
        action_id: makeActionId(["due_soon", recordType, recordId]),
        priority: "medium",
        category: "due_soon",
        title: `Due soon: ${item.title || recordType}`,
        description: item.summary || "An item is coming due soon.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "staff",
      });
    }

    if (item.tags?.includes("open_task")) {
      actions.push({
        action_id: makeActionId(["task_follow_up", recordType, recordId]),
        priority: "medium",
        category: "task_follow_up",
        title: item.title || "Open task",
        description: item.summary || "Open task requiring follow-up.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "staff",
      });
    }

    if (item.tags?.includes("safeguarding")) {
      actions.push({
        action_id: makeActionId(["safeguarding_review", recordType, recordId]),
        priority: item.tags?.includes("severity:critical")
          ? "critical"
          : "high",
        category: "safeguarding_review",
        title: `Safeguarding review: ${item.title || recordType}`,
        description:
          item.summary || "Safeguarding-linked evidence requires review.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "manager",
      });
    }

    if (recordType === "appointment" && dueDate && isDueSoon(dueDate, 3)) {
      actions.push({
        action_id: makeActionId(["appointment_prepare", recordType, recordId]),
        priority: "medium",
        category: "appointment_prepare",
        title: `Prepare for appointment: ${item.title || "Appointment"}`,
        description:
          item.summary || "Upcoming appointment requires preparation.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "staff",
      });
    }

    if (recordType === "incident" && item.tags?.includes("severity:critical")) {
      actions.push({
        action_id: makeActionId([
          "critical_incident_follow_up",
          recordType,
          recordId,
        ]),
        priority: "critical",
        category: "critical_incident_follow_up",
        title: `Critical incident follow-up: ${item.title || "Incident"}`,
        description:
          item.summary || "A critical incident requires management review.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "manager",
      });
    }

    if (recordType === "missing_episode") {
      actions.push({
        action_id: makeActionId(["missing_episode_review", recordType, recordId]),
        priority: "critical",
        category: "missing_episode_review",
        title: "Missing episode review",
        description:
          item.summary ||
          "A missing episode requires active review and follow-up.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "manager",
      });
    }

    if (
      [
        "inspection_action",
        "quality_audit_action",
        "reg44_action",
        "reg45_action",
      ].includes(recordType)
    ) {
      actions.push({
        action_id: makeActionId(["inspection_follow_up", recordType, recordId]),
        priority:
          item.tags?.includes("priority:critical") || item.tags?.includes("urgency:critical")
            ? "critical"
            : item.tags?.includes("priority:high") || item.tags?.includes("urgency:high")
              ? "high"
              : "medium",
        category: "inspection_follow_up",
        title: item.title || "Inspection-linked action",
        description:
          item.summary || "Inspection-linked improvement action requires follow-up.",
        record_type: recordType,
        record_id: recordId,
        citation_ref: buildCitationRef(item),
        due_date: dueDate,
        assigned_role: "manager",
      });
    }
  }

  const recentIncidents = evidence.filter((item) => {
    if (item.record_type !== "incident") return false;
    const days = daysFromNow(item.date);
    return days !== null && days >= -30;
  });

  if (recentIncidents.length >= 3) {
    actions.push({
      action_id: makeActionId([
        "pattern",
        "incidents",
        context.scope,
        context.person?.id || context.home?.home_id,
      ]),
      priority: "high",
      category: "pattern",
      title: "Repeated incident pattern",
      description:
        "There are repeated incidents in the recent evidence set, suggesting a pattern requiring analysis.",
      record_type: "incident",
      record_id: recentIncidents[0]?.source_id || recentIncidents[0]?.id || null,
      citation_ref: buildCitationRef(recentIncidents[0] || {}),
      due_date: null,
      assigned_role: "manager",
    });
  }

  const recentMissing = evidence.filter((item) => {
    if (item.record_type !== "missing_episode") return false;
    const days = daysFromNow(item.date);
    return days !== null && days >= -60;
  });

  if (recentMissing.length >= 2) {
    actions.push({
      action_id: makeActionId([
        "pattern",
        "missing",
        context.scope,
        context.person?.id || context.home?.home_id,
      ]),
      priority: "critical",
      category: "pattern",
      title: "Repeated missing pattern",
      description:
        "There are repeated missing episodes in the recent evidence set, suggesting increased vulnerability.",
      record_type: "missing_episode",
      record_id: recentMissing[0]?.source_id || recentMissing[0]?.id || null,
      citation_ref: buildCitationRef(recentMissing[0] || {}),
      due_date: null,
      assigned_role: "manager",
    });
  }

  return dedupeActions(actions)
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    })
    .slice(0, MAX_LOCAL_ACTIONS);
}

function summariseOperationalActions(actions = []) {
  return {
    total: actions.length,
    critical: actions.filter((x) => x.priority === "critical").length,
    high: actions.filter((x) => x.priority === "high").length,
    medium: actions.filter((x) => x.priority === "medium").length,
    low: actions.filter((x) => x.priority === "low").length,
  };
}

function inferSuggestedActions(
  context,
  evidence = [],
  intent = ASSISTANT_INTENT.unknown,
  operationalActions = []
) {
  const actions = [];
  const summary = summariseEvidence(evidence);

  if (context.scope === "child") {
    actions.push({ type: "draft_handover", label: "Draft handover" });
    actions.push({ type: "draft_summary", label: "Draft summary" });

    if (summary.open_tasks > 0) {
      actions.push({ type: "create_task", label: "Create action list" });
    }

    if (summary.safeguarding_items > 0 || summary.incident_items > 0) {
      actions.push({
        type: "review_incidents",
        label: "Review incidents and risks",
      });
    }
  }

  if (context.scope === "home") {
    actions.push({ type: "draft_summary", label: "Draft home summary" });
    actions.push({ type: "create_task", label: "Create action list" });
    actions.push({ type: "draft_note", label: "Draft management update" });

    if (summary.overdue_items > 0) {
      actions.push({
        type: "review_compliance",
        label: "Review overdue items",
      });
    }
  }

  if (isProviderWideScope(context.scope)) {
    actions.push({ type: "draft_summary", label: "Draft quality summary" });
    actions.push({ type: "create_task", label: "Create action list" });
    actions.push({ type: "draft_note", label: "Draft RI summary" });

    if (summary.overdue_items > 0 || summary.compliance_items > 0) {
      actions.push({
        type: "review_compliance",
        label: "Review compliance gaps",
      });
    }
  }

  if (
    intent === ASSISTANT_INTENT.chronology ||
    intent === ASSISTANT_INTENT.review
  ) {
    actions.unshift({
      type: "draft_summary",
      label: "Draft chronology summary",
    });
  }

  if (operationalActions.some((item) => item.priority === "critical")) {
    actions.unshift({
      type: "review_risk",
      label: "Review critical actions",
    });
  }

  return unique(actions.map((item) => JSON.stringify(item)))
    .map((item) => JSON.parse(item))
    .slice(0, 6);
}

function buildFallbackReply(message, context, runtime = {}) {
  const text = String(message || "").toLowerCase();
  const evidence = runtime.evidence || [];
  const chronology = runtime.chronology || [];
  const facts = runtime.facts || {};
  const evidenceSummary = runtime.summary || summariseEvidence(evidence);
  const topConcerns = getTopConcerns(evidence);
  const confidence = runtime.evidence_sufficiency?.confidence || "low";
  const operationalActions = runtime.operational_actions || [];
  const actionSummary =
    runtime.operational_action_summary ||
    summariseOperationalActions(operationalActions);

  if (/morning brief/.test(text)) {
    return {
      answer: [
        `Residential morning brief for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        `• Evidence items reviewed: ${evidenceSummary.total}`,
        `• Open tasks: ${evidenceSummary.open_tasks}`,
        `• Overdue items: ${evidenceSummary.overdue_items}`,
        `• Safeguarding-linked items: ${evidenceSummary.safeguarding_items}`,
        `• Operational actions: ${actionSummary.total}`,
        `• Critical actions: ${actionSummary.critical}`,
        `• Evidence confidence: ${confidence}`,
        "",
        "What matters this morning:",
        ...buildEvidenceSummaryLines(evidence, 3),
        ...(facts.next_appointment
          ? [
              "",
              `Next appointment: ${facts.next_appointment.title || "Appointment"} (${facts.next_appointment.date || "date not set"}) [${buildCitationRef(facts.next_appointment)}]`,
            ]
          : []),
        ...(topConcerns.length
          ? ["", "Key concerns:", ...topConcerns.map((item) => `• ${item}`)]
          : []),
        ...(operationalActions.length
          ? [
              "",
              "Priority actions:",
              ...operationalActions
                .slice(0, 5)
                .map((item) => `• ${item.title} [${item.citation_ref || "action"}]`),
            ]
          : []),
      ].join("\n"),
      suggested_actions: [
        { type: "draft_summary", label: "Draft morning summary" },
        { type: "create_task", label: "Create action list" },
      ],
    };
  }

  if (/handover/.test(text)) {
    return {
      answer: [
        `Residential handover view for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        "1. What matters today",
        "2. Risks to hold in mind",
        "3. Appointments and timings",
        "4. Family/contact updates",
        "5. Tasks for this shift",
        "6. Escalations for manager awareness",
        "",
        "Recent evidence to consider:",
        ...buildEvidenceSummaryLines(evidence, 4),
        ...(operationalActions.length
          ? [
              "",
              "Practical actions:",
              ...operationalActions
                .slice(0, 5)
                .map((item) => `• ${item.title} [${item.citation_ref || "action"}]`),
            ]
          : []),
      ].join("\n"),
      suggested_actions: [
        { type: "draft_handover", label: "Draft handover" },
        { type: "create_task", label: "Create action list" },
      ],
    };
  }

  if (/chronology|timeline|what happened/.test(text)) {
    return {
      answer: [
        `Chronology and pattern view for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        ...buildChronologyLines(chronology, 10),
        "",
        `Evidence reviewed: ${evidenceSummary.total} item(s).`,
        `Operational actions: ${actionSummary.total}.`,
        `Confidence: ${confidence}.`,
      ].join("\n"),
      suggested_actions: [
        { type: "draft_summary", label: "Draft chronology summary" },
      ],
    };
  }

  if (/when was|what date|last incident|next appointment|latest/.test(text)) {
    const lines = [];

    if (facts.latest_incident) {
      lines.push(
        `Latest incident: ${facts.latest_incident.title || "Incident"} (${facts.latest_incident.date || "date not set"}) [${buildCitationRef(facts.latest_incident)}]`
      );
    }

    if (facts.latest_missing_episode) {
      lines.push(
        `Latest missing episode: ${facts.latest_missing_episode.title || "Missing episode"} (${facts.latest_missing_episode.date || "date not set"}) [${buildCitationRef(facts.latest_missing_episode)}]`
      );
    }

    if (facts.next_appointment) {
      lines.push(
        `Next appointment: ${facts.next_appointment.title || "Appointment"} (${facts.next_appointment.date || "date not set"}) [${buildCitationRef(facts.next_appointment)}]`
      );
    }

    if (!lines.length) {
      lines.push(
        "No matching dated record is currently visible in the scoped evidence set."
      );
    }

    return {
      answer: [
        `Date-based lookup for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        ...lines.map((line) => `• ${line}`),
        "",
        `Evidence reviewed: ${evidenceSummary.total} item(s).`,
      ].join("\n"),
      suggested_actions: [{ type: "draft_summary", label: "Draft summary" }],
    };
  }

  if (/risk/.test(text)) {
    return {
      answer: [
        `Residential risk view for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        ...(topConcerns.length
          ? topConcerns.map((item) => `• ${item}`)
          : [
              "• No clear high-priority risk theme is visible in the current evidence set.",
            ]),
        ...(operationalActions.length
          ? [
              "",
              "Risk-linked actions:",
              ...operationalActions
                .slice(0, 6)
                .map((item) => `• ${item.title} [${item.citation_ref || "action"}]`),
            ]
          : []),
        "",
        "Use this children’s home risk structure:",
        "• What is the concern?",
        "• What patterns or triggers are known?",
        "• What are the early warning signs?",
        "• What helps to reduce risk?",
        "• What must adults do if risk increases?",
        "",
        `Evidence reviewed: ${evidenceSummary.total} item(s).`,
      ].join("\n"),
      suggested_actions: [
        {
          type: "open_record",
          record_type: "risk",
          label: "Open risk assessment",
        },
        { type: "review_incidents", label: "Review incidents and risks" },
      ],
    };
  }

  if (/compliance|ofsted|audit|inspection|reg 44|reg44|reg 45|reg45/.test(text)) {
    return {
      answer: [
        "Compliance and inspection-readiness view:",
        "",
        "1. Workforce compliance",
        "2. Child or service file compliance",
        "3. Home document compliance",
        "4. Governance compliance",
        "5. Inspection evidence and action tracking",
        "",
        `Current scoped evidence: ${evidenceSummary.total} item(s)`,
        `Overdue items visible: ${evidenceSummary.overdue_items}`,
        `Compliance items visible: ${evidenceSummary.compliance_items}`,
        `Operational actions: ${actionSummary.total}`,
        "",
        ...buildEvidenceSummaryLines(
          evidence.filter(
            (item) =>
              item.record_type === "compliance_item" ||
              item.tags?.includes("status:overdue") ||
              item.tags?.includes("inspection_relevant")
          ),
          5
        ),
      ].join("\n"),
      suggested_actions: [
        { type: "review_compliance", label: "Review compliance gaps" },
        { type: "create_task", label: "Create action list" },
      ],
    };
  }

  if (/summary|summarise|summarize/.test(text)) {
    return {
      answer: [
        `Current position summary for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        "• What matters most right now",
        "• Risks or pressures",
        "• Strengths or positives",
        "• Immediate next actions",
        "",
        `Scoped evidence count: ${evidenceSummary.total}`,
        `Operational actions: ${actionSummary.total}`,
        `Critical actions: ${actionSummary.critical}`,
        `Evidence confidence: ${confidence}`,
        ...buildEvidenceSummaryLines(evidence, 5),
      ].join("\n"),
      suggested_actions: [{ type: "draft_summary", label: "Draft summary" }],
    };
  }

  return {
    answer: [
      "I can help across the full children’s residential home record set for this scope, including incidents, daily records, care planning, risk, health, education, family contact, compliance, uploaded documents, quality, inspection readiness and oversight.",
      "",
      "Try asking me to:",
      "• give a full summary",
      "• build a chronology",
      "• provide dates or latest events",
      "• identify risks, gaps or follow-up",
      "• create a morning brief",
      "• draft a handover or summary",
      "• review quality, Reg 44, Reg 45 or inspection actions",
      "",
      `Scoped evidence count: ${evidenceSummary.total}`,
      `Operational actions: ${actionSummary.total}`,
      `Evidence confidence: ${confidence}`,
    ].join("\n"),
    suggested_actions: [
      { type: "draft_summary", label: "Draft summary" },
      { type: "draft_note", label: "Draft wording" },
    ],
  };
}

function createAssistantResponse({
  answer = "",
  suggested_actions = [],
  sources = [],
  runtime = {},
  explainability = {},
  assistant_scope = {},
  assistant_context = {},
} = {}) {
  return {
    answer: String(answer || ""),
    suggested_actions: Array.isArray(suggested_actions)
      ? suggested_actions
      : [],
    sources: Array.isArray(sources) ? sources : [],
    runtime: {
      mode: runtime.mode || "standard",
      ...runtime,
    },
    explainability: {
      ...explainability,
    },
    assistant_scope: {
      ...assistant_scope,
    },
    assistant_context: {
      ...assistant_context,
    },
  };
}

function buildAssistantScopeMeta(context, runtime = {}) {
  return {
    scope_type: context.scope,
    section: context.section,
    role: context.role,
    access_level: context.access_level,
    analysis_lens: context.analysis_lens,
    retrieval_mode: runtime.retrieval_mode || RETRIEVAL_MODE.whole_scope,
    output_mode: runtime.output_mode || OUTPUT_MODE.answer,
    intent: runtime.intent || ASSISTANT_INTENT.unknown,
    secondary_intents: Array.isArray(runtime.secondary_intents)
      ? runtime.secondary_intents
      : [],
  };
}

function buildAssistantContextMeta(context, runtime = {}) {
  const evidence = runtime.evidence || [];
  const summary = runtime.summary || summariseEvidence(evidence);
  const chronology = runtime.chronology || [];
  const facts = runtime.facts || {};
  const sufficiency =
    runtime.evidence_sufficiency || assessEvidenceSufficiency(evidence);
  const careDomains = runtime.care_domains || buildCareDomains(evidence);
  const triangulation =
    runtime.triangulation || buildTriangulationSummary(evidence);
  const operationalActions = runtime.operational_actions || [];
  const operationalActionSummary =
    runtime.operational_action_summary ||
    summariseOperationalActions(operationalActions);

  return {
    current_scope: context.scope,
    current_section: context.section,
    access_level: context.access_level,
    analysis_lens: context.analysis_lens,
    young_person: context.scope === "child" ? context.person : null,
    home: context.home,
    active_record_type: context.active_record_type || null,
    active_record_item: context.active_record_item || null,
    composer_record_type: context.composer_record_type || null,
    composer_record_id: context.composer_record_id || null,
    evidence_summary: summary,
    key_concerns: getTopConcerns(evidence),
    chronology: chronology.slice(0, 50),
    facts: {
      latest_incident: facts.latest_incident || null,
      latest_missing_episode: facts.latest_missing_episode || null,
      latest_family_contact: facts.latest_family_contact || null,
      next_appointment: facts.next_appointment || null,
    },
    evidence_sufficiency: sufficiency,
    triangulation,
    operational_action_summary: operationalActionSummary,
    operational_actions: operationalActions.slice(0, 20),
    recent_records: {
      incidents: evidence.filter((item) => item.record_type === "incident").slice(0, 5),
      tasks: evidence.filter((item) => item.record_type === "task").slice(0, 5),
      compliance: evidence.filter((item) => item.record_type === "compliance_item").slice(0, 5),
      documents: evidence
        .filter(
          (item) =>
            item.record_type === "document" ||
            item.record_type === "statutory_document"
        )
        .slice(0, 5),
      appointments: evidence.filter((item) => item.record_type === "appointment").slice(0, 5),
      quality: evidence
        .filter((item) =>
          [
            "quality_audit",
            "quality_audit_action",
            "quality_audit_finding",
            "reg44_item",
            "reg44_action",
            "reg44_finding",
            "reg44_visit",
            "reg45_item",
            "reg45_action",
            "reg45_review",
            "inspection_home_header",
            "inspection_section_panel",
            "inspection_reason",
            "inspection_action",
            "inspection_task",
            "inspection_briefing",
            "inspection_prep_72_hour",
            "inspection_score",
            "inspection_section_score",
            "inspection_line_of_enquiry",
          ].includes(item.record_type)
        )
        .slice(0, 10),
    },
    active_work: {
      tasks: evidence
        .filter((item) => item.tags?.includes("open_task"))
        .slice(0, 10),
    },
    care_domains: {
      presentation_count: careDomains.presentation.length,
      incidents_count: careDomains.incidents.length,
      safeguarding_count: careDomains.safeguarding.length,
      education_count: careDomains.education.length,
      health_count: careDomains.health.length,
      family_count: careDomains.family.length,
      planning_count: careDomains.planning.length,
      strengths_count: careDomains.strengths.length,
      compliance_count: careDomains.compliance.length,
    },
  };
}

function sanitiseEvidenceForApi(evidence = []) {
  return evidence.slice(0, MAX_API_EVIDENCE_ITEMS).map((item) => ({
    date: item.date || "",
    title: item.title || "",
    summary: cleanText(item.summary || "").slice(0, MAX_API_SUMMARY_EXCERPT),
    record_type: item.record_type || "",
    source_id: item.source_id || item.id || null,
    section: item.section || "",
    tags: Array.isArray(item.tags) ? item.tags.slice(0, 20) : [],
    significance: item.significance || "",
    child_voice: cleanText(item.child_voice || "").slice(
      0,
      MAX_API_SUMMARY_EXCERPT
    ),
    citation_ref: buildCitationRef(item),
  }));
}

function sanitiseChronologyForApi(chronology = []) {
  return chronology.slice(0, MAX_API_CHRONOLOGY_ITEMS).map((item) => ({
    date: item.date || "",
    title: item.title || "",
    summary: cleanText(item.summary || "").slice(0, MAX_API_SUMMARY_EXCERPT),
    record_type: item.record_type || "",
    record_id: item.record_id || null,
    section: item.section || "",
    citation_ref: item.citation_ref || buildCitationRef(item),
  }));
}

function sanitiseOperationalActionsForApi(actions = []) {
  return actions.slice(0, 20).map((item) => ({
    action_id: item.action_id,
    priority: item.priority,
    category: item.category,
    title: item.title,
    description: item.description,
    record_type: item.record_type,
    record_id: item.record_id,
    citation_ref: item.citation_ref,
    due_date: item.due_date || null,
    assigned_role: item.assigned_role || null,
  }));
}

export async function buildAssistantEvidenceContext(options = {}) {
  const message = options.message || "";
  const intent = options.intent || detectAssistantIntent(message);
  const intentMeta = detectAssistantIntents(message);
  const retrievalMode =
    options.retrieval_mode || detectRetrievalMode(message, intent);
  const outputMode = options.output_mode || detectOutputMode(intent, message);
  const dateRange = resolveDateRange(message, options);

  const baseContext = buildAssistantContext();
  const context = {
    ...baseContext,
    analysis_lens:
      options.context?.analysis_lens ||
      options.analysis_lens ||
      inferAnalysisLens({
        scope: baseContext.scope,
        section: baseContext.section,
        role: baseContext.role,
        intent,
      }),
  };

  const fetchedScopeBundle = await resolveScopeBundle(options);

  const rawEvidence = mergeEvidenceSources(
    normaliseEvidenceInput(options),
    fetchedScopeBundle ? buildAssistantEvidenceSet(fetchedScopeBundle) : []
  );

  const scoped = filterEvidenceByScope(rawEvidence, context);
  const dateFiltered = filterEvidenceByDateRange(scoped, dateRange);

  const filtered =
    retrievalMode === RETRIEVAL_MODE.section_only
      ? filterEvidenceBySection(dateFiltered, context.section)
      : dateFiltered;

  const queryProfile = buildQueryProfile(message, intent);
  const ranked = sortEvidence(filtered, queryProfile, context);
  const chronology = buildChronology(filtered, 100);
  const summary = summariseEvidence(ranked);
  const facts = extractFacts(filtered);
  const careDomains = buildCareDomains(filtered);
  const triangulation = buildTriangulationSummary(filtered);
  const evidenceSufficiency = assessEvidenceSufficiency(filtered);
  const operationalActions = buildOperationalActions(ranked, context);
  const operationalActionSummary =
    summariseOperationalActions(operationalActions);

  return {
    context,
    intent,
    secondary_intents: intentMeta.secondary_intents || [],
    retrieval_mode: retrievalMode,
    output_mode: outputMode,
    date_range: dateRange,
    scope_bundle: fetchedScopeBundle || state.scopeBundle || null,
    evidence: ranked,
    chronology,
    facts,
    care_domains: careDomains,
    triangulation,
    evidence_sufficiency: evidenceSufficiency,
    operational_actions: operationalActions,
    operational_action_summary: operationalActionSummary,
    system_prompt: buildSystemPrompt(context, {
      intent,
      retrieval_mode: retrievalMode,
      output_mode: outputMode,
    }),
    summary,
    runtime: {
      analysis_lens: context.analysis_lens,
      assistant_intent: intent,
      retrieval_mode: retrievalMode,
      output_mode: outputMode,
    },
    explainability: {
      reasoning_lens: context.analysis_lens,
    },
  };
}

export async function buildMorningBriefContext(options = {}) {
  const runtime = await buildAssistantEvidenceContext({
    ...options,
    message: options.message || "morning brief",
    intent: ASSISTANT_INTENT.handover,
    output_mode: OUTPUT_MODE.morning_brief,
    analysis_lens: "shift",
  });

  const context = runtime.context;
  const summary = runtime.summary;

  return {
    title:
      context.scope === "child"
        ? `Morning brief: ${context.person.name}`
        : `Morning brief: ${context.home.home_name}`,
    scope: context.scope,
    section: context.section,
    analysis_lens: context.analysis_lens,
    summary,
    chronology: runtime.chronology.slice(0, 10),
    facts: runtime.facts,
    evidence: runtime.evidence.slice(0, 10).map((item) => makeSource(item, "direct")),
    operational_actions: runtime.operational_actions.slice(0, 10),
    operational_action_summary: runtime.operational_action_summary,
    key_concerns: getTopConcerns(runtime.evidence),
    evidence_sufficiency: runtime.evidence_sufficiency,
  };
}

export async function buildManagerBriefContext(options = {}) {
  const runtime = await buildAssistantEvidenceContext({
    ...options,
    intent: ASSISTANT_INTENT.management,
    output_mode: OUTPUT_MODE.children_home_manager_brief_template,
    analysis_lens: "manager",
  });

  return {
    title: "Manager oversight brief",
    scope: runtime.context.scope,
    section: runtime.context.section,
    analysis_lens: runtime.context.analysis_lens,
    summary: runtime.summary,
    chronology: runtime.chronology.slice(0, 12),
    facts: runtime.facts,
    evidence: runtime.evidence.slice(0, 12).map((item) => makeSource(item, "direct")),
    operational_actions: runtime.operational_actions.slice(0, 12),
    operational_action_summary: runtime.operational_action_summary,
    key_concerns: getTopConcerns(runtime.evidence),
    evidence_sufficiency: runtime.evidence_sufficiency,
  };
}

export async function buildQualityBriefContext(options = {}) {
  const runtime = await buildAssistantEvidenceContext({
    ...options,
    intent: ASSISTANT_INTENT.quality,
    output_mode: OUTPUT_MODE.children_home_quality_brief_template,
    analysis_lens: "quality",
  });

  return {
    title: "Quality and RI brief",
    scope: runtime.context.scope,
    section: runtime.context.section,
    analysis_lens: runtime.context.analysis_lens,
    summary: runtime.summary,
    chronology: runtime.chronology.slice(0, 12),
    facts: runtime.facts,
    evidence: runtime.evidence.slice(0, 12).map((item) => makeSource(item, "direct")),
    operational_actions: runtime.operational_actions.slice(0, 12),
    operational_action_summary: runtime.operational_action_summary,
    key_concerns: getTopConcerns(runtime.evidence),
    evidence_sufficiency: runtime.evidence_sufficiency,
  };
}

export async function runAssistantMessage(message, options = {}) {
  const runtime = await buildAssistantEvidenceContext({
    ...options,
    message,
  });

  const {
    context,
    intent,
    secondary_intents,
    retrieval_mode,
    output_mode,
    date_range,
    evidence,
    chronology,
    facts,
    care_domains,
    triangulation,
    evidence_sufficiency,
    system_prompt,
    summary,
    operational_actions,
    operational_action_summary,
  } = runtime;

  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = {};
  }

  state.assistantMeta.intent = intent;
  state.assistantMeta.secondary_intents = secondary_intents;
  state.assistantMeta.retrieval_mode = retrieval_mode;
  state.assistantMeta.output_mode = output_mode;
  state.assistantMeta.chronology = chronology;
  state.assistantMeta.facts = facts;
  state.assistantMeta.care_domains = care_domains;
  state.assistantMeta.triangulation = triangulation;
  state.assistantMeta.evidence_summary = summary;
  state.assistantMeta.evidence_sufficiency = evidence_sufficiency;
  state.assistantMeta.operational_actions = operational_actions;
  state.assistantMeta.operational_action_summary =
    operational_action_summary;
  state.assistantMeta.last_bundle_refresh_at =
    state.scopeBundleLoadedAt || null;
  state.assistantMeta.last_analysis_at = new Date().toISOString();

  setAssistantDerivedState({
    chronology,
    facts,
    care_domains,
    morning_brief: null,
    manager_brief: null,
    quality_brief: null,
    live_summary: {
      scope: context.scope,
      section: context.section,
      confidence: evidence_sufficiency.confidence,
      evidence_count: evidence.length,
      overdue_items: summary.overdue_items,
      incident_items: summary.incident_items,
      open_tasks: summary.open_tasks,
      operational_actions: operational_action_summary.total,
      critical_actions: operational_action_summary.critical,
      analysis_lens: context.analysis_lens,
    },
  });

  const useApi = options.useApi === true;

  if (useApi && typeof fetch === "function") {
    try {
      const streamPayload = {
          message: cleanText(message),
          context,
          assistant_identity: {
            product_name: "IndiCare OS",
            domain: "children_residential_home_operating_system",
            reasoning_model: "residential_care_operational_reasoning",
          },
          response_contract: {
            require_inline_citations: true,
            citation_format: "[record_type:record_id]",
            citation_density: "every_substantive_paragraph",
            separate_fact_pattern_action: true,
            use_children_home_language: true,
            avoid_generic_policy_filler: true,
            evidence_first: true,
          },
          inspection_framework: {
            reference_children_homes_regulations: true,
            reference_quality_standards: true,
            reference_sccif: true,
          },
          intent,
          secondary_intents,
          retrieval_mode,
          output_mode,
          date_range,
          system_prompt,
          evidence: sanitiseEvidenceForApi(evidence),
          chronology: sanitiseChronologyForApi(chronology),
          facts,
          care_domains: {
            presentation_count: care_domains.presentation.length,
            incidents_count: care_domains.incidents.length,
            safeguarding_count: care_domains.safeguarding.length,
            education_count: care_domains.education.length,
            health_count: care_domains.health.length,
            family_count: care_domains.family.length,
            planning_count: care_domains.planning.length,
            strengths_count: care_domains.strengths.length,
            documents_count: care_domains.documents.length,
            compliance_count: care_domains.compliance.length,
          },
          triangulation,
          operational_actions: sanitiseOperationalActionsForApi(
            operational_actions
          ),
          operational_action_summary,
          evidence_sufficiency,
          summary,
          include_scope_bundle: false,
        };

      let metaPayload = {};
      let donePayload = null;

      await apiStreamAssistant(streamPayload, {
        onMeta: (meta) => {
          if (meta && typeof meta === "object") {
            metaPayload = meta;
          }
        },
        onDone: (finalPayload) => {
          donePayload = finalPayload;
        },
      });

      const data =
        donePayload && typeof donePayload === "object"
          ? donePayload
          : {};

      if (Object.keys(data).length || Object.keys(metaPayload).length) {
        const mergedPayload = {
          ...(metaPayload && typeof metaPayload === "object" ? metaPayload : {}),
          ...data,
        };

        return createAssistantResponse({
          answer:
            mergedPayload.answer ||
            mergedPayload.accumulated_text ||
            "No answer returned.",
          suggested_actions: Array.isArray(mergedPayload.suggested_actions)
            ? mergedPayload.suggested_actions
            : inferSuggestedActions(
                context,
                evidence,
                intent,
                operational_actions
              ),
          sources: Array.isArray(mergedPayload.sources)
            ? mergedPayload.sources.slice(0, MAX_SOURCE_ITEMS)
            : evidence
                .slice(0, MAX_SOURCE_ITEMS)
                .map((item) => makeSource(item, "direct")),
          runtime: {
            mode: "api",
            intent,
            secondary_intents,
            retrieval_mode,
            output_mode,
            analysis_lens: context.analysis_lens,
            evidence_count: evidence.length,
            chronology_count: chronology.length,
            confidence: evidence_sufficiency.confidence,
            operational_action_count: operational_action_summary.total,
            critical_action_count: operational_action_summary.critical,
            ...mergedPayload.runtime,
          },
          explainability: {
            scope: context.scope,
            section: context.section,
            analysis_lens: context.analysis_lens,
            evidence_count: evidence.length,
            chronology_count: chronology.length,
            triangulation,
            operational_action_summary,
            reasoning_summary:
              mergedPayload.explainability?.reasoning_summary ||
              `This answer used an evidence-led children’s home reasoning approach with a ${context.analysis_lens} lens.`,
            evidence_summary:
              mergedPayload.explainability?.evidence_summary ||
              `${evidence.length} evidence item(s) were reviewed with ${evidence_sufficiency.confidence} confidence.`,
            key_concerns: getTopConcerns(evidence),
            ...mergedPayload.explainability,
          },
          assistant_scope:
            mergedPayload.assistant_scope ||
            buildAssistantScopeMeta(context, runtime),
          assistant_context:
            mergedPayload.assistant_context ||
            buildAssistantContextMeta(context, runtime),
        });
      }
    } catch (error) {
      console.error("[assistant-runtime] api call failed", error);
    }
  }

  const fallback = buildFallbackReply(message, context, runtime);

  return createAssistantResponse({
    answer: fallback.answer,
    suggested_actions:
      fallback.suggested_actions?.length
        ? fallback.suggested_actions
        : inferSuggestedActions(context, evidence, intent, operational_actions),
    sources: evidence
      .slice(0, MAX_SOURCE_ITEMS)
      .map((item) => makeSource(item, "direct")),
    runtime: {
      mode: "fallback",
      intent,
      secondary_intents,
      retrieval_mode,
      output_mode,
      analysis_lens: context.analysis_lens,
      evidence_count: evidence.length,
      chronology_count: chronology.length,
      confidence: evidence_sufficiency.confidence,
      operational_action_count: operational_action_summary.total,
      critical_action_count: operational_action_summary.critical,
    },
    explainability: {
      scope: context.scope,
      section: context.section,
      analysis_lens: context.analysis_lens,
      evidence_count: evidence.length,
      chronology_count: chronology.length,
      fallback_used: true,
      triangulation,
      operational_action_summary,
      reasoning_summary:
        `Fallback residential OS response used. It was framed through a ${context.analysis_lens} reasoning lens.`,
      evidence_summary:
        `${evidence.length} evidence item(s) were reviewed with ${evidence_sufficiency.confidence} confidence.`,
      key_concerns: getTopConcerns(evidence),
    },
    assistant_scope: buildAssistantScopeMeta(context, runtime),
    assistant_context: buildAssistantContextMeta(context, runtime),
  });
}

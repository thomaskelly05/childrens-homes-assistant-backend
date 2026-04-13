import { state } from "../state.js";
import {
  buildAssistantEvidenceSet,
  mapReadinessEvidence,
  mapManagerReviewEvidence,
  toAssistantEvidence,
} from "./adapters.js";

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function unique(values = []) {
  return [...new Set(arrayify(values).filter(Boolean))];
}

function getScopeLabel(scope) {
  if (scope === "home") return "home";
  if (scope === "quality") return "quality";
  return "child";
}

function getSectionLabel(section) {
  return section || "workspace";
}

function getSelectedPersonSummary() {
  const person = state.selectedYoungPerson || {};

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
  const person = state.selectedYoungPerson || {};

  return {
    home_id:
      state.homeId ||
      user.home_id ||
      user.homeId ||
      person.home_id ||
      null,
    home_name:
      user.home_name ||
      user.homeName ||
      person.home_name ||
      "Home",
  };
}

export function buildAssistantContext() {
  return {
    scope: getScopeLabel(state.currentScope),
    section: getSectionLabel(state.currentSection),
    role: state.userRole || "staff",
    person: getSelectedPersonSummary(),
    home: getHomeSummary(),
    active_record_type: state.activeRecordType || null,
    active_record_item: state.activeRecordItem || null,
    composer_record_type: state.composerRecordType || null,
    composer_record_id: state.composerRecordId || null,
  };
}

function sectionGuidance(section, scope) {
  const map = {
    workspace:
      "Support with daily recording, shift reflection, strengths-based writing, and next-step actions.",
    overview:
      "Support with concise summaries, priorities, risks, strengths, and planning.",
    profile:
      "Support with child-centred profile writing, identity, communication, health and formulation.",
    timeline:
      "Support with chronology summaries, patterns, event analysis, and linked follow-up.",
    handover:
      "Support with concise handover writing, clarity, risks, and what staff need to know next.",
    health:
      "Support with appointments, outcomes, professionals, medication context, and follow-up.",
    education:
      "Support with attendance, engagement, progress, incidents, and educational planning.",
    family:
      "Support with family contact summaries, themes, presentation before and after contact, and follow-up.",
    calendar:
      "Support with appointments, meeting prep, follow-up, and reminders.",
    readiness:
      "Support with practical task lists, oversight, prioritisation, and completion planning.",
    manager:
      "Support with oversight summaries, decision-making notes, review writing, and escalation thinking.",
    reports:
      "Support with report drafting, review packs, summaries, and structured professional writing.",
    documents:
      "Support with document summaries, document checklists, and statutory paperwork prompts.",
    communication:
      "Support with drafting professional messages, contact summaries, and liaison logs.",
    therapy:
      "Support with therapeutic recommendations, summary notes, and follow-up prompts.",
    "home-dashboard":
      "Support with whole-home summaries, staffing pressures, actions, communications, and operational oversight.",
    compliance:
      "Support with Ofsted readiness, supervision compliance, training compliance, statutory paperwork, and action planning.",
    team:
      "Support with staffing summaries, absence impact, rota themes, and deployment thinking.",
    supervision:
      "Support with supervision prep, supervision summaries, training and capability follow-up.",
    quality:
      "Support with audit summaries, RI themes, quality assurance findings, service trends, and compliance actions.",
  };

  return map[section] || `Support with ${scope} workspace tasks.`;
}

function buildSystemPrompt(context) {
  return [
    `You are the IndiCare OS assistant.`,
    `Current scope: ${context.scope}.`,
    `Current section: ${context.section}.`,
    `User role: ${context.role}.`,
    `Purpose: ${sectionGuidance(context.section, context.scope)}`,
    context.scope === "child"
      ? `Selected young person: ${context.person.name}. Preferred name: ${context.person.preferred_name || "not set"}. Home: ${context.person.home_name || "not set"}. Risk: ${context.person.risk || "not set"}. Placement status: ${context.person.placement_status || "not set"}.`
      : `Current home: ${context.home.home_name}.`,
    `Keep responses clear, calm, practical, child-centred where relevant, and operationally useful.`,
    `Prefer structured support: summary, what matters, suggested wording, and next actions.`,
    `Do not overclaim. If evidence is weak or missing, say so clearly.`,
  ].join(" ");
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

  return dedupeEvidence(evidence);
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

function filterEvidenceByScope(evidence = [], context = buildAssistantContext()) {
  const scope = context.scope;

  if (scope === "child") {
    return evidence.filter((item) => {
      const raw = item.raw || {};
      const youngPersonId =
        raw.young_person_id ??
        raw.child_id ??
        raw.person_id ??
        null;

      if (!context.person.id) return true;
      if (youngPersonId === null || youngPersonId === undefined) return true;

      return String(youngPersonId) === String(context.person.id);
    });
  }

  return evidence;
}

function filterEvidenceBySection(evidence = [], section = "workspace") {
  if (!section) return evidence;

  const sectionGroups = {
    workspace: ["workspace", "overview", "handover"],
    overview: ["overview", "workspace", "timeline", "manager"],
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
    "home-dashboard": ["home-dashboard", "team", "communication", "documents", "therapy", "readiness", "compliance"],
    compliance: ["compliance", "documents", "supervision", "team", "readiness"],
    team: ["team", "supervision", "manager"],
    supervision: ["supervision", "team", "compliance"],
    quality: ["quality", "compliance", "reports", "manager", "team", "supervision"],
  };

  const allowed = new Set(sectionGroups[section] || [section]);
  return evidence.filter((item) => allowed.has(item.section));
}

function sortEvidence(evidence = []) {
  return [...evidence].sort((a, b) => {
    const aScore = scoreEvidence(a);
    const bScore = scoreEvidence(b);

    if (bScore !== aScore) return bScore - aScore;

    const aTime = Date.parse(a.date || 0) || 0;
    const bTime = Date.parse(b.date || 0) || 0;
    return bTime - aTime;
  });
}

function scoreEvidence(item = {}) {
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

  return score;
}

function summariseEvidence(evidence = []) {
  const counts = {};
  const tags = {};
  let openTasks = 0;
  let safeguarding = 0;
  let overdue = 0;

  for (const item of evidence) {
    counts[item.record_type || "record"] = (counts[item.record_type || "record"] || 0) + 1;

    for (const tag of item.tags || []) {
      tags[tag] = (tags[tag] || 0) + 1;
    }

    if ((item.record_type || "") === "task" && item.tags?.includes("open_task")) {
      openTasks += 1;
    }

    if (item.tags?.includes("safeguarding")) {
      safeguarding += 1;
    }

    if (item.tags?.includes("status:overdue")) {
      overdue += 1;
    }
  }

  return {
    total: evidence.length,
    counts,
    tags,
    open_tasks: openTasks,
    safeguarding_items: safeguarding,
    overdue_items: overdue,
  };
}

function makeSource(item = {}) {
  return {
    type: item.record_type || "record",
    label: item.title || "Record",
    excerpt: item.summary || "",
    section: item.section || "",
    record_type: item.record_type || null,
    record_id: item.source_id || item.id || null,
  };
}

function buildEvidenceSummaryLines(evidence = []) {
  const top = sortEvidence(evidence).slice(0, 5);

  if (!top.length) {
    return ["No supporting records are currently loaded for this view."];
  }

  return top.map((item) => {
    const bits = [
      item.title || "Record",
      item.summary || "",
      item.date ? `(${item.date})` : "",
    ].filter(Boolean);

    return `• ${bits.join(" - ")}`;
  });
}

function buildFallbackReply(message, context, evidence = []) {
  const text = String(message || "").toLowerCase();
  const evidenceSummary = summariseEvidence(evidence);

  if (text.includes("morning brief")) {
    return {
      answer: [
        `Morning brief for ${context.scope === "child" ? context.person.name : context.home.home_name}:`,
        "",
        `• Evidence items reviewed: ${evidenceSummary.total}`,
        `• Open tasks: ${evidenceSummary.open_tasks}`,
        `• Overdue items: ${evidenceSummary.overdue_items}`,
        `• Safeguarding-linked items: ${evidenceSummary.safeguarding_items}`,
        "",
        "What matters this morning:",
        ...buildEvidenceSummaryLines(evidence).slice(0, 3),
        "",
        "Next actions:",
        "• Check urgent follow-up items first",
        "• Review any safeguarding or incident themes",
        "• Confirm today’s appointments, deadlines, and staffing pressures",
      ].join("\n"),
      suggested_actions: [
        { type: "summarise_section", label: "Summarise current section" },
        { type: "create_task", label: "Create action list" },
      ],
    };
  }

  if (text.includes("handover")) {
    return {
      answer: [
        "Here is a simple handover structure:",
        "",
        "1. Presentation and wellbeing",
        "2. Important events or incidents",
        "3. Health, medication, appointments or education updates",
        "4. Family contact or safeguarding context",
        "5. What staff on next shift must do",
        "",
        "Suggested wording:",
        `"${context.scope === "child" ? context.person.name : "The home"} presented as settled for most of the shift. The main point to note is ... Staff should prioritise ... on the next shift."`,
        "",
        "Recent evidence to consider:",
        ...buildEvidenceSummaryLines(evidence).slice(0, 3),
      ].join("\n"),
      suggested_actions: [
        { type: "draft_handover", label: "Draft handover" },
        { type: "summarise_section", label: "Summarise current section" },
      ],
    };
  }

  if (text.includes("risk")) {
    return {
      answer: [
        "Use this risk thinking structure:",
        "",
        "• What is the concern?",
        "• What patterns or triggers are known?",
        "• What are the early warning signs?",
        "• What helps to reduce risk?",
        "• What must adults do if risk increases?",
        "",
        "Suggested prompt for staff:",
        `"Describe the concern factually, note triggers and early signs, record protective factors, and set out practical response actions."`,
        "",
        `Evidence reviewed: ${evidenceSummary.total} item(s).`,
      ].join("\n"),
      suggested_actions: [
        { type: "open_record", record_type: "risk", label: "Open risk assessment" },
      ],
    };
  }

  if (text.includes("compliance") || text.includes("ofsted")) {
    return {
      answer: [
        "For compliance support, check four areas:",
        "",
        "1. Workforce compliance: supervisions, training, induction, probation",
        "2. Child file compliance: PEP, risk, health, plans, statutory visits",
        "3. Home document compliance: Statement of Purpose, Annex A, policies, registers",
        "4. Governance compliance: actions overdue, audits, review cadence, evidence trail",
        "",
        `Current loaded evidence: ${evidenceSummary.total} item(s)`,
        `Overdue items visible: ${evidenceSummary.overdue_items}`,
        "",
        "Best next step: show Red / Amber / Green status by area, then list the top overdue items.",
      ].join("\n"),
      suggested_actions: [
        { type: "summarise_section", label: "Summarise compliance view" },
        { type: "create_task", label: "Create action list" },
      ],
    };
  }

  if (text.includes("summary") || text.includes("summarise")) {
    return {
      answer: [
        `Summary for ${context.section}:`,
        "",
        "• What matters most right now",
        "• Risks or pressures",
        "• Strengths or positives",
        "• Immediate next actions",
        "",
        `Loaded evidence count: ${evidenceSummary.total}`,
        ...buildEvidenceSummaryLines(evidence).slice(0, 4),
      ].join("\n"),
      suggested_actions: [
        { type: "summarise_section", label: "Summarise current section" },
      ],
    };
  }

  return {
    answer: [
      `I can help with the ${context.section} section.`,
      "",
      "Try asking me to:",
      "• draft wording",
      "• summarise what matters",
      "• suggest next actions",
      "• improve tone and clarity",
      "• identify risks, gaps or follow-up",
      "",
      `Loaded evidence count: ${evidenceSummary.total}`,
    ].join("\n"),
    suggested_actions: [
      { type: "summarise_section", label: "Summarise current section" },
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
    answer,
    suggested_actions: Array.isArray(suggested_actions) ? suggested_actions : [],
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

function buildAssistantScopeMeta(context) {
  return {
    scope_type: context.scope,
    section: context.section,
    role: context.role,
  };
}

function buildAssistantContextMeta(context, evidence = []) {
  const summary = summariseEvidence(evidence);

  return {
    current_scope: context.scope,
    current_section: context.section,
    young_person: context.scope === "child" ? context.person : null,
    home: context.home,
    active_record_type: context.active_record_type || null,
    active_record_item: context.active_record_item || null,
    evidence_summary: summary,
    recent_records: {
      incidents: evidence.filter((item) => item.record_type === "incident").slice(0, 5),
      tasks: evidence.filter((item) => item.record_type === "task").slice(0, 5),
      compliance: evidence.filter((item) => item.record_type === "compliance_item").slice(0, 5),
    },
    active_work: {
      tasks: evidence.filter((item) => item.tags?.includes("open_task")).slice(0, 10),
    },
  };
}

export function buildAssistantEvidenceContext(options = {}) {
  const context = buildAssistantContext();
  const rawEvidence = normaliseEvidenceInput(options);
  const scoped = filterEvidenceByScope(rawEvidence, context);
  const sectioned = filterEvidenceBySection(scoped, context.section);
  const ranked = sortEvidence(sectioned);

  return {
    context,
    evidence: ranked,
    system_prompt: buildSystemPrompt(context),
    summary: summariseEvidence(ranked),
  };
}

export function buildMorningBriefContext(options = {}) {
  const runtime = buildAssistantEvidenceContext(options);
  const context = runtime.context;
  const summary = runtime.summary;

  return {
    title:
      context.scope === "child"
        ? `Morning brief: ${context.person.name}`
        : `Morning brief: ${context.home.home_name}`,
    scope: context.scope,
    section: context.section,
    summary,
    evidence: runtime.evidence.slice(0, 10),
  };
}

export function buildManagerBriefContext(options = {}) {
  const runtime = buildAssistantEvidenceContext(options);

  return {
    title: "Manager oversight brief",
    scope: runtime.context.scope,
    section: runtime.context.section,
    summary: runtime.summary,
    evidence: runtime.evidence.slice(0, 12),
  };
}

export function buildQualityBriefContext(options = {}) {
  const runtime = buildAssistantEvidenceContext(options);

  return {
    title: "Quality and RI brief",
    scope: runtime.context.scope,
    section: runtime.context.section,
    summary: runtime.summary,
    evidence: runtime.evidence.slice(0, 12),
  };
}

export async function runAssistantMessage(message, options = {}) {
  const { context, evidence, system_prompt, summary } =
    buildAssistantEvidenceContext(options);

  const useApi = options.useApi === true;

  if (useApi && typeof fetch === "function") {
    try {
      const response = await fetch("/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          context,
          system_prompt,
          evidence,
          summary,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        return createAssistantResponse({
          answer: data.answer || "No answer returned.",
          suggested_actions: Array.isArray(data.suggested_actions)
            ? data.suggested_actions
            : [],
          sources: Array.isArray(data.sources)
            ? data.sources
            : evidence.slice(0, 6).map(makeSource),
          runtime: {
            mode: "api",
            ...data.runtime,
          },
          explainability: {
            scope: context.scope,
            section: context.section,
            evidence_count: evidence.length,
            ...data.explainability,
          },
          assistant_scope: data.assistant_scope || buildAssistantScopeMeta(context),
          assistant_context:
            data.assistant_context || buildAssistantContextMeta(context, evidence),
        });
      }
    } catch (error) {
      console.error("[assistant-runtime] api call failed", error);
    }
  }

  const fallback = buildFallbackReply(message, context, evidence);

  return createAssistantResponse({
    answer: fallback.answer,
    suggested_actions: fallback.suggested_actions || [],
    sources: evidence.slice(0, 6).map(makeSource),
    runtime: {
      mode: "fallback",
    },
    explainability: {
      scope: context.scope,
      section: context.section,
      evidence_count: evidence.length,
      fallback_used: true,
    },
    assistant_scope: buildAssistantScopeMeta(context),
    assistant_context: buildAssistantContextMeta(context, evidence),
  });
}

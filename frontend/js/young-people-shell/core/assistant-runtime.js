import { state } from "../state.js";

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

  return {
    home_id: state.homeId || user.home_id || user.homeId || null,
    home_name: user.home_name || user.homeName || "Home",
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
      ? `Selected young person: ${context.person.name}. Preferred name: ${context.person.preferred_name || "not set"}. Home: ${context.person.home_name || "not set"}. Risk: ${context.person.risk || "not set"}.`
      : `Current home: ${context.home.home_name}.`,
    `Keep responses clear, calm, practical, child-centred where relevant, and operationally useful.`,
    `Prefer structured support: summary, what matters, suggested wording, and next actions.`,
  ].join(" ");
}

function buildFallbackReply(message, context) {
  const text = String(message || "").toLowerCase();

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
        "I can help turn the visible data on screen into a concise operational summary once the section data is loaded.",
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
    ].join("\n"),
    suggested_actions: [
      { type: "summarise_section", label: "Summarise current section" },
      { type: "draft_note", label: "Draft wording" },
    ],
  };
}

export async function runAssistantMessage(message, options = {}) {
  const context = buildAssistantContext();
  const system_prompt = buildSystemPrompt(context);

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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.answer || "No answer returned.",
          suggested_actions: Array.isArray(data.suggested_actions)
            ? data.suggested_actions
            : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          runtime: data.runtime || {},
          explainability: data.explainability || {},
        };
      }
    } catch (error) {
      console.error("[assistant-runtime] api call failed", error);
    }
  }

  const fallback = buildFallbackReply(message, context);

  return {
    answer: fallback.answer,
    suggested_actions: fallback.suggested_actions || [],
    sources: [],
    runtime: {
      mode: "fallback",
    },
    explainability: {
      scope: context.scope,
      section: context.section,
    },
  };
}

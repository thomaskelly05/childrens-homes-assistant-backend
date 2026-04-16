import { buildAssistantEvidenceSet } from "../core/adapters.js";

const INTENT = {
  summary: "summary",
  chronology: "chronology",
  factual: "factual",
  risk: "risk",
  safeguarding: "safeguarding",
  handover: "handover",
  manager: "manager",
  quality: "quality",
  reg45: "reg45",
  unknown: "unknown",
};

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normaliseText(value) {
  return cleanText(value).toLowerCase();
}

function parseDateValue(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

function unique(items = []) {
  return [...new Set((items || []).filter(Boolean))];
}

function limit(items = [], max = 6) {
  return Array.isArray(items) ? items.slice(0, max) : [];
}

function buildCitation(item = {}) {
  return `[${item.record_type || "record"}:${item.source_id || item.id || "unknown"}]`;
}

function formatDate(value) {
  if (!value) return "date not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: String(value).includes("T") ? "short" : undefined,
  });
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildAssistantDataset(payload = {}, options = {}) {
  const evidence = buildAssistantEvidenceSet(payload || {});
  const sortMode = cleanText(options.sort || "urgency").toLowerCase();

  const sorted = [...evidence];

  if (sortMode === "date") {
    sorted.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
    return sorted;
  }

  sorted.sort((a, b) => {
    const urgencyRank = { critical: 4, high: 3, medium: 2, low: 1 };
    const aRank = urgencyRank[a.urgency || "low"] || 0;
    const bRank = urgencyRank[b.urgency || "low"] || 0;

    if (bRank !== aRank) return bRank - aRank;
    return parseDateValue(b.date) - parseDateValue(a.date);
  });

  return sorted;
}

function summariseEvidence(evidence = []) {
  const summary = {
    total: safeArray(evidence).length,
    overdue: 0,
    safeguarding: 0,
    open_tasks: 0,
    incidents: 0,
    appointments: 0,
    documents: 0,
    compliance: 0,
    strengths: 0,
  };

  for (const item of safeArray(evidence)) {
    const tags = safeArray(item.tags);
    const type = item.record_type || "";

    if (tags.includes("status:overdue")) summary.overdue += 1;
    if (tags.includes("safeguarding")) summary.safeguarding += 1;
    if (tags.includes("open_task")) summary.open_tasks += 1;
    if (type === "incident") summary.incidents += 1;
    if (type === "appointment") summary.appointments += 1;
    if (type === "document" || type === "statutory_document") summary.documents += 1;
    if (type === "compliance_item") summary.compliance += 1;
    if (type === "achievement_record") summary.strengths += 1;
  }

  return summary;
}

function extractKeyInsights(evidence = []) {
  const items = safeArray(evidence);
  const insights = [];
  const summary = summariseEvidence(items);

  if (summary.safeguarding > 0) {
    insights.push({
      type: "safeguarding",
      level: "high",
      message: "Safeguarding-linked evidence is present and should be actively reviewed.",
    });
  }

  if (summary.overdue > 0) {
    insights.push({
      type: "overdue",
      level: "medium",
      message: "There are overdue items that may affect oversight, compliance or follow-up.",
    });
  }

  if (summary.incidents > 0) {
    insights.push({
      type: "incidents",
      level: "medium",
      message: "Incident patterns should be reviewed alongside planning, chronology and daily care.",
    });
  }

  if (summary.open_tasks > 0) {
    insights.push({
      type: "tasks",
      level: "medium",
      message: "There are open tasks that may need clearer ownership or timescales.",
    });
  }

  if (summary.strengths > 0) {
    insights.push({
      type: "strengths",
      level: "positive",
      message: "There is positive evidence of achievement or progress that should be recognised.",
    });
  }

  return insights;
}

function buildAssistantResponse(payload = {}, options = {}) {
  const dataset = buildAssistantDataset(payload, options);

  return {
    evidence_count: dataset.length,
    top_sources: limit(dataset, 8).map((item) => ({
      title: item.title || "Record",
      summary: item.summary || "",
      citation: buildCitation(item),
      citation_ref: item.citation_ref || buildCitation(item),
      section: item.section || "",
      record_type: item.record_type || "",
      date: item.date || null,
    })),
    brain_summary: summariseEvidence(dataset),
    brain_insights: extractKeyInsights(dataset),
  };
}

function detectIntent(question = "") {
  const text = normaliseText(question);

  if (/reg\s*45|regulation\s*45/.test(text)) return INTENT.reg45;
  if (/handover|next shift|shift brief|morning brief/.test(text)) return INTENT.handover;
  if (/chronology|timeline|history|in order|over time/.test(text)) return INTENT.chronology;
  if (/risk|harm|trigger|protective factor/.test(text)) return INTENT.risk;
  if (/safeguarding|concern|mash|lado|police|missing/.test(text)) return INTENT.safeguarding;
  if (/manager|oversight|leadership|what should staff do|actions/.test(text)) return INTENT.manager;
  if (/quality|inspection|ofsted|ri|audit|scrutiny/.test(text)) return INTENT.quality;
  if (/when|how many|latest|last|next|date/.test(text)) return INTENT.factual;
  if (/summary|overview|what matters|full overview/.test(text)) return INTENT.summary;

  return INTENT.unknown;
}

function scoreEvidence(item = {}, intent = INTENT.unknown) {
  let score = 0;

  const tags = safeArray(item.tags);
  const urgency = item.urgency || "low";
  const recordType = item.record_type || "";

  if (urgency === "critical") score += 10;
  if (urgency === "high") score += 7;
  if (urgency === "medium") score += 4;

  if (tags.includes("safeguarding")) score += 8;
  if (tags.includes("status:overdue")) score += 7;
  if (tags.includes("follow_up_required")) score += 5;
  if (tags.includes("open_task")) score += 4;
  if (tags.includes("inspection_relevant")) score += 4;
  if (tags.includes("quality_relevant")) score += 4;
  if (tags.includes("handover_relevant")) score += 4;

  if (intent === INTENT.chronology && item.date) score += 6;
  if (intent === INTENT.risk && ["incident", "risk_assessment", "missing_episode", "safeguarding_record"].includes(recordType)) score += 8;
  if (intent === INTENT.safeguarding && ["incident", "missing_episode", "safeguarding_record"].includes(recordType)) score += 10;
  if (intent === INTENT.handover && ["daily_note", "incident", "appointment", "task", "handover_record"].includes(recordType)) score += 8;
  if (intent === INTENT.manager && ["task", "manager_action", "compliance_item", "incident"].includes(recordType)) score += 7;
  if (intent === INTENT.quality && ["audit", "compliance_item", "document", "reg44_item", "reg45_item", "reg40_item"].includes(recordType)) score += 8;
  if (intent === INTENT.reg45 && ["monthly_review", "incident", "achievement_record", "education_record", "health_record", "family_contact_record", "risk_assessment"].includes(recordType)) score += 8;
  if (intent === INTENT.factual && item.date) score += 5;

  return score;
}

function rankEvidence(evidence = [], intent = INTENT.unknown) {
  return [...safeArray(evidence)].sort((a, b) => {
    const scoreA = scoreEvidence(a, intent);
    const scoreB = scoreEvidence(b, intent);

    if (scoreB !== scoreA) return scoreB - scoreA;
    return parseDateValue(b.date) - parseDateValue(a.date);
  });
}

function buildThemes(evidence = []) {
  const themes = [];

  const safeguardingCount = evidence.filter((x) => safeArray(x.tags).includes("safeguarding")).length;
  const overdueCount = evidence.filter((x) => safeArray(x.tags).includes("status:overdue")).length;
  const missingCount = evidence.filter((x) => x.record_type === "missing_episode").length;
  const incidentCount = evidence.filter((x) => x.record_type === "incident").length;
  const taskCount = evidence.filter((x) => safeArray(x.tags).includes("open_task")).length;
  const achievementCount = evidence.filter((x) => x.record_type === "achievement_record").length;

  if (safeguardingCount > 0) {
    themes.push("There are safeguarding-linked records that need active oversight.");
  }

  if (incidentCount > 0) {
    themes.push("There are incident patterns that should be reviewed alongside daily care and planning.");
  }

  if (missingCount > 0) {
    themes.push("Missing-from-care history should be considered when reviewing safety, triggers and disruption patterns.");
  }

  if (overdueCount > 0) {
    themes.push("Some follow-up, compliance or review activity appears overdue.");
  }

  if (taskCount > 0) {
    themes.push("There are active tasks that may require clearer ownership or timescales.");
  }

  if (achievementCount > 0) {
    themes.push("There is positive evidence of progress or achievement that should be recognised in planning and review.");
  }

  return themes;
}

function buildStrengths(evidence = []) {
  const strengths = [];

  const achievements = evidence.filter((x) => x.record_type === "achievement_record");
  const positiveNotes = evidence.filter(
    (x) =>
      x.record_type === "daily_note" &&
      /positive|settled|engaged|calm|achieved|enjoyed|proud|well/i.test(x.summary || "")
  );
  const education = evidence.filter(
    (x) => x.record_type === "education_record" && /engagement|achievement|progress/i.test(x.summary || "")
  );

  if (achievements.length) {
    strengths.push("Achievements are recorded, which supports a strengths-based picture of progress.");
  }

  if (positiveNotes.length) {
    strengths.push("Daily recording shows positive moments or settled presentation that can be built on.");
  }

  if (education.length) {
    strengths.push("There is evidence of educational engagement or progress that should be reinforced.");
  }

  return strengths;
}

function buildGaps(evidence = []) {
  const gaps = [];
  const hasRisk = evidence.some((x) => x.record_type === "risk_assessment");
  const hasPlan = evidence.some((x) => x.record_type === "support_plan");
  const hasFamily = evidence.some((x) => x.record_type === "family_contact_record");
  const hasHealth = evidence.some((x) => x.record_type === "health_record");
  const hasEducation = evidence.some((x) => x.record_type === "education_record");
  const hasChronology = evidence.some((x) => x.record_type === "chronology_event");

  if (!hasRisk) gaps.push("No risk assessment is visible in the current evidence set.");
  if (!hasPlan) gaps.push("No support plan is visible in the current evidence set.");
  if (!hasFamily) gaps.push("Family contact evidence is limited or not visible.");
  if (!hasHealth) gaps.push("Health evidence is limited or not visible.");
  if (!hasEducation) gaps.push("Education evidence is limited or not visible.");
  if (!hasChronology) gaps.push("Chronology evidence is limited or not visible.");

  return gaps;
}

function buildImmediateActions(evidence = []) {
  const actions = [];

  const overdue = evidence.filter((x) => safeArray(x.tags).includes("status:overdue"));
  const safeguarding = evidence.filter((x) => safeArray(x.tags).includes("safeguarding"));
  const appointments = evidence
    .filter((x) => x.record_type === "appointment" && x.date)
    .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date));

  if (safeguarding.length) {
    actions.push("Review safeguarding-linked records at the start of the shift and ensure any immediate protection actions are current.");
  }

  if (overdue.length) {
    actions.push("Check overdue actions, reviews or compliance items and confirm who is responsible for each next step.");
  }

  if (appointments.length) {
    actions.push("Check upcoming appointments, what preparation is needed, and any transport, consent or follow-up arrangements.");
  }

  actions.push("Read the latest records before key interactions so support is consistent, calm and informed.");
  actions.push("Keep the young person’s lived experience, regulation needs and protective factors central to practice today.");

  return unique(actions).slice(0, 5);
}

function buildProfessionalEscalations(evidence = []) {
  const escalations = [];
  const highRisk = evidence.filter((x) => ["high", "critical"].includes(x.urgency));
  const police = evidence.filter((x) => safeArray(x.tags).includes("police_involved"));
  const ofsted = evidence.filter((x) => safeArray(x.tags).includes("ofsted_notified"));

  if (highRisk.length) {
    escalations.push("Manager review may be required where high-risk or critical records remain active or unresolved.");
  }

  if (police.length) {
    escalations.push("Police-linked events should be checked for outcome, follow-up and management oversight.");
  }

  if (ofsted.length) {
    escalations.push("Notification-related records should be checked for completeness and regulatory follow-through.");
  }

  return escalations;
}

function latestRecordOfType(evidence = [], type) {
  return evidence
    .filter((x) => x.record_type === type)
    .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))[0] || null;
}

function nextAppointment(evidence = []) {
  const now = Date.now();

  return evidence
    .filter((x) => x.record_type === "appointment" && x.date)
    .filter((x) => parseDateValue(x.date) >= now)
    .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))[0] || null;
}

function buildChildSummary(context = {}, evidence = []) {
  const name = context.person?.name || "the young person";
  const latestIncident = latestRecordOfType(evidence, "incident");
  const latestDaily = latestRecordOfType(evidence, "daily_note");
  const nextAppt = nextAppointment(evidence);

  const lines = [
    `${name} is currently viewed through the scoped records available to this workspace.`,
  ];

  if (context.person?.placement_status) {
    lines.push(`Placement status: ${context.person.placement_status}.`);
  }

  if (context.person?.risk) {
    lines.push(`Current recorded risk level: ${context.person.risk}.`);
  }

  if (latestDaily) {
    lines.push(`Latest daily care evidence: ${latestDaily.summary} ${buildCitation(latestDaily)}`);
  }

  if (latestIncident) {
    lines.push(`Latest incident evidence: ${latestIncident.summary} ${buildCitation(latestIncident)}`);
  }

  if (nextAppt) {
    lines.push(`Next visible appointment: ${nextAppt.title || "Appointment"} on ${formatDate(nextAppt.date)} ${buildCitation(nextAppt)}`);
  }

  return lines.join(" ");
}

function buildHomeSummary(context = {}, evidence = []) {
  const name = context.home?.home_name || "the home";
  const summary = summariseEvidence(evidence);

  return [
    `${name} is being reviewed using the currently scoped operational evidence.`,
    `There are ${summary.total} visible records in scope.`,
    `Open or overdue activity, incidents, compliance and workforce pressures should be considered together rather than in isolation.`,
  ].join(" ");
}

function buildChronologyText(evidence = [], max = 8) {
  const chronology = [...evidence]
    .filter((x) => x.date)
    .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))
    .slice(-max);

  if (!chronology.length) {
    return "No dated chronology records are visible in the current evidence set.";
  }

  return chronology
    .map(
      (item) =>
        `- ${formatDate(item.date)}: ${item.title || "Record"} — ${item.summary} ${buildCitation(item)}`
    )
    .join("\n");
}

function buildFactualAnswer(question = "", evidence = []) {
  const text = normaliseText(question);

  if (/next appointment/.test(text)) {
    const item = nextAppointment(evidence);
    if (!item) return "No upcoming appointment is visible in the current scoped evidence.";
    return `The next visible appointment is ${item.title || "Appointment"} on ${formatDate(item.date)} ${buildCitation(item)}.`;
  }

  if (/last incident|latest incident/.test(text)) {
    const item = latestRecordOfType(evidence, "incident");
    if (!item) return "No incident is visible in the current scoped evidence.";
    return `The latest visible incident is dated ${formatDate(item.date)} and is recorded as: ${item.summary} ${buildCitation(item)}.`;
  }

  if (/last family contact|latest family contact/.test(text)) {
    const item = latestRecordOfType(evidence, "family_contact_record");
    if (!item) return "No family contact record is visible in the current scoped evidence.";
    return `The latest visible family contact record is dated ${formatDate(item.date)} and notes: ${item.summary} ${buildCitation(item)}.`;
  }

  return "I can answer date-based questions from the currently scoped evidence, but I cannot see a direct match for that question yet.";
}

function buildSummaryAnswer(context = {}, evidence = []) {
  const summaryIntro =
    context.scope === "child"
      ? buildChildSummary(context, evidence)
      : buildHomeSummary(context, evidence);

  const themes = buildThemes(evidence);
  const strengths = buildStrengths(evidence);
  const gaps = buildGaps(evidence);
  const actions = buildImmediateActions(evidence);
  const escalations = buildProfessionalEscalations(evidence);

  return [
    "Overview",
    summaryIntro,
    "",
    "Key themes",
    ...(themes.length ? themes.map((x) => `- ${x}`) : ["- No strong theme is visible from the current evidence set."]),
    "",
    "Strengths and positives",
    ...(strengths.length ? strengths.map((x) => `- ${x}`) : ["- Positive or strengths-based evidence is limited in the currently visible records."]),
    "",
    "Gaps or areas needing stronger evidence",
    ...(gaps.length ? gaps.map((x) => `- ${x}`) : ["- No obvious evidence gap is visible from the currently scoped records."]),
    "",
    "What staff should be doing right now",
    ...actions.map((x) => `- ${x}`),
    "",
    "Professional escalation to consider",
    ...(escalations.length ? escalations.map((x) => `- ${x}`) : ["- No immediate escalation is clearly indicated by the currently visible evidence alone."]),
  ].join("\n");
}

function buildRiskAnswer(context = {}, evidence = []) {
  const ranked = rankEvidence(evidence, INTENT.risk).slice(0, 8);
  const actions = buildImmediateActions(evidence);

  return [
    "Risk overview",
    context.scope === "child"
      ? `This risk view relates to ${context.person?.name || "the young person"} and uses only the currently scoped records.`
      : `This risk view relates to ${context.home?.home_name || "the home"} and uses only the currently scoped records.`,
    "",
    "Most relevant risk evidence",
    ...(ranked.length
      ? ranked.map((item) => `- ${item.title || "Record"}: ${item.summary} ${buildCitation(item)}`)
      : ["- No high-priority risk evidence is visible in the current scope."]),
    "",
    "Immediate actions",
    ...actions.map((x) => `- ${x}`),
  ].join("\n");
}

function buildHandoverAnswer(context = {}, evidence = []) {
  const ranked = rankEvidence(evidence, INTENT.handover).slice(0, 6);
  const nextAppt = nextAppointment(evidence);

  return [
    "Residential handover",
    context.scope === "child"
      ? `This handover is focused on ${context.person?.name || "the young person"}.`
      : `This handover is focused on ${context.home?.home_name || "the home"}.`,
    "",
    "What matters at the start of the shift",
    ...(ranked.length
      ? ranked.map((item) => `- ${item.summary} ${buildCitation(item)}`)
      : ["- No recent handover-relevant evidence is visible in the current scope."]),
    "",
    "Upcoming appointment",
    nextAppt
      ? `- ${nextAppt.title || "Appointment"} on ${formatDate(nextAppt.date)} ${buildCitation(nextAppt)}`
      : "- No upcoming appointment is visible in the current scope.",
    "",
    "What staff should do next",
    ...buildImmediateActions(evidence).map((x) => `- ${x}`),
  ].join("\n");
}

function buildManagerAnswer(context = {}, evidence = []) {
  const insights = extractKeyInsights(evidence);
  const actions = buildImmediateActions(evidence);
  const escalations = buildProfessionalEscalations(evidence);

  return [
    "Manager oversight brief",
    context.scope === "child"
      ? `This oversight brief is scoped to ${context.person?.name || "the young person"}.`
      : `This oversight brief is scoped to ${context.home?.home_name || "the home"}.`,
    "",
    "Key oversight points",
    ...(insights.length
      ? insights.map((x) => `- ${x.message}`)
      : ["- No major management signal is visible from the current evidence set alone."]),
    "",
    "Management actions",
    ...actions.map((x) => `- ${x}`),
    "",
    "Escalation and scrutiny",
    ...(escalations.length
      ? escalations.map((x) => `- ${x}`)
      : ["- No immediate escalation is clearly indicated by the visible evidence alone."]),
  ].join("\n");
}

function buildQualityAnswer(context = {}, evidence = []) {
  const summary = summariseEvidence(evidence);
  const gaps = buildGaps(evidence);

  return [
    "Quality and inspection-readiness brief",
    context.scope === "child"
      ? `This quality brief is scoped to ${context.person?.name || "the young person"}.`
      : `This quality brief is scoped to ${context.home?.home_name || "the home"}.`,
    "",
    `Visible evidence count: ${summary.total}`,
    `Overdue items: ${summary.overdue}`,
    `Safeguarding-linked items: ${summary.safeguarding}`,
    "",
    "Inspection and scrutiny themes",
    ...buildThemes(evidence).map((x) => `- ${x}`),
    "",
    "Evidence gaps",
    ...(gaps.length ? gaps.map((x) => `- ${x}`) : ["- No obvious gap is visible from the current evidence set."]),
  ].join("\n");
}

function buildReg45Answer(context = {}, evidence = []) {
  const strengths = buildStrengths(evidence);
  const themes = buildThemes(evidence);
  const gaps = buildGaps(evidence);

  return [
    "Reg 45 review support",
    context.scope === "child"
      ? `This Reg 45 support summary is scoped to ${context.person?.name || "the young person"} and should be read alongside the full reporting period.`
      : `This Reg 45 support summary is scoped to ${context.home?.home_name || "the home"} and should be read alongside the full reporting period.`,
    "",
    "Progress, experience and positives",
    ...(strengths.length ? strengths.map((x) => `- ${x}`) : ["- Positive outcomes should be strengthened further in the visible evidence set."]),
    "",
    "Themes requiring review",
    ...(themes.length ? themes.map((x) => `- ${x}`) : ["- No strong review theme is visible from the current evidence alone."]),
    "",
    "Evidence gaps to address before finalising the report",
    ...(gaps.length ? gaps.map((x) => `- ${x}`) : ["- No obvious evidence gap is visible from the current scope."]),
  ].join("\n");
}

function buildUnknownAnswer(context = {}, evidence = []) {
  return [
    context.scope === "child"
      ? `I can help with ${context.person?.name || "this young person"} using the currently scoped children’s home records.`
      : `I can help with ${context.home?.home_name || "this home"} using the currently scoped operational records.`,
    "",
    "Try asking for:",
    "- a full overview",
    "- chronology",
    "- latest incident or next appointment",
    "- risks and what staff should do right now",
    "- a handover",
    "- a manager or quality brief",
    "",
    `Current evidence visible: ${evidence.length} record(s).`,
  ].join("\n");
}

function inferSuggestedActions(intent = INTENT.unknown, evidence = []) {
  const actions = [];

  if ([INTENT.summary, INTENT.unknown].includes(intent)) {
    actions.push("Draft summary");
  }

  if ([INTENT.handover, INTENT.manager].includes(intent)) {
    actions.push("Draft handover");
  }

  if ([INTENT.quality, INTENT.reg45].includes(intent)) {
    actions.push("Build quality brief");
  }

  if (evidence.some((x) => safeArray(x.tags).includes("status:overdue"))) {
    actions.push("Review overdue items");
  }

  if (evidence.some((x) => safeArray(x.tags).includes("safeguarding"))) {
    actions.push("Review safeguarding records");
  }

  return unique(actions).slice(0, 6);
}

export function askAssistantBrain(question, payload = {}, options = {}) {
  const intent = detectIntent(question);
  const evidence = buildAssistantDataset(payload, {
    ...options,
    sort: intent === INTENT.factual ? "date" : "urgency",
  });

  const context = options.context || {};
  let answer = "";

  switch (intent) {
    case INTENT.summary:
      answer = buildSummaryAnswer(context, evidence);
      break;
    case INTENT.chronology:
      answer = buildChronologyText(evidence, 10);
      break;
    case INTENT.factual:
      answer = buildFactualAnswer(question, evidence);
      break;
    case INTENT.risk:
    case INTENT.safeguarding:
      answer = buildRiskAnswer(context, evidence);
      break;
    case INTENT.handover:
      answer = buildHandoverAnswer(context, evidence);
      break;
    case INTENT.manager:
      answer = buildManagerAnswer(context, evidence);
      break;
    case INTENT.quality:
      answer = buildQualityAnswer(context, evidence);
      break;
    case INTENT.reg45:
      answer = buildReg45Answer(context, evidence);
      break;
    default:
      answer = buildUnknownAnswer(context, evidence);
      break;
  }

  return {
    answer,
    intent,
    evidence_count: evidence.length,
    summary: summariseEvidence(evidence),
    insights: extractKeyInsights(evidence),
    suggested_actions: inferSuggestedActions(intent, evidence),
    top_sources: limit(evidence, 8).map((item) => ({
      title: item.title || "Record",
      summary: item.summary || "",
      citation: buildCitation(item),
      citation_ref: item.citation_ref || buildCitation(item),
      section: item.section || "",
      record_type: item.record_type || "",
      date: item.date || null,
    })),
  };
}

export function buildMorningBrief(question = "morning brief", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, options);
}

export function buildManagerBrief(question = "manager oversight brief", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, options);
}

export function buildQualityBrief(question = "quality and inspection brief", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, options);
}

export function buildReg45Support(question = "reg 45 review", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, options);
}

export function buildFullAssistantPack(question, payload = {}, options = {}) {
  const base = buildAssistantResponse(payload, options);
  const brain = askAssistantBrain(question, payload, options);

  return {
    ...base,
    answer: brain.answer,
    intent: brain.intent,
    suggested_actions: brain.suggested_actions,
    top_sources: brain.top_sources,
    brain_summary: brain.summary,
    brain_insights: brain.insights,
  };
}

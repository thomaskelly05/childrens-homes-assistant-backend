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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(items = []) {
  return [...new Set(safeArray(items).filter(Boolean))];
}

function limit(items = [], max = 6) {
  return safeArray(items).slice(0, max);
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

function daysBetween(dateValue, now = Date.now()) {
  const time = parseDateValue(dateValue);
  if (!time) return null;
  return Math.floor((now - time) / 86400000);
}

function getAnalysisLens(options = {}) {
  return options?.context?.analysis_lens || options?.analysis_lens || "general";
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
    high_priority: 0,
    critical_priority: 0,
    missing_episodes: 0,
    records_last_24h: 0,
    records_last_7d: 0,
    records_last_30d: 0,
    latest_record_date: null,
    oldest_record_date: null,
  };

  const dated = safeArray(evidence)
    .filter((item) => item.date && parseDateValue(item.date))
    .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date));

  if (dated.length) {
    summary.oldest_record_date = dated[0].date;
    summary.latest_record_date = dated[dated.length - 1].date;
  }

  for (const item of safeArray(evidence)) {
    const tags = safeArray(item.tags);
    const type = item.record_type || "";
    const urgency = item.urgency || "";
    const age = daysBetween(item.date);

    if (age !== null && age <= 1) summary.records_last_24h += 1;
    if (age !== null && age <= 7) summary.records_last_7d += 1;
    if (age !== null && age <= 30) summary.records_last_30d += 1;

    if (tags.includes("status:overdue")) summary.overdue += 1;
    if (tags.includes("safeguarding")) summary.safeguarding += 1;
    if (tags.includes("open_task")) summary.open_tasks += 1;
    if (type === "incident") summary.incidents += 1;
    if (type === "appointment") summary.appointments += 1;
    if (type === "document" || type === "statutory_document") summary.documents += 1;
    if (type === "compliance_item") summary.compliance += 1;
    if (type === "achievement_record") summary.strengths += 1;
    if (type === "missing_episode") summary.missing_episodes += 1;
    if (urgency === "high") summary.high_priority += 1;
    if (urgency === "critical") summary.critical_priority += 1;
  }

  return summary;
}

function resolveConfidence(evidence = [], summary = summariseEvidence(evidence)) {
  if (!summary.total) {
    return {
      confidence: "low",
      confidence_reason:
        "No scoped evidence is currently visible, so the assistant cannot give a reliable evidence-led answer.",
    };
  }

  if (summary.total >= 20 && summary.records_last_30d >= 5) {
    return {
      confidence: "high",
      confidence_reason: `Based on ${summary.total} scoped records, including ${summary.records_last_30d} from the last 30 days.`,
    };
  }

  if (summary.total >= 5) {
    return {
      confidence: "medium",
      confidence_reason: `Based on ${summary.total} scoped records. Some areas may still need checking against the full record.`,
    };
  }

  return {
    confidence: "low",
    confidence_reason: `Only ${summary.total} scoped record(s) are visible, so this should be treated as a limited view.`,
  };
}

function extractKeyInsights(evidence = [], lens = "general") {
  const items = safeArray(evidence);
  const insights = [];
  const summary = summariseEvidence(items);

  if (summary.safeguarding > 0) {
    insights.push({
      type: "safeguarding",
      level: "high",
      message:
        "Safeguarding-linked evidence is present and should be actively reviewed.",
    });
  }

  if (summary.overdue > 0) {
    insights.push({
      type: "overdue",
      level: "medium",
      message:
        "There are overdue items that may affect oversight, compliance or follow-up.",
    });
  }

  if (summary.incidents > 0) {
    insights.push({
      type: "incidents",
      level: "medium",
      message:
        "Incident patterns should be reviewed alongside planning, chronology and daily care.",
    });
  }

  if (summary.open_tasks > 0) {
    insights.push({
      type: "tasks",
      level: "medium",
      message:
        "There are open tasks that may need clearer ownership or timescales.",
    });
  }

  if (summary.strengths > 0) {
    insights.push({
      type: "strengths",
      level: "positive",
      message:
        "There is positive evidence of achievement or progress that should be recognised.",
    });
  }

  if (lens === "manager" && summary.critical_priority > 0) {
    insights.push({
      type: "manager",
      level: "high",
      message:
        "Critical-priority records suggest a need for active management grip and review.",
    });
  }

  if ((lens === "quality" || lens === "inspection") && summary.compliance > 0) {
    insights.push({
      type: "quality",
      level: "high",
      message:
        "Compliance-linked records should be checked for completeness, drift and inspection exposure.",
    });
  }

  return insights;
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

function scoreEvidence(item = {}, intent = INTENT.unknown, lens = "general") {
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

  if (
    intent === INTENT.risk &&
    ["incident", "risk_assessment", "missing_episode", "safeguarding_record"].includes(recordType)
  ) {
    score += 8;
  }

  if (
    intent === INTENT.safeguarding &&
    ["incident", "missing_episode", "safeguarding_record"].includes(recordType)
  ) {
    score += 10;
  }

  if (
    intent === INTENT.handover &&
    ["daily_note", "incident", "appointment", "task", "handover_record"].includes(recordType)
  ) {
    score += 8;
  }

  if (
    intent === INTENT.manager &&
    ["task", "manager_action", "compliance_item", "incident"].includes(recordType)
  ) {
    score += 7;
  }

  if (
    intent === INTENT.quality &&
    ["audit", "compliance_item", "document", "reg44_item", "reg45_item", "reg40_item"].includes(recordType)
  ) {
    score += 8;
  }

  if (
    intent === INTENT.reg45 &&
    [
      "monthly_review",
      "incident",
      "achievement_record",
      "education_record",
      "health_record",
      "family_contact_record",
      "risk_assessment",
    ].includes(recordType)
  ) {
    score += 8;
  }

  if (intent === INTENT.factual && item.date) score += 5;

  if (lens === "safeguarding" && tags.includes("safeguarding")) score += 5;
  if (lens === "manager" && (tags.includes("open_task") || tags.includes("status:overdue"))) score += 4;

  if (
    (lens === "quality" || lens === "inspection") &&
    ["compliance_item", "document", "audit"].includes(recordType)
  ) {
    score += 5;
  }

  if (lens === "shift" && ["daily_note", "incident", "appointment", "task"].includes(recordType)) {
    score += 4;
  }

  return score;
}

function rankEvidence(evidence = [], intent = INTENT.unknown, lens = "general") {
  return [...safeArray(evidence)].sort((a, b) => {
    const scoreA = scoreEvidence(a, intent, lens);
    const scoreB = scoreEvidence(b, intent, lens);

    if (scoreB !== scoreA) return scoreB - scoreA;
    return parseDateValue(b.date) - parseDateValue(a.date);
  });
}

function buildThemes(evidence = [], lens = "general") {
  const themes = [];

  const safeguardingCount = evidence.filter((item) => safeArray(item.tags).includes("safeguarding")).length;
  const overdueCount = evidence.filter((item) => safeArray(item.tags).includes("status:overdue")).length;
  const missingCount = evidence.filter((item) => item.record_type === "missing_episode").length;
  const incidentCount = evidence.filter((item) => item.record_type === "incident").length;
  const taskCount = evidence.filter((item) => safeArray(item.tags).includes("open_task")).length;
  const achievementCount = evidence.filter((item) => item.record_type === "achievement_record").length;
  const complianceCount = evidence.filter((item) => item.record_type === "compliance_item").length;

  if (safeguardingCount > 0) themes.push("There are safeguarding-linked records that need active oversight.");
  if (incidentCount > 0) themes.push("There are incident patterns that should be reviewed alongside daily care and planning.");
  if (missingCount > 0) themes.push("Missing-from-care history should be considered when reviewing safety, triggers and disruption patterns.");
  if (overdueCount > 0) themes.push("Some follow-up, compliance or review activity appears overdue.");
  if (taskCount > 0) themes.push("There are active tasks that may require clearer ownership or timescales.");
  if (achievementCount > 0) themes.push("There is positive evidence of progress or achievement that should be recognised in planning and review.");

  if ((lens === "quality" || lens === "inspection") && complianceCount > 0) {
    themes.push("Compliance-related material should be checked for drift, sufficiency and inspection exposure.");
  }

  return themes;
}

function buildStrengths(evidence = []) {
  const strengths = [];

  const achievements = evidence.filter((item) => item.record_type === "achievement_record");
  const positiveNotes = evidence.filter(
    (item) =>
      item.record_type === "daily_note" &&
      /positive|settled|engaged|calm|achieved|enjoyed|proud|well/i.test(item.summary || "")
  );
  const education = evidence.filter(
    (item) =>
      item.record_type === "education_record" &&
      /engagement|achievement|progress/i.test(item.summary || "")
  );

  if (achievements.length) strengths.push("Achievements are recorded, which supports a strengths-based picture of progress.");
  if (positiveNotes.length) strengths.push("Daily recording shows positive moments or settled presentation that can be built on.");
  if (education.length) strengths.push("There is evidence of educational engagement or progress that should be reinforced.");

  return strengths;
}

function buildGaps(evidence = []) {
  const gaps = [];

  const hasRisk = evidence.some((item) => item.record_type === "risk_assessment");
  const hasPlan = evidence.some((item) => item.record_type === "support_plan");
  const hasFamily = evidence.some((item) => item.record_type === "family_contact_record");
  const hasHealth = evidence.some((item) => item.record_type === "health_record");
  const hasEducation = evidence.some((item) => item.record_type === "education_record");
  const hasChronology = evidence.some((item) => item.record_type === "chronology_event");

  if (!hasRisk) gaps.push("No risk assessment is visible in the current evidence set.");
  if (!hasPlan) gaps.push("No support plan is visible in the current evidence set.");
  if (!hasFamily) gaps.push("Family contact evidence is limited or not visible.");
  if (!hasHealth) gaps.push("Health evidence is limited or not visible.");
  if (!hasEducation) gaps.push("Education evidence is limited or not visible.");
  if (!hasChronology) gaps.push("Chronology evidence is limited or not visible.");

  return gaps;
}

function buildImmediateActions(evidence = [], lens = "general") {
  const actions = [];

  const overdue = evidence.filter((item) => safeArray(item.tags).includes("status:overdue"));
  const safeguarding = evidence.filter((item) => safeArray(item.tags).includes("safeguarding"));
  const appointments = evidence
    .filter((item) => item.record_type === "appointment" && item.date)
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

  if (lens === "manager") {
    actions.push("Check whether actions, incidents and review activity show sufficient management grip and follow-through.");
  }

  if (lens === "quality" || lens === "inspection") {
    actions.push("Check whether the visible evidence is inspection-ready, complete and triangulated across records.");
  }

  actions.push("Read the latest records before key interactions so support is consistent, calm and informed.");
  actions.push("Keep the young person’s lived experience, regulation needs and protective factors central to practice today.");

  return unique(actions).slice(0, 6);
}

function buildProfessionalEscalations(evidence = [], lens = "general") {
  const escalations = [];

  const highRisk = evidence.filter((item) => ["high", "critical"].includes(item.urgency));
  const police = evidence.filter((item) => safeArray(item.tags).includes("police_involved"));
  const ofsted = evidence.filter((item) => safeArray(item.tags).includes("ofsted_notified"));

  if (highRisk.length) {
    escalations.push("Manager review may be required where high-risk or critical records remain active or unresolved.");
  }

  if (police.length) {
    escalations.push("Police-linked events should be checked for outcome, follow-up and management oversight.");
  }

  if (ofsted.length) {
    escalations.push("Notification-related records should be checked for completeness and regulatory follow-through.");
  }

  if (lens === "quality" || lens === "inspection") {
    escalations.push("Repeated shortfalls should be considered at governance level, not only as isolated operational tasks.");
  }

  return unique(escalations);
}

function buildSafeguardingDisclaimer(summary = {}) {
  if (!summary.safeguarding && !summary.critical_priority && !summary.high_priority) return "";

  return [
    "Safeguarding note",
    "This does not replace professional safeguarding judgement. If there is immediate risk of harm, staff must follow the home’s safeguarding procedure, management escalation route and emergency response process.",
    "",
  ].join("\n");
}

function recommendedRecordsToCreate(evidence = [], lens = "general") {
  const gaps = buildGaps(evidence);
  const recommendations = [];

  if (gaps.some((gap) => /risk assessment/i.test(gap))) recommendations.push("Risk assessment review");
  if (gaps.some((gap) => /support plan/i.test(gap))) recommendations.push("Support plan update");
  if (evidence.some((item) => safeArray(item.tags).includes("safeguarding"))) recommendations.push("Safeguarding follow-up note");
  if (evidence.some((item) => safeArray(item.tags).includes("status:overdue"))) recommendations.push("Management oversight note");
  if (lens === "quality" || lens === "inspection") recommendations.push("Reg 45 evidence note");

  return unique(recommendations).slice(0, 5);
}

function latestRecordOfType(evidence = [], type) {
  return (
    evidence
      .filter((item) => item.record_type === type)
      .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))[0] || null
  );
}

function nextAppointment(evidence = []) {
  const now = Date.now();

  return (
    evidence
      .filter((item) => item.record_type === "appointment" && item.date)
      .filter((item) => parseDateValue(item.date) >= now)
      .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))[0] || null
  );
}

function buildChildSummary(context = {}, evidence = []) {
  const name = context.person?.name || context.young_person_name || "the young person";
  const latestIncident = latestRecordOfType(evidence, "incident");
  const latestDaily = latestRecordOfType(evidence, "daily_note");
  const nextAppt = nextAppointment(evidence);

  const lines = [
    `${name} is currently viewed through the scoped records available to this workspace.`,
  ];

  if (context.person?.placement_status || context.placement_status) {
    lines.push(`Placement status: ${context.person?.placement_status || context.placement_status}.`);
  }

  if (context.person?.risk || context.summary_risk_level) {
    lines.push(`Current recorded risk level: ${context.person?.risk || context.summary_risk_level}.`);
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
  const name = context.home?.home_name || context.home_name || "the home";
  const summary = summariseEvidence(evidence);

  return [
    `${name} is being reviewed using the currently scoped operational evidence.`,
    `There are ${summary.total} visible records in scope.`,
    "Open or overdue activity, incidents, compliance and workforce pressures should be considered together rather than in isolation.",
  ].join(" ");
}

function buildChronologyText(evidence = [], max = 8) {
  const chronology = [...evidence]
    .filter((item) => item.date)
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

function buildNoEvidenceAnswer(context = {}) {
  return [
    "Overview",
    context.scope === "child"
      ? `I cannot see enough evidence for ${context.person?.name || context.young_person_name || "this young person"} to give a reliable answer.`
      : `I cannot see enough evidence for ${context.home?.home_name || context.home_name || "this home"} to give a reliable answer.`,
    "",
    "What to check",
    "- Confirm the correct young person, home or quality scope is selected.",
    "- Confirm records have loaded successfully.",
    "- Check whether the date range or selected section is too narrow.",
    "- Add or review the core records before relying on an assistant summary.",
  ].join("\n");
}

function buildSummaryAnswer(context = {}, evidence = [], lens = "general") {
  const summary = summariseEvidence(evidence);

  if (!summary.total) return buildNoEvidenceAnswer(context);

  const summaryIntro =
    context.scope === "child"
      ? buildChildSummary(context, evidence)
      : buildHomeSummary(context, evidence);

  const themes = buildThemes(evidence, lens);
  const strengths = buildStrengths(evidence);
  const gaps = buildGaps(evidence);
  const actions = buildImmediateActions(evidence, lens);
  const escalations = buildProfessionalEscalations(evidence, lens);
  const recommended = recommendedRecordsToCreate(evidence, lens);

  return [
    buildSafeguardingDisclaimer(summary),
    "Overview",
    summaryIntro,
    "",
    `Reasoning lens: ${lens}`,
    `Evidence freshness: latest visible record ${summary.latest_record_date ? formatDate(summary.latest_record_date) : "not dated"}.`,
    "",
    "Key themes",
    ...(themes.length ? themes.map((item) => `- ${item}`) : ["- No strong theme is visible from the current evidence set."]),
    "",
    "Strengths and positives",
    ...(strengths.length ? strengths.map((item) => `- ${item}`) : ["- Positive or strengths-based evidence is limited in the currently visible records."]),
    "",
    "Gaps or areas needing stronger evidence",
    ...(gaps.length ? gaps.map((item) => `- ${item}`) : ["- No obvious evidence gap is visible from the currently scoped records."]),
    "",
    "What staff should be doing right now",
    ...actions.map((item) => `- ${item}`),
    "",
    "Professional escalation to consider",
    ...(escalations.length ? escalations.map((item) => `- ${item}`) : ["- No immediate escalation is clearly indicated by the currently visible evidence alone."]),
    "",
    "Recommended next record to create",
    ...(recommended.length ? recommended.map((item) => `- ${item}`) : ["- No specific missing record type is strongly indicated by the current evidence."]),
  ].filter(Boolean).join("\n");
}

function buildRiskAnswer(context = {}, evidence = [], lens = "safeguarding") {
  const summary = summariseEvidence(evidence);
  const ranked = rankEvidence(evidence, INTENT.risk, lens).slice(0, 8);
  const actions = buildImmediateActions(evidence, lens);

  return [
    buildSafeguardingDisclaimer(summary),
    "Risk overview",
    context.scope === "child"
      ? `This risk view relates to ${context.person?.name || context.young_person_name || "the young person"} and uses only the currently scoped records.`
      : `This risk view relates to ${context.home?.home_name || context.home_name || "the home"} and uses only the currently scoped records.`,
    "",
    `Reasoning lens: ${lens}`,
    "",
    "Most relevant risk evidence",
    ...(ranked.length
      ? ranked.map((item) => `- ${item.title || "Record"}: ${item.summary} ${buildCitation(item)}`)
      : ["- No high-priority risk evidence is visible in the current scope."]),
    "",
    "Immediate actions",
    ...actions.map((item) => `- ${item}`),
  ].filter(Boolean).join("\n");
}

function buildHandoverAnswer(context = {}, evidence = [], lens = "shift") {
  const ranked = rankEvidence(evidence, INTENT.handover, lens).slice(0, 6);
  const nextAppt = nextAppointment(evidence);

  return [
    "Residential handover",
    context.scope === "child"
      ? `This handover is focused on ${context.person?.name || context.young_person_name || "the young person"}.`
      : `This handover is focused on ${context.home?.home_name || context.home_name || "the home"}.`,
    "",
    `Reasoning lens: ${lens}`,
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
    ...buildImmediateActions(evidence, lens).map((item) => `- ${item}`),
  ].join("\n");
}

function buildManagerAnswer(context = {}, evidence = [], lens = "manager") {
  const insights = extractKeyInsights(evidence, lens);
  const actions = buildImmediateActions(evidence, lens);
  const escalations = buildProfessionalEscalations(evidence, lens);

  return [
    "Manager oversight brief",
    context.scope === "child"
      ? `This oversight brief is scoped to ${context.person?.name || context.young_person_name || "the young person"}.`
      : `This oversight brief is scoped to ${context.home?.home_name || context.home_name || "the home"}.`,
    "",
    `Reasoning lens: ${lens}`,
    "",
    "Key oversight points",
    ...(insights.length
      ? insights.map((item) => `- ${item.message}`)
      : ["- No major management signal is visible from the current evidence set alone."]),
    "",
    "Management actions",
    ...actions.map((item) => `- ${item}`),
    "",
    "Escalation and scrutiny",
    ...(escalations.length
      ? escalations.map((item) => `- ${item}`)
      : ["- No immediate escalation is clearly indicated by the visible evidence alone."]),
  ].join("\n");
}

function buildQualityAnswer(context = {}, evidence = [], lens = "quality") {
  const summary = summariseEvidence(evidence);
  const gaps = buildGaps(evidence);

  return [
    "Quality and inspection-readiness brief",
    context.scope === "child"
      ? `This quality brief is scoped to ${context.person?.name || context.young_person_name || "the young person"}.`
      : `This quality brief is scoped to ${context.home?.home_name || context.home_name || "the home"}.`,
    "",
    `Reasoning lens: ${lens}`,
    "",
    `Visible evidence count: ${summary.total}`,
    `Overdue items: ${summary.overdue}`,
    `Safeguarding-linked items: ${summary.safeguarding}`,
    `Compliance-linked items: ${summary.compliance}`,
    `Latest visible record: ${summary.latest_record_date ? formatDate(summary.latest_record_date) : "not dated"}`,
    "",
    "Inspection and scrutiny themes",
    ...(buildThemes(evidence, lens).length ? buildThemes(evidence, lens).map((item) => `- ${item}`) : ["- No strong inspection theme is visible from the current evidence."]),
    "",
    "Evidence gaps",
    ...(gaps.length ? gaps.map((item) => `- ${item}`) : ["- No obvious gap is visible from the current evidence set."]),
  ].join("\n");
}

function buildReg45Answer(context = {}, evidence = [], lens = "quality") {
  const strengths = buildStrengths(evidence);
  const themes = buildThemes(evidence, lens);
  const gaps = buildGaps(evidence);

  return [
    "Reg 45 review support",
    context.scope === "child"
      ? `This Reg 45 support summary is scoped to ${context.person?.name || context.young_person_name || "the young person"} and should be read alongside the full reporting period.`
      : `This Reg 45 support summary is scoped to ${context.home?.home_name || context.home_name || "the home"} and should be read alongside the full reporting period.`,
    "",
    `Reasoning lens: ${lens}`,
    "",
    "Progress, experience and positives",
    ...(strengths.length ? strengths.map((item) => `- ${item}`) : ["- Positive outcomes should be strengthened further in the visible evidence set."]),
    "",
    "Themes requiring review",
    ...(themes.length ? themes.map((item) => `- ${item}`) : ["- No strong review theme is visible from the current evidence alone."]),
    "",
    "Evidence gaps to address before finalising the report",
    ...(gaps.length ? gaps.map((item) => `- ${item}`) : ["- No obvious evidence gap is visible from the current scope."]),
  ].join("\n");
}

function buildUnknownAnswer(context = {}, evidence = []) {
  return [
    context.scope === "child"
      ? `I can help with ${context.person?.name || context.young_person_name || "this young person"} using the currently scoped children’s home records.`
      : `I can help with ${context.home?.home_name || context.home_name || "this home"} using the currently scoped operational records.`,
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

function inferSuggestedActions(intent = INTENT.unknown, evidence = [], lens = "general") {
  const actions = [];

  if ([INTENT.summary, INTENT.unknown].includes(intent)) actions.push("Draft summary");
  if ([INTENT.handover, INTENT.manager].includes(intent)) actions.push("Draft handover");
  if ([INTENT.quality, INTENT.reg45].includes(intent)) actions.push("Build quality brief");

  if (evidence.some((item) => safeArray(item.tags).includes("status:overdue"))) {
    actions.push("Review overdue items");
  }

  if (evidence.some((item) => safeArray(item.tags).includes("safeguarding"))) {
    actions.push("Review safeguarding records");
  }

  if (lens === "manager") actions.push("Check management actions");
  if (lens === "quality" || lens === "inspection") actions.push("Check inspection readiness");

  return unique(actions).slice(0, 6);
}

function topSourcesFromEvidence(evidence = []) {
  return limit(evidence, 8).map((item) => ({
    id: item.id || item.source_id || null,
    source_id: item.source_id || item.id || null,
    record_id: item.record_id || item.source_id || item.id || null,
    title: item.title || "Record",
    summary: item.summary || "",
    description: item.summary || "",
    excerpt: item.summary || "",
    citation: buildCitation(item),
    citation_ref: item.citation_ref || buildCitation(item),
    section: item.section || "",
    record_type: item.record_type || "",
    type: item.record_type || "",
    date: item.date || null,
    created_at: item.created_at || item.date || null,
  }));
}

export function askAssistantBrain(question, payload = {}, options = {}) {
  const intent = detectIntent(question);
  const lens = getAnalysisLens(options);

  const evidence = buildAssistantDataset(payload, {
    ...options,
    sort: intent === INTENT.factual ? "date" : "urgency",
  });

  const context = options.context || {};
  const summary = summariseEvidence(evidence);
  const confidence = resolveConfidence(evidence, summary);

  let answer = "";

  switch (intent) {
    case INTENT.summary:
      answer = buildSummaryAnswer(context, evidence, lens);
      break;
    case INTENT.chronology:
      answer = buildChronologyText(evidence, 10);
      break;
    case INTENT.factual:
      answer = buildFactualAnswer(question, evidence);
      break;
    case INTENT.risk:
    case INTENT.safeguarding:
      answer = buildRiskAnswer(context, evidence, lens);
      break;
    case INTENT.handover:
      answer = buildHandoverAnswer(context, evidence, lens);
      break;
    case INTENT.manager:
      answer = buildManagerAnswer(context, evidence, lens);
      break;
    case INTENT.quality:
      answer = buildQualityAnswer(context, evidence, lens);
      break;
    case INTENT.reg45:
      answer = buildReg45Answer(context, evidence, lens);
      break;
    default:
      answer = buildUnknownAnswer(context, evidence);
      break;
  }

  return {
    answer,
    intent,
    analysis_lens: lens,
    evidence_count: evidence.length,
    summary,
    insights: extractKeyInsights(evidence, lens),
    suggested_actions: inferSuggestedActions(intent, evidence, lens),
    top_sources: topSourcesFromEvidence(evidence),
    recommended_records: recommendedRecordsToCreate(evidence, lens),
    confidence: confidence.confidence,
    confidence_reason: confidence.confidence_reason,
  };
}

export function buildMorningBrief(question = "morning brief", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, {
    ...options,
    analysis_lens: options.analysis_lens || "shift",
  });
}

export function buildManagerBrief(question = "manager oversight brief", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, {
    ...options,
    analysis_lens: options.analysis_lens || "manager",
  });
}

export function buildQualityBrief(question = "quality and inspection brief", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, {
    ...options,
    analysis_lens: options.analysis_lens || "quality",
  });
}

export function buildReg45Support(question = "reg 45 review", payload = {}, options = {}) {
  return askAssistantBrain(question, payload, {
    ...options,
    analysis_lens: options.analysis_lens || "quality",
  });
}

export function buildFullAssistantPack(question, payload = {}, options = {}) {
  const dataset = buildAssistantDataset(payload, options);
  const brain = askAssistantBrain(question, payload, options);
  const summary = summariseEvidence(dataset);
  const confidence = resolveConfidence(dataset, summary);

  return {
    evidence_count: dataset.length,
    top_sources: topSourcesFromEvidence(dataset),
    brain_summary: summary,
    brain_insights: extractKeyInsights(dataset, brain.analysis_lens),
    answer: brain.answer,
    intent: brain.intent,
    analysis_lens: brain.analysis_lens,
    suggested_actions: brain.suggested_actions,
    recommended_records: recommendedRecordsToCreate(dataset, brain.analysis_lens),
    confidence: confidence.confidence,
    confidence_reason: confidence.confidence_reason,
  };
}

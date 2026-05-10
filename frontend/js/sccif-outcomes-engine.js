const LOCAL_OUTCOMES_KEY = "indicare.childOutcomes.v1";
const LOCAL_EVIDENCE_KEY = "indicare.sccifEvidence.v1";

export const SCCIF_JUDGEMENT_AREAS = Object.freeze({
  experiences_progress: {
    label: "Children’s experiences and progress",
    description: "Evidence that children are making progress, feel loved, are listened to and have meaningful day-to-day experiences.",
  },
  help_protection: {
    label: "Help and protection",
    description: "Evidence that risks are understood, children are protected and safeguarding action is timely and effective.",
    limiting: true,
  },
  leadership_management: {
    label: "Leadership and management",
    description: "Evidence that leaders know the home well, act on learning and improve quality of care.",
  },
});

export const OUTCOME_DOMAINS = Object.freeze({
  safety: "Feeling safe",
  emotional_wellbeing: "Emotional wellbeing",
  education: "Learning and education",
  health: "Health and wellbeing",
  relationships: "Relationships",
  identity: "Identity and life story",
  independence: "Independence and preparation",
  voice: "Voice, wishes and feelings",
});

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function storageGet(key, fallback) {
  try {
    return safeJsonParse(window.localStorage?.getItem(key), fallback);
  } catch (_) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage?.setItem(key, JSON.stringify(value));
  } catch (_) {}
  return value;
}

function stableId(parts = []) {
  return parts.filter(Boolean).join(":").replace(/[^a-zA-Z0-9:_-]/g, "_");
}

function inferSccifAreas({ sectionId = "", actionType = "", recordType = "" } = {}) {
  const source = `${sectionId} ${actionType} ${recordType}`.toLowerCase();
  const areas = new Set();

  if (/safe|safeguard|risk|incident|missing|medication/.test(source)) areas.add("help_protection");
  if (/daily|education|learning|health|family|relationship|keywork|voice|progress|life-story/.test(source)) areas.add("experiences_progress");
  if (/manager|quality|reg44|reg45|audit|review|approval|action|overdue/.test(source)) areas.add("leadership_management");

  if (!areas.size) areas.add("experiences_progress");
  return [...areas];
}

function inferOutcomeDomains({ sectionId = "", actionType = "" } = {}) {
  const source = `${sectionId} ${actionType}`.toLowerCase();
  const domains = new Set();

  if (/safe|risk|safeguard|incident|missing/.test(source)) domains.add("safety");
  if (/mood|emotion|wellbeing|keywork/.test(source)) domains.add("emotional_wellbeing");
  if (/education|learning|school|pep|ehcp/.test(source)) domains.add("education");
  if (/health|medication|appointment/.test(source)) domains.add("health");
  if (/family|relationship|contact/.test(source)) domains.add("relationships");
  if (/life-story|identity|memory/.test(source)) domains.add("identity");
  if (/independence|transition|leaving/.test(source)) domains.add("independence");
  if (/voice|wishes|feedback|complaint/.test(source)) domains.add("voice");

  if (!domains.size) domains.add("voice");
  return [...domains];
}

export function createEvidenceEntry(input = {}) {
  const createdAt = input.created_at || nowIso();
  const entry = {
    id: input.id || stableId(["evidence", input.child_id, input.section_id, input.source_id, createdAt]),
    child_id: input.child_id || null,
    child_name: input.child_name || "",
    source_id: input.source_id || input.action_id || input.record_id || null,
    source_type: input.source_type || "care_hub_action",
    title: input.title || "Care evidence",
    summary: input.summary || input.body || "Evidence created from Care Hub OS activity.",
    section_id: input.section_id || "",
    sccif_areas: input.sccif_areas || inferSccifAreas(input),
    outcome_domains: input.outcome_domains || inferOutcomeDomains(input),
    quality_standards: input.quality_standards || [],
    impact_note: input.impact_note || "",
    created_at: createdAt,
  };
  return entry;
}

export function saveEvidenceEntry(input = {}) {
  const entry = createEvidenceEntry(input);
  const existing = storageGet(LOCAL_EVIDENCE_KEY, []);
  storageSet(LOCAL_EVIDENCE_KEY, [entry, ...existing].slice(0, 1000));
  window.dispatchEvent(new CustomEvent("indicare:sccif-evidence-created", { detail: entry }));
  return entry;
}

export function listEvidenceEntries() {
  return storageGet(LOCAL_EVIDENCE_KEY, []);
}

export function evidenceBySccifArea() {
  const grouped = Object.keys(SCCIF_JUDGEMENT_AREAS).reduce((acc, key) => ({ ...acc, [key]: [] }), {});
  listEvidenceEntries().forEach((entry) => {
    (entry.sccif_areas || []).forEach((area) => {
      if (!grouped[area]) grouped[area] = [];
      grouped[area].push(entry);
    });
  });
  return grouped;
}

export function outcomeProgressForChild(childId) {
  const outcomes = storageGet(LOCAL_OUTCOMES_KEY, {});
  return outcomes[String(childId || "")] || Object.keys(OUTCOME_DOMAINS).map((domain) => ({
    domain,
    label: OUTCOME_DOMAINS[domain],
    baseline: "Not recorded yet",
    goal: "Set a child-centred goal",
    progress: "not_started",
    evidence_count: listEvidenceEntries().filter((entry) => String(entry.child_id || "") === String(childId || "") && (entry.outcome_domains || []).includes(domain)).length,
    updated_at: "",
  }));
}

export function saveOutcomeProgress(childId, domain, patch = {}) {
  const outcomes = storageGet(LOCAL_OUTCOMES_KEY, {});
  const current = outcomeProgressForChild(childId);
  const next = current.map((item) => item.domain === domain ? { ...item, ...patch, updated_at: nowIso() } : item);
  outcomes[String(childId)] = next;
  storageSet(LOCAL_OUTCOMES_KEY, outcomes);
  window.dispatchEvent(new CustomEvent("indicare:outcome-progress-updated", { detail: { childId, domain, patch } }));
  return next;
}

export function evidenceSummary() {
  const evidence = listEvidenceEntries();
  const grouped = evidenceBySccifArea();
  return {
    total: evidence.length,
    experiences_progress: grouped.experiences_progress?.length || 0,
    help_protection: grouped.help_protection?.length || 0,
    leadership_management: grouped.leadership_management?.length || 0,
    gaps: Object.keys(SCCIF_JUDGEMENT_AREAS).filter((area) => !(grouped[area]?.length)),
  };
}

window.IndiCareSccifOutcomesEngine = Object.freeze({
  SCCIF_JUDGEMENT_AREAS,
  OUTCOME_DOMAINS,
  createEvidenceEntry,
  saveEvidenceEntry,
  listEvidenceEntries,
  evidenceBySccifArea,
  evidenceSummary,
  outcomeProgressForChild,
  saveOutcomeProgress,
});

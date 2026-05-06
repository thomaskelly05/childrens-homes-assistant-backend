export function buildChildEvidence(records = []) {
  const normalised = records.map(normaliseRecord);
  const voice = normalised.filter((record) => has(record.content.child_voice) || has(record.content.voice));
  const changedBecause = normalised.filter((record) => has(record.content.outcome) || has(record.content.actions) || has(record.content.progress));
  const adultResponse = normalised.filter((record) => has(record.content.staff_response) || has(record.content.adult_response) || has(record.content.response));

  return {
    childVoice: {
      count: voice.length,
      evidence: voice.slice(0, 6).map((record) => evidenceLine(record, record.content.child_voice || record.content.voice)),
      gap: voice.length === 0 && normalised.length > 0,
    },
    childImpact: {
      count: changedBecause.length,
      evidence: changedBecause.slice(0, 6).map((record) => evidenceLine(record, record.content.outcome || record.content.actions || record.content.progress)),
      gap: changedBecause.length === 0 && normalised.length > 0,
    },
    adultResponse: {
      count: adultResponse.length,
      evidence: adultResponse.slice(0, 6).map((record) => evidenceLine(record, record.content.staff_response || record.content.adult_response || record.content.response)),
      gap: adultResponse.length === 0 && normalised.length > 0,
    },
    compliance: buildComplianceMap(normalised),
    questions: buildChildCentredQuestions(normalised),
  };
}

export function buildComplianceMap(records = []) {
  const buckets = [
    { key: "experience", title: "Children's experiences and progress", words: ["daily", "identity", "achievement", "independence", "voice", "education", "health", "relationship"] },
    { key: "protection", title: "Help and protection", words: ["incident", "safeguarding", "missing", "risk", "exploitation", "self-harm", "online"] },
    { key: "leadership", title: "Leadership and management", words: ["review", "manager", "approved", "changes_requested", "plan", "audit", "oversight"] },
    { key: "quality_standard_voice", title: "Child voice and wishes", words: ["child_voice", "voice", "wishes", "feelings", "complaint", "choice"] },
    { key: "quality_standard_plans", title: "Plans and assessments", words: ["placement plan", "risk assessment", "behaviour support", "missing plan", "education plan", "health plan"] },
  ];

  return buckets.map((bucket) => {
    const matches = records.filter((record) => bucket.words.some((word) => record.search.includes(word)));
    return {
      key: bucket.key,
      title: bucket.title,
      count: matches.length,
      examples: matches.slice(0, 4).map((record) => ({
        title: record.title || humanise(record.lifeArea || record.type),
        date: record.date,
        summary: record.summary || record.content.what_happened || record.content.description || "Evidence present",
      })),
    };
  });
}

function buildChildCentredQuestions(records) {
  const questions = [];
  const text = records.map((record) => record.search).join(" ");
  if (!records.length) questions.push("What is the child's lived experience today?");
  if (!text.includes("child_voice") && !text.includes("voice")) questions.push("Where is the child's voice, wishes or communication recorded?");
  if (!text.includes("outcome") && !text.includes("progress") && !text.includes("actions")) questions.push("What changed for the child because of adult support?");
  if (text.includes("incident") || text.includes("missing") || text.includes("safeguarding")) questions.push("Do the child's plans and risk assessments need updating?");
  if (!text.includes("strength") && !text.includes("achievement")) questions.push("What strengths, positives or achievements are visible for this child?");
  return questions;
}

function normaliseRecord(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const type = record.record_type || record.type || "record";
  const lifeArea = content.life_area || record.lifeArea || type;
  const date = record.updated_at || record.created_at || record.date || content.date || content.time || "";
  const title = record.title || humanise(lifeArea || type);
  const summary = record.summary || content.what_happened || content.description || content.child_voice || "";
  const search = `${type} ${lifeArea} ${title} ${summary} ${Object.entries(content).map(([key, value]) => `${key} ${value}`).join(" ")}`.toLowerCase();
  return { ...record, content, type, lifeArea, date, title, summary, search };
}

function evidenceLine(record, text) {
  return {
    title: record.title || humanise(record.lifeArea || record.type),
    date: record.date,
    text: String(text || "").slice(0, 220),
    lifeArea: record.lifeArea,
  };
}

function humanise(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function has(value) {
  return String(value || "").trim().length > 0;
}

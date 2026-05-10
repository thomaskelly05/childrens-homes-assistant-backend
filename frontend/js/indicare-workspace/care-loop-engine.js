export function buildCareLoop(record = {}) {
  const content = record.content || {};
  return {
    experience: first(content.what_happened, content.description, content.identity_update, content.health_observation, content.school_experience, record.summary, "Experience not clearly recorded."),
    meaning: inferMeaning(content),
    childVoice: first(content.child_voice, content.voice, "Child voice not clearly recorded."),
    response: first(content.staff_response, content.adult_response, content.response, content.support_given, "Adult response not clearly recorded."),
    change: first(content.outcome, content.follow_up, content.actions, content.learning, content.progress, "Outcome or change not yet evidenced."),
    evidence: buildEvidence(record, content),
    quality: scoreRecordingQuality(record, content),
    prompts: missingPrompts(record, content),
  };
}

export function scoreRecordingQuality(record = {}, content = {}) {
  const checks = [
    has(first(content.what_happened, content.description, record.summary)),
    has(first(content.child_voice, content.voice)),
    has(first(content.staff_response, content.adult_response, content.response, content.support_given)),
    has(first(content.outcome, content.follow_up, content.actions, content.learning, content.progress)),
    has(first(content.reflection, content.therapeutic_reflection, content.learning)),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  let label = "Needs strengthening";
  if (score >= 80) label = "Strong evidence";
  else if (score >= 60) label = "Good foundation";
  return { score, label };
}

export function missingPrompts(record = {}, content = {}) {
  const prompts = [];
  if (!has(first(content.what_happened, content.description, record.summary))) prompts.push("What actually happened? Record clear facts.");
  if (!has(first(content.child_voice, content.voice))) prompts.push("What did the child say, show or communicate?");
  if (!has(first(content.staff_response, content.adult_response, content.response, content.support_given))) prompts.push("What did adults do and why?");
  if (!has(first(content.outcome, content.follow_up, content.actions, content.learning, content.progress))) prompts.push("What changed afterwards or what follow-up is needed?");
  if (!has(first(content.reflection, content.therapeutic_reflection, content.learning))) prompts.push("What might this tell us about need, risk, trauma, anxiety or support?");
  return prompts;
}

export function buildAssistantRecordingSuggestion(record = {}) {
  const loop = buildCareLoop(record);
  if (!loop.prompts.length) {
    return "This record has strong evidence shape: experience, child voice, adult response, outcome and reflection are visible.";
  }
  return `Before submitting, strengthen this record: ${loop.prompts.join(" ")}`;
}

function inferMeaning(content = {}) {
  if (has(content.trigger)) return `Possible trigger or context: ${content.trigger}`;
  if (has(content.mood)) return `Emotional presentation recorded as: ${content.mood}`;
  if (has(content.regulation)) return `Regulation need/support: ${content.regulation}`;
  if (has(content.child_voice)) return `Child communicated: ${content.child_voice}`;
  if (has(content.barriers)) return `Barrier identified: ${content.barriers}`;
  return "Meaning not yet clearly identified. Add therapeutic reflection.";
}

function buildEvidence(record = {}, content = {}) {
  const type = record.record_type || record.type || content.life_area || "record";
  if (type === "incident" || content.life_area === "behaviour") return "Evidence of behaviour as communication, risk management, adult response and learning.";
  if (type === "safeguarding" || content.life_area === "safety") return "Evidence of safeguarding concern, immediate action, notifications and outcome.";
  if (type === "missing") return "Evidence of missing-from-care workflow, risk review and return-home learning.";
  if (content.life_area === "education") return "Evidence of education experience, barriers, support and progress.";
  if (content.life_area === "emotional") return "Evidence of emotional wellbeing, regulation and therapeutic support.";
  return "Evidence of lived experience, child voice and adult care response.";
}

function first(...values) {
  return values.find((value) => has(value)) || values[values.length - 1];
}

function has(value) {
  return String(value || "").trim().length > 0;
}

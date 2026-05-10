export function buildOutcomeEngine(records = []) {
  const normalised = records.map(normalise).filter((record) => record.date);
  const last7 = withinDays(normalised, 7);
  const previous7 = betweenDays(normalised, 14, 7);
  const last30 = withinDays(normalised, 30);

  const outcomes = [];

  const incidentNow = countType(last7, "incident");
  const incidentBefore = countType(previous7, "incident");
  if (incidentBefore > 0 && incidentNow < incidentBefore) {
    outcomes.push(outcome("positive", "Incidents reducing", `Incidents reduced from ${incidentBefore} to ${incidentNow} compared with the previous 7 days.`));
  } else if (incidentNow >= 3) {
    outcomes.push(outcome("risk", "Incidents remain high", `${incidentNow} incident(s) are recorded in the last 7 days. Review behaviour support, triggers and staffing response.`));
  }

  const missingNow = countType(last7, "missing");
  const missingBefore = countType(previous7, "missing");
  if (missingBefore > 0 && missingNow < missingBefore) {
    outcomes.push(outcome("positive", "Missing episodes reducing", `Missing episodes reduced from ${missingBefore} to ${missingNow} compared with the previous 7 days.`));
  } else if (missingNow > 0) {
    outcomes.push(outcome("risk", "Missing risk active", `${missingNow} missing episode(s) are recorded in the last 7 days. Review missing plan and return-home learning.`));
  }

  const emotionalEntries = last30.filter((record) => record.lifeArea === "emotional" || includes(record, ["mood", "anxious", "low", "regulated", "dysregulated"]));
  if (emotionalEntries.length >= 3) {
    outcomes.push(outcome("progress", "Emotional wellbeing is being actively recorded", `${emotionalEntries.length} emotional wellbeing-related record(s) are visible in the last 30 days.`));
  }

  const educationEntries = last30.filter((record) => record.lifeArea === "education" || includes(record, ["school", "education", "attendance", "pep"]));
  if (educationEntries.length > 0) {
    outcomes.push(outcome("progress", "Education evidence present", `${educationEntries.length} education-related record(s) are visible in the last 30 days. Use these to evidence barriers, support and progress.`));
  }

  const relationshipEntries = last30.filter((record) => record.lifeArea === "relationships" || includes(record, ["contact", "family", "peer", "relationship"]));
  if (relationshipEntries.length > 0) {
    outcomes.push(outcome("progress", "Relationship evidence present", `${relationshipEntries.length} relationship/contact record(s) are visible in the last 30 days.`));
  }

  const childVoiceEntries = last30.filter((record) => hasValue(record.content?.child_voice) || hasValue(record.content?.voice));
  if (childVoiceEntries.length >= 3) {
    outcomes.push(outcome("positive", "Child voice is visible", `${childVoiceEntries.length} record(s) include direct or interpreted child voice in the last 30 days.`));
  } else if (last30.length > 0) {
    outcomes.push(outcome("gap", "Child voice evidence gap", "Recent records exist, but child voice appears limited. Staff should record what the child said, showed or communicated."));
  }

  const adultResponseEntries = last30.filter((record) => hasValue(record.content?.staff_response) || hasValue(record.content?.adult_response) || hasValue(record.content?.response));
  if (adultResponseEntries.length >= 3) {
    outcomes.push(outcome("positive", "Adult response is evidenced", `${adultResponseEntries.length} recent record(s) describe adult response, helping show care practice and impact.`));
  } else if (last30.length > 0) {
    outcomes.push(outcome("gap", "Adult response evidence gap", "Recent records should more clearly show what staff did and why."));
  }

  if (!outcomes.length) {
    outcomes.push(outcome("neutral", "No clear progress trend yet", "Continue consistent child-centred recording to build outcome evidence."));
  }

  return {
    ok: true,
    period: "live_tableplus_records",
    summary: {
      total_records: normalised.length,
      last_7_days: last7.length,
      previous_7_days: previous7.length,
      last_30_days: last30.length,
      incident_last_7_days: incidentNow,
      incident_previous_7_days: incidentBefore,
      missing_last_7_days: missingNow,
      missing_previous_7_days: missingBefore,
    },
    outcomes,
    planPrompts: buildPlanPrompts(outcomes),
  };
}

function buildPlanPrompts(outcomes) {
  const prompts = [];
  if (outcomes.some((item) => item.type === "risk" && item.title.toLowerCase().includes("incident"))) {
    prompts.push("Review behaviour support plan and risk assessment. Check whether triggers and de-escalation strategies are up to date.");
  }
  if (outcomes.some((item) => item.type === "risk" && item.title.toLowerCase().includes("missing"))) {
    prompts.push("Review missing-from-care plan, known locations, associates, return-home interview and exploitation risk.");
  }
  if (outcomes.some((item) => item.type === "gap" && item.title.toLowerCase().includes("child voice"))) {
    prompts.push("Prompt staff to record direct quotes, non-verbal communication, wishes and feelings in the next daily record.");
  }
  if (outcomes.some((item) => item.type === "gap" && item.title.toLowerCase().includes("adult response"))) {
    prompts.push("Manager should request clearer recording of staff action, rationale and effectiveness.");
  }
  if (!prompts.length) prompts.push("Continue monitoring whether records show lived experience, adult response, outcomes and plan updates.");
  return prompts;
}

function normalise(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const type = record.record_type || record.type || "record";
  const lifeArea = content.life_area || record.lifeArea || type;
  const date = record.updated_at || record.created_at || record.date || content.date || content.time || null;
  const text = `${record.title || ""} ${record.summary || ""} ${Object.values(content).join(" ")}`.toLowerCase();
  return { ...record, content, type, lifeArea, date, text };
}

function withinDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return records.filter((record) => new Date(record.date) >= cutoff);
}

function betweenDays(records, olderDays, newerDays) {
  const older = new Date();
  older.setDate(older.getDate() - olderDays);
  const newer = new Date();
  newer.setDate(newer.getDate() - newerDays);
  return records.filter((record) => {
    const date = new Date(record.date);
    return date >= older && date < newer;
  });
}

function countType(records, type) {
  return records.filter((record) => record.type === type).length;
}

function includes(record, words) {
  return words.some((word) => String(record.text || "").includes(word));
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function outcome(type, title, text) {
  return { type, title, text };
}

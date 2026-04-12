import { normaliseSeverity } from "./contracts.js";

function cleanText(value) {
  return String(value || "").trim();
}

function lower(value) {
  return cleanText(value).toLowerCase();
}

function includesAny(text, terms = []) {
  const source = lower(text);
  return terms.some((term) => source.includes(lower(term)));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSuggestion({
  title,
  description,
  record_type,
  priority = "medium",
  source_record_type = "",
  source_record_id = null,
  prefill = {},
  metadata = {},
}) {
  return {
    id: `suggestion-${record_type}-${source_record_id || "new"}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    title,
    description,
    record_type,
    priority,
    source_record_type,
    source_record_id,
    prefill,
    metadata,
  };
}

function getSourceMeta(record = {}, context = {}) {
  return {
    source_record_type:
      context?.metadata?.source_record_type ||
      context?.recordType ||
      record.record_type ||
      "",
    source_record_id:
      context?.metadata?.source_record_id ||
      record.id ||
      record.source_id ||
      null,
    young_person_id:
      context?.metadata?.young_person_id ||
      record.young_person_id ||
      null,
  };
}

function buildLinkedTitle(prefix, record = {}) {
  const base =
    cleanText(record.title) ||
    cleanText(record.incident_type) ||
    cleanText(record.contact_person) ||
    cleanText(record.record_type) ||
    "record";
  return `${prefix}: ${base}`;
}

/* -----------------------------
   Rule groups
----------------------------- */

function rulesForDailyNote(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);

  const healthText = [
    record.health_update,
    record.presentation,
    record.actions_required,
    record.summary,
  ]
    .filter(Boolean)
    .join(" ");

  const familyText = [
    record.family_update,
    record.young_person_voice,
    record.actions_required,
  ]
    .filter(Boolean)
    .join(" ");

  const behaviourText = [
    record.behaviour_update,
    record.presentation,
    record.actions_required,
    record.young_person_voice,
  ]
    .filter(Boolean)
    .join(" ");

  const educationText = [
    record.education_update,
    record.activities,
    record.actions_required,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    includesAny(healthText, [
      "gp",
      "doctor",
      "camhs",
      "dentist",
      "optician",
      "hospital",
      "clinic",
      "appointment",
      "medication",
      "allergy",
      "pain",
      "injury",
      "ill",
      "unwell",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create linked health record",
        description:
          "Health-related information was mentioned in this daily note. Create a structured health record to keep the health timeline complete.",
        record_type: "health_record",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Health update from daily note",
          summary: cleanText(record.health_update || record.presentation),
          child_voice: cleanText(record.young_person_voice),
          significance: cleanText(record.significance),
          follow_up_required: includesAny(healthText, [
            "follow up",
            "review",
            "monitor",
            "appointment",
          ]),
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(healthText, [
      "appointment",
      "gp",
      "doctor",
      "camhs",
      "dentist",
      "optician",
      "clinic",
      "review",
      "meeting",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create linked appointment",
        description:
          "This daily note appears to mention a health or professional appointment. Add it to the calendar so it is visible in planning and handover.",
        record_type: "appointment",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Appointment from daily note",
          summary: cleanText(record.health_update || record.actions_required),
          child_voice: cleanText(record.young_person_voice),
          status: "planned",
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(familyText, [
      "mum",
      "mom",
      "mother",
      "dad",
      "father",
      "family",
      "contact",
      "phone call",
      "video call",
      "visit",
      "grandma",
      "grandad",
      "sibling",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create linked family contact record",
        description:
          "Family-related information was mentioned in this daily note. Create a family contact record so presentation and follow-up are visible.",
        record_type: "family_contact",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          contact_type: "Family contact",
          child_voice: cleanText(record.young_person_voice),
          concerns: cleanText(record.family_update),
          significance: cleanText(record.significance),
          follow_up_required: includesAny(familyText, [
            "follow up",
            "upset",
            "distressed",
            "concern",
          ]),
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(educationText, [
      "school",
      "college",
      "lesson",
      "class",
      "attendance",
      "teacher",
      "education",
      "provision",
      "refused school",
      "not attend",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create linked education record",
        description:
          "Education-related information was identified. Create a structured education record so attendance, engagement and concerns are tracked properly.",
        record_type: "education_record",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          behaviour_summary: cleanText(record.behaviour_update),
          learning_engagement: cleanText(record.education_update),
          child_voice: cleanText(record.young_person_voice),
          significance: cleanText(record.significance),
          follow_up_required: includesAny(educationText, [
            "concern",
            "follow up",
            "not attend",
            "refused",
          ]),
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(behaviourText, [
      "risk",
      "unsafe",
      "assault",
      "aggression",
      "self-harm",
      "abscond",
      "missing",
      "police",
      "weapon",
      "suicide",
      "harm",
      "violent",
      "restraint",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create risk assessment",
        description:
          "The language in this daily note suggests significant risk. Create or update a structured risk assessment.",
        record_type: "risk",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Risk identified from daily note",
          concern_summary: cleanText(record.behaviour_update || record.presentation),
          child_views: cleanText(record.young_person_voice),
          severity: "high",
          status: "active",
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(behaviourText, [
      "incident",
      "assault",
      "aggression",
      "damage",
      "fight",
      "police",
      "restraint",
      "missing",
      "abscond",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create incident record",
        description:
          "This daily note appears to describe an incident. Create a full incident record for chronology, management review and reporting.",
        record_type: "incident",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          description: cleanText(
            [record.presentation, record.behaviour_update, record.actions_required]
              .filter(Boolean)
              .join("\n\n")
          ),
          child_voice: cleanText(record.young_person_voice),
          severity: cleanText(record.significance) || "medium",
          follow_up_required: true,
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(
      [record.actions_required, record.summary, record.presentation].filter(Boolean).join(" "),
      ["need to", "must", "follow up", "arrange", "contact", "book", "review"]
    )
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create follow-up task",
        description:
          "This daily note includes actions required. Create a task so the next step is tracked and visible.",
        record_type: "task",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Follow-up from daily note",
          task: cleanText(record.actions_required || record.summary),
          task_type: "follow_up",
          completed: false,
        },
        metadata: meta,
      })
    );
  }

  return suggestions;
}

function rulesForIncident(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);
  const text = [
    record.description,
    record.antecedent,
    record.outcome,
    record.actions_taken,
    record.trauma_informed_formulation,
    record.child_voice,
  ]
    .filter(Boolean)
    .join(" ");

  const severity = normaliseSeverity(record.severity);

  if (
    severity === "high" ||
    severity === "critical" ||
    record.safeguarding_flag ||
    includesAny(text, ["self-harm", "suicide", "sexual", "injury", "police", "unsafe", "missing"])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create or update risk assessment",
        description:
          "This incident indicates significant risk. Create or review a structured risk assessment linked to the incident.",
        record_type: "risk",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: buildLinkedTitle("Risk from incident", record),
          concern_summary: cleanText(record.description || record.outcome),
          known_triggers: cleanText(record.antecedent),
          response_actions: cleanText(record.actions_taken),
          child_views: cleanText(record.child_voice),
          severity: severity || "high",
          status: "active",
        },
        metadata: meta,
      })
    );
  }

  if (
    record.safeguarding_flag ||
    includesAny(text, [
      "disclosure",
      "sexual",
      "physical",
      "neglect",
      "exploitation",
      "injury",
      "assault",
      "harm",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create safeguarding record",
        description:
          "This incident may need a safeguarding record so concern details, referrals and outcomes are tracked separately.",
        record_type: "safeguarding_record",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          incident_id: meta.source_record_id,
          concern_details: cleanText(record.description || record.outcome),
          immediate_action_taken: cleanText(record.actions_taken || record.staff_response),
          outcome: cleanText(record.outcome),
        },
        metadata: meta,
      })
    );
  }

  if (includesAny(text, ["missing", "abscond", "away from placement", "not returned"])) {
    suggestions.push(
      buildSuggestion({
        title: "Create missing episode record",
        description:
          "This incident suggests a missing / absent from placement episode. Record it in the missing episode workflow.",
        record_type: "missing_episode",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          outcome: cleanText(record.outcome),
          actions_taken: cleanText(record.actions_taken || record.staff_response),
          child_voice: cleanText(record.child_voice),
          review_required: true,
        },
        metadata: meta,
      })
    );
  }

  if (
    includesAny(text, [
      "gp",
      "doctor",
      "hospital",
      "a&e",
      "camhs",
      "nurse",
      "injury",
      "medication",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create health record",
        description:
          "This incident mentions health consequences or professional involvement. Create a linked health record.",
        record_type: "health_record",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: buildLinkedTitle("Health follow-up from incident", record),
          summary: cleanText(record.description || record.outcome),
          outcome: cleanText(record.outcome),
          child_voice: cleanText(record.child_voice),
          follow_up_required: true,
        },
        metadata: meta,
      })
    );
  }

  suggestions.push(
    buildSuggestion({
      title: "Create follow-up task",
      description:
        "Incidents usually generate actions. Add a follow-up task so accountability is clear.",
      record_type: "task",
      priority: severity === "high" || severity === "critical" ? "high" : "medium",
      source_record_type: meta.source_record_type,
      source_record_id: meta.source_record_id,
      prefill: {
        title: "Follow-up from incident",
        task: cleanText(record.actions_taken || record.outcome || record.description),
        task_type: "incident_follow_up",
        completed: false,
      },
      metadata: meta,
    })
  );

  return suggestions;
}

function rulesForHealthRecord(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);
  const text = [record.summary, record.outcome, record.title].filter(Boolean).join(" ");

  if (
    includesAny(text, [
      "appointment",
      "review",
      "clinic",
      "gp",
      "doctor",
      "camhs",
      "dentist",
      "optician",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create linked appointment",
        description:
          "This health record appears to involve a professional appointment. Add it to the calendar for continuity and planning.",
        record_type: "appointment",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: cleanText(record.title) || "Health appointment",
          summary: cleanText(record.summary),
          professional_name: cleanText(record.professional_name),
          status: "planned",
        },
        metadata: meta,
      })
    );
  }

  if (record.follow_up_required || includesAny(text, ["follow up", "monitor", "review", "check"])) {
    suggestions.push(
      buildSuggestion({
        title: "Create health follow-up task",
        description:
          "This health record indicates follow-up is needed. Create a task so it is tracked and visible.",
        record_type: "task",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Health follow-up",
          task: cleanText(record.outcome || record.summary),
          task_type: "health_follow_up",
          due_date: record.next_action_date || "",
          completed: false,
        },
        metadata: meta,
      })
    );
  }

  return suggestions;
}

function rulesForFamilyContact(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);
  const text = [
    record.pre_contact_presentation,
    record.post_contact_presentation,
    record.concerns,
    record.child_voice,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    record.follow_up_required ||
    includesAny(text, ["upset", "distressed", "unsafe", "concern", "trigger", "risk"])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create family contact follow-up task",
        description:
          "This family contact record suggests follow-up is needed. Create a task so actions are not lost.",
        record_type: "task",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Family contact follow-up",
          task: cleanText(record.concerns || record.post_contact_presentation),
          task_type: "family_follow_up",
          completed: false,
        },
        metadata: meta,
      })
    );
  }

  if (includesAny(text, ["risk", "unsafe", "harm", "threat", "fear"])) {
    suggestions.push(
      buildSuggestion({
        title: "Create or review risk assessment",
        description:
          "This family contact record suggests a potential risk pattern. Create or review a linked risk assessment.",
        record_type: "risk",
        priority: "high",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Risk from family contact",
          concern_summary: cleanText(record.concerns || record.post_contact_presentation),
          child_views: cleanText(record.child_voice),
          status: "active",
        },
        metadata: meta,
      })
    );
  }

  return suggestions;
}

function rulesForEducationRecord(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);
  const text = [
    record.issue_raised,
    record.action_taken,
    record.behaviour_summary,
    record.learning_engagement,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    record.follow_up_required ||
    includesAny(text, ["attendance", "refused", "excluded", "concern", "meeting", "review"])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create education follow-up task",
        description:
          "This education record suggests follow-up is needed with school or provision.",
        record_type: "task",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Education follow-up",
          task: cleanText(record.issue_raised || record.action_taken || record.learning_engagement),
          task_type: "education_follow_up",
          completed: false,
        },
        metadata: meta,
      })
    );
  }

  if (cleanText(record.achievement_note)) {
    suggestions.push(
      buildSuggestion({
        title: "Create achievement record",
        description:
          "This education record includes progress or success. Capture it as a structured achievement.",
        record_type: "achievement_record",
        priority: "low",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Achievement from education",
          description: cleanText(record.achievement_note),
          child_voice: cleanText(record.child_voice),
          achievement_type: "education",
        },
        metadata: meta,
      })
    );
  }

  return suggestions;
}

function rulesForMissingEpisode(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);

  suggestions.push(
    buildSuggestion({
      title: "Create or review risk assessment",
      description:
        "A missing episode should usually trigger a linked risk review.",
      record_type: "risk",
      priority: "high",
      source_record_type: meta.source_record_type,
      source_record_id: meta.source_record_id,
      prefill: {
        title: "Risk review after missing episode",
        concern_summary: cleanText(record.outcome || record.trigger_factors),
        child_views: cleanText(record.child_voice),
        status: "active",
      },
      metadata: meta,
    })
  );

  suggestions.push(
    buildSuggestion({
      title: "Create follow-up task",
      description:
        "A missing episode usually requires debrief, review or professional follow-up.",
      record_type: "task",
      priority: "high",
      source_record_type: meta.source_record_type,
      source_record_id: meta.source_record_id,
      prefill: {
        title: "Missing episode follow-up",
        task: cleanText(record.actions_taken || record.outcome),
        task_type: "missing_episode_follow_up",
        completed: false,
      },
      metadata: meta,
    })
  );

  return suggestions;
}

function rulesForAppointment(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);
  const text = [
    record.summary,
    record.purpose,
    record.outcome_notes,
    record.follow_up_actions,
    record.notes,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    includesAny(text, [
      "gp",
      "doctor",
      "camhs",
      "dentist",
      "optician",
      "medication",
      "health",
      "clinic",
      "hospital",
    ])
  ) {
    suggestions.push(
      buildSuggestion({
        title: "Create linked health record",
        description:
          "This appointment appears to be health-related. Create a health record so outcome and follow-up are visible in the health timeline.",
        record_type: "health_record",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: cleanText(record.title) || "Health appointment outcome",
          summary: cleanText(record.summary || record.purpose),
          outcome: cleanText(record.outcome_notes || record.follow_up_actions),
          child_voice: cleanText(record.child_voice),
          professional_name: cleanText(record.professional_name),
          follow_up_required: !!cleanText(record.follow_up_actions),
        },
        metadata: meta,
      })
    );
  }

  if (cleanText(record.follow_up_actions) || includesAny(text, ["follow up", "review", "book", "arrange"])) {
    suggestions.push(
      buildSuggestion({
        title: "Create follow-up task",
        description:
          "This appointment includes follow-up work. Create a task so it is tracked and assigned.",
        record_type: "task",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Appointment follow-up",
          task: cleanText(record.follow_up_actions || record.outcome_notes || record.notes),
          task_type: "appointment_follow_up",
          completed: false,
        },
        metadata: meta,
      })
    );
  }

  return suggestions;
}

function rulesForRisk(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);

  if (record.review_date) {
    suggestions.push(
      buildSuggestion({
        title: "Create risk review task",
        description:
          "This risk assessment has an active review date. Create a task to make sure the review is completed on time.",
        record_type: "task",
        priority: "medium",
        source_record_type: meta.source_record_type,
        source_record_id: meta.source_record_id,
        prefill: {
          title: "Risk review due",
          task: cleanText(record.title || record.concern_summary || "Review risk assessment"),
          task_type: "risk_review",
          due_date: record.review_date,
          completed: false,
        },
        metadata: meta,
      })
    );
  }

  return suggestions;
}

function rulesForSafeguarding(record = {}, context = {}) {
  const suggestions = [];
  const meta = getSourceMeta(record, context);

  suggestions.push(
    buildSuggestion({
      title: "Create safeguarding follow-up task",
      description:
        "Safeguarding concerns usually require explicit follow-up and oversight.",
      record_type: "task",
      priority: "high",
      source_record_type: meta.source_record_type,
      source_record_id: meta.source_record_id,
      prefill: {
        title: "Safeguarding follow-up",
        task: cleanText(record.outcome || record.immediate_action_taken || record.concern_details),
        task_type: "safeguarding_follow_up",
        completed: false,
      },
      metadata: meta,
    })
  );

  return suggestions;
}

/* -----------------------------
   Public API
----------------------------- */

export function evaluateRecordSuggestions(record = {}, context = {}) {
  const type = String(
    context?.recordType ||
      record.record_type ||
      record.source_record_type ||
      ""
  )
    .trim()
    .toLowerCase();

  if (!type) return [];

  if (type === "daily_note") return rulesForDailyNote(record, context);
  if (type === "incident") return rulesForIncident(record, context);
  if (type === "health_record") return rulesForHealthRecord(record, context);
  if (type === "family_contact") return rulesForFamilyContact(record, context);
  if (type === "education_record") return rulesForEducationRecord(record, context);
  if (type === "missing_episode") return rulesForMissingEpisode(record, context);
  if (type === "appointment") return rulesForAppointment(record, context);
  if (type === "risk") return rulesForRisk(record, context);
  if (type === "safeguarding_record") return rulesForSafeguarding(record, context);

  return [];
}

export function mergeSuggestionLists(...lists) {
  const combined = lists.flatMap((list) => safeArray(list));

  const seen = new Set();
  const deduped = [];

  for (const item of combined) {
    const key = [
      item.record_type,
      item.title,
      item.source_record_type,
      item.source_record_id,
    ].join("::");

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export async function evaluateSuggestions({ recordType, record, metadata } = {}) {
  return evaluateRecordSuggestions(record || {}, {
    recordType,
    metadata,
  });
}

export async function runRules({ recordType, record, metadata } = {}) {
  return evaluateSuggestions({ recordType, record, metadata });
}

export async function getSuggestionsForRecord(record = {}, context = {}) {
  return evaluateRecordSuggestions(record, context);
}

export default async function rulesClient(input = {}) {
  if (input?.record || input?.recordType) {
    return evaluateSuggestions(input);
  }

  return [];
}
from __future__ import annotations

import re
from typing import Any


THERAPEUTIC_HINTS_BY_DOC_TYPE: dict[str, list[str]] = {
    "incident": [
        "Use clear, factual, non-judgemental language.",
        "Describe what happened, what was observed, and what support adults offered.",
        "Avoid blame-based or punitive wording.",
        "Show the young person's presentation, needs, and responses.",
        "Include follow-up, repair, and safeguarding considerations where relevant.",
    ],
    "daily_note": [
        "Keep the note balanced and reflective of the whole day.",
        "Include strengths, routines, achievements, presentation, and support given.",
        "Use respectful, child-centred language throughout.",
        "Capture the young person's voice where possible.",
    ],
    "health": [
        "Record factual health details, appointments, outcomes, and follow-up.",
        "Be clear about professional advice, consent, and next actions.",
        "Avoid vague statements when medical follow-up is required.",
    ],
    "education": [
        "Describe participation, engagement, attendance, support, and achievements.",
        "Be specific about barriers and what adults did to support learning.",
        "Use strengths-based language where possible.",
    ],
    "family": [
        "Record family contact factually and sensitively.",
        "Describe the young person's presentation before and after contact.",
        "Include concerns, support, and any required follow-up.",
    ],
    "keywork": [
        "Show purpose, reflection, child voice, learning, and agreed actions.",
        "Use relational, reflective, and strengths-based language.",
    ],
    "risk": [
        "Focus on triggers, early signs, protective factors, controls, and response.",
        "Use precise and accountable wording.",
        "Make sure review actions and ownership are clear.",
    ],
    "generic": [
        "Use clear, factual, respectful, and therapeutically informed language.",
        "Avoid judgemental wording and unsupported assumptions.",
        "Make actions, context, and outcomes clear.",
    ],
}


QUALITY_STANDARD_SUGGESTIONS: dict[str, list[dict[str, str]]] = {
    "incident": [
        {"code": "3", "reason": "Incidents often relate to children’s behaviour and support responses."},
        {"code": "12", "reason": "Safeguarding, protection, and safe care may be relevant."},
        {"code": "13", "reason": "Leadership and management oversight may be needed after serious incidents."},
    ],
    "daily_note": [
        {"code": "1", "reason": "Daily care records often evidence positive relationships and care."},
        {"code": "2", "reason": "Daily routines may evidence support for learning and development."},
        {"code": "3", "reason": "Daily notes often capture behaviour support and emotional presentation."},
    ],
    "health": [
        {"code": "10", "reason": "Health records directly evidence health and wellbeing support."},
        {"code": "12", "reason": "Safeguarding may be relevant where health concerns increase risk."},
    ],
    "education": [
        {"code": "8", "reason": "Education records directly support evidence of educational progress."},
        {"code": "2", "reason": "They may also evidence support for aspirations and development."},
    ],
    "family": [
        {"code": "1", "reason": "Family contact can evidence relationships and identity support."},
        {"code": "2", "reason": "Contact may support emotional development and belonging."},
        {"code": "12", "reason": "Restrictions or concerns may involve safeguarding."},
    ],
    "keywork": [
        {"code": "1", "reason": "Keywork often evidences meaningful relationships with adults."},
        {"code": "2", "reason": "It can show support for aspirations, identity, and development."},
        {"code": "3", "reason": "It may evidence behaviour support and reflection."},
    ],
    "risk": [
        {"code": "12", "reason": "Risk records are closely linked to safeguarding and protection."},
        {"code": "13", "reason": "Risk oversight also links to leadership and management accountability."},
    ],
    "generic": [
        {"code": "1", "reason": "Many care records evidence relationships and care."},
        {"code": "12", "reason": "Consider safeguarding relevance where risks or concerns appear."},
    ],
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_doc_type(document_type: str) -> str:
    doc_type = _safe_string(document_type).lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "dailynote": "daily_note",
        "daily_notes": "daily_note",
        "health_record": "health",
        "health_records": "health",
        "education_record": "education",
        "education_records": "education",
        "family_contact": "family",
        "family_contact_record": "family",
        "family_contact_records": "family",
        "keywork_session": "keywork",
        "keywork_sessions": "keywork",
        "risk_assessment": "risk",
        "risk_assessments": "risk",
    }
    return aliases.get(doc_type, doc_type or "generic")


def _flatten_payload(payload: dict[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, bool):
            text = "Yes" if value else "No"
        else:
            text = _safe_string(value)
        if not text:
            continue
        rows.append({"field": key, "text": text})
    return rows


def _join_payload_text(payload: dict[str, Any]) -> str:
    parts = []
    for item in _flatten_payload(payload):
        parts.append(f"{item['field']}: {item['text']}")
    return "\n".join(parts).strip()


def _sentence_split(text: str) -> list[str]:
    raw = re.split(r"(?<=[.!?])\s+", text.strip())
    return [x.strip() for x in raw if x.strip()]


def _simple_spelling_and_style_flags(text: str) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []

    patterns = [
        (r"\bbehaviours\b", "Consider whether 'behaviour' is more appropriate than 'behaviours' in this context."),
        (r"\brefused\b", "Consider whether 'declined', 'was not able to engage', or a more descriptive phrase would be fairer."),
        (r"\battention seeking\b", "Replace judgemental wording with an observation-based description."),
        (r"\bmanipulative\b", "Avoid judgemental wording; describe observable behaviour and context instead."),
        (r"\bnon compliant\b", "Use more respectful wording, such as describing what support was offered and how the young person responded."),
        (r"\bchallenging behaviour\b", "Consider more specific and descriptive wording about the behaviour and context."),
        (r"\bangry\b", "Consider whether a more precise presentation-based description would be stronger."),
        (r"\baggressive\b", "If used, ensure the behaviour is described specifically and factually."),
        (r"\bcalmed down\b", "Consider describing how regulation was supported and what changed."),
    ]

    for pattern, message in patterns:
        if re.search(pattern, text, flags=re.IGNORECASE):
            flags.append({"type": "language_flag", "message": message})

    if len(text.split()) < 12:
        flags.append({"type": "completeness_flag", "message": "The entry is very short and may need more detail."})

    if text and text == text.upper():
        flags.append({"type": "style_flag", "message": "Large amounts of capital letters can reduce readability."})

    return flags


def _detect_missing_detail(document_type: str, payload: dict[str, Any]) -> list[str]:
    doc_type = _normalise_doc_type(document_type)
    prompts: list[str] = []

    def blank(field: str) -> bool:
        value = payload.get(field)
        return value is None or _safe_string(value) == ""

    if doc_type == "incident":
        if blank("description"):
            prompts.append("Add a clear factual description of what happened.")
        if blank("antecedent"):
            prompts.append("Add what happened before the incident or any known triggers.")
        if blank("staff_response"):
            prompts.append("Add what adults did to support and respond.")
        if blank("outcome"):
            prompts.append("Add the immediate outcome and what happened afterwards.")
        if blank("child_voice"):
            prompts.append("Add the young person's view or presentation where known.")
        if blank("actions_taken"):
            prompts.append("Add follow-up actions, notifications, or review steps.")
    elif doc_type == "daily_note":
        if blank("activities"):
            prompts.append("Add what the young person did during the day.")
        if blank("young_person_voice"):
            prompts.append("Add the young person's voice where possible.")
        if blank("positives"):
            prompts.append("Add positives, progress, or strengths from the day.")
        if blank("actions_required"):
            prompts.append("Add any actions required for handover or follow-up.")
    elif doc_type == "health":
        if blank("summary"):
            prompts.append("Add a clear summary of the health event or appointment.")
        if blank("outcome"):
            prompts.append("Add the outcome, advice, or decision made.")
        if blank("professional_name"):
            prompts.append("Add the relevant professional involved where known.")
    elif doc_type == "education":
        if blank("attendance_status"):
            prompts.append("Add attendance or participation status.")
        if blank("learning_engagement"):
            prompts.append("Add learning engagement or participation detail.")
        if blank("action_taken"):
            prompts.append("Add what support or action adults took.")
    elif doc_type == "family":
        if blank("contact_person"):
            prompts.append("Add who the contact was with.")
        if blank("post_contact_presentation"):
            prompts.append("Add how the young person presented after contact.")
        if blank("concerns"):
            prompts.append("Add any concerns or note clearly that there were none.")
    elif doc_type == "keywork":
        if blank("purpose"):
            prompts.append("Add the purpose of the keywork session.")
        if blank("summary"):
            prompts.append("Add a summary of the discussion or activity.")
        if blank("child_voice"):
            prompts.append("Add the young person's views, reflections, or responses.")
        if blank("actions_agreed"):
            prompts.append("Add actions agreed and any next steps.")
    elif doc_type == "risk":
        if blank("concern_summary"):
            prompts.append("Add the core concern or risk being assessed.")
        if blank("known_triggers"):
            prompts.append("Add known triggers or precipitating factors.")
        if blank("current_controls"):
            prompts.append("Add current controls or protective measures.")
        if blank("response_actions"):
            prompts.append("Add response actions adults should take.")

    return prompts


def _detect_safeguarding_considerations(text: str) -> list[str]:
    lower = text.lower()
    prompts: list[str] = []

    keywords = [
        ("injury", "Consider whether injury management, body map, or medical review should be recorded."),
        ("police", "Consider whether police involvement, reference numbers, and follow-up are fully recorded."),
        ("missing", "Consider whether missing episode procedures, return home interview, and notifications are needed."),
        ("abscond", "Consider whether missing episode procedures and safeguarding notifications are needed."),
        ("restraint", "Consider whether physical intervention details, proportionality, and post-incident review are fully recorded."),
        ("self-harm", "Consider whether safeguarding, health follow-up, and risk review are needed."),
        ("sexual", "Consider whether safeguarding thresholds, referral decisions, and protective actions are clearly recorded."),
        ("bruis", "Consider whether injury/body map recording is needed."),
        ("disclosure", "Consider whether disclosure wording, immediate action, and safeguarding referral decisions are clearly recorded."),
    ]

    for needle, message in keywords:
        if needle in lower:
            prompts.append(message)

    return prompts


def _suggest_linked_records(document_type: str, text: str) -> list[dict[str, str]]:
    doc_type = _normalise_doc_type(document_type)
    suggestions: list[dict[str, str]] = []

    if doc_type == "incident":
        suggestions.extend([
            {"record_type": "chronology_event", "reason": "Serious or important incidents should usually appear in chronology."},
            {"record_type": "task", "reason": "Incidents often create follow-up actions and accountability tasks."},
        ])
        if "safeguard" in text.lower():
            suggestions.append({"record_type": "safeguarding_record", "reason": "The content suggests safeguarding follow-up may be required."})
        if any(word in text.lower() for word in ["injury", "self-harm", "gp", "hospital", "medication"]):
            suggestions.append({"record_type": "health_record", "reason": "The content suggests a linked health entry may be needed."})
        if any(word in text.lower() for word in ["risk", "unsafe", "missing", "abscond", "weapon"]):
            suggestions.append({"record_type": "risk_assessment", "reason": "The content suggests risk review or update may be needed."})

    elif doc_type == "daily_note":
        suggestions.extend([
            {"record_type": "chronology_event", "reason": "Important daily note events may need chronology links."},
        ])
        if "health" in text.lower() or "appointment" in text.lower():
            suggestions.append({"record_type": "health_record", "reason": "Health information in the note may need a dedicated health record."})
        if "school" in text.lower() or "education" in text.lower():
            suggestions.append({"record_type": "education_record", "reason": "Education-related information may need a dedicated education record."})

    elif doc_type == "health":
        suggestions.extend([
            {"record_type": "chronology_event", "reason": "Important health events often belong in chronology."},
            {"record_type": "task", "reason": "Health appointments often create follow-up tasks."},
        ])

    elif doc_type == "education":
        suggestions.extend([
            {"record_type": "chronology_event", "reason": "Important education events may belong in chronology."},
            {"record_type": "task", "reason": "Education issues or meetings may create follow-up actions."},
        ])

    elif doc_type == "family":
        suggestions.extend([
            {"record_type": "chronology_event", "reason": "Significant family contact often belongs in chronology."},
        ])
        if "concern" in text.lower():
            suggestions.append({"record_type": "task", "reason": "Family contact concerns may require follow-up action."})

    elif doc_type == "keywork":
        suggestions.extend([
            {"record_type": "chronology_event", "reason": "Important keywork outcomes may belong in chronology."},
            {"record_type": "support_plan", "reason": "Agreed strategies or goals may need linking to support plans."},
        ])

    elif doc_type == "risk":
        suggestions.extend([
            {"record_type": "task", "reason": "Risk reviews often create accountable follow-up actions."},
            {"record_type": "chronology_event", "reason": "Important risk changes may belong in chronology."},
        ])

    return suggestions


def _therapeutic_rewrite(text: str, document_type: str) -> str:
    doc_type = _normalise_doc_type(document_type)
    hints = THERAPEUTIC_HINTS_BY_DOC_TYPE.get(doc_type, THERAPEUTIC_HINTS_BY_DOC_TYPE["generic"])

    cleaned = " ".join(text.split()).strip()
    if not cleaned:
        return ""

    replacements = [
        (r"\bwas aggressive\b", "presented with behaviour that posed risk to others"),
        (r"\bwas angry\b", "appeared dysregulated and upset"),
        (r"\battention seeking\b", "communicating need or distress"),
        (r"\brefused\b", "was not able to engage with"),
        (r"\bnon compliant\b", "did not engage with"),
        (r"\bchallenging behaviour\b", "behaviour of concern"),
        (r"\bcalmed down\b", "became more settled with support"),
    ]

    rewritten = cleaned
    for pattern, replacement in replacements:
        rewritten = re.sub(pattern, replacement, rewritten, flags=re.IGNORECASE)

    intro = ""
    if doc_type == "incident":
        intro = "Therapeutic rewrite: This record should describe the incident factually, show the young person's presentation and needs, and explain how adults supported safety, regulation, and follow-up."
    elif doc_type == "daily_note":
        intro = "Therapeutic rewrite: This record should reflect the day in a balanced, respectful, and child-centred way, including strengths, support, routines, and the young person's voice."
    else:
        intro = "Therapeutic rewrite: This record should be clear, respectful, factual, and therapeutically informed."

    hint_block = " ".join(hints[:2])

    return f"{intro}\n\nSuggested rewritten wording:\n{rewritten}\n\nWriting focus:\n{hint_block}"


def review_document(
    *,
    document_type: str,
    payload: dict[str, Any],
    actions: list[str] | None = None,
) -> dict[str, Any]:
    actions = actions or []
    doc_type = _normalise_doc_type(document_type)
    flat_rows = _flatten_payload(payload)
    source_text = _join_payload_text(payload)

    language_flags = _simple_spelling_and_style_flags(source_text)
    missing_details = _detect_missing_detail(doc_type, payload)
    safeguarding_considerations = _detect_safeguarding_considerations(source_text)
    quality_standards = QUALITY_STANDARD_SUGGESTIONS.get(doc_type, QUALITY_STANDARD_SUGGESTIONS["generic"])
    linked_records = _suggest_linked_records(doc_type, source_text)

    spelling_and_clarity = [
        item["message"]
        for item in language_flags
        if item["type"] in {"language_flag", "style_flag", "completeness_flag"}
    ]

    rewritten_text = _therapeutic_rewrite(source_text, doc_type) if source_text else ""

    summary_points = []
    if source_text:
        summary_points.append("The record contains content that can be reviewed and improved.")
    else:
        summary_points.append("The record is mostly empty and needs core information added.")

    if missing_details:
        summary_points.append(f"{len(missing_details)} area(s) need more detail.")
    if safeguarding_considerations:
        summary_points.append("There may be safeguarding-related follow-up to consider.")
    if linked_records:
        summary_points.append("The content suggests linked records or follow-up actions may be needed.")

    field_feedback = []
    for row in flat_rows:
        if len(row["text"].split()) < 3:
            field_feedback.append({
                "field": row["field"],
                "message": "This field is very brief and may need more detail.",
            })

    response = {
        "document_type": doc_type,
        "summary": " ".join(summary_points),
        "field_feedback": field_feedback,
        "spelling_and_clarity": spelling_and_clarity,
        "missing_details": missing_details,
        "safeguarding_considerations": safeguarding_considerations,
        "quality_standards_suggestions": quality_standards,
        "linked_record_suggestions": linked_records,
        "therapeutic_rewrite": rewritten_text,
        "source_preview": source_text[:4000],
    }

    if actions:
        response["requested_actions"] = actions

    return response

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


FACTUAL_KEYWORDS = {
    "how often",
    "timescale",
    "statutory",
    "regulation",
    "requirement",
    "legal",
    "policy",
    "guidance",
    "ofsted",
    "review frequency",
    "lac review",
    "pep",
    "supervision frequency",
    "quality standard",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "guide to the children's homes regulations",
    "guide to the childrens homes regulations",
    "sccif",
    "reg 40",
    "reg 44",
    "reg 45",
    "regulation 40",
    "regulation 44",
    "regulation 45",
    "children act",
    "working together",
    "statutory guidance",
}


HANDOVER_KEYWORDS = {
    "handover",
    "shift handover",
    "end of shift",
    "pass on",
    "what should i hand over",
    "next shift",
    "shift brief",
    "handover note",
    "handover summary",
    "staff need to know",
    "what does the next shift need",
}


RECORDING_KEYWORDS = {
    "daily log",
    "record this",
    "write this up",
    "log entry",
    "body map",
    "body-map",
    "bruise",
    "injury",
    "observation",
    "recording",
    "incident record",
    "factual record",
    "daily note",
    "entry",
    "document this",
    "case note",
    "write a note",
    "recording wording",
    "professional wording",
    "care note",
}


INCIDENT_KEYWORDS = {
    "incident summary",
    "incident report",
    "summarise the incident",
    "summary of incident",
    "review this incident",
    "incident",
    "restraint",
    "physical intervention",
    "police attended",
    "missing episode",
    "serious event",
    "reg 40",
    "notification",
}


CHRONOLOGY_KEYWORDS = {
    "chronology",
    "timeline",
    "sequence of events",
    "put this in order",
    "date order",
    "chronological",
    "events in order",
}


PLANNING_KEYWORDS = {
    "support plan",
    "care plan",
    "risk assessment",
    "risk plan",
    "strategy",
    "how should we support",
    "support this child",
    "plan for",
    "routine plan",
    "transition plan",
    "communication profile",
    "placement plan",
    "behaviour plan",
    "positive behaviour support",
    "pbs plan",
    "safety plan",
    "missing plan",
    "de-escalation plan",
    "key work plan",
}


MANAGER_REVIEW_KEYWORDS = {
    "manager update",
    "manager summary",
    "as a manager",
    "review this as a manager",
    "audit this",
    "quality check this",
    "what would ofsted think",
    "what would ofsted say",
    "what would an inspector think",
    "inspection evidence preparation",
    "Inspection evidence preparation",
    "is this defensible",
    "whole scoped record",
    "across the whole record",
    "full child-centred summary",
    "full summary",
    "quality assurance",
    "oversight",
    "management oversight",
    "manager review",
    "leadership review",
    "registered manager view",
    "ri view",
    "responsible individual",
}


REWRITE_KEYWORDS = {
    "rewrite",
    "make this better",
    "improve this",
    "make this more professional",
    "reword",
    "phrase this better",
    "clean this up",
    "tidy this up",
    "professionalise",
    "professionalize",
    "make this sound better",
    "make this less judgemental",
    "make this child-centred",
    "make this factual",
}


REFLECTIVE_KEYWORDS = {
    "i felt",
    "i feel",
    "i'm unsure",
    "i am unsure",
    "not sure",
    "difficult",
    "challenging",
    "what should i think",
    "how should i think",
    "what could i have done",
    "what can i learn",
    "reflection",
    "reflect",
    "supervision",
    "debrief",
    "reflective account",
    "staff debrief",
    "team debrief",
    "learning from",
    "what went well",
    "what could be improved",
}


DECISION_SUPPORT_KEYWORDS = {
    "what should i do",
    "what do i do",
    "what should staff do",
    "next step",
    "next steps",
    "how should i respond",
    "what action",
    "do i need to",
    "should i report",
    "should this be escalated",
    "what should happen next",
    "what needs to happen",
    "who should i tell",
    "do i call",
    "do we need to notify",
    "should we notify",
}


DOCUMENT_REVIEW_KEYWORDS = {
    "review this document",
    "review this",
    "check this",
    "audit this",
    "is this okay",
    "does this make sense",
    "is this defensible",
    "improve this record",
    "quality check",
    "spot gaps",
    "what is missing",
    "is this strong enough",
    "would this stand up",
}


SAFEGUARDING_REVIEW_KEYWORDS = {
    "safeguarding",
    "escalate",
    "report to manager",
    "notify manager",
    "dsl",
    "lado",
    "social worker",
    "local authority",
    "police",
    "on-call",
    "child protection",
    "disclosure",
    "allegation",
    "exploitation",
    "cse",
    "cce",
    "county lines",
    "missing from home",
    "self-harm",
    "suicidal",
    "risk of harm",
    "unsafe",
}


LEADERSHIP_KEYWORDS = {
    "manager",
    "registered manager",
    "responsible individual",
    "provider",
    "governance",
    "oversight",
    "quality assurance",
    "audit",
    "inspection",
    "ofsted",
    "leadership",
    "service issue",
    "pattern",
    "theme",
    "trend",
    "drift",
    "compliance",
}


OFSTED_KEYWORDS = {
    "ofsted",
    "inspection",
    "sccif",
    "inspector",
    "inspection evidence preparation",
    "Inspection evidence preparation",
    "quality standards",
    "lived experience",
    "impact of care",
    "evidence pack",
    "audit trail",
    "triangulation",
    "what would ofsted notice",
    "what would an inspector notice",
}


THERAPEUTIC_KEYWORDS = {
    "trauma-informed",
    "trauma informed",
    "therapeutic",
    "attachment",
    "relational",
    "relationship-based",
    "relationship based",
    "co-regulation",
    "co regulation",
    "emotional regulation",
    "trigger",
    "triggers",
    "sensory",
    "low arousal",
    "de-escalation",
    "formulation",
    "presentation",
    "lived experience",
}


NEURODEVELOPMENTAL_KEYWORDS = {
    "autism",
    "autistic",
    "adhd",
    "learning disability",
    "learning difficulties",
    "global developmental delay",
    "gdd",
    "non-verbal",
    "non verbal",
    "minimally verbal",
    "communication aid",
    "sensory",
    "neurodivergent",
    "processing time",
    "visuals",
    "visual timetable",
}


REPORT_KEYWORDS = {
    "report",
    "monthly report",
    "monthly summary",
    "reg 45",
    "reg45",
    "regulation 45",
    "quality of care review",
    "annual report",
    "yearly report",
    "manager brief",
    "quality brief",
    "inspection summary",
    "overview report",
    "review pack",
}


EMAIL_KEYWORDS = {
    "email",
    "write an email",
    "draft an email",
    "message to",
    "letter",
    "professional email",
}


TEMPLATE_KEYWORDS = {
    "template",
    "form",
    "checklist",
    "proforma",
    "tool",
    "worksheet",
    "structure for",
    "format for",
}


@dataclass
class IntentClassification:
    primary_intent: str = "guidance"
    secondary_intents: list[str] = field(default_factory=list)
    output_format: str = "plain_response"
    response_stance: str = "practice_support"
    confidence: float = 0.0
    matched_signals: list[str] = field(default_factory=list)
    legacy_mode: str = "practical"


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_text(
    message: str,
    history: list[dict[str, Any]] | None = None,
    max_history: int = 4,
) -> str:
    parts: list[str] = []

    current = _safe_string(message).lower()
    if current:
        parts.append(current)

    for item in (history or [])[-max_history:]:
        if not isinstance(item, dict):
            continue

        role = _safe_string(item.get("role")).lower()
        content = _safe_string(item.get("message") or item.get("content")).lower()

        if role == "user" and content:
            parts.append(content)

    return "\n".join(parts).strip()


def _contains_phrase(text: str, phrase: str) -> bool:
    phrase = _safe_string(phrase).lower()
    if not phrase:
        return False

    if " " in phrase or "-" in phrase or "'" in phrase:
        return phrase in text

    pattern = rf"\b{re.escape(phrase)}\b"
    return re.search(pattern, text) is not None


def _score_keywords(text: str, keywords: set[str]) -> tuple[int, list[str]]:
    matches: list[str] = []

    for keyword in keywords:
        if _contains_phrase(text, keyword):
            matches.append(keyword)

    return len(matches), matches


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)

    return result


def _role_is_managerial(role_text: str) -> bool:
    return any(
        term in role_text
        for term in {
            "manager",
            "registered manager",
            "deputy",
            "senior",
            "team leader",
            "shift leader",
            "responsible individual",
            "provider",
            "director",
            "quality",
            "operations",
        }
    )


def _role_is_provider(role_text: str) -> bool:
    return any(
        term in role_text
        for term in {
            "responsible individual",
            "provider",
            "director",
            "operations manager",
            "head of care",
            "service manager",
            "governance",
        }
    )


def _resolve_legacy_mode(
    primary_intent: str,
    output_format: str,
    response_stance: str,
) -> str:
    if output_format == "handover_note":
        return "handover"
    if output_format == "incident_record":
        return "incident_summary"
    if output_format == "chronology_entry":
        return "chronology"
    if output_format == "daily_log":
        return "recording"
    if output_format == "manager_update":
        return "manager_review"
    if output_format == "support_plan":
        return "support_planning"
    if output_format == "professional_rewrite":
        return "rewrite"
    if output_format == "safeguarding_note":
        return "safeguarding"
    if output_format == "reflective_debrief":
        return "reflective"
    if output_format in {"report", "structured_report", "email_report"}:
        return "manager_review"
    if output_format == "template":
        return "general_practice"

    if primary_intent == "review" and response_stance in {"management", "inspection"}:
        return "manager_review"
    if primary_intent == "reflection":
        return "reflective"
    if primary_intent == "planning":
        return "support_planning"
    if primary_intent == "documentation":
        return "recording"
    if primary_intent == "decision_support":
        return "practical"
    if primary_intent == "guidance":
        return "factual" if response_stance == "practice_support" else "practical"

    return "practical"


def _make_result(
    *,
    primary_intent: str,
    secondary_intents: list[str] | None = None,
    output_format: str,
    response_stance: str,
    confidence: float,
    matched_signals: list[str],
) -> IntentClassification:
    result = IntentClassification(
        primary_intent=primary_intent,
        secondary_intents=_dedupe(secondary_intents or []),
        output_format=output_format,
        response_stance=response_stance,
        confidence=max(0.0, min(float(confidence), 1.0)),
        matched_signals=_dedupe(matched_signals),
    )

    result.legacy_mode = _resolve_legacy_mode(
        result.primary_intent,
        result.output_format,
        result.response_stance,
    )

    return result


def _has_direct_write_pattern(text: str, target: str) -> bool:
    return re.search(rf"\b(write|draft|create|produce|make)\b.*\b{target}\b", text) is not None


def _has_rewrite_pattern(text: str) -> bool:
    return re.search(
        r"\b(rewrite|reword|improve|tidy|clean up|professionalise|professionalize|make this better)\b",
        text,
    ) is not None


def _is_email_request(text: str) -> bool:
    return (
        re.search(r"\b(write|draft|create)\b.*\b(email|letter|message)\b", text) is not None
        or _contains_phrase(text, "write an email")
        or _contains_phrase(text, "draft an email")
    )


def _is_template_request(text: str) -> bool:
    return (
        re.search(r"\b(create|make|draft|write|give me)\b.*\b(template|checklist|form|proforma|tool)\b", text) is not None
        or _contains_phrase(text, "template for")
        or _contains_phrase(text, "checklist for")
    )


def _is_report_request(text: str) -> bool:
    if any(_contains_phrase(text, keyword) for keyword in REPORT_KEYWORDS):
        return True

    return re.search(r"\b(write|draft|create|produce)\b.*\b(report|summary|overview)\b", text) is not None


def _is_standalone_record_limitation_signal(text: str) -> bool:
    return any(
        phrase in text
        for phrase in {
            "without seeing the record",
            "i don't have the record",
            "i do not have the record",
            "based on this only",
            "from this information only",
        }
    )


def classify_intent(
    message: str,
    history: list[dict[str, Any]] | None = None,
    role: str = "",
) -> IntentClassification:
    text = _normalise_text(message, history)
    role_text = _safe_string(role).lower()

    if not text:
        return IntentClassification(
            primary_intent="guidance",
            output_format="plain_response",
            response_stance="practice_support",
            confidence=0.1,
            matched_signals=[],
            legacy_mode="practical",
        )

    signals: dict[str, tuple[int, list[str]]] = {
        "factual": _score_keywords(text, FACTUAL_KEYWORDS),
        "handover": _score_keywords(text, HANDOVER_KEYWORDS),
        "recording": _score_keywords(text, RECORDING_KEYWORDS),
        "incident": _score_keywords(text, INCIDENT_KEYWORDS),
        "chronology": _score_keywords(text, CHRONOLOGY_KEYWORDS),
        "planning": _score_keywords(text, PLANNING_KEYWORDS),
        "manager_review": _score_keywords(text, MANAGER_REVIEW_KEYWORDS),
        "rewrite": _score_keywords(text, REWRITE_KEYWORDS),
        "reflective": _score_keywords(text, REFLECTIVE_KEYWORDS),
        "decision_support": _score_keywords(text, DECISION_SUPPORT_KEYWORDS),
        "document_review": _score_keywords(text, DOCUMENT_REVIEW_KEYWORDS),
        "safeguarding_review": _score_keywords(text, SAFEGUARDING_REVIEW_KEYWORDS),
        "leadership": _score_keywords(text, LEADERSHIP_KEYWORDS),
        "ofsted": _score_keywords(text, OFSTED_KEYWORDS),
        "therapeutic": _score_keywords(text, THERAPEUTIC_KEYWORDS),
        "neurodevelopmental": _score_keywords(text, NEURODEVELOPMENTAL_KEYWORDS),
        "report": _score_keywords(text, REPORT_KEYWORDS),
        "email": _score_keywords(text, EMAIL_KEYWORDS),
        "template": _score_keywords(text, TEMPLATE_KEYWORDS),
    }

    matched_signals: list[str] = []
    for _, matches in signals.values():
        matched_signals.extend(matches)
    matched_signals = _dedupe(matched_signals)

    secondary_intents: list[str] = []

    if _role_is_managerial(role_text):
        secondary_intents.append("managerial_role")
    if _role_is_provider(role_text):
        secondary_intents.append("provider_role")

    if signals["ofsted"][0] > 0:
        secondary_intents.append("inspection_lens")
    if signals["therapeutic"][0] > 0:
        secondary_intents.append("therapeutic_lens")
    if signals["neurodevelopmental"][0] > 0:
        secondary_intents.append("neurodevelopmental_lens")
    if signals["leadership"][0] > 0:
        secondary_intents.append("leadership")
    if _is_standalone_record_limitation_signal(text):
        secondary_intents.append("limited_evidence_warning")

    # Strong direct patterns first.
    if _is_email_request(text):
        return _make_result(
            primary_intent="documentation",
            secondary_intents=secondary_intents + ["email_drafting"],
            output_format="email_report",
            response_stance="documentation",
            confidence=0.94,
            matched_signals=matched_signals + ["email_drafting_pattern"],
        )

    if _is_template_request(text):
        return _make_result(
            primary_intent="template",
            secondary_intents=secondary_intents + ["template_generation"],
            output_format="template",
            response_stance="practice_support",
            confidence=0.94,
            matched_signals=matched_signals + ["template_request_pattern"],
        )

    if _is_report_request(text):
        stance = "inspection" if signals["ofsted"][0] > 0 or "reg 45" in text or "reg45" in text else "management"
        output_format = "structured_report" if any(term in text for term in {"reg 45", "reg45", "report"}) else "manager_update"

        return _make_result(
            primary_intent="report",
            secondary_intents=secondary_intents + ["report_generation"],
            output_format=output_format,
            response_stance=stance,
            confidence=0.92,
            matched_signals=matched_signals + ["report_request_pattern"],
        )

    if _has_direct_write_pattern(text, "handover"):
        return _make_result(
            primary_intent="documentation",
            secondary_intents=secondary_intents,
            output_format="handover_note",
            response_stance="documentation",
            confidence=0.95,
            matched_signals=matched_signals + ["write_handover_pattern"],
        )

    if re.search(r"\b(write|draft|create|produce)\b.*\b(incident|incident report|incident summary)\b", text):
        return _make_result(
            primary_intent="documentation",
            secondary_intents=secondary_intents,
            output_format="incident_record",
            response_stance="documentation",
            confidence=0.95,
            matched_signals=matched_signals + ["write_incident_pattern"],
        )

    if re.search(r"\b(write|draft|create|produce)\b.*\b(chronology|timeline)\b", text):
        return _make_result(
            primary_intent="documentation",
            secondary_intents=secondary_intents,
            output_format="chronology_entry",
            response_stance="documentation",
            confidence=0.95,
            matched_signals=matched_signals + ["write_chronology_pattern"],
        )

    if _has_rewrite_pattern(text):
        return _make_result(
            primary_intent="documentation",
            secondary_intents=secondary_intents + ["rewrite"],
            output_format="professional_rewrite",
            response_stance="documentation",
            confidence=0.92,
            matched_signals=matched_signals + ["rewrite_pattern"],
        )

    if any(
        phrase in text
        for phrase in {
            "full child-centred summary",
            "whole scoped record",
            "across the whole scoped record",
            "across the whole record",
            "not just this page",
            "whole record summary",
        }
    ):
        return _make_result(
            primary_intent="review",
            secondary_intents=secondary_intents + ["whole_scope_summary", "evidence_review"],
            output_format="manager_update",
            response_stance="management",
            confidence=0.92,
            matched_signals=matched_signals + ["whole_scope_summary_pattern"],
        )

    if any(
        phrase in text
        for phrase in {
            "what would ofsted think",
            "what would ofsted say",
            "what would an inspector think",
            "what would an inspector notice",
            "ofsted view",
            "inspection view",
        }
    ):
        return _make_result(
            primary_intent="review",
            secondary_intents=secondary_intents + ["inspection_lens"],
            output_format="manager_update",
            response_stance="inspection",
            confidence=0.9,
            matched_signals=matched_signals + ["inspection_review_pattern"],
        )

    # Scored intent resolution.
    primary_intent = "guidance"
    output_format = "plain_response"
    response_stance = "practice_support"

    if signals["reflective"][0] > 0:
        primary_intent = "reflection"
        output_format = "reflective_debrief"
        response_stance = "reflective"

    if signals["planning"][0] > 0:
        primary_intent = "planning"
        output_format = "support_plan"
        response_stance = "management"

    if signals["handover"][0] > 0:
        primary_intent = "documentation"
        output_format = "handover_note"
        response_stance = "documentation"

    if signals["chronology"][0] > 0:
        primary_intent = "documentation"
        output_format = "chronology_entry"
        response_stance = "documentation"

    if signals["recording"][0] > 0:
        primary_intent = "documentation"
        output_format = "daily_log"
        response_stance = "documentation"

    if signals["incident"][0] > 0:
        primary_intent = "documentation"
        output_format = "incident_record"
        response_stance = "documentation"

    if signals["manager_review"][0] > 0 or signals["document_review"][0] > 0:
        primary_intent = "review"
        output_format = "manager_update"
        response_stance = "management"

    if signals["decision_support"][0] > 0:
        secondary_intents.append("decision_support")
        if primary_intent == "guidance":
            primary_intent = "decision_support"
            output_format = "plain_response"
            response_stance = "practice_support"

    if signals["safeguarding_review"][0] > 0:
        secondary_intents.append("safeguarding_review")
        if primary_intent in {"guidance", "decision_support"}:
            response_stance = "safeguarding"
            output_format = "safeguarding_note"

    if signals["factual"][0] > 0 and primary_intent == "guidance":
        primary_intent = "guidance"
        output_format = "plain_response"
        response_stance = "practice_support"

    if signals["ofsted"][0] > 0:
        if primary_intent in {"guidance", "review", "planning", "decision_support"}:
            response_stance = "inspection"
        secondary_intents.append("inspection_lens")

    if signals["leadership"][0] > 0:
        if primary_intent in {"guidance", "review", "planning", "decision_support"}:
            response_stance = "management"
        secondary_intents.append("leadership")

    if signals["therapeutic"][0] > 0:
        secondary_intents.append("therapeutic_lens")

    if signals["neurodevelopmental"][0] > 0:
        secondary_intents.append("neurodevelopmental_lens")

    if signals["email"][0] > 0 and output_format == "plain_response":
        output_format = "email_report"
        primary_intent = "documentation"
        response_stance = "documentation"

    if signals["template"][0] > 0 and output_format == "plain_response":
        output_format = "template"
        primary_intent = "template"

    if signals["report"][0] > 0:
        primary_intent = "report"
        output_format = "structured_report"
        response_stance = "inspection" if signals["ofsted"][0] > 0 else "management"

    if _role_is_managerial(role_text) and primary_intent in {"guidance", "review", "planning", "decision_support"}:
        secondary_intents.append("manager_role")
        if response_stance == "practice_support":
            response_stance = "management"

    if _role_is_provider(role_text):
        secondary_intents.append("provider_role")
        if primary_intent in {"guidance", "review", "planning", "decision_support", "report"}:
            response_stance = "management"

    secondary_intents = _dedupe(secondary_intents)

    total_signal_count = sum(score for score, _ in signals.values())

    confidence = 0.25
    if total_signal_count >= 1:
        confidence = 0.55
    if total_signal_count >= 2:
        confidence = 0.7
    if total_signal_count >= 4:
        confidence = 0.82
    if total_signal_count >= 7:
        confidence = 0.9

    if re.search(r"\b(write|draft|rewrite|reword|improve|create|produce)\b", text):
        confidence = max(confidence, 0.9)

    if signals["safeguarding_review"][0] > 0:
        confidence = max(confidence, 0.82)

    if signals["ofsted"][0] > 0 or signals["leadership"][0] > 0:
        confidence = max(confidence, 0.78)

    return _make_result(
        primary_intent=primary_intent,
        secondary_intents=secondary_intents,
        output_format=output_format,
        response_stance=response_stance,
        confidence=confidence,
        matched_signals=matched_signals,
    )


def detect_legacy_mode(
    message: str,
    history: list[dict[str, Any]] | None = None,
    role: str = "",
) -> str:
    return classify_intent(
        message=message,
        history=history,
        role=role,
    ).legacy_mode

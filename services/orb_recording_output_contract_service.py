"""ORB recording output contract — factual draft records with guidance separation (Phase Q1).

Produces three-section answers for record-writing prompts:
1. Draft record (first)
2. What to add before sign-off
3. Why this wording is safer

Also provides pathway-drift guards and corrupted-placeholder sanitisation.
"""

from __future__ import annotations

import re
from typing import Any

from services.orb_mandatory_response_contract_service import find_inappropriate_lado_reference

RECORDING_SECTION_DRAFT = "Draft record"
RECORDING_SECTION_SIGNOFF = "What to add before sign-off"
RECORDING_SECTION_SAFER = "Why this wording is safer"

_CORRUPTED_PLACEHOLDER_RE = re.compile(r"\[\[NAME_\d+\]\]|\[NAME_\d+\]", re.I)

_DAILY_RECORD_WITH_FACTS_RE = re.compile(
    r"help\s+me\s+write.*(?:daily\s+record|therapeutic.*record)|"
    r"write.*(?:daily\s+record|child[- ]centred\s+daily\s+record)",
    re.I,
)
_INCIDENT_REFLECTION_WITH_FACTS_RE = re.compile(
    r"help\s+me\s+write.*(?:incident\s+reflection|incident\s+record|factual.*therapeutic)|"
    r"incident\s+reflection.*avoids\s+blame",
    re.I,
)
_CONTEXT_DRIFT_AUDIT_RE = re.compile(
    r"audit\s+your\s+previous\s+answer|was\s+not\s+missing[- ]from[- ]care|"
    r"did\s+not\s+leave\s+the\s+home",
    re.I,
)
_MISSING_RETURN_RE = re.compile(
    r"returned\s+to\s+the\s+home\s+after\s+being\s+missing|"
    r"come\s+back\s+from\s+missing|returned\s+after\s+missing",
    re.I,
)

_FORBIDDEN_REG40_DECISION_RE = re.compile(
    r"regulation\s*40\s+(?:does|does not|do not)\s+apply|"
    r"reg\s*40\s+(?:is|is not)\s+required|"
    r"you\s+must\s+notify\s+ofsted",
    re.I,
)
_OFSTED_OVERCLAIM_RE = re.compile(
    r"will\s+be\s+(outstanding|inadequate|good|requires\s+improvement)|"
    r"inspection[\s-]?ready|guarantee\s+compliance",
    re.I,
)

_UNSUPPORTED_MISSING_TERMS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"missing\s+from\s+care", re.I), "missing from care"),
    (re.compile(r"missing\s+procedure", re.I), "missing procedure"),
    (re.compile(r"return\s+home\s+interview", re.I), "return home interview"),
    (re.compile(r"notify\s+police|police\s+notification|update\s+police", re.I), "police notification"),
)

_CONTEXTUAL_EXPLOITATION_RE = re.compile(
    r"\bexploitation\b|\breturn\s+conversation\b|\bmulti[- ]agency\s+meeting\b",
    re.I,
)

_MANDATORY_SAFEGUARDING_RISK_RE = re.compile(
    r"\b(?:"
    r"wanted to die|self[- ]?harm|suicidal|suicide|ligature|overdose|"
    r"serious injury|fresh cuts?|disclosed|disclosure|allegation|"
    r"hurt them|sexual abuse|abused|exploitation|county lines|"
    r"immediate danger|emergency concern|weapon|assault|"
    r"whereabouts are unknown|left the home|gone missing|"
    r"missing from (?:the )?home right now|is missing from care"
    r")\b",
    re.I,
)

_ORDINARY_DAILY_FACT_KEYS: tuple[str, ...] = (
    "after_contact",
    "declined_meal",
    "staff_gave_space",
    "calm_check_in",
    "supported_to_talk",
)
_ORDINARY_INCIDENT_FACT_KEYS: tuple[str, ...] = (
    "screen_time_boundary",
    "shouted",
    "chair_pushed",
    "went_to_bedroom",
    "staff_gave_space",
    "safety_check",
    "restorative_conversation",
)


def extract_recording_prompt_facts(prompt: str) -> dict[str, Any]:
    """Parse concrete facts from a record-writing prompt — does not invent."""
    text = str(prompt or "").strip()
    lower = text.lower()
    facts: dict[str, Any] = {
        "after_contact": bool(re.search(r"after\s+contact|upset\s+after\s+contact", lower)),
        "declined_meal": bool(re.search(r"refused\s+to\s+join.*meal|declined.*meal|evening\s+meal", lower)),
        "staff_gave_space": "gave them space" in lower or "gave space" in lower,
        "calm_check_in": bool(re.search(r"checked\s+in\s+calmly|calm\s+check", lower)),
        "supported_to_talk": bool(re.search(r"supported\s+them\s+to\s+talk|supported.*talk", lower)),
        "screen_time_boundary": bool(re.search(r"screen\s*time|extra\s+screen", lower)),
        "shouted": "shouted" in lower,
        "chair_pushed": bool(re.search(r"push(?:ed)?\s+a?\s*chair|chair\s+over", lower)),
        "went_to_bedroom": bool(re.search(r"went\s+to\s+their\s+bedroom|bedroom", lower)),
        "safety_check": bool(re.search(r"checked\s+they\s+were\s+safe|safety\s+check", lower)),
        "restorative_conversation": bool(re.search(r"restorative\s+conversation", lower)),
        "not_missing": bool(
            re.search(r"not\s+missing[- ]from[- ]care|did\s+not\s+leave\s+the\s+home", lower)
        ),
        "missing_return": bool(_MISSING_RETURN_RE.search(text)),
        "tired_hungry": bool(re.search(r"tired|hungry|reluctant\s+to\s+talk", lower)),
        "context_drift_audit": bool(_CONTEXT_DRIFT_AUDIT_RE.search(text)),
    }
    return facts


_NEGATED_MISSING_EPISODE_RE = re.compile(
    r"\b(?:not|wasn't|was not|isn't|is not|no)\s+(?:a\s+)?missing[- ]from[- ]care\b|"
    r"\bdid\s+not\s+leave\s+the\s+home\b|"
    r"\bwas\s+not\s+missing\b|"
    r"\bnot\s+a\s+missing\s+episode\b|"
    r"\bthis\s+was\s+not\s+missing[- ]from[- ]care\b",
    re.I,
)


def prompt_negates_missing_episode(prompt: str) -> bool:
    """True when the prompt explicitly states this is not a missing-from-care episode."""
    return bool(_NEGATED_MISSING_EPISODE_RE.search(str(prompt or "")))


def is_context_drift_correction_prompt(prompt: str) -> bool:
    """True for in-home incident pathway-audit / drift-correction prompts."""
    return bool(_CONTEXT_DRIFT_AUDIT_RE.search(str(prompt or "")))


def recording_contract_blocked_by_safeguarding(
    prompt: str,
    *,
    execution_policy: str | None = None,
    contract_family: str | None = None,
) -> bool:
    """True when mandatory safeguarding must win over the deterministic recording contract."""
    text = str(prompt or "").strip()
    if is_context_drift_correction_prompt(text):
        return False

    if execution_policy == "openai_mandatory_safeguarding":
        return True

    if contract_family:
        from services.orb_execution_policy_service import MANDATORY_SAFEGUARDING_FAMILIES

        if contract_family in MANDATORY_SAFEGUARDING_FAMILIES:
            return True

    if not text:
        return False

    lower = text.lower()
    if _MANDATORY_SAFEGUARDING_RISK_RE.search(lower):
        return True

    if re.search(
        r"\b(?:left the home|whereabouts are unknown|gone missing|is missing)\b",
        lower,
    ) and re.search(r"\b(?:incident\s+record|incident\s+reflection)\b", lower):
        return True

    return False


def has_concrete_recording_facts(prompt: str) -> bool:
    """True when the prompt supplies ordinary, recordable facts for Q1 contract builders."""
    facts = extract_recording_prompt_facts(prompt)
    if facts.get("context_drift_audit") or facts.get("missing_return"):
        return True
    if sum(1 for key in _ORDINARY_DAILY_FACT_KEYS if facts.get(key)) >= 2:
        return True
    if sum(1 for key in _ORDINARY_INCIDENT_FACT_KEYS if facts.get(key)) >= 2:
        return True
    return False


def prompt_supports_missing_pathway(prompt: str) -> bool:
    """True when facts or explicit request support missing-from-care pathway language."""
    text = str(prompt or "")
    lower = text.lower()
    if re.search(r"not\s+missing[- ]from[- ]care|did\s+not\s+leave\s+the\s+home", lower):
        return False
    if _MISSING_RETURN_RE.search(text):
        return True
    if re.search(
        r"\b(?:missing|gone\s+missing|left\s+the\s+home|failed\s+to\s+return|absent\s+from\s+care)\b",
        lower,
    ):
        return True
    if re.search(r"missing[- ]from[- ]care", lower) and "not missing" not in lower:
        return True
    return False


def is_recording_contract_prompt(
    prompt: str,
    *,
    execution_policy: str | None = None,
    contract_family: str | None = None,
) -> bool:
    text = str(prompt or "").strip()
    if not text:
        return False
    if recording_contract_blocked_by_safeguarding(
        text,
        execution_policy=execution_policy,
        contract_family=contract_family,
    ):
        return False
    if _CONTEXT_DRIFT_AUDIT_RE.search(text):
        return True
    if _MISSING_RETURN_RE.search(text) and re.search(
        r"what\s+should\s+staff|how\s+should\s+this\s+be\s+recorded", text, re.I
    ):
        return True
    if not has_concrete_recording_facts(text):
        return False
    if _DAILY_RECORD_WITH_FACTS_RE.search(text) or _INCIDENT_REFLECTION_WITH_FACTS_RE.search(text):
        return True
    if re.search(r"daily\s+record", text, re.I) and extract_recording_prompt_facts(text).get(
        "after_contact"
    ):
        return True
    if re.search(r"incident\s+reflection", text, re.I) and has_concrete_recording_facts(text):
        return True
    return False


def has_recording_contract_sections(answer: str) -> bool:
    lower = str(answer or "").lower()
    return (
        "draft record" in lower
        and "what to add before sign-off" in lower
        and "why this wording is safer" in lower
    )


_LEGACY_RECORDING_SCAFFOLD_MARKERS: tuple[str, ...] = (
    "what is known",
    "what to clarify",
    "recording wording scaffold",
)

_LEGACY_RECORDING_CLOSER_RES: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\n+The key is to record the behaviour without blame[\s\S]*$",
        re.I,
    ),
    re.compile(
        r"\n+I'm treating this as[\s\S]*?(?=\n## Draft record|\Z)",
        re.I,
    ),
)


def answer_uses_legacy_recording_scaffold(answer: str) -> bool:
    """True when the answer still uses pre-Q1 recording scaffold headings."""
    lower = str(answer or "").lower()
    return any(marker in lower for marker in _LEGACY_RECORDING_SCAFFOLD_MARKERS)


def strip_legacy_recording_closers(answer: str) -> str:
    """Remove duplicated therapeutic closers from Q1 recording contract answers."""
    cleaned = str(answer or "").strip()
    for pattern in _LEGACY_RECORDING_CLOSER_RES:
        cleaned = pattern.sub("", cleaned).rstrip()
    if has_recording_contract_sections(cleaned):
        tail = cleaned.lower()
        if "the key is to record the behaviour without blame" in tail:
            idx = tail.rfind("the key is to record the behaviour without blame")
            if idx > 0 and "why this wording is safer" in tail[:idx]:
                cleaned = cleaned[:idx].rstrip()
    return cleaned


def enforce_live_recording_contract_answer(
    answer: str,
    prompt: str,
    *,
    execution_policy: str | None = None,
    contract_family: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Rebuild live adult-facing answers onto the Q1 three-section recording contract when needed."""
    meta: dict[str, Any] = {}
    text = str(prompt or "").strip()
    if not text or recording_contract_blocked_by_safeguarding(
        text,
        execution_policy=execution_policy,
        contract_family=contract_family,
    ):
        return str(answer or ""), meta

    if not is_recording_contract_prompt(
        text,
        execution_policy=execution_policy,
        contract_family=contract_family,
    ):
        return str(answer or ""), meta

    current = strip_legacy_recording_closers(str(answer or ""))
    needs_rebuild = (
        answer_uses_legacy_recording_scaffold(current)
        or not has_recording_contract_sections(current)
    )
    if not needs_rebuild:
        return current, meta

    rebuilt = try_build_recording_contract_answer(
        text,
        execution_policy=execution_policy,
        contract_family=contract_family,
    )
    if rebuilt:
        meta["live_recording_contract_enforced"] = True
        meta["replaced_legacy_scaffold"] = answer_uses_legacy_recording_scaffold(current)
        return rebuilt, meta
    return current, meta


def _mentions_term_in_removal_context(text: str, term: str) -> bool:
    """True when a forbidden term appears only in audit/removal guidance."""
    term_lower = str(term).lower()
    for line in str(text or "").splitlines():
        lower_line = line.lower()
        if term_lower not in lower_line:
            continue
        if any(
            phrase in lower_line
            for phrase in (
                "remove",
                "incorrectly",
                "do not apply",
                "does not apply",
                "not for",
                "does not",
                "pathway audit",
            )
        ):
            return True
    return False


def find_pathway_drift_issues(answer: str, prompt: str) -> list[str]:
    """Return pathway drift issue identifiers for unsupported safeguarding language."""
    issues: list[str] = []
    ans_lower = str(answer or "").lower()
    prompt_lower = str(prompt or "").lower()

    if not prompt_supports_missing_pathway(prompt):
        for pattern, label in _UNSUPPORTED_MISSING_TERMS:
            if pattern.search(answer or "") and not _mentions_term_in_removal_context(answer, label):
                issues.append(f"pathway_drift:{label}")

    # Exploitation / return-conversation on in-home behavioural incidents only
    if (
        not prompt_supports_missing_pathway(prompt)
        and not re.search(r"exploitation|county\s+lines|cse", prompt_lower)
        and _CONTEXTUAL_EXPLOITATION_RE.search(answer or "")
        and "pathway audit" not in ans_lower
        and not _mentions_term_in_removal_context(answer, "exploitation")
    ):
        issues.append("pathway_drift:unsupported_contextual_safeguarding")

    if find_inappropriate_lado_reference(answer, prompt):
        issues.append("pathway_drift:lado")

    if _FORBIDDEN_REG40_DECISION_RE.search(answer or ""):
        issues.append("pathway_drift:regulation_40_decision")

    if _OFSTED_OVERCLAIM_RE.search(answer or ""):
        issues.append("pathway_drift:ofsted_judgement")

    if _CORRUPTED_PLACEHOLDER_RE.search(answer or ""):
        issues.append("placeholder_token")

    return issues


def sanitize_corrupted_placeholders(answer: str) -> tuple[str, list[str]]:
    """Replace [[NAME_N]] / [NAME_N] tokens with residential-safe placeholders."""
    text = str(answer or "")
    issues: list[str] = []
    if _CORRUPTED_PLACEHOLDER_RE.search(text):
        issues.append("corrupted_placeholder_replaced")

    def _replace(match: re.Match[str]) -> str:
        token = match.group(0).lower()
        if "staff" in token or "manager" in token:
            return "[Staff Member]"
        return "[Young Person]"

    cleaned = _CORRUPTED_PLACEHOLDER_RE.sub(_replace, text)
    return cleaned, issues


def strip_unsupported_pathway_language(answer: str, prompt: str) -> str:
    """Remove unsupported pathway lines from answers when facts do not support them."""
    if prompt_supports_missing_pathway(prompt):
        return str(answer or "")

    lines = str(answer or "").splitlines()
    kept: list[str] = []
    for line in lines:
        drop = False
        for pattern, label in _UNSUPPORTED_MISSING_TERMS:
            if pattern.search(line) and not _mentions_term_in_removal_context(line, label):
                drop = True
                break
        if not drop and _CONTEXTUAL_EXPLOITATION_RE.search(line):
            if not _mentions_term_in_removal_context(line, "exploitation"):
                drop = True
        if not drop:
            kept.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()


def _section_block(title: str, body: str) -> str:
    return f"## {title}\n\n{body.strip()}"


def build_daily_record_contract_answer(prompt: str) -> str:
    facts = extract_recording_prompt_facts(prompt)
    narrative_parts: list[str] = []

    if facts.get("after_contact"):
        narrative_parts.append(
            "Following family contact, [Young Person] appeared upset."
        )
    if facts.get("declined_meal"):
        narrative_parts.append(
            "[Young Person] was not ready to join the evening meal at first."
        )
    if facts.get("staff_gave_space"):
        narrative_parts.append("Staff gave [Young Person] space.")
    if facts.get("calm_check_in"):
        narrative_parts.append("Staff checked in calmly.")
    if facts.get("supported_to_talk"):
        narrative_parts.append(
            "Later, staff supported [Young Person] to talk about what had happened."
        )

    if not narrative_parts:
        narrative_parts.append(
            "[Add a factual, child-centred account using only what you observed and did.]"
        )

    draft = (
        "**Daily record**\n\n"
        + " ".join(narrative_parts)
        + "\n\n"
        "**[Young Person]'s words (if known):** [Add the young person's exact words here if they shared them.]\n\n"
        "**Outcome / follow-up:** [Add how the evening ended, any handover, and whether further support is needed.]"
    )

    signoff = (
        "- The young person's exact words, if known\n"
        "- Time of contact and time of each adult interaction\n"
        "- Outcome — for example whether they later ate, settled, or needed further support\n"
        "- Who was on shift and any handover for the next adult\n"
        "- Share with the manager or key worker if this links to a pattern, concern, or agreed support plan"
    )

    safer = (
        "This record stays factual and child-centred: it describes what was observed after contact "
        "without blaming the young person for declining the meal, separates observation from "
        "interpretation, and asks for the child's voice rather than inventing it."
    )

    return "\n\n".join(
        [
            _section_block(RECORDING_SECTION_DRAFT, draft),
            _section_block(RECORDING_SECTION_SIGNOFF, signoff),
            _section_block(RECORDING_SECTION_SAFER, safer),
        ]
    )


def build_incident_reflection_contract_answer(prompt: str) -> str:
    facts = extract_recording_prompt_facts(prompt)
    sequence: list[str] = []

    if facts.get("screen_time_boundary"):
        sequence.append(
            "After being told they could not have extra screen time,"
        )
    if facts.get("shouted"):
        sequence.append("[Young Person] shouted at staff.")
    if facts.get("chair_pushed"):
        sequence.append("[Young Person] pushed a chair over.")
    if facts.get("went_to_bedroom"):
        sequence.append("[Young Person] went to their bedroom.")
    if facts.get("staff_gave_space"):
        sequence.append("Staff gave [Young Person] space.")
    if facts.get("safety_check"):
        sequence.append("Staff checked they were safe.")
    if facts.get("restorative_conversation"):
        sequence.append(
            "Later, staff offered [Young Person] the opportunity to talk about what had happened."
        )

    if not sequence:
        sequence.append("[Add the observable sequence using only the facts you provided.]")

    draft = (
        "**Incident reflection**\n\n"
        + " ".join(sequence)
        + "\n\n"
        "**[Young Person]'s words (if known):** [Add the young person's exact words here if they shared them.]\n\n"
        "**Outcome / follow-up:** [Add how the young person presented afterwards and any manager review if needed.]"
    )

    signoff = (
        "- Exact times and location\n"
        "- [Young Person]'s exact words, if known\n"
        "- What staff did to support and keep everyone safe\n"
        "- Outcome and any agreed follow-up or handover\n"
        "- Manager review only if your home procedure requires it for this level of incident"
    )

    if facts.get("screen_time_boundary"):
        safer = (
            "This reflection records the screen-time boundary, observable behaviour, adult response and "
            "restorative follow-up without blame, punitive labels, or invented detail about what "
            "[Young Person] said or felt."
        )
    else:
        safer = (
            "This reflection records the boundary or trigger described, observable behaviour, adult response "
            "and restorative follow-up without blame, punitive labels, or invented detail about what "
            "[Young Person] said or felt."
        )

    return "\n\n".join(
        [
            _section_block(RECORDING_SECTION_DRAFT, draft),
            _section_block(RECORDING_SECTION_SIGNOFF, signoff),
            _section_block(RECORDING_SECTION_SAFER, safer),
        ]
    )


def build_context_drift_correction_answer(prompt: str) -> str:
    incident_body = build_incident_reflection_contract_answer(prompt)
    # Pull draft section from incident builder
    draft_match = re.search(
        r"## Draft record\s*\n+(.*?)(?=\n## What to add before sign-off)",
        incident_body,
        re.S | re.I,
    )
    draft_content = draft_match.group(1).strip() if draft_match else ""

    audit = (
        "**Pathway audit**\n\n"
        "Missing-from-care was incorrectly introduced earlier. The young person **did not leave the home** — "
        "this was an in-home incident after a screen-time boundary, not a missing episode.\n\n"
        "Remove from guidance: police notification, return home interview, missing-from-care procedure, "
        "and generic exploitation/return-conversation steps unless new facts emerge.\n\n"
        "Rewrite guidance for this incident reflection only."
    )

    draft = f"{draft_content}\n\n{audit}" if draft_content else audit

    signoff = (
        "- Confirm no missing-from-care episode occurred\n"
        "- [Young Person]'s words from the restorative conversation, if known\n"
        "- Outcome and any behaviour support or risk review agreed with manager oversight\n"
        "- Handover for the next shift if needed"
    )

    safer = (
        "Guidance must match the facts provided. Introducing missing-from-care pathways when the young person "
        "remained in the home can mis-route staff, over-escalate, and weaken the accuracy of the record."
    )

    return "\n\n".join(
        [
            _section_block(RECORDING_SECTION_DRAFT, draft),
            _section_block(RECORDING_SECTION_SIGNOFF, signoff),
            _section_block(RECORDING_SECTION_SAFER, safer),
        ]
    )


def build_missing_return_contract_answer(prompt: str) -> str:
    from services.orb_execution_policy_service import MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER

    raw = MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER
    draft = (
        "**Immediate actions and recording — missing return**\n\n"
        + raw.replace("Missing return — immediate actions on shift:\n\n", "")
    )

    signoff = (
        "- Exact time of return and who was present\n"
        "- [Young Person]'s exact words and observable presentation (tired, hungry, reluctant to talk)\n"
        "- Welfare check findings — injuries, distress, intoxication, hunger, fatigue\n"
        "- Police update status if the episode was still active\n"
        "- Social worker / placing authority notification\n"
        "- Return home interview / local missing procedure steps completed or planned\n"
        "- Updates to missing, risk and placement plans with manager oversight"
    )

    safer = (
        "A calm welcome back and welfare-first approach protects dignity after a missing episode. "
        "Record observations and the child's words without shame, blame or interrogation. "
        "LADO is only relevant if there is an allegation or concern about an adult in a position of trust — "
        "not for a young person's risky behaviour on return alone."
    )

    return "\n\n".join(
        [
            _section_block(RECORDING_SECTION_DRAFT, draft),
            _section_block(RECORDING_SECTION_SIGNOFF, signoff),
            _section_block(RECORDING_SECTION_SAFER, safer),
        ]
    )


def try_build_recording_contract_answer(
    prompt: str,
    *,
    execution_policy: str | None = None,
    contract_family: str | None = None,
) -> str | None:
    """Build a three-section recording contract answer when the prompt qualifies."""
    text = str(prompt or "").strip()
    if not text:
        return None

    if recording_contract_blocked_by_safeguarding(
        text,
        execution_policy=execution_policy,
        contract_family=contract_family,
    ):
        return None

    if not is_recording_contract_prompt(
        text,
        execution_policy=execution_policy,
        contract_family=contract_family,
    ):
        return None

    if _CONTEXT_DRIFT_AUDIT_RE.search(text):
        return build_context_drift_correction_answer(text)

    if _MISSING_RETURN_RE.search(text) and re.search(
        r"what\s+should\s+staff|how\s+should\s+this\s+be\s+recorded", text, re.I
    ):
        return build_missing_return_contract_answer(text)

    if _INCIDENT_REFLECTION_WITH_FACTS_RE.search(text) or (
        re.search(r"incident\s+reflection", text, re.I) and has_concrete_recording_facts(text)
    ):
        return build_incident_reflection_contract_answer(text)

    if _DAILY_RECORD_WITH_FACTS_RE.search(text) or (
        re.search(r"daily\s+record", text, re.I)
        and extract_recording_prompt_facts(text).get("after_contact")
    ):
        return build_daily_record_contract_answer(text)

    if re.search(r"incident", text, re.I):
        return build_incident_reflection_contract_answer(text)
    return build_daily_record_contract_answer(text)


def validate_recording_contract_answer(
    answer: str,
    prompt: str,
    *,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Validate answer against recording contract rules for quality gate scenarios."""
    contract = dict(contract or {})
    issues: list[str] = []
    lower = str(answer or "").lower()

    for section in contract.get("required_sections") or [
        RECORDING_SECTION_DRAFT,
        RECORDING_SECTION_SIGNOFF,
        RECORDING_SECTION_SAFER,
    ]:
        if section.lower() not in lower:
            issues.append(f"missing_section:{section}")

    # Draft record must appear before sign-off guidance
    draft_pos = lower.find("draft record")
    signoff_pos = lower.find("what to add before sign-off")
    if draft_pos >= 0 and signoff_pos >= 0 and draft_pos > signoff_pos:
        issues.append("draft_record_not_first")

    for term in contract.get("required_terms") or []:
        if str(term).lower() not in lower:
            issues.append(f"missing_required:{term}")

    for term in contract.get("forbidden_terms") or []:
        term_lower = str(term).lower()
        if term_lower in lower and not _mentions_term_in_removal_context(answer, term_lower):
            issues.append(f"forbidden:{term}")

    if contract.get("must_acknowledge_drift"):
        ack_phrases = (
            "incorrectly introduced",
            "not leave the home",
            "not missing",
            "did not leave",
            "in-home incident",
        )
        if not any(p in lower for p in ack_phrases):
            issues.append("drift_not_acknowledged")

    if contract.get("forbid_pathway_drift", True):
        issues.extend(find_pathway_drift_issues(answer, prompt))

    cleaned, _ = sanitize_corrupted_placeholders(answer)
    if cleaned != answer:
        issues.append("placeholder_token")

    return {
        "passed": not issues,
        "issues": issues,
        "sanitized_answer": cleaned,
    }


orb_recording_output_contract_service = type(
    "OrbRecordingOutputContractService",
    (),
    {
        "RECORDING_SECTION_DRAFT": RECORDING_SECTION_DRAFT,
        "RECORDING_SECTION_SIGNOFF": RECORDING_SECTION_SIGNOFF,
        "RECORDING_SECTION_SAFER": RECORDING_SECTION_SAFER,
        "extract_recording_prompt_facts": staticmethod(extract_recording_prompt_facts),
        "prompt_supports_missing_pathway": staticmethod(prompt_supports_missing_pathway),
        "prompt_negates_missing_episode": staticmethod(prompt_negates_missing_episode),
        "is_context_drift_correction_prompt": staticmethod(is_context_drift_correction_prompt),
        "recording_contract_blocked_by_safeguarding": staticmethod(
            recording_contract_blocked_by_safeguarding
        ),
        "has_concrete_recording_facts": staticmethod(has_concrete_recording_facts),
        "is_recording_contract_prompt": staticmethod(is_recording_contract_prompt),
        "has_recording_contract_sections": staticmethod(has_recording_contract_sections),
        "answer_uses_legacy_recording_scaffold": staticmethod(answer_uses_legacy_recording_scaffold),
        "strip_legacy_recording_closers": staticmethod(strip_legacy_recording_closers),
        "enforce_live_recording_contract_answer": staticmethod(enforce_live_recording_contract_answer),
        "find_pathway_drift_issues": staticmethod(find_pathway_drift_issues),
        "sanitize_corrupted_placeholders": staticmethod(sanitize_corrupted_placeholders),
        "strip_unsupported_pathway_language": staticmethod(strip_unsupported_pathway_language),
        "try_build_recording_contract_answer": staticmethod(try_build_recording_contract_answer),
        "build_daily_record_contract_answer": staticmethod(build_daily_record_contract_answer),
        "build_incident_reflection_contract_answer": staticmethod(
            build_incident_reflection_contract_answer
        ),
        "build_context_drift_correction_answer": staticmethod(build_context_drift_correction_answer),
        "build_missing_return_contract_answer": staticmethod(build_missing_return_contract_answer),
        "validate_recording_contract_answer": staticmethod(validate_recording_contract_answer),
    },
)()

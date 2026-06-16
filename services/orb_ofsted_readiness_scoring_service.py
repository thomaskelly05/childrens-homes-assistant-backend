"""Local inspection evidence support scoring for ORB knowledge gap audit and QA."""

from __future__ import annotations

import re
from typing import Any

from services.orb_universal_answer_contract_map_service import (
    find_forbidden_patterns,
    find_missing_markers,
    get_contract_family,
)

INVENTED_FACT_PATTERNS = re.compile(
    r"\b(jamie|alex|sam|taylor|jordan|casey|riley|morgan|"
    r"at\s+\d{1,2}:\d{2}\s*(am|pm)|named\s+staff|staff\s+member\s+\w+\s+did)\b",
    re.I,
)

CHILD_VOICE_TERMS = (
    "child's voice",
    "child voice",
    "young person's voice",
    "their words",
    "they said",
    "she said",
    "he said",
    "told me",
)

RECORDING_QUALITY_TERMS = (
    "factual",
    "record",
    "recording",
    "what happened",
    "staff",
    "outcome",
    "follow-up",
    "follow up",
)

SAFEGUARDING_TERMS = (
    "safeguard",
    "escalat",
    "manager",
    "dsl",
    "lado",
    "welfare",
    "immediate",
    "do not investigate",
)

PROFESSIONAL_BOUNDARY_TERMS = (
    "local procedure",
    "professional judgement",
    "cannot decide",
    "do not replace",
    "escalate",
    "follow local",
)


def score_answer(
    answer: str,
    *,
    prompt: str = "",
    contract_family: str | None = None,
    execution_policy: str | None = None,
    openai_called: bool = False,
    deterministic_available: bool = False,
    high_risk: bool = False,
) -> dict[str, Any]:
    """Score an ORB answer across inspection evidence support dimensions."""
    text = str(answer or "")
    lowered = text.lower()
    family = get_contract_family(contract_family) or {}

    child_centred = _score_child_centred(lowered, family)
    residential_specific = _score_residential(lowered, family, contract_family)
    safeguarding_aware = _score_safeguarding(lowered, high_risk=high_risk)
    recording_quality = _score_recording_quality(lowered, contract_family)
    manager_oversight = _score_manager_oversight(lowered, contract_family)
    child_voice = _score_child_voice(lowered)
    evidence_based = _score_evidence_based(lowered)
    professional_boundary = _score_professional_boundary(lowered, high_risk=high_risk)

    forbidden = find_forbidden_patterns(text, family_id=contract_family)
    missing_markers = find_missing_markers(text, family_id=contract_family)
    no_invented_facts = not _has_invented_facts(text, prompt)

    internal_first = (
        execution_policy in {"deterministic_only", "internal_template_plus_validator"}
        or not openai_called
    )
    cost_control = internal_first or not (
        openai_called and deterministic_available and execution_policy in {
            "deterministic_only",
            "internal_template_plus_validator",
        }
    )

    inspection_evidence_score = _composite_inspection_evidence_score(
        child_centred=child_centred,
        residential_specific=residential_specific,
        safeguarding_aware=safeguarding_aware,
        recording_quality=recording_quality,
        child_voice=child_voice,
        evidence_based=evidence_based,
        professional_boundary=professional_boundary,
    )

    high_risk_failure = high_risk and safeguarding_aware < 3
    inspection_evidence_support = (
        not high_risk_failure
        and no_invented_facts
        and (bool(contract_family) if contract_family else True)
        and inspection_evidence_score >= 3
        and not forbidden
        and internal_first
        and cost_control
    )

    # Child voice / recording quality gate for template answers
    if contract_family in {"daily_record", "keywork_session", "incident_record"}:
        if child_voice < 2 and "structure" not in lowered and "paste" not in lowered:
            inspection_evidence_support = False
        if recording_quality < 2 and "structure" not in lowered:
            inspection_evidence_support = False

    return {
        "child-centred": child_centred,
        "residential-specific": residential_specific,
        "safeguarding-aware": safeguarding_aware,
        "recording-quality": recording_quality,
        "manager-oversight": manager_oversight,
        "child-voice": child_voice,
        "evidence-based": evidence_based,
        "professional-boundary": professional_boundary,
        "inspection-evidence-support": inspection_evidence_score,
        "no-invented-facts": "pass" if no_invented_facts else "fail",
        "internal-first": "pass" if internal_first else "fail",
        "cost-control": "pass" if cost_control else "fail",
        "inspection_evidence_support": inspection_evidence_support,
        # Deprecated alias — snake_case only for API migration
        "ofsted_ready": inspection_evidence_support,
        "forbidden_patterns": forbidden,
        "missing_markers": missing_markers,
    }


def _score_child_centred(lowered: str, family: dict[str, Any]) -> int:
    score = 0
    terms = ("child-centred", "child centred", "young person", "their", "what mattered")
    score += min(3, sum(1 for t in terms if t in lowered))
    if family.get("contract_mode") == "recording":
        score += 1
    if "child's voice" in lowered or "child voice" in lowered:
        score += 1
    return min(5, score)


def _score_residential(lowered: str, family: dict[str, Any], contract_family: str | None) -> int:
    score = 0
    residential_terms = (
        "residential",
        "children's home",
        "childrens home",
        "shift",
        "home",
        "ofsted",
        "reg ",
        "quality standard",
        "key-work",
        "keywork",
        "handover",
    )
    score += min(3, sum(1 for t in residential_terms if t in lowered))
    if contract_family:
        score += 2
    if family:
        score += 1
    return min(5, score)


def _score_safeguarding(lowered: str, *, high_risk: bool) -> int:
    score = sum(1 for t in SAFEGUARDING_TERMS if t in lowered)
    if high_risk and score < 2:
        return max(0, score)
    return min(5, score + (1 if high_risk and score >= 2 else 0))


def _score_recording_quality(lowered: str, contract_family: str | None) -> int:
    score = sum(1 for t in RECORDING_QUALITY_TERMS if t in lowered)
    if contract_family in {"daily_record", "incident_record", "keywork_session", "handover"}:
        score += 2
    return min(5, score)


def _score_manager_oversight(lowered: str, contract_family: str | None) -> int:
    if contract_family not in {"manager_oversight_note", None} and "manager" not in lowered:
        return 0
    terms = ("oversight", "manager", "review", "pattern", "follow-up", "escalation")
    return min(5, sum(1 for t in terms if t in lowered))


def _score_child_voice(lowered: str) -> int:
    return min(5, sum(1 for t in CHILD_VOICE_TERMS if t in lowered) + (2 if "voice" in lowered else 0))


def _score_evidence_based(lowered: str) -> int:
    terms = ("factual", "evidence", "seen", "heard", "observed", "record", "what happened")
    return min(5, sum(1 for t in terms if t in lowered))


def _score_professional_boundary(lowered: str, *, high_risk: bool) -> int:
    score = sum(1 for t in PROFESSIONAL_BOUNDARY_TERMS if t in lowered)
    if high_risk:
        score += 1 if "do not investigate" in lowered or "escalat" in lowered else 0
    return min(5, score)


def _composite_inspection_evidence_score(**scores: int) -> int:
    relevant = [
        scores.get("child_centred", 0),
        scores.get("residential_specific", 0),
        scores.get("safeguarding_aware", 0),
        scores.get("recording_quality", 0),
        scores.get("child_voice", 0),
        scores.get("evidence_based", 0),
        scores.get("professional_boundary", 0),
    ]
    if not relevant:
        return 0
    return min(5, round(sum(relevant) / len(relevant)))


def _has_invented_facts(answer: str, prompt: str) -> bool:
    """Detect invented child/staff/incident details not present in the prompt."""
    prompt_lower = str(prompt or "").lower()
    answer_lower = str(answer or "").lower()
    # Template structure answers should not invent facts
    if "date/time:" in answer_lower and "paste" in answer_lower:
        return False
    if INVENTED_FACT_PATTERNS.search(answer_lower):
        # Allow if prompt already mentions the detail
        for match in INVENTED_FACT_PATTERNS.findall(answer_lower):
            if str(match).lower() not in prompt_lower:
                return True
    invented_phrases = (
        "the young person was calm at breakfast",
        "staff member john",
        "at 3pm the child",
    )
    return any(p in answer_lower and p not in prompt_lower for p in invented_phrases)


class OrbInspectionEvidenceScoringService:
    score_answer = staticmethod(score_answer)


# Backward-compatible aliases
OrbOfstedReadinessScoringService = OrbInspectionEvidenceScoringService
orb_inspection_evidence_scoring_service = OrbInspectionEvidenceScoringService()
orb_ofsted_readiness_scoring_service = orb_inspection_evidence_scoring_service

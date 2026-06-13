"""ORB Dictate quality checks — aligned with frontend recording-quality-coach.ts."""

from __future__ import annotations

import re
from typing import Literal

from schemas.orb_dictate import OrbDictateQualityChecks

OrbDictateQualityStatus = Literal["present", "missing", "weak", "review", "good", "needs_review"]

CHILD_VOICE_MARKERS = re.compile(
    r'\b(said|told|shared|communicated|expressed|voice|wish|feeling|felt)\b|"',
    re.I,
)
ADULT_RESPONSE_MARKERS = re.compile(
    r"\b(adult|staff|responded|de-escalat|supported|co-regulat|intervened|followed|procedure)\b",
    re.I,
)
SAFEGUARDING_MARKERS = re.compile(
    r"\b(safeguard|concern|disclosure|injury|missing|exploitation|harm|risk|escalat|allegation)\b",
    re.I,
)
MANAGER_MARKERS = re.compile(
    r"\b(manager|oversight|reviewed|notified|registered manager|duty manager|sign[\s-]?off)\b",
    re.I,
)
IMPACT_MARKERS = re.compile(
    r"\b(outcome|impact|follow[\s-]?up|plan|next step|result)\b",
    re.I,
)
REPAIR_MARKERS = re.compile(
    r"\b(repair|follow[\s-]?up|check[\s-]?in|debrief|restor|next step|action|review date)\b",
    re.I,
)
FACT_MARKERS = re.compile(
    r"\b(observed|seen|heard|at approximately|time|location|presented)\b",
    re.I,
)
INTERPRETATION_MARKERS = re.compile(
    r"\b(manipulative|deliberately|chose to|clearly wanted|obviously)\b",
    re.I,
)
CURIOSITY_MARKERS = re.compile(
    r"\b(curiosity|hypothes|question|wonder|explore|why might|what if)\b",
    re.I,
)
CHRONOLOGY_MARKERS = re.compile(
    r"\b(chronolog|timeline|sequence|before|after|then|subsequently|at approximately)\b",
    re.I,
)
PLAN_RISK_MARKERS = re.compile(
    r"\b(plan|risk assessment|placement plan|risk review|care plan)\b",
    re.I,
)
TONE_MARKERS = re.compile(
    r"\b(calm|professional|respect|therapeutic|child[\s-]?centred)\b",
    re.I,
)
EVIDENCE_ACTION_MARKERS = re.compile(
    r"\b(action|completed|informed|contacted|escalat|evidence|documented)\b",
    re.I,
)
JUDGEMENTAL_MARKERS = re.compile(
    r"\b(manipulative|naughty|attention[\s-]?seeking|refused|kicked off|bad behaviour|"
    r"non[\s-]?compliant|chose to behave)\b",
    re.I,
)
EMOTIONALLY_LOADED = re.compile(
    r"\b(awful|terrible|disgusting|hateful|useless|pathetic|nightmare)\b",
    re.I,
)

MULTI_PERSON_NOTE_TYPES = frozenset(
    {
        "team_meeting",
        "staff_debrief",
        "investigation_meeting",
        "supervision_reflection",
        "handover_note",
        "meeting_notes",
        "professional_consultation",
        "home_visit_note",
        "assessment_notes",
        "supervision_discussion",
        "multi_agency_discussion",
        "strategy_safeguarding_discussion",
    }
)


def _status(present: bool, *, weak_if_short: int | None = None, text: str = "") -> OrbDictateQualityStatus:
    if not present:
        return "missing"
    if weak_if_short is not None and len(text) < weak_if_short:
        return "weak"
    return "present"


def compute_quality_checks(text: str, note_type: str) -> OrbDictateQualityChecks:
    body = (text or "").strip()[:50_000]
    word_count = len(body.split()) if body else 0

    child = _status(bool(CHILD_VOICE_MARKERS.search(body) or '"' in body), weak_if_short=80, text=body)
    safeguarding = "present" if SAFEGUARDING_MARKERS.search(body) else "missing"
    if note_type in {"safeguarding_concern_record", "incident_record", "missing_episode_note", "investigation_meeting"}:
        if safeguarding == "missing":
            safeguarding = "review"

    manager = "present" if MANAGER_MARKERS.search(body) else "missing"
    if note_type in {"manager_oversight_note", "incident_record", "investigation_meeting"} and manager == "missing":
        manager = "missing"

    impact = "present" if IMPACT_MARKERS.search(body) else "missing"

    factual_clarity: OrbDictateQualityStatus = (
        "present"
        if FACT_MARKERS.search(body) and not INTERPRETATION_MARKERS.search(body) and word_count >= 15
        else "weak"
        if word_count >= 8
        else "missing"
    )
    staff_response: OrbDictateQualityStatus = "present" if ADULT_RESPONSE_MARKERS.search(body) else "missing"
    professional_curiosity: OrbDictateQualityStatus = (
        "present" if CURIOSITY_MARKERS.search(body) else "missing"
    )
    chronology_relevance: OrbDictateQualityStatus = (
        "present" if CHRONOLOGY_MARKERS.search(body) or note_type == "chronology_entry" else "missing"
    )
    plan_risk_review: OrbDictateQualityStatus = "present" if PLAN_RISK_MARKERS.search(body) else "missing"
    recording_tone: OrbDictateQualityStatus = (
        "present" if TONE_MARKERS.search(body) and not EMOTIONALLY_LOADED.search(body) else "weak"
    )
    non_judgemental: OrbDictateQualityStatus = (
        "present" if not JUDGEMENTAL_MARKERS.search(body) else "review"
    )
    evidence_of_action: OrbDictateQualityStatus = (
        "present" if EVIDENCE_ACTION_MARKERS.search(body) or REPAIR_MARKERS.search(body) else "missing"
    )
    follow_up_review: OrbDictateQualityStatus = (
        "present" if REPAIR_MARKERS.search(body) else "missing"
    )

    recording_quality: Literal["good", "needs_review"] = "good"
    if (
        JUDGEMENTAL_MARKERS.search(body)
        or child in {"missing", "weak"}
        or non_judgemental == "review"
        or EMOTIONALLY_LOADED.search(body)
    ):
        recording_quality = "needs_review"
    if safeguarding in {"review", "missing"} and note_type in {
        "safeguarding_concern_record",
        "incident_record",
        "investigation_meeting",
    }:
        recording_quality = "needs_review"

    return OrbDictateQualityChecks(
        child_voice=child,  # type: ignore[arg-type]
        safeguarding=safeguarding,  # type: ignore[arg-type]
        manager_oversight=manager,  # type: ignore[arg-type]
        impact=impact,  # type: ignore[arg-type]
        recording_quality=recording_quality,
        factual_clarity=factual_clarity,  # type: ignore[arg-type]
        staff_response=staff_response,  # type: ignore[arg-type]
        professional_curiosity=professional_curiosity,  # type: ignore[arg-type]
        chronology_relevance=chronology_relevance,  # type: ignore[arg-type]
        plan_risk_review=plan_risk_review,  # type: ignore[arg-type]
        recording_tone=recording_tone,  # type: ignore[arg-type]
        non_judgemental_language=non_judgemental,  # type: ignore[arg-type]
        evidence_of_action=evidence_of_action,  # type: ignore[arg-type]
        follow_up_review_date=follow_up_review,  # type: ignore[arg-type]
    )

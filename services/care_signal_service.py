from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from schemas.data_intelligence import CareMetadata


SIGNAL_KEYWORDS: dict[str, tuple[str, ...]] = {
    "emotional_wellbeing_present": (
        "anxious",
        "calm",
        "distressed",
        "emotional",
        "feel",
        "felt",
        "mood",
        "presentation",
        "sad",
        "settled",
        "upset",
        "wellbeing",
    ),
    "health_present": ("appointment", "camhs", "doctor", "health", "medical", "medication", "nurse", "therapy"),
    "education_present": ("college", "education", "lesson", "pep", "school", "teacher", "tutor"),
    "sleep_present": ("bedtime", "night", "slept", "sleep", "woke"),
    "family_contact_present": (
        "contact",
        "dad",
        "family",
        "father",
        "mum",
        "mother",
        "parent",
        "sibling",
    ),
    "exercise_activity_present": ("activity", "football", "gym", "swim", "walk", "exercise", "club"),
    "relationship_present": ("friend", "peer", "relationship", "staff", "trusted adult", "visitor"),
    "trauma_informed_support": (
        "emotional safety",
        "predictable",
        "repair",
        "restorative",
        "non-punitive",
        "curious",
        "debrief",
        "regulated",
        "co-regulation",
        "trusted adult",
        "choice",
    ),
    "neurodiversity_adjustment": (
        "processing time",
        "visual timetable",
        "sensory",
        "transition",
        "routine change",
        "communication preference",
        "masking",
        "shutdown",
        "meltdown",
        "demand avoidance",
        "executive functioning",
    ),
    "sensory_factor": ("sensory", "noise", "bright", "busy", "texture", "smell", "overstimulated", "overwhelmed"),
    "regulation_support_present": ("regulated", "co-regulation", "breathing", "calming", "quiet space", "reassured"),
    "behaviour_support_present": ("behaviour support", "pbs", "de-escalat", "restorative", "repair", "boundary"),
    "positive_progress_present": (
        "achievement",
        "completed",
        "enjoyed",
        "positive",
        "progress",
        "proud",
        "settled",
        "success",
    ),
    "safeguarding_marker": ("allegation", "cse", "exploitation", "harm", "lado", "safeguard", "self-harm"),
    "exploitation_possible_indicator": ("cse", "cce", "exploitation", "unknown adult", "new phone", "hotel", "train station"),
    "risk_marker": ("risk", "unsafe", "threat", "weapon", "substance", "restraint", "de-escalat"),
    "missing_marker": ("abscond", "missing", "police", "returned", "unauthorised absence"),
    "incident_marker": ("incident", "injury", "restraint", "physical intervention", "damage", "assault"),
    "follow_up_required": ("action required", "follow up", "follow-up", "to do", "needs review", "referral"),
    "plan_update_suggested": ("update plan", "plan review", "care plan", "placement plan", "pbs plan"),
    "risk_update_suggested": ("risk review", "risk assessment", "risk update", "missing risk", "locality risk"),
    "document_evidence_relevance": ("document", "evidence", "plan", "policy", "report", "sign-off", "signoff"),
    "inspection_relevance": ("ofsted", "inspection", "sccif", "quality standard", "reg 44", "reg 45"),
    "handover_relevance": ("handover", "next shift", "briefing", "shift"),
    "manager_review_required": ("manager review", "escalate", "senior", "significant", "oversight"),
}

CHILD_VOICE_FIELDS = ("young_person_voice", "child_voice", "voice", "views", "wishes", "feelings")
CHILD_VOICE_TERMS = (" said ", " told ", " asked ", " wanted ", " felt ", " chose ", " shared ")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _normalise(value: Any) -> str:
    return f" {_text(value).lower()} "


def _field_text(record: Mapping[str, Any], *keys: str) -> str:
    return " ".join(_text(record.get(key)) for key in keys if record.get(key) not in (None, ""))


def _contains_any(haystack: str, terms: tuple[str, ...]) -> bool:
    return any(term in haystack for term in terms)


class CareSignalService:
    """Cheap deterministic care-signal extraction from fields and keyword patterns."""

    def extract(
        self,
        *,
        record_type: str,
        record: Mapping[str, Any] | None = None,
        text: str | None = None,
    ) -> CareMetadata:
        record = record or {}
        combined = _normalise(
            " ".join(
                [
                    _text(text),
                    _field_text(
                        record,
                        "title",
                        "summary",
                        "narrative",
                        "presentation",
                        "activities",
                        "education_update",
                        "health_update",
                        "family_update",
                        "behaviour_update",
                        "actions_required",
                        "positives",
                        "description",
                        "notes",
                    ),
                ]
            )
        )

        metadata = CareMetadata()
        detected: list[str] = []
        for field, keywords in SIGNAL_KEYWORDS.items():
            present = _contains_any(combined, keywords) or bool(record.get(field))
            setattr(metadata, field, present)
            if present:
                detected.append(field)

        if _field_text(record, *CHILD_VOICE_FIELDS):
            metadata.child_voice_present = True
        elif _contains_any(combined, CHILD_VOICE_TERMS):
            metadata.child_voice_present = True

        metadata.child_voice_missing = record_type in {"daily_note", "keywork_direct_work"} and not metadata.child_voice_present
        if metadata.child_voice_missing:
            metadata.record_quality_flags.append("child_voice_missing")

        if record.get("manager_review_needed") is True or record.get("workflow_status") in {"submitted", "approved"}:
            metadata.manager_review_required = True
            if "manager_review_required" not in detected:
                detected.append("manager_review_required")

        if record.get("safeguarding_concern") is True:
            metadata.safeguarding_marker = True
            if "safeguarding_marker" not in detected:
                detected.append("safeguarding_marker")

        if metadata.safeguarding_marker or metadata.risk_marker or metadata.missing_marker or metadata.incident_marker:
            metadata.inspection_relevance = True
            metadata.handover_relevance = True
            for field in ("inspection_relevance", "handover_relevance"):
                if field not in detected:
                    detected.append(field)

        if metadata.exploitation_possible_indicator or metadata.missing_marker:
            metadata.risk_update_suggested = True
            if "risk_update_suggested" not in detected:
                detected.append("risk_update_suggested")

        if metadata.trauma_informed_support or metadata.neurodiversity_adjustment:
            metadata.plan_update_suggested = True
            if "plan_update_suggested" not in detected:
                detected.append("plan_update_suggested")

        metadata.detected_signals = sorted(set(detected))
        return metadata


care_signal_service = CareSignalService()

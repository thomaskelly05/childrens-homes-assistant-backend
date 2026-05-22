from __future__ import annotations

import re
from typing import Any

from schemas.indicare_intelligence import RecordQuality, RecordQualityReview
from services.risk_intelligence_language import field, safe_text

PUNITIVE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bbad behaviour\b", re.I), "Consider describing behaviour in context of need, trigger and support offered."),
    (re.compile(r"\bnon[- ]?compliant\b", re.I), "Consider whether compliance framing reflects the child's communication or distress."),
    (re.compile(r"\battention seeking\b", re.I), "Consider reframing as connection or regulation need."),
    (re.compile(r"\brefused\b", re.I), "Consider what the child may have been communicating and what support was offered."),
    (re.compile(r"\bkicked off\b", re.I), "Consider a factual sequence with staff response and recovery."),
    (re.compile(r"\bmanipulative\b", re.I), "Avoid attributional labels; describe observable interactions and adult response."),
    (re.compile(r"\bnaughty\b", re.I), "Use child-centred, non-judgemental language."),
    (re.compile(r"\baggressive\b", re.I), "If used, add context, meaning, staff response and recovery."),
    (re.compile(r"\bchallenging behaviour\b", re.I), "Add meaning, triggers, regulation support and outcome."),
)

REQUIRED_ELEMENTS: dict[str, tuple[str, ...]] = {
    "daily_note": ("what happened", "child response", "staff response", "outcome"),
    "incident": ("sequence", "staff response", "injury check", "recovery", "manager visibility"),
    "safeguarding_concern": ("concern", "immediate actions", "multi-agency", "manager visibility"),
    "missing_episode": ("circumstances", "actions taken", "return", "interview"),
    "keywork": ("purpose", "child voice", "outcome"),
    "risk_assessment": ("risks", "protective factors", "review date"),
}


def _norm_type(record: dict[str, Any]) -> str:
    return str(field(record, "record_type", "type") or "record").lower().strip()


def _text(record: dict[str, Any]) -> str:
    return safe_text(
        " ".join(
            str(field(record, key) or "")
            for key in ("title", "summary", "description", "notes", "content", "body", "narrative")
        )
    )


def _child_voice(record: dict[str, Any]) -> bool:
    if field(record, "child_voice_present") is True:
        return True
    blob = _text(record).lower()
    return any(m in blob for m in ("child said", "yp said", "wishes", "feelings", "child voice"))


class RecordQualityIntelligenceService:
    """Supportive record quality review — guidance only, not rewriting."""

    def review_records(self, records: list[dict[str, Any]] | None = None) -> list[RecordQualityReview]:
        return [self.review_record(record, index=index) for index, record in enumerate(records or [])]

    def review_record(self, record: dict[str, Any], *, index: int = 0) -> RecordQualityReview:
        record_type = _norm_type(record)
        text = _text(record)
        flags = self._therapeutic_flags(text)
        child_voice = _child_voice(record)
        missing = self._missing_elements(record_type, text, record)
        strengths: list[str] = []
        improvements: list[str] = []
        guidance: list[str] = []

        if child_voice:
            strengths.append("Child voice or wishes appear present; source review still required.")
        else:
            improvements.append("Child voice evidence appears limited; review recommended.")
            guidance.append("Where safe, add the child's words, choices or visible response.")

        if field(record, "staff_response", "actions_taken") or "staff" in text.lower():
            strengths.append("Staff response appears recorded.")
        else:
            missing.append("staff response")
            improvements.append("Consider clarifying what adults did and why.")

        if field(record, "outcome", "follow_up") or "outcome" in text.lower() or "follow" in text.lower():
            strengths.append("Outcome or follow-up appears referenced.")
        else:
            missing.append("outcome or follow-up")
            improvements.append("Add what changed afterwards and any next steps.")

        if field(record, "plan_link", "care_plan_id") or "plan" in text.lower():
            strengths.append("Plan link may be present.")
        else:
            guidance.append("Consider linking to the relevant care or risk plan where appropriate.")

        if flags:
            improvements.append("Therapeutic language review recommended.")
            guidance.extend(guidance_text for _, guidance_text in flags)
            therapeutic_flags = [label for label, _ in flags]
        else:
            therapeutic_flags = []

        quality = self._score(len(strengths), len(improvements), len(flags), len(text))
        manager_review = (
            record_type in {"incident", "safeguarding_concern", "missing_episode", "restraint"}
            or len(flags) > 0
            or not child_voice
        )

        return RecordQualityReview(
            record_id=str(field(record, "id", "record_id") or f"record-{index}"),
            record_type=record_type,
            overall_quality=quality,
            strengths=strengths[:6],
            improvements=improvements[:6],
            missing_elements=missing[:8],
            therapeutic_language_flags=therapeutic_flags,
            child_voice_present=child_voice,
            manager_review_required=manager_review,
            suggested_rewrite_guidance=guidance[:8],
        )

    def _therapeutic_flags(self, text: str) -> list[tuple[str, str]]:
        found: list[tuple[str, str]] = []
        for pattern, guidance in PUNITIVE_PATTERNS:
            if pattern.search(text):
                found.append((pattern.pattern, guidance))
        return found

    def _missing_elements(self, record_type: str, text: str, record: dict[str, Any]) -> list[str]:
        required = REQUIRED_ELEMENTS.get(record_type, ())
        missing: list[str] = []
        lower = text.lower()
        for element in required:
            tokens = element.split()
            if not any(token in lower for token in tokens):
                if element == "manager visibility" and _manager_visible(record):
                    continue
                missing.append(element)
        return missing

    def _score(self, strengths: int, improvements: int, flags: int, length: int) -> RecordQuality:
        if flags >= 2 or length < 30:
            return "weak"
        if improvements >= 3:
            return "developing"
        if strengths >= 3 and flags == 0:
            return "strong"
        if strengths >= 2:
            return "good"
        return "developing"


def _manager_visible(record: dict[str, Any]) -> bool:
    return field(record, "manager_reviewed", "manager_review") is True or str(
        field(record, "manager_review_status") or ""
    ).lower() in {"complete", "reviewed"}


record_quality_intelligence_service = RecordQualityIntelligenceService()

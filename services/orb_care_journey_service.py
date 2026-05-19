from __future__ import annotations

from collections import Counter
from typing import Any


THEME_KEYWORDS = {
    "identity and belonging": ("identity", "belonging", "life story", "culture", "family", "contact"),
    "communication and sensory support": ("communication", "sensory", "routine", "regulation", "neurodiversity"),
    "education and engagement": ("school", "education", "learning", "attendance", "timetable"),
    "relationships and repair": ("relationship", "repair", "keywork", "trusted", "staff", "contact"),
    "emotional wellbeing": ("settled", "upset", "anxious", "calm", "wellbeing", "emotion"),
    "safeguarding and risk": ("safeguarding", "missing", "incident", "risk", "police", "harm"),
}

STRENGTH_TERMS = ("settled", "engaged", "positive", "improved", "consistent", "trusted", "calm", "attended")
REVIEW_TERMS = ("missing", "incident", "risk", "safeguarding", "refused", "declined", "upset", "overdue", "review")


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _record_text(record: dict[str, Any]) -> str:
    parts = [
        record.get("title"),
        record.get("summary"),
        record.get("description"),
        record.get("extracted_text"),
        record.get("document_type"),
        record.get("status"),
        record.get("source_type"),
    ]
    return " ".join(_text(part) for part in parts).lower()


def _source_ref(record: dict[str, Any], index: int) -> dict[str, Any]:
    return {
        "citation_ref": record.get("citation_ref") or f"[{index}]",
        "title": _text(record.get("title"), record.get("source_type") or record.get("record_type") or "Record"),
        "record_type": _text(record.get("record_type") or record.get("source_type") or record.get("document_type"), "record"),
        "record_id": _text(record.get("record_id") or record.get("source_id") or record.get("id")),
        "summary": _text(record.get("summary") or record.get("description") or record.get("extracted_text"), "Record available for review."),
    }


class OrbCareJourneyService:
    """Synthesises a child-centred care journey from one operational context bundle."""

    def build(self, context: dict[str, Any]) -> dict[str, Any]:
        sources = list(context.get("sources") or [])
        chronology = list(context.get("chronology") or [])
        safeguarding = list(context.get("safeguarding") or [])
        documents = list(context.get("documents") or [])
        actions = list(context.get("actions") or [])
        evidence = list(context.get("evidence") or [])
        all_records = [*chronology, *safeguarding, *documents, *actions, *evidence, *list(context.get("reports") or [])]

        theme_counts: Counter[str] = Counter()
        strengths: list[str] = []
        review_areas: list[str] = []
        for record in all_records:
            text = _record_text(record)
            for theme, keywords in THEME_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    theme_counts[theme] += 1
            if any(term in text for term in STRENGTH_TERMS):
                strengths.append(_text(record.get("summary") or record.get("title"), "Positive evidence is present."))
            if any(term in text for term in REVIEW_TERMS):
                review_areas.append(_text(record.get("summary") or record.get("title"), "Review evidence is present."))

        emotional_themes = [theme for theme, _count in theme_counts.most_common(5)]
        if not emotional_themes and sources:
            emotional_themes = ["daily lived experience", "recording quality"]

        protective_factors = []
        if any("education" in theme for theme in emotional_themes):
            protective_factors.append("education engagement evidence")
        if any("relationships" in theme for theme in emotional_themes):
            protective_factors.append("relational continuity with staff or family")
        if any("communication" in theme for theme in emotional_themes):
            protective_factors.append("personalised communication or sensory support")
        if strengths and not protective_factors:
            protective_factors.append("recorded positive engagement or stability")

        evidence_gaps = []
        if not chronology:
            evidence_gaps.append("daily chronology evidence is limited in the permitted context")
        if context.get("child_profile") and not documents:
            evidence_gaps.append("plans and profile documents are not strongly represented in the current evidence")
        if safeguarding and not actions:
            evidence_gaps.append("safeguarding themes would be stronger with linked management actions and review outcomes")
        if not evidence_gaps and sources:
            evidence_gaps.append("managers may still want daily records to show how plans change lived experience")

        return {
            "record_count": len(all_records),
            "source_count": len(sources),
            "chronology_count": len(chronology),
            "safeguarding_count": len(safeguarding),
            "document_count": len(documents),
            "action_count": len(actions),
            "emotional_themes": emotional_themes[:5],
            "strengths": strengths[:4],
            "review_areas": review_areas[:4],
            "protective_factors": protective_factors[:4],
            "support_needs": self._support_needs(emotional_themes, review_areas),
            "progress": self._progress_phrase(strengths, review_areas, chronology),
            "engagement": "There is some engagement evidence in the live records." if strengths else "Engagement is not yet strongly evidenced in the returned records.",
            "relational_stability": "Relational continuity is visible." if any("relationships" in theme for theme in emotional_themes) else "Relational stability needs to be evidenced through daily recording and keywork.",
            "placement_stability": "No placement conclusion is made; ORB can only reflect the returned records.",
            "evidence_gaps": evidence_gaps[:4],
            "chronology_references": [_source_ref(item, index + 1) for index, item in enumerate((sources or chronology)[:5])],
        }

    def _support_needs(self, themes: list[str], review_areas: list[str]) -> list[str]:
        needs = []
        if any("communication" in theme for theme in themes):
            needs.append("continue personalised communication and sensory-informed routines")
        if any("safeguarding" in theme for theme in themes) or review_areas:
            needs.append("keep safeguarding patterns under calm manager review")
        if any("education" in theme for theme in themes):
            needs.append("connect emotional stability with education engagement")
        if not needs:
            needs.append("strengthen daily lived-experience evidence so support can be reviewed confidently")
        return needs[:4]

    def _progress_phrase(self, strengths: list[str], review_areas: list[str], chronology: list[dict[str, Any]]) -> str:
        if strengths and review_areas:
            return "Records show some positive engagement alongside areas that still need reflective manager review."
        if strengths:
            return "Records suggest emerging strengths or stability, subject to manager review of the full chronology."
        if chronology:
            return "The chronology gives a factual sequence, but emotional progress needs clearer daily evidence."
        return "There is not enough live chronology evidence to describe progress safely."

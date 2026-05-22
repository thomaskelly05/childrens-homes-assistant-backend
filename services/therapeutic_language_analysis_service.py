from __future__ import annotations

from dataclasses import dataclass
from typing import Any

PUNITIVE_TERMS = {
    "refused": "found it difficult to engage with",
    "non-compliant": "needed additional support to engage",
    "kicked off": "became distressed",
    "attention seeking": "communicating an unmet need",
    "manipulative": "using survival-based coping strategies",
    "challenging behaviour": "distress behaviour",
    "bad behaviour": "behaviour communicating distress or need",
}

CHILD_VOICE_MARKERS = ("child voice", "said", "shared", "told", "wishes", "feelings", "views")
REFLECTION_MARKERS = ("staff reflected", "we reflected", "learning", "next time", "repair", "restorative", "relationship")
SAFEGUARDING_MARKERS = ("risk", "safeguarding", "missing", "exploitation", "harm", "police", "injury", "allegation")


@dataclass(frozen=True)
class TherapeuticLanguageResult:
    score: int
    rating: str
    punitive_terms: list[str]
    child_voice_present: bool
    reflection_present: bool
    safeguarding_language_present: bool
    recommendations: list[str]

    def model_dump(self) -> dict[str, Any]:
        return {
            "score": self.score,
            "rating": self.rating,
            "punitive_terms": self.punitive_terms,
            "child_voice_present": self.child_voice_present,
            "reflection_present": self.reflection_present,
            "safeguarding_language_present": self.safeguarding_language_present,
            "recommendations": self.recommendations,
        }


class TherapeuticLanguageAnalysisService:
    def analyse(self, text: str | None) -> TherapeuticLanguageResult:
        value = (text or "").strip()
        lowered = value.lower()
        punitive_terms = [term for term in PUNITIVE_TERMS if term in lowered]
        child_voice_present = any(marker in lowered for marker in CHILD_VOICE_MARKERS)
        reflection_present = any(marker in lowered for marker in REFLECTION_MARKERS)
        safeguarding_language_present = any(marker in lowered for marker in SAFEGUARDING_MARKERS)

        score = 100
        score -= min(45, len(punitive_terms) * 15)
        if not child_voice_present:
            score -= 15
        if not reflection_present:
            score -= 10
        if len(value) < 80:
            score -= 10
        score = max(0, min(100, score))

        rating = "strong" if score >= 80 else "developing" if score >= 55 else "needs_review"
        recommendations: list[str] = []
        for term in punitive_terms:
            recommendations.append(f"Replace '{term}' with '{PUNITIVE_TERMS[term]}'.")
        if not child_voice_present:
            recommendations.append("Add the young person's wishes, feelings or direct voice where safe and known.")
        if not reflection_present:
            recommendations.append("Add staff reflection, repair/recovery work or what will be tried next.")
        if len(value) < 80:
            recommendations.append("Add enough factual detail to evidence what happened, support given and impact.")

        return TherapeuticLanguageResult(
            score=score,
            rating=rating,
            punitive_terms=punitive_terms,
            child_voice_present=child_voice_present,
            reflection_present=reflection_present,
            safeguarding_language_present=safeguarding_language_present,
            recommendations=recommendations,
        )


therapeutic_language_analysis_service = TherapeuticLanguageAnalysisService()

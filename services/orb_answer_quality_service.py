"""Rule-based answer quality checks for standalone ORB outputs."""

from __future__ import annotations

import re
from typing import Any

from schemas.orb_evaluation import (
    OrbEvaluationDimensionScore,
    OrbEvaluationFlag,
    OrbEvaluationRequest,
    OrbEvaluationResult,
    OrbQualitySummary,
)

JUDGEMENTAL_TERMS = (
    "attention seeking",
    "attention-seeking",
    "manipulative",
    "naughty",
    "bad behaviour",
    "bad behavior",
)

FAKE_LIVE_CLAIMS = (
    "live os record",
    "live care record",
    "retrieved from care hub",
    "accessed the child's file",
    "accessed the child file",
    "pulled from chronology",
    "live indicare os",
)

OS_ACCESS_CLAIMS = (
    "i accessed your records",
    "i have accessed the record",
    "from the child's chronology",
    "staff record shows",
    "dashboard shows",
)

US_SPELLING_PATTERNS = (
    (r"\borganiz", "organisation"),
    (r"\bbehavior\b", "behaviour"),
    (r"\bcolor\b", "colour"),
    (r"\banalyze\b", "analyse"),
    (r"\bsummarize\b", "summarise"),
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(text: str) -> str:
    return _text(text).lower()


class OrbAnswerQualityService:
    """Heuristic quality scoring without extra model calls."""

    def evaluate(self, request: OrbEvaluationRequest) -> OrbEvaluationResult:
        text = _text(request.answer_text)
        lower = _lower(text)
        flags: list[OrbEvaluationFlag] = []
        dimensions: list[OrbEvaluationDimensionScore] = []
        recommendations: list[str] = []
        safety_notes: list[str] = []
        requires_human_review = False

        source_count = len(request.sources or []) + len(request.citations or [])
        has_citations = source_count > 0 or "sources / basis" in lower or "source basis" in lower

        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="source_grounding",
                score=0.85 if has_citations else 0.45,
                note="Citations or source basis present" if has_citations else "Limited source basis",
            )
        )
        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="citation_quality",
                score=0.8 if has_citations else 0.4,
            )
        )

        boundary_score = 1.0
        for phrase in FAKE_LIVE_CLAIMS + OS_ACCESS_CLAIMS:
            if phrase in lower:
                flags.append(
                    OrbEvaluationFlag(
                        code="fake_live_retrieval",
                        message=f"Answer may claim live OS access: '{phrase}'",
                        severity="critical",
                    )
                )
                boundary_score = 0.0
                requires_human_review = True
                safety_notes.append(
                    "Standalone ORB must not claim access to live IndiCare OS records."
                )
        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="standalone_boundary",
                score=boundary_score,
            )
        )

        child_centred_score = 0.85
        for term in JUDGEMENTAL_TERMS:
            if term in lower:
                flags.append(
                    OrbEvaluationFlag(
                        code="judgemental_language",
                        message=f"Judgemental term detected: {term}",
                        severity="warning",
                    )
                )
                child_centred_score = min(child_centred_score, 0.35)
                recommendations.append(
                    "Replace judgemental wording with child-centred, descriptive language."
                )
        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="child_centred_language",
                score=child_centred_score,
            )
        )

        recording_score = 0.75
        if request.mode == "Record This Properly" or request.analysis_mode == "recording_lens":
            if any(term in lower for term in JUDGEMENTAL_TERMS):
                recording_score = 0.3
            if "child's voice" in lower or "child voice" in lower or "factual" in lower:
                recording_score = max(recording_score, 0.85)
        dimensions.append(
            OrbEvaluationDimensionScore(dimension="recording_quality", score=recording_score)
        )

        safeguarding_score = 0.8
        safeguarding_modes = {"safeguarding_lens", "Safeguarding"}
        if request.analysis_mode in safeguarding_modes or request.mode in safeguarding_modes:
            if not any(
                term in lower
                for term in ("escalat", "local procedure", "immediate risk", "safeguarding lead")
            ):
                flags.append(
                    OrbEvaluationFlag(
                        code="missing_safeguarding_caveat",
                        message="Safeguarding mode answer should remind about escalation and local procedure.",
                        severity="warning",
                    )
                )
                safeguarding_score = 0.45
                recommendations.append(
                    "Add a reminder to follow local safeguarding procedures and escalate immediate risk."
                )
        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="safeguarding_caution",
                score=safeguarding_score,
            )
        )

        ofsted_score = 0.75
        ofsted_modes = {"ofsted_lens", "Ofsted Lens"}
        if request.analysis_mode in ofsted_modes or request.mode in ofsted_modes:
            if re.search(r"\bgrade\b|\boutstanding\b|\bgood\b|\brequires improvement\b", lower):
                if "does not predict" not in lower and "no grade" not in lower:
                    flags.append(
                        OrbEvaluationFlag(
                            code="ofsted_grade_language",
                            message="Avoid inspection grade predictions.",
                            severity="warning",
                        )
                    )
                    ofsted_score = 0.4
            if request.requires_citations and not has_citations:
                flags.append(
                    OrbEvaluationFlag(
                        code="missing_regulatory_citations",
                        message="Regulatory/Ofsted answers should include source basis.",
                        severity="warning",
                    )
                )
                ofsted_score = min(ofsted_score, 0.5)
        dimensions.append(
            OrbEvaluationDimensionScore(dimension="ofsted_relevance", score=ofsted_score)
        )

        dimensions.append(
            OrbEvaluationDimensionScore(dimension="therapeutic_quality", score=0.75)
        )
        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="clarity",
                score=0.85 if len(text) >= 80 else 0.55,
            )
        )

        actionability_score = 0.7
        if request.requires_action_plan:
            if not any(term in lower for term in ("action", "next step", "priority", "review")):
                flags.append(
                    OrbEvaluationFlag(
                        code="missing_action_plan",
                        message="Action plan was requested but answer may lack clear actions.",
                        severity="warning",
                    )
                )
                actionability_score = 0.35
                recommendations.append("Include prioritised actions with owners and timescales.")
            else:
                actionability_score = 0.9
        dimensions.append(
            OrbEvaluationDimensionScore(dimension="actionability", score=actionability_score)
        )

        british_score = 0.9
        for pattern, _preferred in US_SPELLING_PATTERNS:
            if re.search(pattern, lower):
                british_score = 0.6
                recommendations.append("Prefer British English spelling (e.g. behaviour, summarise).")
                break
        dimensions.append(
            OrbEvaluationDimensionScore(dimension="british_english", score=british_score)
        )

        fake_source_score = 1.0
        if re.search(r"https?://[^\s]+", text) and not has_citations:
            flags.append(
                OrbEvaluationFlag(
                    code="unverified_url",
                    message="URLs present without matching citations — verify before sharing.",
                    severity="info",
                )
            )
            fake_source_score = 0.7
        dimensions.append(
            OrbEvaluationDimensionScore(
                dimension="no_fake_source_claims",
                score=fake_source_score,
            )
        )

        overall = sum(d.score for d in dimensions) / max(len(dimensions), 1)
        critical = any(f.severity == "critical" for f in flags)
        passed = not critical and overall >= 0.55

        summary = OrbQualitySummary(
            headline="Quality check passed" if passed else "Quality check flagged issues",
            strengths=[d.note for d in dimensions if d.score >= 0.8 and d.note][:3],
            improvements=recommendations[:5],
        )

        return OrbEvaluationResult(
            overall_score=round(overall, 3),
            dimensions=dimensions,
            flags=flags,
            passed=passed,
            recommendations=recommendations,
            requires_human_review=requires_human_review,
            safety_notes=safety_notes,
            summary=summary,
            standalone_only=True,
            os_linked=False,
            care_record_access=False,
        )


orb_answer_quality_service = OrbAnswerQualityService()

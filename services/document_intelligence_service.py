from __future__ import annotations

import re
from collections import Counter
from typing import Any


CARE_NATIVE_DOCUMENT_TYPES = {
    "reg44": ["independent visitor", "actions", "manager response", "children's views"],
    "reg45": ["quality of care", "children's views", "evidence", "improvement"],
    "lac_review": ["care plan", "wishes and feelings", "outcomes", "actions"],
    "supervision": ["reflection", "actions", "wellbeing", "practice"],
    "placement_plan": ["placement", "needs", "delegated authority", "contact"],
    "impact_risk_assessment": ["impact", "matching", "risk", "protective factors"],
    "incident_analysis": ["incident", "debrief", "learning", "outcome"],
    "missing_review": ["missing", "return home interview", "push factors", "pull factors"],
    "keywork_summary": ["child voice", "direct work", "goal", "next step"],
    "policy": ["procedure", "responsibility", "review", "legislation"],
    "leadership_report": ["oversight", "quality", "actions", "impact"],
}

WEAK_OUTCOME_TERMS = {"ongoing", "monitor", "continue to monitor", "no further action", "discussed"}
CLAIM_TERMS = {"improved", "safer", "settled", "progress", "effective", "better"}
EVIDENCE_TERMS = {"because", "shown by", "evidenced by", "recorded on", "chronology", "daily note", "keywork", "incident"}
CHILD_VOICE_TERMS = {"child said", "young person said", "wishes", "feelings", "voice", "told staff", "preferred"}
SAFEGUARDING_TERMS = {"safeguarding", "missing", "allegation", "strategy", "harm", "risk", "police", "social worker"}


class DocumentIntelligenceService:
    """Care-native document quality checks with explainable, review-led outputs."""

    def analyse_quality(
        self,
        *,
        text: str,
        document_type: str,
        evidence_links: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        clean = " ".join((text or "").split())
        lower = clean.lower()
        evidence_links = evidence_links or []
        indicators = [
            self._indicator("evidence_sufficiency", bool(evidence_links) or any(term in lower for term in EVIDENCE_TERMS), "Link claims to chronology, records or cited evidence."),
            self._indicator("child_voice", any(term in lower for term in CHILD_VOICE_TERMS), "Add the child's wishes, feelings or direct work evidence where appropriate."),
            self._indicator("safeguarding_prompt", not any(term in lower for term in SAFEGUARDING_TERMS) or "manager" in lower or "oversight" in lower, "Where safeguarding is referenced, include management oversight and outcome."),
            self._indicator("weak_outcomes", not any(term in lower for term in WEAK_OUTCOME_TERMS), "Replace vague outcomes with what changed for the child."),
            self._indicator("unsupported_claims", not self._has_unsupported_claim(lower), "Support quality claims with dates, source records or evidence links."),
            self._indicator("repetitive_language", not self._is_repetitive(clean), "Vary repeated phrases and keep professional wording specific."),
        ]
        expected_terms = CARE_NATIVE_DOCUMENT_TYPES.get(document_type, [])
        coverage = [term for term in expected_terms if term in lower]
        if expected_terms:
            indicators.append(self._indicator("document_type_coverage", len(coverage) >= max(1, len(expected_terms) // 2), f"Include document-specific content: {', '.join(expected_terms)}."))

        passed = sum(1 for item in indicators if item["status"] == "ok")
        score = round((passed / max(1, len(indicators))) * 100)
        return {
            "score": score,
            "status": "review_recommended" if score < 75 else "ready_for_manager_review",
            "document_type": document_type,
            "indicators": indicators,
            "evidence_links": evidence_links,
            "review_chain": ["author_draft", "manager_review", "signoff"],
            "explainability": "Quality score is a drafting aid based on text patterns and supplied evidence links; it is not a professional judgement.",
        }

    def drafting_guidance(self, *, document_type: str) -> dict[str, Any]:
        expected = CARE_NATIVE_DOCUMENT_TYPES.get(document_type, CARE_NATIVE_DOCUMENT_TYPES["keywork_summary"])
        return {
            "document_type": document_type,
            "prompts": [
                "What changed for the child?",
                "Which source record or chronology event supports this?",
                "Is the child's voice visible?",
                "What needs manager review before sign-off?",
            ],
            "expected_evidence": expected,
            "tone": "professional, specific, child-centred, non-diagnostic",
        }

    def _indicator(self, key: str, passed: bool, improvement: str) -> dict[str, Any]:
        return {"key": key, "status": "ok" if passed else "needs_review", "improvement": None if passed else improvement}

    def _has_unsupported_claim(self, lower: str) -> bool:
        has_claim = any(term in lower for term in CLAIM_TERMS)
        has_evidence = any(term in lower for term in EVIDENCE_TERMS) or bool(re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", lower))
        return has_claim and not has_evidence

    def _is_repetitive(self, text: str) -> bool:
        words = re.findall(r"\b[a-zA-Z]{5,}\b", text.lower())
        if len(words) < 35:
            return False
        counts = Counter(words)
        return any(count >= 6 for count in counts.values())


document_intelligence_service = DocumentIntelligenceService()

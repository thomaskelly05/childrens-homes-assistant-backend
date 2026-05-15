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
VAGUE_TERMS = {"appropriate", "various", "some issues", "challenging", "fine", "ok", "as required"}
CLAIM_TERMS = {"improved", "safer", "settled", "progress", "effective", "better"}
EVIDENCE_TERMS = {"because", "shown by", "evidenced by", "recorded on", "chronology", "daily note", "keywork", "incident"}
CHILD_VOICE_TERMS = {"child said", "young person said", "wishes", "feelings", "voice", "told staff", "preferred"}
SAFEGUARDING_TERMS = {"safeguarding", "missing", "allegation", "strategy", "harm", "risk", "police", "social worker"}
CHRONOLOGY_TERMS = {"chronology", "daily note", "incident", "keywork", "safeguarding", "recorded on"}
SCCIF_TERMS = {"experiences and progress", "help and protection", "leadership", "quality of care", "children's views"}


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
            self._indicator("strengths_based_language", any(term in lower for term in {"strength", "helped", "trusted", "proud", "managed", "preferred", "enjoyed"}), "Consider naming strengths, relationships and what helped the child."),
            self._indicator("safeguarding_prompt", not any(term in lower for term in SAFEGUARDING_TERMS) or "manager" in lower or "oversight" in lower, "Where safeguarding is referenced, include management oversight and outcome."),
            self._indicator("weak_outcomes", not any(term in lower for term in WEAK_OUTCOME_TERMS), "Replace vague outcomes with what changed for the child."),
            self._indicator("vague_wording", not any(term in lower for term in VAGUE_TERMS), "Replace vague wording with specific observed detail and context."),
            self._indicator("unsupported_claims", not self._has_unsupported_claim(lower), "Support quality claims with dates, source records or evidence links."),
            self._indicator("repetitive_language", not self._is_repetitive(clean), "Vary repeated phrases and keep professional wording specific."),
            self._indicator("chronology_linked", bool(evidence_links) or any(term in lower for term in CHRONOLOGY_TERMS), "Anchor the draft to chronology or source records before sign-off."),
            self._indicator("sccif_awareness", any(term in lower for term in SCCIF_TERMS), "Name the lived-experience or leadership area the draft is evidencing."),
            self._indicator("leadership_oversight", "manager" in lower or "oversight" in lower or "reviewed by" in lower, "Consider whether manager oversight, review date or sign-off should be visible."),
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
            "unsupported_claims": self._unsupported_claims(clean),
            "weak_outcome_terms": sorted(term for term in WEAK_OUTCOME_TERMS if term in lower),
            "vague_wording_terms": sorted(term for term in VAGUE_TERMS if term in lower),
            "calm_inline_suggestions": self._calm_inline_suggestions(indicators),
            "reflective_writing_prompts": self.reflective_writing_prompts(document_type=document_type),
            "follow_up_prompts": self.follow_up_prompts(text=clean),
            "evidence_sufficiency_prompts": self.evidence_sufficiency_prompts(evidence_links=evidence_links),
            "chronology_continuity_prompts": self.chronology_continuity_prompts(text=clean),
            "review_readiness_prompts": self.review_readiness_prompts(indicators=indicators),
            "inspection_intelligence": self.inspection_intelligence(text=clean, evidence_links=evidence_links),
            "orb_document_support": [
                "strengthen child voice",
                "make this more reflective",
                "identify missing follow-up",
                "prepare for manager review",
                "summarise chronology themes",
                "highlight progress from starting points",
                "turn this into a draft plan update",
                "show evidence gaps",
            ],
            "manager_signoff": {
                "required": score < 90 or any(item["status"] == "needs_review" for item in indicators),
                "reason": "Manager review is required when evidence, child voice, safeguarding wording or outcomes need strengthening.",
            },
            "versioning": {
                "amendment_history_required": True,
                "collaborative_review_ready": True,
                "human_judgement_retained": True,
            },
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
                "Which SCCIF area or regulation is this draft evidencing?",
                "Could an inspector follow the evidence trail without asking for extra explanation?",
            ],
            "expected_evidence": expected,
            "chronology_linking": "Draft from source records first, then polish wording. Do not invent evidence.",
            "regulation_aware_checks": ["child voice", "impact", "follow-up", "manager oversight", "source chronology"],
            "review_foundations": ["author note", "inline suggestions", "manager signoff", "amendment history", "version history"],
            "tone": "professional, specific, child-centred, non-diagnostic",
        }

    def reflective_writing_prompts(self, *, document_type: str) -> list[str]:
        return [
            "What might this have felt like for the child?",
            "What did adults notice about emotional safety, trust or connection?",
            "What helped the child regulate or recover?",
            "What changed from the child's starting point?",
            "What should the next adult understand before they offer support?",
        ]

    def follow_up_prompts(self, *, text: str) -> list[str]:
        lower = text.lower()
        prompts = []
        if "action" not in lower and "next" not in lower:
            prompts.append("Follow-up appears incomplete: consider naming the next action, owner and review date.")
        if "manager" not in lower and any(term in lower for term in SAFEGUARDING_TERMS):
            prompts.append("Safeguarding wording may need leadership oversight before sign-off.")
        return prompts

    def evidence_sufficiency_prompts(self, *, evidence_links: list[dict[str, Any]]) -> list[str]:
        if evidence_links:
            return ["Linked evidence is present; check it supports the key claims before manager review."]
        return ["Limited evidence found: consider linking chronology, daily notes, incidents, direct work or uploaded evidence."]

    def chronology_continuity_prompts(self, *, text: str) -> list[str]:
        lower = text.lower()
        if any(term in lower for term in CHRONOLOGY_TERMS):
            return ["Chronology continuity is visible; check dates and source records are clear."]
        return ["Chronology continuity could be strengthened by linking recent source records."]

    def review_readiness_prompts(self, *, indicators: list[dict[str, Any]]) -> list[str]:
        needs = [item["key"] for item in indicators if item["status"] == "needs_review"]
        if not needs:
            return ["Draft appears ready for manager review; human judgement remains required."]
        return [f"Consider expanding {key.replace('_', ' ')} before manager review." for key in needs[:5]]

    def inspection_intelligence(self, *, text: str, evidence_links: list[dict[str, Any]]) -> list[dict[str, str]]:
        lower = text.lower()
        signals = [
            ("weak_child_voice_detection", not any(term in lower for term in CHILD_VOICE_TERMS), "Limited evidence found for child voice; consider adding direct words, wishes or feelings where known."),
            ("weak_oversight_evidence", "manager" not in lower and "oversight" not in lower and "reviewed" not in lower, "Review may be helpful where leadership oversight is not visible."),
            ("repetitive_direct_work_themes", self._repeated_theme(lower, ["keywork", "direct work", "session"]), "Direct work themes appear repetitive; consider linking what changed or what helped."),
            ("incomplete_follow_up_detection", ("follow" in lower or "action" in lower) and not any(term in lower for term in ("completed", "outcome", "review date", "owner")), "Follow-up appears incomplete; consider naming owner, date and outcome."),
            ("sparse_lived_experience_evidence", len(text.split()) < 80 or not evidence_links, "Limited evidence found; consider expanding lived experience and chronology links."),
            ("weak_progress_evidence", any(term in lower for term in CLAIM_TERMS) and not any(term in lower for term in EVIDENCE_TERMS), "Progress evidence may need source dates or chronology links."),
            ("missing_leadership_review", "leadership" not in lower and "registered manager" not in lower and "manager" not in lower, "Leadership review may be helpful before sign-off."),
            ("weak_action_outcome_tracking", "action" in lower and "outcome" not in lower, "Action outcome tracking may need clearer impact detail."),
        ]
        return [
            {"key": key, "language": "calm_review", "summary": summary}
            for key, active, summary in signals
            if active
        ][:8]

    def _indicator(self, key: str, passed: bool, improvement: str) -> dict[str, Any]:
        return {"key": key, "status": "ok" if passed else "needs_review", "improvement": None if passed else improvement}

    def _has_unsupported_claim(self, lower: str) -> bool:
        has_claim = any(term in lower for term in CLAIM_TERMS)
        has_evidence = any(term in lower for term in EVIDENCE_TERMS) or bool(re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", lower))
        return has_claim and not has_evidence

    def _unsupported_claims(self, text: str) -> list[dict[str, str]]:
        lower = text.lower()
        if not self._has_unsupported_claim(lower):
            return []
        return [
            {
                "claim": term,
                "guidance": "Add source date, chronology link, direct quote or evidence reference before sign-off.",
            }
            for term in sorted(CLAIM_TERMS)
            if term in lower
        ]

    def _calm_inline_suggestions(self, indicators: list[dict[str, Any]]) -> list[dict[str, str]]:
        suggestions = []
        for item in indicators:
            if item["status"] == "needs_review" and item.get("improvement"):
                suggestions.append({
                    "key": item["key"],
                    "tone": "calm_review",
                    "suggestion": item["improvement"],
                })
        return suggestions[:6]

    def _is_repetitive(self, text: str) -> bool:
        words = re.findall(r"\b[a-zA-Z]{5,}\b", text.lower())
        if len(words) < 35:
            return False
        counts = Counter(words)
        return any(count >= 6 for count in counts.values())

    def _repeated_theme(self, lower: str, terms: list[str]) -> bool:
        return sum(lower.count(term) for term in terms) >= 3


document_intelligence_service = DocumentIntelligenceService()

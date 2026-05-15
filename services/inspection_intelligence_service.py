from __future__ import annotations

from typing import Any

from services.evidence_quality_service import evidence_quality_service


class InspectionIntelligenceService:
    """Predictive inspection readiness support with cautious, explainable outputs."""

    def readiness(self, *, evidence: dict[str, Any], workspace: dict[str, Any] | None = None) -> dict[str, Any]:
        quality = evidence_quality_service.analyse(evidence=evidence, workspace=workspace or {})
        patterns = quality["patterns"]
        weak_sections = [
            {"section": key, **value}
            for key, value in quality["heatmap"].items()
            if value.get("quality") == "weak"
        ]
        return {
            "status": "review_recommended" if quality["review_required"] or weak_sections else "monitor",
            "confidence": quality["confidence"],
            "context": quality["context"],
            "questions_answered": [pattern["question"] for pattern in patterns],
            "quality_patterns": patterns,
            "weakly_evidenced_standards": weak_sections,
            "recommendations": self._recommendations(patterns, weak_sections),
            "chronology_quality_indicators": self._chronology_quality_indicators(evidence=evidence, patterns=patterns),
            "evidence_sufficiency_indicators": self._evidence_sufficiency_indicators(evidence=evidence, weak_sections=weak_sections),
            "operational_inspection_signals": self._operational_inspection_signals(evidence=evidence),
            "inspection_narrative_builder": self._narrative_builder(patterns=patterns, weak_sections=weak_sections),
            "what_inspectors_may_ask": self._what_inspectors_may_ask(patterns=patterns, weak_sections=weak_sections),
            "what_has_improved": self._what_has_improved(evidence=evidence),
            "what_still_needs_oversight": self._what_still_needs_oversight(evidence=evidence, weak_sections=weak_sections),
            "guardrails": [
                "No definitive safeguarding conclusions are generated.",
                "All outputs require professional review against source records.",
                "Claims are limited to visible workspace evidence and gaps.",
            ],
        }

    def _recommendations(self, patterns: list[dict[str, Any]], weak_sections: list[dict[str, Any]]) -> list[dict[str, str]]:
        recommendations = [
            {
                "priority": "review" if pattern.get("severity") == "review" else "monitor",
                "action": pattern.get("recommendation") or "Review visible evidence.",
                "reason": pattern.get("reasoning") or "Pattern identified in evidence quality analysis.",
            }
            for pattern in patterns
        ]
        for section in weak_sections:
            recommendations.append({
                "priority": "review",
                "action": f"Strengthen evidence for {section.get('title')}.",
                "reason": "No visible evidence cards were found for this judgement area.",
            })
        return recommendations or [{
            "priority": "monitor",
            "action": "Continue sampling records for child-centred impact and manager oversight.",
            "reason": "Visible evidence does not currently show priority gaps.",
        }]

    def _chronology_quality_indicators(self, *, evidence: dict[str, Any], patterns: list[dict[str, Any]]) -> list[dict[str, Any]]:
        cards = evidence.get("cards") or []
        source_linked = [
            card for card in cards
            if card.get("href") or card.get("record_id") or card.get("source_record_id")
        ]
        weak_follow_up = [
            pattern for pattern in patterns
            if "follow" in str(pattern.get("question", "")).lower() or "follow" in str(pattern.get("recommendation", "")).lower()
        ]
        return [
            {
                "key": "source_links",
                "status": "visible" if source_linked else "needs_review",
                "reason": "Inspection claims should open back to chronology or source evidence.",
                "evidence_links": self._links(source_linked),
            },
            {
                "key": "follow_up_detail",
                "status": "needs_review" if weak_follow_up else "monitor",
                "reason": "Several incidents may need clearer follow-up, outcome or manager oversight detail." if weak_follow_up else "No priority follow-up gap is visible in current patterns.",
                "evidence_links": self._links([link for pattern in weak_follow_up for link in pattern.get("evidence_links", [])]),
            },
        ]

    def _evidence_sufficiency_indicators(self, *, evidence: dict[str, Any], weak_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
        cards = evidence.get("cards") or []
        gaps = evidence.get("gaps") or []
        return [
            {
                "key": "lived_experience",
                "status": "needs_review" if any("child voice" in str(gap).lower() for gap in gaps) else "monitor",
                "reason": "This child has limited lived experience evidence." if gaps else "Visible evidence should still be sampled for child voice and impact.",
            },
            {
                "key": "judgement_coverage",
                "status": "needs_review" if weak_sections else "visible",
                "reason": f"{len(weak_sections)} judgement area(s) have weak visible coverage." if weak_sections else "Judgement areas have visible cards in the current evidence set.",
            },
            {
                "key": "record_volume",
                "status": "visible" if len(cards) >= 3 else "needs_review",
                "reason": "Evidence volume is low; strengthen with chronology, direct work and manager review links." if len(cards) < 3 else "Evidence volume is sufficient for a manager sampling pass.",
            },
        ]

    def _narrative_builder(self, *, patterns: list[dict[str, Any]], weak_sections: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "opening": "Start with what children experience, then show the evidence trail.",
            "evidence_prompts": [
                "Which chronology entries show change over time?",
                "Where is child voice visible?",
                "What follow-up changed the outcome?",
                "Which manager review confirms oversight?",
            ],
            "priority_gaps": [pattern.get("question") for pattern in patterns[:5]] + [section.get("title") for section in weak_sections[:3]],
            "unsupported_conclusion_guard": "Use 'visible evidence suggests' or 'records show' only when source links are present.",
        }

    def _what_inspectors_may_ask(self, *, patterns: list[dict[str, Any]], weak_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
        questions = [
            {
                "question": "How do you know the child felt heard?",
                "reason": "Inspectors often test lived experience, child voice and direct work evidence.",
                "evidence_links": [],
            },
            {
                "question": "What changed after the incident or concern?",
                "reason": "Follow-up detail must show impact, not only activity.",
                "evidence_links": [],
            },
        ]
        for pattern in patterns[:4]:
            questions.append({
                "question": pattern.get("question") or "What evidence supports this judgement?",
                "reason": pattern.get("reasoning") or "Visible evidence pattern requires manager sampling.",
                "evidence_links": pattern.get("evidence_links") or [],
            })
        for section in weak_sections[:3]:
            questions.append({
                "question": f"What evidence supports {section.get('title')}?",
                "reason": "This judgement area currently has weak visible coverage.",
                "evidence_links": [],
            })
        return questions[:8]

    def _operational_inspection_signals(self, *, evidence: dict[str, Any]) -> list[dict[str, Any]]:
        cards = evidence.get("cards") or []
        gaps = evidence.get("gaps") or []
        text = " ".join(str(card.get(key, "")) for card in cards for key in ("title", "summary", "description", "outcome", "theme")).lower()
        gap_text = " ".join(str(gap) for gap in gaps).lower()
        checks = [
            ("weak_child_voice", any(term in gap_text for term in ("child voice", "wishes", "feelings")) or "child said" not in text, "Limited evidence found for the child's wishes, feelings or direct work."),
            ("weak_oversight_evidence", "manager" not in text and "oversight" not in text and "reviewed" not in text, "Review may be helpful where leadership oversight is not visible."),
            ("incomplete_follow_up", any(term in text for term in ("follow-up", "follow up", "outstanding", "open")) and "completed" not in text, "Follow-up appears incomplete; consider adding owner, date and outcome."),
            ("sparse_lived_experience", len(cards) < 3 or "felt" not in text, "Consider expanding lived experience evidence from daily notes, direct work or chronology."),
            ("weak_progress_evidence", any(term in text for term in ("improved", "settled", "progress")) and not any(term in text for term in ("because", "shown by", "evidenced", "recorded")), "Progress language may need clearer source evidence."),
            ("unresolved_safeguarding_themes", any(term in text for term in ("safeguarding", "missing", "police", "strategy")) and any(term in text for term in ("ongoing", "open", "monitor")), "Safeguarding themes appear unresolved; manager review may be helpful."),
            ("chronology_continuity_gaps", "chronology" not in text and not any(card.get("href") or card.get("record_id") for card in cards), "Chronology continuity could be strengthened with source links."),
            ("missing_leadership_review", "registered manager" not in text and "leadership" not in text, "Leadership review evidence appears limited in the current sample."),
            ("weak_action_outcome_tracking", "action" in text and "outcome" not in text, "Action outcome tracking may need clearer impact detail."),
        ]
        return [
            {"key": key, "status": "needs_review", "summary": summary, "evidence_links": self._links(cards)}
            for key, condition, summary in checks
            if condition
        ]

    def _what_has_improved(self, *, evidence: dict[str, Any]) -> list[dict[str, Any]]:
        cards = evidence.get("cards") or []
        improved = [
            card for card in cards
            if any(term in str(card).lower() for term in ("improved", "settled", "progress", "achieved", "positive", "repaired"))
        ]
        return [
            {
                "summary": card.get("summary") or card.get("title") or "Visible progress evidence found.",
                "evidence_links": self._links([card]),
                "language": "records show visible progress language; source review remains required.",
            }
            for card in improved[:5]
        ]

    def _what_still_needs_oversight(self, *, evidence: dict[str, Any], weak_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
        cards = evidence.get("cards") or []
        unresolved = [
            card for card in cards
            if any(term in str(card).lower() for term in ("open", "overdue", "follow-up", "follow up", "monitor", "ongoing"))
        ]
        items = [
            {
                "summary": card.get("summary") or card.get("title") or "Follow-up may need oversight.",
                "evidence_links": self._links([card]),
                "language": "follow-up appears incomplete; review may be helpful.",
            }
            for card in unresolved[:5]
        ]
        items.extend({
            "summary": f"Limited evidence found for {section.get('title')}.",
            "evidence_links": [],
            "language": "consider expanding source evidence before inspection sampling.",
        } for section in weak_sections[:3])
        return items[:8]

    def _links(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "id": item.get("id") or item.get("record_id") or item.get("source_record_id"),
                "title": item.get("title") or item.get("summary") or "Source record",
                "href": item.get("href") or item.get("url"),
            }
            for item in items[:8]
        ]


inspection_intelligence_service = InspectionIntelligenceService()

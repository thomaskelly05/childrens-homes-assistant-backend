from __future__ import annotations

from typing import Any


class EvidenceQualityService:
    """Inspection evidence quality checks that keep reasoning tied to source data."""

    def analyse(self, *, evidence: dict[str, Any], workspace: dict[str, Any] | None = None) -> dict[str, Any]:
        workspace = workspace or {}
        cards = evidence.get("cards") or []
        gaps = evidence.get("gaps") or []
        patterns = []
        patterns.extend(self._lived_experience_patterns(cards, gaps))
        patterns.extend(self._workflow_patterns(workspace))
        patterns.extend(self._oversight_patterns(cards, gaps, workspace))
        heatmap = self._heatmap(evidence)
        return {
            "patterns": patterns,
            "heatmap": heatmap,
            "confidence": "medium" if cards else "low",
            "context": "Evidence quality reflects visible workspace records only.",
            "review_required": bool(gaps or any(pattern["severity"] == "review" for pattern in patterns)),
        }

    def _lived_experience_patterns(self, cards: list[dict[str, Any]], gaps: list[dict[str, Any]]) -> list[dict[str, Any]]:
        patterns = []
        child_voice_gap = any("child voice" in str(gap.get("area", "")).lower() for gap in gaps)
        lived_cards = [card for card in cards if card.get("section") == "experiences_and_progress"]
        if child_voice_gap or not lived_cards:
            patterns.append({
                "question": "Which children have weak lived experience evidence?",
                "severity": "review",
                "reasoning": "Visible evidence lacks child voice or direct work cards.",
                "recommendation": "Sample keywork, daily notes and chronology entries for wishes, feelings and impact.",
                "evidence_links": [],
            })
        return patterns

    def _workflow_patterns(self, workspace: dict[str, Any]) -> list[dict[str, Any]]:
        review_queue = workspace.get("manager_oversight", {}).get("review_queue") or []
        actions = workspace.get("manager_oversight", {}).get("open_or_overdue_actions") or workspace.get("adult_workspace", {}).get("actions") or []
        patterns = []
        if review_queue:
            patterns.append({
                "question": "Which workflows are incomplete?",
                "severity": "review",
                "reasoning": f"{len(review_queue)} item(s) are awaiting review.",
                "recommendation": "Complete manager review and record outcome before using evidence in reports.",
                "evidence_links": self._links(review_queue),
            })
        if actions:
            patterns.append({
                "question": "Which Reg 44 or improvement findings have weak follow-through?",
                "severity": "monitor",
                "reasoning": f"{len(actions)} open action(s) remain visible.",
                "recommendation": "Check owner, due date, completion evidence and child impact.",
                "evidence_links": self._links(actions),
            })
        return patterns

    def _oversight_patterns(self, cards: list[dict[str, Any]], gaps: list[dict[str, Any]], workspace: dict[str, Any]) -> list[dict[str, Any]]:
        patterns = []
        safeguarding_cards = [card for card in cards if card.get("section") == "help_and_protection"]
        leadership_gap = any("leadership" in str(gap.get("area", "")).lower() for gap in gaps)
        if safeguarding_cards and leadership_gap:
            patterns.append({
                "question": "Which safeguarding records lack management oversight?",
                "severity": "review",
                "reasoning": "Safeguarding evidence is visible while leadership gaps remain open.",
                "recommendation": "Review management comments, decisions, notifications and learning actions.",
                "evidence_links": self._links(workspace.get("manager_oversight", {}).get("review_queue") or []),
            })
        return patterns

    def _heatmap(self, evidence: dict[str, Any]) -> dict[str, Any]:
        sections = evidence.get("judgement_sections") or {}
        output = {}
        for key, section in sections.items():
            cards = section.get("cards") or []
            output[key] = {
                "title": section.get("title") or key,
                "coverage": len(cards),
                "quality": "visible" if cards else "weak",
            }
        return output

    def _links(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        links = []
        for item in items[:8]:
            links.append({
                "id": item.get("id") or item.get("record_id"),
                "title": item.get("title") or item.get("summary") or item.get("record_type") or "Source record",
                "href": item.get("href") or item.get("url"),
            })
        return links


evidence_quality_service = EvidenceQualityService()

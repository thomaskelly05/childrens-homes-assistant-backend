from __future__ import annotations

from typing import Any


class OrbRegulatoryReasoningService:
    """Maps operational evidence to SCCIF and children's homes regulatory relevance."""

    def build(self, *, context: dict[str, Any], care_journey: dict[str, Any]) -> dict[str, Any]:
        themes = set(care_journey.get("emotional_themes") or [])
        links: list[dict[str, str]] = []

        if "safeguarding and risk" in themes or care_journey.get("safeguarding_count"):
            links.append({
                "label": "Regulation 12 / SCCIF Help and protection",
                "reason": "Safeguarding, missing or risk records should evidence prompt protection, management oversight and follow-up.",
            })
        if "identity and belonging" in themes or "communication and sensory support" in themes:
            links.append({
                "label": "Regulation 7 / SCCIF Experiences and progress",
                "reason": "Wishes, feelings, identity and communication evidence helps show support is personalised and child-centred.",
            })
        if "education and engagement" in themes:
            links.append({
                "label": "Regulation 8 / SCCIF Experiences and progress",
                "reason": "Education engagement should connect care routines, emotional stability and achievement evidence.",
            })
        if context.get("intent") in {"inspection_sccif", "reg44_reg45"} or context.get("governance"):
            links.append({
                "label": "Regulation 44 / Regulation 45",
                "reason": "Managers should be able to trace records, actions and outcomes into quality assurance and improvement planning.",
            })
        if not links:
            links.append({
                "label": "SCCIF Experiences and progress",
                "reason": "The strongest evidence will describe how care planning improves the child's daily lived experience.",
            })

        gaps = list(care_journey.get("evidence_gaps") or [])
        if context.get("errors"):
            gaps.append("some live sources were unavailable during this response, so the evidence view is partial")

        return {
            "inspection_relevance": links[:4],
            "evidence_gaps": gaps[:5],
            "management_considerations": self._management_considerations(care_journey, links),
        }

    def _management_considerations(self, care_journey: dict[str, Any], links: list[dict[str, str]]) -> list[str]:
        considerations = [
            "check that daily records evidence how plans influence routines, relationships and emotional wellbeing",
            "link any concerns to named actions, review dates and management oversight",
        ]
        if care_journey.get("safeguarding_count"):
            considerations.insert(0, "review safeguarding chronology themes without making assumptions beyond recorded evidence")
        if any("Regulation 44" in item["label"] for item in links):
            considerations.append("ensure Reg 44/45 evidence shows learning, impact and follow-through")
        return considerations[:4]

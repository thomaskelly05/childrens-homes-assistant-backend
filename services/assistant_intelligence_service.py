from __future__ import annotations

from typing import Any

from services.ofsted_evidence_engine_service import OfstedEvidenceEngineService
from services.inspection_intelligence_service import inspection_intelligence_service
from services.workspace_orchestrator_service import WorkspaceOrchestratorService


class AssistantIntelligenceService:
    """Evidence-led assistant intelligence outputs for IndiCare.

    These methods produce structured drafts from workspace and evidence data.
    They avoid inventing facts and clearly frame outputs as draft support for
    professional review.
    """

    def __init__(self) -> None:
        self.workspace = WorkspaceOrchestratorService()
        self.evidence = OfstedEvidenceEngineService()

    def home_inspection_brief(self, *, home_id: int, current_user: dict[str, Any], days: int = 90) -> dict[str, Any]:
        workspace = self.workspace.home_workspace(home_id=home_id, current_user=current_user, days=days)
        evidence = self.evidence.build_home_evidence(workspace)
        return self._brief(scope="home", evidence=evidence, workspace=workspace)

    def child_inspection_brief(self, *, young_person_id: int, current_user: dict[str, Any], days: int = 90) -> dict[str, Any]:
        workspace = self.workspace.child_workspace(young_person_id=young_person_id, current_user=current_user, days=days)
        evidence = self.evidence.build_child_evidence(workspace)
        return self._brief(scope="child", evidence=evidence, workspace=workspace)

    def reg45_draft(self, *, home_id: int, current_user: dict[str, Any], days: int = 180) -> dict[str, Any]:
        brief = self.home_inspection_brief(home_id=home_id, current_user=current_user, days=days)
        evidence = brief["evidence"]
        return {
            "ok": True,
            "type": "reg45_draft",
            "disclaimer": "Draft support only. The registered manager must verify accuracy, add analysis, and approve the final review.",
            "sections": {
                "quality_of_care": self._section_text(evidence, "experiences_and_progress"),
                "safeguarding": self._section_text(evidence, "help_and_protection"),
                "leadership_and_management": self._section_text(evidence, "leadership_and_management"),
                "development_plan": self._development_plan(evidence),
            },
            "evidence": evidence,
            "inspection_readiness": brief.get("inspection_readiness"),
        }

    def _brief(self, *, scope: str, evidence: dict[str, Any], workspace: dict[str, Any]) -> dict[str, Any]:
        sections = evidence.get("judgement_sections") or {}
        readiness = inspection_intelligence_service.readiness(evidence=evidence, workspace=workspace)
        return {
            "ok": True,
            "type": "inspection_brief",
            "scope": scope,
            "disclaimer": "Draft support only. Verify all statements against the source records before use.",
            "headline": self._headline(evidence),
            "summary": evidence.get("summary"),
            "inspection_sections": {
                key: {
                    "title": value.get("title"),
                    "draft": self._section_text(evidence, key),
                    "cards": value.get("cards") or [],
                }
                for key, value in sections.items()
            },
            "gaps": evidence.get("gaps") or [],
            "recommended_next_actions": self._development_plan(evidence),
            "inspection_readiness": readiness,
            "evidence": evidence,
        }

    def _headline(self, evidence: dict[str, Any]) -> str:
        total = (evidence.get("summary") or {}).get("total_cards", 0)
        gaps = len(evidence.get("gaps") or [])
        return f"{total} evidence card(s) identified with {gaps} gap(s) requiring review."

    def _section_text(self, evidence: dict[str, Any], section_key: str) -> str:
        section = (evidence.get("judgement_sections") or {}).get(section_key) or {}
        cards = section.get("cards") or []
        if not cards:
            return "No evidence cards are currently visible for this area. Review records, documents and manager oversight for gaps."
        statements = [card.get("statement") for card in cards if card.get("statement")]
        impacts = [card.get("impact") for card in cards if card.get("impact")]
        return " ".join(statements + impacts)

    def _development_plan(self, evidence: dict[str, Any]) -> list[dict[str, str]]:
        gaps = evidence.get("gaps") or []
        if not gaps:
            return [{"priority": "monitor", "action": "Continue sampling records and evidencing impact across all judgement areas."}]
        actions = []
        for gap in gaps:
            area = gap.get("area") or "Evidence"
            actions.append({
                "priority": "review",
                "area": area,
                "action": f"Address gap: {gap.get('gap')}",
            })
        return actions

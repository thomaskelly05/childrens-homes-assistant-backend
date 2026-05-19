from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from services.assistant_context_service import build_shared_assistant_context
from services.intelligence.contracts import get_domain_contract


@dataclass(frozen=True)
class OrbOperationalContract:
    domain: str
    retrieval_sources: tuple[str, ...]
    explainability_required: bool
    chronology_aware: bool
    evidence_aware: bool
    role_aware: bool
    audit_safe_reasoning: bool
    operational_recommendations: bool
    known_gaps: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbContextEngine:
    """Standard ORB context contract built on the shared assistant context."""

    def build_context(
        self,
        *,
        current_user: dict[str, Any],
        requested_context: dict[str, Any] | None,
        mode: str = "embedded",
        conversation_id: str | None = None,
        project_id: str | None = None,
    ) -> dict[str, Any]:
        shared = build_shared_assistant_context(
            current_user=current_user,
            requested_context=requested_context,
            mode=mode,
            conversation_id=conversation_id,
            project_id=project_id,
        )
        domain = self._domain_from_context(shared.model_dump(mode="json"))
        contract = self.domain_contract(domain)
        return {
            "ok": True,
            "context": shared.model_dump(mode="json"),
            "domain": domain,
            "orb_contract": contract.to_dict(),
            "explainability": self.explainability_contract(
                chronology_ids=shared.visible_chronology_ids,
                evidence_ids=shared.visible_evidence_ids,
                record_id=shared.selected_record_id,
            ),
        }

    def domain_contract(self, domain: str) -> OrbOperationalContract:
        contract = get_domain_contract(domain)
        retrieval_sources = ("shared_assistant_context", "chronology_projection", "evidence_graph", "operational_memory_replay")
        return OrbOperationalContract(
            domain=domain,
            retrieval_sources=retrieval_sources,
            explainability_required=True,
            chronology_aware=not contract or contract.chronology != "missing",
            evidence_aware=not contract or contract.evidence != "missing",
            role_aware=True,
            audit_safe_reasoning=True,
            operational_recommendations=True,
            known_gaps=contract.known_gaps if contract else ("No domain contract registered.",),
        )

    def explainability_contract(
        self,
        *,
        chronology_ids: list[str] | tuple[str, ...] | None = None,
        evidence_ids: list[str] | tuple[str, ...] | None = None,
        record_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "required": True,
            "must_include": [
                "evidence_references",
                "chronology_references",
                "linked_records",
                "operational_rationale",
                "confidence_visibility",
                "audit_safe_reasoning",
            ],
            "references": {
                "chronology_ids": list(chronology_ids or []),
                "evidence_ids": list(evidence_ids or []),
                "record_id": record_id,
            },
        }

    def _domain_from_context(self, context: dict[str, Any]) -> str:
        workspace = str(context.get("current_workspace_type") or "").lower()
        route = str(context.get("current_route") or "").lower()
        selected_type = str(context.get("selected_record_type") or "").lower()
        combined = " ".join([workspace, route, selected_type])
        if "staff" in combined or "workforce" in combined or workspace == "adult":
            return "workforce"
        if "governance" in combined or "reg44" in combined or "reg45" in combined:
            return "governance"
        if "ofsted" in combined or "inspection" in combined:
            return "inspection"
        if "document" in combined or "template" in combined:
            return "documents"
        if "academy" in combined or "training" in combined:
            return "academy"
        if "safeguarding" in combined or "missing" in combined:
            return "safeguarding"
        if "chronology" in combined:
            return "chronology"
        if "report" in combined:
            return "reports"
        if "assistant" in combined or "orb" in combined:
            return "orb"
        return "children" if context.get("selected_young_person_id") else "provider_oversight"


orb_context_engine = OrbContextEngine()


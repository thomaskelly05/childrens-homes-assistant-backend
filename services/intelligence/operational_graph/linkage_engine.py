from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from services.evidence_graph_service import evidence_graph_service
from services.intelligence.contracts import get_domain_contract


@dataclass(frozen=True)
class OperationalLink:
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship: str
    rationale: str
    evidence_references: tuple[str, ...] = ()
    chronology_references: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OperationalGraphEngine:
    """Formal linkage contract without introducing a graph database."""

    def link_contract(
        self,
        *,
        source_type: str,
        source_id: str | int,
        target_type: str,
        target_id: str | int,
        relationship: str,
        evidence_references: list[str] | tuple[str, ...] | None = None,
        chronology_references: list[str] | tuple[str, ...] | None = None,
    ) -> OperationalLink:
        return OperationalLink(
            source_type=source_type,
            source_id=str(source_id),
            target_type=target_type,
            target_id=str(target_id),
            relationship=relationship,
            rationale=(
                f"{source_type}:{source_id} is linked to {target_type}:{target_id} "
                f"through {relationship}; replay, evidence and chronology references "
                "remain the audit source of truth."
            ),
            evidence_references=tuple(evidence_references or ()),
            chronology_references=tuple(chronology_references or ()),
        )

    def traverse_evidence(self, conn: Any, *, current_user: dict[str, Any], entity_type: str, entity_id: str, **kwargs: Any) -> dict[str, Any]:
        traversal = evidence_graph_service.traverse(
            conn,
            current_user=current_user,
            entity_type=entity_type,
            entity_id=entity_id,
            **kwargs,
        )
        return traversal.model_dump(mode="json")

    def domain_linkage_summary(self, domain: str) -> dict[str, Any]:
        contract = get_domain_contract(domain)
        if not contract:
            return {"ok": False, "domain": domain, "message": "No operational domain contract registered."}
        return {
            "ok": True,
            "domain": contract.domain,
            "canonical_services": list(contract.canonical_services),
            "propagation_targets": list(contract.propagation_targets),
            "evidence_status": contract.evidence,
            "chronology_status": contract.chronology,
            "known_gaps": list(contract.known_gaps),
        }


operational_graph_engine = OperationalGraphEngine()


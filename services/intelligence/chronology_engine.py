from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from services.chronology_projection_service import chronology_projection_service
from services.chronology_writer import ChronologyEventInput, ChronologyWriter
from services.intelligence.contracts import OPERATIONAL_DOMAIN_CONTRACTS, get_domain_contract


@dataclass(frozen=True)
class ChronologyPropagationPlan:
    domain: str
    entity_type: str
    entity_id: str | None
    transition_type: str
    should_write_chronology: bool
    should_append_memory: bool
    should_refresh_orb: bool
    should_link_evidence: bool
    should_publish_realtime: bool
    targets: tuple[str, ...]
    known_gaps: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ChronologyEngine:
    """Unified chronology facade over the existing writer and replay projection.

    The engine deliberately delegates persistence and projection to established
    services. Its purpose is to give every domain the same propagation contract
    before domain-specific services perform their existing writes.
    """

    def __init__(self, writer: ChronologyWriter | None = None) -> None:
        self.writer = writer or ChronologyWriter()

    def propagation_plan(
        self,
        *,
        domain: str,
        entity_type: str,
        entity_id: str | int | None = None,
        transition_type: str = "recorded",
    ) -> ChronologyPropagationPlan:
        contract = get_domain_contract(domain)
        targets = contract.propagation_targets if contract else ("chronology", "orb", "dashboard")
        return ChronologyPropagationPlan(
            domain=domain,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            transition_type=transition_type,
            should_write_chronology="chronology" in targets or domain == "chronology",
            should_append_memory=True,
            should_refresh_orb="orb" in targets,
            should_link_evidence="evidence" in targets,
            should_publish_realtime=bool({"dashboard", "alerts", "orb", "chronology"} & set(targets)),
            targets=tuple(targets),
            known_gaps=contract.known_gaps if contract else ("No domain contract registered.",),
        )

    def write_child_event(self, conn: Any, payload: dict[str, Any] | ChronologyEventInput) -> dict[str, Any]:
        """Write through the existing child chronology writer."""

        return self.writer.upsert_event(conn, payload)

    def project(self, conn: Any, *, current_user: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        """Read chronology through canonical operational memory projection."""

        return chronology_projection_service.project(conn, current_user=current_user, **kwargs)

    def propagation_gap_summary(self) -> dict[str, Any]:
        gaps = {
            contract.domain: list(contract.known_gaps)
            for contract in OPERATIONAL_DOMAIN_CONTRACTS
            if contract.chronology in {"partial", "compatibility", "missing"} or contract.known_gaps
        }
        return {
            "ok": True,
            "truth_plane": "operational_memory_chronology_projection",
            "write_facade": "ChronologyWriter",
            "projection_facade": "ChronologyProjectionService",
            "domains_with_chronology_gaps": gaps,
        }


chronology_engine = ChronologyEngine()


from __future__ import annotations

from typing import Any

from schemas.operational_memory import EvidenceTraversal, EvidenceTraversalEdge, EvidenceTraversalNode, OperationalMemoryReplayEvent
from services.operational_memory_replay_service import operational_memory_replay_service


class EvidenceGraphService:
    """Canonical evidence traversal derived from operational memory relationships."""

    def traverse(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        entity_type: str,
        entity_id: str,
        provider_id: int | None = None,
        home_id: int | None = None,
        limit: int = 100,
    ) -> EvidenceTraversal:
        replay = operational_memory_replay_service.replay(
            conn,
            current_user=current_user,
            provider_id=provider_id,
            home_id=home_id,
            entity_type=entity_type,
            entity_id=entity_id,
            tables=(
                "evidence_relationship_history",
                "chronology_snapshot_history",
                "operational_lifecycle_history",
                "governance_signoff_history",
                "operational_audit_timeline",
            ),
            limit=limit,
        )
        return self.from_events(entity_type=entity_type, entity_id=entity_id, events=replay.events)

    def from_events(
        self,
        *,
        entity_type: str,
        entity_id: str,
        events: list[OperationalMemoryReplayEvent],
    ) -> EvidenceTraversal:
        nodes: dict[str, EvidenceTraversalNode] = {
            f"{entity_type}:{entity_id}": EvidenceTraversalNode(
                node_id=f"{entity_type}:{entity_id}",
                node_type=entity_type,
                label=f"{entity_type.replace('_', ' ').title()} {entity_id}",
            )
        }
        edges: list[EvidenceTraversalEdge] = []
        chronology_evidence: list[str] = []
        inspection_evidence: list[str] = []
        lifecycle_evidence: list[str] = []
        governance_evidence: list[str] = []
        for event in events:
            root_id = f"{event.entity_type}:{event.entity_id}"
            nodes.setdefault(
                root_id,
                EvidenceTraversalNode(node_id=root_id, node_type=event.entity_type, label=f"{event.entity_type} {event.entity_id}"),
            )
            for evidence_id in event.evidence_references:
                evidence_node = f"evidence:{evidence_id}"
                nodes.setdefault(
                    evidence_node,
                    EvidenceTraversalNode(node_id=evidence_node, node_type="evidence", label=f"Evidence {evidence_id}"),
                )
                relationship = self._relationship(event)
                edges.append(
                    EvidenceTraversalEdge(
                        source_id=root_id,
                        target_id=evidence_node,
                        relationship=relationship,
                        why_linked=self._why_linked(event, relationship),
                        source_event_id=event.replay_key,
                        metadata={"source_table": event.source_table, "correlation_id": event.correlation_id},
                    )
                )
                if event.chronology_references:
                    chronology_evidence.append(evidence_id)
                if event.source_table == "operational_lifecycle_history":
                    lifecycle_evidence.append(evidence_id)
                if event.source_table == "governance_signoff_history" or event.governance_references:
                    governance_evidence.append(evidence_id)
                if event.metadata.get("lifecycle", {}).get("inspection_ids") or event.metadata.get("inspection_ids"):
                    inspection_evidence.append(evidence_id)
            for chronology_id in event.chronology_references:
                chronology_node = f"chronology:{chronology_id}"
                nodes.setdefault(
                    chronology_node,
                    EvidenceTraversalNode(node_id=chronology_node, node_type="chronology", label=f"Chronology {chronology_id}"),
                )
                edges.append(
                    EvidenceTraversalEdge(
                        source_id=root_id,
                        target_id=chronology_node,
                        relationship="chronology_context",
                        why_linked="Linked by the same replayable operational memory event.",
                        source_event_id=event.replay_key,
                    )
                )
        return EvidenceTraversal(
            root_entity_type=entity_type,
            root_entity_id=entity_id,
            nodes=list(nodes.values()),
            edges=edges,
            chronology_linked_evidence=self._dedupe(chronology_evidence),
            inspection_linked_evidence=self._dedupe(inspection_evidence),
            lifecycle_linked_evidence=self._dedupe(lifecycle_evidence),
            governance_linked_evidence=self._dedupe(governance_evidence),
        )

    def _relationship(self, event: OperationalMemoryReplayEvent) -> str:
        if event.source_table == "governance_signoff_history":
            return "governance_supports"
        if event.source_table == "chronology_snapshot_history":
            return "chronology_supports"
        if event.source_table == "operational_lifecycle_history":
            return "lifecycle_supports"
        return "supports"

    def _why_linked(self, event: OperationalMemoryReplayEvent, relationship: str) -> str:
        transition = event.transition_type or event.event_type
        return f"{relationship.replace('_', ' ')} because {transition} recorded this evidence in append-only operational memory."

    def _dedupe(self, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value for value in values if value))


evidence_graph_service = EvidenceGraphService()

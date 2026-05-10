from __future__ import annotations

"""Chronology graph modelling for IndiCare OS assistant.

This module converts chronology events into lightweight relationship graphs so
frontend timelines can render linked operational events and safeguarding
clusters.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.chronology_workspace import build_chronology_workspace, serialise_chronology_workspace


LINK_TERMS = {
    "missing": "missing_from_care",
    "police": "police_involvement",
    "self-harm": "self_harm",
    "exploitation": "exploitation",
    "strategy": "strategy_meeting",
    "lado": "lado",
}


@dataclass(frozen=True)
class ChronologyNode:
    node_id: str
    title: str
    category: str
    citation_ref: str


@dataclass(frozen=True)
class ChronologyEdge:
    source: str
    target: str
    relationship: str


@dataclass(frozen=True)
class ChronologyGraphPayload:
    node_count: int
    edge_count: int
    nodes: list[ChronologyNode] = field(default_factory=list)
    edges: list[ChronologyEdge] = field(default_factory=list)
    integrity_score: int = 0
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _relationship(summary: str) -> str:
    lowered = summary.lower()
    for term, relationship in LINK_TERMS.items():
        if term in lowered:
            return relationship
    return "contextual_sequence"


def build_chronology_graph(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> ChronologyGraphPayload:
    workspace = serialise_chronology_workspace(
        build_chronology_workspace(evidence_index=evidence_index)
    )

    timeline = workspace.get("timeline") if isinstance(workspace.get("timeline"), list) else []

    nodes: list[ChronologyNode] = []
    edges: list[ChronologyEdge] = []

    for item in timeline:
        if not isinstance(item, dict):
            continue
        nodes.append(
            ChronologyNode(
                node_id=_safe_string(item.get("event_id")),
                title=_safe_string(item.get("title")),
                category=_safe_string(item.get("significance") or "context"),
                citation_ref=_safe_string(item.get("citation_ref")),
            )
        )

    for current, nxt in zip(nodes, nodes[1:]):
        summary = ""
        for item in timeline:
            if isinstance(item, dict) and _safe_string(item.get("event_id")) == current.node_id:
                summary = _safe_string(item.get("summary"))
                break

        edges.append(
            ChronologyEdge(
                source=current.node_id,
                target=nxt.node_id,
                relationship=_relationship(summary),
            )
        )

    integrity_score = max(0, min(100, 100 - len(workspace.get("evidence_gaps", [])) * 10))

    warnings = workspace.get("warnings", []) if isinstance(workspace.get("warnings"), list) else []

    return ChronologyGraphPayload(
        node_count=len(nodes),
        edge_count=len(edges),
        nodes=nodes,
        edges=edges,
        integrity_score=integrity_score,
        warnings=warnings,
    )


def serialise_chronology_graph(payload: ChronologyGraphPayload) -> dict[str, Any]:
    return {
        "node_count": payload.node_count,
        "edge_count": payload.edge_count,
        "integrity_score": payload.integrity_score,
        "warnings": payload.warnings,
        "nodes": [
            {
                "node_id": node.node_id,
                "title": node.title,
                "category": node.category,
                "citation_ref": node.citation_ref,
            }
            for node in payload.nodes
        ],
        "edges": [
            {
                "source": edge.source,
                "target": edge.target,
                "relationship": edge.relationship,
            }
            for edge in payload.edges
        ],
    }

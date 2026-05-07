from __future__ import annotations

from assistant.chronology_graph import build_chronology_graph, serialise_chronology_graph
from assistant.chronology_workspace import (
    build_chronology_workspace,
    serialise_chronology_workspace,
)


def test_chronology_workspace_builds_timeline():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-01T10:00:00",
            "title": "Missing episode",
            "excerpt": "Police informed after missing episode.",
        }
    ]

    payload = build_chronology_workspace(
        evidence_index=evidence,
    )

    assert payload.timeline != []
    assert payload.workspace_type == "chronology"


def test_serialised_chronology_workspace_contains_markers():
    evidence = [
        {
            "citation_ref": "[risk:1]",
            "record_type": "risk_assessment",
            "date": "2030-01-02T09:00:00",
            "title": "Risk review",
            "excerpt": "Self-harm concerns escalating.",
        }
    ]

    payload = serialise_chronology_workspace(
        build_chronology_workspace(evidence_index=evidence)
    )

    assert payload["timeline"] != []
    assert "attention" in payload


def test_chronology_graph_builds_nodes_and_edges():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "date": "2030-01-01T10:00:00",
            "title": "Missing episode",
            "excerpt": "Police informed after missing episode.",
        },
        {
            "citation_ref": "[meeting:2]",
            "record_type": "meeting_note",
            "date": "2030-01-02T10:00:00",
            "title": "Strategy meeting",
            "excerpt": "Strategy meeting discussed exploitation concerns.",
        },
    ]

    graph = build_chronology_graph(
        evidence_index=evidence,
    )

    assert graph.node_count >= 1
    assert graph.edge_count >= 1


def test_serialised_chronology_graph_contains_integrity_score():
    graph = serialise_chronology_graph(
        build_chronology_graph(evidence_index=[])
    )

    assert "integrity_score" in graph

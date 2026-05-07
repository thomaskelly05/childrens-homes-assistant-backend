from __future__ import annotations

from assistant.role_aware_rendering import (
    build_role_aware_workspace,
    serialise_role_aware_workspace,
)


def test_role_aware_workspace_builds_visible_cards():
    evidence = [
        {
            "citation_ref": "[incident:1]",
            "record_type": "incident",
            "title": "Missing episode",
            "excerpt": "Police informed after missing episode.",
        }
    ]

    workspace = build_role_aware_workspace(
        query="Review safeguarding concerns",
        evidence_index=evidence,
        role="manager",
    )

    assert workspace.visible_cards != []
    assert workspace.role == "manager"


def test_serialised_role_workspace_contains_runtime():
    workspace = build_role_aware_workspace(
        query="Show dashboard",
        evidence_index=[],
        role="rsw",
    )

    payload = serialise_role_aware_workspace(workspace)

    assert payload["runtime"] != {}
    assert payload["role"] == "rsw"

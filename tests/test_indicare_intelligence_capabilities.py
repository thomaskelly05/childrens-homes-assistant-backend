from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

import routers.orb_standalone_routes as orb_standalone_routes
from services.indicare_intelligence_capability_service import (
    build_indicare_intelligence_capabilities,
    indicare_intelligence_capability_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_DOC = REPO_ROOT / "docs" / "indicare-intelligence-parity-audit.md"


def test_parity_audit_document_exists():
    assert AUDIT_DOC.is_file()
    text = AUDIT_DOC.read_text(encoding="utf-8")
    for section in (
        "## 1. Already built",
        "## 2. Partially built",
        "## 3. Missing",
        "## 7. Recommended build order",
    ):
        assert section in text


def test_capability_catalog_includes_core_orb_features():
    capabilities = build_indicare_intelligence_capabilities()
    by_id = {item.id: item for item in capabilities}
    assert by_id["core_chat"].status == "built"
    assert by_id["voice_companion"].status == "built"
    assert by_id["knowledge_library"].status == "built"
    assert by_id["agents"].status == "built"
    assert by_id["deep_research"].status == "built"
    assert by_id["saved_outputs"].status == "built"
    assert by_id["vision_images"].status == "partial"


def test_os_features_marked_operational_or_planned():
    capabilities = build_indicare_intelligence_capabilities()
    by_id = {item.id: item for item in capabilities}
    assert by_id["child_profiles_os"].surface == "indicare_os"
    assert by_id["staff_profiles_os"].status == "planned"
    assert by_id["operational_os_context"].surface == "operational_orb"
    assert by_id["collaboration"].status == "planned"


def test_risky_capabilities_have_safety_notes():
    capabilities = build_indicare_intelligence_capabilities()
    by_id = {item.id: item for item in capabilities}
    assert by_id["operational_os_context"].safety_notes
    assert by_id["child_profiles_os"].safety_notes
    assert any("standalone" in note.lower() for note in by_id["operational_os_context"].safety_notes)


def test_capability_summary_counts():
    summary = indicare_intelligence_capability_service.summarize()
    assert summary.total >= 20
    assert summary.built >= 10
    assert summary.requires_os_context_count >= 1


def test_standalone_capabilities_route(fake_state):
    response = asyncio.run(orb_standalone_routes.standalone_orb_capabilities(current_user=fake_state["user"]))
    assert response["success"] is True
    caps = response["data"]["capabilities"]
    assert any(item["id"] == "surface_router" for item in caps)


def test_standalone_capabilities_summary_route(fake_state):
    response = asyncio.run(
        orb_standalone_routes.standalone_orb_capabilities_summary(current_user=fake_state["user"])
    )
    assert response["success"] is True
    assert response["data"]["total"] >= 20

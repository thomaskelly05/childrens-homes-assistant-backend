from __future__ import annotations

import inspect

import pytest

from services.orb_intelligence_bridge_service import orb_intelligence_bridge_service


@pytest.mark.asyncio
async def test_operational_path_stubbed_async():
    result = await orb_intelligence_bridge_service.run_operational_intelligence({})
    assert result["success"] is False
    assert result["error"] == "not_wired"
    assert "not wired" in result["message"].lower()


@pytest.mark.asyncio
async def test_standalone_document_kind(monkeypatch):
    from schemas.orb_documents import OrbDocumentUnderstanding
    from services import orb_document_understanding_service as doc_mod

    async def stub_analyse(_request):
        return OrbDocumentUnderstanding(
            title="Doc",
            plain_english_summary="Summary",
        )

    monkeypatch.setattr(doc_mod.orb_document_understanding_service, "analyse_document", stub_analyse)

    result = await orb_intelligence_bridge_service.run_standalone_intelligence(
        {"kind": "document", "document": {"mode": "explain", "text": "hello policy"}}
    )
    assert result["standalone_only"] is True
    assert result["os_linked"] is False
    assert "intelligence_output" in result


def test_bridge_has_no_os_service_imports():
    import services.orb_intelligence_bridge_service as bridge_mod

    source = inspect.getsource(bridge_mod)
    forbidden = (
        "intelligence_spine",
        "care_hub",
        "young_person",
        "getServerOsYoungPeople",
        "OrbConversationExperience",
    )
    for term in forbidden:
        assert term not in source


def test_allowed_surface():
    assert orb_intelligence_bridge_service.allowed_surface("standalone")
    assert not orb_intelligence_bridge_service.allowed_surface("unknown")

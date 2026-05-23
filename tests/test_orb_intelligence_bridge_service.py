from __future__ import annotations

import inspect

import pytest

from services.orb_intelligence_bridge_service import orb_intelligence_bridge_service


@pytest.mark.asyncio
async def test_operational_path_requires_user():
    result = await orb_intelligence_bridge_service.run_operational_intelligence({})
    assert result["success"] is False
    assert result["error"] == "unauthorised"


@pytest.mark.asyncio
async def test_operational_path_with_user(monkeypatch):
    from schemas.orb_operational import OrbOperationalContextSummary, OrbOperationalPermissionSummary, OrbOperationalResponse, OrbOperationalSafetyBoundary

    async def fake_answer(*_args, **_kwargs):
        return OrbOperationalResponse(
            answer="Operational summary.",
            context_summary=OrbOperationalContextSummary(headline="Ready"),
            permissions=OrbOperationalPermissionSummary(role="manager"),
            boundaries=OrbOperationalSafetyBoundary(),
            os_linked=True,
            care_record_access=True,
            standalone_only=False,
            permissioned_context=True,
        )

    monkeypatch.setattr(
        "services.orb_operational_assistant_service.orb_operational_assistant_service.answer",
        fake_answer,
    )
    async def fake_context(*_args, **_kwargs):
        return {"raw_available": True, "summary": {}}

    monkeypatch.setattr(
        orb_intelligence_bridge_service,
        "collect_safe_operational_context",
        fake_context,
    )
    monkeypatch.setattr(
        orb_intelligence_bridge_service,
        "audit_operational_intelligence_use",
        lambda *_args, **_kwargs: "audit-test",
    )

    result = await orb_intelligence_bridge_service.run_operational_intelligence(
        {"message": "What needs attention?", "mode": "manager_daily_brief"},
        current_user={"id": 1, "role": "manager"},
        conn=None,
    )
    assert result["success"] is True
    assert result["os_linked"] is True
    assert result["standalone_only"] is False
    assert result["permissioned_context"] is True


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

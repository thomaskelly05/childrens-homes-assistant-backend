"""Tests for ORB Records Workspace persistence and template search wiring."""

from __future__ import annotations

import asyncio
import inspect

import pytest
from fastapi import HTTPException

import routers.orb_records_workspace_launch_routes as workspace_routes
import routers.orb_templates_launch_routes as template_routes
from schemas.orb_records_workspace import OrbRecordWorkspaceCreate, OrbRecordWorkspaceUpdate
from services.orb_records_workspace_service import orb_records_workspace_service
from services.orb_template_library_registry import orb_template_library_registry
from services.orb_template_taxonomy_service import orb_template_taxonomy_service


@pytest.fixture(autouse=True)
def memory_workspace(monkeypatch):
    svc = orb_records_workspace_service
    svc._memory = {}
    svc._storage_mode = "memory"
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def _user(user_id: int, role: str = "orb_residential") -> dict:
    return {"user_id": user_id, "id": user_id, "role": role}


def test_template_search_returns_lifecycle_templates():
    results = orb_template_taxonomy_service.search("referral")
    assert any(t["template_id"] == "referral_summary" for t in results)
    group_b = orb_template_taxonomy_service.list_taxonomy(lifecycle_group="B")
    assert len(group_b) >= 5


def test_template_search_finds_synonyms():
    missing = orb_template_taxonomy_service.search("missing")
    assert any("missing" in t["template_id"] for t in missing)

    lado = orb_template_taxonomy_service.search("LADO")
    assert any("lado" in t["template_id"].lower() or "allegation" in t["template_id"] for t in lado)

    reg45 = orb_template_taxonomy_service.search("Reg 45")
    assert len(reg45) >= 1

    restraint = orb_template_taxonomy_service.search("physical intervention")
    assert any("restraint" in t["template_id"] or "physical" in t["template_id"] for t in restraint)


def test_station_template_filtering_works():
    chat = orb_template_taxonomy_service.templates_for_station("chat")
    assert all("chat" in t["station_availability"] for t in chat)
    assert len(chat) >= 40

    write = orb_template_taxonomy_service.templates_for_station("write")
    assert all("write" in t["station_availability"] for t in write)


def test_taxonomy_by_category():
    safeguarding = orb_template_taxonomy_service.templates_for_category("safeguarding")
    assert any(t["template_id"] == "safeguarding_concern_record" for t in safeguarding)


def test_suggest_for_content_returns_up_to_three():
    suggestions = orb_template_taxonomy_service.suggest_for_content(
        "We need a daily record for today's keywork session with safeguarding concerns about missing",
        station="chat",
        limit=3,
    )
    assert len(suggestions) <= 3
    assert all("suggestion_label" in s for s in suggestions)


def test_chat_save_creates_workspace_item_owned_by_current_user():
    user_a = _user(101)
    created = asyncio.run(
        workspace_routes.create_workspace_item(
            OrbRecordWorkspaceCreate(
                title="Chat answer draft",
                body="Child-centred summary for adult review.",
                source_station="chat",
                category="recording",
            ),
            current_user=user_a,
        )
    )
    item = created["data"]
    assert item.owner_user_id == "101"
    assert item.source_station == "chat"
    assert item.status == "draft"


def test_turn_into_record_creates_draft_with_template_id():
    user = _user(202)
    created = orb_records_workspace_service.create_item(
        202,
        OrbRecordWorkspaceCreate(
            title="Incident record draft",
            body="Factual incident summary.",
            source_station="chat",
            template_id="incident_record",
            category="incident_behaviour",
            metadata={"turn_into_record": True},
        ),
    )
    assert created.template_id == "incident_record"
    assert created.category == "incident_behaviour"
    assert created.metadata.get("turn_into_record") is True


def test_records_list_returns_only_current_user_items_by_default():
    orb_records_workspace_service.create_item(
        1,
        OrbRecordWorkspaceCreate(title="User 1 draft", body="A", source_station="chat"),
    )
    orb_records_workspace_service.create_item(
        2,
        OrbRecordWorkspaceCreate(title="User 2 draft", body="B", source_station="chat"),
    )

    listed_a = asyncio.run(workspace_routes.list_workspace_items(current_user=_user(1), limit=50, offset=0))
    listed_b = asyncio.run(workspace_routes.list_workspace_items(current_user=_user(2), limit=50, offset=0))

    assert listed_a["data"].total == 1
    assert listed_a["data"].items[0].title == "User 1 draft"
    assert listed_b["data"].total == 1
    assert listed_b["data"].items[0].title == "User 2 draft"


def test_status_transitions_draft_reviewed_finalised_archived():
    user_id = 303
    item = orb_records_workspace_service.create_item(
        user_id,
        OrbRecordWorkspaceCreate(title="Lifecycle test", body="Body", source_station="write"),
    )

    reviewed = orb_records_workspace_service.review_item(user_id, item.id)
    assert reviewed is not None
    assert reviewed.status == "reviewed"
    assert reviewed.reviewed_at is not None

    finalised = orb_records_workspace_service.finalise_item(user_id, item.id)
    assert finalised is not None
    assert finalised.status == "finalised"
    assert finalised.finalised_at is not None

    archived = orb_records_workspace_service.archive_item(user_id, item.id)
    assert archived is not None
    assert archived.status == "archived"


def test_source_metadata_preserved_not_visible_prose():
    item = orb_records_workspace_service.create_item(
        404,
        OrbRecordWorkspaceCreate(
            title="Source metadata test",
            body="Clean body without chip labels.",
            source_station="chat",
            metadata={"source_chips": [{"title": "Ofsted guidance"}]},
        ),
    )
    assert item.body == "Clean body without chip labels."
    assert item.metadata.get("source_chips_metadata") == [{"title": "Ofsted guidance"}]
    assert "source_chips" not in item.metadata


def test_communicate_save_path_uses_communicate_station():
    item = orb_records_workspace_service.create_item(
        505,
        OrbRecordWorkspaceCreate(
            title="Support pack",
            body="Easy-read hospital visit pack.",
            source_station="communicate",
            template_id="orb_communicate_support_pack_record",
            category="communicate",
        ),
    )
    assert item.source_station == "communicate"
    assert item.template_id == "orb_communicate_support_pack_record"


def test_no_duplicate_template_registry():
    import services.orb_template_library_registry as registry_module
    import services.orb_template_taxonomy_service as taxonomy_module

    assert registry_module.ORB_TEMPLATE_REGISTRY is not None
    taxonomy_source = inspect.getsource(taxonomy_module)
    assert "def _build_registry" not in taxonomy_source
    assert orb_template_taxonomy_service.coverage_report()["duplicate_registry_created"] is False


def test_local_storage_is_not_canonical_persistence():
    health = orb_records_workspace_service.health()
    assert health.persistence_status in {"memory", "database"}
    assert "localStorage" not in health.persistence_status


def test_user_cannot_access_other_users_workspace_item():
    created = orb_records_workspace_service.create_item(
        10,
        OrbRecordWorkspaceCreate(title="Private", body="x", source_station="chat"),
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(workspace_routes.get_workspace_item(created.id, current_user=_user(99)))
    assert exc.value.status_code == 404


def test_template_taxonomy_search_route_handler():
  result = asyncio.run(template_routes.taxonomy_search(q="daily", current_user=_user(1)))
  assert result["success"] is True
  assert any(t["template_id"] == "daily_record" for t in result["data"]["templates"])


def test_template_taxonomy_by_station_route():
    result = asyncio.run(template_routes.taxonomy_by_station("dictate", current_user=_user(1)))
    assert result["data"]["station"] == "dictate"
    assert len(result["data"]["templates"]) >= 1


def test_workspace_summary_endpoint():
    orb_records_workspace_service.create_item(
        77,
        OrbRecordWorkspaceCreate(title="Draft 1", body="a", source_station="chat"),
    )
    summary = asyncio.run(workspace_routes.workspace_summary(current_user=_user(77)))
    assert summary["data"].total >= 1


def test_invalid_status_transition_rejected():
    item = orb_records_workspace_service.create_item(
        88,
        OrbRecordWorkspaceCreate(title="Bad transition", body="x", source_station="chat"),
    )
    orb_records_workspace_service.archive_item(88, item.id)
    with pytest.raises(ValueError):
        orb_records_workspace_service.update_item(
            88,
            item.id,
            OrbRecordWorkspaceUpdate(status="draft"),
        )


def test_registry_resolve_still_single_source():
    assert orb_template_library_registry.resolve_template_id("help with daily record template") == "daily_record"

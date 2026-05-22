from __future__ import annotations

from unittest.mock import MagicMock

from repositories.documents_repository import get_document
from repositories.os_repository_utils import normalise_federated_id, parse_federated_id
from services.os_chronology_service import PRIORITY_CHRONOLOGY_SOURCES, SUPPLEMENTAL_CHRONOLOGY_SOURCES


def test_normalise_federated_id_decodes_double_encoding() -> None:
    assert normalise_federated_id("child_document%253A25") == "child_document:25"
    assert normalise_federated_id("child_document%3A25") == "child_document:25"


def test_parse_federated_id_splits_source() -> None:
    assert parse_federated_id("child_document%253A25") == ("child_document", "25")


def test_get_document_matches_encoded_child_document_id(monkeypatch) -> None:
    documents = [
        {
            "id": "child_document:25",
            "original_id": "25",
            "source_type": "child_document",
            "title": "Plan",
        }
    ]
    monkeypatch.setattr(
        "repositories.documents_repository.list_documents",
        lambda *_args, **_kwargs: documents,
    )
    found = get_document(MagicMock(), document_id="child_document%253A25", current_user={"role": "admin"})
    assert found is not None
    assert found["id"] == "child_document:25"


def test_chronology_source_order_prioritises_projection_tables() -> None:
    priority_tables = {source["table"] for source in PRIORITY_CHRONOLOGY_SOURCES}
    assert "chronology_events" in priority_tables
    assert "os_chronology_events" in priority_tables
    assert all(source["table"] not in priority_tables for source in SUPPLEMENTAL_CHRONOLOGY_SOURCES)


def test_child_experience_intelligence_route_is_sync() -> None:
    from routers.child_experience_intelligence_routes import get_child_experience_intelligence

    assert not getattr(get_child_experience_intelligence, "__wrapped__", None)
    import inspect

    assert not inspect.iscoroutinefunction(get_child_experience_intelligence)

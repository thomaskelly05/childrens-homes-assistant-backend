from __future__ import annotations

import pytest

from services.orb_document_ingestion_service import (
    UNSUPPORTED_FILE_MESSAGE,
    orb_document_ingestion_service,
)
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = True
    monkeypatch.setattr(svc, "_use_db", lambda: False)


def test_ingest_text_creates_source_and_chunks():
    result = orb_document_ingestion_service.ingest_text(
        "Test Recording Guidance",
        (
            "A good daily note should be factual, child-centred, include the child's voice "
            "where possible, and describe adult responses without judgemental language."
        ),
        "recording_quality",
    )
    assert result["chunk_count"] >= 1
    source = result["source"]
    assert source["source_type"] == "recording_quality"
    assert source["status"] == "indexed"
    assert source["standalone_only"] is True
    assert source["os_linked"] is False
    chunks = orb_knowledge_library_service.list_chunks(source["id"])
    assert chunks
    assert chunks[0].get("citation_label")


def test_chunk_text_creates_citation_labels():
    chunks = orb_document_ingestion_service.chunk_text(
        "# Section One\n\nParagraph about daily notes and child voice.\n\n" * 3,
        source_title="Recording guide",
        source_type="recording_quality",
    )
    assert chunks
    assert all(c.get("citation_label") for c in chunks)


def test_unsupported_file_type_error():
    text, method = orb_document_ingestion_service.extract_text_from_file(
        "image.png",
        b"\x89PNG",
        "image/png",
    )
    assert not text
    assert "Unsupported" in method


def test_detect_source_type_safeguarding():
    detected = orb_document_ingestion_service.detect_source_type(
        "Safeguarding policy",
        "Working Together safeguarding escalation",
    )
    assert detected == "safeguarding_principles"


def test_ingest_unsupported_raises():
    with pytest.raises(ValueError) as exc:
        orb_document_ingestion_service.ingest_file("file.bin", b"\x00\x01", "application/octet-stream")
    assert "Unsupported" in str(exc.value) or UNSUPPORTED_FILE_MESSAGE in str(exc.value)


def test_chunks_get_canonical_terms():
    chunks = orb_document_ingestion_service.chunk_text(
        "A child absconded from the home. Staff followed missing from care procedure.",
        source_title="Missing guidance",
        source_type="policy",
    )
    assert chunks[0].get("canonical_terms")
    assert "missing from care" in chunks[0]["canonical_terms"]


def test_chunks_get_semantic_keywords():
    chunks = orb_document_ingestion_service.chunk_text(
        "Daily note should capture child voice and wishes.",
        source_title="Recording",
        source_type="recording_quality",
    )
    assert chunks[0].get("semantic_keywords")


def test_embedding_failure_does_not_fail_ingestion(monkeypatch):
    monkeypatch.setattr(
        "services.orb_document_ingestion_service.orb_embedding_service.is_available",
        lambda: True,
    )
    monkeypatch.setattr(
        "services.orb_document_ingestion_service.orb_embedding_service.embed_text",
        lambda text: {"available": False, "embedding": None, "error": "fail"},
    )
    result = orb_document_ingestion_service.ingest_text(
        "Resilience note",
        "Short guidance about recording quality and daily notes.",
        "recording_quality",
    )
    assert result["chunk_count"] >= 1

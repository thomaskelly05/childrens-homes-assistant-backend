"""Tests for ORB Home Documents foundation — upload, retrieval, safeguarding, analytics."""

from __future__ import annotations

import asyncio
import io
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException, UploadFile

import core.router_loader as router_loader
import routers.orb_home_documents_routes as home_doc_routes
from schemas.orb_home_documents import (
    HOME_AWARE_ANSWER_DISCLAIMER,
    HOME_DOCUMENT_TYPE_LABELS,
    LOCAL_POLICY_CONFLICT_ADVISORY,
    OrbHomeDocumentListRequest,
    OrbHomeDocumentUpdate,
)
from services.orb_founder_analytics_foundation_service import orb_founder_analytics_foundation_service
from services.orb_home_aware_answer_service import orb_home_aware_answer_service
from services.orb_home_document_retrieval_service import (
    build_source_chip,
    orb_home_document_retrieval_service,
)
from services.orb_home_documents_service import orb_home_documents_service


@pytest.fixture(autouse=True)
def memory_home_docs(monkeypatch, tmp_path):
    svc = orb_home_documents_service
    svc._memory = {}
    svc._memory_chunks = {}
    svc._storage_mode = "memory"
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(
        "services.orb_home_documents_service._storage_root",
        lambda: tmp_path / "orb-home-documents",
    )
    monkeypatch.setattr(
        "services.orb_home_documents_service._embeddings_enabled",
        lambda: False,
    )


def _user(user_id: int, *, home_id: int = 42, org_id: int = 7, role: str = "manager") -> dict:
    return {
        "user_id": user_id,
        "id": user_id,
        "role": role,
        "home_id": home_id,
        "organisation_id": org_id,
        "provider_id": org_id,
    }


def _upload_file(
    filename: str,
    content: bytes,
    content_type: str,
) -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(content), headers={"content-type": content_type})


def test_allowed_document_types():
    required = [
        "statement_of_purpose",
        "safeguarding_policy",
        "missing_from_care_policy",
        "physical_intervention_policy",
        "medication_policy",
        "child_specific_plan",
        "local_authority_protocol",
        "other_home_policy",
    ]
    for doc_type in required:
        assert doc_type in HOME_DOCUMENT_TYPE_LABELS
    types = orb_home_documents_service.list_document_types()
    assert len(types) == len(HOME_DOCUMENT_TYPE_LABELS)


@pytest.mark.asyncio
async def test_upload_creates_audited_document_record():
    user = _user(501)
    content = b"Our home aims to provide safe, therapeutic care for children."
    upload = _upload_file("sop.txt", content, "text/plain")

    record = await orb_home_documents_service.upload_document(
        501,
        user,
        upload,
        title="Statement of Purpose",
        document_type="statement_of_purpose",
    )

    assert record.document_id
    assert record.uploaded_by_user_id == "501"
    assert record.home_id == "42"
    assert record.organisation_id == "7"
    assert record.text_extract_status == "ready"
    assert record.indexing_status == "disabled"
    assert record.filename == "sop.txt"
    assert record.storage_uri
    assert any(a.get("action") == "upload_started" for a in record.audit_trail)
    assert any(a.get("action") == "file_stored" for a in record.audit_trail)


@pytest.mark.asyncio
async def test_invalid_file_type_rejected():
    user = _user(502)
    upload = _upload_file("malware.exe", b"bad", "application/octet-stream")
    with pytest.raises(HTTPException) as exc:
        await orb_home_documents_service.upload_document(
            502, user, upload, title="Bad", document_type="other_home_policy"
        )
    assert exc.value.status_code == 415


@pytest.mark.asyncio
async def test_invalid_document_type_rejected():
    user = _user(503)
    upload = _upload_file("policy.txt", b"text", "text/plain")
    with pytest.raises(HTTPException) as exc:
        await orb_home_documents_service.upload_document(
            503, user, upload, title="Bad", document_type="not_a_real_type"
        )
    assert exc.value.status_code == 400


def test_document_list_scoped_to_user_home():
    user_a = _user(601, home_id=10)
    user_b = _user(602, home_id=20)

    row_a = {
        "id": "doc-a",
        "owner_user_id": 601,
        "uploaded_by_user_id": 601,
        "home_id": "10",
        "organisation_id": "7",
        "title": "Home A policy",
        "document_type": "safeguarding_policy",
        "text_extract_status": "ready",
        "indexing_status": "disabled",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    row_b = {
        **row_a,
        "id": "doc-b",
        "owner_user_id": 602,
        "uploaded_by_user_id": 602,
        "home_id": "20",
        "title": "Home B policy",
    }
    orb_home_documents_service._user_memory(601)["doc-a"] = row_a
    orb_home_documents_service._user_memory(602)["doc-b"] = row_b

    list_a = orb_home_documents_service.list_documents(
        601, user_a, OrbHomeDocumentListRequest()
    )
    list_b = orb_home_documents_service.list_documents(
        602, user_b, OrbHomeDocumentListRequest()
    )
    assert len(list_a) == 1
    assert list_a[0].document_id == "doc-a"
    assert len(list_b) == 1
    assert list_b[0].document_id == "doc-b"


@pytest.mark.asyncio
async def test_archive_works():
    user = _user(701)
    upload = _upload_file("policy.txt", b"Complaints procedure text here.", "text/plain")
    created = await orb_home_documents_service.upload_document(
        701, user, upload, title="Complaints", document_type="complaints_policy"
    )
    archived = orb_home_documents_service.archive_document(701, user, created.document_id)
    assert archived is not None
    assert archived.archived is True
    assert any(a.get("action") == "archived" for a in archived.audit_trail)

    active = orb_home_documents_service.list_documents(
        701, user, OrbHomeDocumentListRequest(include_archived=False)
    )
    assert all(not d.archived for d in active)


@pytest.mark.asyncio
async def test_text_extraction_status_lifecycle():
    user = _user(801)
    upload = _upload_file("empty.pdf", b"%PDF-1.4\n", "application/pdf")
    record = await orb_home_documents_service.upload_document(
        801, user, upload, title="Empty PDF", document_type="fire_safety_policy"
    )
    assert record.text_extract_status in {"ready", "failed"}
    if record.text_extract_status == "failed":
        assert record.metadata.get("extraction_error")


def test_indexing_status_disabled_when_embeddings_unavailable():
    health = orb_home_documents_service.health()
    assert health.embeddings_enabled is False


def test_source_chip_emitted_when_home_document_used(monkeypatch):
    user = _user(901)
    doc_id = "doc-chip-test"
    text = "Medication must be recorded in the MAR chart daily."
    orb_home_documents_service._user_memory(901)[doc_id] = {
        "id": doc_id,
        "owner_user_id": 901,
        "uploaded_by_user_id": 901,
        "home_id": "42",
        "organisation_id": "7",
        "title": "Medication Policy",
        "document_type": "medication_policy",
        "text_extract_status": "ready",
        "indexing_status": "indexed",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    orb_home_documents_service._memory_chunks[doc_id] = [
        {
            "document_id": doc_id,
            "document_type": "medication_policy",
            "chunk_index": 0,
            "text": text,
            "source_title": "Medication Policy",
            "version": 1,
        }
    ]

    results = orb_home_document_retrieval_service.search(
        "medication MAR recording", user_id=901, current_user=user, limit=3
    )
    assert results
    assert results[0]["source_chip"] == "Home document: Medication policy"
    assert build_source_chip("statement_of_purpose") == "Home document: Statement of Purpose"


def test_home_document_retrieval_is_permission_aware():
    user = _user(1001, home_id=99)
    other_doc = {
        "id": "other-home-doc",
        "owner_user_id": 9999,
        "uploaded_by_user_id": 9999,
        "home_id": "888",
        "organisation_id": "1",
        "title": "Other home",
        "document_type": "safeguarding_policy",
        "text_extract_status": "ready",
        "indexing_status": "indexed",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    orb_home_documents_service._user_memory(9999)["other-home-doc"] = other_doc
    orb_home_documents_service._memory_chunks["other-home-doc"] = [
        {"document_id": "other-home-doc", "document_type": "safeguarding_policy",
         "chunk_index": 0, "text": "safeguarding policy content", "version": 1}
    ]

    results = orb_home_document_retrieval_service.search(
        "safeguarding", user_id=1001, current_user=user
    )
    assert results == []
    assert orb_home_document_retrieval_service.is_permission_aware() is True


def test_local_document_cannot_override_safeguarding_principle():
    grounding = orb_home_aware_answer_service.ground_for_query(
        "safeguarding allegation and LADO referral",
        user_id=1101,
        current_user=_user(1101),
    )
    assert LOCAL_POLICY_CONFLICT_ADVISORY in orb_home_aware_answer_service.local_document_cannot_override_safeguarding()
    assert "safeguarding" in HOME_AWARE_ANSWER_DISCLAIMER.lower()
    assert grounding["conflict_advisory"] is None or "manager" in grounding["conflict_advisory"].lower()


def test_founder_analytics_redacts_identifiers():
    orb_home_documents_service._user_memory(1)["doc-1"] = {
        "id": "doc-1",
        "owner_user_id": 1,
        "uploaded_by_user_id": 1,
        "home_id": "42",
        "organisation_id": "7",
        "title": "Child John Smith placement plan",
        "document_type": "child_specific_plan",
        "text_extract_status": "ready",
        "indexing_status": "disabled",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {"child_name": "John Smith"},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    analytics = orb_home_documents_service.founder_analytics()
    assert analytics["identifiers_redacted"] is True
    assert analytics["upload_count"] >= 1
    assert "child_specific_plan" in analytics["by_document_type"]
    assert "child_name" not in str(analytics.get("by_document_type"))


def test_no_duplicate_document_library_created():
    loader_source = Path(router_loader.__file__).read_text(encoding="utf-8")
    assert "document_library_routes" not in loader_source
    assert "orb_home_documents_routes" in loader_source
    convergence = Path("docs/audits/orb-home-documents-convergence-map.md").read_text(encoding="utf-8")
    assert "document_library_routes" in convergence
    assert "not mounted" in convergence.lower() or "unmounted" in convergence.lower()


def test_orphaned_routes_documented_in_convergence_map():
    doc = Path("docs/audits/orb-home-documents-convergence-map.md").read_text(encoding="utf-8")
    for orphan in (
        "document_library_routes",
        "workspace_records_routes",
        "universal_document_intelligence_router",
    ):
        assert orphan in doc


def test_home_aware_grounding_phrase_for_sop(monkeypatch):
    user = _user(1201)
    doc_id = "sop-doc"
    orb_home_documents_service._user_memory(1201)[doc_id] = {
        "id": doc_id,
        "owner_user_id": 1201,
        "uploaded_by_user_id": 1201,
        "home_id": "42",
        "organisation_id": "7",
        "title": "SOP",
        "document_type": "statement_of_purpose",
        "text_extract_status": "ready",
        "indexing_status": "indexed",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    orb_home_documents_service._memory_chunks[doc_id] = [
        {
            "document_id": doc_id,
            "document_type": "statement_of_purpose",
            "chunk_index": 0,
            "text": "Our aims and ethos for the children's home purpose values.",
            "source_title": "SOP",
            "version": 1,
        }
    ]
    grounding = orb_home_aware_answer_service.ground_for_query(
        "What is our home purpose and ethos?",
        user_id=1201,
        current_user=user,
    )
    assert grounding["home_documents_used"] is True
    assert grounding["grounding_phrase"]
    assert "Statement of Purpose" in grounding["grounding_phrase"]
    assert grounding["source_chips"]


def test_routes_list_types():
    result = asyncio.run(home_doc_routes.list_document_types(current_user=_user(1)))
    assert result["success"] is True
    assert len(result["data"]["types"]) == len(HOME_DOCUMENT_TYPE_LABELS)


def test_get_document_audits_read():
    user = _user(1301)
    doc_id = "audit-read-doc"
    orb_home_documents_service._user_memory(1301)[doc_id] = {
        "id": doc_id,
        "owner_user_id": 1301,
        "uploaded_by_user_id": 1301,
        "home_id": "42",
        "organisation_id": "7",
        "title": "Policy",
        "document_type": "whistleblowing_policy",
        "text_extract_status": "ready",
        "indexing_status": "disabled",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    record = orb_home_documents_service.get_document(1301, user, doc_id)
    assert record is not None
    assert any(a.get("action") == "read" for a in record.audit_trail)


def test_update_document_metadata():
    user = _user(1401)
    doc_id = "update-doc"
    orb_home_documents_service._user_memory(1401)[doc_id] = {
        "id": doc_id,
        "owner_user_id": 1401,
        "uploaded_by_user_id": 1401,
        "home_id": "42",
        "organisation_id": "7",
        "title": "Old title",
        "document_type": "admission_policy",
        "text_extract_status": "ready",
        "indexing_status": "disabled",
        "version": 1,
        "archived": False,
        "access_role_policy": "home_manager",
        "privacy_classification": "home_operational",
        "audit_trail": [],
        "metadata": {},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    updated = orb_home_documents_service.update_document(
        1401,
        user,
        doc_id,
        OrbHomeDocumentUpdate(title="New title"),
    )
    assert updated is not None
    assert updated.title == "New title"

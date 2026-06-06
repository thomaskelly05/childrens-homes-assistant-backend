from __future__ import annotations

import asyncio
import base64

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock

from routers.orb_document_routes import OrbDocumentUploadRequest, upload_document


def _user() -> dict:
    return {"user_id": 1, "id": 1, "role": "orb_residential"}


def test_upload_rejects_executable_extension(monkeypatch):
    payload = OrbDocumentUploadRequest(
        title="Bad",
        file_name="malware.exe",
        content_base64=base64.b64encode(b"fake").decode("ascii"),
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(upload_document(payload, current_user=_user()))
    assert exc.value.status_code == 400
    assert "unsafe" in str(exc.value.detail).lower() or "unsupported" in str(exc.value.detail).lower()


def test_upload_rejects_oversized_file(monkeypatch):
    large = b"x" * (11 * 1024 * 1024)
    payload = OrbDocumentUploadRequest.model_construct(
        title="Big",
        file_name="notes.txt",
        content_base64=base64.b64encode(large).decode("ascii"),
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(upload_document(payload, current_user=_user()))
    assert exc.value.status_code == 400
    assert "too large" in str(exc.value.detail).lower()


def test_upload_accepts_allowed_txt(monkeypatch):
    monkeypatch.setattr(
        "routers.orb_document_routes.orb_document_ingestion_service.ingest_file",
        lambda *_a, **_k: {"source": {"id": "src1", "title": "Notes", "source_type": "text", "status": "indexed"}, "chunk_count": 1},
    )
    payload = OrbDocumentUploadRequest(
        title="Notes",
        file_name="notes.txt",
        content_base64=base64.b64encode(b"hello world").decode("ascii"),
    )
    result = asyncio.run(upload_document(payload, current_user=_user()))
    assert result["success"] is True
    assert result["data"]["standalone_only"] is True


def test_compare_route_requires_premium_module():
    import routers.orb_document_routes as routes

    from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access

    assert routes.require_standalone_orb_access is require_rich_orb_premium_access

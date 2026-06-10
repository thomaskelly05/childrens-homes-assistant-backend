from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app as app_module
from auth.current_user import get_current_user
from middleware.security_middleware import CsrfProtectionMiddleware


@pytest.fixture()
def admin_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def _ensure_tables(*args, **kwargs):
        return None

    monkeypatch.setattr(
        "db.founder_persistence_db.ensure_founder_persistence_tables",
        _ensure_tables,
    )

    stored: dict[str, list] = {"records": [], "audit": []}

    def _create_record(**kwargs):
        record = dict(kwargs["record"])
        record.setdefault("id", f"rec-{len(stored['records']) + 1}")
        stored["records"].append({"entity_type": kwargs["entity_type"], "record": record})
        return record

    def _list_records(**kwargs):
        items = [
            row["record"]
            for row in stored["records"]
            if row["entity_type"] == kwargs["entity_type"]
        ]
        return items

    def _get_record(**kwargs):
        for row in stored["records"]:
            if row["entity_type"] == kwargs["entity_type"] and row["record"].get("id") == kwargs["record_id"]:
                return row["record"]
        return None

    def _update_record(**kwargs):
        for row in stored["records"]:
            if row["entity_type"] == kwargs["entity_type"] and row["record"].get("id") == kwargs["record_id"]:
                row["record"].update(kwargs["patch"])
                return row["record"]
        return None

    def _append_audit_log(**kwargs):
        entry = {
            "id": f"audit-{len(stored['audit']) + 1}",
            "createdAt": "2026-06-09T12:00:00+00:00",
            "actor": kwargs["actor"],
            "eventType": kwargs["event_type"],
            "entityType": kwargs["entity_type"],
            "entityId": kwargs["entity_id"],
            "summary": kwargs["summary"],
            "status": kwargs.get("status"),
            "metadata": kwargs.get("metadata") or {},
        }
        stored["audit"].append(entry)
        return entry

    def _list_audit_log(**kwargs):
        return list(stored["audit"])

    target = "routers.founder_persistence_routes"
    monkeypatch.setattr(f"{target}.create_record", _create_record)
    monkeypatch.setattr(f"{target}.list_records", _list_records)
    monkeypatch.setattr(f"{target}.get_record", _get_record)
    monkeypatch.setattr(f"{target}.update_record", _update_record)
    monkeypatch.setattr(f"{target}.append_audit_log", _append_audit_log)
    monkeypatch.setattr(f"{target}.list_audit_log", _list_audit_log)

    def admin_user():
        return {"id": 5, "role": "admin", "email": "admin@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = admin_user
    client = TestClient(app_module.app)
    client.stored = stored
    yield client
    app_module.app.dependency_overrides.clear()


@pytest.fixture()
def staff_client(monkeypatch):
    async def _bypass_csrf_dispatch(self, request, call_next):
        return await call_next(request)

    monkeypatch.setattr(CsrfProtectionMiddleware, "dispatch", _bypass_csrf_dispatch)
    monkeypatch.setattr(app_module, "init_db_pool", lambda: None, raising=False)
    monkeypatch.setattr(app_module, "close_db_pool", lambda: None, raising=False)

    def staff_user():
        return {"id": 2, "role": "staff", "email": "staff@test.com", "home_id": 1}

    app_module.app.dependency_overrides[get_current_user] = staff_user
    yield TestClient(app_module.app)
    app_module.app.dependency_overrides.clear()


def test_founder_persistence_requires_founder_role(staff_client):
    response = staff_client.get("/founder-os/persistence/approvals")
    assert response.status_code == 403


def test_approval_create_and_decision_persists(admin_client):
    create = admin_client.post(
        "/founder-os/persistence/approvals",
        json={
            "record": {
                "status": "pending",
                "item": {
                    "id": "approval-1",
                    "type": "linkedin-post",
                    "title": "Weekly update",
                    "content": "Safe founder content.",
                    "requestedByAgent": "brand-ambassador",
                    "riskLevel": "low",
                    "safetyCheck": "Passed",
                    "status": "pending",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                },
            }
        },
    )
    assert create.status_code == 200
    record_id = create.json()["data"]["id"]

    decision = admin_client.post(
        f"/founder-os/persistence/approvals/{record_id}/decision",
        json={"status": "approved", "founder_note": "Looks good"},
    )
    assert decision.status_code == 200
    assert decision.json()["data"]["status"] == "approved"
    assert len(admin_client.stored["audit"]) >= 2


def test_audit_log_lists_events(admin_client):
    admin_client.post(
        "/founder-os/persistence/audit-log",
        json={
            "event_type": "created",
            "entity_type": "quality_run",
            "entity_id": "ql-run-1",
            "summary": "Quality lab run persisted",
            "status": "complete",
        },
    )
    response = admin_client.get("/founder-os/persistence/audit-log")
    assert response.status_code == 200
    assert response.json()["data"]["count"] >= 1


def test_api_response_strips_identifiable_fields(admin_client):
    response = admin_client.post(
        "/founder-os/persistence/content",
        json={
            "record": {
                "status": "draft",
                "draft": {
                    "id": "draft-1",
                    "title": "Update",
                    "channel": "linkedin",
                    "body": "Safe copy",
                    "status": "draft",
                    "createdByAgent": "brand-ambassador",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                    "safetyNotes": [],
                    "dataBasis": "No live metrics",
                    "child_name": "must be stripped",
                },
            }
        },
    )
    assert response.status_code == 200
    payload = response.json()["data"]
    assert "child_name" not in str(payload)


def test_founder_memory_create(admin_client):
    response = admin_client.post(
        "/founder-os/persistence/memories",
        json={
            "record": {
                "status": "active",
                "item": {
                    "id": "memory-1",
                    "type": "principle",
                    "title": "Live-only metrics",
                    "content": "Use live founder metrics only.",
                    "status": "active",
                    "importance": "critical",
                    "tags": ["principle"],
                    "source": "founder-ui",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                    "updatedAt": "2026-06-09T12:00:00+00:00",
                    "createdBy": "founder",
                },
            }
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["item"]["type"] == "principle"


def test_founder_memory_requires_founder_role(staff_client):
    response = staff_client.get("/founder-os/persistence/memories")
    assert response.status_code == 403


def test_evidence_pack_create(admin_client):
    response = admin_client.post(
        "/founder-os/persistence/evidence-packs",
        json={
            "record": {
                "status": "needs-review",
                "pack": {
                    "id": "pack-1",
                    "title": "Investor Evidence Pack",
                    "audience": "investor",
                    "purpose": "Honest investor narrative",
                    "status": "needs-review",
                    "dataBasis": "founder memory only",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                    "updatedAt": "2026-06-09T12:00:00+00:00",
                    "createdBy": "founder",
                    "sections": [],
                    "safetyReview": {
                        "safe": True,
                        "issues": [],
                        "requiresReview": False,
                        "reviewedAt": "2026-06-09T12:00:00+00:00",
                    },
                    "limitations": ["Live data not yet available."],
                },
            }
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["pack"]["audience"] == "investor"


def test_evidence_pack_requires_founder_role(staff_client):
    response = staff_client.get("/founder-os/persistence/evidence-packs")
    assert response.status_code == 403


def test_quality_proposal_create(admin_client):
    response = admin_client.post(
        "/founder-os/persistence/quality-proposals",
        json={
            "record": {
                "status": "draft",
                "proposal": {
                    "id": "ql-proposal-1",
                    "title": "Marker gap",
                    "description": "Add missing marker",
                    "type": "marker-gap",
                    "status": "draft",
                    "priority": "high",
                    "suggestedChange": "Update rubric",
                    "acceptanceCriteria": ["Passes gold pack"],
                    "createdBy": "founder",
                    "createdAt": "2026-06-09T12:00:00+00:00",
                },
            }
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "draft"

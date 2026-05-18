from __future__ import annotations

from pathlib import Path

import pytest

from repositories import workspaces_repository as workspace_repo
from services.experience_bundle_service import ExperienceBundleService


class RecordingCursor:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, query, params=()):
        self.conn.queries.append((query, params))

    def fetchall(self):
        return self.conn.rows


class RecordingConn:
    def __init__(self, rows):
        self.rows = rows
        self.queries = []

    def cursor(self, *args, **kwargs):
        return RecordingCursor(self)


def test_provider_level_user_lists_schema_mapped_young_people(monkeypatch):
    columns = {
        "id",
        "home_id",
        "provider_id",
        "first_name",
        "last_name",
        "preferred_name",
        "date_of_birth",
        "gender",
        "admission_date",
        "placement_status",
        "primary_keyworker_id",
        "key_worker_id",
        "summary_risk_level",
        "photo_url",
        "profile_photo_path",
        "placing_authority",
        "social_worker_name",
        "social_worker_email",
        "social_worker_phone",
        "legal_status_summary",
        "current_placement_plan_status",
        "archived",
    }
    monkeypatch.setattr(workspace_repo, "table_exists", lambda conn, table_name: table_name == "young_people")
    monkeypatch.setattr(workspace_repo, "table_columns", lambda conn, table_name: columns)
    conn = RecordingConn(
        [
            {
                "id": 21,
                "home_id": 3,
                "provider_id": 7,
                "first_name": "Ava",
                "last_name": "Stone",
                "preferred_name": "Ava",
                "date_of_birth": "2012-05-01",
                "gender": "female",
                "admission_date": "2025-09-01",
                "placement_status": "active",
                "primary_keyworker_id": 4,
                "key_worker_id": 5,
                "summary_risk_level": "high",
                "photo_url": "/uploads/ava.jpg",
                "profile_photo_path": "/uploads/ava-profile.jpg",
                "placing_authority": "Local authority",
                "social_worker_name": "Sam Social",
                "social_worker_email": "sam@example.com",
                "social_worker_phone": "01000 000000",
                "legal_status_summary": "Section 20",
                "current_placement_plan_status": "current",
                "archived": False,
            }
        ]
    )

    rows = workspace_repo.list_young_people(
        conn,
        current_user={"id": 1, "role": "provider_admin", "provider_id": 7, "allowed_home_ids": [3, 4], "permissions": ["records:read", "provider:oversight"]},
    )

    assert rows[0]["provider_id"] == "7"
    assert rows[0]["display_name"] == "Ava Stone"
    assert rows[0]["key_worker_id"] == "5"
    assert rows[0]["profile_photo_path"] == "/uploads/ava-profile.jpg"
    assert rows[0]["legal_status_summary"] == "Section 20"
    assert conn.queries[-1][1][0] == [3, 4]
    assert conn.queries[-1][1][1] == 7


def test_home_scoped_user_cannot_access_child_outside_scoped_list(monkeypatch):
    monkeypatch.setattr(workspace_repo, "list_young_people", lambda conn, current_user, limit=600: [{"id": "21", "home_id": "3"}])

    assert workspace_repo.get_young_person(object(), young_person_id=99, current_user={"id": 2, "role": "manager", "home_id": 3}) is None


def test_young_person_workspace_uses_live_child_scoped_repositories(monkeypatch):
    monkeypatch.setattr(workspace_repo, "get_young_person", lambda conn, young_person_id, current_user: {"id": str(young_person_id), "home_id": "3"})
    monkeypatch.setattr(workspace_repo, "list_chronology", lambda **kwargs: {"items": [{"id": "chronology:1"}]})
    monkeypatch.setattr(workspace_repo, "list_actions", lambda *args, **kwargs: [{"id": "task:1"}])
    monkeypatch.setattr(workspace_repo, "list_documents", lambda *args, **kwargs: [{"id": "document:1"}])
    monkeypatch.setattr(workspace_repo, "list_evidence", lambda *args, **kwargs: [{"id": "evidence:1"}])
    monkeypatch.setattr(workspace_repo, "list_reports", lambda *args, **kwargs: [{"id": "report:1"}])

    bundle = workspace_repo.young_person_workspace(object(), young_person_id=21, current_user={"id": 1, "role": "manager", "home_id": 3})

    assert bundle["young_person"]["id"] == "21"
    assert bundle["chronology"] == [{"id": "chronology:1"}]
    assert bundle["documents"] == [{"id": "document:1"}]
    assert bundle["evidence"] == [{"id": "evidence:1"}]
    assert bundle["actions"] == [{"id": "task:1"}]


class BundleForProfileTest(ExperienceBundleService):
    def _authorise(self, current_user, permission, home_id=None):
        class Context:
            provider_id = 7
            tenancy_scope = "home"

            def can_access_home(self, requested):
                return int(requested) == 3

        return Context()

    def _child_workspace(self, conn, current_user, young_person_id):
        return {
            "young_person": {"id": young_person_id, "home_id": 3, "provider_id": 7, "preferred_name": "Ava", "summary_risk_level": "medium"},
            "chronology": [{"id": "chronology:1"}],
            "documents": [{"id": "document:1"}],
            "evidence": [{"id": "evidence:1"}],
            "actions": [{"id": "task:1"}],
        }

    def _first_for_child(self, conn, table_name, young_person_id):
        return {}

    def _one_by_id(self, conn, table_name, record_id):
        return {}

    def _records_for_child(self, conn, table_name, young_person_id, limit):
        return []

    def _plans(self, conn, young_person_id):
        return []


def test_profile_bundle_is_compatibility_wrapper_over_workspace_data():
    bundle = BundleForProfileTest().child_profile_bundle(object(), {"id": 1, "role": "manager", "home_id": 3, "provider_id": 7}, 21)

    assert bundle["identity"]["preferred_name"] == "Ava"
    assert bundle["recent_chronology"] == [{"id": "chronology:1"}]
    assert bundle["documents"] == [{"id": "document:1"}]
    assert bundle["evidence"] == [{"id": "evidence:1"}]
    assert bundle["actions"] == [{"id": "task:1"}]


def test_frontend_redirects_and_legacy_data_paths_are_clean():
    root = Path(__file__).resolve().parents[1] / "frontend-next"

    assert "redirect('/young-people')" in (root / "app/page.tsx").read_text()
    assert "redirect('/young-people')" in (root / "app/home/page.tsx").read_text()
    assert "redirect('/young-people')" in (root / "app/dashboard/page.tsx").read_text()
    assert "/timeline" not in (root / "lib/os-api/chronology.ts").read_text()
    assert "/young-people/${encodeURIComponent(params.youngPersonId)}" not in (root / "lib/os-api/chronology.ts").read_text()


def test_cookie_forwarding_stays_in_server_only_modules_or_api_routes():
    root = Path(__file__).resolve().parents[1] / "frontend-next"
    offenders = []
    for path in root.rglob("*.ts*"):
        text = path.read_text()
        if "next/headers" not in text:
            continue
        relative = path.relative_to(root).as_posix()
        if relative.startswith("app/api/") or relative.startswith("lib/os-api/server-"):
            continue
        offenders.append(relative)
    assert offenders == []

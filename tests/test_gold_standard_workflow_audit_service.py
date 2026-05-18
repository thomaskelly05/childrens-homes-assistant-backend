from __future__ import annotations

from fastapi import FastAPI

from services.gold_standard_workflow_audit_service import audit_daily_note_gold_standard


def test_daily_note_gold_standard_reports_full_route_coverage():
    app = FastAPI()

    @app.get("/young-people/{young_person_id}/daily-notes")
    def list_daily_notes():
        return {"items": []}

    @app.get("/young-people/{young_person_id}/daily-notes/archive")
    def list_archived_daily_notes():
        return {"items": []}

    @app.get("/young-people/daily-notes/{daily_note_id}")
    def get_daily_note():
        return {"ok": True}

    @app.post("/young-people/{young_person_id}/daily-notes")
    def create_daily_note():
        return {"ok": True}

    @app.patch("/young-people/daily-notes/{daily_note_id}")
    def update_daily_note():
        return {"ok": True}

    @app.post("/young-people/daily-notes/{daily_note_id}/submit")
    def submit_daily_note():
        return {"ok": True}

    @app.post("/young-people/daily-notes/{daily_note_id}/approve")
    def approve_daily_note():
        return {"ok": True}

    @app.post("/young-people/daily-notes/{daily_note_id}/return")
    def return_daily_note():
        return {"ok": True}

    @app.post("/young-people/daily-notes/{daily_note_id}/archive")
    def archive_daily_note():
        return {"ok": True}

    result = audit_daily_note_gold_standard(app)
    daily_note = result["workflows"]["daily_note"]

    assert result["reference_workflow"] == "daily_note"
    assert daily_note["score"]["status"] == "gold_standard"
    assert daily_note["score"]["percentage"] == 100
    assert daily_note["missing_required_actions"] == []


def test_daily_note_gold_standard_flags_missing_lifecycle_actions():
    app = FastAPI()

    @app.get("/young-people/{young_person_id}/daily-notes")
    def list_daily_notes():
        return {"items": []}

    @app.post("/young-people/{young_person_id}/daily-notes")
    def create_daily_note():
        return {"ok": True}

    result = audit_daily_note_gold_standard(app)
    daily_note = result["workflows"]["daily_note"]
    missing = {item["key"] for item in daily_note["missing_required_actions"]}

    assert daily_note["score"]["status"] != "gold_standard"
    assert "submit" in missing
    assert "approve" in missing
    assert "return" in missing
    assert "archive" in missing

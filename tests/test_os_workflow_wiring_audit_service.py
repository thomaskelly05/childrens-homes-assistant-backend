from __future__ import annotations

from fastapi import FastAPI

from services.os_workflow_wiring_audit_service import (
    WORKFLOW_CONTRACTS,
    build_route_index,
    normalise_route_path,
    route_exists,
)


def test_normalise_route_path_handles_fastapi_and_frontend_placeholders():
    assert normalise_route_path("/young-people/{young_person_id}/daily-notes") == "/young-people/{}/daily-notes"
    assert normalise_route_path("/young-people/:youngPersonId/daily-notes/") == "/young-people/{}/daily-notes"


def test_route_index_matches_expected_dynamic_routes():
    app = FastAPI()

    @app.get("/young-people/{young_person_id}/daily-notes")
    def list_daily_notes():
        return {"ok": True}

    @app.post("/young-people/{young_person_id}/daily-notes")
    def create_daily_note():
        return {"ok": True}

    route_index = build_route_index(app)

    assert route_exists(route_index, "/young-people/{young_person_id}/daily-notes", "GET")
    assert route_exists(route_index, "/young-people/:youngPersonId/daily-notes", "POST")
    assert not route_exists(route_index, "/young-people/{young_person_id}/daily-notes", "PATCH")


def test_workflow_contracts_cover_core_child_os_workflows():
    record_types = {contract.record_type for contract in WORKFLOW_CONTRACTS}

    assert {
        "daily_note",
        "incident",
        "health_record",
        "education_record",
        "family_contact",
        "risk",
        "support_plan",
        "medication_record",
        "missing_episode",
        "handover_record",
    } <= record_types

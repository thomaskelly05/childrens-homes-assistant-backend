from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI

from services.child_record_sync_service import ChildRecordSyncService
from services.os_sync_hooks import SUPPORTED_SYNC_TABLES

_PLACEHOLDER_RE = re.compile(r"\{[^}]+\}|:[A-Za-z_][A-Za-z0-9_]*")


@dataclass(frozen=True)
class WorkflowContract:
    record_type: str
    label: str
    table: str
    sync_table: str
    section: str
    list_route: str
    create_route: str
    get_route: str | None = None
    update_route: str | None = None
    archive_route: str | None = None
    assistant_route: str | None = None
    timeline_visible: bool = True
    assistant_readable: bool = True
    ofsted_relevant: bool = True


WORKFLOW_CONTRACTS: tuple[WorkflowContract, ...] = (
    WorkflowContract("daily_note", "Daily note", "daily_notes", "daily_notes", "daily-notes", "/young-people/{young_person_id}/daily-notes", "/young-people/{young_person_id}/daily-notes", "/young-people/daily-notes/{daily_note_id}", "/young-people/daily-notes/{daily_note_id}", "/young-people/daily-notes/{daily_note_id}/archive", "/young-people/{young_person_id}/daily-notes"),
    WorkflowContract("incident", "Incident", "incidents", "incidents", "incidents", "/young-people/{young_person_id}/incidents", "/young-people/{young_person_id}/incidents", "/young-people/incidents/{incident_id}", "/young-people/incidents/{incident_id}", "/young-people/incidents/{incident_id}/archive", "/young-people/{young_person_id}/incidents"),
    WorkflowContract("safeguarding_record", "Safeguarding record", "safeguarding_records", "safeguarding_records", "safeguarding", "/young-people/{young_person_id}/safeguarding", "/young-people/{young_person_id}/safeguarding", "/young-people/safeguarding/{record_id}", "/young-people/safeguarding/{record_id}", assistant_route="/young-people/{young_person_id}/safeguarding"),
    WorkflowContract("missing_episode", "Missing episode", "missing_episodes", "missing_episodes", "safeguarding", "/young-people/{young_person_id}/missing-episodes", "/young-people/{young_person_id}/missing-episodes", "/young-people/missing-episodes/{record_id}", "/young-people/missing-episodes/{record_id}", assistant_route="/young-people/{young_person_id}/missing-episodes"),
    WorkflowContract("risk", "Risk assessment", "risk_assessments", "risk_assessments", "risk", "/young-people/{young_person_id}/risk", "/young-people/{young_person_id}/risk", "/young-people/risk/{record_id}", "/young-people/risk/{record_id}", assistant_route="/young-people/{young_person_id}/risk"),
    WorkflowContract("support_plan", "Support plan", "support_plans", "support_plans", "plans", "/young-people/{young_person_id}/plans", "/young-people/{young_person_id}/plans", "/young-people/plans/{record_id}", "/young-people/plans/{record_id}", assistant_route="/young-people/{young_person_id}/plans"),
    WorkflowContract("health_record", "Health record", "health_records", "health_records", "health", "/young-people/{young_person_id}/health", "/young-people/{young_person_id}/health-records", "/young-people/health-records/{record_id}", "/young-people/health-records/{record_id}", assistant_route="/young-people/{young_person_id}/health"),
    WorkflowContract("medication_record", "Medication record", "medication_records", "medication_records", "medication", "/young-people/{young_person_id}/medication-records", "/young-people/{young_person_id}/medication-records", "/young-people/medication-records/{record_id}", "/young-people/medication-records/{record_id}", assistant_route="/young-people/{young_person_id}/medication-records"),
    WorkflowContract("education_record", "Education record", "education_records", "education_records", "education", "/young-people/{young_person_id}/education", "/young-people/{young_person_id}/education-records", "/young-people/education-records/{record_id}", "/young-people/education-records/{record_id}", assistant_route="/young-people/{young_person_id}/education"),
    WorkflowContract("family_contact", "Family contact", "family_contact_records", "family_contact_records", "family", "/young-people/{young_person_id}/family", "/young-people/{young_person_id}/family/records", "/young-people/family/records/{record_id}", "/young-people/family/records/{record_id}", assistant_route="/young-people/{young_person_id}/family"),
    WorkflowContract("keywork", "Key work session", "keywork_sessions", "keywork_sessions", "keywork", "/young-people/{young_person_id}/keywork", "/young-people/{young_person_id}/keywork", "/young-people/keywork/{record_id}", "/young-people/keywork/{record_id}", assistant_route="/young-people/{young_person_id}/keywork"),
    WorkflowContract("appointment", "Appointment", "young_person_appointments", "young_person_appointments", "appointments", "/young-people/{young_person_id}/appointments", "/young-people/{young_person_id}/appointments", "/young-people/appointments/{record_id}", "/young-people/appointments/{record_id}", assistant_route="/young-people/{young_person_id}/appointments"),
    WorkflowContract("document", "Document", "documents", "documents", "documents", "/young-people/{young_person_id}/documents", "/young-people/{young_person_id}/documents", "/young-people/documents/{record_id}", "/young-people/documents/{record_id}", assistant_route="/young-people/{young_person_id}/documents", timeline_visible=False),
    WorkflowContract("statutory_document", "Statutory document", "statutory_documents", "statutory_documents", "documents", "/young-people/{young_person_id}/statutory-documents", "/young-people/{young_person_id}/statutory-documents", "/young-people/statutory-documents/{record_id}", "/young-people/statutory-documents/{record_id}", assistant_route="/young-people/{young_person_id}/statutory-documents", timeline_visible=False),
    WorkflowContract("handover_record", "Handover record", "handover_records", "handover_records", "handover", "/young-people/{young_person_id}/handover", "/young-people/{young_person_id}/handover", "/young-people/handover/{record_id}", "/young-people/handover/{record_id}", assistant_route="/young-people/{young_person_id}/handover"),
)


def normalise_route_path(path: str | None) -> str:
    if not path:
        return ""
    return _PLACEHOLDER_RE.sub("{}", str(path).rstrip("/"))


def build_route_index(app: FastAPI) -> dict[str, set[str]]:
    index: dict[str, set[str]] = {}
    for route in getattr(app, "routes", []):
        path = normalise_route_path(getattr(route, "path", ""))
        methods = getattr(route, "methods", None) or set()
        if path:
            index.setdefault(path, set()).update(str(method).upper() for method in methods)
    return index


def route_exists(route_index: dict[str, set[str]], path: str | None, method: str) -> bool:
    return bool(path) and method.upper() in route_index.get(normalise_route_path(path), set())


def check_relation(cursor: Any, name: str) -> dict[str, Any]:
    cursor.execute(
        """
        SELECT c.relkind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = %s
        LIMIT 1
        """,
        (name,),
    )
    row = cursor.fetchone()
    relkind = row.get("relkind") if isinstance(row, dict) and row else row[0] if row else None
    return {"name": name, "exists": bool(relkind), "kind": {"r": "table", "v": "view", "m": "materialized_view"}.get(relkind, relkind)}


def build_table_index(cursor: Any) -> dict[str, dict[str, Any]]:
    return {name: check_relation(cursor, name) for name in sorted({contract.table for contract in WORKFLOW_CONTRACTS})}


def workflow_status(checks: dict[str, bool]) -> str:
    if checks["table"] and checks["list_route"] and checks["create_route"] and checks["outer_sync_supported"]:
        if checks["child_sync_supported"] or not checks["timeline_visible"]:
            return "wired"
        return "partially_wired"
    if any(checks.values()):
        return "needs_wiring"
    return "missing"


def audit_workflow_contracts(*, app: FastAPI, cursor: Any) -> dict[str, Any]:
    route_index = build_route_index(app)
    table_index = build_table_index(cursor)
    child_sync_tables = set(getattr(ChildRecordSyncService, "SUPPORTED_TABLES", set()))
    workflows: dict[str, Any] = {}

    for contract in WORKFLOW_CONTRACTS:
        table = table_index.get(contract.table, {"exists": False, "name": contract.table})
        checks = {
            "table": bool(table.get("exists")),
            "list_route": route_exists(route_index, contract.list_route, "GET"),
            "create_route": route_exists(route_index, contract.create_route, "POST"),
            "get_route": route_exists(route_index, contract.get_route, "GET"),
            "update_route": route_exists(route_index, contract.update_route, "PATCH") or route_exists(route_index, contract.update_route, "PUT"),
            "archive_route": route_exists(route_index, contract.archive_route, "POST") if contract.archive_route else False,
            "assistant_route": route_exists(route_index, contract.assistant_route, "GET") if contract.assistant_route else False,
            "outer_sync_supported": contract.sync_table in SUPPORTED_SYNC_TABLES,
            "child_sync_supported": contract.sync_table in child_sync_tables,
            "timeline_visible": contract.timeline_visible,
        }
        workflows[contract.record_type] = {
            "record_type": contract.record_type,
            "label": contract.label,
            "section": contract.section,
            "table": table,
            "routes": {
                "list": {"path": contract.list_route, "method": "GET", "exists": checks["list_route"]},
                "create": {"path": contract.create_route, "method": "POST", "exists": checks["create_route"]},
                "get": {"path": contract.get_route, "method": "GET", "exists": checks["get_route"]},
                "update": {"path": contract.update_route, "method": "PATCH|PUT", "exists": checks["update_route"]},
                "archive": {"path": contract.archive_route, "method": "POST", "exists": checks["archive_route"]},
                "assistant": {"path": contract.assistant_route, "method": "GET", "exists": checks["assistant_route"]},
            },
            "sync": {
                "source_table": contract.sync_table,
                "outer_hook_supported": checks["outer_sync_supported"],
                "child_sync_supported": checks["child_sync_supported"],
                "timeline_visible": contract.timeline_visible,
                "assistant_readable": contract.assistant_readable,
                "ofsted_relevant": contract.ofsted_relevant,
            },
            "checks": checks,
            "status": workflow_status(checks),
            "missing": [key for key, ok in checks.items() if not ok and key != "archive_route"],
        }

    status_counts: dict[str, int] = {}
    for item in workflows.values():
        status_counts[item["status"]] = status_counts.get(item["status"], 0) + 1

    return {
        "ok": True,
        "summary": {
            "workflow_count": len(workflows),
            "status_counts": status_counts,
            "needs_attention": [key for key, item in workflows.items() if item["status"] != "wired"],
        },
        "workflows": workflows,
        "route_index_size": len(route_index),
    }

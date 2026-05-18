from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI

from services.os_workflow_wiring_audit_service import (
    WORKFLOW_CONTRACTS,
    WorkflowContract,
    build_route_index,
    route_exists,
)


@dataclass(frozen=True)
class GoldStandardAction:
    key: str
    label: str
    method: str
    route_template: str | None
    required: bool = True


@dataclass(frozen=True)
class GoldStandardWorkflow:
    record_type: str
    lifecycle_required: bool = True
    archive_list_required: bool = True
    explicit_os_sync_required: bool = True
    full_item_response_required: bool = True
    notes: str = ""


GOLD_STANDARD_WORKFLOWS: dict[str, GoldStandardWorkflow] = {
    "daily_note": GoldStandardWorkflow("daily_note", notes="Reference workflow; all routes should remain green."),
    "incident": GoldStandardWorkflow("incident"),
    "risk": GoldStandardWorkflow("risk"),
    "support_plan": GoldStandardWorkflow("support_plan"),
    "keywork": GoldStandardWorkflow("keywork"),
    "health_record": GoldStandardWorkflow(
        "health_record",
        lifecycle_required=True,
        archive_list_required=True,
        notes="Health records need manager-review lifecycle parity even if current route family is health-specific.",
    ),
    "medication_record": GoldStandardWorkflow(
        "medication_record",
        lifecycle_required=True,
        archive_list_required=True,
        notes="Medication administrations should have review/return/archive parity for refusal, omission or error workflows.",
    ),
    "education_record": GoldStandardWorkflow("education_record"),
    "family_contact": GoldStandardWorkflow("family_contact"),
    "appointment": GoldStandardWorkflow(
        "appointment",
        lifecycle_required=True,
        archive_list_required=True,
        notes="Appointments currently have complete/cancel; gold standard also expects review lifecycle or explicit exception.",
    ),
    "missing_episode": GoldStandardWorkflow(
        "missing_episode",
        lifecycle_required=True,
        archive_list_required=True,
        notes="Missing episodes have their own state machine; compatibility routes should still expose gold-standard child shell actions or documented exceptions.",
    ),
    "safeguarding_record": GoldStandardWorkflow("safeguarding_record"),
    "handover_record": GoldStandardWorkflow("handover_record"),
    "document": GoldStandardWorkflow(
        "document",
        lifecycle_required=True,
        archive_list_required=True,
        notes="Documents should support sign-off/review/archive rather than being passive uploads.",
    ),
    "statutory_document": GoldStandardWorkflow(
        "statutory_document",
        lifecycle_required=True,
        archive_list_required=True,
        notes="Statutory documents should have review/sign-off/archive parity.",
    ),
}


ROUTE_OVERRIDES: dict[str, dict[str, str]] = {
    "daily_note": {"item": "/young-people/daily-notes/{record_id}"},
    "incident": {"item": "/young-people/incidents/{record_id}"},
    "risk": {"item": "/young-people/risk/{record_id}"},
    "support_plan": {"item": "/young-people/plans/{record_id}"},
    "keywork": {"item": "/young-people/keywork/{record_id}"},
    "health_record": {"item": "/young-people/health-records/{record_id}"},
    "medication_record": {"item": "/young-people/medication-records/{record_id}"},
    "education_record": {"item": "/young-people/education-records/{record_id}"},
    "family_contact": {"item": "/young-people/family/records/{record_id}"},
    "appointment": {"item": "/young-people/appointments/{record_id}"},
    "missing_episode": {"item": "/young-people/missing-episodes/{record_id}"},
    "safeguarding_record": {"item": "/young-people/safeguarding/{record_id}"},
    "handover_record": {"item": "/young-people/handover/{record_id}"},
    "document": {"item": "/young-people/documents/{record_id}"},
    "statutory_document": {"item": "/young-people/statutory-documents/{record_id}"},
}


def _archive_list_route(contract: WorkflowContract) -> str:
    base = str(contract.list_route).rstrip("/")
    return f"{base}/archive"


def _item_route(contract: WorkflowContract) -> str | None:
    override = ROUTE_OVERRIDES.get(contract.record_type, {}).get("item")
    return override or contract.get_route


def _gold_standard_actions(contract: WorkflowContract) -> tuple[GoldStandardAction, ...]:
    item = _item_route(contract)
    return (
        GoldStandardAction("list_active", "List active", "GET", contract.list_route),
        GoldStandardAction("list_archive", "List archive", "GET", _archive_list_route(contract)),
        GoldStandardAction("get", "Get one", "GET", item),
        GoldStandardAction("create", "Create", "POST", contract.create_route),
        GoldStandardAction("patch", "Patch/update", "PATCH", item),
        GoldStandardAction("replace", "Put/update", "PUT", item, required=False),
        GoldStandardAction("submit", "Submit", "POST", f"{item}/submit" if item else None),
        GoldStandardAction("approve", "Approve", "POST", f"{item}/approve" if item else None),
        GoldStandardAction("return", "Return", "POST", f"{item}/return" if item else None),
        GoldStandardAction("archive", "Archive", "POST", f"{item}/archive" if item else None),
    )


def _action_exists(route_index: dict[str, set[str]], action: GoldStandardAction) -> bool:
    if not action.route_template:
        return False
    if route_exists(route_index, action.route_template, action.method):
        return True
    if action.key in {"patch", "replace"}:
        return route_exists(route_index, action.route_template, "PATCH") or route_exists(route_index, action.route_template, "PUT")
    return False


def _score(actions: list[dict[str, Any]], *, workflow: GoldStandardWorkflow) -> dict[str, Any]:
    required_actions = [item for item in actions if item["required"]]
    present = [item for item in required_actions if item["exists"]]
    total = len(required_actions)
    met = len(present)
    percentage = round((met / total) * 100) if total else 100

    if percentage == 100:
        status = "gold_standard"
    elif percentage >= 70:
        status = "near_standard"
    elif percentage >= 40:
        status = "partial"
    else:
        status = "below_standard"

    return {
        "met": met,
        "total": total,
        "percentage": percentage,
        "status": status,
        "requires_full_item_response": workflow.full_item_response_required,
        "requires_explicit_sync_result": workflow.explicit_os_sync_required,
    }


def audit_daily_note_gold_standard(app: FastAPI) -> dict[str, Any]:
    """Grade every child workflow against the daily-note workflow contract.

    This is route/capability coverage only. It intentionally does not claim that
    services return the correct body shape until the next service-level audit is
    added. The result makes the gaps visible so we can patch workflows in order.
    """

    route_index = build_route_index(app)
    workflows: dict[str, Any] = {}

    for contract in WORKFLOW_CONTRACTS:
        workflow = GOLD_STANDARD_WORKFLOWS.get(contract.record_type) or GoldStandardWorkflow(contract.record_type)
        actions: list[dict[str, Any]] = []

        for action in _gold_standard_actions(contract):
            required = action.required
            if action.key in {"submit", "approve", "return"} and not workflow.lifecycle_required:
                required = False
            if action.key == "list_archive" and not workflow.archive_list_required:
                required = False

            exists = _action_exists(route_index, action)
            actions.append(
                {
                    "key": action.key,
                    "label": action.label,
                    "method": action.method,
                    "route": action.route_template,
                    "required": required,
                    "exists": exists,
                }
            )

        result = _score(actions, workflow=workflow)
        missing_required = [item for item in actions if item["required"] and not item["exists"]]
        workflows[contract.record_type] = {
            "record_type": contract.record_type,
            "label": contract.label,
            "table": contract.table,
            "section": contract.section,
            "score": result,
            "actions": actions,
            "missing_required_actions": missing_required,
            "gold_standard_notes": workflow.notes,
        }

    status_counts: dict[str, int] = {}
    for item in workflows.values():
        status = item["score"]["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "ok": True,
        "standard": "daily_note_gold_standard",
        "reference_workflow": "daily_note",
        "requirements": {
            "route_capability": [
                "list_active",
                "list_archive",
                "get",
                "create",
                "patch_or_put",
                "submit",
                "approve",
                "return",
                "archive",
            ],
            "service_capability": [
                "role_checks",
                "home_access_checks",
                "workflow_status_handling",
                "postgres_write",
                "linking_service",
                "os_sync",
                "full_saved_item_response",
                "explicit_sync_result",
            ],
        },
        "summary": {
            "workflow_count": len(workflows),
            "status_counts": status_counts,
            "needs_upgrade": [
                key for key, item in workflows.items() if item["score"]["status"] != "gold_standard"
            ],
        },
        "workflows": workflows,
    }

"""Founder OS persistence — founder/admin only API for command centre records."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.permissions import require_founder
from db.founder_persistence_db import (
    append_audit_log,
    create_record,
    delete_record,
    get_record,
    list_audit_log,
    list_records,
    sanitise_payload,
    update_record,
)
from schemas.founder_persistence import (
    FounderApprovalDecision,
    FounderAuditCreate,
    FounderRecordCreate,
    FounderRecordUpdate,
)

router = APIRouter(prefix="/founder-os/persistence", tags=["Founder Persistence"])

ENTITY_ALIASES: dict[str, str] = {
    "actions": "action",
    "action": "action",
    "approvals": "approval",
    "approval": "approval",
    "content": "content",
    "content-drafts": "content",
    "build-briefs": "build_brief",
    "build_briefs": "build_brief",
    "staff-team-runs": "staff_team_run",
    "staff_team_runs": "staff_team_run",
    "agent-runs": "agent_run",
    "agent_runs": "agent_run",
    "operating-loop-runs": "operating_loop_run",
    "operating_loop_runs": "operating_loop_run",
    "quality-runs": "quality_run",
    "quality_runs": "quality_run",
    "quality-results": "quality_result",
    "quality_results": "quality_result",
    "quality-proposals": "quality_proposal",
    "quality_proposals": "quality_proposal",
    "expert-reviews": "expert_review",
    "expert_reviews": "expert_review",
    "safety-reviews": "safety_review",
    "safety_reviews": "safety_review",
    "memories": "founder_memory",
    "memory": "founder_memory",
    "evidence-packs": "evidence_pack",
    "evidence_packs": "evidence_pack",
}


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": sanitise_payload(data)}


def _actor(user: dict[str, Any]) -> str:
    email = user.get("email") or "founder"
    return str(email)


def _user_id(user: dict[str, Any]) -> int:
    return int(user.get("id") or 0)


def _resolve_entity(slug: str) -> str:
    entity = ENTITY_ALIASES.get(slug, slug)
    if entity not in set(ENTITY_ALIASES.values()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown entity type")
    return entity


@router.get("/audit-log")
async def founder_audit_log(
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_founder),
):
    resolved = _resolve_entity(entity_type) if entity_type else None
    rows = await list_audit_log(
        user_id=_user_id(user),
        entity_type=resolved,
        limit=limit,
        offset=offset,
    )
    return _success({"items": rows, "count": len(rows)})


@router.post("/audit-log")
async def founder_audit_log_create(body: FounderAuditCreate, user=Depends(require_founder)):
    row = await append_audit_log(
        user_id=_user_id(user),
        actor=_actor(user),
        event_type=body.event_type,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        summary=body.summary,
        status=body.status,
        metadata=body.metadata,
        linked_entity_id=body.linked_entity_id,
        linked_entity_type=body.linked_entity_type,
    )
    return _success(row)


@router.get("/{entity_slug}")
async def founder_list_records(
    entity_slug: str,
    status: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_founder),
):
    entity_type = _resolve_entity(entity_slug)
    rows = await list_records(
        user_id=_user_id(user),
        entity_type=entity_type,
        status=status,
        limit=limit,
        offset=offset,
    )
    return _success({"items": rows, "count": len(rows)})


@router.post("/{entity_slug}")
async def founder_create_record(
    entity_slug: str,
    body: FounderRecordCreate,
    user=Depends(require_founder),
):
    entity_type = _resolve_entity(entity_slug)
    record = await create_record(
        user_id=_user_id(user),
        entity_type=entity_type,
        record=body.record,
        actor=_actor(user),
        source=body.source,
    )
    await append_audit_log(
        user_id=_user_id(user),
        actor=_actor(user),
        event_type="created",
        entity_type=entity_type,
        entity_id=str(record.get("id")),
        summary=f"Created {entity_type.replace('_', ' ')} record",
        status=record.get("status"),
    )
    return _success(record)


@router.get("/{entity_slug}/{record_id}")
async def founder_get_record(
    entity_slug: str,
    record_id: str,
    user=Depends(require_founder),
):
    entity_type = _resolve_entity(entity_slug)
    record = await get_record(user_id=_user_id(user), entity_type=entity_type, record_id=record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return _success(record)


@router.patch("/{entity_slug}/{record_id}")
async def founder_update_record(
    entity_slug: str,
    record_id: str,
    body: FounderRecordUpdate,
    user=Depends(require_founder),
):
    entity_type = _resolve_entity(entity_slug)
    patch = {**body.patch}
    if body.status is not None:
        patch["status"] = body.status
    record = await update_record(
        user_id=_user_id(user),
        entity_type=entity_type,
        record_id=record_id,
        patch=patch,
        actor=_actor(user),
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    await append_audit_log(
        user_id=_user_id(user),
        actor=_actor(user),
        event_type="updated",
        entity_type=entity_type,
        entity_id=record_id,
        summary=f"Updated {entity_type.replace('_', ' ')} record",
        status=record.get("status"),
    )
    return _success(record)


@router.post("/approvals/{record_id}/decision")
async def founder_approval_decision(
    record_id: str,
    body: FounderApprovalDecision,
    user=Depends(require_founder),
):
    entity_type = "approval"
    existing = await get_record(user_id=_user_id(user), entity_type=entity_type, record_id=record_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    actor = _actor(user)
    patch: dict[str, Any] = {"status": body.status}
    if body.founder_note:
        patch["founderNote"] = body.founder_note

    if body.status == "approved":
        patch["approvedAt"] = now
        patch["approvedBy"] = actor
        event_type = "approved"
    elif body.status == "rejected":
        patch["rejectedAt"] = now
        patch["rejectedBy"] = actor
        event_type = "rejected"
    elif body.status == "needs-changes":
        event_type = "needs_changes"
    else:
        event_type = "status_changed"

    if "item" in existing and isinstance(existing["item"], dict):
        patch["item"] = {**existing["item"], "status": body.status}
        if body.status == "approved":
            patch["item"]["approvedAt"] = now

    record = await update_record(
        user_id=_user_id(user),
        entity_type=entity_type,
        record_id=record_id,
        patch=patch,
        actor=actor,
    )
    await append_audit_log(
        user_id=_user_id(user),
        actor=actor,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=record_id,
        summary=f"Approval decision: {body.status}",
        status=body.status,
        metadata={"founderNote": body.founder_note} if body.founder_note else {},
    )
    return _success(record)


@router.delete("/{entity_slug}/{record_id}")
async def founder_delete_record(
    entity_slug: str,
    record_id: str,
    user=Depends(require_founder),
):
    entity_type = _resolve_entity(entity_slug)
    deleted = await delete_record(user_id=_user_id(user), entity_type=entity_type, record_id=record_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delete not permitted for this record type",
        )
    return _success({"deleted": True, "id": record_id})

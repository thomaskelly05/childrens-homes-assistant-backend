from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.young_people_linking_service import YoungPeopleLinkingService

router = APIRouter(prefix="/young-people", tags=["Young People Remaining Lifecycle Compat"])


@dataclass(frozen=True)
class LifecycleConfig:
    record_type: str
    table: str
    response_key: str
    title: str
    domain: str
    standard_codes: tuple[str, ...]
    judgement_areas: tuple[str, ...]


CONFIGS = {
    "health": LifecycleConfig(
        "health_record",
        "health_records",
        "health_record",
        "Health record",
        "health",
        ("reg_10_health_and_wellbeing",),
        ("health_and_wellbeing",),
    ),
    "medication": LifecycleConfig(
        "medication_record",
        "medication_records",
        "medication_record",
        "Medication record",
        "health",
        ("reg_10_health_and_wellbeing",),
        ("health_and_wellbeing",),
    ),
    "education": LifecycleConfig(
        "education_record",
        "education_records",
        "education_record",
        "Education record",
        "education",
        ("reg_8_education",),
        ("education",),
    ),
    "family": LifecycleConfig(
        "family_contact",
        "family_contact_records",
        "family_contact",
        "Family contact record",
        "family",
        ("reg_11_positive_relationships",),
        ("positive_relationships",),
    ),
}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id") or current_user.get("sub"))


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_can_review(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review this record")


def _ensure_lifecycle_columns(conn, table: str) -> None:
    with conn.cursor() as cur:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'draft'")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS manager_review_comment TEXT")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS approved_by INTEGER")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()")
    conn.commit()


def _shape(config: LifecycleConfig, row: dict[str, Any] | None) -> dict[str, Any]:
    item = dict(row or {})
    item.setdefault("record_type", config.record_type)
    item.setdefault("title", item.get("title") or item.get("medication_name") or item.get("provision_name") or item.get("contact_person") or config.title)
    item.setdefault("summary", item.get("summary") or item.get("outcome") or item.get("achievement_note") or item.get("concerns") or item.get("error_details") or item.get("title") or config.title)
    item.setdefault("workflow_status", item.get("workflow_status") or item.get("status") or "draft")
    item.setdefault("status", item.get("status") or item.get("workflow_status") or "draft")
    item.setdefault("recorded_at", item.get("record_date") or item.get("administered_time") or item.get("contact_datetime") or item.get("event_datetime") or item.get("created_at") or item.get("updated_at"))
    return item


def _load(conn, config: LifecycleConfig, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    _ensure_lifecycle_columns(conn, config.table)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT r.*, yp.home_id
            FROM {config.table} r
            JOIN young_people yp ON yp.id = r.young_person_id
            WHERE r.id = %s
            LIMIT 1
            """,
            (record_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"{config.title} not found")
    item = _shape(config, dict(row))
    if _role(current_user) not in {"admin", "provider_admin"}:
        if _safe_int(current_user.get("home_id")) != _safe_int(item.get("home_id")):
            raise HTTPException(status_code=403, detail="You do not have access to this young person")
    return item


def _list_archive(conn, config: LifecycleConfig, young_person_id: int, current_user: dict[str, Any]) -> list[dict[str, Any]]:
    _ensure_lifecycle_columns(conn, config.table)
    with conn.cursor() as cur:
        cur.execute("SELECT id, home_id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
        yp = cur.fetchone()
    if not yp:
        raise HTTPException(status_code=404, detail="Young person not found")
    if _role(current_user) not in {"admin", "provider_admin"}:
        if _safe_int(current_user.get("home_id")) != _safe_int(dict(yp).get("home_id")):
            raise HTTPException(status_code=403, detail="You do not have access to this young person")
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT *
            FROM {config.table}
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = TRUE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            """,
            (young_person_id,),
        )
        rows = cur.fetchall() or []
    return [_shape(config, dict(row)) for row in rows]


def _transition(conn, config: LifecycleConfig, record_id: int, status: str, current_user: dict[str, Any], note: str | None = None) -> dict[str, Any]:
    _ensure_lifecycle_columns(conn, config.table)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE {config.table}
            SET status = %s,
                workflow_status = %s,
                archived = CASE WHEN %s = 'archived' THEN TRUE ELSE COALESCE(archived, FALSE) END,
                manager_review_comment = COALESCE(%s, manager_review_comment),
                approved_by = CASE WHEN %s = 'approved' THEN %s ELSE approved_by END,
                reviewed_at = CASE WHEN %s IN ('approved', 'returned') THEN NOW() ELSE reviewed_at END,
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (status, status, status, note, status, _actor_id(current_user), status, record_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"{config.title} not found")
    conn.commit()
    return _shape(config, dict(row))


def _sync(config: LifecycleConfig, item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save(config.table, item)
        return {"attempted": True, "ok": bool(ok), "source_table": config.table}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": config.table, "error": str(error)}


def _link(conn, config: LifecycleConfig, item: dict[str, Any], status: str, current_user: dict[str, Any]) -> dict[str, Any]:
    review_required = status in {"submitted", "returned"}
    archived = status == "archived"
    summary = item.get("summary") or item.get("title") or f"{config.title} {status}"
    narrative = "\n".join(
        str(value)
        for value in [
            item.get("summary"),
            item.get("outcome"),
            item.get("achievement_note"),
            item.get("concerns"),
            item.get("error_details"),
            item.get("manager_review_comment"),
        ]
        if value
    ) or summary
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(item["young_person_id"]),
        source_table=config.table,
        source_id=int(item["id"]),
        event_type=status,
        title=f"{config.title} {status}: {item.get('title') or config.title}",
        summary=summary,
        narrative=narrative,
        category=config.domain,
        subcategory=config.record_type,
        significance="high" if review_required else "medium",
        review_date=item.get("review_date") or item.get("next_action_date") or item.get("due_date"),
        due_date=item.get("next_action_date") or item.get("due_date") or item.get("review_date"),
        owner_id=item.get("created_by"),
        created_by=_actor_id(current_user),
        workflow={
            "link_chronology": not archived,
            "create_task": review_required,
            "manager_review": review_required or status == "approved",
            "safeguarding": config.record_type == "medication_record" and bool(item.get("error_flag")),
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "workflow_status": status,
            "domain": config.domain,
            "record_type": config.record_type,
            "quality_standards": list(config.standard_codes),
            "judgement_areas": list(config.judgement_areas),
            "standards_rationale": f"Linked from {config.title.lower()} lifecycle transition",
            "evidence_strength": "high" if review_required else "medium",
            "response_actions": item.get("manager_review_comment"),
        },
    )
    return workflow


def _response(
    config: LifecycleConfig,
    *,
    item: dict[str, Any],
    message: str,
    sync: dict[str, Any] | None = None,
    workflow: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {"workflow_status": item.get("workflow_status"), "status": item.get("status")},
        sync=sync or {},
        **{config.response_key: item},
    )


def _note(payload: dict[str, Any] | None) -> str | None:
    if not isinstance(payload, dict):
        return None
    return payload.get("review_note") or payload.get("manager_review_comment") or payload.get("note")


def _transition_endpoint(config_key: str, record_id: int, status: str, payload: dict[str, Any] | None, current_user: dict[str, Any], conn) -> dict[str, Any]:
    config = CONFIGS[config_key]
    if status in {"approved", "returned", "archived"}:
        _assert_can_review(current_user)
    else:
        _assert_can_edit(current_user)
    _load(conn, config, record_id, current_user)
    item = _transition(conn, config, record_id, status, current_user, _note(payload))
    workflow = _link(conn, config, item, status, current_user)
    sync = _sync(config, item)
    return _response(config, item=item, message=f"{config.title} {status}", sync=sync, workflow=workflow)


@router.get("/{young_person_id}/education/archive")
def list_education_archive(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    rows = _list_archive(conn, CONFIGS["education"], young_person_id, current_user)
    return {"ok": True, "items": rows, "education_records": rows, "count": len(rows)}


@router.get("/{young_person_id}/family/archive")
def list_family_archive(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    rows = _list_archive(conn, CONFIGS["family"], young_person_id, current_user)
    return {"ok": True, "items": rows, "family_contact_records": rows, "count": len(rows)}


@router.post("/health-records/{record_id}/submit")
@router.put("/health-records/{record_id}/submit")
def submit_health(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("health", record_id, "submitted", payload, current_user, conn)


@router.post("/health-records/{record_id}/approve")
@router.put("/health-records/{record_id}/approve")
def approve_health(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("health", record_id, "approved", payload, current_user, conn)


@router.post("/health-records/{record_id}/return")
@router.put("/health-records/{record_id}/return")
def return_health(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("health", record_id, "returned", payload, current_user, conn)


@router.post("/health-records/{record_id}/archive")
@router.put("/health-records/{record_id}/archive")
def archive_health(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("health", record_id, "archived", payload, current_user, conn)


@router.post("/medication-records/{record_id}/submit")
@router.put("/medication-records/{record_id}/submit")
def submit_medication(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("medication", record_id, "submitted", payload, current_user, conn)


@router.post("/medication-records/{record_id}/approve")
@router.put("/medication-records/{record_id}/approve")
def approve_medication(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("medication", record_id, "approved", payload, current_user, conn)


@router.post("/medication-records/{record_id}/return")
@router.put("/medication-records/{record_id}/return")
def return_medication(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("medication", record_id, "returned", payload, current_user, conn)


@router.post("/medication-records/{record_id}/archive")
@router.put("/medication-records/{record_id}/archive")
def archive_medication(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("medication", record_id, "archived", payload, current_user, conn)


@router.post("/education-records/{record_id}/submit")
@router.put("/education-records/{record_id}/submit")
def submit_education(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("education", record_id, "submitted", payload, current_user, conn)


@router.post("/education-records/{record_id}/approve")
@router.put("/education-records/{record_id}/approve")
def approve_education(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("education", record_id, "approved", payload, current_user, conn)


@router.post("/education-records/{record_id}/return")
@router.put("/education-records/{record_id}/return")
def return_education(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("education", record_id, "returned", payload, current_user, conn)


@router.post("/education-records/{record_id}/archive")
@router.put("/education-records/{record_id}/archive")
def archive_education(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("education", record_id, "archived", payload, current_user, conn)


@router.post("/family/records/{record_id}/submit")
@router.put("/family/records/{record_id}/submit")
def submit_family(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("family", record_id, "submitted", payload, current_user, conn)


@router.post("/family/records/{record_id}/approve")
@router.put("/family/records/{record_id}/approve")
def approve_family(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("family", record_id, "approved", payload, current_user, conn)


@router.post("/family/records/{record_id}/return")
@router.put("/family/records/{record_id}/return")
def return_family(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("family", record_id, "returned", payload, current_user, conn)


@router.post("/family/records/{record_id}/archive")
@router.put("/family/records/{record_id}/archive")
def archive_family(record_id: int, payload: dict[str, Any] | None = Body(default=None), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return _transition_endpoint("family", record_id, "archived", payload, current_user, conn)

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.current_user import get_current_user
from db.connection import get_db
from services.assistant_context_service import (
    build_home_os_context,
    build_quality_os_context,
)

router = APIRouter(tags=["Home and Inspection Compatibility"])

PROVIDER_LEVEL_ROLES = {
    "admin",
    "provider_admin",
    "ri",
    "responsible_individual",
    "super_admin",
    "administrator",
    "superadmin",
}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _safe_list(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def _normalise_status(value: Any) -> str:
    return _safe_text(value).lower().replace(" ", "_")


def _normalise_priority(value: Any) -> str:
    return _safe_text(value).lower().replace(" ", "_")


def _is_provider_level_role(role: str) -> bool:
    return role in PROVIDER_LEVEL_ROLES


def _user_id(current_user: dict[str, Any]) -> int:
    parsed = _safe_int(current_user.get("user_id") or current_user.get("id"))
    if parsed is None:
        raise HTTPException(status_code=401, detail="User could not be identified")
    return parsed


def _user_role(current_user: dict[str, Any]) -> str:
    return _safe_text(current_user.get("role")).lower()


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _resolve_provider_id(conn, current_user: dict[str, Any]) -> int | None:
    provider_id = _safe_int(current_user.get("provider_id"))
    if provider_id is not None:
        return provider_id

    user_home_id = _user_home_id(current_user)
    if user_home_id is None:
        return None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT provider_id
            FROM homes
            WHERE id = %s
            LIMIT 1
            """,
            (user_home_id,),
        )
        row = cur.fetchone()

    return _safe_int((row or {}).get("provider_id"))


def _resolve_provider_home_ids(conn, current_user: dict[str, Any]) -> list[int]:
    provider_id = _resolve_provider_id(conn, current_user)
    if provider_id is None:
        return []

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM homes
            WHERE provider_id = %s
            ORDER BY name ASC, id ASC
            LIMIT 200
            """,
            (provider_id,),
        )
        rows = cur.fetchall() or []

    home_ids: list[int] = []
    for row in rows:
        parsed = _safe_int((row or {}).get("id"))
        if parsed is not None:
            home_ids.append(parsed)
    return home_ids


def _build_home_context(conn, current_user: dict[str, Any], home_id: int) -> dict[str, Any]:
    scope = {
        "scope_type": "home",
        "scope": "home",
        "home_id": home_id,
    }
    try:
        return build_home_os_context(
            conn,
            user_id=_user_id(current_user),
            scope=scope,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _build_quality_context(
    conn,
    current_user: dict[str, Any],
    *,
    home_id: int | None = None,
    all_accessible_homes: bool = False,
) -> dict[str, Any]:
    role = _user_role(current_user)
    access_level = "provider" if _is_provider_level_role(role) else "home"

    allowed_home_ids: list[int] = []
    if home_id is not None:
        allowed_home_ids = [home_id]
    elif access_level == "provider" and all_accessible_homes:
        allowed_home_ids = _resolve_provider_home_ids(conn, current_user)
    elif _user_home_id(current_user) is not None:
        allowed_home_ids = [_user_home_id(current_user)]  # type: ignore[list-item]

    scope = {
        "scope_type": "quality",
        "scope": "quality",
        "home_id": home_id,
        "access_level": access_level,
        "allowed_home_ids": allowed_home_ids,
    }

    try:
        return build_quality_os_context(
            conn,
            user_id=_user_id(current_user),
            scope=scope,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _filter_home_rows(items: list[dict[str, Any]], home_id: int) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in items:
        item_home_id = _safe_int(item.get("home_id"))
        if item_home_id is None or item_home_id == home_id:
            result.append(item)
    return result


def _build_compliance_items(home_ctx: dict[str, Any]) -> list[dict[str, Any]]:
    tasks = _safe_list(home_ctx.get("tasks"))
    documents = _safe_list(home_ctx.get("documents"))
    compliance_items: list[dict[str, Any]] = []

    for task in tasks:
        if task.get("compliance_generated") or _normalise_priority(task.get("priority")) in {
            "high",
            "critical",
        }:
            compliance_items.append(
                {
                    **task,
                    "record_type": task.get("record_type") or "compliance_item",
                    "title": task.get("title") or task.get("task") or "Compliance task",
                    "severity": task.get("severity")
                    or (
                        "high"
                        if _normalise_priority(task.get("priority")) in {"high", "critical"}
                        else "medium"
                    ),
                }
            )

    for document in documents:
        status = _normalise_status(document.get("status"))
        if status in {"overdue", "review_due", "due_soon", "expired", "missing"}:
            compliance_items.append(
                {
                    **document,
                    "record_type": document.get("record_type") or "compliance_item",
                    "title": document.get("title")
                    or document.get("document_type")
                    or "Statutory document",
                    "severity": "high" if status in {"overdue", "expired", "missing"} else "medium",
                    "due_date": document.get("review_date") or document.get("expiry_date"),
                }
            )

    return compliance_items


def _build_notifications(
    *,
    tasks: list[dict[str, Any]],
    compliance_items: list[dict[str, Any]],
    inspection_actions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    notifications: list[dict[str, Any]] = []

    for task in tasks:
        status = _normalise_status(task.get("status"))
        if status in {"overdue", "escalated", "due_soon"}:
            notifications.append(
                {
                    "id": f"task-{task.get('id')}",
                    "notification_type": "task",
                    "title": task.get("title") or task.get("task") or "Task alert",
                    "status": status,
                    "priority": _normalise_priority(task.get("priority")) or "medium",
                    "due_date": task.get("due_date"),
                    "summary": task.get("summary")
                    or task.get("description")
                    or "Task requires attention.",
                    "owner_user_name": task.get("owner_user_name") or task.get("assigned_role"),
                }
            )

    for item in compliance_items:
        status = _normalise_status(item.get("status"))
        if status in {"overdue", "review_due", "due_soon", "expired", "missing"}:
            notifications.append(
                {
                    "id": f"compliance-{item.get('id')}",
                    "notification_type": "compliance",
                    "title": item.get("title") or "Compliance alert",
                    "status": status,
                    "priority": _normalise_priority(item.get("severity")) or "high",
                    "due_date": item.get("due_date")
                    or item.get("review_date")
                    or item.get("expiry_date"),
                    "summary": item.get("summary") or "Compliance item requires attention.",
                    "owner_user_name": item.get("owner_user_name") or item.get("owner_staff_name"),
                }
            )

    for action in inspection_actions:
        status = _normalise_status(action.get("status"))
        if status in {"open", "in_progress", "overdue", "escalated"}:
            notifications.append(
                {
                    "id": f"inspection-action-{action.get('id')}",
                    "notification_type": "inspection_action",
                    "title": action.get("action_title")
                    or action.get("title")
                    or "Inspection improvement action",
                    "status": status,
                    "priority": _normalise_priority(action.get("priority")) or "high",
                    "due_date": action.get("due_date"),
                    "summary": action.get("action_description")
                    or action.get("summary")
                    or "Inspection action requires follow-up.",
                    "owner_user_name": action.get("owner_user_name")
                    or action.get("owner_staff_name"),
                }
            )

    notifications.sort(
        key=lambda row: (
            row.get("due_date") is None,
            _safe_text(row.get("due_date")),
            _safe_text(row.get("title")),
        )
    )
    return notifications[:100]


def _normalise_section_code(value: Any) -> str:
    token = _safe_text(value).lower().replace("-", "_").replace(" ", "_")
    if "experience" in token or "progress" in token:
        return "experiences"
    if "help" in token or "protect" in token or "safeguard" in token:
        return "helped"
    if "leader" in token or "manage" in token:
        return "leadership"
    return token or "overall"


def _section_name_from_code(code: str) -> str:
    if code == "experiences":
        return "Experiences and progress"
    if code == "helped":
        return "Help and protection"
    if code == "leadership":
        return "Leadership and management"
    return code.replace("_", " ").title() if code else "Inspection section"


def _score_from_header(header: dict[str, Any], code: str) -> tuple[Any, Any]:
    if code == "experiences":
        return header.get("experiences_score"), header.get("experiences_band")
    if code == "helped":
        return header.get("helped_score"), header.get("helped_band")
    if code == "leadership":
        return header.get("leadership_score"), header.get("leadership_band")
    return header.get("overall_score"), header.get("overall_band")


def _build_inspection_sections(
    *,
    home_id: int,
    header: dict[str, Any],
    reasons: list[dict[str, Any]],
    actions: list[dict[str, Any]],
    lines: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "home_id": home_id,
            "section_code": "overall",
            "section_name": "Overall",
            "reasons": [],
            "actions": [],
            "lines": [],
        }
    )

    for row in reasons:
        code = _normalise_section_code(row.get("section_code") or row.get("section_name"))
        bucket = buckets[code]
        bucket["section_code"] = code
        bucket["section_name"] = row.get("section_name") or _section_name_from_code(code)
        bucket["reasons"].append(row)

    for row in actions:
        code = _normalise_section_code(row.get("section_code") or row.get("section_name"))
        bucket = buckets[code]
        bucket["section_code"] = code
        bucket["section_name"] = row.get("section_name") or _section_name_from_code(code)
        bucket["actions"].append(row)

    for row in lines:
        code = _normalise_section_code(row.get("section_code") or row.get("section_name"))
        bucket = buckets[code]
        bucket["section_code"] = code
        bucket["section_name"] = row.get("section_name") or _section_name_from_code(code)
        bucket["lines"].append(row)

    sections: list[dict[str, Any]] = []
    for code, bucket in buckets.items():
        score_value, score_band = _score_from_header(header, code)
        first_reason = bucket["reasons"][0] if bucket["reasons"] else {}
        concern_text = _safe_text(
            first_reason.get("description")
            or first_reason.get("evidence_excerpt")
            or header.get("concerns_summary")
        )
        strength_text = _safe_text(header.get("strengths_summary"))
        summary_text = concern_text or strength_text or _safe_text(header.get("narrative_summary"))

        sections.append(
            {
                "home_id": home_id,
                "section_code": code,
                "section_name": bucket["section_name"],
                "score_band": score_band,
                "score_value": score_value,
                "summary_text": summary_text,
                "strengths_text": strength_text,
                "concerns_text": concern_text,
                "descriptor_summary": _safe_text(header.get("narrative_summary")),
                "open_actions": len(bucket["actions"]),
                "reasons_count": len(bucket["reasons"]),
                "lines_count": len(bucket["lines"]),
            }
        )

    sections.sort(key=lambda row: _safe_text(row.get("section_name")))
    return sections


def _build_inspection_tasks(
    *,
    home_id: int,
    actions: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    derived: list[dict[str, Any]] = []

    for action in actions:
        status = _normalise_status(action.get("status"))
        derived.append(
            {
                "id": action.get("linked_task_id") or action.get("id"),
                "task_id": action.get("linked_task_id") or action.get("id"),
                "home_id": home_id,
                "action_id": action.get("id"),
                "action_title": action.get("action_title") or action.get("title"),
                "task_title": action.get("action_title") or action.get("title"),
                "task_due_date": action.get("due_date"),
                "action_due_date": action.get("due_date"),
                "assigned_user_name": action.get("owner_user_name")
                or action.get("owner_staff_name"),
                "assigned_role": action.get("owner_role"),
                "completed": status in {"completed", "closed", "resolved"},
                "status": action.get("status") or "open",
                "task_created_at": action.get("created_at") or action.get("updated_at"),
            }
        )

    for task in tasks:
        if task.get("compliance_generated") or _normalise_priority(task.get("priority")) in {
            "high",
            "critical",
        }:
            status = _normalise_status(task.get("status"))
            derived.append(
                {
                    "id": task.get("id"),
                    "task_id": task.get("id"),
                    "home_id": home_id,
                    "action_id": None,
                    "action_title": task.get("title") or task.get("task"),
                    "task_title": task.get("title") or task.get("task"),
                    "task_due_date": task.get("due_date"),
                    "action_due_date": task.get("due_date"),
                    "assigned_user_name": task.get("owner_user_name"),
                    "assigned_role": task.get("assigned_role"),
                    "completed": status in {"completed", "closed", "resolved"},
                    "status": task.get("status") or "open",
                    "task_created_at": task.get("created_at") or task.get("updated_at"),
                }
            )

    deduped: dict[str, dict[str, Any]] = {}
    for row in derived:
        key = f"{row.get('task_id')}-{row.get('action_id')}-{row.get('task_title')}"
        deduped[key] = row
    return list(deduped.values())


def _build_inspection_briefing(
    *,
    home_id: int,
    home_name: str,
    header: dict[str, Any],
    reasons: list[dict[str, Any]],
    actions: list[dict[str, Any]],
) -> dict[str, Any]:
    top_reason = reasons[0] if reasons else {}
    open_actions = [
        action
        for action in actions
        if _normalise_status(action.get("status")) not in {"completed", "closed", "resolved"}
    ]
    top_open_action = open_actions[0] if open_actions else {}

    return {
        "home_id": home_id,
        "home_name": home_name,
        "headline_summary": _safe_text(
            header.get("headline_summary")
            or header.get("narrative_summary")
            or f"{home_name} remains broadly stable with focused improvement priorities."
        ),
        "overall_position_statement": _safe_text(
            header.get("overall_position_statement")
            or header.get("strengths_summary")
            or "The home shows evidence of stable care with specific actions still in progress."
        ),
        "likely_inspector_focus": _safe_text(
            header.get("likely_inspector_focus")
            or top_reason.get("title")
            or top_reason.get("description")
            or "Inspectors are likely to focus on action closure and evidence quality."
        ),
        "immediate_priority_actions": _safe_text(
            header.get("immediate_priority_actions")
            or top_open_action.get("action_title")
            or "Close overdue high-priority actions and evidence the impact in records."
        ),
        "strengths_to_evidence": _safe_text(header.get("strengths_summary")),
        "risk_watchpoints": _safe_text(
            header.get("concerns_summary")
            or top_reason.get("description")
            or "Track overdue actions and refresh evidence where confidence is lower."
        ),
        "created_at": datetime.now(UTC).isoformat(),
    }


def _build_inspection_prep_72h(
    *,
    home_id: int,
    header: dict[str, Any],
    actions: list[dict[str, Any]],
    reasons: list[dict[str, Any]],
) -> dict[str, Any]:
    high_pressure_actions = [
        action
        for action in actions
        if _normalise_priority(action.get("priority")) in {"critical", "high"}
        or _normalise_status(action.get("status")) in {"overdue", "escalated"}
    ]
    pressure_level = "stable"
    if len(high_pressure_actions) >= 3:
        pressure_level = "high"
    elif high_pressure_actions:
        pressure_level = "heightened"

    primary_focus = _safe_text(
        (high_pressure_actions[0] if high_pressure_actions else {}).get("section_name")
        or (reasons[0] if reasons else {}).get("section_name")
        or "Leadership and management"
    )

    urgent_action_titles = [
        _safe_text(action.get("action_title") or action.get("title"))
        for action in high_pressure_actions[:3]
        if _safe_text(action.get("action_title") or action.get("title"))
    ]

    return {
        "home_id": home_id,
        "inspection_pressure_level": pressure_level,
        "primary_focus_area": primary_focus,
        "top_concerns": _safe_text(
            header.get("top_concerns")
            or (reasons[0] if reasons else {}).get("description")
            or "Evidence freshness and action closure require close attention."
        ),
        "urgent_actions": "; ".join(urgent_action_titles)
        or "Complete overdue actions and refresh weak evidence trails.",
        "key_evidence_to_pull": _safe_text(header.get("strengths_summary")),
        "likely_questions": _safe_text(
            "How do leaders track overdue actions and demonstrate sustained impact?"
        ),
        "created_at": datetime.now(UTC).isoformat(),
    }


def _build_inspection_bundle(
    *,
    home_id: int,
    home_ctx: dict[str, Any],
    quality_ctx: dict[str, Any],
) -> dict[str, Any]:
    home_name = _safe_text(
        (home_ctx.get("home") or {}).get("home_name")
        or (home_ctx.get("home") or {}).get("name")
        or (quality_ctx.get("homes") or [{}])[0].get("home_name")
        or f"Home {home_id}"
    )

    cards = _filter_home_rows(_safe_list(quality_ctx.get("inspection_cards")), home_id)
    header = cards[0] if cards else {"home_id": home_id, "home_name": home_name}
    reasons = _filter_home_rows(_safe_list(quality_ctx.get("inspection_reasons")), home_id)
    actions = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    lines = _filter_home_rows(_safe_list(quality_ctx.get("inspection_lines")), home_id)
    tasks = _build_inspection_tasks(
        home_id=home_id,
        actions=actions,
        tasks=_safe_list(home_ctx.get("tasks")),
    )
    sections = _build_inspection_sections(
        home_id=home_id,
        header=header,
        reasons=reasons,
        actions=actions,
        lines=lines,
    )
    briefing = _build_inspection_briefing(
        home_id=home_id,
        home_name=home_name,
        header=header,
        reasons=reasons,
        actions=actions,
    )
    prep72h = _build_inspection_prep_72h(
        home_id=home_id,
        header=header,
        actions=actions,
        reasons=reasons,
    )

    return {
        "home_id": home_id,
        "home_name": home_name,
        "cards": cards,
        "header": header,
        "sections": sections,
        "reasons": reasons,
        "actions": actions,
        "lines": lines,
        "tasks": tasks,
        "briefing": briefing,
        "prep72h": prep72h,
    }


def _home_dashboard_payload(home_ctx: dict[str, Any], quality_ctx: dict[str, Any]) -> dict[str, Any]:
    summary = dict(home_ctx.get("summary") or {})
    inspection_cards = _safe_list(quality_ctx.get("inspection_cards"))
    if inspection_cards:
        top_card = inspection_cards[0]
        summary.update(
            {
                "overall_band": top_card.get("overall_band"),
                "overall_score": top_card.get("overall_score"),
                "confidence_score": top_card.get("confidence_score"),
                "open_actions": top_card.get("open_actions", 0),
                "overdue_actions": top_card.get("overdue_actions", 0),
            }
        )

    return {
        "home": home_ctx.get("home") or {},
        "summary": summary,
        "young_people": _safe_list(home_ctx.get("young_people")),
        "items": _safe_list(home_ctx.get("young_people")),
    }


def _quality_payload(home_id: int, home_ctx: dict[str, Any], quality_ctx: dict[str, Any]) -> dict[str, Any]:
    inspection_cards = _filter_home_rows(_safe_list(quality_ctx.get("inspection_cards")), home_id)
    inspection_actions = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    inspection_reasons = _filter_home_rows(_safe_list(quality_ctx.get("inspection_reasons")), home_id)
    inspection_lines = _filter_home_rows(_safe_list(quality_ctx.get("inspection_lines")), home_id)
    audits = _filter_home_rows(_safe_list(quality_ctx.get("audits")), home_id)
    compliance_items = _filter_home_rows(
        _safe_list(quality_ctx.get("compliance_items")),
        home_id,
    ) or _build_compliance_items(home_ctx)

    return {
        "summary": {
            **(home_ctx.get("summary") or {}),
            "inspection_cards_count": len(inspection_cards),
            "inspection_actions_count": len(inspection_actions),
            "inspection_reasons_count": len(inspection_reasons),
            "inspection_lines_count": len(inspection_lines),
            "audits_count": len(audits),
            "compliance_count": len(compliance_items),
        },
        "items": audits or inspection_actions or inspection_reasons,
        "quality_audits": audits,
        "inspection_home_cards": inspection_cards,
        "inspection_actions": inspection_actions,
        "inspection_reasons": inspection_reasons,
        "inspection_lines": inspection_lines,
        "compliance_items": compliance_items,
    }


@router.get("/homes/{home_id}/dashboard")
def get_home_dashboard(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    return _home_dashboard_payload(home_ctx, quality_ctx)


@router.get("/homes/{home_id}/team")
def get_home_team(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    team = _safe_list(home_ctx.get("team"))
    return {"items": team, "team": team, "summary": {"count": len(team)}}


@router.get("/homes/{home_id}/staff")
def get_home_staff(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_team(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/tasks")
def get_home_tasks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    tasks = _safe_list(home_ctx.get("tasks"))
    return {"items": tasks, "tasks": tasks, "summary": {"count": len(tasks)}}


@router.get("/homes/{home_id}/appointments")
def get_home_appointments(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    appointments = _safe_list(home_ctx.get("evidence_index"))
    filtered = [
        item
        for item in appointments
        if _safe_text(item.get("record_type")).lower() == "appointment"
    ]
    return {"items": filtered, "appointments": filtered, "summary": {"count": len(filtered)}}


@router.get("/homes/{home_id}/staff-tasks")
def get_home_staff_tasks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_tasks(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/communications")
def get_home_communications(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("communications"))
    return {"items": rows, "communications": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/documents")
def get_home_documents(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("documents"))
    return {"items": rows, "documents": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/compliance-items")
def get_home_compliance_items(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    payload = get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)
    rows = _safe_list(payload.get("items"))
    return {"items": rows, "compliance_items": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/staff-documents")
def get_home_staff_documents(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_documents(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/supervisions")
def get_home_supervisions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("supervisions"))
    return {"items": rows, "supervisions": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/therapy")
def get_home_therapy(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("therapy"))
    return {"items": rows, "therapy": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/reports")
def get_home_reports(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("reports"))
    return {"items": rows, "reports": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/incidents")
def get_home_incidents(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("incidents"))
    return {"items": rows, "incidents": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/safeguarding")
def get_home_safeguarding(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    incidents = get_home_incidents(home_id=home_id, conn=conn, current_user=current_user)
    rows = _safe_list(incidents.get("items"))
    filtered = [
        row
        for row in rows
        if row.get("safeguarding_flag")
        or "safeguard" in _safe_text(row.get("incident_type")).lower()
    ]
    return {"items": filtered, "safeguarding": filtered, "summary": {"count": len(filtered)}}


@router.get("/homes/{home_id}/compliance")
def get_home_compliance(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    quality_items = _filter_home_rows(_safe_list(quality_ctx.get("compliance_items")), home_id)
    items = quality_items or _build_compliance_items(home_ctx)
    return {"items": items, "compliance_items": items, "summary": {"count": len(items)}}


@router.get("/homes/{home_id}/child-compliance")
def get_home_child_compliance(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/quality")
def get_home_quality(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    return _quality_payload(home_id, home_ctx, quality_ctx)


@router.get("/homes/{home_id}/audits")
def get_home_audits(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    rows = _filter_home_rows(_safe_list(quality_ctx.get("audits")), home_id)
    return {"items": rows, "audits": rows, "summary": {"count": len(rows)}}


@router.get("/homes/{home_id}/quality-audits")
def get_home_quality_audits(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_audits(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/quality-audit-findings")
def get_home_quality_audit_findings(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    reasons = _filter_home_rows(_safe_list(quality_ctx.get("inspection_reasons")), home_id)
    return {"items": reasons, "findings": reasons, "summary": {"count": len(reasons)}}


@router.get("/homes/{home_id}/quality-audit-actions")
def get_home_quality_audit_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    actions = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    return {"items": actions, "actions": actions, "summary": {"count": len(actions)}}


@router.get("/homes/{home_id}/inspection-scores")
def get_home_inspection_scores(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    cards = _filter_home_rows(_safe_list(quality_ctx.get("inspection_cards")), home_id)
    return {"items": cards, "inspection_home_cards": cards}


@router.get("/homes/{home_id}/inspection-section-scores")
def get_home_inspection_section_scores(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": bundle["sections"], "inspection_sections": bundle["sections"]}


@router.get("/homes/{home_id}/inspection-score-reasons")
def get_home_inspection_score_reasons(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    rows = _filter_home_rows(_safe_list(quality_ctx.get("inspection_reasons")), home_id)
    return {"items": rows, "inspection_reasons": rows}


@router.get("/homes/{home_id}/inspection-lines-of-enquiry")
def get_home_inspection_lines_of_enquiry(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    rows = _filter_home_rows(_safe_list(quality_ctx.get("inspection_lines")), home_id)
    return {"items": rows, "inspection_lines": rows}


@router.get("/homes/{home_id}/inspection-improvement-actions")
def get_home_inspection_improvement_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    rows = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    return {"items": rows, "inspection_actions": rows}


@router.get("/homes/{home_id}/actions")
def get_home_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    rows = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    return {"items": rows, "actions": rows}


@router.get("/homes/{home_id}/manager-review-queue")
def get_home_manager_review_queue(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    compliance_items = _build_compliance_items(home_ctx)
    inspection_actions = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    queue: list[dict[str, Any]] = []

    for item in compliance_items:
        queue.append(
            {
                "id": f"compliance-{item.get('id')}",
                "type": "compliance",
                "title": item.get("title") or "Compliance item",
                "status": item.get("status"),
                "priority": item.get("severity") or item.get("priority"),
                "due_date": item.get("due_date"),
                "summary": item.get("summary") or "Compliance review required.",
            }
        )

    for action in inspection_actions:
        if _normalise_status(action.get("status")) in {"completed", "closed", "resolved"}:
            continue
        queue.append(
            {
                "id": f"inspection-action-{action.get('id')}",
                "type": "inspection_action",
                "title": action.get("action_title") or action.get("title") or "Inspection action",
                "status": action.get("status"),
                "priority": action.get("priority"),
                "due_date": action.get("due_date"),
                "summary": action.get("action_description")
                or action.get("summary")
                or "Inspection action review required.",
            }
        )

    queue.sort(key=lambda row: (_safe_text(row.get("due_date")), _safe_text(row.get("title"))))
    return {"items": queue[:100], "queue": queue[:100]}


@router.get("/homes/{home_id}/reg44-visits")
def get_home_reg44_visits(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    audits = _safe_list(get_home_audits(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    reg44 = [
        item
        for item in audits
        if "reg44" in _safe_text(item.get("audit_name") or item.get("title")).lower()
        or "regulation 44" in _safe_text(item.get("audit_name") or item.get("title")).lower()
    ]
    return {"items": reg44 or audits, "reg44_visits": reg44 or audits}


@router.get("/homes/{home_id}/reg44-findings")
def get_home_reg44_findings(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    reasons = _safe_list(
        get_home_inspection_score_reasons(
            home_id=home_id,
            conn=conn,
            current_user=current_user,
        ).get("items")
    )
    return {"items": reasons, "reg44_findings": reasons}


@router.get("/homes/{home_id}/reg44-actions")
def get_home_reg44_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    actions = _safe_list(
        get_home_inspection_improvement_actions(
            home_id=home_id,
            conn=conn,
            current_user=current_user,
        ).get("items")
    )
    return {"items": actions, "reg44_actions": actions}


@router.get("/homes/{home_id}/reg45-reviews")
def get_home_reg45_reviews(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    reports = _safe_list(get_home_reports(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    reg45 = [
        item
        for item in reports
        if "reg45" in _safe_text(item.get("report_type") or item.get("title")).lower()
        or "regulation 45" in _safe_text(item.get("report_type") or item.get("title")).lower()
    ]
    return {"items": reg45 or reports, "reg45_reviews": reg45 or reports}


@router.get("/homes/{home_id}/reg45-actions")
def get_home_reg45_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    actions = _safe_list(
        get_home_inspection_improvement_actions(
            home_id=home_id,
            conn=conn,
            current_user=current_user,
        ).get("items")
    )
    return {"items": actions, "reg45_actions": actions}


@router.get("/homes/{home_id}/inspection-readiness")
def get_home_inspection_readiness(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)

    readiness_items = [*bundle["reasons"], *bundle["actions"]]
    readiness_score = _safe_int((bundle["header"] or {}).get("overall_score")) or 0
    return {
        "summary": bundle["header"],
        "readiness_score": readiness_score,
        "items": readiness_items,
        "gaps": bundle["reasons"],
        "actions": bundle["actions"],
        "tasks": bundle["tasks"],
        "briefing": bundle["briefing"],
        "prep72h": bundle["prep72h"],
    }


@router.get("/homes/{home_id}/ofsted-dashboard")
def get_home_ofsted_dashboard(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    compliance_items = _build_compliance_items(home_ctx)
    audits = _filter_home_rows(_safe_list(quality_ctx.get("audits")), home_id)

    return {
        "summary": bundle["header"],
        "judgements": bundle["sections"],
        "evidence": bundle["lines"],
        "gaps": bundle["reasons"],
        "actions": bundle["actions"],
        "compliance": compliance_items,
        "audits": audits,
        "documents": _safe_list(home_ctx.get("documents")),
        "items": bundle["actions"],
    }


@router.get("/homes/{home_id}/sccif-evidence")
def get_home_sccif_evidence(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)

    return {
        "summary": bundle["header"],
        "evidence": bundle["lines"],
        "gaps": bundle["reasons"],
        "actions": bundle["actions"],
        "compliance": _build_compliance_items(home_ctx),
        "documents": _safe_list(home_ctx.get("documents")),
        "sccif_areas": bundle["sections"],
        "items": bundle["lines"],
    }


@router.get("/homes/{home_id}/judgement-builder")
def get_home_judgement_builder(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    incidents = _safe_list(home_ctx.get("incidents"))
    safeguarding = [
        row
        for row in incidents
        if row.get("safeguarding_flag")
        or "safeguard" in _safe_text(row.get("incident_type")).lower()
    ]
    return {
        "summary": bundle["header"],
        "evidence": bundle["lines"],
        "gaps": bundle["reasons"],
        "actions": bundle["actions"],
        "incidents": incidents,
        "safeguarding": safeguarding,
        "reports": _safe_list(home_ctx.get("reports")),
        "items": bundle["sections"],
    }


@router.post("/homes/{home_id}/inspection-tasks/sync")
def post_home_inspection_task_sync(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {
        "ok": True,
        "home_id": home_id,
        "synced_at": datetime.now(UTC).isoformat(),
        "inspection_actions": len(bundle["actions"]),
        "inspection_tasks": len(bundle["tasks"]),
        "message": "Inspection tasks have been synced against the latest quality data.",
    }


@router.post("/homes/{home_id}/inspection-cycle/refresh")
def post_home_inspection_cycle_refresh(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {
        "ok": True,
        "home_id": home_id,
        "refreshed_at": datetime.now(UTC).isoformat(),
        "overall_score": (bundle["header"] or {}).get("overall_score"),
        "open_actions": len(
            [
                row
                for row in bundle["actions"]
                if _normalise_status(row.get("status")) not in {"completed", "closed", "resolved"}
            ]
        ),
        "message": "Inspection cycle metrics refreshed.",
    }


@router.get("/homes/{home_id}/notifications")
def get_home_notifications(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    compliance_items = _build_compliance_items(home_ctx)
    inspection_actions = _filter_home_rows(_safe_list(quality_ctx.get("inspection_actions")), home_id)
    notifications = _build_notifications(
        tasks=_safe_list(home_ctx.get("tasks")),
        compliance_items=compliance_items,
        inspection_actions=inspection_actions,
    )
    return {"items": notifications, "notifications": notifications}


@router.get("/homes/{home_id}/directory-contacts")
def get_home_directory_contacts(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = _safe_list(
        get_home_communications(home_id=home_id, conn=conn, current_user=current_user).get("items")
    )
    contacts: list[dict[str, Any]] = []
    for row in rows:
        contacts.append(
            {
                "id": row.get("id"),
                "contact_name": row.get("contact_person")
                or row.get("staff_member")
                or row.get("title")
                or "Contact",
                "organisation_name": row.get("organisation"),
                "contact_type": row.get("contact_type"),
                "notes": row.get("summary") or row.get("notes"),
                "status": row.get("status"),
                "created_at": row.get("created_at") or row.get("contact_datetime"),
                "updated_at": row.get("updated_at") or row.get("contact_datetime"),
            }
        )
    return {"items": contacts, "contacts": contacts, "summary": {"count": len(contacts)}}


@router.get("/homes/{home_id}/notifications-centre")
def get_home_notifications_centre(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_notifications(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/notification-queue")
def get_home_notification_queue(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_notifications(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/operational-notifications")
def get_home_operational_notifications(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_notifications(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/home-notifications")
def get_home_home_notifications(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_notifications(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/onboarding")
def get_home_onboarding(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("onboarding"))
    return {"items": rows, "onboarding": rows}


@router.get("/homes/{home_id}/pipeline")
def get_home_pipeline(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = _safe_list(get_home_onboarding(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    pipeline = [
        row for row in rows if "pipeline" in _safe_text(row.get("stage") or row.get("status")).lower()
    ]
    return {"items": pipeline or rows, "pipeline": pipeline or rows}


@router.get("/homes/{home_id}/inductions")
def get_home_inductions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = _safe_list(get_home_onboarding(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    inductions = [
        row for row in rows if "induct" in _safe_text(row.get("stage") or row.get("status")).lower()
    ]
    return {"items": inductions or rows, "inductions": inductions or rows}


@router.get("/homes/{home_id}/probations")
def get_home_probations(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = _safe_list(get_home_onboarding(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    probations = [
        row for row in rows if "probation" in _safe_text(row.get("stage") or row.get("status")).lower()
    ]
    return {"items": probations or rows, "probations": probations or rows}


@router.get("/homes/{home_id}/training")
def get_home_training(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("training"))
    return {"items": rows, "training": rows}


@router.get("/homes/{home_id}/training-summary")
def get_home_training_summary(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    training = _safe_list(home_ctx.get("training"))
    summary = {
        "home_id": home_id,
        "home_name": _safe_text((home_ctx.get("home") or {}).get("home_name")),
        "total_training_records": len(training),
        "overdue_training": len(
            [
                row
                for row in training
                if _normalise_status(row.get("status")) in {"overdue", "expired", "failed"}
            ]
        ),
        "due_soon_training": len(
            [
                row
                for row in training
                if _normalise_status(row.get("status")) in {"due_soon", "review_due"}
            ]
        ),
        "current_training": len(
            [
                row
                for row in training
                if _normalise_status(row.get("status")) in {"current", "completed", "active"}
            ]
        ),
    }
    return {"summary": summary, "items": [summary]}


@router.get("/homes/{home_id}/rota")
def get_home_rota(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    rows = _safe_list(home_ctx.get("rota"))
    return {"items": rows, "rota": rows}


@router.get("/homes/{home_id}/rota-absences")
def get_home_rota_absences(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rota_rows = _safe_list(get_home_rota(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    absences = [
        row for row in rota_rows if _normalise_status(row.get("status")) in {"absence", "sick", "leave"}
    ]
    return {"items": absences, "rota_absences": absences}


@router.get("/homes/{home_id}/rota-gaps")
def get_home_rota_gaps(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rota_rows = _safe_list(get_home_rota(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    gaps = [
        row
        for row in rota_rows
        if _normalise_status(row.get("status")) in {"gap", "unfilled", "open"}
        or bool(row.get("cover_required"))
    ]
    return {"items": gaps, "rota_gaps": gaps}


@router.get("/homes/{home_id}/maintenance-jobs")
def get_home_maintenance_jobs(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    tasks = _safe_list(get_home_tasks(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    jobs = [
        row
        for row in tasks
        if "maint" in _safe_text(row.get("task_type") or row.get("title") or row.get("task")).lower()
    ]
    return {"items": jobs, "maintenance_jobs": jobs}


@router.get("/homes/{home_id}/maintenance-requests")
def get_home_maintenance_requests(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_maintenance_jobs(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/visitor-log")
def get_home_visitor_log(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    visitors = _safe_list(home_ctx.get("visitors"))
    return {"items": visitors, "visitor_log": visitors}


@router.get("/homes/{home_id}/home-visitors-log")
def get_home_visitors_log_alias(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_visitor_log(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/home-visitors")
def get_home_visitors_alias(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_visitor_log(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/vehicles")
def get_home_vehicles(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    transport = _safe_list(
        _build_home_context(conn, current_user, home_id).get("transport")
    )
    return {"items": transport, "vehicles": transport}


@router.get("/homes/{home_id}/vehicle-checks")
def get_home_vehicle_checks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_vehicles(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/vehicle-journeys")
def get_home_vehicle_journeys(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_vehicles(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/transport-journeys")
def get_home_transport_journeys(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_vehicles(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/environment-checks")
def get_home_environment_checks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/premises-checks")
def get_home_premises_checks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/safety-checks")
def get_home_safety_checks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/health-safety-checks")
def get_home_health_safety_checks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/fire-safety-checks")
def get_home_fire_safety_checks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/fire-drills")
def get_home_fire_drills(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_compliance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/home-operations-log")
def get_home_operations_log(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    incidents = _safe_list(get_home_incidents(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    communications = _safe_list(
        get_home_communications(home_id=home_id, conn=conn, current_user=current_user).get("items")
    )
    items = [*incidents, *communications]
    return {"items": items[:200], "operations_log": items[:200]}


@router.get("/homes/{home_id}/home-operational-actions")
def get_home_operational_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    tasks = _safe_list(get_home_tasks(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    return {"items": tasks, "operational_actions": tasks}


@router.get("/homes/{home_id}/shift-logs")
def get_home_shift_logs(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_operations_log(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/home-shift-logs")
def get_home_shift_logs_alias(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_shift_logs(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/home-daily-logs")
def get_home_daily_logs(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_shift_logs(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/finance")
def get_home_finance(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    tasks = _safe_list(get_home_tasks(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    finance_items = [
        row
        for row in tasks
        if "finance" in _safe_text(row.get("task_type") or row.get("title") or row.get("task")).lower()
        or "budget" in _safe_text(row.get("task_type") or row.get("title") or row.get("task")).lower()
    ]
    return {"items": finance_items, "finance": finance_items}


@router.get("/homes/{home_id}/finance-invoices")
def get_home_finance_invoices(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/allowances")
def get_home_allowances(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/budgets")
def get_home_budgets(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/finance-tasks")
def get_home_finance_tasks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/inventory-items")
def get_home_inventory_items(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_maintenance_jobs(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/home-assets")
def get_home_assets(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_maintenance_jobs(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/premises-assets")
def get_home_premises_assets(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_maintenance_jobs(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/purchase-requests")
def get_home_purchase_requests(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/petty-cash-transactions")
def get_home_petty_cash_transactions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/allowance-payments")
def get_home_allowance_payments(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_home_finance(home_id=home_id, conn=conn, current_user=current_user)


@router.get("/homes/{home_id}/referrals")
def get_home_referrals(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    young_people = _safe_list(home_ctx.get("young_people"))
    rows: list[dict[str, Any]] = []
    for person in young_people:
        rows.append(
            {
                "id": person.get("id"),
                "young_person_id": person.get("id"),
                "young_person_name": person.get("preferred_name") or person.get("full_name"),
                "home_id": home_id,
                "referral_status": "accepted",
                "status": "accepted",
                "referral_date": person.get("created_at"),
                "presenting_needs": person.get("summary_risk_level"),
                "matching_summary": "Referral accepted into current placement.",
                "created_at": person.get("created_at"),
                "updated_at": person.get("updated_at"),
            }
        )
    return {"items": rows, "referrals": rows}


@router.get("/homes/{home_id}/pre-admission-assessments")
def get_home_pre_admission_assessments(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    referrals = _safe_list(get_home_referrals(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for referral in referrals:
        rows.append(
            {
                "id": f"paa-{referral.get('id')}",
                "referral_id": referral.get("id"),
                "young_person_id": referral.get("young_person_id"),
                "home_id": home_id,
                "assessment_status": "completed",
                "assessment_date": referral.get("referral_date"),
                "needs_summary": referral.get("presenting_needs"),
                "risk_summary": referral.get("presenting_needs"),
                "matching_summary": referral.get("matching_summary"),
                "created_at": referral.get("created_at"),
                "updated_at": referral.get("updated_at"),
            }
        )
    return {"items": rows, "pre_admission_assessments": rows}


@router.get("/homes/{home_id}/pre-admission-visits")
def get_home_pre_admission_visits(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    assessments = _safe_list(
        get_home_pre_admission_assessments(
            home_id=home_id,
            conn=conn,
            current_user=current_user,
        ).get("items")
    )
    rows: list[dict[str, Any]] = []
    for assessment in assessments:
        rows.append(
            {
                "id": f"pav-{assessment.get('id')}",
                "assessment_id": assessment.get("id"),
                "home_id": home_id,
                "visit_status": "completed",
                "status": "completed",
                "visit_date": assessment.get("assessment_date"),
                "summary": "Pre-admission visit completed and recorded.",
                "created_at": assessment.get("created_at"),
                "updated_at": assessment.get("updated_at"),
            }
        )
    return {"items": rows, "pre_admission_visits": rows}


@router.get("/homes/{home_id}/admission-plans")
def get_home_admission_plans(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    referrals = _safe_list(get_home_referrals(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for referral in referrals:
        rows.append(
            {
                "id": f"ap-{referral.get('id')}",
                "referral_id": referral.get("id"),
                "young_person_id": referral.get("young_person_id"),
                "home_id": home_id,
                "status": "in_progress",
                "planned_admission_date": referral.get("referral_date"),
                "matching_summary": referral.get("matching_summary"),
                "created_at": referral.get("created_at"),
                "updated_at": referral.get("updated_at"),
            }
        )
    return {"items": rows, "admission_plans": rows}


@router.get("/homes/{home_id}/admission-checklists")
def get_home_admission_checklists(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    tasks = _safe_list(get_home_tasks(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for task in tasks:
        rows.append(
            {
                "id": f"ac-{task.get('id')}",
                "check_name": task.get("title") or task.get("task"),
                "status": task.get("status"),
                "due_date": task.get("due_date"),
                "owner_name": task.get("owner_user_name") or task.get("assigned_role"),
                "notes": task.get("summary") or task.get("description"),
                "created_at": task.get("created_at"),
                "updated_at": task.get("updated_at"),
            }
        )
    return {"items": rows, "admission_checklists": rows}


@router.get("/homes/{home_id}/admission-events")
def get_home_admission_events(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    incidents = _safe_list(get_home_incidents(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for incident in incidents:
        rows.append(
            {
                "id": f"ae-{incident.get('id')}",
                "home_id": home_id,
                "event_type": incident.get("incident_type") or "admission_event",
                "status": incident.get("status") or "recorded",
                "event_date": incident.get("incident_datetime") or incident.get("created_at"),
                "summary": incident.get("summary") or incident.get("description"),
                "created_at": incident.get("created_at"),
                "updated_at": incident.get("updated_at"),
            }
        )
    return {"items": rows, "admission_events": rows}


@router.get("/homes/{home_id}/placement-periods")
def get_home_placement_periods(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    young_people = _safe_list(home_ctx.get("young_people"))
    rows: list[dict[str, Any]] = []
    for person in young_people:
        rows.append(
            {
                "id": f"pp-{person.get('id')}",
                "young_person_id": person.get("id"),
                "home_id": home_id,
                "placement_status": person.get("placement_status") or "active",
                "start_date": person.get("created_at"),
                "end_date": None,
                "summary": f"Placement currently {person.get('placement_status') or 'active'}.",
                "created_at": person.get("created_at"),
                "updated_at": person.get("updated_at"),
            }
        )
    return {"items": rows, "placement_periods": rows}


@router.get("/homes/{home_id}/placement-plans")
def get_home_placement_plans(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    periods = _safe_list(
        get_home_placement_periods(home_id=home_id, conn=conn, current_user=current_user).get("items")
    )
    rows: list[dict[str, Any]] = []
    for period in periods:
        rows.append(
            {
                "id": f"plan-{period.get('id')}",
                "placement_period_id": period.get("id"),
                "young_person_id": period.get("young_person_id"),
                "home_id": home_id,
                "status": "current",
                "plan_type": "placement_plan",
                "summary": period.get("summary"),
                "created_at": period.get("created_at"),
                "updated_at": period.get("updated_at"),
            }
        )
    return {"items": rows, "placement_plans": rows}


@router.get("/homes/{home_id}/placement-goals")
def get_home_placement_goals(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    plans = _safe_list(get_home_placement_plans(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for plan in plans:
        rows.append(
            {
                "id": f"goal-{plan.get('id')}",
                "placement_plan_id": plan.get("id"),
                "young_person_id": plan.get("young_person_id"),
                "home_id": home_id,
                "status": "in_progress",
                "target_date": plan.get("updated_at"),
                "summary": "Progress against placement goals is being monitored.",
                "created_at": plan.get("created_at"),
                "updated_at": plan.get("updated_at"),
            }
        )
    return {"items": rows, "placement_goals": rows}


@router.get("/homes/{home_id}/transition-plans")
def get_home_transition_plans(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    goals = _safe_list(get_home_placement_goals(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for goal in goals:
        rows.append(
            {
                "id": f"tp-{goal.get('id')}",
                "placement_goal_id": goal.get("id"),
                "young_person_id": goal.get("young_person_id"),
                "home_id": home_id,
                "status": "planned",
                "target_date": goal.get("target_date"),
                "summary": "Transition and independence planning in progress.",
                "created_at": goal.get("created_at"),
                "updated_at": goal.get("updated_at"),
            }
        )
    return {"items": rows, "transition_plans": rows}


@router.get("/homes/{home_id}/transition-actions")
def get_home_transition_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    tasks = _safe_list(get_home_tasks(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for task in tasks:
        rows.append(
            {
                "id": f"ta-{task.get('id')}",
                "home_id": home_id,
                "status": task.get("status") or "open",
                "target_date": task.get("due_date"),
                "summary": task.get("summary") or task.get("description") or task.get("task"),
                "created_at": task.get("created_at"),
                "updated_at": task.get("updated_at"),
            }
        )
    return {"items": rows, "transition_actions": rows}


@router.get("/homes/{home_id}/discharge-summaries")
def get_home_discharge_summaries(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    reports = _safe_list(get_home_reports(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for report in reports:
        rows.append(
            {
                "id": f"ds-{report.get('id')}",
                "home_id": home_id,
                "status": report.get("status") or "completed",
                "discharge_date": report.get("created_at"),
                "summary": report.get("summary") or report.get("title") or "Discharge summary recorded.",
                "created_at": report.get("created_at"),
                "updated_at": report.get("updated_at"),
            }
        )
    return {"items": rows, "discharge_summaries": rows}


@router.get("/homes/{home_id}/discharge-events")
def get_home_discharge_events(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    incidents = _safe_list(get_home_incidents(home_id=home_id, conn=conn, current_user=current_user).get("items"))
    rows: list[dict[str, Any]] = []
    for incident in incidents:
        rows.append(
            {
                "id": f"de-{incident.get('id')}",
                "home_id": home_id,
                "status": incident.get("status") or "recorded",
                "event_date": incident.get("incident_datetime") or incident.get("created_at"),
                "summary": incident.get("summary") or incident.get("description") or "Discharge event recorded.",
                "created_at": incident.get("created_at"),
                "updated_at": incident.get("updated_at"),
            }
        )
    return {"items": rows, "discharge_events": rows}


@router.get("/homes/{home_id}/discharge-records")
def get_home_discharge_records(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    summaries = _safe_list(
        get_home_discharge_summaries(home_id=home_id, conn=conn, current_user=current_user).get("items")
    )
    events = _safe_list(
        get_home_discharge_events(home_id=home_id, conn=conn, current_user=current_user).get("items")
    )
    rows = [*summaries, *events]
    return {"items": rows, "discharge_records": rows}


@router.get("/inspection/ui/home-cards")
def get_inspection_ui_home_cards(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    quality_ctx = _build_quality_context(
        conn,
        current_user,
        all_accessible_homes=True,
    )
    cards = _safe_list(quality_ctx.get("inspection_cards"))
    return {"items": cards, "inspection_home_cards": cards}


@router.get("/inspection/ui/homes/{home_id}/header")
def get_inspection_ui_home_header(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": [bundle["header"]], "inspection_headers": [bundle["header"]]}


@router.get("/inspection/ui/homes/{home_id}/sections")
def get_inspection_ui_home_sections(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": bundle["sections"], "inspection_sections": bundle["sections"]}


@router.get("/inspection/ui/homes/{home_id}/reasons")
def get_inspection_ui_home_reasons(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": bundle["reasons"], "inspection_reasons": bundle["reasons"]}


@router.get("/inspection/ui/homes/{home_id}/actions")
def get_inspection_ui_home_actions(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": bundle["actions"], "inspection_actions": bundle["actions"]}


@router.get("/inspection/ui/homes/{home_id}/tasks")
def get_inspection_ui_home_tasks(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": bundle["tasks"], "inspection_tasks": bundle["tasks"]}


@router.get("/inspection/ui/homes/{home_id}/briefing")
def get_inspection_ui_home_briefing(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": [bundle["briefing"]], "inspection_briefings": [bundle["briefing"]]}


@router.get("/inspection/ui/homes/{home_id}/prep-72h")
def get_inspection_ui_home_prep_72h(
    home_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_ctx = _build_home_context(conn, current_user, home_id)
    quality_ctx = _build_quality_context(conn, current_user, home_id=home_id)
    bundle = _build_inspection_bundle(home_id=home_id, home_ctx=home_ctx, quality_ctx=quality_ctx)
    return {"items": [bundle["prep72h"]], "inspection_prep_72_hour": [bundle["prep72h"]]}

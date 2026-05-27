from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_child_workspace_write_service import function_exists, table_exists
from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(prefix='/api', tags=['OS Child Workspace Actions'])

WorkspaceAction = Literal[
    'submit',
    'request_changes',
    'approve',
    'sign_off',
    'mark_reviewed',
    'create_follow_up',
    'resolve_action',
]


class WorkspaceActionPayload(BaseModel):
    action: WorkspaceAction
    item_type: str | None = None
    item_id: str | None = None
    source_table: str | None = None
    source_id: str | int | None = None
    title: str | None = None
    summary: str | None = None
    comment: str | None = None
    follow_up_action: str | None = None
    priority: str | None = 'medium'
    metadata: dict[str, Any] = {}


def _priority(value: str | None) -> str:
    value = (value or 'medium').lower()
    return value if value in {'low', 'medium', 'high', 'critical'} else 'medium'


def _manager_priority(value: str | None) -> str:
    value = (value or 'normal').lower()
    if value == 'critical':
        return 'urgent'
    if value == 'high':
        return 'high'
    if value == 'low':
        return 'low'
    return 'normal'


def _workflow_status_for_action(action: str) -> str:
    if action == 'submit':
        return 'submitted'
    if action == 'request_changes':
        return 'changes_requested'
    if action in {'approve', 'sign_off'}:
        return 'approved'
    if action == 'mark_reviewed':
        return 'reviewed'
    return 'open'


def _review_state_for_action(action: str) -> str:
    if action == 'request_changes':
        return 'changes_requested'
    if action in {'approve', 'sign_off'}:
        return 'approved'
    if action == 'mark_reviewed':
        return 'reviewed'
    return 'pending'


async def _child_scope(conn, young_person_id: int) -> dict[str, Any]:
    if await table_exists(conn, 'vw_os_young_person_profile'):
        row = await conn.fetchrow(
            """
            SELECT provider_id, home_id, display_name
            FROM public.vw_os_young_person_profile
            WHERE young_person_id = $1 OR id = $1
            LIMIT 1
            """,
            young_person_id,
        )
        if row:
            return dict(row)
    return {'provider_id': None, 'home_id': None, 'display_name': f'Young person {young_person_id}'}


async def _update_source_workflow(
    conn,
    *,
    source_table: str | None,
    source_id: str | int | None,
    action: str,
    user_id: int,
) -> dict[str, Any]:
    if not source_table or source_id is None:
        return {'updated': False, 'reason': 'missing_source'}
    if source_table.startswith('vw_') or source_table.startswith('schema'):
        return {'updated': False, 'reason': 'read_only_source'}
    if not await table_exists(conn, source_table):
        return {'updated': False, 'reason': 'source_table_missing'}

    status = _workflow_status_for_action(action)
    review_status = _review_state_for_action(action)
    columns = await conn.fetch(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        """,
        source_table,
    )
    names = {row['column_name'] for row in columns}
    assignments: list[str] = []
    values: list[Any] = []

    if 'workflow_status' in names:
        assignments.append(f"workflow_status = ${len(values) + 1}")
        values.append(status)
    if 'status' in names and source_table in {'young_person_appointments', 'handover_records', 'child_voice_entries'}:
        target_status = 'completed' if action in {'approve', 'sign_off', 'mark_reviewed'} and source_table == 'young_person_appointments' else status
        assignments.append(f"status = ${len(values) + 1}")
        values.append(target_status)
    if 'manager_review_status' in names:
        assignments.append(f"manager_review_status = ${len(values) + 1}")
        values.append(review_status)
    if 'review_state' in names:
        assignments.append(f"review_state = ${len(values) + 1}")
        values.append(review_status)
    if action in {'approve', 'sign_off', 'mark_reviewed'}:
        for column, value in (
            ('approved_by', user_id),
            ('signed_off_by', user_id),
            ('reviewed_by', user_id),
        ):
            if column in names:
                assignments.append(f"{column} = ${len(values) + 1}")
                values.append(value)
        for column in ('approved_at', 'signed_off_at', 'reviewed_at'):
            if column in names:
                assignments.append(f'{column} = NOW()')
    if 'updated_at' in names:
        assignments.append('updated_at = NOW()')
    if 'last_edited_at' in names:
        assignments.append('last_edited_at = NOW()')

    if not assignments:
        return {'updated': False, 'reason': 'no_workflow_columns'}

    values.append(source_id)
    sql = f"UPDATE public.{source_table} SET {', '.join(assignments)} WHERE id = ${len(values)} RETURNING id"
    row = await conn.fetchrow(sql, *values)
    return {'updated': bool(row), 'source_table': source_table, 'source_id': str(source_id), 'status': status}


async def _insert_manager_review(
    conn,
    *,
    young_person_id: int,
    provider_id: int | None,
    home_id: int | None,
    payload: WorkspaceActionPayload,
    user_id: int,
) -> dict[str, Any] | None:
    if not await table_exists(conn, 'manager_review_queue'):
        return None
    row = await conn.fetchrow(
        """
        INSERT INTO public.manager_review_queue (
          provider_id, home_id, young_person_id, source_table, source_id,
          record_type, workflow_status, priority, review_reason, assigned_to,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,NULL,NOW(),NOW())
        RETURNING id
        """,
        provider_id,
        home_id,
        young_person_id,
        payload.source_table,
        str(payload.source_id) if payload.source_id is not None else payload.item_id,
        payload.item_type or 'workspace_item',
        _manager_priority(payload.priority),
        payload.comment or payload.follow_up_action or f'{payload.action} from child workspace',
    )
    return dict(row) if row else None


async def _insert_command_item(
    conn,
    *,
    young_person_id: int,
    provider_id: int | None,
    home_id: int | None,
    payload: WorkspaceActionPayload,
    user_id: int,
) -> dict[str, Any] | None:
    if not await table_exists(conn, 'os_command_items'):
        return None
    row = await conn.fetchrow(
        """
        INSERT INTO public.os_command_items (
          provider_id, home_id, young_person_id, domain, priority, status, title,
          summary, recommended_action, source_table, source_id, ai_generated,
          created_by, created_at, updated_at
        ) VALUES ($1,$2,$3,'operations'::public.os_domain,$4::public.os_priority,'open'::public.os_status,$5,$6,$7,$8,$9,FALSE,$10,NOW(),NOW())
        RETURNING id
        """,
        provider_id,
        home_id,
        young_person_id,
        _priority(payload.priority),
        payload.title or 'Workspace follow-up action',
        payload.summary or payload.comment,
        payload.follow_up_action or payload.comment or 'Review this workspace item and complete the follow-up action.',
        payload.source_table,
        str(payload.source_id) if payload.source_id is not None else payload.item_id,
        user_id,
    )
    return dict(row) if row else None


@router.get('/os-command/young-person/{young_person_id}/workspace/review-queue')
async def get_child_workspace_review_queue(
    young_person_id: int,
    request: Request,
    limit: int = Query(default=100, ge=1, le=300),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)
    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        scope = await _child_scope(conn, young_person_id)
        home_id = scope.get('home_id')

        review_queue: list[dict[str, Any]] = []
        if await table_exists(conn, 'manager_review_queue'):
            review_queue = [
                dict(row)
                for row in await conn.fetch(
                    """
                    SELECT
                      id,
                      'Manager review' AS type,
                      record_type AS title,
                      review_reason AS summary,
                      workflow_status AS status,
                      priority,
                      source_table,
                      source_id,
                      created_at AS occurred_at,
                      updated_at,
                      assigned_to,
                      provider_id,
                      home_id,
                      young_person_id
                    FROM public.manager_review_queue
                    WHERE young_person_id = $1
                      AND workflow_status IN ('pending','submitted','changes_requested','open','in_progress','waiting')
                    ORDER BY
                      CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                      created_at DESC
                    LIMIT $2
                    """,
                    young_person_id,
                    limit,
                )
            ]

        command_items: list[dict[str, Any]] = []
        if await table_exists(conn, 'os_command_items') and await function_exists(conn, 'os_command_live_feed'):
            command_items = [
                dict(row)
                for row in await conn.fetch(
                    'SELECT * FROM public.os_command_live_feed($1, $2, NULL, NULL, $3)',
                    home_id,
                    young_person_id,
                    limit,
                )
            ]

    return {
        'ok': True,
        'young_person_id': young_person_id,
        'review_queue': review_queue,
        'command_items': command_items,
        'counts': {
            'review_queue': len(review_queue),
            'command_items': len(command_items),
            'total': len(review_queue) + len(command_items),
        },
    }


@router.post('/os-command/young-person/{young_person_id}/workspace/action')
async def apply_child_workspace_action(
    young_person_id: int,
    payload: WorkspaceActionPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)
    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        scope = await _child_scope(conn, young_person_id)
        provider_id = scope.get('provider_id') or user.provider_id
        home_id = scope.get('home_id')

        source_update = await _update_source_workflow(
            conn,
            source_table=payload.source_table,
            source_id=payload.source_id,
            action=payload.action,
            user_id=user.id,
        )

        review = None
        command = None
        if payload.action in {'submit', 'request_changes', 'mark_reviewed', 'approve', 'sign_off'}:
            review = await _insert_manager_review(
                conn,
                young_person_id=young_person_id,
                provider_id=provider_id,
                home_id=home_id,
                payload=payload,
                user_id=user.id,
            )
        if payload.action in {'create_follow_up', 'request_changes'} or payload.follow_up_action:
            command = await _insert_command_item(
                conn,
                young_person_id=young_person_id,
                provider_id=provider_id,
                home_id=home_id,
                payload=payload,
                user_id=user.id,
            )

    return {
        'ok': True,
        'action': payload.action,
        'source_update': source_update,
        'manager_review_id': review.get('id') if review else None,
        'command_item_id': str(command.get('id')) if command else None,
    }

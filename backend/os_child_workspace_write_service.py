from __future__ import annotations

from datetime import date
from typing import Any


async def table_exists(conn, table_name: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = $1
            )
            """,
            table_name,
        )
    )


async def child_scope(conn, *, young_person_id: int, fallback_home_id: int | None = None) -> dict[str, Any]:
    row = None
    if await table_exists(conn, 'vw_os_young_person_profile'):
        row = await conn.fetchrow(
            """
            SELECT young_person_id, home_id, provider_id, display_name
            FROM public.vw_os_young_person_profile
            WHERE young_person_id = $1 OR id = $1
            LIMIT 1
            """,
            young_person_id,
        )
    if not row and await table_exists(conn, 'young_people'):
        row = await conn.fetchrow(
            """
            SELECT id AS young_person_id, home_id, provider_id,
                   trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) AS display_name
            FROM public.young_people
            WHERE id = $1
            LIMIT 1
            """,
            young_person_id,
        )
    data = dict(row) if row else {}
    return {
        'young_person_id': young_person_id,
        'home_id': data.get('home_id') or fallback_home_id,
        'provider_id': data.get('provider_id'),
        'display_name': data.get('display_name') or f'Young person {young_person_id}',
    }


def _text(value: Any, fallback: str = '') -> str:
    if value is None:
        return fallback
    value = str(value).strip()
    return value or fallback


def _status(value: Any, fallback: str = 'draft') -> str:
    return _text(value, fallback).lower().replace(' ', '_')


async def _insert_chronology(
    conn,
    *,
    young_person_id: int,
    home_id: int | None,
    provider_id: int | None,
    source_table: str,
    source_id: int,
    category: str,
    title: str,
    summary: str | None,
    created_by: int | None,
    significance: str = 'standard',
    child_voice_present: bool = False,
):
    if not await table_exists(conn, 'chronology_events'):
        return None
    return await conn.fetchrow(
        """
        INSERT INTO public.chronology_events (
          young_person_id,
          home_id,
          provider_id,
          event_datetime,
          category,
          title,
          summary,
          significance,
          source_table,
          source_id,
          created_by,
          auto_generated,
          is_visible,
          child_voice_present,
          primary_record_type,
          workflow_status,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,TRUE,TRUE,$11,$4,'recorded',NOW(),NOW())
        RETURNING id
        """,
        young_person_id,
        home_id,
        provider_id,
        category,
        title,
        summary,
        significance,
        source_table,
        source_id,
        created_by,
        child_voice_present,
    )


async def _queue_manager_review(
    conn,
    *,
    young_person_id: int,
    home_id: int | None,
    provider_id: int | None,
    source_table: str,
    source_id: int,
    record_type: str,
    priority: str,
    reason: str | None,
):
    if not await table_exists(conn, 'manager_review_queue'):
        return None
    return await conn.fetchrow(
        """
        INSERT INTO public.manager_review_queue (
          provider_id,
          home_id,
          young_person_id,
          source_table,
          source_id,
          record_type,
          workflow_status,
          priority,
          review_reason,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,NOW(),NOW())
        RETURNING id
        """,
        provider_id,
        home_id,
        young_person_id,
        source_table,
        source_id,
        record_type,
        priority if priority in {'low', 'normal', 'high', 'critical'} else 'normal',
        reason or f'{record_type} requires manager review',
    )


async def _create_command_item(
    conn,
    *,
    young_person_id: int,
    home_id: int | None,
    provider_id: int | None,
    source_table: str,
    source_id: int,
    title: str,
    summary: str | None,
    recommended_action: str | None,
    priority: str,
    created_by: int | None,
):
    if not await table_exists(conn, 'os_command_items'):
        return None
    priority = priority if priority in {'low', 'medium', 'high', 'critical'} else 'medium'
    return await conn.fetchrow(
        """
        INSERT INTO public.os_command_items (
          provider_id,
          home_id,
          young_person_id,
          domain,
          priority,
          status,
          title,
          summary,
          recommended_action,
          source_table,
          source_id,
          ai_generated,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,'operations'::public.os_domain,$4::public.os_priority,'open'::public.os_status,$5,$6,$7,$8,$9::text,FALSE,$10,NOW(),NOW())
        RETURNING id
        """,
        provider_id,
        home_id,
        young_person_id,
        priority,
        title,
        summary,
        recommended_action,
        source_table,
        str(source_id),
        created_by,
    )


async def save_child_workspace_item(
    conn,
    *,
    young_person_id: int,
    home_id: int | None,
    user_id: int,
    item_type: str,
    title: str,
    summary: str | None,
    status: str | None,
    priority: str | None,
    evidence: str | None,
    action: str | None,
    owner: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    scope = await child_scope(conn, young_person_id=young_person_id, fallback_home_id=home_id)
    home_id = scope.get('home_id')
    provider_id = scope.get('provider_id')
    kind = item_type.lower().strip()
    status_value = _status(status)
    priority_value = _status(priority, 'normal')
    title = _text(title, item_type)
    summary = _text(summary, title)
    action = _text(action)
    evidence = _text(evidence)
    record = None
    table = 'os_workspace_item_drafts'
    source_id: int | None = None
    manager_review = None

    if 'daily' in kind and await table_exists(conn, 'daily_notes'):
        table = 'daily_notes'
        record = await conn.fetchrow(
            """
            INSERT INTO public.daily_notes (
              young_person_id, home_id, provider_id, note_date, shift_type, mood,
              presentation, activities, young_person_voice, positives, actions_required,
              significance, author_id, workflow_status, created_at, updated_at,
              submitted_at, last_edited_at
            ) VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW(),CASE WHEN $13 <> 'draft' THEN NOW() ELSE NULL END,NOW())
            RETURNING id
            """,
            young_person_id,
            home_id,
            provider_id,
            payload.get('shift_type') or 'day',
            payload.get('mood'),
            summary,
            evidence or summary,
            payload.get('child_voice') or payload.get('young_person_voice'),
            payload.get('positives'),
            action,
            priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'standard',
            user_id,
            status_value,
        )

    elif 'incident' in kind and await table_exists(conn, 'incidents'):
        table = 'incidents'
        record = await conn.fetchrow(
            """
            INSERT INTO public.incidents (
              young_person_id, home_id, provider_id, staff_id, incident_type, description,
              incident_datetime, antecedent, staff_response, child_response, outcome,
              severity, manager_review_required, manager_review_status, follow_up_required,
              workflow_status, presentation, trauma_informed_formulation, child_voice,
              restorative_follow_up, actions_taken, created_at, updated_at, submitted_at, submitted_by
            ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9,$10,$11,TRUE,'pending',$12,$13,$14,$15,$16,$17,$18,NOW(),NOW(),CASE WHEN $13 <> 'draft' THEN NOW() ELSE NULL END,$4)
            RETURNING id
            """,
            young_person_id,
            home_id,
            provider_id,
            user_id,
            payload.get('incident_type') or 'other',
            summary,
            payload.get('antecedent') or evidence,
            payload.get('staff_response') or action,
            payload.get('child_response') or payload.get('child_voice'),
            payload.get('outcome'),
            priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'medium',
            bool(action),
            status_value,
            payload.get('presentation'),
            payload.get('trauma_informed_formulation'),
            payload.get('child_voice'),
            payload.get('restorative_follow_up'),
            action,
        )

    elif 'missing' in kind and await table_exists(conn, 'missing_episodes'):
        table = 'missing_episodes'
        record = await conn.fetchrow(
            """
            INSERT INTO public.missing_episodes (
              young_person_id, provider_id, start_datetime, reported_datetime,
              trigger_factors, push_pull_factors, actions_taken, outcome,
              review_required, created_by, workflow_status, manager_review_status,
              child_voice, contextual_risk_notes, created_at, updated_at
            ) VALUES ($1,$2,NOW(),NOW(),$3,$4,$5,$6,TRUE,$7,$8,'pending',$9,$10,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            payload.get('trigger_factors') or evidence,
            payload.get('push_pull_factors'),
            action or summary,
            payload.get('outcome'),
            user_id,
            status_value,
            payload.get('child_voice'),
            payload.get('contextual_risk_notes'),
        )

    elif 'safeguard' in kind and await table_exists(conn, 'safeguarding_records'):
        table = 'safeguarding_records'
        record = await conn.fetchrow(
            """
            INSERT INTO public.safeguarding_records (
              young_person_id, provider_id, safeguarding_category, concern_datetime,
              disclosure_details, concern_details, immediate_action_taken,
              referral_made, referral_details, outcome, manager_review_status,
              created_by, created_at, updated_at
            ) VALUES ($1,$2,$3,NOW(),$4,$5,$6,FALSE,$7,$8,'pending',$9,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            payload.get('safeguarding_category') or 'general_concern',
            payload.get('disclosure_details'),
            summary,
            action,
            payload.get('referral_details'),
            payload.get('outcome'),
            user_id,
        )

    elif 'keywork' in kind and await table_exists(conn, 'keywork_sessions'):
        table = 'keywork_sessions'
        record = await conn.fetchrow(
            """
            INSERT INTO public.keywork_sessions (
              young_person_id, provider_id, session_date, worker_id, topic, purpose,
              summary, child_voice, reflective_analysis, actions_agreed,
              next_session_date, status, workflow_status, created_by, updated_by,
              created_at, updated_at
            ) VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,NULL,'active',$10,$3,$3,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            user_id,
            title,
            payload.get('purpose') or evidence,
            summary,
            payload.get('child_voice'),
            payload.get('reflective_analysis'),
            action,
            status_value,
        )

    elif 'direct work' in kind and await table_exists(conn, 'direct_work_sessions'):
        table = 'direct_work_sessions'
        record = await conn.fetchrow(
            """
            INSERT INTO public.direct_work_sessions (
              provider_id, young_person_id, home_id, session_date, session_type,
              topic, purpose, summary, child_voice, emotional_response,
              reflective_note, agreed_actions, next_step, worker_id, created_at, updated_at
            ) VALUES ($1,$2,$3,CURRENT_DATE,'keywork',$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
            RETURNING id
            """,
            provider_id,
            young_person_id,
            home_id,
            title,
            evidence,
            summary,
            payload.get('child_voice'),
            payload.get('emotional_response'),
            payload.get('reflective_note'),
            action,
            payload.get('next_step'),
            user_id,
        )

    elif 'health' in kind and await table_exists(conn, 'health_records'):
        table = 'health_records'
        record = await conn.fetchrow(
            """
            INSERT INTO public.health_records (
              young_person_id, provider_id, record_type, event_datetime, title,
              summary, professional_name, outcome, follow_up_required,
              next_action_date, created_by, child_voice, workflow_status,
              significance, created_at, updated_at
            ) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,NULL,$9,$10,$11,$12,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            payload.get('record_type') or 'health_update',
            title,
            summary,
            payload.get('professional_name'),
            payload.get('outcome'),
            bool(action),
            user_id,
            payload.get('child_voice'),
            status_value,
            priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'standard',
        )

    elif 'education' in kind and await table_exists(conn, 'education_records'):
        table = 'education_records'
        record = await conn.fetchrow(
            """
            INSERT INTO public.education_records (
              young_person_id, provider_id, record_date, attendance_status,
              provision_name, behaviour_summary, learning_engagement, issue_raised,
              action_taken, professional_involved, achievement_note, created_by,
              child_voice, follow_up_required, workflow_status, significance,
              created_at, updated_at
            ) VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            payload.get('attendance_status'),
            payload.get('provision_name'),
            payload.get('behaviour_summary') or summary,
            payload.get('learning_engagement') or summary,
            evidence,
            action,
            payload.get('professional_involved'),
            payload.get('achievement_note'),
            user_id,
            payload.get('child_voice'),
            bool(action),
            status_value,
            priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'standard',
        )

    elif 'family' in kind or 'contact' in kind and await table_exists(conn, 'family_contact_records'):
        table = 'family_contact_records'
        record = await conn.fetchrow(
            """
            INSERT INTO public.family_contact_records (
              young_person_id, provider_id, contact_datetime, contact_type,
              contact_person, supervision_level, location, pre_contact_presentation,
              post_contact_presentation, child_voice, concerns, follow_up_required,
              created_by, workflow_status, significance, relationship_impact,
              created_at, updated_at
            ) VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            payload.get('contact_type') or 'family_time',
            payload.get('contact_person') or owner or 'Family contact',
            payload.get('supervision_level'),
            payload.get('location'),
            payload.get('pre_contact_presentation') or evidence,
            payload.get('post_contact_presentation') or summary,
            payload.get('child_voice'),
            payload.get('concerns'),
            bool(action),
            user_id,
            status_value,
            priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'standard',
            payload.get('relationship_impact'),
        )

    elif 'lifeecho' in kind or 'life story' in kind or 'memory' in kind and await table_exists(conn, 'life_story_entries'):
        table = 'life_story_entries'
        record = await conn.fetchrow(
            """
            INSERT INTO public.life_story_entries (
              provider_id, young_person_id, home_id, entry_date, entry_type,
              title, summary, child_voice, created_by, is_private,
              created_at, updated_at
            ) VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,NOW(),NOW())
            RETURNING id
            """,
            provider_id,
            young_person_id,
            home_id,
            payload.get('entry_type') or 'memory',
            title,
            summary,
            payload.get('child_voice'),
            user_id,
            bool(payload.get('is_private')),
        )

    elif 'handover' in kind and await table_exists(conn, 'handover_records'):
        table = 'handover_records'
        record = await conn.fetchrow(
            """
            INSERT INTO public.handover_records (
              young_person_id, provider_id, handover_date, shift_type, title,
              summary_text, status, generated_by, created_at, updated_at
            ) VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,NOW(),NOW())
            RETURNING id
            """,
            young_person_id,
            provider_id,
            payload.get('shift_type'),
            title,
            summary,
            status_value,
            user_id,
        )

    elif 'child voice' in kind and await table_exists(conn, 'child_voice_entries'):
        table = 'child_voice_entries'
        record = await conn.fetchrow(
            """
            INSERT INTO public.child_voice_entries (
              provider_id, home_id, young_person_id, voice_date, voice_text,
              context, how_voice_influenced_care, recorded_by, status,
              created_at, updated_at
            ) VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,NOW(),NOW())
            RETURNING id
            """,
            provider_id,
            home_id,
            young_person_id,
            summary,
            evidence or title,
            action,
            user_id,
            status_value if status_value in {'active', 'draft', 'archived'} else 'active',
        )

    elif ('manager' in kind or 'review' in kind) and await table_exists(conn, 'os_manager_reviews'):
        table = 'os_manager_reviews'
        pr = priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'medium'
        record = await conn.fetchrow(
            """
            INSERT INTO public.os_manager_reviews (
              provider_id, home_id, young_person_id, review_type, priority,
              title, summary, review_state, due_at, manager_comment, metadata, created_at
            ) VALUES ($1,$2,$3,'management_review',$4::public.os_priority,$5,$6,'due'::public.os_review_state,NULL,$7,$8::jsonb,NOW())
            RETURNING id
            """,
            provider_id,
            home_id,
            young_person_id,
            pr,
            title,
            summary,
            action,
            '{}',
        )

    if record:
        source_id = int(record['id']) if isinstance(record.get('id'), int) else None
        if source_id:
            await _insert_chronology(
                conn,
                young_person_id=young_person_id,
                home_id=home_id,
                provider_id=provider_id,
                source_table=table,
                source_id=source_id,
                category=table.replace('_', ' '),
                title=title,
                summary=summary,
                created_by=user_id,
                significance=priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'standard',
                child_voice_present=bool(payload.get('child_voice') or 'voice' in kind),
            )
            if priority_value in {'high', 'critical'} or 'manager' in kind or 'review' in kind or 'safeguard' in kind or 'incident' in kind or 'missing' in kind:
                manager_review = await _queue_manager_review(
                    conn,
                    young_person_id=young_person_id,
                    home_id=home_id,
                    provider_id=provider_id,
                    source_table=table,
                    source_id=source_id,
                    record_type=item_type,
                    priority='high' if priority_value == 'critical' else priority_value if priority_value in {'low', 'normal', 'high'} else 'normal',
                    reason=action or f'{item_type} requires review or oversight',
                )
            if action:
                await _create_command_item(
                    conn,
                    young_person_id=young_person_id,
                    home_id=home_id,
                    provider_id=provider_id,
                    source_table=table,
                    source_id=source_id,
                    title=f'Follow up: {title}',
                    summary=summary,
                    recommended_action=action,
                    priority=priority_value if priority_value in {'low', 'medium', 'high', 'critical'} else 'medium',
                    created_by=user_id,
                )

            return {
                'ok': True,
                'saved': True,
                'mode': 'canonical',
                'table': table,
                'id': source_id,
                'manager_review_id': manager_review.get('id') if manager_review else None,
            }

    return {'ok': False, 'saved': False, 'mode': 'unmapped', 'message': f'No canonical table available for {item_type}'}

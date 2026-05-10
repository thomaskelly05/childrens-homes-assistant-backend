from __future__ import annotations

from datetime import date, datetime
from typing import Any

from psycopg2.extras import Json


class YoungPeopleLinkingService:
    """
    Central linking / workflow engine for all young people's records.
    """

    @staticmethod
    def process_record_event(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        event_type: str = "created",
        title: str | None = None,
        summary: str | None = None,
        narrative: str | None = None,
        category: str | None = None,
        subcategory: str | None = None,
        significance: str | None = None,
        review_date: str | date | None = None,
        due_date: str | date | None = None,
        owner_id: int | None = None,
        created_by: int | None = None,
        workflow: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        workflow = workflow or {}
        metadata = metadata or {}

        result = {
            "source_table": source_table,
            "source_id": source_id,
            "young_person_id": young_person_id,
            "event_type": event_type,
            "chronology_event_id": None,
            "task_id": None,
            "manager_action_id": None,
            "safeguarding_record_id": None,
            "record_links_created": 0,
            "support_plan_links_created": 0,
            "monthly_review_links_created": 0,
            "standard_links_created": 0,
            "notes": [],
            "errors": [],
        }

        safe_title = title or YoungPeopleLinkingService._default_title(source_table, event_type)
        safe_summary = summary or title or YoungPeopleLinkingService._default_summary(source_table, event_type)
        safe_narrative = narrative or safe_summary

        link_chronology = bool(workflow.get("link_chronology", False))
        create_task = bool(workflow.get("create_task", False))
        manager_review = bool(workflow.get("manager_review", False))
        safeguarding = bool(workflow.get("safeguarding", False))
        link_support_plans = bool(workflow.get("link_support_plans", False))
        link_monthly_reviews = bool(workflow.get("link_monthly_reviews", False))
        link_quality_standards = bool(workflow.get("link_quality_standards", False))

        try:
            if link_chronology:
                chronology_id = YoungPeopleLinkingService._create_or_update_chronology_event(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    title=safe_title,
                    summary=safe_summary,
                    category=category or YoungPeopleLinkingService._default_category(source_table),
                    subcategory=subcategory or category or YoungPeopleLinkingService._default_subcategory(source_table),
                    significance=significance or YoungPeopleLinkingService._default_significance(source_table, metadata),
                    created_by=created_by,
                    metadata=metadata,
                    event_type=event_type,
                )
                result["chronology_event_id"] = chronology_id
                result["notes"].append("Chronology event processed.")

                if chronology_id:
                    if YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table="chronology_events",
                        to_id=chronology_id,
                        relationship_type="timeline_entry",
                        created_by=created_by,
                    ):
                        result["record_links_created"] += 1
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Chronology linking failed: {exc}")

        try:
            if create_task:
                task_id = YoungPeopleLinkingService._create_task_if_missing(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    title=f"Follow up: {safe_title}",
                    task=safe_summary,
                    owner_id=owner_id,
                    due_date=due_date or review_date,
                    task_type=YoungPeopleLinkingService._default_task_type(source_table),
                )
                result["task_id"] = task_id
                result["notes"].append("Task processed.")

                if task_id:
                    if YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table="tasks",
                        to_id=task_id,
                        relationship_type="follow_up_task",
                        created_by=created_by,
                    ):
                        result["record_links_created"] += 1
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Task creation failed: {exc}")

        try:
            if manager_review:
                manager_action_id = YoungPeopleLinkingService._create_manager_action_if_missing(
                    conn=conn,
                    young_person_id=young_person_id,
                    related_table=source_table,
                    related_id=source_id,
                    action_type=YoungPeopleLinkingService._default_manager_action_type(source_table),
                    note=f"Manager review required: {safe_title}",
                    action_by=created_by,
                )
                result["manager_action_id"] = manager_action_id
                result["notes"].append("Manager action processed.")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Manager action creation failed: {exc}")

        try:
            if safeguarding:
                safeguarding_id = YoungPeopleLinkingService._create_safeguarding_record(
                    conn=conn,
                    young_person_id=young_person_id,
                    incident_id=source_id if source_table == "incidents" else None,
                    safeguarding_category=category or YoungPeopleLinkingService._default_safeguarding_category(source_table),
                    concern_details=safe_narrative,
                    immediate_action_taken=metadata.get("response_actions"),
                    created_by=created_by,
                )
                result["safeguarding_record_id"] = safeguarding_id
                result["notes"].append("Safeguarding record created.")

                if safeguarding_id:
                    if YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table="safeguarding_records",
                        to_id=safeguarding_id,
                        relationship_type="safeguarding_link",
                        created_by=created_by,
                    ):
                        result["record_links_created"] += 1
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Safeguarding creation failed: {exc}")

        try:
            if link_support_plans:
                count = YoungPeopleLinkingService._link_to_active_support_plans(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    created_by=created_by,
                )
                result["support_plan_links_created"] = count
                if count:
                    result["record_links_created"] += count
                    result["notes"].append(f"Linked to {count} support plan(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Support plan linking failed: {exc}")

        try:
            if link_monthly_reviews:
                count = YoungPeopleLinkingService._link_to_relevant_monthly_reviews(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    created_by=created_by,
                    reason=f"Linked from {source_table} {event_type}",
                )
                result["monthly_review_links_created"] = count
                if count:
                    result["notes"].append(f"Linked to {count} monthly review record(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Monthly review linking failed: {exc}")

        try:
            if link_quality_standards:
                count = YoungPeopleLinkingService._link_quality_standards(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    metadata=metadata,
                    linked_by=created_by,
                )
                result["standard_links_created"] = count
                if count:
                    result["notes"].append(f"Linked to {count} quality standard(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Quality standards linking failed: {exc}")

        return result

    @staticmethod
    def _normalise_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
        return metadata if isinstance(metadata, dict) else {}

    @staticmethod
    def _normalise_due_date(value: str | date | None) -> str | date | None:
        if value in (None, "", "null"):
            return None
        return value

    @staticmethod
    def _normalise_task_date(value: str | date | None) -> str | date:
        safe_value = YoungPeopleLinkingService._normalise_due_date(value)
        return safe_value or date.today()

    @staticmethod
    def _resolve_home_id(conn, young_person_id: int) -> int | None:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT home_id
                FROM young_people
                WHERE id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return row.get("home_id") if isinstance(row, dict) else row[0]

    @staticmethod
    def _create_or_update_chronology_event(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        title: str,
        summary: str,
        category: str,
        subcategory: str | None,
        significance: str,
        created_by: int | None,
        metadata: dict[str, Any] | None = None,
        event_type: str = "created",
    ) -> int | None:
        now = datetime.utcnow()
        safe_metadata = YoungPeopleLinkingService._normalise_metadata(metadata)
        event_status = safe_metadata.get("workflow_status") or safe_metadata.get("event_status") or "recorded"

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM chronology_events
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id, source_table, source_id),
            )
            existing = cur.fetchone()

            if existing:
                existing_id = existing.get("id") if isinstance(existing, dict) else existing[0]

                cur.execute(
                    """
                    UPDATE chronology_events
                    SET
                        event_datetime = %s,
                        category = %s,
                        subcategory = %s,
                        title = %s,
                        summary = %s,
                        significance = %s,
                        created_by = COALESCE(created_by, %s),
                        auto_generated = TRUE,
                        is_visible = TRUE,
                        metadata_json = %s,
                        updated_at = %s,
                        event_status = %s
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        now,
                        category,
                        subcategory,
                        title,
                        summary,
                        significance,
                        created_by,
                        Json(safe_metadata),
                        now,
                        event_status,
                        existing_id,
                    ),
                )
                row = cur.fetchone()
                if not row:
                    return existing_id
                return row.get("id") if isinstance(row, dict) else row[0]

            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id,
                    event_datetime,
                    category,
                    subcategory,
                    title,
                    summary,
                    significance,
                    source_table,
                    source_id,
                    created_by,
                    auto_generated,
                    is_visible,
                    metadata_json,
                    created_at,
                    updated_at,
                    event_status
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    young_person_id,
                    now,
                    category,
                    subcategory,
                    title,
                    summary,
                    significance,
                    source_table,
                    source_id,
                    created_by,
                    True,
                    True,
                    Json(safe_metadata),
                    now,
                    now,
                    event_status,
                ),
            )
            row = cur.fetchone()
            if not row:
                return None
            return row.get("id") if isinstance(row, dict) else row[0]

    @staticmethod
    def _create_task_if_missing(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        title: str,
        task: str,
        owner_id: int | None,
        due_date: str | date | None,
        task_type: str,
    ) -> int | None:
        safe_due_date = YoungPeopleLinkingService._normalise_due_date(due_date)
        safe_task_date = YoungPeopleLinkingService._normalise_task_date(safe_due_date)
        home_id = YoungPeopleLinkingService._resolve_home_id(conn, young_person_id)
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM tasks
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                  AND task_type = %s
                  AND COALESCE(completed, FALSE) = FALSE
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id, source_table, source_id, task_type),
            )
            existing = cur.fetchone()

            if existing:
                existing_id = existing.get("id") if isinstance(existing, dict) else existing[0]

                cur.execute(
                    """
                    UPDATE tasks
                    SET
                        title = %s,
                        task = %s,
                        task_date = %s,
                        due_date = %s,
                        assigned_to_user_id = COALESCE(%s, assigned_to_user_id),
                        home_id = COALESCE(home_id, %s)
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        title,
                        task,
                        safe_task_date,
                        safe_due_date,
                        owner_id,
                        home_id,
                        existing_id,
                    ),
                )
                row = cur.fetchone()
                if not row:
                    return existing_id
                return row.get("id") if isinstance(row, dict) else row[0]

            cur.execute(
                """
                INSERT INTO tasks (
                    home_id,
                    title,
                    task,
                    task_date,
                    due_date,
                    young_person_id,
                    source_table,
                    source_id,
                    task_type,
                    assigned_to_user_id,
                    completed,
                    compliance_generated,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    home_id,
                    title,
                    task,
                    safe_task_date,
                    safe_due_date,
                    young_person_id,
                    source_table,
                    source_id,
                    task_type,
                    owner_id,
                    False,
                    False,
                    now,
                ),
            )
            row = cur.fetchone()
            if not row:
                return None
            return row.get("id") if isinstance(row, dict) else row[0]

    @staticmethod
    def _create_manager_action_if_missing(
        conn,
        *,
        young_person_id: int,
        related_table: str,
        related_id: int,
        action_type: str,
        note: str,
        action_by: int | None,
    ) -> int | None:
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM manager_actions
                WHERE young_person_id = %s
                  AND related_table = %s
                  AND related_id = %s
                  AND action_type = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id, related_table, related_id, action_type),
            )
            existing = cur.fetchone()

            if existing:
                return existing.get("id") if isinstance(existing, dict) else existing[0]

            cur.execute(
                """
                INSERT INTO manager_actions (
                    young_person_id,
                    action_type,
                    related_table,
                    related_id,
                    note,
                    action_by,
                    action_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    action_type,
                    related_table,
                    related_id,
                    note,
                    action_by,
                    now,
                ),
            )
            row = cur.fetchone()
            if not row:
                return None
            return row.get("id") if isinstance(row, dict) else row[0]

    @staticmethod
    def _create_safeguarding_record(
        conn,
        *,
        young_person_id: int,
        incident_id: int | None,
        safeguarding_category: str,
        concern_details: str,
        immediate_action_taken: str | None,
        created_by: int | None,
    ) -> int | None:
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO safeguarding_records (
                    young_person_id,
                    incident_id,
                    safeguarding_category,
                    concern_datetime,
                    disclosure_details,
                    concern_details,
                    immediate_action_taken,
                    referral_made,
                    referral_details,
                    outcome,
                    manager_review_status,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    young_person_id,
                    incident_id,
                    safeguarding_category,
                    now,
                    None,
                    concern_details,
                    immediate_action_taken,
                    False,
                    None,
                    "Open",
                    "pending_review",
                    created_by,
                    now,
                    now,
                ),
            )
            row = cur.fetchone()
            if not row:
                return None
            return row.get("id") if isinstance(row, dict) else row[0]

    @staticmethod
    def _create_record_link_if_missing(
        conn,
        *,
        young_person_id: int,
        from_table: str,
        from_id: int,
        to_table: str,
        to_id: int,
        relationship_type: str,
        created_by: int | None,
    ) -> bool:
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM record_links
                WHERE young_person_id = %s
                  AND from_table = %s
                  AND from_id = %s
                  AND to_table = %s
                  AND to_id = %s
                  AND relationship_type = %s
                LIMIT 1
                """,
                (
                    young_person_id,
                    from_table,
                    from_id,
                    to_table,
                    to_id,
                    relationship_type,
                ),
            )
            existing = cur.fetchone()
            if existing:
                return False

            cur.execute(
                """
                INSERT INTO record_links (
                    young_person_id,
                    from_table,
                    from_id,
                    to_table,
                    to_id,
                    relationship_type,
                    created_by,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    young_person_id,
                    from_table,
                    from_id,
                    to_table,
                    to_id,
                    relationship_type,
                    created_by,
                    now,
                ),
            )
        return True

    @staticmethod
    def _link_to_active_support_plans(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        created_by: int | None,
    ) -> int:
        count = 0

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                  AND LOWER(COALESCE(status, 'active')) NOT IN ('archived', 'closed', 'completed')
                ORDER BY created_at DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        for row in rows:
            plan_id = row.get("id") if isinstance(row, dict) else row[0]
            created = YoungPeopleLinkingService._create_record_link_if_missing(
                conn=conn,
                young_person_id=young_person_id,
                from_table=source_table,
                from_id=source_id,
                to_table="support_plans",
                to_id=plan_id,
                relationship_type="relevant_to_plan",
                created_by=created_by,
            )
            if created:
                count += 1

        return count

    @staticmethod
    def _link_to_relevant_monthly_reviews(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        created_by: int | None,
        reason: str,
    ) -> int:
        count = 0
        now = datetime.utcnow()

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM monthly_reviews
                WHERE young_person_id = %s
                ORDER BY review_month DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

            for row in rows:
                monthly_review_id = row.get("id") if isinstance(row, dict) else row[0]

                cur.execute(
                    """
                    SELECT id
                    FROM monthly_review_record_links
                    WHERE monthly_review_id = %s
                      AND source_table = %s
                      AND source_id = %s
                    LIMIT 1
                    """,
                    (monthly_review_id, source_table, source_id),
                )
                existing = cur.fetchone()
                if existing:
                    continue

                cur.execute(
                    """
                    INSERT INTO monthly_review_record_links (
                        monthly_review_id,
                        source_table,
                        source_id,
                        link_reason,
                        created_at
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        monthly_review_id,
                        source_table,
                        source_id,
                        reason,
                        now,
                    ),
                )
                count += 1

        return count

    @staticmethod
    def _link_quality_standards(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        metadata: dict[str, Any],
        linked_by: int | None,
    ) -> int:
        standards = metadata.get("quality_standards") or metadata.get("standard_codes") or []
        if not isinstance(standards, list):
            return 0

        count = 0
        now = datetime.utcnow()

        with conn.cursor() as cur:
            for code in standards:
                if not code:
                    continue

                cur.execute(
                    """
                    SELECT id
                    FROM record_standard_links
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                      AND standard_code = %s
                    LIMIT 1
                    """,
                    (young_person_id, source_table, source_id, code),
                )
                existing = cur.fetchone()
                if existing:
                    continue

                cur.execute(
                    """
                    INSERT INTO record_standard_links (
                        young_person_id,
                        source_table,
                        source_id,
                        standard_code,
                        evidence_strength,
                        rationale,
                        linked_by,
                        auto_linked,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        young_person_id,
                        source_table,
                        source_id,
                        code,
                        metadata.get("evidence_strength") or "medium",
                        metadata.get("standards_rationale"),
                        linked_by,
                        True,
                        now,
                        now,
                    ),
                )
                count += 1

        return count

    @staticmethod
    def _default_title(source_table: str, event_type: str) -> str:
        labels = {
            "daily_notes": "Daily note",
            "incidents": "Incident",
            "risk_assessments": "Risk assessment",
            "health_records": "Health record",
            "education_records": "Education record",
            "family_contact_records": "Family contact",
            "keywork_sessions": "Keywork session",
            "support_plans": "Support plan",
            "monthly_reviews": "Monthly review",
            "achievement_records": "Achievement record",
        }
        return f"{labels.get(source_table, 'Record')} {event_type}".strip()

    @staticmethod
    def _default_summary(source_table: str, event_type: str) -> str:
        return f"{YoungPeopleLinkingService._default_title(source_table, event_type)} recorded."

    @staticmethod
    def _default_category(source_table: str) -> str:
        mapping = {
            "daily_notes": "daily_note",
            "incidents": "incident",
            "risk_assessments": "risk",
            "health_records": "health",
            "education_records": "education",
            "family_contact_records": "family",
            "keywork_sessions": "keywork",
            "support_plans": "support_plan",
            "monthly_reviews": "monthly_review",
            "achievement_records": "achievement",
        }
        return mapping.get(source_table, "record")

    @staticmethod
    def _default_subcategory(source_table: str) -> str:
        return YoungPeopleLinkingService._default_category(source_table)

    @staticmethod
    def _default_significance(source_table: str, metadata: dict[str, Any]) -> str:
        if metadata.get("severity") in {"critical", "high"}:
            return "high"
        if metadata.get("severity") == "medium":
            return "medium"

        mapping = {
            "incidents": "high",
            "risk_assessments": "high",
            "safeguarding_records": "high",
            "daily_notes": "medium",
            "health_records": "medium",
            "education_records": "medium",
            "family_contact_records": "medium",
            "keywork_sessions": "medium",
            "support_plans": "medium",
            "achievement_records": "low",
        }
        return mapping.get(source_table, "medium")

    @staticmethod
    def _default_task_type(source_table: str) -> str:
        mapping = {
            "daily_notes": "daily_note_follow_up",
            "incidents": "incident_follow_up",
            "risk_assessments": "risk_review",
            "health_records": "health_follow_up",
            "education_records": "education_follow_up",
            "family_contact_records": "family_follow_up",
            "keywork_sessions": "keywork_follow_up",
            "support_plans": "plan_review",
            "monthly_reviews": "monthly_review_action",
        }
        return mapping.get(source_table, "follow_up")

    @staticmethod
    def _default_manager_action_type(source_table: str) -> str:
        mapping = {
            "daily_notes": "daily_note_review_required",
            "incidents": "incident_review_required",
            "risk_assessments": "risk_review_required",
            "health_records": "health_review_required",
            "education_records": "education_review_required",
            "family_contact_records": "family_review_required",
            "keywork_sessions": "keywork_review_required",
            "support_plans": "support_plan_review_required",
            "monthly_reviews": "monthly_review_required",
        }
        return mapping.get(source_table, "record_review_required")

    @staticmethod
    def _default_safeguarding_category(source_table: str) -> str:
        mapping = {
            "incidents": "incident",
            "risk_assessments": "risk",
            "daily_notes": "daily_note",
            "family_contact_records": "family_contact",
            "health_records": "health",
        }
        return mapping.get(source_table, "general")
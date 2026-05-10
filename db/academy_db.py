from __future__ import annotations

from datetime import date, datetime
from typing import Any

from db.connection import get_db_connection


# =========================================================
# Helpers
# =========================================================


def _fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    return [dict(row) for row in rows]


def _fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
    return dict(row) if row else None


def _execute(
    query: str,
    params: tuple[Any, ...] = (),
    *,
    fetchone: bool = False,
    fetchall: bool = False,
) -> dict[str, Any] | list[dict[str, Any]] | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)

            result: dict[str, Any] | list[dict[str, Any]] | None = None
            if fetchone:
                row = cur.fetchone()
                result = dict(row) if row else None
            elif fetchall:
                result = [dict(row) for row in cur.fetchall()]

            conn.commit()
            return result


def _build_where(filters: list[str]) -> str:
    if not filters:
        return ""
    return " WHERE " + " AND ".join(filters)


# =========================================================
# Categories / Frameworks
# =========================================================


def list_categories(active: bool | None = True) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if active is not None:
        filters.append("c.active = %s")
        params.append(active)

    query = f"""
        SELECT
            c.id,
            c.code,
            c.name,
            c.description,
            c.audience_scope,
            c.sort_order,
            c.active,
            c.created_at
        FROM academy_categories c
        {_build_where(filters)}
        ORDER BY c.sort_order ASC, c.name ASC
    """
    return _fetch_all(query, tuple(params))


def list_frameworks(active: bool | None = True) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if active is not None:
        filters.append("f.active = %s")
        params.append(active)

    query = f"""
        SELECT
            f.id,
            f.framework_code,
            f.framework_name,
            f.framework_type,
            f.description,
            f.active,
            f.sort_order,
            f.created_at
        FROM academy_frameworks f
        {_build_where(filters)}
        ORDER BY f.sort_order ASC, f.framework_name ASC
    """
    return _fetch_all(query, tuple(params))


def list_framework_items(
    *,
    framework_code: str | None = None,
    framework_id: int | None = None,
    active: bool | None = True,
) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if framework_code:
        filters.append("f.framework_code = %s")
        params.append(framework_code)

    if framework_id is not None:
        filters.append("fi.framework_id = %s")
        params.append(framework_id)

    if active is not None:
        filters.append("fi.active = %s")
        params.append(active)

    query = f"""
        SELECT
            fi.id,
            fi.framework_id,
            f.framework_code,
            f.framework_name,
            f.framework_type,
            fi.item_code,
            fi.item_name,
            fi.item_short_label,
            fi.item_description,
            fi.external_reference,
            fi.parent_item_id,
            fi.sort_order,
            fi.active,
            fi.created_at
        FROM academy_framework_items fi
        INNER JOIN academy_frameworks f
            ON f.id = fi.framework_id
        {_build_where(filters)}
        ORDER BY
            f.sort_order ASC,
            fi.sort_order ASC,
            fi.item_name ASC
    """
    return _fetch_all(query, tuple(params))


# =========================================================
# Modules
# =========================================================


def list_modules(
    *,
    category_id: int | None = None,
    learning_type: str | None = None,
    difficulty_level: str | None = None,
    module_family: str | None = None,
    active: bool | None = True,
) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if category_id is not None:
        filters.append("m.category_id = %s")
        params.append(category_id)

    if learning_type:
        filters.append("m.learning_type = %s")
        params.append(learning_type)

    if difficulty_level:
        filters.append("m.difficulty_level = %s")
        params.append(difficulty_level)

    if module_family:
        filters.append("m.module_family = %s")
        params.append(module_family)

    if active is not None:
        filters.append("m.active = %s")
        params.append(active)

    query = f"""
        SELECT
            m.id,
            m.category_id,
            c.code AS category_code,
            c.name AS category_name,
            m.code,
            m.title,
            m.summary,
            m.description,
            m.module_family,
            m.learning_type,
            m.difficulty_level,
            m.delivery_mode,
            m.estimated_minutes,
            m.requires_quiz,
            m.requires_workbook,
            m.requires_assessor_review,
            m.requires_manager_signoff,
            m.certificate_on_completion,
            m.renewal_months,
            m.active,
            m.version,
            m.created_at,
            m.updated_at
        FROM academy_modules m
        LEFT JOIN academy_categories c
            ON c.id = m.category_id
        {_build_where(filters)}
        ORDER BY c.sort_order ASC NULLS LAST, m.title ASC
    """
    return _fetch_all(query, tuple(params))


def get_module_by_id(module_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            m.id,
            m.category_id,
            c.code AS category_code,
            c.name AS category_name,
            m.code,
            m.title,
            m.summary,
            m.description,
            m.module_family,
            m.learning_type,
            m.difficulty_level,
            m.delivery_mode,
            m.estimated_minutes,
            m.requires_quiz,
            m.requires_workbook,
            m.requires_assessor_review,
            m.requires_manager_signoff,
            m.certificate_on_completion,
            m.renewal_months,
            m.active,
            m.version,
            m.created_at,
            m.updated_at
        FROM academy_modules m
        LEFT JOIN academy_categories c
            ON c.id = m.category_id
        WHERE m.id = %s
        LIMIT 1
    """
    return _fetch_one(query, (module_id,))


def get_module_by_code(code: str) -> dict[str, Any] | None:
    query = """
        SELECT
            m.id,
            m.category_id,
            c.code AS category_code,
            c.name AS category_name,
            m.code,
            m.title,
            m.summary,
            m.description,
            m.module_family,
            m.learning_type,
            m.difficulty_level,
            m.delivery_mode,
            m.estimated_minutes,
            m.requires_quiz,
            m.requires_workbook,
            m.requires_assessor_review,
            m.requires_manager_signoff,
            m.certificate_on_completion,
            m.renewal_months,
            m.active,
            m.version,
            m.created_at,
            m.updated_at
        FROM academy_modules m
        LEFT JOIN academy_categories c
            ON c.id = m.category_id
        WHERE m.code = %s
        LIMIT 1
    """
    return _fetch_one(query, (code,))


def create_module(payload: dict[str, Any]) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_modules (
            category_id,
            code,
            title,
            summary,
            description,
            module_family,
            learning_type,
            difficulty_level,
            delivery_mode,
            estimated_minutes,
            requires_quiz,
            requires_workbook,
            requires_assessor_review,
            requires_manager_signoff,
            certificate_on_completion,
            renewal_months,
            active,
            version
        )
        VALUES (
            %(category_id)s,
            %(code)s,
            %(title)s,
            %(summary)s,
            %(description)s,
            %(module_family)s,
            %(learning_type)s,
            %(difficulty_level)s,
            %(delivery_mode)s,
            %(estimated_minutes)s,
            %(requires_quiz)s,
            %(requires_workbook)s,
            %(requires_assessor_review)s,
            %(requires_manager_signoff)s,
            %(certificate_on_completion)s,
            %(renewal_months)s,
            %(active)s,
            %(version)s
        )
        RETURNING *
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, payload)
            row = cur.fetchone()
        conn.commit()
    return dict(row) if row else None


def update_module(module_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    allowed_fields = {
        "category_id",
        "code",
        "title",
        "summary",
        "description",
        "module_family",
        "learning_type",
        "difficulty_level",
        "delivery_mode",
        "estimated_minutes",
        "requires_quiz",
        "requires_workbook",
        "requires_assessor_review",
        "requires_manager_signoff",
        "certificate_on_completion",
        "renewal_months",
        "active",
        "version",
    }

    set_clauses: list[str] = []
    params: list[Any] = []

    for field, value in updates.items():
        if field not in allowed_fields:
            continue
        set_clauses.append(f"{field} = %s")
        params.append(value)

    if not set_clauses:
        return get_module_by_id(module_id)

    set_clauses.append("updated_at = NOW()")
    params.append(module_id)

    query = f"""
        UPDATE academy_modules
        SET {", ".join(set_clauses)}
        WHERE id = %s
        RETURNING *
    """
    return _execute(query, tuple(params), fetchone=True)


def list_module_lessons(module_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            module_id,
            title,
            lesson_type,
            content_html,
            content_json,
            sort_order,
            estimated_minutes,
            is_required,
            version,
            created_at,
            updated_at
        FROM academy_lessons
        WHERE module_id = %s
        ORDER BY sort_order ASC, id ASC
    """
    return _fetch_all(query, (module_id,))


def get_module_quiz(module_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            module_id,
            title,
            pass_mark_percent,
            max_attempts,
            randomise_questions,
            version,
            created_at
        FROM academy_quizzes
        WHERE module_id = %s
        ORDER BY id ASC
        LIMIT 1
    """
    return _fetch_one(query, (module_id,))


def list_quiz_questions(quiz_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            q.id,
            q.quiz_id,
            q.question_text,
            q.question_type,
            q.explanation,
            q.sort_order,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', a.id,
                        'answer_text', a.answer_text,
                        'is_correct', a.is_correct,
                        'sort_order', a.sort_order
                    )
                    ORDER BY a.sort_order ASC, a.id ASC
                ) FILTER (WHERE a.id IS NOT NULL),
                '[]'::json
            ) AS answers
        FROM academy_quiz_questions q
        LEFT JOIN academy_quiz_answers a
            ON a.question_id = q.id
        WHERE q.quiz_id = %s
        GROUP BY
            q.id,
            q.quiz_id,
            q.question_text,
            q.question_type,
            q.explanation,
            q.sort_order
        ORDER BY q.sort_order ASC, q.id ASC
    """
    return _fetch_all(query, (quiz_id,))


def list_module_scenarios(module_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            module_id,
            title,
            scenario_text,
            expected_response_guidance,
            scoring_rubric,
            created_at
        FROM academy_scenarios
        WHERE module_id = %s
        ORDER BY id ASC
    """
    return _fetch_all(query, (module_id,))


def list_module_reflections(module_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            module_id,
            prompt_text,
            guidance_text,
            created_at
        FROM academy_reflections
        WHERE module_id = %s
        ORDER BY id ASC
    """
    return _fetch_all(query, (module_id,))


def list_module_mappings(module_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            mm.id,
            mm.module_id,
            mm.mapping_note,
            fi.id AS framework_item_id,
            fi.item_code AS framework_item_code,
            fi.item_name AS framework_item_name,
            fi.item_short_label,
            fi.external_reference,
            f.id AS framework_id,
            f.framework_code,
            f.framework_name,
            f.framework_type
        FROM academy_module_mappings mm
        INNER JOIN academy_framework_items fi
            ON fi.id = mm.framework_item_id
        INNER JOIN academy_frameworks f
            ON f.id = fi.framework_id
        WHERE mm.module_id = %s
        ORDER BY
            f.sort_order ASC,
            fi.sort_order ASC,
            fi.item_name ASC
    """
    return _fetch_all(query, (module_id,))


# =========================================================
# Workbooks
# =========================================================


def list_workbooks(
    *,
    module_id: int | None = None,
    qualification_unit_id: int | None = None,
    workbook_type: str | None = None,
    active: bool | None = True,
) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if module_id is not None:
        filters.append("w.module_id = %s")
        params.append(module_id)

    if qualification_unit_id is not None:
        filters.append("w.qualification_unit_id = %s")
        params.append(qualification_unit_id)

    if workbook_type:
        filters.append("w.workbook_type = %s")
        params.append(workbook_type)

    if active is not None:
        filters.append("w.active = %s")
        params.append(active)

    query = f"""
        SELECT
            w.id,
            w.qualification_unit_id,
            w.module_id,
            w.code,
            w.title,
            w.workbook_type,
            w.version,
            w.is_assessable,
            w.requires_assessor_review,
            w.requires_manager_confirmation,
            w.active,
            w.created_at,
            w.updated_at
        FROM academy_workbooks w
        {_build_where(filters)}
        ORDER BY w.title ASC
    """
    return _fetch_all(query, tuple(params))


def get_workbook_by_id(workbook_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            w.id,
            w.qualification_unit_id,
            w.module_id,
            w.code,
            w.title,
            w.workbook_type,
            w.version,
            w.is_assessable,
            w.requires_assessor_review,
            w.requires_manager_confirmation,
            w.active,
            w.created_at,
            w.updated_at
        FROM academy_workbooks w
        WHERE w.id = %s
        LIMIT 1
    """
    return _fetch_one(query, (workbook_id,))


def get_workbook_by_code(code: str) -> dict[str, Any] | None:
    query = """
        SELECT
            w.id,
            w.qualification_unit_id,
            w.module_id,
            w.code,
            w.title,
            w.workbook_type,
            w.version,
            w.is_assessable,
            w.requires_assessor_review,
            w.requires_manager_confirmation,
            w.active,
            w.created_at,
            w.updated_at
        FROM academy_workbooks w
        WHERE w.code = %s
        LIMIT 1
    """
    return _fetch_one(query, (code,))


def list_workbook_sections(workbook_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            workbook_id,
            title,
            guidance_text,
            section_type,
            sort_order,
            required
        FROM academy_workbook_sections
        WHERE workbook_id = %s
        ORDER BY sort_order ASC, id ASC
    """
    return _fetch_all(query, (workbook_id,))


def list_workbook_questions(workbook_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            q.id,
            q.section_id,
            s.title AS section_title,
            s.section_type,
            q.prompt_text,
            q.response_type,
            q.guidance_text,
            q.min_words,
            q.max_words,
            q.required,
            q.sort_order
        FROM academy_workbook_questions q
        INNER JOIN academy_workbook_sections s
            ON s.id = q.section_id
        WHERE s.workbook_id = %s
        ORDER BY s.sort_order ASC, q.sort_order ASC, q.id ASC
    """
    return _fetch_all(query, (workbook_id,))


def create_workbook_submission(
    *,
    workbook_id: int,
    user_id: int,
    qualification_enrolment_id: int | None = None,
    assigned_by_user_id: int | None = None,
    assessor_user_id: int | None = None,
    due_date: date | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_workbook_submissions (
            workbook_id,
            user_id,
            qualification_enrolment_id,
            assigned_by_user_id,
            assessor_user_id,
            status,
            attempt_number,
            due_date
        )
        VALUES (%s, %s, %s, %s, %s, 'draft', 1, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            workbook_id,
            user_id,
            qualification_enrolment_id,
            assigned_by_user_id,
            assessor_user_id,
            due_date,
        ),
        fetchone=True,
    )


def get_workbook_submission_by_id(submission_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            ws.id,
            ws.workbook_id,
            ws.user_id,
            ws.qualification_enrolment_id,
            ws.assigned_by_user_id,
            ws.assessor_user_id,
            ws.status,
            ws.attempt_number,
            ws.submitted_at,
            ws.reviewed_at,
            ws.completed_at,
            ws.due_date,
            ws.assessor_decision,
            ws.assessor_summary,
            ws.manager_confirmed_by_user_id,
            ws.manager_confirmed_at,
            ws.locked_at,
            ws.created_at,
            ws.updated_at
        FROM academy_workbook_submissions ws
        WHERE ws.id = %s
        LIMIT 1
    """
    return _fetch_one(query, (submission_id,))


def get_latest_workbook_submission(workbook_id: int, user_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            ws.id,
            ws.workbook_id,
            ws.user_id,
            ws.qualification_enrolment_id,
            ws.assigned_by_user_id,
            ws.assessor_user_id,
            ws.status,
            ws.attempt_number,
            ws.submitted_at,
            ws.reviewed_at,
            ws.completed_at,
            ws.due_date,
            ws.assessor_decision,
            ws.assessor_summary,
            ws.manager_confirmed_by_user_id,
            ws.manager_confirmed_at,
            ws.locked_at,
            ws.created_at,
            ws.updated_at
        FROM academy_workbook_submissions ws
        WHERE ws.workbook_id = %s
          AND ws.user_id = %s
        ORDER BY ws.attempt_number DESC, ws.created_at DESC
        LIMIT 1
    """
    return _fetch_one(query, (workbook_id, user_id))


def list_user_workbook_submissions(
    user_id: int,
    *,
    status: str | None = None,
) -> list[dict[str, Any]]:
    filters = ["ws.user_id = %s"]
    params: list[Any] = [user_id]

    if status:
        filters.append("ws.status = %s")
        params.append(status)

    query = f"""
        SELECT
            ws.id AS submission_id,
            ws.workbook_id,
            w.code AS workbook_code,
            w.title AS workbook_title,
            w.workbook_type,
            ws.user_id,
            ws.status,
            ws.attempt_number,
            ws.due_date,
            ws.submitted_at,
            ws.reviewed_at,
            ws.completed_at,
            ws.assessor_decision,
            ws.assessor_summary,
            ws.assessor_user_id,
            ws.manager_confirmed_by_user_id,
            ws.manager_confirmed_at,
            CASE
                WHEN ws.due_date IS NOT NULL
                 AND ws.status NOT IN ('accepted', 'completed', 'locked')
                 AND ws.due_date < CURRENT_DATE
                THEN TRUE
                ELSE FALSE
            END AS is_overdue
        FROM academy_workbook_submissions ws
        INNER JOIN academy_workbooks w
            ON w.id = ws.workbook_id
        {_build_where(filters)}
        ORDER BY ws.updated_at DESC, ws.id DESC
    """
    return _fetch_all(query, tuple(params))


def upsert_workbook_answer(
    *,
    submission_id: int,
    question_id: int,
    answer_text: str | None = None,
    answer_json: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_workbook_answers (
            submission_id,
            question_id,
            answer_text,
            answer_json,
            saved_at
        )
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (submission_id, question_id)
        DO UPDATE SET
            answer_text = EXCLUDED.answer_text,
            answer_json = EXCLUDED.answer_json,
            saved_at = NOW()
        RETURNING *
    """
    return _execute(
        query,
        (submission_id, question_id, answer_text, answer_json),
        fetchone=True,
    )


def list_workbook_answers(submission_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            submission_id,
            question_id,
            answer_text,
            answer_json,
            saved_at
        FROM academy_workbook_answers
        WHERE submission_id = %s
        ORDER BY question_id ASC
    """
    return _fetch_all(query, (submission_id,))


def mark_workbook_submission_submitted(submission_id: int) -> dict[str, Any] | None:
    query = """
        UPDATE academy_workbook_submissions
        SET
            status = 'submitted',
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
        RETURNING *
    """
    return _execute(query, (submission_id,), fetchone=True)


def update_workbook_submission_review(
    *,
    submission_id: int,
    status: str,
    assessor_decision: str | None,
    assessor_summary: str | None,
    assessor_user_id: int,
) -> dict[str, Any] | None:
    query = """
        UPDATE academy_workbook_submissions
        SET
            status = %s,
            assessor_decision = %s,
            assessor_summary = %s,
            assessor_user_id = %s,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
        RETURNING *
    """
    return _execute(
        query,
        (
            status,
            assessor_decision,
            assessor_summary,
            assessor_user_id,
            submission_id,
        ),
        fetchone=True,
    )


def complete_workbook_submission(submission_id: int) -> dict[str, Any] | None:
    query = """
        UPDATE academy_workbook_submissions
        SET
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
        RETURNING *
    """
    return _execute(query, (submission_id,), fetchone=True)


def add_workbook_feedback(
    *,
    submission_id: int,
    feedback_by_user_id: int,
    feedback_type: str,
    feedback_text: str,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_workbook_feedback (
            submission_id,
            feedback_by_user_id,
            feedback_type,
            feedback_text
        )
        VALUES (%s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (submission_id, feedback_by_user_id, feedback_type, feedback_text),
        fetchone=True,
    )


def list_workbook_feedback(submission_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            submission_id,
            feedback_by_user_id,
            feedback_type,
            feedback_text,
            created_at
        FROM academy_workbook_feedback
        WHERE submission_id = %s
        ORDER BY created_at ASC, id ASC
    """
    return _fetch_all(query, (submission_id,))


def create_workbook_resubmission(
    *,
    previous_submission_id: int,
    workbook_id: int,
    user_id: int,
    qualification_enrolment_id: int | None = None,
    assigned_by_user_id: int | None = None,
    assessor_user_id: int | None = None,
    due_date: date | None = None,
) -> dict[str, Any] | None:
    previous = get_workbook_submission_by_id(previous_submission_id)
    if not previous:
        return None

    next_attempt = int(previous.get("attempt_number") or 1) + 1

    query = """
        INSERT INTO academy_workbook_submissions (
            workbook_id,
            user_id,
            qualification_enrolment_id,
            assigned_by_user_id,
            assessor_user_id,
            status,
            attempt_number,
            due_date
        )
        VALUES (%s, %s, %s, %s, %s, 'draft', %s, %s)
        RETURNING *
    """
    new_submission = _execute(
        query,
        (
            workbook_id,
            user_id,
            qualification_enrolment_id,
            assigned_by_user_id,
            assessor_user_id,
            next_attempt,
            due_date,
        ),
        fetchone=True,
    )
    if not new_submission:
        return None

    link_query = """
        INSERT INTO academy_workbook_resubmissions (
            previous_submission_id,
            new_submission_id
        )
        VALUES (%s, %s)
        RETURNING *
    """
    _execute(
        link_query,
        (previous_submission_id, int(new_submission["id"])),
        fetchone=True,
    )
    return new_submission


# =========================================================
# Evidence
# =========================================================


def list_user_evidence(user_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            user_id,
            evidence_type,
            title,
            description,
            file_url,
            external_reference,
            evidence_date,
            created_by_user_id,
            created_at
        FROM academy_evidence_items
        WHERE user_id = %s
        ORDER BY created_at DESC, id DESC
    """
    return _fetch_all(query, (user_id,))


def get_evidence_by_id(evidence_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            user_id,
            evidence_type,
            title,
            description,
            file_url,
            external_reference,
            evidence_date,
            created_by_user_id,
            created_at
        FROM academy_evidence_items
        WHERE id = %s
        LIMIT 1
    """
    return _fetch_one(query, (evidence_id,))


def create_evidence(
    *,
    user_id: int,
    created_by_user_id: int | None,
    evidence_type: str,
    title: str,
    description: str | None = None,
    file_url: str | None = None,
    external_reference: str | None = None,
    evidence_date: date | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_evidence_items (
            user_id,
            evidence_type,
            title,
            description,
            file_url,
            external_reference,
            evidence_date,
            created_by_user_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            evidence_type,
            title,
            description,
            file_url,
            external_reference,
            evidence_date,
            created_by_user_id,
        ),
        fetchone=True,
    )


def update_evidence(evidence_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    allowed_fields = {
        "title",
        "description",
        "file_url",
        "external_reference",
        "evidence_date",
    }

    set_clauses: list[str] = []
    params: list[Any] = []

    for field, value in updates.items():
        if field not in allowed_fields:
            continue
        set_clauses.append(f"{field} = %s")
        params.append(value)

    if not set_clauses:
        return get_evidence_by_id(evidence_id)

    params.append(evidence_id)

    query = f"""
        UPDATE academy_evidence_items
        SET {", ".join(set_clauses)}
        WHERE id = %s
        RETURNING *
    """
    return _execute(query, tuple(params), fetchone=True)


def link_evidence(
    *,
    evidence_item_id: int,
    workbook_submission_id: int | None = None,
    qualification_unit_id: int | None = None,
    module_id: int | None = None,
    competency_id: int | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_evidence_links (
            evidence_item_id,
            workbook_submission_id,
            qualification_unit_id,
            module_id,
            competency_id
        )
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            evidence_item_id,
            workbook_submission_id,
            qualification_unit_id,
            module_id,
            competency_id,
        ),
        fetchone=True,
    )


def review_evidence(
    *,
    evidence_item_id: int,
    reviewed_by_user_id: int,
    decision: str,
    comments: str | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_evidence_reviews (
            evidence_item_id,
            reviewed_by_user_id,
            decision,
            comments
        )
        VALUES (%s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (evidence_item_id, reviewed_by_user_id, decision, comments),
        fetchone=True,
    )


# =========================================================
# Qualifications
# =========================================================


def list_qualifications(active: bool | None = True) -> list[dict[str, Any]]:
    params: list[Any] = []
    filters: list[str] = []

    if active is not None:
        filters.append("q.active = %s")
        params.append(active)

    query = f"""
        SELECT
            q.id,
            q.code,
            q.title,
            q.level,
            q.awarding_body,
            q.qualification_type,
            q.qualification_family,
            q.description,
            q.total_credits,
            q.mandatory_unit_count,
            q.optional_unit_count,
            q.active,
            q.version,
            q.created_at,
            q.updated_at
        FROM academy_qualifications q
        {_build_where(filters)}
        ORDER BY q.level ASC, q.title ASC
    """
    return _fetch_all(query, tuple(params))


def get_qualification_by_id(qualification_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            code,
            title,
            level,
            awarding_body,
            qualification_type,
            qualification_family,
            description,
            total_credits,
            mandatory_unit_count,
            optional_unit_count,
            active,
            version,
            created_at,
            updated_at
        FROM academy_qualifications
        WHERE id = %s
        LIMIT 1
    """
    return _fetch_one(query, (qualification_id,))


def get_qualification_by_code(code: str) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            code,
            title,
            level,
            awarding_body,
            qualification_type,
            qualification_family,
            description,
            total_credits,
            mandatory_unit_count,
            optional_unit_count,
            active,
            version,
            created_at,
            updated_at
        FROM academy_qualifications
        WHERE code = %s
        LIMIT 1
    """
    return _fetch_one(query, (code,))


def list_qualification_units(qualification_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            qualification_id,
            unit_code,
            title,
            unit_group,
            credit_value,
            guided_learning_hours,
            mandatory,
            summary,
            learning_outcomes_json,
            assessment_criteria_json,
            sort_order,
            version,
            active,
            created_at,
            updated_at
        FROM academy_qualification_units
        WHERE qualification_id = %s
          AND active = TRUE
        ORDER BY sort_order ASC, id ASC
    """
    return _fetch_all(query, (qualification_id,))


def get_qualification_unit_by_id(unit_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            qualification_id,
            unit_code,
            title,
            unit_group,
            credit_value,
            guided_learning_hours,
            mandatory,
            summary,
            learning_outcomes_json,
            assessment_criteria_json,
            sort_order,
            version,
            active,
            created_at,
            updated_at
        FROM academy_qualification_units
        WHERE id = %s
        LIMIT 1
    """
    return _fetch_one(query, (unit_id,))


def list_qualification_unit_mappings(unit_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            qum.id,
            qum.qualification_unit_id,
            qum.module_id,
            m.code AS module_code,
            m.title AS module_title,
            qum.mapping_note,
            fi.id AS framework_item_id,
            fi.item_code AS framework_item_code,
            fi.item_name AS framework_item_name,
            fi.item_short_label,
            fi.external_reference,
            f.id AS framework_id,
            f.framework_code,
            f.framework_name,
            f.framework_type
        FROM academy_qualification_unit_mappings qum
        LEFT JOIN academy_modules m
            ON m.id = qum.module_id
        LEFT JOIN academy_framework_items fi
            ON fi.id = qum.framework_item_id
        LEFT JOIN academy_frameworks f
            ON f.id = fi.framework_id
        WHERE qum.qualification_unit_id = %s
        ORDER BY
            f.sort_order ASC NULLS LAST,
            fi.sort_order ASC NULLS LAST,
            m.title ASC NULLS LAST
    """
    return _fetch_all(query, (unit_id,))


def enrol_user_on_qualification(
    *,
    user_id: int,
    qualification_id: int,
    enrolled_by_user_id: int | None = None,
    assessor_user_id: int | None = None,
    iqa_user_id: int | None = None,
    start_date: date | None = None,
    target_end_date: date | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_user_qualification_enrolments (
            user_id,
            qualification_id,
            enrolled_by_user_id,
            assessor_user_id,
            iqa_user_id,
            status,
            start_date,
            target_end_date
        )
        VALUES (%s, %s, %s, %s, %s, 'enrolled', %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            qualification_id,
            enrolled_by_user_id,
            assessor_user_id,
            iqa_user_id,
            start_date,
            target_end_date,
        ),
        fetchone=True,
    )


def get_user_qualification_enrolment(
    user_id: int,
    qualification_id: int,
) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            user_id,
            qualification_id,
            enrolled_by_user_id,
            assessor_user_id,
            iqa_user_id,
            status,
            start_date,
            target_end_date,
            achieved_date,
            withdrawn_date,
            notes,
            created_at,
            updated_at
        FROM academy_user_qualification_enrolments
        WHERE user_id = %s
          AND qualification_id = %s
        LIMIT 1
    """
    return _fetch_one(query, (user_id, qualification_id))


def get_qualification_enrolment_by_id(enrolment_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            user_id,
            qualification_id,
            enrolled_by_user_id,
            assessor_user_id,
            iqa_user_id,
            status,
            start_date,
            target_end_date,
            achieved_date,
            withdrawn_date,
            notes,
            created_at,
            updated_at
        FROM academy_user_qualification_enrolments
        WHERE id = %s
        LIMIT 1
    """
    return _fetch_one(query, (enrolment_id,))


def update_qualification_enrolment(
    enrolment_id: int,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    allowed_fields = {
        "status",
        "assessor_user_id",
        "iqa_user_id",
        "target_end_date",
        "notes",
        "achieved_date",
        "withdrawn_date",
    }

    set_clauses: list[str] = []
    params: list[Any] = []

    for field, value in updates.items():
        if field not in allowed_fields:
            continue
        set_clauses.append(f"{field} = %s")
        params.append(value)

    if not set_clauses:
        return get_qualification_enrolment_by_id(enrolment_id)

    set_clauses.append("updated_at = NOW()")
    params.append(enrolment_id)

    query = f"""
        UPDATE academy_user_qualification_enrolments
        SET {", ".join(set_clauses)}
        WHERE id = %s
        RETURNING *
    """
    return _execute(query, tuple(params), fetchone=True)


def list_user_qualification_enrolments(user_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            uqe.id,
            uqe.user_id,
            uqe.qualification_id,
            q.code AS qualification_code,
            q.title AS qualification_title,
            q.level AS qualification_level,
            q.awarding_body,
            uqe.assessor_user_id,
            uqe.iqa_user_id,
            uqe.status,
            uqe.start_date,
            uqe.target_end_date,
            uqe.achieved_date,
            uqe.withdrawn_date,
            uqe.notes,
            uqe.created_at,
            uqe.updated_at
        FROM academy_user_qualification_enrolments uqe
        INNER JOIN academy_qualifications q
            ON q.id = uqe.qualification_id
        WHERE uqe.user_id = %s
        ORDER BY q.level ASC, q.title ASC
    """
    return _fetch_all(query, (user_id,))


def get_user_qualification_progress(enrolment_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            uqe.id AS enrolment_id,
            uqe.user_id,
            uqe.qualification_id,
            q.code AS qualification_code,
            q.title AS qualification_title,
            q.level AS qualification_level,
            uqe.status AS enrolment_status,
            uqe.start_date,
            uqe.target_end_date,
            uqe.achieved_date,
            uqe.assessor_user_id,
            uqe.iqa_user_id,
            COUNT(qu.id) AS total_units,
            COUNT(*) FILTER (WHERE uup.status = 'completed') AS completed_units,
            COUNT(*) FILTER (WHERE uup.status IN ('submitted', 'under_review')) AS units_in_review,
            COUNT(*) FILTER (WHERE uup.status = 'needs_amendment') AS units_needing_amendment,
            COUNT(*) FILTER (WHERE uup.status IN ('not_started', 'in_progress') OR uup.status IS NULL) AS units_remaining,
            CASE
                WHEN COUNT(qu.id) = 0 THEN 0
                ELSE ROUND(
                    (
                        COUNT(*) FILTER (WHERE uup.status = 'completed')::numeric
                        / COUNT(qu.id)::numeric
                    ) * 100,
                    2
                )
            END AS completion_percent
        FROM academy_user_qualification_enrolments uqe
        INNER JOIN academy_qualifications q
            ON q.id = uqe.qualification_id
        LEFT JOIN academy_qualification_units qu
            ON qu.qualification_id = q.id
           AND qu.active = TRUE
        LEFT JOIN academy_user_unit_progress uup
            ON uup.enrolment_id = uqe.id
           AND uup.qualification_unit_id = qu.id
        WHERE uqe.id = %s
        GROUP BY
            uqe.id,
            uqe.user_id,
            uqe.qualification_id,
            q.code,
            q.title,
            q.level,
            uqe.status,
            uqe.start_date,
            uqe.target_end_date,
            uqe.achieved_date,
            uqe.assessor_user_id,
            uqe.iqa_user_id
    """
    return _fetch_one(query, (enrolment_id,))


# =========================================================
# Assignments / learner progress
# =========================================================


def assign_module_to_user(
    *,
    module_id: int,
    assigned_to_user_id: int,
    assigned_by_user_id: int | None = None,
    home_id: int | None = None,
    mandatory: bool = True,
    due_date: date | None = None,
    assigned_reason: str | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_learning_assignments (
            module_id,
            assigned_to_user_id,
            assigned_by_user_id,
            home_id,
            mandatory,
            due_date,
            assigned_reason
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        RETURNING *
    """
    return _execute(
        query,
        (
            module_id,
            assigned_to_user_id,
            assigned_by_user_id,
            home_id,
            mandatory,
            due_date,
            assigned_reason,
        ),
        fetchone=True,
    )


def list_user_module_status(user_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            u.id AS user_id,
            m.id AS module_id,
            m.code AS module_code,
            m.title AS module_title,
            m.summary,
            m.module_family,
            m.learning_type,
            m.difficulty_level,
            m.delivery_mode,
            m.estimated_minutes,
            m.requires_quiz,
            m.requires_workbook,
            m.requires_assessor_review,
            m.requires_manager_signoff,
            m.renewal_months,
            la.id AS assignment_id,
            la.mandatory,
            la.due_date,
            ump.status AS progress_status,
            ump.progress_percent,
            ump.started_at,
            ump.completed_at,
            ump.expires_at,
            CASE
                WHEN la.id IS NOT NULL
                 AND la.due_date IS NOT NULL
                 AND (ump.completed_at IS NULL)
                 AND la.due_date < CURRENT_DATE
                THEN TRUE
                ELSE FALSE
            END AS is_overdue,
            CASE
                WHEN ump.expires_at IS NOT NULL
                 AND ump.expires_at < NOW()
                THEN TRUE
                ELSE FALSE
            END AS is_expired
        FROM users u
        CROSS JOIN academy_modules m
        LEFT JOIN academy_learning_assignments la
            ON la.module_id = m.id
           AND la.assigned_to_user_id = u.id
        LEFT JOIN academy_user_module_progress ump
            ON ump.user_id = u.id
           AND ump.module_id = m.id
        WHERE u.id = %s
          AND m.active = TRUE
        ORDER BY
            COALESCE(la.due_date, DATE '2999-12-31') ASC,
            m.title ASC
    """
    return _fetch_all(query, (user_id,))


def get_user_module_progress(user_id: int, module_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            id,
            user_id,
            module_id,
            status,
            progress_percent,
            started_at,
            completed_at,
            expires_at,
            last_accessed_at,
            current_lesson_id,
            total_time_seconds
        FROM academy_user_module_progress
        WHERE user_id = %s
          AND module_id = %s
        LIMIT 1
    """
    return _fetch_one(query, (user_id, module_id))


def upsert_user_module_progress(
    *,
    user_id: int,
    module_id: int,
    status: str,
    progress_percent: int,
    current_lesson_id: int | None = None,
    total_time_seconds: int = 0,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_user_module_progress (
            user_id,
            module_id,
            status,
            progress_percent,
            started_at,
            last_accessed_at,
            current_lesson_id,
            total_time_seconds
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            CASE
                WHEN %s IN ('in_progress', 'passed', 'completed') THEN NOW()
                ELSE NULL
            END,
            NOW(),
            %s,
            %s
        )
        ON CONFLICT (user_id, module_id)
        DO UPDATE SET
            status = EXCLUDED.status,
            progress_percent = EXCLUDED.progress_percent,
            last_accessed_at = NOW(),
            current_lesson_id = EXCLUDED.current_lesson_id,
            total_time_seconds = EXCLUDED.total_time_seconds
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            module_id,
            status,
            progress_percent,
            status,
            current_lesson_id,
            total_time_seconds,
        ),
        fetchone=True,
    )


def mark_module_completed(
    *,
    user_id: int,
    module_id: int,
    expires_at: datetime | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_user_module_progress (
            user_id,
            module_id,
            status,
            progress_percent,
            started_at,
            completed_at,
            expires_at,
            last_accessed_at
        )
        VALUES (%s, %s, 'completed', 100, NOW(), NOW(), %s, NOW())
        ON CONFLICT (user_id, module_id)
        DO UPDATE SET
            status = 'completed',
            progress_percent = 100,
            completed_at = NOW(),
            expires_at = %s,
            last_accessed_at = NOW()
        RETURNING *
    """
    return _execute(
        query,
        (user_id, module_id, expires_at, expires_at),
        fetchone=True,
    )


def record_quiz_attempt(
    *,
    user_id: int,
    quiz_id: int,
    score_percent: int,
    passed: bool,
    answers_json: dict[str, Any] | list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_user_quiz_attempts (
            user_id,
            quiz_id,
            score_percent,
            passed,
            answers_json
        )
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (user_id, quiz_id, score_percent, passed, answers_json),
        fetchone=True,
    )


def record_scenario_submission(
    *,
    user_id: int,
    scenario_id: int,
    submission_text: str | None = None,
    score: float | None = None,
    feedback_text: str | None = None,
    reviewed_by_user_id: int | None = None,
    reviewed_at: datetime | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_user_scenario_submissions (
            user_id,
            scenario_id,
            submission_text,
            score,
            feedback_text,
            reviewed_by_user_id,
            reviewed_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            scenario_id,
            submission_text,
            score,
            feedback_text,
            reviewed_by_user_id,
            reviewed_at,
        ),
        fetchone=True,
    )


def record_reflection_response(
    *,
    user_id: int,
    reflection_id: int,
    response_text: str,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_user_reflection_responses (
            user_id,
            reflection_id,
            response_text
        )
        VALUES (%s, %s, %s)
        RETURNING *
    """
    return _execute(query, (user_id, reflection_id, response_text), fetchone=True)


# =========================================================
# Assessments / competency
# =========================================================


def create_observation_record(
    *,
    user_id: int,
    observer_user_id: int,
    workbook_submission_id: int | None,
    observation_title: str,
    observation_text: str,
    observed_at: datetime,
    outcome: str | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_observation_records (
            user_id,
            observer_user_id,
            workbook_submission_id,
            observation_title,
            observation_text,
            observed_at,
            outcome
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            observer_user_id,
            workbook_submission_id,
            observation_title,
            observation_text,
            observed_at,
            outcome,
        ),
        fetchone=True,
    )


def create_professional_discussion(
    *,
    user_id: int,
    assessor_user_id: int,
    workbook_submission_id: int | None,
    discussion_title: str,
    discussion_summary: str,
    discussion_date: date,
    outcome: str | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_professional_discussions (
            user_id,
            assessor_user_id,
            workbook_submission_id,
            discussion_title,
            discussion_summary,
            discussion_date,
            outcome
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            assessor_user_id,
            workbook_submission_id,
            discussion_title,
            discussion_summary,
            discussion_date,
            outcome,
        ),
        fetchone=True,
    )


def list_competencies(
    *,
    module_id: int | None = None,
    qualification_unit_id: int | None = None,
    active: bool | None = True,
) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if module_id is not None:
        filters.append("c.module_id = %s")
        params.append(module_id)

    if qualification_unit_id is not None:
        filters.append("c.qualification_unit_id = %s")
        params.append(qualification_unit_id)

    if active is not None:
        filters.append("c.active = %s")
        params.append(active)

    query = f"""
        SELECT
            c.id,
            c.module_id,
            c.qualification_unit_id,
            c.code,
            c.title,
            c.description,
            c.assessment_method,
            c.required_for_completion,
            c.active,
            c.created_at
        FROM academy_competencies c
        {_build_where(filters)}
        ORDER BY c.title ASC
    """
    return _fetch_all(query, tuple(params))


def sign_off_competency(
    *,
    competency_id: int,
    user_id: int,
    signed_off_by_user_id: int,
    outcome: str,
    notes: str | None = None,
    expires_at: datetime | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_competency_signoffs (
            competency_id,
            user_id,
            signed_off_by_user_id,
            outcome,
            notes,
            signed_off_at,
            expires_at
        )
        VALUES (%s, %s, %s, %s, %s, NOW(), %s)
        ON CONFLICT (competency_id, user_id)
        DO UPDATE SET
            signed_off_by_user_id = EXCLUDED.signed_off_by_user_id,
            outcome = EXCLUDED.outcome,
            notes = EXCLUDED.notes,
            signed_off_at = NOW(),
            expires_at = EXCLUDED.expires_at
        RETURNING *
    """
    return _execute(
        query,
        (
            competency_id,
            user_id,
            signed_off_by_user_id,
            outcome,
            notes,
            expires_at,
        ),
        fetchone=True,
    )


def list_user_competency_signoffs(user_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            cs.id,
            cs.competency_id,
            cs.user_id,
            cs.signed_off_by_user_id,
            cs.outcome,
            cs.notes,
            cs.signed_off_at,
            cs.expires_at,
            c.code AS competency_code,
            c.title AS competency_title
        FROM academy_competency_signoffs cs
        INNER JOIN academy_competencies c
            ON c.id = cs.competency_id
        WHERE cs.user_id = %s
        ORDER BY cs.signed_off_at DESC, cs.id DESC
    """
    return _fetch_all(query, (user_id,))


# =========================================================
# Certificates
# =========================================================


def create_certificate(
    *,
    user_id: int,
    title: str,
    certificate_number: str,
    module_id: int | None = None,
    qualification_id: int | None = None,
    expires_at: datetime | None = None,
    file_url: str | None = None,
) -> dict[str, Any] | None:
    query = """
        INSERT INTO academy_certificates (
            user_id,
            module_id,
            qualification_id,
            certificate_number,
            title,
            expires_at,
            file_url
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    return _execute(
        query,
        (
            user_id,
            module_id,
            qualification_id,
            certificate_number,
            title,
            expires_at,
            file_url,
        ),
        fetchone=True,
    )


def list_user_certificates(user_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            user_id,
            module_id,
            qualification_id,
            certificate_number,
            title,
            issued_at,
            expires_at,
            file_url
        FROM academy_certificates
        WHERE user_id = %s
        ORDER BY issued_at DESC, id DESC
    """
    return _fetch_all(query, (user_id,))


# =========================================================
# Dashboard / compliance
# =========================================================


def get_home_training_compliance(home_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            h.id AS home_id,
            h.provider_id,
            h.name AS home_name,
            COUNT(DISTINCT u.id) FILTER (
                WHERE u.home_id = h.id
            ) AS active_staff,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.home_id = h.id
                  AND la.mandatory = TRUE
                  AND la.module_id IS NOT NULL
            ) AS mandatory_module_assignments,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.home_id = h.id
                  AND la.mandatory = TRUE
                  AND ump.status = 'completed'
            ) AS completed_mandatory_module_assignments,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.home_id = h.id
                  AND la.mandatory = TRUE
                  AND la.due_date IS NOT NULL
                  AND la.due_date < CURRENT_DATE
                  AND COALESCE(ump.status, '') <> 'completed'
            ) AS overdue_mandatory_module_assignments,
            CASE
                WHEN COUNT(DISTINCT la.id) FILTER (
                    WHERE la.home_id = h.id
                      AND la.mandatory = TRUE
                      AND la.module_id IS NOT NULL
                ) = 0 THEN 0
                ELSE ROUND(
                    (
                        COUNT(DISTINCT la.id) FILTER (
                            WHERE la.home_id = h.id
                              AND la.mandatory = TRUE
                              AND ump.status = 'completed'
                        )::numeric
                        /
                        COUNT(DISTINCT la.id) FILTER (
                            WHERE la.home_id = h.id
                              AND la.mandatory = TRUE
                              AND la.module_id IS NOT NULL
                        )::numeric
                    ) * 100,
                    2
                )
            END AS compliance_percent
        FROM homes h
        LEFT JOIN users u
            ON u.home_id = h.id
        LEFT JOIN academy_learning_assignments la
            ON la.home_id = h.id
        LEFT JOIN academy_user_module_progress ump
            ON ump.user_id = la.assigned_to_user_id
           AND ump.module_id = la.module_id
        WHERE h.id = %s
        GROUP BY h.id, h.provider_id, h.name
        LIMIT 1
    """
    return _fetch_one(query, (home_id,))


def get_home_workbook_compliance(home_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            h.id AS home_id,
            h.provider_id,
            h.name AS home_name,
            COUNT(DISTINCT ws.id) AS total_workbook_submissions,
            COUNT(DISTINCT ws.id) FILTER (
                WHERE ws.status = 'completed'
            ) AS completed_workbooks,
            COUNT(DISTINCT ws.id) FILTER (
                WHERE ws.status IN ('submitted', 'under_review')
            ) AS in_review_workbooks,
            COUNT(DISTINCT ws.id) FILTER (
                WHERE ws.status = 'needs_amendment'
            ) AS workbooks_needing_amendment,
            COUNT(DISTINCT ws.id) FILTER (
                WHERE ws.due_date IS NOT NULL
                  AND ws.due_date < CURRENT_DATE
                  AND ws.status NOT IN ('completed', 'accepted', 'locked')
            ) AS overdue_workbooks
        FROM homes h
        LEFT JOIN users u
            ON u.home_id = h.id
        LEFT JOIN academy_workbook_submissions ws
            ON ws.user_id = u.id
        WHERE h.id = %s
        GROUP BY h.id, h.provider_id, h.name
        LIMIT 1
    """
    return _fetch_one(query, (home_id,))


def get_home_qualification_summary(home_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            h.id AS home_id,
            h.provider_id,
            h.name AS home_name,
            COUNT(DISTINCT e.id) AS total_enrolments,
            COUNT(DISTINCT e.id) FILTER (
                WHERE q.level = 3
            ) AS level_3_enrolments,
            COUNT(DISTINCT e.id) FILTER (
                WHERE q.level = 5
            ) AS level_5_enrolments,
            COUNT(DISTINCT e.id) FILTER (
                WHERE e.status = 'completed'
            ) AS completed_qualifications,
            COUNT(DISTINCT e.id) FILTER (
                WHERE e.status IN ('enrolled', 'in_progress', 'on_hold')
            ) AS active_qualifications,
            COALESCE(ROUND(AVG(unit_progress.completion_percent), 2), 0) AS average_completion_percent
        FROM homes h
        LEFT JOIN users u
            ON u.home_id = h.id
        LEFT JOIN academy_user_qualification_enrolments e
            ON e.user_id = u.id
        LEFT JOIN academy_qualifications q
            ON q.id = e.qualification_id
        LEFT JOIN (
            SELECT
                e2.id AS enrolment_id,
                CASE
                    WHEN COUNT(qu.id) = 0 THEN 0
                    ELSE (
                        COUNT(*) FILTER (WHERE uup.status = 'completed')::numeric
                        / COUNT(qu.id)::numeric
                    ) * 100
                END AS completion_percent
            FROM academy_user_qualification_enrolments e2
            LEFT JOIN academy_qualification_units qu
                ON qu.qualification_id = e2.qualification_id
               AND qu.active = TRUE
            LEFT JOIN academy_user_unit_progress uup
                ON uup.enrolment_id = e2.id
               AND uup.qualification_unit_id = qu.id
            GROUP BY e2.id
        ) AS unit_progress
            ON unit_progress.enrolment_id = e.id
        WHERE h.id = %s
        GROUP BY h.id, h.provider_id, h.name
        LIMIT 1
    """
    return _fetch_one(query, (home_id,))


def get_provider_compliance_summary(provider_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            p.id AS provider_id,
            p.name AS provider_name,
            COUNT(DISTINCT h.id) AS total_homes,
            COUNT(DISTINCT u.id) AS active_staff,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.mandatory = TRUE
            ) AS mandatory_module_assignments,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.mandatory = TRUE
                  AND ump.status = 'completed'
            ) AS completed_mandatory_module_assignments,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.mandatory = TRUE
                  AND la.due_date IS NOT NULL
                  AND la.due_date < CURRENT_DATE
                  AND COALESCE(ump.status, '') <> 'completed'
            ) AS overdue_mandatory_module_assignments,
            COALESCE(
                ROUND(
                    AVG(
                        CASE
                            WHEN home_totals.total_mandatory = 0 THEN 0
                            ELSE (home_totals.completed_mandatory::numeric / home_totals.total_mandatory::numeric) * 100
                        END
                    ),
                    2
                ),
                0
            ) AS average_home_compliance_percent,
            COUNT(DISTINCT ws.id) AS total_workbook_submissions,
            COUNT(DISTINCT ws.id) FILTER (
                WHERE ws.status = 'completed'
            ) AS completed_workbooks,
            COUNT(DISTINCT ws.id) FILTER (
                WHERE ws.due_date IS NOT NULL
                  AND ws.due_date < CURRENT_DATE
                  AND ws.status NOT IN ('completed', 'accepted', 'locked')
            ) AS overdue_workbooks,
            COUNT(DISTINCT e.id) AS total_qualification_enrolments,
            COUNT(DISTINCT e.id) FILTER (
                WHERE q.level = 3
            ) AS total_level_3_enrolments,
            COUNT(DISTINCT e.id) FILTER (
                WHERE q.level = 5
            ) AS total_level_5_enrolments
        FROM providers p
        LEFT JOIN homes h
            ON h.provider_id = p.id
        LEFT JOIN users u
            ON u.home_id = h.id
        LEFT JOIN academy_learning_assignments la
            ON la.home_id = h.id
        LEFT JOIN academy_user_module_progress ump
            ON ump.user_id = la.assigned_to_user_id
           AND ump.module_id = la.module_id
        LEFT JOIN academy_workbook_submissions ws
            ON ws.user_id = u.id
        LEFT JOIN academy_user_qualification_enrolments e
            ON e.user_id = u.id
        LEFT JOIN academy_qualifications q
            ON q.id = e.qualification_id
        LEFT JOIN (
            SELECT
                la2.home_id,
                COUNT(*) FILTER (WHERE la2.mandatory = TRUE) AS total_mandatory,
                COUNT(*) FILTER (
                    WHERE la2.mandatory = TRUE
                      AND ump2.status = 'completed'
                ) AS completed_mandatory
            FROM academy_learning_assignments la2
            LEFT JOIN academy_user_module_progress ump2
                ON ump2.user_id = la2.assigned_to_user_id
               AND ump2.module_id = la2.module_id
            GROUP BY la2.home_id
        ) AS home_totals
            ON home_totals.home_id = h.id
        WHERE p.id = %s
        GROUP BY p.id, p.name
        LIMIT 1
    """
    return _fetch_one(query, (provider_id,))


def list_home_quality_standard_evidence(home_id: int) -> list[dict[str, Any]]:
    query = """
        WITH quality_items AS (
            SELECT
                fi.id,
                fi.item_code,
                fi.item_name,
                fi.external_reference,
                COALESCE(
                    NULLIF(regexp_replace(fi.external_reference, '[^0-9]', '', 'g'), ''),
                    '0'
                )::int AS regulation_number
            FROM academy_framework_items fi
            INNER JOIN academy_frameworks f
                ON f.id = fi.framework_id
            WHERE f.framework_code = 'QUALITY_STANDARDS'
        )
        SELECT
            h.id AS home_id,
            h.provider_id,
            h.name AS home_name,
            qi.id AS quality_standard_id,
            qi.regulation_number,
            qi.item_code AS quality_standard_code,
            qi.item_name AS quality_standard_name,
            COUNT(DISTINCT amm.module_id) AS linked_modules,
            COUNT(DISTINCT aqum.qualification_unit_id) AS linked_qualification_units,
            COUNT(DISTINCT aws.id) FILTER (
                WHERE aws.status IN ('accepted', 'completed')
            ) AS accepted_workbook_submissions,
            COUNT(DISTINCT aei.id) AS evidence_items
        FROM homes h
        CROSS JOIN quality_items qi
        LEFT JOIN academy_module_mappings amm
            ON amm.framework_item_id = qi.id
        LEFT JOIN academy_modules am
            ON am.id = amm.module_id
        LEFT JOIN academy_qualification_unit_mappings aqum
            ON aqum.framework_item_id = qi.id
        LEFT JOIN users u
            ON u.home_id = h.id
        LEFT JOIN academy_workbook_submissions aws
            ON aws.user_id = u.id
        LEFT JOIN academy_workbooks aw
            ON aw.id = aws.workbook_id
        LEFT JOIN academy_evidence_items aei
            ON aei.user_id = u.id
        WHERE h.id = %s
        GROUP BY
            h.id,
            h.provider_id,
            h.name,
            qi.id,
            qi.regulation_number,
            qi.item_code,
            qi.item_name
        ORDER BY qi.regulation_number ASC, qi.item_code ASC
    """
    return _fetch_all(query, (home_id,))


def list_home_sccif_domain_summary(home_id: int) -> list[dict[str, Any]]:
    query = """
        WITH sccif_items AS (
            SELECT
                fi.id,
                fi.item_code,
                fi.item_name
            FROM academy_framework_items fi
            INNER JOIN academy_frameworks f
                ON f.id = fi.framework_id
            WHERE f.framework_code = 'SCCIF'
        )
        SELECT
            h.id AS home_id,
            h.provider_id,
            h.name AS home_name,
            si.item_code AS sccif_domain_code,
            si.item_name AS sccif_domain_name,
            COUNT(DISTINCT amm.module_id) AS linked_modules,
            COUNT(DISTINCT ump.id) FILTER (
                WHERE ump.status = 'completed'
            ) AS completed_module_records,
            COUNT(DISTINCT aws.id) FILTER (
                WHERE aws.status IN ('accepted', 'completed')
            ) AS accepted_workbooks,
            COUNT(DISTINCT acs.id) AS competency_signoffs
        FROM homes h
        CROSS JOIN sccif_items si
        LEFT JOIN academy_module_mappings amm
            ON amm.framework_item_id = si.id
        LEFT JOIN academy_modules am
            ON am.id = amm.module_id
        LEFT JOIN users u
            ON u.home_id = h.id
        LEFT JOIN academy_user_module_progress ump
            ON ump.user_id = u.id
           AND ump.module_id = am.id
        LEFT JOIN academy_workbook_submissions aws
            ON aws.user_id = u.id
        LEFT JOIN academy_competency_signoffs acs
            ON acs.user_id = u.id
        WHERE h.id = %s
        GROUP BY
            h.id,
            h.provider_id,
            h.name,
            si.item_code,
            si.item_name
        ORDER BY si.item_code ASC
    """
    return _fetch_all(query, (home_id,))


def get_user_academy_profile_summary(user_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.role,
            u.home_id,
            h.name AS home_name,
            COUNT(DISTINCT ump.id) FILTER (
                WHERE ump.status = 'completed'
            ) AS completed_modules,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.mandatory = TRUE
            ) AS mandatory_modules_assigned,
            COUNT(DISTINCT la.id) FILTER (
                WHERE la.mandatory = TRUE
                  AND ump.status = 'completed'
            ) AS mandatory_modules_completed,
            COUNT(DISTINCT aws.id) FILTER (
                WHERE aws.status IN ('accepted', 'completed')
            ) AS accepted_workbooks,
            COUNT(DISTINCT aws.id) FILTER (
                WHERE aws.status = 'needs_amendment'
            ) AS workbooks_needing_amendment,
            COUNT(DISTINCT aqe.id) AS qualifications_enrolled,
            COUNT(DISTINCT aqe.id) FILTER (
                WHERE aqe.status = 'completed'
            ) AS qualifications_completed,
            COUNT(DISTINCT acs.id) AS competencies_signed_off,
            COUNT(DISTINCT ac.id) AS certificates_held
        FROM users u
        LEFT JOIN homes h
            ON h.id = u.home_id
        LEFT JOIN academy_learning_assignments la
            ON la.assigned_to_user_id = u.id
        LEFT JOIN academy_user_module_progress ump
            ON ump.user_id = u.id
           AND ump.module_id = la.module_id
        LEFT JOIN academy_workbook_submissions aws
            ON aws.user_id = u.id
        LEFT JOIN academy_user_qualification_enrolments aqe
            ON aqe.user_id = u.id
        LEFT JOIN academy_competency_signoffs acs
            ON acs.user_id = u.id
        LEFT JOIN academy_certificates ac
            ON ac.user_id = u.id
        WHERE u.id = %s
        GROUP BY
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.role,
            u.home_id,
            h.name
        LIMIT 1
    """
    return _fetch_one(query, (user_id,))


def list_workbook_review_queue(
    *,
    assessor_user_id: int | None = None,
    home_id: int | None = None,
    queue_status: str | None = None,
    overdue_only: bool = False,
) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if assessor_user_id is not None:
        filters.append("aws.assessor_user_id = %s")
        params.append(assessor_user_id)

    if home_id is not None:
        filters.append("u.home_id = %s")
        params.append(home_id)

    if queue_status:
        if queue_status == "review":
            filters.append("aws.status IN ('submitted', 'under_review')")
        elif queue_status == "amendment":
            filters.append("aws.status = 'needs_amendment'")
        elif queue_status == "completed":
            filters.append("aws.status IN ('accepted', 'completed')")
        else:
            filters.append("aws.status = %s")
            params.append(queue_status)

    if overdue_only:
        filters.append(
            """(
                aws.due_date IS NOT NULL
                AND aws.due_date < CURRENT_DATE
                AND aws.status NOT IN ('accepted', 'completed', 'locked')
            )"""
        )

    query = f"""
        SELECT
            aws.id AS submission_id,
            aws.workbook_id,
            aw.code AS workbook_code,
            aw.title AS workbook_title,
            aw.workbook_type,
            aws.user_id,
            u.first_name AS learner_first_name,
            u.last_name AS learner_last_name,
            u.email AS learner_email,
            u.role AS learner_role,
            u.home_id,
            h.name AS home_name,
            aws.assessor_user_id,
            assessor.first_name AS assessor_first_name,
            assessor.last_name AS assessor_last_name,
            aws.status,
            aws.due_date,
            aws.submitted_at,
            aws.reviewed_at,
            aws.attempt_number,
            CASE
                WHEN aws.status IN ('submitted', 'under_review') THEN 'review'
                WHEN aws.status = 'needs_amendment' THEN 'amendment'
                WHEN aws.status IN ('accepted', 'completed') THEN 'completed'
                ELSE aws.status
            END AS queue_status,
            CASE
                WHEN aws.due_date IS NOT NULL
                 AND aws.due_date < CURRENT_DATE
                 AND aws.status NOT IN ('accepted', 'completed', 'locked')
                THEN TRUE
                ELSE FALSE
            END AS is_overdue
        FROM academy_workbook_submissions aws
        INNER JOIN academy_workbooks aw
            ON aw.id = aws.workbook_id
        INNER JOIN users u
            ON u.id = aws.user_id
        LEFT JOIN homes h
            ON h.id = u.home_id
        LEFT JOIN users assessor
            ON assessor.id = aws.assessor_user_id
        {_build_where(filters)}
        ORDER BY
            CASE
                WHEN aws.due_date IS NOT NULL
                 AND aws.due_date < CURRENT_DATE
                 AND aws.status NOT IN ('accepted', 'completed', 'locked')
                THEN 0
                ELSE 1
            END ASC,
            aws.due_date ASC NULLS LAST,
            aws.submitted_at ASC NULLS LAST,
            aws.id DESC
    """
    return _fetch_all(query, tuple(params))

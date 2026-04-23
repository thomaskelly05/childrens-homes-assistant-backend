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
# Modules
# =========================================================


def list_modules(
    *,
    category_id: int | None = None,
    sccif_domain_code: str | None = None,
    learning_type: str | None = None,
    difficulty_level: str | None = None,
    active: bool | None = True,
) -> list[dict[str, Any]]:
    filters: list[str] = []
    params: list[Any] = []

    if category_id is not None:
        filters.append("m.category_id = %s")
        params.append(category_id)

    if sccif_domain_code:
        filters.append("m.sccif_domain_code = %s")
        params.append(sccif_domain_code)

    if learning_type:
        filters.append("m.learning_type = %s")
        params.append(learning_type)

    if difficulty_level:
        filters.append("m.difficulty_level = %s")
        params.append(difficulty_level)

    if active is not None:
        filters.append("m.active = %s")
        params.append(active)

    query = f"""
        SELECT
            m.id,
            m.category_id,
            c.name AS category_name,
            m.code,
            m.title,
            m.summary,
            m.description,
            m.sccif_domain_code,
            m.learning_type,
            m.difficulty_level,
            m.estimated_minutes,
            m.active,
            m.version,
            m.requires_quiz,
            m.requires_workbook,
            m.requires_assessor_review,
            m.requires_manager_signoff,
            m.certificate_on_completion,
            m.renewal_months,
            m.created_at,
            m.updated_at
        FROM modules m
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
            c.name AS category_name,
            m.code,
            m.title,
            m.summary,
            m.description,
            m.sccif_domain_code,
            m.learning_type,
            m.difficulty_level,
            m.estimated_minutes,
            m.active,
            m.version,
            m.requires_quiz,
            m.requires_workbook,
            m.requires_assessor_review,
            m.requires_manager_signoff,
            m.certificate_on_completion,
            m.renewal_months,
            m.created_at,
            m.updated_at
        FROM modules m
        LEFT JOIN academy_categories c
            ON c.id = m.category_id
        WHERE m.id = %s
        LIMIT 1
    """
    return _fetch_one(query, (module_id,))


def create_module(payload: dict[str, Any]) -> dict[str, Any] | None:
    query = """
        INSERT INTO modules (
            category_id,
            code,
            title,
            summary,
            description,
            sccif_domain_code,
            learning_type,
            difficulty_level,
            estimated_minutes,
            active,
            version,
            requires_quiz,
            requires_workbook,
            requires_assessor_review,
            requires_manager_signoff,
            certificate_on_completion,
            renewal_months
        )
        VALUES (
            %(category_id)s,
            %(code)s,
            %(title)s,
            %(summary)s,
            %(description)s,
            %(sccif_domain_code)s,
            %(learning_type)s,
            %(difficulty_level)s,
            %(estimated_minutes)s,
            %(active)s,
            %(version)s,
            %(requires_quiz)s,
            %(requires_workbook)s,
            %(requires_assessor_review)s,
            %(requires_manager_signoff)s,
            %(certificate_on_completion)s,
            %(renewal_months)s
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
        "sccif_domain_code",
        "learning_type",
        "difficulty_level",
        "estimated_minutes",
        "active",
        "version",
        "requires_quiz",
        "requires_workbook",
        "requires_assessor_review",
        "requires_manager_signoff",
        "certificate_on_completion",
        "renewal_months",
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
        UPDATE modules
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
        FROM lessons
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
        FROM quizzes
        WHERE module_id = %s
        ORDER BY id ASC
        LIMIT 1
    """
    return _fetch_one(query, (module_id,))


def list_module_mappings(module_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            mm.id,
            mm.module_id,
            mm.mapping_note,
            qs.id AS quality_standard_id,
            qs.code AS quality_standard_code,
            qs.name AS quality_standard_name,
            qs.regulation_number AS quality_standard_regulation_number,
            rr.id AS regulation_ref_id,
            rr.regulation_number,
            rr.title AS regulation_title,
            ot.id AS ofsted_theme_id,
            ot.code AS ofsted_theme_code,
            ot.name AS ofsted_theme_name
        FROM module_mappings mm
        LEFT JOIN quality_standards qs
            ON qs.id = mm.quality_standard_id
        LEFT JOIN regulation_refs rr
            ON rr.id = mm.regulation_ref_id
        LEFT JOIN ofsted_themes ot
            ON ot.id = mm.ofsted_theme_id
        WHERE mm.module_id = %s
        ORDER BY mm.id ASC
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
        FROM workbooks w
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
        FROM workbooks w
        WHERE w.id = %s
        LIMIT 1
    """
    return _fetch_one(query, (workbook_id,))


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
        FROM workbook_sections
        WHERE workbook_id = %s
        ORDER BY sort_order ASC, id ASC
    """
    return _fetch_all(query, (workbook_id,))


def list_workbook_questions(workbook_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            q.id,
            q.section_id,
            q.prompt_text,
            q.response_type,
            q.guidance_text,
            q.min_words,
            q.max_words,
            q.required,
            q.sort_order
        FROM workbook_questions q
        INNER JOIN workbook_sections s
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
        INSERT INTO workbook_submissions (
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
        FROM workbook_submissions ws
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
        FROM workbook_submissions ws
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
        FROM workbook_submissions ws
        INNER JOIN workbooks w
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
        INSERT INTO workbook_answers (
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
        FROM workbook_answers
        WHERE submission_id = %s
        ORDER BY question_id ASC
    """
    return _fetch_all(query, (submission_id,))


def mark_workbook_submission_submitted(submission_id: int) -> dict[str, Any] | None:
    query = """
        UPDATE workbook_submissions
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
        UPDATE workbook_submissions
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
        UPDATE workbook_submissions
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
        INSERT INTO workbook_feedback (
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
        FROM workbook_feedback
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
        INSERT INTO workbook_submissions (
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
        INSERT INTO workbook_resubmissions (
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
        FROM evidence_items
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
        FROM evidence_items
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
        INSERT INTO evidence_items (
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
        UPDATE evidence_items
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
        INSERT INTO evidence_links (
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
        INSERT INTO evidence_reviews (
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
            q.description,
            q.total_credits,
            q.active,
            q.version,
            q.created_at,
            q.updated_at
        FROM qualifications q
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
            description,
            total_credits,
            active,
            version,
            created_at,
            updated_at
        FROM qualifications
        WHERE id = %s
        LIMIT 1
    """
    return _fetch_one(query, (qualification_id,))


def list_qualification_units(qualification_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            id,
            qualification_id,
            unit_code,
            title,
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
        FROM qualification_units
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
        FROM qualification_units
        WHERE id = %s
        LIMIT 1
    """
    return _fetch_one(query, (unit_id,))


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
        INSERT INTO user_qualification_enrolments (
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
        FROM user_qualification_enrolments
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
        FROM user_qualification_enrolments
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
        UPDATE user_qualification_enrolments
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
        FROM user_qualification_enrolments uqe
        INNER JOIN qualifications q
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
        FROM user_qualification_enrolments uqe
        INNER JOIN qualifications q
            ON q.id = uqe.qualification_id
        LEFT JOIN qualification_units qu
            ON qu.qualification_id = q.id
           AND qu.active = TRUE
        LEFT JOIN user_unit_progress uup
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
        INSERT INTO learning_assignments (
            module_id,
            assigned_to_user_id,
            assigned_by_user_id,
            home_id,
            mandatory,
            due_date,
            assigned_reason
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
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
            m.sccif_domain_code,
            m.learning_type,
            m.difficulty_level,
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
                 AND ump.completed_at IS NULL
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
        CROSS JOIN modules m
        LEFT JOIN learning_assignments la
            ON la.module_id = m.id
           AND la.assigned_to_user_id = u.id
        LEFT JOIN user_module_progress ump
            ON ump.user_id = u.id
           AND ump.module_id = m.id
        WHERE u.id = %s
          AND u.active = TRUE
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
        FROM user_module_progress
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
        INSERT INTO user_module_progress (
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
        INSERT INTO user_module_progress (
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
        INSERT INTO user_quiz_attempts (
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
        INSERT INTO observation_records (
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
        INSERT INTO professional_discussions (
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
        FROM competencies c
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
        INSERT INTO competency_signoffs (
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
        FROM competency_signoffs cs
        INNER JOIN competencies c
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
        INSERT INTO certificates (
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
        FROM certificates
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
            home_id,
            provider_id,
            home_name,
            active_staff,
            mandatory_module_assignments,
            completed_mandatory_module_assignments,
            overdue_mandatory_module_assignments,
            compliance_percent
        FROM v_home_training_compliance
        WHERE home_id = %s
        LIMIT 1
    """
    return _fetch_one(query, (home_id,))


def get_home_workbook_compliance(home_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            home_id,
            provider_id,
            home_name,
            total_workbook_submissions,
            completed_workbooks,
            in_review_workbooks,
            workbooks_needing_amendment,
            overdue_workbooks
        FROM v_home_workbook_compliance
        WHERE home_id = %s
        LIMIT 1
    """
    return _fetch_one(query, (home_id,))


def get_home_qualification_summary(home_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            home_id,
            provider_id,
            home_name,
            total_enrolments,
            level_3_enrolments,
            level_5_enrolments,
            completed_qualifications,
            active_qualifications,
            average_completion_percent
        FROM v_home_qualification_summary
        WHERE home_id = %s
        LIMIT 1
    """
    return _fetch_one(query, (home_id,))


def get_provider_compliance_summary(provider_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            provider_id,
            provider_name,
            total_homes,
            active_staff,
            mandatory_module_assignments,
            completed_mandatory_module_assignments,
            overdue_mandatory_module_assignments,
            average_home_compliance_percent,
            total_workbook_submissions,
            completed_workbooks,
            overdue_workbooks,
            total_qualification_enrolments,
            total_level_3_enrolments,
            total_level_5_enrolments
        FROM v_provider_compliance_summary
        WHERE provider_id = %s
        LIMIT 1
    """
    return _fetch_one(query, (provider_id,))


def list_home_quality_standard_evidence(home_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            home_id,
            provider_id,
            home_name,
            quality_standard_id,
            regulation_number,
            quality_standard_code,
            quality_standard_name,
            linked_modules,
            linked_qualification_units,
            accepted_workbook_submissions,
            evidence_items
        FROM v_home_quality_standard_evidence
        WHERE home_id = %s
        ORDER BY regulation_number ASC
    """
    return _fetch_all(query, (home_id,))


def list_home_sccif_domain_summary(home_id: int) -> list[dict[str, Any]]:
    query = """
        SELECT
            home_id,
            provider_id,
            home_name,
            sccif_domain_code,
            sccif_domain_name,
            linked_modules,
            completed_module_records,
            accepted_workbooks,
            competency_signoffs
        FROM v_home_sccif_domain_summary
        WHERE home_id = %s
        ORDER BY sccif_domain_code ASC
    """
    return _fetch_all(query, (home_id,))


def get_user_academy_profile_summary(user_id: int) -> dict[str, Any] | None:
    query = """
        SELECT
            user_id,
            first_name,
            last_name,
            email,
            role,
            home_id,
            home_name,
            completed_modules,
            mandatory_modules_assigned,
            mandatory_modules_completed,
            accepted_workbooks,
            workbooks_needing_amendment,
            qualifications_enrolled,
            qualifications_completed,
            competencies_signed_off,
            certificates_held
        FROM v_user_academy_profile_summary
        WHERE user_id = %s
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
        filters.append("assessor_user_id = %s")
        params.append(assessor_user_id)

    if home_id is not None:
        filters.append("home_id = %s")
        params.append(home_id)

    if queue_status:
        filters.append("queue_status = %s")
        params.append(queue_status)

    if overdue_only:
        filters.append("is_overdue = TRUE")

    query = f"""
        SELECT
            submission_id,
            workbook_id,
            workbook_code,
            workbook_title,
            workbook_type,
            user_id,
            learner_first_name,
            learner_last_name,
            learner_email,
            learner_role,
            home_id,
            home_name,
            assessor_user_id,
            assessor_first_name,
            assessor_last_name,
            status,
            due_date,
            submitted_at,
            reviewed_at,
            attempt_number,
            queue_status,
            is_overdue
        FROM v_workbook_review_queue
        {_build_where(filters)}
        ORDER BY
            is_overdue DESC,
            due_date ASC NULLS LAST,
            submitted_at ASC NULLS LAST
    """
    return _fetch_all(query, tuple(params))

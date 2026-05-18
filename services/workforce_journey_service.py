from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Any

from psycopg2.extras import Json, RealDictCursor

from services.os_sync_hooks import sync_after_save


MANAGER_ROLES = {
    "admin",
    "provider_admin",
    "responsible_individual",
    "registered_manager",
    "deputy_manager",
    "manager",
    "operations_manager",
    "regional_manager",
}

CORE_MODULES = {
    "staff_dashboard",
    "all_staff",
    "staff_profile",
    "training_matrix",
    "supervision",
    "induction",
    "probation",
    "staff_evidence",
}

WORKFORCE_NAVIGATION = [
    ("staff_dashboard", "Staff Dashboard", "/staff", True),
    ("all_staff", "All Staff", "/staff/all", True),
    ("staff_profile", "Staff Profile", "/staff", True),
    ("recruitment", "Recruitment", "/staff/recruitment", False),
    ("safer_recruitment_checks", "Safer Recruitment Checks", "/staff/safer-recruitment", False),
    ("induction", "Induction", "/staff/induction", True),
    ("probation", "Probation", "/staff/probation", True),
    ("training_matrix", "Training Matrix", "/staff/training-matrix", True),
    ("supervision", "Supervision", "/staff/supervision", True),
    ("appraisals", "Appraisals", "/staff/appraisals", False),
    ("practice_observations", "Practice Observations", "/staff/practice-observations", False),
    ("wellbeing", "Wellbeing", "/staff/wellbeing", False),
    ("staff_journal", "Staff Journal", "/staff-journal/me", True),
    ("rota_shifts", "Rota & Shifts", "/shifts/current", True),
    ("staff_evidence", "Staff Evidence", "/staff/evidence", True),
    ("recording_quality", "Recording Quality", "/staff/recording-quality", False),
    ("conduct_capability", "Conduct / Capability", "/staff/conduct-capability", False),
    ("agency_staff", "Agency Staff", "/staff/agency", False),
    ("exit_offboarding", "Exit / Offboarding", "/staff/offboarding", False),
    ("archive", "Archive", "/staff/archive", False),
]

DEFAULT_ROLE_TRAINING = {
    "registered_manager": ["Safeguarding", "Leadership and management", "Medication", "Recording quality", "Safer recruitment"],
    "deputy_manager": ["Safeguarding", "Leadership and management", "Medication", "Recording quality", "Supervision skills"],
    "manager": ["Safeguarding", "Leadership and management", "Medication", "Recording quality", "Supervision skills"],
    "staff": ["Safeguarding", "Medication", "Recording quality", "PACE / relational practice", "Fire safety"],
    "support_worker": ["Safeguarding", "Medication", "Recording quality", "PACE / relational practice", "Fire safety"],
    "agency": ["Safeguarding", "Medication", "Recording quality", "Safer recruitment", "Home induction"],
}

REFLECTIVE_PROMPTS = [
    "What did I notice about my practice, relationships and emotional responses?",
    "Where did the child's voice, wishes and feelings shape my decision-making?",
    "What support, learning or management action would improve practice next time?",
    "Are there wellbeing, workload, competence or conduct concerns that need follow-up?",
]


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        return int(value)
    except Exception:
        return None


def _date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except Exception:
        return None


def _iso(value: Any) -> str | None:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value) if value not in (None, "") else None


def _role(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_")


def calculate_training_status(
    requirement: dict[str, Any],
    record: dict[str, Any] | None,
    *,
    today: date | None = None,
) -> dict[str, Any]:
    today = today or datetime.now(timezone.utc).date()
    training_name = requirement.get("training_name") or requirement.get("name") or "Mandatory training"
    if not record:
        return {
            "training_name": training_name,
            "status": "missing",
            "mandatory": bool(requirement.get("mandatory", True)),
            "expiry_date": None,
            "evidence": None,
        }

    expiry = _date(record.get("expiry_date") or record.get("expires_at") or record.get("valid_until"))
    completed = _date(record.get("completion_date") or record.get("completed_at") or record.get("completed_date"))
    evidence = record.get("evidence_document_id") or record.get("evidence_url") or record.get("document_id")

    if expiry and expiry < today:
        status = "expired"
    elif expiry and expiry <= today + timedelta(days=60):
        status = "due"
    elif completed:
        status = "completed"
    else:
        status = "missing"

    return {
        "training_name": training_name,
        "status": status,
        "mandatory": bool(requirement.get("mandatory", True)),
        "completion_date": _iso(completed),
        "expiry_date": _iso(expiry),
        "evidence": evidence,
        "raw": record,
    }


class WorkforceJourneyService:
    """Adult/workforce journey facade for Sprint A.

    The service consolidates existing staff, supervision, training, evidence and
    task concepts without assuming every deployment already has the new tables.
    """

    def feature_flags(self) -> dict[str, bool]:
        journey_enabled = _env_flag("WORKFORCE_JOURNEY_OS_ENABLED", True)
        full_nav_enabled = _env_flag("WORKFORCE_FULL_NAV_ENABLED", False)
        flags = {
            "workforce_journey_os": journey_enabled,
            "workforce_full_navigation": full_nav_enabled,
        }
        for module_id, _label, _href, is_core in WORKFORCE_NAVIGATION:
            flags[module_id] = journey_enabled and (is_core or full_nav_enabled)
        return flags

    def navigation(self) -> dict[str, Any]:
        flags = self.feature_flags()
        modules = [
            {
                "id": module_id,
                "label": label,
                "href": href,
                "enabled": bool(flags.get(module_id)),
                "reason": None if flags.get(module_id) else "Feature flagged until the workflow is complete.",
            }
            for module_id, label, href, _is_core in WORKFORCE_NAVIGATION
        ]
        return {"feature_flags": flags, "modules": modules}

    def dashboard(self, conn, *, current_user: dict[str, Any]) -> dict[str, Any]:
        staff = self.list_staff(conn, current_user=current_user)["staff"]
        training = self.training_matrix(conn, current_user=current_user)
        supervision = self.list_supervision(conn, current_user=current_user)
        probation = self.probation(conn, current_user=current_user)
        evidence = self.evidence(conn, current_user=current_user)
        alerts = self._dashboard_alerts(staff, training, supervision, probation)
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "home_id": self._home_id(current_user),
            "staff_count": len(staff),
            "alerts": alerts,
            "training": training,
            "supervision": supervision,
            "probation": probation,
            "evidence": evidence,
            "feature_flags": self.feature_flags(),
        }

    def list_staff(self, conn, *, current_user: dict[str, Any]) -> dict[str, Any]:
        rows = self._staff_rows(conn, current_user)
        return {"staff": [self._staff_card(row) for row in rows], "count": len(rows)}

    def staff_profile(self, conn, *, staff_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        self._ensure_can_view(staff_id, current_user)
        staff = self._staff_by_id(conn, staff_id, current_user) or self._fallback_staff(current_user)
        rows = {
            "safer_recruitment": self._optional_rows(conn, "staff_safer_recruitment_checks", staff_id=staff_id),
            "references": self._optional_rows(conn, "staff_references", staff_id=staff_id),
            "qualifications": self._optional_rows(conn, "staff_qualifications", staff_id=staff_id),
            "documents": self._optional_rows(conn, "staff_documents", staff_id=staff_id),
            "shift_history": self._optional_rows(conn, "roster_assignments", staff_id=staff_id),
            "recording_history": self._optional_rows(conn, "staff_recording_quality", staff_id=staff_id),
            "tasks": self._tasks_for_staff(conn, staff_id),
            "wellbeing": self._optional_rows(conn, "staff_wellbeing_checkins", staff_id=staff_id),
            "concerns": self._optional_rows(conn, "staff_practice_concerns", staff_id=staff_id),
            "evidence": self._optional_rows(conn, "workforce_evidence", staff_id=staff_id),
        }
        return {
            "staff": self._staff_card(staff),
            "overview": {
                "status": "inactive" if staff.get("is_active") is False or staff.get("archived") is True else "active",
                "role": staff.get("role"),
                "home_id": staff.get("home_id"),
                "provider_id": staff.get("provider_id"),
            },
            "employment": {
                "role": staff.get("role"),
                "home_id": staff.get("home_id"),
                "start_date": _iso(staff.get("start_date") or staff.get("employment_start_date") or staff.get("created_at")),
                "employment_status": staff.get("employment_status") or "active",
            },
            "dbs": self._latest(rows["safer_recruitment"], "dbs"),
            "right_to_work": self._latest(rows["safer_recruitment"], "right_to_work"),
            "references": rows["references"],
            "qualifications": rows["qualifications"],
            "training": self.training_matrix(conn, current_user=current_user, staff_id=staff_id),
            "supervision": self.list_supervision(conn, current_user=current_user, staff_id=staff_id),
            "probation": self.probation(conn, current_user=current_user, staff_id=staff_id),
            "appraisals": self._optional_rows(conn, "staff_appraisals", staff_id=staff_id),
            "shift_history": rows["shift_history"],
            "recording_history": rows["recording_history"],
            "tasks": rows["tasks"],
            "wellbeing": rows["wellbeing"],
            "concerns": rows["concerns"],
            "evidence": rows["evidence"],
            "documents": rows["documents"],
            "inspection_readiness": self._inspection_links(rows["evidence"]),
        }

    def training_matrix(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        staff_rows = [self._staff_by_id(conn, staff_id, current_user)] if staff_id else self._staff_rows(conn, current_user)
        staff_rows = [row for row in staff_rows if row]
        requirements = self._training_requirements(conn)
        matrix = []
        for staff in staff_rows:
            role = _role(staff.get("role")) or "staff"
            role_requirements = requirements.get(role) or requirements.get("staff") or []
            records = self._training_records(conn, _safe_int(staff.get("id")) or 0)
            by_name = {str(row.get("training_name") or row.get("name") or "").strip().lower(): row for row in records}
            statuses = [
                calculate_training_status(req, by_name.get(str(req.get("training_name")).strip().lower()))
                for req in role_requirements
            ]
            matrix.append({"staff": self._staff_card(staff), "role": role, "items": statuses})
        summary = self._status_counts(item for row in matrix for item in row["items"])
        return {"matrix": matrix, "summary": summary, "provider_view": matrix, "manager_view": matrix}

    def induction(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        rows = self._optional_rows(conn, "staff_induction_checklist_items", staff_id=staff_id)
        completed = [row for row in rows if str(row.get("status") or "").lower() in {"done", "complete", "completed", "signed_off"}]
        return {
            "items": rows,
            "completed": len(completed),
            "total": len(rows),
            "completion_percent": round((len(completed) / len(rows)) * 100) if rows else None,
        }

    def probation(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        rows = self._optional_rows(conn, "staff_probation_reviews", staff_id=staff_id)
        milestones = ["1 month", "3 month", "6 month"]
        return {
            "reviews": rows,
            "milestones": [
                {
                    "label": label,
                    "status": self._milestone_status(rows, label),
                    "manager_sign_off_required": True,
                }
                for label in milestones
            ],
            "support_actions": [row for row in rows if str(row.get("concerns_raised") or row.get("status") or "").lower() in {"true", "concern", "concerns", "support_required"}],
        }

    def evidence(self, conn, *, current_user: dict[str, Any]) -> dict[str, Any]:
        rows = self._optional_rows(conn, "workforce_evidence", home_id=self._home_id(current_user))
        return {
            "items": rows,
            "inspection_links": self._inspection_links(rows),
            "regulation_links": ["reg_13_leadership_and_management", "sccif_leadership_and_management"],
        }

    def list_supervision(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        rows = self._supervision_rows(conn, current_user=current_user, staff_id=staff_id)
        return {
            "records": rows,
            "reflective_prompts": REFLECTIVE_PROMPTS,
            "workflow": ["draft", "submitted", "reviewed", "returned", "archived"],
            "actions": self._supervision_actions(conn, rows),
        }

    def create_supervision(self, conn, *, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        self._ensure_workforce_tables(conn)
        staff_id = _safe_int(payload.get("staff_id")) or _safe_int(current_user.get("id") or current_user.get("user_id"))
        home_id = _safe_int(payload.get("home_id")) or self._home_id(current_user)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO workforce_supervision_records (
                    staff_id, supervisor_id, home_id, title, status, reflective_prompts,
                    reflection, notes, linked_incident_ids, linked_training_need_ids,
                    linked_wellbeing_signal_ids, linked_practice_concern_ids,
                    action_plan, created_by_user_id, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING *
                """,
                (
                    staff_id,
                    _safe_int(current_user.get("id") or current_user.get("user_id")),
                    home_id,
                    payload.get("title") or "Staff supervision",
                    payload.get("status") or "draft",
                    Json(payload.get("reflective_prompts") or REFLECTIVE_PROMPTS),
                    payload.get("reflection"),
                    payload.get("notes"),
                    Json(payload.get("linked_incident_ids") or []),
                    Json(payload.get("linked_training_need_ids") or []),
                    Json(payload.get("linked_wellbeing_signal_ids") or []),
                    Json(payload.get("linked_practice_concern_ids") or []),
                    Json(payload.get("actions") or []),
                    _safe_int(current_user.get("id") or current_user.get("user_id")),
                ),
            )
            record = dict(cur.fetchone() or {})
        self._create_supervision_actions(conn, record, payload.get("actions") or [], current_user)
        conn.commit()
        sync_after_save("staff_supervisions", record, recorded_by_name=current_user.get("email"))
        return {"record": record, "actions": self._supervision_actions(conn, [record])}

    def transition_supervision(
        self,
        conn,
        *,
        supervision_id: int,
        transition: str,
        current_user: dict[str, Any],
        return_note: str | None = None,
    ) -> dict[str, Any]:
        target = {
            "submit": "submitted",
            "review": "reviewed",
            "return": "returned",
            "archive": "archived",
        }.get(transition)
        if not target:
            raise ValueError("Unsupported supervision transition")
        self._ensure_workforce_tables(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE workforce_supervision_records
                SET status = %s,
                    reviewed_by_user_id = CASE WHEN %s = 'reviewed' THEN %s ELSE reviewed_by_user_id END,
                    reviewed_at = CASE WHEN %s = 'reviewed' THEN NOW() ELSE reviewed_at END,
                    returned_at = CASE WHEN %s = 'returned' THEN NOW() ELSE returned_at END,
                    return_note = CASE WHEN %s = 'returned' THEN %s ELSE return_note END,
                    archived_at = CASE WHEN %s = 'archived' THEN NOW() ELSE archived_at END,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (
                    target,
                    target,
                    _safe_int(current_user.get("id") or current_user.get("user_id")),
                    target,
                    target,
                    target,
                    return_note,
                    target,
                    supervision_id,
                ),
            )
            row = cur.fetchone()
        if not row:
            return {"record": None}
        conn.commit()
        record = dict(row)
        sync_after_save("staff_supervisions", record, recorded_by_name=current_user.get("email"))
        return {"record": record}

    def _ensure_workforce_tables(self, conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS workforce_supervision_records (
                    id BIGSERIAL PRIMARY KEY,
                    staff_id BIGINT NOT NULL,
                    supervisor_id BIGINT NULL,
                    home_id BIGINT NULL,
                    title TEXT NOT NULL DEFAULT 'Staff supervision',
                    status TEXT NOT NULL DEFAULT 'draft',
                    reflective_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
                    reflection TEXT NULL,
                    notes TEXT NULL,
                    linked_incident_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                    linked_training_need_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                    linked_wellbeing_signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                    linked_practice_concern_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                    action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_by_user_id BIGINT NULL,
                    reviewed_by_user_id BIGINT NULL,
                    reviewed_at TIMESTAMPTZ NULL,
                    returned_at TIMESTAMPTZ NULL,
                    return_note TEXT NULL,
                    archived_at TIMESTAMPTZ NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS workforce_supervision_actions (
                    id BIGSERIAL PRIMARY KEY,
                    supervision_id BIGINT NOT NULL,
                    staff_id BIGINT NULL,
                    home_id BIGINT NULL,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    priority TEXT NOT NULL DEFAULT 'medium',
                    due_date DATE NULL,
                    created_by_user_id BIGINT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )

    def _table_exists(self, conn, table: str) -> bool:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT to_regclass(%s) IS NOT NULL AS exists", (f"public.{table}",))
                row = cur.fetchone()
            if isinstance(row, dict):
                return bool(row.get("exists"))
            return bool(row and row[0])
        except Exception:
            return False

    def _columns(self, conn, table: str) -> set[str]:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s
                    """,
                    (table,),
                )
                return {str(row.get("column_name")) for row in cur.fetchall() or [] if row.get("column_name")}
        except Exception:
            return set()

    def _optional_rows(self, conn, table: str, *, staff_id: int | None = None, home_id: int | None = None, limit: int = 100) -> list[dict[str, Any]]:
        if not self._table_exists(conn, table):
            return []
        cols = self._columns(conn, table)
        filters = []
        params: list[Any] = []
        if staff_id is not None:
            staff_cols = [col for col in ("staff_id", "staff_user_id", "user_id") if col in cols]
            if not staff_cols:
                return []
            filters.append("(" + " OR ".join(f"{col} = %s" for col in staff_cols) + ")")
            params.extend([staff_id] * len(staff_cols))
        if home_id is not None and "home_id" in cols:
            filters.append("home_id = %s")
            params.append(home_id)
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        params.append(limit)
        order_col = "updated_at" if "updated_at" in cols else "created_at" if "created_at" in cols else "id" if "id" in cols else None
        order = f"ORDER BY {order_col} DESC NULLS LAST" if order_col else ""
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"SELECT * FROM {table} {where} {order} LIMIT %s", tuple(params))
                return [dict(row) for row in cur.fetchall() or []]
        except Exception:
            return []

    def _staff_rows(self, conn, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        home_id = self._home_id(current_user)
        queries = [
            (
                """
                SELECT id, email, role, home_id, provider_id, first_name, last_name, full_name,
                       is_active, archived, created_at, updated_at
                FROM users
                WHERE (%s IS NULL OR home_id = %s)
                  AND COALESCE(is_active, TRUE) = TRUE
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY first_name ASC NULLS LAST, last_name ASC NULLS LAST, email ASC
                LIMIT 250
                """,
                (home_id, home_id),
            ),
            (
                """
                SELECT id, email, role, primary_home_id AS home_id, provider_id, first_name, last_name, full_name,
                       is_active, archived, created_at, updated_at
                FROM users
                WHERE (%s IS NULL OR primary_home_id = %s)
                  AND COALESCE(is_active, TRUE) = TRUE
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY first_name ASC NULLS LAST, last_name ASC NULLS LAST, email ASC
                LIMIT 250
                """,
                (home_id, home_id),
            ),
        ]
        for query, params in queries:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, params)
                    rows = [dict(row) for row in cur.fetchall() or []]
                if rows:
                    return rows
            except Exception:
                continue
        return [self._fallback_staff(current_user)]

    def _staff_by_id(self, conn, staff_id: int | None, current_user: dict[str, Any]) -> dict[str, Any] | None:
        if not staff_id:
            return None
        for query in (
            "SELECT id, email, role, home_id, provider_id, first_name, last_name, full_name, is_active, archived, created_at, updated_at FROM users WHERE id = %s LIMIT 1",
            "SELECT id, email, role, primary_home_id AS home_id, provider_id, first_name, last_name, full_name, is_active, archived, created_at, updated_at FROM users WHERE id = %s LIMIT 1",
        ):
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, (staff_id,))
                    row = cur.fetchone()
                if row:
                    return dict(row)
            except Exception:
                continue
        if staff_id == _safe_int(current_user.get("id") or current_user.get("user_id")):
            return self._fallback_staff(current_user)
        return None

    def _fallback_staff(self, current_user: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": current_user.get("id") or current_user.get("user_id"),
            "email": current_user.get("email"),
            "role": current_user.get("role"),
            "home_id": current_user.get("home_id"),
            "provider_id": current_user.get("provider_id"),
            "first_name": current_user.get("first_name"),
            "last_name": current_user.get("last_name"),
            "full_name": current_user.get("full_name") or current_user.get("name") or current_user.get("email"),
            "is_active": True,
            "archived": False,
        }

    def _staff_card(self, row: dict[str, Any]) -> dict[str, Any]:
        name = row.get("full_name") or " ".join([str(row.get("first_name") or "").strip(), str(row.get("last_name") or "").strip()]).strip() or row.get("email") or "Staff member"
        return {
            "id": str(row.get("id")),
            "title": name,
            "name": name,
            "email": row.get("email"),
            "role": row.get("role"),
            "home_id": row.get("home_id"),
            "provider_id": row.get("provider_id"),
            "status": "inactive" if row.get("is_active") is False or row.get("archived") is True else "active",
            "raw": row,
        }

    def _training_requirements(self, conn) -> dict[str, list[dict[str, Any]]]:
        requirements: dict[str, list[dict[str, Any]]] = {}
        if self._table_exists(conn, "staff_training_requirements"):
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM staff_training_requirements WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY role ASC, training_name ASC")
                    for row in cur.fetchall() or []:
                        item = dict(row)
                        requirements.setdefault(_role(item.get("role")) or "staff", []).append(item)
            except Exception:
                requirements = {}
        if not requirements:
            requirements = {
                role: [{"role": role, "training_name": name, "mandatory": True} for name in names]
                for role, names in DEFAULT_ROLE_TRAINING.items()
            }
        return requirements

    def _training_records(self, conn, staff_id: int) -> list[dict[str, Any]]:
        for table in ("staff_training_matrix", "staff_training_records"):
            rows = self._optional_rows(conn, table, staff_id=staff_id)
            if rows:
                return rows
        return []

    def _supervision_rows(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> list[dict[str, Any]]:
        if self._table_exists(conn, "workforce_supervision_records"):
            filters = []
            params: list[Any] = []
            if staff_id is not None:
                filters.append("s.staff_id = %s")
                params.append(staff_id)
            elif not self._is_manager(current_user):
                filters.append("s.staff_id = %s")
                params.append(_safe_int(current_user.get("id") or current_user.get("user_id")))
            where = f"WHERE {' AND '.join(filters)}" if filters else ""
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT s.*, u.email, u.first_name, u.last_name, u.role
                        FROM workforce_supervision_records s
                        LEFT JOIN users u ON u.id = s.staff_id
                        {where}
                        ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
                        LIMIT 100
                        """,
                        tuple(params),
                    )
                    return [dict(row) for row in cur.fetchall() or []]
            except Exception:
                return []
        return self._optional_rows(conn, "supervision_submissions", staff_id=staff_id)

    def _supervision_actions(self, conn, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not records or not self._table_exists(conn, "workforce_supervision_actions"):
            return []
        ids = [_safe_int(row.get("id")) for row in records if _safe_int(row.get("id")) is not None]
        if not ids:
            return []
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM workforce_supervision_actions WHERE supervision_id = ANY(%s) ORDER BY created_at DESC",
                    (ids,),
                )
                return [dict(row) for row in cur.fetchall() or []]
        except Exception:
            return []

    def _create_supervision_actions(self, conn, record: dict[str, Any], actions: list[dict[str, Any]], current_user: dict[str, Any]) -> None:
        if not actions:
            return
        with conn.cursor() as cur:
            for action in actions:
                title = str(action.get("title") or action.get("task") or "").strip()
                if not title:
                    continue
                cur.execute(
                    """
                    INSERT INTO workforce_supervision_actions (
                        supervision_id, staff_id, home_id, title, status, priority, due_date, created_by_user_id
                    )
                    VALUES (%s, %s, %s, %s, COALESCE(%s, 'open'), COALESCE(%s, 'medium'), %s, %s)
                    """,
                    (
                        record.get("id"),
                        record.get("staff_id"),
                        record.get("home_id"),
                        title,
                        action.get("status"),
                        action.get("priority"),
                        action.get("due_date"),
                        _safe_int(current_user.get("id") or current_user.get("user_id")),
                    ),
                )

    def _tasks_for_staff(self, conn, staff_id: int) -> list[dict[str, Any]]:
        if not self._table_exists(conn, "tasks"):
            return []
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM tasks WHERE assigned_to = %s ORDER BY due_at ASC NULLS LAST, created_at DESC LIMIT 50", (staff_id,))
                return [dict(row) for row in cur.fetchall() or []]
        except Exception:
            return []

    def _latest(self, rows: list[dict[str, Any]], check_type: str) -> dict[str, Any] | None:
        check_type = check_type.lower()
        for row in rows:
            text = " ".join(str(row.get(key) or "") for key in ("check_type", "type", "title", "name")).lower()
            if check_type in text:
                return row
        return rows[0] if rows else None

    def _inspection_links(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "reg_13": [row for row in rows if "reg_13" in str(row).lower() or rows],
            "sccif_leadership_and_management": rows,
            "summary": "Workforce evidence supports Reg 13 and SCCIF leadership and management when records are linked.",
        }

    def _status_counts(self, items) -> dict[str, int]:
        counts = {"completed": 0, "due": 0, "expired": 0, "missing": 0}
        for item in items:
            status = str(item.get("status") or "missing")
            counts[status] = counts.get(status, 0) + 1
        return counts

    def _milestone_status(self, rows: list[dict[str, Any]], label: str) -> str:
        label_key = label.lower().replace(" ", "")
        for row in rows:
            text = " ".join(str(row.get(key) or "") for key in ("milestone", "review_type", "title")).lower().replace(" ", "")
            if label_key in text:
                return str(row.get("status") or "recorded")
        return "missing"

    def _dashboard_alerts(
        self,
        staff: list[dict[str, Any]],
        training: dict[str, Any],
        supervision: dict[str, Any],
        probation: dict[str, Any],
    ) -> list[dict[str, Any]]:
        summary = training.get("summary") or {}
        alerts = [
            {"id": "training_expiry", "label": "Training expired or due", "count": int(summary.get("expired", 0)) + int(summary.get("due", 0)), "severity": "high"},
            {"id": "missing_training", "label": "Mandatory training missing", "count": int(summary.get("missing", 0)), "severity": "high"},
            {"id": "overdue_supervisions", "label": "Overdue supervisions", "count": len([row for row in supervision.get("records", []) if str(row.get("status") or "").lower() in {"overdue", "returned"}]), "severity": "medium"},
            {"id": "probation_reviews", "label": "Probation milestones needing sign-off", "count": len([row for row in probation.get("milestones", []) if row.get("status") == "missing"]), "severity": "medium"},
            {"id": "safer_recruitment", "label": "Missing safer recruitment checks", "count": 0, "severity": "high"},
            {"id": "recording_quality", "label": "Recording quality concerns", "count": 0, "severity": "medium"},
            {"id": "wellbeing", "label": "Wellbeing flags", "count": 0, "severity": "medium"},
            {"id": "staffing_sufficiency", "label": "Staffing sufficiency alerts", "count": 0 if staff else 1, "severity": "high"},
            {"id": "agency_compliance", "label": "Agency staff compliance gaps", "count": len([row for row in staff if "agency" in str(row.get("role") or "").lower()]), "severity": "medium"},
        ]
        return alerts

    def _home_id(self, current_user: dict[str, Any]) -> int | None:
        return _safe_int(current_user.get("home_id") or current_user.get("homeId") or current_user.get("selected_home_id"))

    def _is_manager(self, current_user: dict[str, Any]) -> bool:
        return _role(current_user.get("role")) in MANAGER_ROLES

    def _ensure_can_view(self, staff_id: int, current_user: dict[str, Any]) -> None:
        current_id = _safe_int(current_user.get("id") or current_user.get("user_id"))
        if staff_id == current_id or self._is_manager(current_user):
            return
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="You do not have permission to view this staff profile.")

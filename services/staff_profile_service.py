from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection
from services.academy_intelligence_service import AcademyIntelligenceService
from services.academy_service import AcademyService


MANAGER_ROLES = {
    "super_admin",
    "provider_admin",
    "responsible_individual",
    "registered_manager",
    "deputy_manager",
    "manager",
    "admin",
    "trainer",
    "assessor",
    "iqa",
    "auditor",
}


class StaffProfileService:
    """Single staff lifecycle hub.

    This joins the staff record to onboarding, induction, probation, supervision,
    appraisal, Academy, practice intelligence and exit readiness. It is designed
    to work before every HR table exists: optional tables are queried safely and
    return empty sections when not present.
    """

    def get_my_profile(self, *, current_user: dict[str, Any]) -> dict[str, Any]:
        return self.get_staff_profile(
            staff_user_id=self._current_user_id(current_user),
            current_user=current_user,
        )

    def get_staff_profile(self, *, staff_user_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        self._ensure_can_view_staff(staff_user_id, current_user)

        staff = self._get_user(staff_user_id)
        if not staff:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

        academy = AcademyService()
        intelligence = AcademyIntelligenceService().get_user_intelligence(
            user_id=staff_user_id,
            current_user=current_user,
        )

        lifecycle = self._build_lifecycle(staff_user_id)
        employment = self._employment_snapshot(staff, lifecycle)
        academy_snapshot = {
            "profile": (academy.get_learner_profile_summary(staff_user_id).model_dump() if academy.get_learner_profile_summary(staff_user_id) else None),
            "modules": academy.get_user_modules(staff_user_id),
            "workbooks": academy.get_user_workbooks(staff_user_id),
            "certificates": academy.get_user_certificates(staff_user_id),
            "evidence": academy.get_user_evidence(staff_user_id),
            "intelligence": intelligence,
        }

        return {
            "staff": staff,
            "employment": employment,
            "lifecycle": lifecycle,
            "academy": academy_snapshot,
            "supervision": self._supervision_snapshot(staff_user_id),
            "probation": self._probation_snapshot(staff_user_id, lifecycle),
            "induction": self._induction_snapshot(staff_user_id, lifecycle),
            "appraisal": self._appraisal_snapshot(staff_user_id),
            "exit": self._exit_snapshot(staff_user_id),
            "manager_actions": self._manager_actions(lifecycle, intelligence),
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }

    def list_home_staff_profiles(self, *, home_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        self._ensure_manager(current_user)
        staff = self._staff_for_home(home_id)
        cards = []
        for row in staff:
            intelligence = AcademyIntelligenceService().get_user_intelligence(
                user_id=int(row["id"]),
                current_user=current_user,
            )
            lifecycle = self._build_lifecycle(int(row["id"]))
            cards.append(
                {
                    "staff": row,
                    "employment_stage": lifecycle.get("current_stage"),
                    "priority_score": intelligence.get("priority_score"),
                    "top_learning_needs": intelligence.get("learning_needs", [])[:3],
                    "open_manager_actions": self._manager_actions(lifecycle, intelligence)[:3],
                    "profile_link": f"/staff-profile.html?id={row['id']}",
                }
            )
        return {"home_id": home_id, "staff_count": len(staff), "staff_profiles": cards}

    def _build_lifecycle(self, staff_user_id: int) -> dict[str, Any]:
        onboarding = self._latest_optional_row(
            [
                ("SELECT * FROM staff_onboarding WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
                ("SELECT * FROM onboarding_records WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
            ]
        )
        induction = self._latest_optional_row(
            [
                ("SELECT * FROM staff_inductions WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
                ("SELECT * FROM induction_records WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
            ]
        )
        probation = self._latest_optional_row(
            [
                ("SELECT * FROM staff_probation WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
                ("SELECT * FROM probation_reviews WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
            ]
        )
        appraisal = self._latest_optional_row(
            [
                ("SELECT * FROM staff_appraisals WHERE staff_user_id = %s ORDER BY appraisal_date DESC NULLS LAST, created_at DESC LIMIT 1", (staff_user_id,)),
                ("SELECT * FROM appraisals WHERE staff_user_id = %s ORDER BY appraisal_date DESC NULLS LAST, created_at DESC LIMIT 1", (staff_user_id,)),
            ]
        )
        exit_record = self._latest_optional_row(
            [
                ("SELECT * FROM staff_exit_interviews WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
                ("SELECT * FROM exit_interviews WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
            ]
        )

        current_stage = "active"
        if exit_record:
            current_stage = "exit"
        elif probation and str(probation.get("status") or "").lower() not in {"passed", "complete", "completed"}:
            current_stage = "probation"
        elif induction and str(induction.get("status") or "").lower() not in {"complete", "completed", "signed_off"}:
            current_stage = "induction"
        elif onboarding and str(onboarding.get("status") or "").lower() not in {"complete", "completed"}:
            current_stage = "onboarding"

        return {
            "current_stage": current_stage,
            "onboarding": onboarding,
            "induction": induction,
            "probation": probation,
            "appraisal": appraisal,
            "exit": exit_record,
        }

    def _employment_snapshot(self, staff: dict[str, Any], lifecycle: dict[str, Any]) -> dict[str, Any]:
        start_date = staff.get("start_date") or staff.get("employment_start_date") or staff.get("created_at")
        return {
            "status": "inactive" if staff.get("is_active") is False or staff.get("archived") is True else "active",
            "role": staff.get("role"),
            "home_id": staff.get("home_id"),
            "provider_id": staff.get("provider_id"),
            "start_date": start_date,
            "current_stage": lifecycle.get("current_stage"),
        }

    def _induction_snapshot(self, staff_user_id: int, lifecycle: dict[str, Any]) -> dict[str, Any]:
        checklist_items = self._optional_rows(
            [
                ("SELECT * FROM staff_induction_checklist_items WHERE staff_user_id = %s ORDER BY due_date ASC NULLS LAST, id ASC", (staff_user_id,)),
                ("SELECT * FROM induction_checklist_items WHERE staff_user_id = %s ORDER BY due_date ASC NULLS LAST, id ASC", (staff_user_id,)),
            ]
        )
        completed = sum(1 for item in checklist_items if str(item.get("status") or "").lower() in {"done", "complete", "completed", "signed_off"})
        total = len(checklist_items)
        return {
            "record": lifecycle.get("induction"),
            "checklist_items": checklist_items,
            "completed_items": completed,
            "total_items": total,
            "completion_percent": round((completed / total) * 100) if total else None,
        }

    def _probation_snapshot(self, staff_user_id: int, lifecycle: dict[str, Any]) -> dict[str, Any]:
        reviews = self._optional_rows(
            [
                ("SELECT * FROM staff_probation_reviews WHERE staff_user_id = %s ORDER BY review_date DESC NULLS LAST, created_at DESC", (staff_user_id,)),
                ("SELECT * FROM probation_reviews WHERE staff_user_id = %s ORDER BY review_date DESC NULLS LAST, created_at DESC", (staff_user_id,)),
            ]
        )
        return {"record": lifecycle.get("probation"), "reviews": reviews, "review_count": len(reviews)}

    def _supervision_snapshot(self, staff_user_id: int) -> dict[str, Any]:
        rows = self._optional_rows(
            [
                ("SELECT * FROM supervision_notes WHERE staff_user_id = %s OR supervisee_user_id = %s OR user_id = %s ORDER BY supervision_date DESC NULLS LAST, created_at DESC LIMIT 10", (staff_user_id, staff_user_id, staff_user_id)),
                ("SELECT * FROM supervisions WHERE staff_user_id = %s OR supervisee_user_id = %s OR user_id = %s ORDER BY supervision_date DESC NULLS LAST, created_at DESC LIMIT 10", (staff_user_id, staff_user_id, staff_user_id)),
            ]
        )
        last_date = rows[0].get("supervision_date") if rows else None
        return {"latest": rows[0] if rows else None, "recent": rows, "last_supervision_date": last_date}

    def _appraisal_snapshot(self, staff_user_id: int) -> dict[str, Any]:
        rows = self._optional_rows(
            [
                ("SELECT * FROM staff_appraisals WHERE staff_user_id = %s ORDER BY appraisal_date DESC NULLS LAST, created_at DESC LIMIT 5", (staff_user_id,)),
                ("SELECT * FROM appraisals WHERE staff_user_id = %s ORDER BY appraisal_date DESC NULLS LAST, created_at DESC LIMIT 5", (staff_user_id,)),
            ]
        )
        return {"latest": rows[0] if rows else None, "recent": rows}

    def _exit_snapshot(self, staff_user_id: int) -> dict[str, Any]:
        record = self._latest_optional_row(
            [
                ("SELECT * FROM staff_exit_interviews WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
                ("SELECT * FROM exit_interviews WHERE staff_user_id = %s ORDER BY created_at DESC LIMIT 1", (staff_user_id,)),
            ]
        )
        return {"record": record, "exit_in_progress": bool(record)}

    def _manager_actions(self, lifecycle: dict[str, Any], intelligence: dict[str, Any]) -> list[dict[str, Any]]:
        actions: list[dict[str, Any]] = []
        stage = lifecycle.get("current_stage")
        if stage == "onboarding":
            actions.append({"priority": "high", "action": "Complete onboarding checks and confirm right documents are held."})
        if stage == "induction":
            actions.append({"priority": "high", "action": "Review induction progress and sign off direct observations."})
        if stage == "probation":
            actions.append({"priority": "high", "action": "Hold probation review and link any gaps to Academy learning."})
        if stage == "exit":
            actions.append({"priority": "medium", "action": "Complete exit interview, retrieve assets and close access safely."})
        for item in intelligence.get("manager_actions", []):
            actions.append({"priority": item.get("priority", "medium"), "action": item.get("action")})
        return [a for a in actions if a.get("action")]

    def _get_user(self, user_id: int) -> dict[str, Any] | None:
        queries = [
            """
            SELECT id, email, role, home_id, provider_id, first_name, last_name, is_active, archived, created_at, updated_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            """
            SELECT id, email, role, primary_home_id AS home_id, provider_id, first_name, last_name, is_active, archived, created_at, updated_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
        ]
        for query in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (user_id,))
                        row = cur.fetchone()
                return dict(row) if row else None
            except Exception:
                continue
        return None

    def _staff_for_home(self, home_id: int) -> list[dict[str, Any]]:
        queries = [
            """
            SELECT id, email, role, home_id, provider_id, first_name, last_name, is_active, archived, created_at, updated_at
            FROM users
            WHERE home_id = %s AND COALESCE(is_active, TRUE) = TRUE AND COALESCE(archived, FALSE) = FALSE
            ORDER BY first_name ASC, last_name ASC
            """,
            """
            SELECT id, email, role, primary_home_id AS home_id, provider_id, first_name, last_name, is_active, archived, created_at, updated_at
            FROM users
            WHERE primary_home_id = %s AND COALESCE(is_active, TRUE) = TRUE AND COALESCE(archived, FALSE) = FALSE
            ORDER BY first_name ASC, last_name ASC
            """,
        ]
        for query in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (home_id,))
                        rows = cur.fetchall()
                return [dict(row) for row in rows]
            except Exception:
                continue
        return []

    def _optional_rows(self, queries: list[tuple[str, tuple[Any, ...]]]) -> list[dict[str, Any]]:
        for query, params in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, params)
                        rows = cur.fetchall()
                return [dict(row) for row in rows]
            except Exception:
                continue
        return []

    def _latest_optional_row(self, queries: list[tuple[str, tuple[Any, ...]]]) -> dict[str, Any] | None:
        rows = self._optional_rows(queries)
        return rows[0] if rows else None

    def _current_user_id(self, current_user: dict[str, Any]) -> int:
        return int(current_user.get("id") or current_user.get("user_id"))

    def _current_user_role(self, current_user: dict[str, Any]) -> str:
        return str(current_user.get("role") or current_user.get("user_role") or "").strip().lower()

    def _ensure_can_view_staff(self, staff_user_id: int, current_user: dict[str, Any]) -> None:
        if staff_user_id == self._current_user_id(current_user):
            return
        self._ensure_manager(current_user)

    def _ensure_manager(self, current_user: dict[str, Any]) -> None:
        if self._current_user_role(current_user) not in MANAGER_ROLES:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view staff profiles.")

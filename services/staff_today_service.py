from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection
from services.staff_profile_service import StaffProfileService


class StaffTodayService:
    """Turns a staff profile into a clear daily operating brief."""

    def get_my_today(self, *, current_user: dict[str, Any]) -> dict[str, Any]:
        profile = StaffProfileService().get_my_profile(current_user=current_user)
        return self.build_today_payload(profile)

    def get_staff_today(self, *, staff_user_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        profile = StaffProfileService().get_staff_profile(
            staff_user_id=staff_user_id,
            current_user=current_user,
        )
        return self.build_today_payload(profile)

    def build_today_payload(self, profile: dict[str, Any]) -> dict[str, Any]:
        staff = profile.get("staff") or {}
        lifecycle = profile.get("lifecycle") or {}
        academy = profile.get("academy") or {}
        intelligence = academy.get("intelligence") or {}
        supervision = profile.get("supervision") or {}
        appraisal = profile.get("appraisal") or {}
        probation = profile.get("probation") or {}
        induction = profile.get("induction") or {}
        rota = self._rostering_today(staff)

        due_items: list[dict[str, Any]] = []
        reminders: list[dict[str, Any]] = []
        warnings: list[dict[str, Any]] = []
        quick_links = [
            {"label": "My Profile", "href": "/my-profile"},
            {"label": "Academy", "href": "/academy"},
            {"label": "Rostering", "href": "/rostering"},
            {"label": "Staff Hub", "href": "/staff-profiles"},
        ]

        stage = lifecycle.get("current_stage") or "active"
        if stage in {"onboarding", "induction", "probation", "exit"}:
            due_items.append({
                "type": "lifecycle",
                "priority": "high",
                "title": f"You are currently in {stage}",
                "detail": "Check the lifecycle section and complete any outstanding actions.",
                "href": "/my-profile",
            })

        induction_percent = induction.get("completion_percent")
        if induction_percent is not None and induction_percent < 100:
            due_items.append({
                "type": "induction",
                "priority": "high",
                "title": "Induction is not complete",
                "detail": f"Current induction completion is {induction_percent}%.",
                "href": "/my-profile",
            })

        if probation.get("review_count", 0) == 0 and stage == "probation":
            warnings.append({
                "type": "probation",
                "priority": "high",
                "title": "Probation review needs attention",
                "detail": "No probation review has been found for this staff member.",
            })

        last_supervision = supervision.get("last_supervision_date")
        supervision_status = self._dated_status(last_supervision, due_after_days=30)
        if supervision_status["state"] in {"due", "overdue", "missing"}:
            due_items.append({
                "type": "supervision",
                "priority": "high" if supervision_status["state"] in {"overdue", "missing"} else "medium",
                "title": "Supervision needs review",
                "detail": supervision_status["label"],
                "href": "/supervision",
            })

        latest_appraisal = appraisal.get("latest") or {}
        appraisal_date = latest_appraisal.get("appraisal_date") or latest_appraisal.get("created_at")
        appraisal_status = self._dated_status(appraisal_date, due_after_days=365)
        if appraisal_status["state"] in {"due", "overdue", "missing"}:
            reminders.append({
                "type": "appraisal",
                "priority": "medium",
                "title": "Appraisal check",
                "detail": appraisal_status["label"],
                "href": "/my-profile",
            })

        for row in academy.get("modules") or []:
            if row.get("is_overdue"):
                due_items.append({
                    "type": "training",
                    "priority": "high",
                    "title": row.get("module_title") or row.get("title") or "Training overdue",
                    "detail": "Mandatory training appears overdue.",
                    "href": f"/academy/module-detail.html?id={row.get('module_id') or row.get('id')}",
                })

        for shift in rota.get("today_shifts") or []:
            due_items.append({
                "type": "rota_shift",
                "priority": "high",
                "title": f"You are rostered today: {shift.get('shift_type')}",
                "detail": f"{shift.get('start_time')} to {shift.get('end_time')} at {shift.get('home_name') or 'your home'}. Status: {shift.get('assignment_status') or 'assigned'}.",
                "href": "/rostering",
            })
            if not shift.get("checked_in"):
                reminders.append({
                    "type": "check_in",
                    "priority": "medium",
                    "title": "Check-in not recorded for this shift",
                    "detail": "Use rostering check-in when you arrive so attendance evidence is complete.",
                    "href": "/rostering",
                })
            if shift.get("training_valid_until") and str(shift.get("training_valid_until")) < str(date.today()):
                warnings.append({
                    "type": "training_expired_for_shift",
                    "priority": "high",
                    "title": "Training may be expired before today’s shift",
                    "detail": "Rostering has flagged a training validity date before this shift.",
                })

        for warning in rota.get("warnings") or []:
            warnings.append({
                "type": warning.get("type") or "rota_warning",
                "priority": warning.get("level") or "medium",
                "title": "Rostering warning",
                "detail": warning.get("message") or "A rota issue needs review.",
            })

        for need in intelligence.get("learning_needs") or []:
            reminders.append({
                "type": "learning_need",
                "priority": need.get("priority") or "medium",
                "title": need.get("title") or "Learning need",
                "detail": need.get("reason") or "Review this learning area.",
                "href": "/my-profile",
            })

        for action in profile.get("manager_actions") or []:
            due_items.append({
                "type": "manager_action",
                "priority": action.get("priority") or "medium",
                "title": action.get("action") or "Manager action",
                "detail": "Action set from lifecycle or practice intelligence.",
                "href": "/my-profile",
            })

        priority_score = int(intelligence.get("priority_score") or 0)
        priority_score += min(20, len(rota.get("warnings") or []) * 5)
        priority_score += min(10, len(rota.get("today_shifts") or []) * 2)
        priority_score = max(0, min(priority_score, 100))

        if priority_score >= 70:
            warnings.append({
                "type": "attention_score",
                "priority": "high",
                "title": "High attention score",
                "detail": "This profile has multiple signals requiring review.",
            })

        return {
            "staff": {
                "id": staff.get("id"),
                "name": " ".join([str(staff.get("first_name") or ""), str(staff.get("last_name") or "")]).strip(),
                "role": staff.get("role"),
                "home_id": staff.get("home_id"),
            },
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "priority_score": priority_score,
            "summary": self._summary(due_items, reminders, warnings),
            "due_now": due_items[:16],
            "reminders": reminders[:16],
            "warnings": warnings[:16],
            "rota": rota,
            "quick_links": quick_links,
            "assistant_context": self._assistant_context(staff, due_items, reminders, warnings, intelligence, rota),
        }

    def _rostering_today(self, staff: dict[str, Any]) -> dict[str, Any]:
        user_id = staff.get("id")
        email = staff.get("email")
        full_name = " ".join([str(staff.get("first_name") or ""), str(staff.get("last_name") or "")]).strip()
        today = date.today()

        queries = [
            (
                """
                SELECT
                    rs.id AS shift_id,
                    rs.home_id,
                    h.name AS home_name,
                    rs.shift_date,
                    rs.shift_type,
                    rs.start_time,
                    rs.end_time,
                    ra.assignment_status,
                    st.id AS roster_staff_id,
                    st.full_name,
                    st.role,
                    st.training_valid_until,
                    EXISTS (
                        SELECT 1 FROM staff_checkins sc
                        WHERE sc.shift_id = rs.id
                          AND sc.staff_id = st.id
                          AND sc.event_type = 'check_in'
                    ) AS checked_in
                FROM roster_assignments ra
                JOIN roster_shifts rs ON rs.id = ra.shift_id
                LEFT JOIN homes h ON h.id = rs.home_id
                JOIN staff st ON st.id = ra.staff_id
                WHERE rs.shift_date = %s
                  AND (st.user_id = %s OR st.email = %s OR LOWER(st.full_name) = LOWER(%s))
                ORDER BY rs.start_time, rs.id
                """,
                (today, user_id, email, full_name),
            ),
            (
                """
                SELECT
                    rs.id AS shift_id,
                    rs.home_id,
                    h.name AS home_name,
                    rs.shift_date,
                    rs.shift_type,
                    rs.start_time,
                    rs.end_time,
                    ra.assignment_status,
                    st.id AS roster_staff_id,
                    st.full_name,
                    st.role,
                    st.training_valid_until,
                    EXISTS (
                        SELECT 1 FROM staff_checkins sc
                        WHERE sc.shift_id = rs.id
                          AND sc.staff_id = st.id
                          AND sc.event_type = 'check_in'
                    ) AS checked_in
                FROM roster_assignments ra
                JOIN roster_shifts rs ON rs.id = ra.shift_id
                LEFT JOIN homes h ON h.id = rs.home_id
                JOIN staff st ON st.id = ra.staff_id
                WHERE rs.shift_date = %s
                  AND (st.email = %s OR LOWER(st.full_name) = LOWER(%s))
                ORDER BY rs.start_time, rs.id
                """,
                (today, email, full_name),
            ),
        ]

        shifts: list[dict[str, Any]] = []
        for query, params in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, params)
                        rows = cur.fetchall()
                shifts = [dict(row) for row in rows]
                if shifts:
                    break
            except Exception:
                continue

        warnings: list[dict[str, Any]] = []
        for shift in shifts:
            if shift.get("training_valid_until") and str(shift.get("training_valid_until")) < str(today):
                warnings.append({
                    "level": "high",
                    "type": "training_expired",
                    "message": f"Training validity appears expired for {shift.get('shift_type')} today.",
                })
            if not shift.get("checked_in"):
                warnings.append({
                    "level": "medium",
                    "type": "attendance_pending",
                    "message": f"Check-in is not recorded for {shift.get('shift_type')} today.",
                })

        return {
            "date": str(today),
            "today_shifts": shifts,
            "shift_count": len(shifts),
            "warnings": warnings,
        }

    def _dated_status(self, value: Any, *, due_after_days: int) -> dict[str, str]:
        if not value:
            return {"state": "missing", "label": "No date has been recorded."}
        parsed = self._parse_date(value)
        if not parsed:
            return {"state": "unknown", "label": str(value)}
        days = (date.today() - parsed).days
        if days > due_after_days + 14:
            return {"state": "overdue", "label": f"Last recorded {days} days ago."}
        if days >= due_after_days:
            return {"state": "due", "label": f"Last recorded {days} days ago."}
        return {"state": "ok", "label": f"Last recorded {days} days ago."}

    def _parse_date(self, value: Any) -> date | None:
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
        except Exception:
            try:
                return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
            except Exception:
                return None

    def _summary(self, due_items: list[dict[str, Any]], reminders: list[dict[str, Any]], warnings: list[dict[str, Any]]) -> str:
        if not due_items and not reminders and not warnings:
            return "Nothing urgent is currently showing. Keep your profile, training, rota and evidence up to date."
        return f"{len(due_items)} actions due now, {len(reminders)} reminders and {len(warnings)} warnings."

    def _assistant_context(
        self,
        staff: dict[str, Any],
        due_items: list[dict[str, Any]],
        reminders: list[dict[str, Any]],
        warnings: list[dict[str, Any]],
        intelligence: dict[str, Any],
        rota: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "staff_name": " ".join([str(staff.get("first_name") or ""), str(staff.get("last_name") or "")]).strip(),
            "role": staff.get("role"),
            "priority_score": intelligence.get("priority_score"),
            "rota_today": rota,
            "top_due_items": due_items[:5],
            "top_reminders": reminders[:5],
            "warnings": warnings[:5],
            "suggested_questions": [
                "What do I need to do today?",
                "Am I on shift today?",
                "What training should I complete first?",
                "What should I discuss in supervision?",
                "What evidence should I add to my portfolio?",
            ],
        }

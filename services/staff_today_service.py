from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

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

        due_items = []
        reminders = []
        warnings = []
        quick_links = [
            {"label": "My Profile", "href": "/my-profile"},
            {"label": "Academy", "href": "/academy"},
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
            "due_now": due_items[:12],
            "reminders": reminders[:12],
            "warnings": warnings[:12],
            "quick_links": quick_links,
            "assistant_context": self._assistant_context(staff, due_items, reminders, warnings, intelligence),
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
            return "Nothing urgent is currently showing. Keep your profile, training and evidence up to date."
        return f"{len(due_items)} actions due now, {len(reminders)} reminders and {len(warnings)} warnings."

    def _assistant_context(
        self,
        staff: dict[str, Any],
        due_items: list[dict[str, Any]],
        reminders: list[dict[str, Any]],
        warnings: list[dict[str, Any]],
        intelligence: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "staff_name": " ".join([str(staff.get("first_name") or ""), str(staff.get("last_name") or "")]).strip(),
            "role": staff.get("role"),
            "priority_score": intelligence.get("priority_score"),
            "top_due_items": due_items[:5],
            "top_reminders": reminders[:5],
            "warnings": warnings[:5],
            "suggested_questions": [
                "What do I need to do today?",
                "What training should I complete first?",
                "What should I discuss in supervision?",
                "What evidence should I add to my portfolio?",
            ],
        }

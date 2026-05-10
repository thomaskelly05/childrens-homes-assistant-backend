from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection
from services.staff_today_service import StaffTodayService
from services.staff_profile_service import StaffProfileService


MANAGER_ROLES = {
    "super_admin",
    "provider_admin",
    "responsible_individual",
    "registered_manager",
    "deputy_manager",
    "manager",
    "admin",
    "auditor",
}


class InspectionOSService:
    """SCCIF/Quality Standards operating layer.

    This is intentionally additive and tolerant of incomplete schemas. It turns
    existing records into inspection-ready views: responsibility, shift safety,
    leadership oversight, child voice, consistency, competency, safeguarding
    narrative and enforcement gates.
    """

    def my_operating_brief(self, *, current_user: dict[str, Any]) -> dict[str, Any]:
        today = StaffTodayService().get_my_today(current_user=current_user)
        return {
            "generated_at": self._now(),
            "staff_today": today,
            "responsibility": self._responsibility_for_staff(today.get("staff", {})),
            "shift_safety": self._shift_safety_for_staff(today),
            "enforcement": self._enforcement_for_staff(today),
            "assistant_prompts": [
                "What do I need to do today?",
                "Is my shift safe?",
                "Who am I responsible for today?",
                "What must I complete before the end of my shift?",
            ],
        }

    def home_operating_brief(self, *, home_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        self._ensure_manager(current_user)
        self._log_oversight(
            home_id=home_id,
            manager_id=self._current_user_id(current_user),
            action="reviewed_home_inspection_os",
            area="home_operating_brief",
            summary="Manager opened home inspection operating brief.",
            outcome="Leadership oversight evidence recorded.",
        )
        staff_profiles = StaffProfileService().list_home_staff_profiles(home_id=home_id, current_user=current_user)
        staff_cards = staff_profiles.get("staff_profiles", [])
        week_start = date.today() - timedelta(days=date.today().weekday())
        roster = self._home_roster_week(home_id=home_id, week_start=week_start)
        shift_safety = self._shift_safety_for_home(roster)
        leadership_oversight = self._leadership_oversight(home_id=home_id)
        enforcement = self._enforcement_for_home(shift_safety, staff_cards)
        oversight_alerts = self._oversight_gap_alerts(leadership_oversight, context="home")
        if oversight_alerts:
            enforcement.setdefault("gates", []).extend(oversight_alerts)
            enforcement["status"] = "action_required"
        return {
            "generated_at": self._now(),
            "home_id": home_id,
            "week_start": str(week_start),
            "workforce": {
                "staff_count": staff_profiles.get("staff_count", 0),
                "high_attention_staff": [s for s in staff_cards if int(s.get("priority_score") or 0) >= 70],
                "staff_profiles": staff_cards,
            },
            "shift_safety": shift_safety,
            "responsibility": self._responsibility_for_home(home_id),
            "leadership_oversight": leadership_oversight,
            "child_voice": self._child_voice(home_id=home_id),
            "consistency": self._consistency(home_id=home_id),
            "workforce_competency": self._workforce_competency(staff_cards),
            "safeguarding_story": self._safeguarding_story(home_id=home_id),
            "enforcement": enforcement,
        }

    def child_operating_brief(self, *, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        home_id = self._home_id_for_child(young_person_id)
        if self._is_manager(current_user):
            self._log_oversight(
                home_id=home_id,
                young_person_id=young_person_id,
                manager_id=self._current_user_id(current_user),
                action="reviewed_child_inspection_os",
                area="child_operating_brief",
                summary="Manager opened child inspection operating brief.",
                outcome="Child-level leadership oversight evidence recorded.",
            )
        leadership_oversight = self._leadership_oversight(young_person_id=young_person_id)
        return {
            "generated_at": self._now(),
            "young_person_id": young_person_id,
            "responsibility": self._responsibility_for_child(young_person_id),
            "child_voice": self._child_voice(young_person_id=young_person_id),
            "safeguarding_story": self._safeguarding_story(young_person_id=young_person_id),
            "leadership_oversight": leadership_oversight,
            "oversight_alerts": self._oversight_gap_alerts(leadership_oversight, context="child"),
            "consistency": self._consistency(young_person_id=young_person_id),
        }

    def _responsibility_for_staff(self, staff: dict[str, Any]) -> dict[str, Any]:
        staff_id = staff.get("id")
        home_id = staff.get("home_id")
        children = self._optional_rows([
            (
                """
                SELECT yp.id, yp.first_name, yp.last_name, 'key_worker' AS responsibility
                FROM young_people yp
                WHERE yp.key_worker_id = %s
                ORDER BY yp.first_name, yp.last_name
                """,
                (staff_id,),
            ),
            (
                """
                SELECT yp.id, yp.first_name, yp.last_name, 'key_worker' AS responsibility
                FROM young_people yp
                WHERE yp.keyworker_user_id = %s
                ORDER BY yp.first_name, yp.last_name
                """,
                (staff_id,),
            ),
        ])
        return {
            "staff_id": staff_id,
            "home_id": home_id,
            "key_children": children,
            "today_role": "shift_staff",
            "message": "Responsibilities are inferred from key worker and rota records where available.",
        }

    def _responsibility_for_home(self, home_id: int) -> dict[str, Any]:
        key_links = self._optional_rows([
            (
                """
                SELECT yp.id AS young_person_id, yp.first_name, yp.last_name,
                       u.id AS key_worker_id, u.first_name AS worker_first_name, u.last_name AS worker_last_name
                FROM young_people yp
                LEFT JOIN users u ON u.id = yp.key_worker_id
                WHERE yp.home_id = %s
                ORDER BY yp.first_name, yp.last_name
                """,
                (home_id,),
            ),
            (
                """
                SELECT yp.id AS young_person_id, yp.first_name, yp.last_name,
                       u.id AS key_worker_id, u.first_name AS worker_first_name, u.last_name AS worker_last_name
                FROM young_people yp
                LEFT JOIN users u ON u.id = yp.keyworker_user_id
                WHERE yp.home_id = %s
                ORDER BY yp.first_name, yp.last_name
                """,
                (home_id,),
            ),
        ])
        missing = [row for row in key_links if not row.get("key_worker_id")]
        return {"key_worker_links": key_links, "missing_key_worker_count": len(missing), "missing_key_worker": missing}

    def _responsibility_for_child(self, young_person_id: int) -> dict[str, Any]:
        rows = self._optional_rows([
            (
                """
                SELECT yp.id AS young_person_id, yp.first_name, yp.last_name,
                       u.id AS key_worker_id, u.first_name AS worker_first_name, u.last_name AS worker_last_name
                FROM young_people yp
                LEFT JOIN users u ON u.id = yp.key_worker_id
                WHERE yp.id = %s
                LIMIT 1
                """,
                (young_person_id,),
            ),
            (
                """
                SELECT yp.id AS young_person_id, yp.first_name, yp.last_name,
                       u.id AS key_worker_id, u.first_name AS worker_first_name, u.last_name AS worker_last_name
                FROM young_people yp
                LEFT JOIN users u ON u.id = yp.keyworker_user_id
                WHERE yp.id = %s
                LIMIT 1
                """,
                (young_person_id,),
            ),
        ])
        return rows[0] if rows else {"young_person_id": young_person_id, "key_worker_id": None}

    def _home_roster_week(self, *, home_id: int, week_start: date) -> dict[str, Any]:
        week_end = week_start + timedelta(days=6)
        shifts = self._optional_rows([
            (
                """
                SELECT rs.*, h.name AS home_name
                FROM roster_shifts rs
                LEFT JOIN homes h ON h.id = rs.home_id
                WHERE rs.home_id = %s AND rs.shift_date BETWEEN %s AND %s
                ORDER BY rs.shift_date, rs.start_time, rs.id
                """,
                (home_id, week_start, week_end),
            )
        ])
        assignments = self._optional_rows([
            (
                """
                SELECT ra.*, rs.shift_date, rs.shift_type, rs.required_count, rs.safer_staffing_min,
                       st.full_name, st.role, st.safe_to_work, st.training_valid_until, st.is_agency
                FROM roster_assignments ra
                JOIN roster_shifts rs ON rs.id = ra.shift_id
                LEFT JOIN staff st ON st.id = ra.staff_id
                WHERE rs.home_id = %s AND rs.shift_date BETWEEN %s AND %s
                ORDER BY rs.shift_date, rs.start_time, ra.id
                """,
                (home_id, week_start, week_end),
            )
        ])
        checkins = self._optional_rows([
            (
                """
                SELECT sc.*
                FROM staff_checkins sc
                WHERE sc.home_id = %s AND sc.event_time::date BETWEEN %s AND %s
                ORDER BY sc.event_time DESC
                """,
                (home_id, week_start, week_end),
            )
        ])
        return {"shifts": shifts, "assignments": assignments, "checkins": checkins}

    def _shift_safety_for_staff(self, today: dict[str, Any]) -> dict[str, Any]:
        rota = today.get("rota") or {}
        warnings = rota.get("warnings") or []
        shifts = rota.get("today_shifts") or []
        status = "safe" if not warnings else "at_risk"
        if any(w.get("level") == "high" or w.get("priority") == "high" for w in warnings):
            status = "unsafe_review_required"
        return {"status": status, "shift_count": len(shifts), "warnings": warnings, "shifts": shifts}

    def _shift_safety_for_home(self, roster: dict[str, Any]) -> dict[str, Any]:
        warnings: list[dict[str, Any]] = []
        shifts = roster.get("shifts") or []
        assignments = roster.get("assignments") or []
        checkins = roster.get("checkins") or []
        today = date.today()
        for shift in shifts:
            shift_id = shift.get("id")
            assigned = [a for a in assignments if a.get("shift_id") == shift_id]
            if len(assigned) < int(shift.get("required_count") or 0):
                warnings.append({"level": "high", "type": "understaffed", "message": f"{shift.get('shift_date')} {shift.get('shift_type')} is below required staffing."})
            if len(assigned) < int(shift.get("safer_staffing_min") or 0):
                warnings.append({"level": "high", "type": "safer_staffing", "message": f"{shift.get('shift_date')} {shift.get('shift_type')} is below safer staffing minimum."})
            roles = {str(a.get("role") or "") for a in assigned}
            if str(shift.get("shift_type")) in {"day", "handover"} and not (roles & {"RM", "Deputy", "Senior", "manager", "registered_manager"}):
                warnings.append({"level": "high", "type": "leadership_gap", "message": f"{shift.get('shift_date')} {shift.get('shift_type')} has no leadership cover."})
            for person in assigned:
                if person.get("safe_to_work") is False:
                    warnings.append({"level": "high", "type": "safe_to_work", "message": f"{person.get('full_name') or 'Staff'} is marked not safe to work."})
                if person.get("training_valid_until") and str(person.get("training_valid_until")) < str(shift.get("shift_date") or today):
                    warnings.append({"level": "medium", "type": "training_expired", "message": f"{person.get('full_name') or 'Staff'} has expired training before {shift.get('shift_date')}."})
            if str(shift.get("shift_date")) == str(today):
                checked = {c.get("staff_id") for c in checkins if c.get("shift_id") == shift_id and c.get("event_type") == "check_in"}
                if any(a.get("staff_id") not in checked for a in assigned):
                    warnings.append({"level": "medium", "type": "attendance_pending", "message": f"{shift.get('shift_type')} today has assigned staff without check-in."})
        status = "safe" if not warnings else "at_risk"
        if any(w.get("level") == "high" for w in warnings):
            status = "unsafe_review_required"
        return {"status": status, "warnings": warnings[:30], "shift_count": len(shifts)}

    def _leadership_oversight(self, *, home_id: int | None = None, young_person_id: int | None = None) -> dict[str, Any]:
        rows = self._optional_rows([
            (
                """
                SELECT * FROM leadership_oversight_log
                WHERE (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                ORDER BY created_at DESC
                LIMIT 20
                """,
                (home_id, home_id, young_person_id, young_person_id),
            ),
            (
                """
                SELECT * FROM oversight_actions
                WHERE (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                ORDER BY created_at DESC
                LIMIT 20
                """,
                (home_id, home_id, young_person_id, young_person_id),
            ),
        ])
        latest = rows[0].get("created_at") if rows else None
        return {
            "recent_reviews": rows,
            "review_count": len(rows),
            "latest_review_at": latest,
            "status": "no_recent_oversight" if not rows else "active",
        }

    def _oversight_gap_alerts(self, oversight: dict[str, Any], *, context: str) -> list[dict[str, Any]]:
        rows = oversight.get("recent_reviews") or []
        if not rows:
            return [{
                "gate": "leadership_oversight",
                "status": "manager_review_required",
                "priority": "high",
                "message": f"No recent leadership oversight is recorded for this {context}.",
            }]
        latest = self._parse_date(rows[0].get("created_at"))
        if latest and (date.today() - latest).days > 7:
            return [{
                "gate": "leadership_oversight",
                "status": "manager_review_required",
                "priority": "high",
                "message": f"Leadership oversight for this {context} is older than 7 days.",
            }]
        return []

    def _child_voice(self, *, home_id: int | None = None, young_person_id: int | None = None) -> dict[str, Any]:
        since = date.today() - timedelta(days=14)
        rows = self._optional_rows([
            (
                """
                SELECT young_person_id, note_date AS recorded_at, young_person_voice AS voice, 'daily_note' AS source
                FROM daily_notes
                WHERE note_date >= %s
                  AND COALESCE(young_person_voice, '') <> ''
                  AND (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                ORDER BY note_date DESC
                LIMIT 30
                """,
                (since, home_id, home_id, young_person_id, young_person_id),
            ),
            (
                """
                SELECT young_person_id, note_date AS recorded_at, young_person_voice AS voice, 'daily_note' AS source
                FROM young_person_daily_notes
                WHERE note_date >= %s
                  AND COALESCE(young_person_voice, '') <> ''
                  AND (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                ORDER BY note_date DESC
                LIMIT 30
                """,
                (since, home_id, home_id, young_person_id, young_person_id),
            ),
        ])
        return {"items": rows, "count": len(rows), "status": "voice_visible" if rows else "voice_not_visible"}

    def _consistency(self, *, home_id: int | None = None, young_person_id: int | None = None) -> dict[str, Any]:
        since = date.today() - timedelta(days=30)
        rows = self._optional_rows([
            (
                """
                SELECT created_by_user_id, COUNT(*) AS record_count,
                       AVG(length(COALESCE(presentation, ''))) AS avg_presentation_length,
                       SUM(CASE WHEN COALESCE(young_person_voice, '') = '' THEN 1 ELSE 0 END) AS missing_voice_count
                FROM daily_notes
                WHERE note_date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                GROUP BY created_by_user_id
                ORDER BY record_count DESC
                """,
                (since, home_id, home_id, young_person_id, young_person_id),
            )
        ])
        warnings = []
        for row in rows:
            if int(row.get("missing_voice_count") or 0) >= 3:
                warnings.append({"type": "child_voice_gap", "message": f"User {row.get('created_by_user_id')} has multiple records missing child voice."})
            if float(row.get("avg_presentation_length") or 0) < 40:
                warnings.append({"type": "recording_quality", "message": f"User {row.get('created_by_user_id')} may need support with richer recording."})
        return {"staff_recording_patterns": rows, "warnings": warnings, "status": "review_needed" if warnings else "stable"}

    def _workforce_competency(self, staff_cards: list[dict[str, Any]]) -> dict[str, Any]:
        high_attention = [s for s in staff_cards if int(s.get("priority_score") or 0) >= 70]
        learning_themes: dict[str, int] = {}
        for card in staff_cards:
            for need in card.get("top_learning_needs") or []:
                title = str(need.get("title") or need.get("key") or "Learning need")
                learning_themes[title] = learning_themes.get(title, 0) + 1
        return {
            "status": "review_needed" if high_attention else "stable",
            "high_attention_count": len(high_attention),
            "learning_themes": sorted(
                [{"title": key, "count": value} for key, value in learning_themes.items()],
                key=lambda item: item["count"],
                reverse=True,
            ),
        }

    def _safeguarding_story(self, *, home_id: int | None = None, young_person_id: int | None = None) -> dict[str, Any]:
        since = date.today() - timedelta(days=30)
        rows = self._optional_rows([
            (
                """
                SELECT id, young_person_id, incident_datetime AS occurred_at, summary, actions_taken, outcome
                FROM incidents
                WHERE incident_datetime::date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                ORDER BY incident_datetime DESC
                LIMIT 20
                """,
                (since, home_id, home_id, young_person_id, young_person_id),
            ),
            (
                """
                SELECT id, young_person_id, incident_datetime AS occurred_at, summary, actions_taken, outcome
                FROM young_person_incidents
                WHERE incident_datetime::date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (%s IS NULL OR young_person_id = %s)
                ORDER BY incident_datetime DESC
                LIMIT 20
                """,
                (since, home_id, home_id, young_person_id, young_person_id),
            ),
        ])
        stories = []
        for row in rows:
            stories.append({
                "young_person_id": row.get("young_person_id"),
                "concern": row.get("summary") or "Incident recorded",
                "action": row.get("actions_taken") or "Action not clearly recorded",
                "outcome": row.get("outcome") or "Outcome not clearly recorded",
                "occurred_at": row.get("occurred_at"),
            })
        gaps = [s for s in stories if "not clearly recorded" in str(s.get("action")) or "not clearly recorded" in str(s.get("outcome"))]
        return {"stories": stories, "gap_count": len(gaps), "status": "review_needed" if gaps else "linked_story_visible"}

    def _enforcement_for_staff(self, today: dict[str, Any]) -> dict[str, Any]:
        gates = []
        rota = today.get("rota") or {}
        for shift in rota.get("today_shifts") or []:
            if not shift.get("checked_in"):
                gates.append({"gate": "shift_check_in", "status": "blocked_until_complete", "message": "Check in for your shift before completing shift tasks."})
        for item in today.get("due_now") or []:
            if item.get("priority") == "high":
                gates.append({"gate": item.get("type"), "status": "manager_attention", "message": item.get("title")})
        return {"gates": gates, "status": "clear" if not gates else "action_required"}

    def _enforcement_for_home(self, shift_safety: dict[str, Any], staff_cards: list[dict[str, Any]]) -> dict[str, Any]:
        gates = []
        if shift_safety.get("status") == "unsafe_review_required":
            gates.append({"gate": "shift_safety", "status": "manager_review_required", "message": "One or more shifts require safety review."})
        for staff in staff_cards:
            if int(staff.get("priority_score") or 0) >= 80:
                gates.append({"gate": "staff_attention", "status": "manager_review_required", "message": f"{staff.get('staff', {}).get('first_name', 'Staff')} has a high attention score."})
        return {"gates": gates[:20], "status": "clear" if not gates else "action_required"}

    def _home_id_for_child(self, young_person_id: int) -> int | None:
        rows = self._optional_rows([
            ("SELECT home_id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,)),
        ])
        value = rows[0].get("home_id") if rows else None
        return int(value) if value else None

    def _log_oversight(
        self,
        *,
        home_id: int | None = None,
        young_person_id: int | None = None,
        staff_user_id: int | None = None,
        manager_id: int | None = None,
        action: str,
        area: str,
        summary: str,
        outcome: str,
    ) -> None:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO leadership_oversight_log
                        (home_id, young_person_id, staff_user_id, manager_id, action, area, summary, outcome, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (home_id, young_person_id, staff_user_id, manager_id, action, area, summary, outcome),
                    )
                    conn.commit()
        except Exception:
            return

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

    def _current_user_id(self, current_user: dict[str, Any]) -> int | None:
        value = current_user.get("id") or current_user.get("user_id")
        try:
            return int(value) if value else None
        except Exception:
            return None

    def _is_manager(self, current_user: dict[str, Any]) -> bool:
        role = str(current_user.get("role") or current_user.get("user_role") or "").strip().lower()
        return role in MANAGER_ROLES

    def _ensure_manager(self, current_user: dict[str, Any]) -> None:
        if not self._is_manager(current_user):
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager permission required.")

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection
from services.inspection_os_service import InspectionOSService


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


class RMDashboardService:
    """One-screen registered manager command centre.

    Aggregates inspection, shift safety, staff watchlist, child risk signals and
    quick actions into the single screen that managers need at the start of each
    shift/day.
    """

    def dashboard(self, *, home_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
        self._ensure_manager(current_user)
        inspection = InspectionOSService().home_operating_brief(home_id=home_id, current_user=current_user)
        children = self._children_at_risk(home_id)
        live_risks = self._live_risks(inspection=inspection, children=children)
        status = self._overall_status(inspection, live_risks)
        return {
            "generated_at": self._now(),
            "home_id": home_id,
            "status": status,
            "summary": {
                "home_status": status["label"],
                "shift_safety": (inspection.get("shift_safety") or {}).get("status"),
                "oversight_status": (inspection.get("leadership_oversight") or {}).get("status"),
                "live_risk_count": len(live_risks),
                "children_at_risk_count": len(children),
                "staff_watchlist_count": len((inspection.get("workforce") or {}).get("high_attention_staff") or []),
            },
            "live_risks": live_risks,
            "children_at_risk": children,
            "staff_watchlist": self._staff_watchlist(inspection),
            "shift_safety": inspection.get("shift_safety"),
            "leadership_oversight": inspection.get("leadership_oversight"),
            "child_voice": inspection.get("child_voice"),
            "consistency": inspection.get("consistency"),
            "workforce_competency": inspection.get("workforce_competency"),
            "safeguarding_story": inspection.get("safeguarding_story"),
            "quick_actions": self._quick_actions(home_id),
            "assistant_prompts": [
                "Is this home safe today?",
                "What must the registered manager review first?",
                "What would Ofsted be concerned about right now?",
                "Summarise the workforce risks and actions.",
                "Prepare a Reg 45 evidence summary for this home.",
            ],
        }

    def _live_risks(self, *, inspection: dict[str, Any], children: list[dict[str, Any]]) -> list[dict[str, Any]]:
        risks: list[dict[str, Any]] = []
        for warning in (inspection.get("shift_safety") or {}).get("warnings") or []:
            risks.append({
                "priority": warning.get("level") or "medium",
                "type": warning.get("type") or "shift_safety",
                "title": "Shift safety issue",
                "detail": warning.get("message") or "A shift safety issue requires review.",
                "href": "/rostering",
            })
        for gate in (inspection.get("enforcement") or {}).get("gates") or []:
            risks.append({
                "priority": gate.get("priority") or "high",
                "type": gate.get("gate") or "enforcement",
                "title": "Manager action required",
                "detail": gate.get("message") or "Action is required.",
                "href": "/os-dashboard",
            })
        responsibility = inspection.get("responsibility") or {}
        missing_key_workers = responsibility.get("missing_key_worker") or []
        for item in missing_key_workers[:6]:
            risks.append({
                "priority": "high",
                "type": "missing_key_worker",
                "title": "Young person missing key worker",
                "detail": "Assign key worker for " + " ".join([str(item.get("first_name") or ""), str(item.get("last_name") or "")]).strip(),
                "href": f"/young-people-shell?young_person_id={item.get('young_person_id')}",
            })
        story = inspection.get("safeguarding_story") or {}
        if int(story.get("gap_count") or 0) > 0:
            risks.append({
                "priority": "high",
                "type": "safeguarding_story_gap",
                "title": "Safeguarding stories need completion",
                "detail": f"{story.get('gap_count')} incidents have unclear action or outcome.",
                "href": "/young-people-shell",
            })
        voice = inspection.get("child_voice") or {}
        if voice.get("status") == "voice_not_visible":
            risks.append({
                "priority": "medium",
                "type": "child_voice_gap",
                "title": "Child voice not visible",
                "detail": "No recent child voice has been found in records.",
                "href": "/young-people-shell",
            })
        for child in children[:6]:
            if int(child.get("incident_count") or 0) >= 3:
                risks.append({
                    "priority": "high",
                    "type": "incident_spike",
                    "title": "Incident spike",
                    "detail": f"{child.get('name')} has {child.get('incident_count')} incidents in the last 7 days.",
                    "href": f"/young-people-shell?young_person_id={child.get('young_person_id')}",
                })
        return risks[:24]

    def _children_at_risk(self, home_id: int) -> list[dict[str, Any]]:
        since = date.today() - timedelta(days=7)
        rows = self._optional_rows([
            (
                """
                SELECT yp.id AS young_person_id,
                       CONCAT_WS(' ', yp.first_name, yp.last_name) AS name,
                       COUNT(i.id) AS incident_count,
                       MAX(i.incident_datetime) AS latest_incident_at,
                       SUM(CASE WHEN COALESCE(i.outcome, '') = '' THEN 1 ELSE 0 END) AS missing_outcome_count
                FROM young_people yp
                LEFT JOIN incidents i ON i.young_person_id = yp.id AND i.incident_datetime::date >= %s
                WHERE yp.home_id = %s
                GROUP BY yp.id, yp.first_name, yp.last_name
                ORDER BY incident_count DESC, latest_incident_at DESC NULLS LAST
                LIMIT 12
                """,
                (since, home_id),
            ),
            (
                """
                SELECT yp.id AS young_person_id,
                       CONCAT_WS(' ', yp.first_name, yp.last_name) AS name,
                       COUNT(i.id) AS incident_count,
                       MAX(i.incident_datetime) AS latest_incident_at,
                       SUM(CASE WHEN COALESCE(i.outcome, '') = '' THEN 1 ELSE 0 END) AS missing_outcome_count
                FROM young_people yp
                LEFT JOIN young_person_incidents i ON i.young_person_id = yp.id AND i.incident_datetime::date >= %s
                WHERE yp.home_id = %s
                GROUP BY yp.id, yp.first_name, yp.last_name
                ORDER BY incident_count DESC, latest_incident_at DESC NULLS LAST
                LIMIT 12
                """,
                (since, home_id),
            ),
        ])
        result = []
        for row in rows:
            incident_count = int(row.get("incident_count") or 0)
            missing_outcome_count = int(row.get("missing_outcome_count") or 0)
            if incident_count or missing_outcome_count:
                result.append({
                    "young_person_id": row.get("young_person_id"),
                    "name": row.get("name") or "Young person",
                    "incident_count": incident_count,
                    "missing_outcome_count": missing_outcome_count,
                    "latest_incident_at": row.get("latest_incident_at"),
                    "risk_level": "high" if incident_count >= 3 or missing_outcome_count >= 2 else "medium",
                    "href": f"/young-people-shell?young_person_id={row.get('young_person_id')}",
                })
        return result

    def _staff_watchlist(self, inspection: dict[str, Any]) -> list[dict[str, Any]]:
        watchlist = []
        for item in (inspection.get("workforce") or {}).get("high_attention_staff") or []:
            staff = item.get("staff") or {}
            watchlist.append({
                "staff_user_id": staff.get("id"),
                "name": " ".join([str(staff.get("first_name") or ""), str(staff.get("last_name") or "")]).strip() or staff.get("email") or "Staff member",
                "role": staff.get("role"),
                "priority_score": item.get("priority_score"),
                "employment_stage": item.get("employment_stage"),
                "top_learning_needs": item.get("top_learning_needs") or [],
                "href": item.get("profile_link") or f"/staff-profile.html?id={staff.get('id')}",
            })
        return watchlist[:12]

    def _overall_status(self, inspection: dict[str, Any], live_risks: list[dict[str, Any]]) -> dict[str, Any]:
        high = [r for r in live_risks if r.get("priority") == "high"]
        shift_status = (inspection.get("shift_safety") or {}).get("status")
        if shift_status == "unsafe_review_required" or high:
            return {"level": "high", "label": "Action required", "tone": "danger"}
        if live_risks:
            return {"level": "medium", "label": "Needs attention", "tone": "warning"}
        return {"level": "low", "label": "Stable", "tone": "success"}

    def _quick_actions(self, home_id: int) -> list[dict[str, str]]:
        return [
            {"label": "Open young people OS", "href": "/young-people-shell", "description": "Review records and inspection intelligence."},
            {"label": "Review rota", "href": "/rostering", "description": "Check safe staffing and attendance."},
            {"label": "Open staff hub", "href": "/staff-profiles", "description": "Review staff watchlist and learning needs."},
            {"label": "Run Academy", "href": "/academy", "description": "Assign and evidence training."},
            {"label": "Ask assistant", "href": "/assistant", "description": "Generate summaries, actions and inspection support."},
            {"label": "Inspection API", "href": f"/inspection-os/home/{home_id}", "description": "View the raw home operating brief."},
        ]

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

    def _ensure_manager(self, current_user: dict[str, Any]) -> None:
        role = str(current_user.get("role") or current_user.get("user_role") or "").strip().lower()
        if role not in MANAGER_ROLES:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager permission required.")

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

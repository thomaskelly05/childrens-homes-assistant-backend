from __future__ import annotations

from collections import Counter
from typing import Any

from repositories.shift_repository import OperationalSchemaUnavailable, ShiftRepository


OPERATIONAL_NOTIFICATION_TYPES = [
    "safeguarding_escalation",
    "overdue_action",
    "recording_overdue",
    "manager_review_required",
    "incident_assigned",
    "medication_alert",
    "welfare_check_due",
    "handover_ready",
    "shift_started",
    "missing_evidence",
    "inspection_readiness_concern",
]


def unavailable_payload(feature: str, table_name: str) -> dict[str, Any]:
    return {
        "ok": False,
        "available": False,
        "feature": feature,
        "message": f"{feature} is not available until the {table_name} migration is applied.",
        "items": [],
    }


class ShiftService:
    """Builds operational shift and staff workflow payloads from existing OS records."""

    def __init__(self, repository: ShiftRepository | None = None) -> None:
        self.repository = repository or ShiftRepository()

    def list_shifts(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        try:
            shifts = self.repository.list_shifts(conn, current_user, home_id=home_id)
            return {"ok": True, "available": True, "items": shifts, "lifecycle": self.lifecycle_states()}
        except OperationalSchemaUnavailable as exc:
            conn.rollback()
            return unavailable_payload(exc.feature, exc.table_name)

    def current_shift_workspace(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        try:
            shift = self.repository.current_shift(conn, current_user, home_id=home_id)
            shift_id = str((shift or {}).get("id") or (shift or {}).get("shift_session_id") or "") or None
            tasks = self.repository.list_shift_tasks(conn, current_user, shift_id=shift_id, home_id=home_id)
            general_tasks = self.repository.list_tasks_queue(conn, current_user, home_id=home_id)
            handover = self.repository.list_handover_items(conn, current_user, shift_id=shift_id, home_id=home_id)
            assigned_children = self.repository.assigned_children(conn, current_user, home_id=home_id)
            incidents = self.repository.active_incidents(conn, current_user, home_id=home_id)
            notifications = self.repository.operational_notifications(conn, current_user, unread_only=True)
            qa_items = self.repository.qa_items(conn, current_user, home_id=home_id)
            escalations = self.repository.safeguarding_escalations(conn, current_user, home_id=home_id)
            cards = self.live_board_cards(tasks, general_tasks, incidents, notifications, qa_items, escalations)
            return {
                "ok": True,
                "available": True,
                "shift": shift,
                "lifecycle": self.lifecycle_states(shift),
                "active_staff": ((shift or {}).get("metadata") or {}).get("active_staff", []),
                "assigned_children": assigned_children,
                "outstanding_tasks": tasks + general_tasks[:20],
                "incidents": incidents,
                "safeguarding_concerns": escalations,
                "medication_alerts": [card for card in cards if card["type"] == "medication_alert"],
                "appointments": [card for card in cards if card["type"] == "appointment"],
                "welfare_checks": [card for card in cards if card["type"] == "welfare_check_due"],
                "room_checks": [card for card in cards if card["type"] == "room_check_due"],
                "missing_episodes": [card for card in cards if card["type"] == "missing_episode"],
                "manager_escalations": [item for item in escalations if "manager" in item.get("state", "")],
                "handover_items": handover,
                "live_board": {
                    "cards": cards,
                    "stats": self.stats(cards, assigned_children, notifications),
                    "refresh_strategy": "permission-scoped polling now; websocket/live emit compatible payloads later",
                },
                "recording": self.rapid_recording_config(),
                "notifications": {
                    "items": notifications,
                    "types": OPERATIONAL_NOTIFICATION_TYPES,
                    "supports_acknowledgement": True,
                    "snooze_foundation": True,
                },
                "assistant": self.assistant_shift_support(cards),
                "hardening": self.hardening_notes(),
            }
        except OperationalSchemaUnavailable as exc:
            conn.rollback()
            return unavailable_payload(exc.feature, exc.table_name)

    def start_shift(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        shift = self.repository.start_shift(conn, current_user, payload)
        return {"ok": True, "shift": shift, "lifecycle": self.lifecycle_states(shift)}

    def join_shift(self, conn: Any, current_user: dict[str, Any], shift_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        shift = self.repository.join_shift(conn, current_user, shift_id, payload)
        return {"ok": True, "shift": shift, "lifecycle": self.lifecycle_states(shift)}

    def update_lifecycle(self, conn: Any, current_user: dict[str, Any], shift_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        shift = self.repository.record_shift_lifecycle(conn, current_user, shift_id, payload)
        return {"ok": True, "shift": shift, "lifecycle": self.lifecycle_states(shift)}

    def staff_workspace(self, conn: Any, current_user: dict[str, Any], *, staff_id: int | None) -> dict[str, Any]:
        if staff_id is None:
            staff_id = int(current_user.get("user_id") or current_user.get("id") or 0)
        assigned = self.repository.assigned_children(conn, current_user, staff_id=staff_id)
        tasks = self.repository.list_tasks_queue(conn, current_user, staff_id=staff_id)
        shift_tasks = self.repository.list_shift_tasks(conn, current_user, staff_id=staff_id)
        recording = self.repository.care_records_requiring_review(conn, current_user, staff_id=staff_id)
        handover = self.repository.list_handover_items(conn, current_user)
        notifications = self.repository.operational_notifications(conn, current_user, unread_only=True)
        queues = self.staff_queues(tasks + shift_tasks, recording, handover, notifications)
        return {
            "ok": True,
            "available": True,
            "staff_id": staff_id,
            "assigned_children": assigned,
            "active_risks": [child for child in assigned if str(child.get("risk_level", "")).lower() in {"high", "critical"}],
            "outstanding_tasks": tasks + shift_tasks,
            "recording_due": queues["recording_overdue"],
            "incidents_requiring_review": [item for item in recording if item.get("record_type") == "incident_note"],
            "safeguarding_concerns": [item for item in recording if item.get("safeguarding_relevant")],
            "keywork_due": [item for item in tasks if "keywork" in str(item.get("title", "")).lower()],
            "medication_admin_reminders": [item for item in tasks if "medication" in str(item.get("title", "")).lower()],
            "handover_actions": handover,
            "unread_notifications": notifications,
            "manager_requests": [item for item in tasks if "manager" in str(item.get("title", "")).lower()],
            "qa_feedback": [item for item in recording if item.get("status") == "returned"],
            "chronology_requiring_attention": recording,
            "queues": queues,
            "assistant_prompts": [
                "What do I need to complete this shift?",
                "Which children need attention?",
                "What recording is overdue?",
                "Summarise safeguarding concerns for my shift.",
                "What follow-up actions remain?",
            ],
        }

    def quick_record(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.repository.quick_record(conn, current_user, payload)
            return {"ok": True, "available": True, **result}
        except OperationalSchemaUnavailable as exc:
            conn.rollback()
            return unavailable_payload(exc.feature, exc.table_name)

    def live_board(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        workspace = self.current_shift_workspace(conn, current_user, home_id=home_id)
        if not workspace.get("available"):
            return workspace
        return {"ok": True, "available": True, **workspace["live_board"]}

    def safeguarding_escalations(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        items = self.repository.safeguarding_escalations(conn, current_user, home_id=home_id)
        return {
            "ok": True,
            "available": True,
            "items": items,
            "guardrail": "No automatic safeguarding conclusions are made. Use 'evidence suggests', 'review required' and 'records indicate'.",
            "assistant_prompts": [
                "Does this require safeguarding review?",
                "What follow-up is missing?",
                "Which incidents are linked?",
                "What evidence is missing?",
                "What should management review?",
            ],
        }

    def qa_workspace(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        items = self.repository.qa_items(conn, current_user, home_id=home_id)
        summary = Counter(item["type"] for item in items)
        return {
            "ok": True,
            "available": True,
            "summary": {
                "open_reviews": len(items),
                "record_reviews": summary.get("record_review", 0),
                "incident_reviews": summary.get("incident_review", 0),
                "safeguarding_or_high_priority": len([item for item in items if item.get("priority") in {"critical", "high"}]),
            },
            "items": items,
            "assistant_prompts": [
                "Which records require QA?",
                "Which staff may need support?",
                "What recording quality concerns exist?",
                "Which evidence gaps create inspection risk?",
            ],
        }

    def lifecycle_states(self, shift: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        events = ((shift or {}).get("metadata") or {}).get("lifecycle", [])
        completed = {str(event.get("state")) for event in events if isinstance(event, dict)}
        return [{"id": state, "label": state.replace("_", " ").title(), "completed": state in completed} for state in [
            "start_shift",
            "join_shift",
            "handover_received",
            "shift_active",
            "welfare_checks",
            "recording_completed",
            "handover_prepared",
            "shift_signed_off",
        ]]

    def live_board_cards(
        self,
        shift_tasks: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
        incidents: list[dict[str, Any]],
        notifications: list[dict[str, Any]],
        qa_items: list[dict[str, Any]],
        escalations: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        cards: list[dict[str, Any]] = []
        for item in shift_tasks + tasks:
            title = str(item.get("title") or "")
            lowered = title.lower()
            card_type = "overdue_task" if item.get("is_overdue") else "operational_task"
            if "welfare" in lowered:
                card_type = "welfare_check_due"
            elif "room" in lowered:
                card_type = "room_check_due"
            elif "medication" in lowered:
                card_type = "medication_alert"
            elif "appointment" in lowered:
                card_type = "appointment"
            cards.append(self.card(card_type, title or "Operational task", item.get("priority"), item.get("href"), item))
        for incident in incidents:
            card_type = "missing_episode" if "missing" in str(incident.get("type") or incident.get("category") or "").lower() else "active_incident"
            cards.append(self.card(card_type, incident.get("type") or "Active incident", incident.get("severity"), incident.get("href"), incident))
        for escalation in escalations:
            cards.append(self.card("safeguarding_alert", escalation.get("title"), escalation.get("priority"), escalation.get("href"), escalation))
        for notification in notifications:
            cards.append(self.card(notification.get("notification_type") or "notification", notification.get("title"), notification.get("priority"), notification.get("href"), notification))
        for qa_item in qa_items[:10]:
            cards.append(self.card("manager_review_required", qa_item.get("title"), qa_item.get("priority"), qa_item.get("href"), qa_item))
        return sorted(cards, key=lambda card: card["priority_score"], reverse=True)[:80]

    def card(self, card_type: str, title: Any, priority: Any, href: Any, source: dict[str, Any]) -> dict[str, Any]:
        priority_value = str(priority or "medium")
        return {
            "id": f"{card_type}-{source.get('id') or source.get('source_id') or title}",
            "type": card_type,
            "title": str(title or card_type.replace("_", " ").title()),
            "summary": source.get("summary") or source.get("message") or source.get("description") or source.get("details"),
            "urgency": priority_value,
            "priority_score": source.get("priority_score") or self.priority_score(priority_value),
            "assignment": source.get("assigned_to") or source.get("assigned_to_user_id") or source.get("assigned_to_staff_id"),
            "young_person_id": source.get("young_person_id"),
            "href": href or "/shifts/current",
            "chronology_context": {
                "source_type": source.get("source_type") or source.get("record_type") or card_type,
                "source_id": source.get("source_id") or source.get("id"),
            },
            "linked_evidence": source.get("linked_evidence") or [],
            "linked_actions": source.get("linked_actions") or [],
            "escalation_indicator": card_type in {"safeguarding_alert", "manager_review_required", "missing_episode"},
            "risk_severity": priority_value,
        }

    def priority_score(self, priority: str) -> int:
        return {"critical": 100, "high": 80, "medium": 55, "normal": 45, "low": 25}.get(priority.lower(), 55)

    def stats(self, cards: list[dict[str, Any]], assigned_children: list[dict[str, Any]], notifications: list[dict[str, Any]]) -> dict[str, Any]:
        types = Counter(card["type"] for card in cards)
        return {
            "children_requiring_attention": len([child for child in assigned_children if str(child.get("risk_level", "")).lower() in {"high", "critical"}]),
            "active_incidents": types.get("active_incident", 0),
            "safeguarding_alerts": types.get("safeguarding_alert", 0),
            "overdue_tasks": types.get("overdue_task", 0),
            "welfare_checks_due": types.get("welfare_check_due", 0),
            "unread_notifications": len(notifications),
        }

    def staff_queues(
        self,
        tasks: list[dict[str, Any]],
        recording: list[dict[str, Any]],
        handover: list[dict[str, Any]],
        notifications: list[dict[str, Any]],
    ) -> dict[str, list[dict[str, Any]]]:
        return {
            "operational_task_queue": tasks,
            "needs_attention": [
                *[item for item in tasks if item.get("priority") in {"critical", "high"} or item.get("is_overdue")],
                *[item for item in notifications if item.get("priority") in {"critical", "high"}],
            ],
            "awaiting_review": [item for item in recording if item.get("manager_review_required") or item.get("status") == "manager_review"],
            "recording_overdue": [item for item in tasks if item.get("queue") == "recording_overdue"] + [item for item in recording if item.get("status") == "draft"],
            "handover_actions": [item for item in handover if item.get("requires_follow_up")],
        }

    def rapid_recording_config(self) -> dict[str, Any]:
        return {
            "quick_types": [
                "quick_daily_note",
                "quick_chronology_entry",
                "quick_incident",
                "quick_safeguarding_concern",
                "quick_keywork_note",
                "quick_room_check",
                "quick_welfare_check",
                "quick_medication_admin_note",
            ],
            "ux": {
                "floating_action_button": True,
                "quick_add_drawer": True,
                "rapid_recording_modal": True,
                "smart_templates": True,
                "recent_phrases": True,
                "ai_assisted_drafting": True,
                "voice_dictation_placeholder": True,
                "offline_queue_foundation": True,
                "inline_chronology_generation": "preview_only_until_confirmed",
                "draft_recovery": True,
            },
        }

    def assistant_shift_support(self, cards: list[dict[str, Any]]) -> dict[str, Any]:
        high_priority = [card for card in cards if card["priority_score"] >= 80]
        return {
            "mode": "shift_operations",
            "surface": "embedded",
            "proactive_cards": high_priority[:8],
            "suggested_actions": [
                {"title": "Review highest shift priorities", "route": "/shifts/current", "priority": "high"},
                {"title": "Check safeguarding review queue", "route": "/safeguarding", "priority": "high"},
                {"title": "Complete overdue recording", "route": "/staff/me/recording", "priority": "medium"},
                {"title": "Prepare handover points", "route": "/handover/current", "priority": "medium"},
            ],
            "quality_flags": [
                "needs manager review",
                "recording quality concern",
                "inspection evidence weak",
                "chronology gap",
            ],
        }

    def hardening_notes(self) -> dict[str, Any]:
        return {
            "transactional_writebacks": "FastAPI get_db rollback/commit boundary plus explicit repository write methods.",
            "immutable_chronology_events": "Rapid recording returns chronology_preview only; explicit chronology writeback prevents duplicate chronology creation.",
            "permission_safe_live_updates": "All board queries are scoped by current user home access.",
            "rbac_safe_notifications": "Notification acknowledgement is user-owned.",
            "audit_safe_workflows": "Lifecycle/QA metadata records actor, action and timestamp.",
            "efficient_queries": "Board endpoints cap result sets and sort by operational priority.",
            "mobile_performance": "Payloads are card/queue based for compact mobile rendering.",
        }

"""Workforce and shift context — connects existing staff/rota services with safe metadata summaries."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.workforce_context import (
    ShiftContextSummary,
    WorkforceContextDashboard,
    WorkforceContextHealth,
    WorkforceContextItem,
    WorkforceContextRoutes,
    WorkforceContextScope,
    WorkforceContextSensitivity,
)
from services.intelligence_action_service import intelligence_action_service

logger = logging.getLogger("indicare.workforce_context")

PRIVACY_NOTICE = (
    "Workforce summaries use safe metadata only — not supervision notes, HR records or wellbeing detail. "
    "Open linked staff areas for permissioned detail."
)

LIMITATION_NOTICE = (
    "Shift and rota data may be unavailable until operational migrations are applied. "
    "Use staff and rota routes to verify manually."
)

_RAW_BODY_PATTERN = re.compile(
    r"(description|narrative|body|notes|reflection|review_note|supervision_text)\s*[:=]",
    re.IGNORECASE,
)

ORB_PROMPTS = [
    {
        "label": "Help me prepare staff handover.",
        "mode": "manager_daily_brief",
        "query": "Help me prepare staff handover using safe operational summaries.",
    },
    {
        "label": "What staffing issues need manager review?",
        "mode": "manager_daily_brief",
        "query": "What staffing issues need manager review today?",
    },
    {
        "label": "What actions are assigned to staff today?",
        "mode": "action_priority",
        "query": "What intelligence actions are assigned to staff that need follow-up?",
    },
    {
        "label": "What should I consider for staff wellbeing?",
        "mode": "manager_daily_brief",
        "query": "What staff wellbeing themes should a manager consider without confidential detail?",
    },
    {
        "label": "Help me summarise shift leadership priorities.",
        "mode": "manager_daily_brief",
        "query": "Help me summarise shift leadership priorities for handover.",
    },
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager_view(current_user: dict[str, Any]) -> bool:
    role = _user_role(current_user)
    return role in {r.lower() for r in MANAGER_ROLES} or any(
        token in role for token in ("manager", "deputy", "senior", "registered", "admin")
    )


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _sanitize_summary(text: str, *, max_len: int = 240) -> str:
    cleaned = _text(text, "Metadata summary available — open linked route for detail.")
    if _RAW_BODY_PATTERN.search(cleaned):
        cleaned = "Metadata summary available — open linked route for detail."
    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 3].rstrip() + "..."
    return cleaned


class WorkforceContextService:
    def safe_scope_for_user(
        self,
        current_user: dict[str, Any],
        *,
        home_id: int | None = None,
    ) -> WorkforceContextScope:
        hid = home_id if home_id is not None else _safe_int(current_user.get("home_id"))
        if hid is not None:
            return WorkforceContextScope(type="home", home_id=hid, user_id=_user_id(current_user))
        return WorkforceContextScope(type="user", user_id=_user_id(current_user))

    def safe_item(
        self,
        *,
        item_id: str,
        title: str,
        safe_summary: str,
        source: str,
        route: str,
        sensitivity: WorkforceContextSensitivity = "public_operational",
        priority: str = "medium",
        action_label: str | None = None,
        staff_id: int | None = None,
        staff_name: str | None = None,
        role: str | None = None,
        home_id: int | None = None,
        shift_id: str | None = None,
        related_id: str | None = None,
        related_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> WorkforceContextItem:
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"
        return WorkforceContextItem(
            id=item_id,
            title=title,
            safe_summary=_sanitize_summary(safe_summary),
            source=source,
            route=route,
            action_label=action_label,
            sensitivity=sensitivity,
            priority=priority,
            staff_id=staff_id,
            staff_name=staff_name,
            role=role,
            home_id=home_id,
            shift_id=shift_id,
            related_id=related_id,
            related_type=related_type,
            metadata={**(metadata or {}), "no_raw_body": True, "metadata_only": True},
        )

    def get_health(self, conn: Any | None = None) -> WorkforceContextHealth:
        shift_ok = False
        workforce_ok = False
        if conn is not None:
            try:
                from repositories.shift_repository import ShiftRepository

                shift_ok = ShiftRepository().current_shift(conn, {"home_id": None}) is not None
            except Exception:
                shift_ok = False
            try:
                from services.workforce_intelligence_service import WorkforceIntelligenceService

                WorkforceIntelligenceService().risk(conn, current_user={"role": "manager"})
                workforce_ok = True
            except Exception:
                workforce_ok = False
        return WorkforceContextHealth(
            status="ok",
            shift_data_available=shift_ok,
            workforce_intelligence_available=workforce_ok,
            storage_mode="postgresql" if conn is not None else "memory",
        )

    def build_shift_context(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> ShiftContextSummary:
        home_id = _safe_int((filters or {}).get("home_id")) or _safe_int(current_user.get("home_id"))
        routes = WorkforceContextRoutes()
        shift_label = _text((filters or {}).get("shift_label"), "Current shift")
        summary = ShiftContextSummary(
            shift_label=shift_label,
            home_id=home_id,
            route=routes.current_shift,
            metadata={"no_raw_body": True},
        )
        if conn is None:
            summary.warnings.append("Shift context requires database connection — open shifts area manually.")
            summary.gaps.append("Live shift data unavailable in this context.")
            return summary
        try:
            from services.shift_service import ShiftService

            payload = ShiftService().current_shift_workspace(conn, current_user, home_id=home_id)
            if not payload.get("available"):
                summary.warnings.append(_text(payload.get("message"), LIMITATION_NOTICE))
                summary.gaps.append("Shift workspace not available.")
                return summary
            shift = payload.get("shift") or {}
            summary.shift_id = str(shift.get("id") or shift.get("shift_session_id") or "") or None
            active = payload.get("active_staff") or (shift.get("metadata") or {}).get("active_staff") or []
            names: list[str] = []
            for member in active[:12]:
                if isinstance(member, dict):
                    label = _text(member.get("name") or member.get("display_name") or member.get("role"))
                    if label:
                        names.append(label)
                    elif member.get("user_id"):
                        names.append(f"Staff {member.get('user_id')}")
                elif member:
                    names.append(str(member))
            summary.staff_on_shift = names
            summary.staff_count = len(names) if names else len(active)
            lead_id = _safe_int(shift.get("shift_lead_staff_id") or shift.get("shift_lead_user_id"))
            if lead_id:
                summary.shift_lead_id = lead_id
                summary.shift_lead_name = _text(shift.get("shift_lead_name"), f"Shift lead #{lead_id}")
            stats = ((payload.get("live_board") or {}).get("stats")) or {}
            if stats.get("critical_cards"):
                summary.warnings.append(
                    f"{int(stats.get('critical_cards') or 0)} critical operational card(s) on shift board."
                )
            if summary.staff_count == 0:
                summary.gaps.append("No staff listed on current shift — verify rota.")
        except Exception as exc:
            logger.debug("shift_context_degraded: %s", exc)
            summary.warnings.append("Shift context temporarily unavailable.")
            summary.gaps.append("Open shifts area to verify staffing.")
        return summary

    def build_staff_on_shift(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> list[WorkforceContextItem]:
        shift = self.build_shift_context(current_user, filters, conn=conn)
        items: list[WorkforceContextItem] = []
        routes = WorkforceContextRoutes()
        if shift.shift_lead_name or shift.shift_lead_id:
            items.append(
                self.safe_item(
                    item_id="shift:lead",
                    title="Shift lead",
                    safe_summary=_sanitize_summary(
                        f"{shift.shift_lead_name or 'Shift lead'} assigned for {shift.shift_label}."
                    ),
                    source="shift",
                    route=routes.current_shift,
                    action_label="Open current shift",
                    shift_id=shift.shift_id,
                    staff_id=shift.shift_lead_id,
                    staff_name=shift.shift_lead_name,
                    role="shift_lead",
                    home_id=shift.home_id,
                )
            )
        if shift.staff_count:
            items.append(
                self.safe_item(
                    item_id="shift:count",
                    title="Staff on shift",
                    safe_summary=f"{shift.staff_count} staff member(s) on shift.",
                    source="shift",
                    route=routes.shifts,
                    action_label="Open shifts",
                    shift_id=shift.shift_id,
                    home_id=shift.home_id,
                    metadata={"staff_on_shift_count": shift.staff_count},
                )
            )
        elif not shift.warnings:
            items.append(
                self.safe_item(
                    item_id="shift:unavailable",
                    title="Staff on shift",
                    safe_summary="Workforce summary is unavailable. Open staff or rota area to check manually.",
                    source="route_hint",
                    route=routes.rota,
                    action_label="Open rota",
                    priority="low",
                )
            )
        for gap in shift.gaps[:2]:
            items.append(
                self.safe_item(
                    item_id=f"shift:gap:{hash(gap) % 10**6}",
                    title="Staffing gap",
                    safe_summary=gap,
                    source="shift",
                    route=routes.rota,
                    priority="high",
                    action_label="Check rota",
                )
            )
        return items

    def build_staff_actions(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> list[WorkforceContextItem]:
        _ = filters
        routes = WorkforceContextRoutes()
        items: list[WorkforceContextItem] = []
        try:
            home_key = str(current_user.get("home_id")) if current_user.get("home_id") is not None else None
            summary = intelligence_action_service.build_action_summary(home_id=home_key, conn=conn)
            proposed = int(summary.proposed_count or 0)
            if proposed:
                items.append(
                    self.safe_item(
                        item_id="actions:proposed",
                        title="Intelligence actions",
                        safe_summary=f"{proposed} proposed action(s) may need staff or manager follow-up.",
                        source="intelligence_actions",
                        route=routes.actions,
                        action_label="Open actions",
                        priority="medium",
                        sensitivity="manager_only" if _is_manager_view(current_user) else "public_operational",
                    )
                )
            feed = intelligence_action_service.build_attention_feed(home_id=home_key, conn=conn)
            for entry in (feed.urgent + feed.high_priority + feed.follow_ups_due)[:5]:
                owner = _text(getattr(entry, "owner_name", None) or getattr(entry, "assigned_to", None))
                items.append(
                    self.safe_item(
                        item_id=f"action:{entry.id}",
                        title=entry.title,
                        safe_summary=_sanitize_summary(
                            (f"Assigned to {owner}. " if owner else "")
                            + (entry.summary or "Action metadata.")
                        ),
                        source="intelligence_actions",
                        route=_text(entry.href, routes.actions),
                        action_label="Open action",
                        priority=_text(entry.priority, "medium"),
                        related_id=str(entry.id),
                        related_type="intelligence_action",
                        staff_name=owner or None,
                    )
                )
        except Exception as exc:
            logger.debug("workforce_actions_degraded: %s", exc)
        return items

    def build_training_indicators(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> list[WorkforceContextItem]:
        _ = filters
        routes = WorkforceContextRoutes()
        if conn is None or not _is_manager_view(current_user):
            return [
                self.safe_item(
                    item_id="training:route",
                    title="Training matrix",
                    safe_summary="Open training matrix for competence and expiry indicators.",
                    source="route_hint",
                    route=routes.training,
                    action_label="Open training matrix",
                    sensitivity="manager_only",
                )
            ]
        items: list[WorkforceContextItem] = []
        try:
            from services.workforce_pressure_service import workforce_pressure_service

            pressure = workforce_pressure_service.build(conn, current_user=current_user)
            training = pressure.get("training_compliance_risk") or {}
            expired = int(training.get("expired_training_count") or 0)
            missing = int(training.get("missing_training_count") or 0)
            if expired or missing:
                items.append(
                    self.safe_item(
                        item_id="training:compliance",
                        title="Training compliance",
                        safe_summary=f"{expired} expired and {missing} missing training signal(s) in scope.",
                        source="workforce_intelligence",
                        route=routes.training,
                        action_label="Open training matrix",
                        priority="high" if expired else "medium",
                        sensitivity="manager_only",
                        metadata={"expired": expired, "missing": missing},
                    )
                )
        except Exception as exc:
            logger.debug("training_indicators_degraded: %s", exc)
        if not items:
            items.append(
                self.safe_item(
                    item_id="training:ok",
                    title="Training indicators",
                    safe_summary="No elevated training compliance signals in safe summary.",
                    source="workforce_intelligence",
                    route=routes.training,
                    sensitivity="manager_only",
                )
            )
        return items

    def build_supervision_indicators(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> list[WorkforceContextItem]:
        _ = filters
        routes = WorkforceContextRoutes()
        if not _is_manager_view(current_user):
            return []
        if conn is None:
            return [
                self.safe_item(
                    item_id="supervision:route",
                    title="Supervision",
                    safe_summary="Supervision due indicators require manager access — open supervision area.",
                    source="route_hint",
                    route=routes.supervision,
                    action_label="Open supervision",
                    sensitivity="hr_sensitive",
                )
            ]
        items: list[WorkforceContextItem] = []
        try:
            from services.workforce_pressure_service import workforce_pressure_service

            pressure = workforce_pressure_service.build(conn, current_user=current_user)
            overdue = int(pressure.get("supervision_overdue_count") or 0)
            if overdue:
                items.append(
                    self.safe_item(
                        item_id="supervision:overdue",
                        title="Supervision overdue",
                        safe_summary=f"{overdue} overdue supervision signal(s) — review in supervision area.",
                        source="workforce_intelligence",
                        route=routes.supervision,
                        action_label="Open supervision",
                        priority="high" if overdue > 2 else "medium",
                        sensitivity="hr_sensitive",
                        metadata={"overdue_count": overdue},
                    )
                )
        except Exception as exc:
            logger.debug("supervision_indicators_degraded: %s", exc)
        if not items:
            items.append(
                self.safe_item(
                    item_id="supervision:ok",
                    title="Supervision indicators",
                    safe_summary="No overdue supervision signals in safe summary scope.",
                    source="workforce_intelligence",
                    route=routes.supervision,
                    sensitivity="hr_sensitive",
                )
            )
        return items

    def build_wellbeing_indicators(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> list[WorkforceContextItem]:
        _ = filters, conn
        if not _is_manager_view(current_user):
            return []
        return [
            self.safe_item(
                item_id="wellbeing:route",
                title="Staff wellbeing",
                safe_summary="Wellbeing detail is confidential — use staff wellbeing routes with permission.",
                source="route_hint",
                route="/wellbeing",
                action_label="Open wellbeing area",
                sensitivity="confidential",
                metadata={"summary_only": True},
            )
        ]

    def build_staffing_risks(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> list[WorkforceContextItem]:
        _ = filters
        routes = WorkforceContextRoutes()
        items: list[WorkforceContextItem] = []
        shift = self.build_shift_context(current_user, filters, conn=conn)
        for warning in shift.warnings[:3]:
            items.append(
                self.safe_item(
                    item_id=f"staffing:warn:{hash(warning) % 10**6}",
                    title="Shift warning",
                    safe_summary=warning,
                    source="shift",
                    route=routes.current_shift,
                    priority="medium",
                )
            )
        if conn is None:
            return items
        try:
            from services.workforce_pressure_service import workforce_pressure_service

            pressure = workforce_pressure_service.build(conn, current_user=current_user)
            ops = pressure.get("operational_staffing_pressure") or {}
            state = _text(ops.get("state"), "manageable")
            score = int(ops.get("score") or 0)
            if state in {"high", "critical"}:
                items.append(
                    self.safe_item(
                        item_id="staffing:pressure",
                        title="Workforce pressure",
                        safe_summary=f"Workforce pressure score {score} ({state}) — manager review recommended.",
                        source="workforce_pressure",
                        route=routes.staff,
                        action_label="Open staff area",
                        priority="urgent" if state == "critical" else "high",
                        sensitivity="manager_only",
                        metadata={"pressure_score": score, "state": state},
                    )
                )
            burnout = pressure.get("burnout_indicators") or {}
            if burnout.get("burnout_risk") in {"elevated", "watch"}:
                items.append(
                    self.safe_item(
                        item_id="staffing:burnout",
                        title="Burnout risk indicator",
                        safe_summary="Elevated burnout risk signals in workforce summary — review with care.",
                        source="workforce_pressure",
                        route="/wellbeing",
                        priority="medium",
                        sensitivity="confidential",
                        metadata={
                            "burnout_risk": burnout.get("burnout_risk"),
                            "high_risk_staff": burnout.get("high_risk_staff"),
                        },
                    )
                )
        except Exception as exc:
            logger.debug("staffing_risks_degraded: %s", exc)
        return items

    def build_recommendations(self, dashboard: WorkforceContextDashboard) -> list[str]:
        recs: list[str] = []
        if dashboard.shift.gaps:
            recs.append("Verify rota and staffing gaps before handover.")
        if dashboard.supervision:
            overdue = [i for i in dashboard.supervision if "overdue" in i.id]
            if overdue:
                recs.append("Review supervision overdue indicators in the supervision area.")
        if dashboard.training:
            high = [i for i in dashboard.training if i.priority in ("high", "urgent")]
            if high:
                recs.append("Check training matrix for competence and expiry follow-up.")
        if dashboard.actions:
            recs.append("Carry staff-assigned actions into handover where relevant.")
        if dashboard.staffing_risks:
            recs.append("Review workforce pressure signals before end of shift.")
        recs.append("Use staff profile routes for permissioned HR detail — not shown in cards.")
        return recs[:10]

    def build_dashboard(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> WorkforceContextDashboard:
        home_id = _safe_int((filters or {}).get("home_id")) or _safe_int(current_user.get("home_id"))
        scope = self.safe_scope_for_user(current_user, home_id=home_id)
        limitations: list[str] = []
        if conn is None:
            limitations.append(LIMITATION_NOTICE)

        shift = self.build_shift_context(current_user, filters, conn=conn)
        staff_on_shift = self.build_staff_on_shift(current_user, filters, conn=conn)
        actions = self.build_staff_actions(current_user, filters, conn=conn)
        training = self.build_training_indicators(current_user, filters, conn=conn)
        supervision = self.build_supervision_indicators(current_user, filters, conn=conn)
        wellbeing = self.build_wellbeing_indicators(current_user, filters, conn=conn)
        staffing_risks = self.build_staffing_risks(current_user, filters, conn=conn)

        dashboard = WorkforceContextDashboard(
            generated_at=_now_iso(),
            scope=scope,
            shift=shift,
            staff_on_shift=staff_on_shift,
            actions=actions,
            training=training,
            supervision=supervision,
            wellbeing=wellbeing,
            staffing_risks=staffing_risks,
            privacy_notice=PRIVACY_NOTICE,
            limitations=limitations,
            routes=WorkforceContextRoutes(),
            metadata={"no_raw_body": True, "metadata_only": True, "orb_prompts": ORB_PROMPTS},
        )
        dashboard.recommendations = self.build_recommendations(dashboard)
        return dashboard


workforce_context_service = WorkforceContextService()

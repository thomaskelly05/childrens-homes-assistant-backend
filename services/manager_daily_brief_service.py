"""Manager daily brief — aggregates recording, review, governance and handover metadata."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.manager_daily_brief import (
    ManagerDailyBrief,
    ManagerDailyBriefHealth,
    ManagerDailyBriefItem,
    ManagerDailyBriefReviewRequest,
    ManagerDailyBriefReviewResponse,
    ManagerDailyBriefRoutes,
    ManagerDailyBriefScope,
    ManagerDailyBriefSection,
)
from schemas.recording_alerts import RecordingAlertListFilters
from services.intelligence_action_service import intelligence_action_service
from services.isn_digest_service import isn_digest_service
from services.recording_alert_service import MANAGER_JUDGEMENT_NOTICE, recording_alert_service
from services.recording_governance_service import recording_governance_service
from services.recording_review_service import recording_review_service

logger = logging.getLogger("indicare.manager_daily_brief")

PRIVACY_NOTICE = (
    "This brief uses metadata and flags only — not full record bodies. "
    "It supports oversight; it does not make safeguarding threshold decisions "
    "or claim inspection compliance."
)

ORB_PROMPTS = [
    {
        "label": "Ask ORB to summarise today's recording priorities.",
        "mode": "manager_daily_brief",
        "query": "Summarise today's recording priorities for manager review.",
    },
    {
        "label": "Ask ORB what needs manager review.",
        "mode": "action_priority",
        "query": "What recording items may need manager review today?",
    },
    {
        "label": "Ask ORB what should go into handover.",
        "mode": "manager_daily_brief",
        "query": "What should go into shift handover from recording oversight?",
    },
    {
        "label": "Ask ORB about safeguarding-sensitive themes.",
        "mode": "safeguarding_themes",
        "query": "What safeguarding-sensitive recording themes need oversight?",
    },
    {
        "label": "Ask ORB about safeguarding network priorities.",
        "mode": "safeguarding_themes",
        "query": "What safeguarding network priorities need manager review today?",
    },
    {
        "label": "Ask ORB what safeguarding follow-up needs manager review.",
        "mode": "safeguarding_themes",
        "query": "What ISN safeguarding follow-up may need manager review?",
    },
    {
        "label": "Ask ORB what should go into handover.",
        "mode": "manager_daily_brief",
        "query": "What safeguarding network themes should go into handover?",
    },
    {
        "label": "Ask ORB to help prepare safeguarding review questions.",
        "mode": "safeguarding_themes",
        "query": "Help me prepare safeguarding network review questions for manager oversight.",
    },
    {
        "label": "Ask ORB to help prioritise unresolved notifications.",
        "mode": "action_priority",
        "query": "Help me prioritise unresolved operational notifications for manager review today.",
    },
    {
        "label": "Help me prepare staff handover.",
        "mode": "manager_daily_brief",
        "query": "Help me prepare staff handover using safe workforce summaries.",
    },
    {
        "label": "What staffing issues need manager review?",
        "mode": "manager_daily_brief",
        "query": "What staffing issues need manager review today?",
    },
    {
        "label": "What actions are assigned to staff today?",
        "mode": "action_priority",
        "query": "What actions are assigned to staff that need manager follow-up?",
    },
    {
        "label": "Ask ORB what needs manager review today.",
        "mode": "manager_daily_brief",
        "query": "What operational notifications may need manager review today?",
    },
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today_iso() -> str:
    return date.today().isoformat()


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


class ManagerDailyBriefService:
    def __init__(self) -> None:
        self._reviewed: dict[str, dict[str, str]] = {}

    def _brief_reviews_storage_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "manager_daily_brief_reviews"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def get_health(self, conn: Any | None = None) -> ManagerDailyBriefHealth:
        mode = self._brief_reviews_storage_mode(conn)
        if mode == "memory":
            mode = recording_alert_service._detect_storage_mode()
        return ManagerDailyBriefHealth(
            status="ok",
            storage_mode=mode,
            persistence_available=mode == "postgresql",
        )

    def safe_scope_for_user(self, current_user: dict[str, Any]) -> ManagerDailyBriefScope:
        home_id = current_user.get("home_id")
        provider_id = current_user.get("provider_id")
        if home_id is not None:
            return ManagerDailyBriefScope(type="home", home_id=int(home_id) if home_id else None, user_id=_user_id(current_user))
        if provider_id is not None:
            return ManagerDailyBriefScope(
                type="provider",
                provider_id=int(provider_id) if provider_id else None,
                user_id=_user_id(current_user),
            )
        return ManagerDailyBriefScope(type="user", user_id=_user_id(current_user))

    def _review_key(self, current_user: dict[str, Any], day: str | None = None) -> str:
        return f"{_user_id(current_user)}:{day or _today_iso()}"

    def is_reviewed_today(self, current_user: dict[str, Any], conn: Any | None = None) -> bool:
        day = _today_iso()
        key = self._review_key(current_user, day)
        if key in self._reviewed:
            return True
        home_id = current_user.get("home_id")
        mode = self._brief_reviews_storage_mode(conn)
        if mode != "postgresql" or conn is None:
            return False
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT 1
                    FROM manager_daily_brief_reviews
                    WHERE user_id = %s AND brief_date = %s
                      AND (home_id = %s OR (%s IS NULL AND home_id IS NULL))
                    LIMIT 1
                    """,
                    (_user_id(current_user), day, home_id, home_id),
                )
                return cur.fetchone() is not None
        except Exception as exc:
            logger.debug("brief_review_lookup_failed: %s", exc)
            try:
                conn.rollback()
            except Exception:
                pass
        return False

    def mark_reviewed(
        self,
        current_user: dict[str, Any],
        request: ManagerDailyBriefReviewRequest | None = None,
        conn: Any | None = None,
    ) -> ManagerDailyBriefReviewResponse:
        day = (request.date if request else None) or _today_iso()
        reviewed_at = _now_iso()
        note = _text(request.note if request else None)
        key = self._review_key(current_user, day)
        self._reviewed[key] = {"reviewed_at": reviewed_at, "note": note}

        home_id = current_user.get("home_id")
        mode = self._brief_reviews_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                user_name = " ".join(
                    part
                    for part in (
                        _text(current_user.get("first_name")),
                        _text(current_user.get("last_name")),
                    )
                    if part
                ).strip()
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        INSERT INTO manager_daily_brief_reviews (
                            id, user_id, user_name, home_id, brief_date,
                            reviewed_at, review_note, summary_snapshot, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            str(uuid4()),
                            _user_id(current_user),
                            user_name or None,
                            int(home_id) if home_id is not None else None,
                            day,
                            reviewed_at,
                            note or None,
                            Json({}),
                            Json({"source": "manager_daily_brief_service"}),
                        ),
                    )
                    conn.commit()
            except Exception as exc:
                logger.warning("brief_review_persist_failed: %s", exc)
                try:
                    conn.rollback()
                except Exception:
                    pass

        from schemas.os_notifications import OsNotificationActionRequest
        from services.os_notification_state_service import os_notification_state_service

        try:
            os_notification_state_service.set_state(
                "manager_daily_brief:today",
                OsNotificationActionRequest(action="resolve", note=note),
                current_user,
                source="manager_daily_brief",
                category="daily_brief",
                conn=conn,
            )
        except Exception as exc:
            logger.debug("brief_notification_resolve_skipped: %s", exc)

        return ManagerDailyBriefReviewResponse(
            ok=True,
            reviewed=True,
            reviewed_at=reviewed_at,
            date=day,
        )

    def build_recording_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        digest = recording_alert_service.build_digest(
            current_user, RecordingAlertListFilters(limit=100), conn=conn
        )
        items: list[ManagerDailyBriefItem] = []
        for top in digest.top_alerts[:8]:
            items.append(
                ManagerDailyBriefItem(
                    id=f"alert:{top.id}",
                    title=top.title,
                    safe_summary=top.safe_summary or "Recording alert metadata.",
                    priority=top.severity,
                    route=digest.routes.alerts,
                    action_label=top.action_label or "Open alerts",
                    source="recording_alerts",
                    child_name=top.child_name,
                    metadata={"alert_type": top.alert_type, "no_raw_body": True},
                )
            )
        tone = "urgent" if digest.urgent or digest.safeguarding else ("attention" if digest.total_open else "neutral")
        summary = (
            f"{digest.total_open} open recording alert(s); "
            f"{digest.urgent} urgent; {digest.safeguarding} safeguarding-sensitive."
            if digest.total_open
            else "No open recording alerts in scope."
        )
        return ManagerDailyBriefSection(
            id="recording_alerts",
            title="Recording alerts",
            summary=summary,
            items=items,
            route=digest.routes.alerts,
            action_label="Open recording alerts",
            tone=tone,
            metadata={"total_open": digest.total_open, "urgent": digest.urgent},
        )

    def build_review_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        summary_data = recording_review_service.get_review_summary(current_user, conn=conn)
        items: list[ManagerDailyBriefItem] = []
        if summary_data.awaiting_review:
            items.append(
                ManagerDailyBriefItem(
                    id="review:awaiting",
                    title="Reviews waiting",
                    safe_summary=f"{summary_data.awaiting_review} draft(s) awaiting manager review.",
                    priority="high" if summary_data.urgent else "medium",
                    route="/record/reviews",
                    action_label="Open review queue",
                    source="recording_review",
                )
            )
        if summary_data.changes_requested:
            items.append(
                ManagerDailyBriefItem(
                    id="review:changes",
                    title="Changes requested",
                    safe_summary=f"{summary_data.changes_requested} draft(s) with changes requested.",
                    priority="medium",
                    route="/record/reviews",
                    action_label="Open review queue",
                    source="recording_review",
                )
            )
        tone = "urgent" if summary_data.urgent else ("attention" if summary_data.total_in_queue else "neutral")
        review_summary = (
            f"{summary_data.total_in_queue} item(s) in review queue; "
            f"{summary_data.awaiting_review} awaiting review; "
            f"{summary_data.changes_requested} changes requested."
            if summary_data.total_in_queue
            else "Review queue is clear for current scope."
        )
        return ManagerDailyBriefSection(
            id="reviews",
            title="Reviews waiting",
            summary=review_summary,
            items=items,
            route="/record/reviews",
            action_label="Open review queue",
            tone=tone,
            metadata=summary_data.model_dump(),
        )

    def build_safeguarding_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        digest = recording_alert_service.build_digest(
            current_user, RecordingAlertListFilters(limit=100), conn=conn
        )
        items: list[ManagerDailyBriefItem] = []
        for top in digest.top_alerts:
            if top.alert_type not in (
                "safeguarding_review_due",
                "safeguarding_escalation_required",
                "high_risk_review_due",
            ):
                continue
            items.append(
                ManagerDailyBriefItem(
                    id=f"sg:{top.id}",
                    title=top.title,
                    safe_summary=top.safe_summary or "Safeguarding-sensitive recording metadata.",
                    priority="urgent" if top.severity == "urgent" else "high",
                    route="/record/alerts",
                    action_label="Open alerts",
                    source="recording_alerts",
                    child_name=top.child_name,
                    metadata={"alert_type": top.alert_type},
                )
            )
            if len(items) >= 6:
                break
        summary = (
            f"{digest.safeguarding} safeguarding-sensitive recording alert(s) need oversight."
            if digest.safeguarding
            else "No safeguarding-sensitive recording alerts flagged in scope."
        )
        return ManagerDailyBriefSection(
            id="safeguarding",
            title="Safeguarding-sensitive",
            summary=summary,
            items=items,
            route="/record/alerts",
            action_label="Open alerts",
            tone="urgent" if digest.safeguarding else "neutral",
        )

    def build_actions_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        home_id = current_user.get("home_id")
        action_summary = intelligence_action_service.build_action_summary(
            home_id=home_id, conn=conn
        )
        open_count = (
            action_summary.by_status.get("open", 0)
            + action_summary.by_status.get("proposed", 0)
            + action_summary.by_status.get("in_progress", 0)
            + action_summary.proposed_count
        )
        items: list[ManagerDailyBriefItem] = []
        if open_count:
            items.append(
                ManagerDailyBriefItem(
                    id="actions:open",
                    title="Intelligence actions",
                    safe_summary=f"{open_count} intelligence action(s) may need manager follow-up.",
                    priority="medium",
                    route="/actions",
                    action_label="Open actions",
                    source="intelligence_actions",
                )
            )
        summary = (
            f"{open_count} open intelligence action(s) in scope."
            if open_count
            else "No open intelligence actions surfaced for this scope."
        )
        return ManagerDailyBriefSection(
            id="actions",
            title="Actions",
            summary=summary,
            items=items,
            route="/actions",
            action_label="Open actions",
            tone="attention" if open_count else "neutral",
        )

    def build_isn_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        digest = isn_digest_service.build_digest(current_user, conn=conn)
        items: list[ManagerDailyBriefItem] = []
        for top in digest.top_items[:6]:
            items.append(
                ManagerDailyBriefItem(
                    id=f"isn:{top.id}",
                    title=top.title,
                    safe_summary=top.safe_summary,
                    priority=top.severity,
                    route=top.route,
                    action_label=top.action_label or "Open safeguarding network",
                    source="isn",
                    metadata={"type": top.type, "no_raw_body": True, "metadata_only": True},
                )
            )
        summary = (
            f"{digest.total_open} open safeguarding network item(s); "
            f"{digest.urgent} urgent; {digest.review_required} review required."
            if digest.total_open
            else "No open ISN safeguarding network items in scope."
        )
        if digest.linked_recording_alerts:
            summary += f" {digest.linked_recording_alerts} linked safeguarding-sensitive recording alert(s)."
        tone = "urgent" if digest.urgent else ("attention" if digest.total_open else "neutral")
        limitations = list(digest.limitations or [])
        return ManagerDailyBriefSection(
            id="isn_safeguarding_network",
            title="Safeguarding network",
            summary=summary,
            items=items,
            route=digest.routes.safeguarding,
            action_label="Open ISN / safeguarding",
            tone=tone,
            metadata={
                "urgent": digest.urgent,
                "review_required": digest.review_required,
                "follow_up_due": digest.follow_up_due,
                "linked_recording_alerts": digest.linked_recording_alerts,
                "limitations": limitations,
                "metadata_only": True,
            },
        )

    def build_notification_oversight_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        """Metadata-only notification and escalation oversight for managers."""
        items: list[ManagerDailyBriefItem] = []
        summary = "Notification oversight metrics unavailable."
        tone: str = "neutral"
        meta: dict[str, Any] = {"metadata_only": True, "no_raw_body": True}
        try:
            from services.os_notification_analytics_service import os_notification_analytics_service

            gov = os_notification_analytics_service.build_governance_summary(current_user, conn=conn)
            m = gov.response_metrics
            last = gov.last_escalation_check
            summary = (
                f"{m.urgent_unacknowledged} urgent and {m.safeguarding_unacknowledged} safeguarding "
                f"notification(s) not yet acknowledged."
            )
            if m.urgent_unacknowledged or m.safeguarding_unacknowledged:
                tone = "urgent" if m.urgent_unacknowledged else "attention"
            else:
                summary = "No urgent or safeguarding notifications awaiting acknowledgement in scope."
            if last:
                summary += f" Last escalation check: {last.started_at[:16]}."
            else:
                summary += " No escalation check recorded yet — run one from notification settings."
            if gov.unresolved_escalation_candidates:
                summary += f" {len(gov.unresolved_escalation_candidates)} escalation candidate(s) from last check."
            for rec in gov.recommendations[:3]:
                items.append(
                    ManagerDailyBriefItem(
                        id=f"notif_rec:{hash(rec) % 10**8}",
                        title="Notification oversight",
                        safe_summary=rec,
                        priority="medium",
                        route="/notifications/settings",
                        action_label="Notification settings",
                        source="os_notifications",
                    )
                )
            meta.update(
                {
                    "urgent_unacknowledged": m.urgent_unacknowledged,
                    "safeguarding_unacknowledged": m.safeguarding_unacknowledged,
                    "last_escalation_check": last.started_at if last else None,
                    "candidates": len(gov.unresolved_escalation_candidates),
                }
            )
        except Exception as exc:
            logger.debug("notification_oversight_section_degraded: %s", exc)
            summary = "Notification oversight summary temporarily unavailable. Use notification settings."
            meta["degraded"] = True
        return ManagerDailyBriefSection(
            id="notification_oversight",
            title="Notification and escalation oversight",
            summary=summary,
            items=items,
            route="/notifications/settings",
            action_label="Open notification settings",
            tone=tone,
            metadata=meta,
        )

    def build_workforce_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        from services.workforce_context_service import workforce_context_service

        items: list[ManagerDailyBriefItem] = []
        tone: str = "neutral"
        summary = "Workforce summary is unavailable. Open staff or rota area to check manually."
        shift = None
        try:
            dashboard = workforce_context_service.build_dashboard(current_user, conn=conn)
            shift = dashboard.shift
            parts: list[str] = []
            if shift.staff_count:
                parts.append(f"{shift.staff_count} staff on shift")
            if shift.shift_lead_name:
                parts.append(f"lead: {shift.shift_lead_name}")
            if parts:
                summary = "; ".join(parts) + "."
            if shift.gaps:
                summary += f" {len(shift.gaps)} staffing gap signal(s)."
                tone = "attention"
            for wf in (
                dashboard.staff_on_shift[:2]
                + dashboard.actions[:2]
                + dashboard.training[:2]
                + dashboard.supervision[:2]
                + dashboard.staffing_risks[:2]
            ):
                items.append(
                    ManagerDailyBriefItem(
                        id=f"workforce:{wf.id}",
                        title=wf.title,
                        safe_summary=wf.safe_summary,
                        priority=wf.priority if wf.priority in ("low", "medium", "high", "urgent") else "medium",
                        route=wf.route,
                        action_label=wf.action_label,
                        source=wf.source,
                        metadata={**(wf.metadata or {}), "sensitivity": wf.sensitivity},
                    )
                )
                if wf.priority in ("high", "urgent"):
                    tone = "urgent" if wf.priority == "urgent" else "attention"
        except Exception as exc:
            logger.debug("brief_workforce_section_skipped: %s", exc)
            items.append(
                ManagerDailyBriefItem(
                    id="workforce:route",
                    title="Staff and rota",
                    safe_summary=summary,
                    route="/staff",
                    action_label="Open staff area",
                    source="route_hint",
                )
            )
        items.append(
            ManagerDailyBriefItem(
                id="workforce:staff_profiles",
                title="Staff profiles",
                safe_summary="Open adult working-life staff profiles for shift, training and supervision indicators.",
                priority="low",
                route="/staff",
                action_label="Open staff profiles",
                source="staff_profile_os",
            )
        )
        if shift and shift.shift_lead_id:
            items.insert(
                0,
                ManagerDailyBriefItem(
                    id=f"workforce:shift_lead_profile:{shift.shift_lead_id}",
                    title="Shift lead profile",
                    safe_summary=(
                        f"Shift lead {shift.shift_lead_name or shift.shift_lead_id} — "
                        "open staff profile for safe summary."
                    ),
                    priority="medium",
                    route=f"/staff/{shift.shift_lead_id}",
                    action_label="Open staff profile",
                    source="staff_profile_os",
                    metadata={"shift_lead_id": shift.shift_lead_id, "metadata_only": True},
                ),
            )
        return ManagerDailyBriefSection(
            id="workforce_shift",
            title="Workforce and shift context",
            summary=summary,
            items=items[:8],
            route="/staff",
            action_label="Open staff profiles",
            tone=tone,
            metadata={"metadata_only": True, "no_raw_body": True},
        )

    def build_handover_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        from services.handover_intelligence_service import handover_intelligence_service

        items: list[ManagerDailyBriefItem] = [
            ManagerDailyBriefItem(
                id="handover:prepare",
                title="Prepare handover",
                safe_summary="Open the shift handover workspace with safe intelligence summaries.",
                priority="medium",
                route="/handover",
                action_label="Prepare handover",
                source="handover",
            ),
        ]
        try:
            from services.handover_review_service import handover_review_service

            queue = handover_review_service.list_review_queue(current_user, conn=conn)
            awaiting = int(queue.counts.get("awaiting_review") or 0)
            if awaiting:
                items.insert(
                    0,
                    ManagerDailyBriefItem(
                        id="handover:reviews",
                        title="Handover reviews awaiting action",
                        safe_summary=f"{awaiting} handover draft(s) awaiting manager review.",
                        priority="high" if awaiting > 2 else "medium",
                        route="/handover/reviews",
                        action_label="Open review queue",
                        source="handover_review",
                        metadata={"awaiting_review": awaiting, "no_raw_body": True},
                    ),
                )
        except Exception as exc:
            logger.debug("brief_handover_review_skipped: %s", exc)
        tone = "attention"
        summary = "Review recording alerts, safeguarding network and reviews before handover."
        try:
            dashboard = handover_intelligence_service.build_dashboard(current_user, conn=conn)
            summary = dashboard.summary or summary
            if dashboard.urgent_count:
                tone = "urgent"
            for section in dashboard.sections:
                for intel in section.items[:3]:
                    if intel.section_type in (
                        "recording_alerts",
                        "reviews",
                        "safeguarding",
                        "actions",
                    ):
                        items.append(
                            ManagerDailyBriefItem(
                                id=f"handover:{intel.id}",
                                title=intel.title,
                                safe_summary=intel.safe_summary,
                                priority=intel.priority,
                                route=intel.route,
                                action_label=intel.action_label or "Open",
                                source=intel.source,
                                child_id=intel.child_id,
                                child_name=intel.child_name,
                                metadata={"no_raw_body": True},
                            )
                        )
            items = items[:10]
        except Exception as exc:
            logger.debug("brief_handover_intelligence_skipped: %s", exc)
            items.extend(
                [
                    ManagerDailyBriefItem(
                        id="handover:alerts",
                        title="Review recording alerts before handover",
                        safe_summary="Check open recording alerts before signing off the shift.",
                        priority="high",
                        route="/record/alerts",
                        action_label="Open alerts",
                        source="recording_alerts",
                    ),
                    ManagerDailyBriefItem(
                        id="handover:changes",
                        title="Check changes requested before shift end",
                        safe_summary="Follow up drafts where manager requested changes.",
                        priority="medium",
                        route="/record/reviews",
                        action_label="Open review queue",
                        source="recording_review",
                    ),
                ]
            )
        return ManagerDailyBriefSection(
            id="handover",
            title="Handover points",
            summary=summary,
            items=items,
            route="/handover",
            action_label="Prepare handover",
            tone=tone,
            metadata={"handover_reviews_route": "/handover/reviews"},
        )

    def build_child_journey_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        _ = conn
        return ManagerDailyBriefSection(
            id="child_journey",
            title="Child journey",
            summary="Open child journeys for recording, chronology and safeguarding context.",
            items=[
                ManagerDailyBriefItem(
                    id="cj:children",
                    title="Children in view",
                    safe_summary="Select a young person to open journey, recording and alerts.",
                    priority="low",
                    route="/young-people",
                    action_label="Choose child",
                    source="child_journey",
                )
            ],
            route="/young-people",
            action_label="Open children",
            tone="neutral",
            metadata={"user_id": _user_id(current_user)},
        )

    def build_recommendations(self, brief: ManagerDailyBrief) -> list[str]:
        recs: list[str] = []
        for section in brief.sections:
            if section.tone == "urgent":
                recs.append(f"Prioritise {section.title.lower()} before other tasks.")
        if brief.recording_summary and "No open" not in brief.recording_summary:
            recs.append("Run recording alert checks if you have not already today.")
        if brief.review_summary and "clear" not in brief.review_summary.lower():
            recs.append("Work through the manager review queue in priority order.")
        if brief.handover_summary:
            recs.append("Include recording and safeguarding themes in handover.")
        if brief.isn_summary and "No open" not in brief.isn_summary:
            recs.append("Review safeguarding network (ISN) items before handover.")
        if brief.workforce_summary and "unavailable" not in brief.workforce_summary.lower():
            recs.append("Review workforce and shift context before handover.")
        for section in brief.sections:
            if section.id == "notification_oversight" and section.tone in ("urgent", "attention"):
                recs.append(
                    "Review urgent and safeguarding notifications in the notification centre before handover."
                )
                if "No escalation check" in section.summary:
                    recs.append("Run an escalation check from notification settings if checks are stale.")
                break
        recs.append(MANAGER_JUDGEMENT_NOTICE)
        return recs[:10]

    def build_brief(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> ManagerDailyBrief:
        _ = filters
        if not _is_manager_view(current_user):
            return ManagerDailyBrief(
                generated_at=_now_iso(),
                date=_today_iso(),
                scope=self.safe_scope_for_user(current_user),
                opening_summary="Manager daily brief requires manager or senior oversight role.",
                limitations=["Insufficient role for manager daily brief."],
                privacy_notice=PRIVACY_NOTICE,
                orb_prompts=ORB_PROMPTS,
            )

        recording = self.build_recording_section(current_user, conn=conn)
        review = self.build_review_section(current_user, conn=conn)
        safeguarding = self.build_safeguarding_section(current_user, conn=conn)
        isn_section = self.build_isn_section(current_user, conn=conn)
        actions = self.build_actions_section(current_user, conn=conn)
        handover = self.build_handover_section(current_user, conn=conn)
        workforce = self.build_workforce_section(current_user, conn=conn)
        notification_oversight = self.build_notification_oversight_section(current_user, conn=conn)
        child_journey = self.build_child_journey_section(current_user, conn=conn)

        try:
            gov = recording_governance_service.build_dashboard(current_user, conn=conn)
            gov_cards = len(gov.summary_cards or [])
        except Exception:
            gov_cards = 0

        sections = [
            recording,
            review,
            safeguarding,
            isn_section,
            notification_oversight,
            workforce,
            actions,
            handover,
        ]
        opening = (
            f"Today: {recording.summary} {review.summary}"
            if recording.tone != "neutral" or review.tone != "neutral"
            else "Recording oversight and review queues look manageable for current scope."
        )

        limitations = list(recording_alert_service.build_digest(current_user, conn=conn).limitations or [])
        limitations.extend(isn_section.metadata.get("limitations") or [])
        if gov_cards == 0:
            limitations.append("Governance metrics may be limited until drafts exist in scope.")

        brief = ManagerDailyBrief(
            generated_at=_now_iso(),
            date=_today_iso(),
            scope=self.safe_scope_for_user(current_user),
            opening_summary=opening,
            recording_summary=recording.summary,
            review_summary=review.summary,
            safeguarding_summary=safeguarding.summary,
            isn_summary=isn_section.summary,
            action_summary=actions.summary,
            child_journey_summary=child_journey.summary,
            handover_summary=handover.summary,
            workforce_summary=workforce.summary,
            sections=sections,
            routes=ManagerDailyBriefRoutes(),
            limitations=limitations[:8],
            privacy_notice=PRIVACY_NOTICE,
            orb_prompts=ORB_PROMPTS,
            reviewed=self.is_reviewed_today(current_user, conn=conn),
            reviewed_at=self._reviewed.get(self._review_key(current_user), {}).get("reviewed_at"),
            metadata={"no_raw_body": True, "governance_cards": gov_cards},
        )
        brief.recommendations = self.build_recommendations(brief)
        return brief


manager_daily_brief_service = ManagerDailyBriefService()

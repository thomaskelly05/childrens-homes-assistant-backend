"""Manager daily brief — aggregates recording, review, governance and handover metadata."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
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

    def get_health(self, conn: Any | None = None) -> ManagerDailyBriefHealth:
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
        _ = conn
        return self._review_key(current_user) in self._reviewed

    def mark_reviewed(
        self,
        current_user: dict[str, Any],
        request: ManagerDailyBriefReviewRequest | None = None,
        conn: Any | None = None,
    ) -> ManagerDailyBriefReviewResponse:
        _ = conn
        day = (request.date if request else None) or _today_iso()
        reviewed_at = _now_iso()
        self._reviewed[self._review_key(current_user, day)] = {
            "reviewed_at": reviewed_at,
            "note": _text(request.note if request else None),
        }
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

    def build_handover_section(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> ManagerDailyBriefSection:
        _ = current_user, conn
        items = [
            ManagerDailyBriefItem(
                id="handover:prepare",
                title="Prepare handover",
                safe_summary="Complete shift handover with recording and safeguarding context.",
                priority="medium",
                route="/handover/current",
                action_label="Prepare handover",
                source="handover",
            ),
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
        return ManagerDailyBriefSection(
            id="handover",
            title="Handover points",
            summary="Review recording alerts and changes requested before handover.",
            items=items,
            route="/handover/current",
            action_label="Prepare handover",
            tone="attention",
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
        child_journey = self.build_child_journey_section(current_user, conn=conn)

        try:
            gov = recording_governance_service.build_dashboard(current_user, conn=conn)
            gov_cards = len(gov.summary_cards or [])
        except Exception:
            gov_cards = 0

        sections = [recording, review, safeguarding, isn_section, actions, handover]
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

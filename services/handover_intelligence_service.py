"""Handover intelligence — safe metadata summaries for shift handover workspace."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.handover_intelligence import (
    HandoverHealth,
    HandoverIntelligenceDashboard,
    HandoverIntelligenceItem,
    HandoverIntelligenceRoutes,
    HandoverIntelligenceSection,
    HandoverPriority,
    HandoverScope,
    HandoverSectionType,
)
from schemas.recording_alerts import RecordingAlertListFilters
from schemas.recording_review import RecordingReviewQueueFilters
from services.handover_draft_service import handover_draft_service
from services.intelligence_action_service import intelligence_action_service
from services.isn_digest_service import isn_digest_service
from services.manager_daily_brief_service import MANAGER_JUDGEMENT_NOTICE
from services.recording_alert_service import recording_alert_service
from services.recording_review_service import recording_review_service

logger = logging.getLogger("indicare.handover_intelligence")

PRIVACY_NOTICE = (
    "Handover summaries use metadata and safe summaries only. "
    "Open linked records for full detail where you have permission. "
    "This workspace supports professional judgement; it does not make safeguarding decisions."
)

LIMITATION_NOTICE = (
    "Completing a handover draft here does not create a formal handover_records entry. "
    "Use young-person handover workflows where a signed record is required."
)

ORB_PROMPTS = [
    {
        "label": "Help me review this handover for clarity.",
        "mode": "manager_daily_brief",
        "query": "Help me review this handover for clarity.",
    },
    {
        "label": "Help me prepare a manager review of this handover.",
        "mode": "manager_daily_brief",
        "query": "Help me prepare a manager review of this handover.",
    },
    {
        "label": "Help me prepare today's handover.",
        "mode": "manager_daily_brief",
        "query": "Help me prepare today's shift handover using safe summaries.",
    },
    {
        "label": "What needs to be carried into the next shift?",
        "mode": "action_priority",
        "query": "What needs to be carried into the next shift from today's operational picture?",
    },
    {
        "label": "What safeguarding-sensitive issues should be handed over?",
        "mode": "safeguarding_themes",
        "query": "What safeguarding-sensitive themes should be handed over without raw narratives?",
    },
    {
        "label": "What actions need follow-up?",
        "mode": "action_priority",
        "query": "What intelligence actions need follow-up before shift end?",
    },
    {
        "label": "What should staff know about recording alerts?",
        "mode": "record_quality_review",
        "query": "What recording alert themes should the next shift know about?",
    },
]

_RAW_BODY_PATTERN = re.compile(
    r"(description|narrative|body|incident_text|summary_text)\s*[:=]",
    re.IGNORECASE,
)


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


def _sanitize_summary(text: str, *, max_len: int = 280) -> str:
    cleaned = _text(text, "Metadata summary available — open linked route for detail.")
    if _RAW_BODY_PATTERN.search(cleaned):
        cleaned = "Metadata summary available — open linked route for detail."
    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 3].rstrip() + "..."
    return cleaned


class HandoverIntelligenceService:
    def metadata_only_item(
        self,
        *,
        item_id: str,
        title: str,
        safe_summary: str,
        section_type: HandoverSectionType,
        priority: HandoverPriority = "medium",
        source: str,
        route: str,
        action_label: str | None = None,
        child_id: int | None = None,
        child_name: str | None = None,
        home_id: int | None = None,
        related_id: str | None = None,
        related_type: str | None = None,
        safeguarding_sensitive: bool = False,
        manager_review_required: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> HandoverIntelligenceItem:
        return HandoverIntelligenceItem(
            id=item_id,
            title=title,
            safe_summary=_sanitize_summary(safe_summary),
            section_type=section_type,
            priority=priority,
            source=source,
            route=route,
            action_label=action_label,
            child_id=child_id,
            child_name=child_name,
            home_id=home_id,
            related_id=related_id,
            related_type=related_type,
            safeguarding_sensitive=safeguarding_sensitive,
            manager_review_required=manager_review_required,
            metadata={**(metadata or {}), "no_raw_body": True, "metadata_only": True},
        )

    def safe_scope_for_user(
        self,
        current_user: dict[str, Any],
        *,
        child_id: int | None = None,
    ) -> HandoverScope:
        if child_id is not None:
            return HandoverScope(
                type="child",
                child_id=child_id,
                home_id=_safe_int(current_user.get("home_id")),
                user_id=_user_id(current_user),
            )
        home_id = _safe_int(current_user.get("home_id"))
        if home_id is not None:
            return HandoverScope(type="home", home_id=home_id, user_id=_user_id(current_user))
        return HandoverScope(type="user", user_id=_user_id(current_user))

    def get_health(self, conn: Any | None = None) -> HandoverHealth:
        draft_health = handover_draft_service.get_health(conn=conn)
        alert_mode = recording_alert_service._detect_storage_mode()
        return HandoverHealth(
            status="ok",
            storage_mode=draft_health.storage_mode or alert_mode,
            persistence_available=draft_health.persistence_available,
            draft_count=draft_health.draft_count,
        )

    def _list_filters(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None,
    ) -> tuple[RecordingAlertListFilters, RecordingReviewQueueFilters, int | None, int | None]:
        filters = filters or {}
        child_id = _safe_int(filters.get("child_id"))
        home_id = _safe_int(filters.get("home_id")) or _safe_int(current_user.get("home_id"))
        alert_filters = RecordingAlertListFilters(
            limit=int(filters.get("limit") or 100),
            child_id=child_id,
            home_id=home_id if child_id is None else None,
        )
        review_filters = RecordingReviewQueueFilters(
            limit=int(filters.get("limit") or 50),
            child_id=child_id,
            home_id=home_id if child_id is None else None,
        )
        return alert_filters, review_filters, child_id, home_id

    def _routes_for_scope(self, child_id: int | None, home_id: int | None) -> HandoverIntelligenceRoutes:
        routes = HandoverIntelligenceRoutes()
        if child_id is not None:
            cid = child_id
            routes = HandoverIntelligenceRoutes(
                handover=f"/handover?child_id={cid}",
                current=f"/handover/current?child_id={cid}",
                alerts=f"/record/alerts?child_id={cid}",
                reviews=f"/record/reviews?child_id={cid}",
                governance=f"/record/governance?child_id={cid}",
                safeguarding=f"/safeguarding?young_person_id={cid}",
            )
        elif home_id is not None:
            hid = home_id
            routes = HandoverIntelligenceRoutes(
                alerts=f"/record/alerts?home_id={hid}",
                governance=f"/record/governance?home_id={hid}",
            )
        return routes

    def build_recording_alerts_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        alert_filters, _, child_id, home_id = self._list_filters(current_user, filters)
        warnings: list[str] = []
        items: list[HandoverIntelligenceItem] = []
        try:
            digest = recording_alert_service.build_digest(current_user, alert_filters, conn=conn)
            routes = self._routes_for_scope(child_id, home_id)
            for top in digest.top_alerts[:10]:
                items.append(
                    self.metadata_only_item(
                        item_id=f"alert:{top.id}",
                        title=top.title,
                        safe_summary=top.safe_summary or "Recording alert metadata.",
                        section_type="recording_alerts",
                        priority=top.severity,
                        source="recording_alerts",
                        route=routes.alerts,
                        action_label=top.action_label or "Open alerts",
                        child_name=top.child_name,
                        safeguarding_sensitive=top.alert_type
                        in (
                            "safeguarding_review_due",
                            "safeguarding_escalation_required",
                        ),
                        manager_review_required=top.alert_type
                        in ("manager_review_required", "high_risk_review_due"),
                        related_id=str(top.id),
                        related_type="recording_alert",
                        metadata={"alert_type": top.alert_type},
                    )
                )
            summary = (
                f"{digest.total_open} open recording alert(s); "
                f"{digest.urgent} urgent; {digest.safeguarding} safeguarding-sensitive."
                if digest.total_open
                else "No open recording alerts in scope."
            )
            return HandoverIntelligenceSection(
                id="recording_alerts",
                title="Recording alerts",
                section_type="recording_alerts",
                summary=summary,
                items=items,
                warnings=warnings,
                route=routes.alerts,
                action_label="Open recording alerts",
                metadata={
                    "total_open": digest.total_open,
                    "urgent": digest.urgent,
                    "safeguarding": digest.safeguarding,
                },
            )
        except Exception as exc:
            logger.warning("handover_alerts_section_failed: %s", exc)
            warnings.append("Recording alerts could not be loaded for handover.")
            return HandoverIntelligenceSection(
                id="recording_alerts",
                title="Recording alerts",
                section_type="recording_alerts",
                summary="Recording alerts unavailable — check alerts workspace.",
                items=[],
                warnings=warnings,
                route="/record/alerts",
                action_label="Open recording alerts",
                metadata={"degraded": True},
            )

    def build_reviews_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        _, review_filters, child_id, home_id = self._list_filters(current_user, filters)
        routes = self._routes_for_scope(child_id, home_id)
        warnings: list[str] = []
        items: list[HandoverIntelligenceItem] = []
        try:
            summary_data = recording_review_service.get_review_summary(current_user, conn=conn)
            if summary_data.awaiting_review:
                items.append(
                    self.metadata_only_item(
                        item_id="review:awaiting",
                        title="Reviews awaiting action",
                        safe_summary=f"{summary_data.awaiting_review} draft(s) awaiting manager review.",
                        section_type="reviews",
                        priority="urgent" if summary_data.urgent else "high",
                        source="recording_review",
                        route=routes.reviews,
                        action_label="Open review queue",
                        manager_review_required=True,
                    )
                )
            if summary_data.changes_requested:
                items.append(
                    self.metadata_only_item(
                        item_id="review:changes",
                        title="Changes requested",
                        safe_summary=f"{summary_data.changes_requested} draft(s) with changes requested.",
                        section_type="reviews",
                        priority="medium",
                        source="recording_review",
                        route=routes.reviews,
                        action_label="Open review queue",
                    )
                )
            if summary_data.safeguarding_review:
                items.append(
                    self.metadata_only_item(
                        item_id="review:safeguarding",
                        title="Safeguarding review in queue",
                        safe_summary=f"{summary_data.safeguarding_review} safeguarding-sensitive review item(s).",
                        section_type="reviews",
                        priority="high",
                        source="recording_review",
                        route=routes.reviews,
                        action_label="Open review queue",
                        safeguarding_sensitive=True,
                    )
                )
            queue = recording_review_service.list_review_queue(
                current_user, review_filters, conn=conn
            )
            for row in queue.items[:5]:
                items.append(
                    self.metadata_only_item(
                        item_id=f"review:draft:{row.draft_id}",
                        title=row.title or "Recording review",
                        safe_summary=(
                            f"Draft awaiting {row.review_status} — "
                            f"{row.recording_type} (metadata only)."
                        ),
                        section_type="reviews",
                        priority=row.review_priority,
                        source="recording_review",
                        route=routes.reviews,
                        action_label="Open review",
                        child_id=row.child_id,
                        child_name=row.child_name,
                        related_id=str(row.draft_id),
                        related_type="recording_draft",
                        safeguarding_sensitive=bool(
                            row.safeguarding_review_required or row.safeguarding_sensitive
                        ),
                        manager_review_required=bool(row.manager_review_required),
                    )
                )
            review_summary = (
                f"{summary_data.total_in_queue} item(s) in review queue."
                if summary_data.total_in_queue
                else "Review queue is clear for current scope."
            )
            return HandoverIntelligenceSection(
                id="reviews",
                title="Reviews awaiting action",
                section_type="reviews",
                summary=review_summary,
                items=items[:12],
                warnings=warnings,
                route=routes.reviews,
                action_label="Open review queue",
                metadata=summary_data.model_dump(),
            )
        except Exception as exc:
            logger.warning("handover_reviews_section_failed: %s", exc)
            warnings.append("Review queue could not be loaded for handover.")
            return HandoverIntelligenceSection(
                id="reviews",
                title="Reviews awaiting action",
                section_type="reviews",
                summary="Review queue unavailable.",
                items=[],
                warnings=warnings,
                route=routes.reviews,
                metadata={"degraded": True},
            )

    def build_isn_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        _, _, child_id, home_id = self._list_filters(current_user, filters)
        routes = self._routes_for_scope(child_id, home_id)
        warnings: list[str] = []
        items: list[HandoverIntelligenceItem] = []
        if not _is_manager_view(current_user):
            return HandoverIntelligenceSection(
                id="safeguarding_isn",
                title="Safeguarding and ISN",
                section_type="safeguarding",
                summary="Safeguarding network digest requires manager or senior oversight role.",
                items=[],
                warnings=["ISN digest limited to manager view."],
                route=routes.safeguarding,
                action_label="Open safeguarding",
            )
        try:
            digest = isn_digest_service.build_digest(current_user, filters, conn=conn)
            for top in digest.top_items[:8]:
                items.append(
                    self.metadata_only_item(
                        item_id=f"isn:{top.id}",
                        title=top.title,
                        safe_summary=top.safe_summary or "Safeguarding network metadata.",
                        section_type="safeguarding",
                        priority=top.severity,
                        source="isn",
                        route=routes.safeguarding,
                        action_label=top.action_label or "Open safeguarding network",
                        safeguarding_sensitive=True,
                        manager_review_required=top.type in (
                            "isn_review_required",
                            "isn_manager_action_required",
                        ),
                        related_id=str(top.id),
                        related_type="isn_alert",
                    )
                )
            summary = (
                f"{digest.total_open} open safeguarding network item(s); "
                f"{digest.urgent} urgent."
                if digest.available and digest.total_open
                else (
                    digest.limitations[0]
                    if digest.limitations
                    else "No open safeguarding network items in scope."
                )
            )
            return HandoverIntelligenceSection(
                id="safeguarding_isn",
                title="Safeguarding and ISN",
                section_type="safeguarding",
                summary=summary,
                items=items,
                warnings=list(digest.limitations or [])[:3],
                route=routes.safeguarding,
                action_label="Open safeguarding network",
                metadata={
                    "urgent": digest.urgent,
                    "review_required": digest.review_required,
                    "metadata_only": True,
                },
            )
        except Exception as exc:
            logger.warning("handover_isn_section_failed: %s", exc)
            warnings.append("Safeguarding network digest could not be loaded.")
            return HandoverIntelligenceSection(
                id="safeguarding_isn",
                title="Safeguarding and ISN",
                section_type="safeguarding",
                summary="Safeguarding network summary unavailable.",
                items=[],
                warnings=warnings,
                route=routes.safeguarding,
                metadata={"degraded": True},
            )

    def build_actions_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        _, _, child_id, home_id = self._list_filters(current_user, filters)
        routes = self._routes_for_scope(child_id, home_id)
        warnings: list[str] = []
        items: list[HandoverIntelligenceItem] = []
        try:
            home_key = str(home_id) if home_id is not None else None
            summary = intelligence_action_service.build_action_summary(
                home_id=home_key, conn=conn
            )
            proposed = int(summary.proposed_count or 0)
            if proposed:
                items.append(
                    self.metadata_only_item(
                        item_id="actions:proposed",
                        title="Intelligence actions proposed",
                        safe_summary=f"{proposed} proposed action(s) may need manager review.",
                        section_type="actions",
                        priority="medium",
                        source="intelligence_actions",
                        route=routes.actions,
                        action_label="Open actions",
                        manager_review_required=True,
                    )
                )
            feed = intelligence_action_service.build_attention_feed(
                home_id=home_key, conn=conn
            )
            feed_entries = (
                feed.urgent
                + feed.high_priority
                + feed.awaiting_decision
                + feed.follow_ups_due
            )[:6]
            for entry in feed_entries:
                priority = _text(entry.priority, "medium")
                if priority not in ("low", "medium", "high", "urgent"):
                    priority = "medium"
                items.append(
                    self.metadata_only_item(
                        item_id=f"action:{entry.id}",
                        title=entry.title,
                        safe_summary=_sanitize_summary(entry.summary or "Action metadata."),
                        section_type="actions",
                        priority=priority,
                        source="intelligence_actions",
                        route=entry.href or routes.actions,
                        action_label="Open action",
                        related_id=str(entry.id),
                        related_type="intelligence_action",
                    )
                )
            action_summary = (
                f"{proposed} proposed intelligence action(s) in scope."
                if proposed
                else "No proposed intelligence actions in scope."
            )
            return HandoverIntelligenceSection(
                id="actions",
                title="Actions and follow-up",
                section_type="actions",
                summary=action_summary,
                items=items[:10],
                warnings=warnings,
                route=routes.actions,
                action_label="Open actions",
                metadata={"proposed_count": proposed},
            )
        except Exception as exc:
            logger.warning("handover_actions_section_failed: %s", exc)
            warnings.append("Intelligence actions could not be loaded.")
            return HandoverIntelligenceSection(
                id="actions",
                title="Actions and follow-up",
                section_type="actions",
                summary="Actions summary unavailable.",
                items=[],
                warnings=warnings,
                route=routes.actions,
                metadata={"degraded": True},
            )

    def build_child_updates_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        _, _, child_id, home_id = self._list_filters(current_user, filters)
        routes = self._routes_for_scope(child_id, home_id)
        items: list[HandoverIntelligenceItem] = []
        if child_id is not None:
            cid = child_id
            items.append(
                self.metadata_only_item(
                    item_id="child:journey",
                    title="Child journey",
                    safe_summary="Open child journey for chronology, recording and safeguarding context.",
                    section_type="child_updates",
                    priority="medium",
                    source="child_journey",
                    route=f"/young-people/{cid}/journey",
                    action_label="Open child journey",
                    child_id=cid,
                )
            )
            items.append(
                self.metadata_only_item(
                    item_id="child:record",
                    title="Recording workspace",
                    safe_summary="Review drafts and recording follow-up for this child.",
                    section_type="child_updates",
                    priority="medium",
                    source="recording",
                    route=f"/record?child_id={cid}&about=child",
                    action_label="Open record hub",
                    child_id=cid,
                )
            )
        else:
            items.append(
                self.metadata_only_item(
                    item_id="children:list",
                    title="Children in home",
                    safe_summary="Open young people list to prepare child-level handover notes.",
                    section_type="child_updates",
                    priority="low",
                    source="child_journey",
                    route="/young-people",
                    action_label="Open children",
                )
            )
        return HandoverIntelligenceSection(
            id="child_updates",
            title="Child updates",
            section_type="child_updates",
            summary="Use child journey and record hub for child-centred handover detail.",
            items=items,
            route=routes.handover,
            action_label="Prepare handover",
        )

    def build_health_medication_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        _ = current_user, filters, conn
        return HandoverIntelligenceSection(
            id="health_medication",
            title="Health / medication",
            section_type="health_medication",
            summary="Capture medication, health appointments and clinical follow-up in handover notes.",
            items=[
                self.metadata_only_item(
                    item_id="health:medication",
                    title="Medication follow-up",
                    safe_summary="Check recording alerts for medication review items before handover.",
                    section_type="health_medication",
                    priority="medium",
                    source="recording_alerts",
                    route="/record/alerts",
                    action_label="Open alerts",
                )
            ],
            route="/medication",
            action_label="Open medication",
        )

    def build_environment_section(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        _ = current_user, filters, conn
        return HandoverIntelligenceSection(
            id="environment",
            title="Environment / practical tasks",
            section_type="environment",
            summary="Note environmental issues, maintenance and practical tasks for the next shift.",
            items=[],
            route="/handover",
        )

    def build_overview_section(
        self,
        current_user: dict[str, Any],
        *,
        shift_label: str,
        routes: HandoverIntelligenceRoutes,
        conn: Any | None = None,
    ) -> HandoverIntelligenceSection:
        drafts = handover_draft_service.list_drafts(
            current_user, status="draft", limit=3, conn=conn
        )
        items: list[HandoverIntelligenceItem] = []
        for draft in drafts.items:
            items.append(
                self.metadata_only_item(
                    item_id=f"draft:{draft.id}",
                    title=draft.title,
                    safe_summary=f"Handover draft in progress ({draft.status}).",
                    section_type="overview",
                    priority="medium",
                    source="handover_draft",
                    route=f"/handover?draft_id={draft.id}",
                    action_label="Open draft",
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    related_id=draft.id,
                    related_type="handover_draft",
                )
            )
        try:
            from services.handover_service import HandoverService

            handover_svc = HandoverService()
            current = handover_svc.current_handover(conn, current_user)
            if current.get("available"):
                shift = current.get("shift") or {}
                summary = current.get("summary") or {}
                items.append(
                    self.metadata_only_item(
                        item_id="shift:current",
                        title="Current shift context",
                        safe_summary=(
                            f"{summary.get('handover_items', 0)} handover item(s); "
                            f"{summary.get('follow_up_items', 0)} follow-up; "
                            f"{summary.get('safeguarding_reviews', 0)} safeguarding review(s)."
                        ),
                        section_type="overview",
                        priority="medium",
                        source="shift_handover",
                        route=routes.current,
                        action_label="Open current handover",
                        metadata={"shift_id": shift.get("id")},
                    )
                )
        except Exception as exc:
            logger.debug("shift_context_skipped: %s", exc)

        return HandoverIntelligenceSection(
            id="overview",
            title="Shift overview",
            section_type="overview",
            summary=f"Preparing handover for {shift_label}.",
            items=items,
            route=routes.handover,
            action_label="Open handover workspace",
        )

    def build_next_shift_priorities(
        self, dashboard: HandoverIntelligenceDashboard
    ) -> HandoverIntelligenceSection:
        items: list[HandoverIntelligenceItem] = []
        for section in dashboard.sections:
            for item in section.items:
                if item.priority in ("urgent", "high"):
                    items.append(item)
        items = items[:12]
        summary = (
            f"{len(items)} priority item(s) flagged for next shift."
            if items
            else "No urgent priorities flagged — review sections before completing handover."
        )
        return HandoverIntelligenceSection(
            id="next_shift_priorities",
            title="Next shift priorities",
            section_type="next_shift_priorities",
            summary=summary,
            items=items,
            route=dashboard.routes.handover,
            action_label="Complete handover draft",
            metadata={"priority_count": len(items)},
        )

    def build_recommendations(
        self, sections: list[HandoverIntelligenceSection]
    ) -> list[str]:
        recs: list[str] = []
        for section in sections:
            if section.section_type == "recording_alerts" and section.metadata.get("urgent"):
                recs.append("Review urgent recording alerts before signing off the shift.")
            if section.section_type == "safeguarding" and section.items:
                recs.append("Include safeguarding network themes in handover without raw narratives.")
            if section.section_type == "reviews" and section.metadata.get("awaiting_review"):
                recs.append("Carry open review queue items into handover.")
        recs.append("Save a handover draft before leaving — completing here is not a formal record.")
        recs.append(MANAGER_JUDGEMENT_NOTICE)
        return recs[:10]

    def build_dashboard(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverIntelligenceDashboard:
        _, _, child_id, home_id = self._list_filters(current_user, filters)
        scope = self.safe_scope_for_user(current_user, child_id=child_id)
        routes = self._routes_for_scope(child_id, home_id)
        shift_label = _text((filters or {}).get("shift_label"), "Current shift")

        overview = self.build_overview_section(
            current_user, shift_label=shift_label, routes=routes, conn=conn
        )
        safeguarding = self.build_isn_section(current_user, filters, conn=conn)
        alerts = self.build_recording_alerts_section(current_user, filters, conn=conn)
        reviews = self.build_reviews_section(current_user, filters, conn=conn)
        actions = self.build_actions_section(current_user, filters, conn=conn)
        child_updates = self.build_child_updates_section(current_user, filters, conn=conn)
        health = self.build_health_medication_section(current_user, filters, conn=conn)
        environment = self.build_environment_section(current_user, filters, conn=conn)

        sections = [
            overview,
            safeguarding,
            alerts,
            reviews,
            actions,
            child_updates,
            health,
            environment,
        ]

        urgent_count = sum(
            1
            for s in sections
            for i in s.items
            if i.priority == "urgent"
        )
        safeguarding_count = len(safeguarding.items) + sum(
            1 for i in alerts.items if i.safeguarding_sensitive
        )
        review_count = reviews.metadata.get("total_in_queue") or len(reviews.items)
        action_count = actions.metadata.get("proposed_count") or len(actions.items)
        recording_alert_count = alerts.metadata.get("total_open") or len(alerts.items)
        isn_count = safeguarding.metadata.get("urgent") or len(safeguarding.items)

        dashboard = HandoverIntelligenceDashboard(
            generated_at=_now_iso(),
            scope=scope,
            shift_label=shift_label,
            home_id=home_id,
            child_id=child_id,
            summary=(
                f"{urgent_count} urgent handover signal(s); "
                f"{recording_alert_count} recording alert(s); "
                f"{review_count} review item(s) in scope."
            ),
            sections=sections,
            urgent_count=urgent_count,
            safeguarding_count=int(safeguarding_count),
            review_count=int(review_count) if isinstance(review_count, int) else len(reviews.items),
            action_count=int(action_count) if isinstance(action_count, int) else len(actions.items),
            recording_alert_count=int(recording_alert_count)
            if isinstance(recording_alert_count, int)
            else len(alerts.items),
            isn_count=int(isn_count) if isinstance(isn_count, int) else len(safeguarding.items),
            privacy_notice=PRIVACY_NOTICE,
            limitations=[LIMITATION_NOTICE],
            orb_prompts=ORB_PROMPTS,
            routes=routes,
            metadata={"no_raw_body": True, "metadata_only": True},
        )
        dashboard.sections.append(self.build_next_shift_priorities(dashboard))
        dashboard.recommendations = self.build_recommendations(dashboard.sections)
        return dashboard


handover_intelligence_service = HandoverIntelligenceService()

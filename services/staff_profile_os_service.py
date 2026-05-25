"""Staff Profile OS — unified adult working-life dashboard from existing workforce services."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.staff_profile_os import (
    StaffProfileOsDashboard,
    StaffProfileOsFilters,
    StaffProfileOsHealth,
    StaffProfileOsItem,
    StaffProfileOsOverview,
    StaffProfileOsRoutes,
    StaffProfileOsSection,
    StaffProfileOsSectionType,
    StaffProfileOsSensitivity,
)

logger = logging.getLogger("indicare.staff_profile_os")

PRIVACY_NOTICE = (
    "This profile uses safe operational summaries. Confidential HR, supervision and wellbeing "
    "details remain in permissioned areas."
)

LIMITATION_NOTICE = (
    "Some workforce data may be unavailable until operational migrations are applied. "
    "Use linked routes to verify manually."
)

ORB_PROMPTS = [
    {
        "label": "Help me review this staff member's work priorities.",
        "mode": "manager_daily_brief",
        "query": "Help me review this staff member's work priorities using safe operational summaries.",
    },
    {
        "label": "What support should I consider for this staff member?",
        "mode": "manager_daily_brief",
        "query": "What support should I consider for this staff member without confidential detail?",
    },
    {
        "label": "Help me prepare a supervision discussion.",
        "mode": "manager_daily_brief",
        "query": "Help me prepare a supervision discussion using safe metadata only.",
    },
    {
        "label": "What training or development follow-up is showing?",
        "mode": "manager_daily_brief",
        "query": "What training or development follow-up indicators are showing?",
    },
    {
        "label": "What should be carried into handover?",
        "mode": "manager_daily_brief",
        "query": "What should be carried into handover for this staff member's responsibilities?",
    },
]

_RAW_BODY_PATTERN = re.compile(
    r"(description|narrative|body|notes|reflection|review_note|supervision_text|journal_summary)\s*[:=]",
    re.IGNORECASE,
)

_FORBIDDEN_SUMMARY_KEYS = frozenset(
    {
        "notes",
        "reflection",
        "journal_summary",
        "narrative",
        "description",
        "body",
        "review_note",
        "supervision_text",
        "wellbeing_narrative",
        "medical",
        "disciplinary",
    }
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> int | None:
    try:
        return int(current_user.get("id") or current_user.get("user_id"))
    except (TypeError, ValueError):
        return None


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
    for key in _FORBIDDEN_SUMMARY_KEYS:
        if re.search(rf"\b{key}\b", cleaned, re.IGNORECASE) and len(cleaned) > 60:
            cleaned = "Metadata summary available — open linked route for detail."
            break
    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 3].rstrip() + "..."
    return cleaned


class StaffProfileOsService:
    def route_hints(self, staff_id: int) -> StaffProfileOsRoutes:
        sid = str(staff_id)
        return StaffProfileOsRoutes(
            profile=f"/staff/{sid}",
            training_matrix=f"/staff/training-matrix?staff_id={sid}",
            supervision=f"/staff/supervision?staff_id={sid}",
            probation=f"/staff/probation?staff_id={sid}",
            induction=f"/staff/induction?staff_id={sid}",
            wellbeing=f"/staff/wellbeing?staff_id={sid}",
            recruitment=f"/staff/safer-recruitment?staff_id={sid}",
            chronology=f"/staff/{sid}/chronology",
            workforce_journey=f"/staff/{sid}",
            orb="/assistant/orb?mode=manager_daily_brief",
        )

    def safe_item(
        self,
        *,
        item_id: str,
        title: str,
        safe_summary: str,
        section_type: StaffProfileOsSectionType,
        route: str,
        sensitivity: StaffProfileOsSensitivity = "public_operational",
        priority: str = "medium",
        action_label: str | None = None,
        related_id: str | None = None,
        related_type: str | None = None,
        due_at: str | None = None,
        status: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> StaffProfileOsItem:
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"
        return StaffProfileOsItem(
            id=item_id,
            title=title,
            safe_summary=_sanitize_summary(safe_summary),
            section_type=section_type,
            sensitivity=sensitivity,
            priority=priority,
            route=route,
            action_label=action_label,
            related_id=related_id,
            related_type=related_type,
            due_at=due_at,
            status=status,
            metadata={**(metadata or {}), "no_raw_body": True, "metadata_only": True},
        )

    def enforce_access(self, staff_id: int, current_user: dict[str, Any]) -> None:
        current_id = _user_id(current_user)
        if current_id is not None and staff_id == current_id:
            return
        if _is_manager_view(current_user):
            return
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this staff profile.",
        )

    def get_health(self, conn: Any | None = None) -> StaffProfileOsHealth:
        journey_ok = False
        shift_ok = False
        if conn is not None:
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                WorkforceJourneyService().feature_flags()
                journey_ok = True
            except Exception:
                journey_ok = False
            try:
                from repositories.shift_repository import ShiftRepository

                shift_ok = ShiftRepository().current_shift(conn, {"home_id": None}) is not None
            except Exception:
                shift_ok = False
        return StaffProfileOsHealth(
            status="ok",
            workforce_journey_available=journey_ok,
            shift_data_available=shift_ok,
            storage_mode="postgresql" if conn is not None else "memory",
        )

    def _staff_row(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None,
    ) -> dict[str, Any] | None:
        if conn is not None:
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                journey = WorkforceJourneyService()
                row = journey._staff_by_id(conn, staff_id, current_user)
                if row:
                    return row
            except Exception as exc:
                logger.debug("staff_row_journey_degraded: %s", exc)
        if _user_id(current_user) == staff_id:
            return {
                "id": staff_id,
                "email": current_user.get("email"),
                "role": current_user.get("role"),
                "home_id": current_user.get("home_id"),
                "first_name": current_user.get("first_name"),
                "last_name": current_user.get("last_name"),
                "full_name": current_user.get("full_name")
                or " ".join(
                    [
                        _text(current_user.get("first_name")),
                        _text(current_user.get("last_name")),
                    ]
                ).strip()
                or current_user.get("email"),
                "is_active": True,
            }
        return None

    def _staff_name(self, row: dict[str, Any]) -> str:
        name = _text(row.get("full_name"))
        if not name:
            name = " ".join([_text(row.get("first_name")), _text(row.get("last_name"))]).strip()
        return name or _text(row.get("email"), "Staff member")

    def build_overview(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsOverview:
        routes = self.route_hints(staff_id)
        row = self._staff_row(staff_id, current_user, conn)
        if not row:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")
        badges: list[str] = []
        warnings: list[str] = []
        role = _text(row.get("role"), "staff")
        home_id = _safe_int(row.get("home_id"))
        employment_status = (
            "inactive" if row.get("is_active") is False or row.get("archived") is True else "active"
        )
        if employment_status == "inactive":
            badges.append("Inactive")
        if _is_manager_view(current_user):
            badges.append("Manager view")
        elif _user_id(current_user) == staff_id:
            badges.append("My profile")

        shift_label: str | None = None
        shift_role: str | None = None
        if conn is not None:
            try:
                from services.workforce_context_service import workforce_context_service

                shift = workforce_context_service.build_shift_context(current_user, conn=conn)
                if shift.shift_lead_id == staff_id:
                    shift_role = "shift_lead"
                    shift_label = shift.shift_label
                    badges.append("Shift lead")
                elif staff_id and any(
                    str(staff_id) in name for name in (shift.staff_on_shift or [])
                ):
                    shift_label = shift.shift_label
            except Exception as exc:
                logger.debug("overview_shift_degraded: %s", exc)
                warnings.append("Shift context temporarily unavailable.")

        return StaffProfileOsOverview(
            staff_id=staff_id,
            staff_name=self._staff_name(row),
            role=role,
            home_id=home_id,
            home_name=f"Home {home_id}" if home_id else None,
            employment_status=employment_status,
            shift_label=shift_label,
            shift_role=shift_role,
            profile_route=routes.profile,
            badges=badges,
            warnings=warnings,
            metadata={"no_raw_body": True, "metadata_only": True},
        )

    def build_shift_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        warnings: list[str] = []
        summary = "Shift context for this staff member."
        if conn is None:
            warnings.append(LIMITATION_NOTICE)
            items.append(
                self.safe_item(
                    item_id="shift:route",
                    title="Current shift",
                    safe_summary="Open shifts area to verify shift assignment.",
                    section_type="shift_context",
                    route=routes.shifts,
                    action_label="Open current shift",
                )
            )
            return StaffProfileOsSection(
                id="shift_context",
                title="Today / shift context",
                section_type="shift_context",
                summary=summary,
                items=items,
                warnings=warnings,
                route=routes.shifts,
                action_label="Open shifts",
            )
        try:
            from services.workforce_context_service import workforce_context_service

            shift = workforce_context_service.build_shift_context(current_user, conn=conn)
            if shift.shift_lead_id == staff_id:
                items.append(
                    self.safe_item(
                        item_id="shift:lead",
                        title="Shift lead",
                        safe_summary=f"Assigned as shift lead for {shift.shift_label}.",
                        section_type="shift_context",
                        route=routes.shifts,
                        action_label="Open current shift",
                        related_id=str(shift.shift_id) if shift.shift_id else None,
                        related_type="shift",
                        status="shift_lead",
                    )
                )
            history_count = 0
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                profile = WorkforceJourneyService().staff_profile(
                    conn, staff_id=staff_id, current_user=current_user
                )
                history_count = len(profile.get("shift_history") or [])
            except Exception:
                history_count = 0
            if history_count:
                items.append(
                    self.safe_item(
                        item_id="shift:history",
                        title="Shift history",
                        safe_summary=f"{history_count} roster assignment(s) on record.",
                        section_type="shift_context",
                        route=routes.rota,
                        action_label="Open rota",
                        metadata={"shift_history_count": history_count},
                    )
                )
            if shift.gaps:
                warnings.extend(shift.gaps[:2])
            summary = (
                f"{shift.shift_label}: "
                + (
                    "shift lead assigned."
                    if shift.shift_lead_id == staff_id
                    else f"{shift.staff_count} staff on shift."
                )
            )
        except Exception as exc:
            logger.debug("shift_section_degraded: %s", exc)
            warnings.append("Shift context temporarily unavailable.")
            items.append(
                self.safe_item(
                    item_id="shift:hint",
                    title="Rota and shifts",
                    safe_summary="Open rota to verify shift assignment for this staff member.",
                    section_type="shift_context",
                    route=routes.rota,
                    action_label="Open rota",
                )
            )
        if not items:
            items.append(
                self.safe_item(
                    item_id="shift:unavailable",
                    title="Shift context",
                    safe_summary="No shift signals in safe summary — open shifts or rota to verify.",
                    section_type="shift_context",
                    route=routes.shifts,
                    priority="low",
                )
            )
        return StaffProfileOsSection(
            id="shift_context",
            title="Today / shift context",
            section_type="shift_context",
            summary=summary,
            items=items,
            warnings=warnings,
            route=routes.shifts,
            action_label="Open shifts",
        )

    def build_actions_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        staff_name = self._staff_name(self._staff_row(staff_id, current_user, conn) or {})
        try:
            from services.intelligence_action_service import intelligence_action_service

            home_key = str(current_user.get("home_id")) if current_user.get("home_id") is not None else None
            feed = intelligence_action_service.build_attention_feed(home_id=home_key, conn=conn)
            for entry in (feed.urgent + feed.high_priority + feed.follow_ups_due)[:8]:
                owner = _text(getattr(entry, "owner_name", None) or getattr(entry, "assigned_to", None))
                owner_id = _safe_int(getattr(entry, "owner_id", None) or getattr(entry, "assigned_to_id", None))
                if owner_id and owner_id != staff_id:
                    if owner and staff_name.lower() not in owner.lower():
                        continue
                elif owner and staff_name and staff_name.lower() not in owner.lower() and owner_id is None:
                    continue
                items.append(
                    self.safe_item(
                        item_id=f"action:{entry.id}",
                        title=entry.title,
                        safe_summary=_sanitize_summary(
                            (f"Assigned to {owner}. " if owner else "")
                            + (entry.summary or "Action metadata.")
                        ),
                        section_type="actions",
                        route=_text(entry.href, routes.actions),
                        action_label="Open action",
                        priority=_text(entry.priority, "medium"),
                        related_id=str(entry.id),
                        related_type="intelligence_action",
                        status=_text(getattr(entry, "status", None), None),
                    )
                )
        except Exception as exc:
            logger.debug("actions_section_degraded: %s", exc)
        if not items:
            items.append(
                self.safe_item(
                    item_id="actions:route",
                    title="Assigned actions",
                    safe_summary="Open actions area to review intelligence actions for this staff member.",
                    section_type="actions",
                    route=routes.actions,
                    action_label="Open actions",
                    priority="low",
                )
            )
        return StaffProfileOsSection(
            id="actions",
            title="Assigned actions",
            section_type="actions",
            summary=f"{len(items)} action signal(s) in safe summary.",
            items=items[:10],
            route=routes.actions,
            action_label="Open actions",
            metadata={"action_count": len(items)},
        )

    def build_recording_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        count = 0
        score: str | None = None
        if conn is not None:
            try:
                from services.workforce_intelligence_service import WorkforceIntelligenceService
                from services.workforce_journey_service import WorkforceJourneyService

                quality = WorkforceIntelligenceService(WorkforceJourneyService()).recording_quality(
                    conn, current_user=current_user, staff_id=staff_id
                )
                scores = quality.get("staff_scores") or []
                if scores:
                    top = scores[0] if isinstance(scores[0], dict) else {}
                    score = _text(top.get("score") or top.get("average_score"), None)
                profile = WorkforceJourneyService().staff_profile(
                    conn, staff_id=staff_id, current_user=current_user
                )
                count = len(profile.get("recording_history") or [])
            except Exception as exc:
                logger.debug("recording_section_degraded: %s", exc)
        if score:
            items.append(
                self.safe_item(
                    item_id="recording:quality",
                    title="Recording quality",
                    safe_summary=f"Practice quality score {score} in safe summary.",
                    section_type="recording",
                    route=f"/staff/recording-quality?staff_id={staff_id}",
                    action_label="Open recording quality",
                )
            )
        if count:
            items.append(
                self.safe_item(
                    item_id="recording:history",
                    title="Recording contribution",
                    safe_summary=f"{count} recording quality review(s) linked to this staff member.",
                    section_type="recording",
                    route=f"/staff/recording-quality?staff_id={staff_id}",
                    metadata={"recording_history_count": count},
                )
            )
        if not items:
            items.append(
                self.safe_item(
                    item_id="recording:route",
                    title="Recording contribution",
                    safe_summary="Open recording quality area for practice signals linked to this staff member.",
                    section_type="recording",
                    route=f"/staff/recording-quality?staff_id={staff_id}",
                    action_label="Open recording quality",
                    priority="low",
                )
            )
        return StaffProfileOsSection(
            id="recording",
            title="Recording and handover contribution",
            section_type="recording",
            summary="Safe recording practice indicators — not full record bodies.",
            items=items,
            route=f"/staff/recording-quality?staff_id={staff_id}",
            action_label="Open recording quality",
        )

    def build_handover_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        row = self._staff_row(staff_id, current_user, conn) or {}
        name = self._staff_name(row)
        items.append(
            self.safe_item(
                item_id="handover:responsibility",
                title="Handover responsibility",
                safe_summary=f"Carry {name}'s assigned actions and shift responsibilities into handover where relevant.",
                section_type="handover",
                route=routes.handover,
                action_label="Open handover",
            )
        )
        if conn is not None:
            try:
                from services.workforce_context_service import workforce_context_service

                shift = workforce_context_service.build_shift_context(current_user, conn=conn)
                if shift.shift_lead_id == staff_id:
                    items.append(
                        self.safe_item(
                            item_id="handover:shift_lead",
                            title="Shift lead handover",
                            safe_summary=f"{name} is shift lead — include leadership priorities in handover.",
                            section_type="handover",
                            route=routes.handover,
                            priority="high",
                            related_id=str(shift.shift_id) if shift.shift_id else None,
                            related_type="shift",
                        )
                    )
            except Exception as exc:
                logger.debug("handover_section_shift_degraded: %s", exc)
        return StaffProfileOsSection(
            id="handover",
            title="Handover responsibility",
            section_type="handover",
            summary=f"{len(items)} handover signal(s).",
            items=items,
            route=routes.handover,
            action_label="Open handover",
            metadata={"handover_items_count": len(items)},
        )

    def build_training_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        due = expired = missing = 0
        qual_count = 0
        if conn is not None:
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                journey = WorkforceJourneyService()
                training = journey.training_matrix(conn, current_user=current_user, staff_id=staff_id)
                summary = training.get("summary") or {}
                due = int(summary.get("due") or 0)
                expired = int(summary.get("expired") or 0)
                missing = int(summary.get("missing") or 0)
                profile = journey.staff_profile(conn, staff_id=staff_id, current_user=current_user)
                qual_count = len(profile.get("qualifications") or [])
            except Exception as exc:
                logger.debug("training_section_degraded: %s", exc)
        total = due + expired + missing
        if total:
            items.append(
                self.safe_item(
                    item_id="training:matrix",
                    title="Training matrix",
                    safe_summary=f"{due} due, {expired} expired, {missing} missing training signal(s).",
                    section_type="training",
                    route=routes.training_matrix,
                    action_label="Open training matrix",
                    priority="high" if expired else "medium",
                    sensitivity="manager_only" if _is_manager_view(current_user) else "public_operational",
                    metadata={"due": due, "expired": expired, "missing": missing},
                )
            )
        if qual_count:
            items.append(
                self.safe_item(
                    item_id="training:qualifications",
                    title="Qualifications",
                    safe_summary=f"{qual_count} qualification record(s) on file.",
                    section_type="training",
                    route=routes.profile,
                    action_label="Open profile detail",
                    sensitivity="hr_sensitive",
                    metadata={"qualification_count": qual_count},
                )
            )
        else:
            items.append(
                self.safe_item(
                    item_id="training:qualifications_hint",
                    title="Qualifications",
                    safe_summary="Open profile detail for qualification records.",
                    section_type="training",
                    route=routes.profile,
                    sensitivity="hr_sensitive",
                    priority="low",
                )
            )
        if not total:
            items.insert(
                0,
                self.safe_item(
                    item_id="training:ok",
                    title="Training indicators",
                    safe_summary="No elevated training due signals in safe summary.",
                    section_type="training",
                    route=routes.training_matrix,
                    priority="low",
                ),
            )
        return StaffProfileOsSection(
            id="training",
            title="Training and qualifications",
            section_type="training",
            summary=f"{total} training follow-up signal(s); {qual_count} qualification record(s).",
            items=items,
            route=routes.training_matrix,
            action_label="Open training matrix",
            metadata={"training_due_count": total},
        )

    def build_supervision_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        record_count = 0
        open_count = 0
        if conn is not None and (_is_manager_view(current_user) or _user_id(current_user) == staff_id):
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                supervision = WorkforceJourneyService().list_supervision(
                    conn, current_user=current_user, staff_id=staff_id
                )
                records = supervision.get("records") or []
                record_count = len(records)
                for rec in records:
                    status = _text(rec.get("status"), "recorded").lower()
                    if status in {"draft", "submitted", "returned", "open"}:
                        open_count += 1
            except Exception as exc:
                logger.debug("supervision_section_degraded: %s", exc)
        if record_count:
            items.append(
                self.safe_item(
                    item_id="supervision:records",
                    title="Supervision records",
                    safe_summary=f"{record_count} supervision record(s); {open_count} may need review.",
                    section_type="supervision",
                    route=routes.supervision,
                    action_label="Open supervision",
                    sensitivity="hr_sensitive",
                    metadata={"record_count": record_count, "open_count": open_count},
                )
            )
        else:
            items.append(
                self.safe_item(
                    item_id="supervision:route",
                    title="Supervision",
                    safe_summary="Open supervision area for reflective practice records and workflow status.",
                    section_type="supervision",
                    route=routes.supervision,
                    action_label="Open supervision",
                    sensitivity="hr_sensitive",
                    priority="low",
                )
            )
        return StaffProfileOsSection(
            id="supervision",
            title="Supervision and support",
            section_type="supervision",
            summary=f"{record_count} supervision record(s) — statuses only, no notes in cards.",
            items=items,
            route=routes.supervision,
            action_label="Open supervision",
            metadata={"supervision_due_count": open_count},
        )

    def build_probation_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        review_count = 0
        if conn is not None:
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                probation = WorkforceJourneyService().probation(
                    conn, current_user=current_user, staff_id=staff_id
                )
                review_count = len(probation.get("reviews") or [])
            except Exception as exc:
                logger.debug("probation_section_degraded: %s", exc)
        if review_count:
            items.append(
                self.safe_item(
                    item_id="probation:reviews",
                    title="Probation reviews",
                    safe_summary=f"{review_count} probation review(s) on record.",
                    section_type="probation",
                    route=routes.probation,
                    action_label="Open probation",
                    sensitivity="manager_only",
                    metadata={"review_count": review_count},
                )
            )
        else:
            items.append(
                self.safe_item(
                    item_id="probation:route",
                    title="Probation / development",
                    safe_summary="Open probation area for review milestones and support actions.",
                    section_type="probation",
                    route=routes.probation,
                    action_label="Open probation",
                    priority="low",
                )
            )
        return StaffProfileOsSection(
            id="probation",
            title="Probation / development",
            section_type="probation",
            summary=f"{review_count} probation review(s) in safe summary.",
            items=items,
            route=routes.probation,
            action_label="Open probation",
            metadata={"probation_review_count": review_count},
        )

    def build_wellbeing_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        flag_count = 0
        if conn is not None and _is_manager_view(current_user):
            try:
                from services.workforce_journey_service import WorkforceJourneyService

                profile = WorkforceJourneyService().staff_profile(
                    conn, staff_id=staff_id, current_user=current_user
                )
                flag_count = len(profile.get("wellbeing") or [])
            except Exception as exc:
                logger.debug("wellbeing_section_degraded: %s", exc)
        if flag_count:
            items.append(
                self.safe_item(
                    item_id="wellbeing:flags",
                    title="Wellbeing signals",
                    safe_summary=f"{flag_count} wellbeing check-in signal(s) — open permissioned area for detail.",
                    section_type="wellbeing",
                    route=routes.wellbeing,
                    action_label="Open wellbeing",
                    sensitivity="confidential",
                    metadata={"wellbeing_flags_count": flag_count, "summary_only": True},
                )
            )
        else:
            items.append(
                self.safe_item(
                    item_id="wellbeing:route",
                    title="Wellbeing / support",
                    safe_summary="Wellbeing detail is confidential — use permissioned wellbeing routes.",
                    section_type="wellbeing",
                    route=routes.wellbeing,
                    action_label="Open wellbeing area",
                    sensitivity="confidential",
                    priority="low",
                    metadata={"summary_only": True},
                )
            )
        return StaffProfileOsSection(
            id="wellbeing",
            title="Wellbeing / support",
            section_type="wellbeing",
            summary=f"{flag_count} wellbeing flag(s) in safe metadata.",
            items=items,
            route=routes.wellbeing,
            action_label="Open wellbeing",
            metadata={"wellbeing_flags_count": flag_count},
        )

    def build_workforce_journey_section(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> StaffProfileOsSection:
        routes = self.route_hints(staff_id)
        items: list[StaffProfileOsItem] = []
        event_count = 0
        if conn is not None:
            try:
                from services.workforce_intelligence_service import WorkforceIntelligenceService
                from services.workforce_journey_service import WorkforceJourneyService

                chronology = WorkforceIntelligenceService(WorkforceJourneyService()).chronology(
                    conn, current_user=current_user, staff_id=staff_id, limit=20
                )
                event_count = int((chronology.get("summary") or {}).get("total") or len(chronology.get("events") or []))
            except Exception as exc:
                logger.debug("journey_section_degraded: %s", exc)
        items.append(
            self.safe_item(
                item_id="journey:chronology",
                title="Workforce journey",
                safe_summary=(
                    f"{event_count} chronology event(s) in workforce journey."
                    if event_count
                    else "Open workforce chronology for lifecycle and practice events."
                ),
                section_type="workforce_journey",
                route=routes.chronology,
                action_label="Open chronology",
                metadata={"event_count": event_count},
            )
        )
        if conn is not None:
            try:
                from services.workforce_pressure_service import workforce_pressure_service

                pressure = workforce_pressure_service.build(conn, current_user=current_user)
                state = _text((pressure.get("operational_staffing_pressure") or {}).get("state"), "manageable")
                if state in {"high", "critical"}:
                    items.append(
                        self.safe_item(
                            item_id="journey:pressure",
                            title="Workforce pressure",
                            safe_summary=f"Home workforce pressure is {state} — manager review recommended.",
                            section_type="workforce_journey",
                            route="/staff/risk",
                            action_label="Open workforce risk",
                            priority="high" if state == "critical" else "medium",
                            sensitivity="manager_only",
                        )
                    )
            except Exception as exc:
                logger.debug("journey_pressure_degraded: %s", exc)
        return StaffProfileOsSection(
            id="workforce_journey",
            title="Workforce journey",
            section_type="workforce_journey",
            summary=f"{event_count} journey event(s) in safe summary.",
            items=items,
            route=routes.chronology,
            action_label="Open chronology",
        )

    def build_manager_prompts(
        self,
        dashboard: StaffProfileOsDashboard,
        current_user: dict[str, Any],
    ) -> list[StaffProfileOsItem]:
        if not _is_manager_view(current_user):
            return []
        prompts: list[StaffProfileOsItem] = []
        routes = dashboard.routes
        if dashboard.training_due_count:
            prompts.append(
                self.safe_item(
                    item_id="prompt:training",
                    title="Training follow-up",
                    safe_summary=f"{dashboard.training_due_count} training signal(s) may need manager follow-up.",
                    section_type="manager_prompts",
                    route=routes.training_matrix,
                    priority="medium",
                    sensitivity="manager_only",
                )
            )
        if dashboard.supervision_due_count:
            prompts.append(
                self.safe_item(
                    item_id="prompt:supervision",
                    title="Supervision review",
                    safe_summary=f"{dashboard.supervision_due_count} supervision record(s) may need review.",
                    section_type="manager_prompts",
                    route=routes.supervision,
                    priority="medium",
                    sensitivity="manager_only",
                )
            )
        if dashboard.action_count:
            prompts.append(
                self.safe_item(
                    item_id="prompt:actions",
                    title="Staff actions",
                    safe_summary=f"{dashboard.action_count} action signal(s) assigned or linked to this staff member.",
                    section_type="manager_prompts",
                    route=routes.actions,
                    priority="high",
                )
            )
        return prompts

    def build_recommendations(self, dashboard: StaffProfileOsDashboard) -> list[str]:
        recs: list[str] = []
        if dashboard.training_due_count:
            recs.append("Review training matrix for due or expired competence.")
        if dashboard.supervision_due_count:
            recs.append("Review supervision workflow status in the supervision area.")
        if dashboard.probation_review_count:
            recs.append("Confirm probation milestones are scheduled.")
        if dashboard.action_count:
            recs.append("Carry assigned actions into handover where relevant.")
        if dashboard.wellbeing_flags_count:
            recs.append("Use permissioned wellbeing routes for confidential support detail.")
        recs.append("Use Ask OS ORB for operational support — no staff identifiers in the URL.")
        return recs[:10]

    def build_dashboard(
        self,
        staff_id: int,
        current_user: dict[str, Any],
        filters: StaffProfileOsFilters | None = None,
        conn: Any | None = None,
    ) -> StaffProfileOsDashboard:
        self.enforce_access(staff_id, current_user)
        _ = filters
        limitations: list[str] = []
        if conn is None:
            limitations.append(LIMITATION_NOTICE)

        overview = self.build_overview(staff_id, current_user, conn=conn)
        routes = self.route_hints(staff_id)
        sections = [
            self.build_shift_section(staff_id, current_user, conn=conn),
            self.build_actions_section(staff_id, current_user, conn=conn),
            self.build_recording_section(staff_id, current_user, conn=conn),
            self.build_handover_section(staff_id, current_user, conn=conn),
            self.build_training_section(staff_id, current_user, conn=conn),
            self.build_supervision_section(staff_id, current_user, conn=conn),
            self.build_probation_section(staff_id, current_user, conn=conn),
            self.build_wellbeing_section(staff_id, current_user, conn=conn),
            self.build_workforce_journey_section(staff_id, current_user, conn=conn),
        ]

        training_meta = sections[4].metadata or {}
        supervision_meta = sections[5].metadata or {}
        probation_meta = sections[6].metadata or {}
        wellbeing_meta = sections[7].metadata or {}
        handover_meta = sections[3].metadata or {}

        dashboard = StaffProfileOsDashboard(
            generated_at=_now_iso(),
            staff_id=staff_id,
            overview=overview,
            sections=sections,
            action_count=int((sections[1].metadata or {}).get("action_count") or len(sections[1].items)),
            training_due_count=int(training_meta.get("training_due_count") or 0),
            supervision_due_count=int(supervision_meta.get("supervision_due_count") or 0),
            probation_review_count=int(probation_meta.get("probation_review_count") or 0),
            wellbeing_flags_count=int(wellbeing_meta.get("wellbeing_flags_count") or 0),
            handover_items_count=int(handover_meta.get("handover_items_count") or len(sections[3].items)),
            privacy_notice=PRIVACY_NOTICE,
            limitations=limitations,
            orb_prompts=ORB_PROMPTS,
            routes=routes,
            metadata={"no_raw_body": True, "metadata_only": True},
        )
        manager_section = StaffProfileOsSection(
            id="manager_prompts",
            title="Manager prompts",
            section_type="manager_prompts",
            summary="Safe manager oversight prompts — not HR narratives.",
            items=self.build_manager_prompts(dashboard, current_user),
            route=routes.supervision,
            action_label="Open supervision",
        )
        if manager_section.items:
            dashboard.sections.append(manager_section)
        dashboard.recommendations = self.build_recommendations(dashboard)
        return dashboard


staff_profile_os_service = StaffProfileOsService()

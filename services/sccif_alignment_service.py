"""SCCIF and Quality Standards alignment service — aggregates safe metadata evidence."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.recording_alerts import RecordingAlertListFilters
from schemas.recording_drafts import RecordingDraftListRequest
from schemas.recording_governance import RecordingGovernanceFilters
from schemas.recording_review import RecordingReviewQueueFilters
from schemas.sccif_alignment import (
    EvidenceRisk,
    EvidenceStrength,
    QualityStandardArea,
    SccifAlignmentDashboard,
    SccifAlignmentFilters,
    SccifAlignmentHealth,
    SccifAlignmentRoutes,
    SccifEvidenceGap,
    SccifEvidenceItem,
    SccifJudgementArea,
    SccifJudgementSummary,
    SccifQualityStandardSummary,
)
from services.sccif_alignment_registry_service import (
    ORB_ALIGNMENT_PROMPTS,
    sccif_alignment_registry_service,
)

logger = logging.getLogger("indicare.sccif_alignment")

ALIGNMENT_VIEW_ROLES = MANAGER_ROLES | {
    "senior",
    "senior_practitioner",
    "senior_worker",
    "deputy",
    "registered_manager_deputy",
}

LIMITATIONS = [
    "Alignment maps operational metadata to SCCIF and Quality Standards — not formal inspection grades.",
    "Draft records are not treated as completed inspection evidence.",
    "Raw record bodies, safeguarding narratives and HR detail are not shown in this layer.",
    "Professional judgement and statutory responsibilities remain required.",
    "Import official SCCIF and Quality Standards sources in Knowledge Library for exact citations.",
]

PRIVACY_NOTICE = (
    "This alignment layer uses metadata, flags and safe summaries only. "
    "It does not display full raw record bodies. Not a compliance decision."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _draft_strength(status: str | None, review_required: bool) -> EvidenceStrength:
    status_l = _text(status).lower()
    if status_l in {"draft", "in_progress", "autosaved"}:
        return "prompt_only"
    if review_required or status_l in {"awaiting_review", "changes_requested"}:
        return "partial_evidence"
    if status_l in {"submitted", "approved", "completed"}:
        return "strong_evidence"
    return "partial_evidence"


def _risk_from_flags(
    *,
    urgent: bool = False,
    safeguarding: bool = False,
    manager_review: bool = False,
) -> EvidenceRisk:
    if safeguarding and urgent:
        return "urgent"
    if safeguarding or urgent:
        return "high"
    if manager_review:
        return "medium"
    return "low"


class SccifAlignmentService:
    def enforce_access(self, current_user: dict[str, Any]) -> bool:
        role = _user_role(current_user)
        return role in {r.lower() for r in ALIGNMENT_VIEW_ROLES} or any(
            token in role for token in ("manager", "deputy", "senior", "registered", "admin")
        )

    def get_health(self, conn: Any | None = None) -> SccifAlignmentHealth:
        _ = conn
        return SccifAlignmentHealth(
            status="ok",
            sources_available=[
                "recording_governance",
                "recording_alerts",
                "recording_review",
                "handover_intelligence",
                "isn_digest",
                "workforce_context",
                "staff_profile_os",
                "manager_daily_brief",
                "os_notifications",
            ],
            limitations=LIMITATIONS[:3],
        )

    def safe_evidence_item(
        self,
        *,
        item_id: str,
        title: str,
        safe_summary: str,
        source_module: str,
        route: str,
        recording_type: str | None = None,
        action_label: str | None = None,
        evidence_strength: EvidenceStrength | None = None,
        risk: EvidenceRisk = "low",
        child_id: int | None = None,
        staff_id: str | None = None,
        home_id: int | None = None,
        related_id: str | None = None,
        related_type: str | None = None,
        draft_status: str | None = None,
        review_required: bool = False,
        manager_review_required: bool = False,
        safeguarding_review_required: bool = False,
        privacy_sensitive: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> SccifEvidenceItem:
        mapping = sccif_alignment_registry_service.map_source_to_alignment(
            source_module, recording_type
        )
        strength = evidence_strength or mapping.get("strength") or "partial_evidence"
        if draft_status and _draft_strength(draft_status, review_required) == "prompt_only":
            strength = "prompt_only"
        return SccifEvidenceItem(
            id=item_id,
            title=title,
            safe_summary=safe_summary,
            source_module=source_module,
            route=route,
            action_label=action_label,
            judgement_areas=list(mapping.get("judgement_areas") or []),
            quality_standards=list(mapping.get("quality_standards") or []),
            evidence_strength=strength,
            risk=risk,
            child_id=child_id,
            staff_id=staff_id,
            home_id=home_id,
            related_id=related_id,
            related_type=related_type,
            draft_status=draft_status,
            review_required=review_required,
            manager_review_required=manager_review_required,
            safeguarding_review_required=safeguarding_review_required,
            privacy_sensitive=privacy_sensitive,
            official_source_refs=sccif_alignment_registry_service.official_source_refs(),
            metadata={**(metadata or {}), "no_raw_body": True, "evidence_support_only": True},
        )

    def collect_recording_evidence(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> list[SccifEvidenceItem]:
        items: list[SccifEvidenceItem] = []
        try:
            from services.recording_draft_service import recording_draft_service
            from services.recording_governance_service import recording_governance_service

            gov_filters = RecordingGovernanceFilters(
                child_id=filters.child_id if filters else None,
                home_id=filters.home_id if filters else None,
                limit=min(filters.limit if filters else 50, 50),
            )
            gov = recording_governance_service.build_dashboard(
                current_user, gov_filters, conn=conn
            )
            for card in (gov.summary_cards or [])[:6]:
                items.append(
                    self.safe_evidence_item(
                        item_id=f"gov:{card.id}",
                        title=card.title,
                        safe_summary=_text(card.description, f"Governance metric: {card.label}."),
                        source_module="recording_governance",
                        route=card.route or "/record/governance",
                        action_label="Open governance",
                        evidence_strength="partial_evidence",
                        metadata={"metric_value": card.value},
                    )
                )

            drafts_response = recording_draft_service.list_drafts(
                current_user,
                RecordingDraftListRequest(limit=min(filters.limit if filters else 30, 30)),
                conn=conn,
            )
            for draft in drafts_response.items[:20]:
                if filters and filters.child_id and draft.child_id != filters.child_id:
                    continue
                rt = _text(draft.recording_type, "recording")
                status = _text(draft.status, "draft")
                items.append(
                    self.safe_evidence_item(
                        item_id=f"draft:{draft.id}",
                        title=_text(draft.title, "Recording draft"),
                        safe_summary=(
                            f"{rt.replace('-', ' ')} — status {status}. "
                            "Evidence aligned to Quality Standards may support oversight; "
                            "drafts are not inspection proof."
                        ),
                        source_module="recording_drafts",
                        route=f"/record/drafts/{draft.id}",
                        recording_type=rt,
                        action_label="Open draft",
                        draft_status=status,
                        review_required=bool(draft.review_required),
                        manager_review_required=bool(draft.manager_review_required),
                        safeguarding_review_required=bool(draft.safeguarding_review_required),
                        privacy_sensitive=bool(draft.safeguarding_sensitive),
                        child_id=draft.child_id,
                        risk=_risk_from_flags(
                            urgent=_text(draft.priority) == "urgent",
                            safeguarding=bool(draft.safeguarding_review_required or draft.safeguarding_sensitive),
                            manager_review=bool(draft.manager_review_required),
                        ),
                    )
                )
        except Exception as exc:
            logger.debug("sccif_recording_evidence_skipped: %s", exc)

        try:
            from services.recording_alert_service import recording_alert_service

            digest = recording_alert_service.build_digest(
                current_user,
                RecordingAlertListFilters(limit=20),
                conn=conn,
            )
            for alert in digest.top_alerts[:8]:
                items.append(
                    self.safe_evidence_item(
                        item_id=f"alert:{alert.id}",
                        title=alert.title,
                        safe_summary=alert.safe_summary or "Recording alert metadata.",
                        source_module="recording_alerts",
                        route=digest.routes.alerts,
                        recording_type=alert.alert_type,
                        action_label=alert.action_label or "Open alerts",
                        child_id=alert.child_id,
                        safeguarding_review_required=alert.safeguarding_sensitive,
                        privacy_sensitive=alert.safeguarding_sensitive,
                        risk=_risk_from_flags(
                            urgent=alert.severity in {"urgent", "high"},
                            safeguarding=bool(alert.safeguarding_sensitive),
                        ),
                    )
                )
        except Exception as exc:
            logger.debug("sccif_alert_evidence_skipped: %s", exc)

        try:
            from services.recording_review_service import recording_review_service

            queue_response = recording_review_service.list_review_queue(
                current_user,
                RecordingReviewQueueFilters(limit=15),
                conn=conn,
            )
            for entry in queue_response.items[:10]:
                items.append(
                    self.safe_evidence_item(
                        item_id=f"review:{entry.draft_id}",
                        title=_text(entry.title, "Review queue item"),
                        safe_summary=(
                            f"Awaiting {_text(entry.review_status, 'review')}. "
                            "Manager review needed — not a compliance decision."
                        ),
                        source_module="recording_review",
                        route="/record/reviews",
                        recording_type=entry.recording_type,
                        related_id=str(entry.draft_id),
                        related_type="recording_draft",
                        draft_status=entry.status,
                        review_required=True,
                        manager_review_required=True,
                        safeguarding_review_required=bool(entry.safeguarding_review_required),
                        child_id=entry.child_id,
                        risk=_risk_from_flags(
                            urgent=entry.review_priority in {"urgent", "high"},
                            safeguarding=bool(entry.safeguarding_review_required),
                            manager_review=True,
                        ),
                    )
                )
        except Exception as exc:
            logger.debug("sccif_review_evidence_skipped: %s", exc)

        return items

    def collect_handover_evidence(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> list[SccifEvidenceItem]:
        _ = filters
        items: list[SccifEvidenceItem] = []
        try:
            from services.handover_intelligence_service import handover_intelligence_service

            dashboard = handover_intelligence_service.build_dashboard(current_user, conn=conn)
            items.append(
                self.safe_evidence_item(
                    item_id="handover:dashboard",
                    title="Handover intelligence",
                    safe_summary=(
                        f"{dashboard.urgent_count} urgent; "
                        f"{dashboard.safeguarding_count} safeguarding-sensitive; "
                        f"{dashboard.review_count} review items. "
                        "May support leadership oversight across shifts."
                    ),
                    source_module="handover_intelligence",
                    route="/handover",
                    action_label="Open handover",
                    evidence_strength="partial_evidence",
                    risk=_risk_from_flags(
                        urgent=dashboard.urgent_count > 0,
                        safeguarding=dashboard.safeguarding_count > 0,
                    ),
                )
            )
            for section in dashboard.sections[:4]:
                for item in section.items[:3]:
                    items.append(
                        self.safe_evidence_item(
                            item_id=f"handover:{item.id}",
                            title=item.title,
                            safe_summary=item.safe_summary,
                            source_module="handover_intelligence",
                            route=item.route or "/handover",
                            action_label=item.action_label,
                            safeguarding_review_required=item.safeguarding_sensitive,
                            manager_review_required=item.manager_review_required,
                            risk=_risk_from_flags(
                                urgent=item.priority in {"urgent", "high"},
                                safeguarding=item.safeguarding_sensitive,
                                manager_review=item.manager_review_required,
                            ),
                        )
                    )
        except Exception as exc:
            logger.debug("sccif_handover_evidence_skipped: %s", exc)
        return items

    def collect_isn_evidence(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> list[SccifEvidenceItem]:
        _ = filters
        items: list[SccifEvidenceItem] = []
        try:
            from services.isn_digest_service import isn_digest_service

            digest = isn_digest_service.build_digest(current_user, conn=conn)
            items.append(
                self.safe_evidence_item(
                    item_id="isn:digest",
                    title="Safeguarding network (ISN)",
                    safe_summary=(
                        f"{digest.total_open} open signal(s); "
                        f"{digest.urgent} urgent; {digest.review_required} need review. "
                        "May support helped and protected evidence threads."
                    ),
                    source_module="isn_digest",
                    route="/safeguarding",
                    action_label="Open safeguarding network",
                    evidence_strength="partial_evidence",
                    risk=_risk_from_flags(
                        urgent=digest.urgent > 0,
                        safeguarding=digest.total_open > 0,
                    ),
                )
            )
            for top in digest.top_items[:5]:
                items.append(
                    self.safe_evidence_item(
                        item_id=f"isn:{top.id}",
                        title=top.title,
                        safe_summary=top.safe_summary or "ISN alert metadata.",
                        source_module="isn_digest",
                        route="/safeguarding",
                        action_label=top.action_label or "Review ISN",
                        safeguarding_review_required=True,
                        privacy_sensitive=True,
                        risk=_risk_from_flags(
                            urgent=top.severity in {"urgent", "high"},
                            safeguarding=True,
                        ),
                        metadata={"signal_type": top.signal_type},
                    )
                )
        except Exception as exc:
            logger.debug("sccif_isn_evidence_skipped: %s", exc)
        return items

    def collect_workforce_evidence(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> list[SccifEvidenceItem]:
        _ = filters
        items: list[SccifEvidenceItem] = []
        try:
            from services.workforce_context_service import workforce_context_service

            dashboard = workforce_context_service.build_dashboard(current_user, conn=conn)
            shift_summary = _text(getattr(dashboard.shift, "summary", None))
            wf_summary = (
                shift_summary
                or (dashboard.recommendations[0] if dashboard.recommendations else "")
                or f"{len(dashboard.staff_on_shift)} staff on shift; "
                f"{len(dashboard.staffing_risks)} staffing risk indicator(s)."
            )
            items.append(
                self.safe_evidence_item(
                    item_id="workforce:context",
                    title="Workforce and shift context",
                    safe_summary=_text(
                        wf_summary,
                        "Workforce indicators may support leadership and management oversight.",
                    ),
                    source_module="workforce_context",
                    route="/staff",
                    action_label="Open staff",
                    evidence_strength="partial_evidence",
                )
            )
        except Exception as exc:
            logger.debug("sccif_workforce_evidence_skipped: %s", exc)

        if filters and filters.staff_id:
            try:
                from services.staff_profile_os_service import staff_profile_os_service

                staff_id_int = int(filters.staff_id)
                profile = staff_profile_os_service.build_dashboard(
                    staff_id_int, current_user, conn=conn
                )
                overview = profile.overview
                staff_summary = (
                    f"{overview.staff_name}: supervision due {profile.supervision_due_count}; "
                    f"training due {profile.training_due_count}. "
                    "May support leadership and positive relationships evidence."
                )
                items.append(
                    self.safe_evidence_item(
                        item_id=f"staff:{filters.staff_id}",
                        title="Staff profile oversight",
                        safe_summary=staff_summary,
                        source_module="staff_profile_os",
                        route=f"/staff/{filters.staff_id}",
                        staff_id=filters.staff_id,
                        action_label="Open staff profile",
                    )
                )
            except Exception as exc:
                logger.debug("sccif_staff_profile_skipped: %s", exc)
        return items

    def collect_daily_brief_evidence(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> list[SccifEvidenceItem]:
        _ = filters
        items: list[SccifEvidenceItem] = []
        try:
            from services.manager_daily_brief_service import manager_daily_brief_service

            brief = manager_daily_brief_service.build_brief(current_user, conn=conn)
            items.append(
                self.safe_evidence_item(
                    item_id="brief:today",
                    title="Manager daily brief",
                    safe_summary=_text(
                        brief.opening_summary,
                        "Daily brief aggregates safe operational summaries for leadership oversight.",
                    ),
                    source_module="manager_daily_brief",
                    route="/command-centre/briefing",
                    action_label="Open briefing",
                    evidence_strength="partial_evidence",
                )
            )
        except Exception as exc:
            logger.debug("sccif_brief_evidence_skipped: %s", exc)

        try:
            from services.os_notification_analytics_service import os_notification_analytics_service

            gov = os_notification_analytics_service.build_governance_summary(
                current_user, conn=conn
            )
            unresolved = len(gov.unresolved_escalation_candidates or [])
            total = gov.metrics.total_notifications if gov.metrics else 0
            items.append(
                self.safe_evidence_item(
                    item_id="notifications:oversight",
                    title="Notification oversight",
                    safe_summary=(
                        f"{total} notification(s) in scope; "
                        f"{unresolved} unresolved escalation candidate(s). "
                        "May support leadership escalation oversight."
                    ),
                    source_module="os_notifications",
                    route="/notifications/settings",
                    action_label="Notification settings",
                    evidence_strength="partial_evidence",
                )
            )
        except Exception as exc:
            logger.debug("sccif_notification_evidence_skipped: %s", exc)
        return items

    def collect_child_journey_evidence(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> list[SccifEvidenceItem]:
        items: list[SccifEvidenceItem] = []
        child_id = filters.child_id if filters else None
        if child_id:
            route = f"/young-people/{child_id}/journey"
            items.append(
                self.safe_evidence_item(
                    item_id=f"journey:{child_id}",
                    title="Child journey",
                    safe_summary=(
                        "Child journey route may support experiences, progress and care planning evidence. "
                        "Open journey for full context where permitted."
                    ),
                    source_module="child_journey",
                    route=route,
                    child_id=child_id,
                    action_label="Open child journey",
                    evidence_strength="route_hint_only",
                )
            )
        else:
            items.append(
                self.safe_evidence_item(
                    item_id="journey:hint",
                    title="Child journey evidence",
                    safe_summary=(
                        "Filter by child to see journey route hints. "
                        "Potential gap: child-specific journey evidence not summarised here."
                    ),
                    source_module="child_journey",
                    route="/young-people",
                    action_label="Browse young people",
                    evidence_strength="route_hint_only",
                )
            )
        _ = current_user, conn
        return items

    def build_judgement_summary(
        self, items: list[SccifEvidenceItem]
    ) -> list[SccifJudgementSummary]:
        summaries: list[SccifJudgementSummary] = []
        for area, meta in [
            ("overall_experiences_progress", sccif_alignment_registry_service.judgement_title("overall_experiences_progress")),
            ("helped_and_protected", sccif_alignment_registry_service.judgement_title("helped_and_protected")),
            ("leadership_management", sccif_alignment_registry_service.judgement_title("leadership_management")),
        ]:
            area_typed: SccifJudgementArea = area  # type: ignore[assignment]
            matched = [i for i in items if area in i.judgement_areas]
            gaps_for = [g for g in [] if g.judgement_area == area]
            strong = sum(1 for i in matched if i.evidence_strength == "strong_evidence")
            partial = sum(1 for i in matched if i.evidence_strength == "partial_evidence")
            draft_prompt = sum(
                1 for i in matched if i.evidence_strength in {"prompt_only", "route_hint_only"}
            )
            mgr = sum(1 for i in matched if i.manager_review_required)
            sg = sum(1 for i in matched if i.safeguarding_review_required)
            strength: EvidenceStrength = "not_yet_wired"
            if strong:
                strength = "strong_evidence"
            elif partial:
                strength = "partial_evidence"
            elif draft_prompt:
                strength = "prompt_only"
            summaries.append(
                SccifJudgementSummary(
                    area=area_typed,
                    title=meta,
                    evidence_count=len(matched),
                    gap_count=len(gaps_for),
                    strong_count=strong,
                    partial_count=partial,
                    draft_or_prompt_count=draft_prompt,
                    manager_review_count=mgr,
                    safeguarding_count=sg,
                    safe_summary=(
                        f"{len(matched)} evidence item(s) may support this judgement area. "
                        "Evidence aligned to SCCIF — not a compliance decision."
                        if matched
                        else "Potential gap: limited mapped evidence in current scope."
                    ),
                    route=sccif_alignment_registry_service.route_for_judgement(area_typed),
                    evidence_strength=strength if matched else "route_hint_only",
                )
            )
        return summaries

    def build_quality_standard_summary(
        self, items: list[SccifEvidenceItem], gaps: list[SccifEvidenceGap]
    ) -> list[SccifQualityStandardSummary]:
        summaries: list[SccifQualityStandardSummary] = []
        for area in sccif_alignment_registry_service.list_quality_standards():
            area_key: QualityStandardArea = area["area"]  # type: ignore[assignment]
            matched = [i for i in items if area_key in i.quality_standards]
            gap_matched = [g for g in gaps if g.quality_standard == area_key]
            strong = sum(1 for i in matched if i.evidence_strength == "strong_evidence")
            partial = sum(1 for i in matched if i.evidence_strength == "partial_evidence")
            draft_prompt = sum(
                1 for i in matched if i.evidence_strength in {"prompt_only", "route_hint_only"}
            )
            strength: EvidenceStrength = "not_yet_wired"
            if strong:
                strength = "strong_evidence"
            elif partial:
                strength = "partial_evidence"
            elif draft_prompt:
                strength = "prompt_only"
            summaries.append(
                SccifQualityStandardSummary(
                    area=area_key,
                    title=area["title"],
                    regulation_hint=area.get("regulation"),
                    evidence_count=len(matched),
                    gap_count=len(gap_matched),
                    strong_count=strong,
                    partial_count=partial,
                    draft_or_prompt_count=draft_prompt,
                    safe_summary=(
                        f"{len(matched)} item(s) may relate to this Quality Standard. "
                        "Professional judgement remains required."
                        if matched
                        else "Potential gap: few mapped evidence items in scope."
                    ),
                    route=sccif_alignment_registry_service.route_for_standard(area_key),
                    evidence_strength=strength if matched else "route_hint_only",
                )
            )
        return summaries

    def identify_gaps(
        self,
        items: list[SccifEvidenceItem],
        filters: SccifAlignmentFilters | None = None,
    ) -> list[SccifEvidenceGap]:
        _ = filters
        gaps: list[SccifEvidenceGap] = []
        judgement_counts = {
            "overall_experiences_progress": 0,
            "helped_and_protected": 0,
            "leadership_management": 0,
        }
        standard_counts: dict[str, int] = {s["area"]: 0 for s in sccif_alignment_registry_service.list_quality_standards()}
        child_voice_items = 0
        draft_only = 0

        for item in items:
            for ja in item.judgement_areas:
                judgement_counts[ja] = judgement_counts.get(ja, 0) + 1
            for qs in item.quality_standards:
                standard_counts[qs] = standard_counts.get(qs, 0) + 1
            if "views_wishes_feelings" in item.quality_standards:
                child_voice_items += 1
            if item.evidence_strength == "prompt_only":
                draft_only += 1

        if judgement_counts["overall_experiences_progress"] < 2:
            gaps.append(
                SccifEvidenceGap(
                    id="gap:experiences",
                    title="Limited experiences and progress evidence",
                    description=(
                        "Few mapped items for overall experiences and progress. "
                        "Consider daily notes, keywork and child journey routes."
                    ),
                    judgement_area="overall_experiences_progress",
                    risk="medium",
                    route="/record",
                    action_label="Open recording",
                    recommended_action="Review daily notes and keywork recording coverage.",
                )
            )
        if judgement_counts["helped_and_protected"] < 1:
            gaps.append(
                SccifEvidenceGap(
                    id="gap:protected",
                    title="Safeguarding / protection evidence thin",
                    description=(
                        "No safeguarding-aligned items in scope. "
                        "Potential gap for helped and protected threads."
                    ),
                    judgement_area="helped_and_protected",
                    quality_standard="protection_children",
                    risk="high",
                    route="/safeguarding",
                    action_label="Open safeguarding",
                    recommended_action="Manager review needed for safeguarding network and recording alerts.",
                )
            )
        if child_voice_items < 1:
            gaps.append(
                SccifEvidenceGap(
                    id="gap:child_voice",
                    title="Child voice evidence not visible in scope",
                    description=(
                        "No items mapped to children's views, wishes and feelings. "
                        "Check daily notes and keywork for child voice flags."
                    ),
                    quality_standard="views_wishes_feelings",
                    risk="medium",
                    route="/record/governance",
                    action_label="Recording governance",
                    recommended_action="Review missing child voice flags in recording governance.",
                )
            )
        if draft_only > 3:
            gaps.append(
                SccifEvidenceGap(
                    id="gap:drafts",
                    title="Draft-only evidence should not be inspection proof",
                    description=(
                        f"{draft_only} item(s) are draft or prompt only. "
                        "Do not treat as completed inspection evidence."
                    ),
                    risk="medium",
                    route="/record/reviews",
                    action_label="Review queue",
                    recommended_action="Complete manager review before treating as evidence support.",
                )
            )
        if standard_counts.get("education", 0) < 1:
            gaps.append(
                SccifEvidenceGap(
                    id="gap:education",
                    title="Education evidence not mapped",
                    description="No education-note or education journey items in current scope.",
                    quality_standard="education",
                    risk="low",
                    route="/record",
                    action_label="Record education note",
                    recommended_action="Ensure education recording routes are in use where relevant.",
                )
            )
        if standard_counts.get("enjoyment_achievement", 0) < 1:
            gaps.append(
                SccifEvidenceGap(
                    id="gap:enjoyment",
                    title="Enjoyment and achievement evidence",
                    description="Route hint only — map activities and achievements through daily notes or keywork.",
                    quality_standard="enjoyment_achievement",
                    risk="low",
                    route="/record",
                    recommended_action="Use activity and achievement recording where applicable.",
                )
            )
        gaps.append(
            SccifEvidenceGap(
                id="gap:knowledge_library",
                title="Exact official citations",
                description=(
                    "Import official SCCIF and Quality Standards sources in Knowledge Library "
                    "for exact citations alongside this alignment layer."
                ),
                risk="low",
                route="/assistant/orb?mode=knowledge_library",
                action_label="Knowledge Library",
                recommended_action="Import official sources for ORB exact citation support.",
            )
        )
        return gaps

    def build_recommendations(self, dashboard: SccifAlignmentDashboard) -> list[str]:
        recs: list[str] = []
        if dashboard.evidence_gaps:
            recs.append(
                f"{len(dashboard.evidence_gaps)} potential gap(s) identified — "
                "manager review needed where safeguarding or child voice is flagged."
            )
        urgent = [i for i in dashboard.evidence_items if i.risk in {"urgent", "high"}]
        if urgent:
            recs.append(
                f"{len(urgent)} high-priority item(s) may need safeguarding or leadership review."
            )
        drafts = [i for i in dashboard.evidence_items if i.evidence_strength == "prompt_only"]
        if drafts:
            recs.append(
                f"{len(drafts)} draft-only item(s) should not be treated as inspection proof yet."
            )
        recs.append("Use Ask OS ORB for evidence preparation questions — not grade prediction.")
        recs.append(sccif_alignment_registry_service.safe_alignment_disclaimer())
        return recs[:8]

    def build_dashboard(
        self,
        current_user: dict[str, Any],
        filters: SccifAlignmentFilters | None = None,
        conn: Any | None = None,
    ) -> SccifAlignmentDashboard:
        filt = filters or SccifAlignmentFilters()
        if not self.enforce_access(current_user):
            return SccifAlignmentDashboard(
                generated_at=_now_iso(),
                scope={"access": "denied"},
                summary="SCCIF alignment requires manager or senior oversight role.",
                limitations=["Insufficient role for SCCIF alignment dashboard."],
                privacy_notice=PRIVACY_NOTICE,
                official_sources=sccif_alignment_registry_service.official_source_refs(),
                orb_prompts=ORB_ALIGNMENT_PROMPTS,
            )

        items: list[SccifEvidenceItem] = []
        items.extend(self.collect_recording_evidence(current_user, filt, conn=conn))
        items.extend(self.collect_handover_evidence(current_user, filt, conn=conn))
        items.extend(self.collect_isn_evidence(current_user, filt, conn=conn))
        items.extend(self.collect_workforce_evidence(current_user, filt, conn=conn))
        items.extend(self.collect_daily_brief_evidence(current_user, filt, conn=conn))
        items.extend(self.collect_child_journey_evidence(current_user, filt, conn=conn))

        if filt.judgement_area:
            items = [i for i in items if filt.judgement_area in i.judgement_areas]
        if filt.quality_standard:
            items = [i for i in items if filt.quality_standard in i.quality_standards]
        if filt.evidence_strength:
            items = [i for i in items if i.evidence_strength == filt.evidence_strength]
        if filt.risk:
            items = [i for i in items if i.risk == filt.risk]

        gaps = self.identify_gaps(items, filt)
        judgement_summary = self.build_judgement_summary(items)
        for js in judgement_summary:
            js.gap_count = len([g for g in gaps if g.judgement_area == js.area])
        quality_summary = self.build_quality_standard_summary(items, gaps)

        helped_count = sum(
            1 for i in items if "helped_and_protected" in i.judgement_areas
        )
        leadership_count = sum(
            1 for i in items if "leadership_management" in i.judgement_areas
        )

        dashboard = SccifAlignmentDashboard(
            generated_at=_now_iso(),
            scope={
                "home_id": filt.home_id,
                "child_id": filt.child_id,
                "staff_id": filt.staff_id,
            },
            summary=(
                f"{len(items)} safe evidence item(s) mapped; "
                f"{len(gaps)} potential gap(s). "
                f"{helped_count} may support helped and protected; "
                f"{leadership_count} may support leadership oversight. "
                "Not a compliance decision."
            ),
            judgement_summary=judgement_summary,
            quality_standard_summary=quality_summary,
            evidence_items=items[: filt.limit],
            evidence_gaps=gaps,
            limitations=LIMITATIONS,
            official_sources=sccif_alignment_registry_service.official_source_refs(),
            privacy_notice=PRIVACY_NOTICE,
            orb_prompts=ORB_ALIGNMENT_PROMPTS,
            routes=SccifAlignmentRoutes(),
            metadata={
                "no_raw_body": True,
                "evidence_support_only": True,
                "helped_and_protected_count": helped_count,
                "leadership_count": leadership_count,
            },
        )
        dashboard.recommendations = self.build_recommendations(dashboard)
        return dashboard


sccif_alignment_service = SccifAlignmentService()

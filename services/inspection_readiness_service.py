"""Inspection evidence preparation service — Reg 44 / Reg 45 evidence support packs from safe metadata."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import psycopg2
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.inspection_readiness import (
    InspectionEvidenceGap,
    InspectionEvidenceItem,
    InspectionEvidencePack,
    InspectionPackSaveRequest,
    InspectionPackSaveResponse,
    InspectionPackSection,
    InspectionPackType,
    InspectionReadinessDashboard,
    InspectionReadinessFilters,
    InspectionReadinessHealth,
)
from schemas.sccif_alignment import SccifAlignmentFilters, SccifEvidenceGap, SccifEvidenceItem
from services.inspection_pack_registry_service import (
    ORB_PACK_PROMPTS,
    inspection_pack_registry_service,
)

logger = logging.getLogger("indicare.inspection_readiness")

PRIVACY_NOTICE = (
    "Inspection evidence preparation uses metadata and safe summaries only — not full record bodies. "
    "Not a compliance decision. Professional judgement remains required."
)

LIMITATIONS = [
    "Evidence support only — does not predict inspection outcomes or generate grades.",
    "Draft records are draft-only and not completed inspection evidence.",
    "Raw safeguarding narratives, HR and supervision bodies are not summarised in pack cards.",
    "Import official SCCIF and Quality Standards sources into the Knowledge Library for exact citations.",
    "Reg 44 independent visitor reports may require source review in regulatory document routes.",
]

ROUTES = {
    "workspace": "/intelligence/inspection-readiness",
    "reg44_pack": "/intelligence/inspection-readiness?pack=reg44",
    "reg45_pack": "/intelligence/inspection-readiness?pack=reg45",
    "reg45_review": "/intelligence/reg45",
    "sccif": "/intelligence/sccif",
    "pack_history": "/intelligence/inspection-readiness#history",
    "governance": "/record/governance",
    "handover": "/handover",
    "briefing": "/command-centre/briefing",
}

ALIGNMENT_VIEW_ROLES = MANAGER_ROLES | {
    "senior",
    "senior_practitioner",
    "senior_worker",
    "deputy",
    "registered_manager_deputy",
}

_memory_packs: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _pack_id() -> str:
    return f"pack_{uuid4().hex[:12]}"


def _db_rollback(conn: Any | None) -> None:
    if conn is None:
        return
    try:
        conn.rollback()
    except Exception:
        pass


def _handle_db_failure(conn: Any | None, exc: BaseException) -> None:
    if conn is not None and isinstance(exc, psycopg2.Error):
        _db_rollback(conn)


class InspectionReadinessService:
    def enforce_access(self, current_user: dict[str, Any]) -> bool:
        role = _user_role(current_user)
        return role in {r.lower() for r in ALIGNMENT_VIEW_ROLES} or any(
            token in role for token in ("manager", "deputy", "senior", "registered", "admin")
        )

    def get_health(self, conn: Any | None = None) -> InspectionReadinessHealth:
        persistence = False
        if conn is not None:
            try:
                persistence = table_exists(conn, "inspection_readiness_packs")
            except Exception as exc:
                _handle_db_failure(conn, exc)
                persistence = False
        return InspectionReadinessHealth(
            status="ok",
            pack_types=[p["id"] for p in inspection_pack_registry_service.list_pack_types()],
            sources_available=[
                "sccif_alignment",
                "recording_governance",
                "recording_alerts",
                "recording_review",
                "handover_intelligence",
                "isn_digest",
                "workforce_context",
                "manager_daily_brief",
            ],
            persistence_available=persistence,
            limitations=LIMITATIONS[:3],
        )

    def _sccif_filters(self, filters: InspectionReadinessFilters | None) -> SccifAlignmentFilters:
        return SccifAlignmentFilters(
            child_id=filters.child_id if filters else None,
            staff_id=filters.staff_id if filters else None,
            home_id=filters.home_id if filters else None,
            limit=min(filters.limit if filters else 100, 100),
        )

    def _from_sccif_item(self, item: SccifEvidenceItem, pack_types: list[InspectionPackType]) -> InspectionEvidenceItem:
        strength = item.evidence_strength
        if item.draft_status and strength == "prompt_only":
            strength = "draft_only"  # type: ignore[assignment]
        elif item.evidence_strength == "prompt_only":
            strength = "prompt_only"  # type: ignore[assignment]
        return InspectionEvidenceItem(
            id=item.id,
            title=item.title,
            safe_summary=item.safe_summary,
            source_module=item.source_module,
            source_type="metadata",
            route=item.route,
            action_label=item.action_label,
            pack_types=pack_types,
            sccif_judgement_areas=list(item.judgement_areas),
            quality_standards=list(item.quality_standards),
            evidence_strength=strength,  # type: ignore[arg-type]
            risk=item.risk,
            draft_status=item.draft_status,
            review_required=item.review_required,
            manager_review_required=item.manager_review_required,
            safeguarding_review_required=item.safeguarding_review_required,
            privacy_sensitive=item.privacy_sensitive,
            child_id=item.child_id,
            staff_id=item.staff_id,
            home_id=item.home_id,
            related_id=item.related_id,
            related_type=item.related_type,
            official_source_refs=[
                {"id": r.id, "title": r.title, "url": r.url, "note": r.note}
                for r in item.official_source_refs
            ],
            metadata={**(item.metadata or {}), "evidence_support_only": True},
        )

    def _from_sccif_gap(self, gap: SccifEvidenceGap, pack_type: InspectionPackType) -> InspectionEvidenceGap:
        return InspectionEvidenceGap(
            id=gap.id,
            title=gap.title,
            description=gap.description,
            pack_type=pack_type,
            sccif_judgement_area=gap.judgement_area,
            quality_standard=gap.quality_standard,
            risk=gap.risk,
            route=gap.route,
            action_label=gap.action_label,
            recommended_action=gap.recommended_action,
            metadata=gap.metadata,
        )

    def collect_evidence(
        self,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> list[InspectionEvidenceItem]:
        items: list[InspectionEvidenceItem] = []
        pack_types: list[InspectionPackType] = ["reg44", "reg45", "sccif", "quality_standards"]
        try:
            from services.sccif_alignment_service import sccif_alignment_service

            sccif_filters = self._sccif_filters(filters)
            # Exclude collect_daily_brief_evidence — would recurse via manager_daily_brief → inspection_readiness.
            for src in (
                sccif_alignment_service.collect_recording_evidence,
                sccif_alignment_service.collect_handover_evidence,
                sccif_alignment_service.collect_isn_evidence,
                sccif_alignment_service.collect_workforce_evidence,
                sccif_alignment_service.collect_child_journey_evidence,
            ):
                try:
                    for raw in src(current_user, sccif_filters, conn=conn):
                        converted = self._from_sccif_item(raw, pack_types)
                        items.append(converted)
                except Exception as exc:
                    _handle_db_failure(conn, exc)
                    logger.debug("inspection_collect_%s_skipped: %s", src.__name__, exc)
            if filters and filters.staff_id:
                try:
                    from services.staff_profile_os_service import staff_profile_os_service

                    staff_id_int = int(filters.staff_id)
                    profile = staff_profile_os_service.build_dashboard(
                        staff_id_int, current_user, conn=conn
                    )
                    items.append(
                        InspectionEvidenceItem(
                            id=f"staff:{filters.staff_id}",
                            title="Staff profile workforce evidence",
                            safe_summary=(
                                "Workforce profile metadata may support leadership and staffing evidence. "
                                f"{profile.summary}. Manager review needed."
                            ),
                            source_module="staff_profile_os",
                            route=f"/staff/{filters.staff_id}",
                            action_label="Open staff profile",
                            pack_types=["reg45", "reg44"],
                            evidence_strength="partial_evidence",
                            staff_id=filters.staff_id,
                            manager_review_required=True,
                            metadata={"no_raw_body": True},
                        )
                    )
                except Exception as exc:
                    _handle_db_failure(conn, exc)
                    logger.debug("inspection_staff_profile_skipped: %s", exc)
        except Exception as exc:
            _handle_db_failure(conn, exc)
            logger.debug("inspection_sccif_collect_skipped: %s", exc)

        # Reg 44 / Reg 45 route hints
        items.append(
            InspectionEvidenceItem(
                id="hint:reg44_documents",
                title="Reg 44 independent visitor reports",
                safe_summary=(
                    "Monthly visit and independent visitor reports may be held in regulatory documents. "
                    "Requires source review — not summarised here."
                ),
                source_module="reg44_documents",
                route="/documents/regulatory/reg44",
                action_label="Open Reg 44 documents",
                pack_types=["reg44"],
                evidence_strength="route_hint_only",
                metadata={"route_hint": True, "no_raw_body": True},
            )
        )

        items.append(
            InspectionEvidenceItem(
                id="hint:reg45_review",
                title="Reg 45 quality of care review",
                safe_summary=(
                    "Quality of care review records may support Reg 45 preparation. "
                    "Manager review needed — not a compliance decision."
                ),
                source_module="reg45_review",
                route="/reports/reg45",
                action_label="Open Reg 45 routes",
                pack_types=["reg45"],
                evidence_strength="route_hint_only",
                metadata={"route_hint": True},
            )
        )

        if filters and filters.evidence_strength:
            items = [i for i in items if i.evidence_strength == filters.evidence_strength]
        if filters and filters.risk:
            items = [i for i in items if i.risk == filters.risk]
        return items

    def identify_pack_gaps(
        self,
        pack_type: InspectionPackType,
        evidence_items: list[InspectionEvidenceItem],
        filters: InspectionReadinessFilters | None = None,
    ) -> list[InspectionEvidenceGap]:
        _ = filters
        gaps: list[InspectionEvidenceGap] = []
        try:
            from services.sccif_alignment_service import sccif_alignment_service

            sccif_items = [
                SccifEvidenceItem(
                    id=i.id,
                    title=i.title,
                    safe_summary=i.safe_summary,
                    source_module=i.source_module,
                    route=i.route,
                    judgement_areas=i.sccif_judgement_areas,
                    quality_standards=i.quality_standards,
                    evidence_strength=i.evidence_strength if i.evidence_strength != "draft_only" else "prompt_only",  # type: ignore[arg-type]
                    risk=i.risk,
                    manager_review_required=i.manager_review_required,
                    safeguarding_review_required=i.safeguarding_review_required,
                )
                for i in evidence_items
                if i.source_module != "reg44_documents"
            ]
            for sg in sccif_alignment_service.identify_gaps(sccif_items, None):
                gaps.append(self._from_sccif_gap(sg, pack_type))
        except Exception as exc:
            logger.debug("inspection_gap_identify_skipped: %s", exc)

        section_ids = {s["id"] for s in inspection_pack_registry_service.get_pack_template(pack_type)["sections"]}
        covered: set[str] = set()
        for item in evidence_items:
            for sid in inspection_pack_registry_service.map_alignment_to_pack(item):
                if sid in section_ids:
                    covered.add(sid)
        for section in inspection_pack_registry_service.get_pack_template(pack_type)["sections"]:
            if section["id"] not in covered and pack_type in ("reg44", "reg45"):
                gaps.append(
                    InspectionEvidenceGap(
                        id=f"pack-gap:{section['id']}",
                        title=f"Potential gap: {section['title']}",
                        description=(
                            f"No mapped evidence in scope for {section['title']}. "
                            "May support review — requires source review."
                        ),
                        pack_type=pack_type,
                        risk="medium",
                        route=ROUTES.get("governance", "/record/governance"),
                        action_label="Review recording",
                        recommended_action="Manager review needed for this pack section.",
                    )
                )
        if pack_type == "reg44":
            if not any(i.source_module == "reg44_documents" for i in evidence_items):
                gaps.append(
                    InspectionEvidenceGap(
                        id="gap:reg44_visitor",
                        title="Independent visitor evidence not in scope",
                        description=(
                            "Reg 44 monthly visit reports are not summarised in this pack. "
                            "Open regulatory documents for source review."
                        ),
                        pack_type="reg44",
                        risk="high",
                        route="/documents/regulatory/reg44",
                        action_label="Open Reg 44 documents",
                        recommended_action="Requires source review of independent visitor reports.",
                    )
                )
        draft_count = sum(1 for i in evidence_items if i.evidence_strength in {"draft_only", "prompt_only"})
        if draft_count > 3:
            gaps.append(
                InspectionEvidenceGap(
                    id="gap:draft_volume",
                    title="High volume of draft-only evidence",
                    description=(
                        f"{draft_count} draft or prompt-only items in scope. "
                        "Draft only — not completed inspection evidence."
                    ),
                    pack_type=pack_type,
                    risk="medium",
                    route="/record/drafts",
                    recommended_action="Manager review needed before treating drafts as evidence.",
                )
            )
        return gaps

    def build_sections(
        self,
        pack_type: InspectionPackType,
        evidence_items: list[InspectionEvidenceItem],
        gaps: list[InspectionEvidenceGap],
    ) -> list[InspectionPackSection]:
        template_sections = inspection_pack_registry_service.get_pack_template(pack_type)["sections"]
        sections: list[InspectionPackSection] = []
        for tmpl in template_sections:
            sid = tmpl["id"]
            section_items = [
                i
                for i in evidence_items
                if sid in inspection_pack_registry_service.map_alignment_to_pack(i)
            ][:12]
            section_gaps = [g for g in gaps if g.id.endswith(sid) or sid.replace("reg44_", "").replace("reg45_", "") in g.id]
            warnings: list[str] = []
            if any(i.evidence_strength in {"draft_only", "prompt_only"} for i in section_items):
                warnings.append("Draft-only items present — not completed evidence.")
            sections.append(
                InspectionPackSection(
                    id=sid,
                    title=tmpl["title"],
                    summary=tmpl["summary"],
                    pack_type=pack_type,
                    evidence_items=section_items,
                    gaps=section_gaps[:5],
                    recommendations=[
                        "Evidence aligned to this section may support manager review."
                        if section_items
                        else "Potential gap — requires source review."
                    ],
                    warnings=warnings,
                )
            )
        return sections

    def build_recommendations(self, pack: InspectionEvidencePack) -> list[str]:
        recs = [
            "Professional judgement remains required — not a compliance decision.",
            "Review draft-only items before including in visit or quality of care review packs.",
        ]
        if pack.urgent_gap_count:
            recs.append(
                f"{pack.urgent_gap_count} urgent gap(s) may need manager review before inspection preparation."
            )
        if pack.draft_only_count:
            recs.append(
                f"{pack.draft_only_count} draft-only item(s) — treat as prompts, not completed evidence."
            )
        if pack.gap_count:
            recs.append("Consider intelligence actions from evidence gaps where appropriate.")
        recs.append(
            "Import official SCCIF and Quality Standards sources into the Knowledge Library for exact citations."
        )
        return recs

    def _pack_counts(self, items: list[InspectionEvidenceItem], gaps: list[InspectionEvidenceGap]) -> dict[str, int]:
        return {
            "evidence_count": len(items),
            "gap_count": len(gaps),
            "urgent_gap_count": sum(1 for g in gaps if g.risk == "urgent"),
            "review_required_count": sum(1 for i in items if i.review_required or i.manager_review_required),
            "draft_only_count": sum(
                1 for i in items if i.evidence_strength in {"draft_only", "prompt_only"}
            ),
        }

    def generate_pack(
        self,
        pack_type: InspectionPackType,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionEvidencePack:
        if pack_type == "reg44":
            return self.generate_reg44_pack(current_user, filters, conn)
        if pack_type == "reg45":
            return self.generate_reg45_pack(current_user, filters, conn)
        if pack_type == "sccif":
            return self.generate_sccif_pack(current_user, filters, conn)
        if pack_type == "quality_standards":
            return self.generate_quality_standards_pack(current_user, filters, conn)
        return self._build_pack("custom", current_user, filters, conn)

    def _build_pack(
        self,
        pack_type: InspectionPackType,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionEvidencePack:
        items = self.collect_evidence(current_user, filters, conn)
        if pack_type in ("reg44", "reg45"):
            items = [i for i in items if pack_type in i.pack_types or i.evidence_strength == "route_hint_only"]
        gaps = self.identify_pack_gaps(pack_type, items, filters)
        sections = self.build_sections(pack_type, items, gaps)
        counts = self._pack_counts(items, gaps)
        pack = InspectionEvidencePack(
            id=_pack_id(),
            title=inspection_pack_registry_service.default_pack_title(
                pack_type,
                filters.period_start if filters else None,
                filters.period_end if filters else None,
            ),
            pack_type=pack_type,
            generated_at=_now_iso(),
            period_start=filters.period_start if filters else None,
            period_end=filters.period_end if filters else None,
            scope={
                "home_id": current_user.get("home_id"),
                "user_id": _user_id(current_user),
                "role": _user_role(current_user),
            },
            summary=(
                f"Evidence support pack for {pack_type.replace('_', ' ')}. "
                "May support manager and RI review — does not predict inspection outcomes."
            ),
            sections=sections,
            **counts,
            limitations=LIMITATIONS,
            privacy_notice=PRIVACY_NOTICE,
            official_sources=inspection_pack_registry_service.official_source_refs(),
            orb_prompts=ORB_PACK_PROMPTS,
            routes=ROUTES,
            metadata={"evidence_support_only": True, "no_compliance_claim": True},
        )
        pack.metadata["recommendations"] = self.build_recommendations(pack)
        return pack

    def generate_reg44_pack(
        self,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionEvidencePack:
        return self._build_pack("reg44", current_user, filters, conn)

    def generate_reg45_pack(
        self,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionEvidencePack:
        return self._build_pack("reg45", current_user, filters, conn)

    def generate_sccif_pack(
        self,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionEvidencePack:
        pack = self._build_pack("sccif", current_user, filters, conn)
        pack.routes["sccif_dashboard"] = ROUTES["sccif"]
        return pack

    def generate_quality_standards_pack(
        self,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionEvidencePack:
        return self._build_pack("quality_standards", current_user, filters, conn)

    def build_degraded_dashboard(
        self,
        *,
        reason: str = "Inspection evidence preparation temporarily unavailable",
    ) -> InspectionReadinessDashboard:
        return InspectionReadinessDashboard(
            generated_at=_now_iso(),
            summary=reason,
            reg44_summary="Reg 44 pack unavailable — try again shortly.",
            reg45_summary="Reg 45 pack unavailable — try again shortly.",
            sccif_summary="SCCIF alignment temporarily unavailable.",
            quality_standards_summary="Quality Standards alignment temporarily unavailable.",
            recent_packs=[],
            key_gaps=[],
            recommendations=["Retry shortly or open the Inspection evidence preparation workspace directly."],
            limitations=LIMITATIONS + [reason],
            privacy_notice=PRIVACY_NOTICE,
            routes=ROUTES,
            metadata={"degraded": True, "error": reason},
        )

    def build_dashboard(
        self,
        current_user: dict[str, Any],
        filters: InspectionReadinessFilters | None = None,
        conn: Any | None = None,
    ) -> InspectionReadinessDashboard:
        try:
            reg44 = self.generate_reg44_pack(current_user, filters, conn)
            reg45 = self.generate_reg45_pack(current_user, filters, conn)
        except Exception as exc:
            _handle_db_failure(conn, exc)
            logger.warning("inspection_readiness_dashboard_pack_build_failed: %s", exc)
            return self.build_degraded_dashboard(reason="Inspection evidence preparation pack build temporarily unavailable")

        all_gaps = reg44.sections[0].gaps if reg44.sections else []
        for section in reg44.sections + reg45.sections:
            all_gaps = list({g.id: g for g in all_gaps + section.gaps}.values())
        key_gaps = sorted(
            all_gaps,
            key=lambda g: {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(g.risk, 4),
        )[:8]
        recent = self.list_pack_history(current_user, limit=5, conn=conn)
        return InspectionReadinessDashboard(
            generated_at=_now_iso(),
            summary=(
                "Inspection evidence preparation workspace — evidence support for Reg 44, Reg 45, SCCIF and Quality Standards. "
                "Does not predict inspection outcomes."
            ),
            reg44_summary=(
                f"Reg 44 pack: {reg44.evidence_count} evidence item(s), {reg44.gap_count} potential gap(s), "
                f"{reg44.draft_only_count} draft-only."
            ),
            reg45_summary=(
                f"Reg 45 pack: {reg45.evidence_count} evidence item(s), {reg45.gap_count} potential gap(s), "
                f"{reg45.review_required_count} may need review."
            ),
            sccif_summary="SCCIF alignment available — evidence may support judgement area review.",
            quality_standards_summary="Quality Standards alignment available — not a compliance decision.",
            recent_packs=recent,
            key_gaps=key_gaps,
            recommendations=[
                "Generate Reg 44 or Reg 45 packs before monthly visit or quality of care review.",
                "Review draft-only items separately — not completed evidence.",
            ],
            limitations=LIMITATIONS,
            privacy_notice=PRIVACY_NOTICE,
            routes=ROUTES,
            metadata={
                "reg44_gaps": reg44.gap_count,
                "reg45_gaps": reg45.gap_count,
                "urgent_gaps": reg44.urgent_gap_count + reg45.urgent_gap_count,
            },
        )

    def _persist_pack(
        self,
        pack: InspectionEvidencePack,
        current_user: dict[str, Any],
        conn: Any | None,
    ) -> tuple[bool, str | None]:
        packs_table_available = False
        if conn is not None:
            try:
                packs_table_available = table_exists(conn, "inspection_readiness_packs")
            except Exception as exc:
                _handle_db_failure(conn, exc)
                packs_table_available = False
        if conn is None or not packs_table_available:
            _memory_packs[pack.id] = {
                "id": pack.id,
                "pack_type": pack.pack_type,
                "title": pack.title,
                "pack_json": pack.model_dump(mode="json"),
                "created_at": pack.generated_at,
            }
            return True, None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO inspection_readiness_packs (
                        id, pack_type, title, period_start, period_end, scope, home_id,
                        generated_by_user_id, generated_by_name, summary,
                        evidence_count, gap_count, urgent_gap_count,
                        review_required_count, draft_only_count, pack_json, status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        pack_json = EXCLUDED.pack_json,
                        updated_at = NOW()
                    """,
                    (
                        pack.id,
                        pack.pack_type,
                        pack.title,
                        pack.period_start,
                        pack.period_end,
                        pack.scope.get("type", "home"),
                        current_user.get("home_id"),
                        _user_id(current_user),
                        current_user.get("name") or current_user.get("email"),
                        pack.summary,
                        pack.evidence_count,
                        pack.gap_count,
                        pack.urgent_gap_count,
                        pack.review_required_count,
                        pack.draft_only_count,
                        Json(pack.model_dump(mode="json")),
                        "draft",
                    ),
                )
            conn.commit()
            return True, None
        except Exception as exc:
            logger.debug("inspection_pack_persist_failed: %s", exc)
            _db_rollback(conn)
            return False, str(exc)

    def _memory_pack_history(self, limit: int) -> list[dict[str, Any]]:
        limit_n = int(limit) if limit is not None else 20
        return [
            {
                "id": p["id"],
                "pack_type": p["pack_type"],
                "title": p["title"],
                "evidence_count": p["pack_json"].get("evidence_count", 0),
                "gap_count": p["pack_json"].get("gap_count", 0),
                "created_at": p.get("created_at"),
                "status": "draft",
            }
            for p in sorted(
                _memory_packs.values(),
                key=lambda x: x.get("created_at", ""),
                reverse=True,
            )[:limit_n]
        ]

    def list_pack_history(
        self,
        current_user: dict[str, Any],
        limit: int = 20,
        conn: Any | None = None,
    ) -> list[dict[str, Any]]:
        if conn is None:
            return self._memory_pack_history(limit)

        try:
            if not table_exists(conn, "inspection_readiness_packs"):
                return self._memory_pack_history(limit)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, pack_type, title, evidence_count, gap_count,
                           draft_only_count, created_at, status
                    FROM inspection_readiness_packs
                    WHERE generated_by_user_id = %s OR home_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (_user_id(current_user), current_user.get("home_id"), limit),
                )
                return [dict(row) for row in cur.fetchall()]
        except Exception as exc:
            _handle_db_failure(conn, exc)
            logger.warning("inspection_history_db_failed: %s", exc)
        return self._memory_pack_history(limit)

    def get_pack_by_id(
        self,
        pack_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> InspectionEvidencePack | None:
        if conn is not None:
            try:
                if table_exists(conn, "inspection_readiness_packs"):
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            "SELECT pack_json FROM inspection_readiness_packs WHERE id = %s LIMIT 1",
                            (pack_id,),
                        )
                        row = cur.fetchone()
                        if row:
                            return InspectionEvidencePack.model_validate(row["pack_json"])
            except Exception as exc:
                _handle_db_failure(conn, exc)
                logger.debug("inspection_pack_fetch_failed: %s", exc)
        stored = _memory_packs.get(pack_id)
        if stored:
            return InspectionEvidencePack.model_validate(stored["pack_json"])
        return None

    def save_pack(
        self,
        pack: InspectionEvidencePack,
        request: InspectionPackSaveRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> InspectionPackSaveResponse:
        warnings: list[str] = []
        action_ids: list[str] = []
        saved_output_id: str | None = None

        ok, err = self._persist_pack(pack, current_user, conn)
        if not ok:
            warnings.append(f"Pack history not persisted: {err or 'table unavailable'}.")
        else:
            packs_table_available = False
            if conn is not None:
                try:
                    packs_table_available = table_exists(conn, "inspection_readiness_packs")
                except Exception as exc:
                    _handle_db_failure(conn, exc)
            if conn is None or not packs_table_available:
                warnings.append(
                    "Pack saved in session memory — apply sql/091_inspection_readiness_packs.sql for persistence."
                )

        if request.save_output:
            try:
                from schemas.orb_operational_outputs import OrbOperationalOutputCreate
                from services.orb_operational_output_service import orb_operational_output_service

                record = orb_operational_output_service.create_output(
                    OrbOperationalOutputCreate(
                        title=pack.title,
                        type="inspection_preparation",
                        summary=pack.summary[:500],
                        content_markdown=self.export_pack_markdown(pack),
                        content_json={"pack_id": pack.id, "pack_type": pack.pack_type},
                        tags=["inspection_readiness", pack.pack_type],
                    ),
                    current_user,
                    conn=conn,
                )
                saved_output_id = record.id
            except Exception as exc:
                warnings.append("Pack saving to operational outputs is not fully wired yet.")
                logger.debug("inspection_save_output_skipped: %s", exc)

        if request.create_actions_from_gaps:
            action_ids, gap_warning = self.create_actions_from_gaps(pack, current_user, conn)
            if gap_warning:
                warnings.append(gap_warning)

        next_steps = [
            "Review pack sections with professional judgement.",
            "Open source records where requires source review is indicated.",
        ]
        if not saved_output_id and request.save_output:
            next_steps.insert(0, "Operational output save unavailable — pack available in workspace only.")

        return InspectionPackSaveResponse(
            success=True,
            pack=pack,
            saved_output_id=saved_output_id,
            action_ids=action_ids,
            warnings=warnings,
            next_steps=next_steps,
        )

    def create_actions_from_gaps(
        self,
        pack: InspectionEvidencePack,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> tuple[list[str], str | None]:
        all_gaps: list[InspectionEvidenceGap] = []
        for section in pack.sections:
            all_gaps.extend(section.gaps)
        if not all_gaps:
            return [], "No gaps available to create actions."
        try:
            from schemas.intelligence_actions import IntelligenceActionCreate
            from services.intelligence_action_service import intelligence_action_service

            ids: list[str] = []
            for gap in all_gaps[:5]:
                result = intelligence_action_service.create_action(
                    IntelligenceActionCreate(
                        title=gap.title[:120],
                        summary=gap.recommended_action or gap.description,
                        action_type="inspection_readiness_gap",
                        priority="high" if gap.risk in {"urgent", "high"} else "medium",
                        source_service="inspection_readiness",
                        source_finding_id=gap.id,
                        suggested_next_step=gap.recommended_action,
                        home_id=str(current_user.get("home_id") or ""),
                    ),
                    current_user=current_user,
                    conn=conn,
                )
                if result and getattr(result, "id", None):
                    ids.append(str(result.id))
            if ids:
                return ids, None
            return [], "Intelligence actions could not be created — review gaps manually."
        except Exception as exc:
            logger.debug("inspection_create_actions_skipped: %s", exc)
            return [], "Create actions from gaps is not fully wired in this environment."

    def export_pack_markdown(self, pack: InspectionEvidencePack) -> str:
        lines = [
            f"# {pack.title}",
            "",
            f"*{inspection_pack_registry_service.safe_pack_disclaimer()}*",
            "",
            f"**Generated:** {pack.generated_at}",
            "",
            pack.summary,
            "",
        ]
        for section in pack.sections:
            lines.append(f"## {section.title}")
            lines.append(section.summary)
            if section.warnings:
                lines.append(f"> {' '.join(section.warnings)}")
            for item in section.evidence_items:
                draft = " (Draft only)" if item.evidence_strength in {"draft_only", "prompt_only"} else ""
                lines.append(f"- **{item.title}**{draft}: {item.safe_summary}")
            for gap in section.gaps:
                lines.append(f"- **Potential gap:** {gap.title} — {gap.description}")
            lines.append("")
        return "\n".join(lines)


inspection_readiness_service = InspectionReadinessService()

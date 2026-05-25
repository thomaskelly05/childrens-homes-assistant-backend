"""Reg 45 Quality of Care Review service — structured draft review workflow from safe evidence."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.inspection_readiness import InspectionEvidenceGap, InspectionEvidenceItem, InspectionReadinessFilters
from schemas.reg45_quality_review import (
    Reg45ImprovementActionDraft,
    Reg45QualityReview,
    Reg45ReviewActionRequest,
    Reg45ReviewActionResponse,
    Reg45ReviewCreateRequest,
    Reg45ReviewDashboard,
    Reg45ReviewEvidenceItem,
    Reg45ReviewGap,
    Reg45ReviewHealth,
    Reg45ReviewSection,
    Reg45ReviewSectionType,
    Reg45ReviewUpdateRequest,
)
from services.reg45_quality_review_registry_service import (
    REG45_REVIEW_SECTIONS,
    reg45_quality_review_registry_service,
)

logger = logging.getLogger("indicare.reg45_quality_review")

PRIVACY_NOTICE = (
    "Reg 45 review support uses metadata and safe summaries only — not full record bodies. "
    "Draft review — requires manager/provider review. Not a compliance decision."
)

LIMITATIONS = [
    "Review support only — does not predict inspection outcomes or generate grades.",
    "Draft records are draft-only and not completed statutory review evidence.",
    "Raw safeguarding narratives, HR and supervision bodies are not summarised in review cards.",
    "Does not say meets the standard or compliant — professional judgement remains required.",
    "Import official SCCIF and Quality Standards sources into the Knowledge Library for exact citations.",
]

ROUTES = {
    "workspace": "/intelligence/reg45",
    "inspection_readiness": "/intelligence/inspection-readiness",
    "inspection_reg45_pack": "/intelligence/inspection-readiness?pack=reg45",
    "sccif": "/intelligence/sccif",
    "governance": "/record/governance",
    "handover": "/handover",
    "briefing": "/command-centre/briefing",
    "actions": "/actions",
}

ALIGNMENT_VIEW_ROLES = MANAGER_ROLES | {
    "senior",
    "senior_practitioner",
    "senior_worker",
    "deputy",
    "registered_manager_deputy",
}

_memory_reviews: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _review_id() -> str:
    return f"reg45rev_{uuid4().hex[:12]}"


def _event_id() -> str:
    return f"reg45evt_{uuid4().hex[:12]}"


class Reg45QualityReviewService:
    def enforce_access(self, current_user: dict[str, Any], review: Reg45QualityReview | None = None) -> bool:
        _ = review
        role = _user_role(current_user)
        return role in {r.lower() for r in ALIGNMENT_VIEW_ROLES} or any(
            token in role for token in ("manager", "deputy", "senior", "registered", "admin", "ri")
        )

    def get_health(self, conn: Any | None = None) -> Reg45ReviewHealth:
        persistence = False
        if conn is not None:
            try:
                persistence = table_exists(conn, "reg45_quality_reviews")
            except Exception:
                persistence = False
        return Reg45ReviewHealth(
            status="ok",
            persistence_available=persistence,
            sources_available=[
                "inspection_readiness_reg45_pack",
                "sccif_alignment",
                "recording_governance",
                "isn_digest",
                "handover_intelligence",
                "workforce_context",
                "staff_profile_os",
                "manager_daily_brief",
                "intelligence_actions",
            ],
            limitations=LIMITATIONS[:3],
        )

    def _from_inspection_item(self, item: InspectionEvidenceItem) -> Reg45ReviewEvidenceItem:
        section_types: list[Reg45ReviewSectionType] = []
        try:
            from services.inspection_pack_registry_service import inspection_pack_registry_service

            for sid in inspection_pack_registry_service.map_alignment_to_pack(item):
                section_types.append(reg45_quality_review_registry_service.map_pack_section_id(sid))
        except Exception:
            pass
        strength = item.evidence_strength
        if item.draft_status and strength == "prompt_only":
            strength = "draft_only"  # type: ignore[assignment]
        return Reg45ReviewEvidenceItem(
            id=f"rev:{item.id}",
            title=item.title,
            safe_summary=item.safe_summary,
            source_module=item.source_module,
            source_type=item.source_type,
            route=item.route,
            action_label=item.action_label,
            section_types=section_types or ["summary"],
            quality_standards=list(item.quality_standards),
            sccif_judgement_areas=list(item.sccif_judgement_areas),
            evidence_strength=strength,  # type: ignore[arg-type]
            draft_status=item.draft_status,
            risk=item.risk,
            review_required=item.review_required,
            manager_review_required=item.manager_review_required,
            safeguarding_review_required=item.safeguarding_review_required,
            privacy_sensitive=item.privacy_sensitive,
            related_id=item.related_id,
            related_type=item.related_type,
            child_id=item.child_id,
            staff_id=item.staff_id,
            home_id=item.home_id,
            metadata={**(item.metadata or {}), "evidence_support_only": True, "no_raw_body": True},
        )

    def _from_inspection_gap(self, gap: InspectionEvidenceGap) -> Reg45ReviewGap:
        section_type: Reg45ReviewSectionType = "summary"
        if gap.sccif_judgement_area == "helped_and_protected":
            section_type = "safeguarding_protection"
        elif gap.sccif_judgement_area == "leadership_management":
            section_type = "workforce_leadership"
        elif gap.sccif_judgement_area == "overall_experiences_progress":
            section_type = "progress_outcomes"
        return Reg45ReviewGap(
            id=f"revgap:{gap.id}",
            title=gap.title,
            description=gap.description,
            section_type=section_type,
            quality_standard=gap.quality_standard,
            risk=gap.risk,
            route=gap.route,
            action_label=gap.action_label,
            recommended_action=gap.recommended_action,
            metadata={**(gap.metadata or {}), "potential_gap": True},
        )

    def collect_evidence(
        self,
        current_user: dict[str, Any],
        request: Reg45ReviewCreateRequest | None = None,
        conn: Any | None = None,
    ) -> list[Reg45ReviewEvidenceItem]:
        items: list[Reg45ReviewEvidenceItem] = []
        try:
            from services.inspection_readiness_service import inspection_readiness_service

            filt = InspectionReadinessFilters(
                period_start=request.period_start if request else None,
                period_end=request.period_end if request else None,
                home_id=request.home_id if request else None,
                limit=100,
            )
            if request and request.from_inspection_pack_id:
                pack = inspection_readiness_service.get_pack_by_id(
                    request.from_inspection_pack_id, current_user, conn=conn
                )
                if pack:
                    for section in pack.sections:
                        for raw in section.evidence_items:
                            items.append(self._from_inspection_item(raw))
                    return items
            pack = inspection_readiness_service.generate_reg45_pack(current_user, filt, conn=conn)
            for section in pack.sections:
                for raw in section.evidence_items:
                    items.append(self._from_inspection_item(raw))
        except Exception as exc:
            logger.debug("reg45_collect_inspection_skipped: %s", exc)

        items.append(
            Reg45ReviewEvidenceItem(
                id="hint:reg45_workspace",
                title="Reg 45 review workflow",
                safe_summary=(
                    "Structured quality of care review builder — draft only. "
                    "Manager review needed — not a compliance decision."
                ),
                source_module="reg45_quality_review",
                route=ROUTES["workspace"],
                action_label="Open Reg 45 review",
                section_types=["summary"],
                evidence_strength="route_hint_only",
                metadata={"route_hint": True},
            )
        )
        return items

    def identify_gaps(self, evidence_items: list[Reg45ReviewEvidenceItem]) -> list[Reg45ReviewGap]:
        gaps: list[Reg45ReviewGap] = []
        section_types = {s["section_type"] for s in REG45_REVIEW_SECTIONS}
        covered: set[Reg45ReviewSectionType] = set()
        for item in evidence_items:
            for st in reg45_quality_review_registry_service.map_evidence_to_sections(item):
                covered.add(st)
        for tmpl in REG45_REVIEW_SECTIONS:
            st = tmpl["section_type"]  # type: ignore[assignment]
            if st not in covered and st not in ("provider_ri_review", "final_reflections", "improvement_actions"):
                gaps.append(
                    Reg45ReviewGap(
                        id=f"reg45-gap:{st}",
                        title=f"Potential gap: {tmpl['title']}",
                        description=(
                            f"No mapped evidence in scope for {tmpl['title']}. "
                            "May support review — requires source review."
                        ),
                        section_type=st,  # type: ignore[arg-type]
                        risk="medium",
                        route=ROUTES.get("governance", "/record/governance"),
                        action_label="Review recording",
                        recommended_action="Manager review needed for this review section.",
                    )
                )
        draft_count = sum(
            1 for i in evidence_items if i.evidence_strength in {"draft_only", "prompt_only"}
        )
        if draft_count > 3:
            gaps.append(
                Reg45ReviewGap(
                    id="reg45-gap:draft_volume",
                    title="High volume of draft-only evidence",
                    description=(
                        f"{draft_count} draft or prompt-only items in scope. "
                        "Draft only — not completed review evidence."
                    ),
                    section_type="workforce_leadership",
                    risk="medium",
                    route="/record/drafts",
                    recommended_action="Manager review needed before treating drafts as evidence.",
                )
            )
        if "provider_ri_review" in section_types:
            gaps.append(
                Reg45ReviewGap(
                    id="reg45-gap:ri_review",
                    title="RI/provider review needed",
                    description=(
                        "Responsible Individual or provider review should consider this draft review. "
                        "Not a statutory conclusion."
                    ),
                    section_type="provider_ri_review",
                    risk="medium",
                    route=ROUTES["workspace"],
                    recommended_action="RI/provider review needed before finalising.",
                )
            )
        return gaps

    def build_improvement_action_drafts(self, gaps: list[Reg45ReviewGap]) -> list[Reg45ImprovementActionDraft]:
        drafts: list[Reg45ImprovementActionDraft] = []
        for gap in gaps[:8]:
            if gap.section_type in ("provider_ri_review", "final_reflections"):
                continue
            drafts.append(
                Reg45ImprovementActionDraft(
                    id=f"reg45act:{gap.id}",
                    title=gap.title[:120],
                    description=gap.recommended_action or gap.description,
                    source_gap_id=gap.id,
                    priority="high" if gap.risk in {"urgent", "high"} else "medium",
                    suggested_owner_role="registered_manager",
                    due_in_days=14 if gap.risk in {"urgent", "high"} else 30,
                    route=gap.route,
                    action_label=gap.action_label or "Review gap",
                    metadata={"draft_only": True, "not_auto_accepted": True},
                )
            )
        return drafts

    def build_sections(
        self,
        evidence_items: list[Reg45ReviewEvidenceItem],
        gaps: list[Reg45ReviewGap],
        improvement_actions: list[Reg45ImprovementActionDraft],
    ) -> list[Reg45ReviewSection]:
        sections: list[Reg45ReviewSection] = []
        for tmpl in REG45_REVIEW_SECTIONS:
            st = tmpl["section_type"]  # type: ignore[assignment]
            section_items = [
                i
                for i in evidence_items
                if st in reg45_quality_review_registry_service.map_evidence_to_sections(i)
            ][:12]
            section_gaps = [g for g in gaps if g.section_type == st][:5]
            section_actions = [
                a for a in improvement_actions if a.source_gap_id and a.source_gap_id in {g.id for g in section_gaps}
            ]
            warnings: list[str] = []
            if any(i.evidence_strength in {"draft_only", "prompt_only"} for i in section_items):
                warnings.append("Draft-only items present — not completed evidence.")
            if st in ("provider_ri_review", "final_reflections"):
                warnings.append("Manager or RI/provider review needed — not auto-generated conclusions.")
            sections.append(
                Reg45ReviewSection(
                    id=tmpl["id"],
                    title=tmpl["title"],
                    section_type=st,  # type: ignore[arg-type]
                    summary=tmpl["summary"],
                    evidence_items=section_items,
                    gaps=section_gaps,
                    improvement_actions=section_actions,
                    warnings=warnings,
                    metadata={"draft_section": True},
                )
            )
        return sections

    def _review_counts(
        self,
        items: list[Reg45ReviewEvidenceItem],
        gaps: list[Reg45ReviewGap],
        actions: list[Reg45ImprovementActionDraft],
    ) -> dict[str, int]:
        return {
            "evidence_count": len(items),
            "gap_count": len(gaps),
            "draft_only_count": sum(
                1 for i in items if i.evidence_strength in {"draft_only", "prompt_only"}
            ),
            "improvement_action_count": len(actions),
            "review_required_count": sum(
                1 for i in items if i.review_required or i.manager_review_required
            ),
            "safeguarding_review_count": sum(1 for i in items if i.safeguarding_review_required),
        }

    def generate_from_inspection_pack(
        self,
        pack: Any,
        current_user: dict[str, Any],
        request: Reg45ReviewCreateRequest | None = None,
        conn: Any | None = None,
    ) -> Reg45QualityReview:
        _ = conn
        items: list[Reg45ReviewEvidenceItem] = []
        for section in pack.sections:
            for raw in section.evidence_items:
                items.append(self._from_inspection_item(raw))
        gaps = self.identify_gaps(items)
        actions = self.build_improvement_action_drafts(gaps)
        sections = self.build_sections(items, gaps, actions)
        counts = self._review_counts(items, gaps, actions)
        return Reg45QualityReview(
            id=_review_id(),
            title=(
                request.title
                if request and request.title
                else reg45_quality_review_registry_service.default_title(
                    request.period_start if request else pack.period_start,
                    request.period_end if request else pack.period_end,
                )
            ),
            status="draft",
            generated_at=_now_iso(),
            period_start=(request.period_start if request else None) or pack.period_start,
            period_end=(request.period_end if request else None) or pack.period_end,
            home_id=current_user.get("home_id"),
            summary=(
                "Draft Reg 45 quality of care review assembled from inspection readiness evidence support. "
                "Evidence reviewed may support professional judgement — does not determine compliance."
            ),
            sections=sections,
            **counts,
            limitations=LIMITATIONS,
            privacy_notice=PRIVACY_NOTICE,
            official_sources=reg45_quality_review_registry_service.official_source_refs(),
            orb_prompts=reg45_quality_review_registry_service.orb_prompts(),
            routes=ROUTES,
            metadata={
                "source_pack_id": pack.id,
                "draft_only": True,
                "no_compliance_claim": True,
                "disclaimer": reg45_quality_review_registry_service.safe_review_disclaimer(),
            },
        )

    def generate_review(
        self,
        current_user: dict[str, Any],
        request: Reg45ReviewCreateRequest | None = None,
        conn: Any | None = None,
    ) -> Reg45QualityReview:
        req = request or Reg45ReviewCreateRequest()
        if req.from_inspection_pack_id:
            from services.inspection_readiness_service import inspection_readiness_service

            pack = inspection_readiness_service.get_pack_by_id(
                req.from_inspection_pack_id, current_user, conn=conn
            )
            if pack:
                review = self.generate_from_inspection_pack(pack, current_user, req, conn=conn)
                if req.save_draft:
                    review, _ = self.save_review(review, current_user, conn=conn)
                if req.create_improvement_actions:
                    ids, warn = self.create_actions_from_gaps(review, current_user, conn=conn)
                    review.metadata["action_ids"] = ids
                    if warn:
                        review.metadata.setdefault("warnings", []).append(warn)
                return review
        items = self.collect_evidence(current_user, req, conn=conn)
        gaps = self.identify_gaps(items)
        actions = self.build_improvement_action_drafts(gaps)
        sections = self.build_sections(items, gaps, actions)
        counts = self._review_counts(items, gaps, actions)
        review = Reg45QualityReview(
            id=_review_id(),
            title=req.title or reg45_quality_review_registry_service.default_title(
                req.period_start, req.period_end
            ),
            status="draft",
            generated_at=_now_iso(),
            period_start=req.period_start,
            period_end=req.period_end,
            home_id=req.home_id or current_user.get("home_id"),
            summary=(
                "Draft Reg 45 quality of care review — evidence reviewed from inspection readiness, "
                "SCCIF alignment and operational metadata. Manager review needed."
            ),
            sections=sections,
            **counts,
            limitations=LIMITATIONS,
            privacy_notice=PRIVACY_NOTICE,
            official_sources=reg45_quality_review_registry_service.official_source_refs(),
            orb_prompts=reg45_quality_review_registry_service.orb_prompts(),
            routes=ROUTES,
            metadata={
                "draft_only": True,
                "no_compliance_claim": True,
                "disclaimer": reg45_quality_review_registry_service.safe_review_disclaimer(),
            },
        )
        if req.save_draft:
            review, _ = self.save_review(review, current_user, conn=conn)
        if req.create_improvement_actions:
            ids, warn = self.create_actions_from_gaps(review, current_user, conn=conn)
            review.metadata["action_ids"] = ids
            if warn:
                review.metadata.setdefault("warnings", []).append(warn)
        return review

    def build_dashboard(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> Reg45ReviewDashboard:
        _ = filters
        recent = self.list_reviews(current_user, limit=8, conn=conn)
        draft_count = sum(1 for r in recent if r.get("status") == "draft")
        ready_count = sum(1 for r in recent if r.get("status") == "ready_for_manager_review")
        ri_count = sum(1 for r in recent if r.get("status") == "ri_review_required")
        key_gaps: list[Reg45ReviewGap] = []
        try:
            items = self.collect_evidence(current_user, None, conn=conn)
            key_gaps = sorted(
                self.identify_gaps(items),
                key=lambda g: {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(g.risk, 4),
            )[:6]
        except Exception as exc:
            logger.debug("reg45_dashboard_gaps_skipped: %s", exc)
        return Reg45ReviewDashboard(
            generated_at=_now_iso(),
            summary=(
                "Reg 45 Quality of Care Review builder — structured draft review from safe evidence. "
                "Does not determine compliance or predict inspection outcomes."
            ),
            draft_review_count=draft_count,
            ready_for_manager_count=ready_count,
            ri_review_required_count=ri_count,
            recent_reviews=recent,
            key_gaps=key_gaps,
            recommendations=[
                "Generate a draft review from inspection readiness Reg 45 pack evidence.",
                "Mark ready for manager review when evidence themes are complete.",
                "Request RI review where provider oversight is needed — not a statutory conclusion.",
            ],
            limitations=LIMITATIONS,
            privacy_notice=PRIVACY_NOTICE,
            routes=ROUTES,
            metadata={"review_support_only": True},
        )

    def _persist_review(
        self,
        review: Reg45QualityReview,
        current_user: dict[str, Any],
        conn: Any | None,
        source_pack_id: str | None = None,
    ) -> tuple[bool, str | None]:
        if conn is None or not table_exists(conn, "reg45_quality_reviews"):
            _memory_reviews[review.id] = {
                "id": review.id,
                "title": review.title,
                "status": review.status,
                "review_json": review.model_dump(mode="json"),
                "created_at": review.generated_at,
                "updated_at": _now_iso(),
            }
            return True, None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO reg45_quality_reviews (
                        id, title, status, period_start, period_end, home_id,
                        generated_by_user_id, generated_by_name, summary,
                        evidence_count, gap_count, draft_only_count,
                        improvement_action_count, review_required_count,
                        safeguarding_review_count, review_json, source_pack_id, metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        status = EXCLUDED.status,
                        summary = EXCLUDED.summary,
                        evidence_count = EXCLUDED.evidence_count,
                        gap_count = EXCLUDED.gap_count,
                        draft_only_count = EXCLUDED.draft_only_count,
                        improvement_action_count = EXCLUDED.improvement_action_count,
                        review_required_count = EXCLUDED.review_required_count,
                        safeguarding_review_count = EXCLUDED.safeguarding_review_count,
                        review_json = EXCLUDED.review_json,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()
                    """,
                    (
                        review.id,
                        review.title,
                        review.status,
                        review.period_start,
                        review.period_end,
                        review.home_id,
                        _user_id(current_user),
                        current_user.get("name") or current_user.get("email"),
                        review.summary,
                        review.evidence_count,
                        review.gap_count,
                        review.draft_only_count,
                        review.improvement_action_count,
                        review.review_required_count,
                        review.safeguarding_review_count,
                        Json(review.model_dump(mode="json")),
                        source_pack_id or (review.metadata or {}).get("source_pack_id"),
                        Json(review.metadata or {}),
                    ),
                )
            conn.commit()
            return True, None
        except Exception as exc:
            logger.debug("reg45_review_persist_failed: %s", exc)
            try:
                conn.rollback()
            except Exception:
                pass
            return False, str(exc)

    def save_review(
        self,
        review: Reg45QualityReview,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> tuple[Reg45QualityReview, list[str]]:
        warnings: list[str] = []
        ok, err = self._persist_review(
            review,
            current_user,
            conn,
            source_pack_id=(review.metadata or {}).get("source_pack_id"),
        )
        if not ok:
            warnings.append(f"Review not persisted: {err or 'table unavailable'}.")
        elif conn is None or not table_exists(conn, "reg45_quality_reviews"):
            warnings.append(
                "Review saved in session memory — apply sql/092_reg45_quality_reviews.sql for persistence."
            )
        if warnings:
            review.metadata.setdefault("warnings", []).extend(warnings)
        return review, warnings

    def get_review(
        self,
        review_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> Reg45QualityReview | None:
        _ = current_user
        if conn is not None and table_exists(conn, "reg45_quality_reviews"):
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT review_json FROM reg45_quality_reviews WHERE id = %s LIMIT 1",
                        (review_id,),
                    )
                    row = cur.fetchone()
                    if row:
                        return Reg45QualityReview.model_validate(row["review_json"])
            except Exception as exc:
                logger.debug("reg45_review_fetch_failed: %s", exc)
        stored = _memory_reviews.get(review_id)
        if stored:
            return Reg45QualityReview.model_validate(stored["review_json"])
        return None

    def list_reviews(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        limit: int = 20,
        conn: Any | None = None,
    ) -> list[dict[str, Any]]:
        _ = filters
        if conn is not None and table_exists(conn, "reg45_quality_reviews"):
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT id, title, status, evidence_count, gap_count,
                               improvement_action_count, created_at, updated_at
                        FROM reg45_quality_reviews
                        WHERE generated_by_user_id = %s OR home_id = %s
                        ORDER BY updated_at DESC
                        LIMIT %s
                        """,
                        (_user_id(current_user), current_user.get("home_id"), limit),
                    )
                    return [dict(row) for row in cur.fetchall()]
            except Exception as exc:
                logger.debug("reg45_list_db_failed: %s", exc)
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "status": r["status"],
                "evidence_count": r["review_json"].get("evidence_count", 0),
                "gap_count": r["review_json"].get("gap_count", 0),
                "improvement_action_count": r["review_json"].get("improvement_action_count", 0),
                "created_at": r.get("created_at"),
                "updated_at": r.get("updated_at"),
            }
            for r in sorted(
                _memory_reviews.values(),
                key=lambda x: x.get("updated_at", ""),
                reverse=True,
            )[:limit]
        ]

    def update_review(
        self,
        review_id: str,
        request: Reg45ReviewUpdateRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> Reg45QualityReview | None:
        review = self.get_review(review_id, current_user, conn=conn)
        if not review:
            return None
        if request.status:
            review.status = request.status
        if request.sections is not None:
            review.sections = request.sections
        if request.metadata:
            review.metadata.update(request.metadata)
        if request.reviewer_notes:
            for section in review.sections:
                if section.section_type == "final_reflections":
                    section.reviewer_notes = request.reviewer_notes
        self.save_review(review, current_user, conn=conn)
        return review

    def record_review_event(
        self,
        review: Reg45QualityReview,
        action: str,
        current_user: dict[str, Any],
        previous_status: str | None = None,
        conn: Any | None = None,
        note: str | None = None,
    ) -> None:
        event_meta = {
            "review_id": review.id,
            "evidence_count": review.evidence_count,
            "gap_count": review.gap_count,
            "no_raw_body": True,
        }
        if conn is not None and table_exists(conn, "reg45_quality_review_events"):
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO reg45_quality_review_events (
                            id, review_id, action, previous_status, new_status,
                            note, actor_user_id, actor_name, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            _event_id(),
                            review.id,
                            action,
                            previous_status,
                            review.status,
                            note,
                            _user_id(current_user),
                            current_user.get("name") or current_user.get("email"),
                            Json(event_meta),
                        ),
                    )
                conn.commit()
            except Exception as exc:
                logger.debug("reg45_event_persist_failed: %s", exc)

    def apply_action(
        self,
        review_id: str,
        action_request: Reg45ReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> Reg45ReviewActionResponse:
        review = self.get_review(review_id, current_user, conn=conn)
        if not review:
            return Reg45ReviewActionResponse(
                success=False,
                message="Review not found.",
                warnings=["Review not found."],
            )
        previous = review.status
        action = action_request.action
        warnings: list[str] = []
        action_ids: list[str] = []

        transitions = {
            "mark_ready_for_manager_review": "ready_for_manager_review",
            "mark_manager_reviewed": "manager_reviewed",
            "request_ri_review": "ri_review_required",
            "mark_ri_reviewed": "ri_reviewed",
            "finalise": "finalised",
            "archive": "archived",
        }
        if action in transitions:
            review.status = transitions[action]  # type: ignore[assignment]
            if action == "finalise":
                review.metadata["finalised_note"] = (
                    "Finalised draft — requires manager/provider review. "
                    "Not statutory approval or compliance decision."
                )
            self.save_review(review, current_user, conn=conn)
            self.record_review_event(
                review, action, current_user, previous_status=previous, conn=conn, note=action_request.note
            )
        elif action == "create_actions_from_gaps":
            action_ids, warn = self.create_actions_from_gaps(review, current_user, conn=conn)
            if warn:
                warnings.append(warn)
        else:
            warnings.append(f"Unknown action: {action}")

        return Reg45ReviewActionResponse(
            success=True,
            review=review,
            previous_status=previous,
            new_status=review.status,
            action_ids=action_ids,
            warnings=warnings,
            message=reg45_quality_review_registry_service.status_labels().get(
                review.status, review.status
            ),
        )

    def create_actions_from_gaps(
        self,
        review: Reg45QualityReview,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> tuple[list[str], str | None]:
        all_gaps: list[Reg45ReviewGap] = []
        for section in review.sections:
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
                        action_type="reg45_review_gap",
                        priority="high" if gap.risk in {"urgent", "high"} else "medium",
                        source_service="reg45_quality_review",
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
            logger.debug("reg45_create_actions_skipped: %s", exc)
            return [], "Create actions from gaps is not fully wired in this environment."

    def export_markdown(self, review: Reg45QualityReview) -> str:
        lines = [
            f"# {review.title}",
            "",
            f"*{reg45_quality_review_registry_service.safe_review_disclaimer()}*",
            "",
            f"**Status:** {reg45_quality_review_registry_service.status_labels().get(review.status, review.status)}",
            f"**Generated:** {review.generated_at}",
            "",
            review.summary,
            "",
            "> Draft review — requires manager/provider review. Not a compliance decision.",
            "",
        ]
        for section in review.sections:
            lines.append(f"## {section.title}")
            lines.append(section.summary)
            if section.warnings:
                lines.append(f"> {' '.join(section.warnings)}")
            for item in section.evidence_items:
                draft = (
                    " (Draft only)"
                    if item.evidence_strength in {"draft_only", "prompt_only"}
                    else ""
                )
                lines.append(f"- **Evidence reviewed — {item.title}**{draft}: {item.safe_summary}")
            for gap in section.gaps:
                lines.append(f"- **Potential gap:** {gap.title} — {gap.description}")
            for action in section.improvement_actions:
                lines.append(f"- **Improvement draft:** {action.title} — {action.description}")
            lines.append("")
        lines.append("---")
        lines.append("Professional judgement remains required. This export is not a statutory conclusion.")
        return "\n".join(lines)


reg45_quality_review_service = Reg45QualityReviewService()

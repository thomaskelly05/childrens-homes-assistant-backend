from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from db import orb_feedback_db
from services.orb_feedback_improvement_service import orb_feedback_improvement_service
from services.orb_billing_meter_service import orb_billing_meter_service
from services.orb_improvement_candidate_service import orb_improvement_candidate_service

logger = logging.getLogger("indicare.orb_admin_quality")


class OrbAdminQualityService:
    def list_feedback_items(
        self,
        *,
        days: int | None = 30,
        rating: str | None = None,
        reason: str | None = None,
        mode: str | None = None,
        prompt_tier: str | None = None,
        detected_family: str | None = None,
        action_id: str | None = None,
        document_lens: str | None = None,
        reviewed: bool | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        parsed_from = self._parse_date(date_from)
        parsed_to = self._parse_date(date_to)
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            from services.orb_feedback_service import orb_feedback_service

            rows = orb_feedback_service.list_feedback(days=days or 30, rating=rating)
            return self._filter_memory_rows(
                rows,
                reason=reason,
                mode=mode,
                prompt_tier=prompt_tier,
                detected_family=detected_family,
                action_id=action_id,
                document_lens=document_lens,
                reviewed=reviewed,
            )[offset : offset + limit]
        try:
            rows = orb_feedback_db.safe_list_orb_feedback(
                conn,
                days=days if not parsed_from and not parsed_to else None,
                rating=rating,
                reason=reason,
                mode=mode,
                prompt_tier=prompt_tier,
                detected_family=detected_family,
                action_id=action_id,
                document_lens=document_lens,
                reviewed=reviewed,
                date_from=parsed_from,
                date_to=parsed_to,
                limit=limit,
                offset=offset,
            )
            return rows or []
        finally:
            release_db_connection(conn)

    def build_summary(self, *, days: int = 30) -> dict[str, Any]:
        from services.orb_feedback_service import orb_feedback_service

        batch = orb_feedback_service.list_feedback(days=days)
        summary = orb_feedback_improvement_service.build_admin_summary(batch, days=days)
        down = [r for r in batch if r.get("rating") == "down"]
        summary["helpful_ratio"] = summary.pop("thumbs_up_ratio", 0.0)
        summary["top_downvote_reasons"] = summary.get("top_reasons") or []
        summary["top_modes_with_downvotes"] = self._top_modes(down)
        summary["top_scenario_families_with_downvotes"] = summary.get("top_scenario_families") or []
        summary["top_document_lenses_with_downvotes"] = self._top_document_lenses(down)
        summary["source_citation_complaints"] = sum(
            1 for r in down if r.get("reason") == "incorrect_source"
        )
        summary["unsafe_answer_complaints"] = sum(1 for r in down if r.get("reason") == "unsafe")
        summary["role_fit_complaints"] = sum(1 for r in down if r.get("reason") == "wrong_role")
        summary["downvotes_this_week"] = sum(
            1 for r in down if self._within_days(r.get("created_at"), 7)
        )
        summary["improvement_candidates"] = orb_improvement_candidate_service.list_candidates(limit=50)
        usage = orb_billing_meter_service.admin_usage_summary(days=days)
        summary["cost_this_month"] = usage.get("estimated_total_cost", 0)
        summary["estimated_usage_this_month"] = usage.get("total_requests", 0)
        summary["usage_summary"] = usage
        return summary

    def mark_feedback_reviewed(
        self,
        *,
        feedback_id: int,
        reviewed_by: int | None,
        reviewer_note: str | None = None,
    ) -> dict[str, Any] | None:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return None
        try:
            row = orb_feedback_db.safe_mark_orb_feedback_reviewed(
                conn,
                feedback_id=feedback_id,
                reviewed_by=reviewed_by,
                reviewer_note=reviewer_note,
            )
            if row:
                conn.commit()
            return row
        finally:
            release_db_connection(conn)

    def _top_modes(self, down: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: dict[str, int] = {}
        for row in down:
            mode = str(row.get("mode") or "").strip()
            if mode:
                counter[mode] = counter.get(mode, 0) + 1
        return [{"mode": k, "count": v} for k, v in sorted(counter.items(), key=lambda x: x[1], reverse=True)]

    def _top_document_lenses(self, down: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: dict[str, int] = {}
        for row in down:
            lens = str(row.get("document_lens") or "").strip()
            if lens:
                counter[lens] = counter.get(lens, 0) + 1
        return [{"document_lens": k, "count": v} for k, v in sorted(counter.items(), key=lambda x: x[1], reverse=True)]

    def _filter_memory_rows(self, rows: list[dict[str, Any]], **filters: Any) -> list[dict[str, Any]]:
        result = rows
        for key, value in filters.items():
            if value is None:
                continue
            result = [r for r in result if r.get(key) == value]
        return result

    def _parse_date(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    def _within_days(self, created_at: Any, days: int) -> bool:
        if not created_at:
            return True
        try:
            if isinstance(created_at, str):
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            else:
                dt = created_at
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            return (datetime.now(timezone.utc) - dt).days <= days
        except (ValueError, TypeError):
            return False


orb_admin_quality_service = OrbAdminQualityService()

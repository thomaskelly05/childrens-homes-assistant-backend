"""Aggregate IndiCare Intelligence AI governance metrics for leadership dashboards."""

from __future__ import annotations

import logging
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_status
from schemas.indicare_ai_governance import (
    AiGovernanceActionMetric,
    AiGovernanceAlert,
    AiGovernanceCitationMetric,
    AiGovernanceCostMetric,
    AiGovernanceDashboardResponse,
    AiGovernanceDashboardSummary,
    AiGovernanceFilter,
    AiGovernanceHealth,
    AiGovernanceOutputMetric,
    AiGovernanceQualityMetric,
    AiGovernanceSafetyMetric,
    AiGovernanceSourceMetric,
    AiGovernanceUsageMetric,
)
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

logger = logging.getLogger("indicare.ai_governance_dashboard")


def _safe_source_summary(source: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": source.get("id"),
        "title": source.get("title"),
        "source_type": source.get("source_type"),
        "governance_status": source.get("governance_status"),
        "official": source.get("official"),
        "status": source.get("status"),
    }


class IndicareAiGovernanceDashboardService:
    def build_dashboard(
        self,
        filters: AiGovernanceFilter | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceDashboardResponse:
        filters = filters or AiGovernanceFilter()
        health = self.build_health(conn=conn)
        degraded = health.status != "ready"
        warning = health.warnings[0] if health.warnings else None
        try:
            usage = self.build_usage_metrics(filters, current_user, conn=conn)
            quality = self.build_quality_metrics(filters, current_user, conn=conn)
            cost = self.build_cost_metrics(filters, current_user, conn=conn)
            safety = self.build_safety_metrics(filters, current_user, conn=conn)
            citations = self.build_citation_metrics(filters, current_user, conn=conn)
            sources = self.build_source_metrics(filters, current_user, conn=conn)
            outputs = self.build_output_metrics(filters, current_user, conn=conn)
            actions = self.build_action_metrics(filters, current_user, conn=conn)
            alerts = self.build_alerts(filters, current_user, conn=conn)
            recommendations = self.build_recommendations(filters, current_user, conn=conn)
            recent_events = indicare_ai_governance_event_service.get_recent_events(
                AiGovernanceFilter(**{**filters.model_dump(), "limit": min(filters.limit, 25)}),
                conn=conn,
            )
            summary = AiGovernanceDashboardSummary(
                total_ai_requests=usage.total_events,
                standalone_requests=usage.standalone_requests,
                operational_requests=usage.operational_requests,
                agent_runs=usage.agent_runs,
                deep_research_runs=usage.deep_research_runs,
                document_analyses=usage.document_analyses,
                saved_outputs_count=outputs.saved_outputs_count,
                operational_outputs_count=outputs.operational_outputs_count,
                awaiting_review_count=outputs.awaiting_review_count,
                actions_created_count=actions.actions_created_count,
                sources_needing_review_count=sources.sources_needing_review_count,
                expired_sources_count=sources.expired_sources_count,
                summary_only_source_count=sources.summary_only_source_count,
                average_quality_score=quality.average_quality_score,
                citation_coverage=citations.citation_coverage,
                fallback_rate=usage.fallback_rate,
                high_risk_prompt_count=safety.high_risk_prompt_count,
                safeguarding_flag_count=safety.safeguarding_flag_count,
                boundary_warning_count=safety.boundary_warning_count,
                estimated_cost_tier_summary=cost.estimated_cost_tier_summary,
                average_latency_ms=usage.average_latency_ms,
            )
            return AiGovernanceDashboardResponse(
                summary=summary,
                usage=usage,
                quality=quality,
                cost=cost,
                safety=safety,
                citations=citations,
                sources=sources,
                outputs=outputs,
                actions=actions,
                alerts=alerts,
                recommendations=recommendations,
                recent_events=recent_events,
                health=health,
                degraded=degraded,
                warning=warning,
            )
        except Exception as exc:
            logger.warning("AI governance dashboard degraded: %s", exc)
            return self._degraded_dashboard(filters, health, str(exc))

    def _degraded_dashboard(
        self,
        filters: AiGovernanceFilter,
        health: AiGovernanceHealth,
        message: str,
    ) -> AiGovernanceDashboardResponse:
        health.status = "degraded"
        health.warnings = list(health.warnings) + [message[:200]]
        empty_summary = AiGovernanceDashboardSummary()
        empty_usage = AiGovernanceUsageMetric()
        empty_quality = AiGovernanceQualityMetric()
        empty_cost = AiGovernanceCostMetric()
        empty_safety = AiGovernanceSafetyMetric()
        empty_citations = AiGovernanceCitationMetric()
        empty_sources = AiGovernanceSourceMetric()
        empty_outputs = AiGovernanceOutputMetric()
        empty_actions = AiGovernanceActionMetric()
        return AiGovernanceDashboardResponse(
            summary=empty_summary,
            usage=empty_usage,
            quality=empty_quality,
            cost=empty_cost,
            safety=empty_safety,
            citations=empty_citations,
            sources=empty_sources,
            outputs=empty_outputs,
            actions=empty_actions,
            alerts=[
                AiGovernanceAlert(
                    id="degraded-dashboard",
                    level="medium",
                    title="Governance dashboard degraded",
                    message=message,
                )
            ],
            recommendations=["Retry when database and provider services are available."],
            recent_events=[],
            health=health,
            degraded=True,
            warning=message,
        )

    def build_health(self, *, conn: Any | None = None) -> AiGovernanceHealth:
        _ = conn
        db_status = get_db_status()
        db_available = bool(db_status.get("available"))
        pool_pressure = bool(db_status.get("pool_pressure"))
        warnings: list[str] = []
        storage_mode = "postgresql" if db_available else "memory"
        status: str = "ready"
        if not db_available:
            storage_mode = "memory"
            status = "degraded"
            warnings.append("Database unavailable; governance events use in-memory fallback.")
        elif pool_pressure:
            status = "degraded"
            warnings.append("Database pool under pressure; some aggregates may be delayed.")
        events_table = db_available
        if db_available:
            try:
                from db.connection import get_db_connection, release_db_connection

                c = get_db_connection()
                try:
                    with c.cursor() as cur:
                        cur.execute(
                            """
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = 'public' AND table_name = 'indicare_ai_governance_events'
                            """
                        )
                        events_table = cur.fetchone() is not None
                finally:
                    release_db_connection(c)
            except DatabaseUnavailableError:
                events_table = False
                status = "degraded"
            except Exception:
                events_table = False
        if db_available and not events_table:
            warnings.append("Governance events table not migrated; apply sql/078_indicare_ai_governance.sql")
        return AiGovernanceHealth(
            status=status,  # type: ignore[arg-type]
            storage_mode=storage_mode,
            events_table_available=events_table,
            database_available=db_available,
            warnings=warnings,
        )

    def build_usage_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceUsageMetric:
        _ = current_user
        summary = indicare_ai_governance_event_service.get_events_summary(filters, conn=conn)
        by_surface = summary.get("events_by_surface") or {}
        return AiGovernanceUsageMetric(
            total_events=int(summary.get("total") or 0),
            events_by_surface=by_surface,
            events_by_task_type=summary.get("events_by_task_type") or {},
            standalone_requests=int(by_surface.get("standalone_orb", 0))
            + int(by_surface.get("document_understanding", 0))
            + int(by_surface.get("agents", 0))
            + int(by_surface.get("deep_research", 0))
            + int(by_surface.get("saved_outputs", 0)),
            operational_requests=int(by_surface.get("operational_orb", 0)),
            agent_runs=int(by_surface.get("agents", 0)),
            deep_research_runs=int(by_surface.get("deep_research", 0)),
            document_analyses=int(by_surface.get("document_understanding", 0)),
            fallback_rate=float(summary.get("fallback_rate") or 0.0),
            average_latency_ms=summary.get("average_latency_ms"),
            model_provider_distribution=summary.get("model_provider_distribution") or {},
            model_name_distribution=summary.get("model_name_distribution") or {},
        )

    def build_quality_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceQualityMetric:
        _ = current_user
        summary = indicare_ai_governance_event_service.get_events_summary(filters, conn=conn)
        events = indicare_ai_governance_event_service.get_recent_events(
            AiGovernanceFilter(**{**filters.model_dump(), "limit": 500}),
            conn=conn,
        )
        low_quality = 0
        missing_citations = 0
        for event in events:
            if event.evaluation_score is not None and event.evaluation_score < 0.55:
                low_quality += 1
            if event.citation_count <= 0 and event.event_type.endswith("conversation"):
                missing_citations += 1
        total = int(summary.get("total") or 0) or len(events) or 1
        return AiGovernanceQualityMetric(
            average_quality_score=summary.get("average_quality_score"),
            low_quality_output_count=low_quality,
            missing_citation_count=missing_citations,
            citation_coverage=float(summary.get("citation_coverage") or 0.0),
            evaluation_count=sum(1 for e in events if e.evaluation_score is not None),
        )

    def build_cost_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceCostMetric:
        _ = current_user
        summary = indicare_ai_governance_event_service.get_events_summary(filters, conn=conn)
        events = indicare_ai_governance_event_service.get_recent_events(
            AiGovernanceFilter(**{**filters.model_dump(), "limit": 500}),
            conn=conn,
        )
        quality_tiers: dict[str, int] = {}
        for event in events:
            tier = event.quality_tier or "unknown"
            quality_tiers[tier] = quality_tiers.get(tier, 0) + 1
        fallback_count = sum(1 for e in events if e.fallback_used)
        return AiGovernanceCostMetric(
            estimated_cost_tier_summary=summary.get("estimated_cost_tier_summary") or {},
            quality_tier_summary=quality_tiers,
            fallback_count=fallback_count,
        )

    def build_safety_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceSafetyMetric:
        _ = current_user
        summary = indicare_ai_governance_event_service.get_events_summary(filters, conn=conn)
        events = indicare_ai_governance_event_service.get_recent_events(
            AiGovernanceFilter(**{**filters.model_dump(), "limit": 500}),
            conn=conn,
        )
        flags_by_type: dict[str, int] = {}
        for event in events:
            for flag in event.safety_flags:
                key = str(flag)[:80]
                flags_by_type[key] = flags_by_type.get(key, 0) + 1
        high_risk_events = sum(1 for e in events if e.risk_level in {"high", "critical"})
        return AiGovernanceSafetyMetric(
            high_risk_prompt_count=int(summary.get("high_risk_prompt_count") or 0),
            safeguarding_flag_count=int(summary.get("safeguarding_flag_count") or 0),
            boundary_warning_count=int(summary.get("boundary_warning_count") or 0),
            high_risk_event_count=high_risk_events,
            safety_flags_by_type=flags_by_type,
        )

    def build_citation_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceCitationMetric:
        _ = current_user
        summary = indicare_ai_governance_event_service.get_events_summary(filters, conn=conn)
        events = indicare_ai_governance_event_service.get_recent_events(
            AiGovernanceFilter(**{**filters.model_dump(), "limit": 500}),
            conn=conn,
        )
        citation_counts = [e.citation_count for e in events]
        official = sum(e.official_source_count for e in events)
        summary_only = sum(e.summary_only_source_count for e in events)
        missing = sum(1 for e in events if e.citation_count <= 0)
        avg_citations = round(sum(citation_counts) / len(citation_counts), 2) if citation_counts else 0.0
        return AiGovernanceCitationMetric(
            citation_coverage=float(summary.get("citation_coverage") or 0.0),
            average_citation_count=avg_citations,
            official_source_usage_count=official,
            summary_only_source_count=summary_only,
            missing_citation_events=missing,
        )

    def build_source_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceSourceMetric:
        _ = (filters, current_user, conn)
        try:
            from services.orb_knowledge_library_service import orb_knowledge_library_service

            needing = orb_knowledge_library_service.list_sources_needing_review()
            expired = orb_knowledge_library_service.list_expired_sources()
            official = orb_knowledge_library_service.list_official_sources()
            all_sources = orb_knowledge_library_service.list_sources()
            summary_only = sum(
                1
                for s in all_sources
                if s.get("summary_only") or s.get("retrieval_mode") == "summary_only"
            )
            return AiGovernanceSourceMetric(
                sources_needing_review_count=len(needing),
                expired_sources_count=len(expired),
                summary_only_source_count=summary_only,
                official_sources_count=len(official),
                sources_needing_review=[_safe_source_summary(s) for s in needing[:12]],
            )
        except Exception as exc:
            logger.warning("Source governance metrics unavailable: %s", exc)
            return AiGovernanceSourceMetric()

    def build_output_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceOutputMetric:
        _ = filters
        saved_count = 0
        operational_count = 0
        awaiting_review = 0
        try:
            from services.orb_saved_output_service import orb_saved_output_service

            saved_count = orb_saved_output_service.health().output_count
        except Exception:
            pass
        try:
            from schemas.orb_operational_outputs import OrbOperationalOutputListRequest
            from services.orb_operational_output_service import orb_operational_output_service

            op_summary = orb_operational_output_service.get_summary(current_user, conn=conn)
            operational_count = int(op_summary.get("total") or 0)
            awaiting_review = int(op_summary.get("awaiting_review") or 0)
        except Exception:
            pass
        actions_created = 0
        try:
            from services.intelligence_action_service import intelligence_action_service

            actions_created = len(intelligence_action_service.list_actions(limit=500, conn=conn))
        except Exception:
            pass
        return AiGovernanceOutputMetric(
            saved_outputs_count=saved_count,
            operational_outputs_count=operational_count,
            awaiting_review_count=awaiting_review,
            actions_created_count=actions_created,
        )

    def build_action_metrics(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceActionMetric:
        outputs = self.build_output_metrics(filters, current_user, conn=conn)
        proposed = 0
        try:
            from services.intelligence_action_service import intelligence_action_service

            summary = intelligence_action_service.build_action_summary(conn=conn)
            proposed = int(summary.proposed_count or 0)
            created = int(summary.total or 0)
        except Exception:
            created = outputs.actions_created_count
        return AiGovernanceActionMetric(
            actions_created_count=outputs.actions_created_count,
            actions_from_ai_count=created,
            proposed_actions_count=proposed,
        )

    def build_alerts(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> list[AiGovernanceAlert]:
        alerts: list[AiGovernanceAlert] = []
        health = self.build_health(conn=conn)
        if health.status == "degraded":
            for warning in health.warnings:
                alerts.append(
                    AiGovernanceAlert(
                        id=f"health-{len(alerts)}",
                        level="medium",
                        title="Platform health",
                        message=warning,
                    )
                )
        usage = self.build_usage_metrics(filters, current_user, conn=conn)
        if usage.fallback_rate > 0.15 and usage.total_events >= 5:
            alerts.append(
                AiGovernanceAlert(
                    id="high-fallback-rate",
                    level="medium",
                    title="Elevated model fallback rate",
                    message=f"Fallback rate is {round(usage.fallback_rate * 100, 1)}% in the selected period.",
                    surface="model_router",
                )
            )
        sources = self.build_source_metrics(filters, current_user, conn=conn)
        if sources.expired_sources_count:
            alerts.append(
                AiGovernanceAlert(
                    id="expired-sources",
                    level="high",
                    title="Expired knowledge sources",
                    message=f"{sources.expired_sources_count} official source(s) are expired.",
                    surface="knowledge_library",
                )
            )
        if sources.sources_needing_review_count:
            alerts.append(
                AiGovernanceAlert(
                    id="sources-needing-review",
                    level="medium",
                    title="Sources awaiting governance review",
                    message=f"{sources.sources_needing_review_count} source(s) need review.",
                    surface="knowledge_library",
                )
            )
        outputs = self.build_output_metrics(filters, current_user, conn=conn)
        if outputs.awaiting_review_count:
            alerts.append(
                AiGovernanceAlert(
                    id="outputs-awaiting-review",
                    level="medium",
                    title="Operational outputs awaiting review",
                    message=f"{outputs.awaiting_review_count} operational output(s) await manager review.",
                    surface="operational_outputs",
                )
            )
        safety = self.build_safety_metrics(filters, current_user, conn=conn)
        if safety.high_risk_event_count:
            alerts.append(
                AiGovernanceAlert(
                    id="high-risk-events",
                    level="high",
                    title="High-risk AI interactions",
                    message=f"{safety.high_risk_event_count} high or critical risk event(s) recorded.",
                )
            )
        return alerts[:20]

    def build_recommendations(
        self,
        filters: AiGovernanceFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> list[str]:
        _ = current_user
        recs: list[str] = []
        sources = self.build_source_metrics(filters, current_user, conn=conn)
        quality = self.build_quality_metrics(filters, current_user, conn=conn)
        outputs = self.build_output_metrics(filters, current_user, conn=conn)
        if sources.sources_needing_review_count:
            recs.append("Review Knowledge Library sources flagged for governance approval.")
        if sources.expired_sources_count:
            recs.append("Refresh or archive expired official sources before they are used in RAG.")
        if quality.missing_citation_count > 3:
            recs.append("Encourage citation-backed answers for regulatory and safeguarding questions.")
        if outputs.awaiting_review_count:
            recs.append("Complete manager review for operational ORB outputs awaiting sign-off.")
        if not recs:
            recs.append("No urgent governance actions identified for the selected period.")
        return recs


indicare_ai_governance_dashboard_service = IndicareAiGovernanceDashboardService()

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from services.orb_plan_limits_service import orb_plan_limits_service

logger = logging.getLogger("indicare.orb_billing_meter")

_memory_events: list[dict[str, Any]] = []


class OrbBillingMeterService:
    """Read usage events and prepare billing meter summaries for subscriptions."""

    def _period_bounds(self) -> tuple[datetime, datetime]:
        now = datetime.now(timezone.utc)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
        return start, end

    def user_meter(self, *, user_id: int, user: dict[str, Any] | None = None) -> dict[str, Any]:
        period_start, period_end = self._period_bounds()
        stats = self._load_user_stats(user_id, period_start)
        plan_name = orb_plan_limits_service.resolve_plan_name(user)
        limit_state = orb_plan_limits_service.limit_state(
            plan_name=plan_name,
            user=user,
            daily_requests=int(stats.get("daily_requests") or 0),
            monthly_requests=int(stats.get("total_requests") or 0),
            monthly_deep=int(stats.get("deep_requests") or 0),
            monthly_document=int(stats.get("document_requests") or 0),
            monthly_deep_research=int(stats.get("deep_research_requests") or 0),
        )
        return {
            "user_id": user_id,
            "current_period_start": period_start.isoformat(),
            "current_period_end": period_end.isoformat(),
            "total_requests": int(stats.get("total_requests") or 0),
            "fast_requests": int(stats.get("fast_requests") or 0),
            "residential_requests": int(stats.get("residential_requests") or 0),
            "deep_requests": int(stats.get("deep_requests") or 0),
            "document_requests": int(stats.get("document_requests") or 0),
            "action_requests": int(stats.get("action_requests") or 0),
            "academy_nvq_requests": int(stats.get("academy_nvq_requests") or 0),
            "deep_research_requests": int(stats.get("deep_research_requests") or 0),
            "estimated_cost": round(float(stats.get("estimated_cost") or 0), 4),
            "estimated_tokens_in": int(stats.get("estimated_tokens_in") or 0),
            "estimated_tokens_out": int(stats.get("estimated_tokens_out") or 0),
            "daily_requests": int(stats.get("daily_requests") or 0),
            "prompt_tier_split": stats.get("prompt_tier_split") or {},
            "model_provider_split": stats.get("model_provider_split") or {},
            "top_expensive_actions": stats.get("top_expensive_actions") or [],
            **limit_state,
        }

    def admin_usage_summary(self, *, days: int = 30) -> dict[str, Any]:
        period_start, period_end = self._period_bounds()
        stats = self._load_admin_stats(days=days, period_start=period_start)
        return {
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "days": days,
            "total_active_users": int(stats.get("total_active_users") or 0),
            "total_requests": int(stats.get("total_requests") or 0),
            "estimated_total_cost": round(float(stats.get("estimated_total_cost") or 0), 4),
            "top_cost_users": stats.get("top_cost_users") or [],
            "top_cost_routes": stats.get("top_cost_routes") or [],
            "top_cost_actions": stats.get("top_cost_actions") or [],
            "plan_distribution": stats.get("plan_distribution") or {},
            "daily_usage_trend": stats.get("daily_usage_trend") or [],
            "prompt_tier_split": stats.get("prompt_tier_split") or {},
            "budget_warnings": stats.get("budget_warnings") or [],
        }

    def _load_user_stats(self, user_id: int, period_start: datetime) -> dict[str, Any]:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return self._memory_user_stats(user_id, period_start)
        try:
            return self._query_user_stats(conn, user_id, period_start)
        except Exception:
            logger.debug("ORB billing meter user stats unavailable", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return self._memory_user_stats(user_id, period_start)
        finally:
            release_db_connection(conn)

    def _load_admin_stats(self, *, days: int, period_start: datetime) -> dict[str, Any]:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return self._memory_admin_stats(days)
        try:
            return self._query_admin_stats(conn, days=days, period_start=period_start)
        except Exception:
            logger.debug("ORB billing meter admin stats unavailable", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return self._memory_admin_stats(days)
        finally:
            release_db_connection(conn)

    def _query_user_stats(self, conn, user_id: int, period_start: datetime) -> dict[str, Any]:
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE created_at >= %s) AS total_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s) AS daily_requests,
                    COALESCE(SUM(estimated_cost) FILTER (WHERE created_at >= %s), 0) AS estimated_cost,
                    COALESCE(SUM(tokens_in) FILTER (WHERE created_at >= %s), 0) AS estimated_tokens_in,
                    COALESCE(SUM(tokens_out) FILTER (WHERE created_at >= %s), 0) AS estimated_tokens_out,
                    COUNT(*) FILTER (WHERE created_at >= %s AND COALESCE(prompt_tier, metadata->>'prompt_tier') = 'fast') AS fast_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s AND COALESCE(prompt_tier, metadata->>'prompt_tier') = 'residential') AS residential_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s AND COALESCE(prompt_tier, metadata->>'prompt_tier') = 'deep') AS deep_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s AND COALESCE(prompt_tier, metadata->>'prompt_tier') = 'document') AS document_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s AND COALESCE(prompt_tier, metadata->>'prompt_tier') = 'action') AS action_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s AND COALESCE(prompt_tier, metadata->>'prompt_tier') = 'academy_nvq') AS academy_nvq_requests,
                    COUNT(*) FILTER (WHERE created_at >= %s AND (event_type = 'deep_research' OR COALESCE(prompt_tier, metadata->>'prompt_tier') = 'deep')) AS deep_research_requests
                FROM orb_usage_events
                WHERE user_id = %s
                """,
                tuple([period_start] * 11 + [user_id]),
            )
            row = cur.fetchone()
            cur.execute(
                """
                SELECT COALESCE(prompt_tier, metadata->>'prompt_tier', 'unknown') AS tier, COUNT(*) AS count
                FROM orb_usage_events
                WHERE user_id = %s AND created_at >= %s
                GROUP BY 1
                ORDER BY count DESC
                """,
                (user_id, period_start),
            )
            tier_split = {str(r[0]): int(r[1]) for r in cur.fetchall()}
            cur.execute(
                """
                SELECT COALESCE(provider, 'unknown') AS provider, COUNT(*) AS count
                FROM orb_usage_events
                WHERE user_id = %s AND created_at >= %s
                GROUP BY 1
                ORDER BY count DESC
                """,
                (user_id, period_start),
            )
            provider_split = {str(r[0]): int(r[1]) for r in cur.fetchall()}
            cur.execute(
                """
                SELECT COALESCE(action_id, route, 'unknown') AS action_key,
                       SUM(estimated_cost) AS total_cost,
                       COUNT(*) AS count
                FROM orb_usage_events
                WHERE user_id = %s AND created_at >= %s
                GROUP BY 1
                ORDER BY total_cost DESC
                LIMIT 10
                """,
                (user_id, period_start),
            )
            top_actions = [
                {"action": r[0], "estimated_cost": round(float(r[1] or 0), 4), "count": int(r[2])}
                for r in cur.fetchall()
            ]
        if not row:
            return {}
        return {
            "total_requests": int(row[0] or 0),
            "daily_requests": int(row[1] or 0),
            "estimated_cost": float(row[2] or 0),
            "estimated_tokens_in": int(row[3] or 0),
            "estimated_tokens_out": int(row[4] or 0),
            "fast_requests": int(row[5] or 0),
            "residential_requests": int(row[6] or 0),
            "deep_requests": int(row[7] or 0),
            "document_requests": int(row[8] or 0),
            "action_requests": int(row[9] or 0),
            "academy_nvq_requests": int(row[10] or 0),
            "deep_research_requests": int(row[11] or 0),
            "prompt_tier_split": tier_split,
            "model_provider_split": provider_split,
            "top_expensive_actions": top_actions,
        }

    def _query_admin_stats(self, conn, *, days: int, period_start: datetime) -> dict[str, Any]:
        since = datetime.now(timezone.utc) - timedelta(days=max(1, int(days)))
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS total_active_users,
                    COUNT(*) AS total_requests,
                    COALESCE(SUM(estimated_cost), 0) AS estimated_total_cost
                FROM orb_usage_events
                WHERE created_at >= %s
                """,
                (since,),
            )
            totals = cur.fetchone()
            cur.execute(
                """
                SELECT user_id, SUM(estimated_cost) AS total_cost, COUNT(*) AS count
                FROM orb_usage_events
                WHERE created_at >= %s AND user_id IS NOT NULL
                GROUP BY user_id
                ORDER BY total_cost DESC
                LIMIT 15
                """,
                (since,),
            )
            top_users = [
                {"user_id": int(r[0]), "estimated_cost": round(float(r[1] or 0), 4), "count": int(r[2])}
                for r in cur.fetchall()
            ]
            cur.execute(
                """
                SELECT COALESCE(route, 'unknown') AS route_key, SUM(estimated_cost) AS total_cost, COUNT(*) AS count
                FROM orb_usage_events
                WHERE created_at >= %s
                GROUP BY 1
                ORDER BY total_cost DESC
                LIMIT 15
                """,
                (since,),
            )
            top_routes = [
                {"route": r[0], "estimated_cost": round(float(r[1] or 0), 4), "count": int(r[2])}
                for r in cur.fetchall()
            ]
            cur.execute(
                """
                SELECT COALESCE(action_id, 'unknown') AS action_key, SUM(estimated_cost) AS total_cost, COUNT(*) AS count
                FROM orb_usage_events
                WHERE created_at >= %s AND action_id IS NOT NULL
                GROUP BY 1
                ORDER BY total_cost DESC
                LIMIT 15
                """,
                (since,),
            )
            top_actions = [
                {"action_id": r[0], "estimated_cost": round(float(r[1] or 0), 4), "count": int(r[2])}
                for r in cur.fetchall()
            ]
            cur.execute(
                """
                SELECT COALESCE(prompt_tier, metadata->>'prompt_tier', 'unknown') AS tier, COUNT(*) AS count
                FROM orb_usage_events
                WHERE created_at >= %s
                GROUP BY 1
                ORDER BY count DESC
                """,
                (since,),
            )
            tier_split = {str(r[0]): int(r[1]) for r in cur.fetchall()}
            cur.execute(
                """
                SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS count,
                       COALESCE(SUM(estimated_cost), 0) AS cost
                FROM orb_usage_events
                WHERE created_at >= %s
                GROUP BY 1
                ORDER BY day ASC
                """,
                (since,),
            )
            trend = [
                {"date": str(r[0]), "requests": int(r[1]), "estimated_cost": round(float(r[2] or 0), 4)}
                for r in cur.fetchall()
            ]
        monthly_cost = float(totals[2] or 0) if totals else 0.0
        warnings = []
        if monthly_cost >= float(os.getenv("ORB_MONTHLY_HARD_COST_LIMIT", "50")):
            warnings.append("Monthly platform cost approaching hard safety cap.")
        return {
            "total_active_users": int(totals[0] or 0) if totals else 0,
            "total_requests": int(totals[1] or 0) if totals else 0,
            "estimated_total_cost": monthly_cost,
            "top_cost_users": top_users,
            "top_cost_routes": top_routes,
            "top_cost_actions": top_actions,
            "plan_distribution": {"orb_residential_individual": int(totals[0] or 0) if totals else 0},
            "daily_usage_trend": trend,
            "prompt_tier_split": tier_split,
            "budget_warnings": warnings,
        }

    def _memory_user_stats(self, user_id: int, period_start: datetime) -> dict[str, Any]:
        rows = [
            r
            for r in _memory_events
            if r.get("user_id") == user_id and self._parse_dt(r.get("created_at")) >= period_start
        ]
        return self._aggregate_rows(rows)

    def _memory_admin_stats(self, days: int) -> dict[str, Any]:
        since = datetime.now(timezone.utc) - timedelta(days=max(1, days))
        rows = [r for r in _memory_events if self._parse_dt(r.get("created_at")) >= since]
        agg = self._aggregate_rows(rows)
        users = {r.get("user_id") for r in rows if r.get("user_id") is not None}
        return {
            "total_active_users": len(users),
            "total_requests": agg.get("total_requests", 0),
            "estimated_total_cost": agg.get("estimated_cost", 0),
            "top_cost_users": [],
            "top_cost_routes": [],
            "top_cost_actions": agg.get("top_expensive_actions", []),
            "plan_distribution": {"orb_residential_individual": len(users)},
            "daily_usage_trend": [],
            "prompt_tier_split": agg.get("prompt_tier_split", {}),
            "budget_warnings": [],
        }

    def _aggregate_rows(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        tier_split: dict[str, int] = {}
        provider_split: dict[str, int] = {}
        for row in rows:
            tier = str(row.get("prompt_tier") or "unknown")
            tier_split[tier] = tier_split.get(tier, 0) + 1
            provider = str(row.get("provider") or "unknown")
            provider_split[provider] = provider_split.get(provider, 0) + 1
        return {
            "total_requests": len(rows),
            "daily_requests": len(rows),
            "estimated_cost": round(sum(float(r.get("estimated_cost") or 0) for r in rows), 4),
            "estimated_tokens_in": sum(int(r.get("tokens_in") or 0) for r in rows),
            "estimated_tokens_out": sum(int(r.get("tokens_out") or 0) for r in rows),
            "fast_requests": sum(1 for r in rows if r.get("prompt_tier") == "fast"),
            "residential_requests": sum(1 for r in rows if r.get("prompt_tier") == "residential"),
            "deep_requests": sum(1 for r in rows if r.get("prompt_tier") == "deep"),
            "document_requests": sum(1 for r in rows if r.get("prompt_tier") == "document"),
            "action_requests": sum(1 for r in rows if r.get("prompt_tier") == "action"),
            "academy_nvq_requests": sum(1 for r in rows if r.get("prompt_tier") == "academy_nvq"),
            "deep_research_requests": sum(1 for r in rows if r.get("event_type") == "deep_research"),
            "prompt_tier_split": tier_split,
            "model_provider_split": provider_split,
            "top_expensive_actions": [],
        }

    def _parse_dt(self, value: Any) -> datetime:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        return datetime.min.replace(tzinfo=timezone.utc)

    def reset_memory_events(self) -> None:
        _memory_events.clear()

    def seed_memory_event(self, payload: dict[str, Any]) -> None:
        _memory_events.append(payload)


orb_billing_meter_service = OrbBillingMeterService()

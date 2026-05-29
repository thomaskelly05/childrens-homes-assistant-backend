from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from schemas.ai_models import AiRiskLevel

logger = logging.getLogger("indicare.orb_usage_budget")

SAFEGUARDING_LIMIT_TEMPLATE = """
**Immediate safety first**
- Check whether the child or others are at immediate risk right now.
- Follow your home's safeguarding procedure and inform your manager and DSL without delay.
- If there is immediate danger, call emergency services (999) and follow local escalation.

**Record and seek help**
- Record facts and direct words — not conclusions about threshold.
- ORB cannot decide safeguarding threshold or replace LADO, police, social worker or clinical advice.

**Usage note**
Longer analysis is limited right now, but these safety steps still apply.
""".strip()

GENERAL_LIMIT_TEMPLATE = (
    "I can still give a short safety-focused response, but longer or deeper analysis is limited right now. "
    "Try a shorter question, switch to a simpler mode, or come back later. "
    "If this is safeguarding-related, follow your local procedure and inform your manager/DSL."
)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return max(0, int(str(raw).strip()))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return max(0.0, float(str(raw).strip()))
    except ValueError:
        return default


@dataclass
class OrbBudgetDecision:
    allowed: bool
    level: str  # ok | soft | hard
    message: str | None = None
    use_safeguarding_template: bool = False
    suggest_shorter_answer: bool = False
    bypassed: bool = False


class OrbUsageBudgetService:
    """Configurable usage and cost guards for standalone ORB (pre-billing)."""

    def __init__(self) -> None:
        self.daily_soft = _env_int("ORB_DAILY_SOFT_USAGE_LIMIT", 120)
        self.daily_hard = _env_int("ORB_DAILY_HARD_USAGE_LIMIT", 250)
        self.monthly_soft_cost = _env_float("ORB_MONTHLY_SOFT_COST_LIMIT", 25.0)
        self.monthly_hard_cost = _env_float("ORB_MONTHLY_HARD_COST_LIMIT", 50.0)
        self.deep_research_daily = _env_int("ORB_DEEP_RESEARCH_DAILY_LIMIT", 15)
        self.document_analysis_daily = _env_int("ORB_DOCUMENT_ANALYSIS_DAILY_LIMIT", 40)

    def user_can_bypass(self, user: dict[str, Any] | None) -> bool:
        if not user:
            return False
        role = str(user.get("role") or "").strip().lower()
        plan = str(user.get("plan_name") or "").strip().lower()
        if role in {"admin", "super_admin", "superadmin", "founder", "owner"}:
            return True
        if "founding" in plan:
            return True
        orb_access = user.get("orb_access") or {}
        if orb_access.get("access_reason") == "subscription":
            return bool(user.get("subscription_active"))
        return False

    def check_budget(
        self,
        *,
        user_id: int | None,
        user: dict[str, Any] | None = None,
        prompt_tier: str | None = None,
        risk_level: AiRiskLevel | str | None = None,
        event_type: str = "conversation",
    ) -> OrbBudgetDecision:
        if self.user_can_bypass(user):
            return OrbBudgetDecision(allowed=True, level="ok", bypassed=True)

        if user_id is None:
            return OrbBudgetDecision(allowed=True, level="ok")

        stats = self._load_usage_stats(user_id)
        risk = self._normalise_risk(risk_level)
        safeguarding = risk == AiRiskLevel.SAFEGUARDING_SENSITIVE

        daily_count = stats.get("daily_event_count", 0)
        monthly_cost = float(stats.get("monthly_estimated_cost", 0) or 0)
        deep_count = stats.get("deep_research_daily", 0)
        doc_count = stats.get("document_analysis_daily", 0)

        tier = str(prompt_tier or "").strip().lower()
        if tier == "deep" or event_type == "deep_research":
            if self.deep_research_daily and deep_count >= self.deep_research_daily:
                return self._limit_decision(safeguarding, hard=True, tier="deep_research")
        if tier == "document" or event_type == "document_analysis":
            if self.document_analysis_daily and doc_count >= self.document_analysis_daily:
                return self._limit_decision(safeguarding, hard=True, tier="document")

        if self.daily_hard and daily_count >= self.daily_hard:
            return self._limit_decision(safeguarding, hard=True)
        if self.monthly_hard_cost and monthly_cost >= self.monthly_hard_cost:
            return self._limit_decision(safeguarding, hard=True)

        soft = False
        if self.daily_soft and daily_count >= self.daily_soft:
            soft = True
        if self.monthly_soft_cost and monthly_cost >= self.monthly_soft_cost:
            soft = True
        if soft:
            return OrbBudgetDecision(
                allowed=True,
                level="soft",
                suggest_shorter_answer=True,
                message="You're approaching today's ORB usage guidance limit. Shorter questions may work best.",
            )
        return OrbBudgetDecision(allowed=True, level="ok")

    def _limit_decision(self, safeguarding: bool, *, hard: bool = True, tier: str | None = None) -> OrbBudgetDecision:
        if safeguarding:
            return OrbBudgetDecision(
                allowed=True,
                level="hard",
                use_safeguarding_template=True,
                message=SAFEGUARDING_LIMIT_TEMPLATE,
            )
        msg = GENERAL_LIMIT_TEMPLATE
        if tier == "deep_research":
            msg = "Deep research is limited for today. " + msg
        elif tier == "document":
            msg = "Document analysis is limited for today. " + msg
        return OrbBudgetDecision(allowed=hard is False, level="hard", message=msg)

    def _normalise_risk(self, risk_level: AiRiskLevel | str | None) -> AiRiskLevel:
        if isinstance(risk_level, AiRiskLevel):
            return risk_level
        text = str(risk_level or "").strip().lower()
        if text == AiRiskLevel.SAFEGUARDING_SENSITIVE.value:
            return AiRiskLevel.SAFEGUARDING_SENSITIVE
        if text == AiRiskLevel.HIGH.value:
            return AiRiskLevel.HIGH
        if text == AiRiskLevel.MEDIUM.value:
            return AiRiskLevel.MEDIUM
        return AiRiskLevel.LOW

    def _load_usage_stats(self, user_id: int) -> dict[str, Any]:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return {}
        try:
            return self._query_stats(conn, user_id)
        except Exception:
            logger.debug("ORB usage stats unavailable", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return {}
        finally:
            release_db_connection(conn)

    def _query_stats(self, conn, user_id: int) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = day_start.replace(day=1)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE created_at >= %s) AS daily_event_count,
                    COALESCE(SUM(estimated_cost) FILTER (WHERE created_at >= %s), 0) AS monthly_estimated_cost,
                    COUNT(*) FILTER (
                        WHERE created_at >= %s
                        AND (
                            COALESCE(prompt_tier, metadata->>'prompt_tier') = 'deep'
                            OR event_type = 'deep_research'
                        )
                    ) AS deep_research_daily,
                    COUNT(*) FILTER (
                        WHERE created_at >= %s
                        AND (
                            COALESCE(prompt_tier, metadata->>'prompt_tier') = 'document'
                            OR event_type = 'document_analysis'
                        )
                    ) AS document_analysis_daily
                FROM orb_usage_events
                WHERE user_id = %s
                """,
                (day_start, month_start, day_start, day_start, user_id),
            )
            row = cur.fetchone()
        if not row:
            return {}
        return {
            "daily_event_count": int(row[0] or 0),
            "monthly_estimated_cost": float(row[1] or 0),
            "deep_research_daily": int(row[2] or 0),
            "document_analysis_daily": int(row[3] or 0),
        }


orb_usage_budget_service = OrbUsageBudgetService()

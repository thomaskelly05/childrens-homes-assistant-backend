from __future__ import annotations

from typing import Any

from services.chronology_pattern_service import chronology_pattern_service
from services.operational_feed_service import build_operational_feed


class PredictiveSafeguardingService:
    """Emerging safeguarding risk forecasts from operational feed and chronology patterns."""

    def analyse(
        self,
        conn: Any,
        *,
        young_person_id: int | None = None,
        home_id: int | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        feed = build_operational_feed(
            conn,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
        )
        events = feed.get("events") or []
        patterns = chronology_pattern_service.analyse(events)
        climate = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        queues = self._queue_pressure(feed)

        forecasts = self._build_forecasts(patterns, climate, queues, events)
        interventions = self._intervention_suggestions(patterns, forecasts)
        attention_scores = self._attention_scores(forecasts)

        return {
            "ok": True,
            "scope": {"young_person_id": young_person_id, "home_id": home_id},
            "forecasts": forecasts,
            "intervention_suggestions": interventions,
            "operational_attention_scores": attention_scores,
            "repeat_safeguarding_themes": patterns.get("repeat_safeguarding_themes") or [],
            "repeat_dysregulation_cycles": patterns.get("repeat_dysregulation_cycles") or [],
            "placement_instability": patterns.get("placement_instability"),
            "staff_burnout_risk": self._staff_burnout_signal(climate),
            "emotional_contagion": self._emotional_contagion(events),
            "orb_answers": {
                "emerging_risks": self._orb_emerging_risks(forecasts),
                "escalating_patterns": self._orb_escalating_patterns(patterns),
                "prior_interventions": patterns.get("orb_questions", {}).get("interventions_reduce_dysregulation"),
            },
            "summary": self._summary(forecasts, attention_scores),
        }

    def _build_forecasts(
        self,
        patterns: dict[str, Any],
        climate: dict[str, Any],
        queues: dict[str, Any],
        events: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        forecasts: list[dict[str, Any]] = []
        if patterns.get("escalation_before_incidents"):
            forecasts.append(
                {
                    "risk_type": "incident_escalation",
                    "likelihood": "elevated",
                    "evidence": f"{len(patterns['escalation_before_incidents'])} pre-incident pressure pattern(s)",
                    "horizon": "24-72h",
                }
            )
        if patterns.get("escalation_before_missing_episodes"):
            forecasts.append(
                {
                    "risk_type": "missing_episode",
                    "likelihood": "elevated",
                    "evidence": f"{len(patterns['escalation_before_missing_episodes'])} pre-missing pattern(s)",
                    "horizon": "24-72h",
                }
            )
        dysregulation = patterns.get("repeat_dysregulation_cycles") or []
        if dysregulation:
            forecasts.append(
                {
                    "risk_type": "emotional_dysregulation",
                    "likelihood": "watch",
                    "evidence": f"{len(dysregulation)} repeated dysregulation cycle(s)",
                    "horizon": "ongoing",
                }
            )
        safeguarding_themes = patterns.get("repeat_safeguarding_themes") or []
        if safeguarding_themes:
            forecasts.append(
                {
                    "risk_type": "repeat_safeguarding_theme",
                    "likelihood": "elevated",
                    "evidence": ", ".join(item.get("theme", "") for item in safeguarding_themes[:3]),
                    "horizon": "ongoing",
                }
            )
        placement = patterns.get("placement_instability") or {}
        if placement.get("state") in {"unstable", "watching"}:
            forecasts.append(
                {
                    "risk_type": "placement_breakdown",
                    "likelihood": placement.get("state"),
                    "evidence": f"Placement pressure score {placement.get('pressure_score')}",
                    "horizon": "7d",
                }
            )
        if queues.get("missing_count", 0) > 0:
            forecasts.append(
                {
                    "risk_type": "missing_episode_queue",
                    "likelihood": "high",
                    "evidence": f"{queues['missing_count']} missing-related signal(s) in feed",
                    "horizon": "immediate",
                }
            )
        safeguarding_pressure = climate.get("safeguarding_pressure") or {}
        if safeguarding_pressure.get("state") not in {None, "stable"}:
            forecasts.append(
                {
                    "risk_type": "safeguarding_pressure",
                    "likelihood": safeguarding_pressure.get("state"),
                    "evidence": f"Safeguarding pressure score {safeguarding_pressure.get('pressure_score')}",
                    "horizon": "24h",
                }
            )
        if not forecasts and len([event for event in events if event.get("safeguarding")]) >= 2:
            forecasts.append(
                {
                    "risk_type": "safeguarding_activity",
                    "likelihood": "watch",
                    "evidence": "Multiple safeguarding-linked operational events in recent feed",
                    "horizon": "24h",
                }
            )
        return forecasts

    def _intervention_suggestions(self, patterns: dict[str, Any], forecasts: list[dict[str, Any]]) -> list[dict[str, Any]]:
        suggestions: list[dict[str, Any]] = []
        orb_q = patterns.get("orb_questions") or {}
        if orb_q.get("interventions_reduce_dysregulation"):
            suggestions.append(
                {
                    "area": "dysregulation",
                    "action": orb_q["interventions_reduce_dysregulation"],
                    "priority": "high",
                }
            )
        for forecast in forecasts:
            if forecast["risk_type"] == "missing_episode":
                suggestions.append(
                    {
                        "area": "missing",
                        "action": "Review missing-from-home plan, contact rhythm and emotional triggers before next episode.",
                        "priority": "critical",
                    }
                )
            elif forecast["risk_type"] == "placement_breakdown":
                suggestions.append(
                    {
                        "area": "placement",
                        "action": "Convene placement stability review with social worker and responsible manager.",
                        "priority": "high",
                    }
                )
            elif forecast["risk_type"] == "repeat_safeguarding_theme":
                suggestions.append(
                    {
                        "area": "safeguarding",
                        "action": "Map repeat safeguarding themes to chronology and test whether prior interventions reduced risk.",
                        "priority": "high",
                    }
                )
        return suggestions[:8]

    def _attention_scores(self, forecasts: list[dict[str, Any]]) -> dict[str, Any]:
        weights = {"critical": 90, "high": 75, "elevated": 60, "watch": 40, "unstable": 70, "immediate": 85}
        score = 0
        for forecast in forecasts:
            score += weights.get(str(forecast.get("likelihood")), 25)
        score = min(100, score)
        return {
            "overall_attention_score": score,
            "level": "critical" if score >= 80 else "high" if score >= 55 else "medium" if score >= 30 else "low",
            "forecast_count": len(forecasts),
        }

    def _queue_pressure(self, feed: dict[str, Any]) -> dict[str, Any]:
        events = feed.get("events") or []
        missing = sum(
            1
            for event in events
            if "missing" in (event.get("risk_tags") or []) or event.get("source_table") == "missing_episodes"
        )
        safeguarding = sum(1 for event in events if event.get("safeguarding"))
        return {"missing_count": missing, "safeguarding_count": safeguarding}

    def _staff_burnout_signal(self, climate: dict[str, Any]) -> dict[str, Any]:
        workforce = climate.get("workforce_pressure") or {}
        state = workforce.get("state") or "manageable"
        return {
            "state": "elevated" if state not in {"manageable", "stable", None} else "stable",
            "queue_items": workforce.get("queue_items"),
            "message": "Workforce pressure may reduce safeguarding response capacity." if state not in {"manageable", "stable", None} else None,
        }

    def _emotional_contagion(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        unsettled = sum(1 for event in events if "dysregulated" in (event.get("emotional_tags") or []) or "distressed" in (event.get("emotional_tags") or []))
        return {
            "cross_home_pattern": unsettled >= 3,
            "unsettled_event_count": unsettled,
            "message": "Multiple dysregulated events may indicate emotional contagion across the home." if unsettled >= 3 else None,
        }

    def _orb_emerging_risks(self, forecasts: list[dict[str, Any]]) -> str:
        if not forecasts:
            return "No elevated safeguarding forecasts from the current operational feed."
        parts = [f"{item['risk_type']} ({item['likelihood']})" for item in forecasts[:5]]
        return "Emerging safeguarding risks: " + "; ".join(parts) + "."

    def _orb_escalating_patterns(self, patterns: dict[str, Any]) -> str:
        parts = []
        if patterns.get("escalation_before_incidents"):
            parts.append("pre-incident emotional escalation")
        if patterns.get("escalation_before_missing_episodes"):
            parts.append("pre-missing pressure indicators")
        if patterns.get("repeat_dysregulation_cycles"):
            parts.append("repeat dysregulation cycles")
        if not parts:
            return "No escalating chronology patterns detected in the current scope."
        return "Escalating patterns: " + ", ".join(parts) + "."

    def _summary(self, forecasts: list[dict[str, Any]], attention: dict[str, Any]) -> str:
        if not forecasts:
            return "Predictive safeguarding: no elevated forecasts in current operational scope."
        return (
            f"Predictive safeguarding: {len(forecasts)} forecast(s) with "
            f"attention score {attention.get('overall_attention_score')} ({attention.get('level')})."
        )


predictive_safeguarding_service = PredictiveSafeguardingService()

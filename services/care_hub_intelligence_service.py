from __future__ import annotations

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

from services.care_hub_safeguarding_queues_service import care_hub_safeguarding_queues_service
from services.chronology_pattern_service import chronology_pattern_service
from services.intelligence_cache_service import intelligence_cache_service
from services.live_home_status_service import live_home_status_service
from services.operational_alert_engine import operational_alert_engine
from services.operational_feed_service import build_operational_feed
from services.operational_risk_matrix_service import operational_risk_matrix_service
from services.orb_operational_reasoning_service import orb_operational_reasoning_service
from services.predictive_safeguarding_service import predictive_safeguarding_service
from services.workforce_pressure_service import workforce_pressure_service
from services.workflow_completion_service import workflow_completion_service


class CareHubIntelligenceService:
    """Fully converged live Care Hub intelligence layer."""

    def build(
        self,
        conn: Any,
        *,
        young_person_id: int | None = None,
        home_id: int | None = None,
        limit: int = 50,
        question: str | None = None,
        use_cache: bool = True,
        current_user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        cache_key = None
        cache_hit = False
        if use_cache:
            cache_key = intelligence_cache_service.build_cache_key(
                cache_type="care_hub_live",
                home_id=home_id,
                young_person_id=young_person_id,
                extra={"limit": limit},
            )
            cached = intelligence_cache_service.get(cache_key)
            if cached is not None:
                cache_hit = True
                payload = dict(cached.value)
                payload["timing"] = {
                    "total_ms": round((time.perf_counter() - started) * 1000, 2),
                    "cache_hit": True,
                }
                if question:
                    payload["orb_reasoning"] = orb_operational_reasoning_service.reason(
                        feed=payload.get("operational_feed") or {},
                        chronology_patterns=payload.get("chronology_patterns"),
                        workflow=payload.get("workflow_completion"),
                        alerts=payload.get("alerts"),
                        question=question,
                    )
                logger.info(
                    "care_hub_build cache_hit=true home_id=%s young_person_id=%s total_ms=%s",
                    home_id,
                    young_person_id,
                    payload["timing"]["total_ms"],
                )
                return payload

        feed_started = time.perf_counter()
        feed = build_operational_feed(
            conn,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
        )
        feed_ms = round((time.perf_counter() - feed_started) * 1000, 2)
        workflow_started = time.perf_counter()
        workflow = workflow_completion_service.analyse(
            events=feed.get("events") or [],
            manager_queue=feed.get("manager_queue"),
            inspection=feed.get("inspection_intelligence"),
        )
        workflow_ms = round((time.perf_counter() - workflow_started) * 1000, 2)
        chronology_patterns = chronology_pattern_service.analyse(feed.get("events") or [])
        risk_started = time.perf_counter()
        risk_matrix = operational_risk_matrix_service.build(
            feed=feed,
            workflow=workflow,
            chronology_patterns=chronology_patterns,
        )
        live_status = live_home_status_service.build(
            feed=feed,
            risk_matrix=risk_matrix,
            workflow=workflow,
        )
        alerts = operational_alert_engine.generate(
            feed=feed,
            workflow=workflow,
            risk_matrix=risk_matrix,
            chronology_patterns=chronology_patterns,
        )
        orb_reasoning = orb_operational_reasoning_service.reason(
            feed=feed,
            chronology_patterns=chronology_patterns,
            workflow=workflow,
            alerts=alerts,
            question=question,
        )

        risk_ms = round((time.perf_counter() - risk_started) * 1000, 2)
        safeguarding_queues = care_hub_safeguarding_queues_service.build_from_feed(feed)
        predictive_safeguarding = predictive_safeguarding_service.analyse(
            conn,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
        )
        actor = current_user or {"home_id": home_id}
        if home_id and not actor.get("home_id"):
            actor = {**actor, "home_id": home_id}
        workforce_pressure = workforce_pressure_service.build(
            conn,
            current_user=actor,
            home_id=home_id,
            limit=limit,
        total_ms = round((time.perf_counter() - started) * 1000, 2)
        timing = {
            "total_ms": total_ms,
            "feed_ms": feed_ms,
            "workflow_ms": workflow_ms,
            "risk_ms": risk_ms,
            "cache_hit": cache_hit,
            **((feed.get("timing") or {}) if isinstance(feed.get("timing"), dict) else {}),
        }
        logger.info(
            "care_hub_build cache_hit=false home_id=%s young_person_id=%s total_ms=%s feed_ms=%s",
            home_id,
            young_person_id,
            total_ms,
            feed_ms,
        )

        payload = {
            "ok": True,
            "scope": {
                "young_person_id": young_person_id,
                "home_id": home_id,
                "event_count": feed.get("event_count"),
            },
            "operational_feed": feed,
            "live_status": live_status,
            "risk_matrix": risk_matrix,
            "workflow_completion": workflow,
            "chronology_patterns": chronology_patterns,
            "alerts": alerts,
            "safeguarding_queues": safeguarding_queues,
            "predictive_safeguarding": predictive_safeguarding,
            "workforce_pressure": workforce_pressure,
            "orb_reasoning": orb_reasoning,
            "live_stream": {
                "status": "live",
                "websocket_path": "/os/realtime/ws",
                "poll_fallback_path": "/os/care-hub/live",
                "replay_path": "/os/realtime/replay",
            },
            "summary": live_status.get("summary"),
            "timing": timing,
        }

        if cache_key:
            intelligence_cache_service.set(
                key=cache_key,
                value=payload,
                cache_type="care_hub_live",
                home_id=home_id,
                young_person_id=young_person_id,
            )

        return payload

    def build_provider_view(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        limit: int = 30,
    ) -> dict[str, Any]:
        from services.provider_intelligence_service import provider_intelligence_service

        return provider_intelligence_service.build_operational_convergence(
            conn,
            current_user=current_user,
            limit=limit,
        )


care_hub_intelligence_service = CareHubIntelligenceService()

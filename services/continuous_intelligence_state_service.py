from __future__ import annotations

from collections import Counter
from typing import Any

from schemas.indicare_intelligence import IntelligenceRequest, IntelligenceSpineResponse
from services.historical_operational_memory_service import historical_operational_memory_service
from services.indicare_intelligence_spine_service import indicare_intelligence_spine_service
from services.intelligence.projection_snapshot_service import (
    ProjectionSnapshot,
    projection_snapshot_key,
    projection_snapshot_service,
)
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, now_iso, safe_payload


SEVERITY_WEIGHTS = {"low": 1, "medium": 2, "high": 3, "critical": 4}


class ContinuousIntelligenceStateService:
    """Builds cheap, explainable operational state from the Intelligence Spine.

    This service is intentionally deterministic. It does not make safeguarding,
    legal, medical or inspection decisions. It summarises the current operational
    picture so ORB and dashboards can reason from evidence-linked state instead
    of repeatedly re-reading all records or calling an LLM.
    """

    projection_type = "continuous_intelligence_state"

    def build_state(
        self,
        request: IntelligenceRequest,
        *,
        conn: Any = None,
        current_user: dict[str, Any] | None = None,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        key = self.state_key(request)
        if not force_refresh:
            cached = projection_snapshot_service.get(key)
            if cached and not cached.get("stale"):
                payload = cached.get("payload") if isinstance(cached, dict) else None
                if isinstance(payload, dict):
                    payload.setdefault("metadata", {})
                    payload["metadata"]["snapshot"] = {
                        "hit": True,
                        "projection_key": key,
                        "version": cached.get("version"),
                        "generated_at": str(cached.get("generated_at") or ""),
                    }
                    return safe_payload(payload)

        spine_request = request.model_copy(update={"use_snapshot_cache": True})
        spine = indicare_intelligence_spine_service.build_response(
            spine_request,
            conn=conn,
            current_user=current_user,
        )
        state = self.state_from_spine(spine, request=request)

        projection_snapshot_service.put(
            ProjectionSnapshot(
                projection_key=key,
                projection_type=self.projection_type,
                domain="indicare_intelligence",
                payload=state,
                home_id=self._safe_int(request.home_id),
                young_person_id=self._safe_int(request.child_id),
                staff_id=self._safe_int(request.staff_id),
                source_entity_type=request.mode or request.scope,
                source_entity_id=str(request.child_id or request.staff_id or request.home_id or "home"),
                correlation_id=state["metadata"].get("correlation_id"),
                metadata={
                    "mode": request.mode or request.scope,
                    "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
                    "created_by": (current_user or {}).get("id") or (current_user or {}).get("user_id"),
                },
            )
        )

        historical_operational_memory_service.remember(
            memory_type="continuous_operational_state",
            correlation_id=state["metadata"].get("correlation_id") or key,
            state=state,
            home_id=request.home_id,
            child_id=request.child_id,
            staff_id=request.staff_id,
            metadata={
                "mode": request.mode or request.scope,
                "records_analysed": state["metadata"].get("records_analysed"),
                "live_records_found": state["metadata"].get("live_records_found"),
            },
        )

        state["metadata"]["snapshot"] = {"hit": False, "stored": True, "projection_key": key}
        state["metadata"]["historical_memory"] = {
            "stored": True,
            "memory_type": "continuous_operational_state",
        }

        return safe_payload(state)

    def state_from_spine(self, spine: IntelligenceSpineResponse, *, request: IntelligenceRequest) -> dict[str, Any]:
        patterns = [p.model_dump(mode="json") for p in spine.patterns]
        findings = {
            "child": [f.model_dump(mode="json") for f in spine.child_intelligence],
            "safeguarding": [f.model_dump(mode="json") for f in spine.safeguarding_intelligence],
            "ofsted": [f.model_dump(mode="json") for f in spine.ofsted_intelligence],
            "leadership": [f.model_dump(mode="json") for f in spine.leadership_intelligence],
            "staff": [f.model_dump(mode="json") for f in spine.staff_intelligence],
            "inspection_risks": [f.model_dump(mode="json") for f in spine.inspection_risks],
        }
        record_quality = [r.model_dump(mode="json") for r in spine.record_quality]
        proposed_actions = [self._normalise_action(action) for action in spine.proposed_actions]
        evidence_graph = spine.evidence_graph.model_dump(mode="json") if spine.evidence_graph else {}

        emotional_climate = self._emotional_climate(patterns, findings, record_quality)
        child_state = self._child_state(patterns, findings, record_quality, evidence_graph)
        home_state = self._home_state(patterns, findings, emotional_climate, record_quality, proposed_actions)
        workforce_state = self._workforce_state(patterns, findings, record_quality)
        provider_state = self._provider_state(request, home_state=home_state, workforce_state=workforce_state)
        evidence_state = self._evidence_state(evidence_graph, spine)
        orb_context = self._orb_context(
            child_state=child_state,
            home_state=home_state,
            workforce_state=workforce_state,
            provider_state=provider_state,
            evidence_state=evidence_state,
            spine=spine,
        )

        return {
            "metadata": {
                "generated_at": now_iso(),
                "mode": request.mode or request.scope,
                "home_id": request.home_id,
                "child_id": request.child_id,
                "staff_id": request.staff_id,
                "records_analysed": spine.metadata.total_records_analysed,
                "live_records_found": spine.metadata.live_records_found,
                "correlation_id": self.state_key(request),
                "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
            },
            "summary": {
                "headline": self._state_headline(home_state, child_state, workforce_state),
                "what_matters_now": self._what_matters_now(patterns, findings, proposed_actions),
                "calm_review_note": "Use this as a prioritised review picture, not as an automated decision.",
            },
            "child_state": child_state,
            "home_state": home_state,
            "workforce_state": workforce_state,
            "provider_state": provider_state,
            "emotional_climate": emotional_climate,
            "evidence_state": evidence_state,
            "orb_context": orb_context,
            "source_spine": {
                "headline": spine.summary.headline,
                "pattern_count": spine.summary.pattern_count,
                "priority_action_count": spine.summary.priority_action_count,
                "manager_review_required": spine.manager_review_required,
                "what_has_improved": spine.what_has_improved,
                "what_has_deteriorated": spine.what_has_deteriorated,
            },
            "safety": {
                "human_review_required": True,
                "no_threshold_decisions": True,
                "no_ofsted_grade_prediction": True,
                "notice": SAFE_DECISION_SUPPORT_NOTICE,
            },
        }

    def state_key(self, request: IntelligenceRequest) -> str:
        return projection_snapshot_key(
            self.projection_type,
            request.mode or request.scope,
            "home",
            request.home_id or "none",
            "child",
            request.child_id or "none",
            "staff",
            request.staff_id or "none",
            request.date_from or "open",
            request.date_to or "open",
            f"days-{request.days}",
        )

    def mark_stale_for_event(self, *, home_id: Any = None, child_id: Any = None, staff_id: Any = None) -> dict[str, Any]:
        results = []
        if home_id is not None:
            results.append(projection_snapshot_service.mark_stale(prefix=f"{self.projection_type}::home::home::{home_id}"))
            results.append(projection_snapshot_service.mark_stale(prefix=f"{self.projection_type}::manager_daily_brief::home::{home_id}"))
            results.append(projection_snapshot_service.mark_stale(prefix=f"{self.projection_type}::inspection::home::{home_id}"))
        if child_id is not None:
            results.append(projection_snapshot_service.mark_stale(prefix=f"{self.projection_type}::child::home::"))
        if staff_id is not None:
            results.append(projection_snapshot_service.mark_stale(prefix=f"{self.projection_type}::staff::home::"))
        if not results:
            results.append(projection_snapshot_service.mark_stale(prefix=self.projection_type))
        return {"ok": True, "results": results}

from __future__ import annotations

from typing import Any

from schemas.indicare_intelligence import IntelligenceRequest
from services.continuous_intelligence_state_service import continuous_intelligence_state_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE


class ORBCognitiveContextService:
    """Builds calm, evidence-linked cognition context for ORB.

    ORB should reason from operational state and evidence projections,
    not directly from raw chronology or unconstrained prompts.
    """

    def build_context(
        self,
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        conn: Any = None,
        current_user: dict[str, Any] | None = None,
        days: int = 30,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        mode = "home"
        scope = "home"
        if child_id is not None:
            mode = "child"
            scope = "child"
        elif staff_id is not None:
            mode = "staff"

        request = IntelligenceRequest(
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            mode=mode,
            scope=scope,
            days=max(1, min(days, 90)),
            include_live_records=True,
            use_snapshot_cache=True,
        )

        state = continuous_intelligence_state_service.build_state(
            request,
            conn=conn,
            current_user=current_user,
            force_refresh=force_refresh,
        )

        return {
            "context_type": "orb_cognitive_context",
            "headline": state.get("summary", {}).get("headline"),
            "what_matters_now": state.get("summary", {}).get("what_matters_now", []),
            "child_state": state.get("child_state", {}),
            "home_state": state.get("home_state", {}),
            "workforce_state": state.get("workforce_state", {}),
            "emotional_climate": state.get("emotional_climate", {}),
            "evidence_state": state.get("evidence_state", {}),
            "orb_context": state.get("orb_context", {}),
            "orb_rules": {
                "must_be_calm": True,
                "must_reference_evidence": True,
                "must_encourage_human_review": True,
                "must_not_make_threshold_decisions": True,
                "must_not_predict_ofsted_grades": True,
            },
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }


orb_cognitive_context_service = ORBCognitiveContextService()

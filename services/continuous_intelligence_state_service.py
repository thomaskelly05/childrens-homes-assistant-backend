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
    """Builds cheap, explainable operational state from the Intelligence Spine."""

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

        emotional_climate = self._emotional_climate(patterns, record_quality)
        child_state = self._child_state(patterns, findings, evidence_graph)
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

    def _child_state(self, patterns: list[dict[str, Any]], findings: dict[str, list[dict[str, Any]]], evidence_graph: dict[str, Any]) -> dict[str, Any]:
        pattern_types = {p.get("pattern_type") for p in patterns}
        pressure = self._weighted_score(patterns, include={
            "missing_episode_increase", "incident_increase", "restraint_increase",
            "safeguarding_concern_repeated", "education_refusal_pattern",
            "medication_refusal_pattern", "night_time_incident_pattern",
        })
        return {
            "state": self._level_from_score(pressure),
            "pressure_score": pressure,
            "safeguarding_pressure": self._level_from_score(self._weighted_score(patterns, include={"safeguarding_concern_repeated", "missing_episode_increase", "restraint_increase"})),
            "placement_stability": "fragile" if pressure >= 45 or "missing_episode_increase" in pattern_types else "watch" if pressure >= 20 or "repeated_family_contact_escalation" in pattern_types else "stable",
            "child_voice_visibility": "limited" if "child_voice_missing" in pattern_types else "visible_or_not_flagged",
            "education_engagement": "review" if "education_refusal_pattern" in pattern_types else "not_flagged",
            "health_medication": "review" if "medication_refusal_pattern" in pattern_types else "not_flagged",
            "relationship_temperature": "pressure" if "repeated_family_contact_escalation" in pattern_types else "not_flagged",
            "evidence_link_count": len(evidence_graph.get("links") or []) if isinstance(evidence_graph, dict) else 0,
            "review_prompts": self._finding_summaries(findings.get("child", []))[:6],
            "manager_review_required": any(f.get("manager_review_required") for f in findings.get("child", [])),
        }

    def _home_state(self, patterns: list[dict[str, Any]], findings: dict[str, list[dict[str, Any]]], emotional_climate: dict[str, Any], record_quality: list[dict[str, Any]], proposed_actions: list[dict[str, Any]]) -> dict[str, Any]:
        safeguarding_score = self._weighted_score(patterns, include={"missing_episode_increase", "incident_increase", "restraint_increase", "safeguarding_concern_repeated", "manager_review_missing"})
        oversight_score = self._weighted_score(patterns, include={"manager_review_missing", "overdue_actions", "staff_debrief_missing", "weak_recording_quality"})
        return {
            "state": self._level_from_score(max(safeguarding_score, oversight_score, emotional_climate.get("score", 0))),
            "safeguarding_pressure": self._level_from_score(safeguarding_score),
            "management_oversight": "urgent_review" if oversight_score >= 45 else "review" if oversight_score >= 20 else "not_flagged",
            "recording_quality": self._record_quality_state(record_quality),
            "emotional_climate": emotional_climate.get("level"),
            "open_action_pressure": len(proposed_actions),
            "inspection_readiness": "review" if findings.get("inspection_risks") or findings.get("ofsted") else "not_flagged",
            "leadership_prompts": self._finding_summaries(findings.get("leadership", []))[:8],
            "priority_actions": proposed_actions[:8],
        }

    def _workforce_state(self, patterns: list[dict[str, Any]], findings: dict[str, list[dict[str, Any]]], record_quality: list[dict[str, Any]]) -> dict[str, Any]:
        staff_score = self._weighted_score(patterns, include={"staff_debrief_missing", "weak_recording_quality"})
        weak_records = [r for r in record_quality if r.get("manager_review_required") or r.get("overall_quality") in {"weak", "developing"}]
        return {
            "state": self._level_from_score(staff_score + min(30, len(weak_records) * 5)),
            "practice_support_needed": bool(staff_score or weak_records),
            "recording_support_needed": bool(weak_records),
            "debrief_culture": "review" if any(p.get("pattern_type") == "staff_debrief_missing" for p in patterns) else "not_flagged",
            "staff_prompts": self._finding_summaries(findings.get("staff", []))[:8],
            "record_quality_flags": weak_records[:10],
        }

    def _provider_state(self, request: IntelligenceRequest, *, home_state: dict[str, Any], workforce_state: dict[str, Any]) -> dict[str, Any]:
        provider_context = request.context.get("provider") if isinstance(request.context, dict) else None
        homes = request.context.get("homes") if isinstance(request.context, dict) else None
        return {
            "state": "single_home_view" if not homes else "provider_view_ready",
            "provider_context_present": bool(provider_context),
            "homes_in_context": len(homes) if isinstance(homes, list) else 0,
            "cross_home_intelligence": "requires_provider_context" if not homes else "ready_for_comparison",
            "current_home_signal": home_state.get("state"),
            "workforce_signal": workforce_state.get("state"),
        }

    def _emotional_climate(self, patterns: list[dict[str, Any]], record_quality: list[dict[str, Any]]) -> dict[str, Any]:
        punitive_flags = sum(len(r.get("therapeutic_language_flags") or []) for r in record_quality)
        weak_quality = sum(1 for r in record_quality if r.get("overall_quality") in {"weak", "developing"})
        incident_pressure = self._weighted_score(patterns, include={"incident_increase", "restraint_increase", "night_time_incident_pattern"})
        relationship_pressure = self._weighted_score(patterns, include={"repeated_family_contact_escalation", "child_voice_missing"})
        score = min(100, incident_pressure + relationship_pressure + punitive_flags * 6 + weak_quality * 4)
        return {
            "level": self._level_from_score(score),
            "score": score,
            "signals": {
                "incident_pressure": incident_pressure,
                "relationship_pressure": relationship_pressure,
                "punitive_language_flags": punitive_flags,
                "weak_or_developing_records": weak_quality,
            },
            "interpretation": self._climate_interpretation(score),
            "review_prompts": ["Review whether records show warmth, curiosity, repair and child voice.", "Check whether staff need reflective support before practice drifts into task-only care."] if score >= 20 else ["Continue recording protective factors, repair and positive progress."],
        }

    def _evidence_state(self, evidence_graph: dict[str, Any], spine: IntelligenceSpineResponse) -> dict[str, Any]:
        gaps = evidence_graph.get("evidence_gaps") or [] if isinstance(evidence_graph, dict) else []
        missing = evidence_graph.get("missing_expected_links") or [] if isinstance(evidence_graph, dict) else []
        return {
            "evidence_strength": spine.summary.evidence_status,
            "graph_nodes": len(evidence_graph.get("nodes") or []) if isinstance(evidence_graph, dict) else 0,
            "graph_links": len(evidence_graph.get("links") or []) if isinstance(evidence_graph, dict) else 0,
            "evidence_gaps": gaps[:12],
            "missing_expected_links": missing[:12],
            "manager_review_prompts": (evidence_graph.get("manager_review_prompts") or [])[:8] if isinstance(evidence_graph, dict) else [],
        }

    def _orb_context(self, *, child_state: dict[str, Any], home_state: dict[str, Any], workforce_state: dict[str, Any], provider_state: dict[str, Any], evidence_state: dict[str, Any], spine: IntelligenceSpineResponse) -> dict[str, Any]:
        return {
            "context_type": "continuous_intelligence_state",
            "headline": spine.summary.headline,
            "what_orb_should_notice_first": [home_state.get("management_oversight"), child_state.get("placement_stability"), workforce_state.get("state"), evidence_state.get("evidence_strength")],
            "suggested_questions": ["What needs calm manager review today?", "Which evidence explains this pattern?", "What should be checked before any decision is made?", "Where could practice drift be developing?"],
            "must_include": ["evidence basis", "human review required", "no automated safeguarding decision"],
        }

    def _what_matters_now(self, patterns: list[dict[str, Any]], findings: dict[str, list[dict[str, Any]]], proposed_actions: list[dict[str, Any]]) -> list[str]:
        items: list[str] = []
        high_patterns = [p for p in patterns if p.get("severity") in {"high", "critical"}]
        items.extend(str(p.get("summary")) for p in high_patterns[:4] if p.get("summary"))
        for section in ("safeguarding", "leadership", "inspection_risks"):
            items.extend(self._finding_summaries(findings.get(section, []))[:3])
        items.extend(str(a.get("title") or a.get("reason")) for a in proposed_actions[:3] if a.get("title") or a.get("reason"))
        return list(dict.fromkeys(items))[:10]

    def _state_headline(self, home_state: dict[str, Any], child_state: dict[str, Any], workforce_state: dict[str, Any]) -> str:
        if home_state.get("state") in {"high", "critical"} or child_state.get("state") in {"high", "critical"}:
            return "Continuous state indicates priority review is needed; check source evidence before decisions."
        if workforce_state.get("practice_support_needed"):
            return "Continuous state indicates practice support and calm manager review may be helpful."
        return "Continuous state is stable or watch-level based on current evidence; keep recording protective factors."

    def _weighted_score(self, patterns: list[dict[str, Any]], *, include: set[str]) -> int:
        total = 0
        for pattern in patterns:
            if pattern.get("pattern_type") not in include:
                continue
            total += SEVERITY_WEIGHTS.get(str(pattern.get("severity") or "medium"), 2) * 10
        return min(100, total)

    def _level_from_score(self, score: int | float) -> str:
        if score >= 75:
            return "critical"
        if score >= 45:
            return "high"
        if score >= 20:
            return "watch"
        return "stable"

    def _record_quality_state(self, record_quality: list[dict[str, Any]]) -> str:
        if not record_quality:
            return "not_sampled"
        counts = Counter(str(item.get("overall_quality") or "developing") for item in record_quality)
        if counts.get("weak", 0) >= 2:
            return "manager_review"
        if counts.get("developing", 0) >= 3:
            return "developing"
        return "not_flagged"

    def _climate_interpretation(self, score: int) -> str:
        if score >= 75:
            return "Evidence suggests the emotional climate needs urgent reflective leadership review."
        if score >= 45:
            return "Evidence suggests elevated emotional pressure; review patterns, language and staff support."
        if score >= 20:
            return "Evidence suggests watch-level emotional pressure; continue reflective oversight."
        return "No significant emotional climate pressure was detected from the current evidence sample."

    def _finding_summaries(self, findings: list[dict[str, Any]]) -> list[str]:
        return [str(item.get("summary")) for item in findings if item.get("summary")]

    def _normalise_action(self, action: Any) -> dict[str, Any]:
        if hasattr(action, "model_dump"):
            return action.model_dump(mode="json")
        if isinstance(action, dict):
            return action
        return {"title": str(action), "priority": "medium"}

    def _safe_int(self, value: Any) -> int | None:
        try:
            if value in (None, ""):
                return None
            return int(value)
        except Exception:
            return None


continuous_intelligence_state_service = ContinuousIntelligenceStateService()

from __future__ import annotations

from typing import Any

from schemas.indicare_intelligence import (
    IntelligenceAction,
    IntelligenceFinding,
    IntelligenceMetadata,
    IntelligenceRequest,
    IntelligenceSpineResponse,
    IntelligenceSummary,
    ManagerDailyBrief,
    PatternFinding,
)
from services.evidence_graph_intelligence_service import evidence_graph_intelligence_service
from services.intelligence_snapshot_service import intelligence_snapshot_service
from services.ofsted_judgement_simulation_service import ofsted_judgement_simulation_service
from services.pattern_detection_service import pattern_detection_service
from services.record_quality_intelligence_service import record_quality_intelligence_service
from services.registered_manager_daily_brief_service import registered_manager_daily_brief_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, now_iso, safe_payload

try:
    from services.intelligence_record_collector_service import intelligence_record_collector_service
except Exception:  # pragma: no cover
    intelligence_record_collector_service = None  # type: ignore[assignment]

try:
    from services.regulatory_ontology_service import regulatory_ontology_service
except Exception:  # pragma: no cover - optional dependency guard
    regulatory_ontology_service = None  # type: ignore[assignment]

try:
    from services.ofsted_document_readiness_service import ofsted_document_readiness_service
except Exception:  # pragma: no cover
    ofsted_document_readiness_service = None  # type: ignore[assignment]


class IndiCareIntelligenceSpineService:
    """Central intelligence orchestrator connecting existing IndiCare evidence surfaces."""

    def build_home_intelligence(
        self,
        *,
        home_id: int | str | None = None,
        records: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        days: int = 30,
        request: IntelligenceRequest | None = None,
    ) -> IntelligenceSpineResponse:
        req = request or IntelligenceRequest(home_id=home_id, records=records or [], context=context or {}, days=days)
        return self._build(scope="home", request=req)

    def build_child_intelligence(
        self,
        *,
        child_id: int | str,
        records: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        days: int = 30,
        request: IntelligenceRequest | None = None,
    ) -> IntelligenceSpineResponse:
        req = request or IntelligenceRequest(
            child_id=child_id,
            records=records or [],
            context=context or {},
            days=days,
            scope="child",
        )
        return self._build(scope="child", request=req)

    def build_manager_daily_brief(
        self,
        *,
        home_id: int | str | None = None,
        records: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        days: int = 1,
        request: IntelligenceRequest | None = None,
    ) -> IntelligenceSpineResponse:
        req = request or IntelligenceRequest(
            home_id=home_id,
            records=records or [],
            context=context or {},
            days=max(1, days),
            scope="manager_brief",
        )
        response = self._build(scope="manager_brief", request=req)
        response.summary.headline = (
            "Manager daily brief: records indicate themes for calm oversight review today."
        )
        return response

    def build_inspection_intelligence(
        self,
        *,
        home_id: int | str | None = None,
        records: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        days: int = 90,
        request: IntelligenceRequest | None = None,
    ) -> IntelligenceSpineResponse:
        req = request or IntelligenceRequest(
            home_id=home_id,
            records=records or [],
            context=context or {},
            days=days,
            scope="inspection",
        )
        response = self._build(scope="inspection", request=req)
        response.summary.headline = (
            "Inspection intelligence: evidence appears ready for structured manager review — not an inspection grade."
        )
        return response

    def build_response(
        self,
        request: IntelligenceRequest,
        *,
        conn: Any = None,
        current_user: dict[str, Any] | None = None,
    ) -> IntelligenceSpineResponse:
        scope = self._resolve_scope(request)
        return self._build(scope=scope, request=request, conn=conn, current_user=current_user)

    def _resolve_scope(self, request: IntelligenceRequest) -> str:
        if request.mode:
            mapping = {
                "home": "home",
                "child": "child",
                "staff": "home",
                "inspection": "inspection",
                "manager_daily_brief": "manager_brief",
            }
            return mapping.get(request.mode, "home")
        return request.scope

    def _resolve_mode(self, request: IntelligenceRequest) -> str:
        if request.mode:
            return request.mode
        scope_to_mode = {
            "home": "home",
            "child": "child",
            "manager_brief": "manager_daily_brief",
            "inspection": "inspection",
        }
        return scope_to_mode.get(request.scope, "home")

    def _gather_records(
        self,
        request: IntelligenceRequest,
        *,
        conn: Any = None,
    ) -> tuple[list[dict[str, Any]], IntelligenceMetadata]:
        supplied = list(request.records or [])
        live: list[dict[str, Any]] = []
        warnings: list[str] = []
        if request.include_live_records and intelligence_record_collector_service:
            try:
                if request.child_id is not None:
                    live, warnings = intelligence_record_collector_service.collect_child_records(
                        request.child_id,
                        home_id=request.home_id,
                        conn=conn,
                        date_from=request.date_from,
                        date_to=request.date_to,
                    )
                elif request.staff_id is not None:
                    live, warnings = intelligence_record_collector_service.collect_staff_records(
                        request.staff_id,
                        home_id=request.home_id,
                        conn=conn,
                        date_from=request.date_from,
                        date_to=request.date_to,
                    )
                elif request.home_id is not None:
                    live, warnings = intelligence_record_collector_service.collect_home_records(
                        request.home_id,
                        conn=conn,
                        child_id=request.child_id,
                        staff_id=request.staff_id,
                        date_from=request.date_from,
                        date_to=request.date_to,
                    )
                else:
                    warnings.append("No home_id, child_id or staff_id provided for live record collection.")
            except Exception as exc:
                warnings.append(f"Live record collection failed: {exc.__class__.__name__}")
        merged = self._dedupe_records(supplied + live)
        metadata = IntelligenceMetadata(
            live_records_requested=request.include_live_records,
            live_records_found=len(live),
            supplied_records_found=len(supplied),
            total_records_analysed=len(merged),
            collector_warnings=warnings,
            generated_at=now_iso(),
            mode=self._resolve_mode(request),
        )
        return merged, metadata

    def _dedupe_records(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        merged: list[dict[str, Any]] = []
        for record in records:
            key = f"{record.get('source', 'supplied')}:{record.get('id', hash(str(record)))}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(record)
        return merged

    def _build(
        self,
        *,
        scope: str,
        request: IntelligenceRequest,
        conn: Any = None,
        current_user: dict[str, Any] | None = None,
    ) -> IntelligenceSpineResponse:
        mode = self._resolve_mode(request)
        snapshot_key = intelligence_snapshot_service.build_snapshot_key(
            home_id=request.home_id,
            child_id=request.child_id,
            staff_id=request.staff_id,
            mode=mode,
            date_from=request.date_from,
            date_to=request.date_to,
        )
        snapshot_meta: dict[str, Any] = {"hit": False}
        if request.use_snapshot_cache:
            cached = intelligence_snapshot_service.get_latest_snapshot(snapshot_key)
            if cached and isinstance(cached.get("payload"), dict):
                try:
                    payload = cached["payload"]
                    payload.setdefault("metadata", {}).setdefault("snapshot", {})
                    payload["metadata"]["snapshot"] = {
                        "hit": True,
                        "projection_key": snapshot_key,
                        "version": cached.get("version"),
                        "generated_at": cached.get("generated_at"),
                    }
                    return IntelligenceSpineResponse.model_validate(safe_payload(payload))
                except Exception:
                    snapshot_meta = {"hit": False, "invalid_cache": True}

        records, metadata = self._gather_records(request, conn=conn)
        patterns: list[PatternFinding] = []
        record_quality = []
        evidence_graph = None
        ofsted_simulation = []

        if request.include_patterns:
            patterns = pattern_detection_service.detect(
                records=records,
                child_id=request.child_id,
                home_id=request.home_id,
                days=request.days,
            )
        if request.include_record_quality:
            record_quality = record_quality_intelligence_service.review_records(records)
        if request.include_evidence_graph:
            evidence_graph = evidence_graph_intelligence_service.build(records, child_id=request.child_id)
        if request.include_ofsted_simulation:
            ofsted_simulation = ofsted_judgement_simulation_service.simulate(records)

        regulatory = self._regulatory_context()
        readiness = self._ofsted_readiness(request)

        child_intel = self._child_findings(records, patterns)
        safeguarding = self._safeguarding_findings(patterns)
        ofsted_intel = self._ofsted_findings(ofsted_simulation, readiness)
        leadership = self._leadership_findings(patterns, readiness)
        staff_intel = self._staff_findings(patterns)
        inspection_risks = self._inspection_risks(patterns, ofsted_simulation)
        improved, deteriorated = self._trend_lines(patterns)
        manager_review = self._manager_review_items(patterns, record_quality)
        actions = self._priority_actions(patterns, ofsted_simulation)

        summary = IntelligenceSummary(
            headline=self._summary_headline(scope, patterns),
            evidence_status="mixed" if records else "limited",
            areas_reviewed=self._areas_reviewed(records),
            manager_oversight_count=len(manager_review),
            pattern_count=len(patterns),
            priority_action_count=len(actions),
        )

        daily_brief = None
        if mode == "manager_daily_brief":
            brief_data = registered_manager_daily_brief_service.build_daily_brief(
                records,
                home_id=request.home_id,
                date_from=request.date_from,
                date_to=request.date_to,
                days=request.days,
            )
            daily_brief = ManagerDailyBrief.model_validate(brief_data)

        payload = IntelligenceSpineResponse(
            metadata=metadata,
            manager_daily_brief=daily_brief,
            summary=summary,
            child_intelligence=child_intel,
            safeguarding_intelligence=safeguarding,
            ofsted_intelligence=ofsted_intel,
            leadership_intelligence=leadership,
            staff_intelligence=staff_intel,
            record_quality=record_quality[:20],
            patterns=patterns,
            evidence_graph=evidence_graph or evidence_graph_intelligence_service.build([]),
            priority_actions=actions,
            inspection_risks=inspection_risks,
            what_has_improved=improved,
            what_has_deteriorated=deteriorated,
            manager_review_required=manager_review,
            ofsted_simulation=ofsted_simulation,
            regulatory_ontology=regulatory,
            ofsted_readiness=readiness,
            decision_support_notice=SAFE_DECISION_SUPPORT_NOTICE,
        )
        dumped = payload.model_dump(mode="json")
        safe = safe_payload(dumped)
        response = IntelligenceSpineResponse.model_validate(safe)
        if request.use_snapshot_cache:
            save_result = intelligence_snapshot_service.save_snapshot(
                key=snapshot_key,
                payload=response.model_dump(mode="json"),
                home_id=request.home_id,
                child_id=request.child_id,
                staff_id=request.staff_id,
                mode=mode,
                metadata={"user_id": (current_user or {}).get("id")},
            )
            response.metadata.snapshot = {"hit": False, "stored": True, **save_result}
        else:
            response.metadata.snapshot = snapshot_meta
        return response

    def _regulatory_context(self) -> dict[str, Any]:
        if not regulatory_ontology_service:
            return {"available": False, "note": "regulatory ontology service unavailable"}
        try:
            summary = regulatory_ontology_service.summary()
            return {"available": True, "summary": summary.model_dump(mode="json")}
        except Exception:
            return {"available": False, "note": "regulatory ontology summary could not be loaded"}

    def _ofsted_readiness(self, request: IntelligenceRequest) -> dict[str, Any]:
        if not ofsted_document_readiness_service:
            return {"available": False}
        try:
            return ofsted_document_readiness_service.readiness(
                home_id=request.home_id,
                existing_documents=request.context.get("documents"),
                child_ids=request.context.get("child_ids"),
                staff_ids=request.context.get("staff_ids"),
            )
        except Exception:
            return {"available": False, "note": "document readiness could not be loaded"}

    def _summary_headline(self, scope: str, patterns: list[PatternFinding]) -> str:
        if not patterns:
            return "records indicate limited pattern signals in the supplied evidence; source review remains required."
        high = sum(1 for p in patterns if p.severity in {"high", "critical"})
        if scope == "manager_brief":
            return f"Manager brief: evidence suggests {len(patterns)} review themes ({high} may need closer oversight)."
        return f"records indicate {len(patterns)} intelligence themes for structured review; do not treat as a final decision."

    def _areas_reviewed(self, records: list[dict[str, Any]]) -> list[str]:
        types = {str(r.get("record_type") or r.get("type") or "record") for r in records}
        return sorted(types)[:20]

    def _finding_from_pattern(self, pattern: PatternFinding) -> IntelligenceFinding:
        return IntelligenceFinding(
            id=f"finding-{pattern.pattern_type}",
            area=pattern.pattern_type,
            severity=pattern.severity,
            title=pattern.pattern_type.replace("_", " ").title(),
            summary=pattern.summary,
            evidence_status="review recommended",
            linked_records=pattern.linked_records,
            regulatory_links=pattern.regulatory_links,
            sccif_links=pattern.sccif_links,
            recommended_review=pattern.recommended_reviews[0] if pattern.recommended_reviews else "review recommended",
            manager_review_required=pattern.manager_review_required,
            human_review_notice="do not treat as a final decision",
        )

    def _child_findings(self, records: list[dict[str, Any]], patterns: list[PatternFinding]) -> list[IntelligenceFinding]:
        child_patterns = {
            "child_voice_missing",
            "education_refusal_pattern",
            "medication_refusal_pattern",
            "night_time_incident_pattern",
        }
        findings = [self._finding_from_pattern(p) for p in patterns if p.pattern_type in child_patterns]
        if not any(p.pattern_type == "child_voice_missing" for p in patterns) and records:
            findings.append(
                IntelligenceFinding(
                    id="finding-child-voice-sample",
                    area="child_voice",
                    severity="low",
                    title="Child lived experience",
                    summary="evidence suggests child voice should be sampled across recent records; review recommended.",
                    recommended_review="review recommended",
                    manager_review_required=False,
                )
            )
        return findings[:12]

    def _safeguarding_findings(self, patterns: list[PatternFinding]) -> list[IntelligenceFinding]:
        keys = {
            "missing_episode_increase",
            "incident_increase",
            "restraint_increase",
            "safeguarding_concern_repeated",
            "manager_review_missing",
            "risk_assessment_stale",
        }
        return [self._finding_from_pattern(p) for p in patterns if p.pattern_type in keys][:12]

    def _ofsted_findings(self, simulation: list[Any], readiness: dict[str, Any]) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        for item in simulation:
            area = item.judgement_area
            strength = item.evidence_strength
            findings.append(
                IntelligenceFinding(
                    id=f"ofsted-sim-{area}",
                    area="ofsted_simulation",
                    severity="medium" if strength in {"limited", "emerging"} else "low",
                    title=area.replace("_", " ").title(),
                    summary=f"Current evidence appears {strength} for {area.replace('_', ' ')}; manager review recommended.",
                    evidence_status=str(strength),
                    recommended_review="review recommended before inspection sampling",
                    manager_review_required=strength in {"limited", "emerging"},
                )
            )
        if readiness.get("available", True) and readiness.get("summary"):
            findings.append(
                IntelligenceFinding(
                    id="ofsted-document-readiness",
                    area="document_readiness",
                    severity="low",
                    title="Document readiness",
                    summary=str(readiness.get("summary") or "records indicate document readiness intelligence is available."),
                    recommended_review="review recommended",
                )
            )
        return findings[:10]

    def _leadership_findings(self, patterns: list[PatternFinding], readiness: dict[str, Any]) -> list[IntelligenceFinding]:
        keys = {"overdue_actions", "manager_review_missing", "staff_debrief_missing", "weak_recording_quality"}
        findings = [self._finding_from_pattern(p) for p in patterns if p.pattern_type in keys]
        gaps = readiness.get("evidence_gaps") or []
        for gap in gaps[:3]:
            if isinstance(gap, dict):
                findings.append(
                    IntelligenceFinding(
                        id=f"leadership-gap-{gap.get('id', 'gap')}",
                        area="governance",
                        severity="medium",
                        title="Evidence gap",
                        summary=str(gap.get("message") or gap.get("summary") or "review recommended"),
                        manager_review_required=True,
                    )
                )
        return findings[:12]

    def _staff_findings(self, patterns: list[PatternFinding]) -> list[IntelligenceFinding]:
        keys = {"staff_debrief_missing", "weak_recording_quality"}
        return [self._finding_from_pattern(p) for p in patterns if p.pattern_type in keys][:8]

    def _inspection_risks(self, patterns: list[PatternFinding], simulation: list[Any]) -> list[IntelligenceFinding]:
        risks = [self._finding_from_pattern(p) for p in patterns if p.severity in {"high", "critical"}]
        for item in simulation:
            strength = item.evidence_strength
            if strength == "limited":
                area = item.judgement_area
                risks.append(
                    IntelligenceFinding(
                        id=f"inspection-risk-{area}",
                        area="inspection_sampling",
                        severity="medium",
                        title=f"Limited evidence: {area}",
                        summary="evidence appears limited; inspectors may ask for stronger source-record trails.",
                        manager_review_required=True,
                    )
                )
        return risks[:10]

    def _trend_lines(self, patterns: list[PatternFinding]) -> tuple[list[str], list[str]]:
        improved: list[str] = []
        deteriorated: list[str] = []
        increase_types = {
            "missing_episode_increase",
            "incident_increase",
            "restraint_increase",
            "safeguarding_concern_repeated",
        }
        for pattern in patterns:
            if pattern.pattern_type in increase_types:
                deteriorated.append(pattern.summary)
            elif pattern.pattern_type == "child_voice_missing":
                deteriorated.append(pattern.summary)
        if not deteriorated:
            improved.append("records indicate no major deterioration patterns in supplied evidence; source review still required.")
        return improved[:8], deteriorated[:8]

    def _manager_review_items(self, patterns: list[PatternFinding], record_quality: list[Any]) -> list[str]:
        items = [p.summary for p in patterns if p.manager_review_required]
        items.extend(
            f"Record {getattr(r, 'record_id', 'unknown')}: manager review recommended"
            for r in record_quality
            if getattr(r, "manager_review_required", False)
        )
        return items[:15]

    def _priority_actions(self, patterns: list[PatternFinding], simulation: list[Any]) -> list[IntelligenceAction]:
        actions: list[IntelligenceAction] = []
        for index, pattern in enumerate(patterns[:8]):
            if not pattern.manager_review_required and pattern.severity not in {"high", "critical"}:
                continue
            actions.append(
                IntelligenceAction(
                    id=f"action-{pattern.pattern_type}-{index}",
                    title=f"Review {pattern.pattern_type.replace('_', ' ')}",
                    priority="urgent" if pattern.severity in {"high", "critical"} else "high",
                    owner_role="registered_manager",
                    reason=pattern.summary,
                    linked_finding_ids=[f"finding-{pattern.pattern_type}"],
                    suggested_next_step=(
                        pattern.recommended_reviews[0]
                        if pattern.recommended_reviews
                        else "manager oversight required — check source records"
                    ),
                    due_status="due_soon" if pattern.severity in {"high", "critical"} else "unknown",
                )
            )
        for item in simulation:
            for action in item.manager_actions[:2]:
                actions.append(
                    IntelligenceAction(
                        id=f"action-sim-{item.judgement_area}-{len(actions)}",
                        title="Inspection evidence review",
                        priority="medium",
                        owner_role="registered_manager",
                        reason=str(action),
                        suggested_next_step=str(action),
                    )
                )
        return actions[:12]


indicare_intelligence_spine_service = IndiCareIntelligenceSpineService()

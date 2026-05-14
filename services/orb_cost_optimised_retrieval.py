from __future__ import annotations

from typing import Any

from schemas.data_intelligence import EvidencePack, IntelligenceRecord
from services.ai_cost_control_service import ai_cost_control_service
from services.assistant_data_boundary import build_boundary_metadata
from services.chronology_cluster_service import chronology_cluster_service
from services.metadata_extraction_service import metadata_extraction_service
from services.provider_data_intelligence_settings_service import provider_data_intelligence_settings_service
from services.regulatory_graph_service import regulatory_graph_service


def _text(value: Any) -> str:
    return str(value or "").strip()


def _scope_from_context(context: dict[str, Any] | None) -> dict[str, Any]:
    context = context or {}
    return {
        "provider_id": context.get("provider_id"),
        "home_id": context.get("home_id"),
        "young_person_id": context.get("young_person_id") or context.get("selected_young_person_id"),
        "staff_id": context.get("staff_id"),
    }


def _intent(question: str) -> dict[str, str]:
    lower = question.lower()
    if any(term in lower for term in ("route", "where is", "navigate", "open page")):
        return {"intent": "navigation", "feature": "navigation"}
    if any(term in lower for term in ("reg 45", "reg45")):
        return {"intent": "report", "feature": "reg45_narrative", "report_type": "reg45"}
    if any(term in lower for term in ("lac review", "looked after review")):
        return {"intent": "report", "feature": "report_section_draft", "report_type": "lac_review"}
    if any(term in lower for term in ("inspection", "ofsted", "sccif", "quality standard")):
        return {"intent": "regulatory", "feature": "ofsted_challenge", "report_type": "inspection_readiness"}
    if any(term in lower for term in ("safeguarding", "missing", "risk")):
        return {"intent": "safeguarding", "feature": "complex_safeguarding_synthesis", "report_type": "safeguarding_chronology"}
    if any(term in lower for term in ("summary", "summarise", "handover")):
        return {"intent": "summary", "feature": "summary", "report_type": "handover"}
    return {"intent": "metadata", "feature": "metadata", "report_type": "inspection_readiness"}


class OrbCostOptimisedRetrievalService:
    """Builds minimal, citable evidence packs for Orb without full-record retrieval."""

    def build_evidence_pack(
        self,
        *,
        question: str,
        records: list[IntelligenceRecord | dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        current_user: dict[str, Any] | None = None,
        cached_summaries: list[dict[str, Any]] | None = None,
        settings: dict[str, Any] | None = None,
        mode: str = "balanced",
    ) -> EvidencePack:
        decision = _intent(question)
        if decision["feature"] == "navigation":
            plan = ai_cost_control_service.plan_request(feature="navigation", metadata_answer_available=True)
            return EvidencePack(
                question=question,
                scope={"intent": "navigation"},
                relevant_metadata={"cost_plan": plan.__dict__, "boundary": build_boundary_metadata()},
                ai_required=False,
            )

        scope = {key: value for key, value in _scope_from_context(context).items() if value is not None}
        prepared_records = self._prepare_records(records or [], current_user=current_user or {})
        scoped_records = self._scope_records(prepared_records, scope)
        report_type = decision.get("report_type", "inspection_readiness")
        pack = regulatory_graph_service.get_report_evidence_pack(
            scoped_records,
            report_type=report_type,
            question=question,
            scope=scope,
            max_citations=8,
        )
        clusters = chronology_cluster_service.cluster_summaries(scoped_records, scope=scope)[:4]
        pack.cached_summaries = (cached_summaries or [])[:4]
        pack.chronology_clusters = clusters
        metadata_answer_available = bool(pack.cached_summaries and not pack.evidence_gaps)
        resolved_settings = provider_data_intelligence_settings_service.from_record(settings or {})
        plan = ai_cost_control_service.plan_request(
            feature=decision["feature"],
            mode=mode,
            cache_hit=False,
            metadata_answer_available=metadata_answer_available,
            settings=resolved_settings,
        )
        pack = ai_cost_control_service.compress_evidence_pack(pack, plan=plan)
        pack.relevant_metadata = {
            **pack.relevant_metadata,
            "intent": decision["intent"],
            "retrieval_strategy": [
                "intent_route",
                "metadata_query",
                "regulatory_graph",
                "chronology_clusters",
                "top_citations_only",
                "compressed_evidence_pack",
            ],
            "excluded": [
                "full_chronology",
                "full_child_record",
                "full_documents",
                "unrelated_staff_data",
                "hidden_or_unauthorised_records",
            ],
            "cost_plan": plan.__dict__,
        }
        return pack

    def _prepare_records(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        current_user: dict[str, Any],
    ) -> list[IntelligenceRecord | dict[str, Any]]:
        prepared: list[IntelligenceRecord | dict[str, Any]] = []
        for record in records:
            if isinstance(record, IntelligenceRecord):
                prepared.append(record)
                continue
            if not isinstance(record, dict):
                continue
            if record.get("hidden") or record.get("is_hidden"):
                continue
            if "metadata" in record and isinstance(record["metadata"], dict) and "operational" in record["metadata"]:
                prepared.append(record)
                continue
            record_type = _text(record.get("record_type") or record.get("type") or "daily_note")
            metadata = metadata_extraction_service.extract_metadata(
                record_type=record_type,
                record=record,
                current_user=current_user,
                source_record_id=record.get("id"),
            )
            prepared.append({**record, "record_type": record_type, "metadata": metadata.model_dump(mode="json")})
        return prepared

    def _scope_records(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        scope: dict[str, Any],
    ) -> list[IntelligenceRecord | dict[str, Any]]:
        if not scope:
            return records
        scoped: list[IntelligenceRecord | dict[str, Any]] = []
        for record in records:
            metadata = record.metadata if isinstance(record, IntelligenceRecord) else record.get("metadata")
            operational_obj = metadata.operational if hasattr(metadata, "operational") else (metadata or {}).get("operational", {})
            operational = (
                operational_obj.model_dump()
                if hasattr(operational_obj, "model_dump")
                else dict(operational_obj or {})
            )
            if scope.get("provider_id") is not None and operational.get("provider_id") != scope["provider_id"]:
                continue
            if scope.get("home_id") is not None and operational.get("home_id") != scope["home_id"]:
                continue
            if scope.get("young_person_id") is not None and operational.get("young_person_id") != scope["young_person_id"]:
                continue
            scoped.append(record)
        return scoped


orb_cost_optimised_retrieval_service = OrbCostOptimisedRetrievalService()

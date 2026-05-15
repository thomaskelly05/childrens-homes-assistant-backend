from __future__ import annotations

import hashlib
import json
import os
from collections.abc import Mapping
from typing import Any

from schemas.data_intelligence import AIMetadata, DataIntelligenceMetadata, OperationalMetadata
from schemas.data_protection import DataClassification
from services.care_signal_service import care_signal_service
from services.data_classification_service import AI_RESTRICTED_CLASSIFICATIONS, classify_record_type, normalise_key
from services.intelligence_cache_service import intelligence_cache_service
from services.provider_data_intelligence_settings_service import provider_data_intelligence_settings_service
from services.regulatory_metadata_service import regulatory_metadata_service


METADATA_VERSION = "2026-05-14.v1"
FULL_TEXT_FIELDS = {
    "body",
    "content",
    "document_text",
    "extracted_text",
    "full_text",
    "raw_text",
    "transcript",
}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _text(value: Any) -> str:
    return str(value or "").strip()


def _ids(value: Any) -> list[int | str]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return [item for item in value if item not in (None, "")]
    return [value]


def _stable_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _minimal_text(record: Mapping[str, Any]) -> str:
    parts: list[str] = []
    for key, value in record.items():
        if key in FULL_TEXT_FIELDS:
            continue
        if isinstance(value, str) and len(value) <= 2000:
            parts.append(value)
    return "\n".join(parts)


class MetadataExtractionService:
    """Metadata-first extraction that uses cheap deterministic signals before any AI."""

    metadata_version = METADATA_VERSION

    def extract_metadata(
        self,
        *,
        record_type: str,
        record: Mapping[str, Any] | None = None,
        event_type: str | None = None,
        source_record_id: int | str | None = None,
        current_user: Mapping[str, Any] | None = None,
        existing_quality_standard_ids: list[str] | None = None,
    ) -> DataIntelligenceMetadata:
        record = record or {}
        current_user = current_user or {}
        record_type_key = normalise_key(record_type)
        operational = OperationalMetadata(
            provider_id=_safe_int(record.get("provider_id") or current_user.get("provider_id")),
            home_id=_safe_int(record.get("home_id") or current_user.get("home_id")),
            young_person_id=_safe_int(record.get("young_person_id") or record.get("child_id")),
            staff_id=_safe_int(record.get("staff_id") or record.get("author_id") or current_user.get("id")),
            shift_id=record.get("shift_id"),
            record_type=record_type_key,
            event_type=event_type or record.get("event_type"),
            workflow_status=record.get("workflow_status") or record.get("status"),
            source_record_id=source_record_id or record.get("source_record_id") or record.get("id"),
            linked_action_ids=_ids(record.get("linked_action_ids") or record.get("action_ids")),
            linked_evidence_ids=_ids(record.get("linked_evidence_ids") or record.get("evidence_ids")),
            linked_document_ids=_ids(record.get("linked_document_ids") or record.get("document_ids")),
            linked_report_ids=_ids(record.get("linked_report_ids") or record.get("report_ids")),
            created_at=_text(record.get("created_at")) or None,
            updated_at=_text(record.get("updated_at")) or None,
        )
        care = care_signal_service.extract(record_type=record_type_key, record=record, text=_minimal_text(record))
        regulatory = regulatory_metadata_service.map_metadata(
            record_type=record_type_key,
            care=care,
            workflow_status=operational.workflow_status,
            existing_quality_standard_ids=existing_quality_standard_ids,
        )
        ai = self._build_ai_metadata(record_type=record_type_key, operational=operational, care=care)
        confidence = self._deterministic_confidence(record=record, care_signal_count=len(care.detected_signals))
        return DataIntelligenceMetadata(
            operational=operational,
            care=care,
            regulatory=regulatory,
            ai=ai,
            metadata_version=self.metadata_version,
            extraction_method="deterministic_rules",
            deterministic_confidence=confidence,
        )

    def extract_for_daily_note(
        self,
        payload: Mapping[str, Any],
        *,
        young_person_id: int | None = None,
        home_id: int | None = None,
        staff_id: int | None = None,
        source_record_id: int | str | None = None,
        event_type: str = "saved",
    ) -> DataIntelligenceMetadata:
        record = dict(payload)
        record.setdefault("young_person_id", young_person_id)
        record.setdefault("home_id", home_id)
        record.setdefault("staff_id", staff_id or record.get("author_id"))
        return self.extract_metadata(
            record_type="daily_note",
            record=record,
            event_type=event_type,
            source_record_id=source_record_id,
        )

    def should_use_ai_enrichment(
        self,
        metadata: DataIntelligenceMetadata,
        *,
        provider_policy: Mapping[str, Any] | None = None,
    ) -> bool:
        settings = provider_data_intelligence_settings_service.from_record(dict(provider_policy or {}))
        if not settings.external_ai_enabled or not os.getenv("AI_EXTERNAL_PROCESSING_ENABLED", "").lower() in {"1", "true", "yes", "on"}:
            return False
        if metadata.ai.ai_restricted or metadata.ai.redaction_required is False:
            return False
        return metadata.deterministic_confidence < 0.65

    def process_daily_note_saved(
        self,
        payload: Mapping[str, Any],
        *,
        young_person_id: int | None,
        home_id: int | None,
        staff_id: int | None,
        source_record_id: int | str,
        event_type: str = "daily_note_saved",
    ) -> dict[str, Any]:
        metadata = self.extract_for_daily_note(
            payload,
            young_person_id=young_person_id,
            home_id=home_id,
            staff_id=staff_id,
            source_record_id=source_record_id,
            event_type=event_type,
        )
        invalidation = intelligence_cache_service.invalidate_for_event(
            "daily_note_saved",
            scope={
                "provider_id": metadata.operational.provider_id,
                "home_id": metadata.operational.home_id,
                "young_person_id": metadata.operational.young_person_id,
            },
        )
        return {
            "metadata": metadata.model_dump(mode="json"),
            "chronology_cluster_candidates": self._cluster_candidates(metadata),
            "suggested_actions": self._suggested_actions(metadata),
            "cache_invalidation": invalidation,
            "ai_enrichment_required": self.should_use_ai_enrichment(metadata),
        }

    def _build_ai_metadata(
        self,
        *,
        record_type: str,
        operational: OperationalMetadata,
        care: Any,
    ) -> AIMetadata:
        classification = self._classification(record_type, care=care)
        priority = "high" if care.safeguarding_marker or care.risk_marker or care.missing_marker else "normal"
        if care.positive_progress_present and not (care.safeguarding_marker or care.risk_marker):
            priority = "medium"
        cache_key = intelligence_cache_service.build_cache_key(
            cache_type="record_metadata",
            provider_id=operational.provider_id,
            home_id=operational.home_id,
            young_person_id=operational.young_person_id,
            record_version=operational.updated_at or operational.created_at or operational.source_record_id,
            metadata_version=self.metadata_version,
            extra={"record_type": record_type, "source_record_id": operational.source_record_id},
        )
        reference = f"{record_type}:{_stable_hash({'home': operational.home_id, 'child': operational.young_person_id, 'source': operational.source_record_id})}"
        return AIMetadata(
            sensitivity_classification=classification,
            ai_restricted=classification in AI_RESTRICTED_CLASSIFICATIONS,
            redaction_required=classification != DataClassification.PUBLIC_SYSTEM,
            summarised=False,
            retrieval_priority=priority,
            cache_key=cache_key,
            anonymised_reference=reference,
            external_ai_allowed=False,
        )

    def _classification(self, record_type: str, *, care: Any) -> DataClassification:
        if care.safeguarding_marker or care.risk_marker or care.missing_marker or care.incident_marker:
            return DataClassification.SAFEGUARDING_SENSITIVE
        if care.health_present:
            return DataClassification.HEALTH_SENSITIVE
        if care.education_present:
            return DataClassification.EDUCATION_SENSITIVE
        return classify_record_type(record_type)

    def _deterministic_confidence(self, *, record: Mapping[str, Any], care_signal_count: int) -> float:
        score = 0.45
        score += min(care_signal_count * 0.07, 0.35)
        if any(record.get(field) for field in ("workflow_status", "status", "significance", "category")):
            score += 0.1
        if any(record.get(field) for field in ("education_update", "health_update", "family_update", "young_person_voice")):
            score += 0.1
        return round(min(score, 1.0), 2)

    def _cluster_candidates(self, metadata: DataIntelligenceMetadata) -> list[str]:
        care = metadata.care
        candidates: list[str] = []
        mapping = {
            "emotional_wellbeing": care.emotional_wellbeing_present,
            "safeguarding": care.safeguarding_marker or care.risk_marker,
            "missing_episodes": care.missing_marker,
            "education": care.education_present,
            "health": care.health_present,
            "family_contact": care.family_contact_present,
            "positive_progress": care.positive_progress_present,
            "relationships": care.relationship_present,
            "trauma_informed_support": care.trauma_informed_support,
            "neurodiversity_adjustments": care.neurodiversity_adjustment or care.sensory_factor,
            "incidents": care.incident_marker,
            "management_oversight": care.manager_review_required,
            "handover": care.handover_relevance,
        }
        for theme, present in mapping.items():
            if present:
                candidates.append(theme)
        return candidates or ["placement_stability"]

    def _suggested_actions(self, metadata: DataIntelligenceMetadata) -> list[dict[str, Any]]:
        suggestions: list[dict[str, Any]] = []
        if metadata.care.child_voice_missing:
            suggestions.append({"type": "record_quality", "prompt": "Add the young person's voice, wishes or feelings if known."})
        if metadata.care.missing_marker:
            suggestions.append({"type": "safeguarding_review", "prompt": "Review missing episode follow-up and chronology links."})
        if metadata.care.follow_up_required:
            suggestions.append({"type": "follow_up", "prompt": "Create or link a follow-up action."})
        if metadata.care.trauma_informed_support is False and (metadata.care.incident_marker or metadata.care.risk_marker):
            suggestions.append({"type": "trauma_informed_recording", "prompt": "Consider adding regulation support, recovery or repair evidence."})
        if metadata.care.sensory_factor and not metadata.care.neurodiversity_adjustment:
            suggestions.append({"type": "neurodiversity_adjustment", "prompt": "Review whether a sensory factor or adjustment should be recorded."})
        if metadata.care.risk_update_suggested:
            suggestions.append({"type": "risk_review", "prompt": "Review whether the current risk assessment needs updating."})
        return suggestions


metadata_extraction_service = MetadataExtractionService()

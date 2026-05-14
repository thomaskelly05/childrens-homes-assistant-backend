from __future__ import annotations

from typing import Any

from schemas.data_intelligence import CitationSnippet, DataIntelligenceMetadata, EvidencePack, IntelligenceRecord


def _text(value: Any) -> str:
    return str(value or "").strip()


def _as_metadata(record: IntelligenceRecord | dict[str, Any]) -> DataIntelligenceMetadata | None:
    if isinstance(record, IntelligenceRecord):
        return record.metadata
    metadata = record.get("metadata") if isinstance(record, dict) else None
    if isinstance(metadata, DataIntelligenceMetadata):
        return metadata
    if isinstance(metadata, dict):
        if "operational" in metadata and "care" in metadata:
            return DataIntelligenceMetadata(**metadata)
        if "data_intelligence" in metadata:
            return DataIntelligenceMetadata(**metadata["data_intelligence"])
    return None


def _record_id(record: IntelligenceRecord | dict[str, Any]) -> int | str:
    if isinstance(record, IntelligenceRecord):
        return record.id
    return record.get("id") or record.get("source_record_id") or record.get("record_id") or ""


def _record_type(record: IntelligenceRecord | dict[str, Any]) -> str:
    if isinstance(record, IntelligenceRecord):
        return record.record_type
    return _text(record.get("record_type") or record.get("type") or "record")


def _title(record: IntelligenceRecord | dict[str, Any]) -> str:
    if isinstance(record, IntelligenceRecord):
        return record.title or record.record_type.replace("_", " ").title()
    return _text(record.get("title") or record.get("document_type") or _record_type(record).replace("_", " ").title())


def _summary(record: IntelligenceRecord | dict[str, Any]) -> str:
    if isinstance(record, IntelligenceRecord):
        return record.summary or ""
    return _text(record.get("summary") or record.get("description") or record.get("narrative") or record.get("snippet"))


def _event_date(record: IntelligenceRecord | dict[str, Any]) -> str | None:
    if isinstance(record, IntelligenceRecord):
        return record.event_date
    value = record.get("event_date") or record.get("date_time") or record.get("created_at") or record.get("updated_at")
    return _text(value) or None


def _hidden(record: IntelligenceRecord | dict[str, Any]) -> bool:
    if isinstance(record, IntelligenceRecord):
        return record.hidden
    return bool(record.get("hidden") or record.get("is_hidden") or record.get("archived"))


def _in_scope(record: IntelligenceRecord | dict[str, Any], scope: dict[str, Any] | None) -> bool:
    if _hidden(record):
        return False
    if not scope:
        return True
    metadata = _as_metadata(record)
    if metadata is None:
        return True
    operational = metadata.operational
    for key in ("provider_id", "home_id", "young_person_id", "staff_id"):
        expected = scope.get(key)
        if expected is not None and getattr(operational, key) != expected:
            return False
    return True


def _citation(record: IntelligenceRecord | dict[str, Any]) -> CitationSnippet:
    metadata = _as_metadata(record)
    record_type = _record_type(record)
    record_id = _record_id(record)
    tags: list[str] = []
    if metadata:
        tags.extend(metadata.regulatory.quality_standard_ids)
        tags.extend(metadata.regulatory.sccif_area_ids)
    citation_ref = (
        record.citation_ref
        if isinstance(record, IntelligenceRecord) and record.citation_ref
        else f"[{record_type}:{record_id}]"
    )
    snippet = _summary(record)
    if len(snippet) > 420:
        snippet = snippet[:417].rstrip() + "..."
    return CitationSnippet(
        citation_ref=citation_ref,
        record_type=record_type,
        record_id=record_id,
        title=_title(record),
        snippet=snippet,
        event_date=_event_date(record),
        metadata_tags=sorted(set(tags))[:12],
    )


class RegulatoryGraphService:
    """Queries record metadata before raw records for reports, Orb and inspection packs."""

    def get_records_for_quality_standard(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        quality_standard_id: str,
        *,
        scope: dict[str, Any] | None = None,
    ) -> list[IntelligenceRecord | dict[str, Any]]:
        return [
            record
            for record in records
            if _in_scope(record, scope)
            and (metadata := _as_metadata(record))
            and quality_standard_id in metadata.regulatory.quality_standard_ids
        ]

    def get_records_for_regulation(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        regulation_id: str,
        *,
        scope: dict[str, Any] | None = None,
    ) -> list[IntelligenceRecord | dict[str, Any]]:
        return [
            record
            for record in records
            if _in_scope(record, scope)
            and (metadata := _as_metadata(record))
            and regulation_id in metadata.regulatory.children_home_regulation_ids
        ]

    def get_records_for_sccif_area(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        sccif_area_id: str,
        *,
        scope: dict[str, Any] | None = None,
    ) -> list[IntelligenceRecord | dict[str, Any]]:
        return [
            record
            for record in records
            if _in_scope(record, scope)
            and (metadata := _as_metadata(record))
            and sccif_area_id in metadata.regulatory.sccif_area_ids
        ]

    def get_evidence_gaps_for_child(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        young_person_id: int,
        *,
        home_id: int | None = None,
    ) -> list[dict[str, Any]]:
        return self._evidence_gaps(records, scope={"young_person_id": young_person_id, "home_id": home_id})

    def get_evidence_gaps_for_home(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        home_id: int,
    ) -> list[dict[str, Any]]:
        return self._evidence_gaps(records, scope={"home_id": home_id})

    def get_report_evidence_pack(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        report_type: str,
        question: str = "",
        scope: dict[str, Any] | None = None,
        max_citations: int = 8,
    ) -> EvidencePack:
        scoped = [record for record in records if _in_scope(record, scope)]
        relevant = [
            record
            for record in scoped
            if (metadata := _as_metadata(record))
            and (report_type in metadata.regulatory.report_relevance or self._report_matches(report_type, metadata))
        ]
        ranked = sorted(relevant, key=self._rank_record, reverse=True)
        citations = [_citation(record) for record in ranked[:max(3, min(max_citations, 8))]]
        links = self._regulatory_links(ranked)
        gaps = self._evidence_gaps(scoped, scope=scope)
        return EvidencePack(
            question=question or f"{report_type} evidence pack",
            scope=scope or {},
            relevant_metadata={
                "report_type": report_type,
                "record_count": len(scoped),
                "selected_record_count": len(ranked),
            },
            citations=citations,
            evidence_gaps=gaps,
            linked_actions=self._linked_actions(ranked),
            regulatory_links=links,
            ai_required=False,
        )

    def get_inspection_readiness_pack(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        scope: dict[str, Any] | None = None,
    ) -> EvidencePack:
        return self.get_report_evidence_pack(records, report_type="inspection_readiness", scope=scope)

    def get_reg45_evidence_pack(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        scope: dict[str, Any] | None = None,
    ) -> EvidencePack:
        return self.get_report_evidence_pack(records, report_type="reg45", scope=scope)

    def get_lac_review_evidence_pack(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        scope: dict[str, Any] | None = None,
    ) -> EvidencePack:
        return self.get_report_evidence_pack(records, report_type="lac_review", scope=scope)

    def build_report_skeleton(self, report_type: str) -> dict[str, Any]:
        sections = {
            "reg44_action_plan": ["overview", "actions", "management_oversight", "evidence_gaps"],
            "reg45": ["quality_of_care", "safeguarding", "education", "health", "relationships", "leadership"],
            "lac_review": ["progress", "voice", "education", "health", "family_time", "risks", "actions"],
            "safeguarding_chronology": ["summary", "episodes", "risk_trends", "actions", "management_review"],
            "ofsted_evidence_pack": ["sccif_coverage", "quality_standards", "citations", "evidence_gaps"],
            "manager_oversight_report": ["daily_digest", "reviews", "actions", "quality_flags"],
        }
        return {
            "report_type": report_type,
            "sections": sections.get(report_type, ["overview", "evidence", "gaps"]),
            "generation_strategy": "metadata_graph_first",
            "ai_role": "narrative_polishing_only",
        }

    def _report_matches(self, report_type: str, metadata: DataIntelligenceMetadata) -> bool:
        if report_type == "inspection_readiness":
            return metadata.regulatory.inspection_relevance != "none"
        if report_type == "reg45":
            return metadata.regulatory.reg45_relevance
        if report_type == "reg44":
            return metadata.regulatory.reg44_relevance
        if report_type == "lac_review":
            return metadata.regulatory.lac_review_relevance
        return False

    def _rank_record(self, record: IntelligenceRecord | dict[str, Any]) -> tuple[int, str]:
        metadata = _as_metadata(record)
        score = 0
        if metadata:
            score += {"high": 10, "medium": 6, "normal": 3}.get(metadata.ai.retrieval_priority, 1)
            score += {"strong": 4, "medium": 2, "limited": 0}.get(metadata.regulatory.evidence_strength, 0)
            score += 3 if metadata.regulatory.evidence_gap_ids else 0
        return score, _event_date(record) or ""

    def _evidence_gaps(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        scope: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        gaps: dict[str, dict[str, Any]] = {}
        for record in records:
            if not _in_scope(record, scope):
                continue
            metadata = _as_metadata(record)
            if not metadata:
                continue
            for gap_id in metadata.regulatory.evidence_gap_ids:
                key = f"{gap_id}:{metadata.operational.young_person_id or metadata.operational.home_id or 'scope'}"
                gaps[key] = {
                    "gap_id": gap_id,
                    "record_type": metadata.operational.record_type,
                    "source_record_id": metadata.operational.source_record_id,
                    "young_person_id": metadata.operational.young_person_id,
                    "home_id": metadata.operational.home_id,
                    "severity": "review",
                }
        return list(gaps.values())

    def _linked_actions(self, records: list[IntelligenceRecord | dict[str, Any]]) -> list[int | str]:
        actions: list[int | str] = []
        for record in records:
            metadata = _as_metadata(record)
            if metadata:
                actions.extend(metadata.operational.linked_action_ids)
        return sorted(set(actions), key=str)[:12]

    def _regulatory_links(self, records: list[IntelligenceRecord | dict[str, Any]]) -> list[dict[str, Any]]:
        links: dict[str, dict[str, Any]] = {}
        for record in records:
            metadata = _as_metadata(record)
            if not metadata:
                continue
            for standard in metadata.regulatory.quality_standard_ids:
                links[f"standard:{standard}"] = {"type": "quality_standard", "id": standard}
            for regulation in metadata.regulatory.children_home_regulation_ids:
                links[f"regulation:{regulation}"] = {"type": "regulation", "id": regulation}
            for sccif in metadata.regulatory.sccif_area_ids:
                links[f"sccif:{sccif}"] = {"type": "sccif", "id": sccif}
        return list(links.values())[:30]


regulatory_graph_service = RegulatoryGraphService()

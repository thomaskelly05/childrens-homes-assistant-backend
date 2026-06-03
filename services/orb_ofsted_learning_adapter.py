"""Adapt Ofsted report intelligence for ORB learning — practice markers only."""

from __future__ import annotations

from typing import Any

from services.ofsted_practice_pattern_service import ofsted_practice_pattern_service
from services.ofsted_report_analysis_service import ofsted_report_analysis_service
from services.ofsted_report_citation_service import ofsted_report_citation_service
from services.ofsted_report_ingestion_service import ofsted_report_ingestion_service


class OrbOfstedLearningAdapter:
    def learn_from_report_text(
        self,
        *,
        provider_name: str,
        report_url: str,
        report_text: str,
        **metadata: Any,
    ) -> dict[str, Any]:
        ingested = ofsted_report_ingestion_service.ingest(
            provider_name=provider_name,
            report_url=report_url,
            report_text=report_text,
            **metadata,
        )
        if ingested.get("status") != "ingested":
            return ingested
        report = ingested["report"]
        analysis = ofsted_report_analysis_service.analyse(report_text)
        patterns = ofsted_practice_pattern_service.markers_from_themes(analysis.get("themes") or {})
        citation = ofsted_report_citation_service.citation_for_report(report["report_id"])
        return {
            "status": "learning_packet",
            "report_id": report["report_id"],
            "analysis_summary": {
                "themes": analysis.get("themes"),
                "finding_count": analysis.get("finding_excerpt_count"),
            },
            "practice_patterns": patterns,
            "citation": citation,
            "auto_apply_allowed": False,
            "human_approval_required": True,
        }


orb_ofsted_learning_adapter = OrbOfstedLearningAdapter()

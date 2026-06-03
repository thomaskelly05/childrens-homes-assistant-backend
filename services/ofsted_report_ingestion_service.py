"""Ingest public Ofsted report text where lawfully provided — no open scraping."""

from __future__ import annotations

from typing import Any

from services.ofsted_report_registry_service import ofsted_report_registry_service


class OfstedReportIngestionService:
    def ingest(
        self,
        *,
        provider_name: str,
        report_url: str,
        report_text: str,
        **metadata: Any,
    ) -> dict[str, Any]:
        if not report_text.strip():
            return {"status": "rejected", "reason": "empty_report_text"}
        if "reports.ofsted.gov.uk" not in report_url and "gov.uk" not in report_url:
            return {
                "status": "rejected",
                "reason": "URL must be official Ofsted or gov.uk report source",
            }
        entry = ofsted_report_registry_service.register_report(
            provider_name=provider_name,
            report_url=report_url,
            report_text=report_text,
            **{k: v for k, v in metadata.items() if k in (
                "report_date", "rating", "provider_type", "region", "local_authority"
            )},
        )
        return {"status": "ingested", "report": entry}


ofsted_report_ingestion_service = OfstedReportIngestionService()

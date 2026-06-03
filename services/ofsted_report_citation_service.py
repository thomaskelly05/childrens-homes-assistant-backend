"""Cite Ofsted report metadata when used in ORB answers."""

from __future__ import annotations

from typing import Any

from services.ofsted_report_registry_service import ofsted_report_registry_service


class OfstedReportCitationService:
    def citation_for_report(self, report_id: str) -> dict[str, Any] | None:
        report = ofsted_report_registry_service.get_report(report_id)
        if not report:
            return None
        return {
            "source_type": "ofsted_public_report",
            "trust_tier": "gold",
            "label": f"Ofsted report: {report.get('provider_name')}",
            "report_url": report.get("report_url"),
            "report_date": report.get("report_date"),
            "rating": report.get("rating"),
            "must_not_overclaim": "Do not predict grades for the user's home; public report learning only.",
            "child_identifiable": False,
        }


ofsted_report_citation_service = OfstedReportCitationService()

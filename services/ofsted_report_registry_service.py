"""Registry for public Ofsted children's home reports — metadata only at rest."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class OfstedReportRegistryService:
    def __init__(self) -> None:
        self._reports: dict[str, dict[str, Any]] = {}

    def register_report(
        self,
        *,
        provider_name: str,
        report_url: str,
        report_date: str | None = None,
        rating: str | None = None,
        provider_type: str = "childrens_home",
        region: str | None = None,
        local_authority: str | None = None,
        report_text: str | None = None,
    ) -> dict[str, Any]:
        report_id = hashlib.sha256(report_url.encode()).hexdigest()[:16]
        text_hash = hashlib.sha256((report_text or report_url).encode()).hexdigest()
        entry = {
            "report_id": report_id,
            "provider_name": provider_name,
            "report_url": report_url,
            "report_date": report_date,
            "rating": rating,
            "provider_type": provider_type,
            "region": region,
            "local_authority": local_authority,
            "status": "registered",
            "retrieval_date": _utc_now(),
            "content_hash": text_hash,
        }
        self._reports[report_id] = entry
        return entry

    def get_report(self, report_id: str) -> dict[str, Any] | None:
        return self._reports.get(report_id)

    def search(
        self,
        *,
        provider_name: str | None = None,
        rating: str | None = None,
        region: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        results = list(self._reports.values())
        if provider_name:
            pn = provider_name.lower()
            results = [r for r in results if pn in str(r.get("provider_name", "")).lower()]
        if rating:
            results = [r for r in results if str(r.get("rating") or "").lower() == rating.lower()]
        if region:
            results = [r for r in results if region.lower() in str(r.get("region") or "").lower()]
        return results[:limit]


ofsted_report_registry_service = OfstedReportRegistryService()

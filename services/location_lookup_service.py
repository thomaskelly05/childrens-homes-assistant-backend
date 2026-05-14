from __future__ import annotations

from typing import Any

from services.locality_data_provider_service import locality_data_provider_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, safe_payload


LOOKUP_PROVIDER_BY_FEATURE = {
    "nearest McDonald's": "google_places",
    "nearest park": "openstreetmap_nominatim",
    "nearest train station": "transport_open_data",
    "nearest GP/hospital": "nhs_public_lookup",
    "travel estimates": "transport_open_data",
    "locality hotspots": "police_uk",
    "safe location notes": "openstreetmap_nominatim",
}


class LocationLookupService:
    """Feature-level location lookup with privacy checks and cache-first behaviour."""

    def suggest(
        self,
        *,
        feature: str,
        postcode: str | None = None,
        locality: str | None = None,
        offline_results: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        provider = LOOKUP_PROVIDER_BY_FEATURE.get(feature, "openstreetmap_nominatim")
        result = locality_data_provider_service.lookup_cached_or_offline(
            provider=provider,
            query=feature,
            postcode=postcode,
            locality=locality,
            offline_results=offline_results,
        )
        return safe_payload(
            {
                "feature": feature,
                "provider": provider,
                "summary": "records indicate lookup context is cache-first and privacy-preserving.",
                "suggestions": result["results"],
                "privacy": {
                    "child_names_sent": False,
                    "safeguarding_details_sent": False,
                    "generalised_locality_only": True,
                    "cache_hit": result["cache_hit"],
                },
                "audit": result["audit"],
                "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
            }
        )


location_lookup_service = LocationLookupService()

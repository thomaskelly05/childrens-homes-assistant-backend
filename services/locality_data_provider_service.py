from __future__ import annotations

import re
from typing import Any

from services.location_context_cache_service import location_context_cache_service
from services.risk_intelligence_language import now_iso, safe_payload, safe_text


PROVIDERS = {
    "google_places": "Google Places abstraction",
    "openstreetmap_nominatim": "OpenStreetMap/Nominatim",
    "police_uk": "police.uk public data",
    "nhs_public_lookup": "NHS public lookup",
    "schools_ofsted": "schools/Ofsted public data",
    "transport_open_data": "transport/open data",
}


class LocalityDataProviderService:
    """Privacy-preserving provider facade; tests and offline mode do not call networks."""

    def provider_capabilities(self) -> dict[str, Any]:
        return {
            "providers": PROVIDERS,
            "privacy_rules": [
                "NEVER send child names externally.",
                "NEVER send safeguarding details externally.",
                "Use generalised locality only.",
                "Cache aggressively and audit external lookups.",
                "Support offline/manual mode.",
            ],
        }

    def build_external_payload(
        self,
        *,
        provider: str,
        query: str,
        postcode: str | None = None,
        locality: str | None = None,
        child_name: str | None = None,
        safeguarding_details: str | None = None,
    ) -> dict[str, Any]:
        del child_name, safeguarding_details
        payload = {
            "provider": provider,
            "query": safe_text(query),
            "postcode_area": self._generalise_postcode(postcode),
            "locality": safe_text(locality),
            "contains_child_name": False,
            "contains_safeguarding_details": False,
            "created_at": now_iso(),
        }
        return safe_payload(payload)

    def lookup_cached_or_offline(
        self,
        *,
        provider: str,
        query: str,
        postcode: str | None = None,
        locality: str | None = None,
        offline_results: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        payload = self.build_external_payload(provider=provider, query=query, postcode=postcode, locality=locality)
        key = location_context_cache_service.key(scope=payload, context_type="provider_lookup")
        cached = location_context_cache_service.get(key)
        if cached:
            return {**cached["value"], "cache_hit": True, "raw_provider_error": None}
        result = {
            "provider": provider,
            "query": payload,
            "results": safe_payload(offline_results or []),
            "mode": "offline_manual" if offline_results is not None else "not_called",
            "audit": {"lookup_key": key, "external_call_made": False, "created_at": now_iso()},
            "raw_provider_error": None,
        }
        location_context_cache_service.set(key, result, source="provider_lookup_cache")
        return safe_payload({**result, "cache_hit": False})

    def _generalise_postcode(self, postcode: str | None) -> str | None:
        if not postcode:
            return None
        clean = re.sub(r"\s+", " ", postcode.upper()).strip()
        return clean.split(" ")[0]


locality_data_provider_service = LocalityDataProviderService()

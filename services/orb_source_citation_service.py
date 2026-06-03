"""Citation and source-basis metadata for ORB answers from trusted registry."""

from __future__ import annotations

from typing import Any

from services.orb_source_registry_service import orb_source_registry_service
from services.trusted_source_registry_service import trusted_source_registry_service


class OrbSourceCitationService:
    def build_citation_basis(
        self,
        source_ids: list[str],
        *,
        why_cited: str = "",
    ) -> dict[str, Any]:
        citations: list[dict[str, Any]] = []
        confidences: list[float] = []
        tiers: list[str] = []
        for sid in source_ids:
            trusted = trusted_source_registry_service.to_summary(sid)
            legacy = orb_source_registry_service.to_citation_payload(sid, why_cited=why_cited)
            if trusted:
                citations.append(
                    {
                        **trusted,
                        "basis_type": "summary" if trusted.get("summary_allowed") else "reference_only",
                        "why_cited": why_cited,
                        "governed": True,
                    }
                )
                confidences.append(trusted.get("confidence") or 0.0)
                tiers.append(str(trusted.get("trust_tier") or ""))
            elif legacy:
                citations.append({**legacy, "governed": False, "trust_tier": "legacy"})
                confidences.append(0.7)
                tiers.append("legacy")

        overall = sum(confidences) / len(confidences) if confidences else 0.0
        return {
            "citations": citations,
            "source_confidence": round(overall, 3),
            "trust_tiers": tiers,
            "registry_version": trusted_source_registry_service.registry_version(),
            "citation_required": any(c.get("citation_required") for c in citations),
        }

    def filter_allowed_source_ids(self, source_ids: list[str]) -> tuple[list[str], list[str]]:
        allowed: list[str] = []
        blocked: list[str] = []
        known = {s["source_id"] for s in trusted_source_registry_service.list_sources()}
        for sid in source_ids:
            if sid in known:
                allowed.append(sid)
            else:
                blocked.append(sid)
        return allowed, blocked


orb_source_citation_service = OrbSourceCitationService()

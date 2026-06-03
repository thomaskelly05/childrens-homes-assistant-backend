"""Registered Home Domain Brain — 55-domain map for IndiCare Intelligence 10."""

from __future__ import annotations

import json
import os
from typing import Any

from services.orb_residential_brain_catalog_service import orb_residential_brain_catalog_service

_MAP_PATH = os.path.join(
    os.path.dirname(__file__), "..", "assistant", "knowledge", "indicare_registered_home_domain_map.json"
)

_CATALOG_MERGE_IDS = {
    "allegations_lado": "allegations_lado_staff_conduct",
    "missing_from_home": "missing_from_care",
    "restraint_restrictive": "restraint_physical_intervention",
    "recording_quality": "recording_quality_child_voice",
    "behaviour_support": "therapeutic_practice",
    "ofsted_sccif": "ofsted_sccif_evidence",
    "ri_governance": "leadership_governance_drift",
    "online_safety": "online_harm_contextual_safeguarding",
    "transitions_discharge": "admissions_transitions_matching",
    "advocacy_complaints": "rights_identity_equality",
}


class IndicareRegisteredHomeDomainBrainService:
    def __init__(self) -> None:
        self._map: dict[str, Any] | None = None

    def _load(self) -> dict[str, Any]:
        if self._map is None:
            with open(os.path.normpath(_MAP_PATH), encoding="utf-8") as f:
                self._map = json.load(f)
        return self._map

    def list_domains(self) -> list[dict[str, Any]]:
        return list(self._load().get("domains") or [])

    def domain_count(self) -> int:
        return int(self._load().get("domain_count") or len(self.list_domains()))

    def get_domain(self, domain_id: str) -> dict[str, Any] | None:
        for d in self.list_domains():
            if d.get("domain_id") == domain_id:
                return dict(d)
        return None

    def match_domains(self, message: str, *, mode: str | None = None, limit: int = 8) -> list[dict[str, Any]]:
        lower = str(message or "").lower()
        mode_lower = str(mode or "").lower()
        scored: list[tuple[int, dict[str, Any]]] = []
        for domain in self.list_domains():
            score = 0
            for trigger in domain.get("triggers") or []:
                t = str(trigger).lower()
                if t in lower:
                    score += 2
                if t in mode_lower:
                    score += 1
            if score > 0:
                scored.append((score, domain))
        scored.sort(key=lambda x: (-x[0], x[1].get("name", "")))
        if not scored:
            fallback = self.get_domain("care_planning") or self.get_domain("safeguarding_referrals")
            return [dict(fallback)] if fallback else []
        return [dict(d) for _, d in scored[:limit]]

    def _merge_catalog_wording(self, domains: list[dict[str, Any]]) -> list[dict[str, Any]]:
        catalog_domains = {
            d.id: d for d in orb_residential_brain_catalog_service.domains.values()
        }
        merged: list[dict[str, Any]] = []
        for domain in domains:
            out = dict(domain)
            catalog_id = _CATALOG_MERGE_IDS.get(domain.get("domain_id", ""), domain.get("domain_id", ""))
            cat = catalog_domains.get(catalog_id)
            if cat:
                out["catalog_merge"] = {
                    "adult_needs_to_know": list(cat.adult_needs_to_know),
                    "answer_lens": list(cat.answer_lens),
                    "evidence_questions": list(cat.evidence_questions),
                    "boundaries": list(cat.boundaries),
                }
            merged.append(out)
        return merged

    def context_payload(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        matched = self.match_domains(message, mode=mode)
        merged = self._merge_catalog_wording(matched)
        return {
            "map_version": self._load().get("version"),
            "domain_count": self.domain_count(),
            "matched_domains": merged,
            "matched_domain_ids": [d.get("domain_id") for d in merged],
        }

    def prompt_block(self, message: str, *, mode: str | None = None) -> str:
        domains = self._merge_catalog_wording(self.match_domains(message, mode=mode))
        if not domains:
            return ""
        lines = ["Registered Home Domain Brain (IndiCare Intelligence 10):"]
        for domain in domains[:6]:
            lines.append(f"- {domain.get('name')}: {domain.get('description')}")
            merge = domain.get("catalog_merge") or {}
            if merge.get("adult_needs_to_know"):
                lines.append("  Adult needs to know: " + "; ".join(merge["adult_needs_to_know"][:4]))
            elif domain.get("adult_needs_to_know"):
                lines.append("  Adult needs to know: " + "; ".join(domain["adult_needs_to_know"][:4]))
            if merge.get("answer_lens"):
                lines.append("  Answer lens: " + "; ".join(merge["answer_lens"][:4]))
            elif domain.get("answer_lens"):
                lines.append("  Answer lens: " + "; ".join(domain["answer_lens"][:4]))
            reqs = domain.get("minimum_answer_requirements") or []
            if reqs:
                lines.append("  Minimum: " + "; ".join(reqs[:4]))
        return "\n".join(lines)


indicare_registered_home_domain_brain_service = IndicareRegisteredHomeDomainBrainService()

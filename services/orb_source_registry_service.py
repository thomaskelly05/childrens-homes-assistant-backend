"""Service layer for ORB source citation registry."""

from __future__ import annotations

from typing import Any

from assistant.knowledge.orb_source_registry import ORB_SOURCE_REGISTRY
from schemas.orb_expert_scenarios import OrbSourceRegistryEntry


class OrbSourceRegistryService:
    def __init__(self) -> None:
        self._sources = {s["source_id"]: s for s in ORB_SOURCE_REGISTRY}

    def list_sources(self) -> list[dict[str, Any]]:
        return list(ORB_SOURCE_REGISTRY)

    def get_source(self, source_id: str) -> dict[str, Any] | None:
        return self._sources.get(source_id)

    def get_by_ids(self, source_ids: list[str]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for sid in source_ids:
            src = self.get_source(sid)
            if src:
                out.append(src)
        return out

    def validate_anchor_ids(self, anchor_ids: list[str]) -> tuple[list[str], list[str]]:
        valid: list[str] = []
        missing: list[str] = []
        for aid in anchor_ids:
            if aid in self._sources:
                valid.append(aid)
            else:
                missing.append(aid)
        return valid, missing

    def sources_for_family(self, family_id: str) -> list[dict[str, Any]]:
        return [
            s
            for s in ORB_SOURCE_REGISTRY
            if family_id in (s.get("scenario_families") or []) or not s.get("scenario_families")
        ]

    def core_official_sources(self) -> list[dict[str, Any]]:
        core_ids = {
            "dfe_childrens_homes_regulations_guide",
            "childrens_homes_regulations_2015",
            "ofsted_sccif_childrens_homes",
            "working_together_safeguarding",
            "missing_from_care_guidance",
        }
        return [s for s in ORB_SOURCE_REGISTRY if s["source_id"] in core_ids]

    def to_citation_payload(self, source_id: str, *, why_cited: str = "") -> dict[str, Any] | None:
        src = self.get_source(source_id)
        if not src:
            return None
        labels = src.get("citation_labels") or []
        label = labels[0] if labels else src.get("label")
        return {
            "source_id": source_id,
            "label": label,
            "source_title": src.get("title"),
            "source_url": src.get("url", ""),
            "publisher": src.get("publisher"),
            "source_type": src.get("source_type"),
            "exact_text_available": bool(src.get("exact_text_available")),
            "summary_basis": src.get("summary_basis", ""),
            "why_cited": why_cited or "; ".join(src.get("when_to_cite") or [])[:240],
            "basis_type": "exact" if src.get("exact_text_available") else "summary",
            "confidence": src.get("confidence", "high"),
            "must_not_overclaim": src.get("must_not_overclaim", ""),
        }

    def entry_model(self, source_id: str) -> OrbSourceRegistryEntry | None:
        raw = self.get_source(source_id)
        if not raw:
            return None
        return OrbSourceRegistryEntry(**raw)


orb_source_registry_service = OrbSourceRegistryService()

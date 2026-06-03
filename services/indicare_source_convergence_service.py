"""Map ORB knowledge source packs to trusted source registry IDs."""

from __future__ import annotations

from typing import Any

from services.orb_knowledge_source_pack_service import ORB_KNOWLEDGE_SOURCE_PACKS, get_source_pack
from services.trusted_source_registry_service import trusted_source_registry_service

PACK_TO_TRUSTED: dict[str, list[str]] = {
    "indicare_product": [],
    "residential_childrens_homes": ["dfe_childrens_homes_regulations_guide"],
    "ofsted_sccif": ["ofsted_sccif_childrens_homes"],
    "childrens_homes_regulations": ["childrens_homes_regulations_2015", "dfe_childrens_homes_regulations_guide"],
    "quality_standards": ["dfe_childrens_homes_regulations_guide"],
    "safeguarding_principles": ["working_together_safeguarding", "keeping_children_safe_in_education"],
    "recording_quality": ["dfe_childrens_homes_regulations_guide"],
    "therapeutic_practice": [],
    "academy_learning": [],
    "nvq_diploma_support": [],
    "workforce_development": [],
    "qualification_evidence": [],
    "reflective_practice_learning": [],
    "general_knowledge": [],
    "user_provided_context": [],
    "standalone_boundary": [],
    "orb_knowledge_spine": [],
    "orb_operating_brain": [],
}

BASIS_LABELS = {
    "built_in_practice": "built-in practice knowledge",
    "gold_statutory": "gold statutory source",
    "silver_clinical": "silver clinical source",
    "bronze_sector": "bronze sector learning",
    "local_policy": "local/provider policy",
    "user_context": "user-provided context",
    "general_model": "general model knowledge",
}


class IndicareSourceConvergenceService:
    def map_pack_to_trusted(self, pack_key: str) -> list[dict[str, Any]]:
        ids = PACK_TO_TRUSTED.get(pack_key, [])
        out: list[dict[str, Any]] = []
        for sid in ids:
            src = trusted_source_registry_service.get_source(sid)
            if src:
                out.append(dict(src))
        return out

    def build_source_basis(
        self,
        *,
        message: str,
        pack_keys: list[str] | None = None,
        profile_context: bool = False,
    ) -> dict[str, Any]:
        keys = pack_keys or []
        layers: list[dict[str, Any]] = []
        trusted_ids: list[str] = []

        for key in keys:
            pack = get_source_pack(key)
            if not pack:
                continue
            mapped = self.map_pack_to_trusted(key)
            for src in mapped:
                tid = src.get("source_id")
                if tid and tid not in trusted_ids:
                    trusted_ids.append(tid)
            tier = self._pack_basis_tier(pack, mapped)
            layers.append(
                {
                    "pack_key": key,
                    "source_label": pack.get("source_label"),
                    "basis_tier": tier,
                    "trusted_source_ids": [s.get("source_id") for s in mapped],
                    "live_retrieved": pack.get("live_retrieved", False),
                    "human_review_required": any(
                        s.get("human_approval_required") for s in mapped
                    )
                    or pack.get("governance_status") == "approved",
                }
            )

        if profile_context:
            layers.append({"pack_key": "user_provided_context", "basis_tier": "user_context"})

        if not layers:
            layers.append({"pack_key": "general_knowledge", "basis_tier": "general_model"})

        return {
            "layers": layers,
            "trusted_source_ids": trusted_ids,
            "no_random_scraping": True,
            "auto_apply_gold_silver": False,
            "human_review_required_for_statutory": True,
            "basis_labels": BASIS_LABELS,
        }

    def all_pack_mappings(self) -> list[dict[str, Any]]:
        return [
            {
                "pack_key": p.get("pack_key"),
                "pack_id": p.get("id"),
                "trusted_source_ids": PACK_TO_TRUSTED.get(p.get("pack_key", ""), []),
            }
            for p in ORB_KNOWLEDGE_SOURCE_PACKS
        ]

    def _pack_basis_tier(self, pack: dict[str, Any], mapped: list[dict[str, Any]]) -> str:
        if pack.get("pack_key") == "user_provided_context":
            return "user_context"
        if pack.get("pack_key") == "general_knowledge":
            return "general_model"
        if pack.get("reliability") == "built_in_product_context":
            return "built_in_practice"
        for src in mapped:
            tier = src.get("trust_tier")
            if tier == "gold":
                return "gold_statutory"
            if tier == "silver":
                return "silver_clinical"
            if tier == "bronze":
                return "bronze_sector"
        st = pack.get("source_type")
        if st in ("statutory_guidance", "legislation", "inspection_framework"):
            return "gold_statutory"
        if st == "clinical_guidance":
            return "silver_clinical"
        if st == "sector_learning":
            return "bronze_sector"
        return "built_in_practice"


indicare_source_convergence_service = IndicareSourceConvergenceService()

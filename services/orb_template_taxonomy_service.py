"""ORB template taxonomy service — metadata layer over canonical ORB_TEMPLATE_REGISTRY."""

from __future__ import annotations

from typing import Any

from services.orb_template_library_registry import ORB_TEMPLATE_REGISTRY, orb_template_library_registry
from services.orb_template_taxonomy_data import (
    FULL_RESIDENTIAL_TAXONOMY_TEMPLATE_IDS,
    LIFECYCLE_GROUPS,
    ORB_TEMPLATE_TAXONOMY,
)
from services.orb_therapeutic_template_factory_service import enrich_template


class OrbTemplateTaxonomyService:
    """Extends the canonical registry with lifecycle taxonomy and station wiring metadata."""

    def lifecycle_groups(self) -> list[dict[str, str]]:
        return [LIFECYCLE_GROUPS[g] for g in sorted(LIFECYCLE_GROUPS)]

    def list_taxonomy(
        self,
        *,
        lifecycle_group: str | None = None,
        station: str | None = None,
        regulation_anchor: str | None = None,
        search: str | None = None,
        include_enriched: bool = False,
    ) -> list[dict[str, Any]]:
        items = list(ORB_TEMPLATE_TAXONOMY.values())
        if lifecycle_group:
            items = [t for t in items if t["lifecycle_group"] == lifecycle_group]
        if station:
            items = [t for t in items if station in t.get("station_availability", [])]
        if regulation_anchor:
            anchor = regulation_anchor.lower()
            items = [
                t
                for t in items
                if any(anchor in a.lower() for a in t.get("regulation_anchors", []))
            ]
        if search:
            q = search.lower()
            items = [
                t
                for t in items
                if q in t["title"].lower()
                or q in t["template_id"].lower()
                or q in t.get("lifecycle_family", "").lower()
            ]
        results: list[dict[str, Any]] = []
        for meta in sorted(items, key=lambda x: (x["lifecycle_group"], x["title"])):
            entry = dict(meta)
            entry["in_canonical_registry"] = meta["template_id"] in ORB_TEMPLATE_REGISTRY
            if include_enriched and entry["in_canonical_registry"]:
                enriched = enrich_template(ORB_TEMPLATE_REGISTRY[meta["template_id"]])
                entry["adult_guidance"] = enriched.get("adult_guidance_before_completing")
                entry["child_voice_prompts"] = enriched.get("child_voice_prompts")
                entry["therapeutic_wording_examples"] = enriched.get("therapeutic_wording_examples")
                entry["what_to_avoid"] = enriched.get("what_to_avoid")
                entry["source_chips_practice_anchors"] = enriched.get("source_chips_practice_anchors")
            results.append(entry)
        return results

    def get_taxonomy_entry(self, template_id: str, *, include_enriched: bool = True) -> dict[str, Any] | None:
        meta = ORB_TEMPLATE_TAXONOMY.get(template_id)
        if not meta:
            return None
        entry = dict(meta)
        entry["in_canonical_registry"] = template_id in ORB_TEMPLATE_REGISTRY
        if include_enriched and entry["in_canonical_registry"]:
            enriched = enrich_template(ORB_TEMPLATE_REGISTRY[template_id])
            entry.update(
                {
                    "adult_guidance": enriched.get("adult_guidance_before_completing"),
                    "child_voice_prompts": enriched.get("child_voice_prompts"),
                    "therapeutic_wording_examples": enriched.get("therapeutic_wording_examples"),
                    "what_to_avoid": enriched.get("what_to_avoid"),
                    "source_chips_practice_anchors": enriched.get("source_chips_practice_anchors"),
                    "review_before_use": enriched.get("review_before_use"),
                    "compliance_disclaimer": enriched.get("compliance_disclaimer"),
                }
            )
        return entry

    def templates_for_station(self, station: str) -> list[dict[str, Any]]:
        return self.list_taxonomy(station=station)

    def search(
        self,
        query: str,
        *,
        lifecycle_group: str | None = None,
        station: str | None = None,
        regulation_anchor: str | None = None,
    ) -> list[dict[str, Any]]:
        return self.list_taxonomy(
            lifecycle_group=lifecycle_group,
            station=station,
            regulation_anchor=regulation_anchor,
            search=query,
        )

    def coverage_report(self) -> dict[str, Any]:
        missing = sorted(
            tid for tid in FULL_RESIDENTIAL_TAXONOMY_TEMPLATE_IDS if tid not in ORB_TEMPLATE_REGISTRY
        )
        by_group: dict[str, int] = {}
        for meta in ORB_TEMPLATE_TAXONOMY.values():
            g = meta["lifecycle_group"]
            by_group[g] = by_group.get(g, 0) + 1
        return {
            "taxonomy_templates": len(ORB_TEMPLATE_TAXONOMY),
            "canonical_registry_templates": len(ORB_TEMPLATE_REGISTRY),
            "lifecycle_groups": len(LIFECYCLE_GROUPS),
            "templates_per_lifecycle_group": by_group,
            "missing_from_canonical_registry": missing,
            "coverage_complete": len(missing) == 0,
            "canonical_registry_source": "services/orb_template_library_registry.py",
            "duplicate_registry_created": False,
        }

    def station_wiring_plan(self) -> dict[str, Any]:
        return {
            "chat": {
                "capabilities": [
                    "suggest_relevant_templates_after_answers",
                    "turn_this_into_a_record",
                    "use_a_template_for_this",
                ],
                "template_count": len(self.templates_for_station("chat")),
            },
            "dictate": {
                "capabilities": [
                    "adult_dictates_naturally",
                    "orb_suggests_matching_template",
                    "structures_transcript_into_template",
                    "adult_reviews_before_save",
                ],
                "template_count": len(self.templates_for_station("dictate")),
            },
            "voice": {
                "capabilities": [
                    "voice_conversation_creates_draft_records",
                    "orb_suggests_template_after_spoken_content",
                    "save_to_records_and_documents",
                ],
                "template_count": len(self.templates_for_station("voice")),
            },
            "write": {
                "capabilities": [
                    "template_library_visible_searchable",
                    "generate_full_drafts_from_templates",
                    "write_reports_summaries_reviews_evidence_notes",
                ],
                "template_count": len(self.templates_for_station("write")),
            },
            "records": {
                "capabilities": [
                    "saved_drafts_by_adult",
                    "saved_documents_by_category",
                    "templates_used_history",
                    "export_copy_print",
                    "draft_status_lifecycle",
                ],
                "template_count": len(self.templates_for_station("records")),
            },
            "communicate": {
                "capabilities": [
                    "support_pack_templates",
                    "easy_read_visual_card_suggestions",
                    "communication_reflection_records",
                ],
                "template_count": len(self.templates_for_station("communicate")),
                "feature_flag_required": True,
            },
            "templates": {
                "capabilities": ["full_library_search", "generate_export", "handoff_to_write_dictate"],
                "template_count": len(self.templates_for_station("templates")),
            },
        }


orb_template_taxonomy_service = OrbTemplateTaxonomyService()

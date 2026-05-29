"""Honest citation and frontend source payloads for standalone ORB."""

from __future__ import annotations

import re
from typing import Any

from services.orb_knowledge_source_pack_service import ORB_KNOWLEDGE_SOURCE_PACKS

WHY_CITED_BY_LABEL: dict[str, str] = {
    "reg 12": "Relevant to safeguarding, risk response and protecting children from harm.",
    "reg 13": "Relevant to manager oversight, review and follow-up.",
    "sccif": "Relevant to how inspectors consider children's experiences, safety, progress and leadership impact.",
    "recording quality": "Relevant to factual, child-centred recording and evidence trail.",
    "safeguarding": "Relevant to protecting children, escalation and professional curiosity.",
    "quality standards": "Relevant to children's home practice expectations and outcomes for children.",
    "lado": "Relevant to allegations against adults working with children and consultation routes.",
    "working together": "Relevant to multi-agency safeguarding and information-sharing duties.",
}

TYPE_BASIS_MAP: dict[str, str] = {
    "product_context": "Built-in product-level knowledge",
    "regulatory_framework": "Built-in regulatory and inspection framework knowledge",
    "general_knowledge": "General model knowledge",
    "user_provided": "User-provided standalone context",
    "safety_boundary": "Standalone ORB safety and access boundary",
    "recording_quality": "Built-in recording quality guidance",
    "therapeutic_practice": "Built-in therapeutic and trauma-informed practice knowledge",
    "safeguarding_principles": "Built-in safeguarding practice principles",
    "image_context": "User-uploaded image supplied in the conversation",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbCitationService:
    """Builds honest citations from source packs — never fakes live retrieval."""

    def build_citations(
        self,
        source_packs: list[dict[str, Any]],
        *,
        message: str | None = None,
        mode: str | None = None,
        has_images: bool = False,
    ) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        for pack in source_packs:
            source_type = _text(pack.get("source_type")) or "general_knowledge"
            official = bool(pack.get("official_source"))
            basis = TYPE_BASIS_MAP.get(source_type, "Built-in knowledge")
            if official:
                basis = f"Official source summary — {basis}"
            label = _text(pack.get("short_citation_label") or pack.get("source_label"))
            label_key = label.lower().strip("[]")
            why_cited = WHY_CITED_BY_LABEL.get(label_key) or WHY_CITED_BY_LABEL.get(
                label_key.replace("regulation ", "reg ")
            )
            citations.append(
                {
                    "id": _text(pack.get("id")) or _text(pack.get("pack_key")),
                    "label": label,
                    "type": source_type,
                    "basis": basis,
                    "why_cited": why_cited,
                    "note": _text(pack.get("guidance_notes") or pack.get("description")),
                    "live_retrieved": bool(pack.get("live_retrieved")),
                    "official_source": official,
                    "confidence_level": pack.get("confidence_level"),
                    "governance_status": pack.get("governance_status"),
                    "source_version": pack.get("source_version"),
                    "warning": pack.get("governance_warning"),
                    "retrieval_strategy": pack.get("retrieval_strategy"),
                }
            )
        if has_images:
            citations.append(
                {
                    "id": "user_image_context",
                    "label": "User-uploaded image",
                    "type": "image_context",
                    "basis": TYPE_BASIS_MAP["image_context"],
                    "note": "Image supplied in the conversation prompt; not an OS record.",
                    "live_retrieved": False,
                }
            )
        return self._dedupe_citations(citations)

    def append_sources_basis(self, answer: str, citations: list[dict[str, Any]]) -> str:
        sources = self.frontend_sources_payload(citations)
        text = _text(answer)
        if not text or not sources:
            return text
        if re.search(r"(?i)sources\s*/\s*basis", text):
            return text
        lines = ["", "Sources / basis"]
        for item in sources[:8]:
            label = _text(item.get("label"))
            note = _text(item.get("note") or item.get("basis"))
            if note:
                lines.append(f"- {label}: {note}")
            elif label:
                lines.append(f"- {label}")
        return text + "\n".join(lines)

    def normalise_sources(self, raw_sources: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
        if not raw_sources:
            return []
        normalised: list[dict[str, Any]] = []
        for item in raw_sources:
            if not isinstance(item, dict):
                continue
            label = _text(item.get("label"))
            if not label:
                continue
            source_type = _text(item.get("type")) or "general_knowledge"
            normalised.append(
                {
                    "id": _text(item.get("id")) or label.lower().replace(" ", "_"),
                    "label": label,
                    "type": source_type,
                    "basis": _text(item.get("basis")) or TYPE_BASIS_MAP.get(source_type, "Built-in knowledge"),
                    "note": _text(item.get("note")),
                    "live_retrieved": bool(item.get("live_retrieved")),
                }
            )
        return self._dedupe_citations(normalised)

    def frontend_sources_payload(self, citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Legacy-compatible `sources` array for the standalone frontend."""
        payload: list[dict[str, Any]] = []
        for citation in citations:
            source_type = _text(citation.get("type"))
            entry: dict[str, Any] = {
                "id": citation.get("id"),
                "label": citation.get("label"),
                "type": source_type,
                "basis": citation.get("basis"),
                "note": citation.get("note") or citation.get("basis"),
                "live_retrieved": bool(citation.get("live_retrieved")),
            }
            if citation.get("document_chunk"):
                entry["document_chunk"] = True
                entry["origin"] = citation.get("origin")
                entry["section"] = citation.get("section")
                entry["page"] = citation.get("page")
                entry["source_id"] = citation.get("source_id")
                entry["chunk_index"] = citation.get("chunk_index")
            for field in (
                "exact_citation",
                "citation_anchor",
                "heading_path",
                "heading",
                "subsection",
                "paragraph_number",
                "excerpt",
                "source_url",
                "source_integrity",
                "quote_allowed",
                "official_source",
                "confidence_level",
                "governance_status",
                "source_version",
                "warning",
                "retrieval_strategy",
                "semantic_score",
                "hybrid_score",
                "keyword_score",
            ):
                if citation.get(field) is not None:
                    entry[field] = citation.get(field)
            payload.append(entry)
        return payload

    def citations_from_legacy_sources(self, sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self.normalise_sources(sources)

    def _dedupe_citations(self, citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for item in citations:
            key = f"{item.get('type')}|{item.get('label')}"
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped


orb_citation_service = OrbCitationService()

# Re-export pack count for tests
SOURCE_PACK_COUNT = len(ORB_KNOWLEDGE_SOURCE_PACKS)

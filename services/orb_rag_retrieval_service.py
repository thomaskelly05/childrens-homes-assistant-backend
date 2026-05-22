"""RAG retrieval for standalone ORB — document chunks + built-in source packs."""

from __future__ import annotations

import re
from typing import Any

from services.orb_citation_service import orb_citation_service
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

TYPE_BASIS_MAP = {
    "product_context": "ORB Knowledge Library — product context",
    "regulatory_framework": "ORB Knowledge Library — regulatory framework",
    "recording_quality": "ORB Knowledge Library — recording quality",
    "safeguarding_principles": "ORB Knowledge Library — safeguarding principles",
    "therapeutic_practice": "ORB Knowledge Library — therapeutic practice",
    "practice_guidance": "ORB Knowledge Library — practice guidance",
    "policy": "ORB Knowledge Library — policy reference",
    "general_knowledge": "ORB Knowledge Library — general reference",
    "user_uploaded": "ORB Knowledge Library — user-uploaded source",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: str) -> str:
    return _text(value).lower()


class OrbRagRetrievalService:
    """Keyword/hybrid retrieval across knowledge library chunks and source packs."""

    def search(
        self,
        query: str,
        *,
        mode: str | None = None,
        filters: dict[str, Any] | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        filters = dict(filters or {})
        classification = orb_knowledge_retrieval_service.classify_query(query, mode=mode)
        boosted_type = self._boosted_source_type(query, mode=mode, classification=classification)
        if boosted_type and "source_type" not in filters:
            filters["source_type"] = boosted_type

        results = orb_knowledge_library_service.search_chunks_keyword(
            query,
            filters=filters,
            limit=limit,
        )
        for result in results:
            result["score"] = self.score_chunk(query, result, mode=mode, classification=classification)
        results.sort(key=lambda item: -float(item.get("score") or 0))
        return results[:limit]

    def retrieve_for_conversation(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
    ) -> dict[str, Any]:
        classification = orb_knowledge_retrieval_service.classify_query(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        packs = orb_knowledge_retrieval_service.retrieve_sources(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        pack_citations = orb_citation_service.build_citations(
            packs,
            message=message,
            mode=mode,
            has_images=bool(attachments),
        )

        document_results: list[dict[str, Any]] = []
        try:
            document_results = self.search(message, mode=mode, limit=8)
        except Exception:
            document_results = []

        document_citations = self.build_rag_citations(document_results)
        merged_citations = self.merge_with_source_pack_citations(pack_citations, document_results)

        return {
            "classification": classification,
            "source_packs": packs,
            "pack_citations": pack_citations,
            "document_results": document_results,
            "document_citations": document_citations,
            "citations": merged_citations,
            "sources": orb_citation_service.frontend_sources_payload(merged_citations),
            "grounding_context": self.build_grounded_context(
                message,
                packs=packs,
                document_results=document_results,
                mode=mode,
            ),
            "top_source_titles": self._top_titles(packs, document_results),
        }

    def score_chunk(
        self,
        query: str,
        chunk: dict[str, Any],
        *,
        mode: str | None = None,
        classification: dict[str, Any] | None = None,
    ) -> float:
        base = float(chunk.get("score") or 0)
        lower = _lower(query)
        source_type = _text(chunk.get("source_type"))
        classification = classification or orb_knowledge_retrieval_service.classify_query(query, mode=mode)
        intents = classification.get("intents") or {}

        if intents.get("product_context") and source_type == "product_context":
            base += 3.0
        if intents.get("regulatory_framework") and source_type == "regulatory_framework":
            base += 3.0
        if intents.get("recording_quality") and source_type == "recording_quality":
            base += 3.0
        if intents.get("safeguarding_principles") and source_type == "safeguarding_principles":
            base += 3.0
        if intents.get("therapeutic_practice") and source_type == "therapeutic_practice":
            base += 2.0

        if (mode or "").strip() == "Ofsted Lens" and source_type == "regulatory_framework":
            base += 2.0
        if (mode or "").strip() == "Record This Properly" and source_type == "recording_quality":
            base += 2.0
        if (mode or "").strip() == "Safeguarding" and source_type == "safeguarding_principles":
            base += 2.0

        if any(term in lower for term in ("ofsted", "sccif", "child voice", "inspection")):
            if source_type == "regulatory_framework":
                base += 2.5
        if any(term in lower for term in ("daily note", "recording", "wording")):
            if source_type == "recording_quality":
                base += 2.5
        if "indicare" in lower or "orb" in lower:
            if source_type == "product_context":
                base += 2.5
        if "safeguarding" in lower and source_type == "safeguarding_principles":
            base += 2.5

        return round(base, 3)

    def build_grounded_context(
        self,
        message: str,
        *,
        packs: list[dict[str, Any]] | None = None,
        document_results: list[dict[str, Any]] | None = None,
        mode: str | None = None,
    ) -> str:
        packs = packs or orb_knowledge_retrieval_service.retrieve_sources(message, mode=mode)
        document_results = document_results if document_results is not None else self.search(message, mode=mode, limit=6)

        lines = [
            "Grounding context (standalone ORB Knowledge Library + built-in source packs — not live OS records):",
        ]
        for pack in packs:
            lines.append(
                f"- Pack: {pack['source_label']}: {pack['description']} "
                f"(live_retrieved: {pack.get('live_retrieved', False)})"
            )
        if document_results:
            lines.append("Retrieved document passages:")
            for result in document_results[:6]:
                excerpt = _text(result.get("text"))[:600]
                label = _text(result.get("citation_label"))
                section = _text(result.get("section"))
                section_note = f" ({section})" if section else ""
                lines.append(f"- {label}{section_note}: {excerpt}")
        else:
            lines.append("No matching document passages; use source packs and general knowledge.")
        lines.append(
            "Cite honest source labels. Document passages are from the ORB Knowledge Library (built-in or user-uploaded), not live web or OS records."
        )
        return "\n".join(lines)

    def build_rag_citations(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        for result in results:
            source_type = _text(result.get("source_type")) or "user_uploaded"
            origin = (result.get("metadata") or {}).get("origin", "built_in")
            basis = TYPE_BASIS_MAP.get(source_type, "ORB Knowledge Library — reference document")
            section = _text(result.get("section"))
            page = _text(result.get("page"))
            note_parts = [_text(result.get("text"))[:220]]
            if section:
                note_parts.insert(0, f"Section: {section}")
            if page:
                note_parts.insert(0, f"Page: {page}")
            citations.append(
                {
                    "id": f"doc-{result.get('source_id')}-{result.get('chunk_index')}",
                    "label": _text(result.get("citation_label")) or _text(result.get("source_title")),
                    "type": f"document_chunk:{source_type}",
                    "basis": basis,
                    "note": " — ".join(p for p in note_parts if p),
                    "source_id": result.get("source_id"),
                    "section": section or None,
                    "page": page or None,
                    "chunk_index": result.get("chunk_index"),
                    "origin": origin,
                    "live_retrieved": False,
                    "document_chunk": True,
                }
            )
        return citations

    def merge_with_source_pack_citations(
        self,
        source_pack_citations: list[dict[str, Any]],
        rag_results: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        document_citations = self.build_rag_citations(rag_results)
        return orb_citation_service._dedupe_citations(source_pack_citations + document_citations)

    def _boosted_source_type(
        self,
        query: str,
        *,
        mode: str | None,
        classification: dict[str, Any],
    ) -> str | None:
        intents = classification.get("intents") or {}
        if intents.get("product_context"):
            return "product_context"
        if intents.get("regulatory_framework") or (mode or "").strip() == "Ofsted Lens":
            return "regulatory_framework"
        if intents.get("recording_quality") or (mode or "").strip() == "Record This Properly":
            return "recording_quality"
        if intents.get("safeguarding_principles") or (mode or "").strip() == "Safeguarding":
            return "safeguarding_principles"
        if intents.get("therapeutic_practice"):
            return "therapeutic_practice"
        return None

    def _top_titles(
        self,
        packs: list[dict[str, Any]],
        document_results: list[dict[str, Any]],
    ) -> list[str]:
        titles: list[str] = []
        for pack in packs:
            title = _text(pack.get("title") or pack.get("source_label"))
            if title and title not in titles:
                titles.append(title)
        for result in document_results[:4]:
            title = _text(result.get("source_title"))
            if title and title not in titles:
                titles.append(title)
        return titles[:8]


orb_rag_retrieval_service = OrbRagRetrievalService()

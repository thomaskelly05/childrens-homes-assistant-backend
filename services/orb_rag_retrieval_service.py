"""RAG retrieval for standalone ORB — hybrid semantic + keyword + source packs."""

from __future__ import annotations

import re
from typing import Any

from services.orb_care_synonym_service import orb_care_synonym_service
from services.orb_citation_service import orb_citation_service
from services.orb_exact_citation_service import orb_exact_citation_service
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_semantic_retrieval_service import orb_semantic_retrieval_service

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
    """Hybrid retrieval across knowledge library chunks and source packs."""

    def search(
        self,
        query: str,
        *,
        mode: str | None = None,
        filters: dict[str, Any] | None = None,
        limit: int = 8,
        viewer_user_id: int | None = None,
    ) -> list[dict[str, Any]]:
        filters = dict(filters or {})
        classification = orb_knowledge_retrieval_service.classify_query(query, mode=mode)
        boosted_type = self._boosted_source_type(query, mode=mode, classification=classification)
        if boosted_type and "source_type" not in filters:
            filters["source_type"] = boosted_type

        expansion = orb_care_synonym_service.expand_query(query)
        keyword_results = orb_knowledge_library_service.search_chunks_keyword(
            query,
            filters=filters,
            limit=limit * 2,
            expanded_query=expansion.get("expanded_query"),
            viewer_user_id=viewer_user_id,
        )

        candidates = orb_knowledge_library_service.get_candidate_chunks_for_semantic_search(
            filters,
            viewer_user_id=viewer_user_id,
        )
        hybrid_results, strategy = orb_semantic_retrieval_service.hybrid_search(
            query,
            keyword_results,
            candidates,
            limit=limit,
        )

        for result in hybrid_results:
            result["score"] = self.score_chunk(
                query,
                result,
                mode=mode,
                classification=classification,
                base_score=float(result.get("hybrid_score") or result.get("score") or 0),
            )
            result["retrieval_strategy"] = strategy

        hybrid_results.sort(key=lambda item: -float(item.get("score") or 0))
        return hybrid_results[:limit]

    def retrieve_for_conversation(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
        current_user: dict[str, Any] | None = None,
        viewer_user_id: int | None = None,
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

        expansion = orb_care_synonym_service.expand_query(message)
        document_results: list[dict[str, Any]] = []
        retrieval_strategy = "built_in_source_pack"
        semantic_available = orb_semantic_retrieval_service.semantic_available()
        warnings: list[str] = []
        official_source_count = 0

        try:
            document_results = self.search(message, mode=mode, limit=8)
            if document_results:
                retrieval_strategy = _text(document_results[0].get("retrieval_strategy")) or "keyword_only"
            official_source_count = sum(1 for r in document_results if r.get("official_source"))
            for r in document_results:
                if r.get("warning"):
                    warnings.append(_text(r.get("warning")))
        except Exception:
            document_results = []

        document_citations = self.build_rag_citations(
            document_results,
            retrieval_strategy=retrieval_strategy,
        )
        merged_citations = self.merge_with_source_pack_citations(pack_citations, document_results)

        result = {
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
            "retrieval_meta": {
                "strategy": retrieval_strategy if document_results else "built_in_source_pack",
                "semantic_available": semantic_available,
                "synonym_expansion_used": bool(expansion.get("synonym_expansion_used")),
                "document_result_count": len(document_results),
                "official_source_count": official_source_count,
                "warnings": list(dict.fromkeys(warnings)),
                "expanded_concepts": expansion.get("concepts") or [],
            },
        }

        if current_user is not None and viewer_user_id is not None:
            from services.orb_home_aware_answer_service import orb_home_aware_answer_service

            result = orb_home_aware_answer_service.enrich_rag_retrieval(
                result,
                query=message,
                user_id=viewer_user_id,
                current_user=current_user,
            )

        return result

    def score_chunk(
        self,
        query: str,
        chunk: dict[str, Any],
        *,
        mode: str | None = None,
        classification: dict[str, Any] | None = None,
        base_score: float | None = None,
    ) -> float:
        base = float(base_score if base_score is not None else (chunk.get("hybrid_score") or chunk.get("score") or 0))
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

        if chunk.get("official_source"):
            base += 1.5
        if _text(chunk.get("source_integrity")) == "full_document":
            base += 1.25
        if _text(chunk.get("source_integrity")) == "summary_only":
            base -= 0.25

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
                warn = _text(result.get("warning"))
                warn_note = f" [warning: {warn}]" if warn else ""
                lines.append(f"- {label}{section_note}{warn_note}: {excerpt}")
        else:
            lines.append("No matching document passages; use source packs and general knowledge.")
        lines.append(
            "Use exact citation labels from retrieved passages. Do not invent page or section numbers. "
            "If a source is summary-only, say so. Document passages are from the ORB Knowledge Library, not live web or OS records."
        )
        return "\n".join(lines)

    def build_rag_citations(
        self,
        results: list[dict[str, Any]],
        *,
        retrieval_strategy: str | None = None,
    ) -> list[dict[str, Any]]:
        source_by_id = {
            s["id"]: s
            for s in orb_knowledge_library_service.list_sources()
        }
        citations = orb_exact_citation_service.citations_for_search_results(
            results, source_by_id=source_by_id
        )
        for citation in citations:
            source_type = _text(
                next((r.get("source_type") for r in results if r.get("source_id") == citation.get("source_id")), "")
            ) or "user_uploaded"
            origin = "built_in"
            for r in results:
                if r.get("source_id") == citation.get("source_id"):
                    origin = (r.get("metadata") or {}).get("origin", "built_in")
                    break
            basis = TYPE_BASIS_MAP.get(source_type, "ORB Knowledge Library — reference document")
            if citation.get("official_source"):
                if citation.get("source_integrity") == "summary_only":
                    basis = f"Official source summary — {basis}"
                else:
                    basis = f"Official source — {basis}"
            citation["type"] = f"document_chunk:{source_type}"
            citation["basis"] = _text(citation.get("exact_citation")) or basis
            citation["origin"] = origin
            citation["retrieval_strategy"] = retrieval_strategy or citation.get("retrieval_strategy")
            if result_match := next(
                (r for r in results if r.get("source_id") == citation.get("source_id") and r.get("chunk_index") == citation.get("chunk_index")),
                None,
            ):
                citation["semantic_score"] = result_match.get("semantic_score")
                citation["hybrid_score"] = result_match.get("hybrid_score")
                citation["keyword_score"] = result_match.get("keyword_score")
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

"""Standalone ORB deep research — knowledge library only, no OS records."""

from __future__ import annotations

from typing import Any

from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service
from services.orb_standalone_sources import append_sources_basis_section, build_standalone_sources


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbDeepResearchService:
    def research(self, query: str, *, mode: str | None = None, limit: int = 8) -> dict[str, Any]:
        document_results = orb_rag_retrieval_service.search(query, mode=mode, limit=limit)
        classification = orb_knowledge_retrieval_service.classify_query(query, mode=mode)
        packs = orb_knowledge_retrieval_service.retrieve_sources(query, mode=mode)
        sources = build_standalone_sources(query, mode=mode)
        for result in document_results[:4]:
            sources.append(
                {
                    "label": result.get("citation_label") or result.get("source_title"),
                    "type": result.get("source_type") or "user_uploaded",
                    "basis": "ORB Knowledge Library — document chunk",
                    "live_retrieved": False,
                    "document_chunk": True,
                    "source_id": result.get("source_id"),
                }
            )
        lines = ["Deep research summary (standalone Knowledge Library only):"]
        for result in document_results[:5]:
            lines.append(
                f"- {result.get('source_title')}: {_text(result.get('text'))[:280]}"
            )
        if not document_results and packs:
            for pack in packs[:3]:
                lines.append(f"- {pack.get('title')}: {_text(pack.get('excerpt'))[:200]}")
        answer = append_sources_basis_section("\n".join(lines), sources)
        return {
            "answer": answer,
            "sources": sources,
            "citations": sources,
            "document_results": document_results,
            "classification": classification,
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
        }


orb_deep_research_service = OrbDeepResearchService()

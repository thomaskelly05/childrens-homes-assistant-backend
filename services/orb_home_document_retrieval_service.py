"""Permission-aware retrieval for ORB home documents."""

from __future__ import annotations

import re
from typing import Any

from schemas.orb_home_documents import (
    HOME_DOCUMENT_TYPE_LABELS,
    OrbHomeDocumentCitation,
)
from services.orb_home_documents_service import orb_home_documents_service

SAFEGUARDING_DOCUMENT_TYPES = frozenset({
    "safeguarding_policy",
    "missing_from_care_policy",
    "physical_intervention_policy",
    "whistleblowing_policy",
})

MEDICATION_KEYWORDS = frozenset({"medication", "mar", "medicine", "prescription", "dose"})
SOP_KEYWORDS = frozenset({"statement of purpose", "purpose", "aims", "ethos", "values"})


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: str) -> str:
    return _text(value).lower()


def build_source_chip(document_type: str) -> str:
    label = HOME_DOCUMENT_TYPE_LABELS.get(
        document_type, document_type.replace("_", " ").title()
    )
    return f"Home document: {label}"


class OrbHomeDocumentRetrievalService:
    """Retrieve home document chunks scoped to user's home/organisation."""

    def search(
        self,
        query: str,
        *,
        user_id: int,
        current_user: dict[str, Any],
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        from schemas.orb_home_documents import OrbHomeDocumentListRequest

        request = OrbHomeDocumentListRequest(limit=200)
        documents = orb_home_documents_service.list_documents(user_id, current_user, request)
        ready_docs = [d for d in documents if d.ready_for_orb_use and not d.archived]
        if not ready_docs:
            return []

        query_lower = _lower(query)
        query_terms = {t for t in re.split(r"\W+", query_lower) if len(t) > 2}
        results: list[dict[str, Any]] = []

        for doc in ready_docs:
            chunks = orb_home_documents_service.get_chunks_for_document(doc.document_id)
            if not chunks and doc.text_extract_status == "ready":
                continue

            for chunk in chunks:
                text = _lower(chunk.get("text") or "")
                if not text:
                    continue
                score = sum(1 for term in query_terms if term in text)
                doc_type = doc.document_type
                if doc_type == "medication_policy" and query_terms & MEDICATION_KEYWORDS:
                    score += 3
                if doc_type == "statement_of_purpose" and query_terms & SOP_KEYWORDS:
                    score += 3
                if doc_type in SAFEGUARDING_DOCUMENT_TYPES and "safeguard" in query_lower:
                    score += 2

                if score > 0:
                    results.append({
                        "document_id": doc.document_id,
                        "document_type": doc.document_type,
                        "home_id": doc.home_id,
                        "chunk_index": chunk.get("chunk_index", 0),
                        "text": chunk.get("text"),
                        "source_title": chunk.get("source_title") or doc.title,
                        "version": chunk.get("version") or doc.version,
                        "source_chip": build_source_chip(doc.document_type),
                        "citation_label": build_source_chip(doc.document_type),
                        "score": score,
                    })

        results.sort(key=lambda r: -int(r.get("score") or 0))
        return results[:limit]

    def build_citation(self, result: dict[str, Any]) -> OrbHomeDocumentCitation:
        doc_type = result.get("document_type") or "other_home_policy"
        chip = build_source_chip(doc_type)
        return OrbHomeDocumentCitation(
            document_id=str(result.get("document_id") or ""),
            document_type=doc_type,
            citation_label=chip,
            source_chip=chip,
            used_in_answer=True,
        )

    def is_permission_aware(self) -> bool:
        return True


orb_home_document_retrieval_service = OrbHomeDocumentRetrievalService()

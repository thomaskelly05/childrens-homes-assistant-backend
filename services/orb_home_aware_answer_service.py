"""Home-aware answer grounding — cites home documents without inventing content."""

from __future__ import annotations

from typing import Any

from schemas.orb_home_documents import (
    COMPLIANCE_NOT_GUARANTEED_DISCLAIMER,
    HOME_AWARE_ANSWER_DISCLAIMER,
    HOME_DOCUMENT_TYPE_LABELS,
    LOCAL_POLICY_CONFLICT_ADVISORY,
    OrbHomeDocumentCitation,
)
from services.orb_home_document_retrieval_service import (
    MEDICATION_KEYWORDS,
    SAFEGUARDING_DOCUMENT_TYPES,
    SOP_KEYWORDS,
    orb_home_document_retrieval_service,
)

SAFEGUARDING_QUERY_TERMS = frozenset({
    "safeguarding",
    "abuse",
    "allegation",
    "harm",
    "exploitation",
    "missing",
    "lado",
})


def _lower(text: str) -> str:
    return str(text or "").strip().lower()


class OrbHomeAwareAnswerService:
    """Ground ORB answers with uploaded home documents when relevant."""

    def ground_for_query(
        self,
        query: str,
        *,
        user_id: int,
        current_user: dict[str, Any],
        limit: int = 3,
    ) -> dict[str, Any]:
        results = orb_home_document_retrieval_service.search(
            query, user_id=user_id, current_user=current_user, limit=limit
        )

        if not results:
            return {
                "home_documents_used": False,
                "context_block": "",
                "citations": [],
                "source_chips": [],
                "disclaimers": [HOME_AWARE_ANSWER_DISCLAIMER],
                "conflict_advisory": None,
                "grounding_phrase": None,
            }

        citations: list[OrbHomeDocumentCitation] = []
        source_chips: list[str] = []
        context_lines: list[str] = []
        used_types: set[str] = set()

        for result in results:
            citation = orb_home_document_retrieval_service.build_citation(result)
            citations.append(citation)
            source_chips.append(citation.source_chip)
            used_types.add(result.get("document_type") or "")
            excerpt = str(result.get("text") or "")[:500]
            context_lines.append(
                f"[{citation.source_chip}] (excerpt only — do not invent beyond this text): {excerpt}"
            )

        conflict_advisory = self._conflict_advisory(query, used_types)
        grounding_phrase = self._grounding_phrase(used_types)

        disclaimers = [
            HOME_AWARE_ANSWER_DISCLAIMER,
            COMPLIANCE_NOT_GUARANTEED_DISCLAIMER,
        ]
        if conflict_advisory:
            disclaimers.append(conflict_advisory)

        return {
            "home_documents_used": True,
            "context_block": "\n\n".join(context_lines),
            "citations": [c.model_dump() for c in citations],
            "source_chips": list(dict.fromkeys(source_chips)),
            "disclaimers": disclaimers,
            "conflict_advisory": conflict_advisory,
            "grounding_phrase": grounding_phrase,
        }

    def _grounding_phrase(self, used_types: set[str]) -> str | None:
        if "statement_of_purpose" in used_types:
            return (
                "Based on your home's Statement of Purpose and the general residential "
                "children's home guidance available…"
            )
        if "medication_policy" in used_types:
            return (
                "Use your home's medication policy alongside MAR recording and "
                "professional/health advice."
            )
        if used_types:
            labels = [
                HOME_DOCUMENT_TYPE_LABELS.get(t, t.replace("_", " "))
                for t in sorted(used_types)
            ]
            if len(labels) == 1:
                return f"Based on your home's {labels[0]} and general guidance available…"
            return f"Based on your home's {', '.join(labels[:2])} and general guidance available…"
        return None

    def _conflict_advisory(self, query: str, used_types: set[str]) -> str | None:
        query_lower = _lower(query)
        safeguarding_query = any(term in query_lower for term in SAFEGUARDING_QUERY_TERMS)
        non_safeguarding_policy = used_types - SAFEGUARDING_DOCUMENT_TYPES

        if safeguarding_query and non_safeguarding_policy:
            return LOCAL_POLICY_CONFLICT_ADVISORY

        if "physical_intervention_policy" in used_types and "safeguard" in query_lower:
            return LOCAL_POLICY_CONFLICT_ADVISORY

        return None

    def local_document_cannot_override_safeguarding(self) -> str:
        return LOCAL_POLICY_CONFLICT_ADVISORY

    def enrich_rag_retrieval(
        self,
        rag: dict[str, Any],
        *,
        query: str,
        user_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        """Merge home document grounding into existing RAG retrieval payload."""
        grounding = self.ground_for_query(query, user_id=user_id, current_user=current_user)
        if not grounding.get("home_documents_used"):
            return rag

        enriched = dict(rag)
        home_citations = grounding.get("citations") or []
        existing = list(enriched.get("citations") or [])
        enriched["citations"] = existing + home_citations

        sources = list(enriched.get("sources") or [])
        for chip in grounding.get("source_chips") or []:
            sources.append({
                "label": chip,
                "type": "home_document",
                "reliability": "home_uploaded",
            })
        enriched["sources"] = sources

        context = _lower(enriched.get("grounding_context") or "")
        home_context = grounding.get("context_block") or ""
        if home_context:
            enriched["grounding_context"] = f"{context}\n\n{home_context}".strip()

        phrase = grounding.get("grounding_phrase")
        if phrase:
            meta = dict(enriched.get("retrieval_meta") or {})
            meta["home_grounding_phrase"] = phrase
            meta["home_documents_used"] = True
            meta["home_source_chips"] = grounding.get("source_chips")
            enriched["retrieval_meta"] = meta

        enriched["home_document_grounding"] = grounding
        return enriched

    def is_relevant_document_type(self, query: str, document_type: str) -> bool:
        q = _lower(query)
        if document_type == "medication_policy":
            return bool(MEDICATION_KEYWORDS & set(q.split()))
        if document_type == "statement_of_purpose":
            return bool(SOP_KEYWORDS & set(q.split())) or "purpose" in q
        return True


orb_home_aware_answer_service = OrbHomeAwareAnswerService()

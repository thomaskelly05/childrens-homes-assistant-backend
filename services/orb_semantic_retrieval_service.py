"""Hybrid semantic + keyword retrieval for standalone ORB Knowledge Library."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from services.orb_embedding_service import orb_embedding_service

KEYWORD_WEIGHT = 0.45
SEMANTIC_WEIGHT = 0.45
BOOST_WEIGHT = 0.10


def _text(value: Any) -> str:
    return str(value or "").strip()


def _float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class OrbSemanticRetrievalService:
    """Combines keyword and embedding similarity with source confidence boosts."""

    def semantic_available(self) -> bool:
        return orb_embedding_service.is_available()

    def semantic_search(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        *,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        if not self.semantic_available():
            return []
        embed_result = orb_embedding_service.embed_text(query)
        query_embedding = embed_result.get("embedding")
        if not query_embedding:
            return []

        scored: list[tuple[float, dict[str, Any]]] = []
        for chunk in chunks:
            chunk_embedding = chunk.get("embedding")
            if not chunk_embedding or not isinstance(chunk_embedding, list):
                continue
            score = self.score_semantic(query_embedding, chunk_embedding)
            if score <= 0:
                continue
            item = dict(chunk)
            item["semantic_score"] = round(score, 4)
            item["keyword_score"] = item.get("keyword_score")
            scored.append((score, item))

        scored.sort(key=lambda pair: -pair[0])
        return [item for _, item in scored[:limit]]

    def hybrid_search(
        self,
        query: str,
        keyword_results: list[dict[str, Any]],
        all_candidate_chunks: list[dict[str, Any]],
        *,
        limit: int = 8,
    ) -> tuple[list[dict[str, Any]], str]:
        if not self.semantic_available():
            return self._keyword_only_results(keyword_results, limit), "keyword_plus_synonyms"

        semantic_candidates = self.semantic_search(query, all_candidate_chunks, limit=max(limit * 2, 12))
        by_chunk_key: dict[str, dict[str, Any]] = {}

        for result in keyword_results:
            key = f"{result.get('source_id')}|{result.get('chunk_index')}"
            keyword_score = _float(result.get("keyword_score") or result.get("score"))
            by_chunk_key[key] = {
                **result,
                "keyword_score": round(keyword_score, 4),
                "semantic_score": None,
            }

        for sem in semantic_candidates:
            key = f"{sem.get('source_id')}|{sem.get('chunk_index')}"
            existing = by_chunk_key.get(key)
            sem_score = _float(sem.get("semantic_score"))
            if existing:
                existing["semantic_score"] = round(sem_score, 4)
            else:
                by_chunk_key[key] = {
                    **sem,
                    "keyword_score": 0.0,
                    "semantic_score": round(sem_score, 4),
                    "score": 0.0,
                    "match_reason": sem.get("match_reason") or "semantic_match",
                }

        ranked: list[dict[str, Any]] = []
        for item in by_chunk_key.values():
            keyword_score = _float(item.get("keyword_score"))
            semantic_score = _float(item.get("semantic_score")) if item.get("semantic_score") is not None else 0.0
            source_boost = self._source_boost(item)
            hybrid = (
                keyword_score * KEYWORD_WEIGHT
                + semantic_score * SEMANTIC_WEIGHT
                + source_boost * BOOST_WEIGHT
            )
            item["hybrid_score"] = round(hybrid, 4)
            item["score"] = item["hybrid_score"]
            item["confidence_score"] = item.get("confidence_score") or item.get("chunk_confidence_score")
            item["match_reason"] = self.explain_match(keyword_score, semantic_score, source_boost)
            ranked.append(item)

        ranked.sort(key=lambda r: -_float(r.get("hybrid_score")))
        return ranked[:limit], "hybrid_semantic_keyword"

    def score_semantic(self, query_embedding: list[float], chunk_embedding: list[float]) -> float:
        return max(0.0, orb_embedding_service.cosine_similarity(query_embedding, chunk_embedding))

    def explain_match(
        self,
        keyword_score: float,
        semantic_score: float,
        source_boost: float,
    ) -> str:
        parts: list[str] = []
        if keyword_score > 0:
            parts.append(f"keyword:{keyword_score:.2f}")
        if semantic_score > 0:
            parts.append(f"semantic:{semantic_score:.2f}")
        if source_boost > 0:
            parts.append(f"source_boost:{source_boost:.2f}")
        return ", ".join(parts) if parts else "hybrid_match"

    def _source_boost(self, result: dict[str, Any]) -> float:
        boost = 0.0
        if result.get("official_source"):
            boost += 0.6
        confidence = _text(result.get("source_confidence") or result.get("confidence_level"))
        if confidence == "official":
            boost += 0.5
        elif confidence == "high":
            boost += 0.35
        elif confidence == "medium":
            boost += 0.15
        governance = _text(result.get("governance_status"))
        if governance == "needs_review":
            boost -= 0.2
        elif governance == "expired":
            boost -= 0.35
        return max(0.0, min(boost, 1.0))

    def _keyword_only_results(
        self,
        keyword_results: list[dict[str, Any]],
        limit: int,
    ) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for result in keyword_results[:limit]:
            item = dict(result)
            ks = _float(item.get("keyword_score") or item.get("score"))
            item["keyword_score"] = round(ks, 4)
            item["semantic_score"] = None
            item["hybrid_score"] = round(ks, 4)
            item["score"] = item["hybrid_score"]
            item["match_reason"] = item.get("match_reason") or "keyword_overlap"
            out.append(item)
        return out


orb_semantic_retrieval_service = OrbSemanticRetrievalService()

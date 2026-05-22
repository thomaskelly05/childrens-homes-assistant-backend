"""Text embeddings for standalone ORB Knowledge Library — no OS data."""

from __future__ import annotations

import logging
import math
import os
from typing import Any

logger = logging.getLogger("indicare.orb_embedding")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = _text(os.getenv(name)).lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


class OrbEmbeddingService:
    """OpenAI embeddings when configured; graceful degradation otherwise."""

    def __init__(self) -> None:
        self._model = _text(os.getenv("OPENAI_EMBEDDING_MODEL")) or "text-embedding-3-small"
        self._batch_size = max(1, min(_env_int("ORB_EMBEDDING_BATCH_SIZE", 32), 128))

    def is_available(self) -> bool:
        if not _env_bool("ORB_EMBEDDINGS_ENABLED", default=True):
            return False
        return bool(_text(os.getenv("OPENAI_API_KEY")))

    def embedding_model(self) -> str:
        return self._model

    def embed_text(self, text: str) -> dict[str, Any]:
        vectors = self.embed_many([text])
        if not vectors.get("available"):
            return {"available": False, "embedding": None, "model": self._model, "error": vectors.get("error")}
        embeddings = vectors.get("embeddings") or []
        return {
            "available": True,
            "embedding": embeddings[0] if embeddings else None,
            "model": vectors.get("model") or self._model,
        }

    def embed_many(self, texts: list[str]) -> dict[str, Any]:
        if not self.is_available():
            return {
                "available": False,
                "embeddings": [],
                "model": self._model,
                "error": "embeddings_unavailable",
            }
        cleaned = [_text(t) for t in texts if _text(t)]
        if not cleaned:
            return {"available": True, "embeddings": [], "model": self._model}

        api_key = _text(os.getenv("OPENAI_API_KEY"))
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)
            all_vectors: list[list[float]] = []
            for i in range(0, len(cleaned), self._batch_size):
                batch = cleaned[i : i + self._batch_size]
                response = client.embeddings.create(model=self._model, input=batch)
                ordered = sorted(response.data, key=lambda item: item.index)
                all_vectors.extend([list(item.embedding) for item in ordered])
            return {"available": True, "embeddings": all_vectors, "model": self._model}
        except Exception as exc:
            logger.debug("ORB embedding request failed", exc_info=True)
            return {
                "available": False,
                "embeddings": [],
                "model": self._model,
                "error": str(exc)[:200],
            }

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        norm_a = self.normalise_vector(a)
        norm_b = self.normalise_vector(b)
        return sum(x * y for x, y in zip(norm_a, norm_b))

    def normalise_vector(self, vector: list[float]) -> list[float]:
        magnitude = math.sqrt(sum(x * x for x in vector))
        if magnitude <= 0:
            return vector
        return [x / magnitude for x in vector]

    def estimate_embedding_cost(self, texts: list[str]) -> dict[str, Any]:
        chars = sum(len(_text(t)) for t in texts)
        tokens_est = max(1, chars // 4)
        # text-embedding-3-small rough pricing awareness only
        usd_per_million = 0.02
        return {
            "text_count": len(texts),
            "estimated_tokens": tokens_est,
            "estimated_usd": round(tokens_est * usd_per_million / 1_000_000, 6),
            "model": self._model,
        }


orb_embedding_service = OrbEmbeddingService()

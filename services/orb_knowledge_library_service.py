"""Standalone ORB Knowledge Library — sources and chunks; no OS care record access."""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("indicare.orb_knowledge_library")

REPO_ROOT = Path(__file__).resolve().parents[1]
SEED_DIR = REPO_ROOT / "data" / "orb_knowledge_seed"
JSON_CACHE_PATH = REPO_ROOT / "data" / "orb_knowledge_library_cache.json"

SEED_FILE_MAP: dict[str, dict[str, str]] = {
    "indicare_product.md": {
        "id": "seed-indicare-product",
        "source_type": "product_context",
        "title": "IndiCare Product Context",
        "source_label": "IndiCare product knowledge",
        "reliability": "built_in_product_context",
    },
    "standalone_orb_boundary.md": {
        "id": "seed-standalone-boundary",
        "source_type": "policy",
        "title": "Standalone ORB Product Boundary",
        "source_label": "Standalone ORB product boundary",
        "reliability": "built_in_product_boundary",
    },
    "recording_quality.md": {
        "id": "seed-recording-quality",
        "source_type": "recording_quality",
        "title": "Recording Quality Guidance",
        "source_label": "Recording quality guidance",
        "reliability": "built_in_recording_quality",
    },
    "residential_childrens_homes.md": {
        "id": "seed-residential-practice",
        "source_type": "practice_guidance",
        "title": "Residential Children's Homes Practice",
        "source_label": "Residential children's homes practice",
        "reliability": "built_in_sector_practice",
    },
    "ofsted_sccif_overview.md": {
        "id": "seed-ofsted-sccif",
        "source_type": "regulatory_framework",
        "title": "Ofsted SCCIF Overview",
        "source_label": "Ofsted SCCIF framework knowledge",
        "reliability": "built_in_regulatory_framework",
    },
    "quality_standards_overview.md": {
        "id": "seed-quality-standards",
        "source_type": "regulatory_framework",
        "title": "Quality Standards Overview",
        "source_label": "Children's Homes Quality Standards knowledge",
        "reliability": "built_in_regulatory_framework",
    },
    "safeguarding_principles.md": {
        "id": "seed-safeguarding",
        "source_type": "safeguarding_principles",
        "title": "Safeguarding Practice Principles",
        "source_label": "Safeguarding practice principles",
        "reliability": "built_in_safeguarding_principles",
    },
    "therapeutic_practice.md": {
        "id": "seed-therapeutic",
        "source_type": "therapeutic_practice",
        "title": "Therapeutic and Trauma-Informed Practice",
        "source_label": "Therapeutic practice knowledge",
        "reliability": "built_in_therapeutic_practice",
    },
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbKnowledgeLibraryService:
    """Manages standalone knowledge sources and chunks."""

    def __init__(self) -> None:
        self._memory_sources: dict[str, dict[str, Any]] = {}
        self._memory_chunks: dict[str, dict[str, Any]] = {}
        self._seeded = False
        self._seeding = False
        self._storage_mode: str = "memory"

    def _ensure_seeded(self) -> None:
        if self._seeded or self._seeding:
            return
        self._seeding = True
        try:
            self.seed_builtin_sources()
            self._seeded = True
        finally:
            self._seeding = False

    def _use_db(self) -> bool:
        try:
            conn = get_db_connection()
            release_db_connection(conn)
            return True
        except (DatabaseUnavailableError, Exception):
            return False

    def _load_json_cache(self) -> None:
        if not JSON_CACHE_PATH.exists():
            return
        try:
            data = json.loads(JSON_CACHE_PATH.read_text(encoding="utf-8"))
            for source in data.get("sources") or []:
                if isinstance(source, dict) and source.get("id"):
                    self._memory_sources[source["id"]] = source
            for chunk in data.get("chunks") or []:
                if isinstance(chunk, dict) and chunk.get("id"):
                    self._memory_chunks[chunk["id"]] = chunk
        except Exception:
            logger.warning("Could not load ORB knowledge JSON cache", exc_info=True)

    def _save_json_cache(self) -> None:
        try:
            JSON_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            JSON_CACHE_PATH.write_text(
                json.dumps(
                    {
                        "sources": list(self._memory_sources.values()),
                        "chunks": list(self._memory_chunks.values()),
                    },
                    default=str,
                    indent=2,
                ),
                encoding="utf-8",
            )
        except Exception:
            logger.warning("Could not persist ORB knowledge JSON cache", exc_info=True)

    def _row_to_source(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row.get("description"),
            "source_type": row["source_type"],
            "status": row.get("status") or "indexed",
            "origin": row.get("origin") or "built_in",
            "file_name": row.get("file_name"),
            "file_type": row.get("file_type"),
            "source_label": row.get("source_label"),
            "reliability": row.get("reliability"),
            "live_retrieved": bool(row.get("live_retrieved")),
            "standalone_only": bool(row.get("standalone_only", True)),
            "os_linked": bool(row.get("os_linked", False)),
            "care_record_access": bool(row.get("care_record_access", False)),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "metadata": row.get("metadata") or {},
        }

    def _row_to_chunk(self, row: dict[str, Any]) -> dict[str, Any]:
        keywords = row.get("keywords") or []
        if isinstance(keywords, str):
            try:
                keywords = json.loads(keywords)
            except json.JSONDecodeError:
                keywords = []
        return {
            "id": row["id"],
            "source_id": row["source_id"],
            "chunk_index": int(row["chunk_index"]),
            "title": row.get("title"),
            "text": row["text"],
            "section": row.get("section"),
            "page": row.get("page"),
            "token_estimate": row.get("token_estimate"),
            "citation_label": row.get("citation_label"),
            "source_type": row.get("source_type"),
            "keywords": keywords if isinstance(keywords, list) else [],
            "metadata": row.get("metadata") or {},
        }

    def seed_builtin_sources(self) -> list[dict[str, Any]]:
        from services.orb_document_ingestion_service import orb_document_ingestion_service

        created: list[dict[str, Any]] = []
        for filename, meta in SEED_FILE_MAP.items():
            path = str(SEED_DIR / filename)
            if not Path(path).is_file():
                continue
            text = Path(path).read_text(encoding="utf-8")
            source_id = meta["id"]
            if self._memory_sources.get(source_id):
                continue
            if self._use_db():
                try:
                    conn = get_db_connection()
                    try:
                        with conn.cursor() as cur:
                            cur.execute(
                                "SELECT id FROM orb_knowledge_sources WHERE id = %s",
                                (source_id,),
                            )
                            if cur.fetchone():
                                continue
                    finally:
                        release_db_connection(conn)
                except Exception:
                    pass
            chunks = orb_document_ingestion_service.chunk_text(
                text,
                source_title=meta["title"],
                source_type=meta["source_type"],
            )
            source = {
                "id": source_id,
                "title": meta["title"],
                "description": text.split("\n", 2)[1][:400] if "\n" in text else text[:400],
                "source_type": meta["source_type"],
                "status": "indexed",
                "origin": "seeded",
                "file_name": filename,
                "file_type": "text/markdown",
                "source_label": meta["source_label"],
                "reliability": meta["reliability"],
                "live_retrieved": False,
                "standalone_only": True,
                "os_linked": False,
                "care_record_access": False,
                "metadata": {"seed_file": filename},
            }
            self._persist_source(source)
            chunk_records = []
            for chunk in chunks:
                chunk_id = f"{source_id}-chunk-{chunk['chunk_index']}"
                chunk_records.append(
                    {
                        "id": chunk_id,
                        "source_id": source_id,
                        "chunk_index": chunk["chunk_index"],
                        "title": chunk.get("title"),
                        "text": chunk["text"],
                        "section": chunk.get("section"),
                        "page": chunk.get("page"),
                        "token_estimate": chunk.get("token_estimate"),
                        "citation_label": chunk.get("citation_label"),
                        "source_type": meta["source_type"],
                        "keywords": chunk.get("keywords") or [],
                        "metadata": chunk.get("metadata") or {},
                    }
                )
            self.upsert_chunks(source_id, chunk_records)
            created.append(source)
        return created

    def _persist_source(self, source: dict[str, Any]) -> dict[str, Any]:
        now = _utc_now()
        source.setdefault("created_at", now)
        source["updated_at"] = now
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO orb_knowledge_sources (
                                id, title, description, source_type, status, origin,
                                file_name, file_type, source_label, reliability,
                                live_retrieved, standalone_only, os_linked, care_record_access,
                                metadata, created_at, updated_at
                            ) VALUES (
                                %(id)s, %(title)s, %(description)s, %(source_type)s, %(status)s, %(origin)s,
                                %(file_name)s, %(file_type)s, %(source_label)s, %(reliability)s,
                                %(live_retrieved)s, %(standalone_only)s, %(os_linked)s, %(care_record_access)s,
                                %(metadata)s, %(created_at)s, %(updated_at)s
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                title = EXCLUDED.title,
                                description = EXCLUDED.description,
                                source_type = EXCLUDED.source_type,
                                status = EXCLUDED.status,
                                source_label = EXCLUDED.source_label,
                                reliability = EXCLUDED.reliability,
                                metadata = EXCLUDED.metadata,
                                updated_at = EXCLUDED.updated_at
                            """,
                            {
                                **source,
                                "metadata": Json(source.get("metadata") or {}),
                                "created_at": source.get("created_at") or now,
                                "updated_at": source.get("updated_at") or now,
                            },
                        )
                    conn.commit()
                    self._storage_mode = "postgresql"
                    return source
                finally:
                    release_db_connection(conn)
            except Exception:
                logger.debug("ORB knowledge DB persist failed; using memory", exc_info=True)

        self._memory_sources[source["id"]] = source
        self._storage_mode = "memory"
        self._save_json_cache()
        return source

    def list_sources(
        self,
        *,
        source_type: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        self._ensure_seeded()
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    clauses = ["1=1"]
                    params: dict[str, Any] = {}
                    if source_type:
                        clauses.append("source_type = %(source_type)s")
                        params["source_type"] = source_type
                    if status:
                        clauses.append("status = %(status)s")
                        params["status"] = status
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            f"""
                            SELECT * FROM orb_knowledge_sources
                            WHERE {' AND '.join(clauses)}
                            ORDER BY origin ASC, title ASC
                            """,
                            params,
                        )
                        rows = cur.fetchall()
                    self._storage_mode = "postgresql"
                    return [self._row_to_source(dict(row)) for row in rows]
                finally:
                    release_db_connection(conn)
            except Exception:
                logger.debug("ORB knowledge list_sources DB failed", exc_info=True)

        self._load_json_cache()
        sources = list(self._memory_sources.values())
        if source_type:
            sources = [s for s in sources if s.get("source_type") == source_type]
        if status:
            sources = [s for s in sources if s.get("status") == status]
        return sorted(sources, key=lambda s: (s.get("origin", ""), s.get("title", "")))

    def get_source(self, source_id: str) -> dict[str, Any] | None:
        self._ensure_seeded()
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            "SELECT * FROM orb_knowledge_sources WHERE id = %s",
                            (source_id,),
                        )
                        row = cur.fetchone()
                    if row:
                        return self._row_to_source(dict(row))
                finally:
                    release_db_connection(conn)
            except Exception:
                pass
        return self._memory_sources.get(source_id)

    def create_source(self, payload: dict[str, Any]) -> dict[str, Any]:
        source_id = payload.get("id") or f"orb-ks-{uuid.uuid4().hex[:12]}"
        source = {
            "id": source_id,
            "title": _text(payload.get("title")),
            "description": payload.get("description"),
            "source_type": payload.get("source_type") or "user_uploaded",
            "status": payload.get("status") or "draft",
            "origin": payload.get("origin") or "user_uploaded",
            "file_name": payload.get("file_name"),
            "file_type": payload.get("file_type"),
            "source_label": payload.get("source_label") or _text(payload.get("title")),
            "reliability": payload.get("reliability") or "user_uploaded",
            "live_retrieved": False,
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
            "metadata": payload.get("metadata") or {},
        }
        return self._persist_source(source)

    def update_source(self, source_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        existing = self.get_source(source_id)
        if not existing:
            return None
        for key in ("title", "description", "source_type", "status", "source_label", "metadata"):
            if key in payload and payload[key] is not None:
                existing[key] = payload[key]
        return self._persist_source(existing)

    def delete_or_archive_source(self, source_id: str) -> bool:
        existing = self.get_source(source_id)
        if not existing:
            return False
        if existing.get("origin") in {"built_in", "seeded"}:
            existing["status"] = "archived"
            self._persist_source(existing)
            return True
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM orb_knowledge_sources WHERE id = %s", (source_id,))
                    conn.commit()
                    return True
                finally:
                    release_db_connection(conn)
            except Exception:
                pass
        self._memory_sources.pop(source_id, None)
        to_remove = [cid for cid, ch in self._memory_chunks.items() if ch.get("source_id") == source_id]
        for cid in to_remove:
            self._memory_chunks.pop(cid, None)
        self._save_json_cache()
        return True

    def upsert_chunks(self, source_id: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM orb_knowledge_chunks WHERE source_id = %s", (source_id,))
                        for chunk in chunks:
                            cur.execute(
                                """
                                INSERT INTO orb_knowledge_chunks (
                                    id, source_id, chunk_index, title, text, section, page,
                                    token_estimate, citation_label, source_type, keywords, metadata
                                ) VALUES (
                                    %(id)s, %(source_id)s, %(chunk_index)s, %(title)s, %(text)s,
                                    %(section)s, %(page)s, %(token_estimate)s, %(citation_label)s,
                                    %(source_type)s, %(keywords)s, %(metadata)s
                                )
                                """,
                                {
                                    **chunk,
                                    "keywords": Json(chunk.get("keywords") or []),
                                    "metadata": Json(chunk.get("metadata") or {}),
                                },
                            )
                        cur.execute(
                            "UPDATE orb_knowledge_sources SET status = 'indexed', updated_at = NOW() WHERE id = %s",
                            (source_id,),
                        )
                    conn.commit()
                    return chunks
                finally:
                    release_db_connection(conn)
            except Exception:
                logger.debug("ORB knowledge upsert_chunks DB failed", exc_info=True)

        for chunk in chunks:
            self._memory_chunks[chunk["id"]] = chunk
        if source_id in self._memory_sources:
            self._memory_sources[source_id]["status"] = "indexed"
        self._save_json_cache()
        return chunks

    def list_chunks(self, source_id: str | None = None) -> list[dict[str, Any]]:
        self._ensure_seeded()
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        if source_id:
                            cur.execute(
                                """
                                SELECT * FROM orb_knowledge_chunks
                                WHERE source_id = %s ORDER BY chunk_index ASC
                                """,
                                (source_id,),
                            )
                        else:
                            cur.execute(
                                "SELECT * FROM orb_knowledge_chunks ORDER BY source_id, chunk_index"
                            )
                        rows = cur.fetchall()
                    return [self._row_to_chunk(dict(row)) for row in rows]
                finally:
                    release_db_connection(conn)
            except Exception:
                pass

        self._load_json_cache()
        chunks = list(self._memory_chunks.values())
        if source_id:
            chunks = [c for c in chunks if c.get("source_id") == source_id]
        return sorted(chunks, key=lambda c: (c.get("source_id", ""), c.get("chunk_index", 0)))

    def get_library_summary(self) -> dict[str, Any]:
        sources = self.list_sources()
        chunks = self.list_chunks()
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for source in sources:
            st = _text(source.get("source_type")) or "unknown"
            by_type[st] = by_type.get(st, 0) + 1
            status = _text(source.get("status")) or "unknown"
            by_status[status] = by_status.get(status, 0) + 1
        return {
            "source_count": len(sources),
            "chunk_count": len(chunks),
            "by_type": by_type,
            "by_status": by_status,
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
            "storage": self._storage_mode,
        }

    def search_chunks_keyword(
        self,
        query: str,
        *,
        filters: dict[str, Any] | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        self._ensure_seeded()
        filters = filters or {}
        query_lower = _text(query).lower()
        if not query_lower:
            return []

        tokens = [t for t in re.findall(r"[a-z0-9']+", query_lower) if len(t) > 2]
        if not tokens:
            tokens = query_lower.split()

        chunks = self.list_chunks()
        source_by_id = {s["id"]: s for s in self.list_sources()}
        scored: list[tuple[float, dict[str, Any], str]] = []

        for chunk in chunks:
            source = source_by_id.get(chunk["source_id"])
            if not source or source.get("status") == "archived":
                continue
            if filters.get("source_type") and source.get("source_type") != filters["source_type"]:
                continue
            text_lower = _text(chunk.get("text")).lower()
            title_lower = _text(chunk.get("title")).lower()
            keywords_lower = " ".join(chunk.get("keywords") or []).lower()
            haystack = f"{title_lower} {text_lower} {keywords_lower}"

            score = 0.0
            reasons: list[str] = []
            for token in tokens:
                if token in haystack:
                    score += 2.0
                    reasons.append(f"keyword:{token}")
            if query_lower in text_lower:
                score += 5.0
                reasons.append("phrase_match")
            if filters.get("source_type") and source.get("source_type") == filters["source_type"]:
                score += 1.5

            if score <= 0:
                continue

            result = {
                "source_id": chunk["source_id"],
                "source_title": source.get("title"),
                "source_type": source.get("source_type"),
                "citation_label": chunk.get("citation_label") or source.get("source_label"),
                "section": chunk.get("section"),
                "page": chunk.get("page"),
                "chunk_index": chunk.get("chunk_index"),
                "text": chunk.get("text"),
                "score": round(score, 3),
                "match_reason": ", ".join(reasons[:4]) or "keyword_overlap",
                "live_retrieved": False,
                "metadata": {
                    **(chunk.get("metadata") or {}),
                    "origin": source.get("origin"),
                    "source_label": source.get("source_label"),
                },
            }
            scored.append((score, result, chunk["id"]))

        scored.sort(key=lambda item: (-item[0], item[2]))
        return [item[1] for item in scored[:limit]]

    def health(self) -> dict[str, Any]:
        summary = self.get_library_summary()
        return {
            "status": "ready",
            "storage": summary.get("storage", self._storage_mode),
            "source_count": summary["source_count"],
            "chunk_count": summary["chunk_count"],
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
        }


orb_knowledge_library_service = OrbKnowledgeLibraryService()

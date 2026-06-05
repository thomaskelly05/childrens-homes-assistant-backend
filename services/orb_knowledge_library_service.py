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
from services.orb_care_synonym_service import orb_care_synonym_service
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

GOVERNANCE_SEED_META: dict[str, dict[str, Any]] = {
    "seed-ofsted-sccif": {
        "official_source": True,
        "publisher": "Ofsted",
        "document_family": "ofsted",
        "confidence_level": "official",
        "governance_status": "approved",
        "source_version": "built-in-summary-v1",
        "source_integrity": "summary_only",
        "notes": "Built-in summary only, not full official text. Upload official documents for exact source retrieval.",
    },
    "seed-quality-standards": {
        "official_source": True,
        "publisher": "Department for Education",
        "document_family": "dfe",
        "confidence_level": "official",
        "governance_status": "approved",
        "source_version": "built-in-summary-v1",
        "source_integrity": "summary_only",
        "notes": "Built-in summary only, not full official text. Upload official documents for exact source retrieval.",
    },
    "seed-safeguarding": {
        "official_source": False,
        "publisher": "IndiCare ORB",
        "confidence_level": "high",
        "governance_status": "approved",
        "source_version": "built-in-summary-v1",
        "notes": "Built-in safeguarding practice summary.",
    },
    "seed-indicare-product": {
        "official_source": False,
        "confidence_level": "high",
        "governance_status": "approved",
        "source_type_note": "product_context",
        "notes": "IndiCare product context — not a regulatory official source.",
    },
    "seed-recording-quality": {
        "official_source": False,
        "confidence_level": "high",
        "governance_status": "approved",
        "source_version": "built-in-summary-v1",
        "source_integrity": "summary_only",
    },
    "seed-residential-practice": {
        "official_source": False,
        "confidence_level": "high",
        "governance_status": "approved",
        "source_version": "built-in-summary-v1",
    },
    "seed-therapeutic": {
        "official_source": False,
        "confidence_level": "high",
        "governance_status": "approved",
        "source_version": "built-in-summary-v1",
    },
    "seed-standalone-boundary": {
        "official_source": False,
        "confidence_level": "high",
        "governance_status": "approved",
    },
}

BUILTIN_GOVERNANCE_WARNING = (
    "These are built-in summaries. Upload official documents for exact source retrieval."
)

GLOBAL_KNOWLEDGE_SCOPES = frozenset({"global_builtin", "global_admin_approved"})


def _normalize_user_id(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_source_scope(source: dict[str, Any]) -> str:
    scope = _text(source.get("source_scope"))
    if scope:
        return scope
    origin = _text(source.get("origin"))
    if origin in {"seeded", "built_in", "builtin"}:
        return "global_builtin"
    if source.get("governance_status") == "approved" and source.get("official_source"):
        return "global_admin_approved"
    if source.get("uploaded_by_user_id") or source.get("owner_user_id"):
        return "user_private"
    return "global_builtin"


def user_can_view_knowledge_source(source: dict[str, Any], viewer_user_id: int | None) -> bool:
    scope = resolve_source_scope(source)
    if scope in GLOBAL_KNOWLEDGE_SCOPES:
        return True
    if scope == "organisation_private":
        return False
    if scope == "user_private":
        owner = _normalize_user_id(source.get("owner_user_id")) or _normalize_user_id(
            source.get("uploaded_by_user_id")
        )
        return viewer_user_id is not None and owner is not None and owner == viewer_user_id
    return True


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

    def _parse_json_list(self, value: Any) -> list:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                return []
        return []

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
            "source_version": row.get("source_version"),
            "official_source": bool(row.get("official_source", False)),
            "source_url": row.get("source_url"),
            "publisher": row.get("publisher"),
            "published_at": row.get("published_at"),
            "review_due_at": row.get("review_due_at"),
            "expires_at": row.get("expires_at"),
            "confidence_level": row.get("confidence_level") or "medium",
            "governance_status": row.get("governance_status") or "approved",
            "approved_by": row.get("approved_by"),
            "approved_at": row.get("approved_at"),
            "notes": row.get("notes"),
            "canonical_url": row.get("canonical_url"),
            "jurisdiction": row.get("jurisdiction"),
            "document_family": row.get("document_family"),
            "document_version_label": row.get("document_version_label"),
            "uploaded_by_user_id": row.get("uploaded_by_user_id"),
            "approved_by_user_id": row.get("approved_by_user_id"),
            "source_integrity": row.get("source_integrity") or "summary_only",
            "copyright_note": row.get("copyright_note"),
            "citation_style": row.get("citation_style"),
            "source_scope": row.get("source_scope") or resolve_source_scope(row),
            "owner_user_id": row.get("owner_user_id"),
            "organisation_id": row.get("organisation_id"),
        }

    def _row_to_chunk(self, row: dict[str, Any]) -> dict[str, Any]:
        keywords = self._parse_json_list(row.get("keywords"))
        embedding = row.get("embedding")
        if isinstance(embedding, str):
            try:
                embedding = json.loads(embedding)
            except json.JSONDecodeError:
                embedding = None
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
            "keywords": keywords,
            "metadata": row.get("metadata") or {},
            "embedding": embedding if isinstance(embedding, list) else None,
            "embedding_model": row.get("embedding_model"),
            "embedding_created_at": row.get("embedding_created_at"),
            "semantic_keywords": self._parse_json_list(row.get("semantic_keywords")),
            "canonical_terms": self._parse_json_list(row.get("canonical_terms")),
            "confidence_score": row.get("confidence_score"),
            "heading_path": self._parse_json_list(row.get("heading_path")),
            "heading": row.get("heading"),
            "subsection": row.get("subsection"),
            "paragraph_number": row.get("paragraph_number"),
            "line_start": row.get("line_start"),
            "line_end": row.get("line_end"),
            "exact_excerpt": row.get("exact_excerpt"),
            "normalized_excerpt": row.get("normalized_excerpt"),
            "citation_anchor": row.get("citation_anchor"),
            "source_url": row.get("source_url"),
            "source_version": row.get("source_version"),
            "official_source": bool(row.get("official_source", False)),
            "source_integrity": row.get("source_integrity"),
            "governance_status": row.get("governance_status"),
            "confidence_level": row.get("confidence_level"),
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
            governance = GOVERNANCE_SEED_META.get(source_id, {})
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
                "metadata": {
                    "seed_file": filename,
                    "governance_warning": BUILTIN_GOVERNANCE_WARNING,
                },
                "source_version": governance.get("source_version", "built-in-summary-v1"),
                "official_source": bool(governance.get("official_source", False)),
                "publisher": governance.get("publisher"),
                "confidence_level": governance.get("confidence_level", "medium"),
                "governance_status": governance.get("governance_status", "approved"),
                "notes": governance.get("notes"),
                "document_family": governance.get("document_family"),
                "source_integrity": governance.get("source_integrity", "summary_only"),
                "source_scope": "global_builtin",
            }
            self._persist_source(source)
            chunks = orb_document_ingestion_service.chunk_text(
                text,
                source_title=meta["title"],
                source_type=meta["source_type"],
                source_id=source_id,
            )
            chunk_records = []
            for chunk in chunks:
                enriched = orb_document_ingestion_service._enrich_chunk(
                    chunk, source_type=meta["source_type"], source=source
                )
                chunk_records.append(
                    orb_document_ingestion_service._chunk_record_from_enriched(
                        source_id, meta["source_type"], enriched
                    )
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
                                metadata, created_at, updated_at,
                                source_version, official_source, source_url, publisher,
                                published_at, review_due_at, expires_at,
                                confidence_level, governance_status, approved_by, approved_at, notes,
                                canonical_url, jurisdiction, document_family, document_version_label,
                                uploaded_by_user_id, approved_by_user_id, source_integrity,
                                copyright_note, citation_style
                            ) VALUES (
                                %(id)s, %(title)s, %(description)s, %(source_type)s, %(status)s, %(origin)s,
                                %(file_name)s, %(file_type)s, %(source_label)s, %(reliability)s,
                                %(live_retrieved)s, %(standalone_only)s, %(os_linked)s, %(care_record_access)s,
                                %(metadata)s, %(created_at)s, %(updated_at)s,
                                %(source_version)s, %(official_source)s, %(source_url)s, %(publisher)s,
                                %(published_at)s, %(review_due_at)s, %(expires_at)s,
                                %(confidence_level)s, %(governance_status)s, %(approved_by)s, %(approved_at)s, %(notes)s,
                                %(canonical_url)s, %(jurisdiction)s, %(document_family)s, %(document_version_label)s,
                                %(uploaded_by_user_id)s, %(approved_by_user_id)s, %(source_integrity)s,
                                %(copyright_note)s, %(citation_style)s
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                title = EXCLUDED.title,
                                description = EXCLUDED.description,
                                source_type = EXCLUDED.source_type,
                                status = EXCLUDED.status,
                                source_label = EXCLUDED.source_label,
                                reliability = EXCLUDED.reliability,
                                metadata = EXCLUDED.metadata,
                                source_version = EXCLUDED.source_version,
                                official_source = EXCLUDED.official_source,
                                publisher = EXCLUDED.publisher,
                                confidence_level = EXCLUDED.confidence_level,
                                governance_status = EXCLUDED.governance_status,
                                notes = EXCLUDED.notes,
                                canonical_url = EXCLUDED.canonical_url,
                                jurisdiction = EXCLUDED.jurisdiction,
                                document_family = EXCLUDED.document_family,
                                document_version_label = EXCLUDED.document_version_label,
                                source_integrity = EXCLUDED.source_integrity,
                                copyright_note = EXCLUDED.copyright_note,
                                citation_style = EXCLUDED.citation_style,
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
        governance_status: str | None = None,
        viewer_user_id: int | None = None,
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
                    if governance_status:
                        clauses.append("governance_status = %(governance_status)s")
                        params["governance_status"] = governance_status
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
                    sources = [self._row_to_source(dict(row)) for row in rows]
                    return [
                        s
                        for s in sources
                        if user_can_view_knowledge_source(s, viewer_user_id)
                    ]
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
        if governance_status:
            sources = [s for s in sources if s.get("governance_status") == governance_status]
        sources = [s for s in sources if user_can_view_knowledge_source(s, viewer_user_id)]
        return sorted(sources, key=lambda s: (s.get("origin", ""), s.get("title", "")))

    def get_source(
        self, source_id: str, *, viewer_user_id: int | None = None
    ) -> dict[str, Any] | None:
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
                        source = self._row_to_source(dict(row))
                        if user_can_view_knowledge_source(source, viewer_user_id):
                            return source
                        return None
                finally:
                    release_db_connection(conn)
            except Exception:
                pass
        source = self._memory_sources.get(source_id)
        if source and user_can_view_knowledge_source(source, viewer_user_id):
            return source
        return None

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
            "source_version": payload.get("source_version"),
            "official_source": bool(payload.get("official_source", False)),
            "source_url": payload.get("source_url"),
            "publisher": payload.get("publisher"),
            "published_at": payload.get("published_at"),
            "review_due_at": payload.get("review_due_at"),
            "expires_at": payload.get("expires_at"),
            "confidence_level": payload.get("confidence_level") or "medium",
            "governance_status": payload.get("governance_status") or "approved",
            "approved_by": payload.get("approved_by"),
            "approved_at": payload.get("approved_at"),
            "notes": payload.get("notes"),
            "canonical_url": payload.get("canonical_url"),
            "jurisdiction": payload.get("jurisdiction"),
            "document_family": payload.get("document_family"),
            "document_version_label": payload.get("document_version_label"),
            "uploaded_by_user_id": payload.get("uploaded_by_user_id"),
            "approved_by_user_id": payload.get("approved_by_user_id"),
            "source_integrity": payload.get("source_integrity") or "unknown",
            "copyright_note": payload.get("copyright_note"),
            "citation_style": payload.get("citation_style"),
            "source_scope": payload.get("source_scope")
            or ("user_private" if payload.get("uploaded_by_user_id") else "global_admin_approved"),
            "owner_user_id": payload.get("owner_user_id") or payload.get("uploaded_by_user_id"),
            "organisation_id": payload.get("organisation_id"),
        }
        return self._persist_source(source)

    def update_source(self, source_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        existing = self.get_source(source_id)
        if not existing:
            return None
        update_keys = (
            "title",
            "description",
            "source_type",
            "status",
            "source_label",
            "metadata",
            "source_version",
            "official_source",
            "source_url",
            "publisher",
            "published_at",
            "review_due_at",
            "expires_at",
            "confidence_level",
            "governance_status",
            "approved_by",
            "approved_at",
            "notes",
            "canonical_url",
            "jurisdiction",
            "document_family",
            "document_version_label",
            "source_integrity",
            "copyright_note",
            "citation_style",
            "approved_by_user_id",
        )
        for key in update_keys:
            if key in payload and payload[key] is not None:
                existing[key] = payload[key]
        return self._persist_source(existing)

    def update_source_governance(self, source_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        return self.update_source(source_id, payload)

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
                                    token_estimate, citation_label, source_type, keywords, metadata,
                                    embedding, embedding_model, embedding_created_at,
                                    semantic_keywords, canonical_terms, confidence_score,
                                    heading_path, heading, subsection, paragraph_number,
                                    line_start, line_end, exact_excerpt, normalized_excerpt,
                                    citation_anchor, source_url, source_version, official_source,
                                    source_integrity, governance_status, confidence_level
                                ) VALUES (
                                    %(id)s, %(source_id)s, %(chunk_index)s, %(title)s, %(text)s,
                                    %(section)s, %(page)s, %(token_estimate)s, %(citation_label)s,
                                    %(source_type)s, %(keywords)s, %(metadata)s,
                                    %(embedding)s, %(embedding_model)s, %(embedding_created_at)s,
                                    %(semantic_keywords)s, %(canonical_terms)s, %(confidence_score)s,
                                    %(heading_path)s, %(heading)s, %(subsection)s, %(paragraph_number)s,
                                    %(line_start)s, %(line_end)s, %(exact_excerpt)s, %(normalized_excerpt)s,
                                    %(citation_anchor)s, %(source_url)s, %(source_version)s, %(official_source)s,
                                    %(source_integrity)s, %(governance_status)s, %(confidence_level)s
                                )
                                """,
                                {
                                    **chunk,
                                    "keywords": Json(chunk.get("keywords") or []),
                                    "metadata": Json(chunk.get("metadata") or {}),
                                    "embedding": Json(chunk.get("embedding"))
                                    if chunk.get("embedding") is not None
                                    else None,
                                    "semantic_keywords": Json(chunk.get("semantic_keywords") or []),
                                    "canonical_terms": Json(chunk.get("canonical_terms") or []),
                                    "heading_path": Json(chunk.get("heading_path") or []),
                                    "official_source": bool(chunk.get("official_source", False)),
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

    def _governance_warning(self, source: dict[str, Any]) -> str | None:
        now = _utc_now()
        status = _text(source.get("governance_status"))
        if status == "needs_review":
            return "This source may need review."
        if status == "expired":
            return "This source has expired and may need review."
        expires_at = source.get("expires_at")
        if expires_at:
            try:
                exp = expires_at if isinstance(expires_at, datetime) else datetime.fromisoformat(
                    str(expires_at).replace("Z", "+00:00")
                )
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    return "This source may need review."
            except (TypeError, ValueError):
                pass
        review_due = source.get("review_due_at")
        if review_due:
            try:
                due = review_due if isinstance(review_due, datetime) else datetime.fromisoformat(
                    str(review_due).replace("Z", "+00:00")
                )
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if due < now:
                    return "This source may need review."
            except (TypeError, ValueError):
                pass
        return None

    def _confidence_boost(self, source: dict[str, Any]) -> float:
        boost = 0.0
        if source.get("official_source"):
            boost += 2.0
        level = _text(source.get("confidence_level"))
        if level == "official":
            boost += 2.5
        elif level == "high":
            boost += 1.5
        elif level == "medium":
            boost += 0.5
        warning = self._governance_warning(source)
        if warning:
            boost -= 0.75
        return boost

    def list_sources_needing_review(self) -> list[dict[str, Any]]:
        sources = self.list_sources()
        return [
            s
            for s in sources
            if s.get("governance_status") == "needs_review"
            or self._governance_warning(s) is not None
        ]

    def list_expired_sources(self) -> list[dict[str, Any]]:
        return [s for s in self.list_sources() if s.get("governance_status") == "expired"]

    def get_candidate_chunks_for_semantic_search(
        self,
        filters: dict[str, Any] | None = None,
        *,
        viewer_user_id: int | None = None,
    ) -> list[dict[str, Any]]:
        filters = filters or {}
        chunks = self.list_chunks()
        source_by_id = {
            s["id"]: s for s in self.list_sources(viewer_user_id=viewer_user_id)
        }
        candidates: list[dict[str, Any]] = []
        for chunk in chunks:
            source = source_by_id.get(chunk["source_id"])
            if not source or source.get("status") == "archived":
                continue
            if not user_can_view_knowledge_source(source, viewer_user_id):
                continue
            if filters.get("source_type") and source.get("source_type") != filters["source_type"]:
                continue
            candidates.append(
                {
                    **chunk,
                    "source_title": source.get("title"),
                    "source_type": source.get("source_type"),
                    "citation_label": chunk.get("citation_label") or source.get("source_label"),
                    "official_source": source.get("official_source"),
                    "source_confidence": source.get("confidence_level"),
                    "governance_status": source.get("governance_status"),
                    "chunk_confidence_score": chunk.get("confidence_score"),
                }
            )
        return candidates

    def update_chunk_embedding(
        self,
        chunk_id: str,
        embedding: list[float],
        model: str,
    ) -> bool:
        chunk = self._memory_chunks.get(chunk_id)
        if chunk:
            chunk["embedding"] = embedding
            chunk["embedding_model"] = model
            chunk["embedding_created_at"] = _utc_now().isoformat()
            self._save_json_cache()
            return True
        if self._use_db():
            try:
                conn = get_db_connection()
                try:
                    rowcount = 0
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            UPDATE orb_knowledge_chunks
                            SET embedding = %s, embedding_model = %s, embedding_created_at = NOW()
                            WHERE id = %s
                            """,
                            (Json(embedding), model, chunk_id),
                        )
                        rowcount = cur.rowcount
                    conn.commit()
                    return rowcount > 0
                finally:
                    release_db_connection(conn)
            except Exception:
                logger.debug("update_chunk_embedding failed", exc_info=True)
        return False

    def embed_missing_chunks(self, limit: int = 32) -> dict[str, Any]:
        from services.orb_embedding_service import orb_embedding_service

        if not orb_embedding_service.is_available():
            return {"embedded": 0, "available": False, "reason": "embeddings_unavailable"}

        chunks = self.list_chunks()
        missing = [c for c in chunks if not c.get("embedding")][:limit]
        if not missing:
            return {"embedded": 0, "available": True}

        texts = [_text(c.get("text")) for c in missing]
        result = orb_embedding_service.embed_many(texts)
        if not result.get("available"):
            return {"embedded": 0, "available": False, "reason": result.get("error")}

        model = result.get("model") or orb_embedding_service.embedding_model()
        embedded = 0
        for chunk, vector in zip(missing, result.get("embeddings") or []):
            if vector and self.update_chunk_embedding(chunk["id"], vector, model):
                embedded += 1
        return {"embedded": embedded, "available": True, "model": model}

    def search_chunks_keyword(
        self,
        query: str,
        *,
        filters: dict[str, Any] | None = None,
        limit: int = 8,
        expanded_query: str | None = None,
        viewer_user_id: int | None = None,
    ) -> list[dict[str, Any]]:
        self._ensure_seeded()
        filters = filters or {}
        expansion = orb_care_synonym_service.expand_query(query)
        query_lower = _text(expanded_query or expansion.get("expanded_query") or query).lower()
        if not query_lower:
            return []

        tokens = [t for t in re.findall(r"[a-z0-9']+", query_lower) if len(t) > 2]
        if not tokens:
            tokens = query_lower.split()
        expanded_terms = [_text(t).lower() for t in expansion.get("expanded_terms") or []]

        chunks = self.list_chunks()
        source_by_id = {
            s["id"]: s for s in self.list_sources(viewer_user_id=viewer_user_id)
        }
        scored: list[tuple[float, dict[str, Any], str]] = []

        for chunk in chunks:
            source = source_by_id.get(chunk["source_id"])
            if not source or source.get("status") == "archived":
                continue
            if not user_can_view_knowledge_source(source, viewer_user_id):
                continue
            if filters.get("governance_status") and source.get("governance_status") != filters["governance_status"]:
                continue
            if filters.get("source_type") and source.get("source_type") != filters["source_type"]:
                continue
            text_lower = _text(chunk.get("text")).lower()
            title_lower = _text(chunk.get("title")).lower()
            keywords_lower = " ".join(chunk.get("keywords") or []).lower()
            semantic_kw = " ".join(chunk.get("semantic_keywords") or []).lower()
            canonical = " ".join(chunk.get("canonical_terms") or []).lower()
            haystack = f"{title_lower} {text_lower} {keywords_lower} {semantic_kw} {canonical}"

            score = 0.0
            reasons: list[str] = []
            for token in tokens:
                if token in haystack:
                    score += 2.0
                    reasons.append(f"keyword:{token}")
            for term in expanded_terms:
                if term and term in haystack:
                    score += 2.5
                    reasons.append(f"synonym:{term[:24]}")
            for concept in expansion.get("concepts") or []:
                if concept.replace("_", " ") in canonical or concept in canonical:
                    score += 3.0
                    reasons.append(f"concept:{concept}")
            if query_lower in text_lower:
                score += 5.0
                reasons.append("phrase_match")
            if filters.get("source_type") and source.get("source_type") == filters["source_type"]:
                score += 1.5

            score += self._confidence_boost(source)

            if score <= 0:
                continue

            keyword_score = round(score, 3)
            warning = self._governance_warning(source)
            integrity = _text(source.get("source_integrity"))
            if integrity == "summary_only" and not warning:
                warning = (
                    "This is a built-in summary, not the full official document."
                )
            from services.orb_exact_citation_service import orb_exact_citation_service

            exact_label = orb_exact_citation_service.build_exact_citation_label(source, chunk)
            result = {
                "source_id": chunk["source_id"],
                "source_title": source.get("title"),
                "source_type": source.get("source_type"),
                "citation_label": chunk.get("citation_label") or exact_label,
                "exact_citation": exact_label,
                "citation_anchor": chunk.get("citation_anchor"),
                "heading_path": chunk.get("heading_path") or [],
                "heading": chunk.get("heading"),
                "section": chunk.get("section"),
                "subsection": chunk.get("subsection"),
                "page": chunk.get("page"),
                "paragraph_number": chunk.get("paragraph_number"),
                "chunk_index": chunk.get("chunk_index"),
                "text": chunk.get("text"),
                "excerpt": _text(chunk.get("exact_excerpt")) or chunk.get("text", "")[:500],
                "score": keyword_score,
                "keyword_score": keyword_score,
                "semantic_score": None,
                "hybrid_score": keyword_score,
                "confidence_score": chunk.get("confidence_score"),
                "source_confidence": source.get("confidence_level"),
                "governance_status": source.get("governance_status"),
                "official_source": source.get("official_source"),
                "source_integrity": integrity or None,
                "source_url": source.get("source_url"),
                "source_version": source.get("source_version"),
                "warning": warning,
                "quote_allowed": integrity not in {"summary_only", "unknown"},
                "match_reason": ", ".join(reasons[:5]) or "keyword_overlap",
                "live_retrieved": False,
                "metadata": {
                    **(chunk.get("metadata") or {}),
                    "origin": source.get("origin"),
                    "source_label": source.get("source_label"),
                    "source_version": source.get("source_version"),
                    "source_integrity": integrity,
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

    def list_official_sources(self) -> list[dict[str, Any]]:
        return [s for s in self.list_sources() if s.get("official_source")]

    def approve_source(
        self,
        source_id: str,
        *,
        current_user: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        user_id = _text((current_user or {}).get("id") or (current_user or {}).get("user_id"))
        return self.update_source(
            source_id,
            {
                "governance_status": "approved",
                "approved_at": _utc_now().isoformat(),
                "approved_by": user_id or "admin",
                "approved_by_user_id": user_id or None,
            },
        )

    def mark_needs_review(self, source_id: str, reason: str | None = None) -> dict[str, Any] | None:
        payload: dict[str, Any] = {"governance_status": "needs_review"}
        if reason:
            existing = self.get_source(source_id)
            notes = _text((existing or {}).get("notes"))
            payload["notes"] = f"{notes}\n{reason}".strip() if notes else reason
        return self.update_source(source_id, payload)

    def archive_source(self, source_id: str) -> dict[str, Any] | None:
        return self.update_source(source_id, {"governance_status": "archived", "status": "archived"})

    def update_source_metadata(self, source_id: str, metadata: dict[str, Any]) -> dict[str, Any] | None:
        return self.update_source(source_id, metadata)

    def get_source_citation_health(self, source_id: str) -> dict[str, Any]:
        from services.orb_exact_citation_service import orb_exact_citation_service
        from services.orb_official_source_registry_service import orb_official_source_registry_service

        source = self.get_source(source_id)
        if not source:
            return {"source_id": source_id, "health_status": "not_found", "chunk_count": 0, "warnings": []}

        chunks = self.list_chunks(source_id)
        warnings: list[str] = []
        integrity_warn = orb_official_source_registry_service.source_warning_for_integrity(source)
        if integrity_warn:
            warnings.append(integrity_warn)
        gov_warn = orb_exact_citation_service.source_warning(source)
        if gov_warn:
            warnings.append(gov_warn)

        with_section = sum(1 for c in chunks if _text(c.get("section")))
        with_page = sum(1 for c in chunks if _text(c.get("page")))
        with_heading = sum(1 for c in chunks if c.get("heading_path") or _text(c.get("heading")))
        with_anchor = sum(1 for c in chunks if _text(c.get("citation_anchor")))
        with_excerpt = sum(1 for c in chunks if _text(c.get("exact_excerpt")))

        health_status = "ok"
        if not chunks:
            health_status = "no_chunks"
        elif _text(source.get("source_integrity")) == "summary_only":
            health_status = "summary_only"
        elif with_section == 0 and with_heading == 0:
            health_status = "weak_structure"

        return {
            "source_id": source_id,
            "chunk_count": len(chunks),
            "chunks_with_section": with_section,
            "chunks_with_page": with_page,
            "chunks_with_heading": with_heading,
            "chunks_with_anchor": with_anchor,
            "chunks_with_exact_excerpt": with_excerpt,
            "summary_only": _text(source.get("source_integrity")) == "summary_only",
            "governance_status": source.get("governance_status"),
            "official_source": bool(source.get("official_source")),
            "source_integrity": source.get("source_integrity"),
            "warnings": list(dict.fromkeys(warnings)),
            "health_status": health_status,
        }

    def ingest_text(self, payload: Any) -> dict[str, Any]:
        from services.orb_document_ingestion_service import orb_document_ingestion_service

        data = payload.model_dump() if hasattr(payload, "model_dump") else dict(payload)
        source_id = f"orb-ingest-{uuid.uuid4().hex[:12]}"
        meta = dict(data.get("metadata") or {})
        source = self.create_source(
            {
                "id": source_id,
                "title": _text(data.get("title")),
                "description": data.get("description"),
                "source_type": data.get("source_type") or "user_uploaded",
                "source_label": data.get("source_label") or _text(data.get("title")),
                "status": "indexed",
                "origin": "user_uploaded",
                "metadata": meta,
                "uploaded_by_user_id": meta.get("uploaded_by_user_id"),
                "owner_user_id": meta.get("owner_user_id"),
                "source_scope": meta.get("source_scope", "user_private"),
                "governance_status": "approved" if data.get("approve_now") else "draft",
            }
        )
        chunks = orb_document_ingestion_service.chunk_text(
            _text(data.get("text")),
            source_title=source["title"],
            source_type=source["source_type"],
            source_id=source_id,
        )
        records = []
        for chunk in chunks:
            enriched = orb_document_ingestion_service._enrich_chunk(
                chunk, source_type=source["source_type"], source=source
            )
            records.append(
                orb_document_ingestion_service._chunk_record_from_enriched(
                    source_id, source["source_type"], enriched
                )
            )
        self.upsert_chunks(source_id, records)
        return {"source_id": source_id, "chunk_count": len(records), "source": source}

    def rebuild_citations(self, source_id: str) -> dict[str, Any]:
        return self.rebuild_citations_for_source(source_id)

    def rebuild_citations_for_source(self, source_id: str) -> dict[str, Any]:
        from services.orb_document_ingestion_service import orb_document_ingestion_service
        from services.orb_exact_citation_service import orb_exact_citation_service

        source = self.get_source(source_id)
        if not source:
            return {"rebuilt": 0, "error": "not_found"}
        chunks = self.list_chunks(source_id)
        rebuilt: list[dict[str, Any]] = []
        for chunk in chunks:
            chunk["citation_label"] = orb_exact_citation_service.build_exact_citation_label(source, chunk)
            chunk["citation_anchor"] = orb_exact_citation_service.build_citation_anchor(
                source_id,
                int(chunk.get("chunk_index") or 0),
                page=_text(chunk.get("page")) or None,
                section=_text(chunk.get("section")) or None,
                paragraph=_text(chunk.get("paragraph_number")) or None,
            )
            text_body = _text(chunk.get("text"))
            chunk["exact_excerpt"] = text_body[:500]
            chunk["normalized_excerpt"] = re.sub(r"\s+", " ", chunk["exact_excerpt"]).strip()
            rebuilt.append(chunk)
        if rebuilt:
            self.upsert_chunks(source_id, rebuilt)
        return {
            "rebuilt": len(rebuilt),
            "citation_health": self.get_source_citation_health(source_id),
        }


    def list_curated_official_guidance(self) -> list[dict[str, Any]]:
        """Read-only curated official guidance metadata (links only — no statutory text copy)."""
        path = REPO_ROOT / "data" / "orb_official_guidance_curated.json"
        if not path.is_file():
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, list):
                return []
            return [
                {
                    **entry,
                    "source_kind": "official_guidance",
                    "metadata_only": True,
                    "governance_status": entry.get("approval_status", "approved"),
                    "official_source": True,
                }
                for entry in data
                if isinstance(entry, dict)
            ]
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not load curated official guidance: %s", exc)
            return []

    def has_approved_home_or_provider_policy(
        self,
        *,
        viewer_user_id: int | None = None,
        topic: str | None = None,
    ) -> bool:
        for source in self.list_sources(viewer_user_id=viewer_user_id):
            if _text(source.get("governance_status")) != "approved":
                continue
            family = _text(source.get("document_family"))
            if family in {"provider_policy", "internal_guidance"}:
                return True
            meta = source.get("metadata") or {}
            if _text(meta.get("source_kind")) in {"home_document", "provider_policy", "local_protocol"}:
                return True
        return False


orb_knowledge_library_service = OrbKnowledgeLibraryService()

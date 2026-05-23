"""Document ingestion for standalone ORB Knowledge Library — no OS document store."""

from __future__ import annotations

import logging
import re
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any

from services.orb_care_synonym_service import orb_care_synonym_service
from services.orb_embedding_service import orb_embedding_service
from services.orb_exact_citation_service import orb_exact_citation_service
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_official_source_registry_service import orb_official_source_registry_service

logger = logging.getLogger("indicare.orb_document_ingestion")

CHUNK_TARGET_CHARS = 4000
CHUNK_MIN_CHARS = 2500
CHUNK_OVERLAP_CHARS = 900

UNSUPPORTED_FILE_MESSAGE = (
    "Unsupported file type for standalone ORB ingestion. "
    "Supported types: .txt, .md, .pdf, .docx"
)


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbDocumentIngestionService:
    """Extract, chunk and index standalone knowledge documents."""

    def ingest_text(
        self,
        title: str,
        text: str,
        source_type: str | None = None,
        *,
        metadata: dict[str, Any] | None = None,
        source_label: str | None = None,
        description: str | None = None,
        origin: str = "user_uploaded",
        source_fields: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalised = self.normalise_text(text)
        detected_type = source_type or self.detect_source_type(title, normalised)
        extra = dict(source_fields or {})
        family_key = extra.pop("family_key", None) or orb_official_source_registry_service.detect_source_family(
            title, normalised
        )
        family_meta = (
            orb_official_source_registry_service.default_metadata_for_family(family_key)
            if family_key
            else {}
        )
        source_integrity = extra.get("source_integrity") or (
            "user_pasted" if origin == "user_uploaded" else family_meta.get("source_integrity", "full_document")
        )
        payload = {
            "title": title,
            "description": description or normalised[:500],
            "source_type": detected_type,
            "status": "draft",
            "origin": origin,
            "source_label": source_label or title,
            "reliability": "user_uploaded" if origin == "user_uploaded" else "built_in",
            "metadata": metadata or {},
            "source_integrity": source_integrity,
            "document_family": extra.get("document_family") or family_meta.get("document_family"),
            "publisher": extra.get("publisher") or family_meta.get("publisher"),
            "official_source": extra.get("official_source", family_meta.get("official_source", False)),
            "confidence_level": extra.get("confidence_level") or family_meta.get("confidence_level", "medium"),
            "citation_style": extra.get("citation_style") or family_meta.get("citation_style"),
            "jurisdiction": extra.get("jurisdiction") or family_meta.get("jurisdiction"),
            "governance_status": extra.get("governance_status")
            or ("approved" if extra.get("approve_now") else "draft"),
            "source_url": extra.get("source_url"),
            "canonical_url": extra.get("canonical_url"),
            "source_version": extra.get("source_version"),
            "document_version_label": extra.get("document_version_label"),
            "review_due_at": extra.get("review_due_at"),
            "expires_at": extra.get("expires_at"),
            "copyright_note": extra.get("copyright_note"),
        }
        if extra.get("approve_now"):
            payload["approved_at"] = extra.get("approved_at")
            payload["approved_by"] = extra.get("approved_by")
        source = orb_knowledge_library_service.create_source(payload)
        chunks = self.chunk_text(
            normalised,
            source_title=title,
            source_type=detected_type,
            source_id=source["id"],
        )
        chunk_records = []
        for chunk in chunks:
            enriched = self._enrich_chunk(chunk, source_type=detected_type, source=source)
            chunk_records.append(self._chunk_record_from_enriched(source["id"], detected_type, enriched))
        orb_knowledge_library_service.upsert_chunks(source["id"], chunk_records)
        source["status"] = "indexed"
        orb_knowledge_library_service.update_source(source["id"], {"status": "indexed"})
        citation_health = orb_knowledge_library_service.get_source_citation_health(source["id"])
        return {
            "source": orb_knowledge_library_service.get_source(source["id"]) or source,
            "chunk_count": len(chunk_records),
            "chunks": chunk_records,
            "citation_health": citation_health,
        }

    def _chunk_record_from_enriched(
        self,
        source_id: str,
        source_type: str,
        enriched: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "id": f"{source_id}-chunk-{enriched['chunk_index']}",
            "source_id": source_id,
            "chunk_index": enriched["chunk_index"],
            "title": enriched.get("title"),
            "text": enriched["text"],
            "heading_path": enriched.get("heading_path") or [],
            "heading": enriched.get("heading"),
            "section": enriched.get("section"),
            "subsection": enriched.get("subsection"),
            "page": enriched.get("page"),
            "paragraph_number": enriched.get("paragraph_number"),
            "line_start": enriched.get("line_start"),
            "line_end": enriched.get("line_end"),
            "exact_excerpt": enriched.get("exact_excerpt"),
            "normalized_excerpt": enriched.get("normalized_excerpt"),
            "citation_anchor": enriched.get("citation_anchor"),
            "token_estimate": enriched.get("token_estimate"),
            "citation_label": enriched.get("citation_label"),
            "source_type": source_type,
            "source_url": enriched.get("source_url"),
            "source_version": enriched.get("source_version"),
            "official_source": enriched.get("official_source", False),
            "source_integrity": enriched.get("source_integrity"),
            "governance_status": enriched.get("governance_status"),
            "confidence_level": enriched.get("confidence_level"),
            "keywords": enriched.get("keywords") or [],
            "semantic_keywords": enriched.get("semantic_keywords") or [],
            "canonical_terms": enriched.get("canonical_terms") or [],
            "confidence_score": enriched.get("confidence_score"),
            "embedding": enriched.get("embedding"),
            "embedding_model": enriched.get("embedding_model"),
            "embedding_created_at": enriched.get("embedding_created_at"),
            "metadata": enriched.get("metadata") or {},
        }

    def ingest_file(
        self,
        file_name: str,
        content_bytes: bytes,
        content_type: str | None = None,
        *,
        source_type: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        text, extraction_method = self.extract_text_from_file(file_name, content_bytes, content_type)
        if not text:
            raise ValueError(
                extraction_method if extraction_method.startswith("Unsupported") else UNSUPPORTED_FILE_MESSAGE
            )
        title = Path(file_name).stem.replace("_", " ").replace("-", " ").strip() or "Uploaded document"
        meta = dict(metadata or {})
        meta["extraction_method"] = extraction_method
        meta["file_name"] = file_name
        return self.ingest_text(
            title,
            text,
            source_type,
            metadata=meta,
            origin="user_uploaded",
        )

    def extract_text_from_file(
        self,
        file_name: str,
        content_bytes: bytes,
        content_type: str | None = None,
    ) -> tuple[str, str]:
        suffix = Path(file_name).suffix.lower()
        mime = _text(content_type).lower()

        if suffix in {".txt", ".md"} or mime in {"text/plain", "text/markdown"}:
            return self.normalise_text(self._decode_bytes(content_bytes)), "text_decoded"

        if suffix == ".pdf" or mime == "application/pdf":
            return self._extract_pdf(content_bytes)

        if suffix == ".docx" or mime in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }:
            return self._extract_docx(content_bytes)

        return "", UNSUPPORTED_FILE_MESSAGE

    def _decode_bytes(self, data: bytes) -> str:
        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                return data.decode(encoding, errors="ignore")
            except Exception:
                continue
        return ""

    def _extract_pdf(self, data: bytes) -> tuple[str, str]:
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(data))
            pages: list[str] = []
            for page in reader.pages:
                pages.append(_text(page.extract_text()))
            text = self.normalise_text("\n\n".join(p for p in pages if p))
            if text:
                return text, "pdf_pypdf"
        except Exception:
            logger.debug("pypdf extraction failed", exc_info=True)

        decoded = self._decode_bytes(data)
        fragments = re.findall(r"[A-Za-z0-9 ,.;:'\"!?()/%\-]{24,}", decoded)
        if fragments:
            return self.normalise_text("\n".join(fragments[:800])), "pdf_lightweight_fallback"
        return "", "Unsupported PDF: could not extract readable text"

    def _extract_docx(self, data: bytes) -> tuple[str, str]:
        try:
            from docx import Document

            document = Document(BytesIO(data))
            paragraphs = [_text(p.text) for p in document.paragraphs if _text(p.text)]
            text = self.normalise_text("\n\n".join(paragraphs))
            if text:
                return text, "docx_python_docx"
        except Exception:
            logger.debug("docx extraction failed", exc_info=True)
        return "", "Unsupported DOCX: could not extract readable text"

    def normalise_text(self, text: str) -> str:
        cleaned = _text(text)
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    def chunk_text(
        self,
        text: str,
        *,
        source_title: str,
        source_type: str | None = None,
        source_id: str | None = None,
    ) -> list[dict[str, Any]]:
        normalised = self.normalise_text(text)
        if not normalised:
            return []

        sections = self._split_sections_with_headings(normalised)
        chunks: list[dict[str, Any]] = []
        buffer = ""
        current_section: str | None = None
        current_heading_path: list[str] = []
        current_heading: str | None = None
        paragraph_counter = 0
        chunk_index = 0

        def flush_buffer() -> None:
            nonlocal buffer, chunk_index, current_section, paragraph_counter
            if not buffer.strip():
                buffer = ""
                return
            section = current_section
            para_num = str(paragraph_counter) if paragraph_counter else None
            citation = self.build_citation_label(
                source_title,
                section=current_heading or section,
                heading_path=current_heading_path,
            )
            chunk_body = {
                "chunk_index": chunk_index,
                "title": section or current_heading or source_title,
                "text": buffer.strip(),
                "heading_path": list(current_heading_path),
                "heading": current_heading,
                "section": section,
                "subsection": current_heading_path[-1] if len(current_heading_path) > 1 else None,
                "page": None,
                "paragraph_number": para_num,
                "token_estimate": self.estimate_tokens(buffer),
                "citation_label": citation,
                "keywords": self.build_keywords(buffer),
                "metadata": {"source_type": source_type},
            }
            if source_id:
                chunk_body["citation_anchor"] = orb_exact_citation_service.build_citation_anchor(
                    source_id,
                    chunk_index,
                    section=section,
                    paragraph=para_num,
                )
            chunks.append(chunk_body)
            chunk_index += 1
            overlap = buffer[-CHUNK_OVERLAP_CHARS:] if len(buffer) > CHUNK_OVERLAP_CHARS else buffer
            buffer = overlap

        for section_title, section_body, heading_path in sections:
            if current_section and section_title != current_section and buffer.strip():
                flush_buffer()
            current_section = section_title
            current_heading_path = list(heading_path)
            current_heading = heading_path[-1] if heading_path else section_title
            paragraphs = [p.strip() for p in section_body.split("\n\n") if p.strip()]
            for paragraph in paragraphs:
                paragraph_counter += 1
                candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
                if len(candidate) <= CHUNK_TARGET_CHARS:
                    buffer = candidate
                    continue
                if len(buffer) >= CHUNK_MIN_CHARS:
                    flush_buffer()
                while len(paragraph) > CHUNK_TARGET_CHARS:
                    piece = paragraph[:CHUNK_TARGET_CHARS]
                    buffer = piece
                    flush_buffer()
                    paragraph = paragraph[CHUNK_TARGET_CHARS - CHUNK_OVERLAP_CHARS :]
                buffer = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph

        if buffer.strip():
            flush_buffer()

        if not chunks:
            fallback = {
                "chunk_index": 0,
                "title": source_title,
                "text": normalised[:CHUNK_TARGET_CHARS],
                "heading_path": [],
                "section": None,
                "page": None,
                "paragraph_number": "1",
                "token_estimate": self.estimate_tokens(normalised),
                "citation_label": self.build_citation_label(source_title),
                "keywords": self.build_keywords(normalised),
                "metadata": {"source_type": source_type},
            }
            if source_id:
                fallback["citation_anchor"] = orb_exact_citation_service.build_citation_anchor(
                    source_id, 0
                )
            chunks.append(fallback)
        return [self._enrich_chunk(c, source_type=source_type) for c in chunks]

    def _enrich_chunk(
        self,
        chunk: dict[str, Any],
        *,
        source_type: str | None,
        source: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        text = _text(chunk.get("text"))
        canonical = orb_care_synonym_service.canonical_terms_for_text(text)
        semantic_keywords = orb_care_synonym_service.semantic_keywords_for_text(text)
        keywords = list(chunk.get("keywords") or [])
        for kw in semantic_keywords:
            if kw not in keywords:
                keywords.append(kw)
        metadata = dict(chunk.get("metadata") or {})
        metadata["canonical_terms"] = canonical
        confidence = 0.7
        if source_type in {"regulatory_framework", "safeguarding_principles"}:
            confidence = 0.85
        if source_type == "product_context":
            confidence = 0.75

        embedding = None
        embedding_model = None
        embedding_created_at = None
        if orb_embedding_service.is_available():
            try:
                embed_result = orb_embedding_service.embed_text(text[:8000])
                if embed_result.get("available") and embed_result.get("embedding"):
                    embedding = embed_result["embedding"]
                    embedding_model = embed_result.get("model")
                    embedding_created_at = None
            except Exception:
                logger.debug("chunk embedding skipped", exc_info=True)

        text_body = _text(chunk.get("text"))
        exact_excerpt = text_body[:500] if text_body else ""
        normalized_excerpt = re.sub(r"\s+", " ", exact_excerpt).strip()

        enriched = {
            **chunk,
            "keywords": keywords[:32],
            "semantic_keywords": semantic_keywords,
            "canonical_terms": canonical,
            "confidence_score": confidence,
            "embedding": embedding,
            "embedding_model": embedding_model,
            "embedding_created_at": embedding_created_at,
            "exact_excerpt": exact_excerpt,
            "normalized_excerpt": normalized_excerpt,
            "metadata": metadata,
        }
        if source:
            enriched["source_url"] = source.get("source_url")
            enriched["source_version"] = source.get("source_version")
            enriched["official_source"] = bool(source.get("official_source"))
            enriched["source_integrity"] = source.get("source_integrity")
            enriched["governance_status"] = source.get("governance_status")
            enriched["confidence_level"] = source.get("confidence_level")
            if not enriched.get("citation_label") and source.get("id"):
                enriched["citation_label"] = orb_exact_citation_service.build_exact_citation_label(
                    source, enriched
                )
        return enriched

    def _split_sections_with_headings(self, text: str) -> list[tuple[str | None, str, list[str]]]:
        lines = text.split("\n")
        sections: list[tuple[str | None, str, list[str]]] = []
        current_title: str | None = None
        heading_path: list[str] = []
        current_lines: list[str] = []

        def flush() -> None:
            nonlocal current_title, current_lines, heading_path
            if current_lines:
                sections.append((current_title, "\n".join(current_lines), list(heading_path)))
            current_lines = []

        for line in lines:
            heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading_match:
                flush()
                level = len(heading_match.group(1))
                title = heading_match.group(2).strip()
                heading_path = heading_path[: level - 1] + [title]
                current_title = title
                continue
            if line.isupper() and len(line) < 80 and len(line.split()) <= 10:
                flush()
                current_title = line.strip()
                heading_path = [current_title]
                continue
            page_match = re.match(r"^\[?Page\s+(\d+)\]?$", line, re.I)
            if page_match:
                metadata_line = f"__page__:{page_match.group(1)}"
                current_lines.append(metadata_line)
                continue
            current_lines.append(line)
        flush()
        if not sections:
            return [(None, text, [])]
        return sections

    def _split_sections(self, text: str) -> list[tuple[str | None, str]]:
        return [(title, body) for title, body, _ in self._split_sections_with_headings(text)]

    def detect_source_type(self, title: str, text: str) -> str:
        combined = f"{title} {text[:2000]}".lower()
        if any(term in combined for term in ("indicare", "orb care companion", "care hub", "intelligence spine")):
            return "product_context"
        if any(term in combined for term in ("ofsted", "sccif", "quality standard", "regulation")):
            return "regulatory_framework"
        if any(term in combined for term in ("safeguarding", "working together", "child protection")):
            return "safeguarding_principles"
        if any(term in combined for term in ("daily note", "recording", "incident report", "log entry")):
            return "recording_quality"
        if any(term in combined for term in ("trauma", "therapeutic", "behaviour", "restorative")):
            return "therapeutic_practice"
        if any(term in combined for term in ("policy", "procedure", "missing from care")):
            return "policy"
        return "user_uploaded"

    def build_keywords(self, text: str) -> list[str]:
        tokens = re.findall(r"[a-z]{4,}", text.lower())
        seen: set[str] = set()
        keywords: list[str] = []
        for token in tokens:
            if token in seen:
                continue
            seen.add(token)
            keywords.append(token)
            if len(keywords) >= 24:
                break
        return keywords

    def estimate_tokens(self, text: str) -> int:
        return max(1, len(_text(text)) // 4)

    def build_citation_label(
        self,
        source_title: str,
        *,
        section: str | None = None,
        page: str | None = None,
        heading_path: list[str] | None = None,
    ) -> str:
        parts = [_text(source_title) or "Knowledge source"]
        if heading_path:
            parts.append(f"Section: {' > '.join(h for h in heading_path if h)}")
        elif section:
            parts.append(f"Section: {section}")
        if page:
            parts.append(f"p. {page}")
        return " — ".join(parts)

    def ingest_official_source(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Import official/provider source with governance metadata."""
        family_key = payload.get("family_key")
        family_meta = (
            orb_official_source_registry_service.default_metadata_for_family(family_key)
            if family_key
            else {}
        )
        source_fields = {
            "document_family": payload.get("document_family") or family_meta.get("document_family"),
            "publisher": payload.get("publisher") or family_meta.get("publisher"),
            "source_url": payload.get("source_url"),
            "canonical_url": payload.get("canonical_url"),
            "source_version": payload.get("source_version"),
            "document_version_label": payload.get("document_version_label"),
            "review_due_at": payload.get("review_due_at"),
            "expires_at": payload.get("expires_at"),
            "official_source": payload.get("official_source", family_meta.get("official_source", False)),
            "source_integrity": payload.get("source_integrity", "full_document"),
            "approve_now": payload.get("approve_now", False),
            "governance_status": "approved" if payload.get("approve_now") else "draft",
            "family_key": family_key,
        }
        return self.ingest_text(
            payload["title"],
            payload["text"],
            payload.get("source_type"),
            metadata=payload.get("metadata"),
            source_label=payload.get("source_label"),
            description=payload.get("description"),
            origin="admin_added",
            source_fields=source_fields,
        )


orb_document_ingestion_service = OrbDocumentIngestionService()

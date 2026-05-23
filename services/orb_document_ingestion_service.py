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
from services.orb_knowledge_library_service import orb_knowledge_library_service

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
    ) -> dict[str, Any]:
        normalised = self.normalise_text(text)
        detected_type = source_type or self.detect_source_type(title, normalised)
        source = orb_knowledge_library_service.create_source(
            {
                "title": title,
                "description": description or normalised[:500],
                "source_type": detected_type,
                "status": "draft",
                "origin": origin,
                "source_label": source_label or title,
                "reliability": "user_uploaded" if origin == "user_uploaded" else "built_in",
                "metadata": metadata or {},
            }
        )
        chunks = self.chunk_text(normalised, source_title=title, source_type=detected_type)
        chunk_records = []
        for chunk in chunks:
            enriched = self._enrich_chunk(chunk, source_type=detected_type)
            chunk_records.append(
                {
                    "id": f"{source['id']}-chunk-{chunk['chunk_index']}",
                    "source_id": source["id"],
                    "chunk_index": chunk["chunk_index"],
                    "title": chunk.get("title"),
                    "text": chunk["text"],
                    "section": chunk.get("section"),
                    "page": chunk.get("page"),
                    "token_estimate": chunk.get("token_estimate"),
                    "citation_label": chunk.get("citation_label"),
                    "source_type": detected_type,
                    "keywords": enriched.get("keywords") or [],
                    "semantic_keywords": enriched.get("semantic_keywords") or [],
                    "canonical_terms": enriched.get("canonical_terms") or [],
                    "confidence_score": enriched.get("confidence_score"),
                    "embedding": enriched.get("embedding"),
                    "embedding_model": enriched.get("embedding_model"),
                    "embedding_created_at": enriched.get("embedding_created_at"),
                    "metadata": enriched.get("metadata") or {},
                }
            )
        orb_knowledge_library_service.upsert_chunks(source["id"], chunk_records)
        source["status"] = "indexed"
        orb_knowledge_library_service.update_source(source["id"], {"status": "indexed"})
        return {
            "source": orb_knowledge_library_service.get_source(source["id"]) or source,
            "chunk_count": len(chunk_records),
            "chunks": chunk_records,
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
    ) -> list[dict[str, Any]]:
        normalised = self.normalise_text(text)
        if not normalised:
            return []

        sections = self._split_sections(normalised)
        chunks: list[dict[str, Any]] = []
        buffer = ""
        current_section: str | None = None
        chunk_index = 0

        def flush_buffer() -> None:
            nonlocal buffer, chunk_index, current_section
            if not buffer.strip():
                buffer = ""
                return
            section = current_section
            citation = self.build_citation_label(source_title, section=section)
            chunk_body = {
                "chunk_index": chunk_index,
                "title": section or source_title,
                "text": buffer.strip(),
                "section": section,
                "page": None,
                "token_estimate": self.estimate_tokens(buffer),
                "citation_label": citation,
                "keywords": self.build_keywords(buffer),
                "metadata": {"source_type": source_type},
            }
            chunks.append(self._enrich_chunk(chunk_body, source_type=source_type))
            chunk_index += 1
            overlap = buffer[-CHUNK_OVERLAP_CHARS:] if len(buffer) > CHUNK_OVERLAP_CHARS else buffer
            buffer = overlap

        for section_title, section_body in sections:
            current_section = section_title
            paragraphs = [p.strip() for p in section_body.split("\n\n") if p.strip()]
            for paragraph in paragraphs:
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
                "section": None,
                "page": None,
                "token_estimate": self.estimate_tokens(normalised),
                "citation_label": self.build_citation_label(source_title),
                "keywords": self.build_keywords(normalised),
                "metadata": {"source_type": source_type},
            }
            chunks.append(self._enrich_chunk(fallback, source_type=source_type))
        return chunks

    def _enrich_chunk(self, chunk: dict[str, Any], *, source_type: str | None) -> dict[str, Any]:
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

        return {
            **chunk,
            "keywords": keywords[:32],
            "semantic_keywords": semantic_keywords,
            "canonical_terms": canonical,
            "confidence_score": confidence,
            "embedding": embedding,
            "embedding_model": embedding_model,
            "embedding_created_at": embedding_created_at,
            "metadata": metadata,
        }

    def _split_sections(self, text: str) -> list[tuple[str | None, str]]:
        lines = text.split("\n")
        sections: list[tuple[str | None, str]] = []
        current_title: str | None = None
        current_lines: list[str] = []

        def flush() -> None:
            nonlocal current_title, current_lines
            if current_lines:
                sections.append((current_title, "\n".join(current_lines)))
            current_lines = []

        for line in lines:
            if re.match(r"^#{1,3}\s+", line) or (line.isupper() and len(line) < 80 and len(line.split()) <= 10):
                flush()
                current_title = re.sub(r"^#+\s*", "", line).strip()
                continue
            current_lines.append(line)
        flush()
        if not sections:
            return [(None, text)]
        return sections

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
    ) -> str:
        parts = [_text(source_title) or "Knowledge source"]
        if section:
            parts.append(section)
        if page:
            parts.append(f"p. {page}")
        return " — ".join(parts)


orb_document_ingestion_service = OrbDocumentIngestionService()

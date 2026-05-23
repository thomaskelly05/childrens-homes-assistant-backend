"""Exact passage-level citations for standalone ORB Knowledge Library."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from services.orb_official_source_registry_service import orb_official_source_registry_service

SUMMARY_ONLY_WARNING = "This is a built-in summary, not the full official document."
EXPIRED_WARNING = "This source may need review."
SECTION_UNAVAILABLE = "section/page not available"


def _text(value: Any) -> str:
    return str(value or "").strip()


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


class OrbExactCitationService:
    """Builds exact citation labels and anchors from source/chunk metadata."""

    def build_citation_anchor(
        self,
        source_id: str,
        chunk_index: int,
        *,
        page: str | None = None,
        section: str | None = None,
        paragraph: str | None = None,
    ) -> str:
        parts = [f"src:{source_id}", f"chunk:{chunk_index}"]
        if page:
            parts.append(f"page:{page}")
        if section:
            parts.append(f"section:{section.replace(' ', '_')[:80]}")
        if paragraph:
            parts.append(f"para:{paragraph}")
        return "|".join(parts)

    def build_excerpt(self, chunk: dict[str, Any], *, max_chars: int = 500) -> str:
        excerpt = _text(chunk.get("exact_excerpt")) or _text(chunk.get("text"))
        if len(excerpt) <= max_chars:
            return excerpt
        return excerpt[: max_chars - 3].rstrip() + "..."

    def build_exact_citation_label(self, source: dict[str, Any], chunk: dict[str, Any]) -> str:
        title = _text(source.get("title")) or _text(chunk.get("title")) or "Knowledge source"
        parts: list[str] = [title]

        heading_path = chunk.get("heading_path") or []
        if isinstance(heading_path, list) and heading_path:
            parts.append(f"Section: {' > '.join(_text(h) for h in heading_path if _text(h))}")
        elif _text(chunk.get("section")):
            parts.append(f"Section: {_text(chunk.get('section'))}")
        elif _text(chunk.get("heading")):
            parts.append(f"Section: {_text(chunk.get('heading'))}")

        page = _text(chunk.get("page"))
        if page:
            parts.append(f"p. {page}")
        else:
            para = _text(chunk.get("paragraph_number"))
            if para:
                parts.append(f"para. {para}")
            elif not (_text(chunk.get("section")) or heading_path):
                parts.append(SECTION_UNAVAILABLE)

        publisher = _text(source.get("publisher"))
        version = _text(source.get("source_version") or source.get("document_version_label"))
        if publisher:
            parts.append(publisher)
        if version:
            parts.append(f"source version {version}")

        integrity = _text(source.get("source_integrity"))
        if integrity == "summary_only":
            parts.append("Built-in summary")

        return " — ".join(p for p in parts if p)

    def format_source_reference(self, source: dict[str, Any], chunk: dict[str, Any]) -> str:
        label = self.build_exact_citation_label(source, chunk)
        url = _text(source.get("source_url") or source.get("canonical_url") or chunk.get("source_url"))
        if url:
            return f"{label} ({url})"
        return label

    def source_warning(self, source: dict[str, Any]) -> str | None:
        warnings: list[str] = []
        integrity_warn = orb_official_source_registry_service.source_warning_for_integrity(source)
        if integrity_warn:
            warnings.append(integrity_warn)

        now = datetime.now(timezone.utc)
        status = _text(source.get("governance_status"))
        if status in {"needs_review", "expired"}:
            warnings.append(EXPIRED_WARNING)

        for field in ("expires_at", "review_due_at"):
            dt = _parse_dt(source.get(field))
            if dt and dt < now:
                if EXPIRED_WARNING not in warnings:
                    warnings.append(EXPIRED_WARNING)
                break

        if not warnings:
            return None
        return " ".join(dict.fromkeys(warnings))

    def citation_confidence(self, source: dict[str, Any], chunk: dict[str, Any]) -> str:
        level = _text(source.get("confidence_level")) or _text(chunk.get("confidence_level"))
        if level:
            return level
        if source.get("official_source"):
            return "official"
        score = chunk.get("confidence_score")
        if score is not None and float(score) >= 0.85:
            return "high"
        return "medium"

    def build_citation(
        self,
        chunk: dict[str, Any],
        source: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        source = source or {}
        exact_label = self.build_exact_citation_label(source, chunk)
        anchor = _text(chunk.get("citation_anchor")) or self.build_citation_anchor(
            _text(chunk.get("source_id") or source.get("id")),
            int(chunk.get("chunk_index") or 0),
            page=_text(chunk.get("page")) or None,
            section=_text(chunk.get("section")) or None,
            paragraph=_text(chunk.get("paragraph_number")) or None,
        )
        warning = self.source_warning(source)
        excerpt = self.build_excerpt(chunk)
        heading_path = chunk.get("heading_path") or []
        if not isinstance(heading_path, list):
            heading_path = []

        return {
            "id": anchor,
            "label": _text(chunk.get("citation_label")) or exact_label,
            "exact_citation": exact_label,
            "citation_anchor": anchor,
            "heading_path": heading_path,
            "heading": _text(chunk.get("heading")) or None,
            "section": _text(chunk.get("section")) or None,
            "subsection": _text(chunk.get("subsection")) or None,
            "page": _text(chunk.get("page")) or None,
            "paragraph_number": _text(chunk.get("paragraph_number")) or None,
            "source_url": _text(source.get("source_url") or chunk.get("source_url")) or None,
            "source_version": _text(source.get("source_version") or chunk.get("source_version")) or None,
            "official_source": bool(source.get("official_source") or chunk.get("official_source")),
            "source_integrity": _text(source.get("source_integrity")) or _text(chunk.get("source_integrity")) or None,
            "confidence_level": self.citation_confidence(source, chunk),
            "governance_status": _text(source.get("governance_status")) or _text(chunk.get("governance_status")) or None,
            "warning": warning,
            "excerpt": excerpt,
            "quote_allowed": _text(source.get("source_integrity")) not in {"summary_only", "unknown"},
            "source_id": source.get("id") or chunk.get("source_id"),
            "chunk_index": chunk.get("chunk_index"),
            "document_chunk": True,
            "live_retrieved": False,
        }

    def validate_citation(self, citation: dict[str, Any]) -> bool:
        return bool(_text(citation.get("exact_citation") or citation.get("label")))

    def merge_duplicate_citations(self, citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        merged: list[dict[str, Any]] = []
        for item in citations:
            key = _text(item.get("citation_anchor") or item.get("id")) or (
                f"{item.get('source_id')}|{item.get('chunk_index')}|{item.get('exact_citation')}"
            )
            if key in seen:
                continue
            seen.add(key)
            merged.append(item)
        return merged

    def citations_for_search_results(
        self,
        results: list[dict[str, Any]],
        *,
        source_by_id: dict[str, dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        source_by_id = source_by_id or {}
        citations: list[dict[str, Any]] = []
        for result in results:
            source = source_by_id.get(result.get("source_id") or "") or {
                "id": result.get("source_id"),
                "title": result.get("source_title"),
                "source_url": (result.get("metadata") or {}).get("source_url"),
                "source_version": (result.get("metadata") or {}).get("source_version"),
                "official_source": result.get("official_source"),
                "confidence_level": result.get("source_confidence"),
                "governance_status": result.get("governance_status"),
                "source_integrity": (result.get("metadata") or {}).get("source_integrity"),
            }
            chunk = {
                "source_id": result.get("source_id"),
                "chunk_index": result.get("chunk_index"),
                "title": result.get("source_title"),
                "text": result.get("text"),
                "section": result.get("section"),
                "page": result.get("page"),
                "heading_path": result.get("heading_path"),
                "heading": result.get("heading"),
                "paragraph_number": result.get("paragraph_number"),
                "citation_label": result.get("citation_label"),
                "citation_anchor": result.get("citation_anchor"),
                "exact_excerpt": result.get("exact_excerpt"),
            }
            built = self.build_citation(chunk, source)
            built["type"] = f"document_chunk:{_text(result.get('source_type')) or 'user_uploaded'}"
            built["basis"] = built.get("exact_citation")
            built["note"] = built.get("excerpt")
            built["retrieval_strategy"] = result.get("retrieval_strategy")
            built["semantic_score"] = result.get("semantic_score")
            built["hybrid_score"] = result.get("hybrid_score")
            built["keyword_score"] = result.get("keyword_score")
            if result.get("warning") and not built.get("warning"):
                built["warning"] = result.get("warning")
            citations.append(built)
        return self.merge_duplicate_citations(citations)


orb_exact_citation_service = OrbExactCitationService()

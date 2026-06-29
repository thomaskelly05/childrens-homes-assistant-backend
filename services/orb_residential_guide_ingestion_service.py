"""Governed static chunks for the DfE Children's Homes Regulations Guide.

This service is offline and deterministic. It reads the committed chunk file,
does not fetch or scrape sources at runtime, and returns capped source bundles
for future ORB grounding tests.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
GUIDE_CHUNKS_PATH = (
    REPO_ROOT
    / "data"
    / "orb_residential_ingestion"
    / "guide_to_childrens_homes_regulations_chunks.json"
)

GUIDE_SOURCE_ID = "dfe_childrens_homes_regulations_guide"
EXCLUDED_FULL_TEXT_SOURCE_IDS = {
    "childrens_homes_regulations_2015",
    "ofsted_sccif_childrens_homes",
}
MAX_GUIDE_CHUNKS_PER_RETRIEVAL = 3

QUALITY_STANDARD_NAMES = (
    "Quality and purpose of care",
    "Children's views, wishes and feelings",
    "Education",
    "Enjoyment and achievement",
    "Health and wellbeing",
    "Positive relationships",
    "Protection of children",
    "Leadership and management",
    "Care planning",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


class OrbResidentialGuideIngestionService:
    """Read-only retrieval over committed Guide chunks."""

    def __init__(self, path: Path = GUIDE_CHUNKS_PATH) -> None:
        self.path = path
        self._payload: dict[str, Any] | None = None

    def _load(self) -> dict[str, Any]:
        if self._payload is None:
            self._payload = json.loads(self.path.read_text(encoding="utf-8"))
        return self._payload

    def source_metadata(self) -> dict[str, Any]:
        return dict(self._load()["source"])

    def quality_standards(self) -> list[dict[str, Any]]:
        return list(self._load()["quality_standards"])

    def retrieval_policy(self) -> dict[str, Any]:
        return dict(self._load()["retrieval_policy"])

    def excluded_sources(self) -> dict[str, bool]:
        return dict(self._load()["excluded_sources"])

    def chunks(self) -> list[dict[str, Any]]:
        return [dict(chunk) for chunk in self._load()["chunks"]]

    def chunk_count(self) -> int:
        return len(self._load()["chunks"])

    def full_text_source_ids(self) -> set[str]:
        return {chunk["source_id"] for chunk in self.chunks()}

    def runtime_scraping_or_downloading_performed(self) -> bool:
        policy = self.retrieval_policy()
        source = self.source_metadata()
        return bool(
            policy.get("runtime_scraping_or_downloading")
            or source.get("runtime_fetch_required")
        )

    def exact_citation_allowed(self, chunk: dict[str, Any]) -> bool:
        label = _text(chunk.get("citation_label"))
        has_official_reference = bool(_text(chunk.get("official_paragraph_reference")))
        has_internal_label = "internal chunk" in label.lower()
        return bool(
            _lower(chunk.get("source_id")) == GUIDE_SOURCE_ID
            and _lower(chunk.get("basis_type")) == "exact"
            and _lower(chunk.get("source_integrity")) == "full_document"
            and chunk.get("quote_allowed") is True
            and chunk.get("source_text_exact") is True
            and _text(chunk.get("quote_basis"))
            and _text(chunk.get("exact_excerpt") or chunk.get("text"))
            and label
            and (has_official_reference or has_internal_label)
        )

    def metadata_summary_can_be_exact_citation(self, summary: dict[str, Any]) -> bool:
        return self.exact_citation_allowed(summary)

    def retrieve_chunks(
        self,
        *,
        query: str = "",
        quality_standard: str | None = None,
        section_heading: str | None = None,
        workflow_domain: str | None = None,
        regulation_reference: str | None = None,
        source_id: str | None = None,
        keywords: list[str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Return a capped, deterministic source bundle."""

        cap = self._cap(limit)
        query_terms = self._terms(query, keywords=keywords)
        quality_filter = _lower(quality_standard)
        section_filter = _lower(section_heading)
        workflow_filter = _lower(workflow_domain)
        regulation_filter = _lower(regulation_reference)
        source_filter = _lower(source_id)

        scored: list[tuple[int, int, dict[str, Any]]] = []
        for chunk in self.chunks():
            if source_filter and source_filter != _lower(chunk.get("source_id")):
                continue
            if source_filter and source_filter != GUIDE_SOURCE_ID:
                continue

            score = 0
            if quality_filter:
                if quality_filter not in {
                    _lower(chunk.get("quality_standard")),
                    _lower(chunk.get("quality_standard_id")),
                }:
                    continue
                score += 80
            if section_filter:
                if section_filter not in _lower(chunk.get("section_heading")):
                    continue
                score += 70
            if workflow_filter:
                workflows = {_lower(item) for item in _as_list(chunk.get("related_workflow_domains"))}
                if workflow_filter not in workflows:
                    continue
                score += 60
            if regulation_filter:
                regs = {_lower(item) for item in _as_list(chunk.get("related_regulations"))}
                if regulation_filter not in regs:
                    continue
                score += 50
            if source_filter:
                score += 40

            haystack = " ".join(
                [
                    _text(chunk.get("section_heading")),
                    _text(chunk.get("paragraph_reference")),
                    _text(chunk.get("quality_standard")),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_regulations"))),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_workflow_domains"))),
                    _text(chunk.get("exact_excerpt")),
                ]
            ).lower()
            if query_terms:
                term_hits = sum(1 for term in query_terms if term in haystack)
                if term_hits == 0 and not any(
                    (quality_filter, section_filter, workflow_filter, regulation_filter, source_filter)
                ):
                    continue
                score += term_hits * 10

            if score or not any(
                (query_terms, quality_filter, section_filter, workflow_filter, regulation_filter, source_filter)
            ):
                scored.append((score, int(chunk.get("retrieval_priority") or 99), chunk))

        scored.sort(key=lambda item: (-item[0], item[1], item[2].get("chunk_index") or 0))
        return [chunk for _, _, chunk in scored[:cap]]

    def source_bundle(
        self,
        *,
        query: str = "",
        quality_standard: str | None = None,
        workflow_domain: str | None = None,
        regulation_reference: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        chunks = self.retrieve_chunks(
            query=query,
            quality_standard=quality_standard,
            workflow_domain=workflow_domain,
            regulation_reference=regulation_reference,
            limit=limit,
        )
        return {
            "source_id": GUIDE_SOURCE_ID,
            "source_title": self.source_metadata()["source_title"],
            "source_integrity": "full_document",
            "exact_chunk_count": len(chunks),
            "maximum_exact_chunks": self._cap(limit),
            "never_send_full_guide_to_llm": True,
            "deterministic_selection_before_llm": True,
            "chunks": chunks,
        }

    def _cap(self, limit: int | None) -> int:
        configured = int(self.retrieval_policy()["maximum_exact_chunks"])
        requested = configured if limit is None else int(limit)
        return max(0, min(requested, configured, MAX_GUIDE_CHUNKS_PER_RETRIEVAL))

    def _terms(self, query: str, *, keywords: list[str] | None) -> list[str]:
        terms = [_lower(term) for term in (keywords or []) if _text(term)]
        terms.extend(
            token
            for token in _lower(query).replace("/", " ").replace("-", " ").split()
            if len(token) >= 4
        )
        seen: set[str] = set()
        ordered: list[str] = []
        for term in terms:
            if term in seen:
                continue
            seen.add(term)
            ordered.append(term)
        return ordered


orb_residential_guide_ingestion_service = OrbResidentialGuideIngestionService()

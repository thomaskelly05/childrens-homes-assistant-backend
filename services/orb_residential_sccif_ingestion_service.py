"""Governed static chunks for the Ofsted SCCIF children's homes inspection framework.

Offline and deterministic. Reads committed chunk and source artefacts only.
Provides capped retrieval support for tests and future wiring; does not fetch,
scrape, or wire into live ORB answers.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
SCCIF_CHUNKS_PATH = (
    REPO_ROOT
    / "data"
    / "orb_residential_ingestion"
    / "ofsted_sccif_childrens_homes_chunks.json"
)
SCCIF_SOURCE_PATH = (
    REPO_ROOT
    / "data"
    / "orb_residential_ingestion"
    / "ofsted_sccif_childrens_homes_source.txt"
)

SCCIF_CHILDREN_HOMES_SOURCE_ID = "ofsted_sccif_childrens_homes"
GUIDE_SOURCE_ID = "dfe_childrens_homes_regulations_guide"
REGULATIONS_2015_SOURCE_ID = "childrens_homes_regulations_2015"
MAX_SCCIF_CHUNKS_PER_RETRIEVAL = 3


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalise_judgement_area(value: Any) -> str:
    text = _lower(value).replace(" ", "_").replace("-", "_")
    aliases = {
        "overall_experiences_and_progress": "overall_experiences_progress",
        "help_and_protection": "helped_and_protected",
        "how_well_children_are_helped_and_protected": "helped_and_protected",
        "effectiveness_of_leaders_and_managers": "leadership_management",
    }
    return aliases.get(text, text)


class OrbResidentialSccifIngestionService:
    """Read-only retrieval over committed SCCIF children's homes chunks."""

    def __init__(
        self,
        path: Path = SCCIF_CHUNKS_PATH,
        source_path: Path = SCCIF_SOURCE_PATH,
    ) -> None:
        self.path = path
        self.source_path = source_path
        self._payload: dict[str, Any] | None = None

    def _load(self) -> dict[str, Any]:
        if self._payload is None:
            self._payload = json.loads(self.path.read_text(encoding="utf-8"))
        return self._payload

    def source_metadata(self) -> dict[str, Any]:
        return dict(self._load()["source"])

    def retrieval_policy(self) -> dict[str, Any]:
        return dict(self._load()["retrieval_policy"])

    def judgement_area_index(self) -> dict[str, Any]:
        return dict(self._load()["judgement_area_index"])

    def evaluation_area_index(self) -> dict[str, Any]:
        return dict(self._load()["evaluation_area_index"])

    def inspection_evidence_theme_index(self) -> dict[str, Any]:
        return dict(self._load()["inspection_evidence_theme_index"])

    def excluded_sources(self) -> dict[str, bool]:
        return dict(self._load()["excluded_sources"])

    def verified_judgement_areas(self) -> list[str]:
        return list(self._load()["verified_judgement_areas"])

    def verified_official_references(self) -> list[str]:
        return list(self._load()["verified_official_references"])

    def chunks(self) -> list[dict[str, Any]]:
        return [dict(chunk) for chunk in self._load()["chunks"]]

    def chunk_count(self) -> int:
        return len(self._load()["chunks"])

    def full_text_source_ids(self) -> set[str]:
        return {SCCIF_CHILDREN_HOMES_SOURCE_ID}

    def runtime_scraping_or_downloading_performed(self) -> bool:
        policy = self.retrieval_policy()
        source = self.source_metadata()
        return bool(
            policy.get("runtime_scraping_or_downloading")
            or source.get("runtime_fetch_required")
        )

    def runtime_answer_wiring_enabled(self) -> bool:
        return bool(self.retrieval_policy().get("runtime_answer_wiring_enabled"))

    def source_artefact_exists(self) -> bool:
        return self.source_path.is_file()

    def exact_citation_allowed(self, chunk: dict[str, Any]) -> bool:
        metadata = chunk.get("generated_metadata") if isinstance(chunk.get("generated_metadata"), dict) else {}
        content_kind = _text(metadata.get("content_kind"))
        judgement_area = _normalise_judgement_area(chunk.get("judgement_area"))
        verified_areas = {_normalise_judgement_area(item) for item in self.verified_judgement_areas()}
        verified_references = {_lower(item) for item in self.verified_official_references()}
        official_reference = _lower(chunk.get("official_reference"))
        label = _text(chunk.get("citation_label"))
        internal_chunk_id = _text(chunk.get("internal_chunk_id"))
        clear_internal_label = (
            internal_chunk_id.startswith("internal:")
            and "internal chunk" in label.lower()
            and internal_chunk_id in label
        )
        return bool(
            _lower(chunk.get("source_id")) == SCCIF_CHILDREN_HOMES_SOURCE_ID
            and chunk.get("quote_allowed") is True
            and chunk.get("source_text_exact") is True
            and content_kind == "framework_text"
            and _text(chunk.get("text"))
            and _text(chunk.get("quote_basis"))
            and (
                (judgement_area in verified_areas and official_reference in verified_references)
                or clear_internal_label
            )
        )

    def retrieve_chunks(
        self,
        *,
        query: str = "",
        source_id: str | None = None,
        judgement_area: str | None = None,
        evaluation_area: str | None = None,
        inspection_evidence_theme: str | None = None,
        section_heading: str | None = None,
        official_reference: str | None = None,
        workflow_domain: str | None = None,
        quality_standard: str | None = None,
        regulation: str | None = None,
        keywords: list[str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        cap = self._cap(limit)
        query_terms = self._terms(query, keywords=keywords)
        source_filter = _lower(source_id)
        judgement_filter = _normalise_judgement_area(judgement_area)
        evaluation_filter = _lower(evaluation_area)
        theme_filter = _lower(inspection_evidence_theme)
        heading_filter = _lower(section_heading)
        reference_filter = _lower(official_reference)
        workflow_filter = _lower(workflow_domain)
        quality_filter = _lower(quality_standard)
        regulation_filter = _lower(regulation)

        scored: list[tuple[int, int, dict[str, Any]]] = []
        for chunk in self.chunks():
            if source_filter and source_filter != _lower(chunk.get("source_id")):
                continue
            if source_filter and source_filter != SCCIF_CHILDREN_HOMES_SOURCE_ID:
                continue

            score = 0
            chunk_judgement = _normalise_judgement_area(chunk.get("judgement_area"))
            if judgement_filter:
                if chunk_judgement != judgement_filter:
                    continue
                score += 100
            if evaluation_filter:
                if evaluation_filter not in _lower(chunk.get("evaluation_area")):
                    continue
                score += 80
            if theme_filter:
                if theme_filter not in _lower(chunk.get("inspection_evidence_theme")):
                    continue
                score += 70
            if heading_filter:
                if heading_filter not in _lower(chunk.get("section_heading")):
                    continue
                score += 60
            if reference_filter:
                if reference_filter not in _lower(chunk.get("official_reference")):
                    continue
                score += 60
            if workflow_filter:
                workflows = {_lower(item) for item in _as_list(chunk.get("related_workflow_domains"))}
                if workflow_filter not in workflows:
                    continue
                score += 50
            if quality_filter:
                standards = {_lower(item) for item in _as_list(chunk.get("related_quality_standards"))}
                if quality_filter not in standards:
                    continue
                score += 45
            if regulation_filter:
                regulations = {_lower(item) for item in _as_list(chunk.get("related_regulations"))}
                if regulation_filter not in " ".join(regulations):
                    continue
                score += 40
            if source_filter:
                score += 30

            haystack = " ".join(
                [
                    _text(chunk.get("section_heading")),
                    _text(chunk.get("evaluation_area")),
                    _text(chunk.get("inspection_evidence_theme")),
                    _text(chunk.get("official_reference")),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_quality_standards"))),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_regulations"))),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_workflow_domains"))),
                    _text(chunk.get("text")),
                ]
            ).lower()
            if query_terms:
                term_hits = sum(1 for term in query_terms if term in haystack)
                if term_hits == 0 and not any(
                    (
                        judgement_filter,
                        evaluation_filter,
                        theme_filter,
                        heading_filter,
                        reference_filter,
                        workflow_filter,
                        quality_filter,
                        regulation_filter,
                        source_filter,
                    )
                ):
                    continue
                score += term_hits * 10

            if score or not any(
                (
                    query_terms,
                    judgement_filter,
                    evaluation_filter,
                    theme_filter,
                    heading_filter,
                    reference_filter,
                    workflow_filter,
                    quality_filter,
                    regulation_filter,
                    source_filter,
                )
            ):
                scored.append((score, int(chunk.get("retrieval_priority") or 99), chunk))

        scored.sort(key=lambda item: (-item[0], item[1], item[2].get("chunk_index") or 0))
        return [chunk for _, _, chunk in scored[:cap]]

    def source_bundle(
        self,
        *,
        query: str = "",
        judgement_area: str | None = None,
        evaluation_area: str | None = None,
        inspection_evidence_theme: str | None = None,
        section_heading: str | None = None,
        official_reference: str | None = None,
        workflow_domain: str | None = None,
        quality_standard: str | None = None,
        regulation: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        chunks = self.retrieve_chunks(
            query=query,
            judgement_area=judgement_area,
            evaluation_area=evaluation_area,
            inspection_evidence_theme=inspection_evidence_theme,
            section_heading=section_heading,
            official_reference=official_reference,
            workflow_domain=workflow_domain,
            quality_standard=quality_standard,
            regulation=regulation,
            limit=limit,
        )
        return {
            "source_id": SCCIF_CHILDREN_HOMES_SOURCE_ID,
            "source_title": self.source_metadata()["source_title"],
            "source_integrity": "full_document",
            "exact_chunk_count": len(chunks),
            "maximum_exact_chunks": self._cap(limit),
            "never_send_full_sccif_to_llm": True,
            "deterministic_selection_before_llm": True,
            "runtime_answer_wiring_enabled": False,
            "chunks": chunks,
        }

    def returns_full_sccif_blob(self, *, limit: int | None = None) -> bool:
        return len(self.retrieve_chunks(limit=limit)) >= self.chunk_count()

    def _cap(self, limit: int | None) -> int:
        configured = int(self.retrieval_policy()["maximum_exact_chunks"])
        requested = configured if limit is None else int(limit)
        return max(0, min(requested, configured, MAX_SCCIF_CHUNKS_PER_RETRIEVAL))

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


orb_residential_sccif_ingestion_service = OrbResidentialSccifIngestionService()

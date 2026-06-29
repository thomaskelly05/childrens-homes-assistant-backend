"""Governed static chunks for The Children's Homes (England) Regulations 2015.

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
REGULATIONS_CHUNKS_PATH = (
    REPO_ROOT
    / "data"
    / "orb_residential_ingestion"
    / "childrens_homes_regulations_2015_chunks.json"
)
REGULATIONS_SOURCE_PATH = (
    REPO_ROOT
    / "data"
    / "orb_residential_ingestion"
    / "childrens_homes_regulations_2015_source.txt"
)

REGULATIONS_2015_SOURCE_ID = "childrens_homes_regulations_2015"
GUIDE_SOURCE_ID = "dfe_childrens_homes_regulations_guide"
SCCIF_SOURCE_ID = "ofsted_sccif_childrens_homes"
MAX_REGULATIONS_CHUNKS_PER_RETRIEVAL = 3


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalise_regulation_number(value: Any) -> str:
    text = _text(value)
    return re.sub(r"^(?:reg(?:ulation)?\.?\s*)", "", text, flags=re.IGNORECASE).strip()


class OrbResidentialRegulations2015IngestionService:
    """Read-only retrieval over committed Regulations 2015 chunks."""

    def __init__(
        self,
        path: Path = REGULATIONS_CHUNKS_PATH,
        source_path: Path = REGULATIONS_SOURCE_PATH,
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

    def regulation_index(self) -> dict[str, Any]:
        return dict(self._load()["regulation_index"])

    def parts(self) -> list[dict[str, Any]]:
        return [dict(part) for part in self._load()["parts"]]

    def schedules(self) -> list[dict[str, Any]]:
        return [dict(schedule) for schedule in self._load()["schedules"]]

    def excluded_sources(self) -> dict[str, bool]:
        return dict(self._load()["excluded_sources"])

    def verified_regulation_numbers(self) -> list[str]:
        return list(self._load()["verified_regulation_numbers"])

    def chunks(self) -> list[dict[str, Any]]:
        return [dict(chunk) for chunk in self._load()["chunks"]]

    def chunk_count(self) -> int:
        return len(self._load()["chunks"])

    def full_text_source_ids(self) -> set[str]:
        return {REGULATIONS_2015_SOURCE_ID}

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
        reg_num = _normalise_regulation_number(chunk.get("regulation_number"))
        verified = reg_num in set(self.verified_regulation_numbers())
        label = _text(chunk.get("citation_label"))
        internal_chunk_id = _text(chunk.get("internal_chunk_id"))
        clear_internal_label = (
            internal_chunk_id.startswith("internal:")
            and "internal chunk" in label.lower()
            and internal_chunk_id in label
        )
        return bool(
            _lower(chunk.get("source_id")) == REGULATIONS_2015_SOURCE_ID
            and chunk.get("quote_allowed") is True
            and chunk.get("source_text_exact") is True
            and content_kind in {"regulation_text", "schedule_text"}
            and _text(chunk.get("text"))
            and _text(chunk.get("quote_basis"))
            and (
                (verified and _text(chunk.get("official_reference")))
                or clear_internal_label
            )
        )

    def retrieve_chunks(
        self,
        *,
        query: str = "",
        source_id: str | None = None,
        regulation_number: str | None = None,
        regulation_title: str | None = None,
        part_number: str | None = None,
        schedule_number: str | None = None,
        workflow_domain: str | None = None,
        quality_standard: str | None = None,
        keywords: list[str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        cap = self._cap(limit)
        query_terms = self._terms(query, keywords=keywords)
        source_filter = _lower(source_id)
        regulation_filter = _normalise_regulation_number(regulation_number)
        title_filter = _lower(regulation_title)
        part_filter = _lower(part_number)
        schedule_filter = _lower(schedule_number)
        workflow_filter = _lower(workflow_domain)
        quality_filter = _lower(quality_standard)

        scored: list[tuple[int, int, dict[str, Any]]] = []
        for chunk in self.chunks():
            if source_filter and source_filter != _lower(chunk.get("source_id")):
                continue
            if source_filter and source_filter != REGULATIONS_2015_SOURCE_ID:
                continue

            score = 0
            chunk_reg = _normalise_regulation_number(chunk.get("regulation_number"))
            if regulation_filter:
                if chunk_reg != regulation_filter:
                    continue
                score += 100
            if title_filter:
                if title_filter not in _lower(chunk.get("regulation_title")):
                    continue
                score += 80
            if part_filter:
                if part_filter != _lower(chunk.get("part_number")):
                    continue
                score += 70
            if schedule_filter:
                if schedule_filter != _lower(chunk.get("schedule_number")):
                    continue
                score += 70
            if workflow_filter:
                workflows = {_lower(item) for item in _as_list(chunk.get("related_workflow_domains"))}
                if workflow_filter not in workflows:
                    continue
                score += 60
            if quality_filter:
                standards = {_lower(item) for item in _as_list(chunk.get("related_quality_standards"))}
                if quality_filter not in standards:
                    continue
                score += 50
            if source_filter:
                score += 40

            haystack = " ".join(
                [
                    _text(chunk.get("regulation_title")),
                    _text(chunk.get("part_title")),
                    _text(chunk.get("schedule_title")),
                    _text(chunk.get("official_reference")),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_quality_standards"))),
                    " ".join(_text(item) for item in _as_list(chunk.get("related_workflow_domains"))),
                    _text(chunk.get("text")),
                ]
            ).lower()
            if query_terms:
                term_hits = sum(1 for term in query_terms if term in haystack)
                if term_hits == 0 and not any(
                    (
                        regulation_filter,
                        title_filter,
                        part_filter,
                        schedule_filter,
                        workflow_filter,
                        quality_filter,
                        source_filter,
                    )
                ):
                    continue
                score += term_hits * 10

            if score or not any(
                (
                    query_terms,
                    regulation_filter,
                    title_filter,
                    part_filter,
                    schedule_filter,
                    workflow_filter,
                    quality_filter,
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
        regulation_number: str | None = None,
        part_number: str | None = None,
        schedule_number: str | None = None,
        workflow_domain: str | None = None,
        quality_standard: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        chunks = self.retrieve_chunks(
            query=query,
            regulation_number=regulation_number,
            part_number=part_number,
            schedule_number=schedule_number,
            workflow_domain=workflow_domain,
            quality_standard=quality_standard,
            limit=limit,
        )
        return {
            "source_id": REGULATIONS_2015_SOURCE_ID,
            "source_title": self.source_metadata()["source_title"],
            "source_integrity": "full_document",
            "exact_chunk_count": len(chunks),
            "maximum_exact_chunks": self._cap(limit),
            "never_send_full_regulations_to_llm": True,
            "deterministic_selection_before_llm": True,
            "runtime_answer_wiring_enabled": False,
            "chunks": chunks,
        }

    def returns_full_regulations_blob(self, *, limit: int | None = None) -> bool:
        return len(self.retrieve_chunks(limit=limit)) >= self.chunk_count()

    def _cap(self, limit: int | None) -> int:
        configured = int(self.retrieval_policy()["maximum_exact_chunks"])
        requested = configured if limit is None else int(limit)
        return max(0, min(requested, configured, MAX_REGULATIONS_CHUNKS_PER_RETRIEVAL))

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


orb_residential_regulations_2015_ingestion_service = OrbResidentialRegulations2015IngestionService()

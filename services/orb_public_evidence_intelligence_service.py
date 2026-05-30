from __future__ import annotations

"""Public evidence intelligence for standalone ORB Residential.

This service stays outside IndiCare OS records. It ingests public, official or
professionally curated sector evidence into the standalone ORB Knowledge Library
so the Ofsted, safeguarding, recording and manager lenses can retrieve current
public learning through the existing RAG path.
"""

import logging
import re
from datetime import datetime, timezone
from html import unescape
from typing import Any
from urllib.parse import urlparse

import httpx

from services.orb_document_ingestion_service import orb_document_ingestion_service
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service

logger = logging.getLogger("indicare.orb_public_evidence")

FETCH_TIMEOUT_SECONDS = 20.0
MAX_FETCH_BYTES = 8_000_000
MAX_TEXT_CHARS = 500_000

ALLOWED_PUBLIC_EVIDENCE_DOMAINS = {
    "reports.ofsted.gov.uk",
    "www.gov.uk",
    "gov.uk",
    "assets.publishing.service.gov.uk",
    "www.judiciary.uk",
    "judiciary.uk",
    "learning.nspcc.org.uk",
    "www.nspcc.org.uk",
}

SOURCE_TYPE_BY_KIND = {
    "ofsted_inspection_report": "regulatory_framework",
    "safeguarding_practice_review": "safeguarding_principles",
    "national_panel_review": "safeguarding_principles",
    "prevention_of_future_deaths": "safeguarding_principles",
    "research_or_learning": "practice_guidance",
}

DOCUMENT_FAMILY_BY_KIND = {
    "ofsted_inspection_report": "ofsted",
    "safeguarding_practice_review": "safeguarding",
    "national_panel_review": "safeguarding",
    "prevention_of_future_deaths": "safeguarding",
    "research_or_learning": "other",
}

PUBLISHER_BY_KIND = {
    "ofsted_inspection_report": "Ofsted",
    "safeguarding_practice_review": "Public safeguarding learning source",
    "national_panel_review": "Child Safeguarding Practice Review Panel",
    "prevention_of_future_deaths": "Courts and Tribunals Judiciary",
    "research_or_learning": "Public evidence source",
}

THEME_PATTERNS: dict[str, tuple[str, ...]] = {
    "professional_curiosity": ("professional curiosity", "accepted explanation", "over-reliance"),
    "child_voice": ("child's voice", "child voice", "wishes and feelings", "lived experience"),
    "management_oversight": ("manager oversight", "leadership", "quality assurance", "management action", "drift"),
    "safeguarding_escalation": ("escalat", "strategy meeting", "child protection", "threshold", "referral", "lado"),
    "information_sharing": ("information sharing", "multi-agency", "partnership", "communication between agencies"),
    "recording_quality": ("recording", "records did not", "records were not", "chronology", "evidence", "not recorded"),
    "exploitation_or_missing_context": ("missing", "exploitation", "county lines", "criminal exploitation"),
    "home_visibility": ("home education", "not seen", "invisible", "unseen"),
}

INSPECTION_PATTERNS: dict[str, tuple[str, ...]] = {
    "children_experience_progress": ("experiences and progress", "children make progress", "children's experiences"),
    "safeguarding_protection": ("safeguarding", "protection", "children are safe", "risk management"),
    "leadership_management": ("leadership and management", "registered manager", "responsible individual", "oversight"),
    "care_planning": ("care plan", "placement plan", "risk assessment", "planning"),
    "staffing_workforce": ("staff", "supervision", "training", "workforce"),
}

DEFAULT_PUBLIC_EVIDENCE_SEEDS = [
    {
        "kind": "ofsted_inspection_report",
        "title": "Ofsted children's homes inspection reports search",
        "url": "https://reports.ofsted.gov.uk/",
        "description": "Official Ofsted reports search surface for children’s social care and children’s homes reports.",
        "query_hint": "Ofsted children homes inspection reports SCCIF leadership safeguarding recording evidence",
    },
    {
        "kind": "national_panel_review",
        "title": "Child Safeguarding Practice Review Panel publications",
        "url": "https://www.gov.uk/government/organisations/child-safeguarding-practice-review-panel",
        "description": "Official GOV.UK organisation page for national child safeguarding practice review panel material.",
        "query_hint": "national safeguarding practice review learning professional curiosity information sharing child voice",
    },
    {
        "kind": "prevention_of_future_deaths",
        "title": "Prevention of Future Deaths reports database",
        "url": "https://www.judiciary.uk/prevention-of-future-death-reports/",
        "description": "Judiciary public database for Regulation 28 Prevention of Future Deaths reports.",
        "query_hint": "prevention future deaths children safeguarding learning themes",
    },
    {
        "kind": "safeguarding_practice_review",
        "title": "NSPCC case review learning summaries",
        "url": "https://learning.nspcc.org.uk/case-reviews/recently-published-case-reviews",
        "description": "NSPCC Learning case review summaries and learning themes.",
        "query_hint": "case review learning themes safeguarding children professional curiosity disguised compliance",
    },
]


def _text(value: Any) -> str:
    return str(value or "").strip()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _domain_allowed(url: str) -> bool:
    host = urlparse(url).netloc.lower().split(":", 1)[0]
    return host in ALLOWED_PUBLIC_EVIDENCE_DOMAINS


def _strip_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|noscript).*?</\\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>", "\n", html)
    html = re.sub(r"(?i)</(p|div|li|h1|h2|h3|h4|tr|section|article)>", "\n", html)
    text = re.sub(r"(?s)<[^>]+>", " ", html)
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _title_from_html(html: str, fallback: str) -> str:
    match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
    if not match:
        return fallback
    title = _strip_html(match.group(1))
    title = re.sub(r"\s+-\s+GOV\.UK$", "", title, flags=re.I)
    return title[:500] or fallback


def _detect_publication_date(text: str) -> str | None:
    match = re.search(r"(?:Published|Publication date|Date)\s*:?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})", text)
    if match:
        return match.group(1)
    match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    return match.group(1) if match else None


def _theme_hits(text: str, patterns: dict[str, tuple[str, ...]]) -> list[str]:
    lower = text.lower()
    hits: list[str] = []
    for theme, terms in patterns.items():
        if any(term.lower() in lower for term in terms):
            hits.append(theme)
    return hits


class OrbPublicEvidenceIntelligenceService:
    """Ingests and searches public evidence for standalone ORB."""

    def seed_registry(self) -> dict[str, Any]:
        sources = []
        for seed in DEFAULT_PUBLIC_EVIDENCE_SEEDS:
            kind = seed["kind"]
            source_id = f"public-evidence-registry-{_slug(kind)}"
            existing = orb_knowledge_library_service.get_source(source_id)
            if existing:
                sources.append(existing)
                continue
            payload = {
                "id": source_id,
                "title": seed["title"],
                "description": seed["description"],
                "source_type": SOURCE_TYPE_BY_KIND.get(kind, "practice_guidance"),
                "status": "indexed",
                "origin": "seeded",
                "source_label": seed["title"],
                "reliability": "public_registry",
                "metadata": {
                    "public_evidence": True,
                    "public_evidence_kind": kind,
                    "registry_only": True,
                    "query_hint": seed["query_hint"],
                    "standalone_only": True,
                },
                "source_url": seed["url"],
                "canonical_url": seed["url"],
                "publisher": PUBLISHER_BY_KIND.get(kind),
                "document_family": DOCUMENT_FAMILY_BY_KIND.get(kind, "other"),
                "official_source": True,
                "confidence_level": "official",
                "governance_status": "approved",
                "source_integrity": "summary_only",
                "approved_by": "system",
                "approved_at": _now_iso(),
                "notes": "Registry seed only. Use import-url to ingest specific reports/reviews for retrieval.",
            }
            source = orb_knowledge_library_service.create_source(payload)
            chunk = {
                "id": f"{source_id}-chunk-0",
                "source_id": source_id,
                "chunk_index": 0,
                "title": seed["title"],
                "text": f"{seed['description']}\n\nUse this public source to locate and import specific current evidence. Query hint: {seed['query_hint']}",
                "heading_path": ["Public evidence registry"],
                "heading": "Public evidence registry",
                "section": kind,
                "subsection": None,
                "page": None,
                "paragraph_number": None,
                "line_start": None,
                "line_end": None,
                "exact_excerpt": seed["description"],
                "normalized_excerpt": seed["description"],
                "citation_anchor": f"{source_id}:0",
                "token_estimate": 120,
                "citation_label": seed["title"],
                "source_type": payload["source_type"],
                "source_url": seed["url"],
                "source_version": "registry-seed-v1",
                "official_source": True,
                "source_integrity": "summary_only",
                "governance_status": "approved",
                "confidence_level": "official",
                "keywords": seed["query_hint"].split(),
                "semantic_keywords": seed["query_hint"].split(),
                "canonical_terms": [kind, "public_evidence", "standalone_orb"],
                "confidence_score": 0.75,
                "metadata": payload["metadata"],
            }
            orb_knowledge_library_service.upsert_chunks(source_id, [chunk])
            sources.append(orb_knowledge_library_service.get_source(source_id) or source)
        return {"seeded": len(sources), "sources": sources, "standalone": True, "os_records_accessed": False}

    def classify_url_kind(self, url: str, requested_kind: str | None = None) -> str:
        if requested_kind in SOURCE_TYPE_BY_KIND:
            return requested_kind
        lower = url.lower()
        if "reports.ofsted.gov.uk" in lower or "ofsted" in lower:
            return "ofsted_inspection_report"
        if "judiciary.uk" in lower or "prevention-of-future" in lower or "pfd" in lower:
            return "prevention_of_future_deaths"
        if "child-safeguarding-practice-review-panel" in lower or "national-review" in lower:
            return "national_panel_review"
        if "case-review" in lower or "safeguarding-practice-review" in lower or "nspcc" in lower:
            return "safeguarding_practice_review"
        return "research_or_learning"

    async def fetch_public_url(self, url: str) -> dict[str, Any]:
        if not _domain_allowed(url):
            return {"ok": False, "error": "domain_not_allowed", "allowed_domains": sorted(ALLOWED_PUBLIC_EVIDENCE_DOMAINS)}
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "IndiCare-ORB-PublicEvidenceBot/1.0",
                    "Accept": "text/html,application/pdf,text/plain,*/*",
                },
            )
        content = response.content[:MAX_FETCH_BYTES]
        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if response.status_code >= 400:
            return {"ok": False, "error": "fetch_failed", "status_code": response.status_code}
        if content_type == "application/pdf" or url.lower().endswith(".pdf"):
            text, method = orb_document_ingestion_service.extract_text_from_file("public-evidence.pdf", content, content_type)
            title = url.rsplit("/", 1)[-1].replace("-", " ").replace(".pdf", "").strip() or "Public evidence PDF"
            return {"ok": True, "title": title, "text": text[:MAX_TEXT_CHARS], "content_type": content_type, "extraction_method": method}
        raw = content.decode("utf-8", errors="ignore")
        title = _title_from_html(raw, url.rsplit("/", 1)[-1] or "Public evidence")
        text = _strip_html(raw)
        return {"ok": True, "title": title, "text": text[:MAX_TEXT_CHARS], "content_type": content_type or "text/html", "extraction_method": "html_text"}

    async def import_url(self, url: str, *, kind: str | None = None, title: str | None = None, approve_now: bool = True) -> dict[str, Any]:
        fetched = await self.fetch_public_url(url)
        if not fetched.get("ok"):
            return {"success": False, **fetched, "standalone": True, "os_records_accessed": False}
        text = _text(fetched.get("text"))
        if len(text) < 200:
            return {"success": False, "error": "insufficient_text_extracted", "title": fetched.get("title"), "standalone": True, "os_records_accessed": False}
        resolved_kind = self.classify_url_kind(url, kind)
        metadata = {
            "public_evidence": True,
            "public_evidence_kind": resolved_kind,
            "safeguarding_learning_themes": _theme_hits(text, THEME_PATTERNS),
            "inspection_learning_themes": _theme_hits(text, INSPECTION_PATTERNS),
            "extraction_method": fetched.get("extraction_method"),
            "content_type": fetched.get("content_type"),
            "standalone_only": True,
            "os_records_accessed": False,
        }
        result = orb_document_ingestion_service.ingest_text(
            title or fetched.get("title") or "Public evidence source",
            text,
            SOURCE_TYPE_BY_KIND.get(resolved_kind, "practice_guidance"),
            metadata=metadata,
            source_label=title or fetched.get("title") or "Public evidence source",
            description=f"Public evidence imported for ORB Residential: {resolved_kind}",
            origin="admin_added",
            source_fields={
                "family_key": DOCUMENT_FAMILY_BY_KIND.get(resolved_kind),
                "document_family": DOCUMENT_FAMILY_BY_KIND.get(resolved_kind, "other"),
                "publisher": PUBLISHER_BY_KIND.get(resolved_kind),
                "official_source": _domain_allowed(url),
                "confidence_level": "official" if _domain_allowed(url) else "high",
                "governance_status": "approved" if approve_now else "draft",
                "approve_now": approve_now,
                "approved_by": "public_evidence_pipeline" if approve_now else None,
                "approved_at": _now_iso() if approve_now else None,
                "source_url": url,
                "canonical_url": url,
                "published_at": _detect_publication_date(text),
                "source_integrity": "full_document",
                "source_version": f"public-evidence-import-{datetime.now(timezone.utc).date().isoformat()}",
                "copyright_note": "Publicly available source. Store retrieval chunks; do not reproduce long copyrighted text in user responses.",
            },
        )
        return {
            "success": True,
            "source": result.get("source"),
            "chunk_count": result.get("chunk_count"),
            "citation_health": result.get("citation_health"),
            "public_evidence": metadata,
            "standalone": True,
            "os_records_accessed": False,
        }

    def search(self, query: str, *, limit: int = 8, kind: str | None = None) -> dict[str, Any]:
        results = orb_rag_retrieval_service.search(query, limit=limit)
        filtered = []
        for item in results:
            data = item.model_dump() if hasattr(item, "model_dump") else dict(item)
            metadata = data.get("metadata") or {}
            if not metadata.get("public_evidence"):
                continue
            if kind and metadata.get("public_evidence_kind") != kind:
                continue
            filtered.append(data)
        return {"query": query, "kind": kind, "results": filtered[:limit], "total": len(filtered[:limit]), "standalone": True, "os_records_accessed": False}

    def build_prompt_addendum(self, message: str, *, mode: str | None = None, limit: int = 4) -> str:
        lower = f"{message} {mode or ''}".lower()
        if not any(term in lower for term in ("ofsted", "inspection", "sccif", "safeguarding", "case review", "learning review", "professional curiosity", "what am i missing")):
            return ""
        search = self.search(message, limit=limit)
        results = search.get("results") or []
        if not results:
            return ""
        lines = [
            "Public evidence intelligence for ORB Residential:",
            "Use these only as learning themes, not as claims that the user's scenario matches a named case.",
        ]
        for result in results[:limit]:
            label = result.get("citation_label") or result.get("source_title") or "Public evidence"
            excerpt = _text(result.get("excerpt") or result.get("text"))[:500]
            themes = (result.get("metadata") or {}).get("safeguarding_learning_themes") or []
            theme_text = f" Themes: {', '.join(themes[:5])}." if themes else ""
            lines.append(f"- {label}: {excerpt}{theme_text}")
        return "\n".join(lines)

    def status(self) -> dict[str, Any]:
        sources = orb_knowledge_library_service.list_sources()
        public_sources = [s for s in sources if (s.get("metadata") or {}).get("public_evidence")]
        by_kind: dict[str, int] = {}
        for source in public_sources:
            kind = (source.get("metadata") or {}).get("public_evidence_kind") or "unknown"
            by_kind[kind] = by_kind.get(kind, 0) + 1
        return {"status": "ready", "source_count": len(public_sources), "by_kind": by_kind, "allowed_domains": sorted(ALLOWED_PUBLIC_EVIDENCE_DOMAINS), "standalone": True, "os_records_accessed": False}


orb_public_evidence_intelligence_service = OrbPublicEvidenceIntelligenceService()

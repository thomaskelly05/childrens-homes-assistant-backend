from __future__ import annotations

"""Public source discovery for ORB Residential standalone knowledge.

Discovers candidate public sources from trusted registry pages and maps them to
ORB sector evidence pipelines. It does not access IndiCare OS records. Discovery
is deliberately conservative: only allowed public domains are scanned, and found
links are returned as candidates for import/approval.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import unescape
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_public_evidence_intelligence_service import (
    ALLOWED_PUBLIC_EVIDENCE_DOMAINS,
    orb_public_evidence_intelligence_service,
)
from services.orb_sector_evidence_pipeline_service import orb_sector_evidence_pipeline_service
from services.orb_source_refresh_service import CANONICAL_SOURCES

logger = logging.getLogger("indicare.orb_public_source_discovery")

DISCOVERY_TIMEOUT_SECONDS = 20.0
MAX_REGISTRY_BYTES = 5_000_000
MAX_LINKS_PER_REGISTRY = 80


@dataclass(frozen=True)
class DiscoveryRule:
    id: str
    pipeline_id: str
    registry_url: str
    include_patterns: tuple[str, ...]
    exclude_patterns: tuple[str, ...] = ()
    title_hint: str | None = None
    priority: int = 50
    metadata: dict[str, Any] = field(default_factory=dict)


DISCOVERY_RULES: tuple[DiscoveryRule, ...] = (
    DiscoveryRule(
        id="discover-ofsted-reports",
        pipeline_id="ofsted_current_cycle",
        registry_url="https://reports.ofsted.gov.uk/",
        include_patterns=("/provider/", "/inspection-reports/", "/report/", "ofsted"),
        exclude_patterns=("javascript:", "mailto:", "#"),
        title_hint="Ofsted report candidate",
        priority=1,
    ),
    DiscoveryRule(
        id="discover-cspr-panel",
        pipeline_id="safeguarding_review_learning",
        registry_url="https://www.gov.uk/government/organisations/child-safeguarding-practice-review-panel",
        include_patterns=("/government/publications/", "safeguarding", "review"),
        exclude_patterns=("/government/news/", "mailto:", "#"),
        title_hint="National safeguarding review candidate",
        priority=2,
    ),
    DiscoveryRule(
        id="discover-nspcc-case-reviews",
        pipeline_id="safeguarding_review_learning",
        registry_url="https://learning.nspcc.org.uk/case-reviews/recently-published-case-reviews",
        include_patterns=("case-reviews", "case review", "learning"),
        exclude_patterns=("mailto:", "#"),
        title_hint="Safeguarding learning review candidate",
        priority=3,
    ),
    DiscoveryRule(
        id="discover-pfd-reports",
        pipeline_id="pfd_system_learning",
        registry_url="https://www.judiciary.uk/prevention-of-future-death-reports/",
        include_patterns=("prevention-of-future", "regulation-28", "reports"),
        exclude_patterns=("mailto:", "#"),
        title_hint="Prevention of future harm candidate",
        priority=4,
    ),
    DiscoveryRule(
        id="discover-dfe-guidance",
        pipeline_id="guidance_change_tracker",
        registry_url="https://www.gov.uk/government/organisations/department-for-education",
        include_patterns=("/government/publications/", "children", "safeguard", "care", "homes"),
        exclude_patterns=("/government/news/", "mailto:", "#"),
        title_hint="DfE guidance candidate",
        priority=5,
    ),
    DiscoveryRule(
        id="discover-policy-consultations",
        pipeline_id="policy_consultation_tracker",
        registry_url="https://www.gov.uk/search/policy-papers-and-consultations",
        include_patterns=("/government/consultations/", "/government/publications/", "children", "social care"),
        exclude_patterns=("mailto:", "#"),
        title_hint="Policy or consultation candidate",
        priority=6,
    ),
    DiscoveryRule(
        id="discover-ombudsman-childrens-care",
        pipeline_id="ombudsman_complaints_learning",
        registry_url="https://www.lgo.org.uk/decisions/children-s-care-services",
        include_patterns=("/decisions/children-s-care-services/",),
        exclude_patterns=("mailto:", "#"),
        title_hint="Ombudsman learning candidate",
        priority=7,
    ),
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any) -> str:
    return str(value or "").strip()


def _allowed(url: str) -> bool:
    host = urlparse(url).netloc.lower().split(":", 1)[0]
    return host in ALLOWED_PUBLIC_EVIDENCE_DOMAINS or host.endswith(".gov.uk")


def _strip_html(value: str) -> str:
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    value = unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def _normalise_url(base: str, href: str) -> str:
    href = unescape(_text(href))
    if not href or href.startswith(("javascript:", "mailto:", "tel:")):
        return ""
    url = urljoin(base, href)
    parsed = urlparse(url)
    if not parsed.scheme.startswith("http"):
        return ""
    clean = parsed._replace(fragment="").geturl()
    return clean.rstrip("/")


def _extract_links(html: str, base_url: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    seen: set[str] = set()
    for match in re.finditer(r"(?is)<a\s+[^>]*href=['\"]([^'\"]+)['\"][^>]*>(.*?)</a>", html):
        url = _normalise_url(base_url, match.group(1))
        if not url or url in seen:
            continue
        seen.add(url)
        label = _strip_html(match.group(2))[:500]
        links.append({"url": url, "label": label})
    return links


def _matches_rule(candidate: dict[str, str], rule: DiscoveryRule) -> bool:
    haystack = f"{candidate.get('url', '')} {candidate.get('label', '')}".lower()
    if any(pattern.lower() in haystack for pattern in rule.exclude_patterns):
        return False
    return any(pattern.lower() in haystack for pattern in rule.include_patterns)


class OrbPublicSourceDiscoveryService:
    def rules(self) -> dict[str, Any]:
        return {
            "rules": [self._rule_payload(rule) for rule in sorted(DISCOVERY_RULES, key=lambda item: item.priority)],
            "count": len(DISCOVERY_RULES),
            "standalone": True,
            "os_records_accessed": False,
        }

    def status(self) -> dict[str, Any]:
        knowledge_sources = orb_knowledge_library_service.list_sources()
        imported_urls = {
            _text(source.get("source_url") or source.get("canonical_url"))
            for source in knowledge_sources
            if _text(source.get("source_url") or source.get("canonical_url"))
        }
        return {
            "status": "ready",
            "rules_count": len(DISCOVERY_RULES),
            "imported_url_count": len(imported_urls),
            "canonical_source_count": len(CANONICAL_SOURCES),
            "allowed_domains": sorted(ALLOWED_PUBLIC_EVIDENCE_DOMAINS),
            "standalone": True,
            "os_records_accessed": False,
        }

    async def discover_rule(self, rule_id: str, *, limit: int = MAX_LINKS_PER_REGISTRY) -> dict[str, Any]:
        rule = self._find_rule(rule_id)
        if not rule:
            return {"success": False, "error": "discovery_rule_not_found", "rule_id": rule_id}
        return await self._discover(rule, limit=limit)

    async def discover_all(self, *, limit_per_rule: int = 25) -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        candidates: list[dict[str, Any]] = []
        seen: set[str] = set()
        for rule in sorted(DISCOVERY_RULES, key=lambda item: item.priority):
            result = await self._discover(rule, limit=limit_per_rule)
            results.append(result)
            for candidate in result.get("candidates") or []:
                url = candidate.get("url")
                if not url or url in seen:
                    continue
                seen.add(url)
                candidates.append(candidate)
        return {
            "success": True,
            "rule_results": results,
            "candidate_count": len(candidates),
            "candidates": candidates,
            "standalone": True,
            "os_records_accessed": False,
        }

    async def discover_and_import(
        self,
        *,
        rule_id: str | None = None,
        limit: int = 10,
        approve_now: bool = True,
    ) -> dict[str, Any]:
        if rule_id:
            discovered = await self.discover_rule(rule_id, limit=limit)
            candidates = discovered.get("candidates") or []
        else:
            discovered = await self.discover_all(limit_per_rule=max(1, min(limit, 25)))
            candidates = discovered.get("candidates") or []
        results: list[dict[str, Any]] = []
        for candidate in candidates[: max(1, min(limit, 50))]:
            result = await orb_sector_evidence_pipeline_service.import_url(
                candidate["pipeline_id"],
                candidate["url"],
                title=candidate.get("title") or candidate.get("label"),
                approve_now=approve_now,
            )
            results.append({"candidate": candidate, "import_result": result})
        return {
            "success": True,
            "discovered": len(candidates),
            "attempted_imports": len(results),
            "results": results,
            "standalone": True,
            "os_records_accessed": False,
        }

    async def _discover(self, rule: DiscoveryRule, *, limit: int) -> dict[str, Any]:
        if not _allowed(rule.registry_url):
            return {
                "success": False,
                "error": "registry_domain_not_allowed",
                "rule": self._rule_payload(rule),
            }
        try:
            async with httpx.AsyncClient(timeout=DISCOVERY_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.get(
                    rule.registry_url,
                    headers={
                        "User-Agent": "IndiCare-ORB-SourceDiscovery/1.0",
                        "Accept": "text/html,*/*",
                    },
                )
            if response.status_code >= 400:
                return {
                    "success": False,
                    "error": "fetch_failed",
                    "status_code": response.status_code,
                    "rule": self._rule_payload(rule),
                }
            html = response.content[:MAX_REGISTRY_BYTES].decode("utf-8", errors="ignore")
        except Exception as exc:
            logger.warning("ORB discovery failed for %s", rule.id, exc_info=True)
            return {"success": False, "error": str(exc), "rule": self._rule_payload(rule)}

        existing_urls = self._existing_urls()
        candidates: list[dict[str, Any]] = []
        for link in _extract_links(html, rule.registry_url):
            url = link["url"]
            if not _allowed(url):
                continue
            if not _matches_rule(link, rule):
                continue
            if url in existing_urls:
                continue
            candidates.append(
                {
                    "url": url,
                    "label": link.get("label") or rule.title_hint or rule.id,
                    "title": link.get("label") or rule.title_hint or rule.id,
                    "pipeline_id": rule.pipeline_id,
                    "discovery_rule_id": rule.id,
                    "registry_url": rule.registry_url,
                    "discovered_at": _now_iso(),
                    "standalone": True,
                    "os_records_accessed": False,
                    "metadata": {
                        "discovery_rule_id": rule.id,
                        "source_discovery": True,
                        **rule.metadata,
                    },
                }
            )
            if len(candidates) >= max(1, min(limit, MAX_LINKS_PER_REGISTRY)):
                break
        return {
            "success": True,
            "rule": self._rule_payload(rule),
            "candidate_count": len(candidates),
            "candidates": candidates,
            "standalone": True,
            "os_records_accessed": False,
        }

    def _existing_urls(self) -> set[str]:
        urls: set[str] = set()
        for source in orb_knowledge_library_service.list_sources():
            for key in ("source_url", "canonical_url"):
                url = _text(source.get(key)).rstrip("/")
                if url:
                    urls.add(url)
        return urls

    def _find_rule(self, rule_id: str) -> DiscoveryRule | None:
        key = _text(rule_id).lower()
        for rule in DISCOVERY_RULES:
            if rule.id == key:
                return rule
        return None

    def _rule_payload(self, rule: DiscoveryRule) -> dict[str, Any]:
        return {
            "id": rule.id,
            "pipeline_id": rule.pipeline_id,
            "registry_url": rule.registry_url,
            "include_patterns": list(rule.include_patterns),
            "exclude_patterns": list(rule.exclude_patterns),
            "title_hint": rule.title_hint,
            "priority": rule.priority,
            "metadata": rule.metadata,
            "standalone": True,
            "os_records_accessed": False,
        }


orb_public_source_discovery_service = OrbPublicSourceDiscoveryService()

from __future__ import annotations

import hashlib
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

from tavily import TavilyClient

logger = logging.getLogger("indicare.web_search")

tavily_api_key = (os.environ.get("TAVILY_API_KEY") or "").strip()
client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None

WEB_SEARCH_CACHE_TTL_SECONDS = int(
    os.environ.get("WEB_SEARCH_CACHE_TTL_SECONDS", "900")
)
MAX_SNIPPET_CHARS = int(os.environ.get("WEB_SEARCH_MAX_SNIPPET_CHARS", "320"))
DEFAULT_PRIMARY_LIMIT = int(os.environ.get("WEB_SEARCH_PRIMARY_LIMIT", "4"))
DEFAULT_SECONDARY_LIMIT = int(os.environ.get("WEB_SEARCH_SECONDARY_LIMIT", "2"))
MIN_PRIMARY_RESULTS_TO_SKIP_SECONDARY = int(
    os.environ.get("WEB_SEARCH_MIN_PRIMARY_RESULTS", "2")
)

PRIMARY_SITES = [
    "gov.uk",
    "legislation.gov.uk",
    "ofsted.gov.uk",
]

SECONDARY_SITES = [
    "nspcc.org.uk",
    "researchinpractice.org.uk",
    "scie.org.uk",
    "childrenscommissioner.gov.uk",
    "proceduresonline.com",
    "nice.org.uk",
    "yjboard.justice.gov.uk",
]

BLOCKED_SITES = [
    "reddit.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "youtube.com",
    "x.com",
    "twitter.com",
    "linkedin.com",
    "quora.com",
    "medium.com",
]

GUIDANCE_TRIGGER_TERMS = {
    "regulation",
    "regulations",
    "law",
    "legal",
    "policy",
    "guidance",
    "statutory",
    "ofsted",
    "inspection",
    "framework",
    "standard",
    "standards",
    "quality standard",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "sccif",
    "guide to the children's homes regulations",
    "childrens homes regulations including quality standards guide",
}

_web_search_cache: dict[str, tuple[float, str]] = {}


@dataclass(frozen=True)
class SearchPolicy:
    primary_sites: list[str]
    secondary_sites: list[str]
    primary_limit: int
    secondary_limit: int
    search_depth: str = "basic"


# ---------------------------------------------------------
# Safe helpers
# ---------------------------------------------------------

def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_query(value: str) -> str:
    text = " ".join(_safe_string(value).split())
    return text[:600].strip()


def _truncate(text: str, max_chars: int = MAX_SNIPPET_CHARS) -> str:
    text = _safe_string(text)
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0].strip() + "..."


def _cache_key(query: str, primary_limit: int, secondary_limit: int) -> str:
    raw = f"{query}|{primary_limit}|{secondary_limit}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _cleanup_cache() -> None:
    now = time.time()
    expired_keys = [
        key
        for key, (expires_at, _value) in _web_search_cache.items()
        if expires_at <= now
    ]
    for key in expired_keys:
        _web_search_cache.pop(key, None)


def _get_cached_value(query: str, primary_limit: int, secondary_limit: int) -> str | None:
    _cleanup_cache()
    key = _cache_key(query, primary_limit, secondary_limit)
    entry = _web_search_cache.get(key)
    if not entry:
        return None

    expires_at, value = entry
    if expires_at <= time.time():
        _web_search_cache.pop(key, None)
        return None

    return value


def _set_cached_value(query: str, primary_limit: int, secondary_limit: int, value: str) -> None:
    key = _cache_key(query, primary_limit, secondary_limit)
    _web_search_cache[key] = (
        time.time() + WEB_SEARCH_CACHE_TTL_SECONDS,
        value,
    )


def _contains_guidance_terms(query: str) -> bool:
    text = _normalise_query(query).lower()
    return any(term in text for term in GUIDANCE_TRIGGER_TERMS)


def _is_blocked_url(url: str) -> bool:
    lowered = _safe_string(url).lower()
    if not lowered:
        return False
    return any(domain in lowered for domain in BLOCKED_SITES)


def _normalise_title(item: dict[str, Any]) -> str:
    return _safe_string(item.get("title"))


def _normalise_content(item: dict[str, Any]) -> str:
    return _truncate(item.get("content") or "")


def _normalise_url(item: dict[str, Any]) -> str:
    return _safe_string(item.get("url"))


def _deduplicate_results(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique_results: list[dict[str, Any]] = []

    for item in results or []:
        if not isinstance(item, dict):
            continue

        url = _normalise_url(item).lower()
        title = _normalise_title(item).lower()
        content = _normalise_content(item).lower()

        if _is_blocked_url(url):
            continue

        key = url or f"{title}|{content[:160]}"
        if not key or key in seen:
            continue

        seen.add(key)
        unique_results.append(item)

    return unique_results


def _clean_results(results: list[dict[str, Any]]) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []

    for item in _deduplicate_results(results):
        title = _normalise_title(item)
        content = _normalise_content(item)
        url = _normalise_url(item)

        if not title and not content:
            continue

        cleaned.append(
            {
                "title": title or "Untitled source",
                "content": content,
                "url": url,
            }
        )

    return cleaned


def _domain_filters_to_query(sites: list[str]) -> str:
    clean_sites = [_safe_string(site) for site in sites if _safe_string(site)]
    if not clean_sites:
        return ""
    return " OR ".join(f"site:{site}" for site in clean_sites)


def _search_sites(
    query: str,
    sites: list[str],
    limit: int,
    search_depth: str = "basic",
) -> list[dict[str, Any]]:
    if not client:
        logger.warning("Tavily client not configured")
        return []

    clean_query = _normalise_query(query)
    if not clean_query:
        return []

    safe_limit = max(1, min(int(limit), 8))
    clean_sites = [_safe_string(site) for site in sites if _safe_string(site)]

    try:
        try:
            results = client.search(
                query=clean_query,
                search_depth=search_depth,
                max_results=safe_limit,
                include_domains=clean_sites,
            )
        except TypeError:
            domain_filter = _domain_filters_to_query(clean_sites)
            fallback_query = f"{clean_query} ({domain_filter})" if domain_filter else clean_query
            results = client.search(
                query=fallback_query,
                search_depth=search_depth,
                max_results=safe_limit,
            )

        if not isinstance(results, dict):
            return []

        raw_results = results.get("results")
        if not isinstance(raw_results, list):
            return []

        return raw_results

    except Exception:
        logger.exception("Tavily search failed for query=%s", clean_query)
        return []


def _format_results(results: list[dict[str, str]], authority_label: str) -> str:
    if not results:
        return ""

    blocks: list[str] = []

    for i, result in enumerate(results, start=1):
        title = _safe_string(result.get("title")) or "Untitled source"
        content = _safe_string(result.get("content"))
        url = _safe_string(result.get("url"))

        lines = [f"[{authority_label} {i}] {title}"]

        if content:
            lines.append(f"Snippet: {content}")

        if url:
            lines.append(f"URL: {url}")

        blocks.append("\n".join(lines))

    return "\n\n".join(blocks)


def _default_policy(query: str, primary_limit: int, secondary_limit: int) -> SearchPolicy:
    clean_query = _normalise_query(query).lower()

    # Deepen only for regulation-heavy queries
    if any(term in clean_query for term in ["regulation", "regulations", "sccif", "quality standard", "ofsted"]):
        return SearchPolicy(
            primary_sites=PRIMARY_SITES,
            secondary_sites=SECONDARY_SITES,
            primary_limit=max(primary_limit, 4),
            secondary_limit=max(secondary_limit, 2),
            search_depth="advanced",
        )

    return SearchPolicy(
        primary_sites=PRIMARY_SITES,
        secondary_sites=SECONDARY_SITES,
        primary_limit=primary_limit,
        secondary_limit=secondary_limit,
        search_depth="basic",
    )


def web_search(
    query: str,
    primary_limit: int = DEFAULT_PRIMARY_LIMIT,
    secondary_limit: int = DEFAULT_SECONDARY_LIMIT,
) -> str:
    """
    Return compact trusted guidance snippets for assistant prompting.

    Search order:
    1. primary official sources
    2. secondary practice sources only if primary coverage is weak

    Output is intentionally concise so it can be inserted into prompts safely.
    """
    clean_query = _normalise_query(query)
    if not clean_query:
        return ""

    if not _contains_guidance_terms(clean_query):
        logger.info("web_search skipped because query is not guidance-like")
        return ""

    cached = _get_cached_value(clean_query, primary_limit, secondary_limit)
    if cached is not None:
        return cached

    policy = _default_policy(clean_query, primary_limit, secondary_limit)

    logger.info(
        "web_search start query=%s primary_limit=%s secondary_limit=%s depth=%s",
        clean_query,
        policy.primary_limit,
        policy.secondary_limit,
        policy.search_depth,
    )

    primary_results_raw = _search_sites(
        query=clean_query,
        sites=policy.primary_sites,
        limit=policy.primary_limit,
        search_depth=policy.search_depth,
    )
    primary_results = _clean_results(primary_results_raw)
    primary_text = _format_results(primary_results, "Primary")

    if len(primary_results) >= MIN_PRIMARY_RESULTS_TO_SKIP_SECONDARY:
        _set_cached_value(clean_query, primary_limit, secondary_limit, primary_text)
        logger.info(
            "web_search resolved from primary sources only count=%s",
            len(primary_results),
        )
        return primary_text

    secondary_results_raw = _search_sites(
        query=clean_query,
        sites=policy.secondary_sites,
        limit=policy.secondary_limit,
        search_depth="basic",
    )
    secondary_results = _clean_results(secondary_results_raw)
    secondary_text = _format_results(secondary_results, "Secondary")

    result = "\n\n".join(part for part in [primary_text, secondary_text] if part)
    _set_cached_value(clean_query, primary_limit, secondary_limit, result)

    logger.info(
        "web_search completed primary=%s secondary=%s",
        len(primary_results),
        len(secondary_results),
    )

    return result

import hashlib
import logging
import os
import time
from typing import Any

from tavily import TavilyClient

logger = logging.getLogger(__name__)

tavily_api_key = (os.environ.get("TAVILY_API_KEY") or "").strip()
client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None

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
    "basw.co.uk",
    "communitycare.co.uk",
    "ncb.org.uk",
    "annafreud.org",
    "beaconhouse.org.uk",
    "yjboard.justice.gov.uk",
    "cqc.org.uk",
    "nice.org.uk",
]

MAX_SNIPPET_CHARS = 280
MIN_PRIMARY_RESULTS_TO_SKIP_SECONDARY = 2
WEB_SEARCH_CACHE_TTL_SECONDS = int(os.environ.get("WEB_SEARCH_CACHE_TTL_SECONDS", "900"))

_web_search_cache: dict[str, tuple[float, str]] = {}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


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


def _deduplicate_results(results: list[dict]) -> list[dict]:
    seen: set[str] = set()
    unique_results: list[dict] = []

    for item in results or []:
        url = _safe_string(item.get("url")).lower()
        title = _safe_string(item.get("title")).lower()
        content = _safe_string(item.get("content")).lower()

        key = url or f"{title}|{content[:120]}"
        if not key or key in seen:
            continue

        seen.add(key)
        unique_results.append(item)

    return unique_results


def _clean_results(results: list[dict]) -> list[dict]:
    cleaned: list[dict] = []

    for item in _deduplicate_results(results):
        title = _safe_string(item.get("title"))
        content = _truncate(item.get("content") or "")
        url = _safe_string(item.get("url"))

        if not title and not content:
            continue

        cleaned.append(
            {
                "title": title,
                "content": content,
                "url": url,
            }
        )

    return cleaned


def format_results(results: list[dict], authority_label: str) -> str:
    cleaned = _clean_results(results)
    if not cleaned:
        return ""

    snippets: list[str] = []

    for i, result in enumerate(cleaned, start=1):
        title = result["title"] or "Untitled source"
        content = result["content"]

        block_lines = [f"[{authority_label} {i}] {title}"]

        if content:
            block_lines.append(f"Snippet: {content}")

        snippets.append("\n".join(block_lines))

    return "\n\n".join(snippets)


def _search_sites(query: str, sites: list[str], limit: int, search_depth: str = "basic") -> list[dict]:
    if not client:
        logger.warning("Tavily client not configured")
        return []

    clean_query = _safe_string(query)
    if not clean_query:
        return []

    try:
        try:
            results = client.search(
                query=clean_query,
                search_depth=search_depth,
                max_results=max(1, int(limit)),
                include_domains=sites,
            )
        except TypeError:
            site_filters = " OR ".join(f"site:{site}" for site in sites if _safe_string(site))
            fallback_query = f"{clean_query} ({site_filters})" if site_filters else clean_query
            results = client.search(
                query=fallback_query,
                search_depth=search_depth,
                max_results=max(1, int(limit)),
            )

        if not results or "results" not in results:
            return []

        return results["results"] or []

    except Exception:
        logger.exception("Tavily search failed")
        return []


def web_search(query: str, primary_limit: int = 3, secondary_limit: int = 2) -> str:
    clean_query = _safe_string(query)
    if not clean_query:
        return ""

    cached = _get_cached_value(clean_query, primary_limit, secondary_limit)
    if cached is not None:
        return cached

    primary_results = _search_sites(
        query=clean_query,
        sites=PRIMARY_SITES,
        limit=primary_limit,
        search_depth="basic",
    )
    cleaned_primary = _clean_results(primary_results)
    primary_text = format_results(cleaned_primary, "Primary")

    if len(cleaned_primary) >= MIN_PRIMARY_RESULTS_TO_SKIP_SECONDARY:
        _set_cached_value(clean_query, primary_limit, secondary_limit, primary_text)
        return primary_text

    secondary_results = _search_sites(
        query=clean_query,
        sites=SECONDARY_SITES,
        limit=secondary_limit,
        search_depth="basic",
    )
    cleaned_secondary = _clean_results(secondary_results)
    secondary_text = format_results(cleaned_secondary, "Secondary")

    result = "\n\n".join(part for part in [primary_text, secondary_text] if part)
    _set_cached_value(clean_query, primary_limit, secondary_limit, result)
    return result

import os
import logging
from typing import Any

from tavily import TavilyClient

logger = logging.getLogger(__name__)

client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))

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

MAX_SNIPPET_CHARS = 420


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


def build_site_query(query: str, sites: list[str]) -> str:
    clean_query = _safe_string(query)
    site_filters = " OR ".join(f"site:{site}" for site in sites if _safe_string(site))
    if not site_filters:
        return clean_query
    return f"{clean_query} ({site_filters})"


def _deduplicate_results(results: list[dict]) -> list[dict]:
    seen = set()
    unique_results = []

    for item in results or []:
        url = _safe_string(item.get("url")).lower()
        title = _safe_string(item.get("title")).lower()
        key = url or title

        if not key or key in seen:
            continue

        seen.add(key)
        unique_results.append(item)

    return unique_results


def _clean_results(results: list[dict]) -> list[dict]:
    cleaned = []

    for item in _deduplicate_results(results):
        title = _safe_string(item.get("title"))
        content = _truncate(item.get("content") or "")
        url = _safe_string(item.get("url"))

        if not title and not content:
            continue

        cleaned.append({
            "title": title,
            "content": content,
            "url": url,
        })

    return cleaned


def format_results(results: list[dict], authority_label: str) -> str:
    cleaned = _clean_results(results)
    if not cleaned:
        return ""

    snippets = []

    for i, result in enumerate(cleaned, start=1):
        title = result["title"]
        content = result["content"]
        url = result["url"]

        block_lines = [f"[{authority_label} {i}] {title or 'Untitled source'}"]

        if content:
            block_lines.append(f"Snippet: {content}")

        if url:
            block_lines.append(f"Source: {url}")

        snippets.append("\n".join(block_lines))

    return "\n\n".join(snippets)


def search_sites(query: str, sites: list[str], limit: int) -> list[dict]:
    try:
        safe_query = build_site_query(query, sites)

        results = client.search(
            query=safe_query,
            search_depth="advanced",
            max_results=max(1, int(limit)),
        )

        if not results or "results" not in results:
            return []

        return results["results"] or []

    except Exception as e:
        logger.exception("Tavily search failed: %s", e)
        return []


def web_search(query: str, primary_limit: int = 3, secondary_limit: int = 2) -> str:
    clean_query = _safe_string(query)
    if not clean_query:
        return ""

    primary_results = search_sites(clean_query, PRIMARY_SITES, primary_limit)
    primary_text = format_results(primary_results, "Primary")

    # If primary sources returned enough useful content, prefer those.
    if len(_clean_results(primary_results)) >= 2:
        return primary_text

    secondary_results = search_sites(clean_query, SECONDARY_SITES, secondary_limit)
    secondary_text = format_results(secondary_results, "Secondary")

    parts = [part for part in [primary_text, secondary_text] if part]
    return "\n\n".join(parts)

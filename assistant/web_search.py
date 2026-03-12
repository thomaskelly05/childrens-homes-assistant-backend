import os
from tavily import TavilyClient

client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))


PRIMARY_SITES = [
    "gov.uk",
    "legislation.gov.uk",
    "ofsted.gov.uk",
    "nice.org.uk",
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
]


def build_site_query(query: str, sites: list[str]) -> str:
    site_filters = " OR ".join(f"site:{site}" for site in sites)
    return f"{query} ({site_filters})"


def format_results(results: list[dict], authority_label: str) -> str:
    snippets = []

    for i, r in enumerate(results, start=1):
        title = (r.get("title") or "").strip()
        content = (r.get("content") or "").strip()
        url = (r.get("url") or "").strip()

        if not title and not content:
            continue

        if len(content) > 500:
            content = content[:500].rsplit(" ", 1)[0] + "..."

        snippets.append(
            f"[{authority_label} {i}] {title}\n"
            f"Snippet: {content}\n"
            f"Source: {url}"
        )

    return "\n\n".join(snippets)


def search_sites(query: str, sites: list[str], limit: int) -> list[dict]:
    safe_query = build_site_query(query, sites)

    results = client.search(
        query=safe_query,
        search_depth="advanced",
        max_results=limit,
    )

    if not results or "results" not in results:
        return []

    return results["results"]


def web_search(query: str, primary_limit: int = 3, secondary_limit: int = 2) -> str:
    primary_results = search_sites(query, PRIMARY_SITES, primary_limit)

    # If primary sources already returned enough useful results, use those only
    if len(primary_results) >= 2:
        return format_results(primary_results, "Primary")

    secondary_results = search_sites(query, SECONDARY_SITES, secondary_limit)

    parts = []

    if primary_results:
        parts.append(format_results(primary_results, "Primary"))

    if secondary_results:
        parts.append(format_results(secondary_results, "Secondary"))

    return "\n\n".join(part for part in parts if part)

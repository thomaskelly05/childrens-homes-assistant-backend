# assistant/web_search.py

import os
from tavily import TavilyClient

client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))


# Trusted UK safeguarding and residential care sources
TRUSTED_SITES = [

    # UK Government statutory guidance
    "gov.uk",

    # Ofsted inspection frameworks and guidance
    "ofsted.gov.uk",

    # NSPCC safeguarding research and resources
    "nspcc.org.uk",

    # Research in Practice (major residential care practice resource)
    "researchinpractice.org.uk",

    # Social Care Institute for Excellence
    "scie.org.uk",

    # UK legislation
    "legislation.gov.uk",

    # Department for Education publications
    "education.gov.uk",

    # Children's Commissioner reports
    "childrenscommissioner.gov.uk",

    # NICE guidance (relevant for mental health / care practice)
    "nice.org.uk",

    # Youth Justice Board guidance
    "yjboard.justice.gov.uk",

    # Local safeguarding partnerships often publish procedures here
    "proceduresonline.com",

    # British Association of Social Workers
    "basw.co.uk",

    # Community Care professional articles
    "communitycare.co.uk",

    # Care Quality Commission research crossover
    "cqc.org.uk",

    # National Children's Bureau
    "ncb.org.uk",

    # Anna Freud Centre (trauma & attachment research)
    "annafreud.org",

    # Attachment / trauma research
    "beaconhouse.org.uk",

    # Child safeguarding practice reviews
    "childrenscommissioner.gov.uk"
]


def build_safe_query(query: str):

    site_filters = " OR ".join([f"site:{site}" for site in TRUSTED_SITES])

    return f"{query} ({site_filters})"


def web_search(query: str, limit: int = 4):

    safe_query = build_safe_query(query)

    results = client.search(
        query=safe_query,
        search_depth="advanced",
        max_results=limit
    )

    if not results or "results" not in results:
        return ""

    snippets = []

    for i, r in enumerate(results["results"]):

        title = r.get("title", "")
        content = r.get("content", "")
        url = r.get("url", "")

        snippets.append(
            f"[{i+1}] {title}\n{content}\nSource: {url}"
        )

    return "\n\n".join(snippets)

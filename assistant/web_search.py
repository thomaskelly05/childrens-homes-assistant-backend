# assistant/web_search.py

import os
from tavily import TavilyClient

client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))


def web_search(query: str, limit: int = 3):

    results = client.search(
        query=query,
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

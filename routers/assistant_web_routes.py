from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from services.assistant_security import safe_string

router = APIRouter(prefix="/assistant/web", tags=["Assistant Web"])

MAX_QUERY_CHARS = 500


class WebSearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    query: str = Field(..., min_length=1, max_length=MAX_QUERY_CHARS)
    limit: int = Field(default=5, ge=1, le=8)
    search_depth: str = Field(default="basic", pattern="^(basic|advanced)$")


def _tavily_key() -> str | None:
    return os.getenv("TAVILY_API_KEY") or os.getenv("TAVILY_KEY")


def _serper_key() -> str | None:
    return os.getenv("SERPER_API_KEY") or os.getenv("GOOGLE_SERPER_API_KEY")


def _normalise_result(title: str, url: str, snippet: str, source: str) -> dict[str, str]:
    return {
        "title": safe_string(title)[:220] or "Web result",
        "url": safe_string(url)[:1000],
        "snippet": safe_string(snippet)[:900],
        "source": source,
    }


async def _search_tavily(query: str, limit: int, search_depth: str = "basic") -> tuple[list[dict[str, str]], str | None]:
    key = _tavily_key()
    if not key:
        return [], None
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": key,
                "query": query,
                "max_results": limit,
                "search_depth": search_depth,
                "include_answer": True,
                "include_raw_content": False,
            },
        )
        response.raise_for_status()
        payload = response.json()
    results = []
    for item in payload.get("results", [])[:limit]:
        results.append(_normalise_result(item.get("title"), item.get("url"), item.get("content"), "tavily"))
    return results, safe_string(payload.get("answer")) or None


async def _search_serper(query: str, limit: int) -> tuple[list[dict[str, str]], str | None]:
    key = _serper_key()
    if not key:
        return [], None
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": key, "Content-Type": "application/json"},
            json={"q": query, "num": limit},
        )
        response.raise_for_status()
        payload = response.json()
    results = []
    for item in payload.get("organic", [])[:limit]:
        results.append(_normalise_result(item.get("title"), item.get("link"), item.get("snippet"), "serper"))
    return results, None


@router.get("/diagnostics")
def diagnostics(current_user=Depends(require_assistant_access)):
    return {
        "ok": True,
        "web_search_available": bool(_tavily_key() or _serper_key()),
        "primary_provider": "tavily" if _tavily_key() else ("serper" if _serper_key() else None),
        "providers": {
            "tavily": bool(_tavily_key()),
            "serper": bool(_serper_key()),
        },
    }


@router.post("/search")
async def search_web(payload: WebSearchRequest, current_user=Depends(require_assistant_access)):
    query = safe_string(payload.query)
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required.")

    errors: list[str] = []
    results: list[dict[str, Any]] = []
    answer: str | None = None
    provider: str | None = None

    try:
      results, answer = await _search_tavily(query, payload.limit, payload.search_depth)
      if results or answer:
          provider = "tavily"
    except Exception as exc:
        errors.append(f"tavily: {exc}")

    if not results and not answer:
        try:
            results, answer = await _search_serper(query, payload.limit)
            if results:
                provider = "serper"
        except Exception as exc:
            errors.append(f"serper: {exc}")

    if not results and not answer and not (_tavily_key() or _serper_key()):
        return {
            "ok": True,
            "available": False,
            "message": "Web search is not configured yet. Add TAVILY_API_KEY to enable current web answers.",
            "results": [],
            "errors": [],
        }

    return {
        "ok": True,
        "available": bool(results or answer),
        "provider": provider,
        "query": query,
        "answer": answer,
        "results": results,
        "errors": errors,
    }

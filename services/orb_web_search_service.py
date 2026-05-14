from __future__ import annotations

import os
import re
from typing import Any
from urllib.parse import quote

import httpx


def _enabled(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _extract_location(message: str) -> str | None:
    text = message.strip()
    match = re.search(r"\b(?:in|for|near)\s+([A-Za-z][A-Za-z\s,.-]{1,60})", text)
    if match:
        return match.group(1).strip(" ?.")
    default_location = _text(os.getenv("ORB_DEFAULT_WEATHER_LOCATION"))
    return default_location or None


class OrbWebSearchService:
    """External current-fact tool foundation for Orb.

    No static model memory is used for live/current questions. If a provider is
    not configured, callers receive an explicit unavailable response.
    """

    def configured_tools(self) -> dict[str, bool]:
        return {
            "web_search": bool(os.getenv("ORB_WEB_SEARCH_ENDPOINT") and os.getenv("ORB_WEB_SEARCH_API_KEY")),
            "weather": bool(os.getenv("OPENWEATHER_API_KEY") or os.getenv("ORB_WEATHER_ENDPOINT")),
            "sports": bool(os.getenv("ORB_WEB_SEARCH_ENDPOINT") and os.getenv("ORB_WEB_SEARCH_API_KEY")),
            "news": bool(os.getenv("ORB_WEB_SEARCH_ENDPOINT") and os.getenv("ORB_WEB_SEARCH_API_KEY")),
        }

    async def answer(self, message: str, *, tool_hint: str | None = None) -> dict[str, Any]:
        lower = message.lower()
        if "weather" in lower or "forecast" in lower or tool_hint == "weather":
            return await self.weather(message)
        if any(term in lower for term in ("sport", "sports", "score", "fixture", "played last week", "newcastle")):
            return await self.web_search(f"sports current answer: {message}", category="sports")
        if any(term in lower for term in ("news", "latest", "current")):
            return await self.web_search(message, category="news")
        return await self.web_search(message, category=tool_hint or "web_search")

    async def weather(self, message: str) -> dict[str, Any]:
        location = _extract_location(message)
        endpoint = _text(os.getenv("ORB_WEATHER_ENDPOINT"))
        api_key = _text(os.getenv("OPENWEATHER_API_KEY"))
        if endpoint:
            return await self._generic_get(endpoint, {"q": location or "", "query": message}, "weather")
        if not api_key:
            return self._unavailable("weather", "Weather tool is not configured. Set OPENWEATHER_API_KEY or ORB_WEATHER_ENDPOINT.")
        if not location:
            return {
                "answer": "I can check weather when a location is supplied. Which town or postcode should I use?",
                "tools_used": ["weather"],
                "tool_status": "needs_location",
                "sources": [],
            }
        url = f"https://api.openweathermap.org/data/2.5/weather?q={quote(location)}&appid={quote(api_key)}&units=metric"
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(url)
        if response.status_code >= 400:
            return self._unavailable("weather", f"Weather provider returned {response.status_code}.")
        data = response.json()
        weather = (data.get("weather") or [{}])[0]
        main = data.get("main") or {}
        wind = data.get("wind") or {}
        answer = (
            f"Weather for {data.get('name') or location}: {weather.get('description') or 'conditions unavailable'}, "
            f"{main.get('temp')}C, feels like {main.get('feels_like')}C"
            f"{', wind ' + str(wind.get('speed')) + ' m/s' if wind.get('speed') is not None else ''}."
        )
        return {
            "answer": answer,
            "tools_used": ["weather"],
            "tool_status": "configured",
            "sources": [{"label": "OpenWeather current weather", "source_type": "weather", "source_id": data.get("id")}],
            "raw": {"provider": "openweather", "location": location},
        }

    async def web_search(self, query: str, *, category: str = "web_search") -> dict[str, Any]:
        endpoint = _text(os.getenv("ORB_WEB_SEARCH_ENDPOINT"))
        api_key = _text(os.getenv("ORB_WEB_SEARCH_API_KEY"))
        if not endpoint or not api_key:
            return self._unavailable(category, "External web/search tool is not configured. Set ORB_WEB_SEARCH_ENDPOINT and ORB_WEB_SEARCH_API_KEY.")
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"query": query, "category": category, "max_results": 5},
            )
        if response.status_code >= 400:
            return self._unavailable(category, f"Search provider returned {response.status_code}.")
        data = response.json()
        results = data.get("results") if isinstance(data, dict) else None
        sources = []
        lines = []
        for item in (results or [])[:5]:
            if not isinstance(item, dict):
                continue
            title = _text(item.get("title") or item.get("name") or item.get("url"))
            snippet = _text(item.get("snippet") or item.get("content") or item.get("summary"))
            url = _text(item.get("url") or item.get("link"))
            if title:
                lines.append(f"- {title}: {snippet or url}")
                sources.append({"label": title, "url": url, "source_type": category, "source_id": url or title})
        answer = "I checked the configured search tool.\n" + ("\n".join(lines) if lines else "No useful result snippets were returned.")
        return {"answer": answer, "tools_used": [category], "tool_status": "configured", "sources": sources, "raw": {"provider": endpoint}}

    async def _generic_get(self, endpoint: str, params: dict[str, str], category: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(endpoint, params=params)
        if response.status_code >= 400:
            return self._unavailable(category, f"{category.title()} provider returned {response.status_code}.")
        data = response.json()
        answer = _text(data.get("answer") if isinstance(data, dict) else data) or f"{category.title()} tool returned data."
        return {"answer": answer, "tools_used": [category], "tool_status": "configured", "sources": data.get("sources", []) if isinstance(data, dict) else [], "raw": data}

    def _unavailable(self, category: str, reason: str) -> dict[str, Any]:
        return {
            "answer": f"Realtime {category.replace('_', ' ')} is unavailable because {reason} I should not answer current facts from static memory.",
            "tools_used": [category],
            "tool_status": "unavailable",
            "sources": [],
        }


orb_web_search_service = OrbWebSearchService()


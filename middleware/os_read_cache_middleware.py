from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
from dataclasses import dataclass
from typing import Any

from starlette.datastructures import MutableHeaders
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

CACHEABLE_PREFIXES = (
    "/api/os/context",
    "/api/chronology",
    "/api/safeguarding",
    "/os/young-people",
    "/os/actions",
    "/os/evidence",
    "/os/documents",
    "/os/chronology",
    "/api/me/workspace",
    "/api/handover/today",
)

DEFAULT_TTL_SECONDS = float(os.getenv("OS_READ_CACHE_TTL_SECONDS", "12"))
MAX_ENTRIES = int(os.getenv("OS_READ_CACHE_MAX_ENTRIES", "500"))
MAX_BODY_BYTES = int(os.getenv("OS_READ_CACHE_MAX_BODY_BYTES", str(512 * 1024)))


@dataclass
class CacheEntry:
    expires_at: float
    status_code: int
    headers: dict[str, str]
    body: bytes


class OSReadCacheMiddleware(BaseHTTPMiddleware):
    """Tiny per-user response cache for expensive read-only OS endpoints.

    The Next frontend can issue many parallel RSC/prefetch requests for the same
    live care surfaces. This cache coalesces and reuses short-lived GET/HEAD
    responses by path, query string and authenticated cookie fingerprint. It is
    intentionally short TTL and only applies to selected read-only endpoints.
    """

    def __init__(self, app: Any) -> None:
        super().__init__(app)
        self._cache: dict[str, CacheEntry] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    async def dispatch(self, request: Request, call_next):
        if not self._cacheable(request):
            return await call_next(request)

        key = self._key(request)
        now = time.monotonic()
        entry = self._cache.get(key)
        if entry and entry.expires_at > now:
            return self._response(entry, hit=True)

        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            now = time.monotonic()
            entry = self._cache.get(key)
            if entry and entry.expires_at > now:
                return self._response(entry, hit=True)

            response = await call_next(request)
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
                if len(body) > MAX_BODY_BYTES:
                    headers = MutableHeaders(response.headers)
                    headers["x-indicare-cache"] = "skip-too-large"
                    return Response(content=body, status_code=response.status_code, headers=dict(headers), media_type=response.media_type)

            headers = dict(response.headers)
            headers.pop("content-length", None)
            headers.pop("set-cookie", None)
            if response.status_code == 200 and self._safe_content_type(headers):
                self._prune()
                self._cache[key] = CacheEntry(
                    expires_at=time.monotonic() + DEFAULT_TTL_SECONDS,
                    status_code=response.status_code,
                    headers=headers,
                    body=body,
                )
                headers["x-indicare-cache"] = "miss-store"
            else:
                headers["x-indicare-cache"] = "skip"
            return Response(content=body, status_code=response.status_code, headers=headers, media_type=response.media_type)

    def _cacheable(self, request: Request) -> bool:
        if request.method not in {"GET", "HEAD"}:
            return False
        if request.headers.get("x-indicare-cache-bypass") == "1":
            return False
        path = request.url.path
        return any(path == prefix or path.startswith(prefix + "/") for prefix in CACHEABLE_PREFIXES)

    def _key(self, request: Request) -> str:
        cookie = request.headers.get("cookie", "")
        auth = request.headers.get("authorization", "")
        user_scope = hashlib.sha256(f"{cookie}|{auth}".encode("utf-8")).hexdigest()[:20]
        query = request.url.query
        return f"{user_scope}:{request.method}:{request.url.path}?{query}"

    def _safe_content_type(self, headers: dict[str, str]) -> bool:
        content_type = headers.get("content-type", "")
        return "application/json" in content_type or content_type.startswith("text/") or not content_type

    def _response(self, entry: CacheEntry, *, hit: bool) -> Response:
        headers = dict(entry.headers)
        headers["x-indicare-cache"] = "hit" if hit else "miss"
        headers["age"] = str(max(0, int(DEFAULT_TTL_SECONDS - (entry.expires_at - time.monotonic()))))
        return Response(content=entry.body, status_code=entry.status_code, headers=headers)

    def _prune(self) -> None:
        now = time.monotonic()
        expired = [key for key, entry in self._cache.items() if entry.expires_at <= now]
        for key in expired:
            self._cache.pop(key, None)
            self._locks.pop(key, None)
        while len(self._cache) >= MAX_ENTRIES:
            oldest = next(iter(self._cache), None)
            if oldest is None:
                break
            self._cache.pop(oldest, None)
            self._locks.pop(oldest, None)

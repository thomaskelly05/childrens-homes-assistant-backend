from __future__ import annotations

from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from services.orb_build_version import ORB_BUILD_HEADER_PATHS, orb_build_response_headers


def _path_matches_orb_build_header(path: str) -> bool:
    if path in ORB_BUILD_HEADER_PATHS:
        return True
    trimmed = path.rstrip("/")
    return trimmed in ORB_BUILD_HEADER_PATHS or f"{trimmed}/" in ORB_BUILD_HEADER_PATHS


class OrbBuildHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        if _path_matches_orb_build_header(request.url.path):
            for key, value in orb_build_response_headers().items():
                response.headers.setdefault(key, value)
        return response

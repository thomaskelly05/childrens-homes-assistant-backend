from __future__ import annotations

import os
from typing import Iterable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

CSRF_EXEMPT_PATH_PREFIXES: tuple[str, ...] = (
    "/auth/login",
    "/auth/logout",
    "/health",
    "/debug",
    "/docs",
    "/redoc",
    "/openapi",
    "/openapi.json",
)

DEFAULT_ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}


def json_response(status_code: int, detail: str) -> Response:
    return Response(
        content=f'{{"ok":false,"detail":"{detail}"}}',
        status_code=status_code,
        media_type="application/json",
    )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "object-src 'none'; "
            "upgrade-insecure-requests"
        )

        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        *,
        csrf_cookie_name: str,
        session_cookie_name: str,
        allowed_origins: Iterable[str] | None = None,
    ):
        super().__init__(app)
        self.csrf_cookie_name = csrf_cookie_name
        self.session_cookie_name = session_cookie_name
        self.allowed_origins = set(allowed_origins or DEFAULT_ALLOWED_ORIGINS)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        if method in SAFE_METHODS or path.startswith(CSRF_EXEMPT_PATH_PREFIXES):
            return await call_next(request)

        # Only enforce CSRF for browser-authenticated session requests.
        session_cookie = request.cookies.get(self.session_cookie_name)
        if not session_cookie:
            return await call_next(request)

        origin = request.headers.get("origin")
        if origin and self.allowed_origins and origin not in self.allowed_origins:
            return json_response(403, "Origin not allowed")

        cookie_token = request.cookies.get(self.csrf_cookie_name)
        header_token = request.headers.get("X-CSRF-Token")
        session_token = request.session.get("csrf_token")

        # Compatibility mode:
        # Some existing sessions have the CSRF cookie but no session csrf_token.
        # Accept cookie + header match, then hydrate the session token.
        if cookie_token and header_token and cookie_token == header_token:
            if not session_token:
                request.session["csrf_token"] = cookie_token
            return await call_next(request)

        # Strict mode for fully hydrated sessions.
        if (
            cookie_token
            and header_token
            and session_token
            and cookie_token == header_token == session_token
        ):
            return await call_next(request)

        return json_response(403, "CSRF validation failed")

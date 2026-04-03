from __future__ import annotations

import os
from typing import Iterable

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT_PATH_PREFIXES: tuple[str, ...] = (
    "/auth/login",
    "/auth/logout",
    "/health",
    "/docs",
    "/openapi.json",
)
DEFAULT_ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}


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
        self.allowed_origins = set(allowed_origins or [])

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        if method in SAFE_METHODS or path.startswith(CSRF_EXEMPT_PATH_PREFIXES):
            return await call_next(request)

        # Only enforce if authenticated by session cookie.
        session_cookie = request.cookies.get(self.session_cookie_name)
        if not session_cookie:
            return await call_next(request)

        # Optional origin check
        origin = request.headers.get("origin")
        if origin and self.allowed_origins and origin not in self.allowed_origins:
            raise HTTPException(status_code=403, detail="Origin not allowed")

        cookie_token = request.cookies.get(self.csrf_cookie_name)
        header_token = request.headers.get("X-CSRF-Token")
        session_token = request.session.get("csrf_token")

        if not cookie_token or not header_token or not session_token:
            raise HTTPException(status_code=403, detail="CSRF validation failed")

        if not (cookie_token == header_token == session_token):
            raise HTTPException(status_code=403, detail="CSRF validation failed")

        return await call_next(request)

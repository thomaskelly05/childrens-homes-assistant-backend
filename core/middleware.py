import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from middleware.access_scope_middleware import AccessScopeMiddleware
from middleware.security_middleware import AuditLoggingMiddleware, SecurityHeadersMiddleware


def allowed_origins() -> list[str]:
    configured = os.getenv(
        "ALLOWED_ORIGINS",
        "https://app.indicare.co.uk,http://localhost:3000,http://127.0.0.1:3000",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def add_middlewares(app: FastAPI) -> None:
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-session-secret-change-me",
        same_site=os.getenv("COOKIE_SAMESITE", "lax").lower(),
        https_only=(os.getenv("COOKIE_SECURE", "true").lower() == "true"),
        max_age=60 * 60 * 24 * 14,
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuditLoggingMiddleware)
    app.add_middleware(AccessScopeMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Debug-Error", "x-api-key"],
    )

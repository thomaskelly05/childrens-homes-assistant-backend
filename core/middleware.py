import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from middleware.access_scope_middleware import AccessScopeMiddleware
from middleware.orb_residential_guard_middleware import OrbResidentialGuardMiddleware
from middleware.os_read_cache_middleware import OSReadCacheMiddleware
from middleware.orb_rate_limit_middleware import OrbRateLimitMiddleware
from middleware.security_middleware import AuditLoggingMiddleware, CsrfProtectionMiddleware, SecurityHeadersMiddleware

REQUIRED_PRODUCTION_ORIGINS = {
    "https://app.indicare.co.uk",
    "https://www.app.indicare.co.uk",
    "https://indicare-frontend-next.onrender.com",
}


def allowed_origins() -> list[str]:
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    default_origins = (
        "https://app.indicare.co.uk,https://www.app.indicare.co.uk,https://indicare-frontend-next.onrender.com"
        if app_env == "production"
        else "https://app.indicare.co.uk,https://www.app.indicare.co.uk,https://indicare-frontend-next.onrender.com,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    )
    configured = os.getenv(
        "ALLOWED_ORIGINS",
        default_origins,
    )
    origins = {origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip() and origin.strip() != "*"}
    origins.update(REQUIRED_PRODUCTION_ORIGINS)
    return sorted(origins)


def cookie_secure_default() -> bool:
    """Keep session middleware aligned with auth cookie behaviour.

    Production should default to secure cookies.
    Development/local environments should default to non-secure cookies so
    browsers will actually persist sessions over plain HTTP.
    """
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    is_production = app_env == "production"
    return os.getenv(
        "COOKIE_SECURE",
        "true" if is_production else "false",
    ).lower() == "true"


def session_middleware_secret() -> str:
    secret = os.getenv("SESSION_SECRET_KEY") or os.getenv("SECRET_KEY") or os.getenv("SESSION_SECRET")
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    if not secret:
        if app_env == "production":
            raise RuntimeError("SESSION_SECRET_KEY or SESSION_SECRET must be set in production")
        return "dev-session-secret-change-me"
    return secret


def add_middlewares(app: FastAPI) -> None:
    app.add_middleware(CsrfProtectionMiddleware)
    app.add_middleware(
        SessionMiddleware,
        secret_key=session_middleware_secret(),
        same_site=os.getenv("COOKIE_SAMESITE", "lax").lower(),
        https_only=cookie_secure_default(),
        max_age=60 * 60 * 24 * 14,
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuditLoggingMiddleware)
    app.add_middleware(OSReadCacheMiddleware)
    app.add_middleware(OrbResidentialGuardMiddleware)
    app.add_middleware(AccessScopeMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-CSRF-Token",
            "X-Debug-Error",
            "X-ORB-Surface",
            "x-api-key",
            "x-indicare-cache-bypass",
            "x-indicare-rsc",
        ],
    )
    app.add_middleware(OrbRateLimitMiddleware)
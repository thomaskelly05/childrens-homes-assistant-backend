import importlib
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from auth.legal_acceptance import CURRENT_LEGAL_VERSION
from auth.mfa_guard import (
    SESSION_USER_ID_KEY,
    is_mfa_verified_in_session,
    path_allowed_during_mfa,
    user_has_enabled_mfa,
)
from auth.routes import settings as auth_settings
from auth.tokens import decode_session_token
from db.connection import (
    close_db_pool,
    get_db_connection,
    init_db_pool,
    release_db_connection,
)
from db.legal_acceptance_db import (
    has_user_accepted_version,
    init_legal_acceptance_table,
)
from db.mfa_db import init_mfa_tables
from db.passkeys_db import init_passkeys_table
from security.middleware import CSRFMiddleware, SecurityHeadersMiddleware


@dataclass(frozen=True)
class Settings:
    app_env: str
    log_level: str
    session_secret: str
    openai_api_key: str
    database_url: str
    sentry_dsn: str | None
    sentry_traces_sample_rate: float
    sentry_profiles_sample_rate: float
    app_revision: str | None
    enable_https_redirect: bool
    enable_trusted_hosts: bool
    allowed_origins: list[str]
    allowed_hosts: list[str]

    @classmethod
    def load(cls) -> "Settings":
        required_env_vars = [
            "SESSION_SECRET",
            "OPENAI_API_KEY",
            "DATABASE_URL",
        ]
        missing = [key for key in required_env_vars if not os.getenv(key)]
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}"
            )

        app_env = os.getenv("APP_ENV", "production").strip().lower()
        if app_env not in {"development", "test", "staging", "production"}:
            app_env = "production"

        is_production = app_env == "production"

        allowed_origins = [
            origin.strip()
            for origin in os.getenv(
                "ALLOWED_ORIGINS",
                "https://app.indicare.co.uk,http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ]

        allowed_hosts = [
            host.strip()
            for host in os.getenv(
                "ALLOWED_HOSTS",
                "app.indicare.co.uk,childrens-homes-assistant-backend-new.onrender.com,localhost,127.0.0.1",
            ).split(",")
            if host.strip()
        ]

        try:
            sentry_traces_sample_rate = float(
                os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0")
            )
        except ValueError:
            sentry_traces_sample_rate = 1.0

        try:
            sentry_profiles_sample_rate = float(
                os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "1.0")
            )
        except ValueError:
            sentry_profiles_sample_rate = 1.0

        return cls(
            app_env=app_env,
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            session_secret=os.environ["SESSION_SECRET"],
            openai_api_key=os.environ["OPENAI_API_KEY"],
            database_url=os.environ["DATABASE_URL"],
            sentry_dsn=os.getenv("SENTRY_DSN"),
            sentry_traces_sample_rate=sentry_traces_sample_rate,
            sentry_profiles_sample_rate=sentry_profiles_sample_rate,
            app_revision=os.getenv("APP_REVISION"),
            enable_https_redirect=os.getenv(
                "ENABLE_HTTPS_REDIRECT",
                "true" if is_production else "false",
            ).strip().lower() == "true",
            enable_trusted_hosts=os.getenv(
                "ENABLE_TRUSTED_HOSTS",
                "true" if is_production else "false",
            ).strip().lower() == "true",
            allowed_origins=allowed_origins,
            allowed_hosts=allowed_hosts,
        )

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development_like(self) -> bool:
        return self.app_env in {"development", "test"}


settings = Settings.load()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("indicare.app")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")

SESSION_COOKIE_NAME = auth_settings.session_cookie_name
SESSION_SAMESITE = getattr(auth_settings, "cookie_samesite", "lax")

PUBLIC_PREFIXES = (
    "/login",
    "/login.html",
    "/mfa",
    "/mfa.html",
    "/mfa-setup",
    "/mfa-setup.html",
    "/mfa-recovery",
    "/mfa-recovery.html",
    "/auth/login",
    "/auth/logout",
    "/auth/check",
    "/auth/mfa",
    "/auth/auth-policy",
    "/auth/passkeys/authenticate/options",
    "/auth/passkeys/authenticate/verify",
    "/css",
    "/js",
    "/assets",
    "/components",
    "/static",
    "/favicon",
    "/docs",
    "/redoc",
    "/openapi",
    "/health",
)

PUBLIC_EXACT_PATHS = {
    "/",
}

LEGAL_ALLOWED_PREFIXES = (
    "/auth/logout",
    "/auth/check",
    "/auth/me",
    "/auth/legal-acceptance",
    "/auth/mfa",
    "/auth/passkeys",
)

ROUTERS = [
    "routers.auth_routes",
    "routers.mfa_routes",
    "routers.passkey_routes",
    "routers.legal_acceptance_routes",
    "routers.account_routes",
    "routers.admin_routes",
    "routers.billing_routes",
    "routers.ai_notes_routes",
    "routers.ai_note_templates_routes",
    "routers.ai_note_export_routes",
    "routers.assistant_general_routes",
    "routers.assistant_os_routes",
    "routers.chat_routes",
    "routers.document_library_routes",
    "routers.dashboard_routes",
    "routers.documents_routes",
    "routers.handover_routes",
    "routers.monthly_reviews_routes",
    "routers.ofsted_ai_report_routes",
    "routers.ofsted_pack_routes",
    "routers.reports_routes",
    "routers.risk_routes",
    "routers.staff_journal_routes",
    "routers.supervision_routes",
    "routers.tasks_routes",
    "routers.actions_routes",
    "routers.visibility_routes",
    "routers.document_rules_routes",
    "routers.document_ai_review_routes",
    "routers.document_ai_routes",
    "routers.manager_routes",
    "routers.home_inspection_compat_routes",
    "routers.young_people_profile_routes",
    "routers.young_people_daily_notes_routes",
    "routers.young_people_incidents_routes",
    "routers.young_people_health_routes",
    "routers.young_people_education_routes",
    "routers.young_people_family_routes",
    "routers.young_people_keywork_routes",
    "routers.young_people_plans_routes",
    "routers.young_people_risk_routes",
    "routers.young_people_chronology_routes",
    "routers.young_people_calendar_routes",
    "routers.young_people_appointments_routes",
    "routers.young_people_compliance_routes",
    "routers.young_people_standards_routes",
    "routers.young_people_handover_routes",
    "routers.young_people_reports_routes",
    "routers.young_people_photo_routes",
    "routers.young_people_statutory_documents_routes",
    "routers.workflow_review_routes",
    "routers.command_centre_routes",
    "routers.events_routes",
    "routers.evidence_routes",
    "routers.qa_routes",
    "routers.exports_routes",
    "routers.rostering_routes",
    "routers.academy_routes",
]


def configure_sentry() -> None:
    if not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profiles_sample_rate=settings.sentry_profiles_sample_rate,
        environment=settings.app_env,
        release=settings.app_revision,
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db_pool()
    init_legal_acceptance_table()
    init_mfa_tables()
    init_passkeys_table()
    logger.info(
        "IndiCare API started | env=%s revision=%s",
        settings.app_env,
        settings.app_revision,
    )
    try:
        yield
    finally:
        close_db_pool()
        logger.info("IndiCare API stopped")


def path_is_public(path: str) -> bool:
    if path in PUBLIC_EXACT_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


def path_allowed_during_legal_acceptance(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in LEGAL_ALLOWED_PREFIXES)


def wants_html(request: Request) -> bool:
    accept = (request.headers.get("accept") or "").lower()
    return "text/html" in accept


def get_request_session_token(request: Request) -> str | None:
    token = (request.cookies.get(SESSION_COOKIE_NAME) or "").strip()
    return token or None


def get_fully_authenticated_user_id_from_request(request: Request) -> int | None:
    token = get_request_session_token(request)
    payload = decode_session_token(token) if token else None

    if not payload:
        return None

    raw_user_id = payload.get("sub")
    try:
        token_user_id = int(raw_user_id) if raw_user_id is not None else None
    except (TypeError, ValueError):
        return None

    try:
        session_user_id = request.session.get(SESSION_USER_ID_KEY)
        if session_user_id is not None:
            session_user_id = int(session_user_id)
    except Exception:
        return None

    if not token_user_id or session_user_id != token_user_id:
        return None

    if not is_mfa_verified_in_session(request):
        return None

    return token_user_id


def get_request_id(request: Request) -> str:
    existing = getattr(request.state, "request_id", None)
    if existing:
        return existing
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    return request_id


def build_safe_internal_error_response() -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": "internal_server_error",
            "detail": "Something went wrong.",
        },
    )


class RequestContextLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = get_request_id(request)
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "Request failed | request_id=%s method=%s path=%s duration_ms=%s",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        user_id = None
        try:
            user_id = get_fully_authenticated_user_id_from_request(request)
        except Exception:
            user_id = None

        response.headers["X-Request-ID"] = request_id

        logger.info(
            "Request complete | request_id=%s method=%s path=%s status=%s user_id=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            user_id,
            duration_ms,
        )
        return response


class SecurityEnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path_is_public(path):
            return await call_next(request)

        user_id = get_fully_authenticated_user_id_from_request(request)

        if not user_id:
            mfa_pending = request.session.get("preauth_pending") is True

            if mfa_pending and path_allowed_during_mfa(path):
                return await call_next(request)

            if wants_html(request):
                if mfa_pending:
                    return RedirectResponse(url="/mfa", status_code=302)
                return RedirectResponse(url="/login", status_code=302)

            if mfa_pending:
                return JSONResponse(
                    status_code=401,
                    content={
                        "ok": False,
                        "detail": "MFA verification is required.",
                        "code": "mfa_verification_required",
                    },
                )

            return JSONResponse(
                status_code=401,
                content={
                    "ok": False,
                    "detail": "Authentication required.",
                    "code": "authentication_required",
                },
            )

        if not has_user_accepted_version(user_id, CURRENT_LEGAL_VERSION):
            if path_allowed_during_legal_acceptance(path):
                return await call_next(request)

            if wants_html(request):
                return RedirectResponse(url="/assistant", status_code=302)

            return JSONResponse(
                status_code=403,
                content={
                    "ok": False,
                    "detail": "Current legal terms must be accepted before using this feature.",
                    "code": "legal_acceptance_required",
                    "current_version": CURRENT_LEGAL_VERSION,
                },
            )

        if path_allowed_during_mfa(path):
            return await call_next(request)

        if not user_has_enabled_mfa(user_id):
            if wants_html(request):
                return RedirectResponse(url="/mfa-setup", status_code=302)
            return JSONResponse(
                status_code=403,
                content={
                    "ok": False,
                    "detail": "MFA setup is required before using the platform.",
                    "code": "mfa_setup_required",
                },
            )

        if not is_mfa_verified_in_session(request):
            if wants_html(request):
                return RedirectResponse(url="/mfa", status_code=302)
            return JSONResponse(
                status_code=403,
                content={
                    "ok": False,
                    "detail": "MFA verification is required before using the platform.",
                    "code": "mfa_verification_required",
                },
            )

        return await call_next(request)


def include_router(app: FastAPI, module_path: str) -> None:
    try:
        module = importlib.import_module(module_path)
    except Exception as exc:
        logger.exception("Failed to import router module: %s", module_path)
        raise RuntimeError(
            f"Failed to import router module: {module_path} | "
            f"{exc.__class__.__name__}: {str(exc)}"
        ) from exc

    main_router = getattr(module, "router", None)
    compat_router = getattr(module, "compat_router", None)

    if main_router is None:
        raise RuntimeError(f"No router found in {module_path}")

    app.include_router(main_router)
    logger.info("[IndiCare] Loaded router: %s (router)", module_path)

    if compat_router is not None:
        app.include_router(compat_router)
        logger.info("[IndiCare] Loaded router: %s (compat_router)", module_path)


def serve_page(file_name: str):
    path = os.path.join(FRONTEND_DIR, file_name)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Page not found"})
    return FileResponse(path)


def serve_academy_page(file_name: str):
    path = os.path.join(ACADEMY_DIR, file_name)
    if not os.path.exists(path):
        return JSONResponse(
            status_code=404,
            content={"error": "Academy page not found"},
        )
    return FileResponse(path)


def serve_component(file_name: str):
    path = os.path.join(COMPONENTS_DIR, file_name)
    if not os.path.exists(path):
        return JSONResponse(
            status_code=404,
            content={"error": "Component page not found"},
        )
    return FileResponse(path)


def register_page_route(app: FastAPI, route_path: str, file_name: str) -> None:
    def endpoint():
        return serve_page(file_name)

    endpoint.__name__ = (
        f"page_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    )
    app.get(route_path)(endpoint)


def register_academy_page_route(app: FastAPI, route_path: str, file_name: str) -> None:
    def endpoint():
        return serve_academy_page(file_name)

    endpoint.__name__ = (
        f"academy_page_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    )
    app.get(route_path)(endpoint)


def register_component_route(app: FastAPI, route_path: str, file_name: str) -> None:
    def endpoint():
        return serve_component(file_name)

    endpoint.__name__ = (
        f"component_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    )
    app.get(route_path)(endpoint)


def register_redirect_route(
    app: FastAPI,
    route_path: str,
    target: str,
    *,
    status_code: int = 302,
) -> None:
    def endpoint():
        return RedirectResponse(url=target, status_code=status_code)

    endpoint.__name__ = (
        f"redirect_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    )
    app.get(route_path)(endpoint)


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    def serve_index(request: Request):
        mfa_pending = request.session.get("preauth_pending") is True
        user_id = get_fully_authenticated_user_id_from_request(request)

        if mfa_pending:
            return RedirectResponse(url="/mfa", status_code=302)

        if not user_id:
            return RedirectResponse(url="/login", status_code=302)

        if not has_user_accepted_version(user_id, CURRENT_LEGAL_VERSION):
            return RedirectResponse(url="/assistant", status_code=302)

        if not user_has_enabled_mfa(user_id):
            return RedirectResponse(url="/mfa-setup", status_code=302)

        try:
            mfa_verified = is_mfa_verified_in_session(request)
        except Exception:
            mfa_verified = False

        if not mfa_verified:
            return RedirectResponse(url="/mfa", status_code=302)

        return RedirectResponse(url="/assistant", status_code=302)

    @app.head("/")
    def serve_index_head():
        return RedirectResponse(url="/login", status_code=302)

    for route_path in ("/assistant", "/assistant.html"):
        register_component_route(app, route_path, "assistant.html")

    for route_path in ("/command", "/command.html", "/home"):
        register_redirect_route(app, route_path, "/assistant")

    page_routes = {
        "/login": "login.html",
        "/login.html": "login.html",
        "/mfa": "mfa.html",
        "/mfa.html": "mfa.html",
        "/mfa-setup": "mfa-setup.html",
        "/mfa-setup.html": "mfa-setup.html",
        "/mfa-recovery": "mfa-recovery.html",
        "/mfa-recovery.html": "mfa-recovery.html",
        "/oslogin": "oslogin.html",
        "/oslogin.html": "oslogin.html",
        "/journal": "journal.html",
        "/journal.html": "journal.html",
        "/supervision": "supervision.html",
        "/supervision.html": "supervision.html",
        "/ai-notes": "ai-note.html",
        "/ai-note.html": "ai-note.html",
        "/young-people-page": "young-people.html",
        "/young-people-page.html": "young-people.html",
        "/young-people-shell": "young-people-shell.html",
        "/young-people-shell.html": "young-people-shell.html",
        "/childrens-home-os": "young-people-shell.html",
        "/childrens-home-os.html": "young-people-shell.html",
        "/rostering": "rostering.html",
        "/rostering.html": "rostering.html",
    }

    academy_page_routes = {
        "/academy": "academy.html",
        "/academy.html": "academy.html",
        "/academy-ui": "academy.html",
        "/academy-ui.html": "academy.html",
        "/academy/module-detail.html": "module-detail.html",
        "/academy/workbook-detail.html": "workbook-detail.html",
        "/academy/qualification-detail.html": "qualification-detail.html",
    }

    for route_path, file_name in page_routes.items():
        register_page_route(app, route_path, file_name)

    for route_path, file_name in academy_page_routes.items():
        register_academy_page_route(app, route_path, file_name)

    @app.get("/ai-notes.css")
    def serve_ai_notes_css():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))

    @app.get("/ai-notes.js")
    def serve_ai_notes_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))


def register_health_routes(app: FastAPI) -> None:
    @app.get("/health")
    def health():
        return {"ok": True}

    @app.get("/health/ready")
    def health_ready():
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
            return {"ok": True, "ready": True}
        except Exception:
            logger.exception("Readiness check failed")
            return JSONResponse(
                status_code=503,
                content={
                    "ok": False,
                    "ready": False,
                    "error": "service_unavailable",
                },
            )
        finally:
            release_db_connection(conn)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        request_id = get_request_id(request)

        logger.exception(
            "Unhandled error | request_id=%s method=%s path=%s type=%s detail=%s",
            request_id,
            request.method,
            request.url.path,
            exc.__class__.__name__,
            str(exc),
        )

        if settings.is_development_like:
            return JSONResponse(
                status_code=500,
                content={
                    "ok": False,
                    "error": "internal_server_error",
                    "detail": str(exc),
                    "exception_type": exc.__class__.__name__,
                    "request_id": request_id,
                },
            )

        response = build_safe_internal_error_response()
        response.headers["X-Request-ID"] = request_id
        return response


def create_app() -> FastAPI:
    configure_sentry()

    app = FastAPI(title="IndiCare API", lifespan=lifespan)

    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    if settings.enable_trusted_hosts and settings.allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.allowed_hosts,
        )

    if settings.enable_https_redirect:
        app.add_middleware(HTTPSRedirectMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    )

    app.add_middleware(SecurityHeadersMiddleware)

    app.add_middleware(
        CSRFMiddleware,
        csrf_cookie_name=auth_settings.csrf_cookie_name,
        session_cookie_name=auth_settings.session_cookie_name,
        allowed_origins=settings.allowed_origins,
    )

    app.add_middleware(SecurityEnforcementMiddleware)

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        same_site=SESSION_SAMESITE,
        https_only=auth_settings.cookie_secure,
        session_cookie="indicare_server_session",
        max_age=auth_settings.cookie_max_age_short,
    )

    app.add_middleware(RequestContextLoggingMiddleware)

    for route in ROUTERS:
        include_router(app, route)

    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")

    register_health_routes(app)
    register_exception_handlers(app)
    register_frontend_routes(app)

    return app


app = create_app()

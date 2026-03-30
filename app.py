import importlib
import logging
import os
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.sessions import SessionMiddleware

from auth.mfa_guard import (
    get_session_user_id,
    is_mfa_verified_in_session,
    path_allowed_during_mfa,
    user_has_enabled_mfa,
)
from db.connection import (
    close_db_pool,
    get_db_connection,
    init_db_pool,
    release_db_connection,
)
from db.legal_acceptance_db import init_legal_acceptance_table
from db.mfa_db import init_mfa_tables

# -----------------------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------------------

class Settings:
    def __init__(self):
        self.app_env = os.getenv("APP_ENV", "production")
        self.log_level = os.getenv("LOG_LEVEL", "INFO")

        self.session_secret = os.getenv("SESSION_SECRET")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.database_url = os.getenv("DATABASE_URL")

        self.sentry_dsn = os.getenv("SENTRY_DSN")
        self.sentry_traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0"))
        self.sentry_profiles_sample_rate = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "1.0"))
        self.app_revision = os.getenv("APP_REVISION")

        self.validate()

    def validate(self):
        required = ["session_secret", "openai_api_key", "database_url"]
        missing = [key for key in required if getattr(self, key) is None]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


settings = Settings()

# -----------------------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------------------

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

logger = logging.getLogger("indicare")

# -----------------------------------------------------------------------------
# SENTRY
# -----------------------------------------------------------------------------

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profiles_sample_rate=settings.sentry_profiles_sample_rate,
        environment=settings.app_env,
        release=settings.app_revision,
    )

# -----------------------------------------------------------------------------
# PATHS
# -----------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")

# -----------------------------------------------------------------------------
# LIFESPAN
# -----------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_pool()
    init_legal_acceptance_table()
    init_mfa_tables()
    logger.info("IndiCare API started")
    yield
    close_db_pool()
    logger.info("IndiCare API stopped")

# -----------------------------------------------------------------------------
# APP FACTORY
# -----------------------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)

    # Rate limiting
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Sessions
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        same_site="lax",
        https_only=settings.app_env == "production",
        max_age=60 * 60 * 12,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://app.indicare.co.uk",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_security_middleware(app)
    register_exception_handlers(app)
    register_routers(app)
    mount_static(app)
    register_frontend_routes(app)
    register_health_routes(app)

    return app

# -----------------------------------------------------------------------------
# SECURITY
# -----------------------------------------------------------------------------

PUBLIC_PREFIXES = (
    "/login", "/mfa", "/auth", "/css", "/js", "/assets", "/components",
    "/docs", "/openapi", "/health"
)

PUBLIC_EXACT = {"/"}


def is_public(path: str) -> bool:
    if path in PUBLIC_EXACT:
        return True
    return any(path.startswith(p) for p in PUBLIC_PREFIXES)


def wants_html(request: Request) -> bool:
    return "text/html" in (request.headers.get("accept") or "").lower()


def register_security_middleware(app: FastAPI):

    @app.middleware("http")
    async def security(request: Request, call_next):
        path = request.url.path
        user_id = get_session_user_id(request)

        if is_public(path):
            return await call_next(request)

        if not user_id:
            if wants_html(request):
                return RedirectResponse("/login")
            return JSONResponse(status_code=401, content={"error": "auth_required"})

        if path_allowed_during_mfa(path):
            return await call_next(request)

        if not user_has_enabled_mfa(user_id):
            return RedirectResponse("/mfa-setup")

        if not is_mfa_verified_in_session(request):
            return RedirectResponse("/mfa")

        return await call_next(request)

# -----------------------------------------------------------------------------
# ROUTERS
# -----------------------------------------------------------------------------

ROUTERS = [
    "routers.auth_routes",
    "routers.chat_routes",
    "routers.dashboard_routes",
    "routers.young_people_profile_routes",
    "routers.young_people_daily_notes_routes",
    "routers.young_people_incidents_routes",
    # (keep rest of your routers here)
]


def register_routers(app: FastAPI):
    for path in ROUTERS:
        try:
            module = importlib.import_module(path)
            router = getattr(module, "router", None)

            if not router:
                raise RuntimeError(f"No router in {path}")

            app.include_router(router)
            logger.info(f"Loaded router: {path}")

        except Exception as e:
            logger.exception(f"Failed loading router: {path}")
            raise

# -----------------------------------------------------------------------------
# STATIC + FRONTEND
# -----------------------------------------------------------------------------

def mount_static(app: FastAPI):
    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


def serve_page(file_name: str):
    path = os.path.join(FRONTEND_DIR, file_name)
    return FileResponse(path) if os.path.exists(path) else JSONResponse(status_code=404)


PAGES = {
    "/login": "login.html",
    "/mfa": "mfa.html",
    "/mfa-setup": "mfa-setup.html",
    "/journal": "journal.html",
    "/supervision": "supervision.html",
    "/rostering": "rostering.html",
    "/assistant": "components/assistant.html",
}


def register_frontend_routes(app: FastAPI):

    for route, file in PAGES.items():

        @app.get(route)
        def _(file=file):
            if "components/" in file:
                return FileResponse(os.path.join(COMPONENTS_DIR, file.split("/")[-1]))
            return serve_page(file)

# -----------------------------------------------------------------------------
# HEALTH
# -----------------------------------------------------------------------------

def register_health_routes(app: FastAPI):

    @app.get("/health")
    def health():
        return {
            "ok": True,
            "env": settings.app_env,
            "revision": settings.app_revision,
        }

    @app.get("/health/ready")
    def ready():
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()

            return {"ok": True, "ready": True}
        except Exception as e:
            return JSONResponse(status_code=503, content={"ok": False, "error": str(e)})
        finally:
            release_db_connection(conn)

# -----------------------------------------------------------------------------
# ERRORS
# -----------------------------------------------------------------------------

def register_exception_handlers(app: FastAPI):

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error")
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": "internal_server_error"},
        )

# -----------------------------------------------------------------------------
# APP
# -----------------------------------------------------------------------------

app = create_app()

import logging
import os
from datetime import datetime, timezone

from fastapi import FastAPI, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from core.frontend_routes import register_frontend_routes
from core.lifespan import lifespan
from core.middleware import add_middlewares
from core.router_loader import include_routers
from db.connection import DatabaseUnavailableError, get_db_status
from routers.ai_governance_routes import router as ai_governance_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("indicare.app")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_DIR = os.path.join(BASE_DIR, "frontend", "css")
JS_DIR = os.path.join(BASE_DIR, "frontend", "js")
ASSETS_DIR = os.path.join(BASE_DIR, "frontend", "assets")
COMPONENTS_DIR = os.path.join(BASE_DIR, "frontend", "components")
AI_SUITE_DIR = os.path.join(BASE_DIR, "frontend", "ai-suite")


def mount_core_static_assets(app: FastAPI) -> None:
    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


def mount_ai_suite_static_assets(app: FastAPI) -> None:
    app.mount("/ai-suite", StaticFiles(directory=AI_SUITE_DIR, html=True), name="ai_suite_assets")


def _serve_ai_suite_asset(filename: str):
    path = os.path.join(AI_SUITE_DIR, filename)
    return FileResponse(path) if os.path.exists(path) else {"ok": False, "error": f"{filename} not found"}


def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)
    add_middlewares(app)
    include_routers(app)
    app.include_router(ai_governance_router)
    mount_core_static_assets(app)

    @app.exception_handler(DatabaseUnavailableError)
    async def database_unavailable_handler(_request, _exc: DatabaseUnavailableError):
        return JSONResponse(
            status_code=503,
            content={"detail": "Database busy; please retry shortly."},
        )

    def health_payload(check: str = "health") -> dict:
        database = get_db_status()
        pool = database.get("pool") or {}
        pool_pressure = bool(database.get("pool_pressure"))
        service_status = "ok" if database.get("available") and not pool_pressure else "degraded"
        return {
            "ok": True,
            "status": service_status,
            "service": "indicare-os",
            "check": check,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "available": bool(database.get("available")),
                "pool_initialised": bool(database.get("pool_initialised")),
                "pool": {
                    "min": pool.get("min"),
                    "max": pool.get("max"),
                    "used": pool.get("used"),
                    "available": pool.get("available"),
                    "waiting": pool.get("waiting"),
                    "acquisition_failures": pool.get("acquisition_failures"),
                    "wait_timeout_seconds": pool.get("wait_timeout_seconds"),
                },
                "pool_pressure": pool_pressure,
                "last_error": database.get("last_error"),
            },
            "routes": {
                "assistant": "/assistant",
                "health": "/health",
                "root": "/",
                "ai_governance": "/api/ai/governance/status",
            },
        }

    @app.get("/health")
    def health():
        return health_payload()

    @app.get("/")
    def root_health():
        return JSONResponse(health_payload("root"))

    @app.head("/")
    def root_head():
        return Response(status_code=200)

    @app.get("/favicon.ico")
    def favicon():
        path = os.path.join(ASSETS_DIR, "favicon.ico")
        return FileResponse(path) if os.path.exists(path) else {"ok": True}

    @app.get("/indicare-suite.css")
    def ai_suite_legacy_css():
        return _serve_ai_suite_asset("indicare-suite.css")

    @app.get("/indicare-ai-suite-unified.css")
    def ai_suite_unified_css():
        return _serve_ai_suite_asset("indicare-ai-suite-unified.css")

    @app.get("/indicare-ai-suite-unified.js")
    def ai_suite_unified_js():
        return _serve_ai_suite_asset("indicare-ai-suite-unified.js")

    @app.get("/chatgpt-mobile-shell.css")
    def ai_suite_mobile_css():
        return _serve_ai_suite_asset("chatgpt-mobile-shell.css")

    @app.get("/chatgpt-design-guard.css")
    def ai_suite_design_guard_css():
        return _serve_ai_suite_asset("chatgpt-design-guard.css")

    register_frontend_routes(app)
    mount_ai_suite_static_assets(app)
    return app
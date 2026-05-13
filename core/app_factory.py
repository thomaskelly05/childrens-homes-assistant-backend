import logging
import os
from datetime import UTC, datetime

from fastapi import FastAPI, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from core.frontend_routes import register_frontend_routes
from core.lifespan import lifespan
from core.middleware import add_middlewares
from core.router_loader import include_routers

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
    mount_core_static_assets(app)

    def health_payload(check: str = "health") -> dict:
        return {
            "ok": True,
            "status": "ok",
            "service": "indicare-os",
            "check": check,
            "timestamp": datetime.now(UTC).isoformat(),
            "routes": {
                "assistant": "/assistant",
                "health": "/health",
                "root": "/",
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

import logging
import os

from fastapi import FastAPI
from fastapi.responses import FileResponse
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
    """Mount shared static folders used by both product surfaces."""
    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")


def mount_ai_suite_static_assets(app: FastAPI) -> None:
    """Mount AI Suite assets after explicit routes are registered.

    The explicit `/assistant`, `/assistant.html`, `/ai-suite` and `/ai-suite/`
    routes inject the AI runtime bridge. If this static mount is registered
    first, Starlette can serve `frontend/ai-suite/index.html` directly and the
    user sees an older/static AI Suite without the runtime wiring.
    """
    app.mount("/ai-suite", StaticFiles(directory=AI_SUITE_DIR, html=True), name="ai_suite_assets")


def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)
    add_middlewares(app)
    include_routers(app)
    mount_core_static_assets(app)

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.get("/favicon.ico")
    def favicon():
        path = os.path.join(ASSETS_DIR, "favicon.ico")
        return FileResponse(path) if os.path.exists(path) else {"ok": True}

    @app.get("/indicare-suite.css")
    def ai_suite_legacy_css():
        """Compatibility alias for older AI Suite HTML served from /assistant.

        The canonical stylesheet lives at /ai-suite/indicare-suite.css. Older
        cached or static HTML can still request indicare-suite.css relative to
        /assistant, which resolves to /indicare-suite.css and used to 404.
        """
        path = os.path.join(AI_SUITE_DIR, "indicare-suite.css")
        return FileResponse(path) if os.path.exists(path) else {"ok": False, "error": "AI Suite CSS not found"}

    register_frontend_routes(app)
    mount_ai_suite_static_assets(app)
    return app

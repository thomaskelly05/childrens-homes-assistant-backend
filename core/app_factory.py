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


def mount_static_assets(app: FastAPI) -> None:
    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    app.mount("/components", StaticFiles(directory=COMPONENTS_DIR), name="components")
    app.mount("/ai-suite", StaticFiles(directory=AI_SUITE_DIR, html=True), name="ai_suite")


def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)
    add_middlewares(app)
    include_routers(app)
    mount_static_assets(app)

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.get("/favicon.ico")
    def favicon():
        path = os.path.join(ASSETS_DIR, "favicon.ico")
        return FileResponse(path) if os.path.exists(path) else {"ok": True}

    register_frontend_routes(app)
    return app

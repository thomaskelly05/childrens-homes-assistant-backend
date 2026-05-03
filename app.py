import importlib
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from db.connection import close_db_pool, init_db_pool
from db.legal_acceptance_db import init_legal_acceptance_table
from db.mfa_db import init_mfa_tables
from db.partner_assistant_db import init_partner_assistant_tables
from db.passkeys_db import init_passkeys_table

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("indicare.app")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")

ROUTERS = [
    "routers.auth_routes",
    "routers.operational_intelligence_routes",
]

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db_pool()
    init_legal_acceptance_table()
    init_mfa_tables()
    init_passkeys_table()
    init_partner_assistant_tables()
    yield
    close_db_pool()


def include_router(app: FastAPI, module_path: str) -> None:
    module = importlib.import_module(module_path)
    router = getattr(module, "router", None)
    if router:
        app.include_router(router)


def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)

    for route in ROUTERS:
        include_router(app, route)

    return app

app = create_app()

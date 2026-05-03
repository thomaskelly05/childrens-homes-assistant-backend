import importlib
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from middleware.access_scope_middleware import AccessScopeMiddleware
from middleware.security_middleware import AuditLoggingMiddleware, SecurityHeadersMiddleware

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
    "routers.mfa_routes",
    "routers.passkey_routes",
    "routers.legal_acceptance_routes",
    "routers.debug_health_routes",
    "routers.security_routes",
    "routers.frontend_compat",
    "routers.young_people_shell_item_compat_routes",
    "routers.account_routes",
    "routers.admin_routes",
    "routers.assistant_general_routes",
    "routers.assistant_os_routes",
    "routers.operational_intelligence_routes",
    "routers.inspection_os_routes",
    "routers.rm_dashboard_routes",
    "routers.live_alerts_routes",
]

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db_pool()
    yield
    close_db_pool()


def include_router(app: FastAPI, module_path: str) -> None:
    module = importlib.import_module(module_path)
    app.include_router(module.router)


def create_app() -> FastAPI:
    app = FastAPI(title="IndiCare API", lifespan=lifespan)

    app.add_middleware(SessionMiddleware, secret_key="dev")
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuditLoggingMiddleware)
    app.add_middleware(AccessScopeMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for route in ROUTERS:
        include_router(app, route)

    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

    return app

app = create_app()

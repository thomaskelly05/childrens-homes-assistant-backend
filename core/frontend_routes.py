import os
import time

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

from core.app_shell import inject_app_shell

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")
CSS_DIR = os.path.join(FRONTEND_DIR, "css")
AI_SUITE_DIR = os.path.join(FRONTEND_DIR, "ai-suite")
CARE_OS_PATH = "/os-command"
WORKSPACE_FILE = "indicare-workspace.html"
COMMAND_SHELL_FILE = "os-command-runtime.html"
LEGACY_COMMAND_SHELL_FILE = "os-command.html"
AI_SUITE_ROUTES = {"/assistant", "/assistant.html", "/ai-suite", "/ai-suite/"}
AI_SUITE_ASSET_NAMES = {
    "indicare-suite.css",
    "indicare-ai-suite-unified.css",
    "indicare-ai-suite-unified.js",
    "indicare-orb-ai.js",
    "indicare-orb-projects.js",
    "indicare-intelligence-runtime.js",
    "indicare-intelligence-immersive.js",
    "indicare-connect-runtime.js",
    "indicare-docs-notes-runtime.js",
    "indicare-actions-runtime.js",
    "indicare-conversations-runtime.js",
    "indicare-memory-runtime.js",
    "indicare-ai-suite-loader.js",
    "indicare-ai-suite-boundary.js",
    "indicare-ai-suite-bootstrap.js",
    "indicare-ai-suite.css",
    "chatgpt-mobile-shell.css",
    "chatgpt-design-guard.css",
}

LEGACY_CARE_OS_PATHS = {
    "/young-people-shell",
    "/young-people-shell.html",
    "/childrens-home-os",
    "/childrens-home-os.html",
    "/command",
    "/command.html",
    "/home",
    "/home.html",
}


def _root_path(request: Request | None = None) -> str:
    if not request:
        return ""
    root_path = request.scope.get("root_path") or ""
    return root_path.rstrip("/")


def _public_path(path: str, request: Request | None = None) -> str:
    root_path = _root_path(request)
    return f"{root_path}{path if path.startswith('/') else '/' + path}"


def ai_suite_asset_names() -> set[str]:
    if not os.path.isdir(AI_SUITE_DIR):
        return set(AI_SUITE_ASSET_NAMES)
    return {
        name
        for name in os.listdir(AI_SUITE_DIR)
        if os.path.isfile(os.path.join(AI_SUITE_DIR, name)) and not name.startswith(".")
    } | AI_SUITE_ASSET_NAMES


def ai_suite_asset_version() -> str:
    return str(int(time.time()))


def inject_ai_suite_runtime(html: str, request: Request | None = None) -> str:
    version = ai_suite_asset_version()
    root = _root_path(request)
    css_href = f"{root}/ai-suite/indicare-ai-suite-unified.css?v={version}"
    js_src = f"{root}/ai-suite/indicare-ai-suite-unified.js?v={version}"

    html = html.replace("indicare-ai-suite-unified.css", f"indicare-ai-suite-unified.css?v={version}")
    html = html.replace("indicare-ai-suite-unified.js", f"indicare-ai-suite-unified.js?v={version}")

    if css_href not in html:
        html = html.replace("</head>", f'<link rel="stylesheet" href="{css_href}">\n</head>')

    if js_src not in html:
        html = html.replace("</body>", f'<script src="{js_src}"></script>\n</body>')

    if 'data-indicare-ai-suite' not in html:
        html = html.replace('<body', '<body data-indicare-ai-suite="true"', 1)

    return html


def _load_html(filename: str) -> str:
    path = os.path.join(FRONTEND_DIR, filename)
    if not os.path.exists(path):
        return "<html><body><h1>Frontend missing</h1></body></html>"
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/login")

    @app.get("/login")
    @app.get("/login.html")
    async def login_page():
        return HTMLResponse(_load_html("login.html"))

    @app.get(CARE_OS_PATH)
    @app.get(f"{CARE_OS_PATH}/")
    async def os_command_surface():
        html = _load_html(COMMAND_SHELL_FILE)
        if "Frontend missing" in html:
            html = _load_html(LEGACY_COMMAND_SHELL_FILE)
        return HTMLResponse(html)

    @app.get("/assistant")
    @app.get("/assistant.html")
    @app.get("/ai-suite")
    @app.get("/ai-suite/")
    async def assistant_surface(request: Request):
        html = _load_html("assistant.html")
        html = inject_ai_suite_runtime(html, request)
        return HTMLResponse(html)

    @app.get("/young-people-shell")
    @app.get("/young-people-shell.html")
    async def legacy_young_people_shell_redirect():
        return RedirectResponse(url="/assistant", status_code=302)

    @app.get("/academy")
    async def academy_index():
        index_path = os.path.join(ACADEMY_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse({"ok": False, "error": "Academy not found"}, status_code=404)

    @app.get("/health/frontend")
    async def frontend_health():
        return {
            "ok": True,
            "frontend": True,
            "default_route": "/login",
            "login_route": True,
            "os_command_route": True,
            "assistant_assets_forced_fresh": True,
            "ai_suite_assets": sorted(list(ai_suite_asset_names())),
        }

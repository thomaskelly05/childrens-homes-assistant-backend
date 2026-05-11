import os

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
    "indicare-orb-ai.js",
    "indicare-orb-projects.js",
    "indicare-intelligence-runtime.js",
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

AI_SUITE_RUNTIME_SCRIPTS = [
    '<script src="/js/indicare-runtime-safe.js"></script>',
    '<script src="/js/indicare-runtime-safety.js"></script>',
    '<script src="/js/indicare-operational-intelligence.js"></script>',
    '<script src="/js/indicare-intelligence-migration-bridge.js"></script>',
    '<script src="/js/os-floating-assistant.js"></script>',
]


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
    newest = 0
    for asset_name in ai_suite_asset_names():
        path = os.path.join(AI_SUITE_DIR, asset_name)
        if os.path.exists(path):
            newest = max(newest, int(os.path.getmtime(path)))
    return str(newest or 1)


def ai_suite_asset_base(request: Request | None = None) -> str:
    return _public_path("/ai-suite/", request)


def ai_suite_asset_url(asset_name: str, request: Request | None = None) -> str:
    return f"{ai_suite_asset_base(request)}{asset_name}?v={ai_suite_asset_version()}"


def inject_ai_suite_asset_config(html: str, request: Request | None = None) -> str:
    version = ai_suite_asset_version()
    asset_base = ai_suite_asset_base(request)
    replacements = {
        "__AI_SUITE_ASSET_BASE__": asset_base,
        "__AI_SUITE_ASSET_VERSION__": version,
        "__AI_SUITE_CSS_HREF__": ai_suite_asset_url("indicare-suite.css", request),
    }
    for needle, value in replacements.items():
        html = html.replace(needle, value)
    root_path = _root_path(request)
    if root_path:
        html = html.replace('href="/ai-suite/', f'href="{root_path}/ai-suite/')
        html = html.replace('src="/ai-suite/', f'src="{root_path}/ai-suite/')
    config = (
        "<script>window.__INDICARE_AI_SUITE_ASSET_BASE__="
        f"{asset_base!r};window.__INDICARE_AI_SUITE_ASSET_VERSION__={version!r};"
        "window.IndiCareAISuiteAssets=window.IndiCareAISuiteAssets||"
        "{basePath:window.__INDICARE_AI_SUITE_ASSET_BASE__,version:window.__INDICARE_AI_SUITE_ASSET_VERSION__,"
        "resolve:function(file){var clean=String(file||'').replace(/^\\/+/, '');var url=this.basePath+clean;"
        "return this.version?url+(url.indexOf('?')>-1?'&':'?')+'v='+encodeURIComponent(this.version):url;},"
        "candidates:function(file){return [this.resolve(file)];}};</script>"
    )
    if "window.IndiCareAISuiteAssets" not in html:
        html = html.replace("</head>", f"  {config}\n</head>")
    return html


def _inject_once(html: str, snippets: list[str], marker: str) -> str:
    injection = "\n".join(snippet for snippet in snippets if snippet not in html)
    if not injection:
        return html
    if marker in html:
        return html.replace(marker, f"  {injection}\n{marker}")
    return f"{html}\n{injection}\n"


def inject_ai_suite_runtime(html: str, request: Request | None = None) -> str:
    # AI Suite is intentionally standalone, but it still needs the shared orb,
    # runtime safety and canonical intelligence bridge. Do not inject the full
    # OS shell or OS workspace layers here.
    html = inject_ai_suite_asset_config(html, request)
    html = html.replace('<body', '<body data-indicare-ai-suite="true"', 1) if 'data-indicare-ai-suite' not in html else html
    snippets = [_public_path(script.replace('<script src="', '').replace('"></script>', ''), request) for script in AI_SUITE_RUNTIME_SCRIPTS]
    snippets = [f'<script src="{src}?v={ai_suite_asset_version()}"></script>' for src in snippets]
    return _inject_once(html, snippets, "</body>")


def serve_html(path: str):
    with open(path, encoding="utf-8") as file:
        html = file.read()
    if os.path.basename(path) == "login.html":
        html = html.replace('const DEFAULT_REDIRECT = "/young-people-shell.html";', 'const DEFAULT_REDIRECT = "/os-command";')
        html = html.replace('const DEFAULT_REDIRECT = "/young-people-shell";', 'const DEFAULT_REDIRECT = "/os-command";')
        html = html.replace('const DEFAULT_REDIRECT = "/care-os";', 'const DEFAULT_REDIRECT = "/os-command";')
        html = html.replace('const DEFAULT_REDIRECT = "/os-dashboard";', 'const DEFAULT_REDIRECT = "/os-command";')
    return HTMLResponse(inject_app_shell(html))


def serve_ai_suite(path: str, request: Request | None = None):
    with open(path, encoding="utf-8") as file:
        html = file.read()
    return HTMLResponse(inject_ai_suite_runtime(html, request), headers={"Cache-Control": "no-store"})


def serve_from(paths: list[str], error: str = "Page not found"):
    for path in paths:
        if os.path.exists(path):
            return serve_html(path) if path.lower().endswith(".html") else FileResponse(path)
    return JSONResponse(status_code=404, content={"error": error})


def serve_ai_suite_from(paths: list[str], error: str = "AI Suite page not found", request: Request | None = None):
    for path in paths:
        if os.path.exists(path):
            return serve_ai_suite(path, request) if path.lower().endswith(".html") else FileResponse(path)
    return JSONResponse(status_code=404, content={"error": error})


def register_file_route(app: FastAPI, route_path: str, paths: list[str], name_prefix: str = "page") -> None:
    def endpoint():
        return serve_from(paths, "Page not found")

    endpoint.__name__ = f"{name_prefix}_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    app.get(route_path)(endpoint)


def register_ai_suite_route(app: FastAPI, route_path: str, paths: list[str], name_prefix: str = "ai_suite") -> None:
    def endpoint(request: Request):
        return serve_ai_suite_from(paths, "AI Suite page not found", request)

    endpoint.__name__ = f"{name_prefix}_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    app.get(route_path)(endpoint)


def frontend(file_name: str) -> list[str]:
    return [os.path.join(FRONTEND_DIR, file_name)]


def ai_suite(file_name: str) -> list[str]:
    return [os.path.join(AI_SUITE_DIR, file_name)]


def workspace() -> list[str]:
    return frontend(WORKSPACE_FILE)


def command_shell() -> list[str]:
    # Prefer the new stable runtime shell. Keep the old shell as a safe fallback.
    return [
        os.path.join(FRONTEND_DIR, COMMAND_SHELL_FILE),
        os.path.join(FRONTEND_DIR, LEGACY_COMMAND_SHELL_FILE),
    ]


def component(file_name: str) -> list[str]:
    return [os.path.join(COMPONENTS_DIR, file_name)]


def academy(file_name: str) -> list[str]:
    return [os.path.join(ACADEMY_DIR, file_name), os.path.join(FRONTEND_DIR, file_name)]


def get_page_routes() -> dict[str, list[str]]:
    return {
        "/login": frontend("login.html"),
        "/login.html": frontend("login.html"),
        "/mfa": frontend("mfa.html"),
        "/mfa.html": frontend("mfa.html"),
        "/mfa-setup": frontend("mfa-setup.html"),
        "/mfa-setup.html": frontend("mfa-setup.html"),
        "/mfa-recovery": frontend("mfa-recovery.html"),
        "/mfa-recovery.html": frontend("mfa-recovery.html"),
        "/oslogin": frontend("oslogin.html"),
        "/oslogin.html": frontend("oslogin.html"),
        "/access-denied": frontend("access-denied.html"),
        "/access-denied.html": frontend("access-denied.html"),
        "/security-centre": frontend("security-centre.html"),
        "/security-centre.html": frontend("security-centre.html"),
        "/os-command": command_shell(),
        "/os-command.html": command_shell(),
        "/ai-suite": ai_suite("index.html"),
        "/ai-suite/": ai_suite("index.html"),
        "/care-os": command_shell(),
        "/care-os.html": command_shell(),
        "/os-child": command_shell(),
        "/os-child.html": command_shell(),
        "/os-risk": command_shell(),
        "/os-risk.html": command_shell(),
        "/os-safeguarding": command_shell(),
        "/os-safeguarding.html": command_shell(),
        "/os-ofsted": command_shell(),
        "/os-ofsted.html": command_shell(),
        "/young-people": command_shell(),
        "/young-people.html": command_shell(),
        "/young-people-page": command_shell(),
        "/young-people-page.html": command_shell(),
        "/os-dashboard": command_shell(),
        "/os-dashboard.html": command_shell(),
        "/documents-hub": command_shell(),
        "/documents-hub.html": command_shell(),
        "/safeguarding-hub": command_shell(),
        "/safeguarding-hub.html": command_shell(),
        "/quality-hub": command_shell(),
        "/quality-hub.html": command_shell(),
        "/staff-dashboard": command_shell(),
        "/manager-dashboard": command_shell(),
        "/ri-dashboard": command_shell(),
        "/provider-dashboard": command_shell(),
        "/rostering": command_shell(),
        "/rostering.html": command_shell(),
        "/tasks-ui": frontend("tasks-ui.html"),
        "/tasks-ui.html": frontend("tasks-ui.html"),
        "/notifications-ui": frontend("notifications-ui.html"),
        "/notifications-ui.html": frontend("notifications-ui.html"),
        "/journal": frontend("journal.html"),
        "/journal.html": frontend("journal.html"),
        "/supervision": frontend("supervision.html"),
        "/supervision.html": frontend("supervision.html"),
        "/ai-notes": frontend("ai-note.html"),
        "/ai-note.html": frontend("ai-note.html"),
        "/founder-hq": frontend("founder-hq.html"),
        "/founder-hq.html": frontend("founder-hq.html"),
        "/admin-users": frontend("admin-users.html"),
        "/admin-users.html": frontend("admin-users.html"),
        "/assistant": ai_suite("index.html"),
        "/assistant.html": ai_suite("index.html"),
        "/academy": academy("academy.html"),
        "/academy.html": academy("academy.html"),
        "/academy-ui": academy("academy.html"),
        "/academy-ui.html": academy("academy.html"),
        "/academy/intelligence.html": academy("intelligence.html"),
        "/academy/module-detail.html": academy("module-detail.html"),
        "/academy/workbook-detail.html": academy("workbook-detail.html"),
        "/academy/qualification-detail.html": academy("qualification-detail.html"),
        "/academy/module-list.html": academy("module-list.html"),
        "/academy/qualification-list.html": academy("qualification-list.html"),
        "/academy/manager-compliance.html": academy("manager-compliance.html"),
        "/academy/evidence-portfolio.html": academy("evidence-portfolio.html"),
        "/academy/certificates.html": academy("certificates.html"),
        "/staff-profile.html": frontend("staff-profile.html"),
        "/my-profile": frontend("staff-profile.html"),
        "/my-profile.html": frontend("staff-profile.html"),
        "/staff-profiles": component("staff-profiles.html"),
        "/staff-profiles.html": component("staff-profiles.html"),
    }


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    def root():
        return RedirectResponse(url="/login", status_code=302)

    for legacy_path in sorted(LEGACY_CARE_OS_PATHS):
        def redirect_legacy(path=legacy_path):
            return RedirectResponse(url=CARE_OS_PATH, status_code=302)
        redirect_legacy.__name__ = f"redirect_legacy_{legacy_path.strip('/').replace('-', '_').replace('.', '_')}"
        app.get(legacy_path)(redirect_legacy)

    for route_path, paths in get_page_routes().items():
        if route_path in LEGACY_CARE_OS_PATHS:
            continue

        if route_path in AI_SUITE_ROUTES:
            register_ai_suite_route(app, route_path, paths, 'ai_suite')
        else:
            register_file_route(app, route_path, paths, 'page')


    @app.get("/ai-suite/__asset-diagnostics")
    def ai_suite_asset_diagnostics(request: Request):
        version = ai_suite_asset_version()
        assets = {
            asset_name: {
                "exists": os.path.exists(os.path.join(AI_SUITE_DIR, asset_name)),
                "url": ai_suite_asset_url(asset_name, request),
            }
            for asset_name in sorted(ai_suite_asset_names())
        }
        return JSONResponse({
            "asset_base": ai_suite_asset_base(request),
            "version": version,
            "assets": assets,
        })

    @app.get("/ai-suite/{asset_name:path}")
    def ai_suite_asset(asset_name: str):
        clean_name = os.path.basename(asset_name)
        if clean_name != asset_name:
            return JSONResponse(status_code=404, content={"error": "AI Suite asset not found", "asset": asset_name})
        path = os.path.join(AI_SUITE_DIR, clean_name)
        if not os.path.exists(path) or not os.path.isfile(path):
            return JSONResponse(status_code=404, content={"error": "AI Suite asset missing", "asset": clean_name})
        return FileResponse(
            path,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-IndiCare-AI-Suite-Asset-Version": ai_suite_asset_version(),
            },
        )

    @app.get("/css/indicare-os-design-system.css")
    def indicare_os_design_system_css():
        return FileResponse(os.path.join(CSS_DIR, "indicare-os-design-system.css"))

    @app.get("/ai-notes.css")
    def ai_notes_css():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))

    @app.get("/ai-notes.js")
    def ai_notes_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))

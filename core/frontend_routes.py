import os

from fastapi import FastAPI
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


def serve_html(path: str):
    with open(path, encoding="utf-8") as file:
        html = file.read()
    if os.path.basename(path) == "login.html":
        html = html.replace('const DEFAULT_REDIRECT = "/young-people-shell.html";', 'const DEFAULT_REDIRECT = "/os-command";')
        html = html.replace('const DEFAULT_REDIRECT = "/young-people-shell";', 'const DEFAULT_REDIRECT = "/os-command";')
        html = html.replace('const DEFAULT_REDIRECT = "/care-os";', 'const DEFAULT_REDIRECT = "/os-command";')
        html = html.replace('const DEFAULT_REDIRECT = "/os-dashboard";', 'const DEFAULT_REDIRECT = "/os-command";')
    return HTMLResponse(inject_app_shell(html))


def serve_ai_suite(path: str):
    with open(path, encoding="utf-8") as file:
        html = file.read()
    # Standalone AI Suite intentionally bypasses the OS shell injection.
    return HTMLResponse(html)


def serve_from(paths: list[str], error: str = "Page not found"):
    for path in paths:
        if os.path.exists(path):
            return serve_html(path) if path.lower().endswith(".html") else FileResponse(path)
    return JSONResponse(status_code=404, content={"error": error})


def serve_ai_suite_from(paths: list[str], error: str = "AI Suite page not found"):
    for path in paths:
        if os.path.exists(path):
            return serve_ai_suite(path) if path.lower().endswith(".html") else FileResponse(path)
    return JSONResponse(status_code=404, content={"error": error})


def register_file_route(app: FastAPI, route_path: str, paths: list[str], name_prefix: str = "page") -> None:
    def endpoint():
        return serve_from(paths, "Page not found")

    endpoint.__name__ = f"{name_prefix}_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    app.get(route_path)(endpoint)


def register_ai_suite_route(app: FastAPI, route_path: str, paths: list[str], name_prefix: str = "ai_suite") -> None:
    def endpoint():
        return serve_ai_suite_from(paths, "AI Suite page not found")

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

        # Primary full-height IndiCare OS runtime shell.
        "/os-command": command_shell(),
        "/os-command.html": command_shell(),

        # Standalone AI Suite conversational product.
        "/ai-suite": ai_suite("index.html"),
        "/ai-suite/": ai_suite("index.html"),

        # Other operating routes can still fall back to the wider workspace until
        # each one is migrated into the new shell.
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

        # Standalone legacy/support pages kept available.
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
        "/assistant": component("assistant-cockpit.html"),
        "/assistant.html": component("assistant-cockpit.html"),
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

        if route_path.startswith('/ai-suite'):
            register_ai_suite_route(app, route_path, paths, 'ai_suite')
        else:
            register_file_route(app, route_path, paths, 'page')

    @app.get("/css/indicare-os-design-system.css")
    def indicare_os_design_system_css():
        return FileResponse(os.path.join(CSS_DIR, "indicare-os-design-system.css"))

    @app.get("/ai-notes.css")
    def ai_notes_css():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))

    @app.get("/ai-notes.js")
    def ai_notes_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))

import os

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

from core.app_shell import inject_app_shell

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")
CARE_OS_PATH = "/care-os"
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
        html = html.replace('const DEFAULT_REDIRECT = "/young-people-shell.html";', 'const DEFAULT_REDIRECT = "/care-os";')
        html = html.replace('const DEFAULT_REDIRECT = "/young-people-shell";', 'const DEFAULT_REDIRECT = "/care-os";')
    return HTMLResponse(inject_app_shell(html))


def serve_from(paths: list[str], error: str = "Page not found"):
    for path in paths:
        if os.path.exists(path):
            return serve_html(path) if path.lower().endswith(".html") else FileResponse(path)
    return JSONResponse(status_code=404, content={"error": error})


def register_file_route(app: FastAPI, route_path: str, paths: list[str], name_prefix: str = "page") -> None:
    def endpoint():
        return serve_from(paths, "Page not found")

    endpoint.__name__ = f"{name_prefix}_{route_path.strip('/').replace('-', '_').replace('.', '_') or 'root'}"
    app.get(route_path)(endpoint)


def frontend(file_name: str) -> list[str]:
    return [os.path.join(FRONTEND_DIR, file_name)]


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
        "/care-os": frontend("care-os.html"),
        "/care-os.html": frontend("care-os.html"),
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
        "/young-people": frontend("young-people.html"),
        "/young-people.html": frontend("young-people.html"),
        "/young-people-page": frontend("young-people.html"),
        "/young-people-page.html": frontend("young-people.html"),
        "/os-dashboard": frontend("os-dashboard.html"),
        "/os-dashboard.html": frontend("os-dashboard.html"),
        "/documents-hub": frontend("documents-hub.html"),
        "/documents-hub.html": frontend("documents-hub.html"),
        "/safeguarding-hub": frontend("safeguarding-hub.html"),
        "/safeguarding-hub.html": frontend("safeguarding-hub.html"),
        "/quality-hub": frontend("quality-hub.html"),
        "/quality-hub.html": frontend("quality-hub.html"),
        "/staff-dashboard": frontend("os-dashboard.html"),
        "/manager-dashboard": frontend("os-dashboard.html"),
        "/ri-dashboard": frontend("os-dashboard.html"),
        "/provider-dashboard": frontend("os-dashboard.html"),
        "/rostering": frontend("rostering.html"),
        "/rostering.html": frontend("rostering.html"),
        "/founder-hq": frontend("founder-hq.html"),
        "/founder-hq.html": frontend("founder-hq.html"),
        "/admin-users": frontend("admin-users.html"),
        "/admin-users.html": frontend("admin-users.html"),
        "/assistant": component("assistant.html"),
        "/assistant.html": component("assistant.html"),
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
        register_file_route(app, route_path, paths, "page")

    @app.get("/ai-notes.css")
    def ai_notes_css():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.css"))

    @app.get("/ai-notes.js")
    def ai_notes_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "ai-notes.js"))

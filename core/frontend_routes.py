import os

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

from core.app_shell import inject_app_shell

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
COMPONENTS_DIR = os.path.join(FRONTEND_DIR, "components")
CARE_OS_PATH = "/os-command"
WORKSPACE_FILE = "indicare-workspace.html"
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


def workspace() -> list[str]:
    return frontend(WORKSPACE_FILE)


def component(file_name: str) -> list[str]:
    return [os.path.join(COMPONENTS_DIR, file_name)]


def academy(file_name: str) -> list[str]:
    return [os.path.join(ACADEMY_DIR, file_name), os.path.join(FRONTEND_DIR, file_name)]


def get_page_routes() -> dict[str, list[str]]:
    return {
        "/assistant": component("assistant-cockpit.html"),
        "/assistant.html": component("assistant-cockpit.html"),
    }

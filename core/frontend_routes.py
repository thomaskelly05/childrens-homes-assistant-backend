import os

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
INDICARE_AI_DIR = os.path.join(BASE_DIR, "indicare-ai")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
CARE_OS_PATH = "/os-command"
COMMAND_SHELL_FILE = "os-command-runtime.html"
LEGACY_COMMAND_SHELL_FILE = "os-command.html"


def _load_html(directory: str, filename: str) -> str:
    path = os.path.join(directory, filename)
    if not os.path.exists(path):
        return "<html><body><h1>Frontend missing</h1></body></html>"
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def _ai_asset(filename: str, media_type: str) -> FileResponse:
    return FileResponse(os.path.join(INDICARE_AI_DIR, filename), media_type=media_type)


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/login")

    @app.get("/login")
    @app.get("/login.html")
    async def login_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "login.html"))

    @app.get(CARE_OS_PATH)
    @app.get(f"{CARE_OS_PATH}/")
    async def os_command_surface():
        html = _load_html(FRONTEND_DIR, COMMAND_SHELL_FILE)
        if "Frontend missing" in html:
            html = _load_html(FRONTEND_DIR, LEGACY_COMMAND_SHELL_FILE)
        return HTMLResponse(html)

    @app.get("/assistant")
    @app.get("/assistant.html")
    async def assistant_surface():
        return HTMLResponse(_load_html(INDICARE_AI_DIR, "assistant.html"))

    @app.get("/indicare-ai/assistant.css")
    async def indicare_ai_css():
        return _ai_asset("assistant.css", "text/css")

    @app.get("/indicare-ai/assistant-pro.css")
    async def indicare_ai_pro_css():
        return _ai_asset("assistant-pro.css", "text/css")

    @app.get("/indicare-ai/assistant-bridge.js")
    async def indicare_ai_bridge():
        return _ai_asset("assistant-bridge.js", "application/javascript")

    @app.get("/indicare-ai/intelligence-voice.js")
    async def indicare_ai_voice():
        return _ai_asset("intelligence-voice.js", "application/javascript")

    @app.get("/indicare-ai/assistant-streaming.js")
    async def indicare_ai_streaming():
        return _ai_asset("assistant-streaming.js", "application/javascript")

    @app.get("/indicare-ai/assistant-runtime.js")
    async def indicare_ai_runtime():
        return _ai_asset("assistant-runtime.js", "application/javascript")

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
            "assistant_runtime": "indicare-ai",
            "assistant_assets": "isolated",
            "assistant_bridge": True,
            "assistant_streaming": True,
            "assistant_voice": True,
            "assistant_pro_design": True,
            "login_route": True,
            "assistant_route": True,
            "os_command_route": True,
        }

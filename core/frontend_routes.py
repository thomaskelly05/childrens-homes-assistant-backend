import os
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
INDICARE_AI_DIR = os.path.join(BASE_DIR, "indicare-ai")
ACADEMY_DIR = os.path.join(FRONTEND_DIR, "academy")
CARE_OS_PATH = "/os-command"
COMMAND_SHELL_FILE = "os-command-runtime.html"
COMMAND_SHELL_VERSION = "single-shell-2026-05-12"

NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}

ASSISTANT_REQUIRED_ASSETS = [
    "assistant.html",
    "assistant.css",
    "assistant-pro.css",
    "voice-presence.css",
    "assistant-runtime.js",
    "realtime/openai-realtime-voice.js",
    "realtime/runtime-orchestrator.js",
    "realtime/openai-voice-runtime-bootstrap.js",
    "realtime/audio-stream-controller.js",
    "realtime/voice-activity-detector.js",
    "realtime/turn-taking-controller.js",
    "realtime/conversation-memory-store.js",
    "realtime/reconnect-orchestrator.js",
    "realtime/speech-synthesis-stream.js",
]


def _load_html(directory: str, filename: str) -> str:
    path = os.path.join(directory, filename)
    if not os.path.exists(path):
        return "<html><body><h1>Frontend missing</h1></body></html>"
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def _load_required_html(directory: str, filename: str) -> str:
    path = os.path.join(directory, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=503, detail=f"Required frontend shell missing: {filename}")
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def _assert_single_os_shell(html: str) -> None:
    blocked_fragments = [
        "<link",
        "operating-system-resilience",
        "existing-journey-runtime",
        "os-modern-workspace-orchestrator",
        "os-chronology-first-layout-runtime",
        "os-runtime-verification-runtime",
        "os-enterprise-data-hydration-runtime",
        "os-operational-notification-runtime",
        "os-realtime-operations-runtime",
        "os-operational-audit-runtime",
        "runtime debugging",
        "context wall",
        "mutationobserver",
        "websocket",
        "overflow:hidden",
    ]
    lowered = html.lower()
    for fragment in blocked_fragments:
        if fragment in lowered:
            raise HTTPException(
                status_code=503,
                detail=f"OS command shell includes disabled legacy runtime fragment: {fragment}",
            )

    script_tags = re.findall(r"<script\\b[^>]*>", html, flags=re.IGNORECASE)
    external_scripts = [tag for tag in script_tags if re.search(r"\\bsrc\\s*=", tag, flags=re.IGNORECASE)]
    if external_scripts:
        raise HTTPException(
            status_code=503,
            detail="OS command shell must not load external runtime scripts",
        )
    if len(script_tags) > 1:
        raise HTTPException(
            status_code=503,
            detail="OS command shell may contain only one safe inline interaction script",
        )

    # Strict shell marker enforcement temporarily disabled during shell stabilisation.


def _ai_asset(filename: str, media_type: str) -> FileResponse:
    root = Path(INDICARE_AI_DIR).resolve()
    path = (root / filename).resolve()
    if root not in path.parents and path != root:
        return JSONResponse({"ok": False, "error": "Invalid asset path", "asset": filename}, status_code=404)
    if not path.exists() or not path.is_file():
        return JSONResponse({"ok": False, "error": "Asset not found", "asset": filename}, status_code=404)
    return FileResponse(path, media_type=media_type)


def _assistant_asset_audit() -> dict:
    root = Path(INDICARE_AI_DIR)
    assets = {}
    missing = []
    for name in ASSISTANT_REQUIRED_ASSETS:
        path = root / name
        exists = path.exists()
        assets[name] = {"exists": exists, "size": path.stat().st_size if exists else 0}
        if not exists:
            missing.append(name)
    return {"ok": not missing, "missing": missing, "assets": assets}


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/login")

    @app.get("/login")
    @app.get("/login.html")
    async def login_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "login.html"), headers=NO_STORE_HEADERS)

    @app.get(CARE_OS_PATH)
    @app.get(f"{CARE_OS_PATH}/")
    async def os_command_surface():
        html = _load_required_html(FRONTEND_DIR, COMMAND_SHELL_FILE)
        _assert_single_os_shell(html)
        headers = {**NO_STORE_HEADERS, "X-IndiCare-Shell": COMMAND_SHELL_VERSION}
        return HTMLResponse(html, headers=headers)

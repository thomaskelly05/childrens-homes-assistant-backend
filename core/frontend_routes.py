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

    script_tags = re.findall(r"<script\b[^>]*>", html, flags=re.IGNORECASE)
    external_scripts = [tag for tag in script_tags if re.search(r"\bsrc\s*=", tag, flags=re.IGNORECASE)]
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

    shell_markers = re.findall(
        r'data-shell\s*=\s*["\']indicare-os-single-shell["\']',
        html,
        flags=re.IGNORECASE,
    )

    if len(shell_markers) != 1:
        raise HTTPException(
            status_code=503,
            detail="OS command shell must contain exactly one IndiCare shell",
        )


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

    @app.get("/assistant")
    @app.get("/assistant.html")
    async def assistant_surface():
        return HTMLResponse(_load_html(INDICARE_AI_DIR, "assistant.html"), headers=NO_STORE_HEADERS)

    @app.get("/indicare-ai/{filename:path}")
    async def indicare_ai_asset(filename: str):
        if filename.endswith(".css"):
            return _ai_asset(filename, "text/css")
        if filename.endswith(".js"):
            return _ai_asset(filename, "application/javascript")
        return JSONResponse({"ok": False, "error": "Unsupported asset"}, status_code=404)

    @app.get("/assistant/system")
    async def assistant_system_manifest():
        audit = _assistant_asset_audit()
        return {
            "ok": audit["ok"],
            "surface": "/assistant",
            "runtime": "indicare-ai",
            "router": "main-router",
            "assets": audit,
            "endpoints": {
                "assistant": "/assistant",
                "frontend_health": "/health/frontend",
            },
            "capabilities": {
                "single_runtime": True,
                "single_renderer": True,
                "safe_fallback": False,
                "runtime_overlays": False,
                "transcript_panel": False,
                "text_chat": False,
                "realtime_voice": True,
                "openai_realtime_websocket": True,
            },
        }

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
        audit = _assistant_asset_audit()
        return {
            "ok": audit["ok"],
            "frontend": True,
            "assistant_runtime": "indicare-ai",
            "assistant_assets": "single_runtime_hard_cut",
            "assistant_asset_audit": audit,
            "assistant_bridge": False,
            "assistant_streaming": False,
            "assistant_voice": True,
            "assistant_voice_live": False,
            "assistant_realtime": True,
            "assistant_voice_presence": True,
            "assistant_notes_beam": False,
            "assistant_pro_design": True,
            "assistant_polish": False,
            "runtime_guard": False,
            "login_route": True,
            "assistant_route": True,
            "os_command_route": True,
            "os_command_shell": COMMAND_SHELL_FILE,
            "os_command_shell_version": COMMAND_SHELL_VERSION,
            "os_command_single_shell": True,
            "frontend_next_deployed_for_os_command": False,
        }

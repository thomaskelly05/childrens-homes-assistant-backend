import os
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
    "assistant-polish.css",
    "runtime-guard.css",
    "runtime-guard.js",
    "assistant-bridge.js",
    "assistant-streaming.js",
    "assistant-runtime.js",
    "intelligence-voice.js",
    "intelligence-voice-live.js",
    "realtime-conversation.js",
    "realtime-webrtc.js",
    "realtime-readiness.js",
    "realtime-production-check.js",
    "realtime-launch-audit.js",
    "voice-soundscape.js",
    "voice-audio-reactor.js",
    "voice-presence.css",
    "voice-reactive.css",
    "voice-emotion-engine.js",
    "voice-emotion.css",
    "voice-identity-engine.js",
    "proactive-intelligence.js",
    "proactive-intelligence.css",
    "longitudinal-memory.js",
    "agi-reasoning-engine.js",
    "enterprise-telemetry.js",
    "voice-mobile-runtime.js",
    "native-runtime.css",
    "notes-beam.js",
    "notes-beam.css",
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
        "<script",
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
        "overflow:hidden",
    ]
    lowered = html.lower()
    for fragment in blocked_fragments:
        if fragment in lowered:
            raise HTTPException(
                status_code=503,
                detail=f"OS command shell includes disabled legacy runtime fragment: {fragment}",
            )
    if html.count('data-shell="indicare-os-single-shell"') != 1:
        raise HTTPException(status_code=503, detail="OS command shell must contain exactly one IndiCare shell")


def _ai_asset(filename: str, media_type: str) -> FileResponse:
    path = os.path.join(INDICARE_AI_DIR, filename)
    if not os.path.exists(path):
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

    @app.get("/indicare-ai/{filename}")
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
                "safe_chat": "/assistant/general-safe",
                "stream_chat": "/assistant/general/stream",
                "realtime_session": "/assistant/realtime/session",
                "realtime_health": "/assistant/realtime/health",
                "frontend_health": "/health/frontend",
            },
            "capabilities": {
                "runtime_guard": True,
                "safe_fallback": True,
                "streaming": True,
                "realtime_voice": True,
                "webrtc": True,
                "notes_beam": True,
                "longitudinal_memory": True,
                "enterprise_telemetry": True,
                "launch_audit": True,
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
            "assistant_assets": "isolated_dynamic",
            "assistant_asset_audit": audit,
            "assistant_bridge": True,
            "assistant_streaming": True,
            "assistant_voice": True,
            "assistant_voice_live": True,
            "assistant_realtime": True,
            "assistant_voice_presence": True,
            "assistant_notes_beam": True,
            "assistant_pro_design": True,
            "assistant_polish": True,
            "runtime_guard": True,
            "login_route": True,
            "assistant_route": True,
            "os_command_route": True,
            "os_command_shell": COMMAND_SHELL_FILE,
            "os_command_shell_version": COMMAND_SHELL_VERSION,
            "os_command_single_shell": True,
            "frontend_next_deployed_for_os_command": False,
        }

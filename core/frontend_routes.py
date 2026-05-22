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
    "orb.html",
    "orb-care-companion.css",
    "orb-care-companion-config.js",
    "orb-care-companion-runtime-v2.js",
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

STANDALONE_ORB_REQUIRED_ASSETS = [
    "orb.html",
    "orb-care-companion.css",
    "orb-care-companion-config.js",
    "orb-care-companion-runtime-v2.js",
    "realtime/openai-voice-runtime-bootstrap.js",
    "realtime/openai-realtime-voice.js",
    "realtime/runtime-orchestrator.js",
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


def _media_type_for_ai_asset(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".css":
        return "text/css"
    if suffix == ".js":
        return "text/javascript"
    if suffix == ".html":
        return "text/html"
    if suffix == ".svg":
        return "image/svg+xml"
    if suffix == ".png":
        return "image/png"
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    return "application/octet-stream"


def _ai_asset(filename: str, media_type: str | None = None) -> FileResponse:
    root = Path(INDICARE_AI_DIR).resolve()
    path = (root / filename).resolve()
    if root not in path.parents and path != root:
        return JSONResponse({"ok": False, "error": "Invalid asset path", "asset": filename}, status_code=404)
    if not path.exists() or not path.is_file():
        return JSONResponse({"ok": False, "error": "Asset not found", "asset": filename}, status_code=404)
    return FileResponse(path, media_type=media_type or _media_type_for_ai_asset(filename))


def _asset_audit(asset_names: list[str]) -> dict:
    root = Path(INDICARE_AI_DIR)
    assets = {}
    missing = []
    for name in asset_names:
        path = root / name
        exists = path.exists()
        assets[name] = {"exists": exists, "size": path.stat().st_size if exists else 0}
        if not exists:
            missing.append(name)
    return {"ok": not missing, "missing": missing, "assets": assets}


def _assistant_asset_audit() -> dict:
    return _asset_audit(ASSISTANT_REQUIRED_ASSETS)


def _standalone_orb_asset_audit() -> dict:
    audit = _asset_audit(STANDALONE_ORB_REQUIRED_ASSETS)
    audit["surface"] = "orb_standalone"
    audit["route"] = "/orb"
    audit["api"] = [
        "/orb/standalone/config",
        "/orb/standalone/conversation",
        "/orb/standalone/health",
    ]
    audit["os_linked"] = False
    audit["care_record_access"] = False
    return audit


def register_frontend_routes(app: FastAPI) -> None:
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/login")

    @app.get("/indicare-ai/{filename:path}")
    async def indicare_ai_asset(filename: str):
        return _ai_asset(filename)

    @app.get("/assistant")
    @app.get("/assistant.html")
    async def assistant_page():
        return HTMLResponse(_load_required_html(INDICARE_AI_DIR, "assistant.html"), headers=NO_STORE_HEADERS)

    @app.get("/orb")
    @app.get("/orb.html")
    async def orb_page():
        return HTMLResponse(_load_required_html(INDICARE_AI_DIR, "orb.html"), headers=NO_STORE_HEADERS)

    @app.get("/assistant/assets/audit")
    async def assistant_asset_audit():
        return JSONResponse(_assistant_asset_audit())

    @app.get("/orb/assets/audit")
    async def standalone_orb_asset_audit():
        return JSONResponse(_standalone_orb_asset_audit())

    @app.get("/login")
    @app.get("/login.html")
    async def login_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "login.html"), headers=NO_STORE_HEADERS)

    @app.get("/mfa")
    @app.get("/mfa.html")
    async def mfa_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "mfa.html"), headers=NO_STORE_HEADERS)

    @app.get("/mfa-setup")
    @app.get("/mfa-setup.html")
    async def mfa_setup_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "mfa-setup.html"), headers=NO_STORE_HEADERS)

    @app.get("/mfa-recovery")
    @app.get("/mfa-recovery.html")
    async def mfa_recovery_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "mfa-recovery.html"), headers=NO_STORE_HEADERS)

    @app.get(CARE_OS_PATH)
    @app.get(f"{CARE_OS_PATH}/")
    async def os_command_surface():
        html = _load_required_html(FRONTEND_DIR, COMMAND_SHELL_FILE)
        _assert_single_os_shell(html)
        headers = {**NO_STORE_HEADERS, "X-IndiCare-Shell": COMMAND_SHELL_VERSION}
        return HTMLResponse(html, headers=headers)

    @app.get("/document-os")
    @app.get("/document-os.html")
    async def document_os_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "document-os.html"), headers=NO_STORE_HEADERS)

    @app.get("/inspection-mode")
    @app.get("/inspection-mode.html")
    async def inspection_mode_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "inspection-mode.html"), headers=NO_STORE_HEADERS)

    @app.get("/safeguarding-flow")
    @app.get("/safeguarding-flow.html")
    async def safeguarding_flow_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "safeguarding-flow.html"), headers=NO_STORE_HEADERS)

    @app.get("/provider-dashboard")
    @app.get("/provider-dashboard.html")
    async def provider_dashboard_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "provider-dashboard.html"), headers=NO_STORE_HEADERS)

    @app.get("/child-journey")
    @app.get("/child-journey.html")
    async def child_journey_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "child-journey.html"), headers=NO_STORE_HEADERS)

    @app.get("/chronology-view")
    @app.get("/chronology-view.html")
    async def chronology_view_page():
        return HTMLResponse(_load_html(FRONTEND_DIR, "chronology-view.html"), headers=NO_STORE_HEADERS)

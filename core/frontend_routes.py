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

AI_SUITE_RUNTIME_SCRIPTS = [
    '<script src="/js/indicare-runtime-safe.js"></script>',
    '<script src="/js/indicare-runtime-safety.js"></script>',
    '<script src="/js/indicare-operational-intelligence.js"></script>',
    '<script src="/js/indicare-intelligence-migration-bridge.js"></script>',
    '<script src="/js/os-floating-assistant.js"></script>',
    '<script src="/ai-suite/indicare-intelligence-immersive.js"></script>',
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
    html = inject_ai_suite_asset_config(html, request)
    html = html.replace('<body', '<body data-indicare-ai-suite="true"', 1) if 'data-indicare-ai-suite' not in html else html
    snippets = [_public_path(script.replace('<script src="', '').replace('"></script>', ''), request) for script in AI_SUITE_RUNTIME_SCRIPTS]
    snippets = [f'<script src="{src}?v={ai_suite_asset_version()}"></script>' for src in snippets]
    return _inject_once(html, snippets, "</body>")

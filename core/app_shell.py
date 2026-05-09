APP_SHELL_STYLES = [
    '<link rel="stylesheet" href="/css/indicare-app-shell.css" />',
    '<link rel="stylesheet" href="/css/login-enterprise.css" />',
]

# Keep global frontend boot order explicit and centralised.
# Page HTML should not manually include these shared shell scripts.
APP_SHELL_SCRIPTS = [
    '<script src="/js/api.js"></script>',
    '<script src="/js/auth.js"></script>',
    '<script src="/js/core/permissions.js"></script>',
    '<script src="/js/core/route-guard.js"></script>',
    '<script src="/js/staff-os-nav.js"></script>',
    '<script src="/js/login-security-gateway.js"></script>',
]

OS_COMMAND_RUNTIME_SCRIPTS = [
    '<script>window.IndiCareOSBoot=function(){try{window.state=typeof state!=="undefined"?state:window.state;window.loadAll=typeof loadAll!=="undefined"?loadAll:window.loadAll;window.toast=typeof toast!=="undefined"?toast:window.toast;}catch(e){console.warn("OS boot bridge failed",e);}};window.IndiCareOSBoot();</script>',
    '<script src="/js/indicare-connect-realtime.js"></script>',
    '<script src="/js/os-floating-assistant.js"></script>',
    '<script src="/js/document-intelligence-upload.js"></script>',
    '<script src="/js/reg44-report-reader-workspace.js"></script>',
    '<script src="/js/os-child-workspace-tabs.js"></script>',
    '<script src="/js/os-therapeutic-record-creator.js"></script>',
]


def _inject_once(html: str, snippets: list[str], marker: str) -> str:
    injection = "\n".join(snippet for snippet in snippets if snippet not in html)
    if not injection:
        return html
    if marker in html:
        return html.replace(marker, f"  {injection}\n{marker}")
    return f"{html}\n{injection}\n"


def _looks_like_os_command_runtime(html: str) -> bool:
    return "IndiCare OS" in html and "child-workspace" in html and "os-command" in html


def inject_app_shell(html: str) -> str:
    html = _inject_once(html, APP_SHELL_STYLES, "</head>")
    if _looks_like_os_command_runtime(html):
        html = _inject_once(html, OS_COMMAND_RUNTIME_SCRIPTS, "</body>")
    html = _inject_once(html, APP_SHELL_SCRIPTS, "</body>")
    return html

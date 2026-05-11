APP_SHELL_STYLES = [
    '<link rel="stylesheet" href="/css/indicare-app-shell.css" />',
    '<link rel="stylesheet" href="/css/login-enterprise.css" />',
]

APP_SHELL_SCRIPTS = [
    '<script src="/js/api.js"></script>',
    '<script src="/js/auth.js"></script>',
    '<script src="/js/core/permissions.js"></script>',
    '<script src="/js/core/route-guard.js"></script>',
    '<script src="/js/staff-os-nav.js"></script>',
    '<script src="/js/login-security-gateway.js"></script>',
]

# The OS command runtime is its own full-screen application shell.
# Only safe operational layers should be auto-injected.
OS_COMMAND_CORE_SCRIPTS = [
    '<script src="/js/api.js"></script>',
    '<script src="/js/auth.js"></script>',
    '<script src="/js/core/permissions.js"></script>',
    '<script src="/js/core/route-guard.js"></script>',
]

OS_COMMAND_RUNTIME_SCRIPTS = [
    '<script src="/js/indicare-runtime-safe.js"></script>',
    '<script src="/js/indicare-runtime-safety.js"></script>',
    '<script>window.IndiCareSafe?.run("OS boot",()=>{window.state=typeof state!=="undefined"?state:window.state;window.loadAll=typeof loadAll!=="undefined"?loadAll:window.loadAll;window.toast=typeof toast!=="undefined"?toast:window.toast;});</script>',
    '<script src="/js/indicare-operational-intelligence.js"></script>',
    '<script src="/js/os-floating-assistant.js"></script>',
    '<script src="/js/os-therapeutic-record-creator.js"></script>',
    '<script src="/js/os-child-workspace-tabs.js"></script>',
    '<script src="/js/chronology-visual-timeline.js"></script>',
    '<script src="/js/os-command-ui-bridge.js"></script>',
    '<script src="/js/os-safe-operational-links.js"></script>',
    '<script src="/js/os-operational-intelligence-reconnect.js"></script>',
    '<script src="/js/os-safe-contextual-navigation.js"></script>',
    '<script src="/js/os-final-reconnect-polish.js"></script>',
]

# Experimental or shell-mutating systems remain optional.
OS_COMMAND_OPTIONAL_ENHANCEMENTS = [
    '<script src="/js/document-intelligence-upload.js"></script>',
    '<script src="/js/reg44-report-reader-workspace.js"></script>',
    '<script src="/js/indicare-connected-care-experience.js"></script>',
    '<script src="/js/indicare-workspace-groups.js"></script>',
    '<script src="/js/daily-living-workspace-refinement.js"></script>',
    '<script src="/js/oversight-intelligence-dashboard.js"></script>',
    '<script src="/js/indicare-production-readiness-bridge.js"></script>',
    '<script src="/js/os-contextual-navigation.js"></script>',
]


def _inject_once(html: str, snippets: list[str], marker: str) -> str:
    injection = "\n".join(snippet for snippet in snippets if snippet not in html)
    if not injection:
        return html
    if marker in html:
        return html.replace(marker, f"  {injection}\n{marker}")
    return f"{html}\n{injection}\n"


def _looks_like_os_command_runtime(html: str) -> bool:
    checks = [
        'data-indicare-os-runtime="true"',
        'child-workspace',
        'IndiCare OS',
        'data-child-workspace',
        'os-command',
        'Connected care workspace',
    ]
    return any(check in html for check in checks)


def inject_app_shell(html: str) -> str:
    if _looks_like_os_command_runtime(html):
        html = html.replace('<body', '<body data-skip-global-nav="true"', 1) if 'data-skip-global-nav' not in html else html
        html = _inject_once(html, OS_COMMAND_CORE_SCRIPTS, '</body>')
        html = _inject_once(html, OS_COMMAND_RUNTIME_SCRIPTS, '</body>')
        return html

    html = _inject_once(html, APP_SHELL_STYLES, '</head>')
    html = _inject_once(html, APP_SHELL_SCRIPTS, '</body>')
    return html

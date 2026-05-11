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

OS_COMMAND_CORE_SCRIPTS = [
    '<script src="/js/api.js"></script>',
    '<script src="/js/auth.js"></script>',
    '<script src="/js/core/permissions.js"></script>',
    '<script src="/js/core/route-guard.js"></script>',
    '<script src="/js/indicare-workspace/context-store.js"></script>',
]

# Canonical OS runtime boot sequence.
# The OS now boots around the three roots of the operating system: young people,
# adults and home. Documents, evidence, reporting and oversight all reconnect
# into the same journey-centred runtime.
OS_COMMAND_RUNTIME_SCRIPTS = [
    '<script src="/js/indicare-runtime-safe.js"></script>',
    '<script src="/js/indicare-runtime-safety.js"></script>',
    '<script src="/js/os-operating-system-resilience.js"></script>',
    '<script src="/js/os-existing-journey-runtime-bridge.js"></script>',
    '<script type="module" src="/js/indicare-workspace/today-for-child.js"></script>',
    '<script type="module" src="/js/indicare-workspace/child-understanding-hub.js"></script>',
    '<script src="/js/indicare-workspace/child-life-model.js"></script>',
    '<script src="/js/indicare-workspace/child-life-ecosystem.js"></script>',
    '<script type="module" src="/js/indicare-workspace/child-journey-experience.js"></script>',
    '<script src="/js/indicare-workspace/child-timeline.js"></script>',
    '<script src="/js/indicare-workspace/adult-journey-profile.js"></script>',
    '<script src="/js/indicare-workspace/home-journey-profile.js"></script>',
    '<script type="module" src="/js/indicare-workspace/manager-oversight.js"></script>',
    '<script src="/js/document-intelligence-upload.js"></script>',
    '<script src="/js/reg44-report-reader-workspace.js"></script>',
    '<script src="/js/visual-outcome-storytelling.js"></script>',
    '<script src="/js/live-therapeutic-orchestration.js"></script>',
    '<script src="/js/chronology-visual-timeline.js"></script>',
    '<script src="/js/oversight-intelligence-dashboard.js"></script>',
    '<script src="/js/os-floating-assistant.js"></script>',
    '<script>window.IndiCareSafe?.run("OS canonical boot",()=>{window.state=typeof state!=="undefined"?state:window.state;window.loadAll=typeof loadAll!=="undefined"?loadAll:window.loadAll;window.toast=typeof toast!=="undefined"?toast:window.toast;console.info("IndiCare OS canonical journey runtime active")});</script>',
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
        html = html.replace('<body', '<body data-skip-global-nav="true" data-indicare-os-runtime="true"', 1) if 'data-skip-global-nav' not in html else html
        html = _inject_once(html, OS_COMMAND_CORE_SCRIPTS, '</body>')
        html = _inject_once(html, OS_COMMAND_RUNTIME_SCRIPTS, '</body>')
        return html

    html = _inject_once(html, APP_SHELL_STYLES, '</head>')
    html = _inject_once(html, APP_SHELL_SCRIPTS, '</body>')
    return html

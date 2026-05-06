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


def _inject_once(html: str, snippets: list[str], marker: str) -> str:
    injection = "\n".join(snippet for snippet in snippets if snippet not in html)
    if not injection:
        return html
    if marker in html:
        return html.replace(marker, f"  {injection}\n{marker}")
    return f"{html}\n{injection}\n"


def inject_app_shell(html: str) -> str:
    html = _inject_once(html, APP_SHELL_STYLES, "</head>")
    html = _inject_once(html, APP_SHELL_SCRIPTS, "</body>")
    return html

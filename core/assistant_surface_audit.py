from __future__ import annotations

"""Assistant surface route audit helpers.

These helpers keep the standalone assistant and OS workspace surfaces separate.
They are intentionally side-effect free so they can be used by tests, deployment
checks, or diagnostics.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class SurfaceRouteAuditResult:
    ok: bool
    assistant_route: str
    assistant_html: str
    issues: list[str]


STANDALONE_ASSISTANT_HTML = "assistant-cockpit.html"
OS_WORKSPACE_HTML = "indicare-workspace.html"


def audit_assistant_surface_routes(routes: dict[str, list[str]]) -> SurfaceRouteAuditResult:
    issues: list[str] = []
    assistant_paths = routes.get("/assistant", [])
    assistant_html = assistant_paths[0] if assistant_paths else ""

    if not assistant_html.endswith(STANDALONE_ASSISTANT_HTML):
        issues.append("/assistant must serve assistant-cockpit.html")

    if not routes.get("/assistant.html", [""])[0].endswith(STANDALONE_ASSISTANT_HTML):
        issues.append("/assistant.html must serve assistant-cockpit.html")

    for route in (
        "/os-command",
        "/care-os",
        "/young-people",
        "/os-dashboard",
    ):
        target = routes.get(route, [""])[0]
        if target.endswith(STANDALONE_ASSISTANT_HTML):
            issues.append(f"{route} must not serve the standalone assistant shell")

    return SurfaceRouteAuditResult(
        ok=not issues,
        assistant_route="/assistant",
        assistant_html=assistant_html,
        issues=issues,
    )

from __future__ import annotations

from fastapi import Request
from starlette.responses import JSONResponse, RedirectResponse

from auth.mfa_guard import get_session_user_id

PUBLIC_PATH_PREFIXES = (
    "/login",
    "/login.html",
    "/mfa",
    "/mfa-setup",
    "/mfa-recovery",
    "/auth/login",
    "/auth/logout",
    "/auth/check",
    "/auth/mfa",
    "/css",
    "/js",
    "/assets",
    "/components",
    "/static",
    "/favicon",
    "/docs",
    "/redoc",
    "/openapi",
    "/health",
)

PUBLIC_EXACT_PATHS = {
    "/",
}


def path_is_public(path: str) -> bool:
    if path in PUBLIC_EXACT_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)


def wants_html(request: Request) -> bool:
    accept = (request.headers.get("accept") or "").lower()
    return "text/html" in accept


async def enforce_login_middleware(request: Request, call_next=None):
    path = request.url.path

    if path_is_public(path):
      return None

    user_id = get_session_user_id(request)

    if user_id:
        return None

    if wants_html(request):
        return RedirectResponse(url="/login", status_code=302)

    return JSONResponse(
        status_code=401,
        content={
            "ok": False,
            "detail": "Authentication required.",
            "code": "authentication_required",
        },
    )

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal

from fastapi import Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.responses import JSONResponse, Response

from auth.current_user import get_current_user
from auth.errors import auth_error_detail, forbidden
from auth.legal_acceptance import CURRENT_LEGAL_VERSION
from auth.mfa_guard import is_mfa_verified_in_session
from auth.rbac import normalise_role
from auth.tokens import decode_session_token
from db.legal_acceptance_db import has_user_accepted_version
from db.mfa_db import get_user_mfa
from routers.auth_routes import settings as auth_settings

ASSISTANT_SHELL_PATHS = frozenset({"/assistant", "/assistant.html"})

_OS_STREAM_PATH = re.compile(r"^/assistant/os/[^/]+/stream$")


GateKind = Literal["mfa_setup", "mfa_verify", "legal"]


@dataclass(frozen=True)
class SensitiveAssistantGateBlock:
    kind: GateKind
    code: str
    message: str
    redirect_url: str | None = None


def is_sensitive_assistant_shell_path(path: str, method: str) -> bool:
    return method.upper() == "GET" and path in ASSISTANT_SHELL_PATHS


def is_sensitive_assistant_stream_path(path: str, method: str) -> bool:
    if method.upper() != "POST":
        return False
    if path == "/assistant/general/stream":
        return True
    return bool(_OS_STREAM_PATH.match(path))


def is_sensitive_assistant_gated_path(path: str, method: str) -> bool:
    return is_sensitive_assistant_shell_path(path, method) or is_sensitive_assistant_stream_path(path, method)


def mfa_policy_applies(role: str | None, *, mfa_enabled: bool) -> bool:
    if mfa_enabled:
        return True
    if not auth_settings.force_mfa_for_sensitive_roles:
        return False
    return normalise_role(role) in {"admin", "manager"}


def _jwt_mfa_verified(request: Request) -> bool | None:
    cookie_token = (request.cookies.get(auth_settings.session_cookie_name) or "").strip()
    if not cookie_token:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            cookie_token = auth[7:].strip()
    if not cookie_token:
        return None
    payload = decode_session_token(cookie_token)
    if not payload:
        return None
    if "mfa_verified" not in payload:
        return None
    return bool(payload.get("mfa_verified"))


def is_mfa_verified_for_request(request: Request) -> bool:
    jwt_verified = _jwt_mfa_verified(request)
    if jwt_verified is not None:
        return jwt_verified
    return is_mfa_verified_in_session(request)


def evaluate_sensitive_assistant_gate(
    request: Request,
    user: dict[str, Any],
) -> SensitiveAssistantGateBlock | None:
    user_id = int(user["id"])
    role = user.get("role")
    mfa_row = get_user_mfa(user_id)
    mfa_enabled = bool(mfa_row and bool(mfa_row.get("is_enabled")))

    if mfa_policy_applies(role, mfa_enabled=mfa_enabled):
        if not mfa_enabled:
            return SensitiveAssistantGateBlock(
                kind="mfa_setup",
                code="mfa_setup_required",
                message="MFA setup is required before using the assistant.",
                redirect_url="/mfa-setup",
            )
        if not is_mfa_verified_for_request(request):
            return SensitiveAssistantGateBlock(
                kind="mfa_verify",
                code="mfa_verification_required",
                message="MFA verification is required before using the assistant.",
                redirect_url="/mfa",
            )

    if not has_user_accepted_version(user_id, CURRENT_LEGAL_VERSION):
        return SensitiveAssistantGateBlock(
            kind="legal",
            code="legal_acceptance_required",
            message="Current legal terms must be accepted before using the assistant.",
            redirect_url=None,
        )

    return None


def _legal_shell_html(message: str) -> str:
    return f"""<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Legal acceptance required</title>
</head>
<body>
  <main>
    <h1>Legal acceptance required</h1>
    <p>{message}</p>
    <p>Sign in through the standard IndiCare login flow to review and accept the current terms, or contact your manager if you need help.</p>
  </main>
</body>
</html>"""


def build_sensitive_assistant_gate_response(
    request: Request,
    block: SensitiveAssistantGateBlock,
) -> Response:
    path = request.url.path
    if is_sensitive_assistant_shell_path(path, request.method):
        if block.redirect_url:
            return RedirectResponse(url=block.redirect_url, status_code=302)
        return HTMLResponse(
            status_code=403,
            content=_legal_shell_html(block.message),
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
            },
        )

    return JSONResponse(
        status_code=403,
        content={"detail": auth_error_detail(block.code, block.message)},
    )


def require_gated_assistant_access(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """FastAPI dependency for gated assistant APIs (defence in depth with middleware)."""
    block = evaluate_sensitive_assistant_gate(request, current_user)
    if block:
        raise forbidden(block.code, block.message)
    return current_user

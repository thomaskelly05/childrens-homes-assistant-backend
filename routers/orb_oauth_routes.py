from __future__ import annotations

import logging
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from db.connection import get_db
from routers.auth_routes import (
    _set_authenticated_session_state,
    _set_csrf_cookie,
    _set_session_cookie,
    establish_browser_session,
    oauth_mfa_pending_for_user,
)
from services.orb_oauth_service import (
    build_authorize_url,
    create_orb_residential_user,
    exchange_code,
    fetch_userinfo,
    find_orb_user_by_email,
    find_orb_user_by_oauth,
    is_os_scoped_user,
    link_oauth_account,
    load_provider_config,
    normalise_profile,
    oauth_error_redirect,
    provider_enabled,
    store_oauth_session,
    validate_oauth_state,
)
from services.orb_oauth_session_handoff_service import (
    consume_oauth_session_handoff,
    store_oauth_session_handoff,
)
from services.orb_access_service import orb_access_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/standalone/auth/oauth", tags=["ORB Standalone OAuth"])

FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", os.getenv("APP_BASE_URL", "http://localhost:3001")).strip()
OAUTH_SESSION_COMPLETE_PROXY_PATH = "/backend/orb/standalone/auth/oauth/session/complete"


def _redirect(url: str) -> RedirectResponse:
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


def _frontend_oauth_session_complete_url(handoff_id: str) -> str:
    return (
        f"{FRONTEND_APP_URL.rstrip('/')}{OAUTH_SESSION_COMPLETE_PROXY_PATH}"
        f"?handoff={handoff_id}"
    )


def _resolve_access_state(conn, user_id: int, user: dict) -> str | None:
    try:
        access = orb_access_service.build_access_payload(int(user_id), conn=conn, user=user)
        return str(access.get("access_state") or "") or None
    except Exception:
        return None


def _log_oauth_callback_success(
    *,
    provider: str,
    user_created: bool,
    redirect_target: str,
    mfa_required: bool,
    access_state: str | None,
    handoff: bool,
    set_cookie_present: bool,
) -> None:
    logger.info(
        "ORB OAuth callback success provider=%s oauth_callback_success=true user_resolved=true "
        "user_created=%s session_created=true set_cookie_present=%s redirect_target=%s "
        "mfa_required=%s access_state=%s handoff=%s",
        provider,
        user_created,
        set_cookie_present,
        redirect_target,
        mfa_required,
        access_state or "unknown",
        handoff,
    )


@router.get("/{provider}/start")
async def orb_oauth_start(
    provider: str,
    request: Request,
    return_url: str = Query(default="/orb"),
):
    key = provider.strip().lower()
    if not provider_enabled(key):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{key.title()} sign-in is not enabled for ORB Residential.",
        )
    config = load_provider_config(key)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{key.title()} sign-in is not fully configured on the server. Contact your administrator.",
        )
    state = secrets.token_urlsafe(32)
    store_oauth_session(request, provider=key, state=state, return_url=return_url)
    return _redirect(build_authorize_url(config, state=state))


@router.get("/{provider}/callback")
async def orb_oauth_callback_get(
    provider: str,
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    conn=Depends(get_db),
):
    return await _orb_oauth_callback(provider, request, conn, code=code, state=state, error=error)


@router.post("/{provider}/callback")
async def orb_oauth_callback_post(
    provider: str,
    request: Request,
    conn=Depends(get_db),
):
    form = await request.form()
    return await _orb_oauth_callback(
        provider,
        request,
        conn,
        code=str(form.get("code") or "") or None,
        state=str(form.get("state") or "") or None,
        error=str(form.get("error") or "") or None,
    )


@router.get("/session/complete")
async def orb_oauth_session_complete(
    request: Request,
    handoff: str = Query(default=""),
    conn=Depends(get_db),
):
    """Complete OAuth on the app host via the Next.js /backend proxy so cookies bind to app.indicare.co.uk."""
    payload = consume_oauth_session_handoff(conn, handoff)
    if not payload:
        conn.rollback()
        return _redirect(
            oauth_error_redirect(
                FRONTEND_APP_URL,
                "Sign-in could not be completed. Please try again.",
            )
        )

    return_url = str(payload.get("return_url") or "/orb")
    mfa_pending = bool(payload.get("mfa_pending"))
    remember = True
    csrf_token = str(payload.get("csrf_token") or "")
    session_token = str(payload.get("session_token") or "")
    user_id = int(payload["user_id"])
    email = str(payload.get("email") or "")

    try:
        _set_authenticated_session_state(
            request,
            user_id=user_id,
            email=email,
            csrf_token=csrf_token,
            remember=remember,
            mfa_pending=mfa_pending,
        )
    except Exception:
        conn.rollback()
        logger.exception("ORB OAuth session complete failed to restore session state")
        return _redirect(
            oauth_error_redirect(
                FRONTEND_APP_URL,
                "Sign-in could not be completed. Please try again.",
            )
        )

    destination = f"{FRONTEND_APP_URL.rstrip('/')}{return_url}"
    if mfa_pending:
        destination = f"{FRONTEND_APP_URL.rstrip('/')}/mfa?next={return_url}"

    response = _redirect(destination)
    _set_session_cookie(response, session_token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)
    conn.commit()

    logger.info(
        "ORB OAuth session complete provider=%s oauth_callback_success=true user_resolved=true "
        "user_created=false session_created=true set_cookie_present=true redirect_target=%s "
        "mfa_required=%s access_state=unknown handoff=true",
        payload.get("provider") or "unknown",
        destination,
        mfa_pending,
    )
    return response


async def _orb_oauth_callback(
    provider: str,
    request: Request,
    conn,
    *,
    code: str | None,
    state: str | None,
    error: str | None,
):
    key = provider.strip().lower()
    if error:
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "Sign-in was cancelled or denied."))
    if not provider_enabled(key):
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "This sign-in provider is not available."))
    config = load_provider_config(key)
    if not config:
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "This sign-in provider is not configured."))
    if not code or not state:
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "OAuth response was incomplete."))

    try:
        return_url = validate_oauth_state(request, provider=key, state=state)
    except ValueError:
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "Security check failed. Please try again."))

    user_created = False
    try:
        token_payload = await exchange_code(config, code)
        access_token = str(token_payload.get("access_token") or "")
        profile_raw = await fetch_userinfo(config, access_token) if access_token else {}
        profile = normalise_profile(key, profile_raw)
        if not profile.get("subject"):
            return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "Could not verify your account."))
        if not profile.get("email_verified"):
            return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "A verified email is required."))
        email = str(profile.get("email") or "").strip().lower()
        if not email:
            return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "Email was not provided by the sign-in provider."))

        user = find_orb_user_by_oauth(conn, provider=key, subject=str(profile["subject"]))
        if not user:
            existing = find_orb_user_by_email(conn, email)
            if existing:
                if is_os_scoped_user(existing):
                    return _redirect(
                        oauth_error_redirect(
                            FRONTEND_APP_URL,
                            "This email is linked to IndiCare OS. Use ORB email signup or a dedicated ORB account.",
                        )
                    )
                user = existing
            else:
                user = create_orb_residential_user(
                    conn,
                    email=email,
                    first_name=profile.get("first_name"),
                    last_name=profile.get("last_name"),
                )
                user_created = True

        link_oauth_account(
            conn,
            user_id=int(user["id"]),
            provider=key,
            subject=str(profile["subject"]),
            email=email,
            email_verified=True,
            metadata={"provider": key},
        )

        mfa_pending = oauth_mfa_pending_for_user(user, conn)
        session_bundle = establish_browser_session(
            request=request,
            conn=conn,
            user=user,
            remember=True,
            mfa_pending=mfa_pending,
        )
        handoff_id = store_oauth_session_handoff(
            conn,
            user_id=int(user["id"]),
            email=email,
            session_token=session_bundle.token,
            csrf_token=session_bundle.csrf_token,
            return_url=return_url,
            mfa_pending=mfa_pending,
            provider=key,
        )
        conn.commit()

        redirect_target = _frontend_oauth_session_complete_url(handoff_id)
        access_state = _resolve_access_state(conn, int(user["id"]), user)
        _log_oauth_callback_success(
            provider=key,
            user_created=user_created,
            redirect_target=redirect_target,
            mfa_required=mfa_pending,
            access_state=access_state,
            handoff=True,
            set_cookie_present=False,
        )
        return _redirect(redirect_target)
    except Exception:
        logger.exception("ORB OAuth callback failed provider=%s", key)
        conn.rollback()
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "Sign-in could not be completed. Please try again."))

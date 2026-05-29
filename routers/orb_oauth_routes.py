from __future__ import annotations

import logging
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from auth.tokens import create_session_token
from db.connection import get_db
from routers.auth_routes import _set_session_cookie, settings as auth_settings
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
from services.session_security_service import create_session_record

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/standalone/auth/oauth", tags=["ORB Standalone OAuth"])

FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", os.getenv("APP_BASE_URL", "http://localhost:3001")).strip()


def _redirect(url: str) -> RedirectResponse:
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/{provider}/start")
async def orb_oauth_start(
    provider: str,
    request: Request,
    return_url: str = Query(default="/orb"),
):
    key = provider.strip().lower()
    if not provider_enabled(key):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OAuth provider is not enabled")
    config = load_provider_config(key)
    if not config:
        raise HTTPException(status_code=status.HTTP_503_NOT_FOUND, detail="OAuth provider is not fully configured")
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

        link_oauth_account(
            conn,
            user_id=int(user["id"]),
            provider=key,
            subject=str(profile["subject"]),
            email=email,
            email_verified=True,
            metadata={"provider": key},
        )
        session_id = create_session_record(
            user_id=int(user["id"]),
            request=request,
            mfa_verified=True,
            conn=conn,
        )
        token = create_session_token(
            user_id=int(user["id"]),
            role=str(user.get("role") or "orb_residential"),
            session_id=session_id,
            permissions=[],
        )
        conn.commit()
        destination = f"{FRONTEND_APP_URL.rstrip('/')}{return_url}"
        response = _redirect(destination)
        _set_session_cookie(response, token, remember=True)
        return response
    except Exception:
        logger.exception("ORB OAuth callback failed provider=%s", key)
        conn.rollback()
        return _redirect(oauth_error_redirect(FRONTEND_APP_URL, "Sign-in could not be completed. Please try again."))

from __future__ import annotations

import logging
import os
import secrets
import time
from urllib.parse import urlparse

import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from db.connection import get_db
from routers.auth_routes import (
    _get_session_user_from_request,
    _set_authenticated_session_state,
    _set_csrf_cookie,
    _set_session_cookie,
    establish_browser_session,
    oauth_mfa_pending_for_user,
)
from services.orb_account_linking_service import resolve_orb_oauth_user
from services.orb_oauth_service import (
    OAUTH_HTTP_TIMEOUT_SECONDS,
    build_authorize_url,
    exchange_code,
    fetch_microsoft_profile,
    fetch_userinfo,
    link_oauth_account,
    load_provider_config,
    normalise_profile,
    oauth_error_redirect,
    provider_enabled,
    store_oauth_session,
    validate_oauth_state,
)
from services.orb_oauth_state_service import OAuthStateValidationError
from services.orb_oauth_session_handoff_service import (
    consume_oauth_session_handoff,
    inspect_oauth_session_handoff,
    store_oauth_session_handoff,
)
from services.orb_access_service import orb_access_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/standalone/auth/oauth", tags=["ORB Standalone OAuth"])

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3001").strip()
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", APP_BASE_URL).strip()
OAUTH_SESSION_COMPLETE_PROXY_PATH = "/backend/orb/standalone/auth/oauth/session/complete"


def _redirect(url: str) -> RedirectResponse:
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


def _orb_oauth_app_url() -> str:
    """Browser-facing app host where the Next.js /backend proxy sets session cookies."""
    explicit = os.getenv("ORB_OAUTH_APP_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    if APP_BASE_URL:
        return APP_BASE_URL.rstrip("/")
    return FRONTEND_APP_URL.rstrip("/")


def _frontend_oauth_session_complete_url(handoff_id: str) -> str:
    return (
        f"{_orb_oauth_app_url()}{OAUTH_SESSION_COMPLETE_PROXY_PATH}"
        f"?handoff={handoff_id}"
    )


def _redirect_target_parts(url: str) -> tuple[str, str, bool]:
    parsed = urlparse(url)
    host = parsed.netloc or "relative"
    path = parsed.path or "/"
    is_session_complete = OAUTH_SESSION_COMPLETE_PROXY_PATH in path
    return host, path, is_session_complete


def _request_host(request: Request) -> str:
    forwarded = str(request.headers.get("x-forwarded-host") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip().lower()
    return str(request.url.hostname or "").strip().lower()


def _redirect_uri_host(provider: str) -> str:
    config = load_provider_config(provider)
    if not config:
        return "unknown"
    parsed = urlparse(config.redirect_uri)
    return parsed.netloc or "unknown"


def _resolve_access_state(conn, user_id: int, user: dict | None = None) -> str | None:
    try:
        access = orb_access_service.build_access_payload(int(user_id), conn=conn, user=user)
        return str(access.get("access_state") or "") or None
    except Exception:
        return None


def _billing_redirect_access_states() -> frozenset[str]:
    return frozenset(
        {
            "inactive",
            "trial_available",
            "authenticated_no_subscription",
            "locked",
            "subscription_past_due",
            "subscription_cancelled",
            "subscription_incomplete",
        }
    )


def _resolve_post_oauth_destination(
    *,
    return_url: str,
    mfa_pending: bool,
    access_state: str | None,
    can_use_orb: bool = False,
) -> str:
    app_url = _orb_oauth_app_url()
    if mfa_pending:
        return f"{app_url}/mfa?next={return_url}"
    if can_use_orb:
        return f"{app_url}{return_url}"
    if access_state in _billing_redirect_access_states():
        return f"{app_url}/orb/billing"
    return f"{app_url}{return_url}"


def _oauth_friendly_login_redirect(message: str) -> str:
    encoded = __import__("urllib.parse").parse.quote(message[:200])
    return f"{_orb_oauth_app_url()}/orb?oauth_error={encoded}"


def _request_has_valid_session(request: Request, conn) -> tuple[bool, int | None]:
    user, user_id = _get_session_user_from_request(request, conn, None, raise_on_missing=False)
    return user is not None and user_id is not None, user_id


def _response_has_set_cookie(response: RedirectResponse) -> bool:
    raw = response.headers.get("set-cookie") or response.headers.get("Set-Cookie")
    if raw:
        return True
    return any(key.lower() == "set-cookie" for key in response.headers.keys())


def _authorize_redirect_host(provider: str) -> str:
    config = load_provider_config(provider)
    if not config:
        return "unknown"
    parsed = urlparse(config.authorize_url)
    return parsed.netloc or "unknown"


def _log_oauth_start(
    *,
    provider: str,
    oauth_start_host: str,
    redirect_uri_host: str,
) -> None:
    logger.info(
        "ORB OAuth start provider=%s oauth_start_host=%s state_created=true "
        "state_storage=server redirect_uri_host=%s start_redirect_host=%s",
        provider,
        oauth_start_host or "unknown",
        redirect_uri_host,
        _authorize_redirect_host(provider),
    )


def _log_oauth_callback_state(
    *,
    provider: str,
    callback_host: str,
    state_present: bool,
    state_valid: bool,
    failure_reason: str | None = None,
) -> None:
    logger.info(
        "ORB OAuth callback state provider=%s callback_host=%s state_present=%s "
        "state_valid=%s state_validation_failure_reason=%s",
        provider,
        callback_host or "unknown",
        str(state_present).lower(),
        str(state_valid).lower(),
        failure_reason or "none",
    )


def _log_oauth_callback_redirect(
    *,
    provider: str,
    handoff_created: bool,
    redirect_target: str,
    mfa_required: bool,
    access_state: str | None,
) -> None:
    host, path, is_session_complete = _redirect_target_parts(redirect_target)
    logger.info(
        "ORB OAuth callback redirect provider=%s oauth_callback_success=true handoff_created=%s "
        "session_complete_redirect_target_host=%s session_complete_redirect_target_path=%s "
        "redirect_target_is_session_complete=%s mfa_required=%s access_state=%s response_status=302",
        provider,
        str(handoff_created).lower(),
        host,
        path,
        str(is_session_complete).lower(),
        str(mfa_required).lower(),
        access_state or "unknown",
    )


def _log_oauth_session_complete(
    *,
    handoff_present: bool,
    handoff_consumed: bool,
    session_created: bool,
    set_cookie_headers_present: bool,
    redirect_target: str,
    mfa_required: bool,
    access_state: str | None,
) -> None:
    _, path, _ = _redirect_target_parts(redirect_target)
    logger.info(
        "ORB OAuth session complete oauth_session_complete_hit=true handoff_present=%s "
        "handoff_consumed=%s session_created=%s set_cookie_headers_present=%s "
        "redirect_target_path=%s mfa_required=%s access_state=%s",
        str(handoff_present).lower(),
        str(handoff_consumed).lower(),
        str(session_created).lower(),
        str(set_cookie_headers_present).lower(),
        path,
        str(mfa_required).lower(),
        access_state or "unknown",
    )


@router.get("/{provider}/start")
async def orb_oauth_start(
    provider: str,
    request: Request,
    return_url: str = Query(default="/orb"),
    conn=Depends(get_db),
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
    oauth_start_host = _request_host(request)
    start_timer = time.perf_counter()
    try:
        store_oauth_session(
            conn,
            provider=key,
            state=state,
            return_url=return_url,
            start_host=oauth_start_host,
        )
        conn.commit()
    except Exception:
        conn.rollback()
        logger.exception("ORB OAuth start failed to persist state provider=%s", key)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sign-in could not be started. Please try again.",
        ) from None

    redirect_uri_host = _redirect_uri_host(key)
    start_ms = int((time.perf_counter() - start_timer) * 1000)
    _log_oauth_start(
        provider=key,
        oauth_start_host=oauth_start_host,
        redirect_uri_host=redirect_uri_host,
    )
    logger.info("ORB OAuth start timing provider=%s state_persist_ms=%s", key, start_ms)
    return _redirect(build_authorize_url(config, state=state))


@router.get("/{provider}/callback")
async def orb_oauth_callback_get(
    provider: str,
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    conn=Depends(get_db),
):
    return await _orb_oauth_callback(
        provider,
        request,
        conn,
        code=code,
        state=state,
        error=error,
        error_description=error_description,
    )


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
    handoff_present = bool(str(handoff or "").strip())
    payload = consume_oauth_session_handoff(conn, handoff) if handoff_present else None
    handoff_consumed = payload is not None

    if not payload:
        has_session, session_user_id = _request_has_valid_session(request, conn)
        inspection = inspect_oauth_session_handoff(conn, handoff) if handoff_present else None
        conn.rollback()
        if has_session:
            destination = f"{_orb_oauth_app_url()}/orb"
            _log_oauth_session_complete(
                handoff_present=handoff_present,
                handoff_consumed=False,
                session_created=False,
                set_cookie_headers_present=False,
                redirect_target=destination,
                mfa_required=False,
                access_state=_resolve_access_state(conn, int(session_user_id or 0)) if session_user_id else None,
            )
            return _redirect(destination)
        if inspection and inspection.get("status") == "consumed":
            error_target = _oauth_friendly_login_redirect(
                "This sign-in link has already been used. Please sign in again."
            )
        elif inspection and inspection.get("status") == "expired":
            error_target = _oauth_friendly_login_redirect(
                "This sign-in link has expired. Please sign in again."
            )
        else:
            error_target = _oauth_friendly_login_redirect(
                "Sign-in could not be completed. Please try again from the ORB login page."
            )
        _log_oauth_session_complete(
            handoff_present=handoff_present,
            handoff_consumed=False,
            session_created=False,
            set_cookie_headers_present=False,
            redirect_target=error_target,
            mfa_required=False,
            access_state=None,
        )
        return _redirect(error_target)

    return_url = str(payload.get("return_url") or "/orb")
    mfa_pending = bool(payload.get("mfa_pending"))
    remember = True
    csrf_token = str(payload.get("csrf_token") or "")
    session_token = str(payload.get("session_token") or "")
    user_id = int(payload["user_id"])
    email = str(payload.get("email") or "")

    session_created = False
    try:
        _set_authenticated_session_state(
            request,
            user_id=user_id,
            email=email,
            csrf_token=csrf_token,
            remember=remember,
            mfa_pending=mfa_pending,
        )
        session_created = True
    except Exception:
        conn.rollback()
        logger.exception("ORB OAuth session complete failed to restore session state")
        error_target = oauth_error_redirect(
            _orb_oauth_app_url(),
            "Sign-in could not be completed. Please try again.",
        )
        _log_oauth_session_complete(
            handoff_present=handoff_present,
            handoff_consumed=handoff_consumed,
            session_created=False,
            set_cookie_headers_present=False,
            redirect_target=error_target,
            mfa_required=mfa_pending,
            access_state=None,
        )
        return _redirect(error_target)

    access_payload = orb_access_service.build_access_payload(user_id, conn=conn)
    access_state = str(access_payload.get("access_state") or "") or None
    destination = _resolve_post_oauth_destination(
        return_url=return_url,
        mfa_pending=mfa_pending,
        access_state=access_state,
        can_use_orb=bool(access_payload.get("can_use_orb")),
    )

    response = _redirect(destination)
    _set_session_cookie(response, session_token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)
    conn.commit()

    _log_oauth_session_complete(
        handoff_present=handoff_present,
        handoff_consumed=handoff_consumed,
        session_created=session_created,
        set_cookie_headers_present=_response_has_set_cookie(response),
        redirect_target=destination,
        mfa_required=mfa_pending,
        access_state=access_state,
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
    error_description: str | None = None,
):
    key = provider.strip().lower()
    if error:
        if error_description:
            logger.info(
                "ORB OAuth provider error provider=%s error_code=%s",
                key,
                str(error)[:80],
            )
        return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "Sign-in was cancelled or denied."))
    if not provider_enabled(key):
        return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "This sign-in provider is not available."))
    config = load_provider_config(key)
    if not config:
        return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "This sign-in provider is not configured."))
    if not code or not state:
        return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "OAuth response was incomplete."))

    callback_host = _request_host(request)
    state_present = bool(str(state or "").strip())
    try:
        return_url = validate_oauth_state(conn, provider=key, state=state)
        conn.commit()
        _log_oauth_callback_state(
            provider=key,
            callback_host=callback_host,
            state_present=state_present,
            state_valid=True,
        )
    except OAuthStateValidationError as exc:
        conn.rollback()
        _log_oauth_callback_state(
            provider=key,
            callback_host=callback_host,
            state_present=state_present,
            state_valid=False,
            failure_reason=exc.reason,
        )
        return _redirect(
            _oauth_friendly_login_redirect("Sign-in expired or was interrupted. Please start again from the ORB login page.")
        )
    except ValueError:
        conn.rollback()
        _log_oauth_callback_state(
            provider=key,
            callback_host=callback_host,
            state_present=state_present,
            state_valid=False,
            failure_reason="unknown",
        )
        return _redirect(
            _oauth_friendly_login_redirect("Sign-in expired or was interrupted. Please start again from the ORB login page.")
        )

    user_created = False
    linked_existing_by_email = False
    callback_started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=OAUTH_HTTP_TIMEOUT_SECONDS) as http_client:
            token_started = time.perf_counter()
            token_payload = await exchange_code(config, code, client=http_client)
            token_ms = int((time.perf_counter() - token_started) * 1000)
            access_token = str(token_payload.get("access_token") or "")
            profile_started = time.perf_counter()
            if key == "microsoft":
                profile_raw = await fetch_microsoft_profile(
                    access_token,
                    id_token=str(token_payload.get("id_token") or "") or None,
                )
            else:
                profile_raw = (
                    await fetch_userinfo(config, access_token, client=http_client) if access_token else {}
                )
            profile_ms = int((time.perf_counter() - profile_started) * 1000)
        logger.info(
            "ORB OAuth callback timing provider=%s token_exchange_ms=%s profile_fetch_ms=%s",
            key,
            token_ms,
            profile_ms,
        )
        profile = normalise_profile(key, profile_raw)
        if not profile.get("subject"):
            return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "Could not verify your account."))
        if not profile.get("email_verified"):
            return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "A verified email is required."))
        email = str(profile.get("email") or "").strip().lower()
        if not email:
            return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "Email was not provided by the sign-in provider."))

        lookup_started = time.perf_counter()
        try:
            resolved = resolve_orb_oauth_user(
                conn,
                provider=key,
                subject=str(profile["subject"]),
                email=email,
                email_verified=bool(profile.get("email_verified")),
                first_name=profile.get("first_name"),
                last_name=profile.get("last_name"),
            )
        except ValueError as exc:
            reason = str(exc)
            if reason in {"canonical_user_os_scoped", "existing_user_os_scoped"}:
                return _redirect(
                    oauth_error_redirect(
                        _orb_oauth_app_url(),
                        "This email is linked to IndiCare OS. Use ORB email signup or a dedicated ORB account.",
                    )
                )
            raise
        user = resolved.user
        user_created = resolved.user_created
        linked_existing_by_email = resolved.linked_existing_by_email
        lookup_ms = int((time.perf_counter() - lookup_started) * 1000)

        oauth_metadata: dict[str, str] = {"provider": key}
        avatar_url = profile.get("avatar_url")
        if avatar_url:
            oauth_metadata["avatar_url"] = str(avatar_url)
        link_oauth_account(
            conn,
            user_id=int(user["id"]),
            provider=key,
            subject=str(profile["subject"]),
            email=email,
            email_verified=True,
            metadata=oauth_metadata,
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
        total_ms = int((time.perf_counter() - callback_started) * 1000)
        logger.info(
            "ORB OAuth user resolved provider=%s user_id=%s user_created=%s "
            "linked_existing_by_email=%s rehomed_provider_from_duplicate_user=%s "
            "canonical_user_id=%s duplicate_user_id=%s user_lookup_ms=%s total_callback_ms=%s",
            key,
            int(user["id"]),
            str(user_created).lower(),
            str(linked_existing_by_email).lower(),
            str(resolved.rehomed_provider_from_duplicate_user).lower(),
            resolved.canonical_user_id or "none",
            resolved.duplicate_user_id or "none",
            lookup_ms,
            total_ms,
        )
        _log_oauth_callback_redirect(
            provider=key,
            handoff_created=True,
            redirect_target=redirect_target,
            mfa_required=mfa_pending,
            access_state=access_state,
        )
        return _redirect(redirect_target)
    except Exception:
        logger.exception("ORB OAuth callback failed provider=%s", key)
        conn.rollback()
        return _redirect(oauth_error_redirect(_orb_oauth_app_url(), "Sign-in could not be completed. Please try again."))

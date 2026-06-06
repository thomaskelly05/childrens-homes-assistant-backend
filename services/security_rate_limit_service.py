from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Callable, Literal

from fastapi import HTTPException, Request, status

from auth.tokens import decode_session_token
from routers.auth_routes import settings as auth_settings
from services.audit_event_service import record_audit_event

logger = logging.getLogger("indicare.security.rate_limit")

RateLimitScope = Literal["ip", "user", "ip_user"]


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _disabled() -> bool:
    return os.getenv("DISABLE_RATE_LIMITING", "false").strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class InMemoryRateLimiter:
    """Failure-based lockout limiter (login abuse)."""

    max_attempts: int
    window_seconds: int
    lockout_seconds: int
    attempts: dict[str, list[float]] = field(default_factory=dict)
    locked_until: dict[str, float] = field(default_factory=dict)

    def assert_allowed(self, key: str) -> None:
        now = time.time()
        until = self.locked_until.get(key)
        if until and until > now:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again later.",
            )
        if until:
            self.locked_until.pop(key, None)
        self.attempts[key] = [ts for ts in self.attempts.get(key, []) if now - ts <= self.window_seconds]

    def register_failure(self, key: str) -> None:
        now = time.time()
        values = [ts for ts in self.attempts.get(key, []) if now - ts <= self.window_seconds]
        values.append(now)
        self.attempts[key] = values
        if len(values) >= self.max_attempts:
            self.locked_until[key] = now + self.lockout_seconds

    def clear(self, key: str) -> None:
        self.attempts.pop(key, None)
        self.locked_until.pop(key, None)


@dataclass
class SlidingWindowRateLimiter:
    """Request-count sliding window limiter."""

    max_requests: int
    window_seconds: int
    buckets: dict[str, list[float]] = field(default_factory=dict)

    def check_and_increment(self, key: str) -> bool:
        now = time.time()
        values = [ts for ts in self.buckets.get(key, []) if now - ts <= self.window_seconds]
        if len(values) >= self.max_requests:
            self.buckets[key] = values
            return False
        values.append(now)
        self.buckets[key] = values
        return True

    def reset(self) -> None:
        self.buckets.clear()


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    methods: frozenset[str]
    path_matcher: Callable[[str, str], bool]
    max_requests: int
    window_seconds: int
    scope: RateLimitScope = "ip"
    daily_max_requests: int | None = None


def client_rate_limit_key(request: Request, *, suffix: str = "") -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{ip}:{suffix}" if suffix else ip


def user_rate_limit_key(request: Request) -> str | None:
    token = (request.cookies.get(auth_settings.session_cookie_name) or "").strip()
    if not token:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    payload = decode_session_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    return f"user:{sub}"


login_rate_limiter = InMemoryRateLimiter(
    max_attempts=_env_int("AUTH_MAX_FAILED_ATTEMPTS_PER_IP", 20),
    window_seconds=_env_int("AUTH_THROTTLE_WINDOW_SECONDS", 900),
    lockout_seconds=_env_int("AUTH_LOCKOUT_SECONDS", 900),
)


def _prefix_matcher(*prefixes: str) -> Callable[[str, str], bool]:
    def _match(method: str, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in prefixes)

    return _match


def _suffix_matcher(suffix: str, *, methods: frozenset[str] | None = None) -> Callable[[str, str], bool]:
    def _match(method: str, path: str) -> bool:
        if methods and method.upper() not in methods:
            return False
        return path.endswith(suffix)

    return _match


def _regex_matcher(pattern: str) -> Callable[[str, str], bool]:
    compiled = re.compile(pattern)

    def _match(method: str, path: str) -> bool:
        return bool(compiled.search(path))

    return _match


RATE_LIMIT_RULES: tuple[RateLimitRule, ...] = (
    RateLimitRule(
        "auth_login",
        frozenset({"POST"}),
        _prefix_matcher("/auth/login"),
        _env_int("ORB_RL_LOGIN_PER_MINUTE", 12),
        60,
        "ip",
    ),
    RateLimitRule(
        "orb_signup",
        frozenset({"POST"}),
        _prefix_matcher("/orb/standalone/auth/signup"),
        _env_int("ORB_RL_SIGNUP_PER_WINDOW", 5),
        _env_int("ORB_RL_SIGNUP_WINDOW_SECONDS", 900),
        "ip",
    ),
    RateLimitRule(
        "oauth_start",
        frozenset({"GET"}),
        _regex_matcher(r"^/orb/standalone/auth/oauth/[^/]+/start$"),
        _env_int("ORB_RL_OAUTH_START_PER_HOUR", 30),
        3600,
        "ip",
    ),
    RateLimitRule(
        "mfa_routes",
        frozenset({"POST"}),
        _prefix_matcher("/mfa/"),
        _env_int("ORB_RL_MFA_PER_MINUTE", 20),
        60,
        "ip_user",
    ),
    RateLimitRule(
        "passkey_auth",
        frozenset({"POST"}),
        _prefix_matcher("/auth/passkeys/authenticate/"),
        _env_int("ORB_RL_PASSKEY_PER_MINUTE", 20),
        60,
        "ip",
    ),
    RateLimitRule(
        "orb_chat",
        frozenset({"POST"}),
        _prefix_matcher(
            "/orb/standalone/conversation",
            "/orb/residential/conversation",
            "/orb/ask",
        ),
        _env_int("ORB_RL_CHAT_PER_MINUTE", 30),
        60,
        "user",
        daily_max_requests=_env_int("ORB_RL_CHAT_PER_DAY", 500),
    ),
    RateLimitRule(
        "orb_dictate_ai",
        frozenset({"POST"}),
        _prefix_matcher(
            "/orb/dictate/transcribe",
            "/orb/dictate/analyze",
            "/orb/dictate/finalise",
            "/orb/dictate/generate",
            "/orb/dictate/edit",
            "/orb/dictate/export",
            "/orb/dictate/save",
            "/orb/dictate/realtime/session",
        ),
        _env_int("ORB_RL_DICTATE_PER_MINUTE", 20),
        60,
        "user",
    ),
    RateLimitRule(
        "orb_voice",
        frozenset({"POST"}),
        _prefix_matcher(
            "/orb/voice/speak",
            "/orb/voice/transcribe",
            "/orb/voice/realtime/session",
            "/orb/voice/session",
            "/orb/voice/webrtc/",
        ),
        _env_int("ORB_RL_VOICE_PER_MINUTE", 25),
        60,
        "user",
    ),
    RateLimitRule(
        "orb_documents",
        frozenset({"POST"}),
        _prefix_matcher("/orb/standalone/documents/"),
        _env_int("ORB_RL_DOCUMENTS_PER_MINUTE", 12),
        60,
        "user",
    ),
    RateLimitRule(
        "orb_saved_outputs",
        frozenset({"POST", "PATCH", "DELETE"}),
        _prefix_matcher("/orb/standalone/outputs"),
        _env_int("ORB_RL_SAVED_OUTPUTS_PER_MINUTE", 30),
        60,
        "user",
    ),
    RateLimitRule(
        "orb_templates",
        frozenset({"POST"}),
        _prefix_matcher("/orb/standalone/templates"),
        _env_int("ORB_RL_TEMPLATES_PER_MINUTE", 20),
        60,
        "user",
    ),
    RateLimitRule(
        "orb_billing",
        frozenset({"POST"}),
        _prefix_matcher(
            "/orb/standalone/billing/checkout",
            "/orb/standalone/billing/portal",
            "/orb/standalone/trial/start",
        ),
        _env_int("ORB_RL_BILLING_PER_MINUTE", 10),
        60,
        "user",
    ),
    RateLimitRule(
        "admin_ai_settings",
        frozenset({"PATCH"}),
        _prefix_matcher("/api/admin/ai-settings"),
        _env_int("ORB_RL_ADMIN_AI_SETTINGS_PER_MINUTE", 6),
        60,
        "user",
    ),
    RateLimitRule(
        "admin_ai_usage_audit",
        frozenset({"GET"}),
        _prefix_matcher("/api/admin/ai-usage-audit"),
        _env_int("ORB_RL_ADMIN_AI_AUDIT_PER_MINUTE", 30),
        60,
        "user",
    ),
)

EXEMPT_PATH_PREFIXES = (
    "/health",
    "/orb/standalone/billing/webhook",
    "/css",
    "/js",
    "/assets",
    "/components",
    "/favicon.ico",
)

_limiter_pool: dict[str, SlidingWindowRateLimiter] = {}


def _limiter_for(rule: RateLimitRule, *, daily: bool = False) -> SlidingWindowRateLimiter:
    window = 86400 if daily else rule.window_seconds
    max_requests = rule.daily_max_requests if daily else rule.max_requests
    key = f"{rule.name}:{'daily' if daily else 'window'}:{window}:{max_requests}"
    if key not in _limiter_pool:
        _limiter_pool[key] = SlidingWindowRateLimiter(max_requests=max_requests, window_seconds=window)
    return _limiter_pool[key]


def _keys_for_rule(request: Request, rule: RateLimitRule) -> list[str]:
    ip_key = client_rate_limit_key(request, suffix=rule.name)
    user_key = user_rate_limit_key(request)
    if rule.scope == "ip":
        return [ip_key]
    if rule.scope == "user":
        return [user_key or ip_key]
    if rule.scope == "ip_user":
        keys = [ip_key]
        if user_key:
            keys.append(f"{user_key}:{rule.name}")
        return keys
    return [ip_key]


def is_rate_limit_exempt(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES)


def match_rate_limit_rule(method: str, path: str) -> RateLimitRule | None:
    normalized_method = method.upper()
    for rule in RATE_LIMIT_RULES:
        if rule.methods and normalized_method not in rule.methods:
            continue
        if rule.path_matcher(normalized_method, path):
            return rule
    return None


def check_request_rate_limit(request: Request) -> RateLimitRule | None:
    if _disabled():
        return None
    path = request.url.path
    if is_rate_limit_exempt(path):
        return None
    rule = match_rate_limit_rule(request.method, path)
    if not rule:
        return None

    limiter = _limiter_for(rule)
    keys = _keys_for_rule(request, rule)
    for key in keys:
        if not limiter.check_and_increment(key):
            return rule

    if rule.daily_max_requests:
        daily_limiter = _limiter_for(rule, daily=True)
        for key in keys:
            if not daily_limiter.check_and_increment(key):
                return rule
    return None


def rate_limit_exceeded_response(rule: RateLimitRule) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "code": "rate_limit_exceeded",
            "message": "Too many requests. Please wait a moment and try again.",
            "policy": rule.name,
        },
    )


def log_rate_limit_event(request: Request, rule: RateLimitRule) -> None:
    user_key = user_rate_limit_key(request)
    logger.warning(
        "security.rate_limit_exceeded policy=%s method=%s path=%s ip=%s user=%s",
        rule.name,
        request.method,
        request.url.path,
        client_rate_limit_key(request),
        user_key or "anonymous",
    )
    record_audit_event(
        event_type="security.rate_limit_exceeded",
        action="rate_limit_exceeded",
        outcome="blocked",
        request=request,
        resource_type="rate_limit_policy",
        resource_id=rule.name,
        metadata={
            "policy": rule.name,
            "method": request.method,
            "path": request.url.path,
            "scope": rule.scope,
        },
    )


def reset_rate_limiters_for_tests() -> None:
    for limiter in _limiter_pool.values():
        limiter.reset()

from __future__ import annotations

import os
from typing import Any


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def build_security_posture() -> dict[str, Any]:
    issues: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    recommendations: list[str] = []

    session_secret = os.getenv("SESSION_SECRET_KEY") or os.getenv("SECRET_KEY")
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    cookie_secure = os.getenv("COOKIE_SECURE", "true")
    cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax").lower()
    app_env = os.getenv("APP_ENV", "production").lower()

    if not session_secret or session_secret == "dev-session-secret-change-me":
        issues.append({
            "level": "critical",
            "title": "Session secret is not production safe",
            "summary": "Set SESSION_SECRET_KEY to a long random value in Render. This protects login sessions.",
        })

    if session_secret and len(session_secret) < 32:
        warnings.append({
            "level": "warning",
            "title": "Session secret may be too short",
            "summary": "Use a random secret of at least 32 characters, ideally 64+.",
        })

    if not _truthy(cookie_secure):
        issues.append({
            "level": "critical",
            "title": "Secure cookies are disabled",
            "summary": "COOKIE_SECURE must be true in production so session cookies only travel over HTTPS.",
        })

    if cookie_samesite not in {"lax", "strict"}:
        warnings.append({
            "level": "warning",
            "title": "Cookie SameSite is weak or missing",
            "summary": "Use COOKIE_SAMESITE=lax or strict to reduce cross-site request risk.",
        })

    if not allowed_origins:
        issues.append({
            "level": "critical",
            "title": "Allowed origins are not set",
            "summary": "Set ALLOWED_ORIGINS to your production domain only.",
        })
    elif "*" in allowed_origins:
        issues.append({
            "level": "critical",
            "title": "Wildcard CORS origin detected",
            "summary": "Never use '*' for ALLOWED_ORIGINS with credentials enabled.",
        })
    elif app_env == "production" and "localhost" in allowed_origins:
        warnings.append({
            "level": "warning",
            "title": "Localhost allowed in production",
            "summary": "Remove localhost from ALLOWED_ORIGINS before live deployment.",
        })

    recommendations.extend([
        "Revoke any GitHub tokens that have been pasted into chat, terminal or logs.",
        "Enable GitHub branch protection on main and require pull requests before merge.",
        "Make MFA/passkeys mandatory for all staff, managers, RI and provider users.",
        "Apply require_home_access to every child/home scoped route before returning records.",
        "Apply require_provider_access to provider and RI dashboards.",
        "Create a database-backed audit table for who viewed, created, edited or exported child records.",
        "Review audit logs weekly as part of management oversight and Regulation 45 governance.",
    ])

    score = 100
    score -= len(issues) * 25
    score -= len(warnings) * 10
    score = max(0, min(score, 100))

    if score >= 85:
        band = "strong"
    elif score >= 60:
        band = "improving"
    else:
        band = "urgent"

    return {
        "ok": not issues,
        "score": score,
        "band": band,
        "issues": issues,
        "warnings": warnings,
        "recommendations": recommendations,
        "checks": {
            "session_secret_set": bool(session_secret),
            "session_secret_length_ok": bool(session_secret and len(session_secret) >= 32),
            "cookie_secure": cookie_secure,
            "cookie_samesite": cookie_samesite,
            "allowed_origins": allowed_origins,
            "app_env": app_env,
        },
    }


def build_safeguarding_security_alerts() -> dict[str, Any]:
    posture = build_security_posture()
    alerts: list[dict[str, str]] = []

    for item in posture["issues"]:
        alerts.append({
            "level": item["level"],
            "title": item["title"],
            "summary": item["summary"],
            "action": "Fix before handling live child records.",
        })

    for item in posture["warnings"]:
        alerts.append({
            "level": item["level"],
            "title": item["title"],
            "summary": item["summary"],
            "action": "Add to the security improvement plan.",
        })

    alerts.append({
        "level": "important",
        "title": "Route-level access guards required",
        "summary": "Use auth.security_guards on every child, home, RI and provider endpoint so users only see records they are entitled to access.",
        "action": "Prioritise young people, OS intelligence, reports, documents and exports routes.",
    })

    return {
        "ok": posture["ok"],
        "security_score": posture["score"],
        "security_band": posture["band"],
        "alerts": alerts,
    }

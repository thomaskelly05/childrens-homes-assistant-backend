from __future__ import annotations

import os

ORB_FRONT_DOOR_CONTRACT_VERSION = "orb_front_door_v1"
ORB_ACCESS_CONTRACT_VERSION = "orb_access_v2"
ORB_BACKEND_BUILD_HEADER = "X-ORB-Backend-Build"
ORB_FRONTEND_BUILD_HEADER = "X-ORB-Frontend-Build"
ORB_CONTRACT_VERSION_HEADER = "X-ORB-Contract-Version"

ORB_BUILD_HEADER_PATHS = frozenset(
    {
        "/orb/front-door/verdict",
        "/orb/standalone/access",
        "/orb/projects",
        "/orb/projects/",
        "/orb/standalone/config",
        "/orb/voice/session/status",
        "/orb/standalone/outputs/summary",
    }
)


def get_backend_build_marker() -> str:
    for key in ("RENDER_GIT_COMMIT", "GIT_SHA", "BUILD_SHA", "SOURCE_VERSION"):
        value = os.getenv(key, "").strip()
        if value:
            return value[:40]
    return "dev"


def get_frontend_build_marker() -> str | None:
    value = os.getenv("ORB_FRONTEND_BUILD", os.getenv("NEXT_PUBLIC_ORB_FRONTEND_BUILD", "")).strip()
    return value[:40] or None


def get_environment_name() -> str:
    return os.getenv("APP_ENV", os.getenv("ENV", "development")).strip().lower()


def orb_build_response_headers(*, contract_version: str | None = None) -> dict[str, str]:
    headers = {
        ORB_BACKEND_BUILD_HEADER: get_backend_build_marker(),
        ORB_CONTRACT_VERSION_HEADER: contract_version or ORB_FRONT_DOOR_CONTRACT_VERSION,
    }
    frontend_build = get_frontend_build_marker()
    if frontend_build:
        headers[ORB_FRONTEND_BUILD_HEADER] = frontend_build
    return headers

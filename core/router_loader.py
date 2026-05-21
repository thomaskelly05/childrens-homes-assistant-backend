from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from typing import Iterable

from fastapi import FastAPI

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RouterGroup:
    name: str
    routers: tuple[str, ...]
    classification: str = "canonical"
    notes: str = ""
    required_routers: tuple[str, ...] = ()


ROUTER_GROUPS: tuple[RouterGroup, ...] = (
    RouterGroup(
        "core",
        (
            "routers.auth_routes",
            "routers.mfa_routes",
            "routers.passkey_routes",
            "routers.session_security_routes",
            "routers.frontend_compat",
            "routers.security_routes",
            "routers.debug_health_routes",
        ),
        required_routers=(
            "routers.auth_routes",
            "routers.frontend_compat",
        ),
    ),
    RouterGroup(
        "assistant_orb",
        (
            "routers.orb_routes",
            "routers.orb_voice_routes",
            "routers.voice_routes",
        ),
    ),
    RouterGroup(
        "operations",
        (
            "routers.operational_feed_routes",
            "routers.os_workflow_wiring_audit_routes",
            "backend.os_live_validation_router",
            "backend.os_schema_audit_router",
            "backend.os_single_source_audit_router",
            "backend.os_security_convergence_router",
        ),
    ),
)

ROUTERS: list[str] = [router for group in ROUTER_GROUPS for router in group.routers]
REQUIRED_ROUTERS: frozenset[str] = frozenset(
    router for group in ROUTER_GROUPS for router in group.required_routers
)


@dataclass
class RouterLoadReport:
    loaded: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)
    skipped_optional: list[tuple[str, str]] = field(default_factory=list)


_LAST_LOAD_REPORT: RouterLoadReport | None = None


def _route_key(route) -> str | None:
    path = getattr(route, "path", None)
    methods = getattr(route, "methods", None)
    if not path or not methods:
        return None
    return f"{','.join(sorted(methods))} {path}"


def _iter_routes(app: FastAPI) -> Iterable[str]:
    for route in app.routes:
        key = _route_key(route)
        if key:
            yield key


def _is_missing_router_module(error: Exception, router_path: str) -> bool:
    return isinstance(error, ModuleNotFoundError) and getattr(error, "name", None) == router_path


def include_router(app: FastAPI, router_path: str) -> list[str]:
    module = importlib.import_module(router_path)
    mounted: list[str] = []
    for attr in ("router", "compat_router", "ui_router"):
        router = getattr(module, attr, None)
        if router is None:
            continue
        app.include_router(router)
        mounted.append(attr)
    if not mounted:
        raise AttributeError(f"{router_path} does not expose a FastAPI router")
    return mounted


def get_router_registry_summary() -> dict:
    return {
        "router_count": len(ROUTERS),
        "groups": [
            {
                "name": group.name,
                "classification": group.classification,
                "router_count": len(group.routers),
            }
            for group in ROUTER_GROUPS
        ],
    }


def get_failed_routers() -> list[dict[str, str]]:
    if _LAST_LOAD_REPORT is None:
        return []
    return [{"router": router, "error": error} for router, error in _LAST_LOAD_REPORT.failed]


def include_routers(app: FastAPI) -> RouterLoadReport:
    global _LAST_LOAD_REPORT

    report = RouterLoadReport()
    _ = set(_iter_routes(app))

    for router_path in ROUTERS:
        try:
            include_router(app, router_path)
            report.loaded.append(router_path)
        except Exception as error:
            if router_path in REQUIRED_ROUTERS:
                raise
            if _is_missing_router_module(error, router_path):
                report.skipped_optional.append((router_path, "module_not_present"))
                logger.info("Optional router %s not present", router_path)
                continue
            report.failed.append((router_path, str(error)))
            logger.warning("Router %s failed to load: %s", router_path, error)

    logger.info(
        "Router startup loaded %s routers across %s domains (%s failed)",
        len(report.loaded),
        len(ROUTER_GROUPS),
        len(report.failed),
    )

    _LAST_LOAD_REPORT = report
    return report

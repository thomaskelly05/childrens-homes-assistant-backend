from __future__ import annotations

from collections import defaultdict
from typing import Any, Iterable

from fastapi import FastAPI
from fastapi.routing import APIRoute

ORB_BOOTSTRAP_DEPENDENCY = "require_orb_product_bootstrap_access"

ORB_BOOTSTRAP_PROTECTED_PATHS: dict[str, set[str]] = {
    "/orb/projects": {"GET"},
    "/orb/standalone/config": {"GET"},
    "/orb/voice/session/status": {"GET"},
    "/orb/standalone/outputs/summary": {"GET"},
}

ORB_PUBLIC_OR_UNGATED_PATHS: dict[str, set[str]] = {
    "/orb/standalone/access": {"GET"},
    "/orb/front-door/verdict": {"GET"},
    "/orb/auth/providers": {"GET"},
    "/auth/me": {"GET"},
    "/auth/passkeys/status": {"GET"},
}


def _dependency_call_names(route: APIRoute) -> set[str]:
    names: set[str] = set()
    stack = list(route.dependant.dependencies)
    while stack:
        dep = stack.pop()
        call = getattr(dep, "call", None)
        if call is not None:
            names.add(getattr(call, "__name__", str(call)))
        stack.extend(getattr(dep, "dependencies", []) or [])
    return names


def _iter_api_routes(app: FastAPI) -> Iterable[APIRoute]:
    for route in app.routes:
        if isinstance(route, APIRoute):
            yield route


def find_routes_by_path(app: FastAPI, path: str) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    for route in _iter_api_routes(app):
        if route.path != path:
            continue
        endpoint = route.endpoint
        matches.append(
            {
                "path": route.path,
                "methods": sorted(route.methods or []),
                "name": route.name,
                "endpoint": getattr(endpoint, "__name__", str(endpoint)),
                "endpoint_module": getattr(endpoint, "__module__", None),
                "dependencies": sorted(_dependency_call_names(route)),
                "has_bootstrap_dependency": ORB_BOOTSTRAP_DEPENDENCY in _dependency_call_names(route),
            }
        )
    return matches


def duplicate_route_paths(app: FastAPI) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for route in _iter_api_routes(app):
        key = f"{','.join(sorted(route.methods or []))} {route.path}"
        grouped[key].append(
            {
                "name": route.name,
                "endpoint": getattr(route.endpoint, "__name__", str(route.endpoint)),
                "endpoint_module": getattr(route.endpoint, "__module__", None),
                "dependencies": sorted(_dependency_call_names(route)),
            }
        )
    return {key: entries for key, entries in grouped.items() if len(entries) > 1}


def route_has_bootstrap_dependency(app: FastAPI, path: str, method: str = "GET") -> bool:
    method = method.upper()
    for route in _iter_api_routes(app):
        if route.path != path:
            continue
        if method not in (route.methods or set()):
            continue
        return ORB_BOOTSTRAP_DEPENDENCY in _dependency_call_names(route)
    return False


def orb_route_audit_summary(app: FastAPI) -> dict[str, Any]:
    bootstrap_routes: list[dict[str, Any]] = []
    for path, methods in ORB_BOOTSTRAP_PROTECTED_PATHS.items():
        for method in sorted(methods):
            handlers = find_routes_by_path(app, path)
            method_handlers = [item for item in handlers if method in item["methods"]]
            bootstrap_routes.append(
                {
                    "path": path,
                    "method": method,
                    "handler_count": len(method_handlers),
                    "handlers": method_handlers,
                    "bootstrap_attached": any(item["has_bootstrap_dependency"] for item in method_handlers),
                }
            )

    return {
        "bootstrap_routes": bootstrap_routes,
        "duplicate_routes": duplicate_route_paths(app),
        "public_or_ungated_paths": {
            path: find_routes_by_path(app, path) for path in sorted(ORB_PUBLIC_OR_UNGATED_PATHS)
        },
    }

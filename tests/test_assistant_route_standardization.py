import json

from fastapi.routing import APIRoute

from app import app


def _route(path: str, method: str) -> APIRoute:
    for route in app.router.routes:
        if isinstance(route, APIRoute) and route.path == path and method in route.methods:
            return route
    raise AssertionError(f"{method} {path} route is not registered")


def test_standard_assistant_post_route_is_registered():
    _route("/assistant", "POST")


def test_render_health_routes_are_structured_200_responses():
    health = _route("/health", "GET").endpoint()
    assert health["ok"] is True
    assert health["status"] == "ok"
    assert health["routes"]["assistant"] == "/assistant"

    root_response = _route("/", "GET").endpoint()
    assert root_response.status_code == 200
    root = json.loads(root_response.body)
    assert root["ok"] is True
    assert root["check"] == "root"

    head_response = _route("/", "HEAD").endpoint()
    assert head_response.status_code == 200

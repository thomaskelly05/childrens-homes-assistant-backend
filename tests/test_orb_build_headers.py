from __future__ import annotations

from services.orb_build_version import (
    ORB_BACKEND_BUILD_HEADER,
    ORB_CONTRACT_VERSION_HEADER,
    get_backend_build_marker,
    orb_build_response_headers,
)


def test_build_headers_include_backend_and_contract():
    headers = orb_build_response_headers()
    assert headers[ORB_BACKEND_BUILD_HEADER] == get_backend_build_marker()
    assert headers[ORB_CONTRACT_VERSION_HEADER] == "orb_front_door_v1"


def test_orb_build_header_paths_include_verdict():
    from services.orb_build_version import ORB_BUILD_HEADER_PATHS

    assert "/orb/front-door/verdict" in ORB_BUILD_HEADER_PATHS

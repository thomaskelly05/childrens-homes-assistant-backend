from auth.rbac import (
    CANONICAL_STAFF_ROLES,
    has_permission,
    normalise_role,
    permissions_for_role,
)


def test_canonical_staff_roles_match_auth_foundation():
    assert CANONICAL_STAFF_ROLES == (
        "admin",
        "manager",
        "deputy_manager",
        "support_worker",
        "viewer",
    )


def test_legacy_staff_role_aliases_normalise_to_canonical_roles():
    assert normalise_role("provider_admin") == "admin"
    assert normalise_role("registered_manager") == "manager"
    assert normalise_role("staff") == "support_worker"


def test_viewer_has_read_only_permissions():
    assert has_permission("viewer", "records:read") is True
    assert has_permission("viewer", "records:write") is False
    assert has_permission("viewer", "assistant:access") is False


def test_support_worker_can_use_assistant_and_write_records():
    permissions = permissions_for_role("support_worker")
    assert "assistant:access" in permissions
    assert "records:write" in permissions
    assert "users:manage" not in permissions

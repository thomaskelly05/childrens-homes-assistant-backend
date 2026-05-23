from __future__ import annotations

from schemas.ai_privacy import AiPermissionCheckRequest
from services.ai_permission_guard_service import ai_permission_guard_service


def _manager():
    return {"id": 1, "role": "manager", "home_id": 1, "permissions": ["assistant:access", "records:read"]}


def _worker():
    return {"id": 2, "role": "support_worker", "home_id": 1, "permissions": ["assistant:access", "records:read"]}


def test_standalone_denies_child_record_summary():
    result = ai_permission_guard_service.check_permission(
        AiPermissionCheckRequest(
            surface="standalone_orb",
            action="send_to_model",
            data_classes=["child_record_summary"],
        ),
        {"role": "staff"},
    )
    assert result.allowed is False
    assert result.decision == "deny"


def test_standalone_allows_reference_guidance():
    result = ai_permission_guard_service.check_permission(
        AiPermissionCheckRequest(
            surface="standalone_orb",
            action="use_reference_guidance",
            data_classes=["reference_guidance"],
        ),
        {"role": "staff"},
    )
    assert result.allowed is True


def test_operational_allows_minimised_summary_when_authenticated():
    result = ai_permission_guard_service.check_permission(
        AiPermissionCheckRequest(
            surface="operational_orb",
            action="send_to_model",
            data_classes=["child_record_summary", "operational_metadata"],
            home_id=1,
            child_id=10,
        ),
        _manager(),
    )
    assert result.allowed is True
    assert result.decision in {"allow_minimised", "allow_redacted", "require_manager_review"}


def test_raw_child_record_denied_by_default():
    result = ai_permission_guard_service.check_permission(
        AiPermissionCheckRequest(
            surface="operational_orb",
            action="send_to_model",
            data_classes=["child_record_raw"],
        ),
        _manager(),
    )
    assert result.allowed is False


def test_export_blocked_for_insufficient_role():
    allowed = ai_permission_guard_service.can_export_ai_output(
        {"surface": "operational_outputs"},
        _worker(),
    )
    assert allowed is False


def test_manager_review_required_for_safeguarding_body_map():
    assert ai_permission_guard_service.require_manager_review(
        "analyse_safeguarding_theme",
        ["body_map"],
        "safeguarding_sensitive",
    )
    assert ai_permission_guard_service.require_manager_review(
        "send_to_model",
        ["health_medication"],
        "highly_sensitive",
    )

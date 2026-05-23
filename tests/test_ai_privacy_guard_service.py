from __future__ import annotations

import pytest

from schemas.ai_privacy import AiPrivacyGuardRequest
from services.ai_privacy_audit_service import ai_privacy_audit_service
from services.ai_privacy_guard_service import ai_privacy_guard_service


@pytest.fixture(autouse=True)
def _reset_audit():
    ai_privacy_audit_service.reset_for_tests()
    yield
    ai_privacy_audit_service.reset_for_tests()


def _manager():
    return {"id": 1, "role": "manager", "home_id": 1, "permissions": ["assistant:access", "records:read"]}


def test_deny_standalone_os_context():
    result = ai_privacy_guard_service.guard(
        AiPrivacyGuardRequest(
            surface="standalone_orb",
            action="use_child_context",
            context={"child_id": 1},
            data_classes=["child_record_summary"],
        ),
        _manager(),
    )
    assert result.allowed is False
    assert result.model_send_allowed is False


def test_allow_operational_minimised_redacted():
    result = ai_privacy_guard_service.guard_operational_context(
        {"summary": {"headline": "Safeguarding themes", "safeguarding_signals": ["theme a"]}},
        mode="safeguarding_themes",
        home_id=1,
        current_user=_manager(),
    )
    assert result.allowed is True
    assert result.safe_context.get("privacy_guard_applied") is True
    assert result.minimisation_applied or result.redaction_applied or result.allowed


def test_audit_event_created():
    result = ai_privacy_guard_service.guard_operational_context(
        {"summary": {"headline": "Brief"}},
        current_user=_manager(),
    )
    assert result.audit_event_id
    events = ai_privacy_audit_service.get_recent_events()
    assert any(e.id == result.audit_event_id for e in events)


def test_warnings_included_when_denied():
    result = ai_privacy_guard_service.guard(
        AiPrivacyGuardRequest(
            surface="operational_orb",
            action="send_to_model",
            data_classes=["child_record_raw"],
        ),
        _manager(),
    )
    assert result.model_send_allowed is False
    assert result.warnings

from __future__ import annotations

from schemas.ai_privacy import AiPrivacyAuditEvent, AiPrivacyFilter
from services.ai_privacy_audit_service import ai_privacy_audit_service


def setup_function():
    ai_privacy_audit_service.reset_for_tests()


def test_record_and_query_events():
    ai_privacy_audit_service.record_event(
        AiPrivacyAuditEvent(
            id="evt-1",
            surface="operational_orb",
            action="send_to_model",
            decision="allow_minimised",
            redaction_applied=True,
            minimisation_applied=True,
        )
    )
    events = ai_privacy_audit_service.get_recent_events(AiPrivacyFilter(limit=10))
    assert len(events) == 1
    assert events[0].redaction_applied is True


def test_privacy_summary_metrics():
    ai_privacy_audit_service.record_event(
        AiPrivacyAuditEvent(
            id="evt-deny",
            surface="standalone_orb",
            action="use_child_context",
            decision="deny",
            child_id=5,
        )
    )
    summary = ai_privacy_audit_service.get_privacy_summary()
    assert summary.denied_attempts >= 1
    assert summary.child_scoped_attempts >= 1

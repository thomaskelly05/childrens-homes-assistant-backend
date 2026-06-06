from __future__ import annotations

from unittest.mock import MagicMock

from services.security_rate_limit_service import RateLimitRule, log_rate_limit_event


def test_rate_limit_event_logs_safe_metadata_only(monkeypatch):
    recorded: list[dict] = []
    monkeypatch.setattr(
        "services.security_rate_limit_service.record_audit_event",
        lambda **kwargs: recorded.append(kwargs),
    )
    request = MagicMock()
    request.method = "POST"
    request.url.path = "/orb/standalone/conversation"
    request.headers = {}
    request.client = MagicMock(host="203.0.113.1")
    request.cookies = {}

    rule = RateLimitRule(
        "orb_chat",
        frozenset({"POST"}),
        lambda _m, _p: True,
        1,
        60,
        "user",
    )
    log_rate_limit_event(request, rule)
    assert recorded
    meta = recorded[0]["metadata"]
    assert meta["policy"] == "orb_chat"
    assert "message" not in meta
    assert "prompt" not in str(meta).lower()


def test_monitoring_doc_lists_rate_limit_event():
    text = open("docs/orb-security-monitoring-events.md", encoding="utf-8").read()
    assert "security.rate_limit_exceeded" in text
    assert "security.ai_abuse_limit" in text

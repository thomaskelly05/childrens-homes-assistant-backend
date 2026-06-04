from __future__ import annotations

import pytest

from schemas.data_protection import DataClassification
from services.ai_privacy_decision_service import AIPrivacyDecisionRequest, ai_privacy_decision_service
from services.ai_usage_audit_service import ai_usage_audit_service


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    yield recorded


def test_external_ai_disabled_blocks():
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            feature="orb_chat_stream",
            external_ai_enabled=False,
        )
    )
    assert decision.allowed is False
    assert decision.reason == "external_ai_disabled"
    assert decision.store_prompts is False
    assert decision.store_transcripts is False


def test_restricted_decision_feature_blocked():
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            feature="safeguarding_decision_support",
            external_ai_enabled=True,
            allowed_ai_features=["orb_chat_stream"],
        )
    )
    assert decision.allowed is False
    assert decision.reason == "restricted_decision_feature"


def test_ai_restricted_classification_blocks():
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            feature="orb_chat_stream",
            external_ai_enabled=True,
            allowed_ai_features=["orb_chat_stream"],
            data_classification=DataClassification.AI_RESTRICTED,
        )
    )
    assert decision.allowed is False


def test_confidential_child_uses_strict_redaction():
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            feature="orb_chat_stream",
            external_ai_enabled=True,
            allowed_ai_features=["orb_chat_stream"],
            data_classification=DataClassification.CONFIDENTIAL_CHILD,
        )
    )
    assert decision.allowed is True
    assert decision.redaction_mode == "strict"


def test_safeguarding_uses_safeguarding_strict_redaction():
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            feature="orb_chat_stream",
            external_ai_enabled=True,
            allowed_ai_features=["orb_chat_stream"],
            data_classification=DataClassification.SAFEGUARDING_SENSITIVE,
        )
    )
    assert decision.allowed is True
    assert decision.redaction_mode == "safeguarding_strict"


def test_no_training_required_by_default():
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            feature="metadata",
            external_ai_enabled=True,
            allowed_ai_features=["metadata"],
        )
    )
    assert decision.no_training_required is True

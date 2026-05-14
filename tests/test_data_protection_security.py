from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from assistant.citation_enforcer import enforce_citations
from repositories.os_repository_utils import build_scope_where
from schemas.data_protection import DataClassification
from services.ai_privacy_service import AIPrivacyService
from services.ai_provider_policy import AIProviderPolicy
from services.ai_redaction_service import AIRedactionService
from services.data_classification_service import classify_document_type, classify_record_type
from services.document_security_service import document_security_service
from services.safe_logging import safe_log_dict


def test_default_data_classifications():
    assert classify_record_type("young_person_profile") == DataClassification.CONFIDENTIAL_CHILD
    assert classify_record_type("assistant_transcript") == DataClassification.AI_RESTRICTED
    assert classify_document_type("risk_assessment") == DataClassification.SAFEGUARDING_SENSITIVE
    assert classify_document_type("health_plan") == DataClassification.HEALTH_SENSITIVE
    assert classify_document_type("reg44_report") == DataClassification.LEGAL_REGULATORY


def test_scope_where_fails_closed_without_allowed_home_ids():
    where, params = build_scope_where({"id", "home_id"}, {"role": "staff"})

    assert "1 = 0" in where
    assert params == []


def test_ai_privacy_disabled_blocks_external_processing():
    policy = AIProviderPolicy(
        external_processing_enabled=False,
        redaction_mode="strict",
        allow_identifiable_data=False,
        no_training_required=True,
        audit_prompts=False,
        store_prompts=False,
        store_transcripts=False,
    )
    service = AIPrivacyService(policy)

    decision = service.decide_external_processing(
        current_user={"permissions": ["assistant:access"]},
        classifications=[DataClassification.CONFIDENTIAL_CHILD],
    )

    assert decision.allowed is False
    assert decision.reason == "external_ai_disabled"


def test_ai_redaction_removes_identifiers():
    result = AIRedactionService().redact_text("John Smith DOB: 01/02/2010 called test@example.com", mode="strict")

    assert "test@example.com" not in result.text
    assert "01/02/2010" not in result.text
    assert "John Smith" not in result.text


def test_safe_logging_redacts_sensitive_fields():
    result = safe_log_dict(
        {
            "Authorization": "Bearer abcdefghijklmnopqrstuvwxyz",
            "email": "child@example.com",
            "prompt": "Sensitive prompt",
        }
    )

    assert result["Authorization"] == "[REDACTED]"
    assert result["prompt"] == "[REDACTED]"
    assert result["email"] == "[REDACTED_EMAIL]"


def test_document_security_rejects_executable_upload():
    upload = SimpleNamespace(filename="../bad.html", content_type="text/html")

    with pytest.raises(HTTPException) as exc:
        document_security_service.validate_upload(upload, document_type="care_plan")

    assert exc.value.status_code == 415


def test_citation_enforcer_blocks_hidden_refs():
    result = enforce_citations(
        answer_text="This claim cites [daily_note:999].",
        assistant_surface="os_embedded",
        requires_os_citations=True,
        evidence_index=[{"record_type": "daily_note", "record_id": 123}],
    )

    assert result.ok is False
    assert result.unsupported_record_citations == ["[daily_note:999]"]

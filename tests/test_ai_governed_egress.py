"""Tests for provider-agnostic governed AI egress (NR-1 Phase 1)."""

from __future__ import annotations

import pytest

from schemas.ai_models import (
    AiProviderGovernanceContext,
    AiProviderName,
    AiProviderRequest,
    AiProviderResponse,
)
from services.ai_external_call_governance import (
    FEATURE_ORB_MODEL_ROUTER_CHAT,
    build_router_governance_context,
)
from services.ai_governed_egress import AiGovernedEgress, ProviderEgressDecision
from services.ai_model_router_service import ai_model_router_service
from services.ai_provider_adapter_registry import AiProviderAdapterRegistry
from services.ai_providers.fake_governance_test_provider import FakeGovernanceTestProvider
from services.ai_usage_audit_service import ai_usage_audit_service


def _governance(**overrides) -> AiProviderGovernanceContext:
    base = build_router_governance_context(
        surface="standalone_orb_ai",
        route="tests.test_ai_governed_egress",
        local_fallback_available=True,
    )
    return base.model_copy(update=overrides)


def _request(**overrides) -> AiProviderRequest:
    governance = overrides.pop("governance", _governance())
    return AiProviderRequest(
        provider=AiProviderName.OPENAI,
        model="gpt-4o-mini",
        system_prompt="You are ORB.",
        message="hello",
        governance=governance,
        **overrides,
    )


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    yield recorded


@pytest.fixture
def fake_registry(monkeypatch):
    monkeypatch.setenv("AI_ALLOW_TEST_PROVIDER", "true")
    registry = AiProviderAdapterRegistry()
    fake = FakeGovernanceTestProvider()
    registry.register_test_adapter("fake_governance_test", fake)
    monkeypatch.setattr(
        "services.ai_provider_registry.ai_provider_registry.provider_available",
        lambda provider: provider.value in {"openai", "mock", "fake_governance_test"},
    )
    monkeypatch.setattr(
        "services.ai_provider_registry.ai_provider_registry.get_model_profile",
        lambda provider, model: object() if model else None,
    )
    egress = AiGovernedEgress(adapter_registry=registry)
    return fake, egress, registry


@pytest.mark.asyncio
async def test_missing_governance_context_fails_closed():
    request = AiProviderRequest(
        provider=AiProviderName.MOCK,
        model="mock-text",
        system_prompt="sys",
        message="hello",
    )
    response = await ai_model_router_service.complete(request)
    assert response.error == "governance_context_required"
    assert (response.metadata or {}).get("governance_blocked") is True


@pytest.mark.asyncio
async def test_external_ai_disabled_blocks_external_provider(monkeypatch, fake_registry):
    fake, egress, _registry = fake_registry
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    async def _fail_complete(_request):
        raise AssertionError("provider adapter must not be called when governance blocks")

    monkeypatch.setattr(
        "services.ai_providers.openai_provider.openai_provider.complete",
        _fail_complete,
    )

    governance = _governance(local_fallback_available=False)
    response, egress_decision = await egress.complete(
        _request(governance=governance),
        governance=governance,
    )
    assert egress_decision.governance_blocked is True
    assert response.error
    assert fake.complete_calls == []


@pytest.mark.asyncio
async def test_governed_egress_runs_before_provider_adapter(monkeypatch, fake_registry):
    fake, egress, registry = fake_registry
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    evaluate_calls: list[str] = []

    def _track_evaluate(**kwargs):
        evaluate_calls.append(kwargs.get("feature", ""))
        from schemas.data_protection import AIPrivacyDecision, DataClassification

        return AIPrivacyDecision(
            allowed=True,
            reason="external_ai_allowed_with_governance",
            mode="external_redacted",
            redaction_mode="strict",
            no_training_required=True,
            store_prompts=False,
            store_transcripts=False,
            audit_prompts=True,
            classification=DataClassification.INTERNAL_OPERATIONAL,
        )

    monkeypatch.setattr("services.ai_governed_egress.evaluate_external_call", _track_evaluate)

    governance = _governance()
    request = AiProviderRequest(
        provider=AiProviderName.MOCK,
        model="mock-text",
        system_prompt="You are ORB.",
        message="hello",
        governance=governance,
    )

    def _get(_provider):
        return fake

    registry.get = _get  # type: ignore[method-assign]

    response, egress_decision = await egress.complete(request, governance=governance)
    assert evaluate_calls == [FEATURE_ORB_MODEL_ROUTER_CHAT]
    assert fake.complete_calls
    assert egress_decision.allowed is True
    assert response.text.startswith("fake-response:")


@pytest.mark.asyncio
async def test_redacted_content_reaches_provider_not_raw(monkeypatch, fake_registry):
    fake, egress, registry = fake_registry
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")

    governance = _governance()
    request = AiProviderRequest(
        provider=AiProviderName.MOCK,
        model="mock-text",
        system_prompt="Contact John Smith DOB 01/02/2010",
        message="Staff member Jane Doe at SW1A 1AA",
        governance=governance,
    )

    def _get(_provider):
        return fake

    registry.get = _get  # type: ignore[method-assign]

    await egress.complete(request, governance=governance)
    assert fake.complete_calls
    sent = fake.complete_calls[0]
    assert "John Smith" not in sent.system_prompt
    assert "Jane Doe" not in sent.message


@pytest.mark.asyncio
async def test_disallowed_feature_blocks_before_provider(monkeypatch, fake_registry):
    fake, egress, registry = fake_registry
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")

    governance = _governance(feature="medical_diagnosis_draft", local_fallback_available=False)

    def _get(_provider):
        return fake

    registry.get = _get  # type: ignore[method-assign]

    response, egress_decision = await egress.complete(
        _request(governance=governance),
        governance=governance,
    )
    assert egress_decision.governance_blocked is True
    assert fake.complete_calls == []
    assert response.error


@pytest.mark.asyncio
async def test_usage_recorded_after_successful_provider_call(monkeypatch, fake_registry, _patch_audit):
    fake, egress, registry = fake_registry
    recorded = _patch_audit
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    governance = _governance()
    request = AiProviderRequest(
        provider=AiProviderName.OPENAI,
        model="gpt-4o-mini",
        system_prompt="sys",
        message="hello",
        governance=governance,
    )

    async def _fake_openai_complete(req):
        fake.complete_calls.append(req)
        return AiProviderResponse(
            text="ok",
            provider=AiProviderName.OPENAI,
            model=req.model,
            usage=None,
        )

    monkeypatch.setattr(
        "services.ai_providers.openai_provider.openai_provider.complete",
        _fake_openai_complete,
    )

    await egress.complete(request, governance=governance)
    assert recorded
    assert recorded[0]["feature"] == FEATURE_ORB_MODEL_ROUTER_CHAT


@pytest.mark.asyncio
async def test_provider_errors_are_sanitised(monkeypatch, fake_registry):
    fake, egress, registry = fake_registry
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    fake.raise_on_complete = RuntimeError("Bearer sk-secretkey1234567890 leaked")

    def _get(_provider):
        return fake

    registry.get = _get  # type: ignore[method-assign]

    governance = _governance()
    request = AiProviderRequest(
        provider=AiProviderName.MOCK,
        model="mock-text",
        system_prompt="sys",
        message="hello",
        governance=governance,
    )
    _response, egress_decision = await egress.complete(request, governance=governance)
    assert egress_decision.blocked_reason
    assert "sk-secret" not in (egress_decision.blocked_reason or "")


@pytest.mark.asyncio
async def test_openai_adapter_behind_governed_layer(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.delenv("AI_PROVIDER_STRICT", raising=False)

    called = {"openai": False}

    async def _fake_complete(request):
        called["openai"] = True
        return AiProviderResponse(
            text="governed-openai",
            provider=AiProviderName.OPENAI,
            model=request.model,
        )

    monkeypatch.setattr(
        "services.ai_providers.openai_provider.openai_provider.complete",
        _fake_complete,
    )

    governance = build_router_governance_context(
        surface="standalone_orb_ai",
        route="tests.test_ai_governed_egress",
    )
    response, _decision, _trace = await ai_model_router_service.complete_with_routing(
        message="hello",
        system_prompt="You are ORB.",
        governance=governance,
    )
    assert called["openai"] is True
    assert response.text == "governed-openai"


@pytest.mark.asyncio
async def test_fake_provider_behind_same_governed_layer(monkeypatch, fake_registry):
    fake, egress, registry = fake_registry
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")

    monkeypatch.setattr("services.ai_governed_egress.ai_governed_egress", egress)

    governance = _governance()
    request = AiProviderRequest(
        provider=AiProviderName.MOCK,
        model="mock-text",
        system_prompt="sys",
        message="prove-not-openai-only",
        governance=governance,
    )

    def _get(_provider):
        return fake

    registry.get = _get  # type: ignore[method-assign]

    response, egress_decision = await egress.complete(request, governance=governance)
    assert fake.complete_calls
    assert response.text.startswith("fake-response:")
    assert egress_decision.allowed is True


def test_orb_router_builds_governance_context_from_user():
    governance = build_router_governance_context(
        surface="standalone_orb_ai",
        user={"id": 42, "provider_id": 7, "home_id": 3, "role": "manager"},
        route="orb_general_assistant_service.answer",
    )
    assert governance.feature == FEATURE_ORB_MODEL_ROUTER_CHAT
    assert governance.user_id == 42
    assert governance.provider_id == 7
    assert governance.home_id == 3
    assert governance.role == "manager"
    assert governance.route == "orb_general_assistant_service.answer"


def test_provider_egress_decision_dataclass():
    decision = ProviderEgressDecision(allowed=False, governance_blocked=True)
    assert decision.allowed is False
    assert decision.governance_blocked is True

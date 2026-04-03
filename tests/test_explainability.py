from __future__ import annotations

from assistant.explainability import (
    build_explainability_payload,
    build_loading_updates,
)


class DummyRuntime:
    def __init__(
        self,
        *,
        mode: str = "recording",
        task_type: str = "recording",
        output_type: str = "structured_record",
        safeguarding_level: str = "normal",
        urgency: str = "routine",
        user_role_profile: str = "staff",
        response_stance: str = "balanced",
        classification_confidence: str = "high",
        secondary_intents: list[str] | None = None,
    ):
        self.mode = mode
        self.task_type = task_type
        self.output_type = output_type
        self.safeguarding_level = safeguarding_level
        self.urgency = urgency
        self.user_role_profile = user_role_profile
        self.response_stance = response_stance
        self.classification_confidence = classification_confidence
        self.secondary_intents = secondary_intents or []
        self.suggested_actions_context = "• Keep it factual\n• Separate observation from action"
        self.retrieval_level = "light"
        self.reflection_level = "none"


class DummyGuidancePlan:
    def __init__(self, *, enabled: bool = False, reason: str = "No live search needed."):
        self.enabled = enabled
        self.reason = reason
        self.search_query = (
            "What does Ofsted expect from incident recording?" if enabled else ""
        )


class DummyModelPlan:
    def __init__(self):
        self.model = "gpt-4o-mini"
        self.temperature = 0.2
        self.max_tokens = 600


class DummyOrchestration:
    def __init__(
        self,
        *,
        runtime: DummyRuntime | None = None,
        guidance_enabled: bool = False,
        guidance_reason: str = "No live search needed.",
        has_document: bool = False,
        selected_mode: str = "balanced",
        regulation_basis: list[str] | None = None,
    ):
        self.runtime = runtime or DummyRuntime()
        self.guidance_plan = DummyGuidancePlan(
            enabled=guidance_enabled,
            reason=guidance_reason,
        )
        self.model_plan = DummyModelPlan()
        self.selected_mode = selected_mode
        self.has_document = has_document
        self.regulation_basis = regulation_basis or ["Regulation 12"]
        self.sources = []
        self.runtime_payload = {}
        self.trimmed_history = []
        self.user_message = "User message"
        self.system_prompt = "System prompt"


# =========================================================
# PAYLOAD TESTS
# =========================================================

def test_build_explainability_payload_returns_dict():
    orchestration = DummyOrchestration()

    payload = build_explainability_payload(
        user_message="Help me write a factual record.",
        orchestration=orchestration,
    )

    assert isinstance(payload, dict)


def test_build_explainability_payload_contains_core_fields():
    orchestration = DummyOrchestration()

    payload = build_explainability_payload(
        user_message="Help me write a factual record.",
        orchestration=orchestration,
    )

    assert payload["mode"] == "recording"
    assert payload["task_type"] == "recording"
    assert payload["output_type"] == "structured_record"
    assert payload["safeguarding_level"] == "normal"
    assert payload["urgency"] == "routine"
    assert payload["response_stance"] == "balanced"
    assert payload["selected_mode"] == "balanced"


def test_build_explainability_payload_includes_mode_and_output_labels():
    orchestration = DummyOrchestration()

    payload = build_explainability_payload(
        user_message="Please write this up.",
        orchestration=orchestration,
    )

    assert "mode_label" in payload
    assert "output_label" in payload
    assert isinstance(payload["mode_label"], str)
    assert isinstance(payload["output_label"], str)
    assert payload["mode_label"]
    assert payload["output_label"]


def test_build_explainability_payload_includes_guidance_and_model_info():
    orchestration = DummyOrchestration(
        guidance_enabled=True,
        guidance_reason="Guidance search enabled for statutory query.",
    )

    payload = build_explainability_payload(
        user_message="What does Ofsted expect from this?",
        orchestration=orchestration,
    )

    assert payload["guidance_search_enabled"] is True
    assert payload["guidance_search_reason"] == "Guidance search enabled for statutory query."
    assert payload["model"] == "gpt-4o-mini"
    assert payload["temperature"] == 0.2
    assert payload["max_tokens"] == 600


def test_build_explainability_payload_includes_request_summary():
    orchestration = DummyOrchestration()

    payload = build_explainability_payload(
        user_message="Please help me write a factual incident record for the home's records.",
        orchestration=orchestration,
    )

    assert "request_summary" in payload
    assert isinstance(payload["request_summary"], str)
    assert payload["request_summary"]


def test_build_explainability_payload_includes_classification_signals():
    orchestration = DummyOrchestration()

    payload = build_explainability_payload(
        user_message="Help me write a factual record.",
        orchestration=orchestration,
    )

    assert "classification_signals" in payload
    assert isinstance(payload["classification_signals"], list)
    assert len(payload["classification_signals"]) >= 1


def test_build_explainability_payload_includes_planning_reasons():
    orchestration = DummyOrchestration(
        guidance_enabled=True,
        guidance_reason="Guidance search enabled for statutory query.",
    )

    payload = build_explainability_payload(
        user_message="What do the regulations say?",
        orchestration=orchestration,
    )

    assert "planning_reasons" in payload
    assert isinstance(payload["planning_reasons"], list)
    assert len(payload["planning_reasons"]) >= 1


def test_build_explainability_payload_includes_regulation_basis():
    orchestration = DummyOrchestration(
        regulation_basis=["Regulation 12", "Quality standard: protection of children"]
    )

    payload = build_explainability_payload(
        user_message="What regulations are relevant?",
        orchestration=orchestration,
    )

    assert "regulation_basis" in payload
    assert isinstance(payload["regulation_basis"], list)
    assert len(payload["regulation_basis"]) >= 1


def test_build_explainability_payload_includes_secondary_intents_when_present():
    orchestration = DummyOrchestration(
        runtime=DummyRuntime(secondary_intents=["recording", "review"])
    )

    payload = build_explainability_payload(
        user_message="Review this and improve the wording.",
        orchestration=orchestration,
    )

    assert "secondary_intents" in payload
    assert payload["secondary_intents"] == ["recording", "review"]


def test_build_explainability_payload_omits_empty_fields_where_possible():
    runtime = DummyRuntime(secondary_intents=[])
    orchestration = DummyOrchestration(runtime=runtime)
    payload = build_explainability_payload(
        user_message="Help me.",
        orchestration=orchestration,
    )

    assert "secondary_intents" not in payload or payload["secondary_intents"] != []


def test_build_explainability_payload_handles_partial_runtime_safely():
    class PartialRuntime:
        mode = "handover"
        task_type = "recording"
        output_type = "handover_note"
        safeguarding_level = "normal"
        urgency = "routine"
        user_role_profile = "staff"
        response_stance = "balanced"
        classification_confidence = "working"
        secondary_intents = []

    orchestration = DummyOrchestration(runtime=PartialRuntime())

    payload = build_explainability_payload(
        user_message="Write a handover.",
        orchestration=orchestration,
    )

    assert isinstance(payload, dict)
    assert payload["mode"] == "handover"
    assert payload["output_type"] == "handover_note"


# =========================================================
# LOADING UPDATE TESTS
# =========================================================

def test_build_loading_updates_initial_review_returns_lines():
    orchestration = DummyOrchestration()

    updates = build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    assert isinstance(updates, list)
    assert len(updates) == 2
    assert all(isinstance(line, str) for line in updates)
    assert all(line.strip() for line in updates)


def test_build_loading_updates_post_search_returns_lines():
    orchestration = DummyOrchestration()

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    assert isinstance(updates, list)
    assert len(updates) == 2
    assert all(isinstance(line, str) for line in updates)
    assert all(line.strip() for line in updates)


def test_initial_review_mentions_document_when_present():
    orchestration = DummyOrchestration(has_document=True)

    updates = build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    combined = " ".join(updates).lower()
    assert "document" in combined


def test_initial_review_mentions_heightened_safeguarding_when_present():
    orchestration = DummyOrchestration(
        runtime=DummyRuntime(
            mode="recording",
            task_type="recording",
            output_type="structured_record",
            safeguarding_level="heightened",
            urgency="heightened",
        )
    )

    updates = build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    combined = " ".join(updates).lower()
    assert "heightened" in combined


def test_post_search_mentions_trusted_guidance_when_search_used():
    orchestration = DummyOrchestration(guidance_enabled=True)

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=True,
        has_search_results=True,
    )

    combined = " ".join(updates).lower()
    assert "guidance" in combined or "trusted" in combined


def test_post_search_mentions_internal_framework_when_no_search_used():
    orchestration = DummyOrchestration(guidance_enabled=False)

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    combined = " ".join(updates).lower()
    assert "internal" in combined or "framework" in combined or "practical" in combined


def test_loading_updates_for_recording_task_sound_practical():
    orchestration = DummyOrchestration(
        runtime=DummyRuntime(
            mode="recording",
            task_type="recording",
            output_type="structured_record",
        )
    )

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    combined = " ".join(updates).lower()
    assert "paste-ready" in combined or "factual" in combined or "practical" in combined


def test_loading_updates_for_review_task_sound_review_focused():
    orchestration = DummyOrchestration(
        runtime=DummyRuntime(
            mode="manager_review",
            task_type="review",
            output_type="manager_review",
            user_role_profile="manager",
        )
    )

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=True,
        has_search_results=True,
    )

    combined = " ".join(updates).lower()
    assert "review" in combined or "oversight" in combined or "follow-up" in combined


def test_loading_updates_for_planning_task_sound_planning_focused():
    orchestration = DummyOrchestration(
        runtime=DummyRuntime(
            mode="support_planning",
            task_type="planning",
            output_type="risk_summary",
            user_role_profile="staff",
        )
    )

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    combined = " ".join(updates).lower()
    assert "planning" in combined or "next steps" in combined


def test_unknown_stage_returns_empty_list():
    orchestration = DummyOrchestration()

    updates = build_loading_updates(
        stage="something_else",
        orchestration=orchestration,
        search_enabled=False,
        has_search_results=False,
    )

    assert updates == []


# =========================================================
# PROFESSIONAL TONE SAFETY CHECKS
# =========================================================

def test_loading_updates_do_not_sound_overly_technical():
    orchestration = DummyOrchestration()

    updates = build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=True,
        has_search_results=False,
    )

    combined = " ".join(updates).lower()

    banned_terms = [
        "classifier",
        "tokenisation",
        "vector index",
        "embedding distance",
        "latent",
        "inference graph",
    ]

    assert not any(term in combined for term in banned_terms)


def test_loading_updates_do_not_expose_internal_jargon():
    orchestration = DummyOrchestration()

    updates = build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=True,
        has_search_results=True,
    )

    combined = " ".join(updates).lower()

    banned_terms = [
        "runtime payload",
        "orchestrator result",
        "metadata object",
        "internal enum",
    ]

    assert not any(term in combined for term in banned_terms)


def test_explainability_payload_remains_serialisable_shape():
    orchestration = DummyOrchestration(
        guidance_enabled=True,
        guidance_reason="Guidance search enabled for statutory query.",
    )

    payload = build_explainability_payload(
        user_message="Please review this against regulations and Ofsted expectations.",
        orchestration=orchestration,
    )

    assert isinstance(payload["classification_signals"], list)
    assert isinstance(payload["planning_reasons"], list)
    assert isinstance(payload["regulation_basis"], list)

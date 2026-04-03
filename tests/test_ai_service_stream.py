from __future__ import annotations

import pytest

from services.ai_service import generate_ai_stream


class DummyRuntime:
    mode = "recording"
    task_type = "recording"
    output_type = "structured_record"
    safeguarding_level = "normal"
    urgency = "routine"
    user_role_profile = "staff"
    response_stance = "balanced"
    classification_confidence = "high"
    secondary_intents = []
    suggested_actions_context = "• Keep it factual\n• Separate observation from action"


class DummyGuidancePlan:
    def __init__(self, enabled: bool = False, reason: str = ""):
        self.enabled = enabled
        self.reason = reason
        self.search_query = "What does Ofsted expect from incident recording?" if enabled else ""


class DummyModelPlan:
    def __init__(self):
        self.model = "gpt-4o-mini"
        self.temperature = 0.2
        self.max_tokens = 600


class DummyResponsePlan:
    def __init__(self):
        self.selected_mode = "balanced"
        self.response_stance = "balanced"
        self.guidance_plan = DummyGuidancePlan(enabled=False, reason="No live search needed.")
        self.model_plan = DummyModelPlan()
        self.should_use_memory = True
        self.should_use_retrieval = True
        self.should_use_reflection = False
        self.should_use_supervision = False
        self.should_use_leadership_lens = False


class DummyOrchestration:
    def __init__(self, guidance_enabled: bool = False):
        self.runtime = DummyRuntime()
        self.model_plan = DummyModelPlan()
        self.guidance_plan = DummyGuidancePlan(
            enabled=guidance_enabled,
            reason="Guidance search enabled for statutory query." if guidance_enabled else "No live search needed."
        )
        self.response_plan = DummyResponsePlan()
        self.system_prompt = "System prompt"
        self.user_message = "User message"
        self.trimmed_history = [{"role": "assistant", "content": "Previous assistant reply."}]
        self.sources = [
            {
                "type": "regulation",
                "label": "Children’s Homes Regulations — Regulation 12",
                "document_title": "Children’s Homes Regulations",
                "section": "Regulation 12",
                "page_number": None,
                "excerpt": "The protection of children standard...",
                "url": None,
            }
        ]
        self.runtime_payload = {
            "mode": "recording",
            "task_type": "recording",
            "output_type": "structured_record",
            "safeguarding_level": "normal",
            "urgency": "routine",
            "user_role_profile": "staff",
            "response_stance": "balanced",
            "suggested_actions": [
                "Keep it factual",
                "Separate observation from action",
            ],
            "regulation_basis": [
                {"label": "Regulation 12", "reason": "Protection of children"}
            ],
        }
        self.selected_mode = "balanced"
        self.has_document = False
        self.regulation_basis = ["Regulation 12"]
        self.regulation_payload = [{"label": "Regulation 12", "reason": "Protection of children"}]
        self.messages = [
            {"role": "system", "content": "System prompt"},
            {"role": "assistant", "content": "Previous assistant reply."},
            {"role": "user", "content": "User message"},
        ]


class DummyProvider:
    def __init__(self, chunks: list[str] | None = None, fail: bool = False):
        self.chunks = chunks or ["Hello", " world"]
        self.fail = fail

    async def stream_chat(self, request):
        if self.fail:
            raise RuntimeError("Provider failed")

        for chunk in self.chunks:
            yield chunk


@pytest.mark.asyncio
async def test_generate_ai_stream_emits_progress_token_and_meta(monkeypatch):
    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["This ", "is ", "fine."]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    events = []
    async for item in generate_ai_stream(
        message="Help me write this incident record.",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        events.append(item)

    progress_events = [e for e in events if e.get("type") == "progress"]
    token_events = [e for e in events if e.get("type") == "token"]
    meta_events = [e for e in events if e.get("type") == "meta"]

    assert len(progress_events) >= 2
    assert len(token_events) == 3
    assert len(meta_events) == 1

    combined_text = "".join(event["content"] for event in token_events)
    assert combined_text == "This is fine."

    meta = meta_events[0]
    assert "sources" in meta
    assert "runtime" in meta
    assert "explainability" in meta


@pytest.mark.asyncio
async def test_generate_ai_stream_includes_explainability_payload(monkeypatch):
    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["Draft ready."]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    meta_event = None

    async for item in generate_ai_stream(
        message="Write me a factual record.",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        if item.get("type") == "meta":
            meta_event = item

    assert meta_event is not None
    explainability = meta_event["explainability"]

    assert isinstance(explainability, dict)
    assert explainability.get("mode") == "recording"
    assert explainability.get("task_type") == "recording"
    assert explainability.get("output_type") == "structured_record"


@pytest.mark.asyncio
async def test_generate_ai_stream_emits_meta_last(monkeypatch):
    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["One", " two", " three"]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    events = []
    async for item in generate_ai_stream(
        message="Help me draft a chronology.",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        events.append(item)

    assert events[-1]["type"] == "meta"


@pytest.mark.asyncio
async def test_generate_ai_stream_uses_guidance_search_when_enabled(monkeypatch):
    calls = {"count": 0}

    async def fake_search(*, enabled: bool, search_query: str) -> str:
        calls["count"] += 1
        assert enabled is True
        assert search_query
        return "[Primary 1] Ofsted SCCIF\nSnippet: Relevant guidance"

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=True),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["Answer using guidance."]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    events = []
    async for item in generate_ai_stream(
        message="What does Ofsted expect from recording?",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        events.append(item)

    assert calls["count"] == 1
    assert any(event.get("type") == "progress" for event in events)
    assert any(event.get("type") == "meta" for event in events)


@pytest.mark.asyncio
async def test_generate_ai_stream_handles_provider_failure_safely(monkeypatch):
    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(fail=True),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    events = []
    async for item in generate_ai_stream(
        message="Help me write this incident.",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        events.append(item)

    token_events = [e for e in events if e.get("type") == "token"]
    meta_events = [e for e in events if e.get("type") == "meta"]

    assert len(token_events) == 1
    assert "something went wrong" in token_events[0]["content"].lower()
    assert len(meta_events) == 1


@pytest.mark.asyncio
async def test_generate_ai_stream_passes_document_flag_through_orchestration(monkeypatch):
    captured = {}

    def fake_build_orchestrator_result(req):
        captured["document_text"] = req.document_text
        captured["document_name"] = req.document_name
        return DummyOrchestration(guidance_enabled=False)

    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        fake_build_orchestrator_result,
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["Document handled."]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    async for _ in generate_ai_stream(
        message="Rewrite this procedure.",
        session_id="123",
        history=[],
        document_text="This is the current procedure text.",
        document_name="Procedure.docx",
        response_mode="balanced",
    ):
        pass

    assert captured["document_text"] == "This is the current procedure text."
    assert captured["document_name"] == "Procedure.docx"


@pytest.mark.asyncio
async def test_generate_ai_stream_preserves_token_order(monkeypatch):
    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["First ", "second ", "third"]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    pieces = []

    async for item in generate_ai_stream(
        message="Write a handover.",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        if item.get("type") == "token":
            pieces.append(item["content"])

    assert pieces == ["First ", "second ", "third"]
    assert "".join(pieces) == "First second third"


@pytest.mark.asyncio
async def test_generate_ai_stream_returns_runtime_and_sources_in_meta(monkeypatch):
    async def fake_search(*, enabled: bool, search_query: str) -> str:
        return ""

    monkeypatch.setattr(
        "services.ai_service.build_orchestrator_result",
        lambda req: DummyOrchestration(guidance_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_service.get_llm_provider",
        lambda: DummyProvider(["Completed."]),
    )
    monkeypatch.setattr(
        "services.ai_service._maybe_run_guidance_search",
        fake_search,
    )

    meta_event = None

    async for item in generate_ai_stream(
        message="Help me write a factual note.",
        session_id="123",
        history=[],
        response_mode="balanced",
    ):
        if item.get("type") == "meta":
            meta_event = item

    assert meta_event is not None
    assert isinstance(meta_event["runtime"], dict)
    assert isinstance(meta_event["sources"], list)
    assert meta_event["runtime"]["mode"] == "recording"
    assert len(meta_event["sources"]) == 1

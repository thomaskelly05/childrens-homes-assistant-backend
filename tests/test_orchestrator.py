from __future__ import annotations

from assistant.orchestrator import OrchestratorRequest, build_orchestrator_result


def make_request(
    message: str,
    *,
    speed: str = "balanced",
    role: str = "residential care staff",
    history: list[dict] | None = None,
    document_text: str | None = None,
    document_name: str | None = None,
    user_context: dict | None = None,
):
    return OrchestratorRequest(
        message=message,
        session_id="123",
        history=history or [],
        role=role,
        document_text=document_text,
        document_name=document_name,
        ld_lens=False,
        training_mode=False,
        speed=speed,
        user_context=user_context or {},
    )


def test_urgent_safeguarding_sets_urgent_runtime():
    result = build_orchestrator_result(
        make_request("A young person is not breathing and staff have called an ambulance.")
    )

    assert result.runtime.safeguarding_level == "urgent"
    assert result.runtime.urgency == "urgent"


def test_urgent_safeguarding_disables_guidance_search():
    result = build_orchestrator_result(
        make_request("A young person is not breathing and staff have called an ambulance.")
    )

    assert result.guidance_plan.enabled is False


def test_guidance_question_enables_guidance_search():
    result = build_orchestrator_result(
        make_request("What do the Children's Homes Regulations say about safeguarding?")
    )

    assert result.guidance_plan.enabled is True
    assert result.guidance_plan.search_query


def test_quick_mode_uses_smaller_model_plan():
    result = build_orchestrator_result(
        make_request(
            "Write a short handover from this information.",
            speed="quick",
        )
    )

    assert result.selected_mode == "quick"
    assert result.model_plan.model
    assert result.model_plan.max_tokens <= 500


def test_deep_mode_uses_larger_model_plan():
    result = build_orchestrator_result(
        make_request(
            "Review this situation as a manager and identify gaps, risks, and next steps.",
            speed="deep",
            role="registered manager",
        )
    )

    assert result.selected_mode == "deep"
    assert result.model_plan.model
    assert result.model_plan.max_tokens >= 900


def test_document_request_marks_has_document():
    result = build_orchestrator_result(
        make_request(
            "Rewrite this policy in clearer language.",
            document_text="This policy sets out the home's expectations...",
            document_name="Behaviour Policy.docx",
        )
    )

    assert result.has_document is True
    assert result.runtime.task_type in {"document_work", "review", "guidance"}


def test_recording_request_prefers_recording_output():
    result = build_orchestrator_result(
        make_request("Write this up as a factual incident record for the home's records.")
    )

    assert result.runtime.task_type in {"recording", "document_work"}
    assert result.runtime.output_type in {
        "incident_record",
        "structured_record",
        "daily_note",
    }


def test_handover_request_prefers_handover_output():
    result = build_orchestrator_result(
        make_request("Please draft a handover for the next shift.")
    )

    assert result.runtime.mode == "handover"
    assert result.runtime.output_type == "handover_note"


def test_chronology_request_prefers_chronology_output():
    result = build_orchestrator_result(
        make_request("Put this into a chronology entry.")
    )

    assert result.runtime.mode == "chronology"
    assert result.runtime.output_type == "chronology_entry"


def test_manager_role_changes_role_profile():
    result = build_orchestrator_result(
        make_request(
            "Review this as a manager and tell me what needs following up.",
            role="registered manager",
        )
    )

    assert result.runtime.user_role_profile == "manager"


def test_provider_role_changes_role_profile():
    result = build_orchestrator_result(
        make_request(
            "Review this from a provider oversight perspective.",
            role="responsible individual",
        )
    )

    assert result.runtime.user_role_profile == "provider"


def test_guidance_query_collects_regulation_basis_when_available():
    result = build_orchestrator_result(
        make_request(
            "What is the regulation basis for safe care planning in a children's home?"
        )
    )

    assert isinstance(result.regulation_basis, list)


def test_trimmed_history_is_bounded():
    history = [
        {"role": "user", "message": f"User message {i}"}
        for i in range(20)
    ]

    result = build_orchestrator_result(
        make_request(
            "Help me with this incident wording.",
            history=history,
            speed="balanced",
        )
    )

    assert isinstance(result.trimmed_history, list)
    assert len(result.trimmed_history) <= 8


def test_quick_mode_history_is_smaller_than_deep_mode():
    history = [
        {"role": "user", "message": f"Message {i}"}
        for i in range(20)
    ]

    quick_result = build_orchestrator_result(
        make_request(
            "Help me write a daily log.",
            history=history,
            speed="quick",
        )
    )
    deep_result = build_orchestrator_result(
        make_request(
            "Help me write a daily log.",
            history=history,
            speed="deep",
        )
    )

    assert len(quick_result.trimmed_history) <= len(deep_result.trimmed_history)


def test_system_prompt_and_user_message_are_present():
    result = build_orchestrator_result(
        make_request("Help me write a clear daily log.")
    )

    assert isinstance(result.system_prompt, str)
    assert isinstance(result.user_message, str)
    assert result.system_prompt.strip()
    assert result.user_message.strip()


def test_model_plan_contains_required_values():
    result = build_orchestrator_result(
        make_request("Review this incident as a manager.")
    )

    assert result.model_plan.model
    assert isinstance(result.model_plan.temperature, float)
    assert isinstance(result.model_plan.max_tokens, int)
    assert result.model_plan.max_tokens > 0


def test_guidance_plan_has_reason_field():
    result = build_orchestrator_result(
        make_request("What does Ofsted expect from incident recording?")
    )

    assert hasattr(result.guidance_plan, "reason")
    assert isinstance(result.guidance_plan.reason, str)


def test_uploaded_document_does_not_force_guidance_search():
    result = build_orchestrator_result(
        make_request(
            "Rewrite this document in clearer professional language.",
            document_text="This is the current wording of the document.",
            document_name="Home Procedure.docx",
        )
    )

    assert result.has_document is True
    assert isinstance(result.guidance_plan.enabled, bool)


def test_reflective_request_routes_to_reflective_or_supervision_shape():
    result = build_orchestrator_result(
        make_request(
            "I am not sure whether I handled that conversation well and want to reflect on it."
        )
    )

    assert result.runtime.mode in {"reflective", "supervision", "general_practice"}
    assert result.runtime.task_type in {"reflection", "guidance", "review"}


def test_safeguarding_watchful_detected_for_lower_level_concern():
    result = build_orchestrator_result(
        make_request("A young person has an unexplained bruise and staff are worried.")
    )

    assert result.runtime.safeguarding_level in {"watchful", "heightened", "urgent", "normal"}

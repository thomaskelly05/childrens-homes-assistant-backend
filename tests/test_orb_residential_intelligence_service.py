from services.orb_residential_intelligence_service import orb_residential_intelligence_service


def test_standalone_context_packet_has_no_live_record_access():
    packet = orb_residential_intelligence_service.build_context_packet(
        "Help me write this safeguarding concern professionally",
        mode="Record This Properly",
        surface="standalone",
        supplied_context_types=["pasted_notes"],
    )

    payload = packet.to_dict()
    assert payload["surface"] == "standalone"
    assert payload["live_record_access"] is False
    assert payload["os_linked"] is False
    assert any("Do not access" in rule for rule in payload["guardrails"])
    assert payload["selected_knowledge_modules"]
    assert payload["contract_ui_schema"]["mode"] in {"recording", "guidance"}


def test_operational_context_packet_marks_live_record_access():
    packet = orb_residential_intelligence_service.build_context_packet(
        "Review the evidence for Reg 45",
        mode="reg45",
        surface="operational",
        supplied_context_types=["os_evidence_index"],
    )

    payload = packet.to_dict()
    assert payload["surface"] == "operational"
    assert payload["live_record_access"] is True
    assert payload["os_linked"] is True
    assert any("permissioned IndiCare OS context" in rule for rule in payload["guardrails"])


def test_shift_builder_draft_uses_only_supplied_notes():
    draft = orb_residential_intelligence_service.build_shift_builder_draft(
        "YP returned from school unsettled. Staff offered space. Later apologised and asked to call mum."
    ).to_dict()

    assert set(draft) == {
        "daily_note_prompt",
        "handover_prompt",
        "incident_flags_prompt",
        "safeguarding_prompt",
        "manager_review_prompt",
        "therapeutic_reflection_prompt",
        "missing_information_prompt",
    }
    assert "Use only the supplied shift notes" in draft["daily_note_prompt"]
    assert "Do not invent" in draft["handover_prompt"]
    assert "child-centred" in draft["daily_note_prompt"]
    assert "manager review" in draft["incident_flags_prompt"].lower()


def test_process_answer_flags_standalone_unseen_record_claims():
    processed = orb_residential_intelligence_service.process_answer(
        answer_text="Your records show this pattern across the chronology.",
        message="What does this mean?",
        surface="standalone",
    )

    assert processed["context_packet"]["surface"] == "standalone"
    assert "standalone_answer_implies_unseen_record_access" in processed["quality"]["warnings"]

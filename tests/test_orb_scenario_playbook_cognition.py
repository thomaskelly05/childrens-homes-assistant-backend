from __future__ import annotations

import pytest

from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_knowledge_grounding_service import orb_knowledge_grounding_service
from services.orb_knowledge_vault_service import orb_knowledge_vault_service
from services.orb_residential_cognition_router import orb_residential_cognition_router
from services.orb_scenario_playbook_service import orb_scenario_playbook_service
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime

CAR_PROMPT = (
    "a car has pulled up and a 17 year old girl we look after is about to get into it "
    "can I physically stop her"
)


def _route(message: str, mode: str = "Ask ORB") -> dict:
    return orb_residential_cognition_router.route(message=message, mode=mode)


def _labels(message: str, mode: str = "Ask ORB") -> list[str]:
    return _route(message, mode).get("cognition_display_labels") or []


def _assert_live_labels(labels: list[str]) -> None:
    assert labels[:4] == [
        "Immediate safeguarding",
        "Exploitation risk",
        "Missing from home",
        "Restrictive practice",
    ]


def _assert_has_immediate(labels: list[str]) -> None:
    assert "Immediate safeguarding" in labels


def _assert_has_exploitation(labels: list[str]) -> None:
    assert "Exploitation risk" in labels


def _assert_has_safeguarding(labels: list[str]) -> None:
    assert "Immediate safeguarding" in labels or "Safeguarding" in labels


def _noop_labels(labels: list[str]) -> None:
    del labels


def test_car_pickup_live_safeguarding_routing():
    routing = _route(CAR_PROMPT)
    assert routing["topic"] == "live_safeguarding_incident"
    assert routing["playbook_id"] == "unknown_vehicle_pickup"
    assert routing["depth_level"] == "critical"
    assert routing["high_attention"] is True
    _assert_live_labels(routing["cognition_display_labels"])


def test_car_pickup_depth_frame_and_playbook_content():
    frame = orb_institutional_depth_frame_service.build_frame(message=CAR_PROMPT)
    assert frame.get("playbook_id") == "unknown_vehicle_pickup"
    opening = frame.get("opening_anchor", "")
    assert "live safeguarding situation" in opening.lower()
    assert "physically stop" in opening.lower()
    structure = frame.get("response_structure") or []
    assert any("Immediate priority" in s for s in structure)
    assert any("physical intervention" in s.lower() for s in structure)
    must_avoid = " ".join(frame.get("avoid") or []).lower()
    assert "blanket" in must_avoid


def test_car_pickup_grounding_vaults_and_citations():
    routing = _route(CAR_PROMPT)
    grounding = orb_knowledge_grounding_service.build_grounding(message=CAR_PROMPT, routing=routing)
    vaults = grounding.get("vault_domains") or []
    assert any("Immediate Safeguarding" in v for v in vaults)
    assert any("Exploitation" in v for v in vaults)
    citations = grounding.get("citations") or []
    assert citations
    assert all(c.get("source_integrity") == "built_in_anchor_not_verbatim_quote" for c in citations)


def test_car_playbook_must_include_key_actions():
    playbook = orb_scenario_playbook_service.get_playbook("unknown_vehicle_pickup")
    assert playbook is not None
    joined = " ".join(playbook.must_include).lower()
    assert "manager/dsl" in joined
    assert "police" in joined
    assert "registration" in joined
    assert "moving vehicle" in joined or "block a moving" in joined


def test_car_runtime_includes_playbook_block():
    context = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb", message=CAR_PROMPT, mode="Ask ORB"
    )
    assert context.get("scenario_playbook", {}).get("playbook_id") == "unknown_vehicle_pickup"
    blocks = " ".join(context.get("prompt_blocks") or [])
    assert "Scenario playbook active" in blocks
    reqs = " ".join(context.get("response_requirements") or [])
    assert "live safeguarding" in reqs.lower()


def test_expanded_governed_vault_catalog():
    ids = set(orb_knowledge_vault_service.vaults.keys())
    assert "immediate_safeguarding_vault" in ids
    assert "exploitation_cse_cce_vault" in ids
    assert "physical_intervention_vault" in ids
    vault = orb_knowledge_vault_service.vaults["immediate_safeguarding_vault"]
    assert vault.must_never
    assert vault.must_always_consider


@pytest.mark.parametrize(
    "message,expected_topic,expected_playbook,label_checks",
    [
        (
            CAR_PROMPT,
            "live_safeguarding_incident",
            "unknown_vehicle_pickup",
            _assert_live_labels,
        ),
        (
            "The child is running out the door now what do I do",
            "live_safeguarding_incident",
            "child_leaving_now",
            _assert_has_immediate,
        ),
        (
            "There is an unknown adult outside asking for one of our children",
            "live_safeguarding_incident",
            "unknown_adult_outside",
            _assert_has_immediate,
        ),
        (
            "An older boyfriend is waiting outside for our 16 year old",
            "exploitation",
            "suspected_cse_contact",
            _assert_has_exploitation,
        ),
        (
            "She says she is going to hurt herself right now",
            "live_safeguarding_incident",
            None,
            _assert_has_safeguarding,
        ),
        (
            "I think the child has taken tablets what do I do now",
            "self_harm",
            None,
            _assert_has_safeguarding,
        ),
        (
            "A young person has a knife in the lounge",
            "live_safeguarding_incident",
            "weapon_in_home",
            _assert_has_immediate,
        ),
        (
            "The child appears intoxicated and aggressive",
            "live_safeguarding_incident",
            "intoxicated_child",
            _assert_has_immediate,
        ),
        (
            "One child is threatening to stab another child",
            "live_safeguarding_incident",
            None,
            _assert_has_safeguarding,
        ),
        (
            "A parent has arrived unplanned demanding to take the child",
            "live_safeguarding_incident",
            "parent_arrives_unplanned",
            _assert_has_immediate,
        ),
    ],
    ids=[
        "car_pickup",
        "running_out",
        "unknown_adult",
        "older_boyfriend",
        "self_harm_now",
        "tablets",
        "knife",
        "intoxicated",
        "threatening_peer",
        "parent_unplanned",
    ],
)
def test_immediate_live_scenarios(message, expected_topic, expected_playbook, label_checks):
    routing = _route(message)
    assert routing["topic"] == expected_topic
    if expected_playbook:
        assert routing.get("playbook_id") == expected_playbook
    label_checks(routing.get("cognition_display_labels") or [])


@pytest.mark.parametrize(
    "message,expected_topic",
    [
        ("We are worried about suspected CSE with an older man", "exploitation"),
        ("Think this is county lines and a runner outside", "exploitation"),
        ("A child has shared a nude image and is being blackmailed online", "exploitation"),
        ("Peer on peer sexual assault in the home last night", "allegations"),
        ("The child disclosed assault by a visitor", "allegations"),
        ("A child says a staff member touched them inappropriately", "allegations"),
        ("Three allegations, two missing episodes, four restraints same staff — pattern", "cumulative_concern"),
        ("Radicalisation concern and extremist material on phone", "allegations"),
        ("Bullying and group intimidation on the unit", "allegations"),
        ("Domestic abuse controlling behaviour from boyfriend", "exploitation"),
    ],
    ids=[
        "cse",
        "county_lines",
        "online_nude",
        "peer_sexual",
        "disclose_assault",
        "staff_touched",
        "repeated_allegations",
        "radicalisation",
        "bullying",
        "domestic_control",
    ],
)
def test_safeguarding_scenarios(message, expected_topic):
    routing = _route(message)
    assert routing["topic"] == expected_topic


@pytest.mark.parametrize(
    "message,expected_topic,expected_playbook",
    [
        ("Can I search their room for drugs", "restraint", "room_search_request"),
        ("Can I take their phone because of safeguarding", "restraint", "phone_confiscation_request"),
        ("Can I lock the door to stop them leaving", "live_safeguarding_incident", "can_i_physically_stop_child"),
        ("The child refuses medication this morning", "medication", "child_refuses_medication"),
        ("We made a medication error and gave the wrong dose", "medication", "medication_error"),
        ("Please help with a restraint review after three holds this week", "restraint", "restraint_review"),
        ("The young person caused serious room damage", "general_residential", None),
        ("Child refuses school again today", "education_health", "child_refuses_school"),
        ("Family time was cancelled and the child smashed a cup", "family_time", None),
        ("She is refusing to return from family time", "family_time", None),
    ],
    ids=[
        "room_search",
        "take_phone",
        "lock_door",
        "refuses_medication",
        "medication_error",
        "restraint_review",
        "room_damage",
        "refuses_school",
        "family_time_cancelled",
        "refuses_return_family_time",
    ],
)
def test_residential_practice_scenarios(message, expected_topic, expected_playbook):
    routing = _route(message)
    assert routing["topic"] == expected_topic
    if expected_playbook:
        assert routing.get("playbook_id") == expected_playbook


@pytest.mark.parametrize(
    "message,expected_topic",
    [
        ("Help me prepare for a Reg 44 visit tomorrow", "inspection"),
        ("Reg 45 review evidence gaps for the RI", "inspection"),
        ("RI review themes from last month audits", "leadership"),
        ("Staff supervision after poor practice incident", "supervision"),
        ("Concern about agency staff consistency", "staffing"),
        ("A staff member was shouting at a child", "supervision"),
        ("Parent complaint about rude staff", "complaints"),
        ("Child complaint that they are not listened to", "complaints"),
        ("Social worker unhappy with our recording", "recording"),
        ("Ofsted arrives today what should managers do", "inspection"),
    ],
    ids=[
        "reg44",
        "reg45",
        "ri_review",
        "supervision",
        "agency_staff",
        "staff_shouting",
        "parent_complaint",
        "child_complaint",
        "social_worker_unhappy",
        "ofsted_today",
    ],
)
def test_governance_scenarios(message, expected_topic):
    routing = _route(message)
    assert routing["topic"] == expected_topic


def test_physical_stop_playbook_overrides_generic_restraint():
    msg = "Can I physically stop him from leaving the home right now"
    routing = _route(msg)
    assert routing["topic"] == "live_safeguarding_incident"
    assert routing.get("playbook_id") == "can_i_physically_stop_child"


def test_existing_medication_routing_unchanged():
    labels = _labels("Medication was missed this morning — what should the manager review?")
    assert labels == ["Medication / health", "Recording quality", "Leadership oversight"]


def test_existing_missing_routing_unchanged():
    labels = _labels("A young person went missing overnight — what should we record on return?")
    assert labels == ["Missing from home", "Safeguarding", "Recording quality", "Ofsted evidence"]


def test_existing_therapeutic_routing_unchanged():
    labels = _labels("Family time was cancelled and the child smashed a cup — help me think therapeutically")
    assert labels == ["Therapeutic reflection", "Recording quality", "Child experience"]


def test_existing_cumulative_concern_unchanged():
    prompt = (
        "Three allegations, two missing episodes, four restraints same staff — nothing looks serious alone "
        "but something is not right"
    )
    labels = _labels(prompt)
    assert "Safeguarding" in labels
    assert "Professional curiosity" in labels


def test_live_incident_not_generic_missing_only():
    routing = _route("She is going missing now and running to a car outside")
    assert routing["topic"] == "live_safeguarding_incident"
    assert routing["depth_level"] == "critical"


def test_citations_not_empty_spam_for_car():
    citations = orb_knowledge_grounding_service.citation_payload(message=CAR_PROMPT)
    assert len(citations) <= 8
    labels = {c["label"] for c in citations}
    assert "[Reg 12]" in labels

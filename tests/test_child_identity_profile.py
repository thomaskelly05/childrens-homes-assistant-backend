from routers.young_people_profile_routes import CommunicationProfilePayload, IdentityProfilePayload


def test_child_identity_profile_supports_personhood_fields_as_optional():
    identity = IdentityProfilePayload(
        interests="football, drawing",
        strengths_summary="Kind with younger children",
        what_matters_to_me="Seeing my sister and keeping bedtime predictable",
    )
    communication = CommunicationProfilePayload(
        communication_style="Needs time to process questions",
        sensory_profile="Quieter spaces help after school",
        what_helps="Calm tone and clear choices",
        what_to_avoid="Crowded rooms when distressed",
        routines_and_predictability="Visual plan before transitions",
    )

    assert identity.model_dump(exclude_none=True)["what_matters_to_me"].startswith("Seeing")
    assert communication.model_dump(exclude_none=True)["what_helps"] == "Calm tone and clear choices"
    assert "sensory_profile" in communication.model_dump(exclude_none=True)

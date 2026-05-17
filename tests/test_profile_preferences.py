from routers.account_routes import ProfileUpdatePayload, _initials, _normalise_dashboard_payload


def test_profile_preferences_normalise_adult_identity_and_workspace_lists():
    payload = ProfileUpdatePayload(
        display_name="Theo Kelly",
        role_title="Registered manager",
        operational_focus="Review safeguarding follow-up calmly.",
        pinned_widgets=["my-children", "my-children", "my-actions"],
        favourite_children=["42", "42", "51"],
        quick_actions=["daily_note", "handover"],
    )

    normalised = _normalise_dashboard_payload(payload)

    assert _initials(payload.display_name or "") == "TK"
    assert normalised["pinned_widgets"] == ["my-children", "my-actions"]
    assert normalised["favourite_children"] == ["42", "51"]
    assert normalised["quick_actions"] == ["daily_note", "handover"]

from routers.account_routes import (
    CRITICAL_DASHBOARD_WIDGETS,
    DashboardPreferencesPayload,
    _normalise_dashboard_payload,
)


def test_dashboard_preferences_keep_critical_widgets_visible_and_first():
    payload = DashboardPreferencesPayload(
        hidden_optional_widgets=["safeguarding-open", "my-pinned-templates"],
        widget_order=["my-pinned-templates", "operational-actions", "child-wellbeing"],
        layout_density="compact",
        last_selected_home=10,
    )

    normalised = _normalise_dashboard_payload(payload)

    assert "safeguarding-open" not in normalised["hidden_optional_widgets"]
    assert normalised["hidden_optional_widgets"] == ["my-pinned-templates"]
    assert normalised["widget_order"][: len(CRITICAL_DASHBOARD_WIDGETS)] == list(CRITICAL_DASHBOARD_WIDGETS)
    assert normalised["dashboard_preferences"]["layout_density"] == "compact"
    assert normalised["dashboard_preferences"]["last_selected_home"] == "10"

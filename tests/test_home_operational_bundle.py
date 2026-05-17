from services.experience_bundle_service import ExperienceBundleService


class FakeConnect:
    def handover_today(self, conn, current_user, *, home_id=None):
        return {"available": True, "items": [], "summary": {}}

    def notifications(self, conn, current_user, *, unread_only=False, limit=50):
        return {"items": []}

    def unread(self, conn, current_user):
        return {"count": 0}

    def list_threads(self, conn, current_user, *, home_id=None, limit=8, q=None):
        return {"items": []}


class BundleForTest(ExperienceBundleService):
    def _authorise(self, current_user, permission, home_id=None):
        class Context:
            provider_id = 7
            tenancy_scope = "home"

            def can_access_home(self, requested):
                return int(requested) == 3

        return Context()

    def _home(self, conn, home_id, context):
        return {"id": home_id, "name": "Rosewood House", "provider_id": 7}

    def _visible_children(self, conn, context, home_id=None):
        return [{"id": 1, "preferred_name": "Child", "summary_risk_level": "critical"}]

    def _records_for_home(self, conn, table_name, home_id, limit):
        if table_name == "safeguarding_records":
            return [{"id": 2, "title": "Concern"}]
        return []

    def _actions(self, conn, context, user_id=None, home_id=None, limit=40):
        return [{"id": 3, "title": "Action"}]

    def _scoped_rows(self, *args, **kwargs):
        return []


def test_home_operational_bundle_reports_pressure_from_real_sections():
    result = BundleForTest(FakeConnect()).home_operational_bundle(None, {"id": 1, "role": "manager", "provider_id": 7, "home_id": 3}, 3)

    assert result["home"]["name"] == "Rosewood House"
    assert result["children_needing_attention"][0]["summary_risk_level"] == "critical"
    assert result["operational_pressure"]["safeguarding_open"] == 1
    assert result["operational_pressure"]["actions_open"] == 1

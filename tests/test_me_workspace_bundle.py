from services.experience_bundle_service import ExperienceBundleService


class FakeConnect:
    def handover_today(self, conn, current_user, *, home_id=None):
        return {"available": True, "items": [{"id": 1, "title": "Real handover"}], "summary": {"unacknowledged": 1}}

    def notifications(self, conn, current_user, *, unread_only=False, limit=50):
        return {"items": [{"id": 2, "title": "Live notification", "read_at": None}]}

    def unread(self, conn, current_user):
        return {"count": 3, "threads": []}

    def list_threads(self, conn, current_user, *, home_id=None, limit=8, q=None):
        return {"items": [{"id": 4, "title": "Home channel", "thread_type": "home_channel"}]}

    def dashboard_preferences(self, conn, current_user):
        return {"preferences": {"layout": [{"id": "urgent_safeguarding", "pinned": True}], "favourite_children": [9]}}


class BundleForTest(ExperienceBundleService):
    def _authorise(self, current_user, permission, home_id=None):
        class Context:
            provider_id = 7
            primary_home_id = 3
            tenancy_scope = "home"
            home_ids = (3,)

            def can_access_home(self, requested):
                return int(requested) == 3

        return Context()

    def _one_by_id(self, conn, table_name, record_id):
        if table_name == "users":
            return {"id": 11, "first_name": "Alex", "last_name": "Morgan", "email": "alex@example.com", "role": "manager", "home_id": 3, "provider_id": 7}
        return {}

    def _staff_for_user(self, conn, user):
        return {"id": 5, "full_name": "Alex Morgan", "employment_status": "active"}

    def _first_for_user(self, conn, table_name, user_id):
        return {"display_name": "Alex", "notes": "Therapeutic practice lead"}

    def _home(self, conn, home_id, context):
        return {"id": home_id, "name": "Rosewood House", "provider_id": 7}

    def _visible_children(self, conn, context, home_id=None):
        return [{"id": 9, "preferred_name": "Real child", "summary_risk_level": "low"}]

    def _actions(self, conn, context, user_id=None, home_id=None, limit=20):
        return [{"id": 8, "title": "Follow up", "assigned_to_user_id": user_id}]

    def _chronology(self, conn, context, home_id=None, limit=12):
        return [{"id": 6, "title": "Recorded chronology"}]

    def _scoped_rows(self, *args, **kwargs):
        return []


def test_me_workspace_bundle_returns_required_shape_without_demo_data():
    result = BundleForTest(FakeConnect()).adult_workspace_bundle(None, {"id": 11, "role": "manager", "provider_id": 7, "home_id": 3})

    assert result["identity"]["display_name"] == "Alex"
    assert result["home"]["name"] == "Rosewood House"
    assert result["handover"]["unread_required_count"] == 1
    assert result["connect"]["unread_count"] == 3
    assert result["children"]["favourites"][0]["id"] == 9
    assert "Jamie" not in str(result)

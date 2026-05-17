from services.experience_bundle_service import ExperienceBundleService


class BundleForTest(ExperienceBundleService):
    def _authorise(self, current_user, permission, home_id=None):
        class Context:
            provider_id = 7
            tenancy_scope = "home"

            def can_access_home(self, requested):
                return int(requested) == 3

        return Context()

    def _one_by_id(self, conn, table_name, record_id):
        if table_name == "young_people":
            return {"id": 21, "first_name": "Ava", "preferred_name": "Ava", "home_id": 3, "provider_id": 7, "summary_risk_level": "medium"}
        if table_name == "staff":
            return {"id": record_id, "full_name": "Key Worker"}
        return {}

    def _first_for_child(self, conn, table_name, young_person_id):
        if table_name == "young_person_identity_profile":
            return {"what_matters_to_me": "Football", "strengths_summary": "Creative"}
        if table_name == "young_person_communication_profile":
            return {"communication_style": "Quiet at first", "what_helps": "Time and calm choices"}
        return {}

    def _records_for_child(self, conn, table_name, young_person_id, limit):
        return []

    def _plans(self, conn, young_person_id):
        return []


def test_child_profile_bundle_is_person_first():
    result = BundleForTest().child_profile_bundle(None, {"id": 1, "role": "manager", "provider_id": 7, "home_id": 3}, 21)

    assert result["identity"]["preferred_name"] == "Ava"
    assert result["personhood"]["what_matters_to_me"] == "Football"
    assert result["communication"]["what_helps"] == "Time and calm choices"
    assert result["safety"]["current_risk_level"] == "medium"

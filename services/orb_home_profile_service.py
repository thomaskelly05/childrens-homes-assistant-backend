from __future__ import annotations

"""ORB Residential home profile — user-supplied context only.

Powers locality risk, template wording, safeguarding prompts, learning recommendations
and ORB memory. Never reads live IndiCare OS care records.
"""

from typing import Any

from services.orb_onboarding_profile_service import HOME_PROFILE_KEYS, orb_onboarding_profile_service


class OrbHomeProfileService:
    def get_profile(self, preferences: dict[str, Any] | None) -> dict[str, Any]:
        nested = self._nested_preferences(preferences)
        raw = nested.get("home_profile") if isinstance(nested.get("home_profile"), dict) else nested
        return orb_onboarding_profile_service.normalise_home_profile(raw)

    def merge_profile(
        self,
        preferences: dict[str, Any] | None,
        *,
        home_profile: dict[str, Any] | None,
    ) -> dict[str, Any]:
        prefs = dict(preferences or {})
        nested = self._nested_preferences(prefs)
        existing = self.get_profile(prefs)
        incoming = orb_onboarding_profile_service.normalise_home_profile(home_profile or {})
        merged = {**existing, **incoming}
        nested["home_profile"] = merged
        nested["locality_risk_enabled"] = bool(
            merged.get("locality_risk_enabled", nested.get("locality_risk_enabled", True))
        )
        prefs["preferences"] = nested
        prefs["home_profile"] = merged
        return prefs

    def context_block(self, preferences: dict[str, Any] | None) -> str:
        profile = self.get_profile(preferences)
        if not profile:
            return ""
        lines = ["ORB home profile context (user-supplied; not live OS records):"]
        for key in sorted(HOME_PROFILE_KEYS):
            if key not in profile:
                continue
            value = profile[key]
            if isinstance(value, list):
                lines.append(f"- {key}: {', '.join(value)}")
            else:
                lines.append(f"- {key}: {value}")
        return "\n".join(lines)

    def locality_enabled(self, preferences: dict[str, Any] | None) -> bool:
        profile = self.get_profile(preferences)
        if "locality_risk_enabled" in profile:
            return bool(profile["locality_risk_enabled"])
        return bool(profile)

    def _nested_preferences(self, preferences: dict[str, Any] | None) -> dict[str, Any]:
        prefs = preferences if isinstance(preferences, dict) else {}
        nested = prefs.get("preferences")
        if isinstance(nested, dict):
            return nested
        return prefs


orb_home_profile_service = OrbHomeProfileService()

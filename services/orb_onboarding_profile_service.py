from __future__ import annotations

"""ORB Residential onboarding/profile normalisation.

Standalone ORB personalisation is stored in orb_user_preferences.preferences so
we avoid creating another profile database. This is not IndiCare OS care-record
data. It is the user's ORB setup: role, support style, home profile, favourite
tools and commercial onboarding state.
"""

from typing import Any

ROLE_OPTIONS = [
    "Residential Support Worker",
    "Senior Residential Support Worker",
    "Deputy Manager",
    "Registered Manager",
    "Responsible Individual",
    "Consultant / Quality Lead",
    "Other professional",
]

SUPPORT_STYLE_OPTIONS = ["Simple", "Balanced", "Detailed", "Manager-level", "RI-level"]

ORB_TOOL_OPTIONS = [
    "Ask ORB",
    "Review This",
    "Template Library",
    "Safeguarding Lens",
    "Ofsted Lens",
    "Locality Risk",
    "ORB Learn",
    "Saved Outputs",
]

HOME_PROFILE_KEYS = {
    "home_name",
    "postcode",
    "local_authority",
    "police_force",
    "region",
    "home_type",
    "age_range",
    "main_presenting_needs",
    "locality_risk_enabled",
}


def _clean_text(value: Any, *, max_len: int = 500) -> str | None:
    text = str(value or "").strip()
    return text[:max_len] if text else None


def _clean_list(value: Any, *, max_items: int = 30, max_len: int = 120) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value[:max_items]:
        text = _clean_text(item, max_len=max_len)
        if text and text not in out:
            out.append(text)
    return out


class OrbOnboardingProfileService:
    def onboarding_steps(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "role",
                "title": "Your role",
                "description": "Helps ORB adjust depth, language and challenge level.",
                "options": ROLE_OPTIONS,
            },
            {
                "id": "home_profile",
                "title": "Your home context",
                "description": "Used for locality risk and practical residential-care wording. Not live OS records.",
                "fields": sorted(HOME_PROFILE_KEYS),
            },
            {
                "id": "support_style",
                "title": "How ORB should answer",
                "description": "Choose whether ORB answers simply, in balance, or in more detail.",
                "options": SUPPORT_STYLE_OPTIONS,
            },
            {
                "id": "tools",
                "title": "Tools you may use most",
                "description": "Helps ORB surface the right tools without cluttering the home screen.",
                "options": ORB_TOOL_OPTIONS,
            },
            {
                "id": "safety",
                "title": "Safety statement",
                "description": "ORB supports professional judgement; it does not replace safeguarding procedures, managers or emergency services.",
            },
        ]

    def build_preferences_payload(
        self,
        *,
        role_label: str | None,
        work_environment: str | None,
        preferred_support_style: str | None,
        preferences: dict[str, Any] | None,
    ) -> dict[str, Any]:
        preferences = preferences if isinstance(preferences, dict) else {}
        home_profile = self.normalise_home_profile(preferences.get("home_profile") or preferences)
        favourite_tools = _clean_list(preferences.get("favourite_tools") or preferences.get("preferred_tools"))
        main_use_cases = _clean_list(preferences.get("main_use_cases"), max_items=12)
        role = _clean_text(role_label or preferences.get("role_label"), max_len=120)
        style = _clean_text(preferred_support_style or preferences.get("preferred_support_style"), max_len=120)
        environment = _clean_text(work_environment or preferences.get("work_environment"), max_len=160)
        return {
            **preferences,
            "role_label": role,
            "work_environment": environment,
            "preferred_support_style": style,
            "home_profile": home_profile,
            "favourite_tools": favourite_tools,
            "main_use_cases": main_use_cases,
            "orb_memory": {
                "preferred_role": role,
                "preferred_support_style": style,
                "favourite_tools": favourite_tools,
                "main_use_cases": main_use_cases,
                "home_profile_available": bool(home_profile),
            },
        }

    def normalise_home_profile(self, raw: Any) -> dict[str, Any]:
        raw = raw if isinstance(raw, dict) else {}
        profile: dict[str, Any] = {}
        for key in HOME_PROFILE_KEYS:
            if key == "main_presenting_needs":
                values = _clean_list(raw.get(key), max_items=20)
                if values:
                    profile[key] = values
                continue
            if key == "locality_risk_enabled":
                if key in raw:
                    profile[key] = bool(raw.get(key))
                continue
            value = _clean_text(raw.get(key), max_len=240)
            if value:
                profile[key] = value
        return profile

    def build_setup_payload(
        self,
        *,
        access: dict[str, Any],
        preferences: dict[str, Any] | None,
        safety_accepted: bool,
        oauth_providers: dict[str, bool],
        payments: dict[str, Any],
        front_door_url: str,
    ) -> dict[str, Any]:
        preferences = preferences or {}
        nested = preferences.get("preferences") if isinstance(preferences.get("preferences"), dict) else preferences
        home_profile = self.normalise_home_profile((nested or {}).get("home_profile") or nested or {})
        onboarding_complete = bool(preferences.get("onboarding_completed_at") or access.get("onboarding_completed"))
        missing_steps: list[str] = []
        if not nested.get("role_label") and not preferences.get("role_label"):
            missing_steps.append("role")
        if not home_profile:
            missing_steps.append("home_profile")
        if not nested.get("preferred_support_style") and not preferences.get("preferred_support_style"):
            missing_steps.append("support_style")
        if not safety_accepted:
            missing_steps.append("safety")
        if not access.get("can_use_orb"):
            missing_steps.append("trial_or_subscription")
        return {
            "front_door_url": front_door_url,
            "onboarding_complete": onboarding_complete and not missing_steps,
            "missing_steps": missing_steps,
            "steps": self.onboarding_steps(),
            "preferences": preferences,
            "home_profile": home_profile,
            "orb_memory": (nested or {}).get("orb_memory") or {},
            "oauth_providers": oauth_providers,
            "payments": payments,
            "access": access,
            "safety_accepted": safety_accepted,
            "standalone": True,
            "os_records_accessed": False,
        }


orb_onboarding_profile_service = OrbOnboardingProfileService()

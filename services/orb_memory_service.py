from __future__ import annotations

"""ORB Residential memory — preferences-backed professional context.

Stores role, support style, favourite tools/templates, learning history and recent
reviews. Not child records and not OS operational data.
"""

from typing import Any

from services.orb_onboarding_profile_service import orb_onboarding_profile_service
from services.orb_home_profile_service import orb_home_profile_service


MEMORY_KEYS = (
    "preferred_role",
    "preferred_support_style",
    "favourite_tools",
    "favourite_templates",
    "learning_history",
    "recent_reviews",
    "saved_output_refs",
    "main_use_cases",
    "home_profile_available",
)


class OrbMemoryService:
    def extract(self, preferences_row: dict[str, Any] | None) -> dict[str, Any]:
        row = preferences_row or {}
        nested = row.get("preferences") if isinstance(row.get("preferences"), dict) else row
        nested = nested if isinstance(nested, dict) else {}
        memory = nested.get("orb_memory") if isinstance(nested.get("orb_memory"), dict) else {}
        home_profile = orb_home_profile_service.get_profile(row)
        return {
            "preferred_role": memory.get("preferred_role") or nested.get("role_label") or row.get("role_label"),
            "preferred_support_style": memory.get("preferred_support_style")
            or nested.get("preferred_support_style")
            or row.get("preferred_support_style"),
            "favourite_tools": _list(
                memory.get("favourite_tools") or nested.get("favourite_tools") or nested.get("preferred_tools")
            ),
            "favourite_templates": _list(memory.get("favourite_templates")),
            "learning_history": _list(memory.get("learning_history"), max_items=50),
            "recent_reviews": _list(memory.get("recent_reviews"), max_items=30),
            "saved_output_refs": _list(memory.get("saved_output_refs"), max_items=100),
            "main_use_cases": _list(memory.get("main_use_cases") or nested.get("main_use_cases")),
            "home_profile": home_profile,
            "home_profile_available": bool(home_profile),
            "standalone": True,
            "os_records_accessed": False,
        }

    def merge_patch(
        self,
        preferences_row: dict[str, Any] | None,
        patch: dict[str, Any],
    ) -> dict[str, Any]:
        row = dict(preferences_row or {})
        nested = row.get("preferences") if isinstance(row.get("preferences"), dict) else {}
        if not isinstance(nested, dict):
            nested = {}
        memory = dict(nested.get("orb_memory") or {})

        for key in MEMORY_KEYS:
            if key not in patch or patch[key] is None:
                continue
            value = patch[key]
            if key in {"favourite_tools", "favourite_templates", "learning_history", "recent_reviews", "saved_output_refs", "main_use_cases"}:
                memory[key] = _list(value)
            elif key == "home_profile_available":
                memory[key] = bool(value)
            else:
                memory[key] = str(value).strip()[:500] if value else None

        if patch.get("home_profile"):
            row = orb_home_profile_service.merge_profile(row, home_profile=patch["home_profile"])

        nested = row.get("preferences") if isinstance(row.get("preferences"), dict) else nested
        nested["orb_memory"] = memory
        if memory.get("preferred_role"):
            nested["role_label"] = memory["preferred_role"]
            row["role_label"] = memory["preferred_role"]
        if memory.get("preferred_support_style"):
            nested["preferred_support_style"] = memory["preferred_support_style"]
            row["preferred_support_style"] = memory["preferred_support_style"]
        if memory.get("favourite_tools"):
            nested["favourite_tools"] = memory["favourite_tools"]

        built = orb_onboarding_profile_service.build_preferences_payload(
            role_label=nested.get("role_label"),
            work_environment=nested.get("work_environment"),
            preferred_support_style=nested.get("preferred_support_style"),
            preferences=nested,
        )
        built_memory = dict(built.get("orb_memory") or {})
        built_memory.update({k: memory[k] for k in MEMORY_KEYS if k in memory})
        built["orb_memory"] = built_memory
        row["preferences"] = built
        return row

    def append_learning(self, preferences_row: dict[str, Any] | None, entry: dict[str, Any]) -> dict[str, Any]:
        memory = self.extract(preferences_row)
        history = list(memory.get("learning_history") or [])
        history.insert(0, {k: v for k, v in entry.items() if v is not None})
        return self.merge_patch(preferences_row, {"learning_history": history[:50]})

    def append_review(self, preferences_row: dict[str, Any] | None, entry: dict[str, Any]) -> dict[str, Any]:
        memory = self.extract(preferences_row)
        reviews = list(memory.get("recent_reviews") or [])
        reviews.insert(0, {k: v for k, v in entry.items() if v is not None})
        return self.merge_patch(preferences_row, {"recent_reviews": reviews[:30]})


def _list(value: Any, *, max_items: int = 30) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value[:max_items]:
        text = str(item or "").strip()
        if text and text not in out:
            out.append(text[:240])
    return out


orb_memory_service = OrbMemoryService()

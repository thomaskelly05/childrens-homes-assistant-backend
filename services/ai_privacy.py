from __future__ import annotations

from typing import Any


def pseudonymise_context(context: dict[str, Any]) -> dict[str, Any]:
    mapping: dict[str, str] = {}
    counter = 1

    def replace(value: str) -> str:
        nonlocal counter
        if not value:
            return value
        if value not in mapping:
            label = chr(64 + counter) if counter <= 26 else f"{counter}"
            mapping[value] = f"Young Person {label}"
            counter += 1
        return mapping[value]

    timeline = context.get("timeline") or []

    for item in timeline:
        if not isinstance(item, dict):
            continue

        # Remove names if present
        if "first_name" in item:
            item["first_name"] = replace(str(item.get("first_name") or ""))
        if "last_name" in item:
            item["last_name"] = ""

        # Trim summaries to reduce sensitive leakage
        if "summary" in item and isinstance(item.get("summary"), str):
            item["summary"] = item["summary"][:200]

        if "title" in item and isinstance(item.get("title"), str):
            item["title"] = item["title"][:120]

    context["pseudonymised"] = True
    context["pseudonym_map_size"] = len(mapping)

    return context

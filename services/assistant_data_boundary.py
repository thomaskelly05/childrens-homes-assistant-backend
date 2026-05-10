from __future__ import annotations

from typing import Any

from services.assistant_security import safe_string


STANDALONE_ASSISTANT_BOUNDARY = {
    "assistant_surface": "standalone",
    "data_boundary": "public_guidance_only",
    "internal_data_access": False,
    "allowed_sources": [
        "official_public_sources",
        "IndiCare_public_practice_knowledge",
        "user_supplied_text_in_current_prompt",
    ],
    "blocked_sources": [
        "young_person_records",
        "home_records",
        "chronology_records",
        "incident_records",
        "daily_notes",
        "risk_assessments",
        "staff_records",
        "case_history",
        "quality_dashboards",
        "provider_internal_data",
        "database_queries",
    ],
}


OS_ASSISTANT_BOUNDARY = {
    "assistant_surface": "os",
    "data_boundary": "authenticated_scoped_os_context",
    "internal_data_access": True,
}


BOUNDARY_REDIRECT_MESSAGE = (
    "I cannot access IndiCare OS records from the standalone assistant. "
    "I can give general guidance using the information you provide here, but for live child, home, chronology, "
    "daily note, incident, risk or quality records you need to use the OS Assistant inside the authorised IndiCare OS workspace."
)


INTERNAL_DATA_REQUEST_TERMS = (
    "look up",
    "pull up",
    "search our records",
    "search the records",
    "from the database",
    "in the database",
    "in indicare os",
    "in the os",
    "our chronology",
    "the chronology",
    "daily notes for",
    "incidents for",
    "risk assessment for",
    "care plan for",
    "young person record",
    "child record",
    "home records",
    "quality dashboard",
    "reg 45 data",
    "show me records",
    "based on previous notes",
    "based on existing notes",
    "based on their records",
)


def detect_internal_data_request(message: Any) -> bool:
    text = safe_string(message).lower()
    if not text:
        return False
    return any(term in text for term in INTERNAL_DATA_REQUEST_TERMS)


def standalone_boundary_prompt_block() -> str:
    blocked = ", ".join(STANDALONE_ASSISTANT_BOUNDARY["blocked_sources"])
    allowed = ", ".join(STANDALONE_ASSISTANT_BOUNDARY["allowed_sources"])
    return f"""
Standalone assistant data boundary:
- This is the standalone IndiCare Assistant, not the OS Assistant.
- It must remain public-guidance-only and must never access, claim to access, infer, summarise, retrieve or rely on internal IndiCare OS records.
- Allowed sources: {allowed}.
- Blocked sources: {blocked}.
- Treat any real case details supplied by the user as user-provided text for guidance only, not as verified OS data.
- Never say "I checked the record", "your records show", "the system shows", "from the chronology", or similar unless the user pasted that exact content into the current prompt.
- If the user asks you to look up live records, respond with: {BOUNDARY_REDIRECT_MESSAGE}
""".strip()


def build_boundary_metadata(*, internal_data_request_detected: bool = False) -> dict[str, Any]:
    return {
        **STANDALONE_ASSISTANT_BOUNDARY,
        "internal_data_request_detected": internal_data_request_detected,
        "redirect_message": BOUNDARY_REDIRECT_MESSAGE if internal_data_request_detected else None,
    }

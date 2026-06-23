"""Detect multiple safeguarding scenarios in a single ORB standalone prompt."""

from __future__ import annotations

from typing import Any

MULTI_SCENARIO_OPENING = (
    "These are separate safeguarding situations and should be treated separately."
)

SCENARIO_SIGNATURES: dict[str, tuple[str, ...]] = {
    "missing_from_home": (
        "missing from the home",
        "missing from home",
        "missing right now",
        "young person is missing",
        "gone missing",
        "cannot find them",
        "where are they",
    ),
    "missing_return_substance_risk": (
        "returned from missing",
        "came back missing",
        "smells of cannabis",
        "smell of cannabis",
        "smells of weed",
        "returned missing",
        "found and returned",
    ),
    "historic_sexual_abuse_disclosure": (
        "historic sexual abuse",
        "historical abuse",
        "abused when younger",
        "abused as a child",
        "sexual abuse disclosure",
        "told me about abuse",
        "disclosed abuse",
        "disclosed assault",
    ),
    "suicide_self_harm": (
        "suicidal",
        "suicide",
        "self-harm",
        "self harm",
        "kill myself",
        "hurt themselves",
        "hurt himself",
        "hurt herself",
        "going to hurt themselves",
        "going to hurt himself",
        "going to hurt herself",
        "cutting",
        "overdose",
        "suicidal ideation",
    ),
    "parent_forced_removal": (
        "parent demanding",
        "demanding to take",
        "father is here",
        "mother is here",
        "take the child home",
        "take child home",
        "parent turned up",
        "arrived unplanned",
        "forced removal",
    ),
    "allegation_against_staff": (
        "allegation against staff",
        "staff touched",
        "staff member grabbed",
        "staff member touched",
        "touched them inappropriately",
        "conduct concern staff",
    ),
    "exploitation_county_lines": (
        "county lines",
        "criminal exploitation",
        "cse",
        "cce",
        "older boyfriend",
        "grooming",
        "sexual exploitation",
    ),
    "peer_on_peer_harm": (
        "peer on peer",
        "peer-on-peer",
        "another child hit",
        "sexual assault by another child",
    ),
    "medication_error": (
        "medication error",
        "wrong dose",
        "given wrong medicine",
        "dose missed",
    ),
    "restraint_physical_intervention": (
        "restraint",
        "physical intervention",
        "can i restrain",
        "can i physically stop",
        "held them",
    ),
    "online_harm_image_sharing": (
        "nude image",
        "sextortion",
        "revenge porn",
        "shared a nude",
        "image sharing",
        "blackmail online",
    ),
    "whistleblowing": (
        "whistleblow",
        "whistleblowing",
        "not to log",
        "avoid ofsted",
        "cover up",
        "cover-up",
        "suppress safeguarding",
        "not reporting",
        "do not record",
        "don't record",
    ),
}


class OrbMultiScenarioDetectorService:
    def detect(self, message: str) -> dict[str, Any]:
        text = str(message or "").lower()
        matched: list[str] = []
        for scenario_type, terms in SCENARIO_SIGNATURES.items():
            if any(term in text for term in terms):
                matched.append(scenario_type)
        multi = len(matched) > 1
        return {
            "multi_scenario": multi,
            "scenario_types": matched,
            "opening_anchor": MULTI_SCENARIO_OPENING if multi else None,
        }

    def split_segments(self, message: str) -> list[str]:
        """Rough segment split for multi-clause prompts (QA / contract assignment)."""
        raw = str(message or "").strip()
        if not raw:
            return []
        separators = (
            ". ",
            "? ",
            "! ",
            "; ",
            " also ",
            " and also ",
            " another situation ",
            " separate scenario ",
            "\n",
            " — ",
            " - ",
        )
        segments = [raw]
        for sep in separators:
            next_segments: list[str] = []
            for segment in segments:
                next_segments.extend(part.strip() for part in segment.split(sep) if part.strip())
            segments = next_segments
        return segments[:12]


orb_multi_scenario_detector_service = OrbMultiScenarioDetectorService()

"""Plain-language response support chips for staff-facing ORB UI (no backend jargon)."""

from __future__ import annotations

from typing import Any

RESPONSE_SUPPORT_CHIP_LABELS = (
    "Safety considered",
    "Child's voice considered",
    "Recording points included",
    "Manager oversight considered",
    "Follow-up actions suggested",
    "Relevant guidance considered",
    "Possible gaps highlighted",
    "Professional judgement needed",
    "Response reviewed",
)


def build_response_support_chips(
    packet: dict[str, Any] | None,
    *,
    quality_gate: dict[str, Any] | None = None,
    mode: str | None = None,
) -> list[str]:
    """Derive staff-facing support chips from internal intelligence packet (not raw field names)."""
    intel = dict(packet or {})
    if not intel:
        return []

    chips: list[str] = []
    depth = str(intel.get("expert_depth") or "general_light").strip().lower()
    care_score = int(intel.get("care_relevance_score") or 0)
    gaps = list(intel.get("gaps") or [])
    missing_evidence = list(intel.get("missing_evidence") or [])
    lenses = [str(x).lower() for x in (intel.get("professional_lens_hits") or [])]
    domains = list(intel.get("registered_home_domains") or [])
    layers = [str(x).lower() for x in (intel.get("active_intelligence_layers") or [])]
    mode_name = (mode or "").strip().lower()

    if depth in {"safeguarding_critical", "residential_deep", "residential_standard"} or care_score >= 40:
        chips.append("Safety considered")

    if any("child" in lens or "voice" in lens for lens in lenses) or "child_voice" in str(gaps):
        chips.append("Child's voice considered")

    if (
        depth in {"residential_deep", "residential_standard", "safeguarding_critical"}
        or "record" in mode_name
        or any("recording" in str(g).lower() for g in gaps + missing_evidence)
    ):
        chips.append("Recording points included")

    if depth in {"safeguarding_critical", "residential_deep"} or any(
        "manager" in lens or "oversight" in lens for lens in lenses
    ):
        chips.append("Manager oversight considered")

    if gaps or missing_evidence or intel.get("missingness_graph"):
        chips.append("Possible gaps highlighted")
    else:
        chips.append("Follow-up actions suggested")

    if domains or intel.get("source_basis") or intel.get("quality_standard_hits"):
        chips.append("Relevant guidance considered")

    if lenses or any("professional" in layer for layer in layers):
        chips.append("Professional judgement needed")

    gate = dict(quality_gate or intel.get("quality_gate_preview") or {})
    if gate:
        chips.append("Response reviewed")

    # Stable order, dedupe
    seen: set[str] = set()
    ordered: list[str] = []
    for label in RESPONSE_SUPPORT_CHIP_LABELS:
        if label in chips and label not in seen:
            seen.add(label)
            ordered.append(label)
    return ordered

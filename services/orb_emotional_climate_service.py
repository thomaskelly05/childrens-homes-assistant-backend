from __future__ import annotations

from typing import Any


class OrbEmotionalClimateService:
    """Emotional climate reasoning for residential children's homes.

    This is not diagnosis. It helps ORB think about the emotional state of:
    - the child
    - the adults
    - the home environment
    - relational stability
    - burnout/drift risk
    """

    CLIMATE_SIGNALS = {
        "calm_and_contained": (
            "warm", "calm", "regulated", "repair", "reassured", "safe", "settled", "supported"
        ),
        "stress_and_burnout": (
            "exhausted", "burnout", "tired", "overwhelmed", "short staffed", "frustrated", "fed up", "drained"
        ),
        "relational_fracture": (
            "argument", "rupture", "refusing staff", "isolated", "withdrawn", "shouting", "conflict"
        ),
        "punitive_drift": (
            "attention seeking", "manipulative", "punishment", "sanction", "non-compliant", "challenging behaviour"
        ),
        "high_safeguarding_pressure": (
            "missing", "police", "exploitation", "allegation", "restraint", "high risk", "unsafe"
        ),
    }

    def analyse(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        active: list[dict[str, Any]] = []
        for state, signals in self.CLIMATE_SIGNALS.items():
            matches = [signal for signal in signals if signal in lower]
            if matches:
                active.append(
                    {
                        "state": state,
                        "signals": matches,
                        "reflection": self._reflection(state),
                        "adult_considerations": self._adult_considerations(state),
                    }
                )
        if not active:
            active.append(
                {
                    "state": "unclear_climate",
                    "signals": [],
                    "reflection": "The emotional climate is not yet clear from the wording.",
                    "adult_considerations": [
                        "What might the child be experiencing emotionally?",
                        "How regulated are the adults responding to this?",
                        "What support or containment may be needed?",
                    ],
                }
            )
        return {
            "active_climates": active,
            "core_model": [
                "Children experience the emotional climate created around them.",
                "Adult stress, drift or inconsistency can change the emotional safety of the home.",
                "Therapeutic practice requires emotional containment, reflection and repair.",
            ],
        }

    def prompt_addendum(self, text: str) -> str:
        analysis = self.analyse(text)
        lines = ["Emotional climate cognition:"]
        for climate in analysis["active_climates"]:
            lines.append(f"- Climate state: {climate['state']}")
            lines.append(f"  Reflection: {climate['reflection']}")
            if climate["signals"]:
                lines.append("  Signals: " + "; ".join(climate["signals"]))
            lines.append("  Adult considerations: " + "; ".join(climate["adult_considerations"][:4]))
        return "\n".join(lines)

    def _reflection(self, state: str) -> str:
        return {
            "calm_and_contained": "There are signs of relational safety and emotional containment.",
            "stress_and_burnout": "Staff stress or burnout may be affecting decision-making, consistency or emotional availability.",
            "relational_fracture": "There may be unresolved rupture, conflict or instability affecting relationships.",
            "punitive_drift": "Some wording suggests possible drift toward punitive or shame-based practice.",
            "high_safeguarding_pressure": "The home may currently be under significant safeguarding pressure.",
        }.get(state, "The emotional climate may need further exploration.")

    def _adult_considerations(self, state: str) -> list[str]:
        return {
            "calm_and_contained": [
                "What helped maintain regulation and safety?",
                "How can this consistency be sustained?",
            ],
            "stress_and_burnout": [
                "Do adults need debrief, support or reflective supervision?",
                "Could exhaustion affect safeguarding curiosity or consistency?",
                "What immediate support is needed for the team?",
            ],
            "relational_fracture": [
                "Has repair happened after conflict or rupture?",
                "Does the child feel emotionally safe with adults right now?",
                "What relational work is needed?",
            ],
            "punitive_drift": [
                "Could shame-based language be influencing practice?",
                "What would a trauma-informed reframe sound like?",
                "Are consequences replacing curiosity and co-regulation?",
            ],
            "high_safeguarding_pressure": [
                "Is leadership visibility high enough right now?",
                "Could staff become reactive or overwhelmed?",
                "What must not be missed under pressure?",
            ],
        }.get(state, ["What support or reflection is needed?"])


orb_emotional_climate_service = OrbEmotionalClimateService()

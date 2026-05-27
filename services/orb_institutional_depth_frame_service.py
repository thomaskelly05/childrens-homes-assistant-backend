from __future__ import annotations

from typing import Any


class OrbInstitutionalDepthFrameService:
    """Deep residential reasoning frames for ORB.

    Uses the cognition already built across ORB to force answers beyond generic
    summaries. Frames are not decisions; they are professional reasoning lenses.
    """

    def build_frame(self, *, message: str, mode: str | None = None) -> dict[str, Any]:
        text = str(message or "").lower()
        mode_text = str(mode or "").lower()
        topic = self._topic(text=text, mode_text=mode_text)
        if topic == "allegations":
            return self._allegations_frame()
        if topic == "recording":
            return self._recording_frame()
        if topic == "inspection":
            return self._inspection_frame()
        if topic == "therapeutic":
            return self._therapeutic_frame()
        return {}

    def prompt_block(self, *, message: str, mode: str | None = None) -> str:
        frame = self.build_frame(message=message, mode=mode)
        if not frame:
            return ""
        lines = [
            "Institutional depth frame active:",
            f"- Topic: {frame['topic']}",
            f"- Purpose: {frame['purpose']}",
            "- Required reasoning lenses:",
        ]
        for lens in frame["required_lenses"]:
            lines.append(f"  - {lens}")
        lines.extend(["- Evidence expectations to include where relevant:"])
        for expectation in frame["evidence_expectations"]:
            lines.append(f"  - {expectation}")
        lines.extend(["- Response must avoid:"])
        for avoid in frame["avoid"]:
            lines.append(f"  - {avoid}")
        lines.extend(
            [
                "- Response shape:",
                "  1. Start with the practical meaning.",
                "  2. Then reason through the relevant lenses using inline anchors.",
                "  3. Include what a strong registered manager would think about.",
                "  4. Include recording and evidence expectations.",
                "  5. Include emotional/therapeutic meaning where relevant.",
                "  6. End with a clear professional boundary, not a generic disclaimer.",
            ]
        )
        return "\n".join(lines)

    def _topic(self, *, text: str, mode_text: str) -> str | None:
        if any(term in text for term in ("allegation", "allegations", "lado", "grabbed", "staff member")):
            return "allegations"
        if any(term in text or term in mode_text for term in ("record", "recording", "wording", "chronology", "daily note")):
            return "recording"
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            return "inspection"
        if any(term in text or term in mode_text for term in ("therapeutic", "trauma", "behaviour", "repair", "emotion")):
            return "therapeutic"
        return None

    def _allegations_frame(self) -> dict[str, Any]:
        return {
            "topic": "allegations / conduct concerns in residential settings",
            "purpose": "Move beyond a generic safeguarding summary into RM-level, inspection-aware, therapeutic and recording-aware reasoning.",
            "required_lenses": [
                "Immediate safety and protection lens [Reg 12].",
                "Human-led local procedure and designated officer consultation thinking [Working Together] [LADO].",
                "Leadership oversight, decision trail, supervision, learning and follow-through [Reg 13].",
                "Inspection evidence lens: timeliness, professional curiosity, child experience, leadership impact [SCCIF].",
                "Recording lens: direct account, observed facts, chronology, actions, rationale, outcome [Recording quality].",
                "Therapeutic lens: child feeling heard, emotionally safe, not blamed, and supported after disclosure or concern.",
                "Fairness lens: protect children while preserving fair process for the adult and avoiding premature conclusions.",
            ],
            "evidence_expectations": [
                "What exactly was said, seen or reported, using the child's words where appropriate.",
                "Immediate safety steps and who made them.",
                "Who was informed, when, and what advice was received.",
                "Whether medical attention, body map, witness accounts, CCTV or other factual material may be relevant.",
                "Manager rationale for actions taken and any restrictions or interim arrangements.",
                "Support offered to the child and consideration of impact on wider group or staff team.",
                "Follow-up, supervision, learning and review actions.",
            ],
            "avoid": [
                "Declaring the concern true or false.",
                "Deciding statutory thresholds.",
                "Minimising language such as only, just, attention seeking, or false allegation before review.",
                "Generic advice with no regulatory, recording, leadership or therapeutic reasoning.",
            ],
        }

    def _recording_frame(self) -> dict[str, Any]:
        return {
            "topic": "recording quality",
            "purpose": "Improve records so they are factual, child-centred, chronology-aware and useful for oversight.",
            "required_lenses": [
                "Fact versus interpretation.",
                "Child voice and lived experience.",
                "Adult response and rationale.",
                "Outcome and follow-up.",
                "Management oversight and evidence quality.",
            ],
            "evidence_expectations": [
                "What happened before, during and after.",
                "What the child said or showed.",
                "What adults did and why.",
                "What changed afterwards.",
                "What needs follow-up or review.",
            ],
            "avoid": [
                "Judgemental labels.",
                "Unsupported conclusions.",
                "Activity-only records with no impact or outcome.",
            ],
        }

    def _inspection_frame(self) -> dict[str, Any]:
        return {
            "topic": "inspection and governance reasoning",
            "purpose": "Translate the issue into evidence, child experience, leadership and improvement thinking.",
            "required_lenses": [
                "Child experience and progress [SCCIF].",
                "Leadership oversight and management impact [Reg 13].",
                "Evidence sufficiency and gaps.",
                "Learning, actions and follow-through.",
            ],
            "evidence_expectations": [
                "What changed for the child.",
                "How leaders knew and acted.",
                "Whether actions were reviewed.",
                "Whether patterns or drift were considered.",
            ],
            "avoid": [
                "Predicting inspection grades.",
                "Equating completed paperwork with impact.",
            ],
        }

    def _therapeutic_frame(self) -> dict[str, Any]:
        return {
            "topic": "therapeutic and reflective reasoning",
            "purpose": "Frame behaviour, distress or conflict through emotional meaning, repair and relational safety.",
            "required_lenses": [
                "Behaviour as communication.",
                "Emotional containment and co-regulation.",
                "Repair after rupture.",
                "Shame-sensitive language.",
                "Adult reflection and learning.",
            ],
            "evidence_expectations": [
                "What the child may have been communicating.",
                "What helped or escalated the situation.",
                "What repair or follow-up occurred.",
                "What adults learned for next time.",
            ],
            "avoid": [
                "Diagnosing children.",
                "Punitive or blame-based wording.",
            ],
        }


orb_institutional_depth_frame_service = OrbInstitutionalDepthFrameService()

from __future__ import annotations

from typing import Any


class OrbGroundedAnswerStyleService:
    """Grounded answer style rules for ORB.

    This teaches ORB to name the exact framework anchor it is using, place that
    anchor inline beside the relevant sentence, explain practical meaning, and
    show evidence expectations. It is deliberately neutral so it can be reused
    across ORB and OS surfaces.
    """

    ANCHORS = (
        {
            "label": "[Reg 12]",
            "basis": "Children's Homes Regulations 2015 — Regulation 12, protection standard",
            "meaning": "Use for protection, safety, response and immediate practice considerations.",
        },
        {
            "label": "[Reg 13]",
            "basis": "Children's Homes Regulations 2015 — Regulation 13, leadership and management standard",
            "meaning": "Use for oversight, management review, decision trail, learning and follow-through.",
        },
        {
            "label": "[SCCIF]",
            "basis": "Ofsted SCCIF children's homes inspection framework",
            "meaning": "Use for inspection evidence, children's experience, progress, help and leadership impact.",
        },
        {
            "label": "[Working Together]",
            "basis": "Working Together to Safeguard Children — multi-agency practice principles",
            "meaning": "Use for local procedure, information-sharing and multi-agency review considerations.",
        },
        {
            "label": "[Recording quality]",
            "basis": "Factual, child-centred residential recording principles",
            "meaning": "Use for wording, chronology, evidence trail, child voice, adult response and outcome.",
        },
    )

    def prompt_block(self, message: str, *, mode: str | None = None) -> str:
        text = str(message or "").lower()
        framework_context = any(
            term in text
            for term in (
                "allegation",
                "ofsted",
                "sccif",
                "regulation",
                "quality standard",
                "record",
                "manager",
                "risk",
                "evidence",
                "working together",
            )
        ) or str(mode or "").lower() in {
            "ofsted lens",
            "record this properly",
            "manager copilot",
            "safeguarding thinking",
        }
        if not framework_context:
            return ""
        anchor_lines = []
        for anchor in self.ANCHORS:
            anchor_lines.append(f"- {anchor['label']} {anchor['basis']}: {anchor['meaning']}")
        return "\n".join(
            [
                "Grounded answer style requirements:",
                "- Use named inline anchors beside important claims, for example [Reg 12], [Reg 13], [SCCIF], [Working Together], [Recording quality].",
                "- Do not only list broad sources at the end; connect the anchor to the exact point being made.",
                "- Explain why the anchor matters in practice.",
                "- Identify what evidence a manager, reviewer or inspector would expect to see.",
                "- Separate known facts, assumptions, missing information and next considerations.",
                "- Do not present built-in summaries as verbatim quotations unless exact official text is supplied.",
                "- Keep statutory decisions human-led and local-procedure-led.",
                "",
                "Available anchors:",
                *anchor_lines,
                "",
                "Preferred structure when framework anchors are relevant:",
                "1. Direct plain-English answer.",
                "2. Framework anchors with inline citations.",
                "3. Why this matters in practice.",
                "4. Evidence and recording expectations.",
                "5. Human-review boundary where relevant.",
            ]
        )

    def citation_payload(self, message: str, *, mode: str | None = None) -> list[dict[str, Any]]:
        if not self.prompt_block(message, mode=mode):
            return []
        return [
            {
                "id": anchor["label"].strip("[]").lower().replace(" ", "_"),
                "label": anchor["label"],
                "type": "regulatory_framework",
                "basis": anchor["basis"],
                "note": anchor["meaning"],
                "live_retrieved": False,
                "source_integrity": "built_in_anchor_not_verbatim_quote",
            }
            for anchor in self.ANCHORS
        ]


orb_grounded_answer_style_service = OrbGroundedAnswerStyleService()

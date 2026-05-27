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
        {
            "label": "[LADO]",
            "basis": "Local Authority Designated Officer — allegations management principles (Working Together)",
            "meaning": "Use for allegations against adults working with children: prompt referral thinking, information-sharing boundaries and management oversight — not threshold decisions.",
        },
    )

    def _allegations_depth_block(self) -> str:
        return "\n".join(
            [
                "Allegations / safeguarding depth requirements:",
                "- Treat this as institutional safeguarding reasoning for a residential children's home, not a generic safeguarding summary.",
                "- Use [Reg 12] for protection, immediate safety, child-centred response and what adults did to keep the child safe.",
                "- Use [Reg 13] for management oversight, decision trail, learning, follow-through and accountability.",
                "- Use [SCCIF] for what evidence an inspector may expect to see about help, protection and leadership impact.",
                "- Use [Working Together] and [LADO] for multi-agency and allegations-management considerations without deciding thresholds.",
                "- Use [Recording quality] for factual chronology, child voice, adult response, outcome and preserved evidence.",
                "- Cover: LADO referral thinking (human-led), Ofsted/evidence expectations, recording expectations, management oversight, therapeutic/emotional safety, escalation routes, and fairness to adults — concisely.",
                "- Do not predict Ofsted outcomes, decide LADO thresholds, or replace local safeguarding procedures.",
            ]
        )

    def prompt_block(self, message: str, *, mode: str | None = None) -> str:
        text = str(message or "").lower()
        allegations_context = any(term in text for term in ("allegation", "allegations", "lado", "conduct concern"))
        framework_context = allegations_context or any(
            term in text
            for term in (
                "ofsted",
                "sccif",
                "regulation",
                "quality standard",
                "record",
                "manager",
                "risk",
                "evidence",
                "working together",
                "safeguard",
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
        sections = [
            "Grounded answer style requirements:",
            "- Use named inline anchors beside important claims, for example [Reg 12], [Reg 13], [SCCIF], [Working Together], [LADO], [Recording quality].",
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
        if allegations_context:
            sections.extend(["", self._allegations_depth_block()])
        return "\n".join(sections)

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

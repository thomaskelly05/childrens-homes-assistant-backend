from __future__ import annotations

from typing import Any

from services.orb_professional_curiosity_service import orb_professional_curiosity_service


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
                "- Cover: child's exact words; what contact type may be alleged; injury/body map/CCTV/witnesses; staff account separately; avoid leading questions; interim safety; staff support and fairness; pattern review.",
                "- Do not decide truth/falsehood, assume the child is lying, or assume the adult is unsafe without process.",
                "- Do not predict Ofsted outcomes, decide LADO thresholds, or replace local safeguarding procedures.",
            ]
        )

    def _recording_rewrite_depth_block(self) -> str:
        return "\n".join(
            [
                "Recording rewrite depth requirements:",
                "- Provide: 1) improved record, 2) what was wrong, 3) what is still missing, 4) what to add before sign-off, 5) why this matters for inspection/oversight.",
                "- Use bracketed placeholders for missing facts, e.g. [Insert what happened immediately before the incident].",
                "- For restraint notes include antecedent, emotional presentation, de-escalation, risk, necessity, proportionality, duration/type, child response, injury check, debrief, repair, manager review.",
                "- Do not invent facts.",
            ]
        )

    def _topic_depth_block(self, text: str, *, mode: str | None = None) -> str:
        detected = orb_professional_curiosity_service.detect_topic(text, mode=mode) or ""
        blocks = {
            "missing": [
                "Missing episode depth:",
                "- Cover immediate safety, police/local procedure, timeline, search, who was informed, return conversation, push/pull factors, exploitation/contextual safeguarding, patterns, chronology update, manager oversight, prevention and Ofsted lens.",
            ],
            "restraint": [
                "Restraint depth:",
                "- Cover necessity, proportionality, least restrictive practice, before/during/after, alternatives, injury checks, debriefs, manager review, BSP review, patterns, emotional impact, repair and culture lens.",
            ],
            "chronology": [
                "Chronology cognition:",
                "- Explain what a strong chronology should show: lived experience, progress, setbacks, safeguarding patterns, relationships, missing, restraints, allegations, education, health, identity, family time, emotional themes, risk change, oversight, plans followed, child voice and impact.",
            ],
            "leadership": [
                "RM/RI governance depth:",
                "- RM: vulnerability today, overnight events, safeguarding/missing, climate, staffing, health/education, wellbeing, overdue actions, weak records, visible leadership, Ofsted-arrival challenge.",
                "- RI: home safety, manager support, child progress, leadership effectiveness, staff stability, Reg 44 repetition, Reg 45 evaluative quality, triangulation, drift, impact evidence.",
            ],
            "cumulative_concern": [
                "Cumulative safeguarding concern — mandatory depth (not a generic summary):",
                "- State explicitly: the concern is not one isolated event; it is the convergence of allegations, missing episodes and repeated physical interventions involving the same adult.",
                "- Explain why cumulative concern matters when no single event looks serious alone; 'nothing individually serious' can be dangerous minimisation.",
                "- Use inline anchors in reasoning with brief 'because' explanations: [Reg 12] protection/safety; [Reg 13] leadership oversight and learning; [SCCIF] children's experiences and safeguarding effectiveness; [LADO] repeated staff conduct — consultation thinking only; [Working Together] multi-agency; [Recording quality] facts, child voice, rationale, actions, outcome.",
                "- Patterns: allegation timing; restraint timing/normalisation; missing before/after same staff contact; staff–child dynamic breakdown; avoidance; shift/location/handover patterns; other young people's concerns; records minimising experience.",
                "- Evidence: full chronology; allegation/restraint/missing records; body maps; debriefs; staff statements; child words; manager reviews; supervision; BSP; risk/placement plans; complaints; Reg 44/45; lawful CCTV/witnesses; social worker/LADO advice.",
                "- RM questions: child experience; explaining away pattern; interim staffing; LADO/safeguarding consultation; allegation vs disciplinary separation; practice/training review; trusted adult; protective arrangements.",
                "- RI questions: manager curiosity; drift; minimisation of low-level events; Reg 44/45 pattern visibility; learning vs recording; impact on child safety.",
                "- Ofsted: patterns beyond incidents; timeliness; leadership; child voice; emotional safety; restraint culture; evidence leaders acted on cumulative concern.",
                "- Avoid: child lying; adult guilt without process; low-level = low-risk; unrelated incidents; paperwork = oversight.",
                "- End with calm summary, human-led/local-procedure boundary, and concrete next steps — never 'would you like to explore further?'",
            ],
        }
        if detected in blocks:
            return "\n".join(blocks[detected])
        for key, lines in blocks.items():
            if key.replace("_", " ") in text or key in text:
                return "\n".join(lines)
        return ""

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
                "restraint",
                "physical intervention",
                "missing",
                "chronology",
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
        if any(term in text for term in ("rewrite", "poor record", "rough note", "wording", "sign off")):
            sections.extend(["", self._recording_rewrite_depth_block()])
        topic_block = self._topic_depth_block(text, mode=mode)
        if topic_block:
            sections.extend(["", topic_block])
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

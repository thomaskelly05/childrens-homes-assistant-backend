from __future__ import annotations

"""Outstanding practice lens for ORB Residential.

This is not a user-facing mode. It is a permanent answer-shaping layer that
pushes ORB beyond compliance toward child impact, professional curiosity,
leadership oversight and Ofsted-quality evidence.
"""

from typing import Any


class OrbOutstandingPracticeLensService:
    CORE_DOMAINS = [
        "Child experience and lived experience",
        "Safeguarding and risk reduction",
        "Relationships and emotional safety",
        "Child voice, wishes and feelings",
        "Recording quality and evidence of impact",
        "Leadership, management and oversight",
        "Quality Standards and SCCIF alignment",
        "Learning loop: what changes because of this?",
    ]

    PROMPT = """Outstanding Practice Lens (apply quietly to every ORB Residential answer):
- Do not stop at compliance. Ask what would make practice good or outstanding.
- Always consider the child's lived experience: what is life like for the child here?
- Look for child voice: what has the child said, shown, avoided, or communicated through behaviour?
- Look for relationships: trusted adult, repair, consistency, warmth, rupture, shame and emotional safety.
- Look for safeguarding meaning: professional curiosity, contextual safeguarding, escalation, risk reduction and protective factors.
- Look for evidence of impact: what changed for the child because adults acted?
- Look for leadership oversight: what should a senior, registered manager or RI notice, challenge, review or evidence?
- Look for the learning loop: does the risk assessment, care plan, safety plan, chronology, key-work or supervision need updating?
- If relevant, include an Ofsted-style line of enquiry: what would an inspector ask next and what evidence would they expect?
- Keep it practical for the selected role. For RSW users, do not overwhelm; still include outstanding thinking in plain language.
- Never imply ORB can judge a home as outstanding. ORB can only identify practice features, evidence gaps and improvement opportunities.
"""

    ROLE_ADAPTATION: dict[str, str] = {
        "residential_support_worker": "For an RSW, translate outstanding practice into simple actions: safety, relationship, recording, asking for support and passing concerns to seniors/managers.",
        "senior": "For a senior, include coaching, record review, immediate oversight and what should be checked before sign-off.",
        "deputy_manager": "For a deputy manager, include quality assurance, drift, pattern spotting and supervision/debrief needs.",
        "registered_manager": "For an RM, include evidence of impact, leadership oversight, regulatory alignment and inspection readiness.",
        "responsible_individual": "For an RI, include governance challenge, triangulation, repeated themes, evidence of impact and provider learning.",
    }

    def prompt_block(self, *, role: str | None = None, mode: str | None = None, message: str | None = None) -> str:
        role_key = self._normalise_role(role)
        lines = [self.PROMPT.strip()]
        role_line = self.ROLE_ADAPTATION.get(role_key)
        if role_line:
            lines.append(f"Role adaptation: {role_line}")
        topic = self._topic_hint(message or "", mode=mode)
        if topic:
            lines.append(topic)
        return "\n".join(lines)

    def metadata(self, *, role: str | None = None) -> dict[str, Any]:
        return {
            "active": True,
            "name": "Outstanding Practice Lens",
            "domains": self.CORE_DOMAINS,
            "role_adaptation": self.ROLE_ADAPTATION.get(self._normalise_role(role)),
            "boundary": "Identifies practice features and evidence gaps; does not grade homes or replace professional judgement.",
            "standalone": True,
            "os_records_accessed": False,
        }

    def _normalise_role(self, role: str | None) -> str:
        value = str(role or "").strip().lower().replace(" ", "_").replace("-", "_")
        aliases = {
            "rsw": "residential_support_worker",
            "support_worker": "residential_support_worker",
            "residential_worker": "residential_support_worker",
            "senior_residential_worker": "senior",
            "senior_support_worker": "senior",
            "deputy": "deputy_manager",
            "rm": "registered_manager",
            "registered_home_manager": "registered_manager",
            "ri": "responsible_individual",
        }
        return aliases.get(value, value)

    def _topic_hint(self, message: str, *, mode: str | None = None) -> str:
        text = f"{message} {mode or ''}".lower()
        if any(term in text for term in ("incident", "missing", "risk", "safeguard", "restraint", "allegation")):
            return (
                "For incidents or safeguarding-related questions, include: immediate safety, child experience, professional curiosity, "
                "recording quality, manager oversight, Ofsted line of enquiry and what must change afterwards."
            )
        if any(term in text for term in ("record", "daily note", "rewrite", "wording")):
            return (
                "For recording questions, distinguish compliant wording from outstanding evidence: fact, child voice, adult response, outcome, impact and follow-up."
            )
        if any(term in text for term in ("care plan", "placement plan", "risk assessment", "plan")):
            return (
                "For plans, look for personalisation, child voice, measurable support, risk reduction, relationship-based practice and review of impact."
            )
        if any(term in text for term in ("ofsted", "inspection", "sccif", "reg 44", "reg 45")):
            return (
                "For inspection questions, focus on child experience, safeguarding effectiveness, leadership impact, workforce quality and evidence that practice improves outcomes."
            )
        return ""


orb_outstanding_practice_lens_service = OrbOutstandingPracticeLensService()

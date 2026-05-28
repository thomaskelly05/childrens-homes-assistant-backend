#!/usr/bin/env python3
"""Apply ORB cognition expansion patches to service modules."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch_curiosity() -> None:
    p = ROOT / "services/orb_professional_curiosity_service.py"
    t = p.read_text()
    if "orb_scenario_playbook_service" not in t:
        t = t.replace(
            "from typing import Any\n\n\nclass",
            "from typing import Any\n\nfrom services.orb_scenario_playbook_service import orb_scenario_playbook_service\n\n\nclass",
        )
    if '"live_safeguarding_incident": [' not in t:
        t = t.replace(
            '        "staffing": [\n            "How does staffing pressure',
            '''        "live_safeguarding_incident": [
            "What is happening right now — who, where, immediate risk of harm?",
            "Can staff engage verbally and delay safely without escalating?",
            "Is there unknown adult, vehicle, weapon, substance or coercion indicator?",
            "When might police, ambulance or EDT be needed now?",
            "If physical intervention is considered: necessity, proportionality, least restrictiveness?",
            "For 16–17: autonomy, maturity, exploitation risk.",
            "If child leaves: missing procedure, vehicle details; do not block moving vehicles.",
        ],
        "staffing": [\n            "How does staffing pressure''',
        )
        t = t.replace(
            '"staff_culture",\n        }\n    )',
            '"staff_culture",\n            "live_safeguarding_incident",\n            "physical_intervention_live",\n            "age_16_17_autonomy",\n        }\n    )',
        )
    old = (
        "    def detect_topic(self, message: str, *, mode: str | None = None) -> str | None:\n"
        "        text = str(message or \"\").lower()\n"
        "        mode_text = str(mode or \"\").lower()\n"
        "        if self._is_cumulative_concern(text):"
    )
    new = (
        "    def detect_topic(self, message: str, *, mode: str | None = None) -> str | None:\n"
        "        text = str(message or \"\").lower()\n"
        "        mode_text = str(mode or \"\").lower()\n"
        "        playbook_topic = orb_scenario_playbook_service.detect_topic(message)\n"
        "        if playbook_topic == \"live_safeguarding_incident\":\n"
        "            return \"live_safeguarding_incident\"\n"
        "        if orb_scenario_playbook_service.is_live_incident(message):\n"
        "            return \"live_safeguarding_incident\"\n"
        "        if any(term in text for term in (\"17 year old\", \"17-year-old\", \"16 year old\", \"16-year-old\")):\n"
        "            if any(term in text for term in (\"boyfriend\", \"physically stop\", \"getting into\", \"leaving\", \"car\")):\n"
        "                return playbook_topic or \"age_16_17_autonomy\"\n"
        "        if any(term in text for term in (\"can i physically stop\", \"can i restrain\", \"can i grab\", \"can i block the door\", \"can i lock the door\")):\n"
        "            return \"physical_intervention_live\"\n"
        "        if playbook_topic:\n"
        "            return playbook_topic\n"
        "        if self._is_cumulative_concern(text):"
    )
    if old in t:
        t = t.replace(old, new, 1)
    p.write_text(t)


def patch_grounding() -> None:
    p = ROOT / "services/orb_knowledge_grounding_service.py"
    t = p.read_text()
    vault_add = '''        "Complaints/Advocacy Vault": "Complaints, advocacy, voice of the child and fair process.",
        "Immediate Safeguarding Vault": "Live, time-critical safeguarding — urgent practical structure.",
        "Exploitation / CSE / CCE Vault": "Sexual and criminal exploitation, coercion, contextual safeguarding.",
        "Unknown Adult / Vehicle Risk Vault": "Unknown adults, vehicles, perimeter risk.",
        "Physical Intervention / Lawful Restriction Vault": "Lawful, proportionate physical responses.",
        "Deprivation of Liberty / Movement Restriction Vault": "Locking, blocking exits, confinement lawfulness.",
        "Age 16–17 Autonomy and Rights Vault": "Near-adult rights and proportionate protection.",
        "Police / Emergency Escalation Vault": "Police, ambulance, EDT routes.",
        "Dynamic Risk Assessment Vault": "In-the-moment risk judgement.",
        "Online Harm / Digital Contact Vault": "Digital exploitation and device restrictions.",
        "Substance / Intoxication Vault": "Intoxication and health escalation.",
        "Self-Harm / Mental Health Crisis Vault": "Immediate self-harm crisis.",
        "Sexual Harm / Pregnancy / Relationship Risk Vault": "Disclosures, pregnancy, relationship safeguarding.",
        "Violence / Weapons Vault": "Weapons and violent incidents.",
        "Peer-on-Peer Harm Vault": "Harm between children in placement.",
        "Visitor / Boundary Management Vault": "Visitors and perimeter security.",
        "Transport Safety Vault": "Vehicle pickups and transport exploitation.",
        "Legal Status / Care Order Vault": "Legal authority and care orders.",
    }'''
    if "Immediate Safeguarding Vault" not in t:
        t = t.replace(
            '        "Complaints/Advocacy Vault": "Complaints, advocacy, voice of the child and fair process.",\n    }',
            vault_add,
        )
    if '"live_safeguarding_incident"' not in t:
        t = t.replace(
            '    TOPIC_ANCHOR_LABELS: dict[str, list[str]] = {\n        "cumulative_concern":',
            '''    TOPIC_ANCHOR_LABELS: dict[str, list[str]] = {
        "live_safeguarding_incident": ["[Reg 12]", "[Working Together]", "[Recording quality]", "[Immediate safeguarding]", "[Restrictive practice]"],
        "physical_intervention_live": ["[Reg 12]", "[Reg 13]", "[Recording quality]", "[Restrictive practice]"],
        "exploitation": ["[Reg 12]", "[Working Together]", "[Recording quality]"],
        "self_harm": ["[Reg 12]", "[Recording quality]"],
        "cumulative_concern":''',
        )
    if '"live_safeguarding_incident": {' not in t:
        t = t.replace(
            '    TOPIC_CITATION_SUMMARIES: dict[str, dict[str, str]] = {\n        "medication":',
            '''    TOPIC_CITATION_SUMMARIES: dict[str, dict[str, str]] = {
        "live_safeguarding_incident": {
            "[Reg 12]": "Immediate protection and safeguarding duties.",
            "[Working Together]": "Multi-agency escalation when risk is present.",
            "[Recording quality]": "Contemporaneous rationale and chronology.",
            "[Immediate safeguarding]": "Live incident — least restrictive lawful action.",
            "[Restrictive practice]": "Physical intervention only if necessary and proportionate.",
        },
        "medication":''',
        )
    if "institutional_practice_anchor" not in t:
        t = t.replace(
            "            if not anchor:\n                continue\n            summary = compact.get(label)",
            """            summary = compact.get(label)
            if not anchor:
                if summary:
                    citations.append({
                        "id": label.strip("[]").lower().replace(" ", "_"),
                        "label": label,
                        "type": "institutional_practice_anchor",
                        "basis": summary,
                        "note": summary,
                        "live_retrieved": False,
                        "source_integrity": "built_in_anchor_not_verbatim_quote",
                    })
                continue
            summary = compact.get(label)""",
        )
    p.write_text(t)


def patch_runtime() -> None:
    p = ROOT / "services/shared_institutional_cognition_runtime.py"
    t = p.read_text()
    if "orb_scenario_playbook_service" not in t:
        t = t.replace(
            "from services.orb_residential_cognition_router import orb_residential_cognition_router\n",
            "from services.orb_residential_cognition_router import orb_residential_cognition_router\n"
            "from services.orb_scenario_playbook_service import orb_scenario_playbook_service\n",
        )
    if "playbook_prompt" not in t:
        t = t.replace(
            "        curiosity_prompt = orb_professional_curiosity_service.prompt_block(message, mode=mode)\n"
            "        guidance_prefix = None",
            "        curiosity_prompt = orb_professional_curiosity_service.prompt_block(message, mode=mode)\n"
            "        playbook_prompt = orb_scenario_playbook_service.prompt_block(message)\n"
            "        guidance_prefix = None",
        )
        t = t.replace(
            "(guidance_prefix, grounded_prompt, depth_prompt, curiosity_prompt)",
            "(guidance_prefix, playbook_prompt, grounded_prompt, depth_prompt, curiosity_prompt)",
        )
        t = t.replace(
            '"professional_curiosity": orb_professional_curiosity_service.context_payload(message, mode=mode),\n'
            '            "citations": citations,',
            '"professional_curiosity": orb_professional_curiosity_service.context_payload(message, mode=mode),\n'
            '            "scenario_playbook": orb_scenario_playbook_service.routing_metadata(message),\n'
            '            "citations": citations,',
        )
    if "Live safeguarding cognition" not in t:
        t = t.replace(
            '        topic = curiosity.get("topic")\n        if topic == "medication":',
            '''        topic = curiosity.get("topic")
        playbook_meta = orb_scenario_playbook_service.routing_metadata(message)
        playbook_topic = playbook_meta.get("topic")
        if playbook_topic == "live_safeguarding_incident" or topic == "live_safeguarding_incident":
            requirements.extend([
                "- Live safeguarding cognition: use scenario playbook markdown ## headings.",
                "- Open with live safeguarding anchor; cover manager/DSL, police if immediate risk, vehicle details.",
                "- Physical intervention only if immediate risk — lawful, necessary, proportionate, least restrictive.",
                "- Do not give blanket yes/no; end with professional boundary not coaching questions.",
            ])
        if topic == "medication":''',
        )
    p.write_text(t)


def patch_depth_frame() -> None:
    p = ROOT / "services/orb_institutional_depth_frame_service.py"
    t = p.read_text()
    if "orb_scenario_playbook_service" not in t:
        t = t.replace(
            "from services.orb_professional_curiosity_service import orb_professional_curiosity_service\n",
            "from services.orb_professional_curiosity_service import orb_professional_curiosity_service\n"
            "from services.orb_scenario_playbook_service import orb_scenario_playbook_service\n",
        )
    if "_live_safeguarding_incident_frame" not in t:
        t = t.replace(
            "        topic = self._topic(text=text, mode_text=mode_text)\n        if topic == \"cumulative_concern\":",
            """        topic = self._topic(text=text, mode_text=mode_text)
        playbook = orb_scenario_playbook_service.detect_playbook(message)
        if playbook and playbook.topic == "live_safeguarding_incident":
            return self._live_safeguarding_playbook_frame(playbook)
        if topic == "live_safeguarding_incident":
            return self._live_safeguarding_incident_frame()
        if topic == "physical_intervention_live":
            return self._physical_intervention_live_frame()
        if topic == "cumulative_concern":""",
        )
        t = t.replace(
            '            "medication",\n            "missing",',
            '            "live_safeguarding_incident",\n            "physical_intervention_live",\n            "medication",\n            "missing",',
        )
        old_topic = (
            "    def _topic(self, *, text: str, mode_text: str) -> str | None:\n"
            "        curiosity_topic = orb_professional_curiosity_service.detect_topic(text, mode=mode_text)\n"
            "        if curiosity_topic == \"cumulative_concern\":"
        )
        new_topic = (
            "    def _topic(self, *, text: str, mode_text: str) -> str | None:\n"
            "        playbook_topic = orb_scenario_playbook_service.detect_topic(text)\n"
            "        if playbook_topic in {\"live_safeguarding_incident\", \"physical_intervention_live\"}:\n"
            "            return playbook_topic\n"
            "        curiosity_topic = orb_professional_curiosity_service.detect_topic(text, mode=mode_text)\n"
            "        if curiosity_topic == \"cumulative_concern\":"
        )
        if old_topic in t:
            t = t.replace(old_topic, new_topic, 1)
        frames = '''

    def _live_safeguarding_playbook_frame(self, playbook: Any) -> dict[str, Any]:
        base = self._live_safeguarding_incident_frame()
        base["playbook_id"] = playbook.id
        base["response_structure"] = list(playbook.required_sections)
        base["opening_anchor"] = playbook.opening_anchor
        base["closing_guidance"] = playbook.professional_boundary
        return base

    def _live_safeguarding_incident_frame(self) -> dict[str, Any]:
        return {
            "topic": "live safeguarding incident",
            "purpose": "Urgent practical guidance for a live safeguarding situation.",
            "response_structure": [
                "## Immediate priority",
                "## Before physical intervention",
                "## When physical intervention may be considered",
                "## What to do if she/he/they leave or get into a vehicle",
                "## What information to capture",
                "## Who to contact",
                "## What to record afterwards",
                "## Professional boundary",
            ],
            "opening_anchor": (
                "This is a live safeguarding situation. The question is not simply whether you can physically stop "
                "her/him/them; it is whether there is an immediate risk of harm and what the least restrictive, lawful "
                "and proportionate action is right now."
            ),
            "closing_guidance": (
                "The priority is immediate safety, least-restrictive action, clear escalation, and accurate recording. "
                "ORB cannot decide the threshold for you; follow local safeguarding, missing-from-care and physical "
                "intervention procedures and seek manager/police/social work advice urgently where risk is present."
            ),
            "required_lenses": [
                "Dynamic risk; verbal engagement; exploitation/missing indicators; police/manager escalation.",
                "Physical intervention only if immediate risk — necessary, proportionate, policy-supported.",
                "Staff safety — do not block moving vehicles.",
            ],
            "avoid": ["Blanket yes/no on physical intervention.", "Generic safeguarding bullet lists."],
        }

    def _physical_intervention_live_frame(self) -> dict[str, Any]:
        return {
            "topic": "physical intervention — live decision",
            "purpose": "Lawful, proportionate, least-restrictive thinking about physical contact.",
            "response_structure": [
                "## Immediate risk assessment",
                "## Alternatives before physical contact",
                "## When physical intervention may be considered",
                "## Escalation and recording",
                "## Professional boundary",
            ],
            "opening_anchor": "This needs immediate judgement about risk, lawfulness and the least restrictive action.",
            "avoid": ["Authorising restraint without risk framing."],
        }
'''
        t = t.replace("\norb_institutional_depth_frame_service =", frames + "\norb_institutional_depth_frame_service =", 1)
    p.write_text(t)


def patch_standalone() -> None:
    p = ROOT / "services/orb_standalone_brain_service.py"
    t = p.read_text()
    if "orb_scenario_playbook_service" not in t:
        t = t.replace(
            "from services.orb_professional_curiosity_service import orb_professional_curiosity_service\n",
            "from services.orb_professional_curiosity_service import orb_professional_curiosity_service\n"
            "from services.orb_scenario_playbook_service import orb_scenario_playbook_service\n",
        )
    if "live_safeguarding_brain" not in t:
        t = t.replace(
            '            brains.extend(["residential_specialist_brain", "residential_children_homes_practice_brain"])\n\n        if self._is_safeguarding',
            '''            brains.extend(["residential_specialist_brain", "residential_children_homes_practice_brain"])

        if orb_scenario_playbook_service.detect_playbook(text) or orb_scenario_playbook_service.is_live_incident(text):
            brains.extend([
                "live_safeguarding_brain",
                "scenario_playbook_brain",
                "exploitation_brain",
                "missing_from_care_brain",
                "restrictive_practice_brain",
            ])

        if self._is_safeguarding''',
        )
    p.write_text(t)


def main() -> None:
    patch_curiosity()
    patch_grounding()
    patch_runtime()
    patch_depth_frame()
    patch_standalone()
    print("All patches applied.")


if __name__ == "__main__":
    main()

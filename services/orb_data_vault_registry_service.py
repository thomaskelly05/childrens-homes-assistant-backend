from __future__ import annotations

"""Canonical ORB data vault registry.

Data vaults are the domain stores/lenses used by ORB's cognition runtime.
They are not live IndiCare OS records. In standalone ORB they represent built-in,
curated practice knowledge domains and reasoning boundaries.
"""

from dataclasses import dataclass, asdict
from typing import Any


@dataclass(frozen=True)
class OrbDataVault:
    name: str
    category: str
    description: str
    standalone_allowed: bool = True
    live_os_records: bool = False
    source_integrity: str = "built_in_vault_not_live_record"
    typical_modules: tuple[str, ...] = ()
    typical_anchors: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["typical_modules"] = list(self.typical_modules)
        payload["typical_anchors"] = list(self.typical_anchors)
        return payload


DATA_VAULTS: tuple[OrbDataVault, ...] = (
    OrbDataVault(
        name="Regulatory Vault",
        category="regulatory",
        description="Children's Homes Regulations, Quality Standards and statutory framing.",
        typical_modules=("regulatory_framework", "quality_standards", "regulation_citations"),
        typical_anchors=("[Reg 12]", "[Reg 13]", "[Reg 44]", "[Reg 45]"),
    ),
    OrbDataVault(
        name="Safeguarding Vault",
        category="safeguarding",
        description="Safeguarding practice, Working Together principles and protection standards.",
        typical_modules=("contextual_safeguarding", "working_together", "safe_recording"),
        typical_anchors=("[Working Together]", "[LADO]", "[Reg 12]"),
    ),
    OrbDataVault(
        name="Therapeutic Vault",
        category="therapeutic",
        description="Trauma-informed, attachment-aware and relational practice guidance.",
        typical_modules=("trauma_informed", "therapeutic_language", "pace_attachment"),
        typical_anchors=("[Therapeutic practice]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Recording Quality Vault",
        category="recording",
        description="Factual, child-centred recording and chronology principles.",
        typical_modules=("safe_recording", "therapeutic_language", "regulation_citations"),
        typical_anchors=("[Recording quality]", "[SCCIF]", "[Reg 13]"),
    ),
    OrbDataVault(
        name="Ofsted/SCCIF Vault",
        category="inspection",
        description="Inspection framework, child experience, leadership impact and evidence sufficiency.",
        typical_modules=("inspection_readiness", "ofsted_sccif", "quality_standards", "leadership_management"),
        typical_anchors=("[SCCIF]", "[Reg 13]", "[Reg 12]"),
    ),
    OrbDataVault(
        name="Leadership/Governance Vault",
        category="governance",
        description="RM/RI oversight, audits, drift, learning, supervision and governance.",
        typical_modules=("leadership_management", "team_learning_loop", "inspection_readiness"),
        typical_anchors=("[Reg 13]", "[SCCIF]"),
    ),
    OrbDataVault(
        name="Missing From Home Vault",
        category="missing_from_home",
        description="Missing episodes, return conversations, push/pull factors and exploitation indicators.",
        typical_modules=("contextual_safeguarding", "safe_recording", "working_together"),
        typical_anchors=("[Reg 12]", "[Working Together]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Restrictive Practice Vault",
        category="restrictive_practice",
        description="Restraint, physical intervention, de-escalation, proportionality and repair.",
        typical_modules=("medication_restraint", "trauma_informed", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Reg 13]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Medication/Health Vault",
        category="medication_health",
        description="Medication safety, MAR records, PRN rationale, health appointments and oversight.",
        typical_modules=("medication_restraint", "safe_recording", "leadership_management"),
        typical_anchors=("[Medication / health]", "[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Workforce/Supervision Vault",
        category="workforce",
        description="Supervision, staff support, conduct, safer recruitment, training and culture.",
        typical_modules=("reflective_practice", "leadership_management", "team_learning_loop", "emotional_load"),
        typical_anchors=("[Reg 13]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Child Journey Vault",
        category="child_journey",
        description="Admission, matching, care planning, education, identity, family time and transitions.",
        typical_modules=("boundaries_identity", "environment_routines", "practice_triangle"),
        typical_anchors=("[SCCIF]", "[Reg 12]", "[Reg 13]"),
    ),
    OrbDataVault(
        name="Complaints/Advocacy Vault",
        category="complaints_advocacy",
        description="Complaints, advocacy, voice of the child and fair process.",
        typical_modules=("values_engine", "safe_recording", "leadership_management"),
        typical_anchors=("[Reg 13]", "[SCCIF]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Immediate Safeguarding Vault",
        category="immediate_safeguarding",
        description="Live, time-critical safeguarding structure and escalation thinking.",
        typical_modules=("contextual_safeguarding", "working_together", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Working Together]", "[Immediate safeguarding]"),
    ),
    OrbDataVault(
        name="Exploitation / CSE / CCE Vault",
        category="exploitation",
        description="Sexual and criminal exploitation, coercion and contextual safeguarding.",
        typical_modules=("contextual_safeguarding", "working_together", "practice_triangle"),
        typical_anchors=("[Working Together]", "[Reg 12]", "[SCCIF]"),
    ),
    OrbDataVault(
        name="Unknown Adult / Vehicle Risk Vault",
        category="external_risk",
        description="Unknown adults, vehicles, perimeter risk and exploitation indicators.",
        typical_modules=("contextual_safeguarding", "safe_recording"),
        typical_anchors=("[Working Together]", "[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Physical Intervention / Lawful Restriction Vault",
        category="restrictive_practice",
        description="Lawful, proportionate physical responses and least restrictive practice.",
        typical_modules=("medication_restraint", "trauma_informed", "safe_recording"),
        typical_anchors=("[Restrictive practice]", "[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Deprivation of Liberty / Movement Restriction Vault",
        category="rights_restrictions",
        description="Locking, blocking exits, confinement and movement restriction lawfulness.",
        typical_modules=("regulatory_framework", "contextual_safeguarding", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Reg 13]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Age 16–17 Autonomy and Rights Vault",
        category="rights_autonomy",
        description="Near-adult rights, proportionality, autonomy and protection for 16–17 year olds.",
        typical_modules=("regulatory_framework", "contextual_safeguarding", "values_engine"),
        typical_anchors=("[Reg 12]", "[SCCIF]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Police / Emergency Escalation Vault",
        category="emergency_escalation",
        description="Police, ambulance, EDT and emergency escalation routes.",
        typical_modules=("contextual_safeguarding", "working_together", "safe_recording"),
        typical_anchors=("[Working Together]", "[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Dynamic Risk Assessment Vault",
        category="dynamic_risk",
        description="In-the-moment risk judgement, least restrictive response and uncertainty handling.",
        typical_modules=("practice_triangle", "contextual_safeguarding", "trauma_informed"),
        typical_anchors=("[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Online Harm / Digital Contact Vault",
        category="online_harm",
        description="Digital exploitation, device restrictions, online contact and safety planning.",
        typical_modules=("contextual_safeguarding", "working_together", "safe_recording"),
        typical_anchors=("[Working Together]", "[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Substance / Intoxication Vault",
        category="substance_intoxication",
        description="Intoxication, substances, health escalation and contextual safeguarding.",
        typical_modules=("contextual_safeguarding", "medication_restraint", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Medication / health]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Self-Harm / Mental Health Crisis Vault",
        category="self_harm_crisis",
        description="Immediate self-harm concern, emotional distress and safeguarding escalation.",
        typical_modules=("contextual_safeguarding", "trauma_informed", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Working Together]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Sexual Harm / Pregnancy / Relationship Risk Vault",
        category="sexual_harm_relationships",
        description="Disclosures, pregnancy, sexual harm, relationship risk and safeguarding.",
        typical_modules=("contextual_safeguarding", "working_together", "safe_recording"),
        typical_anchors=("[Working Together]", "[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Violence / Weapons Vault",
        category="violence_weapons",
        description="Weapons, violence, immediate safety and escalation.",
        typical_modules=("contextual_safeguarding", "safe_recording", "medication_restraint"),
        typical_anchors=("[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Peer-on-Peer Harm Vault",
        category="peer_harm",
        description="Harm between children in placement and group living risk.",
        typical_modules=("contextual_safeguarding", "therapeutic_language", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Working Together]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Visitor / Boundary Management Vault",
        category="visitor_boundaries",
        description="Visitors, boundaries, perimeter security and safe relationships.",
        typical_modules=("boundaries_identity", "contextual_safeguarding", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Transport Safety Vault",
        category="transport_safety",
        description="Vehicle pickups, transport arrangements and exploitation risk.",
        typical_modules=("contextual_safeguarding", "safe_recording"),
        typical_anchors=("[Reg 12]", "[Working Together]", "[Recording quality]"),
    ),
    OrbDataVault(
        name="Legal Status / Care Order Vault",
        category="legal_status",
        description="Legal authority, care orders, placement authority and decision boundaries.",
        typical_modules=("regulatory_framework", "safe_recording", "leadership_management"),
        typical_anchors=("[Reg 12]", "[Reg 13]", "[Recording quality]"),
    ),
)

_VAULTS_BY_NAME = {vault.name: vault for vault in DATA_VAULTS}


class OrbDataVaultRegistryService:
    def list_vaults(self) -> list[dict[str, Any]]:
        return [vault.to_dict() for vault in DATA_VAULTS]

    def get_vault(self, name: str) -> dict[str, Any] | None:
        vault = _VAULTS_BY_NAME.get(str(name or "").strip())
        return vault.to_dict() if vault else None

    def describe_domains(self, names: list[str]) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for name in names:
            vault = self.get_vault(name)
            if vault:
                result.append(vault)
            else:
                result.append({
                    "name": name,
                    "category": "unknown",
                    "description": "Institutional practice vault selected by the cognition router.",
                    "standalone_allowed": True,
                    "live_os_records": False,
                    "source_integrity": "built_in_vault_not_live_record",
                    "typical_modules": [],
                    "typical_anchors": [],
                })
        return result


orb_data_vault_registry_service = OrbDataVaultRegistryService()

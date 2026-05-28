from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class KnowledgeVault:
    id: str
    title: str
    purpose: str
    governance_rules: tuple[str, ...]
    examples: tuple[str, ...]
    must_never: tuple[str, ...] = ()
    must_always_consider: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbKnowledgeVaultService:
    """Governed knowledge-domain architecture for ORB and IndiCare.

    These vaults are intended to become:
    - governed cognition domains
    - explainable knowledge boundaries
    - memory and evidence safety layers
    - future ingestion/update containers
    """

    def __init__(self) -> None:
        self.vaults = self._build()

    def context_payload(self) -> dict[str, Any]:
        return {
            "vaults": [vault.to_dict() for vault in self.vaults.values()],
            "purpose": "Governed knowledge separation for residential-care cognition.",
        }

    def prompt_addendum(self) -> str:
        lines = ["Governed knowledge vault architecture:"]
        for vault in self.vaults.values():
            lines.append(f"- {vault.title}: {vault.purpose}")
            lines.append("  Governance: " + "; ".join(vault.governance_rules[:4]))
        return "\n".join(lines)

    def _vault(
        self,
        *,
        id: str,
        title: str,
        purpose: str,
        governance_rules: tuple[str, ...],
        examples: tuple[str, ...],
        must_never: tuple[str, ...] = (),
        must_always_consider: tuple[str, ...] = (),
    ) -> KnowledgeVault:
        return KnowledgeVault(
            id=id,
            title=title,
            purpose=purpose,
            governance_rules=governance_rules,
            examples=examples,
            must_never=must_never,
            must_always_consider=must_always_consider,
        )

    def _build(self) -> dict[str, KnowledgeVault]:
        vaults = [
            self._vault(
                id="regulatory_vault",
                title="Regulatory Vault",
                purpose="Structured regulations, Quality Standards, SCCIF and governance cognition.",
                governance_rules=(
                    "Must remain updateable against official guidance.",
                    "Must distinguish regulation from interpretation.",
                    "Must not hallucinate legal duties.",
                ),
                examples=("Children's Homes Regulations", "Quality Standards", "SCCIF", "Reg 44", "Reg 45"),
                must_never=("Invent statutory wording or cite unretrieved official quotes as verbatim.",),
                must_always_consider=("Which regulation frames the duty; what evidence would show compliance.",),
            ),
            self._vault(
                id="safeguarding_vault",
                title="Safeguarding Vault",
                purpose="Safeguarding reasoning, escalation frameworks and boundary-safe guidance.",
                governance_rules=(
                    "No automated threshold decisions.",
                    "Human review and local procedures remain primary.",
                    "Escalation reasoning must remain explainable.",
                ),
                examples=("missing episodes", "allegations", "contextual safeguarding", "online harm"),
                must_never=("Decide LADO threshold or abuse outcomes.",),
                must_always_consider=("Immediate safety, child voice, multi-agency routes, manager/DSL oversight.",),
            ),
            self._vault(
                id="therapeutic_vault",
                title="Therapeutic Vault",
                purpose="Trauma-informed, relational and emotionally attuned practice cognition.",
                governance_rules=(
                    "Avoid diagnostic certainty.",
                    "Avoid punitive/shaming framing.",
                    "Prioritise regulation, repair and emotional safety.",
                ),
                examples=("PACE", "co-regulation", "repair", "attachment-aware practice"),
                must_never=("Label behaviour as manipulation without exploring meaning.",),
                must_always_consider=("What the child may be communicating; repair after rupture.",),
            ),
            self._vault(
                id="provider_learning_vault",
                title="Provider Learning Vault",
                purpose="Provider-wide organisational learning, drift detection and governance insight.",
                governance_rules=(
                    "Patterns should be explainable.",
                    "Repeated concerns should increase visibility.",
                    "Improvement should be measurable.",
                ),
                examples=("Reg 44 themes", "audit learning", "repeated incidents", "inspection readiness"),
            ),
            self._vault(
                id="child_narrative_vault",
                title="Child Narrative Vault",
                purpose="Chronology and child-lived-experience narrative continuity.",
                governance_rules=(
                    "Protect identity and privacy.",
                    "Preserve child voice.",
                    "Avoid reducing children to incidents or risk labels.",
                ),
                examples=("chronology", "life story", "child voice", "placement journey"),
            ),
            self._vault(
                id="workforce_reflection_vault",
                title="Workforce Reflection Vault",
                purpose="Reflective workforce development, emotional climate and supervision cognition.",
                governance_rules=(
                    "Support psychologically safe reflection.",
                    "Avoid blame-led reasoning.",
                    "Track wellbeing and learning themes ethically.",
                ),
                examples=("supervision", "burnout", "debrief", "practice learning"),
            ),
            self._vault(
                id="immediate_safeguarding_vault",
                title="Immediate Safeguarding Vault",
                purpose="Live, time-critical safeguarding situations requiring urgent practical structure.",
                governance_rules=(
                    "Prioritise immediate safety and least-restrictive lawful action.",
                    "Escalate to manager/DSL and emergency services when indicated.",
                    "Never give blanket yes/no on physical intervention.",
                ),
                examples=(
                    "child leaving now",
                    "unknown adult at door",
                    "weapon disclosed",
                    "active self-harm",
                ),
                must_never=(
                    "Treat live incidents as generic policy summaries.",
                    "Delay escalation when immediate risk is indicated.",
                ),
                must_always_consider=(
                    "Dynamic risk in the moment; staff safety; child's words; who to call now.",
                ),
            ),
            self._vault(
                id="exploitation_cse_cce_vault",
                title="Exploitation / CSE / CCE Vault",
                purpose="Sexual and criminal exploitation, contextual safeguarding and coercion indicators.",
                governance_rules=(
                    "Do not conclude exploitation without evidence — explore indicators.",
                    "Link missing episodes, substances, gifts, transport and unknown adults.",
                ),
                examples=("CSE", "county lines", "older boyfriend", "unknown vehicle pickup"),
                must_never=("Blame the child for exploitation risk.",),
                must_always_consider=(
                    "Push/pull factors; multi-agency routes; chronology; child voice.",
                ),
            ),
            self._vault(
                id="unknown_adult_vehicle_vault",
                title="Unknown Adult / Vehicle Risk Vault",
                purpose="Unknown adults, vehicles and boundary risks at the home perimeter.",
                governance_rules=(
                    "Verify identity and contact permissions before access.",
                    "Capture vehicle details if a child leaves with unknown adults.",
                ),
                examples=("car pulled up", "stranger at door", "unplanned parent"),
                must_never=("Allow unsupervised contact without verification.", "Block moving vehicles unsafely."),
                must_always_consider=("Registration, description, direction of travel; police if immediate risk."),
            ),
            self._vault(
                id="physical_intervention_vault",
                title="Physical Intervention / Lawful Restriction Vault",
                purpose="Restraint, holding, blocking and lawful least-restrictive physical responses.",
                governance_rules=(
                    "Necessity, proportionality, least restrictiveness, training and policy.",
                    "Alternatives before physical contact.",
                ),
                examples=("can I physically stop", "restraint debrief", "holding during crisis"),
                must_never=("Authorise restraint without immediate-risk framing.",),
                must_always_consider=(
                    "Care plan, risk assessment, age, legal status, recording and manager review.",
                ),
            ),
            self._vault(
                id="dol_movement_restriction_vault",
                title="Deprivation of Liberty / Movement Restriction Vault",
                purpose="Locking doors, blocking exit, confinement and movement restriction lawfulness.",
                governance_rules=(
                    "Distinguish safeguarding hold from unlawful deprivation of liberty.",
                    "Document rationale and authority.",
                ),
                examples=("lock the door", "block the exit", "confiscate phone as restriction"),
            ),
            self._vault(
                id="age_16_17_autonomy_vault",
                title="Age 16–17 Autonomy and Rights Vault",
                purpose="Near-adult rights, wishes, capacity and proportionate protection balance.",
                governance_rules=(
                    "Safeguarding risk does not disappear at 16–17.",
                    "Respect maturity and wishes while assessing coercion and exploitation.",
                ),
                examples=("17-year-old leaving", "sexual relationship", "independence planning"),
            ),
            self._vault(
                id="police_emergency_vault",
                title="Police / Emergency Escalation Vault",
                purpose="When to call police, ambulance, EDT and emergency multi-agency routes.",
                governance_rules=(
                    "Prompt urgent escalation when immediate risk warrants it.",
                    "Preserve evidence thinking without contaminating process.",
                ),
                examples=("call police now", "999", "ambulance", "EDT out of hours"),
            ),
            self._vault(
                id="dynamic_risk_assessment_vault",
                title="Dynamic Risk Assessment Vault",
                purpose="In-the-moment risk judgement, changing presentation and least-restrictive decisions.",
                governance_rules=(
                    "Risk can change minute by minute — revisit as situation evolves.",
                    "Record rationale for action and inaction.",
                ),
                examples=("about to leave", "unknown car", "weapon visible"),
            ),
            self._vault(
                id="online_harm_vault",
                title="Online Harm / Digital Contact Vault",
                purpose="Digital exploitation, sextortion, harmful content and phone/confiscation decisions.",
                governance_rules=(
                    "Do not blame children for online harm.",
                    "Consider proportionate device restrictions with rights balance.",
                ),
                examples=("nude image shared", "sextortion", "take their phone"),
            ),
            self._vault(
                id="substance_intoxication_vault",
                title="Substance / Intoxication Vault",
                purpose="Intoxication, substances, county lines links and health escalation.",
                governance_rules=(
                    "Health-first response; medical advice routes.",
                    "Explore exploitation and missing links.",
                ),
                examples=("appears drunk", "taken tablets recreationally", "county lines"),
            ),
            self._vault(
                id="self_harm_crisis_vault",
                title="Self-Harm / Mental Health Crisis Vault",
                purpose="Immediate self-harm, suicidal ideation and mental health crisis response.",
                governance_rules=(
                    "Immediate safety and medical assessment where indicated.",
                    "Calm, non-shaming engagement.",
                ),
                examples=("going to hurt themselves", "taken overdose", "cutting now"),
            ),
            self._vault(
                id="sexual_harm_vault",
                title="Sexual Harm / Pregnancy / Relationship Risk Vault",
                purpose="Disclosures, peer sexual harm, pregnancy and relationship safeguarding.",
                governance_rules=(
                    "Record in child's words; preserve forensic thinking without coaching.",
                    "Escalate safeguarding and health routes.",
                ),
                examples=("disclosed assault", "pregnant", "peer sexual harm"),
            ),
            self._vault(
                id="violence_weapons_vault",
                title="Violence / Weapons Vault",
                purpose="Weapons, threats and violent incidents in the home.",
                governance_rules=(
                    "Staff safety and separation first.",
                    "Police escalation when weapons present.",
                ),
                examples=("knife", "threatening with weapon", "fight with weapon"),
            ),
            self._vault(
                id="peer_harm_vault",
                title="Peer-on-Peer Harm Vault",
                purpose="Assaults, bullying and sexual harm between children in placement.",
                governance_rules=(
                    "Welfare of all children; avoid minimisation.",
                    "Separate accounts and chronology.",
                ),
                examples=("peer assault", "bullying", "sexual harm between residents"),
            ),
            self._vault(
                id="visitor_boundary_vault",
                title="Visitor / Boundary Management Vault",
                purpose="Visitors, contact lists, unplanned arrivals and perimeter security.",
                governance_rules=(
                    "Verify identity and authority.",
                    "Manager direction for unplanned contact.",
                ),
                examples=("unauthorised visitor", "not on contact list"),
            ),
            self._vault(
                id="transport_safety_vault",
                title="Transport Safety Vault",
                purpose="Vehicle pickups, escorts, missing travel and transport-related exploitation.",
                governance_rules=(
                    "Never block moving vehicles unsafely.",
                    "Capture vehicle details when children leave with unknown adults.",
                ),
                examples=("getting into car", "taxi pickup", "unknown driver"),
            ),
            self._vault(
                id="legal_status_vault",
                title="Legal Status / Care Order Vault",
                purpose="Legal authority, care orders, restrictions and parental rights boundaries.",
                governance_rules=(
                    "Do not assume parental authority without checking legal status.",
                    "Reference care plan and court orders.",
                ),
                examples=("care order", "section 20", "parent demanding removal"),
            ),
        ]
        return {vault.id: vault for vault in vaults}


orb_knowledge_vault_service = OrbKnowledgeVaultService()

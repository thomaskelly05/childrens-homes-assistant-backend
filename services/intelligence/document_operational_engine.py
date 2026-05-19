from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from services.document_template_service import document_template_service
from services.intelligence.contracts import get_domain_contract


DOCUMENT_OPERATIONAL_LIFECYCLE: tuple[str, ...] = (
    "create",
    "draft",
    "submit",
    "review",
    "approve_or_sign_off",
    "return",
    "archive",
)


@dataclass(frozen=True)
class DocumentOperationalContract:
    template_id: str
    title: str
    scope: str
    lifecycle: tuple[str, ...]
    chronology_linkage: bool
    evidence_linkage: bool
    governance_linkage: bool
    orb_linkage: bool
    reporting_linkage: bool
    alerts_linkage: bool
    versioning_required: bool
    signoff_required: bool
    review_frequency: str
    owner_role: str
    known_gaps: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class DocumentOperationalEngine:
    """Operational entity contract for documents and templates."""

    def template_contract(self, template_id: str) -> DocumentOperationalContract:
        template = document_template_service.get_template(template_id)
        workflow = template.workflow or {}
        documents_contract = get_domain_contract("documents")
        return DocumentOperationalContract(
            template_id=template.template_id,
            title=template.title,
            scope=template.scope.value,
            lifecycle=DOCUMENT_OPERATIONAL_LIFECYCLE,
            chronology_linkage=bool(workflow.get("link_chronology") or template.chronology_requirements),
            evidence_linkage=bool(workflow.get("link_evidence") or template.evidence_requirements),
            governance_linkage=bool(template.regulatory_links or template.sccif_links),
            orb_linkage=bool(template.orb_prompt_pack),
            reporting_linkage=bool(workflow.get("export_print_ready") or template.export_profile),
            alerts_linkage=True,
            versioning_required=True,
            signoff_required=bool(template.signoff_requirements),
            review_frequency=template.review_frequency,
            owner_role=template.owner_role,
            known_gaps=documents_contract.known_gaps if documents_contract else (),
        )

    def registry_summary(self) -> dict[str, Any]:
        contracts = [self.template_contract(template.template_id) for template in document_template_service.templates()]
        return {
            "ok": True,
            "template_count": len(contracts),
            "operational_lifecycle": list(DOCUMENT_OPERATIONAL_LIFECYCLE),
            "documents": [contract.to_dict() for contract in contracts],
            "templates_missing_chronology": [contract.template_id for contract in contracts if not contract.chronology_linkage],
            "templates_missing_evidence": [contract.template_id for contract in contracts if not contract.evidence_linkage],
            "templates_missing_signoff": [contract.template_id for contract in contracts if not contract.signoff_required],
        }


document_operational_engine = DocumentOperationalEngine()


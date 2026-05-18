# Governance & Inspection Operating System Consolidation Audit

## Existing systems reused

- Workspace orchestration: `WorkspaceOrchestratorService` for chronology, documents, actions and manager oversight.
- Inspection evidence: `OfstedEvidenceEngineService`, `assistant.inspection_readiness` and `inspection_pack_service`.
- Manager/provider intelligence: `ManagerIntelligenceService` and `ProviderIntelligenceService`.
- Workforce intelligence: `WorkforceIntelligenceService` command centre, risk, relationships and ORB context.
- Regulatory ontology: `RegulatoryOntologyService` for SCCIF, Quality Standards and Children’s Homes Regulations.
- ORB retrieval: `AssistantRetrievalService` and existing citation/regulatory link contracts.

## Consolidation decisions

- Governance OS is a backend-composed layer under `/api/governance-os`; frontend pages render returned intelligence only.
- Governance risk is centralised in `score_governance_risk` and consumes existing manager, workforce, evidence and workflow signals.
- SCCIF evidence matrix uses the existing regulatory ontology and normalised evidence source contract.
- Reg 44 is represented as a lifecycle workflow with evidence links, actions, provider responses and ORB summaries.
- Reg 45 generation remains evidence-assisted context building and does not generate a final judgement.
- ORB governance answers reuse the assistant retrieval pipeline with evidence-linked governance sources.

## Duplicate or fragmented systems found

- Manager and predictive risk services count overlapping operational risk signals.
- Next.js command-centre aggregation and legacy `os-command.html` remain parallel dashboard surfaces.
- Client-side SCCIF and child voice heuristics overlap with backend evidence/gap services.
- Provider intelligence has production and static demo implementations with similar naming.
- `workflow_review_routes` currently exposes static in-memory review data.

## Hidden unfinished areas

- Existing Reg 44 legacy reader data is not automatically migrated into `governance_reg44_visits`.
- Optional evidence tables can be absent; governance endpoints degrade to empty states.
- Predictive inspection readiness is a vulnerability forecast, not an Ofsted grade prediction.
- Legacy OS command pages should be bridged to `/api/governance-os` before deprecation.

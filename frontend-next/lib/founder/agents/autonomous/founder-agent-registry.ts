import type { FounderAgentDefinition, FounderAgentId } from './founder-agent-types'

const BASE_FORBIDDEN = [
  'auto_merge',
  'auto_publish',
  'auto_send_external_email',
  'auto_override_launch_gate',
  'auto_delete_failed_runs',
  'auto_weaken_safety_scoring'
] as const

export const FOUNDER_AGENT_DEFINITIONS: FounderAgentDefinition[] = [
  {
    id: 'founder-chief-of-staff',
    name: 'Founder Chief of Staff',
    roleTitle: 'Founder Chief of Staff',
    purpose: 'Orchestrates the agent team, summarises priorities and tells Tom what needs approval today.',
    scope: ['agent orchestration', 'daily founder brief', 'approval queue prioritisation'],
    permissions: 'observe_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['all external actions', 'launch readiness', 'PR merges'],
    connectedSignals: ['all agent outputs', 'approval queue', 'launch gate', 'quality lab', 'evaluation runs'],
    availablePreparedActions: ['create_audit_note', 'draft_founder_update'],
    requiresFounderApproval: true
  },
  {
    id: 'orb-quality-agent',
    name: 'ORB Quality Agent',
    roleTitle: 'ORB Quality Agent',
    purpose: 'Reads ORB Evaluation and Quality Lab runs, classifies failures, generates fix plans and PR-ready work.',
    scope: ['quality lab runs', 'evaluation runs', 'failure classification', 'draft PR summaries'],
    permissions: 'approval_required',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['PR creation', 'safety threshold changes', 'launch gate overrides'],
    connectedSignals: ['quality lab', 'orb evaluation', 'coverage map', 'launch gate'],
    availablePreparedActions: [
      'analyse_latest_run',
      'generate_build_brief',
      'create_draft_pr_summary',
      'run_synthetic_evaluation',
      'update_coverage_map',
      'create_technical_fix_brief'
    ],
    requiresFounderApproval: true
  },
  {
    id: 'safeguarding-agent',
    name: 'Safeguarding Agent',
    roleTitle: 'Safeguarding & Child-Centred Practice Agent',
    purpose:
      'Reviews ORB prompts, answers, templates and workflows for safeguarding risk, escalation, child voice, non-punitive language and professional judgement.',
    scope: ['safeguarding markers', 'escalation language', 'child voice', 'non-punitive wording'],
    permissions: 'approval_required',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['all safeguarding changes', 'prompt modifications affecting escalation'],
    connectedSignals: ['quality lab failures', 'evaluation red-team findings', 'orb templates'],
    availablePreparedActions: ['analyse_latest_run', 'generate_build_brief', 'create_audit_note'],
    requiresFounderApproval: true
  },
  {
    id: 'ofsted-regulation-agent',
    name: 'Ofsted Regulation Agent',
    roleTitle: 'Ofsted & Regulation Agent',
    purpose:
      'Checks outputs for SCCIF orientation, Regulation 44/45 preparation, evidence quality, management oversight and regulatory caution. Must not invent law.',
    scope: ['SCCIF alignment', 'Reg 44/45', 'management oversight', 'regulatory caution'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['regulatory claims', 'Inspection evidence preparation statements'],
    connectedSignals: ['quality lab', 'evaluation runs', 'evidence packs'],
    availablePreparedActions: ['analyse_latest_run', 'prepare_launch_gate_evidence', 'create_audit_note'],
    requiresFounderApproval: true
  },
  {
    id: 'product-agent',
    name: 'Product Agent',
    roleTitle: 'Product Strategy Agent',
    purpose: 'Identifies product gaps, prioritises features and turns user/testing evidence into build briefs.',
    scope: ['product gaps', 'feature prioritisation', 'user evidence', 'pilot feedback'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['product launch decisions', 'scope changes affecting safeguarding'],
    connectedSignals: ['telemetry', 'pilot feedback', 'evaluation UX failures', 'quality proposals'],
    availablePreparedActions: ['create_product_build_brief', 'generate_build_brief', 'create_pilot_summary'],
    requiresFounderApproval: true
  },
  {
    id: 'technical-agent',
    name: 'Technical Agent',
    roleTitle: 'Technical Reliability Agent',
    purpose: 'Monitors errors, logs, deployments, API failures, tests, performance and technical risk. Prepares technical PRs.',
    scope: ['errors', 'deployments', 'API failures', 'test results', 'performance'],
    permissions: 'approval_required',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['technical PR merges', 'infrastructure changes'],
    connectedSignals: ['telemetry', 'evaluation infrastructure errors', 'build status'],
    availablePreparedActions: ['create_technical_fix_brief', 'create_draft_pr_summary', 'analyse_latest_run'],
    requiresFounderApproval: true
  },
  {
    id: 'ux-recording-agent',
    name: 'UX Recording Agent',
    roleTitle: 'UX & Recording Practice Agent',
    purpose:
      'Improves ORB Voice, Dictate, Chat, Write, daily records, incident reflections, word processor flows and recording quality.',
    scope: ['voice', 'dictate', 'chat', 'write', 'daily records', 'incident reflections'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['UX changes affecting safeguarding flows'],
    connectedSignals: ['quality lab UX failures', 'telemetry', 'pilot feedback'],
    availablePreparedActions: ['create_product_build_brief', 'generate_build_brief', 'create_audit_note'],
    requiresFounderApproval: true
  },
  {
    id: 'evidence-agent',
    name: 'Evidence Agent',
    roleTitle: 'Evidence & Audit Agent',
    purpose:
      'Builds evidence trails, launch gate evidence, improvement logs, audit summaries, pilot evidence and testing reports.',
    scope: ['evidence packs', 'improvement logs', 'audit summaries', 'pilot evidence'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['public evidence claims', 'launch gate evidence publication'],
    connectedSignals: ['quality runs', 'evaluation runs', 'agent audit trail', 'pilot data'],
    availablePreparedActions: ['prepare_launch_gate_evidence', 'create_audit_note', 'create_pilot_summary'],
    requiresFounderApproval: true
  },
  {
    id: 'governance-agent',
    name: 'Governance Agent',
    roleTitle: 'Governance, Privacy & Risk Agent',
    purpose:
      'Tracks privacy review, retention review, risk register, approval trail, policy caveats and launch blockers.',
    scope: ['privacy', 'retention', 'risk register', 'approval trail', 'launch blockers'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['privacy policy changes', 'retention policy changes', 'risk acceptance'],
    connectedSignals: ['launch gate', 'pilot privacy status', 'approval queue'],
    availablePreparedActions: [
      'prepare_privacy_review_prompt',
      'prepare_retention_review_prompt',
      'create_risk_register_entry',
      'create_audit_note'
    ],
    requiresFounderApproval: true
  },
  {
    id: 'content-agent',
    name: 'Content Agent',
    roleTitle: 'Founder Content Agent',
    purpose:
      'Drafts LinkedIn posts, launch updates, demo scripts, founder story copy, website copy and sector-facing content. Requires approval before publishing.',
    scope: ['LinkedIn', 'launch updates', 'demo scripts', 'founder story', 'website copy'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['all public content', 'LinkedIn posts', 'website copy'],
    connectedSignals: ['launch gate', 'pilot readiness', 'product milestones'],
    availablePreparedActions: ['draft_linkedin_post', 'draft_founder_update', 'create_audit_note'],
    requiresFounderApproval: true
  },
  {
    id: 'revenue-agent',
    name: 'Revenue Agent',
    roleTitle: 'Revenue & Commercial Agent',
    purpose:
      'Tracks pricing assumptions, demo interest, conversion, subscriptions, trial-to-paid routes and commercial readiness. Must not exaggerate traction.',
    scope: ['pricing', 'demo interest', 'conversion', 'subscriptions', 'commercial readiness'],
    permissions: 'observe_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['revenue claims', 'traction statements', 'pricing changes'],
    connectedSignals: ['revenue snapshots', 'pilot interest', 'relationship pipeline'],
    availablePreparedActions: ['draft_founder_update', 'create_audit_note'],
    requiresFounderApproval: true
  },
  {
    id: 'relationship-agent',
    name: 'Relationship Agent',
    roleTitle: 'Partnerships & Relationships Agent',
    purpose:
      'Tracks potential pilots, sector experts, advisors, investors, providers and follow-ups. Can draft messages but cannot send without approval.',
    scope: ['pilots', 'sector experts', 'advisors', 'investors', 'providers', 'follow-ups'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['all external messages', 'provider communications'],
    connectedSignals: ['relationships CRM', 'pilot pipeline', 'demo requests'],
    availablePreparedActions: ['draft_provider_email', 'draft_partner_follow_up', 'create_audit_note'],
    requiresFounderApproval: true
  },
  {
    id: 'pilot-agent',
    name: 'Pilot Agent',
    roleTitle: 'Pilot Readiness Agent',
    purpose: 'Tracks testers, pilot providers, feedback, risks, changes made, training needs and pilot evidence.',
    scope: ['testers', 'pilot providers', 'feedback', 'training needs', 'pilot evidence'],
    permissions: 'prepare_only',
    forbiddenActions: [...BASE_FORBIDDEN],
    approvalRequirements: ['pilot expansion', 'provider onboarding communications'],
    connectedSignals: ['pilot feedback', 'quality runs', 'relationship pipeline'],
    availablePreparedActions: ['create_pilot_summary', 'prepare_launch_gate_evidence', 'create_audit_note'],
    requiresFounderApproval: true
  }
]

export function getAllFounderAgentDefinitions(): FounderAgentDefinition[] {
  return [...FOUNDER_AGENT_DEFINITIONS]
}

export function getFounderAgentDefinition(id: FounderAgentId): FounderAgentDefinition {
  const agent = FOUNDER_AGENT_DEFINITIONS.find((a) => a.id === id)
  if (!agent) throw new Error(`Unknown founder agent: ${id}`)
  return agent
}

export function isValidFounderAgentId(id: string): id is FounderAgentId {
  return FOUNDER_AGENT_DEFINITIONS.some((a) => a.id === id)
}

export const REQUIRED_FOUNDER_AGENT_IDS: FounderAgentId[] = FOUNDER_AGENT_DEFINITIONS.map((a) => a.id)

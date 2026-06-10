/**
 * Founder Company Operating Model — department definitions.
 */

import type { CompanyDepartment } from './company-types'

export type CompanyDepartmentDefinition = Omit<
  CompanyDepartment,
  'liveKpis' | 'currentPriorities' | 'openRisks' | 'openActions' | 'status' | 'score' | 'confidence'
> & {
  kpiIds: string[]
}

export const COMPANY_DEPARTMENTS: CompanyDepartmentDefinition[] = [
  {
    id: 'ceo-office',
    name: 'CEO Office',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Chief of Staff Agent',
    agentId: 'chief-of-staff',
    purpose: 'Set priorities, make decisions, remove blockers, protect strategy.',
    responsibilities: [
      'Coordinate executive team and founder operating system',
      'Produce daily CEO briefing and top priorities',
      'Surface pending approvals and strategic risks',
      'Protect founder memory and strategic alignment'
    ],
    kpiIds: [
      'open-critical-actions',
      'pending-approvals',
      'latest-operating-loop',
      'founder-readiness-score',
      'strategic-alignment-score'
    ]
  },
  {
    id: 'product',
    name: 'Product',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Product Director Agent',
    agentId: 'product-director',
    purpose: 'Improve ORB Residential, Dictate, Write, Voice and user value.',
    responsibilities: [
      'Prioritise product roadmap from live usage',
      'Protect child-centred practitioner design',
      'Align features with Ofsted readiness gaps',
      'Recommend build priorities from telemetry'
    ],
    kpiIds: [
      'orb-conversations',
      'dictate-sessions',
      'report-generations',
      'feature-usage',
      'user-feedback-count',
      'build-briefs-completed'
    ]
  },
  {
    id: 'engineering',
    name: 'Engineering',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'CTO Agent / Lead Developer Agent',
    agentId: 'cto',
    purpose: 'Reliability, architecture, security, deployment quality and technical execution.',
    responsibilities: [
      'Monitor platform reliability and error rates',
      'Prioritise technical debt and build briefs',
      'Review AI infrastructure and cost controls',
      'Ensure founder-safe data architecture'
    ],
    kpiIds: [
      'error-rate',
      'open-build-briefs',
      'completed-build-briefs',
      'operating-loop-technical-risks',
      'platform-health',
      'unresolved-technical-actions'
    ]
  },
  {
    id: 'quality-regulation',
    name: 'Quality & Regulation',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'ORB Quality Agent / Ofsted Agent',
    agentId: 'orb-quality',
    purpose: 'Safeguarding quality, Ofsted readiness, therapeutic language and answer quality.',
    responsibilities: [
      'Run Quality Lab evaluations',
      'Monitor Ofsted readiness gaps',
      'Review therapeutic tone and safeguarding appropriateness',
      'Propose quality improvements'
    ],
    kpiIds: [
      'quality-lab-pass-rate',
      'critical-failures',
      'improvement-proposals',
      'ofsted-readiness-status',
      'quality-actions-open'
    ]
  },
  {
    id: 'commercial',
    name: 'Commercial',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Partnerships Agent / Customer Success Agent',
    agentId: 'partnerships',
    purpose: 'Providers, pilots, partnerships, testers and customer adoption.',
    responsibilities: [
      'Manage provider and pilot relationships',
      'Track follow-ups and opportunities',
      'Support customer adoption and onboarding',
      'Never claim interest without recorded evidence'
    ],
    kpiIds: [
      'provider-relationships',
      'pilot-opportunities',
      'follow-ups-due',
      'active-opportunities',
      'converted-opportunities',
      'provider-home-counts'
    ]
  },
  {
    id: 'revenue-finance',
    name: 'Revenue & Finance',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Finance and AI Cost Agent',
    agentId: 'finance-ai-cost',
    purpose: 'Revenue, subscriptions, AI cost, margin, forecasts and runway.',
    responsibilities: [
      'Track live MRR and ARR where connected',
      'Monitor AI spend and unit economics',
      'Label forecasts clearly as modelled assumptions',
      'Flag margin and runway risks'
    ],
    kpiIds: [
      'mrr',
      'arr',
      'paid-users',
      'active-subscriptions',
      'ai-cost',
      'cost-per-conversation',
      'gross-margin',
      'billing-source-status'
    ]
  },
  {
    id: 'brand-growth',
    name: 'Brand & Growth',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Brand Ambassador Agent / Growth Agent',
    agentId: 'brand-ambassador',
    purpose: 'Founder narrative, LinkedIn/content, awareness, launch traction and campaigns.',
    responsibilities: [
      'Draft founder content — never auto-post',
      'Track growth actions and conversion signals',
      'Maintain ethical children\'s homes narrative',
      'Route external claims through approvals'
    ],
    kpiIds: [
      'content-drafts',
      'approved-posts',
      'content-approvals-pending',
      'growth-actions',
      'marketing-analytics',
      'brand-opportunities'
    ]
  },
  {
    id: 'investor-partnerships',
    name: 'Investor & Partnerships',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Investor Relations Agent / Evidence Pack Agent',
    agentId: 'investor-relations',
    purpose: 'Funding, strategic partners, evidence packs, OpenAI/Microsoft/Innovate UK/DfE routes.',
    responsibilities: [
      'Generate evidence packs from live data only',
      'Manage investor and strategic partner relationships',
      'Prepare investor briefings with honest limitations',
      'Route external materials through approvals'
    ],
    kpiIds: [
      'investor-relationships',
      'strategic-partner-relationships',
      'evidence-packs-generated',
      'evidence-packs-approved',
      'investor-briefings',
      'partnership-opportunities'
    ]
  },
  {
    id: 'data-protection-safety',
    name: 'Data Protection & Safety',
    executiveOwner: 'Thomas',
    aiAgentOwner: 'Data Protection and Safety Agent',
    agentId: 'data-protection-safety',
    purpose: 'Privacy, GDPR, safeguarding sensitivity, approval gates and safe external claims.',
    responsibilities: [
      'Review external-facing content for safety',
      'Block unsafe claims and identifiable data',
      'Monitor approval compliance',
      'Flag unresolved safety risks'
    ],
    kpiIds: [
      'safety-reviews',
      'blocked-unsafe-claims',
      'approval-compliance',
      'unresolved-safety-risks',
      'audit-events'
    ]
  }
]

export function getCompanyDepartmentDefinition(departmentId: string): CompanyDepartmentDefinition | undefined {
  return COMPANY_DEPARTMENTS.find((d) => d.id === departmentId)
}

export function isValidCompanyDepartmentId(id: string): boolean {
  return COMPANY_DEPARTMENTS.some((d) => d.id === id)
}

/**
 * Company operating cadence — daily, weekly, monthly, quarterly rhythms.
 */

import { getOpenFounderActions } from '@/lib/founder/actions/founder-action-store'
import { getPendingApprovals } from '@/lib/founder/approvals/approval-store'
import { generateFounderIntelligenceSnapshotSync } from '@/lib/founder/intelligence-centre/intelligence-sync'
import { getFollowUpRecommendations } from '@/lib/founder/relationships/relationship-intelligence-engine'
import type { CompanyCeoAgendaItem, CompanyOperatingCadence } from './company-types'
import type { CompanyKpiMap } from './company-live-kpi-builder'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'

function intelSnapshot() {
  try {
    return generateFounderIntelligenceSnapshotSync()
  } catch {
    return null
  }
}

export function buildCompanyCadences(kpiMap: CompanyKpiMap): CompanyOperatingCadence[] {
  const intel = intelSnapshot()
  const pendingApprovals = getPendingApprovals()
  const followUps = getFollowUpRecommendations()
  const actions = getOpenFounderActions()

  const dailyActions = [
    ...intel?.topPriorities.slice(0, 2).map((p) => `Priority: ${p.title}`) ?? [],
    ...pendingApprovals.slice(0, 2).map((a) => `Approval: ${a.title}`),
    ...followUps.slice(0, 2).map((f) => `Follow-up: ${f.relationship.organisation}`)
  ]

  return [
    {
      id: 'daily-ceo-check-in',
      cadenceType: 'daily',
      title: 'Daily CEO Check-In',
      owner: 'Thomas / Chief of Staff Agent',
      agenda: [
        'Review top priorities from Founder Intelligence Centre',
        'Review blockers and critical actions',
        'Review pending approvals',
        'Review relationship follow-ups due',
        'Review live usage and revenue changes (where connected)',
        'Review company risks and safety items'
      ],
      requiredInputs: [
        'Founder Intelligence snapshot',
        'Open actions and pending approvals',
        'Live telemetry summary',
        'Relationship follow-ups'
      ],
      outputs: [
        'Updated CEO agenda',
        'Decisions recorded in Founder Memory',
        'Actions assigned to department agents'
      ],
      approvalRequired: false,
      generatedActions: dailyActions.length > 0 ? dailyActions : ['Connect live data sources to populate daily agenda']
    },
    {
      id: 'weekly-executive-meeting',
      cadenceType: 'weekly',
      title: 'Weekly Executive Meeting',
      owner: 'Chief of Staff Agent',
      agenda: [
        'Each department reports KPIs, progress, blockers and next actions',
        'Founder Intelligence generates weekly briefing',
        'Chief of Staff creates weekly plan',
        'Review Quality Lab and evidence readiness',
        'Review revenue and AI cost (live or unavailable)'
      ],
      requiredInputs: [
        'Department KPI scorecard',
        'Staff team agent outputs',
        'Weekly intelligence briefing',
        'Operating loop results'
      ],
      outputs: [
        'Weekly executive pack (draft)',
        'Department actions for the week',
        'Escalations to Thomas for decision'
      ],
      approvalRequired: true,
      generatedActions: actions.slice(0, 4).map((a) => a.title)
    },
    {
      id: 'monthly-board-review',
      cadenceType: 'monthly',
      title: 'Monthly Board Review',
      owner: 'Thomas / Investor Relations Agent',
      agenda: [
        'Revenue status (live or unavailable)',
        'Product progress and usage',
        'Relationship pipeline',
        'Evidence readiness',
        'Quality and Inspection evidence preparation',
        'Key risks and runway/forecast (labelled assumptions)',
        'Decisions required from Thomas'
      ],
      requiredInputs: [
        'Company scorecard',
        'Board report draft',
        'Approved revenue forecasts only for external claims',
        'Evidence packs and limitations'
      ],
      outputs: [
        'Monthly board report draft',
        'Approval queue for external narrative',
        'Next month priorities'
      ],
      approvalRequired: true,
      generatedActions: intel?.recommendedDecisions.slice(0, 3) ?? []
    },
    {
      id: 'quarterly-strategy-review',
      cadenceType: 'quarterly',
      title: 'Quarterly Strategy Review',
      owner: 'Thomas / Chief of Staff Agent',
      agenda: [
        "Product direction and children's homes focus",
        'Market focus and provider strategy',
        'Pricing and revenue model',
        'Partnerships and funding routes',
        'Roadmap and build priorities'
      ],
      requiredInputs: [
        'Founder Memory strategic context',
        'Quarterly company scorecard',
        'Relationship and evidence pipeline',
        'Quality and regulation posture'
      ],
      outputs: [
        'Updated strategic priorities in Founder Memory',
        'Quarterly board narrative draft',
        'Funding and partnership action plan'
      ],
      approvalRequired: true,
      generatedActions: intel?.opportunities.slice(0, 3).map((o) => o.nextAction) ?? []
    }
  ]
}

export function buildCeoAgenda(kpiMap: CompanyKpiMap): CompanyCeoAgendaItem[] {
  const items: CompanyCeoAgendaItem[] = []
  const intel = intelSnapshot()
  const pendingApprovals = getPendingApprovals()
  const followUps = getFollowUpRecommendations()
  const actions = getOpenFounderActions().filter((a) => a.priority === 'critical' || a.priority === 'high')

  intel?.topPriorities.slice(0, 3).forEach((p) => {
    items.push({
      id: nextId('ceo-agenda'),
      category: 'decision',
      title: p.title,
      detail: p.recommendedAction,
      departmentId: p.category === 'revenue' ? 'revenue-finance' : p.category === 'quality' ? 'quality-regulation' : 'ceo-office',
      priority: p.priority
    })
  })

  pendingApprovals.slice(0, 3).forEach((a) => {
    items.push({
      id: nextId('ceo-agenda'),
      category: 'approval',
      title: a.title,
      detail: `Approval type: ${a.type}. Risk: ${a.riskLevel}.`,
      priority: a.riskLevel === 'high' ? 'critical' : 'high'
    })
  })

  followUps.slice(0, 3).forEach((f) => {
    items.push({
      id: nextId('ceo-agenda'),
      category: 'follow-up',
      title: `Follow up: ${f.relationship.organisation}`,
      detail: f.relationship.nextAction || f.intelligence.followUpReason || 'Relationship follow-up due',
      departmentId: 'commercial',
      priority: 'medium'
    })
  })

  intel?.risks.slice(0, 2).forEach((r) => {
    items.push({
      id: nextId('ceo-agenda'),
      category: 'risk',
      title: r.title,
      detail: r.mitigation,
      priority: r.severity
    })
  })

  actions.slice(0, 3).forEach((a) => {
    items.push({
      id: nextId('ceo-agenda'),
      category: 'action',
      title: a.title,
      detail: a.recommendedNextStep,
      priority: a.priority
    })
  })

  const mrrKpi = kpiMap['mrr']
  if (mrrKpi?.sourceStatus === 'unavailable') {
    items.push({
      id: nextId('ceo-agenda'),
      category: 'risk',
      title: 'Revenue data unavailable',
      detail: 'Live billing not connected — do not quote MRR externally.',
      departmentId: 'revenue-finance',
      priority: 'high'
    })
  }

  return items
}

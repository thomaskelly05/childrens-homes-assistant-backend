/**
 * Founder Company Operating Model — orchestrates departments, scorecard, cadence and CEO agenda.
 * Uses bootstrap-hydrated stores only — no additional browser API storms.
 */

import { getOpenFounderActions } from '@/lib/founder/actions/founder-action-store'
import { generateFounderIntelligenceSnapshotSync } from '@/lib/founder/intelligence-centre/intelligence-sync'
import { getLastOperatingLoopRun } from '@/lib/founder/operating-loop/operating-loop-store'
import { runStaffAgent } from '@/lib/founder/team/founder-team-registry'
import { COMPANY_DEPARTMENTS } from './company-departments'
import { buildCeoAgenda, buildCompanyCadences } from './company-cadence-engine'
import {
  buildCompanyLiveKpis,
  COMPANY_HEADLINE_KPI_IDS,
  getDepartmentKpis
} from './company-live-kpi-builder'
import { buildCompanyScorecard, departmentStatusFromScore } from './company-score-engine'
import type { CompanyDepartment, CompanyOperatingModel } from './company-types'

function intelSnapshot() {
  try {
    return generateFounderIntelligenceSnapshotSync()
  } catch {
    return null
  }
}

function buildDepartments(kpiMap: ReturnType<typeof buildCompanyLiveKpis>['kpis'], scorecard: ReturnType<typeof buildCompanyScorecard>): CompanyDepartment[] {
  const intel = intelSnapshot()
  const operatingLoop = getLastOperatingLoopRun()
  const actions = getOpenFounderActions()

  return COMPANY_DEPARTMENTS.map((def) => {
    const liveKpis = getDepartmentKpis(def.kpiIds, kpiMap)
    const deptScore = scorecard.departmentScores.find((d) => d.departmentId === def.id)
    const agentOutput = (() => {
      try {
        return runStaffAgent(def.agentId as Parameters<typeof runStaffAgent>[0])
      } catch {
        return null
      }
    })()

    const deptActions = actions
      .filter((a) => a.staffAgentId === def.agentId || a.category === def.id)
      .map((a) => a.title)
      .slice(0, 5)

    const deptRisks = [
      ...liveKpis.filter((k) => k.sourceStatus === 'unavailable').map((k) => `${k.name} unavailable`),
      ...(deptScore?.risks ?? []),
      ...(agentOutput?.departmentOwnership?.blockers ?? agentOutput?.risks ?? []).slice(0, 2)
    ]

    const priorities = [
      ...(agentOutput?.departmentOwnership?.kpiInterpretation ?? []).slice(0, 1),
      ...(intel?.topPriorities.filter((p) => p.category === mapDeptToPriorityCategory(def.id)).map((p) => p.title) ?? []),
      ...(agentOutput?.recommendations ?? []).slice(0, 2)
    ].filter(Boolean)

    return {
      id: def.id,
      name: def.name,
      executiveOwner: def.executiveOwner,
      aiAgentOwner: def.aiAgentOwner,
      agentId: def.agentId,
      purpose: def.purpose,
      responsibilities: def.responsibilities,
      liveKpis,
      currentPriorities: priorities.length > 0 ? priorities : ['Connect live data sources for department priorities'],
      openRisks: [...new Set(deptRisks)].slice(0, 5),
      openActions: deptActions,
      status: departmentStatusFromScore(def.id, scorecard.departmentScores, kpiMap, def.kpiIds),
      score: deptScore?.score,
      confidence: deptScore?.confidence,
      opportunities: intel?.opportunities
        .filter((o) => mapDeptToOpportunity(def.id, o.opportunityType))
        .map((o) => o.title)
        .slice(0, 3),
      evidence: def.id === 'investor-partnerships'
        ? liveKpis.filter((k) => k.id.includes('evidence')).map((k) => `${k.name}: ${k.value ?? 'Unavailable'}`)
        : undefined,
      operatingLoopOutputs:
        def.id === 'ceo-office' && operatingLoop
          ? [
              operatingLoop.telemetrySummary,
              ...operatingLoop.recommendedFounderDecisions.slice(0, 2)
            ]
          : undefined,
      recommendedDecisions: [
        ...(deptScore?.recommendations ?? []),
        ...(agentOutput?.departmentOwnership?.recommendedDecisions ?? agentOutput?.recommendations ?? []).slice(0, 2)
      ]
    }
  })
}

function mapDeptToPriorityCategory(deptId: string): string {
  const map: Record<string, string> = {
    'ceo-office': 'operations',
    product: 'product',
    engineering: 'product',
    'quality-regulation': 'quality',
    commercial: 'commercial',
    'revenue-finance': 'revenue',
    'brand-growth': 'growth',
    'investor-partnerships': 'evidence',
    'data-protection-safety': 'safety'
  }
  return map[deptId] ?? 'operations'
}

function mapDeptToOpportunity(deptId: string, type: string): boolean {
  const map: Record<string, string[]> = {
    commercial: ['provider', 'partner', 'product'],
    'brand-growth': ['growth', 'product'],
    'investor-partnerships': ['investor', 'partner', 'evidence', 'grant'],
    'revenue-finance': ['product', 'growth']
  }
  return (map[deptId] ?? []).includes(type)
}

export function buildCompanyOperatingModel(): CompanyOperatingModel {
  const { kpis, limitations } = buildCompanyLiveKpis()
  const scorecard = buildCompanyScorecard(kpis, limitations)
  const departments = buildDepartments(kpis, scorecard)
  const cadences = buildCompanyCadences(kpis)
  const ceoAgenda = buildCeoAgenda(kpis)

  const companyKpis = COMPANY_HEADLINE_KPI_IDS.map((id) => kpis[id]).filter((k): k is NonNullable<typeof k> => Boolean(k))

  return {
    scorecard,
    departments,
    companyKpis,
    ceoAgenda,
    cadences,
    limitations: [...new Set([...limitations, ...scorecard.limitations])],
    generatedAt: new Date().toISOString()
  }
}

export function getCompanyDepartment(departmentId: string): CompanyDepartment | undefined {
  const model = buildCompanyOperatingModel()
  return model.departments.find((d) => d.id === departmentId)
}

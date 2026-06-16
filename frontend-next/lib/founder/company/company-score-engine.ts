/**
 * Conservative department scoring for Founder Company Operating Model.
 * Missing live data lowers confidence — never fabricates zeros for unavailable sources.
 */

import type { CompanyDepartmentStatus, CompanyKpi, CompanyScorecard, DepartmentScore } from './company-types'
import { COMPANY_DEPARTMENTS } from './company-departments'
import type { CompanyKpiMap } from './company-live-kpi-builder'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'

function kpiLiveRatio(kpis: CompanyKpi[]): number {
  if (kpis.length === 0) return 0
  const live = kpis.filter((k) => k.sourceStatus === 'live').length
  return live / kpis.length
}

function kpiUnavailableCount(kpis: CompanyKpi[]): number {
  return kpis.filter((k) => k.sourceStatus === 'unavailable').length
}

function numericValue(kpi: CompanyKpi | undefined): number | null {
  if (!kpi || kpi.sourceStatus === 'unavailable' || kpi.value === null) return null
  if (typeof kpi.value === 'number') return kpi.value
  return null
}

function scoreFromKpis(
  departmentId: string,
  kpis: CompanyKpi[],
  baseScore: number,
  reason: string,
  risks: string[],
  recommendations: string[]
): DepartmentScore {
  const liveRatio = kpiLiveRatio(kpis)
  const unavailable = kpiUnavailableCount(kpis)
  const confidence = Math.round(Math.max(20, Math.min(95, liveRatio * 100 - unavailable * 5)))
  const adjustedScore = Math.round(Math.max(0, Math.min(100, baseScore * (0.5 + liveRatio * 0.5))))

  return {
    departmentId,
    score: adjustedScore,
    confidence,
    reason,
    risks,
    recommendations
  }
}

function deriveDepartmentStatus(score: number, confidence: number, unavailableKpis: number): CompanyDepartmentStatus {
  if (unavailableKpis >= 3 && confidence < 40) return 'unavailable'
  if (score < 45 || confidence < 35) return 'at-risk'
  if (score < 65 || confidence < 55) return 'watch'
  return 'healthy'
}

export function calculateDepartmentScores(kpiMap: CompanyKpiMap): DepartmentScore[] {
  const scores: DepartmentScore[] = []

  for (const dept of COMPANY_DEPARTMENTS) {
    const kpis = dept.kpiIds.map((id) => kpiMap[id]).filter((k): k is CompanyKpi => Boolean(k))

    switch (dept.id) {
      case 'ceo-office': {
        const critical = numericValue(kpiMap['open-critical-actions']) ?? 0
        const pendingApprovals = numericValue(kpiMap['pending-approvals']) ?? 0
        const readiness = numericValue(kpiMap['founder-readiness-score'])
        let base = readiness ?? 50
        if (critical > 3) base -= 15
        if (pendingApprovals > 5) base -= 10
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            readiness !== null
              ? `Founder readiness ${readiness}/100 with ${pendingApprovals} pending approvals.`
              : 'Founder readiness unavailable — CEO Office score limited.',
            [
              ...(critical > 0 ? [`${critical} critical actions open`] : []),
              ...(pendingApprovals > 0 ? [`${pendingApprovals} approvals pending`] : [])
            ],
            ['Review top priorities and clear approval blockers', 'Run daily CEO check-in']
          )
        )
        break
      }

      case 'product': {
        const orb = numericValue(kpiMap['orb-conversations'])
        const features = numericValue(kpiMap['feature-usage'])
        let base = 55
        if (orb !== null && orb > 0) base += 15
        if (features !== null && features > 50) base += 10
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            orb !== null ? `ORB conversations: ${orb}` : 'ORB usage data unavailable.',
            kpiMap['dictate-sessions']?.sourceStatus === 'unavailable' ? ['Dictate usage not connected'] : [],
            ['Prioritise features with live usage signal', 'Review build briefs backlog']
          )
        )
        break
      }

      case 'engineering': {
        const errorRate = numericValue(kpiMap['error-rate'])
        const openBriefs = numericValue(kpiMap['open-build-briefs']) ?? 0
        let base = 60
        if (errorRate !== null && errorRate > 15) base -= 20
        if (errorRate !== null && errorRate <= 5) base += 10
        if (openBriefs > 5) base -= 10
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            errorRate !== null ? `Error rate ${errorRate}%` : 'Telemetry unavailable for engineering score.',
            errorRate !== null && errorRate > 10 ? ['Elevated error rate'] : [],
            ['Clear open build briefs', 'Monitor platform health']
          )
        )
        break
      }

      case 'quality-regulation': {
        const passRate = numericValue(kpiMap['quality-lab-pass-rate'])
        const critical = numericValue(kpiMap['critical-failures']) ?? 0
        let base = passRate ?? 40
        if (passRate === null) base = 40
        if (critical > 0) base -= critical * 5
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            passRate !== null ? `Quality Lab pass rate ${passRate}%` : 'No Quality Lab run — score limited.',
            passRate === null ? ['No Quality Lab run recorded'] : critical > 0 ? [`${critical} critical proposals`] : [],
            ['Run Quality Lab evaluation', 'Address Inspection evidence preparation gaps']
          )
        )
        break
      }

      case 'commercial': {
        const providers = numericValue(kpiMap['provider-relationships']) ?? 0
        const pilots = numericValue(kpiMap['pilot-opportunities']) ?? 0
        let base = 40
        if (providers > 0) base += 20
        if (pilots > 0) base += 15
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            providers === 0 && pilots === 0 ? Math.min(base, 50) : base,
            providers > 0
              ? `${providers} provider relationship(s) on file`
              : 'No relationships recorded — commercial score limited.',
            providers === 0 ? ['No provider relationships recorded'] : [],
            ['Record provider and pilot relationships', 'Complete due follow-ups']
          )
        )
        break
      }

      case 'revenue-finance': {
        const mrr = numericValue(kpiMap['mrr'])
        const aiCost = numericValue(kpiMap['ai-cost'])
        let base = mrr !== null ? 65 : 35
        if (mrr === null) base = Math.min(base, 45)
        if (aiCost !== null && aiCost > 0 && mrr === null) base -= 10
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            mrr !== null ? `Live MRR connected` : 'Revenue unavailable — finance score cannot be high.',
            mrr === null ? ['Live billing not connected'] : [],
            ['Connect live billing source', 'Review AI cost per conversation']
          )
        )
        break
      }

      case 'brand-growth': {
        const drafts = numericValue(kpiMap['content-drafts']) ?? 0
        const growthActions = numericValue(kpiMap['growth-actions']) ?? 0
        let base = 50 + Math.min(20, drafts * 2) + Math.min(15, growthActions * 3)
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            `${drafts} content draft(s), ${growthActions} growth action(s)`,
            kpiMap['marketing-analytics']?.sourceStatus === 'unavailable'
              ? ['Marketing analytics not connected']
              : [],
            ['Draft founder content from verified progress only', 'Route external posts through approvals']
          )
        )
        break
      }

      case 'investor-partnerships': {
        const generated = numericValue(kpiMap['evidence-packs-generated']) ?? 0
        const approved = numericValue(kpiMap['evidence-packs-approved']) ?? 0
        let base = 45
        if (generated > 0) base += 15
        if (approved > 0) base += 20
        if (generated > 0 && approved === 0) base -= 15
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            `${approved}/${generated} evidence packs approved`,
            generated > approved ? ['Evidence generated but not yet approved'] : [],
            ['Approve evidence packs before external use', 'Record investor relationships']
          )
        )
        break
      }

      case 'data-protection-safety': {
        const safetyRisks = numericValue(kpiMap['unresolved-safety-risks']) ?? 0
        const blocked = numericValue(kpiMap['blocked-unsafe-claims']) ?? 0
        let base = 70 - safetyRisks * 10
        scores.push(
          scoreFromKpis(
            dept.id,
            kpis,
            base,
            safetyRisks > 0 ? `${safetyRisks} unresolved safety risk(s)` : 'No critical safety risks flagged',
            safetyRisks > 0 ? ['Unresolved safety risks require review'] : [],
            ['Review approval compliance', 'Block unsafe external claims']
          )
        )
        if (blocked > 0) {
          scores[scores.length - 1].reason += `; ${blocked} unsafe claim(s) blocked`
        }
        break
      }

      default:
        scores.push(scoreFromKpis(dept.id, kpis, 50, 'Default conservative score', [], []))
    }
  }

  return scores
}

export function buildCompanyScorecard(kpiMap: CompanyKpiMap, limitations: string[]): CompanyScorecard {
  const departmentScores = calculateDepartmentScores(kpiMap)
  const overallCompanyScore = Math.round(
    departmentScores.reduce((sum, d) => sum + d.score, 0) / Math.max(departmentScores.length, 1)
  )
  const overallConfidence = Math.round(
    departmentScores.reduce((sum, d) => sum + d.confidence, 0) / Math.max(departmentScores.length, 1)
  )

  const liveKpis = Object.values(kpiMap).filter((k) => k.sourceStatus === 'live')
  const risks = departmentScores.flatMap((d) => d.risks).slice(0, 8)
  const opportunities = departmentScores
    .filter((d) => d.score >= 65)
    .map((d) => `${d.departmentId}: ${d.reason}`)
    .slice(0, 5)
  const blockers = departmentScores
    .filter((d) => d.score < 45 || d.confidence < 40)
    .map((d) => `${d.departmentId} needs attention (${d.score}/100)`)

  return {
    id: nextId('company-score'),
    generatedAt: new Date().toISOString(),
    overallCompanyScore,
    overallConfidence,
    departmentScores,
    liveKpis,
    risks,
    opportunities,
    blockers,
    limitations
  }
}

export function departmentStatusFromScore(
  departmentId: string,
  departmentScores: DepartmentScore[],
  kpiMap: CompanyKpiMap,
  deptKpiIds: string[]
): CompanyDepartmentStatus {
  const score = departmentScores.find((d) => d.departmentId === departmentId)
  if (!score) return 'unavailable'
  const kpis = deptKpiIds.map((id) => kpiMap[id]).filter((k): k is CompanyKpi => Boolean(k))
  return deriveDepartmentStatus(score.score, score.confidence, kpiUnavailableCount(kpis))
}

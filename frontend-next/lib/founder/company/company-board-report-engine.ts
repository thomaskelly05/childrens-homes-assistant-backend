/**
 * Board report generation from live data and approved forecasts only.
 */

import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { getApprovedRevenueForecasts } from '@/lib/founder/revenue/revenue-store'
import { REVENUE_FORECAST_DISCLAIMER } from '@/lib/founder/revenue/revenue-types'
import type { CompanyBoardReport, CompanyBoardReportSection, CompanyKpi } from './company-types'
import type { CompanyKpiMap } from './company-live-kpi-builder'
import { formatMetricDisplay } from './live-data-guard'
import { buildCompanyScorecard } from './company-score-engine'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'

function section(
  title: string,
  body: string,
  sourceStatus: CompanyBoardReportSection['sourceStatus'] = 'live',
  limitations: string[] = []
): CompanyBoardReportSection {
  return { id: nextId('board-section'), title, body, sourceStatus, limitations }
}

function kpiLine(kpi: CompanyKpi | undefined): string {
  if (!kpi) return 'Unavailable — source not connected.'
  const display = formatMetricDisplay({
    value: kpi.value,
    source: kpi.dataSource,
    sourceStatus: kpi.sourceStatus,
    lastUpdated: kpi.lastUpdated,
    limitation: kpi.limitation
  })
  const status =
    kpi.sourceStatus === 'forecast' ? '(forecast assumption)' : kpi.sourceStatus === 'unavailable' ? '(unavailable)' : '(live)'
  return `${kpi.name}: ${display} ${status}`
}

export function generateCompanyBoardReport(
  kpiMap: CompanyKpiMap,
  limitations: string[],
  options?: { actor?: string; writeAudit?: boolean }
): CompanyBoardReport {
  const actor = options?.actor ?? 'founder-company'
  const scorecard = buildCompanyScorecard(kpiMap, limitations)
  const now = new Date()
  const periodEnd = now.toISOString()
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const approvedForecasts = getApprovedRevenueForecasts()

  const liveMetrics = [
    kpiMap['active-users'],
    kpiMap['orb-conversations'],
    kpiMap['mrr'],
    kpiMap['ai-cost'],
    kpiMap['quality-lab-pass-rate'],
    kpiMap['evidence-packs-approved'],
    kpiMap['provider-relationships']
  ].filter((k): k is CompanyKpi => Boolean(k))

  const forecastMetrics: CompanyKpi[] = approvedForecasts.slice(0, 2).map((f) => ({
    id: `forecast-${f.id}`,
    name: `Forecast MRR (${f.scenario})`,
    value: f.projectedMRR,
    unit: 'GBP',
    sourceStatus: 'forecast' as const,
    dataSource: 'Approved Revenue Forecast',
    lastUpdated: f.createdAt,
    limitation: REVENUE_FORECAST_DISCLAIMER
  }))

  const reportLimitations = [
    ...limitations,
    'External use requires Thomas approval (company-board-report).',
    'Forecasts are modelled assumptions, not live results.',
    'No fabricated traction, revenue or provider interest.'
  ]

  const sections: CompanyBoardReportSection[] = [
    section(
      'Executive summary',
      `Company score: ${scorecard.overallCompanyScore}/100 (confidence ${scorecard.overallConfidence}%). ${scorecard.blockers.length > 0 ? `Blockers: ${scorecard.blockers.join('; ')}.` : 'No major blockers from connected data.'}`,
      'mixed',
      scorecard.limitations
    ),
    section(
      'Product progress',
      [
        kpiLine(kpiMap['orb-conversations']),
        kpiLine(kpiMap['dictate-sessions']),
        kpiLine(kpiMap['report-generations']),
        kpiLine(kpiMap['build-briefs-completed'])
      ].join('\n'),
      kpiMap['orb-conversations']?.sourceStatus === 'live' ? 'live' : 'unavailable'
    ),
    section(
      'Live usage',
      [kpiLine(kpiMap['active-users']), kpiLine(kpiMap['feature-usage'])].join('\n'),
      kpiMap['active-users']?.sourceStatus === 'live' ? 'live' : 'unavailable'
    ),
    section(
      'Revenue status',
      [kpiLine(kpiMap['mrr']), kpiLine(kpiMap['arr']), kpiLine(kpiMap['paid-users'])].join('\n'),
      kpiMap['mrr']?.sourceStatus === 'live' ? 'live' : 'unavailable',
      kpiMap['mrr']?.sourceStatus === 'unavailable' ? ['Live MRR unavailable — do not quote revenue externally'] : []
    ),
    section(
      'AI cost and margin',
      [kpiLine(kpiMap['ai-cost']), kpiLine(kpiMap['cost-per-conversation']), kpiLine(kpiMap['gross-margin'])].join('\n'),
      kpiMap['ai-cost']?.sourceStatus === 'live' ? 'live' : 'unavailable'
    ),
    section(
      'Relationship pipeline',
      [
        kpiLine(kpiMap['provider-relationships']),
        kpiLine(kpiMap['pilot-opportunities']),
        kpiLine(kpiMap['follow-ups-due'])
      ].join('\n'),
      'live'
    ),
    section(
      'Evidence readiness',
      [kpiLine(kpiMap['evidence-packs-generated']), kpiLine(kpiMap['evidence-packs-approved'])].join('\n'),
      'live'
    ),
    section(
      'Quality and Ofsted readiness',
      [kpiLine(kpiMap['quality-lab-pass-rate']), kpiLine(kpiMap['ofsted-readiness-status'])].join('\n'),
      kpiMap['quality-lab-pass-rate']?.sourceStatus === 'live' ? 'live' : 'unavailable'
    ),
    section(
      'Key risks',
      scorecard.risks.length > 0 ? scorecard.risks.join('\n') : 'No risks flagged from connected data.',
      'mixed'
    ),
    section(
      'Decisions required',
      scorecard.departmentScores
        .filter((d) => d.score < 55)
        .map((d) => `${d.departmentId}: ${d.recommendations[0] ?? d.reason}`)
        .join('\n') || 'No urgent decisions from scorecard.',
      'live'
    ),
    section(
      'Next month priorities',
      scorecard.opportunities.join('\n') || 'Connect more live sources to identify opportunities.',
      'mixed'
    ),
    section(
      'Limitations',
      reportLimitations.join('\n'),
      'mixed',
      reportLimitations
    )
  ]

  const report: CompanyBoardReport = {
    id: nextId('board-report'),
    periodStart,
    periodEnd,
    title: `IndiCare Intelligence — Monthly Board Report`,
    status: 'draft',
    sections,
    liveMetrics,
    forecasts: forecastMetrics,
    limitations: [...new Set(reportLimitations)],
    createdAt: now.toISOString()
  }

  const approvalBody = sections.map((s) => `## ${s.title}\n${s.body}`).join('\n\n')
  const approval = createApprovalItem({
    type: 'company-board-report',
    title: report.title,
    content: approvalBody,
    requestedByAgent: 'founder-company-board-report',
    riskLevel: 'high',
    safetyCheck: 'Board report contains revenue and traction claims — external use requires Thomas approval.'
  })
  report.approvalId = approval.id
  report.status = 'needs-review'

  if (options?.writeAudit !== false) {
    void appendAuditLog({
      actor,
      eventType: 'created',
      entityType: 'approval',
      entityId: approval.id,
      summary: `Company board report generated (${report.id}) — approval ${approval.id}`,
      metadata: { reportId: report.id, overallScore: scorecard.overallCompanyScore },
      linkedEntityId: report.id,
      linkedEntityType: 'approval'
    })
  }

  return report
}

export function boardReportExternalCopyBlocked(report: CompanyBoardReport): string {
  if (report.status === 'approved') return ''
  return 'External copy blocked — board report requires Thomas approval (company-board-report) before sharing.'
}

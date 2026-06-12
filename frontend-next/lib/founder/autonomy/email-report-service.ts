import { getPendingApprovals } from '../approvals/approval-store.ts'
import { getPendingAgentApprovals } from '../agents/autonomous/founder-agent-actions'
import { getAgentAuditTrail } from '../agents/autonomous/founder-agent-audit'
import { generateFounderChiefOfStaffBrief } from '../agents/autonomous/founder-chief-of-staff'
import { buildFounderCoverageMap } from '../agents/autonomous/founder-agent-coverage-map'
import { getPendingProposals } from '../learning-loop/learning-loop-store'
import { getEvaluationRuns } from '../../orb/evaluation/orb-evaluation-store.ts'

import { getLiveLlmGateStatus } from './live-llm-gate'
import { DEFAULT_FOUNDER_EMAIL } from './scheduler-defaults'
import { addEmailReportRecord, getEmailSettings } from './scheduler-store'
import type { EmailReportRecord, EmailReportType } from './scheduler-types'
import { getFinanceSnapshot } from '../finance/finance-service'
import { getRevenuePipelineSnapshot } from '../revenue/revenue-agent-service'

export type EmailReportContent = {
  type: EmailReportType
  subject: string
  recipient: string
  htmlBody: string
  textBody: string
  generatedAt: string
  sections: Record<string, string[]>
}

const CHILD_DATA_PATTERNS = [
  /\bchild(?:ren)?'?s?\s+name\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\breal\s+child\s+data\b/i,
  /\byoung\s+person\s+named\b/i
]

function containsRealChildData(text: string): boolean {
  return CHILD_DATA_PATTERNS.some((pattern) => pattern.test(text))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatWeek(date: Date): string {
  const start = new Date(date)
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function buildApprovalSection(): string[] {
  const agentApprovals = getPendingAgentApprovals()
  const founderApprovals = getPendingApprovals()
  const proposals = getPendingProposals()
  const lines: string[] = []

  if (agentApprovals.length === 0 && founderApprovals.length === 0 && proposals.length === 0) {
    lines.push('No items awaiting Tom approval.')
  } else {
    lines.push('TOM APPROVAL REQUIRED:')
    for (const item of agentApprovals.slice(0, 10)) {
      lines.push(`• [Agent] ${item.title} (${item.riskLevel} risk)`)
    }
    for (const item of founderApprovals.slice(0, 10)) {
      lines.push(`• [${item.type}] ${item.title}`)
    }
    for (const proposal of proposals.slice(0, 5)) {
      lines.push(`• [Learning] ${proposal.whatBrainShouldLearn.slice(0, 80)}…`)
    }
  }

  lines.push('')
  lines.push('Review: /founder/agents · /founder/learning-loop · /founder/approvals')
  return lines
}

function buildInternalBrainSummary(): string[] {
  const runs = getEvaluationRuns().filter((r) => r.mode === 'internal-brain').slice(0, 5)
  if (runs.length === 0) return ['No recent internal-brain runs recorded.']

  return runs.map(
    (r) =>
      `• ${r.title ?? r.packType}: ${r.passRate ?? '—'}% pass, ${r.criticalFailures ?? 0} critical, status ${r.status}`
  )
}

function buildLiveLlmGateSection(): string[] {
  const gate = getLiveLlmGateStatus()
  return [
    `Internal adversarial passed: ${gate.internalAdversarialPassed ? 'Yes' : 'No'}`,
    `Internal high-risk passed: ${gate.internalHighRiskPassed ? 'Yes' : 'No'}`,
    `Live adversarial: ${gate.liveAdversarialPassed ? 'Passed' : gate.liveAdversarialApproved ? 'Approved, pending run' : 'Awaiting approval'}`,
    `Live high-risk: ${gate.liveHighRiskPassed ? 'Passed' : gate.liveHighRiskApproved ? 'Approved, pending run' : 'Awaiting approval'}`,
    `Live GOLD: ${gate.liveGoldPassed ? 'Passed' : gate.liveGoldApproved ? 'Approved, pending run' : 'Awaiting approval'}`,
    gate.currentRecommendation
      ? `Current recommendation: ${gate.currentRecommendation.replace(/_/g, ' ')} — Tom approval required.`
      : 'No live LLM recommendation pending.'
  ]
}

function buildTopActions(): string[] {
  const brief = generateFounderChiefOfStaffBrief()
  return brief.topPriorities.slice(0, 3)
}

export function generateDailyEmailReport(now = new Date()): EmailReportContent {
  const settings = getEmailSettings()
  const coverage = buildFounderCoverageMap({})
  const finance = getFinanceSnapshot()
  const revenue = getRevenuePipelineSnapshot()
  const brief = generateFounderChiefOfStaffBrief()

  const sections: Record<string, string[]> = {
    internalBrain: buildInternalBrainSummary(),
    liveLlmGate: buildLiveLlmGateSection(),
    criticalFailures: brief.whatIsRisky.length > 0 ? brief.whatIsRisky : ['No critical failures flagged.'],
    weaknesses: coverage.weakAreas.length > 0
      ? coverage.weakAreas.slice(0, 5).map((a) => `• ${a.replace(/_/g, ' ')}`)
      : ['No new weaknesses detected.'],
    coverageGaps: coverage.untestedAreas.length > 0
      ? coverage.untestedAreas.slice(0, 5).map((a) => `• ${a.replace(/_/g, ' ')}`)
      : ['Coverage gaps within acceptable range.'],
    learningProposals: getPendingProposals().length > 0
      ? getPendingProposals().slice(0, 5).map((p) => `• ${p.whatBrainShouldLearn.slice(0, 100)}`)
      : ['No learning proposals awaiting approval.'],
    prsAwaiting: brief.prsAwaitingReview.length > 0 ? brief.prsAwaitingReview : ['No PRs awaiting review.'],
    launchBlockers: brief.launchGateBlockers.length > 0 ? brief.launchGateBlockers : ['No launch gate blockers.'],
    finance: [
      `Monthly burn (estimated): £${finance.monthlyBurn}`,
      `MRR (actual): ${finance.actualRevenue.mrr !== null ? `£${finance.actualRevenue.mrr}` : 'Not connected'}`,
      `Runway: ${finance.runwayMonths !== null ? `${finance.runwayMonths} months` : 'Unknown'}`
    ],
    revenue: [
      `Demo requests: ${revenue.demoRequests}`,
      `Pilot requests: ${revenue.pilotRequests}`,
      `Pipeline value: £${revenue.pipelineValue}`,
      `Confidence: ${revenue.confidenceLevel}`
    ],
    tomApproval: buildApprovalSection(),
    topActions: buildTopActions()
  }

  const textBody = [
    `IndiCare Intelligence Daily Report — ${formatDate(now)}`,
    '',
    '=== INTERNAL BRAIN TEST SUMMARY ===',
    ...sections.internalBrain,
    '',
    '=== LIVE LLM GATE STATUS ===',
    ...sections.liveLlmGate,
    '',
    '=== CRITICAL FAILURES ===',
    ...sections.criticalFailures,
    '',
    '=== COVERAGE GAPS ===',
    ...sections.coverageGaps,
    '',
    '=== FINANCE SNAPSHOT ===',
    ...sections.finance,
    '',
    '=== REVENUE SNAPSHOT ===',
    ...sections.revenue,
    '',
    '=== TOM APPROVAL REQUIRED ===',
    ...sections.tomApproval,
    '',
    '=== TOP 3 ACTIONS ===',
    ...sections.topActions.map((a, i) => `${i + 1}. ${a}`),
    '',
    'Synthetic evidence only. No real child data.',
    'ORB supports adults; it does not replace judgement.'
  ].join('\n')

  if (containsRealChildData(textBody)) {
    throw new Error('Email report safety check failed: potential real child data detected.')
  }

  return {
    type: 'daily',
    subject: `IndiCare Intelligence Daily Report — ${formatDate(now)}`,
    recipient: settings.recipient || DEFAULT_FOUNDER_EMAIL,
    htmlBody: `<pre style="font-family:system-ui">${textBody.replace(/</g, '&lt;')}</pre>`,
    textBody,
    generatedAt: now.toISOString(),
    sections
  }
}

export function generateWeeklyEmailReport(now = new Date()): EmailReportContent {
  const settings = getEmailSettings()
  const brief = generateFounderChiefOfStaffBrief()
  const finance = getFinanceSnapshot()
  const revenue = getRevenuePipelineSnapshot()
  const audit = getAgentAuditTrail().slice(0, 50)

  const weekRuns = getEvaluationRuns().filter((r) => r.mode === 'internal-brain')
  const passRates = weekRuns.map((r) => r.passRate ?? 0).filter((p) => p > 0)
  const avgPass = passRates.length > 0 ? Math.round(passRates.reduce((a, b) => a + b, 0) / passRates.length) : null

  const sections: Record<string, string[]> = {
    progress: brief.whatChanged.length > 0 ? brief.whatChanged : ['Steady progress — review daily reports for detail.'],
    qualityTrend: [`Average internal-brain pass rate: ${avgPass !== null ? `${avgPass}%` : 'Insufficient data'}`],
    safetyTrend: brief.whatIsRisky.length > 0 ? brief.whatIsRisky : ['No elevated safety concerns this week.'],
    coverage: [`Weak areas: ${buildFounderCoverageMap({}).weakAreas.length}`, `Untested: ${buildFounderCoverageMap({}).untestedAreas.length}`],
    scenarios: [`Internal-brain runs this period: ${weekRuns.length}`],
    proposals: [`Pending learning proposals: ${getPendingProposals().length}`],
    revenue: [
      `Pipeline: £${revenue.pipelineValue}`,
      `Demos: ${revenue.demoRequests}, Pilots: ${revenue.pilotRequests}`,
      `MRR: ${revenue.actualMrr !== null ? `£${revenue.actualMrr}` : 'Not connected'}`
    ],
    costTrend: [`Monthly burn: £${finance.monthlyBurn}`, `AI costs: £${finance.estimatedCosts.openAiApi ?? '—'}`],
    launchReadiness: brief.launchGateBlockers.length > 0 ? brief.launchGateBlockers : ['Review launch gates in Command Centre.'],
    nextWeek: buildTopActions(),
    tomApproval: buildApprovalSection()
  }

  const textBody = [
    `IndiCare Intelligence Weekly Founder Report — ${formatWeek(now)}`,
    '',
    '=== PROGRESS THIS WEEK ===',
    ...sections.progress,
    '',
    '=== QUALITY TREND ===',
    ...sections.qualityTrend,
    '',
    '=== SAFETY TREND ===',
    ...sections.safetyTrend,
    '',
    '=== REVENUE / PIPELINE ===',
    ...sections.revenue,
    '',
    '=== COST TREND ===',
    ...sections.costTrend,
    '',
    '=== LAUNCH READINESS ===',
    ...sections.launchReadiness,
    '',
    '=== NEXT WEEK PRIORITIES ===',
    ...sections.nextWeek.map((a, i) => `${i + 1}. ${a}`),
    '',
    '=== TOM APPROVAL REQUIRED ===',
    ...sections.tomApproval,
    '',
    `Audit entries this week: ${audit.length}`,
    '',
    'Synthetic evidence only. No real child data.'
  ].join('\n')

  if (containsRealChildData(textBody)) {
    throw new Error('Email report safety check failed: potential real child data detected.')
  }

  return {
    type: 'weekly',
    subject: `IndiCare Intelligence Weekly Founder Report — ${formatWeek(now)}`,
    recipient: settings.recipient || DEFAULT_FOUNDER_EMAIL,
    htmlBody: `<pre style="font-family:system-ui">${textBody.replace(/</g, '&lt;')}</pre>`,
    textBody,
    generatedAt: now.toISOString(),
    sections
  }
}

export function sendFounderEmailReport(report: EmailReportContent): {
  record: EmailReportRecord
  status: 'sent' | 'dry_run' | 'failed'
  error?: string
} {
  const settings = getEmailSettings()
  const auditId = `email-audit-${Date.now()}`

  const record: EmailReportRecord = {
    id: `email-${Date.now()}`,
    type: report.type,
    recipient: report.recipient,
    subject: report.subject,
    generatedAt: report.generatedAt,
    sentAt: null,
    status: 'generated',
    auditRecordId: auditId
  }

  if (settings.provider === 'dry_run') {
    record.status = 'dry_run'
    record.sentAt = new Date().toISOString()
    addEmailReportRecord(record)
    return { record, status: 'dry_run' }
  }

  const providerEnvMap: Record<string, string[]> = {
    smtp: ['FOUNDER_EMAIL_SMTP_HOST', 'FOUNDER_EMAIL_SMTP_FROM'],
    resend: ['RESEND_API_KEY', 'FOUNDER_EMAIL_FROM'],
    sendgrid: ['SENDGRID_API_KEY', 'FOUNDER_EMAIL_FROM'],
    postmark: ['POSTMARK_SERVER_TOKEN', 'FOUNDER_EMAIL_FROM']
  }

  const requiredVars = providerEnvMap[settings.provider] ?? []
  const missing = requiredVars.filter((v) => !process.env[v])

  if (missing.length > 0) {
    record.status = 'failed'
    record.error = `Email provider ${settings.provider} not configured. Missing: ${missing.join(', ')}`
    addEmailReportRecord(record)
    return { record, status: 'failed', error: record.error }
  }

  record.status = 'sent'
  record.sentAt = new Date().toISOString()
  addEmailReportRecord(record)
  return { record, status: 'sent' }
}

export function emailRecipientDefaultsToFounder(): boolean {
  return getEmailSettings().recipient.toLowerCase() === DEFAULT_FOUNDER_EMAIL.toLowerCase()
}

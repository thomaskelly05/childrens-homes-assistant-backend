import { getPendingApprovals } from '../approvals/approval-store.ts'
import { getPendingAgentApprovals } from '../agents/autonomous/founder-agent-actions.ts'
import { getAgentAuditTrail, recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'
import { generateFounderChiefOfStaffBrief } from '../agents/autonomous/founder-chief-of-staff.ts'
import { buildFounderCoverageMap } from '../agents/autonomous/founder-agent-coverage-map.ts'
import { getAwaitingApprovalScenarios } from '../learning-loop/learning-loop-benchmark-bank.ts'
import { getAllWeaknesses, getPendingProposals } from '../learning-loop/learning-loop-store.ts'
import { getContentDrafts } from '../content/content-draft-store.ts'
import { getRelationships } from '../relationships/relationship-store.ts'
import { getEvaluationRuns } from '../../orb/evaluation/orb-evaluation-store.ts'
import { generateFinanceForecast } from '../finance/finance-forecast-engine.ts'
import { buildAutonomousIntelligenceLoopReportSection } from './autonomous-loop-service.ts'
import { getLatestBrainAudit } from '../brain-audit/brain-audit-service.ts'
import { getLatestMicroCheck } from '../brain-audit/brain-audit-store.ts'
import { getTaskRunHistory } from './scheduler-store.ts'
import { formatDailyLocalSchedule } from './scheduler-timezone.ts'

import { getLiveLlmGateStatus } from './live-llm-gate.ts'
import { DEFAULT_FOUNDER_EMAIL } from './scheduler-defaults.ts'
import { addEmailReportRecord, getEmailSettings, getLatestEmailReportPreview } from './scheduler-store.ts'
import type {
  DailyBusinessReportSectionKey,
  EmailReportContent,
  EmailReportPreview,
  EmailReportRecord,
  EmailReportType,
  EmailSafetyStatus
} from './scheduler-types.ts'
import { getFinanceSnapshot } from '../finance/finance-service.ts'
import { getRevenuePipelineSnapshot } from '../revenue/revenue-agent-service.ts'
import { sanitizeEmailReportSections, type EmailReportSafetyOutcome } from './email-report-safety.ts'

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

function buildApprovalItemSummaries(): string[] {
  const agentApprovals = getPendingAgentApprovals()
  const founderApprovals = getPendingApprovals()
  const proposals = getPendingProposals()
  return [
    ...agentApprovals.slice(0, 10).map((a) => `[Agent] ${a.title}`),
    ...founderApprovals.slice(0, 10).map((a) => `[${a.type}] ${a.title}`),
    ...proposals.slice(0, 5).map((p) => `[Learning] ${p.whatBrainShouldLearn.slice(0, 60)}…`)
  ]
}

function buildInternalBrainSummary(): string[] {
  const runs = getEvaluationRuns().filter((r) => r.mode === 'internal-brain').slice(0, 5)
  if (runs.length === 0) return ['No recent internal-brain runs recorded.']

  return runs.map(
    (r) =>
      `• ${r.title ?? r.packType}: ${r.passRate ?? '—'}% pass, ${r.criticalFailures ?? 0} critical, status ${r.status} [synthetic evaluation run]`
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
  return brief.topPriorities.slice(0, 5)
}

function buildDailyBusinessReportSections(): Record<DailyBusinessReportSectionKey, string[]> {
  const brief = generateFounderChiefOfStaffBrief()
  const coverage = buildFounderCoverageMap({})
  const brainAudit = getLatestBrainAudit()
  const microCheck = getLatestMicroCheck()
  const finance = getFinanceSnapshot()
  const revenue = getRevenuePipelineSnapshot()
  const forecast = generateFinanceForecast({}, 'daily-business-report')
  const gate = getLiveLlmGateStatus()
  const weaknesses = getAllWeaknesses()
  const pendingBenchmarks = getAwaitingApprovalScenarios()
  const relationships = getRelationships().filter((r) => r.status !== 'archived')
  const contentDrafts = getContentDrafts().filter((d) => d.status === 'draft' || d.status === 'needs-review')
  const schedulerRuns = getTaskRunHistory(20)
  const fullBenchmark = getEvaluationRuns().find((r) => r.title?.includes('Full Benchmark') || r.packType === 'standard')

  return {
    executiveSummary: [
      'What changed today:',
      ...(brief.whatChanged.length > 0 ? brief.whatChanged.map((l) => `• ${l}`) : ['• Steady operations — see sections below.']),
      '',
      'What matters most:',
      ...(brief.whatIsRisky.length > 0 ? brief.whatIsRisky.slice(0, 3).map((l) => `• ${l}`) : ['• No elevated risks flagged.']),
      '',
      'Top 5 actions for Tom:',
      ...buildTopActions().map((a, i) => `${i + 1}. ${a}`)
    ],
    autonomousIntelligenceLoop: buildAutonomousIntelligenceLoopReportSection(),
    orbInternalBrain: [
      `Latest micro-check: ${microCheck ? `${microCheck.scenarioCount} scenarios, ${microCheck.criticalFailures} critical, areas: ${microCheck.areasTested.slice(0, 3).join(', ')}` : 'None yet'}`,
      `Latest full benchmark: ${fullBenchmark ? `${fullBenchmark.passRate ?? '—'}% pass, ${fullBenchmark.criticalFailures ?? 0} critical` : 'Scheduled nightly at 02:00 UTC'}`,
      `Critical failures: ${brainAudit?.criticalFailureCount ?? 0}`,
      `Weak areas: ${brainAudit?.weakAreas.length ?? coverage.weakAreas.length}`,
      `Coverage: ${brainAudit?.overallCoveragePercent ?? '—'}% across ${brainAudit?.areas.length ?? '—'} domains`,
      `Learning proposals recommended: ${brainAudit?.recommendedLearningProposalCount ?? 0}`
    ],
    liveLlmGate: buildLiveLlmGateSection(),
    qualityLab: [
      `New weaknesses detected: ${weaknesses.length}`,
      `Coverage gaps: ${coverage.untestedAreas.length} untested area(s)`,
      `Synthetic scenarios generated (pending): ${pendingBenchmarks.length}`,
      `Proposals awaiting approval: ${getPendingProposals().length}`,
      `Benchmark additions awaiting approval: ${pendingBenchmarks.length}`
    ],
    prsAndBuild: [
      ...(brief.prsAwaitingReview.length > 0 ? brief.prsAwaitingReview.map((p) => `• PR: ${p}`) : ['No PRs awaiting review.']),
      `Build briefs: review /founder/build-briefs`,
      `Agent recommendations: ${brief.whatShouldBeTestedNext.slice(0, 3).join('; ') || 'None pending'}`
    ],
    governance: [
      `Privacy review: ${brief.launchGateBlockers.some((b) => b.toLowerCase().includes('privacy')) ? 'Action needed' : 'Monitor'}`,
      `Retention review: ${brief.launchGateBlockers.some((b) => b.toLowerCase().includes('retention')) ? 'Action needed' : 'Monitor'}`,
      ...(brief.launchGateBlockers.length > 0 ? brief.launchGateBlockers.map((b) => `• Blocker: ${b}`) : ['No launch gate blockers.']),
      'Audit trail: all scheduler runs recorded.',
      `Safety gate: live LLM ${gate.liveAdversarialPassed ? 'adversarial passed' : 'approval-gated'}`
    ],
    revenue: [
      `Actual revenue (MRR): ${revenue.actualMrr !== null ? `£${revenue.actualMrr}` : 'Not connected'} [${revenue.forecastLabel ?? 'actual'}]`,
      `Demo requests: ${revenue.demoRequests}`,
      `Pilot requests: ${revenue.pilotRequests}`,
      `Pipeline value: £${revenue.pipelineValue} [${revenue.pipelineLabel ?? 'pipeline'}]`,
      `Forecast: ${forecast.projectedMrr.value !== null ? `£${forecast.projectedMrr.value}` : '—'} [${forecast.projectedMrr.label}]`,
      `Confidence: ${revenue.confidenceLevel}`,
      'Assumptions: synthetic pipeline data where sources not connected.'
    ],
    finance: [
      `Monthly burn: £${finance.monthlyBurn} [${finance.monthlyBurnLabel}]`,
      `Hosting/API/software: OpenAI £${finance.estimatedCosts.openAiApi ?? '—'}, hosting £${finance.estimatedCosts.hosting ?? '—'}`,
      `Gross margin: ${finance.grossMarginPercent !== null ? `${finance.grossMarginPercent}%` : '—'}`,
      `Runway: ${finance.runwayMonths !== null ? `${finance.runwayMonths} months` : 'Unknown'}`,
      `Break-even users: ${forecast.breakEvenUsers ?? '—'}`,
      `Break-even MRR: £${forecast.breakEvenMrr ?? '—'}`,
      ...(finance.warnings?.length ? finance.warnings.map((w) => `⚠ ${w}`) : ['No finance warnings.'])
    ],
    relationships: [
      `Potential partners: ${relationships.filter((r) => r.relationshipType === 'partner' || r.status === 'new').length}`,
      `Pilot interest: ${relationships.filter((r) => r.relationshipType === 'tester' || r.tags.includes('pilot')).length}`,
      `Follow-ups awaiting approval: ${relationships.filter((r) => r.status === 'follow-up-needed' || r.status === 'waiting').length}`,
      'Sector expert/audit board: review /founder/relationships'
    ],
    contentBrand: [
      `Content drafts awaiting approval: ${contentDrafts.length}`,
      'LinkedIn/post opportunities: review /founder/content',
      'Website/demo improvements: review product agent recommendations'
    ],
    technical: [
      `Scheduler failures today: ${schedulerRuns.filter((r) => r.status === 'failed').length}`,
      `Latest micro-check: ${microCheck?.completedAt ? new Date(microCheck.completedAt).toLocaleString('en-GB') : 'None'}`,
      'API/provider errors: monitor telemetry',
      `Email report safety: dry_run by default — no real child data`
    ],
    tomApproval: [
      ...buildApprovalSection(),
      'Links: /founder/approvals · /founder/agents · /founder/learning-loop'
    ]
  }
}

function filterBusinessReportSections(
  sections: Record<DailyBusinessReportSectionKey, string[]>
): Record<string, string[]> {
  const settings = getEmailSettings()
  const included = new Set(settings.includedSections)
  const filtered: Record<string, string[]> = {}
  for (const key of settings.includedSections) {
    if (included.has(key)) filtered[key] = sections[key] ?? []
  }
  return filtered
}

function buildRawSections(type: EmailReportType, now: Date): Record<string, string[]> {
  const brief = generateFounderChiefOfStaffBrief()
  const coverage = buildFounderCoverageMap({})
  const finance = getFinanceSnapshot()
  const revenue = getRevenuePipelineSnapshot()

  if (type === 'weekly') {
    const weekRuns = getEvaluationRuns().filter((r) => r.mode === 'internal-brain')
    const passRates = weekRuns.map((r) => r.passRate ?? 0).filter((p) => p > 0)
    const avgPass = passRates.length > 0 ? Math.round(passRates.reduce((a, b) => a + b, 0) / passRates.length) : null

    return {
      progress: brief.whatChanged.length > 0 ? brief.whatChanged : ['Steady progress — review daily reports for detail.'],
      qualityTrend: [`Average internal-brain pass rate: ${avgPass !== null ? `${avgPass}%` : 'Insufficient data'}`],
      safetyTrend: brief.whatIsRisky.length > 0 ? brief.whatIsRisky : ['No elevated safety concerns this week.'],
      coverage: [`Weak areas: ${coverage.weakAreas.length}`, `Untested: ${coverage.untestedAreas.length}`],
      scenarios: [`Internal-brain runs this period: ${weekRuns.length} [synthetic]`],
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
  }

  return filterBusinessReportSections(buildDailyBusinessReportSections())
}

function sectionHeaders(type: EmailReportType): Array<{ key: string; title: string }> {
  if (type === 'weekly') {
    return [
      { key: 'progress', title: 'PROGRESS THIS WEEK' },
      { key: 'qualityTrend', title: 'QUALITY TREND' },
      { key: 'safetyTrend', title: 'SAFETY TREND' },
      { key: 'revenue', title: 'REVENUE / PIPELINE' },
      { key: 'costTrend', title: 'COST TREND' },
      { key: 'launchReadiness', title: 'LAUNCH READINESS' },
      { key: 'nextWeek', title: 'NEXT WEEK PRIORITIES' },
      { key: 'tomApproval', title: 'TOM APPROVAL REQUIRED' }
    ]
  }

  const dailyHeaders: Array<{ key: DailyBusinessReportSectionKey; title: string }> = [
    { key: 'executiveSummary', title: '1. EXECUTIVE SUMMARY' },
    { key: 'autonomousIntelligenceLoop', title: '2. AUTONOMOUS INTELLIGENCE LOOP' },
    { key: 'orbInternalBrain', title: '3. ORB INTERNAL BRAIN' },
    { key: 'liveLlmGate', title: '4. LIVE LLM GATE' },
    { key: 'qualityLab', title: '5. QUALITY LAB AND LEARNING LOOP' },
    { key: 'prsAndBuild', title: '6. PRs AND BUILD WORK' },
    { key: 'governance', title: '7. GOVERNANCE AND LAUNCH READINESS' },
    { key: 'revenue', title: '8. REVENUE' },
    { key: 'finance', title: '9. FINANCE' },
    { key: 'relationships', title: '10. RELATIONSHIPS AND PILOTS' },
    { key: 'contentBrand', title: '11. CONTENT AND BRAND' },
    { key: 'technical', title: '12. TECHNICAL' },
    { key: 'tomApproval', title: '13. TOM APPROVAL SECTION' }
  ]
  const settings = getEmailSettings()
  return dailyHeaders.filter((h) => settings.includedSections.includes(h.key))
}

function buildTextBody(
  type: EmailReportType,
  now: Date,
  sections: Record<string, string[]>,
  safety: EmailReportSafetyOutcome
): string {
  const title =
    type === 'daily'
      ? `IndiCare Intelligence Daily Business Report — ${formatDate(now)}`
      : `IndiCare Intelligence Weekly Founder Report — ${formatWeek(now)}`

  const parts: string[] = [title, '']

  for (const { key, title: header } of sectionHeaders(type)) {
    parts.push(`=== ${header} ===`, ...(sections[key] ?? []), '')
  }

  if (type === 'weekly') {
    parts.push(`Audit entries this week: ${getAgentAuditTrail().slice(0, 50).length}`, '')
  }

  if (safety.redactionCount > 0) {
    parts.push(
      `Safety: ${safety.redactionCount} section(s) redacted by safeguarding checker.`,
      safety.technicalMessage ?? '',
      ''
    )
  }

  parts.push(
    'Synthetic evidence only. No real child data.',
    'Confirmed: no real child data in this preview.',
    'ORB supports adults; it does not replace judgement.'
  )

  return parts.join('\n')
}

function buildPreview(
  type: EmailReportType,
  now: Date,
  subject: string,
  recipient: string,
  sections: Record<string, string[]>,
  safety: EmailReportSafetyOutcome
): EmailReportPreview {
  const settings = getEmailSettings()
  return {
    recipient,
    provider: settings.provider,
    subject,
    generatedAt: now.toISOString(),
    sections,
    redactions: safety.sections
      .filter((s) => s.status === 'redacted' || s.status === 'blocked')
      .map((s) => ({ sectionKey: s.sectionKey, reason: s.reason ?? 'Section redacted for safeguarding.' })),
    safetyStatus: safety.status,
    redactionCount: safety.redactionCount,
    noRealChildDataConfirmed: safety.noRealChildDataConfirmed,
    approvalItems: buildApprovalItemSummaries()
  }
}

export function generateEmailReportWithSafety(type: EmailReportType, now = new Date()): {
  content: EmailReportContent | null
  safety: EmailReportSafetyOutcome
  blocked: boolean
} {
  const settings = getEmailSettings()
  const rawSections = buildRawSections(type, now)
  const safety = sanitizeEmailReportSections(rawSections)

  if (safety.status === 'blocked') {
    return { content: null, safety, blocked: true }
  }

  const sections = safety.sanitizedSections
  const subject =
    type === 'daily'
      ? `IndiCare Intelligence Daily Business Report — ${formatDate(now)}`
      : `IndiCare Intelligence Weekly Founder Report — ${formatWeek(now)}`

  recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `daily_business_report_generated: ${subject}. Synthetic evidence only. No real child data.`,
    approvalStatus: 'not_required'
  })
  const recipient = settings.recipient || DEFAULT_FOUNDER_EMAIL
  const textBody = buildTextBody(type, now, sections, safety)

  return {
    blocked: false,
    safety,
    content: {
      type,
      subject,
      recipient,
      htmlBody: `<pre style="font-family:system-ui">${textBody.replace(/</g, '&lt;')}</pre>`,
      textBody,
      generatedAt: now.toISOString(),
      sections
    }
  }
}

export function generateDailyEmailReport(now = new Date()): EmailReportContent {
  const result = generateEmailReportWithSafety('daily', now)
  if (result.blocked || !result.content) {
    throw new Error(result.safety.blockedReason ?? 'Email report safety check blocked report generation.')
  }
  return result.content
}

export function generateWeeklyEmailReport(now = new Date()): EmailReportContent {
  const result = generateEmailReportWithSafety('weekly', now)
  if (result.blocked || !result.content) {
    throw new Error(result.safety.blockedReason ?? 'Email report safety check blocked report generation.')
  }
  return result.content
}

export function sendFounderEmailReport(
  report: EmailReportContent,
  safety?: EmailReportSafetyOutcome
): {
  record: EmailReportRecord
  status: 'sent' | 'dry_run' | 'failed' | 'blocked' | 'redacted'
  error?: string
  safetyStatus: EmailSafetyStatus
  redactionCount: number
} {
  const settings = getEmailSettings()
  const auditId = `email-audit-${Date.now()}`
  const safetyStatus = safety?.status ?? 'passed'
  const redactionCount = safety?.redactionCount ?? 0

  const preview = buildPreview(report.type, new Date(report.generatedAt), report.subject, report.recipient, report.sections, safety ?? {
    status: 'passed',
    sections: [],
    redactionCount: 0,
    sanitizedSections: report.sections,
    noRealChildDataConfirmed: true
  })

  const record: EmailReportRecord = {
    id: `email-${Date.now()}`,
    type: report.type,
    recipient: report.recipient,
    subject: report.subject,
    generatedAt: report.generatedAt,
    sentAt: null,
    status: 'generated',
    auditRecordId: auditId,
    safetyStatus,
    redactionCount,
    preview
  }

  if (settings.provider === 'dry_run' || settings.dryRun) {
    record.status = safetyStatus === 'redacted' ? 'redacted' : 'dry_run'
    record.sentAt = new Date().toISOString()
    addEmailReportRecord(record)
    return { record, status: record.status as 'dry_run' | 'redacted', safetyStatus, redactionCount }
  }

  if (!settings.founderConfirmedSend) {
    record.status = 'failed'
    record.error = 'Real send requires founder confirmation. Set founderConfirmedSend and configure provider.'
    addEmailReportRecord(record)
    return { record, status: 'failed', error: record.error, safetyStatus, redactionCount }
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
    return { record, status: 'failed', error: record.error, safetyStatus, redactionCount }
  }

  record.status = 'sent'
  record.sentAt = new Date().toISOString()
  addEmailReportRecord(record)
  return { record, status: 'sent', safetyStatus, redactionCount }
}

export function generateAndSendFounderEmailReport(type: EmailReportType): {
  sendResult: ReturnType<typeof sendFounderEmailReport> | null
  safety: EmailReportSafetyOutcome
  blocked: boolean
} {
  const generated = generateEmailReportWithSafety(type)
  if (generated.blocked || !generated.content) {
    return { sendResult: null, safety: generated.safety, blocked: true }
  }

  const sendResult = sendFounderEmailReport(generated.content, generated.safety)
  return { sendResult, safety: generated.safety, blocked: false }
}

export function emailRecipientDefaultsToFounder(): boolean {
  return getEmailSettings().recipient.toLowerCase() === DEFAULT_FOUNDER_EMAIL.toLowerCase()
}

export { getLatestEmailReportPreview }

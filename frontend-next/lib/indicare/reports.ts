import {
  Incident,
  ReportRecord,
  ReportSection,
  YoungPersonSummary
} from './types'
import {
  fullName,
  getStaffById,
  getYoungPersonById,
  getYoungPersonSummary,
  isOverdue
} from './selectors'

function section(title: string, body: string, evidence: string[] = []): ReportSection {
  return { title, body, evidence }
}

function personLabel(youngPersonId: string) {
  const person = getYoungPersonById(youngPersonId)
  return person ? fullName(person) : 'Young person'
}

function emptySummary(youngPersonId: string): YoungPersonSummary | undefined {
  return getYoungPersonSummary(youngPersonId)
}

export function buildWeeklyCareSummary(youngPersonId: string): ReportSection[] {
  const summary = emptySummary(youngPersonId)
  if (!summary) return []

  return [
    section(
      'Overview',
      `${personLabel(youngPersonId)} remains ${summary.youngPerson.status} with ${summary.youngPerson.riskLevel} risk and ${summary.youngPerson.safeguardingStatus} safeguarding status.`,
      ['young person profile', 'risk overview']
    ),
    section(
      'Daily living and presentation',
      summary.dailyLogs.map((log) => `${log.date}: ${log.presentation}`).join(' ') || 'No daily logs are recorded for this period.',
      summary.dailyLogs.map((log) => log.id)
    ),
    section(
      'Education and routine',
      summary.youngPerson.educationStatus,
      ['education status']
    ),
    section(
      'Health and medication',
      `${summary.youngPerson.healthSummary} Medication records: ${summary.medication.map((record) => record.medicationName).join(', ') || 'none recorded'}.`,
      summary.medication.map((record) => record.id)
    ),
    section(
      'Keywork and young person voice',
      summary.keywork.map((session) => `${session.topic}: "${session.youngPersonVoice}"`).join(' ') || 'No keywork sessions are recorded for this period.',
      summary.keywork.map((session) => session.id)
    ),
    section(
      'Actions for next period',
      [
        ...summary.dailyLogs.flatMap((log) => log.followUpActions),
        ...summary.keywork.flatMap((session) => session.actions)
      ].join('; ') || 'Continue current care plan and routine monitoring.',
      ['daily logs', 'keywork']
    )
  ]
}

export function buildRiskReview(youngPersonId: string): ReportSection[] {
  const summary = emptySummary(youngPersonId)
  if (!summary) return []

  return summary.risks.map((risk) =>
    section(
      `${risk.category} risk`,
      `${risk.description} Current level is ${risk.riskLevel}. Controls: ${risk.controlMeasures.join(', ')}. Review date: ${risk.reviewDate}${isOverdue(risk.reviewDate) ? ' (overdue).' : '.'}`,
      [risk.id]
    )
  )
}

export function buildSafeguardingChronology(youngPersonId: string): ReportSection[] {
  const summary = emptySummary(youngPersonId)
  if (!summary) return []

  return summary.safeguarding.map((event) =>
    section(
      `${event.date} - ${event.concernType}`,
      `${event.description} Action taken: ${event.actionTaken}. Reported to ${event.reportedTo}.`,
      [event.id, ...event.externalAgencies]
    )
  )
}

export function buildOfstedEvidenceOutline(youngPersonId: string): ReportSection[] {
  const summary = emptySummary(youngPersonId)
  const name = personLabel(youngPersonId)

  if (!summary) return []

  return [
    section('Child-centred profile', `${name}'s record includes identity, communication, health and relationship information.`, ['profile']),
    section('Placement planning', 'Placement goals, local authority details and social worker contact should be pulled from the live placement endpoint when available.', []),
    section('Daily recording', `${summary.dailyLogs.length} daily log(s) show routine, presentation and actions.`, summary.dailyLogs.map((log) => log.id)),
    section('Risk management', `${summary.risks.length} risk assessment(s) are linked and review dates are visible.`, summary.risks.map((risk) => risk.id)),
    section('Safeguarding chronology', `${summary.safeguarding.length} safeguarding event(s) are available for chronology review.`, summary.safeguarding.map((event) => event.id)),
    section('Medication and health', `${summary.medication.length} medication record(s) and health summary are present.`, summary.medication.map((record) => record.id)),
    section('Education progress', summary.youngPerson.educationStatus, ['education']),
    section('Young person voice', summary.keywork.map((session) => session.youngPersonVoice).join(' ') || 'Young person voice is captured through daily care records.', summary.keywork.map((session) => session.id)),
    section('Management oversight', `${summary.audit.length} audit event(s) and ${summary.reports.length} report(s) support management oversight.`, [...summary.audit.map((event) => event.id), ...summary.reports.map((report) => report.id)]),
    section('Evidence gaps', 'Review overdue risks, open safeguarding events and any missing appointment outcomes before inspection export.', ['quality check'])
  ]
}

export function buildIncidentSummary(_incidentId: string): ReportSection[] {
  return []
}

export function buildReportDraft(report: ReportRecord) {
  const baseSections =
    report.type.toLowerCase().includes('risk')
      ? buildRiskReview(report.youngPersonId)
      : report.type.toLowerCase().includes('safeguarding')
        ? buildSafeguardingChronology(report.youngPersonId)
        : buildWeeklyCareSummary(report.youngPersonId)

  const generatedBy = getStaffById(report.generatedBy)
  const sections = [
    section(
      'Report purpose',
      `${report.title} covers ${report.dateRangeStart} to ${report.dateRangeEnd}. Generated by ${generatedBy ? fullName(generatedBy) : report.generatedBy}.`,
      [report.id]
    ),
    ...baseSections
  ]

  return {
    report,
    sections
  }
}

export function incidentSummaryForRecord(_incident: Incident): ReportSection[] {
  return []
}
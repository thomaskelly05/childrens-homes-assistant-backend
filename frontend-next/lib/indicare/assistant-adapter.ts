import { indicareData } from './demo-data'
import { getYoungPersonById } from './selectors'
import { createRecordQuestion, answerRecordQuestion } from '@/lib/record-intelligence/mock-answerer'

export type AssistantContext = {
  route?: string
  pageTitle?: string
  selectedYoungPersonId?: string
  visibleRecordSummary?: string
  userRole?: string
}

export function suggestedActionsForContext(context: AssistantContext): string[] {
  const person = context.selectedYoungPersonId
    ? getYoungPersonById(context.selectedYoungPersonId)
    : undefined

  if (person) {
    return [
      `Summarise ${person.preferredName}'s current risks`,
      `Draft a handover for ${person.preferredName}`,
      `Identify missing evidence for ${person.preferredName}`,
      `Suggest next actions for ${person.preferredName}`
    ]
  }

  if (context.route?.includes('reports')) {
    return ['Prepare a LAC review summary with citations', 'Check missing evidence', 'What would Ofsted want to see here?', 'What actions are overdue from Reg 44?']
  }

  if (context.route?.includes('chronology')) {
    return ['Summarise safeguarding concerns in the last 30 days', 'Which incidents link to contact anxiety?', 'What evidence do we have for emotional wellbeing progress?', 'What actions are overdue from Reg 44?']
  }

  if (context.route?.includes('incidents') || context.route?.includes('safeguarding')) {
    return ['Summarise incident themes', 'List safeguarding actions', 'Prepare manager oversight note', 'Check follow-up gaps']
  }

  return ['Summarise today', 'Highlight priority risks', 'Draft shift handover', 'Check overdue actions']
}

export function generateMockAssistantResponse(prompt: string, context: AssistantContext): string {
  const person = context.selectedYoungPersonId
    ? getYoungPersonById(context.selectedYoungPersonId)
    : undefined
  const unread = (indicareData.notifications ?? []).filter((item) => !item.read).length
  const highRisks = (indicareData.youngPeople ?? []).filter((item) => ['high', 'critical'].includes(item.riskLevel)).length
  const route = context.pageTitle || context.route || 'current workspace'

  if (context.route?.includes('chronology') || context.route?.includes('reports') || context.route?.includes('documents')) {
    const cited = answerRecordQuestion(createRecordQuestion(prompt, {
      youngPersonIds: context.selectedYoungPersonId ? [context.selectedYoungPersonId] : undefined,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-13'
    }))
    return [
      `Context: ${route}`,
      `Prompt: ${prompt}`,
      cited.answer,
      `Citations: ${cited.citations.map((citation) => citation.label).join(' ') || 'No matching citations found.'}`,
      'Draft only. Review required before this is used in a record or report.'
    ].join('\n\n')
  }

  if (person) {
    return [
      `Context: ${route}`,
      `Prompt: ${prompt}`,
      `${person.preferredName} is currently recorded as ${person.riskLevel} risk with ${person.safeguardingStatus} safeguarding status.`,
      context.visibleRecordSummary || person.healthSummary,
      'Suggested next step: review linked daily logs, incidents, risk controls and keywork actions before saving a formal note.'
    ].join('\n\n')
  }

  return [
    `Context: ${route}`,
    `Prompt: ${prompt}`,
    `Operational snapshot: ${highRisks} high/critical risk young person record(s), ${unread} unread notification(s), and ${(indicareData.incidents ?? []).length} incident record(s) are available in the current frontend dataset.`,
    `Role lens: ${context.userRole || 'Care team'}.`,
    'Suggested next step: open the linked record, confirm evidence, then ask the live assistant to draft the final care-record wording.'
  ].join('\n\n')
}

import { indicareData } from './demo-data'
import { getYoungPersonById } from './selectors'

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
    return ['Draft report sections', 'Check missing evidence', 'Make wording inspection-ready', 'Summarise overdue reports']
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

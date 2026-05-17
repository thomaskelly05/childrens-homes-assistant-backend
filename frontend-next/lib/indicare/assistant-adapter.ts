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
  const route = context.pageTitle || context.route || 'current workspace'

  if (context.route?.includes('chronology') || context.route?.includes('reports') || context.route?.includes('documents')) {
    const cited = answerRecordQuestion(createRecordQuestion(prompt, {
      youngPersonIds: context.selectedYoungPersonId ? [context.selectedYoungPersonId] : undefined
    }))
    return [
      `Context: ${route}`,
      `Prompt: ${prompt}`,
      cited.answer,
      `Citations: ${cited.citations.map((citation) => citation.label).join(' ') || 'No matching live citations found.'}`,
      'Draft only. Review required before this is used in a record or report.'
    ].join('\n\n')
  }

  return [
    `Context: ${route}`,
    `Prompt: ${prompt}`,
    'No local demo care records are loaded in this build.',
    `Role lens: ${context.userRole || 'Care team'}.`,
    'Suggested next step: use the live assistant endpoint or open a linked live record before drafting formal care-record wording.'
  ].join('\n\n')
}
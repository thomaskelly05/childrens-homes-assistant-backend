import type { AssistantMode } from './types'

const dashboardPrompts = [
  "What are today's highest priorities?",
  'Which actions are overdue?',
  'What evidence gaps need management oversight?',
  'What safeguarding issues need review?'
]

const standalonePrompts = [
  "Summarise the home's safeguarding position this month.",
  'What Reg 44 actions are outstanding?',
  'Prepare a Reg 45 evidence overview.',
  'Which young people have the most evidence gaps?',
  'What would Ofsted likely ask about leadership and management?',
  'Draft a LAC review summary for a selected young person.',
  'Show incidents linked to family time/contact anxiety.',
  'Identify repeated themes in daily records.'
]

export function suggestedPromptsForWorkspace(workspaceType?: string | null, mode?: AssistantMode) {
  if (mode === 'standalone') return standalonePrompts

  switch (workspaceType) {
    case 'young_person':
      return [
        "Summarise this young person's last 7 days with citations.",
        'What has changed since the last review?',
        'What are the current risks and protective factors?',
        'What evidence is missing for the next LAC review?'
      ]
    case 'chronology':
      return [
        'Summarise this chronology.',
        'What patterns do you notice?',
        'Which events link to safeguarding?',
        'Which events should be included in Reg 45?'
      ]
    case 'incident':
    case 'safeguarding':
      return [
        'Summarise this incident.',
        'What follow-up is required?',
        'Does this suggest a risk assessment review?',
        'Is a Reg 40 consideration needed?'
      ]
    case 'regulatory':
      return [
        'What evidence supports SCCIF protection?',
        'What gaps exist for leadership and management?',
        'Prepare a Reg 44 action plan summary.',
        'What is needed for Reg 45?'
      ]
    case 'reports':
      return [
        'Draft this section using cited evidence.',
        'What citations support this claim?',
        'What evidence gaps remain?',
        'Improve this wording professionally.'
      ]
    default:
      return dashboardPrompts
  }
}

/** Section-level ORB assist actions for working document sections. */

export type OrbWriteSectionAssistActionId =
  | 'orb_help'
  | 'more_factual'
  | 'more_therapeutic'
  | 'remove_judgemental'
  | 'add_child_voice'
  | 'summarise'
  | 'what_missing'
  | 'manager_oversight'

export type OrbWriteSectionAssistAction = {
  id: OrbWriteSectionAssistActionId
  label: string
  instruction: string
}

export const ORB_WRITE_SECTION_ASSIST_ACTIONS: OrbWriteSectionAssistAction[] = [
  {
    id: 'orb_help',
    label: 'Ask ORB to help',
    instruction: 'Help complete this section clearly and professionally for adult review.'
  },
  {
    id: 'more_factual',
    label: 'Make this more factual',
    instruction: 'Rewrite to be more factual and observational. Separate facts from interpretation.'
  },
  {
    id: 'more_therapeutic',
    label: 'Make this more therapeutic',
    instruction: 'Rewrite with therapeutic, child-centred language while preserving facts.'
  },
  {
    id: 'remove_judgemental',
    label: 'Remove judgemental wording',
    instruction: 'Remove judgemental or blaming language. Keep professional, neutral wording.'
  },
  {
    id: 'add_child_voice',
    label: 'Add child voice prompts',
    instruction: 'Suggest how to include the child\'s voice or presentation where appropriate.'
  },
  {
    id: 'summarise',
    label: 'Summarise this section',
    instruction: 'Summarise this section concisely for a busy adult reviewer.'
  },
  {
    id: 'what_missing',
    label: 'What may be missing?',
    instruction: 'Identify what may be missing from this section for safe recording and review.'
  },
  {
    id: 'manager_oversight',
    label: 'Manager oversight',
    instruction: 'Add a brief manager oversight note or flag where escalation may be needed.'
  }
]

export function sectionAssistInstruction(actionId: OrbWriteSectionAssistActionId): string {
  return ORB_WRITE_SECTION_ASSIST_ACTIONS.find((a) => a.id === actionId)?.instruction ?? ''
}

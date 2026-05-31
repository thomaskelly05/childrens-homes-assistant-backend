import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export type OrbDictateVoiceCommandAction =
  | 'convert_incident'
  | 'make_professional'
  | 'make_shorter'
  | 'add_child_voice'
  | 'add_manager_oversight'
  | 'add_safeguarding'
  | 'convert_chronology'
  | 'convert_handover'
  | 'create_action_plan'
  | 'save'
  | 'export_pdf'
  | 'copy'
  | 'send_chat'
  | 'what_missing'
  | 'ofsted_ready'

export type OrbDictateVoiceCommand = {
  action: OrbDictateVoiceCommandAction
  label: string
}

const RULES: Array<{ pattern: RegExp; action: OrbDictateVoiceCommandAction; label: string }> = [
  { pattern: /turn this into an incident/i, action: 'convert_incident', label: 'Incident record' },
  { pattern: /create an incident/i, action: 'convert_incident', label: 'Incident record' },
  { pattern: /more professional/i, action: 'make_professional', label: 'More professional' },
  { pattern: /make this shorter|more concise/i, action: 'make_shorter', label: 'Shorter' },
  { pattern: /add child voice/i, action: 'add_child_voice', label: 'Add child voice' },
  { pattern: /add manager oversight/i, action: 'add_manager_oversight', label: 'Add manager oversight' },
  { pattern: /add safeguarding/i, action: 'add_safeguarding', label: 'Add safeguarding' },
  { pattern: /convert.*chronology/i, action: 'convert_chronology', label: 'Chronology entry' },
  { pattern: /convert.*handover/i, action: 'convert_handover', label: 'Handover' },
  { pattern: /action plan/i, action: 'create_action_plan', label: 'Action plan' },
  { pattern: /^save this|save this$/i, action: 'save', label: 'Save' },
  { pattern: /export as pdf|export pdf/i, action: 'export_pdf', label: 'Export PDF' },
  { pattern: /^copy this|copy this$/i, action: 'copy', label: 'Copy' },
  { pattern: /send (this )?to chat/i, action: 'send_chat', label: 'Send to chat' },
  { pattern: /what is missing|what's missing/i, action: 'what_missing', label: 'What is missing?' },
  { pattern: /ofsted ready|make it ofsted/i, action: 'ofsted_ready', label: 'Ofsted ready' },
  {
    pattern: /reflective supervision|supervision note from this/i,
    action: 'make_professional',
    label: 'Supervision note'
  },
  {
    pattern: /manager oversight.*summar/i,
    action: 'add_manager_oversight',
    label: 'Manager oversight summary'
  },
  {
    pattern: /turn this conversation into a note/i,
    action: 'make_professional',
    label: 'Note from conversation'
  }
]

export function parseOrbDictateVoiceCommand(text: string): OrbDictateVoiceCommand | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  for (const rule of RULES) {
    if (rule.pattern.test(trimmed)) {
      return { action: rule.action, label: rule.label }
    }
  }
  return null
}

export function noteTypeForVoiceCommand(action: OrbDictateVoiceCommandAction): OrbDictateNoteType | null {
  switch (action) {
    case 'convert_incident':
      return 'incident_record'
    case 'convert_chronology':
      return 'chronology_entry'
    case 'convert_handover':
      return 'handover_note'
    case 'create_action_plan':
      return 'action_plan'
    default:
      return null
  }
}

export function generateFlagsForVoiceCommand(action: OrbDictateVoiceCommandAction): Partial<{
  include_child_voice: boolean
  include_manager_oversight: boolean
  include_safeguarding: boolean
  include_ofsted_lens: boolean
}> {
  switch (action) {
    case 'add_child_voice':
      return { include_child_voice: true }
    case 'add_manager_oversight':
      return { include_manager_oversight: true }
    case 'add_safeguarding':
      return { include_safeguarding: true }
    case 'ofsted_ready':
      return { include_ofsted_lens: true }
    default:
      return {}
  }
}

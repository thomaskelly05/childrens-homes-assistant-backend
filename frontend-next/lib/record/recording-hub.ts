import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  ClipboardCheck,
  ClipboardPlus,
  FileText,
  GraduationCap,
  HeartPulse,
  Pill,
  ShieldAlert,
  Sparkles,
  UsersRound
} from 'lucide-react'

export type RecordCardId =
  | 'daily-note'
  | 'shift-handover'
  | 'incidents'
  | 'child-voice'
  | 'safeguarding'
  | 'missing'
  | 'medication-health'
  | 'education-update'
  | 'family-contact'
  | 'documents'
  | 'keywork'
  | 'ask-orb'

export type RecordCardSectionId = 'everyday-care' | 'when-something-happens' | 'progress-evidence'

export type RecordCardDefinition = {
  id: RecordCardId
  section: RecordCardSectionId
  title: string
  description: string
  whenToUse: string
  buttonText: string
  icon: LucideIcon
  workflowSegment?: string
  generalHref: string
  orbQuery: string
}

export const RECORD_CARD_SECTIONS: Array<{ id: RecordCardSectionId; title: string; description: string }> = [
  {
    id: 'everyday-care',
    title: 'Everyday care',
    description: 'Routine shift recording, continuity and child-centred notes.'
  },
  {
    id: 'when-something-happens',
    title: 'When something happens',
    description: 'Use when events need clear facts, safeguarding awareness and follow-up.'
  },
  {
    id: 'progress-evidence',
    title: 'Progress and evidence',
    description: 'Education, relationships, documents and reflective ORB support.'
  }
]

export const RECORD_HUB_CARDS: RecordCardDefinition[] = [
  {
    id: 'daily-note',
    section: 'everyday-care',
    title: 'Daily note',
    description: 'A calm record of the child’s day — what happened, what helped and what changed.',
    whenToUse: 'End of shift, after meaningful contact, or when continuity matters for the next adult.',
    buttonText: 'Write daily note',
    icon: ClipboardPlus,
    workflowSegment: 'daily-note',
    generalHref: '/daily-logs',
    orbQuery: 'Help me write a calm, child-centred daily note.'
  },
  {
    id: 'shift-handover',
    section: 'everyday-care',
    title: 'Shift handover',
    description: 'What the next adults need to know — risks, routines, mood and unfinished follow-up.',
    whenToUse: 'Before you leave shift or when handing care to another team.',
    buttonText: 'Start handover',
    icon: ClipboardCheck,
    workflowSegment: 'shift-handover',
    generalHref: '/handover/current',
    orbQuery: 'Help me prepare a clear shift handover for the next adults.'
  },
  {
    id: 'child-voice',
    section: 'everyday-care',
    title: 'Child voice',
    description: 'Wishes, feelings and “you said, we did” — in the child’s words where possible.',
    whenToUse: 'When the child shared something important, made a choice, or showed how they feel.',
    buttonText: 'Record child voice',
    icon: UsersRound,
    workflowSegment: 'child-voice',
    generalHref: '/young-people',
    orbQuery: 'Help me record child voice clearly and respectfully.'
  },
  {
    id: 'keywork',
    section: 'everyday-care',
    title: 'Keywork / direct work',
    description: 'Planned direct work, goals, progress and what you did together.',
    whenToUse: 'After a keywork session, life story work, or targeted support time.',
    buttonText: 'Record keywork',
    icon: BookOpen,
    workflowSegment: 'keywork',
    generalHref: '/keywork',
    orbQuery: 'Help me record keywork and direct work with clear outcomes.'
  },
  {
    id: 'incidents',
    section: 'when-something-happens',
    title: 'Incident',
    description: 'What happened, adult response, harm reduction and repair — factual and calm.',
    whenToUse: 'After distress, conflict, injury, restraint, or any event that needs a formal incident record.',
    buttonText: 'Record incident',
    icon: ShieldAlert,
    workflowSegment: 'incidents',
    generalHref: '/incidents',
    orbQuery: 'Help me record an incident calmly with the facts adults need.'
  },
  {
    id: 'safeguarding',
    section: 'when-something-happens',
    title: 'Safeguarding concern',
    description: 'Threshold questions, external agencies, and concerns that may need safeguarding review.',
    whenToUse: 'When you are worried about harm, exploitation, or need to log a safeguarding pathway.',
    buttonText: 'Record safeguarding',
    icon: ShieldAlert,
    workflowSegment: 'safeguarding',
    generalHref: '/safeguarding',
    orbQuery: 'Help me describe a safeguarding concern without jumping to conclusions.'
  },
  {
    id: 'missing',
    section: 'when-something-happens',
    title: 'Missing episode',
    description: 'Missing from care, return, welfare check and risk review linked to the child journey.',
    whenToUse: 'When a child is missing, away without permission, or has returned and needs documenting.',
    buttonText: 'Record missing episode',
    icon: ShieldAlert,
    workflowSegment: 'missing',
    generalHref: '/chronology',
    orbQuery: 'Help me record a missing episode and return welfare check clearly.'
  },
  {
    id: 'medication-health',
    section: 'when-something-happens',
    title: 'Medication / health',
    description: 'Medication given or declined, health observations, injury or medical follow-up.',
    whenToUse: 'After medication rounds, illness, injury, pain, or health appointments.',
    buttonText: 'Record medication / health',
    icon: Pill,
    workflowSegment: 'medication-record',
    generalHref: '/medication',
    orbQuery: 'Help me record medication or health observations accurately.'
  },
  {
    id: 'education-update',
    section: 'progress-evidence',
    title: 'Education update',
    description: 'School attendance, learning, exclusions, virtual school and education concerns.',
    whenToUse: 'After school contact, education meetings, or when learning or attendance changed.',
    buttonText: 'Record education update',
    icon: GraduationCap,
    workflowSegment: 'education-update',
    generalHref: '/education',
    orbQuery: 'Help me record an education update that links to the child’s progress.'
  },
  {
    id: 'family-contact',
    section: 'progress-evidence',
    title: 'Family time / contact',
    description: 'Family visits, phone calls, relationship moments and contact decisions.',
    whenToUse: 'After family time, important calls, or when contact needs documenting for the chronology.',
    buttonText: 'Record family contact',
    icon: HeartPulse,
    workflowSegment: 'family-contact',
    generalHref: '/chronology',
    orbQuery: 'Help me record family time and contact in a child-centred way.'
  },
  {
    id: 'documents',
    section: 'progress-evidence',
    title: 'Evidence / document',
    description: 'Upload or link documents, photos and evidence that support the child’s record.',
    whenToUse: 'When you have a file, photo, letter or proof that should sit with the child or home record.',
    buttonText: 'Add evidence',
    icon: FileText,
    workflowSegment: 'documents',
    generalHref: '/documents',
    orbQuery: 'What evidence should I attach to this record?'
  },
  {
    id: 'ask-orb',
    section: 'progress-evidence',
    title: 'Ask ORB first',
    description: 'Not sure which record fits? ORB can help you choose and write clearly before you commit.',
    whenToUse: 'When you need reflection, wording help, or are unsure which formal record to use.',
    buttonText: 'Open ORB',
    icon: Sparkles,
    generalHref: '/orb?context=recording',
    orbQuery: 'Help me choose the right record type for what I need to document.'
  }
]

export const RECORD_ORB_PROMPTS = [
  { label: 'Help me choose the right record', query: 'Help me choose the right record type for what happened today.' },
  { label: 'Help me write a daily note', query: 'Help me write a calm, child-centred daily note.' },
  { label: 'Help me record an incident calmly', query: 'Help me record an incident calmly with clear facts and adult response.' },
  { label: 'What needs manager review?', query: 'What in this situation may need manager review or sign-off?' },
  { label: 'What does Ofsted expect in this record?', query: 'What would Ofsted expect to see evidenced in this type of record?' }
] as const

export function resolveRecordChildId(params: {
  child_id?: string
  young_person_id?: string
}): string | undefined {
  const raw = params.child_id || params.young_person_id
  if (!raw?.trim()) return undefined
  return raw.trim()
}

export function recordHubQueryString(options: {
  childId?: string
  childName?: string
  type?: string
}): string {
  const params = new URLSearchParams()
  if (options.childId) params.set('child_id', options.childId)
  if (options.childName) params.set('child_name', options.childName)
  if (options.type) params.set('type', options.type)
  const value = params.toString()
  return value ? `?${value}` : ''
}

export function childWorkflowHref(childId: string, workflowSegment: string, mode: 'new' | 'upload' = 'new') {
  return `/young-people/${encodeURIComponent(childId)}/${workflowSegment}/${mode}`
}

export function recordCardHref(card: RecordCardDefinition, childId?: string): string {
  if (card.id === 'ask-orb') {
    const base = '/orb?context=recording'
    const q = encodeURIComponent(card.orbQuery)
    if (childId) {
      return `${base}&young_person_id=${encodeURIComponent(childId)}&q=${q}`
    }
    return `${base}&q=${q}`
  }

  if (childId && card.workflowSegment) {
    const mode = card.workflowSegment === 'documents' ? 'upload' : 'new'
    return childWorkflowHref(childId, card.workflowSegment, mode)
  }

  if (childId && card.id === 'safeguarding') {
    return `/safeguarding?young_person_id=${encodeURIComponent(childId)}`
  }

  if (childId && card.id === 'documents') {
    return `/documents?young_person_id=${encodeURIComponent(childId)}`
  }

  return card.generalHref
}

export function recordCardOrbHref(card: RecordCardDefinition, childId?: string) {
  const base = '/orb?context=recording'
  const q = encodeURIComponent(card.orbQuery)
  if (childId) return `${base}&young_person_id=${encodeURIComponent(childId)}&q=${q}`
  return `${base}&q=${q}`
}

export function recordOrbPromptHref(query: string, childId?: string) {
  const base = '/orb?context=recording'
  const q = encodeURIComponent(query)
  if (childId) return `${base}&young_person_id=${encodeURIComponent(childId)}&q=${q}`
  return `${base}&q=${q}`
}

export function cardsForSection(sectionId: RecordCardSectionId) {
  return RECORD_HUB_CARDS.filter((card) => card.section === sectionId)
}

export function recordCardById(id: string) {
  return RECORD_HUB_CARDS.find((card) => card.id === id)
}

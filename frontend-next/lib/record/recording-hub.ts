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
  | 'return-conversation'
  | 'physical-intervention'
  | 'injury-body-map'
  | 'medication-health'
  | 'manager-review'
  | 'education-update'
  | 'family-contact'
  | 'documents'
  | 'keywork'
  | 'reg44-evidence'
  | 'reg45-evidence'
  | 'ask-orb'

export type RecordCardSectionId = 'everyday-care' | 'when-something-happens' | 'progress-evidence'

export type RecordAboutContext = 'child' | 'home-shift' | 'staff' | 'not-sure'

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
    id: 'return-conversation',
    section: 'when-something-happens',
    title: 'Return conversation / RHI',
    description: 'Return interview or return conversation after a missing episode — child voice and welfare.',
    whenToUse: 'After return, when offering or completing a return home interview or return conversation.',
    buttonText: 'Record return conversation',
    icon: ShieldAlert,
    workflowSegment: 'missing',
    generalHref: '/record?type=return-conversation',
    orbQuery: 'Help me record a return conversation and the child’s voice after missing.'
  },
  {
    id: 'physical-intervention',
    section: 'when-something-happens',
    title: 'Physical intervention / restraint',
    description: 'De-escalation, intervention, injury checks, debrief and manager review.',
    whenToUse: 'After any physical intervention or restraint — factual, least restrictive, repair-focused.',
    buttonText: 'Record intervention',
    icon: ShieldAlert,
    workflowSegment: 'physical-intervention',
    generalHref: '/record?type=physical-intervention',
    orbQuery: 'Help me record de-escalation, intervention and repair after restraint.'
  },
  {
    id: 'injury-body-map',
    section: 'when-something-happens',
    title: 'Injury / body map note',
    description: 'Injury observations, child explanation, medical advice and follow-up.',
    whenToUse: 'When documenting injuries, body map observations or health concerns needing a clear record.',
    buttonText: 'Record injury / body map',
    icon: Pill,
    workflowSegment: 'body-map',
    generalHref: '/record?type=injury-body-map',
    orbQuery: 'Help me record an injury observation factually with child voice.'
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
    id: 'manager-review',
    section: 'progress-evidence',
    title: 'Manager review',
    description: 'Manager oversight of a record, threshold decision or quality review.',
    whenToUse: 'When signing off, escalating or reviewing safeguarding, restraint, medication error or serious events.',
    buttonText: 'Record manager review',
    icon: ClipboardCheck,
    generalHref: '/intelligence-actions',
    orbQuery: 'What should a manager review note include for this situation?'
  },
  {
    id: 'reg44-evidence',
    section: 'progress-evidence',
    title: 'Reg 44 evidence',
    description: 'Independent visitor findings, provider response and impact for children.',
    whenToUse: 'After Reg 44 visits or when logging oversight evidence for Inspection evidence preparation.',
    buttonText: 'Add Reg 44 evidence',
    icon: FileText,
    workflowSegment: 'reg44-action',
    generalHref: '/record?type=reg44-evidence',
    orbQuery: 'What makes strong Reg 44 evidence for quality of care?'
  },
  {
    id: 'reg45-evidence',
    section: 'progress-evidence',
    title: 'Reg 45 evidence',
    description: 'Quality of care review evidence, gaps and improvement actions.',
    whenToUse: 'When gathering or recording Reg 45 quality of care review evidence.',
    buttonText: 'Add Reg 45 evidence',
    icon: FileText,
    workflowSegment: 'reg45-evidence',
    generalHref: '/record?type=reg45-evidence',
    orbQuery: 'What should Reg 45 evidence demonstrate about quality of care?'
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
    generalHref: '/assistant/orb?mode=record_quality_review&context=recording',
    orbQuery: 'Help me choose the right record type for what I need to document.'
  }
]

/** Cards that should link to a child journey when recording about a specific child. */
export const RECORD_CHILD_REQUIRED_CARD_IDS: RecordCardId[] = [
  'daily-note',
  'child-voice',
  'keywork',
  'incidents',
  'safeguarding',
  'missing',
  'return-conversation',
  'physical-intervention',
  'injury-body-map',
  'medication-health',
  'education-update',
  'family-contact'
]

export type RecordRecommendedItem =
  | { kind: 'card'; cardId: RecordCardId }
  | { kind: 'link'; title: string; description: string; href: string; buttonText: string }

export const RECORD_ABOUT_OPTIONS: Array<{ id: RecordAboutContext; label: string; description: string }> = [
  { id: 'child', label: 'A child', description: 'Daily notes, incidents, child voice and journey-linked records.' },
  { id: 'home-shift', label: 'The home / shift', description: 'Handover, evidence, chronology and home-wide follow-up.' },
  { id: 'staff', label: 'Staff / workforce', description: 'Supervision, training and workforce records.' },
  { id: 'not-sure', label: 'Not sure — ask ORB', description: 'ORB can help you choose the right record type.' }
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

export function resolveRecordAboutContext(value?: string | null, homeId?: string | null): RecordAboutContext {
  const raw = value?.trim()
  if (raw === 'home-shift' || raw === 'home' || raw === 'shift') return 'home-shift'
  if (raw === 'staff' || raw === 'workforce') return 'staff'
  if (raw === 'not-sure' || raw === 'unsure' || raw === 'orb') return 'not-sure'
  if (raw === 'child') return 'child'
  if (homeId?.trim()) return 'home-shift'
  return 'child'
}

export function recordHubQueryString(options: {
  childId?: string
  childName?: string
  type?: string
  about?: RecordAboutContext
  draftId?: string
}): string {
  const params = new URLSearchParams()
  if (options.about) params.set('about', options.about)
  if (options.childId) params.set('child_id', options.childId)
  if (options.childName) params.set('child_name', options.childName)
  if (options.type) params.set('type', options.type)
  if (options.draftId) params.set('draft_id', options.draftId)
  const value = params.toString()
  return value ? `?${value}` : ''
}

export function childWorkflowHref(childId: string, workflowSegment: string, mode: 'new' | 'upload' = 'new') {
  return `/young-people/${encodeURIComponent(childId)}/${workflowSegment}/${mode}`
}

export function recordCardNeedsChild(card: RecordCardDefinition): boolean {
  return RECORD_CHILD_REQUIRED_CARD_IDS.includes(card.id)
}

export function recordCardAvailableForContext(card: RecordCardDefinition, about: RecordAboutContext): boolean {
  if (about === 'staff') return card.id === 'ask-orb'
  if (about === 'not-sure' || about === 'child') return true
  if (about === 'home-shift') {
    if (card.id === 'shift-handover' || card.id === 'documents' || card.id === 'ask-orb') return true
    return !recordCardNeedsChild(card)
  }
  return true
}

export function recordCardDeemphasised(card: RecordCardDefinition, about: RecordAboutContext): boolean {
  if (about !== 'home-shift') return false
  return recordCardNeedsChild(card)
}

export function recordRecommendedForContext(
  about: RecordAboutContext,
  childId?: string,
  childLabel?: string
): RecordRecommendedItem[] {
  const childName = childLabel || (childId ? `Young person ${childId}` : undefined)

  if (about === 'child') {
    return [
      { kind: 'card', cardId: 'daily-note' },
      { kind: 'card', cardId: 'child-voice' },
      { kind: 'card', cardId: 'incidents' },
      { kind: 'card', cardId: 'safeguarding' },
      { kind: 'card', cardId: 'missing' },
      { kind: 'card', cardId: 'physical-intervention' },
      {
        kind: 'link',
        title: 'More recording types',
        description: 'Handover, medication, Reg 44/45, manager review and more.',
        href: childId ? `/record?child_id=${encodeURIComponent(childId)}&about=child` : '/record?about=child',
        buttonText: 'Open Record hub'
      }
    ]
  }

  if (about === 'home-shift') {
    return [
      { kind: 'card', cardId: 'shift-handover' },
      { kind: 'card', cardId: 'documents' },
      { kind: 'card', cardId: 'ask-orb' },
      {
        kind: 'link',
        title: 'Chronology',
        description: 'Review and add home-wide timeline entries.',
        href: '/chronology',
        buttonText: 'Open chronology'
      },
      {
        kind: 'link',
        title: 'Actions',
        description: 'Follow-up tasks and operational actions for the home.',
        href: '/actions',
        buttonText: 'Open actions'
      }
    ]
  }

  if (about === 'staff') {
    return [
      {
        kind: 'link',
        title: 'Workforce',
        description: 'Staff records are managed through Workforce.',
        href: '/staff',
        buttonText: 'Open Workforce'
      },
      {
        kind: 'link',
        title: 'Staff supervision',
        description: 'Record or review supervision sessions.',
        href: '/staff/supervision',
        buttonText: 'Supervision'
      },
      {
        kind: 'link',
        title: 'Training / competency',
        description: 'Mandatory training matrix and competency tracking.',
        href: '/staff/training-matrix',
        buttonText: 'Training matrix'
      },
      {
        kind: 'card',
        cardId: 'ask-orb'
      }
    ]
  }

  return [
    {
      kind: 'link',
      title: 'Ask ORB to help choose',
      description: 'ORB can suggest the right record type before you commit.',
      href: recordOrbPromptHref('Help me choose the right record type for what I need to document.', childId),
      buttonText: 'Ask ORB'
    },
    {
      kind: 'link',
      title: 'Open Care Hub',
      description: 'Shift priorities, signals and quick recording from the hub.',
      href: '/command-centre',
      buttonText: 'Care Hub'
    },
    {
      kind: 'link',
      title: 'Choose a child',
      description: childName ? `Currently: ${childName}` : 'Pick who this record is about.',
      href: recordHubQueryString({ about: 'child', type: 'daily-note' }) + '#choose-child',
      buttonText: 'Choose child'
    }
  ]
}

export function recordOrbPromptsForContext(
  about: RecordAboutContext,
  childId?: string,
  childLabel?: string
): Array<{ label: string; query: string }> {
  const name = childLabel || (childId ? `this young person` : undefined)

  if (about === 'home-shift') {
    return [
      { label: 'Help me write a handover', query: 'Help me write a clear shift handover for the next adults.' },
      { label: 'What should staff know before shift?', query: 'What should staff know before the next shift starts?' }
    ]
  }

  if (about === 'staff') {
    return [
      { label: 'Ask ORB about staff support', query: 'What staff support or workforce record should I use in this situation?' },
      { label: 'Help me prepare for supervision', query: 'Help me prepare calmly for a staff supervision session.' },
      { label: 'What training evidence is needed?', query: 'What training or competency evidence should be recorded for staff?' }
    ]
  }

  if (childId && name) {
    return [
      {
        label: `Help me choose the right record for ${name}`,
        query: `Help me choose the right record type for ${name} based on what happened today.`
      },
      {
        label: `Help me write a daily note for ${name}`,
        query: `Help me write a calm, child-centred daily note for ${name}.`
      },
      {
        label: `What needs manager review for ${name}?`,
        query: `What in the situation for ${name} may need manager review or sign-off?`
      }
    ]
  }

  return [
    { label: 'Help me choose the right record', query: 'Help me choose the right record type for what I need to document.' },
    {
      label: 'Should this be an incident or a daily note?',
      query: 'Should this situation be recorded as an incident or a daily note? Help me decide calmly.'
    },
    {
      label: 'What should be recorded after a difficult moment?',
      query: 'What should be recorded after a difficult moment with a child in care?'
    }
  ]
}

export function recordCardHref(card: RecordCardDefinition, childId?: string): string {
  if (card.id === 'ask-orb') {
    return recordCardOperationalOrbHref(card)
  }

  if (card.generalHref.startsWith('/record?')) {
    if (childId) {
      const url = new URL(card.generalHref, 'https://local.invalid')
      url.searchParams.set('child_id', childId)
      url.searchParams.set('about', 'child')
      return `${url.pathname}${url.search}`
    }
    return card.generalHref
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

export function recordCardOrbHref(card: RecordCardDefinition, _childId?: string) {
  return recordCardOperationalOrbHref(card)
}

/** Operational OS ORB for record-quality review — never passes child identifiers in the URL. */
export function recordCardOperationalOrbHref(card: RecordCardDefinition) {
  const q = encodeURIComponent(card.orbQuery)
  return `/assistant/orb?mode=record_quality_review&context=recording&q=${q}`
}

export function recordOrbPromptHref(query: string, _childId?: string) {
  return recordOperationalOrbPromptHref(query)
}

export function recordOperationalOrbPromptHref(query: string) {
  const q = encodeURIComponent(query)
  return `/assistant/orb?mode=record_quality_review&context=recording&q=${q}`
}

export function cardsForSection(sectionId: RecordCardSectionId) {
  return RECORD_HUB_CARDS.filter((card) => card.section === sectionId)
}

export function recordCardById(id: string) {
  return RECORD_HUB_CARDS.find((card) => card.id === id)
}

export function youngPersonDisplayName(person: {
  id: string
  preferredName?: string
  displayName?: string
  firstName?: string
}): string {
  return (
    person.preferredName?.trim() ||
    person.displayName?.trim() ||
    person.firstName?.trim() ||
    `Young Person ${person.id}`
  )
}

export function youngPersonStatusLine(person: {
  placementStatus?: string
  status?: string
  riskLevel?: string
  age?: number | string
}): string {
  const parts: string[] = []
  const placement = person.placementStatus || person.status
  if (placement) parts.push(String(placement))
  if (person.riskLevel) parts.push(`Risk: ${person.riskLevel}`)
  if (person.age !== undefined && person.age !== '') parts.push(`Age ${person.age}`)
  return parts.join(' · ') || 'Profile available'
}

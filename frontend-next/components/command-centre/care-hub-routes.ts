import type { OperationalSignalMetric } from '@/lib/operational/cognition-metrics'

export type CareHubHeroAction = {
  label: string
  description: string
  href: string
  ariaLabel: string
}

export type CareHubMetricDefinition = {
  key: string
  label: string
  href: string
  defaultDetail: string
  zeroDetail?: string
}

export const CARE_HUB_HERO_ACTIONS = (options: {
  selectedYoungPersonId?: string
}): CareHubHeroAction[] => {
  const childId = options.selectedYoungPersonId ? encodeURIComponent(options.selectedYoungPersonId) : null
  const recordHubHref = childId ? `/record?child_id=${childId}` : '/record'
  return [
    {
      label: 'Record something',
      description: 'Choose daily note, incident, safeguarding and more.',
      href: recordHubHref,
      ariaLabel: 'Open record something hub'
    },
    {
      label: 'Start shift handover',
      description: 'Prepare what the next adults need to know.',
      href: childId ? `/young-people/${childId}/shift-handover/new` : '/handover/current',
      ariaLabel: 'Start shift handover'
    },
    {
      label: 'Record daily note',
      description: 'Capture the day and what changed.',
      href: childId ? `/young-people/${childId}/daily-note/new` : '/record?type=daily-note',
      ariaLabel: 'Record daily note'
    },
    {
      label: 'Record incident',
      description: 'Log what happened and adult response.',
      href: childId ? `/young-people/${childId}/incidents/new` : '/record?type=incidents',
      ariaLabel: 'Record incident'
    },
    {
      label: 'Ask ORB',
      description: 'Get help with wording, risk or what to do next.',
      href: '/orb?context=care-hub&q=What should I focus on at the start of this shift?',
      ariaLabel: 'Ask ORB for shift guidance'
    }
  ]
}

export const CARE_HUB_SIGNAL_ROUTES: Record<string, string> = {
  Children: '/young-people',
  Chronology: '/chronology',
  Safeguarding: '/safeguarding',
  'Review queue': '/intelligence-actions'
}

export function signalHref(signal: OperationalSignalMetric): string {
  return CARE_HUB_SIGNAL_ROUTES[signal.label] || '/command-centre'
}

export function signalDisplayDetail(signal: OperationalSignalMetric): string {
  const value = Number(signal.value)
  if (!Number.isFinite(value) || value > 0) return signal.detail || 'Open to review'
  switch (signal.label) {
    case 'Safeguarding':
      return 'No safeguarding alerts visible'
    case 'Review queue':
      return 'No open review queue items found'
    case 'Chronology':
      return 'No chronology markers visible yet'
    case 'Children':
      return 'No children returned in this scope'
    default:
      return signal.detail || 'Open to review'
  }
}

export const CARE_HUB_HOME_METRICS: CareHubMetricDefinition[] = [
  { key: 'children-in-home', label: 'Children in home', href: '/young-people', defaultDetail: 'Young people visible in this home', zeroDetail: 'No children returned in this scope' },
  { key: 'staff-on-shift', label: 'Staff on shift', href: '/staff', defaultDetail: 'Workforce and shift visibility', zeroDetail: 'No staff queue returned' },
  { key: 'recent-incidents', label: 'Recent incidents', href: '/incidents', defaultDetail: 'Incident and distress markers', zeroDetail: 'No incident markers visible today' },
  { key: 'missing-episodes', label: 'Missing episodes', href: '/chronology', defaultDetail: 'Missing or away-from-home markers', zeroDetail: 'No missing markers visible' },
  { key: 'appointments', label: 'Appointments', href: '/appointments', defaultDetail: 'Health, education and meeting markers', zeroDetail: 'No appointment markers visible' },
  { key: 'medication-attention', label: 'Medication attention', href: '/medication', defaultDetail: 'Medication or health follow-up', zeroDetail: 'No medication attention markers visible' },
  { key: 'family-time', label: 'Family time', href: '/chronology', defaultDetail: 'Family contact and relationship records', zeroDetail: 'No family contact markers visible' },
  { key: 'education-concerns', label: 'Education concerns', href: '/education', defaultDetail: 'School and learning markers', zeroDetail: 'No education concern markers visible' },
  { key: 'actions-outstanding', label: 'Actions outstanding', href: '/actions', defaultDetail: 'Open operational actions', zeroDetail: 'No open actions found' },
  { key: 'handover-status', label: 'Handover status', href: '/handover/current', defaultDetail: 'Shift continuity and handover', zeroDetail: 'Handover may still need a check' }
]

export function homeMetricDetail(definition: CareHubMetricDefinition, value: string | number): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (definition.key === 'handover-status') {
    return typeof value === 'string' && value !== '0' ? String(value) : definition.defaultDetail
  }
  if (Number.isFinite(numeric) && numeric === 0 && definition.zeroDetail) return definition.zeroDetail
  return definition.defaultDetail
}

export const CARE_HUB_ORB_PROMPTS = [
  { label: 'What should I check before recording?', query: 'What should I check before recording in the home today?' },
  { label: 'Help me write a daily note', query: 'Help me write a calm, child-centred daily note.' },
  { label: 'What needs manager review?', query: 'What may need manager review from today’s live picture?' },
  { label: 'Summarise this child’s last 24 hours', query: 'Summarise the child’s last 24 hours for handover.' },
  { label: 'What would Ofsted expect here?', query: 'What would Ofsted expect to see evidenced here?' }
] as const

export function orbPromptHref(query: string, context = 'care-hub') {
  return `/orb?context=${encodeURIComponent(context)}&q=${encodeURIComponent(query)}`
}

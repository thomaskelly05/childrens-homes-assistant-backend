import type { OperationalSignalMetric } from '@/lib/operational/cognition-metrics'

export type CareHubHeroAction = {
  label: string
  description: string
  href: string
  ariaLabel: string
}

export type CareHubHeroOrbHint = {
  label: string
  href: string
}

export const CARE_HUB_HERO_ORB_HINTS: Record<string, CareHubHeroOrbHint> = {
  'Record something': {
    label: 'ORB can help decide what to record',
    href: '/assistant/orb?context=care-hub&q=What should I record next on shift?'
  },
  'Record daily note': {
    label: 'ORB can help with wording',
    href: '/assistant/orb?context=care-hub&q=Help me write a calm, child-centred daily note.'
  },
  'Record incident': {
    label: 'ORB can check recording quality',
    href: '/assistant/orb?mode=record_quality_review&context=care-hub'
  },
  'Safeguarding concern': {
    label: 'ORB can help with safeguarding wording',
    href: '/assistant/orb?mode=record_quality_review&context=care-hub&q=What must be escalated to a manager in a safeguarding concern?'
  },
  'Start shift handover': {
    label: 'ORB can summarise handover',
    href: '/assistant/orb?context=care-hub&q=Help me summarise shift handover for the next team.'
  },
  'Ask ORB': {
    label: 'Open operational ORB',
    href: '/assistant/orb?context=care-hub'
  }
}

export type CareHubAttentionItem = {
  label: string
  count: number | string
  status: string
  statusTone: string
  reason: string
  href: string
  orbHint: string
  orbHref: string
}

export function buildCareHubAttentionItems(params: {
  reviewQueue: number
  safeguarding: number
  recordQualityMarkers: number
  actionsOutstanding: number
  missingEpisodes: number
  recentIncidents: number
}): CareHubAttentionItem[] {
  const reviewStatus = params.reviewQueue > 0 ? 'Review' : 'Clear'
  const safeguardingStatus = params.safeguarding > 0 ? 'Active' : 'Clear'
  const recordStatus = params.recordQualityMarkers > 0 ? 'Check' : 'OK'
  const actionsStatus = params.actionsOutstanding > 0 ? 'Open' : 'Clear'
  const missingStatus = params.missingEpisodes > 0 ? 'Alert' : 'Clear'
  const incidentStatus = params.recentIncidents > 0 ? 'Visible' : 'None'

  return [
    {
      label: 'Manager review',
      count: params.reviewQueue,
      status: reviewStatus,
      statusTone: params.reviewQueue > 0 ? 'bg-purple-100 text-purple-800' : 'bg-emerald-50 text-emerald-700',
      reason: params.reviewQueue > 0 ? 'Items in the review queue need manager attention' : 'No open review queue items found',
      href: '/intelligence-actions',
      orbHint: 'Ask ORB to summarise',
      orbHref: '/assistant/orb?context=care-hub&q=Summarise what needs manager review today.'
    },
    {
      label: 'Safeguarding signals',
      count: params.safeguarding,
      status: safeguardingStatus,
      statusTone: params.safeguarding > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-700',
      reason: params.safeguarding > 0 ? 'Safeguarding records visible in this scope' : 'No safeguarding alerts visible',
      href: '/safeguarding',
      orbHint: 'Review with ORB',
      orbHref: '/assistant/orb?context=care-hub&q=What safeguarding themes need calm review?'
    },
    {
      label: 'Record quality',
      count: params.recordQualityMarkers,
      status: recordStatus,
      statusTone: params.recordQualityMarkers > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600',
      reason: params.recordQualityMarkers > 0 ? 'Chronology markers may need recording follow-up' : 'No record-quality markers flagged today',
      href: '/chronology',
      orbHint: 'ORB can check recording quality',
      orbHref: '/assistant/orb?mode=record_quality_review&context=care-hub'
    },
    {
      label: 'Actions outstanding',
      count: params.actionsOutstanding,
      status: actionsStatus,
      statusTone: params.actionsOutstanding > 0 ? 'bg-blue-100 text-blue-800' : 'bg-emerald-50 text-emerald-700',
      reason: params.actionsOutstanding > 0 ? 'Follow-up actions still open' : 'No open actions found',
      href: '/actions',
      orbHint: 'Ask ORB what to prioritise',
      orbHref: '/assistant/orb?mode=action_priority&context=care-hub'
    },
    {
      label: 'Missing episodes',
      count: params.missingEpisodes,
      status: missingStatus,
      statusTone: params.missingEpisodes > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-700',
      reason: params.missingEpisodes > 0 ? 'Missing or away-from-home markers in chronology' : 'No missing markers visible',
      href: '/chronology',
      orbHint: 'Ask ORB to summarise',
      orbHref: '/assistant/orb?context=care-hub&q=Summarise missing episode markers from today.'
    },
    {
      label: 'Incidents',
      count: params.recentIncidents,
      status: incidentStatus,
      statusTone: params.recentIncidents > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600',
      reason: params.recentIncidents > 0 ? 'Incident or distress markers in recent chronology' : 'No incident markers visible today',
      href: '/incidents',
      orbHint: 'Create action',
      orbHref: '/assistant/orb?context=care-hub&q=What follow-up actions might be needed after recent incidents?'
    }
  ]
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
  const recordType = (type: string) =>
    childId ? `/record?child_id=${childId}&about=child&type=${encodeURIComponent(type)}` : `/record?type=${encodeURIComponent(type)}`

  return [
    {
      label: 'Record something',
      description: 'Choose daily note, incident, safeguarding and more.',
      href: recordHubHref,
      ariaLabel: 'Open record something hub'
    },
    {
      label: 'Record daily note',
      description: 'Capture the day and what changed.',
      href: childId ? `/young-people/${childId}/daily-note/new` : recordType('daily-note'),
      ariaLabel: 'Record daily note'
    },
    {
      label: 'Record incident',
      description: 'Log what happened and adult response.',
      href: childId ? `/young-people/${childId}/incidents/new` : recordType('incident'),
      ariaLabel: 'Record incident'
    },
    {
      label: 'Safeguarding concern',
      description: 'Record concern, safety action and escalation.',
      href: childId ? `/young-people/${childId}/safeguarding/new` : recordType('safeguarding-concern'),
      ariaLabel: 'Record safeguarding concern'
    },
    {
      label: 'Start shift handover',
      description: 'Prepare what the next adults need to know.',
      href: childId ? `/handover?child_id=${childId}` : '/handover',
      ariaLabel: 'Start shift handover'
    },
    {
      label: 'Ask ORB',
      description: 'Get help with wording, risk or what to do next.',
      href: '/assistant/orb?context=care-hub&q=What should I focus on at the start of this shift?',
      ariaLabel: 'Ask ORB for shift guidance'
    }
  ]
}

export const CARE_HUB_SIGNAL_ROUTES: Record<string, string> = {
  Children: '/young-people',
  Chronology: '/chronology',
  Safeguarding: '/safeguarding',
  'Review queue': '/record/reviews',
  'Recording governance': '/record/governance'
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
  { key: 'handover-status', label: 'Handover status', href: '/handover', defaultDetail: 'Shift continuity and handover', zeroDetail: 'Handover may still need a check' }
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
  return `/assistant/orb?context=${encodeURIComponent(context)}&q=${encodeURIComponent(query)}`
}

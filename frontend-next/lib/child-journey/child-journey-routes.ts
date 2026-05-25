import type { ChildJourneyData } from '@/lib/child-journey/data'

export type ChildJourneyCard = {
  key: string
  label: string
  summary: string
  href: string
  status: string
  statusTone: string
  count?: number
  orbHint: { label: string; href: string }
}

export type ChildJourneyRecordingAction = {
  id: string
  label: string
  description: string
  href: string
  orbHint: { label: string; href: string }
}

export const CHILD_JOURNEY_ORB_PROMPTS = [
  { label: "Summarise this child's last 7 days", query: "Summarise this child's last 7 days." },
  { label: 'What needs recording today?', query: 'What needs recording for this child today?' },
  { label: 'What needs manager review?', query: 'What may need manager review for this child?' },
  { label: 'Help with child-centred wording', query: 'Help me write this record in child-centred language.' }
] as const

export const CHILD_JOURNEY_AREA_LINKS = [
  { label: 'Care & voice', href: (childId: string) => `/young-people/${encodeURIComponent(childId)}/child-voice/new` },
  { label: 'Chronology', href: (childId: string) => `/young-people/${encodeURIComponent(childId)}/chronology` },
  { label: 'Plans', href: (childId: string) => `/young-people/${encodeURIComponent(childId)}/plans` },
  { label: 'Evidence', href: (childId: string) => `/young-people/${encodeURIComponent(childId)}/documents/upload` }
] as const

export function childJourneySummaryHref(childId: string) {
  const params = new URLSearchParams({
    mode: 'child_journey_summary',
    young_person_id: childId,
    scope: 'child'
  })
  return `/assistant/orb?${params.toString()}`
}

export function childJourneyOrbHref(
  childId: string,
  options?: { mode?: string; query?: string }
) {
  const params = new URLSearchParams({
    young_person_id: childId,
    scope: 'child'
  })
  if (options?.mode) params.set('mode', options.mode)
  if (options?.query) params.set('q', options.query)
  return `/assistant/orb?${params.toString()}`
}

export function childJourneyPromptHref(childId: string, query: string) {
  return childJourneyOrbHref(childId, { query })
}

export function childRecordHubHref(childId: string, type?: string) {
  const params = new URLSearchParams({ child_id: childId, about: 'child' })
  if (type) params.set('type', type)
  return `/record?${params.toString()}`
}

function operationalOrbHint(childId: string, label: string, query: string) {
  return {
    label,
    href: childJourneyOrbHref(childId, { mode: 'record_quality_review', query })
  }
}

export function buildChildJourneyRecordingActions(childId: string): ChildJourneyRecordingAction[] {
  const base = encodeURIComponent(childId)
  const record = (type: string) => `/record?child_id=${base}&about=child&type=${encodeURIComponent(type)}`
  return [
    {
      id: 'daily-note',
      label: 'Record daily note',
      description: 'Calm record of the day — what happened, what helped and what changed.',
      href: record('daily-note'),
      orbHint: operationalOrbHint(childId, 'ORB can help make this child-centred', 'Help me write a calm, child-centred daily note.')
    },
    {
      id: 'incident',
      label: 'Record incident',
      description: 'Facts, adult response, harm reduction and repair.',
      href: `/young-people/${base}/incidents/new`,
      orbHint: operationalOrbHint(childId, 'ORB can help record calmly', 'Help me record an incident calmly with clear facts.')
    },
    {
      id: 'safeguarding',
      label: 'Safeguarding concern',
      description: 'Concern, safety action and who was informed.',
      href: `/young-people/${base}/safeguarding/new`,
      orbHint: operationalOrbHint(childId, 'ORB safeguarding help', 'What should be included in a safeguarding concern record?')
    },
    {
      id: 'missing',
      label: 'Missing episode',
      description: 'Missing from care, actions taken and return.',
      href: `/young-people/${base}/missing/new`,
      orbHint: operationalOrbHint(childId, 'ORB can help review', 'What should be recorded about a missing episode?')
    },
    {
      id: 'child-voice',
      label: 'Record child voice',
      description: 'Wishes, feelings and communication in the child’s words.',
      href: `/young-people/${base}/child-voice/new`,
      orbHint: operationalOrbHint(childId, 'ORB can help make this child-centred', 'Help me record child voice clearly and respectfully.')
    },
    {
      id: 'physical-intervention',
      label: 'Physical intervention',
      description: 'De-escalation, restraint, debrief and manager review.',
      href: `/young-people/${base}/physical-intervention/new`,
      orbHint: operationalOrbHint(childId, 'ORB restraint help', 'What should I include after a physical intervention?')
    },
    {
      id: 'all-recording-forms',
      label: 'All child recording forms',
      description: 'Search the full catalogue — safeguarding, health, missing, Reg 44 and more.',
      href: childRecordHubHref(childId),
      orbHint: operationalOrbHint(childId, 'ORB recording coach', 'Help me choose the right record type for this child.')
    },
    {
      id: 'recording-reviews',
      label: 'Recording reviews for this child',
      description: 'Manager or safeguarding review drafts linked to this young person.',
      href: `/record/reviews?child_id=${base}`,
      orbHint: operationalOrbHint(childId, 'ORB review support', 'What needs manager follow-up in recording reviews?')
    },
    {
      id: 'recording-governance',
      label: 'Recording governance for this child',
      description: 'Summary-level oversight of drafts, review backlog and quality flags for this young person.',
      href: `/record/governance?child_id=${base}`,
      orbHint: operationalOrbHint(
        childId,
        'ORB governance summary',
        'Summarise recording governance themes for this child.'
      )
    },
    {
      id: 'recording-alerts',
      label: 'Recording alerts for this child',
      description: 'Follow-up alerts for review needs, privacy flags and recording gaps for this young person.',
      href: `/record/alerts?child_id=${base}`,
      orbHint: operationalOrbHint(
        childId,
        'ORB alert prioritisation',
        'How should I prioritise recording follow-up for this child?'
      )
    },
    {
      id: 'recording-follow-up',
      label: 'Review recording follow-up',
      description: 'Open recording alerts and review queue for outstanding follow-up on this young person.',
      href: `/record/alerts?child_id=${base}`,
      orbHint: operationalOrbHint(
        childId,
        'ORB follow-up review',
        'What recording follow-up needs manager attention for this child?'
      )
    },
    {
      id: 'handover-notes',
      label: 'Handover notes for this child',
      description: 'Prepare shift handover with safe intelligence for this young person.',
      href: `/handover?child_id=${base}`,
      orbHint: operationalOrbHint(
        childId,
        'ORB handover help',
        'What should be handed over for this child on the next shift?'
      )
    },
    {
      id: 'handover-reviews',
      label: 'Handover reviews for this child',
      description: 'Manager review queue for child-scoped handover drafts.',
      href: `/handover/reviews?child_id=${base}`,
      orbHint: operationalOrbHint(
        childId,
        'ORB manager review',
        'Help me prepare a manager review of this handover.'
      )
    },
    {
      id: 'handover-intelligence',
      label: 'Handover intelligence for this child',
      description: 'Metadata-only alerts, reviews and safeguarding themes for handover.',
      href: `/handover?child_id=${base}`,
      orbHint: operationalOrbHint(
        childId,
        'ORB handover themes',
        'What safeguarding-sensitive handover themes apply to this child?'
      )
    }
  ]
}

function cardStatusTone(count: number, warnAt = 1) {
  if (count >= warnAt * 2) return 'bg-rose-100 text-rose-900'
  if (count >= warnAt) return 'bg-amber-100 text-amber-900'
  return 'bg-emerald-100 text-emerald-900'
}

export function buildChildJourneyTodayCards(childId: string, data: ChildJourneyData): ChildJourneyCard[] {
  const latestNote = data.dailyNotes[0]
  const latestEvent = data.timeline[0]
  return [
    {
      key: 'latest-note',
      label: 'Latest daily note',
      summary: latestNote?.summary || 'No daily note visible yet.',
      href: latestNote?.href || childRecordHubHref(childId, 'daily-note'),
      status: latestNote ? 'Recorded' : 'Empty',
      statusTone: latestNote ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700',
      orbHint: operationalOrbHint(childId, 'ORB can help with wording', 'Help me write a calm daily note.')
    },
    {
      key: 'latest-event',
      label: 'Latest chronology',
      summary: latestEvent?.summary || 'No chronology events visible yet.',
      href: latestEvent?.href || `/young-people/${encodeURIComponent(childId)}/chronology`,
      status: latestEvent ? 'Visible' : 'Empty',
      statusTone: latestEvent ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700',
      orbHint: operationalOrbHint(childId, 'ORB can summarise', 'Summarise the latest chronology for this child.')
    },
    {
      key: 'actions-due',
      label: 'Actions due',
      summary: data.actions.length ? `${data.actions.length} open actions visible.` : 'No open actions returned.',
      href: '/actions',
      status: data.actions.length ? 'Open' : 'Clear',
      statusTone: cardStatusTone(data.actions.length),
      count: data.actions.length,
      orbHint: operationalOrbHint(childId, 'ORB can suggest follow-up', 'What follow-up actions might be needed?')
    }
  ]
}

export function buildChildJourneyAttentionItems(childId: string, data: ChildJourneyData): ChildJourneyCard[] {
  const incidentCount = data.timeline.filter((item) => /incident|restraint|harm/i.test(`${item.title} ${item.summary}`)).length
  const missingCount = data.timeline.filter((item) => /missing|abscond/i.test(`${item.title} ${item.summary}`)).length
  const safeguardingCount = data.timeline.filter((item) => /safeguard|concern|allegation/i.test(`${item.title} ${item.summary}`)).length

  return [
    {
      key: 'incidents',
      label: 'Incidents',
      summary: incidentCount ? 'Incident markers visible on the journey.' : 'No incident markers in visible chronology.',
      href: `/young-people/${encodeURIComponent(childId)}/incidents/new`,
      status: incidentCount ? 'Review' : 'Calm',
      statusTone: cardStatusTone(incidentCount),
      count: incidentCount,
      orbHint: operationalOrbHint(childId, 'ORB can help prioritise', 'What incident follow-up needs attention?')
    },
    {
      key: 'missing',
      label: 'Missing episodes',
      summary: missingCount ? 'Missing markers visible — check return welfare.' : 'No missing markers visible.',
      href: `/young-people/${encodeURIComponent(childId)}/missing/new`,
      status: missingCount ? 'Review' : 'Calm',
      statusTone: cardStatusTone(missingCount),
      count: missingCount,
      orbHint: operationalOrbHint(childId, 'ORB can help review', 'What should be recorded about missing episodes?')
    },
    {
      key: 'safeguarding',
      label: 'Safeguarding signals',
      summary: safeguardingCount ? 'Safeguarding-related markers visible.' : 'No safeguarding markers in visible summary.',
      href: `/safeguarding?young_person_id=${encodeURIComponent(childId)}`,
      status: safeguardingCount ? 'Review' : 'Calm',
      statusTone: cardStatusTone(safeguardingCount),
      count: safeguardingCount,
      orbHint: operationalOrbHint(childId, 'ORB can help think', 'What safeguarding follow-up may be needed?')
    },
    {
      key: 'isn-network',
      label: 'Safeguarding network for this child',
      summary: 'Open ISN safeguarding network context for this young person.',
      href: `/safeguarding?young_person_id=${encodeURIComponent(childId)}`,
      status: 'ISN',
      statusTone: 'bg-violet-100 text-violet-900',
      orbHint: operationalOrbHint(
        childId,
        'ORB safeguarding network',
        'What safeguarding network follow-up may need manager review for this child?'
      )
    }
  ]
}

export function buildChildJourneyEvidenceCards(childId: string, data: ChildJourneyData): ChildJourneyCard[] {
  const evidenceCount = data.evidence.length
  const actionsCount = data.actions.length
  return [
    {
      key: 'documents',
      label: 'Documents',
      summary: evidenceCount ? `${evidenceCount} evidence items linked.` : 'No linked evidence returned yet.',
      href: `/young-people/${encodeURIComponent(childId)}/documents/upload`,
      status: evidenceCount ? 'Linked' : 'Gap',
      statusTone: evidenceCount ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900',
      count: evidenceCount,
      orbHint: operationalOrbHint(childId, 'ORB can suggest evidence', 'What evidence should be attached to this journey?')
    },
    {
      key: 'actions',
      label: 'Actions',
      summary: actionsCount ? `${actionsCount} actions on this journey.` : 'No actions returned.',
      href: '/actions',
      status: actionsCount ? 'Open' : 'Clear',
      statusTone: cardStatusTone(actionsCount),
      count: actionsCount,
      orbHint: operationalOrbHint(childId, 'ORB can prioritise', 'Which actions matter most for inspection readiness?')
    },
    {
      key: 'record-hub',
      label: 'Record hub',
      summary: 'Open the recording workspace for this child.',
      href: childRecordHubHref(childId),
      status: 'Ready',
      statusTone: 'bg-blue-100 text-blue-900',
      orbHint: operationalOrbHint(childId, 'ORB recording coach', 'Help me review recording quality before I save.')
    }
  ]
}

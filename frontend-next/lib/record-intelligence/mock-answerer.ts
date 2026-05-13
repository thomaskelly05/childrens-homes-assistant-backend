import {
  filterChronology,
  getActionsFromChronology,
  getChronologyEvents,
  getEvidenceGapsFromChronology,
  getRegulationLinkedEvents,
  getSafeguardingChronology
} from '@/lib/chronology/selectors'
import { ChronologyEvent } from '@/lib/chronology/types'

import { buildRecordCitations } from './citation-builder'
import { RecordAnswer, RecordQuestion, RecordQueryScope } from './types'

function scopedEvents(scope: RecordQueryScope): ChronologyEvent[] {
  const base = scope.eventIds?.length
    ? getChronologyEvents().filter((event) => scope.eventIds?.includes(event.id))
    : getChronologyEvents()

  return filterChronology(base, {
    homeId: scope.homeId,
    youngPersonIds: scope.youngPersonIds,
    dateFrom: scope.dateFrom,
    dateTo: scope.dateTo,
    categories: scope.categories,
    regulation: scope.regulation
  })
}

function eventSentence(event: ChronologyEvent) {
  return `${event.title}: ${event.summary} ${event.citationLabel}`
}

function answerFromEvents(events: ChronologyEvent[], intro: string) {
  if (!events.length) {
    return 'I cannot evidence that from the available chronology records. More source records or a narrower date range may be needed before a professional summary can be drafted.'
  }

  return [intro, ...events.slice(0, 5).map(eventSentence)].join('\n')
}

export function answerRecordQuestion(question: RecordQuestion): RecordAnswer {
  const query = question.question.toLowerCase()
  let events = scopedEvents(question.scope)
  let confidence: RecordAnswer['confidence'] = events.length ? 'medium' : 'low'
  let answer = ''

  if (query.includes('safeguarding') || query.includes('ofsted')) {
    events = getSafeguardingChronology(events)
    answer = answerFromEvents(events, 'Draft safeguarding evidence summary, review required:')
    confidence = events.length >= 2 ? 'high' : confidence
  } else if (query.includes('reg 44') || query.includes('reg44') || query.includes('overdue')) {
    events = getRegulationLinkedEvents(events, 'Regulation 44')
    answer = answerFromEvents(events, 'Draft Reg 44 action and evidence position, review required:')
  } else if (query.includes('reg 45') || query.includes('reg45')) {
    events = getRegulationLinkedEvents(events, 'Regulation 45')
    answer = answerFromEvents(events, 'Draft Reg 45 evidence position, review required:')
  } else if (query.includes('lac')) {
    events = filterChronology(events, { eventTypes: ['lac_review', 'daily_log', 'family_contact', 'positive_outcome'] })
    answer = answerFromEvents(events, 'Draft LAC review summary with source citations, review required:')
  } else if (query.includes('incident') || query.includes('missing') || query.includes('contact anxiety')) {
    events = filterChronology(events, { searchText: query.includes('contact anxiety') ? 'contact anxiety' : 'incident' })
    answer = answerFromEvents(events, 'Draft incident pattern summary, review required:')
  } else if (query.includes('evidence') || query.includes('wellbeing')) {
    events = filterChronology(events, { evidenceOnly: true, searchText: query.includes('wellbeing') ? 'wellbeing' : undefined })
    answer = answerFromEvents(events, 'Evidence found in chronology, review required:')
  } else if (query.includes('changed') || query.includes('this week')) {
    events = filterChronology(events, { dateFrom: question.scope.dateFrom || '2026-05-07', dateTo: question.scope.dateTo || '2026-05-13' })
    answer = answerFromEvents(events, 'Recent changes evidenced this week, review required:')
  } else {
    events = filterChronology(events, { searchText: question.question })
    answer = answerFromEvents(events, 'Draft answer based only on matching chronology records, review required:')
  }

  const relatedActions = getActionsFromChronology(events)
  const evidenceGaps = getEvidenceGapsFromChronology(events)
  if (evidenceGaps.length) {
    answer += `\n\nEvidence gaps: ${evidenceGaps.map((gap) => gap.title).join('; ')}.`
  }
  if (!events.length) confidence = 'low'

  return {
    answer,
    confidence,
    citations: buildRecordCitations(events),
    relatedActions,
    evidenceGaps,
    suggestedFollowUps: [
      'Show the original source records before sharing externally.',
      'Identify actions that need manager review.',
      'Create a draft report section with citations.',
      'List evidence gaps for this theme.'
    ],
    sourceEventIds: events.map((event) => event.id)
  }
}

export function createRecordQuestion(question: string, scope: RecordQueryScope = {}): RecordQuestion {
  return {
    id: `rq-${Date.now()}`,
    question,
    askedAt: new Date('2026-05-13T12:00:00.000Z').toISOString(),
    scope
  }
}

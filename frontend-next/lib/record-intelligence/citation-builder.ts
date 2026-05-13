import { ChronologyEvent } from '@/lib/chronology/types'

import { RecordCitation, RecordEvidenceSnippet } from './types'

export function buildRecordCitation(event: ChronologyEvent): RecordCitation {
  return {
    eventId: event.id,
    label: event.citationLabel,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    excerpt: event.summary
  }
}

export function buildRecordCitations(events: ChronologyEvent[]): RecordCitation[] {
  return events.map(buildRecordCitation)
}

export function buildEvidenceSnippets(events: ChronologyEvent[]): RecordEvidenceSnippet[] {
  return events.map((event) => ({
    eventId: event.id,
    text: event.fullText,
    citationLabel: event.citationLabel
  }))
}

export function appendCitationLabels(answer: string, events: ChronologyEvent[]) {
  const labels = events.map((event) => event.citationLabel).join(' ')
  return labels ? `${answer}\n\nSources: ${labels}` : answer
}

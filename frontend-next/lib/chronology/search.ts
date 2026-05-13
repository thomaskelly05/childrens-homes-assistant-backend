import { ChronologyEvent } from './types'

function normalise(value: string) {
  return value.toLowerCase().trim()
}

export function chronologyEventMatchesSearch(event: ChronologyEvent, searchText: string) {
  const query = normalise(searchText)
  if (!query) return true

  const searchable = [
    event.title,
    event.summary,
    event.fullText,
    event.category,
    event.eventType,
    event.sourceType,
    event.citationLabel,
    ...event.tags,
    ...event.riskFlags,
    ...event.safeguardingFlags,
    ...event.regulationLinks.map((link) => `${link.regulation} ${link.label}`)
  ].join(' ')

  return normalise(searchable).includes(query)
}

export function searchChronology(events: ChronologyEvent[], searchText: string) {
  return events.filter((event) => chronologyEventMatchesSearch(event, searchText))
}

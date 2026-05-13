import { getOpenCareActions, getEvidenceGaps } from '@/lib/evidence/selectors'

import { demoChronologyEvents } from './demo-data'
import { searchChronology } from './search'
import { ChronologyCitation, ChronologyEvent, ChronologyFilter } from './types'

function sortEvents(events: ChronologyEvent[]) {
  return [...events].sort((left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime())
}

function includesAny<T extends string>(values: readonly T[], filterValues?: readonly T[]) {
  return !filterValues?.length || values.some((value) => filterValues.includes(value))
}

export function getChronologyEvents(): ChronologyEvent[] {
  return sortEvents(demoChronologyEvents)
}

export function getChronologyForYoungPerson(id: string): ChronologyEvent[] {
  return getChronologyEvents().filter((event) => event.youngPersonIds.includes(id))
}

export function getChronologyForHome(homeId: string): ChronologyEvent[] {
  return getChronologyEvents().filter((event) => event.homeId === homeId)
}

export function filterChronology(events: ChronologyEvent[], filters: ChronologyFilter): ChronologyEvent[] {
  const fromTime = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime() : undefined
  const toTime = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`).getTime() : undefined

  const filtered = events.filter((event) => {
    const eventTime = new Date(event.dateTime).getTime()
    if (filters.homeId && event.homeId !== filters.homeId) return false
    if (fromTime && eventTime < fromTime) return false
    if (toTime && eventTime > toTime) return false
    if (filters.youngPersonIds?.length && !includesAny(event.youngPersonIds, filters.youngPersonIds)) return false
    if (filters.staffIds?.length && !includesAny(event.staffIds, filters.staffIds)) return false
    if (filters.eventTypes?.length && !filters.eventTypes.includes(event.eventType)) return false
    if (filters.categories?.length && !filters.categories.includes(event.category)) return false
    if (filters.severity?.length && !filters.severity.includes(event.severity)) return false
    if (filters.tags?.length && !includesAny(event.tags, filters.tags)) return false
    if (filters.riskFlags?.length && !includesAny(event.riskFlags, filters.riskFlags)) return false
    if (filters.safeguardingOnly && !event.safeguardingFlags.length && event.category !== 'Safeguarding') return false
    if (filters.evidenceOnly && !event.evidenceIds.length) return false
    if (filters.actionsRequiredOnly && !event.actionIds.length) return false
    if (filters.regulation && !event.regulationLinks.some((link) => link.regulation.toLowerCase().includes(filters.regulation!.toLowerCase()))) return false
    if (filters.sourceType && event.sourceType !== filters.sourceType) return false
    return true
  })

  return filters.searchText ? searchChronology(filtered, filters.searchText) : sortEvents(filtered)
}

export function getChronologyEventById(id: string): ChronologyEvent | undefined {
  return getChronologyEvents().find((event) => event.id === id)
}

export function getChronologyCitationsForAnswer(eventIds: string[]): ChronologyCitation[] {
  return eventIds
    .map((id) => getChronologyEventById(id))
    .filter((event): event is ChronologyEvent => Boolean(event))
    .map((event) => ({
      eventId: event.id,
      label: event.citationLabel,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      dateTime: event.dateTime,
      excerpt: event.summary
    }))
}

export function getEvidenceGapsFromChronology(events: ChronologyEvent[]) {
  const eventIds = new Set(events.map((event) => event.id))
  return getEvidenceGaps().filter((gap) => gap.sourceEventIds.some((eventId) => eventIds.has(eventId)))
}

export function getActionsFromChronology(events: ChronologyEvent[]) {
  const actionIds = new Set(events.flatMap((event) => event.actionIds))
  return getOpenCareActions().filter((action) => actionIds.has(action.id))
}

export function getSafeguardingChronology(events: ChronologyEvent[]) {
  return sortEvents(events.filter((event) => event.safeguardingFlags.length > 0 || event.category === 'Safeguarding'))
}

export function getRegulationLinkedEvents(events: ChronologyEvent[], regulation: string) {
  return sortEvents(events.filter((event) => event.regulationLinks.some((link) => link.regulation.toLowerCase().includes(regulation.toLowerCase()))))
}

import { CitationList } from '@/components/indicare/citations/citation-list'
import type { ChronologyEvent } from '@/lib/chronology/types'

export function WorkspaceCitationsPanel({ events }: { events: ChronologyEvent[] }) {
  return (
    <CitationList
      citations={events.slice(0, 8).map((event) => ({
        label: event.citationLabel,
        href: `/chronology/${encodeURIComponent(event.id)}`,
        sourceDate: new Date(event.dateTime).toLocaleDateString('en-GB'),
        reviewRequired: event.tags.includes('manager-review')
      }))}
    />
  )
}


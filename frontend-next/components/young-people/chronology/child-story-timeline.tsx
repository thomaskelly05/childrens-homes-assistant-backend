import Link from 'next/link'

import { ChronologyStoryEvent } from '@/components/young-people/chronology/chronology-story-event'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState } from '@/components/indicare/ui'
import { fetchChronologyStory } from '@/lib/os-api/child-lifecycle'

export async function ChildStoryTimeline({ childId }: { childId: string }) {
  const result = await fetchChronologyStory(childId)
  const story = result.data
  const sections = story?.sections || []

  return (
    <div data-testid="child-story-timeline" className="space-y-6">
      <LiveDataStatus result={result} />
      {story?.safe_story_summary ? (
        <p className="rounded-[24px] border border-sky-100 bg-sky-50/60 p-5 text-sm leading-7 text-slate-700">
          {story.safe_story_summary}
        </p>
      ) : null}
      {sections.length ? (
        sections.map((section) => (
          <section key={section.label} className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{section.label}</h2>
            {(section.events || []).map((event, index) => (
              <ChronologyStoryEvent
                key={`${section.label}-${index}`}
                event={event as Record<string, unknown>}
                childId={childId}
              />
            ))}
          </section>
        ))
      ) : (
        <EmptyState
          title="Story timeline is empty"
          description="Signed-off records build this child-centred story. Drafts never appear here."
        />
      )}
      <Link href={`/young-people/${childId}/lifeecho`} className="text-sm font-black text-violet-700">
        Open LifeEcho memories →
      </Link>
    </div>
  )
}

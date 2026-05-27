import Link from 'next/link'

import { ChronologyStoryEvent } from '@/components/young-people/chronology/chronology-story-event'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState } from '@/components/indicare/ui'
import { fetchChronologyStory, type ChronologyStoryGap } from '@/lib/os-api/child-lifecycle'

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
      {(story?.story_gaps || []).length > 0 ? (
        <div data-testid="chronology-story-gaps" className="space-y-2 rounded-[24px] border border-amber-200 bg-amber-50/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-900">Story gaps</p>
          {(story.story_gaps || []).map((gap: ChronologyStoryGap) => (
            <div key={gap.label} className="text-sm text-amber-950">
              <p className="font-black">{gap.label}</p>
              <p className="mt-1 text-amber-900/90">{gap.hint}</p>
              {gap.route_hint ? (
                <Link href={gap.route_hint} className="mt-2 inline-block text-xs font-black text-amber-900 underline">
                  Go to archive or recording →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
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
      {!sections.length ? (
        <Link
          href={`/young-people/${childId}/archive`}
          data-testid="chronology-empty-archive-link"
          className="text-sm font-black text-sky-700"
        >
          Open archive or start recording →
        </Link>
      ) : null}
      <Link href={`/young-people/${childId}/lifeecho`} className="text-sm font-black text-violet-700">
        Open LifeEcho memories →
      </Link>
    </div>
  )
}

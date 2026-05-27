import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getHandoverToday } from '@/lib/os-api/connect'

type SearchParams = Promise<{ home_id?: string; child_id?: string }>

export default async function CurrentHandoverPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const homeId = params.home_id
  const childId = params.child_id

  if (homeId || childId) {
    const q = new URLSearchParams()
    if (homeId) q.set('home_id', homeId)
    if (childId) q.set('child_id', childId)
    redirect(`/handover?${q.toString()}`)
  }

  const handoverResult = await getHandoverToday()
  const handover = handoverResult.data
  const handoverItems = handover.items || []

  return (
    <div data-testid="handover-current-page" className="space-y-6">
      <PageHeader
        eyebrow="Handover"
        title="Current handover"
        description="Shift handover timeline without loading the global command centre. Choose a home or child from scope selection for home-scoped intelligence."
        action={
          <Link prefetch={false} href="/handover" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
            Open handover workspace
          </Link>
        }
      />
      <LiveDataStatus result={handoverResult} />

      <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
        For home- or child-scoped handover with recording alerts and ISN, open handover from your home or child workspace — global dashboards are not preloaded here.
      </p>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Handover items" value={handover.summary?.total || 0} detail="Schema-backed handover entries" href="/handover/current" entity={{ entity_type: 'handover' }} />
        <StatCard label="Follow-up" value={handover.summary?.urgent || 0} detail="Choose scope to see actions" href="/select-scope" entity={{ entity_type: 'action' }} />
        <StatCard label="Urgent handover" value={handover.summary?.urgent || 0} detail="Important before shift starts" href="/handover/current" entity={{ entity_type: 'handover' }} />
        <StatCard label="Unacknowledged" value={handover.summary?.unacknowledged || 0} detail="Awaiting acknowledgement" href="/handover/reviews" entity={{ entity_type: 'qa_review' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Timeline" title="Handover timeline" />
          {handoverItems.length ? (
            <RecordTimeline
              items={handoverItems.map((item: Record<string, unknown>) => ({
                id: String(item.id),
                title: String(item.title || item.linked_record_type || 'Handover note'),
                date: String(item.created_at || item.dateTime || ''),
                body: String(item.body || item.summary || 'No summary was returned.'),
                href: item.linked_record_id ? `/chronology/${item.linked_record_id}` : '/select-scope'
              }))}
            />
          ) : (
            <EmptyState
              title="No handover items yet"
              description="Handover entries will appear here when returned by the live service. Use /handover with home_id or child_id for scoped intelligence."
            />
          )}
        </Card>

        <Card>
          <SectionHeader eyebrow="Scoped routes" title="Next steps" description="Open handover with scope for alerts, reviews and safeguarding." />
          <div className="space-y-2 text-sm font-black">
            <Link prefetch={false} href="/select-scope" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 text-slate-800 hover:bg-white">
              Choose home or child
            </Link>
            <Link prefetch={false} href="/handover" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 text-slate-800 hover:bg-white">
              Handover workspace
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}

import Link from 'next/link'

import { Card, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { MobileActionBar } from '@/components/operations/operational-cards'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { currentHandover } from '@/lib/operations/shift-data'

export default function CurrentHandoverPage() {
  const handover = currentHandover()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Handover"
        title="Current handover"
        description="A timeline-led shift handover with linked incidents, safeguarding workflow state, evidence/actions context and management sign-off readiness."
        action={<Link href="/handover/history" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">History</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Handover items" value={handover.items.length} detail="Ready for next shift" href="/handover/current" entity={{ entity_type: 'handover' }} />
        <StatCard label="Follow-up required" value={handover.items.filter((item) => item.requiresFollowUp).length} detail="Needs explicit assignment" href="/actions" entity={{ entity_type: 'action' }} />
        <StatCard label="Safeguarding timeline" value={handover.timeline.filter((item) => item.type.includes('safeguarding')).length} detail="Review required language only" href="/safeguarding" entity={{ entity_type: 'safeguarding_concern' }} />
        <StatCard label="Sign-off state" value="Pending" detail="Manager oversight remains visible" href="/management" entity={{ entity_type: 'qa_review' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Timeline" title="Handover timeline" />
          <RecordTimeline
            items={handover.timeline.map((item) => ({
              id: item.id,
              title: item.title,
              date: 'date' in item && item.date ? new Date(item.date).toLocaleString('en-GB') : 'Review required',
              body: item.details,
              href: item.href
            }))}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Actions" title="Handover actions" />
          <div className="space-y-3">
            {handover.items.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-black text-slate-950">{item.title}</strong>
                  <StatusBadge value={item.priority} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.details}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <MobileActionBar />
      <RapidRecordingDrawer />
    </div>
  )
}

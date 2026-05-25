import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getHomeOperationalBundle } from '@/lib/os-api/bundles'

export default async function HomeWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: homeId } = await params
  const result = await getHomeOperationalBundle(homeId)
  const bundle = result.data
  const home = bundle.home || {}
  if (!home.id && result.source === 'live') notFound()
  const homeName = String(home.name || home.home_name || `Home ${homeId}`)

  return (
    <div data-testid="home-workspace-page" className="space-y-6">
      <header className="rounded-[32px] border border-white/80 bg-white p-8 shadow-xl shadow-slate-950/5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Home workspace</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">{homeName}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Lightweight home operating view. Open handover, children, recording alerts and daily brief from here — global command centre does not load automatically.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <StatusBadge value={`${bundle.operational_pressure?.children_count || 0} children`} />
          <StatusBadge value={`${bundle.operational_pressure?.actions_open || 0} open actions`} />
        </div>
      </header>

      <LiveDataStatus result={result} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Open handover', href: '/handover/current' },
          { label: 'Children list', href: '/young-people' },
          { label: 'Recording alerts', href: `/record/alerts?home_id=${encodeURIComponent(homeId)}` },
          { label: 'Daily brief', href: '/command-centre/briefing' },
          { label: 'Staff on shift', href: '/shifts/current' },
          { label: 'ISN / safeguarding', href: '/safeguarding' },
          { label: 'Inspection readiness', href: '/intelligence/inspection-readiness' }
        ].map((item) => (
          <Link
            key={item.href}
            prefetch={false}
            href={item.href}
            className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm font-black text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
          >
            {item.label}
          </Link>
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <SectionHeader eyebrow="Children needing attention" title="Home-scoped snapshot" />
        <p className="mt-3 text-sm text-slate-600">
          {(bundle.children_needing_attention || []).length
            ? `${bundle.children_needing_attention.length} child record(s) flagged on this home.`
            : 'No priority children returned for this home right now.'}
        </p>
      </section>
    </div>
  )
}

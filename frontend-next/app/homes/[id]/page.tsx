import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { ChronologySurface, ConnectSurface, ContextSurface, HandoverSurface, HomeHeartbeatSurface, NotificationSurface, WorkspaceStack } from '@/components/indicare/operational-surfaces'
import { DataTable, EmptyState, RecordTimeline, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getHomeOperationalBundle, recordTitle, text } from '@/lib/os-api/bundles'

export default async function HomeHeartbeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getHomeOperationalBundle(id)
  const bundle = result.data
  const home = bundle.home || {}
  if (!home.id && result.source === 'live') notFound()
  const homeName = text(home, ['name', 'home_name', 'title'], `Home ${id}`)

  return (
    <WorkspaceStack>
      <HomeHeartbeatSurface>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Homes &gt; {homeName}</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.07em] text-slate-950 md:text-6xl">{homeName}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">A live operational heartbeat for safeguarding pressure, missing follow-up, handover, Connect, inspection actions and recent chronology.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge value={`${bundle.operational_pressure.children_count || 0} children`} />
              <StatusBadge value={`${bundle.operational_pressure.actions_open || 0} open actions`} />
              <StatusBadge value={`${bundle.operational_pressure.safeguarding_open || 0} safeguarding`} />
              <StatusBadge value={`${bundle.operational_pressure.missing_open || 0} missing`} />
            </div>
          </div>
          <Link href="/workspace" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">My workspace</Link>
        </div>
      </HomeHeartbeatSurface>
      <LiveDataStatus result={result} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <ContextSurface>
          <SectionHeader eyebrow="Attention" title="Children needing attention" />
          <DataTable
            headers={['Child', 'Placement', 'Risk']}
            rows={bundle.children_needing_attention.map((child) => [
              <Link key={String(child.id)} href={`/children/${encodeURIComponent(String(child.id))}`} className="font-black text-blue-700">{text(child, ['preferred_name', 'first_name', 'display_name'], 'Young person')}</Link>,
              text(child, ['placement_status', 'status'], 'Not returned'),
              <StatusBadge key={String(child.id)} value={text(child, ['summary_risk_level', 'risk_level'], 'risk not returned')} />
            ])}
            empty={<EmptyState title="No children requiring priority attention returned" description="This section stays empty until real risk, missing, safeguarding or action records indicate attention." />}
          />
        </ContextSurface>

        <ContextSurface>
          <SectionHeader eyebrow="Operational pressure" title="Current state" />
          <dl className="grid gap-3">
            {[
              ['Safeguarding open', bundle.safeguarding.open_count || 0],
              ['Missing follow-up', bundle.missing.open_count || 0],
              ['Actions open', bundle.actions.length],
              ['Reg 44 actions', (bundle.inspection.reg44_open || []).length || 0],
              ['Reg 45 actions', (bundle.inspection.reg45_open || []).length || 0]
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-sm font-black text-slate-600">{label}</dt>
                <dd className="text-lg font-black text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>
        </ContextSurface>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <HandoverSurface status={bundle.handover.status}>
          {bundle.handover.items?.length ? (
            <div className="space-y-3">
              {bundle.handover.items.slice(0, 4).map((item, index) => (
                <article key={String(item.id || index)} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-sm font-black text-slate-950">{recordTitle(item, 'Handover item')}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text(item, ['summary', 'detail', 'body'], 'No detail returned.')}</p>
                </article>
              ))}
            </div>
          ) : <EmptyState title="No handover returned" description="Today’s handover appears only when live handover records exist." />}
        </HandoverSurface>

        <ConnectSurface unread={bundle.connect.unread_count || 0}>
          <EmptyState title={bundle.connect.home_channel ? 'Home channel available' : 'No home channel returned'} description={bundle.connect.home_channel ? recordTitle(bundle.connect.home_channel, 'Home channel') : 'Create a real home channel in Connect to show home communication here.'} />
        </ConnectSurface>

        <NotificationSurface unread={bundle.notifications.unread_count || 0}>
          <EmptyState title={bundle.notifications.items?.length ? `${bundle.notifications.items.length} notifications returned` : 'No unread home notifications'} description="Home notifications are pulled from live notification tables only." />
        </NotificationSurface>
      </section>

      <ChronologySurface description="Recent significant home activity.">
        <RecordTimeline items={bundle.recent_chronology.map((event, index) => ({
          id: String(event.id || index),
          title: recordTitle(event, 'Chronology event'),
          date: String(event.event_datetime || event.created_at || ''),
          body: text(event, ['summary', 'description', 'body'], 'No summary returned.'),
          href: event.id ? `/chronology/${encodeURIComponent(String(event.id))}` : undefined
        }))} />
      </ChronologySurface>
    </WorkspaceStack>
  )
}

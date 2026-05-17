import Link from 'next/link'

import { Card, DataTable, EmptyState, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import type { CareAction } from '@/lib/evidence/types'
import type { AttentionCard, OperationalRecord } from '@/lib/os-api/platform'
import type { OsPersonSummary } from '@/lib/os-api/workspaces'

export function LiveStaffOperationalWorkspace({
  staff,
  children,
  actions,
  attention
}: {
  staff?: OperationalRecord
  children: OsPersonSummary[]
  actions: CareAction[]
  attention: AttentionCard[]
}) {
  const openActions = actions.filter((action) => action.status !== 'completed')
  const priorityChildren = children.filter((child) => ['high', 'critical'].includes(String(child.riskLevel || '').toLowerCase()))
  const recentRecords = attention.filter((item) => item.count > 0)

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visible children" value={children.length} />
        <Metric label="Needs attention" value={recentRecords.length} />
        <Metric label="My open actions" value={openActions.length} />
        <Metric label="Priority children" value={priorityChildren.length} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="bg-gradient-to-br from-white via-blue-50/60 to-white">
          <SectionHeader eyebrow="Adult identity" title={staff?.title || 'My live workspace'} description="This view is derived from the signed-in account and provider-scoped OS records, not a demo staff id." />
          <dl className="grid gap-3 md:grid-cols-2">
            {[
              ['Role', staff?.raw.role || 'Not returned'],
              ['Home', staff?.raw.home_id || 'Not returned'],
              ['Provider', staff?.raw.provider_id || 'Not returned'],
              ['Status', staff?.status || 'active']
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/80 p-4 ring-1 ring-white">
                <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                <dd className="mt-2 text-sm font-black text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <SectionHeader eyebrow="My actions" title="Open follow-up" description="Only actions returned by the backend are shown." />
          <div className="space-y-3">
            {openActions.slice(0, 6).map((action) => (
              <Link key={action.id} href={`/actions/${encodeURIComponent(action.id)}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-black text-slate-950">{action.title}</strong>
                  <StatusBadge value={action.status || 'open'} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description || 'No description was returned for this action.'}</p>
              </Link>
            ))}
            {!openActions.length ? <EmptyState title="No open actions returned" description="The backend did not return open actions for your current account scope." /> : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="My children" title="Children in my visible scope" description="Favourite assignment still needs stored allocation data; until then this table stays provider/home scoped." />
          <DataTable
            headers={['Child', 'Home', 'Status', 'Open']}
            rows={children.slice(0, 8).map((child) => [
              child.preferredName || child.displayName,
              String(child.home_id || child.homeName || 'Not returned'),
              <StatusBadge key="status" value={child.placementStatus || child.status || 'active'} />,
              <Link key="open" href={`/young-people/${encodeURIComponent(child.id)}`} className="font-bold text-blue-700">Open</Link>
            ])}
            empty={<EmptyState title="No children returned" description="No children are visible for your current provider/home scope." />}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Operational awareness" title="What needs review" description="Critical safeguarding and action pressure remains visible even when the workspace is personalised." />
          <div className="space-y-3">
            {attention.slice(0, 6).map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <strong className="text-sm font-black text-slate-950">{item.title}</strong>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </Link>
            ))}
            {!attention.length ? <EmptyState title="No priority queue returned" description="No live attention items are visible for this session." /> : null}
          </div>
        </Card>
      </section>
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <strong className="mt-2 block text-3xl font-black text-slate-950">{value}</strong>
    </Card>
  )
}

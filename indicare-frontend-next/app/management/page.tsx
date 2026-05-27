import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { deriveLifecycleState } from '@/lib/lifecycle/selectors'
import { getOsManagementOversight } from '@/lib/os-api/management'

export default async function ManagementPage() {
  const result = await getOsManagementOversight()
  const data = result.data
  const reviewStatuses = [
    ['draft', 'Staff record still being completed'],
    ['submitted', 'Ready for manager QA'],
    ['reviewed', 'Manager comments added'],
    ['amendment requested', 'Returned to staff with clear request'],
    ['approved', 'Signed off and chronology-linked'],
    ['escalated', 'Safeguarding or leadership escalation active']
  ]
  const qaActions = [
    { label: 'Add QA comment', href: null },
    { label: 'Return for amendment', href: null },
    { label: 'Approve / sign off', href: null },
    { label: 'Escalate safeguarding', href: '/safeguarding' },
    { label: 'Request evidence', href: '/evidence' },
    { label: 'Review chronology links', href: '/chronology' },
    { label: 'Assign follow-up action', href: '/actions' }
  ]
  const lifecycleItems = [
    ...data.escalation_queue.map((item) => deriveLifecycleState({ ...item, status: item.status || 'escalated' }, 'escalation')),
    ...data.review_queue.map((item) => deriveLifecycleState({ ...item, status: item.status || 'in_review' }, 'manager_review')),
    ...data.sign_off_queue.map((item) => deriveLifecycleState({ ...item, status: item.status || 'in_review' }, 'sign_off'))
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Management oversight"
        title="Operational queues, risk indicators and compliance heatmap"
        description="Live oversight cards surface overdue reviews, overdue actions, safeguarding escalations, missing evidence and sign-off work."
        action={<Link href="/actions" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open actions</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-5">
        {Object.entries(data.cards).map(([key, value]) => <StatCard key={key} label={key.replaceAll('_', ' ')} value={value} />)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow="Manager QA" title="Review workflow" description="Managers can comment, return, approve, escalate, request evidence and check chronology/action links without creating isolated review records." />
          <div className="grid gap-3 md:grid-cols-3">
            {reviewStatuses.map(([status, detail]) => (
              <div key={status} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-black capitalize text-slate-950">{status}</p>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="QA actions" title="One-click review actions" />
          <div className="grid gap-2">
            {qaActions.map((action) => (
              action.href ? (
                <Link key={action.label} href={action.href} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">
                  {action.label}
                </Link>
              ) : (
                <div key={action.label} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900" role="note">
                  {action.label}
                  <span className="mt-1 block text-xs font-bold leading-5 text-amber-800">This review action is not live yet. No record will be changed from this control.</span>
                </div>
              )
            ))}
          </div>
        </Card>
      </section>
      <Card>
        <OperationalLifecyclePanel
          title="Oversight lifecycle queue"
          description="Escalations, manager reviews and sign-offs are consolidated as durable lifecycle work."
          items={lifecycleItems}
        />
      </Card>
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Escalations" title="Safeguarding escalation queue" />
          <DataTable
            headers={['Title', 'Source', 'Severity']}
            rows={data.escalation_queue.slice(0, 8).map((item) => [String(item.title || 'Escalation'), String(item.source_type || ''), String(item.severity || '')])}
            empty={<EmptyState title="No escalations" description="No safeguarding escalations are currently visible." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Reviews" title="Manager review queue" />
          <DataTable
            headers={['Title', 'Source', 'Date']}
            rows={data.review_queue.slice(0, 8).map((item) => [String(item.title || 'Review'), String(item.source_type || ''), String(item.date_time || '')])}
            empty={<EmptyState title="No reviews" description="No overdue reviews are currently visible." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Sign-off" title="Sign-off queue" />
          <DataTable
            headers={['Title', 'Status', 'Type']}
            rows={data.sign_off_queue.slice(0, 8).map((item) => [String(item.title || 'Sign-off'), String(item.status || ''), String(item.source_type || item.type || '')])}
            empty={<EmptyState title="No sign-offs" description="No records are currently waiting for sign-off." />}
          />
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <SectionHeader eyebrow="Compliance" title="SCCIF evidence heatmap" />
          <div className="grid gap-3 md:grid-cols-3">
            {data.compliance_heatmap.areas.map((area) => (
              <div key={String(area.key)} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">{String(area.label || area.key)}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">Evidence {String(area.evidence || 0)} · Actions {String(area.actions || 0)} · {String(area.status || 'gap')}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Indicators" title="Operational QA indicators" description="Overdue reviews, weak records, evidence gaps and repeated recording concerns remain visible." />
          <div className="space-y-3">
            {[...data.risk_indicators, { key: 'weak_records', label: 'Weak-record indicators', count: data.review_queue.length }, { key: 'evidence_gaps', label: 'Evidence-gap indicators', count: data.escalation_queue.length }, { key: 'repeated_recording', label: 'Repeated poor recording indicators', count: 0 }].map((indicator) => (
              <div key={indicator.key} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                <span>{indicator.label}</span>
                <strong className="text-slate-950">{indicator.count}</strong>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

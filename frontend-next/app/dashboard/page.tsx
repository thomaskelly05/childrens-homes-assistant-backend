import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { AlertCard, Card, DataTable, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getCommandCentre } from '@/lib/os-api/platform'

function formatDate(value?: string) {
  if (!value) return 'Date not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function DashboardPage() {
  const command = await getCommandCentre()
  const data = command.data
  const openActions = data.actions.filter((action) => action.status !== 'completed')
  const safeguardingOpen = data.safeguarding.filter((item) => item.status !== 'closed')
  const documentsForReview = data.documents.filter((document) => ['review_required', 'action_plan_open', 'processing'].includes(document.status))
  const reviewEvidence = data.evidence.filter((item) => ['draft', 'partial', 'review_required'].includes(item.quality))
  const recentChronology = data.chronology.slice(0, 8)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command centre"
        title="What needs attention now"
        description="A live operating picture for safeguarding, child wellbeing, operational risk, compliance and documentation. It only shows records returned by the backend."
        action={<Link href="/young-people" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Choose child / record</Link>}
      />
      <LiveDataStatus result={command} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Card>
          <SectionHeader eyebrow="Attention queue" title="Start here" description="One ordered queue for safeguarding, child wellbeing, open actions and evidence gaps." />
          <div className="space-y-3">
            {data.attention.map((item) => (
              <Link key={item.id} href={item.href} className="group block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-white hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{item.theme.replaceAll('_', ' ')}</p>
                    <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black tracking-[-0.06em] text-slate-950">{item.count}</p>
                    <StatusBadge value={item.status} />
                  </div>
                </div>
              </Link>
            ))}
            {!data.attention.length ? (
              <EmptyState title="No urgent attention items returned" description="The backend did not return open safeguarding, action, document or evidence items for this session." />
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Operating picture" title="Live counts" description="Counts support the queue; they do not compete with it." />
          <dl className="grid gap-3">
            {[
              ['Young people', data.children.length, '/young-people'],
              ['Open safeguarding', safeguardingOpen.length, '/safeguarding'],
              ['Open actions', openActions.length, '/actions'],
              ['Evidence review', reviewEvidence.length, '/evidence'],
              ['Documents for review', documentsForReview.length, '/documents'],
              ['Recent chronology', data.chronology.length, '/chronology']
            ].map(([label, value, href]) => (
              <Link key={label} href={String(href)} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-blue-50">
                <dt>{label}</dt>
                <dd className="text-lg text-slate-950">{value}</dd>
              </Link>
            ))}
          </dl>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="What happened" title="Recent significant chronology" description="Recent records from the live chronology projection, with source links where the backend provides them." />
          <RecordTimeline items={recentChronology.map((event) => ({
            id: event.id,
            title: event.title,
            date: formatDate(event.dateTime),
            body: event.summary || 'No summary was returned for this event.',
            href: `/chronology/${encodeURIComponent(event.id)}`
          }))} />
        </Card>

        <Card>
          <SectionHeader eyebrow="Needs review" title="Open operational actions" description="Prioritised follow-up without panic language." />
          <div className="space-y-3">
            {openActions.slice(0, 6).map((action) => (
              <AlertCard key={action.id} title={action.title} body={action.description || 'This action needs review or completion.'} href={`/actions/${encodeURIComponent(action.id)}`} />
            ))}
            {!openActions.length ? <EmptyState title="No open actions returned" description="The backend did not return open operational actions for this session." /> : null}
          </div>
        </Card>
      </section>

      <Card>
        <OperationalLifecyclePanel
          title="Current operational lifecycle"
          description="Open, review, escalation and resolution states derived from live records and lifecycle metadata where present."
          items={data.lifecycle}
          hrefForItem={(item) => item.entityType.includes('document') ? `/documents/${encodeURIComponent(item.id)}` : item.entityType.includes('evidence') ? `/evidence/${encodeURIComponent(item.id)}` : undefined}
        />
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Safeguarding" title="Open concerns and alerts" />
          <DataTable
            headers={['Record', 'Child', 'Status', 'Why it matters']}
            rows={safeguardingOpen.slice(0, 8).map((item) => [
              <Link key={item.id} href={item.href || '/safeguarding'} className="font-black text-slate-950 hover:text-blue-700">{item.title}</Link>,
              item.childName || item.youngPersonId || 'Not linked',
              <StatusBadge key="status" value={item.status || 'needs review'} />,
              item.summary
            ])}
            empty={<EmptyState title="No open safeguarding records" description="The backend did not return open safeguarding records for this session." />}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Documents and evidence" title="Review and sign-off queue" />
          <DataTable
            headers={['Document', 'Type', 'Status', 'Review']}
            rows={documentsForReview.slice(0, 8).map((document) => [
              <Link key={document.id} href={`/documents/${encodeURIComponent(document.id)}`} className="font-black text-slate-950 hover:text-blue-700">{document.title}</Link>,
              document.documentType.replaceAll('_', ' '),
              <StatusBadge key="status" value={document.status.replaceAll('_', ' ')} />,
              document.reviewRequiredBy || 'Review date not returned'
            ])}
            empty={<EmptyState title="No documents awaiting review" description="No processing or review-required documents were returned." />}
          />
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Assistant / ORB context" title="Draft support remains review-led" description="ORB and assistant support should be treated as drafting and reflection support, not a factual or regulatory decision." />
        <div className="flex flex-wrap gap-3">
          <Link href="/assistant" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Open standalone Assistant / ORB</Link>
          <Link href="/settings" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Review governance</Link>
        </div>
      </Card>
    </div>
  )
}

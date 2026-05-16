import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { AlertCard, Card, DataTable, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
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
  const priorityStates = data.operationalState.states.slice(0, 8)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command centre"
        title="What needs attention now"
        description="A live operating picture for safeguarding, child wellbeing, operational risk, compliance and documentation. It only shows records returned by the backend."
        action={<Link href="/young-people" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Choose child / record</Link>}
      />
      <LiveDataStatus result={command} />

      <section className="grid gap-4 xl:grid-cols-3">
        {data.attention.map((item) => (
          <Link key={item.id} href={item.href} className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{item.theme.replaceAll('_', ' ')}</p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">{item.title}</h2>
              </div>
              <StatusBadge value={item.status} />
            </div>
            <p className="mt-4 text-4xl font-black tracking-[-0.06em] text-slate-950">{item.count}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Young people" value={data.children.length} detail="Visible to this session" href="/young-people" />
        <StatCard label="Open safeguarding" value={safeguardingOpen.length} detail="Records or alerts needing review" href="/safeguarding" />
        <StatCard label="Open actions" value={openActions.length} detail="Follow-up still active" href="/actions" />
        <StatCard label="Chronology events" value={data.chronology.length} detail="Recent connected events" href="/chronology" />
        <StatCard label="Evidence review" value={reviewEvidence.length} detail="Draft, partial or review required" href="/evidence" />
        <StatCard label="Documents for review" value={documentsForReview.length} detail="Processing or awaiting sign-off" href="/documents" />
        <StatCard label="Staff visible" value={data.workforce.length} detail="Current workforce projection" href="/staff" />
        <StatCard label="Homes visible" value={data.homes.length} detail="Provider/home scope returned" href="/settings" />
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
        <SectionHeader eyebrow="Operational state engine" title="Highest priority review indicators" description="Deterministic workflow, evidence and chronology indicators. These are not automated conclusions." />
        <DataTable
          headers={['State', 'Priority', 'Why', 'Next action']}
          rows={priorityStates.map((state) => [
            <Link key={state.id} href={state.linkedChildId ? `/young-people/${encodeURIComponent(state.linkedChildId)}` : state.category === 'safeguarding' ? '/safeguarding' : state.category === 'inspection' ? '/ofsted-readiness' : state.category === 'evidence' ? '/evidence' : '/dashboard'} className="font-black text-slate-950 hover:text-blue-700">{state.title}</Link>,
            <StatusBadge key="priority" value={state.priority} />,
            state.reason,
            state.nextAction
          ])}
          empty={<EmptyState title="No operational states returned" description="The backend did not return unresolved operational states for this session." />}
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

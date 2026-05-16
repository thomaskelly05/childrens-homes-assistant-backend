import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, RecordTimeline, RiskBadge, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getYoungPersonOverview } from '@/lib/os-api/platform'

export default async function YoungPersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const overview = await getYoungPersonOverview(id)
  const data = overview.data
  const person = data.profile
  if (!person && overview.source === 'live') notFound()

  const displayName = person?.displayName || person?.preferredName || `Young person ${id}`
  const safeguarding = data.safeguarding
  const childVoiceMarkers = data.chronology.filter((event) => /child voice|said|told|wanted|wishes/i.test(`${event.title} ${event.summary} ${event.fullText} ${event.tags.join(' ')}`))
  const managerReview = data.chronology.filter((event) => /manager|oversight|review|rm|ri/i.test(`${event.title} ${event.summary} ${event.tags.join(' ')}`))
  const operationalStates = data.operationalState.states.slice(0, 6)
  const tabs = [
    { label: 'Overview', href: '#overview' },
    { label: 'Records', href: '#records' },
    { label: 'Chronology', href: `/young-people/${id}/chronology` },
    { label: 'Safeguarding', href: '#safeguarding' },
    { label: 'Plans', href: `/young-people/${id}/plans` },
    { label: 'Health', href: `/health?young_person_id=${id}` },
    { label: 'Education', href: `/documents?young_person_id=${id}&type=education` },
    { label: 'Documents', href: `/young-people/${id}/documents` },
    { label: 'Intelligence', href: '#intelligence' },
    { label: 'Assistant', href: '#assistant' }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Young person record"
        title={displayName}
        description={`${person?.legalStatus || 'Legal status not returned'}. ${person?.carePlanning || 'Care planning summary will show when returned by the backend.'}`}
        action={<Link href={`/young-people/${encodeURIComponent(id)}/journey`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open Care Hub</Link>}
      />
      <LiveDataStatus result={overview} />

      <div className="flex gap-2 overflow-auto rounded-[24px] border border-white/70 bg-white/80 p-2 shadow-sm">
        {tabs.map((tab) => (
          <Link key={tab.label} href={tab.href} className="whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900">{tab.label}</Link>
        ))}
      </div>

      <section id="overview" className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Overview" title="Current care picture" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <RiskBadge value={(person?.riskLevel || 'medium') as any} />
              <StatusBadge value={person?.placementStatus || person?.status || 'active'} />
              <h2 className="mt-4 text-2xl font-black text-slate-950">{displayName}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">Age {person?.age || 'not returned'} · Home {person?.home_id ? String(person.home_id) : 'not returned'} · Key worker {person?.keyWorkerId || 'not returned'}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{person?.legalStatus || 'Legal status has not been returned by the backend.'}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <h3 className="text-lg font-black text-slate-950">Operational state</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{operationalStates.length ? `${operationalStates.length} review indicators are visible.` : 'No unresolved operational states were returned for this child.'}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{data.evidence.length ? `${data.evidence.length} evidence items are visible.` : 'No linked evidence was returned for this child.'}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <h3 className="text-lg font-black text-slate-950">Communication and sensory needs</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{String((person as any)?.communication_needs || (person as any)?.communicationNeeds || 'Not returned by the backend yet.')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{String((person as any)?.sensory_needs || (person as any)?.sensoryNeeds || 'Sensory needs not returned.')}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <h3 className="text-lg font-black text-slate-950">Current evidence picture</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{data.documents.length} documents · {data.evidence.length} evidence items · {data.chronology.length} chronology events.</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Evidence gaps are only shown when returned or deterministically indicated by missing links.</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Attention" title="What may need review" />
          <div className="space-y-3">
            <StatCard label="Safeguarding events" value={safeguarding.length} detail="Needs review where open or high significance" href="#safeguarding" />
            <StatCard label="Child voice markers" value={childVoiceMarkers.length} detail="Visible wishes, feelings or words" href="#intelligence" />
            <StatCard label="Management oversight" value={managerReview.length} detail="Review markers visible in chronology" href="#intelligence" />
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="What happened" title="Recent chronology" description="Open the full chronology for filters, source links, evidence and regulatory context." />
        <Link href={`/young-people/${id}/chronology`} className="mb-5 inline-flex rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open full chronology</Link>
        <RecordTimeline items={data.chronology.slice(0, 9).map((event) => ({
          id: event.id,
          title: event.title,
          date: event.dateTime,
          body: event.summary || 'No summary was returned for this event.',
          href: `/chronology/${encodeURIComponent(event.id)}`
        }))} />
      </Card>

      <Card>
        <SectionHeader eyebrow="Operational awareness" title="Review indicators for this child" description="Calm operational prompts derived from visible workflow, evidence and chronology signals." />
        <DataTable
          headers={['Indicator', 'Priority', 'Reason', 'Next action']}
          rows={operationalStates.map((state) => [
            state.title,
            <StatusBadge key={state.id} value={state.priority} />,
            state.reason,
            state.nextAction
          ])}
          empty={<EmptyState title="No child operational states" description="No unresolved operational states were returned for this child." />}
        />
      </Card>

      <section id="records" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Records" title="Backend-supported record areas" />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Daily notes', `/young-people/${id}/daily-note/new`],
              ['Incidents', `/incidents?young_person_id=${id}`],
              ['Missing episodes', `/safeguarding?young_person_id=${id}`],
              ['Health', `/health?young_person_id=${id}`],
              ['Education', `/documents?young_person_id=${id}&type=education`],
              ['Key work', `/keywork?young_person_id=${id}`],
              ['Risk assessments', `/risk-assessments?young_person_id=${id}`],
              ['Placement records', `/placements?young_person_id=${id}`]
            ].map(([label, href]) => (
              <Link key={label} href={href} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-blue-50">{label}</Link>
            ))}
          </div>
        </Card>
        <Card id="safeguarding">
          <SectionHeader eyebrow="Safeguarding" title="Follow-up and chronology" />
          <DataTable
            headers={['Date', 'Event', 'Evidence', 'Actions']}
            rows={safeguarding.map((event) => [event.dateTime, event.title, event.evidenceIds.length, event.actionIds.length])}
            empty={<EmptyState title="No safeguarding events" description="No safeguarding-linked chronology was returned for this child." />}
          />
        </Card>
      </section>

      <section id="intelligence" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Deterministic intelligence" title="Indicators to consider" description="These are deterministic markers from visible metadata and wording, not automated decisions." />
          <DataTable
            headers={['Indicator', 'Count', 'Language']}
            rows={[
              ['Child voice markers', childVoiceMarkers.length, childVoiceMarkers.length ? 'Evidence indicator' : 'Possible gap'],
              ['Management oversight markers', managerReview.length, managerReview.length ? 'Evidence indicator' : 'Needs manager review if relevant'],
              ['Safeguarding signals', safeguarding.length, safeguarding.length ? 'Suggested review' : 'Not enough evidence available'],
              ['Evidence links', data.chronology.filter((event) => event.evidenceIds.length).length, 'Evidence indicator']
            ]}
            empty={<EmptyState title="No intelligence indicators" description="No deterministic indicators were available from the returned records." />}
          />
        </Card>
        <Card id="documents">
          <SectionHeader eyebrow="Documents" title="Documents and evidence" />
          <DataTable
            headers={['Title', 'Type', 'Status']}
            rows={data.documents.map((document) => [
              <Link key={document.id} href={`/documents/${encodeURIComponent(document.id)}`} className="font-bold text-blue-700">{document.title}</Link>,
              document.documentType.replaceAll('_', ' '),
              <StatusBadge key={document.id} value={document.status.replaceAll('_', ' ')} />
            ])}
            empty={<EmptyState title="No documents" description="No documents are linked or visible for this child." />}
          />
        </Card>
      </section>

      <Card id="assistant">
        <SectionHeader eyebrow="Assistant" title="In-shell ORB context" description="Use the floating in-shell ORB on this page for child-scoped support. The standalone Assistant / ORB remains separate and does not retrieve child records by default." />
        <div className="flex flex-wrap gap-3">
          <Link href={`/assistant?youngPersonId=${encodeURIComponent(id)}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Open standalone Assistant / ORB with explicit context</Link>
          <Link href={`/young-people/${encodeURIComponent(id)}/journey`} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Return to Care Hub</Link>
        </div>
      </Card>
    </div>
  )
}

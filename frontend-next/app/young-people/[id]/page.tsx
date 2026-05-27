import { notFound } from 'next/navigation'
import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { CognitionPromptStack, OperationalBarChart, OperationalSignalGrid, OperationalTrendChart, WellbeingRing } from '@/components/indicare/operational-cognition-widgets'
import { ChildIdentitySurface, ChronologySurface, ContextSurface, WorkspaceStack } from '@/components/indicare/operational-surfaces'
import { DataTable, EmptyState, RecordTimeline, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { recordTitle, text } from '@/lib/os-api/bundles'
import { getServerChildProfileBundle } from '@/lib/os-api/server-bundles'
import { getServerOsActions, getServerOsChronology, getServerOsDocuments, getServerOsEvidence } from '@/lib/os-api/server-records'
import { getServerOsYoungPersonWorkspace } from '@/lib/os-api/server-workspaces'
import { buildChronologyThemeData, buildChronologyTrendData } from '@/lib/operational/cognition-metrics'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'https://api.indicare.co.uk'
).replace(/\/+$/, '')

function normalisePhoto(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'null' || raw === 'undefined' || raw === 'Not returned yet') return ''
  if (raw.startsWith('data:image/') || raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('/')) return `${API_BASE}${raw}`
  return ''
}

export default async function YoungPersonDetailPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params
  const query = await searchParams
  const result = await getServerChildProfileBundle(id)
  const workspaceResult = await getServerOsYoungPersonWorkspace(id)
  const chronologyResult = await getServerOsChronology({ youngPersonId: id })
  const documentsResult = await getServerOsDocuments({ youngPersonId: id })
  const evidenceResult = await getServerOsEvidence({ youngPersonId: id })
  const actionsResult = await getServerOsActions({ youngPersonId: id })
  const bundle = result.data
  const identity = bundle.identity || {}
  if (!identity.id && result.source === 'live') notFound()
  const displayName = text(identity, ['preferred_name', 'first_name', 'display_name'], `Young person ${id}`)
  const initials = displayName.slice(0, 2).toUpperCase()
  const keyWorker = identity.key_worker && typeof identity.key_worker === 'object' ? identity.key_worker as Record<string, any> : {}
  const safetyItems = bundle.safety.active_concerns || []
  const photo = normalisePhoto(identity.photo_url || identity.photoUrl || identity.profile_photo_path || identity.profilePhotoPath)
  const chronology = chronologyResult.data
  const documents = documentsResult.data
  const evidence = evidenceResult.data
  const actions = actionsResult.data
  const dailyNotes = chronology.filter((event) => event.sourceType === 'daily_log')
  const emotionalEvents = chronology.filter((event) => /wellbeing|mood|emotion|regulation|settled|anxious|low/i.test(`${event.title} ${event.summary} ${event.fullText}`))
  const relationshipEvents = chronology.filter((event) => /relationship|family|contact|trusted adult|peer/i.test(`${event.title} ${event.summary} ${event.fullText}`))
  const highConcernEvents = chronology.filter((event) => event.severity === 'high' || event.severity === 'critical' || event.safeguardingFlags.length)
  const supportEffectiveness = chronology.length ? Math.max(0, Math.min(100, Math.round(((chronology.length - highConcernEvents.length) / chronology.length) * 100))) : 100
  const communicationStyle = text(bundle.communication, ['communication_style'], 'Not returned yet')
  const pronouns = text(identity, ['pronouns'], 'Pronouns not returned')
  const trustedAdults = [text(keyWorker, ['full_name', 'display_name', 'email'], ''), text(identity, ['trusted_adults', 'trustedAdults'], '')].filter(Boolean).join(' · ') || 'Trusted adults not returned'
  const journeySignals = [
    { label: 'Pronouns', value: pronouns, detail: 'Identity language from the child profile bundle', tone: 'blue' as const },
    { label: 'Communication style', value: communicationStyle, detail: 'How adults should listen and respond', tone: 'purple' as const },
    { label: 'Trusted adults', value: trustedAdults, detail: 'Key relational anchors returned by live profile data', tone: 'emerald' as const },
    { label: 'Sensory support', value: text(bundle.communication, ['sensory_needs'], 'Not returned'), detail: 'Sensory and regulation context', tone: 'slate' as const }
  ]
  const childRings = [
    { label: 'Emotional safety', value: chronology.length ? Math.max(0, 100 - highConcernEvents.length * 12 + emotionalEvents.length * 3) : 100, detail: `${emotionalEvents.length} emotional wellbeing signal${emotionalEvents.length === 1 ? '' : 's'}`, tone: 'blue' as const },
    { label: 'Relationships', value: chronology.length ? Math.min(100, 62 + relationshipEvents.length * 6) : 70, detail: `${relationshipEvents.length} relationship marker${relationshipEvents.length === 1 ? '' : 's'}`, tone: 'purple' as const },
    { label: 'Support effect', value: supportEffectiveness, detail: `${highConcernEvents.length} high-concern event${highConcernEvents.length === 1 ? '' : 's'} in chronology`, tone: highConcernEvents.length ? 'amber' as const : 'emerald' as const }
  ]
  const profileDiagnostics = [
    ['Workspace', workspaceResult.source === 'live' ? 'live /os workspace' : workspaceResult.warning || 'workspace unavailable'],
    ['Chronology', `Live chronology returned ${chronology.length} row${chronology.length === 1 ? '' : 's'} for this child`],
    ['Documents', `Live documents returned ${documents.length} row${documents.length === 1 ? '' : 's'} for this child`],
    ['Evidence', `Live evidence returned ${evidence.length} row${evidence.length === 1 ? '' : 's'} for this child`],
    ['Actions', `Live actions returned ${actions.length} row${actions.length === 1 ? '' : 's'} for this child`]
  ]

  return (
    <WorkspaceStack>
      <ChildIdentitySurface>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 flex-1 flex-wrap gap-5">
            {photo ? (
              <div className="h-28 w-28 rounded-[32px] bg-cover bg-center shadow-xl shadow-slate-950/10" style={{ backgroundImage: `url(${photo})` }} />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-blue-600 to-sky-400 text-3xl font-black text-white shadow-xl shadow-blue-500/20">{initials}</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Children &gt; {displayName}</p>
              <h1 className="mt-3 text-5xl font-black tracking-[-0.07em] text-slate-950">{displayName}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{text(bundle.personhood, ['what_matters_to_me'], 'What matters to this child has not been recorded yet.')}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <RiskBadge value={text(identity, ['summary_risk_level', 'risk_level', 'riskLevel'], 'medium') as any} />
                <StatusBadge value={text(identity, ['placement_status', 'placementStatus'], 'placement not returned')} />
                <StatusBadge value={pronouns} />
                <StatusBadge value={`communication: ${communicationStyle}`} />
                <StatusBadge value={identity.age ? `age ${identity.age}` : 'age not returned'} />
                <StatusBadge value={`key worker: ${text(keyWorker, ['full_name', 'display_name', 'email'], text(identity, ['key_worker_name', 'keyWorkerName', 'key_worker_id', 'keyWorkerId'], 'not returned'))}`} />
                {query.saved ? <StatusBadge value={`saved: ${query.saved}`} /> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Add daily note</Link>
            <Link href={`/young-people/${encodeURIComponent(id)}/records/new`} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 ring-1 ring-blue-100">New linked record</Link>
            <Link href={`/young-people/${encodeURIComponent(id)}/documents/generate`} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 ring-1 ring-blue-100">Generate document</Link>
            <Link href={`/young-people/${encodeURIComponent(id)}/reports`} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Live reports</Link>
          </div>
        </div>
      </ChildIdentitySurface>
      <LiveDataStatus result={result} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {profileDiagnostics.map(([label, value]) => (
          <ContextSurface key={label}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
          </ContextSurface>
        ))}
      </section>

      <OperationalSignalGrid signals={journeySignals} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OperationalTrendChart title="Lived journey trajectory" description="Live chronology volume with high-concern events overlaid as the secondary signal." data={buildChronologyTrendData(chronology)} />
        <div className="grid gap-4">
          {childRings.map((ring) => <WellbeingRing key={ring.label} {...ring} />)}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OperationalBarChart title="Child-centred chronology themes" data={buildChronologyThemeData(chronology)} />
        <CognitionPromptStack
          title="Therapeutic recording prompts"
          prompts={[
            'What changed for the child, and what might the child have been communicating?',
            'Which adult response appeared supportive, relational and emotionally safe?',
            'What helped routines, regulation, belonging or trust?',
            'What should the registered manager review next in the child journey?'
          ]}
          action={<Link href={`/assistant/orb?scope=child&young_person_id=${encodeURIComponent(id)}`} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Ask ORB</Link>}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <ContextSurface>
          <SectionHeader eyebrow="Today" title="What helps this child today" description="Risk is visible, but identity, strengths and communication lead the page." />
          <dl className="grid gap-3 md:grid-cols-2">
            {[
              ['What matters to me', text(bundle.personhood, ['what_matters_to_me'])],
              ['Strengths and interests', [text(bundle.personhood, ['strengths'], ''), text(bundle.personhood, ['interests'], '')].filter(Boolean).join(' · ') || 'Not returned yet'],
              ['What helps me', text(bundle.communication, ['what_helps'])],
              ['How I communicate', text(bundle.communication, ['communication_style'])],
              ['Sensory needs', text(bundle.communication, ['sensory_needs'])],
              ['Routines', text(bundle.communication, ['routines'])],
              ['What does not help', text(bundle.communication, ['what_does_not_help'])],
              ['Key worker', text(keyWorker, ['full_name', 'display_name', 'email'], text(identity, ['key_worker_name', 'keyWorkerName', 'key_worker_id', 'keyWorkerId'], 'Not returned yet'))]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] bg-slate-50 p-4">
                <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
        </ContextSurface>

        <ContextSurface>
          <SectionHeader eyebrow="Safety context" title="Current support and follow-up" description="Safeguarding and missing status stay visible without defining the child." />
          <div className="grid gap-3">
            <StatusBadge value={text(bundle.safety, ['safeguarding_status'], 'safeguarding not returned')} />
            <StatusBadge value={text(bundle.safety, ['missing_status'], 'missing not returned')} />
            <StatusBadge value={text(bundle.safety, ['current_risk_level'], 'risk not returned')} />
          </div>
          <div className="mt-5 space-y-3">
            {safetyItems.slice(0, 4).map((item: Record<string, any>, index: number) => (
              <article key={String(item.id || index)} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-black text-slate-950">{recordTitle(item, 'Concern')}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text(item, ['summary', 'concern_details', 'description'], 'No detail returned.')}</p>
              </article>
            ))}
            {!safetyItems.length ? <EmptyState title="No active safeguarding concerns returned" description="Active safeguarding or missing follow-up will appear here when live records exist." /> : null}
          </div>
        </ContextSurface>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ContextSurface>
          <SectionHeader eyebrow="Family / relationships" title="Important people" />
          <DataTable
            headers={['Name', 'Relationship', 'Contact']}
            rows={bundle.relationships.map((row) => [
              text(row, ['name', 'full_name'], 'Contact'),
              text(row, ['relationship', 'role'], 'Not returned'),
              text(row, ['phone', 'email'], 'Not returned')
            ])}
            empty={<EmptyState title="No key people returned" description="Important people will appear here when real profile contacts exist." />}
          />
        </ContextSurface>

        <ContextSurface>
          <SectionHeader eyebrow="Care plans, health and education" title="Support plans and documents" />
          <DataTable
            headers={['Record', 'Source', 'Status']}
            rows={bundle.plans.concat(documents as any).slice(0, 8).map((row) => [
              recordTitle(row, 'Record'),
              text(row, ['source', 'document_type', 'record_type'], 'Not returned'),
              <StatusBadge key={String(row.id || recordTitle(row))} value={text(row, ['status', 'workflow_status'], 'status not returned')} />
            ])}
            empty={<EmptyState title="No plans or documents returned" description="Live care plans, risk plans and documents will appear here when linked." />}
          />
        </ContextSurface>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ContextSurface>
          <SectionHeader eyebrow="Daily notes" title="Recent daily recording" />
          <DataTable
            headers={['Date', 'Summary']}
            rows={dailyNotes.slice(0, 5).map((event) => [event.dateTime || 'Date not returned', event.summary || 'No summary returned'])}
            empty={<EmptyState title="Live chronology returned 0 daily note rows for this child" description="Daily notes will appear here when the live chronology includes daily recording entries for this child." />}
          />
        </ContextSurface>
        <ContextSurface>
          <SectionHeader eyebrow="Evidence" title="Linked evidence" />
          <DataTable
            headers={['Evidence', 'Quality']}
            rows={evidence.slice(0, 5).map((item) => [item.title, item.quality])}
            empty={<EmptyState title="No linked evidence yet" description="Evidence linked to this child will appear here when available for your account." />}
          />
        </ContextSurface>
        <ContextSurface>
          <SectionHeader eyebrow="Actions" title="Open follow-up" />
          <DataTable
            headers={['Action', 'Status']}
            rows={actions.slice(0, 5).map((action) => [action.title, <StatusBadge key={action.id} value={action.status} />])}
            empty={<EmptyState title="No open actions yet" description="Child-scoped follow-up will appear here when actions are assigned." />}
          />
        </ContextSurface>
      </section>

      <ChronologySurface description="Recent child chronology filtered to the selected young person.">
        {chronology.length ? <RecordTimeline items={chronology.map((event, index) => ({
          id: String(event.id || index),
          title: recordTitle(event as any, 'Chronology event'),
          date: String(event.dateTime || event.createdAt || ''),
          body: event.summary || event.fullText || 'No summary returned.',
          href: event.id ? `/chronology/${encodeURIComponent(String(event.id))}` : undefined
        }))} /> : <EmptyState title="No chronology entries yet" description="When records and events are signed off for this child, their timeline will appear here." />}
      </ChronologySurface>
    </WorkspaceStack>
  )
}
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, DataTable, EmptyState, PageHeader, RecordTimeline, RiskBadge, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getYoungPersonOverview } from '@/lib/os-api/platform'

function profileText(profile: Record<string, unknown> | undefined, keys: string[], fallback = 'Not returned') {
  if (!profile) return fallback
  for (const key of keys) {
    const value = profile[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return fallback
}

function profileList(profile: Record<string, unknown> | undefined, keys: string[]) {
  if (!profile) return []
  for (const key of keys) {
    const value = profile[key]
    if (Array.isArray(value)) return value.map((item) => {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>
        return [row.name, row.role || row.relationship, row.phone || row.email].filter(Boolean).join(' · ')
      }
      return String(item)
    }).filter(Boolean)
    if (typeof value === 'string' && value.trim()) return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
  }
  return []
}

export default async function YoungPersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const overview = await getYoungPersonOverview(id)
  const data = overview.data
  const person = data.profile
  if (!person && overview.source === 'live') notFound()

  const displayName = person?.displayName || person?.preferredName || `Young person ${id}`
  const profile = person as Record<string, unknown> | undefined
  const photoUrl = profileText(profile, ['photo_url', 'photoUrl', 'profile_photo', 'avatar_url'], '')
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl = profileText(profile, ['profile_image_url', 'profile_photo_url', 'photo_url'], '')
  const whatMatters = profileText(profile, ['what_matters_to_me', 'whatMattersToMe', 'interests', 'strengths_summary'], 'Not returned yet')
  const whatHelps = profileText(profile, ['what_helps', 'whatWorks', 'de_escalation_strategies', 'support_strategies'], 'Not returned yet')
  const communicationStyle = profileText(profile, ['communication_style', 'communication_needs', 'communicationNeeds'], 'Not returned yet')
  const sensorySupport = profileText(profile, ['sensory_needs', 'sensory_profile', 'sensoryNeeds'], 'Not returned yet')
  const keyDetails = [
    ['Age / DOB', [person?.age ? `Age ${person.age}` : undefined, profileText(profile, ['date_of_birth', 'dateOfBirth', 'dob'], '')].filter(Boolean).join(' · ') || 'Not returned'],
    ['Home', profileText(profile, ['home_name', 'homeName', 'home_id', 'homeId'], 'Not returned')],
    ['Placement', person?.placementStatus || person?.status || 'Not returned'],
    ['Key worker', profileText(profile, ['key_worker_name', 'keyWorkerName', 'key_worker_id', 'keyWorkerId', 'allocated_key_worker_id'], 'Not returned')],
    ['Legal status', person?.legalStatus || profileText(profile, ['legal_status', 'legalStatus'], 'Not returned')]
  ]
  const supportNeeds = [
    ['What matters to me', whatMatters],
    ['What helps me', whatHelps],
    ['Communication style', communicationStyle],
    ['Emotional / sensory support', sensorySupport],
    ['Routines', profileText(profile, ['routines', 'daily_routine', 'routine'], 'Not returned yet')],
    ['What does not help', profileText(profile, ['what_does_not_help', 'does_not_help', 'whatDoesNotHelp'], 'Not returned yet')]
  ]
  const contactRows = profileList(profile, ['important_contacts', 'contacts', 'key_contacts']).map((contact) => [contact])
  const safeguarding = data.safeguarding
  const childVoiceMarkers = data.chronology.filter((event) => /child voice|said|told|wanted|wishes/i.test(`${event.title} ${event.summary} ${event.fullText} ${event.tags.join(' ')}`))
  const managerReview = data.chronology.filter((event) => /manager|oversight|review|rm|ri/i.test(`${event.title} ${event.summary} ${event.tags.join(' ')}`))
  const tabs = [
    { label: 'Overview', href: '#overview' },
    { label: 'Records', href: '#records' },
    { label: 'Chronology', href: `/young-people/${id}/chronology` },
    { label: 'Safeguarding', href: '#safeguarding' },
    { label: 'Plans', href: `/young-people/${id}/plans` },
    { label: 'Health', href: `/young-people/${id}/health/new` },
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
          <SectionHeader eyebrow="Two-minute overview" title="Who this child is" description="The first screen should help any staff member understand the child, current state and next action quickly." />
          <div className="rounded-[28px] bg-slate-50 p-5">
            <div className="flex flex-wrap items-start gap-5">
              {photoUrl ? (
                <div className="h-28 w-28 rounded-[32px] bg-cover bg-center shadow-xl shadow-slate-950/10" style={{ backgroundImage: `url(${photoUrl})` }} aria-label={`${displayName} photo`} />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-blue-600 to-slate-950 text-3xl font-black text-white shadow-xl shadow-slate-950/10">{initials}</div>
              )}
              <div className="min-w-0 flex-1">
          <SectionHeader eyebrow="Two-minute overview" title="Person first, then operational context" description="The first screen leads with identity, communication and what helps. Risk remains visible without defining the child." />
          <div className="rounded-[30px] bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-5 ring-1 ring-blue-100">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap gap-5">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-600 to-sky-400 text-3xl font-black text-white shadow-lg shadow-blue-500/25">
                  {avatarUrl ? <Image src={avatarUrl} alt="" width={112} height={112} unoptimized className="h-full w-full object-cover" /> : (person?.preferredName || displayName).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <RiskBadge value={person?.riskLevel as any} />
                  <StatusBadge value={person?.placementStatus || person?.status || 'active'} />
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950">{displayName}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{profileText(profile, ['child_voice_summary'], '') || person?.carePlanning || 'Care planning and child voice summaries will show when returned by the backend.'}</p>
                </div>
              </div>
              <Link href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Add daily note</Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ['What matters to me', whatMatters],
                ['What helps me', whatHelps],
                ['How I communicate', communicationStyle]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[24px] bg-white/85 p-4 ring-1 ring-white">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{label}</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
                </div>
              ))}
            </div>
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              {keyDetails.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white px-4 py-3">
                  <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                  <dd className="mt-1 text-sm font-bold leading-6 text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Today" title="What needs attention" />
          <div className="space-y-3">
            <StatCard label="Safeguarding events" value={safeguarding.length} detail="Needs review where open or high significance" href="#safeguarding" />
            <StatCard label="Child voice markers" value={childVoiceMarkers.length} detail="Visible wishes, feelings or words" href="#intelligence" />
            <StatCard label="Management oversight" value={managerReview.length} detail="Review markers visible in chronology" href="#intelligence" />
            <StatCard label="Open actions" value={data.actions.filter((action) => action.status !== 'completed').length} detail="Unresolved follow-up visible to this child" href="/actions" />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Support" title="What helps this child" description="Plain-language care intelligence for staff on shift." />
          <dl className="grid gap-3 md:grid-cols-2">
            {[
              ['What matters to me', profileText(profile, ['what_matters_to_me', 'whatMattersToMe', 'what_matters'], 'Not returned yet')],
              ['Strengths and interests', profileText(profile, ['strengths_interests', 'strengthsAndInterests', 'interests', 'strengths'], 'Not returned yet')]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 md:col-span-2">
                <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{label}</dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</dd>
              </div>
            ))}
            {supportNeeds.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <SectionHeader eyebrow="Contacts" title="Key people" description="Professional and family contacts should appear here when the backend returns them." />
          <DataTable
            headers={['Contact']}
            rows={contactRows}
            empty={<EmptyState title="No key contacts returned" description="Social worker, school, health, placing authority and family contacts should be added to the live child profile." />}
          />
        </Card>
      </section>

      <Card>
        <OperationalLifecyclePanel
          title="Child-linked lifecycle"
          description="Actions, evidence, documents and chronology are grouped into reviewable lifecycle states for this child."
          items={data.lifecycle}
          hrefForItem={(item) => item.entityType.includes('document') ? `/documents/${encodeURIComponent(item.id)}` : item.entityType.includes('evidence') ? `/evidence/${encodeURIComponent(item.id)}` : item.entityType.includes('chronology') ? `/chronology/${encodeURIComponent(item.id)}` : undefined}
        />
      </Card>

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

      <section id="records" className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Quick actions" title="Record or open the next thing" description="Each action keeps this child in scope and avoids duplicate entry points." />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Daily notes', `/young-people/${id}/daily-note/new`],
              ['Add incident', `/young-people/${id}/incidents/new`],
              ['Add safeguarding record', `/young-people/${id}/safeguarding/new`],
              ['Add missing episode', `/young-people/${id}/missing/new`],
              ['Add health record', `/young-people/${id}/health/new`],
              ['Add education record', `/documents?young_person_id=${id}&type=education&intent=new`],
              ['Upload document', `/documents?young_person_id=${id}`],
              ['Open Assistant / ORB guidance', '#assistant']
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
          <Link href="/assistant" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Open standalone Assistant / ORB</Link>
          <Link href={`/young-people/${encodeURIComponent(id)}/journey`} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Return to Care Hub</Link>
        </div>
      </Card>
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { recordTitle, text } from '@/lib/os-api/bundles'
import { getServerChildProfileBundle } from '@/lib/os-api/server-bundles'
import { getServerOsActions, getServerOsChronology, getServerOsDocuments, getServerOsEvidence } from '@/lib/os-api/server-records'
import { getServerOsYoungPersonWorkspace } from '@/lib/os-api/server-workspaces'

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

function safeText(value: string | undefined, fallback: string) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'Not returned yet' || raw === 'Not returned') return fallback
  return raw
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="ic-signal-card">
      <p className="ic-eyebrow text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
    </div>
  )
}

function StorySection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="ic-story-card">
      <p className="ic-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  )
}

function SoftRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ic-soft-row">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
    </div>
  )
}

function EmptyGentle({ title, description }: { title: string; description: string }) {
  return (
    <div className="ic-empty-card">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
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
  const photo = normalisePhoto(identity.photo_url || identity.photoUrl || identity.profile_photo_path || identity.profilePhotoPath)
  const chronology = chronologyResult.data
  const documents = documentsResult.data
  const evidence = evidenceResult.data
  const actions = actionsResult.data
  const safetyItems = bundle.safety.active_concerns || []
  const pronouns = safeText(text(identity, ['pronouns'], ''), 'Pronouns not recorded')
  const communicationStyle = safeText(text(bundle.communication, ['communication_style'], ''), 'Communication style not recorded yet')
  const whatMatters = safeText(text(bundle.personhood, ['what_matters_to_me'], ''), `${displayName}'s story is ready to be built. Add what matters, what helps, strengths, routines and the voice of the child so every adult starts with understanding.`)
  const strengths = [text(bundle.personhood, ['strengths'], ''), text(bundle.personhood, ['interests'], '')].filter(Boolean).join(' · ') || 'Strengths, interests and moments of progress have not been recorded yet.'
  const whatHelps = safeText(text(bundle.communication, ['what_helps'], ''), 'Record what helps this child feel safe, settled and understood.')
  const whatDoesNotHelp = safeText(text(bundle.communication, ['what_does_not_help'], ''), 'Record words, approaches or situations that can escalate distress.')
  const sensoryNeeds = safeText(text(bundle.communication, ['sensory_needs'], ''), 'Sensory needs not recorded yet.')
  const routines = safeText(text(bundle.communication, ['routines'], ''), 'Important routines not recorded yet.')
  const keyWorkerName = safeText(text(keyWorker, ['full_name', 'display_name', 'email'], text(identity, ['key_worker_name', 'keyWorkerName', 'key_worker_id', 'keyWorkerId'], '')), 'Key worker not recorded')
  const risk = safeText(text(identity, ['summary_risk_level', 'risk_level', 'riskLevel'], ''), 'medium')
  const status = safeText(text(identity, ['placement_status', 'placementStatus'], ''), 'placement status not returned')
  const dailyNotes = chronology.filter((event) => event.sourceType === 'daily_log')
  const highConcernEvents = chronology.filter((event) => event.severity === 'high' || event.severity === 'critical' || event.safeguardingFlags.length)

  const tabs = [
    ['Story', `/young-people/${id}`],
    ['Today', `/young-people/${id}/workspace`],
    ['Record', `/young-people/${id}/records/new`],
    ['Chronology', `/young-people/${id}/chronology`],
    ['Plans', `/young-people/${id}/plans`],
    ['Risks', `/young-people/${id}/risk-assessments`],
    ['Health', `/young-people/${id}/health`],
    ['Education', `/young-people/${id}/education`],
    ['Family', `/young-people/${id}/family`],
    ['Voice', `/young-people/${id}/child-voice`],
    ['Documents', `/young-people/${id}/documents`],
    ['ORB', `/assistant/orb?scope=child&young_person_id=${id}`]
  ]

  return (
    <div className="ic-story-page">
      <section className="ic-hero-card">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 flex-1 flex-wrap gap-5">
            {photo ? (
              <div className="ic-orb-glow h-28 w-28 rounded-[32px] bg-cover bg-center shadow-xl shadow-slate-950/10" style={{ backgroundImage: `url(${photo})` }} />
            ) : (
              <div className="ic-orb-glow flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-sky-400 via-blue-600 to-slate-950 text-3xl font-black text-white shadow-xl shadow-blue-500/20">{initials}</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="ic-eyebrow">Story first · child-centred OS</p>
              <h1 className="ic-title mt-3 text-5xl">This is {displayName}</h1>
              <p className="ic-body-copy mt-4 max-w-4xl text-base">{whatMatters}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="ic-pill">Age {identity.age || 'not recorded'}</span>
                <span className="ic-pill">{pronouns}</span>
                <span className="ic-pill">Risk: {risk}</span>
                <span className="ic-pill">{status}</span>
                <span className="ic-pill">Key worker: {keyWorkerName}</span>
                {query.saved ? <span className="ic-pill">Saved: {query.saved}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/young-people/${encodeURIComponent(id)}/workspace`} className="ic-primary-action">Open today</Link>
            <Link href={`/young-people/${encodeURIComponent(id)}/records/new`} className="ic-secondary-action">Record with care</Link>
            <Link href={`/assistant/orb?scope=child&young_person_id=${encodeURIComponent(id)}`} className="ic-secondary-action">Ask ORB</Link>
          </div>
        </div>
      </section>

      <LiveDataStatus result={result} />

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Child story navigation">
        {tabs.map(([label, href], index) => (
          <Link key={label} href={href} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ring-1 transition ${index === 0 ? 'bg-blue-700 text-white ring-blue-700' : 'bg-white/80 text-slate-500 ring-slate-200 hover:text-slate-950'}`}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="ic-today-grid">
        <MetricCard label="Chronology" value={chronology.length} detail="life events and daily records linked to this child" />
        <MetricCard label="Open actions" value={actions.length} detail="follow-up items still needing adult attention" />
        <MetricCard label="Evidence" value={evidence.length} detail="linked evidence records available to your role" />
        <MetricCard label="Safety signals" value={highConcernEvents.length} detail="high-concern or safeguarding-marked chronology entries" />
      </section>

      <section className="ic-section-grid-2">
        <StorySection eyebrow="My story" title="Before you record anything, understand me">
          <p>{whatMatters}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SoftRow label="Where I am now" value={status} />
            <SoftRow label="Legal status" value={safeText(text(identity, ['legal_status', 'legalStatus'], ''), 'Legal status not recorded')} />
            <SoftRow label="Social worker" value={safeText(text(identity, ['social_worker_name', 'socialWorkerName'], ''), 'Social worker not recorded')} />
            <SoftRow label="IRO" value={safeText(text(identity, ['iro_name', 'iroName'], ''), 'IRO not recorded')} />
          </div>
        </StorySection>

        <section className="ic-orb-strip">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">ORB quiet mode</p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">There when needed. Quiet when not.</h2>
          <p className="mt-3 text-sm leading-7">ORB can help adults ask better questions, notice missing evidence and write in a therapeutic way. It does not replace professional judgement.</p>
          <div className="mt-5 grid gap-2">
            {['What would Ofsted want to understand here?', 'What has changed in the last 30 days?', 'Does this child’s voice appear in the records?', 'What needs manager review?'].map((prompt) => (
              <Link key={prompt} href={`/assistant/orb?scope=child&young_person_id=${encodeURIComponent(id)}&prompt=${encodeURIComponent(prompt)}`} className="rounded-2xl border border-cyan-200/20 bg-white/8 px-4 py-3 text-sm font-black text-cyan-50 hover:bg-white/12">
                {prompt}
              </Link>
            ))}
          </div>
        </section>
      </section>

      <section className="ic-section-grid-3">
        <StorySection eyebrow="What matters to me" title="Identity, comfort and belonging">
          <div className="ic-soft-list">
            <SoftRow label="Strengths and interests" value={strengths} />
            <SoftRow label="Routines" value={routines} />
            <SoftRow label="Sensory support" value={sensoryNeeds} />
          </div>
        </StorySection>

        <StorySection eyebrow="How to support me" title="Practical guidance for adults">
          <div className="ic-soft-list">
            <SoftRow label="What helps" value={whatHelps} />
            <SoftRow label="What does not help" value={whatDoesNotHelp} />
            <SoftRow label="Communication" value={communicationStyle} />
          </div>
        </StorySection>

        <StorySection eyebrow="My voice" title="Do not let my views get lost">
          <div className="ic-soft-list">
            <SoftRow label="Wishes and feelings" value={safeText(text(bundle.personhood, ['wishes_and_feelings', 'wishes'], ''), 'Wishes and feelings not recorded yet.')} />
            <SoftRow label="What I want adults to know" value={safeText(text(bundle.personhood, ['what_i_want_adults_to_know', 'adult_message'], ''), 'Ask, listen and record what the child wants adults to understand.')} />
            <SoftRow label="Goals" value={safeText(text(bundle.personhood, ['goals', 'hopes'], ''), 'Goals and hopes not recorded yet.')} />
          </div>
        </StorySection>
      </section>

      <section className="ic-section-grid-2">
        <section className="ic-live-card">
          <p className="ic-eyebrow">Today</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">What adults need to know today</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SoftRow label="Daily presentation" value={dailyNotes[0]?.summary || 'No daily note returned yet for today.'} />
            <SoftRow label="Current risk" value={safeText(text(bundle.safety, ['current_risk_level'], risk), risk)} />
            <SoftRow label="Safeguarding status" value={safeText(text(bundle.safety, ['safeguarding_status'], ''), 'No active safeguarding status returned.')} />
            <SoftRow label="Missing status" value={safeText(text(bundle.safety, ['missing_status'], ''), 'No missing status returned.')} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} className="ic-primary-action">Write daily note</Link>
            <Link href={`/young-people/${encodeURIComponent(id)}/handover`} className="ic-secondary-action">Open handover</Link>
          </div>
        </section>

        <section className="ic-live-card">
          <p className="ic-eyebrow">Manager visibility</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">Seen, reviewed, signed off and connected</h2>
          <div className="mt-5 grid gap-3">
            {actions.slice(0, 4).map((action) => (
              <Link key={action.id} href={`/actions/${encodeURIComponent(String(action.id))}`} className="ic-soft-row block hover:bg-white">
                <p className="text-sm font-black text-slate-950">{action.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{action.status}</p>
              </Link>
            ))}
            {!actions.length ? <EmptyGentle title="No open actions returned" description="When records need review, sign-off or follow-up, manager actions will appear here." /> : null}
          </div>
        </section>
      </section>

      <section className="ic-section-grid-3">
        <section className="ic-live-card">
          <p className="ic-eyebrow">Chronology</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">The journey over time</h2>
          <div className="mt-5 grid gap-3">
            {chronology.slice(0, 5).map((event, index) => (
              <article key={String(event.id || index)} className="ic-soft-row">
                <p className="text-sm font-black text-slate-950">{recordTitle(event as any, 'Chronology event')}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{String(event.dateTime || event.createdAt || 'Date not returned')}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{event.summary || event.fullText || 'No summary returned.'}</p>
              </article>
            ))}
            {!chronology.length ? <EmptyGentle title="No chronology entries yet" description="Signed-off records and important life events will appear here as the child’s story develops." /> : null}
          </div>
        </section>

        <section className="ic-live-card">
          <p className="ic-eyebrow">Plans and documents</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">What support is built around me</h2>
          <div className="mt-5 grid gap-3">
            {bundle.plans.concat(documents as any).slice(0, 5).map((row: any, index: number) => (
              <article key={String(row.id || index)} className="ic-soft-row">
                <p className="text-sm font-black text-slate-950">{recordTitle(row, 'Record')}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{text(row, ['status', 'workflow_status'], 'status not returned')}</p>
              </article>
            ))}
            {!bundle.plans.concat(documents as any).length ? <EmptyGentle title="No plans or documents returned" description="Care plans, risk plans and child documents will appear here when linked." /> : null}
          </div>
        </section>

        <section className="ic-live-card">
          <p className="ic-eyebrow">Evidence</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">What can be shown safely</h2>
          <div className="mt-5 grid gap-3">
            {evidence.slice(0, 5).map((item) => (
              <article key={String(item.id)} className="ic-soft-row">
                <p className="text-sm font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{item.quality}</p>
              </article>
            ))}
            {!evidence.length ? <EmptyGentle title="No linked evidence yet" description="Evidence linked to care, plans, risks and outcomes will appear here when available to your role." /> : null}
          </div>
        </section>
      </section>

      <section className="ic-live-card">
        <p className="ic-eyebrow">Live source check</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">This page is still connected to the live OS data</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {[
            ['Workspace', workspaceResult.source === 'live' ? 'live OS workspace' : workspaceResult.warning || 'workspace unavailable'],
            ['Chronology', `${chronology.length} row${chronology.length === 1 ? '' : 's'}`],
            ['Documents', `${documents.length} row${documents.length === 1 ? '' : 's'}`],
            ['Evidence', `${evidence.length} row${evidence.length === 1 ? '' : 's'}`],
            ['Actions', `${actions.length} row${actions.length === 1 ? '' : 's'}`]
          ].map(([label, value]) => <SoftRow key={label} label={label} value={value} />)}
        </div>
      </section>
    </div>
  )
}

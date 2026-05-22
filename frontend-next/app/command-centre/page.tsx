import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalQuickActions } from '@/components/indicare/operational/operational-quick-actions'
import { Card, PageHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { IntelligenceActionsCard } from '@/components/command-centre/intelligence-actions-card'
import { CareHubIntelligenceWidgets } from '@/components/indicare/care-hub/care-hub-widgets'
import { CareHubLiveStreamBar } from '@/components/indicare/care-hub/care-hub-live-stream'
import {
  getCareHub,
  mapCareHubGovernanceSlice,
  mapCareHubToCommandCentre,
  mapCareHubWorkforceSlice
} from '@/lib/os-api/care-hub'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'
import { buildCommandCentreSignals, buildReflectivePrompts } from '@/lib/operational/cognition-metrics'

function childName(child: { preferredName?: string; displayName?: string; firstName?: string; name?: string; full_name?: string; id?: string | number }) {
  return child.preferredName || child.displayName || child.firstName || child.name || child.full_name || `Young person ${child.id}`
}

function eventText(event: { title?: string; summary?: string; fullText?: string; eventType?: string; sourceType?: string; category?: string; tags?: string[] }) {
  return `${event.title || ''} ${event.summary || ''} ${event.fullText || ''} ${event.eventType || ''} ${event.sourceType || ''} ${event.category || ''} ${(event.tags || []).join(' ')}`.toLowerCase()
}

function countEvents(events: Array<{ title?: string; summary?: string; fullText?: string; eventType?: string; sourceType?: string; category?: string; tags?: string[] }>, pattern: RegExp) {
  return events.filter((event) => pattern.test(eventText(event))).length
}

function shortDate(value?: string) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function buildLiveFeed(platformData: {
  chronology: Array<{
    id: string
    title: string
    summary?: string
    fullText?: string
    eventType: string
    sourceType: string
    sourceId?: string
    dateTime?: string
    createdAt?: string
  }>
  actions: Array<{ id: string; title: string; description?: string; status: string; priority?: string; dueDate?: string; createdAt?: string }>
}) {
  const chronology = platformData.chronology.slice(0, 8).map((event) => ({
    id: `chronology-${event.id}`,
    title: event.title || event.eventType.replaceAll('_', ' '),
    body: event.summary || event.fullText || 'Chronology event available for review.',
    type: event.sourceType || event.eventType,
    href: event.sourceId ? `/chronology/${encodeURIComponent(event.id)}` : '/chronology',
    date: event.dateTime || event.createdAt
  }))
  const actions = platformData.actions
    .filter((action) => action.status !== 'completed')
    .slice(0, 4)
    .map((action) => ({
      id: `action-${action.id}`,
      title: action.title,
      body: action.description || 'Open action awaiting follow-up.',
      type: action.priority === 'urgent' ? 'urgent action' : 'action',
      href: '/actions',
      date: action.dueDate || action.createdAt
    }))
  return [...chronology, ...actions].slice(0, 10)
}

function buildCognitionItems(
  platformData: ReturnType<typeof mapCareHubToCommandCentre>['data'],
  governanceData: ReturnType<typeof mapCareHubGovernanceSlice>,
  workforceData: ReturnType<typeof mapCareHubWorkforceSlice>
) {
  const prompts = buildReflectivePrompts(platformData, governanceData, workforceData)
  const evidenceGaps = Number(governanceData.summary?.evidence_gaps || 0)
  return [
    { label: 'What changed today', value: `${platformData.chronology.length} live records visible`, href: '/chronology' },
    { label: 'What needs attention', value: platformData.attention[0]?.title || 'No urgent care hub alerts returned', href: platformData.attention[0]?.href || '/command-centre' },
    { label: 'Safeguarding themes', value: platformData.safeguarding.length ? `${platformData.safeguarding.length} safeguarding records in view` : 'No open safeguarding queue returned', href: '/safeguarding' },
    { label: 'Child voice gaps', value: platformData.attention.find((item) => item.id === 'child-voice')?.body || prompts[1], href: '/chronology' },
    { label: 'Emotional atmosphere', value: prompts[0], href: '/orb?context=care-hub&q=What is the emotional atmosphere in the home today?' },
    { label: 'Evidence gaps', value: evidenceGaps ? `${evidenceGaps} possible evidence gaps need review` : 'No evidence gaps returned by governance', href: '/governance/command-centre' },
    { label: 'Manager review prompts', value: prompts[prompts.length - 1] || 'Review child impact, safeguarding clarity and evidence links.', href: '/management' }
  ]
}

export default async function UnifiedCommandCentrePage() {
  const [careHub, people] = await Promise.all([getCareHub({ limit: 50 }), getOsYoungPeople()])
  const platform = mapCareHubToCommandCentre(careHub, people)
  const platformData = platform.data
  const governanceData = mapCareHubGovernanceSlice(careHub.data)
  const workforceData = mapCareHubWorkforceSlice(careHub.data)
  const signals = buildCommandCentreSignals(platformData, governanceData, workforceData)
  const selectedChild = platformData.children?.[0]
  const recentIncidents = countEvents(platformData.chronology, /incident|restraint|physical intervention|distress|harm/)
  const missingEpisodes = countEvents(platformData.chronology, /missing|unauthorised absence|away from home/)
  const appointments = countEvents(platformData.chronology, /appointment|health|education review|meeting/)
  const medicationAttention = countEvents(platformData.chronology, /medication|medicine|missed dose|refused medication|health/)
  const familyTime = countEvents(platformData.chronology, /family|contact|phone call|visit/)
  const educationConcerns = countEvents(platformData.chronology, /education|school|attendance|exclusion|learning/)
  const outstandingActions = platformData.actions.filter((action) => action.status !== 'completed').length
  const handoverStatus = countEvents(platformData.chronology, /handover|shift summary/) ? 'handover visible' : 'needs handover check'
  const feed = buildLiveFeed(platformData)
  const cognitionItems = buildCognitionItems(platformData, governanceData, workforceData)

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Care Hub"
        title="Today in the home"
        description="One calm starting point for the shift: children, staff, live records, evidence, actions and ORB cognition in the same operational picture."
        action={
          <Link
            prefetch={false}
            href="/orb?context=care-hub&q=What needs attention now?"
            className="inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20"
          >
            Ask ORB
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <LiveDataStatus result={platform} />
        <LiveDataStatus result={careHub} />
      </section>

      <CareHubLiveStreamBar
        homeId={careHub.data?.scope?.home_id != null ? String(careHub.data.scope.home_id) : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Today&apos;s home picture</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">What adults need to know before recording or handing over</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Pulled from the live Care Hub operational feed. Legacy parallel dashboard fan-out has been retired for this page.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {signals.slice(0, 4).map((signal) => (
              <StatCard key={signal.label} label={signal.label} value={signal.value} detail={signal.detail} />
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Children in home', platformData.children.length, 'Visible child records'],
              ['Staff on shift', platformData.workforce.length || Number(workforceData.summary?.queue_total || 0), 'Workforce queue from Care Hub'],
              ['Recent incidents', recentIncidents, 'Incident and distress markers'],
              ['Missing episodes', missingEpisodes, 'Missing or away-from-home markers'],
              ['Appointments', appointments, 'Health, education and meeting markers'],
              ['Medication attention', medicationAttention, 'Medication or health follow-up'],
              ['Family time', familyTime, 'Family contact and relationship records'],
              ['Education concerns', educationConcerns, 'School and learning markers'],
              ['Actions outstanding', outstandingActions, 'Open operational actions'],
              ['Handover status', handoverStatus, 'Shift continuity']
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <OperationalQuickActions
          selectedYoungPersonId={selectedChild?.id ? String(selectedChild.id) : undefined}
          selectedYoungPersonName={selectedChild ? childName(selectedChild) : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Live operational feed</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Daily care, incidents, handover, medication, appointments and actions</h2>
          <div className="mt-5 space-y-3">
            {feed.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50/50 active:scale-[0.99]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <StatusBadge value={item.type.replaceAll('_', ' ')} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{item.body}</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{shortDate(item.date)}</p>
              </Link>
            ))}
            {!feed.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-500">
                No live records were returned for the feed. Use the quick actions to create a daily note, incident or handover from the existing workflow engine.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0 bg-slate-950 text-white ring-slate-800">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">ORB cognition panel</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">Attention, atmosphere and evidence</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            ORB summary: ORB can help with IndiCare work and everyday questions. Care questions use scoped records, citations and review guardrails; everyday questions do not retrieve care records.
          </p>
          <div data-testid="care-hub-operational-pulse" className="mt-4 grid gap-2 sm:grid-cols-2">
            {['What changed today?', 'What may need review?', 'What support appears effective?', 'What should the next shift understand?'].map((prompt) => (
              <Link
                key={prompt}
                href={`/orb?context=care-hub&q=${encodeURIComponent(prompt)}`}
                className="inline-flex min-h-11 items-center rounded-2xl bg-blue-500/15 px-4 py-3 text-xs font-black text-blue-100"
              >
                {prompt}
              </Link>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {cognitionItems.map((item) => (
              <Link key={item.label} href={item.href} className="block rounded-2xl bg-white/10 p-4 transition hover:bg-white/15 active:scale-[0.99]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">{item.label}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white">{item.value}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <section data-testid="care-hub-live-intelligence" className="min-w-0">
        <CareHubIntelligenceWidgets result={careHub} payload={careHub.data?.ok ? careHub.data : null} />
      </section>

      <IntelligenceActionsCard
        homeId={careHub.data?.scope?.home_id != null ? String(careHub.data.scope.home_id) : undefined}
      />

      <Card className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Children in view</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Young people and immediate recording routes</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {platformData.children.slice(0, 6).map((child) => (
            <article key={child.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-lg font-black text-slate-950">{childName(child)}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{child.placementStatus || child.riskLevel || 'Care record visible'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/young-people/${encodeURIComponent(String(child.id))}/daily-note/new`} className="inline-flex min-h-9 items-center rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                  Daily note
                </Link>
                <Link href={`/young-people/${encodeURIComponent(String(child.id))}/incidents/new`} className="inline-flex min-h-9 items-center rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">
                  Incident
                </Link>
                <Link href={`/young-people/${encodeURIComponent(String(child.id))}/shift-handover/new`} className="inline-flex min-h-9 items-center rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  Handover
                </Link>
              </div>
            </article>
          ))}
          {!platformData.children.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-500 sm:col-span-2 xl:col-span-3">
              No young people were returned by the live context. The Care Hub remains connected to chronology, evidence, governance and ORB.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

import Link from 'next/link'

import { CareHubMetricCard } from '@/components/command-centre/care-hub-metric-card'
import { CareHubStartHero } from '@/components/command-centre/care-hub-start-hero'
import { IntelligenceActionsCard } from '@/components/command-centre/intelligence-actions-card'
import { CareHubIntelligenceWidgets } from '@/components/indicare/care-hub/care-hub-widgets'
import { CareHubLiveStreamBar } from '@/components/indicare/care-hub/care-hub-live-stream'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalQuickActions } from '@/components/indicare/operational/operational-quick-actions'
import { Card, StatusBadge } from '@/components/indicare/ui'
import {
  CARE_HUB_HOME_METRICS,
  CARE_HUB_ORB_PROMPTS,
  homeMetricDetail,
  orbPromptHref,
  signalDisplayDetail,
  signalHref
} from '@/components/command-centre/care-hub-routes'
import {
  getCareHub,
  mapCareHubGovernanceSlice,
  mapCareHubToCommandCentre,
  mapCareHubWorkforceSlice
} from '@/lib/os-api/care-hub'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'
import { buildCommandCentreSignals } from '@/lib/operational/cognition-metrics'

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

export default async function UnifiedCommandCentrePage() {
  const [careHub, people] = await Promise.all([getCareHub({ limit: 50 }), getOsYoungPeople()])
  const platform = mapCareHubToCommandCentre(careHub, people)
  const platformData = platform.data
  const governanceData = mapCareHubGovernanceSlice(careHub.data)
  const workforceData = mapCareHubWorkforceSlice(careHub.data)
  const signals = buildCommandCentreSignals(platformData, governanceData, workforceData)
  const selectedChild = platformData.children?.[0]
  const selectedChildId = selectedChild?.id ? String(selectedChild.id) : undefined
  const recentIncidents = countEvents(platformData.chronology, /incident|restraint|physical intervention|distress|harm/)
  const missingEpisodes = countEvents(platformData.chronology, /missing|unauthorised absence|away from home/)
  const appointments = countEvents(platformData.chronology, /appointment|health|education review|meeting/)
  const medicationAttention = countEvents(platformData.chronology, /medication|medicine|missed dose|refused medication|health/)
  const familyTime = countEvents(platformData.chronology, /family|contact|phone call|visit/)
  const educationConcerns = countEvents(platformData.chronology, /education|school|attendance|exclusion|learning/)
  const outstandingActions = platformData.actions.filter((action) => action.status !== 'completed').length
  const handoverStatus = countEvents(platformData.chronology, /handover|shift summary/) ? 'Ready' : 'Check'
  const feed = buildLiveFeed(platformData)
  const dataUnavailable = platform.source !== 'live' || Boolean(platform.warning || platform.error || careHub.warning || careHub.error)
  const isLoadingPicture = platform.source !== 'live' && !platform.warning && !platform.error

  const homeMetricValues: Record<string, string | number> = {
    'children-in-home': platformData.children.length,
    'staff-on-shift': platformData.workforce.length || Number(workforceData.summary?.queue_total || 0),
    'recent-incidents': recentIncidents,
    'missing-episodes': missingEpisodes,
    appointments,
    'medication-attention': medicationAttention,
    'family-time': familyTime,
    'education-concerns': educationConcerns,
    'actions-outstanding': outstandingActions,
    'handover-status': handoverStatus
  }

  return (
    <div className="space-y-6 pb-8">
      <CareHubStartHero selectedYoungPersonId={selectedChildId} />

      {isLoadingPicture ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600" role="status">
          Loading today&apos;s home picture…
        </p>
      ) : null}

      {dataUnavailable ? (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-semibold leading-6 text-amber-950">
          Some live information could not be loaded. You can still record and ask ORB.
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <LiveDataStatus result={platform} />
          <LiveDataStatus result={careHub} />
        </section>
      )}

      <CareHubLiveStreamBar
        homeId={careHub.data?.scope?.home_id != null ? String(careHub.data.scope.home_id) : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Where you are</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Today&apos;s home picture</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Tap a card to open the right place. Numbers are a guide — your next action matters most.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {signals.map((signal) => (
              <CareHubMetricCard
                key={signal.label}
                label={signal.label}
                value={signal.value}
                detail={signalDisplayDetail(signal)}
                href={signalHref(signal)}
              />
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CARE_HUB_HOME_METRICS.map((definition) => (
              <CareHubMetricCard
                key={definition.key}
                label={definition.label}
                value={homeMetricValues[definition.key] ?? 0}
                detail={homeMetricDetail(definition, homeMetricValues[definition.key] ?? 0)}
                href={definition.href}
              />
            ))}
          </div>
        </Card>

        <OperationalQuickActions
          variant="care-hub"
          selectedYoungPersonId={selectedChildId}
          selectedYoungPersonName={selectedChild ? childName(selectedChild) : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">What to know</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Live records from today</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Daily care, incidents, handover, medication, appointments and actions — newest first.</p>
          <div className="mt-5 space-y-3">
            {feed.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                aria-label={`Open ${item.title}`}
                className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.99]"
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
                No live records in the feed yet. Use the actions above to write a daily note, record an incident or complete handover.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0 bg-slate-950 text-white ring-slate-800">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">How ORB can help</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">Ask ORB on this shift</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            ORB summary: ORB can help with IndiCare work and everyday questions. Care questions use scoped records, citations and review guardrails; everyday questions do not retrieve care records. ORB does not replace manager or safeguarding decisions.
          </p>
          <div data-testid="care-hub-operational-pulse" className="mt-4 grid gap-2 sm:grid-cols-2">
            {['What changed today?', 'What may need review?', 'What support appears effective?', 'What should the next shift understand?'].map((prompt) => (
              <Link
                key={prompt}
                href={orbPromptHref(prompt)}
                className="inline-flex min-h-11 items-center rounded-2xl bg-blue-500/15 px-4 py-3 text-xs font-black text-blue-100 transition hover:bg-blue-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
              >
                {prompt}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {CARE_HUB_ORB_PROMPTS.map((prompt) => (
              <Link
                key={prompt.label}
                href={orbPromptHref(prompt.query)}
                className="block min-h-11 rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
              >
                {prompt.label}
              </Link>
            ))}
          </div>
          <Link
            href="/assistant/orb?context=care-hub"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-black text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
          >
            Open ORB
          </Link>
        </Card>
      </div>

      <section data-testid="care-hub-live-intelligence" className="min-w-0">
        <CareHubIntelligenceWidgets result={careHub} payload={careHub.data?.ok ? careHub.data : null} />
      </section>

      <IntelligenceActionsCard
        homeId={careHub.data?.scope?.home_id != null ? String(careHub.data.scope.home_id) : undefined}
      />

      <Card className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Where to click</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Children in view</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Open a child to record daily notes, incidents or handover.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {platformData.children.slice(0, 6).map((child) => (
            <article key={child.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Link
                href={`/young-people/${encodeURIComponent(String(child.id))}/journey`}
                className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <p className="text-lg font-black text-slate-950">{childName(child)}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{child.placementStatus || child.riskLevel || 'Care record visible'}</p>
              </Link>
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
              No young people were returned for this scope. You can still record from Children or ask ORB for guidance.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

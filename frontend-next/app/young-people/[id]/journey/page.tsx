import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ClipboardPlus, FileText, Sparkles } from 'lucide-react'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getChildJourneyData, todayLong } from '@/lib/child-journey/data'
import { childOperationalQuickActions, childQuickActionHref } from '@/lib/child-journey/workflows'
import { getEntityRoute } from '@/lib/navigation/entity-resolver'
import type { OsApiResult } from '@/lib/os-api/types'

function ActionLink({ href, children, tone = 'dark' }: { href: string; children: React.ReactNode; tone?: 'dark' | 'light' | 'blue' }) {
  const classes = tone === 'dark'
    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
    : tone === 'blue'
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
      : 'border border-slate-200 bg-white text-slate-700 shadow-sm'
  return <Link href={href} className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${classes}`}>{children}</Link>
}

function savedRecordHref(childId: string, routeType?: string, recordId?: string) {
  if (!recordId) return undefined
  if (routeType === 'family-contact') return `/young-people/${encodeURIComponent(childId)}/chronology?source=${encodeURIComponent(recordId)}`
  return getEntityRoute({ entity_type: routeType || 'chronology', entity_id: recordId, linked_child_id: childId })
}

export default async function ChildJourneyPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; status?: string; recordId?: string; limitation?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const data = await getChildJourneyData(id)
  const child = data.child
  if (!child && data.source === 'live') notFound()

  const childName = child?.preferredName || child?.displayName || `Young person ${id}`
  const savedHref = savedRecordHref(id, query.saved, query.recordId)
  const selectorResult: OsApiResult<unknown> = { data, source: data.source, error: data.error }
  const lastDailyNote = data.dailyNotes[0]
  const actionsDueToday = data.actions.filter((action) => ['open', 'overdue', 'in_progress'].includes(action.status)).slice(0, 4)
  const attentionLevel = data.timeline.some((event) => ['high', 'critical'].includes(event.severity)) ? 'Attention needed' : 'Stable today'
  const welfareSummary = lastDailyNote?.summary || data.timeline[0]?.summary || 'No daily note has been recorded yet today.'

  const plans = [
    ['Care plan', `/documents?young_person_id=${encodeURIComponent(id)}&type=care_plan`],
    ['Risk assessment', `/risk-assessments?young_person_id=${encodeURIComponent(id)}`],
    ['Placement plan', `/placements?young_person_id=${encodeURIComponent(id)}`],
    ['Education plan', `/documents?young_person_id=${encodeURIComponent(id)}&type=education`],
    ['Health note / plan update', `/young-people/${encodeURIComponent(id)}/health/new`],
    ['Behaviour support plan', `/documents?young_person_id=${encodeURIComponent(id)}&type=behaviour_support_plan`],
    ['Family contact plan', `/documents?young_person_id=${encodeURIComponent(id)}&type=family_contact`],
    ['Keywork goals', `/keywork?young_person_id=${encodeURIComponent(id)}`]
  ]

  const evidenceLinks = [
    ['LAC review evidence', `/reports/lac-review/${encodeURIComponent(id)}`],
    ['Reg 45 evidence', `/reports/reg45/${encodeURIComponent(id)}`],
    ['Safeguarding chronology', `/young-people/${encodeURIComponent(id)}/chronology?filter=safeguarding`],
    ['Reports linked to this child', `/reports?young_person_id=${encodeURIComponent(id)}`]
  ]

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500" aria-label="Breadcrumb">
        <Link href="/home" className="hover:text-blue-700">Home</Link>
        <span>/</span>
        <Link href={`/young-people/${encodeURIComponent(id)}/journey`} className="hover:text-blue-700">{childName}</Link>
        <span>/</span>
        <span className="text-slate-900">Journey</span>
      </nav>

      {query.saved ? (
        <div className={`rounded-[28px] border p-5 ${query.status === 'draft' ? 'border-amber-100 bg-amber-50 text-amber-900' : 'border-emerald-100 bg-emerald-50 text-emerald-900'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${query.status === 'draft' ? 'text-amber-700' : 'text-emerald-700'}`}>{query.status === 'draft' ? 'Draft saved locally' : 'Saved'}</p>
              <h2 className="mt-1 text-xl font-black">{query.status === 'draft' ? "Draft saved locally. It has not yet been added to the child's record." : `Record linked to ${childName}'s journey`}</h2>
              <p className={`mt-2 text-sm leading-6 ${query.status === 'draft' ? 'text-amber-800' : 'text-emerald-800'}`}>{query.status === 'draft' ? 'Please return to this workflow and save again when the live backend is available.' : 'The timeline and actions panel will show the record from the live backend when the linked projection is available.'}</p>
              {query.limitation ? <p className="mt-2 text-sm font-bold leading-6 text-amber-800">Limitation: {query.limitation}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionLink href={`/young-people/${encodeURIComponent(id)}/chronology`} tone="light">View in chronology</ActionLink>
              {savedHref ? <ActionLink href={savedHref} tone="light">Open source record</ActionLink> : null}
            </div>
          </div>
        </div>
      ) : null}

      <LiveDataStatus result={selectorResult as OsApiResult<any>} />

      <header className="rounded-[36px] border border-white/80 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Child journey</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.07em] text-slate-950">{childName}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">{welfareSummary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge value={child?.placementStatus || child?.status || 'Active placement'} />
              <RiskBadge value={(child?.riskLevel || 'medium') as any} />
              <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-800">{attentionLevel}</span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">{todayLong()}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="blue">
              <ClipboardPlus className="mr-2 h-4 w-4" aria-hidden />
              Add Daily Note
            </ActionLink>
            <ActionLink href={`/assistant?youngPersonId=${encodeURIComponent(id)}`} tone="light">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Ask Orb
            </ActionLink>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="1. Child story" title="Today's care picture" description="The most recent narrative, daily recording state and change since the last update." />
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-[26px] border border-slate-100 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Welfare summary</p>
                <p className="mt-3 text-base leading-8 text-slate-700">{welfareSummary}</p>
              </div>
              <div className="rounded-[26px] border border-blue-100 bg-blue-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Recording</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{lastDailyNote ? 'Started today' : 'Needs daily note'}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Last update: {lastDailyNote?.noteDate || data.timeline[0]?.occurredAt || 'None today'}</p>
                <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="dark">Record now</ActionLink>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="2. What changed" title="Recent chronology" description="Five high-signal events. Open the full chronology for deeper review." />
            <div className="space-y-3">
              {data.timeline.slice(0, 5).map((event) => (
                <Link key={event.id} href={event.href} className="group block rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:border-blue-100 hover:bg-white hover:shadow-lg">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">{event.category}</span>
                    <RiskBadge value={(event.severity || 'medium') as any} />
                    <span className="text-xs font-bold text-slate-400">{event.occurredAt}</span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{event.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{event.summary}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" aria-hidden />
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <ActionLink href={`/young-people/${encodeURIComponent(id)}/chronology`} tone="light">Open full chronology</ActionLink>
            </div>
          </Card>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <Card>
            <SectionHeader eyebrow="3. Needs attention" title="Next actions" description="One action list, no duplicate review/complete buttons." />
            <div className="space-y-3">
              {actionsDueToday.length ? actionsDueToday.map((action) => (
                <Link key={action.id} href={`/actions/${encodeURIComponent(action.id)}`} className="block rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
                  <StatusBadge value={action.status} />
                  <p className="mt-2 text-sm font-black text-slate-950">{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{action.description || 'Open action for review or completion.'}</p>
                </Link>
              )) : <p className="text-sm leading-6 text-slate-500">No open actions due for this child.</p>}
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="4. Record" title="Quick recording" description="Contextual actions for this child only." />
            <div className="grid gap-2">
              {childOperationalQuickActions.map((action) => (
                <Link key={action.id} href={childQuickActionHref(id, action)} className="group rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-blue-100 hover:bg-blue-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{action.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" aria-hidden />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <details className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <summary className="cursor-pointer text-sm font-black text-slate-950">Plans, evidence and reports</summary>
            <div className="mt-4 grid gap-2">
              {plans.slice(0, 5).map(([label, href]) => (
                <Link key={label} href={href} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">
                  {label}
                </Link>
              ))}
              {evidenceLinks.map(([label, href]) => (
                <Link key={label} href={href} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">
                  <FileText className="mr-2 inline h-4 w-4 text-blue-700" aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </aside>
      </section>
    </div>
  )
}

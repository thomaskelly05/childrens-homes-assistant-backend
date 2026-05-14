import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardPlus, FileText, Sparkles } from 'lucide-react'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { NarrativeContinuityPanel } from '@/components/narrative/narrative-continuity-panel'
import { WorkflowSaveIndicator } from '@/components/system-feedback/workflow-save-indicator'
import { getChildJourneyData, todayLong } from '@/lib/child-journey/data'
import { childQuickActionHref, contextualChildQuickActions } from '@/lib/child-journey/workflows'
import { getEntityRoute } from '@/lib/navigation/entity-resolver'
import { buildNarrativeContinuity } from '@/lib/narrative/continuity'
import type { OsApiResult } from '@/lib/os-api/types'
import { saveStateFromStatus } from '@/lib/workflows/reliability'

function ActionLink({
  href,
  children,
  tone = 'dark',
  testId
}: {
  href: string
  children: React.ReactNode
  tone?: 'dark' | 'light' | 'blue'
  testId?: string
}) {
  const classes = tone === 'dark'
    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
    : tone === 'blue'
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
      : 'border border-slate-200 bg-white text-slate-700 shadow-sm'
  return <Link href={href} data-testid={testId} className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${classes}`}>{children}</Link>
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
  const savedIndicator = query.saved ? saveStateFromStatus(query.status || 'saved') : null
  const narrativeContinuity = buildNarrativeContinuity(data)
  const quickActions = contextualChildQuickActions({ workflow: 'journey', unresolvedActions: actionsDueToday.length })

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
        <div data-testid="save-state-message" className={`rounded-[28px] p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)] ring-1 ${query.status === 'draft' ? 'bg-amber-50 text-amber-900 ring-amber-100' : 'bg-emerald-50 text-emerald-900 ring-emerald-100'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {savedIndicator ? <WorkflowSaveIndicator snapshot={savedIndicator} compact /> : null}
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${query.status === 'draft' ? 'text-amber-700' : 'text-emerald-700'}`}>{query.status === 'draft' ? 'Draft saved locally' : 'Saved'}</p>
              <h2 className="mt-1 text-xl font-black">{query.status === 'draft' ? "Draft saved locally. It has not yet been added to the child's record." : `Record linked to ${childName}'s journey`}</h2>
              <p className={`mt-2 text-sm leading-6 ${query.status === 'draft' ? 'text-amber-800' : 'text-emerald-800'}`}>{query.status === 'draft' ? 'Please return to this workflow and save again when the live backend is available.' : 'The timeline and actions panel will show the record from the live backend when the linked projection is available.'}</p>
              {query.limitation ? <p className="mt-2 text-sm font-bold leading-6 text-amber-800">Limitation: {query.limitation}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionLink href={`/young-people/${encodeURIComponent(id)}/chronology`} tone="light" testId="saved-chronology-link">View in chronology</ActionLink>
              {savedHref ? <ActionLink href={savedHref} tone="light">Open source record</ActionLink> : null}
            </div>
          </div>
        </div>
      ) : null}

      <LiveDataStatus result={selectorResult as OsApiResult<any>} />

      <header className="rounded-[40px] bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur">
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
            <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="blue" testId="add-daily-note-button">
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

      <NarrativeContinuityPanel childName={childName} continuity={narrativeContinuity} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Today" title="Today's care picture" description="Daily recording status, last update and immediate actions." />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Daily recording status</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{lastDailyNote ? 'Started today' : 'Needs daily note'}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Last update: {lastDailyNote?.noteDate || data.timeline[0]?.occurredAt || 'None today'}</p>
                <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="dark" testId="add-daily-note-secondary-button">Add / update daily note</ActionLink>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Welfare quick summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{welfareSummary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
                  {['Welfare', 'Sleep', 'Health', 'Education', 'Family time'].map((label) => (
                    <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
                      {label}
                    </span>
                  ))}
                </div>
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
            <SectionHeader eyebrow="Recording" title="What do you need to record?" description="Every button opens a real child-linked workflow." />
            <div className="grid gap-3">
              {quickActions.map((action) => {
                const href = childQuickActionHref(id, action)
                return (
                  <Link key={action.id} href={href} data-testid={`workflow-link-${action.id}`} className="group rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{action.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" aria-hidden />
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Journey timeline" title="Recent chronology" description="Open each item to view the source record, or open the full chronology." />
          <div className="mb-5 flex flex-wrap gap-2">
            <ActionLink href={`/young-people/${encodeURIComponent(id)}/chronology`} tone="light" testId="chronology-link">Open full chronology</ActionLink>
          </div>
          <div className="space-y-4">
            {data.timeline.slice(0, 8).map((event) => (
              <Link key={event.id} href={event.href} className="block rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:border-blue-100 hover:bg-white hover:shadow-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">{event.category}</span>
                  <RiskBadge value={(event.severity || 'medium') as any} />
                  <span className="text-xs font-bold text-slate-400">{event.occurredAt}</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950">{event.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{event.summary}</p>
                <span className="mt-3 inline-flex text-xs font-black uppercase tracking-[0.14em] text-blue-700">Open source record</span>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <details className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <summary className="cursor-pointer text-sm font-black text-slate-950">Plans, evidence and reports</summary>
            <div className="mt-4 grid gap-2">
              {plans.slice(0, 5).map(([label, href]) => (
                <Link key={label} href={href} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">
                  {label}
                </Link>
              ))}
            </div>
          </details>

          <Card>
            <SectionHeader eyebrow="Current actions" title="Action cards" description="Review or complete from the live actions workspace." />
            <div className="mb-4">
              <ActionLink href="/management" tone="light" testId="manager-review-link">Open manager QA path</ActionLink>
            </div>
            <div className="space-y-3">
              {data.actions.slice(0, 5).map((action) => (
                <div key={action.id} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <StatusBadge value={action.status} />
                  <h3 className="mt-2 text-sm font-black text-slate-950">{action.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/actions/${encodeURIComponent(action.id)}`} data-testid="safeguarding-follow-up-action" className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">Open action</Link>
                  </div>
                </div>
              ))}
              {!data.actions.length ? <p className="text-sm text-slate-500">No current actions are linked to this child yet. Manager QA is still available from the review path.</p> : null}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Daily notes" title="Recent daily recording" description="Daily notes are the main driver for this journey." />
          <div className="space-y-3">
            {data.dailyNotes.map((note) => (
              <Link key={note.id} href={note.href} className="block rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={note.workflowStatus || 'recorded'} />
                  <span className="text-xs font-bold text-slate-400">{note.noteDate}</span>
                </div>
                <h3 className="mt-2 text-sm font-black text-slate-950">{note.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{note.summary}</p>
              </Link>
            ))}
            {!data.dailyNotes.length ? <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="blue">Add the first daily note</ActionLink> : null}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Evidence and reports" title="Linked evidence" description="Report-ready views and evidence items connected to this child." />
          <div className="grid gap-3 sm:grid-cols-2">
            {evidenceLinks.map(([label, href]) => (
              <Link key={label} href={href} data-testid={label.includes('Safeguarding') ? 'safeguarding-chronology-link' : label.includes('Reports') ? 'report-evidence-link' : undefined} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
                <FileText className="h-5 w-5 text-blue-700" aria-hidden />
                <span className="mt-3 block text-sm font-black text-slate-950">{label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {data.evidence.slice(0, 4).map((item) => (
              <Link key={item.id} href={`/evidence/${encodeURIComponent(item.id)}`} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                <span>
                  <span className="block text-sm font-black text-slate-950">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description || item.linkedRegulation || 'Evidence item'}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Adult-friendly next step</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">If in doubt, add a Daily Note first.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Daily notes can suggest actions, safeguarding flags, plan links and report relevance before saving.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionLink href="/handover/current" tone="light" testId="handover-link">Open handover</ActionLink>
            <ActionLink href={`/reports?young_person_id=${encodeURIComponent(id)}`} tone="light" testId="reports-link">Open reports</ActionLink>
            <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="blue" testId="add-daily-note-footer-button">
            <CalendarDays className="mr-2 h-4 w-4" aria-hidden />
            Add Daily Note
            </ActionLink>
          </div>
        </div>
      </section>
    </div>
  )
}

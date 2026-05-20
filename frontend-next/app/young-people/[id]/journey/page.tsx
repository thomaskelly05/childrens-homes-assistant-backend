import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardPlus, FileText, Sparkles } from 'lucide-react'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { NarrativeContinuityPanel } from '@/components/narrative/narrative-continuity-panel'
import { WorkflowSaveIndicator } from '@/components/system-feedback/workflow-save-indicator'
import { getChildExperienceIntelligence, getChildJourneyData, todayLong } from '@/lib/child-journey/data'
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

function bulletList(items: string[] | undefined, empty: string) {
  const visible = Array.isArray(items) ? items.filter(Boolean).slice(0, 4) : []
  if (!visible.length) return <p className="text-sm font-bold leading-6 text-slate-500">{empty}</p>
  return (
    <ul className="space-y-2 text-sm font-bold leading-6 text-slate-700">
      {visible.map((item, index) => <li key={`${item}-${index}`}>- {item}</li>)}
    </ul>
  )
}

export default async function ChildJourneyPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; status?: string; recordId?: string; limitation?: string; focus?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const [data, experienceResult] = await Promise.all([
    getChildJourneyData(id),
    getChildExperienceIntelligence(id)
  ])
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
  const experienceIntelligence = experienceResult.intelligence
  const quickActions = contextualChildQuickActions({ workflow: 'journey', unresolvedActions: actionsDueToday.length })
  const focus = query.focus || ''
  const supportSignals = [...data.timeline, ...data.dailyNotes].filter((item) => /settled|calm|helped|support|routine|keywork|trusted|positive|progress|achiev/i.test(`${item.title} ${item.summary}`)).slice(0, 4)
  const relationshipSignals = [...data.timeline, ...data.dailyNotes].filter((item) => /trusted|relationship|family|contact|repair|key worker|staff|friend|peer/i.test(`${item.title} ${item.summary}`)).slice(0, 4)
  const difficultySignals = [...data.timeline, ...data.dailyNotes].filter((item) => /upset|distress|incident|missing|safeguarding|risk|anxious|review/i.test(`${item.title} ${item.summary}`)).slice(0, 4)
  const childVoiceSignals = [...data.timeline, ...data.dailyNotes].filter((item) => /voice|said|told staff|wishes|feelings|choice|preferred|about me/i.test(`${item.title} ${item.summary}`)).slice(0, 4)
  const livedExperienceRows = [
    ['What is helping?', supportSignals[0]?.summary || data.story.progressHighlights[0] || 'No stabilising support marker returned yet.'],
    ['What has changed?', narrativeContinuity.whatChanged],
    ['What remains difficult?', difficultySignals[0]?.summary || narrativeContinuity.unresolvedThemes[0] || 'No active difficulty marker returned in the visible story.'],
    ['What support appears calming?', supportSignals.find((item) => /calm|settled|routine|trusted/i.test(`${item.title} ${item.summary}`))?.summary || 'Review daily notes for calm, routine, trusted adult and repair evidence.'],
    ['Where is child voice strongest?', childVoiceSignals[0]?.title || narrativeContinuity.childVoiceContinuity],
    ['Where may emotional safety need review?', difficultySignals[0]?.title || actionsDueToday[0]?.title || 'No emotional safety review signal returned yet.']
  ]
  const relationshipRows = [
    ['Trusted adult visibility', relationshipSignals.find((item) => /trusted|key worker|staff/i.test(`${item.title} ${item.summary}`))?.title || 'No trusted adult marker returned yet'],
    ['Relationship consistency', relationshipSignals.length ? `${relationshipSignals.length} relationship marker(s) in visible records` : 'No relationship continuity marker returned'],
    ['Family relationship quality', relationshipSignals.find((item) => /family|contact/i.test(`${item.title} ${item.summary}`))?.summary || 'No family contact marker returned'],
    ['Repair after incidents', relationshipSignals.find((item) => /repair|debrief|restorative/i.test(`${item.title} ${item.summary}`))?.summary || 'No repair marker returned'],
    ['Positive interactions', supportSignals.find((item) => /positive|enjoy|achiev|progress/i.test(`${item.title} ${item.summary}`))?.title || 'No positive interaction marker returned'],
    ['Child emotional safety indicators', narrativeContinuity.emotionalContinuity]
  ]

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
    ['LAC review evidence', `/reports?young_person_id=${encodeURIComponent(id)}&type=lac_review`],
    ['Reg 45 evidence', `/reports?young_person_id=${encodeURIComponent(id)}&type=reg45`],
    ['Safeguarding chronology', `/young-people/${encodeURIComponent(id)}/chronology?filter=safeguarding`],
    ['Reports linked to this child', `/reports?young_person_id=${encodeURIComponent(id)}`]
  ]

  const workspaceLinks = [
    ['About Me', `/young-people/${encodeURIComponent(id)}/about-me/new`, 'Update identity, voice, routines, sensory needs and trusted adults.'],
    ['Child Voice', `/young-people/${encodeURIComponent(id)}/child-voice/new`, 'Record you said, we did and how adults listened.'],
    ['Wellbeing check', `/young-people/${encodeURIComponent(id)}/wellbeing-check/new`, 'Record mood, sleep, appetite, relationships and what helped.'],
    ['Relationship record', `/young-people/${encodeURIComponent(id)}/relationship-record/new`, 'Record trusted adults, family, peers, repair and impact.'],
    ['Daily note', `/young-people/${encodeURIComponent(id)}/daily-note/new`, 'Record today, child voice, positives and follow-up.'],
    ['Incident', `/young-people/${encodeURIComponent(id)}/incidents/new`, 'Capture facts, staff response, outcome and review.'],
    ['Safeguarding concern', `/young-people/${encodeURIComponent(id)}/safeguarding/new`, 'Record concern and safety actions without conclusions.'],
    ['Missing episode', `/young-people/${encodeURIComponent(id)}/missing/new`, 'Record missing actions, return and risk review.'],
    ['Medication', `/young-people/${encodeURIComponent(id)}/medication-record/new`, 'Record medication administration, refusal, missed dose or error.'],
    ['Education', `/young-people/${encodeURIComponent(id)}/education-update/new`, 'Record school, learning, attendance, achievement and support.'],
    ['Health', `/young-people/${encodeURIComponent(id)}/health/new`, 'Record health presentation, advice, appointments and follow-up.'],
    ['Family Time', `/young-people/${encodeURIComponent(id)}/family-contact/new`, 'Record contact, presentation, child voice and relationship support.'],
    ['Keywork', `/young-people/${encodeURIComponent(id)}/keywork/new`, 'Record direct work, strengths, worries and what adults will do next.'],
    ['Physical intervention', `/young-people/${encodeURIComponent(id)}/physical-intervention/new`, 'Record intervention, de-escalation, debrief and repair.'],
    ['Chronology', `/young-people/${encodeURIComponent(id)}/chronology`, 'Review source-linked events for this child only.'],
    ['Actions', `/actions?young_person_id=${encodeURIComponent(id)}`, 'Open unresolved follow-up in the action workflow.'],
    ['Evidence', `/evidence?young_person_id=${encodeURIComponent(id)}`, 'Review linked evidence and gaps.'],
    ['Documents', `/documents?young_person_id=${encodeURIComponent(id)}`, 'Open child-scoped documents and versions.'],
    ['Plans & Risk', `/young-people/${encodeURIComponent(id)}/support-plan/new`, 'Write support plans and link them to risk and chronology.'],
    ['Risk assessments', `/young-people/${encodeURIComponent(id)}/risk-assessment/new`, 'Review or record dynamic risk assessment evidence.'],
    ['Locality risk', `/young-people/${encodeURIComponent(id)}/locality`, 'Review local places and possible indicators.'],
    ['Missing risk', `/young-people/${encodeURIComponent(id)}/missing-risk`, 'Review missing patterns and return interview gaps.'],
    ['Exploitation risk', `/young-people/${encodeURIComponent(id)}/exploitation-risk`, 'Review possible indicators and protective factors.'],
    ['Reports', `/reports?young_person_id=${encodeURIComponent(id)}`, 'Build report evidence from linked records.'],
    ['Handover', `/handover/current?young_person_id=${encodeURIComponent(id)}`, 'Prepare next-shift guidance for this child.'],
    ['Reg 44 Action', `/young-people/${encodeURIComponent(id)}/reg44-action/new`, 'Link independent visit actions to child-centred evidence.'],
    ['Reg 45 Evidence', `/young-people/${encodeURIComponent(id)}/reg45-evidence/new`, 'Link quality of care evidence to child outcomes.'],
    ['Orb', `/orb?scope=child&young_person_id=${encodeURIComponent(id)}`, 'Ask Orb for draft suggestions only.']
  ]

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500" aria-label="Breadcrumb">
        <Link href="/young-people" className="hover:text-blue-700">Children</Link>
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
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${query.status === 'draft' ? 'text-amber-700' : 'text-emerald-700'}`}>{query.status === 'draft' ? 'Draft saved' : query.status === 'submitted' ? 'Submitted' : 'Saved'}</p>
              <h2 className="mt-1 text-xl font-black">{query.status === 'draft' ? `Draft linked to ${childName}'s journey` : query.status === 'submitted' ? `Record submitted for review` : `Record linked to ${childName}'s journey`}</h2>
              <p className={`mt-2 text-sm leading-6 ${query.status === 'draft' ? 'text-amber-800' : 'text-emerald-800'}`}>{query.status === 'draft' ? 'The live source record is saved and can be edited before submission.' : 'The timeline and actions panel will show the record from the live backend when the linked projection is available.'}</p>
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
            <ActionLink href={`/orb?scope=child&young_person_id=${encodeURIComponent(id)}`} tone="light">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Ask Orb
            </ActionLink>
          </div>
        </div>
      </header>

      <NarrativeContinuityPanel childName={childName} continuity={narrativeContinuity} />

      {experienceIntelligence ? (
        <Card>
          <SectionHeader eyebrow="Existing child experience intelligence" title="Support effectiveness, voice and impact" description="This panel reuses the active child experience intelligence route so the modern journey carries the same lived-experience signals as the legacy shell." />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Experience status', experienceIntelligence.status || 'Not returned'],
              ['Risk trajectory', experienceIntelligence.trends?.risk_trajectory || experienceIntelligence.signals?.risk_level || 'Not returned'],
              ['Emotional distress', experienceIntelligence.trends?.emotional_distress || 'Not returned'],
              ['Child voice visible', experienceIntelligence.signals?.child_voice_visible ? 'Visible in records' : 'Needs checking in source records']
            ].map(([label, detail]) => (
              <div key={label} className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">{label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-950">{detail}</p>
              </div>
            ))}
          </div>
          {experienceIntelligence.summary ? <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">{experienceIntelligence.summary}</p> : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">What appears stabilising?</p>
              {bulletList(experienceIntelligence.signals?.positive_anchors, 'No stabilising anchors returned by child experience intelligence.')}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Relationship continuity</p>
              {bulletList(experienceIntelligence.signals?.relationship_mentions, 'No relationship continuity markers returned by child experience intelligence.')}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">What may Ofsted ask?</p>
              {bulletList(experienceIntelligence.ofsted_lens?.inspection_questions, 'No inspection questions returned by child experience intelligence.')}
            </div>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]" data-testid="child-lived-experience-view">
        <Card>
          <SectionHeader eyebrow="Child impact synthesis" title="What is changing for the child?" description="A lived-experience view assembled from existing chronology, daily notes, child voice, actions and narrative continuity." />
          <div className="grid gap-3 md:grid-cols-2">
            {livedExperienceRows.map(([label, detail]) => (
              <div key={label} className="rounded-[22px] border border-blue-100 bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-950">{detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Relationship intelligence" title="Emotional safety through relationships" description="Trusted adults, family contact, repair, positive interactions and child voice are surfaced from the child story already returned." />
          <div className="space-y-3">
            {relationshipRows.map(([label, detail]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="ORB child insight" title="What this tells us about lived experience" description="Calm prompts for staff and managers, grounded in the live child journey rather than a predicted Ofsted grade." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['What changed for the child?', data.story.whatChanged],
            ['What helped them feel safe?', data.story.relationshipMarkers[0] || 'No relationship evidence has been returned yet.'],
            ['What did adults do?', lastDailyNote?.summary || 'No daily note has been recorded yet today.'],
            ['What does this tell us about their lived experience?', data.story.todayMatteredBecause]
          ].map(([label, detail]) => (
            <div key={label} className="rounded-[22px] border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{label}</p>
              <p className="mt-2 text-sm font-bold leading-6 text-blue-950">{detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Connected OS hub" title={`${childName}'s linked workspaces`} description="Every route opens with this child in scope, or shows a controlled limitation in the target workspace." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {workspaceLinks.map(([label, href, description]) => (
            <Link key={label} href={href} data-testid={`journey-hub-${String(label).toLowerCase().replaceAll(' ', '-')}`} className="group rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-950">{label}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" aria-hidden />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
            </Link>
          ))}
        </div>
      </Card>

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
              {data.timeline.length ? data.timeline.slice(0, 5).map((event) => (
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
              )) : (
                <EmptyState title="No chronology yet" description="Live evidence is not yet available for this area. Add a daily note or linked record to start the child chronology." />
              )}
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
                <Link key={action.id} href={action.href || `/actions?young_person_id=${encodeURIComponent(id)}`} className="block rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
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
            {data.timeline.length ? data.timeline.slice(0, 8).map((event) => (
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
            )) : (
              <EmptyState title="No source-linked events" description="Live evidence is not yet available for this area. Submitted records will appear here with chronology, evidence and review state when the backend projection returns them." />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <details open={['plans', 'evidence', 'reports', 'risk'].includes(focus)} className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <summary className="cursor-pointer text-sm font-black text-slate-950">Plans, evidence and reports</summary>
            <div className="mt-4 grid gap-2">
              {plans.map(([label, href]) => (
                <Link key={label} href={href} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">
                  {label}
                </Link>
              ))}
            </div>
          </details>

          <Card>
            <SectionHeader eyebrow="Current actions" title="Action cards" description="Review or complete from the live actions workspace." />
            <div className="mb-4">
              <ActionLink href={`/management?young_person_id=${encodeURIComponent(id)}&focus=reviews`} tone="light" testId="manager-review-link">Open manager QA path</ActionLink>
            </div>
            <div className="space-y-3">
              {data.actions.slice(0, 5).map((action) => (
                <div key={action.id} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <StatusBadge value={action.status} />
                  <h3 className="mt-2 text-sm font-black text-slate-950">{action.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={action.href || `/actions?young_person_id=${encodeURIComponent(id)}`} data-testid="safeguarding-follow-up-action" className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">Open action</Link>
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
            {data.evidence.length ? data.evidence.slice(0, 4).map((item) => (
              <Link key={item.id} href={`/evidence/${encodeURIComponent(item.id)}`} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                <span>
                  <span className="block text-sm font-black text-slate-950">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description || item.linkedRegulation || 'Evidence item'}</span>
                </span>
              </Link>
            )) : (
              <EmptyState title="No linked evidence yet" description="Live evidence is not yet available for this area. Documents, reports and submitted records will appear when linked by the backend." />
            )}
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
            <ActionLink href={`/handover/current?young_person_id=${encodeURIComponent(id)}`} tone="light" testId="handover-link">Open handover</ActionLink>
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

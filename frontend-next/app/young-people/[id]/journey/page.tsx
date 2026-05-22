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

function ActionLink({ href, children, tone = 'dark', testId }: { href: string; children: React.ReactNode; tone?: 'dark' | 'light' | 'blue'; testId?: string }) {
  const classes = tone === 'dark'
    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
    : tone === 'blue'
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
      : 'border border-slate-200 bg-white text-slate-700 shadow-sm'
  return <Link href={href} data-testid={testId} className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${classes}`}>{children}</Link>
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

export default async function ChildJourneyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; status?: string; recordId?: string; limitation?: string; focus?: string }> }) {
  const { id } = await params
  const query = await searchParams
  const [data, experienceResult] = await Promise.all([
    getChildJourneyData(id),
    getChildExperienceIntelligence(id)
  ])

  const child = data.child
  if (!child && data.source === 'live') notFound()

  const childName = child?.preferredName || child?.displayName || `Young person ${id}`
  const selectorResult: OsApiResult<unknown> = { data, source: data.source, error: data.error }
  const lastDailyNote = data.dailyNotes[0]
  const narrativeContinuity = buildNarrativeContinuity(data)
  const experienceIntelligence = experienceResult.intelligence

  const supportSignals = [...data.timeline, ...data.dailyNotes].filter((item) => /settled|calm|helped|support|routine|keywork|trusted|positive|progress|achiev/i.test(`${item.title} ${item.summary}`)).slice(0, 4)
  const relationshipSignals = [...data.timeline, ...data.dailyNotes].filter((item) => /trusted|relationship|family|contact|repair|key worker|staff|friend|peer/i.test(`${item.title} ${item.summary}`)).slice(0, 4)
  const difficultySignals = [...data.timeline, ...data.dailyNotes].filter((item) => /upset|distress|incident|missing|safeguarding|risk|anxious|review/i.test(`${item.title} ${item.summary}`)).slice(0, 4)

  const orbInsight = supportSignals[0]?.summary
    || narrativeContinuity.whatChanged
    || experienceIntelligence?.summary
    || 'ORB has not yet identified a reflective support summary from visible records.'

  const nextShiftGuidance = difficultySignals[0]?.summary
    || relationshipSignals[0]?.summary
    || 'Continue calm routines, relationship-led support and reflective recording for the next shift.'

  return (
    <div className="space-y-6">
      <LiveDataStatus result={selectorResult as OsApiResult<any>} />

      <header className="rounded-[40px] bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Child journey</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.07em] text-slate-950">{childName}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">{lastDailyNote?.summary || 'No daily note has been recorded yet today.'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionLink href={`/young-people/${encodeURIComponent(id)}/daily-note/new`} tone="blue">
              <ClipboardPlus className="mr-2 h-4 w-4" aria-hidden />
              Add Daily Note
            </ActionLink>
            <ActionLink href={`/assistant/orb?scope=child&young_person_id=${encodeURIComponent(id)}`} tone="light">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Ask ORB
            </ActionLink>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader
            eyebrow="ORB reflective insight"
            title="What adults may need to understand"
            description="A calm summary assembled from chronology, daily notes, relationships, wellbeing and support signals already linked to this child."
          />

          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-bold leading-7 text-blue-950">{orbInsight}</p>
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">What the next shift should understand</p>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-700">{nextShiftGuidance}</p>
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Relationship continuity"
            title="What appears supportive"
            description="Existing relationship and support signals surfaced from visible child records."
          />

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Positive support</p>
              {bulletList(supportSignals.map((item) => item.summary), 'No positive support signals surfaced yet.')}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Relationship visibility</p>
              {bulletList(relationshipSignals.map((item) => item.summary), 'No relationship continuity signals surfaced yet.')}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Support needing review</p>
              {bulletList(difficultySignals.map((item) => item.summary), 'No active support concerns surfaced from visible records.')}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader
          eyebrow="One child journey"
          title="Care, voice, chronology, plans and evidence"
          description="Use these existing areas as one child-centred lived experience rather than separate recording silos."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            'About Me',
            'Child Voice',
            'Daily note',
            'Chronology',
            'Wellbeing check',
            'Education',
            'Health',
            'Medication',
            'Family Time',
            'Keywork',
            'Incident',
            'Missing episode',
            'Plans & Risk',
            'Documents',
            'Actions',
            'ORB child insight'
          ].map((section) => (
            <div key={section} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-black text-slate-900">{section}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Live evidence is not yet available for this area when no linked records are returned.</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {['What changed for the child?', 'What helped them feel safe?', 'What did adults do?'].map((question) => (
            <div key={question} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
              {question}
            </div>
          ))}
        </div>
      </Card>

      <Card data-testid="child-lived-experience-view">
        <SectionHeader
          eyebrow="Relationship intelligence"
          title="Lived experience and support meaning"
          description="A simple review frame for child voice, relationships, adult response and what changes for the child."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['What is helping?', supportSignals[0]?.summary || 'No support pattern has been returned yet.'],
            ['What remains difficult?', difficultySignals[0]?.summary || 'No active difficulty pattern has been returned yet.'],
            ['Where is child voice strongest?', experienceIntelligence?.signals?.child_voice_visible ? (experienceIntelligence.summary || 'Child voice is visible in returned intelligence.') : 'Child voice evidence has not been synthesised yet.'],
            ['Relationship intelligence', relationshipSignals[0]?.summary || 'No relationship pattern has been returned yet.']
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-black text-slate-900">{label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

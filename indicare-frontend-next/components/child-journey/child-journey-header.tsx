import Link from 'next/link'
import { CalendarDays, ClipboardPlus, FileText, Sparkles } from 'lucide-react'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import { RiskBadge, StatusBadge } from '@/components/indicare/ui'
import type { ChildJourneyData } from '@/lib/child-journey/data'
import { childJourneySummaryHref } from '@/lib/child-journey/child-journey-routes'
import { todayLong } from '@/lib/child-journey/data'

export function ChildJourneyHeader({
  childId,
  childName,
  data,
  profileHref
}: {
  childId: string
  childName: string
  data: ChildJourneyData
  profileHref: string
}) {
  const placement = data.child?.placementStatus || data.child?.status
  const risk = data.child?.riskLevel || 'medium'
  const lastNote = data.dailyNotes[0]?.summary

  return (
    <header data-testid="child-journey-header" className="os-hero rounded-[32px] bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Child journey workspace</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">{childName}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
            <CalendarDays className="h-4 w-4 text-blue-600" aria-hidden />
            {todayLong()}
            <span className="text-slate-300">·</span>
            <span data-testid="child-journey-active-context">Connected to this young person</span>
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {lastNote || 'No daily note has been recorded yet today.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {placement ? <StatusBadge value={String(placement)} /> : null}
            <RiskBadge value={risk} />
            <StatusBadge value="Permissioned OS context" />
          </div>
          <div className="mt-4">
            <OrbInlineHint
              label="ORB can help summarise this child's recent journey"
              href={childJourneySummaryHref(childId)}
              tone="cyan"
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          <Link
            href={`/young-people/${encodeURIComponent(childId)}/daily-note/new`}
            className="os-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25"
          >
            <ClipboardPlus className="h-4 w-4" aria-hidden />
            Record daily note
          </Link>
          <Link
            href={`/young-people/${encodeURIComponent(childId)}/incidents/new`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm"
          >
            Record incident
          </Link>
          <Link
            href={`/young-people/${encodeURIComponent(childId)}/chronology`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm"
          >
            <FileText className="h-4 w-4 text-blue-600" aria-hidden />
            Open chronology
          </Link>
          <Link
            href={childJourneySummaryHref(childId)}
            data-testid="child-journey-ask-orb"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20"
          >
            <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
            Ask OS ORB
          </Link>
          <Link href={profileHref} className="text-center text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:text-blue-900">
            Full profile →
          </Link>
        </div>
      </div>
    </header>
  )
}

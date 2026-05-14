import { ArrowRight, HeartHandshake, Sparkles } from 'lucide-react'

import type { NarrativeContinuitySummary } from '@/lib/narrative/continuity'

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-100">{children}</span>
}

export function NarrativeContinuityPanel({
  childName,
  continuity
}: {
  childName: string
  continuity: NarrativeContinuitySummary
}) {
  return (
    <section className="rounded-[40px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
            <HeartHandshake className="h-4 w-4" aria-hidden />
            Narrative continuity
          </div>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.07em]">Continuing {childName}&apos;s story</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">{continuity.emotionalContinuity}</p>
          <div className="mt-5 rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">Today mattered because</p>
            <p className="mt-2 text-sm leading-7 text-slate-100">{continuity.todayMatteredBecause}</p>
          </div>
          <div className="mt-5 rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">Placement journey</p>
            <p className="mt-2 text-sm leading-7 text-slate-100">{continuity.placementJourney}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">What changed?</p>
            <p className="mt-2 text-sm leading-7 text-slate-100">{continuity.whatChanged}</p>
          </div>
          <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">Unresolved themes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {continuity.unresolvedThemes.length ? continuity.unresolvedThemes.map((theme, index) => <Pill key={`${theme}-${index}`}>{theme}</Pill>) : <span className="text-sm text-slate-300">No open child-linked action themes.</span>}
            </div>
          </div>
          <div className="rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
              <Sparkles className="h-4 w-4" aria-hidden />
              Progress, relationships and voice
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...continuity.progressSummary, ...continuity.relationshipMarkers, ...continuity.recurringThemes].slice(0, 7).map((label, index) => <Pill key={`${label}-${index}`}>{label}</Pill>)}
              {!continuity.progressSummary.length && !continuity.relationshipMarkers.length && !continuity.recurringThemes.length ? <span className="text-sm text-slate-300">No visible markers yet.</span> : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-100">
              <ArrowRight className="mr-2 inline h-4 w-4" aria-hidden />
              {continuity.childVoiceContinuity}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

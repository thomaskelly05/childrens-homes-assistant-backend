'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import {
  CHILD_JOURNEY_ORB_PROMPTS,
  childJourneyOrbHref,
  childJourneyPromptHref,
  childJourneySummaryHref,
  childRecordHubHref
} from '@/lib/child-journey/child-journey-routes'
import { useOperationalContext } from '@/lib/operational/operational-context'

export function ChildJourneyOrbRail({
  childId,
  childName,
  className = ''
}: {
  childId: string
  childName: string
  className?: string
}) {
  const { operationalRole } = useOperationalContext()
  const openOrbHref = childJourneySummaryHref(childId)
  const recordingPromptHref = childJourneyOrbHref(childId, { mode: 'record_quality_review' })
  const chronologyHref = `/young-people/${encodeURIComponent(childId)}/chronology`
  const actionHref = childJourneyPromptHref(childId, 'What follow-up actions might be needed for this child?')

  const privacyLabel = operationalRole
    ? `${operationalRole.toUpperCase()} scope · child journey`
    : 'Permissioned OS context'

  return (
    <section
      data-testid="child-journey-orb-rail"
      className={`os-context-rail rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 text-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-300/25">
          <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/90">ORB on this journey</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.03em] text-white">Connected to this young person&apos;s operational workspace</h2>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
            Connected to this young person&apos;s operational workspace. ORB can help you think, record and review.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Context</p>
        <dl className="grid gap-1.5 text-xs">
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Workspace</dt>
            <dd className="mt-0.5 font-black text-slate-100">Child journey</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Child</dt>
            <dd className="mt-0.5 font-black text-slate-100">{childName}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Privacy</dt>
            <dd className="mt-0.5 font-semibold text-slate-300">{privacyLabel}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Scope</dt>
            <dd className="mt-0.5 font-semibold text-slate-300">Summary-level evidence</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Suggested prompts</p>
        {CHILD_JOURNEY_ORB_PROMPTS.map((prompt) => (
          <Link
            key={prompt.label}
            href={childJourneyPromptHref(childId, prompt.query)}
            className="block rounded-xl bg-white/6 px-3 py-2 text-[11px] font-bold text-slate-200 ring-1 ring-white/8 transition hover:bg-white/10"
          >
            {prompt.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Actions</p>
        <Link
          href={openOrbHref}
          className="os-primary-action inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Open OS ORB with this context
        </Link>
        <Link
          href={recordingPromptHref}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
        >
          Create recording prompt
        </Link>
        <Link
          href={chronologyHref}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
        >
          Review chronology
        </Link>
        <Link
          href={actionHref}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
        >
          Create action
        </Link>
        <Link
          href={childRecordHubHref(childId)}
          className="inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:text-cyan-200"
        >
          Open record hub for this child
        </Link>
      </div>

      <p className="mt-4 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-[10px] font-semibold leading-5 text-slate-500">
        ORB supports practice. It does not replace safeguarding or manager decisions.
      </p>
    </section>
  )
}

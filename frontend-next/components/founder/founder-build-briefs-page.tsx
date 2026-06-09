'use client'

import { useCallback, useState } from 'react'
import { Check, Copy, Hammer } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  generateBuildBriefFromCto,
  getBuildBriefs,
  updateBuildBriefStatus,
  type BuildBrief
} from '@/lib/founder/build-briefs'

function BriefCard({ brief, onUpdate }: { brief: BuildBrief; onUpdate: () => void }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function handleCopyPrompt() {
    void navigator.clipboard.writeText(brief.cursorPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-white">{brief.title}</h3>
        <div className="flex gap-2">
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-200">
            {brief.priority}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
            {brief.status}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-400">Created by {brief.createdBy}</p>
      <p className="mt-3 text-sm text-slate-300"><strong className="text-white">Problem:</strong> {brief.problem}</p>
      <p className="mt-2 text-sm text-slate-300"><strong className="text-white">Goal:</strong> {brief.goal}</p>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-bold text-cyan-300 hover:text-cyan-200"
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded ? (
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Phases</p>
            <ul className="mt-1 list-inside list-disc">{brief.phases.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Files likely affected</p>
            <ul className="mt-1 list-inside list-disc">{brief.filesLikelyAffected.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Acceptance criteria</p>
            <ul className="mt-1 list-inside list-disc">{brief.acceptanceCriteria.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
          <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-400">
            {brief.cursorPrompt}
          </pre>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Cursor Prompt
        </button>
        {brief.status === 'draft' ? (
          <button
            type="button"
            onClick={() => {
              updateBuildBriefStatus(brief.id, 'sent-to-cursor')
              onUpdate()
            }}
            className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200"
          >
            Mark as Sent to Cursor
          </button>
        ) : null}
        {brief.status === 'sent-to-cursor' || brief.status === 'in-progress' ? (
          <button
            type="button"
            onClick={() => {
              updateBuildBriefStatus(brief.id, 'completed')
              onUpdate()
            }}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
          >
            Mark as Complete
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function FounderBuildBriefsPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const briefs = getBuildBriefs()

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Build Briefs"
          subtitle="Cursor-ready technical briefs from CTO and Lead Developer agents. Approve, copy, and run in Cursor."
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              generateBuildBriefFromCto()
              refresh()
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-200"
          >
            <Hammer className="h-4 w-4" />
            Generate Build Brief from CTO
          </button>
        </div>

        {briefs.length === 0 ? (
          <div className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center">
            <p className="text-lg font-bold text-slate-300">No build briefs yet.</p>
            <p className="mt-2 text-sm text-slate-500">Generate a brief from the CTO Agent or run the Founder Staff Team.</p>
          </div>
        ) : (
          <FounderSectionCard eyebrow="Briefs" title={`${briefs.length} build brief${briefs.length === 1 ? '' : 's'}`}>
            <div className="grid gap-4">
              {briefs.map((brief) => (
                <BriefCard key={brief.id} brief={brief} onUpdate={refresh} />
              ))}
            </div>
          </FounderSectionCard>
        )}
      </div>
    </div>
  )
}

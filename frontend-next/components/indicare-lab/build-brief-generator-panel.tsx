'use client'

import { Copy, FileText, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { generateBuildBrief, formatLabDate } from '@/lib/indicare-lab/build-brief'
import type { BuildBrief, LabGap } from '@/lib/indicare-lab/types'

export function BuildBriefGeneratorPanel({
  selectedGaps,
  allGaps,
  briefs,
  onBriefsChange,
  onClearSelection
}: {
  selectedGaps: LabGap[]
  allGaps: LabGap[]
  briefs: BuildBrief[]
  onBriefsChange: (briefs: BuildBrief[]) => void
  onClearSelection: () => void
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const canGenerate = selectedGaps.length > 0

  function handleGenerate() {
    if (!canGenerate) return
    const brief = generateBuildBrief(selectedGaps)
    onBriefsChange([brief, ...briefs])
    onClearSelection()
  }

  function handleGenerateFromAll() {
    const brief = generateBuildBrief(allGaps)
    onBriefsChange([brief, ...briefs])
  }

  async function copyBrief(brief: BuildBrief) {
    const text = formatBriefAsText(brief)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(brief.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const latestBrief = briefs[0]

  return (
    <LabSectionCard
      id="build-briefs"
      eyebrow="Action output"
      title="Build brief generator"
      description="Creates structured build briefs from selected improvement gaps. Briefs support founder review — they do not auto-deploy changes."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate from selection ({selectedGaps.length})
          </button>
          <button
            type="button"
            onClick={handleGenerateFromAll}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Generate full assessment brief
          </button>
        </div>
      }
    >
      {selectedGaps.length > 0 ? (
        <div className="mb-6 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300/80">Selected gaps</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {selectedGaps.map((g) => (
              <li key={g.id}>· {g.title}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-6 text-sm text-slate-500">
          Select gaps from any panel above, or use a gap card&apos;s &quot;Create Build Brief&quot; button.
        </p>
      )}

      {briefs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-600" aria-hidden />
          <p className="mt-3 text-sm text-slate-500">No build briefs generated yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <BriefCard
              key={brief.id}
              brief={brief}
              copied={copiedId === brief.id}
              onCopy={() => copyBrief(brief)}
            />
          ))}
        </div>
      )}

      {latestBrief ? (
        <div className="sr-only" aria-live="polite">
          Build brief generated: {latestBrief.title}
        </div>
      ) : null}
    </LabSectionCard>
  )
}

function BriefCard({
  brief,
  copied,
  onCopy
}: {
  brief: BuildBrief
  copied: boolean
  onCopy: () => void
}) {
  const preview = useMemo(() => formatBriefAsText(brief), [brief])

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5" data-testid="build-brief-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{brief.title}</h3>
          <p className="mt-1 text-xs text-slate-500">Generated {formatLabDate(brief.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied ? 'Copied' : 'Copy brief'}
        </button>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Objective</h4>
          <p className="mt-1 text-slate-300">{brief.objective}</p>
        </section>
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scope</h4>
          <ul className="mt-1 space-y-1 text-slate-400">
            {brief.scope.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Constraints</h4>
          <ul className="mt-1 space-y-1 text-slate-400">
            {brief.constraints.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Acceptance criteria</h4>
          <ul className="mt-1 space-y-1 text-slate-400">
            {brief.acceptanceCriteria.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Risk notes</h4>
          <p className="mt-1 text-amber-200/90">{brief.riskNotes}</p>
        </section>
      </div>

      <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-white/5 bg-black/30 p-4 text-xs text-slate-500">
        {preview}
      </pre>
    </article>
  )
}

function formatBriefAsText(brief: BuildBrief): string {
  return [
    `# ${brief.title}`,
    `Generated: ${formatLabDate(brief.createdAt)}`,
    '',
    '## Objective',
    brief.objective,
    '',
    '## Scope',
    ...brief.scope.map((s) => `- ${s}`),
    '',
    '## Constraints',
    ...brief.constraints.map((c) => `- ${c}`),
    '',
    '## Acceptance criteria',
    ...brief.acceptanceCriteria.map((c) => `- ${c}`),
    '',
    '## Risk notes',
    brief.riskNotes,
    '',
    '## Gaps included',
    ...brief.gaps.map((g) => `- [${g.riskLevel}] ${g.title}: ${g.suggestedAction}`)
  ].join('\n')
}

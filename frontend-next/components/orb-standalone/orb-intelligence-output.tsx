'use client'

import { Copy } from 'lucide-react'

import { OrbActionPlanDisplay } from '@/components/orb-standalone/orb-action-plan'
import type { OrbDocumentAction, StandaloneOrbSource } from '@/lib/orb/standalone-client'

export type OrbIntelligenceQuality = {
  overall_score?: number
  passed?: boolean
  headline?: string | null
  flags?: Array<{ code?: string; message?: string; severity?: string }>
  recommendations?: string[]
  requires_human_review?: boolean
  safety_notes?: string[]
}

export type OrbIntelligenceOutputView = {
  title: string
  summary: string
  type?: string
  key_points?: string[]
  sections?: Array<{ id: string; title: string; body: string }>
  findings?: Array<{ title: string; summary: string }>
  actions?: OrbDocumentAction[]
  questions?: string[]
  risks?: string[]
  gaps?: string[]
  sources?: StandaloneOrbSource[]
  citations?: StandaloneOrbSource[]
  quality?: OrbIntelligenceQuality | null
  safety_notice?: string | null
  limitations?: string[]
  boundaries?: { notice?: string | null }
}

export function OrbIntelligenceOutput({
  output,
  onCopy,
  variant = 'default'
}: {
  output: OrbIntelligenceOutputView
  onCopy?: () => void
  variant?: 'default' | 'records'
}) {
  const markdown = buildCopyMarkdown(output)
  const isRecords = variant === 'records'
  const titleClass = isRecords
    ? 'text-sm font-semibold text-[var(--orb-mobile-ws-text,var(--orb-foreground))]'
    : 'text-sm font-semibold text-white'
  const bodyClass = isRecords
    ? 'text-sm text-[var(--orb-mobile-ws-text,var(--orb-foreground))] whitespace-pre-wrap leading-6'
    : 'text-sm text-slate-300 whitespace-pre-wrap'
  const sectionHeadingClass = isRecords
    ? 'text-xs font-semibold uppercase tracking-wide text-[var(--orb-read-text-secondary,#374151)]'
    : 'text-xs font-semibold uppercase tracking-wide text-slate-500'
  const listClass = isRecords
    ? 'mt-2 list-disc pl-5 text-sm text-[var(--orb-mobile-ws-text,var(--orb-foreground))]'
    : 'mt-2 list-disc pl-5 text-sm text-slate-300'
  const buttonClass = isRecords
    ? 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-2 py-1 text-xs text-[var(--orb-mobile-ws-text,var(--orb-foreground))] hover:bg-[var(--orb-surface-hover)]'
    : 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/[0.06]'

  function handleCopy() {
    void navigator.clipboard.writeText(markdown)
    onCopy?.()
  }

  return (
    <div className="space-y-4" data-orb-intelligence-output={variant}>
      <div className="flex items-start justify-between gap-2">
        <h3 className={titleClass}>{output.title}</h3>
        <button
          type="button"
          onClick={handleCopy}
          className={buttonClass}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy markdown
        </button>
      </div>

      {output.summary ? <p className={bodyClass}>{output.summary}</p> : null}

      {output.key_points?.length ? (
        <section>
          <h4 className={sectionHeadingClass}>Key points</h4>
          <ul className={listClass}>
            {output.key_points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.sections?.map((section) =>
        section.id === 'body' ? null : (
          <section key={section.id}>
            <h4 className={isRecords ? sectionHeadingClass : 'text-sm font-semibold text-white'}>{section.title}</h4>
            <p className={isRecords ? bodyClass : 'mt-2 whitespace-pre-wrap text-sm text-slate-300'}>{section.body}</p>
          </section>
        )
      )}

      {output.findings?.length ? (
        <section>
          <h4 className="text-sm font-semibold text-white">Findings</h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {output.findings.map((f) => (
              <li key={f.title}>
                <span className="font-medium text-white">{f.title}</span>
                {f.summary ? <span className="text-slate-400"> — {f.summary}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.actions?.length ? (
        <OrbActionPlanDisplay actions={output.actions} />
      ) : null}

      {output.risks?.length ? (
        <section>
          <h4 className="text-sm font-semibold text-amber-200/90">Risks</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
            {output.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.gaps?.length ? (
        <section>
          <h4 className="text-sm font-semibold text-slate-400">Gaps / limits</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-400">
            {output.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.questions?.length ? (
        <section>
          <h4 className="text-sm font-semibold text-white">Questions to explore</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
            {output.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.sources?.length ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources / basis</h4>
          <ul className="mt-2 space-y-2 text-xs text-slate-400">
            {output.sources.slice(0, 8).map((s, i) => (
              <li key={`${s.id || s.label}-${i}`} className="rounded-lg border border-white/[0.04] px-2 py-1.5">
                <p className="font-medium text-slate-200" data-orb-exact-citation>
                  {s.exact_citation || s.label}
                </p>
                {(s.section || s.page || s.paragraph_number) && (
                  <p className="text-[10px] text-slate-500">
                    {[s.section, s.page ? `p. ${s.page}` : null, s.paragraph_number ? `para. ${s.paragraph_number}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {s.official_source ? (
                  <span data-orb-official-source className="text-[9px] text-cyan-200/90">
                    Official source
                  </span>
                ) : null}
                {s.source_integrity === 'summary_only' ? (
                  <p data-orb-summary-only-warning className="text-[9px] text-amber-200/80">
                    Summary only — not full official document
                  </p>
                ) : null}
                {s.warning ? <p className="text-[9px] text-amber-200/80">{s.warning}</p> : null}
                {s.excerpt ? <p className="mt-0.5 line-clamp-2 text-[10px]">{s.excerpt}</p> : null}
                {s.source_url ? (
                  <a href={s.source_url} className="text-[9px] text-cyan-300/80 underline" target="_blank" rel="noreferrer">
                    Source link
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.quality?.headline ? (
        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
          Quality: {output.quality.headline}
          {output.quality.requires_human_review ? ' — human review recommended' : ''}
        </p>
      ) : null}

      {output.safety_notice ? (
        <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/90">
          {output.safety_notice}
        </p>
      ) : null}

      {output.boundaries?.notice ? (
        <p className="text-[11px] text-slate-500">{output.boundaries.notice}</p>
      ) : null}
    </div>
  )
}

export function buildCopyMarkdown(output: OrbIntelligenceOutputView): string {
  const lines = [`# ${output.title}`, '', output.summary]
  if (output.key_points?.length) {
    lines.push('', '## Key points', ...output.key_points.map((p) => `- ${p}`))
  }
  if (output.actions?.length) {
    lines.push('', '## Actions')
    for (const a of output.actions) {
      lines.push(`- [${a.priority || 'medium'}] ${a.action}`)
    }
  }
  if (output.safety_notice) lines.push('', `**Safety:** ${output.safety_notice}`)
  return lines.filter((l) => l !== undefined).join('\n')
}

export function understandingToIntelligenceOutput(
  understanding: import('@/lib/orb/standalone-client').OrbDocumentUnderstanding
): OrbIntelligenceOutputView {
  return {
    title: understanding.title,
    summary: understanding.plain_english_summary,
    type: 'document_analysis',
    key_points:
      understanding.important_points?.map((p) => p.point) ||
      understanding.key_themes ||
      [],
    actions: understanding.action_plan?.actions,
    risks: understanding.risks_or_concerns?.map((r) => r.risk).filter(Boolean) as string[],
    gaps: understanding.gaps_or_missing_information?.map((g) => g.gap).filter(Boolean) as string[],
    questions: understanding.suggested_questions?.map((q) => q.question).filter(Boolean) as string[],
    sources: understanding.sources,
    citations: understanding.citations,
    quality: understanding.evaluation as OrbIntelligenceQuality | undefined,
    safety_notice: understanding.safety_notice,
    limitations: understanding.limitations,
    boundaries: {
      notice:
        'ORB Residential does not access IndiCare OS records. Uploaded documents are user-provided only.'
    }
  }
}

export function agentResponseToIntelligenceOutput(
  response: import('@/lib/orb/standalone-client').OrbAgentRunResponse
): OrbIntelligenceOutputView {
  const ctx = response.context_used || {}
  const evaluation = ctx.evaluation as OrbIntelligenceQuality | undefined
  return {
    title: response.output.title,
    summary: response.output.body.slice(0, 2000),
    type: response.agent_type,
    findings: response.findings?.map((f) => ({ title: f.title, summary: f.summary })),
    sources: response.sources,
    citations: response.citations,
    quality: evaluation,
    safety_notice: response.safety_notice,
    gaps: response.warnings,
    boundaries: {
      notice: 'ORB Residential — Knowledge Library and user documents only; no IndiCare OS records.'
    }
  }
}

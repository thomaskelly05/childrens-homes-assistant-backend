'use client'

import { useCallback, useMemo, useState } from 'react'
import { Copy, FileEdit, GitCompare, Loader2, Sparkles } from 'lucide-react'

import { OrbIntelligenceOutput } from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import { OrbPremiumButton, OrbPremiumInput, OrbPremiumTextarea, OrbPremiumTrustStrip } from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
import {
  buildDocumentComparisonPayload,
  comparisonOutputToMarkdown,
  comparisonSavedOutputType,
  documentComparisonDisplayTitle,
  ORB_DOCUMENT_COMPARISON_LENSES,
  understandingToComparisonOutputView,
  type OrbDocumentComparisonLens
} from '@/lib/orb/document-comparison'
import { ORB_DOCUMENT_BOUNDARY_LINES } from '@/lib/orb/document-intelligence'
import { compareOrbStandaloneDocuments } from '@/lib/orb/standalone-client'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'

export function OrbDocumentComparisonSection({
  projects,
  activeProjectId,
  activeProjectName,
  onOpenOrbWrite,
  onReuseInChat,
  onNotice
}: {
  projects?: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  onOpenOrbWrite?: (payload: {
    content: string
    title: string
    recordTypeId?: string
    outputType: string
  }) => void
  onReuseInChat?: (prompt: string) => void
  onNotice?: (message: string) => void
}) {
  const [titleA, setTitleA] = useState('Document A (previous)')
  const [textA, setTextA] = useState('')
  const [titleB, setTitleB] = useState('Document B (new)')
  const [textB, setTextB] = useState('')
  const [lens, setLens] = useState<OrbDocumentComparisonLens>('recent_changes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputView, setOutputView] = useState<ReturnType<typeof understandingToComparisonOutputView> | null>(null)

  const hasBoth = Boolean(textA.trim() && textB.trim())
  const heroLens = ORB_DOCUMENT_COMPARISON_LENSES.find((l) => l.hero)
  const standardLenses = ORB_DOCUMENT_COMPARISON_LENSES.filter((l) => !l.hero)

  const displayTitle = useMemo(() => {
    if (!outputView) return null
    return outputView.title
  }, [outputView])

  const runCompare = useCallback(async () => {
    if (!hasBoth) {
      setError('Paste or upload both Document A and Document B.')
      return
    }
    setLoading(true)
    setError(null)
    setOutputView(null)
    try {
      const payload = buildDocumentComparisonPayload({
        documentATitle: titleA,
        documentAText: textA,
        documentBTitle: titleB,
        documentBText: textB,
        lens
      })
      const result = await compareOrbStandaloneDocuments(payload)
      const view = understandingToComparisonOutputView(result.understanding, {
        lens,
        displayTitle: documentComparisonDisplayTitle(lens, titleA, titleB),
        documentATitle: titleA,
        documentBTitle: titleB
      })
      setOutputView(view)
      onNotice?.('Comparison draft ready — review before sharing.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }, [hasBoth, lens, onNotice, textA, textB, titleA, titleB])

  function openInWrite(mode: 'summary' | 'action_plan' | 'briefing') {
    if (!outputView) return
    const lensMeta = ORB_DOCUMENT_COMPARISON_LENSES.find((l) => l.id === lens)
    let content = comparisonOutputToMarkdown(outputView)
    let title = outputView.title
    if (mode === 'action_plan') {
      const section = outputView.sections?.find((s) => s.id === 'actions' || s.id === 'briefing')
      content = section?.body ? `## Action plan\n\n${section.body}` : content
      title = `Action plan — ${titleA} vs ${titleB}`
    }
    if (mode === 'briefing') {
      const section = outputView.sections?.find((s) => s.id === 'briefing')
      content = section?.body ?? outputView.summary
      title = `Staff briefing — ${titleA} vs ${titleB}`
    }
    onOpenOrbWrite?.({
      content,
      title,
      recordTypeId: lensMeta?.recordTypeId,
      outputType: lensMeta?.outputType ?? 'comparison_summary'
    })
  }

  return (
    <section className="space-y-4" data-orb-document-comparison-section>
      <div className="flex items-start gap-2" data-orb-compare-documents-header>
        <GitCompare className="mt-0.5 h-5 w-5 text-sky-400" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Compare documents</h3>
          <p className="text-xs text-[var(--orb-muted)]">
            Compare old and new policy, Reg 44 reports, Statement of Purpose versions or uploaded reports.
          </p>
        </div>
      </div>

      <ul
        className="space-y-1 rounded-xl border border-[var(--orb-line)] px-3 py-2.5 text-[11px] leading-5 text-[var(--orb-muted)]"
        data-orb-document-comparison-boundary
      >
        {ORB_DOCUMENT_BOUNDARY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>Draft — adult review required before sharing.</li>
      </ul>

      <div className="grid gap-3 sm:grid-cols-2" data-orb-document-comparison-inputs>
        <div className="space-y-2" data-orb-document-a>
          <label className="block text-xs font-semibold text-[var(--orb-muted)]">
            Document A
            <OrbPremiumInput
              value={titleA}
              onChange={(e) => setTitleA(e.target.value)}
              className="mt-1"
              data-orb-document-a-title
            />
          </label>
          <OrbPremiumTextarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            rows={5}
            spellCheck
            placeholder="Paste previous policy, older Reg 44 report or baseline document…"
            className="mt-1"
            data-orb-document-a-text
          />
        </div>
        <div className="space-y-2" data-orb-document-b>
          <label className="block text-xs font-semibold text-[var(--orb-muted)]">
            Document B
            <OrbPremiumInput
              value={titleB}
              onChange={(e) => setTitleB(e.target.value)}
              className="mt-1"
              data-orb-document-b-title
            />
          </label>
          <OrbPremiumTextarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            rows={5}
            spellCheck
            placeholder="Paste new policy, updated report or comparison document…"
            className="mt-1"
            data-orb-document-b-text
          />
        </div>
      </div>

      <div className="space-y-2" data-orb-document-comparison-lens-selector>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">
          Comparison lens
        </p>
        {heroLens ? (
          <button
            type="button"
            onClick={() => setLens(heroLens.id)}
            className={`flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition ${
              lens === heroLens.id
                ? 'border-sky-400/50 bg-sky-500/10 ring-1 ring-sky-400/30'
                : 'border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] hover:bg-[var(--orb-surface-hover)]'
            }`}
            data-orb-comparison-lens-hero
            data-orb-comparison-lens={heroLens.id}
          >
            <span className="text-sm font-bold text-[var(--orb-foreground)]">{heroLens.label}</span>
            <span className="text-xs text-[var(--orb-muted)]">{heroLens.description}</span>
          </button>
        ) : null}
        <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Comparison lenses">
          {standardLenses.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={lens === item.id}
              onClick={() => setLens(item.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                lens === item.id
                  ? 'border-sky-400/40 bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
              data-orb-comparison-lens={item.id}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <OrbPremiumTrustStrip>
        ORB compares only the text you provide. It does not auto-update statutory guidance or make regulatory
        judgements.
      </OrbPremiumTrustStrip>

      <OrbPremiumButton
        disabled={loading || !hasBoth}
        onClick={() => void runCompare()}
        className="min-w-[10rem]"
        data-orb-compare-with-orb
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        Compare with ORB
      </OrbPremiumButton>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      {outputView ? (
        <section className="space-y-4 border-t border-[var(--orb-line)] pt-4" data-orb-comparison-output>
          <OrbIntelligenceOutput output={outputView} onCopy={() => onNotice?.('Copied markdown.')} />
          {projects?.length ? (
            <OrbOutputSaveActions
              output={outputView}
              suggestedType={comparisonSavedOutputType(lens)}
              suggestedTitle={displayTitle || outputView.title}
              suggestedTags={['document_comparison', 'Documents & Guidance']}
              projects={projects}
              activeProjectId={activeProjectId}
              activeProjectName={activeProjectName}
              createdFrom="document_comparison"
              saveExtras={{
                source_feature: 'document_comparison',
                lens
              }}
              onReuseInChat={onReuseInChat}
              onNotice={onNotice}
            />
          ) : null}
          <div className="flex flex-wrap gap-2" data-orb-comparison-output-actions>
            <button
              type="button"
              onClick={() => {
                if (!outputView) return
                void navigator.clipboard.writeText(comparisonOutputToMarkdown(outputView))
                onNotice?.('Copied markdown.')
              }}
              className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              data-orb-copy-comparison-output
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </button>
            {onOpenOrbWrite ? (
              <>
                <button
                  type="button"
                  onClick={() => openInWrite('summary')}
                  className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  data-orb-open-comparison-in-write
                >
                  <FileEdit className="h-3.5 w-3.5" aria-hidden />
                  Open in ORB Write
                </button>
                <button
                  type="button"
                  onClick={() => openInWrite('action_plan')}
                  className="orb-doc-secondary-btn rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  data-orb-open-action-plan-in-write
                >
                  Open action plan in ORB Write
                </button>
                <button
                  type="button"
                  onClick={() => openInWrite('briefing')}
                  className="orb-doc-secondary-btn rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  data-orb-open-briefing-in-write
                >
                  Open staff briefing in ORB Write
                </button>
              </>
            ) : null}
            {onReuseInChat ? (
              <button
                type="button"
                onClick={() => onReuseInChat(`${ORB_PREMIUM_ACTION_LABELS.continueInChat}: ${outputView.title}`)}
                className="orb-doc-secondary-btn rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-comparison-continue-chat
              >
                {ORB_PREMIUM_ACTION_LABELS.continueInChat}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  )
}

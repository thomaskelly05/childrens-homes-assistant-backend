'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type {
  IndicareAnswerQualityGate,
  IndicareIntelligenceCoreView
} from '@/lib/orb/indicare-intelligence-core'

function formatDepthLabel(depth?: string): string | null {
  if (!depth) return null
  return depth
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function CoreChip({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'amber' | 'sky' }) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100'
      : tone === 'sky'
        ? 'border-sky-200/80 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-100'
        : 'border-slate-200/80 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass}`}>
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export function OrbIntelligenceCorePanel({
  core,
  qualityGate,
  expandedByDefault = false,
  showTechnicalDetails = false
}: {
  core: IndicareIntelligenceCoreView | null
  qualityGate?: IndicareAnswerQualityGate | null
  expandedByDefault?: boolean
  showTechnicalDetails?: boolean
}) {
  const [open, setOpen] = useState(expandedByDefault)
  const [debugOpen, setDebugOpen] = useState(false)

  if (!core && !qualityGate) return null

  const missingChips = core?.missing_evidence ?? []
  const hasMissingEvidence = missingChips.length > 0
  const gateLabel =
    qualityGate?.passed === true
      ? 'Passed'
      : qualityGate?.passed === false
        ? 'Review recommended'
        : null
  const depthLabel = formatDepthLabel(core?.expert_depth)
  const careRelevance =
    typeof core?.care_relevance_score === 'number' ? `${core.care_relevance_score}/100` : null
  const qualityStandards = core?.quality_standard_hits?.slice(0, 3).join(', ')
  const lenses = core?.professional_lens_hits?.slice(0, 3).join(', ')
  const domains = core?.registered_home_domains?.slice(0, 3).join(', ')
  const sourceBasis =
    core?.source_basis && typeof core.source_basis === 'object'
      ? Object.keys(core.source_basis).slice(0, 2).join(', ')
      : null

  return (
    <div
      className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/90 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
      data-orb-intelligence-core-panel
      data-orb-what-orb-checked-collapsed={open ? 'false' : 'true'}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-orb-what-orb-checked-toggle
      >
        <span>What ORB checked</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-slate-200/70 px-3 py-2 dark:border-white/10">
          <div className="flex flex-wrap gap-1.5" data-orb-intelligence-summary-chips>
            {depthLabel ? <CoreChip label="Depth" value={depthLabel} tone="sky" /> : null}
            {careRelevance ? <CoreChip label="Care relevance" value={careRelevance} /> : null}
            {qualityStandards ? (
              <CoreChip label="Quality Standards" value={qualityStandards} />
            ) : null}
            {lenses ? <CoreChip label="Professional lenses" value={lenses} /> : null}
            {domains ? <CoreChip label="Registered home domains" value={domains} /> : null}
            {sourceBasis ? <CoreChip label="Source basis" value={sourceBasis} /> : null}
            {gateLabel ? (
              <CoreChip
                label="Quality gate"
                value={gateLabel}
                tone={qualityGate?.passed === false ? 'amber' : 'neutral'}
              />
            ) : null}
          </div>

          {hasMissingEvidence ? (
            <div className="flex flex-wrap gap-1.5" data-orb-missing-evidence-chips>
              {missingChips.map((chip) => (
                <span
                  key={chip.id}
                  className="rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          {showTechnicalDetails ? (
            <button
              type="button"
              className="text-[11px] font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
              onClick={() => setDebugOpen((v) => !v)}
              data-orb-intelligence-debug-toggle
            >
              {debugOpen ? 'Hide manager / RI details' : 'Manager / RI details'}
            </button>
          ) : null}

          {showTechnicalDetails && debugOpen ? (
            <dl className="grid gap-1 text-[11px]" data-orb-intelligence-debug-drawer>
              {core?.active_intelligence_layers?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Layers</dt>
                  <dd>{core.active_intelligence_layers.join(', ')}</dd>
                </>
              ) : null}
              {typeof qualityGate?.composite_score === 'number' ? (
                <>
                  <dt className="font-semibold text-slate-500">Composite score</dt>
                  <dd data-orb-quality-gate-result={qualityGate?.passed ? 'passed' : 'review'}>
                    {qualityGate.composite_score}
                  </dd>
                </>
              ) : null}
              {qualityGate?.critical_flags?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Critical flags</dt>
                  <dd>{qualityGate.critical_flags.join(', ')}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function OrbIntelligenceActionCtas({
  showRecordProperly,
  showManagerOversight,
  onRecordProperly,
  onManagerOversight
}: {
  showRecordProperly: boolean
  showManagerOversight: boolean
  onRecordProperly?: () => void
  onManagerOversight?: () => void
}) {
  if (!showRecordProperly && !showManagerOversight) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2" data-orb-intelligence-ctas>
      {showRecordProperly && onRecordProperly ? (
        <button
          type="button"
          onClick={onRecordProperly}
          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-100"
          data-orb-cta-record-properly
        >
          Record this properly
        </button>
      ) : null}
      {showManagerOversight && onManagerOversight ? (
        <button
          type="button"
          onClick={onManagerOversight}
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-100"
          data-orb-cta-manager-oversight
        >
          Manager oversight view
        </button>
      ) : null}
    </div>
  )
}

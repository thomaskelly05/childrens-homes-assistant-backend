'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type {
  IndicareAnswerQualityGate,
  IndicareIntelligenceCoreView
} from '@/lib/orb/indicare-intelligence-core'

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

  const chips = core?.missing_evidence ?? []
  const gateLabel =
    qualityGate?.passed === true
      ? 'Passed'
      : qualityGate?.passed === false
        ? 'Review recommended'
        : null

  return (
    <div
      className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/90 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
      data-orb-intelligence-core-panel
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
          {chips.length ? (
            <div className="flex flex-wrap gap-1.5" data-orb-missing-evidence-chips>
              {chips.map((chip) => (
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
              {debugOpen ? 'Hide intelligence details' : 'Intelligence details'}
            </button>
          ) : null}

          {showTechnicalDetails && debugOpen ? (
            <dl className="grid gap-1 text-[11px]" data-orb-intelligence-debug-drawer>
              {core?.expert_depth ? (
                <>
                  <dt className="font-semibold text-slate-500">Depth</dt>
                  <dd>{core.expert_depth}</dd>
                </>
              ) : null}
              {typeof core?.care_relevance_score === 'number' ? (
                <>
                  <dt className="font-semibold text-slate-500">Care relevance</dt>
                  <dd>{core.care_relevance_score}/100</dd>
                </>
              ) : null}
              {core?.active_intelligence_layers?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Layers</dt>
                  <dd>{core.active_intelligence_layers.join(', ')}</dd>
                </>
              ) : null}
              {core?.registered_home_domains?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Domains</dt>
                  <dd>{core.registered_home_domains.join(', ')}</dd>
                </>
              ) : null}
              {core?.quality_standard_hits?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Quality Standards</dt>
                  <dd>{core.quality_standard_hits.join(', ')}</dd>
                </>
              ) : null}
              {core?.professional_lens_hits?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Professional lenses</dt>
                  <dd>{core.professional_lens_hits.join(', ')}</dd>
                </>
              ) : null}
              {gateLabel ? (
                <>
                  <dt className="font-semibold text-slate-500">Quality gate</dt>
                  <dd data-orb-quality-gate-result={qualityGate?.passed ? 'passed' : 'review'}>
                    {gateLabel}
                    {typeof qualityGate?.composite_score === 'number'
                      ? ` (${qualityGate.composite_score})`
                      : ''}
                  </dd>
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

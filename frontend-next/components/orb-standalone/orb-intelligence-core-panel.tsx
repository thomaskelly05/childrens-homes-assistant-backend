'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type {
  IndicareAnswerQualityGate,
  IndicareIntelligenceCoreView
} from '@/lib/orb/indicare-intelligence-core'
import {
  buildResponseSupportDisplayChips,
  managerCanExpandIntelligence
} from '@/lib/orb/indicare-intelligence-core'
import { ORB_RESPONSE_SUPPORT_PANEL_LABEL } from '@/lib/orb/orb-user-facing-copy'

function SupportChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex rounded-full border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
      data-orb-response-support-chip
    >
      {label}
    </span>
  )
}

export function OrbIntelligenceCorePanel({
  core,
  qualityGate,
  expandedByDefault = false,
  showTechnicalDetails = false,
  userRole
}: {
  core: IndicareIntelligenceCoreView | null
  qualityGate?: IndicareAnswerQualityGate | null
  expandedByDefault?: boolean
  /** Developer/debug mode — shows raw technical metadata drawer. */
  showTechnicalDetails?: boolean
  userRole?: string | null
}) {
  const [open, setOpen] = useState(expandedByDefault)
  const [debugOpen, setDebugOpen] = useState(false)

  const supportChips = buildResponseSupportDisplayChips(core, qualityGate ?? null)
  if (!supportChips.length && !showTechnicalDetails) return null

  const managerDetail = managerCanExpandIntelligence(userRole) && !showTechnicalDetails

  return (
    <div
      className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/90 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
      data-orb-intelligence-core-panel
      data-orb-response-support-panel
      data-orb-what-orb-checked-collapsed={open ? 'false' : 'true'}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-orb-response-support-toggle
        data-orb-what-orb-checked-toggle
      >
        <span>{ORB_RESPONSE_SUPPORT_PANEL_LABEL}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-slate-200/70 px-3 py-2 dark:border-white/10">
          {supportChips.length ? (
            <div className="flex flex-wrap gap-1.5" data-orb-response-support-chips>
              {supportChips.map((chip) => (
                <SupportChip key={chip} label={chip} />
              ))}
            </div>
          ) : null}

          {managerDetail && core?.missing_evidence?.length ? (
            <div className="flex flex-wrap gap-1.5" data-orb-missing-evidence-chips>
              {core.missing_evidence.map((chip) => (
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
              {debugOpen ? 'Hide technical details' : 'Technical details'}
            </button>
          ) : null}

          {showTechnicalDetails && debugOpen ? (
            <dl className="grid gap-1 text-[11px]" data-orb-intelligence-debug-drawer>
              {core?.expert_depth ? (
                <>
                  <dt className="font-semibold text-slate-500">Response type (internal)</dt>
                  <dd>{core.expert_depth}</dd>
                </>
              ) : null}
              {typeof core?.care_relevance_score === 'number' ? (
                <>
                  <dt className="font-semibold text-slate-500">Context score (internal)</dt>
                  <dd>{core.care_relevance_score}</dd>
                </>
              ) : null}
              {core?.active_intelligence_layers?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Layers (internal)</dt>
                  <dd>{core.active_intelligence_layers.join(', ')}</dd>
                </>
              ) : null}
              {typeof qualityGate?.composite_score === 'number' ? (
                <>
                  <dt className="font-semibold text-slate-500">Review score (internal)</dt>
                  <dd data-orb-quality-gate-result={qualityGate?.passed ? 'passed' : 'review'}>
                    {qualityGate.composite_score}
                  </dd>
                </>
              ) : null}
              {qualityGate?.critical_flags?.length ? (
                <>
                  <dt className="font-semibold text-slate-500">Review flags (internal)</dt>
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
          Manager oversight
        </button>
      ) : null}
    </div>
  )
}

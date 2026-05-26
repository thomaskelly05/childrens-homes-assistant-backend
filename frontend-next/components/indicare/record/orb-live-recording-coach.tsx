'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'

import { OrbLiveSuggestionCard } from '@/components/indicare/record/orb-live-suggestion-card'
import { OrbRecordingReadinessMeter } from '@/components/indicare/record/orb-recording-readiness-meter'
import { RecordingAutosaveIndicator, type RecordingSaveMode } from '@/components/indicare/record/recording-autosave-indicator'
import {
  allLiveHints,
  analyseLiveRecording,
  type LiveRecordingAnalysis,
  type LiveRecordingHint
} from '@/lib/record/live-recording-analysis'
import { guidanceForForm } from '@/lib/record/recording-form-guidance'
import { recordingFormById } from '@/lib/record/recording-form-registry'
import { operationalOrbRecordingHref } from '@/lib/orb/operational-client'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'
import { RECORDING_DRAFT_PRIVACY_NOTICE } from '@/lib/record/recording-draft-store'

const MAX_VISIBLE_HINTS = 8

export function OrbLiveRecordingCoach({
  formId,
  recordingType,
  title,
  body,
  eventDate,
  childId,
  homeId,
  structuredData,
  structuredRequiredMissing,
  planImpactChecked,
  saveMode,
  isSaving,
  lastSavedAt,
  saveError,
  onRetrySave,
  onAcceptSuggestion,
  onInsertHeadingPrompt
}: {
  formId: string
  recordingType?: RecordingWorkspaceType
  title: string
  body: string
  eventDate?: string
  childId?: string
  homeId?: string
  structuredData?: Record<string, unknown>
  structuredRequiredMissing?: string[]
  planImpactChecked?: boolean
  saveMode?: RecordingSaveMode
  isSaving?: boolean
  lastSavedAt?: string
  saveError?: boolean
  onRetrySave?: () => void
  onAcceptSuggestion?: (text: string, hint: LiveRecordingHint) => void
  onInsertHeadingPrompt?: (heading: string) => void
}) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [debouncedAnalysis, setDebouncedAnalysis] = useState<LiveRecordingAnalysis | null>(null)

  const guidance = useMemo(() => guidanceForForm(formId), [formId])
  const form = useMemo(() => recordingFormById(formId), [formId])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAnalysis(
        analyseLiveRecording({
          formId,
          title,
          body,
          structuredData,
          eventDate,
          childId,
          homeId,
          recordingType,
          structuredRequiredMissing,
          planImpactChecked
        })
      )
    }, 400)
    return () => clearTimeout(timer)
  }, [
    body,
    childId,
    eventDate,
    formId,
    homeId,
    planImpactChecked,
    recordingType,
    structuredData,
    structuredRequiredMissing,
    title
  ])

  const analysis = debouncedAnalysis
  const visibleHints = useMemo(() => {
    if (!analysis) return []
    return allLiveHints(analysis).filter((h) => !dismissedIds.has(h.id)).slice(0, MAX_VISIBLE_HINTS)
  }, [analysis, dismissedIds])

  const handleDismiss = useCallback((hint: LiveRecordingHint) => {
    setDismissedIds((prev) => new Set(prev).add(hint.id))
  }, [])

  const handleCopy = useCallback(async (hint: LiveRecordingHint) => {
    const text = hint.suggestion || hint.message
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
  }, [])

  const handleAccept = useCallback(
    (hint: LiveRecordingHint) => {
      if (!hint.suggestion) return
      onAcceptSuggestion?.(hint.suggestion, hint)
    },
    [onAcceptSuggestion]
  )

  const askOrbHref = operationalOrbRecordingHref({
    mode: 'recording_live_coach',
    formId,
    formTitle: form?.title,
    recordingType,
    childId: childId ? Number(childId) : undefined,
    homeId: homeId ? Number(homeId) : undefined,
    flags: analysis
      ? [
          analysis.readinessStatus,
          ...(analysis.safeguardingFlags.length ? ['safeguarding'] : []),
          ...(analysis.reviewFlags.length ? ['review'] : [])
        ]
      : undefined,
    prompt: 'Help me improve this record while I write. I will paste any excerpt myself.'
  })

  return (
    <aside data-testid="orb-live-recording-coach" className="space-y-4">
      <section className="rounded-2xl border border-cyan-100 bg-gradient-to-b from-cyan-50/90 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-700" aria-hidden />
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-800">ORB is supporting this record</p>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
          Live coaching while you write. Suggestions are optional — you remain responsible for the final record.
        </p>
        {analysis ? (
          <div className="mt-3">
            <OrbRecordingReadinessMeter
              qualityScore={analysis.qualityScore}
              readinessStatus={analysis.readinessStatus}
            />
          </div>
        ) : null}
      </section>

      <RecordingAutosaveIndicator
        lastSavedAt={lastSavedAt}
        isSaving={isSaving}
        saveMode={saveError ? 'idle' : saveMode}
        privacyNotice={RECORDING_DRAFT_PRIVACY_NOTICE}
        saveError={saveError}
        onRetrySave={onRetrySave}
      />

      {analysis?.factualAccuracyWarning ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950"
          data-testid="orb-factual-accuracy-warning"
        >
          {analysis.factualAccuracyWarning}
        </p>
      ) : null}

      {visibleHints.length ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Live suggestions</p>
          <ul className="mt-3 space-y-2">
            {visibleHints.map((hint) => (
              <OrbLiveSuggestionCard
                key={hint.id}
                hint={hint}
                onAccept={hint.suggestion ? handleAccept : undefined}
                onCopy={handleCopy}
                onDismiss={handleDismiss}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {guidance.adultGuidanceSections.length ? (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4" data-testid="orb-heading-prompts">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">Form heading prompts</p>
          <ul className="mt-2 space-y-2">
            {guidance.adultGuidanceSections.map((section) => (
              <li key={section.heading}>
                <p className="text-xs font-black text-emerald-950">{section.heading}</p>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-emerald-900">{section.guidance}</p>
                {onInsertHeadingPrompt ? (
                  <button
                    type="button"
                    data-testid="orb-insert-heading-prompt"
                    onClick={() => onInsertHeadingPrompt(section.heading)}
                    className="mt-1 text-[10px] font-black text-blue-800 underline"
                  >
                    Insert heading
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <Link
          href={askOrbHref}
          data-testid="orb-ask-for-help"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask ORB for help
        </Link>
        <Link
          href="/record/reviews"
          data-testid="orb-open-review-checklist"
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-950"
        >
          Open review checklist
        </Link>
      </div>
    </aside>
  )
}

export type { LiveRecordingAnalysis }

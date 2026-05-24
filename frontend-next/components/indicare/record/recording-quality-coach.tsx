'use client'

import { useMemo } from 'react'

import { analyseRecordingQuality, type QualityCoachSeverity } from '@/lib/record/recording-quality-coach'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'

function statusLabel(severity: QualityCoachSeverity) {
  if (severity === 'review') return 'Consider review'
  if (severity === 'attention') return 'Needs attention'
  return 'Looks okay'
}

function statusClass(severity: QualityCoachSeverity) {
  if (severity === 'review') return 'bg-rose-100 text-rose-900'
  if (severity === 'attention') return 'bg-amber-100 text-amber-900'
  return 'bg-emerald-100 text-emerald-900'
}

export function RecordingQualityCoach({
  body,
  title = '',
  recordingType,
  structuredRequiredMissing,
  structuredReviewTriggers
}: {
  body: string
  title?: string
  recordingType?: RecordingWorkspaceType
  structuredRequiredMissing?: string[]
  structuredReviewTriggers?: string[]
}) {
  const result = useMemo(() => analyseRecordingQuality(body, title, recordingType), [body, title, recordingType])
  const extraSuggestions = useMemo(() => {
    const items: string[] = []
    if (structuredRequiredMissing?.length) {
      items.push(`Structured form: ${structuredRequiredMissing.length} required field(s) still missing.`)
    }
    if (structuredReviewTriggers?.length) {
      items.push(...structuredReviewTriggers.slice(0, 3))
    }
    return items
  }, [structuredRequiredMissing, structuredReviewTriggers])

  return (
    <section data-testid="recording-quality-coach" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Quality coach</p>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(result.overall)}`}>
          {statusLabel(result.overall)}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Guidance only — you remain responsible for the final record.</p>
      <ul className="mt-3 space-y-2">
        {result.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-sm font-semibold leading-5 text-slate-700">
            <span className={check.passed ? 'text-emerald-600' : 'text-amber-600'} aria-hidden>
              {check.passed ? '✓' : '○'}
            </span>
            <span>
              {check.label}
              {!check.passed && check.suggestion ? (
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">{check.suggestion}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {result.suggestions.length ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
          <p className="font-black text-slate-700">Suggestions</p>
          <ul className="mt-1 list-disc pl-4">
            {result.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

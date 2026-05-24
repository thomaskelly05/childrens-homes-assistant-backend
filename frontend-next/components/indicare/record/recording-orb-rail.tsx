'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mic2, Sparkles } from 'lucide-react'

import {
  RECORDING_ORB_COPY_PROMPT,
  RECORDING_OS_ORB_HREF,
  RECORDING_STANDALONE_ORB_HREF
} from '@/lib/record/recording-quality-coach'
import { recordingFormByWorkspaceType, resolveActiveRecordingForm } from '@/lib/record/recording-form-registry'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'
import { getRecordingTemplate } from '@/lib/os-api/recording-templates'

const DEFAULT_PROMPTS = [
  'What should I include in this record?',
  'Make this wording more child-centred.',
  'Does this need manager review?',
  'Help me include the child’s voice.',
  'Check this for judgemental language.',
  'What follow-up should be recorded?'
] as const

const HIGH_RISK_ORB_PROMPTS = [
  'Help me check whether this record is factual and complete.',
  'What follow-up should a manager review?',
  'Have I separated fact from interpretation?',
  'What should I avoid including unnecessarily?',
  'Help me prepare questions for manager review.'
] as const

function operationalOrbHrefForPrompt(query: string) {
  const q = encodeURIComponent(query)
  return `/assistant/orb?mode=record_quality_review&context=recording&q=${q}`
}

export function RecordingOrbRail({
  recordingType,
  formId
}: {
  recordingType?: RecordingWorkspaceType
  formId?: string
}) {
  const [templateOrbPrompts, setTemplateOrbPrompts] = useState<string[]>([])

  const copyOrbPrompt = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(RECORDING_ORB_COPY_PROMPT)
  }, [])

  useEffect(() => {
    let cancelled = false
    const candidate = formId || recordingType
    if (!candidate) return
    void (async () => {
      const loaded = await getRecordingTemplate(candidate)
      if (cancelled) return
      if (loaded.ok && loaded.data?.template?.orb_prompts?.length) {
        setTemplateOrbPrompts(loaded.data.template.orb_prompts)
      } else {
        setTemplateOrbPrompts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [formId, recordingType])

  const form = recordingType
    ? resolveActiveRecordingForm(recordingType, formId) || recordingFormByWorkspaceType(recordingType)
    : undefined

  const suggestedPrompts = useMemo(() => {
    if (templateOrbPrompts.length) return templateOrbPrompts
    if (!recordingType) return [...DEFAULT_PROMPTS]
    if (form?.orbSuggestedPrompts.length) return form.orbSuggestedPrompts
    if (form?.requiresManagerReview || form?.safeguardingSensitive) return [...HIGH_RISK_ORB_PROMPTS]
    return [...DEFAULT_PROMPTS]
  }, [form, recordingType, templateOrbPrompts])

  return (
    <aside data-testid="recording-orb-rail" className="space-y-4">
      <section className="rounded-2xl border border-cyan-100 bg-gradient-to-b from-cyan-50/90 to-white p-4 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-800">ORB recording coach</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">ORB can help you think before you save.</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          ORB supports recording quality. Adults remain responsible for the final record.
        </p>
        {form?.requiresManagerReview ? (
          <p className="mt-2 text-xs font-black text-amber-900">Manager review likely required for this record type.</p>
        ) : null}
        {form?.safeguardingSensitive ? (
          <p className="mt-1 text-xs font-black text-rose-900">Safeguarding sensitive — avoid unnecessary third-party identifiers.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Suggested prompts</p>
        <ul className="mt-2 space-y-2">
          {suggestedPrompts.map((prompt) => (
            <li key={prompt}>
              <Link
                href={operationalOrbHrefForPrompt(prompt)}
                className="text-sm font-semibold leading-5 text-blue-800 underline decoration-blue-200 underline-offset-2 hover:text-blue-950"
              >
                {prompt}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <Link
          href={RECORDING_OS_ORB_HREF}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Open OS ORB
        </Link>
        <Link
          href={RECORDING_STANDALONE_ORB_HREF}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
        >
          <Mic2 className="h-4 w-4 text-blue-600" aria-hidden />
          Standalone wording helper
        </Link>
        <button
          type="button"
          onClick={() => void copyOrbPrompt()}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-900"
        >
          Copy prompt for ORB
        </button>
      </div>
    </aside>
  )
}

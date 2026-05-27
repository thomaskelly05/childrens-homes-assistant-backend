'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { StructuredFormReviewTriggers } from '@/components/indicare/record/structured-form-review-triggers'
import { StructuredFormSection } from '@/components/indicare/record/structured-form-section'
import { StructuredFormSummary } from '@/components/indicare/record/structured-form-summary'
import {
  getRecordingTemplate,
  validateRecordingTemplate,
  type RecordingStructuredTemplate
} from '@/lib/os-api/recording-templates'

const NARRATIVE_HINT = 'Use structured answers to support your draft narrative'

export function StructuredRecordingForm({
  formId,
  initialValues,
  onValuesChange,
  onCompletionChange
}: {
  formId: string
  initialValues?: Record<string, unknown>
  onValuesChange?: (values: Record<string, unknown>) => void
  onCompletionChange?: (payload: {
    requiredMissing: string[]
    reviewTriggers: string[]
    completionSummary: string[]
  }) => void
}) {
  const [template, setTemplate] = useState<RecordingStructuredTemplate | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {})
  const [requiredMissing, setRequiredMissing] = useState<string[]>([])
  const [reviewTriggers, setReviewTriggers] = useState<string[]>([])
  const [completionSummary, setCompletionSummary] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const loaded = await getRecordingTemplate(formId)
      if (cancelled) return
      if (loaded.ok && loaded.data?.template?.form_id) {
        setTemplate(loaded.data.template)
      } else {
        setTemplate(null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [formId])

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length) {
      setValues(initialValues)
    }
  }, [initialValues])

  const runValidation = useCallback(
    async (nextValues: Record<string, unknown>) => {
      if (!template) return
      const result = await validateRecordingTemplate(formId, nextValues)
      if (!result.ok) return
      const missing = result.data.required_missing || []
      const triggers = result.data.review_triggers || []
      const summary = result.data.completion_summary || []
      setRequiredMissing(missing)
      setReviewTriggers(triggers)
      setCompletionSummary(summary)
      onCompletionChange?.({
        requiredMissing: missing,
        reviewTriggers: triggers,
        completionSummary: summary
      })
    },
    [formId, onCompletionChange, template]
  )

  const handleChange = useCallback(
    (fieldId: string, next: unknown) => {
      setValues((prev) => {
        const merged = { ...prev, [fieldId]: next }
        onValuesChange?.(merged)
        void runValidation(merged)
        return merged
      })
    },
    [onValuesChange, runValidation]
  )

  useEffect(() => {
    if (template && Object.keys(values).length) {
      void runValidation(values)
    }
  }, [template, values, runValidation])

  const missingSet = useMemo(() => new Set(requiredMissing), [requiredMissing])

  if (loading) {
    return (
      <p data-testid="structured-recording-form-loading" className="text-xs font-semibold text-slate-500">
        Loading structured form…
      </p>
    )
  }

  if (!template) return null

  return (
    <section
      data-testid="structured-recording-form"
      className="space-y-4 rounded-[28px] border border-rose-100 bg-gradient-to-b from-rose-50/50 to-white p-5 shadow-sm"
    >
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-800">Structured high-risk record</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">{template.title}</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{template.description}</p>
        <p className="mt-2 text-xs font-black text-blue-900" data-testid="structured-recording-narrative-hint">
          {NARRATIVE_HINT}
        </p>
      </header>

      <div data-testid="structured-form-safety-notices" className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
        <p className="text-xs font-black text-rose-950">Safety notices</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-rose-900">
          {template.safety_notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </div>

      {template.sections.map((section) => (
        <StructuredFormSection
          key={section.id}
          section={section}
          values={values}
          requiredMissing={missingSet}
          onChange={handleChange}
        />
      ))}

      {requiredMissing.length > 0 ? (
        <p data-testid="structured-form-required-missing" className="text-xs font-black text-rose-800">
          Required fields missing: {requiredMissing.join(', ')}
        </p>
      ) : null}

      <StructuredFormReviewTriggers triggers={reviewTriggers} />
      <StructuredFormSummary lines={completionSummary} />
    </section>
  )
}

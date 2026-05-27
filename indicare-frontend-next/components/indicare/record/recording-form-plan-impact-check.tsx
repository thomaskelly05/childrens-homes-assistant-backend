'use client'

import type { RecordingFormLifecycleConfig } from '@/lib/record/recording-form-lifecycle'
import { PLAN_IMPACT_CHECK_PROMPT } from '@/lib/record/recording-form-therapeutic-defaults'

export function RecordingFormPlanImpactCheck({
  lifecycle,
  checked,
  onChange,
  readOnly = false
}: {
  lifecycle: RecordingFormLifecycleConfig
  checked?: boolean
  onChange?: (value: boolean) => void
  readOnly?: boolean
}) {
  if (lifecycle.plan_impact_behaviour === 'none') {
    return (
      <section
        data-testid="recording-form-plan-impact-check"
        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
      >
        Plan impact: not typically applicable for this form type.
      </section>
    )
  }

  return (
    <section
      data-testid="recording-form-plan-impact-check"
      className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-800">Plan impact check</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-violet-950">{PLAN_IMPACT_CHECK_PROMPT}</p>
      <p className="mt-1 text-xs font-semibold text-violet-800">
        May affect: {lifecycle.plan_impact_behaviour.replace(/_/g, ' ')}
      </p>
      <label className="mt-3 flex items-center gap-2 text-xs font-black text-violet-950">
        <input
          type="checkbox"
          data-testid="recording-plan-impact-checkbox"
          checked={Boolean(checked)}
          disabled={readOnly}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        This record may affect a plan — flag for review (does not auto-update plans)
      </label>
    </section>
  )
}

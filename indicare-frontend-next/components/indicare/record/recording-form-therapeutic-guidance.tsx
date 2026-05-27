'use client'

import type { RecordingFormDefinition } from '@/lib/record/recording-form-registry'
import { sccifRelevancePhrase } from '@/lib/record/recording-form-sccif-alignment'
import { THERAPEUTIC_LANGUAGE_GUIDANCE } from '@/lib/record/recording-form-therapeutic-defaults'

export function RecordingFormTherapeuticGuidance({ form }: { form: RecordingFormDefinition }) {
  const sccif = form.sccifAlignment
  const relevance = sccif ? sccifRelevancePhrase(sccif) : null

  return (
    <section
      data-testid="recording-form-therapeutic-guidance"
      className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">Therapeutic guidance</p>
      <p className="text-sm font-semibold leading-6 text-emerald-950">{form.therapeuticPrompt}</p>
      <ul className="list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-emerald-900">
        {THERAPEUTIC_LANGUAGE_GUIDANCE.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {sccif ? (
        <p className="text-xs font-semibold text-slate-600" data-testid="recording-sccif-relevance">
          {relevance} {sccif.alignment_note}
        </p>
      ) : null}
    </section>
  )
}

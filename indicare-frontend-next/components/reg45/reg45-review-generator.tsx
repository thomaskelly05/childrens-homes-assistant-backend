'use client'

import { useState } from 'react'

import { generateReg45Review, type Reg45QualityReview } from '@/lib/os-api/reg45-quality-review'

type Props = {
  packId?: string
  onGenerated: (review: Reg45QualityReview) => void
}

export function Reg45ReviewGenerator({ packId, onGenerated }: Props) {
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const result = await generateReg45Review({
      period_start: periodStart || undefined,
      period_end: periodEnd || undefined,
      from_inspection_pack_id: packId,
      save_draft: true
    })
    setLoading(false)
    if (result.ok && result.data?.id) onGenerated(result.data)
  }

  return (
    <section data-testid="reg45-review-generator" className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-bold text-slate-600">
        Period start
        <input
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs font-bold text-slate-600">
        Period end
        <input
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        data-testid="reg45-generate-review"
        disabled={loading}
        onClick={() => void handleGenerate()}
        className="rounded-2xl border border-indigo-200 bg-indigo-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
      >
        Generate draft review
      </button>
    </section>
  )
}

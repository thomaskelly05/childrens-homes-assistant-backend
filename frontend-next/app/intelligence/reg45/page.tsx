'use client'

import { Suspense } from 'react'

import { Reg45ReviewWorkspace } from '@/components/reg45/reg45-review-workspace'

export default function Reg45QualityReviewPage() {
  return (
    <main data-testid="reg45-quality-review-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
      <header className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700">
          Regulation 45 · review support
        </p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Reg 45 Quality of Care Review</h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Build a draft quality of care review using safe evidence from recording, safeguarding, workforce, SCCIF
          alignment and inspection readiness. This supports leadership review; it does not determine compliance.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading review workspace…</p>}>
        <Reg45ReviewWorkspace />
      </Suspense>
    </main>
  )
}

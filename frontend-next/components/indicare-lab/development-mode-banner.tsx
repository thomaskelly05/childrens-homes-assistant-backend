import { FlaskConical } from 'lucide-react'

import { LAB_MODE_LABELS } from '@/lib/indicare-lab/demo-data'

export function DevelopmentModeBanner() {
  return (
    <div
      className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 backdrop-blur-sm"
      role="status"
    >
      <div className="flex flex-wrap items-center gap-3">
        <FlaskConical className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
        <p className="text-sm text-slate-300">
          <span className="font-bold text-violet-200">{LAB_MODE_LABELS.development}</span>
          {' · '}
          {LAB_MODE_LABELS.internal}. Synthetic assessments only — not live usage data or expert validation.
        </p>
      </div>
    </div>
  )
}

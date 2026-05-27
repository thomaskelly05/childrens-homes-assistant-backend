import type { LifecycleState } from '@/lib/lifecycle/types'

import { LifecycleStatusBadge } from './lifecycle-status-badge'

export function LifecycleTimeline({ state }: { state: LifecycleState }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <LifecycleStatusBadge status={state.status} />
        <h3 className="mt-3 text-sm font-black text-slate-950">{state.label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{state.description}</p>
      </div>
      {state.nextSteps.map((step) => (
        <div key={step} className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">{step}</div>
      ))}
    </div>
  )
}


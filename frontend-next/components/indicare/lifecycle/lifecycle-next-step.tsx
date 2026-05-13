import type { LifecycleState } from '@/lib/lifecycle/types'

export function LifecycleNextStep({ state }: { state: LifecycleState }) {
  const next = state.blockers[0] || state.requiredActions[0] || state.nextSteps[0] || 'Review linked records and evidence.'
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Next step</p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{next}</p>
    </div>
  )
}


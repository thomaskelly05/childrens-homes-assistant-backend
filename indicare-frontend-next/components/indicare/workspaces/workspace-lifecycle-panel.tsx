import { LifecycleNextStep } from '@/components/indicare/lifecycle/lifecycle-next-step'
import { LifecycleTimeline } from '@/components/indicare/lifecycle/lifecycle-timeline'
import type { LifecycleState } from '@/lib/lifecycle/types'

export function WorkspaceLifecyclePanel({ state }: { state: LifecycleState }) {
  return (
    <div className="space-y-4">
      <LifecycleTimeline state={state} />
      <LifecycleNextStep state={state} />
    </div>
  )
}


import type { OrbRenderState } from './orb-sphere'
import { orbStateTone, orbVisualStateLabels } from '@/lib/orb/rendering/visual-system'

export function OrbStateLayer({ state }: { state: OrbRenderState }) {
  return (
    <div className="orb-luminous-copy text-center" data-orb-state={state} aria-live="polite">
      <p className="orb-kicker text-[11px] font-black uppercase tracking-[0.24em]">ORB state</p>
      <p className="orb-title-glow mt-2 text-2xl font-black tracking-[-0.05em]">{orbVisualStateLabels[state]}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300/70">{orbStateTone(state)}</p>
    </div>
  )
}


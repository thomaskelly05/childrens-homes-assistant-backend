import type { OrbRenderState } from './orb-sphere'

const labels: Record<OrbRenderState, string> = {
  idle: 'Ready when needed',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  interrupted: 'Interrupted',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  permission_denied: 'Microphone access disabled',
  private_mode: 'Private mode',
  safeguarding_cautious: 'Safeguarding cautious',
  child_present: 'Child present',
  emotional_safety: 'Slower support',
  reduced_motion: 'Reduced motion'
}

export function OrbStateLayer({ state }: { state: OrbRenderState }) {
  return (
    <div className="text-center" aria-live="polite">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/80">ORB state</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">{labels[state]}</p>
    </div>
  )
}


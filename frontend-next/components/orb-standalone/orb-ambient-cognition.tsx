'use client'

export type OrbCognitionAmbientState =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'reflecting'
  | 'analysing'
  | 'safeguarding'

type Props = {
  state: OrbCognitionAmbientState
  agentAtmosphere?: string
  reducedMotion?: boolean
}

/** Subtle full-workspace ambient layers — “the room is thinking with you”. */
export function OrbAmbientCognition({ state, agentAtmosphere, reducedMotion }: Props) {
  const motionOff = reducedMotion ? 'orb-ambient-cognition--still' : ''
  return (
    <div
      className={`orb-ambient-cognition pointer-events-none fixed inset-0 z-0 ${motionOff}`}
      data-orb-cognition-state={state}
      data-orb-agent-atmosphere={agentAtmosphere ?? 'orb-atmosphere-ask'}
      aria-hidden
    >
      <div className="orb-ambient-cognition__base" />
      <div className="orb-ambient-cognition__edge-hue" />
      <div className="orb-ambient-cognition__glow" />
      <div className="orb-ambient-cognition__breathe" />
    </div>
  )
}

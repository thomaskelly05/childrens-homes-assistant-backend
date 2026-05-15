import type { OrbRenderState } from './orb-sphere'

export function OrbAmbientFrame({ state, compact = false }: { state: OrbRenderState; compact?: boolean }) {
  return (
    <div className={compact ? 'orb-ambient-frame orb-ambient-frame--compact' : 'orb-ambient-frame'} data-orb-state={state} aria-hidden>
      <span className="orb-ambient-edge orb-ambient-edge--top" />
      <span className="orb-ambient-edge orb-ambient-edge--right" />
      <span className="orb-ambient-edge orb-ambient-edge--bottom" />
      <span className="orb-ambient-edge orb-ambient-edge--left" />
      <span className="orb-ambient-haze" />
    </div>
  )
}

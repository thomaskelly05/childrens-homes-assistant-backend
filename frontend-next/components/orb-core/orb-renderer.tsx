import { OrbCaptionLayer } from './orb-caption-layer'
import { OrbPresenceIndicator } from './orb-presence-indicator'
import { OrbSphere, type OrbRenderState } from './orb-sphere'
import { OrbStateLayer } from './orb-state-layer'

export function OrbRenderer({
  state = 'idle',
  caption,
  captionsEnabled,
  presenceLabel = 'ORB powered by IndiCare',
  compact = false
}: {
  state?: OrbRenderState
  caption?: string
  captionsEnabled?: boolean
  presenceLabel?: string
  compact?: boolean
}) {
  return (
    <div className={`relative flex flex-col items-center justify-center gap-6 rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,#070917,#111326)] p-8 text-white shadow-2xl shadow-cyan-950/30 ${compact ? 'min-h-80' : 'min-h-[560px]'}`}>
      <OrbPresenceIndicator label={presenceLabel} />
      <OrbSphere state={state} size={compact ? 'medium' : 'large'} />
      <OrbStateLayer state={state} />
      <OrbCaptionLayer enabled={captionsEnabled} text={caption} privacySensitive={state === 'child_present' || state === 'safeguarding_cautious'} />
    </div>
  )
}

